import React, { useEffect, useMemo, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import gsap from "gsap";

import Header from "../HomePage/Header";
import { useCart } from "../Context/CartContext";
import Navibar from "@/HomePage/Navibar";

function formatLKR(value) {
  return new Intl.NumberFormat("en-LK").format(value);
}

const CartPage = () => {
  const navigate = useNavigate();
  const wrapRef = useRef(null);

  const {
    items,
    cartCount,
    subtotal,
    savings,
    originalTotal,
    incQty,
    decQty,
    setQty,
    removeFromCart,
    clearCart,
  } = useCart();

  useEffect(() => {
    if (!wrapRef.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".cart-hero",
        { y: 12, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.45, ease: "power2.out" }
      );
      gsap.fromTo(
        ".cart-card",
        { y: 16, opacity: 0, scale: 0.99 },
        {
          y: 0,
          opacity: 1,
          scale: 1,
          duration: 0.35,
          ease: "power2.out",
          stagger: 0.05,
        }
      );
    }, wrapRef);
    return () => ctx.revert();
  }, [items.length]);

  const shipping = useMemo(
    () => (subtotal > 50000 ? 0 : items.length ? 1500 : 0),
    [subtotal, items.length]
  );
  const total = useMemo(() => subtotal + shipping, [subtotal, shipping]);

  return (
    <div ref={wrapRef} className="w-full overflow-hidden">
      <Navibar />

      {/* spacer so glass nav is visible */}
      <div className="h-24 bg-linear-to-b from-slate-900/80 to-transparent" />

      <main className="mx-auto w-full max-w-7xl px-4 sm:px-6 pb-16">
        {/* Top */}
        <section className="cart-hero rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="relative p-5 sm:p-6">
            <div className="absolute inset-0 bg-linear-to-r from-amber-100/60 via-white to-orange-100/60" />
            <div className="relative flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold text-slate-500 tracking-wide">
                  CART
                </p>
                <h1 className="mt-2 text-2xl sm:text-3xl font-semibold text-slate-900">
                  Your Cart
                </h1>
                <p className="mt-2 text-sm text-slate-600">
                  {cartCount ? (
                    <>
                      You have{" "}
                      <span className="font-semibold">{cartCount}</span> item(s)
                      ready to checkout.
                    </>
                  ) : (
                    "Your cart is empty. Start adding your favorites."
                  )}
                </p>
              </div>

              <div className="hidden sm:flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => navigate("/products")}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-50 transition"
                >
                  Continue shopping
                </button>

                {items.length > 0 && (
                  <button
                    type="button"
                    onClick={clearCart}
                    className="rounded-2xl bg-slate-900 text-white px-4 py-3 text-sm font-semibold hover:bg-slate-800 transition"
                  >
                    Clear cart
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Content */}
        <section className="mt-6 grid gap-5 lg:grid-cols-12">
          {/* Items */}
          <section className="lg:col-span-8">
            {items.length === 0 ? (
              <div className="cart-card rounded-3xl border border-slate-200 bg-white shadow-sm p-8 text-center">
                <div className="mx-auto h-14 w-14 rounded-2xl bg-slate-900/10 flex items-center justify-center text-2xl">
                  🛍️
                </div>
                <h3 className="mt-4 text-lg font-semibold text-slate-900">
                  Your cart is empty
                </h3>
                <p className="mt-2 text-sm text-slate-600">
                  Browse products and add what you love.
                </p>
                <button
                  type="button"
                  onClick={() => navigate("/products")}
                  className="mt-5 rounded-2xl bg-linear-to-r from-amber-400 to-orange-500 text-white px-5 py-3 text-sm font-semibold shadow-lg shadow-amber-500/25 hover:opacity-95 transition active:scale-95"
                >
                  Go to shop
                </button>
              </div>
            ) : (
              <div className="grid gap-4">
                {items.map((p) => {
                  const outOfStock = p.outOfStock || p.stockCount === 0;

                  return (
                    <article
                      key={p.id}
                      className="cart-card rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden"
                    >
                      <div className="p-4 sm:p-5 flex gap-4">
                        {/* Image */}
                        <Link to={`/product/${p.id}`} className="shrink-0">
                          <div className="h-24 w-24 sm:h-28 sm:w-28 rounded-2xl overflow-hidden border border-slate-200 bg-slate-50">
                            <img
                              src={p.image}
                              alt={p.name}
                              className="h-full w-full object-cover"
                            />
                          </div>
                        </Link>

                        {/* Details */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <Link to={`/product/${p.id}`}>
                                <h3 className="text-sm sm:text-base font-semibold text-slate-900 truncate">
                                  {p.name}
                                </h3>
                              </Link>
                              <p className="mt-1 text-xs text-slate-500">
                                {p.category ? `${p.category}` : "Product"}
                                {p.brand ? ` • ${p.brand}` : ""}
                                {p.sku ? ` • ${p.sku}` : ""}
                              </p>

                              <div className="mt-2 flex items-center gap-2">
                                <span className="text-sm font-semibold text-slate-900">
                                  LKR {formatLKR(p.discountedPrice)}
                                </span>
                                {p.discountPercent ? (
                                  <>
                                    <span className="text-xs text-slate-500 line-through">
                                      LKR {formatLKR(p.price)}
                                    </span>
                                    <span className="text-xs font-semibold text-red-600">
                                      -{p.discountPercent}%
                                    </span>
                                  </>
                                ) : null}
                              </div>

                              <div className="mt-2">
                                <span
                                  className={`inline-flex items-center rounded-xl px-3 py-1 text-xs font-semibold ${
                                    outOfStock
                                      ? "bg-black/10 text-slate-700"
                                      : "bg-emerald-50 text-emerald-700"
                                  }`}
                                >
                                  {outOfStock
                                    ? "Out of stock"
                                    : `Stock: ${p.stockCount}`}
                                </span>
                              </div>
                            </div>

                            {/* Remove */}
                            <button
                              type="button"
                              onClick={() => removeFromCart(p.id)}
                              className="shrink-0 h-10 w-10 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 transition"
                              aria-label="Remove"
                              title="Remove"
                            >
                              ✕
                            </button>
                          </div>

                          {/* Qty + line total */}
                          <div className="mt-4 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2">
                              <button
                                type="button"
                                onClick={() => decQty(p.id)}
                                disabled={outOfStock || p.qty <= 1}
                                className={`h-10 w-10 rounded-xl font-bold transition ${
                                  outOfStock || p.qty <= 1
                                    ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                                    : "bg-white text-slate-900 hover:bg-slate-100 active:scale-95"
                                }`}
                              >
                                −
                              </button>

                              <input
                                value={p.qty}
                                onChange={(e) => setQty(p.id, e.target.value)}
                                disabled={outOfStock}
                                className="w-14 text-center rounded-xl border border-slate-200 bg-white px-2 py-2 text-sm font-semibold text-slate-900 outline-none"
                              />

                              <button
                                type="button"
                                onClick={() => incQty(p.id)}
                                disabled={
                                  outOfStock || p.qty >= (p.stockCount || 1)
                                }
                                className={`h-10 w-10 rounded-xl font-bold transition ${
                                  outOfStock || p.qty >= (p.stockCount || 1)
                                    ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                                    : "bg-white text-slate-900 hover:bg-slate-100 active:scale-95"
                                }`}
                              >
                                +
                              </button>
                            </div>

                            <p className="text-sm font-semibold text-slate-900">
                              LKR{" "}
                              {formatLKR(
                                (p.discountedPrice || 0) * (p.qty || 0)
                              )}
                            </p>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}

            {/* Mobile bottom actions */}
            {items.length > 0 && (
              <div className="mt-5 sm:hidden grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => navigate("/products")}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-50 transition"
                >
                  Shop
                </button>
                <button
                  type="button"
                  onClick={clearCart}
                  className="rounded-2xl bg-slate-900 text-white px-4 py-3 text-sm font-semibold hover:bg-slate-800 transition"
                >
                  Clear
                </button>
              </div>
            )}
          </section>

          {/* Summary */}
          <aside className="lg:col-span-4">
            <div className="cart-card sticky top-28 rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="p-5 sm:p-6">
                <h2 className="text-lg font-semibold text-slate-900">
                  Order Summary
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Review totals before checkout.
                </p>

                <div className="mt-5 space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">Subtotal</span>
                    <span className="font-semibold text-slate-900">
                      LKR {formatLKR(subtotal)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">Shipping</span>
                    <span className="font-semibold text-slate-900">
                      {shipping === 0 ? "Free" : `LKR ${formatLKR(shipping)}`}
                    </span>
                  </div>

                  {savings > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">You saved</span>
                      <span className="font-semibold text-emerald-600">
                        - LKR {formatLKR(savings)}
                      </span>
                    </div>
                  )}

                  <div className="h-px bg-slate-200" />

                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-900">
                      Total
                    </span>
                    <span className="text-lg font-semibold text-slate-900">
                      LKR {formatLKR(total)}
                    </span>
                  </div>
                </div>

                <div className="mt-5 grid gap-2">
                  <button
                    type="button"
                    disabled={items.length === 0}
                    onClick={() => navigate("/checkout")}
                    className={`rounded-2xl px-4 py-3 text-sm font-semibold transition active:scale-95 ${
                      items.length === 0
                        ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                        : "bg-linear-to-r from-amber-400 to-orange-500 text-white shadow-lg shadow-amber-500/25 hover:opacity-95"
                    }`}
                  >
                    Proceed to Checkout
                  </button>

                  <button
                    type="button"
                    disabled={items.length === 0}
                    onClick={() => navigate("/purchase")}
                    className={`rounded-2xl px-4 py-3 text-sm font-semibold transition active:scale-95 ${
                      items.length === 0
                        ? "border border-slate-200 bg-white text-slate-500 cursor-not-allowed"
                        : "border border-slate-200 bg-white text-slate-900 hover:bg-slate-50"
                    }`}
                  >
                    Purchase Now
                  </button>
                </div>

                {/* Little trust line */}
                <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs text-slate-700">
                    Free shipping for orders above{" "}
                    <span className="font-semibold">LKR 50,000</span>.
                  </p>
                  <p className="mt-1 text-[11px] text-slate-500">
                    Prices & stock are for demo now. Real checkout will be added
                    later.
                  </p>
                </div>
              </div>
            </div>
          </aside>
        </section>
      </main>
    </div>
  );
};

export default CartPage;
