import { useInfiniteQuery } from '@tanstack/react-query';
import type { ApiError } from '@services/api/types';
import { getTrips } from '@services/trips/tripsService';
import { useAuthStore } from '@store/auth.store';
import type { TripFeedResponse, TripStatusFilter } from '../../types/models';

const PAGE_SIZE = 5; // mỗi lần tải 5 chuyến

export const tripsKey = (status: TripStatusFilter) => ['trips', status] as const;

// Lịch sử chuyến theo status, phân trang vô hạn theo nextCursor. Dùng chung ở
// trip-history (theo tab) và home (5 chuyến hoàn thành gần nhất, vuốt ngang xem thêm).
// `enabled` để lazy: chỉ gọi API khi cần.
export function useTrips(status: TripStatusFilter, enabled = true) {
  const token = useAuthStore((s) => s.token);
  return useInfiniteQuery<TripFeedResponse, ApiError>({
    queryKey: tripsKey(status),
    queryFn: ({ pageParam }) =>
      getTrips({ limit: PAGE_SIZE, cursor: pageParam as string | null, status }),
    initialPageParam: null,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: !!token && enabled,
    staleTime: 30_000,
  });
}
