import React, { useState, useEffect } from "react";
import { NavLink, useNavigate, Outlet } from "react-router-dom";
import {
  LayoutDashboard, ShoppingCart, Package, Truck, Users,
  BarChart2, LogOut, Menu, X, Bell, ChevronRight,
  ExternalLink, Store, Star, PackagePlus, Database, Percent,
  BadgeCheck, Layers, Shield, Newspaper,
} from "lucide-react";
import { useAuth } from "../Context/AuthContext";
import { supplyChainApi } from "../services/api";

const ALL_NAV = [
  { to: "/admin",              label: "Dashboard",   icon: LayoutDashboard, end: true },
  { to: "/admin/orders",       label: "Orders",      icon: ShoppingCart },
  { to: "/admin/products",     label: "Products",    icon: Package },
  { to: "/admin/blogs",        label: "Beauty Tips", icon: Newspaper },
  { to: "/admin/procurement",  label: "UK Purchase", icon: PackagePlus,     superAdminOnly: true },
  { to: "/admin/arrival",      label: "Arrival",     icon: BadgeCheck },
  { to: "/admin/pricing",      label: "Pricing",     icon: Percent,         superAdminOnly: true },
  { to: "/admin/dispatch",     label: "Dispatch",    icon: Truck },
  { to: "/admin/stock",        label: "Stock",       icon: Layers },
  { to: "/admin/customers",    label: "Customers",   icon: Users },
  { to: "/admin/reviews",      label: "Reviews",     icon: Star },
  { to: "/admin/reports",      label: "Reports",     icon: BarChart2,       superAdminOnly: true },
  { to: "/admin/audit-log",    label: "Audit Log",   icon: Shield },
  { to: "/admin/reference",    label: "Reference",   icon: Database },
];

const ROLE_LABEL = { 3: "Super Admin", 1: "Admin", 4: "Manager", 2: "User" };

export default function AdminLayout() {
  const navigate = useNavigate();
  const [sidebarOpen,    setSidebarOpen]    = useState(false);
  const [pendingPricing, setPendingPricing] = useState(0);
  const { user, isSuperAdmin, roleId } = useAuth();

  // Fetch pending pricing count once on mount (super-admins only)
  useEffect(() => {
    if (!isSuperAdmin) return;
    supplyChainApi.getEligiblePricing()
      .then((rows) => {
        const pending = (Array.isArray(rows) ? rows : [])
          .filter((r) => r.pricingReviewStatus !== "applied_live").length;
        setPendingPricing(pending);
      })
      .catch(() => {});
  }, [isSuperAdmin]);

  const NAV        = ALL_NAV.filter((item) => !item.superAdminOnly || isSuperAdmin);
  const BOTTOM_NAV = NAV.filter((item) =>
    ["/admin", "/admin/orders", "/admin/products", "/admin/dispatch", "/admin/reports"].includes(item.to)
  );

  const handleLogout = () => {
    localStorage.removeItem("adminAuth");
    navigate("/signin");
  };

  const initials = (user?.displayName || user?.email || "A")
    .split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

  const SidebarContent = ({ onClose }) => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center justify-between px-5 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-tenzy-teal flex items-center justify-center">
            <Store size={16} className="text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-none">Tenzy Shop</p>
            <p className="text-white/40 text-[10px] mt-0.5">Admin Portal</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-white/40 hover:text-white p-1">
            <X size={18} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? "bg-tenzy-teal text-white shadow-lg shadow-tenzy-teal/30"
                  : "text-white/60 hover:text-white hover:bg-white/8"
              }`
            }
          >
            <item.icon size={18} />
            <span className="flex-1">{item.label}</span>
            {item.to === "/admin/pricing" && pendingPricing > 0 && (
              <span className="ml-auto rounded-full bg-tenzy-orange text-white text-[10px] font-bold px-1.5 py-0.5 min-w-[18px] text-center leading-none">
                {pendingPricing}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Bottom */}
      <div className="px-3 pb-5 border-t border-white/10 pt-4 space-y-0.5">
        <a
          href="/#/"
          target="_blank"
          rel="noopener noreferrer"
          onClick={onClose}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/60 hover:text-white hover:bg-white/8 transition-all"
        >
          <ExternalLink size={18} />
          <span>Visit Website</span>
        </a>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all"
        >
          <LogOut size={18} />
          <span>Log out</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* ── Desktop Sidebar ──────────────────────────────────────────────── */}
      <aside className="hidden md:flex w-56 shrink-0 flex-col bg-slate-900 fixed inset-y-0 left-0 z-30">
        <SidebarContent />
      </aside>

      {/* ── Mobile Drawer ────────────────────────────────────────────────── */}
      {sidebarOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 w-64 bg-slate-900 z-50 md:hidden flex flex-col">
            <SidebarContent onClose={() => setSidebarOpen(false)} />
          </aside>
        </>
      )}

      {/* ── Main ─────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col md:ml-56 min-h-screen">
        {/* Top Header */}
        <header className="sticky top-0 z-20 bg-white border-b border-slate-200 px-4 md:px-6 h-14 flex items-center justify-between shadow-sm">
          <button
            className="md:hidden p-1.5 rounded-lg text-slate-600 hover:bg-slate-100"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={20} />
          </button>

          <div className="hidden md:flex items-center gap-2 text-sm text-slate-500">
            <span className="text-slate-400">Admin</span>
            <ChevronRight size={14} />
            <span className="text-slate-700 font-medium">Portal</span>
          </div>

          <div className="ml-auto flex items-center gap-3">
            <button className="relative p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition">
              <Bell size={18} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-tenzy-orange rounded-full" />
            </button>
            <div className="flex items-center gap-2 pl-3 border-l border-slate-200">
              <div className="w-8 h-8 rounded-full bg-tenzy-teal flex items-center justify-center text-white text-xs font-bold">
                {initials}
              </div>
              <div className="hidden sm:block">
                <p className="text-xs font-semibold text-slate-800 leading-none">{user?.displayName || "Admin"}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{ROLE_LABEL[roleId] ?? "Admin"}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 md:p-6 pb-24 md:pb-6">
          <Outlet />
        </main>
      </div>

      {/* ── Mobile Bottom Nav ─────────────────────────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-slate-200 flex">
        {BOTTOM_NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-[10px] font-medium transition-colors ${
                isActive ? "text-tenzy-teal" : "text-slate-400"
              }`
            }
          >
            <item.icon size={20} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
