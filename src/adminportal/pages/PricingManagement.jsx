import React, { useEffect, useMemo, useState } from "react";
import { AlertCircle, BadgePoundSterling, Clock3, Percent, TrendingUp } from "lucide-react";
import { supplyChainApi } from "../../services/api";

const emptyForm = {
  pricingId: "",
  arrivalItemId: "",
  baseSellingPrice: "",
  sellingPrice: "",          // in LKR
  dispatchCostPerUnit: "",   // admin-adjustable GBP dispatch allocation per unit
  customerDiscountPercent: "",
  customerDiscountAmount: "",
  discountMode: "none",      // "none" | "percent" | "amount"
  pricingNotes: "",
  isApproved: true,
  applicationMode: "merge_into_live",
};

const fmt = (value) => new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(value ?? 0);
const fmtLkr = (value) => new Intl.NumberFormat("en-LK", { style: "currency", currency: "LKR", maximumFractionDigits: 0 }).format(value ?? 0);
const round2 = (n) => Math.round((n || 0) * 100) / 100;

const Input = ({ className = "", ...props }) => (
  <input
    {...props}
    className={`w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-tenzy-teal focus:ring-2 focus:ring-tenzy-teal/20 ${className}`}
  />
);

const Select = (props) => (
  <select
    {...props}
    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-tenzy-teal focus:ring-2 focus:ring-tenzy-teal/20"
  />
);

const Label = ({ children }) => <label className="mb-1 block text-xs font-semibold text-slate-500">{children}</label>;

const Stat = ({ label, value, sub, tone = "slate" }) => {
  const tones = {
    slate: "bg-slate-50 text-slate-800",
    teal: "bg-teal-50 text-teal-800",
    amber: "bg-amber-50 text-amber-800",
    emerald: "bg-emerald-50 text-emerald-800",
    red: "bg-red-50 text-red-700",
    indigo: "bg-indigo-50 text-indigo-800",
  };
  return (
    <div className={`rounded-2xl px-3 py-3 ${tones[tone]}`}>
      <p className="text-[10px] font-semibold uppercase tracking-widest opacity-60">{label}</p>
      <p className="mt-1 text-sm font-bold">{value}</p>
      {sub && <p className="mt-0.5 text-[10px] opacity-70">{sub}</p>}
    </div>
  );
};

const STATUS_META = {
  pending_price_approval: { label: "Pending price approval", badge: "bg-amber-100 text-amber-700" },
  draft: { label: "Draft pricing", badge: "bg-slate-100 text-slate-600" },
  pending_activation: { label: "Ready to activate", badge: "bg-blue-100 text-blue-700" },
  awaiting_stock_depletion: { label: "Waiting for current stock", badge: "bg-violet-100 text-violet-700" },
  applied_live: { label: "Live", badge: "bg-emerald-100 text-emerald-700" },
};

const APPLICATION_MODES = [
  {
    value: "merge_into_live",
    label: "Merge into live stock now",
    description: "Adds the approved quantity to current stock and updates the live product price immediately.",
  },
  {
    value: "wait_for_current_stock",
    label: "Wait until current stock finishes",
    description: "Keeps this batch off the live product until the old stock reaches zero, then activate it later.",
  },
];

const getStatusMeta = (status) => STATUS_META[status] ?? { label: status || "Pending", badge: "bg-slate-100 text-slate-600" };

