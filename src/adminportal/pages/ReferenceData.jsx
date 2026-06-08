import React, { useState, useEffect, useCallback } from "react";
import { Plus, X, Edit2, AlertTriangle, ImagePlus, PowerOff, CreditCard, ChevronDown, ChevronRight, Tag } from "lucide-react";
import { concernsApi, paymentApi, brandsApi, uploadApi, paymentCardsApi, shopsApi, categoriesApi, orderStatusApi, paymentStatusApi } from "../../services/api";

const TABS = ["Categories", "Concern Types", "Payment Types", "Brands", "Payment Cards", "Shops", "Order Status", "Payment Status"];

const Input = ({ ...props }) => (
  <input
    className="w-full text-sm px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-tenzy-teal/30 focus:border-tenzy-orange transition"
    {...props}
  />
);

/* ── Categories ────────────────────────────────────────────────────────────── */
function CategoriesTab() {
  const [categories,   setCategories]   = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [loadError,    setLoadError]    = useState("");
  const [expanded,     setExpanded]     = useState({});
  const [catForm,      setCatForm]      = useState({ show: false, name: "", editId: null, error: "", saving: false });
  const [subForm,      setSubForm]      = useState({ show: false, categoryId: null, name: "", editId: null, error: "", saving: false });
  const [deactConfirm, setDeactConfirm] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    setLoadError("");
    categoriesApi.getAll()
      .then((data) => setCategories(Array.isArray(data) ? data : []))
      .catch((err) => setLoadError(err.message || "Failed to load categories."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleExpand = (id) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  const openAddCategory = () => setCatForm({ show: true, name: "", editId: null, error: "", saving: false });
  const openEditCategory = (cat) => setCatForm({ show: true, name: cat.name, editId: cat.categoryId, error: "", saving: false });
  const closeCatForm = () => setCatForm({ show: false, name: "", editId: null, error: "", saving: false });

  const saveCatForm = async () => {
    if (!catForm.name.trim()) { setCatForm((f) => ({ ...f, error: "Name is required." })); return; }
    setCatForm((f) => ({ ...f, saving: true, error: "" }));
    try {
      if (catForm.editId) {
        await categoriesApi.update(catForm.editId, catForm.name.trim());
      } else {
        await categoriesApi.create(catForm.name.trim());
      }
      closeCatForm();
      load();
    } catch (err) {
      setCatForm((f) => ({ ...f, error: err.message || "Save failed.", saving: false }));
    }
  };

  const openAddSubCategory = (categoryId) => setSubForm({ show: true, categoryId, name: "", editId: null, error: "", saving: false });
  const openEditSubCategory = (sub) => setSubForm({ show: true, categoryId: sub.categoryId, name: sub.name, editId: sub.subCategoryId, error: "", saving: false });
  const closeSubForm = () => setSubForm({ show: false, categoryId: null, name: "", editId: null, error: "", saving: false });

  const saveSubForm = async () => {
    if (!subForm.name.trim()) { setSubForm((f) => ({ ...f, error: "Name is required." })); return; }
    setSubForm((f) => ({ ...f, saving: true, error: "" }));
    try {
      if (subForm.editId) {
        await categoriesApi.updateSubCategory(subForm.editId, subForm.name.trim());
      } else {
        await categoriesApi.createSubCategory(subForm.categoryId, subForm.name.trim());
      }
      closeSubForm();
      load();
    } catch (err) {
      setSubForm((f) => ({ ...f, error: err.message || "Save failed.", saving: false }));
    }
  };

  const handleDeactivate = async () => {
    if (!deactConfirm) return;
    try {
      if (deactConfirm.type === "category") {
        await categoriesApi.deactivate(deactConfirm.id);
      } else {
        await categoriesApi.deactivateSubCategory(deactConfirm.id);
      }
      load();
    } catch (err) {
      alert(err.message || "Deactivate failed.");
    }
    setDeactConfirm(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{categories.length} categories</p>
        <button onClick={openAddCategory}
          className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 bg-tenzy-teal text-white rounded-xl hover:opacity-90 transition active:scale-95">
          <Plus size={15} /> Add Category
        </button>
      </div>

      {catForm.show && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
          <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            {catForm.editId ? "Edit Category" : "New Category"}
          </p>
          <Input
            value={catForm.name}
            onChange={(e) => setCatForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="e.g. Cleansers"
            onKeyDown={(e) => e.key === "Enter" && saveCatForm()}
            autoFocus
          />
          {catForm.error && <p className="text-xs text-red-500">{catForm.error}</p>}
          <div className="flex gap-2">
            <button onClick={closeCatForm}
              className="flex-1 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-100 transition">Cancel</button>
            <button onClick={saveCatForm} disabled={catForm.saving}
              className="flex-1 py-2 rounded-xl bg-tenzy-teal text-white text-sm font-bold hover:opacity-90 transition disabled:opacity-60">
              {catForm.saving ? "Saving…" : catForm.editId ? "Save Changes" : "Add"}
            </button>
          </div>
        </div>
      )}

      {subForm.show && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 space-y-3">
          <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            {subForm.editId ? "Edit Sub-Category" : "New Sub-Category"}
          </p>
          <Input
            value={subForm.name}
            onChange={(e) => setSubForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="e.g. Hydrating cleansers"
            onKeyDown={(e) => e.key === "Enter" && saveSubForm()}
            autoFocus
          />
          {subForm.error && <p className="text-xs text-red-500">{subForm.error}</p>}
          <div className="flex gap-2">
            <button onClick={closeSubForm}
              className="flex-1 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-100 transition">Cancel</button>
            <button onClick={saveSubForm} disabled={subForm.saving}
              className="flex-1 py-2 rounded-xl bg-blue-500 text-white text-sm font-bold hover:opacity-90 transition disabled:opacity-60">
              {subForm.saving ? "Saving…" : subForm.editId ? "Save Changes" : "Add Sub-Category"}
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

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 rounded-full border-4 border-tenzy-teal/30 border-t-tenzy-teal animate-spin" />
          </div>
        )}
        {!loading && !loadError && categories.length === 0 && (
          <p className="text-sm text-slate-400 text-center py-12">No categories yet.</p>
        )}
        {categories.map((cat) => {
          const isOpen = !!expanded[cat.categoryId];
          const subs = cat.subCategories ?? [];
          return (
            <div key={cat.categoryId} className={`border-b border-slate-50 last:border-b-0 ${!cat.isActive ? "opacity-50" : ""}`}>
              <div className="flex items-center gap-2 px-4 py-3">
                <button onClick={() => toggleExpand(cat.categoryId)} className="text-slate-400 hover:text-tenzy-teal transition">
                  {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </button>
                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                  <Tag size={13} className="text-tenzy-teal shrink-0" />
                  <span className="text-sm font-semibold text-slate-800">{cat.name}</span>
                  <span className="text-xs text-slate-400 ml-1">({subs.length} sub-categories)</span>
                  {!cat.isActive && <span className="text-[10px] bg-red-100 text-red-500 px-2 py-0.5 rounded-full font-semibold">Inactive</span>}
                </div>
                <button onClick={() => openAddSubCategory(cat.categoryId)}
                  className="text-xs text-tenzy-teal font-semibold hover:underline shrink-0">+ Sub</button>
                <button onClick={() => openEditCategory(cat)}
                  className="p-1.5 rounded-lg text-slate-400 hover:bg-tenzy-teal hover:text-white transition">
                  <Edit2 size={13} />
                </button>
                <button onClick={() => setDeactConfirm({ type: "category", id: cat.categoryId, name: cat.name })}
                  className="p-1.5 rounded-lg text-slate-400 hover:bg-red-500 hover:text-white transition">
                  <X size={13} />
                </button>
              </div>

              {isOpen && subs.length > 0 && (
                <div className="ml-10 pb-2 space-y-0.5">
                  {subs.map((sub) => (
                    <div key={sub.subCategoryId} className={`flex items-center gap-2 px-4 py-1.5 rounded-xl hover:bg-slate-50 ${!sub.isActive ? "opacity-50" : ""}`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0" />
                      <span className="text-sm text-slate-700 flex-1">{sub.name}</span>
                      {!sub.isActive && <span className="text-[10px] bg-red-100 text-red-500 px-2 py-0.5 rounded-full font-semibold">Inactive</span>}
                      <button onClick={() => openEditSubCategory(sub)}
                        className="p-1 rounded-lg text-slate-400 hover:bg-tenzy-teal hover:text-white transition">
                        <Edit2 size={12} />
                      </button>
                      <button onClick={() => setDeactConfirm({ type: "subcategory", id: sub.subCategoryId, name: sub.name })}
                        className="p-1 rounded-lg text-slate-400 hover:bg-red-500 hover:text-white transition">
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {isOpen && subs.length === 0 && (
                <p className="ml-10 px-4 pb-3 text-xs text-slate-400 italic">No sub-categories yet. Click "+ Sub" to add one.</p>
              )}
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
              <p className="font-bold text-slate-900">Deactivate?</p>
            </div>
            <p className="text-sm text-slate-500 mb-5">
              Deactivate <strong>{deactConfirm.name}</strong>? It will be hidden but not deleted.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeactConfirm(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600">Cancel</button>
              <button onClick={handleDeactivate}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 text-white text-sm font-bold hover:bg-amber-600 transition">Deactivate</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Concern Types ─────────────────────────────────────────────────────────── */

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
    const trimmed = formName.trim();
    if (!trimmed) { setFormError("Name is required."); return; }

    // Check for duplicate name locally before hitting the API
    const editId = editTarget?.concernTypeId ?? editTarget?.ConcernTypeId ?? null;
    const duplicate = items.find((item) => {
      const iid  = item.concernTypeId ?? item.ConcernTypeId;
      const name = (item.name ?? item.Name ?? item.concernType ?? item.ConcernType ?? "").trim();
      return name.toLowerCase() === trimmed.toLowerCase() && iid !== editId;
    });
    if (duplicate) {
      setFormError(`"${trimmed}" already exists. Please use a different name.`);
      return;
    }

    setSaving(true);
    setFormError("");
    try {
      if (editTarget) {
        const id = editTarget.concernTypeId ?? editTarget.ConcernTypeId;
        await concernsApi.update(id, { concernTypeId: id, name: trimmed, description: formDesc.trim() });
      } else {
        await concernsApi.create({ name: trimmed, description: formDesc.trim() });
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
        <p className="text-sm text-slate-500">{items.filter((i) => i.isActive === true || i.isActive === 1).length} concern types</p>
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
        {items
          .filter((item) => item.isActive === true || item.isActive === 1)
          .map((item) => {
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
                  className="w-full text-sm px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-tenzy-teal/30 focus:border-tenzy-orange transition" />
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

/* ── Payment Cards ─────────────────────────────────────────────────────────── */
function PaymentCardsTab() {
  const [items,      setItems]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [loadError,  setLoadError]  = useState("");
  const [formName,   setFormName]   = useState("");
  const [editTarget, setEditTarget] = useState(null);
  const [saving,     setSaving]     = useState(false);
  const [formError,  setFormError]  = useState("");
  const [showForm,   setShowForm]   = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setLoadError("");
    paymentCardsApi.getAll()
      .then((data) => setItems(Array.isArray(data) ? data : []))
      .catch((err) => setLoadError(err.message || "Failed to load payment cards."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setEditTarget(null); setFormName(""); setFormError(""); setShowForm(true); };
  const openEdit = (item) => { setEditTarget(item); setFormName(item.cardName ?? ""); setFormError(""); setShowForm(true); };
  const cancel = () => { setShowForm(false); setEditTarget(null); setFormName(""); setFormError(""); };

  const handleSave = async () => {
    if (!formName.trim()) { setFormError("Card name is required."); return; }
    setSaving(true);
    setFormError("");
    try {
      await paymentCardsApi.save({ cardId: editTarget?.cardId ?? 0, cardName: formName.trim() });
      cancel();
      load();
    } catch (err) {
      setFormError(err.message || "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CreditCard size={16} className="text-tenzy-teal" />
          <h2 className="font-bold text-slate-800">Payment Cards</h2>
          <span className="text-xs text-slate-400">Used on the UK Purchase form</span>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 rounded-xl bg-tenzy-teal px-3 py-1.5 text-xs font-bold text-white hover:opacity-90 transition"
        >
          <Plus size={13} /> Add Card
        </button>
      </div>

      {showForm && (
        <div className="rounded-xl border border-tenzy-orange/50 bg-white p-4 space-y-3">
          <p className="text-sm font-semibold text-slate-700">{editTarget ? "Edit card" : "Add card"}</p>
          <Input
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            placeholder="e.g. Amex, Halifax Debit"
          />
          {formError && <p className="text-xs text-red-500">{formError}</p>}
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-xl bg-tenzy-teal px-4 py-1.5 text-xs font-bold text-white hover:opacity-90 disabled:opacity-60 transition"
            >
              {saving ? "Saving…" : "Save"}
            </button>
            <button onClick={cancel} className="rounded-xl border border-slate-200 px-4 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition">
              Cancel
            </button>
          </div>
        </div>
      )}

      {loadError && <p className="text-sm text-red-500">{loadError}</p>}
      {loading ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : (
        <div className="divide-y divide-slate-100">
          {items.length === 0 && <p className="text-sm text-slate-400 py-2">No cards yet.</p>}
          {items.map((item) => (
            <div key={item.cardId} className="flex items-center justify-between py-2.5">
              <div className="flex items-center gap-2">
                <CreditCard size={14} className="text-indigo-400 shrink-0" />
                <span className="text-sm font-medium text-slate-700">{item.cardName}</span>
              </div>
              <button
                onClick={() => openEdit(item)}
                className="flex items-center gap-1 rounded-xl border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-500 hover:border-tenzy-teal hover:text-tenzy-teal transition"
              >
                <Edit2 size={11} /> Edit
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Page ──────────────────────────────────────────────────────────────────── */
function ShopsTab() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [formName, setFormName] = useState("");
  const [editTarget, setEditTarget] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setLoadError("");
    shopsApi.getAll()
      .then((data) => setItems(Array.isArray(data) ? data : []))
      .catch((err) => setLoadError(err.message || "Failed to load shops."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setEditTarget(null); setFormName(""); setFormError(""); setShowForm(true); };
  const openEdit = (item) => { setEditTarget(item); setFormName(item.shopName ?? item.ShopName ?? ""); setFormError(""); setShowForm(true); };
  const cancel = () => { setShowForm(false); setEditTarget(null); setFormName(""); setFormError(""); };

  const handleSave = async () => {
    if (!formName.trim()) { setFormError("Shop name is required."); return; }
    setSaving(true);
    setFormError("");
    try {
      await shopsApi.save({
        shopId: editTarget?.shopId ?? editTarget?.ShopId ?? 0,
        shopName: formName.trim(),
      });
      cancel();
      load();
    } catch (err) {
      setFormError(err.message || "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-slate-800">Shops</h2>
          <span className="text-xs text-slate-400">Used on the UK Purchase form</span>
        </div>
        <button onClick={openAdd} className="flex items-center gap-1.5 rounded-xl bg-tenzy-teal px-3 py-1.5 text-xs font-bold text-white hover:opacity-90 transition">
          <Plus size={13} /> Add Shop
        </button>
      </div>

      {showForm && (
        <div className="rounded-xl border border-tenzy-orange/50 bg-white p-4 space-y-3">
          <p className="text-sm font-semibold text-slate-700">{editTarget ? "Edit shop" : "Add shop"}</p>
          <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="e.g. Boots" />
          {formError && <p className="text-xs text-red-500">{formError}</p>}
          <div className="flex gap-2">
            <button onClick={handleSave} disabled={saving} className="rounded-xl bg-tenzy-teal px-4 py-1.5 text-xs font-bold text-white hover:opacity-90 disabled:opacity-60 transition">
              {saving ? "Saving..." : "Save"}
            </button>
            <button onClick={cancel} className="rounded-xl border border-slate-200 px-4 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition">Cancel</button>
          </div>
        </div>
      )}

      {loadError && <p className="text-sm text-red-500">{loadError}</p>}
      {loading ? (
        <p className="text-sm text-slate-400">Loading...</p>
      ) : (
        <div className="divide-y divide-slate-100">
          {items.length === 0 && <p className="text-sm text-slate-400 py-2">No shops yet.</p>}
          {items.map((item) => {
            const id = item.shopId ?? item.ShopId;
            const name = item.shopName ?? item.ShopName;
            return (
              <div key={id} className="flex items-center justify-between py-2.5">
                <span className="text-sm font-medium text-slate-700">{name}</span>
                <button onClick={() => openEdit(item)} className="flex items-center gap-1 rounded-xl border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-500 hover:border-tenzy-teal hover:text-tenzy-teal transition">
                  <Edit2 size={11} /> Edit
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── Order Status Tab ──────────────────────────────────────────────────────── */
const DEFAULT_COLORS = [
  "#2BB9B4","#E8522A","#3b82f6","#8b5cf6","#10b981","#ef4444",
  "#f59e0b","#6366f1","#ec4899","#14b8a6","#64748b","#0f172a",
];

function OrderStatusTab() {
  const [statuses,  setStatuses]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [form, setForm] = useState({ show: false, name: "", color: "#2BB9B4", sortOrder: "0", editId: null, saving: false, error: "" });
  const [delConfirm, setDelConfirm] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    orderStatusApi.getAllIncluding()
      .then((d) => setStatuses(Array.isArray(d) ? d : []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAdd  = () => setForm({ show: true, name: "", color: "#2BB9B4", sortOrder: String(statuses.length + 1), editId: null, saving: false, error: "" });
  const openEdit = (s) => setForm({ show: true, name: s.name ?? s.Name, color: s.color ?? s.Color ?? "#64748b", sortOrder: String(s.sortOrder ?? s.SortOrder ?? 0), editId: s.statusId ?? s.StatusId, saving: false, error: "" });
  const close = () => setForm({ show: false, name: "", color: "#2BB9B4", sortOrder: "0", editId: null, saving: false, error: "" });

  const save = async () => {
    if (!form.name.trim()) { setForm((f) => ({ ...f, error: "Name is required." })); return; }
    setForm((f) => ({ ...f, saving: true, error: "" }));
    try {
      const body = { name: form.name.trim(), color: form.color, sortOrder: parseInt(form.sortOrder) || 0 };
      if (form.editId) {
        await orderStatusApi.update(form.editId, body);
      } else {
        await orderStatusApi.create(body);
      }
      close(); load();
    } catch (err) {
      setForm((f) => ({ ...f, saving: false, error: err.message || "Save failed." }));
    }
  };

  const handleDeactivate = async (id) => {
    try { await orderStatusApi.deactivate(id); load(); }
    catch (err) { alert(err.message || "Failed."); }
    setDelConfirm(null);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-slate-800">Order Status Types</p>
          <p className="text-xs text-slate-400 mt-0.5">Custom workflow stages shown on orders</p>
        </div>
        <button onClick={openAdd}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-tenzy-teal text-white text-xs font-bold rounded-xl hover:opacity-90 transition">
          <Plus size={13} /> Add Status
        </button>
      </div>

      {/* Add / Edit form */}
      {form.show && (
        <div className="border border-tenzy-orange/40 rounded-2xl p-4 space-y-3 bg-orange-50/30">
          <p className="text-xs font-bold text-slate-700">{form.editId ? "Edit Status" : "New Status"}</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-500 mb-1">Status Name *</label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Ready to Dispatch" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Colour</label>
              <div className="flex items-center gap-2">
                <input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })}
                  className="w-10 h-9 rounded-xl border border-slate-200 cursor-pointer p-0.5" />
                <div className="flex flex-wrap gap-1">
                  {DEFAULT_COLORS.map((c) => (
                    <button key={c} type="button" onClick={() => setForm({ ...form, color: c })}
                      className={`w-5 h-5 rounded-full border-2 transition ${form.color === c ? "border-slate-600 scale-110" : "border-transparent"}`}
                      style={{ background: c }} />
                  ))}
                </div>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Sort Order</label>
              <Input type="number" min="0" value={form.sortOrder}
                onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} placeholder="0" />
            </div>
          </div>
          {/* Preview */}
          <div className="flex items-center gap-2">
            <p className="text-[10px] text-slate-400">Preview:</p>
            <span className="text-xs font-bold px-3 py-1 rounded-full text-white" style={{ background: form.color }}>
              {form.name || "Status Name"}
            </span>
          </div>
          {form.error && <p className="text-xs text-red-500">{form.error}</p>}
          <div className="flex gap-2">
            <button onClick={close} className="flex-1 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
            <button onClick={save} disabled={form.saving}
              className="flex-1 py-2 rounded-xl bg-tenzy-teal text-white text-xs font-bold hover:opacity-90 disabled:opacity-60">
              {form.saving ? "Saving…" : form.editId ? "Save Changes" : "Add Status"}
            </button>
          </div>
        </div>
      )}

      {/* Status list */}
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 rounded-full border-4 border-tenzy-teal/30 border-t-tenzy-teal animate-spin" />
        </div>
      ) : (
        <div className="space-y-2">
          {statuses.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-6">No order statuses yet. Add one above.</p>
          )}
          {statuses.map((s) => {
            const id        = s.statusId ?? s.StatusId;
            const name      = s.name ?? s.Name;
            const color     = s.color ?? s.Color ?? "#64748b";
            const sortOrder = s.sortOrder ?? s.SortOrder ?? 0;
            const isActive  = s.isActive ?? s.IsActive ?? true;
            return (
              <div key={id} className={`flex items-center gap-3 rounded-xl px-4 py-3 border transition ${isActive ? "border-slate-200 bg-white" : "border-slate-100 bg-slate-50 opacity-50"}`}>
                <div className="w-3 h-3 rounded-full shrink-0" style={{ background: color }} />
                <span className="text-sm font-semibold text-slate-800 flex-1">{name}</span>
                <span className="text-[10px] font-bold text-white px-2.5 py-1 rounded-full" style={{ background: color }}>
                  {name}
                </span>
                <span className="text-[10px] text-slate-400 w-12 text-center">#{sortOrder}</span>
                {isActive ? (
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => openEdit(s)}
                      className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-tenzy-teal transition">
                      <Edit2 size={13} />
                    </button>
                    <button onClick={() => setDelConfirm(id)}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition">
                      <PowerOff size={13} />
                    </button>
                  </div>
                ) : (
                  <span className="text-[10px] text-slate-400 px-2 py-0.5 rounded-full bg-slate-100">Inactive</span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Deactivate confirm */}
      {delConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDelConfirm(null)} />
          <div className="relative bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle size={18} className="text-red-500" />
              </div>
              <p className="font-bold text-slate-900">Deactivate Status?</p>
            </div>
            <p className="text-sm text-slate-500 mb-4">This status will be hidden from the order creation form.</p>
            <div className="flex gap-3">
              <button onClick={() => setDelConfirm(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600">Cancel</button>
              <button onClick={() => handleDeactivate(delConfirm)}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600">Deactivate</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Payment Status Tab ────────────────────────────────────────────────────── */
function PaymentStatusTab() {
  const [statuses,   setStatuses]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [form, setForm] = useState({ show: false, name: "", color: "#10b981", sortOrder: "0", editId: null, saving: false, error: "" });
  const [delConfirm, setDelConfirm] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    paymentStatusApi.getAllIncluding()
      .then((d) => setStatuses(Array.isArray(d) ? d : []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAdd  = () => setForm({ show: true, name: "", color: "#10b981", sortOrder: String(statuses.length + 1), editId: null, saving: false, error: "" });
  const openEdit = (s) => setForm({ show: true, name: s.name ?? s.Name, color: s.color ?? s.Color ?? "#64748b", sortOrder: String(s.sortOrder ?? s.SortOrder ?? 0), editId: s.statusId ?? s.StatusId, saving: false, error: "" });
  const close = () => setForm({ show: false, name: "", color: "#10b981", sortOrder: "0", editId: null, saving: false, error: "" });

  const save = async () => {
    if (!form.name.trim()) { setForm((f) => ({ ...f, error: "Name is required." })); return; }
    setForm((f) => ({ ...f, saving: true, error: "" }));
    try {
      const body = { name: form.name.trim(), color: form.color, sortOrder: parseInt(form.sortOrder) || 0 };
      if (form.editId) { await paymentStatusApi.update(form.editId, body); }
      else             { await paymentStatusApi.create(body); }
      close(); load();
    } catch (err) { setForm((f) => ({ ...f, saving: false, error: err.message || "Save failed." })); }
  };

  const handleDeactivate = async (id) => {
    try { await paymentStatusApi.deactivate(id); load(); } catch (err) { alert(err.message || "Failed."); }
    setDelConfirm(null);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-slate-800">Payment Status Types</p>
          <p className="text-xs text-slate-400 mt-0.5">Statuses for recording order payments</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-1.5 px-3 py-1.5 bg-tenzy-teal text-white text-xs font-bold rounded-xl hover:opacity-90 transition">
          <Plus size={13} /> Add Status
        </button>
      </div>

      {form.show && (
        <div className="border border-tenzy-orange/40 rounded-2xl p-4 space-y-3 bg-orange-50/30">
          <p className="text-xs font-bold text-slate-700">{form.editId ? "Edit Status" : "New Status"}</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><label className="block text-xs font-semibold text-slate-500 mb-1">Name *</label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Paid" /></div>
            <div><label className="block text-xs font-semibold text-slate-500 mb-1">Colour</label>
              <div className="flex items-center gap-2">
                <input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })}
                  className="w-10 h-9 rounded-xl border border-slate-200 cursor-pointer p-0.5" />
                <div className="flex flex-wrap gap-1">
                  {DEFAULT_COLORS.map((c) => (
                    <button key={c} type="button" onClick={() => setForm({ ...form, color: c })}
                      className={`w-5 h-5 rounded-full border-2 transition ${form.color === c ? "border-slate-600 scale-110" : "border-transparent"}`}
                      style={{ background: c }} />
                  ))}
                </div>
              </div>
            </div>
            <div><label className="block text-xs font-semibold text-slate-500 mb-1">Sort Order</label>
              <Input type="number" min="0" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} /></div>
          </div>
          <div className="flex items-center gap-2">
            <p className="text-[10px] text-slate-400">Preview:</p>
            <span className="text-xs font-bold px-3 py-1 rounded-full text-white" style={{ background: form.color }}>{form.name || "Status"}</span>
          </div>
          {form.error && <p className="text-xs text-red-500">{form.error}</p>}
          <div className="flex gap-2">
            <button onClick={close} className="flex-1 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
            <button onClick={save} disabled={form.saving} className="flex-1 py-2 rounded-xl bg-tenzy-teal text-white text-xs font-bold hover:opacity-90 disabled:opacity-60">
              {form.saving ? "Saving…" : form.editId ? "Save Changes" : "Add Status"}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-8"><div className="w-6 h-6 rounded-full border-4 border-tenzy-teal/30 border-t-tenzy-teal animate-spin" /></div>
      ) : (
        <div className="space-y-2">
          {statuses.length === 0 && <p className="text-sm text-slate-400 text-center py-6">No payment statuses yet.</p>}
          {statuses.map((s) => {
            const id       = s.statusId ?? s.StatusId;
            const name     = s.name ?? s.Name;
            const color    = s.color ?? s.Color ?? "#64748b";
            const isActive = s.isActive ?? s.IsActive ?? true;
            return (
              <div key={id} className={`flex items-center gap-3 rounded-xl px-4 py-3 border ${isActive ? "border-slate-200 bg-white" : "border-slate-100 bg-slate-50 opacity-50"}`}>
                <div className="w-3 h-3 rounded-full shrink-0" style={{ background: color }} />
                <span className="text-sm font-semibold text-slate-800 flex-1">{name}</span>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full text-white" style={{ background: color }}>{name}</span>
                {isActive ? (
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => openEdit(s)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-tenzy-teal transition"><Edit2 size={13} /></button>
                    <button onClick={() => setDelConfirm(id)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition"><PowerOff size={13} /></button>
                  </div>
                ) : <span className="text-[10px] text-slate-400 px-2 py-0.5 rounded-full bg-slate-100">Inactive</span>}
              </div>
            );
          })}
        </div>
      )}

      {delConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDelConfirm(null)} />
          <div className="relative bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center"><AlertTriangle size={18} className="text-red-500" /></div>
              <p className="font-bold text-slate-900">Deactivate Status?</p>
            </div>
            <p className="text-sm text-slate-500 mb-4">This payment status will be hidden from order payment forms.</p>
            <div className="flex gap-3">
              <button onClick={() => setDelConfirm(null)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600">Cancel</button>
              <button onClick={() => handleDeactivate(delConfirm)} className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600">Deactivate</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ReferenceData() {
  const [activeTab, setActiveTab] = useState(0);

  const TabContent = [CategoriesTab, ConcernTypesTab, PaymentTypesTab, BrandsTab, PaymentCardsTab, ShopsTab, OrderStatusTab, PaymentStatusTab][activeTab];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-slate-900">Reference Data</h1>
        <p className="text-sm text-slate-500 mt-0.5">Manage categories, concern types, payment options, brands, cards, and UK shops</p>
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
