import React, { useState, useEffect, useCallback } from "react";
import {
  Eye, Edit2, Trash2, X, AlertTriangle, ChevronLeft, ChevronRight,
  Download, Package, Truck, BadgeCheck, CheckCircle, XCircle, AlertCircle,
  History, Search,
} from "lucide-react";
import { supplyChainApi } from "../../services/api";

const PAGE_SIZE = 15;

/* ── helpers ──────────────────────────────────────────────────────────────── */
const fmt = (v) => (v == null ? "—" : typeof v === "string" && v.includes("T") ? v.slice(0, 10) : String(v));
const fmtMoney = (v) => (v == null ? "—" : `£${Number(v).toFixed(2)}`);
const getPurchaseDispatchStatus = (items = []) => {
  const totals = (items ?? []).reduce((acc, item) => {
    acc.ordered += Number(item.quantity ?? 0);
    acc.dispatched += Number(item.quantityAlreadyDispatched ?? 0);
    return acc;
  }, { ordered: 0, dispatched: 0 });

  if (totals.dispatched <= 0) return "pending_dispatch";
  if (totals.ordered > 0 && totals.dispatched >= totals.ordered) return "dispatched";
  return "partially_dispatched";
};
const getPurchaseDispatchLabel = (status) => {
  if (status === "pending_dispatch") return "Pending dispatch";
  if (status === "partially_dispatched") return "Partially dispatched";
  return status === "dispatched" ? "Dispatched" : fmt(status);
};

function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="w-7 h-7 rounded-full border-4 border-tenzy-teal/30 border-t-tenzy-teal animate-spin" />
    </div>
  );
}

