import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { TABS } from '../constants/routes';
import type { MainTabParamList } from './types';
import HomeScreen from '../features/home/screens/HomeScreen';
import { TripHistoryScreen } from '../features/trip-history';
import { AccountScreen } from '../features/profile';
import NotificationsScreen from '../features/notifications/screens/NotificationsScreen';
import { useUnreadCount } from '../features/notifications';

const Tab = createBottomTabNavigator<MainTabParamList>();

const ICONS: Record<keyof MainTabParamList, { active: keyof typeof Ionicons.glyphMap; inactive: keyof typeof Ionicons.glyphMap }> = {
  Home: { active: 'home', inactive: 'home-outline' },
  History: { active: 'time', inactive: 'time-outline' },
  Notifications: { active: 'notifications', inactive: 'notifications-outline' },
  Account: { active: 'person', inactive: 'person-outline' },
};

export default function MainTabNavigator() {
  // Số chưa đọc cho badge tab Thông báo — dùng chung cache với màn Thông báo,
  // tự cập nhật khi đánh dấu đã đọc (invalidate ['notifications','unread']).
  const { data: unread } = useUnreadCount();
  const unreadCount = unread?.count ?? 0;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#2563EB',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '500' },
        tabBarStyle: { height: 88, paddingTop: 8, paddingBottom: 28, borderTopColor: '#f3f4f6' },
        tabBarIcon: ({ focused, color, size }) => {
          const icon = ICONS[route.name];
          return <Ionicons name={focused ? icon.active : icon.inactive} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name={TABS.HOME} component={HomeScreen} options={{ title: 'Trang chủ' }} />
      <Tab.Screen
        name={TABS.HISTORY}
        component={TripHistoryScreen}
        options={{ title: 'Lịch sử' }}
        listeners={{ tabPress: () => console.log('[Tab] History clicked') }}
      />
      <Tab.Screen
        name={TABS.NOTIFICATIONS}
        component={NotificationsScreen}
        options={{
          title: 'Thông báo',
          tabBarBadge: unreadCount > 0 ? (unreadCount > 99 ? '99+' : unreadCount) : undefined,
        }}
      />
      <Tab.Screen
        name={TABS.ACCOUNT}
        component={AccountScreen}
        options={{ title: 'Tài khoản' }}
      />
    </Tab.Navigator>
  );
}
