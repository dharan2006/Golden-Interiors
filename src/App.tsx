/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useState } from 'react';
import { APIProvider } from '@vis.gl/react-google-maps';
import { ArrowRight, Star, Box, Menu, X, ExternalLink, Phone } from 'lucide-react';
import { GOLDEN_MAPS_SHORT_URL, HERO_IMAGE } from './data/catalog';
import { useGoldenPlace } from './hooks/useGoldenPlace';
import { Studio3DShowcase } from './components/Studio3DShowcase';
import { SolutionsAndEstimator } from './components/SolutionsAndEstimator';
import { LiveReviewsAndPhotos } from './components/LiveReviewsAndPhotos';
import { LocationAndDirections } from './components/LocationAndDirections';
import { BookingSection } from './components/BookingSection';
import type { EstimatorLineItem, FrameFinishId, StudioModelId } from './types/golden';

const MAPS_API_KEY = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined) ?? '';

function GoldenInteriorsExperience() {
  const { place, loading, error, retry } = useGoldenPlace();

  const [activeModel, setActiveModel] = useState<StudioModelId>('pleated');
  const [activeFinish, setActiveFinish] = useState<FrameFinishId>('champagne');
  const [estimatorItems, setEstimatorItems] = useState<EstimatorLineItem[]>([]);
  const [prefilledArea, setPrefilledArea] = useState<string>('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [heroImgFailed, setHeroImgFailed] = useState<boolean>(false);

  const handleInspectIn3D = useCallback((model: StudioModelId) => {
    setActiveModel(model);
    document.getElementById('studio-3d')?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const handleAddEstimatorItem = useCallback((item: EstimatorLineItem) => {
    setEstimatorItems((prev) => [...prev, item]);
  }, []);

  const handleRemoveEstimatorItem = useCallback((id: string) => {
    setEstimatorItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const handleSendEstimateToBooking = useCallback(() => {
    document.getElementById('book-visit')?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const handleSelectAreaForBooking = useCallback((areaName: string) => {
    setPrefilledArea(areaName);
    document.getElementById('book-visit')?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const brandDisplayName = place?.displayName || 'Golden Interiors';
  const mapsListingUrl = place?.googleMapsURI || GOLDEN_MAPS_SHORT_URL;

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAF8] text-[#181715]">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-40 bg-[#FAFAF8]/95 backdrop-blur-sm border-b border-[#181715]/10">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Single clean text wordmark */}
          <a
            href="#top"
            className="font-display text-xl font-semibold tracking-tight text-[#181715] whitespace-nowrap shrink-0"
          >
            Golden Interiors
          </a>

          {/* Zone 2: 5 concise single-line navigation links */}
          <nav
            aria-label="Primary navigation"
            className="hidden md:flex items-center gap-7 text-sm font-medium text-[#5C5952]"
          >
            <a
              href="#studio-3d"
              className="hover:text-[#181715] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              3D Studio
            </a>
            <a
              href="#solutions"
              className="hover:text-[#181715] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Solutions
            </a>
            <a
              href="#gallery"
              className="hover:text-[#181715] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Gallery
            </a>
            <a
              href="#reviews"
              className="hover:text-[#181715] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Reviews
            </a>
            <a
              href="#location"
              className="hover:text-[#181715] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Location
            </a>
          </nav>

          {/* Zone 3: 1 primary action (plus mobile menu button on small screens) */}
          <div className="flex items-center gap-3 shrink-0">
            <a
              href="#book-visit"
              className="hidden sm:inline-flex items-center px-4 py-2 text-xs font-semibold text-white bg-[#181715] hover:bg-[#9A7228] rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              Book Free Visit
            </a>
            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={mobileMenuOpen}
              className="md:hidden p-2 text-[#181715] hover:bg-[#EFECE5] rounded-lg cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Clean Mobile Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-[#181715]/10 bg-[#FAFAF8] px-6 py-4 space-y-3">
            {[
              { href: '#studio-3d', label: '3D Studio' },
              { href: '#solutions', label: 'Solutions & Estimator' },
              { href: '#gallery', label: 'Live Photos' },
              { href: '#reviews', label: 'Customer Reviews' },
              { href: '#location', label: 'Map & Directions' },
            ].map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className="block py-1.5 text-sm font-medium text-[#181715] hover:text-[#9A7228]"
              >
                {item.label}
              </a>
            ))}
            <a
              href="#book-visit"
              onClick={() => setMobileMenuOpen(false)}
              className="inline-flex w-full items-center justify-center px-4 py-2.5 text-sm font-semibold text-white bg-[#181715] rounded-lg"
            >
              Book Free Visit
            </a>
          </div>
        )}
      </header>

      <main id="top" className="flex-1">
        {/* Editorial Hero Section */}
        <section className="pt-10 pb-16 lg:pt-14 lg:pb-20 bg-[#FAFAF8]">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
              {/* Left Proposition */}
              <div className="lg:col-span-6 flex flex-col justify-between py-2">
                <div>
                  {/* Quiet Unboxed Live Google Trust Line (Zero Pills) */}
                  <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-[#5C5952] mb-6">
                    <span>Chennai Craftsmanship Since 2004</span>
                    <span aria-hidden="true">·</span>
                    {loading ? (
                      <span className="inline-block w-36 h-3.5 bg-[#E7E3D9] rounded animate-pulse align-middle" />
                    ) : place?.rating ? (
                      <a
                        href="#reviews"
                        className="inline-flex items-center gap-1 font-medium text-[#181715] hover:text-[#9A7228] transition-colors"
                      >
                        <Star className="w-3.5 h-3.5 fill-[#B8892D] text-[#B8892D]" />
                        <span className="font-mono tabular-nums font-semibold">
                          {place.rating.toFixed(1)}
                        </span>
                        {place.userRatingCount && (
                          <span className="text-[#5C5952] tabular-nums">
                            ({place.userRatingCount.toLocaleString('en-IN')} Google reviews)
                          </span>
                        )}
                      </a>
                    ) : (
                      <span>Kundrathur, Chennai</span>
                    )}
                    {place?.isOpenNow !== null && place?.isOpenNow !== undefined && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="font-medium text-[#181715]">
                          {place.isOpenNow ? 'Open Today' : 'Closed Now'}
                        </span>
                      </>
                    )}
                  </div>

                  <h1
                    className="font-display font-medium tracking-tight text-[#181715] leading-[1.06]"
                    style={{ fontSize: 'clamp(2.25rem, 4.1vw, 3.75rem)' }}
                  >
                    Bespoke mosquito screens &amp; architectural window blinds.
                  </h1>

                  <p className="mt-6 text-base sm:text-[17px] text-[#5C5952] leading-relaxed max-w-xl">
                    Custom-fitted pleated sliding doors, coastal-grade SS 316 insect screens,
                    dual-layer zebra blinds, and weatherproof balcony PVC enclosures—measured to the
                    millimeter and installed cleanly across Chennai.
                  </p>

                  {/* Single Dominant Primary CTA + Quiet Secondary Link */}
                  <div className="mt-8 flex flex-wrap items-center gap-5">
                    <a
                      href="#book-visit"
                      className="inline-flex items-center gap-2 px-6 py-3.5 text-sm font-semibold text-white bg-[#181715] hover:bg-[#9A7228] rounded-lg transition-colors whitespace-nowrap shrink-0"
                    >
                      <span>Book Free Home Measurement</span>
                      <ArrowRight className="w-4 h-4" />
                    </a>

                    <a
                      href="#studio-3d"
                      className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#181715] hover:text-[#9A7228] underline underline-offset-4 decoration-[#181715]/25 transition-colors whitespace-nowrap shrink-0"
                    >
                      <Box className="w-4 h-4 text-[#9A7228]" />
                      <span>Inspect in 3D Studio</span>
                    </a>
                  </div>
                </div>

                {/* Live Contact Anchor */}
                <div className="mt-10 pt-6 border-t border-[#181715]/10 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-[#5C5952]">
                  {place?.nationalPhoneNumber && (
                    <a
                      href={`tel:${place.internationalPhoneNumber || place.nationalPhoneNumber}`}
                      className="inline-flex items-center gap-1.5 font-mono tabular-nums text-[#181715] font-medium hover:text-[#9A7228]"
                    >
                      <Phone className="w-3.5 h-3.5 text-[#9A7228]" />
                      <span>{place.nationalPhoneNumber}</span>
                    </a>
                  )}
                  <a
                    href={mapsListingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 hover:text-[#181715] transition-colors"
                  >
                    <span>
                      {place?.formattedAddress
                        ? place.formattedAddress.split(',').slice(0, 3).join(', ')
                        : 'Kundrathur, Chennai, Tamil Nadu'}
                    </span>
                    <ExternalLink className="w-3 h-3 shrink-0" />
                  </a>
                </div>
              </div>

              {/* Right Focal Hero Photography */}
              <div className="lg:col-span-6">
                <div className="relative w-full h-full min-h-[320px] sm:min-h-[420px] lg:min-h-[500px] rounded-xl overflow-hidden bg-[#E7E3D9] border border-[#181715]/10">
                  {!heroImgFailed ? (
                    <img
                      src={HERO_IMAGE}
                      alt="Sunlit modern Chennai living room fitted with champagne-gold framed pleated mosquito mesh sliding doors"
                      referrerPolicy="no-referrer"
                      onError={() => setHeroImgFailed(true)}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-10 text-center bg-gradient-to-br from-[#EFECE5] to-[#DCD6C8]">
                      <p className="font-display text-2xl text-[#181715]">{brandDisplayName}</p>
                      <p className="text-xs text-[#5C5952] mt-1">
                        Architectural Mosquito Screens &amp; Window Blinds
                      </p>
                    </div>
                  )}

                  {/* Measured Bottom Caption Scrim */}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent px-5 pt-10 pb-4 flex items-end justify-between gap-4">
                    <p className="text-xs text-white/95 font-medium">
                      Champagne Gold Pleated Sliding Door · 4mm Low-Threshold Track
                    </p>
                    <a
                      href="#studio-3d"
                      className="text-xs font-semibold text-[#E8C87A] hover:underline whitespace-nowrap shrink-0"
                    >
                      Try 3D Model
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Full-Width 4-Column Architectural Spec Strip Below Hero Split */}
            <div className="mt-10 pt-8 border-t border-[#181715]/10 grid grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <p className="font-mono text-xs text-[#9A7228] tabular-nums">01 · Heritage</p>
                <p className="mt-1 font-display text-lg font-medium text-[#181715]">
                  Serving Chennai Since 2004
                </p>
                <p className="mt-1 text-xs text-[#5C5952]">
                  Residential apartments, independent villas, and commercial offices.
                </p>
              </div>
              <div>
                <p className="font-mono text-xs text-[#9A7228] tabular-nums">02 · Precision</p>
                <p className="mt-1 font-display text-lg font-medium text-[#181715]">
                  Custom Millimeter Fit
                </p>
                <p className="mt-1 text-xs text-[#5C5952]">
                  In-house aluminum extrusion fabrication matched to your exact frame tone.
                </p>
              </div>
              <div>
                <p className="font-mono text-xs text-[#9A7228] tabular-nums">03 · Convenience</p>
                <p className="mt-1 font-display text-lg font-medium text-[#181715]">
                  Free Doorstep Samples
                </p>
                <p className="mt-1 text-xs text-[#5C5952]">
                  Inspect physical pleated mesh, SS 316 wire, and blind fabrics at home.
                </p>
              </div>
              <div>
                <p className="font-mono text-xs text-[#9A7228] tabular-nums">04 · Assurance</p>
                <p className="mt-1 font-display text-lg font-medium text-[#181715]">
                  Factory-Direct Support
                </p>
                <p className="mt-1 text-xs text-[#5C5952]">
                  Direct workshop pricing with prompt after-sales tension &amp; service care.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Interactive Three.js 3D Architectural Product Configurator */}
        <Studio3DShowcase
          activeModel={activeModel}
          onSelectModel={setActiveModel}
          activeFinish={activeFinish}
          onSelectFinish={setActiveFinish}
        />

        {/* Bespoke Solutions Bento Grid + Interactive Measurement & Cost Estimator */}
        <SolutionsAndEstimator
          onInspectIn3D={handleInspectIn3D}
          estimatorItems={estimatorItems}
          onAddEstimatorItem={handleAddEstimatorItem}
          onRemoveEstimatorItem={handleRemoveEstimatorItem}
          onSendEstimateToBooking={handleSendEstimateToBooking}
        />

        {/* Live Google Maps Photos Gallery & Verified Customer Reviews */}
        <LiveReviewsAndPhotos
          place={place}
          loading={loading}
          error={error}
          onRetry={retry}
        />

        {/* Interactive Google Map, AdvancedMarker & Routes API Distance Preview */}
        <LocationAndDirections
          place={place}
          onSelectAreaForBooking={handleSelectAreaForBooking}
        />

        {/* Free Site Visit Consultation Booking */}
        <BookingSection
          place={place}
          estimatorItems={estimatorItems}
          prefilledArea={prefilledArea}
        />
      </main>

      {/* Quiet Editorial Footer */}
      <footer className="bg-[#141413] text-neutral-300 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-14">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-10 pb-10 border-b border-white/10">
            <div className="md:col-span-5">
              <p className="font-display text-xl font-semibold text-[#FAFAF8]">
                {brandDisplayName}
              </p>
              <p className="mt-2.5 text-xs text-neutral-400 leading-relaxed max-w-sm">
                Custom architectural insect screens, pleated sliding mosquito doors, zebra roller
                blinds, and balcony PVC monsoon solutions crafted in Chennai.
              </p>
              {place?.formattedAddress && (
                <p className="mt-4 text-xs text-neutral-400 leading-relaxed">
                  {place.formattedAddress}
                </p>
              )}
            </div>

            <div className="md:col-span-3">
              <p className="text-xs font-semibold text-[#FAFAF8] mb-3">Navigation</p>
              <ul className="space-y-2 text-xs text-neutral-400">
                <li>
                  <a href="#studio-3d" className="hover:text-white transition-colors">
                    Interactive 3D Studio
                  </a>
                </li>
                <li>
                  <a href="#solutions" className="hover:text-white transition-colors">
                    Product Solutions
                  </a>
                </li>
                <li>
                  <a href="#quote-calculator" className="hover:text-white transition-colors">
                    Sq.Ft. Cost Estimator
                  </a>
                </li>
                <li>
                  <a href="#gallery" className="hover:text-white transition-colors">
                    Google Maps Gallery
                  </a>
                </li>
                <li>
                  <a href="#reviews" className="hover:text-white transition-colors">
                    Verified Reviews
                  </a>
                </li>
              </ul>
            </div>

            <div className="md:col-span-4">
              <p className="text-xs font-semibold text-[#FAFAF8] mb-3">Direct Contact</p>
              <div className="space-y-2 text-xs text-neutral-400">
                {place?.nationalPhoneNumber && (
                  <p>
                    Phone:{' '}
                    <a
                      href={`tel:${place.internationalPhoneNumber || place.nationalPhoneNumber}`}
                      className="font-mono text-[#FAFAF8] hover:text-[#D4AF5A]"
                    >
                      {place.nationalPhoneNumber}
                    </a>
                  </p>
                )}
                <p>
                  <a
                    href={mapsListingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[#D4AF5A] hover:underline"
                  >
                    <span>Verified Google Maps Profile</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </p>
                <p className="pt-2 text-[11px] text-neutral-500 leading-relaxed">
                  Interactive maps, live ratings, reviews, and routing are powered by Google Maps
                  Platform and subject to the{' '}
                  <a
                    href="https://maps.google.com/help/terms_maps/?utm_campaign=gmp_mcp_codeassist_v1_aistudio"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-neutral-300"
                  >
                    Google Maps Additional Terms
                  </a>{' '}
                  and{' '}
                  <a
                    href="https://policies.google.com/privacy?utm_campaign=gmp_mcp_codeassist_v1_aistudio"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-neutral-300"
                  >
                    Google Privacy Policy
                  </a>
                  .
                </p>
              </div>
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-neutral-500">
            <p>© {new Date().getFullYear()} {brandDisplayName}. All rights reserved.</p>
            <p>Kundrathur, Chennai · Greater Chennai Free Site Measurements</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  const [quotaExceeded, setQuotaExceeded] = useState<boolean>(false);

  useEffect(() => {
    const handleQuota = () => setQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', handleQuota);
    return () => window.removeEventListener('gmp-quota-exceeded', handleQuota);
  }, []);

  return (
    <>
      {quotaExceeded && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm">
          <span>
            Google Maps Platform quota reached. If you are the app owner, visit{' '}
            <a
              href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-semibold text-amber-950 hover:text-amber-800"
            >
              maps developer site
            </a>{' '}
            for instructions to update your account.
          </span>
        </div>
      )}

      <APIProvider apiKey={MAPS_API_KEY} language="en" region="IN">
        <GoldenInteriorsExperience />
      </APIProvider>
    </>
  );
}
