import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Search, X, Plus, Edit2, Trash2, AlertTriangle, Star, StarOff,
  ChevronUp, ChevronDown, ImagePlus, Tag, DollarSign,
  Info, MessageSquare, CreditCard,
} from "lucide-react";
import {
  productsApi, brandsApi, categoriesApi, concernsApi, paymentApi, uploadApi, productImageApi, productFaqApi,
  supplyChainApi,
} from "../../services/api";


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

const Input = ({ ...props }) => (
  <input
    className="w-full text-sm px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-tenzy-teal/30 focus:border-tenzy-teal transition"
    {...props}
  />
);

const Sel = ({ children, ...props }) => (
  <select
    className="w-full text-sm px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-tenzy-teal/30 focus:border-tenzy-teal transition"
    {...props}
  >
    {children}
  </select>
);

const emptyForm = () => ({
  name: "", brandId: "", categoryId: "", description: "", weight: "",
  inSale: false, stock: "", price: "", discountRate: "0",
  startUTC: new Date().toISOString().slice(0, 10), endUTC: "",
  images: [], concerns: [], paymentOptions: [], faqs: [],
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

export default function AdminProducts() {
  const [products,       setProducts]       = useState([]);
  const [brands,         setBrands]         = useState([]);
  const [categories,     setCategories]     = useState([]);
  const [concernTypes,   setConcernTypes]   = useState([]);
  const [paymentTypes,   setPaymentTypes]   = useState([]);
  const [approvedShipments, setApprovedShipments] = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [search,         setSearch]         = useState("");
  const [catFilter,      setCatFilter]      = useState(0);
  const [concFilter,     setConcFilter]     = useState(0);
  const [activeTab,      setActiveTab]      = useState("live");
  const [drawer,         setDrawer]         = useState(null);
  const [editTarget,     setEditTarget]     = useState(null);
  const [form,           setForm]           = useState(emptyForm());
  const [deleteConfirm,  setDeleteConfirm]  = useState(null);
  const [saving,         setSaving]         = useState(false);
  const [uploading,      setUploading]      = useState(false);
  const [imageSaving,    setImageSaving]    = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);

  const loadAll = useCallback(() => {
    setLoading(true);
    setSessionExpired(false);
    Promise.allSettled([
      productsApi.getAllAdmin(),
      brandsApi.getAll(),
      categoriesApi.getAll(),
      concernsApi.getAll(),
      paymentApi.getAll(),
      productImageApi.getAll(),
      supplyChainApi.getEligiblePricing(),
    ]).then(([pR, bR, cR, conR, ptR, imgR, approvedR]) => {
      // Check if any auth-protected call got a session-expired error
      const expired = [pR, bR, cR, conR, ptR].some(
        (r) => r.status === "rejected" && r.reason?.message?.includes("Session expired")
      );
      if (expired) { setSessionExpired(true); return; }

      if (bR.status   === "fulfilled") setBrands(Array.isArray(bR.value)     ? bR.value   : []);
      if (cR.status   === "fulfilled") setCategories(Array.isArray(cR.value) ? cR.value   : []);
      if (conR.status === "fulfilled") setConcernTypes(Array.isArray(conR.value) ? conR.value : []);
      if (ptR.status  === "fulfilled") setPaymentTypes(Array.isArray(ptR.value)  ? ptR.value  : []);
      if (approvedR.status === "fulfilled") setApprovedShipments(Array.isArray(approvedR.value) ? approvedR.value : []);

      if (pR.status === "fulfilled") {
        const prods = Array.isArray(pR.value) ? pR.value : [];
        const allImgs = imgR.status === "fulfilled" ? imgR.value : [];
        // Attach images to each product
        setProducts(prods.map((p) => {
          const pid = p.productId ?? p.ProductId ?? p.productid;
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

  const bid_of    = (b) => b.brandId    ?? b.BrandId    ?? b.Brandid;
  const cid_of    = (c) => c.categoryId ?? c.CategoryId ?? c.catagoryID;
  const brandName = useCallback((id) => (
    brands.find((b) => bid_of(b) === id)?.name ?? brands.find((b) => bid_of(b) === id)?.Name ?? "—"
  ), [brands]);
  const catName   = useCallback((id) => {
    const c = categories.find((c) => cid_of(c) === id);
    return c ? (c.categoryType ?? c.CategoryType ?? c.categorytype ?? "—") : "—";
  }, [categories]);

  const filtered = useMemo(() =>
    products.filter((p) => {
      const q = search.toLowerCase();
      const bid = bid_of(p);
      const cid = cid_of(p);
      const matchSearch = (p.name ?? "").toLowerCase().includes(q) || brandName(bid).toLowerCase().includes(q);
      const matchCat    = catFilter === 0 || cid === catFilter;
      const matchConc   = concFilter === 0 || (p.concerns ?? []).some(
        (c) => (c.concernTypeId ?? c.ConcernTypeId ?? c) === concFilter
      );
      return matchSearch && matchCat && matchConc;
    }),
    [products, search, catFilter, concFilter, brandName]
  );

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
        item.categoryName,
        item.dispatchReference,
      ].some((value) => String(value ?? "").toLowerCase().includes(q));
    });
  }, [pendingPriceRows, search]);

  const openAdd = () => {
    const firstBrand = brands[0];
    const firstCat   = categories[0];
    const bId = firstBrand ? Number(bid_of(firstBrand) ?? 0) : "";
    const cId = firstCat   ? Number(cid_of(firstCat)   ?? 0) : "";
    setForm({
      ...emptyForm(),
      brandId:    bId || "",
      categoryId: cId || "",
    });
    setEditTarget(null);
    setDrawer("add");
  };

  const openEdit = async (p) => {
    const sp = parseFloat(p.sellingPrice ?? p.SellingPrice ?? 0);
    const op = parseFloat(p.originalPrice ?? p.OriginalPrice ?? sp);
    const calcDiscount = op > 0 && sp < op ? Math.round((1 - sp / op) * 100) : 0;
    const dr = p.discountRate ?? p.DiscountRate ?? calcDiscount;
    const pid = p.productId ?? p.ProductId ?? p.productid;

    setForm({
      name:         p.name ?? "",
      brandId:      bid_of(p) || "",
      categoryId:   cid_of(p) || "",
      description:  p.description ?? "",
      weight:       String(p.weight ?? ""),
      inSale:       p.inSale       ?? p.InSale       ?? p.insale   ?? false,
      stock:        String(p.stockQuantity ?? p.StockQuantity ?? p.stock ?? ""),
      price:        String(op || sp || ""),
      discountRate: String(Math.round(parseFloat(dr) || 0)),
      startUTC:     (p.startUTC ?? p.StartUTC ?? new Date().toISOString()).slice(0, 10),
      endUTC:       (p.endUTC   ?? p.EndUTC   ?? "").slice(0, 10),
      images:       [],
      // null = not yet loaded — backend will leave concerns/options unchanged on save
      concerns:       null,
      paymentOptions: null,
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

  const closeDrawer = () => { setDrawer(null); setEditTarget(null); };

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
    if (!form.categoryId)  { alert("Please select a category."); return; }
    if (!form.price)       { alert("Price is required."); return; }
    if (!form.stock)       { alert("Stock quantity is required."); return; }
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

      const originalPrice  = parseFloat(form.price) || 0;
      const discountRate   = parseFloat(form.discountRate) || 0;
      const sellingPrice   = Math.round(originalPrice * (1 - discountRate / 100) * 100) / 100;
      const body = {
        name:          form.name.trim(),
        brandId:       parseInt(form.brandId, 10),
        categoryId:    parseInt(form.categoryId, 10),
        description:   form.description,
        weight:        form.weight ? parseFloat(form.weight) : null,
        inSale:        form.inSale,
        stockQuantity: parseInt(form.stock, 10),
        sellingPrice,
        originalPrice,
        startUTC:      toApiDate(form.startUTC),
        endUTC:        toApiDate(form.endUTC),
        concernTypeIds,
        paymentOptions:  form.paymentOptions,
        faqs:            faqsToSave,
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
        }
      } else {
        const pid = editTarget.productId ?? editTarget.ProductId ?? editTarget.productid;
        await productsApi.update(pid, body);
        await syncProductFaqs(pid, faqsToSave);
      }
      loadAll();
      closeDrawer();
    } catch (err) { alert(err.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    try {
      await productsApi.remove(id);
      setProducts((prev) => prev.filter((p) => (p.productId ?? p.ProductId ?? p.productid) !== id));
    } catch (err) { alert(err.message); }
    setDeleteConfirm(null);
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
            { id: "live", label: "Live Products", count: products.length },
            { id: "pending", label: "Pending Price Approve", count: pendingPriceRows.length },
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
            className="w-full pl-9 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-tenzy-teal/30 focus:border-tenzy-teal transition" />
          {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2"><X size={14} className="text-slate-400" /></button>}
        </div>
        {activeTab === "live" && (
          <div className="flex flex-col sm:flex-row gap-2">
            <select
              value={catFilter}
              onChange={(e) => setCatFilter(parseInt(e.target.value))}
              className="flex-1 text-sm px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-tenzy-teal/30 focus:border-tenzy-teal transition">
              <option value={0}>All Categories</option>
              {categories.map((c) => {
                const cid   = cid_of(c);
                const ctype = c.categoryType ?? c.categorytype ?? "—";
                return <option key={cid} value={cid}>{ctype}</option>;
              })}
            </select>
            <select
              value={concFilter}
              onChange={(e) => setConcFilter(parseInt(e.target.value))}
              className="flex-1 text-sm px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-tenzy-teal/30 focus:border-tenzy-teal transition">
              <option value={0}>All Skin Concerns</option>
              {concernTypes.map((c) => {
                const cid   = c.concernTypeId ?? c.ConcernTypeId;
                const ctype = c.name ?? c.Name ?? c.concernType ?? c.ConcernType ?? "—";
                return <option key={cid} value={cid}>{ctype}</option>;
              })}
            </select>
          </div>
        )}
      </div>

      {activeTab === "live" ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="md:hidden divide-y divide-slate-50">
            {filtered.length === 0 && <p className="text-sm text-slate-400 text-center py-12">No products found.</p>}
            {filtered.map((p) => {
              const pid   = p.productId ?? p.ProductId ?? p.productid;
              const bid   = bid_of(p);
              const cid   = cid_of(p);
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
                    <p className="text-[10px] text-slate-400">{brandName(bid)} · {catName(cid)}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs font-bold text-tenzy-teal">LKR {fmt(prc)}</span>
                      {disc > 0 && (
                        <span className="text-[10px] text-tenzy-orange font-semibold">-{disc}%</span>
                      )}
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${st.cls}`}>{st.label}</span>
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
                  const pid   = p.productId ?? p.ProductId ?? p.productid;
                  const bid   = bid_of(p);
                  const cid   = cid_of(p);
                  const stk   = p.stockQuantity ?? p.StockQuantity ?? p.stock;
                  const prc   = p.sellingPrice  ?? p.SellingPrice  ?? p.price;
                  const spric = parseFloat(p.sellingPrice  ?? p.SellingPrice  ?? 0);
                  const opric = parseFloat(p.originalPrice ?? p.OriginalPrice ?? 0);
                  const disc  = Math.round(parseFloat(p.discountRate ?? p.DiscountRate ?? 0)) || (opric > 0 && spric < opric ? Math.round((1 - spric / opric) * 100) : 0);
                  const sale = p.inSale        ?? p.InSale        ?? p.insale ?? false;
                  const st   = stockStatus(stk);
                  const img  = p.primaryImageUrl ?? primaryImage(p.images);
                  return (
                    <tr key={pid} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-slate-100 overflow-hidden shrink-0">
                            {img && <img src={img} alt={p.name} className="w-full h-full object-cover" />}
                          </div>
                          <p className="text-xs font-semibold text-slate-800 max-w-[160px] truncate">{p.name}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">{brandName(bid)}</td>
                      <td className="px-4 py-3 text-xs text-slate-600">{catName(cid)}</td>
                      <td className="px-4 py-3 text-xs font-bold text-slate-800">LKR {fmt(prc)}</td>
                      <td className="px-4 py-3 text-xs text-tenzy-orange font-semibold">{disc > 0 ? `${disc}%` : "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${st.cls}`}>{stk} · {st.label}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${sale ? "bg-tenzy-orange/10 text-tenzy-orange" : "bg-slate-100 text-slate-400"}`}>
                          {sale ? "On Sale" : "Regular"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {(p.images ?? []).length} img{(p.images ?? []).length !== 1 ? "s" : ""}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg hover:bg-tenzy-teal hover:text-white text-slate-500 transition"><Edit2 size={13} /></button>
                          <button onClick={() => setDeleteConfirm(pid)} className="p-1.5 rounded-lg hover:bg-red-500 hover:text-white text-slate-500 transition"><Trash2 size={13} /></button>
                        </div>
                      </td>
                    </tr>
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
              return (
                <div key={item.arrivalItemId} className="p-4 space-y-3">
                  <div>
                    <p className="text-xs font-bold text-slate-800">{item.productName}</p>
                    <p className="text-[10px] text-slate-400">{item.brandName} · {item.categoryName}</p>
                  </div>
                  <div className="flex flex-wrap gap-2 text-[11px]">
                    <span className={`rounded-full px-2 py-0.5 font-semibold ${status.cls}`}>{status.label}</span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">Qty {item.approvedQuantity}</span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">Live stock {item.currentStockQuantity ?? 0}</span>
                  </div>
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
                  {["Dispatch", "Product", "Approved Qty", "Current Live Price", "Current Live Stock", "Decision", "Action"].map((h) => (
                    <th key={h} className="text-left text-xs font-semibold text-slate-500 px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredPendingPriceRows.length === 0 && (
                  <tr><td colSpan={7} className="text-center py-12 text-sm text-slate-400">No pending price items found.</td></tr>
                )}
                {filteredPendingPriceRows.map((item) => {
                  const status = pricingStatusMeta(item.pricingReviewStatus);
                  return (
                    <tr key={item.arrivalItemId} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-xs font-semibold text-slate-700">{item.dispatchReference}</td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-xs font-semibold text-slate-800">{item.productName}</p>
                          <p className="text-[11px] text-slate-500">{item.brandName} · {item.categoryName}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">{item.approvedQuantity}</td>
                      <td className="px-4 py-3 text-xs text-slate-600">LKR {fmt(item.currentSellingPrice ?? 0)}</td>
                      <td className="px-4 py-3 text-xs text-slate-600">{item.currentStockQuantity ?? 0}</td>
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

      {/* Add/Edit Drawer */}
      {drawer && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={closeDrawer} />
          <div className="fixed inset-y-0 right-0 w-full sm:w-[480px] bg-white z-50 flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <p className="font-bold text-slate-900">{drawer === "add" ? "Add Product" : "Edit Product"}</p>
              <button onClick={closeDrawer} className="p-1.5 rounded-full hover:bg-slate-100"><X size={18} /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-6">
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
                  <Field label="Category" required>
                    <Sel value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: parseInt(e.target.value) })}>
                      {categories.map((c) => {
                        const cid   = cid_of(c);
                        const ctype = c.categoryType ?? c.categorytype ?? "—";
                        return <option key={cid} value={cid}>{ctype}</option>;
                      })}
                    </Sel>
                  </Field>
                </div>
                <Field label="Description">
                  <textarea rows={3} value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Product description…"
                    className="w-full text-sm px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-tenzy-teal/30 focus:border-tenzy-teal transition resize-none" />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Weight (g)">
                    <Input type="number" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} placeholder="e.g. 340" />
                  </Field>
                  <Field label="On Sale">
                    <div className="flex items-center gap-3 mt-1">
                      <button type="button" onClick={() => setForm({ ...form, inSale: !form.inSale })}
                        className={`relative w-11 h-6 rounded-full transition-colors ${form.inSale ? "bg-tenzy-orange" : "bg-slate-200"}`}>
                        <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${form.inSale ? "translate-x-5" : "translate-x-0"}`} />
                      </button>
                      <span className="text-xs font-semibold text-slate-600">{form.inSale ? "Yes" : "No"}</span>
                    </div>
                  </Field>
                </div>
              </Section>

              <Section icon={DollarSign} title="Inventory & Pricing">
                <Field label="Stock Quantity" required>
                  <Input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} placeholder="0" />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Price (LKR)" required>
                    <Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="0.00" />
                  </Field>
                  <Field label="Discount Rate (%)">
                    <Input type="number" min="0" max="100" value={form.discountRate} onChange={(e) => setForm({ ...form, discountRate: e.target.value })} placeholder="0" />
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Pricing Start Date">
                    <Input type="date" value={form.startUTC} onChange={(e) => setForm({ ...form, startUTC: e.target.value })} />
                  </Field>
                  <Field label="Pricing End Date">
                    <Input type="date" value={form.endUTC} onChange={(e) => setForm({ ...form, endUTC: e.target.value })} />
                  </Field>
                </div>
                {form.price && parseFloat(form.discountRate) > 0 && (
                  <div className="bg-tenzy-teal/10 rounded-xl px-3 py-2 text-xs text-tenzy-teal font-semibold">
                    Sale price: LKR {fmt(Math.round(parseFloat(form.price) * (1 - parseFloat(form.discountRate) / 100)))}
                  </div>
                )}
              </Section>

              <Section icon={ImagePlus} title="Product Images">
                <div className="space-y-2">
                  {form.images.length === 0 && (
                    <p className="text-xs text-slate-400 text-center py-4 bg-slate-50 rounded-xl">No images yet. Add one below.</p>
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
                <label className={`flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border-2 border-dashed cursor-pointer transition
                  ${uploading || imageSaving ? "border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed" : "border-tenzy-teal/40 hover:border-tenzy-teal hover:bg-tenzy-teal/5 text-tenzy-teal"}`}>
                  <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden"
                    disabled={uploading || imageSaving} onChange={handleImageFilePick} />
                  <ImagePlus size={15} />
                  <span className="text-xs font-semibold">
                    {uploading ? "Uploading…" : imageSaving ? "Saving image changes…" : "Choose image to upload"}
                  </span>
                </label>
                <p className="text-[10px] text-slate-400">JPEG, PNG, WebP or GIF · max 5 MB · ★ = primary shown in shop</p>
              </Section>

              <Section icon={Tag} title="Skin Concerns">
                {form.concerns === null && (
                  <p className="text-xs text-slate-400 italic">Loading existing concerns…</p>
                )}
                <div className="flex flex-wrap gap-2">
                  {concernTypes.map((c) => {
                    const cid    = c.concernTypeId ?? c.ConcernTypeId;
                    const ctype  = c.name ?? c.Name ?? c.concernType ?? c.ConcernType ?? "—";
                    const active = (form.concerns ?? []).includes(cid);
                    return (
                      <button key={cid} type="button" onClick={() => toggleConcern(cid)}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition ${
                          active ? "bg-tenzy-teal text-white border-tenzy-teal" : "border-slate-200 text-slate-600 hover:border-tenzy-teal hover:text-tenzy-teal"
                        }`}>
                        {ctype}
                      </button>
                    );
                  })}
                </div>
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
                        className="w-full text-sm px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-tenzy-teal/30 focus:border-tenzy-teal transition resize-none" />
                    </div>
                  ))}
                  <button onClick={addFaq}
                    className="w-full py-2 rounded-xl border-2 border-dashed border-slate-200 text-xs font-semibold text-slate-500 hover:border-tenzy-teal hover:text-tenzy-teal transition flex items-center justify-center gap-1.5">
                    <Plus size={13} /> Add FAQ
                  </button>
                </div>
              </Section>
            </div>

            <div className="px-5 py-4 border-t border-slate-100 flex gap-3">
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
        </>
      )}

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
