import React, { useRef, useState } from "react";
import { faqs } from "@/const";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const FAQ = () => {
  const [openIndex, setOpenIndex] = useState(null);
  const rootRef = useRef(null);

  useGSAP(
    () => {
      // Section entrance
      gsap.fromTo(
        ".faq-reveal",
        { y: 30, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.9,
          ease: "power2.out",
          stagger: 0.08,
          scrollTrigger: {
            trigger: rootRef.current,
            start: "top 75%",
          },
        }
      );
    },
    { scope: rootRef }
  );

  const toggle = (index) => {
    setOpenIndex((prev) => (prev === index ? null : index));
  };

  return (
    <section ref={rootRef} className="py-14 md:py-20 px-4">
      <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-10 items-start">
        {/* Left image */}
        <div className="faq-reveal">
          <div className="relative overflow-hidden rounded-2xl">
            <img
              className="w-full h-[320px] md:h-[520px] object-cover"
              src="https://images.unsplash.com/photo-1555212697-194d092e3b8f?q=80&w=1200&auto=format&fit=crop"
              alt="FAQ"
            />
            {/* subtle overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
          </div>
        </div>

        {/* Right content */}
        <div className="faq-reveal">
          <p className="text-[#08b6b1] text-sm font-semibold tracking-wide">
            FAQ
          </p>

          <h2 className="mt-2 text-3xl md:text-4xl font-semibold text-slate-900">
            Looking for answers?
          </h2>

          <p className="mt-3 text-sm md:text-base text-slate-600 max-w-xl">
            Quick answers to the most common questions. If you can’t find what
            you need, contact us anytime.
          </p>

          {/* FAQ list */}
          <div className="mt-6 space-y-3">
            {faqs.map((faq, index) => {
              const isOpen = openIndex === index;

              return (
                <div
                  key={index}
                  className="faq-reveal rounded-2xl border border-slate-200/80 bg-white/70 backdrop-blur-md shadow-sm overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => toggle(index)}
                    aria-expanded={isOpen}
                    aria-controls={`faq-panel-${index}`}
                    className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left"
                  >
                    <span className="text-base md:text-[15px] font-medium text-slate-900">
                      {faq.question}
                    </span>

                    <span
                      className={`shrink-0 grid place-items-center h-9 w-9 rounded-full border border-slate-200 bg-white transition-transform duration-300 ${
                        isOpen ? "rotate-180" : "rotate-0"
                      }`}
                    >
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 18 18"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="m4.5 7.2 3.793 3.793a1 1 0 0 0 1.414 0L13.5 7.2"
                          stroke="#0f172a"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                  </button>

                  {/* Panel (smooth height + opacity) */}
                  <div
                    id={`faq-panel-${index}`}
                    className={`grid transition-all duration-400 ease-out ${
                      isOpen
                        ? "grid-rows-[1fr] opacity-100"
                        : "grid-rows-[0fr] opacity-0"
                    }`}
                  >
                    <div className="overflow-hidden">
                      <p className="px-5 pb-5 text-sm md:text-[15px] text-slate-600 leading-relaxed">
                        {faq.answer}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Optional CTA */}
          <div className="faq-reveal mt-6 flex flex-wrap items-center gap-3">
            <button className="rounded-full bg-[#f05c26] px-5 py-2.5 text-white text-sm font-semibold hover:opacity-90 transition">
              Contact Support
            </button>
            <button className="rounded-full border border-slate-300 px-5 py-2.5 text-slate-900 text-sm font-semibold hover:bg-slate-50 transition">
              View Policies
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FAQ;
