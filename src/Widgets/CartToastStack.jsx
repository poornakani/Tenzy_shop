import React, { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { useToast } from "@/Context/ToastContext";

const CartToastStack = () => {
  const { toasts, removeToast } = useToast();

  const itemRefs = useRef(new Map());
  const getRef = (id) => {
    if (!itemRefs.current.has(id)) itemRefs.current.set(id, React.createRef());
    return itemRefs.current.get(id);
  };

  useLayoutEffect(() => {
    if (!toasts?.length) return;

    const latest = toasts[0];
    const el = getRef(latest.id)?.current;
    if (!el) return;

    gsap.killTweensOf(el);
    gsap.fromTo(
      el,
      { autoAlpha: 0, x: 34, y: -6, scale: 0.96, filter: "blur(6px)" },
      {
        autoAlpha: 1,
        x: 0,
        y: 0,
        scale: 1,
        filter: "blur(0px)",
        duration: 0.32,
        ease: "power3.out",
      }
    );
  }, [toasts?.length]);

  const closeToast = (id) => {
    const el = getRef(id)?.current;
    if (!el) return removeToast(id);

    gsap.killTweensOf(el);
    gsap.to(el, {
      autoAlpha: 0,
      x: 34,
      y: -6,
      scale: 0.96,
      filter: "blur(6px)",
      duration: 0.22,
      ease: "power2.in",
      onComplete: () => removeToast(id),
    });
  };

  if (!toasts?.length) return null;

  return (
    <div className="fixed top-24 right-4 z-[9999] flex flex-col gap-3 w-[92vw] max-w-sm">
      {toasts.map((t) => (
        <div
          key={t.id}
          ref={getRef(t.id)}
          className="
            relative overflow-hidden
            rounded-2xl border border-white/15
            shadow-2xl
          "
        >
          {/* DARK BRAND BASE (NOT BLACK) */}
          <div className="absolute inset-0 bg-linear-to-br from-[#0b3a3a] via-[#1f2f3a] to-[#3a1f14]" />

          {/* Glow blobs (logo colours) */}
          <div className="pointer-events-none absolute -top-20 -left-20 h-44 w-44 rounded-full bg-[#ff7a18]/25 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -right-20 h-44 w-44 rounded-full bg-[#14b8a6]/25 blur-3xl" />

          {/* Accent bar */}
          <div className="absolute left-0 top-0 h-full w-[4px] bg-linear-to-b from-[#ff7a18] to-[#14b8a6]" />

          <div className="relative flex items-center gap-3 p-4 text-white">
            {/* Image */}
            {t.image ? (
              <div className="h-12 w-12 rounded-xl overflow-hidden border border-white/15 bg-white/5 shrink-0">
                <img
                  src={t.image}
                  alt={t.title || "toast"}
                  className="h-full w-full object-cover"
                />
              </div>
            ) : (
              <div className="h-12 w-12 rounded-xl border border-white/15 bg-white/5 shrink-0" />
            )}

            {/* Text */}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold truncate">
                {t.title || "Added"}
              </p>
              {t.message && (
                <p className="mt-0.5 text-xs text-white/75 leading-snug line-clamp-2">
                  {t.message}
                </p>
              )}

              {/* tiny highlight line */}
              <div className="mt-2 h-[2px] w-24 rounded-full bg-linear-to-r from-[#ff7a18] via-white/25 to-[#14b8a6]" />
            </div>

            {/* Close */}
            <button
              type="button"
              onClick={() => closeToast(t.id)}
              className="
                h-9 w-9 rounded-xl
                border border-white/15
                bg-white/10 hover:bg-white/15
                transition text-white
              "
              aria-label="Close notification"
              title="Close"
            >
              ✕
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default CartToastStack;
