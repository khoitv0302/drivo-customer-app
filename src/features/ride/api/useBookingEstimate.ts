import { useQuery } from '@tanstack/react-query';
import type { ApiError } from '@services/api/types';
import { getBookingEstimate } from '@services/booking/bookingService';
import type { BookingEstimateResponse } from '../../../types/models';
import type { ServiceType } from '@navigation/types';
import { VEHICLE_TYPE_BY_SERVICE } from '../types';

interface UseBookingEstimateParams {
  serviceType: ServiceType;
  pickupLat?: number | null;
  pickupLng?: number | null;
  dropoffLat?: number | null;
  dropoffLng?: number | null;
  /** Mã ưu đãi muốn áp thử (mặc định rỗng) */
  codes?: string[];
}

// Gọi /bookings/estimate ngay khi đã có đủ điểm đón + điểm đến.
export function useBookingEstimate({
  serviceType,
  pickupLat,
  pickupLng,
  dropoffLat,
  dropoffLng,
  codes = [],
}: UseBookingEstimateParams) {
  const hasCoords =
    pickupLat != null && pickupLng != null && dropoffLat != null && dropoffLng != null;

  return useQuery<BookingEstimateResponse, ApiError>({
    queryKey: ['bookings', 'estimate', serviceType, pickupLat, pickupLng, dropoffLat, dropoffLng, codes],
    queryFn: () =>
      getBookingEstimate({
        vehicleType: VEHICLE_TYPE_BY_SERVICE[serviceType],
        pickupLat: pickupLat as number,
        pickupLng: pickupLng as number,
        dropoffLat: dropoffLat as number,
        dropoffLng: dropoffLng as number,
        codes,
        type: 'p2p',
      }),
    enabled: hasCoords,
    staleTime: 30_000,
    retry: 1,
  });
}
