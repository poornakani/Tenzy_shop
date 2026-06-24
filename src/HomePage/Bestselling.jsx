import React, { useEffect, useMemo, useRef, useState } from "react";
import QuickViewModal from "@/Widgets/QuickViewModal";
import { useWishlist } from "@/Context/WishlistContext";
import { Heart, Eye, ShoppingBag, ChevronRight } from "lucide-react";
import { useCart } from "@/Context/CartContext";
import { useToast } from "@/Context/ToastContext";
import { useNavigate } from "react-router-dom";
import {
  productsApi,
  brandsApi,
  productImageApi,
  productVariantsApi,
} from "@/services/api";

const TEAL   = "#2BB9B4";
const ORANGE = "#E8522A";

/* ── helpers ──────────────────────────────────────────────────────── */
function formatLKR(v) {
  return new Intl.NumberFormat("en-LK").format(v);
}
function isSaleEnabled(value) {
  return value === true || value === 1 || String(value).toLowerCase() === "true";
}
function asArray(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.Data)) return value.Data;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.Items)) return value.Items;
  if (Array.isArray(value?.response)) return value.response;
  if (Array.isArray(value?.Response)) return value.Response;
  return [];
}
function getVariantPrice(variant) {
  return Number(
    variant?.sellingPrice ?? variant?.SellingPrice
    ?? variant?.finalSellingPrice ?? variant?.FinalSellingPrice
    ?? variant?.price ?? variant?.Price ?? 0
  );
}
function getVariantStock(variant) {
  return Number(
    variant?.stock ?? variant?.Stock
    ?? variant?.stockQuantity ?? variant?.StockQuantity
    ?? variant?.availableStock ?? variant?.AvailableStock ?? 0
  );
}
function getVariantName(variant) {
  return variant?.variantName ?? variant?.VariantName ?? variant?.name ?? variant?.Name ?? "";
}
function getPaymentName(option) {
  return option?.paymentProvider ?? option?.PaymentProvider
    ?? option?.paymentType ?? option?.PaymentType
    ?? option?.paymentTypeName ?? option?.PaymentTypeName
    ?? option?.name ?? option?.Name ?? null;
}
function getPaymentInstalment(option) {
  return option?.minInstallments ?? option?.MinInstallments
    ?? option?.instalment ?? option?.Instalment
    ?? option?.installments ?? option?.Installments ?? null;
}
function mockRating(id)  { return (4.1 + ((id * 17) % 10) * 0.08).toFixed(1); }
function mockReviews(id) { return 68 + ((id * 31) % 110); }

/* ── Stars ────────────────────────────────────────────────────────── */
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

/* ── normalise raw API product ────────────────────────────────────── */
function normalizeProd(raw, lookups = {}) {
  const id        = raw.productId ?? raw.ProductId ?? raw.id ?? 0;
  const priceLkr  = parseFloat(raw.priceLkr ?? raw.priceLKR ?? raw.price ?? 0);
  const origPrice = parseFloat(raw.originalPrice ?? raw.OriginalPrice ?? priceLkr);
  const sellPrice = parseFloat(raw.sellingPrice  ?? raw.SellingPrice  ?? priceLkr ?? origPrice);
  const basePrice = origPrice > 0 ? origPrice : sellPrice;
  const isSale    = raw.isSale ?? raw.IsSale ?? raw.inSale ?? raw.InSale ?? raw.insale ?? false;
  const disc      = Math.round(parseFloat(raw.discountRate ?? raw.DiscountRate ?? raw.discountPercent ?? 0))
    || (basePrice > 0 && sellPrice < basePrice ? Math.round((1 - sellPrice / basePrice) * 100) : 0);
  const stock = parseInt(raw.stockQuantity ?? raw.StockQuantity ?? raw.stockQty ?? raw.stockCount ?? raw.stock ?? 0, 10);

  const rawImgs = Array.isArray(raw.images) && raw.images.length
    ? raw.images
    : (lookups.imagesByProductId?.get(id) ?? []);

  const sortedImgs = [...rawImgs].sort((a, b) => {
    const aP = (a.isPrimary ?? a.IsPrimary) ? 1 : 0;
    const bP = (b.isPrimary ?? b.IsPrimary) ? 1 : 0;
    if (bP !== aP) return bP - aP;
    return (a.sortOrder ?? a.SortOrder ?? 0) - (b.sortOrder ?? b.SortOrder ?? 0);
  });
  const primary = raw.primaryImageUrl ?? raw.PrimaryImageUrl ?? raw.imageUrl ?? raw.ImageUrl
    ?? sortedImgs.find(i => i.isPrimary || i.IsPrimary)?.imageUrl
    ?? sortedImgs[0]?.imageUrl ?? null;

  return {
    id,
    name:            raw.name ?? raw.Name ?? "",
    price:           basePrice,
    discountPercent: disc,
    discountedPrice: disc > 0 ? Math.round(basePrice * (1 - disc / 100)) : basePrice,
    inSale:          isSaleEnabled(isSale),
    stockCount:      stock,
    outOfStock:      stock === 0,
    image:           primary,
    images:          sortedImgs,    // full image objects — card uses for carousel + variant split
    brand:           raw.brandName ?? raw.BrandName ?? raw.brand
      ?? lookups.brandNamesById?.get(raw.brandId ?? raw.BrandId) ?? "",
    brandId:         raw.brandId ?? raw.BrandId ?? 0,
    showVolume:      raw.showVolume      ?? raw.ShowVolume      ?? false,
    showWeight:      raw.showWeight      ?? raw.ShowWeight      ?? false,
    showTabletCount: raw.showTabletCount ?? raw.ShowTabletCount ?? false,
    paymentProvider: raw.paymentProvider ?? raw.PaymentProvider ?? raw.PaymentType ?? raw.paymentType ?? null,
    minInstallments: raw.minInstallments ?? raw.MinInstallments ?? raw.Instalment ?? raw.instalment ?? null,
    variants:        [],  // filled in by second fetch
  };
}

