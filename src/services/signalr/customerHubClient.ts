import { AppState } from 'react-native';
import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel,
  type ILogger,
} from '@microsoft/signalr';
import { SIGNALR_CUSTOMER_HUB_URL } from '@constants/config';
import { useAuthStore } from '@store/auth.store';
import { ensureFreshAccessToken } from '@services/auth/tokenRefresh';

// Logger tuỳ chỉnh — luôn ghi qua console.log dù severity gì. Logger mặc định của SignalR tự
// map Warning/Error sang console.warn/console.error, mà React Native mặc định hiện đè màn
// hình đỏ (LogBox) mỗi khi console.error được gọi — dẫn tới cứ rớt mạng/reconnect là app bị
// che bởi lỗi đỏ dù đây là tình huống bình thường, tự phục hồi được. Vẫn giữ đủ log để xem
// trong console/terminal lúc debug, chỉ bỏ severity gây popup.
const consoleOnlyLogger: ILogger = {
  log: (logLevel, message) => {
    if (logLevel >= LogLevel.Information) {
      console.log(`[SignalR:${LogLevel[logLevel]}]`, message);
    }
  },
};

// Tên event CustomerHub — phải khớp với hằng số phía server (CustomerHub.cs).
export const CustomerHubEvent = {
  /** Booking đã được ghép với tài xế (đã có trip). */
  BookingMatched: 'booking_matched',
  /** Booking không tìm được tài xế trong thời gian dispatch. */
  BookingNoDriver: 'booking_no_driver',
  /** Chưa rõ payload — đang thử nghe để xác định lúc tài xế đón khách gửi gì. */
  Pickup: 'pickup',
  /** TripEtaMessage — khoảng cách/thời gian còn lại tới waypoint hiện tại (pickup/dropoff), ~mỗi 45s. */
  Eta: 'eta',
  /** Vị trí tài xế — relay lại từ UpdateLocation() heartbeat bên driver app. Chỉ bắn sau khi đã TrackTrip(tripId). */
  Position: 'position',
  /** Trạng thái chuyến thay đổi — vd arrived, in_progress, awaiting_payment, paid. Chỉ bắn sau khi đã TrackTrip(tripId). */
  TripStatus: 'trip_status',
} as const;

// Kết nối duy nhất tới hub /hubs/customer — tái dùng giữa các lần connect thay vì tạo mới mỗi lần.
let connection: HubConnection | null = null;

// tripId đang được TrackTrip — cần để tự TrackTrip lại sau khi reconnect. Reconnect tạo
// connectionId MỚI, mà server dùng connectionId để biết add connection nào vào group của
// trip; không gọi lại TrackTrip thì connection vẫn "Connected" nhưng server không còn gửi
// eta/position/trip_status cho nó nữa (im lặng ngừng nhận event dù connection trông vẫn sống).
let trackedTripId: string | null = null;

function buildConnection(): HubConnection {
  const conn = new HubConnectionBuilder()
    .withUrl(SIGNALR_CUSTOMER_HUB_URL, {
      // Gọi trước mỗi lần (re)connect — cùng cơ chế check-hạn-và-refresh với Axios interceptor
      // (ensureFreshAccessToken), tránh SignalR tự dùng access token đã hết hạn khi reconnect.
      accessTokenFactory: async () => (await ensureFreshAccessToken()) ?? '',
    })
    // Mặc định withAutomaticReconnect() chỉ thử lại 4 lần (0s/2s/10s/30s) rồi bỏ cuộc hẳn
    // (bắn onclose, không tự thử lại nữa) — mất kết nối tạm thời (mạng yếu, app xuống nền)
    // là chuyện thường trên mobile nên đổi thành thử lại vô thời hạn, giãn cách tăng dần tối
    // đa 30s/lần thay vì bỏ cuộc.
    .withAutomaticReconnect({
      nextRetryDelayInMilliseconds: (retryContext) =>
        Math.min(1000 * 2 ** retryContext.previousRetryCount, 30000),
    })
    .configureLogging(consoleOnlyLogger)
    .build();

  conn.onreconnecting((error) => console.log('[SignalR] reconnecting…', error));
  conn.onreconnected((connectionId) => {
    console.log('[SignalR] reconnected, connectionId=', connectionId);
    // connectionId mới → phải TrackTrip lại thì mới tiếp tục nhận được eta/position/trip_status.
    if (trackedTripId) {
      conn.invoke('TrackTrip', trackedTripId).catch((error) =>
        console.log('[SignalR] TrackTrip lại sau reconnect thất bại', error),
      );
    }
  });
  conn.onclose((error) => {
    console.log('[SignalR] closed', error);
  });

  return conn;
}

