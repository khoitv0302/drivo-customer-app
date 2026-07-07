import { View, Text, TouchableOpacity, ScrollView, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { RootScreenProps } from '../../../navigation/types';

const FAQS = [
  { q: 'Làm thế nào để đặt xe?', a: 'Mở ứng dụng, chọn loại xe, nhập điểm đến và xác nhận đặt xe. Tài xế sẽ được ghép trong vài giây.' },
  { q: 'Tôi có thể hủy chuyến không?', a: 'Bạn có thể hủy chuyến trong vòng 3 phút đầu miễn phí. Sau đó có thể phát sinh phí hủy theo quy định.' },
  { q: 'Phương thức thanh toán nào được hỗ trợ?', a: 'Drivo hỗ trợ thanh toán qua ví Drivo, thẻ ngân hàng (ATM/Visa/Mastercard) và tiền mặt.' },
  { q: 'Làm sao để liên hệ tài xế?', a: 'Sau khi đặt xe thành công, bạn có thể nhắn tin hoặc gọi điện cho tài xế ngay trong ứng dụng.' },
  { q: 'Tôi quên đồ trên xe phải làm gì?', a: 'Vào Lịch sử chuyến đi, chọn chuyến cần hỗ trợ và nhấn "Báo cáo vấn đề" để kết nối lại với tài xế.' },
  { q: 'Ứng dụng hỗ trợ những thành phố nào?', a: 'Drivo hiện phục vụ tại TP. Hồ Chí Minh, Hà Nội, Đà Nẵng và đang mở rộng ra các tỉnh thành khác.' },
];

const CONTACTS = [
  { icon: 'call-outline' as const, label: 'Hotline hỗ trợ', value: '1900 6789', action: () => Linking.openURL('tel:19006789') },
  { icon: 'mail-outline' as const, label: 'Email hỗ trợ', value: 'support@drivo.vn', action: () => Linking.openURL('mailto:support@drivo.vn') },
  { icon: 'chatbubble-outline' as const, label: 'Chat trực tuyến', value: 'Thứ 2 – Chủ nhật, 7:00–22:00', action: () => {} },
];

export default function SupportCenterScreen({ navigation }: RootScreenProps<'SupportCenter'>) {
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
            <Text className="text-xl font-bold text-white">Trung tâm hỗ trợ</Text>
            <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12, marginTop: 1 }}>Chúng tôi luôn sẵn sàng giúp bạn</Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }} showsVerticalScrollIndicator={false}>
        {/* Contact channels */}
        <Text className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 px-1">Liên hệ với chúng tôi</Text>
        {CONTACTS.map((c) => (
          <TouchableOpacity key={c.label} onPress={c.action} activeOpacity={0.75}
            className="bg-white rounded-2xl mb-3 p-4 flex-row items-center"
            style={{ gap: 12, elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } }}>
            <View className="w-11 h-11 rounded-2xl bg-blue-50 items-center justify-center">
              <Ionicons name={c.icon} size={20} color="#2563EB" />
            </View>
            <View className="flex-1">
              <Text className="text-xs text-gray-400">{c.label}</Text>
              <Text className="text-sm font-semibold text-gray-900 mt-0.5">{c.value}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
          </TouchableOpacity>
        ))}

        {/* FAQ */}
        <Text className="text-sm font-semibold text-gray-500 uppercase tracking-wide mt-2 mb-3 px-1">Câu hỏi thường gặp</Text>
        {FAQS.map((faq, idx) => (
          <FAQItem key={idx} question={faq.q} answer={faq.a} />
        ))}
      </ScrollView>
    </View>
  );
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = React.useState(false);
  return (
    <TouchableOpacity onPress={() => setOpen(o => !o)} activeOpacity={0.8}
      className="bg-white rounded-2xl mb-3 overflow-hidden"
      style={{ elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } }}>
      <View className="flex-row items-center p-4" style={{ gap: 12 }}>
        <Text className="flex-1 text-sm font-semibold text-gray-800">{question}</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color="#9ca3af" />
      </View>
      {open && (
        <View className="px-4 pb-4">
          <View className="h-px bg-gray-100 mb-3" />
          <Text className="text-sm text-gray-600 leading-6">{answer}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

import React from 'react';
