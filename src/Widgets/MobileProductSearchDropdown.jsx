import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import gsap from "gsap";

const MobileProductSearchDropdown = ({
  products,
  query,
  open,
  onClose,
  onSelect,
}) => {
  const navigate = useNavigate();
  const boxRef = useRef(null);
  const [active, setActive] = useState(0);

  const results = useMemo(() => {
    const q = (query || "").trim().toLowerCase();
    if (!q) return [];
    return (products || open ? products : [])
      .filter((p) => (p.name || "").toLowerCase().includes(q))
      .slice(0, 8);
  }, [query, products, open]);

  useEffect(() => {
    setActive(0);
  }, [query]);

  useLayoutEffect(() => {
    if (!open || !boxRef.current) return;

    gsap.fromTo(
      boxRef.current,
      { autoAlpha: 0, y: -8, scale: 0.99 },
      { autoAlpha: 1, y: 0, scale: 1, duration: 0.18, ease: "power2.out" }
    );
  }, [open, results.length]);

  const goTo = (p) => {
    navigate(`/product/${p.id}`);
    onSelect?.(p);
    onClose?.();
  };

  const onKeyDown = (e) => {
    if (!open) return;

    if (e.key === "Escape") {
      onClose?.();
      return;
    }

    if (!results.length) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((v) => Math.min(v + 1, results.length - 1));
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((v) => Math.max(v - 1, 0));
    }

    if (e.key === "Enter") {
      e.preventDefault();
      goTo(results[active]);
    }
  };

  if (!open) return null;

  return (
    <div ref={boxRef} className="w-full" onKeyDown={onKeyDown}>
      {/* If no query */}
      {!query?.trim() ? (
        <div className="rounded-3xl border border-white/15 bg-white/10 backdrop-blur p-4">
          <p className="text-sm text-white/70">
            Type a product name to search…
          </p>
        </div>
      ) : results.length === 0 ? (
        <div className="rounded-3xl border border-white/15 bg-white/10 backdrop-blur p-4">
          <p className="text-sm text-white/70">No results found</p>
        </div>
      ) : (
        <div className="rounded-3xl border border-white/15 bg-white/10 backdrop-blur overflow-hidden">
          <div className="px-4 py-3 border-b border-white/10">
            <p className="text-xs font-semibold text-white/70 tracking-wide">
              RESULTS
            </p>
          </div>

          <div className="max-h-320px overflow-y-auto">
            {results.map((p, i) => (
              <button
                key={p.id}
                type="button"
                onMouseEnter={() => setActive(i)}
                onClick={() => goTo(p)}
                className={`w-full px-4 py-3 text-left flex items-center gap-3 transition
                  ${i === active ? "bg-white/10" : "bg-transparent hover:bg-white/5"}`}
              >
                {/* thumb */}
                <div className="h-11 w-11 rounded-2xl overflow-hidden border border-white/10 bg-black/20 shrink-0">
                  <img
                    src={p.image}
                    alt={p.name}
                    className="h-full w-full object-cover"
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-white truncate">
                    {p.name}
                  </p>
                  <p className="text-xs text-white/60 truncate">
                    {p.brand ? `${p.brand} • ` : ""}
                    {p.category || ""}
                  </p>
                </div>

                {/* action hint */}
                <div className="shrink-0 text-xs font-semibold text-white/70">
                  View →
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MobileProductSearchDropdown;
