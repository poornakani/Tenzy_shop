import React, { useEffect, useMemo, useState } from "react";
import {
  AlertCircle, CheckCircle, ChevronDown, ChevronUp, CreditCard, Eye, FileText,
  ImagePlus, Info, MessageSquare, PackagePlus, Pencil, Plus, Receipt, ShoppingBag,
  Tag, Trash2, X,
} from "lucide-react";
import {
  brandsApi, concernsApi, paymentApi, productFaqApi,
  productImageApi, productsApi, supplyChainApi, uploadApi,
} from "../../services/api";
// paymentCardsApi is accessed via supplyChainApi.getPaymentCards()

const emptyItem = {
  productId: "",
  productName: "",
  brandId: "",
  brandName: "",
  quantity: 1,
  unitPrice: "",
  _productWeight: null, // pre-filled from product for validation only — not shown in UI
  batchNote: "",
  sourceProcurementId: null,
  sourceProcurementItemId: null,
  discountType: "none",
  discountValue: "",
  buyQuantity: "",
  payQuantity: "",
  discountNote: "",
  // shop snapshot — captured when item is added
  _shopId: "",
  _shopName: "",
  _invoiceReference: "",
  _paymentCardName: "",
  _paymentReference: "",
  _purchaseNote: "",
  _cardSpendAmount: "",
};

const emptyForm = {
  procurementId: null,
  procurementReference: "",
  shopId: "",
  shopName: "",
  purchaseDate: new Date().toISOString().slice(0, 10),
  invoiceReference: "",
  paymentCardName: "",
  paymentReference: "",
  purchaseNote: "",
  cardSpendAmount: "",
  items: [],
};

const emptyBrandForm = {
  name: "",
  brandImage: "",
};

const emptyProductForm = () => ({
  name: "",
  brandId: "",
  description: "",
  weight: "",
  tabletCount: "",
  showWeight: true,
  showTabletCount: false,
  inSale: false,
  stock: "0",
  price: "",
  discountRate: "0",
  startUTC: new Date().toISOString().slice(0, 10),
  endUTC: "",
  images: [],
  concerns: [],
  paymentOptions: [],
  faqs: [],
});

const money = (value) => new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(value ?? 0);

const Input = (props) => (
  <input
    {...props}
    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-tenzy-teal focus:ring-2 focus:ring-tenzy-teal/20"
  />
);

const Select = (props) => (
  <select
    {...props}
    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-tenzy-teal focus:ring-2 focus:ring-tenzy-teal/20"
  />
);

const Label = ({ children }) => <label className="mb-1 block text-xs font-semibold text-slate-500">{children}</label>;

const normalizeBrandId = (brand) => brand.brandId ?? brand.BrandId ?? brand.Brandid;
const normalizeProductId = (product) => product.productId ?? product.ProductId ?? product.productid;
const normalizeShopId = (shop) => shop.shopId ?? shop.ShopId;
const normalizeShopName = (shop) => shop.shopName ?? shop.ShopName ?? shop.name ?? shop.Name ?? "";
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
const toApiDate = (value) => (value ? `${value}T00:00:00Z` : null);
const normalizeFaqDraft = (faq) => ({
  faqId: faq.faqId ?? faq.FAQId ?? 0,
  question: String(faq.question ?? faq.Question ?? "").trim(),
  answer: String(faq.answer ?? faq.Answer ?? "").trim(),
});

function buildDiscountFromItem(item) {
  if (item.discountType === "none") return null;

  return {
    discountType: item.discountType,
    discountScope: "item",
    description: item.discountNote || `${item.productName} discount`,
    targetProductName: item.productName,
    targetBrandName: item.brandName || null,
    targetShopName: null,
    buyQuantity: item.buyQuantity ? Number(item.buyQuantity) : null,
    payQuantity: item.payQuantity ? Number(item.payQuantity) : null,
    percentage: item.discountType === "percentage" ? Number(item.discountValue || 0) : item.discountType === "third_item_half_price" ? 50 : null,
    fixedAmount: item.discountType === "fixed_amount" || item.discountType === "buy_x_get_amount_off"
      ? Number(item.discountValue || 0)
      : null,
    notes: item.discountNote || null,
  };
}

function estimateItemDiscount(item) {
  const quantity = Number(item.quantity) || 0;
  const unitPrice = Number(item.unitPrice) || 0;
  const gross = quantity * unitPrice;

  switch (item.discountType) {
    case "percentage":
      return gross * ((Number(item.discountValue) || 0) / 100);
    case "fixed_amount":
      return Number(item.discountValue) || 0;
    case "buy_x_get_amount_off":
      return Math.floor(quantity / Math.max(Number(item.buyQuantity) || 1, 1)) * (Number(item.discountValue) || 0);
    case "buy_x_pay_y": {
      const buy = Math.max(Number(item.buyQuantity) || 0, 1);
      const pay = Math.max(Number(item.payQuantity) || 0, 0);
      return Math.floor(quantity / buy) * Math.max(buy - pay, 0) * unitPrice;
    }
    case "third_item_half_price":
      return Math.floor(quantity / 3) * unitPrice * 0.5;
    default:
      return 0;
  }
}

function discountSummary(item) {
  switch (item.discountType) {
    case "percentage":
      return `${item.discountValue || 0}% off`;
    case "fixed_amount":
      return `${money(item.discountValue || 0)} off`;
    case "buy_x_get_amount_off":
      return `Buy ${item.buyQuantity || 0}, get ${money(item.discountValue || 0)} off`;
    case "buy_x_pay_y":
      return `Buy ${item.buyQuantity || 0}, pay ${item.payQuantity || 0}`;
    case "third_item_half_price":
      return "Every 3rd item half price";
    default:
      return "No discount";
  }
}

function getDraftItemAmounts(item) {
  const quantity = Number(item.quantity) || 0;
  const unitPrice = Number(item.unitPrice) || 0;
  const grossAmount = quantity * unitPrice;
  const discountAmount = estimateItemDiscount(item);
  const netAmount = Math.max(grossAmount - discountAmount, 0);

  return {
    grossAmount,
    discountAmount,
    savedAmount: discountAmount,
    netAmount,
  };
}

function mapDetailToDraft(detail) {
  return {
    procurementId: detail.procurementId,
    procurementReference: detail.procurementReference ?? "",
    shopId: detail.shopId != null ? String(detail.shopId) : "",
    shopName: detail.shopName ?? "",
    purchaseDate: String(detail.purchaseDate ?? "").slice(0, 10),
    invoiceReference: detail.invoiceReference ?? "",
    paymentCardName: detail.paymentCardName ?? "",
    paymentReference: detail.paymentReference ?? "",
    purchaseNote: detail.purchaseNote ?? "",
    cardSpendAmount: detail.cardSpendAmount != null ? String(detail.cardSpendAmount) : "",
    items: (detail.items ?? []).map((item) => ({
      ...emptyItem,
      procurementItemId: item.procurementItemId ?? null,
      productId: item.productId ? String(item.productId) : "",
      productName: item.productName ?? "",
      brandName: item.brandName ?? "",
      quantity: item.quantity ?? 1,
      unitPrice: item.unitPrice ?? "",
      _productWeight: item.weight != null ? Number(item.weight) : null,
      batchNote: item.batchNote ?? "",
      _shopId: detail.shopId != null ? String(detail.shopId) : "",
      _shopName: detail.shopName ?? "",
      _invoiceReference: detail.invoiceReference ?? "",
      _paymentCardName: detail.paymentCardName ?? "",
      _paymentReference: detail.paymentReference ?? "",
      _purchaseNote: detail.purchaseNote ?? "",
      _cardSpendAmount: detail.cardSpendAmount != null ? String(detail.cardSpendAmount) : "",
    })),
  };
}

