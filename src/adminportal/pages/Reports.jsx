import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  BarChart2, Calendar, ChevronLeft, ChevronRight, Download, Eye,
  Filter, Package, RefreshCw, ShoppingBag, Truck, TrendingUp, X,
  ChevronDown, ChevronUp,
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

/* ── tiny UI helpers ─────────────────────────────────────────────────────── */
const Input = (props) => (
  <input {...props} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-tenzy-teal focus:ring-2 focus:ring-tenzy-teal/20" />
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
        <div><Label>Category</Label><Input value={filters.category} onChange={(e) => onChange({ ...filters, category: e.target.value })} placeholder="Any category" /></div>
        <div>
          <Label>Shipment status</Label>
          <select value={filters.shipmentStatus} onChange={(e) => onChange({ ...filters, shipmentStatus: e.target.value })}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-tenzy-teal/20 focus:border-tenzy-teal">
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
function UKPurchaseTab({ rows, dispatchRows, loading, onExport }) {
  const [page, setPage] = useState(1);
  const [showCharts, setShowCharts] = useState(false);
  const [modal, setModal] = useState(null); // { ref, items }

  // Build dispatch lookup: procurementItemId → dispatch status
  const dispatchedQtyByItemId = useMemo(() => {
    const map = {};
    (dispatchRows ?? []).forEach((row) => {
      // The dispatch report row has procurementItemId if the API includes it
      if (row.procurementItemId) {
        map[row.procurementItemId] = (map[row.procurementItemId] ?? 0) + Number(row.quantityDispatched ?? 0);
      }
    });
    return map;
  }, [dispatchRows]);

  // Group flat rows by procurementReference
  const groups = useMemo(() => {
    const map = new Map();
    (rows ?? []).forEach((row) => {
      const key = row.procurementReference ?? row.procurementId ?? "Unknown";
      if (!map.has(key)) {
        map.set(key, {
          reference: key,
          purchaseDate: row.purchaseDate,
          shopName: row.shopName,
          items: [],
          totalSpend: 0,
          totalOrderedQty: 0,
          totalDispatchedQty: 0,
        });
      }
      const g = map.get(key);
      g.items.push(row);
      g.totalSpend += Number(row.netTotal ?? 0);
      g.totalOrderedQty += Number(row.quantity ?? 0);
      g.totalDispatchedQty += Number(dispatchedQtyByItemId[row.procurementItemId] ?? 0);
    });
    return [...map.values()]
      .map((group) => ({
        ...group,
        dispatchStatus: getPurchaseDispatchStatus(group.totalOrderedQty, group.totalDispatchedQty),
      }))
      .sort((a, b) => (b.purchaseDate ?? "").localeCompare(a.purchaseDate ?? ""));
  }, [dispatchedQtyByItemId, rows]);

  const totalPages = Math.ceil(groups.length / PAGE_SIZE);
  const pageGroups = groups.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // KPIs
  const totalSpend = groups.reduce((s, g) => s + g.totalSpend, 0);
  const totalItems = rows.length;
  const uniqueShops = new Set((rows ?? []).map((r) => r.shopName)).size;

  // Chart data
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
    { key: "productName",  label: "Product",   render: (r) => <span className="font-semibold text-slate-800">{r.productName}</span> },
    { key: "brandName",    label: "Brand" },
    { key: "categoryName", label: "Category" },
    { key: "quantity",     label: "Qty",        right: true, render: (r) => <span className="font-semibold">{r.quantity}</span> },
    { key: "unitPrice",    label: "Gross Unit £",right: true, render: (r) => gbp(r.unitPrice) },
    {
      key: "discountTotal", label: "Discount £", right: true,
      render: (r) => (r.discountTotal ?? 0) > 0
        ? <span className="text-red-500 font-semibold">-{gbp(r.discountTotal)}</span>
        : <span className="text-slate-400">—</span>,
    },
    { key: "netUnitCost",  label: "Net Unit £", right: true, render: (r) => gbp(r.netUnitCost) },
    { key: "netTotal",     label: "Net Total £",right: true, render: (r) => <span className="font-bold text-slate-900">{gbp(r.netTotal)}</span> },
    {
      key: "_dispatchStatus",
      label: "Dispatch",
      render: (r) => {
        const status = getPurchaseDispatchStatus(
          r.quantity,
          r.procurementItemId ? (dispatchedQtyByItemId[r.procurementItemId] ?? 0) : 0
        );
        return (
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${DISPATCH_STATUS_BADGE[status] ?? DISPATCH_STATUS_BADGE.pending_dispatch}`}>
            {getPurchaseDispatchLabel(status)}
          </span>
        );
      },
    },
  ];

  if (loading) return <Spinner />;

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard icon={ShoppingBag}  label="Purchase records"  value={groups.length}          color="teal" />
        <KpiCard icon={Package}      label="Total items"        value={totalItems}             color="indigo" />
        <KpiCard icon={TrendingUp}   label="Unique shops"       value={uniqueShops}            color="amber" />
        <KpiCard icon={BarChart2}    label="Total spend (GBP)"  value={gbp(totalSpend)}        color="rose" />
      </div>

      {/* Charts toggle */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-slate-700">{groups.length} purchase records</p>
        <div className="flex gap-2">
          <button onClick={() => setShowCharts((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border transition ${showCharts ? "bg-tenzy-teal text-white border-tenzy-teal" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
            <BarChart2 size={13} /> {showCharts ? "Hide charts" : "Show charts"}
          </button>
          <button onClick={() => onExport("procurement", rows)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-tenzy-teal text-white rounded-xl hover:opacity-90 transition">
            <Download size={13} /> Export PDF
          </button>
        </div>
      </div>

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

      {/* Grouped table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide border-b border-slate-200">
              <tr>
                <th className="text-left px-5 py-3">Reference</th>
                <th className="text-left px-5 py-3">Date</th>
                <th className="text-left px-5 py-3">Shop</th>
                <th className="text-right px-5 py-3">Items</th>
                <th className="text-right px-5 py-3">Total spend (GBP)</th>
                <th className="text-left px-5 py-3">Dispatch</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pageGroups.length === 0 && (
                <tr><td colSpan={7} className="px-5 py-10 text-center text-slate-400">No purchase records found.</td></tr>
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
                  <td className="px-5 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${DISPATCH_STATUS_BADGE[g.dispatchStatus] ?? DISPATCH_STATUS_BADGE.pending_dispatch}`}>
                      {getPurchaseDispatchLabel(g.dispatchStatus)}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => setModal({ title: `${g.reference} — ${g.shopName}`, subtitle: `${date(g.purchaseDate)} · ${g.items.length} items · ${gbp(g.totalSpend)} total`, items: g.items })}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-tenzy-teal hover:text-tenzy-teal transition"
                    >
                      <Eye size={12} /> View items
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-t border-slate-100">
          <Pagination page={page} totalPages={totalPages} onChange={setPage} />
        </div>
      </div>

      {modal && (
        <ItemsModal
          title={modal.title}
          subtitle={modal.subtitle}
          columns={itemColumns}
          rows={modal.items}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}

/* ── DISPATCH TAB ─────────────────────────────────────────────────────────── */
function DispatchTab({ rows, loading, onExport }) {
  const [page, setPage] = useState(1);
  const [showCharts, setShowCharts] = useState(false);
  const [modal, setModal] = useState(null);

  // Group by dispatchReference
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
          items: [],
          totalProductCost: 0,
          totalShipmentCharge: 0,
          totalQty: 0,
        });
      }
      const g = map.get(key);
      g.items.push(row);
      g.totalProductCost += Number(row.productCost ?? 0);
      // totalShipmentCharge is a box-level charge (same for all rows in a shipment) — only read it once
      if (g.items.length === 1) g.totalShipmentCharge = Number(row.totalShipmentCharge ?? 0);
      g.totalQty += Number(row.quantityDispatched ?? 0);
    });
    return [...map.values()].sort((a, b) => (b.dispatchDate ?? "").localeCompare(a.dispatchDate ?? ""));
  }, [rows]);

  const totalPages = Math.ceil(groups.length / PAGE_SIZE);
  const pageGroups = groups.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // KPIs
  const totalProductCost   = groups.reduce((s, g) => s + g.totalProductCost, 0);
  const totalCourierCost   = groups.reduce((s, g) => s + g.totalShipmentCharge, 0);
  const totalCombinedCost  = totalProductCost + totalCourierCost;
  const totalQty           = groups.reduce((s, g) => s + g.totalQty, 0);

  // Charts
  const courierChartData = useMemo(() => {
    const map = {};
    (rows ?? []).forEach((r) => { map[r.courierName || "Unknown"] = (map[r.courierName || "Unknown"] || 0) + (r.quantityDispatched ?? 0); });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [rows]);

  const costBreakdownData = useMemo(() => [
    { name: "Product cost",  value: +totalProductCost.toFixed(2) },
    { name: "Courier cost",  value: +totalCourierCost.toFixed(2) },
  ], [totalProductCost, totalCourierCost]);

  // Per-unit courier = box-level charge ÷ total qty dispatched in that box
  const perUnit = (charge, row) => (row._groupTotalQty > 0 ? (charge ?? 0) / row._groupTotalQty : 0);
  // Net unit cost comes directly from API (netUnitCost) or falls back to productCost / qty
  const unitCost = (r) => r.netUnitCost ?? (r.productCost && r.quantityDispatched ? r.productCost / r.quantityDispatched : 0);
  const hasDiscount = (r) => (r.discountTotal ?? 0) > 0;

  const itemColumns = [
    { key: "productName",      label: "Product",      render: (r) => <span className="font-semibold text-slate-800">{r.productName}</span> },
    { key: "brandName",        label: "Brand" },
    { key: "quantityDispatched", label: "Qty",        right: true, render: (r) => <span className="font-semibold">{r.quantityDispatched}</span> },
    { key: "unitPrice",        label: "Gross Unit £", right: true, render: (r) => (r.unitPrice ?? 0) > 0 ? gbp(r.unitPrice) : "—" },
    {
      key: "_discount", label: "Discount", right: false,
      render: (r) => hasDiscount(r) ? (
        <div className="leading-tight">
          {r.discountDescription && <span className="text-xs font-semibold text-amber-700">{r.discountDescription}</span>}
          <span className={`text-xs font-semibold text-red-500${r.discountDescription ? " ml-1.5" : ""}`}>-{gbp(r.discountTotal)}</span>
        </div>
      ) : <span className="text-slate-400">—</span>,
    },
    { key: "_unitCost",   label: "Net Unit £",  right: true, render: (r) => gbp(unitCost(r)) },
    { key: "_netTotal",   label: "Net Total £", right: true, render: (r) => <span className="font-bold text-slate-800">{gbp(unitCost(r) * (r.quantityDispatched ?? 0))}</span> },
    { key: "ukCourierCharge",       label: "UK Courier/unit £", right: true, render: (r) => gbp(perUnit(r.ukCourierCharge, r)) },
    { key: "sriLankaCourierCharge", label: "SL Courier/unit £", right: true, render: (r) => gbp(perUnit(r.sriLankaCourierCharge, r)) },
    { key: "taxCharge",             label: "Tax/unit £",        right: true, render: (r) => gbp(perUnit(r.taxCharge, r)) },
  ];

  const dispatchPdfCols = [
    { key: "productName",          label: "Product",         width: 18 },
    { key: "brandName",            label: "Brand",           width: 14 },
    { key: "quantityDispatched",   label: "Qty",             width: 5  },
    { key: "unitPrice",            label: "Gross Unit £",    width: 12, format: (r) => (r.unitPrice ?? 0) > 0 ? gbp(r.unitPrice) : "—" },
    { key: "_discount",            label: "Discount",        width: 22, format: (r) => hasDiscount(r) ? `${r.discountDescription ?? ""} -${gbp(r.discountTotal)}`.trim() : "—" },
    { key: "_unitCost",            label: "Net Unit £",      width: 11, format: (r) => gbp(unitCost(r)) },
    { key: "_netTotal",            label: "Net Total £",     width: 12, format: (r) => gbp(unitCost(r) * (r.quantityDispatched ?? 0)) },
    { key: "ukCourierCharge",      label: "UK Courier/unit", width: 16, format: (r) => gbp(perUnit(r.ukCourierCharge, r)) },
    { key: "sriLankaCourierCharge",label: "SL Courier/unit", width: 16, format: (r) => gbp(perUnit(r.sriLankaCourierCharge, r)) },
    { key: "taxCharge",            label: "Tax/unit £",      width: 12, format: (r) => gbp(perUnit(r.taxCharge, r)) },
  ];

  if (loading) return <Spinner />;

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard icon={Truck}      label="Dispatch records"     value={groups.length}         color="teal" />
        <KpiCard icon={Package}    label="Total units sent"     value={totalQty}              color="indigo" />
        <KpiCard icon={TrendingUp} label="Product cost (GBP)"   value={gbp(totalProductCost)} color="amber" />
        <KpiCard icon={BarChart2}  label="Total incl. courier"  value={gbp(totalCombinedCost)} color="rose" />
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-slate-700">{groups.length} dispatch records</p>
        <div className="flex gap-2">
          <button onClick={() => setShowCharts((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border transition ${showCharts ? "bg-tenzy-teal text-white border-tenzy-teal" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
            <BarChart2 size={13} /> {showCharts ? "Hide charts" : "Show charts"}
          </button>
          <button onClick={() => onExport("dispatch", rows)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-tenzy-teal text-white rounded-xl hover:opacity-90 transition">
            <Download size={13} /> Export PDF
          </button>
        </div>
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

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide border-b border-slate-200">
              <tr>
                <th className="text-left px-5 py-3">Reference</th>
                <th className="text-left px-5 py-3">Date</th>
                <th className="text-left px-5 py-3">Courier</th>
                <th className="text-left px-5 py-3">Parcel</th>
                <th className="text-center px-5 py-3">Status</th>
                <th className="text-right px-5 py-3">Units</th>
                <th className="text-right px-5 py-3">Product £</th>
                <th className="text-right px-5 py-3">Courier £</th>
                <th className="text-right px-5 py-3">Grand total £</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pageGroups.length === 0 && (
                <tr><td colSpan={10} className="px-5 py-10 text-center text-slate-400">No dispatch records found.</td></tr>
              )}
              {pageGroups.map((g) => (
                <tr key={g.reference} className="hover:bg-slate-50/60 transition">
                  <td className="px-5 py-3 font-semibold text-slate-800">{g.reference}</td>
                  <td className="px-5 py-3 text-slate-600">{date(g.dispatchDate)}</td>
                  <td className="px-5 py-3 text-slate-700">{g.courierName}</td>
                  <td className="px-5 py-3 text-slate-500 text-xs">{g.parcelNumber}</td>
                  <td className="px-5 py-3 text-center">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${DISPATCH_STATUS_BADGE[g.shipmentStatus] ?? "bg-slate-100 text-slate-600"}`}>
                      {cap(g.shipmentStatus)}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right text-slate-600">{g.totalQty}</td>
                  <td className="px-5 py-3 text-right text-slate-700">{gbp(g.totalProductCost)}</td>
                  <td className="px-5 py-3 text-right text-slate-700">{gbp(g.totalShipmentCharge)}</td>
                  <td className="px-5 py-3 text-right font-bold text-slate-900">{gbp(g.totalProductCost + g.totalShipmentCharge)}</td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => setModal({
                        title: `${g.reference}`,
                        subtitle: `${g.courierName} · ${date(g.dispatchDate)} · ${g.totalQty} units${g.notes ? ` · ${g.notes}` : ""}`,
                        items: g.items.map((item) => ({ ...item, _groupTotalQty: g.totalQty })),
                      })}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-tenzy-teal hover:text-tenzy-teal transition"
                    >
                      <Eye size={12} /> View items
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Total footer */}
        {groups.length > 0 && (
          <div className="border-t border-slate-200 px-5 py-3 flex items-center justify-end gap-8 text-sm bg-slate-50">
            <span className="text-slate-500">All records total:</span>
            <span className="text-slate-600">Product: <strong>{gbp(totalProductCost)}</strong></span>
            <span className="text-slate-600">Courier: <strong>{gbp(totalCourierCost)}</strong></span>
            <span className="font-bold text-slate-900">Grand total: {gbp(totalCombinedCost)}</span>
          </div>
        )}
        <div className="border-t border-slate-100">
          <Pagination page={page} totalPages={totalPages} onChange={setPage} />
        </div>
      </div>

      {modal && (
        <ItemsModal
          title={modal.title}
          subtitle={modal.subtitle}
          columns={itemColumns}
          rows={modal.items}
          onClose={() => setModal(null)}
          pdfExportCols={dispatchPdfCols}
        />
      )}
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

/* ── Main Page ────────────────────────────────────────────────────────────── */
const TABS = [
  { id: "purchase",  label: "UK Purchase",        icon: ShoppingBag },
  { id: "dispatch",  label: "Dispatch",            icon: Truck },
  { id: "monthly",   label: "Monthly Summary",     icon: Calendar },
];

const PROCUREMENT_FIELDS = [
  { key: "procurementReference", label: "Reference", width: 18 },
  { key: "purchaseDate",         label: "Date",       width: 12 },
  { key: "shopName",             label: "Shop",       width: 16 },
  { key: "productName",          label: "Product",    width: 20 },
  { key: "brandName",            label: "Brand",      width: 14 },
  { key: "quantity",             label: "Qty",        width: 6  },
  { key: "netTotal",             label: "Net GBP",    width: 12 },
];

const DISPATCH_FIELDS = [
  { key: "dispatchReference",     label: "Reference", width: 18 },
  { key: "dispatchDate",          label: "Date",      width: 12 },
  { key: "courierName",           label: "Courier",   width: 16 },
  { key: "productName",           label: "Product",   width: 20 },
  { key: "quantityDispatched",    label: "Qty",       width: 6  },
  { key: "totalShipmentCharge",   label: "Total £",   width: 10 },
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
    if (typeof v === "number" && (lk.includes("cost") || lk.includes("charge") || lk.includes("total") || lk.includes("price") || lk.includes("net")))
      return [k, `£${v.toFixed(2)}`];
    return [k, String(v)];
  }));
}

export default function Reports() {
  const [activeTab, setActiveTab] = useState("purchase");
  const [filters, setFilters] = useState({ startDate: "", endDate: "", shop: "", courier: "", brand: "", product: "", category: "", shipmentStatus: "" });
  const [procurementRows, setProcurementRows] = useState([]);
  const [dispatchRows,    setDispatchRows]    = useState([]);
  const [monthlyRows,     setMonthlyRows]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [applyTick, setApplyTick] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [proc, disp, monthly] = await Promise.all([
        supplyChainApi.getProcurementReport(filters),
        supplyChainApi.getDispatchReport(filters),
        supplyChainApi.getMonthlyDispatchSummary(filters),
      ]);
      setProcurementRows(proc    ?? []);
      setDispatchRows(disp       ?? []);
      setMonthlyRows(monthly     ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [applyTick]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  const exportPdf = (kind, rows) => {
    const fieldMap = { procurement: PROCUREMENT_FIELDS, dispatch: DISPATCH_FIELDS, monthly: MONTHLY_FIELDS };
    const fields = fieldMap[kind] ?? PROCUREMENT_FIELDS;
    downloadSimplePdf({
      fileName: `tenzy-${kind}-report.pdf`,
      title: `Tenzy ${kind === "procurement" ? "UK Purchase" : kind} report`,
      subtitle: `Generated ${new Date().toISOString().slice(0, 10)}`,
      columns: fields,
      rows: rows.map(formatRow),
    });
  };

  // Overall KPIs
  const totalPurchaseSpend = procurementRows.reduce((s, r) => s + (r.netTotal ?? 0), 0);
  const totalCourierCost   = monthlyRows.reduce((s, r) => s + (r.totalShipmentCost ?? 0), 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Supply Chain Reports</h1>
          <p className="text-sm text-slate-500 mt-1">Track every pound spent purchasing and shipping products to Sri Lanka.</p>
        </div>
        <button onClick={() => setApplyTick((t) => t + 1)}
          className="flex items-center gap-2 px-4 py-2 border border-slate-200 bg-white rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition shadow-sm">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Top-level KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard icon={ShoppingBag} label="UK purchase rows"    value={procurementRows.length}      color="teal" />
        <KpiCard icon={TrendingUp}  label="Total purchase spend" value={gbp(totalPurchaseSpend)}    color="indigo" />
        <KpiCard icon={Truck}       label="Dispatch rows"        value={dispatchRows.length}        color="amber" />
        <KpiCard icon={Calendar}    label="Total logistics cost"  value={gbp(totalCourierCost)}     color="rose" />
      </div>

      {/* Filters */}
      <Filters filters={filters} onChange={setFilters} onApply={() => setApplyTick((t) => t + 1)} />

      {/* Tabs */}
      <div className="flex gap-1 rounded-2xl border border-slate-200 bg-slate-50 p-1">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                activeTab === tab.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <Icon size={14} className={activeTab === tab.id ? "text-tenzy-teal" : ""} />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {activeTab === "purchase" && (
        <UKPurchaseTab rows={procurementRows} dispatchRows={dispatchRows} loading={loading} onExport={exportPdf} />
      )}
      {activeTab === "dispatch" && (
        <DispatchTab rows={dispatchRows} loading={loading} onExport={exportPdf} />
      )}
      {activeTab === "monthly" && (
        <MonthlyTab rows={monthlyRows} loading={loading} onExport={exportPdf} />
      )}
    </div>
  );
}
