import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Archive, ArrowRight, CheckCircle, ChevronDown, ChevronUp,
  Edit2, Eye, Mail, Package, Phone, Plus, RefreshCw,
  Save, Trash2, Truck, User, X,
} from "lucide-react";
import { supplyChainApi } from "../../services/api";

/* ── helpers ─────────────────────────────────────────────────────────────── */
const COURIER_KEY = "tenzy_couriers_v2";
const gbp  = (v) => v == null ? "—" : `£${Number(v).toFixed(2)}`;
const kgFmt = (v) => `${Number(v ?? 0).toFixed(3)} kg`;
const todayStr = () => new Date().toISOString().slice(0, 10);
const roundUpKg = (weight) => {
  const n = Number(weight) || 0;
  return n > 0 ? Math.ceil(n) : 0;
};

const genParcel = () => {
  const n = new Date();
  const yy = String(n.getFullYear()).slice(2);
  const mm = String(n.getMonth() + 1).padStart(2, "0");
  const dd = String(n.getDate()).padStart(2, "0");
  return `TZ-${yy}${mm}${dd}-${Math.floor(Math.random() * 9000 + 1000)}`;
};

const loadCouriers  = () => { try { return JSON.parse(localStorage.getItem(COURIER_KEY)) ?? []; } catch { return []; } };
const saveCouriers  = (list) => localStorage.setItem(COURIER_KEY, JSON.stringify(list));

const availQty = (item) =>
  Math.max(0, (item.quantity ?? item.Quantity ?? 0) - (item.quantityAlreadyDispatched ?? item.QuantityAlreadyDispatched ?? 0));

const itemWeightKg = (item) =>
  Number(item.weight ?? item.Weight ?? item.weightKg ?? item.WeightKg ?? item.productWeight ?? item.ProductWeight ?? 0) || 0;

/* ── tiny UI ─────────────────────────────────────────────────────────────── */
const Input  = (p) => <input  {...p} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-tenzy-teal focus:ring-2 focus:ring-tenzy-teal/20" />;
const TSelect = (p) => <select {...p} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-tenzy-teal focus:ring-2 focus:ring-tenzy-teal/20" />;
const Label  = ({ children }) => <label className="mb-1 block text-xs font-semibold text-slate-500">{children}</label>;

function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="w-7 h-7 rounded-full border-4 border-tenzy-teal/30 border-t-tenzy-teal animate-spin" />
    </div>
  );
}

