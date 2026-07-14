import { ActivityIndicator, Image, Linking, ScrollView, Share, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Card from '../../../shared/components/ui/Card';
import { formatNumber, formatDate, formatTime } from '@shared/utils/format';
import { useTripDetail } from '@shared/hooks/useTripDetail';
import { useToast } from '@shared/components/ui/Toast';
import type { RootScreenProps } from '../../../navigation/types';
import { mapTrip } from '../mapTrip';

const SUPPORT_PHONE = '19001234';

// Nhãn trạng thái chi tiết (mịn hơn 3 bucket của thẻ).
const STATUS_LABEL: Record<string, string> = {
  assigned: 'Đã nhận',
  en_route: 'Đang đến đón',
  arrived: 'Đã đến điểm đón',
  in_progress: 'Đang đi',
  completed: 'Hoàn thành',
  cancelled_customer: 'Đã hủy',
  cancelled_driver: 'Tài xế hủy',
  no_show: 'Không đón được',
  aborted: 'Đã hủy',
};

const STATUS_COLOR: Record<'active' | 'completed' | 'cancelled', { text: string; bg: string }> = {
  active: { text: '#2563EB', bg: '#EFF6FF' },
  completed: { text: '#16a34a', bg: '#f0fdf4' },
  cancelled: { text: '#dc2626', bg: '#fef2f2' },
};

const PAYMENT_LABEL: Record<string, string> = {
  cash: 'Tiền mặt',
  vietqr: 'VietQR',
  momo: 'MoMo',
  zalopay: 'ZaloPay',
  visa: 'Thẻ Visa',
};

// Tách "Tên địa điểm, phần địa chỉ còn lại".
function splitAddress(addr: string): { title: string; detail: string } {
  const i = addr.indexOf(',');
  if (i === -1) return { title: addr, detail: '' };
  return { title: addr.slice(0, i).trim(), detail: addr.slice(i + 1).trim() };
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View className="flex-row items-center justify-between py-2.5">
      <Text className="text-sm text-gray-500">{label}</Text>
      {children}
    </View>
  );
}

function RoundIconButton({ icon, onPress }: { icon: React.ComponentProps<typeof Ionicons>['name']; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      className="w-11 h-11 rounded-full bg-primary-light items-center justify-center"
    >
      <Ionicons name={icon} size={20} color="#2563EB" />
    </TouchableOpacity>
  );
}

// Header dùng chung cho mọi trạng thái (loading / lỗi / có dữ liệu).
function DetailHeader({ onBack, topInset }: { onBack: () => void; topInset: number }) {
  return (
    <View className="bg-white" style={{ paddingTop: topInset }}>
      <View className="flex-row items-center px-4 py-3">
        <TouchableOpacity onPress={onBack} hitSlop={8} className="w-9 h-9 items-center justify-center">
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>
        <Text className="flex-1 text-center text-base font-bold text-gray-900 mr-9">Chi tiết chuyến đi</Text>
      </View>
    </View>
  );
}

