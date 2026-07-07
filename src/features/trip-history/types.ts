export type TripStatus = 'active' | 'completed' | 'cancelled';
export type ServiceType = 'car' | 'motorbike';

// DTO/token của API /trips nay ở domain models (dùng chung với home). Re-export cho tiện.
export type { ApiTripStatus, TripDto, TripFeedResponse, TripStatusFilter } from '../../types/models';

export interface TripDriver {
  id: string;
  name: string;
  phone: string;
  rating: number;
  vehiclePlate: string;
  vehicleModel: string;
}

export interface Trip {
  id: string;
  status: TripStatus;
  date: string;
  time: string;
  from: string;
  to: string;
  price: number;
  distance: string;
  duration: string;
  driver: TripDriver;
  serviceType: ServiceType;
  isRated: boolean;
  /** Toạ độ điểm đón/đến — dùng cho nút "Đặt lại" mở màn đặt xe với đúng lộ trình */
  pickupLat: number | null;
  pickupLng: number | null;
  dropoffLat: number | null;
  dropoffLng: number | null;
}
