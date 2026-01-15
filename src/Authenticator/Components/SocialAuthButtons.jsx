import React from "react";

export default function SocialAuthButtons({ onGoogle, onFacebook }) {
  return (
    <div className="grid gap-3">
      {/* Google */}
      <button
        type="button"
        onClick={onGoogle}
        className="w-full flex items-center justify-center gap-3
                   rounded-2xl border border-slate-200 bg-white px-4 py-3
                   text-sm font-semibold text-slate-800
                   shadow-sm shadow-black/5
                   hover:bg-slate-50 hover:shadow-md
                   active:scale-[0.99]
                   transition"
      >
        {/* Google logo */}
        <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden="true">
          <path
            fill="#EA4335"
            d="M24 9.5c3.3 0 6.3 1.2 8.6 3.4l6.4-6.4C34.9 2.3 29.8 0 24 0 14.6 0 6.5 5.4 2.6 13.3l7.6 5.9C12 13.4 17.6 9.5 24 9.5z"
          />
          <path
            fill="#4285F4"
            d="M46.1 24.5c0-1.6-.1-2.8-.4-4H24v7.6h12.5c-.6 3-2.4 5.5-5.1 7.2l7.8 6c4.6-4.2 7.3-10.4 7.3-16.8z"
          />
          <path
            fill="#FBBC05"
            d="M10.2 28.9c-1.2-3-.1-6.4 2.4-8.3l-7.6-5.9C.8 19.1 0 21.5 0 24s.8 4.9 2.3 7.1l7.9-6.2z"
          />
          <path
            fill="#34A853"
            d="M24 48c6.5 0 11.9-2.1 15.9-5.7l-7.8-6c-2.2 1.5-5.1 2.4-8.1 2.4-6.3 0-11.7-4.2-13.6-9.8l-7.9 6.2C6.4 42.6 14.6 48 24 48z"
          />
        </svg>
        Continue with Google
      </button>

      {/* Facebook */}
      <button
        type="button"
        onClick={onFacebook}
        className="w-full flex items-center justify-center gap-3
                   rounded-2xl bg-[#1877F2] px-4 py-3
                   text-sm font-semibold text-white
                   shadow-sm shadow-black/10
                   hover:bg-[#166fe5] hover:shadow-md
                   active:scale-[0.99]
                   transition"
      >
        {/* Facebook logo */}
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5 fill-white"
          aria-hidden="true"
        >
          <path d="M22.675 0h-21.35C.597 0 0 .597 0 1.326v21.348C0 23.403.597 24 1.326 24h11.495v-9.294H9.691V11.01h3.13V8.309c0-3.1 1.894-4.788 4.659-4.788 1.325 0 2.463.099 2.795.143v3.24h-1.918c-1.504 0-1.796.715-1.796 1.763v2.313h3.587l-.467 3.696h-3.12V24h6.116C23.403 24 24 23.403 24 22.674V1.326C24 .597 23.403 0 22.675 0z" />
        </svg>
        Continue with Facebook
      </button>
    </div>
  );
}
