const baseUrl = process.env.TENZY_API_BASE_URL || "https://www.tenzyapitest.dotnetcloud.co.uk";
const email = process.env.TENZY_ADMIN_EMAIL;
const password = process.env.TENZY_ADMIN_PASSWORD;

if (!email || !password) {
  console.error("TENZY_ADMIN_EMAIL and TENZY_ADMIN_PASSWORD are required.");
  process.exit(1);
}

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, options);
  const raw = await response.text();
  const json = raw ? JSON.parse(raw) : null;
  if (!response.ok || json?.result === false) {
    throw new Error(`${response.status} ${response.statusText}: ${json?.message || raw}`);
  }
  return json?.response ?? json;
}

const login = await request("/api/userlogin/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email, password }),
});

const token = login?.accessToken ?? login?.token;
if (!token) throw new Error("No bearer token returned from login.");

const authHeaders = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${token}`,
};

const procurement = await request("/api/admin/supply-chain/procurements", {
  method: "POST",
  headers: authHeaders,
  body: JSON.stringify({
    shopName: "Boots",
    purchaseDate: "2026-04-01T00:00:00",
    invoiceReference: `SMOKE-${Date.now()}`,
    purchaseNote: "Automated smoke test",
    items: [
      {
        productName: "Smoke Test Cleanser",
        brandName: "CeraVe",
        categoryName: "Cleanser",
        quantity: 3,
        unitPrice: 10,
        batchNote: "Smoke batch",
      },
    ],
    discounts: [
      {
        discountType: "buy_x_get_amount_off",
        discountScope: "brand",
        description: "Buy 3 get 5 off",
        targetBrandName: "CeraVe",
        buyQuantity: 3,
        fixedAmount: 5,
      },
    ],
  }),
});

const procurementDetail = await request(`/api/admin/supply-chain/procurements/${procurement.id}`, {
  headers: authHeaders,
});

const firstItem = procurementDetail.items?.[0];
if (!firstItem) throw new Error("Procurement item was not created.");

const shipment = await request("/api/admin/supply-chain/dispatches", {
  method: "POST",
  headers: authHeaders,
  body: JSON.stringify({
    dispatchDate: "2026-04-03T00:00:00",
    courierName: "DHL",
    parcelNumber: `PARCEL-${Date.now()}`,
    shipmentStatus: "dispatched",
    notes: "Smoke shipment",
    items: [{ procurementItemId: firstItem.procurementItemId, quantityDispatched: 3 }],
  }),
});

await request(`/api/admin/supply-chain/dispatches/${shipment.id}/charges`, {
  method: "POST",
  headers: authHeaders,
  body: JSON.stringify({
    chargeType: "uk_courier",
    currencyCode: "GBP",
    amount: 12.5,
    chargeDate: "2026-04-04T00:00:00",
    notes: "Smoke charge",
  }),
});

const shipmentDetail = await request(`/api/admin/supply-chain/dispatches/${shipment.id}`, { headers: authHeaders });
const shipmentItem = shipmentDetail.items?.[0];
if (!shipmentItem) throw new Error("Shipment item was not created.");

await request("/api/admin/supply-chain/arrivals", {
  method: "POST",
  headers: authHeaders,
  body: JSON.stringify({
    shipmentId: shipment.id,
    verificationDate: "2026-04-05T00:00:00",
    verificationStatus: "completed",
    notes: "Smoke arrival",
    items: [
      {
        shipmentItemId: shipmentItem.shipmentItemId,
        quantityReceived: 3,
        approvedQuantity: 3,
        missingQuantity: 0,
        extraQuantity: 0,
        damagedQuantity: 0,
        approvedForPricing: true,
        notes: "All good",
      },
    ],
  }),
});

const eligible = await request("/api/admin/supply-chain/pricing/eligible", { headers: authHeaders });
const eligibleItem = eligible.find((item) => item.productName === "Smoke Test Cleanser");
if (!eligibleItem) throw new Error("Approved arrival item was not exposed to pricing.");

await request("/api/admin/supply-chain/pricing", {
  method: "POST",
  headers: authHeaders,
  body: JSON.stringify({
    arrivalItemId: eligibleItem.arrivalItemId,
    sellingPrice: 18.99,
    customerDiscountPercent: 5,
    customerDiscountAmount: 0,
    pricingNotes: "Smoke pricing",
    isApproved: true,
  }),
});

await request("/api/admin/supply-chain/reports/procurement", { headers: authHeaders });
await request("/api/admin/supply-chain/reports/dispatch", { headers: authHeaders });
await request("/api/admin/supply-chain/reports/monthly-dispatch-summary", { headers: authHeaders });

console.log("Supply-chain smoke test completed successfully.");
