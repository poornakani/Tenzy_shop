const BASE_URL = import.meta.env.DEV
  ? "http://localhost:5225"
  : "https://www.tenzyapitest.dotnetcloud.co.uk";
const API_DEBUG = import.meta.env.DEV;

function getToken() {
  return localStorage.getItem("authToken");
}

function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function toQuery(params = {}) {
  const query = new URLSearchParams(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== "")
  ).toString();
  return query ? `?${query}` : "";
}

// Silently exchange the stored refresh token for a new access token.
// Returns true if a new access token was stored, false otherwise.
async function tryRefreshToken() {
  const refreshToken = localStorage.getItem("refreshToken");
  const authUserStr  = localStorage.getItem("authUser");
  if (!refreshToken || !authUserStr) return false;
  try {
    const userId = JSON.parse(authUserStr)?.id;
    if (!userId) return false;
    const res = await fetch(`${BASE_URL}/api/userlogin/refreshtoken`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ UserID: userId, RefreshTokenHash: refreshToken }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    const newToken = data?.response?.accessToken ?? data?.accessToken;
    if (!newToken) return false;
    localStorage.setItem("authToken", newToken);
    return true;
  } catch {
    return false;
  }
}

async function request(path, options = {}, _isRetry = false) {
  const method = options.method || "GET";
  const url = `${BASE_URL}${path}`;
  let res;
  try {
    if (API_DEBUG) {
      console.debug("[api:request]", {
        method,
        url,
        body: options.body || null,
      });
    }
    res = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(),
        ...(options.headers || {}),
      },
    });
  } catch (err) {
    if (API_DEBUG) {
      console.error("[api:network-error]", { method, url, error: err });
    }
    if (err instanceof Error && err.message) {
      const msg = err.message.toLowerCase();
      if (
        !msg.includes("failed to fetch") &&
        !msg.includes("load failed") &&
        !msg.includes("network")
      ) {
        throw err;
      }
    }
    throw new Error(
      "Unable to reach the server. Please check your connection.",
    );
  }

  // Token expired — try silent refresh first, then retry once.
  // If refresh also fails, clear auth and let AdminGuard redirect on next nav.
  if (res.status === 401 && !_isRetry) {
    const refreshed = await tryRefreshToken();
    if (refreshed) return request(path, options, true);
    localStorage.removeItem("authToken");
    localStorage.removeItem("authUser");
    localStorage.removeItem("adminAuth");
    localStorage.removeItem("refreshToken");
    throw new Error("Session expired. Please sign in again.");
  }
  if (res.status === 401) {
    localStorage.removeItem("authToken");
    localStorage.removeItem("authUser");
    localStorage.removeItem("adminAuth");
    localStorage.removeItem("refreshToken");
    throw new Error("Session expired. Please sign in again.");
  }

  if (!res.ok) {
    const raw = await res.text().catch(() => "");
    if (API_DEBUG) {
      console.debug("[api:response-error]", {
        method,
        url,
        status: res.status,
        raw,
      });
    }
    let err = {};
    if (raw) {
      try {
        err = JSON.parse(raw);
      } catch {
        err = {};
      }
    }

    // For ASP.NET Core ProblemDetails (model validation), prefer the field-level errors
    // over the generic title so the user sees exactly which field failed.
    const fieldErrors =
      err?.errors && typeof err.errors === "object" && !Array.isArray(err.errors)
        ? Object.values(err.errors).flat().join(", ")
        : "";

    const message =
      err?.message ||
      err?.Message ||
      fieldErrors ||
      (Array.isArray(err?.errors) ? err.errors.join(", ") : "") ||
      (typeof err?.errors === "string" ? err.errors : "") ||
      err?.title ||
      err?.error ||
      err?.detail ||
      err?.response?.message ||
      (raw && !raw.trim().startsWith("<") ? raw : "");
    const traceId = err?.traceId || err?.TraceId || err?.traceid;
    const errorCode = err?.errorCode || err?.ErrorCode;
    const fullMessage = [
      message || `Request failed (${res.status})`,
      errorCode ? `Code: ${errorCode}` : "",
      traceId ? `TraceId: ${traceId}` : "",
    ].filter(Boolean).join(" | ");

    throw new Error(fullMessage);
  }

  if (res.status === 204) {
    return null;
  }

  const raw = await res.text().catch(() => "");
  const data = raw ? JSON.parse(raw) : null;
  if (API_DEBUG) {
    console.debug("[api:response-ok]", {
      method,
      url,
      status: res.status,
      data,
    });
  }

  // Some endpoints return HTTP 200 with { result: false, message, response: null }.
  // Treat that as a failed request so UI can show the backend message.
  if (
    data &&
    typeof data === "object" &&
    "result" in data &&
    data.result === false
  ) {
    throw new Error(data.message || data.Message || "Request failed");
  }

  // Handle all API response wrapper patterns:
  // 1. { response: ... }  (brands, categories, dashboard etc.)
  // 2. direct object      (register)
  if (data !== null && typeof data === "object" && "response" in data) {
    return data.response;
  }
  return data;
}

