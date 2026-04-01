import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  TrendingUp, TrendingDown, ShoppingCart, Package,
  Users, DollarSign, Clock, Truck, AlertTriangle, ArrowRight,
} from "lucide-react";
import { dashboardApi } from "../../services/api";

const fmt = (n) => new Intl.NumberFormat("en-LK").format(n ?? 0);

const STATUS_PIE_COLORS = {
  pending:    "#f59e0b",
  processing: "#3b82f6",
  dispatched: "#6366f1",
  delivered:  "#2BB9B4",
  cancelled:  "#ef4444",
};

const STATUS_COLORS = {
  pending:    "bg-amber-100 text-amber-700",
  processing: "bg-blue-100 text-blue-700",
  dispatched: "bg-indigo-100 text-indigo-700",
  delivered:  "bg-emerald-100 text-emerald-700",
  cancelled:  "bg-red-100 text-red-500",
};

const StatCard = ({ label, value, sub, icon: Icon, trend, trendVal, color }) => (
  <div className="bg-white rounded-2xl p-4 md:p-5 shadow-sm border border-slate-100 flex items-start justify-between gap-3">
    <div className="flex-1 min-w-0">
      <p className="text-xs text-slate-500 font-medium mb-1">{label}</p>
      <p className="text-xl md:text-2xl font-bold text-slate-900 truncate">{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
      {trendVal !== undefined && (
        <div className={`flex items-center gap-1 mt-2 text-xs font-semibold ${trend === "up" ? "text-emerald-600" : "text-red-500"}`}>
          {trend === "up" ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {trendVal}% vs last month
        </div>
      )}
    </div>
    <div className={`w-10 h-10 md:w-12 md:h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${color}`}>
      <Icon size={20} className="text-white" />
    </div>
  </div>
);

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900 text-white text-xs rounded-xl px-3 py-2 shadow-xl">
      <p className="font-semibold mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: {p.name === "revenue" ? `LKR ${fmt(p.value)}` : p.value}
        </p>
      ))}
    </div>
  );
};

const monthLabel = (m) => {
  if (!m) return "";
  const [, month] = m.split("-");
  return ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][+month - 1] ?? m;
};

