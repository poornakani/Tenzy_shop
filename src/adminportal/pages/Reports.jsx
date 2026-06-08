import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Archive, BarChart2, Calendar, ChevronDown, ChevronLeft, ChevronRight,
  ChevronUp, CreditCard, Download, Eye, Package, RefreshCw,
  ShoppingBag, Truck, TrendingUp, X,
} from "lucide-react";
import {
  BarChart, Bar, Cell, CartesianGrid, Legend, PieChart, Pie,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { supplyChainApi } from "../../services/api";
import { downloadSimplePdf } from "../utils/simplePdf";

/* ── constants ───────────────────────────────────────────────────────────── */
const PAGE_SIZE = 15;
const COLORS = ["#0d9488","#f59e0b","#6366f1","#ef4444","#10b981","#8b5cf6","#ec4899","#14b8a6","#f97316","#3b82f6"];

const DISPATCH_STATUS_BADGE = {
  dispatched: "bg-blue-100 text-blue-700",
  partially_dispatched: "bg-amber-100 text-amber-700",
  pending_dispatch: "bg-slate-100 text-slate-500",
  received:   "bg-emerald-100 text-emerald-700",
  pending:    "bg-amber-100 text-amber-700",
  not_dispatched: "bg-slate-100 text-slate-500",
};

/* ── helpers ─────────────────────────────────────────────────────────────── */
const gbp = (v) => v == null ? "—" : `£${Number(v).toFixed(2)}`;
const date = (v) => v ? String(v).slice(0, 10) : "—";
const cap = (s) => s ? String(s).replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "—";

const getPurchaseDispatchStatus = (orderedQty, dispatchedQty) => {
  const ordered = Number(orderedQty) || 0;
  const dispatched = Number(dispatchedQty) || 0;
  if (dispatched <= 0) return "pending_dispatch";
  if (ordered > 0 && dispatched >= ordered) return "dispatched";
  return "partially_dispatched";
};
const getPurchaseDispatchLabel = (status) => {
  if (status === "pending_dispatch") return "Pending dispatch";
  if (status === "partially_dispatched") return "Partially dispatched";
  if (status === "not_dispatched") return "Not dispatched";
  return cap(status);
};
const getProcurementRowDispatchedQty = (row) =>
  Number(row?.quantityAlreadyDispatched ?? row?.totalDispatchedQty ?? row?.quantityDispatched ?? row?.dispatchedQuantity ?? 0) || 0;
// Resolve the best available item name (variant preferred over product name)
const itemName = (row) => {
  const vn  = String(row?.variantName ?? row?.VariantName ?? "").trim();
  if (vn) return vn;
  const name = String(row?.productName ?? row?.ProductName ?? "").trim();
  const vol  = String(row?.volume ?? row?.Volume ?? "").trim();
  if (vol) return `${name} ${vol}`.trim();
  const wKg = Number(row?.weight ?? row?.Weight ?? row?.weightKg ?? row?.WeightKg ?? 0);
  if (wKg > 0) return `${name} (${Math.round(wKg * 1000)}g)`;
  return name || "—";
};

const productWithBrand = (row) => {
  const product = itemName(row);
  const brand   = String(row?.brandName ?? row?.BrandName ?? "").trim();
  return brand && product && product !== "—" ? `${brand} - ${product}` : product || brand || "—";
};

/* ── tiny UI helpers ─────────────────────────────────────────────────────── */
const Input = (props) => (
  <input {...props} className="w-full rounded-xl border border-tenzy-orange/50 bg-white px-3 py-2 text-sm outline-none transition focus:border-tenzy-orange focus:ring-2 focus:ring-tenzy-orange/20" />
);
const Label = ({ children }) => <label className="mb-1 block text-xs font-semibold text-slate-500">{children}</label>;

function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="w-7 h-7 rounded-full border-4 border-tenzy-teal/30 border-t-tenzy-teal animate-spin" />
    </div>
  );
}

