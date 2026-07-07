// atob có sẵn trong Hermes (RN >= 0.74) — khai báo để TS không báo thiếu.
declare function atob(data: string): string;

export interface JwtPayload {
  phone?: string;
  sub?: string;
  exp?: number;
  [key: string]: unknown;
}

// Giải mã payload của JWT (không xác thực chữ ký) để đọc claim như phone.
export function decodeJwt(token: string | null | undefined): JwtPayload | null {
  if (!token) return null;
  try {
    const part = token.split('.')[1];
    if (!part) return null;
    let b64 = part.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    return JSON.parse(atob(b64)) as JwtPayload;
  } catch {
    return null;
  }
}
