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
}

export interface TripFeedResponse {
  items: TripDto[];
  nextCursor: string | null;
  totalCount: number;
}

// GET /trips/{tripId} — chi tiết 1 chuyến. Là superset của TripDto (thêm mã chuyến,
// các mốc thời gian, phí giảm/thực trả, khuyến mãi đã áp...).
export interface TripDetailDto {
  tripId: string;
  bookingId: string;
  customerId: string;
  driverUserId: string;
  /** Mã chuyến hiển thị cho người dùng, vd "DRV-00000001" */
  tripCode: string;
  vehicleType: string;
  /** vd "scheduled" | "instant" */
  bookingType: string;
  status: ApiTripStatus | string;
  assignedAt: string;
  /** Mốc tài xế đến điểm đón */
  arrivedAt: string | null;
  /** Mốc bắt đầu di chuyển */
  startedAt: string | null;
  completedAt: string | null;
  distanceKm: number | null;
  durationMin: number | null;
  /** Số phút chờ tại điểm đón */
  waitingMin: number | null;
  pickupLat: number | null;
  pickupLng: number | null;
  dropoffLat: number | null;
  dropoffLng: number | null;
  fareAmount: number | null;
  discountAmount: number | null;
  netFareAmount: number | null;
  paymentMethod: string | null;
  cancelReason: string | null;
  pickupAddress: string;
  dropoffAddress: string;
  counterpartyName: string;
  counterpartyRating: number | null;
  counterpartyAvatarUrl: string | null;
  /** Danh sách khuyến mãi đã áp (shape chưa dùng tới → để unknown) */
  appliedPromotions: unknown[];
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
