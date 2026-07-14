import { useEffect, useState } from 'react';
import {
  connectCustomerHub,
  getCustomerHubConnection,
  CustomerHubEvent,
} from '@services/signalr/customerHubClient';
import type { TripEtaMessage } from '../types';

// Nghe event 'eta' (TripEtaMessage, ~mỗi 45s) và trả về bản tin mới nhất khớp tripId —
// chỉ nhận được sau khi đã TrackTrip(tripId) (xem useTrackTrip).
export function useTripEtaListener(tripId?: string): TripEtaMessage | null {
  const [eta, setEta] = useState<TripEtaMessage | null>(null);

  useEffect(() => {
    setEta(null);

    const onEta = (data: TripEtaMessage) => {
      console.log('[SignalR] eta', data);
      if (!tripId || data.tripId === tripId) setEta(data);
    };

    connectCustomerHub()
      .then((conn) => conn.on(CustomerHubEvent.Eta, onEta))
      .catch((error) => console.error('[SignalR] connect thất bại', error));

    return () => {
      const conn = getCustomerHubConnection();
      conn.off(CustomerHubEvent.Eta, onEta);
    };
  }, [tripId]);

  return eta;
}
