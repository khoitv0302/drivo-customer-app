import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  SectionList,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { MainTabScreenProps } from '../../../navigation/types';
import type { Notification, NotificationType } from '../types';
import { formatRelativeTime } from '../datetime';
import { useNotificationFeed, type NotificationFilter } from '../hooks/useNotificationFeed';
import SwipeableRow from '../components/SwipeableRow';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const FILTERS: { key: NotificationFilter; label: string }[] = [
  { key: 'all', label: 'Tất cả' },
  { key: 'account', label: 'Tài khoản' },
  { key: 'promotion', label: 'Ưu đãi' },
  { key: 'update', label: 'Cập nhật' },
];

// Icon theo `type` cụ thể; type lạ sẽ dùng DEFAULT_ICON.
const TYPE_CONFIG: Record<string, { icon: IconName; color: string; bg: string }> = {
  promotion:       { icon: 'gift-outline', color: '#f59e0b', bg: '#fffbeb' },
  welcome:         { icon: 'hand-left-outline', color: '#2563EB', bg: '#EFF6FF' },
  payment_success: { icon: 'wallet-outline', color: '#7c3aed', bg: '#f5f3ff' },
  trip_completed:  { icon: 'checkmark-circle-outline', color: '#16a34a', bg: '#f0fdf4' },
  trip_cancelled:  { icon: 'close-circle-outline', color: '#dc2626', bg: '#fef2f2' },
  email_changed:   { icon: 'mail-outline', color: '#6b7280', bg: '#f3f4f6' },
  phone_changed:   { icon: 'call-outline', color: '#6b7280', bg: '#f3f4f6' },
  rating_prompt:   { icon: 'star-outline', color: '#f59e0b', bg: '#fffbeb' },
};

const DEFAULT_ICON = {
  icon: 'notifications-outline' as IconName,
  color: '#6b7280',
  bg: '#f3f4f6',
};

function iconFor(type: NotificationType) {
  return TYPE_CONFIG[type] ?? DEFAULT_ICON;
}

export default function NotificationsScreen(_props: MainTabScreenProps<'Notifications'>) {
  const insets = useSafeAreaInsets();
  const {
    filter,
    setFilter,
    sections,
    unreadCount,
    isLoading,
    isError,
    isRefetching,
    refetch,
    loadMore,
    isFetchingNextPage,
    markRead,
    markAllRead,
    deleteNotification,
  } = useNotificationFeed();

  return (
    <View className="flex-1 bg-gray-50">
      {/* Blue header */}
      <View className="bg-primary overflow-hidden" style={{ paddingTop: insets.top }}>
        <View
          style={{
            position: 'absolute', right: -40, top: insets.top - 20,
            width: 200, height: 200, borderRadius: 100,
            backgroundColor: 'rgba(255,255,255,0.07)',
          }}
        />
        <View
          style={{
            position: 'absolute', left: -20, bottom: -30,
            width: 120, height: 120, borderRadius: 60,
            backgroundColor: 'rgba(255,255,255,0.05)',
          }}
        />

        {/* Title row */}
        <View className="flex-row items-center justify-between px-5 pt-4 pb-3">
          <Text className="text-xl font-bold text-white">Thông báo</Text>
          {unreadCount > 0 && (
            <TouchableOpacity
              onPress={markAllRead}
              activeOpacity={0.7}
              style={{
                width: 36, height: 36, borderRadius: 18,
                backgroundColor: 'rgba(255,255,255,0.15)',
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Ionicons name="checkmark-done-outline" size={20} color="white" />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 14, gap: 8 }}
        >
          {FILTERS.map(f => (
            <TouchableOpacity
              key={f.key}
              onPress={() => setFilter(f.key)}
              activeOpacity={0.7}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 6,
                borderRadius: 20,
                backgroundColor: filter === f.key ? 'white' : 'rgba(255,255,255,0.2)',
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '600',
                  color: filter === f.key ? '#2563EB' : 'rgba(255,255,255,0.9)',
                }}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      ) : isError ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 }}>
          <Ionicons name="cloud-offline-outline" size={44} color="#d1d5db" />
          <Text style={{ fontSize: 15, fontWeight: '600', color: '#6b7280', marginTop: 12, textAlign: 'center' }}>
            Không tải được thông báo
          </Text>
          <TouchableOpacity
            onPress={() => refetch()}
            activeOpacity={0.8}
            style={{
              marginTop: 16, paddingHorizontal: 20, paddingVertical: 10,
              borderRadius: 20, backgroundColor: '#2563EB',
            }}
          >
            <Text style={{ color: 'white', fontWeight: '600', fontSize: 14 }}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={item => item.id}
          contentContainerStyle={{
            paddingTop: 8,
            paddingBottom: insets.bottom + 24,
            flexGrow: 1,
          }}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#2563EB" />
          }
          onEndReachedThreshold={0.4}
          onEndReached={loadMore}
          renderSectionHeader={({ section }) => (
            <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 6 }}>
              <Text
                style={{
                  fontSize: 11, fontWeight: '700', color: '#9ca3af',
                  textTransform: 'uppercase', letterSpacing: 0.8,
                }}
              >
                {section.title}
              </Text>
            </View>
          )}
          renderItem={({ item }: { item: Notification }) => {
            const cfg = iconFor(item.type);
            return (
              <SwipeableRow onDelete={() => deleteNotification(item.id)}>
                <TouchableOpacity
                  onPress={() => !item.isRead && markRead(item.id)}
                  activeOpacity={0.85}
                  style={{
                    flexDirection: 'row', alignItems: 'flex-start',
                    paddingHorizontal: 16, paddingVertical: 14,
                    backgroundColor: item.isRead ? 'white' : '#f0f6ff',
                    borderBottomWidth: 1, borderBottomColor: '#f3f4f6', gap: 12,
                  }}
                >
                  <View
                    style={{
                      width: 46, height: 46, borderRadius: 23,
                      backgroundColor: cfg.bg, alignItems: 'center',
                      justifyContent: 'center', flexShrink: 0,
                    }}
                  >
                    <Ionicons name={cfg.icon} size={22} color={cfg.color} />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 14, fontWeight: item.isRead ? '500' : '700',
                        color: '#111827', lineHeight: 20,
                      }}
                      numberOfLines={1}
                    >
                      {item.title}
                    </Text>
                    <Text
                      style={{ fontSize: 13, color: '#6b7280', marginTop: 3, lineHeight: 18 }}
                      numberOfLines={2}
                    >
                      {item.body}
                    </Text>
                    <Text style={{ fontSize: 12, color: '#9ca3af', marginTop: 5 }}>
                      {formatRelativeTime(item.createdAt)}
                    </Text>
                  </View>

                  {!item.isRead && (
                    <View
                      style={{
                        width: 8, height: 8, borderRadius: 4,
                        backgroundColor: '#2563EB', marginTop: 6, flexShrink: 0,
                      }}
                    />
                  )}
                </TouchableOpacity>
              </SwipeableRow>
            );
          }}
          ListFooterComponent={
            isFetchingNextPage ? (
              <View style={{ paddingVertical: 20 }}>
                <ActivityIndicator size="small" color="#9ca3af" />
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 }}>
              <View
                style={{
                  width: 80, height: 80, borderRadius: 40, backgroundColor: '#f3f4f6',
                  alignItems: 'center', justifyContent: 'center', marginBottom: 16,
                }}
              >
                <Ionicons name="notifications-outline" size={36} color="#d1d5db" />
              </View>
              <Text style={{ fontSize: 16, fontWeight: '600', color: '#9ca3af' }}>
                Chưa có thông báo
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}
