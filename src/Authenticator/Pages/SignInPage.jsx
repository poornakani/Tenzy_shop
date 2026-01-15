import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";
import AuthTextField from "../components/AuthTextField";
import SocialAuthButtons from "../components/SocialAuthButtons";
import ForgotPasswordModal from "../components/ForgotPasswordModal";
import Navibar from "@/HomePage/Navibar";

export default function SignInPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState({ email: "", password: "" });
  const [remember, setRemember] = useState(true);
  const [forgotOpen, setForgotOpen] = useState(false);

  const onEmailPasswordSignIn = async (e) => {
    e.preventDefault();

    // TODO: connect to backend or Firebase
    console.log("Sign in:", form, { remember });

    // Example: navigate after success
    navigate("/");
  };

  const onGoogle = async () => {
    // TODO: connect to Google auth (Firebase / backend OAuth)
    console.log("Google sign-in");
    navigate("/");
  };

  const onFacebook = async () => {
    // TODO: connect to Facebook auth
    console.log("Facebook sign-in");
    navigate("/");
  };

  const onForgotSubmit = async (email) => {
    // TODO: call your reset password endpoint
    console.log("Reset password for:", email);
  };

  return (
    <>
      <Navibar />
      <div className="h-24 bg-linear-to-b from-slate-900 to-transparent" />
      <AuthLayout
        title="Sign in"
        subtitle="Welcome back. Let’s continue your skincare journey."
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
            className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 transition"
          >
            Sign in
          </button>

          <p className="text-sm text-slate-600 text-center">
            Don’t have an account?{" "}
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
