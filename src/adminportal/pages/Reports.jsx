import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Download, Filter, RefreshCw, X, BarChart2, Package, Truck,
  Calendar, TrendingUp, ChevronLeft, ChevronRight, Eye,
} from "lucide-react";
import {
  PieChart, Pie, Cell, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
} from "recharts";
import { supplyChainApi } from "../../services/api";
import { downloadSimplePdf } from "../utils/simplePdf";

/* ── constants ───────────────────────────────────────────────────────────── */
const PAGE_SIZE = 20;

const COLORS = ["#0d9488", "#f59e0b", "#6366f1", "#ef4444", "#10b981", "#8b5cf6", "#ec4899", "#14b8a6"];

const PROCUREMENT_FIELDS = [
  { key: "procurementReference", label: "Reference",    width: 18 },
  { key: "purchaseDate",         label: "Date",         width: 12 },
  { key: "shopName",             label: "Shop",         width: 16 },
  { key: "productName",          label: "Product",      width: 20 },
  { key: "brandName",            label: "Brand",        width: 14 },
  { key: "categoryName",         label: "Category",     width: 14 },
  { key: "quantity",             label: "Qty",          width:  6 },
  { key: "netTotal",             label: "Net GBP",      width: 12 },
];

const DISPATCH_FIELDS = [
  { key: "dispatchReference",    label: "Reference",    width: 18 },
  { key: "dispatchDate",         label: "Date",         width: 12 },
  { key: "courierName",          label: "Courier",      width: 16 },
  { key: "productName",          label: "Product",      width: 20 },
  { key: "quantityDispatched",   label: "Qty",          width:  6 },
  { key: "ukCourierCharge",      label: "UK",           width: 10 },
  { key: "sriLankaCourierCharge", label: "SL",          width: 10 },
  { key: "taxCharge",            label: "Tax",          width: 10 },
  { key: "totalShipmentCharge",  label: "Total",        width: 10 },
];

const MONTHLY_FIELDS = [
  { key: "summaryMonth",             label: "Month",         width: 10 },
  { key: "totalShipments",           label: "Shipments",     width: 10 },
  { key: "totalProductsDispatched",  label: "Products",      width: 10 },
  { key: "totalProductCost",         label: "Products GBP",  width: 14 },
  { key: "totalUkCourierCost",       label: "UK",            width: 10 },
  { key: "totalSriLankaCourierCost", label: "SL",            width: 10 },
  { key: "totalTaxCharges",          label: "Tax",           width: 10 },
  { key: "totalShipmentCost",        label: "Charge Total",  width: 14 },
];

/* ── helpers ──────────────────────────────────────────────────────────────── */
function fmt(value, key = "") {
  if (value == null) return "—";
  if (typeof value === "string" && /\d{4}-\d{2}-\d{2}T/.test(value)) return value.slice(0, 10);
  const keyLc = key.toLowerCase();
  if (
    typeof value === "number" &&
    (keyLc.includes("cost") || keyLc.includes("charge") || keyLc.includes("total") || keyLc.includes("price") || keyLc.includes("net"))
  ) return `£${Number(value).toFixed(2)}`;
  return String(value);
}

function formatRow(row) {
  return Object.fromEntries(Object.entries(row).map(([k, v]) => [k, fmt(v, k)]));
}

/* ── UI helpers ───────────────────────────────────────────────────────────── */
const Input = (props) => (
  <input
    {...props}
    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-tenzy-teal focus:ring-2 focus:ring-tenzy-teal/20"
  />
);

const Label = ({ children }) => (
  <label className="mb-1 block text-xs font-semibold text-slate-500">{children}</label>
);

