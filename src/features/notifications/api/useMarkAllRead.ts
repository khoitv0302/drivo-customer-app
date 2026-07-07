import { useMutation, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import type { ApiError } from '@services/api/types';
import { markAllNotificationsRead } from './notificationsService';
import { NOTIFICATIONS_LIST_KEY } from './useNotifications';
import { UNREAD_COUNT_KEY } from './useUnreadCount';
import type { NotificationFeedResponse } from '../types';

// Đánh dấu đã đọc tất cả thông báo.
export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation<void, ApiError, void>({
    mutationFn: markAllNotificationsRead,
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: NOTIFICATIONS_LIST_KEY });
      qc.setQueriesData<InfiniteData<NotificationFeedResponse>>(
        { queryKey: NOTIFICATIONS_LIST_KEY },
        (old) =>
          old && {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              items: page.items.map((n) => (n.isRead ? n : { ...n, isRead: true })),
            })),
          },
      );
      qc.setQueryData(UNREAD_COUNT_KEY, { count: 0 });
    },
    onError: () => {
      qc.invalidateQueries({ queryKey: NOTIFICATIONS_LIST_KEY });
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: UNREAD_COUNT_KEY });
    },
  });
}
