import React, { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Zap, Gift, Truck } from "lucide-react";
import { assets } from "@/const";

const PromoBanner = () => {
  const [activeSlide, setActiveSlide] = useState(0);
  const [activeAdIndex, setActiveAdIndex] = useState(0);

  const promoSlides = [
    {
      id: 1,
      image: assets.header1,
      title: "Summer Glow Collection",
      discount: "40%",
      desc: "Refresh your skincare routine with premium summer essentials",
    },
    {
      id: 2,
      image: assets.header2,
      title: "Beauty Bundle Deal",
      discount: "35%",
      desc: "Complete skincare sets at unbeatable prices",
    },
    {
      id: 3,
      image: assets.header3,
      title: "Luxury Treatment Set",
      discount: "45%",
      desc: "Professional-grade serums and treatments on sale",
    },
  ];

  const animatedAds = [
    {
      icon: Zap,
      title: "Flash Sale",
      desc: "Limited time offers on top brands",
      color: "#E8522A",
    },
    {
      icon: Gift,
      title: "Free Gift",
      desc: "On orders over Rs.5,000",
      color: "#2BB9B4",
    },
    {
      icon: Truck,
      title: "Fast Delivery",
      desc: "Express shipping across Sri Lanka",
      color: "#E8522A",
    },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % promoSlides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveAdIndex((prev) => (prev + 1) % animatedAds.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const nextSlide = () => setActiveSlide((prev) => (prev + 1) % promoSlides.length);
  const prevSlide = () => setActiveSlide((prev) => (prev - 1 + promoSlides.length) % promoSlides.length);

  const currentAd = animatedAds[activeAdIndex];
  const CurrentIcon = currentAd.icon;

  return (
    <section className="w-full py-12 sm:py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          {/* ── LEFT: Promo Carousel ────────────────────────────────────────── */}
          <div className="relative group">
            {/* Main carousel image */}
            <div className="relative overflow-hidden rounded-2xl aspect-square sm:aspect-video lg:aspect-square">
              <img
                src={promoSlides[activeSlide].image}
                alt={promoSlides[activeSlide].title}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />

              {/* Dark overlay for text readability */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

              {/* Discount badge */}
              <div
                className="absolute top-4 right-4 sm:top-6 sm:right-6 rounded-full w-16 h-16 sm:w-20 sm:h-20 flex flex-col items-center justify-center"
                style={{ background: "#E8522A" }}
              >
                <span className="text-xl sm:text-2xl font-bold text-white">
                  {promoSlides[activeSlide].discount}
                </span>
                <span className="text-[10px] sm:text-xs text-white/90 font-semibold">OFF</span>
              </div>

              {/* Text content */}
              <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 text-white">
                <h3
                  className="text-xl sm:text-2xl lg:text-3xl font-bold mb-2 transition-opacity duration-500"
                  style={{ color: "#FFF9F5" }}
                >
                  {promoSlides[activeSlide].title}
                </h3>
                <p className="text-xs sm:text-sm text-white/80 mb-3">
                  {promoSlides[activeSlide].desc}
                </p>
                <button
                  className="px-4 sm:px-6 py-2 rounded-full font-semibold text-sm transition-all duration-300"
                  style={{
                    background: "#E8522A",
                    color: "white",
                  }}
                  onMouseEnter={(e) => (e.target.style.opacity = "0.9")}
                  onMouseLeave={(e) => (e.target.style.opacity = "1")}
                >
                  Shop Now
                </button>
              </div>

              {/* Nav buttons */}
              <button
                onClick={prevSlide}
                className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full transition-all duration-300 opacity-0 group-hover:opacity-100"
                style={{ background: "rgba(255,255,255,0.9)" }}
                aria-label="Previous slide"
              >
                <ChevronLeft size={20} color="#E8522A" />
              </button>

              <button
                onClick={nextSlide}
                className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full transition-all duration-300 opacity-0 group-hover:opacity-100"
                style={{ background: "rgba(255,255,255,0.9)" }}
                aria-label="Next slide"
              >
                <ChevronRight size={20} color="#E8522A" />
              </button>
            </div>

            {/* Carousel indicators */}
            <div className="flex justify-center gap-2 mt-4">
              {promoSlides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActiveSlide(i)}
                  className="rounded-full transition-all duration-300"
                  style={{
                    width: i === activeSlide ? "28px" : "8px",
                    height: "8px",
                    background: i === activeSlide ? "#E8522A" : "rgba(232,82,42,0.25)",
                  }}
                  aria-label={`Go to slide ${i + 1}`}
                />
              ))}
            </div>
          </div>

          {/* ── RIGHT: Animated Ads ──────────────────────────────────────────── */}
          <div className="flex flex-col justify-center gap-4 sm:gap-6">
            {/* Main animated ad card */}
            <div
              className="relative overflow-hidden rounded-2xl p-6 sm:p-8 lg:p-10 min-h-60 sm:min-h-80 flex flex-col justify-center items-start transition-all duration-500"
              style={{
                background: `linear-gradient(135deg, ${currentAd.color}15 0%, ${currentAd.color}08 100%)`,
                borderLeft: `4px solid ${currentAd.color}`,
              }}
            >
              {/* Animated background elements */}
              <div
                className="absolute -top-12 -right-12 w-40 h-40 rounded-full opacity-20 blur-3xl transition-all duration-700"
                style={{ background: currentAd.color }}
                aria-hidden="true"
              />
              <div
                className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full opacity-15 blur-3xl transition-all duration-700"
                style={{ background: currentAd.color }}
                aria-hidden="true"
              />

              {/* Content */}
              <div className="relative z-10">
                <div
                  className="inline-flex items-center justify-center w-14 h-14 rounded-full mb-4 transition-transform duration-500 hover:scale-110"
                  style={{ background: `${currentAd.color}25` }}
                >
                  <CurrentIcon size={28} color={currentAd.color} />
                </div>

                <h3
                  className="text-2xl sm:text-3xl font-bold mb-2 transition-opacity duration-500"
                  style={{ color: currentAd.color }}
                >
                  {currentAd.title}
                </h3>

                <p className="text-sm sm:text-base text-gray-700 mb-6 max-w-xs">
                  {currentAd.desc}
                </p>

                <button
                  className="px-6 py-2.5 rounded-full font-semibold text-sm transition-all duration-300 hover:shadow-lg"
                  style={{
                    background: currentAd.color,
                    color: "white",
                  }}
                  onMouseEnter={(e) => (e.target.style.transform = "translateY(-2px)")}
                  onMouseLeave={(e) => (e.target.style.transform = "translateY(0)")}
                >
                  Learn More
                </button>
              </div>
            </div>

            {/* Mini ad indicators */}
            <div className="flex gap-3">
              {animatedAds.map((ad, i) => (
                <button
                  key={i}
                  onClick={() => setActiveAdIndex(i)}
                  className="flex-1 p-3 sm:p-4 rounded-xl transition-all duration-300 text-left hover:shadow-md"
                  style={{
                    background: i === activeAdIndex ? `${ad.color}15` : "rgba(0,0,0,0.04)",
                    borderLeft: i === activeAdIndex ? `3px solid ${ad.color}` : "3px solid transparent",
                  }}
                  aria-label={ad.title}
                >
                  <p className="text-xs sm:text-sm font-bold text-gray-900 line-clamp-1">
                    {ad.title}
                  </p>
                  <p className="text-[10px] sm:text-xs text-gray-600 line-clamp-1">
                    {ad.desc}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PromoBanner;
