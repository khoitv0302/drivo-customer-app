import type { Notification, NotificationSection } from './types';

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isYesterday(date: Date, now: Date): boolean {
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  return isSameDay(date, yesterday);
}

// Định dạng thời gian tương đối kiểu VN cho thông báo:
// < 1 phút -> "Vừa xong"; < 1 giờ -> "5 phút trước"; cùng ngày -> "2 giờ trước";
// hôm qua -> "Hôm qua, 21:30"; cũ hơn -> "13/06/2026".
export function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMin = Math.floor((now.getTime() - date.getTime()) / 60_000);

  if (diffMin < 1) return 'Vừa xong';
  if (diffMin < 60) return `${diffMin} phút trước`;

  const hhmm = `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  if (isSameDay(date, now)) return `${Math.floor(diffMin / 60)} giờ trước`;
  if (isYesterday(date, now)) return `Hôm qua, ${hhmm}`;

  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
}

// Gom danh sách thông báo (đã sắp giảm dần theo thời gian) thành các mốc hiển thị.
export function groupByDay(items: Notification[]): NotificationSection[] {
  const now = new Date();
  const today: Notification[] = [];
  const yesterday: Notification[] = [];
  const older: Notification[] = [];

  for (const n of items) {
    const d = new Date(n.createdAt);
    if (isSameDay(d, now)) today.push(n);
    else if (isYesterday(d, now)) yesterday.push(n);
    else older.push(n);
  }

  const sections: NotificationSection[] = [];
  if (today.length) sections.push({ title: 'Hôm nay', data: today });
  if (yesterday.length) sections.push({ title: 'Hôm qua', data: yesterday });
  if (older.length) sections.push({ title: 'Trước đó', data: older });
  return sections;
}
