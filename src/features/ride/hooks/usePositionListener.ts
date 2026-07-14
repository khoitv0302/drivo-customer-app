import { useEffect, useState } from 'react';
import {
  connectCustomerHub,
  getCustomerHubConnection,
  CustomerHubEvent,
} from '@services/signalr/customerHubClient';
import type { DriverPositionMessage } from '../types';

// Nghe event 'position' (vị trí tài xế, relay từ UpdateLocation() heartbeat) và trả về bản
// tin mới nhất khớp tripId — chỉ nhận được sau khi đã TrackTrip(tripId) (xem useTrackTrip).
export function usePositionListener(tripId?: string): DriverPositionMessage | null {
  const [position, setPosition] = useState<DriverPositionMessage | null>(null);

  useEffect(() => {
    setPosition(null);

    const onPosition = (data: DriverPositionMessage) => {
      console.log('[SignalR] position', data);
      if (!tripId || data.tripId === tripId) setPosition(data);
    };

    connectCustomerHub()
      .then((conn) => conn.on(CustomerHubEvent.Position, onPosition))
      .catch((error) => console.error('[SignalR] connect thất bại', error));

    return () => {
      const conn = getCustomerHubConnection();
      conn.off(CustomerHubEvent.Position, onPosition);
    };
  }, [tripId]);

  return position;
}
