import React, { useEffect, useState } from "react";
import { PackagePlus, Truck, BadgeCheck, Percent, Wallet, Boxes } from "lucide-react";
import { supplyChainApi } from "../../services/api";

const fmtMoney = (value) => new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(value ?? 0);

const cards = (summary) => [
  {
    label: "UK Purchases",
    value: summary?.procurementCount ?? 0,
    helper: fmtMoney(summary?.procurementNetTotal),
    icon: PackagePlus,
    tone: "bg-teal-500",
  },
  {
    label: "Active Shipments",
    value: summary?.activeShipmentCount ?? 0,
    helper: fmtMoney(summary?.shipmentChargeTotal),
    icon: Truck,
    tone: "bg-indigo-500",
  },
  {
    label: "Awaiting Verification",
    value: summary?.awaitingVerificationCount ?? 0,
    helper: `${summary?.eligiblePricingCount ?? 0} pricing-ready lines`,
    icon: BadgeCheck,
    tone: "bg-amber-500",
  },
  {
    label: "Approved Pricing",
    value: summary?.eligiblePricingCount ?? 0,
    helper: fmtMoney(summary?.pricingValueTotal),
    icon: Percent,
    tone: "bg-rose-500",
  },
];

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supplyChainApi.getDashboard()
      .then(setSummary)
      .finally(() => setLoading(false));
  }, []);

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
          <h1 className="text-2xl font-bold text-slate-900">Supply Chain Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">UK procurement, dispatch, Sri Lanka arrival verification, and pricing in one workflow.</p>
        </div>
        <div className="hidden sm:flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs text-slate-500">
          <Wallet size={14} className="text-tenzy-teal" />
          <span>Financials update from stored procedure summaries</span>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards(summary).map((card) => (
          <div key={card.label} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{card.label}</p>
                <p className="mt-3 text-3xl font-bold text-slate-900">{card.value}</p>
                <p className="mt-2 text-sm text-slate-500">{card.helper}</p>
              </div>
              <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${card.tone}`}>
                <card.icon size={20} className="text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900">
              <Boxes size={18} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Operational flow</h2>
              <p className="text-sm text-slate-500">Procure in the UK, dispatch, verify in Sri Lanka, then approve pricing.</p>
            </div>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-4">
            {[
              ["1", "UK Purchase", "Capture purchases, discounts, invoice references, and item-level net cost."],
              ["2", "Dispatch", "Build shipments from procured stock and add courier, tax, or late charges."],
              ["3", "Arrival", "Verify dispatched vs received quantities and approve only valid stock."],
              ["4", "Pricing", "Save selling price, discount policy, markup, and final approved record."],
            ].map(([step, title, text]) => (
              <div key={step} className="rounded-2xl bg-slate-50 p-4">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-tenzy-teal text-xs font-bold text-white">{step}</span>
                <h3 className="mt-3 text-sm font-bold text-slate-800">{title}</h3>
                <p className="mt-2 text-xs leading-5 text-slate-500">{text}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">Current focus</h2>
          <div className="mt-5 space-y-4 text-sm text-slate-600">
            <div className="rounded-2xl bg-amber-50 p-4">
              <p className="font-semibold text-amber-800">Pending arrival checks</p>
              <p className="mt-1 text-amber-700">{summary?.awaitingVerificationCount ?? 0} shipments still need Sri Lanka verification.</p>
            </div>
            <div className="rounded-2xl bg-emerald-50 p-4">
              <p className="font-semibold text-emerald-800">Pricing ready</p>
              <p className="mt-1 text-emerald-700">{summary?.eligiblePricingCount ?? 0} approved lines are available for pricing decisions.</p>
            </div>
            <div className="rounded-2xl bg-indigo-50 p-4">
              <p className="font-semibold text-indigo-800">Shipment cost tracked</p>
              <p className="mt-1 text-indigo-700">{fmtMoney(summary?.shipmentChargeTotal)} in logistics charges recorded so far.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
