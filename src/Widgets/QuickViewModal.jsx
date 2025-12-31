import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import gsap from "gsap";
import { useNavigate } from "react-router-dom";

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

  const stock = product?.stockCount ?? 0;
  const outOfStock = !!product?.outOfStock || stock === 0;

  const maxQty = useMemo(() => {
    if (outOfStock) return 1;
    return Math.max(1, stock);
  }, [outOfStock, stock]);

  useEffect(() => {
    if (open) setQty(1);
  }, [open, product?.id]);

  useLayoutEffect(() => {
    if (!open) return;

    const ctx = gsap.context(() => {
      gsap.set(overlayRef.current, { autoAlpha: 0 });

      const isMobile = window.matchMedia("(max-width: 767px)").matches;

      // keep same motion behavior; only sizing is changed via classes
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

  useEffect(() => {
    if (!open) return;

    const onEsc = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [open, onClose]);

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
      className="fixed inset-0 z-[999] flex items-center justify-center bg-black/65 px-3 sm:px-4"
      onMouseDown={(e) => {
        if (e.target === overlayRef.current) onClose?.();
      }}
    >
      <div
        ref={panelRef}
        onMouseDown={(e) => e.stopPropagation()}
        className="
          w-full bg-white shadow-2xl overflow-hidden

          /* ✅ MOBILE (DO NOT CHANGE) */
          max-w-[22rem] rounded-2xl

          /* ✅ MD+ responsive sizing (smaller, not huge) */
          md:max-w-2xl md:rounded-3xl
          lg:max-w-3xl
          xl:max-w-4xl

          /* ✅ prevent being too tall on md+ */
          md:max-h-[85vh] md:overflow-y-auto
        "
      >
        {/* Top bar */}
        <div className="px-4 py-3 md:px-5 md:py-4 border-b border-slate-200 bg-linear-to-r from-amber-50 via-white to-orange-50">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] md:text-xs font-semibold text-slate-500 tracking-wide">
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
            <div className="rounded-2xl md:rounded-3xl overflow-hidden border border-slate-200 bg-slate-50">
              <div className="relative aspect-[4/3] md:aspect-4/5">
                <img
                  src={product.image}
                  alt={product.name}
                  className="h-full w-full object-cover"
                />

                {product.inSale && (
                  <div className="absolute top-2 left-2 md:top-3 md:left-3 rounded-xl bg-linear-to-r from-pink-500 to-red-600 px-2.5 py-1 text-[10px] md:text-xs font-semibold text-white shadow-lg shadow-pink-500/20">
                    IN SALE
                  </div>
                )}

                <div
                  className={`absolute top-2 right-2 md:top-3 md:right-3 rounded-xl px-2.5 py-1 text-[10px] md:text-xs font-semibold text-white backdrop-blur shadow-lg
                    ${
                      outOfStock
                        ? "bg-black/60"
                        : "bg-linear-to-r from-emerald-500 to-teal-600 shadow-emerald-500/20"
                    }`}
                >
                  {outOfStock ? "Out of stock" : `Stock: ${stock}`}
                </div>

                <div className="absolute inset-x-0 bottom-0 h-16 md:h-24 bg-linear-to-t from-black/30 to-transparent" />
              </div>
            </div>

            {/* Details */}
            <div className="flex flex-col">
              {/* Price */}
              <div className="rounded-2xl md:rounded-3xl border border-slate-200 bg-linear-to-br from-slate-50 via-white to-amber-50 p-3 md:p-4">
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <p className="text-xs md:text-sm text-slate-600">Price</p>
                    <p className="text-lg md:text-xl font-semibold text-slate-900">
                      LKR {formatLKR(product.discountedPrice)}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-xs md:text-sm text-slate-500 line-through">
                      LKR {formatLKR(product.price)}
                    </p>
                    <p className="text-xs md:text-sm font-semibold text-red-600">
                      -{product.discountPercent}%
                    </p>
                  </div>
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
                            ? "bg-linear-to-r from-pink-500 to-red-600 text-white shadow-lg shadow-pink-500/25"
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
                      onClick={() => onAddToCart?.(product, qty)}
                      className={`w-full rounded-2xl px-3 py-2.5 md:px-4 md:py-3 text-sm font-semibold transition active:scale-95
                        ${
                          outOfStock
                            ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                            : "bg-linear-to-r from-amber-400 to-orange-500 text-white shadow-lg shadow-amber-500/25"
                        }`}
                    >
                      Add to cart
                    </button>
                  </div>

                  {!outOfStock && (
                    <p className="mt-2 text-[11px] text-slate-600">
                      Total:{" "}
                      <span className="font-semibold text-slate-900">
                        LKR {formatLKR(product.discountedPrice * qty)}
                      </span>
                    </p>
                  )}

                  {/* Mobile only */}
                  <button
                    type="button"
                    onClick={goToProduct}
                    className="mt-3 w-full md:hidden rounded-2xl px-4 py-2.5 text-sm font-semibold text-white
                               bg-slate-900 shadow-lg shadow-slate-900/20 active:scale-95 transition"
                  >
                    View more
                  </button>
                </div>
              </div>

              {/* md+ only (unchanged extra details) */}
              <div className="hidden md:block">
                <div className="mt-4 rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs text-slate-700">
                    Pay from{" "}
                    <span className="font-semibold">
                      {product.minInstallments}+
                    </span>{" "}
                    instalments with{" "}
                    <span className="font-semibold">
                      {product.paymentProvider}
                    </span>
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Example: LKR {formatLKR(product.price)} /{" "}
                    {product.minInstallments} = LKR{" "}
                    {formatLKR(
                      Math.round(product.price / product.minInstallments)
                    )}
                  </p>
                </div>

                {(product.category ||
                  product.brand ||
                  product.sku ||
                  product.description) && (
                  <div className="mt-4 rounded-3xl border border-slate-200 bg-white p-4">
                    <p className="text-xs font-semibold text-slate-600 mb-3">
                      Details
                    </p>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                      {product.category && (
                        <div>
                          <p className="text-xs text-slate-500">Category</p>
                          <p className="font-semibold text-slate-900">
                            {product.category}
                          </p>
                        </div>
                      )}

                      {product.brand && (
                        <div>
                          <p className="text-xs text-slate-500">Brand</p>
                          <p className="font-semibold text-slate-900">
                            {product.brand}
                          </p>
                        </div>
                      )}

                      {product.sku && (
                        <div>
                          <p className="text-xs text-slate-500">SKU</p>
                          <p className="font-semibold text-slate-900">
                            {product.sku}
                          </p>
                        </div>
                      )}

                      {typeof product.weight !== "undefined" && (
                        <div>
                          <p className="text-xs text-slate-500">Weight</p>
                          <p className="font-semibold text-slate-900">
                            {product.weight}
                          </p>
                        </div>
                      )}
                    </div>

                    {product.description && (
                      <p className="mt-3 text-sm text-slate-600 leading-relaxed">
                        {product.description}
                      </p>
                    )}
                  </div>
                )}

                <p className="mt-3 text-[11px] text-slate-500">
                  Press <span className="font-semibold">Esc</span> or click
                  outside to close.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuickViewModal;
