// Mapbox public (publishable) token — nhúng vào client. Giá trị thật đặt trong .env
// (EXPO_PUBLIC_MAPBOX_TOKEN), xem .env.example. Nhớ restrict token trên dashboard Mapbox.
export const MAPBOX_PUBLIC_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN ?? '';

// Host gốc của backend Drivo (không có path) — dùng chung cho REST API và SignalR hub.
export const API_HOST = 'http://dev-api.160-250-5-174.sslip.io:8080';

// Base URL của backend Drivo. Mọi request qua services/api/client.ts đều nối vào đây.
export const API_URL = `${API_HOST}/api`;

// Timeout mặc định cho mỗi request (ms)
export const API_TIMEOUT = 15000;

// URL hub SignalR (.NET) dùng cho realtime — kết nối qua services/signalr/customerHubClient.ts
export const SIGNALR_CUSTOMER_HUB_URL = `${API_HOST}/hubs/customer`;

// Google Maps / Places key — giá trị thật đặt trong .env (EXPO_PUBLIC_GOOGLE_MAPS_API_KEY),
// xem .env.example. Lấy key tại: https://console.cloud.google.com → bật "Places API".
export const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';