function Badge({ color, children }) {
  const colors = {
    green:  "bg-emerald-100 text-emerald-700",
    amber:  "bg-amber-100 text-amber-700",
    red:    "bg-red-100 text-red-700",
    blue:   "bg-blue-100 text-blue-700",
    slate:  "bg-slate-100 text-slate-600",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${colors[color] ?? colors.slate}`}>
      {children}
    </span>
  );
}

function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-2 pt-4">
      <button disabled={page === 1} onClick={() => onChange(page - 1)}
        className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 disabled:opacity-40 transition">
        <ChevronLeft size={15} />
      </button>
      <span className="text-sm text-slate-600 font-medium">{page} / {totalPages}</span>
      <button disabled={page === totalPages} onClick={() => onChange(page + 1)}
        className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 disabled:opacity-40 transition">
        <ChevronRight size={15} />
      </button>
    </div>
  );
}

/* ── Confirm Delete Dialog ────────────────────────────────────────────────── */
function ConfirmDeleteDialog({ item, onConfirm, onCancel }) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const handleConfirm = async () => {
    setBusy(true);
    try { await onConfirm(reason); }
    finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
            <Trash2 size={20} className="text-red-500" />
          </div>
          <div>
            <p className="font-bold text-slate-900">Delete Stock Item?</p>
            <p className="text-xs text-slate-500 mt-0.5 truncate max-w-[200px]">{item?.productName}</p>
          </div>
        </div>
        <p className="text-sm text-slate-600 mb-3">
          This will soft-delete the item. The record will be saved in the deleted items log.
        </p>
        <textarea
          value={reason} onChange={(e) => setReason(e.target.value)}
          placeholder="Reason for deletion (optional)"
          rows={2}
          className="w-full text-sm px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-red-300 focus:border-red-400 transition resize-none mb-4"
        />
        <div className="flex gap-3">
          <button onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition">
            Cancel
          </button>
          <button onClick={handleConfirm} disabled={busy}
            className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 transition disabled:opacity-60">
            {busy ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Edit Procurement Item Dialog ─────────────────────────────────────────── */
function EditProcurementItemDialog({ item, onSave, onCancel }) {
  const [form, setForm] = useState({
    productName:  item.productName  ?? "",
    brandName:    item.brandName    ?? "",
    categoryName: item.categoryName ?? "",
    quantity:     item.quantity     ?? 1,
    unitPrice:    item.unitPrice    ?? 0,
    batchNote:    item.batchNote    ?? "",
  });
  const [busy, setBusy] = useState(false);
  const [err,  setErr]  = useState("");

  const handleSave = async () => {
    if (!form.productName.trim()) { setErr("Product name is required."); return; }
    if (form.quantity <= 0)       { setErr("Quantity must be > 0."); return; }
    if (form.unitPrice <= 0)      { setErr("Unit price must be > 0."); return; }
    setBusy(true);
    setErr("");
    try { await onSave({ ...form, quantity: Number(form.quantity), unitPrice: Number(form.unitPrice) }); }
    catch (e) { setErr(e.message || "Save failed."); setBusy(false); }
  };

  const F = ({ label, children }) => (
    <div>
      <label className="block text-xs font-semibold text-slate-500 mb-1">{label}</label>
      {children}
    </div>
  );
  const inp = "w-full text-sm px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-tenzy-teal/30 focus:border-tenzy-teal transition";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl max-w-md w-full shadow-2xl">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <p className="font-bold text-slate-900">Edit Procurement Item</p>
          <button onClick={onCancel} className="p-1.5 rounded-full hover:bg-slate-100"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-3">
          <F label="Product Name *">
            <input className={inp} value={form.productName} onChange={(e) => setForm({ ...form, productName: e.target.value })} />
          </F>
          <div className="grid grid-cols-2 gap-3">
            <F label="Brand"><input className={inp} value={form.brandName} onChange={(e) => setForm({ ...form, brandName: e.target.value })} /></F>
            <F label="Category"><input className={inp} value={form.categoryName} onChange={(e) => setForm({ ...form, categoryName: e.target.value })} /></F>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <F label="Quantity *"><input type="number" min="1" className={inp} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} /></F>
            <F label="Unit Price (£) *"><input type="number" min="0.01" step="0.01" className={inp} value={form.unitPrice} onChange={(e) => setForm({ ...form, unitPrice: e.target.value })} /></F>
          </div>
          <F label="Batch Note">
            <input className={inp} value={form.batchNote} onChange={(e) => setForm({ ...form, batchNote: e.target.value })} placeholder="Optional" />
          </F>
          {err && <p className="text-xs text-red-500">{err}</p>}
          <div className="flex gap-3 pt-1">
            <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600">Cancel</button>
            <button onClick={handleSave} disabled={busy}
              className="flex-1 py-2.5 rounded-xl bg-tenzy-teal text-white text-sm font-bold hover:opacity-90 transition disabled:opacity-60">
              {busy ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Edit Dispatch Item Dialog ────────────────────────────────────────────── */
function EditDispatchItemDialog({ item, onSave, onCancel }) {
  const [qty, setQty]   = useState(item.quantityDispatched ?? 1);
  const [busy, setBusy] = useState(false);
  const [err,  setErr]  = useState("");

  const handleSave = async () => {
    if (Number(qty) <= 0) { setErr("Quantity must be > 0."); return; }
    setBusy(true); setErr("");
    try { await onSave({ quantityDispatched: Number(qty) }); }
    catch (e) { setErr(e.message || "Save failed."); setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl max-w-sm w-full shadow-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="font-bold text-slate-900">Edit Dispatch Quantity</p>
          <button onClick={onCancel} className="p-1.5 rounded-full hover:bg-slate-100"><X size={18} /></button>
        </div>
        <p className="text-sm text-slate-600 mb-2 font-medium">{item.productName}</p>
        <label className="text-xs font-semibold text-slate-500 block mb-1">Quantity Dispatched</label>
        <input type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)}
          className="w-full text-sm px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-tenzy-teal/30 focus:border-tenzy-teal transition mb-3" />
        {err && <p className="text-xs text-red-500 mb-2">{err}</p>}
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600">Cancel</button>
          <button onClick={handleSave} disabled={busy}
            className="flex-1 py-2.5 rounded-xl bg-tenzy-teal text-white text-sm font-bold hover:opacity-90 transition disabled:opacity-60">
            {busy ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Procurement Items Dialog ─────────────────────────────────────────────── */
function ProcurementItemsDialog({ procurementId, procRef, onClose, onRefresh }) {
  const [data,        setData]        = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [editTarget,  setEditTarget]  = useState(null);
  const [error,       setError]       = useState("");

  const load = useCallback(() => {
    setLoading(true);
    supplyChainApi.getProcurementById(procurementId)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [procurementId]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (reason) => {
    await supplyChainApi.deleteProcurementItem(deleteTarget.procurementItemId, reason);
    setDeleteTarget(null);
    load();
    onRefresh?.();
  };

  const handleEdit = async (body) => {
    await supplyChainApi.updateProcurementItem(editTarget.procurementItemId, body);
    setEditTarget(null);
    load();
    onRefresh?.();
  };

  return (
    <>
      <div className="fixed inset-0 z-40 flex items-start justify-center p-4 pt-10 overflow-y-auto">
        <div className="absolute inset-0 bg-black/50" onClick={onClose} />
        <div className="relative bg-white rounded-2xl w-full max-w-3xl shadow-2xl">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <p className="font-bold text-slate-900">UK Purchase Items</p>
              <p className="text-xs text-slate-500 mt-0.5">{procRef}</p>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-full hover:bg-slate-100"><X size={18} /></button>
          </div>

          <div className="p-5">
            {loading && <Spinner />}
            {error && <p className="text-sm text-red-500 py-4 text-center">{error}</p>}
            {!loading && !error && data && (
              <>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {[
                    ["Items", data.itemCount],
                    ["Gross", fmtMoney(data.totalGrossAmount)],
                    ["Net", fmtMoney(data.totalNetAmount)],
                  ].map(([l, v]) => (
                    <div key={l} className="bg-slate-50 rounded-xl p-3 text-center">
                      <p className="text-xs text-slate-500">{l}</p>
                      <p className="text-base font-bold text-slate-900">{v}</p>
                    </div>
                  ))}
                </div>
                <div className="overflow-x-auto rounded-xl border border-slate-100">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wider">
                      <tr>
                        {["#", "Product", "Brand", "Category", "Qty", "Unit £", "Net £", ""].map((h) => (
                          <th key={h} className="px-3 py-2 text-left font-semibold">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {data.items.map((item) => (
                        <tr key={item.procurementItemId} className="hover:bg-slate-50">
                          <td className="px-3 py-2 text-slate-400">{item.lineNumber}</td>
                          <td className="px-3 py-2 font-medium text-slate-800">{item.productName}</td>
                          <td className="px-3 py-2 text-slate-600">{item.brandName || "—"}</td>
                          <td className="px-3 py-2 text-slate-600">{item.categoryName || "—"}</td>
                          <td className="px-3 py-2 text-slate-700 font-medium">{item.quantity}</td>
                          <td className="px-3 py-2 text-slate-600">{fmtMoney(item.unitPrice)}</td>
                          <td className="px-3 py-2 text-slate-800 font-semibold">{fmtMoney(item.netTotal)}</td>
                          <td className="px-3 py-2">
                            <div className="flex gap-1">
                              <button onClick={() => setEditTarget(item)}
                                className="p-1.5 rounded-lg text-slate-400 hover:bg-tenzy-teal hover:text-white transition" title="Edit">
                                <Edit2 size={13} />
                              </button>
                              <button onClick={() => setDeleteTarget(item)}
                                className="p-1.5 rounded-lg text-slate-400 hover:bg-red-500 hover:text-white transition" title="Delete">
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      {deleteTarget && (
        <ConfirmDeleteDialog
          item={deleteTarget}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
      {editTarget && (
        <EditProcurementItemDialog
          item={editTarget}
          onSave={handleEdit}
          onCancel={() => setEditTarget(null)}
        />
      )}
    </>
  );
}

/* ── Dispatch Items Dialog ────────────────────────────────────────────────── */
function DispatchItemsDialog({ shipmentId, dispRef, onClose, onRefresh }) {
  const [data,         setData]         = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [editTarget,   setEditTarget]   = useState(null);
  const [error,        setError]        = useState("");

  const load = useCallback(() => {
    setLoading(true);
    supplyChainApi.getDispatchById(shipmentId)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [shipmentId]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (reason) => {
    await supplyChainApi.deleteDispatchItem(deleteTarget.shipmentItemId, reason);
    setDeleteTarget(null);
    load();
    onRefresh?.();
  };

  const handleEdit = async (body) => {
    await supplyChainApi.updateDispatchItem(editTarget.shipmentItemId, body);
    setEditTarget(null);
    load();
    onRefresh?.();
  };

  const statusColor = { pending: "amber", dispatched: "blue", received: "green" };

  return (
    <>
      <div className="fixed inset-0 z-40 flex items-start justify-center p-4 pt-10 overflow-y-auto">
        <div className="absolute inset-0 bg-black/50" onClick={onClose} />
        <div className="relative bg-white rounded-2xl w-full max-w-3xl shadow-2xl">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <p className="font-bold text-slate-900">Dispatch Items</p>
              <p className="text-xs text-slate-500 mt-0.5">{dispRef}</p>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-full hover:bg-slate-100"><X size={18} /></button>
          </div>

          <div className="p-5">
            {loading && <Spinner />}
            {error && <p className="text-sm text-red-500 py-4 text-center">{error}</p>}
            {!loading && !error && data && (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                  {[
                    ["Courier", data.courierName],
                    ["Status", <Badge key="s" color={statusColor[data.shipmentStatus] ?? "slate"}>{data.shipmentStatus}</Badge>],
                    ["Products £", fmtMoney(data.totalProductCost)],
                    ["Charges £", fmtMoney(data.totalShipmentCharges)],
                  ].map(([l, v]) => (
                    <div key={l} className="bg-slate-50 rounded-xl p-3">
                      <p className="text-xs text-slate-500 mb-0.5">{l}</p>
                      <p className="text-sm font-bold text-slate-900">{v}</p>
                    </div>
                  ))}
                </div>
                <div className="overflow-x-auto rounded-xl border border-slate-100">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wider">
                      <tr>
                        {["Product", "Brand", "Category", "Qty", "Net Unit £", "Net £", ""].map((h) => (
                          <th key={h} className="px-3 py-2 text-left font-semibold">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {data.items.map((item) => (
                        <tr key={item.shipmentItemId} className="hover:bg-slate-50">
                          <td className="px-3 py-2 font-medium text-slate-800">{item.productName}</td>
                          <td className="px-3 py-2 text-slate-600">{item.brandName || "—"}</td>
                          <td className="px-3 py-2 text-slate-600">{item.categoryName || "—"}</td>
                          <td className="px-3 py-2 font-medium text-slate-700">{item.quantityDispatched}</td>
                          <td className="px-3 py-2 text-slate-600">{fmtMoney(item.netUnitCost)}</td>
                          <td className="px-3 py-2 font-semibold text-slate-800">{fmtMoney(item.netAmount)}</td>
                          <td className="px-3 py-2">
                            <div className="flex gap-1">
                              <button onClick={() => setEditTarget(item)}
                                className="p-1.5 rounded-lg text-slate-400 hover:bg-tenzy-teal hover:text-white transition" title="Edit qty">
                                <Edit2 size={13} />
                              </button>
                              <button onClick={() => setDeleteTarget(item)}
                                className="p-1.5 rounded-lg text-slate-400 hover:bg-red-500 hover:text-white transition" title="Delete">
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {data.charges.length > 0 && (
                  <div className="mt-4">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Shipment Charges</p>
                    <div className="space-y-1">
                      {data.charges.map((c) => (
                        <div key={c.shipmentChargeId} className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-xl text-sm">
                          <span className="capitalize text-slate-700">{c.chargeType.replace("_", " ")}</span>
                          <span className="font-semibold text-slate-800">{c.currencyCode} {Number(c.amount).toFixed(2)}</span>
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
      {deleteTarget && (
        <ConfirmDeleteDialog
          item={{ ...deleteTarget, productName: deleteTarget.productName }}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
      {editTarget && (
        <EditDispatchItemDialog
          item={editTarget}
          onSave={handleEdit}
          onCancel={() => setEditTarget(null)}
        />
      )}
    </>
  );
}

/* ── Deleted Items Dialog ─────────────────────────────────────────────────── */
function DeletedItemsDialog({ tableName, title, onClose }) {
  const [items,   setItems]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState("");
  const [page,    setPage]    = useState(1);

  useEffect(() => {
    supplyChainApi.getDeletedItems(tableName)
      .then(setItems)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [tableName]);

  const filtered = items.filter((i) =>
    !search || [i.productName, i.brandName, i.categoryName, i.deletionReason]
      .some((v) => v?.toLowerCase().includes(search.toLowerCase()))
  );
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const page_items = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-10 overflow-y-auto">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl w-full max-w-3xl shadow-2xl">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History size={18} className="text-slate-500" />
            <p className="font-bold text-slate-900">{title} — Deleted Records</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-slate-100"><X size={18} /></button>
        </div>
        <div className="p-5">
          <div className="relative mb-4">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search deleted items…"
              className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-tenzy-teal/30" />
          </div>
          {loading ? <Spinner /> : (
            <>
              <div className="overflow-x-auto rounded-xl border border-slate-100">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wider">
                    <tr>
                      {["Product", "Brand", "Qty", "Cost £", "Reason", "Deleted"].map((h) => (
                        <th key={h} className="px-3 py-2 text-left font-semibold">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {page_items.length === 0 && (
                      <tr><td colSpan={6} className="px-3 py-8 text-center text-slate-400">No deleted items found.</td></tr>
                    )}
                    {page_items.map((i) => (
                      <tr key={i.logId} className="hover:bg-red-50">
                        <td className="px-3 py-2 text-slate-800">{i.productName || "—"}</td>
                        <td className="px-3 py-2 text-slate-600">{i.brandName || "—"}</td>
                        <td className="px-3 py-2">{i.quantity ?? "—"}</td>
                        <td className="px-3 py-2">{i.netUnitCost != null ? fmtMoney(i.netUnitCost) : "—"}</td>
                        <td className="px-3 py-2 text-slate-500 italic">{i.deletionReason || "—"}</td>
                        <td className="px-3 py-2 text-slate-400 whitespace-nowrap">{i.deletedAtUtc ? i.deletedAtUtc.slice(0, 10) : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination page={page} totalPages={totalPages} onChange={setPage} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Tab: Procurement Stock ───────────────────────────────────────────────── */
function ProcurementStockTab() {
  const [items,       setItems]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState("");
  const [page,        setPage]        = useState(1);
  const [viewId,      setViewId]      = useState(null);
  const [viewRef,     setViewRef]     = useState("");
  const [showDeleted, setShowDeleted] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    supplyChainApi.getProcurements()
      .then(async (data) => {
        const list = Array.isArray(data) ? data : [];
        const details = await Promise.all(
          list.map(async (purchase) => {
            try {
              return await supplyChainApi.getProcurementById(purchase.procurementId);
            } catch {
              return null;
            }
          })
        );

        const detailById = new Map(
          details
            .filter(Boolean)
            .map((detail) => [detail.procurementId, detail])
        );

        setItems(list.map((purchase) => ({
          ...purchase,
          purchaseDispatchStatus: getPurchaseDispatchStatus(detailById.get(purchase.procurementId)?.items ?? []),
        })));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = items.filter((i) =>
    !search || [i.procurementReference, i.shopName, i.invoiceReference]
      .some((v) => v?.toLowerCase().includes(search.toLowerCase()))
  );
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const page_items = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search procurements…"
            className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-tenzy-teal/30" />
        </div>
        <button onClick={() => setShowDeleted(true)}
          className="flex items-center gap-1.5 text-sm font-semibold px-3 py-2 border border-slate-200 bg-white rounded-xl text-slate-600 hover:bg-slate-50 transition">
          <History size={14} /> Deleted Records
        </button>
      </div>

      {loading ? <Spinner /> : (
        <>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wider">
                <tr>
                  {["Reference", "Shop", "Date", "Items", "Gross £", "Net £", "Status", ""].map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {page_items.length === 0 && (
                  <tr><td colSpan={8} className="px-4 py-12 text-center text-slate-400">No UK purchases found.</td></tr>
                )}
                {page_items.map((p) => (
                  <tr key={p.procurementId} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3 font-mono text-xs text-tenzy-teal font-bold">{p.procurementReference}</td>
                    <td className="px-4 py-3 text-slate-800">{p.shopName}</td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{fmt(p.purchaseDate)}</td>
                    <td className="px-4 py-3">
                      <Badge color="blue">{p.itemCount} items</Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{fmtMoney(p.totalGrossAmount)}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{fmtMoney(p.totalNetAmount)}</td>
                    <td className="px-4 py-3">
                      <Badge
                        color={
                          p.purchaseDispatchStatus === "dispatched"
                            ? "blue"
                            : p.purchaseDispatchStatus === "partially_dispatched"
                            ? "amber"
                            : "slate"
                        }
                      >
                        {getPurchaseDispatchLabel(p.purchaseDispatchStatus)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => { setViewId(p.procurementId); setViewRef(p.procurementReference); }}
                        className="flex items-center gap-1 text-xs font-semibold text-tenzy-teal hover:underline">
                        <Eye size={13} /> View Items
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={totalPages} onChange={setPage} />
        </>
      )}

      {viewId && (
        <ProcurementItemsDialog
          procurementId={viewId}
          procRef={viewRef}
          onClose={() => setViewId(null)}
          onRefresh={load}
        />
      )}
      {showDeleted && (
        <DeletedItemsDialog
          tableName="SupplyProcurementItems"
          title="UK Purchase"
          onClose={() => setShowDeleted(false)}
        />
      )}
    </div>
  );
}

/* ── Tab: Dispatch Stock ──────────────────────────────────────────────────── */
function DispatchStockTab() {
  const [items,       setItems]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState("");
  const [page,        setPage]        = useState(1);
  const [viewId,      setViewId]      = useState(null);
  const [viewRef,     setViewRef]     = useState("");
  const [showDeleted, setShowDeleted] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    supplyChainApi.getDispatches()
      .then((data) => setItems(Array.isArray(data) ? data : []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = items.filter((i) =>
    !search || [i.dispatchReference, i.courierName, i.parcelNumber]
      .some((v) => v?.toLowerCase().includes(search.toLowerCase()))
  );
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const page_items = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const statusColor = { pending: "amber", dispatched: "blue", received: "green" };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search dispatches…"
            className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-tenzy-teal/30" />
        </div>
        <button onClick={() => setShowDeleted(true)}
          className="flex items-center gap-1.5 text-sm font-semibold px-3 py-2 border border-slate-200 bg-white rounded-xl text-slate-600 hover:bg-slate-50 transition">
          <History size={14} /> Deleted Records
        </button>
      </div>

      {loading ? <Spinner /> : (
        <>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wider">
                <tr>
                  {["Reference", "Date", "Courier", "Parcel #", "Qty", "Products £", "Charges £", "Status", ""].map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-semibold whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {page_items.length === 0 && (
                  <tr><td colSpan={9} className="px-4 py-12 text-center text-slate-400">No dispatches found.</td></tr>
                )}
                {page_items.map((d) => (
                  <tr key={d.shipmentId} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3 font-mono text-xs text-tenzy-teal font-bold">{d.dispatchReference}</td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{fmt(d.dispatchDate)}</td>
                    <td className="px-4 py-3 text-slate-800">{d.courierName}</td>
                    <td className="px-4 py-3 text-slate-600">{d.parcelNumber}</td>
                    <td className="px-4 py-3"><Badge color="blue">{d.totalQuantity}</Badge></td>
                    <td className="px-4 py-3 text-slate-600">{fmtMoney(d.totalProductCost)}</td>
                    <td className="px-4 py-3 text-slate-600">{fmtMoney(d.totalShipmentCharges)}</td>
                    <td className="px-4 py-3">
                      <Badge color={statusColor[d.shipmentStatus] ?? "slate"}>{d.shipmentStatus}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => { setViewId(d.shipmentId); setViewRef(d.dispatchReference); }}
                        className="flex items-center gap-1 text-xs font-semibold text-tenzy-teal hover:underline">
                        <Eye size={13} /> View Items
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={totalPages} onChange={setPage} />
        </>
      )}

      {viewId && (
        <DispatchItemsDialog
          shipmentId={viewId}
          dispRef={viewRef}
          onClose={() => setViewId(null)}
          onRefresh={load}
        />
      )}
      {showDeleted && (
        <DeletedItemsDialog
          tableName="SupplyShipmentItems"
          title="Dispatch"
          onClose={() => setShowDeleted(false)}
        />
      )}
    </div>
  );
}

/* ── Arrival Items Dialog ─────────────────────────────────────────────────── */
function ArrivalItemsDialog({ arrivalId, dispRef, onClose }) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

  useEffect(() => {
    supplyChainApi.getArrivalById(arrivalId)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [arrivalId]);

  const statusColor = { received: "blue", completed: "green", issue: "red" };

  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center p-4 pt-10 overflow-y-auto">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl w-full max-w-4xl shadow-2xl">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <p className="font-bold text-slate-900">Arrival Verification</p>
            <p className="text-xs text-slate-500 mt-0.5">{dispRef}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-slate-100"><X size={18} /></button>
        </div>
        <div className="p-5">
          {loading && <Spinner />}
          {error && <p className="text-sm text-red-500 py-4 text-center">{error}</p>}
          {!loading && !error && data && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                {[
                  ["Date", fmt(data.verificationDate)],
                  ["Status", <Badge key="s" color={statusColor[data.verificationStatus] ?? "slate"}>{data.verificationStatus}</Badge>],
                  ["Approved", <span key="a" className="text-emerald-600 font-bold">{data.totalApprovedQuantity}</span>],
                  ["Missing / Damaged", <span key="m" className="text-red-500 font-bold">{data.totalMissingQuantity} / {data.totalDamagedQuantity}</span>],
                ].map(([l, v]) => (
                  <div key={l} className="bg-slate-50 rounded-xl p-3">
                    <p className="text-xs text-slate-500 mb-0.5">{l}</p>
                    <p className="text-sm font-bold text-slate-900">{v}</p>
                  </div>
                ))}
              </div>
              <div className="overflow-x-auto rounded-xl border border-slate-100">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wider">
                    <tr>
                      {["Product", "Brand", "Dispatched", "Received", "Approved", "Missing", "Damaged", "Extra", "For Pricing"].map((h) => (
                        <th key={h} className="px-3 py-2 text-left font-semibold whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {data.items.map((item) => (
                      <tr key={item.arrivalItemId} className="hover:bg-slate-50">
                        <td className="px-3 py-2 font-medium text-slate-800">{item.productName}</td>
                        <td className="px-3 py-2 text-slate-600">{item.brandName || "—"}</td>
                        <td className="px-3 py-2 text-slate-600">{item.quantityDispatched}</td>
                        <td className="px-3 py-2 text-slate-700">{item.quantityReceived}</td>
                        <td className="px-3 py-2 text-emerald-600 font-semibold">{item.approvedQuantity}</td>
                        <td className="px-3 py-2 text-red-500">{item.missingQuantity || "—"}</td>
                        <td className="px-3 py-2 text-amber-600">{item.damagedQuantity || "—"}</td>
                        <td className="px-3 py-2 text-blue-500">{item.extraQuantity || "—"}</td>
                        <td className="px-3 py-2">
                          {item.approvedForPricing
                            ? <CheckCircle size={15} className="text-emerald-500" />
                            : <XCircle size={15} className="text-slate-300" />}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Tab: Arrival Stock ───────────────────────────────────────────────────── */
function ArrivalStockTab() {
  const [arrivals, setArrivals] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState("");
  const [filter,   setFilter]   = useState("all"); // all | approved | issue | missing
  const [page,     setPage]     = useState(1);
  const [viewId,   setViewId]   = useState(null);
  const [viewRef,  setViewRef]  = useState("");

  useEffect(() => {
    supplyChainApi.getArrivals()
      .then((data) => setArrivals(Array.isArray(data) ? data : []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = arrivals.filter((a) => {
    const matchSearch = !search ||
      [a.dispatchReference, a.verificationStatus, a.notes]
        .some((v) => v?.toLowerCase().includes(search.toLowerCase()));
    const matchFilter =
      filter === "all" ||
      (filter === "approved"  && a.verificationStatus === "completed") ||
      (filter === "issue"     && a.verificationStatus === "issue") ||
      (filter === "missing"   && a.totalMissingQuantity > 0) ||
      (filter === "damaged"   && a.totalDamagedQuantity > 0);
    return matchSearch && matchFilter;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const page_items = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const statusColor = { received: "blue", completed: "green", issue: "red" };

  const FILTERS = [
    { key: "all",      label: "All" },
    { key: "approved", label: "Completed" },
    { key: "issue",    label: "Issues" },
    { key: "missing",  label: "Has Missing" },
    { key: "damaged",  label: "Has Damaged" },
  ];

  // Summary stats
  const totalApproved = arrivals.reduce((s, a) => s + (a.totalApprovedQuantity ?? 0), 0);
  const totalMissing  = arrivals.reduce((s, a) => s + (a.totalMissingQuantity  ?? 0), 0);
  const totalDamaged  = arrivals.reduce((s, a) => s + (a.totalDamagedQuantity  ?? 0), 0);

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle size={16} className="text-emerald-500" />
            <p className="text-xs font-semibold text-emerald-600">Total Approved</p>
          </div>
          <p className="text-2xl font-bold text-emerald-700">{totalApproved}</p>
        </div>
        <div className="bg-red-50 rounded-2xl p-4 border border-red-100">
          <div className="flex items-center gap-2 mb-1">
            <XCircle size={16} className="text-red-500" />
            <p className="text-xs font-semibold text-red-600">Total Missing</p>
          </div>
          <p className="text-2xl font-bold text-red-700">{totalMissing}</p>
        </div>
        <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100">
          <div className="flex items-center gap-2 mb-1">
            <AlertCircle size={16} className="text-amber-500" />
            <p className="text-xs font-semibold text-amber-600">Total Damaged</p>
          </div>
          <p className="text-2xl font-bold text-amber-700">{totalDamaged}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search arrivals…"
            className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-tenzy-teal/30" />
        </div>
        <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1">
          {FILTERS.map((f) => (
            <button key={f.key} onClick={() => { setFilter(f.key); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${filter === f.key ? "bg-tenzy-teal text-white" : "text-slate-500 hover:bg-slate-100"}`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? <Spinner /> : (
        <>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wider">
                <tr>
                  {["Dispatch Ref", "Date", "Status", "Approved", "Missing", "Damaged", "Notes", ""].map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-semibold whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {page_items.length === 0 && (
                  <tr><td colSpan={8} className="px-4 py-12 text-center text-slate-400">No arrivals found.</td></tr>
                )}
                {page_items.map((a) => (
                  <tr key={a.arrivalVerificationId} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3 font-mono text-xs text-tenzy-teal font-bold">{a.dispatchReference}</td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{fmt(a.verificationDate)}</td>
                    <td className="px-4 py-3">
                      <Badge color={statusColor[a.verificationStatus] ?? "slate"}>{a.verificationStatus}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
                        <CheckCircle size={13} /> {a.totalApprovedQuantity}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {a.totalMissingQuantity > 0
                        ? <span className="text-red-500 font-semibold">{a.totalMissingQuantity}</span>
                        : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {a.totalDamagedQuantity > 0
                        ? <span className="text-amber-500 font-semibold">{a.totalDamagedQuantity}</span>
                        : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs max-w-[120px] truncate">{a.notes || "—"}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => { setViewId(a.arrivalVerificationId); setViewRef(a.dispatchReference); }}
                        className="flex items-center gap-1 text-xs font-semibold text-tenzy-teal hover:underline">
                        <Eye size={13} /> View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={totalPages} onChange={setPage} />
        </>
      )}

      {viewId && (
        <ArrivalItemsDialog
          arrivalId={viewId}
          dispRef={viewRef}
          onClose={() => setViewId(null)}
        />
      )}
    </div>
  );
}

/* ── Page ─────────────────────────────────────────────────────────────────── */
const TABS = [
  { label: "UK Purchase Stock", icon: Package },
  { label: "Dispatch Stock",    icon: Truck },
  { label: "Arrival Stock",     icon: BadgeCheck },
];

export default function Stock() {
  const [activeTab, setActiveTab] = useState(0);
  const TabContent = [ProcurementStockTab, DispatchStockTab, ArrivalStockTab][activeTab];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-slate-900">Stock Management</h1>
        <p className="text-sm text-slate-500 mt-0.5">View and manage UK purchase, dispatch, and arrival stock</p>
      </div>

      {/* Tab bar */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-1.5 flex gap-1 overflow-x-auto">
        {TABS.map((tab, i) => (
          <button
            key={tab.label}
            onClick={() => setActiveTab(i)}
            className={`flex items-center gap-2 flex-1 min-w-max text-sm font-semibold py-2 px-3 rounded-xl transition ${
              activeTab === i
                ? "bg-tenzy-teal text-white shadow"
                : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
            }`}>
            <tab.icon size={15} />
            {tab.label}
          </button>
        ))}
      </div>

      <TabContent />
    </div>
  );
}
