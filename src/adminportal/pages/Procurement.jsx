import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Plus, X, Search, Package, Truck, CheckCircle2, Clock,
  AlertTriangle, Globe, Receipt, Eye, ChevronRight,
  DollarSign, PackagePlus, Info,
} from "lucide-react";
import { procurementApi, productsApi } from "../../services/api";

const fmt    = (n) => new Intl.NumberFormat("en-LK").format(Math.round(n ?? 0));
const fmtGbp = (n) => `£${parseFloat(n || 0).toFixed(2)}`;

const STATUS = {
  ordered:    { label: "Ordered",    cls: "bg-slate-100 text-slate-600 border-slate-200",       icon: Clock        },
  in_transit: { label: "In Transit", cls: "bg-blue-100  text-blue-700  border-blue-200",        icon: Truck        },
  arrived:    { label: "Arrived",    cls: "bg-amber-100 text-amber-700 border-amber-200",       icon: Package      },
  approved:   { label: "Approved",   cls: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
};

const TABS = ["all", "ordered", "in_transit", "arrived", "approved"];

const calcTotals = (order) => {
  const totalGbp   = (order.items ?? []).reduce((s, i) => s + (parseFloat(i.quantity) || 0) * (parseFloat(i.unitPriceGbp) || 0), 0);
  const totalLkr   = totalGbp * (parseFloat(order.gbpToLkr) || 0);
  const charges    = (parseFloat(order.courierCharges) || 0) + (parseFloat(order.customsDuty) || 0) + (parseFloat(order.otherCharges) || 0);
  const landedCost = totalLkr + charges;
  return { totalGbp, totalLkr, charges, landedCost };
};

const Input = (props) => (
  <input
    className="w-full text-sm px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl
               outline-none focus:ring-2 focus:ring-tenzy-teal/30 focus:border-tenzy-teal transition"
    {...props}
  />
);

const Lbl = ({ children, required }) => (
  <label className="block text-xs font-semibold text-slate-600 mb-1">
    {children}{required && <span className="text-red-400 ml-0.5">*</span>}
  </label>
);

const SectionHead = ({ icon: Icon, title }) => (
  <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
    <Icon size={14} className="text-tenzy-teal" />
    <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">{title}</h3>
  </div>
);

const emptyOrder = () => ({
  supplier: "", orderDate: new Date().toISOString().slice(0, 10),
  expectedArrival: "", gbpToLkr: "382",
  items: [], courierCharges: "", customsDuty: "", otherCharges: "", notes: "",
});
const emptyItem = () => ({ productId: "", productName: "", quantity: "", unitPriceGbp: "" });

const NEXT_STATUS = { ordered: "in_transit", in_transit: "arrived" };
const NEXT_LABEL  = { ordered: "Mark as In Transit", in_transit: "Mark as Arrived" };

// Normalise an API order to consistent local shape
const normalise = (o) => ({
  id:               o.procurementId ?? o.id ?? o.poNumber ?? "—",
  supplier:         o.supplier ?? o.supplierName ?? "—",
  orderDate:        (o.orderDate ?? "").slice(0, 10),
  expectedArrival:  (o.expectedArrival ?? "").slice(0, 10),
  arrivalDate:      o.arrivalDate ? o.arrivalDate.slice(0, 10) : null,
  status:           o.status ?? "ordered",
  gbpToLkr:         o.gbpToLkr ?? o.exchangeRate ?? 382,
  items:            Array.isArray(o.items) ? o.items.map((i) => ({
    productId:    i.productId   ?? i.productid   ?? 0,
    productName:  i.productName ?? "—",
    quantity:     i.quantity    ?? 0,
    unitPriceGbp: i.unitPriceGbp ?? i.unitPrice ?? 0,
  })) : [],
  courierCharges:   o.courierCharges ?? 0,
  customsDuty:      o.customsDuty    ?? 0,
  otherCharges:     o.otherCharges   ?? 0,
  notes:            o.notes ?? "",
  approvedBy:       o.approvedBy   ?? null,
  approvedDate:     o.approvedDate ? o.approvedDate.slice(0, 10) : null,
});

export default function Procurement() {
  const [orders,   setOrders]   = useState([]);
  const [products, setProducts] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [tab,      setTab]      = useState("all");
  const [search,   setSearch]   = useState("");
  const [drawer,   setDrawer]   = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [form,     setForm]     = useState(emptyOrder());
  const [newItem,  setNewItem]  = useState(emptyItem());
  const [selected, setSelected] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    Promise.allSettled([procurementApi.getAll(), productsApi.getAll()])
      .then(([pR, prR]) => {
        if (pR.status  === "fulfilled") setOrders((Array.isArray(pR.value)  ? pR.value  : []).map(normalise));
        if (prR.status === "fulfilled") setProducts(Array.isArray(prR.value) ? prR.value : []);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() =>
    orders.filter((o) => {
      const matchTab    = tab === "all" || o.status === tab;
      const q           = search.toLowerCase();
      const matchSearch = !q || o.id.toLowerCase().includes(q) || o.supplier.toLowerCase().includes(q);
      return matchTab && matchSearch;
    }),
    [orders, tab, search]
  );

  const totalSpent     = orders.filter((o) => o.status === "approved").reduce((s, o) => s + calcTotals(o).landedCost, 0);
  const inTransitCount = orders.filter((o) => o.status === "in_transit").length;
  const arrivedCount   = orders.filter((o) => o.status === "arrived").length;

  const addItem = () => {
    if (!newItem.productId || !newItem.quantity || !newItem.unitPriceGbp) return;
    const prod = products.find((p) => (p.productId ?? p.productid) === parseInt(newItem.productId));
    setForm((f) => ({
      ...f,
      items: [...f.items, {
        productId:    parseInt(newItem.productId),
        productName:  prod?.name ?? "",
        quantity:     parseInt(newItem.quantity),
        unitPriceGbp: parseFloat(newItem.unitPriceGbp),
      }],
    }));
    setNewItem(emptyItem());
  };

  const saveOrder = async () => {
    if (!form.supplier.trim() || form.items.length === 0 || saving) return;
    setSaving(true);
    try {
      const body = {
        supplier:        form.supplier.trim(),
        orderDate:       form.orderDate,
        expectedArrival: form.expectedArrival || null,
        gbpToLkr:        parseFloat(form.gbpToLkr),
        items:           form.items,
        courierCharges:  parseFloat(form.courierCharges) || 0,
        customsDuty:     parseFloat(form.customsDuty)    || 0,
        otherCharges:    parseFloat(form.otherCharges)   || 0,
        notes:           form.notes,
      };
      await procurementApi.create(body);
      load();
      setDrawer(false);
      setForm(emptyOrder());
      setNewItem(emptyItem());
    } catch (err) { alert(err.message); }
    finally { setSaving(false); }
  };

  const progressStatus = async (order) => {
    const next = NEXT_STATUS[order.status];
    if (!next) return;
    try {
      await procurementApi.updateStatus(order.id, { status: next });
      const update = {
        status: next,
        ...(next === "arrived" ? { arrivalDate: new Date().toISOString().slice(0, 10) } : {}),
      };
      setOrders((prev) => prev.map((o) => o.id === order.id ? { ...o, ...update } : o));
      setSelected((prev) => prev?.id === order.id ? { ...prev, ...update } : prev);
    } catch (err) { alert(err.message); }
  };

  const approve = async (order) => {
    try {
      await procurementApi.updateStatus(order.id, { status: "approved" });
      const today  = new Date().toISOString().slice(0, 10);
      const update = { status: "approved", approvedBy: "Admin", approvedDate: today };
      setOrders((prev) => prev.map((o) => o.id === order.id ? { ...o, ...update } : o));
      setSelected((prev) => prev?.id === order.id ? { ...prev, ...update } : prev);
    } catch (err) { alert(err.message); }
  };

  const { totalGbp: dGbp, totalLkr: dLkr, charges: dCharges, landedCost: dLanded } = calcTotals(form);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 rounded-full border-4 border-tenzy-teal/30 border-t-tenzy-teal animate-spin" />
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900">Procurement</h1>
          <p className="text-sm text-slate-500 mt-0.5">Track incoming stock shipments from international suppliers</p>
        </div>
        <button
          onClick={() => { setForm(emptyOrder()); setNewItem(emptyItem()); setDrawer(true); }}
          className="flex items-center gap-2 bg-tenzy-teal text-white text-sm font-semibold px-4 py-2 rounded-xl hover:opacity-90 transition active:scale-95 shadow-lg shadow-tenzy-teal/20"
        >
          <Plus size={16} /> <span className="hidden sm:inline">New Order</span>
        </button>
      </div>

      <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
        <Info size={15} className="text-blue-500 shrink-0 mt-0.5" />
        <p className="text-xs text-blue-700">
          Approving an order (<strong>Arrived → Approved</strong>) confirms receipt at the branch and
          <strong> increases product stock quantities</strong>.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Orders",      value: orders.length,          icon: Package,       color: "bg-tenzy-teal"  },
          { label: "In Transit",        value: inTransitCount,         icon: Truck,         color: "bg-blue-500"    },
          { label: "Awaiting Approval", value: arrivedCount,           icon: AlertTriangle, color: "bg-amber-500"   },
          { label: "Total Spent (LKR)", value: fmt(totalSpent),        icon: DollarSign,    color: "bg-indigo-500"  },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center gap-3">
            <div className={`w-10 h-10 ${color} rounded-xl flex items-center justify-center shrink-0`}>
              <Icon size={18} className="text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-slate-400 font-medium leading-none mb-1">{label}</p>
              <p className="text-sm font-bold text-slate-900 truncate">{value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl p-3 md:p-4 shadow-sm border border-slate-100 space-y-3">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by PO number or supplier…"
            className="w-full pl-9 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-tenzy-teal/30 focus:border-tenzy-teal transition" />
          {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2"><X size={14} className="text-slate-400" /></button>}
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {TABS.map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full border capitalize transition ${
                tab === t ? "bg-tenzy-teal text-white border-tenzy-teal" : "border-slate-200 text-slate-600 hover:border-tenzy-teal hover:text-tenzy-teal"
              }`}>
              {t === "all" ? "All" : STATUS[t].label} ({t === "all" ? orders.length : orders.filter((o) => o.status === t).length})
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {/* Mobile cards */}
        <div className="md:hidden divide-y divide-slate-50">
          {filtered.length === 0 && <p className="text-center text-sm text-slate-400 py-12">No orders found.</p>}
          {filtered.map((order) => {
            const { totalGbp, landedCost } = calcTotals(order);
            const st   = STATUS[order.status] ?? STATUS.ordered;
            const Icon = st.icon;
            return (
              <div key={order.id} className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-tenzy-teal">{order.id}</span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border flex items-center gap-1 ${st.cls}`}>
                    <Icon size={10} /> {st.label}
                  </span>
                </div>
                <p className="text-sm font-semibold text-slate-800">{order.supplier}</p>
                <div className="flex justify-between text-xs text-slate-500">
                  <span>{order.items.length} item{order.items.length !== 1 ? "s" : ""} · {order.orderDate}</span>
                  <span className="font-bold text-slate-800">LKR {fmt(landedCost)}</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-1 rounded-lg">
                    {fmtGbp(totalGbp)} @ {order.gbpToLkr}
                  </span>
                </div>
                <button onClick={() => setSelected(order)}
                  className="w-full text-xs font-semibold text-tenzy-teal border border-tenzy-teal/30 rounded-lg py-1.5 hover:bg-tenzy-teal/5 transition">
                  View Details
                </button>
              </div>
            );
          })}
        </div>

        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {["PO #", "Supplier", "Order Date", "Expected", "Items", "GBP Total", "GBP Rate", "Landed Cost (LKR)", "Status", ""].map((h) => (
                  <th key={h} className="text-left text-xs font-semibold text-slate-500 px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.length === 0 && (
                <tr><td colSpan={10} className="text-center py-12 text-sm text-slate-400">No orders found.</td></tr>
              )}
              {filtered.map((order) => {
                const { totalGbp, landedCost } = calcTotals(order);
                const st   = STATUS[order.status] ?? STATUS.ordered;
                const Icon = st.icon;
                return (
                  <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-xs font-mono font-bold text-tenzy-teal">{order.id}</td>
                    <td className="px-4 py-3 text-xs font-semibold text-slate-800">{order.supplier}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{order.orderDate}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{order.expectedArrival || "—"}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">{order.items.length} item{order.items.length !== 1 ? "s" : ""}</td>
                    <td className="px-4 py-3 text-xs font-semibold text-slate-700">{fmtGbp(totalGbp)}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{order.gbpToLkr}</td>
                    <td className="px-4 py-3 text-xs font-bold text-slate-800">LKR {fmt(landedCost)}</td>
                    <td className="px-4 py-3">
                      <span className={`flex items-center gap-1 w-fit text-[10px] font-semibold px-2.5 py-1 rounded-full border ${st.cls}`}>
                        <Icon size={10} /> {st.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => setSelected(order)}
                        className="flex items-center gap-1 text-xs text-tenzy-teal font-semibold hover:underline">
                        <Eye size={13} /> View
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Order Drawer */}
      {drawer && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setDrawer(false)} />
          <div className="fixed inset-y-0 right-0 w-full sm:w-[520px] bg-white z-50 flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <p className="font-bold text-slate-900">New Purchase Order</p>
              <button onClick={() => setDrawer(false)} className="p-1.5 rounded-full hover:bg-slate-100"><X size={18} /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              <section className="space-y-3">
                <SectionHead icon={Package} title="Order Details" />
                <div>
                  <Lbl required>Supplier Name</Lbl>
                  <Input value={form.supplier} onChange={(e) => setForm((f) => ({ ...f, supplier: e.target.value }))} placeholder="e.g. UK Cosmetics Wholesale" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Lbl required>Order Date</Lbl>
                    <Input type="date" value={form.orderDate} onChange={(e) => setForm((f) => ({ ...f, orderDate: e.target.value }))} />
                  </div>
                  <div>
                    <Lbl>Expected Arrival</Lbl>
                    <Input type="date" value={form.expectedArrival} onChange={(e) => setForm((f) => ({ ...f, expectedArrival: e.target.value }))} />
                  </div>
                </div>
              </section>

              <section className="space-y-3">
                <SectionHead icon={Globe} title="Exchange Rate" />
                <div>
                  <Lbl required>GBP → LKR Rate (at time of order)</Lbl>
                  <Input type="number" step="0.01" value={form.gbpToLkr} onChange={(e) => setForm((f) => ({ ...f, gbpToLkr: e.target.value }))} placeholder="e.g. 382.50" />
                  <p className="text-[10px] text-slate-400 mt-1.5 flex items-center gap-1">
                    <Info size={10} /> Rate is locked to this order for all LKR calculations.
                  </p>
                </div>
              </section>

              <section className="space-y-3">
                <SectionHead icon={PackagePlus} title="Products Ordered" />
                {form.items.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-slate-50 rounded-xl px-3 py-2.5 border border-slate-100">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-800 truncate">{item.productName}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Qty: {item.quantity} · {fmtGbp(item.unitPriceGbp)}/unit ·{" "}
                        <span className="font-semibold text-tenzy-teal">{fmtGbp(item.quantity * item.unitPriceGbp)}</span>
                      </p>
                    </div>
                    <button onClick={() => setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== idx) }))}
                      className="ml-2 text-slate-300 hover:text-red-500 transition shrink-0"><X size={13} /></button>
                  </div>
                ))}

                <div className="bg-slate-50 rounded-xl p-3.5 space-y-3 border-2 border-dashed border-slate-200">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Add a Product Line</p>
                  <select
                    value={newItem.productId}
                    onChange={(e) => {
                      const prod = products.find((p) => (p.productId ?? p.productid) === parseInt(e.target.value));
                      setNewItem((n) => ({ ...n, productId: e.target.value, productName: prod?.name ?? "" }));
                    }}
                    className="w-full text-sm px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-tenzy-teal/30 focus:border-tenzy-teal transition"
                  >
                    <option value="">Select product…</option>
                    {products.map((p) => {
                      const pid = p.productId ?? p.productid;
                      return <option key={pid} value={pid}>{p.name}</option>;
                    })}
                  </select>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-[10px] text-slate-500 mb-1">Quantity Ordered</p>
                      <Input type="number" min="1" value={newItem.quantity}
                        onChange={(e) => setNewItem((n) => ({ ...n, quantity: e.target.value }))} placeholder="0" />
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 mb-1">Unit Purchase Price (£ GBP)</p>
                      <Input type="number" step="0.01" min="0" value={newItem.unitPriceGbp}
                        onChange={(e) => setNewItem((n) => ({ ...n, unitPriceGbp: e.target.value }))} placeholder="0.00" />
                    </div>
                  </div>

                  {newItem.quantity && newItem.unitPriceGbp && form.gbpToLkr && (
                    <div className="flex items-center justify-between text-xs bg-tenzy-teal/5 rounded-lg px-3 py-2">
                      <span className="text-slate-500">Line total</span>
                      <span className="font-bold text-tenzy-teal">
                        {fmtGbp(newItem.quantity * newItem.unitPriceGbp)} = LKR {fmt(newItem.quantity * newItem.unitPriceGbp * form.gbpToLkr)}
                      </span>
                    </div>
                  )}

                  <button onClick={addItem}
                    className="w-full py-2 rounded-xl bg-tenzy-teal/10 text-tenzy-teal text-xs font-bold hover:bg-tenzy-teal/15 transition flex items-center justify-center gap-1.5">
                    <Plus size={13} /> Add to Order
                  </button>
                </div>
              </section>

              <section className="space-y-3">
                <SectionHead icon={Receipt} title="Additional Charges (LKR)" />
                <div><Lbl>Courier / Freight Charges</Lbl>
                  <Input type="number" value={form.courierCharges} onChange={(e) => setForm((f) => ({ ...f, courierCharges: e.target.value }))} placeholder="0" /></div>
                <div><Lbl>Customs / Import Duty</Lbl>
                  <Input type="number" value={form.customsDuty} onChange={(e) => setForm((f) => ({ ...f, customsDuty: e.target.value }))} placeholder="0" /></div>
                <div><Lbl>Other Charges</Lbl>
                  <Input type="number" value={form.otherCharges} onChange={(e) => setForm((f) => ({ ...f, otherCharges: e.target.value }))} placeholder="0" /></div>
              </section>

              <section className="space-y-2">
                <Lbl>Notes / Tracking Info</Lbl>
                <textarea rows={3} value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="Tracking numbers, courier details…"
                  className="w-full text-sm px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-tenzy-teal/30 transition resize-none" />
              </section>

              {form.items.length > 0 && (
                <section className="bg-slate-900 rounded-2xl p-4 space-y-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Live Cost Summary</p>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Products total (GBP)</span>
                    <span className="text-white font-semibold">{fmtGbp(dGbp)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">× {form.gbpToLkr} LKR/GBP</span>
                    <span className="text-white font-semibold">LKR {fmt(dLkr)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Courier + Duty + Other</span>
                    <span className="text-white font-semibold">LKR {fmt(dCharges)}</span>
                  </div>
                  <div className="h-px bg-slate-700 my-1" />
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-300">Total Landed Cost</span>
                    <span className="text-base font-extrabold text-tenzy-teal">LKR {fmt(dLanded)}</span>
                  </div>
                </section>
              )}
            </div>

            <div className="px-5 py-4 border-t border-slate-100 flex gap-3">
              <button onClick={() => setDrawer(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition">
                Cancel
              </button>
              <button onClick={saveOrder} disabled={saving}
                className="flex-1 py-2.5 rounded-xl bg-tenzy-teal text-white text-sm font-bold hover:opacity-90 transition disabled:opacity-60">
                {saving ? "Creating…" : "Create Order"}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Order Detail Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSelected(null)} />
          <div className="relative bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-3xl max-h-[92vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white px-5 py-4 border-b border-slate-100 flex items-center justify-between z-10 rounded-t-3xl sm:rounded-t-2xl">
              <div>
                <p className="text-[10px] text-slate-400">Purchase Order</p>
                <p className="font-bold text-slate-900 font-mono text-sm">{selected.id}</p>
              </div>
              <button onClick={() => setSelected(null)} className="p-2 rounded-full hover:bg-slate-100">
                <X size={18} className="text-slate-500" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              <div className="flex items-center justify-between">
                {(() => { const st = STATUS[selected.status] ?? STATUS.ordered; const Icon = st.icon; return (
                  <span className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border ${st.cls}`}>
                    <Icon size={12} /> {st.label}
                  </span>
                ); })()}
                <span className="text-xs text-slate-400">{selected.orderDate}</span>
              </div>

              <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Supplier</p>
                <p className="text-sm font-bold text-slate-800">{selected.supplier}</p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                  <span>Ordered: <strong>{selected.orderDate}</strong></span>
                  {selected.expectedArrival && <span>Expected: <strong>{selected.expectedArrival}</strong></span>}
                  {selected.arrivalDate      && <span>Arrived: <strong>{selected.arrivalDate}</strong></span>}
                </div>
              </div>

              <div className="flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
                <Globe size={16} className="text-blue-500 shrink-0" />
                <div>
                  <p className="text-[10px] font-semibold text-blue-400 uppercase tracking-wide">GBP → LKR Rate (locked)</p>
                  <p className="text-sm font-bold text-blue-800">1 GBP = {selected.gbpToLkr} LKR</p>
                </div>
              </div>

              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Items Ordered</p>
                <div className="space-y-2">
                  {selected.items.map((item, i) => (
                    <div key={i} className="flex items-center justify-between bg-slate-50 rounded-xl px-3 py-2.5">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-800 truncate">{item.productName}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Qty: <strong>{item.quantity}</strong> · {fmtGbp(item.unitPriceGbp)}/unit
                        </p>
                      </div>
                      <div className="text-right ml-3 shrink-0">
                        <p className="text-xs font-bold text-slate-800">{fmtGbp(item.quantity * item.unitPriceGbp)}</p>
                        <p className="text-[10px] text-slate-400">LKR {fmt(item.quantity * item.unitPriceGbp * selected.gbpToLkr)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {(() => {
                const { totalGbp, totalLkr, landedCost } = calcTotals(selected);
                return (
                  <div className="bg-slate-900 rounded-2xl p-4 space-y-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Cost Breakdown</p>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Products total (GBP)</span>
                      <span className="text-white font-semibold">{fmtGbp(totalGbp)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">In LKR (@ {selected.gbpToLkr})</span>
                      <span className="text-white font-semibold">LKR {fmt(totalLkr)}</span>
                    </div>
                    {selected.courierCharges > 0 && (
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400">Courier / Freight</span>
                        <span className="text-white">LKR {fmt(selected.courierCharges)}</span>
                      </div>
                    )}
                    {selected.customsDuty > 0 && (
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400">Customs / Import Duty</span>
                        <span className="text-white">LKR {fmt(selected.customsDuty)}</span>
                      </div>
                    )}
                    {selected.otherCharges > 0 && (
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400">Other Charges</span>
                        <span className="text-white">LKR {fmt(selected.otherCharges)}</span>
                      </div>
                    )}
                    <div className="h-px bg-slate-700 my-1" />
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-bold text-slate-300">Total Landed Cost</span>
                      <span className="text-base font-extrabold text-tenzy-teal">LKR {fmt(landedCost)}</span>
                    </div>
                  </div>
                );
              })()}

              {selected.notes && (
                <div className="bg-amber-50 rounded-xl p-3">
                  <p className="text-[10px] font-semibold text-amber-500 uppercase mb-1">Notes</p>
                  <p className="text-xs text-amber-800 leading-relaxed">{selected.notes}</p>
                </div>
              )}

              {selected.status === "approved" && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3">
                  <CheckCircle2 size={18} className="text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-emerald-800">Stock Updated</p>
                    <p className="text-[10px] text-emerald-700 mt-0.5 leading-relaxed">
                      Approved by <strong>{selected.approvedBy}</strong> on {selected.approvedDate}.
                      Product quantities have been updated in inventory.
                    </p>
                    <div className="mt-2 space-y-1">
                      {selected.items.map((item, i) => (
                        <p key={i} className="text-[10px] text-emerald-600">
                          + {item.quantity} units added → <strong>{item.productName}</strong>
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {selected.status !== "approved" && (
                <div className="space-y-2 pt-1">
                  {NEXT_STATUS[selected.status] && (
                    <button onClick={() => progressStatus(selected)}
                      className="w-full py-3 rounded-xl bg-slate-800 text-white text-sm font-bold hover:bg-slate-900 transition flex items-center justify-center gap-2">
                      {NEXT_LABEL[selected.status]} <ChevronRight size={15} />
                    </button>
                  )}
                  {selected.status === "arrived" && (
                    <button onClick={() => approve(selected)}
                      className="w-full py-3 rounded-xl bg-emerald-500 text-white text-sm font-bold hover:bg-emerald-600 transition flex items-center justify-center gap-2">
                      <CheckCircle2 size={15} /> Approve & Update Stock
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
