import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "../Components/AuthLayout";
import AuthTextField from "../Components/AuthTextField";
import SocialAuthButtons from "../Components/SocialAuthButtons";
import ForgotPasswordModal from "../Components/ForgotPasswordModal";
import Navibar from "@/HomePage/Navibar";
import { authApi } from "@/services/api";

function RoleChoiceModal({ onAdmin, onWebsite }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-sm w-full mx-4 text-center">
        <h2 className="text-xl font-bold text-slate-900 mb-2">Welcome back!</h2>
        <p className="text-slate-500 text-sm mb-6">
          Your account has admin access. Where would you like to go?
        </p>
        <div className="flex flex-col gap-3">
          <button
            onClick={onAdmin}
            className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 transition"
          >
            Go to Admin Panel
          </button>
          <button
            onClick={onWebsite}
            className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            Continue to Website
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SignInPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState({ email: "", password: "" });
  const [remember, setRemember] = useState(true);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showRoleChoice, setShowRoleChoice] = useState(false);

  const onEmailPasswordSignIn = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await authApi.login(form.email, form.password);

      // Store auth token
      if (data?.token) {
        localStorage.setItem("authToken", data.token);
      }

      // Store user info
      if (data) {
        localStorage.setItem("userRole", data.userRole ?? "");
        localStorage.setItem("userEmail", data.email ?? form.email);
      }

      if (data?.userRole === 3) {
        // Admin user — ask where to go
        setShowRoleChoice(true);
      } else {
        navigate("/");
      }
    } catch (err) {
      setError(err.message || "Sign in failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const onGoogle = async () => {
    console.log("Google sign-in");
    navigate("/");
  };

  const onFacebook = async () => {
    console.log("Facebook sign-in");
    navigate("/");
  };

  const onForgotSubmit = async (email) => {
    await authApi.forgotPassword(email);
  };

  return (
    <>
      <Navibar />
      <div className="h-24 bg-linear-to-b from-slate-900 to-transparent" />

      {showRoleChoice && (
        <RoleChoiceModal
          onAdmin={() => {
            localStorage.setItem("adminAuth", "true");
            navigate("/admin");
          }}
          onWebsite={() => navigate("/")}
        />
      )}

      <AuthLayout
        title="Sign in"
        subtitle="Welcome back. Let's continue your skincare journey."
        rightImageUrl="https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?q=80&w=1400&auto=format&fit=crop"
      >
        <SocialAuthButtons onGoogle={onGoogle} onFacebook={onFacebook} />

        <div className="my-6 flex items-center gap-3">
          <div className="h-px w-full bg-black/5" />
          <span className="text-xs font-semibold text-slate-500">or</span>
          <div className="h-px w-full bg-black/5" />
        </div>

        <form onSubmit={onEmailPasswordSignIn} className="space-y-4">
          <AuthTextField
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
            placeholder="you@example.com"
            required
            autoComplete="email"
          />

          <AuthTextField
            label="Password"
            type="password"
            value={form.password}
            onChange={(e) =>
              setForm((p) => ({ ...p, password: e.target.value }))
            }
            placeholder="••••••••"
            required
            autoComplete="current-password"
          />

          {error && (
            <p className="text-sm text-red-500 text-center">{error}</p>
          )}

          <div className="flex items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300"
              />
              Remember me
            </label>

            <button
              type="button"
              onClick={() => setForgotOpen(true)}
              className="text-sm font-semibold text-[#0b5351] hover:underline"
            >
              Forgot password?
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 transition disabled:opacity-60"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>

          <p className="text-sm text-slate-600 text-center">
            Don't have an account?{" "}
            <Link
              to="/register"
              className="font-semibold text-[#0b5351] hover:underline"
            >
              Create one
            </Link>
          </p>
        </form>

        <ForgotPasswordModal
          open={forgotOpen}
          onClose={() => setForgotOpen(false)}
          onSubmit={onForgotSubmit}
        />
      </AuthLayout>
    </>
  );
}
