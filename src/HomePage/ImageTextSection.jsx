import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

const STYLES = `
  @keyframes slideInUp {
    from {
      opacity: 0;
      transform: translateY(40px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .text-item {
    animation: slideInUp 0.8s ease-out forwards;
    opacity: 0;
  }

  .text-item:nth-child(1) { animation-delay: 0.1s; }
  .text-item:nth-child(2) { animation-delay: 0.2s; }
  .text-item:nth-child(3) { animation-delay: 0.3s; }
  .text-item:nth-child(4) { animation-delay: 0.4s; }
  .text-item:nth-child(5) { animation-delay: 0.5s; }

  .highlight-text {
    background: linear-gradient(120deg, #E8522A 0%, #FF6B3D 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .parallax-bg {
    background-attachment: fixed;
    background-position: center;
    background-repeat: no-repeat;
    background-size: cover;
    will-change: transform;
  }

  .carousel-image {
    transition: opacity 0.8s ease-in-out;
  }

  .carousel-dot {
    transition: all 300ms cubic-bezier(0.4, 0.0, 0.2, 1);
  }
`;

const ImageTextSection = () => {
  const navigate = useNavigate();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [scrollOpacity, setScrollOpacity] = useState(1);
  const sectionRef = useRef(null);

  const images = [
    "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=1200&q=80",
    "https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=1200&q=80",
    "https://images.unsplash.com/photo-1606214174585-fe31582dc1d4?w=1200&q=80",
    "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=1200&q=80",
  ];

  const features = [
    {
      icon: "✨",
      title: "Premium Quality",
      description: "Handpicked from 50+ global brands",
    },
    {
      icon: "🌿",
      title: "Natural Ingredients",
      description: "Skin-friendly formulations",
    },
    {
      icon: "🚚",
      title: "Fast Delivery",
      description: "Ship across Sri Lanka in 2-3 days",
    },
    {
      icon: "💰",
      title: "Best Prices",
      description: "Unbeatable deals & exclusive offers",
    },
    {
      icon: "🛡️",
      title: "100% Authentic",
      description: "Verified from authorized distributors",
    },
  ];

  // Auto-rotate carousel every 5 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % images.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [images.length]);

  // Handle scroll to fade images as user scrolls toward brand section
  useEffect(() => {
    const handleScroll = () => {
      if (!sectionRef.current) return;

      const rect = sectionRef.current.getBoundingClientRect();
      const elementTop = rect.top;
      const windowHeight = window.innerHeight;

      // Calculate opacity based on scroll position
      // When element is at center of viewport (opacity 1)
      // As it scrolls out of view (opacity 0)
      const opacity = Math.max(0, Math.min(1, (windowHeight - elementTop) / (windowHeight * 0.5)));

      setScrollOpacity(opacity);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const goToImage = (index) => {
    setCurrentImageIndex(index);
  };

  return (
    <section
      ref={sectionRef}
      className="relative w-full py-12 sm:py-16 md:py-24 px-4 sm:px-6 lg:px-8 overflow-hidden"
      style={{
        backgroundImage: `url('${images[currentImageIndex]}')`,
        backgroundAttachment: "fixed",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        backgroundSize: "cover",
      }}
    >
      <style>{STYLES}</style>

      {/* Parallax Background Overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-black/70 z-0" />
      <div className="absolute inset-0 backdrop-blur-sm z-0" />

      {/* Content Container */}
      <div className="relative z-10 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center">
          {/* Left: Text Content (appears on top of bg image) */}
          <div className="order-1">
            {/* Header */}
            <div className="text-item">
              <span className="inline-flex items-center gap-2 mb-4">
                <div className="w-1 h-1 rounded-full bg-orange-400" />
                <span className="text-xs sm:text-sm font-bold text-orange-400 uppercase tracking-wider">
                  Why Choose Tenzy
                </span>
              </span>

              <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 leading-tight">
                Your Beauty,
                <br />
                <span className="text-orange-400">Perfected</span>
              </h2>

              <p className="text-base sm:text-lg text-gray-100 leading-relaxed max-w-lg">
                Experience the finest beauty products curated from the world's most trusted brands. We believe every customer deserves premium care.
              </p>
            </div>

            {/* Features List */}
            <div className="mt-8 space-y-4">
              {features.map((feature, index) => (
                <div key={index} className="text-item flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-orange-500/20 border border-orange-500/50">
                      <span className="text-xl">{feature.icon}</span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base sm:text-lg font-semibold text-white mb-1">
                      {feature.title}
                    </h3>
                    <p className="text-sm sm:text-base text-gray-200">
                      {feature.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* CTA Button */}
            <div className="text-item mt-10">
              <button
                onClick={() => navigate("/products")}
                className="w-full sm:w-auto px-8 sm:px-10 py-4 rounded-full bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white font-bold text-base transition-all duration-300 hover:shadow-lg hover:shadow-orange-500/40 active:scale-95"
              >
                Explore Collection →
              </button>
            </div>
          </div>

          {/* Right: Carousel (Scrolls away & disappears) */}
          <div
            className="order-2 transition-all duration-300"
            style={{
              opacity: scrollOpacity,
              transform: `translateY(${(1 - scrollOpacity) * 40}px)`,
              pointerEvents: scrollOpacity < 0.1 ? "none" : "auto",
            }}
          >
            <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-white/10">
              {/* Main Image */}
              <div className="relative w-full aspect-[3/4] overflow-hidden bg-gray-900">
                <img
                  key={currentImageIndex}
                  src={images[currentImageIndex]}
                  alt={`Product ${currentImageIndex + 1}`}
                  className="carousel-image w-full h-full object-cover"
                />

                {/* Overlay Gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
              </div>

              {/* Image Counter Badge */}
              <div className="absolute top-6 right-6 bg-white/90 backdrop-blur-md rounded-full px-4 py-2 text-sm font-bold text-gray-900">
                {currentImageIndex + 1}/{images.length}
              </div>

              {/* Navigation Arrows */}
              <button
                onClick={() =>
                  goToImage(
                    (currentImageIndex - 1 + images.length) % images.length
                  )
                }
                className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm flex items-center justify-center text-white transition-all duration-300 hover:scale-110"
                aria-label="Previous image"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>

              <button
                onClick={() =>
                  goToImage((currentImageIndex + 1) % images.length)
                }
                className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm flex items-center justify-center text-white transition-all duration-300 hover:scale-110"
                aria-label="Next image"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            </div>

            {/* Carousel Dots */}
            <div className="flex gap-2 mt-6 justify-center">
              {images.map((_, index) => (
                <button
                  key={index}
                  onClick={() => goToImage(index)}
                  className="carousel-dot rounded-full transition-all duration-300"
                  style={{
                    width:
                      currentImageIndex === index ? "28px" : "8px",
                    height: "8px",
                    background:
                      currentImageIndex === index
                        ? "#FF6B3D"
                        : "rgba(255, 107, 61, 0.25)",
                  }}
                  aria-label={`Go to image ${index + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ImageTextSection;
