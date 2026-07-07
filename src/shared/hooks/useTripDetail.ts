import { useQuery } from '@tanstack/react-query';
import type { ApiError } from '@services/api/types';
import { getTripDetail } from '@services/trips/tripsService';
import { useAuthStore } from '@store/auth.store';
import type { TripDetailDto } from '../../types/models';

export const tripDetailKey = (tripId: string) => ['trip', tripId] as const;

// Chi tiết 1 chuyến (GET /trips/{id}). Chỉ gọi khi đã đăng nhập và có tripId.
export function useTripDetail(tripId: string) {
  const token = useAuthStore((s) => s.token);
  return useQuery<TripDetailDto, ApiError>({
    queryKey: tripDetailKey(tripId),
    queryFn: () => getTripDetail(tripId),
    enabled: !!token && !!tripId,
    staleTime: 30_000,
  });
}
