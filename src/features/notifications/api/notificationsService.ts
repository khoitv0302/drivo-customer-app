import { apiClient } from '@services/api/client';
import type { NotificationFeedResponse, UnreadCountResponse } from '../types';

export interface GetNotificationsParams {
  limit?: number;
  cursor?: string | null;
  category?: string;
}

// GET /notifications — danh sách thông báo của tôi, phân trang bằng cursor.
export async function getNotifications(
  params: GetNotificationsParams = {},
): Promise<NotificationFeedResponse> {
  const { data } = await apiClient.get<NotificationFeedResponse>('/notifications', {
    params: {
      limit: params.limit ?? 20,
      cursor: params.cursor ?? undefined,
      category: params.category || undefined,
    },
  });
  return data;
}

// GET /notifications/unread-count — số thông báo chưa đọc.
export async function getUnreadCount(): Promise<UnreadCountResponse> {
  const { data } = await apiClient.get<UnreadCountResponse>('/notifications/unread-count');
  return data;
}

// POST /notifications/{id}/read — đánh dấu đã đọc một thông báo.
export async function markNotificationRead(id: string): Promise<void> {
  await apiClient.post(`/notifications/${id}/read`);
}

// POST /notifications/read-all — đánh dấu đã đọc tất cả.
export async function markAllNotificationsRead(): Promise<void> {
  await apiClient.post('/notifications/read-all');
}

// DELETE /notifications/{id} — xoá một thông báo (204 No Content).
export async function deleteNotification(id: string): Promise<void> {
  await apiClient.delete(`/notifications/${id}`);
}
