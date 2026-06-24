/**
 * Tenzy Beauty — Text Parallax Scroll Section
 *
 * Adapted from the TextParallaxContent component prompt.
 * Changes from original:
 *   • TypeScript → JSX (removed all type annotations)
 *   • framer-motion → motion/react  (what this project has installed)
 *   • react-icons/fi → lucide-react  (already installed)
 *   • Neutral palette → Tenzy brand colours (Orange #E8522A · Teal #2BB9B4)
 *   • Placeholder copy → real Tenzy beauty content
 *   • Cormorant Garamond for display headings (already loaded in index.css)
 */

import React, { useRef } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import { ArrowUpRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

// ── How far each section is inset from the viewport edge (px) ────────────────
const IMG_PADDING = 12;

// ── Three content sections ────────────────────────────────────────────────────
const SECTIONS = [
  {
    imgUrl:
      "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=2000&q=80",
    subheading: "Skincare",
    heading: "Crafted for\nyour skin.",
    eyebrow: "Tenzy Skincare Edit",
    body1:
      "From lightweight hydrators to targeted serums, every skincare product in our range is formulated to work with your skin's natural biology — not against it. Dermatologist-reviewed, always authentic.",
    body2:
      "Explore moisturisers, SPFs, toners, and vitamin C serums from the brands dermatologists trust worldwide.",
    cta: "Shop Skincare",
    accent: "#E8522A",
    route: "/products",
  },
  {
    imgUrl:
      "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=2000&q=80",
    subheading: "Authenticity",
    heading: "100% genuine.\nAlways.",
    eyebrow: "Verified Authentic",
    body1:
      "Every product on Tenzy is sourced directly from authorised distributors and undergoes a strict verification process before it reaches your door. We do not carry grey-market or counterfeit goods — period.",
    body2:
      "Because your skin deserves products that actually do what the label says.",
    cta: "Our Promise",
    accent: "#2BB9B4",
    route: "/contact",
  },
  {
    imgUrl:
      "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=2000&q=80",
    subheading: "Premium",
    heading: "Beauty,\nelevated.",
    eyebrow: "Tenzy Luxury Edit",
    body1:
      "Premium does not have to mean inaccessible. Tenzy brings the world's most celebrated beauty brands — Charlotte Tilbury, La Mer, The Ordinary and more — straight to Sri Lanka at fair prices.",
    body2:
      "50+ global brands. One trusted destination. Your glow, our mission.",
    cta: "Explore Collection",
    accent: "#E8522A",
    route: "/products",
  },
];

// ── Root export ───────────────────────────────────────────────────────────────
const TextParallaxSection = () => (
  <div style={{ background: "#FFF9F5" }}>
    {SECTIONS.map((s) => (
      <TextParallaxContent key={s.heading} section={s} />
    ))}
  </div>
);

// ── One parallax block ────────────────────────────────────────────────────────
const TextParallaxContent = ({ section }) => (
  <div style={{ paddingLeft: IMG_PADDING, paddingRight: IMG_PADDING }}>
    <div className="relative" style={{ height: "150vh" }}>
      <StickyImage imgUrl={section.imgUrl} />
      <OverlayCopy subheading={section.subheading} heading={section.heading} />
    </div>
    <SectionBody section={section} />
  </div>
);

// ── Sticky, scale-out image ───────────────────────────────────────────────────
const StickyImage = ({ imgUrl }) => {
  const targetRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: targetRef,
    offset: ["end end", "end start"],
  });

  const scale   = useTransform(scrollYProgress, [0, 1], [1, 0.85]);
  const opacity = useTransform(scrollYProgress, [0, 1], [1, 0]);

  return (
    <motion.div
      ref={targetRef}
      style={{
        backgroundImage: `url(${imgUrl})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        height: `calc(100vh - ${IMG_PADDING * 2}px)`,
        top: IMG_PADDING,
        scale,
      }}
      className="sticky z-0 overflow-hidden rounded-3xl"
    >
      {/* Dark warm overlay — matches Tenzy's dark tone (#18090a) */}
      <motion.div
        className="absolute inset-0"
        style={{
          background: "rgba(24,9,10,0.55)",
          opacity,
        }}
      />
    </motion.div>
  );
};

// ── Floating headline that drifts through the image ───────────────────────────
const OverlayCopy = ({ subheading, heading }) => {
  const targetRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: targetRef,
    offset: ["start end", "end start"],
  });

  const y       = useTransform(scrollYProgress, [0, 1], [250, -250]);
  const opacity = useTransform(scrollYProgress, [0.25, 0.5, 0.75], [0, 1, 0]);

  return (
    <motion.div
      ref={targetRef}
      style={{ y, opacity }}
      className="absolute left-0 top-0 flex h-screen w-full flex-col items-center justify-center text-white text-center px-6"
    >
      {/* Subheading — eyebrow style */}
      <p
        className="mb-3 md:mb-5 tracking-widest uppercase"
        style={{
          fontSize: "clamp(12px, 1.5vw, 16px)",
          fontWeight: 700,
          letterSpacing: "0.22em",
          color: "rgba(255,255,255,0.65)",
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        {subheading}
      </p>

      {/* Main heading — Cormorant Garamond display */}
      <p
        style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: "clamp(3rem, 8vw, 8rem)",
          fontWeight: 700,
          lineHeight: 0.92,
          letterSpacing: "-0.02em",
          whiteSpace: "pre-line",
        }}
      >
        {heading}
      </p>
    </motion.div>
  );
};

// ── Content card below each sticky image ─────────────────────────────────────
const SectionBody = ({ section }) => {
  const navigate = useNavigate();

  return (
    <div
      className="mx-auto grid max-w-5xl grid-cols-1 gap-8 px-4 pb-24 pt-12 md:grid-cols-12"
      style={{ background: "#FFF9F5" }}
    >
      {/* Left: section label + heading */}
      <div className="col-span-1 md:col-span-4">
        {/* Eyebrow */}
        <p
          className="mb-3 uppercase tracking-widest"
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.2em",
            color: section.accent,
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          {section.eyebrow}
        </p>

        <h2
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: "clamp(1.8rem, 3vw, 2.8rem)",
            fontWeight: 700,
            lineHeight: 1.05,
            color: "#18090a",
            whiteSpace: "pre-line",
          }}
        >
          {section.heading}
        </h2>

        {/* Coloured accent line */}
        <div
          style={{
            width: 40,
            height: 3,
            borderRadius: 2,
            background: section.accent,
            marginTop: 20,
          }}
        />
      </div>

      {/* Right: body copy + CTA */}
      <div className="col-span-1 md:col-span-8">
        <p
          className="mb-5"
          style={{
            fontSize: "clamp(16px, 1.6vw, 20px)",
            lineHeight: 1.7,
            color: "#4A2010",
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          {section.body1}
        </p>

        <p
          className="mb-9"
          style={{
            fontSize: "clamp(16px, 1.6vw, 20px)",
            lineHeight: 1.7,
            color: "#6B3A20",
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          {section.body2}
        </p>

        <button
          onClick={() => navigate(section.route)}
          className="inline-flex items-center gap-2 rounded-full px-8 py-4 text-white transition-all duration-300 hover:opacity-90 hover:-translate-y-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 w-full md:w-auto justify-center md:justify-start"
          style={{
            background: section.accent,
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: "0.07em",
            textTransform: "uppercase",
            fontFamily: "'DM Sans', sans-serif",
            boxShadow: `0 8px 24px ${section.accent}40`,
          }}
          aria-label={section.cta}
        >
          {section.cta}
          <ArrowUpRight size={18} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
};

export default TextParallaxSection;
