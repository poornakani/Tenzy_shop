import React, { useEffect, useMemo, useState } from "react";
import {
  AlertCircle, AlertTriangle, BadgePoundSterling, CheckCircle,
  Clock3, Package, Percent, BarChart3,
} from "lucide-react";
import { productsApi, supplyChainApi } from "../../services/api";

// ── Constants ─────────────────────────────────────────────────────────────────
const CUSTOMS_PER_KG = 8;  // GBP per kg — customs clearance rate

// ── Formatters ────────────────────────────────────────────────────────────────
const fmtGbp = (v) => new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", minimumFractionDigits: 2, maximumFractionDigits: 4 }).format(v ?? 0);
const fmtLkr = (v) => new Intl.NumberFormat("en-LK", { style: "currency", currency: "LKR", maximumFractionDigits: 0 }).format(v ?? 0);
const round4 = (n) => Math.round((n || 0) * 10000) / 10000;
const round2 = (n) => Math.round((n || 0) * 100) / 100;
const getQty = (row) => Number(row?.approvedQuantity ?? row?.quantityApproved ?? row?.quantity ?? 0) || 0;
const getWeightG = (row) => Number(
  row?.productWeight ??
  row?.ProductWeight ??
  row?.productWeightGrams ??
  row?.weightGrams ??
  row?.WeightGrams ??
  row?.weight ??
  row?.Weight ??
  0
) || 0;
const getProductId = (row) => row?.productId ?? row?.ProductId ?? row?.productID ?? row?.ProductID ?? null;
const getProcurementItemId = (row) => row?.procurementItemId ?? row?.ProcurementItemId ?? row?.sourceProcurementItemId ?? row?.SourceProcurementItemId ?? null;
const getProductName = (row) => String(row?.productName ?? row?.ProductName ?? row?.name ?? row?.Name ?? "").trim().toLowerCase();
const getShipmentChargesGbp = (dispatch) => Number(dispatch?.totalShipmentCharges ?? dispatch?.totalShipmentCharge ?? 0) || 0;
const getPurchaseCostGbp = (row) => Number(
  row?.purchaseCostGbp ??
  row?.netUnitCost ??
  row?.NetUnitCost ??
  row?.landedUnitCost ??
  row?.LandedUnitCost ??
  row?.unitPrice ??
  row?.UnitPrice ??
  row?.price ??
  row?.Price ??
  row?.grossUnitPrice ??
  row?.GrossUnitPrice ??
  0
) || 0;
const getReportUnitCostGbp = (row) => {
  const directCost = getPurchaseCostGbp(row);
  if (directCost > 0) return directCost;
  const productCost = Number(row?.productCost ?? row?.ProductCost ?? 0) || 0;
  const qty = Number(row?.quantityDispatched ?? row?.QuantityDispatched ?? row?.quantity ?? row?.Quantity ?? 0) || 0;
  return productCost > 0 && qty > 0 ? productCost / qty : 0;
};

/**
 * Calculates dispatch cost allocation across a list of products.
 *
 * Total dispatch cost = (chargedWeightKg × costPerKg) + boxCharge
 * Cost per gram      = totalDispatchCost ÷ totalActualProductWeightGrams
 * Per-item cost      = itemWeightGrams × costPerGram
 *
 * @param {Array<{name:string, weightGrams:number, quantity:number}>} products
 * @param {number} chargedWeightKg  - weight the courier bills for (not the actual product weight)
 * @param {number} costPerKg        - courier rate in GBP per kg
 * @param {number} [boxCharge=0]    - fixed box/handling charge in GBP
 * @returns {{
 *   totalDispatchCost: number,
 *   costPerGram: number,
 *   totalActualWeightGrams: number,
 *   items: Array<{name, weightGrams, quantity, itemDispatchCost, totalItemDispatchCost}>,
 *   totalAllocated: number
 * }}
 */
export function calculateDispatchCosts(products, chargedWeightKg, costPerKg, boxCharge = 0) {
  const totalDispatchCost = round4((chargedWeightKg * costPerKg) + boxCharge);

  const totalActualWeightGrams = products.reduce(
    (sum, p) => sum + (p.weightGrams || 0) * (p.quantity || 0),
    0,
  );

  if (totalActualWeightGrams === 0 || totalDispatchCost === 0) {
    return {
      totalDispatchCost,
      costPerGram: 0,
      totalActualWeightGrams: 0,
      items: products.map((p) => ({ ...p, itemDispatchCost: 0, totalItemDispatchCost: 0 })),
      totalAllocated: 0,
    };
  }

  const costPerGram = totalDispatchCost / totalActualWeightGrams;

  const items = products.map((p) => {
    const wg  = p.weightGrams || 0;
    const qty = p.quantity    || 0;
    const itemDispatchCost      = round4(wg  * costPerGram);
    const totalItemDispatchCost = round4(qty * itemDispatchCost);
    return { ...p, itemDispatchCost, totalItemDispatchCost };
  });

  const totalAllocated = round4(items.reduce((s, item) => s + item.totalItemDispatchCost, 0));

  return {
    totalDispatchCost,
    costPerGram: round4(costPerGram),
    totalActualWeightGrams,
    items,
    totalAllocated,
  };
}

const getWeightAllocation = (row, dispatchRows, dispatch) => {
  const itemWeightG = getWeightG(row);
  const totalShipmentChargesGbp = getShipmentChargesGbp(dispatch);

  // Actual total product weight (grams) — used to distribute the total cost proportionally.
  // Uses charged box weight only to derive the effective per-kg display rate.
  const totalActualWeightGrams = dispatchRows.reduce(
    (sum, item) => sum + getWeightG(item) * getQty(item),
    0,
  );

  // Charged/billed box weight: from the shipment record, then the UK→SL charge basis,
  // then fall back to total actual product weight.
  const headerBoxWeight = Number(dispatch?.dispatchBoxWeightKg ?? dispatch?.DispatchBoxWeightKg) || 0;
  const charges  = dispatch?.charges ?? dispatch?.Charges ?? [];
  const slCharge = charges.find((c) => (c.chargeType ?? c.ChargeType) === "uk_to_sri_lanka_courier");
  const chargeBoxWeight  = Number(slCharge?.basisAmount ?? slCharge?.BasisAmount) || 0;
  const dispatchBoxWeightKg = headerBoxWeight || chargeBoxWeight || (totalActualWeightGrams / 1000);

  // Display rate: what the courier effectively charged per kg of billed weight
  const effectivePerKgGbp = dispatchBoxWeightKg > 0
    ? round4(totalShipmentChargesGbp / dispatchBoxWeightKg)
    : 0;

  // (totalDispatchCost / totalDispatchWeight) × productWeight
  // Uses the charged dispatch weight so the rate is consistent with the displayed £/kg figure.
  // Falls back to actual product weight total when no box weight is recorded.
  const allocatedUnitGbp = dispatchBoxWeightKg > 0 && itemWeightG > 0
    ? round4((totalShipmentChargesGbp / dispatchBoxWeightKg) * (itemWeightG / 1000))
    : 0;

  return {
    allocatedUnitGbp,
    effectivePerKgGbp,
    totalShipmentChargesGbp,
    totalShipmentWeightKg: round4(dispatchBoxWeightKg),
  };
};

// ── Primitives ────────────────────────────────────────────────────────────────
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

const Pill = ({ value, label, tone = "slate" }) => {
  const tones = {
    slate:   "bg-slate-100 text-slate-700",
    teal:    "bg-teal-50   text-teal-800",
    indigo:  "bg-indigo-50 text-indigo-800",
    amber:   "bg-amber-50  text-amber-800",
    emerald: "bg-emerald-50 text-emerald-800",
    red:     "bg-red-50    text-red-700",
  };
  return (
    <div className={`rounded-2xl px-3 py-2.5 ${tones[tone]}`}>
      <p className="text-[10px] font-semibold uppercase tracking-widest opacity-60 mb-0.5">{label}</p>
      <p className="text-sm font-bold">{value}</p>
    </div>
  );
};

