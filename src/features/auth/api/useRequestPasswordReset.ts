import { useMutation } from '@tanstack/react-query';
import type { ApiError } from '@services/api/types';
import { requestPasswordReset } from './authService';
import type { RequestPasswordResetPayload, RequestPasswordResetResponse } from '../types';

// Hook gửi mã đặt lại mật khẩu. Dùng: const { mutate, isPending } = useRequestPasswordReset();
export function useRequestPasswordReset() {
  return useMutation<RequestPasswordResetResponse, ApiError, RequestPasswordResetPayload>({
    mutationFn: requestPasswordReset,
  });
}
