import React, { useEffect, useState } from "react";

import { assets, slides } from "@/const";
import Navibar from "./Navibar";

const Header = () => {
  const images = [
    assets.header,
    assets.header2,
    assets.header3,
    assets.header4,
  ];

  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((prev) => (prev + 1) % images.length);
    }, 4500); //
    return () => clearInterval(id);
  }, [images.length]);

  return (
    <header id="Header" className="relative h-screen w-screen overflow-hidden">
      {/* Background Images  */}
      <div className="absolute inset-0">
        {slides.map((slide, i) => (
          <div
            key={slide.image}
            className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000
      ${i === index ? "opacity-100" : "opacity-0"}`}
            style={{ backgroundImage: `url('${slide.image}')` }}
          />
        ))}

        {/* Dark overlay for readability */}
        <div className="absolute inset-0 bg-black/50" />
      </div>

      {/* Navbar on top */}
      <div className="absolute top-0 left-0 w-full z-20">
        <Navibar />
      </div>

      {/* Hero content */}
      <div className="relative z-10 h-full w-full flex items-center px-5 md:px-50 lg:px-60">
        <div className="container mx-auto px-6 md:px-20">
          <p className="text-white/80 tracking-widest uppercase text-sm">
            TENZY SHOP
          </p>
          <h1 className="mt-3 text-white text-4xl md:text-6xl font-semibold leading-tight">
            {slides[index].title}
          </h1>
          <p className="mt-5 max-w-xl text-white/80 text-base md:text-lg">
            {slides[index].description}
          </p>

          <div className="mt-8 flex gap-4">
            <button className="rounded-full bg-white px-6 py-3 text-black font-medium hover:bg-white/90 transition">
              Shop Now
            </button>
            <button className="rounded-full border border-white/40 px-6 py-3 text-white font-medium hover:bg-white/10 transition">
              Explore
            </button>
          </div>
        </div>

        <div className="hidden md:block w-full max-w-xl md:mt-20 lg:mt-10">
          <div className="relative h-[580px] overflow-hidden rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl shadow-2xl">
            <div className="absolute inset-0 bg-linear-to-b from-white/10 to-black/20" />

            {/* Slides (MUST be absolute) */}
            <div className="absolute inset-0">
              {images.map((src, i) => (
                <div
                  key={`${src}-${i}`}
                  className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ease-in-out
            ${i === index ? "opacity-100" : "opacity-0"}`}
                  style={{ backgroundImage: `url('${src}')` }}
                />
              ))}
            </div>

            <div className="absolute bottom-5 left-5 right-5">
              <p className="text-white/70 text-xs tracking-widest uppercase">
                Featured
              </p>
              <h3 className="mt-1 text-white text-xl font-semibold">
                Velvet Pour
              </h3>
              <p className="mt-1 text-white/70 text-sm">
                Smooth transitions • Premium skincare
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Small indicator dots */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex gap-2">
        {images.map((_, i) => (
          <button
            key={i}
            onClick={() => setIndex(i)}
            className={`h-2 w-2 rounded-full transition-all
              ${i === index ? "bg-white w-6" : "bg-white/50"}`}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>
    </header>
  );
};

export default Header;
