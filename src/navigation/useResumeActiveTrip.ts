import { useEffect, useState } from 'react';
import { getCurrentTrip } from '@services/trips/tripsService';
import { trackTrip } from '@services/signalr/customerHubClient';
import { ROUTES } from '@constants/routes';
import type { TripDetailDto } from '../types/models';
import type { RideBookingParams, ServiceType } from './types';

// Trạng thái coi là "đang dở" — trước khi bắt đầu di chuyển tới điểm đến (chưa startedAt)
// thì cho vào màn DriverFound (đang đón), từ lúc in_progress thì vào OnTrip (đang đi).
const PICKUP_STATUSES = new Set(['assigned', 'en_route', 'arrived']);

const PAYMENT_LABEL: Record<string, string> = {
  cash: 'Tiền mặt',
  vietqr: 'VietQR',
  momo: 'MoMo',
  zalopay: 'ZaloPay',
  visa: 'Thẻ Visa',
};

function toServiceType(vehicleType: string): ServiceType {
  return vehicleType.startsWith('car') ? 'car' : 'motorbike';
}

function toParams(trip: TripDetailDto): Omit<RideBookingParams, 'tripId'> & { tripId: string } {
  return {
    bookingId: trip.bookingId,
    tripId: trip.tripId,
    serviceType: toServiceType(trip.vehicleType),
    pickupName: trip.pickupAddress,
    pickupLat: trip.pickupLat,
    pickupLng: trip.pickupLng,
    dropoffName: trip.dropoffAddress,
    dropoffLat: trip.dropoffLat,
    dropoffLng: trip.dropoffLng,
    distanceM: trip.distanceKm != null ? trip.distanceKm * 1000 : 0,
    durationS: trip.durationMin != null ? trip.durationMin * 60 : 0,
    fare: trip.netFareAmount ?? trip.fareAmount ?? trip.quotedFareAmount ?? 0,
    paymentLabel: trip.paymentMethod ? PAYMENT_LABEL[trip.paymentMethod] ?? trip.paymentMethod : '—',
  };
}

export type ResumeTarget = {
  routeName: typeof ROUTES.DRIVER_FOUND | typeof ROUTES.ON_TRIP;
  params: Omit<RideBookingParams, 'tripId'> & { tripId: string };
} | null;

// Gọi GET /trips/me/current lúc mở app (đã đăng nhập) để biết có chuyến đang dở không, từ
// đó quyết định vào thẳng màn ride tương ứng thay vì luôn về Home. 401 đã được interceptor
// tự thử refresh; nếu refresh cũng fail thì auth.store tự clear token → RootNavigator tự
// chuyển sang màn Login, hook này không cần xử lý riêng.
export function useResumeActiveTrip(token: string | null) {
  const [isChecking, setIsChecking] = useState(!!token);
  const [resume, setResume] = useState<ResumeTarget>(null);

  useEffect(() => {
    if (!token) {
      setIsChecking(false);
      setResume(null);
      return;
    }

    let alive = true;
    setIsChecking(true);

    getCurrentTrip()
      .then((trip) => {
        if (!alive) return;
        if (!trip) {
          setResume(null);
        } else if (PICKUP_STATUSES.has(trip.status)) {
          setResume({ routeName: ROUTES.DRIVER_FOUND, params: toParams(trip) });
          trackTrip(trip.tripId);
        } else if (trip.status === 'in_progress') {
          setResume({ routeName: ROUTES.ON_TRIP, params: toParams(trip) });
          trackTrip(trip.tripId);
        } else {
          setResume(null);
        }
      })
      .catch((error) => {
        // Lỗi không phải 401 (network/5xx...) → không chặn người dùng vào app, chỉ log lại.
        console.error('[Trips] resume chuyến đang dở thất bại', error);
        if (alive) setResume(null);
      })
      .finally(() => {
        if (alive) setIsChecking(false);
      });

    return () => {
      alive = false;
    };
  }, [token]);

  return { isChecking, resume };
}
