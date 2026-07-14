import { useMemo } from 'react';
import type { DriverPositionMessage } from '../types';

export interface DrivingProgress {
  /** Vị trí xe hiện tại (toạ độ GPS thật từ event 'position'). null nếu chưa có dữ liệu. */
  vehicleCoord: [number, number] | null;
  /** Phần tuyến đường CÒN LẠI phía trước xe — đoạn đã đi qua bị cắt bỏ khỏi đây. */
  remainingGeometry: GeoJSON.Geometry | null;
}

// Khoảng cách 2 điểm lat/lng theo đường chim bay (m) — dùng để quyết định khi nào cần vẽ lại
// tuyến đường (xem DriverFoundScreen: chỉ refetch Directions khi tài xế đã di chuyển đủ xa).
export function haversineMeters(a: [number, number], b: [number, number]): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const [lng1, lat1] = a;
  const [lng2, lat2] = b;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h = sinDLat * sinDLat + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * sinDLng * sinDLng;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Khoảng cách bình phương (đơn vị độ, đã hiệu chỉnh cos(lat) cho trục lng) từ điểm p tới đoạn
// thẳng a-b, dùng để tìm đoạn route gần tài xế nhất (map-matching đơn giản).
function projectPointToSegment(p: [number, number], a: [number, number], b: [number, number]) {
  const latRef = (a[1] + b[1]) / 2;
  const cosLat = Math.cos((latRef * Math.PI) / 180) || 1;

  const ax = a[0] * cosLat, ay = a[1];
  const bx = b[0] * cosLat, by = b[1];
  const px = p[0] * cosLat, py = p[1];

  const dx = bx - ax, dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  const t = lenSq > 0 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq)) : 0;

  const cx = ax + t * dx, cy = ay + t * dy;
  const distSq = (px - cx) ** 2 + (py - cy) ** 2;

  return { segFrac: t, distSq };
}

// Map vị trí GPS thật của tài xế (event 'position') vào tuyến đường (từ Mapbox Directions) để
// biết đang ở đoạn nào, từ đó cắt bỏ phần đường đã đi qua khỏi geometry vẽ ra. Vị trí marker
// dùng đúng toạ độ GPS thật (không snap vào line) — chỉ dùng route để xác định đoạn còn lại.
export function useDriverRouteProgress(
  coordinates: [number, number][] | null,
  position: DriverPositionMessage | null,
): DrivingProgress {
  return useMemo(() => {
    if (!position) return { vehicleCoord: null, remainingGeometry: null };

    const vehicleCoord: [number, number] = [position.lng, position.lat];

    if (!coordinates || coordinates.length < 2) {
      return { vehicleCoord, remainingGeometry: null };
    }

    let bestSeg = 0;
    let bestDistSq = Infinity;
    for (let i = 0; i < coordinates.length - 1; i++) {
      const { distSq } = projectPointToSegment(vehicleCoord, coordinates[i], coordinates[i + 1]);
      if (distSq < bestDistSq) {
        bestDistSq = distSq;
        bestSeg = i;
      }
    }

    const remainingCoords = [vehicleCoord, ...coordinates.slice(bestSeg + 1)];
    return {
      vehicleCoord,
      remainingGeometry: { type: 'LineString', coordinates: remainingCoords },
    };
  }, [coordinates, position]);
}
