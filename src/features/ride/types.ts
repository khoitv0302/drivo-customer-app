import type { ServiceType } from '@navigation/types';

// Map serviceType hiển thị (UI) sang vehicleType backend chấp nhận.
export const VEHICLE_TYPE_BY_SERVICE: Record<ServiceType, string> = {
  car: 'car_auto',
  motorbike: 'motorbike',
};
