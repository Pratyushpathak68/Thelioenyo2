import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "@/services/api";
import { Check, Package, Truck, Home, ShoppingBag } from "lucide-react";
import { formatINR } from "@/utils/format";

const steps = [
  { key: "placed", label: "Order Placed", Icon: ShoppingBag },
  { key: "processing", label: "Processing", Icon: Package },
  { key: "packed", label: "Packed", Icon: Package },
  { key: "shipped", label: "Shipped", Icon: Truck },
  { key: "out_for_delivery", label: "Out For Delivery", Icon: Truck },
  { key: "delivered", label: "Delivered", Icon: Home },
];

export default function OrderTracking() {
  const { orderNumber: routeOrder } = useParams();
  const [orderNumber, setOrderNumber] = useState(routeOrder || "");
  const [order, setOrder] = useState(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const track = async (num) => {
    setLoading(true); setErr("");
    try {
      const { data } = await api.get(`/orders/track/${num}`);
      setOrder(data);
    } catch (e) { setErr("Order not found"); setOrder(null); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (routeOrder) track(routeOrder); }, [routeOrder]);

  const currentIdx = order ? Math.max(0, steps.findIndex((s) => s.key === order.status)) : -1;

  return (
    <div data-testid="track-page" className="max-w-3xl mx-auto px-5 md:px-10 pt-12 pb-32">
      <div className="text-[10px] uppercase tracking-[0.3em] font-mono text-[var(--text-muted)]">Tracking</div>
      <h1 className="font-display text-4xl md:text-5xl uppercase font-black tracking-tighter mt-2">Track Your Order</h1>

      <div className="mt-10 flex gap-2">
        <input data-testid="track-input" value={orderNumber} onChange={(e) => setOrderNumber(e.target.value.toUpperCase())} placeholder="LE1234567890ABCD" className="flex-1 bg-transparent border border-[var(--border)] focus:border-[var(--text)] px-4 py-3 font-mono uppercase tracking-wider outline-none" />
        <button data-testid="track-btn" onClick={() => track(orderNumber)} className="bg-[var(--text)] text-[var(--bg)] px-6 uppercase text-xs tracking-[0.3em] hover:opacity-80">Track</button>
      </div>

      {loading && <div className="mt-6 text-sm uppercase tracking-[0.2em]">Loading…</div>}
      {err && <div className="mt-6 text-sm text-red-600">{err}</div>}

      {order && (
        <div className="mt-12">
          <div className="border border-[var(--border)] p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <div className="text-[10px] uppercase tracking-[0.3em] font-mono text-[var(--text-muted)]">Order</div>
                <div className="font-mono text-lg">{order.order_number}</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-[0.3em] font-mono text-[var(--text-muted)]">Total</div>
                <div className="font-mono text-lg">{formatINR(order.total)}</div>
              </div>
            </div>
          </div>

          <div className="mt-10">
            <ol className="space-y-6">
              {steps.map((s, i) => {
                const done = i <= currentIdx;
                return (
                  <li key={s.key} className="flex items-center gap-5">
                    <div className={`w-10 h-10 flex items-center justify-center border ${done ? "bg-[var(--text)] text-[var(--bg)] border-[var(--text)]" : "border-[var(--border)] text-[var(--text-muted)]"}`}>
                      {done ? <Check size={16} /> : <s.Icon size={16} />}
                    </div>
                    <div>
                      <div className={`text-sm uppercase tracking-[0.2em] ${done ? "" : "text-[var(--text-muted)]"}`}>{s.label}</div>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>

          {order.tracking_number && <div className="mt-8 text-sm font-mono">Tracking #: {order.tracking_number}</div>}
        </div>
      )}
    </div>
  );
}
