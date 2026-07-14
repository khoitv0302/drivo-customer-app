import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import type { SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';
import Reanimated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';

const ACTION_WIDTH = 88;

interface RightActionProps {
  drag: SharedValue<number>;
  swipeable: SwipeableMethods;
  onDelete: () => void;
}

// Nút "Xoá" trượt theo đúng tay kéo — style tính bằng useAnimatedStyle nên chạy thẳng trên UI
// thread (Reanimated), không qua JS bridge như bản PanResponder + Animated cũ, nhờ vậy mượt
// tuyệt đối kể cả khi JS thread đang bận (render list, gọi API...).
function RightAction({ drag, swipeable, onDelete }: RightActionProps) {
  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: drag.value + ACTION_WIDTH }],
  }));

  return (
    <Reanimated.View style={[s.action, style]}>
      <TouchableOpacity
        onPress={() => {
          swipeable.close();
          onDelete();
        }}
        activeOpacity={0.8}
        style={s.actionBtn}
      >
        <Ionicons name="trash-outline" size={22} color="white" />
        <Text style={s.actionText}>Xoá</Text>
      </TouchableOpacity>
    </Reanimated.View>
  );
}

// Hàng vuốt sang trái để lộ nút Xoá — dùng Swipeable (bản Reanimated) của
// react-native-gesture-handler, chuẩn công nghiệp cho swipe-to-delete: gesture nhận trên UI
// thread, không phải round-trip qua JS↔Native bridge như PanResponder + Animated cũ nên không
// còn giật khi JS thread bận.
export default function SwipeableRow({
  children,
  onDelete,
}: {
  children: React.ReactNode;
  onDelete: () => void;
}) {
  return (
    <ReanimatedSwipeable
      friction={1.5}
      rightThreshold={ACTION_WIDTH / 2}
      overshootRight={false}
      renderRightActions={(_progress, drag, swipeable) => (
        <RightAction drag={drag} swipeable={swipeable} onDelete={onDelete} />
      )}
    >
      {children}
    </ReanimatedSwipeable>
  );
}

const s = StyleSheet.create({
  action: { width: ACTION_WIDTH },
  actionBtn: { flex: 1, backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center' },
  actionText: { color: 'white', fontSize: 12, fontWeight: '600', marginTop: 2 },
});
