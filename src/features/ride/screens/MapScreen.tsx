import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, Image, Modal, ScrollView, StyleSheet, Switch, Text, TextInput,
  TouchableOpacity, TouchableWithoutFeedback, View,
} from 'react-native';
import Mapbox, { locationManager } from '@rnmapbox/maps';
import type { Location } from '@rnmapbox/maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { MAPBOX_PUBLIC_TOKEN } from '../../../constants/config';
import type { RootScreenProps, ServiceType } from '../../../navigation/types';
import type { Voucher } from '../../../types/models';
import type { ApiError } from '../../../services/api/types';
import { useVouchers } from '../api/useVouchers';
import { useBookingEstimate } from '../api/useBookingEstimate';
import { useCreateBooking } from '../api/useCreateBooking';
import { VEHICLE_TYPE_BY_SERVICE } from '../types';

const HCM_FALLBACK: [number, number] = [106.660172, 10.762622];
const DRIVO_XU_BALANCE = 540;
const MOCK_DISTANCE_M = 8500;
const MOCK_DURATION_S = 1200;

// ─── Payment ────────────────────────────────────────────────────────────────

type PaymentId = 'drivo_wallet' | 'momo' | 'zalopay' | 'cash' | 'visa';

interface PaymentItem {
  id: PaymentId;
  label: string;
  sub?: string;
  iconType: 'text' | 'icon' | 'image';
  iconBg: string;
  iconColor?: string;
  iconText?: string;
  iconName?: string;
  iconImage?: ReturnType<typeof require>;
  /** Ảnh icon nhỏ nằm trên nền iconBg (contain), thay vì phủ kín (cover) như logo */
  iconContain?: boolean;
}

const PAYMENT_GROUPS: { title: string; items: PaymentItem[] }[] = [
  {
    title: 'Ví điện tử',
    items: [
      { id: 'drivo_wallet', label: 'Ví Drivo', sub: '250.000đ', iconType: 'text', iconBg: '#2563EB', iconText: 'D' },
      { id: 'momo', label: 'MoMo **8834', iconType: 'image', iconBg: '#AE2070', iconImage: require('../../../../assets/momo.png') },
      { id: 'zalopay', label: 'ZaloPay **1234', iconType: 'text', iconBg: '#0369a1', iconText: 'Z' },
    ],
  },
  {
    title: 'Tiền mặt & Thẻ',
    items: [
      { id: 'cash', label: 'Tiền mặt', iconType: 'image', iconBg: '#f0fdf4', iconContain: true, iconImage: require('../../../../assets/map-screen/money.png') },
      { id: 'visa', label: 'Visa **6378', iconType: 'icon', iconBg: '#eff6ff', iconColor: '#2563EB', iconName: 'card-outline' },
    ],
  },
];

const ADD_PAYMENT_OPTIONS = [
  { id: 'add_card', label: 'Thẻ quốc tế', iconName: 'card-outline', iconBg: '#f3f4f6', iconColor: '#374151' },
  { id: 'add_shopee', label: 'ShopeePay', iconName: 'storefront-outline', iconBg: '#fef2f2', iconColor: '#ef4444' },
];

function getPaymentItem(id: PaymentId): PaymentItem {
  for (const g of PAYMENT_GROUPS) {
    const found = g.items.find(i => i.id === id);
    if (found) return found;
  }
  return PAYMENT_GROUPS[1].items[0];
}

// ─── Discount offers ─────────────────────────────────────────────────────────

// Voucher có dùng được cho mức cước hiện tại không (còn hiệu lực + đạt cước tối thiểu).
function isVoucherUsable(v: Voucher, fare: number): boolean {
  return v.state === 'available' && fare >= v.minFareAmount;
}

// Số tiền giảm của 1 voucher với mức cước `fare`.
function voucherSaving(v: Voucher, fare: number): number {
  if (!isVoucherUsable(v, fare)) return 0;
  let sv = v.discountType === 'fixed' ? v.discountValue : (fare * v.discountValue) / 100;
  if (v.maxDiscountAmount != null) sv = Math.min(sv, v.maxDiscountAmount);
  return sv;
}

// ─── Drivers ─────────────────────────────────────────────────────────────────

const DRIVER_OFFSETS: [number, number][] = [
  [0.003, 0.002], [-0.002, 0.0035], [0.0042, -0.0028],
  [-0.0033, -0.0021], [0.0015, -0.0044], [-0.001, 0.0048],
];

