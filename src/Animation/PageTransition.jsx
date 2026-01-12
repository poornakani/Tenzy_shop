import { useLocation } from "react-router-dom";
import { useEffect, useRef } from "react";
import gsap from "gsap";

export default function PageTransition({ children }) {
  const overlay = useRef(null);
  const loader = useRef(null);
  const ring = useRef(null);
  const location = useLocation();

  useEffect(() => {
    const el = overlay.current;
    const tl = gsap.timeline();

    // ✅ make sure it's shown at the start of each route change
    gsap.set(el, { display: "flex", autoAlpha: 1 });
    gsap.set(ring.current, { scale: 0.6, opacity: 0 });
    gsap.set(loader.current, { scale: 0.85, opacity: 0, rotate: 0 });

    tl.to(ring.current, {
      scale: 1.15,
      opacity: 0.7,
      duration: 0.55,
      ease: "power2.out",
    })
      .to(
        loader.current,
        {
          scale: 1,
          opacity: 1,
          duration: 0.45,
          ease: "back.out(1.6)",
        },
        "-=0.35"
      )
      .to(loader.current, {
        rotate: 360,
        duration: 1.0,
        ease: "none",
      })
      .to([loader.current, ring.current], {
        opacity: 0,
        scale: 1.35,
        duration: 0.45,
        ease: "power2.in",
      })
      .to(el, {
        autoAlpha: 0,
        duration: 0.25,
        ease: "power2.out",
        onComplete: () => {
          // ✅ IMPORTANT: remove overlay from layout so it can't block anything
          gsap.set(el, { display: "none" });
        },
      });

    return () => tl.kill();
  }, [location.pathname]);

  return (
    <>
      {/* Overlay (won't block clicks) */}
      <div
        ref={overlay}
        className="fixed inset-0 z-[999] hidden items-center justify-center
                   bg-gradient-to-br from-[#fff1e6] via-[#fef6ff] to-[#e6fbf5]
                   pointer-events-none"
      >
        {/* Glow Ring */}
        <div
          ref={ring}
          className="absolute h-40 w-40 rounded-full
                     bg-gradient-to-r from-pink-200 via-rose-200 to-amber-200
                     blur-2xl"
        />

        {/* Beauty Icon */}
        <div
          ref={loader}
          className="relative z-10 h-20 w-20 rounded-full
                     bg-white shadow-2xl flex items-center justify-center"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-10 w-10 text-rose-400"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M7 21h4V10H7v11zm6 0h4V7h-4v14zm-3-18l1.5-3h1L14 3h-4z" />
          </svg>
        </div>
      </div>

      {children}
    </>
  );
}
