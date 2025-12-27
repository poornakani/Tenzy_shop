import React, { useState } from "react";
import { assets } from "@/const";

const Navibar = () => {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative w-full z-10">
      <nav className="mx-auto w-full max-w-7xl mt-5 px-4 sm:px-6">
        <div className="flex h-16 items-center justify-between border px-4 rounded-2xl  border-white/15 bg-white/10 backdrop-blur-md">
          {/* Left: Logo */}
          <div className="flex items-center ">
            <img
              src={assets.logo}
              alt="Logo"
              className="h-10 w-auto object-contain"
            />
          </div>

          {/* Center: Links (Desktop only) */}
          <div className="hidden md:flex flex-1 items-center justify-center gap-10">
            {["Home", "Skin", "Face", "Head", "About"].map((item) => (
              <a
                key={item}
                href="#"
                className="text-sm font-medium text-white hover:opacity-70"
              >
                {item}
              </a>
            ))}
          </div>

          {/* Right: Icons (always visible) */}
          <div className="flex items-center gap-4">
            <button className="hidden md:block p-2" aria-label="Search">
              <img src={assets.search} className="h-6 w-6" alt="Search" />
            </button>

            <button className="p-2" aria-label="Wishlist">
              <img src={assets.heart} className="h-6 w-6" alt="Wishlist" />
            </button>

            <button className="p-2" aria-label="Cart">
              <img src={assets.cart} className="h-6 w-6" alt="Cart" />
            </button>

            <button className="p-2" aria-label="Account">
              <img src={assets.man} className="h-6 w-6" alt="Account" />
            </button>
          </div>

          {/* Hamburger (Mobile only) */}
          <button
            className="md:hidden p-2"
            onClick={() => setOpen((v) => !v)}
            aria-label="Menu"
          >
            <span className="block h-0.5 w-6 bg-black mb-1" />
            <span className="block h-0.5 w-6 bg-black mb-1" />
            <span className="block h-0.5 w-6 bg-black" />
          </button>
        </div>
      </nav>
      {/* Full screen Mobile Menu */}
      {open && (
        <div className="fixed inset-0 z-50 md:hidden bg-black/70">
          {/* Panel */}
          <div className="relative h-full w-full bg-amber-200 px-6 py-6">
            {/* Close button (top-right, not affected by centering) */}
            <button
              type="button"
              className="absolute top-4 right-4 p-2 text-black text-2xl"
              aria-label="Close menu"
              onClick={() => setOpen(false)}
            >
              ✕
            </button>

            {/* Content wrapper */}
            <div className="h-full flex flex-col">
              {/* Title row (optional) */}
              <div className="pt-2">
                <p className="text-lg font-semibold text-black">Menu</p>
              </div>

              {/* Centered links */}
              <div className="flex-1 flex flex-col items-center justify-center gap-6">
                {["Home", "Skin", "Face", "Head", "About"].map((item) => (
                  <a
                    key={item}
                    href="#"
                    className="text-base font-medium text-black"
                    onClick={() => setOpen(false)}
                  >
                    {item}
                  </a>
                ))}

                {/* Search inside menu */}
                <button
                  type="button"
                  className="mt-2 flex items-center gap-3"
                  aria-label="Search"
                >
                  <img src={assets.search} className="h-6 w-6" alt="Search" />
                  <span className="text-black font-medium">Search</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Navibar;
