import "./global.css";
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Mapbox from '@rnmapbox/maps';
import RootNavigator from './src/navigation/RootNavigator';
import { MAPBOX_PUBLIC_TOKEN } from './src/constants/config';
import { useAuthStore } from './src/store';
import { ToastProvider } from './src/shared/components/ui/Toast';

Mapbox.setAccessToken(MAPBOX_PUBLIC_TOKEN);

const queryClient = new QueryClient();

export default function App() {
  const hasHydrated = useAuthStore((s) => s._hasHydrated);

  // Chờ SecureStore đọc xong trước khi dựng navigator. Không tự động đẩy vào
  // DriverFound/OnTrip ở đây nữa — HomeScreen tự check và hiện banner "chuyến đang hoạt
  // động", người dùng chạm vào banner đó mới điều hướng vào.
  if (!hasHydrated) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#2563EB' }}>
          <ActivityIndicator size="large" color="white" />
        </View>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <ToastProvider>
            <NavigationContainer>
              <RootNavigator />
            </NavigationContainer>
            <StatusBar style="light" />
          </ToastProvider>
        </SafeAreaProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
