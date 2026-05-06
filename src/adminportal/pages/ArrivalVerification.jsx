import React, { useEffect, useState, useMemo } from "react";
import {
  AlertTriangle, BadgeCheck, Camera, CheckCircle, Clock, Eye, History,
  Images, PackageSearch, Trash2, X,
} from "lucide-react";
import { supplyChainApi, uploadApi } from "../../services/api";

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
                          <td className="px-4 py-3 font-medium text-slate-800">{item.productName}</td>
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
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [itemPhotos, setItemPhotos] = useState({}); // { [shipmentItemId]: [url, ...] }
  const [uploadingPhotoId, setUploadingPhotoId] = useState(null);

  // Shipments that already have an arrival record — exclude from dropdown
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

  const handleDamagePhotoUpload = async (shipmentItemId, file) => {
    if (!file) return;
    setUploadingPhotoId(shipmentItemId);
    try {
      const url = await uploadApi.uploadImage(file);
      setItemPhotos((prev) => ({
        ...prev,
        [shipmentItemId]: [...(prev[shipmentItemId] ?? []), url],
      }));
    } catch (err) {
      alert(err.message || "Photo upload failed.");
    } finally {
      setUploadingPhotoId(null);
    }
  };

  const removeDamagePhoto = (shipmentItemId, url) => {
    setItemPhotos((prev) => ({
      ...prev,
      [shipmentItemId]: (prev[shipmentItemId] ?? []).filter((u) => u !== url),
    }));
  };

  const chooseShipment = async (shipmentId) => {
    if (!shipmentId) {
      setSelectedShipment(null);
      setForm(emptyForm);
      setItemPhotos({});
      return;
    }
    const detail = await supplyChainApi.getDispatchById(shipmentId);
    setSelectedShipment(detail);
    setForm({
      shipmentId,
      verificationDate: new Date().toISOString().slice(0, 10),
      verificationStatus: "received",
      notes: "",
      items: (detail.items ?? []).map((item) => ({
        shipmentItemId: item.shipmentItemId,
        productName: item.productName,
        quantityDispatched: item.quantityDispatched,
        quantityReceived: item.quantityDispatched,
        approvedQuantity: item.quantityDispatched,
        missingQuantity: 0,
        extraQuantity: 0,
        damagedQuantity: 0,
        approvedForPricing: true,
        notes: "",
      })),
    });
  };

  const updateItem = (index, key, value) =>
    setForm((cur) => ({
      ...cur,
      items: cur.items.map((entry, i) => (i === index ? { ...entry, [key]: value } : entry)),
    }));

  const save = async () => {
    if (!form.shipmentId || form.items.length === 0 || saving) return;
    setSaving(true);
    try {
      await supplyChainApi.saveArrival({
        ...form,
        shipmentId: Number(form.shipmentId),
        // status is always "received" on initial save
        verificationStatus: "received",
        verificationDate: `${form.verificationDate}T00:00:00`,
        items: form.items.map((item) => ({
          shipmentItemId: item.shipmentItemId,
          quantityReceived: Number(item.quantityReceived),
          approvedQuantity: Number(item.approvedQuantity),
          missingQuantity: Number(item.missingQuantity),
          extraQuantity: Number(item.extraQuantity),
          damagedQuantity: Number(item.damagedQuantity),
          approvedForPricing: !!item.approvedForPricing,
          notes: item.notes,
          damagedPhotos: itemPhotos[item.shipmentItemId] ?? [],
        })),
      });
      setForm(emptyForm);
      setSelectedShipment(null);
      setItemPhotos({});
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
      {/* Left: form */}
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <Label>Shipment — only unverified parcels shown</Label>
            <Select value={form.shipmentId} onChange={(e) => chooseShipment(e.target.value)}>
              <option value="">Select shipment</option>
              {availableShipments.map((s) => (
                <option key={s.shipmentId} value={s.shipmentId}>
                  {s.dispatchReference} · {s.parcelNumber}
                </option>
              ))}
            </Select>
            {availableShipments.length === 0 && (
              <p className="mt-1 text-xs text-slate-400">All dispatched shipments have already been verified.</p>
            )}
          </div>
          <div>
            <Label>Verification date</Label>
            <Input type="date" value={form.verificationDate} onChange={(e) => setForm({ ...form, verificationDate: e.target.value })} />
          </div>
          <div className="flex items-end">
            <div className="w-full rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 flex items-center gap-2">
              <CheckCircle size={14} /> Status will be saved as <em>Received</em>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <Label>Arrival notes</Label>
          <textarea
            rows={2}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-tenzy-teal focus:ring-2 focus:ring-tenzy-teal/20"
            placeholder="Damage details, customs note, or branch handling note"
          />
        </div>

        <div className="mt-6 space-y-4">
          {form.items.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-8">Select a shipment above to load its items.</p>
          )}
          {form.items.map((item, index) => (
            <div key={item.shipmentItemId} className="rounded-3xl bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-800">{item.productName}</p>
                  <p className="text-xs text-slate-500">Dispatched: {item.quantityDispatched}</p>
                </div>
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={item.approvedForPricing}
                    onChange={(e) => updateItem(index, "approvedForPricing", e.target.checked)}
                  />
                  Approve for pricing
                </label>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-4">
                {[
                  ["quantityReceived", "Received"],
                  ["approvedQuantity", "Approved"],
                  ["missingQuantity", "Missing"],
                  ["damagedQuantity", "Damaged"],
                ].map(([key, label]) => (
                  <div key={key}>
                    <Label>{label}</Label>
                    <Input
                      type="number"
                      min="0"
                      value={item[key]}
                      onChange={(e) => updateItem(index, key, e.target.value)}
                      className={`w-full rounded-2xl border px-3 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-tenzy-teal/20 ${
                        key === "damagedQuantity" && Number(item[key]) > 0
                          ? "border-red-300 bg-red-50 focus:border-red-400"
                          : key === "missingQuantity" && Number(item[key]) > 0
                          ? "border-amber-300 bg-amber-50 focus:border-amber-400"
                          : "border-slate-200 bg-slate-50 focus:border-tenzy-teal"
                      }`}
                    />
                  </div>
                ))}
              </div>

              {Number(item.damagedQuantity) > 0 && (
                <DamagePhotoUploader
                  itemId={item.shipmentItemId}
                  photos={itemPhotos[item.shipmentItemId] ?? []}
                  uploading={uploadingPhotoId === item.shipmentItemId}
                  onCamera={(file) => handleDamagePhotoUpload(item.shipmentItemId, file)}
                  onGallery={(file) => handleDamagePhotoUpload(item.shipmentItemId, file)}
                  onRemove={(url) => removeDamagePhoto(item.shipmentItemId, url)}
                />
              )}

              <div className="mt-3">
                <Label>Notes</Label>
                <Input value={item.notes} onChange={(e) => updateItem(index, "notes", e.target.value)} />
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={save}
          disabled={saving || !form.shipmentId || form.items.length === 0}
          className="mt-5 w-full rounded-2xl bg-tenzy-teal px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
        >
          {saving ? "Saving verification..." : "Save arrival verification"}
        </button>
      </div>

      {/* Right: shipment preview */}
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <PackageSearch size={16} className="text-indigo-500" />
          <h2 className="text-lg font-bold text-slate-900">Selected shipment</h2>
        </div>
        {!selectedShipment && (
          <p className="mt-4 text-sm text-slate-400">Choose a shipment to pull dispatched products into the verification form.</p>
        )}
        {selectedShipment && (
          <div className="mt-4 space-y-3">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="font-semibold text-slate-800">{selectedShipment.dispatchReference}</p>
              <p className="mt-1 text-xs text-slate-500">{selectedShipment.courierName} · {selectedShipment.parcelNumber}</p>
              <p className="mt-2 text-sm text-slate-600">{selectedShipment.totalQuantity} units dispatched</p>
            </div>
            {(selectedShipment.items ?? []).map((item) => (
              <div key={item.shipmentItemId} className="rounded-2xl border border-slate-200 p-3 text-sm">
                <p className="font-semibold text-slate-800">{item.productName}</p>
                <p className="text-xs text-slate-500">{item.brandName} · {item.quantityDispatched} units</p>
              </div>
            ))}
          </div>
        )}
      </div>
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
                <td className="px-4 py-3 font-semibold text-slate-800">{item.productName}</td>
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

// ── Tab: Damaged items ───────────────────────────────────────────────────────
function DamagedTab({ allArrivalDetails, onRefresh }) {
  const [approvingId, setApprovingId] = useState(null);
  const [uploadingId, setUploadingId] = useState(null);
  const [photos, setPhotos] = useState({});

  const damagedItems = useMemo(() => {
    const rows = [];
    allArrivalDetails.forEach((detail) => {
      (detail.items ?? []).forEach((item) => {
        if ((item.damagedQuantity ?? 0) > 0) {
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

  const handlePhotoUpload = async (arrivalItemId, file) => {
    if (!file) return;
    setUploadingId(arrivalItemId);
    try {
      const url = await uploadApi.uploadImage(file);
      setPhotos((prev) => ({
        ...prev,
        [arrivalItemId]: [...(prev[arrivalItemId] ?? []), url],
      }));
    } catch (err) {
      alert(err.message || "Photo upload failed.");
    } finally {
      setUploadingId(null);
    }
  };

  const removePhoto = (arrivalItemId, url) =>
    setPhotos((prev) => ({
      ...prev,
      [arrivalItemId]: (prev[arrivalItemId] ?? []).filter((u) => u !== url),
    }));

  const approveItem = async (item) => {
    if (approvingId === item.arrivalItemId) return;
    setApprovingId(item.arrivalItemId);
    try {
      await supplyChainApi.approveDamagedItem(item.arrivalItemId, {
        approvedForPricing: true,
        damagedPhotos: photos[item.arrivalItemId] ?? [],
        notes: item.notes,
      });
      onRefresh();
    } catch (err) {
      alert(err.message || "Approval failed.");
    } finally {
      setApprovingId(null);
    }
  };

  if (damagedItems.length === 0) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-10 shadow-sm text-center">
        <CheckCircle size={32} className="text-emerald-400 mx-auto mb-3" />
        <p className="font-semibold text-slate-700">No damaged items recorded</p>
        <p className="mt-1 text-sm text-slate-400">All verified arrivals had no damaged quantities.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 flex items-start gap-2">
        <AlertTriangle size={15} className="text-red-500 mt-0.5 shrink-0" />
        <p className="text-xs text-red-700">
          <strong>Damaged items are held off the website.</strong> Upload photos for documentation, then approve the items you are satisfied to sell. Stock count only increases after admin approval.
        </p>
      </div>

      {damagedItems.map((item) => {
        const itemPhotos = photos[item.arrivalItemId] ?? [];
        const isApproved = item.approvedForPricing && item.damagedQuantity > 0;

        return (
          <div
            key={item.arrivalItemId}
            className={`rounded-3xl border p-5 shadow-sm ${isApproved ? "border-emerald-200 bg-emerald-50/30" : "border-red-200 bg-white"}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-800">{item.productName}</p>
                <p className="mt-0.5 text-xs text-slate-500">{item.dispatchReference} · {item.brandName ?? ""}</p>
                <p className="mt-1 text-xs text-slate-500">
                  Verified: {item.verificationDate ? new Date(item.verificationDate).toLocaleDateString("en-GB") : "—"}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xl font-bold text-red-600">{item.damagedQuantity}</p>
                <p className="text-xs text-slate-500">damaged</p>
                {isApproved && (
                  <span className="mt-1 inline-block rounded-full bg-emerald-100 text-emerald-700 px-2 py-0.5 text-xs font-semibold">
                    Approved
                  </span>
                )}
                {!isApproved && (
                  <span className="mt-1 inline-block rounded-full bg-red-100 text-red-600 px-2 py-0.5 text-xs font-semibold">
                    Pending approval
                  </span>
                )}
              </div>
            </div>

            {/* Photo section */}
            <DamagePhotoUploader
              itemId={item.arrivalItemId}
              photos={photos[item.arrivalItemId] ?? []}
              uploading={uploadingId === item.arrivalItemId}
              onCamera={(file) => handlePhotoUpload(item.arrivalItemId, file)}
              onGallery={(file) => handlePhotoUpload(item.arrivalItemId, file)}
              onRemove={(url) => removePhoto(item.arrivalItemId, url)}
            />

            {item.notes && <p className="mt-3 text-xs text-slate-500 italic">{item.notes}</p>}

            {!isApproved && (
              <button
                onClick={() => approveItem(item)}
                disabled={approvingId === item.arrivalItemId}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 transition"
              >
                <CheckCircle size={13} />
                {approvingId === item.arrivalItemId ? "Approving..." : "Approve damaged items for stock"}
              </button>
            )}
            {isApproved && (
              <p className="mt-4 text-xs text-emerald-700 font-semibold flex items-center gap-1">
                <CheckCircle size={13} /> These damaged units have been approved and added to stock.
              </p>
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
const TABS = [
  { id: "verify", label: "Verify Arrival", icon: BadgeCheck },
  { id: "missing", label: "Missing Items", icon: AlertTriangle },
  { id: "damaged", label: "Damaged Items", icon: Trash2 },
  { id: "history", label: "History", icon: History },
];

export default function ArrivalVerification() {
  const [shipments, setShipments] = useState([]);
  const [arrivals, setArrivals] = useState([]);
  const [allArrivalDetails, setAllArrivalDetails] = useState([]);
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

    // Load full details for missing/damaged/history tabs
    const details = await Promise.all(a.map((ar) => supplyChainApi.getArrivalById(ar.arrivalVerificationId)));
    setAllArrivalDetails(details.filter(Boolean));
  };

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  const missingCount = useMemo(
    () => allArrivalDetails.reduce((sum, d) => sum + (d.items ?? []).filter((i) => (i.missingQuantity ?? 0) > 0).length, 0),
    [allArrivalDetails]
  );

  const pendingDamagedCount = useMemo(
    () => allArrivalDetails.reduce((sum, d) => sum + (d.items ?? []).filter((i) => (i.damagedQuantity ?? 0) > 0 && !i.approvedForPricing).length, 0),
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Arrival Verification</h1>
          <p className="mt-1 text-sm text-slate-500">Verify Sri Lanka arrivals against the UK dispatch, then release approved stock to the products page.</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-500">
          {arrivals.length} verified arrivals
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 rounded-2xl border border-slate-200 bg-slate-50 p-1">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const badge = tab.id === "missing" ? missingCount : tab.id === "damaged" ? pendingDamagedCount : 0;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                activeTab === tab.id
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <Icon size={14} className={
                tab.id === "missing" ? "text-amber-500" :
                tab.id === "damaged" ? "text-red-500" :
                tab.id === "history" ? "text-indigo-500" : "text-tenzy-teal"
              } />
              <span className="hidden sm:inline">{tab.label}</span>
              {badge > 0 && (
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold text-white ${tab.id === "damaged" ? "bg-red-500" : "bg-amber-500"}`}>
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {activeTab === "verify" && (
        <VerifyTab
          shipments={shipments}
          arrivals={arrivals}
          onSaved={() => load()}
        />
      )}
      {activeTab === "missing" && (
        <MissingTab arrivals={arrivals} allArrivalDetails={allArrivalDetails} />
      )}
      {activeTab === "damaged" && (
        <DamagedTab allArrivalDetails={allArrivalDetails} onRefresh={() => load()} />
      )}
      {activeTab === "history" && (
        <HistoryTab arrivals={arrivals} onView={(id) => setViewArrivalId(id)} />
      )}

      {viewArrivalId && (
        <ArrivalDetailDialog arrivalId={viewArrivalId} onClose={() => setViewArrivalId(null)} />
      )}
    </div>
  );
}
