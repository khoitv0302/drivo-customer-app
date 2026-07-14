import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Tùy chọn chuyến đi ở màn Map (cho phép xe điện / xuất hóa đơn VAT) — lưu bền trên máy,
// mặc định cho phép xe điện, không xuất hóa đơn VAT.
interface RideOptionsState {
  allowElectricVehicle: boolean;
  vatInvoiceRequested: boolean;
  setAllowElectricVehicle: (value: boolean) => void;
  setVatInvoiceRequested: (value: boolean) => void;
}

export const useRideOptionsStore = create<RideOptionsState>()(
  persist(
    (set) => ({
      allowElectricVehicle: true,
      vatInvoiceRequested: false,
      setAllowElectricVehicle: (value) => set({ allowElectricVehicle: value }),
      setVatInvoiceRequested: (value) => set({ vatInvoiceRequested: value }),
    }),
    {
      name: 'drivo-ride-options',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
