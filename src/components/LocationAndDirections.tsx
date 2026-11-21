import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Map as GoogleMap,
  AdvancedMarker,
  InfoWindow,
  Pin,
  useMap,
  useMapsLibrary,
  useAdvancedMarkerRef,
} from '@vis.gl/react-google-maps';
import {
  MapPin,
  Navigation,
  Clock,
  Phone,
  ExternalLink,
  Route as RouteIcon,
  Search,
  X,
} from 'lucide-react';
import {
  CHENNAI_QUICK_AREAS,
  GOLDEN_INTERIORS_ANCHOR,
  GOLDEN_MAPS_SHORT_URL,
} from '../data/catalog';
import type { LivePlaceProfile } from '../types/golden';

interface LocationAndDirectionsProps {
  place: LivePlaceProfile | null;
  onSelectAreaForBooking: (areaName: string) => void;
}

interface RouteSummary {
  originLabel: string;
  distanceKm: number;
  durationMins: number;
}

interface SuggestionItem {
  placeId: string;
  mainText: string;
  secondaryText: string;
  fullText: string;
}

function isQuotaError(err: unknown): boolean {
  const msg = String((err as { message?: string })?.message ?? err ?? '');
  return (
    msg.includes('RESOURCE_EXHAUSTED') ||
    msg.includes('OVER_QUERY_LIMIT') ||
    msg.includes('QuotaExceeded') ||
    msg.includes('429')
  );
}

interface RouteOverlayProps {
  originQuery: string | null;
  destination: { lat: number; lng: number };
  onRouteComputed: (summary: RouteSummary | null) => void;
  onRouteError: (msg: string | null) => void;
  onRouteLoading: (loading: boolean) => void;
}

/**
 * Modern Routes API renderer using useMapsLibrary('routes') and Route.computeRoutes().
 * Replaces deprecated DirectionsService/DirectionsRenderer cleanly and avoids CORS issues.
 */
const RouteOverlay: React.FC<RouteOverlayProps> = ({
  originQuery,
  destination,
  onRouteComputed,
  onRouteError,
  onRouteLoading,
}) => {
  const map = useMap();
  const routesLib = useMapsLibrary('routes');
  const polylinesRef = useRef<google.maps.Polyline[]>([]);

  useEffect(() => {
    // Clear existing polylines on any change
    polylinesRef.current.forEach((p) => p.setMap(null));
    polylinesRef.current = [];

    if (!originQuery) {
      onRouteComputed(null);
      onRouteError(null);
      onRouteLoading(false);
      if (map) {
        map.panTo(destination);
        map.setZoom(15);
      }
      return;
    }

    if (!routesLib || !map) return;

    let cancelled = false;
    onRouteLoading(true);
    onRouteError(null);

    const request = {
      origin: originQuery,
      destination,
      travelMode: 'DRIVING',
      fields: ['path', 'distanceMeters', 'durationMillis', 'viewport', 'legs'],
    };

    const RouteClass = (routesLib as unknown as {
      Route?: {
        computeRoutes: (req: unknown) => Promise<{
          routes?: Array<{
            distanceMeters?: number;
            durationMillis?: number;
            viewport?: google.maps.LatLngBounds;
            createPolylines: () => google.maps.Polyline[];
          }>;
        }>;
      };
    }).Route;

    if (!RouteClass || typeof RouteClass.computeRoutes !== 'function') {
      onRouteLoading(false);
      onRouteError('Live route preview is unavailable in this browser session.');
      return;
    }

    RouteClass.computeRoutes(request)
      .then(({ routes }) => {
        if (cancelled) return;
        onRouteLoading(false);

        if (!routes || routes.length === 0) {
          onRouteComputed(null);
          onRouteError('No driving route found from that location. Try a Chennai neighborhood.');
          return;
        }

        const primaryRoute = routes[0];
        const newPolylines = primaryRoute.createPolylines();
        newPolylines.forEach((polyline) => {
          polyline.setOptions({
            strokeColor: '#9A7228',
            strokeOpacity: 0.92,
            strokeWeight: 5,
          });
          polyline.setMap(map);
        });
        polylinesRef.current = newPolylines;

        if (primaryRoute.viewport) {
          map.fitBounds(primaryRoute.viewport, 48);
        }

        onRouteComputed({
          originLabel: originQuery,
          distanceKm: Number(((primaryRoute.distanceMeters ?? 0) / 1000).toFixed(1)),
          durationMins: Math.max(1, Math.round((primaryRoute.durationMillis ?? 0) / 60000)),
        });
      })
      .catch((err) => {
        if (cancelled) return;
        onRouteLoading(false);
        console.error('Routes API computeRoutes error:', err);
        if (isQuotaError(err)) {
          window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
        }
        onRouteComputed(null);
        onRouteError('Could not calculate route right now. Try another neighborhood or open Google Maps.');
      });

    return () => {
      cancelled = true;
      polylinesRef.current.forEach((p) => p.setMap(null));
      polylinesRef.current = [];
    };
  }, [originQuery, destination.lat, destination.lng, routesLib, map]);

  return null;
};