const revenueChange = (current, previous) => {
  if (!previous) return 0;
  return Math.round(((current - previous) / previous) * 100);
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats,         setStats]         = useState(null);
  const [monthly,       setMonthly]       = useState([]);
  const [orderStatus,   setOrderStatus]   = useState([]);
  const [categorySales, setCategorySales] = useState([]);
  const [topProducts,   setTopProducts]   = useState([]);
  const [recentOrders,  setRecentOrders]  = useState([]);
  const [loading,       setLoading]       = useState(true);

  useEffect(() => {
    Promise.all([
      dashboardApi.getStats(),
      dashboardApi.getMonthly(),
      dashboardApi.getOrderStatus(),
      dashboardApi.getCategorySales(),
      dashboardApi.getTopProducts(6),
      dashboardApi.getRecentOrders(6),
    ]).then(([s, m, os, cs, tp, ro]) => {
      setStats(s);
      setMonthly((m ?? []).map((r) => ({ ...r, month: monthLabel(r.month) })));
      setOrderStatus((os ?? []).map((r) => ({
        name:  r.status ? r.status.charAt(0).toUpperCase() + r.status.slice(1) : r.status,
        value: r.count,
        color: STATUS_PIE_COLORS[r.status?.toLowerCase()] ?? "#94a3b8",
      })));
      setCategorySales((cs ?? []).map((r) => ({ category: r.category, sales: r.revenue, units: r.units })));
      setTopProducts(tp ?? []);
      setRecentOrders(ro ?? []);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const revChange = revenueChange(stats?.revenueThisMonth, stats?.revenueLastMonth);
  const ordChange = stats?.ordersLastMonth
    ? Math.round(((stats.ordersThisMonth - stats.ordersLastMonth) / stats.ordersLastMonth) * 100) : 0;

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
          <h1 className="text-xl md:text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">Live overview of your store.</p>
        </div>
        <span className="hidden sm:block text-xs text-slate-400 bg-white border border-slate-200 px-3 py-1.5 rounded-lg">
          {new Date().toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
        </span>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <StatCard label="Total Revenue"  value={`LKR ${fmt(stats?.totalRevenue)}`}
          icon={DollarSign} trend={revChange >= 0 ? "up" : "down"} trendVal={Math.abs(revChange)} color="bg-tenzy-teal" />
        <StatCard label="Total Orders"   value={stats?.totalOrders ?? 0}
          sub={`${stats?.pendingOrders ?? 0} pending`}
          icon={ShoppingCart} trend={ordChange >= 0 ? "up" : "down"} trendVal={Math.abs(ordChange)} color="bg-tenzy-orange" />
        <StatCard label="Customers"      value={stats?.totalCustomers ?? 0}
          icon={Users} color="bg-indigo-500" />
        <StatCard label="Products"       value={stats?.totalProducts ?? 0}
          sub={`${stats?.lowStockProducts ?? 0} low stock`}
          icon={Package} color="bg-amber-500" />
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl p-3 md:p-4 border border-slate-100 shadow-sm text-center">
          <div className="flex items-center justify-center gap-1.5 text-amber-500 mb-1">
            <Clock size={14} /><span className="text-xs font-semibold">Pending</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{stats?.pendingOrders ?? 0}</p>
          <p className="text-xs text-slate-400">orders</p>
        </div>
        <div className="bg-white rounded-xl p-3 md:p-4 border border-slate-100 shadow-sm text-center">
          <div className="flex items-center justify-center gap-1.5 text-indigo-500 mb-1">
            <Truck size={14} /><span className="text-xs font-semibold">Dispatched</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{stats?.dispatchedOrders ?? 0}</p>
          <p className="text-xs text-slate-400">orders</p>
        </div>
        <div className="bg-white rounded-xl p-3 md:p-4 border border-slate-100 shadow-sm text-center">
          <div className="flex items-center justify-center gap-1.5 text-red-400 mb-1">
            <AlertTriangle size={14} /><span className="text-xs font-semibold">Low Stock</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{stats?.lowStockProducts ?? 0}</p>
          <p className="text-xs text-slate-400">products</p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-2xl p-4 md:p-5 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-800">Revenue Overview</h2>
              <p className="text-xs text-slate-400">Monthly revenue (last 12 months)</p>
            </div>
            {revChange !== 0 && (
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${revChange >= 0 ? "bg-tenzy-teal/10 text-tenzy-teal" : "bg-red-100 text-red-500"}`}>
                {revChange >= 0 ? "+" : ""}{revChange}%
              </span>
            )}
          </div>
          {monthly.length === 0 ? (
            <div className="h-[220px] flex items-center justify-center text-sm text-slate-400">No revenue data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={monthly} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#2BB9B4" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#2BB9B4" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false}
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="revenue" stroke="#2BB9B4" strokeWidth={2.5}
                  fill="url(#revenueGrad)" dot={false} activeDot={{ r: 5, fill: "#2BB9B4" }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white rounded-2xl p-4 md:p-5 shadow-sm border border-slate-100">
          <h2 className="text-sm font-bold text-slate-800 mb-1">Order Status</h2>
          <p className="text-xs text-slate-400 mb-3">All time breakdown</p>
          {orderStatus.length === 0 ? (
            <div className="h-[160px] flex items-center justify-center text-sm text-slate-400">No orders yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={orderStatus} cx="50%" cy="50%" innerRadius={45} outerRadius={70}
                  paddingAngle={3} dataKey="value">
                  {orderStatus.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip formatter={(v, n) => [v, n]} />
              </PieChart>
            </ResponsiveContainer>
          )}
          <div className="space-y-1.5 mt-2">
            {orderStatus.map((d) => (
              <div key={d.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.color }} />
                  <span className="text-slate-600">{d.name}</span>
                </div>
                <span className="font-semibold text-slate-800">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Category Sales + Top Products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl p-4 md:p-5 shadow-sm border border-slate-100">
          <h2 className="text-sm font-bold text-slate-800 mb-1">Sales by Category</h2>
          <p className="text-xs text-slate-400 mb-4">Revenue per product category</p>
          {categorySales.length === 0 ? (
            <div className="h-[200px] flex items-center justify-center text-sm text-slate-400">No sales data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={categorySales} layout="vertical" margin={{ left: 0, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false}
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="category" tick={{ fontSize: 11, fill: "#64748b" }}
                  axisLine={false} tickLine={false} width={70} />
                <Tooltip formatter={(v) => [`LKR ${fmt(v)}`, "Revenue"]} />
                <Bar dataKey="sales" fill="#2BB9B4" radius={[0, 6, 6, 0]} barSize={14} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white rounded-2xl p-4 md:p-5 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-800">Top Products</h2>
              <p className="text-xs text-slate-400">By units sold</p>
            </div>
            <button onClick={() => navigate("/admin/products")}
              className="text-xs text-tenzy-teal font-semibold flex items-center gap-1 hover:underline">
              View all <ArrowRight size={12} />
            </button>
          </div>
          {topProducts.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-sm text-slate-400">No sales data yet</div>
          ) : (
            <div className="space-y-3">
              {topProducts.map((p, i) => (
                <div key={p.productId ?? i} className="flex items-center gap-3">
                  <span className="w-5 text-xs text-slate-400 font-semibold text-center">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-800 truncate">{p.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-tenzy-teal rounded-full"
                          style={{ width: `${(p.unitsSold / (topProducts[0]?.unitsSold || 1)) * 100}%` }} />
                      </div>
                      <span className="text-[10px] text-slate-400 w-8 text-right">{p.unitsSold}</span>
                    </div>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    p.stock < 20 ? "bg-red-100 text-red-600" : "bg-emerald-100 text-emerald-600"
                  }`}>
                    {p.stock} left
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Orders */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="flex items-center justify-between px-4 md:px-5 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-bold text-slate-800">Recent Orders</h2>
            <p className="text-xs text-slate-400">Last 6 orders placed</p>
          </div>
          <button onClick={() => navigate("/admin/orders")}
            className="text-xs text-tenzy-teal font-semibold flex items-center gap-1 hover:underline">
            View all <ArrowRight size={12} />
          </button>
        </div>
        {recentOrders.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-400">No orders yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50">
                  {["Order Ref", "Customer", "Date", "Total", "Status"].map((h) => (
                    <th key={h} className="text-left text-xs font-semibold text-slate-500 px-4 md:px-5 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {recentOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50 transition-colors cursor-pointer"
                    onClick={() => navigate("/admin/orders")}>
                    <td className="px-4 md:px-5 py-3 text-xs font-mono font-semibold text-tenzy-teal">
                      {order.orderRef}
                    </td>
                    <td className="px-4 md:px-5 py-3 text-xs font-semibold text-slate-800">{order.customerName}</td>
                    <td className="px-4 md:px-5 py-3 text-xs text-slate-500">
                      {order.createdAt ? new Date(order.createdAt).toLocaleDateString("en-GB") : "—"}
                    </td>
                    <td className="px-4 md:px-5 py-3 text-xs font-bold text-slate-800">LKR {fmt(order.totalLkr)}</td>
                    <td className="px-4 md:px-5 py-3">
                      <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full capitalize ${STATUS_COLORS[order.status] ?? "bg-slate-100 text-slate-600"}`}>
                        {order.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