function dedupeProducts(products) {
  const byId = new Map();
  products.forEach(p => {
    const ex = byId.get(p.id);
    if (!ex) { byId.set(p.id, p); return; }
    const preferred = (
      (p.inSale && !ex.inSale) || (!!p.image && !ex.image) || ((p.stockCount ?? 0) > (ex.stockCount ?? 0))
    ) ? p : ex;
    byId.set(p.id, preferred);
  });
  return [...byId.values()];
}

/* ── Modern Product Card Component ────────────────────────────────── */
function BestSellingCard({ p, addToCart, showToast, toggleWishlist, isWishlisted, openQuickView, navigate }) {
  const [activeImg,       setActiveImg]       = useState(0);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [isHovering,      setIsHovering]      = useState(false);
  const cardRef                              = useRef(null);

  // Split product-level vs variant-level images; build variant → url[] map
  const { productImages, variantImagesMap } = useMemo(() => {
    const productLvl = [];
    const vBuckets   = new Map();
    (p.images ?? []).forEach(img => {
      const vid = img.variantId ?? img.VariantId ?? null;
      if (vid) {
        const bucket = vBuckets.get(vid) ?? [];
        bucket.push(img);
        vBuckets.set(vid, bucket);
      } else {
        productLvl.push(img);
      }
    });
    const toUrls = imgs => imgs
      .map(img => img.imageUrl ?? img.ImageUrl)
      .filter(Boolean);
    const vMap = new Map();
    vBuckets.forEach((imgs, vid) => vMap.set(vid, toUrls(imgs)));
    const base = productLvl.length ? productLvl : (p.images ?? []);
    return { productImages: toUrls(base), variantImagesMap: vMap };
  }, [p.images]);

  useEffect(() => {
    const vs = p.variants ?? [];
    const first = vs.find(v => getVariantStock(v) > 0) ?? vs[0] ?? null;
    setSelectedVariant(first);
  }, [p.variants]);

  const displayImages = useMemo(() => {
    if (!selectedVariant) return productImages;
    const vid     = selectedVariant.VariantId ?? selectedVariant.variantId;
    const vImgs   = variantImagesMap.get(vid);
    return vImgs?.length ? vImgs : productImages;
  }, [selectedVariant, productImages, variantImagesMap]);

  useEffect(() => { setActiveImg(0); }, [displayImages]);

  const variants      = p.variants ?? [];
  const variantPrice  = selectedVariant ? getVariantPrice(selectedVariant) : 0;
  const displayPrice  = variantPrice > 0 ? variantPrice : p.discountedPrice;
  const displayStock  = selectedVariant ? getVariantStock(selectedVariant) : p.stockCount;
  const outOfStock    = displayStock === 0;
  const isLow         = displayStock > 0 && displayStock <= 5;
  const wishlisted    = isWishlisted(p.id);
  const rating        = parseFloat(mockRating(p.id));
  const reviews       = mockReviews(p.id);

  const prev = (e) => {
    e.stopPropagation();
    setActiveImg(i => i === 0 ? displayImages.length - 1 : i - 1);
  };
  const next = (e) => {
    e.stopPropagation();
    setActiveImg(i => i === displayImages.length - 1 ? 0 : i + 1);
  };

  return (
    <article
      ref={cardRef}
      className="bs-card group relative bg-white rounded-xl overflow-hidden flex flex-col cursor-pointer transition-all duration-500"
      style={{
        boxShadow: isHovering
          ? "0 20px 50px rgba(232,82,42,0.15), 0 0 40px rgba(43,185,180,0.08)"
          : "0 4px 16px rgba(0,0,0,0.08)",
        border: "1px solid rgba(232,82,42,0.10)",
        transform: isHovering ? "translateY(-8px)" : "translateY(0)",
      }}
      onClick={() => navigate(`/product/${p.id}`)}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {/* Image Container */}
      <div className="relative aspect-4/5 overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 shrink-0">
        {displayImages.length > 0 ? (
          <img
            src={displayImages[activeImg]}
            alt={p.name}
            onError={e => { e.currentTarget.style.display = "none"; }}
            className="h-full w-full object-cover transition-transform duration-700"
            style={{ transform: isHovering ? "scale(1.08)" : "scale(1)" }}
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center bg-gray-100">
            <ShoppingBag size={40} className="text-gray-300" />
          </div>
        )}

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Badge Container */}
        <div className="absolute top-3 left-3 z-10 flex flex-col gap-2">
          {p.inSale && !outOfStock && (
            <span className="rounded-lg px-3 py-1 text-[10px] font-bold uppercase text-white tracking-wider backdrop-blur-sm" style={{ background: `${ORANGE}ee` }}>
              {p.discountPercent > 0 ? `${p.discountPercent}% OFF` : "SALE"}
            </span>
          )}
          {isLow && (
            <span className="rounded-lg px-3 py-1 text-[10px] font-bold uppercase text-white tracking-wider backdrop-blur-sm" style={{ background: "#f59e0bee" }}>
              Low Stock
            </span>
          )}
          {p.id % 4 === 0 && !outOfStock && (
            <span className="rounded-lg px-3 py-1 text-[10px] font-bold uppercase text-white tracking-wider backdrop-blur-sm" style={{ background: `${TEAL}ee` }}>
              New
            </span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="absolute top-3 right-3 z-10 flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300">
          <button
            type="button"
            onClick={e => { e.stopPropagation(); toggleWishlist(p); }}
            aria-label="Wishlist"
            className="flex items-center justify-center w-9 h-9 rounded-full transition-all duration-300 backdrop-blur-md hover:scale-110"
            style={{ background: wishlisted ? "rgba(239,68,68,0.95)" : "rgba(255,255,255,0.95)" }}
          >
            <Heart size={16} className={wishlisted ? "fill-red-500 text-red-500" : "text-gray-700"} strokeWidth={2} />
          </button>
          <button
            type="button"
            onClick={e => { e.stopPropagation(); openQuickView(p); }}
            className="flex items-center justify-center w-9 h-9 rounded-full transition-all duration-300 hover:scale-110"
            style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)" }}
          >
            <Eye size={16} className="text-white" strokeWidth={2} />
          </button>
        </div>

        {/* Arrow buttons */}
        {displayImages.length > 1 && (
          <>
            <button type="button" onClick={prev}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:bg-white active:scale-90">
              <ChevronRight size={16} color={ORANGE} style={{ transform: "rotate(180deg)" }} strokeWidth={2.5} />
            </button>
            <button type="button" onClick={next}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:bg-white active:scale-90">
              <ChevronRight size={16} color={ORANGE} strokeWidth={2.5} />
            </button>
          </>
        )}

        {/* Dot indicators */}
        {displayImages.length > 1 && (
          <div className="absolute bottom-3 inset-x-0 z-10 flex items-center justify-center gap-1.5 pointer-events-none">
            {displayImages.map((_, i) => (
              <button key={i} type="button"
                onClick={e => { e.stopPropagation(); setActiveImg(i); }}
                className="pointer-events-auto rounded-full transition-all duration-300"
                style={{
                  width: i === activeImg ? "20px" : "6px",
                  height: "6px",
                  background: i === activeImg ? "white" : "rgba(255,255,255,0.5)",
                }}
              />
            ))}
          </div>
        )}

        {/* Out of stock overlay */}
        {outOfStock && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <span className="text-sm font-bold tracking-widest uppercase text-white">Out of Stock</span>
          </div>
        )}
      </div>

      {/* Card Content */}
      <div className="flex flex-col flex-1 p-4">
        <span className="text-[9px] font-bold uppercase tracking-[0.1em] mb-1" style={{ color: TEAL }}>
          {p.brand}
        </span>

        <h3 className="text-sm font-semibold text-gray-900 leading-snug line-clamp-2 flex-1 mb-2">
          {p.name}
        </h3>

        <div className="flex items-center gap-1.5 mb-3">
          <Stars value={rating} />
          <span className="text-[9px] text-gray-500 font-medium">({reviews})</span>
        </div>

        {/* Price */}
        <div className="rounded-lg p-3 mb-3" style={{ background: `${ORANGE}08`, border: `1px solid ${ORANGE}20` }}>
          <p className="text-[9px] font-bold uppercase tracking-wider text-gray-600 mb-1">Price</p>
          <div className="flex items-baseline gap-2">
            <span className="text-base font-bold text-gray-900">LKR {formatLKR(displayPrice)}</span>
            {!selectedVariant && p.discountPercent > 0 && (
              <span className="text-[9px] font-bold text-gray-500 line-through">LKR {formatLKR(p.price)}</span>
            )}
          </div>
        </div>

        {/* Stock bar */}
        <div className="mb-3">
          <div className="h-1.5 rounded-full bg-gray-200 overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500"
              style={{
                width: outOfStock ? "0%" : `${Math.min(100, (displayStock / 20) * 100)}%`,
                background: isLow ? "#f59e0b" : TEAL,
              }} />
          </div>
          <p className="text-[9px] mt-1 font-medium" style={{ color: isLow ? "#f59e0b" : "#9ca3af" }}>
            {outOfStock ? "Out of stock" : isLow ? `Only ${displayStock} left!` : `In stock`}
          </p>
        </div>

        {/* Add to cart button */}
        <button type="button" disabled={outOfStock}
          onClick={e => {
            e.stopPropagation();
            const vid = selectedVariant?.VariantId ?? selectedVariant?.variantId;
            const cartItem = selectedVariant ? {
              ...p,
              id:              `${p.id}-v${vid}`,
              discountedPrice: displayPrice,
              price:           displayPrice,
              stockCount:      displayStock,
              variantId:       vid,
              variantName:     getVariantName(selectedVariant),
            } : p;
            addToCart(cartItem, 1);
            const vname = selectedVariant ? ` (${getVariantName(selectedVariant)})` : "";
            showToast({ title: "Added to cart", message: `${p.name}${vname} × 1`, image: p.image });
          }}
          className="w-full flex items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-bold uppercase tracking-wider transition-all duration-300 active:scale-95"
          style={outOfStock
            ? { background: "#f3f4f6", color: "#9ca3af", cursor: "not-allowed" }
            : { background: ORANGE, color: "white", boxShadow: `0 4px 12px ${ORANGE}40` }
          }>
          <ShoppingBag size={13} strokeWidth={2.5} />
          {outOfStock ? "Unavailable" : "Add to Bag"}
        </button>
      </div>
    </article>
  );
}

