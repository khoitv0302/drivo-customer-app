import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import Mapbox, { locationManager } from '@rnmapbox/maps';
import type { Location } from '@rnmapbox/maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { ROUTES } from '@constants/routes';
import { reverseGeocode, getNearbyPlaces, pickBestPoi, ON_TOP_METERS } from '@services/places/placesService';
import type { PlaceDetails } from '@services/places/types';
import type { RootScreenProps } from '@navigation/types';

const HCM_FALLBACK: [number, number] = [106.660172, 10.762622];

export default function PickupLocationScreen({
  navigation,
  route,
}: RootScreenProps<'PickupLocation'>) {
  const { serviceType, destination, preselectedOrigin, initialLat, initialLng } = route.params;
  const insets = useSafeAreaInsets();

  // Initial camera center: preselected > passed GPS from previous screen > fallback
  const initCenter: [number, number] = preselectedOrigin
    ? [preselectedOrigin.longitude, preselectedOrigin.latitude]
    : initialLng != null && initialLat != null
    ? [initialLng, initialLat]
    : HCM_FALLBACK;

  const cameraRef = useRef<Mapbox.Camera>(null);
  const lastResolvedKey = useRef<string>('');

  const [gpsCoords, setGpsCoords] = useState<[number, number] | null>(null);
  const [pinCoords, setPinCoords] = useState<[number, number]>(initCenter);
  const [pinDetails, setPinDetails] = useState<PlaceDetails | null>(null);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [noteModalVisible, setNoteModalVisible] = useState(false);
  const [noteDraft, setNoteDraft] = useState('');

  // GPS listener — only for recenter. Initial position comes from params so no need to wait.
  useEffect(() => {
    const onLocation = (loc: Location) => {
      const lng = loc.coords.longitude;
      const lat = loc.coords.latitude;
      if (!isFinite(lng) || !isFinite(lat)) return;
      setGpsCoords([lng, lat]);
    };
    // Small delay so previous screen's locationManager.stop() cleanup finishes first
    const startTimer = setTimeout(() => {
      locationManager.start();
      locationManager.addListener(onLocation);
    }, 300);
    return () => {
      clearTimeout(startTimer);
      locationManager.removeListener(onLocation);
      locationManager.stop();
    };
  }, []);

  // When returning from DS with a searched pickup address, update pin + fly camera
  useEffect(() => {
    if (!preselectedOrigin) return;
    const coords: [number, number] = [preselectedOrigin.longitude, preselectedOrigin.latitude];
    setPinCoords(coords);
    setPinDetails({
      placeId: preselectedOrigin.placeId,
      name: preselectedOrigin.name,
      address: preselectedOrigin.address,
      latitude: preselectedOrigin.latitude,
      longitude: preselectedOrigin.longitude,
    });
    cameraRef.current?.setCamera({ centerCoordinate: coords, zoomLevel: 16.5, animationDuration: 400 });
  }, [preselectedOrigin?.placeId]);

  async function resolvePin(coords: [number, number]) {
    setIsGeocoding(true);
    const [lng, lat] = coords;
    try {
      const [nearby, geocoded] = await Promise.all([
        getNearbyPlaces(lat, lng),
        reverseGeocode(lat, lng),
      ]);
      const best = pickBestPoi(nearby, lat, lng);
      // Geocode gave a house number → exact street address, don't override with a nearby POI
      const geocodeHasHouseNumber = geocoded?.name != null && /\d/.test(geocoded.name);
      const isOnTop = best != null && best.distanceMeters <= ON_TOP_METERS;
      const poiName = best
        ? isOnTop ? best.poi.name : `Gần ${best.poi.name}`
        : null;
      const name = geocodeHasHouseNumber
        ? geocoded!.name
        : poiName || geocoded?.name || 'Vị trí đã chọn';
      const address = geocodeHasHouseNumber
        ? geocoded!.address
        : best?.poi.address || geocoded?.address || '';
      setPinDetails({
        placeId: `pin_${lng.toFixed(5)}_${lat.toFixed(5)}`,
        name,
        address,
        latitude: lat,
        longitude: lng,
      });
      console.log('[resolvePin]', name, '|', address);
    } finally {
      setIsGeocoding(false);
    }
  }

  function handleMapIdle(event: any) {
    const coords = event?.properties?.center as [number, number] | undefined;
    if (!coords) return;
    const key = `${coords[0].toFixed(5)},${coords[1].toFixed(5)}`;
    if (key === lastResolvedKey.current) return;
    lastResolvedKey.current = key;
    setPinCoords(coords);
    resolvePin(coords);
  }

  function recenterToGPS() {
    if (!gpsCoords) return;
    const key = `${gpsCoords[0].toFixed(5)},${gpsCoords[1].toFixed(5)}`;
    lastResolvedKey.current = key;
    setPinCoords(gpsCoords);
    cameraRef.current?.setCamera({ centerCoordinate: gpsCoords, zoomLevel: 16.5, animationDuration: 500 });
    resolvePin(gpsCoords);
  }

  function openPickupSearch() {
    navigation.push(ROUTES.DESTINATION_SEARCH, {
      serviceType,
      editField: 'origin',
      currentDestination: destination,
      returnToPickup: true,
    });
  }

  function openNoteModal() {
    setNoteDraft(noteText);
    setNoteModalVisible(true);
  }

  function saveNote() {
    setNoteText(noteDraft.trim());
    setNoteModalVisible(false);
  }

  function confirmPickup() {
    if (!pinDetails) return;
    const origin: PlaceDetails = noteText.trim()
      ? { ...pinDetails, name: `${pinDetails.name} (${noteText.trim()})` }
      : pinDetails;
    // push (không replace) để back từ Map quay đúng lại màn chọn điểm đón này.
    navigation.push(ROUTES.MAP, { serviceType, origin, destination });
  }

  return (
    <View style={StyleSheet.absoluteFillObject}>
      <StatusBar style="dark" />
      {/* Map */}
      <Mapbox.MapView
        style={StyleSheet.absoluteFillObject}
        styleURL="mapbox://styles/mapbox/streets-v12"
        logoEnabled={false}
        attributionEnabled={false}
        localizeLabels={{ locale: 'vi' }}
        onMapIdle={handleMapIdle}
        scrollEnabled
        zoomEnabled
        rotateEnabled={false}
        pitchEnabled={false}
      >
        <Mapbox.Camera
          ref={cameraRef as any}
          defaultSettings={{ centerCoordinate: initCenter, zoomLevel: 16.5 }}
        />
        {/* KHÔNG bật pulsing ở màn này: animation chạy liên tục khiến map không bao giờ vào
            trạng thái idle → onMapIdle không bắn → không resolve được địa chỉ khi kéo ghim. */}
        <Mapbox.LocationPuck visible />
      </Mapbox.MapView>

      {/* Fixed center pin */}
      <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
        <View style={s.pinOverlay}>
          <View style={s.calloutWrap}>
            {isGeocoding ? (
              <View style={s.callout}>
                <ActivityIndicator size="small" color="#2563EB" />
              </View>
            ) : pinDetails ? (
              <View style={s.callout}>
                <Text style={s.calloutText} numberOfLines={2}>{pinDetails.name}</Text>
                <View style={s.calloutArrow} />
              </View>
            ) : null}
          </View>
          <Image source={require('../../../../assets/pin.png')} style={s.centerPin} resizeMode="contain" />
          <View style={s.pinShadow} />
        </View>
      </View>

      {/* Floating top bar — no background, elements float over map */}
      <View style={[s.topBar, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={s.backBtn}
          activeOpacity={0.8}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="arrow-back" size={18} color="#111827" />
        </TouchableOpacity>
        <TouchableOpacity style={s.searchBar} activeOpacity={0.85} onPress={openPickupSearch}>
          <Ionicons name="ellipse" size={11} color="#2563EB" style={{ marginTop: 1 }} />
          <Text style={s.searchLabel}>Đón tại?</Text>
        </TouchableOpacity>
      </View>

      {/* Recenter button */}
      <TouchableOpacity
        style={[s.recenterBtn, { bottom: 280 }]}
        onPress={recenterToGPS}
        activeOpacity={0.8}
      >
        <Ionicons name="locate" size={20} color="#374151" />
      </TouchableOpacity>

      {/* Bottom sheet */}
      <View style={[s.bottomSheet, { paddingBottom: insets.bottom + 12 }]}>
        <View style={s.handle} />

        <View style={s.addressRow}>
          <View style={s.addressDot} />
          <View style={{ flex: 1 }}>
            {isGeocoding ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <ActivityIndicator size="small" color="#2563EB" />
                <Text style={s.addressSub}>Đang xác định vị trí...</Text>
              </View>
            ) : (
              <>
                <Text style={s.addressName} numberOfLines={1}>{pinDetails?.name ?? '...'}</Text>
                <Text style={s.addressSub} numberOfLines={1}>{pinDetails?.address ?? ''}</Text>
              </>
            )}
          </View>
        </View>

        <View style={s.divider} />

        <TouchableOpacity style={s.noteRow} activeOpacity={0.7} onPress={openNoteModal}>
          <Ionicons name="add-circle" size={18} color="#2563EB" />
          <Text style={s.noteText} numberOfLines={1}>
            {noteText.trim() ? noteText : 'Thêm chi tiết điểm đón (ví dụ: gần cổng)'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.confirmBtn, (!pinDetails || isGeocoding) && s.confirmBtnDisabled]}
          activeOpacity={0.85}
          disabled={!pinDetails || isGeocoding}
          onPress={confirmPickup}
        >
          <Text style={s.confirmText}>Chọn điểm đón này</Text>
        </TouchableOpacity>
      </View>

      {/* Popup thêm chi tiết điểm đón — tách khỏi bottom sheet để không bị bàn phím che. */}
      <Modal
        transparent
        animationType="slide"
        visible={noteModalVisible}
        onRequestClose={() => setNoteModalVisible(false)}
        statusBarTranslucent
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={s.noteModalRoot}
        >
          <TouchableWithoutFeedback onPress={() => setNoteModalVisible(false)}>
            <View style={StyleSheet.absoluteFillObject} />
          </TouchableWithoutFeedback>

          <View style={[s.noteModalSheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={s.handle} />
            <Text style={s.noteModalTitle}>Thêm chi tiết điểm đón</Text>
            <TextInput
              value={noteDraft}
              onChangeText={setNoteDraft}
              placeholder="Ví dụ: gần cổng, tầng 2..."
              placeholderTextColor="#9ca3af"
              style={s.noteTextarea}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              autoFocus
            />
            <TouchableOpacity style={s.noteSaveBtn} activeOpacity={0.85} onPress={saveNote}>
              <Text style={s.noteSaveText}>Lưu</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  topBar: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 10,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'white',
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 4,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'white',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  searchLabel: { fontSize: 14, fontWeight: '500', color: '#6b7280', flex: 1 },
  pinOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 48,
  },
  calloutWrap: { alignItems: 'center', marginBottom: 6 },
  callout: {
    backgroundColor: 'white',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxWidth: 220,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 6,
  },
  calloutText: { fontSize: 13, fontWeight: '600', color: '#111827', textAlign: 'center' },
  calloutArrow: {
    position: 'absolute',
    bottom: -7,
    width: 14, height: 14,
    backgroundColor: 'white',
    transform: [{ rotate: '45deg' }],
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  centerPin: { width: 48, height: 48 },
  pinShadow: {
    width: 10, height: 5, borderRadius: 5,
    backgroundColor: 'rgba(0,0,0,0.18)',
    marginTop: -4,
  },
  recenterBtn: {
    position: 'absolute',
    right: 16,
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'white',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  bottomSheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'white',
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingHorizontal: 20, paddingTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 12,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: '#e5e7eb',
    alignSelf: 'center', marginBottom: 14,
  },
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 },
  addressDot: {
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: '#2563EB',
    borderWidth: 2.5, borderColor: '#bfdbfe',
    flexShrink: 0,
  },
  addressName: { fontSize: 15, fontWeight: '700', color: '#111827' },
  addressSub: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  divider: { height: 1, backgroundColor: '#f3f4f6', marginVertical: 12 },
  noteRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: 4 },
  noteText: { fontSize: 13, color: '#2563EB', fontWeight: '500', flex: 1 },
  noteModalRoot: { flex: 1, justifyContent: 'flex-end' },
  noteModalSheet: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingHorizontal: 20, paddingTop: 8,
  },
  noteModalTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 14 },
  noteTextarea: {
    borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: '#111827', minHeight: 100,
  },
  noteSaveBtn: {
    backgroundColor: '#2563EB', borderRadius: 14,
    paddingVertical: 15, alignItems: 'center', marginTop: 16,
  },
  noteSaveText: { color: 'white', fontSize: 15, fontWeight: '700' },
  confirmBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 14,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  confirmBtnDisabled: { backgroundColor: '#93c5fd', shadowOpacity: 0, elevation: 0 },
  confirmText: { color: 'white', fontSize: 16, fontWeight: '700' },
});
