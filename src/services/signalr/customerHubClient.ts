import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel,
} from '@microsoft/signalr';
import { SIGNALR_CUSTOMER_HUB_URL } from '@constants/config';
import { useAuthStore } from '@store/auth.store';

// Kết nối duy nhất tới hub /hubs/customer — tái dùng giữa các lần connect thay vì tạo mới mỗi lần.
let connection: HubConnection | null = null;

function buildConnection(): HubConnection {
  const conn = new HubConnectionBuilder()
    .withUrl(SIGNALR_CUSTOMER_HUB_URL, {
      accessTokenFactory: () => useAuthStore.getState().token ?? '',
    })
    .withAutomaticReconnect()
    .configureLogging(LogLevel.Information)
    .build();

  conn.onreconnecting((error) => console.log('[SignalR] reconnecting…', error));
  conn.onreconnected((connectionId) => console.log('[SignalR] reconnected, connectionId=', connectionId));
  conn.onclose((error) => console.log('[SignalR] closed', error));

  return conn;
}

export function getCustomerHubConnection(): HubConnection {
  if (!connection) connection = buildConnection();
  return connection;
}

// Khởi động kết nối nếu đang disconnected. Log toàn bộ state/lỗi để debug trong lúc test.
export async function connectCustomerHub(): Promise<HubConnection> {
  const conn = getCustomerHubConnection();

  if (conn.state !== HubConnectionState.Disconnected) {
    console.log('[SignalR] đã ở trạng thái', conn.state, '— bỏ qua connect');
    return conn;
  }

  console.log('[SignalR] → connecting to', SIGNALR_CUSTOMER_HUB_URL);
  try {
    await conn.start();
    console.log('[SignalR] ✓ connected, connectionId=', conn.connectionId, 'state=', conn.state);
  } catch (error) {
    console.error('[SignalR] ✗ connect failed', error);
    throw error;
  }

  return conn;
}
