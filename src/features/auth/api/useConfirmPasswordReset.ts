import { useMutation } from '@tanstack/react-query';
import type { ApiError } from '@services/api/types';
import { confirmPasswordReset } from './authService';
import type { ConfirmPasswordResetPayload, ConfirmPasswordResetResponse } from '../types';

// Hook đặt mật khẩu mới (trả về session). Dùng: const { mutate, isPending } = useConfirmPasswordReset();
export function useConfirmPasswordReset() {
  return useMutation<ConfirmPasswordResetResponse, ApiError, ConfirmPasswordResetPayload>({
    mutationFn: confirmPasswordReset,
  });
}