function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-2 py-3">
      <button disabled={page === 1} onClick={() => onChange(page - 1)}
        className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 disabled:opacity-40 transition">
        <ChevronLeft size={14} />
      </button>
      <span className="text-sm text-slate-600 font-medium px-2">{page} / {totalPages}</span>
      <button disabled={page === totalPages} onClick={() => onChange(page + 1)}
        className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 disabled:opacity-40 transition">
        <ChevronRight size={14} />
      </button>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, color = "teal" }) {
  const bg = { teal: "bg-teal-50 text-teal-600", amber: "bg-amber-50 text-amber-600", indigo: "bg-indigo-50 text-indigo-600", rose: "bg-rose-50 text-rose-600", emerald: "bg-emerald-50 text-emerald-600" };
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${bg[color]}`}>
        <Icon size={18} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-slate-500 truncate">{label}</p>
        <p className="text-base font-bold text-slate-900 truncate">{value}</p>
      </div>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg px-3 py-2 text-sm space-y-1">
      {label && <p className="font-semibold text-slate-700 mb-1">{label}</p>}
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color ?? p.fill }} className="font-medium">
          {p.name}: {typeof p.value === "number" && p.value > 10 ? `£${p.value.toFixed(2)}` : p.value}
        </p>
      ))}
    </div>
  );
};

/* ── Items modal ──────────────────────────────────────────────────────────── */
function ItemsModal({ title, subtitle, columns, rows, onClose, pdfExportCols }) {
  const [page, setPage] = useState(1);
  const [showPdfPicker, setShowPdfPicker] = useState(false);
  const [selectedPdfKeys, setSelectedPdfKeys] = useState(
    () => new Set((pdfExportCols ?? []).map((c) => c.key))
  );
  const totalPages = Math.ceil(rows.length / PAGE_SIZE);
  const pageRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const toggleKey = (key) =>
    setSelectedPdfKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });

  const handleDownloadPdf = () => {
    const exportCols = (pdfExportCols ?? []).filter((c) => selectedPdfKeys.has(c.key));
    const exportRows = rows.map((row) => {
      const out = {};
      exportCols.forEach((col) => { out[col.key] = col.format ? col.format(row) : String(row[col.key] ?? "—"); });
      return out;
    });
    downloadSimplePdf({ fileName: "tenzy-dispatch-items.pdf", title, subtitle: subtitle ?? "", columns: exportCols, rows: exportRows });
    setShowPdfPicker(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-8 overflow-y-auto">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-white rounded-3xl w-full max-w-5xl shadow-2xl">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white rounded-t-3xl z-10">
          <div>
            <h2 className="text-base font-bold text-slate-900">{title}</h2>
            {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-2">
            {pdfExportCols && (
              <button
                onClick={() => setShowPdfPicker((v) => !v)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border transition ${showPdfPicker ? "bg-tenzy-teal text-white border-tenzy-teal" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}
              >
                <Download size={12} /> Download PDF
              </button>
            )}
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 text-slate-500"><X size={18} /></button>
          </div>
        </div>

        {showPdfPicker && pdfExportCols && (
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
            <p className="text-xs font-bold text-slate-600 mb-3">Select columns to include in PDF:</p>
            <div className="flex flex-wrap gap-x-5 gap-y-2 mb-4">
              {pdfExportCols.map((col) => (
                <label key={col.key} className="flex items-center gap-1.5 cursor-pointer select-none">
                  <input type="checkbox" checked={selectedPdfKeys.has(col.key)} onChange={() => toggleKey(col.key)} className="accent-tenzy-teal" />
                  <span className="text-xs text-slate-700">{col.label}</span>
                </label>
              ))}
            </div>
            <button
              onClick={handleDownloadPdf}
              disabled={selectedPdfKeys.size === 0}
              className="px-4 py-1.5 bg-tenzy-teal text-white text-xs font-semibold rounded-xl disabled:opacity-50 hover:opacity-90 transition"
            >
              Download PDF
            </button>
          </div>
        )}

        <div className="p-6">
          <div className="overflow-x-auto rounded-xl border border-slate-100">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide">
                <tr>
                  {columns.map((c) => (
                    <th key={c.key} className={`px-3 py-3 font-semibold whitespace-nowrap ${c.right ? "text-right" : "text-left"}`}>{c.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {pageRows.length === 0 && (
                  <tr><td colSpan={columns.length} className="px-3 py-8 text-center text-slate-400">No items.</td></tr>
                )}
                {pageRows.map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50/60 transition">
                    {columns.map((c) => (
                      <td key={c.key} className={`px-3 py-2.5 text-slate-700 whitespace-nowrap ${c.right ? "text-right" : ""}`}>
                        {c.render ? c.render(row) : (row[c.key] ?? "—")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={totalPages} onChange={setPage} />
        </div>
      </div>
    </div>
  );
}

/* ── Filters panel ────────────────────────────────────────────────────────── */
function Filters({ filters, onChange, onApply }) {
  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5">
      <div className="flex items-center gap-2 mb-4">
        <Filter size={15} className="text-slate-400" />
        <p className="text-sm font-bold text-slate-700">Filters</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div><Label>Start date</Label><Input type="date" value={filters.startDate} onChange={(e) => onChange({ ...filters, startDate: e.target.value })} /></div>
        <div><Label>End date</Label><Input type="date" value={filters.endDate} onChange={(e) => onChange({ ...filters, endDate: e.target.value })} /></div>
        <div><Label>Shop</Label><Input value={filters.shop} onChange={(e) => onChange({ ...filters, shop: e.target.value })} placeholder="Any shop" /></div>
        <div><Label>Courier</Label><Input value={filters.courier} onChange={(e) => onChange({ ...filters, courier: e.target.value })} placeholder="Any courier" /></div>
        <div><Label>Brand</Label><Input value={filters.brand} onChange={(e) => onChange({ ...filters, brand: e.target.value })} placeholder="Any brand" /></div>
        <div><Label>Product</Label><Input value={filters.product} onChange={(e) => onChange({ ...filters, product: e.target.value })} placeholder="Any product" /></div>
        <div>
          <Label>Shipment status</Label>
          <select value={filters.shipmentStatus} onChange={(e) => onChange({ ...filters, shipmentStatus: e.target.value })}
            className="w-full rounded-xl border border-tenzy-orange/50 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-tenzy-teal/20 focus:border-tenzy-orange">
            <option value="">All</option>
            <option value="pending">Pending</option>
            <option value="dispatched">Dispatched</option>
            <option value="received">Received</option>
          </select>
        </div>
      </div>
      <div className="flex justify-end mt-4">
        <button onClick={onApply} className="flex items-center gap-2 px-5 py-2 bg-tenzy-teal text-white text-sm font-bold rounded-xl hover:opacity-90 transition">
          <Filter size={14} /> Apply Filters
        </button>
      </div>
    </div>
  );
}


/* ── UK PURCHASE TAB ─────────────────────────────────────────────────────── */
const PROCUREMENT_EXPORT_FIELDS = [
  { key: "procurementReference", label: "Reference",      width: 16 },
  { key: "purchaseDate",         label: "Date",           width: 12 },
  { key: "shopName",             label: "Shop",           width: 14 },
  { key: "productName",          label: "Product",        width: 18 },
  { key: "brandName",            label: "Brand",          width: 12 },
  { key: "quantity",             label: "Qty",            width: 6  },
  { key: "unitPrice",            label: "Gross Unit £",   width: 12 },
  { key: "discountTotal",        label: "Discount £",     width: 12 },
  { key: "netUnitCost",          label: "Net Unit £",     width: 12 },
  { key: "netTotal",             label: "Net Total £",    width: 12 },
  { key: "cardSpendAmount",      label: "Card Spend £",   width: 12 },
];

function UKPurchaseTab({ rows, loading, onExport }) {
  const [page, setPage] = useState(1);
  const [showCharts, setShowCharts] = useState(false);
  const [modal, setModal] = useState(null);
  const [showExportPicker, setShowExportPicker] = useState(false);
  const [selectedExportKeys, setSelectedExportKeys] = useState(
    () => new Set(["procurementReference","purchaseDate","shopName","productName","quantity","netTotal","cardSpendAmount"])
  );

  const toggleExportKey = (key) =>
    setSelectedExportKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });

  const handleExportPdf = () => {
    const selected = PROCUREMENT_EXPORT_FIELDS.filter((f) => selectedExportKeys.has(f.key));
    onExport("procurement", rows, selected);
    setShowExportPicker(false);
  };

  const groups = useMemo(() => {
    const map = new Map();
    (rows ?? []).forEach((row) => {
      const key = row.procurementReference ?? row.procurementId ?? "Unknown";
      if (!map.has(key)) {
        map.set(key, { reference: key, purchaseDate: row.purchaseDate, shopName: row.shopName,
          paymentCardName: row.paymentCardName ?? null, cardSpendAmount: row.cardSpendAmount ?? null,
          items: [], totalSpend: 0, totalGrossProductCost: 0, totalOrderedQty: 0, totalDispatchedQty: 0 });
      }
      const g = map.get(key);
      g.items.push(row);
      g.totalSpend += Number(row.netTotal ?? 0);
      g.totalGrossProductCost += Number(row.unitPrice ?? 0) * Number(row.quantity ?? 0);
      g.totalOrderedQty += Number(row.quantity ?? 0);
      g.totalDispatchedQty += getProcurementRowDispatchedQty(row);
    });
    return [...map.values()]
      .map((g) => ({ ...g, dispatchStatus: getPurchaseDispatchStatus(g.totalOrderedQty, g.totalDispatchedQty) }))
      .sort((a, b) => (b.purchaseDate ?? "").localeCompare(a.purchaseDate ?? ""));
  }, [rows]);

  const totalPages = Math.ceil(groups.length / PAGE_SIZE);
  const pageGroups = groups.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalSpend  = groups.reduce((s, g) => s + g.totalSpend, 0);
  const uniqueShops = new Set((rows ?? []).map((r) => r.shopName)).size;

  const shopChartData = useMemo(() => {
    const map = {};
    (rows ?? []).forEach((r) => { map[r.shopName] = (map[r.shopName] || 0) + (r.netTotal ?? 0); });
    return Object.entries(map).map(([name, value]) => ({ name, value: +value.toFixed(2) })).sort((a, b) => b.value - a.value);
  }, [rows]);

  const brandChartData = useMemo(() => {
    const map = {};
    (rows ?? []).forEach((r) => { map[r.brandName || "Unknown"] = (map[r.brandName || "Unknown"] || 0) + (r.quantity ?? 0); });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 8);
  }, [rows]);

  const itemColumns = [
    { key: "productName",  label: "Product",      render: (r) => <span className="font-semibold text-slate-800">{itemName(r)}</span> },
    { key: "brandName",    label: "Brand" },
    { key: "quantity",     label: "Qty",           right: true, render: (r) => <span className="font-semibold">{r.quantity}</span> },
    { key: "unitPrice",    label: "Gross Unit £",  right: true, render: (r) => gbp(r.unitPrice) },
    { key: "discountTotal",label: "Discount £",    right: true,
      render: (r) => (r.discountTotal ?? 0) > 0
        ? <span className="text-red-500 font-semibold">-{gbp(r.discountTotal)}</span>
        : <span className="text-slate-400">—</span> },
    { key: "netUnitCost",  label: "Net Unit £",    right: true, render: (r) => gbp(r.netUnitCost) },
    { key: "netTotal",     label: "Net Total £",   right: true, render: (r) => <span className="font-bold text-slate-900">{gbp(r.netTotal)}</span> },
    { key: "_dispatch",    label: "Dispatch",
      render: (r) => {
        const s = getPurchaseDispatchStatus(r.quantity, getProcurementRowDispatchedQty(r));
        return <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${DISPATCH_STATUS_BADGE[s] ?? DISPATCH_STATUS_BADGE.pending_dispatch}`}>{getPurchaseDispatchLabel(s)}</span>;
      }},
  ];

  if (loading) return <Spinner />;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard icon={ShoppingBag} label="Purchase records"  value={groups.length}   color="teal" />
        <KpiCard icon={Package}     label="Total items"        value={rows.length}     color="indigo" />
        <KpiCard icon={TrendingUp}  label="Unique shops"       value={uniqueShops}     color="amber" />
        <KpiCard icon={BarChart2}   label="Total spend (GBP)"  value={gbp(totalSpend)} color="rose" />
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-slate-700">{groups.length} purchase records</p>
        <div className="flex gap-2">
          <button onClick={() => setShowCharts((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border transition ${showCharts ? "bg-tenzy-teal text-white border-tenzy-teal" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
            <BarChart2 size={13} /> {showCharts ? "Hide charts" : "Show charts"}
          </button>
          <button
            onClick={() => setShowExportPicker((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-tenzy-teal text-white rounded-xl hover:opacity-90 transition">
            <Download size={13} /> Export PDF
          </button>
        </div>
      </div>

      {showExportPicker && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
          <p className="text-xs font-bold text-slate-600 mb-3">Select columns to include in PDF:</p>
          <div className="flex flex-wrap gap-x-6 gap-y-2.5 mb-4">
            {PROCUREMENT_EXPORT_FIELDS.map((f) => (
              <label key={f.key} className="flex items-center gap-1.5 cursor-pointer select-none">
                <input type="checkbox" checked={selectedExportKeys.has(f.key)} onChange={() => toggleExportKey(f.key)} className="accent-tenzy-teal" />
                <span className="text-xs text-slate-700">{f.label}</span>
              </label>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleExportPdf}
              disabled={selectedExportKeys.size === 0}
              className="px-4 py-1.5 bg-tenzy-teal text-white text-xs font-semibold rounded-xl disabled:opacity-50 hover:opacity-90 transition"
            >
              Download PDF
            </button>
            <button onClick={() => setShowExportPicker(false)} className="text-xs text-slate-400 hover:text-slate-600 transition">
              Cancel
            </button>
          </div>
        </div>
      )}

      {showCharts && rows.length > 0 && (
        <div className="grid md:grid-cols-2 gap-5">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
            <p className="text-sm font-bold text-slate-700 mb-3">Net Spend by Shop (£)</p>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={shopChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {shopChartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
            <p className="text-sm font-bold text-slate-700 mb-3">Qty by Brand</p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={brandChartData} margin={{ top: 5, right: 10, left: 0, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-35} textAnchor="end" interval={0} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" name="Qty" fill="#0d9488" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide border-b border-slate-200">
              <tr>
                <th className="text-left px-5 py-3">Reference</th>
                <th className="text-left px-5 py-3">Date</th>
                <th className="text-left px-5 py-3">Shop</th>
                <th className="text-right px-5 py-3">Items</th>
                <th className="text-right px-5 py-3">Net spend (GBP)</th>
                <th className="text-right px-5 py-3">Card charged (GBP)</th>
                <th className="text-left px-5 py-3">Dispatch</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pageGroups.length === 0 && (
                <tr><td colSpan={8} className="px-5 py-10 text-center text-slate-400">No purchase records found.</td></tr>
              )}
              {pageGroups.map((g) => (
                <tr key={g.reference} className="hover:bg-slate-50/60 transition">
                  <td className="px-5 py-3 font-semibold text-slate-800">{g.reference}</td>
                  <td className="px-5 py-3 text-slate-600">{date(g.purchaseDate)}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <ShoppingBag size={13} className="text-tenzy-teal shrink-0" />
                      <span className="text-slate-700">{g.shopName}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-right text-slate-600">{g.items.length}</td>
                  <td className="px-5 py-3 text-right font-bold text-slate-900">{gbp(g.totalSpend)}</td>
                  <td className="px-5 py-3 text-right font-semibold text-indigo-700">
                    {g.cardSpendAmount != null ? gbp(g.cardSpendAmount) : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${DISPATCH_STATUS_BADGE[g.dispatchStatus] ?? DISPATCH_STATUS_BADGE.pending_dispatch}`}>
                      {getPurchaseDispatchLabel(g.dispatchStatus)}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => setModal({ title: `${g.reference} — ${g.shopName}`, subtitle: `${date(g.purchaseDate)} · ${g.items.length} items · ${gbp(g.totalSpend)} total`, items: g.items })}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-tenzy-teal hover:text-tenzy-teal transition">
                      <Eye size={12} /> View items
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-t border-slate-100"><Pagination page={page} totalPages={totalPages} onChange={setPage} /></div>
      </div>

      {modal && (
        <ItemsModal title={modal.title} subtitle={modal.subtitle} columns={itemColumns}
          rows={modal.items} onClose={() => setModal(null)} />
      )}
    </div>
  );
}

/* ── CARD CHARGES TAB ────────────────────────────────────────────────────── */
const CARD_CHARGES_EXPORT_FIELDS = [
  { key: "reference",        label: "Reference",          width: 16 },
  { key: "purchaseDate",     label: "Date",               width: 12 },
  { key: "shopName",         label: "Shop",               width: 14 },
  { key: "paymentCardName",  label: "Card",               width: 16 },
  { key: "cardSpendAmount",  label: "Card Charged £",     width: 14 },
  { key: "grossProductCost", label: "Gross Product Cost £", width: 14 },
  { key: "netProductCost",   label: "Net Product Cost £", width: 14 },
  { key: "differenceAmount", label: "Difference £",       width: 12 },
];

function CardChargesTab({ rows, loading, onExport }) {
  const [selectedCard, setSelectedCard] = useState("all");
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(null);
  const [showExportPicker, setShowExportPicker] = useState(false);
  const [selectedExportKeys, setSelectedExportKeys] = useState(
    () => new Set(["reference","purchaseDate","shopName","paymentCardName","cardSpendAmount","grossProductCost","differenceAmount"])
  );

  const toggleExportKey = (key) =>
    setSelectedExportKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });

  // Group item-level rows → one entry per procurement reference that was charged to a card
  const procGroups = useMemo(() => {
    const map = new Map();
    (rows ?? [])
      .filter((r) => r.cardSpendAmount != null && Number(r.cardSpendAmount) > 0)
      .forEach((row) => {
        const key = row.procurementReference ?? row.procurementId ?? "Unknown";
        if (!map.has(key)) {
          map.set(key, {
            reference: key,
            purchaseDate: row.purchaseDate,
            shopName: row.shopName,
            paymentCardName: row.paymentCardName ?? "Unknown Card",
            cardSpendAmount: Number(row.cardSpendAmount),
            grossProductCost: 0,
            netProductCost: 0,
            items: [],
          });
        }
        const g = map.get(key);
        g.items.push(row);
        g.grossProductCost += Number(row.unitPrice ?? 0) * Number(row.quantity ?? 0);
        g.netProductCost   += Number(row.netTotal ?? 0);
      });
    return [...map.values()]
      .map((g) => ({ ...g, differenceAmount: g.cardSpendAmount - g.grossProductCost }))
      .sort((a, b) => (b.purchaseDate ?? "").localeCompare(a.purchaseDate ?? ""));
  }, [rows]);

  const cards = useMemo(() => ["all", ...[...new Set(procGroups.map((g) => g.paymentCardName))].sort()], [procGroups]);

  const filtered = useMemo(
    () => selectedCard === "all" ? procGroups : procGroups.filter((g) => g.paymentCardName === selectedCard),
    [procGroups, selectedCard]
  );

  // Pie chart — total card spend per card name (always from all groups, not just filtered)
  const pieData = useMemo(() => {
    const map = {};
    procGroups.forEach((g) => { map[g.paymentCardName] = (map[g.paymentCardName] || 0) + g.cardSpendAmount; });
    return Object.entries(map).map(([name, value]) => ({ name, value: +value.toFixed(2) })).sort((a, b) => b.value - a.value);
  }, [procGroups]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageRows   = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const totalCardSpend = procGroups.reduce((s, g) => s + g.cardSpendAmount, 0);
  const uniqueCards    = new Set(procGroups.map((g) => g.paymentCardName)).size;
  const totalDiff      = procGroups.reduce((s, g) => s + g.differenceAmount, 0);

  const handleExportPdf = () => {
    const selected = CARD_CHARGES_EXPORT_FIELDS.filter((f) => selectedExportKeys.has(f.key));
    onExport("card", filtered, selected);
    setShowExportPicker(false);
  };

  const itemColumns = [
    { key: "productName",  label: "Product",     render: (r) => <span className="font-semibold text-slate-800">{r.productName}</span> },
    { key: "brandName",    label: "Brand" },
    { key: "quantity",     label: "Qty",          right: true, render: (r) => <span className="font-semibold">{r.quantity}</span> },
    { key: "unitPrice",    label: "Gross Unit £",  right: true, render: (r) => gbp(r.unitPrice) },
    { key: "discountTotal",label: "Discount £",    right: true,
      render: (r) => (r.discountTotal ?? 0) > 0
        ? <span className="text-red-500 font-semibold">-{gbp(r.discountTotal)}</span>
        : <span className="text-slate-400">—</span> },
    { key: "netUnitCost",  label: "Net Unit £",    right: true, render: (r) => gbp(r.netUnitCost) },
    { key: "netTotal",     label: "Net Total £",   right: true, render: (r) => <span className="font-bold text-slate-900">{gbp(r.netTotal)}</span> },
    { key: "_dispatch",    label: "Dispatch",
      render: (r) => {
        const s = getPurchaseDispatchStatus(r.quantity, getProcurementRowDispatchedQty(r));
        return <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${DISPATCH_STATUS_BADGE[s] ?? DISPATCH_STATUS_BADGE.pending_dispatch}`}>{getPurchaseDispatchLabel(s)}</span>;
      }},
  ];

  if (loading) return <Spinner />;

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard icon={CreditCard}  label="Cards used"         value={uniqueCards}         color="indigo" />
        <KpiCard icon={ShoppingBag} label="Purchases on card"  value={procGroups.length}   color="teal"   />
        <KpiCard icon={TrendingUp}  label="Total card spend"   value={gbp(totalCardSpend)} color="rose"   />
        <KpiCard icon={BarChart2}   label="Total difference"   value={gbp(totalDiff)}      color="amber"  />
      </div>

      {/* Charts */}
      {pieData.length > 0 && (
        <div className="grid md:grid-cols-2 gap-5">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
            <p className="text-sm font-bold text-slate-700 mb-3">Card Spend Distribution (£)</p>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" iconSize={10} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
            <p className="text-sm font-bold text-slate-700 mb-3">Spend by Card</p>
            <div className="space-y-2.5 overflow-y-auto max-h-52 pr-1">
              {pieData.map((d, i) => (
                <div key={d.name} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                    <span className="text-sm text-slate-700 font-medium truncate">{d.name}</span>
                  </div>
                  <span className="text-sm font-bold text-slate-900 shrink-0">{gbp(d.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <p className="text-sm font-bold text-slate-700">{filtered.length} charge records</p>
          <select
            value={selectedCard}
            onChange={(e) => { setSelectedCard(e.target.value); setPage(1); }}
            className="rounded-xl border border-tenzy-orange/50 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-tenzy-teal/20 focus:border-tenzy-orange"
          >
            {cards.map((c) => (
              <option key={c} value={c}>{c === "all" ? "All cards" : c}</option>
            ))}
          </select>
        </div>
        <button
          onClick={() => setShowExportPicker((v) => !v)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-tenzy-teal text-white rounded-xl hover:opacity-90 transition">
          <Download size={13} /> Export PDF
        </button>
      </div>

      {showExportPicker && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
          <p className="text-xs font-bold text-slate-600 mb-3">Select columns to include in PDF:</p>
          <div className="flex flex-wrap gap-x-6 gap-y-2.5 mb-4">
            {CARD_CHARGES_EXPORT_FIELDS.map((f) => (
              <label key={f.key} className="flex items-center gap-1.5 cursor-pointer select-none">
                <input type="checkbox" checked={selectedExportKeys.has(f.key)} onChange={() => toggleExportKey(f.key)} className="accent-tenzy-teal" />
                <span className="text-xs text-slate-700">{f.label}</span>
              </label>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleExportPdf} disabled={selectedExportKeys.size === 0}
              className="px-4 py-1.5 bg-tenzy-teal text-white text-xs font-semibold rounded-xl disabled:opacity-50 hover:opacity-90 transition">
              Download PDF
            </button>
            <button onClick={() => setShowExportPicker(false)} className="text-xs text-slate-400 hover:text-slate-600 transition">Cancel</button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-3xl border border-indigo-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-indigo-100 flex items-center gap-2">
          <CreditCard size={15} className="text-indigo-500" />
          <h3 className="text-sm font-bold text-indigo-800">Card Charge Records</h3>
          {selectedCard !== "all" && (
            <span className="ml-1 text-xs text-indigo-400">— {selectedCard}</span>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-indigo-50 text-xs text-indigo-500 uppercase tracking-wide border-b border-indigo-100">
              <tr>
                <th className="text-left px-5 py-2.5">Reference</th>
                <th className="text-left px-5 py-2.5">Date</th>
                <th className="text-left px-5 py-2.5">Shop</th>
                <th className="text-left px-5 py-2.5">Card</th>
                <th className="text-right px-5 py-2.5">Card Charged £</th>
                <th className="text-right px-5 py-2.5">Gross Product Cost £</th>
                <th className="text-right px-5 py-2.5">Net Product Cost £</th>
                <th className="text-right px-5 py-2.5">Difference £</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-indigo-50">
              {pageRows.length === 0 && (
                <tr><td colSpan={8} className="px-5 py-10 text-center text-slate-400">No card charge records found.</td></tr>
              )}
              {pageRows.map((g) => (
                <tr key={g.reference} className="hover:bg-indigo-50/40 transition">
                  <td className="px-5 py-3">
                    <button
                      onClick={() => setModal({ title: g.reference, subtitle: `${g.shopName} · ${date(g.purchaseDate)} · ${g.items.length} items`, items: g.items })}
                      className="font-semibold text-tenzy-teal hover:underline text-left"
                    >
                      {g.reference}
                    </button>
                  </td>
                  <td className="px-5 py-3 text-slate-500">{date(g.purchaseDate)}</td>
                  <td className="px-5 py-3 text-slate-600">{g.shopName}</td>
                  <td className="px-5 py-3">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
                      <CreditCard size={10} /> {g.paymentCardName}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right font-bold text-indigo-700">{gbp(g.cardSpendAmount)}</td>
                  <td className="px-5 py-3 text-right text-slate-600">{gbp(g.grossProductCost)}</td>
                  <td className="px-5 py-3 text-right text-slate-600">{gbp(g.netProductCost)}</td>
                  <td className={`px-5 py-3 text-right font-semibold ${g.differenceAmount > 0.005 ? "text-amber-600" : g.differenceAmount < -0.005 ? "text-emerald-600" : "text-slate-400"}`}>
                    {g.differenceAmount > 0 ? "+" : ""}{gbp(g.differenceAmount)}
                  </td>
                </tr>
              ))}
            </tbody>
            {filtered.length > 0 && (
              <tfoot className="bg-indigo-50 border-t border-indigo-200 text-sm font-bold">
                <tr>
                  <td colSpan={4} className="px-5 py-2.5 text-xs font-bold text-indigo-700 uppercase tracking-wide">
                    {selectedCard === "all" ? "Total — all cards" : `Total — ${selectedCard}`}
                  </td>
                  <td className="px-5 py-2.5 text-right text-indigo-800">{gbp(filtered.reduce((s, g) => s + g.cardSpendAmount, 0))}</td>
                  <td className="px-5 py-2.5 text-right text-slate-700">{gbp(filtered.reduce((s, g) => s + g.grossProductCost, 0))}</td>
                  <td className="px-5 py-2.5 text-right text-slate-700">{gbp(filtered.reduce((s, g) => s + g.netProductCost, 0))}</td>
                  <td className="px-5 py-2.5 text-right text-slate-700">{gbp(filtered.reduce((s, g) => s + g.differenceAmount, 0))}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        <div className="border-t border-indigo-100"><Pagination page={page} totalPages={totalPages} onChange={setPage} /></div>
      </div>

      {modal && (
        <ItemsModal title={modal.title} subtitle={modal.subtitle} columns={itemColumns}
          rows={modal.items} onClose={() => setModal(null)} />
      )}
    </div>
  );
}

/* ── DISPATCH TAB ─────────────────────────────────────────────────────────── */
const DISPATCH_EXPORT_FIELDS = [
  { key: "dispatchReference",     label: "Reference",   width: 18 },
  { key: "dispatchDate",          label: "Date",        width: 12 },
  { key: "courierName",           label: "Courier",     width: 16 },
  { key: "boxNumber",             label: "Box",         width: 6  },
  { key: "productName",           label: "Product",     width: 28, format: productWithBrand },
  { key: "quantityDispatched",    label: "Qty",         width: 6  },
  { key: "netUnitCost",           label: "Net Unit £",  width: 10 },
  { key: "productCost",           label: "Net Total £", width: 12 },
  { key: "totalShipmentCharge",   label: "Dispatch £",  width: 12 },
];

function DispatchTab({ rows, loading, onExport }) {
  const [page, setPage] = useState(1);
  const [showCharts, setShowCharts] = useState(false);
  const [expandedDispatches, setExpandedDispatches] = useState(new Set());
  const [expandedBoxes, setExpandedBoxes] = useState(new Set());

  const toggleDispatch = (ref) => {
    setExpandedDispatches((prev) => {
      const next = new Set(prev);
      if (next.has(ref)) next.delete(ref); else next.add(ref);
      return next;
    });
  };

  const toggleBox = (ref, boxNum) => {
    setExpandedBoxes((prev) => {
      const k = `${ref}:${boxNum}`;
      const next = new Set(prev);
      if (next.has(k)) next.delete(k); else next.add(k);
      return next;
    });
  };

  // Group rows: dispatch → boxes → items
  const groups = useMemo(() => {
    const map = new Map();
    (rows ?? []).forEach((row) => {
      const key = row.dispatchReference ?? "Unknown";
      if (!map.has(key)) {
        map.set(key, {
          reference: key,
          dispatchDate: row.dispatchDate,
          courierName: row.courierName,
          parcelNumber: row.parcelNumber,
          shipmentStatus: row.shipmentStatus,
          notes: row.notes,
          totalProductCost: 0,
          totalShipmentCharge: 0,
          totalDispatchedWeight: 0,
          boxCount: 0,
          totalQty: 0,
          boxes: new Map(),
        });
      }
      const g = map.get(key);
      // Shipment-level values are identical across all rows for the same dispatch
      if (g.boxes.size === 0) {
        g.totalShipmentCharge = Number(row.totalShipmentCharge ?? 0);
        g.totalDispatchedWeight = Number(row.totalDispatchedWeight ?? 0);
        g.boxCount = Number(row.boxCount ?? 0);
      }
      g.totalProductCost += Number(row.productCost ?? 0);
      g.totalQty += Number(row.quantityDispatched ?? 0);

      const boxKey = row.boxNumber ?? 0;
      if (!g.boxes.has(boxKey)) {
        g.boxes.set(boxKey, { boxNumber: boxKey, items: [], totalQty: 0, totalWeightKg: 0 });
      }
      const box = g.boxes.get(boxKey);
      box.items.push(row);
      box.totalQty += Number(row.quantityDispatched ?? 0);
      box.totalWeightKg += Number(row.dispatchBoxWeight ?? 0) * Number(row.quantityDispatched ?? 0);
    });

    return [...map.values()]
      .map((g) => ({
        ...g,
        boxes: [...g.boxes.values()].sort((a, b) => (a.boxNumber ?? 0) - (b.boxNumber ?? 0)),
      }))
      .sort((a, b) => (b.dispatchDate ?? "").localeCompare(a.dispatchDate ?? ""));
  }, [rows]);

  const totalPages = Math.ceil(groups.length / PAGE_SIZE);
  const pageGroups = groups.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const totalProductCost  = groups.reduce((s, g) => s + g.totalProductCost, 0);
  const totalCourierCost  = groups.reduce((s, g) => s + g.totalShipmentCharge, 0);
  const totalCombinedCost = totalProductCost + totalCourierCost;
  const totalQty          = groups.reduce((s, g) => s + g.totalQty, 0);

  const courierChartData = useMemo(() => {
    const map = {};
    (rows ?? []).forEach((r) => { map[r.courierName || "Unknown"] = (map[r.courierName || "Unknown"] || 0) + (r.quantityDispatched ?? 0); });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [rows]);

  const costBreakdownData = useMemo(() => [
    { name: "Product cost", value: +totalProductCost.toFixed(2) },
    { name: "Courier cost", value: +totalCourierCost.toFixed(2) },
  ], [totalProductCost, totalCourierCost]);

  if (loading) return <Spinner />;

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard icon={Truck}      label="Dispatches"           value={groups.length}          color="teal"   />
        <KpiCard icon={Package}    label="Total units sent"     value={totalQty}               color="indigo" />
        <KpiCard icon={TrendingUp} label="Product cost (GBP)"   value={gbp(totalProductCost)}  color="amber"  />
        <KpiCard icon={BarChart2}  label="Total incl. courier"  value={gbp(totalCombinedCost)} color="rose"   />
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-slate-700">{groups.length} dispatches</p>
        <button
          onClick={() => setShowCharts((v) => !v)}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border transition ${showCharts ? "bg-tenzy-teal text-white border-tenzy-teal" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
          <BarChart2 size={13} /> {showCharts ? "Hide charts" : "Show charts"}
        </button>
      </div>

      {showCharts && rows.length > 0 && (
        <div className="grid md:grid-cols-2 gap-5">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
            <p className="text-sm font-bold text-slate-700 mb-3">Qty by Courier</p>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={courierChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {courierChartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
            <p className="text-sm font-bold text-slate-700 mb-3">Cost breakdown (£)</p>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={costBreakdownData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {costBreakdownData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" iconSize={10} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Dispatch table with inline expand */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide border-b border-slate-200">
              <tr>
                <th className="w-10 px-3 py-3" />
                <th className="text-left px-4 py-3">Reference</th>
                <th className="text-left px-4 py-3">Date</th>
                <th className="text-left px-4 py-3">Courier</th>
                <th className="text-center px-4 py-3">Status</th>
                <th className="text-right px-4 py-3">Boxes</th>
                <th className="text-right px-4 py-3">Units</th>
                <th className="text-right px-4 py-3">Weight kg</th>
                <th className="text-right px-4 py-3">Product £</th>
                <th className="text-right px-4 py-3">Dispatch cost £</th>
                <th className="text-right px-4 py-3">Grand total £</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pageGroups.length === 0 && (
                <tr><td colSpan={11} className="px-5 py-10 text-center text-slate-400">No dispatch records found.</td></tr>
              )}
              {pageGroups.map((g) => {
                const isOpen = expandedDispatches.has(g.reference);
                return (
                  <React.Fragment key={g.reference}>
                    {/* ── Dispatch row ── */}
                    <tr
                      className="hover:bg-slate-50/70 transition cursor-pointer"
                      onClick={() => toggleDispatch(g.reference)}
                    >
                      <td className="px-3 py-3 text-slate-400">
                        {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-800">{g.reference}</td>
                      <td className="px-4 py-3 text-slate-600">{date(g.dispatchDate)}</td>
                      <td className="px-4 py-3 text-slate-700">{g.courierName}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${DISPATCH_STATUS_BADGE[g.shipmentStatus] ?? "bg-slate-100 text-slate-600"}`}>
                          {cap(g.shipmentStatus)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-slate-500">{g.boxCount}</td>
                      <td className="px-4 py-3 text-right text-slate-600">{g.totalQty}</td>
                      <td className="px-4 py-3 text-right text-slate-500">
                        {g.totalDispatchedWeight > 0 ? `${Number(g.totalDispatchedWeight).toFixed(3)}` : "—"}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-700">{gbp(g.totalProductCost)}</td>
                      <td className="px-4 py-3 text-right text-slate-700">{gbp(g.totalShipmentCharge)}</td>
                      <td className="px-4 py-3 text-right font-bold text-slate-900">{gbp(g.totalProductCost + g.totalShipmentCharge)}</td>
                    </tr>

                    {/* ── Expanded boxes panel ── */}
                    {isOpen && (
                      <tr>
                        <td colSpan={11} className="p-0 bg-teal-50/30">
                          <div className="px-6 py-4 space-y-3">
                            {/* Dispatch cost summary banner */}
                            <div className="flex items-center gap-6 text-xs font-semibold text-teal-800 bg-teal-100/70 rounded-xl px-4 py-2.5">
                              <span><Truck size={12} className="inline mr-1.5 opacity-70" />{g.courierName}</span>
                              {g.parcelNumber && <span>Parcel: {g.parcelNumber}</span>}
                              <span>Dispatch cost: <span className="text-teal-700 font-bold">{gbp(g.totalShipmentCharge)}</span></span>
                              <span>Grand total: <span className="text-slate-900 font-bold">{gbp(g.totalProductCost + g.totalShipmentCharge)}</span></span>
                              {g.notes && <span className="text-teal-600 italic truncate max-w-xs">{g.notes}</span>}
                            </div>

                            {/* Box list */}
                            <div className="space-y-2">
                              {g.boxes.map((box) => {
                                const boxKey = `${g.reference}:${box.boxNumber}`;
                                const boxOpen = expandedBoxes.has(boxKey);
                                const boxLabel = box.boxNumber ? `Box ${box.boxNumber}` : "Unassigned";
                                return (
                                  <div key={boxKey} className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                                    {/* Box header row */}
                                    <button
                                      className="w-full flex items-center gap-4 px-4 py-2.5 text-sm hover:bg-slate-50 transition text-left"
                                      onClick={() => toggleBox(g.reference, box.boxNumber)}
                                    >
                                      {boxOpen ? <ChevronUp size={13} className="text-slate-400 shrink-0" /> : <ChevronDown size={13} className="text-slate-400 shrink-0" />}
                                      <span className="font-semibold text-slate-700 w-24 shrink-0">{boxLabel}</span>
                                      <span className="text-slate-400 text-xs">{box.items.length} item{box.items.length !== 1 ? "s" : ""}</span>
                                      <span className="text-slate-400 text-xs">· {box.totalQty} units</span>
                                      {box.totalWeightKg > 0 && (
                                        <span className="text-slate-400 text-xs">· {box.totalWeightKg.toFixed(3)} kg</span>
                                      )}
                                    </button>

                                    {/* Box items table */}
                                    {boxOpen && (
                                      <div className="border-t border-slate-100 overflow-x-auto">
                                        <table className="w-full text-xs">
                                          <thead className="bg-slate-50 text-slate-400 uppercase tracking-wide">
                                            <tr>
                                              <th className="text-left px-4 py-2">Product</th>
                                              <th className="text-left px-4 py-2">Brand</th>
                                              <th className="text-left px-4 py-2">Category</th>
                                              <th className="text-right px-4 py-2">Qty</th>
                                              <th className="text-right px-4 py-2">Weight kg</th>
                                              <th className="text-right px-4 py-2">Gross Unit £</th>
                                              <th className="text-right px-4 py-2">Net Unit £</th>
                                              <th className="text-right px-4 py-2">Net Total £</th>
                                            </tr>
                                          </thead>
                                          <tbody className="divide-y divide-slate-100">
                                            {box.items.map((item) => {
                                              const unitCost = Number(item.netUnitCost ?? 0);
                                              const qty = Number(item.quantityDispatched ?? 0);
                                              const weightPerUnit = Number(item.dispatchBoxWeight ?? 0);
                                              return (
                                                <tr key={item.shipmentItemId} className="hover:bg-teal-50/30 transition">
                                                  <td className="px-4 py-2.5">
                                                    <span className="font-semibold text-slate-800">{itemName(item)}</span>
                                                  </td>
                                                  <td className="px-4 py-2.5 text-slate-500">{item.brandName || "—"}</td>
                                                  <td className="px-4 py-2.5 text-slate-400">{item.categoryName || "—"}</td>
                                                  <td className="px-4 py-2.5 text-right font-semibold text-slate-700">{qty}</td>
                                                  <td className="px-4 py-2.5 text-right text-slate-500">
                                                    {weightPerUnit > 0 ? (weightPerUnit * qty).toFixed(3) : "—"}
                                                  </td>
                                                  <td className="px-4 py-2.5 text-right text-slate-500">
                                                    {(item.unitPrice ?? 0) > 0 ? gbp(item.unitPrice) : "—"}
                                                  </td>
                                                  <td className="px-4 py-2.5 text-right text-slate-700">{gbp(unitCost)}</td>
                                                  <td className="px-4 py-2.5 text-right font-bold text-slate-900">{gbp(unitCost * qty)}</td>
                                                </tr>
                                              );
                                            })}
                                          </tbody>
                                          <tfoot className="border-t border-slate-200 bg-slate-50 text-xs font-bold text-slate-600">
                                            <tr>
                                              <td colSpan={3} className="px-4 py-2">Box total</td>
                                              <td className="px-4 py-2 text-right">{box.totalQty}</td>
                                              <td colSpan={3} className="px-4 py-2" />
                                              <td className="px-4 py-2 text-right">
                                                {gbp(box.items.reduce((s, r) => s + Number(r.netUnitCost ?? 0) * Number(r.quantityDispatched ?? 0), 0))}
                                              </td>
                                            </tr>
                                          </tfoot>
                                        </table>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Total footer */}
        {groups.length > 0 && (
          <div className="border-t border-slate-200 px-5 py-3 flex items-center justify-end gap-8 text-sm bg-slate-50">
            <span className="text-slate-500">All records total:</span>
            <span className="text-slate-600">Product: <strong>{gbp(totalProductCost)}</strong></span>
            <span className="text-slate-600">Dispatch cost: <strong>{gbp(totalCourierCost)}</strong></span>
            <span className="font-bold text-slate-900">Grand total: {gbp(totalCombinedCost)}</span>
          </div>
        )}
        <div className="border-t border-slate-100">
          <Pagination page={page} totalPages={totalPages} onChange={setPage} />
        </div>
      </div>
    </div>
  );
}

/* ── MONTHLY TAB ─────────────────────────────────────────────────────────── */
function MonthlyTab({ rows, loading, onExport }) {
  const [showCharts, setShowCharts] = useState(true);

  const barData = useMemo(() => rows.slice(-12).map((r) => ({
    name: r.summaryMonth?.slice(0, 7) ?? "—",
    "UK Cost":  +(r.totalUkCourierCost ?? 0).toFixed(2),
    "SL Cost":  +(r.totalSriLankaCourierCost ?? 0).toFixed(2),
    "Tax":      +(r.totalTaxCharges ?? 0).toFixed(2),
    "Products": +(r.totalProductCost ?? 0).toFixed(2),
  })), [rows]);

  const totalCost     = rows.reduce((s, r) => s + (r.totalShipmentCost ?? 0), 0);
  const totalProducts = rows.reduce((s, r) => s + (r.totalProductsDispatched ?? 0), 0);
  const totalShipments = rows.reduce((s, r) => s + (r.totalShipments ?? 0), 0);

  if (loading) return <Spinner />;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard icon={Calendar}   label="Months"              value={rows.length}          color="teal" />
        <KpiCard icon={Truck}      label="Total shipments"     value={totalShipments}       color="indigo" />
        <KpiCard icon={Package}    label="Products dispatched" value={totalProducts}        color="amber" />
        <KpiCard icon={BarChart2}  label="Total charge (GBP)"  value={gbp(totalCost)}       color="rose" />
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-slate-700">{rows.length} months of data</p>
        <div className="flex gap-2">
          <button onClick={() => setShowCharts((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border transition ${showCharts ? "bg-tenzy-teal text-white border-tenzy-teal" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
            <BarChart2 size={13} /> {showCharts ? "Hide chart" : "Show chart"}
          </button>
          <button onClick={() => onExport("monthly", rows)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-tenzy-teal text-white rounded-xl hover:opacity-90 transition">
            <Download size={13} /> Export PDF
          </button>
        </div>
      </div>

      {showCharts && rows.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
          <p className="text-sm font-bold text-slate-700 mb-3">Monthly costs breakdown (£) — last 12 months</p>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={barData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar dataKey="Products" fill="#0d9488" radius={[3, 3, 0, 0]} stackId="a" />
              <Bar dataKey="UK Cost"  fill="#6366f1" radius={[0, 0, 0, 0]} stackId="a" />
              <Bar dataKey="SL Cost"  fill="#f59e0b" radius={[0, 0, 0, 0]} stackId="a" />
              <Bar dataKey="Tax"      fill="#ef4444" radius={[3, 3, 0, 0]} stackId="a" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide border-b border-slate-200">
              <tr>
                <th className="text-left px-5 py-3">Month</th>
                <th className="text-right px-5 py-3">Shipments</th>
                <th className="text-right px-5 py-3">Products</th>
                <th className="text-right px-5 py-3">Product cost £</th>
                <th className="text-right px-5 py-3">UK courier £</th>
                <th className="text-right px-5 py-3">SL courier £</th>
                <th className="text-right px-5 py-3">Tax £</th>
                <th className="text-right px-5 py-3">Total cost £</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.length === 0 && (
                <tr><td colSpan={8} className="px-5 py-10 text-center text-slate-400">No monthly data.</td></tr>
              )}
              {rows.map((r, i) => (
                <tr key={i} className="hover:bg-slate-50/60 transition">
                  <td className="px-5 py-3 font-semibold text-slate-800">{r.summaryMonth?.slice(0, 7) ?? "—"}</td>
                  <td className="px-5 py-3 text-right text-slate-600">{r.totalShipments}</td>
                  <td className="px-5 py-3 text-right text-slate-600">{r.totalProductsDispatched}</td>
                  <td className="px-5 py-3 text-right text-slate-700">{gbp(r.totalProductCost)}</td>
                  <td className="px-5 py-3 text-right text-slate-700">{gbp(r.totalUkCourierCost)}</td>
                  <td className="px-5 py-3 text-right text-slate-700">{gbp(r.totalSriLankaCourierCost)}</td>
                  <td className="px-5 py-3 text-right text-slate-700">{gbp(r.totalTaxCharges)}</td>
                  <td className="px-5 py-3 text-right font-bold text-slate-900">{gbp(r.totalShipmentCost)}</td>
                </tr>
              ))}
            </tbody>
            {rows.length > 0 && (
              <tfoot className="bg-slate-50 border-t border-slate-200 text-sm font-bold text-slate-900">
                <tr>
                  <td className="px-5 py-3">Total</td>
                  <td className="px-5 py-3 text-right">{totalShipments}</td>
                  <td className="px-5 py-3 text-right">{totalProducts}</td>
                  <td className="px-5 py-3 text-right">{gbp(rows.reduce((s, r) => s + (r.totalProductCost ?? 0), 0))}</td>
                  <td className="px-5 py-3 text-right">{gbp(rows.reduce((s, r) => s + (r.totalUkCourierCost ?? 0), 0))}</td>
                  <td className="px-5 py-3 text-right">{gbp(rows.reduce((s, r) => s + (r.totalSriLankaCourierCost ?? 0), 0))}</td>
                  <td className="px-5 py-3 text-right">{gbp(rows.reduce((s, r) => s + (r.totalTaxCharges ?? 0), 0))}</td>
                  <td className="px-5 py-3 text-right">{gbp(totalCost)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}

/* ── PRICING TAB ─────────────────────────────────────────────────────────── */
function PricingTab({ rows, loading }) {
  const [view, setView]             = useState("product");
  const [openDispatch, setOpenDispatch] = useState(null);
  const [openBox, setOpenBox]       = useState(null);
  const [brandFilter, setBrandFilter]   = useState("");
  const [expandedProduct, setExpandedProduct] = useState(null); // productId expanded

  const pricingRows = useMemo(() => (rows ?? []).map((r) => {
    const ukCost      = Number(r.ukPurchaseUnitCost ?? 0);
    const logCost     = Number(r.logisticsUnitCost  ?? 0);
    const landed      = (ukCost + logCost) || Number(r.landedUnitCost ?? 0);
    const lkr         = Number(r.landedUnitCostLkr  ?? 0);   // cost per unit in LKR
    const rate        = Number(r.exchangeRateGbpToLkr ?? 0); // GBP→LKR rate at pricing time
    const wholesale   = Number(r.wholesalePrice     ?? 0);   // LKR
    const website     = Number(r.websitePrice ?? r.finalSellingPrice ?? 0); // LKR
    const qty         = Number(r.approvedQuantity ?? 0);

    // WholesalePrice and WebsitePrice are stored in LKR — no rate conversion needed.
    // Profit (LKR) = (qty × price_LKR) − (qty × cost_LKR)
    const wsProfitPerUnitLkr  = wholesale > 0 && lkr > 0 ? wholesale - lkr : null;
    const webProfitPerUnitLkr = lkr > 0 ? website - lkr : null;

    return {
      ...r,
      ukCost, logCost, landed, lkr, rate,
      wholesale, website,
      wsProfitPerUnitLkr,
      webProfitPerUnitLkr,
      totalWsProfitLkr:  wsProfitPerUnitLkr  != null ? qty * wsProfitPerUnitLkr  : null,
      totalWebProfitLkr: webProfitPerUnitLkr != null ? qty * webProfitPerUnitLkr : null,
      totalCost: qty * landed,  // GBP — landed cost total
    };
  }), [rows]);

  // ── Group by product (product-level rows, variants inside) ────────────────
  const byProduct = useMemo(() => {
    const map = new Map();
    pricingRows.forEach((r) => {
      const key = r.productId ?? r.productName;
      if (!map.has(key)) map.set(key, {
        productId: key,
        productName: r.productName ?? "",
        brandName: r.brandName ?? "",
        variants: [],
        qty: 0, totalUkCost: 0, totalLogCost: 0, totalCost: 0,
        totalWsRevLkr: 0, totalWebRevLkr: 0,
        totalWsProfitLkr: 0, wsLkrCount: 0,
        totalWebProfitLkr: 0, webLkrCount: 0,
        lkrSum: 0, lkrCount: 0, margin: [],
      });
      const g = map.get(key);
      g.variants.push(r);
      g.qty              += r.approvedQuantity;
      g.totalUkCost      += r.approvedQuantity * r.ukCost;
      g.totalLogCost     += r.approvedQuantity * r.logCost;
      g.totalCost        += r.totalCost;
      g.totalWsRevLkr    += r.wholesale > 0 ? r.approvedQuantity * r.wholesale : 0;
      g.totalWebRevLkr   += r.approvedQuantity * r.website;
      if (r.totalWsProfitLkr  != null) { g.totalWsProfitLkr  += r.totalWsProfitLkr;  g.wsLkrCount++;  }
      if (r.totalWebProfitLkr != null) { g.totalWebProfitLkr += r.totalWebProfitLkr; g.webLkrCount++; }
      if (r.lkr > 0) { g.lkrSum += r.lkr; g.lkrCount++; }
      g.margin.push(Number(r.marginPercent ?? 0));
    });
    return [...map.values()]
      .map((g) => ({
        ...g,
        avgMargin: g.margin.length > 0 ? g.margin.reduce((s, v) => s + v, 0) / g.margin.length : 0,
        avgLkr: g.lkrCount > 0 ? g.lkrSum / g.lkrCount : 0,
      }))
      .sort((a, b) => (b.totalWebProfitLkr ?? 0) - (a.totalWebProfitLkr ?? 0));
  }, [pricingRows]);

  // ── Group by dispatch → box ───────────────────────────────────────────────
  const lkrFmt = (v) => v > 0 ? `Rs ${Number(v).toLocaleString("en-LK", { maximumFractionDigits: 0 })}` : null;

  const byDispatch = useMemo(() => {
    const map = new Map();
    pricingRows.forEach((r) => {
      if (!map.has(r.dispatchReference)) {
        map.set(r.dispatchReference, { dispatchReference: r.dispatchReference, dispatchDate: r.dispatchDate, boxes: new Map(), totalCost: 0, totalCostLkr: 0 });
      }
      const d = map.get(r.dispatchReference);
      d.totalCost    += r.totalCost;
      d.totalCostLkr += r.approvedQuantity * r.lkr;
      const boxKey = r.boxNumber ?? 0;
      if (!d.boxes.has(boxKey)) d.boxes.set(boxKey, { boxNumber: boxKey, items: [], totalCost: 0, totalCostLkr: 0 });
      const b = d.boxes.get(boxKey);
      b.items.push(r);
      b.totalCost    += r.totalCost;
      b.totalCostLkr += r.approvedQuantity * r.lkr;
    });
    return [...map.values()]
      .map((d) => ({ ...d, boxes: [...d.boxes.values()].sort((a, b) => a.boxNumber - b.boxNumber) }))
      .sort((a, b) => (b.dispatchDate ?? "").localeCompare(a.dispatchDate ?? ""));
  }, [pricingRows]);

  // ── Brand filter (By Product view) ───────────────────────────────────────
  const brands = useMemo(() =>
    [...new Set(pricingRows.map(r => r.brandName).filter(Boolean))].sort(),
  [pricingRows]);

  const filteredByProduct = useMemo(() =>
    brandFilter ? byProduct.filter(p => p.brandName === brandFilter) : byProduct,
  [byProduct, brandFilter]);

  const productTotals = useMemo(() => filteredByProduct.reduce((acc, p) => {
    const ukPu       = p.qty > 0 ? p.totalUkCost      / p.qty : 0;
    const logPu      = p.qty > 0 ? p.totalLogCost     / p.qty : 0;
    const costPu     = p.qty > 0 ? p.totalCost         / p.qty : 0;
    const wsPu       = p.qty > 0 ? p.totalWsRevLkr    / p.qty : 0;
    const webPu      = p.qty > 0 ? p.totalWebRevLkr   / p.qty : 0;
    const wsProfitPu = p.wsLkrCount  > 0 && p.qty > 0 ? p.totalWsProfitLkr  / p.qty : 0;
    const webProfitPu= p.webLkrCount > 0 && p.qty > 0 ? p.totalWebProfitLkr / p.qty : 0;
    return {
      qty:             acc.qty             + p.qty,
      ukPu:            acc.ukPu            + ukPu,
      logPu:           acc.logPu           + logPu,
      costPu:          acc.costPu          + costPu,
      avgLkr:          acc.avgLkr          + p.avgLkr,
      wsPu:            acc.wsPu            + wsPu,
      wsProfitPu:      acc.wsProfitPu      + wsProfitPu,
      wsProfitLkr:     acc.wsProfitLkr     + p.totalWsProfitLkr,
      webPu:           acc.webPu           + webPu,
      webProfitPu:     acc.webProfitPu     + webProfitPu,
      webProfitLkr:    acc.webProfitLkr    + p.totalWebProfitLkr,
      marginSum:       acc.marginSum        + p.avgMargin,
      count:           acc.count            + 1,
    };
  }, { qty:0, ukPu:0, logPu:0, costPu:0, avgLkr:0, wsPu:0, wsProfitPu:0, wsProfitLkr:0, webPu:0, webProfitPu:0, webProfitLkr:0, marginSum:0, count:0 }),
  [filteredByProduct]);

  // ── KPIs ─────────────────────────────────────────────────────────────────
  const totalCostAll    = pricingRows.reduce((s, r) => s + r.totalCost, 0);          // sum(qty × cost/unit)
  const totalWsProfLkr  = pricingRows.reduce((s, r) => s + (r.totalWsProfitLkr ?? 0), 0);
  const totalWebProfLkr = pricingRows.reduce((s, r) => s + (r.totalWebProfitLkr ?? 0), 0);
  const avgMarginAll    = pricingRows.length ? pricingRows.reduce((s, r) => s + Number(r.marginPercent ?? 0), 0) / pricingRows.length : 0;
  const rsKpi = (v) => `Rs ${Number(v || 0).toLocaleString("en-LK", { maximumFractionDigits: 0 })}`;

  if (loading) return <Spinner />;
  if (!pricingRows.length) return (
    <div className="rounded-3xl border border-slate-200 bg-white p-14 text-center">
      <TrendingUp size={32} className="mx-auto mb-3 text-slate-300" />
      <p className="font-semibold text-slate-600">No pricing data yet</p>
      <p className="mt-1 text-sm text-slate-400">Approve pricing for arrival items to see profitability here.</p>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <KpiCard icon={Package}    label="Total products"        value={byProduct.length}             color="teal" />
        <KpiCard icon={TrendingUp} label="Total products cost"  value={gbp(totalCostAll)}            color="indigo" />
        <KpiCard icon={ShoppingBag}label="Wholesale profit"     value={rsKpi(totalWsProfLkr)}        color="amber" />
        <KpiCard icon={BarChart2}  label="Website sale profit"  value={rsKpi(totalWebProfLkr)}       color="emerald" />
        <KpiCard icon={Truck}      label="Avg margin"           value={`${avgMarginAll.toFixed(1)}%`} color="rose" />
      </div>

      {/* View toggle */}
      <div className="flex gap-2">
        {[
          { id: "product",  label: "By Product",          icon: Package },
          { id: "dispatch", label: "By Dispatch & Box",   icon: Archive },
        ].map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setView(id)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl border transition ${
              view === id ? "bg-tenzy-teal text-white border-tenzy-teal" : "bg-white text-slate-600 border-slate-200 hover:border-tenzy-teal hover:text-tenzy-teal"
            }`}>
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {/* ── By Product ── */}
      {view === "product" && (
        <div className="space-y-3">
          {/* Brand filter */}
          <div className="flex items-center gap-3">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide shrink-0">Brand</label>
            <select
              value={brandFilter}
              onChange={e => setBrandFilter(e.target.value)}
              className="rounded-xl border border-tenzy-orange/50 bg-white px-3 py-2 text-sm outline-none focus:border-tenzy-orange focus:ring-2 focus:ring-tenzy-orange/20"
            >
              <option value="">All brands</option>
              {brands.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
            {brandFilter && (
              <button onClick={() => setBrandFilter("")} className="text-xs text-slate-400 hover:text-slate-600 underline">Clear</button>
            )}
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3">Product / Variant</th>
                  <th className="text-right px-3 py-3">Qty</th>
                  <th className="text-right px-3 py-3">Buy £/unit</th>
                  <th className="text-right px-3 py-3 text-indigo-500">Logistics £/unit</th>
                  <th className="text-right px-3 py-3 font-bold text-slate-700">Total £/unit</th>
                  <th className="text-right px-3 py-3 font-bold text-slate-700">Total LKR/unit</th>
                  <th className="text-right px-3 py-3 text-amber-600">Wholesale Rs</th>
                  <th className="text-right px-3 py-3 text-amber-700">WS Profit Rs</th>
                  <th className="text-right px-3 py-3 text-teal-600">Website Rs</th>
                  <th className="text-right px-3 py-3 text-emerald-600">Web Profit Rs</th>
                  <th className="text-right px-3 py-3">Margin</th>
                </tr>
              </thead>
              <tbody>
                {filteredByProduct.map((p) => {
                  const isOpen = expandedProduct === p.productId;
                  return (
                    <>
                      {/* ── Product summary row — click to expand ── */}
                      <tr key={`prod-${p.productId}`}
                        onClick={() => setExpandedProduct(isOpen ? null : p.productId)}
                        className="border-b border-slate-200 cursor-pointer hover:bg-slate-50 transition bg-white">
                        <td className="px-4 py-3" colSpan={10}>
                          <div className="flex items-center gap-2">
                            <span className={`text-slate-400 text-[10px] transition-transform inline-block ${isOpen ? "rotate-90" : ""}`}>▶</span>
                            <p className="font-bold text-slate-800">{p.productName}</p>
                            <span className="text-xs text-slate-400">{p.brandName}</span>
                            <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                              {p.variants.length} variant{p.variants.length !== 1 ? "s" : ""}
                            </span>
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                              {p.qty} units total
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-right">
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${p.avgMargin >= 30 ? "bg-emerald-100 text-emerald-700" : p.avgMargin >= 15 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-600"}`}>
                            {p.avgMargin.toFixed(1)}% avg
                          </span>
                        </td>
                      </tr>
                      {/* ── Variant detail rows ── */}
                      {isOpen && p.variants.map((v) => {
                        const ukCost    = Number(v.ukCost    || 0);
                        const logCost   = Number(v.logCost   || 0);
                        const totalCostGbp = (ukCost + logCost) * v.approvedQuantity;
                        const lkr       = Number(v.lkr       || 0);
                        const ws        = Number(v.wholesale  || 0);
                        const web       = Number(v.website    || 0);
                        const wsProfit  = v.totalWsProfitLkr;
                        const webProfit = v.totalWebProfitLkr;
                        const margin    = Number(v.marginPercent || 0);
                        return (
                          <tr key={`var-${v.pricingId}`} className="border-b border-teal-100/50 bg-teal-50/20 hover:bg-teal-50/40 transition">
                            <td className="px-4 py-2.5 pl-10">
                              <p className="text-[11px] text-slate-400">{v.productName}</p>
                              <p className="text-sm font-semibold text-tenzy-teal">{v.variantName || v.productName}</p>
                              <p className="text-[10px] text-slate-400 mt-0.5">{v.dispatchReference}</p>
                            </td>
                            <td className="px-3 py-2.5 text-right text-sm font-semibold text-slate-700">{v.approvedQuantity}</td>
                            <td className="px-3 py-2.5 text-right text-xs text-slate-600">{ukCost > 0 ? gbp(ukCost) : "—"}</td>
                            <td className="px-3 py-2.5 text-right text-xs text-indigo-600">{logCost > 0 ? gbp(logCost) : "—"}</td>
                            <td className="px-3 py-2.5 text-right text-xs font-bold text-slate-800">{(ukCost + logCost) > 0 ? gbp(ukCost + logCost) : "—"}</td>
                            <td className="px-3 py-2.5 text-right text-xs font-bold text-slate-800">{lkr > 0 ? lkrFmt(lkr) : "—"}</td>
                            <td className="px-3 py-2.5 text-right text-xs text-amber-700">{ws > 0 ? lkrFmt(ws) : "—"}</td>
                            <td className="px-3 py-2.5 text-right text-xs text-amber-600 font-semibold">{wsProfit != null ? lkrFmt(wsProfit) : "—"}</td>
                            <td className="px-3 py-2.5 text-right text-xs text-teal-700">{web > 0 ? lkrFmt(web) : "—"}</td>
                            <td className="px-3 py-2.5 text-right text-xs text-emerald-600 font-bold">{webProfit != null ? lkrFmt(webProfit) : "—"}</td>
                            <td className="px-3 py-2.5 text-right">
                              {margin > 0 ? (
                                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${margin >= 30 ? "bg-emerald-100 text-emerald-700" : margin >= 15 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-600"}`}>
                                  {margin.toFixed(1)}%
                                </span>
                              ) : "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </>
                  );
                })}
              </tbody>
              <tfoot className="bg-slate-50 border-t-2 border-slate-200 text-xs font-bold">
                <tr>
                  <td className="px-4 py-3 text-slate-700 text-sm">Total</td>
                  <td className="px-3 py-3 text-right text-slate-800 text-sm">{productTotals.qty}</td>
                  <td className="px-3 py-3 text-right text-slate-600">{productTotals.ukPu > 0 ? gbp(productTotals.ukPu) : "—"}</td>
                  <td className="px-3 py-3 text-right text-indigo-600">{productTotals.logPu > 0 ? gbp(productTotals.logPu) : "—"}</td>
                  <td className="px-3 py-3 text-right text-slate-800">{productTotals.costPu > 0 ? gbp(productTotals.costPu) : "—"}</td>
                  <td className="px-3 py-3 text-right text-slate-600">{productTotals.avgLkr > 0 ? `Rs ${Math.round(productTotals.avgLkr).toLocaleString("en-LK")}` : "—"}</td>
                  <td className="px-3 py-3 text-right text-amber-700">{productTotals.wsPu > 0 ? lkrFmt(productTotals.wsPu) : "—"}</td>
                  <td className="px-3 py-3 text-right text-amber-600">{productTotals.wsProfitPu > 0 ? lkrFmt(productTotals.wsProfitPu) : "—"}</td>
                  <td className="px-3 py-3 text-right text-amber-700">{productTotals.wsProfitLkr > 0 ? lkrFmt(productTotals.wsProfitLkr) : "—"}</td>
                  <td className="px-3 py-3 text-right text-teal-700">{productTotals.webPu > 0 ? lkrFmt(productTotals.webPu) : "—"}</td>
                  <td className="px-3 py-3 text-right text-teal-600">{productTotals.webProfitPu > 0 ? lkrFmt(productTotals.webProfitPu) : "—"}</td>
                  <td className="px-3 py-3 text-right text-emerald-700">{productTotals.webProfitLkr > 0 ? lkrFmt(productTotals.webProfitLkr) : "—"}</td>
                  <td className="px-3 py-3 text-right text-slate-600">{productTotals.count > 0 ? (productTotals.marginSum / productTotals.count).toFixed(1) + "%" : "—"}</td>
                </tr>
              </tfoot>
            </table>
          </div>
          </div>
        </div>
      )}

      {/* ── By Dispatch & Box ── */}
      {view === "dispatch" && (
        <div className="space-y-3">
          {byDispatch.map((d) => {
            const isOpen = openDispatch === d.dispatchReference;
            return (
              <div key={d.dispatchReference} className="rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
                {/* Dispatch header */}
                <button onClick={() => { setOpenDispatch(isOpen ? null : d.dispatchReference); setOpenBox(null); }}
                  className="w-full flex items-center gap-4 px-5 py-4 text-left bg-white hover:bg-slate-50/60 transition">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Truck size={14} className="text-tenzy-teal shrink-0" />
                      <p className="font-bold text-slate-900">{d.dispatchReference}</p>
                      <span className="text-xs text-slate-400">{d.dispatchDate?.slice(0, 10)}</span>
                      <span className="text-xs text-slate-500">· {d.boxes.length} box{d.boxes.length !== 1 ? "es" : ""}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-5 shrink-0 text-sm">
                    <div className="text-right">
                      <p className="text-xs text-slate-400">Total Box Cost (GBP)</p>
                      <p className="font-bold text-slate-800">{gbp(d.totalCost)}</p>
                    </div>
                    {d.totalCostLkr > 0 && (
                      <div className="text-right hidden sm:block">
                        <p className="text-xs text-slate-400">Total Box Cost (LKR)</p>
                        <p className="font-bold text-indigo-700">{lkrFmt(d.totalCostLkr)}</p>
                      </div>
                    )}
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${isOpen ? "bg-tenzy-teal text-white" : "bg-slate-100 text-slate-400"}`}>
                      {isOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                    </div>
                  </div>
                </button>

                {/* Boxes inside dispatch */}
                {isOpen && (
                  <div className="border-t border-slate-100 divide-y divide-slate-50 bg-slate-50/30">
                    {d.boxes.map((b) => {
                      const boxKey = `${d.dispatchReference}-${b.boxNumber}`;
                      const isBoxOpen = openBox === boxKey;
                      const boxLabel = b.boxNumber > 0 ? `Box ${b.boxNumber}` : "Unassigned";
                      return (
                        <div key={boxKey}>
                          {/* Box row */}
                          <button onClick={() => setOpenBox(isBoxOpen ? null : boxKey)}
                            className="w-full flex items-center gap-3 px-6 py-3 text-left bg-white/60 hover:bg-white transition">
                            <div className="w-9 h-9 rounded-xl border border-slate-200 bg-white flex flex-col items-center justify-center shrink-0 shadow-sm">
                              <Archive size={12} className="text-indigo-500" />
                              <span className="text-[8px] font-bold text-slate-500">{b.boxNumber > 0 ? `B${b.boxNumber}` : "—"}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-slate-800">{boxLabel}</p>
                              <p className="text-xs text-slate-500">{b.items.length} product{b.items.length !== 1 ? "s" : ""} · {b.items.reduce((s, i) => s + i.approvedQuantity, 0)} units</p>
                            </div>
                            <div className="flex items-center gap-4 shrink-0 text-xs">
                              <div className="text-right">
                                <p className="text-slate-400">Total Box Cost (£)</p>
                                <p className="font-bold text-slate-800">{gbp(b.totalCost)}</p>
                              </div>
                              {b.totalCostLkr > 0 && (
                                <div className="text-right hidden sm:block">
                                  <p className="text-slate-400">Total Box Cost (LKR)</p>
                                  <p className="font-bold text-indigo-700">{lkrFmt(b.totalCostLkr)}</p>
                                </div>
                              )}
                              <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${isBoxOpen ? "bg-indigo-500 text-white" : "bg-slate-100 text-slate-400"}`}>
                                {isBoxOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                              </div>
                            </div>
                          </button>

                          {/* Products inside box */}
                          {isBoxOpen && (
                            <div className="bg-white border-t border-slate-100">
                              <table className="w-full text-xs">
                                <thead className="bg-slate-50 text-[10px] text-slate-400 uppercase border-b border-slate-100">
                                  <tr>
                                    <th className="text-left px-5 py-2.5">Product</th>
                                    <th className="text-right px-3 py-2.5">Units</th>
                                    <th className="text-right px-3 py-2.5">UK Purchase</th>
                                    <th className="text-right px-3 py-2.5 text-indigo-500">Logistics</th>
                                    <th className="text-right px-3 py-2.5 text-slate-600 font-bold">Cost (£)</th>
                                    <th className="text-right px-3 py-2.5 text-slate-500">Cost (LKR)</th>
                                    <th className="text-right px-3 py-2.5 text-amber-500">Wholesale</th>
                                    <th className="text-right px-3 py-2.5 text-amber-500">WS profit/unit</th>
                                    <th className="text-right px-3 py-2.5 text-amber-600">WS profit (LKR)</th>
                                    <th className="text-right px-3 py-2.5 text-teal-500">Website price</th>
                                    <th className="text-right px-3 py-2.5 text-teal-500">Web profit/unit</th>
                                    <th className="text-right px-3 py-2.5 text-emerald-600">Web profit (LKR)</th>
                                    <th className="text-right px-3 py-2.5">Margin</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                  {b.items.map((item, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50/60 transition">
                                      <td className="px-5 py-2.5">
                                        <p className="font-semibold text-slate-800">{itemName(item)}</p>
                                        <p className="text-slate-400 text-[10px]">{item.brandName}</p>
                                      </td>
                                      <td className="px-3 py-2.5 text-right font-semibold text-slate-700">{item.approvedQuantity}</td>
                                      <td className="px-3 py-2.5 text-right text-slate-600">{gbp(item.ukCost)}</td>
                                      <td className="px-3 py-2.5 text-right text-indigo-600">{gbp(item.logCost)}</td>
                                      <td className="px-3 py-2.5 text-right font-semibold text-slate-800">{gbp(item.landed)}</td>
                                      <td className="px-3 py-2.5 text-right text-slate-600">
                                        {item.lkr > 0 ? `Rs ${Number(item.lkr).toLocaleString("en-LK", { maximumFractionDigits: 0 })}` : <span className="text-slate-300">—</span>}
                                      </td>
                                      <td className="px-3 py-2.5 text-right text-amber-700">{item.wholesale > 0 ? lkrFmt(item.wholesale) : <span className="text-slate-300">—</span>}</td>
                                      <td className="px-3 py-2.5 text-right text-amber-500">{item.wsProfitPerUnitLkr != null ? lkrFmt(item.wsProfitPerUnitLkr) : <span className="text-slate-300">—</span>}</td>
                                      <td className="px-3 py-2.5 text-right font-semibold text-amber-700">
                                        {item.totalWsProfitLkr != null ? lkrFmt(item.totalWsProfitLkr) : <span className="text-slate-300">—</span>}
                                      </td>
                                      <td className="px-3 py-2.5 text-right text-teal-700">{item.website > 0 ? lkrFmt(item.website) : <span className="text-slate-300">—</span>}</td>
                                      <td className="px-3 py-2.5 text-right text-teal-500">{item.webProfitPerUnitLkr != null ? lkrFmt(item.webProfitPerUnitLkr) : <span className="text-slate-300">—</span>}</td>
                                      <td className="px-3 py-2.5 text-right font-bold text-emerald-600">
                                        {item.totalWebProfitLkr != null ? lkrFmt(item.totalWebProfitLkr) : <span className="text-slate-300">—</span>}
                                      </td>
                                      <td className="px-3 py-2.5 text-right">
                                        <span className={`rounded-full px-2 py-0.5 font-semibold ${Number(item.marginPercent) >= 30 ? "bg-emerald-100 text-emerald-700" : Number(item.marginPercent) >= 15 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-600"}`}>
                                          {Number(item.marginPercent).toFixed(1)}%
                                        </span>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                                <tfoot className="bg-slate-50 border-t border-slate-100 text-xs font-bold">
                                  <tr>
                                    <td className="px-6 py-2 text-slate-600">Box total</td>
                                    <td className="px-3 py-2 text-right text-slate-700">{b.items.reduce((s, i) => s + i.approvedQuantity, 0)}</td>
                                    <td colSpan={2} />
                                    <td className="px-3 py-2 text-right text-slate-800">{gbp(b.totalCost)}</td>
                                    <td className="px-3 py-2 text-right text-indigo-700">{b.totalCostLkr > 0 ? lkrFmt(b.totalCostLkr) : "—"}</td>
                                    <td colSpan={7} />
                                  </tr>
                                </tfoot>
                              </table>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── Main Page ────────────────────────────────────────────────────────────── */
const TABS = [
  { id: "purchase", label: "UK Purchase",    icon: ShoppingBag },
  { id: "card",     label: "Card Charges",   icon: CreditCard  },
  { id: "dispatch", label: "Dispatch",       icon: Truck },
  { id: "pricing",  label: "Pricing",        icon: TrendingUp  },
  { id: "monthly",  label: "Monthly",        icon: Calendar },
];


const MONTHLY_FIELDS = [
  { key: "summaryMonth",             label: "Month",      width: 10 },
  { key: "totalShipments",           label: "Shipments",  width: 10 },
  { key: "totalProductsDispatched",  label: "Products",   width: 10 },
  { key: "totalProductCost",         label: "Product £",  width: 14 },
  { key: "totalShipmentCost",        label: "Total £",    width: 14 },
];

function formatRow(row) {
  return Object.fromEntries(Object.entries(row).map(([k, v]) => {
    if (v == null) return [k, "—"];
    if (typeof v === "string" && /\d{4}-\d{2}-\d{2}T/.test(v)) return [k, v.slice(0, 10)];
    const lk = k.toLowerCase();
    if (typeof v === "number" && (lk.includes("cost") || lk.includes("charge") || lk.includes("total") || lk.includes("price") || lk.includes("net") || lk.includes("spend") || lk.includes("amount")))
      return [k, `£${v.toFixed(2)}`];
    return [k, String(v)];
  }));
}

export default function Reports() {
  const [activeTab, setActiveTab]       = useState("purchase");
  const [procurementRows, setProcurementRows] = useState([]);
  const [dispatchRows,    setDispatchRows]    = useState([]);
  const [monthlyRows,     setMonthlyRows]     = useState([]);
  const [pricingRows,     setPricingRows]     = useState([]);
  const [loading, setLoading]           = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [proc, disp, monthly, pricing] = await Promise.all([
        supplyChainApi.getProcurementReport({}),
        supplyChainApi.getDispatchReport({}),
        supplyChainApi.getMonthlyDispatchSummary({}),
        supplyChainApi.getPricingReport(),
      ]);
      setProcurementRows(proc    ?? []);
      setDispatchRows(disp       ?? []);
      setMonthlyRows(monthly     ?? []);
      setPricingRows(pricing     ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  const exportPdf = (kind, rows, fieldsOverride) => {
    const fieldMap = { procurement: PROCUREMENT_EXPORT_FIELDS, card: CARD_CHARGES_EXPORT_FIELDS, dispatch: DISPATCH_EXPORT_FIELDS, monthly: MONTHLY_FIELDS };
    const fields = fieldsOverride ?? fieldMap[kind] ?? PROCUREMENT_EXPORT_FIELDS;
    downloadSimplePdf({
      fileName: `tenzy-${kind}-report.pdf`,
      title: `Tenzy ${kind} report`,
      subtitle: `Generated ${new Date().toISOString().slice(0, 10)}`,
      columns: fields,
      rows: rows.map((row) => {
        const formatted = formatRow(row);
        fields.forEach((field) => {
          if (field.format) formatted[field.key] = field.format(row);
        });
        return formatted;
      }),
    });
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Business Reports</h1>
          <p className="text-sm text-slate-500 mt-1">Track purchases, dispatches and profitability across all products.</p>
        </div>
        <button onClick={load}
          className="flex items-center gap-2 px-4 py-2 border border-slate-200 bg-white rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition shadow-sm">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-2xl border border-tenzy-orange/50 bg-white p-1 overflow-x-auto">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition whitespace-nowrap ${
                activeTab === tab.id ? "bg-tenzy-teal text-white shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <Icon size={14} />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {activeTab === "purchase"  && <UKPurchaseTab  rows={procurementRows} loading={loading} onExport={exportPdf} />}
      {activeTab === "card"      && <CardChargesTab  rows={procurementRows} loading={loading} onExport={exportPdf} />}
      {activeTab === "dispatch"  && <DispatchTab     rows={dispatchRows}    loading={loading} onExport={exportPdf} />}
      {activeTab === "pricing"   && <PricingTab      rows={pricingRows}     loading={loading} />}
      {activeTab === "monthly"   && <MonthlyTab      rows={monthlyRows}     loading={loading} onExport={exportPdf} />}
    </div>
  );
}