export const api = {
  get: (path) => request(path),
  post: (path, body) =>
    request(path, { method: "POST", body: JSON.stringify(body) }),
};

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authApi = {
  login: (email, password) =>
    api.post("/api/userlogin/login", { email, password }),
  register: (email, password, displayName) =>
    api.post("/api/userlogin/register", {
      email,
      password,
      displayName,
      userRole: 2,
      status: 1,
    }),
  forgotPassword: (email) =>
    api.post("/api/userlogin/forgot-password", { email }),
  resetPassword: (token, newPassword) =>
    api.post("/api/userlogin/reset-password", { token, newPassword }),
};

// ── Products ──────────────────────────────────────────────────────────────────
export const productsApi = {
  getAll: () => api.get("/api/products"),
  getAllAdmin: () => api.get("/api/products/admin"),
  getById: (id) => api.get(`/api/products/${id}`),
  create: (body) => api.post("/api/products", body),
  update: (id, b) => api.post(`/api/products/${id}/update`, b),
  remove: (id) => api.post(`/api/products/${id}/delete`, {}),
  getConcerns: (id) => api.get(`/api/products/${id}/concerns`),
  getPaymentOptions: (id) => api.get(`/api/products/${id}/payment-options`),
};

// ── Brands ────────────────────────────────────────────────────────────────────
export const brandsApi = {
  getAll: () => api.get("/api/brands"),
  getById: (id) => api.get(`/api/brands/${id}`),
  create: (body) => api.post("/api/brands", body),
  update: (body) => api.post("/api/brands/update", body),
  deactivate: (id) => api.post(`/api/brands/${id}`),
};

// ── Payment Types ─────────────────────────────────────────────────────────────
export const paymentApi = {
  getAll: () => api.get("/api/paymenttype"),
  create: (body) => api.post("/api/paymenttype", body),
  update: (id, body) => api.post(`/api/paymenttype/${id}/update`, body),
  activate: (id) => api.post(`/api/paymenttype/${id}/activate`, {}),
  deactivate: (id) => api.post(`/api/paymenttype/${id}/deactivate`, {}),
};

// ── Orders ────────────────────────────────────────────────────────────────────
export const ordersApi = {
  getAll: (page = 1, pageSize = 20, status = null) =>
    api.get(
      `/api/orders?page=${page}&pageSize=${pageSize}${status ? `&status=${status}` : ""}`,
    ),
  getById: (id) => api.get(`/api/orders/${id}`),
  getMyOrders: (page = 1) => api.get(`/api/orders/my?page=${page}`),
  create: (body) => api.post("/api/orders", body),
  updateStatus: (id, status) =>
    api.post(`/api/orders/${id}/status`, { status }),
};

// ── Dispatch ──────────────────────────────────────────────────────────────────
export const dispatchApi = {
  getPending: () => api.get("/api/dispatch/pending"),
  upsert: (body) => api.post("/api/dispatch", body),
  markDelivered: (orderId) =>
    api.post(`/api/dispatch/${orderId}/delivered`, {}),
};

// ── Procurement ───────────────────────────────────────────────────────────────
export const procurementApi = {
  getAll: () => api.get("/api/procurement"),
  getById: (id) => api.get(`/api/procurement/${id}`),
  create: (body) => api.post("/api/procurement", body),
  updateStatus: (id, b) => api.post(`/api/procurement/${id}/status`, b),
};

// ── Payment Cards (UK purchase card issuers) ──────────────────────────────────
export const paymentCardsApi = {
  getAll: () => api.get("/api/admin/supply-chain/payment-cards"),
  save: (body) => api.post("/api/admin/supply-chain/payment-cards", body),
};

// ── UK Purchase Shops ───────────────────────────────────────────────────────
export const shopsApi = {
  getAll: () => api.get("/api/admin/supply-chain/shops"),
  save: (body) => api.post("/api/admin/supply-chain/shops", body),
};