// App bị đưa xuống nền khá dễ khiến hệ điều hành tạm dừng network/timer, làm client bỏ lỡ
// ping và bị server timeout ngắt kết nối trong lúc app không hoạt động. Khi quay lại
// foreground, chủ động kiểm tra và connect lại nếu đang ở trạng thái Disconnected — không
// chờ tới lúc có màn hình mount lại mới gọi connectCustomerHub().
AppState.addEventListener('change', (state) => {
  if (state === 'active' && connection?.state === HubConnectionState.Disconnected) {
    connectCustomerHub().catch((error) => console.log('[SignalR] connect lại khi vào foreground thất bại', error));
  }
});

// Đăng xuất (chủ động ở useLogout, hoặc bị ép ở interceptor khi refresh cũng thất bại) đều đi
// qua clearToken() → token chuyển null. Lắng nghe đúng 1 chỗ này để ngắt hub thay vì rải
// disconnectCustomerHub() ở từng nơi gọi logout — tránh hub cứ tự động reconnect vô thời hạn
// với token rỗng sau khi đã đăng xuất.
useAuthStore.subscribe((state, prevState) => {
  if (prevState.token && !state.token) {
    disconnectCustomerHub().catch((error) => console.log('[SignalR] ngắt kết nối sau đăng xuất thất bại', error));
  }
});

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

  // Đảm bảo access token còn hạn trước khi connect — cùng cơ chế refresh với API
  // (ensureFreshAccessToken), tránh mất công connect với token đã hết hạn.
  const token = await ensureFreshAccessToken();
  if (!token) {
    console.log('[SignalR] không có access token hợp lệ — bỏ qua connect');
    throw new Error('NO_VALID_ACCESS_TOKEN');
  }

  console.log('[SignalR] → connecting to', SIGNALR_CUSTOMER_HUB_URL);
  try {
    await conn.start();
    console.log('[SignalR] ✓ connected, connectionId=', conn.connectionId, 'state=', conn.state);
  } catch (error) {
    console.log('[SignalR] ✗ connect failed', error);
    throw error;
  }

  return conn;
}

// Báo server đang theo dõi trip này để server tính & bắn event 'eta' — gọi ngay sau khi
// get trip (GET /trips/{id} hoặc /trips/me/current) thành công cho một chuyến đang active.
export async function trackTrip(tripId: string): Promise<void> {
  try {
    const conn = await connectCustomerHub();
    await conn.invoke('TrackTrip', tripId);
    trackedTripId = tripId;
    console.log('[SignalR] → TrackTrip', tripId);
  } catch (error) {
    console.log('[SignalR] TrackTrip thất bại', error);
  }
}

// Ngắt kết nối hub — gọi khi không còn cần realtime nữa (vd đã sang màn "tài xế đang đến").
export async function disconnectCustomerHub(): Promise<void> {
  if (!connection || connection.state === HubConnectionState.Disconnected) return;

  trackedTripId = null;
  try {
    await connection.stop();
    console.log('[SignalR] đã ngắt kết nối');
  } catch (error) {
    console.log('[SignalR] ngắt kết nối thất bại', error);
  }
}
