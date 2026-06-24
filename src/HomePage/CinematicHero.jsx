/**
 * Tenzy Beauty — Cinematic Scroll-Pinned Hero (v5)
 *
 * Scroll–animation design:
 *   pin: 4 000 px total  →  each unit ≈ 440 px  →  first image change at ~900 px (≈1 screen)
 *   scrub: 0.1           →  animation lag ≈ 0.1 s (Lenis adds ~0.5 s → total ≈ 0.6 s)
 *
 *   Phase 1  (0 → 700 px)   : bg fades out + card rises simultaneously
 *   Phase 2  (700 → 1 000)  : card expands to full-screen
 *   Phase 3  (1 000 → 1 300): first slide copy slides in + brief hold
 *   Slide 1→2 (1 300 → 1 840): image crossfade + text swap (540 px)
 *   Slide 2→3 (1 840 → 2 380): same
 *   Slide 3→4 (2 380 → 2 920): same
 *   Phase 7  (2 920 → 3 200): last slide exits, CTA fades in
 *   Phase 8  (3 200 → 3 730): card pulls back (rounded)
 *   Phase 9  (3 730 → 4 000): card exits upward
 *
 * All scroll-driven tweens use ONLY opacity + translateY (GPU compositor only).
 * filter:blur and scale removed entirely from scroll path.
 */

import React, { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useNavigate } from "react-router-dom";
import { assets } from "@/const";

gsap.registerPlugin(ScrollTrigger);

// ── Slide data ────────────────────────────────────────────────────────────────
const SLIDES = [
  {
    img:     assets.header1,
    eyebrow: "Premium Beauty · Sri Lanka",
    line1:   "Beauty,",
    line2:   "Elevated.",
    desc:    "Luxury skincare crafted for your unique radiance and elegance.",
    accent:  "#E8522A",
    cta:     "Explore Collections",
  },
  {
    img:     assets.header2,
    eyebrow: "Skincare Edit",
    line1:   "Pure",
    line2:   "Radiance.",
    desc:    "Glow naturally with premium ingredients from 50+ global brands.",
    accent:  "#2BB9B4",
    cta:     "Shop Skincare",
  },
  {
    img:     assets.header3,
    eyebrow: "Restoration",
    line1:   "Nourish.",
    line2:   "Restore.",
    desc:    "Repair and revive — the finest serums and treatment essentials.",
    accent:  "#E8522A",
    cta:     "View Treatments",
  },
  {
    img:     assets.header4,
    eyebrow: "Daily Routine",
    line1:   "Minimal.",
    line2:   "Maximal.",
    desc:    "Simple, powerful routines that deliver extraordinary results.",
    accent:  "#2BB9B4",
    cta:     "Build Your Routine",
  },
];

const TRUST = ["Free shipping LKR 50K+", "100% Authentic", "CocoPay"];

