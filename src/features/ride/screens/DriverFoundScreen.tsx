import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Image, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Mapbox from '@rnmapbox/maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { MAPBOX_PUBLIC_TOKEN } from '../../../constants/config';
import DraggableBottomSheet from '@shared/components/layout/DraggableBottomSheet';
import { useTripDetail } from '@shared/hooks/useTripDetail';
import { usePickupListener } from '../hooks/usePickupListener';
import { useTripEtaListener } from '../hooks/useTripEtaListener';
import { usePositionListener } from '../hooks/usePositionListener';
import { useTripStatusListener } from '../hooks/useTripStatusListener';
import { useTrackTrip } from '../hooks/useTrackTrip';
import { useDriverRouteProgress, haversineMeters } from '../hooks/useDriverRouteProgress';
import { useToast } from '@shared/components/ui/Toast';
import type { RootScreenProps } from '../../../navigation/types';

const SUPPORT_PHONE = '19001234';

function fmtVND(n: number) {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}
function fmtDist(m: number) {
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`;
}

export default function DriverFoundScreen({ navigation, route }: RootScreenProps<'DriverFound'>) {
  const insets = useSafeAreaInsets();
  const { tripId, serviceType, pickupName, pickupLat, pickupLng, dropoffName, fare, paymentLabel } = route.params;
  const isCar = serviceType === 'car';

  // Thử nghe event 'pickup' — chỉ log để dò payload thật, chưa dùng để điều hướng/cập nhật UI.
  usePickupListener();
  const driverPosition = usePositionListener(tripId);
  const eta = useTripEtaListener(tripId);
  const pickupEta = eta && eta.phase === 'pickup' ? eta : null;

  // 'trip_status' → 'in_progress' nghĩa là đã đón khách xong, chuyển sang màn "đang đi".
  const tripStatus = useTripStatusListener(tripId);
  useEffect(() => {
    if (tripStatus?.status === 'in_progress') {
      navigation.replace('OnTrip', route.params);
    }
  }, [tripStatus, navigation, route.params]);

  const { data: trip } = useTripDetail(tripId);
  // Get trip thành công → báo server theo dõi trip này để tính eta.
  useTrackTrip(trip?.tripId);
  const driver = trip?.counterparty;

  // Số phút hiển thị ở banner "Tài xế sẽ đón bạn trong …": ưu tiên tin 'eta' realtime từ
  // CustomerHub (mới nhất, ~45s/lần); trước khi có tin đầu tiên thì dùng liveEta kèm sẵn trong
  // trip detail để hiện ngay, khỏi phải chờ. liveEta.etaSeconds tính theo giây → đổi ra phút.
  const pickupEtaMinutes = useMemo<number | null>(() => {
    if (pickupEta) return pickupEta.etaMinutes;
    const live = trip?.liveEta;
    if (live && live.phase === 'pickup') return Math.max(1, Math.round(live.etaSeconds / 60));
    return null;
  }, [pickupEta, trip?.liveEta]);
  // Số km hiển thị cạnh ETA: cùng nguồn ưu tiên như trên (tin 'eta' realtime trước, liveEta
  // ban đầu sau) — không tự tính lại từ Directions API để khớp đúng số backend đã tính ETA.
  const pickupEtaDistanceM = useMemo<number | null>(() => {
    if (pickupEta) return pickupEta.distanceKm * 1000;
    const live = trip?.liveEta;
    if (live && live.phase === 'pickup') return live.distanceMeters;
    return null;
  }, [pickupEta, trip?.liveEta]);
  // FE card money = netFareAmount ?? fareAmount ?? quotedFareAmount — fallback về cước
  // tạm tính ở màn trước nếu chuyến chưa fetch xong.
  const totalFare = trip ? trip.netFareAmount ?? trip.fareAmount ?? trip.quotedFareAmount ?? fare : fare;

  // Toast "đã tìm được tài xế" — hiện thoáng qua lúc vào màn rồi tự ẩn.
  const { showToast } = useToast();
  useEffect(() => {
    showToast('Tuyệt vời! Đã tìm được tài xế cho bạn rồi!', { type: 'success', durationMs: 6000 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pickupCoord = useMemo<[number, number]>(() => [pickupLng, pickupLat], [pickupLng, pickupLat]);

  // Vị trí GPS thật của tài xế — chỉ dùng tin 'position' để xác định gốc vẽ tuyến đường (kết
  // hợp cùng 'eta' để hiện thời gian, xem etaMin bên trên). Chưa có tin 'position' nào thì
  // chưa vẽ route/marker tài xế — không dùng điểm giả định để tránh vẽ sai rồi phải sửa lại.
  // Route chỉ vẽ lại khi tài xế đã đi đủ xa (>150m) hoặc đã lâu (>20s) kể từ lần vẽ trước —
  // tránh gọi Directions API liên tục theo mỗi nhịp heartbeat vị trí.
  const [routeOrigin, setRouteOrigin] = useState<[number, number] | null>(null);
  const lastRouteOriginRef = useRef<{ coord: [number, number]; ts: number } | null>(null);
  useEffect(() => {
    if (!driverPosition) return;
    const coord: [number, number] = [driverPosition.lng, driverPosition.lat];
    const prev = lastRouteOriginRef.current;
    const now = Date.now();
    const dueForRefresh = !prev || now - prev.ts > 20000 || haversineMeters(prev.coord, coord) > 150;
    if (dueForRefresh) {
      lastRouteOriginRef.current = { coord, ts: now };
      setRouteOrigin(coord);
    }
  }, [driverPosition]);

  const [routeGeometry, setRouteGeometry] = useState<GeoJSON.Geometry | null>(null);
  const routeCoordinates = useMemo<[number, number][] | null>(
    () => (routeGeometry?.type === 'LineString' ? (routeGeometry.coordinates as [number, number][]) : null),
    [routeGeometry],
  );
  // Vị trí tài xế thật từ event 'position', map vào tuyến để cắt bỏ đoạn đã đi qua. null cho
  // tới khi có tin 'position' đầu tiên — DriverFoundScreen chỉ vẽ marker/route khi có giá trị.
  const { vehicleCoord: displayDriverCoord, remainingGeometry } = useDriverRouteProgress(routeCoordinates, driverPosition);
  const displayRouteGeometry = remainingGeometry ?? routeGeometry;

  // Lấy tuyến đường tài xế (vị trí GPS thật) → điểm đón để vẽ line — chỉ gọi khi đã có gốc thật.
  useEffect(() => {
    if (!routeOrigin) return;
    let alive = true;
    (async () => {
      try {
        const url =
          `https://api.mapbox.com/directions/v5/mapbox/driving/` +
          `${routeOrigin[0]},${routeOrigin[1]};${pickupCoord[0]},${pickupCoord[1]}` +
          `?geometries=geojson&overview=full&access_token=${MAPBOX_PUBLIC_TOKEN}`;
        const json = await (await fetch(url)).json();
        const geo = json.routes?.[0]?.geometry;
        if (alive && geo) setRouteGeometry(geo);
      } catch {
        // Không lấy được tuyến → bỏ qua, vẫn hiện marker.
      }
    })();
    return () => { alive = false; };
  }, [routeOrigin, pickupCoord]);

  // Dừng ở màn này — chưa tự động sang màn kết thúc. Sẽ chuyển màn khi có sự kiện
  // trạng thái chuyến thật (vd hoàn thành) từ CustomerHub.

  const comingSoon = () => showToast('Tính năng đang được phát triển.', { type: 'info' });

  const callDriver = () => {
    const phone = driver?.phone ?? SUPPORT_PHONE;
    Linking.openURL(`tel:${phone}`).catch(() => showToast('Không gọi được, vui lòng thử lại sau.', { type: 'error' }));
  };

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

  // Đệm quanh khung nhìn (đơn vị độ). Tài xế còn xa → đệm lớn để thấy cả hai điểm; tài xế đã
  // gần điểm đón → đệm co lại để camera TỰ ZOOM VÀO, nhìn rõ tài xế áp sát — thay vì luôn giữ
  // đệm cố định 0.006° (~650m) khiến lúc gần vẫn bị xa. Chặn [150m, 700m] để không zoom quá
  // sát khi tài xế chồng lên điểm đón, cũng không nới quá rộng khi ở xa. 111320 = mét/độ vĩ độ.
  const buffer = displayDriverCoord
    ? Math.min(700, Math.max(150, haversineMeters(pickupCoord, displayDriverCoord) * 0.6)) / 111320
    : 0.006;

  // Chưa có vị trí tài xế thật thì chỉ căn giữa điểm đón — tránh fit theo toạ độ giả định.
  const bounds = displayDriverCoord
    ? {
        ne: [Math.max(pickupCoord[0], displayDriverCoord[0]) + buffer, Math.max(pickupCoord[1], displayDriverCoord[1]) + buffer] as [number, number],
        sw: [Math.min(pickupCoord[0], displayDriverCoord[0]) - buffer, Math.min(pickupCoord[1], displayDriverCoord[1]) - buffer] as [number, number],
        paddingTop: 140, paddingBottom: 380, paddingLeft: 50, paddingRight: 50,
      }
    : {
        ne: [pickupCoord[0] + buffer, pickupCoord[1] + buffer] as [number, number],
        sw: [pickupCoord[0] - buffer, pickupCoord[1] - buffer] as [number, number],
        paddingTop: 140, paddingBottom: 380, paddingLeft: 50, paddingRight: 50,
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
        {/* Vị trí thật của người dùng — chấm tròn kèm vòng loang (pulsing) quanh, như các màn khác. */}
        <Mapbox.LocationPuck visible pulsing={{ isEnabled: true, color: '#2563EB' }} />

        {displayRouteGeometry && (
          <>
            <Mapbox.ShapeSource id="routeCasing" shape={{ type: 'Feature', geometry: displayRouteGeometry, properties: {} } as GeoJSON.Feature}>
              <Mapbox.LineLayer id="routeCasingLine" style={{ lineColor: 'white', lineWidth: 10, lineCap: 'round', lineJoin: 'round' }} />
            </Mapbox.ShapeSource>
            <Mapbox.ShapeSource id="routeLine" shape={{ type: 'Feature', geometry: displayRouteGeometry, properties: {} } as GeoJSON.Feature}>
              <Mapbox.LineLayer id="routeMainLine" style={{ lineColor: '#2563EB', lineWidth: 6, lineCap: 'round', lineJoin: 'round' }} />
            </Mapbox.ShapeSource>
          </>
        )}

        {/* Điểm đón + callout tên. anchor đáy để mũi ghim chỉ đúng toạ độ, bubble nổi phía trên;
            allowOverlap* để zoom xa marker không bị Mapbox tự ẩn. */}
        <Mapbox.MarkerView id="pickup" coordinate={pickupCoord} anchor={{ x: 0.5, y: 1 }} allowOverlap allowOverlapWithPuck>
          <View style={s.pickupWrap}>
            <View style={s.bubble}>
              <Text style={s.bubbleText} numberOfLines={1}>{pickupName}</Text>
            </View>
            <View style={s.bubbleArrow} />
            <Image source={require('../../../../assets/pin.png')} style={s.pickupPin} resizeMode="contain" />
          </View>
        </Mapbox.MarkerView>

        {/* Tài xế — chỉ hiện khi đã có vị trí GPS thật từ event 'position' */}
        {displayDriverCoord && (
          <Mapbox.MarkerView id="driver" coordinate={displayDriverCoord} anchor={{ x: 0.5, y: 0.5 }} allowOverlap allowOverlapWithPuck>
            <View style={s.driverMarker}>
              <MaterialCommunityIcons name={isCar ? 'car' : 'motorbike'} size={20} color="white" />
            </View>
          </Mapbox.MarkerView>
        )}
      </Mapbox.MapView>

      {/* ── Top buttons ── */}
      <View style={[s.topRow, { top: insets.top + 8 }]}>
        <TouchableOpacity style={s.circleBtn} activeOpacity={0.85} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color="#111827" />
        </TouchableOpacity>
      </View>

      {/* ── Loading — chưa có tin 'position' đầu tiên của tài xế. Chỉ hiện khi CHƯA có cả
          toạ độ tài xế lẫn ETA: một khi liveEta/eta đã cho biết tài xế sắp tới (banner hiện
          "… X phút") thì không cần loading nữa, marker sẽ tự xuất hiện khi có tin 'position'.
          Đặt ở vùng map trên cùng, không đặt giữa vì DraggableBottomSheet (mở full) sẽ che. ── */}
      {!displayDriverCoord && pickupEtaMinutes == null && (
        <View style={[s.positionLoading, { top: insets.top + 122 }]} pointerEvents="none">
          <ActivityIndicator size="small" color="#2563EB" />
          <Text style={s.positionLoadingText}>Đang lấy vị trí tài xế…</Text>
        </View>
      )}

      {/* ── Bottom sheet (kéo thanh "–" để thu gọn) ── */}
      <DraggableBottomSheet style={{ paddingBottom: insets.bottom + 4 }} collapsedVisibleHeight={168}>
        {/* Success banner */}
        <View style={s.successBanner}>
          <View style={s.successCheck}>
            <Ionicons name="checkmark" size={16} color="white" />
          </View>
          <View style={{ flex: 1 }}>
            {pickupEtaMinutes != null ? (
              <Text style={s.successSub}>
                Tài xế sẽ đón bạn trong <Text style={s.etaStrong}>{pickupEtaMinutes} phút</Text>
              </Text>
            ) : (
              <Text style={s.successSub}>Tài xế đang đến đón bạn</Text>
            )}
            {pickupEtaDistanceM != null && (
              <View style={s.distanceBadge}>
                <Ionicons name="navigate" size={11} color="#2563EB" />
                <Text style={s.distanceBadgeText}>Cách {fmtDist(pickupEtaDistanceM)}</Text>
              </View>
            )}
          </View>
          <Image
            source={isCar
              ? require('../../../../assets/services/sedan.png')
              : require('../../../../assets/services/scooter.png')}
            style={{ width: 56, height: 40 }}
            resizeMode="contain"
          />
        </View>

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
        <TouchableOpacity style={s.routeRow} activeOpacity={0.7} onPress={comingSoon}>
          <View style={s.routeDots}>
            <View style={s.dotBlue} />
            <View style={s.routeLineDots} />
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
          <Ionicons name="chevron-forward" size={18} color="#d1d5db" />
        </TouchableOpacity>

        <View style={s.divider} />

        {/* Thanh toán + tổng tiền — chung 1 dòng */}
        <TouchableOpacity style={s.payTotalRow} activeOpacity={0.7} onPress={comingSoon}>
          <View style={s.payLeft}>
            <View style={s.payIcon}>
              <Image source={require('../../../../assets/map-screen/money.png')} style={{ width: 18, height: 18 }} resizeMode="contain" />
            </View>
            <Text style={s.payText}>{paymentLabel}</Text>
          </View>
          <Text style={s.totalValue}>{fmtVND(totalFare)}đ</Text>
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
  pickupWrap: { alignItems: 'center' },
  bubble: {
    backgroundColor: 'white', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 7, maxWidth: 200,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.14, shadowRadius: 6, elevation: 5,
  },
  bubbleText: { fontSize: 13, fontWeight: '600', color: '#111827' },
  bubbleArrow: {
    width: 10, height: 10, backgroundColor: 'white', transform: [{ rotate: '45deg' }], marginTop: -5,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3,
  },
  pickupPin: { width: 36, height: 36, marginTop: 2 },
  driverMarker: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#2563EB',
    alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: 'white',
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

  successBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#f0fdf4', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: '#dcfce7',
  },
  successCheck: {
    width: 24, height: 24, borderRadius: 12, backgroundColor: '#22c55e',
    alignItems: 'center', justifyContent: 'center',
  },
  successSub: { fontSize: 12, color: '#4b5563' },
  etaStrong: { fontSize: 13, fontWeight: '800', color: '#111827' },
  distanceBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start',
    backgroundColor: '#dbeafe', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, marginTop: 6,
  },
  distanceBadgeText: { fontSize: 11, fontWeight: '700', color: '#2563EB' },

  positionLoading: {
    position: 'absolute', alignSelf: 'center',
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'white', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 6, elevation: 5,
  },
  positionLoadingText: { fontSize: 13, fontWeight: '600', color: '#111827' },

  driverRow: { flexDirection: 'row', alignItems: 'center', marginTop: 14 },
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

  routeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 12 },
  routeDots: { alignItems: 'center', width: 12, paddingTop: 4 },
  dotBlue: { width: 11, height: 11, borderRadius: 6, backgroundColor: '#2563EB' },
  dotRed: { width: 11, height: 11, borderRadius: 6, backgroundColor: '#EF4444' },
  routeLineDots: { width: 2, flex: 1, minHeight: 22, backgroundColor: '#e5e7eb', marginVertical: 3 },
  routeLabel: { fontSize: 11, color: '#9ca3af' },
  routeValue: { fontSize: 14, fontWeight: '600', color: '#111827', marginTop: 2 },

  divider: { height: 1, backgroundColor: '#f3f4f6', marginVertical: 12 },

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
