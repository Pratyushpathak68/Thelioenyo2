import React, { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import api from "@/services/api";
import { toast } from "sonner";

export default function AdminLogin() {
  const [email, setEmail] = useState("admin@lioneyo.com");
  const [pw, setPw] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  if (localStorage.getItem("lioneyo_admin_token")) return <Navigate to="/admin" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post("/admin/login", { email, password: pw });
      localStorage.setItem("lioneyo_admin_token", data.token);
      toast.success("Welcome back");
      navigate("/admin");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Login failed");
    } finally { setLoading(false); }
  };

  return (
    <div data-testid="admin-login-page" className="min-h-screen flex items-center justify-center bg-[var(--surface)] p-5">
      <form onSubmit={submit} className="bg-[var(--bg)] border border-[var(--border)] p-10 w-full max-w-md">
        <div className="text-[10px] uppercase tracking-[0.3em] font-mono text-[var(--text-muted)]">Admin</div>
        <h1 className="font-display text-3xl uppercase font-black tracking-tight mt-2">THE LIONEYO</h1>
        <p className="text-xs text-[var(--text-muted)] mt-1">Sign in to manage your store</p>
        <div className="mt-8 space-y-5">
          <div>
            <label className="text-[10px] uppercase tracking-[0.25em] font-mono">Email</label>
            <input data-testid="admin-email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full bg-transparent border-b border-[var(--border)] focus:border-[var(--text)] outline-none py-2 text-sm" />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-[0.25em] font-mono">Password</label>
            <input data-testid="admin-password" type="password" value={pw} onChange={(e) => setPw(e.target.value)} className="mt-1 w-full bg-transparent border-b border-[var(--border)] focus:border-[var(--text)] outline-none py-2 text-sm" />
          </div>
        </div>
        <button data-testid="admin-login-btn" disabled={loading} className="mt-8 w-full bg-[var(--text)] text-[var(--bg)] py-4 uppercase text-xs tracking-[0.3em] hover:opacity-80 disabled:opacity-50">
          {loading ? "Signing in…" : "Sign In"}
        </button>
      </form>
    </div>
  );
}
