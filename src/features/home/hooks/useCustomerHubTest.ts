import { useCallback, useState } from 'react';
import { HubConnectionState } from '@microsoft/signalr';
import { connectCustomerHub } from '@services/signalr/customerHubClient';

// Hook tạm để test kết nối SignalR từ nút bấm ở Home. Xoá khi có luồng realtime thật.
export function useCustomerHubTest() {
  const [state, setState] = useState<HubConnectionState>(HubConnectionState.Disconnected);

  const connect = useCallback(async () => {
    setState(HubConnectionState.Connecting);
    try {
      const conn = await connectCustomerHub();
      setState(conn.state);
    } catch {
      setState(HubConnectionState.Disconnected);
    }
  }, []);

  return { state, connect };
}
