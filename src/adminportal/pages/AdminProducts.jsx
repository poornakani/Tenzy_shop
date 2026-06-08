import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Search, X, Plus, Edit2, Trash2, AlertTriangle, Star, StarOff,
  ChevronUp, ChevronDown, ImagePlus, Tag, DollarSign,
  Info, MessageSquare, CreditCard, Package, Shield,
} from "lucide-react";
import {
  productsApi, brandsApi, concernsApi, paymentApi, uploadApi, productImageApi, productFaqApi,
  supplyChainApi, categoriesApi, productVariantsApi,
} from "../../services/api";
import ProductDescriptionEditor  from "../components/ProductDescriptionEditor";
import IngredientsTableEditor   from "../components/IngredientsTableEditor";
import HowToUseStepsEditor      from "../components/HowToUseStepsEditor";
import DescriptionStatsEditor   from "../components/DescriptionStatsEditor";


const fmt = (n) => new Intl.NumberFormat("en-LK").format(n);

const stockStatus = (stock) => {
  const s = parseInt(stock ?? 0, 10);
  if (s === 0) return { label: "Out of Stock", cls: "bg-red-100 text-red-600" };
  if (s < 15)  return { label: "Low Stock",    cls: "bg-amber-100 text-amber-700" };
  return              { label: "In Stock",     cls: "bg-emerald-100 text-emerald-700" };
};

const primaryImage = (images) =>
  (images ?? []).find((i) => i.isPrimary ?? i.IsPrimary)?.imageUrl
  ?? (images ?? [])[0]?.imageUrl
  ?? (images ?? []).find((i) => i.IsPrimary)?.ImageUrl
  ?? null;

const pricingStatusMeta = (status) => {
  switch (status) {
    case "awaiting_stock_depletion":
      return { label: "Waiting for stock finish", cls: "bg-violet-100 text-violet-700" };
    case "pending_activation":
      return { label: "Ready to activate", cls: "bg-blue-100 text-blue-700" };
    case "draft":
      return { label: "Draft pricing", cls: "bg-slate-100 text-slate-600" };
    default:
      return { label: "Pending price approval", cls: "bg-amber-100 text-amber-700" };
  }
};

const Section = ({ icon, title, children }) => (
  <div className="space-y-3">
    <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
      {React.createElement(icon, { size: 15, className: "text-tenzy-teal" })}
      <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">{title}</h3>
    </div>
    {children}
  </div>
);

const Field = ({ label, required, children }) => (
  <div>
    <label className="block text-xs font-semibold text-slate-600 mb-1">
      {label}{required && <span className="text-red-400 ml-0.5">*</span>}
    </label>
    {children}
  </div>
);

const Input = ({ className = "", ...props }) => (
  <input
    className={`w-full text-sm px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-tenzy-teal/30 focus:border-tenzy-orange transition ${className}`}
    {...props}
  />
);

const Sel = ({ children, ...props }) => (
  <select
    className="w-full text-sm px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-tenzy-teal/30 focus:border-tenzy-orange transition"
    {...props}
  >
    {children}
  </select>
);

const emptyForm = () => ({
  name: "", brandId: "", description: "", howToUse: "", ingredients: "",
  showWeight: false, showTabletCount: false, showVolume: false,
  inSale: false,
  images: [], concerns: [], paymentOptions: [], faqs: [],
  categoryId: null, subCategoryIds: [],
});

const toApiDate = (value) => (value ? `${value}T00:00:00Z` : null);
const normalizeFaqDraft = (faq) => ({
  faqId: faq.faqId ?? faq.fAQId ?? faq.FAQId ?? 0,
  question: String(faq.question ?? faq.Question ?? "").trim(),
  answer: String(faq.answer ?? faq.Answer ?? "").trim(),
});
const normalizeConcernIds = (concerns) => [...new Set(
  (concerns ?? [])
    .map((concern) => (
      typeof concern === "object" && concern !== null
        ? (concern.concernTypeId ?? concern.ConcernTypeId ?? concern.id ?? concern.Id)
        : concern
    ))
    .map((id) => parseInt(id, 10))
    .filter((id) => Number.isInteger(id) && id > 0)
)];
const normalizeProductImage = (img) => ({
  imageId: img.imageId ?? img.ImageId,
  productId: img.productId ?? img.ProductId,
  imageUrl: img.imageUrl ?? img.ImageUrl ?? "",
  isPrimary: img.isPrimary ?? img.IsPrimary ?? false,
  sortOrder: img.sortOrder ?? img.SortOrder ?? 1,
  isActive: img.isActive ?? img.IsActive ?? true,
});

const productIdOf = (p) => p?.productId ?? p?.ProductId ?? p?.productid;
const productConcernIds = (p) => {
  const direct = p?.concerns ?? p?.Concerns ?? p?.concernTypeIds ?? p?.ConcernTypeIds;
  if (Array.isArray(direct)) {
    return direct
      .map((c) => (typeof c === "object" && c !== null ? (c.concernTypeId ?? c.ConcernTypeId ?? c.id ?? c.Id) : c))
      .map((id) => parseInt(id, 10))
      .filter((id) => Number.isInteger(id) && id > 0);
  }

  return String(p?.concernTypeIdsCsv ?? p?.ConcernTypeIdsCsv ?? "")
    .split(",")
    .map((id) => parseInt(id.trim(), 10))
    .filter((id) => Number.isInteger(id) && id > 0);
};
const productNumber = (p, keys, fallback = 0) => {
  for (const key of keys) {
    const value = p?.[key];
    if (value !== undefined && value !== null && value !== "") {
      const n = parseFloat(value);
      if (Number.isFinite(n)) return n;
    }
  }
  return fallback;
};
const productSale = (p) => Boolean(p?.inSale ?? p?.InSale ?? p?.insale ?? false);
const filterSelectBase = "text-sm px-3 py-2 border rounded-xl outline-none focus:ring-2 transition";
const filterStyles = {
  brand: `${filterSelectBase} bg-sky-50 border-sky-200 text-sky-800 focus:ring-sky-200 focus:border-sky-400`,
  concern: `${filterSelectBase} bg-emerald-50 border-emerald-200 text-emerald-800 focus:ring-emerald-200 focus:border-emerald-400`,
  sale: `${filterSelectBase} bg-orange-50 border-orange-200 text-orange-800 focus:ring-orange-200 focus:border-orange-400`,
  stock: `${filterSelectBase} bg-violet-50 border-violet-200 text-violet-800 focus:ring-violet-200 focus:border-violet-400`,
  sort: `${filterSelectBase} bg-slate-50 border-slate-200 text-slate-700 focus:ring-slate-200 focus:border-slate-400`,
};

