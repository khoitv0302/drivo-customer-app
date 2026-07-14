import { useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Keyboard,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { ROUTES } from '../../../constants/routes';
import type { RootScreenProps } from '../../../navigation/types';
import { toE164Vn } from '@shared/utils/phone';
import { useRequestPasswordReset } from '../api/useRequestPasswordReset';
import { useToast } from '@shared/components/ui/Toast';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const CARD_MIN_HEIGHT = SCREEN_HEIGHT * 0.6;

export default function ForgotPasswordScreen({ navigation }: RootScreenProps<'ForgotPassword'>) {
  const [focused, setFocused] = useState(false);
  const [value, setValue] = useState('');
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const { mutate: requestReset, isPending } = useRequestPasswordReset();

  const handlePhoneChange = (text: string) => {
    const digits = text.replace(/[^0-9]/g, '');
    const max = digits.startsWith('0') ? 10 : 9;
    setValue(digits.slice(0, max));
  };

  const normalizePhone = (phone: string) => phone.replace(/^0+/, '');
  const isValid = normalizePhone(value).length >= 9;
  const canSubmit = isValid && !isPending;

  const handleContinue = () => {
    if (!canSubmit) return;
    Keyboard.dismiss();
    const phone = toE164Vn(value);
    requestReset(
      { phone },
      {
        onSuccess: () => {
          // Backend luôn 200 (chống dò tài khoản) → cứ sang màn nhập mã.
          navigation.navigate(ROUTES.VERIFY_RESET_CODE, {
            contact: `+84 ${normalizePhone(value)}`,
            phone,
          });
        },
        onError: (err) => {
          showToast(err.message, { type: 'error' });
        },
      },
    );
  };

  return (
    <View className="flex-1 bg-primary">
      {/* Back — góc trái trên */}
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        className="absolute left-4 z-10 w-10 h-10 items-center justify-center"
        style={{ top: insets.top + 6 }}
        activeOpacity={0.6}
        hitSlop={8}
      >
        <Ionicons name="arrow-back" size={24} color="white" />
      </TouchableOpacity>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        showsVerticalScrollIndicator={false}
      >
        <Pressable onPress={Keyboard.dismiss} className="flex-1">
          {/* Blue header — logo */}
          <View style={{ paddingTop: insets.top }} className="flex-1 items-center justify-center px-8">
            <View className="w-28 h-28 rounded-full bg-white/20 items-center justify-center">
              <MaterialCommunityIcons name="lock-reset" size={64} color="white" />
            </View>
            <Text className="text-white/90 text-base font-medium text-center mt-5 leading-6">
              Khôi phục quyền truy cập tài khoản của bạn
            </Text>
          </View>

          {/* White card */}
          <View
            className="bg-white rounded-t-3xl px-6 pt-3"
            style={{ minHeight: CARD_MIN_HEIGHT, paddingBottom: Math.max(insets.bottom, 28) }}
          >
            <View className="w-10 h-1 rounded-full bg-gray-200 self-center mb-6" />

            <Text className="text-3xl font-bold text-gray-900 text-center">Quên mật khẩu</Text>
            <Text className="text-sm text-gray-400 text-center mt-2 mb-7 leading-5">
              Nhập số điện thoại để nhận mã đặt lại mật khẩu
            </Text>

            {/* Label */}
            <Text className="text-sm font-medium text-gray-700 mb-2">Số điện thoại</Text>

            {/* Phone input */}
            <View
              className={`flex-row items-center border rounded-2xl mb-5 overflow-hidden ${
                focused ? 'border-primary bg-primary-light' : 'border-gray-200'
              }`}
            >
              <TouchableOpacity
                className={`flex-row items-center px-3 py-4 border-r gap-1.5 ${
                  focused ? 'border-primary/30' : 'border-gray-200'
                }`}
                activeOpacity={0.7}
              >
                <Text className="text-base">🇻🇳</Text>
                <Text className="text-sm font-medium text-gray-700">+84</Text>
                <Ionicons name="chevron-down" size={13} color="#9ca3af" />
              </TouchableOpacity>
              <TextInput
                className="flex-1 px-3 py-4 text-base text-gray-900"
                placeholder="Nhập số điện thoại"
                keyboardType="phone-pad"
                autoCorrect={false}
                placeholderTextColor="#9ca3af"
                value={value}
                onChangeText={handlePhoneChange}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
              />
            </View>

            {/* CTA button */}
            <TouchableOpacity
              className={`rounded-2xl py-4 flex-row items-center justify-center gap-2 ${
                canSubmit ? 'bg-primary' : 'bg-gray-200'
              }`}
              activeOpacity={0.85}
              disabled={!canSubmit}
              onPress={handleContinue}
            >
              {isPending && <ActivityIndicator size="small" color="white" />}
              <Text className={`font-semibold text-base ${canSubmit ? 'text-white' : 'text-gray-400'}`}>
                {isPending ? 'Đang gửi...' : 'Gửi mã đặt lại'}
              </Text>
              {!isPending && (
                <Ionicons name="arrow-forward" size={18} color={isValid ? 'white' : '#9ca3af'} />
              )}
            </TouchableOpacity>

            {/* Nhớ mật khẩu */}
            <View className="flex-row items-center justify-center mt-6">
              <Text className="text-sm text-gray-400">Nhớ mật khẩu rồi? </Text>
              <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
                <Text className="text-sm font-semibold text-primary">Đăng nhập</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </ScrollView>
    </View>
  );
}
