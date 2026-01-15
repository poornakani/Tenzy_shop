import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";
import AuthTextField from "../components/AuthTextField";
import SocialAuthButtons from "../components/SocialAuthButtons";

export default function RegisterPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [agree, setAgree] = useState(true);
  const [error, setError] = useState("");

  const onRegister = async (e) => {
    e.preventDefault();
    setError("");

    if (form.password.length < 6) {
      setError("Password should be at least 6 characters.");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (!agree) {
      setError("Please agree to the terms to continue.");
      return;
    }

    // TODO: connect to backend or Firebase createUser
    console.log("Register:", form);

    navigate("/");
  };

  const onGoogle = async () => {
    console.log("Google register");
    navigate("/");
  };

  const onFacebook = async () => {
    console.log("Facebook register");
    navigate("/");
  };

  return (
    <AuthLayout
      title="Create account"
      subtitle="Join Tenzy to save your favourites and track orders."
      rightImageUrl="https://images.unsplash.com/photo-1526045478516-99145907023c?q=80&w=1400&auto=format&fit=crop"
    >
      <SocialAuthButtons onGoogle={onGoogle} onFacebook={onFacebook} />

      <div className="my-6 flex items-center gap-3">
        <div className="h-px w-full bg-black/5" />
        <span className="text-xs font-semibold text-slate-500">or</span>
        <div className="h-px w-full bg-black/5" />
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <form onSubmit={onRegister} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <AuthTextField
            label="First name"
            value={form.firstName}
            onChange={(e) =>
              setForm((p) => ({ ...p, firstName: e.target.value }))
            }
            placeholder="Diduni"
            required
            autoComplete="given-name"
          />
          <AuthTextField
            label="Last name"
            value={form.lastName}
            onChange={(e) =>
              setForm((p) => ({ ...p, lastName: e.target.value }))
            }
            placeholder="Weerasinghe"
            required
            autoComplete="family-name"
          />
        </div>

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
          onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
          placeholder="Create a strong password"
          required
          autoComplete="new-password"
        />

        <AuthTextField
          label="Confirm password"
          type="password"
          value={form.confirmPassword}
          onChange={(e) =>
            setForm((p) => ({ ...p, confirmPassword: e.target.value }))
          }
          placeholder="Repeat password"
          required
          autoComplete="new-password"
        />

        <label className="flex items-start gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={agree}
            onChange={(e) => setAgree(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-slate-300"
          />
          <span>
            I agree to the{" "}
            <Link
              to="/terms"
              className="font-semibold text-[#0b5351] hover:underline"
            >
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link
              to="/privacy"
              className="font-semibold text-[#0b5351] hover:underline"
            >
              Privacy Policy
            </Link>
            .
          </span>
        </label>

        <button
          type="submit"
          className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 transition"
        >
          Create account
        </button>

        <p className="text-sm text-slate-600 text-center">
          Already have an account?{" "}
          <Link
            to="/signin"
            className="font-semibold text-[#0b5351] hover:underline"
          >
            Sign in
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
