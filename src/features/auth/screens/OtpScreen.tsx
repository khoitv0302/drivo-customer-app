import { useEffect, useRef, useState } from 'react';
import { Alert, Keyboard, Pressable, Text, TextInput, TouchableOpacity, Vibration, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import type { RootScreenProps } from '../../../navigation/types';
import { ROUTES } from '../../../constants/routes';
import { useAuthStore } from '../../../store';
import { getMe } from '@services/customer/customerService';
import { useRequestOtp } from '../api/useRequestOtp';
import { useVerifyOtp } from '../api/useVerifyOtp';

const OTP_LENGTH = 6;
const EXPIRE_SECONDS = 150; // 02:30
const RESEND_SECONDS = 30; // 00:30

function formatTime(total: number) {
  const m = Math.floor(total / 60).toString().padStart(2, '0');
  const s = (total % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export default function OtpScreen({ navigation, route }: RootScreenProps<'Otp'>) {
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState(false); // mã sai → viền đỏ toàn bộ ô
  const [checking, setChecking] = useState(false); // đang gọi /me sau khi verify OK
  const [expire, setExpire] = useState(EXPIRE_SECONDS);
  const [resend, setResend] = useState(RESEND_SECONDS);
  const setSession = useAuthStore(s => s.setSession);
  const { phone, method } = route.params;
  const { mutate: verify, isPending: isVerifying } = useVerifyOtp();
  const { mutate: sendOtp, isPending: isResending } = useRequestOtp();

  // Countdown hết hạn mã
  useEffect(() => {
    if (expire <= 0) return;
    const t = setInterval(() => setExpire((v) => v - 1), 1000);
    return () => clearInterval(t);
  }, [expire]);

  // Countdown gửi lại
  useEffect(() => {
    if (resend <= 0) return;
    const t = setInterval(() => setResend((v) => v - 1), 1000);
    return () => clearInterval(t);
  }, [resend]);

  const handleChange = (text: string) => {
    if (isVerifying || checking) return;
    const digits = text.replace(/[^0-9]/g, '').slice(0, OTP_LENGTH);
    setError(false); // đang gõ lại → bỏ trạng thái đỏ
    setCode(digits);
    // Đủ 6 số → tự động xác thực, không cần bấm nút
    if (digits.length === OTP_LENGTH) {
      submit(digits);
    }
  };

  const submit = (fullCode: string) => {
    if (isVerifying || checking) return;
    verify(
      { phone, code: fullCode },
      {
        onSuccess: async (session) => {
          // Verify OK → lấy hồ sơ để quyết định điều hướng
          setChecking(true);
          try {
            const me = await getMe(session.accessToken);
            if (me.hasCustomerProfile) {
              // Đã có hồ sơ → lưu session, RootNavigator tự vào Home
              setSession(session);
            } else {
              // Tài khoản mới → sang màn tạo tên + mật khẩu (chưa lưu session)
              navigation.navigate(ROUTES.CREATE_PROFILE, {
                session,
                contact: route.params.contact,
              });
            }
          } catch (e) {
            // Không lấy được /me → vẫn đăng nhập để không kẹt flow
            setSession(session);
          } finally {
            setChecking(false);
          }
        },
        onError: (err) => {
          const invalidOtp = err.errors?.some((e) => e.code === 'INVALID_OTP');
          if (invalidOtp) {
            // Mã sai → viền đỏ toàn bộ ô + rung, giữ mã để user xoá sửa
            setError(true);
            Vibration.vibrate(200);
          } else {
            // Lỗi khác (hết hạn, mạng...) → thông báo + xoá mã
            Alert.alert('Xác thực thất bại', err.message);
            setCode('');
          }
        },
      },
    );
  };

  const handleResend = () => {
    if (resend > 0 || isResending) return;
    sendOtp(
      { phone, channel: method ?? 'sms' },
      {
        onSuccess: () => {
          setResend(RESEND_SECONDS);
          setExpire(EXPIRE_SECONDS);
          setCode('');
          setError(false);
        },
        onError: (err) => {
          Alert.alert('Gửi lại OTP thất bại', err.message);
        },
      },
    );
  };

  const focusedIndex = code.length;

  return (
    <Pressable onPress={Keyboard.dismiss} className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
      <View className="flex-1 px-6">
        {/* Back */}
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="w-10 h-10 items-center justify-center -ml-2 mt-2"
          activeOpacity={0.6}
          hitSlop={8}
        >
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>

        {/* Title */}
        <Text className="text-3xl font-bold text-gray-900 mt-6">Xác thực OTP</Text>
        <Text className="text-sm text-gray-400 mt-2 leading-5">
          Chúng tôi đã gửi mã xác thực tới số điện thoại
        </Text>
        <Text className="text-base font-semibold text-primary mt-1">{route.params.contact}</Text>

        {/* OTP boxes */}
        <Pressable onPress={() => inputRef.current?.focus()} className="flex-row justify-between mt-8">
          {Array.from({ length: OTP_LENGTH }).map((_, i) => {
            const char = code[i] ?? '';
            const isActive = i === focusedIndex || (focusedIndex === OTP_LENGTH && i === OTP_LENGTH - 1);
            const boxClass = error
              ? 'border-red-500 bg-red-50'
              : char
                ? 'border-primary bg-primary-light'
                : isActive
                  ? 'border-primary'
                  : 'border-gray-200';
            return (
              <View
                key={i}
                className={`w-[52px] h-[58px] rounded-2xl border items-center justify-center ${boxClass}`}
              >
                <Text className={`text-2xl font-bold ${error ? 'text-red-500' : 'text-gray-900'}`}>{char}</Text>
              </View>
            );
          })}
        </Pressable>

        {/* Hidden input thực sự nhận ký tự */}
        <TextInput
          ref={inputRef}
          value={code}
          onChangeText={handleChange}
          keyboardType="number-pad"
          maxLength={OTP_LENGTH}
          autoFocus
          className="absolute opacity-0 w-px h-px"
          caretHidden
        />

        {/* Trạng thái: mã sai / đang xác thực / đếm giờ hết hạn */}
        <View className="flex-row items-center justify-center mt-6 gap-1.5">
          {error ? (
            <>
              <MaterialCommunityIcons name="alert-circle-outline" size={15} color="#ef4444" />
              <Text className="text-sm text-red-500 font-medium">Mã xác thực không đúng, vui lòng thử lại</Text>
            </>
          ) : isVerifying || checking ? (
            <Text className="text-sm text-primary font-medium">Đang xác thực...</Text>
          ) : (
            <>
              <MaterialCommunityIcons name="shield-check-outline" size={15} color="#9ca3af" />
              <Text className="text-sm text-gray-400">
                Mã xác thực sẽ hết hạn sau <Text className="text-primary font-medium">{formatTime(expire)}</Text>
              </Text>
            </>
          )}
        </View>

        {/* Resend */}
        <View className="items-center mt-16">
          <Text className="text-sm text-gray-400">Chưa nhận được mã?</Text>
          <TouchableOpacity
            onPress={handleResend}
            disabled={resend > 0 || isResending}
            activeOpacity={0.7}
            className="mt-2"
          >
            <Text className={`text-base font-semibold ${resend > 0 || isResending ? 'text-gray-300' : 'text-primary'}`}>
              {isResending
                ? 'Đang gửi...'
                : resend > 0
                  ? `Gửi lại OTP (${formatTime(resend)})`
                  : 'Gửi lại OTP'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Security note */}
        <View
          className="flex-row items-center bg-primary-light rounded-2xl px-4 py-3.5 gap-3 mt-auto"
          style={{ marginBottom: Math.max(insets.bottom, 20) }}
        >
          <MaterialCommunityIcons name="shield-lock-outline" size={22} color="#2563EB" />
          <Text className="flex-1 text-sm text-gray-600 leading-5">
            Vì lý do bảo mật, vui lòng không chia sẻ mã xác thực cho người khác.
          </Text>
        </View>
      </View>
    </Pressable>
  );
}
