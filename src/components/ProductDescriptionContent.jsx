import React, { useMemo, useState } from "react";

const inlineParts = (text) => {
  const parts = [];
  const pattern = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let lastIndex = 0;
  let match;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: "text", text: text.slice(lastIndex, match.index) });
    }

    const value = match[0];
    parts.push(value.startsWith("**")
      ? { type: "bold", text: value.slice(2, -2) }
      : { type: "italic", text: value.slice(1, -1) });
    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push({ type: "text", text: text.slice(lastIndex) });
  }

  return parts.length ? parts : [{ type: "text", text }];
};

const renderInline = (text) => inlineParts(text).map((part, index) => {
  if (part.type === "bold") return <strong key={index} className="font-bold text-slate-900">{part.text}</strong>;
  if (part.type === "italic") return <em key={index} className="italic">{part.text}</em>;
  return <React.Fragment key={index}>{part.text}</React.Fragment>;
});

const HTML_TAG_RE = /<[a-z][\s\S]*?>/i;
const JSON_ARR_RE  = /^\s*\[/;

const ING_COLS = [
  { key: "ingredient",    label: "Ingredient"      },
  { key: "concentration", label: "Concentration"   },
  { key: "purpose",       label: "Purpose / Usage" },
  { key: "notes",         label: "Notes"           },
];

function IngredientsTable({ rows }) {
  // Only render columns that have at least one non-empty value
  const activeCols = ING_COLS.filter((c) => rows.some((r) => r[c.key]?.trim()));
  if (!activeCols.length) return null;
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            {activeCols.map((c) => (
              <th key={c.key} className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-500 whitespace-nowrap">
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row, i) => (
            <tr key={i} className="hover:bg-slate-50/60 transition-colors">
              {activeCols.map((c) => (
                <td key={c.key} className="px-4 py-2.5 text-slate-700 align-top">
                  {row[c.key] || <span className="text-slate-300">—</span>}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ProductDescriptionContent({ value, emptyText = "No description available." }) {
  const str = String(value ?? "").trim();

  // Structured ingredients JSON — render as a table
  const ingredientRows = useMemo(() => {
    if (!JSON_ARR_RE.test(str)) return null;
    try {
      const arr = JSON.parse(str);
      if (Array.isArray(arr) && arr.length) return arr;
    } catch {}
    return null;
  }, [str]);

  const isHtml = !ingredientRows && HTML_TAG_RE.test(str);

  // Always call useMemo unconditionally (rules of hooks)
  const lines = useMemo(
    () => (ingredientRows || isHtml) ? [] : str.split(/\r?\n/).map((line) => line.trim()).filter(Boolean),
    [str, isHtml, ingredientRows]
  );

  // Structured ingredients JSON
  if (ingredientRows) {
    return <IngredientsTable rows={ingredientRows} />;
  }

  // HTML stored by a rich-text editor — render with scoped description-html styles
  if (isHtml) {
    return (
      <div
        className="description-html text-sm leading-relaxed text-slate-700"
        dangerouslySetInnerHTML={{ __html: str }}
      />
    );
  }

  if (!lines.length) {
    return <p className="text-sm leading-relaxed text-slate-500">{emptyText}</p>;
  }

  return (
    <div className="space-y-2 text-sm leading-relaxed text-slate-700">
      {lines.map((line, index) => {
        const heading = line.match(/^#{1,3}\s+(.+)$/);
        const bullet = line.match(/^[-*]\s+(.+)$/);
        const numbered = line.match(/^(\d+)[.)]\s+(.+)$/);

        if (heading) {
          return <h4 key={index} className="text-base font-bold text-slate-900">{renderInline(heading[1])}</h4>;
        }

        if (bullet) {
          return (
            <div key={index} className="flex gap-2">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-tenzy-teal" />
              <span>{renderInline(bullet[1])}</span>
            </div>
          );
        }

        if (numbered) {
          return (
            <div key={index} className="flex gap-2">
              <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-tenzy-teal/10 px-1 text-[11px] font-bold text-tenzy-teal">
                {numbered[1]}
              </span>
              <span>{renderInline(numbered[2])}</span>
            </div>
          );
        }

        return <p key={index}>{renderInline(line)}</p>;
      })}
    </div>
  );
}

export function ExpandableProductDescription({
  value,
  title = "Description",
  collapsedText = "View description",
}) {
  const [open, setOpen] = useState(false);
  const raw = String(value ?? "");
  const plainText = HTML_TAG_RE.test(raw)
    ? raw.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
    : raw
        .replace(/^#{1,3}\s+/gm, "")
        .replace(/\*\*(.*?)\*\*/g, "$1")
        .replace(/\*(.*?)\*/g, "$1")
        .replace(/^[-*]\s+/gm, "")
        .replace(/^\d+[.)]\s+/gm, "")
        .replace(/\s+/g, " ")
        .trim();

  if (!plainText) return null;

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-slate-600">{title}</p>
          {!open && (
            <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-500">
              {plainText}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          className="shrink-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 transition hover:border-tenzy-teal/40 hover:bg-tenzy-teal/5 hover:text-tenzy-teal"
        >
          {open ? "Hide" : collapsedText}
        </button>
      </div>

      {open && (
        <div className="mt-3 border-t border-slate-100 pt-3">
          <ProductDescriptionContent value={value} />
        </div>
      )}
    </div>
  );
}
