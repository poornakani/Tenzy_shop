import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  X, Plus, Trash2, Search, User, Phone, Mail, MapPin,
  Package, Download, AlertCircle, CheckCircle, Copy, Eye, EyeOff,
} from "lucide-react";
import { productsApi, customersApi, invoicesApi, authApi, orderStatusApi, productVariantsApi } from "../../services/api";

/* ── formatting ───────────────────────────────────────────────────────────── */
const fmt    = (n) => new Intl.NumberFormat("en-LK").format(Math.round(n ?? 0));
const fmtRs  = (n) =>
  `Rs${new Intl.NumberFormat("en-LK", { minimumFractionDigits: 2 }).format(n ?? 0)}`;
const todayStr = () => new Date().toISOString().slice(0, 10);

/* ── credential generation ────────────────────────────────────────────────── */
function genPassword() {
  const chars   = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz";
  const digits  = "23456789";
  const special = "@#$!";
  const pick = (s, n) => Array.from({ length: n }, () => s[Math.floor(Math.random() * s.length)]).join("");
  return `${pick(chars, 4)}${pick(digits, 3)}${pick(special, 1)}`;
}

function genEmailFromPhone(phone) {
  const clean = phone.replace(/\D/g, "");
  return `${clean}@tenzy.customer`;
}

/* ── company constants ────────────────────────────────────────────────────── */
const COMPANY = {
  name:    "TenzyUK Pvt Ltd",
  address: "58, Ashley Road, Thornton Heath, Croydon",
  city:    "London Surrey CR76HU, United Kingdom",
  phone:   "44-7404341714",
  email:   "tenzyfashionuk@gmail.com",
};
const BANK = { name: "W M D Chamathka", bank: "Sampath Bank, Weligama", account: "1209 5601 1092" };
const TERMS = [
  "Orders are confirmed only after full payment is received.",
  "Delivery timelines are estimated and may vary. (Estimated Delivery time - 2-3 weeks)",
];

/* ── item helpers ─────────────────────────────────────────────────────────── */
const mkItem = (product, availableStock, variant = null) => ({
  id:             Date.now() + Math.random(),
  productId:      product.productId ?? product.productid,
  variantId:      variant?.VariantId ?? variant?.variantId ?? null,
  productName:    product.name ?? "",
  variantName:    variant?.VariantName ?? variant?.variantName ?? "",
  priceType:      ((variant?.WholesalePrice ?? variant?.wholesalePrice ?? product.wholesalePrice ?? 0) > 0) ? "wholesale" : "website",
  qty:            1,
  // availableStock = variant stock or product-level stock minus already reserved
  stock:          availableStock ?? Math.max(0, parseInt(
    variant?.Stock ?? variant?.stock ?? product.stockQuantity ?? product.StockQuantity ?? product.stock ?? 0, 10) || 0),
  websitePrice:   Math.round(variant?.SellingPrice   ?? variant?.sellingPrice   ?? product.sellingPrice   ?? product.SellingPrice   ?? 0),
  wholesalePrice: Math.round(variant?.WholesalePrice ?? variant?.wholesalePrice ?? product.wholesalePrice ?? product.WholesalePrice ?? 0),
  arrivalCost:    Math.round(product.TotalUnitCostLkr ?? product.totalUnitCostLkr ?? 0),
  discountType:   "none",
  discountValue:  "",
});

const exceedsStock = (item) => item.stock > 0 && item.qty > item.stock;

const unitPrice   = (item) => item.priceType === "wholesale" ? item.wholesalePrice : item.websitePrice;
const rawDiscount = (item) => {
  const base = unitPrice(item) * item.qty;
  if (item.discountType === "percent") return Math.round(base * (Number(item.discountValue) || 0) / 100);
  if (item.discountType === "amount")  return Math.min(Number(item.discountValue) || 0, base);
  return 0;
};
const lineTotal   = (item) => {
  const raw = unitPrice(item) * item.qty - rawDiscount(item);
  return item.arrivalCost > 0 ? Math.max(raw, item.arrivalCost * item.qty) : Math.max(raw, 0);
};
const belowCost   = (item) =>
  item.arrivalCost > 0 &&
  (unitPrice(item) * item.qty - rawDiscount(item)) < item.arrivalCost * item.qty;

