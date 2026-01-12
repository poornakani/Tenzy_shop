import Navibar from "@/HomePage/Navibar";
import React, { useEffect } from "react";
import { useLocation } from "react-router-dom";

const Section = ({ id, title, children }) => (
  <section
    id={id}
    className="scroll-mt-28 rounded-3xl border border-slate-200 bg-white/70 p-6 sm:p-8 shadow-sm"
  >
    <h2 className="text-xl sm:text-2xl font-bold text-slate-900">{title}</h2>
    <div className="mt-3 text-slate-600 leading-relaxed text-sm sm:text-base">
      {children}
    </div>
  </section>
);

export default function CustomerInfoPage() {
  const location = useLocation();

  //  When page loads or hash changes, scroll to the section
  useEffect(() => {
    if (!location.hash) return;

    const el = document.querySelector(location.hash);
    if (!el) return;

    // small delay helps when layout/images/fonts affect height
    setTimeout(() => {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  }, [location.hash]);

  const goTo = (id) => {
    document
      .getElementById(id)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
    // also update URL hash (nice UX)
    window.history.replaceState(null, "", `#${id}`);
  };

  return (
    <div className="min-h-screen bg-linear-to-b from-slate-50 to-white">
      <Navibar />
      <div className="h-24 bg-linear-to-b from-[#0b1220] via-[#0b1220]/60 to-transparent" />
      {/* Header */}
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-10 pt-10 sm:pt-14 pb-8">
        <p className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs sm:text-sm font-semibold text-slate-700 border border-slate-200">
          Customer Help
        </p>
        <h1 className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900">
          Delivery, Returns, Payments & Tracking
        </h1>
        <p className="mt-3 max-w-3xl text-slate-600 text-sm sm:text-base">
          Everything you need to know about how we deliver your order, how
          returns and refunds work, accepted payment methods, and how to track
          your parcel.
        </p>

        {/* Quick jump (optional top nav) */}
        <div className="mt-6 flex flex-wrap gap-2">
          {[
            ["delivery", "Delivery Info"],
            ["returns", "Return & Refund"],
            ["payments", "Payment Methods"],
            ["tracking", "Track Order"],
          ].map(([id, label]) => (
            <button
              key={id}
              onClick={() => goTo(id)}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
              type="button"
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-10 pb-14">
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Main sections */}
          <div className="lg:col-span-8 space-y-6">
            <Section id="delivery" title="Delivery Information">
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  Orders are processed quickly and prepared for dispatch as soon
                  as payment is confirmed.
                </li>
                <li>
                  Delivery times depend on your location and the selected
                  shipping option at checkout.
                </li>
                <li>
                  You’ll receive an order confirmation and shipping updates by
                  email/SMS (if provided).
                </li>
                <li>
                  If you need a change of address, contact us as soon as
                  possible after placing the order.
                </li>
              </ul>
            </Section>

            <Section id="returns" title="Return & Refund Policy">
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  If something isn’t right, you can request a return within the
                  allowed return period stated on our store policy.
                </li>
                <li>
                  Items should be unused, in original packaging, and in
                  resellable condition (where applicable).
                </li>
                <li>
                  Refunds are processed after we receive and inspect the
                  returned items.
                </li>
                <li>
                  If your item arrived damaged or incorrect, contact us with
                  photos so we can fix it quickly.
                </li>
              </ul>
              <p className="mt-3 text-slate-600">
                Note: Some products (e.g., hygiene/beauty items) may have return
                restrictions for safety reasons.
              </p>
            </Section>

            <Section id="payments" title="Payment Methods">
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  We accept major debit/credit cards and other payment options
                  shown at checkout.
                </li>
                <li>
                  All payments are securely processed through trusted payment
                  providers.
                </li>
                <li>
                  If a payment fails, try another method or check with your bank
                  for verification.
                </li>
                <li>
                  For your safety, we never store your full card details on our
                  servers.
                </li>
              </ul>
            </Section>

            <Section id="tracking" title="Track your Order">
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  Once your order ships, we’ll email you a tracking link or
                  tracking number.
                </li>
                <li>
                  Tracking updates may take a little time to appear after
                  dispatch.
                </li>
                <li>
                  If tracking hasn’t updated for a while, don’t worry—carriers
                  sometimes scan in batches.
                </li>
                <li>
                  Need help? Share your order number with our support team and
                  we’ll assist you.
                </li>
              </ul>

              {/* Optional tracking input (if you want it) */}
              <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-800">
                  Quick tracking (optional)
                </p>
                <div className="mt-3 flex flex-col sm:flex-row gap-3">
                  <input
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-slate-900/10"
                    placeholder="Enter your tracking number"
                  />
                  <button
                    className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 transition"
                    type="button"
                  >
                    Track
                  </button>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  This can be connected to your tracking API later.
                </p>
              </div>
            </Section>
          </div>

          {/* Right sidebar (nice on desktop, collapses naturally on mobile) */}
          <aside className="lg:col-span-4">
            <div className="sticky top-6 space-y-4">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-base font-bold text-slate-900">
                  Need help?
                </h3>
                <p className="mt-2 text-sm text-slate-600">
                  If you have any questions about your order, delivery, or
                  returns, contact our support team.
                </p>
                <div className="mt-4 flex flex-col gap-2">
                  <button
                    className="rounded-xl bg-[#0b5351] px-4 py-3 text-sm font-semibold text-white hover:opacity-90 transition"
                    type="button"
                  >
                    Contact Support
                  </button>
                  <button
                    onClick={() => goTo("tracking")}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
                    type="button"
                  >
                    Track Order
                  </button>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-base font-bold text-slate-900">
                  Quick links
                </h3>
                <div className="mt-3 grid gap-2">
                  {[
                    ["delivery", "Delivery Information"],
                    ["returns", "Return & Refund Policy"],
                    ["payments", "Payment Methods"],
                    ["tracking", "Track your Order"],
                  ].map(([id, label]) => (
                    <button
                      key={id}
                      onClick={() => goTo(id)}
                      className="text-left rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
                      type="button"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* Footer links (your footer can call the same IDs) */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-10 py-8">
          <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500">
              © {new Date().getFullYear()} Tenzy Store. All rights reserved.
            </p>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => goTo("delivery")}
                className="text-sm font-semibold text-slate-700 hover:text-slate-900"
                type="button"
              >
                Delivery Information
              </button>
              <button
                onClick={() => goTo("returns")}
                className="text-sm font-semibold text-slate-700 hover:text-slate-900"
                type="button"
              >
                Return & Refund Policy
              </button>
              <button
                onClick={() => goTo("payments")}
                className="text-sm font-semibold text-slate-700 hover:text-slate-900"
                type="button"
              >
                Payment Methods
              </button>
              <button
                onClick={() => goTo("tracking")}
                className="text-sm font-semibold text-slate-700 hover:text-slate-900"
                type="button"
              >
                Track your Order
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
