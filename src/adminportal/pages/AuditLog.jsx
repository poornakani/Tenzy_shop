import React, { useState, useEffect, useCallback } from "react";
import {
  ChevronLeft, ChevronRight, RefreshCw, ChevronDown, ChevronUp,
  Shield, User, Search, Activity,
} from "lucide-react";
import { adminApi } from "../../services/api";

const PAGE_SIZE = 50;

/* ── helpers ──────────────────────────────────────────────────────────────── */
const fmtDate = (v) => {
  if (!v) return "—";
  const d = new Date(v);
  return d.toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
};

const actionColor = (action = "") => {
  const a = action.toLowerCase();
  if (a.includes("delete") || a.includes("deactivate") || a.includes("remove"))
    return "bg-red-100 text-red-700";
  if (a.includes("create") || a.includes("insert") || a.includes("add"))
    return "bg-emerald-100 text-emerald-700";
  if (a.includes("update") || a.includes("edit") || a.includes("change") || a.includes("activate"))
    return "bg-blue-100 text-blue-700";
  if (a.includes("login") || a.includes("auth"))
    return "bg-violet-100 text-violet-700";
  return "bg-slate-100 text-slate-600";
};

function Spinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="w-7 h-7 rounded-full border-4 border-tenzy-teal/30 border-t-tenzy-teal animate-spin" />
    </div>
  );
}

function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-2 py-4">
      <button disabled={page === 1} onClick={() => onChange(page - 1)}
        className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 disabled:opacity-40 transition">
        <ChevronLeft size={15} />
      </button>
      <span className="text-sm text-slate-600 font-medium px-2">{page} / {totalPages}</span>
      <button disabled={page === totalPages} onClick={() => onChange(page + 1)}
        className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 disabled:opacity-40 transition">
        <ChevronRight size={15} />
      </button>
    </div>
  );
}

/* ── Change summary (human-readable diff) ────────────────────────────────── */
const SKIP_FIELDS = new Set([
  "updatedAtUtc","UpdatedAtUtc","createdAtUtc","CreatedAtUtc",
  "lastupdated","LastUpdated","createdate","CreateDate","createDate",
  "lastStockUpdateUTC","LastStockUpdateUTC","appliedToProductAtUtc",
  "pricingReviewStatus","PricingReviewStatus",
]);

const tryParse = (j) => {
  if (!j) return null;
  try { return typeof j === "object" ? j : JSON.parse(j); }
  catch { return null; }
};

const fmtVal = (v) => {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  const s = String(v);
  return s.length > 80 ? s.slice(0, 77) + "…" : s;
};

const friendlyLabel = (key) =>
  key.replace(/([A-Z])/g, " $1").replace(/_/g, " ").replace(/\bId\b/g, "ID").trim()
    .replace(/^./, (c) => c.toUpperCase());

function buildChanges(oldJson, newJson, action = "") {
  const oldObj = tryParse(oldJson);
  const newObj = tryParse(newJson);
  const act = action.toLowerCase();
  const isDel = act.includes("delete") || act.includes("deactivate") || act.includes("remove");
  const isNew = act.includes("create") || act.includes("insert") || act.includes("add");

  if (isDel && oldObj && !newObj) {
    return Object.entries(oldObj)
      .filter(([k]) => !SKIP_FIELDS.has(k))
      .map(([k, v]) => ({ field: k, old: fmtVal(v), nw: null, type: "delete" }))
      .slice(0, 10);
  }
  if (isNew && newObj && !oldObj) {
    return Object.entries(newObj)
      .filter(([k]) => !SKIP_FIELDS.has(k))
      .map(([k, v]) => ({ field: k, old: null, nw: fmtVal(v), type: "create" }))
      .slice(0, 10);
  }
  if (oldObj && newObj) {
    const allKeys = [...new Set([...Object.keys(oldObj), ...Object.keys(newObj)])];
    return allKeys
      .filter((k) => !SKIP_FIELDS.has(k))
      .map((k) => ({ field: k, old: fmtVal(oldObj[k]), nw: fmtVal(newObj[k]), type: "update" }))
      .filter(({ old, nw }) => old !== nw);
  }
  if (newObj) return Object.entries(newObj).filter(([k]) => !SKIP_FIELDS.has(k)).map(([k, v]) => ({ field: k, old: null, nw: fmtVal(v), type: "create" })).slice(0, 10);
  if (oldObj) return Object.entries(oldObj).filter(([k]) => !SKIP_FIELDS.has(k)).map(([k, v]) => ({ field: k, old: fmtVal(v), nw: null, type: "delete" })).slice(0, 10);
  return [];
}

function ChangeSummary({ oldValues, newValues, action }) {
  const changes = buildChanges(oldValues, newValues, action);

  if (!changes.length) {
    return <p className="text-xs text-slate-400 italic">No field changes recorded.</p>;
  }

  return (
    <div className="space-y-1.5">
      {changes.map(({ field, old, nw, type }) => (
        <div key={field} className="flex items-start gap-2 flex-wrap text-xs">
          <span className="font-semibold text-slate-600 min-w-[130px] shrink-0">
            {friendlyLabel(field)}
          </span>
          {type === "update" && (
            <span className="flex items-center gap-1.5 flex-wrap">
              <span className="px-1.5 py-0.5 rounded bg-red-50 text-red-600 line-through opacity-80">{old}</span>
              <span className="text-slate-400 font-bold">→</span>
              <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-medium">{nw}</span>
            </span>
          )}
          {type === "create" && (
            <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-medium">{nw}</span>
          )}
          {type === "delete" && (
            <span className="px-1.5 py-0.5 rounded bg-red-50 text-red-600 opacity-80">{old}</span>
          )}
        </div>
      ))}
    </div>
  );
}

