import { useEffect, useState } from 'react';
import {
  connectCustomerHub,
  getCustomerHubConnection,
  CustomerHubEvent,
} from '@services/signalr/customerHubClient';
import type { TripStatusMessage } from '../types';

// Nghe event 'trip_status' và trả về bản tin mới nhất khớp tripId — chỉ nhận được sau khi đã
// TrackTrip(tripId) (xem useTrackTrip). Payload chưa xác nhận 100% từ server, vẫn log ra để
// đối chiếu — nếu shape thực tế khác `TripStatusMessage`, sửa lại type trong ride/types.ts.
export function useTripStatusListener(tripId?: string): TripStatusMessage | null {
  const [tripStatus, setTripStatus] = useState<TripStatusMessage | null>(null);

  useEffect(() => {
    setTripStatus(null);

    const onTripStatus = (data: TripStatusMessage) => {
      console.log('[SignalR] trip_status', data);
      if (!tripId || data.tripId === tripId) setTripStatus(data);
    };

    connectCustomerHub()
      .then((conn) => conn.on(CustomerHubEvent.TripStatus, onTripStatus))
      .catch((error) => console.error('[SignalR] connect thất bại', error));

    return () => {
      const conn = getCustomerHubConnection();
      conn.off(CustomerHubEvent.TripStatus, onTripStatus);
    };
  }, [tripId]);

  return tripStatus;
}
