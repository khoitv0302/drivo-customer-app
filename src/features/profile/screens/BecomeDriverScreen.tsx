import { View, Text, TouchableOpacity, ScrollView, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { RootScreenProps } from '../../../navigation/types';

const STEPS = [
  { step: '01', title: 'Đăng ký trực tuyến', desc: 'Điền thông tin cá nhân và thông tin phương tiện qua ứng dụng hoặc website.' },
  { step: '02', title: 'Nộp hồ sơ', desc: 'Cung cấp bằng lái xe, giấy tờ xe và ảnh chân dung hợp lệ.' },
  { step: '03', title: 'Đào tạo & kiểm tra', desc: 'Tham gia khóa đào tạo trực tuyến và vượt qua bài kiểm tra năng lực.' },
  { step: '04', title: 'Bắt đầu nhận chuyến', desc: 'Sau khi được duyệt, bạn có thể bắt đầu nhận chuyến và kiếm thu nhập ngay.' },
];

const BENEFITS = [
  { icon: 'cash-outline' as const, title: 'Thu nhập hấp dẫn', desc: 'Kiếm trên 20 triệu/tháng với lịch làm việc linh hoạt' },
  { icon: 'time-outline' as const, title: 'Giờ giấc tự do', desc: 'Tự chủ thời gian, nhận chuyến khi bạn muốn' },
  { icon: 'shield-checkmark-outline' as const, title: 'Bảo hiểm đầy đủ', desc: 'Được bảo hiểm tai nạn trong toàn bộ ca làm việc' },
  { icon: 'trending-up-outline' as const, title: 'Thưởng theo hiệu suất', desc: 'Thưởng thêm khi đạt mục tiêu chuyến và đánh giá cao' },
];

export default function BecomeDriverScreen({ navigation }: RootScreenProps<'BecomeDriver'>) {
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View style={{ backgroundColor: '#2563EB', paddingTop: insets.top }}>
        <View style={{ position: 'absolute', right: -30, top: insets.top - 10, width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(255,255,255,0.06)' }} />
        <View style={{ position: 'absolute', left: -20, bottom: -30, width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.04)' }} />
        <View className="flex-row items-center px-5 pt-4 pb-6" style={{ gap: 14 }}>
          <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}
            style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="arrow-back" size={20} color="white" />
          </TouchableOpacity>
          <View>
            <Text className="text-xl font-bold text-white">Trở thành tài xế Drivo</Text>
            <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12, marginTop: 1 }}>Kiếm thu nhập với lịch làm việc tự do</Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 24 }} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View className="bg-blue-600 px-6 pt-2 pb-8 items-center">
          <View className="w-24 h-24 rounded-full bg-white/20 items-center justify-center mb-4">
            <Ionicons name="car-sport" size={48} color="white" />
          </View>
          <Text className="text-2xl font-black text-white text-center">Lái xe – Kiếm tiền{'\n'}Làm chủ thời gian</Text>
          <Text className="text-sm text-white/70 text-center mt-2 leading-5">Hơn 10.000 tài xế đang kiếm thu nhập{'\n'}ổn định cùng Drivo mỗi ngày</Text>
        </View>

        <View style={{ padding: 16 }}>
          {/* Benefits */}
          <Text className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 px-1">Quyền lợi khi tham gia</Text>
          <View className="flex-row flex-wrap" style={{ gap: 12, marginBottom: 20 }}>
            {BENEFITS.map((b) => (
              <View key={b.title} className="bg-white rounded-2xl p-4" style={{ width: '47%', elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } }}>
                <View className="w-10 h-10 rounded-xl bg-blue-50 items-center justify-center mb-2">
                  <Ionicons name={b.icon} size={20} color="#2563EB" />
                </View>
                <Text className="text-sm font-bold text-gray-800 mb-1">{b.title}</Text>
                <Text className="text-xs text-gray-500 leading-4">{b.desc}</Text>
              </View>
            ))}
          </View>

          {/* Steps */}
          <Text className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 px-1">Quy trình đăng ký</Text>
          <View className="bg-white rounded-2xl p-4 mb-5" style={{ elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } }}>
            {STEPS.map((s, idx) => (
              <View key={s.step}>
                <View className="flex-row py-3" style={{ gap: 14 }}>
                  <View className="w-9 h-9 rounded-full bg-blue-600 items-center justify-center flex-shrink-0 mt-0.5">
                    <Text className="text-xs font-black text-white">{s.step}</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-bold text-gray-800">{s.title}</Text>
                    <Text className="text-sm text-gray-500 mt-1 leading-5">{s.desc}</Text>
                  </View>
                </View>
                {idx < STEPS.length - 1 && (
                  <View className="h-px bg-gray-100 ml-[46px]" />
                )}
              </View>
            ))}
          </View>

          {/* Requirements */}
          <View className="bg-amber-50 rounded-2xl p-4 mb-5 border border-amber-200">
            <View className="flex-row items-center mb-2" style={{ gap: 8 }}>
              <Ionicons name="alert-circle-outline" size={18} color="#d97706" />
              <Text className="text-sm font-bold text-amber-800">Yêu cầu cơ bản</Text>
            </View>
            {['Tuổi từ 21 đến 55', 'Bằng lái xe hạng B2 trở lên', 'Phương tiện không quá 10 tuổi', 'Không có tiền án tiền sự', 'Sức khỏe tốt, không mắc bệnh mãn tính'].map(r => (
              <View key={r} className="flex-row items-center mt-1.5" style={{ gap: 8 }}>
                <Ionicons name="checkmark-circle-outline" size={14} color="#d97706" />
                <Text className="text-sm text-amber-800">{r}</Text>
              </View>
            ))}
          </View>

          {/* CTA */}
          <TouchableOpacity onPress={() => Linking.openURL('https://drivo.vn')} activeOpacity={0.85}
            className="rounded-2xl py-4 items-center" style={{ backgroundColor: '#2563EB' }}>
            <Text className="text-white font-bold text-base">Đăng ký ngay</Text>
          </TouchableOpacity>
          <Text className="text-center text-xs text-gray-400 mt-3">Hoặc gọi hotline <Text className="text-blue-600 font-semibold">1900 6789</Text> để được tư vấn</Text>
        </View>
      </ScrollView>
    </View>
  );
}
