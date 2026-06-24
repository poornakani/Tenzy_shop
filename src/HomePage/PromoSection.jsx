import React from "react";
import { useNavigate } from "react-router-dom";

const PROMO_STYLES = `
  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(40px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes float {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-20px); }
  }

  .promo-content {
    animation: slideUp 0.8s ease-out forwards;
  }

  .promo-badge {
    animation: float 3s ease-in-out infinite;
  }

  .promo-badge:nth-child(2) {
    animation-delay: 0.3s;
  }

  .promo-badge:nth-child(3) {
    animation-delay: 0.6s;
  }

  .highlight-text {
    background: linear-gradient(120deg, #E8522A 0%, #FF6B3D 50%, #E8522A 100%);
    background-size: 200% auto;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .cta-button {
    transition: all 300ms cubic-bezier(0.4, 0.0, 0.2, 1);
    position: relative;
    overflow: hidden;
  }

  .cta-button::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.2) 50%, transparent 70%);
    transform: translateX(-100%);
    transition: transform 600ms;
  }

  .cta-button:hover::before {
    transform: translateX(100%);
  }

  .cta-button:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 24px rgba(232, 82, 42, 0.3);
  }

  .cta-button:active {
    transform: translateY(0);
  }
`;

const PromoSection = () => {
  const navigate = useNavigate();

  return (
    <section className="w-full py-12 sm:py-16 md:py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-white via-white to-slate-50">
      <style>{PROMO_STYLES}</style>

      <div className="max-w-6xl mx-auto">
        {/* Main Promo Banner */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-slate-700/50 p-8 sm:p-12 md:p-16 lg:p-20">
          {/* Background decorative elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl" />

          {/* Content */}
          <div className="relative z-10 max-w-2xl mx-auto text-center">
            {/* Badges - Floating Animation */}
            <div className="flex items-center justify-center gap-3 mb-6 flex-wrap">
              <span className="promo-badge inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-500/20 border border-orange-500/50 text-orange-300 text-xs sm:text-sm font-semibold">
                <span className="w-2 h-2 rounded-full bg-orange-400" />
                Limited Time
              </span>
              <span className="promo-badge inline-flex items-center gap-2 px-4 py-2 rounded-full bg-teal-500/20 border border-teal-500/50 text-teal-300 text-xs sm:text-sm font-semibold">
                <span className="w-2 h-2 rounded-full bg-teal-400" />
                Free Shipping
              </span>
              <span className="promo-badge inline-flex items-center gap-2 px-4 py-2 rounded-full bg-pink-500/20 border border-pink-500/50 text-pink-300 text-xs sm:text-sm font-semibold">
                <span className="w-2 h-2 rounded-full bg-pink-400" />
                Exclusive Offer
              </span>
            </div>

            {/* Heading */}
            <div className="promo-content mb-6">
              <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 leading-tight">
                Unlock Your
                <br />
                <span className="highlight-text">Beauty Potential</span>
              </h2>

              <p className="text-base sm:text-lg text-gray-300 max-w-xl mx-auto leading-relaxed">
                Get 25% off your first order on premium beauty products. Use code{" "}
                <span className="font-bold text-orange-400">BEAUTY25</span> at checkout.
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="promo-content flex flex-col sm:flex-row gap-4 justify-center items-center">
              <button
                onClick={() => navigate("/products")}
                className="cta-button w-full sm:w-auto px-8 sm:px-10 py-4 rounded-full bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white font-bold text-base transition-all duration-300"
              >
                Shop Now →
              </button>
              <button
                onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                className="w-full sm:w-auto px-8 sm:px-10 py-4 rounded-full border-2 border-white/30 hover:border-white/50 text-white font-bold text-base transition-all duration-300 hover:bg-white/10 active:scale-95"
              >
                Learn More
              </button>
            </div>

            {/* Social Proof */}
            <div className="promo-content mt-10 pt-10 border-t border-slate-700/50 flex flex-col sm:flex-row items-center justify-center gap-8 text-gray-300">
              <div className="text-center">
                <p className="text-2xl sm:text-3xl font-bold text-white">50K+</p>
                <p className="text-sm text-gray-400">Happy Customers</p>
              </div>
              <div className="hidden sm:block w-px h-12 bg-gradient-to-b from-transparent via-orange-500/50 to-transparent" />
              <div className="text-center">
                <p className="text-2xl sm:text-3xl font-bold text-white">4.9★</p>
                <p className="text-sm text-gray-400">Average Rating</p>
              </div>
              <div className="hidden sm:block w-px h-12 bg-gradient-to-b from-transparent via-teal-500/50 to-transparent" />
              <div className="text-center">
                <p className="text-2xl sm:text-3xl font-bold text-white">2M+</p>
                <p className="text-sm text-gray-400">Products Sold</p>
              </div>
            </div>
          </div>
        </div>

        {/* Trust Message */}
        <div className="mt-8 sm:mt-10 text-center">
          <p className="text-sm sm:text-base text-gray-600">
            ✓ 100% Authentic Products • ✓ Secure Payment • ✓ 30-Day Returns
          </p>
        </div>
      </div>
    </section>
  );
};

export default PromoSection;