/* ══════════════════════════════════════════════════════════════════ */
const BestSelling = () => {
  const [allProducts,     setAllProducts]     = useState([]);
  const [quickViewOpen,   setQuickViewOpen]   = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const { toggleWishlist, isWishlisted } = useWishlist();
  const { addToCart }  = useCart();
  const { showToast }  = useToast();
  const navigate       = useNavigate();
  const wrapRef        = useRef(null);

  useEffect(() => {
    Promise.allSettled([
      productsApi.getAll(),
      brandsApi.getAll(),
      productImageApi.getAll(),
    ]).then(([productsRes, brandsRes, imagesRes]) => {
      const products = asArray(productsRes.value);
      const brands   = asArray(brandsRes.value);
      const images   = asArray(imagesRes.value);

      const brandNamesById = new Map(
        brands.map(b => [b.brandId ?? b.BrandId, b.name ?? b.Name ?? b.brandName ?? b.BrandName ?? ""])
      );
      const imagesByProductId = images.reduce((map, img) => {
        const pid = img.productId ?? img.ProductId;
        if (pid == null || (img.isActive ?? img.IsActive) === false) return map;
        const list = map.get(pid) ?? [];
        list.push(img);
        map.set(pid, list);
        return map;
      }, new Map());

      const saleProducts = dedupeProducts(
        products.map(p => normalizeProd(p, { brandNamesById, imagesByProductId }))
      ).filter(p => p.inSale);

      setAllProducts(saleProducts);

      // Second pass: fetch variants + payment options per product
      Promise.allSettled(
        saleProducts.map(product =>
          Promise.allSettled([
            productVariantsApi.getVisible(product.id).catch(() => []),
            productsApi.getPaymentOptions(product.id).catch(() => []),
          ]).then(([variantsRes, paymentsRes]) => {
            const variants = variantsRes.status === "fulfilled" ? asArray(variantsRes.value) : [];
            const payments = paymentsRes.status === "fulfilled" ? asArray(paymentsRes.value) : [];
            const firstPricedVariant = variants.find(v => getVariantStock(v) > 0 && getVariantPrice(v) > 0)
              ?? variants.find(v => getVariantPrice(v) > 0) ?? null;
            const totalStock = variants.reduce((sum, v) => sum + Math.max(0, getVariantStock(v)), 0);
            const firstPayment = payments.find(o => getPaymentName(o) || getPaymentInstalment(o));
            const vPrice = getVariantPrice(firstPricedVariant);
            return {
              ...product,
              variants,
              paymentOptions:  payments,
              price:           vPrice > 0 ? vPrice : product.price,
              discountedPrice: vPrice > 0 ? Math.round(vPrice) : product.discountedPrice,
              discountPercent: vPrice > 0 ? 0 : product.discountPercent,
              stockCount:      variants.length > 0 ? totalStock : product.stockCount,
              outOfStock:      variants.length > 0 ? totalStock === 0 : product.outOfStock,
              paymentProvider: getPaymentName(firstPayment)    ?? product.paymentProvider,
              minInstallments: getPaymentInstalment(firstPayment) ?? product.minInstallments,
            };
          })
        )
      ).then(results => {
        setAllProducts(results.map((r, i) => r.status === "fulfilled" ? r.value : saleProducts[i]));
      });
    }).catch(console.error);
  }, []);

  const displayed = useMemo(() => allProducts.slice(0, 20), [allProducts]);

  // Animations disabled for performance

  const openQuickView  = p  => { setSelectedProduct(p); setQuickViewOpen(true); };
  const closeQuickView = () => { setQuickViewOpen(false); setSelectedProduct(null); };

  return (
    <section ref={wrapRef} className="w-full py-16 sm:py-20 md:py-28 relative overflow-hidden bg-gradient-to-b from-white via-white to-blue-50/20">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">

        {/* Modern Header */}
        <div className="mb-12 sm:mb-14 md:mb-16">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 mb-8">
            {/* Left: Title & Description */}
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 mb-4">
                <span className="w-1 h-3 rounded-full" style={{ background: ORANGE }} />
                <span className="text-xs sm:text-sm font-bold tracking-wider uppercase text-orange-500">
                  Top Picks for You
                </span>
              </div>

              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 leading-tight mb-3">
                Best <span className="text-transparent bg-clip-text" style={{ backgroundImage: `linear-gradient(135deg, ${ORANGE} 0%, ${TEAL} 100%)` }}>Selling</span>
              </h2>
              <p className="text-sm sm:text-base text-slate-600 max-w-xl leading-relaxed">
                Discover the most loved, trusted, and best-rated beauty products loved by thousands of customers.
              </p>
            </div>

            {/* Right: View All Button */}
            <button
              onClick={() => navigate("/products")}
              className="self-start sm:self-end px-6 sm:px-8 py-3 rounded-full bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white font-bold text-sm sm:text-base transition-all duration-300 hover:shadow-lg hover:shadow-orange-500/30 active:scale-95 whitespace-nowrap"
            >
              View All →
            </button>
          </div>
        </div>

        {/* Product Grid - Modern Layout */}
        <div className="grid gap-5 sm:gap-6 grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5" style={{ perspective: "1000px" }}>
          {displayed.map(p => (
            <BestSellingCard
              key={p.id}
              p={p}
              addToCart={addToCart}
              showToast={showToast}
              toggleWishlist={toggleWishlist}
              isWishlisted={isWishlisted}
              openQuickView={openQuickView}
              navigate={navigate}
            />
          ))}
        </div>

        {displayed.length === 0 && (
          <div className="py-20 text-center text-gray-400 text-sm">No products yet.</div>
        )}

        {/* CTA Button */}
        <div className="flex justify-center">
          <button onClick={() => navigate("/products")}
            className="group inline-flex items-center gap-2 rounded-full px-8 py-4 text-sm font-bold text-white transition-all duration-300 hover:shadow-xl hover:scale-105 active:scale-95"
            style={{
              background: `linear-gradient(135deg, ${ORANGE} 0%, ${TEAL} 100%)`,
              boxShadow: `0 12px 32px rgba(232,82,42,0.35)`,
            }}>
            <span>Explore All Products</span>
            <ChevronRight size={18} strokeWidth={2.5} className="group-hover:translate-x-1 transition-transform" />
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
