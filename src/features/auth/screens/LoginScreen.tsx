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
import { useAuthStore } from '../../../store';
import { useLogin } from '../api/useLogin';

type Language = 'vi' | 'en';

const LANGUAGES: Record<Language, { flag: string; label: string }> = {
  vi: { flag: '🇻🇳', label: 'Tiếng Việt' },
  en: { flag: '🇬🇧', label: 'English' },
};

const SCREEN_HEIGHT = Dimensions.get('window').height;
const CARD_MIN_HEIGHT = SCREEN_HEIGHT * 0.6;

export default function LoginScreen({ navigation }: RootScreenProps<'Login'>) {
  const [language, setLanguage] = useState<Language>('vi');
  const [focusedField, setFocusedField] = useState<'contact' | 'password' | null>(null);
  const [value, setValue] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const insets = useSafeAreaInsets();
  const setSession = useAuthStore(s => s.setSession);
  const { mutate: login, isPending: isLoggingIn } = useLogin();

  const toggleLanguage = () => setLanguage((prev) => (prev === 'vi' ? 'en' : 'vi'));

  // Chỉ giữ số; giới hạn 11 số nếu bắt đầu bằng 0, ngược lại 9 số
  const handlePhoneChange = (text: string) => {
    const digits = text.replace(/[^0-9]/g, '');
    const max = digits.startsWith('0') ? 10 : 9;
    setValue(digits.slice(0, max));
    if (errorMsg) setErrorMsg(null);
  };

  // Bỏ số 0 đầu vì đã có +84
  const normalizePhone = (phone: string) => phone.replace(/^0+/, '');

  // Hợp lệ: SĐT ≥ 9 số (sau khi bỏ 0 đầu) và mật khẩu ≥ 6 ký tự
  const contactValid = normalizePhone(value).length >= 9;
  const isValid = contactValid && password.length >= 6;
  const canSubmit = isValid && !isLoggingIn;

  const handleContinue = () => {
    if (!canSubmit) return;
    Keyboard.dismiss();
    setErrorMsg(null);
    // Ghép E.164: +84 + SĐT đã bỏ số 0 đầu, vd "+84912345678"
    const phone = `+84${normalizePhone(value)}`;
    login(
      { phone, password },
      {
        // Đăng nhập bằng mật khẩu ⇒ tài khoản đã có hồ sơ → lưu session, RootNavigator vào Home.
        onSuccess: (session) => setSession(session),
        onError: (err) => setErrorMsg(err.message),
      },
    );
  };

  return (
    <View className="flex-1 bg-primary">
      {/* Language switcher — góc phải trên */}
      <View
        className="absolute right-5 z-10"
        style={{ top: insets.top + 8 }}
      >
        <TouchableOpacity
          onPress={toggleLanguage}
          activeOpacity={0.8}
          className="flex-row items-center bg-white rounded-full pl-3 pr-2.5 py-2 gap-1.5 shadow-md"
          style={{ shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } }}
        >
          <Text className="text-base">{LANGUAGES[language].flag}</Text>
          <Text className="text-sm font-semibold text-gray-800">
            {language === 'vi' ? 'VI' : 'EN'}
          </Text>
          <Ionicons name="chevron-down" size={13} color="#9ca3af" />
        </TouchableOpacity>
      </View>

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
                <MaterialCommunityIcons name="steering" size={64} color="white" />
              </View>
              <Text className="text-white/90 text-base font-medium text-center mt-5 leading-6">
                Tài xế riêng cho mọi hành trình của bạn
              </Text>
            </View>

            {/* White card */}
            <View
              className="bg-white rounded-t-3xl px-6 pt-3"
              style={{ minHeight: CARD_MIN_HEIGHT, paddingBottom: Math.max(insets.bottom, 28) }}
            >
              {/* Drag handle */}
              <View className="w-10 h-1 rounded-full bg-gray-200 self-center mb-6" />

              <Text className="text-3xl font-bold text-gray-900 text-center">Thuê lái</Text>
              <Text className="text-sm text-gray-400 text-center mt-2 mb-7 leading-5">
                Tài xế riêng cho mọi hành trình của bạn
              </Text>

              {/* Label */}
              <Text className="text-sm font-medium text-gray-700 mb-2">Số điện thoại</Text>

              {/* Input số điện thoại */}
              <View
                className={`flex-row items-center border rounded-2xl mb-4 overflow-hidden ${
                  focusedField === 'contact' ? 'border-primary bg-primary-light' : 'border-gray-200'
                }`}
              >
                <TouchableOpacity
                  className={`flex-row items-center px-3 py-4 border-r gap-1.5 ${
                    focusedField === 'contact' ? 'border-primary/30' : 'border-gray-200'
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
                  onFocus={() => setFocusedField('contact')}
                  onBlur={() => setFocusedField(null)}
                />
              </View>

              {/* Label mật khẩu */}
              <Text className="text-sm font-medium text-gray-700 mb-2">Mật khẩu</Text>

              {/* Input mật khẩu */}
              <View
                className={`flex-row items-center border rounded-2xl mb-2 ${
                  focusedField === 'password' ? 'border-primary bg-primary-light' : 'border-gray-200'
                }`}
              >
                <TextInput
                  className="flex-1 px-4 py-4 text-base text-gray-900"
                  placeholder="Nhập mật khẩu"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  textContentType="oneTimeCode"
                  autoComplete="off"
                  placeholderTextColor="#9ca3af"
                  value={password}
                  onChangeText={(t) => {
                    setPassword(t);
                    if (errorMsg) setErrorMsg(null);
                  }}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword((s) => !s)}
                  className="px-4 py-4"
                  activeOpacity={0.7}
                  hitSlop={6}
                >
                  <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#9ca3af" />
                </TouchableOpacity>
              </View>

              {/* Quên mật khẩu */}
              <TouchableOpacity
                className="self-end mb-5"
                activeOpacity={0.7}
                onPress={() => navigation.navigate(ROUTES.FORGOT_PASSWORD)}
              >
                <Text className="text-sm font-medium text-primary">Quên mật khẩu?</Text>
              </TouchableOpacity>

              {/* Thông báo lỗi đăng nhập */}
              {errorMsg ? (
                <View className="flex-row items-center bg-red-50 rounded-xl px-3 py-2.5 mb-4">
                  <Ionicons name="alert-circle-outline" size={18} color="#ef4444" />
                  <Text className="text-sm text-red-500 ml-2 flex-1">{errorMsg}</Text>
                </View>
              ) : null}

              {/* CTA button */}
              <TouchableOpacity
                className={`rounded-2xl py-4 flex-row items-center justify-center gap-2 ${
                  canSubmit ? 'bg-primary' : 'bg-gray-200'
                }`}
                activeOpacity={0.85}
                disabled={!canSubmit}
                onPress={handleContinue}
              >
                {isLoggingIn ? (
                  <ActivityIndicator size="small" color="#9ca3af" />
                ) : (
                  <>
                    <Text className={`font-semibold text-base ${isValid ? 'text-white' : 'text-gray-400'}`}>
                      Tiếp tục
                    </Text>
                    <Ionicons name="arrow-forward" size={18} color={isValid ? 'white' : '#9ca3af'} />
                  </>
                )}
              </TouchableOpacity>

              {/* Đăng ký */}
              <View className="flex-row items-center justify-center mt-5">
                <Text className="text-sm text-gray-400">Chưa có tài khoản? </Text>
                <TouchableOpacity onPress={() => navigation.navigate(ROUTES.REGISTER)} activeOpacity={0.7}>
                  <Text className="text-sm font-semibold text-primary">Đăng ký tài khoản</Text>
                </TouchableOpacity>
              </View>

              {/* Terms */}
              <Text className="text-center text-xs text-gray-400 mt-5 leading-5">
                Bằng việc tiếp tục, bạn đồng ý với{' '}
                <Text className="text-primary font-medium">Điều khoản & Chính sách bảo mật</Text>
              </Text>
            </View>
          </Pressable>
        </ScrollView>
    </View>
  );
}
