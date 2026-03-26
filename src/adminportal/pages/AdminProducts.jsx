import React, { useState, useMemo } from "react";
import {
  Search, X, Plus, Edit2, Trash2, AlertTriangle, Star, StarOff,
  ChevronUp, ChevronDown, ImagePlus, Tag, Package, DollarSign,
  Info, MessageSquare, CreditCard,
} from "lucide-react";
import {
  ADMIN_PRODUCTS, BRANDS, CATEGORIES, CONCERN_TYPES, PAYMENT_TYPES,
} from "../dummydata/index";

const fmt = (n) => new Intl.NumberFormat("en-LK").format(n);

const stockStatus = (p) => {
  if (p.stock === 0)  return { label: "Out of Stock", cls: "bg-red-100 text-red-600" };
  if (p.stock < 15)   return { label: "Low Stock",    cls: "bg-amber-100 text-amber-700" };
  return               { label: "In Stock",           cls: "bg-emerald-100 text-emerald-700" };
};

const primaryImage = (p) =>
  p.images.find((i) => i.IsPrimary)?.ImageUrl ?? p.images[0]?.ImageUrl ?? null;

const brandName  = (id) => BRANDS.find((b) => b.Brandid === id)?.name ?? "—";
const catName    = (id) => CATEGORIES.find((c) => c.catagoryID === id)?.categorytype ?? "—";

