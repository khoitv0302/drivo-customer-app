// Domain models dùng chung nhiều feature.

export type Gender = 'unspecified' | 'male' | 'female' | 'other';

// ── Trips (GET /trips) — dùng ở cả trip-history và home ─────────────────────
// Status chính xác từ backend.
export type ApiTripStatus =
  | 'assigned'
  | 'en_route'
  | 'arrived'
  | 'in_progress'
  | 'completed'
  | 'cancelled_customer'
  | 'cancelled_driver'
  | 'no_show'
  | 'aborted';

// Token lọc gửi lên API. Nhóm: active / cancelled / all, hoặc 1 token chính xác.
export type TripStatusFilter = 'active' | 'completed' | 'all';

export interface TripDto {
  tripId: string;
  bookingId: string;
  vehicleType: string; // vd "car_auto"
  status: ApiTripStatus | string;
  assignedAt: string; // ISO 8601
  completedAt: string | null;
  distanceKm: number | null;
  durationMin: number | null;
  fareAmount: number | null;
  paymentMethod: string | null;
  counterpartyUserId: string;
  pickupLat: number | null;
  pickupLng: number | null;
  dropoffLat: number | null;
  dropoffLng: number | null;
  /** Số tiền được giảm (voucher/khuyến mãi) */
  discountAmount: number | null;
  /** Cước thực trả sau giảm giá = fareAmount - discountAmount */
  netFareAmount: number | null;
  pickupAddress: string;
  dropoffAddress: string;
  counterpartyName: string;
  counterpartyRating: number | null;
  counterpartyAvatarUrl: string | null;
  canRate: boolean;
}

export interface TripFeedResponse {
  items: TripDto[];
  nextCursor: string | null;
  totalCount: number;
}

// ETA kèm sẵn trong trip detail — chốt tại thời điểm gọi API, dùng hiển thị NGAY trước khi có
// tin 'eta' realtime đầu tiên từ CustomerHub (tránh phải chờ ~45s). Lưu ý đơn vị khác với
// TripEtaMessage bên SignalR: etaSeconds/distanceMeters (giây/mét), không phải phút/km.
// phase: 'pickup' = đang tới đón | 'dropoff' = đang chở khách tới điểm đến.
export interface LiveEta {
  phase: 'pickup' | 'dropoff' | string;
  etaSeconds: number;
  distanceMeters: number;
  isApproximate: boolean;
  ts: number;
}

// Thông tin đối phương (tài xế khi xem as=customer) trả về lồng trong TripDetailDto.
export interface TripCounterparty {
  fullName: string;
  /** Chỉ có giá trị trong khoảng thời gian chuyến đang diễn ra ("in-window") */
  phone: string | null;
  rating: number | null;
  avatarUrl: string | null;
}

// GET /trips/{tripId} — chi tiết 1 chuyến. Response thực tế bọc trong { trip: TripDetailDto }.
export interface TripDetailDto {
  tripId: string;
  bookingId: string;
  customerId: string;
  driverUserId: string;
  /** Mã chuyến hiển thị cho người dùng, vd "DRV-00000001" */
  tripCode: string;
  vehicleType: string;
  /** vd "p2p" | "scheduled" | "instant" */
  bookingType: string;
  status: ApiTripStatus | string;
  assignedAt: string;
  /** Mốc tài xế đến điểm đón */
  arrivedAt: string | null;
  /** Mốc bắt đầu di chuyển */
  startedAt: string | null;
  /** Mốc tài xế đến điểm trả khách */
  destinationArrivedAt: string | null;
  completedAt: string | null;
  distanceKm: number | null;
  durationMin: number | null;
  /** Số phút chờ tại điểm đón */
  waitingMin: number | null;
  pickupLat: number;
  pickupLng: number;
  dropoffLat: number;
  dropoffLng: number;
  fareAmount: number | null;
  discountAmount: number | null;
  netFareAmount: number | null;
  /** Cước tạm tính lúc đặt — dùng làm fallback khi chuyến chưa có fareAmount/netFareAmount */
  quotedFareAmount: number | null;
  paymentMethod: string | null;
  cancelReason: string | null;
  pickupAddress: string;
  dropoffAddress: string;
  counterparty: TripCounterparty;
  note: string | null;
  canRate: boolean;
  myRating: number | null;
  allowElectricVehicle: boolean;
  vatInvoiceRequested: boolean;
  /** Danh sách khuyến mãi đã áp (shape chưa dùng tới → để unknown) */
  appliedPromotions: unknown[];
  /** ETA kèm sẵn lúc gọi API (đón/trả) — hiển thị ngay trước khi có tin 'eta' realtime. null nếu chuyến không ở pha di chuyển. */
  liveEta: LiveEta | null;
}

// ── Promotions / Vouchers (GET /promotions/vouchers) ────────────────────────
export type DiscountType = 'percentage' | 'fixed';
export type VoucherState = 'available' | 'used' | string;

