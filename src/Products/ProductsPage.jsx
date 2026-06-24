// ProductsPage.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  Search,
  SlidersHorizontal,
  ChevronDown,
  X,
  Check,
  ArrowUpDown,
  Tag,
} from "lucide-react";

import { useWishlist } from "../Context/WishlistContext";
import Navibar from "@/HomePage/Navibar";
import { useCart } from "@/Context/CartContext";
import { useToast } from "@/Context/ToastContext";
import Footer from "@/HomePage/Footer";
import {
  productsApi,
  brandsApi,
  productImageApi,
  categoriesApi,
  productVariantsApi,
  concernsApi,
} from "../services/api";

function parseConcernIds(raw) {
  if (Array.isArray(raw)) {
    return raw
      .map((value) => Number(value))
      .filter((value) => Number.isInteger(value) && value > 0);
  }

  if (typeof raw === "string") {
    return raw
      .split(",")
      .map((value) => Number(value.trim()))
      .filter((value) => Number.isInteger(value) && value > 0);
  }

  return [];
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

function variantIdOf(variant) {
  return variant?.VariantId ?? variant?.variantId ?? variant?.id ?? variant?.Id;
}

function variantNameOf(variant) {
  return variant?.VariantName ?? variant?.variantName ?? variant?.name ?? variant?.Name ?? "";
}

function variantPriceOf(variant) {
  return Number(
    variant?.SellingPrice
    ?? variant?.sellingPrice
    ?? variant?.FinalSellingPrice
    ?? variant?.finalSellingPrice
    ?? variant?.Price
    ?? variant?.price
    ?? 0
  );
}

function variantStockOf(variant, fallback = 0) {
  return Number(
    variant?.Stock
    ?? variant?.stock
    ?? variant?.StockQuantity
    ?? variant?.stockQuantity
    ?? variant?.AvailableStock
    ?? variant?.availableStock
    ?? fallback
  );
}

function normalizeApiProduct(raw, lookups = {}) {
  const id = raw.productId ?? raw.ProductId ?? raw.id ?? 0;
  const priceLkr = parseFloat(raw.priceLkr ?? raw.priceLKR ?? raw.price ?? 0);
  const originalPrice = parseFloat(raw.originalPrice ?? raw.OriginalPrice ?? priceLkr);
  const sellingPrice = parseFloat(raw.sellingPrice ?? raw.SellingPrice ?? priceLkr ?? originalPrice);
  const basePrice = originalPrice > 0 ? originalPrice : sellingPrice;
  const disc = Math.round(parseFloat(raw.discountRate ?? raw.DiscountRate ?? raw.discountPercent ?? 0))
    || (basePrice > 0 && sellingPrice < basePrice ? Math.round((1 - sellingPrice / basePrice) * 100) : 0);
  const stock = parseInt(raw.stockQuantity ?? raw.StockQuantity ?? raw.stockQty ?? raw.stockCount ?? raw.stock ?? 0, 10);
  const rawImgs = Array.isArray(raw.images) && raw.images.length
    ? raw.images
    : (lookups.imagesByProductId?.get(id) ?? []);
  const imgUrls = rawImgs.map(i => i.imageUrl ?? i.ImageUrl).filter(Boolean);
  const primary = rawImgs.find(i => i.isPrimary || i.IsPrimary);
  const mainImg = raw.primaryImageUrl
    ?? raw.PrimaryImageUrl
    ?? raw.imageUrl
    ?? raw.ImageUrl
    ?? primary?.imageUrl
    ?? primary?.ImageUrl
    ?? imgUrls[0]
    ?? null;
  const isSale = raw.isSale ?? raw.IsSale ?? raw.inSale ?? raw.InSale ?? raw.insale ?? false;
  return {
    id,
    productId: id,
    name:            raw.name ?? raw.Name ?? "",
    price:           basePrice,
    discountPercent: disc,
    discountedPrice: disc > 0 ? Math.round(basePrice * (1 - disc / 100)) : basePrice,
    inSale:          isSaleEnabled(isSale),
    stockCount:      stock,
    outOfStock:      stock === 0,
    image:           mainImg,
    images:          imgUrls.length ? imgUrls : (mainImg ? [mainImg] : []),
    brand:           raw.brandName
      ?? raw.BrandName
      ?? raw.brand
      ?? lookups.brandNamesById?.get(raw.brandId ?? raw.BrandId)
      ?? "",
    brandId:         raw.brandId ?? raw.BrandId ?? 0,
    brandName:       raw.brandName
      ?? raw.BrandName
      ?? raw.brand
      ?? lookups.brandNamesById?.get(raw.brandId ?? raw.BrandId)
      ?? "",
    brandLogo:       raw.brandImage ?? "",
    sku:             raw.sku ?? raw.SKU ?? `SKU-${id}`,
    description:     raw.description ?? raw.Description ?? "",
    size:            raw.size ?? raw.Size ?? "N/A",
    weight:          raw.weight ?? raw.weightGrams ?? raw.Weight ?? "N/A",
    concernIds:      parseConcernIds(
      raw.concernIds
      ?? raw.ConcernIds
      ?? raw.concernTypeIds
      ?? raw.ConcernTypeIds
      ?? raw.concernTypeIdsCsv
      ?? raw.ConcernTypeIdsCsv
    ),
    categoryId:      raw.categoryId ?? raw.CategoryId ?? null,
    categoryName:    raw.categoryName ?? raw.CategoryName ?? null,
    paymentProvider: raw.paymentProvider ?? raw.PaymentProvider ?? raw.PaymentType ?? raw.paymentType ?? null,
    minInstallments: raw.minInstallments ?? raw.MinInstallments ?? raw.Instalment ?? raw.instalment ?? null,
    showVolume:      raw.showVolume      ?? raw.ShowVolume      ?? false,
    showWeight:      raw.showWeight      ?? raw.ShowWeight      ?? false,
    showTabletCount: raw.showTabletCount ?? raw.ShowTabletCount ?? false,
  };
}

function dedupeProducts(products) {
  const byId = new Map();

  products.forEach((product) => {
    const existing = byId.get(product.id);
    if (!existing) {
      byId.set(product.id, product);
      return;
    }

    const preferred = (
      (product.inSale && !existing.inSale)
      || (!!product.image && !existing.image)
      || ((product.stockCount ?? 0) > (existing.stockCount ?? 0))
    ) ? product : existing;

    byId.set(product.id, preferred);
  });

  return [...byId.values()];
}

gsap.registerPlugin(ScrollTrigger);

function formatLKR(value) {
  return new Intl.NumberFormat("en-LK").format(value);
}

function calcDiscounted(price, discountPercent) {
  return Math.round(price * (1 - discountPercent / 100));
}

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

const SORT_OPTIONS = [
  { v: "featured",  label: "Featured" },
  { v: "priceAsc",  label: "Price: Low → High" },
  { v: "priceDesc", label: "Price: High → Low" },
  { v: "discount",  label: "Highest Discount" },
  { v: "stock",     label: "Most in Stock" },
];

/* ── ProductCard ──────────────────────────────────────────────────── */

function ProductCard({ p, variants = [], paymentOptions = [], addToCart, showToast, toggleWishlist, isWishlisted, goToProduct }) {
  const [selectedVariant, setSelectedVariant] = useState(
    variants.length > 0 ? variants[0] : null
  );

  useEffect(() => {
    setSelectedVariant((current) => {
      if (!variants.length) return null;
      if (current && variants.some((variant) => String(variantIdOf(variant)) === String(variantIdOf(current)))) {
        return current;
      }
      return variants.find((variant) => variantStockOf(variant) > 0) ?? variants[0];
    });
  }, [variants]);

  const showSelector = (p.showVolume || p.showWeight || p.showTabletCount) && variants.length > 0;

  const variantPrice = selectedVariant
    ? variantPriceOf(selectedVariant)
    : 0;
  const displayPrice = selectedVariant
    ? Math.round(variantPrice > 0 ? variantPrice : p.discountedPrice)
    : p.discountedPrice;
  const displayStock = selectedVariant
    ? variantStockOf(selectedVariant, p.stockCount)
    : p.stockCount;
  const outOfStock = displayStock === 0;

  const handleAddToCart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const vid = variantIdOf(selectedVariant);
    const cartItem = selectedVariant ? {
      ...p,
      id:              `${p.id}-v${vid}`,
      discountedPrice: displayPrice,
      price:           displayPrice,
      stockCount:      displayStock,
      variantId:       vid,
      variantName:     variantNameOf(selectedVariant),
    } : p;
    addToCart(cartItem, 1);
    const vname = selectedVariant ? ` (${variantNameOf(selectedVariant)})` : "";
    showToast({ title: "Added to cart", message: `${p.name}${vname} × 1`, image: p.image });
  };

  return (
    <article className="pp-card group rounded-2xl border border-zinc-100 bg-white shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      {/* Image */}
      <div className="relative aspect-square overflow-hidden cursor-pointer" style={{ background: "#f0ebe3" }} onClick={() => goToProduct(p)}>
        {p.image ? (
          <img src={p.image} alt={p.name}
            className="h-full w-full object-contain p-4 transition-transform duration-500 group-hover:scale-[1.05]" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-zinc-300">
            No image
          </div>
        )}

        {p.inSale && (
          <div className="absolute top-3 left-3 rounded-xl bg-tenzy-orange px-3 py-1.5 text-xs font-semibold text-white shadow-lg shadow-tenzy-orange/25">
            IN SALE
          </div>
        )}

        {!outOfStock && (
          <div className="absolute top-3 right-3 rounded-xl px-3 py-1.5 text-xs font-semibold text-white backdrop-blur shadow-lg bg-linear-to-r from-teal-500 to-teal-600 shadow-teal-500/20">
            Stock: {displayStock}
          </div>
        )}

        {outOfStock && (
          <div className="absolute bottom-0 inset-x-0 py-2.5 flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <span className="text-xs font-bold tracking-widest uppercase text-white">Out of Stock</span>
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 h-24 bg-linear-to-t from-black/45 to-transparent" />

        <div className="absolute inset-x-0 bottom-0 p-3">
          <div className="rounded-2xl bg-white/80 backdrop-blur border border-white/30 shadow-sm p-2 flex items-center gap-2">
            <button type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleWishlist(p); }}
              className={`h-10 w-10 rounded-xl flex items-center justify-center transition active:scale-95
                ${isWishlisted(p.id) ? "bg-tenzy-orange/90 text-white" : "bg-white text-slate-900 hover:bg-slate-50"}`}
              aria-label="Wishlist">
              <span className="text-base">{isWishlisted(p.id) ? "♥" : "♡"}</span>
            </button>
            <button type="button" disabled={outOfStock} onClick={handleAddToCart}
              className={`flex-1 h-10 rounded-xl text-xs font-semibold transition active:scale-95
                ${outOfStock ? "bg-slate-200 text-slate-500 cursor-not-allowed" : "bg-tenzy-teal text-white hover:opacity-90"}`}>
              Add to cart
            </button>
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="p-4">
        <p className="text-[11px] font-semibold text-zinc-400">{p.brand}</p>
        <h3 className="mt-1 text-sm font-semibold text-zinc-900 leading-snug line-clamp-2 cursor-pointer hover:text-tenzy-teal transition"
          onClick={() => goToProduct(p)}>
          {p.name}
        </h3>

        {/* Variant selector */}
        {showSelector && (
          <div className="mt-3 relative">
            <select
              value={selectedVariant ? variantIdOf(selectedVariant) : ""}
              onChange={(e) => {
                const vid = e.target.value;
                setSelectedVariant(variants.find((v) => String(variantIdOf(v)) === vid) ?? null);
              }}
              onClick={(e) => e.stopPropagation()}
              className="w-full appearance-none text-xs font-semibold text-zinc-800 bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 pr-8 focus:outline-none focus:border-tenzy-teal transition cursor-pointer"
            >
              {variants.map((v) => {
                const vid   = variantIdOf(v);
                const name  = variantNameOf(v);
                const vol   = v.Volume ?? v.volume;
                const wt    = v.Weight ?? v.weight;
                const tabs  = Number(v.TabsCount ?? v.tabsCount ?? 0);
                const stk   = variantStockOf(v);
                const price = variantPriceOf(v);
                const parts = [name];
                if (p.showVolume && vol) parts.push(vol);
                if (p.showWeight && wt)  parts.push(`${wt}g`);
                if (p.showTabletCount && tabs > 0) parts.push(`${tabs} tabs`);
                const priceStr = price > 0 ? ` — LKR ${formatLKR(price)}` : "";
                const stockStr = stk === 0 ? " (Sold out)" : "";
                return (
                  <option key={vid} value={vid} disabled={stk === 0}>
                    {parts.join(" · ")}{priceStr}{stockStr}
                  </option>
                );
              })}
            </select>
            <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>
          </div>
        )}

        <div className="mt-3 rounded-2xl border border-zinc-100 bg-zinc-50 px-3 py-2.5">
          {displayPrice > 0 ? (
            <>
              <div className="flex items-end justify-between gap-2">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Price</p>
                  <p className="text-sm font-bold text-zinc-900">LKR {formatLKR(displayPrice)}</p>
                </div>
                {!selectedVariant && p.discountPercent > 0 && (
                  <p className="text-xs font-bold text-tenzy-orange">-{p.discountPercent}%</p>
                )}
              </div>
              {!selectedVariant && p.discountPercent > 0 && (
                <p className="mt-1 text-xs text-zinc-400 line-through">LKR {formatLKR(p.price)}</p>
              )}
            </>
          ) : (
            <p className="text-[10px] text-zinc-400 italic">Price not available</p>
          )}
        </div>

      </div>
    </article>
  );
}

