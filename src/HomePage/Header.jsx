import React, { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router-dom";
import { slides } from "@/const";

// ─── Sparkle overlay — decorative glitter dots layered over the hero ─────────
const HERO_SPARKLES = [
  { id: 0,  x: 10, y: 12, s: 4, delay: 0.0, dur: 3.2 },
  { id: 1,  x: 22, y: 68, s: 3, delay: 0.8, dur: 2.7 },
  { id: 2,  x: 38, y: 25, s: 5, delay: 1.5, dur: 3.8 },
  { id: 3,  x: 55, y: 80, s: 3, delay: 0.4, dur: 2.9 },
  { id: 4,  x: 68, y: 18, s: 4, delay: 2.1, dur: 3.5 },
  { id: 5,  x: 80, y: 55, s: 3, delay: 0.6, dur: 4.0 },
  { id: 6,  x: 90, y: 30, s: 5, delay: 1.3, dur: 2.6 },
  { id: 7,  x: 15, y: 45, s: 3, delay: 1.9, dur: 3.1 },
  { id: 8,  x: 46, y: 60, s: 4, delay: 0.2, dur: 3.7 },
  { id: 9,  x: 75, y: 85, s: 3, delay: 1.1, dur: 2.8 },
  { id: 10, x: 93, y: 70, s: 4, delay: 2.4, dur: 3.4 },
  { id: 11, x: 30, y: 90, s: 3, delay: 0.9, dur: 4.2 },
];
const HERO_SPARKLE_COLORS = ["#F9A8D4", "#C084FC", "#FDE68A", "#ffffff", "#EC4899"];

const SparkleOverlay = () => (
  <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
    {HERO_SPARKLES.map((sp) => {
      const color = HERO_SPARKLE_COLORS[sp.id % HERO_SPARKLE_COLORS.length];
      return (
        <motion.div
          key={sp.id}
          className="absolute rounded-full"
          style={{
            left: `${sp.x}%`,
            top:  `${sp.y}%`,
            width: sp.s,
            height: sp.s,
            background: color,
            boxShadow: `0 0 ${sp.s * 2}px ${color}`,
          }}
          animate={{ opacity: [0, 0.9, 0], scale: [0.5, 1.4, 0.5] }}
          transition={{
            duration:    sp.dur,
            delay:       sp.delay,
            repeat:      Infinity,
            repeatDelay: 3 + (sp.id % 4),
          }}
        />
      );
    })}
  </div>
);

// ─── Scroll-Expansion Hero ───────────────────────────────────────────────────
//
// Performance design:
//   • scrollProgress, mediaFullyExpanded, touchStartY  →  useRef  (zero re-renders)
//   • All visual updates applied imperatively in requestAnimationFrame
//   • Event listeners attached ONCE (empty deps / stable callback deps)
//   • will-change + translateZ(0) on animated elements → GPU compositing
//   • contain: layout paint on the card → isolates reflow from the rest of the page
//   • overflow:hidden on <html> while pre-expanded → no scroll event handler needed,
//     eliminating the scrollTo(0,0) feedback loop that caused UI jitter
//
const ScrollExpandHero = ({ bgSlides = [], children }) => {
  const navigate = useNavigate();

  // ── State — triggers React renders only when needed ──────────────────────
  const [showContent, setShowContent]   = useState(false);
  const [isMobile, setIsMobile]         = useState(false);
  const [slideIndex, setSlideIndex]     = useState(0);

  // ── Refs — updated every frame without re-rendering ──────────────────────
  const progressRef     = useRef(0);
  const expandedRef     = useRef(false);
  const showContentRef  = useRef(false);
  const touchStartYRef  = useRef(0);
  const isMobileRef     = useRef(false);
  const rafScheduled    = useRef(false);

  // ── DOM node refs for imperative style updates ────────────────────────────
  const bgRef        = useRef(null);   // background carousel wrapper
  const cardRef      = useRef(null);   // expanding card
  const mediaRef     = useRef(null);   // iframe / mobile image wrapper
  const overlayRef   = useRef(null);   // dark shade over card
  const titleRef     = useRef(null);   // title + button container
  const word1Ref     = useRef(null);   // first word span
  const word2Ref     = useRef(null);   // rest words span
  const dotsRef      = useRef(null);   // slide indicator dots

  // ── Keep isMobileRef in sync ──────────────────────────────────────────────
  useEffect(() => {
    const check = () => {
      const mob = window.innerWidth < 768;
      isMobileRef.current = mob;
      setIsMobile(mob);
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // ── Carousel auto-advance ─────────────────────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => {
      if (progressRef.current > 0) return; // paused while user is expanding
      setSlideIndex((p) => (p + 1) % bgSlides.length);
    }, 4500);
    return () => clearInterval(id);
  }, [bgSlides.length]);

  // ── Apply all visual changes directly to the DOM ──────────────────────────
  const applyProgress = useCallback(() => {
    rafScheduled.current = false;
    const p    = progressRef.current;
    const mob  = isMobileRef.current;

    // Card dimensions
    const w = mob ? 300 + p * 680 : 750 + p * 830;
    const h = mob ? 380 + p * 220 : 600 + p * 200;

    if (cardRef.current) {
      cardRef.current.style.width  = `${w}px`;
      cardRef.current.style.height = `${h}px`;
    }

    // Media (iframe / images) — cover card like object-cover
    if (mediaRef.current) {
      const iw = Math.max(w, (h * 16) / 9);
      const ih = Math.max(h, (w * 9) / 16);
      mediaRef.current.style.width  = `${iw}px`;
      mediaRef.current.style.height = `${ih}px`;
    }

    // Dark overlay — full opacity at rest, fades as card expands
    if (overlayRef.current) {
      overlayRef.current.style.opacity = String(Math.max(0, 1 - p * 1.1));
    }

    // Background carousel — fades out as card expands
    if (bgRef.current) {
      bgRef.current.style.opacity = String(Math.max(0, 1 - p));
    }

    // Title + button container — fades out quickly
    const titleOpacity = Math.max(0, 1 - p * 1.8);
    if (titleRef.current) {
      titleRef.current.style.opacity = String(titleOpacity);
    }

    // Word split — slides apart
    const shift = p * (mob ? 160 : 140);
    if (word1Ref.current) {
      word1Ref.current.style.transform = `translateX(-${shift}vw)`;
    }
    if (word2Ref.current) {
      word2Ref.current.style.transform = `translateX(${shift}vw)`;
    }

    // Dots
    if (dotsRef.current) {
      dotsRef.current.style.opacity = String(Math.max(0, 1 - p * 2));
    }
  }, []);

  const scheduleUpdate = useCallback(() => {
    if (!rafScheduled.current) {
      rafScheduled.current = true;
      requestAnimationFrame(applyProgress);
    }
  }, [applyProgress]);

  // ── Wheel + touch handlers — added ONCE (no scroll-driven deps) ──────────
  // Scroll-lock strategy: use overflow:hidden on <html> while the hero is in
  // pre-expansion mode. This removes the need for a scroll event handler that
  // called scrollTo(0,0) — that pattern caused a scroll-event feedback loop
  // (scrollTo fires a scroll event → handler calls scrollTo again → jitter).
  useEffect(() => {
    document.documentElement.style.overflow = "hidden";

    const unlockScroll = () => {
      document.documentElement.style.overflow = "";
    };
    const lockScroll = () => {
      document.documentElement.style.overflow = "hidden";
    };

    const handleWheel = (e) => {
      if (expandedRef.current) {
        if (e.deltaY < 0 && window.scrollY <= 5) {
          // Collapse: lock scroll, snap to top, reset progress
          expandedRef.current    = false;
          progressRef.current    = 0;
          showContentRef.current = false;
          setShowContent(false);
          scheduleUpdate();
          e.preventDefault();
          window.scrollTo(0, 0);
          lockScroll();
        }
        // else: hero fully expanded — let browser scroll the page normally
      } else {
        e.preventDefault();
        const next = Math.min(Math.max(progressRef.current + e.deltaY * 0.0009, 0), 1);
        progressRef.current = next;
        scheduleUpdate();

        if (next >= 1 && !showContentRef.current) {
          showContentRef.current = true;
          expandedRef.current    = true;
          setShowContent(true);
          unlockScroll(); // allow normal page scroll after full expansion
        } else if (next < 0.75 && showContentRef.current) {
          showContentRef.current = false;
          setShowContent(false);
        }
      }
    };

    const handleTouchStart = (e) => {
      touchStartYRef.current = e.touches[0].clientY;
    };

    const handleTouchMove = (e) => {
      if (!touchStartYRef.current) return;
      const touchY = e.touches[0].clientY;
      const deltaY = touchStartYRef.current - touchY;

      if (expandedRef.current) {
        if (deltaY < -20 && window.scrollY <= 5) {
          expandedRef.current    = false;
          progressRef.current    = 0;
          showContentRef.current = false;
          setShowContent(false);
          scheduleUpdate();
          e.preventDefault();
          window.scrollTo(0, 0);
          lockScroll();
        }
      } else {
        e.preventDefault();
        const factor = deltaY < 0 ? 0.008 : 0.005;
        const next = Math.min(Math.max(progressRef.current + deltaY * factor, 0), 1);
        progressRef.current = next;
        touchStartYRef.current = touchY;
        scheduleUpdate();

        if (next >= 1 && !showContentRef.current) {
          showContentRef.current = true;
          expandedRef.current    = true;
          setShowContent(true);
          unlockScroll();
        } else if (next < 0.75 && showContentRef.current) {
          showContentRef.current = false;
          setShowContent(false);
        }
      }
    };

    const handleTouchEnd = () => { touchStartYRef.current = 0; };

    window.addEventListener("wheel",      handleWheel,      { passive: false });
    window.addEventListener("touchstart", handleTouchStart, { passive: true  });
    window.addEventListener("touchmove",  handleTouchMove,  { passive: false });
    window.addEventListener("touchend",   handleTouchEnd);

    return () => {
      unlockScroll(); // always restore on unmount (e.g. navigation away)
      window.removeEventListener("wheel",      handleWheel);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove",  handleTouchMove);
      window.removeEventListener("touchend",   handleTouchEnd);
    };
  }, [scheduleUpdate]); // stable — never changes

  // ── Initial card dimensions (before any scroll) ───────────────────────────
  const initW = isMobile ? 300 : 750;
  const initH = isMobile ? 380 : 600;

  const current   = bgSlides[slideIndex] ?? {};
  const firstWord = (current.title ?? "").split(" ")[0];
  const rest      = (current.title ?? "").split(" ").slice(1).join(" ");

  const fontSize  = isMobile ? "clamp(3.5rem,14vw,5rem)" : "clamp(5rem,9vw,8rem)";
  const textShadow = "0 4px 32px rgba(0,0,0,0.85), 0 1px 4px rgba(0,0,0,1)";

  return (
    <div className="overflow-x-hidden">
      <section className="relative flex flex-col items-center justify-start min-h-dvh">
        <div className="relative w-full flex flex-col items-center min-h-dvh">

          {/* ── Sparkle overlay ──────────────────────────────────────────────── */}
          <SparkleOverlay />

          {/* ── Background carousel ────────────────────────────────────────── */}
          <div
            ref={bgRef}
            className="absolute inset-0 z-0"
            style={{ willChange: "opacity" }}
          >
            {bgSlides.map((slide, i) => (
              <motion.div
                key={slide.image}
                className="absolute inset-0"
                initial={{ opacity: 0 }}
                animate={{ opacity: i === slideIndex ? 1 : 0 }}
                transition={{ duration: 1.2, ease: "easeInOut" }}
              >
                <img
                  src={slide.image}
                  alt={slide.title}
                  className="w-screen h-screen object-cover object-center"
                />
              </motion.div>
            ))}
            <div className="absolute inset-0 bg-linear-to-b from-black/60 via-black/30 to-black/60" />
          </div>

          {/* ── Main layout ──────────────────────────────────────────────────── */}
          <div className="container mx-auto flex flex-col items-center justify-start relative z-10">
            <div className="flex flex-col items-center justify-center w-full h-dvh relative">

              {/* ── Expanding card ─────────────────────────────────────────── */}
              <div
                ref={cardRef}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-2xl overflow-hidden"
                style={{
                  width: `${initW}px`,
                  height: `${initH}px`,
                  maxWidth: "95vw",
                  maxHeight: "85vh",
                  boxShadow: "0 8px 80px rgba(0,0,0,0.5)",
                  willChange: "width, height",
                  contain: "layout paint",
                }}
              >
                {/* Mobile: crossfading slide images */}
                {isMobile && bgSlides.map((slide, i) => (
                  <motion.img
                    key={slide.image}
                    src={slide.image}
                    alt={slide.title}
                    className="absolute inset-0 w-full h-full object-cover"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: i === slideIndex ? 1 : 0 }}
                    transition={{ duration: 1.2, ease: "easeInOut" }}
                  />
                ))}

                {/* Tablet / Desktop: YouTube video */}
                {!isMobile && (
                  <iframe
                    ref={mediaRef}
                    title="Hero video"
                    src="https://www.youtube.com/embed/lnTWVAyMHg0?autoplay=1&mute=1&loop=1&playlist=lnTWVAyMHg0&controls=0&rel=0&modestbranding=1&playsinline=1"
                    allow="autoplay; encrypted-media"
                    className="absolute border-0 pointer-events-none"
                    style={{
                      top: "50%",
                      left: "50%",
                      width: `${Math.max(initW, (initH * 16) / 9)}px`,
                      height: `${Math.max(initH, (initW * 9) / 16)}px`,
                      transform: "translate(-50%,-50%) translateZ(0)",
                      willChange: "width, height",
                    }}
                  />
                )}

                {/* Dark shade — fades as card expands */}
                <div
                  ref={overlayRef}
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background:
                      "linear-gradient(to bottom,rgba(0,0,0,0.55) 0%,rgba(0,0,0,0.82) 50%,rgba(0,0,0,0.65) 100%)",
                    willChange: "opacity",
                  }}
                />
              </div>

              {/* ── Split title ─────────────────────────────────────────────── */}
              <div
                ref={titleRef}
                className="relative z-10 flex flex-col items-center justify-center w-full gap-1"
                style={{ willChange: "opacity" }}
              >
                <span
                  ref={word1Ref}
                  className="block font-bold text-white leading-none tracking-tight pointer-events-none select-none"
                  style={{ fontSize, textShadow, willChange: "transform" }}
                >
                  {firstWord}
                </span>

                {rest && (
                  <span
                    ref={word2Ref}
                    className="block font-bold text-white leading-none tracking-tight pointer-events-none select-none"
                    style={{ fontSize, textShadow, willChange: "transform" }}
                  >
                    {rest}
                  </span>
                )}

                <AnimatePresence mode="wait">
                  <motion.p
                    key={slideIndex}
                    className="mt-4 text-white/80 text-base md:text-lg font-medium tracking-wide pointer-events-none select-none"
                    style={{ textShadow: "0 2px 12px rgba(0,0,0,0.9)" }}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.5 }}
                  >
                    {current.description}
                  </motion.p>
                </AnimatePresence>

                <motion.button
                  onClick={() => navigate("/contact")}
                  className="mt-6 w-[85vw] sm:w-auto rounded-full border-2 border-tenzy-teal text-tenzy-teal text-sm sm:text-base md:text-lg font-bold px-8 sm:px-10 md:px-14 py-3.5 sm:py-4 md:py-5 hover:bg-tenzy-teal hover:text-white transition-all active:scale-95 backdrop-blur-sm bg-white/5 shadow-lg shadow-tenzy-teal/20"
                  style={{ textShadow: "none" }}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.4 }}
                >
                  Book for Skin Consultation
                </motion.button>
              </div>

              {/* ── Slide indicator dots ────────────────────────────────────── */}
              <div
                ref={dotsRef}
                className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2 z-20"
                style={{ willChange: "opacity" }}
              >
                {bgSlides.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setSlideIndex(i)}
                    aria-label={`Go to slide ${i + 1}`}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      i === slideIndex ? "w-6 bg-white" : "w-2 bg-white/40"
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* ── Content after full expansion ─────────────────────────────── */}
            <motion.div
              className="w-full px-6 pb-16 md:px-16 lg:pb-24"
              initial={{ opacity: 0 }}
              animate={{ opacity: showContent ? 1 : 0 }}
              transition={{ duration: 0.8 }}
            >
              {children}
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
};

