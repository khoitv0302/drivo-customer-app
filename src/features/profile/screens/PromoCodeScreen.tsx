import { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useToast } from '@shared/components/ui/Toast';
import type { RootScreenProps } from '../../../navigation/types';

const MOCK_PROMOS = [
  { id: '1', code: 'DRIVO20', description: 'Giảm 20% chuyến đi đầu tiên', expiry: '30/06/2026', discount: '20%', isUsed: false },
  { id: '2', code: 'WELCOME50', description: 'Giảm 50.000đ cho khách hàng mới', expiry: '31/07/2026', discount: '50.000đ', isUsed: false },
  { id: '3', code: 'SUMMER10', description: 'Giảm 10% dịp hè 2026', expiry: '31/08/2026', discount: '10%', isUsed: false },
  { id: '4', code: 'OLDCODE', description: 'Mã đã sử dụng', expiry: '01/01/2026', discount: '15%', isUsed: true },
];

export default function PromoCodeScreen({ navigation }: RootScreenProps<'PromoCode'>) {
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const [input, setInput] = useState('');

  function applyCode() {
    const trimmed = input.trim().toUpperCase();
    if (!trimmed) return;
    const found = MOCK_PROMOS.find(p => p.code === trimmed);
    if (!found) {
      showToast('Mã khuyến mãi không tồn tại hoặc đã hết hạn.', { type: 'error' });
    } else if (found.isUsed) {
      showToast('Mã này đã được sử dụng trước đó.', { type: 'info' });
    } else {
      showToast(`Đã áp dụng mã ${found.code} — ${found.description}`, { type: 'success' });
      setInput('');
    }
  }

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
            <Text className="text-xl font-bold text-white">Mã Khuyến mãi</Text>
            <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12, marginTop: 1 }}>Nhập hoặc chọn mã để áp dụng</Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }} showsVerticalScrollIndicator={false}>
        {/* Input row */}
        <View className="bg-white rounded-2xl p-4 mb-5" style={{ elevation: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } }}>
          <Text className="text-sm font-semibold text-gray-700 mb-2">Nhập mã khuyến mãi</Text>
          <View className="flex-row gap-2">
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder="VD: DRIVO20"
              placeholderTextColor="#9ca3af"
              autoCapitalize="characters"
              className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-base bg-gray-50"
            />
            <TouchableOpacity onPress={applyCode} activeOpacity={0.8}
              className="rounded-xl px-4 items-center justify-center"
              style={{ backgroundColor: '#2563EB' }}>
              <Text className="text-white font-bold text-sm">Áp dụng</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Available promos */}
        <Text className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 px-1">Mã của bạn</Text>
        {MOCK_PROMOS.map((promo) => (
          <TouchableOpacity
            key={promo.id}
            activeOpacity={promo.isUsed ? 1 : 0.75}
            onPress={() => !promo.isUsed && setInput(promo.code)}
            className="bg-white rounded-2xl mb-3 overflow-hidden"
            style={{ opacity: promo.isUsed ? 0.5 : 1, elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } }}
          >
            <View className="flex-row">
              {/* Left accent */}
              <View className="w-1.5 rounded-l-2xl" style={{ backgroundColor: promo.isUsed ? '#d1d5db' : '#2563EB' }} />
              <View className="flex-1 p-4 flex-row items-center" style={{ gap: 12 }}>
                <View className="w-11 h-11 rounded-xl items-center justify-center" style={{ backgroundColor: promo.isUsed ? '#f3f4f6' : '#EFF6FF' }}>
                  <Ionicons name="pricetag-outline" size={20} color={promo.isUsed ? '#9ca3af' : '#2563EB'} />
                </View>
                <View className="flex-1">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-base font-bold text-gray-900">{promo.code}</Text>
                    <View className="rounded-full px-2.5 py-0.5" style={{ backgroundColor: promo.isUsed ? '#f3f4f6' : '#dcfce7' }}>
                      <Text className="text-xs font-bold" style={{ color: promo.isUsed ? '#9ca3af' : '#16a34a' }}>
                        -{promo.discount}
                      </Text>
                    </View>
                  </View>
                  <Text className="text-sm text-gray-500 mt-0.5">{promo.description}</Text>
                  <View className="flex-row items-center mt-1" style={{ gap: 4 }}>
                    <Ionicons name="time-outline" size={12} color="#9ca3af" />
                    <Text className="text-xs text-gray-400">
                      {promo.isUsed ? 'Đã sử dụng' : `HSD: ${promo.expiry}`}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}
