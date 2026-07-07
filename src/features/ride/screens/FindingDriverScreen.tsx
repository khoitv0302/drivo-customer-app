import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Animated, Easing, Image, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Mapbox from '@rnmapbox/maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import DraggableBottomSheet from '@shared/components/layout/DraggableBottomSheet';
import type { RootScreenProps } from '../../../navigation/types';

const SEARCH_SECONDS = 300; // 05:00
const DRIVERS_NOTIFIED = 8;
const PROGRESS_SEGMENTS = 5;

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmtTime(total: number) {
  const m = Math.floor(total / 60).toString().padStart(2, '0');
  const s = (total % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}
function fmtDist(m: number) {
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`;
}
function fmtDur(s: number) {
  const m = Math.round(s / 60);
  if (m < 60) return `${m} phút`;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return mm > 0 ? `${h} giờ ${mm} phút` : `${h} giờ`;
}
function fmtVND(n: number) {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

// Vị trí giả của các tài xế quanh điểm đón (lệch theo lng/lat).
const DRIVER_OFFSETS: [number, number][] = [
  [0.004, 0.003], [-0.0035, 0.0042], [0.0052, -0.0028], [-0.0043, -0.0031],
  [0.0018, -0.0052], [-0.0012, 0.0055], [0.0038, 0.0012], [-0.0052, 0.0008],
];
interface MockDriver { id: string; coordinate: [number, number] }
function genDrivers(c: [number, number]): MockDriver[] {
  return DRIVER_OFFSETS.map(([dLng, dLat], i) => ({ id: `d${i}`, coordinate: [c[0] + dLng, c[1] + dLat] }));
}

export default function FindingDriverScreen({ navigation, route }: RootScreenProps<'FindingDriver'>) {
  const insets = useSafeAreaInsets();
  const {
    serviceType, pickupName, pickupLat, pickupLng, dropoffName,
    distanceM, durationS, fare, paymentLabel,
  } = route.params;

  const isCar = serviceType === 'car';
  const pickupCoord = useMemo<[number, number]>(() => [pickupLng, pickupLat], [pickupLng, pickupLat]);
  const drivers = useMemo(() => genDrivers(pickupCoord), [pickupCoord]);

  const [remain, setRemain] = useState(SEARCH_SECONDS);
  const [filled, setFilled] = useState(1);

  // Đếm ngược thời gian tìm tài xế.
  useEffect(() => {
    if (remain <= 0) return;
    const t = setInterval(() => setRemain((v) => v - 1), 1000);
    return () => clearInterval(t);
  }, [remain]);

  // Thanh tiến trình chạy vòng để tạo cảm giác "đang tìm".
  useEffect(() => {
    const t = setInterval(() => setFilled((f) => (f >= PROGRESS_SEGMENTS ? 1 : f + 1)), 700);
    return () => clearInterval(t);
  }, []);

  // Giả lập tìm được tài xế sau ít giây → sang màn "đã tìm thấy" (replace để không back lại đây).
  useEffect(() => {
    const t = setTimeout(() => navigation.replace('DriverFound', route.params), 4500);
    return () => clearTimeout(t);
  }, [navigation, route.params]);

  // Sóng radar quanh điểm đón — 3 vòng lan toả lệch pha nhau.
  const ring0 = useRef(new Animated.Value(0)).current;
  const ring1 = useRef(new Animated.Value(0)).current;
  const ring2 = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loops = [ring0, ring1, ring2].map((v, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 800),
          Animated.timing(v, { toValue: 1, duration: 2400, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        ]),
      ),
    );
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, [ring0, ring1, ring2]);

  // Không tự hủy — hướng người dùng gọi tổng đài để được hỗ trợ hủy.
  const cancelTrip = () => {
    Alert.alert(
      'Hủy chuyến',
      'Để hủy chuyến, vui lòng gọi tổng đài 1900 1234 để được hỗ trợ.',
      [
        { text: 'Đóng', style: 'cancel' },
        { text: 'Gọi tổng đài', onPress: () => Linking.openURL('tel:19001234').catch(() => {}) },
      ],
    );
  };

  const comingSoon = () => Alert.alert('Sắp ra mắt', 'Tính năng đang được phát triển.');

  return (
    <View style={StyleSheet.absoluteFillObject}>
      {/* ── Map ── */}
      <Mapbox.MapView
        style={StyleSheet.absoluteFillObject}
        styleURL="mapbox://styles/mapbox/standard"
        logoEnabled={false}
        attributionEnabled={false}
        scaleBarEnabled={false}
        localizeLabels={{ locale: 'vi' }}
      >
        <Mapbox.Camera centerCoordinate={pickupCoord} zoomLevel={14} animationMode="none" />

        {/* Tài xế quanh điểm đón */}
        {drivers.map((d) => (
          <Mapbox.MarkerView key={d.id} id={d.id} coordinate={d.coordinate}>
            <View style={s.driverMarker}>
              <MaterialCommunityIcons name={isCar ? 'car' : 'motorbike'} size={15} color="white" />
            </View>
          </Mapbox.MarkerView>
        ))}

        {/* Điểm đón + sóng radar */}
        <Mapbox.MarkerView id="pickup" coordinate={pickupCoord}>
          <View style={s.radarWrap} pointerEvents="none">
            {[ring0, ring1, ring2].map((v, i) => (
              <Animated.View
                key={i}
                style={[
                  s.radarRing,
                  {
                    opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0] }),
                    transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1] }) }],
                  },
                ]}
              />
            ))}
            <View style={s.radarCore} />
            <View style={s.pickupDot} />
          </View>
        </Mapbox.MarkerView>
      </Mapbox.MapView>

      {/* ── Top buttons ── */}
      <View style={[s.topRow, { top: insets.top + 8 }]}>
        <TouchableOpacity style={s.circleBtn} activeOpacity={0.85} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color="#111827" />
        </TouchableOpacity>
        <TouchableOpacity style={s.safetyBtn} activeOpacity={0.85} onPress={comingSoon}>
          <Ionicons name="shield-checkmark" size={16} color="#2563EB" />
          <Text style={s.safetyText}>An toàn</Text>
        </TouchableOpacity>
      </View>

      {/* ── Floating callout ── */}
      <View style={[s.callout, { top: insets.top + 60 }]} pointerEvents="none">
        <Text style={s.calloutTitle}>Đang tìm tài xế gần bạn...</Text>
        <Text style={s.calloutSub}>
          Đã gửi yêu cầu đến <Text style={s.calloutStrong}>{DRIVERS_NOTIFIED}</Text> tài xế
        </Text>
      </View>

      {/* ── Bottom sheet (kéo thanh "–" để thu gọn) ── */}
      <DraggableBottomSheet style={{ paddingBottom: insets.bottom + 16 }} collapsedVisibleHeight={108}>
        {/* Header: tiêu đề + đồng hồ đếm ngược */}
        <View style={s.headerRow}>
          <View style={s.searchIcon}>
            <Ionicons name="search" size={16} color="#2563EB" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.title}>Đang tìm tài xế</Text>
            <Text style={s.subtitle}>Chúng tôi đang kết nối bạn với tài xế gần nhất.</Text>
          </View>
          <View style={s.timerWrap}>
            <View style={s.timerRing}>
              <Text style={s.timerText}>{fmtTime(remain)}</Text>
            </View>
            <Text style={s.timerLabel}>Thời gian còn lại</Text>
          </View>
        </View>

        {/* Progress */}
        <View style={s.progressRow}>
          <View style={s.progressBar}>
            {Array.from({ length: PROGRESS_SEGMENTS }).map((_, i) => (
              <View
                key={i}
                style={[s.progressSeg, { backgroundColor: i < filled ? '#2563EB' : '#e5e7eb' }]}
              />
            ))}
          </View>
          <Text style={s.progressLabel}>Đã gửi tới {DRIVERS_NOTIFIED} tài xế</Text>
        </View>

        <View style={s.divider} />

        {/* Vehicle */}
        <View style={s.vehicleRow}>
          <Image
            source={isCar
              ? require('../../../../assets/services/sedan.png')
              : require('../../../../assets/services/scooter.png')}
            style={{ width: 40, height: 40 }}
            resizeMode="contain"
          />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={s.vehicleTitle}>{isCar ? 'Thuê tài xế ô tô' : 'Thuê tài xế xe máy'}</Text>
            <Text style={s.vehicleSub}>{fmtDur(durationS)} • {fmtDist(distanceM)}</Text>
          </View>
        </View>

        {/* Route */}
        <View style={s.routeRow}>
          <View style={s.routeDots}>
            <View style={s.dotBlue} />
            <View style={s.routeLine} />
            <View style={s.dotRed} />
          </View>
          <View style={{ flex: 1, gap: 14 }}>
            <View>
              <Text style={s.routeLabel}>Điểm đón</Text>
              <Text style={s.routeValue} numberOfLines={1}>{pickupName}</Text>
            </View>
            <View>
              <Text style={s.routeLabel}>Điểm đến</Text>
              <Text style={s.routeValue} numberOfLines={1}>{dropoffName}</Text>
            </View>
          </View>
        </View>

        <View style={s.divider} />

        {/* Thanh toán + tổng tiền — chung 1 dòng */}
        <TouchableOpacity style={s.payTotalRow} activeOpacity={0.7} onPress={comingSoon}>
          <View style={s.payLeft}>
            <View style={s.payIcon}>
              <Image
                source={require('../../../../assets/map-screen/money.png')}
                style={{ width: 18, height: 18 }}
                resizeMode="contain"
              />
            </View>
            <Text style={s.payText}>{paymentLabel}</Text>
          </View>
          <Text style={s.totalValue}>{fmtVND(fare)}đ</Text>
        </TouchableOpacity>

        {/* Cancel */}
        <TouchableOpacity style={s.cancelBtn} activeOpacity={0.85} onPress={cancelTrip}>
          <Text style={s.cancelText}>Hủy chuyến</Text>
        </TouchableOpacity>
      </DraggableBottomSheet>
    </View>
  );
}

const s = StyleSheet.create({
  // Map markers
  driverMarker: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: '#2563EB',
    alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'white',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 3, elevation: 4,
  },
  radarWrap: { width: 240, height: 240, alignItems: 'center', justifyContent: 'center' },
  radarRing: {
    position: 'absolute', width: 240, height: 240, borderRadius: 120,
    borderWidth: 2, borderColor: '#2563EB', backgroundColor: 'rgba(37,99,235,0.06)',
  },
  radarCore: { position: 'absolute', width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(37,99,235,0.15)' },
  pickupDot: {
    width: 24, height: 24, borderRadius: 12, backgroundColor: '#2563EB', borderWidth: 4, borderColor: 'white',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 6,
  },

  // Top
  topRow: {
    position: 'absolute', left: 16, right: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  circleBtn: {
    width: 42, height: 42, borderRadius: 21, backgroundColor: 'white',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 6, elevation: 5,
  },
  safetyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'white', borderRadius: 21, paddingHorizontal: 14, height: 42,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 6, elevation: 5,
  },
  safetyText: { fontSize: 13, fontWeight: '600', color: '#111827' },

  // Callout
  callout: {
    position: 'absolute', alignSelf: 'center', backgroundColor: 'white',
    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 9, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.14, shadowRadius: 10, elevation: 6,
  },
  calloutTitle: { fontSize: 13, fontWeight: '600', color: '#111827' },
  calloutSub: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  calloutStrong: { color: '#2563EB', fontWeight: '600' },

  headerRow: { flexDirection: 'row', alignItems: 'center' },
  searchIcon: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: '#eff6ff',
    alignItems: 'center', justifyContent: 'center', marginRight: 11,
  },
  title: { fontSize: 15, fontWeight: '700', color: '#111827' },
  subtitle: { fontSize: 12, color: '#6b7280', marginTop: 2, lineHeight: 16 },
  timerWrap: { alignItems: 'center', marginLeft: 8 },
  timerRing: {
    width: 52, height: 52, borderRadius: 26, borderWidth: 3.5, borderColor: '#2563EB',
    alignItems: 'center', justifyContent: 'center',
  },
  timerText: { fontSize: 12, fontWeight: '700', color: '#111827' },
  timerLabel: { fontSize: 10, color: '#9ca3af', marginTop: 3 },

  progressRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 },
  progressBar: { flexDirection: 'row', gap: 6, flex: 1, marginRight: 12 },
  progressSeg: { flex: 1, height: 5, borderRadius: 3 },
  progressLabel: { fontSize: 12, color: '#6b7280' },

  divider: { height: 1, backgroundColor: '#f3f4f6', marginVertical: 12 },

  vehicleRow: { flexDirection: 'row', alignItems: 'center' },
  vehicleTitle: { fontSize: 14, fontWeight: '600', color: '#111827' },
  vehicleSub: { fontSize: 12, color: '#9ca3af', marginTop: 2 },

  routeRow: { flexDirection: 'row', marginTop: 12, gap: 12 },
  routeDots: { alignItems: 'center', width: 12, paddingTop: 4 },
  dotBlue: { width: 11, height: 11, borderRadius: 6, backgroundColor: '#2563EB' },
  dotRed: { width: 11, height: 11, borderRadius: 6, backgroundColor: '#EF4444' },
  routeLine: { width: 2, flex: 1, minHeight: 22, backgroundColor: '#e5e7eb', marginVertical: 3 },
  routeLabel: { fontSize: 11, color: '#9ca3af' },
  routeValue: { fontSize: 14, fontWeight: '600', color: '#111827', marginTop: 2 },

  payTotalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  payLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  payIcon: {
    width: 32, height: 32, borderRadius: 9, backgroundColor: '#f0fdf4',
    alignItems: 'center', justifyContent: 'center',
  },
  payText: { fontSize: 14, fontWeight: '500', color: '#111827' },
  totalValue: { fontSize: 17, fontWeight: '700', color: '#111827' },

  cancelBtn: {
    marginTop: 14, borderRadius: 13, paddingVertical: 13, alignItems: 'center',
    backgroundColor: '#f3f4f6',
  },
  cancelText: { fontSize: 14, fontWeight: '600', color: '#6b7280' },
});
