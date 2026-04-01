import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Star, Trash2, Search, X, AlertTriangle, MessageSquare, ShieldAlert } from "lucide-react";
import { reviewsApi } from "../../services/api";

const StarRating = ({ rate }) => (
  <div className="flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map((s) => (
      <Star key={s} size={11}
        className={s <= rate ? "text-amber-400 fill-amber-400" : "text-slate-200 fill-slate-200"} />
    ))}
  </div>
);

const RATE_COLOR = {
  5: "bg-emerald-100 text-emerald-700",
  4: "bg-teal-100 text-teal-700",
  3: "bg-amber-100 text-amber-700",
  2: "bg-orange-100 text-orange-700",
  1: "bg-red-100 text-red-600",
};

export default function Reviews() {
  const [reviews,        setReviews]        = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [search,         setSearch]         = useState("");
  const [rateFilter,     setRateFilter]     = useState(0);
  const [productFilter,  setProductFilter]  = useState(0);
  const [deleteId,       setDeleteId]       = useState(null);
  const [deleting,       setDeleting]       = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    reviewsApi.getAll(1)
      .then((data) => setReviews(Array.isArray(data) ? data : (data?.items ?? [])))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  // Unique products that have reviews (for filter pills)
  const reviewedProducts = useMemo(() => {
    const seen = new Map();
    reviews.forEach((r) => {
      const pid = r.productId ?? r.productid;
      if (pid && !seen.has(pid)) seen.set(pid, r.productName ?? `Product #${pid}`);
    });
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
  }, [reviews]);

  const filtered = useMemo(() =>
    reviews.filter((r) => {
      const q   = search.toLowerCase();
      const pid = r.productId ?? r.productid;
      const matchSearch =
        (r.customerName ?? "").toLowerCase().includes(q) ||
        (r.comment ?? "").toLowerCase().includes(q) ||
        (r.productName ?? "").toLowerCase().includes(q);
      const matchRate    = rateFilter === 0    || (r.rating ?? r.rate) === rateFilter;
      const matchProduct = productFilter === 0 || pid === productFilter;
      return matchSearch && matchRate && matchProduct;
    }),
    [reviews, search, rateFilter, productFilter]
  );

  const avgRating = reviews.length
    ? (reviews.reduce((s, r) => s + (r.rating ?? r.rate ?? 0), 0) / reviews.length).toFixed(1)
    : "0.0";

  const handleDelete = async (id) => {
    setDeleting(true);
    try {
      await reviewsApi.moderate(id, false);
      setReviews((prev) => prev.filter((r) => (r.reviewId ?? r.ID) !== id));
    } catch (err) { alert(err.message); }
    finally { setDeleting(false); setDeleteId(null); }
  };

  const rateCount = (n) => reviews.filter((r) => (r.rating ?? r.rate) === n).length;

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 rounded-full border-4 border-tenzy-teal/30 border-t-tenzy-teal animate-spin" />
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900">Reviews</h1>
          <p className="text-sm text-slate-500 mt-0.5">{reviews.length} total reviews · read-only</p>
        </div>
        <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
          <Star size={14} className="text-amber-400 fill-amber-400" />
          <span className="text-sm font-bold text-amber-700">{avgRating}</span>
          <span className="text-xs text-amber-500">avg</span>
        </div>
      </div>

      <div className="flex items-start gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
        <ShieldAlert size={16} className="text-tenzy-teal mt-0.5 shrink-0" />
        <p className="text-xs text-slate-600">
          Reviews are <strong>read-only</strong>. You can view and moderate (hide) reviews submitted by customers.
        </p>
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
        <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">Rating Breakdown</h2>
        <div className="grid grid-cols-5 gap-2">
          {[5, 4, 3, 2, 1].map((n) => {
            const count = rateCount(n);
            const pct   = reviews.length ? Math.round((count / reviews.length) * 100) : 0;
            return (
              <button key={n} onClick={() => setRateFilter(rateFilter === n ? 0 : n)}
                className={`rounded-xl p-2 text-center transition border ${
                  rateFilter === n ? "border-tenzy-teal bg-tenzy-teal/5" : "border-slate-100 hover:border-slate-200"
                }`}>
                <div className="flex justify-center mb-1">
                  <Star size={12} className="text-amber-400 fill-amber-400" />
                  <span className="text-xs font-bold text-slate-700 ml-0.5">{n}</span>
                </div>
                <p className="text-base font-bold text-slate-900">{count}</p>
                <p className="text-[10px] text-slate-400">{pct}%</p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-2xl p-3 md:p-4 shadow-sm border border-slate-100 space-y-3">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by customer, comment or product…"
            className="w-full pl-9 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-tenzy-teal/30 focus:border-tenzy-teal transition" />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X size={14} className="text-slate-400" />
            </button>
          )}
        </div>
        {reviewedProducts.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            <button onClick={() => setProductFilter(0)}
              className={`shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full border transition ${
                productFilter === 0 ? "bg-tenzy-teal text-white border-tenzy-teal" : "border-slate-200 text-slate-600 hover:border-tenzy-teal hover:text-tenzy-teal"
              }`}>
              All Products
            </button>
            {reviewedProducts.map(({ id, name }) => (
              <button key={id} onClick={() => setProductFilter(productFilter === id ? 0 : id)}
                className={`shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full border transition ${
                  productFilter === id ? "bg-tenzy-teal text-white border-tenzy-teal" : "border-slate-200 text-slate-600 hover:border-tenzy-teal hover:text-tenzy-teal"
                }`}>
                {name.split(" ").slice(0, 2).join(" ")}
              </button>
            ))}
          </div>
        )}
      </div>

      {(rateFilter > 0 || productFilter > 0 || search) && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Showing {filtered.length} of {reviews.length} reviews</span>
          <button onClick={() => { setRateFilter(0); setProductFilter(0); setSearch(""); }}
            className="text-xs text-tenzy-teal font-semibold hover:underline">
            Clear filters
          </button>
        </div>
      )}

      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-slate-100">
            <MessageSquare size={36} className="text-slate-200 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-500">No reviews found.</p>
          </div>
        )}
        {filtered.map((r) => {
          const id   = r.reviewId ?? r.ID;
          const rate = r.rating   ?? r.rate ?? 0;
          return (
            <div key={id} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-tenzy-teal/10 flex items-center justify-center text-tenzy-teal font-bold text-sm shrink-0">
                    {(r.customerName ?? "?").charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <p className="text-sm font-bold text-slate-800">{r.customerName}</p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${RATE_COLOR[rate] ?? ""}`}>
                        {rate}★
                      </span>
                      <StarRating rate={rate} />
                    </div>
                    <div className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 text-[10px] font-semibold px-2 py-0.5 rounded-full mb-2">
                      <MessageSquare size={9} />
                      {r.productName ?? `Product #${r.productId ?? r.productid}`}
                    </div>
                    {r.comment ? (
                      <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 rounded-xl px-3 py-2.5 border border-slate-100">
                        "{r.comment}"
                      </p>
                    ) : (
                      <p className="text-xs text-slate-400 italic">No comment provided.</p>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-400">
                      <span>Review #{id}</span>
                      <span>·</span>
                      <span>{r.createdAt ? new Date(r.createdAt).toLocaleDateString("en-GB") : r.createdUTC}</span>
                    </div>
                  </div>
                </div>
                <button onClick={() => setDeleteId(id)}
                  className="shrink-0 p-2 rounded-xl text-slate-400 hover:bg-red-50 hover:text-red-500 transition"
                  title="Hide review">
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDeleteId(null)} />
          <div className="relative bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle size={18} className="text-red-500" />
              </div>
              <p className="font-bold text-slate-900">Hide Review?</p>
            </div>
            <p className="text-sm text-slate-500 mb-5">
              This will hide the review from the storefront. The review data is preserved.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600">
                Cancel
              </button>
              <button onClick={() => handleDelete(deleteId)} disabled={deleting}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 transition disabled:opacity-60">
                {deleting ? "Hiding…" : "Hide Review"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