/* ── Toast ───────────────────────────────────────────────────────────────── */
function useToast() {
  const [toasts, setToasts] = useState([]);
  const add = useCallback((type, msg) => {
    const id = Date.now() + Math.random();
    setToasts((p) => [...p, { id, type, msg }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 4000);
  }, []);
  return { toasts, add };
}
function ToastList({ toasts }) {
  const bg = { success: "bg-emerald-500", error: "bg-red-500", warning: "bg-amber-500" };
  return (
    <div className="fixed top-4 right-4 z-[100] space-y-2 pointer-events-none">
      {toasts.map((t) => (
        <div key={t.id} className={`${bg[t.type] ?? "bg-slate-700"} text-white px-4 py-3 rounded-2xl shadow-xl text-sm font-medium max-w-xs`}>{t.msg}</div>
      ))}
    </div>
  );
}

/* ── Courier form modal ──────────────────────────────────────────────────── */
function CourierFormModal({ courier, onSave, onClose }) {
  const [f, setF] = useState({ name: "", ratePerKg: "", contactName: "", phone: "", email: "", address: "", ...courier });
  const s = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const ok = f.name.trim() && f.ratePerKg !== "";
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-white rounded-3xl w-full max-w-md shadow-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">{courier?.id ? "Edit Courier" : "Add Courier"}</h2>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400"><X size={16} /></button>
        </div>
        <div><Label>Courier name *</Label><Input value={f.name} onChange={(e) => s("name", e.target.value)} placeholder="e.g. DHL, Kapruka" /></div>
        <div><Label>Rate per kg UK→SL (£) *</Label><Input type="number" step="0.01" min="0" value={f.ratePerKg} onChange={(e) => s("ratePerKg", e.target.value)} placeholder="6.50" /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Contact name</Label><Input value={f.contactName} onChange={(e) => s("contactName", e.target.value)} /></div>
          <div><Label>Phone</Label><Input value={f.phone} onChange={(e) => s("phone", e.target.value)} /></div>
        </div>
        <div><Label>Email</Label><Input type="email" value={f.email} onChange={(e) => s("email", e.target.value)} /></div>
        <div>
          <Label>Address</Label>
          <textarea value={f.address} onChange={(e) => s("address", e.target.value)} rows={2}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-tenzy-teal focus:ring-2 focus:ring-tenzy-teal/20 resize-none" />
        </div>
        <div className="flex justify-end gap-3 pt-1">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50">Cancel</button>
          <button onClick={() => ok && onSave(f)} disabled={!ok}
            className="px-5 py-2 bg-tenzy-teal text-white text-sm font-bold rounded-xl hover:opacity-90 disabled:opacity-50 transition">
            Save Courier
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Couriers side panel ─────────────────────────────────────────────────── */
function CouriersPanel({ couriers, onAdd, onEdit, onDelete, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative ml-auto w-full max-w-md bg-white h-full shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2">
            <Truck size={16} className="text-tenzy-teal" />
            <h2 className="text-base font-bold text-slate-900">Courier Services</h2>
          </div>
          <div className="flex gap-2">
            <button onClick={onAdd} className="flex items-center gap-1.5 px-3 py-1.5 bg-tenzy-teal text-white text-xs font-bold rounded-xl hover:opacity-90">
              <Plus size={12} /> Add
            </button>
            <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400"><X size={16} /></button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {couriers.length === 0 && (
            <div className="text-center py-16 text-slate-400 text-sm">
              <Truck size={28} className="mx-auto mb-3 opacity-30" />No couriers yet.
            </div>
          )}
          {couriers.map((c) => (
            <div key={c.id} className="bg-slate-50 rounded-2xl border border-slate-200 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-slate-900">{c.name}</p>
                    <span className="rounded-full bg-teal-100 text-teal-700 px-2 py-0.5 text-xs font-bold">£{Number(c.ratePerKg).toFixed(2)}/kg</span>
                  </div>
                  <div className="mt-1.5 space-y-0.5 text-xs text-slate-500">
                    {c.contactName && <p className="flex items-center gap-1.5"><User size={10} />{c.contactName}</p>}
                    {c.phone      && <p className="flex items-center gap-1.5"><Phone size={10} />{c.phone}</p>}
                    {c.email      && <p className="flex items-center gap-1.5"><Mail size={10} />{c.email}</p>}
                    {c.address    && <p className="text-[11px] mt-1 text-slate-400">{c.address}</p>}
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => onEdit(c)} className="p-1.5 rounded-lg hover:bg-white text-slate-400 hover:text-tenzy-teal transition"><Edit2 size={13} /></button>
                  <button onClick={() => onDelete(c.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition"><Trash2 size={13} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Step progress bar ───────────────────────────────────────────────────── */
function StepBar({ current }) {
  const steps = ["Select Items", "Organise Boxes", "Courier & Save"];
  return (
    <div className="flex items-center gap-0">
      {steps.map((label, i) => {
        const n = i + 1;
        const done = n < current;
        const active = n === current;
        return (
          <React.Fragment key={n}>
            <div className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition
                ${done ? "bg-tenzy-teal text-white" : active ? "bg-tenzy-teal text-white ring-4 ring-tenzy-teal/20" : "bg-slate-100 text-slate-400"}`}>
                {done ? <CheckCircle size={14} /> : n}
              </div>
              <span className={`text-xs font-semibold whitespace-nowrap hidden sm:block ${active ? "text-tenzy-teal" : done ? "text-slate-600" : "text-slate-400"}`}>{label}</span>
            </div>
            {i < steps.length - 1 && <div className={`h-px w-6 mx-2 shrink-0 transition ${done ? "bg-tenzy-teal" : "bg-slate-200"}`} />}
          </React.Fragment>
        );
      })}
    </div>
  );
}

/* ── Step 1 — Select Items ───────────────────────────────────────────────── */
function Step1SelectItems({ procurements, stagedItems, setStagedItems, addToast }) {
  const [expanded, setExpanded] = useState(null);
  const [procItems, setProcItems] = useState({});
  const [loadingIds, setLoadingIds] = useState(new Set());
  const [draftQty, setDraftQty] = useState({});

  const toggle = async (proc) => {
    const id = proc.procurementId;
    if (expanded === id) { setExpanded(null); return; }
    setExpanded(id);
    if (procItems[id]) return;
    setLoadingIds((p) => new Set([...p, id]));
    try {
      const detail = await supplyChainApi.getProcurementById(id);
      setProcItems((p) => ({ ...p, [id]: detail?.items ?? [] }));
    } catch { addToast("error", "Failed to load items."); }
    finally { setLoadingIds((p) => { const n = new Set(p); n.delete(id); return n; }); }
  };

  const stagedFor = (procurementItemId) =>
    stagedItems.filter((s) => s.procurementItemId === procurementItemId).reduce((s, i) => s + i.quantityDispatched, 0);

  const freeQty = (item) => Math.max(0, availQty(item) - stagedFor(item.procurementItemId));

  const stage = (proc, item) => {
    const q = Number(draftQty[item.procurementItemId]) || freeQty(item);
    const free = freeQty(item);
    if (q <= 0 || q > free) { addToast("error", `Enter a quantity between 1 and ${free}.`); return; }
    setStagedItems((p) => [...p, {
      procurementItemId: item.procurementItemId,
      productName: item.productName,
      brandName: item.brandName ?? "",
      quantityDispatched: q,
      netUnitCost: item.netUnitCost ?? item.NetUnitCost ?? 0,
      weight: itemWeightKg(item),
      procRef: proc.procurementReference ?? proc.invoiceReference ?? String(proc.procurementId),
    }]);
    setDraftQty((p) => ({ ...p, [item.procurementItemId]: "" }));
    addToast("success", `"${item.productName}" ×${q} staged.`);
  };

  const unstage = (i) => setStagedItems((p) => p.filter((_, idx) => idx !== i));

  return (
    <div className="grid lg:grid-cols-3 gap-5">
      {/* Available procurements */}
      <div className="lg:col-span-2 space-y-3">
        <p className="text-sm font-bold text-slate-700">Available UK Purchases</p>
        {procurements.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-sm text-slate-400">No undispatched purchases found.</div>
        )}
        {procurements.map((proc) => {
          const id = proc.procurementId;
          const isOpen = expanded === id;
          const items = procItems[id] ?? [];
          const isLoading = loadingIds.has(id);
          return (
            <div key={id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <button className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-slate-50 transition text-left" onClick={() => toggle(proc)}>
                <div className="flex items-center gap-3">
                  <Package size={15} className="text-tenzy-teal shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{proc.procurementReference ?? proc.invoiceReference}</p>
                    <p className="text-xs text-slate-500">{proc.shopName} · {proc.purchaseDate?.slice(0, 10)}</p>
                  </div>
                </div>
                {isOpen ? <ChevronUp size={15} className="text-slate-400" /> : <ChevronDown size={15} className="text-slate-400" />}
              </button>
              {isOpen && (
                <div className="border-t border-slate-100 divide-y divide-slate-50">
                  {isLoading && <div className="py-6 flex justify-center"><div className="w-5 h-5 border-2 border-tenzy-teal/30 border-t-tenzy-teal rounded-full animate-spin" /></div>}
                  {!isLoading && items.filter((item) => freeQty(item) > 0).map((item) => (
                    <div key={item.procurementItemId} className="px-4 py-3 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{item.productName}</p>
                        <p className="text-xs text-slate-500">{item.brandName} · {gbp(item.netUnitCost)}/unit · <span className="font-semibold text-tenzy-teal">{freeQty(item)} available</span></p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <input type="number" min="1" max={freeQty(item)}
                          value={draftQty[item.procurementItemId] ?? ""}
                          onChange={(e) => setDraftQty((p) => ({ ...p, [item.procurementItemId]: e.target.value }))}
                          placeholder={String(freeQty(item))}
                          className="w-16 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs text-center outline-none focus:border-tenzy-teal" />
                        <button onClick={() => stage(proc, item)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-tenzy-teal text-white text-xs font-bold rounded-lg hover:opacity-90 transition">
                          <Plus size={11} /> Add
                        </button>
                      </div>
                    </div>
                  ))}
                  {!isLoading && items.filter((i) => freeQty(i) > 0).length === 0 && (
                    <p className="px-4 py-4 text-xs text-slate-400 text-center">All items already staged or dispatched.</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Staged items panel */}
      <div className="space-y-3">
        <p className="text-sm font-bold text-slate-700">Staged for Dispatch <span className="text-slate-400 font-normal">({stagedItems.length})</span></p>
        {stagedItems.length === 0 && (
          <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center text-xs text-slate-400">
            Add items from purchases on the left.
          </div>
        )}
        <div className="space-y-2">
          {stagedItems.map((item, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-3 flex items-start gap-2.5">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-800 truncate">{item.productName}</p>
                <p className="text-[11px] text-slate-500">{item.brandName} · ×{item.quantityDispatched} · {gbp(item.netUnitCost * item.quantityDispatched)}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Ref: {item.procRef}</p>
              </div>
              <button onClick={() => unstage(i)} className="p-1 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-500 transition shrink-0 mt-0.5"><X size={12} /></button>
            </div>
          ))}
        </div>
        {stagedItems.length > 0 && (
          <div className="bg-teal-50 border border-teal-200 rounded-xl px-3 py-2.5 text-xs text-teal-800 font-semibold space-y-1">
            <div className="flex justify-between">
              <span>Total units</span>
              <span>{stagedItems.reduce((s, i) => s + i.quantityDispatched, 0)}</span>
            </div>
            <div className="flex justify-between">
              <span>Product cost</span>
              <span>{gbp(stagedItems.reduce((s, i) => s + i.netUnitCost * i.quantityDispatched, 0))}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Step 2 — Organise Boxes ─────────────────────────────────────────────── */
const MAX_KG = 20;

function Step2OrganiseBoxes({ stagedItems, boxes, setBoxes, addToast }) {
  const calcAutoW = (box) => box.items.reduce((s, i) => s + (i.weight ?? 0) * i.quantityDispatched, 0);
  const roundedW  = (box) => Math.max(roundUpKg(calcAutoW(box)), Number(box.roundedWeight || 0));

  const addBox = () =>
    setBoxes((p) => [...p, { id: `box-${Date.now()}`, number: p.length + 1, items: [], roundedWeight: "", homeToUkCourier: "" }]);

  const removeBox = (id) =>
    setBoxes((p) => p.filter((b) => b.id !== id).map((b, i) => ({ ...b, number: i + 1 })));

  const assignedQtyFor = (idx, sourceBoxes = boxes) =>
    sourceBoxes.flatMap((b) => b.items)
      .filter((i) => i.stagedIndex === idx)
      .reduce((s, i) => s + Number(i.quantityDispatched || 0), 0);

  const addToBox = (boxId, idx) => {
    const item = stagedItems[idx];
    const remainingQty = Math.max(0, Number(item?.quantityDispatched || 0) - assignedQtyFor(idx));
    if (!item || remainingQty <= 0) return;
    setBoxes((prev) => {
      const targetIndex = prev.findIndex((b) => b.id === boxId);
      if (targetIndex < 0) return prev;

      const unitWeight = Number(item.weight || 0);
      let qtyLeft = remainingQty;
      let createdBoxes = 0;
      const next = prev.map((box) => ({ ...box, items: [...box.items] }));
      let currentIndex = targetIndex;

      while (qtyLeft > 0) {
        const currentBox = next[currentIndex];
        const currentWeight = calcAutoW(currentBox);
        const freeWeight = Math.max(0, MAX_KG - currentWeight);
        const qtyForBox = unitWeight > 0
          ? Math.min(qtyLeft, Math.max(0, Math.floor(freeWeight / unitWeight)))
          : qtyLeft;

        if (qtyForBox > 0 || currentBox.items.length === 0) {
          const quantityDispatched = qtyForBox > 0 ? qtyForBox : qtyLeft;
          currentBox.items.push({ stagedIndex: idx, ...item, quantityDispatched });
          qtyLeft -= quantityDispatched;
        }

        if (qtyLeft > 0) {
          createdBoxes += 1;
          next.push({ id: `box-${Date.now()}-${createdBoxes}`, number: next.length + 1, items: [], roundedWeight: "", homeToUkCourier: "" });
          currentIndex = next.length - 1;
        }
      }

      if (createdBoxes > 0) {
        setTimeout(() => addToast?.("warning", `"${item.productName}" exceeded ${MAX_KG} kg, so ${createdBoxes} new box${createdBoxes !== 1 ? "es were" : " was"} created automatically.`), 0);
      }
      return next.map((b, i) => ({ ...b, number: i + 1 }));
    });
  };

  const removeFromBox = (boxId, idx) =>
    setBoxes((p) => p.map((b) => b.id !== boxId ? b : { ...b, items: b.items.filter((i) => i.stagedIndex !== idx) }));

  const setRoundedWeight = (boxId, v) =>
    setBoxes((p) => p.map((b) => b.id !== boxId ? b : { ...b, roundedWeight: v }));

  const setHomeUK = (boxId, v) =>
    setBoxes((p) => p.map((b) => b.id !== boxId ? b : { ...b, homeToUkCourier: v }));

  const unassigned = stagedItems
    .map((item, idx) => ({ ...item, idx, remainingQuantity: Math.max(0, Number(item.quantityDispatched || 0) - assignedQtyFor(idx)) }))
    .filter(({ remainingQuantity }) => remainingQuantity > 0);

  const totUnits   = boxes.flatMap((b) => b.items).reduce((s, i) => s + i.quantityDispatched, 0);
  const totCost    = boxes.flatMap((b) => b.items).reduce((s, i) => s + i.netUnitCost * i.quantityDispatched, 0);
  const totRoundW  = boxes.reduce((s, b) => s + roundedW(b), 0);
  const totHomeUK  = boxes.reduce((s, b) => s + Number(b.homeToUkCourier || 0), 0);

  return (
    <div className="space-y-5">
      {unassigned.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <p className="text-xs font-bold text-amber-700 mb-3">Unassigned items — add them to a box below</p>
          <div className="flex flex-wrap gap-2">
            {unassigned.map(({ idx, productName, brandName, remainingQuantity, weight }) => (
              <div key={idx} className="bg-white rounded-xl border border-amber-200 px-3 py-2 text-xs">
                <p className="font-semibold text-slate-800">{productName} ×{remainingQuantity}</p>
                <p className="text-slate-500">{brandName} · {kgFmt((weight ?? 0) * remainingQuantity)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {boxes.map((box) => {
          const aW   = calcAutoW(box);
          const rW   = roundedW(box);
          const bCost = box.items.reduce((s, i) => s + i.netUnitCost * i.quantityDispatched, 0);
          const pct   = Math.min(100, (aW / MAX_KG) * 100);
          const over  = aW > MAX_KG;
          const near  = !over && aW > 18;
          const borderCls = over ? "border-red-400" : near ? "border-amber-400" : "border-slate-200";
          const barCls    = over ? "bg-red-500"    : near ? "bg-amber-400"    : "bg-tenzy-teal";

          return (
            <div key={box.id} className={`bg-white rounded-2xl border-2 shadow-sm flex flex-col ${borderCls}`}>
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Archive size={14} className="text-tenzy-teal" />
                  <span className="text-sm font-bold text-slate-800">Box {box.number}</span>
                  {over && <span className="text-[10px] font-bold text-red-500 bg-red-50 rounded px-1.5 py-0.5">OVER 20 kg</span>}
                </div>
                <button onClick={() => removeBox(box.id)} className="p-1 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition"><X size={12} /></button>
              </div>

              {/* Weight bar */}
              <div className="px-3 pt-2.5 pb-1">
                <div className="flex justify-between text-[10px] mb-1">
                  <span className="text-slate-500">Product weight: <strong className="text-slate-700">{kgFmt(aW)}</strong></span>
                  <span className={over ? "text-red-500 font-bold" : near ? "text-amber-600 font-semibold" : "text-slate-400"}>{MAX_KG} kg max</span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-300 ${barCls}`} style={{ width: `${pct}%` }} />
                </div>
              </div>

              {/* Items */}
              <div className="p-3 space-y-1.5 flex-1 min-h-[70px]">
                {box.items.length === 0 && <p className="text-xs text-slate-400 text-center py-3">Empty — add items below</p>}
                {box.items.map((item) => (
                  <div key={item.stagedIndex} className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 border border-slate-100 px-2.5 py-1.5">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-800 truncate">{item.productName}</p>
                      <p className="text-[10px] text-slate-500">×{item.quantityDispatched} · {gbp(item.netUnitCost * item.quantityDispatched)} · {kgFmt((item.weight ?? 0) * item.quantityDispatched)}</p>
                    </div>
                    <button onClick={() => removeFromBox(box.id, item.stagedIndex)} className="p-0.5 rounded hover:bg-red-100 text-slate-300 hover:text-red-500 shrink-0"><X size={11} /></button>
                  </div>
                ))}
                {unassigned.length > 0 && (
                  <select defaultValue="" onChange={(e) => { if (e.target.value !== "") { addToBox(box.id, Number(e.target.value)); e.target.value = ""; } }}
                    className="w-full mt-1 rounded-lg border border-dashed border-tenzy-teal/40 bg-teal-50/40 px-2 py-1.5 text-xs text-slate-500 outline-none focus:border-tenzy-teal">
                    <option value="">+ Add item to this box</option>
                    {unassigned.map(({ idx, productName, remainingQuantity }) => (
                      <option key={idx} value={idx}>{productName} ×{remainingQuantity}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Rounded weight + Home→UK charge */}
              <div className="px-3 pb-3 pt-1.5 border-t border-slate-100 space-y-2.5">
                <div>
                  <p className="text-[10px] text-slate-400 mb-1">
                    Rounded weight for courier (kg)
                    <span className="ml-1.5 text-slate-300">auto: {roundUpKg(aW)} kg</span>
                  </p>
                  <div className="flex items-center gap-1.5">
                    <input type="number" step="1" min="0"
                      value={box.roundedWeight}
                      onChange={(e) => setRoundedWeight(box.id, e.target.value)}
                      placeholder={String(roundUpKg(aW))}
                      className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs outline-none focus:border-tenzy-teal" />
                    <span className="text-[10px] text-slate-400 shrink-0">kg</span>
                  </div>
                  <p className="text-[10px] text-tenzy-teal mt-0.5">Billing: {kgFmt(rW)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 mb-1">Home → UK courier charge (£)</p>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-slate-500 shrink-0">£</span>
                    <input type="number" step="0.01" min="0"
                      value={box.homeToUkCourier}
                      onChange={(e) => setHomeUK(box.id, e.target.value)}
                      placeholder="0.00"
                      className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs outline-none focus:border-tenzy-teal" />
                  </div>
                </div>
                <div className="flex justify-between text-[10px] text-slate-500 border-t border-slate-100 pt-1.5">
                  <span>Products: <strong className="text-slate-800">{gbp(bCost)}</strong></span>
                  <span>{box.items.reduce((s, i) => s + i.quantityDispatched, 0)} units</span>
                </div>
              </div>
            </div>
          );
        })}

        {/* Add box button */}
        <button onClick={addBox}
          className="rounded-2xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center gap-2 text-slate-400 hover:border-tenzy-teal hover:text-tenzy-teal transition min-h-[200px]">
          <Plus size={22} />
          <span className="text-sm font-semibold">Add Box</span>
        </button>
      </div>

      {/* Summary bar */}
      {totUnits > 0 && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 flex flex-wrap gap-6 text-sm">
          <span className="text-slate-500">Boxes: <strong className="text-slate-800">{boxes.filter((b) => b.items.length > 0).length}</strong></span>
          <span className="text-slate-500">Units: <strong className="text-slate-800">{totUnits}</strong></span>
          <span className="text-slate-500">Rounded weight: <strong className="text-slate-800">{kgFmt(totRoundW)}</strong></span>
          <span className="text-slate-500">Home→UK total: <strong className="text-slate-800">{gbp(totHomeUK)}</strong></span>
          <span className="text-slate-500">Product cost: <strong className="text-slate-800">{gbp(totCost)}</strong></span>
        </div>
      )}
    </div>
  );
}

/* ── Step 3 — Courier & Save ─────────────────────────────────────────────── */
function Step3CourierSave({ couriers, boxes, onSave, saving, onOpenCouriers }) {
  const [form, setForm] = useState({
    courierId: "", courierName: "", ukToSriLankaCourierPerKg: "",
    dispatchDate: todayStr(), parcelNumber: genParcel(),
    shipmentStatus: "pending", notes: "",
  });
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const pickCourier = (id) => {
    const c = couriers.find((c) => String(c.id) === id);
    setForm((p) => ({ ...p, courierId: id, courierName: c?.name ?? "", ukToSriLankaCourierPerKg: c ? String(c.ratePerKg) : "" }));
  };

  const filledBoxes = boxes.filter((b) => b.items.length > 0);
  const rate        = Number(form.ukToSriLankaCourierPerKg) || 0;

  // Per-box derived values
  const boxData = filledBoxes.map((box) => {
    const autoW    = box.items.reduce((s, i) => s + (i.weight ?? 0) * i.quantityDispatched, 0);
    const bRoundW  = Math.max(roundUpKg(autoW), Number(box.roundedWeight || 0));
    const bHomeUK  = Number(box.homeToUkCourier || 0);
    const bSLCost  = bRoundW * rate;
    const bProdCost= box.items.reduce((s, i) => s + i.netUnitCost * i.quantityDispatched, 0);
    const bUnits   = box.items.reduce((s, i) => s + i.quantityDispatched, 0);
    return { box, autoW, bRoundW, bHomeUK, bSLCost, bProdCost, bUnits, bTotal: bProdCost + bHomeUK + bSLCost };
  });

  const totUnits    = boxData.reduce((s, d) => s + d.bUnits, 0);
  const totAutoW    = boxData.reduce((s, d) => s + d.autoW, 0);
  const totRoundW   = boxData.reduce((s, d) => s + d.bRoundW, 0);
  const totHomeUK   = boxData.reduce((s, d) => s + d.bHomeUK, 0);
  const totSLCost   = boxData.reduce((s, d) => s + d.bSLCost, 0);
  const totProdCost = boxData.reduce((s, d) => s + d.bProdCost, 0);
  const grand       = totProdCost + totHomeUK + totSLCost;
  const canSave     = form.courierName && filledBoxes.length > 0;

  return (
    <div className="grid lg:grid-cols-3 gap-5">
      <div className="lg:col-span-2 space-y-5">
        {/* Courier form */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5">
          <h3 className="text-sm font-bold text-slate-800 mb-4">Courier Details</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label>Courier *</Label>
              <TSelect value={form.courierId} onChange={(e) => pickCourier(e.target.value)}>
                <option value="">Select courier</option>
                {couriers.map((c) => <option key={c.id} value={c.id}>{c.name} — £{Number(c.ratePerKg).toFixed(2)}/kg</option>)}
              </TSelect>
              {couriers.length === 0 && (
                <button onClick={onOpenCouriers} className="mt-1 text-xs text-tenzy-teal underline">Add a courier first</button>
              )}
            </div>
            <div>
              <Label>UK→SL rate (£/kg) — from courier</Label>
              <div className="relative">
                <Input value={form.ukToSriLankaCourierPerKg ? `£${Number(form.ukToSriLankaCourierPerKg).toFixed(2)}` : ""} readOnly
                  placeholder="Select courier above" className="bg-slate-100 cursor-not-allowed pr-14" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-semibold">AUTO</span>
              </div>
            </div>
            <div>
              <Label>Dispatch Date</Label>
              <Input type="date" value={form.dispatchDate} onChange={(e) => set("dispatchDate", e.target.value)} />
            </div>
            <div>
              <Label>Parcel Number — auto generated</Label>
              <div className="relative">
                <Input value={form.parcelNumber} readOnly className="bg-slate-100 cursor-not-allowed font-mono text-xs pr-14" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-semibold">AUTO</span>
              </div>
            </div>
            <div>
              <Label>Status</Label>
              <TSelect value={form.shipmentStatus} onChange={(e) => set("shipmentStatus", e.target.value)}>
                <option value="pending">Pending</option>
                <option value="dispatched">Dispatched</option>
                <option value="received">Received</option>
              </TSelect>
            </div>
            <div>
              <Label>Notes</Label>
              <Input value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Optional notes" />
            </div>
          </div>
        </div>

        {/* Per-box breakdown table */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-800">Boxes Breakdown</h3>
            <span className="text-xs text-slate-400">{filledBoxes.length} box{filledBoxes.length !== 1 ? "es" : ""} · {totUnits} units</span>
          </div>
          <div className="space-y-3">
            {boxData.map(({ box, autoW, bRoundW, bHomeUK, bSLCost, bProdCost, bUnits, bTotal }) => (
              <div key={box.id} className="rounded-2xl bg-slate-50 border border-slate-200 overflow-hidden">
                {/* Box header row */}
                <div className="flex items-center justify-between px-4 py-2.5 bg-slate-100/60 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <Archive size={13} className="text-tenzy-teal" />
                    <span className="text-xs font-bold text-slate-700">Box {box.number}</span>
                    <span className="text-[10px] text-slate-400">· {bUnits} units</span>
                  </div>
                  <span className="text-xs font-bold text-slate-900">Total: {gbp(bTotal)}</span>
                </div>
                {/* Box cost grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-slate-200">
                  {[
                    ["Product weight", kgFmt(autoW), "text-slate-700"],
                    ["Rounded weight", kgFmt(bRoundW), bRoundW !== autoW ? "text-tenzy-teal font-semibold" : "text-slate-700"],
                    ["Home→UK", gbp(bHomeUK), "text-slate-700"],
                    ["UK→SL courier", gbp(bSLCost), "text-indigo-600 font-semibold"],
                  ].map(([label, val, valCls]) => (
                    <div key={label} className="bg-white px-3 py-2">
                      <p className="text-[10px] text-slate-400">{label}</p>
                      <p className={`text-xs mt-0.5 ${valCls}`}>{val}</p>
                    </div>
                  ))}
                </div>
                {/* Items */}
                <div className="px-4 py-2.5 divide-y divide-slate-100">
                  <div className="flex justify-between pb-1.5 text-[10px] font-bold text-slate-400 uppercase">
                    <span>Product cost: {gbp(bProdCost)}</span>
                  </div>
                  {box.items.map((item) => (
                    <div key={item.stagedIndex} className="flex justify-between py-1.5 text-xs text-slate-600">
                      <span className="font-medium truncate mr-4">{item.productName} <span className="text-slate-400 font-normal">×{item.quantityDispatched}</span></span>
                      <span className="shrink-0">{gbp(item.netUnitCost * item.quantityDispatched)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sticky cost summary + save */}
      <div>
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 sticky top-4 space-y-4">
          <h3 className="text-sm font-bold text-slate-800">Summary</h3>

          {/* Totals */}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-slate-500"><span>Boxes</span><strong className="text-slate-800">{filledBoxes.length}</strong></div>
            <div className="flex justify-between text-slate-500"><span>Total units</span><strong className="text-slate-800">{totUnits}</strong></div>
            <div className="flex justify-between text-slate-500"><span>Product weight</span><strong className="text-slate-800">{kgFmt(totAutoW)}</strong></div>
            <div className="flex justify-between text-slate-500"><span>Rounded weight</span><strong className="text-tenzy-teal">{kgFmt(totRoundW)}</strong></div>
            <div className="border-t border-slate-100 pt-2 space-y-1.5">
              <div className="flex justify-between text-slate-500"><span>Product cost</span><strong className="text-slate-800">{gbp(totProdCost)}</strong></div>
              <div className="flex justify-between text-slate-500"><span>Home→UK courier</span><strong className="text-slate-800">{gbp(totHomeUK)}</strong></div>
              <div className="flex justify-between text-slate-500"><span>UK→SL courier</span><strong className="text-indigo-600">{gbp(totSLCost)}</strong></div>
            </div>
            <div className="border-t border-slate-200 pt-2.5 flex justify-between text-base font-bold">
              <span>Grand Total</span><span className="text-tenzy-teal">{gbp(grand)}</span>
            </div>
          </div>

          {/* Per-box mini summary */}
          {boxData.length > 1 && (
            <div className="space-y-1.5 border-t border-slate-100 pt-3">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Per box</p>
              {boxData.map(({ box, bRoundW, bHomeUK, bSLCost, bProdCost, bTotal }) => (
                <div key={box.id} className="flex items-center justify-between text-xs rounded-lg bg-slate-50 px-2.5 py-1.5">
                  <span className="text-slate-600 font-medium">Box {box.number} · {kgFmt(bRoundW)}</span>
                  <span className="text-slate-800 font-bold">{gbp(bTotal)}</span>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={() => canSave && !saving && onSave(form, boxes)}
            disabled={!canSave || saving}
            className="w-full flex items-center justify-center gap-2 py-3 bg-tenzy-teal text-white font-bold rounded-2xl hover:opacity-90 disabled:opacity-50 transition text-sm">
            {saving
              ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving…</>
              : <><Save size={15} /> Create Dispatch</>}
          </button>
          {!canSave && (
            <p className="text-xs text-amber-600 text-center">
              {!form.courierName ? "Select a courier first." : "Add items to at least one box."}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Dispatch History ────────────────────────────────────────────────────── */
function DispatchHistory({ dispatches, loading, onRefresh }) {
  const [detail, setDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const open = async (d) => {
    setLoadingDetail(true);
    try { setDetail(await supplyChainApi.getDispatchById(d.shipmentId ?? d.dispatchId)); }
    catch { setDetail(d); }
    finally { setLoadingDetail(false); }
  };

  const STATUS = {
    received:   "bg-emerald-100 text-emerald-700",
    dispatched: "bg-blue-100 text-blue-700",
    pending:    "bg-slate-100 text-slate-500",
  };

  if (loading) return <Spinner />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-slate-700">{dispatches.length} shipment{dispatches.length !== 1 ? "s" : ""}</p>
        <button onClick={onRefresh} className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition">
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      {dispatches.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-14 text-center text-slate-400 text-sm">No dispatches yet.</div>
      )}

      <div className="space-y-3">
        {dispatches.map((d) => {
          const id = d.shipmentId ?? d.dispatchId;
          const units = d.totalQuantity ?? d.totalDispatchedQty ?? 0;
          const productWeight = d.totalDispatchedWeight ?? 0;
          const roundedWeight = d.dispatchBoxWeightKg ?? d.dispatchBoxWeight ?? 0;
          const courierCost = d.totalShipmentCharges ?? 0;
          const productCost = d.totalProductCost ?? 0;
          const totalCost = d.totalLandedCost ?? (productCost + courierCost);
          return (
            <div key={id} className="bg-white rounded-2xl border border-slate-200 shadow-sm px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-4 min-w-0 flex-1">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                  <Truck size={16} className="text-indigo-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-slate-900 truncate">{d.dispatchReference ?? d.parcelNumber ?? `Shipment ${id}`}</p>
                  <div className="mt-2 grid grid-cols-2 sm:grid-cols-5 gap-2 text-[11px]">
                    <span className="rounded-lg bg-slate-50 px-2 py-1 text-slate-500">Units <strong className="text-slate-800">{units}</strong></span>
                    <span className="rounded-lg bg-slate-50 px-2 py-1 text-slate-500">Product wt <strong className="text-slate-800">{kgFmt(productWeight)}</strong></span>
                    <span className="rounded-lg bg-teal-50 px-2 py-1 text-tenzy-teal">Rounded wt <strong>{kgFmt(roundedWeight)}</strong></span>
                    <span className="rounded-lg bg-slate-50 px-2 py-1 text-slate-500">Courier <strong className="text-slate-800">{gbp(courierCost)}</strong></span>
                    <span className="rounded-lg bg-slate-50 px-2 py-1 text-slate-500">Products <strong className="text-slate-800">{gbp(productCost)}</strong></span>
                  </div>
                  <p className="text-xs text-slate-500">{d.courierName} · {d.dispatchDate?.slice(0, 10)} · {d.boxCount ?? "?"} box{d.boxCount !== 1 ? "es" : ""}</p>
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS[d.shipmentStatus] ?? STATUS.pending}`}>
                  {d.shipmentStatus ?? "pending"}
                </span>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <div className="text-right">
                  <p className="text-xs text-slate-500">Total cost</p>
                  <p className="text-sm font-bold text-slate-900">{gbp(totalCost)}</p>
                </div>
                <button onClick={() => open(d)}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:border-tenzy-teal hover:text-tenzy-teal transition">
                  <Eye size={12} /> View
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Detail modal */}
      {(detail || loadingDetail) && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-8 overflow-y-auto">
          <div className="absolute inset-0 bg-black/60" onClick={() => { setDetail(null); setLoadingDetail(false); }} />
          <div className="relative bg-white rounded-3xl w-full max-w-2xl shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white rounded-t-3xl">
              <h2 className="text-base font-bold text-slate-900">{detail?.dispatchReference ?? detail?.parcelNumber ?? "Dispatch Detail"}</h2>
              <button onClick={() => setDetail(null)} className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400"><X size={16} /></button>
            </div>
            <div className="p-6 space-y-5">
              {loadingDetail && <Spinner />}
              {!loadingDetail && detail && (
                <>
                  {/* Header info */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                    {[
                      ["Courier", detail.courierName],
                      ["Date", detail.dispatchDate?.slice(0, 10)],
                      ["Parcel", detail.parcelNumber],
                      ["Status", detail.shipmentStatus],
                      ["Boxes", detail.boxCount],
                      ["Rate/kg", gbp(detail.ukToSriLankaCourierPerKg)],
                    ].map(([label, val]) => (
                      <div key={label} className="bg-slate-50 rounded-xl px-3 py-2">
                        <p className="text-xs text-slate-400">{label}</p>
                        <p className="font-semibold text-slate-800 mt-0.5">{val ?? "—"}</p>
                      </div>
                    ))}
                  </div>

                  {/* Items table */}
                  {detail.items?.length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Items</p>
                      <div className="rounded-xl border border-slate-200 overflow-hidden">
                        <table className="w-full text-sm">
                          <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
                            <tr>
                              <th className="text-left px-3 py-2.5">Product</th>
                              <th className="text-right px-3 py-2.5">Qty</th>
                              <th className="text-right px-3 py-2.5">Net Unit</th>
                              <th className="text-right px-3 py-2.5">Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {detail.items.map((item, i) => (
                              <tr key={i} className="hover:bg-slate-50/60">
                                <td className="px-3 py-2.5 font-medium text-slate-800">{item.productName}</td>
                                <td className="px-3 py-2.5 text-right text-slate-600">{item.quantityDispatched}</td>
                                <td className="px-3 py-2.5 text-right text-slate-600">{gbp(item.netUnitCost)}</td>
                                <td className="px-3 py-2.5 text-right font-bold text-slate-900">{gbp((item.netUnitCost ?? 0) * (item.quantityDispatched ?? 0))}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Charges */}
                  {detail.charges?.length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Charges</p>
                      <div className="space-y-2">
                        {detail.charges.map((ch, i) => (
                          <div key={i} className="flex justify-between text-sm bg-slate-50 rounded-xl px-4 py-2.5">
                            <span className="text-slate-600">{ch.chargeType?.replace(/_/g, " ")}</span>
                            <strong className="text-slate-900">{gbp(ch.amount)}</strong>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Main ─────────────────────────────────────────────────────────────────── */
export default function Dispatch() {
  const { toasts, add: addToast } = useToast();
  const [couriers,     setCouriers]     = useState(loadCouriers);
  const [procurements, setProcurements] = useState([]);
  const [dispatches,   setDispatches]   = useState([]);
  const [pageLoading,  setPageLoading]  = useState(true);
  const [activeView,   setActiveView]   = useState("create"); // "create" | "history"
  const [step,         setStep]         = useState(1);
  const [stagedItems,  setStagedItems]  = useState([]);
  const [boxes,        setBoxes]        = useState([{ id: "box-1", number: 1, items: [], roundedWeight: "", homeToUkCourier: "" }]);
  const [saving,       setSaving]       = useState(false);

  // Courier management
  const [showCourierPanel,  setShowCourierPanel]  = useState(false);
  const [courierFormTarget, setCourierFormTarget] = useState(null); // null | {} | existing courier

  const loadPage = useCallback(async () => {
    setPageLoading(true);
    try {
      const [procs, disps] = await Promise.allSettled([
        supplyChainApi.getProcurements(),
        supplyChainApi.getDispatches(),
      ]);
      setProcurements(procs.status  === "fulfilled" ? procs.value  ?? [] : []);
      setDispatches(disps.status    === "fulfilled" ? disps.value  ?? [] : []);
    } finally { setPageLoading(false); }
  }, []);

  useEffect(() => { loadPage(); }, [loadPage]);

  /* courier CRUD */
  const handleSaveCourier = (courier) => {
    setCouriers((prev) => {
      const list = courier.id
        ? prev.map((c) => c.id === courier.id ? courier : c)
        : [...prev, { ...courier, id: String(Date.now()) }];
      saveCouriers(list);
      return list;
    });
    setCourierFormTarget(null);
  };
  const handleDeleteCourier = (id) => {
    setCouriers((prev) => { const list = prev.filter((c) => c.id !== id); saveCouriers(list); return list; });
  };

  const resetFlow = () => {
    setStep(1);
    setStagedItems([]);
    setBoxes([{ id: "box-1", number: 1, items: [], roundedWeight: "", homeToUkCourier: "" }]);
  };

  const handleSaveDispatch = async (courierForm, boxes) => {
    setSaving(true);
    try {
      const filledBoxes = boxes.filter((b) => b.items.length > 0);
      const rate = Number(courierForm.ukToSriLankaCourierPerKg) || 0;
      const allItems = filledBoxes.flatMap((b) => b.items.map((item) => ({
        procurementItemId: item.procurementItemId,
        quantityDispatched: Number(item.quantityDispatched),
        taxAmount: 0,
        weightKg: Number(item.weight ?? 0),
      })));
      const boxMeta = filledBoxes.map((b) => {
        const autoW   = b.items.reduce((s, i) => s + (i.weight ?? 0) * i.quantityDispatched, 0);
        const roundW  = Math.max(roundUpKg(autoW), Number(b.roundedWeight || 0));
        const homeUK  = Number(b.homeToUkCourier || 0);
        return { boxNumber: b.number, autoWeightKg: autoW, weightKg: roundW, homeToUkCourier: homeUK, slCourierCost: roundW * rate,
          items: b.items.map((i) => ({ procurementItemId: i.procurementItemId, quantityDispatched: i.quantityDispatched })) };
      });
      const totalRoundedWeight = boxMeta.reduce((s, b) => s + b.weightKg, 0);
      const totalHomeUK = boxMeta.reduce((s, b) => s + b.homeToUkCourier, 0);
      await supplyChainApi.saveDispatch({
        dispatchDate: `${courierForm.dispatchDate}T00:00:00`,
        courierName: courierForm.courierName,
        parcelNumber: courierForm.parcelNumber,
        boxCount: filledBoxes.length,
        homeToUkCourierPerBox: filledBoxes.length > 0 ? totalHomeUK / filledBoxes.length : 0,
        homeToUkCourierTotal: totalHomeUK,
        ukToSriLankaCourierPerKg: rate,
        dispatchedWeight: totalRoundedWeight,
        dispatchBoxWeightKg: totalRoundedWeight,
        totalWeightOverride: totalRoundedWeight,
        shipmentStatus: courierForm.shipmentStatus,
        notes: courierForm.notes || null,
        items: allItems,
        boxes: boxMeta,
      });
      addToast("success", "Dispatch created successfully!");
      resetFlow();
      await loadPage();
      setActiveView("history");
    } catch (err) {
      addToast("error", err?.message || "Failed to save dispatch.");
    } finally { setSaving(false); }
  };

  const goNext = () => {
    if (step === 1 && stagedItems.length === 0) { addToast("warning", "Stage at least one item first."); return; }
    if (step === 2) {
      if (!boxes.some((b) => b.items.length > 0)) { addToast("warning", "Assign items to at least one box first."); return; }
      const assignedByIndex = boxes.flatMap((b) => b.items).reduce((map, item) => {
        map.set(item.stagedIndex, (map.get(item.stagedIndex) || 0) + Number(item.quantityDispatched || 0));
        return map;
      }, new Map());
      const hasUnassigned = stagedItems.some((item, idx) => (assignedByIndex.get(idx) || 0) < Number(item.quantityDispatched || 0));
      if (hasUnassigned) { addToast("warning", "Assign all staged quantities to boxes before courier save."); return; }
    }
    setStep((s) => s + 1);
  };

  return (
    <div className="space-y-5">
      <ToastList toasts={toasts} />

      {/* Courier panel */}
      {showCourierPanel && (
        <CouriersPanel couriers={couriers}
          onAdd={() => setCourierFormTarget({})}
          onEdit={(c) => setCourierFormTarget(c)}
          onDelete={handleDeleteCourier}
          onClose={() => setShowCourierPanel(false)} />
      )}
      {courierFormTarget !== null && (
        <CourierFormModal
          courier={courierFormTarget.id ? courierFormTarget : undefined}
          onSave={handleSaveCourier}
          onClose={() => setCourierFormTarget(null)} />
      )}

      {/* Page header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dispatch</h1>
          <p className="text-sm text-slate-500 mt-0.5">Organise stock into boxes and create shipments to Sri Lanka</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowCourierPanel(true)}
            className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 bg-white rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition shadow-sm">
            <Truck size={13} /> Manage Couriers
            {couriers.length > 0 && <span className="rounded-full bg-tenzy-teal text-white px-1.5 py-0.5 text-[10px] font-bold">{couriers.length}</span>}
          </button>
          <button onClick={() => setActiveView("create")}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition ${activeView === "create" ? "bg-tenzy-teal text-white" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}>
            New Dispatch
          </button>
          <button onClick={() => setActiveView("history")}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition ${activeView === "history" ? "bg-tenzy-teal text-white" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}>
            History <span className="ml-1 opacity-60">({dispatches.length})</span>
          </button>
        </div>
      </div>

      {/* Create flow */}
      {activeView === "create" && (
        <div className="space-y-5">
          {/* Step bar */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-5 py-4 flex items-center justify-between flex-wrap gap-4">
            <StepBar current={step} />
            <div className="flex items-center gap-2">
              {step > 1 && (
                <button onClick={() => setStep((s) => s - 1)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition">
                  ← Back
                </button>
              )}
              {step < 3 && (
                <button onClick={goNext}
                  className="flex items-center gap-1.5 px-4 py-2 bg-tenzy-teal text-white text-xs font-bold rounded-xl hover:opacity-90 transition">
                  Next <ArrowRight size={13} />
                </button>
              )}
              <button onClick={resetFlow} className="px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition">
                Reset
              </button>
            </div>
          </div>

          {/* Step content */}
          {pageLoading ? <Spinner /> : (
            <>
              {step === 1 && (
                <Step1SelectItems
                  procurements={procurements}
                  stagedItems={stagedItems}
                  setStagedItems={setStagedItems}
                  addToast={addToast} />
              )}
              {step === 2 && (
                <Step2OrganiseBoxes
                  stagedItems={stagedItems}
                  boxes={boxes}
                  setBoxes={setBoxes}
                  addToast={addToast} />
              )}
              {step === 3 && (
                <Step3CourierSave
                  couriers={couriers}
                  boxes={boxes}
                  onSave={handleSaveDispatch}
                  saving={saving}
                  onOpenCouriers={() => setShowCourierPanel(true)} />
              )}
            </>
          )}
        </div>
      )}

      {/* History */}
      {activeView === "history" && (
        <DispatchHistory dispatches={dispatches} loading={pageLoading} onRefresh={loadPage} />
      )}
    </div>
  );
}
