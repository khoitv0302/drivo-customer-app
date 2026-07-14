import type { ServiceType } from '@navigation/types';

// Map serviceType hiển thị (UI) sang vehicleType backend chấp nhận.
export const VEHICLE_TYPE_BY_SERVICE: Record<ServiceType, string> = {
  car: 'car_auto',
  motorbike: 'motorbike',
};

// Payload thật của event CustomerHub 'eta' — bắn ~mỗi 45s sau khi đã TrackTrip(tripId).
// phase: 'pickup' khi tài xế đang tới điểm đón, 'dropoff' khi đang chở khách tới điểm đến.
export interface TripEtaMessage {
  tripId: string;
  driverUserId: string;
  phase: 'pickup' | 'dropoff';
  distanceKm: number;
  etaMinutes: number;
  isApproximate: boolean;
  ts: number;
}

// Payload thật của event CustomerHub 'position' — relay từ UpdateLocation() heartbeat bên
// driver app. Chỉ nhận được sau khi đã TrackTrip(tripId).
export interface DriverPositionMessage {
  tripId: string;
  lat: number;
  lng: number;
  heading: number;
  speed: number;
  ts: number;
}

// Payload event CustomerHub 'trip_status' — trạng thái chuyến thay đổi. Chỉ nhận được sau khi
// đã TrackTrip(tripId). Chưa xác nhận field name/shape chính xác từ server — đang dò qua log.
export type TripStatusValue = 'assigned' | 'en_route' | 'arrived' | 'in_progress' | 'awaiting_payment' | 'paid' | 'completed';

export interface TripStatusMessage {
  tripId: string;
  status: TripStatusValue;
  ts: number;
}
