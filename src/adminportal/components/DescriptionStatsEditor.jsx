import React, { useEffect, useRef, useState } from "react";
import ProductDescriptionEditor from "./ProductDescriptionEditor";

const EMPTY_STAT = () => ({ stat: "", note: "" });

function parse(v) {
  const str = String(v ?? "").trim();
  if (!str) return { prose: "", stats: [] };
  if (/^\s*\{/.test(str)) {
    try {
      const obj = JSON.parse(str);
      if (obj.prose !== undefined)
        return { prose: String(obj.prose ?? ""), stats: Array.isArray(obj.stats) ? obj.stats : [] };
    } catch {}
  }
  return { prose: str, stats: [] };
}

function serialize(prose, stats) {
  const clean = stats.filter(s => s.stat.trim() || s.note.trim());
  if (!clean.length) return prose;
  return JSON.stringify({ prose, stats: clean });
}

export default function DescriptionStatsEditor({ value, onChange }) {
  const initial       = parse(value);
  const [prose, setProse] = useState(initial.prose);
  const [stats, setStats] = useState(initial.stats.length ? initial.stats : [EMPTY_STAT()]);
  const lastEmitted       = useRef(value);

  useEffect(() => {
    if (value !== lastEmitted.current) {
      const p = parse(value);
      setProse(p.prose);
      setStats(p.stats.length ? p.stats : [EMPTY_STAT()]);
      lastEmitted.current = value;
    }
  }, [value]);

  const emit = (newProse, newStats) => {
    const v = serialize(newProse, newStats);
    lastEmitted.current = v;
    onChange(v);
  };

  const onProseChange  = (newProse) => { setProse(newProse); emit(newProse, stats); };
  const emitStats      = (s)        => { setStats(s);        emit(prose, s);        };
  const addStat        = ()         => emitStats([...stats, EMPTY_STAT()]);
  const removeStat     = (i)        => emitStats(stats.filter((_, idx) => idx !== i));
  const updateStat     = (i, k, v)  => emitStats(stats.map((r, idx) => idx === i ? { ...r, [k]: v } : r));

  return (
    <div className="space-y-3">
      {/* Rich-text prose editor — full toolbar + live preview modal */}
      <ProductDescriptionEditor value={prose} onChange={onProseChange} />

      {/* Optional clinical / user stats */}
      <div className="rounded-xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between bg-slate-50 border-b border-slate-200 px-4 py-2.5">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
            Clinical / User Stats
          </span>
          <span className="text-[10px] text-slate-400">
            Optional — displayed as large numbers below the description
          </span>
        </div>

        {/* Column headers */}
        <div className="flex bg-slate-50/50 border-b border-slate-100 px-3 py-1.5">
          <div className="flex-[1] text-[10px] font-bold uppercase tracking-widest text-slate-400 px-2">Stat</div>
          <div className="flex-[3] text-[10px] font-bold uppercase tracking-widest text-slate-400 px-2">Note</div>
          <div className="w-9 shrink-0" />
        </div>

        <div className="divide-y divide-slate-100">
          {stats.map((row, i) => (
            <div key={i} className="flex items-center px-3 py-2 hover:bg-slate-50/60 transition-colors group">
              <div className="flex-[1] px-1.5">
                <input
                  type="text"
                  value={row.stat}
                  onChange={e => updateStat(i, "stat", e.target.value)}
                  placeholder="94%"
                  className="w-full text-sm bg-transparent border-b border-transparent hover:border-slate-300 focus:border-tenzy-teal focus:outline-none py-1 text-slate-800 placeholder:text-slate-300 transition-colors"
                />
              </div>
              <div className="flex-[3] px-1.5">
                <input
                  type="text"
                  value={row.note}
                  onChange={e => updateStat(i, "note", e.target.value)}
                  placeholder="of customers saw smoother texture in 14 nights"
                  className="w-full text-sm bg-transparent border-b border-transparent hover:border-slate-300 focus:border-tenzy-teal focus:outline-none py-1 text-slate-800 placeholder:text-slate-300 transition-colors"
                />
              </div>
              <div className="w-9 shrink-0 flex justify-center">
                <button
                  type="button"
                  onClick={() => removeStat(i)}
                  disabled={stats.length === 1}
                  className="h-7 w-7 flex items-center justify-center rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition opacity-0 group-hover:opacity-100 disabled:opacity-0"
                  title="Remove"
                >×</button>
              </div>
            </div>
          ))}
        </div>

        <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50/50">
          <button
            type="button"
            onClick={addStat}
            className="flex items-center gap-1.5 text-xs font-semibold transition hover:opacity-70"
            style={{ color: "#2BB9B4" }}
          >
            <span className="text-base leading-none">+</span> Add stat
          </button>
        </div>
      </div>
    </div>
  );
}
