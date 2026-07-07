import { apiClient } from '@services/api/client';
import type {
  RequestOtpPayload,
  RequestOtpResponse,
  VerifyOtpPayload,
  VerifyOtpResponse,
  LoginPayload,
  LoginResponse,
  SetPasswordResponse,
  RequestPasswordResetPayload,
  RequestPasswordResetResponse,
  VerifyPasswordResetPayload,
  VerifyPasswordResetResponse,
  ConfirmPasswordResetPayload,
  ConfirmPasswordResetResponse,
} from '../types';

// Gọi API gửi OTP. Trả về body { code, message } khi thành công;
// lỗi đã được interceptor chuẩn hoá thành ApiError.
export async function requestOtp(payload: RequestOtpPayload): Promise<RequestOtpResponse> {
  const { data } = await apiClient.post<RequestOtpResponse>('/auth/otp/request', {
    email: null,
    ...payload,
  });
  return data;
}

// Gọi API xác thực OTP. Trả về session (accessToken, refreshToken, ...) khi đúng mã;
// mã sai → interceptor ném ApiError (code INVALID_OTP).
export async function verifyOtp(payload: VerifyOtpPayload): Promise<VerifyOtpResponse> {
  const { data } = await apiClient.post<VerifyOtpResponse>('/auth/otp/verify', {
    email: null,
    ...payload,
  });
  return data;
}

// Đăng nhập bằng SĐT + mật khẩu. Trả về session (accessToken, refreshToken, ...);
// sai thông tin → interceptor ném ApiError.
export async function login(payload: LoginPayload): Promise<LoginResponse> {
  const { data } = await apiClient.post<LoginResponse>('/auth/login', payload);
  return data;
}

// Đặt mật khẩu cho tài khoản. Dùng ở màn tạo hồ sơ (token chưa vào store → truyền tay).
export async function setPassword(newPassword: string, accessToken?: string): Promise<SetPasswordResponse> {
  const { data } = await apiClient.put<SetPasswordResponse>(
    '/auth/me/password',
    { newPassword },
    { headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined },
  );
  return data;
}

// --- Quên mật khẩu (3 bước) — luồng chưa đăng nhập, không cần token ---

// Bước 1: gửi mã đặt lại về SĐT. Backend luôn 200 kể cả SĐT không tồn tại (chống dò tài khoản).
export async function requestPasswordReset(
  payload: RequestPasswordResetPayload,
): Promise<RequestPasswordResetResponse> {
  const { data } = await apiClient.post<RequestPasswordResetResponse>('/auth/password/reset/request', payload);
  return data;
}

// Bước 2: kiểm tra mã có đúng không. Mã sai → interceptor ném ApiError (code INVALID_OTP).
export async function verifyPasswordResetCode(
  payload: VerifyPasswordResetPayload,
): Promise<VerifyPasswordResetResponse> {
  const { data } = await apiClient.post<VerifyPasswordResetResponse>('/auth/password/reset/verify', payload);
  return data;
}

// Bước 3: đặt mật khẩu mới bằng mã đã xác thực. Trả về session → đăng nhập luôn.
export async function confirmPasswordReset(
  payload: ConfirmPasswordResetPayload,
): Promise<ConfirmPasswordResetResponse> {
  const { data } = await apiClient.post<ConfirmPasswordResetResponse>('/auth/password/reset/confirm', payload);
  return data;
}
