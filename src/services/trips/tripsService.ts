import { apiClient } from '@services/api/client';
import type { TripDetailDto, TripFeedResponse, TripStatusFilter } from '../../types/models';

export interface GetTripsParams {
  limit?: number;
  cursor?: string | null;
  status?: TripStatusFilter;
}

// GET /trips — lịch sử chuyến của tôi (as=customer), phân trang bằng cursor.
// status là token nhóm: 'active' | 'completed' | 'all'.
export async function getTrips(params: GetTripsParams = {}): Promise<TripFeedResponse> {
  const { data } = await apiClient.get<TripFeedResponse>('/trips', {
    params: {
      as: 'customer',
      limit: params.limit ?? 5,
      cursor: params.cursor ?? undefined,
      status: params.status ?? undefined,
    },
  });
  return data;
}

// GET /trips/{tripId} — chi tiết đầy đủ của 1 chuyến.
export async function getTripDetail(tripId: string): Promise<TripDetailDto> {
  const { data } = await apiClient.get<TripDetailDto>(`/trips/${tripId}`);
  return data;
}

export interface RateTripPayload {
  /** Số sao 1..5 */
  stars: number;
  /** Nhận xét (tùy chọn) */
  comment?: string;
}

// POST /trips/{tripId}/rating — khách đánh giá tài xế sau chuyến.
// Lỗi: 400 RATING_STARS_INVALID (sao ngoài 1..5), 409 RATING_ALREADY_SUBMITTED (đã đánh giá).
export async function rateTrip(tripId: string, payload: RateTripPayload): Promise<void> {
  await apiClient.post(`/trips/${tripId}/rating`, {
    stars: payload.stars,
    comment: payload.comment ?? '',
  });
}