interface MockDriver { id: string; coordinate: [number, number] }
function genDrivers(c: [number, number]): MockDriver[] {
  return DRIVER_OFFSETS.map(([dLng, dLat], i) => ({ id: `d${i}`, coordinate: [c[0] + dLng, c[1] + dLat] }));
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDist(m: number) { return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`; }
function fmtDur(s: number) {
  const m = Math.round(s / 60);
  if (m < 60) return `${m} phút`;
  const h = Math.floor(m / 60); const mm = m % 60;
  return mm > 0 ? `${h} giờ ${mm} phút` : `${h} giờ`;
}
function calcPrice(m: number, type: ServiceType) {
  const km = m / 1000;
  return Math.round((type === 'motorbike' ? 15000 + km * 8000 : 20000 + km * 12000) / 1000) * 1000;
}
function fmtVND(n: number) { return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }

// ─── PaymentIcon ─────────────────────────────────────────────────────────────

function PaymentIcon({ item, size }: { item: PaymentItem; size: number }) {
  const radius = size / 4;
  if (item.iconType === 'image') {
    if (item.iconContain) {
      return (
        <View style={{ width: size, height: size, borderRadius: radius, backgroundColor: item.iconBg, alignItems: 'center', justifyContent: 'center' }}>
          <Image source={item.iconImage} style={{ width: size * 0.66, height: size * 0.66 }} resizeMode="contain" />
        </View>
      );
    }
    return (
      <Image source={item.iconImage} style={{ width: size, height: size, borderRadius: radius }} resizeMode="cover" />
    );
  }
  if (item.iconType === 'text') {
    return (
      <View style={{ width: size, height: size, borderRadius: radius, backgroundColor: item.iconBg, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: 'white', fontSize: size * 0.34, fontWeight: '800' }}>{item.iconText}</Text>
      </View>
    );
  }
  return (
    <View style={{ width: size, height: size, borderRadius: radius, backgroundColor: item.iconBg, alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name={item.iconName as any} size={size * 0.52} color={item.iconColor} />
    </View>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function MapScreen({ navigation, route }: RootScreenProps<'Map'>) {
  const { serviceType, origin, destination } = route.params;
  const insets = useSafeAreaInsets();

  const [userCoords, setUserCoords] = useState<[number, number]>(HCM_FALLBACK);
  const [mockDrivers, setMockDrivers] = useState<MockDriver[]>(genDrivers(HCM_FALLBACK));
  const locationSet = useRef(false);
  const userCoordsRef = useRef<[number, number]>(HCM_FALLBACK);
  const originRef = useRef(origin);
  const destinationRef = useRef(destination);
  originRef.current = origin;
  destinationRef.current = destination;

  const [routeGeometry, setRouteGeometry] = useState<GeoJSON.Geometry | null>(null);
  const [distanceM, setDistanceM] = useState<number | null>(null);
  const [durationS, setDurationS] = useState<number | null>(null);

  const [paymentId, setPaymentId] = useState<PaymentId>('cash');
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [discountModalVisible, setDiscountModalVisible] = useState(false);
  const [optionsVisible, setOptionsVisible] = useState(false);
  const [allowElectric, setAllowElectric] = useState(false);
  const [exportVat, setExportVat] = useState(false);

  const [promoCode, setPromoCode] = useState('');
  const [selectedOfferId, setSelectedOfferId] = useState<string | null>(null);
  const [useDrivoXu, setUseDrivoXu] = useState(false);

  const { data: vouchersResp } = useVouchers();
  const vouchers = vouchersResp?.items ?? [];

  const effectiveOriginCoords: [number, number] = origin
    ? [origin.longitude, origin.latitude]
    : userCoords;

  const destCoords = destination
    ? [destination.longitude, destination.latitude] as [number, number]
    : null;

  // Ước tính giá cước từ backend ngay khi đã chọn xong điểm đón + điểm đến.
  const { data: estimate, error: estimateError } = useBookingEstimate({
    serviceType,
    pickupLat: effectiveOriginCoords[1],
    pickupLng: effectiveOriginCoords[0],
    dropoffLat: destination?.latitude,
    dropoffLng: destination?.longitude,
  });

  useEffect(() => {
    if (estimateError) console.error('[MapScreen] booking estimate error:', estimateError.message);
  }, [estimateError]);

  const { mutateAsync: createBooking, isPending: isBooking } = useCreateBooking();

  // GPS listener — updates userCoords for LocationPuck/drivers, fetches initial route when no explicit origin
  useEffect(() => {
    const fallback = setTimeout(() => {
      if (!locationSet.current && destinationRef.current && !originRef.current) {
        fetchRoute(HCM_FALLBACK, [destinationRef.current.longitude, destinationRef.current.latitude]);
      }
    }, 4000);

    const onLocation = (loc: Location) => {
      if (locationSet.current) return;
      const lng = loc.coords.longitude;
      const lat = loc.coords.latitude;
      if (!isFinite(lng) || !isFinite(lat)) return;
      locationSet.current = true;
      clearTimeout(fallback);
      const coords: [number, number] = [lng, lat];
      userCoordsRef.current = coords;
      setUserCoords(coords);
      setMockDrivers(genDrivers(coords));
      if (destinationRef.current && !originRef.current) {
        fetchRoute(coords, [destinationRef.current.longitude, destinationRef.current.latitude]);
      }
    };

    locationManager.start();
    locationManager.addListener(onLocation);
    return () => {
      clearTimeout(fallback);
      locationManager.removeListener(onLocation);
      locationManager.stop();
    };
  }, []);

  // Refetch route when origin/destination params change (e.g. swap or re-select)
  useEffect(() => {
    if (!destination) { setRouteGeometry(null); setDistanceM(null); setDurationS(null); return; }
    if (origin) {
      setRouteGeometry(null); setDistanceM(null); setDurationS(null);
      fetchRoute([origin.longitude, origin.latitude], [destination.longitude, destination.latitude]);
    } else if (locationSet.current) {
      setRouteGeometry(null); setDistanceM(null); setDurationS(null);
      fetchRoute(userCoordsRef.current, [destination.longitude, destination.latitude]);
    }
  }, [origin?.placeId, destination?.placeId]);

  async function fetchRoute(origin: [number, number], dest: [number, number]) {
    try {
      const url =
        `https://api.mapbox.com/directions/v5/mapbox/driving/` +
        `${origin[0]},${origin[1]};${dest[0]},${dest[1]}` +
        `?geometries=geojson&overview=full&access_token=${MAPBOX_PUBLIC_TOKEN}`;
      const json = await (await fetch(url)).json();
      const r = json.routes?.[0];
      if (r) { setRouteGeometry(r.geometry); setDistanceM(r.distance); setDurationS(r.duration); }
    } catch (e) { console.error('[MapScreen] fetchRoute:', e); }
  }

  const displayDist = estimate ? estimate.distanceKm * 1000 : distanceM ?? MOCK_DISTANCE_M;
  const displayDur = estimate ? estimate.durationMinutes * 60 : durationS ?? MOCK_DURATION_S;
  const basePrice = estimate?.fareAmount ?? calcPrice(displayDist, serviceType);

  function calcSaving(): number {
    let sv = 0;
    const voucher = vouchers.find(v => v.promotionId === selectedOfferId);
    if (voucher) sv += voucherSaving(voucher, basePrice);
    if (useDrivoXu) sv += Math.min(18000, DRIVO_XU_BALANCE * 33);
    return Math.round(sv / 1000) * 1000;
  }

  // Áp mã nhập tay: tìm voucher trùng code và còn dùng được.
  function applyPromoCode() {
    const input = promoCode.trim().toUpperCase();
    if (!input) return;
    const voucher = vouchers.find(v => v.code.toUpperCase() === input);
    if (voucher && isVoucherUsable(voucher, basePrice)) {
      setSelectedOfferId(voucher.promotionId);
      setPromoCode('');
    } else {
      Alert.alert('Mã không hợp lệ', 'Mã ưu đãi không tồn tại hoặc chưa đủ điều kiện áp dụng.');
    }
  }

  const saving = calcSaving();
  const finalPrice = Math.max(0, basePrice - saving);
  const selectedPayment = getPaymentItem(paymentId);
  const hasDiscount = saving > 0;

  // Bấm "Đặt tài xế" → gọi POST /bookings, thành công thì sang màn tìm tài xế (cần có điểm đến).
  const handleBook = async () => {
    if (!destination) {
      Alert.alert('Chưa chọn điểm đến', 'Vui lòng chọn điểm đến trước khi đặt tài xế.');
      return;
    }
    const selectedVoucher = vouchers.find(v => v.promotionId === selectedOfferId);
    try {
      const booking = await createBooking({
        type: 'p2p',
        vehicleType: VEHICLE_TYPE_BY_SERVICE[serviceType],
        pickupLat: effectiveOriginCoords[1],
        pickupLng: effectiveOriginCoords[0],
        pickupAddress: origin?.address ?? origin?.name ?? 'Vị trí hiện tại',
        dropoffLat: destination.latitude,
        dropoffLng: destination.longitude,
        dropoffAddress: destination.address,
        codes: selectedVoucher ? [selectedVoucher.code] : [],
      });
      navigation.navigate('FindingDriver', {
        bookingId: booking.bookingId,
        serviceType,
        pickupName: origin?.name ?? 'Vị trí của bạn',
        pickupLat: effectiveOriginCoords[1],
        pickupLng: effectiveOriginCoords[0],
        dropoffName: destination.name,
        dropoffLat: destination.latitude,
        dropoffLng: destination.longitude,
        distanceM: displayDist,
        durationS: displayDur,
        fare: finalPrice,
        paymentLabel: selectedPayment.label,
      });
    } catch (e) {
      const err = e as ApiError;
      Alert.alert('Đặt tài xế thất bại', err.message || 'Vui lòng thử lại sau.');
    }
  };

  const cameraProps = routeGeometry && destCoords
    ? {
        bounds: {
          ne: [Math.max(effectiveOriginCoords[0], destCoords[0]) + 0.01, Math.max(effectiveOriginCoords[1], destCoords[1]) + 0.01] as [number, number],
          sw: [Math.min(effectiveOriginCoords[0], destCoords[0]) - 0.01, Math.min(effectiveOriginCoords[1], destCoords[1]) - 0.01] as [number, number],
          paddingTop: 220, paddingBottom: 400, paddingLeft: 30, paddingRight: 30,
        },
        animationMode: 'easeTo' as const, animationDuration: 1000,
      }
    : { centerCoordinate: effectiveOriginCoords, zoomLevel: 14, animationMode: 'flyTo' as const, animationDuration: 600 };

  return (
    <View style={StyleSheet.absoluteFillObject}>
      {/* Map */}
      <Mapbox.MapView
        style={StyleSheet.absoluteFillObject}
        styleURL="mapbox://styles/mapbox/standard"
        logoEnabled={false}
        attributionEnabled={false}
        localizeLabels={{ locale: 'vi' }}
      >
        <Mapbox.Camera {...cameraProps} />
        <Mapbox.LocationPuck visible />

        {routeGeometry && (
          <>
            <Mapbox.ShapeSource
              id="routeCasingSource"
              shape={{ type: 'Feature', geometry: routeGeometry, properties: {} } as GeoJSON.Feature}
            >
              <Mapbox.LineLayer
                id="routeCasing"
                style={{ lineColor: 'white', lineWidth: 10, lineCap: 'round', lineJoin: 'round' }}
              />
            </Mapbox.ShapeSource>
            <Mapbox.ShapeSource
              id="routeLineSource"
              shape={{ type: 'Feature', geometry: routeGeometry, properties: {} } as GeoJSON.Feature}
            >
              <Mapbox.LineLayer
                id="routeLine"
                style={{ lineColor: '#2563EB', lineWidth: 6, lineCap: 'round', lineJoin: 'round' }}
              />
            </Mapbox.ShapeSource>
          </>
        )}

        {/* Origin marker */}
        <Mapbox.MarkerView id="origin" coordinate={effectiveOriginCoords}>
          <View style={s.originOuter}>
            <View style={s.originInner} />
          </View>
        </Mapbox.MarkerView>

        {/* Destination marker */}
        {destCoords && (
          <Mapbox.MarkerView id="dest" coordinate={destCoords}>
            <View style={s.destMarkerWrap}>
              <View style={s.destPin}>
                <Ionicons name="location-sharp" size={44} color="#EF4444" />
              </View>
              <View style={s.destShadowDot} />
            </View>
          </Mapbox.MarkerView>
        )}

        {mockDrivers.map(d => (
          <Mapbox.MarkerView key={d.id} id={d.id} coordinate={d.coordinate}>
            <View style={s.driverMarker}>
              <MaterialCommunityIcons name={serviceType === 'car' ? 'car' : 'motorbike'} size={15} color="white" />
            </View>
          </Mapbox.MarkerView>
        ))}
      </Mapbox.MapView>

      {/* ── Top card ── */}
      <View style={[s.topCard, { top: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={18} color="#111827" />
        </TouchableOpacity>
        <View style={s.routeCard}>
          <View style={s.statsRow}>
            <View style={s.statChip}>
              <Ionicons name="navigate-outline" size={11} color="#2563EB" />
              <Text style={s.statText}>{fmtDist(displayDist)}</Text>
            </View>
            <View style={s.statChip}>
              <Ionicons name="time-outline" size={11} color="#2563EB" />
              <Text style={s.statText}>~{fmtDur(displayDur)}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={s.routeRow}
            activeOpacity={0.7}
            onPress={() => navigation.push('DestinationSearch', {
              serviceType,
              editField: 'origin',
              currentOrigin: origin,
              currentDestination: destination,
            })}
          >
            <View style={s.dotBlue} />
            <View style={{ flex: 1 }}>
              <Text style={s.routeLabel}>Điểm đón</Text>
              <Text style={s.routeValue} numberOfLines={1}>{origin?.name ?? 'Vị trí của bạn'}</Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              onPress={() => navigation.navigate('Map', {
                serviceType,
                origin: destination,
                destination: origin,
              })}
              style={{ width: 26, height: 26, borderRadius: 6, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' }}
            >
              <Ionicons name="swap-vertical" size={14} color="#6b7280" />
            </TouchableOpacity>
          </TouchableOpacity>
          <View style={s.connector} />
          <TouchableOpacity
            style={s.routeRow}
            activeOpacity={0.7}
            onPress={() => navigation.push('DestinationSearch', {
              serviceType,
              editField: 'destination',
              currentOrigin: origin,
              currentDestination: destination,
            })}
          >
            <View style={s.dotRed} />
            <View style={{ flex: 1 }}>
              <Text style={s.routeLabel}>Điểm đến</Text>
              <Text style={s.routeValue} numberOfLines={1}>{destination?.name ?? 'Chưa chọn điểm đến'}</Text>
            </View>
            <Ionicons name="chevron-forward" size={14} color="#9ca3af" />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Bottom sheet ── */}
      <View style={[s.bottomSheet, { paddingBottom: insets.bottom + 12 }]}>
        {/* Vehicle row */}
        <View style={s.sheetRow}>
          <View style={s.vehicleIconWrap}>
            <Image
              source={
                serviceType === 'car'
                  ? require('../../../../assets/services/sedan.png')
                  : require('../../../../assets/services/scooter.png')
              }
              style={{ width: 28, height: 28 }}
              resizeMode="contain"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.sheetRowLabel}>{serviceType === 'car' ? 'Tài xế ô tô' : 'Tài xế xe máy'}</Text>
            <Text style={s.sheetRowSub}>{fmtDur(displayDur)} • {fmtDist(displayDist)}</Text>
          </View>
          <TouchableOpacity style={s.optionsBtn} activeOpacity={0.7} onPress={() => setOptionsVisible(true)}>
            <Ionicons name="reorder-three-outline" size={24} color="#6b7280" />
          </TouchableOpacity>
        </View>

        <View style={s.divider} />

        {/* Payment + Discount row */}
        <View style={s.payRow}>
          <TouchableOpacity style={s.payChip} activeOpacity={0.7} onPress={() => setPaymentModalVisible(true)}>
            <PaymentIcon item={selectedPayment} size={22} />
            <Text style={s.payChipText} numberOfLines={1}>{selectedPayment.label}</Text>
            <Ionicons name="chevron-down" size={13} color="#9ca3af" />
          </TouchableOpacity>
          <TouchableOpacity style={s.discountChip} activeOpacity={0.7} onPress={() => setDiscountModalVisible(true)}>
            <Image
              source={require('../../../../assets/map-screen/coupons.png')}
              style={{ width: 16, height: 16 }}
              resizeMode="contain"
            />
            <Text style={s.discountChipText} numberOfLines={1}>{hasDiscount ? `−${fmtVND(saving)}đ` : 'Ưu đãi'}</Text>
            <Ionicons name="chevron-down" size={13} color="#6b7280" />
          </TouchableOpacity>
        </View>

        <View style={s.divider} />

        {/* Price row */}
        <TouchableOpacity style={s.priceRow} activeOpacity={0.7}>
          <Text style={s.priceLabel}>Tổng thanh toán</Text>
          <View style={s.priceRight}>
            <Text style={s.priceValue}>{fmtVND(finalPrice)}đ</Text>
            <Ionicons name="chevron-forward" size={16} color="#374151" />
          </View>
        </TouchableOpacity>
        {saving > 0 && (
          <View style={s.savingRow}>
            <Text style={s.priceOriginal}>{fmtVND(basePrice)}đ</Text>
            <Text style={s.savingLabel}>Tiết kiệm {fmtVND(saving)}đ</Text>
          </View>
        )}

        <TouchableOpacity
          style={[s.bookBtn, isBooking && { opacity: 0.7 }]}
          activeOpacity={0.85}
          onPress={handleBook}
          disabled={isBooking}
        >
          {isBooking ? <ActivityIndicator color="white" /> : <Text style={s.bookText}>Đặt tài xế</Text>}
        </TouchableOpacity>
      </View>

      {/* ── Payment modal ── */}
      <PaymentModal
        visible={paymentModalVisible}
        selectedId={paymentId}
        onSelect={id => { setPaymentId(id); setPaymentModalVisible(false); }}
        onClose={() => setPaymentModalVisible(false)}
        bottomInset={insets.bottom}
      />

{/* ── Options modal ── */}
      <OptionsModal
        visible={optionsVisible}
        onClose={() => setOptionsVisible(false)}
        allowElectric={allowElectric}
        onToggleElectric={() => setAllowElectric(v => !v)}
        exportVat={exportVat}
        onToggleVat={() => setExportVat(v => !v)}
        bottomInset={insets.bottom}
      />

{/* ── Discount modal ── */}
      <DiscountModal
        visible={discountModalVisible}
        onClose={() => setDiscountModalVisible(false)}
        topInset={insets.top}
        bottomInset={insets.bottom}
        promoCode={promoCode}
        onPromoCodeChange={setPromoCode}
        onApplyCode={applyPromoCode}
        vouchers={vouchers}
        fare={basePrice}
        selectedOfferId={selectedOfferId}
        onSelectOffer={id => setSelectedOfferId(prev => prev === id ? null : id)}
        useDrivoXu={useDrivoXu}
        onToggleDrivoXu={() => setUseDrivoXu(v => !v)}
        saving={saving}
        onApply={() => setDiscountModalVisible(false)}
        drivoXuBalance={DRIVO_XU_BALANCE}
      />
    </View>
  );
}

// ─── OptionsModal ────────────────────────────────────────────────────────────

function OptionsModal({ visible, onClose, allowElectric, onToggleElectric, exportVat, onToggleVat, bottomInset }: {
  visible: boolean; onClose: () => void;
  allowElectric: boolean; onToggleElectric: () => void;
  exportVat: boolean; onToggleVat: () => void;
  bottomInset: number;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={om.overlay}>
          <TouchableWithoutFeedback>
            <View style={[om.sheet, { paddingBottom: bottomInset + 24 }]}>
              <View style={om.handle} />
              <Text style={om.title}>Tùy chọn chuyến đi</Text>

              <View style={om.row}>
                <View style={om.rowLeft}>
                  <Ionicons name="flash" size={20} color="#f59e0b" />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={om.rowLabel}>Cho phép xe điện</Text>
                    <Text style={om.rowSub}>Xe điện thân thiện với môi trường</Text>
                  </View>
                </View>
                <Switch
                  value={allowElectric}
                  onValueChange={onToggleElectric}
                  trackColor={{ true: '#2563EB', false: '#e5e7eb' }}
                  thumbColor="white"
                />
              </View>

              <View style={om.divider} />

              <View style={om.row}>
                <View style={om.rowLeft}>
                  <Ionicons name="receipt-outline" size={20} color="#6b7280" />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={om.rowLabel}>Xuất hóa đơn VAT</Text>
                    <Text style={om.rowSub}>Hóa đơn điện tử gửi qua email</Text>
                  </View>
                </View>
                <Switch
                  value={exportVat}
                  onValueChange={onToggleVat}
                  trackColor={{ true: '#2563EB', false: '#e5e7eb' }}
                  thumbColor="white"
                />
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

// ─── PaymentModal ─────────────────────────────────────────────────────────────

function PaymentModal({ visible, selectedId, onSelect, onClose, bottomInset }: {
  visible: boolean; selectedId: PaymentId;
  onSelect: (id: PaymentId) => void; onClose: () => void; bottomInset: number;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={pm.overlay}>
          <TouchableWithoutFeedback>
            <View style={[pm.sheet, { paddingBottom: bottomInset + 20 }]}>
              <View style={pm.handle} />
              <Text style={pm.title}>Phương thức thanh toán</Text>

              {PAYMENT_GROUPS.map((group, gi) => (
                <View key={gi}>
                  <Text style={pm.groupLabel}>{group.title}</Text>
                  {group.items.map((item, ii) => {
                    const sel = selectedId === item.id;
                    return (
                      <TouchableOpacity
                        key={item.id}
                        style={[pm.item, ii < group.items.length - 1 && pm.itemBorder]}
                        onPress={() => onSelect(item.id)}
                        activeOpacity={0.7}
                      >
                        <PaymentIcon item={item} size={40} />
                        <View style={{ flex: 1, marginLeft: 12 }}>
                          <Text style={[pm.itemLabel, sel && { color: '#2563EB' }]}>{item.label}</Text>
                          {item.sub && <Text style={pm.itemSub}>{item.sub}</Text>}
                        </View>
                        <View style={[pm.radio, sel && pm.radioSelected]}>
                          {sel && <View style={pm.radioDot} />}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}

              <Text style={pm.groupLabel}>Thêm phương thức</Text>
              {ADD_PAYMENT_OPTIONS.map((item, ii) => (
                <TouchableOpacity
                  key={item.id}
                  style={[pm.item, ii < ADD_PAYMENT_OPTIONS.length - 1 && pm.itemBorder]}
                  activeOpacity={0.7}
                >
                  <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: item.iconBg, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name={item.iconName as any} size={20} color={item.iconColor} />
                  </View>
                  <Text style={[pm.itemLabel, { flex: 1, marginLeft: 12 }]}>{item.label}</Text>
                  <Ionicons name="add-circle-outline" size={22} color="#2563EB" />
                </TouchableOpacity>
              ))}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

// ─── DiscountModal ────────────────────────────────────────────────────────────

function DiscountModal({ visible, onClose, topInset, bottomInset, promoCode, onPromoCodeChange,
  onApplyCode, vouchers, fare, selectedOfferId, onSelectOffer, useDrivoXu, onToggleDrivoXu, saving, onApply, drivoXuBalance }: {
  visible: boolean; onClose: () => void;
  topInset: number; bottomInset: number;
  promoCode: string; onPromoCodeChange: (v: string) => void;
  onApplyCode: () => void;
  vouchers: Voucher[]; fare: number;
  selectedOfferId: string | null; onSelectOffer: (id: string) => void;
  useDrivoXu: boolean; onToggleDrivoXu: () => void;
  saving: number; onApply: () => void; drivoXuBalance: number;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={[d.container, { paddingTop: topInset }]}>
        <View style={d.header}>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close" size={22} color="#111827" />
          </TouchableOpacity>
          <Text style={d.headerTitle}>Ưu đãi</Text>
          <View style={{ width: 22 }} />
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={d.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* Promo input */}
          <View style={d.codeRow}>
            <Ionicons name="gift-outline" size={18} color="#9ca3af" />
            <TextInput
              value={promoCode}
              onChangeText={onPromoCodeChange}
              placeholder="Nhập mã ưu đãi của bạn"
              placeholderTextColor="#9ca3af"
              style={d.codeInput}
              autoCapitalize="characters"
            />
            {promoCode.length > 0 && (
              <TouchableOpacity style={d.applyCodeBtn} onPress={onApplyCode}>
                <Text style={d.applyCodeText}>Áp dụng</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Vouchers */}
          <Text style={d.sectionTitle}>Ưu đãi của bạn</Text>
          {vouchers.length === 0 ? (
            <Text style={d.sectionSub}>Chưa có ưu đãi khả dụng.</Text>
          ) : (
            vouchers.map(v => {
              const sel = selectedOfferId === v.promotionId;
              const usable = isVoucherUsable(v, fare);
              const note =
                v.state !== 'available'
                  ? 'Đã sử dụng'
                  : fare < v.minFareAmount
                    ? `Đơn tối thiểu ${fmtVND(v.minFareAmount)}đ`
                    : `Mã ${v.code}`;
              return (
                <TouchableOpacity
                  key={v.promotionId}
                  style={[d.offerCard, sel && d.offerCardSel, !usable && d.offerDisabled]}
                  onPress={() => usable && onSelectOffer(v.promotionId)}
                  activeOpacity={usable ? 0.8 : 1}
                >
                  <View style={d.offerIcon}>
                    <Image
                      source={require('../../../../assets/map-screen/coupons.png')}
                      style={{ width: 26, height: 26 }}
                      resizeMode="contain"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={d.offerLabel}>{v.description || v.name}</Text>
                    <Text style={d.offerSub}>{note}</Text>
                  </View>
                  {usable ? (
                    <View style={[d.checkbox, sel && d.checkboxSel]}>
                      {sel && <Ionicons name="checkmark" size={11} color="white" />}
                    </View>
                  ) : (
                    <Ionicons name="lock-closed-outline" size={16} color="#9ca3af" />
                  )}
                </TouchableOpacity>
              );
            })
          )}

          {/* Drivo Xu — integrated section */}
          <Text style={[d.sectionTitle, { marginTop: 20 }]}>Drivo Xu</Text>
          <View style={d.xuCard}>
            <View style={d.xuBadge}><Text style={d.xuBadgeText}>D</Text></View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={d.xuCardTitle}>Giảm đến 18.000đ</Text>
              <Text style={d.xuCardSub}>{drivoXuBalance} Drivo Xu  ·  33 Xu = 1.000đ</Text>
            </View>
            <Switch
              value={useDrivoXu}
              onValueChange={onToggleDrivoXu}
              trackColor={{ true: '#2563EB', false: '#e5e7eb' }}
              thumbColor="white"
            />
          </View>
        </ScrollView>

        {/* Bottom bar */}
        <View style={[d.bottomBar, { paddingBottom: bottomInset + 12 }]}>
          {saving > 0 && (
            <View style={d.savingRow}>
              <View style={d.savingBadge}><Text style={d.savingBadgeText}>D</Text></View>
              <Text style={d.savingText}>
                Bạn đã tiết kiệm được <Text style={{ fontWeight: '700' }}>{fmtVND(saving)}đ</Text>
              </Text>
              <View style={d.multBadge}><Text style={d.multText}>x1</Text></View>
            </View>
          )}
          <TouchableOpacity style={d.applyBtn} activeOpacity={0.85} onPress={onApply}>
            <Text style={d.applyText}>Áp dụng</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  topCard: {
    position: 'absolute', left: 16, right: 16,
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
  },
  backBtn: {
    width: 34, height: 34, borderRadius: 17, backgroundColor: 'white',
    alignItems: 'center', justifyContent: 'center', marginTop: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15, shadowRadius: 4, elevation: 4,
  },
  routeCard: {
    flex: 1, backgroundColor: 'white', borderRadius: 16,
    paddingHorizontal: 14, paddingVertical: 12, gap: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12, shadowRadius: 8, elevation: 5,
  },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  statChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#eff6ff', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3,
  },
  statText: { fontSize: 11, fontWeight: '600', color: '#2563EB' },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 36 },
  dotBlue: { width: 11, height: 11, borderRadius: 6, backgroundColor: '#2563EB', borderWidth: 2, borderColor: '#bfdbfe' },
  dotRed: { width: 11, height: 11, borderRadius: 6, backgroundColor: '#EF4444', borderWidth: 2, borderColor: '#fecaca' },
  connector: { width: 1, height: 10, backgroundColor: '#d1d5db', marginLeft: 5 },
  routeLabel: { fontSize: 10, color: '#9ca3af', fontWeight: '500' },
  routeValue: { fontSize: 13, fontWeight: '600', color: '#111827', marginTop: 1 },
  swapBtn: { padding: 4 },
  bottomSheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'white',
    borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 20, paddingTop: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1, shadowRadius: 10, elevation: 12,
  },
  optionsBtn: {
    marginLeft: 'auto',
    padding: 4,
    hitSlop: { top: 8, bottom: 8, left: 8, right: 8 },
  } as any,
  vehicleIconWrap: {
    width: 34, height: 34, borderRadius: 10, backgroundColor: '#eff6ff',
    alignItems: 'center', justifyContent: 'center', marginRight: 10,
  },
  divider: { height: 1, backgroundColor: '#f3f4f6', marginVertical: 10 },
  sheetRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  sheetRowLabel: { fontSize: 14, fontWeight: '600', color: '#111827' },
  sheetRowSub: { fontSize: 13, fontWeight: '500', color: '#9ca3af', marginTop: 2 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: '#374151' },
  sectionLink: { fontSize: 13, fontWeight: '500', color: '#2563EB' },
  paymentRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  payMethodBtn: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  payMethodText: { fontSize: 14, fontWeight: '600', color: '#111827' },
  payRow: { flexDirection: 'row', gap: 8 },
  payChip: {
    flex: 3,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 9, borderRadius: 20,
    backgroundColor: 'white', borderWidth: 1, borderColor: '#e5e7eb',
  },
  payChipText: { flex: 1, fontSize: 13, fontWeight: '600', color: '#374151' },
  discountChip: {
    flex: 2,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    backgroundColor: '#eff6ff', paddingHorizontal: 10, paddingVertical: 9, borderRadius: 20,
  },
  discountChipText: { fontSize: 13, fontWeight: '600', color: '#2563EB' },
  priceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  priceLabel: { fontSize: 13, color: '#6b7280', fontWeight: '500' },
  priceRight: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  priceValue: { fontSize: 20, fontWeight: '700', color: '#111827' },
  savingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  priceOriginal: { fontSize: 12, color: '#9ca3af', textDecorationLine: 'line-through' },
  savingLabel: {
    fontSize: 12, color: '#059669', fontWeight: '600',
    backgroundColor: '#f0fdf4', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20,
  },
  bookBtn: {
    backgroundColor: '#2563EB', borderRadius: 14, paddingVertical: 16,
    alignItems: 'center', marginTop: 12,
    shadowColor: '#2563EB', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 8, elevation: 6,
  },
  bookText: { color: 'white', fontSize: 16, fontWeight: '700' },
  originOuter: {
    width: 20, height: 20, borderRadius: 10, backgroundColor: 'white',
    borderWidth: 3, borderColor: '#2563EB', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 6,
  },
  originInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#2563EB' },
  destMarkerWrap: { alignItems: 'center' },
  destPin: { marginBottom: -6 },
  destShadowDot: { width: 8, height: 4, borderRadius: 4, backgroundColor: 'rgba(0,0,0,0.2)' },
  driverMarker: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: '#2563EB',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'white',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2, shadowRadius: 3, elevation: 4,
  },
  youLabel: { backgroundColor: '#111827', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  youText: { color: 'white', fontSize: 11, fontWeight: '700' },
  destMarker: { alignItems: 'center' },
});

const pm = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingTop: 12, maxHeight: '85%',
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#e5e7eb', alignSelf: 'center', marginBottom: 16 },
  title: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 16 },
  groupLabel: { fontSize: 12, fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 12, marginBottom: 4 },
  item: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  itemBorder: { borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  itemLabel: { fontSize: 14, fontWeight: '500', color: '#111827' },
  itemSub: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  radio: {
    width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#d1d5db',
    alignItems: 'center', justifyContent: 'center',
  },
  radioSelected: { borderColor: '#2563EB' },
  radioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#2563EB' },
});


const d = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
  scrollContent: { padding: 16, paddingBottom: 8 },
  codeRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 11, marginBottom: 20,
  },
  codeInput: { flex: 1, fontSize: 14, color: '#111827', padding: 0 },
  applyCodeBtn: { backgroundColor: '#2563EB', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  applyCodeText: { color: 'white', fontSize: 13, fontWeight: '600' },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 4 },
  sectionSub: { fontSize: 12, color: '#9ca3af', marginBottom: 12 },
  offerCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderRadius: 14, borderWidth: 1.5, borderColor: '#e5e7eb',
    backgroundColor: 'white', marginBottom: 10,
  },
  offerCardSel: { borderColor: '#2563EB', backgroundColor: '#eff6ff' },
  offerDisabled: { opacity: 0.5 },
  offerIcon: {
    width: 48, height: 48, borderRadius: 12, backgroundColor: '#eff6ff',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  offerLabel: { fontSize: 14, fontWeight: '600', color: '#111827' },
  offerSub: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  checkbox: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: '#d1d5db',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  checkboxSel: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  xuCard: {
    flexDirection: 'row', alignItems: 'center',
    padding: 16, borderRadius: 14, borderWidth: 1.5, borderColor: '#e5e7eb', marginBottom: 8,
  },
  xuBadge: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#2563EB', alignItems: 'center', justifyContent: 'center' },
  xuBadgeText: { color: 'white', fontSize: 18, fontWeight: '800' },
  xuCardTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  xuCardSub: { fontSize: 12, color: '#6b7280', marginTop: 3 },
  bottomBar: { borderTopWidth: 1, borderTopColor: '#f3f4f6', paddingHorizontal: 20, paddingTop: 12 },
  savingRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#f0fdf4', padding: 10, borderRadius: 10, marginBottom: 10,
  },
  savingBadge: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#2563EB', alignItems: 'center', justifyContent: 'center' },
  savingBadgeText: { color: 'white', fontSize: 10, fontWeight: '800' },
  savingText: { flex: 1, fontSize: 13, color: '#111827' },
  multBadge: { backgroundColor: '#e5e7eb', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  multText: { fontSize: 12, fontWeight: '700', color: '#6b7280' },
  applyBtn: { backgroundColor: '#2563EB', borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  applyText: { color: 'white', fontSize: 16, fontWeight: '700' },
});

const om = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingTop: 12,
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#e5e7eb', alignSelf: 'center', marginBottom: 16 },
  title: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  rowLeft: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  rowLabel: { fontSize: 14, fontWeight: '600', color: '#111827' },
  rowSub: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  divider: { height: 1, backgroundColor: '#f3f4f6' },
});