/* ── Variant Images panel (inline, inside each variant card) ─────────────── */
function VariantImagesPanel({ productId, variantId }) {
  const [images,    setImages]    = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving,    setSaving]    = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const imgs = await productImageApi.getByVariant(productId, variantId);
      setImages(Array.isArray(imgs) ? imgs : []);
    } catch { setImages([]); }
    finally { setLoading(false); }
  }, [productId, variantId]);

  useEffect(() => { load(); }, [load]);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setUploading(true);
    try {
      const url = await uploadApi.uploadImage(file);
      await productImageApi.create({
        productId,
        variantId,
        imageUrl:  url,
        isPrimary: images.length === 0,
        sortOrder: images.length + 1,
        isActive:  true,
      });
      await load();
    } catch (err) { alert(err.message || "Upload failed."); }
    finally { setUploading(false); }
  };

  const handleSetPrimary = async (img) => {
    const isPrimary = img.isPrimary ?? img.IsPrimary ?? false;
    if (isPrimary) return;
    setSaving(true);
    try {
      await productImageApi.update({
        imageId:   img.imageId ?? img.ImageId,
        productId,
        variantId,
        imageUrl:  img.imageUrl ?? img.ImageUrl,
        isPrimary: true,
        sortOrder: img.sortOrder ?? img.SortOrder ?? 1,
        isActive:  true,
      });
      await load();
    } catch (err) { alert(err.message || "Failed to set primary."); }
    finally { setSaving(false); }
  };

  const handleRemove = async (imageId) => {
    if (!window.confirm("Remove this image?")) return;
    setSaving(true);
    try {
      await productImageApi.deactivate(imageId);
      await load();
    } catch (err) { alert(err.message || "Failed to remove."); }
    finally { setSaving(false); }
  };

  return (
    <div className="border-t border-slate-100 bg-white px-4 py-3 space-y-2">
      {loading ? (
        <div className="flex justify-center py-2">
          <div className="w-4 h-4 rounded-full border-2 border-tenzy-teal/30 border-t-tenzy-teal animate-spin" />
        </div>
      ) : (
        <>
          {images.length === 0 ? (
            <p className="text-[10px] text-slate-400 text-center py-2 bg-slate-50 rounded-lg">
              No images for this variant yet.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {images.map((img) => {
                const imgId     = img.imageId ?? img.ImageId;
                const isPrimary = img.isPrimary ?? img.IsPrimary ?? false;
                return (
                  <div key={imgId} className="relative group">
                    <img
                      src={img.imageUrl ?? img.ImageUrl}
                      alt=""
                      className={`w-14 h-14 rounded-lg object-cover border-2 transition ${isPrimary ? "border-amber-400" : "border-slate-200"}`}
                      onError={(e) => { e.target.style.display = "none"; }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center gap-0.5 bg-black/50 rounded-lg opacity-0 group-hover:opacity-100 transition">
                      <button onClick={() => handleSetPrimary(img)} disabled={saving || isPrimary}
                        className="p-1 rounded bg-white/90 text-amber-500 disabled:opacity-40" title="Set as primary">
                        <Star size={10} fill="currentColor" />
                      </button>
                      <button onClick={() => handleRemove(imgId)} disabled={saving}
                        className="p-1 rounded bg-white/90 text-red-500 disabled:opacity-40" title="Remove">
                        <X size={10} />
                      </button>
                    </div>
                    {isPrimary && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-400 flex items-center justify-center">
                        <Star size={7} fill="white" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          <label className={`flex items-center justify-center gap-1.5 w-full py-2 rounded-xl border-2 border-dashed cursor-pointer transition text-[11px] font-semibold
            ${uploading || saving ? "border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed" : "border-tenzy-teal/40 hover:border-tenzy-teal hover:bg-tenzy-teal/5 text-tenzy-teal"}`}>
            <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden"
              disabled={uploading || saving} onChange={handleUpload} />
            <ImagePlus size={12} />
            <span>{uploading ? "Uploading…" : saving ? "Saving…" : "Add image"}</span>
          </label>
          <p className="text-[9px] text-slate-400 text-center">★ = primary shown for this variant on the website</p>
        </>
      )}
    </div>
  );
}

/* ── Product Items section (inside Edit dialog) ───────────────────────────── */
const emptyVariant = { variantName: "", volume: "", weight: "", tabsCount: "", sellingPrice: "", wholesalePrice: "", stock: "", isVisible: true, sortOrder: "" };

function VariantsSection({ productId, showVolume: initialShowVolume, initialShowForm = false }) {
  const [variants,    setVariants]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [showVolume,  setShowVolume]  = useState(initialShowVolume);
  const [showForm,    setShowForm]    = useState(initialShowForm);
  const [editVariant, setEditVariant] = useState(null);
  const [vform,       setVform]       = useState(emptyVariant);
  const [saving,        setSaving]        = useState(false);
  const [stockWarn,     setStockWarn]     = useState(null); // { vid, stk }
  const [imagesOpenFor, setImagesOpenFor] = useState(null); // variantId or null

  const loadVariants = useCallback(async () => {
    setLoading(true);
    try {
      const d = await productVariantsApi.getAll(productId);
      setVariants(Array.isArray(d) ? d : []);
    } catch { setVariants([]); }
    finally { setLoading(false); }
  }, [productId]);

  useEffect(() => { loadVariants(); }, [loadVariants]);

  const toggleShowVolume = async () => {
    const next = !showVolume;
    setShowVolume(next);
    try { await productVariantsApi.setShowVolume(productId, next); }
    catch { setShowVolume(!next); alert("Failed to update volume display setting."); }
  };

  const openAdd = () => { setEditVariant(null); setVform(emptyVariant); setShowForm(true); };
  const openEdit = (v) => {
    setEditVariant(v);
    setVform({
      variantName:    v.VariantName  ?? v.variantName  ?? "",
      volume:         v.Volume       ?? v.volume       ?? "",
      weight:         String(v.Weight ?? v.weight ?? ""),
      tabsCount:      String(v.TabsCount ?? v.tabsCount ?? v.TabletCount ?? v.tabletCount ?? ""),
      sellingPrice:   String(v.SellingPrice ?? v.sellingPrice ?? ""),
      wholesalePrice: String(v.WholesalePrice ?? v.wholesalePrice ?? ""),
      stock:          String(v.Stock ?? v.stock ?? ""),
      isVisible:      v.IsVisible    ?? v.isVisible    ?? true,
      sortOrder:      String(v.SortOrder ?? v.sortOrder ?? ""),
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!vform.variantName.trim()) { alert("Item name is required."); return; }
    if (!vform.weight || parseFloat(vform.weight) <= 0) { alert("Weight (g) is required and must be > 0."); return; }
    setSaving(true);
    try {
      const body = {
        variantName:    vform.variantName.trim(),
        volume:         vform.volume.trim() || null,
        weight:         parseFloat(vform.weight) || 0,
        tabsCount:      vform.tabsCount ? parseInt(vform.tabsCount, 10) : null,
        sellingPrice:   parseFloat(vform.sellingPrice) || 0,
        wholesalePrice: vform.wholesalePrice ? parseFloat(vform.wholesalePrice) : null,
        stock:          parseInt(vform.stock) || 0,
        isVisible:      vform.isVisible,
        sortOrder:      parseInt(vform.sortOrder) || 0,
      };
      if (editVariant) {
        await productVariantsApi.update(editVariant.VariantId ?? editVariant.variantId, body);
      } else {
        await productVariantsApi.create(productId, body);
      }
      setShowForm(false);
      setEditVariant(null);
      loadVariants();
    } catch (err) { alert(err.message || "Save failed."); }
    finally { setSaving(false); }
  };

  const handleDelete = async (vid, stk) => {
    if (stk > 0) { setStockWarn({ vid, stk }); return; }
    if (!window.confirm("Remove this product item?")) return;
    try { await productVariantsApi.remove(vid); loadVariants(); }
    catch (err) { alert(err.message || "Delete failed."); }
  };

  const fmtV = (n) => new Intl.NumberFormat("en-LK").format(n ?? 0);

  return (
    <Section icon={Package} title="Product Items">
      {/* Show Volume toggle */}
      <div className="flex items-center justify-between rounded-xl bg-slate-50 border border-slate-200 px-4 py-3">
        <div>
          <p className="text-xs font-semibold text-slate-700">Show size selector on website</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Customers will see tabs for each in-stock item</p>
        </div>
        <button type="button" onClick={toggleShowVolume}
          className={`relative w-11 h-6 rounded-full transition-colors ${showVolume ? "bg-tenzy-teal" : "bg-slate-300"}`}>
          <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${showVolume ? "translate-x-5" : "translate-x-0"}`} />
        </button>
      </div>

      {/* Product item cards */}
      {loading ? (
        <div className="flex justify-center py-4"><div className="w-5 h-5 rounded-full border-2 border-tenzy-teal/30 border-t-tenzy-teal animate-spin" /></div>
      ) : variants.length === 0 && !showForm ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 py-6 text-center space-y-1">
          <p className="text-xs font-semibold text-slate-500">No product items yet</p>
          <p className="text-[11px] text-slate-400">Add an item manually below, or create one through the <strong>UK Purchase</strong> flow.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {variants.map((v) => {
            const vid   = v.VariantId ?? v.variantId;
            const vname = v.VariantName ?? v.variantName ?? "—";
            const vol   = v.Volume ?? v.volume ?? "";
            const wt    = Number(v.Weight ?? v.weight ?? 0);
            const tabs  = Number(v.TabsCount ?? v.tabsCount ?? v.TabletCount ?? v.tabletCount ?? 0);
            const sp    = Number(v.SellingPrice ?? v.sellingPrice ?? 0);
            const ws    = Number(v.WholesalePrice ?? v.wholesalePrice ?? 0);
            const stk   = Number(v.Stock ?? v.stock ?? 0);
            const vis   = v.IsVisible ?? v.isVisible ?? true;
            const ac    = Number(v.ArrivalCost ?? v.arrivalCost ?? 0);
            const outOfStock = stk === 0;
            const belowCost  = ac > 0 && sp > 0 && sp < ac;
            const marginPct  = ac > 0 && sp > 0 ? ((sp - ac) / sp * 100).toFixed(1) : null;
            return (
              <div key={vid} className={`rounded-2xl border-2 overflow-hidden transition ${
                !vis ? "border-slate-200 opacity-60" : belowCost ? "border-tenzy-orange/50" : outOfStock ? "border-red-200" : "border-tenzy-teal/30"
              }`}>
                {/* Item header row */}
                <div className={`flex items-center justify-between px-4 py-2.5 ${
                  !vis ? "bg-slate-50" : outOfStock ? "bg-red-50/50" : "bg-teal-50/40"
                }`}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-slate-800">{vname}</span>
                    {vol && (
                      <span className="text-[10px] font-bold bg-tenzy-teal text-white px-2 py-0.5 rounded-full">{vol}</span>
                    )}
                    {wt > 0 && (
                      <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{wt}g</span>
                    )}
                    {tabs > 0 && (
                      <span className="text-[10px] font-semibold text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full">{tabs} tabs</span>
                    )}
                    {!vis && (
                      <span className="text-[10px] font-semibold text-slate-400 bg-slate-200 px-2 py-0.5 rounded-full">hidden</span>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => openEdit(v)} className="p-1.5 rounded-lg hover:bg-white text-slate-400 hover:text-tenzy-teal transition"><Edit2 size={13} /></button>
                    <button onClick={() => handleDelete(vid, stk)} className="p-1.5 rounded-lg hover:bg-red-100 text-slate-400 hover:text-red-500 transition"><Trash2 size={13} /></button>
                  </div>
                </div>

                {/* Stock warning when trying to delete a variant with stock */}
                {stockWarn?.vid === vid && (
                  <div className="flex items-start gap-2 px-4 py-2.5 bg-amber-50 border-t border-amber-100">
                    <AlertTriangle size={13} className="text-amber-500 mt-0.5 shrink-0" />
                    <p className="text-xs text-amber-700 flex-1">
                      Cannot delete — this item still has <strong>{stockWarn.stk} units</strong> in stock. Sell or zero the stock before deleting.
                    </p>
                    <button onClick={() => setStockWarn(null)} className="text-amber-400 hover:text-amber-600 text-xs leading-none shrink-0">✕</button>
                  </div>
                )}

                {/* Pricing & stock grid */}
                <div className="grid grid-cols-4 divide-x divide-slate-100 bg-white">
                  <div className="px-3 py-3 text-center">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5">Landing Cost</p>
                    <p className={`text-sm font-bold ${ac > 0 ? belowCost ? "text-tenzy-orange" : "text-slate-600" : "text-slate-300"}`}>
                      {ac > 0 ? `LKR ${fmtV(ac)}` : "—"}
                    </p>
                    {marginPct !== null && (
                      <p className={`text-[10px] font-semibold mt-0.5 ${parseFloat(marginPct) < 0 ? "text-red-500" : "text-emerald-600"}`}>
                        {parseFloat(marginPct) >= 0 ? "+" : ""}{marginPct}% margin
                      </p>
                    )}
                  </div>
                  <div className="px-3 py-3 text-center">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5">Website Price</p>
                    <p className={`text-sm font-bold ${sp > 0 ? "text-tenzy-teal" : "text-slate-300"}`}>
                      {sp > 0 ? `LKR ${fmtV(sp)}` : "—"}
                    </p>
                    {belowCost && (
                      <p className="text-[10px] text-tenzy-orange font-semibold mt-0.5">below cost</p>
                    )}
                  </div>
                  <div className="px-3 py-3 text-center">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5">Wholesale</p>
                    <p className={`text-sm font-bold ${ws > 0 ? "text-amber-600" : "text-slate-300"}`}>
                      {ws > 0 ? `LKR ${fmtV(ws)}` : "—"}
                    </p>
                  </div>
                  <div className="px-3 py-3 text-center">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5">Stock</p>
                    <p className={`text-sm font-bold ${outOfStock ? "text-red-500" : stk <= 5 ? "text-amber-600" : "text-emerald-600"}`}>
                      {stk}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {outOfStock ? "Out of stock" : stk <= 5 ? "Low" : "In stock"}
                    </p>
                  </div>
                </div>

                {/* Variant Images toggle row */}
                <div className="border-t border-slate-100 px-4 py-2 bg-slate-50/60 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <ImagePlus size={11} className="text-slate-400" />
                    <span className="text-[10px] font-semibold text-slate-500">Variant Images</span>
                  </div>
                  <button type="button"
                    onClick={() => setImagesOpenFor(imagesOpenFor === vid ? null : vid)}
                    className="text-[10px] font-semibold text-tenzy-teal hover:opacity-70 transition">
                    {imagesOpenFor === vid ? "Close ▲" : "Manage ▼"}
                  </button>
                </div>
                {imagesOpenFor === vid && (
                  <VariantImagesPanel productId={productId} variantId={vid} />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit form */}
      {showForm && (
        <div className="rounded-xl border border-tenzy-orange/40 bg-orange-50/30 p-4 space-y-3">
          <p className="text-xs font-bold text-slate-700">{editVariant ? "Edit Product Item" : "Add Product Item"}</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 mb-1">Item Name * <span className="text-slate-300">(e.g. 30ml, 250g)</span></label>
              <input value={vform.variantName} onChange={(e) => setVform({ ...vform, variantName: e.target.value })}
                placeholder="100ml, 250g, Large…"
                className="w-full text-sm px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-tenzy-teal" />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 mb-1">Volume label <span className="text-slate-300">(shown on website)</span></label>
              <input value={vform.volume} onChange={(e) => setVform({ ...vform, volume: e.target.value })}
                placeholder="e.g. 100 ml"
                className="w-full text-sm px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-tenzy-teal" />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 mb-1">Weight (g) * <span className="text-slate-300">used for dispatch</span></label>
              <input type="number" min="0.1" step="0.1" value={vform.weight} onChange={(e) => setVform({ ...vform, weight: e.target.value })}
                placeholder="e.g. 120"
                className="w-full text-sm px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-tenzy-teal focus:ring-2 focus:ring-tenzy-orange/20 focus:border-tenzy-orange" />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 mb-1">Tabs Count</label>
              <input type="number" min="0" step="1" value={vform.tabsCount} onChange={(e) => setVform({ ...vform, tabsCount: e.target.value })}
                placeholder="e.g. 30"
                className="w-full text-sm px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-tenzy-teal" />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 mb-1">Stock</label>
              <input type="number" min="0" value={vform.stock} onChange={(e) => setVform({ ...vform, stock: e.target.value })}
                placeholder="0"
                className="w-full text-sm px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-tenzy-teal" />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 mb-1">Website Price (LKR)</label>
              <input type="number" min="0" value={vform.sellingPrice} onChange={(e) => setVform({ ...vform, sellingPrice: e.target.value })}
                placeholder="0"
                className="w-full text-sm px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-tenzy-teal" />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 mb-1">Wholesale Price (LKR)</label>
              <input type="number" min="0" value={vform.wholesalePrice} onChange={(e) => setVform({ ...vform, wholesalePrice: e.target.value })}
                placeholder="Optional"
                className="w-full text-sm px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-tenzy-teal" />
            </div>
            <div className="col-span-2 flex items-center gap-3">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <button type="button" onClick={() => setVform({ ...vform, isVisible: !vform.isVisible })}
                  className={`relative w-9 h-5 rounded-full transition-colors ${vform.isVisible ? "bg-tenzy-teal" : "bg-slate-300"}`}>
                  <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${vform.isVisible ? "translate-x-4" : "translate-x-0"}`} />
                </button>
                <span className="text-xs font-medium text-slate-600">Visible on website</span>
              </label>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => { setShowForm(false); setEditVariant(null); }}
              className="flex-1 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
            <button onClick={handleSave} disabled={saving}
              className="flex-1 py-2 rounded-xl bg-tenzy-teal text-white text-xs font-bold hover:opacity-90 disabled:opacity-60">
              {saving ? "Saving…" : editVariant ? "Save Changes" : "Add Variant"}
            </button>
          </div>
        </div>
      )}

      {!showForm && (
        <button onClick={openAdd}
          className="w-full py-2 rounded-xl border-2 border-dashed border-slate-200 text-xs font-semibold text-slate-500 hover:border-tenzy-teal hover:text-tenzy-teal transition flex items-center justify-center gap-1.5">
          <Plus size={13} /> Add Product Item manually
        </button>
      )}
    </Section>
  );
}

/* ── Inline product item card — price management + history ────────────────── */
function ItemCard({ vid, pid, vn, vol, wt, sp, ws, stk, initDr, arrivalCost, onSaveDiscount }) {
  const fmtI   = (n) => new Intl.NumberFormat("en-LK").format(Math.round(n ?? 0));
  const inputCls = "w-full text-xs px-2 py-1.5 rounded-lg border border-slate-200 outline-none focus:border-tenzy-teal text-center";

  // Editable values
  const [editSp,   setEditSp]   = useState(sp  > 0 ? String(sp)  : "");
  const [editWs,   setEditWs]   = useState(ws  > 0 ? String(ws)  : "");
  const [editStk,  setEditStk]  = useState(String(stk));
  const [editDr,   setEditDr]   = useState(initDr > 0 ? String(initDr) : "");

  // Price adjustment: "set" | "percent" | "amount"
  const [adjMode,  setAdjMode]  = useState("set");
  const [adjVal,   setAdjVal]   = useState("");

  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(false);
  const [history,  setHistory]  = useState(null); // null=not loaded, []|[...]=loaded
  const [loadingH, setLoadingH] = useState(false);

  const numSp  = parseFloat(editSp)  || 0;
  const numWs  = parseFloat(editWs)  || 0;
  const numStk = parseInt(editStk)   || 0;
  const numDr  = parseFloat(editDr)  || 0;
  const cost   = Number(arrivalCost  || 0);

  // Compute adjusted preview when user picks % or amount mode
  const adjNum = parseFloat(adjVal) || 0;
  const previewSp = adjMode === "percent"
    ? (numSp > 0 ? Math.round(numSp * (1 + adjNum / 100)) : 0)
    : adjMode === "amount"
    ? (numSp > 0 ? Math.round(numSp + adjNum) : 0)
    : numSp;

  const salePrice = numDr > 0 && previewSp > 0 ? Math.round(previewSp * (1 - numDr / 100)) : 0;
  const marginPct = previewSp > 0 && cost > 0
    ? ((previewSp - cost) / previewSp * 100).toFixed(1) : null;

  const applyAdj = () => {
    if (adjMode !== "set" && previewSp > 0) setEditSp(String(previewSp));
  };

  const loadHistory = async () => {
    if (loadingH) return;
    setLoadingH(true);
    try {
      const d = await productVariantsApi.getPriceHistory(vid);
      setHistory(Array.isArray(d) ? d : []);
    } catch { setHistory([]); }
    finally { setLoadingH(false); }
  };

  const toggleHistory = () => {
    if (history === null) loadHistory();
    else setHistory(null);
  };

  const handleSave = async () => {
    setSaving(true);
    const finalSp = adjMode !== "set" ? previewSp : numSp;
    try {
      // Log price change before saving
      if (sp !== finalSp || ws !== numWs || initDr !== numDr) {
        await productVariantsApi.logPriceChange(vid, {
          productId: pid,
          variantName: vn,
          oldWebsitePrice:   sp,
          newWebsitePrice:   finalSp,
          oldWholesalePrice: ws,
          newWholesalePrice: numWs,
          arrivalCost:       cost > 0 ? cost : null,
          oldDiscountRate:   initDr,
          newDiscountRate:   numDr,
          notes: adjMode === "percent"
            ? `Website price adjusted ${adjNum > 0 ? "+" : ""}${adjNum}%`
            : adjMode === "amount"
            ? `Website price adjusted ${adjNum > 0 ? "+" : ""}LKR ${fmtI(Math.abs(adjNum))}`
            : "Manual price update",
        }).catch(() => {});
      }
      await onSaveDiscount(numDr, finalSp, numWs, numStk);
      if (adjMode !== "set") { setEditSp(String(finalSp)); setAdjVal(""); setAdjMode("set"); }
      setSaved(true);
      setHistory(null); // refresh history next open
      setTimeout(() => setSaved(false), 2000);
    } catch (e) { alert(e.message || "Save failed."); }
    finally { setSaving(false); }
  };

  const belowCost = cost > 0 && previewSp > 0 && previewSp < cost;

  return (
    <div className={`rounded-xl border-2 bg-white overflow-hidden ${numStk === 0 ? "border-red-200" : belowCost ? "border-tenzy-orange/60" : "border-tenzy-teal/30"}`}>
      {/* Header */}
      <div className={`px-3 py-2 flex items-center gap-2 ${numStk === 0 ? "bg-red-50/60" : "bg-teal-50/40"}`}>
        <p className="text-xs font-bold text-slate-800 truncate flex-1">{vn}</p>
        <div className="flex gap-1 shrink-0">
          {vol && <span className="text-[10px] font-bold bg-tenzy-teal text-white px-1.5 py-0.5 rounded-full">{vol}</span>}
          {wt > 0 && <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-full">{wt}g</span>}
        </div>
      </div>

      <div className="p-3 space-y-2.5">
        {/* Arrival cost banner */}
        {cost > 0 && (
          <div className={`rounded-lg px-2.5 py-1.5 flex items-center justify-between text-[10px] font-semibold ${belowCost ? "bg-tenzy-orange/10 text-tenzy-orange" : "bg-slate-100 text-slate-500"}`}>
            <span>Arrival cost</span>
            <span className="font-bold">LKR {fmtI(cost)}</span>
          </div>
        )}

        {/* Prices */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <p className="text-[10px] font-semibold text-slate-400 mb-0.5">Website Price (LKR)</p>
            <input type="number" min="0" step="1" value={editSp}
              onChange={(e) => { setEditSp(e.target.value); setAdjMode("set"); setAdjVal(""); }}
              placeholder="0"
              className={`${inputCls} ${numSp > 0 ? "text-tenzy-teal font-bold" : ""}`} />
            {marginPct !== null && (
              <p className={`text-[10px] text-center mt-0.5 font-semibold ${parseFloat(marginPct) < 0 ? "text-red-500" : "text-emerald-600"}`}>
                Margin: {marginPct}%
              </p>
            )}
          </div>
          <div>
            <p className="text-[10px] font-semibold text-slate-400 mb-0.5">Wholesale (LKR)</p>
            <input type="number" min="0" step="1" value={editWs}
              onChange={(e) => setEditWs(e.target.value)}
              placeholder="0"
              className={`${inputCls} ${numWs > 0 ? "text-amber-600 font-bold" : ""}`} />
          </div>
        </div>

        {/* Price adjustment */}
        <div className="rounded-lg border border-slate-200 p-2 space-y-1.5">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Adjust website price</p>
          <div className="flex rounded-lg border border-slate-200 overflow-hidden text-[10px]">
            {[["set","Set exact"],["percent","% change"],["amount","LKR change"]].map(([m,l]) => (
              <button key={m} type="button" onClick={() => { setAdjMode(m); setAdjVal(""); }}
                className={`flex-1 px-1.5 py-1 font-semibold transition ${adjMode===m ? "bg-tenzy-teal text-white" : "text-slate-500 hover:bg-slate-50"}`}>
                {l}
              </button>
            ))}
          </div>
          {adjMode !== "set" && (
            <div className="flex gap-1.5">
              <input type="number" step={adjMode==="percent" ? "0.1" : "1"}
                value={adjVal} onChange={(e) => setAdjVal(e.target.value)}
                placeholder={adjMode==="percent" ? "e.g. 10 or -5" : "e.g. 500 or -300"}
                className={`${inputCls} flex-1`} />
              <button onClick={applyAdj}
                className="px-2 py-1 rounded-lg bg-slate-100 text-slate-600 text-[10px] font-bold hover:bg-slate-200 transition">
                Apply
              </button>
            </div>
          )}
          {adjMode !== "set" && previewSp > 0 && (
            <p className="text-[10px] text-center text-slate-500">
              {numSp > 0 ? `LKR ${fmtI(numSp)} →` : ""} <strong className="text-tenzy-teal">LKR {fmtI(previewSp)}</strong>
            </p>
          )}
        </div>

        {/* Stock + discount */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <p className="text-[10px] font-semibold text-slate-400 mb-0.5">Stock Qty</p>
            <input type="number" min="0" step="1" value={editStk}
              onChange={(e) => setEditStk(e.target.value)} placeholder="0"
              className={`${inputCls} ${numStk > 0 ? "text-emerald-600 font-bold" : "text-red-500 font-bold"}`} />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-slate-400 mb-0.5">Discount %</p>
            <input type="number" min="0" max="100" step="1" value={editDr}
              onChange={(e) => setEditDr(e.target.value)} placeholder="0"
              className={inputCls} />
          </div>
        </div>

        {salePrice > 0 && (
          <p className="text-[11px] text-tenzy-orange font-semibold text-center">
            Sale: LKR {fmtI(salePrice)} ({numDr}% off)
          </p>
        )}
        {belowCost && (
          <p className="text-[10px] text-tenzy-orange font-bold text-center">
            ⚠ Website price is below arrival cost
          </p>
        )}

        {/* Save */}
        <button onClick={handleSave} disabled={saving}
          className={`w-full py-1.5 rounded-lg text-xs font-bold transition ${
            saved ? "bg-emerald-500 text-white" : "bg-tenzy-teal text-white hover:opacity-90 disabled:opacity-60"
          }`}>
          {saving ? "Saving…" : saved ? "✓ Saved" : "Save Changes"}
        </button>

        {/* Price history toggle */}
        <button onClick={toggleHistory}
          className="w-full py-1 text-[10px] font-semibold text-slate-400 hover:text-tenzy-teal transition flex items-center justify-center gap-1">
          {history === null ? "▼ Show price history" : "▲ Hide price history"}
          {loadingH && <span className="w-3 h-3 rounded-full border border-tenzy-teal/30 border-t-tenzy-teal animate-spin" />}
        </button>

        {/* History log */}
        {history !== null && !loadingH && (
          <div className="space-y-1.5 border-t border-slate-100 pt-2">
            {history.length === 0 && (
              <p className="text-[10px] text-slate-400 text-center">No price changes recorded yet.</p>
            )}
            {history.map((h) => {
              const hId = h.HistoryId ?? h.historyId;
              const oldSp = h.OldWebsitePrice ?? h.oldWebsitePrice;
              const newSp = h.NewWebsitePrice ?? h.newWebsitePrice;
              const ac    = h.ArrivalCost ?? h.arrivalCost;
              const dt    = h.ChangedAt   ?? h.changedAt;
              const note  = h.Notes ?? h.notes ?? "";
              const newMar = h.NewMarginPct ?? h.newMarginPct;
              return (
                <div key={hId} className="rounded-lg bg-slate-50 border border-slate-100 px-2.5 py-2 text-[10px]">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-slate-500">{dt ? new Date(dt).toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" }) : "—"}</span>
                    {newMar != null && (
                      <span className={`font-bold ${parseFloat(newMar) < 0 ? "text-red-500" : "text-emerald-600"}`}>
                        Margin: {newMar}%
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {oldSp != null && <span className="text-slate-400 line-through">LKR {fmtI(oldSp)}</span>}
                    {newSp != null && <><span className="text-slate-400">→</span><span className="font-bold text-tenzy-teal">LKR {fmtI(newSp)}</span></>}
                    {ac    != null && <span className="text-slate-400 ml-1">| Cost: LKR {fmtI(ac)}</span>}
                  </div>
                  {note && <p className="text-slate-400 mt-0.5 italic truncate">{note}</p>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminProducts() {
  const [products,       setProducts]       = useState([]);
  const [brands,         setBrands]         = useState([]);
  const [concernTypes,   setConcernTypes]   = useState([]);
  const [categories,     setCategories]     = useState([]);
  const [paymentTypes,   setPaymentTypes]   = useState([]);
  const [approvedShipments, setApprovedShipments] = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [search,         setSearch]         = useState("");
  const [concFilter,     setConcFilter]     = useState(0);
  const [catFilter,      setCatFilter]      = useState(0);
  const [brandFilter,    setBrandFilter]    = useState(0);
  const [saleFilter,     setSaleFilter]     = useState("all");
  const [stockFilter,    setStockFilter]    = useState("all");
  const [sortBy,         setSortBy]         = useState("newest");
  const [activeTab,      setActiveTab]      = useState("live");
  const [expandedPid,    setExpandedPid]    = useState(null);  // which product row is expanded
  const [productItems,   setProductItems]   = useState({});    // map: productId → variants[]
  const [itemsLoadingPid,setItemsLoadingPid]= useState(null);
  const [drawer,         setDrawer]         = useState(null);
  const [editTarget,     setEditTarget]     = useState(null);
  const [form,           setForm]           = useState(emptyForm());
  const [deleteConfirm,  setDeleteConfirm]  = useState(null);
  const [deleteError,    setDeleteError]    = useState("");
  const [deletedProducts, setDeletedProducts] = useState([]);
  const [deletedLoading,  setDeletedLoading]  = useState(false);
  const [saving,             setSaving]             = useState(false);
  const [openVariantOnCreate, setOpenVariantOnCreate] = useState(false);
  const [uploading,      setUploading]      = useState(false);
  const [imageSaving,    setImageSaving]    = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);

  const loadAll = useCallback(() => {
    setLoading(true);
    setSessionExpired(false);
    Promise.allSettled([
      productsApi.getAllAdmin(),
      brandsApi.getAll(),
      concernsApi.getAll(),
      paymentApi.getAll(),
      productImageApi.getAll(),
      supplyChainApi.getEligiblePricing(),
      categoriesApi.getAll(),
    ]).then(([pR, bR, conR, ptR, imgR, approvedR, catR]) => {
      // Check if any auth-protected call got a session-expired error
      const expired = [pR, bR, conR, ptR].some(
        (r) => r.status === "rejected" && r.reason?.message?.includes("Session expired")
      );
      if (expired) { setSessionExpired(true); return; }

      if (bR.status   === "fulfilled") setBrands(Array.isArray(bR.value)     ? bR.value   : []);
      if (conR.status === "fulfilled") {
        const raw = Array.isArray(conR.value) ? conR.value : [];
        const seen = new Set();
        setConcernTypes(raw.filter((ct) => {
          const id = ct.concernTypeId ?? ct.ConcernTypeId ?? ct.id;
          if (id == null || seen.has(id)) return false;
          seen.add(id);
          return true;
        }));
      }
      if (ptR.status  === "fulfilled") setPaymentTypes(Array.isArray(ptR.value)  ? ptR.value  : []);
      if (catR.status === "fulfilled") setCategories(Array.isArray(catR.value)  ? catR.value  : []);
      if (approvedR.status === "fulfilled") setApprovedShipments(Array.isArray(approvedR.value) ? approvedR.value : []);

      if (pR.status === "fulfilled") {
        const prods = Array.isArray(pR.value) ? pR.value : [];
        const allImgs = imgR.status === "fulfilled" ? imgR.value : [];
        // Attach images to each product
        setProducts(prods.map((p) => {
          const pid = productIdOf(p);
          const imgs = allImgs.filter(
            (img) =>
              (img.productId ?? img.ProductId) === pid &&
              (img.isActive ?? img.IsActive) !== false
          );
          return { ...p, images: imgs };
        }));
      }
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);
  useEffect(() => { if (activeTab === "deleted") loadDeleted(); }, [activeTab]);
  const toggleExpand = async (pid) => {
    if (expandedPid === pid) { setExpandedPid(null); return; }
    setExpandedPid(pid);
    if (productItems[pid]) return; // already loaded
    setItemsLoadingPid(pid);
    try {
      const d = await productVariantsApi.getAll(pid);
      setProductItems((prev) => ({ ...prev, [pid]: Array.isArray(d) ? d : [] }));
    } catch { setProductItems((prev) => ({ ...prev, [pid]: [] })); }
    finally { setItemsLoadingPid(null); }
  };

  const bid_of    = (b) => b.brandId    ?? b.BrandId    ?? b.Brandid;
  const brandName = useCallback((id) => (
    brands.find((b) => bid_of(b) === id)?.name ?? brands.find((b) => bid_of(b) === id)?.Name ?? "—"
  ), [brands]);

  const filtered = useMemo(() => {
    const rows = products.filter((p) => {
      const q = search.toLowerCase();
      const bid = bid_of(p);
      const stk = productNumber(p, ["stockQuantity", "StockQuantity", "stock"], 0);
      const sale = productSale(p);
      const matchSearch = (p.name ?? "").toLowerCase().includes(q) || brandName(bid).toLowerCase().includes(q);
      const matchBrand = brandFilter === 0 || bid === brandFilter;
      const matchConc = concFilter === 0 || productConcernIds(p).includes(concFilter);
      const matchCat = catFilter === 0 || (p.categoryId ?? p.CategoryId) === catFilter;
      const matchSale = saleFilter === "all" || (saleFilter === "sale" ? sale : !sale);
      const matchStock =
        stockFilter === "all" ||
        (stockFilter === "out" && stk <= 0) ||
        (stockFilter === "low" && stk > 0 && stk < 15) ||
        (stockFilter === "in" && stk >= 15);
      return matchSearch && matchBrand && matchConc && matchCat && matchSale && matchStock;
    });

    return [...rows].sort((a, b) => {
      const priceA = productNumber(a, ["sellingPrice", "SellingPrice", "price"], 0);
      const priceB = productNumber(b, ["sellingPrice", "SellingPrice", "price"], 0);
      const wholesaleA = productNumber(a, ["wholesalePrice", "WholesalePrice"], 0);
      const wholesaleB = productNumber(b, ["wholesalePrice", "WholesalePrice"], 0);
      const stockA = productNumber(a, ["stockQuantity", "StockQuantity", "stock"], 0);
      const stockB = productNumber(b, ["stockQuantity", "StockQuantity", "stock"], 0);
      const dateA = new Date(a.createdate ?? a.createDate ?? a.CreateDate ?? 0).getTime() || 0;
      const dateB = new Date(b.createdate ?? b.createDate ?? b.CreateDate ?? 0).getTime() || 0;

      switch (sortBy) {
        case "price-high":
          return priceB - priceA;
        case "price-low":
          return priceA - priceB;
        case "stock-high":
          return stockB - stockA;
        case "stock-low":
          return stockA - stockB;
        case "wholesale-high":
          return wholesaleB - wholesaleA;
        case "wholesale-low":
          return wholesaleA - wholesaleB;
        case "sale-first":
          return Number(productSale(b)) - Number(productSale(a));
        case "regular-first":
          return Number(productSale(a)) - Number(productSale(b));
        case "name":
          return String(a.name ?? "").localeCompare(String(b.name ?? ""));
        case "newest":
        default:
          return dateB - dateA;
      }
    });
  }, [products, search, brandFilter, concFilter, catFilter, saleFilter, stockFilter, sortBy, brandName]);

  const pendingPriceRows = useMemo(() => (
    approvedShipments.filter((item) => item.pricingReviewStatus !== "applied_live")
  ), [approvedShipments]);

  const filteredPendingPriceRows = useMemo(() => {
    const q = search.toLowerCase().trim();
    return pendingPriceRows.filter((item) => {
      if (!q) return true;
      return [
        item.productName,
        item.brandName,
        item.dispatchReference,
      ].some((value) => String(value ?? "").toLowerCase().includes(q));
    });
  }, [pendingPriceRows, search]);

  const openAdd = () => {
    const firstBrand = brands[0];
    const bId = firstBrand ? Number(bid_of(firstBrand) ?? 0) : "";
    setForm({
      ...emptyForm(),
      brandId: bId || "",
    });
    setEditTarget(null);
    setDrawer("add");
  };

  const openEdit = async (p) => {
    const pid = p.productId ?? p.ProductId ?? p.productid;

    setForm({
      name:           p.name ?? "",
      brandId:        bid_of(p) || "",
      description:    p.description ?? "",
      howToUse:       p.howToUse   ?? p.HowToUse   ?? "",
      ingredients:    p.ingredients ?? p.Ingredients ?? "",
      showWeight:     p.showWeight    ?? p.ShowWeight    ?? false,
      showTabletCount: p.showTabletCount ?? p.ShowTabletCount ?? false,
      showVolume:     p.showVolume    ?? p.ShowVolume    ?? false,
      inSale:         p.inSale ?? p.InSale ?? p.insale ?? false,
      images:         [],
      concerns:       null,
      paymentOptions: null,
      categoryId:     p.categoryId ?? p.CategoryId ?? null,
      subCategoryIds: String(p.subCategoryIdsCsv ?? p.SubCategoryIdsCsv ?? "")
        .split(",").map((id) => parseInt(id.trim(), 10)).filter((id) => Number.isInteger(id) && id > 0),
      faqs: (p.faqs ?? []).map((f) => ({
        faqId:    f.faqId    ?? f.FAQId    ?? Date.now(),
        question: f.question ?? f.Question ?? "",
        answer:   f.answer   ?? f.Answer   ?? "",
      })),
    });
    setEditTarget(p);
    setDrawer("edit");

    // Load related data asynchronously
    try {
      const [imgs, faqs, concernIds, payOpts] = await Promise.all([
        productImageApi.getByProduct(pid),
        productFaqApi.getByProduct(pid),
        productsApi.getConcerns(pid).catch(() => null),
        productsApi.getPaymentOptions(pid).catch(() => null),
      ]);
      setForm((prev) => ({
        ...prev,
        images: imgs.map(normalizeProductImage),
        faqs: faqs.map((faq) => ({
          faqId: faq.faqId ?? faq.fAQId ?? faq.FAQId,
          question: faq.question ?? faq.Question ?? "",
          answer: faq.answer ?? faq.Answer ?? "",
        })),
        // Pre-populate concerns and payment options if the API returned data
        ...(Array.isArray(concernIds)
          ? { concerns: concernIds.filter((id) => Number.isInteger(id) && id > 0) }
          : {}),
        ...(Array.isArray(payOpts)
          ? {
              paymentOptions: payOpts.map((po) => ({
                paymentTypeId: po.paymentTypeId ?? po.PaymentTypeId,
                instalment:    po.instalment    ?? po.Instalment ?? null,
              })).filter((po) => po.paymentTypeId > 0),
            }
          : {}),
      }));
    } catch {
      // related data just won't be pre-populated
    }
  };

  const closeDrawer = () => { setDrawer(null); setEditTarget(null); setOpenVariantOnCreate(false); };

  const syncProductImagesIntoList = useCallback((productId, images) => {
    setProducts((prev) => prev.map((product) => {
      const pid = product.productId ?? product.ProductId ?? product.productid;
      if (pid !== productId) return product;
      const nextPrimaryImage = primaryImage(images);
      return {
        ...product,
        images,
        primaryImageUrl: nextPrimaryImage,
        PrimaryImageUrl: nextPrimaryImage,
      };
    }));
  }, []);

  const refreshProductImages = useCallback(async (productId) => {
    const images = (await productImageApi.getByProduct(productId)).map(normalizeProductImage);
    setForm((prev) => {
      const activeEditId = editTarget?.productId ?? editTarget?.ProductId ?? editTarget?.productid;
      return activeEditId === productId ? { ...prev, images } : prev;
    });
    syncProductImagesIntoList(productId, images);
    return images;
  }, [editTarget, syncProductImagesIntoList]);

  const runImageMutation = useCallback(async (work) => {
    if (imageSaving) return false;
    setImageSaving(true);
    try {
      await work();
      return true;
    } catch (err) {
      alert(err.message || "Image update failed.");
      return false;
    } finally {
      setImageSaving(false);
    }
  }, [imageSaving]);

  const syncProductFaqs = async (productId, drafts) => {
    const existingFaqs = await productFaqApi.getByProduct(productId);
    const existingIds = new Set(
      existingFaqs.map((faq) => faq.faqId ?? faq.fAQId ?? faq.FAQId).filter((id) => Number.isInteger(id) && id > 0)
    );
    const nextIds = new Set(
      drafts.map((faq) => faq.faqId).filter((id) => Number.isInteger(id) && existingIds.has(id))
    );

    const removedFaqs = existingFaqs.filter((faq) => !nextIds.has(faq.faqId ?? faq.fAQId ?? faq.FAQId));
    if (removedFaqs.length > 0) {
      const results = await Promise.allSettled(
        removedFaqs.map((faq) => productFaqApi.deactivate(faq.faqId ?? faq.fAQId ?? faq.FAQId))
      );
      const failed = results.find((result) => result.status === "rejected");
      if (failed?.status === "rejected") throw failed.reason;
    }

    if (drafts.length > 0) {
      const results = await Promise.allSettled(
        drafts.map((faq) => {
          const isExisting = existingIds.has(faq.faqId);
          const body = {
            productId,
            question: faq.question,
            answer: faq.answer,
            createdUtc: new Date().toISOString(),
            isActive: true,
          };
          if (isExisting) {
            return productFaqApi.update(faq.faqId, { ...body, faqId: faq.faqId });
          }
          return productFaqApi.create(body);
        })
      );
      const failed = results.find((result) => result.status === "rejected");
      if (failed?.status === "rejected") throw failed.reason;
    }
  };

  const handleSave = async () => {
    if (!form.name.trim()) { alert("Product name is required."); return; }
    if (!form.brandId)     { alert("Please select a brand."); return; }
    // Price, stock, and weight are managed at the Product Item level — no validation needed here
    if (saving) return;
    setSaving(true);
    try {
      const normalizedFaqs = form.faqs.map(normalizeFaqDraft);
      // null means not yet loaded — send null so backend leaves them unchanged
      const concernTypeIds = form.concerns === null ? null : normalizeConcernIds(form.concerns);
      const hasIncompleteFaq = normalizedFaqs.some(
        (faq) => (faq.question || faq.answer) && (!faq.question || !faq.answer)
      );
      if (hasIncompleteFaq) {
        alert("Each FAQ must have both a question and an answer.");
        return;
      }
      const faqsToSave = normalizedFaqs.filter((faq) => faq.question && faq.answer);

      const body = {
        name:            form.name.trim(),
        brandId:         parseInt(form.brandId, 10),
        description:     form.description,
        howToUse:        form.howToUse   || null,
        ingredients:     form.ingredients || null,
        showWeight:      form.showWeight,
        showTabletCount: form.showTabletCount,
        showVolume:      form.showVolume,
        inSale:          form.inSale,
        concernTypeIds,
        categoryId:      form.categoryId ?? null,
        subCategoryIds:  (form.subCategoryIds ?? []).filter((id) => id > 0),
        paymentOptions:  form.paymentOptions,
      };
      if (drawer === "add") {
        const result = await productsApi.create(body);
        const newId = result?.id ?? result?.Id;
        if (newId && form.images.length > 0) {
          await Promise.allSettled(
            form.images.map((img) =>
              productImageApi.create({
                productId: newId,
                imageUrl:  img.imageUrl,
                isPrimary: img.isPrimary,
                sortOrder: img.sortOrder,
              })
            )
          );
        }
        if (newId) {
          await syncProductFaqs(newId, faqsToSave);
          // Auto-switch to edit mode so variants can be added immediately
          loadAll();
          const freshProduct = {
            productId: newId, productid: newId,
            name: body.name, brandId: body.brandId,
            showWeight: body.showWeight, showTabletCount: body.showTabletCount,
            showVolume: body.showVolume, inSale: body.inSale,
            categoryId: body.categoryId,
          };
          setEditTarget(freshProduct);
          setForm((f) => ({ ...f, concerns: concernTypeIds, faqs: faqsToSave }));
          setOpenVariantOnCreate(true);
          setDrawer("edit");
        }
      } else {
        const pid = editTarget.productId ?? editTarget.ProductId ?? editTarget.productid;
        await productsApi.update(pid, body);
        await syncProductFaqs(pid, faqsToSave);
        loadAll();
        closeDrawer();
      }
    } catch (err) { alert(err.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    setDeleteError("");
    try {
      await productsApi.remove(id);
      setDeleteConfirm(null);
      loadAll();
      if (activeTab === "deleted") loadDeleted();
    } catch (err) {
      setDeleteError(err.message || "Delete failed.");
    }
  };

  const loadDeleted = async () => {
    setDeletedLoading(true);
    try {
      const data = await productsApi.getDeleted();
      setDeletedProducts(Array.isArray(data) ? data : []);
    } catch { setDeletedProducts([]); }
    finally { setDeletedLoading(false); }
  };

  const handleRestore = async (id) => {
    try {
      await productsApi.restore(id);
      loadDeleted();
      loadAll();
    } catch (err) { alert(err.message || "Restore failed."); }
  };

  // Image helpers
  const addImageUrl = async (url) => {
    if (!url) return;
    if (drawer === "edit" && editTarget) {
      const productId = editTarget.productId ?? editTarget.ProductId ?? editTarget.productid;
      await runImageMutation(async () => {
        await productImageApi.create({
          productId,
          imageUrl: url,
          isPrimary: form.images.length === 0,
          sortOrder: form.images.length + 1,
        });
        await refreshProductImages(productId);
      });
      return;
    }

    const isFirst = form.images.length === 0;
    setForm((f) => ({
      ...f,
      images: [...f.images, { imageId: Date.now(), imageUrl: url, isPrimary: isFirst, sortOrder: f.images.length + 1 }],
    }));
  };

  const handleImageFilePick = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setUploading(true);
    try {
      const url = await uploadApi.uploadImage(file);
      await addImageUrl(url);
    } catch (err) {
      alert(err.message || "Image upload failed.");
    } finally {
      setUploading(false);
    }
  };
  const setPrimary = async (imgId) => {
    if (drawer === "edit" && editTarget) {
      const productId = editTarget.productId ?? editTarget.ProductId ?? editTarget.productid;
      const image = form.images.find((img) => img.imageId === imgId);
      if (!image || image.isPrimary) return;
      await runImageMutation(async () => {
        await productImageApi.update({
          imageId: image.imageId,
          productId,
          imageUrl: image.imageUrl,
          isPrimary: true,
          sortOrder: image.sortOrder,
          isActive: image.isActive ?? true,
        });
        await refreshProductImages(productId);
      });
      return;
    }

    setForm((f) => ({ ...f, images: f.images.map((img) => ({ ...img, isPrimary: img.imageId === imgId })) }));
  };
  const removeImage = async (imgId) => {
    if (drawer === "edit" && editTarget) {
      const productId = editTarget.productId ?? editTarget.ProductId ?? editTarget.productid;
      const currentImages = [...form.images];
      const removedImage = currentImages.find((img) => img.imageId === imgId);
      if (!removedImage) return;

      await runImageMutation(async () => {
        await productImageApi.deactivate(imgId);

        const remainingImages = currentImages
          .filter((img) => img.imageId !== imgId)
          .map((img, index) => ({
            ...img,
            isPrimary: removedImage.isPrimary ? index === 0 : img.isPrimary,
            sortOrder: index + 1,
          }));

        for (const image of remainingImages) {
          const original = currentImages.find((img) => img.imageId === image.imageId);
          if (!original) continue;
          const changedPrimary = Boolean(original.isPrimary) !== Boolean(image.isPrimary);
          const changedSort = (original.sortOrder ?? 0) !== image.sortOrder;
          if (!changedPrimary && !changedSort) continue;
          await productImageApi.update({
            imageId: image.imageId,
            productId,
            imageUrl: image.imageUrl,
            isPrimary: image.isPrimary,
            sortOrder: image.sortOrder,
            isActive: image.isActive ?? true,
          });
        }

        await refreshProductImages(productId);
      });
      return;
    }

    setForm((f) => {
      const next = f.images.filter((img) => img.imageId !== imgId);
      if (next.length > 0 && !next.some((i) => i.isPrimary)) next[0].isPrimary = true;
      return { ...f, images: next.map((img, idx) => ({ ...img, sortOrder: idx + 1 })) };
    });
  };
  const moveImage = async (imgId, dir) => {
    if (drawer === "edit" && editTarget) {
      const productId = editTarget.productId ?? editTarget.ProductId ?? editTarget.productid;
      const arr = [...form.images];
      const idx = arr.findIndex((img) => img.imageId === imgId);
      const to = idx + dir;
      if (idx < 0 || to < 0 || to >= arr.length) return;

      [arr[idx], arr[to]] = [arr[to], arr[idx]];
      const reordered = arr.map((img, index) => ({ ...img, sortOrder: index + 1 }));

      await runImageMutation(async () => {
        for (const image of reordered) {
          await productImageApi.update({
            imageId: image.imageId,
            productId,
            imageUrl: image.imageUrl,
            isPrimary: image.isPrimary,
            sortOrder: image.sortOrder,
            isActive: image.isActive ?? true,
          });
        }
        await refreshProductImages(productId);
      });
      return;
    }

    setForm((f) => {
      const arr = [...f.images];
      const idx = arr.findIndex((i) => i.imageId === imgId);
      const to  = idx + dir;
      if (to < 0 || to >= arr.length) return f;
      [arr[idx], arr[to]] = [arr[to], arr[idx]];
      return { ...f, images: arr.map((img, i) => ({ ...img, sortOrder: i + 1 })) };
    });
  };

  // Concern toggle — coerce null → [] on first interaction
  const toggleConcern = (id) => {
    setForm((f) => {
      const list = f.concerns ?? [];
      return {
        ...f,
        concerns: list.includes(id) ? list.filter((c) => c !== id) : [...list, id],
      };
    });
  };

  // Payment option toggle — coerce null → [] on first interaction
  const togglePayment = (id) => {
    setForm((f) => {
      const opts = f.paymentOptions ?? [];
      const exists = opts.find((p) => p.paymentTypeId === id);
      return {
        ...f,
        paymentOptions: exists
          ? opts.filter((p) => p.paymentTypeId !== id)
          : [...opts, { paymentTypeId: id, instalment: null }],
      };
    });
  };
  const setInstalment = (id, val) => {
    setForm((f) => ({
      ...f,
      paymentOptions: f.paymentOptions.map((p) =>
        p.paymentTypeId === id ? { ...p, instalment: val ? parseInt(val, 10) : null } : p
      ),
    }));
  };

  // FAQ helpers
  const addFaq    = () => setForm((f) => ({ ...f, faqs: [...f.faqs, { faqId: Date.now(), question: "", answer: "" }] }));
  const updateFaq = (faqId, field, val) => setForm((f) => ({ ...f, faqs: f.faqs.map((fq) => fq.faqId === faqId ? { ...fq, [field]: val } : fq) }));
  const removeFaq = (faqId) => setForm((f) => ({ ...f, faqs: f.faqs.filter((fq) => fq.faqId !== faqId) }));

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 rounded-full border-4 border-tenzy-teal/30 border-t-tenzy-teal animate-spin" />
    </div>
  );

  if (sessionExpired) return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <p className="text-slate-600 font-semibold">Your session has expired.</p>
      <a href="/#/signin"
        className="px-5 py-2.5 rounded-xl bg-tenzy-teal text-white text-sm font-bold hover:opacity-90 transition">
        Sign in again
      </a>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900">Products</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {activeTab === "live"
              ? `${products.length} products · ${products.filter((p) => parseInt(p.stockQuantity ?? p.StockQuantity ?? p.stock ?? 0, 10) === 0).length} out of stock`
              : activeTab === "deleted"
              ? `${deletedProducts.length} deleted products`
              : `${pendingPriceRows.length} items waiting on pricing decisions`}
          </p>
        </div>
        <button onClick={openAdd}
          className="flex items-center gap-2 bg-tenzy-teal text-white text-sm font-semibold px-4 py-2 rounded-xl hover:opacity-90 transition active:scale-95 shadow-lg shadow-tenzy-teal/20">
          <Plus size={16} /> <span>Add Product</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl p-3 md:p-4 shadow-sm border border-slate-100 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: "live",    label: "Products",              count: products.length },
            { id: "pending", label: "Pending Price Approve", count: pendingPriceRows.length },
            { id: "deleted", label: "Deleted",               count: deletedProducts.length },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                activeTab === tab.id
                  ? "bg-tenzy-teal text-white shadow-lg shadow-tenzy-teal/20"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {tab.label} · {tab.count}
            </button>
          ))}
        </div>

        {activeTab === "pending" && (
          <div className="rounded-2xl border border-amber-100 bg-amber-50/60 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Pending Price Approval</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Approved arrivals stay here until pricing decides whether they should merge into live stock now or wait for the current stock to finish.
                </p>
              </div>
              <div className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                {pendingPriceRows.length} pending items
              </div>
            </div>
          </div>
        )}

        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder={activeTab === "live" ? "Search products or brand…" : "Search pending price items…"}
            className="w-full pl-9 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-tenzy-teal/30 focus:border-tenzy-orange transition" />
          {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2"><X size={14} className="text-slate-400" /></button>}
        </div>
        {activeTab === "live" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-2">
            <select
              value={brandFilter}
              onChange={(e) => setBrandFilter(parseInt(e.target.value, 10))}
              className={filterStyles.brand}>
              <option value={0}>All Brands</option>
              {brands.map((b) => {
                const bid = bid_of(b);
                return <option key={bid} value={bid}>{b.name ?? b.Name ?? "Brand"}</option>;
              })}
            </select>
            <select
              value={catFilter}
              onChange={(e) => setCatFilter(parseInt(e.target.value, 10))}
              className={filterStyles.concern}>
              <option value={0}>All Categories</option>
              {categories.filter((c) => c.isActive !== false).map((c) => (
                <option key={c.categoryId} value={c.categoryId}>{c.name}</option>
              ))}
            </select>
            <select
              value={saleFilter}
              onChange={(e) => setSaleFilter(e.target.value)}
              className={filterStyles.sale}>
              <option value="all">All Sale Status</option>
              <option value="sale">On Sale</option>
              <option value="regular">Regular</option>
            </select>
            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value)}
              className={filterStyles.stock}>
              <option value="all">All Stock</option>
              <option value="out">Out of Stock</option>
              <option value="low">Low Stock</option>
              <option value="in">In Stock</option>
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className={filterStyles.sort}>
              <option value="newest">Newest First</option>
              <option value="name">Name A-Z</option>
              <option value="price-high">Website Price High-Low</option>
              <option value="price-low">Website Price Low-High</option>
              <option value="stock-high">Stock High-Low</option>
              <option value="stock-low">Stock Low-High</option>
              <option value="wholesale-high">Wholesale High-Low</option>
              <option value="wholesale-low">Wholesale Low-High</option>
              <option value="sale-first">On Sale First</option>
              <option value="regular-first">Regular First</option>
            </select>
            <button
              type="button"
              onClick={() => {
                setBrandFilter(0);
                setConcFilter(0);
                setSaleFilter("all");
                setStockFilter("all");
                setSortBy("newest");
              }}
              className="text-sm px-3 py-2 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 font-semibold hover:border-rose-300 hover:bg-rose-100 transition">
              Reset
            </button>
          </div>
        )}
      </div>

      {activeTab === "deleted" && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-50 flex items-center gap-2">
            <AlertTriangle size={14} className="text-amber-500" />
            <p className="text-xs font-semibold text-slate-600">
              Deleted products are hidden from the website. Restore to make them live again.
            </p>
          </div>
          {deletedLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 rounded-full border-4 border-tenzy-teal/30 border-t-tenzy-teal animate-spin" />
            </div>
          )}
          {!deletedLoading && deletedProducts.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-12">No deleted products.</p>
          )}
          {!deletedLoading && deletedProducts.map((p) => {
            const pid = productIdOf(p);
            const img = p.primaryImageUrl ?? p.PrimaryImageUrl ?? null;
            const name = p.name ?? p.Name ?? "—";
            const brand = p.brandName ?? p.BrandName ?? "—";
            const deletedAt = p.deletedAt ?? p.DeletedAt;
            const price = productNumber(p, ["sellingPrice", "SellingPrice"], 0);
            return (
              <div key={pid} className="flex items-center gap-3 px-4 py-3 border-b border-slate-50 last:border-b-0 opacity-70 hover:opacity-100 transition">
                <div className="w-10 h-10 rounded-xl bg-slate-100 overflow-hidden shrink-0">
                  {img ? <img src={img} alt={name} className="w-full h-full object-cover grayscale" /> : <div className="w-full h-full flex items-center justify-center text-slate-300 text-[10px]">No img</div>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-700 truncate">{name}</p>
                  <p className="text-[10px] text-slate-400">{brand} · LKR {fmt(price)}</p>
                  {deletedAt && (
                    <p className="text-[10px] text-red-400">
                      Deleted: {new Date(deletedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handleRestore(pid)}
                  className="shrink-0 px-3 py-1.5 rounded-xl bg-tenzy-teal/10 text-tenzy-teal text-xs font-semibold hover:bg-tenzy-teal hover:text-white transition">
                  Restore
                </button>
              </div>
            );
          })}
        </div>
      )}

      {activeTab === "live" ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="md:hidden divide-y divide-slate-50">
            {filtered.length === 0 && <p className="text-sm text-slate-400 text-center py-12">No products found.</p>}
            {filtered.map((p) => {
              const pid   = p.productId ?? p.ProductId ?? p.productid;
              const bid   = bid_of(p);
              const stk   = p.stockQuantity ?? p.StockQuantity ?? p.stock;
              const st    = stockStatus(stk);
              const img   = p.primaryImageUrl ?? primaryImage(p.images);
              const prc   = p.sellingPrice  ?? p.SellingPrice  ?? p.price;
              const spric = parseFloat(p.sellingPrice  ?? p.SellingPrice  ?? 0);
              const opric = parseFloat(p.originalPrice ?? p.OriginalPrice ?? 0);
              const disc  = Math.round(parseFloat(p.discountRate ?? p.DiscountRate ?? 0)) || (opric > 0 && spric < opric ? Math.round((1 - spric / opric) * 100) : 0);
              return (
                <div key={pid} className="p-4 flex items-center gap-3">
                  <div className="w-14 h-14 rounded-xl bg-slate-100 overflow-hidden shrink-0">
                    {img && <img src={img} alt={p.name} className="w-full h-full object-cover" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate">{p.name}</p>
                    <p className="text-[10px] text-slate-400">{brandName(bid)}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {(p.wholesalePrice ?? p.WholesalePrice) ? (
                        <span className="text-[10px] font-semibold text-amber-700">W: LKR {fmt(p.wholesalePrice ?? p.WholesalePrice)}</span>
                      ) : null}
                      <span className="text-xs font-bold text-tenzy-teal">LKR {fmt(prc)}</span>
                      {disc > 0 && (
                        <span className="text-[10px] text-tenzy-orange font-semibold">-{disc}%</span>
                      )}
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${st.cls}`}>{stk} · {st.label}</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5 shrink-0">
                    <button onClick={() => openEdit(p)} className="p-2 rounded-lg bg-slate-100 hover:bg-tenzy-teal hover:text-white transition"><Edit2 size={13} /></button>
                    <button onClick={() => setDeleteConfirm(pid)} className="p-2 rounded-lg bg-slate-100 hover:bg-red-500 hover:text-white transition"><Trash2 size={13} /></button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {["Product", "Brand", "Stock", "Sale", "Actions", "Items"].map((h) => (
                    <th key={h} className="text-left text-xs font-semibold text-slate-500 px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-12 text-sm text-slate-400">No products found.</td></tr>
                )}
                {filtered.map((p) => {
                  const pid   = p.productId ?? p.ProductId ?? p.productid;
                  const bid   = bid_of(p);
                  const stk   = p.stockQuantity ?? p.StockQuantity ?? p.stock;
                  const prc   = p.sellingPrice  ?? p.SellingPrice  ?? p.price;
                  const spric = parseFloat(p.sellingPrice  ?? p.SellingPrice  ?? 0);
                  const opric = parseFloat(p.originalPrice ?? p.OriginalPrice ?? 0);
                  const disc  = Math.round(parseFloat(p.discountRate ?? p.DiscountRate ?? 0)) || (opric > 0 && spric < opric ? Math.round((1 - spric / opric) * 100) : 0);
                  const sale = p.inSale        ?? p.InSale        ?? p.insale ?? false;
                  const st   = stockStatus(stk);
                  const img  = p.primaryImageUrl ?? primaryImage(p.images);
                  return (
                    <React.Fragment key={pid}>
                    <tr className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-slate-100 overflow-hidden shrink-0">
                            {img && <img src={img} alt={p.name} className="w-full h-full object-cover" />}
                          </div>
                          <p className="text-xs font-semibold text-slate-800 max-w-[160px] truncate">{p.name}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">{brandName(bid)}</td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${st.cls}`}>{stk} · {st.label}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${sale ? "bg-tenzy-orange/10 text-tenzy-orange" : "bg-slate-100 text-slate-400"}`}>
                          {sale ? "On Sale" : "Regular"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg hover:bg-tenzy-teal hover:text-white text-slate-500 transition"><Edit2 size={13} /></button>
                          <button onClick={() => setDeleteConfirm(pid)} className="p-1.5 rounded-lg hover:bg-red-500 hover:text-white text-slate-500 transition"><Trash2 size={13} /></button>
                        </div>
                      </td>
                      {/* Expand/collapse product items */}
                      <td className="px-2 py-3">
                        <button onClick={() => toggleExpand(pid)}
                          className={`p-1.5 rounded-lg transition text-xs font-bold flex items-center gap-1 ${expandedPid === pid ? "bg-tenzy-teal text-white" : "bg-slate-100 text-slate-500 hover:bg-tenzy-teal/10 hover:text-tenzy-teal"}`}>
                          <Package size={12} />
                          {expandedPid === pid ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                        </button>
                      </td>
                    </tr>
                    {/* ── Inline Product Items ── */}
                    {expandedPid === pid && (
                      <tr>
                        <td colSpan={6} className="bg-slate-50/80 border-t border-slate-100 px-4 py-3">
                          {itemsLoadingPid === pid ? (
                            <div className="flex justify-center py-4"><div className="w-5 h-5 rounded-full border-2 border-tenzy-teal/30 border-t-tenzy-teal animate-spin" /></div>
                          ) : (productItems[pid] ?? []).length === 0 ? (
                            <p className="text-xs text-slate-400 text-center py-2">No product items yet — create them through UK Purchase.</p>
                          ) : (
                            <div className="space-y-1.5">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Product Items</p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                                {(productItems[pid] ?? []).map((v) => {
                                  const vid  = v.VariantId ?? v.variantId;
                                  const vn   = v.VariantName ?? v.variantName ?? "—";
                                  const vol  = v.Volume ?? v.volume ?? "";
                                  const wt   = Number(v.Weight ?? v.weight ?? 0);
                                  const sp   = Number(v.SellingPrice ?? v.sellingPrice ?? 0);
                                  const ws   = Number(v.WholesalePrice ?? v.wholesalePrice ?? 0);
                                  const stk  = Number(v.Stock ?? v.stock ?? 0);
                                  const vis  = v.IsVisible ?? v.isVisible ?? true;
                                  const oos  = stk === 0;
                                  const dr          = Number(v.DiscountRate ?? v.discountRate ?? 0);
                                  const arrivalCost = Number(v.ArrivalCost ?? v.arrivalCost ?? 0);
                                  return (
                                    <ItemCard key={`${vid}-${sp}-${ws}-${stk}-${dr}`}
                                      vid={vid} pid={pid} vn={vn} vol={vol} wt={wt}
                                      sp={sp} ws={ws} stk={stk} vis={vis} oos={oos}
                                      initDr={dr} arrivalCost={arrivalCost}
                                      onSaveDiscount={(newDr, newSp, newWs, newStk) =>
                                        productVariantsApi.update(vid, {
                                          variantName: vn, volume: vol || null,
                                          weight: wt, sellingPrice: newSp,
                                          wholesalePrice: newWs || null, discountRate: newDr,
                                          stock: newStk, isVisible: vis,
                                          sortOrder: Number(v.SortOrder ?? v.sortOrder ?? 0),
                                        }).then(() => setProductItems((prev) => ({
                                          ...prev,
                                          [pid]: (prev[pid] ?? []).map((vi) =>
                                            (vi.VariantId ?? vi.variantId) === vid
                                              ? { ...vi, SellingPrice: newSp, WholesalePrice: newWs, Stock: newStk, DiscountRate: newDr }
                                              : vi
                                          ),
                                        })))
                                      }
                                    />
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="md:hidden divide-y divide-slate-50">
            {filteredPendingPriceRows.length === 0 && <p className="text-sm text-slate-400 text-center py-12">No pending price items found.</p>}
            {filteredPendingPriceRows.map((item) => {
              const status = pricingStatusMeta(item.pricingReviewStatus);
              const isWaiting = item.pricingReviewStatus === "awaiting_stock_depletion";
              const pending   = Number(item.pendingSellingPrice ?? 0);
              const current   = Number(item.currentSellingPrice ?? 0);
              return (
                <div key={item.arrivalItemId} className="p-4 space-y-2.5">
                  <div>
                    <p className="text-xs font-bold text-slate-800">{item.variantName || item.productName}</p>
                    {item.variantName && <p className="text-[10px] text-slate-500">{item.productName}</p>}
                    <p className="text-[10px] text-slate-400">{item.brandName} · {item.dispatchReference}</p>
                  </div>
                  <div className="flex flex-wrap gap-2 text-[11px]">
                    <span className={`rounded-full px-2 py-0.5 font-semibold ${status.cls}`}>{status.label}</span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">Qty {item.approvedQuantity}</span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">Live stock {item.currentStockQuantity ?? 0}</span>
                  </div>
                  {isWaiting && (
                    <div className="space-y-0.5">
                      {pending > 0 && (
                        <p className="text-[10px] text-slate-500">
                          Live price: <strong>LKR {fmt(current)}</strong>
                          {" · "}Pending: <strong>LKR {fmt(pending)}</strong>
                        </p>
                      )}
                      {(item.currentStockQuantity ?? 0) > 0
                        ? <p className="text-[10px] text-amber-600">Waiting — {item.currentStockQuantity} units must sell first</p>
                        : <p className="text-[10px] text-emerald-600">Stock depleted — activate in Pricing</p>}
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <a href="/#/admin/pricing" className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-tenzy-teal hover:text-tenzy-teal">
                      Open pricing
                    </a>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {["Dispatch", "Product", "Qty", "Live Price", "Pending Price", "Live Stock", "Decision", ""].map((h) => (
                    <th key={h} className="text-left text-xs font-semibold text-slate-500 px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredPendingPriceRows.length === 0 && (
                  <tr><td colSpan={8} className="text-center py-12 text-sm text-slate-400">No pending price items found.</td></tr>
                )}
                {filteredPendingPriceRows.map((item) => {
                  const status  = pricingStatusMeta(item.pricingReviewStatus);
                  const pending = Number(item.pendingSellingPrice ?? 0);
                  const current = Number(item.currentSellingPrice ?? 0);
                  const isWaiting = item.pricingReviewStatus === "awaiting_stock_depletion";
                  return (
                    <tr key={item.arrivalItemId} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-xs font-semibold text-slate-700">{item.dispatchReference}</td>
                      <td className="px-4 py-3">
                        <p className="text-xs font-semibold text-slate-800">{item.variantName || item.productName}</p>
                        {item.variantName && <p className="text-[11px] text-slate-400">{item.productName}</p>}
                        <p className="text-[11px] text-slate-500">{item.brandName}</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">{item.approvedQuantity}</td>
                      <td className="px-4 py-3 text-xs text-slate-600">{current > 0 ? `LKR ${fmt(current)}` : "—"}</td>
                      <td className="px-4 py-3 text-xs">
                        {isWaiting && pending > 0
                          ? <span className="font-semibold text-violet-700">LKR {fmt(pending)}</span>
                          : <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">
                        {item.currentStockQuantity ?? 0}
                        {isWaiting && (item.currentStockQuantity ?? 0) === 0 && (
                          <span className="ml-1 text-emerald-600 font-semibold">✓ depleted</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${status.cls}`}>{status.label}</span>
                      </td>
                      <td className="px-4 py-3">
                        <a href="/#/admin/pricing" className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-tenzy-teal hover:text-tenzy-teal">
                          Open pricing
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {drawer && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={closeDrawer} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className={`relative w-full max-w-2xl rounded-3xl shadow-2xl flex flex-col max-h-[90vh] transition-colors duration-300 ${form.inSale ? "bg-orange-50" : "bg-white"}`}>
            <div className={`flex items-center justify-between px-6 py-4 border-b rounded-t-3xl shrink-0 transition-colors duration-300 ${form.inSale ? "border-orange-200 bg-gradient-to-r from-orange-100 to-amber-50" : "border-slate-100"}`}>
              <p className="font-bold text-slate-900 text-lg">{drawer === "add" ? "Add Product" : "Edit Product"}</p>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, inSale: !form.inSale })}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full font-bold text-xs transition-all duration-200 ${
                    form.inSale
                      ? "bg-tenzy-orange text-white shadow-lg shadow-tenzy-orange/40 scale-105"
                      : "bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600"
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full shrink-0 ${form.inSale ? "bg-white animate-pulse" : "bg-slate-300"}`} />
                  ON SALE
                </button>
                <button onClick={closeDrawer} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition"><X size={18} /></button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <Section icon={Info} title="Basic Info">
                <Field label="Product Name" required>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. CeraVe Moisturizing Cream" />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Brand" required>
                    <Sel value={form.brandId} onChange={(e) => setForm({ ...form, brandId: parseInt(e.target.value) })}>
                      {brands.map((b) => {
                        const bid = bid_of(b);
                        return <option key={bid} value={bid}>{b.name}</option>;
                      })}
                    </Sel>
                  </Field>
                </div>
                <Field label="Description">
                  <DescriptionStatsEditor
                    value={form.description}
                    onChange={(description) => setForm({ ...form, description })}
                  />
                </Field>

                <Field label="How to Use">
                  <HowToUseStepsEditor
                    value={form.howToUse}
                    onChange={(howToUse) => setForm({ ...form, howToUse })}
                  />
                </Field>

                <Field label="Ingredients">
                  <IngredientsTableEditor
                    value={form.ingredients}
                    onChange={(ingredients) => setForm({ ...form, ingredients })}
                  />
                </Field>
                {/* Visibility toggles — actual values (weight, volume, tablets) are set at UK purchase time */}
                <div className="rounded-xl border border-tenzy-orange/50 bg-white px-4 py-3">
                  <p className="text-xs font-bold text-slate-600 mb-1">Show on website</p>
                  <p className="text-[10px] text-slate-400 mb-3">Values are set when recording a UK purchase — enable here to show them on the product page.</p>
                  <div className="flex flex-wrap gap-5">
                    {[
                      { key: "showWeight",      label: "Weight"      },
                      { key: "showTabletCount", label: "Tablet count" },
                      { key: "showVolume",      label: "Volume"      },
                    ].map(({ key, label }) => (
                      <label key={key} className="flex items-center gap-2.5 cursor-pointer">
                        <button
                          type="button"
                          onClick={() => setForm({ ...form, [key]: !form[key] })}
                          className={`relative w-9 h-5 rounded-full transition-colors ${form[key] ? "bg-tenzy-teal" : "bg-slate-300"}`}
                        >
                          <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form[key] ? "translate-x-4" : "translate-x-0"}`} />
                        </button>
                        <span className="text-xs font-medium text-slate-600">{label}</span>
                      </label>
                    ))}
                  </div>
                </div>

              </Section>

              {/* Pricing & stock are managed through Product Items (variants) created via UK Purchase */}
              <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 px-4 py-3 flex items-start gap-3">
                <DollarSign size={16} className="text-indigo-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-indigo-700">Pricing &amp; stock managed via Product Items</p>
                  <p className="text-[11px] text-indigo-500 mt-0.5 leading-relaxed">
                    Stock, prices, and dispatch details are set on each <strong>Product Item</strong> (e.g. 30ml, 60ml)
                    created through the <strong>UK Purchase</strong> flow. Use the <em>Product Items</em> section
                    below (edit view) to see and manage them.
                  </p>
                </div>
              </div>

              <Section icon={ImagePlus} title="Product Images">
                <div className="space-y-2">
                  {form.images.length === 0 && (
                    <p className="text-xs text-slate-400 text-center py-4 bg-slate-50 rounded-xl">No images yet. Images are added through each product variant.</p>
                  )}
                  {drawer === "edit" && (
                    <p className="text-[10px] text-slate-400 bg-slate-50 rounded-xl px-3 py-2">
                      Image changes save immediately and are independent from the main product save button.
                    </p>
                  )}
                  {form.images.map((img, idx) => (
                    <div key={img.imageId} className="flex items-center gap-2 bg-slate-50 rounded-xl p-2">
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-slate-200 shrink-0">
                        <img src={img.imageUrl} alt="" className="w-full h-full object-cover" onError={(e) => { e.target.style.display = "none"; }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-slate-500 truncate">{img.imageUrl}</p>
                        <p className="text-[10px] text-slate-400">Sort #{img.sortOrder}</p>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <button onClick={() => moveImage(img.imageId, -1)} disabled={imageSaving || idx === 0} className="p-0.5 rounded hover:bg-slate-200 disabled:opacity-30"><ChevronUp size={12} /></button>
                        <button onClick={() => moveImage(img.imageId, 1)} disabled={imageSaving || idx === form.images.length - 1} className="p-0.5 rounded hover:bg-slate-200 disabled:opacity-30"><ChevronDown size={12} /></button>
                      </div>
                      <button onClick={() => setPrimary(img.imageId)} disabled={imageSaving} title={img.isPrimary ? "Primary image" : "Set as primary"}
                        className={`p-1.5 rounded-lg transition ${img.isPrimary ? "bg-amber-100 text-amber-500" : "bg-slate-100 text-slate-400 hover:text-amber-500"}`}>
                        {img.isPrimary ? <Star size={13} fill="currentColor" /> : <StarOff size={13} />}
                      </button>
                      <button onClick={() => removeImage(img.imageId)} disabled={imageSaving} className="p-1.5 rounded-lg hover:bg-red-100 hover:text-red-500 text-slate-400 transition disabled:opacity-30"><X size={13} /></button>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-slate-400">Images are uploaded per product variant. Use the Product Items section below to add images to each variant.</p>
              </Section>

              <Section icon={Tag} title="Category">
                <Field label="Category">
                  <Sel
                    value={form.categoryId ?? ""}
                    onChange={(e) => {
                      const newCatId = e.target.value ? parseInt(e.target.value, 10) : null;
                      setForm((f) => ({ ...f, categoryId: newCatId, subCategoryIds: [] }));
                    }}
                  >
                    <option value="">— Select a category —</option>
                    {categories.filter((c) => c.isActive !== false).map((c) => (
                      <option key={c.categoryId} value={c.categoryId}>{c.name}</option>
                    ))}
                  </Sel>
                </Field>

                {form.categoryId && (() => {
                  const cat = categories.find((c) => c.categoryId === form.categoryId);
                  const subs = (cat?.subCategories ?? []).filter((s) => s.isActive !== false);
                  if (subs.length === 0) return null;
                  return (
                    <Field label="Sub-Categories (select all that apply)">
                      <div className="flex flex-wrap gap-2 mt-1">
                        {subs.map((sub) => {
                          const active = (form.subCategoryIds ?? []).includes(sub.subCategoryId);
                          return (
                            <button key={sub.subCategoryId} type="button"
                              onClick={() => {
                                setForm((f) => {
                                  const current = f.subCategoryIds ?? [];
                                  return {
                                    ...f,
                                    subCategoryIds: active
                                      ? current.filter((id) => id !== sub.subCategoryId)
                                      : [...current, sub.subCategoryId],
                                  };
                                });
                              }}
                              className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition ${
                                active
                                  ? "bg-tenzy-teal text-white border-tenzy-teal"
                                  : "border-slate-200 text-slate-600 hover:border-tenzy-teal hover:text-tenzy-teal"
                              }`}>
                              {sub.name}
                            </button>
                          );
                        })}
                      </div>
                    </Field>
                  );
                })()}
              </Section>

              <Section icon={Shield} title="Skin Concerns">
                {form.concerns === null && (
                  <p className="text-xs text-slate-400 italic">Loading existing concerns…</p>
                )}
                {concernTypes.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No concern types configured. Add some in Reference Data.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {concernTypes
                      .filter((ct) => ct.isActive === true || ct.isActive === 1)
                      .map((ct) => {
                        const cid    = ct.concernTypeId ?? ct.ConcernTypeId ?? ct.id;
                        const label  = ct.concernType ?? ct.ConcernType ?? ct.name ?? ct.Name ?? "—";
                        const active = (form.concerns ?? []).includes(cid);
                        return (
                          <button key={cid} type="button"
                            onClick={() => toggleConcern(cid)}
                            className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition ${
                              active
                                ? "bg-tenzy-teal text-white border-tenzy-teal shadow-sm shadow-tenzy-teal/30"
                                : "border-slate-200 text-slate-600 hover:border-tenzy-teal hover:text-tenzy-teal bg-white"
                            }`}>
                            {active && <span className="mr-1">✓</span>}{label}
                          </button>
                        );
                      })}
                  </div>
                )}
                {form.concerns !== null && form.concerns.length === 0 && concernTypes.length > 0 && (
                  <p className="text-[10px] text-slate-400 mt-1">No concerns selected — tap a concern to add it to this product.</p>
                )}
              </Section>

              <Section icon={CreditCard} title="Payment Options">
                {form.paymentOptions === null && (
                  <p className="text-xs text-slate-400 italic">Loading existing payment options…</p>
                )}
                <div className="space-y-2">
                  {paymentTypes.map((pt) => {
                    const pid      = pt.paymentTypeId ?? pt.PaymentTypeId;
                    const ptName   = pt.name ?? pt.Name ?? pt.paymentType ?? pt.PaymentType ?? "—";
                    const selected = (form.paymentOptions ?? []).find((p) => p.paymentTypeId === pid);
                    return (
                      <div key={pid} className="flex items-center gap-3">
                        <button type="button" onClick={() => togglePayment(pid)}
                          className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition ${
                            selected ? "bg-tenzy-teal border-tenzy-teal" : "border-slate-300"
                          }`}>
                          {selected && <span className="text-white text-[10px] font-bold">✓</span>}
                        </button>
                        <span className="text-xs text-slate-700 flex-1">{ptName}</span>
                        {selected && pid !== 1 && (
                          <input type="number" min="1" value={selected.instalment ?? ""}
                            onChange={(e) => setInstalment(pid, e.target.value)}
                            placeholder="Months"
                            className="w-20 text-xs px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-tenzy-teal/30" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </Section>

              <Section icon={MessageSquare} title="Product FAQ">
                <div className="space-y-3">
                  {form.faqs.map((fq) => (
                    <div key={fq.faqId} className="bg-slate-50 rounded-xl p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase">Q&amp;A</span>
                        <button onClick={() => removeFaq(fq.faqId)} className="text-slate-400 hover:text-red-500"><X size={13} /></button>
                      </div>
                      <Input value={fq.question} onChange={(e) => updateFaq(fq.faqId, "question", e.target.value)} placeholder="Question…" />
                      <textarea rows={2} value={fq.answer}
                        onChange={(e) => updateFaq(fq.faqId, "answer", e.target.value)}
                        placeholder="Answer…"
                        className="w-full text-sm px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-tenzy-teal/30 focus:border-tenzy-orange transition resize-none" />
                    </div>
                  ))}
                  <button onClick={addFaq}
                    className="w-full py-2 rounded-xl border-2 border-dashed border-slate-200 text-xs font-semibold text-slate-500 hover:border-tenzy-teal hover:text-tenzy-teal transition flex items-center justify-center gap-1.5">
                    <Plus size={13} /> Add FAQ
                  </button>
                </div>
              </Section>

              {/* Variants — shown in edit mode (auto-opens form when coming from new product creation) */}
              {drawer === "edit" && editTarget && (() => {
                const pid = editTarget.productId ?? editTarget.ProductId ?? editTarget.productid;
                return (
                  <VariantsSection
                    productId={pid}
                    showVolume={editTarget.showVolume ?? editTarget.ShowVolume ?? false}
                    initialShowForm={openVariantOnCreate}
                  />
                );
              })()}
            </div>

            <div className="px-6 py-4 border-t border-slate-100 flex gap-3 rounded-b-3xl shrink-0">
              <button onClick={closeDrawer}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 py-2.5 rounded-xl bg-tenzy-teal text-white text-sm font-bold hover:opacity-90 transition disabled:opacity-60">
                {saving ? "Saving…" : drawer === "add" ? "Add Product" : "Save Changes"}
              </button>
            </div>
            </div>
          </div>
        </>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => { setDeleteConfirm(null); setDeleteError(""); }} />
          <div className="relative bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center"><AlertTriangle size={18} className="text-red-500" /></div>
              <p className="font-bold text-slate-900">Delete Product?</p>
            </div>
            <p className="text-sm text-slate-500 mb-4">
              The product will be disabled and moved to the Deleted tab. It can be restored at any time.
            </p>
            {deleteError && (
              <div className="mb-4 rounded-xl bg-red-50 border border-red-100 px-4 py-3">
                <p className="text-sm font-semibold text-red-600">{deleteError}</p>
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => { setDeleteConfirm(null); setDeleteError(""); }}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600">
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 transition">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
