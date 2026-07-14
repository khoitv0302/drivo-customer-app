import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, Image, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Mapbox from '@rnmapbox/maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { MAPBOX_PUBLIC_TOKEN } from '../../../constants/config';
import DraggableBottomSheet from '@shared/components/layout/DraggableBottomSheet';
import { useTripDetail } from '@shared/hooks/useTripDetail';
import { useTripEtaListener } from '../hooks/useTripEtaListener';
import { usePositionListener } from '../hooks/usePositionListener';
import { useTripStatusListener } from '../hooks/useTripStatusListener';
import { useTrackTrip } from '../hooks/useTrackTrip';
import { useDriverRouteProgress } from '../hooks/useDriverRouteProgress';
import { useToast } from '@shared/components/ui/Toast';
import type { RootScreenProps } from '../../../navigation/types';

const SUPPORT_PHONE = '19001234';

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

type StepState = 'done' | 'active' | 'upcoming';

export default function OnTripScreen({ navigation, route }: RootScreenProps<'OnTrip'>) {
  const insets = useSafeAreaInsets();
  const {
    tripId, serviceType, pickupName, pickupLat, pickupLng, dropoffName, dropoffLat, dropoffLng,
    distanceM: initialDistanceM, durationS: initialDurationS, fare, paymentLabel,
  } = route.params;
  const isCar = serviceType === 'car';

  // Get trip thành công (params.tripId có sẵn) → báo server theo dõi trip này để tính eta.
  useTrackTrip(tripId);
  const driverPosition = usePositionListener(tripId);
  // 'eta' phase dropoff → khoảng cách/thời gian còn lại thật, thay cho ước tính lúc đặt xe.
  const eta = useTripEtaListener(tripId);
  const distanceM = eta && eta.phase === 'dropoff' ? eta.distanceKm * 1000 : initialDistanceM;
  const durationS = eta && eta.phase === 'dropoff' ? eta.etaMinutes * 60 : initialDurationS;

  const { data: trip } = useTripDetail(tripId ?? '');
  const driver = trip?.counterparty;

  // 'trip_status': awaiting_payment → đã đến điểm đến, chờ thanh toán (nấc "Đã đến" active).
  // paid → chuyến đã thanh toán xong, chuyển sang màn hoàn tất.
  const tripStatus = useTripStatusListener(tripId);
  const isAtDropoff = tripStatus?.status === 'awaiting_payment' || tripStatus?.status === 'paid';
  useEffect(() => {
    if (tripStatus?.status === 'paid' && tripId) {
      navigation.replace('RideComplete', {
        tripId,
        serviceType,
        pickupName,
        dropoffName,
        fare,
        paymentLabel,
        driverName: driver?.fullName ?? 'Tài xế',
        driverRating: driver?.rating ?? 0,
      });
    }
  }, [tripStatus, navigation, tripId, serviceType, pickupName, dropoffName, fare, paymentLabel, driver]);

  // Toast "đã đến điểm đến" — hiện thoáng qua ngay lúc chuyển sang isAtDropoff rồi tự ẩn.
  const { showToast } = useToast();
  useEffect(() => {
    if (isAtDropoff) showToast('Bạn đã đến nơi!', { type: 'success', durationMs: 6000 });
  }, [isAtDropoff, showToast]);

  const pickupCoord = useMemo<[number, number]>(() => [pickupLng, pickupLat], [pickupLng, pickupLat]);
  const dropoffCoord = useMemo<[number, number]>(() => [dropoffLng, dropoffLat], [dropoffLng, dropoffLat]);

  const [routeGeometry, setRouteGeometry] = useState<GeoJSON.Geometry | null>(null);
  const routeCoordinates = useMemo<[number, number][] | null>(
    () => (routeGeometry?.type === 'LineString' ? (routeGeometry.coordinates as [number, number][]) : null),
    [routeGeometry],
  );
  // Vị trí tài xế thật từ event 'position', map vào tuyến để cắt bỏ đoạn đã đi qua. null cho
  // tới khi có tin 'position' đầu tiên — lúc đó chưa vẽ marker xe, hiện loading thay vào đó.
  const { vehicleCoord, remainingGeometry } = useDriverRouteProgress(routeCoordinates, driverPosition);
  const displayRouteGeometry = remainingGeometry ?? routeGeometry;

  // Lấy tuyến đường điểm đón → điểm đến để vẽ line.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const url =
          `https://api.mapbox.com/directions/v5/mapbox/driving/` +
          `${pickupCoord[0]},${pickupCoord[1]};${dropoffCoord[0]},${dropoffCoord[1]}` +
          `?geometries=geojson&overview=full&access_token=${MAPBOX_PUBLIC_TOKEN}`;
        const json = await (await fetch(url)).json();
        const geo = json.routes?.[0]?.geometry;
        if (alive && geo) setRouteGeometry(geo);
      } catch {
        // Không lấy được tuyến → vẫn hiện marker tại điểm đón.
      }
    })();
    return () => { alive = false; };
  }, [pickupCoord, dropoffCoord]);

  // Vòng sáng nhấp nháy quanh nấc "Di chuyển" (đang diễn ra) trong stepper.
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(pulse, { toValue: 1, duration: 1500, easing: Easing.out(Easing.ease), useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  // Border chớp chớp trên nấc "Di chuyển" — nhấn mạnh đang ở bước này. Animate borderColor nên
  // không dùng được native driver.
  const borderBlink = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(borderBlink, { toValue: 1, duration: 500, useNativeDriver: false }),
        Animated.timing(borderBlink, { toValue: 0, duration: 500, useNativeDriver: false }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [borderBlink]);

  const comingSoon = () => showToast('Tính năng đang được phát triển.', { type: 'info' });

  const callDriver = () => {
    const phone = driver?.phone ?? SUPPORT_PHONE;
    Linking.openURL(`tel:${phone}`).catch(() => showToast('Không gọi được, vui lòng thử lại sau.', { type: 'error' }));
  };

  const shareTrip = () => showToast('Tính năng chia sẻ hành trình đang được phát triển.', { type: 'info' });

  const bounds = {
    ne: [Math.max(pickupCoord[0], dropoffCoord[0]) + 0.006, Math.max(pickupCoord[1], dropoffCoord[1]) + 0.006] as [number, number],
    sw: [Math.min(pickupCoord[0], dropoffCoord[0]) - 0.006, Math.min(pickupCoord[1], dropoffCoord[1]) - 0.006] as [number, number],
    paddingTop: 140, paddingBottom: 400, paddingLeft: 50, paddingRight: 50,
  };

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
        <Mapbox.Camera bounds={bounds} animationMode="easeTo" animationDuration={800} />

        {displayRouteGeometry && (
          <>
            <Mapbox.ShapeSource id="tripRouteCasing" shape={{ type: 'Feature', geometry: displayRouteGeometry, properties: {} } as GeoJSON.Feature}>
              <Mapbox.LineLayer id="tripRouteCasingLine" style={{ lineColor: 'white', lineWidth: 10, lineCap: 'round', lineJoin: 'round' }} />
            </Mapbox.ShapeSource>
            <Mapbox.ShapeSource id="tripRouteLine" shape={{ type: 'Feature', geometry: displayRouteGeometry, properties: {} } as GeoJSON.Feature}>
              <Mapbox.LineLayer id="tripRouteMainLine" style={{ lineColor: '#2563EB', lineWidth: 6, lineCap: 'round', lineJoin: 'round' }} />
            </Mapbox.ShapeSource>
          </>
        )}

        {/* Điểm đón — mờ hơn, đã đi qua */}
        <Mapbox.MarkerView id="pickup" coordinate={pickupCoord}>
          <View style={s.pickupPassedDot} />
        </Mapbox.MarkerView>

        {/* Xe đang di chuyển trên tuyến — chỉ hiện khi đã có vị trí GPS thật từ event 'position' */}
        {vehicleCoord && (
          <Mapbox.MarkerView id="vehicle" coordinate={vehicleCoord}>
            <View style={s.vehicleMarker}>
              <MaterialCommunityIcons name={isCar ? 'car' : 'motorbike'} size={18} color="white" />
            </View>
          </Mapbox.MarkerView>
        )}

        {/* Điểm đến + callout tên */}
        <Mapbox.MarkerView id="dropoff" coordinate={dropoffCoord}>
          <View style={s.dropoffWrap}>
            <View style={s.bubble}>
              <Text style={s.bubbleText} numberOfLines={1}>{dropoffName}</Text>
            </View>
            <View style={s.bubbleArrow} />
            <View style={s.dropoffPin}>
              <Ionicons name="location" size={22} color="white" />
            </View>
          </View>
        </Mapbox.MarkerView>
      </Mapbox.MapView>

      {/* ── Top buttons ── */}
      <View style={[s.topRow, { top: insets.top + 8 }]}>
        <TouchableOpacity style={s.circleBtn} activeOpacity={0.85} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color="#111827" />
        </TouchableOpacity>
      </View>

      {/* ── Floating callout — ẩn khi đã tới nơi vì ETA không còn ý nghĩa ── */}
      {!isAtDropoff && (
        <View style={[s.callout, { top: insets.top + 60 }]} pointerEvents="none">
          <Text style={s.calloutTitle}>Đang trên đường đến điểm đến</Text>
          <Text style={s.calloutSub}>
            Dự kiến còn <Text style={s.calloutStrong}>{fmtDur(durationS)}</Text> · {fmtDist(distanceM)}
          </Text>
        </View>
      )}

      {/* ── Loading — chưa có tin 'position' đầu tiên của tài xế. Đặt ở vùng map trên cùng,
          không đặt giữa màn hình vì DraggableBottomSheet (mở full) sẽ che mất. ── */}
      {!vehicleCoord && (
        <View style={[s.positionLoading, { top: insets.top + (isAtDropoff ? 122 : 116) }]} pointerEvents="none">
          <ActivityIndicator size="small" color="#2563EB" />
          <Text style={s.positionLoadingText}>Đang lấy vị trí tài xế…</Text>
        </View>
      )}

      {/* ── Bottom sheet (kéo thanh "–" để thu gọn) ── */}
      <DraggableBottomSheet style={{ paddingBottom: insets.bottom + 16 }} collapsedVisibleHeight={120}>
        {/* Header */}
        <View style={s.headerRow}>
          <View style={s.headerIcon}>
            <Ionicons name="navigate" size={16} color="#2563EB" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.title}>Đang trong chuyến đi</Text>
            <Text style={s.subtitle}>
              Còn khoảng <Text style={s.subtitleStrong}>{fmtDist(distanceM)}</Text> · {fmtDur(durationS)} nữa
            </Text>
          </View>
        </View>

        {/* Stepper: Đón khách → Di chuyển → Đã đến */}
        <View style={s.stepperRow}>
          <StepDot label="Đón khách" state="done" />
          <View style={[s.stepLine, s.stepLineFilled]} />
          <StepDot
            label="Di chuyển"
            state={isAtDropoff ? 'done' : 'active'}
            pulse={isAtDropoff ? undefined : pulse}
            blink={isAtDropoff ? undefined : borderBlink}
          />
          <View style={[s.stepLine, isAtDropoff && s.stepLineFilled]} />
          <StepDot
            label="Đã đến"
            state={isAtDropoff ? 'active' : 'upcoming'}
            pulse={isAtDropoff ? pulse : undefined}
            blink={isAtDropoff ? borderBlink : undefined}
          />
        </View>

        <View style={s.divider} />

        {/* Driver row */}
        <View style={s.driverRow}>
          <View style={s.avatar}>
            <Image
              source={driver?.avatarUrl ? { uri: driver.avatarUrl } : require('../../../../assets/avatar.jpg')}
              style={s.avatarImg}
            />
            <View style={s.ratingBadge}>
              <Ionicons name="star" size={9} color="#f59e0b" />
              <Text style={s.ratingText}>{driver?.rating != null ? driver.rating.toFixed(1) : '—'}</Text>
            </View>
          </View>
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={s.driverName}>{driver?.fullName ?? 'Đang tải…'}</Text>
            <View style={s.driverBadge}>
              <MaterialCommunityIcons name={isCar ? 'car' : 'motorbike'} size={12} color="#2563EB" />
              <Text style={s.driverBadgeText}>{isCar ? 'Tài xế ô tô' : 'Tài xế xe máy'}</Text>
            </View>
          </View>
          <TouchableOpacity style={s.callBtn} activeOpacity={0.8} onPress={callDriver}>
            <Ionicons name="call" size={20} color="#2563EB" />
          </TouchableOpacity>
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

        {/* Thanh toán + tổng tiền */}
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

        {/* Chia sẻ hành trình — không cho hủy giữa chuyến */}
        <TouchableOpacity style={s.shareBtn} activeOpacity={0.85} onPress={shareTrip}>
          <Ionicons name="share-social-outline" size={16} color="#2563EB" />
          <Text style={s.shareText}>Chia sẻ hành trình</Text>
        </TouchableOpacity>
      </DraggableBottomSheet>
    </View>
  );
}

