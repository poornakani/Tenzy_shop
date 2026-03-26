import React from "react";
import { useNavigate } from "react-router-dom";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  TrendingUp, TrendingDown, ShoppingCart, Package,
  Users, DollarSign, Clock, Truck, AlertTriangle, ArrowRight,
} from "lucide-react";
import {
  STATS, MONTHLY_REVENUE, ORDER_STATUS_DATA, CATEGORY_SALES,
  TOP_PRODUCTS, ORDERS,
} from "../dummydata/index";

const fmt = (n) => new Intl.NumberFormat("en-LK").format(n);

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

const STATUS_COLORS = {
  pending: "bg-amber-100 text-amber-700",
  processing: "bg-blue-100 text-blue-700",
  dispatched: "bg-indigo-100 text-indigo-700",
  delivered: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-red-100 text-red-500",
};

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

export default function Dashboard() {
  const navigate = useNavigate();
  const recentOrders = ORDERS.slice(0, 6);

  return (
    <div className="space-y-5">
      {/* Page Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">Welcome back, Poorna. Here's what's happening.</p>
        </div>
        <span className="hidden sm:block text-xs text-slate-400 bg-white border border-slate-200 px-3 py-1.5 rounded-lg">
          March 2026
        </span>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <StatCard
          label="Total Revenue"
          value={`LKR ${fmt(STATS.totalRevenue)}`}
          icon={DollarSign}
          trend="up"
          trendVal={STATS.revenueChange}
          color="bg-tenzy-teal"
        />
        <StatCard
          label="Total Orders"
          value={STATS.totalOrders}
          sub={`${STATS.pendingOrders} pending`}
          icon={ShoppingCart}
          trend="up"
          trendVal={STATS.ordersChange}
          color="bg-tenzy-orange"
        />
        <StatCard
          label="Customers"
          value={STATS.totalCustomers}
          icon={Users}
          trend="up"
          trendVal={STATS.customersChange}
          color="bg-indigo-500"
        />
        <StatCard
          label="Products"
          value={STATS.totalProducts}
          sub={`${STATS.lowStock} low stock`}
          icon={Package}
          color="bg-amber-500"
        />
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl p-3 md:p-4 border border-slate-100 shadow-sm text-center">
          <div className="flex items-center justify-center gap-1.5 text-amber-500 mb-1">
            <Clock size={14} />
            <span className="text-xs font-semibold">Pending</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{STATS.pendingOrders}</p>
          <p className="text-xs text-slate-400">orders</p>
        </div>
        <div className="bg-white rounded-xl p-3 md:p-4 border border-slate-100 shadow-sm text-center">
          <div className="flex items-center justify-center gap-1.5 text-indigo-500 mb-1">
            <Truck size={14} />
            <span className="text-xs font-semibold">Dispatched</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{STATS.dispatchedToday}</p>
          <p className="text-xs text-slate-400">today</p>
        </div>
        <div className="bg-white rounded-xl p-3 md:p-4 border border-slate-100 shadow-sm text-center">
          <div className="flex items-center justify-center gap-1.5 text-red-400 mb-1">
            <AlertTriangle size={14} />
            <span className="text-xs font-semibold">Low Stock</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{STATS.lowStock}</p>
          <p className="text-xs text-slate-400">products</p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-4 md:p-5 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-800">Revenue Overview</h2>
              <p className="text-xs text-slate-400">Monthly revenue for 2026</p>
            </div>
            <span className="text-xs bg-tenzy-teal/10 text-tenzy-teal font-semibold px-2.5 py-1 rounded-full">
              +{STATS.revenueChange}%
            </span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={MONTHLY_REVENUE} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2BB9B4" stopOpacity={0.25} />
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
        </div>

        {/* Order Status Pie */}
        <div className="bg-white rounded-2xl p-4 md:p-5 shadow-sm border border-slate-100">
          <h2 className="text-sm font-bold text-slate-800 mb-1">Order Status</h2>
          <p className="text-xs text-slate-400 mb-3">All time breakdown</p>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={ORDER_STATUS_DATA} cx="50%" cy="50%" innerRadius={45} outerRadius={70}
                paddingAngle={3} dataKey="value">
                {ORDER_STATUS_DATA.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(v, n) => [v, n]} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 mt-2">
            {ORDER_STATUS_DATA.map((d) => (
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
        {/* Category Bar Chart */}
        <div className="bg-white rounded-2xl p-4 md:p-5 shadow-sm border border-slate-100">
          <h2 className="text-sm font-bold text-slate-800 mb-1">Sales by Category</h2>
          <p className="text-xs text-slate-400 mb-4">Revenue per product category</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={CATEGORY_SALES} layout="vertical" margin={{ left: 0, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <YAxis type="category" dataKey="category" tick={{ fontSize: 11, fill: "#64748b" }}
                axisLine={false} tickLine={false} width={70} />
              <Tooltip formatter={(v) => [`LKR ${fmt(v)}`, "Revenue"]} />
              <Bar dataKey="sales" fill="#2BB9B4" radius={[0, 6, 6, 0]} barSize={14} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top Products */}
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
          <div className="space-y-3">
            {TOP_PRODUCTS.map((p, i) => (
              <div key={p.name} className="flex items-center gap-3">
                <span className="w-5 text-xs text-slate-400 font-semibold text-center">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-800 truncate">{p.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-tenzy-teal rounded-full"
                        style={{ width: `${(p.sales / TOP_PRODUCTS[0].sales) * 100}%` }} />
                    </div>
                    <span className="text-[10px] text-slate-400 w-8 text-right">{p.sales}</span>
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
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50">
                {["Order ID", "Customer", "Date", "Total", "Status"].map((h) => (
                  <th key={h} className="text-left text-xs font-semibold text-slate-500 px-4 md:px-5 py-3">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {recentOrders.map((order) => (
                <tr key={order.id} className="hover:bg-slate-50 transition-colors cursor-pointer"
                  onClick={() => navigate("/admin/orders")}>
                  <td className="px-4 md:px-5 py-3 text-xs font-mono font-semibold text-tenzy-teal">
                    {order.id}
                  </td>
                  <td className="px-4 md:px-5 py-3">
                    <p className="text-xs font-semibold text-slate-800">{order.customer}</p>
                    <p className="text-[10px] text-slate-400">{order.city}</p>
                  </td>
                  <td className="px-4 md:px-5 py-3 text-xs text-slate-500">{order.date}</td>
                  <td className="px-4 md:px-5 py-3 text-xs font-bold text-slate-800">
                    LKR {fmt(order.total)}
                  </td>
                  <td className="px-4 md:px-5 py-3">
                    <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full capitalize ${STATUS_COLORS[order.status]}`}>
                      {order.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
