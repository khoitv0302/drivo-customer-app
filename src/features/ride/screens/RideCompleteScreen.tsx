import { useState } from 'react';
import {
  Alert, Image, KeyboardAvoidingView, Platform, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRateTrip } from '@shared/hooks/useRateTrip';
import type { RootScreenProps } from '../../../navigation/types';

const RATING_LABELS = ['Chạm để chấm điểm', 'Rất tệ', 'Tệ', 'Bình thường', 'Tốt', 'Tuyệt vời!'];

function fmtVND(n: number) {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export default function RideCompleteScreen({ navigation, route }: RootScreenProps<'RideComplete'>) {
  const insets = useSafeAreaInsets();
  const { tripId, serviceType, pickupName, dropoffName, fare, paymentLabel, driverName, driverRating } = route.params;
  const isCar = serviceType === 'car';

  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState('');
  const { mutate: submitRating, isPending } = useRateTrip();

  const goHome = () => navigation.popToTop();

  const finish = (msg: string) => {
    Alert.alert('Hoàn tất', msg, [{ text: 'OK', onPress: goHome }]);
  };

  const handleSubmit = () => {
    if (stars === 0 || isPending) return;
    submitRating(
      { tripId, stars, comment: comment.trim() },
      {
        onSuccess: () => finish('Cảm ơn bạn đã đánh giá tài xế!'),
        onError: (err) => {
          const already = err.errors?.some((e) => e.code === 'RATING_ALREADY_SUBMITTED');
          if (already) finish('Bạn đã đánh giá chuyến này rồi.');
          else Alert.alert('Gửi đánh giá thất bại', err.message);
        },
      },
    );
  };

  const labelColor = stars === 0 ? '#9ca3af' : stars >= 4 ? '#f59e0b' : stars >= 3 ? '#9ca3af' : '#ef4444';

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#f9fafb' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header xanh + check */}
        <View style={[s.header, { paddingTop: insets.top + 24 }]}>
          <View style={s.checkCircle}>
            <Ionicons name="checkmark" size={40} color="white" />
          </View>
          <Text style={s.headerTitle}>Chuyến đi đã hoàn thành</Text>
          <Text style={s.headerSub}>Cảm ơn bạn đã đi cùng Drivo</Text>
        </View>

        <View style={{ paddingHorizontal: 16, marginTop: -28 }}>
          {/* Tổng tiền */}
          <View style={s.card}>
            <View style={s.fareRow}>
              <View style={s.vehicleIcon}>
                <MaterialCommunityIcons name={isCar ? 'car' : 'motorbike'} size={20} color="#2563EB" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={s.fareLabel}>Tổng thanh toán</Text>
                <Text style={s.payText}>{paymentLabel}</Text>
              </View>
              <Text style={s.fareValue}>{fmtVND(fare)}đ</Text>
            </View>

            <View style={s.divider} />

            {/* Lộ trình */}
            <View style={s.routeRow}>
              <View style={s.routeDots}>
                <View style={s.dotBlue} />
                <View style={s.routeLine} />
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
            </View>
          </View>

          {/* Đánh giá tài xế */}
          <View style={[s.card, { marginTop: 14, alignItems: 'center' }]}>
            <Image source={require('../../../../assets/avatar.jpg')} style={s.avatar} />
            <Text style={s.driverName}>{driverName}</Text>
            <View style={s.driverMeta}>
              <Ionicons name="star" size={13} color="#f59e0b" />
              <Text style={s.driverMetaText}>{driverRating.toFixed(1)}</Text>
              <Text style={s.driverMetaDivider}>•</Text>
              <Text style={s.driverMetaText}>{isCar ? 'Tài xế ô tô' : 'Tài xế xe máy'}</Text>
            </View>

            <Text style={s.rateTitle}>Đánh giá chuyến đi của bạn</Text>

            {/* Sao */}
            <View style={s.starsRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => setStars(star)}
                  activeOpacity={0.6}
                  hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                >
                  <Ionicons
                    name={star <= stars ? 'star' : 'star-outline'}
                    size={40}
                    color={star <= stars ? '#f59e0b' : '#e5e7eb'}
                  />
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[s.rateLabel, { color: labelColor }]}>{RATING_LABELS[stars]}</Text>

            {/* Comment */}
            <TextInput
              value={comment}
              onChangeText={setComment}
              placeholder="Chia sẻ trải nghiệm của bạn... (tùy chọn)"
              placeholderTextColor="#9ca3af"
              multiline
              style={s.commentInput}
            />
          </View>

          {/* Nút gửi */}
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={stars === 0 || isPending}
            activeOpacity={0.85}
            style={[s.submitBtn, (stars === 0 || isPending) && s.submitDisabled]}
          >
            <Text style={[s.submitText, (stars === 0 || isPending) && s.submitTextDisabled]}>
              {isPending ? 'Đang gửi...' : 'Gửi đánh giá'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={goHome} activeOpacity={0.7} style={s.skipBtn}>
            <Text style={s.skipText}>Bỏ qua</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  header: {
    backgroundColor: '#16a34a', alignItems: 'center', paddingBottom: 44,
    borderBottomLeftRadius: 28, borderBottomRightRadius: 28,
  },
  checkCircle: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: 'white' },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 4 },

  card: {
    backgroundColor: 'white', borderRadius: 18, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 3,
  },
  fareRow: { flexDirection: 'row', alignItems: 'center' },
  vehicleIcon: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: '#eff6ff',
    alignItems: 'center', justifyContent: 'center',
  },
  fareLabel: { fontSize: 13, color: '#6b7280' },
  payText: { fontSize: 13, fontWeight: '600', color: '#111827', marginTop: 2 },
  fareValue: { fontSize: 20, fontWeight: '800', color: '#111827' },

  divider: { height: 1, backgroundColor: '#f3f4f6', marginVertical: 14 },

  routeRow: { flexDirection: 'row', gap: 12 },
  routeDots: { alignItems: 'center', width: 12, paddingTop: 4 },
  dotBlue: { width: 11, height: 11, borderRadius: 6, backgroundColor: '#2563EB' },
  dotRed: { width: 11, height: 11, borderRadius: 6, backgroundColor: '#EF4444' },
  routeLine: { width: 2, flex: 1, minHeight: 22, backgroundColor: '#e5e7eb', marginVertical: 3 },
  routeLabel: { fontSize: 11, color: '#9ca3af' },
  routeValue: { fontSize: 14, fontWeight: '600', color: '#111827', marginTop: 2 },

  avatar: { width: 68, height: 68, borderRadius: 34 },
  driverName: { fontSize: 16, fontWeight: '700', color: '#111827', marginTop: 10 },
  driverMeta: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
  driverMetaText: { fontSize: 13, color: '#6b7280', fontWeight: '500' },
  driverMetaDivider: { color: '#d1d5db' },

  rateTitle: { fontSize: 14, fontWeight: '600', color: '#374151', marginTop: 18 },
  starsRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  rateLabel: { fontSize: 14, fontWeight: '600', marginTop: 8 },

  commentInput: {
    alignSelf: 'stretch', backgroundColor: '#f9fafb', borderRadius: 14, borderWidth: 1, borderColor: '#f3f4f6',
    paddingHorizontal: 14, paddingTop: 12, paddingBottom: 12, marginTop: 16,
    fontSize: 14, color: '#111827', textAlignVertical: 'top', minHeight: 84,
  },

  submitBtn: {
    backgroundColor: '#2563EB', borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginTop: 16,
    shadowColor: '#2563EB', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5,
  },
  submitDisabled: { backgroundColor: '#e5e7eb', shadowOpacity: 0, elevation: 0 },
  submitText: { color: 'white', fontSize: 16, fontWeight: '700' },
  submitTextDisabled: { color: '#9ca3af' },

  skipBtn: { alignItems: 'center', paddingVertical: 14, marginTop: 4 },
  skipText: { fontSize: 14, fontWeight: '600', color: '#6b7280' },
});
