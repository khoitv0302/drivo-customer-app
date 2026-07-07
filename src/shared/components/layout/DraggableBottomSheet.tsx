import { useRef, useState, type ReactNode } from 'react';
import { Animated, PanResponder, StyleSheet, View, type ViewStyle } from 'react-native';

interface Props {
  children: ReactNode;
  /** Chiều cao phần vẫn hiện khi thu gọn (px) — kéo xuống chỉ chừa lại phần này. */
  collapsedVisibleHeight?: number;
  /** Style thêm cho sheet (vd paddingBottom theo safe-area). */
  style?: ViewStyle;
}

// Bottom sheet kéo được bằng thanh "–": vuốt xuống để thu gọn, vuốt lên để mở lại.
// Chỉ vùng grabber ở đầu nhận cử chỉ kéo → các nút bên trong bấm bình thường.
export default function DraggableBottomSheet({ children, collapsedVisibleHeight = 200, style }: Props) {
  const translateY = useRef(new Animated.Value(0)).current;
  const lastSnap = useRef(0); // 0 = mở, collapsedOffset = thu gọn
  const [sheetHeight, setSheetHeight] = useState(0);

  // Khoảng đẩy xuống khi thu gọn = chiều cao sheet trừ phần muốn chừa lại.
  const collapsedOffset = Math.max(0, sheetHeight - collapsedVisibleHeight);

  const pan = useRef(
    PanResponder.create({
      // Không chiếm ngay khi chạm → nút bên trong vẫn bấm được.
      onStartShouldSetPanResponder: () => false,
      // Chỉ chiếm khi vuốt DỌC rõ ràng → kéo được ở cả section, tap/scroll ngang không bị nuốt.
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 6 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderGrant: () => {
        translateY.setOffset(lastSnap.current);
        translateY.setValue(0);
      },
      onPanResponderMove: (_, g) => {
        // Giới hạn để (offset + dy) luôn nằm trong [0, collapsedOffset].
        const min = -lastSnap.current;
        const max = collapsedOffset - lastSnap.current;
        translateY.setValue(Math.min(Math.max(g.dy, min), max));
      },
      onPanResponderRelease: (_, g) => {
        translateY.flattenOffset();
        const current = Math.min(Math.max(lastSnap.current + g.dy, 0), collapsedOffset);
        // 3 nấc như Grab/Xanh: mở hết (0) · giữa · thu gọn.
        const points = [0, collapsedOffset * 0.5, collapsedOffset];
        let target: number;
        if (g.vy > 0.6) {
          // Vuốt xuống nhanh → nhảy tới nấc thấp hơn kế tiếp.
          target = points.find((p) => p > current + 1) ?? collapsedOffset;
        } else if (g.vy < -0.6) {
          // Vuốt lên nhanh → nhảy tới nấc cao hơn kế tiếp.
          target = [...points].reverse().find((p) => p < current - 1) ?? 0;
        } else {
          // Thả nhẹ → snap về nấc gần nhất.
          target = points.reduce((a, b) => (Math.abs(b - current) < Math.abs(a - current) ? b : a), points[0]);
        }
        lastSnap.current = target;
        Animated.spring(translateY, {
          toValue: target,
          useNativeDriver: true,
          damping: 24,
          stiffness: 220,
          mass: 0.8,
        }).start();
      },
    }),
  ).current;

  return (
    <Animated.View
      style={[styles.sheet, style, { transform: [{ translateY }] }]}
      onLayout={(e) => setSheetHeight(e.nativeEvent.layout.height)}
      {...pan.panHandlers}
    >
      <View style={styles.grabZone}>
        <View style={styles.handle} />
      </View>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: 'white',
    borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 12,
  },
  grabZone: { alignItems: 'center', paddingTop: 12, paddingBottom: 12 },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#e5e7eb' },
});
