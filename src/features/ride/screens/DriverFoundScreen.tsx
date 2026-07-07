import { useEffect, useMemo, useState } from 'react';
import { Alert, Image, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Mapbox from '@rnmapbox/maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { MAPBOX_PUBLIC_TOKEN } from '../../../constants/config';
import DraggableBottomSheet from '@shared/components/layout/DraggableBottomSheet';
import type { RootScreenProps } from '../../../navigation/types';

// Tài xế giả lập (chưa có API ghép tài xế).
const MOCK_DRIVER = {
  name: 'Trương Văn Khôi',
  rating: 4.8,
  etaMin: 3,
  etaKm: 1.2,
};

// ID chuyến seed ở backend dev — dùng để gọi API đánh giá ở màn kết thúc.
const MOCK_TRIP_ID = '01979000-0000-7000-8000-000000000001';

function fmtVND(n: number) {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export default function DriverFoundScreen({ navigation, route }: RootScreenProps<'DriverFound'>) {
  const insets = useSafeAreaInsets();
  const { serviceType, pickupName, pickupLat, pickupLng, dropoffName, fare, paymentLabel } = route.params;
  const isCar = serviceType === 'car';

  const pickupCoord = useMemo<[number, number]>(() => [pickupLng, pickupLat], [pickupLng, pickupLat]);
  // Tài xế đang ở gần điểm đón (lệch về phía tây nam), tiến về điểm đón.
  const driverCoord = useMemo<[number, number]>(
    () => [pickupLng - 0.011, pickupLat - 0.009],
    [pickupLng, pickupLat],
  );

  const [routeGeometry, setRouteGeometry] = useState<GeoJSON.Geometry | null>(null);

  // Lấy tuyến đường tài xế → điểm đón để vẽ line.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const url =
          `https://api.mapbox.com/directions/v5/mapbox/driving/` +
          `${driverCoord[0]},${driverCoord[1]};${pickupCoord[0]},${pickupCoord[1]}` +
          `?geometries=geojson&overview=full&access_token=${MAPBOX_PUBLIC_TOKEN}`;
        const json = await (await fetch(url)).json();
        const geo = json.routes?.[0]?.geometry;
        if (alive && geo) setRouteGeometry(geo);
      } catch {
        // Không lấy được tuyến → bỏ qua, vẫn hiện marker.
      }
    })();
    return () => { alive = false; };
  }, [driverCoord, pickupCoord]);

  // Giả lập hoàn thành chuyến sau ít giây → sang màn kết thúc + đánh giá.
  // (Sẽ thay bằng sự kiện trạng thái chuyến thật khi có API.)
  useEffect(() => {
    const t = setTimeout(() => {
      navigation.replace('RideComplete', {
        tripId: MOCK_TRIP_ID,
        serviceType,
        pickupName,
        dropoffName,
        fare,
        paymentLabel,
        driverName: MOCK_DRIVER.name,
        driverRating: MOCK_DRIVER.rating,
      });
    }, 6000);
    return () => clearTimeout(t);
  }, [navigation, serviceType, pickupName, dropoffName, fare, paymentLabel]);

  const comingSoon = () => Alert.alert('Sắp ra mắt', 'Tính năng đang được phát triển.');

  const callDriver = () => {
    Linking.openURL('tel:19001234').catch(() => Alert.alert('Không gọi được', 'Vui lòng thử lại sau.'));
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

  const bounds = {
    ne: [Math.max(pickupCoord[0], driverCoord[0]) + 0.006, Math.max(pickupCoord[1], driverCoord[1]) + 0.006] as [number, number],
    sw: [Math.min(pickupCoord[0], driverCoord[0]) - 0.006, Math.min(pickupCoord[1], driverCoord[1]) - 0.006] as [number, number],
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

        {routeGeometry && (
          <>
            <Mapbox.ShapeSource id="routeCasing" shape={{ type: 'Feature', geometry: routeGeometry, properties: {} } as GeoJSON.Feature}>
              <Mapbox.LineLayer id="routeCasingLine" style={{ lineColor: 'white', lineWidth: 10, lineCap: 'round', lineJoin: 'round' }} />
            </Mapbox.ShapeSource>
            <Mapbox.ShapeSource id="routeLine" shape={{ type: 'Feature', geometry: routeGeometry, properties: {} } as GeoJSON.Feature}>
              <Mapbox.LineLayer id="routeMainLine" style={{ lineColor: '#2563EB', lineWidth: 6, lineCap: 'round', lineJoin: 'round' }} />
            </Mapbox.ShapeSource>
          </>
        )}

        {/* Điểm đón + callout tên */}
        <Mapbox.MarkerView id="pickup" coordinate={pickupCoord}>
          <View style={s.pickupWrap}>
            <View style={s.bubble}>
              <Text style={s.bubbleText} numberOfLines={1}>{pickupName}</Text>
            </View>
            <View style={s.bubbleArrow} />
            <View style={s.pickupHalo}>
              <View style={s.pickupDot} />
            </View>
          </View>
        </Mapbox.MarkerView>

        {/* Tài xế + callout ETA */}
        <Mapbox.MarkerView id="driver" coordinate={driverCoord}>
          <View style={s.driverWrap}>
            <View style={s.driverBubble}>
              <Text style={s.driverBubbleTitle}>Tài xế đang đến</Text>
              <Text style={s.driverBubbleSub}>
                Cách bạn <Text style={s.driverBubbleStrong}>{MOCK_DRIVER.etaMin} phút ({MOCK_DRIVER.etaKm} km)</Text>
              </Text>
            </View>
            <View style={s.driverMarker}>
              <MaterialCommunityIcons name={isCar ? 'car' : 'motorbike'} size={20} color="white" />
            </View>
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

      {/* Chia sẻ vị trí — pill nhỏ trên bản đồ để truy cập nhanh */}
      <TouchableOpacity style={[s.sharePill, { top: insets.top + 58 }]} activeOpacity={0.85} onPress={comingSoon}>
        <Ionicons name="navigate-outline" size={13} color="#2563EB" />
        <Text style={s.sharePillText}>Chia sẻ vị trí</Text>
      </TouchableOpacity>

      {/* ── Bottom sheet (kéo thanh "–" để thu gọn) ── */}
      <DraggableBottomSheet style={{ paddingBottom: insets.bottom + 16 }} collapsedVisibleHeight={168}>
        {/* Success banner */}
        <View style={s.successBanner}>
          <View style={s.successCheck}>
            <Ionicons name="checkmark" size={16} color="white" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.successTitle}>Tuyệt vời! Đã tìm được tài xế cho bạn rồi!</Text>
            <Text style={s.successSub}>
              Tài xế sẽ đón bạn trong <Text style={s.successStrong}>{MOCK_DRIVER.etaMin} phút</Text>
            </Text>
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
            <Image source={require('../../../../assets/avatar.jpg')} style={s.avatarImg} />
            <View style={s.ratingBadge}>
              <Ionicons name="star" size={9} color="#f59e0b" />
              <Text style={s.ratingText}>{MOCK_DRIVER.rating.toFixed(1)}</Text>
            </View>
          </View>
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={s.driverName}>{MOCK_DRIVER.name}</Text>
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
  pickupHalo: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(37,99,235,0.15)',
    alignItems: 'center', justifyContent: 'center', marginTop: 2,
  },
  pickupDot: {
    width: 22, height: 22, borderRadius: 11, backgroundColor: '#2563EB', borderWidth: 4, borderColor: 'white',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 6,
  },
  driverWrap: { alignItems: 'center' },
  driverBubble: {
    backgroundColor: 'white', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 9, marginBottom: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.14, shadowRadius: 8, elevation: 5,
  },
  driverBubbleTitle: { fontSize: 13, fontWeight: '600', color: '#111827' },
  driverBubbleSub: { fontSize: 12, color: '#6b7280', marginTop: 1 },
  driverBubbleStrong: { color: '#2563EB', fontWeight: '600' },
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
  safetyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'white', borderRadius: 21, paddingHorizontal: 14, height: 42,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 6, elevation: 5,
  },
  safetyText: { fontSize: 13, fontWeight: '600', color: '#111827' },
  sharePill: {
    position: 'absolute', right: 16,
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'white', borderRadius: 16, paddingHorizontal: 11, height: 32,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 6, elevation: 5,
  },
  sharePillText: { fontSize: 12, fontWeight: '600', color: '#2563EB' },

  successBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#f0fdf4', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: '#dcfce7',
  },
  successCheck: {
    width: 24, height: 24, borderRadius: 12, backgroundColor: '#22c55e',
    alignItems: 'center', justifyContent: 'center',
  },
  successTitle: { fontSize: 13, fontWeight: '600', color: '#111827' },
  successSub: { fontSize: 12, color: '#4b5563', marginTop: 2 },
  successStrong: { color: '#16a34a', fontWeight: '600' },

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
