import React, { useState, useEffect, useCallback } from "react";
import { Search, X, Users, TrendingUp, ShoppingBag, MapPin, LockOpen, KeyRound, PowerOff, Power } from "lucide-react";
import { useAuth } from "../../Context/AuthContext";
import { customersApi } from "../../services/api";

const fmt = (n) => new Intl.NumberFormat("en-LK").format(Number(n ?? 0) || 0);
const ADMIN_ROLE_IDS = [2, 3];
const ROLE_OPTIONS = [
  { id: 1, label: "Customer" },
  { id: 2, label: "Admin" },
  { id: 3, label: "Super Admin" },
  { id: 4, label: "Manager" },
];

const unwrapCustomers = (data) => {
  if (Array.isArray(data)) return data;
  const candidates = [
    data?.items, data?.Items, data?.customers, data?.Customers,
    data?.data, data?.Data, data?.results, data?.Results,
    data?.users, data?.Users,
  ];
  return candidates.find(Array.isArray) ?? [];
};

const toNumber = (value) => Number(value ?? 0) || 0;
const customerId   = (c) => c.userId ?? c.UserId ?? c.id ?? c.Id ?? c.userID ?? c.UserID;
const customerName = (c) => c.displayName ?? c.DisplayName ?? c.userName ?? c.UserName ?? c.username ?? c.name ?? c.Name ?? "-";
const customerEmail = (c) => c.email ?? c.Email ?? "-";
const customerPhone = (c) => c.phone ?? c.Phone ?? c.phoneNumber ?? c.PhoneNumber ?? "-";
const customerCity  = (c) => c.city ?? c.City ?? c.shippingCity ?? c.ShippingCity ?? "-";
const customerOrders = (c) => c.orderCount ?? c.OrderCount ?? c.orders ?? c.Orders ?? 0;
const customerSpent  = (c) => toNumber(c.totalSpent ?? c.TotalSpent ?? c.totalAmount ?? c.TotalAmount);
const customerCreatedAt   = (c) => c.createdAt ?? c.CreatedAt ?? c.createdDate ?? c.CreatedDate;
const customerLastOrderAt = (c) => c.lastOrderAt ?? c.LastOrderAt ?? c.lastOrderDate ?? c.LastOrderDate;
const customerRole = (c) => {
  const roleName = c.roleName ?? c.RoleName;
  if (roleName) return roleName;
  const roleId = c.roleId ?? c.RoleId ?? c.userRole ?? c.UserRole;
  if (Number(roleId) === 3) return "Super Admin";
  if (Number(roleId) === 2) return "Admin";
  if (Number(roleId) === 1) return "Customer";
  if (Number(roleId) === 4) return "Manager";
  return "User";
};
const customerRoleId = (c) => Number(c.roleId ?? c.RoleId ?? c.userRole ?? c.UserRole ?? 1);
const customerActive = (c) => {
  const value = c.isActive ?? c.IsActive;
  if (value !== undefined && value !== null) return Boolean(value);
  const status = c.status ?? c.Status;
  if (typeof status === "number") return status === 1;
  if (typeof status === "string") return ["active", "1", "true"].includes(status.toLowerCase());
  return true;
};
const customerLocked = (c) => Boolean(c.isLocked ?? c.IsLocked ?? false);

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString("en-GB");
};

