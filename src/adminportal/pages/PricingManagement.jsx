import React, { useEffect, useMemo, useState } from "react";
import { BadgePoundSterling, Clock3, Percent } from "lucide-react";
import { supplyChainApi } from "../../services/api";

const emptyForm = {
  pricingId: "",
  arrivalItemId: "",
  sellingPrice: "",
  customerDiscountPercent: "",
  customerDiscountAmount: "",
  pricingNotes: "",
  isApproved: true,
  applicationMode: "merge_into_live",
};

const money = (value) => new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(value ?? 0);

const Input = (props) => (
  <input
    {...props}
    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-tenzy-teal focus:ring-2 focus:ring-tenzy-teal/20"
  />
);

const Select = (props) => (
  <select
    {...props}
    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-tenzy-teal focus:ring-2 focus:ring-tenzy-teal/20"
  />
);

const Label = ({ children }) => <label className="mb-1 block text-xs font-semibold text-slate-500">{children}</label>;

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
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activatingId, setActivatingId] = useState(null);

  const load = async () => {
    const [eligibleRows, pricing] = await Promise.all([
      supplyChainApi.getEligiblePricing(),
      supplyChainApi.getPricing(),
    ]);
    setEligible(eligibleRows ?? []);
    setPricingRows(pricing ?? []);
  };

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  const pendingRows = useMemo(
    () => eligible.filter((row) => row.pricingReviewStatus !== "applied_live"),
    [eligible]
  );

  const selectedEligible = useMemo(
    () => eligible.find((row) => String(row.arrivalItemId) === String(form.arrivalItemId)),
    [eligible, form.arrivalItemId]
  );

  const selectArrivalItem = (arrivalItemId) => {
    const row = eligible.find((entry) => String(entry.arrivalItemId) === String(arrivalItemId));
    const pricingRow = pricingRows.find((entry) => String(entry.arrivalItemId) === String(arrivalItemId));

    if (!row) {
      setForm(emptyForm);
      return;
    }

    setForm({
      pricingId: pricingRow?.pricingId ?? row.pricingId ?? "",
      arrivalItemId: String(row.arrivalItemId),
      sellingPrice: pricingRow?.sellingPrice ?? row.currentSellingPrice ?? "",
      customerDiscountPercent: pricingRow?.customerDiscountPercent ?? "",
      customerDiscountAmount: pricingRow?.customerDiscountAmount ?? "",
      pricingNotes: pricingRow?.pricingNotes ?? "",
      isApproved: pricingRow?.isApproved ?? true,
      applicationMode: pricingRow?.applicationMode === "wait_for_current_stock" ? "wait_for_current_stock" : "merge_into_live",
    });
  };

  const savePricing = async () => {
    if (!form.arrivalItemId || !form.sellingPrice || saving) return;
    setSaving(true);
    try {
      await supplyChainApi.savePricing({
        pricingId: form.pricingId ? Number(form.pricingId) : undefined,
        arrivalItemId: Number(form.arrivalItemId),
        sellingPrice: Number(form.sellingPrice),
        customerDiscountPercent: Number(form.customerDiscountPercent || 0),
        customerDiscountAmount: Number(form.customerDiscountAmount || 0),
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
      if (String(form.pricingId) === String(row.pricingId)) {
        setForm(emptyForm);
      }
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
          <p className="mt-1 text-sm text-slate-500">Approved arrivals land here first. Pricing decides whether each batch goes live now or waits until the current stock is finished.</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-500">
          {pendingRows.length} items waiting on pricing workflow
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <Percent size={16} className="text-tenzy-teal" />
            <h2 className="text-lg font-bold text-slate-900">Price and release batch</h2>
          </div>

          <div className="mt-4 space-y-4">
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

            {selectedEligible && (
              <div className="space-y-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-800">{selectedEligible.productName}</p>
                    <p className="mt-1">{selectedEligible.brandName} · {selectedEligible.categoryName}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusMeta(selectedEligible.pricingReviewStatus).badge}`}>
                    {getStatusMeta(selectedEligible.pricingReviewStatus).label}
                  </span>
                </div>
                <div className="grid gap-2 md:grid-cols-2">
                  <p>Landed unit cost: <strong>{money(selectedEligible.landedUnitCost)}</strong></p>
                  <p>Approved quantity: <strong>{selectedEligible.approvedQuantity}</strong></p>
                  <p>Current live price: <strong>{money(selectedEligible.currentSellingPrice)}</strong></p>
                  <p>Current live stock: <strong>{selectedEligible.currentStockQuantity}</strong></p>
                </div>
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>Selling price</Label>
                <Input type="number" min="0" step="0.01" value={form.sellingPrice} onChange={(e) => setForm({ ...form, sellingPrice: e.target.value })} />
              </div>
              <div>
                <Label>Customer discount %</Label>
                <Input type="number" min="0" step="0.01" value={form.customerDiscountPercent} onChange={(e) => setForm({ ...form, customerDiscountPercent: e.target.value })} />
              </div>
              <div>
                <Label>Customer discount amount</Label>
                <Input type="number" min="0" step="0.01" value={form.customerDiscountAmount} onChange={(e) => setForm({ ...form, customerDiscountAmount: e.target.value })} />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  <input type="checkbox" checked={form.isApproved} onChange={(e) => setForm({ ...form, isApproved: e.target.checked })} />
                  Approved
                </label>
              </div>
            </div>

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

            <div>
              <Label>Pricing notes</Label>
              <textarea
                rows={4}
                value={form.pricingNotes}
                onChange={(e) => setForm({ ...form, pricingNotes: e.target.value })}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-tenzy-teal focus:ring-2 focus:ring-tenzy-teal/20"
                placeholder="Explain why this batch should merge now or wait until current stock finishes"
              />
            </div>

            <button onClick={savePricing} disabled={saving} className="w-full rounded-2xl bg-tenzy-teal px-4 py-3 text-sm font-semibold text-white disabled:opacity-60">
              {saving ? "Saving pricing..." : "Save pricing decision"}
            </button>
          </div>
        </div>

        <div className="space-y-5">
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
                        <p className="text-xs text-slate-500">{row.dispatchReference} · qty {row.approvedQuantity} · landed {money(row.landedUnitCost)}</p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${status.badge}`}>{status.label}</span>
                    </div>
                    <div className="mt-3 grid gap-2 text-sm text-slate-600 md:grid-cols-2">
                      <p>Current live price: <strong>{money(row.currentSellingPrice)}</strong></p>
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

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <BadgePoundSterling size={16} className="text-indigo-500" />
              <h2 className="text-lg font-bold text-slate-900">Pricing records</h2>
            </div>
            <div className="mt-4 grid gap-3">
              {pricingRows.map((row) => {
                const status = getStatusMeta(row.pricingReviewStatus);
                return (
                  <div key={row.pricingId} className="rounded-2xl bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-800">{row.productName}</p>
                        <p className="text-xs text-slate-500">{row.brandName} · landed {money(row.landedUnitCost)}</p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${status.badge}`}>
                        {status.label}
                      </span>
                    </div>
                    <div className="mt-3 grid gap-2 text-sm text-slate-600 md:grid-cols-3">
                      <p>Selling: <strong>{money(row.sellingPrice)}</strong></p>
                      <p>Final: <strong>{money(row.finalSellingPrice)}</strong></p>
                      <p>Qty: <strong>{row.approvedQuantity}</strong></p>
                      <p>Markup: <strong>{Number(row.markupPercent).toFixed(2)}%</strong></p>
                      <p>Margin: <strong>{Number(row.marginPercent).toFixed(2)}%</strong></p>
                      <p>Mode: <strong>{row.applicationMode === "wait_for_current_stock" ? "Wait for stock finish" : "Merge live now"}</strong></p>
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
