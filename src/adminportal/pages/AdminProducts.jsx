import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Search, X, Plus, Edit2, Trash2, AlertTriangle, Star, StarOff,
  ChevronUp, ChevronDown, ImagePlus, Tag, DollarSign,
  Info, MessageSquare, CreditCard,
} from "lucide-react";
import {
  productsApi, brandsApi, concernsApi, paymentApi, uploadApi, productImageApi, productFaqApi,
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
  name: "", brandId: "", description: "", weight: "",
  tabletCount: "", showWeight: true, showTabletCount: false,
  inSale: false, stock: "", price: "", discountRate: "0",
  wholesalePrice: "",
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

export default function AdminProducts() {
  const [products,       setProducts]       = useState([]);
  const [brands,         setBrands]         = useState([]);
  const [concernTypes,   setConcernTypes]   = useState([]);
  const [paymentTypes,   setPaymentTypes]   = useState([]);
  const [approvedShipments, setApprovedShipments] = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [search,         setSearch]         = useState("");
  const [concFilter,     setConcFilter]     = useState(0);
  const [brandFilter,    setBrandFilter]    = useState(0);
  const [saleFilter,     setSaleFilter]     = useState("all");
  const [stockFilter,    setStockFilter]    = useState("all");
  const [sortBy,         setSortBy]         = useState("newest");
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
      concernsApi.getAll(),
      paymentApi.getAll(),
      productImageApi.getAll(),
      supplyChainApi.getEligiblePricing(),
    ]).then(([pR, bR, conR, ptR, imgR, approvedR]) => {
      // Check if any auth-protected call got a session-expired error
      const expired = [pR, bR, conR, ptR].some(
        (r) => r.status === "rejected" && r.reason?.message?.includes("Session expired")
      );
      if (expired) { setSessionExpired(true); return; }

      if (bR.status   === "fulfilled") setBrands(Array.isArray(bR.value)     ? bR.value   : []);
      if (conR.status === "fulfilled") setConcernTypes(Array.isArray(conR.value) ? conR.value : []);
      if (ptR.status  === "fulfilled") setPaymentTypes(Array.isArray(ptR.value)  ? ptR.value  : []);
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
      const matchSale = saleFilter === "all" || (saleFilter === "sale" ? sale : !sale);
      const matchStock =
        stockFilter === "all" ||
        (stockFilter === "out" && stk <= 0) ||
        (stockFilter === "low" && stk > 0 && stk < 15) ||
        (stockFilter === "in" && stk >= 15);
      return matchSearch && matchBrand && matchConc && matchSale && matchStock;
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
  }, [products, search, brandFilter, concFilter, saleFilter, stockFilter, sortBy, brandName]);

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
    const sp = parseFloat(p.sellingPrice ?? p.SellingPrice ?? 0);
    const op = parseFloat(p.originalPrice ?? p.OriginalPrice ?? sp);
    const calcDiscount = op > 0 && sp < op ? Math.round((1 - sp / op) * 100) : 0;
    const dr = p.discountRate ?? p.DiscountRate ?? calcDiscount;
    const pid = p.productId ?? p.ProductId ?? p.productid;

    setForm({
      name:         p.name ?? "",
      brandId:      bid_of(p) || "",
      description:  p.description ?? "",
      weight:       p.weight != null ? String(p.weight) : "",
      tabletCount:  p.tabletCount != null ? String(p.tabletCount ?? p.TabletCount ?? "") : "",
      showWeight:   p.showWeight ?? p.ShowWeight ?? true,
      showTabletCount: p.showTabletCount ?? p.ShowTabletCount ?? false,
      inSale:       p.inSale       ?? p.InSale       ?? p.insale   ?? false,
      stock:        String(p.stockQuantity ?? p.StockQuantity ?? p.stock ?? ""),
      price:        String(op || sp || ""),
      discountRate: String(Math.round(parseFloat(dr) || 0)),
      wholesalePrice: (p.wholesalePrice ?? p.WholesalePrice) != null ? String(p.wholesalePrice ?? p.WholesalePrice) : "",
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
    if (!form.weight || parseFloat(form.weight) <= 0) { alert("Weight (g) is required."); return; }
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
      const wholesalePrice = form.wholesalePrice ? parseFloat(form.wholesalePrice) : null;
      const minCost = editTarget?.TotalUnitCostLkr ?? editTarget?.totalUnitCostLkr ?? null;
      if (minCost !== null && sellingPrice > 0 && sellingPrice < minCost) {
        if (!window.confirm(`Website price (LKR ${fmt(sellingPrice)}) is below total unit cost (LKR ${fmt(minCost)}).\n\nOnly continue if a valid reason was provided during pricing. Proceed?`)) return;
      }
      if (minCost !== null && wholesalePrice !== null && wholesalePrice < minCost) {
        if (!window.confirm(`Wholesale price (LKR ${fmt(wholesalePrice)}) is below total unit cost (LKR ${fmt(minCost)}).\n\nOnly continue if a valid reason was provided during pricing. Proceed?`)) return;
      }
      const body = {
        name:          form.name.trim(),
        brandId:       parseInt(form.brandId, 10),
        description:   form.description,
        weight:        form.weight ? parseFloat(form.weight) : null,
        tabletCount:   form.tabletCount ? parseInt(form.tabletCount, 10) : null,
        showWeight:    form.showWeight,
        showTabletCount: form.showTabletCount,
        inSale:        form.inSale,
        stockQuantity: parseInt(form.stock, 10),
        sellingPrice,
        originalPrice,
        startUTC:      toApiDate(form.startUTC),
        endUTC:        toApiDate(form.endUTC),
        concernTypeIds,
        paymentOptions:  form.paymentOptions,
        faqs:            faqsToSave,
        wholesalePrice,
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
      loadAll();
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
              value={concFilter}
              onChange={(e) => setConcFilter(parseInt(e.target.value, 10))}
              className={filterStyles.concern}>
              <option value={0}>All Concerns</option>
              {concernTypes.map((c) => {
                const cid   = c.concernTypeId ?? c.ConcernTypeId;
                const ctype = c.name ?? c.Name ?? c.concernType ?? c.ConcernType ?? "—";
                return <option key={cid} value={cid}>{ctype}</option>;
              })}
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
                  {["Product", "Brand", "Wholesale", "Website", "Discount", "Stock", "Sale", "Actions"].map((h) => (
                    <th key={h} className="text-left text-xs font-semibold text-slate-500 px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.length === 0 && (
                  <tr><td colSpan={8} className="text-center py-12 text-sm text-slate-400">No products found.</td></tr>
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
                      <td className="px-4 py-3 text-xs font-semibold text-amber-700">
                        {(p.wholesalePrice ?? p.WholesalePrice) ? `LKR ${fmt(p.wholesalePrice ?? p.WholesalePrice)}` : "—"}
                      </td>
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
                    <p className="text-[10px] text-slate-400">{item.brandName}</p>
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
                          <p className="text-[11px] text-slate-500">{item.brandName}</p>
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

      {/* Add/Edit Modal */}
      {drawer && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={closeDrawer} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 rounded-t-3xl shrink-0">
              <p className="font-bold text-slate-900 text-lg">{drawer === "add" ? "Add Product" : "Edit Product"}</p>
              <button onClick={closeDrawer} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition"><X size={18} /></button>
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
                  <textarea rows={3} value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Product description…"
                    className="w-full text-sm px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-tenzy-teal/30 focus:border-tenzy-teal transition resize-none" />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Weight (g)" required>
                    <Input type="number" min="0" step="0.1" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} placeholder="e.g. 340" />
                  </Field>
                  <Field label="Tablet count">
                    <Input type="number" min="1" step="1" value={form.tabletCount} onChange={(e) => setForm({ ...form, tabletCount: e.target.value })} placeholder="e.g. 60" />
                  </Field>
                </div>

                {/* Visibility toggles */}
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs font-bold text-slate-600 mb-3">Show on website</p>
                  <div className="flex flex-wrap gap-5">
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, showWeight: !form.showWeight })}
                        className={`relative w-9 h-5 rounded-full transition-colors ${form.showWeight ? "bg-tenzy-teal" : "bg-slate-300"}`}
                      >
                        <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.showWeight ? "translate-x-4" : "translate-x-0"}`} />
                      </button>
                      <span className="text-xs font-medium text-slate-600">Weight</span>
                    </label>
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, showTabletCount: !form.showTabletCount })}
                        disabled={!form.tabletCount}
                        className={`relative w-9 h-5 rounded-full transition-colors disabled:opacity-40 ${form.showTabletCount ? "bg-tenzy-teal" : "bg-slate-300"}`}
                      >
                        <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.showTabletCount ? "translate-x-4" : "translate-x-0"}`} />
                      </button>
                      <span className={`text-xs font-medium ${form.tabletCount ? "text-slate-600" : "text-slate-400"}`}>
                        Tablet count {!form.tabletCount && <span className="text-[10px]">(add tablet count first)</span>}
                      </span>
                    </label>
                  </div>
                </div>

                <Field label="On Sale">
                  <div className="flex items-center gap-3 mt-1">
                    <button type="button" onClick={() => setForm({ ...form, inSale: !form.inSale })}
                      className={`relative w-11 h-6 rounded-full transition-colors ${form.inSale ? "bg-tenzy-orange" : "bg-slate-200"}`}>
                      <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${form.inSale ? "translate-x-5" : "translate-x-0"}`} />
                    </button>
                    <span className="text-xs font-semibold text-slate-600">{form.inSale ? "Yes" : "No"}</span>
                  </div>
                </Field>
              </Section>

              <Section icon={DollarSign} title="Inventory & Pricing">
                {(() => {
                  const minCost = editTarget?.TotalUnitCostLkr ?? editTarget?.totalUnitCostLkr ?? null;
                  const wsp = parseFloat(form.wholesalePrice) || 0;
                  const wbp = parseFloat(form.price) || 0;
                  return (
                    <>
                      {minCost != null && (
                        <div className="rounded-xl bg-slate-100 px-3 py-2 text-xs text-slate-600 flex items-center justify-between">
                          <span>Unit cost floor (min price)</span>
                          <span className="font-bold text-slate-800">LKR {fmt(minCost)}</span>
                        </div>
                      )}
                      <Field label="Stock Quantity" required>
                        <Input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} placeholder="0" />
                      </Field>
                      <div className="grid grid-cols-2 gap-3">
                        <Field label="Wholesale Price (LKR)">
                          <Input
                            type="number" min="0" step="1"
                            value={form.wholesalePrice}
                            onChange={(e) => setForm({ ...form, wholesalePrice: e.target.value })}
                            placeholder="B2B price"
                            className={minCost != null && form.wholesalePrice && wsp < minCost ? "border-red-300 bg-red-50" : ""}
                          />
                          {minCost != null && form.wholesalePrice && wsp < minCost && (
                            <p className="mt-1 text-[11px] text-red-600">Below unit cost — cannot save.</p>
                          )}
                        </Field>
                        <Field label="Website Price (LKR)" required>
                          <Input
                            type="number" min="0" step="1"
                            value={form.price}
                            onChange={(e) => setForm({ ...form, price: e.target.value })}
                            placeholder="0.00"
                            className={minCost != null && form.price && wbp < minCost ? "border-red-300 bg-red-50" : ""}
                          />
                          {minCost != null && form.price && wbp < minCost && (
                            <p className="mt-1 text-[11px] text-red-600">Below unit cost — cannot save.</p>
                          )}
                        </Field>
                      </div>
                    </>
                  );
                })()}
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Discount Rate (%)">
                    <Input type="number" min="0" max="100" value={form.discountRate} onChange={(e) => setForm({ ...form, discountRate: e.target.value })} placeholder="0" />
                  </Field>
                  <div />
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
