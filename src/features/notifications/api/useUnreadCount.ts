import { useQuery } from '@tanstack/react-query';
import type { ApiError } from '@services/api/types';
import { useAuthStore } from '@store/auth.store';
import { getUnreadCount } from './notificationsService';
import type { UnreadCountResponse } from '../types';

export const UNREAD_COUNT_KEY = ['notifications', 'unread'] as const;

// Số thông báo chưa đọc — dùng cho badge và nút "đánh dấu tất cả".
export function useUnreadCount() {
  const token = useAuthStore((s) => s.token);
  return useQuery<UnreadCountResponse, ApiError>({
    queryKey: UNREAD_COUNT_KEY,
    queryFn: getUnreadCount,
    enabled: !!token,
    staleTime: 30_000,
  });
}