// ── Supply Chain ─────────────────────────────────────────────────────────────
export const supplyChainApi = {
  getDashboard: () => api.get("/api/admin/supply-chain/dashboard"),

  getPaymentCards: () => api.get("/api/admin/supply-chain/payment-cards"),
  getShops: () => api.get("/api/admin/supply-chain/shops"),

  getProcurements: () => api.get("/api/admin/supply-chain/procurements"),
  getProcurementById: (id) => api.get(`/api/admin/supply-chain/procurements/${id}`),
  saveProcurement: (body) => api.post("/api/admin/supply-chain/procurements", body),

  getDispatches: () => api.get("/api/admin/supply-chain/dispatches"),
  getDispatchById: (id) => api.get(`/api/admin/supply-chain/dispatches/${id}`),
  saveDispatch: (body) => api.post("/api/admin/supply-chain/dispatches", body),
  addShipmentCharge: (shipmentId, body) =>
    api.post(`/api/admin/supply-chain/dispatches/${shipmentId}/charges`, body),

  getArrivals: () => api.get("/api/admin/supply-chain/arrivals"),
  getArrivalById: (id) => api.get(`/api/admin/supply-chain/arrivals/${id}`),
  saveArrival: (body) => api.post("/api/admin/supply-chain/arrivals", body),
  updateArrivalItem: (itemId, body) =>
    api.post(`/api/admin/supply-chain/arrivals/items/${itemId}/update`, body),
  approveDamagedItem: (itemId, body) =>
    api.post(`/api/admin/supply-chain/arrivals/items/${itemId}/approve-damaged`, body),

  getEligiblePricing: () => api.get("/api/admin/supply-chain/pricing/eligible"),
  getPricing: () => api.get("/api/admin/supply-chain/pricing"),
  savePricing: (body) => api.post("/api/admin/supply-chain/pricing", body),
  activatePricing: (pricingId, body = {}) => api.post(`/api/admin/supply-chain/pricing/${pricingId}/activate`, body),

  getProcurementReport: (params = {}) =>
    api.get(`/api/admin/supply-chain/reports/procurement${toQuery(params)}`),
  getDispatchReport: (params = {}) =>
    api.get(`/api/admin/supply-chain/reports/dispatch${toQuery(params)}`),
  getMonthlyDispatchSummary: (params = {}) =>
    api.get(`/api/admin/supply-chain/reports/monthly-dispatch-summary${toQuery(params)}`),

  // Stock item delete / update
  deleteProcurementItem: (itemId, reason) =>
    api.post(`/api/admin/supply-chain/procurements/items/${itemId}/delete`, { deletionReason: reason || null }),
  updateProcurementItem: (itemId, body) =>
    api.post(`/api/admin/supply-chain/procurements/items/${itemId}/update`, body),
  deleteDispatchItem: (itemId, reason) =>
    api.post(`/api/admin/supply-chain/dispatches/items/${itemId}/delete`, { deletionReason: reason || null }),
  updateDispatchItem: (itemId, body) =>
    api.post(`/api/admin/supply-chain/dispatches/items/${itemId}/update`, body),
  getDeletedItems: (tableName) =>
    api.get(`/api/admin/supply-chain/deleted-items${toQuery({ tableName })}`),
};

// ── Reviews ───────────────────────────────────────────────────────────────────
export const reviewsApi = {
  getAll: (page = 1, isApproved = null) =>
    api.get(
      `/api/reviews?page=${page}${isApproved !== null ? `&isApproved=${isApproved}` : ""}`,
    ),
  getByProduct: (productId) => api.get(`/api/reviews/product/${productId}`),
  create: (body) => api.post("/api/reviews", body),
  moderate: (id, isApproved) =>
    api.post(`/api/reviews/${id}/moderate`, { isApproved }),
};

// ── Dashboard ─────────────────────────────────────────────────────────────────
export const dashboardApi = {
  getStats: () => api.get("/api/admin/dashboard/stats"),
  getMonthly: () => api.get("/api/admin/dashboard/monthly"),
  getOrderStatus: () => api.get("/api/admin/dashboard/order-status"),
  getCategorySales: () => api.get("/api/admin/dashboard/category-sales"),
  getTopProducts: (top = 6) =>
    api.get(`/api/admin/dashboard/top-products?top=${top}`),
  getRecentOrders: (top = 6) =>
    api.get(`/api/admin/dashboard/recent-orders?top=${top}`),
};

