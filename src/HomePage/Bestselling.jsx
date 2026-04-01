import React, { useEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import QuickViewModal from "@/Widgets/QuickViewModal";
import { useWishlist } from "@/Context/WishlistContext";
import { Heart, Eye, ShoppingBag, ChevronRight } from "lucide-react";
import { useCart } from "@/Context/CartContext";
import { useToast } from "@/Context/ToastContext";
import { useNavigate } from "react-router-dom";
import { productsApi } from "@/services/api";

gsap.registerPlugin(ScrollTrigger);

const TEAL   = "#2BB9B4";
const ORANGE = "#E8522A";

/* ── helpers ──────────────────────────────────────────────────────── */
function formatLKR(v) {
  return new Intl.NumberFormat("en-LK").format(v);
}
function calcDiscounted(price, pct) {
  return Math.round(price * (1 - pct / 100));
}
/* deterministic mock rating per product id */
function mockRating(id)  { return (4.1 + ((id * 17) % 10) * 0.08).toFixed(1); }
function mockReviews(id) { return 68 + ((id * 31) % 110); }

/* ── Star display ─────────────────────────────────────────────────── */
function Stars({ value }) {
  const full = Math.floor(value);
  return (
    <div className="flex items-center gap-[2px]">
      {[1, 2, 3, 4, 5].map(i => (
        <svg key={i} viewBox="0 0 20 20"
          className={`w-3 h-3 ${i <= full ? "fill-amber-400" : i === full + 1 && value - full >= 0.5 ? "fill-amber-300" : "fill-zinc-200"}`}
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

/* ── Derive filter tabs from product data ─────────────────────────── */
const CAT_LABELS = { Skin: "Skin Care", Face: "Face Care", Body: "Body Care", Head: "Head Care", Hand: "Hand Care", Lips: "Lip Care", Sun: "Sun Care", Acne: "Acne Care" };

function normalizeProd(raw) {
  const id    = raw.productId ?? raw.id ?? 0;
  const price = raw.priceLkr ?? raw.priceLKR ?? raw.price ?? 0;
  const disc  = raw.discountPercent ?? 0;
  const stock = raw.stockQty ?? raw.stockCount ?? 0;
  const rawImgs = Array.isArray(raw.images) ? raw.images : [];
  const imgUrls = rawImgs.map(i => i.imageUrl ?? i.ImageUrl).filter(Boolean);
  const primary = rawImgs.find(i => i.isPrimary || i.IsPrimary);
  return {
    id,
    name:            raw.name ?? "",
    price,
    discountPercent: disc,
    discountedPrice: Math.round(price * (1 - disc / 100)),
    inSale:          disc > 0,
    stockCount:      stock,
    outOfStock:      stock === 0,
    image:           primary?.imageUrl ?? imgUrls[0] ?? null,
    category:        raw.categoryName ?? raw.categoryType ?? raw.category ?? "",
    brand:           raw.brandName ?? raw.brand ?? "",
    brandId:         raw.brandId ?? 0,
  };
}

/* ══════════════════════════════════════════════════════════════════ */
const BestSelling = () => {
  const [allProducts,   setAllProducts]   = useState([]);
  const [quickViewOpen,   setQuickViewOpen]   = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [activeFilter,    setActiveFilter]    = useState("All");
  const { toggleWishlist, isWishlisted } = useWishlist();
  const { addToCart }  = useCart();
  const { showToast }  = useToast();
  const navigate       = useNavigate();
  const wrapRef        = useRef(null);

  useEffect(() => {
    productsApi.getAll()
      .then(data => setAllProducts((Array.isArray(data) ? data : []).map(normalizeProd)))
      .catch(console.error);
  }, []);

  const ALL_CATS = useMemo(() => ["All", ...new Set(allProducts.map(p => p.category).filter(Boolean))], [allProducts]);

  /* filtered list, max 10 */
  const displayed = useMemo(() => (
    activeFilter === "All"
      ? allProducts
      : allProducts.filter(p => p.category === activeFilter)
  ).slice(0, 10), [allProducts, activeFilter]);

  /* scroll-in animation */
  useEffect(() => {
    if (!wrapRef.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(".bs-title", { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, ease: "power2.out", scrollTrigger: { trigger: wrapRef.current, start: "top 82%" } });
      gsap.fromTo(".bs-card",  { y: 30, opacity: 0, scale: 0.97 }, { y: 0, opacity: 1, scale: 1, duration: 0.65, ease: "power2.out", stagger: 0.07, scrollTrigger: { trigger: wrapRef.current, start: "top 78%" } });
    }, wrapRef);
    return () => ctx.revert();
  }, [activeFilter]);

  const openQuickView  = p  => { setSelectedProduct(p); setQuickViewOpen(true); };
  const closeQuickView = () => { setQuickViewOpen(false); setSelectedProduct(null); };

  return (
    <section ref={wrapRef} className="w-full py-12 md:py-16" style={{ background: "#fafaf9" }}>
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6">

        {/* ── Header row ──────────────────────────────────────────── */}
        <div className="bs-title flex items-end justify-between gap-4 mb-8">
          <div>
            <span className="inline-flex items-center gap-2 mb-2 text-xs font-bold tracking-[0.2em] uppercase" style={{ color: TEAL }}>
              <span className="h-px w-6 inline-block" style={{ background: TEAL }} />
              Top Picks
            </span>
            <h2 className="text-3xl md:text-[2.6rem] font-bold text-zinc-900 leading-tight">
              Best <span className="italic" style={{ color: ORANGE }}>Selling</span>
            </h2>
            <p className="mt-1.5 text-sm text-zinc-500 max-w-md">
              Expert-curated favourites — tried, loved, and trusted by our customers.
            </p>
          </div>

          {/* View All link */}
          <button
            onClick={() => navigate("/products")}
            className="hidden sm:inline-flex items-center gap-1.5 text-sm font-semibold shrink-0 transition-all duration-200 hover:gap-2.5"
            style={{ color: TEAL }}
          >
            View All <ChevronRight size={16} strokeWidth={2.5} />
          </button>
        </div>

        {/* ── Filter tabs ─────────────────────────────────────────── */}
        <div className="bs-title flex items-center gap-2 flex-wrap mb-7">
          {ALL_CATS.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveFilter(cat)}
              className="px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-250 border"
              style={
                activeFilter === cat
                  ? { background: ORANGE, borderColor: ORANGE, color: "white", boxShadow: `0 4px 14px rgba(232,82,42,0.30)` }
                  : { background: "white", borderColor: "rgba(0,0,0,0.10)", color: "#71717a" }
              }
            >
              {cat === "All" ? "All Products" : (CAT_LABELS[cat] ?? cat)}
            </button>
          ))}
        </div>

        {/* ── Product grid ────────────────────────────────────────── */}
        <div className="grid gap-4 sm:gap-5 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {displayed.map(p => {
            const pw         = p;
            const rating     = parseFloat(mockRating(p.id));
            const reviews    = mockReviews(p.id);
            const isLow      = p.stockCount > 0 && p.stockCount <= 5;
            const wishlisted = isWishlisted(p.id);

            return (
              <article
                key={p.id}
                className="bs-card group relative bg-white rounded-2xl overflow-hidden flex flex-col cursor-pointer transition-all duration-300 hover:-translate-y-1"
                style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.07)", border: "1px solid rgba(0,0,0,0.07)" }}
                onClick={() => navigate(`/product/${p.id}`)}
              >
                {/* ── Image block ─────────────────────────────── */}
                <div className="relative aspect-4/5 overflow-hidden bg-zinc-50 shrink-0">
                  <img
                    src={p.image}
                    alt={p.name}
                    className={`h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.05] ${p.outOfStock ? "grayscale brightness-90" : ""}`}
                  />

                  {/* top-left: badges */}
                  <div className="absolute top-2.5 left-2.5 z-10 flex flex-col gap-1.5">
                    {p.inSale && !p.outOfStock && (
                      <span className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase text-white tracking-wider" style={{ background: ORANGE }}>
                        {p.discountPercent}% OFF
                      </span>
                    )}
                    {isLow && (
                      <span className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase text-white tracking-wider" style={{ background: "#f59e0b" }}>
                        Low Stock
                      </span>
                    )}
                    {p.id % 4 === 0 && !p.outOfStock && (
                      <span className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase text-white tracking-wider" style={{ background: TEAL }}>
                        New
                      </span>
                    )}
                  </div>

                  {/* top-right: wishlist pill */}
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); toggleWishlist(pw); }}
                    aria-label="Wishlist"
                    className="absolute top-2.5 right-2.5 z-10 flex items-center justify-center w-8 h-8 rounded-full transition-all duration-300 active:scale-90"
                    style={{
                      background: wishlisted ? "rgba(239,68,68,0.12)" : "rgba(255,255,255,0.85)",
                      backdropFilter: "blur(8px)",
                    }}
                  >
                    <Heart size={15} className={wishlisted ? "fill-red-500 text-red-500" : "text-zinc-600"} strokeWidth={2} />
                  </button>

                  {/* centre hover: quick view */}
                  <div className="absolute inset-0 z-10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); openQuickView(pw); }}
                      className="pointer-events-auto flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold text-white transition-all duration-200 active:scale-95"
                      style={{ background: "rgba(0,0,0,0.72)", backdropFilter: "blur(8px)" }}
                    >
                      <Eye size={13} />
                      Quick View
                    </button>
                  </div>

                  {/* out-of-stock overlay */}
                  {p.outOfStock && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/30">
                      <span className="rounded-xl bg-black/65 px-4 py-2 text-xs font-bold text-white backdrop-blur uppercase tracking-widest">
                        Out of Stock
                      </span>
                    </div>
                  )}

                  {/* subtle bottom gradient */}
                  <div className="absolute inset-x-0 bottom-0 h-16 pointer-events-none" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.35), transparent)" }} />
                </div>

                {/* ── Card body ───────────────────────────────── */}
                <div className="flex flex-col flex-1 p-3.5">
                  {/* Brand */}
                  <span className="text-[10px] font-bold uppercase tracking-widest mb-0.5" style={{ color: TEAL }}>
                    {p.brand}
                  </span>

                  {/* Product name */}
                  <h3 className="text-sm font-semibold text-zinc-900 leading-snug line-clamp-2 flex-1">
                    {p.name}
                  </h3>

                  {/* Star rating */}
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <Stars value={rating} />
                    <span className="text-[10px] text-zinc-400 font-medium">{rating} ({reviews})</span>
                  </div>

                  {/* Size */}
                  {p.size && (
                    <span className="text-[10px] text-zinc-400 mt-1">{p.size}</span>
                  )}

                  {/* Price row */}
                  <div className="flex items-baseline gap-2 mt-3">
                    <span className="text-sm font-bold text-zinc-900">
                      LKR {formatLKR(discounted)}
                    </span>
                    <span className="text-xs text-zinc-400 line-through">
                      LKR {formatLKR(p.price)}
                    </span>
                    <span className="text-[10px] font-bold rounded-full px-1.5 py-0.5 text-white ml-auto" style={{ background: ORANGE }}>
                      -{p.discountPercent}%
                    </span>
                  </div>

                  {/* Instalment hint */}
                  <p className="text-[10px] text-zinc-400 mt-1">
                    From <span className="font-semibold text-zinc-600">LKR {formatLKR(Math.round(discounted / p.minInstallments))}</span> × {p.minInstallments} with {p.paymentProvider}
                  </p>

                  {/* Stock bar */}
                  <div className="mt-2.5">
                    <div className="h-1 rounded-full bg-zinc-100 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: p.outOfStock ? "0%" : `${Math.min(100, (p.stockCount / 20) * 100)}%`,
                          background: isLow ? "#f59e0b" : TEAL,
                        }}
                      />
                    </div>
                    <p className="text-[10px] mt-0.5" style={{ color: isLow ? "#f59e0b" : "#a1a1aa" }}>
                      {p.outOfStock ? "Out of stock" : isLow ? `Only ${p.stockCount} left!` : `${p.stockCount} in stock`}
                    </p>
                  </div>

                  {/* Add to cart */}
                  <button
                    type="button"
                    disabled={p.outOfStock}
                    onClick={e => {
                      e.stopPropagation();
                      addToCart(pw, 1);
                      showToast({ title: "Added to cart", message: `${pw.name} × 1`, image: pw.image });
                    }}
                    className="mt-3 w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold uppercase tracking-wider transition-all duration-200 active:scale-95"
                    style={
                      p.outOfStock
                        ? { background: "#f4f4f5", color: "#a1a1aa", cursor: "not-allowed" }
                        : { background: ORANGE, color: "white", boxShadow: `0 4px 14px rgba(232,82,42,0.28)` }
                    }
                  >
                    <ShoppingBag size={13} strokeWidth={2.5} />
                    {p.outOfStock ? "Unavailable" : "Add to Bag"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>

        {/* ── Empty state ─────────────────────────────────────────── */}
        {displayed.length === 0 && (
          <div className="py-20 text-center text-zinc-400 text-sm">
            No products in this category yet.
          </div>
        )}

        {/* ── View all CTA ────────────────────────────────────────── */}
        <div className="flex justify-center mt-10">
          <button
            onClick={() => navigate("/products")}
            className="inline-flex items-center gap-2 rounded-full px-10 py-3.5 text-sm font-bold text-white transition-all duration-300 hover:scale-105 active:scale-95"
            style={{ background: `linear-gradient(135deg, ${TEAL} 0%, #22a19d 100%)`, boxShadow: `0 8px 28px rgba(43,185,180,0.30)` }}
          >
            See All Products <ChevronRight size={16} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      <QuickViewModal
        open={quickViewOpen}
        product={selectedProduct}
        onClose={closeQuickView}
        formatLKR={formatLKR}
        IsWishlisted={isWishlisted(selectedProduct?.id)}
        onToggleWishlist={p => toggleWishlist(p)}
        onAddToCart={(p, qty) => addToCart(p, qty)}
      />
    </section>
  );
};

export default BestSelling;
