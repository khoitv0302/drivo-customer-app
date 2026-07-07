import { apiClient } from '@services/api/client';
import type {
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
