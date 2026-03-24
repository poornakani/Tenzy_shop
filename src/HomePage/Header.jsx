import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router-dom";
import { slides } from "@/const";

// ─── Scroll-Expansion Hero ──────────────────────────────────────────────────

const ScrollExpandHero = ({ bgSlides = [], children }) => {
  const navigate = useNavigate();
  const [scrollProgress, setScrollProgress] = useState(0);
  const [showContent, setShowContent] = useState(false);
  const [mediaFullyExpanded, setMediaFullyExpanded] = useState(false);
  const [touchStartY, setTouchStartY] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [slideIndex, setSlideIndex] = useState(0);

  const sectionRef = useRef(null);

  // ── Carousel auto-advance (pauses once expansion begins) ──────────────────
  useEffect(() => {
    if (scrollProgress > 0) return; // pause while user is expanding
    const id = setInterval(
      () => setSlideIndex((p) => (p + 1) % bgSlides.length),
      4500,
    );
    return () => clearInterval(id);
  }, [bgSlides.length, scrollProgress]);

  // ── Detect mobile ─────────────────────────────────────────────────────────
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // ── Wheel + touch scroll interception ────────────────────────────────────
  useEffect(() => {
    const handleWheel = (e) => {
      if (mediaFullyExpanded && e.deltaY < 0 && window.scrollY <= 5) {
        setMediaFullyExpanded(false);
        e.preventDefault();
      } else if (!mediaFullyExpanded) {
        e.preventDefault();
        const next = Math.min(
          Math.max(scrollProgress + e.deltaY * 0.0009, 0),
          1,
        );
        setScrollProgress(next);
        if (next >= 1) {
          setMediaFullyExpanded(true);
          setShowContent(true);
        } else if (next < 0.75) setShowContent(false);
      }
    };

    const handleTouchStart = (e) => setTouchStartY(e.touches[0].clientY);

    const handleTouchMove = (e) => {
      if (!touchStartY) return;
      const touchY = e.touches[0].clientY;
      const deltaY = touchStartY - touchY;
      if (mediaFullyExpanded && deltaY < -20 && window.scrollY <= 5) {
        setMediaFullyExpanded(false);
        e.preventDefault();
      } else if (!mediaFullyExpanded) {
        e.preventDefault();
        const factor = deltaY < 0 ? 0.008 : 0.005;
        const next = Math.min(Math.max(scrollProgress + deltaY * factor, 0), 1);
        setScrollProgress(next);
        if (next >= 1) {
          setMediaFullyExpanded(true);
          setShowContent(true);
        } else if (next < 0.75) setShowContent(false);
        setTouchStartY(touchY);
      }
    };

    const handleTouchEnd = () => setTouchStartY(0);
    const handleScroll = () => {
      if (!mediaFullyExpanded) window.scrollTo(0, 0);
    };

    window.addEventListener("wheel", handleWheel, { passive: false });
    window.addEventListener("scroll", handleScroll);
    window.addEventListener("touchstart", handleTouchStart, { passive: false });
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleTouchEnd);

    return () => {
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [scrollProgress, mediaFullyExpanded, touchStartY]);

  // ── Derived values ────────────────────────────────────────────────────────
  const mediaW = isMobile ? 300 + scrollProgress * 680 : 750 + scrollProgress * 830;
  const mediaH = isMobile ? 380 + scrollProgress * 220 : 600 + scrollProgress * 200;
  const shiftVw = scrollProgress * (isMobile ? 160 : 140);

  const current = bgSlides[slideIndex] ?? {};
  const firstWord = (current.title ?? "").split(" ")[0];
  const rest = (current.title ?? "").split(" ").slice(1).join(" ");

  return (
    <div ref={sectionRef} className="overflow-x-hidden">
      <section className="relative flex flex-col items-center justify-start min-h-dvh">
        <div className="relative w-full flex flex-col items-center min-h-dvh">
          {/* ── Background carousel ──────────────────────────────────────── */}
          <motion.div
            className="absolute inset-0 z-0"
            animate={{ opacity: 1 - scrollProgress }}
            transition={{ duration: 0.1 }}
          >
            {/* Crossfading slide images */}
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

            {/* Gradient overlay — dark at edges, lighter in centre */}
            <div className="absolute inset-0 bg-linear-to-b from-black/60 via-black/30 to-black/60" />
          </motion.div>

          {/* ── Main layout ──────────────────────────────────────────────── */}
          <div className="container mx-auto flex flex-col items-center justify-start relative z-10">
            <div className="flex flex-col items-center justify-center w-full h-dvh relative">
              {/* ── Expanding media card ──────────────────────────────────── */}
              <div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-2xl overflow-hidden"
                style={{
                  width: `${mediaW}px`,
                  height: `${mediaH}px`,
                  maxWidth: "95vw",
                  maxHeight: "85vh",
                  boxShadow: "0 8px 80px rgba(0,0,0,0.5)",
                }}
              >
                {/* Hero YouTube video — covers card like object-cover */}
                <iframe
                  title="Hero video"
                  src="https://www.youtube.com/embed/lnTWVAyMHg0?autoplay=1&mute=1&loop=1&playlist=lnTWVAyMHg0&controls=0&rel=0&modestbranding=1&playsinline=1"
                  allow="autoplay; encrypted-media"
                  className="absolute border-0 pointer-events-none"
                  style={{
                    top: "50%",
                    left: "50%",
                    width: `${Math.max(mediaW, (mediaH * 16) / 9)}px`,
                    height: `${Math.max(mediaH, (mediaW * 9) / 16)}px`,
                    transform: "translate(-50%, -50%)",
                  }}
                />

                {/* Dark shade — full at rest so text/button are readable, clears as card expands */}
                <motion.div
                  className="absolute inset-0"
                  style={{
                    background:
                      "linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.82) 50%, rgba(0,0,0,0.65) 100%)",
                  }}
                  animate={{ opacity: Math.max(0, 1 - scrollProgress * 1.1) }}
                  transition={{ duration: 0.15 }}
                />
              </div>

              {/* ── Split title ─────────────────────────────────────────── */}
              <div
                className="relative z-10 flex flex-col items-center justify-center w-full gap-1"
                style={{ opacity: Math.max(0, 1 - scrollProgress * 1.8) }}
              >
                {/* Words — no pointer events so they don't block card clicks */}
                <span
                  className="block font-bold text-white leading-none tracking-tight pointer-events-none select-none"
                  style={{
                    fontSize: isMobile
                      ? "clamp(3.5rem,14vw,5rem)"
                      : "clamp(5rem,9vw,8rem)",
                    textShadow:
                      "0 4px 32px rgba(0,0,0,0.85), 0 1px 4px rgba(0,0,0,1)",
                    transform: `translateX(-${shiftVw}vw)`,
                  }}
                >
                  {firstWord}
                </span>

                {rest && (
                  <span
                    className="block font-bold text-white leading-none tracking-tight pointer-events-none select-none"
                    style={{
                      fontSize: isMobile
                        ? "clamp(3.5rem,14vw,5rem)"
                        : "clamp(5rem,9vw,8rem)",
                      textShadow:
                        "0 4px 32px rgba(0,0,0,0.85), 0 1px 4px rgba(0,0,0,1)",
                      transform: `translateX(${shiftVw}vw)`,
                    }}
                  >
                    {rest}
                  </span>
                )}

                {/* Slide description */}
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

                {/* Skin Consultation button — visible on the hero before scrolling */}
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

              {/* ── Slide indicator dots ─────────────────────────────────── */}
              <motion.div
                className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2 z-20"
                animate={{ opacity: Math.max(0, 1 - scrollProgress * 2) }}
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
              </motion.div>
            </div>

            {/* ── Content revealed after full expansion ─────────────────── */}
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

// ─── Post-expansion two-column section ──────────────────────────────────────

const HeroContent = () => {
  const navigate = useNavigate();
  return (
    <div
      className="w-full rounded-3xl overflow-hidden relative"
      style={{ background: "linear-gradient(135deg,#1f0805 0%,#06201f 100%)" }}
    >
      {/* Orange glow — left */}
      <div
        className="absolute top-0 left-0 w-[480px] h-[480px] rounded-full blur-[110px] pointer-events-none"
        style={{
          background: "rgba(232,82,42,0.22)",
          transform: "translate(-30%,-30%)",
        }}
      />
      {/* Teal glow — right */}
      <div
        className="absolute bottom-0 right-0 w-[480px] h-[480px] rounded-full blur-[110px] pointer-events-none"
        style={{
          background: "rgba(43,185,180,0.18)",
          transform: "translate(30%,30%)",
        }}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 md:min-h-[580px] relative z-10">
        {/* Left: text */}
        <motion.div
          className="flex flex-col justify-center px-6 py-10 sm:px-10 sm:py-14 md:py-16 lg:px-16 xl:px-20"
          initial={{ opacity: 0, x: -55 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
        >
          <span className="inline-flex items-center gap-2 mb-6 text-xs font-semibold text-tenzy-teal tracking-[0.18em] uppercase">
            <span className="h-px w-6 bg-tenzy-teal" />
            Premium Beauty · Sri Lanka
          </span>
          <h2 className="font-serif text-4xl md:text-5xl lg:text-[3.4rem] text-white leading-tight">
            Your glow,
            <br />
            <span className="text-tenzy-orange italic">your story.</span>
          </h2>
          <p className="mt-5 text-white/60 text-base md:text-lg leading-relaxed max-w-sm">
            Expert-curated beauty essentials from trusted global brands. We help
            you build the perfect routine — made for your skin, your life.
          </p>
          <div className="mt-9 flex flex-col sm:flex-row gap-4">
            <button
              onClick={() => navigate("/products")}
              className="rounded-full bg-tenzy-orange text-white px-10 py-4 text-base md:text-lg font-bold hover:bg-tenzy-orange/85 transition active:scale-95 shadow-xl shadow-tenzy-orange/30"
            >
              Shop With Us
            </button>
            <button
              onClick={() => navigate("/contact")}
              className="rounded-full border-2 border-tenzy-teal/60 text-tenzy-teal px-10 py-4 text-base md:text-lg font-semibold hover:bg-tenzy-teal/10 transition active:scale-95"
            >
              Skin Consultation
            </button>
          </div>
          <div className="mt-10 flex flex-wrap gap-x-6 gap-y-2 text-xs text-white/35">
            {[
              "Free shipping over LKR 50,000",
              "100% Authentic",
              "CocoPay installments",
              "Easy returns",
            ].map((t) => (
              <span key={t} className="flex items-center gap-1.5">
                <span className="h-1 w-1 rounded-full bg-tenzy-orange/70" />
                {t}
              </span>
            ))}
          </div>
        </motion.div>

        {/* Right: image slides in from behind the right edge */}
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
            />
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(to right,rgba(31,8,5,0.75) 0%,rgba(31,8,5,0.15) 30%,transparent 60%)",
              }}
            />
          </motion.div>
        </div>
      </div>
    </div>
  );
};

// ─── Header ─────────────────────────────────────────────────────────────────

const Header = () => (
  <ScrollExpandHero bgSlides={slides}>
    <HeroContent />
  </ScrollExpandHero>
);

export default Header;
