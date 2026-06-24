import React, { useState } from "react";
import { faqs } from "@/const";
import { useNavigate } from "react-router-dom";

const FAQ_STYLES = `
  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .faq-item {
    animation: fadeInUp 0.6s ease-out forwards;
  }

  @for $i from 0 to 10 {
    .faq-item:nth-child(#{$i + 1}) {
      animation-delay: #{$i * 0.08}s;
    }
  }

  .faq-item:nth-child(1) { animation-delay: 0s; }
  .faq-item:nth-child(2) { animation-delay: 0.08s; }
  .faq-item:nth-child(3) { animation-delay: 0.16s; }
  .faq-item:nth-child(4) { animation-delay: 0.24s; }
  .faq-item:nth-child(5) { animation-delay: 0.32s; }
  .faq-item:nth-child(6) { animation-delay: 0.4s; }
  .faq-item:nth-child(7) { animation-delay: 0.48s; }
  .faq-item:nth-child(8) { animation-delay: 0.56s; }

  .faq-button:hover {
    background: linear-gradient(135deg, rgba(232, 82, 42, 0.05) 0%, rgba(43, 185, 180, 0.05) 100%);
  }

  .faq-button:active {
    background: linear-gradient(135deg, rgba(232, 82, 42, 0.1) 0%, rgba(43, 185, 180, 0.1) 100%);
  }

  .faq-icon-rotate {
    transition: transform 300ms cubic-bezier(0.4, 0.0, 0.2, 1);
  }

  .faq-content {
    transition: all 300ms cubic-bezier(0.4, 0.0, 0.2, 1);
  }
`;

const FAQ = () => {
  const [openIndex, setOpenIndex] = useState(null);
  const navigate = useNavigate();

  const toggle = (index) => {
    setOpenIndex((prev) => (prev === index ? null : index));
  };

  return (
    <section className="py-16 sm:py-20 md:py-28 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-white via-white to-blue-50/30">
      <style>{FAQ_STYLES}</style>

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12 sm:mb-16 md:mb-20">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-1 h-1 rounded-full bg-orange-500" />
            <span className="text-xs sm:text-sm font-bold text-orange-500 uppercase tracking-wider">
              Got Questions?
            </span>
            <div className="w-1 h-1 rounded-full bg-orange-500" />
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 mb-3 leading-tight">
            Frequently Asked
            <br />
            <span className="bg-gradient-to-r from-orange-500 to-pink-500 bg-clip-text text-transparent">
              Questions
            </span>
          </h2>

          <p className="text-sm sm:text-base md:text-lg text-slate-600 max-w-2xl mx-auto mt-4">
            Find answers to common questions about our beauty products, shipping, returns, and more. Can't find what you're looking for?
            <span className="block mt-2 text-slate-500">
              <button
                onClick={() => navigate("/contact")}
                className="text-teal-600 font-semibold hover:text-teal-700 transition-colors"
              >
                Contact our support team →
              </button>
            </span>
          </p>
        </div>

        {/* FAQ Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;

            return (
              <div
                key={index}
                className="faq-item group"
              >
                <div
                  className={`faq-button relative rounded-2xl border transition-all duration-300 overflow-hidden ${
                    isOpen
                      ? "border-orange-200 bg-gradient-to-br from-orange-50/80 to-teal-50/80"
                      : "border-slate-200 bg-white/80 backdrop-blur-sm hover:border-orange-200"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => toggle(index)}
                    aria-expanded={isOpen}
                    aria-controls={`faq-panel-${index}`}
                    className="w-full flex items-start gap-4 px-5 sm:px-6 py-5 sm:py-6 text-left transition-colors"
                  >
                    {/* Question Number */}
                    <div
                      className={`flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 ${
                        isOpen
                          ? "bg-gradient-to-br from-orange-500 to-pink-500 text-white shadow-lg"
                          : "bg-slate-100 text-slate-600 group-hover:bg-orange-100 group-hover:text-orange-600"
                      }`}
                    >
                      {String(index + 1).padStart(2, "0")}
                    </div>

                    {/* Question & Icon */}
                    <div className="flex-1 min-w-0">
                      <h3
                        className={`text-base sm:text-lg font-semibold leading-snug transition-colors ${
                          isOpen ? "text-orange-600" : "text-slate-900"
                        }`}
                      >
                        {faq.question}
                      </h3>
                    </div>

                    {/* Chevron Icon */}
                    <div
                      className={`flex-shrink-0 w-5 h-5 sm:w-6 sm:h-6 text-slate-400 faq-icon-rotate ${
                        isOpen ? "rotate-180 text-orange-500" : ""
                      }`}
                    >
                      <svg
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M19 14l-7 7m0 0l-7-7m7 7V3"
                        />
                      </svg>
                    </div>
                  </button>

                  {/* Answer Panel */}
                  <div
                    id={`faq-panel-${index}`}
                    className={`faq-content grid transition-all duration-300 ${
                      isOpen
                        ? "grid-rows-[1fr] opacity-100"
                        : "grid-rows-[0fr] opacity-0"
                    }`}
                  >
                    <div className="overflow-hidden">
                      <div className="px-5 sm:px-6 pb-5 sm:pb-6 border-t border-orange-200/50">
                        <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                          {faq.answer}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* CTA Section */}
        <div className="mt-16 sm:mt-20 md:mt-24 text-center">
          <div className="inline-block rounded-2xl bg-gradient-to-r from-orange-50 to-teal-50 border border-orange-200/50 p-8 sm:p-10 md:p-12 w-full sm:w-auto">
            <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">
              Still have questions?
            </h3>
            <p className="text-sm sm:text-base text-slate-600 mb-6">
              Our beauty experts are here to help. Get in touch with our support team.
            </p>
            <button
              onClick={() => navigate("/contact")}
              className="px-8 sm:px-10 py-3 sm:py-3.5 rounded-full bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white font-bold text-sm sm:text-base transition-all duration-300 hover:shadow-lg hover:shadow-orange-500/30 active:scale-95"
            >
              Contact Support Team →
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FAQ;
