import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { RootScreenProps } from '../../../navigation/types';

const CURRENT_KM = 1792;
const CURRENT_TIER_INDEX = 1; // Gold

const TIERS = [
  { name: 'Bạc', minKm: 0, maxKm: 999, color: '#64748b', bgColor: '#f1f5f9', icon: 'shield-half-outline' as const },
  { name: 'Vàng', minKm: 1000, maxKm: 2999, color: '#d97706', bgColor: '#fffbeb', icon: 'star-outline' as const },
  { name: 'Bạch Kim', minKm: 3000, maxKm: 5999, color: '#2563EB', bgColor: '#EFF6FF', icon: 'diamond-outline' as const },
  { name: 'Kim Cương', minKm: 6000, maxKm: null, color: '#7c3aed', bgColor: '#f5f3ff', icon: 'trophy-outline' as const },
];

const BENEFITS = [
  { tier: 'Vàng', items: ['Giảm 10% mỗi chuyến', 'Tài xế ưu tiên', 'Hoàn tiền 2% vào ví', 'Hỗ trợ đường dây riêng'] },
];

const CURRENT_TIER = TIERS[CURRENT_TIER_INDEX];
const NEXT_TIER = TIERS[CURRENT_TIER_INDEX + 1];
const kmToNext = NEXT_TIER ? NEXT_TIER.minKm - CURRENT_KM : 0;
const progress = NEXT_TIER
  ? (CURRENT_KM - CURRENT_TIER.minKm) / (NEXT_TIER.minKm - CURRENT_TIER.minKm)
  : 1;

export default function MemberTierScreen({ navigation }: RootScreenProps<'MemberTier'>) {
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
            <Text className="text-xl font-bold text-white">Hạng thành viên</Text>
            <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12, marginTop: 1 }}>Tích lũy km để lên hạng</Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }} showsVerticalScrollIndicator={false}>
        {/* Current tier card */}
        <View className="rounded-2xl p-5 mb-5" style={{ backgroundColor: CURRENT_TIER.color, elevation: 3, shadowColor: CURRENT_TIER.color, shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } }}>
          <View className="flex-row items-center mb-4" style={{ gap: 12 }}>
            <View className="w-14 h-14 rounded-2xl items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
              <Ionicons name={CURRENT_TIER.icon} size={28} color="white" />
            </View>
            <View>
              <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12 }}>Hạng hiện tại của bạn</Text>
              <Text className="text-2xl font-bold text-white">{CURRENT_TIER.name}</Text>
            </View>
          </View>

          <View className="flex-row justify-between mb-2">
            <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12 }}>
              {CURRENT_KM.toLocaleString()} km đã đi
            </Text>
            {NEXT_TIER && (
              <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12 }}>
                Còn {kmToNext.toLocaleString()} km lên {NEXT_TIER.name}
              </Text>
            )}
          </View>

          {/* Progress bar */}
          <View className="h-2 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.25)' }}>
            <View className="h-2 rounded-full bg-white" style={{ width: `${Math.min(progress * 100, 100)}%` }} />
          </View>
        </View>

        {/* Current benefits */}
        <View className="bg-white rounded-2xl p-4 mb-5" style={{ elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } }}>
          <Text className="text-sm font-bold text-gray-900 mb-3">Quyền lợi hạng {CURRENT_TIER.name}</Text>
          <View style={{ gap: 10 }}>
            {BENEFITS[0].items.map((b) => (
              <View key={b} className="flex-row items-center" style={{ gap: 10 }}>
                <View className="w-5 h-5 rounded-full items-center justify-center" style={{ backgroundColor: CURRENT_TIER.bgColor }}>
                  <Ionicons name="checkmark" size={12} color={CURRENT_TIER.color} />
                </View>
                <Text className="text-sm text-gray-700">{b}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Tier progression */}
        <Text className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 px-1">Các hạng thành viên</Text>
        {TIERS.map((tier, idx) => {
          const isCurrent = idx === CURRENT_TIER_INDEX;
          const isPast = idx < CURRENT_TIER_INDEX;
          return (
            <View key={tier.name} className="flex-row items-center mb-3">
              {/* Line connector */}
              <View className="items-center mr-3" style={{ width: 44 }}>
                <View className="w-11 h-11 rounded-2xl items-center justify-center" style={{ backgroundColor: isCurrent || isPast ? tier.bgColor : '#f3f4f6', borderWidth: isCurrent ? 2 : 0, borderColor: tier.color }}>
                  <Ionicons name={tier.icon} size={20} color={isCurrent || isPast ? tier.color : '#d1d5db'} />
                </View>
              </View>
              <View className="flex-1 bg-white rounded-xl px-4 py-3" style={{ opacity: isPast || isCurrent ? 1 : 0.5, elevation: 1, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } }}>
                <View className="flex-row items-center justify-between">
                  <Text className="text-sm font-bold" style={{ color: isCurrent ? tier.color : '#374151' }}>{tier.name}</Text>
                  {isCurrent && <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: tier.bgColor }}><Text className="text-[10px] font-bold" style={{ color: tier.color }}>HIỆN TẠI</Text></View>}
                  {isPast && <Ionicons name="checkmark-circle" size={16} color={tier.color} />}
                </View>
                <Text className="text-xs text-gray-400 mt-0.5">
                  {tier.maxKm ? `${tier.minKm.toLocaleString()} – ${tier.maxKm.toLocaleString()} km` : `Từ ${tier.minKm.toLocaleString()} km`}
                </Text>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}
