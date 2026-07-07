import { useMutation, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import type { ApiError } from '@services/api/types';
import { deleteNotification } from './notificationsService';
import { NOTIFICATIONS_LIST_KEY } from './useNotifications';
import { UNREAD_COUNT_KEY } from './useUnreadCount';
import type { NotificationFeedResponse } from '../types';

// Xoá một thông báo — gỡ khỏi mọi cache list ngay (lạc quan), đồng bộ lại khi settle.
export function useDeleteNotification() {
  const qc = useQueryClient();
  return useMutation<void, ApiError, string>({
    mutationFn: deleteNotification,
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: NOTIFICATIONS_LIST_KEY });
      qc.setQueriesData<InfiniteData<NotificationFeedResponse>>(
        { queryKey: NOTIFICATIONS_LIST_KEY },
        (old) =>
          old && {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              items: page.items.filter((n) => n.id !== id),
            })),
          },
      );
    },
    // Lỗi → kéo lại list đúng từ server (item xoá hụt sẽ hiện lại).
    onError: () => {
      qc.invalidateQueries({ queryKey: NOTIFICATIONS_LIST_KEY });
    },
    // Cập nhật badge chưa đọc (nếu thông báo bị xoá đang chưa đọc).
    onSettled: () => {
      qc.invalidateQueries({ queryKey: UNREAD_COUNT_KEY });
    },
  });
}
