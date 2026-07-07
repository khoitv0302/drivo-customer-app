import { ScrollView, View, Text, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { RootScreenProps } from '../../../navigation/types';

const PACKAGES = [
  {
    id: 'basic',
    name: 'Cơ Bản',
    price: 'Miễn phí',
    color: '#6b7280',
    bgColor: '#f3f4f6',
    icon: 'person-outline' as const,
    current: false,
    features: [
      'Đặt xe không giới hạn',
      'Hỗ trợ 24/7',
      'Lịch sử chuyến đi',
    ],
  },
  {
    id: 'silver',
    name: 'Bạc',
    price: '49.000đ / tháng',
    color: '#64748b',
    bgColor: '#f1f5f9',
    icon: 'shield-half-outline' as const,
    current: false,
    features: [
      'Tất cả tính năng Cơ Bản',
      'Giảm 5% mỗi chuyến',
      'Ưu tiên ghép xe',
      'Mã khuyến mãi độc quyền',
    ],
  },
  {
    id: 'gold',
    name: 'Vàng',
    price: '99.000đ / tháng',
    color: '#d97706',
    bgColor: '#fffbeb',
    icon: 'star-outline' as const,
    current: true,
    features: [
      'Tất cả tính năng Bạc',
      'Giảm 10% mỗi chuyến',
      'Tài xế ưu tiên',
      'Hoàn tiền 2% vào ví',
      'Hỗ trợ đường dây riêng',
    ],
  },
  {
    id: 'platinum',
    name: 'Bạch Kim',
    price: '199.000đ / tháng',
    color: '#2563EB',
    bgColor: '#EFF6FF',
    icon: 'diamond-outline' as const,
    current: false,
    features: [
      'Tất cả tính năng Vàng',
      'Giảm 15% mỗi chuyến',
      'Tài xế riêng theo yêu cầu',
      'Hoàn tiền 5% vào ví',
      'Miễn phí hủy chuyến',
      'Quản lý chuyến đi doanh nghiệp',
    ],
  },
];

export default function MembershipPackagesScreen({ navigation }: RootScreenProps<'MembershipPackages'>) {
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View style={{ backgroundColor: '#2563EB', paddingTop: insets.top }}>
        <View style={{ position: 'absolute', right: -30, top: insets.top - 10, width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(255,255,255,0.06)' }} />
        <View className="flex-row items-center px-5 pt-4 pb-6" style={{ gap: 14 }}>
          <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}
            style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="arrow-back" size={20} color="white" />
          </TouchableOpacity>
          <View>
            <Text className="text-xl font-bold text-white">Gói hội viên</Text>
            <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12, marginTop: 1 }}>Nâng cấp để nhận thêm ưu đãi</Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }} showsVerticalScrollIndicator={false}>
        {PACKAGES.map((pkg) => (
          <View
            key={pkg.id}
            className="bg-white rounded-2xl mb-4 overflow-hidden"
            style={{ borderWidth: pkg.current ? 2 : 1, borderColor: pkg.current ? pkg.color : '#e5e7eb', elevation: pkg.current ? 3 : 1, shadowColor: pkg.color, shadowOpacity: pkg.current ? 0.15 : 0.04, shadowRadius: 10, shadowOffset: { width: 0, height: 3 } }}
          >
            {pkg.current && (
              <View style={{ backgroundColor: pkg.color }} className="py-1.5 items-center">
                <Text className="text-white text-xs font-bold tracking-wide">GÓI HIỆN TẠI</Text>
              </View>
            )}

            <View className="p-4">
              {/* Package header */}
              <View className="flex-row items-center mb-3">
                <View className="w-11 h-11 rounded-2xl items-center justify-center mr-3" style={{ backgroundColor: pkg.bgColor }}>
                  <Ionicons name={pkg.icon} size={22} color={pkg.color} />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-bold text-gray-900">{pkg.name}</Text>
                  <Text className="text-sm font-semibold" style={{ color: pkg.color }}>{pkg.price}</Text>
                </View>
              </View>

              {/* Features */}
              <View style={{ gap: 8 }}>
                {pkg.features.map((f) => (
                  <View key={f} className="flex-row items-center" style={{ gap: 8 }}>
                    <Ionicons name="checkmark-circle" size={16} color={pkg.color} />
                    <Text className="text-sm text-gray-700 flex-1">{f}</Text>
                  </View>
                ))}
              </View>

              {/* CTA */}
              {!pkg.current && (
                <TouchableOpacity activeOpacity={0.8} className="mt-4 rounded-xl py-3 items-center" style={{ backgroundColor: pkg.bgColor }}>
                  <Text className="text-sm font-bold" style={{ color: pkg.color }}>Nâng cấp lên {pkg.name}</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