// ── Reports ───────────────────────────────────────────────────────────────────
export const reportsApi = {
  revenue: (startDate, endDate, groupBy = "month") =>
    api.get(
      `/api/admin/reports/revenue?startDate=${startDate}&endDate=${endDate}&groupBy=${groupBy}`,
    ),
  categories: (startDate, endDate) =>
    api.get(
      `/api/admin/reports/categories?startDate=${startDate}&endDate=${endDate}`,
    ),
  topCustomers: (top = 20, startDate, endDate) =>
    api.get(
      `/api/admin/reports/customers?top=${top}&startDate=${startDate}&endDate=${endDate}`,
    ),
  topProducts: (top = 20, startDate, endDate) =>
    api.get(
      `/api/admin/reports/products?top=${top}&startDate=${startDate}&endDate=${endDate}`,
    ),
};

// ── Customers ─────────────────────────────────────────────────────────────────
export const customersApi = {
  getAll: (page = 1, search = "") =>
    api.get(
      `/api/admin/customers?page=${page}${search ? `&search=${search}` : ""}`,
    ),
  getById: (id) => api.get(`/api/admin/customers/${id}`),
};

// ── Concerns ──────────────────────────────────────────────────────────────────
export const concernsApi = {
  getAll: () => api.get("/api/concerns"),
  create: (body) => api.post("/api/concerns", body),
  update: (id, body) => api.post(`/api/concerns/${id}/update`, body),
  activate: (id) => api.post(`/api/concerns/${id}/activate`, {}),
  deactivate: (id) => api.post(`/api/concerns/${id}/deactivate`, {}),
};

// ── Product Images ────────────────────────────────────────────────────────────
export const productImageApi = {
  getAll: async () => {
    const data = await api.get("/api/productimage");
    return Array.isArray(data?.data ?? data?.Data) ? (data?.data ?? data?.Data) : [];
  },
  getByProduct: async (productId) => {
    const all = await productImageApi.getAll();
    return all.filter(
      (img) =>
        (img.productId ?? img.ProductId) === productId &&
        (img.isActive ?? img.IsActive) !== false
    );
  },
  create: (body) => api.post("/api/productimage", body),
  update: (body) => api.post("/api/productimage/update", body),
  deactivate: (id) => api.post(`/api/productimage/deactive/${id}`, {}),
};

// ── Product FAQ ───────────────────────────────────────────────────────────────
export const productFaqApi = {
  getAll: async () => {
    const data = await api.get("/api/productfaq");
    if (Array.isArray(data)) return data;
    return Array.isArray(data?.data ?? data?.Data) ? (data?.data ?? data?.Data) : [];
  },
  getByProduct: async (productId) => {
    const all = await productFaqApi.getAll();
    return all.filter(
      (faq) =>
        (faq.productId ?? faq.ProductId ?? faq.productid) === productId &&
        (faq.isActive ?? faq.IsActive) !== false
    );
  },
  create: (body) => api.post("/api/productfaq", body),
  update: (id, body) => api.post(`/api/productfaq/${id}/update`, body),
  deactivate: (id) => api.post(`/api/productfaq/${id}/deactivate`, {}),
};

// ── Image Upload (ImgBB) ──────────────────────────────────────────────────────
// Images are uploaded directly from the browser to ImgBB (free CDN).
// No backend file storage or server permissions required.
// Get a free API key at https://api.imgbb.com and set VITE_IMGBB_API_KEY in .env
export const uploadApi = {
  uploadImage: async (file) => {
    const apiKey = import.meta.env.VITE_IMGBB_API_KEY;
    if (!apiKey || apiKey === "your_imgbb_api_key_here") {
      throw new Error("ImgBB API key not configured. Add VITE_IMGBB_API_KEY to your .env file.");
    }

    // Convert file to base64
    const base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(",")[1]); // strip data:...;base64, prefix
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    const formData = new FormData();
    formData.append("key", apiKey);
    formData.append("image", base64);

    const res = await fetch("https://api.imgbb.com/1/upload", {
      method: "POST",
      body: formData,
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok || !data.success) {
      throw new Error(data?.error?.message || `Image upload failed (${res.status})`);
    }

    return data.data.url; // e.g. "https://i.ibb.co/xxx/image.jpg"
  },
};

// ── Admin / Audit ─────────────────────────────────────────────────────────────
export const adminApi = {
  getAuditLogs: (page = 1, pageSize = 50, adminUserId = null) => {
    const q = toQuery({ page, pageSize, adminUserId });
    return api.get(`/api/admin/audit-logs${q}`);
  },
  getMyActivity: (page = 1, pageSize = 50) => {
    const q = toQuery({ page, pageSize });
    return api.get(`/api/admin/my-activity${q}`);
  },
};
