import React, { useState, useEffect, useCallback } from "react";
import { Plus, X, Edit2, AlertTriangle, ImagePlus, PowerOff } from "lucide-react";
import { categoriesApi, concernsApi, paymentApi, brandsApi, uploadApi } from "../../services/api";

const TABS = ["Categories", "Concern Types", "Payment Types", "Brands"];

const Input = ({ ...props }) => (
  <input
    className="w-full text-sm px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-tenzy-teal/30 focus:border-tenzy-teal transition"
    {...props}
  />
);

/* ── Categories ────────────────────────────────────────────────────────────── */
function CategoriesTab() {
  const [items,       setItems]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [formValue,   setFormValue]   = useState("");
  const [editTarget,  setEditTarget]  = useState(null);
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState("");
  const [deactConfirm, setDeactConfirm] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    categoriesApi.getAll()
      .then((data) => setItems(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setEditTarget(null); setFormValue(""); setError(""); };
  const openEdit = (item) => {
    setEditTarget(item);
    setFormValue(item.categoryType ?? item.categorytype ?? "");
    setError("");
  };
  const cancel = () => { setEditTarget(null); setFormValue(""); setError(""); };

  const handleSave = async () => {
    if (!formValue.trim()) { setError("Name is required."); return; }
    setSaving(true);
    setError("");
    try {
      if (editTarget) {
        const id = editTarget.categoryId ?? editTarget.catagoryID;
        await categoriesApi.update({ categoryId: id, categoryType: formValue.trim() });
      } else {
        await categoriesApi.create({ categoryType: formValue.trim() });
      }
      cancel();
      load();
    } catch (err) {
      setError(err.message || "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (id) => {
    try {
      await categoriesApi.deactivate(id);
      load();
    } catch (err) {
      alert(err.message || "Deactivate failed.");
    }
    setDeactConfirm(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{items.length} active categories</p>
        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 bg-tenzy-teal text-white rounded-xl hover:opacity-90 transition active:scale-95">
          <Plus size={15} /> Add Category
        </button>
      </div>

      {(editTarget !== null || formValue !== "" || error) && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
          <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            {editTarget ? "Edit Category" : "New Category"}
          </p>
          <Input
            value={formValue}
            onChange={(e) => setFormValue(e.target.value)}
            placeholder="e.g. Moisturizers"
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
            autoFocus
          />
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-2">
            <button onClick={cancel}
              className="flex-1 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-100 transition">
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving}
              className="flex-1 py-2 rounded-xl bg-tenzy-teal text-white text-sm font-bold hover:opacity-90 transition disabled:opacity-60">
              {saving ? "Saving…" : editTarget ? "Save Changes" : "Add"}
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 divide-y divide-slate-50">
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 rounded-full border-4 border-tenzy-teal/30 border-t-tenzy-teal animate-spin" />
          </div>
        )}
        {!loading && items.length === 0 && (
          <p className="text-sm text-slate-400 text-center py-12">No categories yet.</p>
        )}
        {items.map((item) => {
          const id    = item.categoryId ?? item.catagoryID;
          const label = item.categoryType ?? item.categorytype ?? "—";
          return (
            <div key={id} className="flex items-center gap-3 px-4 py-3">
              <span className="flex-1 text-sm text-slate-800 font-medium">{label}</span>
              <button onClick={() => openEdit(item)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-tenzy-teal hover:text-white transition">
                <Edit2 size={14} />
              </button>
              <button onClick={() => setDeactConfirm(id)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-red-500 hover:text-white transition">
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>

      {deactConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDeactConfirm(null)} />
          <div className="relative bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                <AlertTriangle size={18} className="text-amber-500" />
              </div>
              <p className="font-bold text-slate-900">Deactivate Category?</p>
            </div>
            <p className="text-sm text-slate-500 mb-5">This will hide the category from product lists.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeactConfirm(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600">Cancel</button>
              <button onClick={() => handleDeactivate(deactConfirm)}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 text-white text-sm font-bold hover:bg-amber-600 transition">Deactivate</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Concern Types ─────────────────────────────────────────────────────────── */
function ConcernTypesTab() {
  const [items,       setItems]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [loadError,   setLoadError]   = useState("");
  const [formName,    setFormName]    = useState("");
  const [formDesc,    setFormDesc]    = useState("");
  const [editTarget,  setEditTarget]  = useState(null);
  const [saving,      setSaving]      = useState(false);
  const [formError,   setFormError]   = useState("");
  const [deactConfirm, setDeactConfirm] = useState(null);
  const [showForm,    setShowForm]    = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setLoadError("");
    concernsApi.getAll()
      .then((data) => setItems(Array.isArray(data) ? data : []))
      .catch((err) => setLoadError(err.message || "Failed to load concern types."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => {
    setEditTarget(null);
    setFormName("");
    setFormDesc("");
    setFormError("");
    setShowForm(true);
  };

  const openEdit = (item) => {
    setEditTarget(item);
    setFormName(item.name ?? item.Name ?? "");
    setFormDesc(item.description ?? item.Description ?? "");
    setFormError("");
    setShowForm(true);
  };

  const cancel = () => {
    setShowForm(false);
    setEditTarget(null);
    setFormName("");
    setFormDesc("");
    setFormError("");
  };

  const handleSave = async () => {
    if (!formName.trim()) { setFormError("Name is required."); return; }
    setSaving(true);
    setFormError("");
    try {
      if (editTarget) {
        const id = editTarget.concernTypeId ?? editTarget.ConcernTypeId;
        await concernsApi.update(id, { concernTypeId: id, name: formName.trim(), description: formDesc.trim() });
      } else {
        await concernsApi.create({ name: formName.trim(), description: formDesc.trim() });
      }
      cancel();
      load();
    } catch (err) {
      setFormError(err.message || "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (id) => {
    try {
      await concernsApi.deactivate(id);
      load();
    } catch (err) {
      alert(err.message || "Deactivate failed.");
    }
    setDeactConfirm(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{items.length} concern types</p>
        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 bg-tenzy-teal text-white rounded-xl hover:opacity-90 transition active:scale-95">
          <Plus size={15} /> Add Concern Type
        </button>
      </div>

      {showForm && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
          <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            {editTarget ? "Edit Concern Type" : "New Concern Type"}
          </p>
          <Input
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            placeholder="e.g. Acne-prone"
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
            autoFocus
          />
          <Input
            value={formDesc}
            onChange={(e) => setFormDesc(e.target.value)}
            placeholder="Description (optional)"
          />
          {formError && <p className="text-xs text-red-500">{formError}</p>}
          <div className="flex gap-2">
            <button onClick={cancel}
              className="flex-1 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-100 transition">
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving}
              className="flex-1 py-2 rounded-xl bg-tenzy-teal text-white text-sm font-bold hover:opacity-90 transition disabled:opacity-60">
              {saving ? "Saving…" : editTarget ? "Save Changes" : "Add"}
            </button>
          </div>
        </div>
      )}

      {loadError && (
        <div className="bg-red-50 border border-red-100 rounded-2xl px-4 py-3">
          <p className="text-sm text-red-600">{loadError}</p>
          <button onClick={load} className="text-xs text-red-500 underline mt-1">Retry</button>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 divide-y divide-slate-50">
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 rounded-full border-4 border-tenzy-teal/30 border-t-tenzy-teal animate-spin" />
          </div>
        )}
        {!loading && !loadError && items.length === 0 && (
          <p className="text-sm text-slate-400 text-center py-12">No concern types yet. Add one above.</p>
        )}
        {items.map((item) => {
          const id    = item.concernTypeId ?? item.ConcernTypeId;
          const label = item.name ?? item.Name ?? item.concernType ?? item.ConcernType ?? "—";
          const desc  = item.description ?? item.Description ?? "";
          return (
            <div key={id} className="flex items-center gap-3 px-4 py-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-800 font-medium">{label}</p>
                {desc && <p className="text-[10px] text-slate-400 truncate">{desc}</p>}
              </div>
              <button onClick={() => openEdit(item)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-tenzy-teal hover:text-white transition">
                <Edit2 size={14} />
              </button>
              <button onClick={() => setDeactConfirm(id)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-red-500 hover:text-white transition">
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>

      {deactConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDeactConfirm(null)} />
          <div className="relative bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                <AlertTriangle size={18} className="text-amber-500" />
              </div>
              <p className="font-bold text-slate-900">Deactivate Concern Type?</p>
            </div>
            <p className="text-sm text-slate-500 mb-5">This will hide the concern type from products.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeactConfirm(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600">Cancel</button>
              <button onClick={() => handleDeactivate(deactConfirm)}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 text-white text-sm font-bold hover:bg-amber-600 transition">Deactivate</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Payment Types ─────────────────────────────────────────────────────────── */
function PaymentTypesTab() {
  const [items,        setItems]        = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [loadError,    setLoadError]    = useState("");
  const [formName,     setFormName]     = useState("");
  const [editTarget,   setEditTarget]   = useState(null);
  const [saving,       setSaving]       = useState(false);
  const [formError,    setFormError]    = useState("");
  const [deactConfirm, setDeactConfirm] = useState(null);
  const [showForm,     setShowForm]     = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setLoadError("");
    paymentApi.getAll()
      .then((data) => setItems(Array.isArray(data) ? data : []))
      .catch((err) => setLoadError(err.message || "Failed to load payment types."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => {
    setEditTarget(null);
    setFormName("");
    setFormError("");
    setShowForm(true);
  };

  const openEdit = (item) => {
    setEditTarget(item);
    setFormName(item.name ?? item.Name ?? "");
    setFormError("");
    setShowForm(true);
  };

  const cancel = () => {
    setShowForm(false);
    setEditTarget(null);
    setFormName("");
    setFormError("");
  };

  const handleSave = async () => {
    if (!formName.trim()) { setFormError("Name is required."); return; }
    setSaving(true);
    setFormError("");
    try {
      if (editTarget) {
        const id = editTarget.paymentTypeId ?? editTarget.PaymentTypeId;
        await paymentApi.update(id, { paymentTypeId: id, name: formName.trim() });
      } else {
        await paymentApi.create({ name: formName.trim() });
      }
      cancel();
      load();
    } catch (err) {
      setFormError(err.message || "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (id) => {
    try {
      await paymentApi.deactivate(id);
      load();
    } catch (err) {
      alert(err.message || "Deactivate failed.");
    }
    setDeactConfirm(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{items.length} payment types</p>
        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 bg-tenzy-teal text-white rounded-xl hover:opacity-90 transition active:scale-95">
          <Plus size={15} /> Add Payment Type
        </button>
      </div>

      {showForm && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
          <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            {editTarget ? "Edit Payment Type" : "New Payment Type"}
          </p>
          <Input
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            placeholder="e.g. Credit Card"
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
            autoFocus
          />
          {formError && <p className="text-xs text-red-500">{formError}</p>}
          <div className="flex gap-2">
            <button onClick={cancel}
              className="flex-1 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-100 transition">
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving}
              className="flex-1 py-2 rounded-xl bg-tenzy-teal text-white text-sm font-bold hover:opacity-90 transition disabled:opacity-60">
              {saving ? "Saving…" : editTarget ? "Save Changes" : "Add"}
            </button>
          </div>
        </div>
      )}

      {loadError && (
        <div className="bg-red-50 border border-red-100 rounded-2xl px-4 py-3">
          <p className="text-sm text-red-600">{loadError}</p>
          <button onClick={load} className="text-xs text-red-500 underline mt-1">Retry</button>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 divide-y divide-slate-50">
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 rounded-full border-4 border-tenzy-teal/30 border-t-tenzy-teal animate-spin" />
          </div>
        )}
        {!loading && !loadError && items.length === 0 && (
          <p className="text-sm text-slate-400 text-center py-12">No payment types yet. Add one above.</p>
        )}
        {items.map((item) => {
          const id    = item.paymentTypeId ?? item.PaymentTypeId;
          const label = item.name ?? item.Name ?? item.paymentType ?? item.PaymentType ?? "—";
          return (
            <div key={id} className="flex items-center gap-3 px-4 py-3">
              <span className="flex-1 text-sm text-slate-800 font-medium">{label}</span>
              <button onClick={() => openEdit(item)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-tenzy-teal hover:text-white transition">
                <Edit2 size={14} />
              </button>
              <button onClick={() => setDeactConfirm(id)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-red-500 hover:text-white transition"
                title="Deactivate">
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>

      {deactConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDeactConfirm(null)} />
          <div className="relative bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                <AlertTriangle size={18} className="text-amber-500" />
              </div>
              <p className="font-bold text-slate-900">Deactivate Payment Type?</p>
            </div>
            <p className="text-sm text-slate-500 mb-5">This payment type will be hidden from products.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeactConfirm(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600">Cancel</button>
              <button onClick={() => handleDeactivate(deactConfirm)}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 text-white text-sm font-bold hover:bg-amber-600 transition">Deactivate</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Brands ────────────────────────────────────────────────────────────────── */
const BRAND_EMPTY = { name: "", brandImage: "" };

function BrandsTab() {
  const [brands,     setBrands]     = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [modal,      setModal]      = useState(null);
  const [form,       setForm]       = useState(BRAND_EMPTY);
  const [editId,     setEditId]     = useState(null);
  const [deleteId,   setDeleteId]   = useState(null);
  const [previewErr, setPreviewErr] = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [uploading,  setUploading]  = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    brandsApi.getAll()
      .then((data) => setBrands(Array.isArray(data) ? data : []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAdd  = () => { setForm(BRAND_EMPTY); setModal("add"); setPreviewErr(false); };
  const openEdit = (b) => { setForm({ name: b.name, brandImage: b.brandImage ?? "" }); setEditId(b.brandId); setModal("edit"); setPreviewErr(false); };
  const close    = () => { setModal(null); setEditId(null); };

  const handleImageFilePick = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setUploading(true);
    try {
      const url = await uploadApi.uploadImage(file);
      setForm((f) => ({ ...f, brandImage: url }));
      setPreviewErr(false);
    } catch (err) { alert(err.message || "Image upload failed."); }
    finally { setUploading(false); }
  };

  const handleSave = async () => {
    if (!form.name.trim() || saving) return;
    setSaving(true);
    try {
      if (modal === "add") {
        await brandsApi.create({ name: form.name.trim(), brandImage: form.brandImage.trim() || null });
      } else {
        await brandsApi.update({ brandId: editId, name: form.name.trim(), brandImage: form.brandImage.trim() || null });
      }
      load(); close();
    } catch (err) { alert(err.message); }
    finally { setSaving(false); }
  };

  const handleDeactivate = async (id) => {
    try {
      await brandsApi.deactivate(id);
      setBrands((prev) => prev.filter((b) => b.brandId !== id));
    } catch (err) { alert(err.message); }
    setDeleteId(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{brands.length} brands registered</p>
        <button onClick={openAdd}
          className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 bg-tenzy-teal text-white rounded-xl hover:opacity-90 transition active:scale-95">
          <Plus size={15} /> Add Brand
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 rounded-full border-4 border-tenzy-teal/30 border-t-tenzy-teal animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {brands.length === 0 && <p className="col-span-full text-sm text-slate-400 text-center py-12">No brands found.</p>}
          {brands.map((b) => (
            <div key={b.brandId} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden group">
              <div className="aspect-square bg-slate-50 relative overflow-hidden">
                {b.brandImage ? (
                  <img src={b.brandImage} alt={b.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImagePlus size={28} className="text-slate-300" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                  <button onClick={() => openEdit(b)}
                    className="w-9 h-9 bg-white rounded-xl flex items-center justify-center hover:bg-tenzy-teal hover:text-white transition shadow">
                    <Edit2 size={14} />
                  </button>
                  <button onClick={() => setDeleteId(b.brandId)}
                    className="w-9 h-9 bg-white rounded-xl flex items-center justify-center hover:bg-red-500 hover:text-white transition shadow">
                    <PowerOff size={14} />
                  </button>
                </div>
              </div>
              <div className="px-3 py-3">
                <p className="text-sm font-bold text-slate-800 truncate">{b.name}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Added: {b.createDate ? new Date(b.createDate).toLocaleDateString("en-GB") : "—"}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/40" onClick={close} />
          <div className="relative bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-3xl shadow-2xl">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <p className="font-bold text-slate-900">{modal === "add" ? "Add Brand" : "Edit Brand"}</p>
              <button onClick={close} className="p-1.5 rounded-full hover:bg-slate-100"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="w-full aspect-video rounded-xl bg-slate-50 overflow-hidden border-2 border-dashed border-slate-200 flex items-center justify-center">
                {form.brandImage && !previewErr ? (
                  <img src={form.brandImage} alt="preview" className="w-full h-full object-cover" onError={() => setPreviewErr(true)} />
                ) : (
                  <div className="text-center">
                    <ImagePlus size={32} className="text-slate-300 mx-auto mb-1" />
                    <p className="text-xs text-slate-400">Image preview</p>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Brand Name <span className="text-red-400">*</span></label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. CeraVe"
                  className="w-full text-sm px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-tenzy-teal/30 focus:border-tenzy-teal transition" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Brand Image</label>
                <label className={`flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border-2 border-dashed cursor-pointer transition
                  ${uploading ? "border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed" : "border-tenzy-teal/40 hover:border-tenzy-teal hover:bg-tenzy-teal/5 text-tenzy-teal"}`}>
                  <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden"
                    disabled={uploading} onChange={handleImageFilePick} />
                  <ImagePlus size={15} />
                  <span className="text-xs font-semibold">
                    {uploading ? "Uploading…" : form.brandImage ? "Replace image" : "Choose image to upload"}
                  </span>
                </label>
              </div>
              <div className="flex gap-3 pt-1">
                <button onClick={close}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition">Cancel</button>
                <button onClick={handleSave} disabled={saving}
                  className="flex-1 py-2.5 rounded-xl bg-tenzy-teal text-white text-sm font-bold hover:opacity-90 transition disabled:opacity-60">
                  {saving ? "Saving…" : modal === "add" ? "Add Brand" : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDeleteId(null)} />
          <div className="relative bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle size={18} className="text-red-500" />
              </div>
              <p className="font-bold text-slate-900">Deactivate Brand?</p>
            </div>
            <p className="text-sm text-slate-500 mb-5">This will deactivate the brand. Products linked to it may be affected.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600">Cancel</button>
              <button onClick={() => handleDeactivate(deleteId)}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 transition">Deactivate</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Page ──────────────────────────────────────────────────────────────────── */
export default function ReferenceData() {
  const [activeTab, setActiveTab] = useState(0);

  const TabContent = [CategoriesTab, ConcernTypesTab, PaymentTypesTab, BrandsTab][activeTab];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-slate-900">Reference Data</h1>
        <p className="text-sm text-slate-500 mt-0.5">Manage categories, concern types, payment options, and brands</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-1.5 flex gap-1">
        {TABS.map((tab, i) => (
          <button
            key={tab}
            onClick={() => setActiveTab(i)}
            className={`flex-1 text-sm font-semibold py-2 rounded-xl transition ${
              activeTab === i
                ? "bg-tenzy-teal text-white shadow"
                : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
            }`}>
            {tab}
          </button>
        ))}
      </div>

      <TabContent />
    </div>
  );
}
