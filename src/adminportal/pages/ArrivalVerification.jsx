import React, { useEffect, useState } from "react";
import { BadgeCheck, PackageSearch, X, Eye } from "lucide-react";
import { supplyChainApi } from "../../services/api";

const emptyForm = {
  shipmentId: "",
  verificationDate: new Date().toISOString().slice(0, 10),
  verificationStatus: "received",
  notes: "",
  items: [],
};

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

const Label = ({ children }) => <label className="mb-1 block text-xs font-semibold text-slate-500">{children}</label>;

const STATUS_COLORS = {
  completed: "bg-emerald-100 text-emerald-700",
  received:  "bg-blue-100 text-blue-700",
  issue:     "bg-red-100 text-red-700",
};

function ArrivalDetailDialog({ arrivalId, onClose }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supplyChainApi.getArrivalById(arrivalId)
      .then(setDetail)
      .finally(() => setLoading(false));
  }, [arrivalId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-3">
            <BadgeCheck size={20} className="text-emerald-500" />
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {detail ? detail.dispatchReference : "Arrival Detail"}
              </h2>
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
            <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-500">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading && (
            <div className="flex items-center justify-center h-40">
              <div className="w-8 h-8 rounded-full border-4 border-tenzy-teal/30 border-t-tenzy-teal animate-spin" />
            </div>
          )}

          {!loading && detail && (
            <>
              {/* Summary cards */}
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

              {/* Items table */}
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
                              : <span className="rounded-full bg-slate-100 text-slate-500 text-xs px-2 py-0.5">No</span>
                            }
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

export default function ArrivalVerification() {
  const [shipments, setShipments] = useState([]);
  const [arrivals, setArrivals] = useState([]);
  const [selectedShipment, setSelectedShipment] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [viewArrivalId, setViewArrivalId] = useState(null);

  useEffect(() => {
    Promise.allSettled([
      supplyChainApi.getDispatches(),
      supplyChainApi.getArrivals(),
    ]).then(([shipmentList, arrivalList]) => {
      if (shipmentList.status === "fulfilled") setShipments(shipmentList.value ?? []);
      if (arrivalList.status === "fulfilled") setArrivals(arrivalList.value ?? []);
    }).finally(() => setLoading(false));
  }, []);

  const chooseShipment = async (shipmentId) => {
    if (!shipmentId) {
      setSelectedShipment(null);
      setForm(emptyForm);
      return;
    }
    const detail = await supplyChainApi.getDispatchById(shipmentId);
    setSelectedShipment(detail);
    setForm((current) => ({
      ...current,
      shipmentId,
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
    }));
  };

  const saveArrival = async () => {
    if (!form.shipmentId || form.items.length === 0 || saving) return;
    setSaving(true);
    try {
      await supplyChainApi.saveArrival({
        ...form,
        shipmentId: Number(form.shipmentId),
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
        })),
      });
      setArrivals(await supplyChainApi.getArrivals());
      setForm(emptyForm);
      setSelectedShipment(null);
    } finally {
      setSaving(false);
    }
  };

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
          <p className="mt-1 text-sm text-slate-500">Verify Sri Lanka arrivals against the UK dispatch, then release approved stock to the products page.</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-500">
          {arrivals.length} verified arrivals
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <Label>Shipment</Label>
              <Select value={form.shipmentId} onChange={(e) => chooseShipment(e.target.value)}>
                <option value="">Select shipment</option>
                {shipments.map((shipment) => (
                  <option key={shipment.shipmentId} value={shipment.shipmentId}>
                    {shipment.dispatchReference} · {shipment.parcelNumber}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Verification date</Label>
              <Input type="date" value={form.verificationDate} onChange={(e) => setForm({ ...form, verificationDate: e.target.value })} />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.verificationStatus} onChange={(e) => setForm({ ...form, verificationStatus: e.target.value })}>
                <option value="received">Received</option>
                <option value="completed">Completed</option>
                <option value="issue">Issue flagged</option>
              </Select>
            </div>
          </div>

          <div className="mt-4">
            <Label>Arrival notes</Label>
            <textarea
              rows={3}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-tenzy-teal focus:ring-2 focus:ring-tenzy-teal/20"
              placeholder="Damage details, customs note, or branch handling note"
            />
          </div>

          <div className="mt-6 space-y-4">
            {(form.items ?? []).map((item, index) => (
              <div key={item.shipmentItemId} className="rounded-3xl bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-800">{item.productName}</p>
                    <p className="text-xs text-slate-500">Dispatched quantity: {item.quantityDispatched}</p>
                  </div>
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                    <input
                      type="checkbox"
                      checked={item.approvedForPricing}
                      onChange={(e) => setForm((current) => ({
                        ...current,
                        items: current.items.map((entry, itemIndex) => itemIndex === index ? { ...entry, approvedForPricing: e.target.checked } : entry),
                      }))}
                    />
                    Approve shipment
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
                        onChange={(e) => setForm((current) => ({
                          ...current,
                          items: current.items.map((entry, itemIndex) => itemIndex === index ? { ...entry, [key]: e.target.value } : entry),
                        }))}
                      />
                    </div>
                  ))}
                </div>

                <div className="mt-3">
                  <Label>Notes</Label>
                  <Input
                    value={item.notes}
                    onChange={(e) => setForm((current) => ({
                      ...current,
                      items: current.items.map((entry, itemIndex) => itemIndex === index ? { ...entry, notes: e.target.value } : entry),
                    }))}
                  />
                </div>
              </div>
            ))}
          </div>

          <button onClick={saveArrival} disabled={saving} className="mt-5 w-full rounded-2xl bg-tenzy-teal px-4 py-3 text-sm font-semibold text-white disabled:opacity-60">
            {saving ? "Saving verification..." : "Save arrival verification"}
          </button>
        </div>

        <div className="space-y-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <PackageSearch size={16} className="text-indigo-500" />
              <h2 className="text-lg font-bold text-slate-900">Selected shipment</h2>
            </div>
            {!selectedShipment && <p className="mt-4 text-sm text-slate-400">Choose a shipment to pull dispatched products into the verification form.</p>}
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

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <BadgeCheck size={16} className="text-emerald-500" />
              <h2 className="text-lg font-bold text-slate-900">Recent verifications</h2>
            </div>
            <div className="mt-4 space-y-3">
              {arrivals.length === 0 && <p className="text-sm text-slate-400">No verifications recorded yet.</p>}
              {arrivals.map((arrival) => (
                <div key={arrival.arrivalVerificationId} className="rounded-2xl bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-800 truncate">{arrival.dispatchReference}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        Approved: {arrival.totalApprovedQuantity} · Missing: {arrival.totalMissingQuantity} · Damaged: {arrival.totalDamagedQuantity}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${STATUS_COLORS[arrival.verificationStatus] ?? "bg-slate-100 text-slate-600"}`}>
                        {arrival.verificationStatus}
                      </span>
                      <button
                        onClick={() => setViewArrivalId(arrival.arrivalVerificationId)}
                        className="flex items-center gap-1 rounded-xl bg-white border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
                      >
                        <Eye size={12} /> View
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {viewArrivalId && (
        <ArrivalDetailDialog
          arrivalId={viewArrivalId}
          onClose={() => setViewArrivalId(null)}
        />
      )}
    </div>
  );
}
