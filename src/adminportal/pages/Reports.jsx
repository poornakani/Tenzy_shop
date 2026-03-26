import React, { useState } from "react";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { TrendingUp, Download, DollarSign, ShoppingCart, Users, Package } from "lucide-react";
import {
  MONTHLY_REVENUE, WEEKLY_REVENUE, CATEGORY_SALES, TOP_PRODUCTS, STATS,
} from "../dummydata/index";

const fmt = (n) => new Intl.NumberFormat("en-LK").format(n);

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900 text-white text-xs rounded-xl px-3 py-2 shadow-xl">
      <p className="font-semibold mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name}: {typeof p.value === "number" && p.value > 1000 ? `LKR ${fmt(p.value)}` : p.value}
        </p>
      ))}
    </div>
  );
};

const MetricCard = ({ label, value, change, icon: Icon, color }) => (
  <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-xs text-slate-500 mb-1">{label}</p>
        <p className="text-lg font-bold text-slate-900">{value}</p>
        <div className="flex items-center gap-1 mt-1.5 text-xs font-semibold text-emerald-600">
          <TrendingUp size={12} />
          +{change}% vs last month
        </div>
      </div>
      <div className={`w-10 h-10 ${color} rounded-xl flex items-center justify-center`}>
        <Icon size={18} className="text-white" />
      </div>
    </div>
  </div>
);

export default function Reports() {
  const [period, setPeriod] = useState("monthly");

  const chartData = period === "weekly" ? WEEKLY_REVENUE : MONTHLY_REVENUE;
  const xKey = period === "weekly" ? "day" : "month";

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900">Reports & Analytics</h1>
          <p className="text-sm text-slate-500 mt-0.5">Business performance overview</p>
        </div>
        <button className="hidden sm:flex items-center gap-2 text-xs font-semibold text-tenzy-teal border border-tenzy-teal/30 px-3 py-2 rounded-xl hover:bg-tenzy-teal/5 transition">
          <Download size={14} /> Export
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard label="Total Revenue" value={`LKR ${fmt(STATS.totalRevenue)}`} change={STATS.revenueChange} icon={DollarSign} color="bg-tenzy-teal" />
        <MetricCard label="Total Orders" value={STATS.totalOrders} change={STATS.ordersChange} icon={ShoppingCart} color="bg-tenzy-orange" />
        <MetricCard label="Customers" value={STATS.totalCustomers} change={STATS.customersChange} icon={Users} color="bg-indigo-500" />
        <MetricCard label="Avg. Order Value" value={`LKR ${fmt(STATS.avgOrderValue)}`} change={5.8} icon={Package} color="bg-amber-500" />
      </div>

      {/* Revenue Chart */}
      <div className="bg-white rounded-2xl p-4 md:p-5 shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold text-slate-800">Revenue Trend</h2>
            <p className="text-xs text-slate-400">Orders and revenue over time</p>
          </div>
          <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
            {["weekly", "monthly"].map((p) => (
              <button key={p} onClick={() => setPeriod(p)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg capitalize transition ${
                  period === p ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
                }`}>
                {p}
              </button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2BB9B4" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#2BB9B4" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="ordGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#E8522A" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#E8522A" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
            <YAxis yAxisId="rev" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false}
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
            <YAxis yAxisId="ord" orientation="right" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
            <Area yAxisId="rev" type="monotone" dataKey="revenue" name="Revenue (LKR)" stroke="#2BB9B4"
              strokeWidth={2.5} fill="url(#revGrad)" dot={false} activeDot={{ r: 5 }} />
            <Area yAxisId="ord" type="monotone" dataKey="orders" name="Orders" stroke="#E8522A"
              strokeWidth={2} fill="url(#ordGrad)" dot={false} activeDot={{ r: 4 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Category + Top Products Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Category Performance */}
        <div className="bg-white rounded-2xl p-4 md:p-5 shadow-sm border border-slate-100">
          <h2 className="text-sm font-bold text-slate-800 mb-1">Category Performance</h2>
          <p className="text-xs text-slate-400 mb-4">Revenue per category (LKR)</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={CATEGORY_SALES} margin={{ left: -15, right: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="category" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="sales" name="Revenue" fill="#2BB9B4" radius={[6, 6, 0, 0]} barSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top Products Table */}
        <div className="bg-white rounded-2xl p-4 md:p-5 shadow-sm border border-slate-100">
          <h2 className="text-sm font-bold text-slate-800 mb-1">Top Products</h2>
          <p className="text-xs text-slate-400 mb-4">By revenue generated</p>
          <div className="space-y-3">
            {TOP_PRODUCTS.map((p, i) => (
              <div key={p.name} className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-slate-100 text-[10px] font-bold text-slate-500 flex items-center justify-center flex-shrink-0">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-800 truncate">{p.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full"
                        style={{ width: `${(p.revenue / TOP_PRODUCTS[0].revenue) * 100}%`, background: i === 0 ? "#2BB9B4" : i === 1 ? "#E8522A" : "#6366f1" }} />
                    </div>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs font-bold text-slate-800">LKR {fmt(p.revenue)}</p>
                  <p className="text-[10px] text-slate-400">{p.sales} sold</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Summary Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="text-sm font-bold text-slate-800">Monthly Summary</h2>
          <p className="text-xs text-slate-400">Revenue and orders breakdown by month</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50">
                {["Month", "Revenue (LKR)", "Orders", "Customers", "Avg. Order Value"].map((h) => (
                  <th key={h} className="text-left text-xs font-semibold text-slate-500 px-5 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {[...MONTHLY_REVENUE].reverse().map((row) => {
                const avg = Math.round(row.revenue / row.orders);
                return (
                  <tr key={row.month} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3 text-xs font-semibold text-slate-700">{row.month} 2026</td>
                    <td className="px-5 py-3 text-xs font-bold text-tenzy-teal">LKR {fmt(row.revenue)}</td>
                    <td className="px-5 py-3 text-xs text-slate-600">{row.orders}</td>
                    <td className="px-5 py-3 text-xs text-slate-600">{row.customers}</td>
                    <td className="px-5 py-3 text-xs text-slate-600">LKR {fmt(avg)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
