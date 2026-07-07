import { useMutation } from '@tanstack/react-query';
import type { ApiError } from '@services/api/types';
import { requestOtp } from './authService';
import type { RequestOtpPayload, RequestOtpResponse } from '../types';

// Hook gửi OTP. Dùng: const { mutate, isPending } = useRequestOtp();
export function useRequestOtp() {
  return useMutation<RequestOtpResponse, ApiError, RequestOtpPayload>({
    mutationFn: requestOtp,
  });
}
