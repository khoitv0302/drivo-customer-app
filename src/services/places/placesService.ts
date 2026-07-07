import { GOOGLE_MAPS_API_KEY } from '@constants/config';
import type { PlaceDetails, PlacePrediction } from './types';

const BASE_URL = 'https://places.googleapis.com/v1';

export async function fetchAutocompletePredictions(
  input: string,
  location?: { latitude: number; longitude: number } | null,
): Promise<PlacePrediction[]> {
  const body: Record<string, unknown> = {
    input,
    languageCode: 'vi',
    includedRegionCodes: ['vn'],
  };

  if (location) {
    body.locationBias = {
      circle: {
        center: { latitude: location.latitude, longitude: location.longitude },
        radius: 50000,
      },
    };
    // origin → API trả về distanceMeters cho mỗi gợi ý (khoảng cách từ vị trí hiện tại).
    body.origin = { latitude: location.latitude, longitude: location.longitude };
  }

  console.log('[Places Autocomplete] input:', input);
  const res = await fetch(`${BASE_URL}/places:autocomplete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error('[Places Autocomplete] HTTP error:', res.status, err);
    throw new Error(`Places Autocomplete HTTP ${res.status}: ${err?.error?.message ?? ''}`);
  }

  const data = await res.json();
  const suggestions = data.suggestions ?? [];
  console.log('[Places Autocomplete] suggestions:', suggestions.length);

  return suggestions
    .filter((s: any) => s.placePrediction)
    .map((s: any) => {
      const p = s.placePrediction;
      return {
        place_id: p.placeId,
        description: p.text?.text ?? '',
        structured_formatting: {
          main_text: p.structuredFormat?.mainText?.text ?? p.text?.text ?? '',
          secondary_text: p.structuredFormat?.secondaryText?.text ?? '',
        },
        distanceMeters: typeof p.distanceMeters === 'number' ? p.distanceMeters : undefined,
      } as PlacePrediction;
    });
}

export async function fetchPlaceDetails(
  placeId: string,
  mainText: string,
  fullDescription: string,
): Promise<PlaceDetails> {
  console.log('[Place Details] placeId:', placeId);
  const res = await fetch(`${BASE_URL}/places/${placeId}`, {
    headers: {
      'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
      'X-Goog-FieldMask': 'location',
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error('[Place Details] HTTP error:', res.status, err);
    throw new Error(`Place Details HTTP ${res.status}: ${err?.error?.message ?? ''}`);
  }

  const data = await res.json();
  console.log('[Place Details] location:', data.location);

  return {
    placeId,
    name: mainText,
    address: fullDescription,
    latitude: data.location?.latitude ?? 0,
    longitude: data.location?.longitude ?? 0,
  };
}

export async function reverseGeocode(
  latitude: number,
  longitude: number,
): Promise<{ name: string; address: string } | null> {
  const url =
    `https://maps.googleapis.com/maps/api/geocode/json` +
    `?latlng=${latitude},${longitude}` +
    `&key=${GOOGLE_MAPS_API_KEY}` +
    `&language=vi` +
    `&result_type=street_address|premise|point_of_interest|establishment`;

  const res = await fetch(url);
  if (!res.ok) return null;

  const data = await res.json();
  const results: Array<{
    formatted_address: string;
    address_components: Array<{ long_name: string; types: string[] }>;
    types: string[];
  }> = data.results ?? [];

  if (results.length === 0) return null;

  // Skip Plus Code results (e.g. "QHV5+F6R") — they appear when no street address exists
  const PLUS_CODE_RE = /^[23456789CFGHJMPQRVWX]{4,8}\+[23456789CFGHJMPQRVWX]{2,3}$/;
  const usable = results.find(r => {
    const firstPart = r.formatted_address.split(',')[0].trim();
    return !PLUS_CODE_RE.test(firstPart) && !r.types.includes('plus_code');
  });
  if (!usable) return null;

  const components = usable.address_components ?? [];

  const streetNumber = components.find(c => c.types.includes('street_number'))?.long_name ?? '';
  const route = components.find(c => c.types.includes('route'))?.long_name ?? '';
  const ward =
    components.find(c => c.types.includes('sublocality_level_1'))?.long_name ??
    components.find(c => c.types.includes('sublocality'))?.long_name ?? '';
  const district =
    components.find(c => c.types.includes('administrative_area_level_2'))?.long_name ?? '';

  const name = streetNumber && route
    ? `${streetNumber} ${route}`
    : route || usable.formatted_address.split(',')[0].trim();

  const parts = [ward, district].filter(Boolean);
  const address = parts.length > 0 ? `${name}, ${parts.join(', ')}` : name;

  console.log('[reverseGeocode]', name, '|', address);
  return { name, address };
}

export type NearbyPlace = {
  placeId: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  types: string[];
};

// Max radius (metres) for a POI to be considered, keyed by Google place type
const POI_RADIUS: Array<{ types: string[]; maxMeters: number }> = [
  { types: ['atm'], maxMeters: 20 },
  { types: ['restaurant', 'cafe', 'bar', 'bakery', 'convenience_store', 'store', 'food'], maxMeters: 30 },
  { types: ['gas_station', 'shopping_mall', 'supermarket', 'hospital', 'pharmacy', 'department_store'], maxMeters: 60 },
];
const DEFAULT_MAX_METERS = 40;

function metersFrom(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = (lat2 - lat1) * 111320;
  const dLng = (lng2 - lng1) * 111320 * Math.cos((lat1 * Math.PI) / 180);
  return Math.sqrt(dLat * dLat + dLng * dLng);
}

// "On top" threshold: pin within this distance = user IS at the POI, no "Gần" prefix
const ON_TOP_METERS = 15;

export function pickBestPoi(
  places: NearbyPlace[],
  pinLat: number,
  pinLng: number,
): { poi: NearbyPlace; distanceMeters: number } | null {
  let best: NearbyPlace | null = null;
  let bestDist = Infinity;

  for (const p of places) {
    const dist = metersFrom(pinLat, pinLng, p.latitude, p.longitude);
    const bucket = POI_RADIUS.find(b => b.types.some(t => p.types.includes(t)));
    const max = bucket?.maxMeters ?? DEFAULT_MAX_METERS;
    if (dist <= max && dist < bestDist) {
      best = p;
      bestDist = dist;
    }
  }
  return best ? { poi: best, distanceMeters: bestDist } : null;
}

export { ON_TOP_METERS };

export async function getNearbyPlaces(latitude: number, longitude: number): Promise<NearbyPlace[]> {
  const res = await fetch(`${BASE_URL}/places:searchNearby`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.types',
    },
    body: JSON.stringify({
      languageCode: 'vi',
      maxResultCount: 10,
      locationRestriction: {
        circle: {
          center: { latitude, longitude },
          radius: 60,
        },
      },
    }),
  });

  if (!res.ok) return [];

  const data = await res.json();
  return (data.places ?? []).map((p: any) => ({
    placeId: p.id ?? '',
    name: p.displayName?.text ?? '',
    address: p.formattedAddress ?? '',
    latitude: p.location?.latitude ?? 0,
    longitude: p.location?.longitude ?? 0,
    types: p.types ?? [],
  }));
}
