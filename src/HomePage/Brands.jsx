import React, { useMemo, useState } from "react";
import { Testimonials } from "@/const";
import { BrandsList } from "@/ProductsJson";

const Stars = ({ value = 5 }) => (
  <div className="flex items-center gap-1">
    {Array.from({ length: 5 }).map((_, i) => (
      <svg
        key={i}
        viewBox="0 0 24 24"
        className={`h-4 w-4 ${i < value ? "fill-yellow-400" : "fill-gray-200"}`}
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
    <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-700 font-bold">
      {initials}
    </div>
  );
};

const Brands = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [comment, setComment] = useState({ name: "", quote: "", rating: 5 });

  // Duplicate logos for smooth marquee
  const logos = useMemo(() => [...BrandsList, ...BrandsList], []);

  // Split testimonials into two rows (duplicate to keep continuous scroll)
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
    // You can connect this to API later.
    // For now, it just closes the modal.
    setIsOpen(false);
    setComment({ name: "", quote: "", rating: 5 });
  };

  return (
    <section className="w-full bg-white">
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
      {/* Brands */}
      <div className="w-full px-4 sm:px-6 lg:px-10 py-12 sm:py-16 mt-8 mb-10">
        <div className="relative overflow-hidden rounded-[2.5rem] shadow-2xl">
          {/* DARK GOLD BACKGROUND */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(135deg, #d8942f 25%, #e6b843 45%, #c98528 50%)",
            }}
          />

          {/* Dark gold overlays to tone down brightness */}
          <div className="absolute inset-0 bg-[#FAAB36]/40 mix-blend-multiply" />

          {/* Glow accents (darker & controlled) */}
          <div className="pointer-events-none absolute -top-24 -left-24 h-80 w-80 rounded-full bg-[#FAAB36]/50 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-28 -right-28 h-96 w-96 rounded-full bg-[#F6CB52]/45 blur-3xl" />
          <div className="pointer-events-none absolute top-16 right-16 h-64 w-64 rounded-full bg-[#FAAB36]/40 blur-3xl" />

          <div className="relative  mx-auto px-5 sm:px-8 lg:px-12 py-10 sm:py-12">
            {/* MARQUEE CONTAINER */}
            <div className="mt-8 sm:mt-10 relative overflow-hidden rounded-2xl bg-white/25 backdrop-blur-xl shadow-xl border border-white/30">
              {/* Side fades (dark gold) */}
              <div className="pointer-events-none absolute inset-y-0 left-0 w-16 sm:w-28 bg-linear-to-r from-[#c98528]/70 to-transparent z-10" />
              <div className="pointer-events-none absolute inset-y-0 right-0 w-16 sm:w-28 bg-linear-to-l from-[#e6b843]/70 to-transparent z-10" />

              <div className="py-6 sm:py-7">
                <div
                  className="marquee-track gap-6 sm:gap-10 pr-10"
                  style={{
                    animationName: "marqueeLeft",
                    animationDuration: "80s",
                  }}
                >
                  {logos.map((brand, index) => (
                    <div
                      key={`${brand.name}-${index}`}
                      className="flex items-center justify-center"
                    >
                      {/* DARK GOLD LOGO CARD */}
                      <div
                        className="group relative rounded-2xl p-0.5 shadow-lg transition hover:-translate-y-1 hover:shadow-2xl"
                        style={{
                          background:
                            "linear-gradient(135deg, #c98528, #e6b843, #c98528)",
                        }}
                      >
                        <div className="flex items-center justify-center rounded-2xl bg-white/90 px-6 py-4">
                          <img
                            src={brand.logo}
                            alt={brand.name}
                            className="h-10 sm:h-12 md:h-14 w-auto opacity-95 transition duration-300 group-hover:opacity-100"
                            draggable={false}
                            loading="lazy"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* BADGES */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-xs sm:text-sm font-semibold">
              <span className="rounded-full bg-white/25 text-white px-4 py-1 backdrop-blur-md">
                ✨ 100% Authentic
              </span>
              <span className="rounded-full bg-white/25 text-white px-4 py-1 backdrop-blur-md">
                🚚 Fast delivery
              </span>
              <span className="rounded-full bg-white/25 text-white px-4 py-1 backdrop-blur-md">
                ⭐ Trusted brands
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Testimonials */}
      <div className="w-full px-4 sm:px-6 lg:px-10 pb-12 sm:pb-16">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-7">
            <div>
              <p className="text-sm font-semibold tracking-wide text-gray-500">
                Reviews
              </p>
              <h3 className="text-2xl sm:text-3xl font-bold text-gray-900">
                What people say
              </h3>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsOpen(true)}
                className="px-5 py-2.5 rounded-xl bg-[#0b5351] text-white font-semibold hover:bg-gray-800 transition shadow-sm"
              >
                Add comment
              </button>
            </div>
          </div>

          {/* Two moving rows */}
          <div className="space-y-4">
            {/* Top row: right -> left */}
            <div className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white">
              <div className="pointer-events-none absolute inset-y-0 left-0 w-10 sm:w-16 bg-linear-to-r from-white to-transparent z-10" />
              <div className="pointer-events-none absolute inset-y-0 right-0 w-10 sm:w-16 bg-linear-to-l from-white to-transparent z-10" />

              <div
                className="marquee-track gap-4 sm:gap-6 p-4"
                style={{
                  animationName: "marqueeLeft",
                  animationDuration: "80s",
                }}
              >
                {topRow.map((t, i) => (
                  <div
                    key={`top-${t.name}-${i}`}
                    className="min-w-[280px] sm:min-w-[340px] rounded-2xl border border-gray-100 bg-gray-50 p-5 shadow-sm"
                  >
                    <Stars value={t.rating} />
                    <p className="mt-3 text-gray-700 leading-relaxed line-clamp-3">
                      “{t.quote}”
                    </p>
                    <div className="mt-5 flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-gray-900">{t.name}</p>
                        <p className="text-sm text-gray-500">{t.role}</p>
                      </div>
                      <Avatar name={t.name} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom row: left -> right */}
            <div className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white">
              <div className="pointer-events-none absolute inset-y-0 left-0 w-10 sm:w-16 bg-linear-to-r from-white to-transparent z-10" />
              <div className="pointer-events-none absolute inset-y-0 right-0 w-10 sm:w-16 bg-linear-to-l from-white to-transparent z-10" />

              <div
                className="marquee-track gap-4 sm:gap-6 p-4"
                style={{
                  animationName: "marqueeRight",
                  animationDuration: "80s",
                }}
              >
                {bottomRow.map((t, i) => (
                  <div
                    key={`bottom-${t.name}-${i}`}
                    className="min-w-[280px] sm:min-w-[340px] rounded-2xl border border-gray-100 bg-gray-50 p-5 shadow-sm"
                  >
                    <Stars value={t.rating} />
                    <p className="mt-3 text-gray-700 leading-relaxed line-clamp-3">
                      “{t.quote}”
                    </p>
                    <div className="mt-5 flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-gray-900">{t.name}</p>
                        <p className="text-sm text-gray-500">{t.role}</p>
                      </div>
                      <Avatar name={t.name} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Optional CTA (kept) */}
          <div className="mt-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl bg-[#13594e] text-white p-6">
            <div>
              <p className="text-sm text-white/70">
                Need help picking products?
              </p>
              <p className="text-lg font-semibold">
                Tell us your skin type — we’ll recommend a routine.
              </p>
            </div>
            <button className="px-5 py-2.5 rounded-xl bg-white text-gray-900 font-semibold hover:bg-white/90 transition">
              Get recommendations
            </button>
          </div>
        </div>
      </div>

      {/* Add Comment Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setIsOpen(false)}
          />
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h4 className="text-xl font-bold text-gray-900">
                  Add your comment
                </h4>
                <p className="text-sm text-gray-500 mt-1">
                  Share your experience. (You can connect this to your backend
                  later.)
                </p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-lg px-3 py-1.5 text-sm font-semibold bg-gray-100 hover:bg-gray-200 transition"
              >
                Close
              </button>
            </div>

            <form onSubmit={submitComment} className="mt-5 space-y-4">
              <div>
                <label className="text-sm font-semibold text-gray-700">
                  Name
                </label>
                <input
                  value={comment.name}
                  onChange={(e) =>
                    setComment((p) => ({ ...p, name: e.target.value }))
                  }
                  className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-2.5 outline-none focus:ring-2 focus:ring-gray-900/10"
                  placeholder="Your name"
                  required
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700">
                  Comment
                </label>
                <textarea
                  value={comment.quote}
                  onChange={(e) =>
                    setComment((p) => ({ ...p, quote: e.target.value }))
                  }
                  className="mt-2 w-full min-h-[110px] rounded-xl border border-gray-200 px-4 py-2.5 outline-none focus:ring-2 focus:ring-gray-900/10"
                  placeholder="Write your comment..."
                  required
                />
              </div>

              <div className="flex items-center justify-between gap-4">
                <div>
                  <label className="text-sm font-semibold text-gray-700">
                    Rating
                  </label>
                  <select
                    value={comment.rating}
                    onChange={(e) =>
                      setComment((p) => ({
                        ...p,
                        rating: Number(e.target.value),
                      }))
                    }
                    className="mt-2 rounded-xl border border-gray-200 px-3 py-2 outline-none focus:ring-2 focus:ring-gray-900/10"
                  >
                    {[5, 4, 3, 2, 1].map((r) => (
                      <option key={r} value={r}>
                        {r} Stars
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-gray-900 text-white font-semibold hover:bg-gray-800 transition"
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
