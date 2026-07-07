import { useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Card from '../../../shared/components/ui/Card';
import Carousel from '../../../shared/components/ui/Carousel';
import RecentTrips from '../components/RecentTrips';
import { useMe } from '@shared/hooks/useMe';
import { useCustomerHubTest } from '../hooks/useCustomerHubTest';
import { ROUTES, TABS } from '../../../constants/routes';
import type { ServiceType } from '../../../navigation/types';
import type { MainTabScreenProps } from '../../../navigation/types';
import type { TripDto } from '../../../types/models';

const BANNERS = [
  require('../../../../assets/banner1.png'),
  require('../../../../assets/007a206d-576d-4d49-8146-0dab9cbd81aa.png'),
  require('../../../../assets/007a206d-576d-4d49-8146-0dab9cbd81aa.png'),
];

const SERVICES: { type: ServiceType; icon: 'car' | 'motorbike'; title: string; subtitle: string }[] = [
  { type: 'car', icon: 'car', title: 'Tài xế ô tô', subtitle: 'Lái xe hộ bằng ô tô' },
  { type: 'motorbike', icon: 'motorbike', title: 'Tài xế xe máy', subtitle: 'Lái xe hộ bằng xe máy' },
];

// Tạm ẩn mục "Dịch vụ khác" cho đến khi có nội dung thật. Bật lại: đổi thành true.
const SHOW_OTHER_SERVICES = false;

export default function HomeScreen({ navigation }: MainTabScreenProps<'Home'>) {
  const insets = useSafeAreaInsets();
  const { data: me } = useMe();
  // Tên hiển thị: có tên thì chào tên, không thì "bạn".
  const greetingName = me?.fullName?.trim() || 'bạn';
  const [serviceSheetVisible, setServiceSheetVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(300)).current;
  const { state: hubState, connect: connectHub } = useCustomerHubTest();

  function openServiceSheet() {
    setServiceSheetVisible(true);
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start();
  }

  function closeServiceSheet() {
    Animated.timing(slideAnim, {
      toValue: 300,
      duration: 220,
      useNativeDriver: true,
    }).start(() => setServiceSheetVisible(false));
  }

  // Đi thẳng tới màn nhập điểm đến với loại dịch vụ đã chọn.
  function goToDestination(serviceType: ServiceType) {
    navigation.navigate(ROUTES.DESTINATION_SEARCH, { serviceType });
  }

  // Chạm 1 chuyến gần đây → mở màn đặt xe (Map) với điểm đón/đến lấy từ chuyến đó (theo lat/long).
  function bookAgain(trip: TripDto) {
    const serviceType: ServiceType = trip.vehicleType.startsWith('car') ? 'car' : 'motorbike';
    // Lấy tên hiển thị = phần trước dấu phẩy của địa chỉ.
    const nameOf = (addr: string) => addr.split(',')[0].trim() || addr;

    const origin =
      trip.pickupLat != null && trip.pickupLng != null
        ? {
            placeId: `trip-pickup-${trip.tripId}`,
            name: nameOf(trip.pickupAddress),
            address: trip.pickupAddress,
            latitude: trip.pickupLat,
            longitude: trip.pickupLng,
          }
        : undefined;

    const destination =
      trip.dropoffLat != null && trip.dropoffLng != null
        ? {
            placeId: `trip-dropoff-${trip.tripId}`,
            name: nameOf(trip.dropoffAddress),
            address: trip.dropoffAddress,
            latitude: trip.dropoffLat,
            longitude: trip.dropoffLng,
          }
        : undefined;

    navigation.navigate(ROUTES.MAP, { serviceType, origin, destination });
  }

  // Chọn từ bottom sheet: đóng sheet rồi mới điều hướng cho mượt.
  function selectService(serviceType: ServiceType) {
    closeServiceSheet();
    setTimeout(() => goToDestination(serviceType), 240);
  }

  // Dịch vụ chưa triển khai → báo tạm.
  function comingSoon() {
    Alert.alert('Sắp ra mắt', 'Tính năng đang được phát triển.');
  }

  return (
    <View className="flex-1 bg-gray-50">
      {/* Blue header — cố định, không cuộn */}
      <View
        className="bg-primary overflow-hidden"
        style={{ paddingTop: insets.top, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 }}
      >
        {/* Decorative circles */}
        <View
          style={{
            position: 'absolute', right: -40, top: insets.top - 20,
            width: 200, height: 200, borderRadius: 100,
            backgroundColor: 'rgba(255,255,255,0.07)',
          }}
        />
        <View
          style={{
            position: 'absolute', left: -30, bottom: -30,
            width: 130, height: 130, borderRadius: 65,
            backgroundColor: 'rgba(255,255,255,0.05)',
          }}
        />
        <View
          style={{
            position: 'absolute', right: 90, top: insets.top + 8,
            width: 70, height: 70, borderRadius: 35,
            backgroundColor: 'rgba(255,255,255,0.04)',
          }}
        />

        {/* Làm đậm phần đầu header (xanh sẫm hơn ở trên) */}
        <VerticalFade color="#1E40AF" from="top" max={0.8} power={1.5} />
        {/* Fade đáy header sang màu nền trang → phần dưới header mờ dần, ô Điểm đến nổi rõ */}
        <VerticalFade color="#f9fafb" from="bottom" />

        {/* Greeting */}
        <View className="px-5 pt-3 pb-4">
          <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13, fontWeight: '500' }}>
            Chào {greetingName}!
          </Text>
          <Text className="text-2xl font-bold text-white mt-1">
            Bạn cần đi đâu hôm nay?
          </Text>
        </View>

        {/* Destination search bar — nằm gọn trong header xanh */}
        <TouchableOpacity activeOpacity={0.85} onPress={openServiceSheet}>
          <Card className="mx-5 mb-6 p-3" style={{ shadowOpacity: 0.12, shadowRadius: 16, elevation: 5 }}>
            <View className="flex-row items-center">
              <View className="w-11 h-11 rounded-2xl bg-red-50 items-center justify-center">
                <Ionicons name="location" size={20} color="#EF4444" />
              </View>
              <View className="flex-1 ml-3">
                <Text className="text-xs text-gray-400">Điểm đến</Text>
                <Text className="text-base font-medium text-gray-500 mt-0.5">Bạn muốn đi đâu?</Text>
              </View>
            </View>
          </Card>
        </TouchableOpacity>
      </View>

      {/* Scrollable content */}
      <ScrollView
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Thuê tài xế */}
        <Text className="px-5 mt-3 mb-3 text-base font-bold text-gray-900">Thuê tài xế</Text>
        <Card className="mx-5 pt-5 pb-1 px-1">
          <View className="flex-row flex-wrap">
            <ServiceTile
              size="lg"
              label="Tài xế ô tô"
              bg="#eff6ff"
              icon={
                <Image
                  source={require('../../../../assets/services/sedan.png')}
                  style={{ width: 52, height: 52 }}
                  resizeMode="contain"
                />
              }
              onPress={() => goToDestination('car')}
            />
            <ServiceTile
              size="lg"
              label="Tài xế xe máy"
              bg="#eff6ff"
              icon={
                <Image
                  source={require('../../../../assets/services/scooter.png')}
                  style={{ width: 52, height: 52 }}
                  resizeMode="contain"
                />
              }
              onPress={() => goToDestination('motorbike')}
            />
          </View>
        </Card>

        {/* Nút tạm test kết nối SignalR — xoá khi có luồng realtime thật */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={connectHub}
          className="mx-5 mt-4 py-3 rounded-2xl bg-gray-900 items-center"
        >
          <Text className="text-white font-semibold">Test SignalR ({hubState})</Text>
        </TouchableOpacity>

        {/* Dịch vụ khác — tạm ẩn cho đến khi có nội dung */}
        {SHOW_OTHER_SERVICES && (
          <>
            <Text className="px-5 mt-4 mb-3 text-base font-bold text-gray-900">Dịch vụ khác</Text>
            <Card className="mx-5 pt-4 px-1">
              <View className="flex-row flex-wrap">
                <ServiceTile
                  label="Phạt nguội"
                  bg="#fef2f2"
                  icon={
                    <Image
                      source={require('../../../../assets/services/cctv-camera.png')}
                      style={{ width: 40, height: 40 }}
                      resizeMode="contain"
                    />
                  }
                  onPress={comingSoon}
                />
              </View>
            </Card>
          </>
        )}

        {/* Promo banner carousel */}
        <Carousel images={BANNERS} className="mx-5 mt-5" />

        {/* Recent trips */}
        <View className="flex-row items-center justify-between px-5 mt-7 mb-3">
          <Text className="text-base font-bold text-gray-900">Chuyến đi gần đây</Text>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => navigation.navigate(TABS.HISTORY, { initialFilter: 'completed' })}
          >
            <Text className="text-sm font-medium text-primary">Xem tất cả</Text>
          </TouchableOpacity>
        </View>

        <RecentTrips onPressItem={bookAgain} />
      </ScrollView>

      {/* Service selection bottom sheet */}
      <Modal
        visible={serviceSheetVisible}
        transparent
        animationType="none"
        onRequestClose={closeServiceSheet}
        statusBarTranslucent
      >
        <TouchableWithoutFeedback onPress={closeServiceSheet}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' }}>
            <TouchableWithoutFeedback>
              <Animated.View
                style={{
                  backgroundColor: 'white',
                  borderTopLeftRadius: 24,
                  borderTopRightRadius: 24,
                  paddingBottom: insets.bottom + 16,
                  transform: [{ translateY: slideAnim }],
                }}
              >
                <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 4 }}>
                  <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: '#e5e7eb' }} />
                </View>

                <Text
                  style={{
                    fontSize: 17, fontWeight: '700', color: '#111827',
                    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16,
                  }}
                >
                  Chọn loại dịch vụ
                </Text>

                {SERVICES.map((service, idx) => (
                  <TouchableOpacity
                    key={service.type}
                    onPress={() => selectService(service.type)}
                    activeOpacity={0.75}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      marginHorizontal: 16,
                      marginBottom: idx < SERVICES.length - 1 ? 10 : 0,
                      padding: 16,
                      backgroundColor: '#f8faff',
                      borderRadius: 16,
                      borderWidth: 1.5,
                      borderColor: '#dbeafe',
                    }}
                  >
                    <View
                      style={{
                        width: 52, height: 52, borderRadius: 14,
                        backgroundColor: '#eff6ff',
                        alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      <Image
                        source={
                          service.type === 'car'
                            ? require('../../../../assets/services/sedan.png')
                            : require('../../../../assets/services/scooter.png')
                        }
                        style={{ width: 40, height: 40 }}
                        resizeMode="contain"
                      />
                    </View>
                    <View style={{ flex: 1, marginLeft: 14 }}>
                      <Text style={{ fontSize: 15, fontWeight: '700', color: '#111827' }}>
                        {service.title}
                      </Text>
                      <Text style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>
                        {service.subtitle}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}

                <TouchableOpacity
                  onPress={closeServiceSheet}
                  activeOpacity={0.7}
                  style={{
                    marginHorizontal: 16, marginTop: 12,
                    paddingVertical: 14,
                    alignItems: 'center',
                    borderRadius: 12,
                    backgroundColor: '#f3f4f6',
                  }}
                >
                  <Text style={{ fontSize: 15, fontWeight: '600', color: '#6b7280' }}>Huỷ</Text>
                </TouchableOpacity>
              </Animated.View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

// Ô dịch vụ kiểu Grab: icon bo tròn nền màu + nhãn dưới.
// size 'sm' = 4 ô/hàng (lưới nhỏ); 'lg' = 2 ô/hàng, khối icon + nhãn to hơn.
function ServiceTile({
  icon,
  label,
  bg,
  onPress,
  size = 'sm',
}: {
  icon: React.ReactNode;
  label: string;
  bg: string;
  onPress: () => void;
  size?: 'sm' | 'lg';
}) {
  const large = size === 'lg';
  return (
    <TouchableOpacity
      style={{ width: large ? '50%' : '25%' }}
      className={`items-center mb-4 ${large ? 'px-2' : 'px-1'}`}
      activeOpacity={0.7}
      onPress={onPress}
    >
      <View
        className={`rounded-2xl items-center justify-center ${large ? 'w-20 h-20' : 'w-14 h-14'}`}
        style={{ backgroundColor: bg }}
      >
        {icon}
      </View>
      <Text
        className={`text-gray-700 text-center ${large ? 'text-sm font-semibold mt-2' : 'text-[11px] leading-[14px] mt-1.5'}`}
        numberOfLines={2}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// Gradient dọc "giả" bằng nhiều dải xếp chồng (không cần thư viện native).
// from='bottom': trong suốt ở trên → đặc dần thành `color` ở dưới (mờ đáy về màu nền).
// from='top':   đặc `color` ở trên → trong suốt xuống dưới (làm đậm phần đầu header).
function VerticalFade({
  color,
  from = 'bottom',
  max = 1,
  power = 1.7,
}: {
  color: string;
  from?: 'top' | 'bottom';
  max?: number;
  power?: number;
}) {
  const BANDS = 18;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {Array.from({ length: BANDS }).map((_, i) => {
        const t = i / (BANDS - 1); // 0 = trên, 1 = dưới
        const ramp = from === 'bottom' ? t : 1 - t;
        return (
          <View key={i} style={{ flex: 1, backgroundColor: color, opacity: Math.pow(ramp, power) * max }} />
        );
      })}
    </View>
  );
}
