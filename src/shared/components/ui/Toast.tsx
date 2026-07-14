import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastOptions {
  type?: ToastType;
  durationMs?: number;
}

interface ToastContextValue {
  /** Hiện toast nổi trên cùng, tự ẩn sau `durationMs` (mặc định 3000ms). */
  showToast: (message: string, options?: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const ICON_BY_TYPE: Record<ToastType, { name: React.ComponentProps<typeof Ionicons>['name']; color: string }> = {
  success: { name: 'checkmark', color: '#22c55e' },
  error: { name: 'close', color: '#ef4444' },
  info: { name: 'information', color: '#2563EB' },
};

const DEFAULT_DURATION_MS = 3000;

// Toast dùng chung toàn app — thay cho Alert.alert ở các popup chỉ để thông báo (thành công/
// lỗi/info, không cần người dùng chọn giữa nhiều lựa chọn). Mount 1 lần ở App.tsx, gọi qua
// useToast() ở bất kỳ màn nào bên trong. Không hiện được đè lên react-native <Modal> (Modal
// render ở layer native riêng) — trong Modal dùng banner lỗi tại chỗ, hoặc đóng Modal trước
// rồi mới showToast.
export function ToastProvider({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const [message, setMessage] = useState<string | null>(null);
  const [type, setType] = useState<ToastType>('info');
  const opacity = useRef(new Animated.Value(0)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string, options?: ToastOptions) => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setMessage(msg);
    setType(options?.type ?? 'info');
    opacity.stopAnimation();
    Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }).start();
    hideTimer.current = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => setMessage(null));
    }, options?.durationMs ?? DEFAULT_DURATION_MS);
  }, [opacity]);

  const icon = ICON_BY_TYPE[type];

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* top: đủ thấp để không đè lên nút back/hàng nút top thường thấy ở các màn (insets.top + ~8..42px) */}
      {message && (
        <Animated.View style={[styles.toast, { top: insets.top + 64, opacity }]} pointerEvents="none">
          <View style={[styles.iconCircle, { backgroundColor: icon.color }]}>
            <Ionicons name={icon.name} size={14} color="white" />
          </View>
          <Text style={styles.text} numberOfLines={2}>{message}</Text>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast() phải được gọi bên trong <ToastProvider>');
  return ctx;
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute', left: 16, right: 16, zIndex: 9999, elevation: 24,
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'white', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.16, shadowRadius: 10,
  },
  iconCircle: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, fontSize: 13, fontWeight: '600', color: '#111827' },
});
