import React, { useState, useMemo } from "react";
import { Truck, Package, CheckCircle2, Clock, Search, X, MapPin } from "lucide-react";
import { ORDERS } from "../dummydata/index";

const fmt = (n) => new Intl.NumberFormat("en-LK").format(n);

const COURIERS = ["Kapruka", "DHL", "FedEx", "Lanka Hand", "Pick Me Flash"];

export default function Dispatch() {
  const [orders, setOrders] = useState(
    ORDERS.filter((o) => ["pending", "processing", "dispatched"].includes(o.status))
  );
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("ready"); // ready | dispatched
  const [assignModal, setAssignModal] = useState(null);
  const [courier, setCourier] = useState("Kapruka");
  const [tracking, setTracking] = useState("");


  const handleDispatch = () => {
    if (!tracking.trim()) return;
    setOrders((prev) =>
      prev.map((o) =>
        o.id === assignModal.id
          ? { ...o, status: "dispatched", courier, trackingId: tracking }
          : o
      )
    );
    setAssignModal(null);
    setTracking("");
    setCourier("Kapruka");
  };

  const markDelivered = (id) => {
    setOrders((prev) => prev.filter((o) => o.id !== id));
  };

  const readyList = orders.filter((o) =>
    ["pending", "processing"].includes(o.status) &&
    (o.customer.toLowerCase().includes(search.toLowerCase()) ||
     o.id.toLowerCase().includes(search.toLowerCase()))
  );

  const dispatchedList = orders.filter((o) =>
    o.status === "dispatched" &&
    (o.customer.toLowerCase().includes(search.toLowerCase()) ||
     o.id.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-slate-900">Dispatch Management</h1>
        <p className="text-sm text-slate-500 mt-0.5">Manage order fulfilment and shipping</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Ready to Dispatch", value: orders.filter((o) => ["pending", "processing"].includes(o.status)).length, color: "bg-amber-500", icon: Package },
          { label: "Dispatched", value: orders.filter((o) => o.status === "dispatched").length, color: "bg-indigo-500", icon: Truck },
          { label: "Delivered Today", value: 12, color: "bg-tenzy-teal", icon: CheckCircle2 },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} className="bg-white rounded-2xl p-3 md:p-4 shadow-sm border border-slate-100 text-center">
            <div className={`w-9 h-9 ${color} rounded-xl flex items-center justify-center mx-auto mb-2`}>
              <Icon size={16} className="text-white" />
            </div>
            <p className="text-2xl font-bold text-slate-900">{value}</p>
            <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">{label}</p>
          </div>
        ))}
      </div>

      {/* Search + Tabs */}
      <div className="bg-white rounded-2xl p-3 md:p-4 shadow-sm border border-slate-100 space-y-3">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by order ID or customer…"
            className="w-full pl-9 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-tenzy-teal/30 focus:border-tenzy-teal transition" />
          {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2"><X size={14} className="text-slate-400" /></button>}
        </div>
        <div className="flex gap-2">
          {[
            { key: "ready", label: `Ready (${readyList.length})` },
            { key: "dispatched", label: `Dispatched (${dispatchedList.length})` },
          ].map(({ key, label }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex-1 text-xs font-semibold py-2 rounded-xl transition ${
                tab === key ? "bg-tenzy-teal text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Ready to Dispatch */}
      {tab === "ready" && (
        <div className="space-y-3">
          {readyList.length === 0 && (
            <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-slate-100">
              <CheckCircle2 size={40} className="text-emerald-400 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-600">All orders dispatched!</p>
              <p className="text-xs text-slate-400 mt-1">No pending orders to fulfil.</p>
            </div>
          )}
          {readyList.map((order) => (
            <div key={order.id} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono font-bold text-tenzy-teal">{order.id}</span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${
                      order.status === "pending" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"
                    }`}>
                      {order.status}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-slate-800">{order.customer}</p>
                  <div className="flex items-center gap-1 mt-0.5 text-xs text-slate-500">
                    <MapPin size={11} />
                    <span>{order.address}, {order.city}</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{order.items.length} item(s) · LKR {fmt(order.total)}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {order.items.map((item, i) => (
                      <span key={i} className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                        {item.name} ×{item.qty}
                      </span>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => setAssignModal(order)}
                  className="flex-shrink-0 flex items-center gap-1.5 bg-tenzy-teal text-white text-xs font-bold px-3 py-2 rounded-xl hover:opacity-90 transition active:scale-95"
                >
                  <Truck size={13} /> Dispatch
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dispatched */}
      {tab === "dispatched" && (
        <div className="space-y-3">
          {dispatchedList.length === 0 && (
            <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-slate-100">
              <Truck size={40} className="text-indigo-300 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-600">No dispatched orders</p>
            </div>
          )}
          {dispatchedList.map((order) => (
            <div key={order.id} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono font-bold text-tenzy-teal">{order.id}</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">Dispatched</span>
                  </div>
                  <p className="text-sm font-bold text-slate-800">{order.customer}</p>
                  <div className="flex items-center gap-1 mt-0.5 text-xs text-slate-500">
                    <MapPin size={11} />
                    <span>{order.city}</span>
                  </div>
                  <div className="mt-2 flex items-center gap-3">
                    <div className="bg-indigo-50 rounded-lg px-3 py-1.5">
                      <p className="text-[10px] text-indigo-400 font-semibold">Tracking ID</p>
                      <p className="text-xs font-bold text-indigo-700 font-mono">{order.trackingId}</p>
                    </div>
                    <div className="bg-slate-50 rounded-lg px-3 py-1.5">
                      <p className="text-[10px] text-slate-400 font-semibold">Courier</p>
                      <p className="text-xs font-bold text-slate-700">{order.courier}</p>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => markDelivered(order.id)}
                  className="flex-shrink-0 flex items-center gap-1.5 bg-emerald-500 text-white text-xs font-bold px-3 py-2 rounded-xl hover:opacity-90 transition"
                >
                  <CheckCircle2 size={13} /> Delivered
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Assign Courier Modal */}
      {assignModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setAssignModal(null)} />
          <div className="relative bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-3xl shadow-2xl">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between rounded-t-3xl sm:rounded-t-2xl">
              <div>
                <p className="text-xs text-slate-400">Dispatch Order</p>
                <p className="font-bold text-slate-900 font-mono text-sm">{assignModal.id}</p>
              </div>
              <button onClick={() => setAssignModal(null)} className="p-1.5 rounded-full hover:bg-slate-100">
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-xs font-semibold text-slate-500 mb-1">{assignModal.customer}</p>
                <p className="text-xs text-slate-400">{assignModal.address}</p>
                <p className="text-xs font-bold text-slate-700 mt-1">LKR {fmt(assignModal.total)}</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Courier Service</label>
                <select value={courier} onChange={(e) => setCourier(e.target.value)}
                  className="w-full text-sm px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-tenzy-teal/30">
                  {COURIERS.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Tracking ID *</label>
                <input value={tracking} onChange={(e) => setTracking(e.target.value)}
                  placeholder="e.g. TRK-00000"
                  className="w-full text-sm px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-tenzy-teal/30 focus:border-tenzy-teal transition" />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setAssignModal(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600">Cancel</button>
                <button onClick={handleDispatch}
                  className="flex-1 py-2.5 rounded-xl bg-tenzy-teal text-white text-sm font-bold hover:opacity-90 transition flex items-center justify-center gap-2">
                  <Truck size={15} /> Confirm Dispatch
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