// Một nấc trong stepper hành trình — done: đã qua (check xanh), active: đang diễn ra
// (chấm xanh + vòng sáng nhấp nháy), upcoming: chưa tới (viền xám).
function StepDot({
  label,
  state,
  pulse,
  blink,
}: {
  label: string;
  state: StepState;
  pulse?: Animated.Value;
  blink?: Animated.Value;
}) {
  const isDone = state === 'done';
  const isActive = state === 'active';
  return (
    <View style={s.stepDotWrap}>
      <View style={s.stepCircleSlot}>
        {isActive && pulse && (
          <Animated.View
            style={[
              s.stepPulseRing,
              {
                opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0] }),
                transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.9] }) }],
              },
            ]}
          />
        )}
        <Animated.View
          style={[
            s.stepCircle,
            isDone && s.stepCircleDone,
            isActive && s.stepCircleActive,
            isActive && blink
              ? { borderColor: blink.interpolate({ inputRange: [0, 1], outputRange: ['#2563EB', '#bfdbfe'] }) }
              : null,
          ]}
        >
          {isDone ? (
            <Ionicons name="checkmark" size={12} color="white" />
          ) : (
            <View style={[s.stepInnerDot, isActive && s.stepInnerDotActive]} />
          )}
        </Animated.View>
      </View>
      <Text style={[s.stepLabel, (isDone || isActive) && s.stepLabelActive]}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  // Map markers
  pickupPassedDot: {
    width: 14, height: 14, borderRadius: 7, backgroundColor: '#9ca3af', borderWidth: 3, borderColor: 'white',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 2, elevation: 3,
  },
  vehicleMarker: {
    width: 34, height: 34, borderRadius: 17, backgroundColor: '#2563EB',
    alignItems: 'center', justifyContent: 'center', borderWidth: 2.5, borderColor: 'white',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5,
  },
  dropoffWrap: { alignItems: 'center' },
  bubble: {
    backgroundColor: 'white', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 7, maxWidth: 200,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.14, shadowRadius: 6, elevation: 5,
  },
  bubbleText: { fontSize: 13, fontWeight: '600', color: '#111827' },
  bubbleArrow: {
    width: 10, height: 10, backgroundColor: 'white', transform: [{ rotate: '45deg' }], marginTop: -5,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3,
  },
  dropoffPin: {
    width: 42, height: 42, borderRadius: 21, backgroundColor: '#EF4444', borderWidth: 4, borderColor: 'white',
    alignItems: 'center', justifyContent: 'center', marginTop: 2,
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

  // Callout
  callout: {
    position: 'absolute', alignSelf: 'center', backgroundColor: 'white',
    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 9, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.14, shadowRadius: 10, elevation: 6,
  },
  calloutTitle: { fontSize: 13, fontWeight: '600', color: '#111827' },
  calloutSub: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  calloutStrong: { color: '#2563EB', fontWeight: '600' },

  positionLoading: {
    position: 'absolute', alignSelf: 'center',
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'white', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 6, elevation: 5,
  },
  positionLoadingText: { fontSize: 13, fontWeight: '600', color: '#111827' },

  headerRow: { flexDirection: 'row', alignItems: 'center' },
  headerIcon: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: '#eff6ff',
    alignItems: 'center', justifyContent: 'center', marginRight: 11,
  },
  title: { fontSize: 15, fontWeight: '700', color: '#111827' },
  subtitle: { fontSize: 12, color: '#6b7280', marginTop: 2, lineHeight: 16 },
  subtitleStrong: { color: '#111827', fontWeight: '600' },

  // Stepper
  stepperRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 18, paddingHorizontal: 4 },
  stepDotWrap: { alignItems: 'center', width: 64 },
  stepCircleSlot: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  stepPulseRing: {
    position: 'absolute', width: 24, height: 24, borderRadius: 12,
    backgroundColor: 'rgba(37,99,235,0.35)',
  },
  stepCircle: {
    width: 22, height: 22, borderRadius: 11, backgroundColor: 'white',
    borderWidth: 2, borderColor: '#e5e7eb', alignItems: 'center', justifyContent: 'center',
  },
  stepCircleDone: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  stepCircleActive: { borderColor: '#2563EB' },
  stepInnerDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#e5e7eb' },
  stepInnerDotActive: { backgroundColor: '#2563EB' },
  stepLabel: { fontSize: 11, color: '#9ca3af', marginTop: 6, textAlign: 'center' },
  stepLabelActive: { color: '#111827', fontWeight: '600' },
  stepLine: { flex: 1, height: 2, backgroundColor: '#e5e7eb', marginTop: 11, marginHorizontal: -8 },
  stepLineFilled: { backgroundColor: '#2563EB' },

  divider: { height: 1, backgroundColor: '#f3f4f6', marginVertical: 12 },

  driverRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
  avatarImg: { width: 50, height: 50, borderRadius: 25 },
  ratingBadge: {
    position: 'absolute', bottom: -4, alignSelf: 'center',
    flexDirection: 'row', alignItems: 'center', gap: 2,
    backgroundColor: 'white', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.15, shadowRadius: 3, elevation: 3,
  },
  ratingText: { fontSize: 11, fontWeight: '700', color: '#111827' },
  driverName: { fontSize: 15, fontWeight: '700', color: '#111827' },
  driverBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start',
    backgroundColor: '#eff6ff', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, marginTop: 4,
  },
  driverBadgeText: { fontSize: 12, fontWeight: '600', color: '#2563EB' },
  callBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#eff6ff',
    alignItems: 'center', justifyContent: 'center', marginLeft: 8,
  },

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

  shareBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginTop: 14, borderRadius: 13, paddingVertical: 13,
    backgroundColor: '#eff6ff',
  },
  shareText: { fontSize: 14, fontWeight: '600', color: '#2563EB' },
});
