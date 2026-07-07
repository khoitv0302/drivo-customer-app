import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { ROUTES } from '@constants/routes';
import { fetchPlaceDetails, reverseGeocode } from '@services/places/placesService';
import type { PlaceDetails } from '@services/places/types';
import { usePlacesAutocomplete } from '../api/usePlacesAutocomplete';
import useCurrentLocation from '@shared/hooks/useCurrentLocation';
import { useRecentTrips } from '@shared/hooks/useRecentTrips';
import type { RootScreenProps } from '@navigation/types';

type ActiveField = 'origin' | 'destination';

interface RecentPlace {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  /** Khoảng cách (km) từ vị trí hiện tại; null nếu chưa có GPS */
  distanceKm: number | null;
}

const SERVICE_LABELS = {
  car: 'Tài xế ô tô',
  motorbike: 'Tài xế xe máy',
} as const;

// Tên hiển thị = phần trước dấu phẩy của địa chỉ.
const placeName = (addr: string) => addr.split(',')[0].trim() || addr;

// Khoảng cách đường chim bay giữa 2 toạ độ (Haversine), đơn vị km.
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

const fmtKm = (km: number) => `${km.toFixed(1).replace('.', ',')} km`;

export default function DestinationSearchScreen({ navigation, route }: RootScreenProps<'DestinationSearch'>) {
  const { serviceType, editField, currentOrigin, currentDestination, returnToPickup } = route.params;
  const insets = useSafeAreaInsets();

  const [activeField, setActiveField] = useState<ActiveField>(editField ?? 'destination');
  const [originQuery, setOriginQuery] = useState(currentOrigin?.name ?? '');
  const [destQuery, setDestQuery] = useState(currentDestination?.name ?? '');
  const [debouncedOriginQuery, setDebouncedOriginQuery] = useState('');
  const [debouncedDestQuery, setDebouncedDestQuery] = useState('');
  const [selectedOrigin, setSelectedOrigin] = useState<PlaceDetails | null>(currentOrigin ?? null);
  const [selectedDestination, setSelectedDestination] = useState<PlaceDetails | null>(currentDestination ?? null);
  const [selectingId, setSelectingId] = useState<string | null>(null);
  const [currentLocationDetails, setCurrentLocationDetails] = useState<PlaceDetails | null>(null);
  const [kbHeight, setKbHeight] = useState(0);

  const originInputRef = useRef<TextInput>(null);
  const destInputRef = useRef<TextInput>(null);
  const { location, loading: locationLoading, permissionDenied } = useCurrentLocation();

  // "Gần đây" từ 10 chuyến gần nhất, tách theo ô đang chọn:
  // ô "điểm đi" → chỉ điểm đón cũ; ô "điểm đến" → chỉ điểm đến cũ. Bỏ trùng theo địa chỉ.
  const { data: recentTripsData, isLoading: recentLoading } = useRecentTrips(10);
  const recentPlaces = useMemo<RecentPlace[]>(() => {
    const useOrigin = activeField === 'origin';
    const out: RecentPlace[] = [];
    const seen = new Set<string>();
    for (const t of recentTripsData?.items ?? []) {
      const addr = useOrigin ? t.pickupAddress : t.dropoffAddress;
      const lat = useOrigin ? t.pickupLat : t.dropoffLat;
      const lng = useOrigin ? t.pickupLng : t.dropoffLng;
      if (!addr || lat == null || lng == null) continue;
      const key = addr.trim().toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      const dist = location ? haversineKm(location.latitude, location.longitude, lat, lng) : null;
      out.push({ id: key, name: placeName(addr), address: addr, latitude: lat, longitude: lng, distanceKm: dist });
    }
    return out;
  }, [recentTripsData, activeField, location?.latitude, location?.longitude]);

  useEffect(() => {
    if (!location || currentOrigin) return;
    reverseGeocode(location.latitude, location.longitude).then(result => {
      if (!result) return;
      setCurrentLocationDetails({
        placeId: 'current_location',
        name: result.name,
        address: result.address,
        latitude: location.latitude,
        longitude: location.longitude,
      });
    });
  }, [location?.latitude, location?.longitude]);

  // Theo dõi chiều cao bàn phím → chừa padding đáy để danh sách không bị che.
  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvt, (e) => setKbHeight(e.endCoordinates.height));
    const hideSub = Keyboard.addListener(hideEvt, () => setKbHeight(0));
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedOriginQuery(originQuery), 400);
    return () => clearTimeout(timer);
  }, [originQuery]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedDestQuery(destQuery), 400);
    return () => clearTimeout(timer);
  }, [destQuery]);

  const activeQuery = activeField === 'origin' ? debouncedOriginQuery : debouncedDestQuery;
  const { data: predictions = [], isFetching, error } = usePlacesAutocomplete({ query: activeQuery, location });

  useEffect(() => {
    if (error) console.error('[DestinationSearch] query error:', error.message);
  }, [error]);

  const isSearching = activeQuery.trim().length >= 2;

  function switchToField(field: ActiveField) {
    setActiveField(field);
    setTimeout(() => {
      if (field === 'origin') originInputRef.current?.focus();
      else destInputRef.current?.focus();
    }, 50);
  }

  // returnToPickup: came from PickupLocation to search for origin → navigate back there
  // editField set: came from Map to re-select → navigate back to Map
  // fresh DS1, no origin: first-time flow → go through PickupLocation
  // fresh DS1, explicit origin: go straight to Map
  function goToMap(params: { serviceType: typeof serviceType; origin?: PlaceDetails; destination?: PlaceDetails }) {
    if (returnToPickup && params.origin && currentDestination) {
      navigation.navigate(ROUTES.PICKUP_LOCATION, {
        serviceType,
        destination: currentDestination,
        preselectedOrigin: params.origin,
      });
    } else if (editField) {
      navigation.navigate(ROUTES.MAP, params);
    } else if (!params.origin && params.destination) {
      navigation.replace(ROUTES.PICKUP_LOCATION, {
        serviceType,
        destination: params.destination,
        initialLat: location?.latitude,
        initialLng: location?.longitude,
      });
    } else {
      navigation.replace(ROUTES.MAP, params);
    }
  }

  async function selectPlace(placeId: string, mainText: string, fullDescription: string) {
    setSelectingId(placeId);
    try {
      const details = await fetchPlaceDetails(placeId, mainText, fullDescription);
      if (activeField === 'origin') {
        setSelectedOrigin(details);
        setOriginQuery(details.name);
        const dest = selectedDestination ?? currentDestination ?? null;
        if (dest) {
          goToMap({ serviceType, origin: details, destination: dest });
        } else {
          switchToField('destination');
        }
      } else {
        goToMap({ serviceType, origin: selectedOrigin ?? currentOrigin ?? undefined, destination: details });
      }
    } catch {
      if (activeField === 'destination') {
        goToMap({ serviceType });
      }
    } finally {
      setSelectingId(null);
    }
  }

  function selectRecentPlace(place: RecentPlace) {
    const details: PlaceDetails = {
      placeId: place.id,
      name: place.name,
      address: place.address,
      latitude: place.latitude,
      longitude: place.longitude,
    };
    if (activeField === 'origin') {
      setSelectedOrigin(details);
      setOriginQuery(details.name);
      const dest = selectedDestination ?? currentDestination ?? null;
      if (dest) {
        goToMap({ serviceType, origin: details, destination: dest });
      } else {
        switchToField('destination');
      }
    } else {
      goToMap({ serviceType, origin: selectedOrigin ?? currentOrigin ?? undefined, destination: details });
    }
  }

  function swapFields() {
    const prevOrigin = selectedOrigin;
    const prevDest = selectedDestination;
    setSelectedOrigin(prevDest);
    setOriginQuery(destQuery);
    // Current location cannot be a destination — clear it so user picks a real place
    if (prevOrigin?.placeId === 'current_location') {
      setSelectedDestination(null);
      setDestQuery('');
    } else {
      setSelectedDestination(prevOrigin);
      setDestQuery(originQuery);
    }
  }

  function originPlaceholder() {
    if (permissionDenied) return 'Không có quyền vị trí';
    if (locationLoading) return 'Đang lấy vị trí...';
    if (currentLocationDetails) return currentLocationDetails.name;
    return 'Vị trí hiện tại';
  }

  const originIsActive = activeField === 'origin';
  const canSwap = selectedOrigin !== null && selectedDestination !== null;
  const destIsActive = activeField === 'destination';

  return (
    <View style={{ flex: 1, backgroundColor: 'white', paddingTop: insets.top }}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: 16,
          borderBottomWidth: 1,
          borderBottomColor: '#f3f4f6',
          gap: 12,
        }}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          {/* Origin row */}
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => switchToField('origin')}
            style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10 }}
          >
            <View style={{ width: 20, alignItems: 'center' }}>
              <Ionicons name="ellipse" size={12} color="#2563EB" />
            </View>
            <View
              style={{
                flex: 1,
                marginLeft: 10,
                borderBottomWidth: originIsActive ? 1.5 : 0,
                borderBottomColor: '#2563EB',
                paddingBottom: originIsActive ? 4 : 0,
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 11, color: '#9ca3af', marginBottom: 1 }}>Điểm đi</Text>
                {locationLoading && !selectedOrigin ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <ActivityIndicator size="small" color="#2563EB" />
                    <Text style={{ fontSize: 14, color: '#9ca3af' }}>Đang lấy vị trí...</Text>
                  </View>
                ) : (
                  <TextInput
                    ref={originInputRef}
                    value={originQuery}
                    onChangeText={setOriginQuery}
                    onFocus={() => setActiveField('origin')}
                    placeholder={originPlaceholder()}
                    placeholderTextColor="#6b7280"
                    autoFocus={activeField === 'origin'}
                    returnKeyType="search"
                    style={{ fontSize: 14, fontWeight: '600', color: '#111827', padding: 0 }}
                  />
                )}
              </View>
              {originIsActive && originQuery.length > 0 ? (
                <TouchableOpacity
                  onPress={() => { setOriginQuery(''); setSelectedOrigin(null); }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close-circle" size={16} color="#9ca3af" />
                </TouchableOpacity>
              ) : canSwap ? (
                <TouchableOpacity
                  onPress={swapFields}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  activeOpacity={0.7}
                  style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' }}
                >
                  <Ionicons name="swap-vertical" size={15} color="#6b7280" />
                </TouchableOpacity>
              ) : null}
            </View>
          </TouchableOpacity>

          {/* Connector */}
          <View style={{ flexDirection: 'row' }}>
            <View style={{ width: 20, alignItems: 'center' }}>
              <View style={{ width: 1, height: 14, backgroundColor: '#d1d5db' }} />
            </View>
          </View>

          {/* Destination row */}
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10 }}>
            <View style={{ width: 20, alignItems: 'center' }}>
              <Ionicons name="location" size={14} color="#EF4444" />
            </View>
            <View
              style={{
                flex: 1,
                marginLeft: 10,
                flexDirection: 'row',
                alignItems: 'center',
                borderBottomWidth: destIsActive ? 1.5 : 0,
                borderBottomColor: '#2563EB',
                paddingBottom: destIsActive ? 4 : 0,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 11, color: '#9ca3af', marginBottom: 1 }}>Điểm đến</Text>
                <TextInput
                  ref={destInputRef}
                  value={destQuery}
                  onChangeText={setDestQuery}
                  onFocus={() => setActiveField('destination')}
                  placeholder="Nhập điểm đến..."
                  placeholderTextColor="#9ca3af"
                  autoFocus={activeField === 'destination'}
                  returnKeyType="search"
                  style={{ fontSize: 14, fontWeight: '500', color: '#111827', padding: 0 }}
                />
              </View>
              {destIsActive && isFetching ? (
                <ActivityIndicator size="small" color="#9ca3af" />
              ) : destIsActive && destQuery.length > 0 ? (
                <TouchableOpacity
                  onPress={() => setDestQuery('')}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close-circle" size={16} color="#9ca3af" />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        </View>
      </View>

      {/* Service badge */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingVertical: 8,
          borderBottomWidth: 1,
          borderBottomColor: '#f3f4f6',
          gap: 6,
        }}
      >
        <MaterialCommunityIcons
          name={serviceType === 'car' ? 'car' : 'motorbike'}
          size={15}
          color="#2563EB"
        />
        <Text style={{ fontSize: 12, fontWeight: '600', color: '#2563EB' }}>
          {SERVICE_LABELS[serviceType]}
        </Text>
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: kbHeight + 24 }}
      >
        <View style={{ paddingHorizontal: 16, paddingTop: 18, paddingBottom: 8 }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: '#9ca3af', letterSpacing: 0.5, textTransform: 'uppercase' }}>
            {isSearching ? 'Kết quả Google Maps' : 'Gần đây'}
          </Text>
        </View>

        {/* Use current location option — only for origin field */}
        {!isSearching && activeField === 'origin' && (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              if (!location && !currentLocationDetails) return;
              const details: PlaceDetails = currentLocationDetails ?? {
                placeId: 'current_location',
                name: 'Vị trí hiện tại',
                address: 'Vị trí hiện tại',
                latitude: location!.latitude,
                longitude: location!.longitude,
              };
              setSelectedOrigin(details);
              const dest = selectedDestination ?? currentDestination ?? null;
              if (dest) {
                goToMap({ serviceType, origin: details, destination: dest });
              } else {
                switchToField('destination');
              }
            }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 16,
              paddingVertical: 14,
              borderBottomWidth: 1,
              borderBottomColor: '#f9fafb',
            }}
          >
            <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="navigate" size={20} color="#2563EB" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#2563EB' }}>Vị trí hiện tại</Text>
              <Text style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }} numberOfLines={1}>
                {currentLocationDetails ? currentLocationDetails.address : 'Sử dụng GPS của bạn'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#d1d5db" />
          </TouchableOpacity>
        )}

        {isSearching ? (
          error ? (
            <View style={{ alignItems: 'center', paddingTop: 40, paddingHorizontal: 24 }}>
              <Ionicons name="warning-outline" size={40} color="#fca5a5" />
              <Text style={{ color: '#ef4444', marginTop: 12, fontSize: 14, textAlign: 'center' }}>
                {error.message}
              </Text>
            </View>
          ) : predictions.length === 0 && !isFetching ? (
            <View style={{ alignItems: 'center', paddingTop: 40 }}>
              <Ionicons name="search-outline" size={40} color="#e5e7eb" />
              <Text style={{ color: '#9ca3af', marginTop: 12, fontSize: 14 }}>Không tìm thấy địa chỉ</Text>
            </View>
          ) : (
            predictions.map((p, idx) => {
              const isSelecting = selectingId === p.place_id;
              return (
                <TouchableOpacity
                  key={p.place_id}
                  activeOpacity={0.7}
                  disabled={selectingId !== null}
                  onPress={() => selectPlace(p.place_id, p.structured_formatting.main_text, p.description)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    borderBottomWidth: idx < predictions.length - 1 ? 1 : 0,
                    borderBottomColor: '#f9fafb',
                    opacity: selectingId !== null && !isSelecting ? 0.4 : 1,
                  }}
                >
                  <View style={{ width: 44, alignItems: 'center' }}>
                    {isSelecting
                      ? <ActivityIndicator size="small" color="#2563EB" />
                      : <Ionicons name="location-outline" size={20} color="#2563EB" />
                    }
                    {p.distanceMeters != null && (
                      <Text style={{ fontSize: 11, color: '#9ca3af', marginTop: 3 }}>{fmtKm(p.distanceMeters / 1000)}</Text>
                    )}
                  </View>
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827' }} numberOfLines={1}>
                      {p.structured_formatting.main_text}
                    </Text>
                    <Text style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }} numberOfLines={2}>
                      {p.structured_formatting.secondary_text}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#d1d5db" />
                </TouchableOpacity>
              );
            })
          )
        ) : recentLoading ? (
          <View style={{ alignItems: 'center', paddingTop: 30 }}>
            <ActivityIndicator size="small" color="#2563EB" />
          </View>
        ) : recentPlaces.length === 0 ? (
          <View style={{ alignItems: 'center', paddingTop: 36 }}>
            <Ionicons name="time-outline" size={40} color="#e5e7eb" />
            <Text style={{ color: '#9ca3af', marginTop: 12, fontSize: 14 }}>Chưa có địa điểm gần đây</Text>
          </View>
        ) : (
          recentPlaces.map((place, idx) => (
            <TouchableOpacity
              key={place.id}
              activeOpacity={0.7}
              onPress={() => selectRecentPlace(place)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 16,
                paddingVertical: 14,
                borderBottomWidth: idx < recentPlaces.length - 1 ? 1 : 0,
                borderBottomColor: '#f9fafb',
              }}
            >
              <View style={{ width: 44, alignItems: 'center' }}>
                <Ionicons name="time-outline" size={20} color="#9ca3af" />
                {place.distanceKm != null && (
                  <Text style={{ fontSize: 11, color: '#9ca3af', marginTop: 3 }}>{fmtKm(place.distanceKm)}</Text>
                )}
              </View>
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827' }} numberOfLines={1}>{place.name}</Text>
                <Text style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }} numberOfLines={2}>{place.address}</Text>
              </View>
              <Ionicons name="heart-outline" size={20} color="#d1d5db" />
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}
