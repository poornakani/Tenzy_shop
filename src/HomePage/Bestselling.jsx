import React, { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import QuickViewModal from "@/Widgets/QuickViewModal";
import { useWishlist } from "@/context/WishlistContext";
import { Heart, Eye } from "lucide-react";
import { SellingProducts } from "@/ProductsJson";

gsap.registerPlugin(ScrollTrigger);

function formatLKR(value) {
  // change currency format as you want
  return new Intl.NumberFormat("en-LK").format(value);
}

function calcDiscounted(price, discountPercent) {
  const discounted = Math.round(price * (1 - discountPercent / 100));
  return discounted;
}

const BestSelling = () => {
  const [quickViewOpen, setQuickViewOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const { toggleWishlist, isWishlisted } = useWishlist();

  const onQuickView = (p) => {
    setSelectedProduct(p);
    setQuickViewOpen(true);
  };

  const closeQuickView = () => {
    setQuickViewOpen(false);
    setSelectedProduct(null);
  };

  const wrapRef = useRef(null);

  useEffect(() => {
    if (!wrapRef.current) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".bs-title",
        { y: 16, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.7, ease: "power2.out" }
      );

      gsap.fromTo(
        ".bs-card",
        { y: 28, opacity: 0, scale: 0.98 },
        {
          y: 0,
          opacity: 1,
          scale: 1,
          duration: 0.7,
          ease: "power2.out",
          stagger: 0.07,
          scrollTrigger: {
            trigger: wrapRef.current,
            start: "top 80%",
          },
        }
      );
    }, wrapRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={wrapRef} className="w-full py-10 md:py-16">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6">
        <div className="bs-title">
          <h2 className="text-2xl md:text-4xl font-semibold text-slate-900">
            Best Selling
          </h2>
          <p className="mt-2 text-sm md:text-base text-slate-600 max-w-2xl">
            Top picks with modern UI, sale badges, stock states, and instalment
            info.
          </p>
        </div>

        {/* 2-row layout (10 items → 2 rows of 5 on xl screens) */}
        <div className="mt-8 grid gap-4 sm:gap-5 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {SellingProducts.slice(0, 10).map((p) => {
            const discounted = calcDiscounted(p.price, p.discountPercent);
            const pWithComputed = { ...p, discountedPrice: discounted };
            return (
              <article
                key={p.id}
                className="bs-card group rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden"
              >
                {/* Image block */}
                <div className="relative aspect-4/5 overflow-hidden">
                  <img
                    src={p.image}
                    alt={p.name}
                    className={`h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]
                      ${p.outOfStock ? "blur-[2px] grayscale" : ""}`}
                  />
                  {/* Hover actions */}
                  {/* Actions overlay */}
                  <div className="absolute inset-0 z-20 flex items-end justify-center p-3">
                    {/* Desktop (unchanged behavior): shows on hover */}
                    <div
                      className={`
                      hidden md:flex pointer-events-auto w-full gap-2 transition-all duration-300
                      ${
                        isWishlisted(pWithComputed.id)
                          ? "opacity-100 translate-y-0"
                          : "opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0"
                      }
                    `}
                    >
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          toggleWishlist(pWithComputed);
                        }}
                        aria-label="Wishlist"
                        className={`
                          flex items-center justify-center
                          h-9 w-9 rounded-full
                          backdrop-blur transition-all duration-300
                          ${
                            isWishlisted(pWithComputed.id)
                              ? "bg-red-500/15 scale-110"
                              : "bg-white/80 hover:bg-white"
                          }
                        `}
                      >
                        <Heart
                          size={18}
                          className={`
                            transition-all duration-300
                            ${
                              isWishlisted(pWithComputed.id)
                                ? "fill-red-500 text-red-500"
                                : "text-slate-800"
                            }
                          `}
                        />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onQuickView(pWithComputed);
                        }}
                        aria-label="Quick View"
                        className="
                            flex items-center justify-center
                            h-9 w-9 rounded-full
                            bg-black/70 backdrop-blur
                            transition-all duration-300
                            hover:bg-black/85
                            active:scale-110
                          "
                      >
                        <Eye
                          size={18}
                          className="text-white transition-transform duration-300"
                        />
                      </button>
                    </div>

                    {/* Mobile: always visible icon buttons at bottom */}
                    <div className="md:hidden pointer-events-auto w-full flex items-center justify-between gap-2">
                      {/* Wishlist icon */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          toggleWishlist(pWithComputed);
                        }}
                        className={`
                                flex-1 rounded-xl backdrop-blur px-3 py-2 shadow-sm
                                active:scale-95 transition
                                ${
                                  isWishlisted(pWithComputed.id)
                                    ? "bg-red-500/90 text-white"
                                    : "bg-white/85 text-slate-900"
                                }
                              `}
                        aria-label="Wishlist"
                      >
                        <span className="flex items-center justify-center gap-2 text-sm font-semibold">
                          <span
                            className={`text-base ${
                              isWishlisted(pWithComputed.id)
                                ? "text-white"
                                : "text-slate-900"
                            }`}
                          >
                            {isWishlisted(pWithComputed.id) ? "♥" : "♡"}
                          </span>

                          <span className="text-xs">
                            {isWishlisted(pWithComputed.id)
                              ? "Saved"
                              : "Wishlist"}
                          </span>
                        </span>
                      </button>

                      {/* Add to cart icon */}
                      <button
                        type="button"
                        disabled={p.outOfStock}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onQuickView(pWithComputed);
                          console.log("Add to cart:", p.id);
                        }}
                        className={`flex-1 rounded-xl px-3 py-2 shadow-sm active:scale-95 transition backdrop-blur
                                  ${
                                    p.outOfStock
                                      ? "bg-slate-200/90 text-slate-500 cursor-not-allowed"
                                      : "bg-slate-900/90 text-white"
                                  }`}
                        aria-label="Add to cart"
                      >
                        <span className="flex items-center justify-center gap-2 text-sm font-semibold">
                          <span>🛒</span>
                          <span className="text-xs">View</span>
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* top-right sale badge */}
                  {p.inSale && (
                    <div className="absolute top-3 right-3 z-10 rounded-md bg-red-600 px-2 py-1 text-xs font-semibold text-white">
                      IN SALE
                    </div>
                  )}

                  {/* Out of stock overlay */}
                  {p.outOfStock && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/35">
                      <div className="rounded-xl bg-black/60 px-4 py-2 text-white text-sm font-semibold backdrop-blur">
                        Out of stock
                      </div>
                    </div>
                  )}

                  {/* soft bottom gradient for readability */}
                  <div className="absolute inset-x-0 bottom-0 h-24 bg-linear-to-t from-black/45 to-transparent" />
                </div>

                {/* Content */}
                <div className="p-4">
                  {/* Row 1: name + price */}
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-sm font-semibold text-slate-900 leading-snug line-clamp-2">
                      {p.name}
                    </h3>

                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-slate-900">
                        LKR {formatLKR(discounted)}
                      </p>
                      <p className="text-xs text-slate-500 line-through">
                        LKR {formatLKR(p.price)}
                      </p>
                      <p className="text-xs font-semibold text-red-600">
                        -{p.discountPercent}%
                      </p>
                    </div>
                  </div>

                  {/* Row 2: payment method */}
                  <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                    <p className="text-xs text-slate-700">
                      Pay from{" "}
                      <span className="font-semibold">
                        {p.minInstallments}+
                      </span>{" "}
                      instalments with{" "}
                      <span className="font-semibold">{p.paymentProvider}</span>
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Example: LKR {formatLKR(p.price)} / {p.minInstallments} ={" "}
                      LKR {formatLKR(Math.round(p.price / p.minInstallments))}
                    </p>
                  </div>

                  {/* Bottom: stock count */}
                  <div className="mt-3 flex items-center justify-between">
                    <p className="text-xs text-slate-600">
                      Stock:
                      <span
                        className={`ml-1 font-semibold ${
                          p.stockCount === 0 ? "text-red-600" : "text-slate-900"
                        }`}
                      >
                        {p.stockCount}
                      </span>
                    </p>

                    <button
                      disabled={p.outOfStock}
                      className={`rounded-xl px-3 py-2 text-xs font-semibold transition
                        ${
                          p.outOfStock
                            ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                            : "bg-slate-900 text-white hover:bg-slate-800"
                        }`}
                    >
                      Add to cart
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
      <div className="flex justify-center p-10">
        <button
          className="
      relative overflow-hidden
      rounded-2xl px-10 py-4
      font-semibold tracking-wide
      text-white
      bg-linear-to-r from-amber-400 to-orange-500
      shadow-lg shadow-amber-500/30
      transition-all duration-300
      hover:scale-105 hover:shadow-xl hover:shadow-amber-500/50
      active:scale-95
    "
        >
          See more products
        </button>
      </div>

      <QuickViewModal
        open={quickViewOpen}
        product={selectedProduct}
        onClose={closeQuickView}
        formatLKR={formatLKR}
        IsWishlisted={isWishlisted(selectedProduct?.id)}
        onToggleWishlist={(p) => toggleWishlist(p)}
        onAddToCart={(p, qty) => {
          // your add to cart logic
          console.log("Add to cart:", p.id, "qty:", qty);
        }}
      />
    </section>
  );
};

export default BestSelling;
