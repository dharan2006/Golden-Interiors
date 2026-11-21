import { useEffect, useState } from 'react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';
import { GOLDEN_INTERIORS_ANCHOR } from '../data/catalog';
import type { AuthorAttributionData, LivePhoto, LivePlaceProfile, LiveReview } from '../types/golden';

function isQuotaError(err: unknown): boolean {
  const msg = String((err as { message?: string; status?: string })?.message ?? err ?? '');
  const status = String((err as { status?: string; code?: string | number })?.status ?? '');
  const code = (err as { code?: number })?.code;
  return (
    code === 429 ||
    status === 'RESOURCE_EXHAUSTED' ||
    status === 'OVER_QUERY_LIMIT' ||
    msg.includes('RESOURCE_EXHAUSTED') ||
    msg.includes('OVER_QUERY_LIMIT') ||
    msg.includes('QuotaExceeded') ||
    msg.includes('429')
  );
}

function haversineMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s1 = Math.sin(dLat / 2);
  const s2 = Math.sin(dLng / 2);
  const c = s1 * s1 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * s2 * s2;
  return 2 * R * Math.atan2(Math.sqrt(c), Math.sqrt(1 - c));
}

function mapAuthor(
  attr?: google.maps.places.AuthorAttribution | null
): AuthorAttributionData {
  return {
    displayName: attr?.displayName || 'Google Maps User',
    uri: attr?.uri ?? null,
    photoURI: attr?.photoURI ?? null,
  };
}

export interface UseGoldenPlaceResult {
  place: LivePlaceProfile | null;
  loading: boolean;
  error: string | null;
  retry: () => void;
}

