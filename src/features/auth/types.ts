import type { OtpMethod } from '@navigation/types';
import type { AuthSession } from '@store/auth.store';

// Kênh gửi OTP mà backend chấp nhận (khớp field "channel" trong API).
export type OtpChannel = OtpMethod; // 'sms' | 'zalo'

// Các endpoint đăng nhập (verify OTP, login mật khẩu, refresh) trả về CÙNG một shape phiên.
// Dùng chung AuthSession làm kiểu chuẩn để khỏi khai báo trùng.
export type AuthSessionResponse = AuthSession;

// POST /auth/otp/request
export interface RequestOtpPayload {
  /** SĐT chuẩn E.164, vd "+84117735319" */
  phone: string;
  /** Chỉ dùng khi gửi OTP qua email; mặc định null */
  email?: string | null;
  channel: OtpChannel;
}

export interface RequestOtpResponse {
  /** vd "OTP_SENT" */
  code: string;
  /** vd "OTP sent." */
  message: string;
}

// POST /auth/otp/verify
export interface VerifyOtpPayload {
  /** SĐT chuẩn E.164, vd "+84117735319" */
  phone: string;
  email?: string | null;
  /** Mã OTP người dùng nhập */
  code: string;
}

export type VerifyOtpResponse = AuthSessionResponse;

// POST /auth/login — đăng nhập bằng SĐT + mật khẩu
export interface LoginPayload {
  /** SĐT chuẩn E.164, vd "+84912345678" */
  phone: string;
  password: string;
}

export type LoginResponse = AuthSessionResponse;

// PUT /auth/me/password
export interface SetPasswordResponse {
  /** vd "PASSWORD_SET" */
  code: string;
  message: string;
}

// POST /auth/password/reset/request — gửi mã đặt lại mật khẩu về SĐT
export interface RequestPasswordResetPayload {
  /** SĐT chuẩn E.164, vd "+84912345678" */
  phone: string;
}

export interface RequestPasswordResetResponse {
  /** vd "PASSWORD_RESET_SENT" */
  code: string;
  message: string;
}

// POST /auth/password/reset/verify — kiểm tra mã đặt lại có đúng không
export interface VerifyPasswordResetPayload {
  /** SĐT chuẩn E.164, vd "+84912345678" */
  phone: string;
  /** Mã đặt lại người dùng nhập */
  code: string;
}

export interface VerifyPasswordResetResponse {
  /** vd "PASSWORD_RESET_CODE_VALID" */
  code: string;
  message: string;
}

// POST /auth/password/reset/confirm — đặt mật khẩu mới, trả về session để vào app luôn
export interface ConfirmPasswordResetPayload {
  /** SĐT chuẩn E.164, vd "+84912345678" */
  phone: string;
  /** Mã đặt lại đã xác thực ở bước verify */
  code: string;
  newPassword: string;
}

export type ConfirmPasswordResetResponse = AuthSessionResponse;
