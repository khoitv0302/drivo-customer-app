import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { AuthSession } from '@store/auth.store';

// Phương thức nhận mã OTP
export type OtpMethod = 'sms' | 'zalo';

export type ServiceType = 'car' | 'motorbike';

// Tham số dùng chung cho các màn tiến trình đặt xe (tìm tài xế → đã tìm thấy).
export interface RideBookingParams {
  /** ID booking trả về từ POST /bookings */
  bookingId: string;
  serviceType: ServiceType;
  /** Tên điểm đón hiển thị */
  pickupName: string;
  pickupLat: number;
  pickupLng: number;
  /** Tên điểm đến hiển thị */
  dropoffName: string;
  dropoffLat: number;
  dropoffLng: number;
  /** Quãng đường (m) và thời gian (giây) ước tính */
  distanceM: number;
  durationS: number;
  /** Tổng tiền cần thanh toán (đ) */
  fare: number;
  /** Nhãn phương thức thanh toán, vd "Tiền mặt" */
  paymentLabel: string;
}

// Root stack — luồng auth + app chính
export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Otp: {
    /** Số điện thoại hiển thị trên màn OTP, vd "+84 117735319" */
    contact: string;
    /** SĐT chuẩn E.164 dùng để gọi API verify/resend, vd "+84117735319" */
    phone: string;
    /** Kênh gửi OTP — đặt từ màn Đăng ký (sms / zalo) */
    method?: OtpMethod;
  };
  CreateProfile: {
    /** Session từ verify OTP — lưu vào store sau khi tạo hồ sơ xong để vào app */
    session: AuthSession;
    /** SĐT hiển thị, vd "+84 969668834" */
    contact: string;
  };
  ForgotPassword: undefined;
  VerifyResetCode: {
    /** SĐT hiển thị trên màn nhập mã, vd "+84 912345678" */
    contact: string;
    /** SĐT chuẩn E.164 dùng để gọi API verify/confirm, vd "+84912345678" */
    phone: string;
  };
  ResetPassword: {
    /** SĐT hiển thị */
    contact: string;
    /** SĐT chuẩn E.164 dùng để gọi API confirm */
    phone: string;
    /** Mã đặt lại đã xác thực ở bước verify */
    code: string;
  };
  Main: undefined;
  Notifications: undefined;
  Map: {
    serviceType: ServiceType;
    origin?: {
      placeId: string;
      name: string;
      address: string;
      latitude: number;
      longitude: number;
    };
    destination?: {
      placeId: string;
      name: string;
      address: string;
      latitude: number;
      longitude: number;
    };
  };
  FindingDriver: RideBookingParams;
  DriverFound: RideBookingParams;
  RideComplete: {
    /** ID chuyến để gọi API đánh giá */
    tripId: string;
    serviceType: ServiceType;
    pickupName: string;
    dropoffName: string;
    fare: number;
    paymentLabel: string;
    driverName: string;
    driverRating: number;
  };
  DestinationSearch: {
    serviceType: ServiceType;
    editField?: 'origin' | 'destination';
    currentOrigin?: { placeId: string; name: string; address: string; latitude: number; longitude: number };
    currentDestination?: { placeId: string; name: string; address: string; latitude: number; longitude: number };
    returnToPickup?: boolean;
  };
  PickupLocation: {
    serviceType: ServiceType;
    destination: { placeId: string; name: string; address: string; latitude: number; longitude: number };
    preselectedOrigin?: { placeId: string; name: string; address: string; latitude: number; longitude: number };
    initialLat?: number;
    initialLng?: number;
  };
  ChangePassword: undefined;
  MembershipPackages: undefined;
  PromoCode: undefined;
  MemberTier: undefined;
  TermsPolicy: undefined;
  SupportCenter: undefined;
  CompanyInfo: undefined;
  BecomeDriver: undefined;
  Profile: undefined;
  TripDetail: { tripId: string };
};

// Bottom tabs của app chính
export type MainTabParamList = {
  Home: undefined;
  /** initialFilter: mở sẵn tab con tương ứng (vd 'completed' = Đã hoàn thành) */
  History: { initialFilter?: 'active' | 'completed' | 'all' } | undefined;
  Notifications: undefined;
  Account: undefined;
};

// Helper props cho screen trong root stack
export type RootScreenProps<T extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, T>;

// Helper props cho screen trong tab (gộp cả root để navigate ra ngoài tab)
export type MainTabScreenProps<T extends keyof MainTabParamList> = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, T>,
  NativeStackScreenProps<RootStackParamList>
>;
