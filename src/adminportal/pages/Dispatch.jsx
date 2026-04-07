import React, { useEffect, useMemo, useState } from "react";
import { Truck, Plus, Wallet } from "lucide-react";
import { supplyChainApi } from "../../services/api";

const emptyDispatch = {
  dispatchReference: "",
  dispatchDate: new Date().toISOString().slice(0, 10),
  courierName: "",
  parcelNumber: "",
  shipmentStatus: "pending",
  notes: "",
  items: [],
};

const emptyCharge = {
  chargeType: "uk_courier",
  currencyCode: "GBP",
  amount: "",
  chargeDate: new Date().toISOString().slice(0, 10),
  notes: "",
};

const money = (value) => new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(value ?? 0);

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

export default function Dispatch() {
  const [dispatches, setDispatches] = useState([]);
  const [procurements, setProcurements] = useState([]);
  const [selectedProcurementId, setSelectedProcurementId] = useState("");
  const [selectedProcurement, setSelectedProcurement] = useState(null);
  const [selectedShipment, setSelectedShipment] = useState(null);
  const [dispatchForm, setDispatchForm] = useState(emptyDispatch);
  const [chargeForm, setChargeForm] = useState(emptyCharge);
  const [loading, setLoading] = useState(true);
  const [savingDispatch, setSavingDispatch] = useState(false);
  const [savingCharge, setSavingCharge] = useState(false);

  useEffect(() => {
    Promise.allSettled([
      supplyChainApi.getDispatches(),
      supplyChainApi.getProcurements(),
    ]).then(([dispatchList, procurementList]) => {
      if (dispatchList.status === "fulfilled") setDispatches(dispatchList.value ?? []);
      if (procurementList.status === "fulfilled") setProcurements(procurementList.value ?? []);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedProcurementId) return;
    supplyChainApi.getProcurementById(selectedProcurementId).then(setSelectedProcurement);
  }, [selectedProcurementId]);

  const shipmentTotals = useMemo(() => ({
    quantity: dispatchForm.items.reduce((sum, item) => sum + (Number(item.quantityDispatched) || 0), 0),
  }), [dispatchForm.items]);

  const addProcurementItem = (item) => {
    if (dispatchForm.items.some((entry) => entry.procurementItemId === item.procurementItemId)) return;
    setDispatchForm((current) => ({
      ...current,
      items: [
        ...current.items,
        {
          procurementItemId: item.procurementItemId,
          productName: item.productName,
          brandName: item.brandName,
          quantityDispatched: item.quantity,
          netUnitCost: item.netUnitCost,
        },
      ],
    }));
  };

  const saveDispatch = async () => {
    if (!dispatchForm.courierName || !dispatchForm.parcelNumber || dispatchForm.items.length === 0 || savingDispatch) return;
    setSavingDispatch(true);
    try {
      await supplyChainApi.saveDispatch({
        ...dispatchForm,
        dispatchDate: `${dispatchForm.dispatchDate}T00:00:00`,
        items: dispatchForm.items.map((item) => ({
          procurementItemId: item.procurementItemId,
          quantityDispatched: Number(item.quantityDispatched),
        })),
      });
      const refreshed = await supplyChainApi.getDispatches();
      setDispatches(refreshed ?? []);
      setDispatchForm(emptyDispatch);
      setSelectedProcurement(null);
      setSelectedProcurementId("");
    } finally {
      setSavingDispatch(false);
    }
  };

  const openShipment = async (shipmentId) => {
    setSelectedShipment(await supplyChainApi.getDispatchById(shipmentId));
  };

  const addCharge = async () => {
    if (!selectedShipment?.shipmentId || !chargeForm.amount || savingCharge) return;
    setSavingCharge(true);
    try {
      await supplyChainApi.addShipmentCharge(selectedShipment.shipmentId, {
        ...chargeForm,
        amount: Number(chargeForm.amount),
        chargeDate: `${chargeForm.chargeDate}T00:00:00`,
      });
      setSelectedShipment(await supplyChainApi.getDispatchById(selectedShipment.shipmentId));
      setChargeForm(emptyCharge);
    } finally {
      setSavingCharge(false);
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
          <h1 className="text-2xl font-bold text-slate-900">Dispatch From UK</h1>
          <p className="mt-1 text-sm text-slate-500">Build shipments from procured stock and add logistics costs whenever they become available.</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-500">
          {dispatches.length} shipments
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Dispatch reference</Label>
              <Input value={dispatchForm.dispatchReference} onChange={(e) => setDispatchForm({ ...dispatchForm, dispatchReference: e.target.value })} placeholder="Auto-generated if blank" />
            </div>
            <div>
              <Label>Dispatch date</Label>
              <Input type="date" value={dispatchForm.dispatchDate} onChange={(e) => setDispatchForm({ ...dispatchForm, dispatchDate: e.target.value })} />
            </div>
            <div>
              <Label>Courier name</Label>
              <Input value={dispatchForm.courierName} onChange={(e) => setDispatchForm({ ...dispatchForm, courierName: e.target.value })} placeholder="DHL, Kapruka, hand carry" />
            </div>
            <div>
              <Label>Parcel / shipment number</Label>
              <Input value={dispatchForm.parcelNumber} onChange={(e) => setDispatchForm({ ...dispatchForm, parcelNumber: e.target.value })} />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={dispatchForm.shipmentStatus} onChange={(e) => setDispatchForm({ ...dispatchForm, shipmentStatus: e.target.value })}>
                <option value="pending">Pending</option>
                <option value="dispatched">Dispatched</option>
                <option value="received">Received</option>
              </Select>
            </div>
            <div>
              <Label>Notes</Label>
              <Input value={dispatchForm.notes} onChange={(e) => setDispatchForm({ ...dispatchForm, notes: e.target.value })} />
            </div>
          </div>

          <div className="mt-6 rounded-3xl bg-slate-50 p-4">
            <h2 className="text-sm font-bold text-slate-800">Select procurement source</h2>
            <div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto]">
              <Select value={selectedProcurementId} onChange={(e) => setSelectedProcurementId(e.target.value)}>
                <option value="">Select procurement</option>
                {procurements.map((procurement) => (
                  <option key={procurement.procurementId} value={procurement.procurementId}>
                    {procurement.procurementReference} · {procurement.shopName}
                  </option>
                ))}
              </Select>
              <div className="rounded-2xl bg-white px-4 py-2 text-sm text-slate-500">{shipmentTotals.quantity} units selected</div>
            </div>

            <div className="mt-4 space-y-3">
              {selectedProcurement?.items?.map((item) => (
                <div key={item.procurementItemId} className="flex items-center justify-between rounded-2xl bg-white p-3 text-sm">
                  <div>
                    <p className="font-semibold text-slate-800">{item.productName}</p>
                    <p className="text-xs text-slate-500">{item.brandName} · {item.quantity} available · {money(item.netUnitCost)} unit net</p>
                  </div>
                  <button onClick={() => addProcurementItem(item)} className="rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white">
                    Add
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5">
            <h2 className="text-sm font-bold text-slate-800">Shipment items</h2>
            <div className="mt-3 space-y-3">
              {dispatchForm.items.length === 0 && <p className="text-sm text-slate-400">No items selected yet.</p>}
              {dispatchForm.items.map((item, index) => (
                <div key={item.procurementItemId} className="grid gap-3 rounded-2xl bg-slate-50 p-4 md:grid-cols-[1fr_120px_auto] md:items-center">
                  <div>
                    <p className="font-semibold text-slate-800">{item.productName}</p>
                    <p className="text-xs text-slate-500">{item.brandName} · net {money(item.netUnitCost)}</p>
                  </div>
                  <Input
                    type="number"
                    min="1"
                    value={item.quantityDispatched}
                    onChange={(e) => {
                      const quantityDispatched = e.target.value;
                      setDispatchForm((current) => ({
                        ...current,
                        items: current.items.map((entry, itemIndex) => itemIndex === index ? { ...entry, quantityDispatched } : entry),
                      }));
                    }}
                  />
                  <button
                    onClick={() => setDispatchForm((current) => ({ ...current, items: current.items.filter((_, itemIndex) => itemIndex !== index) }))}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
            <button onClick={saveDispatch} disabled={savingDispatch} className="mt-5 w-full rounded-2xl bg-tenzy-teal px-4 py-3 text-sm font-semibold text-white disabled:opacity-60">
              {savingDispatch ? "Saving shipment..." : "Save shipment"}
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <Truck size={16} className="text-indigo-500" />
              <h2 className="text-lg font-bold text-slate-900">Saved shipments</h2>
            </div>
            <div className="mt-4 space-y-3">
              {dispatches.map((shipment) => (
                <button
                  key={shipment.shipmentId}
                  onClick={() => openShipment(shipment.shipmentId)}
                  className="w-full rounded-2xl border border-slate-200 p-4 text-left transition hover:border-tenzy-teal"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-800">{shipment.dispatchReference}</p>
                      <p className="text-xs text-slate-500">{shipment.courierName} · {shipment.parcelNumber}</p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold capitalize text-slate-600">{shipment.shipmentStatus}</span>
                  </div>
                  <p className="mt-3 text-sm text-slate-500">Products: {money(shipment.totalProductCost)} · Charges: {money(shipment.totalShipmentCharges)}</p>
                </button>
              ))}
            </div>
          </div>

          {selectedShipment && (
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <Wallet size={16} className="text-tenzy-orange" />
                <h2 className="text-lg font-bold text-slate-900">Shipment costs</h2>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div>
                  <Label>Charge type</Label>
                  <Select value={chargeForm.chargeType} onChange={(e) => setChargeForm({ ...chargeForm, chargeType: e.target.value })}>
                    <option value="uk_courier">UK courier</option>
                    <option value="sl_courier">Sri Lanka courier</option>
                    <option value="tax">Tax charge</option>
                    <option value="other">Additional charge</option>
                  </Select>
                </div>
                <div>
                  <Label>Currency</Label>
                  <Select value={chargeForm.currencyCode} onChange={(e) => setChargeForm({ ...chargeForm, currencyCode: e.target.value })}>
                    <option value="GBP">GBP</option>
                    <option value="LKR">LKR</option>
                  </Select>
                </div>
                <div>
                  <Label>Amount</Label>
                  <Input type="number" min="0" step="0.01" value={chargeForm.amount} onChange={(e) => setChargeForm({ ...chargeForm, amount: e.target.value })} />
                </div>
                <div>
                  <Label>Charge date</Label>
                  <Input type="date" value={chargeForm.chargeDate} onChange={(e) => setChargeForm({ ...chargeForm, chargeDate: e.target.value })} />
                </div>
              </div>
              <div className="mt-3">
                <Label>Notes</Label>
                <Input value={chargeForm.notes} onChange={(e) => setChargeForm({ ...chargeForm, notes: e.target.value })} />
              </div>
              <button onClick={addCharge} disabled={savingCharge} className="mt-4 w-full rounded-2xl bg-tenzy-orange px-4 py-3 text-sm font-semibold text-white disabled:opacity-60">
                {savingCharge ? "Saving charge..." : "Add shipment charge"}
              </button>

              <div className="mt-5 space-y-3">
                {(selectedShipment.charges ?? []).map((charge) => (
                  <div key={charge.shipmentChargeId} className="rounded-2xl bg-slate-50 p-3 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-semibold capitalize text-slate-800">{charge.chargeType.replaceAll("_", " ")}</span>
                      <span className="text-slate-700">{charge.currencyCode} {Number(charge.amount).toFixed(2)}</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{String(charge.chargeDate).slice(0, 10)} · {charge.notes || "No note"}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
