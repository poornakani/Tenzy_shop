// ProductsPage.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import { BrandsList } from "@/ProductsJson";
import { useWishlist } from "../Context/WishlistContext";
import { SellingProducts } from "@/ProductsJson";
import Navibar from "@/HomePage/Navibar";
import { useCart } from "@/Context/CartContext";
import { useToast } from "@/Context/ToastContext";

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

const ProductsPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const wrapRef = useRef(null);

  // Mobile slide panel
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);
  const [mobilePanelTab, setMobilePanelTab] = useState("sort");
  const panelRef = useRef(null);

  // Wishlist (optional)
  const wishlistApi = useWishlist?.();
  const toggleWishlist = wishlistApi?.toggleWishlist ?? (() => {});
  const isWishlisted = wishlistApi?.isWishlisted ?? (() => false);

  // Read concernID from URL (?concernID=1)
  const concernIDParam =
    searchParams.get("concernID") || searchParams.get("concern");
  const activeConcernID = concernIDParam ? Number(concernIDParam) : null;

  // -------- Prepare normalized product list --------
  const products = useMemo(() => {
    return (SellingProducts || []).map((p) => {
      const discountedPrice = calcDiscounted(p.price, p.discountPercent);

      // normalize brandId (supports different property names + fallback from old "brand" string)
      const rawBrandId =
        p.brandId ?? p.BrandID ?? p.brandID ?? p.brand_id ?? p.brand ?? null;

      let brandObj = null;

      // if brandId exists, match by id (supports id or BrandID)
      if (rawBrandId !== null && typeof rawBrandId !== "undefined") {
        brandObj =
          BrandsList?.find(
            (b) => String(b.id ?? b.BrandID) === String(rawBrandId)
          ) || null;
      }

      // fallback: if product still has brand string, match by name
      if (!brandObj && p.brand && typeof p.brand === "string") {
        brandObj =
          BrandsList?.find(
            (b) =>
              String(b.name ?? b.BrandName ?? "")
                .trim()
                .toLowerCase() === String(p.brand).trim().toLowerCase()
          ) || null;
      }

      const normalizedBrandId =
        brandObj?.id ??
        brandObj?.BrandID ??
        (rawBrandId !== null && typeof rawBrandId !== "undefined"
          ? Number(rawBrandId)
          : undefined);

      const brandName =
        brandObj?.name ??
        brandObj?.BrandName ??
        (typeof p.brand === "string" ? p.brand : "Unknown");
      const brandLogo = brandObj?.logo ?? brandObj?.BrandLogo ?? "";

      return {
        ...p,
        discountedPrice,
        category: p.category || "Skin",

        // keep your UI using p.brand, but back it by brandId
        brand: brandName,
        brandId: normalizedBrandId,
        brandName,
        brandLogo,

        sku: p.sku || `SKU-${p.id}`,
        description:
          p.description ||
          "Premium quality product with a clean modern feel. Comfortable daily use.",
        images:
          Array.isArray(p.images) && p.images.length ? p.images : [p.image],

        concernIds: Array.isArray(p.concernIds) ? p.concernIds : undefined,
        concernID:
          typeof p.concernID === "number"
            ? p.concernID
            : typeof p.concernID === "string"
              ? Number(p.concernID)
              : undefined,
      };
    });
  }, []);

  // Unique categories from products (no duplicates)
  const uniqueCats = useMemo(() => {
    const set = new Set(products.map((p) => p.category).filter(Boolean));
    return ["All", ...Array.from(set)];
  }, [products]);

  // -------- Filter states --------
  const [activeCategory, setActiveCategory] = useState("All");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("featured");
  const [onlySale, setOnlySale] = useState(false);
  const [onlyInStock, setOnlyInStock] = useState(false);
  const { showToast } = useToast();

  // Brand filter (single source of truth)
  const [selectedBrandId, setSelectedBrandId] = useState("All");

  // Price slider bounds
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

  // -------- Read category from URL (?category=Skin) --------
  useEffect(() => {
    const cat = searchParams.get("category");
    if (cat && uniqueCats.includes(cat)) setActiveCategory(cat);
  }, [searchParams, uniqueCats]);

  // If concernID exists, keep category "All" (so concern controls the result)
  useEffect(() => {
    if (activeConcernID) {
      setActiveCategory("All");
    }
  }, [activeConcernID]);

  // -------- Filtered list --------
  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();

    let list = products.filter((p) => {
      // Concern filter first
      if (activeConcernID) {
        const hasConcern =
          (Array.isArray(p.concernIds) &&
            p.concernIds.includes(activeConcernID)) ||
          (typeof p.concernID === "number" && p.concernID === activeConcernID);

        if (!hasConcern) return false;
      }

      if (activeCategory !== "All" && p.category !== activeCategory)
        return false;

      // Brand filtering: compare by brandId (int) + ignore bad values
      if (
        selectedBrandId !== "All" &&
        selectedBrandId !== "" &&
        selectedBrandId !== "undefined" &&
        String(p.brandId) !== String(selectedBrandId)
      )
        return false;

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
    activeConcernID,
    activeCategory,
    selectedBrandId,
    q,
    sort,
    onlySale,
    onlyInStock,
    maxPrice,
  ]);

  // -------- Pagination (only when > 20) --------
  const PAGE_SIZE = 20;
  const [page, setPage] = useState(1);

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  }, [filtered.length]);

  useEffect(() => {
    setPage(1);
  }, [
    activeCategory,
    selectedBrandId,
    q,
    sort,
    onlySale,
    onlyInStock,
    maxPrice,
    activeConcernID,
  ]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pagedProducts = useMemo(() => {
    if (filtered.length <= PAGE_SIZE) return filtered;
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  // -------- GSAP animations --------
  useEffect(() => {
    if (!wrapRef.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".pp-hero",
        { y: 14, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.55, ease: "power2.out" }
      );

      gsap.fromTo(
        ".pp-card",
        { y: 18, opacity: 0, scale: 0.985 },
        {
          y: 0,
          opacity: 1,
          scale: 1,
          duration: 0.45,
          ease: "power2.out",
          stagger: 0.04,
          scrollTrigger: { trigger: ".pp-grid", start: "top 85%" },
        }
      );
    }, wrapRef);

    return () => ctx.revert();
  }, []);

  // Subtle reflow animation on filter change / page change
  useEffect(() => {
    gsap.fromTo(
      ".pp-card",
      { y: 10, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.25, stagger: 0.02, ease: "power2.out" }
    );
  }, [
    activeCategory,
    selectedBrandId,
    q,
    sort,
    onlySale,
    onlyInStock,
    maxPrice,
    activeConcernID,
    page,
  ]);

  // Mobile panel open animation
  useEffect(() => {
    if (!panelRef.current) return;
    if (mobilePanelOpen) {
      gsap.fromTo(
        panelRef.current,
        { x: -40, autoAlpha: 0 },
        { x: 0, autoAlpha: 1, duration: 0.22, ease: "power2.out" }
      );
    }
  }, [mobilePanelOpen]);

  // -------- Actions --------
  const clearFilters = () => {
    setActiveCategory("All");
    setSelectedBrandId("All");
    setQ("");
    setSort("featured");
    setOnlySale(false);
    setOnlyInStock(false);
    setMaxPrice(priceMax);
  };

  const { addToCart } = useCart();

  const showPagination = filtered.length > PAGE_SIZE;

  return (
    <div ref={wrapRef} className="w-full overflow-hidden">
      <Navibar />

      {/* Helps glass nav be visible */}
      <div className="h-24 bg-linear-to-b from-slate-950/90 via-slate-900/60 to-transparent" />

      <main className="mx-auto w-full max-w-7xl px-4 sm:px-6 pb-12">
        {/* HERO (mobile minimal: search only + buttons) */}
        <section className="pp-hero rounded-3xl border border-slate-300/70 bg-white shadow-sm overflow-hidden">
          <div className="relative p-5 sm:p-6">
            {/* more colorful + slightly darker */}
            <div className="absolute inset-0 bg-linear-to-r from-indigo-200/55 via-amber-100/55 to-rose-200/55" />
            <div className="absolute inset-0 bg-linear-to-b from-slate-900/10 via-transparent to-slate-900/5" />

            <div className="relative">
              {/* Desktop heading only */}
              <div className="hidden md:flex md:items-end md:justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold text-slate-600 tracking-wide">
                    PRODUCTS
                  </p>
                  <h1 className="mt-2 text-2xl sm:text-3xl font-semibold text-slate-950">
                    Find your perfect match
                  </h1>
                  <p className="mt-2 text-sm text-slate-700 max-w-2xl">
                    Search by name, filter by category, price, availability, and
                    brand. Tap a product to see full details.
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-300/70 bg-white/70 backdrop-blur px-4 py-3">
                  <p className="text-xs text-slate-600">Results</p>
                  <p className="text-lg font-semibold text-slate-950">
                    {filtered.length}
                  </p>
                  {showPagination && (
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      Page {page} / {totalPages}
                    </p>
                  )}
                </div>
              </div>

              {/* Search + suggestions */}
              <div className="mt-0 md:mt-5 grid gap-3 lg:grid-cols-3">
                <div className="relative lg:col-span-2">
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search products by name…"
                    className="w-full rounded-2xl border border-slate-300/70 bg-white/90 px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-300"
                  />

                  {suggestions.length > 0 && (
                    <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-2xl border border-slate-300/70 bg-white/85 backdrop-blur shadow-xl">
                      {suggestions.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => goToProduct(p)}
                          className="w-full px-4 py-3 text-left hover:bg-slate-50 transition flex items-center justify-between"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-950 truncate">
                              {p.name}
                            </p>
                            <p className="text-xs text-slate-600">
                              {p.category} • {p.brand}
                            </p>
                          </div>
                          <p className="text-sm font-semibold text-slate-950">
                            LKR {formatLKR(p.discountedPrice)}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Mobile actions: Sort/Filters buttons */}
                  <div className="mt-3 flex md:hidden gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setMobilePanelTab("sort");
                        setMobilePanelOpen(true);
                      }}
                      className="flex-1 rounded-2xl border border-slate-300/70 bg-white/90 px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-slate-50 transition"
                    >
                      Sort
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setMobilePanelTab("filters");
                        setMobilePanelOpen(true);
                      }}
                      className="flex-1 rounded-2xl border border-slate-300/70 bg-white/90 px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-slate-50 transition"
                    >
                      Filters
                    </button>
                  </div>
                </div>

                {/* Desktop sort + clear only */}
                <div className="hidden md:grid grid-cols-2 gap-3 lg:grid-cols-1">
                  <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value)}
                    className="rounded-2xl border border-slate-300/70 bg-white/90 px-4 py-3 text-sm font-semibold text-slate-950 outline-none"
                  >
                    <option value="featured">Featured</option>
                    <option value="priceAsc">Price: Low → High</option>
                    <option value="priceDesc">Price: High → Low</option>
                    <option value="discount">Highest Discount</option>
                    <option value="stock">Most Stock</option>
                  </select>

                  <button
                    type="button"
                    onClick={clearFilters}
                    className="rounded-2xl border border-slate-300/70 bg-white/90 px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-slate-50 transition"
                  >
                    Clear
                  </button>
                </div>
              </div>

              {/* Desktop category tabs only */}
              <div className="hidden md:flex mt-5 flex-wrap gap-2">
                {uniqueCats.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setActiveCategory(cat)}
                    className={`rounded-2xl px-4 py-2 text-sm font-semibold transition
                      ${
                        activeCategory === cat
                          ? "bg-slate-950 text-white"
                          : "bg-white/85 border border-slate-300/70 text-slate-950 hover:bg-slate-50"
                      }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Filters + Grid */}
        <section className="mt-6 grid gap-5 lg:grid-cols-12">
          {/* Desktop filters sidebar only */}
          <aside className="hidden lg:block lg:col-span-3 rounded-3xl border border-slate-300/70 bg-linear-to-b from-slate-50 via-white to-indigo-50 shadow-sm p-5 sm:p-6">
            <h2 className="text-lg font-semibold text-slate-950">Filters</h2>
            <p className="mt-1 text-sm text-slate-700">
              Refine results quickly.
            </p>

            {/* Price */}
            <div className="mt-5">
              <p className="text-sm font-semibold text-slate-950">Max Price</p>
              <p className="text-xs text-slate-600 mt-1">
                LKR {formatLKR(priceMin)} — LKR {formatLKR(priceMax)}
              </p>

              <input
                type="range"
                min={priceMin}
                max={priceMax}
                value={maxPrice}
                onChange={(e) =>
                  setMaxPrice(clamp(Number(e.target.value), priceMin, priceMax))
                }
                className="mt-3 w-full"
              />
              <div className="mt-2 rounded-2xl border border-slate-300/70 bg-white/80 px-3 py-2 text-sm font-semibold text-slate-950">
                Up to: LKR {formatLKR(maxPrice)}
              </div>
            </div>

            {/* Brand */}
            <div className="mt-5">
              <p className="text-sm font-semibold text-slate-950">Brand</p>
              <select
                value={selectedBrandId}
                onChange={(e) => {
                  const v = e.target.value;
                  setSelectedBrandId(
                    v === "All" || v === "" || v === "undefined" ? "All" : v
                  );
                }}
                className="mt-2 w-full rounded-2xl border border-slate-300/70 bg-white/90 px-4 py-3 text-sm font-semibold text-slate-950 outline-none"
              >
                <option value="All">All Brands</option>
                {BrandsList.map((b) => {
                  const id = b.id ?? b.BrandID ?? b.brandId ?? b.brandID;
                  return (
                    <option key={id ?? b.name} value={String(id)}>
                      {b.name ?? b.BrandName}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Toggles */}
            <div className="mt-5 grid gap-3">
              <label className="flex items-center justify-between rounded-2xl border border-slate-300/70 bg-white/90 px-4 py-3">
                <span className="text-sm font-semibold text-slate-950">
                  In Sale
                </span>
                <input
                  type="checkbox"
                  checked={onlySale}
                  onChange={(e) => setOnlySale(e.target.checked)}
                  className="h-5 w-5"
                />
              </label>

              <label className="flex items-center justify-between rounded-2xl border border-slate-300/70 bg-white/90 px-4 py-3">
                <span className="text-sm font-semibold text-slate-950">
                  In Stock
                </span>
                <input
                  type="checkbox"
                  checked={onlyInStock}
                  onChange={(e) => setOnlyInStock(e.target.checked)}
                  className="h-5 w-5"
                />
              </label>
            </div>

            <div className="mt-5 rounded-2xl bg-linear-to-r from-indigo-50 via-white to-amber-50 border border-slate-300/70 p-4">
              <p className="text-sm font-semibold text-slate-950">Tip</p>
              <p className="mt-1 text-xs text-slate-700">
                Use category tabs + search to find products faster.
              </p>
            </div>
          </aside>

          {/* Grid */}
          <section className="pp-grid lg:col-span-9">
            {filtered.length === 0 ? (
              <div className="rounded-3xl border border-slate-200 bg-white shadow-sm p-8 text-center">
                <h3 className="text-lg font-semibold text-slate-900">
                  No results found
                </h3>
                <p className="mt-2 text-sm text-slate-600">
                  Try changing filters or clearing search.
                </p>
                <button
                  type="button"
                  onClick={clearFilters}
                  className="mt-5 rounded-2xl bg-slate-900 text-white px-5 py-3 text-sm font-semibold hover:bg-slate-800 transition"
                >
                  Reset filters
                </button>
              </div>
            ) : (
              <>
                {/* DO NOT CHANGE middle products section colours (cards remain the same) */}
                <div className="grid gap-4 sm:gap-5 grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4">
                  {pagedProducts.map((p) => {
                    const outOfStock = p.outOfStock || p.stockCount === 0;

                    return (
                      <article
                        key={p.id}
                        className="pp-card group rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden"
                      >
                        {/* Image */}
                        <div
                          className="relative aspect-4/5 overflow-hidden cursor-pointer"
                          onClick={() => goToProduct(p)}
                        >
                          <img
                            src={p.image}
                            alt={p.name}
                            className={`h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]
                              ${outOfStock ? "blur-[2px] grayscale" : ""}`}
                          />

                          {p.inSale && (
                            <div className="absolute top-3 left-3 rounded-xl bg-linear-to-r from-pink-500 to-red-600 px-3 py-1.5 text-xs font-semibold text-white shadow-lg shadow-pink-500/20">
                              IN SALE
                            </div>
                          )}

                          <div
                            className={`absolute top-3 right-3 rounded-xl px-3 py-1.5 text-xs font-semibold text-white backdrop-blur shadow-lg
                              ${
                                outOfStock
                                  ? "bg-black/60"
                                  : "bg-linear-to-r from-emerald-500 to-teal-600 shadow-emerald-500/20"
                              }`}
                          >
                            {outOfStock
                              ? "Out of stock"
                              : `Stock: ${p.stockCount}`}
                          </div>

                          <div className="absolute inset-x-0 bottom-0 h-24 bg-linear-to-t from-black/45 to-transparent" />

                          {/* Bottom actions (mobile-friendly) */}
                          <div className="absolute inset-x-0 bottom-0 p-3">
                            <div className="rounded-2xl bg-white/80 backdrop-blur border border-white/30 shadow-sm p-2 flex items-center gap-2">
                              {/* Wishlist */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  toggleWishlist(p);
                                }}
                                className={`h-10 w-10 rounded-xl flex items-center justify-center transition active:scale-95
                                  ${
                                    isWishlisted(p.id)
                                      ? "bg-red-500/90 text-white"
                                      : "bg-white text-slate-900 hover:bg-slate-50"
                                  }`}
                                aria-label="Wishlist"
                                title="Wishlist"
                              >
                                <span className="text-base">
                                  {isWishlisted(p.id) ? "♥" : "♡"}
                                </span>
                              </button>

                              {/* Add to cart */}
                              <button
                                type="button"
                                disabled={outOfStock}
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  addToCart(p, 1);
                                  showToast({
                                    title: "Added to cart",
                                    message: `${p.name} × 1`,
                                    image: p.image,
                                  });
                                }}
                                className={`flex-1 h-10 rounded-xl text-xs font-semibold transition active:scale-95
                                  ${
                                    outOfStock
                                      ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                                      : "bg-slate-900 text-white hover:bg-slate-800"
                                  }`}
                              >
                                Add to cart
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Details */}
                        <div className="p-4">
                          <p className="text-[11px] font-semibold text-slate-500">
                            {p.category} • {p.brand}
                          </p>

                          <h3
                            className="mt-1 text-sm font-semibold text-slate-900 leading-snug line-clamp-2 cursor-pointer"
                            onClick={() => goToProduct(p)}
                          >
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
                            <p className="text-xs font-semibold text-red-600">
                              -{p.discountPercent}%
                            </p>
                          </div>

                          <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                            <p className="text-[11px] text-slate-700">
                              Pay with{" "}
                              <span className="font-semibold">
                                {p.paymentProvider}
                              </span>{" "}
                              • {p.minInstallments}+ instalments
                            </p>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>

                {/* Pagination (only if > 20) */}
                {showPagination && (
                  <div className="mt-6 rounded-3xl border border-slate-200 bg-white shadow-sm p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-900">
                      Showing{" "}
                      <span className="text-slate-600">
                        {(page - 1) * PAGE_SIZE + 1}–
                        {Math.min(page * PAGE_SIZE, filtered.length)}
                      </span>{" "}
                      of{" "}
                      <span className="text-slate-600">{filtered.length}</span>
                    </p>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className={`rounded-2xl px-4 py-2 text-sm font-semibold border transition
                          ${
                            page === 1
                              ? "border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed"
                              : "border-slate-200 bg-white text-slate-900 hover:bg-slate-50"
                          }`}
                      >
                        Prev
                      </button>

                      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-900">
                        {page} / {totalPages}
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          setPage((p) => Math.min(totalPages, p + 1))
                        }
                        disabled={page === totalPages}
                        className={`rounded-2xl px-4 py-2 text-sm font-semibold border transition
                          ${
                            page === totalPages
                              ? "border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed"
                              : "border-slate-200 bg-white text-slate-900 hover:bg-slate-50"
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

      {/* Mobile slide panel (Sort / Filters) */}
      {mobilePanelOpen && (
        <div className="fixed inset-0 z-999 md:hidden">
          <div
            className="absolute inset-0 bg-black/45"
            onClick={() => setMobilePanelOpen(false)}
          />

          <div
            ref={panelRef}
            className="absolute left-0 top-0 h-full w-[86%] max-w-[360px] bg-linear-to-b from-white via-slate-50 to-indigo-50 shadow-2xl border-r border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setMobilePanelTab("sort")}
                  className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
                    mobilePanelTab === "sort"
                      ? "bg-slate-950 text-white"
                      : "bg-slate-100 text-slate-900"
                  }`}
                >
                  Sort
                </button>
                <button
                  type="button"
                  onClick={() => setMobilePanelTab("filters")}
                  className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
                    mobilePanelTab === "filters"
                      ? "bg-slate-950 text-white"
                      : "bg-slate-100 text-slate-900"
                  }`}
                >
                  Filters
                </button>
              </div>

              <button
                type="button"
                onClick={() => setMobilePanelOpen(false)}
                className="h-10 w-10 rounded-xl border border-slate-200 bg-white hover:bg-slate-50"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="p-4 overflow-y-auto h-[calc(100%-64px)]">
              {mobilePanelTab === "sort" ? (
                <div className="grid gap-2">
                  <p className="text-sm font-semibold text-slate-900 mb-1">
                    Sort products
                  </p>

                  {[
                    { v: "featured", label: "Featured" },
                    { v: "priceAsc", label: "Price: Low → High" },
                    { v: "priceDesc", label: "Price: High → Low" },
                    { v: "discount", label: "Highest Discount" },
                    { v: "stock", label: "Most Stock" },
                  ].map((opt) => (
                    <button
                      key={opt.v}
                      type="button"
                      onClick={() => {
                        setSort(opt.v);
                        setMobilePanelOpen(false);
                      }}
                      className={`w-full text-left rounded-2xl border px-4 py-3 text-sm font-semibold transition
                        ${
                          sort === opt.v
                            ? "border-slate-950 bg-slate-950 text-white"
                            : "border-slate-200 bg-white text-slate-900 hover:bg-slate-50"
                        }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="grid gap-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      Category
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {uniqueCats.map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setActiveCategory(cat)}
                          className={`rounded-2xl px-4 py-2 text-sm font-semibold transition
                            ${
                              activeCategory === cat
                                ? "bg-slate-950 text-white"
                                : "bg-white border border-slate-200 text-slate-900 hover:bg-slate-50"
                            }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      Max Price
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      LKR {formatLKR(priceMin)} — LKR {formatLKR(priceMax)}
                    </p>

                    <input
                      type="range"
                      min={priceMin}
                      max={priceMax}
                      value={maxPrice}
                      onChange={(e) =>
                        setMaxPrice(
                          clamp(Number(e.target.value), priceMin, priceMax)
                        )
                      }
                      className="mt-3 w-full"
                    />

                    <div className="mt-2 rounded-2xl border border-slate-200 bg-white/80 px-3 py-2 text-sm font-semibold text-slate-900">
                      Up to: LKR {formatLKR(maxPrice)}
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      Brand
                    </p>
                    <select
                      value={selectedBrandId}
                      onChange={(e) => {
                        const v = e.target.value;
                        setSelectedBrandId(
                          v === "All" || v === "" || v === "undefined"
                            ? "All"
                            : v
                        );
                      }}
                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none"
                    >
                      <option value="All">All Brands</option>
                      {BrandsList.map((b) => {
                        const id = b.id ?? b.BrandID ?? b.brandId ?? b.brandID;
                        return (
                          <option key={id ?? b.name} value={String(id)}>
                            {b.name ?? b.BrandName}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div className="grid gap-3">
                    <label className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3">
                      <span className="text-sm font-semibold text-slate-900">
                        In Sale
                      </span>
                      <input
                        type="checkbox"
                        checked={onlySale}
                        onChange={(e) => setOnlySale(e.target.checked)}
                        className="h-5 w-5"
                      />
                    </label>

                    <label className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3">
                      <span className="text-sm font-semibold text-slate-900">
                        In Stock
                      </span>
                      <input
                        type="checkbox"
                        checked={onlyInStock}
                        onChange={(e) => setOnlyInStock(e.target.checked)}
                        className="h-5 w-5"
                      />
                    </label>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      clearFilters();
                      setMobilePanelOpen(false);
                    }}
                    className="rounded-2xl bg-slate-900 text-white px-5 py-3 text-sm font-semibold hover:bg-slate-800 transition"
                  >
                    Clear Filters
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductsPage;
