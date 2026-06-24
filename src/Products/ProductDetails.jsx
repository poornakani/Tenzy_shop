import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCart } from "@/Context/CartContext";

import { useWishlist } from "../Context/WishlistContext";
import Navibar from "@/HomePage/Navibar";
import Footer from "@/HomePage/Footer";
import ProductDescriptionContent from "@/components/ProductDescriptionContent";
import {
  productsApi,
  reviewsApi,
  brandsApi,
  productImageApi,
  productFaqApi,
  productVariantsApi,
} from "@/services/api";

gsap.registerPlugin(ScrollTrigger);

function formatLKR(value) {
  return new Intl.NumberFormat("en-LK").format(value);
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

function asObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  if (value.data && typeof value.data === "object" && !Array.isArray(value.data)) return value.data;
  if (value.Data && typeof value.Data === "object" && !Array.isArray(value.Data)) return value.Data;
  if (value.item && typeof value.item === "object" && !Array.isArray(value.item)) return value.item;
  if (value.Item && typeof value.Item === "object" && !Array.isArray(value.Item)) return value.Item;
  if (value.response && typeof value.response === "object" && !Array.isArray(value.response)) return value.response;
  if (value.Response && typeof value.Response === "object" && !Array.isArray(value.Response)) return value.Response;
  return value;
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

function withUnit(value, unit) {
  const s = String(value ?? "").trim();
  if (!s) return "";
  return s.toLowerCase().endsWith(unit.toLowerCase()) ? s : `${s}${unit}`;
}

const StarRow = ({ value = 0 }) => {
  const full = Math.round(value);
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <span
          key={i}
          className={i < full ? "text-amber-500" : "text-slate-300"}
        >
          ★
        </span>
      ))}
    </div>
  );
};

function isSaleEnabled(value) {
  return value === true || value === 1 || String(value).toLowerCase() === "true";
}

function normalizeProduct(raw, lookups = {}) {
  const priceLkr = parseFloat(raw.priceLkr ?? raw.priceLKR ?? raw.price ?? 0);
  const originalPrice = parseFloat(raw.originalPrice ?? raw.OriginalPrice ?? priceLkr);
  const sellingPrice = parseFloat(raw.sellingPrice ?? raw.SellingPrice ?? priceLkr ?? originalPrice);
  const basePrice = originalPrice > 0 ? originalPrice : sellingPrice;
  const discountPercent = Math.round(parseFloat(raw.discountRate ?? raw.DiscountRate ?? raw.discountPercent ?? 0))
    || (basePrice > 0 && sellingPrice < basePrice ? Math.round((1 - sellingPrice / basePrice) * 100) : 0);
  const inSale = raw.inSale ?? raw.InSale ?? raw.isSale ?? raw.IsSale ?? raw.insale ?? false;
  const stockCount = parseInt(raw.stockQuantity ?? raw.StockQuantity ?? raw.stockQty ?? raw.stockCount ?? raw.stock ?? 0, 10);
  const rawImages = Array.isArray(raw.images) && raw.images.length
    ? raw.images
    : (lookups.images ?? []);
  const sortedImages = [...rawImages].sort((a, b) => {
    const aPrimary = a.isPrimary || a.IsPrimary ? 1 : 0;
    const bPrimary = b.isPrimary || b.IsPrimary ? 1 : 0;
    if (bPrimary !== aPrimary) return bPrimary - aPrimary;
    return (a.sortOrder ?? a.SortOrder ?? 0) - (b.sortOrder ?? b.SortOrder ?? 0);
  });
  const imageUrls = sortedImages.map((img) => img.imageUrl ?? img.ImageUrl).filter(Boolean);
  const directPrimaryImage = raw.primaryImageUrl ?? raw.PrimaryImageUrl ?? raw.imageUrl ?? raw.ImageUrl ?? null;
  const images = imageUrls.length ? imageUrls : (directPrimaryImage ? [directPrimaryImage] : []);

  return {
    id:              raw.productId ?? raw.ProductId ?? raw.id,
    name:            raw.name ?? raw.Name ?? "",
    price:           basePrice,
    discountPercent,
    discountedPrice: discountPercent > 0 ? Math.round(basePrice * (1 - discountPercent / 100)) : basePrice,
    inSale:          isSaleEnabled(inSale),
    stockCount,
    outOfStock:      stockCount === 0,
    image:           images[0] ?? null,
    images,
    brand:           raw.brandName
      ?? raw.BrandName
      ?? raw.brand
      ?? lookups.brandName
      ?? "Unknown Brand",
    sku:             raw.sku ?? raw.SKU ?? `SKU-${raw.productId ?? raw.ProductId ?? raw.id}`,
    description:     raw.description ?? raw.Description ?? "",
    howToUse:        raw.howToUse    ?? raw.HowToUse    ?? "",
    ingredients:     raw.ingredients ?? raw.Ingredients ?? "",
    size:            raw.size ?? raw.Size ?? "N/A",
    weight:          raw.weight ?? raw.weightGrams ?? raw.Weight ?? "N/A",
    volume:          raw.volume ?? raw.Volume ?? null,
    showVolume:      raw.showVolume    ?? raw.ShowVolume    ?? false,
    showWeight:      raw.showWeight    ?? raw.ShowWeight    ?? false,
    showTabletCount: raw.showTabletCount ?? raw.ShowTabletCount ?? false,
    faqs:            Array.isArray(raw.faqs) && raw.faqs.length
      ? raw.faqs
      : (Array.isArray(lookups.faqs) ? lookups.faqs : []),
    paymentProvider: null,
    minInstallments: null,
  };
}

/* ── Tab content sub-components ──────────────────────────────────── */

