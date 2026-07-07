import { useQuery } from '@tanstack/react-query';
import { getMe } from '@services/customer/customerService';
import type { ApiError } from '@services/api/types';
import { useAuthStore } from '@store/auth.store';
import type { CustomerMe } from '../../types/models';

// Query key dùng chung để invalidate sau khi cập nhật hồ sơ.
export const ME_QUERY_KEY = ['customer', 'me'] as const;

// Lấy hồ sơ khách hàng đang đăng nhập. Token tự đính qua interceptor.
// Dùng chung nhiều feature (profile, home...) nên đặt ở shared.
export function useMe() {
  const token = useAuthStore((s) => s.token);
  return useQuery<CustomerMe, ApiError>({
    queryKey: ME_QUERY_KEY,
    queryFn: () => getMe(),
    enabled: !!token, // chỉ gọi khi đã đăng nhập
    staleTime: 60_000,
  });
}
