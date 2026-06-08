import React, { useEffect, useState, useMemo } from "react";
import {
  AlertTriangle, Archive, BadgeCheck, Camera, CheckCircle, CheckSquare,
  ChevronDown, ChevronUp, Eye, History, Images, PackageSearch, X,
} from "lucide-react";
import { supplyChainApi, uploadApi } from "../../services/api";
import { useAuth } from "../../Context/AuthContext";

// ── Variant tag: shows volume · weight · tablet count ─────────────────────────
function VariantTag({ item }) {
  const variantName = item.variantName ?? item.VariantName ?? "";
  // item.weight from ProductVariants is in grams — display directly
  const wG     = Number(item.weight ?? item.Weight ?? 0) || 0;
  const volume = item.volume ?? item.Volume ?? "";
  const tabs   = item.tabletCount ?? item.TabletCount ?? null;

  const parts = [];
  if (volume) parts.push(volume);
  if (wG > 0) parts.push(`${Math.round(wG)}g`);
  if (tabs)   parts.push(`${tabs} tabs`);

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {variantName && (
        <span className="text-[11px] font-semibold text-tenzy-teal">
          {variantName}
        </span>
      )}
      {parts.length > 0 && (
        <span className="inline-flex items-center text-[10px] font-bold bg-teal-50 text-tenzy-teal px-2 py-0.5 rounded-full border border-teal-200 shrink-0">
          {parts.join(" · ")}
        </span>
      )}
    </div>
  );
}

// ── Reusable damage photo uploader ───────────────────────────────────────────
function DamagePhotoUploader({ itemId, photos = [], uploading, onCamera, onGallery, onRemove }) {
  return (
    <div className="mt-3 rounded-2xl bg-red-50 border border-red-200 p-3">
      <p className="text-xs font-bold text-red-700 mb-2 flex items-center gap-1.5">
        <Camera size={12} /> Damage photos
      </p>

      {photos.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {photos.map((url) => (
            <div key={url} className="relative w-20 h-20 rounded-xl overflow-hidden border border-red-200 group shrink-0">
              <img src={url} alt="damage" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => onRemove(url)}
                className="absolute top-1 right-1 hidden group-hover:flex items-center justify-center w-5 h-5 rounded-full bg-red-500 text-white shadow"
              >
                <X size={10} />
              </button>
            </div>
          ))}
        </div>
      )}

      {uploading ? (
        <div className="flex items-center justify-center gap-2 py-2 text-xs text-red-500">
          <div className="w-4 h-4 rounded-full border-2 border-red-300 border-t-red-600 animate-spin" />
          Uploading photo…
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {/* Camera — opens camera directly on mobile */}
          <label className="flex items-center justify-center gap-1.5 rounded-xl bg-red-600 text-white text-xs font-semibold py-2.5 cursor-pointer hover:bg-red-700 transition active:scale-95">
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onCamera(file);
                e.target.value = "";
              }}
            />
            <Camera size={13} /> Take photo
          </label>
          {/* Gallery — opens file picker / gallery on mobile */}
          <label className="flex items-center justify-center gap-1.5 rounded-xl border border-red-300 bg-white text-red-700 text-xs font-semibold py-2.5 cursor-pointer hover:bg-red-50 transition active:scale-95">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="hidden"
              onChange={(e) => {
                const files = Array.from(e.target.files ?? []);
                files.forEach((file) => onGallery(file));
                e.target.value = "";
              }}
            />
            <Images size={13} /> From gallery
          </label>
        </div>
      )}

      {photos.length === 0 && !uploading && (
        <p className="mt-2 text-[10px] text-red-400 text-center">
          Add at least one photo before approving damaged items.
        </p>
      )}
    </div>
  );
}

// ── Shared primitives ────────────────────────────────────────────────────────
const Input = (props) => (
  <input
    {...props}
    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-tenzy-teal focus:ring-2 focus:ring-tenzy-teal/20"
  />
);

const Select = (props) => (
  <select
    {...props}
    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-tenzy-teal focus:ring-2 focus:ring-tenzy-teal/20"
  />
);

const Label = ({ children }) => (
  <label className="mb-1 block text-xs font-semibold text-slate-500">{children}</label>
);

const STATUS_COLORS = {
  completed: "bg-emerald-100 text-emerald-700",
  received: "bg-blue-100 text-blue-700",
  issue: "bg-red-100 text-red-700",
};

const emptyForm = {
  shipmentId: "",
  verificationDate: new Date().toISOString().slice(0, 10),
  verificationStatus: "received",
  notes: "",
  items: [],
};

