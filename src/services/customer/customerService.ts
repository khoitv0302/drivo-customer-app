import { apiClient } from '@services/api/client';
import type { CustomerMe } from '../../types/models';

// Lấy hồ sơ khách hàng hiện tại.
// accessToken tùy chọn: truyền tay khi token chưa vào store (vd ngay sau verify OTP);
// khi đã đăng nhập, để trống — interceptor tự đính token từ store.
export async function getMe(accessToken?: string): Promise<CustomerMe> {
  const { data } = await apiClient.get<CustomerMe>('/customers/me', {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
  });
  return data;
}

// Cập nhật hồ sơ khách hàng (họ tên...). Trả về hồ sơ mới nhất.
export async function updateCustomerProfile(
  payload: { fullName: string },
  accessToken?: string,
): Promise<CustomerMe> {
  const { data } = await apiClient.put<CustomerMe>('/customers/me', payload, {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
  });
  return data;
}