// ── Section header inside the drawer ─────────────────────────────────────────
const Section = ({ icon: Icon, title, children }) => (
  <div className="space-y-3">
    <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
      <Icon size={15} className="text-tenzy-teal" />
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

const Input = ({ ...props }) => (
  <input
    className="w-full text-sm px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-tenzy-teal/30 focus:border-tenzy-teal transition"
    {...props}
  />
);

const Select = ({ children, ...props }) => (
  <select
    className="w-full text-sm px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-tenzy-teal/30 focus:border-tenzy-teal transition"
    {...props}
  >
    {children}
  </select>
);

// ── Empty form state ──────────────────────────────────────────────────────────
const emptyForm = () => ({
  name: "", brandid: 1, categoryid: 1, description: "", weight: "",
  insale: false,
  stock: "",
  price: "", discountrate: "0", StartUTC: new Date().toISOString().slice(0, 10), EndUTC: "",
  images: [],
  concerns: [],
  paymentOptions: [],
  faqs: [],
});

export default function AdminProducts() {
  const [products, setProducts]     = useState(ADMIN_PRODUCTS);
  const [search, setSearch]         = useState("");
  const [catFilter, setCatFilter]   = useState(0); // 0 = All
  const [drawer, setDrawer]         = useState(null); // null | "add" | "edit"
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm]             = useState(emptyForm());
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [newImageUrl, setNewImageUrl] = useState("");

  const filtered = useMemo(() =>
    products.filter((p) => {
      const q = search.toLowerCase();
      const matchSearch = p.name.toLowerCase().includes(q) || brandName(p.brandid).toLowerCase().includes(q);
      const matchCat = catFilter === 0 || p.categoryid === catFilter;
      return matchSearch && matchCat;
    }),
    [products, search, catFilter]
  );

  // ── Drawer open/close ───────────────────────────────────────────────────────
  const openAdd = () => {
    setForm(emptyForm());
    setEditTarget(null);
    setDrawer("add");
  };
  const openEdit = (p) => {
    setForm({
      ...p,
      weight: String(p.weight ?? ""),
      stock: String(p.stock),
      price: String(p.price),
      discountrate: String(p.discountrate),
      EndUTC: p.EndUTC ?? "",
      images: p.images.map((img) => ({ ...img })),
      concerns: [...p.concerns],
      paymentOptions: p.paymentOptions.map((po) => ({ ...po })),
      faqs: p.faqs.map((f) => ({ ...f })),
    });
    setEditTarget(p);
    setDrawer("edit");
  };
  const closeDrawer = () => { setDrawer(null); setEditTarget(null); setNewImageUrl(""); };

  // ── Save ────────────────────────────────────────────────────────────────────
  const handleSave = () => {
    if (!form.name.trim() || !form.price || !form.stock) return;
    const entry = {
      ...form,
      productid: drawer === "add" ? Date.now() : editTarget.productid,
      weight: form.weight ? parseFloat(form.weight) : null,
      stock: parseInt(form.stock, 10),
      price: parseFloat(form.price),
      discountrate: parseFloat(form.discountrate) || 0,
      EndUTC: form.EndUTC || null,
      sold: drawer === "add" ? 0 : editTarget.sold,
    };
    if (drawer === "add") {
      setProducts((prev) => [entry, ...prev]);
    } else {
      setProducts((prev) => prev.map((p) => (p.productid === editTarget.productid ? entry : p)));
    }
    closeDrawer();
  };

  const handleDelete = (id) => {
    setProducts((prev) => prev.filter((p) => p.productid !== id));
    setDeleteConfirm(null);
  };

  // ── Image helpers ────────────────────────────────────────────────────────────
  const addImage = () => {
    const url = newImageUrl.trim();
    if (!url) return;
    const isFirst = form.images.length === 0;
    setForm((f) => ({
      ...f,
      images: [...f.images, { ImageId: Date.now(), ImageUrl: url, IsPrimary: isFirst, SortOrder: f.images.length + 1 }],
    }));
    setNewImageUrl("");
  };
  const setPrimary = (imgId) => {
    setForm((f) => ({
      ...f,
      images: f.images.map((img) => ({ ...img, IsPrimary: img.ImageId === imgId })),
    }));
  };
  const removeImage = (imgId) => {
    setForm((f) => {
      const next = f.images.filter((img) => img.ImageId !== imgId);
      // ensure at least one primary if images remain
      if (next.length > 0 && !next.some((i) => i.IsPrimary)) next[0].IsPrimary = true;
      return { ...f, images: next.map((img, idx) => ({ ...img, SortOrder: idx + 1 })) };
    });
  };
  const moveImage = (imgId, dir) => {
    setForm((f) => {
      const arr = [...f.images];
      const idx = arr.findIndex((i) => i.ImageId === imgId);
      const to = idx + dir;
      if (to < 0 || to >= arr.length) return f;
      [arr[idx], arr[to]] = [arr[to], arr[idx]];
      return { ...f, images: arr.map((img, i) => ({ ...img, SortOrder: i + 1 })) };
    });
  };

  // ── Concern toggle ───────────────────────────────────────────────────────────
  const toggleConcern = (id) => {
    setForm((f) => ({
      ...f,
      concerns: f.concerns.includes(id) ? f.concerns.filter((c) => c !== id) : [...f.concerns, id],
    }));
  };

  // ── Payment option toggle ────────────────────────────────────────────────────
  const togglePayment = (id) => {
    setForm((f) => {
      const exists = f.paymentOptions.find((p) => p.PaymentTypeId === id);
      return {
        ...f,
        paymentOptions: exists
          ? f.paymentOptions.filter((p) => p.PaymentTypeId !== id)
          : [...f.paymentOptions, { PaymentTypeId: id, instalment: null }],
      };
    });
  };
  const setInstalment = (id, val) => {
    setForm((f) => ({
      ...f,
      paymentOptions: f.paymentOptions.map((p) =>
        p.PaymentTypeId === id ? { ...p, instalment: val ? parseInt(val, 10) : null } : p
      ),
    }));
  };

  // ── FAQ helpers ──────────────────────────────────────────────────────────────
  const addFaq = () => {
    setForm((f) => ({ ...f, faqs: [...f.faqs, { FAQId: Date.now(), Question: "", Answer: "" }] }));
  };
  const updateFaq = (faqId, field, val) => {
    setForm((f) => ({ ...f, faqs: f.faqs.map((fq) => fq.FAQId === faqId ? { ...fq, [field]: val } : fq) }));
  };
  const removeFaq = (faqId) => {
    setForm((f) => ({ ...f, faqs: f.faqs.filter((fq) => fq.FAQId !== faqId) }));
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900">Products</h1>
          <p className="text-sm text-slate-500 mt-0.5">{products.length} products · {products.filter(p => p.stock === 0).length} out of stock</p>
        </div>
        <button onClick={openAdd}
          className="flex items-center gap-2 bg-tenzy-teal text-white text-sm font-semibold px-4 py-2 rounded-xl hover:opacity-90 transition active:scale-95 shadow-lg shadow-tenzy-teal/20">
          <Plus size={16} /> <span className="hidden sm:inline">Add Product</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-3 md:p-4 shadow-sm border border-slate-100 space-y-3">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products or brand…"
            className="w-full pl-9 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-tenzy-teal/30 focus:border-tenzy-teal transition" />
          {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2"><X size={14} className="text-slate-400" /></button>}
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          <button onClick={() => setCatFilter(0)}
            className={`flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full border transition ${catFilter === 0 ? "bg-tenzy-teal text-white border-tenzy-teal" : "border-slate-200 text-slate-600 hover:border-tenzy-teal hover:text-tenzy-teal"}`}>
            All
          </button>
          {CATEGORIES.map((c) => (
            <button key={c.catagoryID} onClick={() => setCatFilter(c.catagoryID)}
              className={`flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full border transition ${catFilter === c.catagoryID ? "bg-tenzy-teal text-white border-tenzy-teal" : "border-slate-200 text-slate-600 hover:border-tenzy-teal hover:text-tenzy-teal"}`}>
              {c.categorytype}
            </button>
          ))}
        </div>
      </div>

      {/* Product Table (desktop) + Cards (mobile) */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {/* Mobile cards */}
        <div className="md:hidden divide-y divide-slate-50">
          {filtered.length === 0 && <p className="text-sm text-slate-400 text-center py-12">No products found.</p>}
          {filtered.map((p) => {
            const st = stockStatus(p);
            const img = primaryImage(p);
            return (
              <div key={p.productid} className="p-4 flex items-center gap-3">
                <div className="w-14 h-14 rounded-xl bg-slate-100 overflow-hidden flex-shrink-0">
                  {img && <img src={img} alt={p.name} className="w-full h-full object-cover" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-800 truncate">{p.name}</p>
                  <p className="text-[10px] text-slate-400">{brandName(p.brandid)} · {catName(p.categoryid)}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs font-bold text-tenzy-teal">LKR {fmt(p.price)}</span>
                    {p.discountrate > 0 && <span className="text-[10px] text-tenzy-orange font-semibold">-{p.discountrate}%</span>}
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${st.cls}`}>{st.label}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5 flex-shrink-0">
                  <button onClick={() => openEdit(p)} className="p-2 rounded-lg bg-slate-100 hover:bg-tenzy-teal hover:text-white transition"><Edit2 size={13} /></button>
                  <button onClick={() => setDeleteConfirm(p.productid)} className="p-2 rounded-lg bg-slate-100 hover:bg-red-500 hover:text-white transition"><Trash2 size={13} /></button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {["Product", "Brand", "Category", "Price", "Discount", "Stock", "Sale", "Images", "Actions"].map((h) => (
                  <th key={h} className="text-left text-xs font-semibold text-slate-500 px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.length === 0 && (
                <tr><td colSpan={9} className="text-center py-12 text-sm text-slate-400">No products found.</td></tr>
              )}
              {filtered.map((p) => {
                const st  = stockStatus(p);
                const img = primaryImage(p);
                return (
                  <tr key={p.productid} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-slate-100 overflow-hidden flex-shrink-0">
                          {img && <img src={img} alt={p.name} className="w-full h-full object-cover" />}
                        </div>
                        <p className="text-xs font-semibold text-slate-800 max-w-[160px] truncate">{p.name}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">{brandName(p.brandid)}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">{catName(p.categoryid)}</td>
                    <td className="px-4 py-3 text-xs font-bold text-slate-800">LKR {fmt(p.price)}</td>
                    <td className="px-4 py-3 text-xs text-tenzy-orange font-semibold">{p.discountrate > 0 ? `${p.discountrate}%` : "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${st.cls}`}>{p.stock} · {st.label}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${p.insale ? "bg-tenzy-orange/10 text-tenzy-orange" : "bg-slate-100 text-slate-400"}`}>
                        {p.insale ? "On Sale" : "Regular"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">{p.images.length} img{p.images.length !== 1 ? "s" : ""}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg hover:bg-tenzy-teal hover:text-white text-slate-500 transition"><Edit2 size={13} /></button>
                        <button onClick={() => setDeleteConfirm(p.productid)} className="p-1.5 rounded-lg hover:bg-red-500 hover:text-white text-slate-500 transition"><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Add/Edit Drawer ──────────────────────────────────────────────────── */}
      {drawer && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={closeDrawer} />
          <div className="fixed inset-y-0 right-0 w-full sm:w-[480px] bg-white z-50 flex flex-col shadow-2xl">
            {/* Drawer header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <p className="font-bold text-slate-900">{drawer === "add" ? "Add Product" : "Edit Product"}</p>
              <button onClick={closeDrawer} className="p-1.5 rounded-full hover:bg-slate-100"><X size={18} /></button>
            </div>

            {/* Scrollable form */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">

              {/* 1. Basic Info */}
              <Section icon={Info} title="Basic Info">
                <Field label="Product Name" required>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. CeraVe Moisturizing Cream" />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Brand" required>
                    <Select value={form.brandid} onChange={(e) => setForm({ ...form, brandid: parseInt(e.target.value) })}>
                      {BRANDS.map((b) => <option key={b.Brandid} value={b.Brandid}>{b.name}</option>)}
                    </Select>
                  </Field>
                  <Field label="Category" required>
                    <Select value={form.categoryid} onChange={(e) => setForm({ ...form, categoryid: parseInt(e.target.value) })}>
                      {CATEGORIES.map((c) => <option key={c.catagoryID} value={c.catagoryID}>{c.categorytype}</option>)}
                    </Select>
                  </Field>
                </div>
                <Field label="Description">
                  <textarea
                    rows={3}
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Product description…"
                    className="w-full text-sm px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-tenzy-teal/30 focus:border-tenzy-teal transition resize-none"
                  />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Weight (g)">
                    <Input type="number" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} placeholder="e.g. 340" />
                  </Field>
                  <Field label="On Sale">
                    <div className="flex items-center gap-3 mt-1">
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, insale: !form.insale })}
                        className={`relative w-11 h-6 rounded-full transition-colors ${form.insale ? "bg-tenzy-orange" : "bg-slate-200"}`}
                      >
                        <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${form.insale ? "translate-x-5" : "translate-x-0"}`} />
                      </button>
                      <span className="text-xs font-semibold text-slate-600">{form.insale ? "Yes" : "No"}</span>
                    </div>
                  </Field>
                </div>
              </Section>

              {/* 2. Inventory & Pricing */}
              <Section icon={DollarSign} title="Inventory & Pricing">
                <Field label="Stock Quantity" required>
                  <Input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} placeholder="0" />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Price (LKR)" required>
                    <Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="0.00" />
                  </Field>
                  <Field label="Discount Rate (%)">
                    <Input type="number" min="0" max="100" value={form.discountrate} onChange={(e) => setForm({ ...form, discountrate: e.target.value })} placeholder="0" />
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Pricing Start Date">
                    <Input type="date" value={form.StartUTC} onChange={(e) => setForm({ ...form, StartUTC: e.target.value })} />
                  </Field>
                  <Field label="Pricing End Date">
                    <Input type="date" value={form.EndUTC} onChange={(e) => setForm({ ...form, EndUTC: e.target.value })} />
                  </Field>
                </div>
                {form.price && form.discountrate > 0 && (
                  <div className="bg-tenzy-teal/10 rounded-xl px-3 py-2 text-xs text-tenzy-teal font-semibold">
                    Sale price: LKR {fmt(Math.round(parseFloat(form.price) * (1 - parseFloat(form.discountrate) / 100)))}
                  </div>
                )}
              </Section>

              {/* 3. Product Images */}
              <Section icon={ImagePlus} title="Product Images">
                <div className="space-y-2">
                  {form.images.length === 0 && (
                    <p className="text-xs text-slate-400 text-center py-4 bg-slate-50 rounded-xl">No images yet. Add one below.</p>
                  )}
                  {form.images.map((img, idx) => (
                    <div key={img.ImageId} className="flex items-center gap-2 bg-slate-50 rounded-xl p-2">
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-slate-200 flex-shrink-0">
                        <img src={img.ImageUrl} alt="" className="w-full h-full object-cover" onError={(e) => { e.target.style.display = "none"; }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-slate-500 truncate">{img.ImageUrl}</p>
                        <p className="text-[10px] text-slate-400">Sort #{img.SortOrder}</p>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <button onClick={() => moveImage(img.ImageId, -1)} disabled={idx === 0} className="p-0.5 rounded hover:bg-slate-200 disabled:opacity-30"><ChevronUp size={12} /></button>
                        <button onClick={() => moveImage(img.ImageId, 1)} disabled={idx === form.images.length - 1} className="p-0.5 rounded hover:bg-slate-200 disabled:opacity-30"><ChevronDown size={12} /></button>
                      </div>
                      <button
                        onClick={() => setPrimary(img.ImageId)}
                        title={img.IsPrimary ? "Primary image" : "Set as primary"}
                        className={`p-1.5 rounded-lg transition ${img.IsPrimary ? "bg-amber-100 text-amber-500" : "bg-slate-100 text-slate-400 hover:text-amber-500"}`}
                      >
                        {img.IsPrimary ? <Star size={13} fill="currentColor" /> : <StarOff size={13} />}
                      </button>
                      <button onClick={() => removeImage(img.ImageId)} className="p-1.5 rounded-lg hover:bg-red-100 hover:text-red-500 text-slate-400 transition"><X size={13} /></button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={newImageUrl}
                    onChange={(e) => setNewImageUrl(e.target.value)}
                    placeholder="Paste image URL…"
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addImage())}
                  />
                  <button onClick={addImage} className="flex-shrink-0 px-3 py-2 bg-tenzy-teal text-white rounded-xl text-xs font-semibold hover:opacity-90 transition">
                    <Plus size={15} />
                  </button>
                </div>
                <p className="text-[10px] text-slate-400">
                  ★ = Primary image shown in the shop. First image added becomes primary automatically.
                </p>
              </Section>

              {/* 4. Skin Concerns */}
              <Section icon={Tag} title="Skin Concerns">
                <div className="flex flex-wrap gap-2">
                  {CONCERN_TYPES.map((c) => {
                    const active = form.concerns.includes(c.ConcernTypeId);
                    return (
                      <button
                        key={c.ConcernTypeId}
                        type="button"
                        onClick={() => toggleConcern(c.ConcernTypeId)}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition ${
                          active ? "bg-tenzy-teal text-white border-tenzy-teal" : "border-slate-200 text-slate-600 hover:border-tenzy-teal hover:text-tenzy-teal"
                        }`}
                      >
                        {c.ConcernType}
                      </button>
                    );
                  })}
                </div>
              </Section>

              {/* 5. Payment Options */}
              <Section icon={CreditCard} title="Payment Options">
                <div className="space-y-2">
                  {PAYMENT_TYPES.map((pt) => {
                    const selected = form.paymentOptions.find((p) => p.PaymentTypeId === pt.PaymentTypeId);
                    return (
                      <div key={pt.PaymentTypeId} className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => togglePayment(pt.PaymentTypeId)}
                          className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition ${
                            selected ? "bg-tenzy-teal border-tenzy-teal" : "border-slate-300"
                          }`}
                        >
                          {selected && <span className="text-white text-[10px] font-bold">✓</span>}
                        </button>
                        <span className="text-xs text-slate-700 flex-1">{pt.PaymentType}</span>
                        {selected && pt.PaymentTypeId !== 1 && (
                          <input
                            type="number"
                            min="1"
                            value={selected.instalment ?? ""}
                            onChange={(e) => setInstalment(pt.PaymentTypeId, e.target.value)}
                            placeholder="Months"
                            className="w-20 text-xs px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-tenzy-teal/30"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </Section>

              {/* 6. FAQ */}
              <Section icon={MessageSquare} title="Product FAQ">
                <div className="space-y-3">
                  {form.faqs.map((fq) => (
                    <div key={fq.FAQId} className="bg-slate-50 rounded-xl p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase">Q&amp;A</span>
                        <button onClick={() => removeFaq(fq.FAQId)} className="text-slate-400 hover:text-red-500"><X size={13} /></button>
                      </div>
                      <Input
                        value={fq.Question}
                        onChange={(e) => updateFaq(fq.FAQId, "Question", e.target.value)}
                        placeholder="Question…"
                      />
                      <textarea
                        rows={2}
                        value={fq.Answer}
                        onChange={(e) => updateFaq(fq.FAQId, "Answer", e.target.value)}
                        placeholder="Answer…"
                        className="w-full text-sm px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-tenzy-teal/30 focus:border-tenzy-teal transition resize-none"
                      />
                    </div>
                  ))}
                  <button onClick={addFaq}
                    className="w-full py-2 rounded-xl border-2 border-dashed border-slate-200 text-xs font-semibold text-slate-500 hover:border-tenzy-teal hover:text-tenzy-teal transition flex items-center justify-center gap-1.5">
                    <Plus size={13} /> Add FAQ
                  </button>
                </div>
              </Section>
            </div>

            {/* Drawer footer */}
            <div className="px-5 py-4 border-t border-slate-100 flex gap-3">
              <button onClick={closeDrawer}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition">
                Cancel
              </button>
              <button onClick={handleSave}
                className="flex-1 py-2.5 rounded-xl bg-tenzy-teal text-white text-sm font-bold hover:opacity-90 transition">
                {drawer === "add" ? "Add Product" : "Save Changes"}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDeleteConfirm(null)} />
          <div className="relative bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center"><AlertTriangle size={18} className="text-red-500" /></div>
              <p className="font-bold text-slate-900">Delete Product?</p>
            </div>
            <p className="text-sm text-slate-500 mb-5">This will permanently remove the product and all associated data.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600">Cancel</button>
              <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 transition">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
