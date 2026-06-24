import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { assets } from "@/const";

// CSS Animations for different hero images
const ANIMATION_STYLES = `
  @keyframes zoomInOut {
    0% { transform: scale(1); }
    25% { transform: scale(1.02); }
    50% { transform: scale(1.03); }
    75% { transform: scale(1.02); }
    100% { transform: scale(1); }
  }

  @keyframes slideRight {
    0% { transform: translateX(-20px); }
    25% { transform: translateX(-10px); }
    50% { transform: translateX(5px); }
    75% { transform: translateX(-5px); }
    100% { transform: translateX(0); }
  }

  @keyframes rotateScale {
    0% { transform: scale(1) rotate(0deg); }
    25% { transform: scale(1.01) rotate(0.5deg); }
    50% { transform: scale(1.02) rotate(1deg); }
    75% { transform: scale(1.01) rotate(0.5deg); }
    100% { transform: scale(1) rotate(0deg); }
  }

  @keyframes panUp {
    0% { transform: translateY(15px); }
    25% { transform: translateY(5px); }
    50% { transform: translateY(-5px); }
    75% { transform: translateY(2px); }
    100% { transform: translateY(0); }
  }

  .hero-image-1 { animation: zoomInOut 12s cubic-bezier(0.4, 0.0, 0.2, 1) infinite; }
  .hero-image-2 { animation: slideRight 12s cubic-bezier(0.4, 0.0, 0.2, 1) infinite; }
  .hero-image-3 { animation: rotateScale 12s cubic-bezier(0.4, 0.0, 0.2, 1) infinite; }
  .hero-image-4 { animation: panUp 12s cubic-bezier(0.4, 0.0, 0.2, 1) infinite; }
`;

const getAnimationClass = (index) => {
  const classes = ["hero-image-1", "hero-image-2", "hero-image-3", "hero-image-4"];
  return classes[index] || classes[0];
};

