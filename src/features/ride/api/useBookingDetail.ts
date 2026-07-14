import { useQuery } from '@tanstack/react-query';
import type { ApiError } from '@services/api/types';
import { getBookingDetail } from '@services/booking/bookingService';
import { useAuthStore } from '@store/auth.store';
import type { BookingDetailDto } from '../../../types/models';

export const bookingDetailKey = (bookingId: string) => ['booking', bookingId] as const;

// Chi tiết booking đang tìm tài xế (GET /bookings/{id}). Chỉ gọi khi đã đăng nhập và có bookingId.
// Poll lại mỗi 5s để cập nhật searchExpiresAt/trạng thái trong lúc đang tìm tài xế — query tự
// dừng poll khi màn FindingDriver unmount (đã ghép tài xế → điều hướng đi).
export function useBookingDetail(bookingId: string) {
  const token = useAuthStore((s) => s.token);
  return useQuery<BookingDetailDto, ApiError>({
    queryKey: bookingDetailKey(bookingId),
    queryFn: () => getBookingDetail(bookingId),
    enabled: !!token && !!bookingId,
    refetchInterval: 5_000,
  });
}
