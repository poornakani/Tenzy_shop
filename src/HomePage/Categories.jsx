import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Sparkles,
  Smile,
  Feather,
  Layers,
  Heart,
  Leaf,
  Sun,
  Droplets,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { CatSelections } from "@/const";
import { useNavigate } from "react-router-dom";

const ICONS = {
  "Skin Care": Sparkles,
  "Face Care": Smile,
  "Head Care": Feather,
  "Hand Care": Layers,
  "Body Care": Heart,
  "Lip Care": Leaf,
  "Sun Care": Sun,
  "Acne Care": Droplets,
};

const TEAL = "#2BB9B4";
const ORANGE = "#E8522A";
const ITEM_H = 70;
const TOTAL = CatSelections.length;

const wrap = (min, max, v) => {
  const r = max - min;
  return ((((v - min) % r) + r) % r) + min;
};

const getCardStatus = (i, current) => {
  const d = i - current;
  let nd = d;
  if (d > TOTAL / 2) nd -= TOTAL;
  if (d < -TOTAL / 2) nd += TOTAL;
  if (nd === 0) return "active";
  if (nd === -1) return "prev";
  if (nd === 1) return "next";
  return "hidden";
};

export default function Categories() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [paused, setPaused] = useState(false);

  const current = ((step % TOTAL) + TOTAL) % TOTAL;
  const advance = useCallback(() => setStep((s) => s + 1), []);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(advance, 3400);
    return () => clearInterval(id);
  }, [advance, paused]);

  const jumpTo = (i) => {
    const diff = (i - current + TOTAL) % TOTAL;
    if (diff > 0) setStep((s) => s + diff);
  };

  return (
    <section
      className="w-full py-12 md:py-16 px-4 sm:px-6 lg:px-10"
      style={{ background: "#f8fffe" }}
    >
      {/* ── Heading ──────────────────────────────────────────────── */}
      <div className="text-center mb-10 select-none">
        <span
          className="inline-flex items-center gap-2 mb-3 text-xs font-bold tracking-[0.2em] uppercase"
          style={{ color: TEAL }}
        >
          <span
            className="h-px w-8 inline-block"
            style={{ background: TEAL }}
          />
          Shop by Category
          <span
            className="h-px w-8 inline-block"
            style={{ background: TEAL }}
          />
        </span>
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-zinc-900 leading-tight">
          Find your{" "}
          <span className="italic" style={{ color: ORANGE }}>
            perfect
          </span>{" "}
          match
        </h2>
      </div>

      {/* ── Carousel ─────────────────────────────────────────────── */}
      <div className="w-full max-w-7xl mx-auto">
        <div
          className="relative overflow-hidden rounded-4xl lg:rounded-[3rem] flex flex-col lg:flex-row min-h-[600px] lg:min-h-0 lg:aspect-video"
          style={{
            boxShadow:
              "0 24px 80px rgba(43,185,180,0.13), 0 4px 16px rgba(0,0,0,0.07)",
          }}
        >
          {/* ── LEFT: teal scrolling chip panel ──────────────────── */}
          <div
            className="relative w-full lg:w-[38%] min-h-[340px] md:min-h-[420px] lg:h-full z-10 overflow-hidden"
            style={{ background: TEAL }}
          >
            {/* fade edges */}
            <div
              className="absolute inset-x-0 top-0 h-16 z-20 pointer-events-none"
              style={{
                background: `linear-gradient(to bottom, ${TEAL} 40%, transparent)`,
              }}
            />
            <div
              className="absolute inset-x-0 bottom-0 h-16 z-20 pointer-events-none"
              style={{
                background: `linear-gradient(to top, ${TEAL} 40%, transparent)`,
              }}
            />

            {/* ▲ Up button */}
            <button
              onClick={() => setStep((s) => s - 1)}
              onMouseEnter={() => setPaused(true)}
              onMouseLeave={() => setPaused(false)}
              className="absolute top-4 left-1/2 -translate-x-1/2 lg:left-auto lg:translate-x-0 lg:right-5 z-30 flex items-center justify-center w-11 h-11 rounded-full transition-all duration-200 active:scale-95 hover:scale-110"
              style={{
                background: ORANGE,
                color: "white",
                boxShadow: "0 4px 16px rgba(232,82,42,0.50)",
              }}
            >
              <ChevronUp size={30} strokeWidth={2.5} />
            </button>

            {/* ▼ Down button */}
            <button
              onClick={() => setStep((s) => s + 1)}
              onMouseEnter={() => setPaused(true)}
              onMouseLeave={() => setPaused(false)}
              className="absolute  bottom-4 left-1/2 -translate-x-1/2 lg:left-auto lg:translate-x-0 lg:right-5 z-30 flex items-center justify-center w-11 h-11 rounded-full transition-all duration-200 active:scale-95 hover:scale-110"
              style={{
                background: ORANGE,
                color: "white",
                boxShadow: "0 4px 16px rgba(232,82,42,0.50)",
              }}
            >
              <ChevronDown size={20} strokeWidth={2.5} />
            </button>

            {/* chip scroll area — absolute inset-0 fills full panel height */}
            <div className="absolute inset-20 z-10 flex items-center justify-center lg:justify-start lg:pl-14">
              {CatSelections.map((item, i) => {
                const isActive = i === current;
                const wd = wrap(-(TOTAL / 2), TOTAL / 2, i - current);
                const Icon = ICONS[item.title] ?? Sparkles;

                return (
                  <motion.div
                    key={item.title}
                    style={{
                      position: "absolute",
                      height: ITEM_H,
                      width: "max-content",
                    }}
                    animate={{
                      y: wd * ITEM_H,
                      opacity: Math.max(0, 1 - Math.abs(wd) * 0.27),
                    }}
                    transition={{
                      type: "spring",
                      stiffness: 85,
                      damping: 20,
                      mass: 1,
                    }}
                    className="flex items-center"
                  >
                    <button
                      onClick={() => jumpTo(i)}
                      onMouseEnter={() => setPaused(true)}
                      onMouseLeave={() => setPaused(false)}
                      className="flex items-center gap-5 rounded-full border transition-all duration-300 cursor-pointer whitespace-nowrap"
                      style={
                        isActive
                          ? {
                              background: ORANGE,
                              borderColor: ORANGE,
                              color: "#ffffff",
                              boxShadow: "0 6px 24px rgba(232,82,42,0.40)",
                              padding: "0.75rem 2rem",
                              minWidth: "200px",
                            }
                          : {
                              background: "transparent",
                              borderColor: "rgba(255,255,255,0.28)",
                              color: "rgba(255,255,255,0.72)",
                              padding: "0.75rem 2rem",
                              minWidth: "200px",
                            }
                      }
                    >
                      <Icon size={15} strokeWidth={2} />
                      <span className="text-[20px] font-bold uppercase tracking-widest">
                        {item.title}
                      </span>
                    </button>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* ── RIGHT: card carousel ──────────────────────────────── */}
          <div
            className="flex-1 min-h-[500px] lg:h-full relative flex items-center justify-center overflow-hidden border-t lg:border-t-0 lg:border-l"
            style={{
              background: "#f0fbfa",
              borderColor: "rgba(43,185,180,0.12)",
              padding: "3rem 3.5rem",
            }}
          >
            {/* subtle radial glow */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  "radial-gradient(ellipse 70% 70% at 50% 50%, rgba(43,185,180,0.07) 0%, transparent 70%)",
              }}
            />

            {/* card stack */}
            <div
              className="relative flex items-center justify-center"
              style={{ width: "100%", maxWidth: "400px", aspectRatio: "4/5" }}
            >
              {CatSelections.map((item, i) => {
                const st = getCardStatus(i, current);
                const isActive = st === "active";
                const isPrev = st === "prev";
                const isNext = st === "next";

                return (
                  <motion.div
                    key={item.title}
                    initial={false}
                    animate={{
                      x: isActive ? 0 : isPrev ? -90 : isNext ? 90 : 0,
                      scale: isActive ? 1 : isPrev || isNext ? 0.86 : 0.7,
                      opacity: isActive ? 1 : isPrev || isNext ? 0.35 : 0,
                      rotate: isPrev ? -3 : isNext ? 3 : 0,
                      zIndex: isActive ? 20 : isPrev || isNext ? 10 : 0,
                      pointerEvents: isActive ? "auto" : "none",
                    }}
                    transition={{
                      type: "spring",
                      stiffness: 260,
                      damping: 25,
                      mass: 0.8,
                    }}
                    className="absolute inset-0 overflow-hidden origin-center cursor-pointer"
                    style={{
                      borderRadius: "1.8rem",
                      border: "5px solid white",
                      boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
                    }}
                    onClick={() =>
                      isActive &&
                      navigate(`/products?category=${item.category}`)
                    }
                  >
                    <img
                      src={item.image}
                      alt={item.title}
                      className="w-full h-full object-cover transition-all duration-700"
                      style={
                        isActive
                          ? { filter: "none" }
                          : { filter: "grayscale(1) brightness(0.7) blur(1px)" }
                      }
                    />

                    <AnimatePresence>
                      {isActive && (
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="absolute inset-x-0 bottom-0 flex flex-col justify-end pointer-events-none"
                          style={{
                            padding: "1.75rem 1.75rem 2rem",
                            paddingTop: "6rem",
                            background:
                              "linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.45) 55%, transparent 100%)",
                          }}
                        >
                          <div
                            className="w-fit mb-2 px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest"
                            style={{
                              background: "rgba(255,255,255,0.92)",
                              color: "#3f3f46",
                            }}
                          >
                            {i + 1} · {item.title}
                          </div>
                          <p className="text-white text-sm font-medium leading-snug mb-3">
                            {item.description}
                          </p>
                          <span
                            className="self-start inline-flex items-center gap-1 rounded-full text-white text-[11px] font-bold px-5 py-2"
                            style={{ background: ORANGE }}
                          >
                            Shop Now →
                          </span>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
