import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  Search, X, Eye, FileText, TrendingUp, ShoppingBag,
  Calendar, BarChart2, DollarSign, ChevronDown, ChevronUp, RefreshCw, Plus, CreditCard,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";
import { ordersApi, invoicesApi, orderStatusApi, orderPaymentsApi, paymentStatusApi } from "../../services/api";
import CreateInvoiceModal from "../components/CreateInvoiceModal";

const fmt = (n) => new Intl.NumberFormat("en-LK").format(n ?? 0);

const STATUS_STYLES = {
  pending:    "bg-amber-100 text-amber-700 border-amber-200",
  processing: "bg-blue-100 text-blue-700 border-blue-200",
  dispatched: "bg-indigo-100 text-indigo-700 border-indigo-200",
  delivered:  "bg-emerald-100 text-emerald-700 border-emerald-200",
  cancelled:  "bg-red-100 text-red-500 border-red-200",
};

const STATUSES = ["all", "pending", "processing", "dispatched", "delivered", "cancelled"];

/* ── Payment panel for a single admin order ───────────────────────────────── */
function PaymentPanel({ orderId }) {
  const [payments,       setPayments]       = useState([]);
  const [payStatuses,    setPayStatuses]    = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [showForm,       setShowForm]       = useState(false);
  const [saving,         setSaving]         = useState(false);
  const [form, setForm] = useState({
    amount: "", paymentType: "", paymentStatusId: "", transactionRef: "", notes: "", receiptUrl: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pays, stats] = await Promise.all([
        orderPaymentsApi.getByOrder(orderId),
        paymentStatusApi.getAll(),
      ]);
      setPayments(Array.isArray(pays) ? pays : []);
      setPayStatuses(Array.isArray(stats) ? stats : []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [orderId]);

  useEffect(() => { load(); }, [load]);

  const totalPaid = payments.reduce((s, p) => s + (Number(p.Amount ?? p.amount) || 0), 0);

  const handleSave = async () => {
    if (!form.amount || Number(form.amount) <= 0) { alert("Enter a valid amount."); return; }
    if (!form.paymentType.trim()) { alert("Payment type is required."); return; }
    setSaving(true);
    try {
      await orderPaymentsApi.create(orderId, {
        amount:          Number(form.amount),
        paymentType:     form.paymentType.trim(),
        paymentStatusId: form.paymentStatusId ? parseInt(form.paymentStatusId) : null,
        transactionRef:  form.transactionRef || null,
        notes:           form.notes || null,
        receiptUrl:      form.receiptUrl || null,
      });
      setForm({ amount: "", paymentType: "", paymentStatusId: "", transactionRef: "", notes: "", receiptUrl: "" });
      setShowForm(false);
      load();
    } catch (err) { alert(err.message || "Save failed."); }
    finally { setSaving(false); }
  };

  const fmtLkr = (n) => new Intl.NumberFormat("en-LK").format(Math.round(n ?? 0));

  if (loading) return <div className="flex justify-center py-4"><div className="w-5 h-5 rounded-full border-2 border-tenzy-teal/30 border-t-tenzy-teal animate-spin" /></div>;

  return (
    <div className="px-5 pb-4 space-y-3">
      {/* Payment history */}
      {payments.length > 0 && (
        <div className="space-y-1.5">
          {payments.map((p) => {
            const statusColor = p.PaymentStatusColor ?? p.paymentStatusColor ?? "#64748b";
            const statusName  = p.PaymentStatusName  ?? p.paymentStatusName  ?? "";
            const amount = Number(p.Amount ?? p.amount) || 0;
            return (
              <div key={p.PaymentId ?? p.paymentId} className="flex items-center gap-3 rounded-xl bg-slate-50 border border-slate-100 px-3 py-2">
                <CreditCard size={13} className="text-slate-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-800">{p.PaymentType ?? p.paymentType}</p>
                  <p className="text-[10px] text-slate-400">
                    {p.TransactionRef ?? p.transactionRef ? `Ref: ${p.TransactionRef ?? p.transactionRef} · ` : ""}
                    {new Date(p.CreatedAt ?? p.createdAt).toLocaleDateString("en-GB")}
                  </p>
                </div>
                {statusName && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white shrink-0"
                    style={{ background: statusColor }}>{statusName}</span>
                )}
                <p className="text-sm font-bold text-emerald-600 shrink-0">LKR {fmtLkr(amount)}</p>
              </div>
            );
          })}
          <div className="flex justify-between text-xs px-3 py-1.5 bg-emerald-50 rounded-xl">
            <span className="text-slate-500 font-semibold">Total paid</span>
            <span className="font-bold text-emerald-700">LKR {fmtLkr(totalPaid)}</span>
          </div>
        </div>
      )}
      {payments.length === 0 && !showForm && (
        <p className="text-xs text-slate-400 italic">No payments recorded yet.</p>
      )}

      {/* Add payment form */}
      {showForm ? (
        <div className="rounded-xl border border-tenzy-orange/30 bg-orange-50/30 p-3 space-y-2">
          <p className="text-xs font-bold text-slate-700">Record Payment</p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">Amount (LKR) *</label>
              <input type="number" min="1" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })}
                placeholder="e.g. 5000"
                className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 outline-none focus:border-tenzy-teal" />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">Payment Type *</label>
              <input value={form.paymentType} onChange={(e) => setForm({ ...form, paymentType: e.target.value })}
                placeholder="e.g. Bank Transfer, Cash"
                className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 outline-none focus:border-tenzy-teal" />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">Payment Status</label>
              <select value={form.paymentStatusId} onChange={(e) => setForm({ ...form, paymentStatusId: e.target.value })}
                className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 outline-none bg-white focus:border-tenzy-teal">
                <option value="">— Select —</option>
                {payStatuses.map((s) => (
                  <option key={s.statusId ?? s.StatusId} value={s.statusId ?? s.StatusId}>{s.name ?? s.Name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">Transaction Ref</label>
              <input value={form.transactionRef} onChange={(e) => setForm({ ...form, transactionRef: e.target.value })}
                placeholder="Bank ref / receipt no."
                className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 outline-none focus:border-tenzy-teal" />
            </div>
            <div className="col-span-2">
              <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">Notes / Receipt URL</label>
              <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Notes or paste receipt image URL"
                className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 outline-none focus:border-tenzy-teal" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowForm(false)} className="flex-1 py-1.5 text-xs font-semibold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">Cancel</button>
            <button onClick={handleSave} disabled={saving}
              className="flex-1 py-1.5 text-xs font-bold text-white bg-tenzy-teal rounded-lg hover:opacity-90 disabled:opacity-60">
              {saving ? "Saving…" : "Save Payment"}
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 text-xs font-semibold text-tenzy-teal hover:underline">
          <Plus size={12} /> Add payment
        </button>
      )}
    </div>
  );
}

/* ── Admin Orders tab ─────────────────────────────────────────────────────── */
function AdminOrdersTab() {
  const [adminOrders,  setAdminOrders]  = useState([]);
  const [statuses,     setStatuses]     = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [updatingId,   setUpdatingId]   = useState(null);
  const [openStatusId, setOpenStatusId] = useState(null); // which order's status dropdown is open
  const [expandedId,   setExpandedId]   = useState(null); // which order's payment panel is open

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [orders, stats] = await Promise.all([
        invoicesApi.getAll(),
        orderStatusApi.getAll(),
      ]);
      setAdminOrders(Array.isArray(orders) ? orders : []);
      setStatuses(Array.isArray(stats) ? stats : []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (!e.target.closest("[data-status-dropdown]")) setOpenStatusId(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleStatusChange = async (orderId, statusId) => {
    setUpdatingId(orderId);
    setOpenStatusId(null);
    try {
      const res = await invoicesApi.updateStatus(orderId, statusId);
      const newName  = res?.newStatusName;
      const status   = statuses.find((s) => (s.statusId ?? s.StatusId) === statusId);
      setAdminOrders((prev) => prev.map((o) =>
        (o.InvoiceId ?? o.invoiceId) === orderId
          ? { ...o, StatusId: statusId, StatusName: status?.name ?? status?.Name ?? newName, StatusColor: status?.color ?? status?.Color }
          : o
      ));
    } catch (err) { alert(err.message || "Status update failed."); }
    finally { setUpdatingId(null); }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-40">
      <div className="w-7 h-7 rounded-full border-4 border-tenzy-teal/30 border-t-tenzy-teal animate-spin" />
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{adminOrders.length} admin order{adminOrders.length !== 1 ? "s" : ""}</p>
        <button onClick={load} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition">
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      {adminOrders.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 py-16 text-center text-sm text-slate-400">
          No admin orders yet. Use "Create Order" to add one.
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {adminOrders.map((order, idx) => {
          const id          = order.InvoiceId ?? order.invoiceId;
          const num         = order.InvoiceNumber ?? order.invoiceNumber;
          const name        = order.CustomerName ?? order.customerName ?? "—";
          const phone       = order.CustomerPhone ?? order.customerPhone ?? "—";
          const city        = order.CustomerCity ?? order.customerCity ?? "—";
          const total       = order.Total ?? order.total ?? 0;
          const date        = order.InvoiceDate ?? order.invoiceDate;
          const itemCount   = order.ItemCount ?? order.itemCount ?? 0;
          const statusName  = order.StatusName ?? order.statusName ?? "—";
          const statusColor = order.StatusColor ?? order.statusColor ?? "#64748b";
          const isUpdating  = updatingId === id;
          const isOpen      = openStatusId === id;

          return (
            <div key={id} className={`${idx > 0 ? "border-t border-slate-50" : ""}`}>
            <div className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50/50 transition">
              {/* Order info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-mono font-bold text-tenzy-teal">{num}</span>
                  <span className="text-xs text-slate-400">·</span>
                  <span className="text-sm font-semibold text-slate-800 truncate">{name}</span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  {phone} · {city}
                  {date ? ` · ${new Date(date).toLocaleDateString("en-GB")}` : ""}
                  {itemCount > 0 ? ` · ${itemCount} item${itemCount !== 1 ? "s" : ""}` : ""}
                </p>
              </div>

              {/* Total */}
              <p className="text-sm font-bold text-slate-800 shrink-0">LKR {fmt(total)}</p>

              {/* Payments expand toggle */}
              <button type="button"
                onClick={() => setExpandedId(expandedId === id ? null : id)}
                className="flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-tenzy-teal transition shrink-0 px-2 py-1 rounded-lg hover:bg-slate-100">
                <CreditCard size={12} />
                {expandedId === id ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
              </button>

              {/* Status change dropdown */}
              <div className="relative shrink-0" data-status-dropdown>
                <button
                  type="button"
                  disabled={isUpdating}
                  onClick={() => setOpenStatusId(isOpen ? null : id)}
                  className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full text-white transition hover:opacity-90 disabled:opacity-60"
                  style={{ background: statusColor }}
                >
                  {isUpdating
                    ? <span className="w-3 h-3 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                    : <>{statusName} <ChevronDown size={11} /></>}
                </button>

                {isOpen && (
                  <div className="absolute right-0 top-full mt-1 z-50 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden min-w-[180px]">
                    {statuses.map((s) => {
                      const sid   = s.statusId ?? s.StatusId;
                      const sname = s.name ?? s.Name;
                      const sc    = s.color ?? s.Color ?? "#64748b";
                      const active = (order.StatusId ?? order.statusId) === sid;
                      return (
                        <button key={sid} type="button"
                          onClick={() => handleStatusChange(id, sid)}
                          className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-left transition hover:bg-slate-50 ${active ? "bg-slate-50" : ""}`}>
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: sc }} />
                          <span className="text-slate-700">{sname}</span>
                          {active && <span className="ml-auto text-tenzy-teal text-[10px]">✓</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
            {/* Payment panel expands below the order row */}
            {expandedId === id && (
              <div className="border-t border-slate-100 bg-slate-50/50">
                <PaymentPanel orderId={id} />
              </div>
            )}
            </div>
          );
        })}

      </div>
    </div>
  );
}

/* ── Revenue analytics helpers ────────────────────────────────────────────── */
function startOf(unit, date = new Date()) {
  const d = new Date(date);
  if (unit === "day")   { d.setHours(0,0,0,0); return d; }
  if (unit === "week")  { d.setHours(0,0,0,0); d.setDate(d.getDate() - d.getDay()); return d; }
  if (unit === "month") { d.setHours(0,0,0,0); d.setDate(1); return d; }
  if (unit === "year")  { d.setHours(0,0,0,0); d.setMonth(0,1); return d; }
  return d;
}

function ordersRevenue(orders, since) {
  return orders
    .filter((o) => o.status !== "cancelled" && new Date(o.createdAt) >= since)
    .reduce((s, o) => s + (Number(o.totalLkr) || 0), 0);
}

function buildDailyData(orders, days = 30) {
  const map = {};
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const key = d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
    map[key] = { date: key, revenue: 0, orders: 0 };
  }
  orders.forEach((o) => {
    if (o.status === "cancelled") return;
    const d = new Date(o.createdAt);
    const key = d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
    if (map[key]) { map[key].revenue += Number(o.totalLkr) || 0; map[key].orders += 1; }
  });
  return Object.values(map);
}

function buildMonthlyData(orders, months = 12) {
  const map = {};
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i);
    const key = d.toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
    map[key] = { month: key, revenue: 0, orders: 0 };
  }
  orders.forEach((o) => {
    if (o.status === "cancelled") return;
    const d = new Date(o.createdAt);
    const key = d.toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
    if (map[key]) { map[key].revenue += Number(o.totalLkr) || 0; map[key].orders += 1; }
  });
  return Object.values(map);
}

function buildWeeklyData(orders, weeks = 12) {
  const result = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const end   = new Date(); end.setDate(end.getDate() - i * 7); end.setHours(23,59,59,999);
    const start = new Date(end); start.setDate(start.getDate() - 6); start.setHours(0,0,0,0);
    const label = `${start.toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}`;
    const wkOrders = orders.filter((o) =>
      o.status !== "cancelled" && new Date(o.createdAt) >= start && new Date(o.createdAt) <= end
    );
    result.push({
      week: label,
      revenue: wkOrders.reduce((s, o) => s + (Number(o.totalLkr) || 0), 0),
      orders: wkOrders.length,
    });
  }
  return result;
}

/* ── Stat card ────────────────────────────────────────────────────────────── */
function StatCard({ label, value, sub, color = "teal", icon: Icon }) {
  const colors = {
    teal:   "bg-tenzy-teal/10 text-tenzy-teal",
    orange: "bg-tenzy-orange/10 text-tenzy-orange",
    violet: "bg-violet-100 text-violet-600",
    blue:   "bg-blue-100 text-blue-600",
  };
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${colors[color]}`}>
        <Icon size={20} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-slate-500 font-medium">{label}</p>
        <p className="text-xl font-bold text-slate-900 truncate">{value}</p>
        {sub && <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

/* ── Revenue tab ──────────────────────────────────────────────────────────── */
function RevenueTab({ orders }) {
  const [chartView, setChartView] = useState("monthly"); // "daily" | "weekly" | "monthly"

  const now        = new Date();
  const todayStart = startOf("day");
  const weekStart  = startOf("week");
  const monthStart = startOf("month");
  const yearStart  = startOf("year");

  const totalRevenue  = ordersRevenue(orders, new Date(0));
  const todayRevenue  = ordersRevenue(orders, todayStart);
  const weekRevenue   = ordersRevenue(orders, weekStart);
  const monthRevenue  = ordersRevenue(orders, monthStart);

  const todayOrders  = orders.filter((o) => o.status !== "cancelled" && new Date(o.createdAt) >= todayStart).length;
  const weekOrders   = orders.filter((o) => o.status !== "cancelled" && new Date(o.createdAt) >= weekStart).length;
  const monthOrders  = orders.filter((o) => o.status !== "cancelled" && new Date(o.createdAt) >= monthStart).length;
  const totalOrders  = orders.filter((o) => o.status !== "cancelled").length;

  const dailyData   = useMemo(() => buildDailyData(orders,  30), [orders]);
  const weeklyData  = useMemo(() => buildWeeklyData(orders, 12), [orders]);
  const monthlyData = useMemo(() => buildMonthlyData(orders,12), [orders]);

  const chartData = chartView === "daily" ? dailyData : chartView === "weekly" ? weeklyData : monthlyData;
  const xKey      = chartView === "daily" ? "date" : chartView === "weekly" ? "week" : "month";

  const customTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-white border border-slate-200 rounded-xl shadow-lg px-4 py-3 text-xs">
        <p className="font-bold text-slate-700 mb-1">{label}</p>
        <p className="text-tenzy-teal font-semibold">LKR {fmt(payload[0]?.value ?? 0)}</p>
        {payload[1] && <p className="text-slate-500">{payload[1]?.value} orders</p>}
      </div>
    );
  };

  return (
    <div className="space-y-5">
      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Today's Revenue"  value={`LKR ${fmt(todayRevenue)}`}  sub={`${todayOrders} orders`}  color="teal"   icon={DollarSign} />
        <StatCard label="This Week"         value={`LKR ${fmt(weekRevenue)}`}   sub={`${weekOrders} orders`}   color="orange" icon={Calendar} />
        <StatCard label="This Month"        value={`LKR ${fmt(monthRevenue)}`}  sub={`${monthOrders} orders`}  color="violet" icon={TrendingUp} />
        <StatCard label="All-Time Revenue"  value={`LKR ${fmt(totalRevenue)}`}  sub={`${totalOrders} orders`}  color="blue"   icon={BarChart2} />
      </div>

      {/* Chart */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <div>
            <p className="text-sm font-bold text-slate-900">Revenue Overview</p>
            <p className="text-xs text-slate-400 mt-0.5">LKR revenue from non-cancelled orders</p>
          </div>
          <div className="flex rounded-xl border border-slate-200 overflow-hidden">
            {[["daily","30 Days"], ["weekly","12 Weeks"], ["monthly","12 Months"]].map(([id, label]) => (
              <button key={id} onClick={() => setChartView(id)}
                className={`px-3 py-1.5 text-xs font-semibold transition ${chartView === id ? "bg-tenzy-teal text-white" : "text-slate-500 hover:bg-slate-50"}`}>
                {label}
              </button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
            <defs>
              <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#2BB9B4" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#2BB9B4" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey={xKey} tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false}
              interval={chartView === "daily" ? 4 : 0} />
            <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false}
              tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
            <Tooltip content={customTooltip} />
            <Area type="monotone" dataKey="revenue" stroke="#2BB9B4" strokeWidth={2.5}
              fill="url(#revenueGrad)" dot={false} activeDot={{ r: 5, fill: "#2BB9B4" }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Orders count bar chart */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <p className="text-sm font-bold text-slate-900 mb-1">Orders Count</p>
        <p className="text-xs text-slate-400 mb-5">Number of orders per period</p>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey={xKey} tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false}
              interval={chartView === "daily" ? 4 : 0} />
            <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip content={customTooltip} />
            <Bar dataKey="orders" fill="#E8522A" radius={[4,4,0,0]} maxBarSize={40} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Status breakdown */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <p className="text-sm font-bold text-slate-900 mb-4">Order Status Breakdown</p>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {STATUSES.slice(1).map((s) => {
            const count = orders.filter((o) => o.status === s).length;
            const rev   = orders.filter((o) => o.status === s).reduce((t, o) => t + (Number(o.totalLkr) || 0), 0);
            return (
              <div key={s} className={`rounded-2xl border px-3 py-3 text-center ${STATUS_STYLES[s] ?? "bg-slate-50 border-slate-200 text-slate-600"}`}>
                <p className="text-lg font-bold">{count}</p>
                <p className="text-[11px] font-semibold capitalize mt-0.5">{s}</p>
                <p className="text-[10px] opacity-70 mt-1">LKR {fmt(rev)}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ── Main Orders page ─────────────────────────────────────────────────────── */
export default function Orders() {
  const [orders,        setOrders]        = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [search,        setSearch]        = useState("");
  const [statusFilter,  setStatusFilter]  = useState("all");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [detailItems,   setDetailItems]   = useState([]);
  const [updating,      setUpdating]      = useState(false);
  const [activeTab,     setActiveTab]     = useState("orders"); // "orders" | "revenue"
  const [orderFormOpen, setOrderFormOpen] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    ordersApi.getAll(1, 200)
      .then((data) => setOrders(Array.isArray(data) ? data : []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const openDetail = async (order) => {
    setSelectedOrder(order);
    setDetailItems([]);
    try {
      const full = await ordersApi.getById(order.id);
      setDetailItems(full?.items ?? []);
      setSelectedOrder((prev) => ({ ...prev, ...full }));
    } catch { /* show what we have */ }
  };

  const updateStatus = async (orderId, newStatus) => {
    setUpdating(true);
    try {
      await ordersApi.updateStatus(orderId, newStatus);
      setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status: newStatus } : o));
      setSelectedOrder((prev) => prev?.id === orderId ? { ...prev, status: newStatus } : prev);
    } catch (err) { alert(err.message); }
    finally { setUpdating(false); }
  };

  const filtered = useMemo(() => orders.filter((o) => {
    const q = search.toLowerCase();
    const matchSearch =
      (o.orderRef     ?? "").toLowerCase().includes(q) ||
      (o.customerName ?? "").toLowerCase().includes(q) ||
      (o.shippingCity ?? "").toLowerCase().includes(q);
    const matchStatus = statusFilter === "all" || o.status === statusFilter;
    return matchSearch && matchStatus;
  }), [orders, search, statusFilter]);

  const counts = useMemo(() => {
    const c = { all: orders.length };
    STATUSES.slice(1).forEach((s) => { c[s] = orders.filter((o) => o.status === s).length; });
    return c;
  }, [orders]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 rounded-full border-4 border-tenzy-teal/30 border-t-tenzy-teal animate-spin" />
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900">Orders</h1>
          <p className="text-sm text-slate-500 mt-0.5">{orders.length} total orders</p>
        </div>
        <button
          onClick={() => setOrderFormOpen(true)}
          className="flex items-center gap-2 bg-tenzy-orange text-white text-sm font-bold px-4 py-2.5 rounded-xl hover:opacity-90 transition active:scale-95 shadow-lg shadow-tenzy-orange/25"
        >
          <FileText size={16} /> Create Order
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {[
          { id: "orders",       label: "Customer Orders",    icon: ShoppingBag },
          { id: "admin-orders", label: "Admin Orders",       icon: FileText },
          { id: "revenue",      label: "Revenue & Analytics", icon: TrendingUp },
        ].map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-semibold transition ${
              activeTab === id
                ? "bg-tenzy-teal text-white shadow-lg shadow-tenzy-teal/20"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}>
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {/* ── Revenue tab ── */}
      {activeTab === "revenue" && <RevenueTab orders={orders} />}

      {/* ── Admin Orders tab ── */}
      {activeTab === "admin-orders" && <AdminOrdersTab />}

      {/* ── Customer Orders tab ── */}
      {activeTab === "orders" && (
        <>
          {/* Filters */}
          <div className="bg-white rounded-2xl p-3 md:p-4 shadow-sm border border-slate-100 space-y-3">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by order ref, customer, city…"
                className="w-full pl-9 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-tenzy-teal/30 focus:border-tenzy-orange transition" />
              {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2"><X size={14} className="text-slate-400" /></button>}
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {STATUSES.map((s) => (
                <button key={s} onClick={() => setStatusFilter(s)}
                  className={`flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full border transition capitalize ${
                    statusFilter === s
                      ? "bg-tenzy-teal text-white border-tenzy-teal"
                      : "border-slate-200 text-slate-600 hover:border-tenzy-teal hover:text-tenzy-teal"}`}>
                  {s === "all" ? "All" : s} ({counts[s] ?? 0})
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            {/* Mobile */}
            <div className="md:hidden divide-y divide-slate-50">
              {filtered.length === 0 && <p className="text-sm text-slate-400 text-center py-12">No orders found.</p>}
              {filtered.map((order) => (
                <div key={order.id} className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-tenzy-teal">{order.orderRef}</span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border capitalize ${STATUS_STYLES[order.status] ?? "bg-slate-100 text-slate-600 border-slate-200"}`}>{order.status}</span>
                  </div>
                  <p className="text-sm font-semibold text-slate-800">{order.customerName}</p>
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>{order.shippingCity} · {order.createdAt ? new Date(order.createdAt).toLocaleDateString("en-GB") : "—"}</span>
                    <span className="font-bold text-slate-800">LKR {fmt(order.totalLkr)}</span>
                  </div>
                  <button onClick={() => openDetail(order)}
                    className="w-full mt-1 text-xs font-semibold text-tenzy-teal border border-tenzy-teal/30 rounded-lg py-1.5 hover:bg-tenzy-teal/5 transition">
                    View Details
                  </button>
                </div>
              ))}
            </div>

            {/* Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    {["Order Ref", "Customer", "Date", "Items", "Total", "Payment", "Status", "Action"].map((h) => (
                      <th key={h} className="text-left text-xs font-semibold text-slate-500 px-5 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filtered.length === 0 && <tr><td colSpan={8} className="text-center py-12 text-sm text-slate-400">No orders found.</td></tr>}
                  {filtered.map((order) => (
                    <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3 text-xs font-mono font-bold text-tenzy-teal">{order.orderRef}</td>
                      <td className="px-5 py-3">
                        <p className="text-xs font-semibold text-slate-800">{order.customerName}</p>
                        <p className="text-[10px] text-slate-400">{order.shippingCity}</p>
                      </td>
                      <td className="px-5 py-3 text-xs text-slate-500">
                        {order.createdAt ? new Date(order.createdAt).toLocaleDateString("en-GB") : "—"}
                      </td>
                      <td className="px-5 py-3 text-xs text-slate-600">{order.itemCount ?? "—"}</td>
                      <td className="px-5 py-3 text-xs font-bold text-slate-800">LKR {fmt(order.totalLkr)}</td>
                      <td className="px-5 py-3 text-xs text-slate-500">{order.paymentMethod}</td>
                      <td className="px-5 py-3">
                        <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border capitalize ${STATUS_STYLES[order.status] ?? "bg-slate-100 text-slate-600 border-slate-200"}`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <button onClick={() => openDetail(order)}
                          className="flex items-center gap-1 text-xs text-tenzy-teal font-semibold hover:underline">
                          <Eye size={13} /> View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSelectedOrder(null)} />
          <div className="relative bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-3xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white px-5 py-4 border-b border-slate-100 flex items-center justify-between rounded-t-3xl sm:rounded-t-2xl z-10">
              <div>
                <p className="text-xs text-slate-400">Order Details</p>
                <p className="font-bold text-slate-900 text-sm font-mono">{selectedOrder.orderRef}</p>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="p-2 rounded-full hover:bg-slate-100">
                <X size={18} className="text-slate-500" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className={`text-xs font-semibold px-3 py-1.5 rounded-full border capitalize ${STATUS_STYLES[selectedOrder.status] ?? "bg-slate-100 text-slate-600 border-slate-200"}`}>
                  {selectedOrder.status}
                </span>
                <span className="text-xs text-slate-400">
                  {selectedOrder.createdAt ? new Date(selectedOrder.createdAt).toLocaleDateString("en-GB") : "—"}
                </span>
              </div>

              <div className="bg-slate-50 rounded-xl p-4 space-y-1.5">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Customer</p>
                <p className="text-sm font-bold text-slate-800">{selectedOrder.shippingName || selectedOrder.customerName}</p>
                <p className="text-xs text-slate-500">{selectedOrder.customerEmail}</p>
                <p className="text-xs text-slate-500">{selectedOrder.shippingPhone}</p>
                <p className="text-xs text-slate-500">{selectedOrder.shippingAddress}, {selectedOrder.shippingCity}</p>
              </div>

              {detailItems.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Items</p>
                  <div className="space-y-2">
                    {detailItems.map((item, i) => (
                      <div key={i} className="flex items-center justify-between text-xs bg-slate-50 rounded-lg px-3 py-2">
                        <span className="text-slate-700 font-medium flex-1 pr-2">{item.productName}</span>
                        <span className="text-slate-500">×{item.qty}</span>
                        <span className="text-slate-800 font-bold ml-3">LKR {fmt(item.lineTotal)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between mt-3 pt-3 border-t border-slate-100">
                    <span className="text-sm font-bold text-slate-800">Total</span>
                    <span className="text-sm font-bold text-tenzy-teal">LKR {fmt(selectedOrder.totalLkr)}</span>
                  </div>
                </div>
              )}

              {selectedOrder.notes && (
                <div className="bg-amber-50 rounded-xl p-3">
                  <p className="text-[10px] font-semibold text-amber-500 uppercase mb-1">Notes</p>
                  <p className="text-xs text-amber-700">{selectedOrder.notes}</p>
                </div>
              )}

              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Update Status</p>
                <div className="flex flex-wrap gap-2">
                  {STATUSES.slice(1).map((s) => (
                    <button key={s} onClick={() => updateStatus(selectedOrder.id, s)}
                      disabled={selectedOrder.status === s || updating}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-full border capitalize transition ${
                        selectedOrder.status === s
                          ? (STATUS_STYLES[s] ?? "bg-slate-100 text-slate-600 border-slate-200") + " opacity-60 cursor-default"
                          : "border-slate-200 text-slate-600 hover:border-tenzy-teal hover:text-tenzy-teal"}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Order modal */}
      <CreateInvoiceModal open={orderFormOpen} onClose={() => setOrderFormOpen(false)} />
    </div>
  );
}
