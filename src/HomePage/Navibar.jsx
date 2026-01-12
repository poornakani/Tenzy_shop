import React, { useEffect, useRef, useState } from "react";
import { assets } from "@/const";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import ProductSearchDropdown from "@/Widgets/ProductSearchDropdown";
import { useWishlist } from "@/context/WishlistContext";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { SellingProducts, concerns } from "@/ProductsJson";
import MobileProductSearchDropdown from "@/Widgets/MobileProductSearchDropdown";
import { useCart } from "@/Context/CartContext";

gsap.registerPlugin(ScrollTrigger);

const Navibar = () => {
  const [open, setOpen] = useState(false);
  const { cartCount } = useCart();

  // Separate states so mobile search doesn't open desktop dropdown behind
  const [desktopSearchOpen, setDesktopSearchOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  const [concernOpen, setConcernOpen] = useState(false);
  const [mobileQuery, setMobileQuery] = useState("");

  const { wishlistCount } = useWishlist();
  const navigate = useNavigate();
  const location = useLocation();

  const navInnerRef = useRef(null);
  const concernBtnRef = useRef(null);
  const concernMenuRef = useRef(null);

  // Highlight selected concern from URL (?concern=aging)
  const sp = new URLSearchParams(location.search);
  const selectedConcernId = sp.get("concernID") || sp.get("concern");
  const selectedConcernInt = selectedConcernId
    ? Number(selectedConcernId)
    : null;

  // keep your glass look at top
  const NORMAL_BG = "rgba(255,255,255,0.10)";
  const NORMAL_BORDER = "rgba(255,255,255,0.15)";
  // on scroll make it more readable (dark glass)
  const SCROLL_BG = "rgba(17,24,39,0.88)";
  const SCROLL_BORDER = "rgba(255,255,255,0.22)";

  // Navbar bg change on scroll
  useEffect(() => {
    if (!navInnerRef.current) return;

    gsap.set(navInnerRef.current, {
      backgroundColor: NORMAL_BG,
      borderColor: NORMAL_BORDER,
      willChange: "background-color, border-color, transform",
      force3D: true,
    });

    const st = ScrollTrigger.create({
      trigger: document.documentElement,
      start: "top top-=1",
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

  // close concern dropdown when clicking outside
  useEffect(() => {
    const onDown = (e) => {
      if (!concernOpen) return;
      const btn = concernBtnRef.current;
      const menu = concernMenuRef.current;
      if (!btn || !menu) return;

      if (!btn.contains(e.target) && !menu.contains(e.target)) {
        setConcernOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [concernOpen]);

  //  When mobile menu opens/closes, ensure desktop dropdown never renders behind it
  useEffect(() => {
    if (open) {
      setDesktopSearchOpen(false);
      setMobileSearchOpen(false);
      setMobileQuery("");
    }
  }, [open]);

  const goConcern = (id) => {
    setConcernOpen(false);
    setOpen(false);
    if (id === 1) {
      navigate("/products");
      return;
    }
    navigate(`/products?concernID=${encodeURIComponent(id)}`);
  };

  const concernLabel =
    concerns.find((c) => c.concernID === selectedConcernInt)?.concernType ||
    "Concerns";

  const isConcernActive = Boolean(selectedConcernId);

  return (
    <div className="fixed top-0 left-0 w-full z-50">
      <nav className="mx-auto w-full max-w-7xl mt-5 px-4 sm:px-6">
        <div
          ref={navInnerRef}
          className="flex h-16 items-center justify-between border px-4 rounded-2xl border-white/15 bg-white/10 backdrop-blur-md"
        >
          {/* Left: Logo */}
          <Link
            to="/home"
            className="flex items-center"
            onClick={() => {
              setOpen(false);
              setConcernOpen(false);
              setDesktopSearchOpen(false);
              setMobileSearchOpen(false);
            }}
          >
            <img
              src={assets.logo}
              alt="Logo"
              className="h-10 w-auto object-contain"
            />
          </Link>

          {/* Center: Links (Desktop only) */}
          <div className="hidden md:flex flex-1 items-center justify-center gap-8">
            <Link
              to="/products"
              className="text-sm font-medium text-white hover:opacity-80"
            >
              Shop Now
            </Link>

            {/* Concerns dropdown */}
            <div className="relative">
              <button
                ref={concernBtnRef}
                type="button"
                onClick={() => setConcernOpen((v) => !v)}
                className={[
                  "text-sm font-medium text-white hover:opacity-80",
                  "flex items-center gap-2",
                  isConcernActive
                    ? "px-3 py-1 rounded-full bg-white/15 border border-white/20"
                    : "",
                ].join(" ")}
              >
                {concernLabel}
                <span
                  className={[
                    "transition-transform duration-200",
                    concernOpen ? "rotate-180" : "rotate-0",
                  ].join(" ")}
                >
                  ▾
                </span>
              </button>

              {concernOpen && (
                <div
                  ref={concernMenuRef}
                  className="absolute left-1/2 -translate-x-1/2 mt-3 w-64 rounded-2xl border border-white/20 bg-black/95 backdrop-blur-xl shadow-2xl overflow-hidden"
                >
                  <div className="p-2">
                    {concerns.map((c) => {
                      const active = c.concernID === selectedConcernInt;
                      return (
                        <button
                          key={c.concernID}
                          type="button"
                          onClick={() => goConcern(c.concernID)}
                          className={[
                            "w-full text-left px-3 py-2 rounded-xl text-sm",
                            "transition",
                            active
                              ? "bg-white/20 text-white border border-white/25"
                              : "text-white/90 hover:bg-white/10",
                          ].join(" ")}
                        >
                          {c.concernType}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <Link
              to="/new-arrivals"
              className="text-sm font-medium text-white hover:opacity-80"
            >
              New Arrivals
            </Link>

            <Link
              to="/beauty-tips"
              className="text-sm font-medium text-white hover:opacity-80"
            >
              Beauty Tips
            </Link>

            <Link
              to="/contact"
              className="text-sm font-medium text-white hover:opacity-80"
            >
              Contact Us
            </Link>
          </div>

          {/* Right: Icons */}
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="relative">
              <button
                className="hidden md:block p-2"
                aria-label="Search"
                onClick={() => {
                  setMobileSearchOpen(false);
                  setDesktopSearchOpen((v) => !v);
                }}
              >
                <img src={assets.search} className="h-6 w-6" alt="Search" />
              </button>

              {desktopSearchOpen && (
                <ProductSearchDropdown
                  products={SellingProducts}
                  onClose={() => setDesktopSearchOpen(false)}
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

            <button
              className="p-2 relative"
              aria-label="Cart"
              onClick={() => navigate("/cart")}
            >
              <img src={assets.cart} className="h-6 w-6" alt="Cart" />

              {cartCount > 0 && (
                <span
                  className="absolute -top-1 -right-1 min-w-[18px] h-[18px]
      rounded-full bg-amber-500 text-white text-[10px]
      flex items-center justify-center font-semibold"
                >
                  {cartCount}
                </span>
              )}
            </button>

            <button className="p-2" aria-label="Account">
              <img src={assets.man} className="h-6 w-6" alt="Account" />
            </button>

            {/* Hamburger (Mobile only) */}
            <button
              className="md:hidden p-2"
              onClick={() => setOpen((v) => !v)}
              aria-label="Menu"
            >
              <span className="block h-0.5 w-6 bg-white mb-1" />
              <span className="block h-0.5 w-6 bg-white mb-1" />
              <span className="block h-0.5 w-6 bg-white" />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile full screen menu */}
      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-linear-to-b from-[#0f172a]/70 via-[#111827]/75 to-[#1f2933]/80"
            onClick={() => setOpen(false)}
          />

          {/* Panel */}
          <div className="absolute inset-0 flex justify-center items-start">
            <div className="relative mt-6 w-[92%] max-w-md rounded-3xl overflow-hidden shadow-2xl border border-white/15">
              <div className="absolute inset-0 bg-linear-to-b from-[#2b2f38] via-[#1f2933] to-[#111827]" />
              <div className="absolute -top-24 -left-24 h-56 w-56 rounded-full bg-[#ff7a18]/10 blur-3xl" />
              <div className="absolute -bottom-24 -right-24 h-56 w-56 rounded-full bg-[#14b8a6]/10 blur-3xl" />

              {/* Content */}
              <div className="relative px-6 py-6 text-white">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <p className="text-lg font-semibold">Menu</p>

                  <button
                    type="button"
                    className="p-2 rounded-xl hover:bg-white/10 transition"
                    aria-label="Close menu"
                    onClick={() => setOpen(false)}
                  >
                    ✕
                  </button>
                </div>

                {/* Mobile Search */}
                <div className="mt-4">
                  {/* Input row */}
                  <div className="flex items-center gap-3">
                    <div className="relative w-full">
                      <input
                        value={mobileQuery}
                        onChange={(e) => {
                          setMobileQuery(e.target.value);
                          if (!mobileSearchOpen) setMobileSearchOpen(true);
                        }}
                        onFocus={() => setMobileSearchOpen(true)}
                        placeholder="Search products..."
                        className="w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-3 pr-12 text-sm text-white placeholder:text-white/50 outline-none"
                      />

                      <button
                        type="button"
                        aria-label="Search"
                        onClick={() => setMobileSearchOpen(true)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-xl hover:bg-white/10 transition"
                      >
                        <img
                          src={assets.search}
                          className="h-5 w-5"
                          alt="Search"
                        />
                      </button>
                    </div>

                    {mobileSearchOpen && (
                      <button
                        type="button"
                        onClick={() => {
                          setMobileSearchOpen(false);
                          setMobileQuery("");
                        }}
                        className="shrink-0 px-3 py-3 rounded-2xl border border-white/15 bg-white/10 hover:bg-white/15 transition text-sm text-white"
                        aria-label="Close search"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {mobileSearchOpen && (
                    <div className="mt-3">
                      <MobileProductSearchDropdown
                        products={SellingProducts}
                        query={mobileQuery}
                        open={mobileSearchOpen}
                        onClose={() => setMobileSearchOpen(false)}
                        onSelect={() => {
                          setMobileSearchOpen(false);
                          setOpen(false);
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* Links */}
                <div className="mt-6 flex flex-col gap-2">
                  <Link
                    to="/products"
                    className="rounded-2xl px-4 py-3 bg-white/10 hover:bg-white/15 transition"
                    onClick={() => setOpen(false)}
                  >
                    Shop Now
                  </Link>

                  <details className="group rounded-2xl border border-white/15 bg-white/10 overflow-hidden">
                    <summary className="cursor-pointer list-none px-4 py-3 flex items-center justify-between hover:bg-white/15 transition">
                      <span className="text-sm font-semibold">Concerns</span>
                      <span className="transition group-open:rotate-180">
                        ▾
                      </span>
                    </summary>

                    <div className="px-3 pb-3 pt-2">
                      <div className="grid grid-cols-1 gap-2">
                        {concerns.map((c) => {
                          const active = c.concernID === selectedConcernInt;
                          return (
                            <button
                              key={c.concernID}
                              type="button"
                              onClick={() => {
                                goConcern(c.concernID);
                                setOpen(false);
                              }}
                              className={[
                                "text-left px-4 py-3 rounded-xl border transition",
                                active
                                  ? "bg-white/15 text-white border-white/25"
                                  : "bg-transparent text-white/90 border-white/10 hover:bg-white/10",
                              ].join(" ")}
                            >
                              {c.concernType}
                              {c.category ? (
                                <span className="ml-2 text-xs text-white/50">
                                  • {c.category}
                                </span>
                              ) : null}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </details>

                  <Link
                    to="/best-sellers"
                    className="rounded-2xl px-4 py-3 bg-white/10 hover:bg-white/15 transition"
                    onClick={() => setOpen(false)}
                  >
                    Best Sellers
                  </Link>

                  <Link
                    to="/new-arrivals"
                    className="rounded-2xl px-4 py-3 bg-white/10 hover:bg-white/15 transition"
                    onClick={() => setOpen(false)}
                  >
                    New Arrivals
                  </Link>

                  <Link
                    to="/beauty-tips"
                    className="rounded-2xl px-4 py-3 bg-white/10 hover:bg-white/15 transition"
                    onClick={() => setOpen(false)}
                  >
                    Beauty Tips
                  </Link>

                  <Link
                    to="/contact"
                    className="rounded-2xl px-4 py-3 bg-white/10 hover:bg-white/15 transition"
                    onClick={() => setOpen(false)}
                  >
                    Contact Us
                  </Link>
                </div>

                {/* Footer */}
                <div className="mt-6 pt-4 text-xs text-white/50 text-center">
                  Velvet Pour • Tenzy Shop
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Navibar;
