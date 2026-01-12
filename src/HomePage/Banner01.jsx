import React from "react";
import { assets } from "@/const";
import RotatingText from "../Animation/RotatingText";
import { useNavigate } from "react-router-dom";

const Banner01 = () => {
  const navigator = useNavigate();
  return (
    <div className="mt-5 mb-5 px-4 sm:px-6 md:mt-20 md:mb-10 md:px-10">
      <section
        className="
      relative mx-auto w-full overflow-hidden text-center
      rounded-2xl
      bg-cover bg-center bg-no-repeat
      py-16 sm:py-20 md:py-44
      min-h-[420px] sm:min-h-[480px] md:min-h-0
      flex flex-col items-center justify-center
    "
        style={{ backgroundImage: `url(${assets.banner01})` }}
      >
        {/* overlay must cover the whole section */}
        <div className="absolute inset-0 bg-black/30" />

        <div className="relative z-10 px-4 sm:px-6 text-center">
          {/* Small label */}
          <p className="mx-auto mb-3 inline-flex items-center rounded-full border border-teal-300/40 bg-white/10 px-3 py-1 text-xs sm:text-sm text-white/90 backdrop-blur">
            TENZY • Luxury Skincare
          </p>

          {/* Title + Rotating word */}
          <h2 className="mx-auto max-w-3xl text-white font-semibold leading-tight text-2xl sm:text-3xl md:text-4xl">
            Your glow starts with{" "}
            <span className="inline-block align-middle">
              <RotatingText
                texts={["Hydration", "Radiance", "Confidence", "Velvet Skin"]}
                mainClassName="
          inline-flex items-center justify-center
          px-3 sm:px-4 py-1 sm:py-1.5
          rounded-xl
          bg-teal-500 text-white
          shadow-[0_0_0_1px_rgba(45,212,191,0.35),0_10px_30px_rgba(45,212,191,0.25)]
          overflow-hidden
        "
                staggerFrom={"last"}
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "-120%" }}
                staggerDuration={0.03}
                splitLevelClassName="overflow-hidden"
                transition={{ type: "spring", damping: 28, stiffness: 420 }}
                rotationInterval={2200}
              />
            </span>
          </h2>

          {/* Underline */}
          <div className="mx-auto mt-4 h-[3px] w-20 sm:w-28 rounded-full bg-teal-400" />

          {/* Description */}
          <p className="mx-auto mt-4 max-w-xl text-xs sm:text-sm md:text-base text-white/85 leading-relaxed">
            Discover premium skincare essentials with smooth UI transitions and
            a modern shopping experience — powered by clean design and clarity.
          </p>

          {/* CTA Buttons */}
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              className="
            w-full sm:w-auto
            rounded-full bg-teal-500 px-20 py-2.5
            text-sm sm:text-base font-medium text-white
            shadow-[0_12px_35px_rgba(45,212,191,0.25)]
            transition hover:bg-teal-400
            active:scale-[0.98]"
              onClick={() => {
                navigator(`/products`);
              }}
            >
              Shop Now
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Banner01;
