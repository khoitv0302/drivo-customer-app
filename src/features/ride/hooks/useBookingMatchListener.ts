import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  connectCustomerHub,
  getCustomerHubConnection,
  CustomerHubEvent,
} from '@services/signalr/customerHubClient';
import { getTripDetail } from '@services/trips/tripsService';
import { tripDetailKey } from '@shared/hooks/useTripDetail';
import type { RideBookingParams, RootScreenProps } from '../../../navigation/types';

interface BookingMatchedPayload {
  bookingId: string;
  tripId: string;
}

// Sau khi tạo booking thành công (màn FindingDriver): connect CustomerHub và lắng nghe
// kết quả ghép tài xế. booking_matched được bắn SAU khi trip đã commit ở server, nên
// tripId nhận được ở đây dùng gọi GET /trips/{tripId} luôn không lo 404 — việc đó để
// màn DriverFound tự fetch qua useTripDetail(tripId).
// KHÔNG disconnect hub ở đây — màn DriverFound/OnTrip tiếp theo vẫn cần connection này để
// nghe 'pickup'/'eta'. Disconnect sớm ở đây từng gây race: DriverFound mount gần như cùng
// lúc connection.stop() chạy, connectCustomerHub() thấy state vẫn "Connected" nên bỏ qua
// start() lại, rồi connection chết ngay sau đó → màn sau không nhận được event nào.
export function useBookingMatchListener(
  navigation: RootScreenProps<'FindingDriver'>['navigation'],
  params: RideBookingParams,
) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const onBookingMatched = (data: BookingMatchedPayload) => {
      console.log('[SignalR] booking_matched', data);
      // Fetch + log chi tiết trip NGAY khi ghép tài xế (getTripDetail tự log '[Trips] trip
      // detail'). Prefetch vào cache với cùng staleTime của useTripDetail → DriverFound dùng
      // lại, không gọi GET /trips/{id} thêm lần nữa.
      queryClient
        .prefetchQuery({
          queryKey: tripDetailKey(data.tripId),
          queryFn: () => getTripDetail(data.tripId),
          staleTime: 30_000,
        })
        .catch((error) => console.error('[Trips] fetch trip detail sau booking_matched thất bại', error));
      navigation.replace('DriverFound', { ...params, tripId: data.tripId });
    };
    const onBookingNoDriver = (data: unknown) => {
      console.log('[SignalR] booking_no_driver', data);
    };

    connectCustomerHub()
      .then((conn) => {
        conn.on(CustomerHubEvent.BookingMatched, onBookingMatched);
        conn.on(CustomerHubEvent.BookingNoDriver, onBookingNoDriver);
      })
      .catch((error) => console.error('[SignalR] connect thất bại', error));

    return () => {
      const conn = getCustomerHubConnection();
      conn.off(CustomerHubEvent.BookingMatched, onBookingMatched);
      conn.off(CustomerHubEvent.BookingNoDriver, onBookingNoDriver);
    };
  }, [navigation, params, queryClient]);
}