export function useGoldenPlace(): UseGoldenPlaceResult {
  const placesLib = useMapsLibrary('places');
  const [place, setPlace] = useState<LivePlaceProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState<number>(0);

  useEffect(() => {
    if (!placesLib) return;

    let cancelled = false;

    async function loadGoldenInteriors() {
      setLoading(true);
      setError(null);

      try {
        const { Place } = placesLib!;

        // Search biased directly to the resolved coordinates from the shared Google Maps link.
        const searchRequest: google.maps.places.SearchByTextRequest & {
          internalUsageAttributionIds?: string[];
        } = {
          textQuery: 'Golden Interiors Kundrathur Chennai',
          fields: ['id', 'displayName', 'location', 'formattedAddress'],
          locationBias: GOLDEN_INTERIORS_ANCHOR,
          language: 'en',
          region: 'IN',
          maxResultCount: 5,
          internalUsageAttributionIds: ['gmp_mcp_codeassist_v1_aistudio'],
        };

        let { places } = await Place.searchByText(searchRequest);

        if (!places || places.length === 0) {
          const fallbackSearch = await Place.searchByText({
            textQuery: 'Golden Interiors Chennai',
            fields: ['id', 'displayName', 'location', 'formattedAddress'],
            locationBias: GOLDEN_INTERIORS_ANCHOR,
            language: 'en',
            region: 'IN',
            maxResultCount: 5,
            internalUsageAttributionIds: ['gmp_mcp_codeassist_v1_aistudio'],
          } as google.maps.places.SearchByTextRequest);
          places = fallbackSearch.places;
        }

        if (cancelled) return;

        if (!places || places.length === 0) {
          setError('Unable to locate the live Google Maps listing right now.');
          setLoading(false);
          return;
        }

        // Select the candidate closest to the exact Google Maps coordinates (12.9987655, 80.1023541).
        const ranked = [...places].sort((pA, pB) => {
          const locA = pA.location
            ? { lat: pA.location.lat(), lng: pA.location.lng() }
            : { lat: 0, lng: 0 };
          const locB = pB.location
            ? { lat: pB.location.lat(), lng: pB.location.lng() }
            : { lat: 0, lng: 0 };
          return (
            haversineMeters(locA, GOLDEN_INTERIORS_ANCHOR) -
            haversineMeters(locB, GOLDEN_INTERIORS_ANCHOR)
          );
        });

        const targetPlace = ranked[0];

        // Fetch full live details, photos, opening hours, and customer reviews via Places API (New).
        await targetPlace.fetchFields({
          fields: [
            'displayName',
            'formattedAddress',
            'location',
            'rating',
            'userRatingCount',
            'reviews',
            'photos',
            'regularOpeningHours',
            'nationalPhoneNumber',
            'internationalPhoneNumber',
            'websiteURI',
            'googleMapsURI',
            'businessStatus',
          ],
        });

        let openNow: boolean | null = null;
        try {
          if (typeof targetPlace.isOpen === 'function') {
            const status = await targetPlace.isOpen();
            if (typeof status === 'boolean') {
              openNow = status;
            }
          }
        } catch {
          openNow = null;
        }

        if (cancelled) return;

        // Dynamically generate photo URIs (never cached per Google Maps Platform ToS).
        const livePhotos: LivePhoto[] = (targetPlace.photos ?? []).slice(0, 10).map((photo, idx) => ({
          id: `gmp-photo-${idx}`,
          thumbUri: photo.getURI({ maxWidth: 720, maxHeight: 540 }),
          fullUri: photo.getURI({ maxWidth: 1440, maxHeight: 1080 }),
          widthPx: photo.widthPx ?? 1000,
          heightPx: photo.heightPx ?? 750,
          attributions: (photo.authorAttributions ?? []).map(mapAuthor),
          googleMapsURI: (photo as unknown as { googleMapsURI?: string | null }).googleMapsURI ?? null,
        }));

        // Extract live verified reviews with mandatory author attribution.
        const liveReviews: LiveReview[] = (targetPlace.reviews ?? []).map((rev, idx) => ({
          id: `gmp-review-${idx}`,
          rating: typeof rev.rating === 'number' ? rev.rating : 5,
          text: rev.text ?? '',
          relativeTime: rev.relativePublishTimeDescription ?? '',
          publishTimeMs: rev.publishTime instanceof Date ? rev.publishTime.getTime() : null,
          author: mapAuthor(rev.authorAttribution),
          googleMapsURI: (rev as unknown as { googleMapsURI?: string | null }).googleMapsURI ?? null,
        }));

        const loc = targetPlace.location
          ? { lat: targetPlace.location.lat(), lng: targetPlace.location.lng() }
          : GOLDEN_INTERIORS_ANCHOR;

        const profile: LivePlaceProfile = {
          id: targetPlace.id,
          displayName: targetPlace.displayName || 'Golden Interiors',
          formattedAddress: targetPlace.formattedAddress || '',
          location: loc,
          rating: typeof targetPlace.rating === 'number' ? targetPlace.rating : null,
          userRatingCount:
            typeof targetPlace.userRatingCount === 'number' ? targetPlace.userRatingCount : null,
          businessStatus: targetPlace.businessStatus ?? null,
          nationalPhoneNumber: targetPlace.nationalPhoneNumber ?? null,
          internationalPhoneNumber: targetPlace.internationalPhoneNumber ?? null,
          websiteURI: targetPlace.websiteURI ?? null,
          googleMapsURI: targetPlace.googleMapsURI ?? null,
          weekdayDescriptions: targetPlace.regularOpeningHours?.weekdayDescriptions ?? [],
          isOpenNow: openNow,
          reviews: liveReviews,
          photos: livePhotos,
        };

        setPlace(profile);
        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        console.error('Failed to load Google Maps Place details:', err);
        if (isQuotaError(err)) {
          window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
        }
        setError('Unable to load live Google Maps details right now. Please try refreshing.');
        setLoading(false);
      }
    }

    void loadGoldenInteriors();

    return () => {
      cancelled = true;
    };
  }, [placesLib, attempt]);

  return {
    place,
    loading,
    error,
    retry: () => setAttempt((n) => n + 1),
  };
}
