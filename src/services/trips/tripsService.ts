import { apiClient } from '@services/api/client';
import { ApiError } from '@services/api/types';
import type { TripDetailDto, TripDto, TripFeedResponse, TripStatusFilter } from '../../types/models';

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
  console.log('[Trips] history: OK', data.items.length, 'item(s)');
  return data;
}

// GET /trips/{tripId} — chi tiết đầy đủ của 1 chuyến (as=customer).
// Phòng trường hợp response bọc trong { trip } (một số payload log lại thấy vậy) — unwrap nếu có.
export async function getTripDetail(tripId: string): Promise<TripDetailDto> {
  const { data } = await apiClient.get<TripDetailDto | { trip: TripDetailDto }>(`/trips/${tripId}`, {
    params: { as: 'customer' },
  });
  const trip = data && typeof data === 'object' && 'trip' in data ? data.trip : (data as TripDetailDto);
  console.log('[Trips] trip detail: OK', trip.tripId);
  return trip;
}

// GET /trips/me/current — chuyến đang diễn ra của khách (as=customer). null nếu không có chuyến nào.
// Gọi lúc mở app để quyết định vào thẳng màn ride đang dở hay vào Home bình thường.
export async function getCurrentTrip(): Promise<TripDetailDto | null> {
  try {
    const { data } = await apiClient.get<TripDetailDto | { trip: TripDetailDto | null }>('/trips/me/current', {
      params: { as: 'customer' },
    });
    const trip = data && typeof data === 'object' && 'trip' in data ? data.trip : (data as TripDetailDto | null);
    console.log('[Trips] current trip: OK', trip?.tripId ?? 'none');
    return trip ?? null;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
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
