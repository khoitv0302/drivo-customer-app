import { useMutation } from '@tanstack/react-query';
import type { ApiError } from '@services/api/types';
import { rateTrip } from '@services/trips/tripsService';

interface RateTripVars {
  tripId: string;
  stars: number;
  comment?: string;
}

// Hook đánh giá tài xế (dùng chung cho trip-history và ride).
// Dùng: const { mutate, isPending } = useRateTrip();
export function useRateTrip() {
  return useMutation<void, ApiError, RateTripVars>({
    mutationFn: ({ tripId, stars, comment }) => rateTrip(tripId, { stars, comment }),
  });
}
