import React, { useMemo, useState } from 'react';
import { ArrowUpRight, Calculator, Plus, Trash2, Box } from 'lucide-react';
import { FRAME_FINISHES, PRODUCT_SOLUTIONS } from '../data/catalog';
import type { EstimatorLineItem, FrameFinishId, StudioModelId } from '../types/golden';

interface SolutionsAndEstimatorProps {
  onInspectIn3D: (model: StudioModelId) => void;
  estimatorItems: EstimatorLineItem[];
  onAddEstimatorItem: (item: EstimatorLineItem) => void;
  onRemoveEstimatorItem: (id: string) => void;
  onSendEstimateToBooking: () => void;
}

type CategoryFilter = 'All' | 'Insect Screens' | 'Window Blinds' | 'Balcony Protection';

export const SolutionsAndEstimator: React.FC<SolutionsAndEstimatorProps> = ({
  onInspectIn3D,
  estimatorItems,
  onAddEstimatorItem,
  onRemoveEstimatorItem,
  onSendEstimateToBooking,
}) => {
  const [category, setCategory] = useState<CategoryFilter>('All');
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  // Estimator inputs
  const [roomLabel, setRoomLabel] = useState<string>('Living Room Balcony');
  const [selectedProductId, setSelectedProductId] = useState<string>(PRODUCT_SOLUTIONS[0].id);
  const [selectedFinishId, setSelectedFinishId] = useState<FrameFinishId>('champagne');
  const [unit, setUnit] = useState<'ft' | 'in'>('ft');
  const [widthInput, setWidthInput] = useState<string>('6');
  const [heightInput, setHeightInput] = useState<string>('7');
  const [calcError, setCalcError] = useState<string | null>(null);

  const filteredSolutions = useMemo(() => {
    if (category === 'All') return PRODUCT_SOLUTIONS;
    return PRODUCT_SOLUTIONS.filter((item) => item.category === category);
  }, [category]);

  const activeProduct = useMemo(
    () => PRODUCT_SOLUTIONS.find((p) => p.id === selectedProductId) ?? PRODUCT_SOLUTIONS[0],
    [selectedProductId]
  );

  const previewMetrics = useMemo(() => {
    const rawW = parseFloat(widthInput);
    const rawH = parseFloat(heightInput);
    if (!Number.isFinite(rawW) || !Number.isFinite(rawH) || rawW <= 0 || rawH <= 0) {
      return null;
    }
    const widthFt = unit === 'in' ? rawW / 12 : rawW;
    const heightFt = unit === 'in' ? rawH / 12 : rawH;
    const sqFt = Math.max(1, Number((widthFt * heightFt).toFixed(1)));
    return {
      widthFt: Number(widthFt.toFixed(2)),
      heightFt: Number(heightFt.toFixed(2)),
      sqFt,
      minTotal: Math.round(sqFt * activeProduct.ratePerSqFtMin),
      maxTotal: Math.round(sqFt * activeProduct.ratePerSqFtMax),
    };
  }, [widthInput, heightInput, unit, activeProduct]);

  const handleAddOpening = (e: React.FormEvent) => {
    e.preventDefault();
    if (!previewMetrics || previewMetrics.widthFt > 30 || previewMetrics.heightFt > 20) {
      setCalcError('Please enter valid dimensions (up to 30 ft wide × 20 ft tall).');
      return;
    }
    setCalcError(null);
    const finish = FRAME_FINISHES.find((f) => f.id === selectedFinishId) ?? FRAME_FINISHES[0];

    onAddEstimatorItem({
      id: `est-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      roomLabel: roomLabel.trim() || 'Custom Opening',
      productId: activeProduct.id,
      productName: activeProduct.name,
      finishName: finish.name,
      widthFt: previewMetrics.widthFt,
      heightFt: previewMetrics.heightFt,
      sqFt: previewMetrics.sqFt,
      estimatedMin: previewMetrics.minTotal,
      estimatedMax: previewMetrics.maxTotal,
    });
  };

  const totals = useMemo(() => {
    return estimatorItems.reduce(
      (acc, item) => ({
        sqFt: Number((acc.sqFt + item.sqFt).toFixed(1)),
        min: acc.min + item.estimatedMin,
        max: acc.max + item.estimatedMax,
      }),
      { sqFt: 0, min: 0, max: 0 }
    );
  }, [estimatorItems]);

  return (
    <section id="solutions" className="py-20 lg:py-28 bg-[#FAFAF8]">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        {/* Editorial Section Header + Interactive Category Filter Tabs */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-10 border-b border-[#181715]/10">
          <div className="max-w-2xl">
            <p className="text-xs font-mono text-[#9A7228] tracking-wide mb-3">
              Architectural Systems · Fabricated In-House in Chennai
            </p>
            <h2 className="font-display text-3xl sm:text-4xl lg:text-[42px] font-medium tracking-tight text-[#181715] leading-[1.12]">
              Engineered for Chennai light, coastal air, and daily ease
            </h2>
          </div>

          <div
            className="inline-flex items-center gap-1 p-1 bg-[#EFECE5] rounded-lg self-start lg:self-auto"
            role="tablist"
            aria-label="Filter product categories"
          >
            {(['All', 'Insect Screens', 'Window Blinds', 'Balcony Protection'] as CategoryFilter[]).map(
              (tab) => {
                const active = category === tab;
                return (
                  <button
                    key={tab}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setCategory(tab)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      active
                        ? 'bg-white text-[#181715] shadow-xs'
                        : 'text-[#5C5952] hover:text-[#181715]'
                    }`}
                  >
                    {tab}
                  </button>
                );
              }
            )}
          </div>
        </div>

        {/* Asymmetric Editorial Bento Grid */}
        <div className="mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSolutions.map((solution, idx) => {
            const isWide = category === 'All' && idx === 0;
            const imgFailed = failedImages[solution.id];

            return (
              <article
                key={solution.id}
                className={`group flex flex-col justify-between bg-white border border-[#181715]/10 rounded-xl overflow-hidden transition-colors hover:border-[#9A7228]/50 ${
                  isWide ? 'lg:col-span-2' : 'lg:col-span-1'
                }`}
              >
                {/* Visual Frame */}
                <div
                  className={`relative overflow-hidden bg-[#EAE6DC] ${
                    isWide ? 'aspect-[16/9] lg:aspect-[21/10]' : 'aspect-[4/3]'
                  }`}
                >
                  {!imgFailed ? (
                    <img
                      src={solution.image}
                      alt={solution.imageAlt}
                      referrerPolicy="no-referrer"
                      onError={() =>
                        setFailedImages((prev) => ({ ...prev, [solution.id]: true }))
                      }
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-gradient-to-br from-[#EFECE5] to-[#DFD9CC]">
                      <Box className="w-8 h-8 text-[#9A7228] mb-2" />
                      <span className="font-display text-lg text-[#181715]">{solution.name}</span>
                    </div>
                  )}
                </div>

                {/* Text & Spec Body */}
                <div className="p-6 flex-1 flex flex-col justify-between gap-5">
                  <div>
                    <div className="flex items-center gap-2 text-xs text-[#5C5952] font-mono mb-2">
                      <span>{solution.index}</span>
                      <span aria-hidden="true">·</span>
                      <span>{solution.category}</span>
                      <span aria-hidden="true">·</span>
                      <span className="tabular-nums text-[#9A7228]">
                        ₹{solution.ratePerSqFtMin}–₹{solution.ratePerSqFtMax} / sq.ft
                      </span>
                    </div>

                    <h3 className="font-display text-xl sm:text-2xl font-medium text-[#181715] leading-snug">
                      {solution.name}
                    </h3>
                    <p className="mt-2.5 text-sm text-[#5C5952] leading-relaxed">
                      {solution.description}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-[#181715]/8 flex flex-wrap items-center justify-between gap-3">
                    <div className="text-xs text-[#5C5952] flex flex-wrap items-center gap-x-2 gap-y-1">
                      {solution.specs.map((spec, sIdx) => (
                        <React.Fragment key={spec}>
                          <span>{spec}</span>
                          {sIdx < solution.specs.length - 1 && <span aria-hidden="true">·</span>}
                        </React.Fragment>
                      ))}
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {solution.studioModel && (
                        <button
                          type="button"
                          onClick={() => onInspectIn3D(solution.studioModel!)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-[#9A7228] hover:text-[#7A591B] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          <span>Inspect 3D</span>
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedProductId(solution.id);
                          document
                            .getElementById('quote-calculator')
                            ?.scrollIntoView({ behavior: 'smooth' });
                        }}
                        className="text-xs font-medium text-[#181715] underline underline-offset-4 hover:text-[#9A7228] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        Estimate
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {/* Instant Measurement & Transparent Cost Estimator */}
        <div
          id="quote-calculator"
          className="mt-16 bg-[#F2F0EB] border border-[#181715]/10 rounded-xl p-6 sm:p-8 lg:p-10"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
            {/* Left Form */}
            <div className="lg:col-span-7">
              <div className="flex items-center gap-2 text-xs font-mono text-[#9A7228] mb-2">
                <Calculator className="w-3.5 h-3.5" />
                <span>Interactive Sq.Ft. Estimator · Indicative Chennai Pricing</span>
              </div>
              <h3 className="font-display text-2xl sm:text-3xl font-medium text-[#181715]">
                Plan your rooms &amp; budget before our visit
              </h3>
              <p className="mt-2 text-sm text-[#5C5952] max-w-xl leading-relaxed">
                Enter approximate window or balcony door measurements to build a room-by-room
                schedule. Our technician verifies exact millimeter dimensions with physical mesh &amp;
                blind samples during your free home visit.
              </p>

              <form onSubmit={handleAddOpening} className="mt-6 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="est-room"
                      className="block text-xs font-medium text-[#181715] mb-1.5"
                    >
                      Room or Opening Label
                    </label>
                    <input
                      id="est-room"
                      type="text"
                      value={roomLabel}
                      onChange={(e) => setRoomLabel(e.target.value)}
                      placeholder="e.g., Master Balcony Door"
                      className="w-full bg-white border border-[#181715]/15 rounded-lg px-3.5 py-2.5 text-sm text-[#181715] focus:outline-none focus:border-[#9A7228]"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="est-product"
                      className="block text-xs font-medium text-[#181715] mb-1.5"
                    >
                      System Type
                    </label>
                    <select
                      id="est-product"
                      value={selectedProductId}
                      onChange={(e) => setSelectedProductId(e.target.value)}
                      className="w-full bg-white border border-[#181715]/15 rounded-lg px-3.5 py-2.5 text-sm text-[#181715] focus:outline-none focus:border-[#9A7228]"
                    >
                      {PRODUCT_SOLUTIONS.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} (₹{p.ratePerSqFtMin}–₹{p.ratePerSqFtMax}/sq.ft)
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end">
                  <div className="sm:col-span-4">
                    <label
                      htmlFor="est-finish"
                      className="block text-xs font-medium text-[#181715] mb-1.5"
                    >
                      Frame / Cassette Finish
                    </label>
                    <select
                      id="est-finish"
                      value={selectedFinishId}
                      onChange={(e) => setSelectedFinishId(e.target.value as FrameFinishId)}
                      className="w-full bg-white border border-[#181715]/15 rounded-lg px-3.5 py-2.5 text-sm text-[#181715] focus:outline-none focus:border-[#9A7228]"
                    >
                      {FRAME_FINISHES.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-3">
                    <label
                      htmlFor="est-width"
                      className="block text-xs font-medium text-[#181715] mb-1.5"
                    >
                      Width ({unit})
                    </label>
                    <input
                      id="est-width"
                      type="number"
                      step="0.1"
                      min="0.5"
                      value={widthInput}
                      onChange={(e) => setWidthInput(e.target.value)}
                      className="w-full bg-white border border-[#181715]/15 rounded-lg px-3.5 py-2.5 text-sm font-mono tabular-nums text-[#181715] focus:outline-none focus:border-[#9A7228]"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label
                      htmlFor="est-height"
                      className="block text-xs font-medium text-[#181715] mb-1.5"
                    >
                      Height ({unit})
                    </label>
                    <input
                      id="est-height"
                      type="number"
                      step="0.1"
                      min="0.5"
                      value={heightInput}
                      onChange={(e) => setHeightInput(e.target.value)}
                      className="w-full bg-white border border-[#181715]/15 rounded-lg px-3.5 py-2.5 text-sm font-mono tabular-nums text-[#181715] focus:outline-none focus:border-[#9A7228]"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <div className="flex items-center p-1 bg-white border border-[#181715]/15 rounded-lg">
                      {(['ft', 'in'] as const).map((u) => (
                        <button
                          key={u}
                          type="button"
                          onClick={() => setUnit(u)}
                          className={`flex-1 py-1.5 text-xs font-mono font-medium rounded-md transition-colors cursor-pointer ${
                            unit === u ? 'bg-[#181715] text-white' : 'text-[#5C5952]'
                          }`}
                        >
                          {u}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {calcError && <p className="text-xs text-red-700 font-medium">{calcError}</p>}

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
                  <div className="text-sm text-[#5C5952]">
                    {previewMetrics ? (
                      <>
                        <span className="font-mono tabular-nums text-[#181715] font-semibold">
                          {previewMetrics.sqFt} sq.ft
                        </span>
                        <span className="mx-2" aria-hidden="true">
                          ·
                        </span>
                        <span className="font-mono tabular-nums text-[#9A7228] font-semibold">
                          ₹{previewMetrics.minTotal.toLocaleString('en-IN')} – ₹
                          {previewMetrics.maxTotal.toLocaleString('en-IN')}
                        </span>
                      </>
                    ) : (
                      <span>Enter dimensions to preview cost range</span>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-[#181715] rounded-lg hover:bg-[#2F2D2A] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Opening</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Right Schedule Summary */}
            <div className="lg:col-span-5 bg-white border border-[#181715]/10 rounded-xl p-6">
              <div className="flex items-center justify-between pb-3 border-b border-[#181715]/10">
                <h4 className="font-display text-lg font-medium text-[#181715]">
                  Your Room Schedule
                </h4>
                <span className="text-xs font-mono tabular-nums text-[#5C5952]">
                  {estimatorItems.length} {estimatorItems.length === 1 ? 'opening' : 'openings'}
                </span>
              </div>

              {estimatorItems.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-sm text-[#5C5952]">
                    No openings added yet. Add a window or balcony door on the left to build your
                    indicative quote.
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-[#181715]/8 max-h-64 overflow-y-auto my-2">
                  {estimatorItems.map((item) => (
                    <li key={item.id} className="py-3 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[#181715] truncate">
                          {item.roomLabel}
                        </p>
                        <p className="text-xs text-[#5C5952] mt-0.5">
                          {item.productName} · {item.finishName}
                        </p>
                        <p className="text-xs font-mono tabular-nums text-[#5C5952] mt-1">
                          {item.widthFt}ft × {item.heightFt}ft ({item.sqFt} sq.ft) · ₹
                          {item.estimatedMin.toLocaleString('en-IN')}–₹
                          {item.estimatedMax.toLocaleString('en-IN')}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => onRemoveEstimatorItem(item.id)}
                        aria-label={`Remove ${item.roomLabel}`}
                        className="p-1.5 text-[#5C5952] hover:text-red-700 rounded-md transition-colors cursor-pointer shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <div className="pt-4 mt-2 border-t border-[#181715]/10">
                <div className="flex items-baseline justify-between mb-1">
                  <span className="text-xs text-[#5C5952]">Total Area</span>
                  <span className="text-sm font-mono tabular-nums font-medium text-[#181715]">
                    {totals.sqFt} sq.ft
                  </span>
                </div>
                <div className="flex items-baseline justify-between mb-5">
                  <span className="text-xs text-[#5C5952]">Indicative Total</span>
                  <span className="text-lg font-mono tabular-nums font-semibold text-[#9A7228]">
                    {totals.min > 0
                      ? `₹${totals.min.toLocaleString('en-IN')} – ₹${totals.max.toLocaleString('en-IN')}`
                      : '₹0'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={onSendEstimateToBooking}
                  className="w-full px-4 py-2.5 text-sm font-medium text-white bg-[#9A7228] hover:bg-[#825F20] rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                >
                  {estimatorItems.length > 0
                    ? 'Attach Schedule to Free Site Visit'
                    : 'Book Free Home Measurement'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
