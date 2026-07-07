import { useMutation } from '@tanstack/react-query';
import type { ApiError } from '@services/api/types';
import { verifyOtp } from './authService';
import type { VerifyOtpPayload, VerifyOtpResponse } from '../types';

// Hook xác thực OTP. Dùng: const { mutate, isPending } = useVerifyOtp();
export function useVerifyOtp() {
  return useMutation<VerifyOtpResponse, ApiError, VerifyOtpPayload>({
    mutationFn: verifyOtp,
  });
}
