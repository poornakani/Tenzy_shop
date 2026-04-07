import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../Context/AuthContext";
import { authApi } from "../../services/api";
import { motion, AnimatePresence } from "motion/react";
import {
  Eye, EyeOff, Mail, Lock, User, Sparkles,
  Star, Gift, Truck, Shield, Check, ArrowRight,
} from "lucide-react";
import Navibar from "@/HomePage/Navibar";
import ForgotPasswordModal from "../Components/ForgotPasswordModal";

// ─── Shared field component ────────────────────────────────────────────────────
const Field = ({ label, type = "text", value, onChange, placeholder, icon: Icon, autoComplete, required }) => {
  const [show, setShow] = useState(false);
  const isPassword = type === "password";
  return (
    <div className="w-full">
      <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">
        {label}
      </label>
      <div className="relative group">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#2BB9B4] transition-colors pointer-events-none">
          <Icon size={14} />
        </span>
        <input
          type={isPassword && show ? "text" : type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          autoComplete={autoComplete}
          className="w-full pl-9 pr-9 py-2.5 text-sm bg-white border border-slate-200 rounded-xl
                     outline-none focus:ring-2 focus:ring-[#2BB9B4]/20 focus:border-[#2BB9B4]
                     transition-all placeholder:text-slate-300 text-slate-800"
        />
        {isPassword && (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShow((s) => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors"
          >
            {show ? <EyeOff size={13} /> : <Eye size={13} />}
          </button>
        )}
      </div>
    </div>
  );
};

// ─── Social row ────────────────────────────────────────────────────────────────
const SocialRow = () => (
  <div className="flex gap-2.5 w-full">
    <button type="button" className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition active:scale-[0.97]">
      <svg viewBox="0 0 48 48" className="h-4 w-4" aria-hidden="true">
        <path fill="#EA4335" d="M24 9.5c3.3 0 6.3 1.2 8.6 3.4l6.4-6.4C34.9 2.3 29.8 0 24 0 14.6 0 6.5 5.4 2.6 13.3l7.6 5.9C12 13.4 17.6 9.5 24 9.5z"/>
        <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-2.8-.4-4H24v7.6h12.5c-.6 3-2.4 5.5-5.1 7.2l7.8 6c4.6-4.2 7.3-10.4 7.3-16.8z"/>
        <path fill="#FBBC05" d="M10.2 28.9c-1.2-3-.1-6.4 2.4-8.3l-7.6-5.9C.8 19.1 0 21.5 0 24s.8 4.9 2.3 7.1l7.9-6.2z"/>
        <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.7l-7.8-6c-2.2 1.5-5.1 2.4-8.1 2.4-6.3 0-11.7-4.2-13.6-9.8l-7.9 6.2C6.4 42.6 14.6 48 24 48z"/>
      </svg>
      Google
    </button>
    <button type="button" className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#1877F2] text-xs font-semibold text-white hover:bg-[#166fe5] transition active:scale-[0.97]">
      <svg viewBox="0 0 24 24" className="h-4 w-4 fill-white" aria-hidden="true">
        <path d="M22.675 0h-21.35C.597 0 0 .597 0 1.326v21.348C0 23.403.597 24 1.326 24h11.495v-9.294H9.691V11.01h3.13V8.309c0-3.1 1.894-4.788 4.659-4.788 1.325 0 2.463.099 2.795.143v3.24h-1.918c-1.504 0-1.796.715-1.796 1.763v2.313h3.587l-.467 3.696h-3.12V24h6.116C23.403 24 24 23.403 24 22.674V1.326C24 .597 23.403 0 22.675 0z"/>
      </svg>
      Facebook
    </button>
  </div>
);

const Divider = () => (
  <div className="flex items-center gap-3 w-full">
    <div className="h-px flex-1 bg-slate-100" />
    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">or</span>
    <div className="h-px flex-1 bg-slate-100" />
  </div>
);

// ─── Sign-in form ─────────────────────────────────────────────────────────────
const SignInForm = ({ data, onChange, remember, setRemember, onSubmit, onForgot, onSwitch, error, loading }) => (
  <div className="w-full max-w-xs flex flex-col items-center gap-5">
    <div className="text-center">
      <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Sign In</h2>
      <p className="text-xs text-slate-400 mt-1.5">Access your skincare dashboard</p>
    </div>

    <SocialRow />
    <Divider />

    {error && (
      <div className="w-full flex items-start gap-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs px-3.5 py-3 rounded-xl">
        <span className="mt-0.5 shrink-0 text-rose-500">⚠</span>
        <span>{error}</span>
      </div>
    )}

    <form onSubmit={onSubmit} className="w-full flex flex-col gap-3.5">
      <Field label="Email" type="email" value={data.email}
        onChange={(e) => onChange((p) => ({ ...p, email: e.target.value }))}
        placeholder="you@example.com" icon={Mail} autoComplete="email" required />

      <Field label="Password" type="password" value={data.password}
        onChange={(e) => onChange((p) => ({ ...p, password: e.target.value }))}
        placeholder="••••••••" icon={Lock} autoComplete="current-password" required />

      <div className="flex items-center justify-between">
        <label className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer select-none">
          <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)}
            className="w-3.5 h-3.5 rounded border-slate-300 accent-[#2BB9B4]" />
          Remember me
        </label>
        <button type="button" onClick={onForgot}
          className="text-xs font-semibold text-[#2BB9B4] hover:underline">
          Forgot password?
        </button>
      </div>

      <button type="submit" disabled={loading}
        className="w-full py-3 bg-[#2BB9B4] text-white text-sm font-bold rounded-xl
                   hover:bg-[#24a09b] transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed
                   shadow-lg shadow-[#2BB9B4]/25 flex items-center justify-center gap-2 mt-1">
        {loading ? (
          <><span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" /> Signing in…</>
        ) : (
          <>Sign In <ArrowRight size={14} /></>
        )}
      </button>
    </form>

    {/* Mobile only switch */}
    <p className="text-xs text-slate-500 lg:hidden">
      No account?{" "}
      <button onClick={onSwitch} type="button" className="font-semibold text-[#2BB9B4] hover:underline">
        Create one free →
      </button>
    </p>
  </div>
);

// ─── Sign-up form ─────────────────────────────────────────────────────────────
const SignUpForm = ({ data, onChange, agree, setAgree, error, onSubmit, onSwitch, loading }) => (
  <div className="w-full max-w-xs flex flex-col items-center gap-4">
    <div className="text-center">
      <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Create Account</h2>
      <p className="text-xs text-slate-400 mt-1.5">Start your skincare journey today</p>
    </div>

    <SocialRow />
    <Divider />

    {error && (
      <div className="w-full bg-rose-50 border border-rose-200 text-rose-600 text-xs px-3.5 py-2.5 rounded-xl">
        {error}
      </div>
    )}

    <form onSubmit={onSubmit} className="w-full flex flex-col gap-3">
      <Field label="Username" value={data.username}
        onChange={(e) => onChange((p) => ({ ...p, username: e.target.value }))}
        placeholder="e.g. glowlover_lk" icon={User} autoComplete="username" required />

      <Field label="Email" type="email" value={data.email}
        onChange={(e) => onChange((p) => ({ ...p, email: e.target.value }))}
        placeholder="you@example.com" icon={Mail} autoComplete="email" required />

      <Field label="Password" type="password" value={data.password}
        onChange={(e) => onChange((p) => ({ ...p, password: e.target.value }))}
        placeholder="Min. 6 characters" icon={Lock} autoComplete="new-password" required />

      <Field label="Confirm Password" type="password" value={data.confirm}
        onChange={(e) => onChange((p) => ({ ...p, confirm: e.target.value }))}
        placeholder="Repeat password" icon={Lock} autoComplete="new-password" required />

      <label className="flex items-start gap-2 text-xs text-slate-500 cursor-pointer select-none">
        <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)}
          className="mt-0.5 w-3.5 h-3.5 rounded border-slate-300 accent-[#2BB9B4] flex-shrink-0" />
        <span>
          I agree to the{" "}
          <a href="/terms" className="text-[#2BB9B4] font-semibold hover:underline">Terms</a>
          {" "}&{" "}
          <a href="/privacy" className="text-[#2BB9B4] font-semibold hover:underline">Privacy Policy</a>
        </span>
      </label>

      <button type="submit" disabled={loading}
        className="w-full py-3 bg-[#2BB9B4] text-white text-sm font-bold rounded-xl
                   hover:bg-[#24a09b] transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed
                   shadow-lg shadow-[#2BB9B4]/25 flex items-center justify-center gap-2 mt-1">
        {loading ? (
          <><span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" /> Creating…</>
        ) : (
          <>Create Account <ArrowRight size={14} /></>
        )}
      </button>
    </form>

    {/* Mobile only switch */}
    <p className="text-xs text-slate-500 lg:hidden">
      Already have an account?{" "}
      <button onClick={onSwitch} type="button" className="font-semibold text-[#2BB9B4] hover:underline">
        Sign in →
      </button>
    </p>
  </div>
);

// ─── Overlay brand panel content ──────────────────────────────────────────────
const OverlayContent = ({ mode, onSwitch }) => {
  const isSignIn = mode === "signin";
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={mode}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="flex flex-col items-center text-center gap-6 px-10 max-w-sm"
      >
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-[#2BB9B4] flex items-center justify-center shadow-lg shadow-[#2BB9B4]/40">
            <Sparkles size={20} className="text-white" />
          </div>
          <div className="text-left">
            <p className="text-white font-extrabold text-xl leading-none tracking-tight">Tenzy</p>
            <p className="text-[#2BB9B4] text-xs font-semibold mt-0.5">Beauty & Skincare</p>
          </div>
        </div>

        {isSignIn ? (
          <>
            <div>
              <h2 className="text-[2rem] font-extrabold text-white leading-tight">
                New here?<br />
                <span className="text-[#2BB9B4]">Join us today.</span>
              </h2>
              <p className="mt-3 text-white/55 text-sm leading-relaxed">
                Create your free account and unlock personalised skincare picks curated just for your skin.
              </p>
            </div>

            {/* Promo */}
            <div className="flex items-center gap-2 bg-[#E8522A] text-white text-xs font-bold px-4 py-2 rounded-full shadow-lg shadow-[#E8522A]/30">
              <Gift size={12} /> New members get 10% OFF their first order!
            </div>

            {/* Features */}
            <div className="flex flex-col gap-2.5 text-left w-full">
              {[
                { icon: Check,    text: "100% authentic products" },
                { icon: Truck,    text: "Free delivery over LKR 5,000" },
                { icon: Shield,   text: "Easy returns & buyer protection" },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded-md bg-[#2BB9B4]/20 flex items-center justify-center flex-shrink-0 border border-[#2BB9B4]/20">
                    <Icon size={11} className="text-[#2BB9B4]" />
                  </div>
                  <span className="text-white/65 text-xs">{text}</span>
                </div>
              ))}
            </div>

            <button
              onClick={onSwitch}
              className="mt-1 px-9 py-3 rounded-2xl border-2 border-white/80 text-white text-sm font-bold
                         hover:bg-white hover:text-[#082b29] transition-all active:scale-[0.97]"
            >
              Create Account →
            </button>
          </>
        ) : (
          <>
            <div>
              <h2 className="text-[2rem] font-extrabold text-white leading-tight">
                Welcome<br />
                <span className="text-[#2BB9B4]">back! 👋</span>
              </h2>
              <p className="mt-3 text-white/55 text-sm leading-relaxed">
                Sign in to track your orders, manage your beauty routine, and explore new arrivals.
              </p>
            </div>

            {/* Rating */}
            <div className="bg-white/8 rounded-2xl p-5 border border-white/10 w-full">
              <div className="flex gap-0.5 justify-center mb-3">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={13} className="text-amber-400 fill-amber-400" />
                ))}
              </div>
              <p className="text-white/70 text-xs italic leading-relaxed">
                "Tenzy completely changed my skincare game. The personalised picks are spot on!"
              </p>
              <div className="flex items-center gap-2 justify-center mt-3">
                <div className="w-7 h-7 rounded-full bg-[#2BB9B4] flex items-center justify-center text-white text-xs font-bold">
                  I
                </div>
                <div className="text-left">
                  <p className="text-white text-xs font-semibold leading-none">Isuri W.</p>
                  <p className="text-white/45 text-[10px] mt-0.5">Colombo, Sri Lanka</p>
                </div>
              </div>
            </div>

            <button
              onClick={onSwitch}
              className="px-9 py-3 rounded-2xl border-2 border-white/80 text-white text-sm font-bold
                         hover:bg-white hover:text-[#082b29] transition-all active:scale-[0.97]"
            >
              Sign In →
            </button>
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

// ─── Main AuthPage (auth-switch) ──────────────────────────────────────────────
export default function AuthPage({ defaultMode = "signin" }) {
  const navigate = useNavigate();
  const { login, register } = useAuth();

  const [mode, setMode]   = useState(defaultMode);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [signIn, setSignIn]     = useState({ email: "", password: "" });
  const [remember, setRemember] = useState(false);
  const [signInError, setSignInError] = useState("");
  const [showRoleChoice, setShowRoleChoice] = useState(false);

  const [signUp, setSignUp]     = useState({ username: "", email: "", password: "", confirm: "" });
  const [agree, setAgree]       = useState(false);
  const [error, setError]       = useState("");

  const handleSignIn = async (e) => {
    e.preventDefault();
    setSignInError("");
    setLoading(true);
    try {
      const user = await login(signIn.email, signIn.password);
      if (user?.roleId === 3) {
        setShowRoleChoice(true);
      } else {
        navigate("/home");
      }
    } catch (err) {
      const msg = err.message ?? "";
      if (!msg || msg.toLowerCase().includes("load failed") || msg.toLowerCase().includes("failed to fetch") || msg.toLowerCase().includes("network")) {
        setSignInError("Unable to sign in. Please check your connection and try again.");
      } else {
        setSignInError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setError("");
    if (signUp.password.length < 8)        return setError("Password must be at least 8 characters.");
    if (signUp.password !== signUp.confirm) return setError("Passwords do not match.");
    if (!agree)                             return setError("Please accept the terms to continue.");
    setLoading(true);
    try {
      await register(signUp.email, signUp.password, signUp.username);
      navigate("/home");
    } catch (err) {
      setError(err.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const isSignIn = mode === "signin";

  // Overlay spring: when signin → overlay is on the right (translateX 100% of its own width)
  //                 when signup → overlay is on the left  (translateX 0)
  const overlayX = isSignIn ? "100%" : "0%";

  return (
    <>
      {showRoleChoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4 text-center"
          >
            <div className="w-12 h-12 rounded-2xl bg-tenzy-teal flex items-center justify-center mx-auto mb-4 shadow-lg shadow-tenzy-teal/30">
              <Sparkles size={22} className="text-white" />
            </div>
            <h2 className="text-xl font-extrabold text-slate-900 mb-1">Welcome back!</h2>
            <p className="text-slate-500 text-sm mb-6">Your account has admin access. Where would you like to go?</p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => navigate("/admin")}
                className="w-full py-3 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-slate-800 transition active:scale-[0.98]"
              >
                Go to Admin Panel
              </button>
              <button
                onClick={() => navigate("/home")}
                className="w-full py-3 border border-slate-200 text-slate-700 text-sm font-bold rounded-xl hover:bg-slate-50 transition active:scale-[0.98]"
              >
                Continue to Website
              </button>
            </div>
          </motion.div>
        </div>
      )}

      <Navibar />

      {/* Dark gradient behind the navbar so white text stays visible */}
      <div className="fixed top-0 inset-x-0 h-28 bg-linear-to-b from-slate-900/70 to-transparent pointer-events-none z-40" />

      {/* ── Page shell ────────────────────────────────────────────────────── */}
      <div className="min-h-screen flex items-center justify-center px-4 py-10 pt-28
                      bg-gradient-to-br from-[#e4f5f5] via-[#f3eeff] to-[#fff0ea]">

        {/* ── DESKTOP: sliding-overlay card ─────────────────────────────── */}
        <div className="hidden lg:block w-full max-w-5xl">
          <div className="relative flex rounded-[2.5rem] overflow-hidden min-h-[660px]
                          shadow-[0_40px_100px_-20px_rgba(0,0,0,0.2)] border border-white/60">

            {/* Left: Sign-In form (always mounted) */}
            <div className="w-1/2 bg-white flex items-center justify-center py-14">
              <SignInForm
                data={signIn} onChange={setSignIn}
                remember={remember} setRemember={setRemember}
                onSubmit={handleSignIn}
                onForgot={() => setForgotOpen(true)}
                onSwitch={() => setMode("signup")}
                error={signInError}
                loading={loading && mode === "signin"}
              />
            </div>

            {/* Right: Sign-Up form (always mounted) */}
            <div className="w-1/2 bg-white flex items-center justify-center py-14">
              <SignUpForm
                data={signUp} onChange={setSignUp}
                agree={agree} setAgree={setAgree}
                error={error}
                onSubmit={handleSignUp}
                onSwitch={() => setMode("signin")}
                loading={loading && mode === "signup"}
              />
            </div>

            {/* ── Sliding overlay panel ─────────────────────────────────── */}
            <motion.div
              className="absolute top-0 h-full w-1/2 z-20"
              animate={{ x: overlayX }}
              transition={{ type: "spring", stiffness: 230, damping: 32 }}
            >
              {/* Dark teal gradient background */}
              <div className="relative h-full bg-gradient-to-br from-[#072726] via-[#0a3533] to-[#0d4542]
                              flex items-center justify-center overflow-hidden">
                {/* Decorative blobs */}
                <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-[#2BB9B4]/15 blur-3xl pointer-events-none" />
                <div className="absolute -bottom-20 -left-20 w-96 h-96 rounded-full bg-[#E8522A]/10 blur-3xl pointer-events-none" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-60 h-60 rounded-full bg-[#2BB9B4]/8 blur-2xl pointer-events-none" />

                {/* Brand content */}
                <div className="relative z-10">
                  <OverlayContent mode={mode} onSwitch={() => setMode(isSignIn ? "signup" : "signin")} />
                </div>
              </div>
            </motion.div>

          </div>
        </div>

        {/* ── MOBILE: tab switcher + stacked forms ────────────────────────── */}
        <div className="lg:hidden w-full max-w-sm">
          <div className="bg-white rounded-[2rem] overflow-hidden shadow-[0_30px_80px_-20px_rgba(0,0,0,0.18)] border border-white/70">

            {/* Tab toggle */}
            <div className="relative flex bg-gradient-to-r from-[#072726] to-[#0d4542] p-1.5">
              <motion.div
                className="absolute top-1.5 bottom-1.5 bg-[#2BB9B4] rounded-xl"
                style={{ width: "calc(50% - 6px)" }}
                animate={{ x: isSignIn ? 0 : "calc(100% + 12px)" }}
                transition={{ type: "spring", stiffness: 380, damping: 32 }}
              />
              {["signin", "signup"].map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`relative flex-1 py-2.5 text-xs font-bold z-10 rounded-xl transition-colors ${
                    mode === m ? "text-white" : "text-white/50 hover:text-white/80"
                  }`}
                >
                  {m === "signin" ? "Sign In" : "Create Account"}
                </button>
              ))}
            </div>

            {/* Mobile form content */}
            <div className="overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.div
                  key={mode}
                  initial={{ opacity: 0, x: isSignIn ? -20 : 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: isSignIn ? 20 : -20 }}
                  transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
                  className="p-7"
                >
                  {isSignIn ? (
                    <SignInForm
                      data={signIn} onChange={setSignIn}
                      remember={remember} setRemember={setRemember}
                      onSubmit={handleSignIn}
                      onForgot={() => setForgotOpen(true)}
                      onSwitch={() => setMode("signup")}
                      error={signInError}
                      loading={loading && mode === "signin"}
                    />
                  ) : (
                    <SignUpForm
                      data={signUp} onChange={setSignUp}
                      agree={agree} setAgree={setAgree}
                      error={error}
                      onSubmit={handleSignUp}
                      onSwitch={() => setMode("signin")}
                      loading={loading && mode === "signup"}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Mobile bottom strip */}
            <div className="border-t border-slate-100 bg-slate-50 px-7 py-3.5">
              <p className="text-[10px] text-slate-400 text-center">
                🔒 Secure · ✅ Authentic · 🚚 Fast delivery across Sri Lanka
              </p>
            </div>
          </div>
        </div>

      </div>

      <ForgotPasswordModal
        open={forgotOpen}
        onClose={() => setForgotOpen(false)}
        onSubmit={async (email) => {
          await authApi.forgotPassword(email);
        }}
      />
    </>
  );
}
