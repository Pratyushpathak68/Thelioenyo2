import React, { useEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import api from "@/services/api";
import { useStore } from "@/contexts/StoreContext";
import { formatINR } from "@/utils/format";
import { LogOut, Package } from "lucide-react";

export default function Account() {
  const { user, logout } = useStore();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    api.get("/auth/orders").then(({ data }) => setOrders(data)).finally(() => setLoading(false));
  }, [user]);

  if (!user) return <Navigate to="/" replace />;

  return (
    <div data-testid="account-page" className="max-w-screen-xl mx-auto px-5 md:px-10 pt-12 pb-32">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <div className="text-[10px] uppercase tracking-[0.3em] font-mono text-[var(--text-muted)]">My Account</div>
          <h1 className="font-display text-4xl md:text-5xl uppercase font-black tracking-tighter mt-2">{user.name}</h1>
          <div className="text-sm text-[var(--text-muted)] font-mono mt-1">{user.email}</div>
          {user.referral_code && <div className="text-xs uppercase tracking-[0.2em] mt-3">Your referral code: <span className="font-mono bg-[var(--surface)] px-2 py-1">{user.referral_code}</span></div>}
        </div>
        <button data-testid="logout-btn" onClick={() => { logout(); navigate("/"); }} className="self-start flex items-center gap-2 border border-[var(--border)] px-5 py-3 text-xs uppercase tracking-[0.2em] hover:bg-[var(--text)] hover:text-[var(--bg)]"><LogOut size={14}/> Logout</button>
      </div>

      <h2 className="font-display text-2xl uppercase font-black tracking-tight mt-16">Order History</h2>
      {loading ? <div className="mt-6 text-sm">Loading…</div> :
        orders.length === 0 ? (
          <div className="mt-6 text-sm text-[var(--text-muted)]">No orders yet. <Link to="/collection/all" className="link-underline">Start shopping</Link>.</div>
        ) : (
          <div className="mt-6 space-y-3">
            {orders.map((o) => (
              <Link key={o.id} to={`/track/${o.order_number}`} className="block bg-[var(--bg)] border border-[var(--border)] p-5 hover:border-[var(--text)]">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div>
                    <div className="font-mono text-sm">{o.order_number}</div>
                    <div className="text-xs text-[var(--text-muted)] mt-1">{new Date(o.created_at).toLocaleString("en-IN")}</div>
                    <div className="text-xs mt-1">{o.items.length} item{o.items.length > 1 ? "s" : ""}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-base">{formatINR(o.total)}</div>
                    <div className="text-[10px] uppercase tracking-[0.2em] mt-1 inline-block bg-[var(--text)] text-[var(--bg)] px-2 py-0.5">{o.status?.replace(/_/g, " ")}</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )
      }
    </div>
  );
}
