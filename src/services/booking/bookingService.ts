import { apiClient } from '@services/api/client';
import type {
  BookingDetailDto,
  BookingEstimateRequest,
  BookingEstimateResponse,
  CreateBookingRequest,
  CreateBookingResponse,
} from '../../types/models';

// POST /bookings/estimate — ước tính giá cước trước khi đặt chuyến.
export async function getBookingEstimate(payload: BookingEstimateRequest): Promise<BookingEstimateResponse> {
  console.log('[Booking Estimate] request:', payload);
  const { data } = await apiClient.post<BookingEstimateResponse>('/bookings/estimate', payload);
  console.log('[Booking Estimate] response:', data);
  return data;
}

// POST /bookings — tạo yêu cầu đặt xe, trả về bookingId để theo dõi tìm tài xế.
export async function createBooking(payload: CreateBookingRequest): Promise<CreateBookingResponse> {
  console.log('[Create Booking] request:', payload);
  const { data } = await apiClient.post<CreateBookingResponse>('/bookings', payload);
  console.log('[Create Booking] response:', data);
  return data;
}

// GET /bookings/{id} — chi tiết booking khi đang tìm tài xế: searchExpiresAt (đếm ngược)
// và nearbyDrivers (vị trí tài xế lúc mới vào màn, trước khi hook realtime bắn cập nhật).
export async function getBookingDetail(bookingId: string): Promise<BookingDetailDto> {
  const { data } = await apiClient.get<BookingDetailDto>(`/bookings/${bookingId}`);
  console.log('[Booking Detail] response:', data);
  return data;
}
