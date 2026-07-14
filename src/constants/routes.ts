// Route name constants — không hardcode magic string trong navigation
export const ROUTES = {
  LOGIN: 'Login',
  REGISTER: 'Register',
  OTP: 'Otp',
  CREATE_PROFILE: 'CreateProfile',
  FORGOT_PASSWORD: 'ForgotPassword',
  VERIFY_RESET_CODE: 'VerifyResetCode',
  RESET_PASSWORD: 'ResetPassword',
  MAIN: 'Main',
  NOTIFICATIONS: 'Notifications',
  MAP: 'Map',
  FINDING_DRIVER: 'FindingDriver',
  DRIVER_FOUND: 'DriverFound',
  ON_TRIP: 'OnTrip',
  RIDE_COMPLETE: 'RideComplete',
  DESTINATION_SEARCH: 'DestinationSearch',
  PICKUP_LOCATION: 'PickupLocation',
  CHANGE_PASSWORD: 'ChangePassword',
  MEMBERSHIP_PACKAGES: 'MembershipPackages',
  PROMO_CODE: 'PromoCode',
  MEMBER_TIER: 'MemberTier',
  TERMS_POLICY: 'TermsPolicy',
  SUPPORT_CENTER: 'SupportCenter',
  COMPANY_INFO: 'CompanyInfo',
  BECOME_DRIVER: 'BecomeDriver',
  PROFILE: 'Profile',
  TRIP_DETAIL: 'TripDetail',
} as const;

// Tên các tab trong MainTabNavigator
export const TABS = {
  HOME: 'Home',
  HISTORY: 'History',
  NOTIFICATIONS: 'Notifications',
  ACCOUNT: 'Account',
} as const;
