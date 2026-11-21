import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Phone, Calendar, MapPin, ArrowRight } from 'lucide-react';
import { PRODUCT_SOLUTIONS } from '../data/catalog';
import type { EstimatorLineItem, LivePlaceProfile } from '../types/golden';

interface BookingSectionProps {
  place: LivePlaceProfile | null;
  estimatorItems: EstimatorLineItem[];
  prefilledArea: string;
}

export const BookingSection: React.FC<BookingSectionProps> = ({
  place,
  estimatorItems,
  prefilledArea,
}) => {
  const [fullName, setFullName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [locality, setLocality] = useState<string>('');
  const [productInterest, setProductInterest] = useState<string>(PRODUCT_SOLUTIONS[0].name);
  const [preferredSlot, setPreferredSlot] = useState<string>('Morning (10 AM – 1 PM)');
  const [notes, setNotes] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);
  const [submittedRef, setSubmittedRef] = useState<string | null>(null);

  useEffect(() => {
    if (prefilledArea) {
      setLocality(prefilledArea);
    }
  }, [prefilledArea]);

  const estimateSummary = useMemo(() => {
    if (estimatorItems.length === 0) return null;
    const totalSqFt = estimatorItems.reduce((sum, i) => sum + i.sqFt, 0);
    const minTotal = estimatorItems.reduce((sum, i) => sum + i.estimatedMin, 0);
    const maxTotal = estimatorItems.reduce((sum, i) => sum + i.estimatedMax, 0);
    return {
      count: estimatorItems.length,
      totalSqFt: Number(totalSqFt.toFixed(1)),
      minTotal,
      maxTotal,
    };
  }, [estimatorItems]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanedName = fullName.trim();
    const digits = phone.replace(/\D/g, '');
    const cleanedLocality = locality.trim();

    if (cleanedName.length < 2) {
      setFormError('Please enter your name so our technician knows who to ask for.');
      return;
    }
    if (digits.length < 10) {
      setFormError('Please enter a valid 10-digit mobile number.');
      return;
    }
    if (cleanedLocality.length < 3) {
      setFormError('Please enter your Chennai neighborhood or apartment name.');
      return;
    }

    setFormError(null);
    const refCode = `GI-${Math.floor(100000 + Math.random() * 900000)}`;
    setSubmittedRef(refCode);
  };

  return (
    <section id="book-visit" className="py-20 lg:py-28 bg-[#FAFAF8]">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          {/* Left Editorial Pitch */}
          <div className="lg:col-span-5">
            <p className="text-xs font-mono text-[#9A7228] tracking-wide mb-3">
              Complimentary On-Site Consultation · Zero Obligation
            </p>
            <h2 className="font-display text-3xl sm:text-4xl font-medium tracking-tight text-[#181715] leading-[1.14]">
              Book a free home measurement with physical samples
            </h2>
            <p className="mt-4 text-sm sm:text-base text-[#5C5952] leading-relaxed">
              Our installation specialist visits your home across Chennai with pleated mesh frames,
              SS 316 swatches, zebra blind fabric catalogues, and aluminum finish samples—taking
              laser-accurate measurements for a firm, itemized quote on the spot.
            </p>

            <div className="mt-8 space-y-5 pt-6 border-t border-[#181715]/10">
              <div className="flex items-start gap-3">
                <Calendar className="w-4 h-4 text-[#9A7228] mt-1 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-[#181715]">01. Free Site Measurement</p>
                  <p className="text-xs text-[#5C5952] mt-0.5 leading-relaxed">
                    Compare Champagne Gold, Matte Charcoal, Teak, and Ivory finishes directly against
                    your existing windows and doors.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-[#9A7228] mt-1 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-[#181715]">
                    02. In-House Custom Fabrication
                  </p>
                  <p className="text-xs text-[#5C5952] mt-0.5 leading-relaxed">
                    Every screen and blind is fabricated to your exact millimeter openings at our
                    Kundrathur workshop for clean, rattle-free fitting.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Phone className="w-4 h-4 text-[#9A7228] mt-1 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-[#181715]">
                    03. Clean Installation &amp; After-Sales Support
                  </p>
                  <p className="text-xs text-[#5C5952] mt-0.5 leading-relaxed">
                    {place?.nationalPhoneNumber ? (
                      <>
                        Prefer to call directly? Reach us at{' '}
                        <a
                          href={`tel:${place.internationalPhoneNumber || place.nationalPhoneNumber}`}
                          className="font-mono font-semibold text-[#181715] underline underline-offset-4 hover:text-[#9A7228]"
                        >
                          {place.nationalPhoneNumber}
                        </a>
                        .
                      </>
                    ) : (
                      'Dedicated local installation crew with responsive post-installation adjustments.'
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Form Card */}
          <div className="lg:col-span-7 bg-white border border-[#181715]/12 rounded-xl p-6 sm:p-8 lg:p-10">
            {submittedRef ? (
              <div className="py-6">
                <div className="inline-flex items-center gap-2 text-emerald-800 text-sm font-semibold mb-3">
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Site Visit Request Logged · Ref {submittedRef}</span>
                </div>
                <h3 className="font-display text-2xl font-medium text-[#181715]">
                  Thank you, {fullName}. We will call to confirm your slot.
                </h3>
                <p className="mt-2 text-sm text-[#5C5952] leading-relaxed">
                  Request details for <strong className="text-[#181715]">{locality}</strong> ({preferredSlot})
                  — interested in <strong className="text-[#181715]">{productInterest}</strong>.
                  {estimateSummary && (
                    <>
                      {' '}
                      Your {estimateSummary.count}-opening room schedule ({estimateSummary.totalSqFt}{' '}
                      sq.ft) has been attached.
                    </>
                  )}
                </p>

                <div className="mt-6 flex flex-wrap items-center gap-3">
                  {place?.nationalPhoneNumber && (
                    <a
                      href={`tel:${place.internationalPhoneNumber || place.nationalPhoneNumber}`}
                      className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-[#181715] hover:bg-[#2F2D2A] rounded-lg transition-colors"
                    >
                      <Phone className="w-4 h-4" />
                      <span>Call {place.nationalPhoneNumber}</span>
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setSubmittedRef(null);
                      setFullName('');
                      setPhone('');
                      setNotes('');
                    }}
                    className="px-4 py-2.5 text-sm font-medium text-[#181715] border border-[#181715]/20 hover:border-[#181715] rounded-lg transition-colors cursor-pointer"
                  >
                    Book Another Request
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                {estimateSummary && (
                  <div className="bg-[#F2F0EB] border border-[#181715]/10 rounded-lg px-4 py-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="font-medium text-[#181715]">
                      Attached Room Schedule: {estimateSummary.count}{' '}
                      {estimateSummary.count === 1 ? 'opening' : 'openings'} (
                      {estimateSummary.totalSqFt} sq.ft)
                    </span>
                    <span className="font-mono tabular-nums font-semibold text-[#9A7228]">
                      ₹{estimateSummary.minTotal.toLocaleString('en-IN')} – ₹
                      {estimateSummary.maxTotal.toLocaleString('en-IN')}
                    </span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="book-name"
                      className="block text-xs font-medium text-[#181715] mb-1.5"
                    >
                      Your Name *
                    </label>
                    <input
                      id="book-name"
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g., Karthik Sundaram"
                      className="w-full bg-[#FAFAF8] border border-[#181715]/15 rounded-lg px-3.5 py-2.5 text-sm text-[#181715] focus:outline-none focus:border-[#9A7228]"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="book-phone"
                      className="block text-xs font-medium text-[#181715] mb-1.5"
                    >
                      Mobile Number *
                    </label>
                    <input
                      id="book-phone"
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="10-digit mobile number"
                      className="w-full bg-[#FAFAF8] border border-[#181715]/15 rounded-lg px-3.5 py-2.5 text-sm font-mono tabular-nums text-[#181715] focus:outline-none focus:border-[#9A7228]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="book-locality"
                      className="block text-xs font-medium text-[#181715] mb-1.5"
                    >
                      Chennai Area / Apartment *
                    </label>
                    <input
                      id="book-locality"
                      type="text"
                      required
                      value={locality}
                      onChange={(e) => setLocality(e.target.value)}
                      placeholder="e.g., Porur, Kundrathur, Anna Nagar"
                      className="w-full bg-[#FAFAF8] border border-[#181715]/15 rounded-lg px-3.5 py-2.5 text-sm text-[#181715] focus:outline-none focus:border-[#9A7228]"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="book-slot"
                      className="block text-xs font-medium text-[#181715] mb-1.5"
                    >
                      Preferred Visit Slot
                    </label>
                    <select
                      id="book-slot"
                      value={preferredSlot}
                      onChange={(e) => setPreferredSlot(e.target.value)}
                      className="w-full bg-[#FAFAF8] border border-[#181715]/15 rounded-lg px-3.5 py-2.5 text-sm text-[#181715] focus:outline-none focus:border-[#9A7228]"
                    >
                      <option>Morning (10 AM – 1 PM)</option>
                      <option>Afternoon (2 PM – 5 PM)</option>
                      <option>Evening (5 PM – 7:30 PM)</option>
                      <option>Weekend Slot</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="book-product"
                    className="block text-xs font-medium text-[#181715] mb-1.5"
                  >
                    Primary Requirement
                  </label>
                  <select
                    id="book-product"
                    value={productInterest}
                    onChange={(e) => setProductInterest(e.target.value)}
                    className="w-full bg-[#FAFAF8] border border-[#181715]/15 rounded-lg px-3.5 py-2.5 text-sm text-[#181715] focus:outline-none focus:border-[#9A7228]"
                  >
                    {PRODUCT_SOLUTIONS.map((p) => (
                      <option key={p.id} value={p.name}>
                        {p.name}
                      </option>
                    ))}
                    <option value="Full Home Mosquito Nets & Window Blinds Package">
                      Full Home Mosquito Nets &amp; Window Blinds Package
                    </option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="book-notes"
                    className="block text-xs font-medium text-[#181715] mb-1.5"
                  >
                    Additional Notes (Optional)
                  </label>
                  <textarea
                    id="book-notes"
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Number of windows/balconies, timber or uPVC frames, preferred frame color..."
                    className="w-full bg-[#FAFAF8] border border-[#181715]/15 rounded-lg px-3.5 py-2.5 text-sm text-[#181715] focus:outline-none focus:border-[#9A7228] resize-none"
                  />
                </div>

                {formError && (
                  <p role="alert" className="text-xs font-medium text-red-700">
                    {formError}
                  </p>
                )}

                <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <p className="text-xs text-[#5C5952]">
                    No site-visit fees within greater Chennai service zones.
                  </p>
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-[#181715] hover:bg-[#9A7228] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <span>Schedule Free Visit</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