// ── Toast notification component ─────────────────────────────────────────────
function ToastNotification({ toasts, onDismiss }) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed top-5 right-5 z-[100] flex flex-col gap-2 max-w-sm">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-start gap-3 rounded-2xl px-4 py-3 shadow-lg border text-sm font-medium animate-in slide-in-from-right ${
            toast.type === "error"
              ? "bg-red-50 border-red-200 text-red-800"
              : toast.type === "warning"
              ? "bg-amber-50 border-amber-200 text-amber-800"
              : "bg-emerald-50 border-emerald-200 text-emerald-800"
          }`}
        >
          {toast.type === "error" && <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-500" />}
          {toast.type === "warning" && <AlertCircle size={16} className="shrink-0 mt-0.5 text-amber-500" />}
          {toast.type === "success" && <CheckCircle size={16} className="shrink-0 mt-0.5 text-emerald-500" />}
          <span className="flex-1">{toast.message}</span>
          <button onClick={() => onDismiss(toast.id)} className="ml-1 text-slate-400 hover:text-slate-600"><X size={14} /></button>
        </div>
      ))}
    </div>
  );
}

// ── Confirmation dialog component ─────────────────────────────────────────────
function ConfirmDialog({ dialog, onCancel }) {
  if (!dialog) return null;
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative bg-white rounded-3xl shadow-2xl max-w-md w-full p-6">
        <h3 className="text-lg font-bold text-slate-900">{dialog.title}</h3>
        <p className="mt-2 text-sm text-slate-600">{dialog.message}</p>
        <div className="mt-5 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
          >
            Cancel
          </button>
          <button
            onClick={dialog.onConfirm}
            className="flex-1 py-2.5 rounded-xl bg-tenzy-teal text-white text-sm font-bold hover:opacity-90 transition"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Procurement() {
  const [records, setRecords] = useState([]);
  const [products, setProducts] = useState([]);
  const [brands, setBrands] = useState([]);
  const [concernTypes, setConcernTypes] = useState([]);
  const [paymentTypes, setPaymentTypes] = useState([]);
  const [paymentCards, setPaymentCards] = useState([]);
  const [shops, setShops] = useState([]);
  const [detail, setDetail] = useState(null);
  const [procurementDetails, setProcurementDetails] = useState([]);
  const [remainingByItem, setRemainingByItem] = useState({});
  const [form, setForm] = useState(emptyForm);
  const [draftItem, setDraftItem] = useState(emptyItem);
  const [brandModalOpen, setBrandModalOpen] = useState(false);
  const [brandForm, setBrandForm] = useState(emptyBrandForm);
  const [brandUploading, setBrandUploading] = useState(false);
  const [brandPreviewError, setBrandPreviewError] = useState(false);
  const [creatingBrand, setCreatingBrand] = useState(false);
  const [productDrawerOpen, setProductDrawerOpen] = useState(false);
  const [productForm, setProductForm] = useState(emptyProductForm());
  const [creatingProduct, setCreatingProduct] = useState(false);
  const [productUploading, setProductUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [viewLoading, setViewLoading] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [selectedItemIndices, setSelectedItemIndices] = useState(new Set());
  const [bulkDiscount, setBulkDiscount] = useState({
    discountType: "none",
    discountValue: "",
    buyQuantity: "",
    payQuantity: "",
    discountNote: "",
  });

  const addToast = (type, message) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 5000);
  };

  const dismissToast = (id) => setToasts((prev) => prev.filter((t) => t.id !== id));

  const shopHeaderFilled =
    form.shopName.trim() &&
    form.invoiceReference.trim() &&
    form.paymentCardName.trim() &&
    form.paymentReference.trim();

  const loadPage = async () => {
    setLoading(true);
    try {
      const [procurements, productList, brandList, dispatchList, concernList, paymentList, cardList, shopList] = await Promise.all([
        supplyChainApi.getProcurements(),
        productsApi.getAllAdmin(),
        brandsApi.getAll(),
        supplyChainApi.getDispatches(),
        concernsApi.getAll(),
        paymentApi.getAll(),
        supplyChainApi.getPaymentCards(),
        supplyChainApi.getShops().catch(() => []),
      ]);

      setRecords(procurements ?? []);
      setProducts(productList ?? []);
      setBrands(brandList ?? []);
      setConcernTypes(concernList ?? []);
      setPaymentTypes(paymentList ?? []);
      setPaymentCards((cardList ?? []).filter((c) => c.isActive !== false));
      setShops((shopList ?? []).filter((s) => s.isActive !== false));

      const dispatchDetails = await Promise.all((dispatchList ?? []).map((dispatch) => supplyChainApi.getDispatchById(dispatch.shipmentId)));
      const dispatchedQty = {};

      dispatchDetails.forEach((dispatch) => {
        (dispatch.items ?? []).forEach((item) => {
          dispatchedQty[item.procurementItemId] = (dispatchedQty[item.procurementItemId] ?? 0) + (item.quantityDispatched ?? 0);
        });
      });

      const remainingMap = {};
      const fullProcurementDetails = await Promise.all((procurements ?? []).map((record) => supplyChainApi.getProcurementById(record.procurementId)));
      setProcurementDetails(fullProcurementDetails);
      fullProcurementDetails.forEach((procurement) => {
        (procurement.items ?? []).forEach((item) => {
          remainingMap[item.procurementItemId] = Math.max((item.quantity ?? 0) - (dispatchedQty[item.procurementItemId] ?? 0), 0);
        });
      });

      setRemainingByItem(remainingMap);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPage();
  }, []);

  const totals = useMemo(() => ({
    gross: form.items.reduce((sum, item) => sum + ((Number(item.quantity) || 0) * (Number(item.unitPrice) || 0)), 0),
    estimatedDiscount: form.items.reduce((sum, item) => sum + estimateItemDiscount(item), 0),
  }), [form.items]);

  // Group items by shop for draft summary display
  const itemsByShop = useMemo(() => {
    const groups = new Map();
    form.items.forEach((item, index) => {
      const key = `${item._shopName}|||${item._invoiceReference}`;
      if (!groups.has(key)) {
        groups.set(key, {
          shopId: item._shopId,
          shopName: item._shopName,
          invoiceReference: item._invoiceReference,
          paymentCardName: item._paymentCardName,
          cardSpendAmount: item._cardSpendAmount,
          items: [],
        });
      }
      groups.get(key).items.push({ ...item, _index: index });
    });
    return [...groups.values()];
  }, [form.items]);

  const onProductChange = (productId) => {
    const selected = products.find((product) => String(normalizeProductId(product)) === String(productId));
    const brandId = selected?.brandId ?? selected?.BrandId ?? selected?.brandid ?? "";
    const brand = brands.find((entry) => String(normalizeBrandId(entry)) === String(brandId));

    const productWeight = selected?.weight ?? selected?.Weight ?? null;
    setDraftItem((current) => ({
      ...current,
      productId,
      productName: selected?.name ?? "",
      brandId: brandId ? String(brandId) : "",
      brandName: brand?.name ?? "",
      _productWeight: productWeight != null ? Number(productWeight) : null,
    }));
  };

  const onBrandChange = (brandId) => {
    const brand = brands.find((entry) => String(normalizeBrandId(entry)) === String(brandId));
    setDraftItem((current) => ({
      ...current,
      brandId,
      brandName: brand?.name ?? "",
    }));
  };

  const openBrandModal = () => {
    setBrandForm(emptyBrandForm);
    setBrandPreviewError(false);
    setBrandModalOpen(true);
  };

  const handleBrandImageFilePick = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setBrandUploading(true);
    try {
      const url = await uploadApi.uploadImage(file);
      setBrandForm((current) => ({ ...current, brandImage: url }));
      setBrandPreviewError(false);
    } catch (error) {
      addToast("error", error.message || "Image upload failed.");
    } finally {
      setBrandUploading(false);
    }
  };

  const createBrandInline = async () => {
    if (!brandForm.name.trim() || creatingBrand) return;
    setCreatingBrand(true);
    try {
      await brandsApi.create({
        name: brandForm.name.trim(),
        brandImage: brandForm.brandImage.trim() || null,
      });
      const refreshedBrands = await brandsApi.getAll();
      setBrands(refreshedBrands ?? []);
      const created = (refreshedBrands ?? []).find((brand) => brand.name?.toLowerCase() === brandForm.name.trim().toLowerCase());
      if (created) {
        setDraftItem((current) => ({
          ...current,
          brandId: String(normalizeBrandId(created)),
          brandName: created.name ?? "",
        }));
        setProductForm((current) => ({
          ...current,
          brandId: String(normalizeBrandId(created)),
        }));
      }
      setBrandModalOpen(false);
      setBrandForm(emptyBrandForm);
      addToast("success", `Brand "${brandForm.name.trim()}" created successfully.`);
    } catch (error) {
      addToast("error", error.message);
    } finally {
      setCreatingBrand(false);
    }
  };

  const openProductDrawer = () => {
    const initialBrandId = draftItem.brandId || (brands[0] ? String(normalizeBrandId(brands[0])) : "");
    setProductForm({
      ...emptyProductForm(),
      name: draftItem.productName || "",
      brandId: initialBrandId,
      price: draftItem.unitPrice ? String(draftItem.unitPrice) : "",
    });
    setProductDrawerOpen(true);
  };

  const handleProductImageFilePick = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setProductUploading(true);
    try {
      const url = await uploadApi.uploadImage(file);
      setProductForm((current) => ({
        ...current,
        images: [...current.images, {
          imageId: Date.now(),
          imageUrl: url,
          isPrimary: current.images.length === 0,
          sortOrder: current.images.length + 1,
        }],
      }));
    } catch (error) {
      addToast("error", error.message || "Image upload failed.");
    } finally {
      setProductUploading(false);
    }
  };

  const toggleProductConcern = (id) => {
    setProductForm((current) => ({
      ...current,
      concerns: current.concerns.includes(id)
        ? current.concerns.filter((entry) => entry !== id)
        : [...current.concerns, id],
    }));
  };

  const toggleProductPayment = (id) => {
    setProductForm((current) => {
      const exists = current.paymentOptions.find((entry) => entry.paymentTypeId === id);
      return {
        ...current,
        paymentOptions: exists
          ? current.paymentOptions.filter((entry) => entry.paymentTypeId !== id)
          : [...current.paymentOptions, { paymentTypeId: id, instalment: null }],
      };
    });
  };

  const setProductInstalment = (id, value) => {
    setProductForm((current) => ({
      ...current,
      paymentOptions: current.paymentOptions.map((entry) => (
        entry.paymentTypeId === id ? { ...entry, instalment: value ? parseInt(value, 10) : null } : entry
      )),
    }));
  };

  const addProductFaq = () => {
    setProductForm((current) => ({
      ...current,
      faqs: [...current.faqs, { faqId: Date.now(), question: "", answer: "" }],
    }));
  };

  const updateProductFaq = (faqId, field, value) => {
    setProductForm((current) => ({
      ...current,
      faqs: current.faqs.map((faq) => (faq.faqId === faqId ? { ...faq, [field]: value } : faq)),
    }));
  };

  const removeProductFaq = (faqId) => {
    setProductForm((current) => ({
      ...current,
      faqs: current.faqs.filter((faq) => faq.faqId !== faqId),
    }));
  };

  const moveProductImage = (imageId, direction) => {
    setProductForm((current) => {
      const images = [...current.images];
      const index = images.findIndex((image) => image.imageId === imageId);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= images.length) return current;
      [images[index], images[target]] = [images[target], images[index]];
      return {
        ...current,
        images: images.map((image, idx) => ({ ...image, sortOrder: idx + 1 })),
      };
    });
  };

  const setPrimaryProductImage = (imageId) => {
    setProductForm((current) => ({
      ...current,
      images: current.images.map((image) => ({ ...image, isPrimary: image.imageId === imageId })),
    }));
  };

  const removeProductImage = (imageId) => {
    setProductForm((current) => {
      const images = current.images.filter((image) => image.imageId !== imageId);
      if (images.length > 0 && !images.some((image) => image.isPrimary)) {
        images[0] = { ...images[0], isPrimary: true };
      }
      return {
        ...current,
        images: images.map((image, index) => ({ ...image, sortOrder: index + 1 })),
      };
    });
  };

  const createProductInline = async () => {
    const productName = productForm.name.trim();
    if (!productName || !productForm.brandId || !productForm.price || creatingProduct) return;
    if (!productForm.weight || parseFloat(productForm.weight) <= 0) {
      addToast("warning", "Weight (g) is required for new products.");
      return;
    }
    setCreatingProduct(true);
    try {
      const normalizedFaqs = productForm.faqs.map(normalizeFaqDraft);
      const hasIncompleteFaq = normalizedFaqs.some(
        (faq) => (faq.question || faq.answer) && (!faq.question || !faq.answer)
      );
      if (hasIncompleteFaq) {
        addToast("warning", "Each FAQ must have both a question and an answer.");
        return;
      }

      const originalPrice = parseFloat(productForm.price) || 0;
      const discountRate = parseFloat(productForm.discountRate) || 0;
      const sellingPrice = Math.round(originalPrice * (1 - discountRate / 100) * 100) / 100;
      const body = {
        name: productName,
        brandId: Number(productForm.brandId),
        description: productForm.description,
        weight: productForm.weight ? parseFloat(productForm.weight) : null,
        tabletCount: productForm.tabletCount ? parseInt(productForm.tabletCount, 10) : null,
        showWeight: productForm.showWeight,
        showTabletCount: productForm.showTabletCount,
        inSale: productForm.inSale,
        stockQuantity: parseInt(productForm.stock, 10) || 0,
        sellingPrice,
        originalPrice,
        startUTC: toApiDate(productForm.startUTC),
        endUTC: toApiDate(productForm.endUTC),
        concernTypeIds: normalizeConcernIds(productForm.concerns),
        paymentOptions: productForm.paymentOptions,
        faqs: normalizedFaqs.filter((faq) => faq.question && faq.answer),
      };
      const result = await productsApi.create(body);
      const newId = result?.id ?? result?.Id;
      if (newId && productForm.images.length > 0) {
        await Promise.allSettled(
          productForm.images.map((image) => productImageApi.create({
            productId: newId,
            imageUrl: image.imageUrl,
            isPrimary: image.isPrimary,
            sortOrder: image.sortOrder,
          }))
        );
      }
      if (newId && body.faqs.length > 0) {
        await Promise.allSettled(
          body.faqs.map((faq) => productFaqApi.create({
            productId: newId,
            question: faq.question,
            answer: faq.answer,
            createdUtc: new Date().toISOString(),
            isActive: true,
          }))
        );
      }
      const refreshedProducts = await productsApi.getAllAdmin();
      setProducts(refreshedProducts ?? []);
      const brand = brands.find((entry) => String(normalizeBrandId(entry)) === String(productForm.brandId));
      setDraftItem((current) => ({
        ...current,
        productId: newId ? String(newId) : "",
        productName,
        brandId: productForm.brandId,
        brandName: brand?.name ?? current.brandName,
      }));
      setProductDrawerOpen(false);
      setProductForm(emptyProductForm());
      addToast("success", `Product "${productName}" created successfully.`);
    } catch (error) {
      addToast("error", error.message);
    } finally {
      setCreatingProduct(false);
    }
  };

  const addItem = () => {
    // Require shop header to be filled first
    if (!form.shopName.trim()) {
      addToast("warning", "Please enter the shop / vendor name before adding items.");
      return;
    }
    if (!form.invoiceReference.trim()) {
      addToast("warning", "Please enter the invoice / receipt reference before adding items.");
      return;
    }
    if (!form.paymentCardName.trim()) {
      addToast("warning", "Please enter the payment card / issuer before adding items.");
      return;
    }
    if (!form.paymentReference.trim()) {
      addToast("warning", "Please enter the payment reference before adding items.");
      return;
    }
    if (!draftItem.productId) {
      addToast("error", "Choose an existing product or create a new product before adding the item.");
      return;
    }
    if (!draftItem.productName || !draftItem.quantity || !draftItem.unitPrice || !draftItem.brandName) {
      addToast("error", "Please complete the product, brand, quantity, and unit price.");
      return;
    }
    if (draftItem.productId && (draftItem._productWeight == null || draftItem._productWeight <= 0)) {
      addToast("error", `"${draftItem.productName}" has no weight set. Edit the product in the Products page to add a weight before purchasing.`);
      return;
    }
    setForm((current) => ({
      ...current,
      items: [
        ...current.items,
        {
          ...draftItem,
          productId: draftItem.productId || "",
          quantity: Number(draftItem.quantity),
          unitPrice: Number(draftItem.unitPrice),
          _shopId: current.shopId,
          _shopName: current.shopName,
          _invoiceReference: current.invoiceReference,
          _paymentCardName: current.paymentCardName,
          _paymentReference: current.paymentReference,
          _purchaseNote: current.purchaseNote,
          _cardSpendAmount: current.cardSpendAmount,
        },
      ],
    }));
    setDraftItem(emptyItem);
    addToast("success", `"${draftItem.productName}" added to the list.`);
  };

  const removeDraftItem = (index) => {
    setForm((current) => ({
      ...current,
      items: current.items.filter((_, currentIndex) => currentIndex !== index),
    }));
    setSelectedItemIndices((prev) => {
      const next = new Set();
      prev.forEach((i) => {
        if (i < index) next.add(i);
        else if (i > index) next.add(i - 1);
      });
      return next;
    });
  };

  const toggleItemSelection = (index) => {
    setSelectedItemIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const selectAllNonDispatchedItems = () => {
    const indices = form.items
      .map((item, i) => (!isItemDispatched(item) ? i : null))
      .filter((i) => i !== null);
    setSelectedItemIndices(new Set(indices));
  };

  const deselectAllItems = () => setSelectedItemIndices(new Set());

  const applyBulkDiscount = () => {
    if (selectedItemIndices.size === 0) {
      addToast("warning", "Select at least one item to apply a discount.");
      return;
    }
    setForm((current) => ({
      ...current,
      items: current.items.map((item, index) => {
        if (!selectedItemIndices.has(index)) return item;
        return {
          ...item,
          discountType: bulkDiscount.discountType,
          discountValue: bulkDiscount.discountValue,
          buyQuantity: bulkDiscount.buyQuantity,
          payQuantity: bulkDiscount.payQuantity,
          discountNote: bulkDiscount.discountNote,
        };
      }),
    }));
    addToast("success", `Discount applied to ${selectedItemIndices.size} item(s).`);
    setSelectedItemIndices(new Set());
    setBulkDiscount({ discountType: "none", discountValue: "", buyQuantity: "", payQuantity: "", discountNote: "" });
  };

  const removeItemDiscount = (index) => {
    setForm((current) => ({
      ...current,
      items: current.items.map((item, i) =>
        i !== index
          ? item
          : { ...item, discountType: "none", discountValue: "", buyQuantity: "", payQuantity: "", discountNote: "" }
      ),
    }));
  };

  // Clear current shop header fields so user can enter the next shop
  const clearShopHeader = () => {
    const currentShopItems = form.items.filter(
      (item) => item._shopName === form.shopName && item._invoiceReference === form.invoiceReference
    );
    if (currentShopItems.length === 0) {
      addToast("warning", "Add at least one item for this shop before clearing the shop details.");
      return;
    }
    setForm((current) => ({
      ...current,
      shopId: "",
      shopName: "",
      invoiceReference: "",
      paymentCardName: "",
      paymentReference: "",
      purchaseNote: "",
      cardSpendAmount: "",
    }));
    addToast("success", `${currentShopItems.length} item(s) saved for "${form.shopName}". Fill in the next shop details to continue.`);
  };

  const openDetail = async (procurementId) => {
    setViewLoading(true);
    try {
      const response = await supplyChainApi.getProcurementById(procurementId);
      setDetail(response);
    } catch (error) {
      addToast("error", error.message);
    } finally {
      setViewLoading(false);
    }
  };

  const editProcurement = async (procurementId) => {
    // If every item in this procurement has been dispatched there is nothing to edit — view only.
    if (fullyDispatchedIds.has(procurementId)) {
      addToast("warning", "All items in this purchase have been dispatched. Opening in view-only mode.");
      return openDetail(procurementId);
    }
    setViewLoading(true);
    try {
      const response = await supplyChainApi.getProcurementById(procurementId);
      setDetail(response);
      const draft = mapDetailToDraft(response);
      if (!draft.shopId && draft.shopName) {
        const matchedShop = shops.find((shop) => normalizeShopName(shop).toLowerCase() === draft.shopName.toLowerCase());
        if (matchedShop) draft.shopId = String(normalizeShopId(matchedShop));
      }
      setForm(draft);
      setDraftItem(emptyItem);
      setCarryForwardItemId("");
      setCarryForwardNote("");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      addToast("error", error.message);
    } finally {
      setViewLoading(false);
    }
  };

  const save = async () => {
    if (form.items.length === 0 || saving) return;
    // In edit mode only validate the items that will actually be saved (non-dispatched ones).
    // Dispatched items are locked in the DB and are not re-submitted.
    const itemsToValidate = form.procurementId
      ? form.items.filter((item) => !isItemDispatched(item))
      : form.items;
    if (itemsToValidate.some((item) => !item.productId)) {
      addToast("error", "Every purchase item must be linked to a product.");
      return;
    }

    // For edit mode, still require shop fields
    if (form.procurementId && (!form.shopName.trim() || !form.invoiceReference.trim())) {
      addToast("error", "Shop name and invoice reference are required.");
      return;
    }

    let confirmMessage;
    let shopGroups = null;

    if (form.procurementId) {
      // Edit mode
      confirmMessage = `Update this UK purchase record from "${form.shopName}"?`;
    } else {
      // Create mode — group items by shop
      const groupMap = new Map();
      form.items.forEach((item) => {
        const key = `${item._shopName}|||${item._invoiceReference}`;
        if (!groupMap.has(key)) {
          groupMap.set(key, {
            shopId: item._shopId,
            shopName: item._shopName,
            invoiceReference: item._invoiceReference,
            paymentCardName: item._paymentCardName,
            paymentReference: item._paymentReference,
            purchaseNote: item._purchaseNote,
            cardSpendAmount: item._cardSpendAmount,
          });
        }
      });
      shopGroups = [...groupMap.values()];
      const shopNames = shopGroups.map((g) => g.shopName || "Unknown").join(", ");
      confirmMessage = shopGroups.length === 1
        ? `Save UK purchase from "${shopGroups[0].shopName}" with ${form.items.length} item(s)?`
        : `Save ${shopGroups.length} UK purchases (${shopNames}) with ${form.items.length} total item(s)?`;
    }

    setConfirmDialog({
      title: "Confirm Save",
      message: confirmMessage,
      onConfirm: async () => {
        setConfirmDialog(null);
        setSaving(true);
        try {
          if (form.procurementId) {
            // Edit mode: only non-dispatched items are sent.
            // Dispatched items are FK-locked in the DB and must not be deleted/re-inserted.
            // The SP (migration 019) deletes non-dispatched items from DB then inserts this list.
            const editableItems = form.items.filter((item) => !isItemDispatched(item));
            const payload = {
              procurementId: form.procurementId,
              procurementReference: form.procurementReference || null,
              shopId: form.shopId ? Number(form.shopId) : null,
              shopName: form.shopName.trim(),
              purchaseDate: `${form.purchaseDate}T00:00:00`,
              invoiceReference: form.invoiceReference.trim(),
              paymentCardName: form.paymentCardName?.trim() || null,
              paymentReference: form.paymentReference?.trim() || null,
              purchaseNote: form.purchaseNote?.trim() || null,
              cardSpendAmount: form.cardSpendAmount ? Number(form.cardSpendAmount) : null,
              items: editableItems.map((item) => ({
                productId: item.productId ? Number(item.productId) : null,
                productName: item.productName.trim(),
                brandName: item.brandName.trim(),
                quantity: Number(item.quantity),
                unitPrice: Number(item.unitPrice),
                weight: item._productWeight != null ? +(item._productWeight / 1000).toFixed(3) : null,
                batchNote: item.batchNote?.trim() || null,
              })),
              discounts: editableItems.map(buildDiscountFromItem).filter(Boolean),
            };
            await supplyChainApi.saveProcurement(payload);
          } else {
            // Create mode: one procurement per shop group
            for (const group of shopGroups) {
              const groupItems = form.items.filter(
                (item) => item._shopName === group.shopName && item._invoiceReference === group.invoiceReference
              );
              const payload = {
                procurementReference: form.procurementReference || null,
                shopId: group.shopId ? Number(group.shopId) : null,
                shopName: group.shopName.trim(),
                purchaseDate: `${form.purchaseDate}T00:00:00`,
                invoiceReference: group.invoiceReference.trim(),
                paymentCardName: group.paymentCardName?.trim() || null,
                paymentReference: group.paymentReference?.trim() || null,
                purchaseNote: group.purchaseNote?.trim() || null,
                cardSpendAmount: group.cardSpendAmount ? Number(group.cardSpendAmount) : null,
                items: groupItems.map((item) => ({
                  productId: item.productId ? Number(item.productId) : null,
                  productName: item.productName.trim(),
                  brandName: item.brandName.trim(),
                  quantity: Number(item.quantity),
                  unitPrice: Number(item.unitPrice),
                  weight: item._productWeight != null ? +(item._productWeight / 1000).toFixed(3) : null,
                  batchNote: item.batchNote?.trim() || null,
                })),
                discounts: groupItems.map(buildDiscountFromItem).filter(Boolean),
              };
              await supplyChainApi.saveProcurement(payload);
            }
          }
          await loadPage();
          setForm(emptyForm);
          setDraftItem(emptyItem);
          setCarryForwardItemId("");
          setCarryForwardNote("");
          setProductDrawerOpen(false);
          setBrandModalOpen(false);
          setDetail(null);
          setSelectedItemIndices(new Set());
          setBulkDiscount({ discountType: "none", discountValue: "", buyQuantity: "", payQuantity: "", discountNote: "" });
          addToast("success", form.procurementId ? "UK purchase updated successfully." : "UK purchase(s) saved successfully.");
        } catch (error) {
          addToast("error", error.message || "Failed to save. Please try again.");
        } finally {
          setSaving(false);
        }
      },
    });
  };

  const procurementLookup = useMemo(() => {
    const map = new Map();
    records.forEach((record) => map.set(record.procurementId, record));
    return map;
  }, [records]);

  // An item is "dispatched" when its remaining quantity is less than its purchased quantity,
  // meaning at least one unit has entered a shipment and the row is FK-locked in the DB.
  const isItemDispatched = (item) => {
    if (!item.procurementItemId) return false;
    const remaining = remainingByItem[item.procurementItemId];
    if (remaining === undefined) return false;
    return remaining < (Number(item.quantity) || 0);
  };

  // A procurement is "fully dispatched" when every item has been dispatched at least once
  // (remaining < quantity), meaning editableItems would be empty. These records are view-only.
  const fullyDispatchedIds = useMemo(() => {
    const ids = new Set();
    procurementDetails.forEach((proc) => {
      if (!proc.items || proc.items.length === 0) return;
      const allDispatched = proc.items.every((item) => {
        const remaining = remainingByItem[item.procurementItemId];
        if (remaining === undefined) return false;
        return remaining < (item.quantity ?? 0);
      });
      if (allDispatched) ids.add(proc.procurementId);
    });
    return ids;
  }, [procurementDetails, remainingByItem]);

  const cancelEdit = () => {
    setForm(emptyForm);
    setDraftItem(emptyItem);
    setDetail(null);
    setSelectedItemIndices(new Set());
    setBulkDiscount({ discountType: "none", discountValue: "", buyQuantity: "", payQuantity: "", discountNote: "" });
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 rounded-full border-4 border-tenzy-teal/30 border-t-tenzy-teal animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Toast notifications */}
      <ToastNotification toasts={toasts} onDismiss={dismissToast} />

      {/* Confirmation dialog */}
      <ConfirmDialog dialog={confirmDialog} onCancel={() => setConfirmDialog(null)} />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">UK Purchase</h1>
          <p className="mt-1 text-sm text-slate-500">Record UK purchases, view remaining undisbursed stock, and carry leftover items into new purchase entries.</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-500">
          {records.length} purchase records
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <ShoppingBag size={16} className="text-tenzy-teal" />
            <h2 className="text-sm font-bold text-slate-800">{form.procurementId ? "Edit purchase" : "Shop details"}</h2>
            {form.procurementId && (
              <span className="ml-auto rounded-full bg-indigo-50 px-3 py-0.5 text-xs font-semibold text-indigo-600">
                Editing existing record
              </span>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Purchase reference</Label>
              <Input value={form.procurementReference} onChange={(e) => setForm({ ...form, procurementReference: e.target.value })} placeholder="Auto-generated if blank" />
            </div>
            <div>
              <Label>Purchase date</Label>
              <Input type="date" value={form.purchaseDate} onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })} />
            </div>
            <div>
              <Label>
                Shop / vendor <span className="text-red-400">*</span>
              </Label>
              <select
                value={form.shopId || ""}
                onChange={(e) => {
                  const shop = shops.find((entry) => String(normalizeShopId(entry)) === e.target.value);
                  setForm({
                    ...form,
                    shopId: e.target.value,
                    shopName: shop ? normalizeShopName(shop) : "",
                  });
                }}
                className={`w-full rounded-2xl border px-3 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-tenzy-teal/20 ${
                  !form.shopName.trim() ? "border-amber-300 bg-amber-50 focus:border-tenzy-teal" : "border-slate-200 bg-slate-50 focus:border-tenzy-teal"
                }`}
              >
                <option value="">Select shop</option>
                {shops.map((shop) => (
                  <option key={normalizeShopId(shop)} value={normalizeShopId(shop)}>{normalizeShopName(shop)}</option>
                ))}
              </select>
              {shops.length === 0 && (
                <p className="mt-1 text-[11px] text-amber-600">Add shops in Reference Data before recording UK purchases.</p>
              )}
            </div>
            <div>
              <Label>
                Invoice / receipt reference <span className="text-red-400">*</span>
              </Label>
              <Input
                value={form.invoiceReference}
                onChange={(e) => setForm({ ...form, invoiceReference: e.target.value })}
                placeholder="Receipt number"
                className={`w-full rounded-2xl border px-3 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-tenzy-teal/20 ${
                  !form.invoiceReference.trim() ? "border-amber-300 bg-amber-50 focus:border-tenzy-teal" : "border-slate-200 bg-slate-50 focus:border-tenzy-teal"
                }`}
              />
            </div>
            <div>
              <Label>
                Payment card / issuer <span className="text-red-400">*</span>
              </Label>
              <select
                value={form.paymentCardName}
                onChange={(e) => setForm({ ...form, paymentCardName: e.target.value })}
                className={`w-full rounded-2xl border px-3 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-tenzy-teal/20 ${
                  !form.paymentCardName.trim() ? "border-amber-300 bg-amber-50 focus:border-tenzy-teal" : "border-slate-200 bg-slate-50 focus:border-tenzy-teal"
                }`}
              >
                <option value="">Select card</option>
                {paymentCards.map((card) => (
                  <option key={card.cardId} value={card.cardName}>{card.cardName}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>
                Payment reference <span className="text-red-400">*</span>
              </Label>
              <Input
                value={form.paymentReference}
                onChange={(e) => setForm({ ...form, paymentReference: e.target.value })}
                placeholder="Card ref, bank ref, or transaction id"
                className={`w-full rounded-2xl border px-3 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-tenzy-teal/20 ${
                  !form.paymentReference.trim() ? "border-amber-300 bg-amber-50 focus:border-tenzy-teal" : "border-slate-200 bg-slate-50 focus:border-tenzy-teal"
                }`}
              />
            </div>
            <div>
              <Label>Card spend amount (£)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.cardSpendAmount}
                onChange={(e) => setForm({ ...form, cardSpendAmount: e.target.value })}
                placeholder="Total charged to card e.g. 45.80"
              />
            </div>
          </div>

          <div className="mt-4">
            <Label>Purchase note</Label>
            <textarea
              value={form.purchaseNote}
              onChange={(e) => setForm({ ...form, purchaseNote: e.target.value })}
              rows={2}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-tenzy-teal focus:ring-2 focus:ring-tenzy-teal/20"
              placeholder="Batch note, shelf offer note, or supplier comment"
            />
          </div>

          {/* Clear shop details button — shown when shop header is filled and not in edit mode */}
          {!form.procurementId && shopHeaderFilled && (
            <div className="mt-4 flex items-center justify-between rounded-2xl bg-teal-50 border border-teal-200 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-teal-800">Shop: {form.shopName}</p>
                <p className="text-xs text-teal-600 mt-0.5">After adding all items for this shop, click "Clear shop" to start the next shop.</p>
              </div>
              <button
                onClick={clearShopHeader}
                className="ml-4 shrink-0 inline-flex items-center gap-1.5 rounded-xl border border-teal-300 bg-white px-3 py-1.5 text-xs font-semibold text-teal-700 hover:bg-teal-50 transition"
              >
                <X size={13} /> Clear shop
              </button>
            </div>
          )}

          {/* Warning banner when shop header is incomplete */}
          {!shopHeaderFilled && (
            <div className="mt-4 flex items-start gap-2 rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3">
              <AlertCircle size={15} className="shrink-0 mt-0.5 text-amber-500" />
              <p className="text-xs text-amber-700">
                <strong>Fill in the required fields above</strong> — Shop name, Invoice reference, Payment card, and Payment reference — before adding items.
              </p>
            </div>
          )}

          {/* Add item section */}
          <div className={`mt-6 rounded-3xl p-4 ${shopHeaderFilled ? "bg-slate-50" : "bg-slate-50/60 opacity-80"}`}>
            <div className="flex items-center gap-2">
              <PackagePlus size={16} className="text-tenzy-teal" />
              <h2 className="text-sm font-bold text-slate-800">Add purchase item</h2>
              {!shopHeaderFilled && (
                <span className="ml-auto text-xs text-amber-600 font-medium">Fill shop details first</span>
              )}
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div>
                <Label>Existing product</Label>
                <Select value={draftItem.productId} onChange={(e) => onProductChange(e.target.value)} disabled={!shopHeaderFilled}>
                  <option value="">Select product</option>
                  {products.map((product) => (
                    <option key={normalizeProductId(product)} value={normalizeProductId(product)}>
                      {product.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>Product name</Label>
                <Input
                  value={draftItem.productName}
                  onChange={(e) => {
                    const value = e.target.value;
                    setDraftItem({ ...draftItem, productId: "", productName: value });
                  }}
                  placeholder="Select an existing product or type a new name"
                  disabled={!shopHeaderFilled}
                />
                <div className="mt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={openProductDrawer}
                    disabled={!shopHeaderFilled}
                    className="inline-flex min-h-[40px] items-center justify-center rounded-xl bg-tenzy-teal px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-teal-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Create New Product
                  </button>
                </div>
              </div>
              <div>
                <Label>Brand</Label>
                <Select value={draftItem.brandId} onChange={(e) => onBrandChange(e.target.value)} disabled={!shopHeaderFilled}>
                  <option value="">Select brand</option>
                  {brands.map((brand) => (
                    <option key={normalizeBrandId(brand)} value={normalizeBrandId(brand)}>
                      {brand.name}
                    </option>
                  ))}
                </Select>
                <div className="mt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={openBrandModal}
                    disabled={!shopHeaderFilled}
                    className="inline-flex min-h-[40px] items-center justify-center rounded-xl bg-tenzy-orange px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Create New Brand
                  </button>
                </div>
              </div>
              <div>
                <Label>Quantity</Label>
                <Input type="number" min="1" value={draftItem.quantity} onChange={(e) => setDraftItem({ ...draftItem, quantity: e.target.value })} disabled={!shopHeaderFilled} />
              </div>
              <div>
                <Label>Unit price (GBP)</Label>
                <Input type="number" step="0.01" min="0" value={draftItem.unitPrice} onChange={(e) => setDraftItem({ ...draftItem, unitPrice: e.target.value })} disabled={!shopHeaderFilled} />
              </div>
            </div>

            {/* Weight warning — shown when an existing product has no weight set */}
            {draftItem.productId && shopHeaderFilled && (draftItem._productWeight == null || draftItem._productWeight <= 0) && (
              <div className="mt-3 flex items-start gap-2 rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3">
                <AlertCircle size={15} className="shrink-0 mt-0.5 text-amber-500" />
                <p className="text-xs text-amber-700">
                  <strong>"{draftItem.productName}" has no weight.</strong> Go to the Products page and edit this product to add a weight before you can purchase it.
                </p>
              </div>
            )}

            <div className="mt-3">
              <Label>Batch / note</Label>
              <Input value={draftItem.batchNote} onChange={(e) => setDraftItem({ ...draftItem, batchNote: e.target.value })} disabled={!shopHeaderFilled} />
            </div>

            {draftItem.productId && draftItem.quantity && draftItem.unitPrice && (
              <div className="mt-3 flex items-center gap-3 rounded-xl bg-slate-100 px-4 py-2.5">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Gross</p>
                  <p className="text-sm font-bold text-slate-800">{money(Number(draftItem.quantity) * Number(draftItem.unitPrice))}</p>
                </div>
                <p className="ml-3 text-xs text-slate-400">Add the item first — you can apply discounts to multiple items at once from the draft list on the right.</p>
              </div>
            )}

            <div className="mt-5 flex justify-end">
              <button
                onClick={addItem}
                disabled={!shopHeaderFilled}
                className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Plus size={15} /> Add item
              </button>
            </div>
          </div>
        </div>

        {/* Right column: summary + draft items */}
        <div className="space-y-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">{form.procurementId ? "Edit UK purchase" : "Draft summary"}</h2>
            <div className="mt-4 space-y-3 text-sm text-slate-600">
              <div className="flex items-center justify-between"><span>Shops</span><strong>{itemsByShop.length || "—"}</strong></div>
              <div className="flex items-center justify-between"><span>Items</span><strong>{form.items.length}</strong></div>
              <div className="flex items-center justify-between"><span>Gross value</span><strong>{money(totals.gross)}</strong></div>
              <div className="flex items-center justify-between"><span>Estimated discounts</span><strong>{money(totals.estimatedDiscount)}</strong></div>
              <div className="flex items-center justify-between"><span>Estimated net</span><strong>{money(totals.gross - totals.estimatedDiscount)}</strong></div>
            </div>
            {form.items.length === 0 && (
              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                <p className="text-xs text-amber-700">No items added yet. Fill in the shop details and add items to save.</p>
              </div>
            )}
            <button
              onClick={save}
              disabled={saving || form.items.length === 0}
              className="mt-5 w-full rounded-2xl bg-tenzy-teal px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
            >
              {saving ? "Saving..." : form.procurementId ? "Update UK purchase" : "Save UK purchase"}
            </button>
            {form.procurementId && (
              <button
                onClick={cancelEdit}
                className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
              >
                Cancel edit
              </button>
            )}
          </div>

          {/* Draft items grouped by shop */}
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Draft items</h2>
              {form.items.some((item) => !isItemDispatched(item)) && (
                <div className="flex items-center gap-3">
                  <button
                    onClick={selectAllNonDispatchedItems}
                    className="text-xs font-semibold text-tenzy-teal hover:underline"
                  >
                    Select all
                  </button>
                  <span className="text-slate-300 text-xs">|</span>
                  <button
                    onClick={deselectAllItems}
                    className="text-xs font-semibold text-slate-500 hover:underline"
                  >
                    None
                  </button>
                </div>
              )}
            </div>

            {/* Info banner when editing a partially-dispatched procurement */}
            {form.procurementId && form.items.some((item) => isItemDispatched(item)) && (
              <div className="mt-3 flex items-start gap-2 rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3">
                <AlertCircle size={15} className="shrink-0 mt-0.5 text-amber-500" />
                <p className="text-xs text-amber-700">
                  <strong>Some items are locked</strong> — they have already been dispatched and cannot be deleted or moved. You can still edit the purchase header and remove or add items that have not yet been dispatched.
                </p>
              </div>
            )}

            <div className="mt-4 space-y-4">
              {form.items.length === 0 && <p className="text-sm text-slate-400">No items added yet.</p>}
              {itemsByShop.map((group, groupIdx) => (
                <div key={groupIdx}>
                  <div className="flex items-center gap-2 mb-2">
                    <ShoppingBag size={13} className="text-tenzy-teal shrink-0" />
                    <p className="text-xs font-bold text-slate-700 truncate">{group.shopName}</p>
                    <span className="text-[10px] text-slate-400 font-medium">{group.invoiceReference}</span>
                    {group.cardSpendAmount && (
                      <span className="ml-auto shrink-0 rounded-full bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">
                        Card: {money(group.cardSpendAmount)}
                      </span>
                    )}
                  </div>
                  <div className="space-y-2">
                    {group.items.map((item) => {
                      const dispatched = isItemDispatched(item);
                      const selected = selectedItemIndices.has(item._index);
                      const hasDiscount = item.discountType && item.discountType !== "none";
                      return (
                        <div
                          key={`${item.productName}-${item._index}`}
                          className={`rounded-2xl p-3 text-sm transition-all ${
                            selected
                              ? "bg-teal-50 border-2 border-tenzy-teal"
                              : dispatched
                              ? "bg-amber-50 border border-amber-200"
                              : "bg-slate-50 border border-transparent"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            {!dispatched && (
                              <button
                                type="button"
                                onClick={() => toggleItemSelection(item._index)}
                                className={`mt-0.5 w-5 h-5 shrink-0 rounded-md border-2 flex items-center justify-center transition ${
                                  selected ? "bg-tenzy-teal border-tenzy-teal" : "border-slate-300 hover:border-tenzy-teal"
                                }`}
                              >
                                {selected && <span className="text-white text-[10px] font-bold">✓</span>}
                              </button>
                            )}
                            {dispatched && <div className="w-5 shrink-0" />}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <p className="font-semibold text-slate-800">{item.productName}</p>
                                    {dispatched && (
                                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">
                                        Dispatched
                                      </span>
                                    )}
                                    {hasDiscount && (
                                      <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-semibold text-orange-700">
                                        {discountSummary(item)}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-slate-500 mt-0.5">{item.brandName}</p>
                                  {item.batchNote && <p className="mt-1 text-[11px] text-slate-400">{item.batchNote}</p>}
                                </div>
                                <div className="flex flex-col items-end gap-2 shrink-0">
                                  <span className="text-xs font-semibold text-slate-700">{item.quantity} × {money(item.unitPrice)}</span>
                                  {dispatched ? (
                                    <span className="rounded-xl border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-semibold text-amber-600">
                                      Locked
                                    </span>
                                  ) : (
                                    <div className="flex gap-1.5">
                                      {hasDiscount && (
                                        <button
                                          onClick={() => removeItemDiscount(item._index)}
                                          className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-500 hover:bg-slate-100 transition"
                                        >
                                          <X size={10} /> Discount
                                        </button>
                                      )}
                                      <button
                                        onClick={() => removeDraftItem(item._index)}
                                        className="inline-flex items-center gap-1 rounded-xl border border-red-200 px-2 py-1 text-[11px] font-semibold text-red-500 hover:bg-red-50 transition"
                                      >
                                        <Trash2 size={11} /> Remove
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Apply Discount to Selected Items panel */}
            {form.items.some((item) => !isItemDispatched(item)) && (
              <div className="mt-5 rounded-2xl border-2 border-dashed border-orange-200 bg-orange-50 p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Tag size={15} className="text-orange-500 shrink-0" />
                  <h3 className="text-sm font-bold text-slate-800">Apply Discount to Selected Items</h3>
                  {selectedItemIndices.size > 0 && (
                    <span className="ml-auto rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-semibold text-orange-700 shrink-0">
                      {selectedItemIndices.size} selected
                    </span>
                  )}
                </div>
                {selectedItemIndices.size === 0 ? (
                  <p className="text-xs text-slate-500 mt-2">
                    Tick the checkboxes on the items above to select them, then choose a discount type and click <strong>Apply to selected</strong>.
                  </p>
                ) : (
                  <div className="mt-3 space-y-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <Label>Discount type</Label>
                        <Select
                          value={bulkDiscount.discountType}
                          onChange={(e) => setBulkDiscount({ ...bulkDiscount, discountType: e.target.value, discountValue: "", buyQuantity: "", payQuantity: "" })}
                        >
                          <option value="none">No discount / remove discount</option>
                          <option value="percentage">Percentage (%)</option>
                          <option value="fixed_amount">Fixed amount off (GBP)</option>
                          <option value="buy_x_get_amount_off">Buy X get amount off (GBP)</option>
                          <option value="buy_x_pay_y">Buy X pay Y — e.g. 3 for 2</option>
                          <option value="third_item_half_price">Third item half price</option>
                        </Select>
                      </div>
                      <div>
                        <Label>
                          {bulkDiscount.discountType === "percentage"
                            ? "Discount %"
                            : bulkDiscount.discountType === "buy_x_get_amount_off"
                            ? "Amount off (GBP)"
                            : bulkDiscount.discountType === "third_item_half_price"
                            ? "Auto (50% on every 3rd item)"
                            : "Discount value"}
                        </Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={bulkDiscount.discountValue}
                          onChange={(e) => setBulkDiscount({ ...bulkDiscount, discountValue: e.target.value })}
                          disabled={
                            bulkDiscount.discountType === "none" ||
                            bulkDiscount.discountType === "buy_x_pay_y" ||
                            bulkDiscount.discountType === "third_item_half_price"
                          }
                          placeholder={
                            bulkDiscount.discountType === "none"
                              ? "Choose a discount type first"
                              : bulkDiscount.discountType === "third_item_half_price" || bulkDiscount.discountType === "buy_x_pay_y"
                              ? "Not required"
                              : "Enter value"
                          }
                        />
                      </div>
                      {["buy_x_get_amount_off", "buy_x_pay_y"].includes(bulkDiscount.discountType) && (
                        <div>
                          <Label>{bulkDiscount.discountType === "buy_x_pay_y" ? "Buy quantity" : "Trigger quantity (buy how many)"}</Label>
                          <Input
                            type="number"
                            min="1"
                            value={bulkDiscount.buyQuantity}
                            onChange={(e) => setBulkDiscount({ ...bulkDiscount, buyQuantity: e.target.value })}
                            placeholder="e.g. 3"
                          />
                        </div>
                      )}
                      {bulkDiscount.discountType === "buy_x_pay_y" && (
                        <div>
                          <Label>Pay quantity (pay for how many)</Label>
                          <Input
                            type="number"
                            min="0"
                            value={bulkDiscount.payQuantity}
                            onChange={(e) => setBulkDiscount({ ...bulkDiscount, payQuantity: e.target.value })}
                            placeholder="e.g. 2"
                          />
                        </div>
                      )}
                      <div className={["buy_x_get_amount_off", "buy_x_pay_y"].includes(bulkDiscount.discountType) ? "" : "sm:col-span-2"}>
                        <Label>Discount note (optional)</Label>
                        <Input
                          value={bulkDiscount.discountNote}
                          onChange={(e) => setBulkDiscount({ ...bulkDiscount, discountNote: e.target.value })}
                          placeholder="e.g. Boots 3-for-2 promotion"
                        />
                      </div>
                    </div>
                    {bulkDiscount.discountType === "buy_x_pay_y" && (
                      <p className="text-xs text-slate-500">
                        For a 3-for-2 deal: set <strong>Buy quantity</strong> to 3 and <strong>Pay quantity</strong> to 2.
                      </p>
                    )}
                    <button
                      onClick={applyBulkDiscount}
                      className="w-full rounded-2xl bg-orange-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-orange-600 transition shadow-sm"
                    >
                      Apply to {selectedItemIndices.size} item{selectedItemIndices.size !== 1 ? "s" : ""}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Saved records table */}
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <Receipt size={16} className="text-tenzy-teal" />
          <h2 className="text-lg font-bold text-slate-900">Saved UK purchases</h2>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-[0.2em] text-slate-400">
              <tr>
                <th className="pb-3">Reference</th>
                <th className="pb-3">Shop</th>
                <th className="pb-3">Date</th>
                <th className="pb-3">Invoice</th>
                <th className="pb-3">Net total</th>
                <th className="pb-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {records.map((record) => (
                <tr key={record.procurementId}>
                  <td className="py-3 font-semibold text-slate-800">{record.procurementReference}</td>
                  <td className="py-3 text-slate-600">{record.shopName}</td>
                  <td className="py-3 text-slate-600">{String(record.purchaseDate).slice(0, 10)}</td>
                  <td className="py-3 text-slate-600">{record.invoiceReference}</td>
                  <td className="py-3 font-semibold text-slate-800">{money(record.totalNetAmount)}</td>
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => openDetail(record.procurementId)} className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600">
                        <Eye size={12} /> View
                      </button>
                      {fullyDispatchedIds.has(record.procurementId) ? (
                        <span className="rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-400">
                          View only
                        </span>
                      ) : (
                        <button onClick={() => editProcurement(record.procurementId)} className="inline-flex items-center gap-1 rounded-xl border border-indigo-200 px-3 py-1.5 text-xs font-semibold text-indigo-600">
                          <Pencil size={12} /> Edit
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {(detail || viewLoading) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDetail(null)} />
          <div className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 rounded-t-3xl shrink-0">
              <FileText size={16} className="text-indigo-500 shrink-0" />
              <h2 className="text-lg font-bold text-slate-900 truncate">
                {viewLoading ? "Loading..." : detail?.procurementReference}
              </h2>
              {!viewLoading && detail && (
                <div className="ml-auto flex items-center gap-3 shrink-0">
                  <span className="text-xs text-slate-400">{detail.shopName}</span>
                  <span className="text-xs text-slate-300">·</span>
                  <span className="text-xs text-slate-400">{String(detail.purchaseDate ?? "").slice(0, 10)}</span>
                </div>
              )}
              <button
                onClick={() => setDetail(null)}
                className="ml-2 p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition shrink-0"
              >
                <X size={18} />
              </button>
            </div>

            <div className="overflow-y-auto p-6">
              {viewLoading && (
                <div className="flex items-center justify-center py-12">
                  <div className="w-7 h-7 rounded-full border-4 border-tenzy-teal/30 border-t-tenzy-teal animate-spin" />
                </div>
              )}
              {!viewLoading && detail && (
                <div className="grid gap-3 sm:grid-cols-2">
                  {detail.items?.map((item) => (
                    <div key={item.procurementItemId} className="rounded-2xl bg-slate-50 p-4">
                      <p className="font-semibold text-slate-800">{item.productName}</p>
                      <p className="mt-1 text-xs text-slate-500">{item.brandName}</p>
                      <div className="mt-3 space-y-1">
                        <p className="text-sm text-slate-700">Purchased: <strong>{item.quantity}</strong></p>
                        <p className="text-sm text-slate-700">Remaining in UK: <strong>{remainingByItem[item.procurementItemId] ?? item.quantity}</strong></p>
                        <p className="text-sm text-slate-700">Net unit cost: <strong>{money(item.netUnitCost)}</strong></p>
                        <p className="text-xs text-slate-500">Discount total: {money(item.discountTotal)}</p>
                        {item.weight != null && (
                          <p className="text-xs text-slate-500">Weight: <strong>{item.weight} kg</strong></p>
                        )}
                        {item.tabletCount != null && (
                          <p className="text-xs text-slate-500">Tablets: <strong>{item.tabletCount}</strong></p>
                        )}
                      </div>
                      {item.batchNote && <p className="mt-2 text-xs text-slate-400 italic">{item.batchNote}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {!viewLoading && detail?.cardCharges?.length > 0 && (
              <div className="px-6 pb-4 shrink-0">
                <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4">
                  <p className="text-xs font-bold text-indigo-700 mb-2 uppercase tracking-wide">Card Charges</p>
                  <table className="w-full text-sm">
                    <thead className="text-xs text-indigo-500">
                      <tr>
                        <th className="text-left pb-1">Reference</th>
                        <th className="text-left pb-1">Card</th>
                        <th className="text-right pb-1">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.cardCharges.map((cc) => (
                        <tr key={cc.cardChargeId}>
                          <td className="py-1 text-indigo-800 font-semibold">{detail.procurementReference}</td>
                          <td className="py-1 text-indigo-700">{cc.cardName}</td>
                          <td className="py-1 text-right font-bold text-indigo-900">{money(cc.cardSpendAmount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="px-6 py-4 border-t border-slate-100 shrink-0">
              <button
                onClick={() => setDetail(null)}
                className="w-full py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Brand modal */}
      {brandModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setBrandModalOpen(false)} />
          <div className="relative bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-3xl shadow-2xl">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between rounded-t-3xl sm:rounded-t-2xl">
              <p className="font-bold text-slate-900">Add Brand</p>
              <button onClick={() => setBrandModalOpen(false)} className="p-1.5 rounded-full hover:bg-slate-100"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="w-full aspect-video rounded-xl bg-slate-50 overflow-hidden border-2 border-dashed border-slate-200 flex items-center justify-center">
                {brandForm.brandImage && !brandPreviewError ? (
                  <img src={brandForm.brandImage} alt="preview" className="w-full h-full object-cover" onError={() => setBrandPreviewError(true)} />
                ) : (
                  <div className="text-center">
                    <ImagePlus size={32} className="text-slate-300 mx-auto mb-1" />
                    <p className="text-xs text-slate-400">Image preview</p>
                  </div>
                )}
              </div>
              <div>
                <Label>Brand Name</Label>
                <Input value={brandForm.name} onChange={(e) => setBrandForm({ ...brandForm, name: e.target.value })} placeholder="e.g. CeraVe" />
              </div>
              <div>
                <Label>Brand Image</Label>
                <label className={`flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border-2 border-dashed cursor-pointer transition ${
                  brandUploading ? "border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed" : "border-tenzy-teal/40 hover:border-tenzy-teal hover:bg-tenzy-teal/5 text-tenzy-teal"
                }`}>
                  <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" disabled={brandUploading} onChange={handleBrandImageFilePick} />
                  <ImagePlus size={15} />
                  <span className="text-xs font-semibold">
                    {brandUploading ? "Uploading…" : brandForm.brandImage ? "Replace image" : "Choose image to upload"}
                  </span>
                </label>
              </div>
              <div className="flex gap-3 pt-1">
                <button onClick={() => setBrandModalOpen(false)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition">
                  Cancel
                </button>
                <button onClick={createBrandInline} disabled={creatingBrand} className="flex-1 py-2.5 rounded-xl bg-tenzy-teal text-white text-sm font-bold hover:opacity-90 transition disabled:opacity-60">
                  {creatingBrand ? "Saving…" : "Add Brand"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Product drawer */}
      {productDrawerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setProductDrawerOpen(false)} />
          <div className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 rounded-t-3xl shrink-0">
              <p className="font-bold text-slate-900 text-lg">Add Product</p>
              <button onClick={() => setProductDrawerOpen(false)} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition"><X size={18} /></button>
            </div>

            <div className="overflow-y-auto p-6 space-y-6">
              <div className="space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <Info size={15} className="text-tenzy-teal" />
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Basic Info</h3>
                </div>
                <div>
                  <Label>Product Name</Label>
                  <Input value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} placeholder="e.g. CeraVe Moisturizing Cream" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Brand</Label>
                    <Select value={productForm.brandId} onChange={(e) => setProductForm({ ...productForm, brandId: e.target.value })}>
                      <option value="">Select brand</option>
                      {brands.map((brand) => (
                        <option key={normalizeBrandId(brand)} value={normalizeBrandId(brand)}>{brand.name}</option>
                      ))}
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Description</Label>
                  <textarea rows={3} value={productForm.description} onChange={(e) => setProductForm({ ...productForm, description: e.target.value })} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-tenzy-teal focus:ring-2 focus:ring-tenzy-teal/20" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-500">
                      Weight (g) <span className="text-red-400">*</span>
                    </label>
                    <Input
                      type="number"
                      min="0"
                      step="0.1"
                      value={productForm.weight}
                      onChange={(e) => setProductForm({ ...productForm, weight: e.target.value })}
                      placeholder="e.g. 250"
                      className={`w-full rounded-2xl border px-3 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-tenzy-teal/20 ${
                        !productForm.weight || parseFloat(productForm.weight) <= 0
                          ? "border-amber-300 bg-amber-50 focus:border-tenzy-teal"
                          : "border-slate-200 bg-slate-50 focus:border-tenzy-teal"
                      }`}
                    />
                  </div>
                  <div>
                    <Label>Tablet count</Label>
                    <Input type="number" min="1" step="1" value={productForm.tabletCount} onChange={(e) => setProductForm({ ...productForm, tabletCount: e.target.value })} placeholder="e.g. 60" />
                  </div>
                </div>

                {/* Visibility toggles */}
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs font-bold text-slate-600 mb-3">Show on website</p>
                  <div className="flex flex-wrap gap-5">
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <button
                        type="button"
                        onClick={() => setProductForm({ ...productForm, showWeight: !productForm.showWeight })}
                        className={`relative w-9 h-5 rounded-full transition-colors ${productForm.showWeight ? "bg-tenzy-teal" : "bg-slate-300"}`}
                      >
                        <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${productForm.showWeight ? "translate-x-4" : "translate-x-0"}`} />
                      </button>
                      <span className="text-xs font-medium text-slate-600">Weight</span>
                    </label>
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <button
                        type="button"
                        onClick={() => setProductForm({ ...productForm, showTabletCount: !productForm.showTabletCount })}
                        disabled={!productForm.tabletCount}
                        className={`relative w-9 h-5 rounded-full transition-colors disabled:opacity-40 ${productForm.showTabletCount ? "bg-tenzy-teal" : "bg-slate-300"}`}
                      >
                        <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${productForm.showTabletCount ? "translate-x-4" : "translate-x-0"}`} />
                      </button>
                      <span className={`text-xs font-medium ${productForm.tabletCount ? "text-slate-600" : "text-slate-400"}`}>
                        Tablet count {!productForm.tabletCount && <span className="text-[10px]">(add tablet count first)</span>}
                      </span>
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <Label>On Sale</Label>
                    <div className="flex items-center gap-3 mt-1">
                      <button type="button" onClick={() => setProductForm({ ...productForm, inSale: !productForm.inSale })} className={`relative w-11 h-6 rounded-full transition-colors ${productForm.inSale ? "bg-tenzy-orange" : "bg-slate-200"}`}>
                        <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${productForm.inSale ? "translate-x-5" : "translate-x-0"}`} />
                      </button>
                      <span className="text-xs font-semibold text-slate-600">{productForm.inSale ? "Yes" : "No"}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <CreditCard size={15} className="text-tenzy-teal" />
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Inventory & Pricing</h3>
                </div>
                <div>
                  <Label>Stock Quantity</Label>
                  <Input type="number" value={productForm.stock} onChange={(e) => setProductForm({ ...productForm, stock: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Price (LKR)</Label>
                    <Input type="number" value={productForm.price} onChange={(e) => setProductForm({ ...productForm, price: e.target.value })} />
                  </div>
                  <div>
                    <Label>Discount Rate (%)</Label>
                    <Input type="number" min="0" max="100" value={productForm.discountRate} onChange={(e) => setProductForm({ ...productForm, discountRate: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Pricing Start Date</Label>
                    <Input type="date" value={productForm.startUTC} onChange={(e) => setProductForm({ ...productForm, startUTC: e.target.value })} />
                  </div>
                  <div>
                    <Label>Pricing End Date</Label>
                    <Input type="date" value={productForm.endUTC} onChange={(e) => setProductForm({ ...productForm, endUTC: e.target.value })} />
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <ImagePlus size={15} className="text-tenzy-teal" />
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Product Images</h3>
                </div>
                <div className="space-y-2">
                  {productForm.images.length === 0 && <p className="text-xs text-slate-400 text-center py-4 bg-slate-50 rounded-xl">No images yet. Add one below.</p>}
                  {productForm.images.map((image, index) => (
                    <div key={image.imageId} className="flex items-center gap-2 bg-slate-50 rounded-xl p-2">
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-slate-200 shrink-0">
                        <img src={image.imageUrl} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-slate-500 truncate">{image.imageUrl}</p>
                        <p className="text-[10px] text-slate-400">Sort #{image.sortOrder}</p>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <button onClick={() => moveProductImage(image.imageId, -1)} disabled={index === 0} className="p-0.5 rounded hover:bg-slate-200 disabled:opacity-30"><ChevronUp size={12} /></button>
                        <button onClick={() => moveProductImage(image.imageId, 1)} disabled={index === productForm.images.length - 1} className="p-0.5 rounded hover:bg-slate-200 disabled:opacity-30"><ChevronDown size={12} /></button>
                      </div>
                      <button onClick={() => setPrimaryProductImage(image.imageId)} className={`p-1.5 rounded-lg transition ${image.isPrimary ? "bg-amber-100 text-amber-500" : "bg-slate-100 text-slate-400"}`}>
                        <Tag size={13} />
                      </button>
                      <button onClick={() => removeProductImage(image.imageId)} className="p-1.5 rounded-lg hover:bg-red-100 hover:text-red-500 text-slate-400 transition"><X size={13} /></button>
                    </div>
                  ))}
                </div>
                <label className={`flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border-2 border-dashed cursor-pointer transition ${
                  productUploading ? "border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed" : "border-tenzy-teal/40 hover:border-tenzy-teal hover:bg-tenzy-teal/5 text-tenzy-teal"
                }`}>
                  <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" disabled={productUploading} onChange={handleProductImageFilePick} />
                  <ImagePlus size={15} />
                  <span className="text-xs font-semibold">{productUploading ? "Uploading…" : "Choose image to upload"}</span>
                </label>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <Tag size={15} className="text-tenzy-teal" />
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Skin Concerns</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {concernTypes.map((concern) => {
                    const id = concern.concernTypeId ?? concern.ConcernTypeId;
                    const name = concern.name ?? concern.Name ?? concern.concernType ?? concern.ConcernType ?? "—";
                    const active = productForm.concerns.includes(id);
                    return (
                      <button key={id} type="button" onClick={() => toggleProductConcern(id)} className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition ${
                        active ? "bg-tenzy-teal text-white border-tenzy-teal" : "border-slate-200 text-slate-600 hover:border-tenzy-teal hover:text-tenzy-teal"
                      }`}>
                        {name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <CreditCard size={15} className="text-tenzy-teal" />
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Payment Options</h3>
                </div>
                <div className="space-y-2">
                  {paymentTypes.map((payment) => {
                    const id = payment.paymentTypeId ?? payment.PaymentTypeId;
                    const name = payment.name ?? payment.Name ?? payment.paymentType ?? payment.PaymentType ?? "—";
                    const selected = productForm.paymentOptions.find((entry) => entry.paymentTypeId === id);
                    return (
                      <div key={id} className="flex items-center gap-3">
                        <button type="button" onClick={() => toggleProductPayment(id)} className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition ${selected ? "bg-tenzy-teal border-tenzy-teal" : "border-slate-300"}`}>
                          {selected && <span className="text-white text-[10px] font-bold">✓</span>}
                        </button>
                        <span className="text-xs text-slate-700 flex-1">{name}</span>
                        {selected && id !== 1 && (
                          <input type="number" min="1" value={selected.instalment ?? ""} onChange={(e) => setProductInstalment(id, e.target.value)} placeholder="Months" className="w-20 text-xs px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-tenzy-teal/30" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <MessageSquare size={15} className="text-tenzy-teal" />
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Product FAQ</h3>
                </div>
                <div className="space-y-3">
                  {productForm.faqs.map((faq) => (
                    <div key={faq.faqId} className="bg-slate-50 rounded-xl p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase">Q&amp;A</span>
                        <button onClick={() => removeProductFaq(faq.faqId)} className="text-slate-400 hover:text-red-500"><X size={13} /></button>
                      </div>
                      <Input value={faq.question} onChange={(e) => updateProductFaq(faq.faqId, "question", e.target.value)} placeholder="Question…" />
                      <textarea rows={2} value={faq.answer} onChange={(e) => updateProductFaq(faq.faqId, "answer", e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-tenzy-teal focus:ring-2 focus:ring-tenzy-teal/20" placeholder="Answer…" />
                    </div>
                  ))}
                  <button onClick={addProductFaq} className="w-full py-2 rounded-xl border-2 border-dashed border-slate-200 text-xs font-semibold text-slate-500 hover:border-tenzy-teal hover:text-tenzy-teal transition flex items-center justify-center gap-1.5">
                    <Plus size={13} /> Add FAQ
                  </button>
                </div>
              </div>
            </div>

            <div className="px-5 py-4 border-t border-slate-100 flex gap-3">
              <button onClick={() => setProductDrawerOpen(false)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition">
                Cancel
              </button>
              <button onClick={createProductInline} disabled={creatingProduct} className="flex-1 py-2.5 rounded-xl bg-tenzy-teal text-white text-sm font-bold hover:opacity-90 transition disabled:opacity-60">
                {creatingProduct ? "Saving…" : "Add Product"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
