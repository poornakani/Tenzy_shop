import React, { useRef } from "react";
import { CatSelections } from "@/const";
import { useNavigate } from "react-router-dom";

const Categories = () => {
  const navigate = useNavigate();
  const trackRef = useRef(null);

  const scrollByCard = (direction) => {
    const track = trackRef.current;
    if (!track) return;

    const firstCard = track.querySelector("[data-card]");
    if (!firstCard) return;

    const cardWidth = firstCard.getBoundingClientRect().width;
    const gap = 16; // because you used "gap-4" (16px)
    const scrollAmount = (cardWidth + gap) * direction;

    track.scrollBy({ left: scrollAmount, behavior: "smooth" });
  };

  return (
    <div className="relative w-full sm:h-auto h-screen overflow-hidden mt-5 md:mt-5">
      <h1 className="text-2xl md:text-7xl font-semibold text-center mx-auto p-4">
        Our Latest Creations
      </h1>
      <p className="text-sm md:text-xl text-slate-500 text-center mt-2 mx-auto">
        A visual collection of our most recent works - each piece crafted with
        intention, emotion, and style.
      </p>

      {/* Controls (Desktop/Tablet) */}
      <div className="mt-6 hidden md:flex items-center justify-center gap-3">
        <button
          onClick={() => scrollByCard(-1)}
          className="rounded-full border px-4 py-2 text-sm hover:bg-black hover:text-white transition"
        >
          ← Prev
        </button>
        <button
          onClick={() => scrollByCard(1)}
          className="rounded-full border px-4 py-2 text-sm hover:bg-black hover:text-white transition"
        >
          Next →
        </button>
      </div>

      {/* Horizontal Carousel (Desktop/Tablet) */}
      <div className="mt-8 px-5 hidden md:block">
        <div
          ref={trackRef}
          className="no-scrollbar flex gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-4"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          {CatSelections.slice(0, 10).map((item, i) => (
            <div
              key={item.image ?? i}
              data-card
              className="snap-start shrink-0 w-[24%] md:h-[55vh] lg:h-[70vh] relative overflow-hidden rounded-2xl hover:w-[30%] transition-[width]
              duration-500 ease-in-out"
            >
              <img
                src={item.image}
                alt={item.title || "category"}
                className="h-full w-full object-cover object-center"
              />

              <div className="absolute inset-0 bg-black/35" />

              <p className="absolute top-5 left-5 z-10 text-white text-lg font-semibold">
                {item.title}
              </p>

              {item.description && (
                <p className="absolute top-14 left-5 right-5 z-10 text-white/80 text-sm">
                  {item.description}
                </p>
              )}

              <button
                className="absolute bottom-20 left-5 right-5 z-10 rounded-2xl bg-white/90 backdrop-blur
                  px-5 py-3 text-sm font-medium text-black hover:bg-white transition whitespace-nowrap
                   hover:shadow-lg hover:shadow-amber-500/30"
                onClick={() => navigate(`/products?category=${item.category}`)}
              >
                {item.title}
              </button>
            </div>
          ))}
        </div>

        {/* scrollbar hide (webkit) */}
        <style>{`
          .no-scrollbar::-webkit-scrollbar { display: none; }
          .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        `}</style>
      </div>

      {/* MOBILE: swipe row */}
      <div className="mt-10 px-5 md:hidden">
        <div className="no-scrollbar flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory">
          {CatSelections.map((item, i) => (
            <div
              key={item.image ?? i}
              className="relative h-[540px] min-w-[260px] snap-start overflow-hidden rounded-xl"
            >
              <img
                src={item.image}
                alt={item.title || "category"}
                className="h-full w-full object-cover object-center"
              />

              <div className="absolute inset-0 bg-black/30" />

              <p className="absolute top-4 left-4 z-10 text-white font-semibold">
                {item.title}
              </p>

              {item.description && (
                <p className="absolute bottom-16 left-4 right-4 z-10 text-sm text-white/80 line-clamp-2">
                  {item.description}
                </p>
              )}

              <button
                className="absolute bottom-4 inset-x-4 z-10 rounded-2xl bg-white px-4 py-2 text-sm font-medium 
              text-black hover:bg-gray-200"
                onClick={() => navigate(`/products?category=${item.category}`)}
              >
                {item.title}
              </button>
            </div>
          ))}
        </div>

        <style>{`
          .no-scrollbar::-webkit-scrollbar { display: none; }
          .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        `}</style>
      </div>
    </div>
  );
};

export default Categories;