export interface Voucher {
  promotionId: string;
  code: string;
  name: string;
  description: string;
  iconUrl: string | null;
  bannerUrl: string | null;
  discountType: DiscountType;
  /** % nếu 'percentage', số tiền (đ) nếu 'fixed' */
  discountValue: number;
  /** Trần giảm cho loại % (null = không giới hạn) */
  maxDiscountAmount: number | null;
  /** Giá cước tối thiểu để áp dụng */
  minFareAmount: number;
  validTo: string;
  stackable: boolean;
  autoApply: boolean;
  state: VoucherState;
}

export interface VoucherListResponse {
  items: Voucher[];
}

// ── Booking estimate (POST /bookings/estimate) ──────────────────────────────
export interface BookingEstimateRequest {
  /** vd "car_auto", "motorbike" */
  vehicleType: string;
  pickupLat: number;
  pickupLng: number;
  dropoffLat: number;
  dropoffLng: number;
  /** Mã ưu đãi muốn áp thử vào ước tính (rỗng nếu chưa chọn) */
  codes: string[];
  /** Loại chuyến, hiện tại luôn "p2p" */
  type: string;
}

export interface AppliedPromotionEstimate {
  promotionId: string;
  code: string;
  name: string;
  iconUrl: string | null;
  discountAmount: number;
}

export interface BookingEstimateResponse {
  fareMin: number;
  fareMax: number;
  distanceKm: number;
  durationMinutes: number;
  approximate: boolean;
  currency: string;
  fareAmount: number;
  appliedPromotions: AppliedPromotionEstimate[];
  discountAmount: number;
  netFare: number;
}

// ── Create booking (POST /bookings) ─────────────────────────────────────────
export interface CreateBookingRequest {
  /** Loại chuyến, hiện tại luôn "p2p" */
  type: string;
  /** vd "car_auto", "motorbike" */
  vehicleType: string;
  pickupLat: number;
  pickupLng: number;
  pickupAddress: string;
  dropoffLat: number;
  dropoffLng: number;
  dropoffAddress: string;
  /** Mã ưu đãi muốn áp dụng (rỗng nếu không chọn) */
  codes: string[];
  /** Cho phép ghép xe điện */
  allowElectricVehicle: boolean;
  /** Yêu cầu xuất hóa đơn VAT cho chuyến này */
  vatInvoiceRequested: boolean;
}

export type BookingStatus = 'requested' | string;

export interface CreateBookingResponse {
  bookingId: string;
  status: BookingStatus;
  estimatedFareMin: number;
  estimatedFareMax: number;
  fareApproximate: boolean;
  currency: string;
  fareAmount: number;
  appliedPromotions: AppliedPromotionEstimate[];
  discountAmount: number;
  netFare: number;
}

// Vị trí thô của 1 tài xế gần đó ({lat,lng}) — dùng vẽ icon xe quanh điểm đón lúc đang tìm.
export interface NearbyDriverLocation {
  lat: number;
  lng: number;
}

// GET /bookings/{id} — chi tiết booking khi đang tìm tài xế (trước khi có trip).
export interface BookingDetailDto {
  bookingId: string;
  customerId: string;
  /** Loại chuyến, vd "p2p" */
  type: string;
  status: BookingStatus;
  /** vd "car_auto", "motorbike" */
  vehicleType: string;
  requiredSkills: string[];
  pickupLat: number;
  pickupLng: number;
  pickupAddress: string;
  dropoffLat: number;
  dropoffLng: number;
  dropoffAddress: string;
  genderPref: string | null;
  scheduledAt: string | null;
  fareAmount: number;
  discountAmount: number;
  createdAt: string;
  /** Mốc hết hạn tìm tài xế (ISO 8601) — dùng đếm ngược thời gian còn lại */
  searchExpiresAt: string;
  /** Vị trí các tài xế gần điểm đón — cập nhật mỗi lần poll, dùng vẽ icon xe trên bản đồ */
  nearbyDrivers: NearbyDriverLocation[];
}

export interface CustomerPreferences {
  language: string;
  ride: {
    quiet: boolean;
    noSmoking: boolean;
    music: string | null;
    temperature: string | null;
  };
  notificationChannels: {
    push: boolean;
    sms: boolean;
    email: boolean;
    zalo: boolean;
  };
}

export interface CustomerStats {
  completedTrips: number;
  totalDistanceKm: number;
  totalSpentVnd: number;
  totalSavedVnd: number;
}

// GET /customers/me
export interface CustomerMe {
  userAccountId: string;
  /** false = tài khoản mới, chưa tạo hồ sơ (cần đặt tên + mật khẩu) */
  hasCustomerProfile: boolean;
  fullName: string | null;
  gender: Gender | string;
  dateOfBirth: string | null;
  avatarUrl: string | null;
  preferences: CustomerPreferences;
  stats: CustomerStats;
  loyalty: unknown | null;
}
