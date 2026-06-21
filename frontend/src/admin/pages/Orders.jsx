import React, { useEffect, useState } from "react";
import api from "@/services/api";
import { formatINR } from "@/utils/format";
import { toast } from "sonner";

const STATUS = ["placed", "processing", "packed", "shipped", "out_for_delivery", "delivered", "cancelled"];

export default function Orders() {
  const [items, setItems] = useState([]);
  const [expanded, setExpanded] = useState(null);

  const load = () => api.get("/admin/orders").then(({ data }) => setItems(data));
  useEffect(load, []);

  const updateStatus = async (oid, status) => {
    await api.put(`/admin/orders/${oid}`, { status });
    toast.success("Updated"); load();
  };

  return (
    <div data-testid="admin-orders">
      <h1 className="font-display text-3xl uppercase font-black tracking-tight">Orders</h1>
      <div className="mt-8 bg-[var(--bg)] border border-[var(--border)] overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-[var(--surface)] text-[10px] uppercase tracking-[0.2em] font-mono">
            <tr><th className="p-3 text-left">Order</th><th className="p-3 text-left">Customer</th><th className="p-3 text-right">Total</th><th className="p-3 text-left">Payment</th><th className="p-3 text-left">Status</th></tr>
          </thead>
          <tbody>
            {items.map((o) => (
              <React.Fragment key={o.id}>
                <tr className="border-t border-[var(--border)] cursor-pointer hover:bg-[var(--surface)]" onClick={() => setExpanded(expanded === o.id ? null : o.id)}>
                  <td className="p-3 font-mono text-xs">{o.order_number}</td>
                  <td className="p-3">{o.shipping_address?.full_name}<div className="text-xs text-[var(--text-muted)]">{o.shipping_address?.email}</div></td>
                  <td className="p-3 text-right font-mono">{formatINR(o.total)}</td>
                  <td className="p-3 text-xs uppercase tracking-wide">{o.payment_status}</td>
                  <td className="p-3">
                    <select value={o.status} onClick={(e) => e.stopPropagation()} onChange={(e) => updateStatus(o.id, e.target.value)} className="bg-transparent border border-[var(--border)] px-2 py-1 text-xs uppercase">
                      {STATUS.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
                    </select>
                  </td>
                </tr>
                {expanded === o.id && (
                  <tr className="bg-[var(--surface)]">
                    <td colSpan={5} className="p-5">
                      <div className="grid md:grid-cols-2 gap-6">
                        <div>
                          <div className="text-[10px] uppercase tracking-[0.3em] font-mono mb-2">Items</div>
                          {o.items.map((it, i) => <div key={i} className="text-sm">{it.qty}× {it.name} (Size {it.size}) — {formatINR(it.price * it.qty)}</div>)}
                        </div>
                        <div>
                          <div className="text-[10px] uppercase tracking-[0.3em] font-mono mb-2">Address</div>
                          <div className="text-sm">{o.shipping_address.full_name}<br/>{o.shipping_address.phone}<br/>{o.shipping_address.line1}, {o.shipping_address.line2}<br/>{o.shipping_address.city}, {o.shipping_address.state} {o.shipping_address.pincode}</div>
                          <div className="text-xs text-[var(--text-muted)] mt-3">Paid: {formatINR(o.amount_paid)} • Due: {formatINR(o.amount_due)}</div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
