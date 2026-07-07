import { formatDate, formatTime } from '@shared/utils/format';
import type { ServiceType, Trip, TripDto, TripStatus } from './types';

// mapTrip dùng được cho cả DTO danh sách (TripDto, field id là `counterpartyUserId`)
// lẫn DTO chi tiết (TripDetailDto, field id là `driverUserId`).
type MappableTripDto = Omit<TripDto, 'counterpartyUserId'> & {
  counterpartyUserId?: string;
  driverUserId?: string;
};

// Nhóm status chi tiết từ backend về 3 bucket hiển thị của TripCard.
const CANCELLED = new Set(['cancelled_customer', 'cancelled_driver', 'no_show', 'aborted']);

function toStatusBucket(status: string): TripStatus {
  if (status === 'completed') return 'completed';
  if (CANCELLED.has(status)) return 'cancelled';
  return 'active'; // assigned / en_route / arrived / in_progress
}

function toServiceType(vehicleType: string): ServiceType {
  return vehicleType.startsWith('car') ? 'car' : 'motorbike';
}

// Chuyển DTO từ API sang shape Trip mà TripCard/RatingModal đang dùng.
// isRated không có trong API → truyền từ ngoài (đánh giá tạm giữ ở client).
export function mapTrip(dto: MappableTripDto, isRated = false): Trip {
  return {
    id: dto.tripId,
    status: toStatusBucket(dto.status),
    date: formatDate(dto.assignedAt),
    time: formatTime(dto.assignedAt),
    from: dto.pickupAddress,
    to: dto.dropoffAddress,
    price: dto.fareAmount ?? 0,
    distance: dto.distanceKm != null ? `${dto.distanceKm} km` : '—',
    duration: dto.durationMin != null ? `${dto.durationMin} phút` : '—',
    driver: {
      id: dto.counterpartyUserId ?? dto.driverUserId ?? '',
      name: dto.counterpartyName,
      phone: '',
      rating: dto.counterpartyRating ?? 0,
      vehiclePlate: '',
      vehicleModel: '',
    },
    serviceType: toServiceType(dto.vehicleType),
    isRated,
    pickupLat: dto.pickupLat,
    pickupLng: dto.pickupLng,
    dropoffLat: dto.dropoffLat,
    dropoffLng: dto.dropoffLng,
  };
}
