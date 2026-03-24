import React, { useRef } from "react";
import { CatSelections } from "@/const";
import { useNavigate } from "react-router-dom";
import gsap from "gsap";
import { Draggable } from "gsap/Draggable";
import { useGSAP } from "@gsap/react";

// ScrollTrigger intentionally NOT used — we do NOT want vertical-scroll pinning.
// The page scrolls freely; only horizontal drag drives the carousel.
gsap.registerPlugin(Draggable);

// ─── Pure GSAP utility ────────────────────────────────────────────────────────
function buildSeamlessLoop(items, spacing, animateFunc) {
  const overlap     = Math.ceil(1 / spacing);
  const startTime   = items.length * spacing + 0.5;
  const loopTime    = (items.length + overlap) * spacing + 1;
  const rawSequence = gsap.timeline({ paused: true });
  const seamlessLoop = gsap.timeline({
    paused: true,
    repeat: -1,
    onRepeat() {
      if (this._time === this._dur) this._tTime += this._dur - 0.01;
    },
  });

  const total = items.length + overlap * 2;
  for (let i = 0; i < total; i++) {
    const index = i % items.length;
    rawSequence.add(animateFunc(items[index]), i * spacing);
    if (i <= items.length) seamlessLoop.add("label" + i, i * spacing);
  }

  rawSequence.time(startTime);
  seamlessLoop
    .to(rawSequence, {
      time: loopTime,
      duration: loopTime - startTime,
      ease: "none",
    })
    .fromTo(rawSequence,
      { time: overlap * spacing + 1 },
      { time: startTime, duration: startTime - (overlap * spacing + 1), immediateRender: false, ease: "none" }
    );

  return seamlessLoop;
}