// ── Reset Password Dialog ─────────────────────────────────────────────────────
function ResetPasswordDialog({ target, onClose, onSuccess }) {
  const [newPwd, setNewPwd]       = useState("");
  const [confirmPwd, setConfirm]  = useState("");
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState("");
  const [done, setDone]           = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (newPwd.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (newPwd !== confirmPwd) { setError("Passwords do not match."); return; }
    setSaving(true);
    try {
      await customersApi.resetPassword(target.id, newPwd);
      setDone(true);
    } catch (err) {
      setError(err.message || "Unable to reset password.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 bg-tenzy-teal/10 rounded-full flex items-center justify-center text-tenzy-teal font-bold text-sm flex-shrink-0">
            {target.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-slate-900">Reset Password</h2>
            <p className="text-xs text-slate-400 truncate">{target.name}</p>
            <p className="text-[11px] text-slate-400 truncate">{target.email}</p>
          </div>
        </div>

        {done ? (
          <div className="text-center py-4">
            <p className="text-sm font-semibold text-emerald-600 mb-4">Password reset successfully.</p>
            <button
              onClick={onClose}
              className="px-5 py-2 text-sm font-semibold rounded-xl bg-slate-900 text-white hover:bg-slate-700 transition"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">New Password</label>
              <input
                type="password"
                value={newPwd}
                onChange={(e) => setNewPwd(e.target.value)}
                placeholder="Min. 6 characters"
                autoFocus
                className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-tenzy-teal/30 focus:border-tenzy-teal transition"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Confirm Password</label>
              <input
                type="password"
                value={confirmPwd}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Repeat password"
                className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-tenzy-teal/30 focus:border-tenzy-teal transition"
              />
            </div>
            {error && (
              <p className="text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2">{error}</p>
            )}
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 text-sm font-semibold rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 py-2.5 text-sm font-semibold rounded-xl bg-tenzy-teal text-white hover:bg-tenzy-teal/90 transition disabled:opacity-60"
              >
                {saving ? "Resetting…" : "Reset Password"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function Customers() {
  const { user } = useAuth();
  const [customers, setCustomers]     = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState("");
  const [search, setSearch]           = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeTab, setActiveTab]     = useState("customers");
  const [savingRoleId, setSavingRoleId] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [actionError, setActionError] = useState("");
  const [resetPwdTarget, setResetPwdTarget] = useState(null); // { id, name, email }

  let storedRoleId = 0;
  try {
    storedRoleId = Number(JSON.parse(localStorage.getItem("authUser") || "{}")?.roleId ?? 0);
  } catch {
    storedRoleId = 0;
  }
  const currentRoleId  = Number(user?.roleId ?? storedRoleId);
  const canManageRoles = currentRoleId === 3;

  const load = useCallback((q = "") => {
    setLoading(true);
    setError("");
    customersApi.getAll(1, q)
      .then((data) => setCustomers(unwrapCustomers(data)))
      .catch((err) => {
        console.error(err);
        setCustomers([]);
        setError(err.message || "Unable to load customers.");
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      load(searchInput);
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput, load]);

  const visibleByTab = customers.filter((c) => {
    const isAdminRole = ADMIN_ROLE_IDS.includes(customerRoleId(c));
    return activeTab === "admins" ? isAdminRole : !isAdminRole;
  });

  const filtered = visibleByTab.filter((c) => {
    const localMatch = [customerName(c), customerEmail(c), customerCity(c), customerPhone(c)]
      .join(" ").toLowerCase().includes(search.toLowerCase());
    if (search && !localMatch) return false;
    if (statusFilter === "all") return true;
    const active = customerActive(c);
    return statusFilter === "active" ? active : !active;
  });

  const totalRevenue  = customers.reduce((s, c) => s + customerSpent(c), 0);
  const avgSpend      = customers.length ? Math.round(totalRevenue / customers.length) : 0;
  const activeCount   = customers.filter(customerActive).length;
  const customerCount = customers.filter((c) => !ADMIN_ROLE_IDS.includes(customerRoleId(c))).length;
  const adminCount    = customers.length - customerCount;

  const updateRole = async (id, roleId) => {
    setSavingRoleId(id);
    setError("");
    try {
      await customersApi.updateRole(id, Number(roleId));
      setCustomers((items) =>
        items.map((item) =>
          customerId(item) === id
            ? { ...item, roleId: Number(roleId), RoleId: Number(roleId), roleName: ROLE_OPTIONS.find((r) => r.id === Number(roleId))?.label }
            : item,
        ),
      );
    } catch (err) {
      setError(err.message || "Unable to update role.");
    } finally {
      setSavingRoleId(null);
    }
  };

  const toggleStatus = async (id, currentlyActive) => {
    setActionLoadingId(id);
    setActionError("");
    try {
      await (currentlyActive ? customersApi.deactivate(id) : customersApi.activate(id));
      setCustomers((items) =>
        items.map((item) =>
          customerId(item) === id
            ? { ...item, status: currentlyActive ? 0 : 1, Status: currentlyActive ? 0 : 1, isActive: !currentlyActive, IsActive: !currentlyActive }
            : item,
        ),
      );
    } catch (err) {
      setActionError(err.message || "Unable to update status.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const unlockAccount = async (id) => {
    setActionLoadingId(id);
    setActionError("");
    try {
      await customersApi.unlock(id);
      setCustomers((items) =>
        items.map((item) =>
          customerId(item) === id
            ? { ...item, isLocked: false, IsLocked: false }
            : item,
        ),
      );
    } catch (err) {
      setActionError(err.message || "Unable to unlock account.");
    } finally {
      setActionLoadingId(null);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 rounded-full border-4 border-tenzy-teal/30 border-t-tenzy-teal animate-spin" />
    </div>
  );

  return (
    <>
      {resetPwdTarget && (
        <ResetPasswordDialog
          target={resetPwdTarget}
          onClose={() => setResetPwdTarget(null)}
          onSuccess={() => setResetPwdTarget(null)}
        />
      )}

      <div className="space-y-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900">Customers</h1>
          <p className="text-sm text-slate-500 mt-0.5">{customers.length} registered users</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Total Users",    value: customers.length,         icon: Users,       color: "bg-tenzy-teal" },
            { label: "Total Revenue",  value: `LKR ${fmt(totalRevenue)}`, icon: TrendingUp, color: "bg-tenzy-orange" },
            { label: "Avg. Spend",     value: `LKR ${fmt(avgSpend)}`,   icon: ShoppingBag, color: "bg-indigo-500" },
            { label: "Active",         value: activeCount,              icon: Users,       color: "bg-emerald-500" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center gap-3">
              <div className={`w-10 h-10 ${color} rounded-xl flex items-center justify-center flex-shrink-0`}>
                <Icon size={18} className="text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-slate-400 leading-none mb-1">{label}</p>
                <p className="text-sm font-bold text-slate-900 truncate">{value}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl p-3 md:p-4 shadow-sm border border-slate-100 space-y-3">
          <div className="flex gap-2 border-b border-slate-100 pb-3">
            {[
              { id: "customers", label: "Customers", count: customerCount },
              canManageRoles ? { id: "admins", label: "Admin", count: adminCount } : null,
            ].filter(Boolean).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`text-xs font-semibold px-4 py-2 rounded-xl border transition ${
                  activeTab === tab.id
                    ? "bg-slate-900 text-white border-slate-900"
                    : "border-slate-200 text-slate-600 hover:border-tenzy-teal hover:text-tenzy-teal"
                }`}
              >
                {tab.label} <span className="ml-1 opacity-70">{tab.count}</span>
              </button>
            ))}
          </div>

          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by name, email, city..."
              className="w-full pl-9 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-tenzy-teal/30 focus:border-tenzy-teal transition"
            />
            {searchInput && (
              <button
                onClick={() => { setSearchInput(""); setSearch(""); load(""); }}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <X size={14} className="text-slate-400" />
              </button>
            )}
          </div>

          {error && (
            <p className="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2">{error}</p>
          )}
          {actionError && (
            <p className="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2">{actionError}</p>
          )}

          <div className="flex gap-2">
            {["all", "active", "inactive"].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`text-xs font-semibold px-4 py-1.5 rounded-full border capitalize transition ${
                  statusFilter === s ? "bg-tenzy-teal text-white border-tenzy-teal" : "border-slate-200 text-slate-600 hover:border-tenzy-teal hover:text-tenzy-teal"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* ── Mobile cards ─────────────────────────────────────────────────── */}
        <div className="md:hidden space-y-3">
          {filtered.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-12">No users found.</p>
          )}
          {filtered.map((c) => {
            const id     = customerId(c);
            const name   = customerName(c);
            const active = customerActive(c);
            const locked = customerLocked(c);
            return (
              <div key={id ?? customerEmail(c)} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-tenzy-teal/10 rounded-full flex items-center justify-center text-tenzy-teal font-bold text-sm flex-shrink-0">
                    {name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-800 truncate">{name}</p>
                    <p className="text-xs text-slate-400 truncate">{customerEmail(c)}</p>
                    <p className="text-[10px] text-slate-400">{customerRole(c)}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${
                      active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                    }`}>
                      {active ? "active" : "inactive"}
                    </span>
                    {locked && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                        locked
                      </span>
                    )}
                  </div>
                </div>

                {canManageRoles && (
                  <>
                    <select
                      value={customerRoleId(c)}
                      disabled={savingRoleId === id}
                      onChange={(e) => updateRole(id, e.target.value)}
                      className="mb-2 w-full text-xs border border-slate-200 rounded-xl px-3 py-2 bg-white outline-none focus:ring-2 focus:ring-tenzy-teal/30"
                    >
                      {ROLE_OPTIONS.map((role) => (
                        <option key={role.id} value={role.id}>{role.label}</option>
                      ))}
                    </select>
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      <button
                        disabled={actionLoadingId === id}
                        onClick={() => toggleStatus(id, active)}
                        className={`flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-lg border transition disabled:opacity-50 ${
                          active
                            ? "border-rose-200 text-rose-600 hover:bg-rose-50"
                            : "border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                        }`}
                      >
                        {active ? <PowerOff size={11} /> : <Power size={11} />}
                        {active ? "Deactivate" : "Activate"}
                      </button>
                      {locked && (
                        <button
                          disabled={actionLoadingId === id}
                          onClick={() => unlockAccount(id)}
                          className="flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-lg border border-amber-200 text-amber-700 hover:bg-amber-50 transition disabled:opacity-50"
                        >
                          <LockOpen size={11} />
                          Unlock
                        </button>
                      )}
                      <button
                        onClick={() => setResetPwdTarget({ id, name, email: customerEmail(c) })}
                        className="flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-lg border border-slate-200 text-slate-600 hover:border-tenzy-teal hover:text-tenzy-teal transition"
                      >
                        <KeyRound size={11} />
                        Reset Pwd
                      </button>
                    </div>
                  </>
                )}

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-slate-50 rounded-xl py-2">
                    <p className="text-xs font-bold text-slate-800">{customerOrders(c)}</p>
                    <p className="text-[10px] text-slate-400">Orders</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl py-2">
                    <p className="text-xs font-bold text-slate-800">LKR {fmt(customerSpent(c))}</p>
                    <p className="text-[10px] text-slate-400">Spent</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl py-2">
                    <p className="text-xs font-bold text-slate-800">{customerCity(c)}</p>
                    <p className="text-[10px] text-slate-400">City</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Desktop table ────────────────────────────────────────────────── */}
        <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {[
                  "Customer", "Contact", "Role", "City", "Joined",
                  "Orders", "Total Spent", "Last Order", "Status", "Access",
                  ...(canManageRoles ? ["Actions"] : []),
                ].map((h) => (
                  <th key={h} className="text-left text-xs font-semibold text-slate-500 px-5 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={canManageRoles ? 11 : 10} className="text-center py-12 text-sm text-slate-400">
                    No users found.
                  </td>
                </tr>
              )}
              {filtered.map((c) => {
                const id     = customerId(c);
                const name   = customerName(c);
                const active = customerActive(c);
                const locked = customerLocked(c);
                return (
                  <tr key={id ?? customerEmail(c)} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-tenzy-teal/10 rounded-full flex items-center justify-center text-tenzy-teal font-bold text-sm flex-shrink-0">
                          {name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-800">{name}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{id ?? "-"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <p className="text-xs text-slate-600">{customerEmail(c)}</p>
                      <p className="text-[10px] text-slate-400">{customerPhone(c)}</p>
                    </td>
                    <td className="px-5 py-3 text-xs font-semibold text-slate-600">
                      {customerRole(c)}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1 text-xs text-slate-600">
                        <MapPin size={11} className="text-slate-400" />
                        {customerCity(c)}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-xs text-slate-500">
                      {formatDate(customerCreatedAt(c))}
                    </td>
                    <td className="px-5 py-3 text-xs font-bold text-slate-800 text-center">
                      {customerOrders(c)}
                    </td>
                    <td className="px-5 py-3 text-xs font-bold text-slate-800">
                      LKR {fmt(customerSpent(c))}
                    </td>
                    <td className="px-5 py-3 text-xs text-slate-500">
                      {formatDate(customerLastOrderAt(c))}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex flex-col gap-1 items-start">
                        <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full capitalize ${
                          active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                        }`}>
                          {active ? "active" : "inactive"}
                        </span>
                        {locked && (
                          <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">
                            locked
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      {canManageRoles ? (
                        <select
                          value={customerRoleId(c)}
                          disabled={savingRoleId === id}
                          onChange={(e) => updateRole(id, e.target.value)}
                          className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white outline-none focus:ring-2 focus:ring-tenzy-teal/30"
                        >
                          {ROLE_OPTIONS.map((role) => (
                            <option key={role.id} value={role.id}>{role.label}</option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-[10px] text-slate-400">Super admin only</span>
                      )}
                    </td>
                    {canManageRoles && (
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button
                            title={active ? "Deactivate user" : "Activate user"}
                            disabled={actionLoadingId === id}
                            onClick={() => toggleStatus(id, active)}
                            className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-lg border transition disabled:opacity-50 ${
                              active
                                ? "border-rose-200 text-rose-600 hover:bg-rose-50"
                                : "border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                            }`}
                          >
                            {active ? <PowerOff size={11} /> : <Power size={11} />}
                            {active ? "Deactivate" : "Activate"}
                          </button>
                          {locked && (
                            <button
                              title="Remove account lock"
                              disabled={actionLoadingId === id}
                              onClick={() => unlockAccount(id)}
                              className="flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-lg border border-amber-200 text-amber-700 hover:bg-amber-50 transition disabled:opacity-50"
                            >
                              <LockOpen size={11} />
                              Unlock
                            </button>
                          )}
                          <button
                            title="Reset password"
                            onClick={() => setResetPwdTarget({ id, name, email: customerEmail(c) })}
                            className="flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-lg border border-slate-200 text-slate-600 hover:border-tenzy-teal hover:text-tenzy-teal transition"
                          >
                            <KeyRound size={11} />
                            Reset Pwd
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
