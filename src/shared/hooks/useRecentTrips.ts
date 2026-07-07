import { useQuery } from '@tanstack/react-query';
import type { ApiError } from '@services/api/types';
import { getTrips } from '@services/trips/tripsService';
import { useAuthStore } from '@store/auth.store';
import type { TripFeedResponse } from '../../types/models';

// Lấy N chuyến gần nhất (mọi trạng thái) — dùng để gợi ý điểm đi/đến "Gần đây".
export function useRecentTrips(limit = 10) {
  const token = useAuthStore((s) => s.token);
  return useQuery<TripFeedResponse, ApiError>({
    queryKey: ['recentTrips', limit],
    queryFn: () => getTrips({ limit, status: 'all' }),
    enabled: !!token,
    staleTime: 60_000,
  });
}
