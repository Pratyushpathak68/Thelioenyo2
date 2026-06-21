import React, { useEffect, useState } from "react";
import { Routes, Route, NavLink, Navigate, useNavigate } from "react-router-dom";
import { LayoutDashboard, Package, FolderTree, ShoppingCart, Ticket, Star, Settings, LogOut, Menu, X } from "lucide-react";
import api from "@/services/api";
import Dashboard from "@/admin/pages/Dashboard";
import Products from "@/admin/pages/Products";
import Collections from "@/admin/pages/Collections";
import Orders from "@/admin/pages/Orders";
import Coupons from "@/admin/pages/Coupons";
import Reviews from "@/admin/pages/Reviews";
import AdminSettings from "@/admin/pages/Settings";

const nav = [
  { to: "/admin", label: "Dashboard", Icon: LayoutDashboard, end: true },
  { to: "/admin/products", label: "Products", Icon: Package },
  { to: "/admin/collections", label: "Collections", Icon: FolderTree },
  { to: "/admin/orders", label: "Orders", Icon: ShoppingCart },
  { to: "/admin/coupons", label: "Coupons", Icon: Ticket },
  { to: "/admin/reviews", label: "Reviews", Icon: Star },
  { to: "/admin/settings", label: "Settings", Icon: Settings },
];

export default function AdminApp() {
  const navigate = useNavigate();
  const [me, setMe] = useState(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    api.get("/admin/me").then(({ data }) => setMe(data)).catch(() => {
      localStorage.removeItem("lioneyo_admin_token");
      navigate("/admin/login");
    });
  }, [navigate]);

  const logout = () => {
    localStorage.removeItem("lioneyo_admin_token");
    navigate("/admin/login");
  };

  if (!localStorage.getItem("lioneyo_admin_token")) return <Navigate to="/admin/login" replace />;

  return (
    <div className="min-h-screen flex bg-[var(--surface)]">
      {/* Sidebar */}
      <aside className={`${open ? "fixed inset-y-0 left-0 z-50" : "hidden"} md:flex md:static w-64 bg-[var(--bg)] border-r border-[var(--border)] flex-col`}>
        <div className="p-5 border-b border-[var(--border)] flex items-center justify-between">
          <div>
            <div className="font-display text-lg uppercase font-black tracking-tight">LIONEYO</div>
            <div className="text-[10px] uppercase tracking-[0.3em] font-mono text-[var(--text-muted)]">Admin</div>
          </div>
          <button className="md:hidden" onClick={() => setOpen(false)}><X size={18} /></button>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {nav.map(({ to, label, Icon, end }) => (
            <NavLink
              key={to} to={to} end={end} onClick={() => setOpen(false)}
              data-testid={`admin-nav-${label.toLowerCase()}`}
              className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 text-xs uppercase tracking-[0.18em] ${isActive ? "bg-[var(--text)] text-[var(--bg)]" : "hover:bg-[var(--surface)]"}`}
            >
              <Icon size={14} /> {label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-[var(--border)]">
          <div className="text-xs text-[var(--text-muted)] mb-2 font-mono">{me?.email}</div>
          <button data-testid="admin-logout" onClick={logout} className="w-full flex items-center gap-2 text-xs uppercase tracking-[0.2em] py-2 hover:bg-[var(--surface)]"><LogOut size={14} /> Logout</button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 min-h-screen">
        <div className="md:hidden border-b border-[var(--border)] bg-[var(--bg)] p-4 flex items-center justify-between">
          <button onClick={() => setOpen(true)}><Menu size={20} /></button>
          <div className="font-display uppercase font-black text-sm tracking-tight">LIONEYO Admin</div>
          <div className="w-5" />
        </div>
        <div className="p-5 md:p-10">
          <Routes>
            <Route index element={<Dashboard />} />
            <Route path="products" element={<Products />} />
            <Route path="collections" element={<Collections />} />
            <Route path="orders" element={<Orders />} />
            <Route path="coupons" element={<Coupons />} />
            <Route path="reviews" element={<Reviews />} />
            <Route path="settings" element={<AdminSettings />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}