// ── Arrival detail modal ─────────────────────────────────────────────────────
function ArrivalDetailDialog({ arrivalId, onClose }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supplyChainApi.getArrivalById(arrivalId).then(setDetail).finally(() => setLoading(false));
  }, [arrivalId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-3">
            <BadgeCheck size={20} className="text-emerald-500" />
            <div>
              <h2 className="text-lg font-bold text-slate-900">{detail ? detail.dispatchReference : "Arrival Detail"}</h2>
              {detail && (
                <p className="text-xs text-slate-500 mt-0.5">
                  {new Date(detail.verificationDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  {detail.notes && ` · ${detail.notes}`}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {detail && (
              <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${STATUS_COLORS[detail.verificationStatus] ?? "bg-slate-100 text-slate-600"}`}>
                {detail.verificationStatus}
              </span>
            )}
            <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-500"><X size={18} /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading && (
            <div className="flex items-center justify-center h-40">
              <div className="w-8 h-8 rounded-full border-4 border-tenzy-teal/30 border-t-tenzy-teal animate-spin" />
            </div>
          )}
          {!loading && detail && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                {[
                  { label: "Total Approved", value: detail.totalApprovedQuantity, color: "text-emerald-600" },
                  { label: "Total Received", value: detail.totalReceivedQuantity, color: "text-blue-600" },
                  { label: "Total Missing", value: detail.totalMissingQuantity, color: "text-amber-600" },
                  { label: "Total Damaged", value: detail.totalDamagedQuantity, color: "text-red-600" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="rounded-2xl bg-slate-50 p-4 text-center">
                    <p className={`text-2xl font-bold ${color}`}>{value ?? 0}</p>
                    <p className="text-xs text-slate-500 mt-1">{label}</p>
                  </div>
                ))}
              </div>
              {(detail.items ?? []).length > 0 ? (
                <div className="overflow-x-auto rounded-2xl border border-slate-200">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide">
                      <tr>
                        <th className="text-left px-4 py-3">Product</th>
                        <th className="text-right px-4 py-3">Dispatched</th>
                        <th className="text-right px-4 py-3">Received</th>
                        <th className="text-right px-4 py-3">Approved</th>
                        <th className="text-right px-4 py-3">Missing</th>
                        <th className="text-right px-4 py-3">Damaged</th>
                        <th className="text-center px-4 py-3">Pricing</th>
                        <th className="text-left px-4 py-3">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {detail.items.map((item) => (
                        <tr key={item.arrivalItemId ?? item.shipmentItemId} className="hover:bg-slate-50/60">
                          <td className="px-4 py-3">
                            <div className="flex items-center flex-wrap gap-0.5">
                              <span className="font-medium text-slate-800">{item.productName}</span>
                              <VariantTag item={item} />
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right text-slate-600">{item.quantityDispatched ?? "—"}</td>
                          <td className="px-4 py-3 text-right text-slate-600">{item.quantityReceived}</td>
                          <td className="px-4 py-3 text-right font-semibold text-emerald-600">{item.approvedQuantity}</td>
                          <td className="px-4 py-3 text-right text-amber-600">{item.missingQuantity}</td>
                          <td className="px-4 py-3 text-right text-red-600">{item.damagedQuantity}</td>
                          <td className="px-4 py-3 text-center">
                            {item.approvedForPricing
                              ? <span className="rounded-full bg-emerald-100 text-emerald-700 text-xs px-2 py-0.5 font-semibold">Yes</span>
                              : <span className="rounded-full bg-slate-100 text-slate-500 text-xs px-2 py-0.5">No</span>}
                          </td>
                          <td className="px-4 py-3 text-slate-500 text-xs max-w-40 truncate">{item.notes || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-slate-400 text-center py-10">No items recorded for this arrival.</p>
              )}
            </>
          )}
          {!loading && !detail && (
            <p className="text-sm text-slate-400 text-center py-10">Could not load arrival details.</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Tab: Verify arrival ──────────────────────────────────────────────────────

function VerifyTab({ shipments, arrivals, onSaved }) {
  const [selectedShipment, setSelectedShipment] = useState(null);
  const [form, setForm]           = useState(emptyForm);
  const [saving, setSaving]       = useState(false);
  const [itemPhotos, setItemPhotos]     = useState({});
  const [uploadingPhotoId, setUploadingPhotoId] = useState(null);
  const [openBox, setOpenBox]     = useState(null);  // which box is currently open
  const [checkedBoxes, setCheckedBoxes] = useState(new Set()); // boxes user has confirmed

  const verifiedShipmentIds = useMemo(
    () => new Set((arrivals ?? []).map((a) => String(a.shipmentId))),
    [arrivals]
  );
  const availableShipments = useMemo(
    () => (shipments ?? [])
      .filter((s) => !verifiedShipmentIds.has(String(s.shipmentId)))
      .sort((a, b) => new Date(b.dispatchDate ?? 0) - new Date(a.dispatchDate ?? 0)),
    [shipments, verifiedShipmentIds]
  );

  // Group items by box
  const itemsByBox = useMemo(() => {
    if (!form.items.length) return [];
    const map = new Map();
    form.items.forEach((item, flatIndex) => {
      const key = item.boxNumber ?? 0;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push({ ...item, _flatIndex: flatIndex });
    });
    return [...map.entries()]
      .sort(([a], [b]) => a - b)
      .map(([boxNum, items]) => ({ boxNum, items }));
  }, [form.items]);

  const allBoxesChecked = itemsByBox.length > 0 && checkedBoxes.size === itemsByBox.length;

  // Mark all items in a box as received with no issues
  const markBoxAllOk = (boxNum) =>
    setForm((cur) => ({
      ...cur,
      items: cur.items.map((item) =>
        (item.boxNumber ?? 0) === boxNum
          ? { ...item, quantityReceived: item.quantityDispatched,
              missingQuantity: 0, extraQuantity: 0, damagedQuantity: 0 }
          : item
      ),
    }));

  // Confirm a box is done → auto-open the next unchecked box
  const confirmBox = (boxNum) => {
    setCheckedBoxes((prev) => new Set([...prev, boxNum]));
    setOpenBox(null);
    // Find next unchecked box and open it
    const nextBox = itemsByBox.find(({ boxNum: n }) => n !== boxNum && !checkedBoxes.has(n));
    if (nextBox) setTimeout(() => setOpenBox(nextBox.boxNum), 150);
  };

  // Re-open a checked box to edit it
  const reopenBox = (boxNum) => {
    setCheckedBoxes((prev) => { const n = new Set(prev); n.delete(boxNum); return n; });
    setOpenBox(boxNum);
  };

  const handleDamagePhotoUpload = async (shipmentItemId, file) => {
    if (!file) return;
    setUploadingPhotoId(shipmentItemId);
    try {
      const url = await uploadApi.uploadImage(file);
      setItemPhotos((prev) => ({ ...prev, [shipmentItemId]: [...(prev[shipmentItemId] ?? []), url] }));
    } catch (err) {
      alert(err.message || "Photo upload failed.");
    } finally {
      setUploadingPhotoId(null);
    }
  };

  const removeDamagePhoto = (shipmentItemId, url) =>
    setItemPhotos((prev) => ({ ...prev, [shipmentItemId]: (prev[shipmentItemId] ?? []).filter((u) => u !== url) }));

  const chooseShipment = async (shipmentId) => {
    if (!shipmentId) {
      setSelectedShipment(null); setForm(emptyForm); setItemPhotos({});
      setOpenBox(null); setCheckedBoxes(new Set());
      return;
    }
    const detail = await supplyChainApi.getDispatchById(shipmentId);
    setSelectedShipment(detail);
    setCheckedBoxes(new Set());

    const items = (detail.items ?? []).map((item) => ({
      shipmentItemId:   item.shipmentItemId,
      boxNumber:        item.boxNumber ?? null,
      productName:      item.productName,
      variantName:      item.variantName ?? item.VariantName ?? null,
      brandName:        item.brandName ?? "",
      quantityDispatched: item.quantityDispatched,
      quantityReceived: item.quantityDispatched,
      approvedQuantity: item.quantityDispatched,
      missingQuantity:  0,
      extraQuantity:    0,
      damagedQuantity:  0,
      approvedForPricing: false,
      notes: "",
      volume:           item.volume       ?? item.Volume       ?? null,
      weight:           item.weight       ?? item.Weight       ?? null,
      tabletCount:      item.tabletCount  ?? item.TabletCount  ?? null,
      showVolume:       item.showVolume   ?? item.ShowVolume   ?? false,
      showWeight:       item.showWeight   ?? item.ShowWeight   ?? false,
      showTabletCount:  item.showTabletCount ?? item.ShowTabletCount ?? false,
    }));

    setForm({
      shipmentId,
      verificationDate: new Date().toISOString().slice(0, 10),
      verificationStatus: "received",
      notes: "",
      items,
    });

    // Auto-open the first box
    const firstBoxNum = items[0]?.boxNumber ?? 0;
    setTimeout(() => setOpenBox(firstBoxNum), 100);
  };

  const updateItem = (flatIndex, key, rawValue) =>
    setForm((cur) => ({
      ...cur,
      items: cur.items.map((entry, i) => {
        if (i !== flatIndex) return entry;
        const updated = { ...entry, [key]: rawValue };
        if (key === "quantityReceived") {
          updated.missingQuantity = Math.max(0, entry.quantityDispatched - (Number(rawValue) || 0));
        }
        return updated;
      }),
    }));

  const save = async () => {
    if (!form.shipmentId || form.items.length === 0 || saving) return;
    setSaving(true);
    try {
      await supplyChainApi.saveArrival({
        ...form,
        shipmentId: Number(form.shipmentId),
        verificationStatus: "received",
        verificationDate: `${form.verificationDate}T00:00:00`,
        items: form.items.map((item) => {
          const received = Number(item.quantityReceived) || 0;
          const damaged  = Number(item.damagedQuantity)  || 0;
          return {
            shipmentItemId:     item.shipmentItemId,
            quantityReceived:   received,
            approvedQuantity:   Math.max(0, received - damaged),
            missingQuantity:    Number(item.missingQuantity)  || 0,
            extraQuantity:      Number(item.extraQuantity)    || 0,
            damagedQuantity:    damaged,
            approvedForPricing: false,
            notes:              item.notes,
            damagedPhotos:      itemPhotos[item.shipmentItemId] ?? [],
          };
        }),
      });
      setForm(emptyForm); setSelectedShipment(null); setItemPhotos({});
      setOpenBox(null); setCheckedBoxes(new Set());
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  const boxHasIssues = (items) =>
    items.some((i) => Number(i.missingQuantity) > 0 || Number(i.damagedQuantity) > 0);

  const totalDispatched = form.items.reduce((s, i) => s + i.quantityDispatched, 0);
  const totalReceived   = form.items.reduce((s, i) => s + (Number(i.quantityReceived) || 0), 0);
  const totalMissing    = form.items.reduce((s, i) => s + (Number(i.missingQuantity)  || 0), 0);
  const totalDamaged    = form.items.reduce((s, i) => s + (Number(i.damagedQuantity)  || 0), 0);

  return (
    <div className="space-y-5">

      {/* ── Shipment picker + date ── */}
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2">
            <Label>Shipment — only unverified parcels shown</Label>
            <Select value={form.shipmentId} onChange={(e) => chooseShipment(e.target.value)}>
              <option value="">Select shipment…</option>
              {availableShipments.map((s) => (
                <option key={s.shipmentId} value={s.shipmentId}>
                  {s.dispatchReference} · {s.parcelNumber}
                </option>
              ))}
            </Select>
            {availableShipments.length === 0 && (
              <p className="mt-1 text-xs text-slate-400">All dispatched shipments have been verified.</p>
            )}
          </div>
          <div>
            <Label>Verification date</Label>
            <Input type="date" value={form.verificationDate}
              onChange={(e) => setForm({ ...form, verificationDate: e.target.value })} />
          </div>
          <div className="flex items-end">
            <div className="w-full rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs font-semibold text-emerald-700 flex items-center gap-1.5">
              <CheckCircle size={13} /> Saved as <em>Received</em>
            </div>
          </div>
          <div className="sm:col-span-2 lg:col-span-4">
            <Label>Arrival notes</Label>
            <textarea rows={2} value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-tenzy-teal focus:ring-2 focus:ring-tenzy-teal/20"
              placeholder="Damage, customs, branch handling notes…" />
          </div>
        </div>
      </div>

      {/* ── Empty state ── */}
      {!form.shipmentId && (
        <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-white p-14 text-center">
          <PackageSearch size={36} className="mx-auto mb-3 text-slate-300" />
          <p className="font-semibold text-slate-600">Select a shipment above</p>
          <p className="mt-1 text-sm text-slate-400">Boxes will appear one by one for verification.</p>
        </div>
      )}

      {/* ── Progress header ── */}
      {itemsByBox.length > 0 && (
        <div className={`rounded-2xl px-5 py-4 border flex flex-wrap items-center gap-4 transition-colors ${
          allBoxesChecked ? "bg-emerald-50 border-emerald-200" : "bg-slate-50 border-slate-200"
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${allBoxesChecked ? "bg-emerald-500" : "bg-tenzy-teal"}`}>
              <Archive size={18} className="text-white" />
            </div>
            <div>
              <p className="font-bold text-slate-900 text-sm">
                {checkedBoxes.size} of {itemsByBox.length} box{itemsByBox.length !== 1 ? "es" : ""} verified
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                {totalDispatched} dispatched · {totalReceived} received
                {totalMissing > 0 && <span className="text-amber-600 font-semibold"> · {totalMissing} missing</span>}
                {totalDamaged > 0 && <span className="text-red-600 font-semibold"> · {totalDamaged} damaged</span>}
              </p>
            </div>
          </div>

          {/* Step pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {itemsByBox.map(({ boxNum }, idx) => {
              const done    = checkedBoxes.has(boxNum);
              const current = openBox === boxNum;
              return (
                <button key={boxNum} onClick={() => done ? reopenBox(boxNum) : setOpenBox(current ? null : boxNum)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition border ${
                    done    ? "bg-emerald-500 text-white border-emerald-500" :
                    current ? "bg-tenzy-teal text-white border-tenzy-teal" :
                              "bg-white text-slate-400 border-slate-200 hover:border-slate-400"
                  }`}>
                  {done ? <CheckCircle size={10} /> : <span className="w-2.5 h-2.5 rounded-full border-2 border-current inline-block" />}
                  {boxNum > 0 ? `Box ${boxNum}` : `Group ${idx + 1}`}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Box cards ── */}
      {itemsByBox.map(({ boxNum, items: boxItems }, boxIdx) => {
        const isOpen    = openBox === boxNum;
        const isChecked = checkedBoxes.has(boxNum);
        const hasIssues = boxHasIssues(boxItems);
        const boxLabel  = boxNum > 0 ? `Box ${boxNum}` : "Shipment Items";
        const boxUnits  = boxItems.reduce((s, i) => s + i.quantityDispatched, 0);
        const boxMissing = boxItems.reduce((s, i) => s + (Number(i.missingQuantity) || 0), 0);
        const boxDamaged = boxItems.reduce((s, i) => s + (Number(i.damagedQuantity) || 0), 0);

        return (
          <div key={boxNum} className={`rounded-3xl border-2 overflow-hidden shadow-sm transition-all ${
            isChecked && hasIssues ? "border-amber-300" :
            isChecked             ? "border-emerald-300" :
            isOpen                ? "border-tenzy-teal" : "border-slate-200"
          }`}>

            {/* ── Box header ── */}
            <div className={`flex items-center gap-4 px-5 py-4 transition ${
              isChecked && hasIssues ? "bg-amber-50" :
              isChecked             ? "bg-emerald-50" :
              isOpen                ? "bg-teal-50/40" : "bg-white"
            }`}>
              {/* Icon + number */}
              <div className={`shrink-0 w-14 h-14 rounded-2xl border shadow-sm flex flex-col items-center justify-center transition ${
                isChecked ? "bg-emerald-500 border-emerald-400" :
                isOpen    ? "bg-tenzy-teal border-tenzy-teal" : "bg-white border-slate-200"
              }`}>
                {isChecked
                  ? <CheckCircle size={20} className="text-white" />
                  : <><Archive size={16} className={isOpen ? "text-white" : "text-tenzy-teal"} />
                     <span className={`text-[9px] font-bold leading-none mt-0.5 ${isOpen ? "text-white" : "text-slate-600"}`}>
                       {boxNum > 0 ? `BOX ${boxNum}` : `GRP ${boxIdx + 1}`}
                     </span></>
                }
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-base font-bold text-slate-900">{boxLabel}</p>
                  {isChecked && (
                    <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${hasIssues ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
                      {hasIssues ? "Verified · has issues" : "Verified ✓"}
                    </span>
                  )}
                  {!isChecked && isOpen && (
                    <span className="rounded-full bg-teal-100 text-teal-700 px-2.5 py-0.5 text-[10px] font-bold">Verifying…</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-3 mt-1 text-xs text-slate-500">
                  <span>{boxItems.length} product{boxItems.length !== 1 ? "s" : ""}</span>
                  <span>·</span>
                  <span>{boxUnits} units</span>
                  {boxMissing > 0 && <span className="text-amber-600 font-semibold">· {boxMissing} missing</span>}
                  {boxDamaged > 0 && <span className="text-red-600 font-semibold">· {boxDamaged} damaged</span>}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0">
                {isChecked ? (
                  <button onClick={() => reopenBox(boxNum)}
                    className="rounded-xl bg-white border border-slate-200 px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 hover:border-tenzy-teal hover:text-tenzy-teal transition">
                    Edit
                  </button>
                ) : (
                  <button onClick={() => { markBoxAllOk(boxNum); }}
                    className="flex items-center gap-1 rounded-xl bg-white border border-emerald-200 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-50 transition shadow-sm">
                    <CheckCircle size={11} /> All OK
                  </button>
                )}
                <button onClick={() => isChecked ? reopenBox(boxNum) : setOpenBox(isOpen ? null : boxNum)}
                  className={`w-8 h-8 rounded-xl flex items-center justify-center transition ${
                    isOpen ? "bg-tenzy-teal text-white" : "bg-white border border-slate-200 text-slate-400"
                  }`}>
                  {isOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                </button>
              </div>
            </div>

            {/* ── Products (open only) ── */}
            {isOpen && (
              <div className="bg-white border-t border-slate-100">
                {/* Column headers */}
                <div className="grid grid-cols-[1fr_72px_72px_72px] gap-2 px-5 py-2.5 bg-slate-50 border-b border-slate-100">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Product</p>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide text-center">Received</p>
                  <p className="text-[10px] font-bold text-amber-500 uppercase tracking-wide text-center">Missing</p>
                  <p className="text-[10px] font-bold text-red-500 uppercase tracking-wide text-center">Damaged</p>
                </div>

                <div className="divide-y divide-slate-50">
                  {boxItems.map((item) => {
                    const flatIdx    = item._flatIndex;
                    const hasDamage  = Number(item.damagedQuantity) > 0;
                    const hasMissing = Number(item.missingQuantity) > 0;

                    return (
                      <div key={item.shipmentItemId}
                        className={`px-5 py-3 ${hasDamage ? "bg-red-50/40" : hasMissing ? "bg-amber-50/40" : ""}`}>

                        <div className="grid grid-cols-[1fr_72px_72px_72px] gap-2 items-center">
                          <div className="min-w-0 pr-2">
                            <div className="flex items-center flex-wrap gap-1">
                              <p className="font-semibold text-slate-800 text-sm truncate">{item.productName}</p>
                              <VariantTag item={item} />
                            </div>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              {item.brandName && `${item.brandName} · `}
                              Dispatched: <strong className="text-slate-600">{item.quantityDispatched}</strong>
                            </p>
                          </div>

                          <input type="number" min="0" value={item.quantityReceived}
                            onChange={(e) => updateItem(flatIdx, "quantityReceived", e.target.value)}
                            className={`w-full rounded-xl border px-1 py-1.5 text-sm text-center outline-none transition focus:ring-2 focus:ring-tenzy-teal/20
                              ${Number(item.quantityReceived) < item.quantityDispatched
                                ? "border-amber-300 bg-amber-50 focus:border-amber-400"
                                : "border-slate-200 bg-slate-50 focus:border-tenzy-teal"}`}
                          />

                          <input type="number" min="0" value={item.missingQuantity}
                            onChange={(e) => updateItem(flatIdx, "missingQuantity", e.target.value)}
                            className={`w-full rounded-xl border px-1 py-1.5 text-sm text-center outline-none transition focus:ring-2
                              ${Number(item.missingQuantity) > 0
                                ? "border-amber-300 bg-amber-50 focus:border-amber-400 focus:ring-amber-200/40"
                                : "border-slate-200 bg-slate-50 focus:border-tenzy-teal focus:ring-tenzy-teal/20"}`}
                          />

                          <input type="number" min="0" value={item.damagedQuantity}
                            onChange={(e) => updateItem(flatIdx, "damagedQuantity", e.target.value)}
                            className={`w-full rounded-xl border px-1 py-1.5 text-sm text-center outline-none transition focus:ring-2
                              ${Number(item.damagedQuantity) > 0
                                ? "border-red-300 bg-red-50 focus:border-red-400 focus:ring-red-200/40"
                                : "border-slate-200 bg-slate-50 focus:border-tenzy-teal focus:ring-tenzy-teal/20"}`}
                          />
                        </div>

                        <div className="mt-2">
                          <input type="text" value={item.notes}
                            onChange={(e) => updateItem(flatIdx, "notes", e.target.value)}
                            placeholder="Notes for this item…"
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs outline-none transition focus:border-tenzy-teal focus:ring-1 focus:ring-tenzy-teal/20"
                          />
                        </div>
                        {hasDamage && (
                          <DamagePhotoUploader
                            itemId={item.shipmentItemId}
                            photos={itemPhotos[item.shipmentItemId] ?? []}
                            uploading={uploadingPhotoId === item.shipmentItemId}
                            onCamera={(file) => handleDamagePhotoUpload(item.shipmentItemId, file)}
                            onGallery={(file) => handleDamagePhotoUpload(item.shipmentItemId, file)}
                            onRemove={(url) => removeDamagePhoto(item.shipmentItemId, url)}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* ── Confirm this box button ── */}
                <div className="px-5 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
                  <p className="text-xs text-slate-500">
                    {boxItems.length} product{boxItems.length !== 1 ? "s" : ""} checked
                    {boxHasIssues(boxItems) && <span className="text-amber-600 font-semibold"> · issues recorded</span>}
                  </p>
                  <button
                    onClick={() => confirmBox(boxNum)}
                    className="flex items-center gap-2 px-4 py-2 bg-tenzy-teal text-white text-xs font-bold rounded-xl hover:opacity-90 transition shadow-sm"
                  >
                    <CheckCircle size={13} />
                    {boxIdx < itemsByBox.length - 1 ? `Done — go to Box ${itemsByBox[boxIdx + 1]?.boxNum ?? "next"}` : "Done — all boxes checked"}
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* ── Save — only enabled when all boxes confirmed ── */}
      {form.items.length > 0 && (
        <div className="space-y-2">
          {!allBoxesChecked && (
            <p className="text-center text-xs text-slate-400">
              Verify all {itemsByBox.length} boxes to enable saving
              ({checkedBoxes.size}/{itemsByBox.length} done)
            </p>
          )}
          <button onClick={save} disabled={saving || !allBoxesChecked}
            className={`w-full rounded-2xl px-4 py-3.5 text-sm font-bold text-white transition ${
              allBoxesChecked ? "bg-tenzy-teal hover:opacity-90" : "bg-slate-300 cursor-not-allowed"
            }`}>
            {saving
              ? "Saving verification…"
              : allBoxesChecked
                ? `Save arrival verification — ${itemsByBox.length} box${itemsByBox.length !== 1 ? "es" : ""}, ${form.items.length} products`
                : `Verify all boxes first (${checkedBoxes.size}/${itemsByBox.length} done)`}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Tab: Missing items ───────────────────────────────────────────────────────
function MissingTab({ arrivals, allArrivalDetails }) {
  const missingItems = useMemo(() => {
    const rows = [];
    allArrivalDetails.forEach((detail) => {
      (detail.items ?? []).forEach((item) => {
        if ((item.missingQuantity ?? 0) > 0) {
          rows.push({
            ...item,
            dispatchReference: detail.dispatchReference,
            verificationDate: detail.verificationDate,
            arrivalVerificationId: detail.arrivalVerificationId,
          });
        }
      });
    });
    return rows;
  }, [allArrivalDetails]);

  if (missingItems.length === 0) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-10 shadow-sm text-center">
        <CheckCircle size={32} className="text-emerald-400 mx-auto mb-3" />
        <p className="font-semibold text-slate-700">No missing items recorded</p>
        <p className="mt-1 text-sm text-slate-400">All verified arrivals had no missing quantities.</p>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle size={16} className="text-amber-500" />
        <h2 className="text-lg font-bold text-slate-900">Missing items across all arrivals</h2>
        <span className="ml-auto rounded-full bg-amber-100 text-amber-700 px-3 py-0.5 text-xs font-semibold">{missingItems.length} item(s)</span>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide">
            <tr>
              <th className="text-left px-4 py-3">Dispatch</th>
              <th className="text-left px-4 py-3">Product</th>
              <th className="text-right px-4 py-3">Dispatched</th>
              <th className="text-right px-4 py-3">Received</th>
              <th className="text-right px-4 py-3">Missing</th>
              <th className="text-left px-4 py-3">Date</th>
              <th className="text-left px-4 py-3">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {missingItems.map((item, i) => (
              <tr key={`${item.arrivalItemId}-${i}`} className="hover:bg-amber-50/40">
                <td className="px-4 py-3 font-medium text-slate-700">{item.dispatchReference}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center flex-wrap gap-1">
                    <span className="font-semibold text-slate-800">{item.productName}</span>
                    <VariantTag item={item} />
                  </div>
                </td>
                <td className="px-4 py-3 text-right text-slate-600">{item.quantityDispatched ?? "—"}</td>
                <td className="px-4 py-3 text-right text-slate-600">{item.quantityReceived}</td>
                <td className="px-4 py-3 text-right font-bold text-amber-600">{item.missingQuantity}</td>
                <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                  {item.verificationDate ? new Date(item.verificationDate).toLocaleDateString("en-GB") : "—"}
                </td>
                <td className="px-4 py-3 text-slate-500 text-xs max-w-40 truncate">{item.notes || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Tab: Arrival Approval ────────────────────────────────────────────────────
function ApprovalTab({ allArrivalDetails, onRefresh }) {
  const [approving, setApproving]       = useState(new Set()); // arrivalVerificationIds in progress
  const [openArrival, setOpenArrival]   = useState(null);      // one arrival expanded at a time
  const [openBox, setOpenBox]           = useState(null);      // { arrivalId, boxNum }

  // Build a localApproved set so UI updates instantly before refresh
  const [localApproved, setLocalApproved] = useState(() => {
    const s = new Set();
    allArrivalDetails.forEach((d) => (d.items ?? []).forEach((i) => { if (i.approvedForPricing) s.add(i.arrivalItemId); }));
    return s;
  });

  const isApproved = (arrivalItemId) => localApproved.has(arrivalItemId);

  const doApprove = async (arrivalVerificationId, itemIds = null) => {
    if (approving.has(arrivalVerificationId)) return;
    setApproving((prev) => new Set([...prev, arrivalVerificationId]));
    try {
      await supplyChainApi.approveArrivalItems(
        arrivalVerificationId,
        itemIds ? { arrivalItemIds: itemIds } : {}
      );
      // Optimistically mark approved
      const detail = allArrivalDetails.find((d) => d.arrivalVerificationId === arrivalVerificationId);
      const toApprove = itemIds
        ? (detail?.items ?? []).filter((i) => itemIds.includes(i.arrivalItemId)).map((i) => i.arrivalItemId)
        : (detail?.items ?? []).map((i) => i.arrivalItemId);
      setLocalApproved((prev) => new Set([...prev, ...toApprove]));
      onRefresh();
    } catch (err) {
      alert(err.message || "Approval failed.");
    } finally {
      setApproving((prev) => { const n = new Set(prev); n.delete(arrivalVerificationId); return n; });
    }
  };

  // Group items within an arrival by boxNumber
  const groupByBox = (items) => {
    const map = new Map();
    (items ?? []).forEach((item) => {
      const k = item.boxNumber ?? 0;
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(item);
    });
    return [...map.entries()].sort(([a], [b]) => a - b).map(([boxNum, items]) => ({ boxNum, items }));
  };

  // Arrivals that have at least one item pending approval
  const pendingArrivals = useMemo(() =>
    allArrivalDetails.filter((d) => (d.items ?? []).some((i) => !isApproved(i.arrivalItemId)))
  , [allArrivalDetails, localApproved]); // eslint-disable-line react-hooks/exhaustive-deps

  if (allArrivalDetails.length === 0) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-10 shadow-sm text-center">
        <BadgeCheck size={32} className="text-slate-300 mx-auto mb-3" />
        <p className="font-semibold text-slate-700">No verified arrivals yet</p>
        <p className="mt-1 text-sm text-slate-400">Verify arrivals first, then approve them here.</p>
      </div>
    );
  }

  if (pendingArrivals.length === 0) {
    return (
      <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-10 shadow-sm text-center">
        <CheckCircle size={32} className="text-emerald-500 mx-auto mb-3" />
        <p className="font-semibold text-emerald-800">All arrivals approved</p>
        <p className="mt-1 text-sm text-emerald-600">Every item is approved and eligible for pricing.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-indigo-50 border border-indigo-200 px-4 py-3 flex items-center gap-2">
        <CheckSquare size={14} className="text-indigo-500 shrink-0" />
        <p className="text-xs text-indigo-700">
          <strong>{pendingArrivals.length} arrival{pendingArrivals.length !== 1 ? "s" : ""} pending approval.</strong>
          {" "}Open each arrival, review the boxes and products, then approve to make items eligible for pricing.
        </p>
      </div>

      {pendingArrivals.map((detail) => {
        const arrivalId   = detail.arrivalVerificationId;
        const isOpen      = openArrival === arrivalId;
        const isApproving = approving.has(arrivalId);
        const boxes       = groupByBox(detail.items);
        const totalItems  = (detail.items ?? []).length;
        const approvedCount = (detail.items ?? []).filter((i) => isApproved(i.arrivalItemId)).length;
        const pendingCount  = totalItems - approvedCount;
        const allDone       = pendingCount === 0;

        return (
          <div key={arrivalId} className={`rounded-3xl border-2 overflow-hidden shadow-sm ${allDone ? "border-emerald-300" : "border-indigo-200"}`}>

            {/* ── Arrival header ── */}
            <button
              onClick={() => setOpenArrival(isOpen ? null : arrivalId)}
              className={`w-full text-left px-5 py-4 flex items-center gap-4 transition hover:brightness-[0.98] ${allDone ? "bg-emerald-50" : "bg-white"}`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-bold text-slate-900 text-sm">{detail.dispatchReference}</p>
                  <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${allDone ? "bg-emerald-100 text-emerald-700" : "bg-indigo-100 text-indigo-700"}`}>
                    {allDone ? "All approved" : `${pendingCount} pending`}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {new Date(detail.verificationDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                  {" · "}{boxes.length} box{boxes.length !== 1 ? "es" : ""}
                  {" · "}{totalItems} product{totalItems !== 1 ? "s" : ""}
                  {(detail.totalMissingQuantity ?? 0) > 0 && <span className="text-amber-600 font-semibold"> · {detail.totalMissingQuantity} missing</span>}
                  {(detail.totalDamagedQuantity ?? 0) > 0 && <span className="text-red-600 font-semibold"> · {detail.totalDamagedQuantity} damaged</span>}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {!allDone && (
                  <button
                    onClick={(e) => { e.stopPropagation(); doApprove(arrivalId); }}
                    disabled={isApproving}
                    className="flex items-center gap-1.5 rounded-xl bg-indigo-600 text-white px-3 py-1.5 text-xs font-semibold hover:bg-indigo-700 disabled:opacity-60 transition shadow-sm"
                  >
                    <CheckCircle size={12} />
                    {isApproving ? "Approving…" : "Approve all"}
                  </button>
                )}
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${isOpen ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-400"}`}>
                  {isOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                </div>
              </div>
            </button>

            {/* ── Box list (expanded) ── */}
            {isOpen && (
              <div className="border-t border-slate-100 divide-y divide-slate-50 bg-slate-50/40">
                {boxes.map(({ boxNum, items: boxItems }) => {
                  const boxKey        = `${arrivalId}-${boxNum}`;
                  const isBoxOpen     = openBox === boxKey;
                  const boxPending    = boxItems.filter((i) => !isApproved(i.arrivalItemId)).length;
                  const boxLabel      = boxNum > 0 ? `Box ${boxNum}` : "Shipment Items";
                  const boxUnits      = boxItems.reduce((s, i) => s + i.quantityDispatched, 0);
                  const boxMissing    = boxItems.reduce((s, i) => s + (i.missingQuantity ?? 0), 0);
                  const boxDamaged    = boxItems.reduce((s, i) => s + (i.damagedQuantity ?? 0), 0);
                  const allBoxApproved = boxPending === 0;

                  return (
                    <div key={boxKey}>
                      {/* Box row */}
                      <button
                        onClick={() => setOpenBox(isBoxOpen ? null : boxKey)}
                        className="w-full flex items-center gap-3 px-5 py-3 hover:bg-white/80 transition text-left"
                      >
                        <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 shadow-sm flex flex-col items-center justify-center shrink-0">
                          <Archive size={13} className="text-tenzy-teal" />
                          <span className="text-[9px] font-bold text-slate-500 leading-none mt-0.5">
                            {boxNum > 0 ? `BOX ${boxNum}` : "ALL"}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-800">{boxLabel}</p>
                          <p className="text-[11px] text-slate-500">
                            {boxItems.length} product{boxItems.length !== 1 ? "s" : ""} · {boxUnits} units
                            {boxMissing > 0 && <span className="text-amber-600 font-semibold"> · {boxMissing} missing</span>}
                            {boxDamaged > 0 && <span className="text-red-600 font-semibold"> · {boxDamaged} damaged</span>}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {allBoxApproved
                            ? <span className="rounded-full bg-emerald-100 text-emerald-700 px-2.5 py-0.5 text-[10px] font-bold">Approved</span>
                            : (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const ids = boxItems.filter((i) => !isApproved(i.arrivalItemId)).map((i) => i.arrivalItemId);
                                  doApprove(arrivalId, ids);
                                }}
                                disabled={isApproving}
                                className="rounded-xl bg-white border border-indigo-200 text-indigo-700 px-2.5 py-1 text-[11px] font-semibold hover:bg-indigo-50 transition"
                              >
                                Approve box
                              </button>
                            )
                          }
                          {isBoxOpen ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                        </div>
                      </button>

                      {/* Product table inside box */}
                      {isBoxOpen && (
                        <div className="bg-white border-t border-slate-100">
                          {/* Table header */}
                          <div className="grid grid-cols-[1fr_60px_60px_60px_60px_90px] gap-2 px-5 py-2 bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                            <span>Product</span>
                            <span className="text-center">Sent</span>
                            <span className="text-center">Recv</span>
                            <span className="text-center text-amber-500">Miss</span>
                            <span className="text-center text-red-500">Dmg</span>
                            <span className="text-center">Status</span>
                          </div>
                          <div className="divide-y divide-slate-50">
                            {boxItems.map((item) => {
                              const approved = isApproved(item.arrivalItemId);
                              const hasDamage  = (item.damagedQuantity ?? 0) > 0;
                              const hasMissing = (item.missingQuantity  ?? 0) > 0;
                              const photos     = item.photos ?? [];

                              return (
                                <div key={item.arrivalItemId}
                                  className={`px-5 py-3 ${hasDamage ? "bg-red-50/40" : hasMissing ? "bg-amber-50/30" : ""}`}>

                                  <div className="grid grid-cols-[1fr_60px_60px_60px_60px_90px] gap-2 items-center">
                                    <div className="min-w-0">
                                      <div className="flex items-center flex-wrap gap-1">
                                        <p className="text-sm font-semibold text-slate-800 truncate">{item.productName}</p>
                                        <VariantTag item={item} />
                                      </div>
                                      <p className="text-[11px] text-slate-400">{item.brandName}</p>
                                    </div>
                                    <p className="text-sm text-center text-slate-600">{item.quantityDispatched}</p>
                                    <p className="text-sm text-center text-slate-600">{item.quantityReceived}</p>
                                    <p className={`text-sm text-center font-semibold ${hasMissing ? "text-amber-600" : "text-slate-400"}`}>{item.missingQuantity ?? 0}</p>
                                    <p className={`text-sm text-center font-semibold ${hasDamage ? "text-red-600" : "text-slate-400"}`}>{item.damagedQuantity ?? 0}</p>
                                    <div className="flex justify-center">
                                      {approved
                                        ? <span className="rounded-full bg-emerald-100 text-emerald-700 px-2 py-0.5 text-[10px] font-bold">✓ Approved</span>
                                        : (
                                          <button
                                            onClick={() => doApprove(arrivalId, [item.arrivalItemId])}
                                            disabled={isApproving}
                                            className="rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 px-2 py-1 text-[11px] font-semibold hover:bg-indigo-100 transition disabled:opacity-50"
                                          >
                                            Approve
                                          </button>
                                        )
                                      }
                                    </div>
                                  </div>

                                  {/* Notes */}
                                  {item.notes && (
                                    <p className="mt-1.5 text-[11px] text-slate-500 italic pl-0.5">{item.notes}</p>
                                  )}

                                  {/* Damage photos */}
                                  {photos.length > 0 && (
                                    <div className="mt-2 flex flex-wrap gap-2">
                                      {photos.map((url, pi) => (
                                        <a key={pi} href={url} target="_blank" rel="noreferrer"
                                          className="w-16 h-16 rounded-xl overflow-hidden border border-red-200 block hover:opacity-90 transition">
                                          <img src={url} alt={`damage ${pi + 1}`} className="w-full h-full object-cover" />
                                        </a>
                                      ))}
                                    </div>
                                  )}

                                  {/* Landed cost info for pricing context */}
                                  {item.landedUnitCost > 0 && (
                                    <p className="mt-1 text-[11px] text-slate-400">
                                      Landed cost: £{Number(item.landedUnitCost).toFixed(2)}/unit
                                    </p>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Tab: History ─────────────────────────────────────────────────────────────
function HistoryTab({ arrivals, onView }) {
  const sorted = useMemo(
    () => [...arrivals].sort((a, b) => new Date(b.verificationDate) - new Date(a.verificationDate)),
    [arrivals]
  );

  if (sorted.length === 0) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-10 shadow-sm text-center">
        <History size={32} className="text-slate-300 mx-auto mb-3" />
        <p className="font-semibold text-slate-700">No arrival history yet</p>
        <p className="mt-1 text-sm text-slate-400">Verified arrivals will appear here.</p>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <History size={16} className="text-indigo-500" />
        <h2 className="text-lg font-bold text-slate-900">Arrival history</h2>
        <span className="ml-auto text-xs text-slate-400">{sorted.length} records</span>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide">
            <tr>
              <th className="text-left px-4 py-3">Dispatch ref</th>
              <th className="text-left px-4 py-3">Verified</th>
              <th className="text-center px-4 py-3">Status</th>
              <th className="text-right px-4 py-3">Approved</th>
              <th className="text-right px-4 py-3">Missing</th>
              <th className="text-right px-4 py-3">Damaged</th>
              <th className="text-left px-4 py-3">Notes</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sorted.map((arrival) => (
              <tr key={arrival.arrivalVerificationId} className="hover:bg-slate-50/60">
                <td className="px-4 py-3 font-semibold text-slate-800">
                  <div className="flex items-center gap-2">
                    {arrival.dispatchReference}
                    {arrival === sorted[0] && (
                      <span className="rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5">Latest</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                  <div>
                    {new Date(arrival.verificationDate).toLocaleDateString("en-GB", {
                      day: "2-digit", month: "short", year: "numeric",
                    })}
                  </div>
                  <div className="text-xs text-slate-400">
                    {new Date(arrival.verificationDate).toLocaleTimeString("en-GB", {
                      hour: "2-digit", minute: "2-digit",
                    })}
                  </div>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${STATUS_COLORS[arrival.verificationStatus] ?? "bg-slate-100 text-slate-600"}`}>
                    {arrival.verificationStatus}
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-semibold text-emerald-600">{arrival.totalApprovedQuantity ?? 0}</td>
                <td className="px-4 py-3 text-right font-semibold text-amber-600">{arrival.totalMissingQuantity ?? 0}</td>
                <td className="px-4 py-3 text-right font-semibold text-red-600">{arrival.totalDamagedQuantity ?? 0}</td>
                <td className="px-4 py-3 text-slate-500 text-xs max-w-40 truncate">{arrival.notes || "—"}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => onView(arrival.arrivalVerificationId)}
                    className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:border-tenzy-teal hover:text-tenzy-teal transition"
                  >
                    <Eye size={12} /> View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Root component ───────────────────────────────────────────────────────────
const ALL_TABS = [
  { id: "verify",   label: "Verify Arrival",    icon: BadgeCheck,    superAdminOnly: false },
  { id: "approve",  label: "Arrival Approval",  icon: CheckSquare,   superAdminOnly: true  },
  { id: "missing",  label: "Missing Items",     icon: AlertTriangle, superAdminOnly: false },
  { id: "history",  label: "History",           icon: History,       superAdminOnly: false },
];

export default function ArrivalVerification() {
  // Belt-and-suspenders: check context AND localStorage directly
  const { isSuperAdmin: ctxSuperAdmin } = useAuth();
  const lsRoleId = (() => {
    try { return Number(JSON.parse(localStorage.getItem("authUser") || "{}")?.roleId ?? 0); } catch { return 0; }
  })();
  const isSuperAdmin = ctxSuperAdmin || lsRoleId === 3;

  const TABS = ALL_TABS.filter((t) => !t.superAdminOnly || isSuperAdmin);

  const [shipments, setShipments] = useState([]);
  const [arrivals, setArrivals] = useState([]);
  const [allArrivalDetails, setAllArrivalDetails] = useState([]);
  // Default to "verify"; if active tab is approval but user is not super admin, fall back
  const [activeTab, setActiveTab] = useState("verify");
  const [loading, setLoading] = useState(true);
  const [viewArrivalId, setViewArrivalId] = useState(null);

  const load = async () => {
    const [shipmentList, arrivalList] = await Promise.all([
      supplyChainApi.getDispatches(),
      supplyChainApi.getArrivals(),
    ]);
    const s = shipmentList ?? [];
    const a = arrivalList ?? [];
    setShipments(s);
    setArrivals(a);

    const details = await Promise.all(a.map((ar) => supplyChainApi.getArrivalById(ar.arrivalVerificationId)));
    setAllArrivalDetails(details.filter(Boolean));
  };

  useEffect(() => { load().finally(() => setLoading(false)); }, []);

  const missingCount = useMemo(
    () => allArrivalDetails.reduce((sum, d) => sum + (d.items ?? []).filter((i) => (i.missingQuantity ?? 0) > 0).length, 0),
    [allArrivalDetails]
  );

  const pendingApprovalCount = useMemo(
    () => allArrivalDetails.reduce((sum, d) => sum + (d.items ?? []).filter((i) => !i.approvedForPricing).length, 0),
    [allArrivalDetails]
  );

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
          <h1 className="text-2xl font-bold text-slate-900">Arrival Verification</h1>
          <p className="mt-1 text-sm text-slate-500">
            Step 1: Verify what arrived in each box. Step 2: Approve items to make them eligible for pricing.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-500">
          {arrivals.length} arrival{arrivals.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 rounded-2xl border border-slate-200 bg-slate-50 p-1">
        {TABS.map((tab) => {
          const Icon  = tab.icon;
          const badge = tab.id === "missing" ? missingCount : tab.id === "approve" ? pendingApprovalCount : 0;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                activeTab === tab.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <Icon size={14} className={
                tab.id === "approve"  ? "text-indigo-500" :
                tab.id === "missing"  ? "text-amber-500"  :
                tab.id === "history"  ? "text-indigo-500" : "text-tenzy-teal"
              } />
              <span className="hidden sm:inline">{tab.label}</span>
              {badge > 0 && (
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold text-white ${tab.id === "approve" ? "bg-indigo-500" : "bg-amber-500"}`}>
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {activeTab === "verify"  && <VerifyTab shipments={shipments} arrivals={arrivals} onSaved={() => load()} />}
      {activeTab === "approve" && isSuperAdmin && <ApprovalTab allArrivalDetails={allArrivalDetails} onRefresh={() => load()} />}
      {activeTab === "missing" && <MissingTab arrivals={arrivals} allArrivalDetails={allArrivalDetails} />}
      {activeTab === "history" && <HistoryTab arrivals={arrivals} onView={(id) => setViewArrivalId(id)} />}

      {viewArrivalId && (
        <ArrivalDetailDialog arrivalId={viewArrivalId} onClose={() => setViewArrivalId(null)} />
      )}
    </div>
  );
}
