import { ActivityIndicator, Alert, ScrollView, View, Text, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { ROUTES } from '../../../constants/routes';
import type { MainTabScreenProps } from '../../../navigation/types';
import { useAuthStore } from '../../../store';
import { useMe } from '@shared/hooks/useMe';
import { useLogout } from '@shared/hooks/useLogout';
import { decodeJwt } from '@shared/utils/jwt';
import { formatNumber, formatPhone } from '@shared/utils/format';

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------
type MenuItemProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress?: () => void;
};

function MenuItem({ icon, label, onPress }: MenuItemProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      className="flex-row items-center py-3.5 px-4"
    >
      <View className="w-8 h-8 items-center justify-center mr-3">
        <Ionicons name={icon} size={22} color="#6b7280" />
      </View>
      <Text className="flex-1 text-[15px] text-gray-800">{label}</Text>
      <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
    </TouchableOpacity>
  );
}

function Divider() {
  return <View className="h-px bg-gray-100 mx-4" />;
}

type SectionProps = {
  title: string;
  children: React.ReactNode;
};

function Section({ title, children }: SectionProps) {
  return (
    <View className="mb-4">
      <Text className="text-[15px] font-semibold text-gray-800 px-4 mb-2">{title}</Text>
      <View className="bg-white rounded-2xl overflow-hidden mx-4" style={{ elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } }}>
        {children}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main Screen
// ---------------------------------------------------------------------------
export default function AccountScreen({ navigation }: MainTabScreenProps<'Account'>) {
  const insets = useSafeAreaInsets();
  const token = useAuthStore(s => s.token);
  const { data: me, isLoading } = useMe();
  const { mutate: logout, isPending: loggingOut } = useLogout();

  const handleLogout = () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc muốn đăng xuất khỏi tài khoản?', [
      { text: 'Huỷ', style: 'cancel' },
      { text: 'Đăng xuất', style: 'destructive', onPress: () => logout() },
    ]);
  };

  // Họ tên & SĐT (SĐT lấy từ claim trong JWT vì /me không trả về)
  const name = me?.fullName ?? (isLoading ? 'Đang tải...' : 'Khách hàng');
  const phoneClaim = decodeJwt(token)?.phone;
  const phone = phoneClaim ? formatPhone(phoneClaim) : '';

  // Thống kê
  const totalTrips = me ? formatNumber(me.stats.completedTrips) : '0';
  const totalKm = me ? formatNumber(me.stats.totalDistanceKm) : '0';
  const savedVnd = me ? formatNumber(me.stats.totalSavedVnd) : '0';

  return (
    // Outer container is blue-50 — handles iOS overscroll bounce at the top
    <View className="flex-1 bg-blue-50">
      <StatusBar style="dark" />

      <ScrollView
        style={{ backgroundColor: 'transparent' }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Blue header zone: fills from top down to first section ── */}
        <View className="bg-blue-50" style={{ paddingTop: insets.top + 12, paddingBottom: 20, paddingHorizontal: 16 }}>
          <View className="rounded-2xl overflow-hidden" style={{ backgroundColor: '#2563EB', elevation: 3, shadowColor: '#2563EB', shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } }}>
            {/* User info row */}
            <View className="flex-row items-center px-5 pt-6 pb-5">
              <View className="rounded-full bg-white/20 items-center justify-center mr-4" style={{ width: 72, height: 72 }}>
                <Ionicons name="person" size={38} color="#fff" />
              </View>
              <View className="flex-1">
                <View className="flex-row items-center gap-1.5">
                  <Text className="text-lg font-bold text-white">{name}</Text>
                  <Ionicons name="information-circle" size={17} color="#fbbf24" />
                </View>
                {phone ? <Text className="text-sm text-white/70 mt-1">{phone}</Text> : null}
                <View className="bg-amber-400 rounded-full px-3 py-0.5 self-start mt-2">
                  <Text className="text-xs font-semibold text-amber-900">Thành viên</Text>
                </View>
              </View>
              <TouchableOpacity activeOpacity={0.7} className="flex-row items-center border border-white/40 rounded-full px-3 py-2" onPress={() => navigation.navigate(ROUTES.PROFILE)}>
                <Text className="text-sm text-white mr-1">Hồ sơ</Text>
                <Ionicons name="chevron-forward" size={14} color="white" />
              </TouchableOpacity>
            </View>

            {/* Stats row */}
            <View className="flex-row bg-white/15 px-5 py-4">
              <View className="flex-1 items-center">
                <Text className="text-xs text-white/70 text-center">Số chuyến</Text>
                <Text className="text-base font-bold text-white mt-1">{totalTrips}</Text>
              </View>
              <View className="w-px bg-white/30 mx-2" />
              <View className="flex-1 items-center">
                <Text className="text-xs text-white/70 text-center">Tổng km</Text>
                <Text className="text-base font-bold text-white mt-1">{totalKm} km</Text>
              </View>
              <View className="w-px bg-white/30 mx-2" />
              <View className="flex-1 items-center">
                <Text className="text-xs text-white/70 text-center">Tiết kiệm</Text>
                <Text className="text-base font-bold text-white mt-1">{savedVnd} đ</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── Gray content zone ── */}
        <View className="bg-gray-100 rounded-t-3xl pt-5">
          {/* ── Hạng thành viên & Ưu đãi ── */}
          <Section title="Hạng thành viên & Ưu đãi">
            <MenuItem icon="trophy-outline" label="Gói hội viên" onPress={() => navigation.navigate(ROUTES.MEMBERSHIP_PACKAGES)} />
            <Divider />
            <MenuItem icon="heart-outline" label="Mã Khuyến mãi" onPress={() => navigation.navigate(ROUTES.PROMO_CODE)} />
            <Divider />
            <MenuItem icon="shield-outline" label="Hạng thành viên" onPress={() => navigation.navigate(ROUTES.MEMBER_TIER)} />
            <Divider />
          </Section>

          {/* ── Thông tin cá nhân ── */}
          <Section title="Thông tin cá nhân">
            <MenuItem icon="document-text-outline" label="Đổi mật khẩu" onPress={() => navigation.navigate(ROUTES.CHANGE_PASSWORD)} />
            <Divider />
          </Section>

          {/* ── Hỗ trợ ── */}
          <Section title="Hỗ trợ">
            <MenuItem icon="information-circle-outline" label="Điều khoản và Chính sách" onPress={() => navigation.navigate(ROUTES.TERMS_POLICY)} />
            <Divider />
            <MenuItem icon="headset-outline" label="Trung tâm hỗ trợ" onPress={() => navigation.navigate(ROUTES.SUPPORT_CENTER)} />
            <Divider />
            <MenuItem icon="business-outline" label="Thông tin công ty" onPress={() => navigation.navigate(ROUTES.COMPANY_INFO)} />
          </Section>

          {/* ── Cơ hội hợp tác ── */}
          <Section title="Cơ hội hợp tác">
            <MenuItem icon="car-outline" label="Trở thành tài xế Drivo" onPress={() => navigation.navigate(ROUTES.BECOME_DRIVER)} />
          </Section>

          {/* ── Đăng xuất ── */}
          <TouchableOpacity
            onPress={handleLogout}
            disabled={loggingOut}
            activeOpacity={0.75}
            className="mx-4 mb-6 mt-2 flex-row items-center justify-center bg-red-50 rounded-2xl py-4"
            style={{ borderWidth: 1, borderColor: '#fecaca', opacity: loggingOut ? 0.6 : 1 }}
          >
            {loggingOut ? (
              <ActivityIndicator size="small" color="#ef4444" />
            ) : (
              <Ionicons name="log-out-outline" size={20} color="#ef4444" />
            )}
            <Text className="text-red-500 font-bold text-base ml-2">
              {loggingOut ? 'Đang đăng xuất...' : 'Đăng xuất'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