function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="w-7 h-7 rounded-full border-4 border-tenzy-teal/30 border-t-tenzy-teal animate-spin" />
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, color = "teal" }) {
  const bg = { teal: "bg-teal-50 text-teal-600", amber: "bg-amber-50 text-amber-600", indigo: "bg-indigo-50 text-indigo-600", rose: "bg-rose-50 text-rose-600" };
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${bg[color]}`}>
        <Icon size={18} />
      </div>
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-lg font-bold text-slate-900">{value}</p>
      </div>
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

/* ── Custom Tooltip ───────────────────────────────────────────────────────── */
const CustomPieTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg px-3 py-2 text-sm">
      <p className="font-semibold text-slate-800">{payload[0].name}</p>
      <p className="text-slate-600">{payload[0].value}</p>
    </div>
  );
};

/* ── Report Detail Dialog ─────────────────────────────────────────────────── */
function ReportDialog({ title, kind, rows, fields, selectedFields, onToggleField, onExport, onClose }) {
  const [page, setPage] = useState(1);
  const chosen = fields.filter((f) => selectedFields.includes(f.key));
  const totalPages = Math.ceil(rows.length / PAGE_SIZE);
  const page_rows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Build charts
  const charts = useMemo(() => {
    if (kind === "procurement") {
      // By shop
      const byShop = {};
      rows.forEach((r) => { byShop[r.shopName] = (byShop[r.shopName] || 0) + (r.netTotal ?? 0); });
      const shopData = Object.entries(byShop).map(([name, value]) => ({ name, value: +value.toFixed(2) }));

      // By brand
      const byBrand = {};
      rows.forEach((r) => { byBrand[r.brandName || "Unknown"] = (byBrand[r.brandName || "Unknown"] || 0) + (r.quantity ?? 0); });
      const brandData = Object.entries(byBrand)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([name, value]) => ({ name, value }));

      return { shopData, brandData };
    }
    if (kind === "dispatch") {
      // By courier
      const byCourier = {};
      rows.forEach((r) => { byCourier[r.courierName] = (byCourier[r.courierName] || 0) + (r.quantityDispatched ?? 0); });
      const courierData = Object.entries(byCourier).map(([name, value]) => ({ name, value }));

      // By status
      const byStatus = {};
      rows.forEach((r) => { byStatus[r.shipmentStatus] = (byStatus[r.shipmentStatus] || 0) + 1; });
      const statusData = Object.entries(byStatus).map(([name, value]) => ({ name, value }));

      return { courierData, statusData };
    }
    if (kind === "monthly") {
      const barData = rows.slice(-12).map((r) => ({
        name: r.summaryMonth?.slice(0, 7) ?? "—",
        "UK Cost": +(r.totalUkCourierCost ?? 0).toFixed(2),
        "SL Cost": +(r.totalSriLankaCourierCost ?? 0).toFixed(2),
        "Tax": +(r.totalTaxCharges ?? 0).toFixed(2),
      }));
      return { barData };
    }
    return {};
  }, [kind, rows]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-6 overflow-y-auto">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-white rounded-3xl w-full max-w-5xl shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white rounded-t-3xl z-10">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{title}</h2>
            <p className="text-sm text-slate-500">{rows.length} rows</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onExport}
              className="flex items-center gap-2 px-4 py-2 bg-tenzy-teal text-white text-sm font-semibold rounded-xl hover:opacity-90 transition">
              <Download size={14} /> Export PDF
            </button>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Charts */}
          {kind === "procurement" && rows.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-slate-50 rounded-2xl p-4">
                <p className="text-sm font-bold text-slate-700 mb-3">Net Spend by Shop (£)</p>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={charts.shopData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                      {charts.shopData?.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip content={<CustomPieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="bg-slate-50 rounded-2xl p-4">
                <p className="text-sm font-bold text-slate-700 mb-3">Qty by Brand</p>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={charts.brandData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}>
                      {charts.brandData?.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip content={<CustomPieTooltip />} />
                    <Legend iconType="circle" iconSize={10} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {kind === "dispatch" && rows.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-slate-50 rounded-2xl p-4">
                <p className="text-sm font-bold text-slate-700 mb-3">Qty by Courier</p>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={charts.courierData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                      {charts.courierData?.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip content={<CustomPieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="bg-slate-50 rounded-2xl p-4">
                <p className="text-sm font-bold text-slate-700 mb-3">By Shipment Status</p>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={charts.statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                      {charts.statusData?.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip content={<CustomPieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {kind === "monthly" && rows.length > 0 && (
            <div className="bg-slate-50 rounded-2xl p-4">
              <p className="text-sm font-bold text-slate-700 mb-3">Monthly Shipping Costs (£)</p>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={charts.barData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="UK Cost" fill="#0d9488" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="SL Cost" fill="#6366f1" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="Tax"     fill="#f59e0b" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Field selector */}
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Columns</p>
            <div className="flex flex-wrap gap-2">
              {fields.map((f) => (
                <label key={f.key}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold cursor-pointer transition ${
                    selectedFields.includes(f.key)
                      ? "bg-tenzy-teal text-white border-tenzy-teal"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}>
                  <input type="checkbox" className="hidden" checked={selectedFields.includes(f.key)} onChange={() => onToggleField(f.key)} />
                  {f.label}
                </label>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-100">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wider">
                <tr>
                  {chosen.map((f) => (
                    <th key={f.key} className="px-3 py-3 text-left font-semibold whitespace-nowrap">{f.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {page_rows.length === 0 && (
                  <tr><td colSpan={chosen.length} className="px-3 py-8 text-center text-slate-400">No data found.</td></tr>
                )}
                {page_rows.map((row, ri) => (
                  <tr key={ri} className="hover:bg-slate-50 transition">
                    {chosen.map((f) => (
                      <td key={f.key} className="px-3 py-2.5 text-slate-700 whitespace-nowrap">
                        {fmt(row[f.key], f.key)}
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

/* ── Report Card ──────────────────────────────────────────────────────────── */
function ReportCard({ kind, title, icon: Icon, rows, fields, selectedFields, onToggleField, onExport, loading }) {
  const [open, setOpen] = useState(false);

  const summary = useMemo(() => {
    if (kind === "procurement") {
      const shops   = new Set(rows.map((r) => r.shopName)).size;
      const total   = rows.reduce((s, r) => s + (r.netTotal ?? 0), 0);
      const qty     = rows.reduce((s, r) => s + (r.quantity ?? 0), 0);
      return [
        { label: "Rows",   value: rows.length },
        { label: "Shops",  value: shops },
        { label: "Qty",    value: qty },
        { label: "Net £",  value: `£${total.toFixed(2)}` },
      ];
    }
    if (kind === "dispatch") {
      const shipments = new Set(rows.map((r) => r.dispatchReference)).size;
      const qty       = rows.reduce((s, r) => s + (r.quantityDispatched ?? 0), 0);
      const total     = rows.reduce((s, r) => s + (r.totalShipmentCharge ?? 0), 0);
      return [
        { label: "Rows",      value: rows.length },
        { label: "Shipments", value: shipments },
        { label: "Qty",       value: qty },
        { label: "Charges £", value: `£${total.toFixed(2)}` },
      ];
    }
    if (kind === "monthly") {
      const cost = rows.reduce((s, r) => s + (r.totalShipmentCost ?? 0), 0);
      const qty  = rows.reduce((s, r) => s + (r.totalProductsDispatched ?? 0), 0);
      return [
        { label: "Months",   value: rows.length },
        { label: "Products", value: qty },
        { label: "Cost £",   value: `£${cost.toFixed(2)}` },
      ];
    }
    return [];
  }, [kind, rows]);

  return (
    <>
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-tenzy-teal/10 rounded-xl flex items-center justify-center">
              <Icon size={17} className="text-tenzy-teal" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">{title}</h2>
              <p className="text-xs text-slate-500">{rows.length} rows</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => onExport(kind, rows)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-tenzy-teal text-white rounded-xl hover:opacity-90 transition">
              <Download size={13} /> PDF
            </button>
            <button onClick={() => setOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition">
              <Eye size={13} /> View Report
            </button>
          </div>
        </div>

        {loading ? (
          <div className="py-8"><Spinner /></div>
        ) : (
          <div className="p-5">
            {/* Summary stats */}
            <div className={`grid grid-cols-${summary.length} gap-3 mb-4`}>
              {summary.map((s) => (
                <div key={s.label} className="bg-slate-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-slate-500">{s.label}</p>
                  <p className="text-sm font-bold text-slate-900">{s.value}</p>
                </div>
              ))}
            </div>

            {/* Mini preview table */}
            {rows.length > 0 && (
              <div className="overflow-x-auto rounded-xl border border-slate-100">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider">
                    <tr>
                      {fields.slice(0, 5).map((f) => (
                        <th key={f.key} className="px-3 py-2 text-left font-semibold">{f.label}</th>
                      ))}
                      {fields.length > 5 && <th className="px-3 py-2 text-left text-slate-300">+{fields.length - 5} more</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {rows.slice(0, 5).map((row, ri) => (
                      <tr key={ri} className="hover:bg-slate-50">
                        {fields.slice(0, 5).map((f) => (
                          <td key={f.key} className="px-3 py-2 text-slate-700 whitespace-nowrap">{fmt(row[f.key], f.key)}</td>
                        ))}
                        {fields.length > 5 && <td className="px-3 py-2 text-slate-300">…</td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {rows.length > 5 && (
                  <div className="px-3 py-2 text-xs text-slate-400 text-center border-t border-slate-50">
                    +{rows.length - 5} more rows — <button onClick={() => setOpen(true)} className="text-tenzy-teal font-semibold hover:underline">View all</button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {open && (
        <ReportDialog
          title={title}
          kind={kind}
          rows={rows}
          fields={fields}
          selectedFields={selectedFields}
          onToggleField={(key) => onToggleField(kind, key)}
          onExport={() => { onExport(kind, rows); }}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

/* ── Main Page ────────────────────────────────────────────────────────────── */
export default function Reports() {
  const [filters, setFilters] = useState({
    startDate: "", endDate: "", shop: "", courier: "",
    brand: "", product: "", category: "", shipmentStatus: "",
  });
  const [procurementRows, setProcurementRows] = useState([]);
  const [dispatchRows,    setDispatchRows]    = useState([]);
  const [monthlyRows,     setMonthlyRows]     = useState([]);
  const [selectedFields, setSelectedFields] = useState({
    procurement: PROCUREMENT_FIELDS.map((f) => f.key),
    dispatch:    DISPATCH_FIELDS.map((f) => f.key),
    monthly:     MONTHLY_FIELDS.map((f) => f.key),
  });
  const [loading, setLoading]   = useState(true);
  const [applyTick, setApplyTick] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [proc, disp, monthly] = await Promise.all([
        supplyChainApi.getProcurementReport(filters),
        supplyChainApi.getDispatchReport(filters),
        supplyChainApi.getMonthlyDispatchSummary(filters),
      ]);
      setProcurementRows(proc   ?? []);
      setDispatchRows(disp      ?? []);
      setMonthlyRows(monthly    ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [applyTick]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  const fieldMap = { procurement: PROCUREMENT_FIELDS, dispatch: DISPATCH_FIELDS, monthly: MONTHLY_FIELDS };

  const exportPdf = (kind, rows) => {
    const chosen = fieldMap[kind].filter((f) => selectedFields[kind].includes(f.key));
    downloadSimplePdf({
      fileName: `tenzy-${kind}-report.pdf`,
      title: `Tenzy ${kind} report`,
      subtitle: `Generated ${new Date().toISOString().slice(0, 10)}`,
      columns: chosen,
      rows: rows.map(formatRow),
    });
  };

  const toggleField = (kind, key) => {
    setSelectedFields((cur) => ({
      ...cur,
      [kind]: cur[kind].includes(key) ? cur[kind].filter((k) => k !== key) : [...cur[kind], key],
    }));
  };

  // Top-level summary
  const totalProcNet   = procurementRows.reduce((s, r) => s + (r.netTotal  ?? 0), 0);
  const totalDispQty   = dispatchRows.reduce((s, r) => s + (r.quantityDispatched ?? 0), 0);
  const totalMonthCost = monthlyRows.reduce((s, r) => s + (r.totalShipmentCost ?? 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Supply Chain Reports</h1>
          <p className="text-sm text-slate-500 mt-1">Filter and explore procurement, dispatch, and monthly trends.</p>
        </div>
        <button onClick={() => setApplyTick((t) => t + 1)}
          className="flex items-center gap-2 px-4 py-2 border border-slate-200 bg-white rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition shadow-sm">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Top KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <SummaryCard icon={Package}   label="Procurement rows"    value={procurementRows.length} color="teal" />
        <SummaryCard icon={TrendingUp} label="Total net spend £"   value={`£${totalProcNet.toFixed(2)}`} color="indigo" />
        <SummaryCard icon={Truck}     label="Dispatch rows"       value={dispatchRows.length}    color="amber" />
        <SummaryCard icon={Calendar}  label="Monthly charge £"    value={`£${totalMonthCost.toFixed(2)}`} color="rose" />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <Filter size={15} className="text-slate-400" />
          <p className="text-sm font-bold text-slate-700">Filters</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div><Label>Start date</Label><Input type="date" value={filters.startDate} onChange={(e) => setFilters({ ...filters, startDate: e.target.value })} /></div>
          <div><Label>End date</Label><Input type="date" value={filters.endDate}   onChange={(e) => setFilters({ ...filters, endDate: e.target.value })} /></div>
          <div><Label>Shop</Label><Input value={filters.shop} onChange={(e) => setFilters({ ...filters, shop: e.target.value })} placeholder="Any shop" /></div>
          <div><Label>Courier</Label><Input value={filters.courier} onChange={(e) => setFilters({ ...filters, courier: e.target.value })} placeholder="Any courier" /></div>
          <div><Label>Brand</Label><Input value={filters.brand} onChange={(e) => setFilters({ ...filters, brand: e.target.value })} placeholder="Any brand" /></div>
          <div><Label>Product</Label><Input value={filters.product} onChange={(e) => setFilters({ ...filters, product: e.target.value })} placeholder="Any product" /></div>
          <div><Label>Category</Label><Input value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })} placeholder="Any category" /></div>
          <div>
            <Label>Shipment status</Label>
            <select value={filters.shipmentStatus} onChange={(e) => setFilters({ ...filters, shipmentStatus: e.target.value })}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-tenzy-teal/20 focus:border-tenzy-teal">
              <option value="">All</option>
              <option value="pending">Pending</option>
              <option value="dispatched">Dispatched</option>
              <option value="received">Received</option>
            </select>
          </div>
        </div>
        <div className="flex justify-end mt-4">
          <button onClick={() => setApplyTick((t) => t + 1)}
            className="flex items-center gap-2 px-5 py-2 bg-tenzy-teal text-white text-sm font-bold rounded-xl hover:opacity-90 transition">
            <Filter size={14} /> Apply Filters
          </button>
        </div>
      </div>

      {/* Report cards */}
      <ReportCard
        kind="procurement"
        title="Procurement Report"
        icon={Package}
        rows={procurementRows}
        fields={PROCUREMENT_FIELDS}
        selectedFields={selectedFields.procurement}
        onToggleField={toggleField}
        onExport={exportPdf}
        loading={loading}
      />
      <ReportCard
        kind="dispatch"
        title="Dispatch Report"
        icon={Truck}
        rows={dispatchRows}
        fields={DISPATCH_FIELDS}
        selectedFields={selectedFields.dispatch}
        onToggleField={toggleField}
        onExport={exportPdf}
        loading={loading}
      />
      <ReportCard
        kind="monthly"
        title="Monthly Dispatch Summary"
        icon={BarChart2}
        rows={monthlyRows}
        fields={MONTHLY_FIELDS}
        selectedFields={selectedFields.monthly}
        onToggleField={toggleField}
        onExport={exportPdf}
        loading={loading}
      />
    </div>
  );
}
