import React, { useEffect, useRef, useState } from "react";

const COLUMNS = [
  { key: "ingredient",    label: "Ingredient",      placeholder: "e.g. Hyaluronic Acid", flex: "flex-[2.5]" },
  { key: "concentration", label: "Concentration",   placeholder: "e.g. 1%",              flex: "flex-[1]"   },
  { key: "purpose",       label: "Purpose / Usage", placeholder: "e.g. Hydration",       flex: "flex-[2]"   },
  { key: "notes",         label: "Notes",           placeholder: "optional",             flex: "flex-[1.5]" },
];

const EMPTY_ROW = () => ({ ingredient: "", concentration: "", purpose: "", notes: "" });

function parse(v) {
  if (!v) return [EMPTY_ROW()];
  try {
    const arr = JSON.parse(v);
    if (Array.isArray(arr) && arr.length) return arr.map((r) => ({ ...EMPTY_ROW(), ...r }));
  } catch {}
  // Legacy plain-text: keep one empty row so the editor is usable
  return [EMPTY_ROW()];
}

export default function IngredientsTableEditor({ value, onChange }) {
  const [rows, setRows] = useState(() => parse(value));
  const lastEmitted = useRef(value);

  // Sync when parent resets the form (e.g. switches to a different product)
  useEffect(() => {
    if (value !== lastEmitted.current) {
      setRows(parse(value));
      lastEmitted.current = value;
    }
  }, [value]);

  const emit = (newRows) => {
    setRows(newRows);
    const json = JSON.stringify(newRows);
    lastEmitted.current = json;
    onChange(json);
  };

  const addRow    = ()        => emit([...rows, EMPTY_ROW()]);
  const removeRow = (i)       => emit(rows.filter((_, idx) => idx !== i));
  const updateCell = (i, key, val) =>
    emit(rows.map((r, idx) => (idx === i ? { ...r, [key]: val } : r)));

  return (
    <div className="rounded-xl border border-slate-200 overflow-hidden">
      {/* Column headers */}
      <div className="flex gap-0 bg-slate-50 border-b border-slate-200 px-3 py-2">
        {COLUMNS.map((c) => (
          <div key={c.key} className={`${c.flex} text-[10px] font-bold uppercase tracking-widest text-slate-500 px-2`}>
            {c.label}
          </div>
        ))}
        <div className="w-9 shrink-0" />
      </div>

      {/* Rows */}
      <div className="divide-y divide-slate-100">
        {rows.map((row, i) => (
          <div key={i} className="flex items-center gap-0 px-3 py-2 hover:bg-slate-50/60 transition-colors group">
            {COLUMNS.map((c) => (
              <div key={c.key} className={`${c.flex} px-1.5`}>
                <input
                  type="text"
                  value={row[c.key] || ""}
                  onChange={(e) => updateCell(i, c.key, e.target.value)}
                  placeholder={c.placeholder}
                  className="w-full text-sm bg-transparent border-b border-transparent hover:border-slate-300 focus:border-tenzy-teal focus:outline-none py-1 text-slate-800 placeholder:text-slate-300 transition-colors"
                />
              </div>
            ))}
            <div className="w-9 shrink-0 flex justify-center">
              <button
                type="button"
                onClick={() => removeRow(i)}
                disabled={rows.length === 1}
                className="h-7 w-7 flex items-center justify-center rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition opacity-0 group-hover:opacity-100 disabled:opacity-0"
                title="Remove row"
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Footer: add row */}
      <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50/50">
        <button
          type="button"
          onClick={addRow}
          className="flex items-center gap-1.5 text-xs font-semibold transition hover:opacity-70"
          style={{ color: "#2BB9B4" }}
        >
          <span className="text-base leading-none">+</span> Add ingredient
        </button>
      </div>
    </div>
  );
}
