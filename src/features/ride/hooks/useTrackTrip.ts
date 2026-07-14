import { useEffect } from 'react';
import { trackTrip } from '@services/signalr/customerHubClient';

// Gọi ngay sau khi get trip (useTripDetail) thành công cho 1 chuyến đang active, để
// server bắt đầu tính & bắn event 'eta' cho đúng tripId này.
export function useTrackTrip(tripId: string | undefined) {
  useEffect(() => {
    if (!tripId) return;
    trackTrip(tripId);
  }, [tripId]);
}
