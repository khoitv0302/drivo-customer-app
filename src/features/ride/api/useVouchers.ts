import { useQuery } from '@tanstack/react-query';
import type { ApiError } from '@services/api/types';
import { useAuthStore } from '@store/auth.store';
import { getVouchers } from '@services/promotions/promotionsService';
import type { VoucherListResponse } from '../../../types/models';

export const VOUCHERS_KEY = ['promotions', 'vouchers'] as const;

// Voucher khả dụng khi đặt chuyến.
export function useVouchers() {
  const token = useAuthStore((s) => s.token);
  return useQuery<VoucherListResponse, ApiError>({
    queryKey: VOUCHERS_KEY,
    queryFn: getVouchers,
    enabled: !!token,
    staleTime: 60_000,
  });
}
