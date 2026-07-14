import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Animated, Easing, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Mapbox from '@rnmapbox/maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import DraggableBottomSheet from '@shared/components/layout/DraggableBottomSheet';
import { useToast } from '@shared/components/ui/Toast';
import { useBookingMatchListener } from '../hooks/useBookingMatchListener';
import { useBookingDetail } from '../api/useBookingDetail';
import type { RootScreenProps } from '../../../navigation/types';

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

interface DriverMarker { id: string; coordinate: [number, number] }

export default function FindingDriverScreen({ navigation, route }: RootScreenProps<'FindingDriver'>) {
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const {
    bookingId, serviceType, pickupName, pickupLat, pickupLng, dropoffName,
    distanceM, durationS, fare, paymentLabel,
  } = route.params;

  // Booking đã tạo thành công ở màn trước → connect CustomerHub, chờ event ghép tài xế
  // rồi lấy chuyến hiện tại (GET /trips/me/current) và sang màn DriverFound.
  useBookingMatchListener(navigation, route.params);

  // Chi tiết booking: searchExpiresAt (đếm ngược) + nearbyDrivers (vị trí tài xế ban đầu).
  const { data: booking } = useBookingDetail(bookingId);

  const isCar = serviceType === 'car';
  const pickupCoord = useMemo<[number, number]>(() => [pickupLng, pickupLat], [pickupLng, pickupLat]);

  // Icon xe tài xế gần điểm đón — lấy từ nearbyDrivers, cập nhật mỗi lần poll (5s). Chưa có
  // data (lần poll đầu chưa về) thì để rỗng, không vẽ điểm giả.
  const drivers = useMemo<DriverMarker[]>(
    () => (booking?.nearbyDrivers ?? []).map((d, i) => ({ id: `d${i}`, coordinate: [d.lng, d.lat] })),
    [booking?.nearbyDrivers],
  );

  const [filled, setFilled] = useState(1);

  // Khoá mốc hết hạn tìm tài xế NGAY lần đầu backend trả về searchExpiresAt. Các lần poll sau
  // KHÔNG cập nhật lại → FE tự đếm ngược từ mốc đã khoá, số giây không bị nhảy theo server.
  const [lockedExpiryMs, setLockedExpiryMs] = useState<number | null>(null);
  useEffect(() => {
    if (lockedExpiryMs === null && booking?.searchExpiresAt) {
      setLockedExpiryMs(new Date(booking.searchExpiresAt).getTime());
    }
  }, [booking?.searchExpiresAt, lockedExpiryMs]);

  // Chỉ đếm ngược khi backend đã trả searchExpiresAt; chưa có thì remain = null → hiện "--:--".
  const [remain, setRemain] = useState<number | null>(null);
  useEffect(() => {
    if (lockedExpiryMs === null) return;
    const tick = () => setRemain(Math.max(0, Math.round((lockedExpiryMs - Date.now()) / 1000)));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [lockedExpiryMs]);

  // Hết thời gian tìm tài xế (theo đúng mốc server trả về) → thoát booking, quay lại Map.
  const expiredRef = useRef(false);
  useEffect(() => {
    if (expiredRef.current) return;
    if (lockedExpiryMs !== null && remain !== null && remain <= 0) {
      expiredRef.current = true;
      showToast('Chưa tìm được tài xế, vui lòng thử lại.', { type: 'info' });
      navigation.goBack();
    }
  }, [remain, lockedExpiryMs, navigation, showToast]);

  // Thanh tiến trình chạy vòng để tạo cảm giác "đang tìm".
  useEffect(() => {
    const t = setInterval(() => setFilled((f) => (f >= PROGRESS_SEGMENTS ? 1 : f + 1)), 700);
    return () => clearInterval(t);
  }, []);

  // Không tự động sang màn "đã tìm thấy" nữa — chờ luồng ghép tài xế thật (SignalR) điều hướng.

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

  // Huỷ chuyến (tạm cho test) — chưa gọi API huỷ, quay lại đúng màn trước đó (Map) thay vì
  // thoát thẳng về Home, để người dùng có thể chỉnh lại và đặt lại nếu muốn.
  const cancelTrip = () => {
    Alert.alert(
      'Hủy chuyến',
      'Bạn có chắc muốn hủy chuyến này?',
      [
        { text: 'Không', style: 'cancel' },
        { text: 'Hủy chuyến', style: 'destructive', onPress: () => navigation.goBack() },
      ],
    );
  };

  const comingSoon = () => showToast('Tính năng đang được phát triển.', { type: 'info' });

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
        {/* paddingBottom lớn đẩy tâm (điểm đón) lên phía trên, tránh bị bottom sheet che khuất. */}
        <Mapbox.Camera
          centerCoordinate={pickupCoord}
          zoomLevel={14}
          padding={{ paddingTop: 0, paddingBottom: 300, paddingLeft: 0, paddingRight: 0 }}
          animationMode="none"
        />
        {/* Vị trí thật của người dùng — chấm tròn xanh + vòng loang (pulsing). */}
        <Mapbox.LocationPuck visible pulsing={{ isEnabled: true, color: '#2563EB' }} />

        {/* Tài xế quanh điểm đón. allowOverlap* để zoom xa các marker chồng nhau không bị
            Mapbox tự ẩn (mặc định false) — nếu không, zoom xa sẽ mất icon tài xế, phải zoom lại. */}
        {drivers.map((d) => (
          <Mapbox.MarkerView key={d.id} id={d.id} coordinate={d.coordinate} allowOverlap allowOverlapWithPuck>
            <View style={s.driverMarker}>
              <MaterialCommunityIcons name={isCar ? 'car' : 'motorbike'} size={15} color="white" />
            </View>
          </Mapbox.MarkerView>
        ))}

        {/* Điểm đón — sóng radar (nền) */}
        <Mapbox.MarkerView id="pickup" coordinate={pickupCoord} allowOverlap allowOverlapWithPuck>
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
          </View>
        </Mapbox.MarkerView>

        {/* Ghim điểm đón — anchor đáy để mũi ghim chỉ đúng toạ độ, đứng trên tâm radar */}
        <Mapbox.MarkerView id="pickupPin" coordinate={pickupCoord} anchor={{ x: 0.5, y: 1 }} allowOverlap allowOverlapWithPuck>
          <Image source={require('../../../../assets/pin.png')} style={s.pickupPin} resizeMode="contain" />
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
          Đã gửi yêu cầu đến tất cả tài xế gần bạn
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
              <Text style={s.timerText}>{remain != null ? fmtTime(remain) : '--:--'}</Text>
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
  pickupPin: { width: 36, height: 36 },

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

  progressRow: { flexDirection: 'row', alignItems: 'center', marginTop: 14 },
  progressBar: { flexDirection: 'row', gap: 6, flex: 1 },
  progressSeg: { flex: 1, height: 5, borderRadius: 3 },

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
