import React from "react";
import { Link, useParams } from "react-router-dom";
import { Check } from "lucide-react";

export default function OrderSuccess() {
  const { orderNumber } = useParams();
  return (
    <div data-testid="order-success" className="max-w-2xl mx-auto px-5 md:px-10 py-32 text-center">
      <div className="inline-flex w-16 h-16 items-center justify-center border border-[var(--text)] fade-up">
        <Check size={28} />
      </div>
      <h1 className="font-display text-4xl md:text-5xl uppercase font-black tracking-tighter mt-6 fade-up" style={{ animationDelay: "100ms" }}>Order Placed</h1>
      <p className="mt-4 text-[var(--text-muted)] fade-up" style={{ animationDelay: "200ms" }}>Thank you for choosing THE LIONEYO. A confirmation has been sent to your email.</p>
      <div className="mt-6 font-mono text-lg">{orderNumber}</div>
      <div className="mt-10 flex gap-3 justify-center">
        <Link to={`/track/${orderNumber}`} className="bg-[var(--text)] text-[var(--bg)] px-8 py-4 uppercase text-xs tracking-[0.3em] hover:opacity-80">Track Order</Link>
        <Link to="/collection/all" className="border border-[var(--text)] px-8 py-4 uppercase text-xs tracking-[0.3em] hover:bg-[var(--text)] hover:text-[var(--bg)]">Continue Shopping</Link>
      </div>
    </div>
  );
}
