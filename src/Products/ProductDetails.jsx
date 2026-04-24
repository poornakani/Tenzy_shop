import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCart } from "@/Context/CartContext";

import { useWishlist } from "../Context/WishlistContext";
import Navibar from "@/HomePage/Navibar";
import Footer from "@/HomePage/Footer";
import {
  productsApi,
  reviewsApi,
  brandsApi,
  categoriesApi,
  productImageApi,
  productFaqApi,
} from "@/services/api";

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

function normalizeProduct(raw, lookups = {}) {
  const priceLkr = parseFloat(raw.priceLkr ?? raw.priceLKR ?? raw.price ?? 0);
  const originalPrice = parseFloat(raw.originalPrice ?? raw.OriginalPrice ?? priceLkr);
  const sellingPrice = parseFloat(raw.sellingPrice ?? raw.SellingPrice ?? priceLkr ?? originalPrice);
  const basePrice = originalPrice > 0 ? originalPrice : sellingPrice;
  const discountPercent = Math.round(parseFloat(raw.discountRate ?? raw.DiscountRate ?? raw.discountPercent ?? 0))
    || (basePrice > 0 && sellingPrice < basePrice ? Math.round((1 - sellingPrice / basePrice) * 100) : 0);
  const inSale = raw.inSale ?? raw.InSale ?? raw.isSale ?? raw.IsSale ?? raw.insale ?? discountPercent > 0;
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
    inSale:          Boolean(inSale),
    stockCount,
    outOfStock:      stockCount === 0,
    image:           images[0] ?? null,
    images,
    category:        raw.categoryName
      ?? raw.CategoryName
      ?? raw.categoryType
      ?? raw.CategoryType
      ?? raw.category
      ?? lookups.categoryName
      ?? "Uncategorized",
    brand:           raw.brandName
      ?? raw.BrandName
      ?? raw.brand
      ?? lookups.brandName
      ?? "Unknown Brand",
    sku:             raw.sku ?? raw.SKU ?? `SKU-${raw.productId ?? raw.ProductId ?? raw.id}`,
    description:     raw.description ?? raw.Description ?? "No description available.",
    size:            raw.size ?? raw.Size ?? "N/A",
    weight:          raw.weight ?? raw.weightGrams ?? raw.Weight ?? "N/A",
    faqs:            Array.isArray(raw.faqs) && raw.faqs.length
      ? raw.faqs
      : (Array.isArray(lookups.faqs) ? lookups.faqs : []),
    paymentProvider: raw.paymentProvider ?? lookups.paymentProvider ?? null,
    minInstallments: raw.minInstallments ?? lookups.minInstallments ?? null,
  };
}

