import React, { useLayoutEffect, useRef } from "react";
import gsap from "gsap";

/**
 * A soft luxe background + split layout on desktop.
 * Left: form card
 * Right: brand story / image
 */
export default function AuthLayout({
  title,
  subtitle,
  children,
  rightImageUrl,
}) {
  const rootRef = useRef(null);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".auth-card",
        { y: 16, opacity: 0, scale: 0.985 },
        { y: 0, opacity: 1, scale: 1, duration: 0.6, ease: "power3.out" }
      );
      gsap.fromTo(
        ".auth-right",
        { x: 18, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.7, ease: "power3.out", delay: 0.05 }
      );
      gsap.fromTo(
        ".auth-badge",
        { y: 10, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5, ease: "power3.out", delay: 0.05 }
      );
    }, rootRef);

    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={rootRef}
      className="min-h-screen bg-gradient-to-b from-[#f6fbff] via-[#fbf7ff] to-[#f6fff9]"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-10 py-10 sm:py-12">
        <div className="grid gap-8 lg:grid-cols-12 items-stretch">
          {/* Left: Form */}
          <div className="lg:col-span-5">
            <div className="auth-card rounded-[2rem] border border-black/5 bg-white/75 backdrop-blur shadow-[0_30px_90px_-55px_rgba(15,23,42,0.45)] overflow-hidden">
              <div className="p-6 sm:p-8">
                <div className="auth-badge inline-flex items-center gap-2 rounded-full border border-black/5 bg-white/80 px-4 py-2 text-xs sm:text-sm font-semibold text-slate-700">
                  <span className="h-2 w-2 rounded-full bg-[#0b5351]" />
                  Tenzy Beauty
                </div>

                <h1 className="mt-4 text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
                  {title}
                </h1>
                {subtitle && (
                  <p className="mt-2 text-sm sm:text-base text-slate-600">
                    {subtitle}
                  </p>
                )}

                <div className="mt-6">{children}</div>
              </div>

              <div className="border-t border-black/5 bg-gradient-to-r from-amber-50 via-rose-50 to-emerald-50 px-6 sm:px-8 py-4">
                <p className="text-xs sm:text-sm text-slate-600">
                  Secure checkout • Authentic products • Fast delivery
                </p>
              </div>
            </div>
          </div>

          {/* Right: Visual */}
          <div className="auth-right lg:col-span-7 hidden lg:block">
            <div className="relative h-full min-h-[520px] rounded-[2rem] border border-black/5 bg-white/55 backdrop-blur overflow-hidden shadow-[0_30px_90px_-55px_rgba(15,23,42,0.35)]">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-100/70 via-rose-100/60 to-emerald-100/70" />
              <div className="pointer-events-none absolute -top-24 -left-24 h-80 w-80 rounded-full bg-amber-200/45 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-emerald-200/35 blur-3xl" />

              <div className="relative p-10 h-full flex flex-col justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-700">
                    Glow starts here ✨
                  </p>
                  <h2 className="mt-2 text-3xl font-extrabold text-slate-900 leading-tight">
                    Luxury skincare,
                    <br />
                    made simple.
                  </h2>
                  <p className="mt-3 max-w-md text-slate-600">
                    Sign in to track orders, manage your routine, and discover
                    products matched to your skin concerns.
                  </p>
                </div>

                <div className="rounded-3xl border border-black/5 bg-white/70 backdrop-blur p-5">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-[#0b5351] text-white grid place-items-center font-extrabold">
                      T
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">
                        Personalized picks
                      </p>
                      <p className="text-sm text-slate-600">
                        Based on dryness, acne, pigmentation and more.
                      </p>
                    </div>
                  </div>

                  {rightImageUrl ? (
                    <img
                      src={rightImageUrl}
                      alt="beauty"
                      className="mt-5 w-full h-60 object-cover rounded-2xl border border-black/5"
                      loading="lazy"
                      draggable={false}
                    />
                  ) : (
                    <div className="mt-5 h-60 rounded-2xl border border-black/5 bg-white/80 grid place-items-center text-slate-500">
                      Add a brand image here
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          {/* end right */}
        </div>
      </div>
    </div>
  );
}