// ── MarginInput: toggle between % and fixed amount ───────────────────────────
function MarginInput({ mode, value, onModeChange, onValueChange, placeholder = "" }) {
  return (
    <div className="flex gap-2">
      <div className="flex rounded-xl border border-slate-200 overflow-hidden shrink-0">
        {[["percent", "%"], ["amount", "LKR"]].map(([m, label]) => (
          <button
            key={m}
            type="button"
            onClick={() => onModeChange(m)}
            className={`px-3 py-2 text-xs font-semibold transition ${
              mode === m ? "bg-tenzy-teal text-white" : "bg-slate-50 text-slate-500 hover:bg-slate-100"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <Input
        type="number"
        min="0"
        step={mode === "percent" ? "0.1" : "1"}
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        placeholder={placeholder || (mode === "percent" ? "e.g. 30" : "e.g. 500")}
      />
    </div>
  );
}

const STATUS_META = {
  pending_price_approval: { label: "Pending approval",       badge: "bg-amber-100 text-amber-700" },
  draft:                  { label: "Draft",                  badge: "bg-slate-100 text-slate-600" },
  pending_activation:     { label: "Ready to activate",      badge: "bg-blue-100  text-blue-700" },
  awaiting_stock_depletion: { label: "Waiting current stock",badge: "bg-violet-100 text-violet-700" },
  applied_live:           { label: "Live",                   badge: "bg-emerald-100 text-emerald-700" },
};
const getStatus = (s) => STATUS_META[s] ?? { label: s || "Pending", badge: "bg-slate-100 text-slate-600" };

const APPLICATION_MODES = [
  { value: "merge_into_live",      label: "Merge into live stock now",        description: "Adds quantity to current stock and updates the live price immediately." },
  { value: "wait_for_current_stock", label: "Wait until current stock finishes", description: "Holds this batch off the website until old stock reaches zero." },
];

const emptyForm = {
  pricingId: "",
  arrivalItemId: "",
  wrappingChargesGbp: "0.50",
  otherChargesGbp:    "0.50",
  customTaxGbp:             "0",
  includeCustomsClearance:  false,
  wholesaleMarginMode:  "percent",
  wholesaleMarginValue: "",
  wholesalePriceLkr: "",
  websiteMarginMode:  "percent",
  websiteMarginValue: "15",
  websitePriceLkr: "",
  discountMode: "none",
  customerDiscountPercent: "",
  customerDiscountAmount:  "",
  pricingNotes:   "",
  isApproved:     true,
  applicationMode: "merge_into_live",
};

export default function PricingManagement() {
  const [eligible,     setEligible]     = useState([]);
  const [pricingRows,  setPricingRows]  = useState([]);
  const [dispatches,   setDispatches]   = useState([]);
  const [products,     setProducts]     = useState([]);
  const [procurementDetails, setProcurementDetails] = useState([]);
  const [dispatchReportRows, setDispatchReportRows] = useState([]);
  const [form,         setForm]         = useState(emptyForm);
  const [lkrRate,      setLkrRate]      = useState("");
  const [loading,      setLoading]      = useState(true);
  const [saving,       setSaving]       = useState(false);
  const [activatingId, setActivatingId] = useState(null);
  const [activeTab,    setActiveTab]    = useState("pending"); // "pending" | "live" | "report"
  const [error,        setError]        = useState("");

  const load = async () => {
    const [e, p, d, productList, procurementList, dispatchReport] = await Promise.all([
      supplyChainApi.getEligiblePricing(),
      supplyChainApi.getPricing(),
      supplyChainApi.getDispatches(),
      productsApi.getAllAdmin().catch(() => []),
      supplyChainApi.getProcurements().catch(() => []),
      supplyChainApi.getDispatchReport().catch(() => []),
    ]);
    const procurementDetailList = await Promise.all(
      (procurementList ?? []).map((purchase) =>
        supplyChainApi.getProcurementById(purchase.procurementId).catch(() => null)
      )
    );
    setEligible(e ?? []);
    setPricingRows(p ?? []);
    setDispatches(d ?? []);
    setProducts(productList ?? []);
    setProcurementDetails(procurementDetailList.filter(Boolean));
    setDispatchReportRows(dispatchReport ?? []);
  };

  useEffect(() => { load().finally(() => setLoading(false)); }, []);

  const lkrRateNum = Number(lkrRate) || 0;
  const productWeightById = useMemo(
    () => new Map((products ?? []).map((product) => [String(getProductId(product)), getWeightG(product)])),
    [products]
  );
  const purchaseCostByKey = useMemo(() => {
    const map = new Map();
    procurementDetails.forEach((purchase) => {
      (purchase.items ?? []).forEach((item) => {
        const cost = getPurchaseCostGbp(item);
        if (!cost) return;
        const procurementItemId = getProcurementItemId(item);
        if (procurementItemId != null) map.set(`procurement:${procurementItemId}`, cost);
      });
    });
    return map;
  }, [procurementDetails]);
  const dispatchCostByKey = useMemo(() => {
    const map = new Map();
    dispatchReportRows.forEach((row) => {
      const cost = getReportUnitCostGbp(row);
      if (!cost) return;
      const dispatchRef = row.dispatchReference ?? row.DispatchReference;
      const procurementItemId = getProcurementItemId(row);
      const productName = getProductName(row);
      if (procurementItemId != null) map.set(`procurement:${procurementItemId}`, cost);
      if (dispatchRef && productName) map.set(`dispatch-product:${dispatchRef}:${productName}`, cost);
    });
    return map;
  }, [dispatchReportRows]);
  const withProductWeightFallback = (row) => {
    const productId = getProductId(row);
    const fallbackWeight = productId != null ? productWeightById.get(String(productId)) : 0;
    return getWeightG(row) > 0 || !fallbackWeight ? row : { ...row, productWeight: fallbackWeight };
  };
  const withPurchaseCostFallback = (row) => {
    if (getPurchaseCostGbp(row) > 0) return row;
    const procurementItemId = getProcurementItemId(row);
    const productName = getProductName(row);
    const dispatchRef = row.dispatchReference ?? row.DispatchReference;
    const fallbackCost =
      (procurementItemId != null ? dispatchCostByKey.get(`procurement:${procurementItemId}`) : 0) ||
      (dispatchRef && productName ? dispatchCostByKey.get(`dispatch-product:${dispatchRef}:${productName}`) : 0) ||
      (procurementItemId != null ? purchaseCostByKey.get(`procurement:${procurementItemId}`) : 0);
    return fallbackCost ? { ...row, purchaseCostGbp: fallbackCost } : row;
  };
  const enrichRow = (row) => withPurchaseCostFallback(withProductWeightFallback(row));

  // ── Queue groupings ──────────────────────────────────────────────────────────
  const eligibleRows = useMemo(() => eligible.map(enrichRow), [eligible, productWeightById, purchaseCostByKey, dispatchCostByKey]);
  const pricingRowsWithWeights = useMemo(() => pricingRows.map(enrichRow), [pricingRows, productWeightById, purchaseCostByKey, dispatchCostByKey]);
  const pendingRows = useMemo(() => eligibleRows.filter((r) => r.pricingReviewStatus !== "applied_live"), [eligibleRows]);
  const liveRows    = useMemo(() => pricingRowsWithWeights.filter((r) => r.pricingReviewStatus === "applied_live"), [pricingRowsWithWeights]);
  const pricingSourceRows = useMemo(() => {
    const rowsByArrivalItem = new Map();
    [...eligibleRows, ...pricingRowsWithWeights].forEach((row) => {
      const key = String(row.arrivalItemId ?? `${row.dispatchReference}-${row.productName}`);
      rowsByArrivalItem.set(key, { ...(rowsByArrivalItem.get(key) ?? {}), ...row });
    });
    return [...rowsByArrivalItem.values()];
  }, [eligibleRows, pricingRowsWithWeights]);

  const groupByDispatch = (rows, dispatchList) =>
    [...new Map(rows.map((r) => [r.dispatchReference, r])).keys()]
      .map((ref) => {
        const items = rows.filter((r) => r.dispatchReference === ref);
        const dispatch = dispatchList.find((d) => d.dispatchReference === ref);
        return {
          dispatchRef: ref,
          items,
          dispatch,
          totalQty:    items.reduce((s, r) => s + (Number(r.approvedQuantity) || 0), 0),
          pricedCount: items.filter((r) => r.pricingId && r.pricingReviewStatus !== "pending_price_approval").length,
        };
      });

  const pendingByDispatch = useMemo(() => groupByDispatch(pendingRows, dispatches), [pendingRows, dispatches]);
  const liveByDispatch    = useMemo(() => groupByDispatch(liveRows,    dispatches), [liveRows,    dispatches]);
  const reportByDispatch  = useMemo(() => groupByDispatch(pricingRowsWithWeights, dispatches), [pricingRowsWithWeights, dispatches]);

  // ── Selected item ────────────────────────────────────────────────────────────
  const selectedEligible   = useMemo(() => eligibleRows.find((r)    => String(r.arrivalItemId) === String(form.arrivalItemId)), [eligibleRows, form.arrivalItemId]);
  const selectedDispatch = useMemo(
    () => dispatches.find((d) => d.dispatchReference === selectedEligible?.dispatchReference),
    [dispatches, selectedEligible?.dispatchReference]
  );
  // Use eligibleRows as the weight-allocation source: spSupplyPricing_GetEligible returns every
  // current approved arrival item for the dispatch (pending, live, awaiting). pricingSourceRows
  // merges in saved pricing records which can include stale/old arrival items that inflate the
  // total weight denominator and produce wrong per-item freight.
  const selectedDispatchRows = useMemo(
    () => eligibleRows.filter((r) => r.dispatchReference === selectedEligible?.dispatchReference),
    [eligibleRows, selectedEligible?.dispatchReference]
  );

  // ── Cost calculations ────────────────────────────────────────────────────────
  const weightG  = getWeightG(selectedEligible);
  const weightKg = weightG / 1000;
  const procurementCostGbp = getPurchaseCostGbp(selectedEligible);
  const selectedFreight = getWeightAllocation(selectedEligible, selectedDispatchRows, selectedDispatch);

  const ukShippingGbp  = selectedFreight.allocatedUnitGbp;
  const customsGbp     = form.includeCustomsClearance ? round2(weightKg * CUSTOMS_PER_KG) : 0;
  const customTaxGbp   = round2(Number(form.customTaxGbp) || 0);
  const wrappingGbp    = round2(Number(form.wrappingChargesGbp) || 0);
  const otherGbp       = round2(Number(form.otherChargesGbp)    || 0);
  const logisticsCostGbp = round2(ukShippingGbp + customsGbp + customTaxGbp + wrappingGbp + otherGbp);
  const totalUnitCostGbp = round2(procurementCostGbp + logisticsCostGbp);
  const totalUnitCostLkr = lkrRateNum > 0 ? Math.round(totalUnitCostGbp * lkrRateNum) : null;

  const calcMargin = (base, mode, value) => {
    if (base === null) return null;
    const v = Number(value) || 0;
    if (mode === "percent") return Math.round(base * (1 + v / 100));
    return Math.round(base + v);
  };
  const suggestedWholesalePriceLkr = calcMargin(totalUnitCostLkr, form.wholesaleMarginMode, form.wholesaleMarginValue);
  const wholesalePriceLkr = form.wholesalePriceLkr !== "" ? Math.round(Number(form.wholesalePriceLkr) || 0) : suggestedWholesalePriceLkr;
  const suggestedWebsitePriceLkr = calcMargin(wholesalePriceLkr, form.websiteMarginMode,  form.websiteMarginValue);
  const websitePriceLkr   = form.websitePriceLkr !== "" ? Math.round(Number(form.websitePriceLkr) || 0) : suggestedWebsitePriceLkr;

  let finalPriceLkr = websitePriceLkr;
  if (websitePriceLkr !== null) {
    if (form.discountMode === "percent")
      finalPriceLkr = Math.max(Math.round(websitePriceLkr * (1 - (Number(form.customerDiscountPercent) || 0) / 100)), 0);
    else if (form.discountMode === "amount")
      finalPriceLkr = Math.max(websitePriceLkr - (Number(form.customerDiscountAmount) || 0), 0);
  }

  const websitePriceGbp = lkrRateNum > 0 && websitePriceLkr ? round2(websitePriceLkr / lkrRateNum) : null;
  const finalPriceGbp   = lkrRateNum > 0 && finalPriceLkr   ? round2(finalPriceLkr   / lkrRateNum) : null;
  const markupPct = totalUnitCostLkr && totalUnitCostLkr > 0 && websitePriceLkr
    ? round2((websitePriceLkr - totalUnitCostLkr) / totalUnitCostLkr * 100) : null;
  const marginPct = websitePriceLkr && websitePriceLkr > 0 && totalUnitCostLkr
    ? round2((websitePriceLkr - totalUnitCostLkr) / websitePriceLkr * 100) : null;

  const isWholesaleBelowCost = wholesalePriceLkr !== null && totalUnitCostLkr !== null && wholesalePriceLkr < totalUnitCostLkr;
  const isWebsiteBelowCost = websitePriceLkr !== null && totalUnitCostLkr !== null && websitePriceLkr < totalUnitCostLkr;
  const isFinalBelowCost = finalPriceLkr !== null && totalUnitCostLkr !== null && finalPriceLkr < totalUnitCostLkr;
  const isWebsiteBelowWholesale = websitePriceLkr !== null && wholesalePriceLkr !== null && websitePriceLkr < wholesalePriceLkr;
  const websiteNeedsBelowCostReason = isWebsiteBelowCost || isFinalBelowCost;
  const hasActiveDiscount = (form.discountMode === "percent" && Number(form.customerDiscountPercent) > 0)
    || (form.discountMode === "amount" && Number(form.customerDiscountAmount) > 0);

  // ── Select item ──────────────────────────────────────────────────────────────
  const selectItem = (arrivalItemId) => {
    const row = eligibleRows.find((r) => String(r.arrivalItemId) === String(arrivalItemId));
    const pr  = pricingRowsWithWeights.find((r) => String(r.arrivalItemId) === String(arrivalItemId));
    if (!row) { setForm(emptyForm); return; }
    setForm({
      pricingId:             pr?.pricingId ?? "",
      arrivalItemId:         String(row.arrivalItemId),
      wrappingChargesGbp:    pr?.wrappingPerUnit != null ? String(pr.wrappingPerUnit) : "0.50",
      otherChargesGbp:       pr?.otherChargesPerUnit != null ? String(pr.otherChargesPerUnit) : "0.50",
      customTaxGbp:             pr?.customTaxGbp != null ? String(pr.customTaxGbp) : "0",
      includeCustomsClearance:  pr?.includesCustomsClearance ?? false,
      wholesaleMarginMode:   pr?.wholesaleMarginMode ?? "percent",
      wholesaleMarginValue:  pr?.wholesaleMarginValue != null ? String(pr.wholesaleMarginValue) : "",
      wholesalePriceLkr:     pr?.wholesalePrice != null ? String(pr.wholesalePrice) : "",
      websiteMarginMode:     pr?.websiteMarginMode ?? "percent",
      websiteMarginValue:    pr?.websiteMarginValue != null ? String(pr.websiteMarginValue) : "15",
      websitePriceLkr:       pr?.sellingPrice != null ? String(pr.sellingPrice) : "",
      discountMode:          (pr?.customerDiscountPercent > 0 ? "percent" : pr?.customerDiscountAmount > 0 ? "amount" : "none"),
      customerDiscountPercent: pr?.customerDiscountPercent > 0 ? String(pr.customerDiscountPercent) : "",
      customerDiscountAmount:  pr?.customerDiscountAmount  > 0 ? String(pr.customerDiscountAmount)  : "",
      pricingNotes:          pr?.pricingNotes ?? "",
      isApproved:            pr?.isApproved    ?? true,
      applicationMode:       pr?.applicationMode ?? "merge_into_live",
    });
    if (pr?.exchangeRateGbpToLkr && !lkrRate) setLkrRate(String(pr.exchangeRateGbpToLkr));
    setError("");
  };

  // ── Save ─────────────────────────────────────────────────────────────────────
  const save = async () => {
    if (!form.arrivalItemId || saving) return;
    if (!lkrRateNum) { setError("Enter the GBP → LKR exchange rate before saving."); return; }
    if (!weightG)    { setError("Product has no weight set. Edit the product to add a weight."); return; }
    if (!selectedFreight.totalShipmentChargesGbp) { setError("Add shipment charges in Dispatch before saving pricing."); return; }
    if (!selectedFreight.totalShipmentWeightKg) { setError("This dispatch cannot be allocated because its products have no total weight."); return; }
    if (wholesalePriceLkr === null || wholesalePriceLkr <= 0) { setError("Enter a wholesale price before saving."); return; }
    if (websitePriceLkr === null || websitePriceLkr <= 0) { setError("Enter a website price before saving."); return; }
    if (isWholesaleBelowCost) {
      setError(`Wholesale price cannot be below total unit cost (${fmtLkr(totalUnitCostLkr)}).`);
      return;
    }
    if (websiteNeedsBelowCostReason) {
      setError(`Website price cannot be below total unit cost (${fmtLkr(totalUnitCostLkr)}).`);
      return;
    }
    setError("");
    setSaving(true);
    try {
      await supplyChainApi.savePricing({
        pricingId:               form.pricingId ? Number(form.pricingId) : undefined,
        arrivalItemId:           Number(form.arrivalItemId),
        sellingPrice:            websitePriceLkr ?? 0,
        customerDiscountPercent: form.discountMode === "percent" ? Number(form.customerDiscountPercent || 0) : 0,
        customerDiscountAmount:  form.discountMode === "amount"  ? Number(form.customerDiscountAmount  || 0) : 0,
        wholesalePrice:          wholesalePriceLkr,
        landingCostGbp:          round4(logisticsCostGbp),
        landingCostLkr:          lkrRateNum > 0 ? Math.round(logisticsCostGbp * lkrRateNum) : null,
        courierPerKgUk:          selectedFreight.effectivePerKgGbp,
        wrappingPerUnit:         Number(form.wrappingChargesGbp) || 0,
        otherChargesPerUnit:     Number(form.otherChargesGbp)    || 0,
        customTaxGbp:              Number(form.customTaxGbp) || 0,
        includesCustomsClearance:  form.includeCustomsClearance,
        wholesaleMarginMode:     form.wholesaleMarginMode,
        wholesaleMarginValue:    Number(form.wholesaleMarginValue) || 0,
        websiteMarginMode:       form.websiteMarginMode,
        websiteMarginValue:      Number(form.websiteMarginValue)   || 0,
        exchangeRateGbpToLkr:    lkrRateNum,
        pricingNotes:            form.pricingNotes || null,
        isApproved:              form.isApproved,
        applicationMode:         form.applicationMode,
      });
      await load();
      setForm(emptyForm);
      setError("");
    } catch (err) {
      setError(err.message || "Failed to save pricing.");
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
    } finally { setActivatingId(null); }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 rounded-full border-4 border-tenzy-teal/30 border-t-tenzy-teal animate-spin" />
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Pricing Management</h1>
          <p className="mt-1 text-sm text-slate-500">Calculate landed costs, set wholesale and website prices, then release batches to live stock.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700">{pendingRows.length} pending</span>
          <span className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">{liveRows.length} live</span>
        </div>
      </div>

      {/* Exchange rate — sticky banner */}
      <div className="rounded-2xl border border-slate-200 bg-white px-5 py-3 flex flex-wrap items-center gap-4 shadow-sm">
        <div className="flex items-center gap-2 shrink-0">
          <BadgePoundSterling size={16} className="text-tenzy-teal" />
          <span className="text-sm font-semibold text-slate-700">Exchange rate</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500">1 GBP =</span>
          <input
            type="number" min="1" step="0.01" value={lkrRate}
            onChange={(e) => setLkrRate(e.target.value)}
            placeholder="e.g. 350"
            className="w-28 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm outline-none focus:border-tenzy-teal focus:ring-2 focus:ring-tenzy-teal/20"
          />
          <span className="text-sm text-slate-500">LKR</span>
        </div>
        <div className="ml-auto flex items-center gap-3 text-xs text-slate-400">
          <span>Customs: £{CUSTOMS_PER_KG}/kg</span>
          {!lkrRateNum && <span className="flex items-center gap-1 text-amber-600"><AlertCircle size={12} /> Enter exchange rate to enable pricing</span>}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {[
          { id: "pending", label: "Pending Queue",   count: pendingRows.length,  icon: Clock3 },
          { id: "live",    label: "Live Prices",      count: liveRows.length,     icon: CheckCircle },
          { id: "report",  label: "Cost Report",      count: pricingRows.length,  icon: BarChart3 },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition ${
              activeTab === tab.id
                ? "bg-tenzy-teal text-white shadow-lg shadow-tenzy-teal/20"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            <tab.icon size={14} />
            {tab.label}
            <span className={`rounded-full px-2 py-0.5 text-xs ${activeTab === tab.id ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* ── PENDING TAB ─────────────────────────────────────────────────────── */}
      {activeTab === "pending" && (
        <div className="grid gap-5 2xl:grid-cols-[minmax(0,1.55fr)_minmax(380px,0.75fr)] xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.8fr)]">
          {/* LEFT: Pricing form */}
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-5">
            <div className="flex items-center gap-2">
              <Percent size={16} className="text-tenzy-teal" />
              <h2 className="text-lg font-bold text-slate-900">Price this batch</h2>
              {form.arrivalItemId && selectedEligible && (
                <span className={`ml-auto rounded-full px-3 py-0.5 text-xs font-semibold ${getStatus(selectedEligible.pricingReviewStatus).badge}`}>
                  {getStatus(selectedEligible.pricingReviewStatus).label}
                </span>
              )}
            </div>

            {/* Item selector */}
            <div>
              <Label>Select item from pricing queue</Label>
              <Select value={form.arrivalItemId} onChange={(e) => selectItem(e.target.value)}>
                <option value="">Choose an item to price…</option>
                {pendingByDispatch.map(({ dispatchRef, items }) => (
                  <optgroup key={dispatchRef} label={`${dispatchRef}  (${items.length} item${items.length !== 1 ? "s" : ""})`}>
                    {items.map((row) => (
                      <option key={row.arrivalItemId} value={row.arrivalItemId}>
                        {row.productName} · qty {row.approvedQuantity} · {getStatus(row.pricingReviewStatus).label}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </Select>
            </div>

            {selectedEligible && (
              <>
                {/* Product summary */}
                <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0">
                      <p className="font-bold text-slate-800 break-words leading-snug">{selectedEligible.productName}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{selectedEligible.brandName} · {selectedEligible.dispatchReference}</p>
                    </div>
                    <span className="shrink-0 rounded-xl bg-slate-200 text-slate-700 text-xs font-bold px-3 py-1">
                      qty {selectedEligible.approvedQuantity}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <span>UK purchase cost: <strong>{fmtGbp(procurementCostGbp)}</strong>/unit</span>
                    {weightG > 0 ? (
                      <span>Product weight: <strong>{weightG}g ({weightKg.toFixed(3)}kg)</strong></span>
                    ) : (
                      <span className="text-amber-600 font-semibold flex items-center gap-1"><AlertTriangle size={11} /> No weight on product</span>
                    )}
                    <span>Current live price: <strong>{fmtLkr(selectedEligible.currentSellingPrice)}</strong></span>
                    <span>Current live stock: <strong>{selectedEligible.currentStockQuantity}</strong></span>
                  </div>
                </div>

                {/* ── STEP 1: Logistics cost ──────────────────────── */}
                <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center shrink-0">1</span>
                    <h3 className="text-sm font-bold text-slate-800">Logistics cost (GBP)</h3>
                    <span className="ml-auto text-[10px] text-slate-400">Custom clearance £{CUSTOMS_PER_KG}/kg — tick to include</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="col-span-2 rounded-2xl border border-indigo-100 bg-white px-3 py-2.5 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold text-slate-500">Shipment freight</p>
                        <p className="text-sm font-bold text-slate-800">{fmtGbp(ukShippingGbp)}</p>
                      </div>
                      <p className="text-[10px] text-slate-400 text-right">
                        {selectedFreight.totalShipmentWeightKg > 0
                          ? `${fmtGbp(selectedFreight.effectivePerKgGbp)}/kg by batch weight`
                          : "Add product weights to allocate"}
                      </p>
                    </div>
                    <div>
                      <Label>Wrapping (GBP/unit)</Label>
                      <Input type="number" min="0" step="0.01" value={form.wrappingChargesGbp}
                        onChange={(e) => setForm({ ...form, wrappingChargesGbp: e.target.value })} placeholder="0.50" />
                    </div>
                    <div>
                      <Label>Other (GBP/unit)</Label>
                      <Input type="number" min="0" step="0.01" value={form.otherChargesGbp}
                        onChange={(e) => setForm({ ...form, otherChargesGbp: e.target.value })} placeholder="0.50" />
                    </div>
                    <div className="col-span-2">
                      <Label>Custom Tax (GBP/unit) — product-specific import duty or tax</Label>
                      <Input type="number" min="0" step="0.01" value={form.customTaxGbp}
                        onChange={(e) => setForm({ ...form, customTaxGbp: e.target.value })} placeholder="0" />
                    </div>
                  </div>

                  {weightG > 0 && (
                    <div className="rounded-xl bg-white border border-indigo-100 p-3 text-xs space-y-1.5 font-mono">
                      {[
                        ["Shipment freight", `${weightKg.toFixed(3)}kg/unit share of ${selectedFreight.totalShipmentWeightKg || 0}kg batch`, fmtGbp(ukShippingGbp)],
                        ["Custom Tax",      "product-specific tax per unit", fmtGbp(customTaxGbp)],
                        ["Wrapping",        "", fmtGbp(wrappingGbp)],
                        ["Other",           "", fmtGbp(otherGbp)],
                      ].map(([name, formula, val]) => (
                        <div key={name} className="flex items-center justify-between text-slate-600">
                          <span className="text-slate-500">{name}{formula ? <span className="ml-1 text-[10px] text-slate-400">({formula})</span> : ""}</span>
                          <span className="font-semibold">{val}</span>
                        </div>
                      ))}
                      <label className="flex items-center justify-between text-slate-600 cursor-pointer select-none">
                        <span className="flex items-center gap-2 text-slate-500">
                          <input
                            type="checkbox"
                            checked={form.includeCustomsClearance}
                            onChange={(e) => setForm({ ...form, includeCustomsClearance: e.target.checked })}
                            className="rounded"
                          />
                          Custom Clearance
                          <span className="text-[10px] text-slate-400">({weightG}g ÷ 1000 × £{CUSTOMS_PER_KG}/kg)</span>
                        </span>
                        <span className="font-semibold">{form.includeCustomsClearance ? fmtGbp(customsGbp) : "—"}</span>
                      </label>
                      <div className="border-t border-indigo-100 pt-1.5 flex items-center justify-between font-bold text-indigo-800">
                        <span>Logistics total</span>
                        <span>{fmtGbp(logisticsCostGbp)}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* ── STEP 2: Total unit cost ─────────────────────── */}
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-2">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-5 h-5 rounded-full bg-slate-600 text-white text-xs font-bold flex items-center justify-center shrink-0">2</span>
                    <h3 className="text-sm font-bold text-slate-800">Total unit cost</h3>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <Pill label="UK purchase" value={fmtGbp(procurementCostGbp)} tone="slate" />
                    <Pill label="+ Logistics"  value={fmtGbp(logisticsCostGbp)}   tone="indigo" />
                    <Pill label="= Total (GBP)" value={fmtGbp(totalUnitCostGbp)}  tone="slate" />
                  </div>
                  {totalUnitCostLkr !== null ? (
                    <div className="rounded-xl bg-slate-200/60 px-4 py-2.5 flex items-center justify-between">
                      <span className="text-xs text-slate-500">Total unit cost in LKR (÷ {lkrRateNum} rate)</span>
                      <span className="text-base font-bold text-slate-800">{fmtLkr(totalUnitCostLkr)}</span>
                    </div>
                  ) : (
                    <p className="text-xs text-amber-600 flex items-center gap-1"><AlertCircle size={12} /> Enter exchange rate to see LKR equivalent.</p>
                  )}
                </div>

                {/* ── STEP 3: Wholesale price ─────────────────────── */}
                <div className="rounded-2xl border border-amber-100 bg-amber-50/40 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-xs font-bold flex items-center justify-center shrink-0">3</span>
                    <h3 className="text-sm font-bold text-slate-800">Wholesale price</h3>
                    {wholesalePriceLkr !== null && (
                      <span className={`ml-auto text-sm font-bold ${isWholesaleBelowCost ? "text-red-600" : "text-amber-700"}`}>
                        {fmtLkr(wholesalePriceLkr)}
                      </span>
                    )}
                  </div>
                  <div>
                    <Label>Profit margin on total unit cost</Label>
                      <MarginInput
                        mode={form.wholesaleMarginMode}
                        value={form.wholesaleMarginValue}
                      onModeChange={(m) => setForm({ ...form, wholesaleMarginMode: m, wholesaleMarginValue: "", wholesalePriceLkr: "" })}
                      onValueChange={(v) => setForm({ ...form, wholesaleMarginValue: v, wholesalePriceLkr: "" })}
                    />
                  </div>
                  <div>
                    <Label>Wholesale price (LKR)</Label>
                    <Input
                      type="number"
                      min={totalUnitCostLkr ?? 0}
                      step="1"
                      value={form.wholesalePriceLkr !== "" ? form.wholesalePriceLkr : suggestedWholesalePriceLkr ?? ""}
                      onChange={(e) => setForm({ ...form, wholesalePriceLkr: e.target.value })}
                      onBlur={(e) => {
                        if (totalUnitCostLkr !== null) {
                          const val = Math.round(Number(e.target.value) || 0);
                          if (val > 0 && val < totalUnitCostLkr) {
                            setForm({ ...form, wholesalePriceLkr: String(totalUnitCostLkr) });
                          }
                        }
                      }}
                    />
                    {totalUnitCostLkr !== null && (
                      <p className="mt-1 text-[11px] text-slate-500">Min: {fmtLkr(totalUnitCostLkr)}</p>
                    )}
                    {form.wholesalePriceLkr !== "" && suggestedWholesalePriceLkr !== null && (
                      <button type="button" onClick={() => setForm({ ...form, wholesalePriceLkr: "" })} className="mt-1 text-[11px] font-semibold text-amber-700 hover:text-amber-900">
                        Use calculated {fmtLkr(suggestedWholesalePriceLkr)}
                      </button>
                    )}
                  </div>

                  {wholesalePriceLkr !== null && totalUnitCostLkr !== null && (
                    <p className="text-xs text-amber-700">
                      Total cost {fmtLkr(totalUnitCostLkr)} + {form.wholesaleMarginMode === "percent" ? `${form.wholesaleMarginValue || 0}%` : fmtLkr(form.wholesaleMarginValue || 0)} margin = <strong>{fmtLkr(wholesalePriceLkr)}</strong>
                    </p>
                  )}
                </div>

                {/* ── STEP 4: Website price ───────────────────────── */}
                <div className="rounded-2xl border border-teal-100 bg-teal-50/30 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-tenzy-teal text-white text-xs font-bold flex items-center justify-center shrink-0">4</span>
                    <h3 className="text-sm font-bold text-slate-800">Website price</h3>
                    {websitePriceLkr !== null && (
                      <span className="ml-auto text-sm font-bold text-teal-700">{fmtLkr(websitePriceLkr)}</span>
                    )}
                  </div>
                  <div>
                    <Label>Profit margin on website price</Label>
                      <MarginInput
                        mode={form.websiteMarginMode}
                        value={form.websiteMarginValue}
                      onModeChange={(m) => setForm({ ...form, websiteMarginMode: m, websiteMarginValue: "", websitePriceLkr: "" })}
                      onValueChange={(v) => setForm({ ...form, websiteMarginValue: v, websitePriceLkr: "" })}
                    />
                  </div>
                  <div>
                    <Label>Website price {hasActiveDiscount ? "(after discount — edit to clear)" : "(LKR)"}</Label>
                    <Input
                      type="number"
                      min={totalUnitCostLkr ?? 0}
                      step="1"
                      value={hasActiveDiscount && finalPriceLkr !== null
                        ? finalPriceLkr
                        : form.websitePriceLkr !== "" ? form.websitePriceLkr : suggestedWebsitePriceLkr ?? ""}
                      onChange={(e) => {
                        const typed = e.target.value;
                        if (hasActiveDiscount) {
                          setForm({ ...form, websitePriceLkr: typed, discountMode: "none", customerDiscountPercent: "", customerDiscountAmount: "" });
                          return;
                        }
                        const typedNum = Math.round(Number(typed) || 0);
                        const baseForPct = wholesalePriceLkr;
                        let newMarginValue = form.websiteMarginValue;
                        if (typedNum > 0 && baseForPct && baseForPct > 0 && form.websiteMarginMode === "percent") {
                          newMarginValue = String(round2(((typedNum - baseForPct) / baseForPct) * 100));
                        } else if (typedNum > 0 && baseForPct && baseForPct > 0 && form.websiteMarginMode === "amount") {
                          newMarginValue = String(typedNum - baseForPct);
                        }
                        setForm({ ...form, websitePriceLkr: typed, websiteMarginValue: newMarginValue });
                      }}
                      onBlur={(e) => {
                        if (totalUnitCostLkr !== null && !hasActiveDiscount) {
                          const val = Math.round(Number(e.target.value) || 0);
                          if (val > 0 && val < totalUnitCostLkr) {
                            const baseForPct = wholesalePriceLkr;
                            let newMarginValue = form.websiteMarginValue;
                            if (baseForPct && baseForPct > 0 && form.websiteMarginMode === "percent") {
                              newMarginValue = String(round2(((totalUnitCostLkr - baseForPct) / baseForPct) * 100));
                            }
                            setForm({ ...form, websitePriceLkr: String(totalUnitCostLkr), websiteMarginValue: newMarginValue });
                          }
                        }
                      }}
                    />
                    {totalUnitCostLkr !== null && !hasActiveDiscount && (
                      <p className="mt-1 text-[11px] text-slate-500">Min: {fmtLkr(totalUnitCostLkr)}</p>
                    )}
                    {hasActiveDiscount && finalPriceLkr !== null && (
                      <p className="mt-1 text-[11px] text-teal-700">
                        {form.discountMode === "percent"
                          ? `${form.customerDiscountPercent}% discount applied on ${fmtLkr(websitePriceLkr)}`
                          : `${fmtLkr(Number(form.customerDiscountAmount))} off ${fmtLkr(websitePriceLkr)}`
                        } — type to override and remove discount
                      </p>
                    )}
                    {!hasActiveDiscount && form.websitePriceLkr !== "" && suggestedWebsitePriceLkr !== null && (
                      <button type="button" onClick={() => setForm({ ...form, websitePriceLkr: "" })} className="mt-1 text-[11px] font-semibold text-teal-700 hover:text-teal-900">
                        Use calculated {fmtLkr(suggestedWebsitePriceLkr)}
                      </button>
                    )}
                  </div>

                  {isWebsiteBelowWholesale && (
                    <p className="text-xs text-amber-700 flex items-center gap-1"><AlertTriangle size={12} /> Website price is below wholesale price.</p>
                  )}
                  {/* Customer discount */}
                  <div>
                    <Label>Customer discount</Label>
                    <div className="flex gap-2 mb-2">
                      {[{ v: "none", l: "None" }, { v: "percent", l: "%" }, { v: "amount", l: "LKR off" }].map(({ v, l }) => (
                        <button key={v} type="button"
                          onClick={() => setForm({ ...form, discountMode: v, customerDiscountPercent: "", customerDiscountAmount: "" })}
                          className={`flex-1 rounded-xl border px-2 py-1.5 text-xs font-semibold transition ${
                            form.discountMode === v ? "border-tenzy-teal bg-tenzy-teal/10 text-tenzy-teal" : "border-slate-200 bg-slate-50 text-slate-500"
                          }`}>{l}</button>
                      ))}
                    </div>
                    {form.discountMode === "percent" && (
                      <Input type="number" min="0" max="100" step="0.01" value={form.customerDiscountPercent}
                        onChange={(e) => setForm({ ...form, customerDiscountPercent: e.target.value })} placeholder="e.g. 10" />
                    )}
                    {form.discountMode === "amount" && (
                      <Input type="number" min="0" step="1" value={form.customerDiscountAmount}
                        onChange={(e) => setForm({ ...form, customerDiscountAmount: e.target.value })} placeholder="e.g. 500" />
                    )}
                  </div>

                  {/* Markup / margin / price summary */}
                  {websitePriceLkr !== null && (
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      <Pill label="Website (LKR)"  value={fmtLkr(websitePriceLkr)}  tone="teal" />
                      <Pill label="Final (LKR)"    value={fmtLkr(finalPriceLkr)}    tone="teal" />
                      <Pill label="Markup"  value={markupPct !== null ? `${markupPct}%` : "—"} tone={markupPct !== null && markupPct >= 0 ? "emerald" : "red"} />
                      <Pill label="Margin"  value={marginPct !== null ? `${marginPct}%` : "—"} tone={marginPct !== null && marginPct >= 0 ? "emerald" : "red"} />
                    </div>
                  )}
                  {websitePriceGbp !== null && (
                    <p className="text-xs text-slate-400 text-center">Website price ≈ {fmtGbp(websitePriceGbp)} · After discount ≈ {fmtGbp(finalPriceGbp)}</p>
                  )}
                </div>

                {/* ── STEP 5: Release settings ────────────────────── */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-400 text-white text-xs font-bold flex items-center justify-center shrink-0">5</span>
                    <h3 className="text-sm font-bold text-slate-800">Release settings</h3>
                  </div>
                  <div className="space-y-2">
                    {APPLICATION_MODES.map((mode) => (
                      <button key={mode.value} type="button" onClick={() => setForm({ ...form, applicationMode: mode.value })}
                        className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                          form.applicationMode === mode.value ? "border-tenzy-teal bg-tenzy-teal/5" : "border-slate-200 bg-slate-50"
                        }`}>
                        <p className="text-sm font-semibold text-slate-800">{mode.label}</p>
                        <p className="mt-0.5 text-xs text-slate-500">{mode.description}</p>
                      </button>
                    ))}
                  </div>
                  <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 cursor-pointer">
                    <input type="checkbox" checked={form.isApproved} onChange={(e) => setForm({ ...form, isApproved: e.target.checked })} />
                    Mark as approved
                  </label>
                  <div>
                    <Label>Pricing notes</Label>
                    <textarea rows={2} value={form.pricingNotes} onChange={(e) => setForm({ ...form, pricingNotes: e.target.value })}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-tenzy-teal focus:ring-2 focus:ring-tenzy-teal/20"
                      placeholder="Batch notes, promotional context, or reason for pricing decision" />
                  </div>
                </div>

                {error && (
                  <div className="rounded-2xl bg-red-50 border border-red-200 px-4 py-3 flex items-start gap-2 text-xs text-red-700">
                    <AlertCircle size={14} className="shrink-0 mt-0.5" />
                    {error}
                  </div>
                )}

                <button onClick={save} disabled={saving || !form.arrivalItemId || !websitePriceLkr}
                  className="w-full rounded-2xl bg-tenzy-teal px-4 py-3 text-sm font-semibold text-white disabled:opacity-60 hover:opacity-90 transition">
                  {saving ? "Saving…" : form.pricingId ? "Update pricing" : "Save pricing decision"}
                </button>
              </>
            )}
            {!form.arrivalItemId && (
              <div className="text-center py-10 text-slate-400">
                <Percent size={28} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">Select an item from the queue to start pricing.</p>
              </div>
            )}
          </div>

          {/* RIGHT: Pending queue grouped by dispatch */}
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <Clock3 size={16} className="text-violet-500" />
              <h2 className="text-lg font-bold text-slate-900">Pending queue</h2>
            </div>

            {pendingByDispatch.length === 0 && (
              <div className="text-center py-12 text-slate-400">
                <CheckCircle size={28} className="mx-auto mb-3 text-emerald-400" />
                <p className="text-sm font-semibold text-slate-600">All items priced</p>
                <p className="text-xs mt-1">No pending pricing items.</p>
              </div>
            )}

            {pendingByDispatch.map(({ dispatchRef, items, dispatch, totalQty, pricedCount }) => {
              const unpricedCount = items.length - pricedCount;
              const pct = items.length > 0 ? Math.round((pricedCount / items.length) * 100) : 0;
              return (
                <div key={dispatchRef} className="rounded-2xl border border-indigo-100 bg-indigo-50/40 overflow-hidden">
                  <div className="flex items-start justify-between gap-2 px-4 pt-3 pb-2.5 border-b border-indigo-100">
                    <div className="flex min-w-0 items-start gap-2">
                      <Package size={14} className="text-indigo-500 mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <p className="font-bold text-slate-800 text-sm break-words">{dispatchRef}</p>
                        <p className="text-xs text-slate-500 mt-0.5 break-words">
                          {dispatch ? <>{dispatch.courierName} · {dispatch.parcelNumber} · <span className="text-indigo-700 font-medium">{fmtGbp(dispatch.totalShipmentCharges)} charges</span></> : null}
                          {" · "}{totalQty} units
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${unpricedCount > 0 ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
                        {unpricedCount > 0 ? `${unpricedCount} need pricing` : "All priced"}
                      </span>
                      <div className="mt-1.5 w-20 h-1.5 rounded-full bg-indigo-100 overflow-hidden mx-auto">
                        <div className="h-full rounded-full bg-tenzy-teal transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <p className="mt-0.5 text-[10px] text-slate-400">{pricedCount}/{items.length}</p>
                    </div>
                  </div>
                  <div className="px-3 py-2.5 space-y-2">
                    {items.map((row) => {
                      const status = getStatus(row.pricingReviewStatus);
                      const rowWeightG = getWeightG(row);
                      const isSelected = String(form.arrivalItemId) === String(row.arrivalItemId);
                      const canActivate = row.pricingId && row.pricingReviewStatus === "awaiting_stock_depletion" && Number(row.currentStockQuantity || 0) <= 0;
                      return (
                        <div key={row.arrivalItemId} className={`rounded-xl border p-3 transition ${isSelected ? "border-tenzy-teal bg-tenzy-teal/5" : "border-white bg-white"}`}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-slate-800 break-words leading-snug">{row.productName}</p>
                              <p className="text-xs text-slate-500 mt-0.5">
                                qty <strong>{row.approvedQuantity}</strong> · cost <strong>{fmtGbp(getPurchaseCostGbp(row))}</strong>
                                {rowWeightG > 0 ? <> · {rowWeightG}g</> : <span className="text-amber-500"> · no weight</span>}
                              </p>
                            </div>
                            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${status.badge}`}>{status.label}</span>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            <button type="button" onClick={() => selectItem(row.arrivalItemId)}
                              className={`rounded-lg border px-2.5 py-1 text-xs font-semibold transition ${isSelected ? "border-tenzy-teal bg-tenzy-teal text-white" : "border-slate-200 bg-white text-slate-600 hover:border-tenzy-teal hover:text-tenzy-teal"}`}>
                              {isSelected ? "Selected ✓" : "Price this"}
                            </button>
                            {canActivate && (
                              <button type="button" onClick={() => activatePricing(row)} disabled={activatingId === row.pricingId}
                                className="rounded-lg bg-tenzy-teal px-2.5 py-1 text-xs font-semibold text-white disabled:opacity-60">
                                {activatingId === row.pricingId ? "…" : "Activate"}
                              </button>
                            )}
                          </div>
                          {row.pricingReviewStatus === "awaiting_stock_depletion" && Number(row.currentStockQuantity || 0) > 0 && (
                            <p className="mt-1.5 text-[10px] text-slate-400">Waiting — {row.currentStockQuantity} units still in live stock.</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── LIVE TAB ─────────────────────────────────────────────────────────── */}
      {activeTab === "live" && (
        <div className="space-y-5">
          {liveByDispatch.length === 0 && (
            <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
              <CheckCircle size={28} className="text-emerald-400 mx-auto mb-3" />
              <p className="font-semibold text-slate-700">No live pricing records yet</p>
              <p className="text-sm text-slate-400 mt-1">Activate pricing from the Pending Queue to see records here.</p>
            </div>
          )}
          {liveByDispatch.map(({ dispatchRef, items, dispatch }) => (
            <div key={dispatchRef} className="rounded-3xl border border-emerald-100 bg-white shadow-sm overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-3 bg-emerald-50/60 border-b border-emerald-100">
                <Package size={15} className="text-emerald-600" />
                <div>
                  <p className="font-bold text-slate-800 text-sm">{dispatchRef}</p>
                  {dispatch && <p className="text-xs text-slate-500">{dispatch.courierName} · {dispatch.parcelNumber}</p>}
                </div>
                <span className="ml-auto rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold px-3 py-0.5">{items.length} live item{items.length !== 1 ? "s" : ""}</span>
              </div>
              <div className="p-4 grid gap-3 sm:grid-cols-2">
                {items.map((row) => {
                  const sellLkr   = Number(row.sellingPrice) || 0;
                  const finalLkr  = Number(row.finalSellingPrice) || 0;
                  const sellGbp   = lkrRateNum > 0 ? round2(sellLkr / lkrRateNum) : null;
                  const finalGbp  = lkrRateNum > 0 ? round2(finalLkr / lkrRateNum) : null;
                  const wholesale = Number(row.wholesalePrice) || 0;
                  // Compute markup/margin correctly in LKR (landed cost LKR = netUnitCost*rate + landingCostLkr)
                  const rowRate    = Number(row.exchangeRateGbpToLkr) || lkrRateNum;
                  const rowProcure = getPurchaseCostGbp(row);
                  const rowCostLkr = rowRate > 0 && rowProcure > 0
                    ? Math.round(rowProcure * rowRate) + (Number(row.landingCostLkr) || 0)
                    : null;
                  const liveMarkup = rowCostLkr && rowCostLkr > 0 ? round2((finalLkr - rowCostLkr) / rowCostLkr * 100) : null;
                  const liveMargin = finalLkr > 0 && rowCostLkr ? round2((finalLkr - rowCostLkr) / finalLkr * 100) : null;
                  return (
                    <div key={row.pricingId} className="rounded-2xl border border-emerald-100 bg-emerald-50/30 p-4">
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-800 break-words leading-snug">{row.productName}</p>
                          <p className="text-xs text-slate-500">{row.brandName} · qty {row.approvedQuantity}</p>
                        </div>
                        <span className="rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold px-2 py-0.5">Live</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                        {wholesale > 0 && <span>Wholesale: <strong>{fmtLkr(wholesale)}</strong></span>}
                        <span>Website: <strong>{fmtLkr(sellLkr)}</strong>{sellGbp ? <span className="text-slate-400"> ≈ {fmtGbp(sellGbp)}</span> : ""}</span>
                        <span>Final: <strong>{fmtLkr(finalLkr)}</strong>{finalGbp ? <span className="text-slate-400"> ≈ {fmtGbp(finalGbp)}</span> : ""}</span>
                        <span className={liveMarkup !== null && liveMarkup < 0 ? "text-red-600 font-semibold" : ""}>
                          Markup: <strong>{liveMarkup !== null ? `${liveMarkup.toFixed(1)}%` : "—"}</strong>
                        </span>
                        <span className={liveMargin !== null && liveMargin < 0 ? "text-red-600 font-semibold" : ""}>
                          Margin: <strong>{liveMargin !== null ? `${liveMargin.toFixed(1)}%` : "—"}</strong>
                        </span>
                      </div>
                      {row.appliedToProductAtUtc && (
                        <p className="mt-2 text-[10px] text-slate-400">Applied {new Date(row.appliedToProductAtUtc).toLocaleDateString("en-GB")}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── REPORT TAB ───────────────────────────────────────────────────────── */}
      {activeTab === "report" && (
        <div className="space-y-5">
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-500 flex items-center gap-2">
            <AlertCircle size={13} className="text-indigo-400 shrink-0" />
            Cost breakdown is based on saved pricing data. Items without full cost data were priced before this feature was added.
          </div>

          {reportByDispatch.map(({ dispatchRef, items, dispatch }) => (
            <div key={dispatchRef} className="rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center gap-3 px-5 py-3 bg-slate-50 border-b border-slate-100 rounded-t-3xl">
                <Package size={15} className="text-indigo-500" />
                <div>
                  <p className="font-bold text-slate-800 text-sm">{dispatchRef}</p>
                  {dispatch && <p className="text-xs text-slate-400">{dispatch.courierName} · {dispatch.parcelNumber} · dispatched {new Date(dispatch.dispatchDate).toLocaleDateString("en-GB")}</p>}
                </div>
                <div className="ml-auto flex items-center gap-3 text-xs text-slate-500">
                  {dispatch && <span>{fmtGbp(dispatch.totalShipmentCharges)} dispatch charges</span>}
                  <span>{items.length} items</span>
                </div>
              </div>

              <div className="overflow-x-auto w-full">
                <table className="text-xs" style={{ minWidth: "1100px", width: "100%" }}>
                  <thead className="bg-slate-50 text-slate-400 uppercase tracking-wider border-b border-slate-100">
                    <tr>
                      {[
                        "Product", "Wt (g)",
                        "Procure £", "Freight £", "DHL (n/a)", "Clearance £", "Custom Tax £", "Wrap £", "Other £",
                        "Logistics £", "Total £", "Total LKR",
                        "Wholesale", "Website", "Final",
                        "Markup %", "Margin %",
                        "Status",
                      ].map((h) => (
                        <th key={h} className="px-2.5 py-2 text-left font-semibold whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {items.map((row) => {
                      const wg  = getWeightG(row);
                      const wkg = wg / 1000;
                      const wrapping  = round2(Number(row.wrappingPerUnit ?? 0));
                      const other     = round2(Number(row.otherChargesPerUnit ?? 0));
                      const freight   = getWeightAllocation(row, items, dispatch);
                      const ukShip    = freight.allocatedUnitGbp;
                      const customs   = (row.includesCustomsClearance ?? row.IncludesCustomsClearance) ? round2(wkg * CUSTOMS_PER_KG) : 0;
                      const customTax = round2(Number(row.customTaxGbp ?? 0));
                      const logistics = round2(ukShip + customs + customTax + wrapping + other);
                      const procure    = getPurchaseCostGbp(row);
                      const totalGbp   = round2(procure + logistics);
                      const rate       = Number(row.exchangeRateGbpToLkr) || 0;
                      const totalLkr   = rate > 0 ? Math.round(totalGbp * rate) : null;
                      const websiteLkr = Number(row.sellingPrice) || 0;
                      const markupPct  = totalLkr && totalLkr > 0 && websiteLkr > 0
                        ? round2((websiteLkr - totalLkr) / totalLkr * 100) : null;
                      const marginPct  = websiteLkr > 0 && totalLkr
                        ? round2((websiteLkr - totalLkr) / websiteLkr * 100) : null;
                      const status = getStatus(row.pricingReviewStatus);
                      return (
                        <tr key={row.pricingId} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-2.5 py-2 font-medium text-slate-800 min-w-[220px] max-w-[340px] whitespace-normal break-words leading-snug">{row.productName}</td>
                          <td className="px-2.5 py-2 text-slate-600 whitespace-nowrap">{wg || "—"}</td>
                          <td className="px-2.5 py-2 text-slate-600 whitespace-nowrap">{fmtGbp(procure)}</td>
                          <td className="px-2.5 py-2 text-indigo-600 whitespace-nowrap">{freight.effectivePerKgGbp > 0 ? fmtGbp(ukShip) : "—"}</td>
                          <td className="px-2.5 py-2 text-slate-400 whitespace-nowrap">—</td>
                          <td className="px-2.5 py-2 text-indigo-600 whitespace-nowrap">{wg > 0 ? fmtGbp(customs) : "—"}</td>
                          <td className="px-2.5 py-2 text-amber-600 whitespace-nowrap">{customTax > 0 ? fmtGbp(customTax) : "—"}</td>
                          <td className="px-2.5 py-2 text-slate-500 whitespace-nowrap">{wrapping > 0 ? fmtGbp(wrapping) : "—"}</td>
                          <td className="px-2.5 py-2 text-slate-500 whitespace-nowrap">{other > 0 ? fmtGbp(other) : "—"}</td>
                          <td className="px-2.5 py-2 font-semibold text-indigo-700 whitespace-nowrap">{logistics > 0 ? fmtGbp(logistics) : "—"}</td>
                          <td className="px-2.5 py-2 font-bold text-slate-800 whitespace-nowrap">{totalGbp > 0 ? fmtGbp(totalGbp) : "—"}</td>
                          <td className="px-2.5 py-2 text-slate-700 font-semibold whitespace-nowrap">{totalLkr ? fmtLkr(totalLkr) : "—"}</td>
                          <td className="px-2.5 py-2 font-semibold text-amber-700 whitespace-nowrap">{row.wholesalePrice ? fmtLkr(row.wholesalePrice) : "—"}</td>
                          <td className="px-2.5 py-2 font-semibold text-teal-700 whitespace-nowrap">{row.sellingPrice ? fmtLkr(row.sellingPrice) : "—"}</td>
                          <td className="px-2.5 py-2 font-bold text-slate-800 whitespace-nowrap">{row.finalSellingPrice ? fmtLkr(row.finalSellingPrice) : "—"}</td>
                          <td className={`px-2.5 py-2 font-semibold whitespace-nowrap ${markupPct === null ? "text-slate-400" : markupPct >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                            {markupPct !== null ? `${markupPct.toFixed(1)}%` : "—"}
                          </td>
                          <td className={`px-2.5 py-2 font-semibold whitespace-nowrap ${marginPct === null ? "text-slate-400" : marginPct >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                            {marginPct !== null ? `${marginPct.toFixed(1)}%` : "—"}
                          </td>
                          <td className="px-2.5 py-2 whitespace-nowrap"><span className={`rounded-full px-2 py-0.5 font-semibold ${status.badge}`}>{status.label}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          {reportByDispatch.length === 0 && (
            <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
              <BarChart3 size={28} className="text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-400">No pricing records to report yet.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