const ProductDetails = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const wrapRef = useRef(null);
  const { addToCart } = useCart();

  const productId = Number(id);
  const { toggleWishlist, isWishlisted } = useWishlist();

  const [product,        setProduct]        = useState(null);
  const [productLoading, setProductLoading] = useState(true);
  const [productReviews, setProductReviews] = useState([]);
  const [activeImg,      setActiveImg]      = useState(0);

  const showPrevImage = () => {
    if (!product?.images?.length) return;
    setActiveImg((current) => (current === 0 ? product.images.length - 1 : current - 1));
  };

  const showNextImage = () => {
    if (!product?.images?.length) return;
    setActiveImg((current) => (current === product.images.length - 1 ? 0 : current + 1));
  };

  useEffect(() => {
    setProductLoading(true);
    setActiveImg(0);
    window.scrollTo({ top: 0, behavior: "smooth" });

    Promise.allSettled([
      productsApi.getById(productId),
      reviewsApi.getByProduct(productId),
      brandsApi.getAll(),
      categoriesApi.getAll(),
      productImageApi.getByProduct(productId),
      productFaqApi.getByProduct(productId),
      productsApi.getPaymentOptions(productId).catch(() => []),
    ]).then(([prodR, revR, brandsR, categoriesR, imagesR, faqsR, payOptsR]) => {
      if (prodR.status === "fulfilled" && prodR.value) {
        const raw  = prodR.value;
        const brands = Array.isArray(brandsR.value) ? brandsR.value : [];
        const categories = Array.isArray(categoriesR.value) ? categoriesR.value : [];
        const images = Array.isArray(imagesR.value) ? imagesR.value : [];
        const faqs = Array.isArray(faqsR.value) ? faqsR.value : [];
        const brandName = brands.find(
          (brand) => (brand.brandId ?? brand.BrandId) === (raw.brandId ?? raw.BrandId)
        )?.name ?? brands.find(
          (brand) => (brand.brandId ?? brand.BrandId) === (raw.brandId ?? raw.BrandId)
        )?.Name;
        const categoryName = categories.find(
          (category) => (category.categoryId ?? category.CategoryId ?? category.catagoryID) === (raw.categoryId ?? raw.CategoryId)
        )?.categoryType ?? categories.find(
          (category) => (category.categoryId ?? category.CategoryId ?? category.catagoryID) === (raw.categoryId ?? raw.CategoryId)
        )?.CategoryType;

        // Build payment info — getPaymentOptions now returns PaymentType name directly
        const payOpts = Array.isArray(payOptsR.value) ? payOptsR.value : [];
        const firstOpt = payOpts.find((o) => (o.paymentTypeId ?? o.PaymentTypeId) > 0);
        const paymentProvider = raw.paymentProvider ?? firstOpt?.paymentType ?? firstOpt?.PaymentType ?? null;
        const minInstallments = raw.minInstallments ?? firstOpt?.instalment ?? firstOpt?.Instalment ?? null;

        setProduct(normalizeProduct(raw, {
          brandName,
          categoryName,
          images,
          faqs,
          paymentProvider,
          minInstallments,
        }));
      }
      if (revR.status === "fulfilled") {
        setProductReviews(Array.isArray(revR.value) ? revR.value : []);
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

  // Similar products: not loaded to keep it simple
  const similarProducts = [];

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

  if (productLoading) {
    return (
      <div className="w-full overflow-hidden">
        <Navibar />
        <div className="h-24" />
        <div className="flex items-center justify-center py-24">
          <div className="w-10 h-10 rounded-full border-4 border-tenzy-teal/30 border-t-tenzy-teal animate-spin" />
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="w-full overflow-hidden">
        <Navibar />
        <div className="h-24 bg-linear-to-b from-slate-900/80 to-transparent" />
        <main className="mx-auto max-w-7xl px-4 sm:px-6 py-10">
          <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center">
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
            <div className="relative aspect-4/3 sm:aspect-4/4 lg:aspect-4/5 overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.98),_rgba(241,245,249,0.95)_58%,_rgba(226,232,240,0.9))]">
              {product.images[activeImg] ? (
                <div className="flex h-full w-full items-center justify-center p-6 sm:p-8 lg:p-10">
                  <img
                    src={product.images[activeImg]}
                    alt={product.name}
                    className="max-h-full max-w-full object-contain drop-shadow-[0_18px_32px_rgba(15,23,42,0.16)]"
                  />
                </div>
              ) : (
                <div className="flex h-full w-full items-center justify-center text-sm font-medium text-slate-400">
                  No image available
                </div>
              )}

              {product.images.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={showPrevImage}
                    className="absolute left-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-800 shadow-lg transition hover:bg-white"
                    aria-label="Show previous image"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={showNextImage}
                    className="absolute right-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-800 shadow-lg transition hover:bg-white"
                    aria-label="Show next image"
                  >
                    <ChevronRight size={18} />
                  </button>
                </>
              )}

              {product.inSale && (
                <div className="absolute top-4 left-4 rounded-2xl bg-linear-to-r from-orange-500 to-orange-600 px-3 py-1.5 text-xs font-semibold text-white shadow-lg shadow-orange-500/20">
                  IN SALE
                </div>
              )}

              <div
                className={`absolute top-4 right-4 rounded-2xl px-3 py-1.5 text-xs font-semibold text-white backdrop-blur shadow-lg
                  ${
                    outOfStock
                      ? "bg-black/60"
                      : "bg-linear-to-r from-teal-500 to-teal-600 shadow-teal-500/20"
                  }`}
              >
                {outOfStock ? "Out of stock" : `Stock: ${product.stockCount}`}
              </div>

              <div className="absolute inset-x-0 bottom-0 h-20 bg-linear-to-t from-black/35 to-transparent" />
            </div>

            {product.images.length > 1 && (
              <div className="p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                    Product Images
                  </p>
                  <p className="text-xs text-slate-500">
                    {activeImg + 1} / {product.images.length}
                  </p>
                </div>
                <div className="flex gap-3 overflow-x-auto">
                {product.images.map((src, i) => (
                  <button
                    key={`${product.id}-${i}`}
                    type="button"
                    onClick={() => setActiveImg(i)}
                    className={`h-16 w-16 shrink-0 rounded-2xl overflow-hidden border transition
                      ${
                        i === activeImg
                          ? "border-tenzy-teal"
                          : "border-slate-200 hover:border-tenzy-teal/50"
                      }`}
                  >
                    <div className="flex h-full w-full items-center justify-center bg-slate-50 p-1.5">
                      <img
                        src={src}
                        alt={`${product.name} ${i + 1}`}
                        className="h-full w-full object-contain"
                      />
                    </div>
                  </button>
                ))}
                </div>
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
                      ? "bg-tenzy-orange/90 text-white"
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
            <div className="mt-5 rounded-3xl border border-slate-200 bg-linear-to-br from-teal-50 via-white to-orange-50 p-4">
              {product.discountedPrice > 0 ? (
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <p className="text-sm text-slate-600">Price</p>
                    <p className="text-2xl font-semibold text-slate-900">
                      LKR {formatLKR(product.discountedPrice)}
                    </p>
                  </div>
                  {product.discountPercent > 0 && (
                    <div className="text-right">
                      <p className="text-sm text-slate-500 line-through">
                        LKR {formatLKR(product.price)}
                      </p>
                      <p className="text-sm font-semibold text-tenzy-orange">
                        -{product.discountPercent}%
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-slate-500 italic">Price not yet available</p>
              )}
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

              {(product.minInstallments || product.paymentProvider) && (
                <div className="rounded-2xl border border-slate-200 bg-white p-3">
                  <p className="text-xs text-slate-500">Payment</p>
                  <p className="text-sm font-semibold text-slate-900">
                    {product.paymentProvider
                      ? product.minInstallments
                        ? `${product.minInstallments}+ with ${product.paymentProvider}`
                        : product.paymentProvider
                      : `${product.minInstallments}+ installments`}
                  </p>
                </div>
              )}
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
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();

                  addToCart(product, 1);
                  navigate("/cart");
                }}
                className={`rounded-2xl px-5 py-3 text-sm font-semibold transition active:scale-95
                  ${
                    outOfStock
                      ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                      : "bg-tenzy-teal text-white hover:opacity-90 shadow-lg shadow-tenzy-teal/25"
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
                      : "bg-tenzy-orange text-white hover:opacity-90 shadow-lg shadow-tenzy-orange/25"
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
              productFaqs.map((f, i) => (
                <details
                  key={f.faqId ?? f.id ?? i}
                  className="group rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                >
                  <summary className="cursor-pointer list-none flex items-center justify-between gap-4">
                    <span className="text-sm font-semibold text-slate-900">
                      {f.question ?? f.q}
                    </span>
                    <span className="text-slate-500 group-open:rotate-45 transition">
                      +
                    </span>
                  </summary>
                  <p className="mt-2 text-sm text-slate-700">{f.answer ?? f.a}</p>
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

            <div className="rounded-2xl border border-slate-200 bg-linear-to-r from-teal-50 via-white to-orange-50 px-4 py-3">
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
                  key={r.reviewId ?? r.id ?? r.ID}
                  className="rounded-2xl border border-slate-200 bg-white p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {r.customerName ?? r.name ?? "Customer"}
                      </p>
                      <div className="mt-1">
                        <StarRow value={Number(r.rating ?? r.rate ?? 0)} />
                      </div>
                    </div>
                    <p className="text-xs text-slate-500">
                      {r.createdAt ? new Date(r.createdAt).toLocaleDateString("en-GB") : r.date ?? ""}
                    </p>
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
            {similarProducts.map((sp) => (
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
                    <p className="text-xs font-semibold text-tenzy-orange">
                      -{sp.discountPercent}%
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default ProductDetails;
