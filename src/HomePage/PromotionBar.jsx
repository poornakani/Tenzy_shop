import React, { useState, useEffect } from "react";

const PROMO_STYLES = `
  @keyframes marquee {
    0% { transform: translateX(100%); }
    100% { transform: translateX(-100%); }
  }

  .promo-text {
    animation: marquee 30s linear infinite;
    will-change: transform;
  }

  .promo-text:hover {
    animation-play-state: paused;
  }
`;

const PromotionBar = () => {
  const [currentPromo, setCurrentPromo] = useState(0);

  const promotions = [
    {
      id: 1,
      text: "🎁 FLASH SALE - Up to 50% OFF on selected items! 🎁",
      bgColor: "#E8522A",
      textColor: "#FFFFFF",
    },
    {
      id: 2,
      text: "✨ FREE SHIPPING on orders over Rs.3,000! ✨",
      bgColor: "#2BB9B4",
      textColor: "#FFFFFF",
    },
    {
      id: 3,
      text: "💝 Buy 2 Get 1 Free on Beauty Bundles! 💝",
      bgColor: "#8B5CF6",
      textColor: "#FFFFFF",
    },
    {
      id: 4,
      text: "⭐ NEW ARRIVALS - Fresh collection just in! ⭐",
      bgColor: "#EC4899",
      textColor: "#FFFFFF",
    },
  ];

  const promo = promotions[currentPromo];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentPromo((prev) => (prev + 1) % promotions.length);
    }, 8000);
    return () => clearInterval(timer);
  }, [promotions.length]);

  return (
    <div className="w-full overflow-hidden" style={{ background: promo.bgColor }}>
      <style>{PROMO_STYLES}</style>

      <div className="relative h-20 sm:h-24 flex items-center px-4 py-8 sm:py-12">
        {/* Animated Text */}
        <div className="w-full overflow-hidden flex items-center">
          <div className="promo-text whitespace-nowrap text-base sm:text-xl md:text-2xl lg:text-3xl font-bold" style={{ color: promo.textColor }}>
            {promo.text}&nbsp;&nbsp;&nbsp;&nbsp;
            {promo.text}&nbsp;&nbsp;&nbsp;&nbsp;
            {promo.text}&nbsp;&nbsp;&nbsp;&nbsp;
          </div>
        </div>
      </div>
    </div>
  );
};

export default PromotionBar;
