import { useLocation } from "react-router-dom";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { assets } from "@/const";

const TEAL   = "#2BB9B4";
const ORANGE = "#E8522A";

/*
  8 sparkle dots placed around the centre content.
  x / y are pixel offsets from the screen centre.
*/
const SPARKLES = [
  { x: -130, y: -95,  r: 5, color: TEAL   },
  { x:  120, y: -85,  r: 4, color: ORANGE },
  { x: -150, y:   5,  r: 3, color: ORANGE },
  { x:  145, y:  10,  r: 5, color: TEAL   },
  { x:  -95, y:  110, r: 4, color: TEAL   },
  { x:  100, y:  105, r: 3, color: ORANGE },
  { x:  -35, y: -130, r: 3, color: ORANGE },
  { x:   45, y:  130, r: 4, color: TEAL   },
];

export default function PageTransition({ children }) {
  const overlay  = useRef(null);
  const blob1    = useRef(null);   // teal  — top-left
  const blob2    = useRef(null);   // orange — bottom-right
  const logoWrap = useRef(null);
  const ring1    = useRef(null);   // first  ripple from logo
  const ring2    = useRef(null);   // second ripple (delayed)
  const lineRef  = useRef(null);   // thin gradient divider
  const brandRef = useRef(null);   // "TENZY"
  const tagRef   = useRef(null);   // "Beauty & Skincare"
  const dotRefs  = useRef([]);
  const location = useLocation();

  useEffect(() => {
    const el = overlay.current;
    const tl = gsap.timeline();

    /* ── initial states ─────────────────────────────────────────── */
    gsap.set(el,           { display: "flex", autoAlpha: 1 });
    gsap.set(blob1.current,  { scale: 0,   opacity: 0 });
    gsap.set(blob2.current,  { scale: 0,   opacity: 0 });
    gsap.set(logoWrap.current, { scale: 0.55, opacity: 0, rotate: -8 });
    gsap.set(ring1.current,  { scale: 0.8, opacity: 0 });
    gsap.set(ring2.current,  { scale: 0.8, opacity: 0 });
    gsap.set(lineRef.current,  { scaleX: 0,  opacity: 0 });
    gsap.set(brandRef.current, { opacity: 0,  y: 10 });
    gsap.set(tagRef.current,   { opacity: 0,  y:  7 });
    dotRefs.current.forEach(d => d && gsap.set(d, { scale: 0, opacity: 0 }));

    /* ── enter ──────────────────────────────────────────────────── */
    tl
      // 1. colour blobs bloom in from the corners
      .to(blob1.current, { scale: 1, opacity: 1, duration: 1.0, ease: "power2.out" }, 0)
      .to(blob2.current, { scale: 1, opacity: 1, duration: 1.0, ease: "power2.out" }, 0.08)

      // 2. logo bounces in with a soft spin
      .to(logoWrap.current, {
        scale: 1, opacity: 1, rotate: 0,
        duration: 0.65, ease: "back.out(1.9)",
      }, 0.2)

      // 3. first ripple ring expands from logo
      .to(ring1.current, { scale: 0.8, opacity: 0.55, duration: 0.1, ease: "none" }, 0.28)
      .to(ring1.current, { scale: 2.4, opacity: 0,    duration: 1.1, ease: "power2.out" }, 0.38)

      // 4. second ripple (slightly delayed, softer)
      .to(ring2.current, { scale: 0.8, opacity: 0.35, duration: 0.1, ease: "none" }, 0.52)
      .to(ring2.current, { scale: 2.8, opacity: 0,    duration: 1.2, ease: "power2.out" }, 0.62)

      // 5. divider line draws from centre outward
      .to(lineRef.current, {
        scaleX: 1, opacity: 1,
        duration: 0.55, ease: "power3.out",
        transformOrigin: "center center",
      }, 0.58)

      // 6. brand name fades + rises
      .to(brandRef.current, { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" }, 0.7)

      // 7. tagline
      .to(tagRef.current, { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" }, 0.9)

      // 8. sparkles pop in with stagger
      .to(dotRefs.current.filter(Boolean), {
        scale: 1, opacity: 1,
        duration: 0.32, stagger: 0.065, ease: "back.out(2.2)",
      }, 0.78)

      // 9. hold
      .to({}, { duration: 0.72 })

      /* ── exit ─────────────────────────────────────────────────── */
      // sparkles fade
      .to(dotRefs.current.filter(Boolean), {
        scale: 0, opacity: 0,
        duration: 0.22, stagger: 0.04, ease: "power2.in",
      })
      // logo + text float up and disappear
      .to([logoWrap.current, lineRef.current, brandRef.current, tagRef.current], {
        opacity: 0, y: -14,
        duration: 0.38, ease: "power2.in", stagger: 0.05,
      }, "-=0.12")
      // blobs shrink away
      .to([blob1.current, blob2.current], {
        scale: 1.2, opacity: 0,
        duration: 0.4, ease: "power2.in",
      }, "-=0.22")
      // overlay fades out
      .to(el, {
        autoAlpha: 0, duration: 0.28, ease: "power1.out",
        onComplete: () => gsap.set(el, { display: "none" }),
      });

    return () => tl.kill();
  }, [location.pathname]);

  return (
    <>
      {/* ── Transition overlay ────────────────────────────────────── */}
      <div
        ref={overlay}
        className="fixed inset-0 z-[999] hidden items-center justify-center pointer-events-none overflow-hidden"
        style={{ background: "linear-gradient(135deg, #fffaf6 0%, #f5fdfc 55%, #fff6f2 100%)" }}
      >
        {/* Teal blob — top-left */}
        <div
          ref={blob1}
          className="absolute pointer-events-none"
          style={{
            top: "-15%", left: "-15%",
            width: "60vw", height: "60vw",
            borderRadius: "50%",
            background: `radial-gradient(circle, rgba(43,185,180,0.24) 0%, transparent 68%)`,
            filter: "blur(48px)",
          }}
        />

        {/* Orange blob — bottom-right */}
        <div
          ref={blob2}
          className="absolute pointer-events-none"
          style={{
            bottom: "-15%", right: "-15%",
            width: "60vw", height: "60vw",
            borderRadius: "50%",
            background: `radial-gradient(circle, rgba(232,82,42,0.20) 0%, transparent 68%)`,
            filter: "blur(48px)",
          }}
        />

        {/* ── Centre composition ─────────────────────────────────── */}
        <div className="relative z-10 flex flex-col items-center gap-0">

          {/* Logo wrapper — ripple rings are siblings, centred on logo */}
          <div style={{ position: "relative", width: 96, height: 96, marginBottom: "1.2rem" }}>
            {/* Ripple ring 1 */}
            <div
              ref={ring1}
              style={{
                position: "absolute",
                inset: "-12px",
                borderRadius: "50%",
                border: `1.5px solid ${TEAL}`,
                opacity: 0,
              }}
            />
            {/* Ripple ring 2 */}
            <div
              ref={ring2}
              style={{
                position: "absolute",
                inset: "-12px",
                borderRadius: "50%",
                border: `1px solid rgba(232,82,42,0.5)`,
                opacity: 0,
              }}
            />

            {/* Logo image */}
            <div
              ref={logoWrap}
              style={{
                width: "100%", height: "100%",
                borderRadius: "50%",
                background: "white",
                boxShadow: `0 8px 40px rgba(43,185,180,0.22), 0 2px 12px rgba(0,0,0,0.08)`,
                display: "flex", alignItems: "center", justifyContent: "center",
                padding: "10px",
              }}
            >
              <img
                src={assets.logo}
                alt="Tenzy"
                style={{ width: "100%", height: "100%", objectFit: "contain" }}
              />
            </div>
          </div>

          {/* Gradient divider line */}
          <div
            ref={lineRef}
            style={{
              width: "160px",
              height: "1px",
              background: `linear-gradient(to right, transparent, ${TEAL} 30%, ${ORANGE} 70%, transparent)`,
              marginBottom: "1rem",
            }}
          />

          {/* Brand name */}
          <h1
            ref={brandRef}
            style={{
              fontFamily: '"Modern Negra", "Mona Sans", sans-serif',
              fontSize:   "clamp(2rem, 5vw, 2.8rem)",
              fontWeight: 800,
              letterSpacing: "0.38em",
              color: "#18181b",
              textTransform: "uppercase",
              lineHeight: 1,
              marginBottom: "0.65rem",
            }}
          >
            TENZY
          </h1>

          {/* Tagline */}
          <p
            ref={tagRef}
            style={{
              fontSize:      "0.65rem",
              fontWeight:    700,
              letterSpacing: "0.28em",
              textTransform: "uppercase",
              color: TEAL,
            }}
          >
            Beauty &amp; Skincare
          </p>
        </div>

        {/* ── Sparkle dots ───────────────────────────────────────── */}
        {SPARKLES.map((s, i) => (
          <div
            key={i}
            ref={el => (dotRefs.current[i] = el)}
            style={{
              position:     "absolute",
              left:         "50%",
              top:          "50%",
              width:        s.r * 2,
              height:       s.r * 2,
              borderRadius: "50%",
              background:   s.color,
              /*
                Offset from screen centre by s.x / s.y,
                then pull back by half the dot's own size.
              */
              transform: `translate(calc(${s.x}px - 50%), calc(${s.y}px - 50%))`,
              opacity: 0.9,
              boxShadow: `0 0 ${s.r * 3}px ${s.color}`,
            }}
          />
        ))}
      </div>

      {children}
    </>
  );
}