// ─── Component ────────────────────────────────────────────────────────────────
const Categories = () => {
  const navigate     = useNavigate();
  const sectionRef   = useRef(null);
  const cardsRef     = useRef(null);   // <ul> — also the Draggable trigger
  const dragProxyRef = useRef(null);   // invisible Draggable proxy
  const ctrlRef      = useRef({ scrollToOffset: null, scrub: null, spacing: 0.1 });

  useGSAP(() => {
    const cards = gsap.utils.toArray(".cat-card", cardsRef.current);
    if (!cards.length) return;

    const SPACING = 0.1;
    const snapTime = gsap.utils.snap(SPACING);

    // Start every card hidden & off to the right
    gsap.set(cards, { xPercent: 400, opacity: 0, scale: 0 });

    // Each card: scale/fade in-and-out while sliding from right to left
    const animateFunc = (el) => {
      const tl = gsap.timeline();
      tl.fromTo(el,
        { scale: 0, opacity: 0 },
        { scale: 1, opacity: 1, zIndex: 100, duration: 0.5, yoyo: true, repeat: 1, ease: "power1.in", immediateRender: false }
      ).fromTo(el,
        { xPercent: 400 },
        { xPercent: -400, duration: 1, ease: "none", immediateRender: false },
        0
      );
      return tl;
    };

    const seamlessLoop = buildSeamlessLoop(cards, SPACING, animateFunc);
    const playhead     = { offset: 0 };
    const wrapTime     = gsap.utils.wrap(0, seamlessLoop.duration());

    // Smooth scrub proxy — reused on every update instead of spawning new tweens
    const scrub = gsap.to(playhead, {
      offset: 0,
      onUpdate() { seamlessLoop.time(wrapTime(playhead.offset)); },
      duration: 0.5,
      ease: "power3",
      paused: true,
    });

    const scrollToOffset = (offset) => {
      scrub.vars.offset = snapTime(offset);
      scrub.invalidate().restart();
    };

    // ── Draggable ──────────────────────────────────────────────────────────
    // type:"x"               → horizontal drag only
    // allowNativeTouchScrolling: true → vertical finger-scroll still scrolls the page;
    //                                   only a clear horizontal swipe drives the carousel
    Draggable.create(dragProxyRef.current, {
      type: "x",
      trigger: cardsRef.current,
      allowNativeTouchScrolling: true,
      onPress() {
        this.startOffset = scrub.vars.offset;
      },
      onDrag() {
        scrub.vars.offset = this.startOffset + (this.startX - this.x) * 0.0012;
        scrub.invalidate().restart();
      },
      onDragEnd() {
        scrollToOffset(scrub.vars.offset);
      },
    });

    ctrlRef.current = { scrollToOffset, scrub, spacing: SPACING };
  }, { scope: sectionRef });

  const goPrev = () => {
    const { scrollToOffset, scrub, spacing } = ctrlRef.current;
    if (scrollToOffset && scrub) scrollToOffset(scrub.vars.offset - spacing);
  };
  const goNext = () => {
    const { scrollToOffset, scrub, spacing } = ctrlRef.current;
    if (scrollToOffset && scrub) scrollToOffset(scrub.vars.offset + spacing);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <section
        ref={sectionRef}
        className="relative w-full overflow-hidden"
        style={{
          paddingTop: "72px",
          paddingBottom: "72px",
          background: "linear-gradient(135deg, rgba(43,185,180,0.08) 0%, #ffffff 45%, rgba(232,82,42,0.07) 100%)",
        }}
      >
        {/* ── Section header ─────────────────────────────────────────────── */}
        <div className="text-center px-5 mb-10 select-none">
          <span className="inline-flex items-center gap-2 mb-3 text-xs font-semibold tracking-[0.18em] uppercase text-tenzy-teal">
            <span className="h-px w-8 bg-tenzy-teal" />
            Shop by Category
            <span className="h-px w-8 bg-tenzy-teal" />
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-zinc-900 leading-tight">
            Find your{" "}
            <span className="text-tenzy-orange">perfect</span> match
          </h2>
          <p className="mt-2 text-sm text-zinc-400">
            Drag left or right — or tap the buttons below
          </p>
        </div>

        {/* ── Gallery area ───────────────────────────────────────────────── */}
        {/* overflow:hidden clips cards as they fly in/out horizontally     */}
        <div
          className="relative w-full overflow-hidden"
          style={{ height: "480px" }}
        >
          <ul
            ref={cardsRef}
            className="absolute p-0 m-0 list-none"
            style={{
              /* The <ul> is just a positioning anchor; cards overflow it.   */
              /* Its own size doesn't clip the cards — the parent div does.  */
              width: "20rem",
              height: "calc(20rem * 4 / 3)",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
            }}
          >
            {CatSelections.map((item, i) => (
              <li
                key={i}
                className="cat-card absolute rounded-3xl overflow-hidden cursor-pointer"
                style={{
                  width: "20rem",        /* 320 px — big enough for text   */
                  aspectRatio: "3 / 4",  /* 320 × 427 px                   */
                  top: 0,
                  left: 0,
                  backgroundImage: `url(${item.image})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  boxShadow: "0 24px 64px rgba(0,0,0,0.22)",
                }}
                onClick={() => navigate(`/products?category=${item.category}`)}
              >
                {/* Gradient overlay — plenty of space for text */}
                <div
                  className="absolute inset-0 flex flex-col justify-end"
                  style={{
                    background:
                      "linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.35) 45%, transparent 75%)",
                    padding: "1.5rem",
                  }}
                >
                  <p className="text-white font-bold text-xl leading-snug">
                    {item.title}
                  </p>
                  <p className="text-white/65 text-sm mt-1.5 leading-relaxed line-clamp-2">
                    {item.description}
                  </p>
                  <span
                    className="mt-3 self-start inline-flex items-center gap-1.5 rounded-full text-white text-xs font-bold px-4 py-1.5"
                    style={{ background: "#E8522A" }}
                  >
                    Shop {item.title} →
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* ── Prev / Next ────────────────────────────────────────────────── */}
        <div className="flex items-center justify-center gap-4 mt-8">
          <button
            onClick={goPrev}
            className="rounded-full border-2 text-sm font-semibold px-7 py-2.5 transition-all active:scale-95"
            style={{ borderColor: "#2BB9B4", color: "#2BB9B4" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#2BB9B4";
              e.currentTarget.style.color = "#fff";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "#2BB9B4";
            }}
          >
            ← Prev
          </button>
          <button
            onClick={goNext}
            className="rounded-full text-white text-sm font-bold px-7 py-2.5 transition-all active:scale-95"
            style={{
              background: "#E8522A",
              boxShadow: "0 8px 24px rgba(232,82,42,0.30)",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.88")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
          >
            Next →
          </button>
        </div>
      </section>

      {/* Drag proxy — invisible, outside the section, no layout impact */}
      <div
        ref={dragProxyRef}
        style={{ visibility: "hidden", position: "absolute", pointerEvents: "none" }}
      />
    </>
  );
};

export default Categories;
