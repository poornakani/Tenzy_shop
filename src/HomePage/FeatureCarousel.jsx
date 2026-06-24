/**
 * Tenzy Beauty — Feature Carousel Hero (v2)
 *
 * Changes from v1:
 *   • Card dimensions are viewport-relative — center card fills 58 vw × 74 vh
 *   • Each slide carries its own heading / description / CTA
 *   • Text renders as an overlay AT THE BOTTOM of the center image
 *   • Text re-animates (fade + slide-up) every time the active slide changes
 *   • Stage height is min-h-[80vh] so the large cards always fit
 *   • Adjacent cards extend partially off-screen — intentional "peek" effect
 */

import React, { useState, useCallback, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { assets } from "@/const";

// ── Slide data (image + per-slide copy) ───────────────────────────────────────
const SLIDES = [
  {
    src:     assets.header1,
    eyebrow: "Premium Beauty · Sri Lanka",
    line1:   "Beauty,",
    line2:   "Elevated.",
    desc:    "Luxury skincare crafted for your unique radiance and elegance.",
    accent:  "#E8522A",
    cta:     "Explore Collections",
  },
  {
    src:     assets.header2,
    eyebrow: "Skincare Edit",
    line1:   "Pure",
    line2:   "Radiance.",
    desc:    "Glow naturally with premium ingredients from 50+ global brands.",
    accent:  "#2BB9B4",
    cta:     "Shop Skincare",
  },
  {
    src:     assets.header3,
    eyebrow: "Restoration",
    line1:   "Nourish.",
    line2:   "Restore.",
    desc:    "Repair and revive — the finest serums and treatment essentials.",
    accent:  "#E8522A",
    cta:     "View Treatments",
  },
  {
    src:     assets.header4,
    eyebrow: "Daily Routine",
    line1:   "Minimal.",
    line2:   "Maximal.",
    desc:    "Simple, powerful routines that deliver extraordinary results.",
    accent:  "#2BB9B4",
    cta:     "Build Your Routine",
  },
];

const STATS = [
  { value: "500+",  label: "Products"  },
  { value: "50+",   label: "Brands"    },
  { value: "10K+",  label: "Customers" },
  { value: "100%",  label: "Authentic" },
];

// Minimal styles (animations removed for performance)
const STYLES = ``;

// ── Component ─────────────────────────────────────────────────────────────────
const FeatureCarousel = () => {
  const navigate = useNavigate();
  const [current, setCurrent] = useState(Math.floor(SLIDES.length / 2));

  const next = useCallback(() => setCurrent(p => (p + 1) % SLIDES.length), []);
  const prev = useCallback(() => setCurrent(p => (p - 1 + SLIDES.length) % SLIDES.length), []);

  // Auto-advance every 4 s
  useEffect(() => {
    const t = setInterval(next, 4000);
    return () => clearInterval(t);
  }, [next]);

  return (
    <section
      className="relative w-full min-h-screen flex flex-col items-center justify-center overflow-x-hidden"
      style={{
        paddingTop: "clamp(2rem, 5vh, 4rem)",
        paddingBottom: "clamp(2rem, 5vh, 4rem)",
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />

      {/* ── Layer 2: decorative corner rings (disabled for performance) ────────────────────────── */}

      {/* ── Layer 5: ambient glow blobs (optimized) ──────────────────── */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden opacity-30" aria-hidden="true">
        <div className="absolute rounded-full" style={{ top: "-10%", left: "-15%", width: 400, height: 400, background: "radial-gradient(circle farthest-side,rgba(232,82,42,0.12),transparent)", willChange: "none" }} />
      </div>

      <div className="relative z-10 w-full flex flex-col items-center gap-6 md:gap-8">

        {/* Small brand label */}
        <span
          className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest"
          style={{ background: "rgba(232,82,42,0.10)", border: "1px solid rgba(232,82,42,0.22)", color: "#E8522A" }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-orange-500" aria-hidden="true" />
          Tenzy Beauty · Sri Lanka
        </span>

        {/* ── Carousel stage ────────────────────────────────────────── */}
        {/*
         * Card sizing:
         *   center  → clamp(260px, 58vw, 680px) wide  ×  clamp(400px, 74vh, 860px) tall
         *   adjacent → scaled to 78 % of center
         * The adjacent cards extend past the viewport edges — the section's
         * overflow-x:hidden clips them, creating the "peek" effect.
         */}
        <div
          className="relative w-full flex items-center justify-center"
          style={{
            height: "clamp(430px, 80vh, 900px)",
            perspective: "1200px",
          }}
        >
          {SLIDES.map((slide, index) => {
            const total = SLIDES.length;
            let   pos   = ((index - current) + total) % total;
            if (pos > Math.floor(total / 2)) pos -= total;

            const isCenter   = pos === 0;
            const isAdjacent = Math.abs(pos) === 1;

            return (
              <div
                key={index}
                className="absolute flex items-center justify-center overflow-hidden rounded-3xl"
                style={{
                  /* Responsive card size — fills most of the screen when centered */
                  width:   "clamp(260px, 58vw, 680px)",
                  height:  "clamp(400px, 74vh, 860px)",

                  transition: "transform 0.35s ease-in-out, opacity 0.35s ease-in-out",
                  willChange: "transform, opacity",
                  backfaceVisibility: "hidden",
                  transform: [
                    `translateX(${pos * 54}%)`,
                    `scale(${isCenter ? 1 : isAdjacent ? 0.78 : 0.65})`,
                  ].join(" "),
                  zIndex:     isCenter ? 20 : isAdjacent ? 10 : 1,
                  opacity:    isCenter ? 1  : isAdjacent ? 0.50 : 0,
                  visibility: Math.abs(pos) > 1 ? "hidden" : "visible",
                  boxShadow:  isCenter
                    ? "0 32px 80px rgba(232,82,42,0.24), 0 10px 30px rgba(0,0,0,0.14)"
                    : "0 16px 40px rgba(0,0,0,0.12)",
                  border: isCenter
                    ? "2px solid rgba(232,82,42,0.30)"
                    : "2px solid rgba(0,0,0,0.06)",
                }}
                aria-hidden={!isCenter}
              >
                {/* Full-bleed image */}
                <img
                  src={slide.src}
                  alt={`${slide.line1} ${slide.line2}`}
                  className="absolute inset-0 w-full h-full object-cover object-center"
                  loading={index <= 1 ? "eager" : "lazy"}
                  decoding={index === current ? "sync" : "async"}
                  width={680}
                  height={860}
                  fetchPriority={index === current ? "high" : "low"}
                />

                {/* Bottom vignette (text legibility) */}
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background:
                      "linear-gradient(to top," +
                      "rgba(6,2,2,0.96) 0%," +
                      "rgba(6,2,2,0.80) 22%," +
                      "rgba(6,2,2,0.44) 48%," +
                      "rgba(6,2,2,0.10) 68%," +
                      "transparent 100%)",
                  }}
                  aria-hidden="true"
                />

                {/* Top vignette */}
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{ background: "linear-gradient(to bottom,rgba(0,0,0,0.28) 0%,transparent 28%)" }}
                  aria-hidden="true"
                />

                {/* Brand accent bar */}
                <div
                  className="absolute bottom-0 left-0 right-0 pointer-events-none"
                  style={{ height: 3, background: `linear-gradient(90deg,${slide.accent} 0%,rgba(255,255,255,0.07) 65%,transparent 100%)` }}
                  aria-hidden="true"
                />

                {/* ── Text overlay — only on the CENTER card ──────────── */}
                {isCenter && (
                  // key=current forces React to unmount+remount this node every
                  // time the active slide changes → restarts CSS animations
                  <div
                    key={current}
                    className="absolute bottom-0 left-0 right-0 z-10"
                    style={{ padding: "0 clamp(1.2rem,4vw,2.5rem) clamp(1.8rem,4vh,3rem)" }}
                  >
                    {/* Eyebrow */}
                    <div className="flex items-center justify-between mb-3">
                      <span
                        className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[9px] sm:text-[10px] font-bold uppercase tracking-widest"
                        style={{
                          background: `${slide.accent}28`,
                          border:     `1px solid ${slide.accent}50`,
                          color:      slide.accent === "#E8522A" ? "#ff9572" : "#5cd9d4",
                        }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: slide.accent }} aria-hidden="true" />
                        {slide.eyebrow}
                      </span>
                      <span className="hidden sm:block text-[10px] font-semibold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.35)" }}>
                        500+ Products
                      </span>
                    </div>

                    {/* Heading */}
                    <h2
                      className="leading-[1.0] text-white"
                      style={{
                        fontFamily:   "'Cormorant Garamond', serif",
                        fontSize:     "clamp(2rem, 5vw, 4.6rem)",
                        fontWeight:   700,
                        marginBottom: "clamp(0.3rem, 0.8vh, 0.6rem)",
                      }}
                    >
                      {slide.line1}
                      <br />
                      <em style={{ fontStyle: "italic", fontWeight: 600, color: slide.accent }}>
                        {slide.line2}
                      </em>
                    </h2>

                    {/* Accent rule */}
                    <div
                      style={{ height: 1.5, width: "clamp(1.8rem,5vw,3rem)", background: `${slide.accent}85`, marginBottom: "clamp(0.4rem,1vh,0.7rem)" }}
                      aria-hidden="true"
                    />

                    {/* Description */}
                    <p
                      style={{
                        color:         "rgba(255,255,255,0.65)",
                        fontSize:      "clamp(0.78rem,1.4vw,0.95rem)",
                        lineHeight:    1.65,
                        maxWidth:      "min(420px,80%)",
                        marginBottom:  "clamp(0.8rem,2vh,1.2rem)",
                      }}
                    >
                      {slide.desc}
                    </p>

                    {/* CTAs */}
                    <div className="fc-t3 flex flex-wrap gap-3">
                      <button
                        onClick={() => navigate("/products")}
                        className="flex items-center gap-2 rounded-full font-bold uppercase tracking-wide text-white cursor-pointer"
                        style={{
                          padding:    "clamp(0.5rem,1.2vh,0.75rem) clamp(1rem,2.5vw,1.5rem)",
                          fontSize:   "clamp(0.7rem,1.2vw,0.8rem)",
                          background: `linear-gradient(135deg,${slide.accent},${slide.accent}bb)`,
                          boxShadow:  `0 4px 16px ${slide.accent}55`,
                          transition: "transform 0.25s,box-shadow 0.25s",
                        }}
                        onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.filter = "brightness(1.12)"; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.filter = ""; }}
                      >
                        {slide.cta}
                      </button>
                      <button
                        onClick={() => navigate("/contact")}
                        className="flex items-center gap-2 rounded-full font-semibold uppercase tracking-wide cursor-pointer"
                        style={{
                          padding:        "clamp(0.5rem,1.2vh,0.75rem) clamp(1rem,2.5vw,1.5rem)",
                          fontSize:       "clamp(0.7rem,1.2vw,0.8rem)",
                          background:     "rgba(255,255,255,0.10)",
                          border:         "1.5px solid rgba(255,255,255,0.28)",
                          color:          "rgba(255,255,255,0.88)",
                          backdropFilter: "blur(8px)",
                          transition:     "background 0.25s,transform 0.25s",
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.20)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
                        onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.10)"; e.currentTarget.style.transform = ""; }}
                      >
                        Consult
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Prev button */}
          <button
            onClick={prev}
            className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 z-30 rounded-full h-11 w-11 flex items-center justify-center cursor-pointer"
            style={{
              background:     "rgba(255,249,245,0.85)",
              border:         "1px solid rgba(232,82,42,0.24)",
              backdropFilter: "blur(10px)",
              boxShadow:      "0 4px 14px rgba(232,82,42,0.14)",
              transition:     "all 0.22s ease",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "#E8522A"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,249,245,0.85)"; }}
            aria-label="Previous slide"
          >
            <ChevronLeft size={20} style={{ color: "#E8522A" }} />
          </button>

          {/* Next button */}
          <button
            onClick={next}
            className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 z-30 rounded-full h-11 w-11 flex items-center justify-center cursor-pointer"
            style={{
              background:     "rgba(255,249,245,0.85)",
              border:         "1px solid rgba(232,82,42,0.24)",
              backdropFilter: "blur(10px)",
              boxShadow:      "0 4px 14px rgba(232,82,42,0.14)",
              transition:     "all 0.22s ease",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "#E8522A"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,249,245,0.85)"; }}
            aria-label="Next slide"
          >
            <ChevronRight size={20} style={{ color: "#E8522A" }} />
          </button>
        </div>

        {/* ── Progress dots ─────────────────────────────────────────── */}
        <div className="flex items-center gap-2.5" role="tablist" aria-label="Slide indicators">
          {SLIDES.map((slide, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              role="tab"
              aria-selected={i === current}
              aria-label={`Go to slide ${i + 1}`}
              className="rounded-full cursor-pointer"
              style={{
                width:      i === current ? "28px" : "9px",
                height:     "9px",
                background: i === current
                  ? `linear-gradient(90deg, ${SLIDES[i].accent}, ${i % 2 === 0 ? "#2BB9B4" : "#E8522A"})`
                  : "rgba(232,82,42,0.22)",
                transition: "all 0.35s cubic-bezier(0.25,1,0.5,1)",
                border:     "none",
              }}
            />
          ))}
        </div>

        {/* ── Stats row ─────────────────────────────────────────────── */}
        <div
          className="flex flex-wrap justify-center gap-x-8 gap-y-3 py-5 px-6 rounded-2xl mx-4"
          style={{
            background:     "rgba(255,255,255,0.70)",
            border:         "1px solid rgba(232,82,42,0.12)",
            backdropFilter: "blur(14px)",
            boxShadow:      "0 4px 20px rgba(232,82,42,0.06)",
            maxWidth:        640,
          }}
        >
          {STATS.map(({ value, label }, i) => (
            <React.Fragment key={label}>
              <div className="flex flex-col items-center">
                <span
                  className="font-bold leading-none"
                  style={{
                    fontFamily: "'Cormorant Garamond', serif",
                    fontSize:   "clamp(1.5rem,3vw,2.2rem)",
                    color:      i % 2 === 0 ? "#E8522A" : "#2BB9B4",
                  }}
                >
                  {value}
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-widest mt-0.5" style={{ color: "#4A2010", opacity: 0.62 }}>
                  {label}
                </span>
              </div>
              {i < STATS.length - 1 && (
                <div className="hidden sm:block w-px self-stretch" style={{ background: "rgba(232,82,42,0.14)" }} aria-hidden="true" />
              )}
            </React.Fragment>
          ))}
        </div>

      </div>
    </section>
  );
};

export default FeatureCarousel;
