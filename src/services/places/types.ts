export interface PlacePrediction {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
  /** Khoảng cách (m) từ vị trí hiện tại — chỉ có khi request kèm origin */
  distanceMeters?: number;
}

export interface PlaceLocation {
  lat: number;
  lng: number;
}

export interface PlaceDetails {
  placeId: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
}
