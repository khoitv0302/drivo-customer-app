import { Image, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Card from '../../../shared/components/ui/Card';
import type { Trip } from '../types';

const STATUS_CONFIG = {
  active: { label: 'Đang đi', textColor: '#2563EB', bgColor: '#EFF6FF', dotColor: '#2563EB' },
  completed: { label: 'Hoàn thành', textColor: '#16a34a', bgColor: '#f0fdf4', dotColor: '#16a34a' },
  cancelled: { label: 'Đã hủy', textColor: '#dc2626', bgColor: '#fef2f2', dotColor: '#dc2626' },
} as const;

interface Props {
  trip: Trip;
  showActions?: boolean;
  onRate?: (trip: Trip) => void;
  onRebook?: (trip: Trip) => void;
  onPress?: (trip: Trip) => void;
}

export default function TripCard({ trip, showActions = false, onRate, onRebook, onPress }: Props) {
  const status = STATUS_CONFIG[trip.status];
  // canRate lấy từ API (đúng theo policy backend, vd hạn đánh giá) — kết hợp isRated tạm giữ ở
  // client để nút tắt ngay sau khi đánh giá xong, không cần chờ refetch list.
  const canRate = trip.canRate && !trip.isRated;

  return (
    <TouchableOpacity
      activeOpacity={onPress ? 0.85 : 1}
      onPress={onPress ? () => onPress(trip) : undefined}
      disabled={!onPress}
    >
    <Card className="mx-4 mb-3 overflow-hidden" style={{ borderWidth: 1, borderColor: '#e5e7eb' }}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 pt-4 pb-3">
        <View className="flex-row items-center" style={{ gap: 8 }}>
          <View className="w-8 h-8 rounded-lg bg-primary-light items-center justify-center">
            <MaterialCommunityIcons
              name={trip.serviceType === 'car' ? 'car' : 'motorbike'}
              size={18}
              color="#2563EB"
            />
          </View>
          <Text className="text-sm font-semibold text-gray-900">
            {trip.serviceType === 'car' ? 'Thuê tài xế ô tô' : 'Thuê tài xế xe máy'}
          </Text>
        </View>

        <View
          className="flex-row items-center px-2.5 py-1 rounded-full"
          style={{ backgroundColor: status.bgColor, gap: 5 }}
        >
          <View
            className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: status.dotColor }}
          />
          <Text className="text-xs font-semibold" style={{ color: status.textColor }}>
            {status.label}
          </Text>
        </View>
      </View>

      {/* Date & meta */}
      <View className="px-4 pb-3 flex-row items-center flex-wrap" style={{ gap: 5 }}>
        <Ionicons name="calendar-outline" size={12} color="#9ca3af" />
        <Text className="text-xs text-gray-400">{trip.date} • {trip.time}</Text>
        <Text className="text-gray-200">|</Text>
        <Ionicons name="time-outline" size={12} color="#9ca3af" />
        <Text className="text-xs text-gray-400">{trip.duration}</Text>
        <Text className="text-gray-200">|</Text>
        <Ionicons name="navigate-outline" size={12} color="#9ca3af" />
        <Text className="text-xs text-gray-400">{trip.distance}</Text>
      </View>

      {/* Route */}
      <View className="mx-4 mb-3 bg-gray-50 rounded-2xl px-3 py-3">
        <View className="flex-row" style={{ gap: 10 }}>
          <View className="items-center" style={{ width: 14 }}>
            <View
              className="w-3 h-3 rounded-full bg-white"
              style={{ borderWidth: 2, borderColor: '#2563EB', marginTop: 1 }}
            />
            <View className="w-px bg-gray-300 my-1" style={{ flex: 1, minHeight: 18 }} />
            <View className="w-3 h-3 rounded-full bg-red-500" />
          </View>
          <View className="flex-1" style={{ gap: 12 }}>
            <Text className="text-sm text-gray-700 leading-5" numberOfLines={1}>
              {trip.from}
            </Text>
            <Text className="text-sm text-gray-700 leading-5" numberOfLines={1}>
              {trip.to}
            </Text>
          </View>
        </View>
      </View>

      {/* Driver info */}
      <View className="px-4 pb-3 flex-row items-center">
        <Image source={require('../../../../assets/avatar.jpg')} className="w-9 h-9 rounded-full mr-3" />
        <View className="flex-1">
          <Text className="text-sm font-semibold text-gray-900">{trip.driver.name}</Text>
          <Text className="text-xs text-gray-400 mt-0.5">Tài xế</Text>
        </View>
        <View className="flex-row items-center" style={{ gap: 3 }}>
          <Ionicons name="star" size={13} color="#f59e0b" />
          <Text className="text-sm font-bold text-gray-800">
            {trip.driver.rating.toFixed(1)}
          </Text>
        </View>
      </View>

      {/* Footer */}
      <View
        className="px-4 py-3 flex-row items-center justify-between"
        style={{ borderTopWidth: 1, borderTopColor: '#f3f4f6' }}
      >
        <Text className="text-base font-bold text-gray-900">
          {trip.price > 0 ? `${trip.price.toLocaleString('vi-VN')}đ` : '—'}
        </Text>

        {showActions && (
          <View className="flex-row" style={{ gap: 8 }}>
            <TouchableOpacity
              className="px-3.5 py-2 rounded-xl"
              style={{ backgroundColor: '#EFF6FF', borderWidth: 1.5, borderColor: '#2563EB' }}
              onPress={() => onRebook?.(trip)}
              activeOpacity={0.7}
            >
              <Text className="text-xs font-semibold" style={{ color: '#2563EB' }}>Đặt lại</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="px-3.5 py-2 rounded-xl"
              style={{
                backgroundColor: canRate ? '#2563EB' : '#f3f4f6',
                borderWidth: 1.5,
                borderColor: canRate ? '#2563EB' : '#e5e7eb',
              }}
              onPress={() => canRate && onRate?.(trip)}
              activeOpacity={canRate ? 0.75 : 1}
            >
              <Text
                className="text-xs font-semibold"
                style={{ color: canRate ? '#ffffff' : '#9ca3af' }}
              >
                {trip.isRated ? 'Đã đánh giá' : 'Đánh giá'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Card>
    </TouchableOpacity>
  );
}