/* ── PDF HTML builder ─────────────────────────────────────────────────────── */
function buildInvoiceHtml({ invoiceNumber, date, dueDate, customer, items, shipping, notes, subtotal, total }) {
  const rows = items.map((item, i) => {
    const lt   = lineTotal(item);
    const disc = rawDiscount(item);
    const note = disc > 0
      ? `<br/><small style="color:#e8522a">Discount: ${item.discountType === "percent" ? item.discountValue + "%" : "Rs" + fmt(disc)} applied</small>`
      : "";
    return `<tr style="border-bottom:1px solid #f0f0f0;${i % 2 === 0 ? "background:#fafffe" : ""}">
      <td style="padding:10px 12px;color:#64748b;font-size:13px">${i + 1}</td>
      <td style="padding:10px 12px;font-size:13px;color:#1e293b">${item.productName}${note}</td>
      <td style="padding:10px 12px;text-align:center;font-size:13px">${item.qty}.00</td>
      <td style="padding:10px 12px;text-align:right;font-size:13px">${fmt(unitPrice(item))}.00</td>
      <td style="padding:10px 12px;text-align:right;font-size:13px;font-weight:600">${fmt(lt)}.00</td>
    </tr>`;
  }).join("");

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/>
<title>Invoice ${invoiceNumber}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI',Arial,sans-serif;color:#1e293b;background:#fff}
@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}.no-print{display:none!important}}
.container{max-width:800px;margin:0 auto}
.header{background:linear-gradient(135deg,#0b1220 0%,#1a2744 60%,#0d3d3d 100%);padding:36px 40px 28px;display:flex;align-items:flex-start;justify-content:space-between}
.logo-z{width:56px;height:56px;background:linear-gradient(135deg,#2BB9B4,#E8522A);border-radius:12px;display:flex;align-items:center;justify-content:center;margin-bottom:10px}
.logo-z span{color:#fff;font-size:26px;font-weight:900;font-style:italic}
.logo-name{color:#fff;font-size:24px;font-weight:800;letter-spacing:2px}
.logo-sub{color:rgba(255,255,255,.5);font-size:11px;letter-spacing:1px;margin-top:2px}
.inv-title{color:#2BB9B4;font-size:32px;font-weight:800;letter-spacing:3px;text-transform:uppercase;text-align:right}
.inv-num{color:#fff;font-size:15px;font-weight:700;margin-top:4px;font-family:monospace;text-align:right}
.balance-box{background:rgba(43,185,180,.15);border:1px solid rgba(43,185,180,.4);border-radius:10px;padding:10px 18px;margin-top:12px;text-align:right}
.balance-label{color:rgba(255,255,255,.6);font-size:10px;letter-spacing:1px;text-transform:uppercase}
.balance-amount{color:#2BB9B4;font-size:22px;font-weight:800;margin-top:2px}
.info-band{background:#f8faff;border-bottom:3px solid #2BB9B4;padding:20px 40px;display:flex;gap:40px}
.info-col{flex:1}
.info-label{font-size:10px;font-weight:700;color:#94a3b8;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:6px}
.info-value{font-size:13px;color:#334155;line-height:1.7}
.company-name{font-weight:700;color:#1e293b;font-size:14px}
.bill-to{padding:20px 40px;border-bottom:1px solid #f1f5f9}
.bill-label{font-size:10px;font-weight:700;color:#94a3b8;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:8px}
.bill-name{font-size:16px;font-weight:800;color:#1e293b}
.bill-detail{font-size:12.5px;color:#64748b;line-height:1.8}
table{width:100%;border-collapse:collapse}
thead tr{background:linear-gradient(90deg,#2BB9B4,#0d9488)}
thead th{color:#fff;font-size:11px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;padding:12px;text-align:left}
thead th:nth-child(3),thead th:nth-child(4),thead th:nth-child(5){text-align:right}
.totals{padding:20px 40px;background:#f8faff;border-top:2px solid #e2e8f0}
.tr{display:flex;justify-content:flex-end;gap:60px;padding:5px 0;font-size:13px;color:#64748b}
.tr span:last-child{min-width:140px;text-align:right;font-weight:600;color:#334155}
.tr-grand{display:flex;justify-content:flex-end;gap:60px;padding:12px 16px;background:linear-gradient(135deg,#2BB9B4,#0d9488);border-radius:10px;margin-top:10px}
.tr-grand span{color:#fff;font-size:14px;font-weight:700}
.tr-grand span:last-child{min-width:140px;text-align:right;font-size:16px;font-weight:800}
.tr-bal{display:flex;justify-content:flex-end;gap:60px;padding:12px 16px;background:linear-gradient(135deg,#E8522A,#c2410c);border-radius:10px;margin-top:8px}
.tr-bal span{color:#fff;font-size:14px;font-weight:700}
.tr-bal span:last-child{min-width:140px;text-align:right;font-size:16px;font-weight:800}
.notes{padding:20px 40px;border-top:1px solid #f1f5f9}
.stitle{font-size:11px;font-weight:700;color:#94a3b8;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:8px}
.terms{padding:20px 40px;background:#fff8f6;border-top:3px solid #E8522A}
.term-item{font-size:12px;color:#64748b;padding:3px 0 3px 14px;position:relative}
.term-item::before{content:"•";position:absolute;left:0;color:#E8522A;font-weight:700}
.bank{padding:16px 40px 24px;background:#f8faff;border-top:1px solid #e2e8f0}
.bank-row{font-size:12px;color:#64748b;padding:2px 0}
.bank-key{font-weight:600;color:#334155}
.footer{background:#0b1220;padding:14px 40px;display:flex;align-items:center;justify-content:space-between}
.ft{color:rgba(255,255,255,.4);font-size:11px}
.fb{color:#2BB9B4;font-size:13px;font-weight:800;letter-spacing:2px}
.print-btn{display:block;text-align:center;padding:14px;background:#2BB9B4;color:#fff;font-size:14px;font-weight:700;border:none;cursor:pointer;width:100%;letter-spacing:1px}
</style></head><body>
<div class="container">
<button class="print-btn no-print" onclick="window.print()">⬇ Download / Print Invoice PDF</button>
<div class="header">
  <div><div class="logo-z"><span>Z</span></div><div class="logo-name">TENZY</div><div class="logo-sub">BEAUTY &amp; SKINCARE</div></div>
  <div><div class="inv-title">INVOICE</div><div class="inv-num">${invoiceNumber}</div>
    <div class="balance-box"><div class="balance-label">Balance Due</div><div class="balance-amount">${fmtRs(total)}</div></div>
  </div>
</div>
<div class="info-band">
  <div class="info-col">
    <div class="info-label">From</div>
    <div class="company-name">${COMPANY.name}</div>
    <div class="info-value">${COMPANY.address}<br/>${COMPANY.city}<br/>${COMPANY.phone}<br/>${COMPANY.email}</div>
  </div>
  <div class="info-col" style="border-left:2px solid #e2e8f0;padding-left:40px">
    <div class="info-label">Invoice Details</div>
    <div class="info-value"><strong>Invoice Date :</strong> ${date}<br/><strong>Terms :</strong> Due on Receipt<br/><strong>Due Date :</strong> ${dueDate}</div>
  </div>
</div>
<div class="bill-to">
  <div class="bill-label">Bill To</div>
  <div class="bill-name">${customer.name}</div>
  <div class="bill-detail">
    ${customer.address ? customer.address + "<br/>" : ""}
    ${customer.city ? customer.city + "<br/>" : ""}
    ${customer.country || "Sri Lanka"}
    ${customer.whatsapp ? "<br/>WhatsApp: " + customer.whatsapp : ""}
    ${customer.email && !customer.email.includes("@tenzy.customer") ? "<br/>" + customer.email : ""}
  </div>
</div>
<table>
  <thead><tr>
    <th style="width:40px">#</th>
    <th>Item &amp; Description</th>
    <th style="width:70px;text-align:center">Qty</th>
    <th style="width:120px;text-align:right">Rate</th>
    <th style="width:130px;text-align:right">Amount</th>
  </tr></thead>
  <tbody>${rows}</tbody>
</table>
<div class="totals">
  <div class="tr"><span>Sub Total</span><span>${fmtRs(subtotal)}</span></div>
  ${shipping > 0 ? `<div class="tr"><span>Shipping</span><span>${fmtRs(shipping)}</span></div>` : ""}
  <div class="tr-grand"><span>Total</span><span>${fmtRs(total)}</span></div>
  <div class="tr-bal"><span>Balance Due</span><span>${fmtRs(total)}</span></div>
</div>
${notes ? `<div class="notes"><div class="stitle">Notes</div><p style="font-size:13px;color:#334155">${notes}</p></div>` : ""}
<div class="terms">
  <div class="stitle">Terms &amp; Conditions</div>
  ${TERMS.map((t) => `<div class="term-item">${t}</div>`).join("")}
</div>
<div class="bank">
  <div class="stitle">Bank Details</div>
  <div class="bank-row"><span class="bank-key">Account Name:</span> ${BANK.name}</div>
  <div class="bank-row"><span class="bank-key">Bank Name:</span> ${BANK.bank}</div>
  <div class="bank-row"><span class="bank-key">Account Number:</span> ${BANK.account}</div>
  <div class="bank-row" style="margin-top:8px;color:#94a3b8;font-size:11px">Please use the invoice number or your name as the payment reference.</div>
</div>
<div class="footer">
  <div class="ft">POWERED BY</div><div class="fb">TENZY</div><div class="ft">Page 1</div>
</div>
</div></body></html>`;
}

/* ── Main component ───────────────────────────────────────────────────────── */
export default function CreateInvoiceModal({ open, onClose }) {
  // Invoice number comes from backend
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [date,     setDate]     = useState(todayStr);
  const [dueDate,  setDueDate]  = useState(todayStr);

  // Customer
  const [customer, setCustomer] = useState({
    whatsapp: "", name: "", email: "", address: "", city: "", country: "Sri Lanka",
  });
  const [existingCustomerId, setExistingCustomerId] = useState(null);
  const [customerLoading,    setCustomerLoading]    = useState(false);
  const [customerStatus,     setCustomerStatus]     = useState(null); // null | "found" | "new"

  // Products
  const [allProducts,    setAllProducts]    = useState([]);
  const [prodLoading,    setProdLoading]    = useState(false);
  const [productSearch,  setProductSearch]  = useState("");
  const [showPicker,     setShowPicker]     = useState(false);
  const [items,          setItems]          = useState([]);
  const [variantPicker,  setVariantPicker]  = useState(null); // { product, variants } | null
  const [variantLoading, setVariantLoading] = useState(false);

  // Totals
  const [shippingCost, setShippingCost] = useState("0");
  const [notes,        setNotes]        = useState("Thank you");

  // Order statuses from reference data
  const [orderStatuses,   setOrderStatuses]   = useState([]);
  const [selectedStatus,  setSelectedStatus]  = useState(null); // statusId

  // Save state
  const [saving,      setSaving]      = useState(false);
  const [savedResult, setSavedResult] = useState(null); // { invoiceId, invoiceNumber, credentials? }

  // Generated credentials to show admin
  const [generatedCreds, setGeneratedCreds] = useState(null); // { email, password, displayName }
  const [showPassword,   setShowPassword]   = useState(false);

  // Fetch next invoice number + products on open
  useEffect(() => {
    if (!open) return;
    setSavedResult(null);
    setGeneratedCreds(null);
    setItems([]);
    setCustomer({ whatsapp: "", name: "", email: "", address: "", city: "", country: "Sri Lanka" });
    setCustomerStatus(null);
    setExistingCustomerId(null);

    setSelectedStatus(null);

    invoicesApi.getNextNumber()
      .then((data) => setInvoiceNumber(data?.invoiceNumber ?? data?.InvoiceNumber ?? "INV-000124"))
      .catch(() => setInvoiceNumber(`INV-${String(Date.now()).slice(-6)}`));

    orderStatusApi.getAll()
      .then((d) => {
        const list = Array.isArray(d) ? d : [];
        setOrderStatuses(list);
        // Pre-select first status (e.g. "Order Created")
        if (list.length > 0) setSelectedStatus(list[0]?.statusId ?? list[0]?.StatusId ?? null);
      })
      .catch(() => setOrderStatuses([]));

    setProdLoading(true);
    productsApi.getAllAdmin()
      .then((d) => setAllProducts(Array.isArray(d) ? d : []))
      .catch(console.error)
      .finally(() => setProdLoading(false));
  }, [open]);

  // Customer lookup by WhatsApp
  const lookupCustomer = useCallback(async (phone) => {
    const clean = phone.replace(/\D/g, "");
    if (clean.length < 7) return;
    setCustomerLoading(true);
    setCustomerStatus(null);
    setExistingCustomerId(null);
    try {
      const data = await customersApi.getAll(1, phone);
      const list = Array.isArray(data) ? data
        : (data?.items ?? data?.customers ?? data?.data ?? data?.users ?? []);
      const match = list.find((c) => {
        const p = (c.phone ?? c.Phone ?? c.phoneNumber ?? c.PhoneNumber ?? "").replace(/\D/g, "");
        return p && p === clean;
      });
      if (match) {
        setCustomer((prev) => ({
          ...prev,
          name:    match.displayName ?? match.name ?? prev.name,
          email:   match.email ?? match.Email ?? prev.email,
          address: match.address ?? match.shippingAddress ?? prev.address,
          city:    match.city ?? match.shippingCity ?? prev.city,
        }));
        setExistingCustomerId(match.userId ?? match.id ?? match.UserId ?? null);
        setCustomerStatus("found");
      } else {
        setCustomerStatus("new");
      }
    } catch { setCustomerStatus("new"); }
    finally { setCustomerLoading(false); }
  }, []);

  // Units of each variant (or product) already reserved in this order
  const reservedMap = useMemo(() => {
    const map = {};
    items.forEach((item) => {
      const key = item.variantId ? `v:${item.variantId}` : `p:${item.productId}`;
      map[key] = (map[key] || 0) + item.qty;
    });
    return map;
  }, [items]);

  const filteredProducts = useMemo(() => {
    const q = productSearch.toLowerCase().trim();
    return allProducts
      .filter((p) => {
        const pid   = p.productId ?? p.productid;
        const total = parseInt(p.stockQuantity ?? p.StockQuantity ?? p.stock ?? 0, 10) || 0;
        const avail = total - (reservedMap[`p:${pid}`] || 0);
        if (avail <= 0) return false;
        if (q) return (p.name ?? "").toLowerCase().includes(q);
        return true;
      })
      .slice(0, 25);
  }, [allProducts, productSearch, reservedMap]);

  // Called when admin clicks a variant in the variant sub-picker
  const addVariant = (product, variant) => {
    const vid    = variant.VariantId ?? variant.variantId;
    const stock  = Number(variant.Stock ?? variant.stock ?? 0);
    const avail  = Math.max(0, stock - (reservedMap[`v:${vid}`] || 0));
    setItems((prev) => [...prev, mkItem(product, Math.max(1, avail), variant)]);
    setVariantPicker(null);
    setShowPicker(false);
    setProductSearch("");
  };

  // Called when admin clicks a product — load variants then decide
  const pickProduct = async (product) => {
    setVariantLoading(true);
    try {
      const pid      = product.productId ?? product.productid;
      const variants = await productVariantsApi.getAll(pid);
      const active   = (Array.isArray(variants) ? variants : [])
        .filter((v) => v.IsActive !== false && v.isActive !== false);
      if (active.length === 1) {
        addVariant(product, active[0]);
      } else if (active.length > 1) {
        setVariantPicker({ product, variants: active });
      } else {
        // No variants — fall back to product-level (old behaviour)
        const total = Math.max(0, parseInt(product.stockQuantity ?? product.StockQuantity ?? product.stock ?? 0, 10) || 0);
        const avail = Math.max(1, total - (reservedMap[`p:${pid}`] || 0));
        setItems((prev) => [...prev, mkItem(product, avail)]);
        setShowPicker(false);
        setProductSearch("");
      }
    } catch {
      // On error fall back to product-level add
      const pid   = product.productId ?? product.productid;
      const total = Math.max(0, parseInt(product.stockQuantity ?? product.StockQuantity ?? product.stock ?? 0, 10) || 0);
      const avail = Math.max(1, total - (reservedMap[`p:${pid}`] || 0));
      setItems((prev) => [...prev, mkItem(product, avail)]);
      setShowPicker(false);
      setProductSearch("");
    } finally {
      setVariantLoading(false);
    }
  };
  const updateItem = (id, ch) => setItems((p) => p.map((i) => i.id === id ? { ...i, ...ch } : i));
  const removeItem = (id) => setItems((p) => p.filter((i) => i.id !== id));

  const subtotal     = useMemo(() => items.reduce((s, i) => s + lineTotal(i), 0), [items]);
  const shipping     = Math.round(Number(shippingCost) || 0);
  const total        = subtotal + shipping;
  const hasOverStock = items.some(exceedsStock);

  // Save invoice — optionally auto-register customer
  const handleSave = async () => {
    if (!customer.whatsapp.trim()) { alert("WhatsApp number is required."); return; }
    if (!customer.name.trim())     { alert("Customer name is required."); return; }
    if (items.length === 0)        { alert("Add at least one product."); return; }
    if (hasOverStock) {
      const overItems = items.filter(exceedsStock).map((i) => `${i.productName} (max ${i.stock})`).join(", ");
      alert(`Stock limit exceeded for: ${overItems}`);
      return;
    }
    setSaving(true);
    try {
      let customerId   = existingCustomerId;
      let credentials  = null;

      // Auto-register if this is a new customer
      if (customerStatus === "new") {
        const email    = customer.email?.trim() || genEmailFromPhone(customer.whatsapp);
        const password = genPassword();
        try {
          await authApi.register(email, password, customer.name.trim());
          credentials = { email, password, displayName: customer.name.trim() };
          // Try to get the new user's ID by looking them up
          try {
            const fresh = await customersApi.getAll(1, email);
            const freshList = Array.isArray(fresh) ? fresh
              : (fresh?.items ?? fresh?.customers ?? fresh?.data ?? fresh?.users ?? []);
            const match = freshList.find((c) => (c.email ?? c.Email ?? "") === email);
            if (match) customerId = match.userId ?? match.id ?? match.UserId;
          } catch { /* ignore */ }
        } catch (regErr) {
          // Registration might fail if email already exists — not fatal
          console.warn("Auto-register skipped:", regErr.message);
        }
      }

      // Build items payload — variantId lets the backend reduce the correct variant's stock
      const itemsPayload = items.map((item) => ({
        variantId:      item.variantId ?? null,
        productId:      item.productId,
        productName:    item.variantName ? `${item.productName} — ${item.variantName}` : item.productName,
        priceType:      item.priceType,
        unitPrice:      unitPrice(item),
        qty:            item.qty,
        discountType:   item.discountType,
        discountValue:  Number(item.discountValue) || 0,
        discountAmount: rawDiscount(item),
        lineTotal:      lineTotal(item),
      }));

      const res = await invoicesApi.create({
        invoiceNumber,
        invoiceDate:     date,
        dueDate,
        customerId:      customerId ? String(customerId) : null,
        customerName:    customer.name.trim(),
        customerPhone:   customer.whatsapp.trim(),
        customerEmail:   customer.email?.trim() || null,
        customerAddress: customer.address?.trim() || null,
        customerCity:    customer.city?.trim() || null,
        customerCountry: customer.country || "Sri Lanka",
        subTotal:        subtotal,
        shippingCost:    shipping,
        total,
        notes:           notes || null,
        statusId:        selectedStatus ?? null,
        items:           itemsPayload,
      });

      setSavedResult({ invoiceId: res?.invoiceId, invoiceNumber });
      if (credentials) setGeneratedCreds(credentials);
    } catch (err) {
      alert(err.message || "Failed to save invoice.");
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = () => {
    const html = buildInvoiceHtml({ invoiceNumber, date, dueDate, customer, items, shipping, notes, subtotal, total });
    const win = window.open("", "_blank");
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.focus(), 300);
  };

  const copyToClipboard = (text) => navigator.clipboard?.writeText(text).catch(() => {});

  if (!open) return null;

  const inputCls = "w-full text-sm px-3 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-tenzy-teal/30 focus:border-tenzy-teal transition bg-white";
  const labelCls = "block text-xs font-semibold text-slate-500 mb-1";

  /* ── Success screen ── */
  if (savedResult) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/55" />
        <div className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl p-8 space-y-5">
          {/* Success header */}
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={32} className="text-emerald-500" />
            </div>
            <p className="text-xl font-bold text-slate-900">Invoice Saved!</p>
            <p className="text-sm text-slate-500 mt-1 font-mono font-semibold text-tenzy-teal">{savedResult.invoiceNumber}</p>
          </div>

          {/* New customer credentials */}
          {generatedCreds && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 space-y-3">
              <p className="text-xs font-bold text-amber-700 uppercase tracking-wider">
                New Customer Account Created
              </p>
              <p className="text-xs text-amber-600">
                Share these credentials with the customer so they can log in to track their order.
              </p>
              {/* Username / Display name */}
              <div className="flex items-center justify-between gap-2 bg-white rounded-xl px-3 py-2 border border-amber-200">
                <div>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase">Name</p>
                  <p className="text-sm font-semibold text-slate-800">{generatedCreds.displayName}</p>
                </div>
              </div>
              {/* Email */}
              <div className="flex items-center justify-between gap-2 bg-white rounded-xl px-3 py-2 border border-amber-200">
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase">Login Email</p>
                  <p className="text-sm font-mono text-slate-800 truncate">{generatedCreds.email}</p>
                </div>
                <button onClick={() => copyToClipboard(generatedCreds.email)}
                  className="p-1.5 rounded-lg hover:bg-amber-100 text-amber-600 shrink-0">
                  <Copy size={13} />
                </button>
              </div>
              {/* Password */}
              <div className="flex items-center justify-between gap-2 bg-white rounded-xl px-3 py-2 border border-amber-200">
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase">Generated Password</p>
                  <p className="text-sm font-mono text-slate-800">{showPassword ? generatedCreds.password : "•".repeat(generatedCreds.password.length)}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => setShowPassword((p) => !p)}
                    className="p-1.5 rounded-lg hover:bg-amber-100 text-amber-600">
                    {showPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                  <button onClick={() => copyToClipboard(generatedCreds.password)}
                    className="p-1.5 rounded-lg hover:bg-amber-100 text-amber-600">
                    <Copy size={13} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition">
              Close
            </button>
            <button onClick={handleDownload}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-tenzy-teal text-white text-sm font-bold hover:opacity-90 transition">
              <Download size={15} /> Download PDF
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ── Creation form ── */
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3">
      <div className="absolute inset-0 bg-black/55" onClick={onClose} />
      <div className="relative bg-white w-full max-w-3xl rounded-3xl shadow-2xl flex flex-col max-h-[95vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <div>
            <p className="font-bold text-slate-900 text-lg">Create Order</p>
            <p className="text-xs font-mono font-bold text-tenzy-teal">
              {invoiceNumber || <span className="opacity-40">Loading…</span>}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Invoice Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Due Date</label>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputCls} />
            </div>
          </div>

          {/* Customer */}
          <div className="rounded-2xl border border-slate-200 p-4 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <p className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <User size={13} /> Customer Details
              </p>
              {customerStatus === "found" && (
                <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                  ✓ Found in system — auto-filled
                </span>
              )}
              {customerStatus === "new" && (
                <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                  ✦ New customer — account will be created on save
                </span>
              )}
            </div>

            {/* WhatsApp — primary key, numbers only */}
            <div className="relative">
              <Phone size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="tel"
                inputMode="numeric"
                value={customer.whatsapp}
                onChange={(e) => {
                  const digits = e.target.value.replace(/[^\d+\-\s]/g, "");
                  setCustomer({ ...customer, whatsapp: digits });
                  setCustomerStatus(null);
                  setExistingCustomerId(null);
                }}
                onBlur={(e) => lookupCustomer(e.target.value)}
                placeholder="WhatsApp number * e.g. 0771234567"
                className="w-full pl-8 pr-10 text-sm py-2.5 rounded-xl border border-tenzy-orange/60 outline-none focus:ring-2 focus:ring-tenzy-orange/20 focus:border-tenzy-orange transition"
              />
              {customerLoading && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-tenzy-teal/30 border-t-tenzy-teal animate-spin" />
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="relative">
                <User size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input value={customer.name}  onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                  placeholder="Full name *" className={`${inputCls} pl-8`} />
              </div>
              <div className="relative">
                <Mail size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input value={customer.email} onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
                  placeholder="Email (optional — auto-generated if blank)" className={`${inputCls} pl-8`} />
              </div>
              <div className="relative col-span-2">
                <MapPin size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input value={customer.address} onChange={(e) => setCustomer({ ...customer, address: e.target.value })}
                  placeholder="Street address" className={`${inputCls} pl-8`} />
              </div>
              <input value={customer.city}    onChange={(e) => setCustomer({ ...customer, city: e.target.value })}
                placeholder="City" className={inputCls} />
              <input value={customer.country} onChange={(e) => setCustomer({ ...customer, country: e.target.value })}
                placeholder="Country" className={inputCls} />
            </div>
          </div>

          {/* Products */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Package size={13} /> Products
              </p>
              <button onClick={() => setShowPicker((p) => !p)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-tenzy-teal text-white text-xs font-bold rounded-xl hover:opacity-90 transition">
                <Plus size={12} /> Add Product
              </button>
            </div>

            {/* Product / Variant picker */}
            {showPicker && (
              <div className="border border-tenzy-teal/30 rounded-2xl overflow-hidden shadow-md">

                {/* Variant sub-picker — shown after a product is clicked */}
                {variantPicker ? (
                  <>
                    <div className="flex items-center gap-2 px-3 py-2.5 border-b border-slate-100 bg-slate-50">
                      <button onClick={() => setVariantPicker(null)}
                        className="text-xs text-tenzy-teal font-semibold hover:underline">← Back</button>
                      <p className="text-xs font-semibold text-slate-700 truncate">{variantPicker.product.name}</p>
                    </div>
                    <div className="max-h-52 overflow-y-auto divide-y divide-slate-50">
                      {variantPicker.variants.map((v) => {
                        const vid   = v.VariantId ?? v.variantId;
                        const stock = Number(v.Stock ?? v.stock ?? 0);
                        const avail = Math.max(0, stock - (reservedMap[`v:${vid}`] || 0));
                        const sp    = Number(v.SellingPrice ?? v.sellingPrice ?? 0);
                        const ws    = Number(v.WholesalePrice ?? v.wholesalePrice ?? 0);
                        return (
                          <button key={vid} type="button"
                            onClick={() => addVariant(variantPicker.product, v)}
                            disabled={avail <= 0}
                            className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-tenzy-teal/5 transition disabled:opacity-40 disabled:cursor-not-allowed">
                            <div className="min-w-0 flex-1 mr-3">
                              <p className="text-sm font-semibold text-slate-800">
                                {v.VariantName ?? v.variantName}
                                {(v.Volume ?? v.volume) ? <span className="ml-1.5 text-[10px] font-bold bg-tenzy-teal text-white px-1.5 py-0.5 rounded-full">{v.Volume ?? v.volume}</span> : null}
                              </p>
                              <p className="text-[10px] text-slate-400">
                                Website: LKR {fmt(sp)}{ws > 0 ? ` · Wholesale: LKR ${fmt(ws)}` : ""}
                              </p>
                            </div>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${avail <= 0 ? "bg-red-100 text-red-600" : avail <= 5 ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
                              {avail <= 0 ? "out of stock" : `${avail} avail`}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    <div className="p-2 border-t border-slate-100 bg-slate-50 text-center">
                      <button onClick={() => { setVariantPicker(null); setShowPicker(false); }} className="text-xs text-slate-500 hover:text-slate-700">Close</button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="p-3 border-b border-slate-100 bg-slate-50">
                      <div className="relative">
                        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input autoFocus value={productSearch} onChange={(e) => setProductSearch(e.target.value)}
                          placeholder="Search products…"
                          className="w-full pl-8 pr-3 py-2 text-sm rounded-xl border border-slate-200 outline-none focus:border-tenzy-teal" />
                      </div>
                    </div>
                    <div className="max-h-52 overflow-y-auto divide-y divide-slate-50">
                      {(prodLoading || variantLoading) && <p className="text-xs text-slate-400 text-center py-6">Loading…</p>}
                      {!prodLoading && !variantLoading && filteredProducts.map((p) => {
                        const pid   = p.productId ?? p.productid;
                        const total = Math.max(0, parseInt(p.stockQuantity ?? p.StockQuantity ?? p.stock ?? 0, 10) || 0);
                        const avail = Math.max(0, total - (reservedMap[`p:${pid}`] || 0));
                        return (
                          <button key={pid} type="button"
                            onClick={() => pickProduct(p)}
                            className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-tenzy-teal/5 transition">
                            <div className="min-w-0 flex-1 mr-3">
                              <p className="text-sm font-semibold text-slate-800 truncate">{p.name}</p>
                              <p className="text-[10px] text-slate-400">
                                Website: LKR {fmt(p.sellingPrice ?? 0)}
                                {(p.wholesalePrice ?? 0) > 0 ? ` · Wholesale: LKR ${fmt(p.wholesalePrice)}` : ""}
                              </p>
                            </div>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${avail <= 5 ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
                              {avail} available
                            </span>
                          </button>
                        );
                      })}
                      {!prodLoading && !variantLoading && filteredProducts.length === 0 && (
                        <p className="text-xs text-slate-400 text-center py-6">
                          {productSearch ? "No matching products with stock available." : "No products in stock."}
                        </p>
                      )}
                    </div>
                    <div className="p-2 border-t border-slate-100 bg-slate-50 text-center">
                      <button onClick={() => setShowPicker(false)} className="text-xs text-slate-500 hover:text-slate-700">Close</button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Line items */}
            {items.map((item, idx) => {
              const up   = unitPrice(item);
              const lt   = lineTotal(item);
              const bc   = belowCost(item);
              const over = exceedsStock(item);

              // Distinct accent per product slot (cycles through 8 palettes)
              const ACCENTS = [
                { border: "#2BB9B4", bg: "rgba(43,185,180,0.06)",  badge: "#2BB9B4",  text: "#fff" },
                { border: "#E8522A", bg: "rgba(232,82,42,0.06)",   badge: "#E8522A",  text: "#fff" },
                { border: "#6366f1", bg: "rgba(99,102,241,0.06)",  badge: "#6366f1",  text: "#fff" },
                { border: "#f59e0b", bg: "rgba(245,158,11,0.06)",  badge: "#f59e0b",  text: "#fff" },
                { border: "#10b981", bg: "rgba(16,185,129,0.06)",  badge: "#10b981",  text: "#fff" },
                { border: "#ec4899", bg: "rgba(236,72,153,0.06)",  badge: "#ec4899",  text: "#fff" },
                { border: "#8b5cf6", bg: "rgba(139,92,246,0.06)",  badge: "#8b5cf6",  text: "#fff" },
                { border: "#14b8a6", bg: "rgba(20,184,166,0.06)",  badge: "#14b8a6",  text: "#fff" },
              ];
              const accent = over
                ? { border: "#ef4444", bg: "rgba(239,68,68,0.06)",   badge: "#ef4444", text: "#fff" }
                : bc
                ? { border: "#f59e0b", bg: "rgba(245,158,11,0.06)",  badge: "#f59e0b", text: "#fff" }
                : ACCENTS[idx % ACCENTS.length];

              return (
                <div key={item.id}
                  style={{ borderColor: accent.border, background: accent.bg }}
                  className="rounded-xl border-2 p-3 space-y-2.5 overflow-hidden relative">

                  {/* Coloured left accent strip */}
                  <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl"
                    style={{ background: accent.border }} />

                  <div className="flex items-start justify-between gap-2 pl-2">
                    {/* Numbered badge + product name */}
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="w-5 h-5 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold text-white"
                        style={{ background: accent.badge }}>
                        {idx + 1}
                      </span>
                      <p className="text-sm font-semibold text-slate-800 leading-snug truncate">
                        {item.variantName || item.productName}
                        {item.variantName && <span className="ml-1.5 text-[10px] font-normal text-slate-400">{item.productName}</span>}
                      </p>
                    </div>
                    <button onClick={() => removeItem(item.id)} className="p-0.5 text-slate-300 hover:text-red-500 shrink-0">
                      <Trash2 size={13} />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pl-2">
                    <div>
                      <p className="text-[10px] font-semibold text-slate-400 mb-0.5 uppercase">Price</p>
                      <select value={item.priceType} onChange={(e) => updateItem(item.id, { priceType: e.target.value })}
                        className="w-full text-xs px-2 py-1.5 rounded-lg border border-slate-200 outline-none bg-white">
                        <option value="website">Website{item.websitePrice > 0 ? ` (${fmt(item.websitePrice)})` : ""}</option>
                        {item.wholesalePrice > 0 && <option value="wholesale">Wholesale ({fmt(item.wholesalePrice)})</option>}
                      </select>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-slate-400 mb-0.5 uppercase">Qty</p>
                      <input type="number" min="1" max={item.stock > 0 ? item.stock : undefined}
                        value={item.qty}
                        onChange={(e) => {
                          const val = Math.max(1, parseInt(e.target.value) || 1);
                          updateItem(item.id, { qty: item.stock > 0 ? Math.min(val, item.stock) : val });
                        }}
                        className={`w-full text-xs px-2 py-1.5 rounded-lg border outline-none text-center ${over ? "border-red-400 bg-red-50" : "border-slate-200 focus:border-tenzy-teal"}`} />
                      {item.stock > 0 && (
                        <p className={`text-[10px] mt-0.5 text-center ${over ? "text-red-600 font-semibold" : "text-slate-400"}`}>
                          max {item.stock}
                        </p>
                      )}
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-slate-400 mb-0.5 uppercase">Discount</p>
                      <select value={item.discountType}
                        onChange={(e) => updateItem(item.id, { discountType: e.target.value, discountValue: "" })}
                        className="w-full text-xs px-2 py-1.5 rounded-lg border border-slate-200 outline-none bg-white">
                        <option value="none">None</option>
                        <option value="percent">% off</option>
                        <option value="amount">LKR off</option>
                      </select>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-slate-400 mb-0.5 uppercase">
                        {item.discountType === "percent" ? "%" : item.discountType === "amount" ? "LKR" : "—"}
                      </p>
                      <input type="number" min="0" value={item.discountValue}
                        disabled={item.discountType === "none"}
                        onChange={(e) => updateItem(item.id, { discountValue: e.target.value })}
                        placeholder="0"
                        className="w-full text-xs px-2 py-1.5 rounded-lg border border-slate-200 outline-none disabled:opacity-40 disabled:bg-slate-50" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <p className="text-[10px] text-slate-400">
                      LKR {fmt(up)} × {item.qty}
                      {rawDiscount(item) > 0 && <span className="text-red-500"> − LKR {fmt(rawDiscount(item))}</span>}
                      {bc && <span className="text-amber-600"> · floored at LKR {fmt(item.arrivalCost * item.qty)}</span>}
                    </p>
                    <p className="text-sm font-bold text-slate-800">LKR {fmt(lt)}</p>
                  </div>
                  {over && (
                    <p className="text-[10px] text-red-700 flex items-center gap-1 bg-red-100 rounded-lg px-2.5 py-1.5 font-semibold">
                      <AlertCircle size={11} />
                      Exceeds available stock — only {item.stock} unit{item.stock !== 1 ? "s" : ""} in stock
                    </p>
                  )}
                  {bc && !over && (
                    <p className="text-[10px] text-amber-700 flex items-center gap-1 bg-amber-100 rounded-lg px-2.5 py-1.5">
                      <AlertCircle size={11} />
                      Discount capped — price cannot go below arrival cost (LKR {fmt(item.arrivalCost)}/unit)
                    </p>
                  )}
                </div>
              );
            })}

            {items.length === 0 && !showPicker && (
              <div className="border-2 border-dashed border-slate-200 rounded-2xl py-10 text-center">
                <Package size={24} className="mx-auto text-slate-300 mb-2" />
                <p className="text-xs text-slate-400">No products added. Click "Add Product" to start.</p>
              </div>
            )}
          </div>

          {/* Shipping + Totals */}
          <div className="rounded-2xl border border-slate-200 p-4 space-y-4">
            <div>
              <label className={labelCls}>Shipping Cost (LKR)</label>
              <input type="number" min="0" value={shippingCost} onChange={(e) => setShippingCost(e.target.value)}
                placeholder="0" className={`${inputCls} w-48`} />
            </div>
            <div className="border-t border-slate-100 pt-3 space-y-1.5">
              <div className="flex justify-between text-sm text-slate-600">
                <span>Sub Total</span><span className="font-semibold">LKR {fmt(subtotal)}</span>
              </div>
              {shipping > 0 && (
                <div className="flex justify-between text-sm text-slate-600">
                  <span>Shipping</span><span className="font-semibold">LKR {fmt(shipping)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold text-slate-900 pt-2 border-t border-slate-200">
                <span>Total</span><span className="text-tenzy-teal">LKR {fmt(total)}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className={labelCls}>Notes</label>
            <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)}
              className="w-full text-sm px-3 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-tenzy-teal/30 focus:border-tenzy-teal transition resize-none" />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex gap-3 shrink-0 rounded-b-3xl">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || items.length === 0 || !customer.whatsapp.trim() || !customer.name.trim() || hasOverStock}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-tenzy-teal text-white text-sm font-bold hover:opacity-90 transition disabled:opacity-50"
          >
            {saving
              ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving…</>
              : <><Download size={15} /> Save Order &amp; Download Invoice</>}
          </button>
        </div>
      </div>
    </div>
  );
}
