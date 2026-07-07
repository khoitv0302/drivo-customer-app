import { useState } from 'react';
import {
  View, Text, TouchableOpacity, TextInput,
  ScrollView, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { RootScreenProps } from '../../../navigation/types';
import { useAuthStore } from '../../../store';
import { useConfirmPasswordReset } from '../api/useConfirmPasswordReset';

// ---------------------------------------------------------------------------
// Password strength (giống màn Tạo hồ sơ / Đổi mật khẩu)
// ---------------------------------------------------------------------------
type Strength = 0 | 1 | 2 | 3;

function getStrength(password: string): Strength {
  if (password.length === 0) return 0;
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/\d/.test(password) && /[^A-Za-z0-9]/.test(password)) score++;
  return score as Strength;
}

const STRENGTH_LABEL: Record<Strength, { label: string; color: string }> = {
  0: { label: '', color: '#e5e7eb' },
  1: { label: 'Yếu', color: '#ef4444' },
  2: { label: 'Trung bình', color: '#f59e0b' },
  3: { label: 'Mạnh', color: '#22c55e' },
};

// ---------------------------------------------------------------------------
// Password field
// ---------------------------------------------------------------------------
type PasswordFieldProps = {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  placeholder?: string;
};

function PasswordField({ label, value, onChange, error, placeholder }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  return (
    <View className="mb-5">
      <Text className="text-sm font-semibold text-gray-700 mb-1.5">{label}</Text>
      <View
        className={`flex-row items-center bg-white rounded-2xl px-4 ${error ? 'border border-red-400' : 'border border-gray-200'}`}
        style={{ elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } }}
      >
        <TextInput
          value={value}
          onChangeText={onChange}
          secureTextEntry={!visible}
          placeholder={placeholder ?? '••••••••'}
          placeholderTextColor="#9ca3af"
          className="flex-1 text-gray-900 py-4 text-base"
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="oneTimeCode"
          autoComplete="off"
        />
        <TouchableOpacity onPress={() => setVisible(v => !v)} activeOpacity={0.6} className="pl-2 py-2">
          <Ionicons name={visible ? 'eye-off-outline' : 'eye-outline'} size={20} color="#9ca3af" />
        </TouchableOpacity>
      </View>
      {error ? (
        <View className="flex-row items-center mt-1.5 gap-1">
          <Ionicons name="alert-circle-outline" size={13} color="#ef4444" />
          <Text className="text-xs text-red-500">{error}</Text>
        </View>
      ) : null}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main Screen — đặt mật khẩu mới bằng mã đã xác thực
// ---------------------------------------------------------------------------
export default function ResetPasswordScreen({ navigation, route }: RootScreenProps<'ResetPassword'>) {
  const insets = useSafeAreaInsets();
  const { phone, code } = route.params;
  const setSession = useAuthStore(s => s.setSession);
  const { mutate: confirmReset, isPending } = useConfirmPasswordReset();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({});

  const strength = getStrength(password);
  const strengthInfo = STRENGTH_LABEL[strength];

  function validate() {
    const e: typeof errors = {};
    if (password.length < 8) e.password = 'Mật khẩu tối thiểu 8 ký tự';
    if (!confirm) e.confirm = 'Vui lòng xác nhận mật khẩu';
    else if (password !== confirm) e.confirm = 'Mật khẩu xác nhận không khớp';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit() {
    if (isPending || !validate()) return;
    confirmReset(
      { phone, code, newPassword: password },
      {
        // Đặt lại thành công → có session luôn, lưu vào store, RootNavigator tự vào Home.
        onSuccess: (session) => setSession(session),
        onError: (err) => {
          const invalidOtp = err.errors?.some((e) => e.code === 'INVALID_OTP');
          if (invalidOtp) {
            // Mã hết hạn giữa bước verify và confirm → quay lại nhập lại mã.
            Alert.alert('Mã không hợp lệ', 'Mã đặt lại đã hết hạn, vui lòng thử lại.', [
              { text: 'OK', onPress: () => navigation.goBack() },
            ]);
          } else {
            Alert.alert('Đặt lại mật khẩu thất bại', err.message);
          }
        },
      },
    );
  }

  return (
    <KeyboardAvoidingView
      className="flex-1"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={{ backgroundColor: '#2563EB', paddingTop: insets.top }}>
        <View style={{ position: 'absolute', right: -30, top: insets.top - 10, width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(255,255,255,0.06)' }} />
        <View style={{ position: 'absolute', left: -20, bottom: -40, width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.04)' }} />

        <View className="px-5 pt-2 pb-6">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="w-10 h-10 items-center justify-center -ml-2 mb-2"
            activeOpacity={0.6}
            hitSlop={8}
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text className="text-2xl font-bold text-white">Đặt lại mật khẩu</Text>
        </View>
      </View>

      <ScrollView
        className="flex-1 bg-gray-50"
        contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 32 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View className="items-center py-6 mb-2">
          <View className="w-16 h-16 rounded-full items-center justify-center mb-3" style={{ backgroundColor: '#EFF6FF' }}>
            <Ionicons name="lock-closed" size={28} color="#2563EB" />
          </View>
          <Text className="text-sm text-gray-500 text-center leading-5">
            Tạo mật khẩu mới cho tài khoản của bạn.{'\n'}Hãy chọn mật khẩu đủ mạnh và dễ nhớ.
          </Text>
        </View>

        {/* Mật khẩu mới */}
        <PasswordField
          label="Mật khẩu mới"
          value={password}
          onChange={v => { setPassword(v); setErrors(e => ({ ...e, password: undefined })); }}
          error={errors.password}
          placeholder="Tối thiểu 8 ký tự"
        />

        {/* Strength indicator */}
        {password.length > 0 && (
          <View className="mb-5 -mt-3">
            <View className="flex-row gap-1.5 mb-1">
              {[1, 2, 3].map(i => (
                <View
                  key={i}
                  className="flex-1 h-1 rounded-full"
                  style={{ backgroundColor: strength >= i ? strengthInfo.color : '#e5e7eb' }}
                />
              ))}
            </View>
            <Text className="text-xs" style={{ color: strengthInfo.color }}>
              Độ mạnh: {strengthInfo.label}
            </Text>
          </View>
        )}

        <PasswordField
          label="Xác nhận mật khẩu"
          value={confirm}
          onChange={v => { setConfirm(v); setErrors(e => ({ ...e, confirm: undefined })); }}
          error={errors.confirm}
          placeholder="Nhập lại mật khẩu mới"
        />

        {/* Submit */}
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={isPending}
          activeOpacity={0.85}
          className="rounded-2xl py-4 items-center mt-2"
          style={{ backgroundColor: isPending ? '#93b4f5' : '#2563EB' }}
        >
          <Text className="text-white font-bold text-base">
            {isPending ? 'Đang đặt lại...' : 'Đặt lại mật khẩu'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
