import { useInfiniteQuery } from '@tanstack/react-query';
import type { ApiError } from '@services/api/types';
import { useAuthStore } from '@store/auth.store';
import { getNotifications } from './notificationsService';
import type { NotificationFeedResponse } from '../types';

const PAGE_SIZE = 5; // lazy load 5 mỗi trang, giống lịch sử

// Prefix dùng để invalidate mọi cache list (bất kể category).
export const NOTIFICATIONS_LIST_KEY = ['notifications', 'list'] as const;

export const notificationsListKey = (category?: string) =>
  [...NOTIFICATIONS_LIST_KEY, category ?? 'all'] as const;

// Danh sách thông báo, phân trang vô hạn theo nextCursor.
// Truyền category để lọc phía server (giữ phân trang chính xác).
export function useNotifications(category?: string) {
  const token = useAuthStore((s) => s.token);
  return useInfiniteQuery<NotificationFeedResponse, ApiError>({
    queryKey: notificationsListKey(category),
    queryFn: ({ pageParam }) =>
      getNotifications({
        limit: PAGE_SIZE,
        cursor: pageParam as string | null,
        category,
      }),
    initialPageParam: null,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: !!token, // chỉ gọi khi đã đăng nhập
    staleTime: 30_000,
  });
}
