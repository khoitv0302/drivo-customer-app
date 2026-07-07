import { useQuery } from '@tanstack/react-query';
import { fetchAutocompletePredictions } from '@services/places/placesService';
import type { PlacePrediction } from '@services/places/types';

interface UseAutoCompleteOptions {
  query: string;
  location?: { latitude: number; longitude: number } | null;
}

export function usePlacesAutocomplete({ query, location }: UseAutoCompleteOptions) {
  const trimmed = query.trim();

  return useQuery<PlacePrediction[], Error>({
    queryKey: ['places', 'autocomplete', trimmed, location?.latitude, location?.longitude],
    queryFn: () => fetchAutocompletePredictions(trimmed, location),
    enabled: trimmed.length >= 2,
    staleTime: 30_000,
    gcTime: 60_000,
    retry: 1,
  });
}
