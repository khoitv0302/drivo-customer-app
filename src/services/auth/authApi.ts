import { apiClient } from '@services/api/client';
import type { AuthSession } from '@store/auth.store';

// Lời gọi auth cấp phiên (session), tách khỏi feature auth để mọi nơi (vd màn Account
// thuộc feature profile) đăng xuất được mà không phải import chéo feature.

// POST /auth/logout/all — thu hồi TẤT CẢ phiên của người dùng ở server (mọi thiết bị).
// Không cần body; interceptor tự đính Bearer token.
export async function logoutAll(): Promise<void> {
  await apiClient.post('/auth/logout/all');
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

// POST /auth/me/password/change — đổi mật khẩu. Đổi xong backend xoay token và trả về
// session mới → phải lưu lại (setSession) nếu không access token cũ sẽ bị 401.
export async function changePassword(payload: ChangePasswordPayload): Promise<AuthSession> {
  const { data } = await apiClient.post<AuthSession>('/auth/me/password/change', payload);
  return data;
}