interface ShowroomMarkerProps {
  position: { lat: number; lng: number };
  place: LivePlaceProfile | null;
}

const ShowroomMarker: React.FC<ShowroomMarkerProps> = ({ position, place }) => {
  const [markerRef, marker] = useAdvancedMarkerRef();
  const [open, setOpen] = useState<boolean>(true);

  return (
    <>
      <AdvancedMarker
        ref={markerRef}
        position={position}
        title={place?.displayName ?? 'Golden Interiors'}
        onClick={() => setOpen((prev) => !prev)}
      >
        <Pin
          background="#9A7228"
          borderColor="#181715"
          glyphColor="#FAFAF8"
          scale={1.25}
        />
      </AdvancedMarker>

      {open && marker && (
        <InfoWindow
          anchor={marker}
          maxWidth={270}
          onCloseClick={() => setOpen(false)}
        >
          <div className="p-1 text-[#181715] font-sans">
            <p className="font-display font-semibold text-sm text-[#181715]">
              {place?.displayName ?? 'Golden Interiors'}
            </p>
            {place?.formattedAddress && (
              <p className="text-xs text-[#5C5952] mt-1 leading-snug">
                {place.formattedAddress}
              </p>
            )}
            <div className="mt-2 flex items-center gap-2 text-[11px]">
              {place?.isOpenNow !== null && place?.isOpenNow !== undefined && (
                <span
                  className={
                    place.isOpenNow
                      ? 'font-semibold text-emerald-800'
                      : 'font-semibold text-amber-800'
                  }
                >
                  {place.isOpenNow ? 'Open Now' : 'Currently Closed'}
                </span>
              )}
              {place?.rating && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums font-medium">
                    ★ {place.rating.toFixed(1)}
                  </span>
                </>
              )}
            </div>
            <a
              href={place?.googleMapsURI || GOLDEN_MAPS_SHORT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[#9A7228] hover:underline"
            >
              <span>Open in Google Maps</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </InfoWindow>
      )}
    </>
  );
};

export const LocationAndDirections: React.FC<LocationAndDirectionsProps> = ({
  place,
  onSelectAreaForBooking,
}) => {
  const placesLib = useMapsLibrary('places');
  const destination = place?.location ?? GOLDEN_INTERIORS_ANCHOR;
  const mapsUrl = place?.googleMapsURI || GOLDEN_MAPS_SHORT_URL;

  const [inputValue, setInputValue] = useState<string>('');
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [showDropdown, setShowDropdown] = useState<boolean>(false);
  const [activeOrigin, setActiveOrigin] = useState<string | null>(null);
  const [routeSummary, setRouteSummary] = useState<RouteSummary | null>(null);
  const [routeLoading, setRouteLoading] = useState<boolean>(false);
  const [routeError, setRouteError] = useState<string | null>(null);

  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);

  // Programmatic Places API (New) AutocompleteSuggestion with AutocompleteSessionToken
  useEffect(() => {
    const trimmed = inputValue.trim();
    if (!placesLib || trimmed.length < 3 || trimmed === activeOrigin) {
      setSuggestions([]);
      return;
    }

    const timer = window.setTimeout(async () => {
      try {
        if (!sessionTokenRef.current) {
          sessionTokenRef.current = new placesLib.AutocompleteSessionToken();
        }
        const { suggestions: raw } =
          await placesLib.AutocompleteSuggestion.fetchAutocompleteSuggestions({
            input: trimmed,
            sessionToken: sessionTokenRef.current,
            includedRegionCodes: ['in'],
            locationBias: {
              center: destination,
              radius: 35000,
            } as unknown as google.maps.places.LocationBias,
          });

        const parsed: SuggestionItem[] = (raw ?? [])
          .map((item) => item.placePrediction)
          .filter((p): p is google.maps.places.PlacePrediction => Boolean(p))
          .slice(0, 5)
          .map((p) => ({
            placeId: p.placeId,
            mainText: p.mainText?.text ?? p.text.text,
            secondaryText: p.secondaryText?.text ?? '',
            fullText: p.text.text,
          }));

        setSuggestions(parsed);
        setShowDropdown(parsed.length > 0);
      } catch (err) {
        if (isQuotaError(err)) {
          window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
        }
        setSuggestions([]);
      }
    }, 280);

    return () => window.clearTimeout(timer);
  }, [inputValue, placesLib, activeOrigin, destination.lat, destination.lng]);

  const triggerRouteFrom = useCallback((originText: string) => {
    setInputValue(originText);
    setActiveOrigin(originText);
    setShowDropdown(false);
    setSuggestions([]);
    sessionTokenRef.current = null;
  }, []);

  const handleRouteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = inputValue.trim();
    if (!cleaned) return;
    triggerRouteFrom(cleaned.toLowerCase().includes('chennai') ? cleaned : `${cleaned}, Chennai`);
  };

  return (
    <section id="location" className="py-20 lg:py-28 bg-[#141413] text-[#F5F3EE]">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-10 border-b border-white/10">
          <div className="max-w-2xl">
            <p className="text-xs font-mono text-[#D4AF5A] tracking-wide mb-3">
              Live Google Maps &amp; Routes · Chennai Showroom &amp; Free Home Visits
            </p>
            <h2 className="font-display text-3xl sm:text-4xl lg:text-[42px] font-medium tracking-tight text-[#FAFAF8] leading-[1.12]">
              Check travel time &amp; free home measurement coverage
            </h2>
          </div>

          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-medium text-[#141413] bg-[#D4AF5A] hover:bg-[#E1BF6D] rounded-lg transition-colors whitespace-nowrap shrink-0 self-start lg:self-auto"
          >
            <Navigation className="w-3.5 h-3.5" />
            <span>Open Directions in Google Maps</span>
          </a>
        </div>

        <div className="mt-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Left Panel: Live Place Info + Modern Route Checker */}
          <div className="lg:col-span-5 flex flex-col justify-between gap-6 bg-[#1C1B19] border border-white/10 rounded-xl p-6 sm:p-7">
            <div>
              {/* Address & Live Hours */}
              <div className="space-y-4 pb-6 border-b border-white/10">
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-[#D4AF5A] mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-neutral-400">Showroom &amp; Workshop Location</p>
                    <p className="text-sm text-[#FAFAF8] mt-0.5 leading-relaxed">
                      {place?.formattedAddress ||
                        'Loading verified address from Google Maps...'}
                    </p>
                  </div>
                </div>

                {place?.nationalPhoneNumber && (
                  <div className="flex items-start gap-3">
                    <Phone className="w-4 h-4 text-[#D4AF5A] mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-neutral-400">Direct Showroom Phone</p>
                      <a
                        href={`tel:${place.internationalPhoneNumber || place.nationalPhoneNumber}`}
                        className="text-sm font-mono tabular-nums text-[#FAFAF8] hover:text-[#D4AF5A] mt-0.5 inline-block"
                      >
                        {place.nationalPhoneNumber}
                      </a>
                    </div>
                  </div>
                )}

                {place?.weekdayDescriptions && place.weekdayDescriptions.length > 0 && (
                  <div className="flex items-start gap-3">
                    <Clock className="w-4 h-4 text-[#D4AF5A] mt-0.5 shrink-0" />
                    <div className="w-full">
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-neutral-400">Opening Hours</p>
                        {place.isOpenNow !== null && (
                          <span className="text-xs font-medium text-[#D4AF5A]">
                            {place.isOpenNow ? 'Open Now' : 'Closed Now'}
                          </span>
                        )}
                      </div>
                      <ul className="mt-1.5 space-y-1 text-xs text-neutral-300 font-mono">
                        {place.weekdayDescriptions.slice(0, 7).map((line) => (
                          <li key={line} className="truncate">
                            {line}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>

              {/* Interactive Route & Distance Calculator */}
              <div className="pt-6">
                <p className="text-xs font-mono text-[#D4AF5A] mb-2">
                  Live Driving Route Preview
                </p>
                <p className="text-sm text-neutral-300 mb-3">
                  Enter your Chennai locality to view driving distance from Golden Interiors and
                  check free site-visit availability.
                </p>

                <form onSubmit={handleRouteSubmit} className="relative">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
                        placeholder="e.g., Porur, Anna Nagar, Pallavaram..."
                        aria-label="Enter your Chennai area to check distance"
                        className="w-full bg-[#141413] border border-white/15 rounded-lg pl-9 pr-8 py-2.5 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-[#D4AF5A]"
                      />
                      {inputValue && (
                        <button
                          type="button"
                          onClick={() => {
                            setInputValue('');
                            setActiveOrigin(null);
                            setSuggestions([]);
                            setShowDropdown(false);
                          }}
                          aria-label="Clear location"
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <button
                      type="submit"
                      className="px-4 py-2.5 text-xs font-semibold text-[#141413] bg-[#D4AF5A] hover:bg-[#E1BF6D] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      Route
                    </button>
                  </div>

                  {/* Autocomplete Dropdown (Places API New) */}
                  {showDropdown && suggestions.length > 0 && (
                    <ul className="absolute left-0 right-0 mt-1.5 bg-[#1C1B19] border border-white/15 rounded-lg shadow-2xl overflow-hidden z-20">
                      {suggestions.map((s) => (
                        <li key={s.placeId}>
                          <button
                            type="button"
                            onClick={() => triggerRouteFrom(s.fullText)}
                            className="w-full text-left px-3.5 py-2.5 hover:bg-white/8 transition-colors cursor-pointer"
                          >
                            <p className="text-xs font-medium text-white truncate">{s.mainText}</p>
                            {s.secondaryText && (
                              <p className="text-[11px] text-neutral-400 truncate">
                                {s.secondaryText}
                              </p>
                            )}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </form>

                {/* Quick Chennai Locality Buttons */}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {CHENNAI_QUICK_AREAS.map((area) => {
                    const selected = activeOrigin === area.query;
                    return (
                      <button
                        key={area.label}
                        type="button"
                        onClick={() => triggerRouteFrom(area.query)}
                        className={`px-2.5 py-1 text-xs rounded-md border transition-colors whitespace-nowrap cursor-pointer ${
                          selected
                            ? 'bg-[#D4AF5A] text-[#141413] border-[#D4AF5A] font-medium'
                            : 'bg-[#141413] text-neutral-300 border-white/12 hover:border-white/35 hover:text-white'
                        }`}
                      >
                        {area.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Live Route Summary Card */}
            <div className="pt-4 border-t border-white/10">
              {routeLoading ? (
                <p className="text-xs text-neutral-400 font-mono">
                  Calculating live driving route via Google Maps Routes API...
                </p>
              ) : routeError ? (
                <p className="text-xs text-amber-300">{routeError}</p>
              ) : routeSummary ? (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 text-xs text-[#D4AF5A] font-mono tabular-nums">
                      <RouteIcon className="w-3.5 h-3.5" />
                      <span>
                        {routeSummary.distanceKm} km · ~{routeSummary.durationMins} min drive
                      </span>
                    </div>
                    <p className="text-xs text-neutral-300 mt-1">
                      {routeSummary.distanceKm <= 35
                        ? 'Eligible for complimentary on-site measurement & physical sample demo.'
                        : 'Extended Chennai corridor — contact showroom to confirm site visit slot.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onSelectAreaForBooking(routeSummary.originLabel)}
                    className="px-3.5 py-2 text-xs font-medium text-white bg-white/10 hover:bg-white/18 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Book Here
                  </button>
                </div>
              ) : (
                <p className="text-xs text-neutral-400">
                  Select any Chennai neighborhood above to preview the live route on the map.
                </p>
              )}
            </div>
          </div>

          {/* Right Panel: Interactive Google Map (explicit height, mapId, mandatory attribution ID) */}
          <div className="lg:col-span-7 rounded-xl overflow-hidden border border-white/12 bg-[#1C1B19] h-[460px] lg:h-auto lg:min-h-[580px]">
            <GoogleMap
              defaultCenter={destination}
              defaultZoom={15}
              mapId="DEMO_MAP_ID"
              gestureHandling="cooperative"
              mapTypeControl={true}
              streetViewControl={true}
              fullscreenControl={true}
              internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
              style={{ width: '100%', height: '100%' }}
            >
              <ShowroomMarker position={destination} place={place} />
              <RouteOverlay
                originQuery={activeOrigin}
                destination={destination}
                onRouteComputed={setRouteSummary}
                onRouteError={setRouteError}
                onRouteLoading={setRouteLoading}
              />
            </GoogleMap>
          </div>
        </div>
      </div>
    </section>
  );
};
