export interface AuthorAttributionData {
  displayName: string;
  uri: string | null;
  photoURI: string | null;
}

export interface LiveReview {
  id: string;
  rating: number;
  text: string;
  relativeTime: string;
  publishTimeMs: number | null;
  author: AuthorAttributionData;
  googleMapsURI?: string | null;
}

export interface LivePhoto {
  id: string;
  thumbUri: string;
  fullUri: string;
  widthPx: number;
  heightPx: number;
  attributions: AuthorAttributionData[];
  googleMapsURI?: string | null;
}

export interface LivePlaceProfile {
  id: string;
  displayName: string;
  formattedAddress: string;
  location: { lat: number; lng: number };
  rating: number | null;
  userRatingCount: number | null;
  businessStatus: string | null;
  nationalPhoneNumber: string | null;
  internationalPhoneNumber: string | null;
  websiteURI: string | null;
  googleMapsURI: string | null;
  weekdayDescriptions: string[];
  isOpenNow: boolean | null;
  reviews: LiveReview[];
  photos: LivePhoto[];
}

export type StudioModelId = 'pleated' | 'zebra' | 'ss316';
export type FrameFinishId = 'champagne' | 'charcoal' | 'teak' | 'ivory';
export type CameraPresetId = 'front' | 'angle' | 'detail' | 'top';

export interface ProductSolution {
  id: string;
  index: string;
  name: string;
  category: 'Insect Screens' | 'Window Blinds' | 'Balcony Protection';
  tagline: string;
  description: string;
  specs: string[];
  ratePerSqFtMin: number;
  ratePerSqFtMax: number;
  image: string;
  imageAlt: string;
  featured?: boolean;
  studioModel?: StudioModelId;
}

export interface EstimatorLineItem {
  id: string;
  roomLabel: string;
  productId: string;
  productName: string;
  finishName: string;
  widthFt: number;
  heightFt: number;
  sqFt: number;
  estimatedMin: number;
  estimatedMax: number;
}
