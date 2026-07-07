import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  ScrollView,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import TripListPage from '../components/TripListPage';
import RatingModal from '../components/RatingModal';
import { useTrips } from '@shared/hooks/useTrips';
import { ROUTES } from '../../../constants/routes';
import type { MainTabScreenProps } from '../../../navigation/types';
import type { Trip, TripStatusFilter } from '../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const TABS: { name: string; filter: TripStatusFilter; showActions: boolean }[] = [
  { name: 'Đang hoạt động', filter: 'active', showActions: false },
  { name: 'Đã hoàn thành', filter: 'completed', showActions: true },
  { name: 'Tất cả', filter: 'all', showActions: true },
];
const TAB_WIDTH = SCREEN_WIDTH / TABS.length;

export default function TripHistoryScreen({ route, navigation }: MainTabScreenProps<'History'>) {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  // Tab mở sẵn theo param (vd từ Home "Xem tất cả" -> 'completed').
  const initialIndex = Math.max(
    0,
    route.params?.initialFilter
      ? TABS.findIndex((t) => t.filter === route.params?.initialFilter)
      : 0,
  );
  const [activeTab, setActiveTab] = useState(initialIndex);
  const [ratingTrip, setRatingTrip] = useState<Trip | null>(null);
  const [ratedIds, setRatedIds] = useState<Set<string>>(new Set());
  const [pagerHeight, setPagerHeight] = useState(windowHeight);
  // Lazy: chỉ gọi API cho tab đã mở.
  const [visited, setVisited] = useState<boolean[]>(() => TABS.map((_, i) => i === initialIndex));

  const pagerRef = useRef<ScrollView>(null);
  const scrollX = useRef(new Animated.Value(initialIndex * SCREEN_WIDTH)).current;

  // Tổng số chuyến của tab đang xem — dùng lại cache của trang tab (cùng queryKey, không gọi thừa).
  const headerQuery = useTrips(TABS[activeTab].filter, visited[activeTab]);
  const totalCount = headerQuery.data?.pages[0]?.totalCount;

  const markVisited = (index: number) => {
    setVisited((prev) => (prev[index] ? prev : prev.map((v, i) => (i === index ? true : v))));
  };

  const indicatorTranslateX = scrollX.interpolate({
    inputRange: TABS.map((_, i) => i * SCREEN_WIDTH),
    outputRange: TABS.map((_, i) => i * TAB_WIDTH),
    extrapolate: 'clamp',
  });

  const goToTab = (index: number) => {
    setActiveTab(index);
    markVisited(index);
    pagerRef.current?.scrollTo({ x: index * SCREEN_WIDTH, animated: true });
  };

  // Khi được điều hướng lại kèm initialFilter (màn đã mount sẵn): chuyển tab rồi xoá param
  // để lần bấm sau (dù cùng giá trị) vẫn kích hoạt.
  useEffect(() => {
    const filter = route.params?.initialFilter;
    if (!filter) return;
    const idx = TABS.findIndex((t) => t.filter === filter);
    if (idx >= 0) goToTab(idx);
    navigation.setParams({ initialFilter: undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route.params?.initialFilter]);

  const onMomentumScrollEnd = (e: { nativeEvent: { contentOffset: { x: number } } }) => {
    const page = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setActiveTab(page);
    markVisited(page);
  };

  // Đánh giá thành công → đánh dấu đã đánh giá để nút chuyển "Đã đánh giá".
  const handleRated = (tripId: string) => {
    setRatedIds((prev) => new Set(prev).add(tripId));
  };

  // "Đặt lại" → mở màn đặt xe (Map) với điểm đón/đến lấy từ chuyến cũ (theo lat/long).
  const rebook = (trip: Trip) => {
    const nameOf = (addr: string) => addr.split(',')[0].trim() || addr;
    const origin =
      trip.pickupLat != null && trip.pickupLng != null
        ? {
            placeId: `trip-pickup-${trip.id}`,
            name: nameOf(trip.from),
            address: trip.from,
            latitude: trip.pickupLat,
            longitude: trip.pickupLng,
          }
        : undefined;
    const destination =
      trip.dropoffLat != null && trip.dropoffLng != null
        ? {
            placeId: `trip-dropoff-${trip.id}`,
            name: nameOf(trip.to),
            address: trip.to,
            latitude: trip.dropoffLat,
            longitude: trip.dropoffLng,
          }
        : undefined;
    navigation.navigate(ROUTES.MAP, { serviceType: trip.serviceType, origin, destination });
  };

  // Chạm vào 1 chuyến → mở màn chi tiết (màn tự gọi GET /trips/{id}).
  const openDetail = (trip: Trip) => {
    navigation.navigate(ROUTES.TRIP_DETAIL, { tripId: trip.id });
  };

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header with blue background */}
      <View className="bg-primary overflow-hidden" style={{ paddingTop: insets.top }}>
        {/* Decorative circles */}
        <View
          style={{
            position: 'absolute',
            right: -40,
            top: insets.top - 20,
            width: 180,
            height: 180,
            borderRadius: 90,
            backgroundColor: 'rgba(255,255,255,0.07)',
          }}
        />
        <View
          style={{
            position: 'absolute',
            right: 60,
            top: insets.top + 20,
            width: 90,
            height: 90,
            borderRadius: 45,
            backgroundColor: 'rgba(255,255,255,0.05)',
          }}
        />
        <View
          style={{
            position: 'absolute',
            left: -24,
            bottom: -16,
            width: 100,
            height: 100,
            borderRadius: 50,
            backgroundColor: 'rgba(255,255,255,0.05)',
          }}
        />

        <View className="px-5 pt-5 pb-6">
          <Text className="text-2xl font-bold text-white">Lịch sử</Text>
          <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13, marginTop: 3 }}>
            {totalCount != null ? `${totalCount} chuyến đi` : 'Đang tải...'}
          </Text>
        </View>
      </View>

      {/* Tab bar */}
      <View className="bg-white" style={{ borderBottomWidth: 1, borderBottomColor: '#f3f4f6' }}>
        <View className="flex-row relative">
          {TABS.map((tab, i) => (
            <TouchableOpacity
              key={tab.name}
              style={{ width: TAB_WIDTH }}
              className="py-3.5 items-center"
              onPress={() => goToTab(i)}
              activeOpacity={0.7}
            >
              <Text
                className="text-sm font-semibold"
                style={{ color: activeTab === i ? '#2563EB' : '#9ca3af' }}
              >
                {tab.name}
              </Text>
            </TouchableOpacity>
          ))}

          {/* Animated underline — follows swipe in real-time */}
          <Animated.View
            style={{
              position: 'absolute',
              bottom: 0,
              height: 2.5,
              width: TAB_WIDTH,
              backgroundColor: '#2563EB',
              borderRadius: 2,
              transform: [{ translateX: indicatorTranslateX }],
            }}
          />
        </View>
      </View>

      {/* Pager */}
      <View
        className="flex-1"
        onLayout={(e) => {
          const h = e.nativeEvent.layout.height;
          if (h > 0) setPagerHeight(h);
        }}
      >
        <ScrollView
          ref={pagerRef}
          horizontal
          pagingEnabled
          contentOffset={{ x: initialIndex * SCREEN_WIDTH, y: 0 }}
          showsHorizontalScrollIndicator={false}
          bounces={false}
          scrollEventThrottle={16}
          decelerationRate="fast"
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { x: scrollX } } }],
            { useNativeDriver: false },
          )}
          onMomentumScrollEnd={onMomentumScrollEnd}
          style={{ flex: 1 }}
        >
          {TABS.map((tab, index) => (
            <TripListPage
              key={tab.filter}
              status={tab.filter}
              enabled={visited[index]}
              showActions={tab.showActions}
              width={SCREEN_WIDTH}
              height={pagerHeight}
              ratedIds={ratedIds}
              onRate={setRatingTrip}
              onRebook={rebook}
              onPressItem={openDetail}
            />
          ))}
        </ScrollView>
      </View>

      <RatingModal
        visible={ratingTrip !== null}
        trip={ratingTrip}
        onClose={() => setRatingTrip(null)}
        onRated={handleRated}
      />
    </View>
  );
}
