import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Màn tạm cho các tab chưa implement (Lịch sử, Ưu đãi, Tài khoản) */
export default function PlaceholderScreen({ title }: { title: string }) {
  const insets = useSafeAreaInsets();
  return (
    <View className="flex-1 bg-gray-50 items-center justify-center" style={{ paddingTop: insets.top }}>
      <Text className="text-lg font-semibold text-gray-400">{title}</Text>
      <Text className="text-sm text-gray-300 mt-1">Đang phát triển</Text>
    </View>
  );
}