// ─── SVG icons ───────────────────────────────────────────────────────────────

const DiamondIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2L2 9l10 13L22 9z" />
  </svg>
);

const GlobeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
    <circle cx="12" cy="12" r="10" />
    <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
);

const ShieldIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const LeafIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
    <path d="M17 8C8 10 5.9 16.17 3.82 19.34A1 1 0 0 0 4 21 12.18 12.18 0 0 0 17 8z" />
    <path d="M3.82 19.34A12 12 0 0 1 12 8" />
  </svg>
);

const FEATURES = [
  { icon: <GlobeIcon  />, label: "50+ Global Brands" },
  { icon: <ShieldIcon />, label: "100% Authentic"     },
  { icon: <LeafIcon   />, label: "Skin-Safe Formulas" },
];

const HERO_CONTENT_SPARKLES = [
  { id: 0, x: 5,  y: 10, s: 3, delay: 0.5, dur: 3.0 },
  { id: 1, x: 92, y: 20, s: 4, delay: 1.2, dur: 2.8 },
  { id: 2, x: 8,  y: 80, s: 3, delay: 0.3, dur: 3.5 },
  { id: 3, x: 88, y: 75, s: 5, delay: 1.8, dur: 2.5 },
  { id: 4, x: 50, y: 5,  s: 3, delay: 0.9, dur: 4.0 },
  { id: 5, x: 50, y: 95, s: 4, delay: 2.2, dur: 3.2 },
];

