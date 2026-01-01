import React, { useEffect, useRef, useState } from "react";
import { assets } from "@/const";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import ProductSearchDropdown from "@/Widgets/ProductSearchDropdown";
import { useWishlist } from "@/context/WishlistContext";
import { useNavigate, Link } from "react-router-dom";
import { SellingProducts } from "@/ProductsJson";

gsap.registerPlugin(ScrollTrigger);

const Navibar = () => {
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { wishlistCount } = useWishlist();
  const navigate = useNavigate();

  // refs for gsap color change only
  const navInnerRef = useRef(null);

  // keep your existing look as "normal"
  const NORMAL_BG = "rgba(255,255,255,0.10)"; // bg-white/10
  const NORMAL_BORDER = "rgba(255,255,255,0.15)"; // border-white/15

  // change only while scrolling (more visible)
  const SCROLL_BG = "rgba(17,24,39,0.88)";
  const SCROLL_BORDER = "rgba(255,255,255,0.22)";

  useEffect(() => {
    if (!navInnerRef.current) return;

    // iOS Safari stability tweaks
    gsap.set(navInnerRef.current, {
      backgroundColor: NORMAL_BG,
      borderColor: NORMAL_BORDER,
      willChange: "background-color, border-color, transform",
      force3D: true,
    });

    // Trigger only when scrolling away from top
    const st = ScrollTrigger.create({
      trigger: document.documentElement,
      start: "top top-=1", // once you scroll 1px
      end: 999999,

      onEnter: () => {
        gsap.to(navInnerRef.current, {
          backgroundColor: SCROLL_BG,
          borderColor: SCROLL_BORDER,
          duration: 0.18,
          overwrite: "auto",
        });
      },

      onLeaveBack: () => {
        gsap.to(navInnerRef.current, {
          backgroundColor: NORMAL_BG,
          borderColor: NORMAL_BORDER,
          duration: 0.18,
          overwrite: "auto",
        });
      },
    });

    return () => st.kill();
  }, []);

  return (
    // ✅ fixed on top when scrolling
    <div className="fixed top-0 left-0 w-full z-50">
      <nav className="mx-auto w-full max-w-7xl mt-5 px-4 sm:px-6">
        <div
          ref={navInnerRef}
          className="flex h-16 items-center justify-between border px-4 rounded-2xl  border-white/15 bg-white/10 backdrop-blur-md"
        >
          {/* Left: Logo */}
          <Link to="/home">
            <div className="flex items-center cursor-pointer">
              <img
                src={assets.logo}
                alt="Logo"
                className="h-10 w-auto object-contain"
              />
            </div>
          </Link>

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
            <div className="relative">
              <button
                className="hidden md:block p-2"
                aria-label="Search"
                onClick={() => setSearchOpen((v) => !v)}
              >
                <img src={assets.search} className="h-6 w-6" alt="Search" />
              </button>

              {searchOpen && (
                <ProductSearchDropdown
                  products={SellingProducts}
                  onClose={() => setSearchOpen(false)}
                />
              )}
            </div>

            <button
              className="p-2 relative"
              aria-label="Wishlist"
              onClick={() => navigate("/wishlist")}
            >
              <img src={assets.heart} className="h-6 w-6" alt="Wishlist" />
              {wishlistCount > 0 && (
                <span
                  className="absolute -top-1 -right-1 min-w-[18px] h-[18px]
                 rounded-full bg-red-600 text-white text-[10px]
                 flex items-center justify-center font-semibold"
                >
                  {wishlistCount}
                </span>
              )}
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
