import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  saveRefreshToken,
  getRefreshToken,
  deleteRefreshToken,
} from '@services/storage/tokenStorage';

// Phiên đăng nhập trả về từ API verify OTP / refresh.
export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  userId: string;
  roles: string[];
  driverStatus: string;
}

interface AuthState {
  token: string | null; // = accessToken; RootNavigator dùng để gate auth
  refreshToken: string | null; // giữ trong RAM cho interceptor; nguồn bền vững là SecureStore
  userId: string | null;
  roles: string[];
  driverStatus: string | null;
  _hasHydrated: boolean;
  setToken: (token: string) => void;
  setSession: (session: AuthSession) => void;
  clearToken: () => void;
  _setHydrated: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      refreshToken: null,
      userId: null,
      roles: [],
      driverStatus: null,
      _hasHydrated: false,
      setToken: (token) => set({ token }),
      setSession: (session) => {
        // Ghi refresh token vào SecureStore (bền, mã hoá); phần còn lại vào AsyncStorage qua persist.
        saveRefreshToken(session.refreshToken).catch(() => {});
        set({
          token: session.accessToken,
          refreshToken: session.refreshToken,
          userId: session.userId,
          roles: session.roles,
          driverStatus: session.driverStatus,
        });
      },
      clearToken: () => {
        deleteRefreshToken().catch(() => {});
        set({ token: null, refreshToken: null, userId: null, roles: [], driverStatus: null });
      },
      _setHydrated: () => set({ _hasHydrated: true }),
    }),
    {
      name: 'drivo-auth',
      storage: createJSONStorage(() => AsyncStorage),
      // KHÔNG persist refreshToken ở đây — nó nằm trong SecureStore, không để plaintext trong AsyncStorage.
      partialize: (state) => ({
        token: state.token,
        userId: state.userId,
        roles: state.roles,
        driverStatus: state.driverStatus,
      }),
      onRehydrateStorage: () => () => {
        // Sau khi AsyncStorage hydrate xong, nạp refresh token từ SecureStore rồi mới báo hydrated
        // để RootNavigator không gate sai trong lúc token còn đang nạp.
        getRefreshToken()
          .then((rt) => useAuthStore.setState({ refreshToken: rt }))
          .catch(() => {})
          .finally(() => useAuthStore.getState()._setHydrated());
      },
    }
  )
);
