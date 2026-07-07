import { ActivityIndicator, FlatList, Image, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Card from '../../../shared/components/ui/Card';
import { useTrips } from '@shared/hooks/useTrips';
import { formatDate, formatTime, formatNumber } from '@shared/utils/format';
import type { TripDto } from '../../../types/models';

const CARD_WIDTH = 290;
const GAP = 12;

interface Props {
  onPressItem: (trip: TripDto) => void;
}

// Tối đa 5 chuyến đã hoàn thành gần nhất, vuốt ngang để xem.
const MAX_ITEMS = 5;

export default function RecentTrips({ onPressItem }: Props) {
  const query = useTrips('completed');
  const trips = (query.data?.pages.flatMap((page) => page.items) ?? []).slice(0, MAX_ITEMS);

  if (query.isLoading) {
    return (
      <View style={{ height: 150, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#2563EB" />
      </View>
    );
  }

  if (query.isError) {
    return (
      <TouchableOpacity onPress={() => query.refetch()} activeOpacity={0.85}>
        <Card className="mx-5 p-5">
          <Text className="text-sm text-gray-400 text-center">
            Không tải được chuyến đi. Chạm để thử lại.
          </Text>
        </Card>
      </TouchableOpacity>
    );
  }

  if (trips.length === 0) {
    return (
      <Card className="mx-5 p-5">
        <View className="items-center">
          <MaterialCommunityIcons name="map-marker-path" size={28} color="#d1d5db" />
          <Text className="text-sm text-gray-400 mt-2">Chưa có chuyến đi đã hoàn thành</Text>
        </View>
      </Card>
    );
  }

  return (
    <FlatList
      data={trips}
      keyExtractor={(item) => item.tripId}
      horizontal
      showsHorizontalScrollIndicator={false}
      snapToInterval={CARD_WIDTH + GAP}
      decelerationRate="fast"
      contentContainerStyle={{ paddingHorizontal: 20, gap: GAP }}
      renderItem={({ item }) => <RecentTripCard trip={item} onPress={() => onPressItem(item)} />}
    />
  );
}

function RecentTripCard({ trip, onPress }: { trip: TripDto; onPress: () => void }) {
  const when = trip.completedAt ?? trip.assignedAt;
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={{ width: CARD_WIDTH }}>
      <Card className="p-4">
        <Text className="text-xs text-gray-400 mb-3">
          {formatDate(when)} • {formatTime(when)}
        </Text>
        <View className="flex-row items-center">
          <View className="w-10 h-10 rounded-xl bg-primary-light items-center justify-center">
            <Image
              source={require('../../../../assets/trips/location.png')}
              style={{ width: 24, height: 24 }}
              resizeMode="contain"
            />
          </View>
          <View className="flex-1 ml-3">
            <Text className="text-sm text-gray-700" numberOfLines={1}>
              <Text className="text-gray-400">Từ: </Text>
              {trip.pickupAddress}
            </Text>
            <Text className="text-sm text-gray-700 mt-1" numberOfLines={1}>
              <Text className="text-gray-400">Đến: </Text>
              {trip.dropoffAddress}
            </Text>
          </View>
        </View>
        <View
          className="flex-row items-center justify-between mt-3 pt-3"
          style={{ borderTopWidth: 1, borderTopColor: '#f3f4f6' }}
        >
          {trip.fareAmount != null ? (
            <View className="bg-primary-light rounded-lg px-2.5 py-1">
              <Text className="text-base font-extrabold text-gray-900">
                {formatNumber(trip.fareAmount)}đ
              </Text>
            </View>
          ) : (
            <Text className="text-base font-bold text-gray-400">—</Text>
          )}
          <Ionicons name="chevron-forward" size={16} color="#d1d5db" />
        </View>
      </Card>
    </TouchableOpacity>
  );
}
