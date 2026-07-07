import { useMutation, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import type { ApiError } from '@services/api/types';
import { markNotificationRead } from './notificationsService';
import { NOTIFICATIONS_LIST_KEY } from './useNotifications';
import { UNREAD_COUNT_KEY } from './useUnreadCount';
import type { NotificationFeedResponse } from '../types';

// Đánh dấu đã đọc một thông báo — cập nhật lạc quan mọi cache list rồi đồng bộ lại.
export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation<void, ApiError, string>({
    mutationFn: markNotificationRead,
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: NOTIFICATIONS_LIST_KEY });
      qc.setQueriesData<InfiniteData<NotificationFeedResponse>>(
        { queryKey: NOTIFICATIONS_LIST_KEY },
        (old) =>
          old && {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              items: page.items.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
            })),
          },
      );
    },
    // Lỗi → kéo lại dữ liệu đúng từ server; thành công → cập nhật badge chưa đọc.
    onError: () => {
      qc.invalidateQueries({ queryKey: NOTIFICATIONS_LIST_KEY });
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: UNREAD_COUNT_KEY });
    },
  });
}
