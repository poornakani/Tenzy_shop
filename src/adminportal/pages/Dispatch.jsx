import React, { useState, useEffect, useCallback } from "react";
import { Truck, Package, CheckCircle2, Clock, Search, X, MapPin } from "lucide-react";
import { ordersApi, dispatchApi } from "../../services/api";

const fmt = (n) => new Intl.NumberFormat("en-LK").format(n);
const COURIERS = ["Kapruka", "DHL", "FedEx", "Lanka Hand", "Pick Me Flash"];

export default function Dispatch() {
  const [orders,      setOrders]      = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState("");
  const [tab,         setTab]         = useState("ready");
  const [assignModal, setAssignModal] = useState(null);
  const [courier,     setCourier]     = useState("Kapruka");
  const [tracking,    setTracking]    = useState("");
  const [saving,      setSaving]      = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    ordersApi.getAll(1, 200)
      .then((data) => {
        const list = Array.isArray(data) ? data : (data?.items ?? []);
        setOrders(list.filter((o) =>
          ["pending", "processing", "dispatched"].includes((o.status ?? "").toLowerCase())
        ));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDispatch = async () => {
    if (!tracking.trim() || saving) return;
    setSaving(true);
    try {
      await dispatchApi.upsert({
        orderId:    assignModal.orderId ?? assignModal.id,
        courier,
        trackingId: tracking,
      });
      await ordersApi.updateStatus(assignModal.orderId ?? assignModal.id, "dispatched");
      setAssignModal(null);
      setTracking("");
      setCourier("Kapruka");
      load();
    } catch (err) { alert(err.message); }
    finally { setSaving(false); }
  };

  const markDelivered = async (orderId) => {
    try {
      await dispatchApi.markDelivered(orderId);
      setOrders((prev) => prev.filter((o) => (o.orderId ?? o.id) !== orderId));
    } catch (err) { alert(err.message); }
  };

  const q = search.toLowerCase();
  const readyList = orders.filter((o) => {
    const status = (o.status ?? "").toLowerCase();
    const matchStatus = status === "pending" || status === "processing";
    const matchSearch = !q ||
      (o.customerName ?? "").toLowerCase().includes(q) ||
      (o.orderRef ?? "").toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  const dispatchedList = orders.filter((o) => {
    const matchStatus = (o.status ?? "").toLowerCase() === "dispatched";
    const matchSearch = !q ||
      (o.customerName ?? "").toLowerCase().includes(q) ||
      (o.orderRef ?? "").toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 rounded-full border-4 border-tenzy-teal/30 border-t-tenzy-teal animate-spin" />
    </div>
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-slate-900">Dispatch Management</h1>
        <p className="text-sm text-slate-500 mt-0.5">Manage order fulfilment and shipping</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Ready to Dispatch", value: orders.filter((o) => ["pending","processing"].includes((o.status ?? "").toLowerCase())).length, color: "bg-amber-500", icon: Package },
          { label: "Dispatched",        value: orders.filter((o) => (o.status ?? "").toLowerCase() === "dispatched").length, color: "bg-indigo-500", icon: Truck },
          { label: "Total Active",      value: orders.length, color: "bg-tenzy-teal", icon: CheckCircle2 },
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

      <div className="bg-white rounded-2xl p-3 md:p-4 shadow-sm border border-slate-100 space-y-3">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by order ref or customer…"
            className="w-full pl-9 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-tenzy-teal/30 focus:border-tenzy-teal transition" />
          {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2"><X size={14} className="text-slate-400" /></button>}
        </div>
        <div className="flex gap-2">
          {[
            { key: "ready",      label: `Ready (${readyList.length})` },
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
            <div key={order.orderId ?? order.id} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono font-bold text-tenzy-teal">{order.orderRef}</span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${
                      (order.status ?? "").toLowerCase() === "pending" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"
                    }`}>
                      {order.status}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-slate-800">{order.customerName}</p>
                  <div className="flex items-center gap-1 mt-0.5 text-xs text-slate-500">
                    <MapPin size={11} />
                    <span>{order.shippingAddress ? `${order.shippingAddress}, ` : ""}{order.shippingCity}</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    {order.itemCount ?? "—"} item(s) · LKR {fmt(order.totalLkr ?? 0)}
                  </p>
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

      {tab === "dispatched" && (
        <div className="space-y-3">
          {dispatchedList.length === 0 && (
            <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-slate-100">
              <Truck size={40} className="text-indigo-300 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-600">No dispatched orders</p>
            </div>
          )}
          {dispatchedList.map((order) => (
            <div key={order.orderId ?? order.id} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono font-bold text-tenzy-teal">{order.orderRef}</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">Dispatched</span>
                  </div>
                  <p className="text-sm font-bold text-slate-800">{order.customerName}</p>
                  <div className="flex items-center gap-1 mt-0.5 text-xs text-slate-500">
                    <MapPin size={11} />
                    <span>{order.shippingCity}</span>
                  </div>
                  {(order.trackingId || order.courier) && (
                    <div className="mt-2 flex items-center gap-3">
                      {order.trackingId && (
                        <div className="bg-indigo-50 rounded-lg px-3 py-1.5">
                          <p className="text-[10px] text-indigo-400 font-semibold">Tracking ID</p>
                          <p className="text-xs font-bold text-indigo-700 font-mono">{order.trackingId}</p>
                        </div>
                      )}
                      {order.courier && (
                        <div className="bg-slate-50 rounded-lg px-3 py-1.5">
                          <p className="text-[10px] text-slate-400 font-semibold">Courier</p>
                          <p className="text-xs font-bold text-slate-700">{order.courier}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => markDelivered(order.orderId ?? order.id)}
                  className="flex-shrink-0 flex items-center gap-1.5 bg-emerald-500 text-white text-xs font-bold px-3 py-2 rounded-xl hover:opacity-90 transition"
                >
                  <CheckCircle2 size={13} /> Delivered
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {assignModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setAssignModal(null)} />
          <div className="relative bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-3xl shadow-2xl">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between rounded-t-3xl sm:rounded-t-2xl">
              <div>
                <p className="text-xs text-slate-400">Dispatch Order</p>
                <p className="font-bold text-slate-900 font-mono text-sm">{assignModal.orderRef}</p>
              </div>
              <button onClick={() => setAssignModal(null)} className="p-1.5 rounded-full hover:bg-slate-100">
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-xs font-semibold text-slate-500 mb-1">{assignModal.customerName}</p>
                <p className="text-xs text-slate-400">
                  {assignModal.shippingAddress ? `${assignModal.shippingAddress}, ` : ""}{assignModal.shippingCity}
                </p>
                <p className="text-xs font-bold text-slate-700 mt-1">LKR {fmt(assignModal.totalLkr ?? 0)}</p>
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
                <button onClick={handleDispatch} disabled={saving}
                  className="flex-1 py-2.5 rounded-xl bg-tenzy-teal text-white text-sm font-bold hover:opacity-90 transition disabled:opacity-60 flex items-center justify-center gap-2">
                  <Truck size={15} /> {saving ? "Saving…" : "Confirm Dispatch"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
