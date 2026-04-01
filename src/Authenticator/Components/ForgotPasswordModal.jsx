import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { Mail, X, ArrowRight, CheckCircle2 } from "lucide-react";

export default function ForgotPasswordModal({ open, onClose, onSubmit }) {
  const [email,   setEmail]   = useState("");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const [sent,    setSent]    = useState(false);
  const modalRef = useRef(null);

  // Reset state each time the modal opens
  useEffect(() => {
    if (open) {
      setEmail("");
      setError("");
      setSent(false);
      setLoading(false);
    }
  }, [open]);

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
    if (!open || !modalRef.current) return;
    gsap.fromTo(
      modalRef.current,
      { y: 14, opacity: 0, scale: 0.985 },
      { y: 0, opacity: 1, scale: 1, duration: 0.35, ease: "power3.out" }
    );
  }, [open]);

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return setError("Please enter your email address.");
    setError("");
    setLoading(true);
    try {
      await onSubmit?.(email.trim());
      setSent(true);
    } catch (err) {
      setError(err?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />

      <div
        ref={modalRef}
        className="relative w-full max-w-md rounded-3xl border border-white/30 bg-white shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-extrabold text-slate-900">Reset password</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {sent ? "Check your inbox" : "We'll send a reset link to your email"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {sent ? (
            /* ── Success state ── */
            <div className="flex flex-col items-center text-center gap-4 py-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
                <CheckCircle2 size={32} className="text-emerald-500" />
              </div>
              <div>
                <p className="text-base font-bold text-slate-900">Reset link sent!</p>
                <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">
                  We've sent a password reset link to<br />
                  <span className="font-semibold text-slate-800">{email}</span>
                </p>
                <p className="text-xs text-slate-400 mt-3">
                  Didn't receive it? Check your spam folder or{" "}
                  <button
                    type="button"
                    onClick={() => setSent(false)}
                    className="text-tenzy-teal font-semibold hover:underline"
                  >
                    try again
                  </button>
                  .
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-full py-3 bg-tenzy-teal text-white text-sm font-bold rounded-xl hover:opacity-90 transition mt-2"
              >
                Done
              </button>
            </div>
          ) : (
            /* ── Email form ── */
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-start gap-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs px-3.5 py-3 rounded-xl">
                  <span className="mt-0.5 shrink-0">⚠</span>
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">
                  Email Address
                </label>
                <div className="relative group">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-tenzy-teal transition-colors pointer-events-none">
                    <Mail size={14} />
                  </span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(""); }}
                    placeholder="you@example.com"
                    required
                    autoComplete="email"
                    className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl
                               outline-none focus:ring-2 focus:ring-tenzy-teal/20 focus:border-tenzy-teal
                               transition-all placeholder:text-slate-300 text-slate-800"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-tenzy-teal text-white text-sm font-bold rounded-xl
                           hover:opacity-90 transition-all active:scale-[0.98] disabled:opacity-60
                           disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-tenzy-teal/25"
              >
                {loading ? (
                  <><span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" /> Sending…</>
                ) : (
                  <>Send reset link <ArrowRight size={14} /></>
                )}
              </button>

              <p className="text-xs text-slate-400 text-center">
                Remember your password?{" "}
                <button type="button" onClick={onClose} className="text-tenzy-teal font-semibold hover:underline">
                  Back to sign in
                </button>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
