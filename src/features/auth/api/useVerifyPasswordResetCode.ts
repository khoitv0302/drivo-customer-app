import { useMutation } from '@tanstack/react-query';
import type { ApiError } from '@services/api/types';
import { verifyPasswordResetCode } from './authService';
import type { VerifyPasswordResetPayload, VerifyPasswordResetResponse } from '../types';

// Hook xác thực mã đặt lại mật khẩu. Dùng: const { mutate, isPending } = useVerifyPasswordResetCode();
export function useVerifyPasswordResetCode() {
  return useMutation<VerifyPasswordResetResponse, ApiError, VerifyPasswordResetPayload>({
    mutationFn: verifyPasswordResetCode,
  });
}
