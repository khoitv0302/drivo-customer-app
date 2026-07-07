import { useRef } from 'react';
import { Animated, PanResponder, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const ACTION_WIDTH = 88;

// Hàng vuốt sang trái để lộ nút Xoá. Dùng PanResponder + Animated (không cần
// react-native-gesture-handler → khỏi build lại dev client).
export default function SwipeableRow({
  children,
  onDelete,
}: {
  children: React.ReactNode;
  onDelete: () => void;
}) {
  const translateX = useRef(new Animated.Value(0)).current;
  const startX = useRef(0); // vị trí X lúc bắt đầu kéo (0 = đóng, -ACTION_WIDTH = mở)

  const settle = (open: boolean) => {
    startX.current = open ? -ACTION_WIDTH : 0;
    Animated.spring(translateX, {
      toValue: startX.current,
      useNativeDriver: true,
      bounciness: 0,
      speed: 20,
    }).start();
  };

  const pan = useRef(
    PanResponder.create({
      // Chỉ chiếm khi vuốt ngang rõ ràng (để không phá cuộn dọc của list).
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 10 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
      onPanResponderGrant: () => {
        translateX.stopAnimation((v: number) => {
          startX.current = v;
        });
      },
      onPanResponderMove: (_, g) => {
        let next = startX.current + g.dx;
        if (next > 0) next = 0; // không cho kéo qua phải quá mép
        if (next < -ACTION_WIDTH) next = -ACTION_WIDTH - (Math.abs(next) - ACTION_WIDTH) * 0.15; // kháng nhẹ
        translateX.setValue(next);
      },
      onPanResponderRelease: (_, g) => {
        const final = startX.current + g.dx;
        settle(final < -ACTION_WIDTH / 2);
      },
      onPanResponderTerminate: () => settle(false),
    }),
  ).current;

  const handleDelete = () => {
    // Trượt hàng ra hẳn cho mượt rồi mới xoá (cache lạc quan gỡ item).
    Animated.timing(translateX, {
      toValue: -600,
      duration: 180,
      useNativeDriver: true,
    }).start(() => onDelete());
  };

  return (
    <View>
      {/* Nút Xoá nằm sau, lộ ra khi kéo trái */}
      <View
        style={{
          position: 'absolute',
          right: 0,
          top: 0,
          bottom: 0,
          width: ACTION_WIDTH,
          backgroundColor: '#ef4444',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <TouchableOpacity
          onPress={handleDelete}
          activeOpacity={0.8}
          style={{ flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center' }}
        >
          <Ionicons name="trash-outline" size={22} color="white" />
          <Text style={{ color: 'white', fontSize: 12, fontWeight: '600', marginTop: 2 }}>Xoá</Text>
        </TouchableOpacity>
      </View>

      <Animated.View style={{ transform: [{ translateX }] }} {...pan.panHandlers}>
        {children}
      </Animated.View>
    </View>
  );
}