const ModernHero = () => {
  const navigate = useNavigate();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Hero slides with images and content
  const heroSlides = [
    {
      image: "/images/HeroSecImages/hero1.png",
      eyebrow: "Premium Collection",
      heading: "Discover Your",
      headingGradient: "Beauty",
      subheading: "Essence",
      description: "Premium beauty products from 50+ trusted global brands. Curated for your unique beauty journey.",
      primaryBtnText: "Shop All",
      primaryBtnColor: "#E8522A",
      primaryBtnHover: "#d43f1f",
      secondaryBtnColor: "rgba(255, 255, 255, 0.2)",
      secondaryBtnBorder: "white",
      accentColor: "#E8522A",
    },
    {
      image: "/images/HeroSecImages/hero2.png",
      eyebrow: "Skincare Edit",
      heading: "Radiant",
      headingGradient: "Skin",
      subheading: "Awaits",
      description: "Glow naturally with premium ingredients and expert-curated skincare routines.",
      primaryBtnText: "Explore Skincare",
      primaryBtnColor: "#2BB9B4",
      primaryBtnHover: "#219590",
      secondaryBtnColor: "rgba(255, 255, 255, 0.2)",
      secondaryBtnBorder: "white",
      accentColor: "#2BB9B4",
    },
    {
      image: "/images/HeroSecImages/hero3.png",
      eyebrow: "Treatment Focus",
      heading: "Nourish &",
      headingGradient: "Restore",
      subheading: "Your Glow",
      description: "Professional-grade serums and treatments for transformative beauty results.",
      primaryBtnText: "View Treatments",
      primaryBtnColor: "#E8522A",
      primaryBtnHover: "#d43f1f",
      secondaryBtnColor: "rgba(255, 255, 255, 0.2)",
      secondaryBtnBorder: "white",
      accentColor: "#E8522A",
    },
    {
      image: "/images/HeroSecImages/hero4.png",
      eyebrow: "Daily Essentials",
      heading: "Simple",
      headingGradient: "Routine",
      subheading: "Maximum Results",
      description: "Build your perfect daily routine with essentials that deliver extraordinary results.",
      primaryBtnText: "Start Routine",
      primaryBtnColor: "#2BB9B4",
      primaryBtnHover: "#219590",
      secondaryBtnColor: "rgba(255, 255, 255, 0.2)",
      secondaryBtnBorder: "white",
      accentColor: "#2BB9B4",
    },
  ];

  const currentSlide = heroSlides[currentImageIndex];
  const nextImageIndex = (currentImageIndex + 1) % heroSlides.length;
  const nextSlide = heroSlides[nextImageIndex];

  // Auto-change images every 6 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentImageIndex((prev) => (prev + 1) % heroSlides.length);
      }, 700);
      setTimeout(() => {
        setIsTransitioning(false);
      }, 700);
    }, 6000);
    return () => clearInterval(interval);
  }, [heroSlides.length]);

  return (
    <section className="relative w-full h-screen overflow-hidden">
      {/* Inject animation styles */}
      <style>{ANIMATION_STYLES}</style>

      {/* Background Images with Fade Animation */}
      <div className="absolute inset-0">
        {/* Current Image */}
        <img
          key={`current-${currentImageIndex}`}
          src={currentSlide.image}
          alt="Hero"
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${getAnimationClass(currentImageIndex)}`}
          style={{
            opacity: isTransitioning ? 0 : 1,
            transformOrigin: "center",
          }}
        />

        {/* Next Image (pre-loaded for smooth transition) */}
        <img
          key={`next-${nextImageIndex}`}
          src={nextSlide.image}
          alt="Hero Next"
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${getAnimationClass(nextImageIndex)}`}
          style={{
            opacity: isTransitioning ? 1 : 0,
            transformOrigin: "center",
          }}
        />

        {/* Dark Overlay */}
        <div className="absolute inset-0 bg-black/35" />
      </div>

      {/* Content Container - Full Width */}
      <div className="relative z-10 h-full w-full flex items-center">
        {/* Left Sidebar - Full Width on Mobile, Half on Desktop */}
        <div className="w-full lg:w-1/2 px-6 sm:px-8 md:px-12 lg:px-16 py-12 sm:py-16 md:py-20 flex flex-col justify-center">
          {/* Logo */}
          <div className="mb-6 sm:mb-8">
            <img
              src={assets.logo}
              alt="Tenzy Logo"
              className="h-12 sm:h-14 md:h-16 w-auto"
            />
          </div>

          {/* Eyebrow */}
          <div className="mb-4 sm:mb-6">
            <span
              className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[10px] sm:text-xs font-bold uppercase tracking-widest text-white"
              style={{
                background: `${currentSlide.accentColor}30`,
                border: `1px solid ${currentSlide.accentColor}50`,
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: currentSlide.accentColor }}
              />
              {currentSlide.eyebrow}
            </span>
          </div>

          {/* Heading and Description */}
          <div className="mb-8 sm:mb-10 md:mb-12">
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-tight mb-2">
              {currentSlide.heading}
              <br />
              <span style={{ color: currentSlide.accentColor }}>
                {currentSlide.headingGradient}
              </span>
              <br />
              {currentSlide.subheading}
            </h1>

            <p className="text-sm sm:text-base md:text-lg text-gray-100 max-w-md leading-relaxed mt-6">
              {currentSlide.description}
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
            {/* Primary Button */}
            <button
              onClick={() => navigate("/products")}
              className="px-8 sm:px-10 py-3 sm:py-4 rounded-full font-bold text-sm sm:text-base transition-all duration-300 hover:scale-105 active:scale-95"
              style={{
                background: currentSlide.primaryBtnColor,
                color: "white",
                boxShadow: `0 8px 24px ${currentSlide.primaryBtnColor}45`,
              }}
              onMouseEnter={(e) => (e.target.style.background = currentSlide.primaryBtnHover)}
              onMouseLeave={(e) => (e.target.style.background = currentSlide.primaryBtnColor)}
            >
              {currentSlide.primaryBtnText}
            </button>

            {/* Secondary Button */}
            <button
              onClick={() => navigate("/contact")}
              className="px-8 sm:px-10 py-3 sm:py-4 rounded-full font-bold text-sm sm:text-base transition-all duration-300 hover:scale-105 active:scale-95 border-2"
              style={{
                borderColor: currentSlide.secondaryBtnBorder,
                color: "white",
                background: currentSlide.secondaryBtnColor,
                backdropFilter: "blur(8px)",
              }}
              onMouseEnter={(e) => (e.target.style.background = `${currentSlide.accentColor}25`)}
              onMouseLeave={(e) => (e.target.style.background = currentSlide.secondaryBtnColor)}
            >
              Book Consultation
            </button>
          </div>

          {/* Image Counter */}
          <div className="mt-8 sm:mt-10 md:mt-12 flex items-center gap-3">
            <div className="flex gap-1.5">
              {heroSlides.map((_, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setIsTransitioning(true);
                    setTimeout(() => {
                      setCurrentImageIndex(index);
                      setIsTransitioning(false);
                    }, 250);
                  }}
                  className="h-1 rounded-full transition-all duration-300 cursor-pointer hover:opacity-80"
                  style={{
                    width: index === currentImageIndex ? "24px" : "8px",
                    background:
                      index === currentImageIndex
                        ? currentSlide.accentColor
                        : "rgba(255,255,255,0.4)",
                  }}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>
            <span className="text-sm text-gray-200 ml-2">
              {currentImageIndex + 1} / {heroSlides.length}
            </span>
          </div>
        </div>

        {/* Right Side - Empty on all screens (removed preview) */}
        <div className="hidden lg:flex w-1/2 items-center justify-center" />
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20">
        <div className="animate-bounce">
          <svg
            className="w-6 h-6 text-white"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path d="M19 14l-7 7m0 0l-7-7m7 7V3"></path>
          </svg>
        </div>
      </div>
    </section>
  );
};

export default ModernHero;
