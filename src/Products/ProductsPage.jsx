import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import { useWishlist } from "../Context/WishlistContext";
import { SellingProducts } from "@/ProductsJson";
import Navibar from "@/HomePage/Navibar";
import { CatSelections, BrandsList } from "@/const";

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
  const wrapRef = useRef(null);

  // optional: wishlist heart on cards
  const { toggleWishlist, isWishlisted } = useWishlist?.() || {
    toggleWishlist: () => {},
    isWishlisted: () => false,
  };

  // -------- Prepare normalized product list --------
  const products = useMemo(() => {
    return (SellingProducts || []).map((p) => {
      const discountedPrice = calcDiscounted(p.price, p.discountPercent);
      return {
        ...p,
        discountedPrice,
        category: p.category || "Skin",
        brand: p.brand || "Premium",
        sku: p.sku || `SKU-${p.id}`,
        description:
          p.description ||
          "Premium quality product with a clean modern feel. Comfortable daily use.",
        images:
          Array.isArray(p.images) && p.images.length ? p.images : [p.image],
      };
    });
  }, []);

  // -------- Filter states --------
  const [activeCategory, setActiveCategory] = useState("All");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("featured"); // featured | priceAsc | priceDesc | discount | stock
  const [onlySale, setOnlySale] = useState(false);
  const [onlyInStock, setOnlyInStock] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState("All");
  // price slider
  const priceMin = useMemo(
    () => Math.min(...products.map((p) => p.discountedPrice)),
    [products]
  );
  const priceMax = useMemo(
    () => Math.max(...products.map((p) => p.discountedPrice)),
    [products]
  );
  const uniqueCats = useMemo(() => {
    const set = new Set(CatSelections.map((x) => x.category).filter(Boolean));
    return ["All", ...Array.from(set)];
  }, []);

  const [maxPrice, setMaxPrice] = useState(priceMax);

  // keep maxPrice in range if products change
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
      if (activeCategory !== "All" && p.category !== activeCategory)
        return false;
      if (selectedBrand !== "All" && p.brand !== selectedBrand) return false;
      if (onlySale && !p.inSale) return false;
      if (onlyInStock && (p.outOfStock || p.stockCount === 0)) return false;
      if (p.discountedPrice > maxPrice) return false;
      if (query && !p.name.toLowerCase().includes(query)) return false;
      return true;
    });

    // sorting
    if (sort === "priceAsc")
      list.sort((a, b) => a.discountedPrice - b.discountedPrice);
    if (sort === "priceDesc")
      list.sort((a, b) => b.discountedPrice - a.discountedPrice);
    if (sort === "discount")
      list.sort((a, b) => (b.discountPercent || 0) - (a.discountPercent || 0));
    if (sort === "stock")
      list.sort((a, b) => (b.stockCount || 0) - (a.stockCount || 0));

    // "featured" keeps original order
    return list;
  }, [
    products,
    activeCategory,
    q,
    sort,
    onlySale,
    onlyInStock,
    selectedBrand,
    maxPrice,
  ]);

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

  // animate when filters change (simple reflow animation)
  useEffect(() => {
    if (!wrapRef.current) return;
    gsap.fromTo(
      ".pp-card",
      { y: 10, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.25, stagger: 0.02, ease: "power2.out" }
    );
  }, [activeCategory, q, sort, onlySale, onlyInStock, selectedBrand, maxPrice]);

  // -------- UI helpers --------
  const clearFilters = () => {
    setActiveCategory("All");
    setQ("");
    setSort("featured");
    setOnlySale(false);
    setOnlyInStock(false);
    setSelectedBrand("All");
    setMaxPrice(priceMax);
  };

  const addToCart = (p) => {
    // your future cart logic
    console.log("Add to cart:", p.id);
    navigate("/cart"); // optional behavior; remove if you prefer staying
  };

  return (
    <div ref={wrapRef} className="w-full overflow-hidden">
      <Navibar />
      {/* Make glass nav readable */}
      <div className="h-24 bg-linear-to-b from-slate-900/80 to-transparent" />

      <main className="mx-auto w-full max-w-7xl px-4 sm:px-6 pb-12">
        {/* HERO */}
        <section className="pp-hero rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="relative p-5 sm:p-6">
            <div className="absolute inset-0 bg-linear-to-r from-amber-100/60 via-white to-orange-100/60" />
            <div className="relative">
              <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold text-slate-500 tracking-wide">
                    PRODUCTS
                  </p>
                  <h1 className="mt-2 text-2xl sm:text-3xl font-semibold text-slate-900">
                    Find your perfect match
                  </h1>
                  <p className="mt-2 text-sm text-slate-600 max-w-2xl">
                    Search by name, filter by category, price, availability, and
                    brand. Tap a product to see full details.
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white/70 backdrop-blur px-4 py-3">
                  <p className="text-xs text-slate-500">Results</p>
                  <p className="text-lg font-semibold text-slate-900">
                    {filtered.length}
                  </p>
                </div>
              </div>

              {/* Search + suggestions */}
              <div className="mt-5 grid gap-3 lg:grid-cols-3">
                <div className="relative lg:col-span-2">
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search products by name…"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-amber-300"
                  />

                  {/* Suggestions dropdown */}
                  {suggestions.length > 0 && (
                    <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white/80 backdrop-blur shadow-xl">
                      {suggestions.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => goToProduct(p)}
                          className="w-full px-4 py-3 text-left hover:bg-slate-50 transition flex items-center justify-between"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-900 truncate">
                              {p.name}
                            </p>
                            <p className="text-xs text-slate-500">
                              {p.category} • {p.brand}
                            </p>
                          </div>
                          <p className="text-sm font-semibold text-slate-900">
                            LKR {formatLKR(p.discountedPrice)}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
                  <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value)}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none"
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
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-50 transition"
                  >
                    Clear
                  </button>
                </div>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                {uniqueCats.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setActiveCategory(cat)}
                    className={`rounded-2xl px-4 py-2 text-sm font-semibold transition
        ${
          activeCategory === cat
            ? "bg-slate-900 text-white"
            : "bg-white border border-slate-200 text-slate-900 hover:bg-slate-50"
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
          {/* Filters sidebar */}
          <aside className="lg:col-span-3 rounded-3xl border border-slate-200 bg-white shadow-sm p-5 sm:p-6">
            <h2 className="text-lg font-semibold text-slate-900">Filters</h2>
            <p className="mt-1 text-sm text-slate-600">
              Refine results quickly.
            </p>

            {/* Price */}
            <div className="mt-5">
              <p className="text-sm font-semibold text-slate-900">Max Price</p>
              <p className="text-xs text-slate-500 mt-1">
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
              <div className="mt-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-900">
                Up to: LKR {formatLKR(maxPrice)}
              </div>
            </div>

            {/* Brand */}
            <div className="mt-5">
              <p className="text-sm font-semibold text-slate-900">Brand</p>

              <select
                value={selectedBrand}
                onChange={(e) => setSelectedBrand(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none"
              >
                <option value="All">All Brands</option>

                {BrandsList.map((b) => (
                  <option key={b.name} value={b.name}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Toggles */}
            <div className="mt-5 grid gap-3">
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

            {/* Mobile helper */}
            <div className="mt-5 rounded-2xl bg-linear-to-r from-amber-50 via-white to-orange-50 border border-slate-200 p-4">
              <p className="text-sm font-semibold text-slate-900">Tip</p>
              <p className="mt-1 text-xs text-slate-600">
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
              <div className="grid gap-4 sm:gap-5 grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4">
                {filtered.map((p) => {
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
                            {/* Wishlist icon */}
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
                                addToCart(p);
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

                      {/* Details (most wanted) */}
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
            )}
          </section>
        </section>
      </main>
    </div>
  );
};

export default ProductsPage;
