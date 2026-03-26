import React, { useState } from "react";
import { Plus, Edit2, Trash2, X, AlertTriangle, ImagePlus } from "lucide-react";
import { BRANDS } from "../dummydata/index";

const EMPTY = { name: "", barndimage: "" };

export default function BrandsPage() {
  const [brands, setBrands] = useState(BRANDS);
  const [modal, setModal]   = useState(null); // null | "add" | "edit"
  const [form, setForm]     = useState(EMPTY);
  const [editId, setEditId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [previewErr, setPreviewErr] = useState(false);

  const openAdd = () => { setForm(EMPTY); setModal("add"); setPreviewErr(false); };
  const openEdit = (b) => { setForm({ name: b.name, barndimage: b.barndimage ?? "" }); setEditId(b.Brandid); setModal("edit"); setPreviewErr(false); };
  const close = () => { setModal(null); setEditId(null); };

  const handleSave = () => {
    if (!form.name.trim()) return;
    const now = new Date().toISOString().slice(0, 10);
    if (modal === "add") {
      setBrands((prev) => [
        ...prev,
        { Brandid: Date.now(), name: form.name.trim(), barndimage: form.barndimage.trim() || null, createdate: now, lastupdated: null },
      ]);
    } else {
      setBrands((prev) =>
        prev.map((b) =>
          b.Brandid === editId
            ? { ...b, name: form.name.trim(), barndimage: form.barndimage.trim() || null, lastupdated: now }
            : b
        )
      );
    }
    close();
  };

  const handleDelete = (id) => {
    setBrands((prev) => prev.filter((b) => b.Brandid !== id));
    setDeleteId(null);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900">Brands</h1>
          <p className="text-sm text-slate-500 mt-0.5">{brands.length} brands registered</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 bg-tenzy-teal text-white text-sm font-semibold px-4 py-2 rounded-xl hover:opacity-90 transition active:scale-95 shadow-lg shadow-tenzy-teal/20"
        >
          <Plus size={16} /> <span className="hidden sm:inline">Add Brand</span>
        </button>
      </div>

      {/* Brand Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {brands.map((b) => (
          <div key={b.Brandid} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden group">
            {/* Image */}
            <div className="aspect-square bg-slate-50 relative overflow-hidden">
              {b.barndimage ? (
                <img
                  src={b.barndimage}
                  alt={b.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ImagePlus size={28} className="text-slate-300" />
                </div>
              )}
              {/* Hover actions */}
              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                <button
                  onClick={() => openEdit(b)}
                  className="w-9 h-9 bg-white rounded-xl flex items-center justify-center hover:bg-tenzy-teal hover:text-white transition shadow"
                >
                  <Edit2 size={14} />
                </button>
                <button
                  onClick={() => setDeleteId(b.Brandid)}
                  className="w-9 h-9 bg-white rounded-xl flex items-center justify-center hover:bg-red-500 hover:text-white transition shadow"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            {/* Info */}
            <div className="px-3 py-3">
              <p className="text-sm font-bold text-slate-800 truncate">{b.name}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">ID: {b.Brandid}</p>
              <p className="text-[10px] text-slate-400">Added: {b.createdate}</p>
              {b.lastupdated && (
                <p className="text-[10px] text-slate-400">Updated: {b.lastupdated}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/40" onClick={close} />
          <div className="relative bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-3xl shadow-2xl">
            {/* Modal header */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between rounded-t-3xl sm:rounded-t-2xl">
              <p className="font-bold text-slate-900">{modal === "add" ? "Add Brand" : "Edit Brand"}</p>
              <button onClick={close} className="p-1.5 rounded-full hover:bg-slate-100">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Image preview */}
              <div className="w-full aspect-video rounded-xl bg-slate-50 overflow-hidden border-2 border-dashed border-slate-200 flex items-center justify-center">
                {form.barndimage && !previewErr ? (
                  <img
                    src={form.barndimage}
                    alt="preview"
                    className="w-full h-full object-cover"
                    onError={() => setPreviewErr(true)}
                  />
                ) : (
                  <div className="text-center">
                    <ImagePlus size={32} className="text-slate-300 mx-auto mb-1" />
                    <p className="text-xs text-slate-400">Image preview</p>
                  </div>
                )}
              </div>

              {/* Brand Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Brand Name <span className="text-red-400">*</span>
                </label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. CeraVe"
                  className="w-full text-sm px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-tenzy-teal/30 focus:border-tenzy-teal transition"
                />
              </div>

              {/* Brand Image URL */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Brand Image URL</label>
                <input
                  value={form.barndimage}
                  onChange={(e) => { setForm({ ...form, barndimage: e.target.value }); setPreviewErr(false); }}
                  placeholder="https://…"
                  className="w-full text-sm px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-tenzy-teal/30 focus:border-tenzy-teal transition"
                />
                <p className="text-[10px] text-slate-400 mt-1">Paste a direct image URL. The preview updates automatically.</p>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <button onClick={close}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition">
                  Cancel
                </button>
                <button onClick={handleSave}
                  className="flex-1 py-2.5 rounded-xl bg-tenzy-teal text-white text-sm font-bold hover:opacity-90 transition">
                  {modal === "add" ? "Add Brand" : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDeleteId(null)} />
          <div className="relative bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle size={18} className="text-red-500" />
              </div>
              <p className="font-bold text-slate-900">Delete Brand?</p>
            </div>
            <p className="text-sm text-slate-500 mb-5">
              Deleting this brand may affect products linked to it. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600">
                Cancel
              </button>
              <button onClick={() => handleDelete(deleteId)}
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
