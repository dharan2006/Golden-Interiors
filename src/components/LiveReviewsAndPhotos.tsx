import React, { useMemo, useState } from 'react';
import {
  Star,
  ExternalLink,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Camera,
  MessageSquareQuote,
} from 'lucide-react';
import { GOLDEN_MAPS_SHORT_URL } from '../data/catalog';
import type { LivePhoto, LivePlaceProfile } from '../types/golden';

interface LiveReviewsAndPhotosProps {
  place: LivePlaceProfile | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'G';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function StarRow({ rating, size = 14 }: { rating: number; size?: number }) {
  const rounded = Math.round(rating);
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          style={{ width: size, height: size }}
          className={
            n <= rounded
              ? 'fill-[#B8892D] text-[#B8892D]'
              : 'fill-transparent text-[#181715]/20'
          }
        />
      ))}
    </span>
  );
}

export const LiveReviewsAndPhotos: React.FC<LiveReviewsAndPhotosProps> = ({
  place,
  loading,
  error,
  onRetry,
}) => {
  const [reviewFilter, setReviewFilter] = useState<'all' | 'five' | 'newest'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [failedAvatars, setFailedAvatars] = useState<Record<string, boolean>>({});
  const [failedPhotos, setFailedPhotos] = useState<Record<string, boolean>>({});

  const reviews = place?.reviews ?? [];
  const photos = place?.photos ?? [];
  const mapsUrl = place?.googleMapsURI || GOLDEN_MAPS_SHORT_URL;

  const filteredReviews = useMemo(() => {
    let list = [...reviews];
    if (reviewFilter === 'five') {
      list = list.filter((r) => r.rating >= 5);
    } else if (reviewFilter === 'newest') {
      list.sort((a, b) => (b.publishTimeMs ?? 0) - (a.publishTimeMs ?? 0));
    }
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (r) =>
          r.text.toLowerCase().includes(q) || r.author.displayName.toLowerCase().includes(q)
      );
    }
    return list;
  }, [reviews, reviewFilter, searchQuery]);

  // Extract common verified themes mentioned directly inside the live Google reviews
  const reviewInsights = useMemo(() => {
    if (reviews.length === 0) return [];
    const corpus = reviews.map((r) => r.text.toLowerCase()).join(' ');
    const candidates = [
      { key: 'quality', label: 'Material Quality' },
      { key: 'neat', label: 'Neat Finishing' },
      { key: 'time', label: 'On-Time Delivery' },
      { key: 'price', label: 'Fair Pricing' },
      { key: 'pleated', label: 'Pleated Mesh' },
      { key: 'blind', label: 'Window Blinds' },
      { key: 'service', label: 'After-Sales Service' },
      { key: 'work', label: 'Clean Installation' },
    ];
    return candidates
      .map((c) => {
        const count = reviews.filter((r) => r.text.toLowerCase().includes(c.key)).length;
        return { ...c, count };
      })
      .filter((c) => c.count > 0 && corpus.includes(c.key))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [reviews]);

  const activePhoto: LivePhoto | null =
    lightboxIndex !== null && photos[lightboxIndex] ? photos[lightboxIndex] : null;

  return (
    <>
      {/* Live Google Maps Real Installation Photos Gallery */}
      <section id="gallery" className="py-20 lg:py-24 bg-[#F2F0EB] border-t border-[#181715]/10">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-[#181715]/10">
            <div>
              <p className="text-xs font-mono text-[#9A7228] tracking-wide mb-2">
                Live Google Maps Media · Real Customer &amp; Showroom Installations
              </p>
              <h2 className="font-display text-3xl sm:text-4xl font-medium tracking-tight text-[#181715]">
                Verified work from {place?.displayName ?? 'Golden Interiors'}
              </h2>
            </div>

            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-[#181715] hover:text-[#9A7228] transition-colors whitespace-nowrap shrink-0"
            >
              <span>View all photos on Google Maps</span>
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>

          {loading ? (
            <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, idx) => (
                <div
                  key={idx}
                  className={`rounded-xl bg-[#E6E2D8] animate-pulse ${
                    idx === 0 ? 'col-span-2 row-span-2 aspect-[4/3]' : 'aspect-[4/3]'
                  }`}
                />
              ))}
            </div>
          ) : error ? (
            <div className="mt-8 bg-white border border-[#181715]/10 rounded-xl p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-[#181715]">{error}</p>
                <p className="text-xs text-[#5C5952] mt-1">
                  You can retry loading live Google Maps photos or open the official listing directly.
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <button
                  type="button"
                  onClick={onRetry}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-[#181715] text-white rounded-lg hover:bg-[#2F2D2A] cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Retry</span>
                </button>
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 text-xs font-medium border border-[#181715]/20 text-[#181715] rounded-lg hover:border-[#181715]"
                >
                  Open Google Maps
                </a>
              </div>
            </div>
          ) : photos.length === 0 ? (
            <div className="mt-8 bg-white border border-[#181715]/10 rounded-xl p-10 text-center">
              <Camera className="w-6 h-6 text-[#9A7228] mx-auto mb-2" />
              <p className="text-sm text-[#5C5952]">
                No Google Maps photos were returned for this listing right now.
              </p>
            </div>
          ) : (
            <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
              {photos.slice(0, 9).map((photo, idx) => {
                const isLead = idx === 0;
                const author = photo.attributions[0];
                const broken = failedPhotos[photo.id];

                return (
                  <figure
                    key={photo.id}
                    className={`group relative overflow-hidden rounded-xl bg-[#E4E0D6] border border-[#181715]/10 ${
                      isLead ? 'col-span-2 row-span-2 min-h-[280px] md:min-h-[380px]' : 'aspect-[4/3]'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setLightboxIndex(idx)}
                      className="w-full h-full block text-left cursor-pointer focus-visible:outline-2 focus-visible:outline-[#9A7228]"
                      aria-label={`Open installation photo ${idx + 1} in lightbox`}
                    >
                      {!broken ? (
                        <img
                          src={photo.thumbUri}
                          alt={`${place?.displayName ?? 'Golden Interiors'} installation photo ${idx + 1}`}
                          referrerPolicy="no-referrer"
                          onError={() =>
                            setFailedPhotos((prev) => ({ ...prev, [photo.id]: true }))
                          }
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center">
                          <Camera className="w-6 h-6 text-[#9A7228] mb-1.5" />
                          <span className="text-xs text-[#5C5952]">Photo unavailable</span>
                        </div>
                      )}
                    </button>

                    {/* Mandatory Google Maps Photo Author Attribution */}
                    {author && (
                      <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent px-3 pt-6 pb-2.5 flex items-center justify-between gap-2 text-[11px] text-white/90">
                        {author.uri ? (
                          <a
                            href={author.uri}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="truncate hover:underline"
                          >
                            Photo by {author.displayName}
                          </a>
                        ) : (
                          <span className="truncate">Photo by {author.displayName}</span>
                        )}
                      </figcaption>
                    )}
                  </figure>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Live Google Customer Reviews & Sentiment Analysis */}
      <section id="reviews" className="py-20 lg:py-28 bg-[#FAFAF8] border-t border-[#181715]/10">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 pb-10 border-b border-[#181715]/10 items-end">
            <div className="lg:col-span-7">
              <p className="text-xs font-mono text-[#9A7228] tracking-wide mb-3">
                Verified Google Reviews · Live From Google Maps
              </p>
              <h2 className="font-display text-3xl sm:text-4xl lg:text-[42px] font-medium tracking-tight text-[#181715] leading-[1.12]">
                Trusted by Chennai homeowners across every installation
              </h2>
              {reviewInsights.length > 0 && (
                <div className="mt-4 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-[#5C5952]">
                  <span className="font-medium text-[#181715]">Frequently praised:</span>
                  {reviewInsights.map((insight, idx) => (
                    <React.Fragment key={insight.key}>
                      <button
                        type="button"
                        onClick={() => setSearchQuery(insight.key)}
                        className="hover:text-[#9A7228] underline underline-offset-4 decoration-[#181715]/20 cursor-pointer"
                      >
                        {insight.label} ({insight.count})
                      </button>
                      {idx < reviewInsights.length - 1 && <span aria-hidden="true">·</span>}
                    </React.Fragment>
                  ))}
                </div>
              )}
            </div>

            {/* Live Rating Aggregate Box */}
            <div className="lg:col-span-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-[#181715]/10 rounded-xl p-5">
              {loading ? (
                <div className="w-full h-12 bg-[#EFECE5] rounded animate-pulse" />
              ) : place?.rating ? (
                <>
                  <div className="flex items-center gap-4">
                    <span className="font-display text-4xl font-semibold tabular-nums text-[#181715]">
                      {place.rating.toFixed(1)}
                    </span>
                    <div>
                      <StarRow rating={place.rating} size={15} />
                      <p className="text-xs text-[#5C5952] mt-1 tabular-nums">
                        Based on {place.userRatingCount?.toLocaleString('en-IN') ?? reviews.length}{' '}
                        Google reviews
                      </p>
                    </div>
                  </div>
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-medium text-[#181715] bg-[#F2F0EB] hover:bg-[#E7E3D9] rounded-lg transition-colors whitespace-nowrap shrink-0"
                  >
                    <span>Write Review</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </>
              ) : (
                <div className="flex items-center justify-between w-full">
                  <span className="text-sm text-[#5C5952]">Live Google Maps Rating</span>
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-medium text-[#9A7228] hover:underline"
                  >
                    Open Google Listing
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Filter & Search Bar */}
          <div className="mt-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div
              className="inline-flex items-center gap-1 p-1 bg-[#EFECE5] rounded-lg self-start"
              role="tablist"
              aria-label="Filter customer reviews"
            >
              {(
                [
                  { id: 'all', label: `All (${reviews.length})` },
                  { id: 'five', label: '5-Star' },
                  { id: 'newest', label: 'Most Recent' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={reviewFilter === tab.id}
                  onClick={() => setReviewFilter(tab.id)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    reviewFilter === tab.id
                      ? 'bg-white text-[#181715] shadow-xs'
                      : 'text-[#5C5952] hover:text-[#181715]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-[#5C5952] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter reviews by name or word..."
                aria-label="Filter customer reviews"
                className="w-full bg-white border border-[#181715]/15 rounded-lg pl-9 pr-3 py-2 text-xs text-[#181715] placeholder:text-[#5C5952]/70 focus:outline-none focus:border-[#9A7228]"
              />
            </div>
          </div>

          {/* Reviews Grid */}
          {loading ? (
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[0, 1, 2].map((n) => (
                <div
                  key={n}
                  className="h-52 rounded-xl bg-[#EFECE5] animate-pulse border border-[#181715]/5"
                />
              ))}
            </div>
          ) : filteredReviews.length === 0 ? (
            <div className="mt-8 bg-white border border-[#181715]/10 rounded-xl p-10 text-center">
              <MessageSquareQuote className="w-6 h-6 text-[#9A7228] mx-auto mb-2" />
              <p className="text-sm text-[#181715] font-medium">
                {searchQuery
                  ? `No reviews matching "${searchQuery}".`
                  : 'Customer reviews are available directly on Google Maps.'}
              </p>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setReviewFilter('all');
                  }}
                  className="mt-3 text-xs font-medium text-[#9A7228] underline underline-offset-4 cursor-pointer"
                >
                  Clear filter
                </button>
              )}
            </div>
          ) : (
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredReviews.map((review) => {
                const avatarFailed = failedAvatars[review.id] || !review.author.photoURI;
                return (
                  <article
                    key={review.id}
                    className="flex flex-col justify-between bg-white border border-[#181715]/10 rounded-xl p-6"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-4">
                        <StarRow rating={review.rating} size={14} />
                        <span className="text-xs text-[#5C5952]">{review.relativeTime}</span>
                      </div>

                      <p className="text-sm text-[#181715] leading-relaxed">
                        {review.text || 'Rated 5 stars on Google Maps.'}
                      </p>
                    </div>

                    {/* Mandatory Reviewer Attribution */}
                    <div className="mt-6 pt-4 border-t border-[#181715]/8 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {!avatarFailed && review.author.photoURI ? (
                          <img
                            src={review.author.photoURI}
                            alt={review.author.displayName}
                            referrerPolicy="no-referrer"
                            onError={() =>
                              setFailedAvatars((prev) => ({ ...prev, [review.id]: true }))
                            }
                            className="w-9 h-9 rounded-full object-cover border border-[#181715]/10 shrink-0"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-[#EFECE5] text-[#181715] text-xs font-semibold flex items-center justify-center shrink-0">
                            {getInitials(review.author.displayName)}
                          </div>
                        )}
                        <div className="min-w-0">
                          {review.author.uri ? (
                            <a
                              href={review.author.uri}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block text-sm font-semibold text-[#181715] hover:text-[#9A7228] truncate"
                            >
                              {review.author.displayName}
                            </a>
                          ) : (
                            <p className="text-sm font-semibold text-[#181715] truncate">
                              {review.author.displayName}
                            </p>
                          )}
                          <p className="text-[11px] text-[#5C5952]">Google Maps Reviewer</p>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          <p className="mt-6 text-xs text-[#5C5952]">
            Reviews and ratings are fetched live from Google Maps Platform Places API for{' '}
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4 hover:text-[#181715]"
            >
              {place?.displayName ?? 'Golden Interiors'}
            </a>
            .
          </p>
        </div>
      </section>

      {/* Lightbox Modal for Google Maps Photos */}
      {activePhoto && lightboxIndex !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Installation photo viewer"
          className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4 sm:p-8"
          onClick={() => setLightboxIndex(null)}
        >
          <div
            className="relative max-w-5xl w-full flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full flex items-center justify-between text-white/80 text-xs mb-3">
              <span className="font-mono tabular-nums">
                {lightboxIndex + 1} / {photos.length}
              </span>
              <button
                type="button"
                onClick={() => setLightboxIndex(null)}
                aria-label="Close photo viewer"
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="relative w-full max-h-[75vh] flex items-center justify-center bg-black rounded-xl overflow-hidden">
              <img
                src={activePhoto.fullUri}
                alt={`${place?.displayName ?? 'Golden Interiors'} photo ${lightboxIndex + 1}`}
                referrerPolicy="no-referrer"
                className="max-h-[75vh] w-auto max-w-full object-contain"
              />

              {photos.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      setLightboxIndex((lightboxIndex - 1 + photos.length) % photos.length)
                    }
                    aria-label="Previous photo"
                    className="absolute left-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/70 text-white hover:bg-black cursor-pointer"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setLightboxIndex((lightboxIndex + 1) % photos.length)}
                    aria-label="Next photo"
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/70 text-white hover:bg-black cursor-pointer"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>

            {/* Required photo attribution inside lightbox */}
            <div className="mt-3 w-full flex flex-wrap items-center justify-between gap-2 text-xs text-white/80">
              {activePhoto.attributions[0] ? (
                activePhoto.attributions[0].uri ? (
                  <a
                    href={activePhoto.attributions[0].uri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
                  >
                    Photo by {activePhoto.attributions[0].displayName} · Google Maps
                  </a>
                ) : (
                  <span>Photo by {activePhoto.attributions[0].displayName} · Google Maps</span>
                )
              ) : (
                <span>Photo via Google Maps</span>
              )}

              <a
                href={activePhoto.googleMapsURI || mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[#D4AF5A] hover:underline"
              >
                <span>Open on Google Maps</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