/* ── Row ──────────────────────────────────────────────────────────────────── */
function LogRow({ log }) {
  const [open, setOpen] = useState(false);
  const hasDetail = log.oldValues || log.newValues;

  return (
    <>
      <tr
        className={`border-b border-slate-100 transition-colors ${hasDetail ? "cursor-pointer hover:bg-slate-50" : ""}`}
        onClick={() => hasDetail && setOpen((p) => !p)}
      >
        <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap font-mono">{log.id}</td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-tenzy-teal/10 flex items-center justify-center flex-shrink-0">
              <User size={13} className="text-tenzy-teal" />
            </div>
            <span className="text-sm font-medium text-slate-800 whitespace-nowrap">
              {log.adminName || "Unknown"}
            </span>
          </div>
        </td>
        <td className="px-4 py-3">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${actionColor(log.action)}`}>
            {log.action}
          </span>
        </td>
        <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">
          {log.entityType || "—"}
        </td>
        <td className="px-4 py-3 text-sm text-slate-600 font-mono">
          {log.entityId || "—"}
        </td>
        <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
          {log.ipAddress || "—"}
        </td>
        <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
          {fmtDate(log.createdAt)}
        </td>
        <td className="px-4 py-3 text-center w-8">
          {hasDetail && (
            open
              ? <ChevronUp size={14} className="text-slate-400 mx-auto" />
              : <ChevronDown size={14} className="text-slate-400 mx-auto" />
          )}
        </td>
      </tr>
      {open && hasDetail && (
        <tr className="bg-slate-50/80 border-b border-slate-200">
          <td colSpan={8} className="px-6 py-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Changes</p>
            <ChangeSummary oldValues={log.oldValues} newValues={log.newValues} action={log.action} />
          </td>
        </tr>
      )}
    </>
  );
}

/* ── Main page ────────────────────────────────────────────────────────────── */
export default function AuditLog() {
  const [rows, setRows]         = useState([]);
  const [page, setPage]         = useState(1);
  const [totalPages, setTotal]  = useState(1);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);
  const [mode, setMode]         = useState("all"); // "all" | "mine"
  const [search, setSearch]     = useState("");

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    setError(null);
    try {
      const data = mode === "mine"
        ? await adminApi.getMyActivity(p, PAGE_SIZE)
        : await adminApi.getAuditLogs(p, PAGE_SIZE);

      const list = Array.isArray(data?.response)
        ? data.response
        : Array.isArray(data)
          ? data
          : [];
      setRows(list);
      // Backend returns flat list; estimate pages from result size
      setTotal(list.length === PAGE_SIZE ? p + 1 : p);
      setPage(p);
    } catch (e) {
      setError(e?.message || "Failed to load audit logs.");
    } finally {
      setLoading(false);
    }
  }, [mode]);

  useEffect(() => { load(1); }, [load]);

  const filtered = search.trim()
    ? rows.filter((r) => {
        const q = search.toLowerCase();
        return (
          (r.adminName  || "").toLowerCase().includes(q) ||
          (r.action     || "").toLowerCase().includes(q) ||
          (r.entityType || "").toLowerCase().includes(q) ||
          (r.entityId   || "").toLowerCase().includes(q) ||
          (r.ipAddress  || "").toLowerCase().includes(q)
        );
      })
    : rows;

  return (
    <div className="p-4 sm:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-violet-100 flex items-center justify-center">
            <Shield size={20} className="text-violet-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Audit Log</h1>
            <p className="text-xs text-slate-500">Every admin action recorded</p>
          </div>
        </div>
        <button
          onClick={() => load(page)}
          className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition"
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Mode toggle */}
        <div className="flex rounded-xl border border-slate-200 overflow-hidden bg-white">
          {[
            { id: "all",  label: "All Admins", icon: Activity },
            { id: "mine", label: "My Activity", icon: User },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setMode(id)}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition ${
                mode === id
                  ? "bg-tenzy-teal text-white"
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
              }`}
            >
              <Icon size={13} /> {label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter by admin, action, entity…"
            className="w-full pl-8 pr-3 py-2 rounded-xl border border-tenzy-orange/50 bg-white text-sm outline-none focus:border-tenzy-orange focus:ring-2 focus:ring-tenzy-orange/20 transition"
          />
        </div>

        <span className="text-xs text-slate-400 ml-auto">
          {filtered.length} record{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <Spinner />
        ) : error ? (
          <div className="py-16 text-center text-sm text-red-500">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-sm text-slate-400">No audit log entries found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 w-16">#</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Admin</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Action</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Entity</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">ID</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">IP</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Time (UTC)</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((log) => (
                  <LogRow key={log.id} log={log} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Pagination page={page} totalPages={totalPages} onChange={(p) => load(p)} />
    </div>
  );
}
