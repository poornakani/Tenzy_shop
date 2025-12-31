// src/pages/WishlistPage.jsx
import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { bestSellingProducts } from "@/const";
import { useWishlist } from "@/Context/WishlistContext";
import Navibar from "@/HomePage/Navibar";

function formatLKR(value) {
  return new Intl.NumberFormat("en-LK").format(value);
}

function calcDiscounted(price, discountPercent) {
  return Math.round(price * (1 - discountPercent / 100));
}

const WishlistPage = () => {
  const navigate = useNavigate();
  const { wishlistIds, wishlistCount, toggleWishlist, isWishlisted } =
    useWishlist();

  // Build wishlisted products list from your data source
  const items = useMemo(() => {
    const ids = wishlistIds; // Set
    return bestSellingProducts
      .filter((p) => ids.has(p.id))
      .map((p) => ({
        ...p,
        discountedPrice: calcDiscounted(p.price, p.discountPercent),
      }));
  }, [wishlistIds]);

  const goToProduct = (p) => navigate(`/product/${p.id}`);

  return (
    <div className="w-full overflow-hidden">
      {/*  Navibar/Header included */}
      <Navibar />
      <div className="h-24 bg-linear-to-b from-slate-900 to-transparent" />
      <main className="mx-auto w-full max-w-7xl px-4 sm:px-6 py-8 md:py-12">
        {/* Top area */}
        <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="absolute inset-0 bg-linear-to-r from-amber-100/60 via-white to-orange-100/60" />
          <div className="relative p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-5">
              <div>
                <p className="text-xs font-semibold text-slate-500 tracking-wide">
                  YOUR COLLECTION
                </p>
                <h1 className="mt-2 text-2xl md:text-4xl font-semibold text-slate-900">
                  Wishlist
                </h1>
                <p className="mt-2 text-sm md:text-base text-slate-600 max-w-2xl">
                  Save your favorites and come back anytime. Your wishlist stays
                  clean, premium, and easy to shop.
                </p>
              </div>

              {/* Stats pill */}
              <div className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-white/70 backdrop-blur px-4 py-3">
                <div className="h-10 w-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center">
                  ♥
                </div>
                <div>
                  <p className="text-xs text-slate-500">Items saved</p>
                  <p className="text-lg font-semibold text-slate-900">
                    {wishlistCount}
                  </p>
                </div>
              </div>
            </div>

            {/* Quick actions */}
            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => navigate("/")}
                className="rounded-2xl px-5 py-3 text-sm font-semibold border border-slate-200 bg-white hover:bg-slate-50 transition"
              >
                Continue shopping
              </button>

              {items.length > 0 && (
                <button
                  type="button"
                  onClick={() => navigate("/products")}
                  className="rounded-2xl px-5 py-3 text-sm font-semibold text-white bg-linear-to-r from-amber-400 to-orange-500 shadow-lg shadow-amber-500/25 hover:opacity-95 transition"
                >
                  Explore more deals
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Empty state */}
        {items.length === 0 && (
          <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-8 md:p-12 text-center shadow-sm">
            <div className="mx-auto h-14 w-14 rounded-2xl bg-linear-to-r from-amber-400 to-orange-500 text-white flex items-center justify-center text-2xl shadow-lg shadow-amber-500/25">
              ♡
            </div>
            <h2 className="mt-4 text-xl md:text-2xl font-semibold text-slate-900">
              Your wishlist is empty
            </h2>
            <p className="mt-2 text-sm md:text-base text-slate-600 max-w-xl mx-auto">
              Tap the heart icon on products to save them here. It’s the easiest
              way to compare and buy later.
            </p>
            <button
              type="button"
              onClick={() => navigate("/")}
              className="mt-6 rounded-2xl px-6 py-3 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 transition"
            >
              Start adding favorites
            </button>
          </div>
        )}

        {/* Items grid */}
        {items.length > 0 && (
          <div className="mt-8 grid gap-4 sm:gap-5 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {items.map((p) => (
              <article
                key={p.id}
                className="group rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden"
              >
                {/* Image */}
                <div className="relative aspect-4/5 overflow-hidden">
                  <img
                    src={p.image}
                    alt={p.name}
                    className={`h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]
                      ${p.outOfStock ? "blur-[2px] grayscale" : ""}`}
                  />

                  {/* Sale */}
                  {p.inSale && (
                    <div className="absolute top-3 left-3 rounded-xl bg-linear-to-r from-pink-500 to-red-600 px-3 py-1.5 text-xs font-semibold text-white shadow-lg shadow-pink-500/20">
                      IN SALE
                    </div>
                  )}

                  {/* Stock */}
                  <div
                    className={`absolute top-3 right-3 rounded-xl px-3 py-1.5 text-xs font-semibold text-white backdrop-blur shadow-lg
                      ${
                        p.outOfStock
                          ? "bg-black/60"
                          : "bg-linear-to-r from-emerald-500 to-teal-600 shadow-emerald-500/20"
                      }`}
                  >
                    {p.outOfStock ? "Out of stock" : `Stock: ${p.stockCount}`}
                  </div>

                  {/* Bottom actions */}
                  <div className="absolute inset-x-0 bottom-0 p-3">
                    <div className="rounded-2xl bg-white/80 backdrop-blur border border-white/30 shadow-sm p-2 flex items-center gap-2">
                      {/* Remove (toggle) */}
                      <button
                        type="button"
                        onClick={() => toggleWishlist(p)}
                        className={`h-10 w-10 rounded-xl flex items-center justify-center transition active:scale-95
                          ${
                            isWishlisted(p.id)
                              ? "bg-red-500/90 text-white"
                              : "bg-slate-100 text-slate-900"
                          }`}
                        aria-label="Remove from wishlist"
                        title="Remove"
                      >
                        ♥
                      </button>

                      {/* View */}
                      <button
                        type="button"
                        onClick={() => goToProduct(p)}
                        className="flex-1 h-10 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition active:scale-95"
                      >
                        View product
                      </button>
                    </div>
                  </div>
                </div>

                {/* Details */}
                <div className="p-4">
                  <h3 className="text-sm font-semibold text-slate-900 leading-snug line-clamp-2">
                    {p.name}
                  </h3>

                  <div className="mt-2 flex items-end justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        LKR {formatLKR(p.discountedPrice)}
                      </p>
                      <p className="text-xs text-slate-500 line-through">
                        LKR {formatLKR(p.price)}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-xs font-semibold text-red-600">
                        -{p.discountPercent}%
                      </p>
                    </div>
                  </div>

                  {/* Minimal “most wanted” info */}
                  <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                    <p className="text-[11px] text-slate-700">
                      Pay with{" "}
                      <span className="font-semibold">{p.paymentProvider}</span>{" "}
                      • {p.minInstallments}+ instalments
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default WishlistPage;
