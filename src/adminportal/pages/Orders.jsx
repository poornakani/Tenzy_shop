import React, { useState, useMemo } from "react";
import { Search, X, Eye, ChevronDown } from "lucide-react";
import { ORDERS } from "../dummydata/index";

const fmt = (n) => new Intl.NumberFormat("en-LK").format(n);

const STATUS_STYLES = {
  pending:    "bg-amber-100 text-amber-700 border-amber-200",
  processing: "bg-blue-100 text-blue-700 border-blue-200",
  dispatched: "bg-indigo-100 text-indigo-700 border-indigo-200",
  delivered:  "bg-emerald-100 text-emerald-700 border-emerald-200",
  cancelled:  "bg-red-100 text-red-500 border-red-200",
};

const STATUSES = ["all", "pending", "processing", "dispatched", "delivered", "cancelled"];

export default function Orders() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orders, setOrders] = useState(ORDERS);

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      const matchSearch =
        o.id.toLowerCase().includes(search.toLowerCase()) ||
        o.customer.toLowerCase().includes(search.toLowerCase()) ||
        o.city.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === "all" || o.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [orders, search, statusFilter]);

  const counts = useMemo(() => {
    const c = { all: orders.length };
    STATUSES.slice(1).forEach((s) => {
      c[s] = orders.filter((o) => o.status === s).length;
    });
    return c;
  }, [orders]);

  const updateStatus = (orderId, newStatus) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
    );
    if (selectedOrder?.id === orderId) {
      setSelectedOrder((prev) => ({ ...prev, status: newStatus }));
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900">Orders</h1>
          <p className="text-sm text-slate-500 mt-0.5">{orders.length} total orders</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-3 md:p-4 shadow-sm border border-slate-100 space-y-3">
        {/* Search */}
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by order ID, customer, city…"
            className="w-full pl-9 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-tenzy-teal/30 focus:border-tenzy-teal transition"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X size={14} className="text-slate-400" />
            </button>
          )}
        </div>

        {/* Status tabs */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full border transition capitalize ${
                statusFilter === s
                  ? "bg-tenzy-teal text-white border-tenzy-teal"
                  : "border-slate-200 text-slate-600 hover:border-tenzy-teal hover:text-tenzy-teal"
              }`}
            >
              {s === "all" ? "All" : s} ({counts[s] ?? 0})
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {/* Mobile cards */}
        <div className="md:hidden divide-y divide-slate-50">
          {filtered.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-12">No orders found.</p>
          )}
          {filtered.map((order) => (
            <div key={order.id} className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-tenzy-teal">{order.id}</span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border capitalize ${STATUS_STYLES[order.status]}`}>
                  {order.status}
                </span>
              </div>
              <p className="text-sm font-semibold text-slate-800">{order.customer}</p>
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>{order.city} · {order.date}</span>
                <span className="font-bold text-slate-800">LKR {fmt(order.total)}</span>
              </div>
              <button
                onClick={() => setSelectedOrder(order)}
                className="w-full mt-1 text-xs font-semibold text-tenzy-teal border border-tenzy-teal/30 rounded-lg py-1.5 hover:bg-tenzy-teal/5 transition"
              >
                View Details
              </button>
            </div>
          ))}
        </div>

        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {["Order ID", "Customer", "Date", "Items", "Total", "Payment", "Status", "Action"].map((h) => (
                  <th key={h} className="text-left text-xs font-semibold text-slate-500 px-5 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-sm text-slate-400">No orders found.</td>
                </tr>
              )}
              {filtered.map((order) => (
                <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3 text-xs font-mono font-bold text-tenzy-teal">{order.id}</td>
                  <td className="px-5 py-3">
                    <p className="text-xs font-semibold text-slate-800">{order.customer}</p>
                    <p className="text-[10px] text-slate-400">{order.city}</p>
                  </td>
                  <td className="px-5 py-3 text-xs text-slate-500">{order.date}</td>
                  <td className="px-5 py-3 text-xs text-slate-600">{order.items.length} item{order.items.length > 1 ? "s" : ""}</td>
                  <td className="px-5 py-3 text-xs font-bold text-slate-800">LKR {fmt(order.total)}</td>
                  <td className="px-5 py-3 text-xs text-slate-500">{order.payment}</td>
                  <td className="px-5 py-3">
                    <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border capitalize ${STATUS_STYLES[order.status]}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <button
                      onClick={() => setSelectedOrder(order)}
                      className="flex items-center gap-1 text-xs text-tenzy-teal font-semibold hover:underline"
                    >
                      <Eye size={13} /> View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSelectedOrder(null)} />
          <div className="relative bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-3xl max-h-[90vh] overflow-y-auto shadow-2xl">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white px-5 py-4 border-b border-slate-100 flex items-center justify-between rounded-t-3xl sm:rounded-t-2xl z-10">
              <div>
                <p className="text-xs text-slate-400">Order Details</p>
                <p className="font-bold text-slate-900 text-sm font-mono">{selectedOrder.id}</p>
              </div>
              <button onClick={() => setSelectedOrder(null)}
                className="p-2 rounded-full hover:bg-slate-100">
                <X size={18} className="text-slate-500" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Status badge */}
              <div className="flex items-center justify-between">
                <span className={`text-xs font-semibold px-3 py-1.5 rounded-full border capitalize ${STATUS_STYLES[selectedOrder.status]}`}>
                  {selectedOrder.status}
                </span>
                <span className="text-xs text-slate-400">{selectedOrder.date}</span>
              </div>

              {/* Customer */}
              <div className="bg-slate-50 rounded-xl p-4 space-y-1.5">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Customer</p>
                <p className="text-sm font-bold text-slate-800">{selectedOrder.customer}</p>
                <p className="text-xs text-slate-500">{selectedOrder.email}</p>
                <p className="text-xs text-slate-500">{selectedOrder.phone}</p>
                <p className="text-xs text-slate-500">{selectedOrder.address}</p>
              </div>

              {/* Items */}
              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Items</p>
                <div className="space-y-2">
                  {selectedOrder.items.map((item, i) => (
                    <div key={i} className="flex items-center justify-between text-xs bg-slate-50 rounded-lg px-3 py-2">
                      <span className="text-slate-700 font-medium flex-1 pr-2">{item.name}</span>
                      <span className="text-slate-500">×{item.qty}</span>
                      <span className="text-slate-800 font-bold ml-3">LKR {fmt(item.price * item.qty)}</span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between mt-3 pt-3 border-t border-slate-100">
                  <span className="text-sm font-bold text-slate-800">Total</span>
                  <span className="text-sm font-bold text-tenzy-teal">LKR {fmt(selectedOrder.total)}</span>
                </div>
              </div>

              {/* Tracking */}
              {selectedOrder.trackingId && (
                <div className="bg-indigo-50 rounded-xl p-3 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-semibold text-indigo-400 uppercase">Tracking ID</p>
                    <p className="text-sm font-bold text-indigo-700 font-mono">{selectedOrder.trackingId}</p>
                  </div>
                  <span className="text-xs text-indigo-500 font-medium">{selectedOrder.courier}</span>
                </div>
              )}

              {/* Notes */}
              {selectedOrder.notes && (
                <div className="bg-amber-50 rounded-xl p-3">
                  <p className="text-[10px] font-semibold text-amber-500 uppercase mb-1">Notes</p>
                  <p className="text-xs text-amber-700">{selectedOrder.notes}</p>
                </div>
              )}

              {/* Update Status */}
              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Update Status</p>
                <div className="flex flex-wrap gap-2">
                  {STATUSES.slice(1).map((s) => (
                    <button
                      key={s}
                      onClick={() => updateStatus(selectedOrder.id, s)}
                      disabled={selectedOrder.status === s}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-full border capitalize transition ${
                        selectedOrder.status === s
                          ? STATUS_STYLES[s] + " opacity-60 cursor-default"
                          : "border-slate-200 text-slate-600 hover:border-tenzy-teal hover:text-tenzy-teal"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
