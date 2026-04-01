import React, { useState, useEffect, useCallback } from "react";
import { Search, X, Users, TrendingUp, ShoppingBag, MapPin } from "lucide-react";
import { customersApi } from "../../services/api";

const fmt = (n) => new Intl.NumberFormat("en-LK").format(n);

export default function Customers() {
  const [customers,    setCustomers]    = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState("");
  const [searchInput,  setSearchInput]  = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const load = useCallback((q = "") => {
    setLoading(true);
    customersApi.getAll(1, q)
      .then((data) => setCustomers(Array.isArray(data) ? data : (data?.items ?? [])))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      load(searchInput);
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput, load]);

  const filtered = customers.filter((c) => {
    if (statusFilter === "all") return true;
    const active = c.isActive ?? c.status === "active";
    return statusFilter === "active" ? active : !active;
  });

  const totalRevenue = customers.reduce((s, c) => s + (c.totalSpent ?? 0), 0);
  const avgSpend     = customers.length ? Math.round(totalRevenue / customers.length) : 0;
  const activeCount  = customers.filter((c) => (c.isActive ?? c.status === "active")).length;

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 rounded-full border-4 border-tenzy-teal/30 border-t-tenzy-teal animate-spin" />
    </div>
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-slate-900">Customers</h1>
        <p className="text-sm text-slate-500 mt-0.5">{customers.length} registered customers</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Customers", value: customers.length,                icon: Users,       color: "bg-tenzy-teal" },
          { label: "Total Revenue",   value: `LKR ${fmt(totalRevenue)}`,      icon: TrendingUp,  color: "bg-tenzy-orange" },
          { label: "Avg. Spend",      value: `LKR ${fmt(avgSpend)}`,          icon: ShoppingBag, color: "bg-indigo-500" },
          { label: "Active",          value: activeCount,                     icon: Users,       color: "bg-emerald-500" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center gap-3">
            <div className={`w-10 h-10 ${color} rounded-xl flex items-center justify-center flex-shrink-0`}>
              <Icon size={18} className="text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-slate-400 leading-none mb-1">{label}</p>
              <p className="text-sm font-bold text-slate-900 truncate">{value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl p-3 md:p-4 shadow-sm border border-slate-100 space-y-3">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={searchInput} onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by name, email, city…"
            className="w-full pl-9 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-tenzy-teal/30 focus:border-tenzy-teal transition" />
          {searchInput && (
            <button onClick={() => { setSearchInput(""); setSearch(""); load(""); }}
              className="absolute right-3 top-1/2 -translate-y-1/2"><X size={14} className="text-slate-400" /></button>
          )}
        </div>
        <div className="flex gap-2">
          {["all", "active", "inactive"].map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`text-xs font-semibold px-4 py-1.5 rounded-full border capitalize transition ${
                statusFilter === s ? "bg-tenzy-teal text-white border-tenzy-teal" : "border-slate-200 text-slate-600 hover:border-tenzy-teal hover:text-tenzy-teal"
              }`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {filtered.length === 0 && (
          <p className="text-sm text-slate-400 text-center py-12">No customers found.</p>
        )}
        {filtered.map((c) => {
          const name   = c.displayName ?? c.name ?? "—";
          const active = c.isActive ?? c.status === "active";
          return (
            <div key={c.userId ?? c.id} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-tenzy-teal/10 rounded-full flex items-center justify-center text-tenzy-teal font-bold text-sm flex-shrink-0">
                  {name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-800 truncate">{name}</p>
                  <p className="text-xs text-slate-400 truncate">{c.email}</p>
                </div>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${
                  active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                }`}>
                  {active ? "active" : "inactive"}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-slate-50 rounded-xl py-2">
                  <p className="text-xs font-bold text-slate-800">{c.orderCount ?? c.orders ?? "—"}</p>
                  <p className="text-[10px] text-slate-400">Orders</p>
                </div>
                <div className="bg-slate-50 rounded-xl py-2">
                  <p className="text-xs font-bold text-slate-800">LKR {fmt(c.totalSpent ?? 0)}</p>
                  <p className="text-[10px] text-slate-400">Spent</p>
                </div>
                <div className="bg-slate-50 rounded-xl py-2">
                  <p className="text-xs font-bold text-slate-800">{c.city ?? "—"}</p>
                  <p className="text-[10px] text-slate-400">City</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              {["Customer", "Contact", "City", "Joined", "Orders", "Total Spent", "Last Order", "Status"].map((h) => (
                <th key={h} className="text-left text-xs font-semibold text-slate-500 px-5 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filtered.length === 0 && (
              <tr><td colSpan={8} className="text-center py-12 text-sm text-slate-400">No customers found.</td></tr>
            )}
            {filtered.map((c) => {
              const name   = c.displayName ?? c.name ?? "—";
              const active = c.isActive ?? c.status === "active";
              return (
                <tr key={c.userId ?? c.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-tenzy-teal/10 rounded-full flex items-center justify-center text-tenzy-teal font-bold text-sm flex-shrink-0">
                        {name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800">{name}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{c.userId ?? c.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <p className="text-xs text-slate-600">{c.email}</p>
                    <p className="text-[10px] text-slate-400">{c.phone ?? "—"}</p>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1 text-xs text-slate-600">
                      <MapPin size={11} className="text-slate-400" />
                      {c.city ?? "—"}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-xs text-slate-500">
                    {c.createdAt ? new Date(c.createdAt).toLocaleDateString("en-GB") : "—"}
                  </td>
                  <td className="px-5 py-3 text-xs font-bold text-slate-800 text-center">
                    {c.orderCount ?? c.orders ?? "—"}
                  </td>
                  <td className="px-5 py-3 text-xs font-bold text-slate-800">LKR {fmt(c.totalSpent ?? 0)}</td>
                  <td className="px-5 py-3 text-xs text-slate-500">
                    {c.lastOrderAt ? new Date(c.lastOrderAt).toLocaleDateString("en-GB") : "—"}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full capitalize ${
                      active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                    }`}>
                      {active ? "active" : "inactive"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