export default function PricingManagement() {
  const [eligible, setEligible] = useState([]);
  const [pricingRows, setPricingRows] = useState([]);
  const [dispatches, setDispatches] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [lkrRate, setLkrRate] = useState(""); // LKR per 1 GBP
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activatingId, setActivatingId] = useState(null);

  const load = async () => {
    const [eligibleRows, pricing, dispatchList] = await Promise.all([
      supplyChainApi.getEligiblePricing(),
      supplyChainApi.getPricing(),
      supplyChainApi.getDispatches(),
    ]);
    setEligible(eligibleRows ?? []);
    setPricingRows(pricing ?? []);
    setDispatches(dispatchList ?? []);
  };

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!form.arrivalItemId) return;

    const base = Number(form.baseSellingPrice || form.sellingPrice) || 0;
    let nextSellingPrice = base;

    if (form.discountMode === "percent") {
      nextSellingPrice = Math.max(base - (base * (Number(form.customerDiscountPercent) || 0) / 100), 0);
    } else if (form.discountMode === "amount") {
      nextSellingPrice = Math.max(base - (Number(form.customerDiscountAmount) || 0), 0);
    }

    const nextValue = base === 0 && String(form.baseSellingPrice || "").trim() === ""
      ? ""
      : String(round2(nextSellingPrice));

    setForm((current) => (current.sellingPrice === nextValue ? current : { ...current, sellingPrice: nextValue }));
  }, [
    form.arrivalItemId,
    form.baseSellingPrice,
    form.discountMode,
    form.customerDiscountPercent,
    form.customerDiscountAmount,
  ]);

  const pendingRows = useMemo(
    () => eligible.filter((row) => row.pricingReviewStatus !== "applied_live"),
    [eligible]
  );

  const selectedEligible = useMemo(
    () => eligible.find((row) => String(row.arrivalItemId) === String(form.arrivalItemId)),
    [eligible, form.arrivalItemId]
  );

  // ── Dispatch cost calculations ─────────────────────────────────────────────
  const matchedDispatch = useMemo(
    () => dispatches.find((d) => d.dispatchReference === selectedEligible?.dispatchReference),
    [dispatches, selectedEligible]
  );

  const sameDispatchItems = useMemo(
    () => eligible.filter((r) => r.dispatchReference === selectedEligible?.dispatchReference),
    [eligible, selectedEligible]
  );

  const totalDispatchQty = useMemo(
    () => sameDispatchItems.reduce((sum, r) => sum + (Number(r.approvedQuantity) || 0), 0),
    [sameDispatchItems]
  );

  const suggestedDispatchCostPerUnit = useMemo(() => {
    if (!matchedDispatch || totalDispatchQty <= 0) return 0;
    return round2((matchedDispatch.totalShipmentCharges || 0) / totalDispatchQty);
  }, [matchedDispatch, totalDispatchQty]);

  // Use admin-entered value, falling back to suggested
  const effectiveDispatchCostPerUnit = form.dispatchCostPerUnit !== ""
    ? Number(form.dispatchCostPerUnit)
    : suggestedDispatchCostPerUnit;

  const thisItemDispatchTotal = effectiveDispatchCostPerUnit * (Number(selectedEligible?.approvedQuantity) || 0);
  const totalDispatchCharges = matchedDispatch?.totalShipmentCharges || 0;
  const remainingDispatchCost = round2(totalDispatchCharges - thisItemDispatchTotal);
  const otherItemsQty = totalDispatchQty - (Number(selectedEligible?.approvedQuantity) || 0);
  const otherItemsNewPerUnit = otherItemsQty > 0 ? round2(remainingDispatchCost / otherItemsQty) : 0;
  const dispatchCostChanged = form.dispatchCostPerUnit !== "" && round2(Number(form.dispatchCostPerUnit)) !== suggestedDispatchCostPerUnit;

  // ── LKR ↔ GBP ──────────────────────────────────────────────────────────────
  const lkrRateNum = Number(lkrRate) || 0;
  const baseSellingPriceLkr = Number(form.baseSellingPrice || form.sellingPrice) || 0;
  const sellingPriceLkr = Number(form.sellingPrice) || 0;
  const sellingPriceGbp = lkrRateNum > 0 ? round2(sellingPriceLkr / lkrRateNum) : null;

  const discountLkr = Math.max(round2(baseSellingPriceLkr - sellingPriceLkr), 0);
  const finalSellingLkr = sellingPriceLkr;
  const discountGbp = lkrRateNum > 0 ? round2(discountLkr / lkrRateNum) : 0;
  const finalSellingGbp = lkrRateNum > 0 ? round2(finalSellingLkr / lkrRateNum) : null;

  // Markup/margin against landed cost including dispatch allocation
  const baseLandedCost = Number(selectedEligible?.landedUnitCost) || 0;
  const landedCostPerUnit = round2(baseLandedCost + effectiveDispatchCostPerUnit);
  const landedCostLkr = lkrRateNum > 0 ? Math.round(landedCostPerUnit * lkrRateNum) : null;
  const isSellingBelowLandedCost = sellingPriceLkr > 0 && landedCostLkr !== null && sellingPriceLkr < landedCostLkr;
  const markupPct = landedCostPerUnit > 0 && finalSellingGbp !== null ? round2(((finalSellingGbp - landedCostPerUnit) / landedCostPerUnit) * 100) : null;
  const marginPct = finalSellingGbp > 0 && finalSellingGbp !== null ? round2(((finalSellingGbp - landedCostPerUnit) / finalSellingGbp) * 100) : null;

  // ── Select item ────────────────────────────────────────────────────────────
  const selectArrivalItem = (arrivalItemId) => {
    const row = eligible.find((entry) => String(entry.arrivalItemId) === String(arrivalItemId));
    const pricingRow = pricingRows.find((entry) => String(entry.arrivalItemId) === String(arrivalItemId));

    if (!row) {
      setForm(emptyForm);
      return;
    }

    const existingDiscountPct = pricingRow?.customerDiscountPercent;
    const existingDiscountAmt = pricingRow?.customerDiscountAmount;
    let discountMode = "none";
    if (existingDiscountPct && Number(existingDiscountPct) > 0) discountMode = "percent";
    else if (existingDiscountAmt && Number(existingDiscountAmt) > 0) discountMode = "amount";

    setForm({
      pricingId: pricingRow?.pricingId ?? row.pricingId ?? "",
      arrivalItemId: String(row.arrivalItemId),
      baseSellingPrice: pricingRow?.sellingPrice ?? row.currentSellingPrice ?? "",
      sellingPrice: pricingRow?.sellingPrice ?? row.currentSellingPrice ?? "",
      dispatchCostPerUnit: "", // will show suggested value
      customerDiscountPercent: discountMode === "percent" ? (existingDiscountPct ?? "") : "",
      customerDiscountAmount: discountMode === "amount" ? (existingDiscountAmt ?? "") : "",
      discountMode,
      pricingNotes: pricingRow?.pricingNotes ?? "",
      isApproved: pricingRow?.isApproved ?? true,
      applicationMode: pricingRow?.applicationMode === "wait_for_current_stock" ? "wait_for_current_stock" : "merge_into_live",
    });
  };

  // ── Save ───────────────────────────────────────────────────────────────────
  const savePricing = async () => {
    if (!form.arrivalItemId || !form.sellingPrice || saving) return;
    setSaving(true);
    try {
      await supplyChainApi.savePricing({
        pricingId: form.pricingId ? Number(form.pricingId) : undefined,
        arrivalItemId: Number(form.arrivalItemId),
        sellingPrice: Number(form.sellingPrice),
        customerDiscountPercent: form.discountMode === "percent" ? Number(form.customerDiscountPercent || 0) : 0,
        customerDiscountAmount: form.discountMode === "amount" ? Number(form.customerDiscountAmount || 0) : 0,
        pricingNotes: form.pricingNotes,
        isApproved: form.isApproved,
        applicationMode: form.applicationMode,
      });
      await load();
      setForm(emptyForm);
    } finally {
      setSaving(false);
    }
  };

  const activatePricing = async (row) => {
    if (!row?.pricingId || activatingId) return;
    setActivatingId(row.pricingId);
    try {
      await supplyChainApi.activatePricing(row.pricingId, { forceActivate: false });
      await load();
      if (String(form.pricingId) === String(row.pricingId)) setForm(emptyForm);
    } finally {
      setActivatingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 rounded-full border-4 border-tenzy-teal/30 border-t-tenzy-teal animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Pricing Management</h1>
          <p className="mt-1 text-sm text-slate-500">Set LKR selling prices, allocate dispatch costs, and release batches to live stock.</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-500">
          {pendingRows.length} items waiting on pricing workflow
        </div>
      </div>

      {/* Exchange rate banner */}
      <div className="rounded-2xl border border-slate-200 bg-white px-5 py-3 flex items-center gap-4 shadow-sm">
        <div className="flex items-center gap-2 shrink-0">
          <BadgePoundSterling size={16} className="text-tenzy-teal" />
          <span className="text-sm font-semibold text-slate-700">Exchange rate</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <span>1 GBP =</span>
          <input
            type="number"
            min="1"
            step="0.01"
            value={lkrRate}
            onChange={(e) => setLkrRate(e.target.value)}
            placeholder="e.g. 350"
            className="w-28 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm outline-none focus:border-tenzy-teal focus:ring-2 focus:ring-tenzy-teal/20"
          />
          <span>LKR</span>
        </div>
        {lkrRateNum > 0 && (
          <span className="ml-auto text-xs text-slate-400">Selling prices entered in LKR · GBP equivalent shown for reference</span>
        )}
        {!lkrRateNum && (
          <span className="ml-auto text-xs text-amber-600 flex items-center gap-1">
            <AlertCircle size={12} /> Enter exchange rate to see GBP equivalents
          </span>
        )}
      </div>

      <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        {/* Left: pricing form */}
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <Percent size={16} className="text-tenzy-teal" />
            <h2 className="text-lg font-bold text-slate-900">Price and release batch</h2>
          </div>

          <div className="mt-4 space-y-4">
            {/* Item selector */}
            <div>
              <Label>Pending arrival item</Label>
              <Select value={form.arrivalItemId} onChange={(e) => selectArrivalItem(e.target.value)}>
                <option value="">Select item from pricing queue</option>
                {pendingRows.map((row) => {
                  const status = getStatusMeta(row.pricingReviewStatus);
                  return (
                    <option key={row.arrivalItemId} value={row.arrivalItemId}>
                      {row.productName} · {row.dispatchReference} · qty {row.approvedQuantity} · {status.label}
                    </option>
                  );
                })}
              </Select>
            </div>

            {/* Selected item summary */}
            {selectedEligible && (
              <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-800">{selectedEligible.productName}</p>
                    <p className="mt-1">{selectedEligible.brandName} · {selectedEligible.categoryName}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusMeta(selectedEligible.pricingReviewStatus).badge}`}>
                    {getStatusMeta(selectedEligible.pricingReviewStatus).label}
                  </span>
                </div>
                <div className="grid gap-2 grid-cols-2">
                  <p>Base landed unit cost: <strong>{fmt(selectedEligible.landedUnitCost)}</strong></p>
                  <p>Approved quantity: <strong>{selectedEligible.approvedQuantity}</strong></p>
                  <p>Current live price: <strong>{fmtLkr(selectedEligible.currentSellingPrice)}</strong></p>
                  <p>Current live stock: <strong>{selectedEligible.currentStockQuantity}</strong></p>
                </div>
              </div>
            )}

            {/* Dispatch cost allocator */}
            {selectedEligible && (
              <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <TrendingUp size={14} className="text-indigo-500" />
                  <h3 className="text-sm font-bold text-slate-800">Dispatch cost allocation</h3>
                  {matchedDispatch && (
                    <span className="ml-auto text-xs text-slate-500">{selectedEligible.dispatchReference}</span>
                  )}
                </div>

                {matchedDispatch ? (
                  <>
                    <div className="grid grid-cols-3 gap-2">
                      <Stat label="Total dispatch cost" value={fmt(totalDispatchCharges)} tone="indigo" />
                      <Stat label="Total units in dispatch" value={totalDispatchQty} tone="slate" />
                      <Stat label="Suggested per unit" value={fmt(suggestedDispatchCostPerUnit)} tone="teal" />
                    </div>

                    <div>
                      <Label>
                        Dispatch cost per unit (GBP){" "}
                        <span className="text-slate-400 font-normal">— suggested {fmt(suggestedDispatchCostPerUnit)}</span>
                      </Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.dispatchCostPerUnit}
                        placeholder={String(suggestedDispatchCostPerUnit)}
                        onChange={(e) => setForm({ ...form, dispatchCostPerUnit: e.target.value })}
                      />
                    </div>

                    {/* Rebalancing info — shown when admin deviates from suggested */}
                    {dispatchCostChanged && otherItemsQty > 0 && (
                      <div className={`rounded-xl border px-3 py-2.5 text-xs space-y-1 ${remainingDispatchCost < 0 ? "bg-red-50 border-red-200 text-red-700" : "bg-amber-50 border-amber-200 text-amber-700"}`}>
                        <p className="font-semibold">Rebalancing impact on other items in this dispatch:</p>
                        <p>
                          This item (qty {selectedEligible.approvedQuantity}): <strong>{fmt(thisItemDispatchTotal)}</strong>
                          {" · "}
                          Remaining for {otherItemsQty} other unit(s): <strong>{fmt(remainingDispatchCost)}</strong>
                          {" · "}
                          New per unit: <strong>{fmt(otherItemsNewPerUnit)}</strong>
                        </p>
                        {remainingDispatchCost < 0 && (
                          <p className="font-semibold">Warning: allocation exceeds total dispatch cost by {fmt(Math.abs(remainingDispatchCost))}</p>
                        )}
                      </div>
                    )}

                    {selectedEligible && (
                      <div className="grid grid-cols-2 gap-2">
                        <Stat
                          label="This item dispatch total"
                          value={fmt(thisItemDispatchTotal)}
                          sub={`${selectedEligible.approvedQuantity} units × ${fmt(effectiveDispatchCostPerUnit)}`}
                          tone="indigo"
                        />
                        <Stat
                          label="Landed Cost per Unit"
                          value={fmt(landedCostPerUnit)}
                          sub={`Base ${fmt(baseLandedCost)} + dispatch ${fmt(effectiveDispatchCostPerUnit)}`}
                          tone="slate"
                        />
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-xs text-slate-400">No dispatch record matched for "{selectedEligible.dispatchReference}".</p>
                )}
              </div>
            )}

            {/* Selling price (LKR) + GBP equivalent */}
            <div className="space-y-2">
              <div>
                <Label>
                  Selling price (LKR) <span className="text-red-400">*</span>
                </Label>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={form.sellingPrice}
                  onChange={(e) => setForm({ ...form, baseSellingPrice: e.target.value, sellingPrice: e.target.value })}
                  placeholder="e.g. 4500"
                  className={isSellingBelowLandedCost ? "border-red-300 bg-red-50 text-red-700 focus:border-red-400 focus:ring-red-200" : ""}
                />
                {discountLkr > 0 && (
                  <p className="mt-1 text-xs text-slate-500">
                    Base price before discount: {fmtLkr(baseSellingPriceLkr)}
                  </p>
                )}
                {isSellingBelowLandedCost && (
                  <p className="mt-1 text-xs text-red-600">
                    Selling price is below landed cost. Landed cost per unit is {fmt(landedCostPerUnit)}
                    {landedCostLkr !== null ? ` (${fmtLkr(landedCostLkr)})` : ""}.
                  </p>
                )}
              </div>
              {/* GBP equivalent + markup/margin row */}
              {sellingPriceLkr > 0 && (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <Stat
                    label="Selling (GBP equiv.)"
                    value={sellingPriceGbp !== null ? fmt(sellingPriceGbp) : "—"}
                    sub={lkrRateNum > 0 ? `÷ ${lkrRateNum}` : "Enter rate above"}
                    tone="teal"
                  />
                  <Stat
                    label="After discount (GBP)"
                    value={finalSellingGbp !== null ? fmt(finalSellingGbp) : "—"}
                    tone={discountGbp > 0 ? "amber" : "slate"}
                  />
                  <Stat
                    label="Markup"
                    value={markupPct !== null ? `${markupPct}%` : "—"}
                    sub={landedCostPerUnit > 0 ? `Landed ${fmt(landedCostPerUnit)}` : "No landed cost"}
                    tone={markupPct !== null && markupPct >= 0 ? "emerald" : markupPct !== null ? "red" : "slate"}
                  />
                  <Stat
                    label="Margin"
                    value={marginPct !== null ? `${marginPct}%` : "—"}
                    tone={marginPct !== null && marginPct >= 0 ? "emerald" : marginPct !== null ? "red" : "slate"}
                  />
                </div>
              )}
            </div>

            {/* Discount — only % or amount, not both */}
            <div>
              <Label>Customer discount</Label>
              <div className="flex gap-2 mb-3">
                {[
                  { value: "none", label: "No discount" },
                  { value: "percent", label: "Percentage (%)" },
                  { value: "amount", label: "Fixed amount" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setForm({
                      ...form,
                      discountMode: opt.value,
                      customerDiscountPercent: "",
                      customerDiscountAmount: "",
                    })}
                    className={`flex-1 rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                      form.discountMode === opt.value
                        ? "border-tenzy-teal bg-tenzy-teal/10 text-tenzy-teal"
                        : "border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {form.discountMode === "percent" && (
                <div>
                  <Label>Discount percentage (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={form.customerDiscountPercent}
                    onChange={(e) => setForm({ ...form, customerDiscountPercent: e.target.value })}
                    placeholder="e.g. 10"
                  />
                  {sellingPriceLkr > 0 && Number(form.customerDiscountPercent) > 0 && (
                    <p className="mt-1 text-xs text-amber-700">
                      Discount: {fmt(discountGbp)} · Final selling price: {fmt(finalSellingGbp)} ({fmtLkr(finalSellingGbp * lkrRateNum)})
                    </p>
                  )}
                </div>
              )}

              {form.discountMode === "amount" && (
                <div>
                  <Label>Discount amount (LKR)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.customerDiscountAmount}
                    onChange={(e) => setForm({ ...form, customerDiscountAmount: e.target.value })}
                    placeholder="e.g. 500"
                  />
                  {sellingPriceLkr > 0 && Number(form.customerDiscountAmount) > 0 && (
                    <p className="mt-1 text-xs text-amber-700">
                      Discount: {fmt(discountGbp)} · Final selling price: {fmt(finalSellingGbp)}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Activation mode */}
            <div>
              <Label>Activation logic</Label>
              <div className="space-y-2">
                {APPLICATION_MODES.map((mode) => (
                  <button
                    key={mode.value}
                    type="button"
                    onClick={() => setForm({ ...form, applicationMode: mode.value })}
                    className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                      form.applicationMode === mode.value
                        ? "border-tenzy-teal bg-tenzy-teal/5"
                        : "border-slate-200 bg-slate-50 hover:border-tenzy-teal/40"
                    }`}
                  >
                    <p className="text-sm font-semibold text-slate-800">{mode.label}</p>
                    <p className="mt-1 text-xs text-slate-500">{mode.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Approved toggle */}
            <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              <input type="checkbox" checked={form.isApproved} onChange={(e) => setForm({ ...form, isApproved: e.target.checked })} />
              Approved
            </label>

            {/* Notes */}
            <div>
              <Label>Pricing notes</Label>
              <textarea
                rows={3}
                value={form.pricingNotes}
                onChange={(e) => setForm({ ...form, pricingNotes: e.target.value })}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-tenzy-teal focus:ring-2 focus:ring-tenzy-teal/20"
                placeholder="Explain why this batch should merge now or wait until current stock finishes"
              />
            </div>

            <button onClick={savePricing} disabled={saving || !form.arrivalItemId || !form.sellingPrice} className="w-full rounded-2xl bg-tenzy-teal px-4 py-3 text-sm font-semibold text-white disabled:opacity-60">
              {saving ? "Saving pricing..." : "Save pricing decision"}
            </button>
          </div>
        </div>

        {/* Right: queue + records */}
        <div className="space-y-5">
          {/* Pending queue */}
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <Clock3 size={16} className="text-violet-500" />
              <h2 className="text-lg font-bold text-slate-900">Pending pricing queue</h2>
            </div>
            <div className="mt-4 grid gap-3">
              {pendingRows.length === 0 && (
                <p className="rounded-2xl bg-slate-50 p-6 text-center text-sm text-slate-400">No pending pricing items.</p>
              )}
              {pendingRows.map((row) => {
                const status = getStatusMeta(row.pricingReviewStatus);
                const canActivate = row.pricingId && row.pricingReviewStatus === "awaiting_stock_depletion" && Number(row.currentStockQuantity || 0) <= 0;
                return (
                  <div key={row.arrivalItemId} className="rounded-2xl bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-800">{row.productName}</p>
                        <p className="text-xs text-slate-500">{row.dispatchReference} · qty {row.approvedQuantity} · landed {fmt(row.landedUnitCost)}</p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${status.badge}`}>{status.label}</span>
                    </div>
                    <div className="mt-3 grid gap-2 text-sm text-slate-600 md:grid-cols-2">
                      <p>Current live price: <strong>{fmtLkr(row.currentSellingPrice)}</strong></p>
                      <p>Current live stock: <strong>{row.currentStockQuantity}</strong></p>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => selectArrivalItem(row.arrivalItemId)}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-tenzy-teal hover:text-tenzy-teal"
                      >
                        Review pricing
                      </button>
                      {canActivate && (
                        <button
                          type="button"
                          onClick={() => activatePricing(row)}
                          disabled={activatingId === row.pricingId}
                          className="rounded-xl bg-tenzy-teal px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                        >
                          {activatingId === row.pricingId ? "Activating..." : "Activate queued price"}
                        </button>
                      )}
                    </div>
                    {row.pricingReviewStatus === "awaiting_stock_depletion" && Number(row.currentStockQuantity || 0) > 0 && (
                      <p className="mt-2 text-xs text-slate-500">This batch is waiting because the current live stock is still above zero.</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Pricing records */}
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <BadgePoundSterling size={16} className="text-indigo-500" />
              <h2 className="text-lg font-bold text-slate-900">Pricing records</h2>
            </div>
            <div className="mt-4 grid gap-3">
              {pricingRows.map((row) => {
                const status = getStatusMeta(row.pricingReviewStatus);
                const sellLkr = Number(row.sellingPrice) || 0;
                const sellGbp = lkrRateNum > 0 ? round2(sellLkr / lkrRateNum) : null;
                const finalLkr = Number(row.finalSellingPrice) || 0;
                const finalGbp = lkrRateNum > 0 ? round2(finalLkr / lkrRateNum) : null;
                return (
                  <div key={row.pricingId} className="rounded-2xl bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-800">{row.productName}</p>
                        <p className="text-xs text-slate-500">{row.brandName} · landed {fmt(row.landedUnitCost)}</p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${status.badge}`}>
                        {status.label}
                      </span>
                    </div>
                    <div className="mt-3 grid gap-2 text-sm text-slate-600 md:grid-cols-3">
                      <div>
                        <p className="text-xs text-slate-400">Selling</p>
                        <p className="font-semibold text-slate-800">{fmtLkr(sellLkr)}</p>
                        {sellGbp !== null && <p className="text-xs text-slate-500">≈ {fmt(sellGbp)}</p>}
                      </div>
                      <div>
                        <p className="text-xs text-slate-400">After discount</p>
                        <p className="font-semibold text-slate-800">{fmtLkr(finalLkr)}</p>
                        {finalGbp !== null && <p className="text-xs text-slate-500">≈ {fmt(finalGbp)}</p>}
                      </div>
                      <div>
                        <p className="text-xs text-slate-400">Qty / Mode</p>
                        <p className="font-semibold text-slate-800">{row.approvedQuantity}</p>
                        <p className="text-xs text-slate-500">{row.applicationMode === "wait_for_current_stock" ? "Wait stock" : "Merge live"}</p>
                      </div>
                      <p>Markup: <strong>{Number(row.markupPercent).toFixed(1)}%</strong></p>
                      <p>Margin: <strong>{Number(row.marginPercent).toFixed(1)}%</strong></p>
                    </div>
                    {row.pricingNotes && <p className="mt-2 text-xs text-slate-500">{row.pricingNotes}</p>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
