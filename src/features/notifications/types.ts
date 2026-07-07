// Kiểu dữ liệu cho feature Notifications — khớp với API GET /notifications.

// Nhóm thông báo — dùng cho filter (query param `category`).
export type NotificationCategory = 'promotion' | 'account' | 'update';

// Loại thông báo cụ thể — quyết định icon hiển thị.
// Cho phép string tuỳ ý để backend thêm type mới mà không vỡ kiểu (có fallback icon).
export type NotificationType =
  | 'promotion'
  | 'welcome'
  | 'payment_success'
  | 'trip_completed'
  | 'trip_cancelled'
  | 'email_changed'
  | 'phone_changed'
  | 'rating_prompt'
  | (string & {});

// Một thông báo trả về từ API.
export interface Notification {
  id: string;
  category: NotificationCategory | string;
  type: NotificationType;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string; // ISO 8601 có offset, vd "2026-07-04T17:22:30.41+00:00"
}

// GET /notifications
export interface NotificationFeedResponse {
  items: Notification[];
  nextCursor: string | null;
}

// GET /notifications/unread-count
export interface UnreadCountResponse {
  count: number;
}

// Nhóm hiển thị theo mốc thời gian (Hôm nay / Hôm qua / Trước đó) cho SectionList.
export interface NotificationSection {
  title: string;
  data: Notification[];
}
