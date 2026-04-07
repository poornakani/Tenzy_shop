import React, { useEffect, useMemo, useState } from "react";
import { Testimonials } from "@/const";
import { brandsApi } from "@/services/api";

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

const BrandBadge = ({ name }) => {
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <div className="flex items-center gap-3 rounded-xl px-4 py-3 bg-white shadow-sm border border-gray-100 transition hover:-translate-y-0.5 hover:shadow-md">
      <div
        className="flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold text-white"
        style={{ background: "linear-gradient(135deg, #E8522A, #2BB9B4)" }}
      >
        {initials}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-800 truncate">{name}</p>
        <p className="text-[10px] uppercase tracking-[0.24em] text-slate-400">Tenzy Brand</p>
      </div>
    </div>
  );
};

const Brands = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [comment, setComment] = useState({ name: "", quote: "", rating: 5 });
  const [brandData, setBrandData] = useState([]);

  useEffect(() => {
    brandsApi.getAll()
      .then(data => setBrandData(Array.isArray(data) ? data : []))
      .catch(console.error);
  }, []);

  const logos = useMemo(() => {
    const list = brandData
      .map((brand) => ({ name: brand.name }))
      .filter((brand) => Boolean(brand.name));
    return list.length ? [...list, ...list] : [];
  }, [brandData]);

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
    <section className="w-full" style={{ background: "linear-gradient(180deg, #fdf8f6 0%, #f5fffe 100%)" }}>
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
        @media (prefers-reduced-motion: reduce) {
          .marquee-track { animation: none !important; }
        }
      `}</style>

      {/* ── Brands marquee ──────────────────────────────────────────────── */}
      <div className="w-full px-5 sm:px-8 pt-8 pb-6">
        {/* Label */}
        <div className="flex items-center justify-center gap-3 mb-5">
          <span className="h-px flex-1 max-w-[80px]" style={{ background: "linear-gradient(to right, transparent, #E8522A55)" }} />
          <span className="text-xs font-semibold tracking-[0.18em] uppercase" style={{ color: "#E8522A" }}>
            Our Trusted Brands
          </span>
          <span className="h-px flex-1 max-w-[80px]" style={{ background: "linear-gradient(to left, transparent, #E8522A55)" }} />
        </div>

        {/* Marquee strip */}
        <div className="relative overflow-hidden rounded-2xl border py-4"
          style={{ borderColor: "rgba(43,185,180,0.15)", background: "rgba(255,255,255,0.7)", backdropFilter: "blur(8px)" }}>
          {/* Side fades */}
          <div className="pointer-events-none absolute inset-y-0 left-0 w-12 sm:w-20 z-10"
            style={{ background: "linear-gradient(to right, #fdf8f6, transparent)" }} />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-12 sm:w-20 z-10"
            style={{ background: "linear-gradient(to left, #f5fffe, transparent)" }} />

          <div
            className="marquee-track items-center gap-5 sm:gap-8 px-4"
            style={{ animationName: "marqueeLeft", animationDuration: "60s" }}
          >
            {logos.map((brand, index) => (
              <BrandBadge key={`${brand.name}-${index}`} name={brand.name} />
            ))}
          </div>
        </div>

        {/* Trust badges — compact pill row */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs font-medium text-gray-500">
          {["✨ 100% Authentic", "🚚 Fast delivery", "⭐ Trusted brands"].map((b) => (
            <span key={b} className="rounded-full border border-gray-200 bg-white px-3 py-1">{b}</span>
          ))}
        </div>
      </div>

      {/* ── Testimonials ────────────────────────────────────────────────── */}
      <div className="w-full px-5 sm:px-8 pb-10">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
            <div>
              <p className="text-xs font-semibold tracking-widest uppercase text-gray-400">Reviews</p>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mt-0.5">What people say</h3>
            </div>
            <button
              onClick={() => setIsOpen(true)}
              className="self-start sm:self-auto text-xs font-semibold rounded-full px-4 py-2 transition active:scale-95"
              style={{ background: "#E8522A", color: "#fff" }}
            >
              Add review
            </button>
          </div>

          {/* Two moving rows */}
          <div className="space-y-3">
            {/* Top row */}
            <div className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white/60">
              <div className="pointer-events-none absolute inset-y-0 left-0 w-8 sm:w-14 bg-linear-to-r from-white to-transparent z-10" />
              <div className="pointer-events-none absolute inset-y-0 right-0 w-8 sm:w-14 bg-linear-to-l from-white to-transparent z-10" />
              <div
                className="marquee-track gap-3 p-3"
                style={{ animationName: "marqueeLeft", animationDuration: "70s" }}
              >
                {topRow.map((t, i) => (
                  <div
                    key={`top-${t.name}-${i}`}
                    className="min-w-[220px] sm:min-w-[280px] rounded-xl border border-gray-100 bg-gray-50/80 p-3.5 shadow-sm"
                  >
                    <Stars value={t.rating} />
                    <p className="mt-2 text-xs text-gray-600 leading-relaxed line-clamp-2">"{t.quote}"</p>
                    <div className="mt-3 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold text-gray-900">{t.name}</p>
                        <p className="text-[10px] text-gray-400">{t.role}</p>
                      </div>
                      <Avatar name={t.name} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom row */}
            <div className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white/60">
              <div className="pointer-events-none absolute inset-y-0 left-0 w-8 sm:w-14 bg-linear-to-r from-white to-transparent z-10" />
              <div className="pointer-events-none absolute inset-y-0 right-0 w-8 sm:w-14 bg-linear-to-l from-white to-transparent z-10" />
              <div
                className="marquee-track gap-3 p-3"
                style={{ animationName: "marqueeRight", animationDuration: "70s" }}
              >
                {bottomRow.map((t, i) => (
                  <div
                    key={`bottom-${t.name}-${i}`}
                    className="min-w-[220px] sm:min-w-[280px] rounded-xl border border-gray-100 bg-gray-50/80 p-3.5 shadow-sm"
                  >
                    <Stars value={t.rating} />
                    <p className="mt-2 text-xs text-gray-600 leading-relaxed line-clamp-2">"{t.quote}"</p>
                    <div className="mt-3 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold text-gray-900">{t.name}</p>
                        <p className="text-[10px] text-gray-400">{t.role}</p>
                      </div>
                      <Avatar name={t.name} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* CTA strip */}
          <div className="mt-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-2xl p-5"
            style={{ background: "linear-gradient(135deg, rgba(43,185,180,0.12) 0%, rgba(232,82,42,0.08) 100%)", border: "1px solid rgba(43,185,180,0.2)" }}>
            <div>
              <p className="text-xs text-gray-500">Need help picking products?</p>
              <p className="text-sm font-semibold text-gray-900 mt-0.5">Tell us your skin type — we'll recommend a routine.</p>
            </div>
            <button
              className="text-xs font-semibold rounded-full px-5 py-2 transition active:scale-95 whitespace-nowrap"
              style={{ background: "#2BB9B4", color: "#fff" }}
            >
              Get recommendations
            </button>
          </div>
        </div>
      </div>

      {/* Add Comment Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setIsOpen(false)} />
          <div className="relative w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h4 className="text-lg font-bold text-gray-900">Add your review</h4>
                <p className="text-xs text-gray-400 mt-0.5">Share your experience with us.</p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-lg px-3 py-1.5 text-xs font-semibold bg-gray-100 hover:bg-gray-200 transition"
              >
                Close
              </button>
            </div>

            <form onSubmit={submitComment} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-700">Name</label>
                <input
                  value={comment.name}
                  onChange={(e) => setComment((p) => ({ ...p, name: e.target.value }))}
                  className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-tenzy-teal/20"
                  placeholder="Your name"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-700">Comment</label>
                <textarea
                  value={comment.quote}
                  onChange={(e) => setComment((p) => ({ ...p, quote: e.target.value }))}
                  className="mt-1.5 w-full min-h-[90px] rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-tenzy-teal/20"
                  placeholder="Write your comment..."
                  required
                />
              </div>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-700">Rating</label>
                  <select
                    value={comment.rating}
                    onChange={(e) => setComment((p) => ({ ...p, rating: Number(e.target.value) }))}
                    className="mt-1.5 rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-tenzy-teal/20"
                  >
                    {[5, 4, 3, 2, 1].map((r) => (
                      <option key={r} value={r}>{r} Stars</option>
                    ))}
                  </select>
                </div>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-white text-sm font-semibold transition active:scale-95"
                  style={{ background: "#E8522A" }}
                >
                  Submit
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
