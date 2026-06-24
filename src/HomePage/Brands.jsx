import React, { useEffect, useMemo, useState, useRef } from "react";
import { Testimonials } from "@/const";
import { brandsApi } from "@/services/api";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const Stars = ({ value = 5 }) => (
  <div className="flex items-center gap-0.5">
    {Array.from({ length: 5 }).map((_, i) => (
      <svg
        key={i}
        viewBox="0 0 24 24"
        className={`h-3.5 w-3.5 ${i < value ? "fill-rose-400" : "fill-gray-200"}`}
        aria-hidden="true"
      >
        <path d="M12 17.27l-5.18 3.05 1.39-5.9L3 9.24l6.05-.52L12 3l2.95 5.72 6.05.52-5.21 5.18 1.39 5.9z" />
      </svg>
    ))}
  </div>
);

const Avatar = ({ name }) => {
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();

  return (
    <div className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
      style={{ background: "linear-gradient(135deg, #2BB9B4, #1a9590)" }}>
      {initials}
    </div>
  );
};

const BrandCard = ({ brand }) => {
  const [isHovering, setIsHovering] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const brandName = brand?.name || brand?.Name || brand?.brandName || brand?.BrandName || "Brand";
  const brandLogo = brand?.brandImage || brand?.BrandImage || brand?.logoUrl || brand?.LogoUrl || brand?.logo || brand?.Logo || brand?.image || brand?.Image;

  return (
    <div
      className="brand-card group relative rounded-2xl overflow-hidden transition-all duration-500 cursor-pointer"
      style={{
        background: "linear-gradient(135deg, #ffffff 0%, #f9fafb 100%)",
        border: "1px solid rgba(232,82,42,0.12)",
        boxShadow: isHovering
          ? "0 20px 40px rgba(232,82,42,0.20), 0 0 40px rgba(43,185,180,0.08)"
          : "0 4px 12px rgba(0,0,0,0.08)",
        transform: isHovering ? "translateY(-6px)" : "translateY(0)",
      }}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {/* Decorative gradient background */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          background: "linear-gradient(135deg, rgba(232,82,42,0.05) 0%, rgba(43,185,180,0.05) 100%)",
        }}
      />

      {/* Content container */}
      <div className="relative p-4 sm:p-6 h-full flex flex-col items-center justify-center min-h-[200px] sm:min-h-[240px]">
        {/* Brand Logo/Image */}
        <div className="mb-3 sm:mb-4 transition-transform duration-500 w-full flex items-center justify-center" style={{ transform: isHovering ? "scale(1.08)" : "scale(1)" }}>
          {brandLogo ? (
            <img
              src={brandLogo}
              alt={brandName}
              className="max-w-[100px] max-h-[70px] w-auto h-auto object-contain"
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageLoaded(false)}
            />
          ) : null}

          {/* Fallback gradient badge - shown if no image or image fails */}
          {!brandLogo || !imageLoaded ? (
            <div
              className="h-16 w-16 rounded-lg flex items-center justify-center text-lg font-bold text-white flex-shrink-0"
              style={{ background: `linear-gradient(135deg, #E8522A, #2BB9B4)` }}
            >
              {brandName.substring(0, 2).toUpperCase()}
            </div>
          ) : null}
        </div>

        {/* Brand Name - Always Visible */}
        <h3 className="text-center text-xs sm:text-sm font-bold text-gray-900 transition-colors duration-300 line-clamp-2 px-1 mb-2">
          {brandName}
        </h3>

        {/* Trust badge */}
        <div className="flex items-center justify-center gap-1.5 text-[9px] sm:text-[10px] font-semibold text-gray-500 mb-3">
          <span className="text-xs">✓</span>
          <span>Trusted</span>
        </div>

        {/* Hover action */}
        <div className="opacity-0 group-hover:opacity-100 transition-all duration-300">
          <button
            className="px-3 py-1.5 rounded-full text-[11px] sm:text-xs font-semibold text-white transition-all duration-300 hover:shadow-lg active:scale-95"
            style={{ background: "#E8522A" }}
          >
            Shop
          </button>
        </div>
      </div>
    </div>
  );
};

