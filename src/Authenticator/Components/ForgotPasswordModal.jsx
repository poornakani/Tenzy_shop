import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import AuthTextField from "./AuthTextField";

export default function ForgotPasswordModal({ open, onClose, onSubmit }) {
  const [email, setEmail] = useState("");
  const modalRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  useLayoutEffect(() => {
    if (!open) return;
    gsap.fromTo(
      modalRef.current,
      { y: 14, opacity: 0, scale: 0.985 },
      { y: 0, opacity: 1, scale: 1, duration: 0.35, ease: "power3.out" }
    );
  }, [open]);

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    await onSubmit?.(email);
    setEmail("");
    onClose?.();
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        ref={modalRef}
        className="relative w-full max-w-md rounded-3xl border border-white/30 bg-white/90 shadow-2xl overflow-hidden"
      >
        <div className="p-6 border-b border-black/5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-xl font-extrabold text-slate-900">
                Reset password
              </h3>
              <p className="mt-1 text-sm text-slate-600">
                Enter your email and we’ll send a reset link.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200 transition"
            >
              Close
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <AuthTextField
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            autoComplete="email"
          />

          <button
            type="submit"
            className="w-full rounded-2xl bg-[#0b5351] px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-black/10 hover:opacity-90 transition"
          >
            Send reset link
          </button>

          <p className="text-xs text-slate-500">
            You can connect this to Firebase `sendPasswordResetEmail()` later.
          </p>
        </form>
      </div>
    </div>
  );
}
