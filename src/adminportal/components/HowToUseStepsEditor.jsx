import React, { useEffect, useRef, useState } from "react";

const COLS = [
  { key: "title", label: "Step Title",    placeholder: "e.g. Cleanse",                flex: "flex-[1.5]" },
  { key: "body",  label: "Instructions",  placeholder: "Describe the step in detail…", flex: "flex-[3]"   },
];

const EMPTY = () => ({ title: "", body: "" });

function parse(v) {
  if (!v) return [EMPTY()];
  try {
    const arr = JSON.parse(v);
    if (Array.isArray(arr) && arr.length) return arr.map(r => ({ ...EMPTY(), ...r }));
  } catch {}
  return [EMPTY()];
}

export default function HowToUseStepsEditor({ value, onChange }) {
  const [rows, setRows] = useState(() => parse(value));
  const lastEmitted = useRef(value);

  useEffect(() => {
    if (value !== lastEmitted.current) {
      setRows(parse(value));
      lastEmitted.current = value;
    }
  }, [value]);

  const emit = (next) => {
    setRows(next);
    const json = JSON.stringify(next);
    lastEmitted.current = json;
    onChange(json);
  };

  const addRow    = ()          => emit([...rows, EMPTY()]);
  const removeRow = (i)         => emit(rows.filter((_, idx) => idx !== i));
  const update    = (i, k, val) => emit(rows.map((r, idx) => idx === i ? { ...r, [k]: val } : r));

  return (
    <div className="rounded-xl border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="flex bg-slate-50 border-b border-slate-200 px-3 py-2">
        <div className="w-10 shrink-0 text-[10px] font-bold uppercase tracking-widest text-slate-500 px-2">#</div>
        {COLS.map(c => (
          <div key={c.key} className={`${c.flex} text-[10px] font-bold uppercase tracking-widest text-slate-500 px-2`}>{c.label}</div>
        ))}
        <div className="w-9 shrink-0" />
      </div>

      {/* Rows */}
      <div className="divide-y divide-slate-100">
        {rows.map((row, i) => (
          <div key={i} className="flex items-start px-3 py-2.5 hover:bg-slate-50/60 transition-colors group">
            <div className="w-10 shrink-0 px-2 pt-2.5 text-xs font-bold text-slate-300 tabular-nums">
              {String(i + 1).padStart(2, "0")}
            </div>
            {COLS.map(c => (
              <div key={c.key} className={`${c.flex} px-1.5`}>
                {c.key === "body" ? (
                  <textarea
                    value={row[c.key] || ""}
                    onChange={e => update(i, c.key, e.target.value)}
                    placeholder={c.placeholder}
                    rows={2}
                    className="w-full text-sm bg-transparent border-b border-transparent hover:border-slate-300 focus:border-tenzy-teal focus:outline-none py-1 text-slate-800 placeholder:text-slate-300 transition-colors resize-none"
                  />
                ) : (
                  <input
                    type="text"
                    value={row[c.key] || ""}
                    onChange={e => update(i, c.key, e.target.value)}
                    placeholder={c.placeholder}
                    className="w-full text-sm bg-transparent border-b border-transparent hover:border-slate-300 focus:border-tenzy-teal focus:outline-none py-1 text-slate-800 placeholder:text-slate-300 transition-colors"
                  />
                )}
              </div>
            ))}
            <div className="w-9 shrink-0 flex justify-center pt-1.5">
              <button
                type="button"
                onClick={() => removeRow(i)}
                disabled={rows.length === 1}
                className="h-7 w-7 flex items-center justify-center rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition opacity-0 group-hover:opacity-100 disabled:opacity-0"
                title="Remove step"
              >×</button>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50/50">
        <button
          type="button"
          onClick={addRow}
          className="flex items-center gap-1.5 text-xs font-semibold transition hover:opacity-70"
          style={{ color: "#2BB9B4" }}
        >
          <span className="text-base leading-none">+</span> Add step
        </button>
      </div>
    </div>
  );
}
