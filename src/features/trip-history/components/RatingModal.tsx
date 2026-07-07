import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Image,
  Keyboard,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRateTrip } from '@shared/hooks/useRateTrip';
import type { Trip } from '../types';

const MODAL_HEIGHT = 480;
const RATING_LABELS = ['Chạm để chấm điểm', 'Rất tệ', 'Tệ', 'Bình thường', 'Tốt', 'Tuyệt vời!'];

interface Props {
  visible: boolean;
  trip: Trip | null;
  onClose: () => void;
  /** Gọi khi đánh giá thành công (hoặc đã đánh giá trước đó) để đồng bộ trạng thái. */
  onRated: (tripId: string) => void;
}

export default function RatingModal({ visible, trip, onClose, onRated }: Props) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const { mutate: submitRating, isPending } = useRateTrip();

  const slideAnim = useRef(new Animated.Value(MODAL_HEIGHT)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  // Offset riêng để đẩy sheet lên khi bàn phím xuất hiện
  const keyboardY = useRef(new Animated.Value(0)).current;

  // Mở / đóng sheet
  useEffect(() => {
    if (visible) {
      setRating(0);
      setComment('');
      keyboardY.setValue(0);
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          damping: 22,
          stiffness: 180,
          mass: 0.9,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Keyboard.dismiss();
      keyboardY.setValue(0);
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: MODAL_HEIGHT,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  // Lắng nghe bàn phím, đẩy sheet lên / xuống theo
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const onShow = Keyboard.addListener(showEvent, (e) => {
      Animated.timing(keyboardY, {
        toValue: -e.endCoordinates.height,
        duration: Platform.OS === 'ios' ? e.duration : 250,
        useNativeDriver: true,
      }).start();
    });

    const onHide = Keyboard.addListener(hideEvent, (e) => {
      Animated.timing(keyboardY, {
        toValue: 0,
        duration: Platform.OS === 'ios' ? e.duration : 250,
        useNativeDriver: true,
      }).start();
    });

    return () => {
      onShow.remove();
      onHide.remove();
    };
  }, []);

  const handleSubmit = () => {
    if (!trip || rating === 0 || isPending) return;
    submitRating(
      { tripId: trip.id, stars: rating, comment: comment.trim() },
      {
        onSuccess: () => {
          onRated(trip.id);
          onClose();
        },
        onError: (err) => {
          const already = err.errors?.some((e) => e.code === 'RATING_ALREADY_SUBMITTED');
          if (already) {
            // Đã đánh giá trước đó → vẫn đồng bộ trạng thái + đóng, không coi là lỗi cứng.
            onRated(trip.id);
            onClose();
            Alert.alert('Đã đánh giá', 'Bạn đã đánh giá chuyến này rồi.');
          } else {
            Alert.alert('Gửi đánh giá thất bại', err.message);
          }
        },
      },
    );
  };

  const canSubmit = rating > 0 && !isPending;

  return (
    <Modal
      transparent
      animationType="none"
      visible={visible}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Backdrop */}
      <Animated.View
        style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.55)', opacity: backdropOpacity }]}
        pointerEvents="none"
      />
      <TouchableWithoutFeedback onPress={() => { Keyboard.dismiss(); onClose(); }}>
        <View style={StyleSheet.absoluteFillObject} />
      </TouchableWithoutFeedback>

      {/* Sheet — translateY = slideAnim + keyboardY */}
      <Animated.View
        style={[
          styles.sheet,
          { transform: [{ translateY: Animated.add(slideAnim, keyboardY) }] },
        ]}
      >
        {/* Handle bar */}
        <View className="items-center pt-3.5 pb-1">
          <View className="w-10 h-1 rounded-full bg-gray-200" />
        </View>

        {/* Title row */}
        <View className="flex-row items-center justify-between px-5 pt-3 pb-4">
          <Text className="text-xl font-bold text-gray-900">Đánh giá tài xế</Text>
          <TouchableOpacity
            onPress={() => { Keyboard.dismiss(); onClose(); }}
            className="w-9 h-9 rounded-full bg-gray-100 items-center justify-center"
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={20} color="#6b7280" />
          </TouchableOpacity>
        </View>

        {/* Driver avatar & info */}
        {trip && (
          <View className="items-center pb-5">
            <Image
              source={require('../../../../assets/avatar.jpg')}
              className="w-20 h-20 rounded-full mb-3"
              style={styles.avatarShadow}
            />
            <Text className="text-base font-bold text-gray-900">{trip.driver.name}</Text>
            <Text className="text-sm text-gray-400 mt-0.5">Tài xế</Text>
          </View>
        )}

        {/* Stars */}
        <View className="items-center pb-2">
          <View className="flex-row" style={{ gap: 10 }}>
            {[1, 2, 3, 4, 5].map(star => (
              <TouchableOpacity
                key={star}
                onPress={() => setRating(star)}
                activeOpacity={0.6}
                hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
              >
                <Ionicons
                  name={star <= rating ? 'star' : 'star-outline'}
                  size={42}
                  color={star <= rating ? '#f59e0b' : '#e5e7eb'}
                />
              </TouchableOpacity>
            ))}
          </View>
          <Text
            className="text-sm font-semibold mt-2"
            style={{
              color: rating === 0 ? '#9ca3af'
                : rating >= 4 ? '#f59e0b'
                : rating >= 3 ? '#9ca3af'
                : '#ef4444',
            }}
          >
            {RATING_LABELS[rating]}
          </Text>
        </View>

        {/* Comment input */}
        <View className="mx-5 mt-4">
          <TextInput
            value={comment}
            onChangeText={setComment}
            placeholder="Chia sẻ trải nghiệm của bạn... (tùy chọn)"
            placeholderTextColor="#9ca3af"
            multiline
            style={styles.textInput}
          />
        </View>

        {/* Submit button */}
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={!canSubmit}
          activeOpacity={0.85}
          style={[styles.submitButton, !canSubmit && styles.submitDisabled]}
        >
          <Text style={[styles.submitText, !canSubmit && styles.submitTextDisabled]}>
            {isPending ? 'Đang gửi...' : 'Gửi đánh giá'}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -6 },
    elevation: 16,
  },
  avatarShadow: {
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  textInput: {
    backgroundColor: '#f9fafb',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    fontSize: 14,
    color: '#111827',
    textAlignVertical: 'top',
    minHeight: 84,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  submitButton: {
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 36,
    backgroundColor: '#2563EB',
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#2563EB',
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  submitDisabled: {
    backgroundColor: '#f3f4f6',
    shadowOpacity: 0,
    elevation: 0,
  },
  submitText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  submitTextDisabled: {
    color: '#9ca3af',
  },
});