// ── Styles ────────────────────────────────────────────────────────────────────
const STYLES = `
  .cb-grain {
    position:absolute;inset:0;pointer-events:none;z-index:50;
    opacity:0.035;mix-blend-mode:overlay;
    background:url('data:image/svg+xml;utf8,<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><filter id="nb"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" stitchTiles="stitch"/></filter><rect width="100%" height="100%" filter="url(%23nb)"/></svg>');
  }
  .cb-grid {
    background-size:56px 56px;
    background-image:
      linear-gradient(to right,rgba(232,82,42,.07) 1px,transparent 1px),
      linear-gradient(to bottom,rgba(232,82,42,.07) 1px,transparent 1px);
    mask-image:radial-gradient(ellipse at center,black 0%,transparent 68%);
    -webkit-mask-image:radial-gradient(ellipse at center,black 0%,transparent 68%);
    will-change:opacity;
  }
  /* outside-card taglines */
  .cb-tag1 {
    color:#18090a;
    text-shadow:0 10px 28px rgba(232,82,42,.14),0 2px 5px rgba(232,82,42,.08);
    will-change:transform,opacity;
  }
  .cb-tag2 {
    background:linear-gradient(170deg,#2BB9B4 0%,#1d8a86 100%);
    -webkit-background-clip:text;-webkit-text-fill-color:transparent;
    background-clip:text;transform:translateZ(0);
    will-change:clip-path;
  }
  /* expanding card */
  .cb-card {
    background:#130a06;
    box-shadow:
      0 40px 100px -20px rgba(232,82,42,.30),
      0 18px 40px -16px rgba(43,185,180,.18),
      0 6px 20px rgba(0,0,0,.18);
    border:1px solid rgba(232,82,42,.22);
    position:relative;
    contain:paint;
    will-change:transform,width,height,border-radius;
  }
  /* each slide gets its own GPU compositor layer */
  .cb-slide {
    position:absolute;inset:0;
    will-change:opacity;
    transform:translateZ(0);
    backface-visibility:hidden;
    -webkit-backface-visibility:hidden;
  }
  /* slide copy block */
  .cb-copy {
    will-change:transform,opacity;
    backface-visibility:hidden;
    -webkit-backface-visibility:hidden;
  }
  /* progress dots — GSAP owns all width/opacity changes */
  .cb-dot { border-radius:9999px;flex-shrink:0;transition:none!important; }

  /* slide CTA */
  .cb-slide-cta {
    transition:transform .26s cubic-bezier(.25,1,.5,1),filter .26s;cursor:pointer;
  }
  .cb-slide-cta:hover  { transform:translateY(-2px);filter:brightness(1.12); }
  .cb-slide-cta:active { transform:translateY(1px); }

  .cb-outline-cta {
    background:rgba(255,255,255,.10);border:1.5px solid rgba(255,255,255,.28);
    color:rgba(255,255,255,.88);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);
    transition:background .26s,transform .26s;cursor:pointer;
  }
  .cb-outline-cta:hover  { background:rgba(255,255,255,.18);transform:translateY(-2px); }
  .cb-outline-cta:active { transform:translateY(1px); }

  /* final CTA buttons */
  .cb-cta-dk {
    background:linear-gradient(175deg,#18090a,#2d1010);color:#FFF9F5;
    box-shadow:0 2px 6px rgba(0,0,0,.22),0 12px 28px -4px rgba(24,9,10,.55),inset 0 1px 1px rgba(255,255,255,.12);
    transition:all .30s cubic-bezier(.25,1,.5,1);cursor:pointer;
  }
  .cb-cta-dk:hover  { transform:translateY(-2px);background:linear-gradient(175deg,#E8522A,#c4401d);box-shadow:0 8px 28px rgba(232,82,42,.48); }
  .cb-cta-dk:active { transform:translateY(1px); }

  .cb-cta-lt {
    background:linear-gradient(175deg,#FFF9F5,#FDE8E0);color:#18090a;
    box-shadow:0 2px 6px rgba(0,0,0,.08),0 12px 28px -4px rgba(0,0,0,.22),inset 0 1px 1px #fff;
    transition:all .30s cubic-bezier(.25,1,.5,1);cursor:pointer;
  }
  .cb-cta-lt:hover  { transform:translateY(-2px);box-shadow:0 6px 16px rgba(0,0,0,.14),0 22px 36px -6px rgba(0,0,0,.28); }
  .cb-cta-lt:active { transform:translateY(1px); }
`;

// ── Icons ─────────────────────────────────────────────────────────────────────
const ArrowRight = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
    <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const BagIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
    <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M16 10a4 4 0 01-8 0" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const SparkleIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 0l2.4 9.6L24 12l-9.6 2.4L12 24l-2.4-9.6L0 12l9.6-2.4z"/>
  </svg>
);
const CheckIcon = () => (
  <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} aria-hidden="true">
    <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// ── Component ─────────────────────────────────────────────────────────────────
