import { useEffect, useState } from 'react';
import { PermissionsAndroid, Platform } from 'react-native';
import { locationManager } from '@rnmapbox/maps';
import type { Location } from '@rnmapbox/maps';

interface CurrentLocation {
  latitude: number;
  longitude: number;
}

interface UseCurrentLocationResult {
  location: CurrentLocation | null;
  loading: boolean;
  permissionDenied: boolean;
}

export default function useCurrentLocation(): UseCurrentLocationResult {
  const [location, setLocation] = useState<CurrentLocation | null>(null);
  const [loading, setLoading] = useState(true);
  const [permissionDenied, setPermissionDenied] = useState(false);

  useEffect(() => {
    let resolved = false;

    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        console.warn('[useCurrentLocation] Timeout 8s — không nhận được vị trí');
        setLoading(false);
      }
    }, 8000);

    async function init() {
      console.log('[useCurrentLocation] Platform:', Platform.OS);

      if (Platform.OS === 'android') {
        console.log('[useCurrentLocation] Đang xin quyền Android...');
        const result = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Quyền truy cập vị trí',
            message: 'Drivo cần vị trí của bạn để tìm tài xế gần nhất.',
            buttonPositive: 'Đồng ý',
            buttonNegative: 'Từ chối',
          }
        );
        console.log('[useCurrentLocation] Kết quả quyền Android:', result);
        if (result !== PermissionsAndroid.RESULTS.GRANTED) {
          console.warn('[useCurrentLocation] Quyền bị từ chối');
          setPermissionDenied(true);
          setLoading(false);
          return;
        }
      }

      console.log('[useCurrentLocation] Gọi locationManager.start()...');
      try {
        locationManager.start();
        console.log('[useCurrentLocation] locationManager.start() OK');
      } catch (e) {
        console.error('[useCurrentLocation] locationManager.start() lỗi:', e);
      }

      const onLocation = (loc: Location) => {
        if (resolved) return;
        const lat = loc.coords.latitude;
        const lng = loc.coords.longitude;
        if (!isFinite(lat) || !isFinite(lng)) {
          console.warn('[useCurrentLocation] Tọa độ không hợp lệ:', lat, lng);
          return;
        }
        resolved = true;
        clearTimeout(timeout);
        setLocation({ latitude: lat, longitude: lng });
        setLoading(false);
        locationManager.removeListener(onLocation);
        locationManager.stop();
      };

      locationManager.addListener(onLocation);
      console.log('[useCurrentLocation] Listener đã được thêm, đang chờ GPS...');
    }

    init().catch(e => console.error('[useCurrentLocation] init() lỗi:', e));

    return () => {
      resolved = true;
      clearTimeout(timeout);
      locationManager.stop();
    };
  }, []);

  return { location, loading, permissionDenied };
}