function DescriptionTab({ description }) {
  const { prose, stats } = useMemo(() => {
    const str = String(description ?? "").trim();
    if (/^\s*\{/.test(str)) {
      try {
        const obj = JSON.parse(str);
        if (obj.prose !== undefined)
          return { prose: String(obj.prose ?? ""), stats: Array.isArray(obj.stats) ? obj.stats : [] };
      } catch {}
    }
    return { prose: str, stats: [] };
  }, [description]);

  if (!prose && !stats.length)
    return <p className="text-sm text-slate-400 italic py-2">No description available.</p>;

  return (
    <div>
      {prose && (
        <div>
          <ProductDescriptionContent value={prose} />
        </div>
      )}
      {stats.length > 0 && (
        <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 gap-5">
          {stats.map((s, i) => (
            <div key={i} className="border-t-2 border-slate-200 pt-4">
              <p className="font-modern-negra text-4xl sm:text-5xl text-slate-900 leading-none">{s.stat}</p>
              <p className="mt-2 text-xs sm:text-sm text-slate-500 leading-snug">{s.note}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function HowToUseTab({ howToUse }) {
  const steps = useMemo(() => {
    const str = String(howToUse ?? "").trim();
    if (!str) return null;
    if (/^\s*\[/.test(str)) {
      try {
        const arr = JSON.parse(str);
        if (Array.isArray(arr) && arr.length && "title" in (arr[0] ?? {})) return arr;
      } catch {}
    }
    return null;
  }, [howToUse]);

  if (!howToUse?.trim())
    return <p className="text-sm text-slate-400 italic py-2">No instructions added yet.</p>;

  if (!steps)
    return <ProductDescriptionContent value={howToUse} />;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
      {steps.map((s, i) => (
        <div key={i}>
          <div className="font-modern-negra text-5xl sm:text-6xl leading-none" style={{ color: "#2BB9B4" }}>
            {String(i + 1).padStart(2, "0")}
          </div>
          <div className="mt-4 text-base font-semibold text-slate-900">{s.title}</div>
          <div className="mt-2 text-sm text-slate-500 leading-relaxed">{s.body}</div>
        </div>
      ))}
    </div>
  );
}

const ING_DISPLAY_COLS = [
  { key: "ingredient",    label: "Ingredient"    },
  { key: "concentration", label: "Concentration" },
  { key: "purpose",       label: "Purpose"       },
  { key: "notes",         label: "Notes"         },
];

function IngredientsTab({ ingredients }) {
  const rows = useMemo(() => {
    const str = String(ingredients ?? "").trim();
    if (!str) return null;
    if (/^\s*\[/.test(str)) {
      try {
        const arr = JSON.parse(str);
        if (Array.isArray(arr) && arr.length) return arr;
      } catch {}
    }
    return null;
  }, [ingredients]);

  if (!ingredients?.trim())
    return <p className="text-sm text-slate-400 italic py-2">No ingredients listed yet.</p>;

  if (!rows)
    return <ProductDescriptionContent value={ingredients} />;

  const activeCols = ING_DISPLAY_COLS.filter(c => rows.some(r => r[c.key]?.trim()));

  return (
    <div>
      <h3 className="font-modern-negra text-2xl sm:text-3xl text-slate-900 mb-6">
        Every drop, accountable.
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-slate-200">
              {activeCols.map(c => (
                <th key={c.key} className="text-left pb-3 pr-8 sm:pr-12 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 whitespace-nowrap">
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                {activeCols.map(c => (
                  <td key={c.key}
                    className={`py-4 pr-8 sm:pr-12 align-top ${
                      c.key === "ingredient"    ? "font-semibold text-slate-900" :
                      c.key === "concentration" ? "font-bold tabular-nums" :
                      "text-slate-500"
                    }`}
                    style={c.key === "concentration" ? { color: "#2BB9B4" } : {}}>
                    {row[c.key] || <span className="text-slate-300">—</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ReviewsTab({ reviews, avgRating }) {
  const breakdown = useMemo(() => (
    [5, 4, 3, 2, 1].map(stars => {
      const count = reviews.filter(r => Math.round(Number(r.rating ?? r.rate ?? 0)) === stars).length;
      return { stars, count, pct: reviews.length ? Math.round(count / reviews.length * 100) : 0 };
    })
  ), [reviews]);

  if (!reviews.length)
    return <p className="text-sm text-slate-400 italic py-2">No reviews yet. Be the first to share your experience!</p>;

  return (
    <div className="grid gap-8 lg:grid-cols-[260px_1fr] lg:gap-12">
      {/* Rating summary */}
      <div className="shrink-0">
        <div className="font-modern-negra text-7xl sm:text-8xl leading-none text-slate-900">
          {avgRating.toFixed(1)}
        </div>
        <div className="mt-2 flex items-center gap-0.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <span key={i} className={`text-lg ${i < Math.round(avgRating) ? "text-amber-500" : "text-slate-200"}`}>★</span>
          ))}
        </div>
        <p className="mt-2 text-sm text-slate-500">
          Based on {reviews.length} verified review{reviews.length !== 1 ? "s" : ""}
        </p>
        <div className="mt-5 space-y-2.5">
          {breakdown.map(({ stars, pct }) => (
            <div key={stars} className="flex items-center gap-3 text-xs">
              <span className="w-3 text-center text-slate-500 font-medium tabular-nums">{stars}</span>
              <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, background: "#2BB9B4" }} />
              </div>
              <span className="w-9 text-right text-slate-400 tabular-nums">{pct}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Review list */}
      <div className="space-y-6 min-w-0">
        {reviews.map((r, i) => {
          const stars = Math.round(Number(r.rating ?? r.rate ?? 0));
          return (
            <div key={r.reviewId ?? r.id ?? r.ID ?? i}
              className={i < reviews.length - 1 ? "pb-6 border-b border-slate-100" : ""}>
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <span key={j} className={`text-sm ${j < stars ? "text-amber-500" : "text-slate-200"}`}>★</span>
                  ))}
                </div>
                <span className="text-xs text-slate-400 tabular-nums shrink-0">
                  {r.createdAt ? new Date(r.createdAt).toLocaleDateString("en-GB") : r.date ?? ""}
                </span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">"{r.comment}"</p>
              <p className="mt-3 text-xs font-semibold text-slate-800">
                {r.customerName ?? r.name ?? "Customer"}{" "}
                <span className="font-normal text-slate-400">· Verified buyer</span>
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── */

const ProductDetails = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const wrapRef   = useRef(null);
  const heroRef   = useRef(null);
  const galleryRef = useRef(null);
  const { addToCart } = useCart();

  const productId = Number(id);
  const { toggleWishlist, isWishlisted } = useWishlist();

  const [product,        setProduct]        = useState(null);
  const [productLoading, setProductLoading] = useState(true);
  const [productReviews, setProductReviews] = useState([]);
  const [activeImg,      setActiveImg]      = useState(0);
  const [variants,        setVariants]        = useState([]);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [variantImagesMap,  setVariantImagesMap]  = useState(new Map());
  const [similarProducts,   setSimilarProducts]   = useState([]);
  const [activeTab,         setActiveTab]         = useState("description");
  const [qty,               setQty]               = useState(1);
  const [paymentOptions,    setPaymentOptions]    = useState([]);
  const [cartConfirm,       setCartConfirm]       = useState(false);

  // Carousel images: use variant-specific images when available, fall back to product images
  const displayImages = useMemo(() => {
    if (!product) return [];
    const fallback = product.images?.length
      ? product.images
      : product.image ? [product.image] : [];
    if (!selectedVariant) return fallback;
    const vid = String(variantIdOf(selectedVariant) ?? "");
    if (!vid) return fallback;
    // Try string key first, then numeric key (handles JSON number vs string mismatch)
    const variantImgs = variantImagesMap.get(vid) ?? variantImagesMap.get(Number(vid));
    return variantImgs?.length ? variantImgs : fallback;
  }, [product, selectedVariant, variantImagesMap]);

  // Reset to first image whenever the displayed set changes (variant switch)
  useEffect(() => { setActiveImg(0); }, [displayImages]);

  // Reset qty to 1 whenever the selected variant (and its stock) changes
  useEffect(() => { setQty(1); }, [selectedVariant]);

  const showPrevImage = () => {
    if (!displayImages.length) return;
    setActiveImg((current) => (current === 0 ? displayImages.length - 1 : current - 1));
  };

  const showNextImage = () => {
    if (!displayImages.length) return;
    setActiveImg((current) => (current === displayImages.length - 1 ? 0 : current + 1));
  };

  useEffect(() => {
    setProductLoading(true);
    setActiveImg(0);
    window.scrollTo({ top: 0, behavior: "smooth" });

    Promise.allSettled([
      productsApi.getById(productId),
      reviewsApi.getByProduct(productId),
      brandsApi.getAll(),
      productImageApi.getByProduct(productId),
      productFaqApi.getByProduct(productId),
      productVariantsApi.getVisible(productId).catch(() => []),
      productsApi.getAll().catch(() => []),
      productsApi.getPaymentOptions(productId).catch(() => []),
    ]).then(([prodR, revR, brandsR, imagesR, faqsR, variantsR, allProdsR, payOptsR]) => {
      if (prodR.status === "fulfilled" && prodR.value) {
        const raw    = asObject(prodR.value);
        const brands = asArray(brandsR.value);
        const images = asArray(imagesR.value);
        const faqs   = asArray(faqsR.value);

        // Group variant-specific images into a map: variantId(string) → sorted url[]
        const vBuckets = new Map();
        images.forEach((img) => {
          const rawVid = img.variantId ?? img.VariantId ?? null;
          if (!rawVid) return;
          const vid = String(rawVid);
          const bucket = vBuckets.get(vid) ?? [];
          bucket.push(img);
          vBuckets.set(vid, bucket);
        });
        const vMap = new Map();
        vBuckets.forEach((imgs, vid) => {
          vMap.set(vid,
            [...imgs]
              .sort((a, b) => ((b.isPrimary ?? b.IsPrimary) ? 1 : 0) - ((a.isPrimary ?? a.IsPrimary) ? 1 : 0))
              .map((img) => img.imageUrl ?? img.ImageUrl)
              .filter(Boolean)
          );
        });
        setVariantImagesMap(vMap);
        const brandName = brands.find(
          (brand) => (brand.brandId ?? brand.BrandId) === (raw.brandId ?? raw.BrandId)
        )?.name ?? brands.find(
          (brand) => (brand.brandId ?? brand.BrandId) === (raw.brandId ?? raw.BrandId)
        )?.Name;

        const normalizedProduct = normalizeProduct(raw, { brandName, images, faqs });
        setProduct(normalizedProduct.inSale ? normalizedProduct : null);

        // Similar products — same brand, excluding current, first 4
        if (allProdsR.status === "fulfilled") {
          const allProds = asArray(allProdsR.value);
          const rawBrandId = raw.brandId ?? raw.BrandId;
          const similar = allProds
            .filter((p) => {
              const pid = p.productId ?? p.ProductId ?? p.id;
              const bid = p.brandId ?? p.BrandId;
              const active = (p.inSale ?? p.InSale ?? p.insale) !== false;
              return pid !== productId && bid === rawBrandId && active;
            })
            .slice(0, 4)
            .map((p) => normalizeProduct(p));
          setSimilarProducts(similar);
        }
      }
      if (revR.status === "fulfilled") {
        setProductReviews(Array.isArray(revR.value) ? revR.value : []);
      }
      if (payOptsR.status === "fulfilled") {
        setPaymentOptions(Array.isArray(payOptsR.value) ? payOptsR.value : []);
      }
      // Load visible variants (including sold-out — they render as disabled options)
      if (variantsR.status === "fulfilled") {
        const vList = asArray(variantsR.value);
        setVariants(vList);
        // Pre-select first in-stock variant; fall back to first variant if all sold out
        const firstInStock = vList.find((v) => variantStockOf(v) > 0) ?? vList[0] ?? null;
        setSelectedVariant(firstInStock);
      }
    }).finally(() => setProductLoading(false));
  }, [productId]);

  // FAQs come from the product object
  const productFaqs = product?.faqs ?? [];

  //  rating
  const avgRating = useMemo(() => {
    if (!productReviews.length) return 0;
    const sum = productReviews.reduce((a, b) => a + Number(b.rating ?? b.rate ?? 0), 0);
    return sum / productReviews.length;
  }, [productReviews]);

  useEffect(() => {
    if (!wrapRef.current) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".pd-hero",
        { y: 18, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.55, ease: "power2.out" }
      );

      gsap.utils.toArray(".pd-section").forEach((el) => {
        gsap.fromTo(
          el,
          { y: 22, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.55,
            ease: "power2.out",
            scrollTrigger: { trigger: el, start: "top 85%" },
          }
        );
      });
    }, wrapRef);

    return () => ctx.revert();
  }, []);

  // Scroll-linked: gallery translates down proportionally as user scrolls through the hero.
  // Uses a live scroll listener so dynamic height changes (description expand/collapse) always work.
  useEffect(() => {
    if (!product || !heroRef.current || !galleryRef.current) return;

    const gallery = galleryRef.current;
    const hero    = heroRef.current;
    const NAVBAR  = 112;

    const onScroll = () => {
      // Mobile only: clear any transform and skip
      if (window.innerWidth < 768) {
        gallery.style.transform = "";
        return;
      }
      const heroRect  = hero.getBoundingClientRect();
      const maxTravel = Math.max(0, hero.offsetHeight - gallery.offsetHeight);
      const denom     = hero.offsetHeight - window.innerHeight + NAVBAR;
      const progress  = denom <= 0 ? 0 : Math.max(0, Math.min(1, (NAVBAR - heroRect.top) / denom));
      gallery.style.transform = `translateY(${Math.round(progress * maxTravel)}px)`;
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    onScroll();

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      gallery.style.transform = "";
    };
  }, [product]);

  if (productLoading) {
    return (
      <div className="w-full overflow-hidden">
        <Navibar solidDark />
        <div className="h-16 sm:h-20 lg:h-24" />
        <div className="flex items-center justify-center py-16 sm:py-24">
          <div className="w-10 h-10 rounded-full border-4 border-tenzy-teal/30 border-t-tenzy-teal animate-spin" />
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="w-full overflow-hidden">
        <Navibar solidDark />
        <div className="h-16 sm:h-20 lg:h-24" />
        <main className="mx-auto max-w-7xl px-4 sm:px-6 py-8 sm:py-10">
          <div className="rounded-2xl sm:rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 text-center">
            <h2 className="text-xl font-semibold text-slate-900">Product not found</h2>
            <p className="mt-2 text-slate-600 text-sm">The product you are looking for doesn’t exist.</p>
            <button onClick={() => navigate("/home")}
              className="mt-5 rounded-2xl px-5 py-3 text-sm font-semibold transition hover:opacity-90"
              style={{ background: "#2BB9B4", color: "white" }}>
              Back to Home
            </button>
          </div>
        </main>
      </div>
    );
  }

  // When a variant is selected, override price/stock/weight/volume/tabs with variant values
  // Only use the variant's price if it's actually set (> 0); otherwise fall back to product price
  const variantPrice  = selectedVariant
    ? variantPriceOf(selectedVariant)
    : 0;
  const displayPrice  = selectedVariant
    ? Math.round(variantPrice > 0 ? variantPrice : product.discountedPrice)
    : product.discountedPrice;
  const displayStock  = selectedVariant
    ? variantStockOf(selectedVariant, product.stockCount)
    : product.stockCount;
  const displayWeight = selectedVariant
    ? (selectedVariant.Weight ?? selectedVariant.weight ?? product.weight)
    : product.weight;
  const displayVolume = selectedVariant
    ? (selectedVariant.Volume ?? selectedVariant.volume ?? null)
    : (product.volume ?? null);
  const displayTabs   = selectedVariant
    ? Number(selectedVariant.TabsCount ?? selectedVariant.tabsCount ?? 0)
    : 0;

  const outOfStock = selectedVariant
    ? displayStock === 0
    : (!!product.outOfStock || product.stockCount === 0);

  // Always show variant selector on the detail page when in-stock variants exist
  const showVariantTabs = variants.length > 0;


  return (
    <div ref={wrapRef} className="w-full overflow-hidden" style={{ background: "#fafaf8" }}>
      <Navibar />
      <div className="h-16 sm:h-20 lg:h-24" />

      <main className="mx-auto w-full max-w-7xl px-4 sm:px-6 pt-2 sm:pt-4 lg:pt-8 pb-16 sm:pb-20">
        {/* ── HERO ─────────────────────────────────────────────────────── */}
        <section ref={heroRef} className="pd-hero grid gap-6 lg:gap-8 lg:grid-cols-2 xl:grid-cols-[55%_45%]">

          {/* Gallery */}
          <div ref={galleryRef} className="self-start" style={{ willChange: "transform" }}>
            <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden aspect-[3/4] sm:aspect-[4/5]" style={{ background: "#f0ebe3" }}>
              {displayImages[activeImg] ? (
                <div className="flex h-full w-full items-center justify-center p-6 sm:p-8 lg:p-12">
                  <img src={displayImages[activeImg]} alt={product.name}
                    className="max-h-full max-w-full object-contain drop-shadow-[0_24px_40px_rgba(15,23,42,0.13)]" />
                </div>
              ) : (
                <div className="flex h-full w-full items-center justify-center text-sm text-slate-400">No image available</div>
              )}

              {displayImages.length > 1 && (
                <>
                  <button type="button" onClick={showPrevImage} aria-label="Previous"
                    className="absolute left-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-white/80 backdrop-blur text-slate-700 shadow transition hover:bg-white active:scale-90">
                    <ChevronLeft size={16} />
                  </button>
                  <button type="button" onClick={showNextImage} aria-label="Next"
                    className="absolute right-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-white/80 backdrop-blur text-slate-700 shadow transition hover:bg-white active:scale-90">
                    <ChevronRight size={16} />
                  </button>
                </>
              )}

              {product.inSale && (
                <span className="absolute top-4 left-4 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white" style={{ background: "#E8522A" }}>
                  Sale
                </span>
              )}
              {outOfStock && (
                <div className="absolute inset-0 flex items-end justify-center pb-5 bg-black/10">
                  <span className="rounded-full bg-black/70 px-4 py-1.5 text-xs font-bold tracking-widest uppercase text-white">Out of Stock</span>
                </div>
              )}
            </div>

            {/* Thumbnails */}
            {displayImages.length > 1 && (
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                {displayImages.map((src, i) => (
                  <button key={`${product.id}-img-${i}`} type="button" onClick={() => setActiveImg(i)}
                    className={`h-14 w-14 shrink-0 rounded-xl overflow-hidden border-2 transition ${i === activeImg ? "border-tenzy-teal" : "border-transparent hover:border-slate-300"}`}
                    style={{ background: "#f0ebe3" }}>
                    <img src={src} alt="" className="h-full w-full object-contain p-1" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info panel — editorial, flat */}
          <div className="flex flex-col gap-0 py-2 lg:py-4">

            {/* Brand + wishlist row */}
            <div className="flex items-start justify-between gap-3">
              <p className="text-[11px] font-bold tracking-[0.22em] uppercase" style={{ color: "#2BB9B4" }}>
                {product.brand}
              </p>
              <button type="button" onClick={() => toggleWishlist(product)} aria-label="Wishlist"
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition active:scale-90 ${isWishlisted(product.id) ? "border-red-200 bg-red-50 text-red-500" : "border-slate-200 bg-white text-slate-400 hover:text-slate-600"}`}>
                <span className="text-base leading-none">{isWishlisted(product.id) ? "♥" : "♡"}</span>
              </button>
            </div>

            {/* Product name — Cormorant Garamond */}
            <h1 className="mt-2 font-modern-negra text-[1.85rem] sm:text-[2.4rem] lg:text-[2.8rem] leading-[1.1] text-slate-900">
              {product.name}
            </h1>

            {/* Rating */}
            <div className="mt-3 flex items-center gap-2.5">
              <StarRow value={avgRating || 0} />
              <span className="text-xs text-slate-500">{avgRating ? avgRating.toFixed(1) : "0.0"} · {productReviews.length} reviews</span>
            </div>

            <div className="mt-5 h-px bg-slate-200" />

            {/* Variant selector */}
            {showVariantTabs && (
              <div className="mt-5 space-y-3">
                <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-slate-400">
                  {product.showTabletCount ? "Select count" : product.showWeight ? "Select weight" : "Select size"}
                </p>

                {/* ── Mobile: vertical list ───────────────────── */}
                <div className="md:hidden space-y-2">
                  {variants.map((v) => {
                    const vid      = variantIdOf(v);
                    const name     = variantNameOf(v);
                    const vol      = v.Volume ?? v.volume;
                    const wt       = v.Weight ?? v.weight;
                    const tabs     = Number(v.TabsCount ?? v.tabsCount ?? 0);
                    const stk      = variantStockOf(v);
                    const price    = variantPriceOf(v);
                    const soldOut  = stk === 0;
                    const lowStock = !soldOut && stk < 10;
                    const isActive = selectedVariant && String(variantIdOf(selectedVariant)) === String(vid);
                    const spec = [
                      product.showVolume      && vol      ? withUnit(vol, "ml")  : null,
                      product.showWeight      && wt       ? withUnit(wt, "g")    : null,
                      product.showTabletCount && tabs > 0 ? `${tabs} tabs`       : null,
                    ].filter(Boolean).join(" · ");
                    const specLines = [
                      product.showWeight      && wt  && Number(wt) > 0 ? `Weight -: ${withUnit(wt, "g")}`   : null,
                      product.showVolume      && vol                    ? `Volume -: ${withUnit(vol, "ml")}` : null,
                      product.showTabletCount && tabs > 0               ? `Tablets ${tabs}`                  : null,
                    ].filter(Boolean);
                    return (
                      <button key={vid} type="button" disabled={soldOut}
                        onClick={() => !soldOut && setSelectedVariant(v)}
                        className="relative w-full flex items-center gap-3 px-4 py-3 rounded-2xl border-2 text-left transition-all duration-150"
                        style={{
                          borderColor: isActive ? "#2BB9B4" : "#e2e8f0",
                          background:  isActive ? "rgba(43,185,180,0.06)" : soldOut ? "#f8fafc" : "white",
                          opacity:     soldOut ? 0.5 : 1,
                          cursor:      soldOut ? "not-allowed" : "pointer",
                        }}>
                        {soldOut && (
                          <span className="pointer-events-none absolute inset-0 rounded-2xl overflow-hidden">
                            <span className="absolute inset-0" style={{ background: "repeating-linear-gradient(-45deg,transparent,transparent 6px,rgba(148,163,184,0.15) 6px,rgba(148,163,184,0.15) 7px)" }} />
                          </span>
                        )}
                        {/* Radio */}
                        <span className="shrink-0 flex h-5 w-5 items-center justify-center rounded-full border-2 transition"
                          style={{ borderColor: isActive ? "#2BB9B4" : "#cbd5e1" }}>
                          {isActive && <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#2BB9B4" }} />}
                        </span>
                        {/* Name + specs */}
                        <span className="flex-1 min-w-0">
                          <span className={`block text-sm font-semibold leading-tight ${isActive ? "text-tenzy-teal" : soldOut ? "text-slate-400" : "text-slate-800"}`}>
                            {name || spec || "Option"}
                          </span>
                          {name && specLines.map((line, i) => (
                            <span key={i} className="block mt-0.5 text-[11px] font-medium text-slate-400">{line}</span>
                          ))}
                        </span>
                        {/* Price + stock */}
                        <span className="shrink-0 text-right">
                          {price > 0 && (
                            <span className={`block text-sm font-bold ${isActive ? "text-tenzy-teal" : "text-slate-700"}`}>
                              LKR {formatLKR(price)}
                            </span>
                          )}
                          <span className={`block text-[10px] font-bold uppercase tracking-wide ${soldOut ? "text-red-400" : lowStock ? "text-amber-500" : "text-emerald-600"}`}>
                            {soldOut ? "Sold out" : lowStock ? `Only ${stk} left` : "In stock"}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* ── Desktop: card grid ──────────────────────── */}
                <div className="hidden md:flex flex-wrap gap-2.5">
                  {variants.map((v) => {
                    const vid      = variantIdOf(v);
                    const name     = variantNameOf(v);
                    const vol      = v.Volume ?? v.volume;
                    const wt       = v.Weight ?? v.weight;
                    const tabs     = Number(v.TabsCount ?? v.tabsCount ?? 0);
                    const stk      = variantStockOf(v);
                    const price    = variantPriceOf(v);
                    const soldOut  = stk === 0;
                    const lowStock = !soldOut && stk < 10;
                    const isActive = selectedVariant && String(variantIdOf(selectedVariant)) === String(vid);
                    const spec = [
                      product.showVolume      && vol      ? withUnit(vol, "ml")  : null,
                      product.showWeight      && wt       ? withUnit(wt, "g")    : null,
                      product.showTabletCount && tabs > 0 ? `${tabs} tabs`       : null,
                    ].filter(Boolean).join(" · ");
                    const specLines = [
                      product.showWeight      && wt  && Number(wt) > 0 ? `Weight -: ${withUnit(wt, "g")}`   : null,
                      product.showVolume      && vol                    ? `Volume -: ${withUnit(vol, "ml")}` : null,
                      product.showTabletCount && tabs > 0               ? `Tablets ${tabs}`                  : null,
                    ].filter(Boolean);
                    return (
                      <button key={vid} type="button" disabled={soldOut}
                        onClick={() => setSelectedVariant(v)}
                        className="relative flex flex-col items-start rounded-2xl border-2 px-4 py-3 text-left transition-all duration-150 min-w-[100px]"
                        style={{
                          borderColor: isActive ? "#2BB9B4" : "#e2e8f0",
                          background:  isActive ? "rgba(43,185,180,0.07)" : soldOut ? "#f8fafc" : "white",
                          opacity:     soldOut ? 0.55 : 1,
                          cursor:      soldOut ? "not-allowed" : "pointer",
                          boxShadow:   isActive ? "0 0 0 3px rgba(43,185,180,0.18)" : "none",
                        }}>
                        {soldOut && (
                          <span className="pointer-events-none absolute inset-0 rounded-2xl overflow-hidden">
                            <span className="absolute inset-0" style={{ background: "repeating-linear-gradient(-45deg,transparent,transparent 6px,rgba(148,163,184,0.18) 6px,rgba(148,163,184,0.18) 7px)" }} />
                          </span>
                        )}
                        <span className={`text-sm font-semibold leading-tight ${isActive ? "text-tenzy-teal" : soldOut ? "text-slate-400" : "text-slate-800"}`}>
                          {name || spec || "Option"}
                        </span>
                        {name && specLines.map((line, i) => (
                          <span key={i} className="mt-0.5 text-[11px] font-medium text-slate-400">{line}</span>
                        ))}
                        {price > 0 && (
                          <span className={`mt-2 text-xs font-bold ${isActive ? "text-tenzy-teal" : "text-slate-600"}`}>
                            LKR {formatLKR(price)}
                          </span>
                        )}
                        <span className={`mt-1.5 text-[10px] font-bold uppercase tracking-wide ${
                          soldOut ? "text-red-400" : lowStock ? "text-amber-500" : isActive ? "text-teal-500" : "text-emerald-600"
                        }`}>
                          {soldOut ? "Sold out" : lowStock ? `Only ${stk} left` : `${stk} in stock`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            

            {/* Price */}
            <div className="mt-5 flex items-end gap-4">
              {displayPrice > 0 ? (
                <>
                  <div>
                    <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-slate-400 mb-0.5">Price</p>
                    <p className="font-modern-negra text-3xl sm:text-4xl text-slate-900 leading-none">
                      LKR {formatLKR(displayPrice)}
                    </p>
                  </div>
                  {!selectedVariant && product.discountPercent > 0 && (
                    <div className="mb-0.5">
                      <p className="text-sm text-slate-400 line-through">LKR {formatLKR(product.price)}</p>
                      <span className="inline-block rounded-full px-2 py-0.5 text-[10px] font-bold text-white" style={{ background: "#E8522A" }}>
                        -{product.discountPercent}%
                      </span>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm italic text-slate-400">Price not yet available</p>
              )}
            </div>

            {/* Payment options */}
            {paymentOptions.length > 0 && (() => {
              const direct = paymentOptions.filter(o => !(o.instalment ?? o.Instalment));
              const plans  = paymentOptions.filter(o =>  !!(o.instalment ?? o.Instalment));
              return (
                <div className="mt-5 rounded-2xl overflow-hidden"
                  style={{ background: "rgba(43,185,180,0.04)", border: "1.5px solid rgba(43,185,180,0.18)" }}>

                  {/* Centred heading */}
                  <div className="flex items-center gap-3 px-4 pt-4 pb-2">
                    <div className="flex-1 h-px" style={{ background: "rgba(43,185,180,0.2)" }} />
                    <p className="text-[10px] font-black tracking-[0.22em] uppercase shrink-0"
                      style={{ color: "#2BB9B4" }}>Payment Options</p>
                    <div className="flex-1 h-px" style={{ background: "rgba(43,185,180,0.2)" }} />
                  </div>

                  <div className="px-4 pb-4 space-y-3">

                    {/* Direct-payment chips */}
                    {direct.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {direct.map((opt) => {
                          const name = opt.paymentType ?? opt.PaymentType ?? "Payment";
                          return (
                            <div key={opt.paymentTypeId ?? opt.PaymentTypeId}
                              className="flex items-center gap-2 rounded-full bg-white border border-slate-200 pl-1 pr-3 py-1">
                              <span className="h-5 w-5 shrink-0 flex items-center justify-center rounded-full text-[9px] font-black text-white"
                                style={{ background: "#2BB9B4" }}>✓</span>
                              <span className="text-xs font-semibold text-slate-700 whitespace-nowrap">{name}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Installment plan cards */}
                    {plans.length > 0 && (
                      <>
                        {direct.length > 0 && (
                          <div className="flex items-center gap-3">
                            <div className="flex-1 h-px bg-slate-200" />
                            <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400 shrink-0">
                              Installment Plans
                            </span>
                            <div className="flex-1 h-px bg-slate-200" />
                          </div>
                        )}
                        <div className={`grid gap-2 ${plans.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
                          {plans.map((opt) => {
                            const name     = opt.paymentType ?? opt.PaymentType ?? "Plan";
                            const n        = opt.instalment  ?? opt.Instalment;
                            const perMonth = displayPrice > 0 && n
                              ? Math.ceil(displayPrice / n)
                              : null;
                            return (
                              <div key={opt.paymentTypeId ?? opt.PaymentTypeId}
                                className="rounded-xl bg-white border border-slate-100 px-3.5 py-3 flex flex-col gap-1">
                                <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400 truncate">
                                  {name}
                                </p>
                                <p className="font-modern-negra text-3xl leading-none text-slate-900 mt-0.5">
                                  {n}
                                  <span className="font-sans text-sm font-semibold text-slate-400 ml-1">months</span>
                                </p>
                                {perMonth && (
                                  <p className="text-xs font-bold mt-0.5" style={{ color: "#2BB9B4" }}>
                                    LKR {formatLKR(perMonth)}
                                    <span className="text-[10px] font-normal text-slate-400"> / month</span>
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })()}

            <div className="mt-6 h-px bg-slate-100" />

            {/* Quantity selector */}
            <div className="mt-5">
              <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-slate-400 mb-2">Quantity</p>
              {outOfStock ? (
                <div className="flex items-center gap-3">
                  <div className="flex items-center rounded-2xl border-2 border-red-200 bg-red-50 overflow-hidden">
                    <span className="px-4 py-2.5 text-sm font-bold text-red-300 select-none">−</span>
                    <span className="px-4 py-2.5 text-sm font-bold text-red-300 border-x border-red-200 min-w-[3rem] text-center">0</span>
                    <span className="px-4 py-2.5 text-sm font-bold text-red-300 select-none">+</span>
                  </div>
                  <span className="text-xs font-semibold text-red-500 bg-red-50 border border-red-200 px-3 py-1.5 rounded-xl">Out of Stock</span>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="flex items-center rounded-2xl border-2 overflow-hidden transition-colors" style={{ borderColor: "#2BB9B4" }}>
                    <button
                      type="button"
                      onClick={() => setQty((q) => Math.max(1, q - 1))}
                      disabled={qty <= 1}
                      className="px-4 py-2.5 text-sm font-bold transition active:scale-90 select-none"
                      style={{ color: qty <= 1 ? "#94a3b8" : "#2BB9B4" }}
                    >−</button>
                    <span className="px-4 py-2.5 text-sm font-bold text-slate-800 border-x min-w-[3rem] text-center" style={{ borderColor: "#2BB9B4" }}>
                      {qty}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQty((q) => Math.min(displayStock, q + 1))}
                      disabled={qty >= displayStock}
                      className="px-4 py-2.5 text-sm font-bold transition active:scale-90 select-none"
                      style={{ color: qty >= displayStock ? "#94a3b8" : "#2BB9B4" }}
                    >+</button>
                  </div>
                  {qty >= displayStock && (
                    <span className="text-xs font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl">
                      Max stock reached
                    </span>
                  )}
                  {displayStock < 10 && qty < displayStock && (
                    <span className="text-xs font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl">
                      Only {displayStock} left
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Order total */}
            {!outOfStock && displayPrice > 0 && (
              <div className="mt-4 rounded-2xl px-4 py-3.5 flex items-center justify-between gap-3" style={{ background: "rgba(43,185,180,0.07)", border: "1.5px solid rgba(43,185,180,0.22)" }}>
                <div className="flex items-center gap-2 text-sm text-slate-500 flex-wrap">
                  <span className="font-semibold text-slate-700">LKR {formatLKR(displayPrice)}</span>
                  <span className="text-slate-400">×</span>
                  <span className="font-semibold text-slate-700">{qty}</span>
                  <span className="text-slate-400">=</span>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[10px] font-bold tracking-[0.15em] uppercase text-teal-600 mb-0.5">Total</p>
                  <p className="font-modern-negra text-2xl leading-none" style={{ color: "#2BB9B4" }}>
                    LKR {formatLKR(displayPrice * qty)}
                  </p>
                </div>
              </div>
            )}

            {/* CTA buttons */}
            <div className="mt-5 flex flex-col sm:flex-row gap-3">
              <button type="button" disabled={outOfStock}
                onClick={(e) => { e.preventDefault(); if (!outOfStock) setCartConfirm(true); }}
                className={`flex-1 rounded-2xl py-3.5 text-sm font-bold tracking-wide transition active:scale-95 ${outOfStock ? "bg-slate-100 text-slate-400 cursor-not-allowed" : "text-white hover:opacity-90"}`}
                style={outOfStock ? {} : { background: "#2BB9B4", boxShadow: "0 6px 20px rgba(43,185,180,0.30)" }}>
                Add to Bag
              </button>
              <button type="button" disabled={outOfStock}
                onClick={() => navigate("/checkout")}
                className={`flex-1 rounded-2xl py-3.5 text-sm font-bold tracking-wide transition active:scale-95 ${outOfStock ? "bg-slate-100 text-slate-400 cursor-not-allowed" : "text-white hover:opacity-90"}`}
                style={outOfStock ? {} : { background: "#E8522A", boxShadow: "0 6px 20px rgba(232,82,42,0.28)" }}>
                Buy Now
              </button>
            </div>
            {outOfStock && <p className="mt-2 text-xs text-red-500 font-semibold">Currently unavailable.</p>}
          </div>
        </section>

        {/* ── CONTENT TABS ─────────────────────────────────────────── */}
        <section className="pd-section mt-10 sm:mt-14">
          {/* Tab bar — scrollable on mobile */}
          <div className="overflow-x-auto no-scrollbar border-b border-slate-200">
            <div className="flex min-w-max">
              {[
                { id: "description", label: "Description" },
                { id: "howToUse",    label: "How to Use"  },
                { id: "ingredients", label: "Ingredients" },
                { id: "reviews",     label: `Reviews (${productReviews.length})` },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className="px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-semibold tracking-[0.12em] uppercase transition-colors select-none whitespace-nowrap"
                  style={{
                    color: activeTab === tab.id ? "#2BB9B4" : "#64748b",
                    borderBottom: activeTab === tab.id ? "2px solid #2BB9B4" : "2px solid transparent",
                    marginBottom: "-1px",
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tab content */}
          <div className="py-7 sm:py-10 min-h-[120px]">
            {activeTab === "description" && <DescriptionTab  description={product.description} />}
            {activeTab === "howToUse"    && <HowToUseTab     howToUse={product.howToUse} />}
            {activeTab === "ingredients" && <IngredientsTab  ingredients={product.ingredients} />}
            {activeTab === "reviews"     && <ReviewsTab      reviews={productReviews} avgRating={avgRating} />}
          </div>
        </section>

        {/* ── FAQ ───────────────────────────────────────────────────────── */}
        <section className="pd-section mt-10 sm:mt-14">
          <p className="text-[11px] font-bold tracking-[0.2em] uppercase" style={{ color: "#2BB9B4" }}>FAQ</p>
          <h2 className="mt-1 font-modern-negra text-2xl sm:text-3xl text-slate-900">Frequently Asked</h2>
          <div className="mt-6 border-t border-slate-200">
            {productFaqs.length > 0 ? productFaqs.map((f, i) => (
              <details key={f.faqId ?? f.id ?? i} className="group border-b border-slate-200">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 select-none">
                  <span className="text-sm font-semibold text-slate-900">{f.question ?? f.q}</span>
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-400 text-sm transition group-open:rotate-45">+</span>
                </summary>
                <p className="pb-4 pt-1 text-sm leading-relaxed text-slate-600">{f.answer ?? f.a}</p>
              </details>
            )) : (
              <p className="py-5 text-sm text-slate-400 italic border-b border-slate-200">No frequently asked questions yet.</p>
            )}
          </div>
        </section>


        {/* ── SIMILAR PRODUCTS ──────────────────────────────────────────── */}
        {similarProducts.length > 0 && (
          <section className="pd-section mt-10 sm:mt-14">
            <p className="text-[11px] font-bold tracking-[0.2em] uppercase" style={{ color: "#2BB9B4" }}>You May Also Like</p>
            <h2 className="mt-1 font-modern-negra text-2xl sm:text-3xl text-slate-900">More from {product.brand}</h2>
            <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
              {similarProducts.map((sp) => (
                <button
                  key={sp.id}
                  type="button"
                  onClick={() => navigate(`/product/${sp.id}`)}
                  className="text-left group rounded-2xl overflow-hidden transition hover:shadow-lg"
                  style={{ background: "#f0ebe3" }}
                >
                  <div className="relative aspect-square overflow-hidden flex items-center justify-center p-6" style={{ background: "#f0ebe3" }}>
                    {sp.image ? (
                      <img
                        src={sp.image}
                        alt={sp.name}
                        className="max-h-full max-w-full object-contain transition-transform duration-500 group-hover:scale-[1.05]"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300 text-xs">No image</div>
                    )}
                  </div>
                  <div className="p-3 sm:p-4 bg-white">
                    <p className="text-[10px] sm:text-xs font-bold tracking-[0.16em] uppercase" style={{ color: "#2BB9B4" }}>{sp.brand}</p>
                    <p className="mt-1 text-xs sm:text-sm font-semibold text-slate-900 line-clamp-2">{sp.name}</p>
                    <p className="mt-1.5 text-xs sm:text-sm font-bold text-slate-900">LKR {formatLKR(sp.discountedPrice)}</p>
                    {sp.discountPercent > 0 && (
                      <p className="text-xs text-slate-400 line-through">LKR {formatLKR(sp.price)}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* ── Cart confirmation dialog ────────────────────────── */}
      {cartConfirm && !outOfStock && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setCartConfirm(false)} />
          <div className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden">

            {/* Header */}
            <div className="px-6 pt-6 pb-4 border-b border-slate-100">
              <p className="font-modern-negra text-2xl text-slate-900">Confirm your selection</p>
              <p className="text-sm text-slate-500 mt-1">Is this the correct variant you'd like to add to your bag?</p>
            </div>

            {/* Product summary */}
            <div className="px-6 py-4 space-y-4">
              {/* Product row */}
              <div className="flex items-start gap-3">
                {product.image && (
                  <div className="w-16 h-16 rounded-2xl overflow-hidden shrink-0" style={{ background: "#f0ebe3" }}>
                    <img src={product.image} alt={product.name} className="w-full h-full object-contain p-1.5" />
                  </div>
                )}
                <div className="flex-1 min-w-0 pt-0.5">
                  <p className="text-sm font-semibold text-slate-800 leading-snug line-clamp-2">{product.name}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{product.brand}</p>
                </div>
              </div>

              {/* Selected variant detail card */}
              <div className="rounded-2xl border border-slate-100 bg-slate-50 divide-y divide-slate-100">
                {selectedVariant && (
                  <div className="flex items-center justify-between px-4 py-2.5">
                    <span className="text-xs text-slate-500">Variant</span>
                    <span className="text-sm font-bold" style={{ color: "#2BB9B4" }}>
                      {variantNameOf(selectedVariant) || "Default"}
                    </span>
                  </div>
                )}
                {selectedVariant && (() => {
                  const v    = selectedVariant;
                  const vol  = v.Volume  ?? v.volume;
                  const wt   = v.Weight  ?? v.weight;
                  const tabs = Number(v.TabsCount ?? v.tabsCount ?? 0);
                  return [
                    product.showWeight      && wt  && Number(wt) > 0 ? ["Weight",  withUnit(wt,  "g")]   : null,
                    product.showVolume      && vol                    ? ["Volume",  withUnit(vol, "ml")]   : null,
                    product.showTabletCount && tabs > 0               ? ["Tablets", String(tabs)]          : null,
                  ].filter(Boolean).map(([label, val]) => (
                    <div key={label} className="flex items-center justify-between px-4 py-2.5">
                      <span className="text-xs text-slate-500">{label}</span>
                      <span className="text-xs font-semibold text-slate-700">{val}</span>
                    </div>
                  ));
                })()}
                <div className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-xs text-slate-500">Quantity</span>
                  <span className="text-sm font-bold text-slate-800">{qty}</span>
                </div>
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm font-semibold text-slate-700">Total</span>
                  <span className="text-lg font-black" style={{ color: "#2BB9B4" }}>
                    LKR {formatLKR(displayPrice * qty)}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="px-6 pb-6 flex gap-3">
              <button type="button" onClick={() => setCartConfirm(false)}
                className="flex-1 py-3 rounded-2xl border-2 border-slate-200 text-sm font-semibold text-slate-600 hover:border-slate-300 transition active:scale-95">
                Change
              </button>
              <button type="button"
                onClick={() => {
                  const vid = variantIdOf(selectedVariant);
                  const cartItem = selectedVariant
                    ? { ...product, id: `${product.id}-v${vid}`, discountedPrice: displayPrice, price: displayPrice, stockCount: displayStock, variantId: vid, variantName: variantNameOf(selectedVariant) }
                    : product;
                  addToCart(cartItem, qty);
                  setCartConfirm(false);
                  navigate("/cart");
                }}
                className="flex-1 py-3 rounded-2xl text-sm font-bold text-white transition active:scale-95"
                style={{ background: "#2BB9B4", boxShadow: "0 6px 20px rgba(43,185,180,0.28)" }}>
                Yes, Add to Bag
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default ProductDetails;