export default function TripDetailScreen({ navigation, route }: RootScreenProps<'TripDetail'>) {
  const insets = useSafeAreaInsets();
  const { tripId } = route.params;
  const { showToast } = useToast();
  const { data: trip, isLoading, isError, refetch } = useTripDetail(tripId);

  // Chưa có dữ liệu (đang tải hoặc lỗi) → hiện header + trạng thái tương ứng.
  if (isLoading || isError || !trip) {
    return (
      <View className="flex-1 bg-gray-50">
        <DetailHeader onBack={() => navigation.goBack()} topInset={insets.top} />
        <View className="flex-1 items-center justify-center px-10">
          {isLoading ? (
            <ActivityIndicator size="large" color="#2563EB" />
          ) : (
            <>
              <Ionicons name="cloud-offline-outline" size={44} color="#d1d5db" />
              <Text className="text-sm text-gray-500 mt-3 text-center">Không tải được chi tiết chuyến đi</Text>
              <TouchableOpacity
                onPress={() => refetch()}
                activeOpacity={0.85}
                className="mt-4 px-5 py-2.5 rounded-full bg-primary"
              >
                <Text className="text-white font-semibold text-sm">Thử lại</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  }

  const t = mapTrip(trip);

  const isCar = t.serviceType === 'car';
  const statusColor = STATUS_COLOR[t.status];
  const statusLabel = STATUS_LABEL[trip.status] ?? trip.status;
  const paymentLabel = trip.paymentMethod ? PAYMENT_LABEL[trip.paymentMethod] ?? trip.paymentMethod : '—';
  const pickup = splitAddress(trip.pickupAddress);
  const dropoff = splitAddress(trip.dropoffAddress);

  // Định dạng tiền: có giá trị → "12.345đ", null → "—".
  const money = (n: number | null) => (n != null ? `${formatNumber(n)}đ` : '—');
  const hasDiscount = trip.discountAmount != null && trip.discountAmount > 0;
  // Tổng thực trả: netFareAmount (đã hoàn tất) → fareAmount → quotedFareAmount (chuyến đang đi, tạm tính).
  const totalAmount = trip.netFareAmount ?? trip.fareAmount ?? trip.quotedFareAmount;
  // Chưa có bất kỳ số tiền nào (kể cả tạm tính) → hiện ghi chú thay vì số 0.
  const farePending = totalAmount == null;

  const comingSoon = () => showToast('Tính năng đang được phát triển.', { type: 'info' });

  const shareTrip = () => {
    Share.share({
      message:
        `Chuyến đi Drivo\n${t.from} → ${t.to}\n` +
        `Tài xế: ${trip.counterparty.fullName}\nMã chuyến: ${trip.tripCode}`,
    }).catch(() => {});
  };

  const callSupport = () => {
    Linking.openURL(`tel:${SUPPORT_PHONE}`).catch(() =>
      showToast('Không gọi được, vui lòng thử lại sau.', { type: 'error' }),
    );
  };

  const callDriver = () => {
    if (!trip.counterparty.phone) {
      showToast('Tài xế chỉ hiển thị số trong lúc chuyến đang diễn ra.', { type: 'info' });
      return;
    }
    Linking.openURL(`tel:${trip.counterparty.phone}`).catch(() =>
      showToast('Không gọi được, vui lòng thử lại sau.', { type: 'error' }),
    );
  };

  const StatusPill = ({ small }: { small?: boolean }) => (
    <View
      className="flex-row items-center rounded-full"
      style={{ backgroundColor: statusColor.bg, paddingHorizontal: 10, paddingVertical: small ? 3 : 5, gap: 5 }}
    >
      <View className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: statusColor.text }} />
      <Text className="font-semibold" style={{ color: statusColor.text, fontSize: small ? 12 : 13 }}>
        {statusLabel}
      </Text>
    </View>
  );

  return (
    <View className="flex-1 bg-gray-50">
      <DetailHeader onBack={() => navigation.goBack()} topInset={insets.top} />

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Summary card ── */}
        <Card className="p-4">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center" style={{ gap: 10 }}>
              <View className="w-9 h-9 rounded-xl bg-primary-light items-center justify-center">
                <MaterialCommunityIcons name={isCar ? 'car' : 'motorbike'} size={20} color="#2563EB" />
              </View>
              <Text className="text-base font-bold text-gray-900">
                {isCar ? 'Thuê tài xế ô tô' : 'Thuê tài xế xe máy'}
              </Text>
            </View>
            <StatusPill small />
          </View>

          {/* Meta */}
          <View className="flex-row items-center flex-wrap mt-3" style={{ gap: 6 }}>
            <Ionicons name="calendar-outline" size={13} color="#9ca3af" />
            <Text className="text-xs text-gray-400">{t.date} • {t.time}</Text>
            <Text className="text-gray-200">|</Text>
            <Ionicons name="time-outline" size={13} color="#9ca3af" />
            <Text className="text-xs text-gray-400">{t.duration}</Text>
            <Text className="text-gray-200">|</Text>
            <Ionicons name="navigate-outline" size={13} color="#9ca3af" />
            <Text className="text-xs text-gray-400">{t.distance}</Text>
          </View>

          {/* Route */}
          <View className="bg-gray-50 rounded-2xl px-3 py-3 mt-3">
            <View className="flex-row" style={{ gap: 10 }}>
              <View className="items-center" style={{ width: 14, paddingTop: 3 }}>
                <View className="w-3.5 h-3.5 rounded-full bg-white" style={{ borderWidth: 2.5, borderColor: '#2563EB' }} />
                <View className="w-px bg-gray-300 my-1" style={{ flex: 1, minHeight: 22 }} />
                <View className="w-3.5 h-3.5 rounded-full bg-red-500" />
              </View>
              <View className="flex-1" style={{ gap: 14 }}>
                <View>
                  <Text className="text-sm font-semibold text-gray-900" numberOfLines={1}>{pickup.title}</Text>
                  {pickup.detail ? <Text className="text-xs text-gray-400 mt-0.5" numberOfLines={1}>{pickup.detail}</Text> : null}
                </View>
                <View>
                  <Text className="text-sm font-semibold text-gray-900" numberOfLines={1}>{dropoff.title}</Text>
                  {dropoff.detail ? <Text className="text-xs text-gray-400 mt-0.5" numberOfLines={1}>{dropoff.detail}</Text> : null}
                </View>
              </View>
            </View>
          </View>

          {/* Driver */}
          <View className="flex-row items-center mt-4">
            <Image
              source={trip.counterparty.avatarUrl ? { uri: trip.counterparty.avatarUrl } : require('../../../../assets/avatar.jpg')}
              className="w-11 h-11 rounded-full mr-3"
            />
            <View className="flex-1">
              <Text className="text-sm font-bold text-gray-900">{trip.counterparty.fullName}</Text>
              <Text className="text-xs text-gray-400 mt-0.5">Tài xế</Text>
            </View>
            {trip.counterparty.rating != null && (
              <View className="flex-row items-center" style={{ gap: 3 }}>
                <Ionicons name="star" size={14} color="#f59e0b" />
                <Text className="text-sm font-bold text-gray-800">{trip.counterparty.rating.toFixed(1)}</Text>
              </View>
            )}
          </View>

          {/* Price */}
          <View className="flex-row items-center justify-between mt-4 pt-4" style={{ borderTopWidth: 1, borderTopColor: '#f3f4f6' }}>
            <Text className="text-xl font-bold text-gray-900">
              {t.price > 0 ? `${formatNumber(t.price)}đ` : '—'}
            </Text>
            <TouchableOpacity className="flex-row items-center" activeOpacity={0.7} onPress={comingSoon} style={{ gap: 2 }}>
              <Text className="text-sm text-gray-500">Xem hóa đơn</Text>
              <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
            </TouchableOpacity>
          </View>
        </Card>

        {/* ── Trip info ── */}
        <Card className="p-4 mt-4">
          <View className="flex-row items-center mb-1" style={{ gap: 10 }}>
            <View className="w-9 h-9 rounded-xl bg-primary-light items-center justify-center">
              <Ionicons name="list" size={18} color="#2563EB" />
            </View>
            <Text className="text-base font-bold text-gray-900">Thông tin chuyến đi</Text>
          </View>

          <InfoRow label="Mã chuyến đi">
            <Text className="text-sm font-semibold text-gray-900" numberOfLines={1} style={{ maxWidth: '60%' }}>
              {trip.tripCode}
            </Text>
          </InfoRow>
          <InfoRow label="Trạng thái">
            <StatusPill small />
          </InfoRow>
          <InfoRow label="Nhận chuyến">
            <Text className="text-sm font-semibold text-gray-900">{formatDate(trip.assignedAt)} • {formatTime(trip.assignedAt)}</Text>
          </InfoRow>
        </Card>

        {/* ── Payment details ── */}
        <Card className="p-4 mt-4">
          <View className="flex-row items-center mb-1" style={{ gap: 10 }}>
            <View className="w-9 h-9 rounded-xl bg-primary-light items-center justify-center">
              <Ionicons name="wallet" size={18} color="#2563EB" />
            </View>
            <Text className="text-base font-bold text-gray-900">Chi tiết thanh toán</Text>
          </View>

          <InfoRow label="Cước phí">
            <Text className="text-sm font-semibold text-gray-900">{money(trip.fareAmount)}</Text>
          </InfoRow>
          {hasDiscount && (
            <InfoRow label="Giảm giá">
              <Text className="text-sm font-semibold" style={{ color: '#16a34a' }}>
                −{money(trip.discountAmount)}
              </Text>
            </InfoRow>
          )}
          <InfoRow label="Hình thức thanh toán">
            <Text className="text-sm font-semibold text-gray-900">{paymentLabel}</Text>
          </InfoRow>

          {/* Tổng thực trả */}
          <View
            className="flex-row items-center justify-between mt-2 pt-3"
            style={{ borderTopWidth: 1, borderTopColor: '#f3f4f6' }}
          >
            <Text className="text-sm font-bold text-gray-900">Tổng thanh toán</Text>
            {farePending ? (
              <Text className="text-sm font-medium text-gray-400">Tính khi hoàn thành</Text>
            ) : (
              <Text className="text-lg font-bold text-gray-900">{money(totalAmount)}</Text>
            )}
          </View>
        </Card>

        {/* ── Contact ── */}
        <Card className="p-4 mt-4">
          <View className="flex-row items-center mb-3" style={{ gap: 10 }}>
            <View className="w-9 h-9 rounded-xl bg-primary-light items-center justify-center">
              <Ionicons name="call" size={18} color="#2563EB" />
            </View>
            <Text className="text-base font-bold text-gray-900">Liên hệ</Text>
          </View>

          <View className="flex-row items-center">
            <Image
              source={trip.counterparty.avatarUrl ? { uri: trip.counterparty.avatarUrl } : require('../../../../assets/avatar.jpg')}
              className="w-11 h-11 rounded-full mr-3"
            />
            <View className="flex-1">
              <Text className="text-sm font-bold text-gray-900">{trip.counterparty.fullName}</Text>
              <Text className="text-xs text-gray-400 mt-0.5">Tài xế</Text>
            </View>
            <View className="flex-row" style={{ gap: 8 }}>
              <RoundIconButton icon="call" onPress={callDriver} />
              <RoundIconButton icon="chatbubble-ellipses" onPress={comingSoon} />
            </View>
          </View>

          <View style={{ height: 1, backgroundColor: '#f3f4f6', marginVertical: 14 }} />

          <View className="flex-row items-center">
            <View className="w-11 h-11 rounded-full items-center justify-center mr-3 bg-primary-light">
              <Ionicons name="headset" size={20} color="#2563EB" />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-bold text-gray-900">Hỗ trợ khách hàng</Text>
              <Text className="text-xs text-gray-400 mt-0.5">24/7</Text>
            </View>
            <RoundIconButton icon="call" onPress={callSupport} />
          </View>
        </Card>
      </ScrollView>

      {/* Bottom actions */}
      <View
        className="absolute left-0 right-0 bottom-0 bg-white"
        style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: insets.bottom + 12, borderTopWidth: 1, borderTopColor: '#f3f4f6' }}
      >
        <TouchableOpacity
          onPress={shareTrip}
          activeOpacity={0.85}
          className="rounded-2xl py-4 items-center bg-primary"
        >
          <Text className="text-white font-bold text-base">Chia sẻ chuyến đi</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