// ─── Post-expansion two-column beauty feature section ────────────────────────
const HeroContent = () => {
  const navigate = useNavigate();
  return (
    <div
      className="w-full rounded-3xl overflow-hidden relative"
      style={{ background: "linear-gradient(135deg, #160720 0%, #0d1a1f 50%, #160720 100%)" }}
    >
      {/* Ambient glow orbs */}
      <div
        className="absolute top-0 left-0 w-[520px] h-[520px] rounded-full blur-[120px] pointer-events-none"
        style={{ background: "rgba(236,72,153,0.16)", transform: "translate(-35%,-35%)" }}
      />
      <div
        className="absolute bottom-0 right-0 w-[520px] h-[520px] rounded-full blur-[120px] pointer-events-none"
        style={{ background: "rgba(139,92,246,0.14)", transform: "translate(35%,35%)" }}
      />
      <div
        className="absolute top-1/2 left-1/2 w-[300px] h-[300px] rounded-full blur-[90px] pointer-events-none"
        style={{ background: "rgba(43,185,180,0.1)", transform: "translate(-50%,-50%)" }}
      />

      {/* Sparkles */}
      {HERO_CONTENT_SPARKLES.map((sp) => (
        <motion.div
          key={sp.id}
          className="absolute rounded-full pointer-events-none"
          style={{
            left: `${sp.x}%`,
            top:  `${sp.y}%`,
            width: sp.s,
            height: sp.s,
            background: "#F9A8D4",
            boxShadow: `0 0 ${sp.s * 3}px #F9A8D4`,
          }}
          animate={{ opacity: [0, 0.8, 0], scale: [0.4, 1.2, 0.4] }}
          transition={{ duration: sp.dur, delay: sp.delay, repeat: Infinity, repeatDelay: 3 + (sp.id % 3) }}
        />
      ))}

      {/* ── Shimmer sweep ── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(105deg, transparent 35%, rgba(236,72,153,0.06) 50%, transparent 65%)",
          }}
          animate={{ x: ["-100%", "200%"] }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear", repeatDelay: 5 }}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 md:min-h-[580px] relative z-10">

        {/* Left copy */}
        <motion.div
          className="flex flex-col justify-center px-6 py-10 sm:px-10 sm:py-14 md:py-16 lg:px-16 xl:px-20"
          initial={{ opacity: 0, x: -55 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Badge */}
          <motion.span
            className="self-start mb-6 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-widest"
            style={{
              background: "rgba(236,72,153,0.1)",
              border: "1px solid rgba(236,72,153,0.25)",
              color: "#F9A8D4",
            }}
            initial={{ opacity: 0, y: -12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-pink-400 animate-pulse" />
            Premium Beauty · Sri Lanka
          </motion.span>

          <h2
            className="leading-[1.12]"
            style={{
              fontFamily: "Cormorant Garamond, serif",
              fontSize: "clamp(2.4rem, 4.5vw, 3.6rem)",
              color: "#FAF5FF",
              fontWeight: 400,
            }}
          >
            Your glow,
            <br />
            <em style={{ color: "#F9A8D4" }}>your story.</em>
          </h2>

          <p className="mt-5 text-white/55 text-base md:text-lg leading-relaxed max-w-sm">
            Expert-curated beauty essentials from trusted global brands. We help
            you build the perfect routine — made for your skin, your life.
          </p>

          {/* Feature icons */}
          <motion.div
            className="mt-7 flex flex-col gap-3"
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            {FEATURES.map((f) => (
              <div key={f.label} className="flex items-center gap-3">
                <span
                  className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg"
                  style={{ background: "rgba(236,72,153,0.12)", color: "#F9A8D4" }}
                >
                  {f.icon}
                </span>
                <span className="text-sm font-medium text-white/70">{f.label}</span>
              </div>
            ))}
          </motion.div>

          {/* CTAs */}
          <div className="mt-9 flex flex-col sm:flex-row gap-4">
            <motion.button
              onClick={() => navigate("/products")}
              className="relative overflow-hidden rounded-full px-10 py-4 text-base md:text-lg font-bold text-white cursor-pointer"
              style={{
                background: "linear-gradient(135deg, #EC4899 0%, #8B5CF6 100%)",
                boxShadow: "0 8px 32px rgba(236,72,153,0.35)",
              }}
              whileHover={{ scale: 1.03, boxShadow: "0 12px 40px rgba(236,72,153,0.5)" }}
              whileTap={{ scale: 0.97 }}
            >
              <span className="relative z-10">Shop With Us</span>
              <motion.span
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: "linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.3) 50%, transparent 70%)",
                }}
                animate={{ x: ["-100%", "200%"] }}
                transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 1.5 }}
              />
            </motion.button>

            <motion.button
              onClick={() => navigate("/contact")}
              className="rounded-full px-10 py-4 text-base md:text-lg font-semibold cursor-pointer"
              style={{
                border: "1.5px solid rgba(249,168,212,0.35)",
                color: "#F9A8D4",
                background: "rgba(236,72,153,0.06)",
              }}
              whileHover={{
                scale: 1.03,
                background: "rgba(236,72,153,0.15)",
                borderColor: "rgba(249,168,212,0.6)",
              }}
              whileTap={{ scale: 0.97 }}
            >
              Skin Consultation
            </motion.button>
          </div>

          {/* Trust line */}
          <div className="mt-10 flex flex-wrap gap-x-5 gap-y-2 text-xs text-white/30">
            {["Free shipping over LKR 50,000", "100% Authentic", "CocoPay installments", "Easy returns"].map((t) => (
              <span key={t} className="flex items-center gap-1.5">
                <span className="h-1 w-1 rounded-full bg-pink-500/60" />
                {t}
              </span>
            ))}
          </div>
        </motion.div>

        {/* Right image */}
        <div className="relative overflow-hidden min-h-[380px] md:min-h-0">
          <motion.div
            className="absolute inset-0"
            initial={{ x: "100%", scale: 1.06 }}
            whileInView={{ x: "0%", scale: 1 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 1.2, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            <img
              src="https://images.unsplash.com/photo-1596462502278-27bfdc403348?q=80&w=1000&auto=format&fit=crop"
              alt="Luxury cosmetics"
              className="w-full h-full object-cover object-center"
              loading="lazy"
              width={700}
              height={580}
            />
            {/* Side fade */}
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(to right, rgba(22,7,32,0.85) 0%, rgba(22,7,32,0.2) 30%, transparent 60%)",
              }}
            />
            {/* Bottom fade */}
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(to top, rgba(22,7,32,0.55) 0%, transparent 40%)",
              }}
            />

            {/* Floating glass badge on image */}
            <motion.div
              className="absolute bottom-6 right-6 flex items-center gap-2 rounded-2xl px-4 py-3"
              style={{
                background: "rgba(255,255,255,0.1)",
                border: "1px solid rgba(249,168,212,0.2)",
                backdropFilter: "blur(16px)",
              }}
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
            >
              <span className="flex h-2 w-2 rounded-full bg-pink-400 animate-pulse" />
              <span className="text-xs font-medium text-white/80">New drops weekly</span>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Category strip at bottom */}
      <motion.div
        className="relative z-10 flex items-center justify-center gap-6 sm:gap-10 py-5 px-6 border-t"
        style={{ borderColor: "rgba(249,168,212,0.1)" }}
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 0.3 }}
      >
        {["Skincare", "Makeup", "Serums", "Body Care", "Fragrance"].map((cat, i) => (
          <motion.button
            key={cat}
            onClick={() => navigate("/products")}
            className="text-xs sm:text-sm font-medium cursor-pointer flex items-center gap-1.5"
            style={{ color: "rgba(249,168,212,0.5)" }}
            whileHover={{ color: "#F9A8D4", scale: 1.07 }}
            whileTap={{ scale: 0.95 }}
            initial={{ opacity: 0, y: 6 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 + i * 0.06 }}
          >
            <DiamondIcon />
            {cat}
          </motion.button>
        ))}
      </motion.div>
    </div>
  );
};

// ─── Header ──────────────────────────────────────────────────────────────────

const Header = () => (
  <ScrollExpandHero bgSlides={slides}>
    <HeroContent />
  </ScrollExpandHero>
);

export default Header;
