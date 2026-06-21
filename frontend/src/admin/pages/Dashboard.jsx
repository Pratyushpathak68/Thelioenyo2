import React, { useEffect, useState } from "react";
import api from "@/services/api";
import { formatINR } from "@/utils/format";
import { ShoppingCart, Package, Users, TrendingUp } from "lucide-react";

const Stat = ({ label, value, Icon }) => (
  <div className="bg-[var(--bg)] border border-[var(--border)] p-6">
    <div className="flex items-center justify-between">
      <div className="text-[10px] uppercase tracking-[0.3em] font-mono text-[var(--text-muted)]">{label}</div>
      <Icon size={16} />
    </div>
    <div className="font-display text-3xl font-black tracking-tight mt-3">{value}</div>
  </div>
);

export default function Dashboard() {
  const [d, setD] = useState(null);
  useEffect(() => { api.get("/admin/analytics").then(({ data }) => setD(data)); }, []);
  if (!d) return <div className="text-sm uppercase tracking-[0.2em]">Loading…</div>;
  return (
    <div data-testid="admin-dashboard">
      <h1 className="font-display text-3xl md:text-4xl uppercase font-black tracking-tight">Dashboard</h1>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
        <Stat label="Revenue" value={formatINR(d.revenue)} Icon={TrendingUp} />
        <Stat label="Orders" value={d.total_orders} Icon={ShoppingCart} />
        <Stat label="Products" value={d.total_products} Icon={Package} />
        <Stat label="Customers" value={d.total_customers} Icon={Users} />
      </div>
      <div className="mt-12 grid lg:grid-cols-2 gap-4">
        <div className="bg-[var(--bg)] border border-[var(--border)] p-6">
          <div className="text-xs uppercase tracking-[0.25em] mb-4">Top Viewed</div>
          <ul className="space-y-2 text-sm">{d.top_viewed.map((p) => <li key={p.slug} className="flex justify-between"><span>{p.name}</span><span className="font-mono text-xs text-[var(--text-muted)]">{p.views} views</span></li>)}</ul>
        </div>
        <div className="bg-[var(--bg)] border border-[var(--border)] p-6">
          <div className="text-xs uppercase tracking-[0.25em] mb-4">Top Sold</div>
          <ul className="space-y-2 text-sm">{d.top_sold.map((p) => <li key={p.slug} className="flex justify-between"><span>{p.name}</span><span className="font-mono text-xs text-[var(--text-muted)]">{p.sold_count} sold</span></li>)}</ul>
        </div>
      </div>
    </div>
  );
}
