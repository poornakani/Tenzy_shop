import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import gsap from "gsap";
import { useNavigate } from "react-router-dom";

/* ── Variant helpers ───────────────────────────────────────────── */
function vId(v)    { return v?.VariantId    ?? v?.variantId    ?? v?.id    ?? v?.Id;    }
function vName(v)  { return v?.VariantName  ?? v?.variantName  ?? v?.name  ?? v?.Name  ?? ""; }
function vPrice(v) { return Number(v?.SellingPrice ?? v?.sellingPrice ?? v?.FinalSellingPrice ?? v?.finalSellingPrice ?? v?.Price ?? v?.price ?? 0); }
function vStock(v) { return Number(v?.Stock ?? v?.stock ?? v?.StockQuantity ?? v?.stockQuantity ?? v?.AvailableStock ?? v?.availableStock ?? 0); }

const QuickViewModal = ({
  open,
  product,
  onClose,
  formatLKR,
  IsWishlisted = false,
  onToggleWishlist,
  onAddToCart,
}) => {
  const navigate = useNavigate();

  const overlayRef = useRef(null);
  const panelRef = useRef(null);

  const [qty, setQty] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState(null);

  const variants = useMemo(() => product?.variants ?? [], [product]);

  // Auto-select first in-stock variant when modal opens or product changes
  useEffect(() => {
    if (!open) return;
    const first = variants.find(v => vStock(v) > 0) ?? variants[0] ?? null;
    setSelectedVariant(first);
    setQty(1);
  }, [open, product?.id, variants]);

  const variantPrice  = selectedVariant ? vPrice(selectedVariant) : 0;
  const displayPrice  = selectedVariant
    ? Math.round(variantPrice > 0 ? variantPrice : (product?.discountedPrice ?? 0))
    : (product?.discountedPrice ?? 0);
  const displayStock  = selectedVariant
    ? vStock(selectedVariant)
    : (product?.stockCount ?? 0);
  const outOfStock    = selectedVariant ? displayStock === 0 : (!!product?.outOfStock || displayStock === 0);

  const maxQty = useMemo(() => {
    if (outOfStock) return 1;
    return Math.max(1, displayStock);
  }, [outOfStock, displayStock]);


  useEffect(() => {
    if (!open) return;

    const onEsc = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [open, onClose]);

  useLayoutEffect(() => {
    if (!open) return;

    const ctx = gsap.context(() => {
      gsap.set(overlayRef.current, { autoAlpha: 0 });

      const isMobile = window.matchMedia("(max-width: 767px)").matches;

      gsap.set(panelRef.current, { autoAlpha: 0, y: 18, scale: 0.985 });

      gsap
        .timeline({ defaults: { ease: "power3.out" } })
        .to(overlayRef.current, { autoAlpha: 1, duration: 0.18 })
        .to(
          panelRef.current,
          {
            autoAlpha: 1,
            y: 0,
            scale: 1,
            duration: isMobile ? 0.22 : 0.24,
          },
          "-=0.06"
        );
    });

    return () => ctx.revert();
  }, [open]);

  const decQty = () => setQty((v) => Math.max(1, v - 1));
  const incQty = () => setQty((v) => Math.min(maxQty, v + 1));

  const goToProduct = () => {
    onClose?.();
    navigate(`/product/${product.id}`);
  };

  if (!open || !product) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-999 flex items-center justify-center bg-black/65 px-3 sm:px-4"
      onMouseDown={(e) => {
        if (e.target === overlayRef.current) onClose?.();
      }}
    >
      <div
        ref={panelRef}
        onMouseDown={(e) => e.stopPropagation()}
        className="
          w-full bg-white shadow-2xl overflow-hidden

          /*  MOBILE (DO NOT CHANGE) */
          max-w-22rem rounded-2xl

          /*  MD+ responsive sizing (smaller, not huge) */
          md:max-w-2xl md:rounded-3xl
          lg:max-w-3xl
          xl:max-w-4xl

          /*  prevent being too tall on md+ */
          md:max-h-[85vh] md:overflow-y-auto
        "
      >
        {/* Top bar */}
        <div className="px-4 py-3 md:px-5 md:py-4 border-b border-slate-200 bg-linear-to-r from-teal-50 via-white to-orange-50">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] md:text-xs font-semibold tracking-wide" style={{ color: "#2BB9B4" }}>
                QUICK VIEW
              </p>
              <h3 className="text-base md:text-lg lg:text-xl font-semibold text-slate-900 leading-snug truncate">
                {product.name}
              </h3>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-xl border border-slate-200 bg-white px-3 py-2 hover:bg-slate-50 active:scale-95 transition"
              aria-label="Close"
              title="Close"
            >
              <span className="text-lg text-slate-800">✕</span>
            </button>
          </div>
        </div>

        {/* Content wrapper (mobile scroll stays same; md+ scroll handled by panel itself) */}
        <div className="max-h-[75vh] overflow-y-auto md:max-h-none md:overflow-visible">
          <div className="grid gap-4 p-4 md:gap-5 md:p-5 md:grid-cols-2">
            {/* Image */}
            <div className="self-start rounded-2xl md:rounded-3xl overflow-hidden border border-slate-200 bg-slate-50">
              <div className="relative aspect-4/3 md:aspect-4/5">
                <img
                  src={product.image}
                  alt={product.name}
                  className="h-full w-full object-cover"
                />

                {product.inSale && (
                  <div className="absolute top-2 left-2 md:top-3 md:left-3 rounded-xl bg-tenzy-orange px-2.5 py-1 text-[10px] md:text-xs font-semibold text-white shadow-lg shadow-tenzy-orange/25">
                    IN SALE
                  </div>
                )}

                <div
                  className={`absolute top-2 right-2 md:top-3 md:right-3 rounded-xl px-2.5 py-1 text-[10px] md:text-xs font-semibold text-white backdrop-blur shadow-lg
                    ${
                      outOfStock
                        ? "bg-black/60"
                        : "bg-linear-to-r from-teal-500 to-teal-600 shadow-teal-500/20"
                    }`}
                >
                  {outOfStock ? "Out of stock" : `Stock: ${displayStock}`}
                </div>

                <div className="absolute inset-x-0 bottom-0 h-16 md:h-24 bg-linear-to-t from-black/30 to-transparent" />
              </div>
            </div>

            {/* Details */}
            <div className="flex flex-col">

              {/* Variant selector */}
              {variants.length > 0 && (
                <div className="mb-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-2.5 px-0.5"
                    style={{ color: "#2BB9B4" }}>
                    {product.showTabletCount ? "Select count" : product.showWeight ? "Select weight" : "Select size"}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {variants.map(v => {
                      const vid      = vId(v);
                      const name     = vName(v);
                      const price    = vPrice(v);
                      const stk      = vStock(v);
                      const soldOut  = stk === 0;
                      const lowStock = !soldOut && stk < 10;
                      const isActive = selectedVariant && String(vId(selectedVariant)) === String(vid);
                      const vol  = v.Volume  ?? v.volume;
                      const wt   = v.Weight  ?? v.weight;
                      const tabs = Number(v.TabsCount ?? v.tabsCount ?? 0);
                      const specLines = [
                        product.showWeight      && wt  && Number(wt) > 0 ? `Weight: ${wt}g`    : null,
                        product.showVolume      && vol                    ? `Volume: ${vol}ml`  : null,
                        product.showTabletCount && tabs > 0               ? `Tablets: ${tabs}`  : null,
                      ].filter(Boolean);
                      const fallbackSpec = specLines.join(" · ");

                      return (
                        <button key={vid} type="button" disabled={soldOut}
                          onClick={() => { setSelectedVariant(v); setQty(1); }}
                          className="relative flex flex-col gap-1 rounded-2xl border-2 p-3 text-left transition-all duration-200"
                          style={{
                            borderColor: isActive ? "#2BB9B4" : soldOut ? "#f1f5f9" : "#e2e8f0",
                            background:  isActive
                              ? "linear-gradient(135deg,rgba(43,185,180,0.09),rgba(43,185,180,0.03))"
                              : soldOut ? "#fafafa" : "white",
                            opacity:   soldOut ? 0.5 : 1,
                            cursor:    soldOut ? "not-allowed" : "pointer",
                            boxShadow: isActive
                              ? "0 0 0 3px rgba(43,185,180,0.15),0 4px 14px rgba(43,185,180,0.12)"
                              : "0 1px 3px rgba(0,0,0,0.05)",
                          }}>

                          {/* Sold-out stripe overlay */}
                          {soldOut && (
                            <span className="pointer-events-none absolute inset-0 rounded-2xl overflow-hidden">
                              <span className="absolute inset-0" style={{ background: "repeating-linear-gradient(-45deg,transparent,transparent 7px,rgba(148,163,184,0.12) 7px,rgba(148,163,184,0.12) 8px)" }} />
                            </span>
                          )}

                          {/* Active dot */}
                          {isActive && (
                            <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full"
                              style={{ background: "#2BB9B4" }} />
                          )}

                          {/* Name */}
                          <span className={`text-sm font-bold leading-tight pr-4 ${isActive ? "text-tenzy-teal" : soldOut ? "text-slate-400" : "text-slate-800"}`}>
                            {name || fallbackSpec || "Option"}
                          </span>

                          {/* Labeled spec lines */}
                          {name && specLines.map((line, i) => (
                            <span key={i} className="text-[10px] font-medium text-slate-400 leading-snug">{line}</span>
                          ))}

                          {/* Price */}
                          {price > 0 && (
                            <span className={`text-xs font-bold mt-1 ${isActive ? "text-tenzy-teal" : "text-slate-600"}`}>
                              LKR {formatLKR(price)}
                            </span>
                          )}

                          {/* Stock pill */}
                          <span className={`self-start mt-1 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
                            soldOut  ? "bg-red-50 text-red-400"
                            : lowStock ? "bg-amber-50 text-amber-500"
                            : isActive ? "bg-teal-50 text-teal-600"
                            : "bg-emerald-50 text-emerald-600"
                          }`}>
                            {soldOut ? "Sold out" : lowStock ? `Only ${stk} left` : "In stock"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Price */}
              <div className="rounded-2xl md:rounded-3xl border border-slate-200 bg-linear-to-br from-teal-50 via-white to-orange-50 p-3 md:p-4">
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <p className="text-xs md:text-sm text-slate-600">Price</p>
                    <p className="text-lg md:text-xl font-semibold text-slate-900">
                      LKR {formatLKR(displayPrice)}
                    </p>
                  </div>

                  {!selectedVariant && product.discountPercent > 0 && (
                    <div className="text-right">
                      <p className="text-xs md:text-sm text-slate-500 line-through">
                        LKR {formatLKR(product.price)}
                      </p>
                      <p className="text-xs md:text-sm font-semibold text-tenzy-orange">
                        -{product.discountPercent}%
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Quantity + Actions */}
              <div className="mt-3 md:mt-4 grid grid-cols-1 gap-3">
                <div className="rounded-2xl md:rounded-3xl border border-slate-200 bg-white p-3">
                  <p className="text-[11px] md:text-xs font-semibold text-slate-600 mb-2">
                    Quantity
                  </p>

                  <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-2 py-2">
                    <button
                      type="button"
                      onClick={decQty}
                      disabled={outOfStock || qty <= 1}
                      className={`h-9 w-9 md:h-10 md:w-10 rounded-xl font-bold transition
                        ${
                          outOfStock || qty <= 1
                            ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                            : "bg-white text-slate-900 hover:bg-slate-100 active:scale-95"
                        }`}
                    >
                      −
                    </button>

                    <div className="text-sm font-semibold text-slate-900">
                      {qty}
                    </div>

                    <button
                      type="button"
                      onClick={incQty}
                      disabled={outOfStock || qty >= maxQty}
                      className={`h-9 w-9 md:h-10 md:w-10 rounded-xl font-bold transition
                        ${
                          outOfStock || qty >= maxQty
                            ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                            : "bg-white text-slate-900 hover:bg-slate-100 active:scale-95"
                        }`}
                    >
                      +
                    </button>
                  </div>

                  {!outOfStock && (
                    <p className="mt-2 text-[11px] text-slate-500">
                      Max: {maxQty}
                    </p>
                  )}
                </div>

                <div className="rounded-2xl md:rounded-3xl border border-slate-200 bg-white p-3">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => onToggleWishlist?.(product)}
                      className={`w-full rounded-2xl px-3 py-2.5 md:px-4 md:py-3 text-sm font-semibold transition active:scale-95
                        ${
                          IsWishlisted
                            ? "bg-tenzy-orange text-white shadow-lg shadow-tenzy-orange/25"
                            : "bg-linear-to-r from-slate-100 to-slate-200 text-slate-900"
                        }`}
                    >
                      <span className="inline-flex items-center justify-center gap-2">
                        <span className="text-base">
                          {IsWishlisted ? "♥" : "♡"}
                        </span>
                        Wishlist
                      </span>
                    </button>

                    <button
                      type="button"
                      disabled={outOfStock}
                      onClick={() => {
                        const vid = selectedVariant ? vId(selectedVariant) : null;
                        const cartItem = selectedVariant ? {
                          ...product,
                          id: `${product.id}-v${vid}`,
                          discountedPrice: displayPrice,
                          price: displayPrice,
                          stockCount: displayStock,
                          variantId: vid,
                          variantName: vName(selectedVariant),
                        } : product;
                        onAddToCart?.(cartItem, qty);
                      }}
                      className={`w-full rounded-2xl px-3 py-2.5 md:px-4 md:py-3 text-sm font-semibold transition active:scale-95
                        ${
                          outOfStock
                            ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                            : "bg-tenzy-teal text-white shadow-lg shadow-tenzy-teal/25"
                        }`}
                    >
                      Add to cart
                    </button>
                  </div>

                  {!outOfStock && (
                    <p className="mt-2 text-[11px] text-slate-600">
                      Total:{" "}
                      <span className="font-semibold text-slate-900">
                        LKR {formatLKR(displayPrice * qty)}
                      </span>
                    </p>
                  )}

                  {/* Mobile only */}
                  <button
                    type="button"
                    onClick={goToProduct}
                    className="mt-3 w-full md:hidden rounded-2xl px-4 py-2.5 text-sm font-semibold text-white
                               bg-tenzy-teal shadow-lg shadow-tenzy-teal/20 active:scale-95 transition hover:opacity-90"
                  >
                    View more
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuickViewModal;
