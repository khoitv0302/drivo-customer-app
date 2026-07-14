import { useEffect } from 'react';
import {
  connectCustomerHub,
  getCustomerHubConnection,
  CustomerHubEvent,
} from '@services/signalr/customerHubClient';

// Thử nghiệm: chưa rõ payload thật của event 'pickup' — chỉ log ra để xác định shape,
// chưa xử lý điều hướng/side-effect gì từ event này.
export function usePickupListener() {
  useEffect(() => {
    const onPickup = (data: unknown) => {
      console.log('[SignalR] pickup', data);
    };

    connectCustomerHub()
      .then((conn) => conn.on(CustomerHubEvent.Pickup, onPickup))
      .catch((error) => console.error('[SignalR] connect thất bại', error));

    return () => {
      const conn = getCustomerHubConnection();
      conn.off(CustomerHubEvent.Pickup, onPickup);
    };
  }, []);
}