const CinematicHero = () => {
  const navigate     = useNavigate();
  const containerRef = useRef(null);
  const cardRef      = useRef(null);
  const rafRef       = useRef(0);

  // Mouse sheen via CSS custom property (no GSAP, no repaint)
  useEffect(() => {
    const onMove = (e) => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        if (!cardRef.current) return;
        const r = cardRef.current.getBoundingClientRect();
        cardRef.current.style.setProperty("--mx", `${e.clientX - r.left}px`);
        cardRef.current.style.setProperty("--my", `${e.clientY - r.top}px`);
      });
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => { window.removeEventListener("mousemove", onMove); cancelAnimationFrame(rafRef.current); };
  }, []);

  // Main GSAP setup
  useEffect(() => {
    // Respect system accessibility preference
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      gsap.set([".cb-tag1", ".cb-tag2", ".cb-card",
                ".cb-slide", ".cb-copy", ".cb-cta-sec"],
               { autoAlpha: 1, clearProps: "all" });
      return;
    }

    const container = containerRef.current;
    const isMobile  = window.innerWidth < 768;

    // Grab live DOM references once (avoids repeated querySelectorAll in ticks)
    const slideEls = [...container.querySelectorAll(".cb-slide")];
    const copyEls  = [...container.querySelectorAll(".cb-copy")];
    const dotEls   = [...container.querySelectorAll(".cb-dot")];

    // Put EVERYTHING inside gsap.context so ctx.revert() is fully clean
    const ctx = gsap.context(() => {

      // ── Initial states ──────────────────────────────────────────────
      gsap.set(".cb-tag1",        { autoAlpha: 0, y: 50 });
      gsap.set(".cb-tag2",        { clipPath: "inset(0 100% 0 0)" });
      gsap.set(".cb-card",        { y: window.innerHeight + 200, autoAlpha: 1 });
      gsap.set(".cb-cta-sec",     { autoAlpha: 0, y: 28 });
      gsap.set(slideEls.slice(1), { opacity: 0 });             // plain opacity — no visibility flash on scrub
      gsap.set(copyEls,           { autoAlpha: 0, y: 55 });   // autoAlpha keeps pointer-events off while hidden
      gsap.set(dotEls,            { width: 9,  opacity: 0.30 });
      gsap.set(dotEls[0],         { width: 30, opacity: 1    }); // first dot active

      // ── One-shot intro (fires behind PageTransition overlay) ────────
      // Delay 3.5 s ≈ when the PageTransition overlay begins to exit (~3.9 s total)
      gsap.timeline({ delay: 3.5 })
        .to(".cb-tag1", { autoAlpha: 1, y: 0, ease: "expo.out",      duration: 1.55 })
        .to(".cb-tag2", { clipPath: "inset(0 0% 0 0)", ease: "power4.inOut", duration: 1.35 }, "-=0.95");

      // ── Crossfade helper (inside ctx so all tweens are tracked) ─────
      //
      // Uses ONLY opacity + translateY — both GPU-compositor properties.
      // Each call adds ≈1.23 timeline-units ≈ 540 px of scroll at end:"+=4000".
      //
      // Scroll-up reversal works correctly because:
      //   • .to()     records the "from" state the first time it plays → reverses to that
      //   • .fromTo() always uses the explicit from-values → reverses to those
      //
      const crossfade = (tl, from, to) => {
        tl
          // ── Exit: copy slides up and fades ─────────────────────────
          .to(copyEls[from], { autoAlpha: 0, y: -55, ease: "power2.in", duration: 0.30 })

          // ── Image crossfade: simultaneous linear fade ───────────────
          // Both images animate in parallel with ease:"linear" so that at any
          // scrub position  opacity[from] + opacity[to] ≈ 1  (no dark/bright flash).
          // Using plain `opacity` (not autoAlpha) avoids a discrete visibility
          // toggle that can cause a 1-frame flash when scrubbing back and forth.
          .to(slideEls[from], { opacity: 0, ease: "linear", duration: 0.45 }, "<")
          .to(slideEls[to],   { opacity: 1, ease: "linear", duration: 0.45 }, "<")

          // ── Dots ────────────────────────────────────────────────────
          .to(dotEls[from],   { width: 9,  opacity: 0.30, duration: 0.25 }, "<")
          .to(dotEls[to],     { width: 30, opacity: 1,    duration: 0.25 }, "<")

          // ── Enter: new copy slides up ───────────────────────────────
          // Using .to() NOT fromTo — .to() records the actual current state
          // as its "from" the first time it plays, so scrubbing up/down never
          // causes the element to snap to a hard-coded y value.
          .to(copyEls[to],   { autoAlpha: 1, y: 0, ease: "power3.out", duration: 0.50 }, "-=0.12")

          // ── Hold ─────────────────────────────────────────────────────
          .to({}, { duration: 0.33 });
      };

      // ── Scroll-pinned main timeline ─────────────────────────────────
      //
      // end: "+=4000"  = 4 000 px of scroll → ~4.4 viewport heights
      // scrub: 0.1     = 0.1 s lag  (Lenis lerp adds ~0.5 s → total ≈ 0.6 s)
      //
      // Timeline units vs scroll px  (total ≈ 9.1 units, 4 000/9.1 ≈ 440 px/unit):
      //   Phase 1   : 0.70 units  →  310 px   (bg fades + card rises)
      //   Phase 2   : 0.60 units  →  264 px   (card expands)
      //   Phase 3   : 0.65 units  →  286 px   (slide-1 copy in + hold)
      //   × 3 xfade : 3.69 units  → 1 623 px  (≈ 541 px each — roughly 1 screen/slide)
      //   Phase 7-9 : 2.46 units  → 1 082 px  (CTA + pullback + exit)
      //
      const st = gsap.timeline({
        scrollTrigger: {
          trigger: container,
          start:   "top top",
          end:     "+=4000",
          pin:     true,
          scrub:   0.1,        // near-instant; Lenis already provides the smooth feel
        },
      });

      // ── Phase 1: bg fades + card rises (both start at position 0) ──
      st
        .to(".cb-tag1",  { autoAlpha: 0, y: -25, ease: "power2.out", duration: 0.70 }, 0)
        .to(".cb-tag2",  { autoAlpha: 0,          ease: "power2.out", duration: 0.55 }, 0.08)
        .to(".cb-grid",  { opacity: 0,             ease: "power2.out", duration: 0.60 }, 0)
        .to(".cb-card",  { y: 0,                   ease: "power3.inOut", duration: 0.70 }, 0)

      // ── Phase 2: card expands to full-screen ────────────────────────
        .to(".cb-card", {
          width: "100%", height: "100%", borderRadius: "0px",
          ease: "power3.inOut", duration: 0.60,
        })

      // ── Phase 3: first slide copy enters ───────────────────────────
      // .to() records the actual state (autoAlpha:0, y:55 from gsap.set) so
      // scrubbing back restores it to exactly that — no y-snap like fromTo.
        .to(copyEls[0], { autoAlpha: 1, y: 0, ease: "power3.out", duration: 0.40 }, "-=0.08")
        .to({}, { duration: 0.25 });   // hold — user sees slide 1

      // ── Phases 4-6: crossfade slides 1→2→3→4 ───────────────────────
      crossfade(st, 0, 1);
      crossfade(st, 1, 2);
      crossfade(st, 2, 3);

      // Brief hold on the last slide before exit
      st.to({}, { duration: 0.22 });

      // ── Phase 7: last slide COPY exits, CTA fades in ──────────────
      // NOTE: slideEls[3] (header4 image) is intentionally kept visible —
      // it stays as the card background through the pullback and exit.
      st
        .to(copyEls[3],    { autoAlpha: 0, y: -45, ease: "power2.in",  duration: 0.30 })
        .to(".cb-cta-sec", { autoAlpha: 1, y: 0,    ease: "power3.out", duration: 0.55 })

      // ── Phase 8: card pulls back to large rounded shape ─────────────
        .to(".cb-card", {
          width:        isMobile ? "92vw" : "86vw",
          height:       isMobile ? "92vh" : "86vh",
          borderRadius: isMobile ? "28px" : "36px",
          ease: "expo.inOut", duration: 1.20,
        }, "pullback")

      // ── Phase 9: card exits upward ──────────────────────────────────
        .to(".cb-card", {
          y:    -(window.innerHeight + 260),
          ease: "power3.in", duration: 1.00,
        });

    }, container); // scope all string selectors to this container

    return () => ctx.revert();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-screen h-screen overflow-hidden flex items-center justify-center"
      style={{ background: "#FFF9F5" }}
    >
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />

      {/* Static film grain */}
      <div className="cb-grain" aria-hidden="true" />

      {/* Grid — fades with opacity */}
      <div className="cb-grid absolute inset-0 z-0 pointer-events-none opacity-55" aria-hidden="true" />

      {/* ── Background taglines ────────────────────────────────────── */}
      <div
        className="absolute z-10 flex flex-col items-center justify-center text-center w-screen px-4 pointer-events-none select-none"
        aria-hidden="true"
      >
        <h1
          className="cb-tag1 font-bold leading-tight mb-2"
          style={{
            fontFamily: "'Cormorant Garamond',serif",
            fontSize:   "clamp(3.6rem,9vw,8rem)",
            fontWeight: 700,
          }}
        >
          Beauty that
        </h1>
        <h1
          className="cb-tag2 font-extrabold leading-tight"
          style={{
            fontFamily: "'Cormorant Garamond',serif",
            fontSize:   "clamp(3.6rem,9vw,8rem)",
            fontWeight: 800,
          }}
        >
          transforms you.
        </h1>
        {/* Scroll cue */}
        <div className="mt-12 hidden md:flex flex-col items-center gap-3 opacity-28">
          <div className="w-px h-14" style={{ background: "linear-gradient(to bottom,#E8522A,transparent)", animation: "pulse 2s ease-in-out infinite" }} />
          <span className="text-[9px] font-bold uppercase tracking-[0.22em]" style={{ color:"#4A2010", writingMode:"vertical-rl", transform:"rotate(180deg)" }}>
            Scroll
          </span>
        </div>
      </div>

      {/* ── Final CTA section (behind card, revealed at end) ──────── */}
      <div
        className="cb-cta-sec absolute z-10 flex flex-col items-center justify-center text-center w-screen px-6"
        aria-label="Shop Tenzy Beauty"
      >
        <span
          className="inline-flex items-center gap-2 mb-5 px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest"
          style={{ background:"rgba(232,82,42,.10)", border:"1px solid rgba(232,82,42,.22)", color:"#E8522A" }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" aria-hidden="true" />
          Tenzy Beauty · Sri Lanka
        </span>
        <h2
          className="font-bold leading-tight mb-4"
          style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"clamp(2.6rem,6.5vw,5.5rem)", color:"#18090a" }}
        >
          Start your beauty journey.
        </h2>
        <p className="text-base md:text-lg mb-10 max-w-lg leading-relaxed" style={{ color:"#4A2010" }}>
          500+ premium products from 50+ global brands — authentic, curated,
          and delivered across Sri Lanka.
        </p>
        <div className="flex flex-col sm:flex-row gap-5">
          <button
            onClick={() => navigate("/products")}
            className="cb-cta-dk flex items-center justify-center gap-3 px-8 py-4 rounded-[1.25rem] focus-visible:outline-2 focus-visible:outline-orange-500 focus-visible:outline-offset-2"
            style={{ fontSize:13, fontWeight:700, letterSpacing:"0.06em", textTransform:"uppercase" }}
          >
            <BagIcon />
            Shop Collections
          </button>
          <button
            onClick={() => navigate("/contact")}
            className="cb-cta-lt flex items-center justify-center gap-3 px-8 py-4 rounded-[1.25rem] focus-visible:outline-2 focus-visible:outline-orange-500 focus-visible:outline-offset-2"
            style={{ fontSize:13, fontWeight:700, letterSpacing:"0.06em", textTransform:"uppercase" }}
          >
            <SparkleIcon />
            Skin Consultation
          </button>
        </div>
        <div className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2">
          {["Free shipping over LKR 50K","100% Authentic","CocoPay Installments","Easy Returns"].map(t => (
            <span key={t} className="flex items-center gap-1.5 text-xs" style={{ color:"rgba(74,32,16,.50)" }}>
              <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full flex-shrink-0" style={{ background:"rgba(232,82,42,.12)", color:"#E8522A" }} aria-hidden="true">
                <CheckIcon />
              </span>
              {t}
            </span>
          ))}
        </div>
      </div>

      {/* ── Main expanding card ────────────────────────────────────── */}
      <div
        ref={cardRef}
        className="cb-card z-20 overflow-hidden"
        style={{
          width:  "min(680px,90vw)",
          height: "min(480px,70vh)",
          borderRadius: 20,
        }}
        role="region"
        aria-label="Tenzy Beauty showcase"
      >
        {/* Mouse sheen */}
        <div
          className="absolute inset-0 z-50 pointer-events-none rounded-[inherit]"
          style={{
            background:   "radial-gradient(700px circle at var(--mx,50%) var(--my,50%),rgba(232,82,42,.09) 0%,rgba(43,185,180,.05) 35%,transparent 55%)",
            mixBlendMode: "screen",
          }}
          aria-hidden="true"
        />

        {/* ── Slides ──────────────────────────────────────────────── */}
        {SLIDES.map((slide, i) => (
          <div key={i} className="cb-slide" aria-hidden={i !== 0}>

            {/* Full-bleed image */}
            <img
              src={slide.img}
              alt={`${slide.line1} ${slide.line2}`}
              className="absolute inset-0 w-full h-full object-cover object-center"
              loading={i === 0 ? "eager" : "lazy"}
              decoding={i === 0 ? "sync" : "async"}
              width={1400}
              height={800}
            />

            {/* Bottom vignette (dark → text legibility) */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  "linear-gradient(to top," +
                  "rgba(8,3,3,.97) 0%," +
                  "rgba(8,3,3,.82) 20%," +
                  "rgba(8,3,3,.48) 46%," +
                  "rgba(8,3,3,.14) 68%," +
                  "transparent 100%)",
              }}
              aria-hidden="true"
            />

            {/* Top vignette (nav readability) */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ background:"linear-gradient(to bottom,rgba(0,0,0,.32) 0%,transparent 28%)" }}
              aria-hidden="true"
            />

            {/* Brand accent bar */}
            <div
              className="absolute bottom-0 left-0 right-0 pointer-events-none"
              style={{ height:3, background:`linear-gradient(90deg,${slide.accent} 0%,rgba(255,255,255,.07) 60%,transparent 100%)` }}
              aria-hidden="true"
            />

            {/* ── Copy overlay ─────────────────────────────────── */}
            <div
              className="cb-copy absolute bottom-0 left-0 right-0 z-10"
              style={{ padding:"0 clamp(1.25rem,5vw,3.5rem) clamp(3rem,6vh,4.5rem)" }}
            >
              {/* Top row */}
              <div className="flex items-center justify-between mb-3">
                <span
                  className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[9px] sm:text-[10px] font-bold uppercase tracking-widest"
                  style={{
                    background: `${slide.accent}28`,
                    border:     `1px solid ${slide.accent}50`,
                    color:      slide.accent === "#E8522A" ? "#ff9572" : "#5cd9d4",
                  }}
                >
                  <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background:slide.accent }} aria-hidden="true" />
                  {slide.eyebrow}
                </span>
                <span className="hidden sm:block text-[10px] font-semibold uppercase tracking-widest" style={{ color:"rgba(255,255,255,.35)" }}>
                  500+ Products
                </span>
              </div>

              {/* Heading */}
              <h2
                style={{
                  fontFamily:   "'Cormorant Garamond',serif",
                  fontSize:     "clamp(2.2rem,5.5vw,5rem)",
                  fontWeight:   700,
                  lineHeight:   1.0,
                  color:        "#FFFFFF",
                  marginBottom: "clamp(.4rem,1vh,.8rem)",
                }}
              >
                {slide.line1}
                <br />
                <em style={{ fontStyle:"italic", fontWeight:600, color:slide.accent }}>
                  {slide.line2}
                </em>
              </h2>

              {/* Accent rule */}
              <div
                style={{ height:1.5, width:"clamp(2rem,7vw,3.5rem)", background:`${slide.accent}85`, marginBottom:"clamp(.5rem,1.2vh,.9rem)" }}
                aria-hidden="true"
              />

              {/* Description */}
              <p style={{ color:"rgba(255,255,255,.66)", fontSize:"clamp(.82rem,1.5vw,1rem)", lineHeight:1.65, maxWidth:"min(440px,85%)", marginBottom:"clamp(.9rem,2vh,1.3rem)" }}>
                {slide.desc}
              </p>

              {/* CTAs */}
              <div className="flex flex-wrap gap-3 mb-4">
                <button
                  onClick={() => navigate("/products")}
                  className="cb-slide-cta flex items-center gap-2 rounded-full px-5 py-2.5 text-xs sm:text-sm font-bold uppercase tracking-wide text-white focus-visible:outline-2 focus-visible:outline-offset-2"
                  style={{
                    background:   `linear-gradient(135deg,${slide.accent},${slide.accent}bb)`,
                    boxShadow:    `0 4px 18px ${slide.accent}55,0 2px 6px rgba(0,0,0,.28)`,
                    outlineColor: slide.accent,
                  }}
                >
                  <ArrowRight />
                  {slide.cta}
                </button>
                <button
                  onClick={() => navigate("/contact")}
                  className="cb-outline-cta rounded-full px-5 py-2.5 text-xs sm:text-sm font-semibold uppercase tracking-wide focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2"
                >
                  Consult
                </button>
              </div>

              {/* Trust */}
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                {TRUST.map(t => (
                  <span key={t} className="flex items-center gap-1.5" style={{ fontSize:"10px", color:"rgba(255,255,255,.30)" }}>
                    <span className="w-1 h-1 rounded-full opacity-65" style={{ background:slide.accent }} aria-hidden="true" />
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}

        {/* ── Progress dots ───────────────────────────────────────── */}
        <div className="absolute bottom-5 right-5 z-20 flex items-center gap-2" role="tablist" aria-label="Slide indicators">
          {SLIDES.map((_, i) => (
            <div
              key={i}
              className="cb-dot h-[7px]"
              style={{
                width:      i === 0 ? "30px" : "9px",
                background: i === 0 ? "#E8522A" : "rgba(255,255,255,.30)",
                opacity:    i === 0 ? 1 : 0.30,
              }}
              role="tab"
              aria-label={`Slide ${i + 1}`}
              aria-selected={i === 0}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default CinematicHero;
