import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import gsap from "gsap";

export default function ProductSearchDropdown({ products = [], onClose }) {
  const navigate = useNavigate();

  const rootRef = useRef(null);
  const panelRef = useRef(null);
  const listRef = useRef(null);
  const inputRef = useRef(null);
  const tlRef = useRef(null);
  const closingRef = useRef(false);

  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);

  const results = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return [];
    return products
      .filter((p) => (p?.name || "").toLowerCase().includes(query))
      .slice(0, 6);
  }, [q, products]);

  // Open animation (glass panel + list stagger)
  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.set(panelRef.current, {
        autoAlpha: 0,
        y: -10,
        scale: 0.98,
        transformOrigin: "top right",
      });

      tlRef.current = gsap
        .timeline({ defaults: { ease: "power3.out" } })
        .to(panelRef.current, { autoAlpha: 1, y: 0, scale: 1, duration: 0.22 });

      // items stagger (if any)
      const items = listRef.current?.querySelectorAll("[data-item='true']");
      if (items && items.length) {
        gsap.set(items, { autoAlpha: 0, y: -6 });
        tlRef.current.to(
          items,
          { autoAlpha: 1, y: 0, duration: 0.18, stagger: 0.03 },
          "-=0.08"
        );
      }
    }, rootRef);

    // focus input after mount
    requestAnimationFrame(() => inputRef.current?.focus());

    return () => ctx.revert();
  }, []);

  // Re-stagger when results change
  useLayoutEffect(() => {
    const items = listRef.current?.querySelectorAll("[data-item='true']");
    if (!items || !items.length) return;

    gsap.killTweensOf(items);
    gsap.set(items, { autoAlpha: 0, y: -6 });
    gsap.to(items, {
      autoAlpha: 1,
      y: 0,
      duration: 0.18,
      ease: "power3.out",
      stagger: 0.03,
    });
  }, [results.length]);

  const requestClose = () => {
    if (closingRef.current) return;
    closingRef.current = true;

    const items = listRef.current?.querySelectorAll("[data-item='true']");
    const tl = gsap.timeline({
      defaults: { ease: "power3.inOut" },
      onComplete: () => onClose?.(),
    });

    if (items && items.length) {
      tl.to(items, { autoAlpha: 0, y: -4, duration: 0.12, stagger: 0.02 }, 0);
    }
    tl.to(
      panelRef.current,
      { autoAlpha: 0, y: -10, scale: 0.98, duration: 0.18 },
      0.02
    );
  };

  useEffect(() => {
    const handler = (e) => {
      if (!rootRef.current?.contains(e.target)) requestClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const goTo = (p) => {
    if (!p?.id) return;
    requestClose();
    navigate(`/product/${p.id}`);
  };

  const onKeyDown = (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      requestClose();
      return;
    }

    if (!results.length) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((v) => Math.min(v + 1, results.length - 1));
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((v) => Math.max(v - 1, 0));
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();
      goTo(results[active]);
    }
  };

  const highlightActive = (index) => {
    setActive(index);
    const btn = listRef.current?.querySelector(`[data-index='${index}']`);
    if (!btn) return;
    gsap.fromTo(
      btn,
      { scale: 0.995 },
      { scale: 1, duration: 0.15, ease: "power3.out" }
    );
  };

  return (
    <div ref={rootRef} className="absolute right-0 top-full mt-3 z-50">
      <div
        ref={panelRef}
        className="
          w-80 rounded-2xl overflow-hidden
          border border-black/40
          bg-[#f78104] backdrop-blur-xl
          shadow-[0_20px_60px_-20px_rgba(0,0,0,0.55)]
        "
      >
        {/* Input */}
        <div className="px-3 pt-3 pb-2">
          <div className="relative">
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setActive(0);
              }}
              onKeyDown={onKeyDown}
              placeholder="Search products..."
              className="
                w-full rounded-xl
                bg-white/10 text-white placeholder-white/60
                border border-white/15
                px-4 py-3
                outline-none
                focus:border-white/30
              "
            />
            {/* subtle shine */}
            <div className="pointer-events-none absolute inset-0 rounded-xl bg-linear-to-b from-white/10 to-transparent" />
          </div>
        </div>

        {/* Results */}
        <div ref={listRef} className="pb-2">
          {results.length > 0 && (
            <div className="px-2">
              {results.map((p, i) => (
                <button
                  key={p.id}
                  type="button"
                  data-item="true"
                  data-index={i}
                  onMouseEnter={() => highlightActive(i)}
                  onClick={() => goTo(p)}
                  className={`
                    group w-full text-left
                    px-3 py-3 rounded-xl
                    transition
                    ${i === active ? "bg-white/15" : "hover:bg-white/10"}
                  `}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-white">
                        {p.name}
                      </div>
                      {p.category && (
                        <div className="truncate text-xs text-white/60 mt-0.5">
                          {p.category}
                        </div>
                      )}
                    </div>

                    {/* small modern indicator */}
                    <span
                      className={`
                        text-white/60 text-xs
                        transition
                        ${i === active ? "translate-x-0 opacity-100" : "translate-x-1 opacity-0 group-hover:opacity-100 group-hover:translate-x-0"}
                      `}
                    >
                      ↵
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {q && results.length === 0 && (
            <div className="px-4 pb-4 text-sm text-white/70">
              No results found
            </div>
          )}
        </div>

        {/* Footer hint (optional micro UI; remove if you want zero extras) */}
        <div className="px-4 py-3 border-t border-white/10 text-xs text-white/60 flex items-center justify-between">
          <span>↑ ↓ to navigate</span>
          <button
            type="button"
            onClick={requestClose}
            className="text-white/70 hover:text-white transition"
          >
            Esc to close
          </button>
        </div>
      </div>
    </div>
  );
}
