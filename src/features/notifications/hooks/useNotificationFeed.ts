import { useMemo, useState } from 'react';
import { useNotifications } from '../api/useNotifications';
import { useUnreadCount } from '../api/useUnreadCount';
import { useMarkNotificationRead } from '../api/useMarkNotificationRead';
import { useMarkAllRead } from '../api/useMarkAllRead';
import { useDeleteNotification } from '../api/useDeleteNotification';
import { groupByDay } from '../datetime';
import type { NotificationCategory } from '../types';

export type NotificationFilter = 'all' | NotificationCategory;

// Gom toàn bộ logic dữ liệu của màn Thông báo: query + phân trang + lọc +
// gom nhóm theo ngày + đánh dấu đã đọc. Màn hình chỉ việc render.
export function useNotificationFeed() {
  const [filter, setFilter] = useState<NotificationFilter>('all');
  const category = filter === 'all' ? undefined : filter;

  const query = useNotifications(category);
  const unread = useUnreadCount();
  const markReadMut = useMarkNotificationRead();
  const markAllMut = useMarkAllRead();
  const deleteMut = useDeleteNotification();

  const items = useMemo(
    () => query.data?.pages.flatMap((page) => page.items) ?? [],
    [query.data],
  );
  const sections = useMemo(() => groupByDay(items), [items]);

  const loadMore = () => {
    if (query.hasNextPage && !query.isFetchingNextPage) query.fetchNextPage();
  };

  return {
    filter,
    setFilter,
    sections,
    unreadCount: unread.data?.count ?? 0,
    isLoading: query.isLoading,
    isError: query.isError,
    isRefetching: query.isRefetching,
    refetch: query.refetch,
    loadMore,
    isFetchingNextPage: query.isFetchingNextPage,
    markRead: (id: string) => markReadMut.mutate(id),
    markAllRead: () => markAllMut.mutate(),
    deleteNotification: (id: string) => deleteMut.mutate(id),
  };
}
