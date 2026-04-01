import React, { useState, useEffect, useCallback } from "react";
import { Plus, Edit2, X, AlertTriangle, ImagePlus, PowerOff } from "lucide-react";
import { brandsApi } from "../../services/api";

const EMPTY = { name: "", brandImage: "" };

export default function BrandsPage() {
  const [brands,     setBrands]     = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [modal,      setModal]      = useState(null); // null | "add" | "edit"
  const [form,       setForm]       = useState(EMPTY);
  const [editId,     setEditId]     = useState(null);
  const [deleteId,   setDeleteId]   = useState(null);
  const [previewErr, setPreviewErr] = useState(false);
  const [saving,     setSaving]     = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    brandsApi.getAll()
      .then((data) => setBrands(Array.isArray(data) ? data : []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAdd  = () => { setForm(EMPTY); setModal("add"); setPreviewErr(false); };
  const openEdit = (b) => {
    setForm({ name: b.name, brandImage: b.brandImage ?? "" });
    setEditId(b.brandId);
    setModal("edit");
    setPreviewErr(false);
  };
  const close = () => { setModal(null); setEditId(null); };

  const handleSave = async () => {
    if (!form.name.trim() || saving) return;
    setSaving(true);
    try {
      if (modal === "add") {
        await brandsApi.create({ name: form.name.trim(), brandImage: form.brandImage.trim() || null });
      } else {
        await brandsApi.update({ brandId: editId, name: form.name.trim(), brandImage: form.brandImage.trim() || null });
      }
      load();
      close();
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

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 rounded-full border-4 border-tenzy-teal/30 border-t-tenzy-teal animate-spin" />
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900">Brands</h1>
          <p className="text-sm text-slate-500 mt-0.5">{brands.length} brands registered</p>
        </div>
        <button onClick={openAdd}
          className="flex items-center gap-2 bg-tenzy-teal text-white text-sm font-semibold px-4 py-2 rounded-xl hover:opacity-90 transition active:scale-95 shadow-lg shadow-tenzy-teal/20">
          <Plus size={16} /> <span className="hidden sm:inline">Add Brand</span>
        </button>
      </div>

      {/* Brand Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {brands.length === 0 && (
          <p className="col-span-full text-sm text-slate-400 text-center py-12">No brands found.</p>
        )}
        {brands.map((b) => (
          <div key={b.brandId} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden group">
            <div className="aspect-square bg-slate-50 relative overflow-hidden">
              {b.brandImage ? (
                <img src={b.brandImage} alt={b.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
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
              <p className="text-[10px] text-slate-400 mt-0.5">ID: {b.brandId}</p>
              <p className="text-[10px] text-slate-400">
                Added: {b.createDate ? new Date(b.createDate).toLocaleDateString("en-GB") : "—"}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/40" onClick={close} />
          <div className="relative bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-3xl shadow-2xl">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between rounded-t-3xl sm:rounded-t-2xl">
              <p className="font-bold text-slate-900">{modal === "add" ? "Add Brand" : "Edit Brand"}</p>
              <button onClick={close} className="p-1.5 rounded-full hover:bg-slate-100"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="w-full aspect-video rounded-xl bg-slate-50 overflow-hidden border-2 border-dashed border-slate-200 flex items-center justify-center">
                {form.brandImage && !previewErr ? (
                  <img src={form.brandImage} alt="preview" className="w-full h-full object-cover"
                    onError={() => setPreviewErr(true)} />
                ) : (
                  <div className="text-center">
                    <ImagePlus size={32} className="text-slate-300 mx-auto mb-1" />
                    <p className="text-xs text-slate-400">Image preview</p>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Brand Name <span className="text-red-400">*</span>
                </label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. CeraVe"
                  className="w-full text-sm px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-tenzy-teal/30 focus:border-tenzy-teal transition" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Brand Image URL</label>
                <input value={form.brandImage}
                  onChange={(e) => { setForm({ ...form, brandImage: e.target.value }); setPreviewErr(false); }}
                  placeholder="https://…"
                  className="w-full text-sm px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-tenzy-teal/30 focus:border-tenzy-teal transition" />
                <p className="text-[10px] text-slate-400 mt-1">Paste a direct image URL. Preview updates automatically.</p>
              </div>
              <div className="flex gap-3 pt-1">
                <button onClick={close}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition">
                  Cancel
                </button>
                <button onClick={handleSave} disabled={saving}
                  className="flex-1 py-2.5 rounded-xl bg-tenzy-teal text-white text-sm font-bold hover:opacity-90 transition disabled:opacity-60">
                  {saving ? "Saving…" : modal === "add" ? "Add Brand" : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Deactivate Confirm */}
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
            <p className="text-sm text-slate-500 mb-5">
              This will deactivate the brand. Products linked to it may be affected.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600">
                Cancel
              </button>
              <button onClick={() => handleDeactivate(deleteId)}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 transition">
                Deactivate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
