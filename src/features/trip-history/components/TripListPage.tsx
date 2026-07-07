import { useMemo } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import TripCard from './TripCard';
import { useTrips } from '@shared/hooks/useTrips';
import { mapTrip } from '../mapTrip';
import type { Trip, TripStatusFilter } from '../types';

function EmptyState() {
  return (
    <View className="flex-1 items-center justify-center" style={{ paddingBottom: 60 }}>
      <View className="w-24 h-24 rounded-full bg-gray-100 items-center justify-center mb-4">
        <Ionicons name="receipt-outline" size={40} color="#d1d5db" />
      </View>
      <Text className="text-base font-semibold text-gray-400">Chưa có chuyến đi nào</Text>
      <Text className="text-sm text-gray-300 mt-1 text-center px-8">
        Các chuyến đi sẽ xuất hiện ở đây
      </Text>
    </View>
  );
}

interface Props {
  status: TripStatusFilter;
  enabled: boolean;
  showActions: boolean;
  width: number;
  height: number;
  ratedIds: Set<string>;
  onRate: (trip: Trip) => void;
  onRebook: (trip: Trip) => void;
  onPressItem: (trip: Trip) => void;
}

export default function TripListPage({
  status,
  enabled,
  showActions,
  width,
  height,
  ratedIds,
  onRate,
  onRebook,
  onPressItem,
}: Props) {
  const query = useTrips(status, enabled);

  const trips = useMemo(
    () =>
      query.data?.pages.flatMap((page) =>
        page.items.map((dto) => mapTrip(dto, ratedIds.has(dto.tripId))),
      ) ?? [],
    [query.data, ratedIds],
  );

  const loadMore = () => {
    if (query.hasNextPage && !query.isFetchingNextPage) query.fetchNextPage();
  };

  if (query.isLoading) {
    return (
      <View style={{ width, height, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  if (query.isError) {
    return (
      <View style={{ width, height, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 }}>
        <Ionicons name="cloud-offline-outline" size={44} color="#d1d5db" />
        <Text style={{ fontSize: 15, fontWeight: '600', color: '#6b7280', marginTop: 12, textAlign: 'center' }}>
          Không tải được lịch sử chuyến
        </Text>
        <TouchableOpacity
          onPress={() => query.refetch()}
          activeOpacity={0.8}
          style={{ marginTop: 16, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, backgroundColor: '#2563EB' }}
        >
          <Text style={{ color: 'white', fontWeight: '600', fontSize: 14 }}>Thử lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ width, height }}>
      <FlatList
        data={trips}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TripCard trip={item} showActions={showActions} onRate={onRate} onRebook={onRebook} onPress={onPressItem} />
        )}
        contentContainerStyle={{ paddingTop: 12, paddingBottom: 24, flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        onEndReachedThreshold={0.4}
        onEndReached={loadMore}
        refreshControl={
          <RefreshControl refreshing={query.isRefetching} onRefresh={query.refetch} tintColor="#2563EB" />
        }
        ListFooterComponent={
          query.isFetchingNextPage ? (
            <View style={{ paddingVertical: 20 }}>
              <ActivityIndicator size="small" color="#9ca3af" />
            </View>
          ) : null
        }
        ListEmptyComponent={<EmptyState />}
      />
    </View>
  );
}
