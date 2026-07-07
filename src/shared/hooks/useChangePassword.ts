import { useMutation } from '@tanstack/react-query';
import type { ApiError } from '@services/api/types';
import { changePassword, type ChangePasswordPayload } from '@services/auth/authApi';
import { useAuthStore, type AuthSession } from '@store/auth.store';

// Đổi mật khẩu. Thành công → lưu session mới (token đã xoay) để giữ đăng nhập.
export function useChangePassword() {
  const setSession = useAuthStore((s) => s.setSession);
  return useMutation<AuthSession, ApiError, ChangePasswordPayload>({
    mutationFn: changePassword,
    onSuccess: (session) => setSession(session),
  });
}
