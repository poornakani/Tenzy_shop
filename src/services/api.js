const BASE_URL = 'https://www.tenzyapitest.dotnetcloud.co.uk';

function getToken() {
  return localStorage.getItem('authToken');
}

function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || err.title || err.Message || `HTTP ${res.status}`);
  }

  const data = await res.json();

  // Handle all API response wrapper patterns:
  // 1. { response: ... }  (brands, categories, dashboard etc.)
  // 2. direct object      (register)
  if (data !== null && typeof data === 'object' && 'response' in data) {
    return data.response;
  }
  return data;
}

export const api = {
  get:    (path)        => request(path),
  post:   (path, body)  => request(path, { method: 'POST',   body: JSON.stringify(body) }),
  put:    (path, body)  => request(path, { method: 'PUT',    body: JSON.stringify(body) }),
  patch:  (path, body)  => request(path, { method: 'PATCH',  body: JSON.stringify(body) }),
  delete: (path)        => request(path, { method: 'DELETE' }),
};

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authApi = {
  login:         (email, password)                    => api.post('/api/userlogin/login', { email, password }),
  register:      (email, password, displayName)       => api.post('/api/userlogin/register', { email, password, displayName, userRole: 2, status: 1 }),
  forgotPassword: (email)                             => api.post('/api/userlogin/forgot-password', { email }),
  resetPassword:  (token, newPassword)                => api.post('/api/userlogin/reset-password', { token, newPassword }),
};

// ── Products ──────────────────────────────────────────────────────────────────
export const productsApi = {
  getAll:   ()        => api.get('/api/products'),
  getById:  (id)      => api.get(`/api/products/${id}`),
  create:   (body)    => api.post('/api/products', body),
  update:   (id, b)   => api.put(`/api/products/${id}`, b),
  remove:   (id)      => api.delete(`/api/products/${id}`),
};

// ── Brands ────────────────────────────────────────────────────────────────────
export const brandsApi = {
  getAll:     ()        => api.get('/api/brands'),
  getById:    (id)      => api.get(`/api/brands/${id}`),
  create:     (body)    => api.post('/api/brands', body),
  update:     (body)    => api.put('/api/brands', body),
  deactivate: (id)      => api.post(`/api/brands/${id}`),
};

// ── Categories ────────────────────────────────────────────────────────────────
export const categoriesApi = {
  getAll:     ()        => api.get('/api/categories'),
  create:     (body)    => api.post('/api/categories', body),
  update:     (body)    => api.put('/api/categories', body),
  activate:   (id)      => api.post(`/api/categories/${id}/activate`),
  deactivate: (id)      => api.post(`/api/categories/${id}`),
};

// ── Payment Types ─────────────────────────────────────────────────────────────
export const paymentApi = {
  getAll: () => api.get('/api/paymenttype'),
};

// ── Orders ────────────────────────────────────────────────────────────────────
export const ordersApi = {
  getAll:       (page = 1, pageSize = 20, status = null) =>
    api.get(`/api/orders?page=${page}&pageSize=${pageSize}${status ? `&status=${status}` : ''}`),
  getById:      (id)           => api.get(`/api/orders/${id}`),
  getMyOrders:  (page = 1)     => api.get(`/api/orders/my?page=${page}`),
  create:       (body)         => api.post('/api/orders', body),
  updateStatus: (id, status)   => api.patch(`/api/orders/${id}/status`, { status }),
};

// ── Dispatch ──────────────────────────────────────────────────────────────────
export const dispatchApi = {
  getPending:    ()      => api.get('/api/dispatch/pending'),
  upsert:        (body)  => api.post('/api/dispatch', body),
  markDelivered: (orderId) => api.patch(`/api/dispatch/${orderId}/delivered`, {}),
};

// ── Procurement ───────────────────────────────────────────────────────────────
export const procurementApi = {
  getAll:       ()       => api.get('/api/procurement'),
  getById:      (id)     => api.get(`/api/procurement/${id}`),
  create:       (body)   => api.post('/api/procurement', body),
  updateStatus: (id, b)  => api.patch(`/api/procurement/${id}/status`, b),
};

// ── Reviews ───────────────────────────────────────────────────────────────────
export const reviewsApi = {
  getAll:      (page = 1, isApproved = null) =>
    api.get(`/api/reviews?page=${page}${isApproved !== null ? `&isApproved=${isApproved}` : ''}`),
  getByProduct: (productId)     => api.get(`/api/reviews/product/${productId}`),
  create:       (body)          => api.post('/api/reviews', body),
  moderate:     (id, isApproved) => api.patch(`/api/reviews/${id}/moderate`, { isApproved }),
};

// ── Dashboard ─────────────────────────────────────────────────────────────────
export const dashboardApi = {
  getStats:          () => api.get('/api/admin/dashboard/stats'),
  getMonthly:        () => api.get('/api/admin/dashboard/monthly'),
  getOrderStatus:    () => api.get('/api/admin/dashboard/order-status'),
  getCategorySales:  () => api.get('/api/admin/dashboard/category-sales'),
  getTopProducts:    (top = 6) => api.get(`/api/admin/dashboard/top-products?top=${top}`),
  getRecentOrders:   (top = 6) => api.get(`/api/admin/dashboard/recent-orders?top=${top}`),
};

// ── Reports ───────────────────────────────────────────────────────────────────
export const reportsApi = {
  revenue:      (startDate, endDate, groupBy = 'month') =>
    api.get(`/api/admin/reports/revenue?startDate=${startDate}&endDate=${endDate}&groupBy=${groupBy}`),
  categories:   (startDate, endDate) =>
    api.get(`/api/admin/reports/categories?startDate=${startDate}&endDate=${endDate}`),
  topCustomers: (top = 20, startDate, endDate) =>
    api.get(`/api/admin/reports/customers?top=${top}&startDate=${startDate}&endDate=${endDate}`),
  topProducts:  (top = 20, startDate, endDate) =>
    api.get(`/api/admin/reports/products?top=${top}&startDate=${startDate}&endDate=${endDate}`),
};

// ── Customers ─────────────────────────────────────────────────────────────────
export const customersApi = {
  getAll: (page = 1, search = '')  =>
    api.get(`/api/admin/customers?page=${page}${search ? `&search=${search}` : ''}`),
  getById: (id) => api.get(`/api/admin/customers/${id}`),
};

// ── Concerns ──────────────────────────────────────────────────────────────────
export const concernsApi = {
  getAll: () => api.get('/api/concerns'),
};
