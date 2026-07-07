import { useMutation } from '@tanstack/react-query';
import type { ApiError } from '@services/api/types';
import { createBooking } from '@services/booking/bookingService';
import type { CreateBookingRequest, CreateBookingResponse } from '../../../types/models';

// Đặt tài xế: tạo booking khi bấm "Đặt tài xế" ở màn Map.
export function useCreateBooking() {
  return useMutation<CreateBookingResponse, ApiError, CreateBookingRequest>({
    mutationFn: createBooking,
  });
}