/* ── Small helper components ──────────────────────────────────────── */

function FilterChip({ label, onRemove }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold"
      style={{ borderColor: "rgba(43,185,180,0.25)", background: "rgba(43,185,180,0.06)", color: "#2BB9B4" }}>
      {label}
      <button type="button" onClick={onRemove}
        className="h-3.5 w-3.5 rounded-full flex items-center justify-center hover:opacity-70 transition"
        style={{ background: "rgba(43,185,180,0.2)" }}>
        <X size={8} />
      </button>
    </span>
  );
}

function ToggleSwitch({ checked, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="relative h-6 w-11 rounded-full transition-all shrink-0"
      style={{ background: checked ? "#2BB9B4" : "#e4e4e7" }}
    >
      <span
        className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all"
        style={{ left: checked ? "22px" : "2px" }}
      />
    </button>
  );
}

/* ────────────────────────────────────────────────────────────────── */

const ProductsPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const wrapRef = useRef(null);
  const sortRef = useRef(null);

  // Mobile slide panel
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);
  const [mobilePanelTab, setMobilePanelTab] = useState("sort");
  const panelRef = useRef(null);

  // Custom sort dropdown
  const [showSortDropdown, setShowSortDropdown] = useState(false);

  // Wishlist (optional)
  const wishlistApi = useWishlist?.();
  const toggleWishlist = wishlistApi?.toggleWishlist ?? (() => {});
  const isWishlisted = wishlistApi?.isWishlisted ?? (() => false);

  // Read categoryId from URL (?categoryId=1) — also keep old concernID for backwards compat
  const categoryIdParam = searchParams.get("categoryId") || searchParams.get("categoryID");
  const initialCategoryId = categoryIdParam ? Number(categoryIdParam) : null;

  // -------- Categories --------
  const [categories, setCategories] = useState([]);
  useEffect(() => {
    categoriesApi.getAll()
      .then((data) => setCategories(Array.isArray(data) ? data.filter((c) => c.isActive !== false) : []))
      .catch(() => {});
  }, []);

  // -------- Concern types --------
  const [concernsList, setConcernsList] = useState([]);
  useEffect(() => {
    concernsApi.getAll()
      .then((data) => setConcernsList(
        Array.isArray(data)
          ? data.filter((c) => c.isActive === true || c.isActive === 1)
          : []
      ))
      .catch(() => {});
  }, []);

  // -------- API product list --------
  const [rawProducts,        setRawProducts]        = useState([]);
  const [loadingProducts,    setLoadingProducts]    = useState(true);
  const [productLookups,     setProductLookups]     = useState({
    brandNamesById: new Map(),
    imagesByProductId: new Map(),
  });
  const [variantsByProductId,     setVariantsByProductId]     = useState(new Map());
  const [paymentOptionsByProductId, setPaymentOptionsByProductId] = useState(new Map());

  useEffect(() => {
    Promise.allSettled([
      productsApi.getAll(),
      brandsApi.getAll(),
      productImageApi.getAll(),
    ])
      .then(([productsRes, brandsRes, imagesRes]) => {
        const products = asArray(productsRes.value);
        const brands = asArray(brandsRes.value);
        const images = asArray(imagesRes.value);

        const brandNamesById = new Map(
          brands.map((brand) => [
            brand.brandId ?? brand.BrandId,
            brand.name ?? brand.Name ?? brand.brandName ?? brand.BrandName ?? "",
          ])
        );
        const imagesByProductId = images.reduce((map, image) => {
          const productId = image.productId ?? image.ProductId;
          if (productId == null || (image.isActive ?? image.IsActive) === false) return map;
          const list = map.get(productId) ?? [];
          list.push(image);
          map.set(productId, list);
          return map;
        }, new Map());

        setRawProducts(products);
        setProductLookups({ brandNamesById, imagesByProductId });

        // Batch-fetch all payment options
        Promise.allSettled(
          products.map((pr) => {
            const pid = pr.productId ?? pr.ProductId ?? pr.id;
            return productsApi.getPaymentOptions(pid).then((opts) => ({ pid, opts }));
          })
        ).then((results) => {
          const map = new Map();
          results.forEach((r) => {
            if (r.status === "fulfilled") {
              const { pid, opts } = r.value;
              const arr = asArray(opts);
              if (arr.length) map.set(pid, arr);
            }
          });
          setPaymentOptionsByProductId(map);
        });

        // Fetch visible variants for products with variant display enabled
        const eligible = products.filter(
          (pr) => (pr.showVolume ?? pr.ShowVolume)
            || (pr.showWeight ?? pr.ShowWeight)
            || (pr.showTabletCount ?? pr.ShowTabletCount)
        );
        if (eligible.length > 0) {
          Promise.allSettled(
            eligible.map((pr) => {
              const pid = pr.productId ?? pr.ProductId ?? pr.id;
              return productVariantsApi.getVisible(pid).then((vs) => ({ pid, vs }));
            })
          ).then((results) => {
            const map = new Map();
            results.forEach((r) => {
              if (r.status === "fulfilled") {
                const { pid, vs } = r.value;
                const inStock = asArray(vs).filter(
                  (v) => variantStockOf(v) > 0
                );
                if (inStock.length > 0) map.set(pid, inStock);
              }
            });
            setVariantsByProductId(map);
          });
        }
      })
      .catch(console.error)
      .finally(() => setLoadingProducts(false));
  }, []);

  const products = useMemo(
    () => dedupeProducts(rawProducts.map((product) => normalizeApiProduct(product, productLookups)))
      .filter((product) => product.inSale),
    [rawProducts, productLookups]
  );

  // Unique brand list derived from loaded products (for the brand filter)
  const brandsList = useMemo(() => {
    const seen = new Map();
    products.forEach((p) => {
      if (p.brandId && !seen.has(p.brandId)) seen.set(p.brandId, p.brandName);
    });
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
  }, [products]);

  // -------- Filter states --------
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("featured");
  const [onlySale, setOnlySale] = useState(false);
  const [onlyInStock, setOnlyInStock] = useState(false);
  const { showToast } = useToast();

  const [selectedBrandId, setSelectedBrandId] = useState("All");
  const [selectedCategoryId, setSelectedCategoryId] = useState(initialCategoryId);
  const [selectedConcernId, setSelectedConcernId] = useState(null);


  const priceMin = useMemo(() => {
    if (!products.length) return 0;
    return Math.min(...products.map((p) => p.discountedPrice));
  }, [products]);

  const priceMax = useMemo(() => {
    if (!products.length) return 0;
    return Math.max(...products.map((p) => p.discountedPrice));
  }, [products]);

  const [maxPrice, setMaxPrice] = useState(priceMax);

  useEffect(() => {
    setMaxPrice(priceMax);
  }, [priceMax]);

  // -------- Suggestions (smart search) --------
  const suggestions = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return [];
    return products
      .filter((p) => p.name.toLowerCase().includes(query))
      .slice(0, 6);
  }, [q, products]);

  const goToProduct = (p) => navigate(`/product/${p.id}`);

  // -------- Filtered list --------
  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();

    let list = products.filter((p) => {
      if (selectedCategoryId) {
        if (p.categoryId !== selectedCategoryId) return false;
      }

      if (
        selectedBrandId !== "All" &&
        selectedBrandId !== "" &&
        selectedBrandId !== "undefined" &&
        String(p.brandId) !== String(selectedBrandId)
      )
        return false;

      if (selectedConcernId !== null && !p.concernIds.includes(selectedConcernId)) return false;
      if (onlySale && !p.inSale) return false;
      if (onlyInStock && (p.outOfStock || p.stockCount === 0)) return false;
      if (p.discountedPrice > maxPrice) return false;
      if (query && !p.name.toLowerCase().includes(query)) return false;

      return true;
    });

    if (sort === "priceAsc")
      list.sort((a, b) => a.discountedPrice - b.discountedPrice);
    if (sort === "priceDesc")
      list.sort((a, b) => b.discountedPrice - a.discountedPrice);
    if (sort === "discount")
      list.sort((a, b) => (b.discountPercent || 0) - (a.discountPercent || 0));
    if (sort === "stock")
      list.sort((a, b) => (b.stockCount || 0) - (a.stockCount || 0));

    return list;
  }, [
    products,
    selectedCategoryId,
    selectedBrandId,
    selectedConcernId,
    q,
    sort,
    onlySale,
    onlyInStock,
    maxPrice,
  ]);

  // -------- Pagination --------
  const PAGE_SIZE = 20;
  const [page, setPage] = useState(1);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)),
    [filtered.length]
  );

  useEffect(() => {
    setPage(1);
  }, [selectedBrandId, selectedCategoryId, selectedConcernId, q, sort, onlySale, onlyInStock, maxPrice]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pagedProducts = useMemo(() => {
    if (filtered.length <= PAGE_SIZE) return filtered;
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  // -------- Active filter count --------
  const hasActiveFilters =
    selectedBrandId !== "All" ||
    selectedCategoryId !== null ||
    selectedConcernId !== null ||
    onlySale ||
    onlyInStock ||
    maxPrice < priceMax;

  const activeFilterCount = [
    selectedBrandId !== "All",
    selectedCategoryId !== null,
    selectedConcernId !== null,
    onlySale,
    onlyInStock,
    maxPrice < priceMax,
  ].filter(Boolean).length;

  const activeBrandName = useMemo(() => {
    if (selectedBrandId === "All") return null;
    const b = brandsList.find((b) => String(b.id) === String(selectedBrandId));
    return b?.name ?? selectedBrandId;
  }, [selectedBrandId, brandsList]);

  // -------- animations replaced with motion whileInView --------
  // -------- GSAP animations --------
  useEffect(() => {
    if (!wrapRef.current) return;
    const ctx = gsap.context(() => {
      const cards = gsap.utils.toArray(".pp-card");
      gsap.fromTo(
        ".pp-hero",
        { y: 14, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.55, ease: "power2.out" }
      );
      if (cards.length) {
        gsap.fromTo(
          cards,
          { y: 18, opacity: 0, scale: 0.985 },
          {
            y: 0, opacity: 1, scale: 1,
            duration: 0.45, ease: "power2.out", stagger: 0.04,
            scrollTrigger: { trigger: ".pp-grid", start: "top 85%" },
          }
        );
      }
    }, wrapRef);
    return () => ctx.revert();
  }, []);

  useEffect(() => {
    if (!wrapRef.current) return;
    const ctx = gsap.context(() => {
      const cards = gsap.utils.toArray(".pp-card");
      if (!cards.length) return;
      gsap.fromTo(
        cards,
        { y: 10, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.25, stagger: 0.02, ease: "power2.out" }
      );
    }, wrapRef);
    return () => ctx.revert();
  }, [selectedBrandId, selectedCategoryId, selectedConcernId, q, sort, onlySale, onlyInStock, maxPrice, page, pagedProducts.length]);

  // Mobile panel slide-up animation
  useEffect(() => {
    if (!panelRef.current || !mobilePanelOpen) return;
    gsap.fromTo(
      panelRef.current,
      { y: 80, autoAlpha: 0 },
      { y: 0, autoAlpha: 1, duration: 0.28, ease: "power3.out" }
    );
  }, [mobilePanelOpen]);

  // Sort dropdown outside-click
  useEffect(() => {
    if (!showSortDropdown) return;
    const handler = (e) => {
      if (!sortRef.current?.contains(e.target)) setShowSortDropdown(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showSortDropdown]);

  // -------- Actions --------
  const clearFilters = () => {
    setSelectedBrandId("All");
    setSelectedCategoryId(null);
    setSelectedConcernId(null);
    setQ("");
    setSort("featured");
    setOnlySale(false);
    setOnlyInStock(false);
    setMaxPrice(priceMax);
  };

  const selectedCategoryName = selectedCategoryId
    ? (categories.find((c) => c.categoryId === selectedCategoryId)?.name ?? null)
    : null;

  const { addToCart } = useCart();
  const showPagination = filtered.length > PAGE_SIZE;

  /* ════════════════════════════════════════════════════════════════
     RENDER
  ════════════════════════════════════════════════════════════════ */
  if (loadingProducts) return (
    <div className="w-full min-h-screen flex flex-col">
      <Navibar />
      <div className="flex-1 flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-4 border-tenzy-teal/30 border-t-tenzy-teal animate-spin" />
      </div>
    </div>
  );

  return (
    <div ref={wrapRef} className="w-full overflow-hidden min-h-screen">
      <Navibar />

      {/* Beautiful Hero Section */}
      <div className="relative overflow-hidden pt-24 sm:pt-28 md:pt-36 pb-12 sm:pb-16 md:pb-20">
        {/* Decorative Background */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-orange-100/40 to-transparent rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-gradient-to-tr from-teal-100/30 to-transparent rounded-full blur-3xl" />
        </div>

        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-12">
            <span className="inline-flex items-center gap-2 mb-3 text-xs font-bold tracking-[0.2em] uppercase">
              <span className="w-2 h-2 rounded-full" style={{ background: "#E8522A" }} />
              Explore Our Collection
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-4">
              Find Your <span className="text-transparent bg-clip-text" style={{ backgroundImage: "linear-gradient(135deg, #E8522A 0%, #2BB9B4 100%)" }}>Perfect</span> Beauty Match
            </h1>
            <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto">
              Discover 500+ premium beauty products from 50+ trusted global brands. Easy navigation, expert curation, and authentic quality.
            </p>
          </div>
        </div>
      </div>

      <main className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 pb-16">

        {/* ── SEARCH & FILTERS ───────────────────────────────────────── */}
        <section className="pp-hero">
          <div className="rounded-3xl bg-white border border-zinc-100 shadow-sm overflow-hidden">

            {/* Brand accent bar */}
            <div className="h-[3px] bg-linear-to-r from-tenzy-teal via-tenzy-teal/40 to-tenzy-orange" />

            <div className="px-5 sm:px-8 pt-6 pb-5">
              {/* Title + result count */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-bold tracking-[0.28em] uppercase"
                    style={{ color: "#2BB9B4" }}>
                    All Products
                  </p>
                  <h1 className="mt-1 text-2xl sm:text-3xl font-bold text-zinc-900 leading-tight">
                    Find your{" "}
                    <span className="italic font-bold" style={{ color: "#E8522A" }}>
                      perfect
                    </span>{" "}
                    match
                  </h1>
                </div>

                <div className="shrink-0 text-right hidden sm:block">
                  <p className="text-[10px] font-medium uppercase tracking-widest text-zinc-400">
                    Results
                  </p>
                  <p className="text-3xl font-bold text-zinc-900 leading-none">
                    {filtered.length}
                  </p>
                  {showPagination && (
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      Page {page} / {totalPages}
                    </p>
                  )}
                </div>
              </div>

              {/* Search input */}
              <div className="mt-5 relative">
                <Search
                  size={17}
                  className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ color: "#2BB9B4" }}
                />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search skincare, brands, categories…"
                  className="w-full rounded-2xl border-2 border-zinc-100 bg-zinc-50 pl-11 pr-11 py-4 text-sm font-medium text-zinc-900 placeholder-zinc-400 outline-none transition-all focus:border-tenzy-teal/40 focus:bg-white"
                  style={{ boxShadow: q ? "0 0 0 4px rgba(43,185,180,0.07)" : undefined }}
                />
                {q && (
                  <button
                    type="button"
                    onClick={() => setQ("")}
                    className="absolute right-4 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full bg-zinc-200 hover:bg-zinc-300 flex items-center justify-center transition"
                  >
                    <X size={11} />
                  </button>
                )}

                {/* Suggestions dropdown */}
                {suggestions.length > 0 && (
                  <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-2xl border border-zinc-100 bg-white shadow-2xl">
                    <div className="px-4 py-2 border-b border-zinc-50">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                        Suggestions
                      </p>
                    </div>
                    {suggestions.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => goToProduct(p)}
                        className="w-full px-4 py-3 text-left flex items-center gap-3 hover:bg-teal-50 transition group"
                      >
                        <div className="h-10 w-10 rounded-xl overflow-hidden border border-zinc-100 bg-zinc-50 shrink-0">
                          {p.image ? (
                            <img
                              src={p.image}
                              alt={p.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-[10px] font-semibold text-zinc-300">
                              No Img
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-zinc-900 truncate group-hover:text-tenzy-teal transition">
                            {p.name}
                          </p>
                          <p className="text-xs text-zinc-400">
                            {p.brand}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          {p.discountedPrice > 0 ? (
                            <>
                              <p className="text-sm font-bold text-zinc-900">
                                LKR {formatLKR(p.discountedPrice)}
                              </p>
                              {p.discountPercent > 0 && (
                                <p className="text-[11px] font-semibold text-tenzy-orange">
                                  -{p.discountPercent}%
                                </p>
                              )}
                            </>
                          ) : (
                            <p className="text-[11px] text-zinc-400 italic">Price N/A</p>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ── FILTER TOOLBAR (sticky) ───────────────────────────────── */}
        <div className="mt-3 sticky top-[72px] z-40">
          <div className="rounded-2xl bg-white/95 backdrop-blur-sm border border-zinc-100 shadow-sm px-4 py-3">

            {/* Sort + Filter row */}
            <div className="flex items-center gap-2">

              {/* Custom Sort dropdown */}
              <div ref={sortRef} className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => setShowSortDropdown((v) => !v)}
                  className="flex items-center gap-1.5 rounded-full border px-3 py-2 text-[11px] font-bold transition-all"
                  style={
                    showSortDropdown
                      ? { borderColor: "rgba(43,185,180,0.5)", background: "rgba(43,185,180,0.06)", color: "#2BB9B4" }
                      : { borderColor: "#e4e4e7", background: "white", color: "#3f3f46" }
                  }
                >
                  <ArrowUpDown size={11} />
                  <span className="hidden sm:inline text-zinc-400 font-medium">Sort:</span>
                  <span>{SORT_OPTIONS.find((o) => o.v === sort)?.label ?? "Featured"}</span>
                  <ChevronDown
                    size={11}
                    className="transition-transform"
                    style={{ transform: showSortDropdown ? "rotate(180deg)" : "rotate(0deg)" }}
                  />
                </button>

                {showSortDropdown && (
                  <div className="absolute right-0 top-full mt-2 w-56 rounded-2xl border border-zinc-100 bg-white shadow-2xl z-50 overflow-hidden">
                    <div className="px-4 py-2.5 border-b border-zinc-50">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                        Sort by
                      </p>
                    </div>
                    {SORT_OPTIONS.map((opt) => (
                      <button
                        key={opt.v}
                        type="button"
                        onClick={() => {
                          setSort(opt.v);
                          setShowSortDropdown(false);
                        }}
                        className="w-full flex items-center justify-between px-4 py-3 text-sm transition"
                        style={
                          sort === opt.v
                            ? { background: "rgba(43,185,180,0.06)", color: "#2BB9B4", fontWeight: 700 }
                            : { color: "#3f3f46" }
                        }
                        onMouseEnter={(e) => {
                          if (sort !== opt.v) e.currentTarget.style.background = "#fafafa";
                        }}
                        onMouseLeave={(e) => {
                          if (sort !== opt.v) e.currentTarget.style.background = "";
                        }}
                      >
                        {opt.label}
                        {sort === opt.v && (
                          <Check size={14} style={{ color: "#2BB9B4" }} />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Filter button (mobile/tablet only) */}
              <button
                type="button"
                onClick={() => {
                  setMobilePanelTab("filters");
                  setMobilePanelOpen(true);
                }}
                className="lg:hidden shrink-0 flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 py-2 text-[11px] font-bold text-zinc-700 transition hover:border-tenzy-teal/40"
              >
                <SlidersHorizontal size={11} />
                <span>Filters</span>
                {hasActiveFilters && (
                  <span
                    className="h-4 w-4 rounded-full text-white text-[9px] font-bold flex items-center justify-center"
                    style={{ background: "#E8522A" }}
                  >
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </div>

            {/* Active filter chips */}
            {hasActiveFilters && (
              <div className="flex flex-wrap items-center gap-2 mt-3 pt-2.5 border-t border-zinc-50">
                {selectedCategoryName && (
                  <FilterChip
                    label={selectedCategoryName}
                    onRemove={() => setSelectedCategoryId(null)}
                  />
                )}
                {activeBrandName && (
                  <FilterChip
                    label={activeBrandName}
                    onRemove={() => setSelectedBrandId("All")}
                  />
                )}
                {selectedConcernId !== null && (() => {
                  const ct = concernsList.find((c) => (c.concernTypeId ?? c.ConcernTypeId) === selectedConcernId);
                  const label = ct?.name ?? ct?.Name ?? `Concern ${selectedConcernId}`;
                  return <FilterChip label={label} onRemove={() => setSelectedConcernId(null)} />;
                })()}
                {onlySale && (
                  <FilterChip label="On Sale" onRemove={() => setOnlySale(false)} />
                )}
                {onlyInStock && (
                  <FilterChip label="In Stock" onRemove={() => setOnlyInStock(false)} />
                )}
                {maxPrice < priceMax && (
                  <FilterChip
                    label={`≤ LKR ${formatLKR(maxPrice)}`}
                    onRemove={() => setMaxPrice(priceMax)}
                  />
                )}
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-[11px] font-semibold text-zinc-400 hover:text-tenzy-orange transition px-1"
                >
                  Clear all
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── MAIN CONTENT ─────────────────────────────────────────── */}
        <section className="mt-5 grid gap-5 lg:grid-cols-12">

          {/* ── Desktop Filters Sidebar ─────────────────────────── */}
          <aside className="hidden lg:block lg:col-span-3">
            <div className="sticky top-[158px] rounded-2xl overflow-hidden"
              style={{
                background: "linear-gradient(135deg, #ffffff 0%, #f9fafb 100%)",
                border: "1px solid rgba(232,82,42,0.12)",
                boxShadow: "0 4px 16px rgba(0,0,0,0.08)"
              }}>

              {/* Sidebar header */}
              <div className="px-6 py-5 border-b" style={{ borderColor: "rgba(232,82,42,0.15)" }}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 rounded-lg" style={{ background: "rgba(232,82,42,0.12)" }}>
                    <SlidersHorizontal size={14} style={{ color: "#E8522A" }} />
                  </div>
                  <h2 className="text-base font-bold text-gray-900">Filters</h2>
                  {hasActiveFilters && (
                    <span
                      className="ml-auto h-5 w-5 rounded-full text-white text-[10px] font-bold flex items-center justify-center"
                      style={{ background: "linear-gradient(135deg, #E8522A 0%, #2BB9B4 100%)" }}
                    >
                      {activeFilterCount}
                    </span>
                  )}
                </div>
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="text-[11px] font-semibold hover:opacity-70 transition"
                    style={{ color: "#E8522A" }}
                  >
                    ✕ Clear all filters
                  </button>
                )}
              </div>

              <div className="px-5 py-5 space-y-6">

                {/* Price Range */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                      Price Range
                    </p>
                    <span
                      className="text-[11px] font-bold rounded-full px-2.5 py-0.5"
                      style={{ background: "rgba(43,185,180,0.08)", color: "#2BB9B4" }}
                    >
                      ≤ LKR {formatLKR(maxPrice)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={priceMin}
                    max={priceMax}
                    value={maxPrice}
                    onChange={(e) =>
                      setMaxPrice(clamp(Number(e.target.value), priceMin, priceMax))
                    }
                    className="w-full"
                    style={{ accentColor: "#2BB9B4" }}
                  />
                  <div className="flex justify-between mt-1.5">
                    <span className="text-[10px] text-zinc-400">
                      LKR {formatLKR(priceMin)}
                    </span>
                    <span className="text-[10px] text-zinc-400">
                      LKR {formatLKR(priceMax)}
                    </span>
                  </div>
                </div>

                <div className="h-px bg-zinc-100" />

                {/* Category */}
                {categories.length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3">
                      Category
                    </p>
                    <div className="relative">
                      <select
                        value={selectedCategoryId ?? ""}
                        onChange={(e) => setSelectedCategoryId(e.target.value ? Number(e.target.value) : null)}
                        className="w-full appearance-none rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 pr-9 text-sm font-medium text-zinc-800 outline-none transition focus:border-tenzy-teal/40"
                      >
                        <option value="">All Categories</option>
                        {categories.map((c) => (
                          <option key={c.categoryId} value={c.categoryId}>{c.name}</option>
                        ))}
                      </select>
                      <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400" />
                    </div>
                  </div>
                )}

                <div className="h-px bg-zinc-100" />

                {/* Brand */}
                <div>
                  <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3">
                    Brand
                  </p>
                  <div className="relative">
                    <select
                      value={selectedBrandId}
                      onChange={(e) => {
                        const v = e.target.value;
                        setSelectedBrandId(
                          v === "All" || v === "" || v === "undefined" ? "All" : v
                        );
                      }}
                      className="w-full appearance-none rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 pr-9 text-sm font-medium text-zinc-800 outline-none transition focus:border-tenzy-teal/40"
                    >
                      <option value="All">All Brands</option>
                      {brandsList.map((b) => (
                        <option key={b.id} value={String(b.id)}>{b.name}</option>
                      ))}
                    </select>
                    <ChevronDown
                      size={13}
                      className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400"
                    />
                  </div>
                </div>

                {concernsList.length > 0 && (
                  <>
                    <div className="h-px bg-zinc-100" />
                    <div>
                      <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3">
                        Skin Concerns
                      </p>
                      <div className="relative">
                        <select
                          value={selectedConcernId ?? ""}
                          onChange={(e) => setSelectedConcernId(e.target.value ? Number(e.target.value) : null)}
                          className="w-full appearance-none rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 pr-9 text-sm font-medium text-zinc-800 outline-none transition focus:border-tenzy-teal/40"
                        >
                          <option value="">All Concerns</option>
                          {concernsList.map((ct) => {
                            const cid   = ct.concernTypeId ?? ct.ConcernTypeId;
                            const label = ct.name ?? ct.Name ?? ct.concernType ?? ct.ConcernType ?? "—";
                            return <option key={cid} value={cid}>{label}</option>;
                          })}
                        </select>
                        <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400" />
                      </div>
                    </div>
                  </>
                )}

                <div className="h-px bg-zinc-100" />

                {/* Availability toggles */}
                <div>
                  <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3">
                    Availability
                  </p>
                  <div className="space-y-2.5">
                    <label className="flex items-center justify-between gap-3 rounded-xl bg-zinc-50 px-4 py-3 cursor-pointer hover:bg-teal-50 transition group">
                      <div className="flex items-center gap-2">
                        <Tag size={13} className="text-zinc-400 group-hover:text-tenzy-teal transition" />
                        <div>
                          <p className="text-sm font-semibold text-zinc-800">On Sale</p>
                          <p className="text-[10px] text-zinc-400">Discounted items only</p>
                        </div>
                      </div>
                      <ToggleSwitch checked={onlySale} onChange={setOnlySale} />
                    </label>

                    <label className="flex items-center justify-between gap-3 rounded-xl bg-zinc-50 px-4 py-3 cursor-pointer hover:bg-teal-50 transition group">
                      <div className="flex items-center gap-2">
                        <Check size={13} className="text-zinc-400 group-hover:text-tenzy-teal transition" />
                        <div>
                          <p className="text-sm font-semibold text-zinc-800">In Stock</p>
                          <p className="text-[10px] text-zinc-400">Hide unavailable items</p>
                        </div>
                      </div>
                      <ToggleSwitch checked={onlyInStock} onChange={setOnlyInStock} />
                    </label>
                  </div>
                </div>

              </div>
            </div>
          </aside>

          {/* ── Product Grid ─────────────────────────────────────── */}
          <section className="pp-grid lg:col-span-9">
            {filtered.length === 0 ? (
              <div className="rounded-2xl p-12 sm:p-16 text-center" style={{
                background: "linear-gradient(135deg, #ffffff 0%, #f9fafb 100%)",
                border: "1px solid rgba(232,82,42,0.12)",
              }}>
                <div
                  className="mx-auto h-16 w-16 rounded-2xl flex items-center justify-center text-4xl mb-6 inline-block"
                  style={{ background: "linear-gradient(135deg, rgba(232,82,42,0.10) 0%, rgba(43,185,180,0.10) 100%)" }}
                >
                  🔍
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">No products found</h3>
                <p className="text-gray-600 max-w-sm mx-auto mb-6">
                  Try adjusting your filters, search term, or price range to find what you're looking for.
                </p>
                <button
                  type="button"
                  onClick={clearFilters}
                  className="px-8 py-3 rounded-full text-sm font-bold text-white hover:shadow-lg transition active:scale-95 inline-block"
                  style={{ background: "linear-gradient(135deg, #E8522A 0%, #2BB9B4 100%)" }}
                >
                  Reset all filters
                </button>
              </div>
            ) : (
              <>
                <div className="grid gap-5 sm:gap-6 grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {pagedProducts.map((p) => (
                    <ProductCard
                      key={p.id}
                      p={p}
                      variants={variantsByProductId.get(p.id) ?? []}
                      paymentOptions={paymentOptionsByProductId.get(p.id) ?? []}
                      addToCart={addToCart}
                      showToast={showToast}
                      toggleWishlist={toggleWishlist}
                      isWishlisted={isWishlisted}
                      goToProduct={goToProduct}
                    />
                  ))}
                </div>

                {/* Pagination */}
                {showPagination && (
                  <div className="mt-6 rounded-3xl border border-zinc-100 bg-white shadow-sm p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-zinc-700">
                      Showing{" "}
                      <span className="text-zinc-500">
                        {(page - 1) * PAGE_SIZE + 1}–
                        {Math.min(page * PAGE_SIZE, filtered.length)}
                      </span>{" "}
                      of{" "}
                      <span className="text-zinc-500">{filtered.length}</span>
                    </p>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className={`rounded-2xl px-4 py-2 text-sm font-semibold border transition
                          ${page === 1
                            ? "border-zinc-100 bg-zinc-50 text-zinc-300 cursor-not-allowed"
                            : "border-zinc-200 bg-white text-zinc-800 hover:border-tenzy-teal/40 hover:text-tenzy-teal"
                          }`}
                      >
                        Prev
                      </button>

                      <div className="rounded-2xl border border-zinc-100 px-4 py-2 text-sm font-bold"
                        style={{ background: "rgba(43,185,180,0.06)", color: "#2BB9B4" }}>
                        {page} / {totalPages}
                      </div>

                      <button
                        type="button"
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className={`rounded-2xl px-4 py-2 text-sm font-semibold border transition
                          ${page === totalPages
                            ? "border-zinc-100 bg-zinc-50 text-zinc-300 cursor-not-allowed"
                            : "border-zinc-200 bg-white text-zinc-800 hover:border-tenzy-teal/40 hover:text-tenzy-teal"
                          }`}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </section>
        </section>
      </main>

      {/* ── MOBILE BOTTOM SHEET (Sort / Filters) ──────────────────── */}
      {mobilePanelOpen && (
        <div className="fixed inset-0 z-[999] md:hidden flex flex-col justify-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setMobilePanelOpen(false)}
          />

          {/* Sheet */}
          <div
            ref={panelRef}
            className="relative bg-white rounded-t-3xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="h-1 w-10 rounded-full bg-zinc-200" />
            </div>

            {/* Tab bar */}
            <div className="flex items-center gap-2 px-4 pb-3 border-b border-zinc-100">
              <button
                type="button"
                onClick={() => setMobilePanelTab("sort")}
                className="flex-1 rounded-xl py-2.5 text-sm font-bold transition capitalize"
                style={
                  mobilePanelTab === "sort"
                    ? { background: "#2BB9B4", color: "white" }
                    : { background: "#f4f4f5", color: "#52525b" }
                }
              >
                Sort
              </button>
              <button
                type="button"
                onClick={() => setMobilePanelTab("filters")}
                className="flex-1 rounded-xl py-2.5 text-sm font-bold transition capitalize"
                style={
                  mobilePanelTab === "filters"
                    ? { background: "#2BB9B4", color: "white" }
                    : { background: "#f4f4f5", color: "#52525b" }
                }
              >
                Filters
                {hasActiveFilters && mobilePanelTab !== "filters" && (
                  <span
                    className="ml-1.5 inline-flex h-4 w-4 rounded-full text-white text-[9px] font-bold items-center justify-center"
                    style={{ background: "#E8522A" }}
                  >
                    {activeFilterCount}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setMobilePanelOpen(false)}
                className="h-10 w-10 rounded-xl border border-zinc-200 bg-white flex items-center justify-center shrink-0"
              >
                <X size={15} />
              </button>
            </div>

            {/* Panel content */}
            <div className="p-4 overflow-y-auto max-h-[65vh]">
              {mobilePanelTab === "sort" ? (
                <div className="grid gap-2">
                  {SORT_OPTIONS.map((opt) => (
                    <button
                      key={opt.v}
                      type="button"
                      onClick={() => {
                        setSort(opt.v);
                        setMobilePanelOpen(false);
                      }}
                      className="flex items-center justify-between rounded-2xl border px-4 py-3.5 text-sm font-semibold transition"
                      style={
                        sort === opt.v
                          ? { borderColor: "rgba(43,185,180,0.4)", background: "rgba(43,185,180,0.06)", color: "#2BB9B4" }
                          : { borderColor: "#f4f4f5", background: "#fafafa", color: "#3f3f46" }
                      }
                    >
                      {opt.label}
                      {sort === opt.v && <Check size={15} style={{ color: "#2BB9B4" }} />}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="space-y-5">
                  {/* Price */}
                  <div>
                    <div className="flex justify-between mb-2">
                      <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                        Price
                      </p>
                      <span className="text-xs font-bold" style={{ color: "#2BB9B4" }}>
                        ≤ LKR {formatLKR(maxPrice)}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={priceMin}
                      max={priceMax}
                      value={maxPrice}
                      onChange={(e) =>
                        setMaxPrice(clamp(Number(e.target.value), priceMin, priceMax))
                      }
                      className="w-full"
                      style={{ accentColor: "#2BB9B4" }}
                    />
                    <div className="flex justify-between mt-1">
                      <span className="text-[10px] text-zinc-400">
                        LKR {formatLKR(priceMin)}
                      </span>
                      <span className="text-[10px] text-zinc-400">
                        LKR {formatLKR(priceMax)}
                      </span>
                    </div>
                  </div>

                  {/* Category */}
                  {categories.length > 0 && (
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
                        Category
                      </p>
                      <div className="relative">
                        <select
                          value={selectedCategoryId ?? ""}
                          onChange={(e) => setSelectedCategoryId(e.target.value ? Number(e.target.value) : null)}
                          className="w-full appearance-none rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 pr-9 text-sm font-medium text-zinc-800 outline-none"
                        >
                          <option value="">All Categories</option>
                          {categories.map((c) => (
                            <option key={c.categoryId} value={c.categoryId}>{c.name}</option>
                          ))}
                        </select>
                        <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400" />
                      </div>
                    </div>
                  )}

                  {/* Brand */}
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
                      Brand
                    </p>
                    <div className="relative">
                      <select
                        value={selectedBrandId}
                        onChange={(e) => {
                          const v = e.target.value;
                          setSelectedBrandId(
                            v === "All" || v === "" || v === "undefined" ? "All" : v
                          );
                        }}
                        className="w-full appearance-none rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 pr-9 text-sm font-medium text-zinc-800 outline-none"
                      >
                        <option value="All">All Brands</option>
                        {brandsList.map((b) => {
                          const id = b.id ?? b.BrandID ?? b.brandId ?? b.brandID;
                          return (
                            <option key={id ?? b.name} value={String(id)}>
                              {b.name ?? b.BrandName}
                            </option>
                          );
                        })}
                      </select>
                      <ChevronDown
                        size={13}
                        className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400"
                      />
                    </div>
                  </div>

                  {/* Skin Concerns */}
                  {concernsList.length > 0 && (
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
                        Skin Concerns
                      </p>
                      <div className="relative">
                        <select
                          value={selectedConcernId ?? ""}
                          onChange={(e) => setSelectedConcernId(e.target.value ? Number(e.target.value) : null)}
                          className="w-full appearance-none rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 pr-9 text-sm font-medium text-zinc-800 outline-none"
                        >
                          <option value="">All Concerns</option>
                          {concernsList.map((ct) => {
                            const cid   = ct.concernTypeId ?? ct.ConcernTypeId;
                            const label = ct.name ?? ct.Name ?? ct.concernType ?? ct.ConcernType ?? "—";
                            return <option key={cid} value={cid}>{label}</option>;
                          })}
                        </select>
                        <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400" />
                      </div>
                    </div>
                  )}

                  {/* Toggles */}
                  <div className="space-y-2">
                    <label className="flex items-center justify-between gap-3 rounded-xl bg-zinc-50 px-4 py-3 cursor-pointer">
                      <div className="flex items-center gap-2">
                        <Tag size={13} className="text-zinc-400" />
                        <span className="text-sm font-semibold text-zinc-800">On Sale</span>
                      </div>
                      <ToggleSwitch checked={onlySale} onChange={setOnlySale} />
                    </label>
                    <label className="flex items-center justify-between gap-3 rounded-xl bg-zinc-50 px-4 py-3 cursor-pointer">
                      <div className="flex items-center gap-2">
                        <Check size={13} className="text-zinc-400" />
                        <span className="text-sm font-semibold text-zinc-800">In Stock</span>
                      </div>
                      <ToggleSwitch checked={onlyInStock} onChange={setOnlyInStock} />
                    </label>
                  </div>

                  {/* Clear filters */}
                  <button
                    type="button"
                    onClick={() => {
                      clearFilters();
                      setMobilePanelOpen(false);
                    }}
                    className="w-full rounded-2xl py-3.5 text-sm font-bold text-white hover:opacity-90 transition"
                    style={{ background: "#2BB9B4" }}
                  >
                    Clear all filters
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default ProductsPage;
