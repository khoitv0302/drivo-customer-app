import { ActivityIndicator, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ROUTES } from '../constants/routes';
import type { RootStackParamList } from './types';
import LoginScreen from '../features/auth/screens/LoginScreen';
import RegisterScreen from '../features/auth/screens/RegisterScreen';
import OtpScreen from '../features/auth/screens/OtpScreen';
import CreateProfileScreen from '../features/auth/screens/CreateProfileScreen';
import ForgotPasswordScreen from '../features/auth/screens/ForgotPasswordScreen';
import VerifyResetCodeScreen from '../features/auth/screens/VerifyResetCodeScreen';
import ResetPasswordScreen from '../features/auth/screens/ResetPasswordScreen';
import MainTabNavigator from './MainTabNavigator';
import NotificationsScreen from '../features/notifications/screens/NotificationsScreen';
import TripDetailScreen from '../features/trip-history/screens/TripDetailScreen';
import { MapScreen, FindingDriverScreen, DriverFoundScreen, OnTripScreen, RideCompleteScreen, DestinationSearchScreen, PickupLocationScreen } from '../features/ride';
import {
  ChangePasswordScreen,
  MembershipPackagesScreen,
  PromoCodeScreen,
  MemberTierScreen,
  TermsPolicyScreen,
  SupportCenterScreen,
  CompanyInfoScreen,
  BecomeDriverScreen,
  ProfileScreen,
} from '../features/profile';
import { useAuthStore } from '../store';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const token = useAuthStore(s => s.token);
  const hasHydrated = useAuthStore(s => s._hasHydrated);

  // Chờ SecureStore đọc xong trước khi quyết định màn hình đầu tiên
  if (!hasHydrated) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#2563EB' }}>
        <ActivityIndicator size="large" color="white" />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      {token ? (
        <>
          <Stack.Screen name={ROUTES.MAIN} component={MainTabNavigator} />
          <Stack.Screen name={ROUTES.NOTIFICATIONS} component={NotificationsScreen} />
          <Stack.Screen name={ROUTES.DESTINATION_SEARCH} component={DestinationSearchScreen} />
          <Stack.Screen name={ROUTES.PICKUP_LOCATION} component={PickupLocationScreen} />
          <Stack.Screen name={ROUTES.MAP} component={MapScreen} />
          <Stack.Screen name={ROUTES.FINDING_DRIVER} component={FindingDriverScreen} />
          <Stack.Screen name={ROUTES.DRIVER_FOUND} component={DriverFoundScreen} />
          <Stack.Screen name={ROUTES.ON_TRIP} component={OnTripScreen} />
          <Stack.Screen name={ROUTES.RIDE_COMPLETE} component={RideCompleteScreen} />
          <Stack.Screen name={ROUTES.CHANGE_PASSWORD} component={ChangePasswordScreen} />
          <Stack.Screen name={ROUTES.MEMBERSHIP_PACKAGES} component={MembershipPackagesScreen} />
          <Stack.Screen name={ROUTES.PROMO_CODE} component={PromoCodeScreen} />
          <Stack.Screen name={ROUTES.MEMBER_TIER} component={MemberTierScreen} />
          <Stack.Screen name={ROUTES.TERMS_POLICY} component={TermsPolicyScreen} />
          <Stack.Screen name={ROUTES.SUPPORT_CENTER} component={SupportCenterScreen} />
          <Stack.Screen name={ROUTES.COMPANY_INFO} component={CompanyInfoScreen} />
          <Stack.Screen name={ROUTES.BECOME_DRIVER} component={BecomeDriverScreen} />
          <Stack.Screen name={ROUTES.PROFILE} component={ProfileScreen} />
          <Stack.Screen name={ROUTES.TRIP_DETAIL} component={TripDetailScreen} />
        </>
      ) : (
        <>
          <Stack.Screen name={ROUTES.LOGIN} component={LoginScreen} />
          <Stack.Screen name={ROUTES.REGISTER} component={RegisterScreen} />
          <Stack.Screen name={ROUTES.OTP} component={OtpScreen} />
          <Stack.Screen name={ROUTES.CREATE_PROFILE} component={CreateProfileScreen} />
          <Stack.Screen name={ROUTES.FORGOT_PASSWORD} component={ForgotPasswordScreen} />
          <Stack.Screen name={ROUTES.VERIFY_RESET_CODE} component={VerifyResetCodeScreen} />
          <Stack.Screen name={ROUTES.RESET_PASSWORD} component={ResetPasswordScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}
