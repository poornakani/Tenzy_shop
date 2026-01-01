import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import {
  productReviews as reviewsTable,
  productFaq as faqTable,
} from "@/ProductsJson";

import { useWishlist } from "../Context/WishlistContext";
import Navibar from "@/HomePage/Navibar";
import { SellingProducts } from "@/ProductsJson";

gsap.registerPlugin(ScrollTrigger);

function formatLKR(value) {
  return new Intl.NumberFormat("en-LK").format(value);
}

function calcDiscounted(price, discountPercent) {
  return Math.round(price * (1 - discountPercent / 100));
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

const ProductDetails = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const wrapRef = useRef(null);

  const productId = Number(id);
  const { toggleWishlist, isWishlisted } = useWishlist();

  //  Find product + compute discountedPrice + normalize images
  const product = useMemo(() => {
    const found = SellingProducts.find((p) => p.id === productId);
    if (!found) return null;

    const discountedPrice = calcDiscounted(found.price, found.discountPercent);

    // support single image OR images array
    const images =
      Array.isArray(found.images) && found.images.length
        ? found.images
        : [found.image];

    return {
      ...found,
      discountedPrice,
      images,
      // optional safe defaults (if you didn't add them)
      category: found.category || "Skincare",
      brand: found.brand || "Premium",
      sku: found.sku || `SKU-${found.id}`,
      description:
        found.description ||
        "A premium product designed to fit beautifully into a modern routine.",
      size: found.size || "N/A",
      weight: found.weight || "N/A",
    };
  }, [productId]);

  const [activeImg, setActiveImg] = useState(0);

  // reset on product change
  useEffect(() => {
    setActiveImg(0);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [productId]);

  //  Reviews by productId (from separate table)
  const productReviews = useMemo(() => {
    return (reviewsTable || []).filter(
      (r) => Number(r.productId) === productId
    );
  }, [productId]);

  // FAQs by productId (from separate table)
  const productFaqs = useMemo(() => {
    return (faqTable || []).filter((f) => Number(f.productId) === productId);
  }, [productId]);

  //  rating
  const avgRating = useMemo(() => {
    if (!productReviews.length) return 0;
    const sum = productReviews.reduce((a, b) => a + Number(b.rating || 0), 0);
    return sum / productReviews.length;
  }, [productReviews]);

  // Similar products (by category)
  const similarProducts = useMemo(() => {
    if (!product) return [];
    return SellingProducts.filter(
      (p) =>
        p.id !== product.id && (p.category || "Skincare") === product.category
    )
      .slice(0, 6)
      .map((p) => ({
        ...p,
        discountedPrice: calcDiscounted(p.price, p.discountPercent),
      }));
  }, [product]);

  //  GSAP animations
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

  if (!product) {
    return (
      <div className="w-full overflow-hidden">
        <Navibar />
        <div className="h-24 bg-linear-to-b from-slate-900/80 to-transparent" />

        <main className="mx-auto max-w-7xl px-4 sm:px-6 py-10">
          <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center">
            <h2 className="text-xl font-semibold text-slate-900">
              Product not found
            </h2>
            <p className="mt-2 text-slate-600 text-sm">
              The product you are looking for doesn’t exist.
            </p>
            <button
              onClick={() => navigate("/home")}
              className="mt-5 rounded-2xl bg-slate-900 text-white px-5 py-3 text-sm font-semibold hover:bg-slate-800 transition"
            >
              Back to Home
            </button>
          </div>
        </main>
      </div>
    );
  }

  const outOfStock = !!product.outOfStock || product.stockCount === 0;

  return (
    <div ref={wrapRef} className="w-full overflow-hidden">
      <Navibar />
      {/*  make glass header visible */}
      <div className="h-24 bg-linear-to-b from-slate-900/80 to-transparent" />

      <main className="mx-auto w-full max-w-7xl px-4 sm:px-6 pb-12">
        {/* HERO */}
        <section className="pd-hero grid gap-6 lg:grid-cols-2">
          {/* Gallery */}
          <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="relative aspect-4/3 sm:aspect-4/4 lg:aspect-4/5 bg-slate-50">
              <img
                src={product.images[activeImg]}
                alt={product.name}
                className="h-full w-full object-cover"
              />

              {product.inSale && (
                <div className="absolute top-4 left-4 rounded-2xl bg-linear-to-r from-pink-500 to-red-600 px-3 py-1.5 text-xs font-semibold text-white shadow-lg shadow-pink-500/20">
                  IN SALE
                </div>
              )}

              <div
                className={`absolute top-4 right-4 rounded-2xl px-3 py-1.5 text-xs font-semibold text-white backdrop-blur shadow-lg
                  ${
                    outOfStock
                      ? "bg-black/60"
                      : "bg-linear-to-r from-emerald-500 to-teal-600 shadow-emerald-500/20"
                  }`}
              >
                {outOfStock ? "Out of stock" : `Stock: ${product.stockCount}`}
              </div>

              <div className="absolute inset-x-0 bottom-0 h-20 bg-linear-to-t from-black/35 to-transparent" />
            </div>

            {product.images.length > 1 && (
              <div className="p-4 flex gap-3 overflow-x-auto">
                {product.images.map((src, i) => (
                  <button
                    key={`${product.id}-${i}`}
                    type="button"
                    onClick={() => setActiveImg(i)}
                    className={`h-16 w-16 shrink-0 rounded-2xl overflow-hidden border transition
                      ${
                        i === activeImg
                          ? "border-slate-900"
                          : "border-slate-200 hover:border-slate-400"
                      }`}
                  >
                    <img
                      src={src}
                      alt={`${product.name} ${i + 1}`}
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="rounded-3xl border border-slate-200 bg-white shadow-sm p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-500 tracking-wide">
                  {product.category} • {product.brand}
                </p>
                <h1 className="mt-2 text-2xl sm:text-3xl font-semibold text-slate-900 leading-snug">
                  {product.name}
                </h1>

                <div className="mt-3 flex items-center gap-3">
                  <StarRow value={avgRating || 0} />
                  <p className="text-sm text-slate-600">
                    {avgRating ? avgRating.toFixed(1) : "No"} rating •{" "}
                    {productReviews.length} reviews
                  </p>
                </div>
              </div>

              {/* Wishlist */}
              <button
                type="button"
                onClick={() => toggleWishlist(product)}
                className={`h-11 w-11 rounded-2xl border border-slate-200 flex items-center justify-center transition active:scale-95
                  ${
                    isWishlisted(product.id)
                      ? "bg-red-500/90 text-white"
                      : "bg-white text-slate-900 hover:bg-slate-50"
                  }`}
                aria-label="Wishlist"
                title="Wishlist"
              >
                <span className="text-lg">
                  {isWishlisted(product.id) ? "♥" : "♡"}
                </span>
              </button>
            </div>

            {/* Price */}
            <div className="mt-5 rounded-3xl border border-slate-200 bg-linear-to-br from-slate-50 via-white to-amber-50 p-4">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-sm text-slate-600">Price</p>
                  <p className="text-2xl font-semibold text-slate-900">
                    LKR {formatLKR(product.discountedPrice)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-500 line-through">
                    LKR {formatLKR(product.price)}
                  </p>
                  <p className="text-sm font-semibold text-red-600">
                    -{product.discountPercent}%
                  </p>
                </div>
              </div>
            </div>

            {/* Key details */}
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-3">
                <p className="text-xs text-slate-500">SKU</p>
                <p className="text-sm font-semibold text-slate-900">
                  {product.sku}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-3">
                <p className="text-xs text-slate-500">Size</p>
                <p className="text-sm font-semibold text-slate-900">
                  {product.size}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-3">
                <p className="text-xs text-slate-500">Weight</p>
                <p className="text-sm font-semibold text-slate-900">
                  {product.weight}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-3">
                <p className="text-xs text-slate-500">Installments</p>
                <p className="text-sm font-semibold text-slate-900">
                  {product.minInstallments}+ with {product.paymentProvider}
                </p>
              </div>
            </div>

            {/* Description */}
            <div className="mt-4 rounded-3xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold text-slate-600 mb-2">
                Description
              </p>
              <p className="text-sm text-slate-700 leading-relaxed">
                {product.description}
              </p>
            </div>

            {/* Actions */}
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                disabled={outOfStock}
                onClick={() => navigate("/cart")}
                className={`rounded-2xl px-5 py-3 text-sm font-semibold transition active:scale-95
                  ${
                    outOfStock
                      ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                      : "bg-slate-900 text-white hover:bg-slate-800 shadow-lg shadow-black/20"
                  }`}
              >
                Add to cart
              </button>

              <button
                type="button"
                disabled={outOfStock}
                onClick={() => navigate("/checkout")}
                className={`rounded-2xl px-5 py-3 text-sm font-semibold transition active:scale-95
                  ${
                    outOfStock
                      ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                      : "bg-linear-to-r from-amber-400 to-orange-500 text-white hover:opacity-95 shadow-lg shadow-amber-500/25"
                  }`}
              >
                Purchase now
              </button>
            </div>

            {outOfStock && (
              <p className="mt-3 text-xs font-semibold text-red-600">
                This product is currently unavailable.
              </p>
            )}
          </div>
        </section>

        {/* FAQ */}
        <section className="pd-section mt-8 rounded-3xl border border-slate-200 bg-white shadow-sm p-5 sm:p-6">
          <h2 className="text-lg sm:text-xl font-semibold text-slate-900">
            Product FAQ
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Answers for common questions about this product.
          </p>

          <div className="mt-5 grid gap-3">
            {productFaqs.length ? (
              productFaqs.map((f) => (
                <details
                  key={f.id}
                  className="group rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                >
                  <summary className="cursor-pointer list-none flex items-center justify-between gap-4">
                    <span className="text-sm font-semibold text-slate-900">
                      {f.q}
                    </span>
                    <span className="text-slate-500 group-open:rotate-45 transition">
                      +
                    </span>
                  </summary>
                  <p className="mt-2 text-sm text-slate-700">{f.a}</p>
                </details>
              ))
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                No FAQs added for this product yet.
              </div>
            )}
          </div>
        </section>

        {/* Reviews */}
        <section className="pd-section mt-8 rounded-3xl border border-slate-200 bg-white shadow-sm p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
            <div>
              <h2 className="text-lg sm:text-xl font-semibold text-slate-900">
                Customer Reviews
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Real feedback from customers.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-linear-to-r from-amber-50 via-white to-orange-50 px-4 py-3">
              <div className="flex items-center gap-3">
                <div>
                  <p className="text-xs text-slate-500">Average rating</p>
                  <p className="text-lg font-semibold text-slate-900">
                    {avgRating ? avgRating.toFixed(1) : "0.0"}
                  </p>
                </div>
                <StarRow value={avgRating || 0} />
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-3">
            {productReviews.length ? (
              productReviews.map((r) => (
                <div
                  key={r.id}
                  className="rounded-2xl border border-slate-200 bg-white p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {r.name}{" "}
                        {r.verified && (
                          <span className="ml-2 text-[11px] font-semibold text-emerald-600">
                            Verified
                          </span>
                        )}
                      </p>
                      <div className="mt-1">
                        <StarRow value={Number(r.rating || 0)} />
                      </div>
                    </div>
                    <p className="text-xs text-slate-500">{r.date}</p>
                  </div>

                  <p className="mt-2 text-sm text-slate-700 leading-relaxed">
                    {r.comment}
                  </p>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                No reviews yet. Be the first to leave a review!
              </div>
            )}
          </div>
        </section>

        {/* Similar */}
        <section className="pd-section mt-8">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-lg sm:text-xl font-semibold text-slate-900">
                Similar Products
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Handpicked recommendations based on this product.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {(similarProducts.length
              ? similarProducts
              : SellingProducts.slice(0, 4)
            ).map((sp) => (
              <button
                key={sp.id}
                type="button"
                onClick={() => navigate(`/product/${sp.id}`)}
                className="text-left group rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden hover:shadow-md transition"
              >
                <div className="relative aspect-4/3 overflow-hidden bg-slate-50">
                  <img
                    src={sp.image}
                    alt={sp.name}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                  <div className="absolute inset-x-0 bottom-0 h-16 bg-linear-to-t from-black/35 to-transparent" />
                </div>

                <div className="p-4">
                  <p className="text-sm font-semibold text-slate-900 line-clamp-2">
                    {sp.name}
                  </p>
                  <div className="mt-2 flex items-end justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        LKR {formatLKR(sp.discountedPrice)}
                      </p>
                      <p className="text-xs text-slate-500 line-through">
                        LKR {formatLKR(sp.price)}
                      </p>
                    </div>
                    <p className="text-xs font-semibold text-red-600">
                      -{sp.discountPercent}%
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

export default ProductDetails;
