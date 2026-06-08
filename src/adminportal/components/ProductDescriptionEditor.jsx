import React, { useRef, useState } from "react";
import {
  AlignLeft, Bold, Check, Eye, Heading2, Italic, List, ListOrdered,
  Pencil, Sparkles, X,
} from "lucide-react";
import ProductDescriptionContent from "../../components/ProductDescriptionContent";

const tools = [
  { label: "Heading", title: "Heading", icon: Heading2, action: "heading" },
  { label: "Bold", title: "Bold", icon: Bold, action: "bold" },
  { label: "Italic", title: "Italic", icon: Italic, action: "italic" },
  { label: "Bullets", title: "Bullet list", icon: List, action: "bullet" },
  { label: "Numbers", title: "Numbered list", icon: ListOrdered, action: "numbered" },
  { label: "Intro", title: "Intro paragraph", icon: AlignLeft, action: "intro" },
];

const defaultIntro = "A gentle everyday formula designed to support a simple skincare routine.";

const stripMarkdown = (text) => String(text ?? "")
  .replace(/^#{1,3}\s+/gm, "")
  .replace(/\*\*(.*?)\*\*/g, "$1")
  .replace(/\*(.*?)\*/g, "$1")
  .replace(/^[-*]\s+/gm, "")
  .replace(/^\d+[.)]\s+/gm, "")
  .trim();

export function ProductDescriptionPreview({ value, emptyText = "No description added yet." }) {
  return <ProductDescriptionContent value={value} emptyText={emptyText} />;
}

export default function ProductDescriptionEditor({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value ?? "");
  const textareaRef = useRef(null);
  const plainSummary = stripMarkdown(value);

  const openDialog = () => {
    setDraft(value ?? "");
    setOpen(true);
  };

  const updateSelection = (formatter) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const before = draft.slice(0, start);
    const selected = draft.slice(start, end);
    const after = draft.slice(end);
    const fallback = selected || "text";
    const nextText = formatter({ before, selected: fallback, hasSelection: Boolean(selected), start });

    setDraft(`${before}${nextText}${after}`);
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(start, start + nextText.length);
    });
  };

  const applyTool = (action) => {
    if (action === "intro") {
      setDraft((current) => `${current.trimEnd()}${current.trim() ? "\n" : ""}${defaultIntro}`);
      return;
    }

    updateSelection(({ selected, hasSelection, start }) => {
      if (action === "heading") return selected.startsWith("## ") ? selected : `## ${selected}`;
      if (action === "bold") return `**${selected}**`;
      if (action === "italic") return `*${selected}*`;
      if (action === "bullet") {
        const lines = selected.split(/\r?\n/);
        return lines.map((line) => line.trim().startsWith("- ") ? line : `- ${line || "List item"}`).join("\n");
      }
      if (action === "numbered") {
        const lines = selected.split(/\r?\n/);
        return lines.map((line, index) => {
          const text = line.replace(/^\d+[.)]\s+/, "").trim() || "List item";
          return `${index + 1}. ${text}`;
        }).join("\n");
      }
      return hasSelection || start >= 0 ? selected : "";
    });
  };

  const save = () => {
    onChange(draft.trim());
    setOpen(false);
  };

  return (
    <>
      <div className="rounded-2xl border border-tenzy-orange/50 bg-white p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-800">Product description</p>
            <p className="mt-1 line-clamp-2 text-sm leading-5 text-slate-500">
              {plainSummary || "Open the editor to add styled text, bullets, and product notes."}
            </p>
          </div>
          <button
            type="button"
            onClick={openDialog}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-tenzy-teal px-3 py-2 text-xs font-bold text-white transition hover:opacity-90"
          >
            <Pencil size={14} />
            {value ? "Edit" : "Add"}
          </button>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div className="relative flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <p className="text-lg font-bold text-slate-900">Product Description</p>
                <p className="text-xs text-slate-500">Choose text styles like an email editor.</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>

            <div className="border-b border-slate-100 bg-slate-50 px-4 py-2">
              <div className="flex flex-wrap gap-1.5">
                {tools.map((tool) => {
                  const Icon = tool.icon;
                  return (
                    <button
                      key={tool.action}
                      type="button"
                      title={tool.title}
                      onClick={() => applyTool(tool.action)}
                      className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-600 transition hover:border-tenzy-teal/40 hover:bg-tenzy-teal/5 hover:text-tenzy-teal"
                    >
                      <Icon size={14} />
                      <span>{tool.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid min-h-0 flex-1 grid-cols-1 overflow-y-auto md:grid-cols-2">
              <div className="border-b border-slate-100 p-4 md:border-b-0 md:border-r">
                <textarea
                  ref={textareaRef}
                  rows={14}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Write the description here. Select text, then choose Bold, Italic, Heading, Bullets, or Numbers."
                  className="min-h-80 w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-tenzy-orange focus:ring-2 focus:ring-tenzy-orange/20"
                />
              </div>
              <div className="bg-slate-50/70 p-4">
                <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <Eye size={14} className="text-tenzy-teal" />
                  Preview
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <ProductDescriptionPreview value={draft} emptyText="Preview appears as you write." />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4">
              <button type="button" onClick={() => setOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50">
                Cancel
              </button>
              <button type="button" onClick={save} className="inline-flex items-center gap-1.5 rounded-xl bg-tenzy-teal px-4 py-2 text-sm font-bold text-white transition hover:opacity-90">
                <Check size={15} />
                Save Description
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
