import { apiClient } from '@services/api/client';
import type { VoucherListResponse } from '../../types/models';

// GET /promotions/vouchers — danh sách voucher của khách (dùng khi đặt chuyến).
export async function getVouchers(): Promise<VoucherListResponse> {
  const { data } = await apiClient.get<VoucherListResponse>('/promotions/vouchers');
  return data;
}