const Brands = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [comment, setComment] = useState({ name: "", quote: "", rating: 5 });
  const [brandData, setBrandData] = useState([]);
  const brandsRef = useRef(null);

  useEffect(() => {
    brandsApi.getAll()
      .then(data => {
        const brands = Array.isArray(data) ? data : [];
        console.log("Brands data:", brands);
        console.log("First brand:", brands[0]);
        setBrandData(brands);
      })
      .catch(console.error);
  }, []);

  // Scroll animations for brand cards
  useEffect(() => {
    if (!brandsRef.current || brandData.length === 0) return;
    const ctx = gsap.context(() => {
      const cards = gsap.utils.toArray(".brand-card");
      cards.forEach((card, i) => {
        gsap.fromTo(
          card,
          {
            y: 40,
            opacity: 0,
            scale: 0.95,
          },
          {
            y: 0,
            opacity: 1,
            scale: 1,
            duration: 0.6,
            ease: "cubic-bezier(0.34, 1.56, 0.64, 1)",
            delay: i * 0.08,
            scrollTrigger: {
              trigger: card,
              start: "top 95%",
              once: true,
            },
          }
        );
      });
    }, brandsRef);
    return () => ctx.revert();
  }, [brandData.length]);

  const topRow = useMemo(() => {
    const half = Math.ceil(Testimonials.length / 2);
    const row = Testimonials.slice(0, half);
    return [...row, ...row];
  }, []);

  const bottomRow = useMemo(() => {
    const half = Math.ceil(Testimonials.length / 2);
    const row = Testimonials.slice(half);
    return [...row, ...row];
  }, []);

  const submitComment = (e) => {
    e.preventDefault();
    setIsOpen(false);
    setComment({ name: "", quote: "", rating: 5 });
  };

  return (
    <section ref={brandsRef} className="w-full py-16 md:py-24 relative overflow-hidden">
      {/* Decorative background disabled for performance */}

      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6">

        {/* Section Header */}
        <div className="text-center mb-12">
          <span className="inline-flex items-center gap-2 mb-3 text-xs font-bold tracking-[0.2em] uppercase">
            <span className="w-2 h-2 rounded-full" style={{ background: "#E8522A" }} />
            Premium Partners
          </span>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-3">
            Trusted <span className="text-transparent bg-clip-text" style={{ backgroundImage: "linear-gradient(135deg, #E8522A 0%, #2BB9B4 100%)" }}>Beauty Brands</span>
          </h2>
          <p className="text-base text-gray-600 max-w-2xl mx-auto">
            We partner with the world's most loved and authentic beauty brands. Discover premium products from 50+ global leaders.
          </p>
        </div>

        {/* Brand Grid */}
        <div className="grid gap-6 grid-cols-2 md:grid-cols-3 lg:grid-cols-5 mb-12">
          {brandData.length > 0 ? (
            brandData.map((brand, i) => (
              <BrandCard key={brand.brandId || brand.BrandId || i} brand={brand} />
            ))
          ) : (
            <div className="col-span-full py-12 text-center text-gray-400">No brands available</div>
          )}
        </div>

        {/* Trust Badges */}
        <div className="flex flex-wrap justify-center gap-3 mb-12">
          {[
            { icon: "✓", text: "100% Authentic" },
            { icon: "⭐", text: "50+ Global Brands" },
            { icon: "🚚", text: "Fast Shipping" },
            { icon: "💳", text: "Secure Payment" }
          ].map((badge, i) => (
            <div
              key={i}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 hover:shadow-md"
              style={{
                background: "rgba(255,255,255,0.8)",
                border: "1px solid rgba(232,82,42,0.15)",
                backdropFilter: "blur(8px)",
              }}
            >
              <span className="text-base">{badge.icon}</span>
              <span className="text-gray-700">{badge.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Testimonials ────────────────────────────────────────────────── */}
      <style>{`
        .marquee-track {
          display: flex;
          width: max-content;
          will-change: transform;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
        }
        @keyframes marqueeLeft {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes marqueeRight {
          0% { transform: translateX(-50%); }
          100% { transform: translateX(0); }
        }
        .review-card {
          transition: all 300ms cubic-bezier(0.4, 0.0, 0.2, 1);
        }
        .review-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 24px rgba(232, 82, 42, 0.15);
        }
      `}</style>

      <div className="w-full px-4 sm:px-6 pb-16">
        <div className="max-w-7xl mx-auto">
          {/* Section Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-6 mb-10 sm:mb-12">
            <div>
              <div className="inline-flex items-center gap-2 mb-3">
                <div className="w-1 h-1 rounded-full bg-orange-500" />
                <span className="text-xs sm:text-sm font-bold text-orange-500 uppercase tracking-wider">Customer Reviews</span>
                <div className="w-1 h-1 rounded-full bg-orange-500" />
              </div>
              <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900">What our customers say</h3>
              <p className="text-sm sm:text-base text-slate-600 mt-2">Join thousands of satisfied beauty lovers</p>
            </div>
            <button
              onClick={() => setIsOpen(true)}
              className="self-start sm:self-auto px-6 sm:px-8 py-2.5 sm:py-3 rounded-full bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white font-bold text-sm transition-all duration-300 hover:shadow-lg hover:shadow-orange-500/30 active:scale-95 whitespace-nowrap"
            >
              ✍️ Write a review
            </button>
          </div>

          {/* Two moving rows */}
          <div className="space-y-4">
            {/* Top row */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-50 to-blue-50/50 border border-slate-200/50">
              <div className="pointer-events-none absolute inset-y-0 left-0 w-8 sm:w-12 md:w-16 bg-gradient-to-r from-slate-50 to-transparent z-10" />
              <div className="pointer-events-none absolute inset-y-0 right-0 w-8 sm:w-12 md:w-16 bg-gradient-to-l from-slate-50 to-transparent z-10" />
              <div
                className="marquee-track gap-4 p-4"
                style={{ animationName: "marqueeLeft", animationDuration: "80s" }}
              >
                {topRow.map((t, i) => (
                  <div
                    key={`top-${t.name}-${i}`}
                    className="review-card min-w-[260px] sm:min-w-[320px] rounded-xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-sm hover:shadow-xl"
                  >
                    {/* Stars */}
                    <div className="flex items-center justify-between mb-4">
                      <Stars value={t.rating} />
                      <span className="text-xs font-semibold text-orange-500">⭐ {t.rating}.0</span>
                    </div>

                    {/* Quote */}
                    <p className="text-sm sm:text-base text-slate-700 leading-relaxed line-clamp-3 mb-4 italic">
                      "{t.quote}"
                    </p>

                    {/* Author Info */}
                    <div className="flex items-center justify-between pt-4 border-t border-slate-200/50">
                      <div className="flex items-center gap-3">
                        <Avatar name={t.name} />
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{t.name}</p>
                          <p className="text-xs text-slate-500">{t.role}</p>
                        </div>
                      </div>
                      <svg className="w-5 h-5 text-orange-400" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M3 21c3 0 7-1 7-8V5c0-1.25-4.4-2.25-8-2s-6 .75-6 4v10c0 1 0 7 5 7zm14-6c.333.333 1 1.034 1 2.5V8c0-1.25-2.587-2-5-2s-5 .75-5 4v7c0 2-1 4-4 4 .857 0 3 .5 3 2.5s-1.143 2.5-3 2.5c5 0 7-4 7-7.5s.5-4 4-4.5z" />
                      </svg>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom row */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-50 to-teal-50/50 border border-slate-200/50">
              <div className="pointer-events-none absolute inset-y-0 left-0 w-8 sm:w-12 md:w-16 bg-gradient-to-r from-slate-50 to-transparent z-10" />
              <div className="pointer-events-none absolute inset-y-0 right-0 w-8 sm:w-12 md:w-16 bg-gradient-to-l from-slate-50 to-transparent z-10" />
              <div
                className="marquee-track gap-4 p-4"
                style={{ animationName: "marqueeRight", animationDuration: "80s" }}
              >
                {bottomRow.map((t, i) => (
                  <div
                    key={`bottom-${t.name}-${i}`}
                    className="review-card min-w-[260px] sm:min-w-[320px] rounded-xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-sm hover:shadow-xl"
                  >
                    {/* Stars */}
                    <div className="flex items-center justify-between mb-4">
                      <Stars value={t.rating} />
                      <span className="text-xs font-semibold text-orange-500">⭐ {t.rating}.0</span>
                    </div>

                    {/* Quote */}
                    <p className="text-sm sm:text-base text-slate-700 leading-relaxed line-clamp-3 mb-4 italic">
                      "{t.quote}"
                    </p>

                    {/* Author Info */}
                    <div className="flex items-center justify-between pt-4 border-t border-slate-200/50">
                      <div className="flex items-center gap-3">
                        <Avatar name={t.name} />
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{t.name}</p>
                          <p className="text-xs text-slate-500">{t.role}</p>
                        </div>
                      </div>
                      <svg className="w-5 h-5 text-orange-400" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M3 21c3 0 7-1 7-8V5c0-1.25-4.4-2.25-8-2s-6 .75-6 4v10c0 1 0 7 5 7zm14-6c.333.333 1 1.034 1 2.5V8c0-1.25-2.587-2-5-2s-5 .75-5 4v7c0 2-1 4-4 4 .857 0 3 .5 3 2.5s-1.143 2.5-3 2.5c5 0 7-4 7-7.5s.5-4 4-4.5z" />
                      </svg>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* CTA strip */}
          <div className="mt-8 sm:mt-10 rounded-2xl bg-gradient-to-r from-teal-50 to-orange-50 border border-teal-200/50 p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-6">
            <div>
              <h4 className="font-bold text-slate-900 text-base sm:text-lg">Need help choosing?</h4>
              <p className="text-sm text-slate-600 mt-1">Take our quick beauty quiz to find your perfect products.</p>
            </div>
            <button
              className="px-6 sm:px-8 py-2.5 sm:py-3 rounded-full bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-bold text-sm transition-all duration-300 hover:shadow-lg hover:shadow-teal-500/30 active:scale-95 whitespace-nowrap"
            >
              Take Quiz →
            </button>
          </div>
        </div>
      </div>

      {/* Add Comment Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div
            className="absolute inset-0 bg-black/40 transition-opacity duration-300"
            onClick={() => setIsOpen(false)}
          />
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 sm:p-8 shadow-2xl border border-slate-200/50">
            {/* Close Button */}
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-lg hover:bg-slate-100 transition-colors"
              aria-label="Close"
            >
              <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Header */}
            <div className="mb-6">
              <h4 className="text-2xl font-bold text-slate-900">Share your experience</h4>
              <p className="text-sm text-slate-600 mt-1">Help other beauty lovers find the perfect products</p>
            </div>

            <form onSubmit={submitComment} className="space-y-5">
              {/* Rating Section */}
              <div>
                <label className="text-sm font-semibold text-slate-900 block mb-3">Rate your experience</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setComment((p) => ({ ...p, rating: star }))}
                      className="transition-all duration-200 hover:scale-110 active:scale-95"
                    >
                      <svg
                        className={`w-8 h-8 transition-colors ${
                          comment.rating >= star
                            ? "fill-orange-400"
                            : "fill-slate-200"
                        }`}
                        viewBox="0 0 24 24"
                      >
                        <path d="M12 17.27l-5.18 3.05 1.39-5.9L3 9.24l6.05-.52L12 3l2.95 5.72 6.05.52-5.21 5.18 1.39 5.9z" />
                      </svg>
                    </button>
                  ))}
                  <span className="ml-3 text-sm font-semibold text-orange-500">
                    {comment.rating} {comment.rating === 1 ? "Star" : "Stars"}
                  </span>
                </div>
              </div>

              {/* Name Input */}
              <div>
                <label className="text-sm font-semibold text-slate-900 block mb-2">Your name</label>
                <input
                  value={comment.name}
                  onChange={(e) => setComment((p) => ({ ...p, name: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition-all duration-200 focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-500/10"
                  placeholder="Sarah Johnson"
                  required
                />
              </div>

              {/* Review Textarea */}
              <div>
                <label className="text-sm font-semibold text-slate-900 block mb-2">Your review</label>
                <textarea
                  value={comment.quote}
                  onChange={(e) => setComment((p) => ({ ...p, quote: e.target.value }))}
                  className="w-full min-h-[120px] rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition-all duration-200 focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-500/10 resize-none"
                  placeholder="Share what you loved about our products..."
                  required
                />
                <p className="text-xs text-slate-500 mt-2">{comment.quote.length}/200</p>
              </div>

              {/* Submit Button */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="flex-1 px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-900 font-semibold text-sm transition-all duration-200 active:scale-95"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white font-semibold text-sm transition-all duration-300 hover:shadow-lg hover:shadow-orange-500/30 active:scale-95"
                >
                  Post Review
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};

export default Brands;
