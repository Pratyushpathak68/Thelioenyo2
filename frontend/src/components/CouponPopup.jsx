import React, { useEffect, useState } from "react";
import { useStore } from "@/contexts/StoreContext";
import api from "@/services/api";
import { X, Copy, Check } from "lucide-react";

export default function CouponPopup() {
  const { settings } = useStore();
  const [coupon, setCoupon] = useState(null);
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const seen = sessionStorage.getItem("lioneyo_popup_seen");
    if (seen) return;
    api.get("/coupons/popup").then(({ data }) => {
      if (data && data.code) {
        setCoupon(data);
        setTimeout(() => setOpen(true), 1500);
      }
    }).catch(() => {});
  }, []);

  const copy = async () => {
    await navigator.clipboard.writeText(coupon.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const close = () => {
    setOpen(false);
    sessionStorage.setItem("lioneyo_popup_seen", "1");
  };

  if (!open || !coupon) return null;
  return (
    <div data-testid="coupon-popup" className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm flex items-center justify-center p-5" onClick={close}>
      <div onClick={(e) => e.stopPropagation()} className="bg-[var(--bg)] text-[var(--text)] max-w-md w-full p-10 relative border border-[var(--border)]">
        <button data-testid="coupon-close" onClick={close} className="absolute top-4 right-4"><X size={18} /></button>
        <div className="text-[10px] uppercase tracking-[0.3em] font-mono text-[var(--text-muted)]">Limited Offer</div>
        <h3 className="font-display text-3xl md:text-4xl uppercase font-black tracking-tighter mt-3">
          {coupon.discount_type === "flat" ? `₹${coupon.discount_value} OFF` : `${coupon.discount_value}% OFF`}
        </h3>
        <p className="text-sm text-[var(--text-muted)] mt-3">Apply code at checkout to redeem. Minimum order ₹{coupon.min_order}.</p>
        <div className="mt-6 border border-dashed border-[var(--text)] px-5 py-4 flex items-center justify-between">
          <div className="font-mono text-lg tracking-[0.2em]">{coupon.code}</div>
          <button data-testid="coupon-copy" onClick={copy} className="flex items-center gap-2 text-xs uppercase tracking-[0.2em]">
            {copied ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy</>}
          </button>
        </div>
        <button data-testid="coupon-shop-cta" onClick={() => { close(); window.location.href = "/collection/all"; }} className="mt-6 w-full bg-[var(--text)] text-[var(--bg)] py-4 uppercase text-xs tracking-[0.3em] hover:opacity-80">
          {coupon.popup_button_text || "Shop Now"}
        </button>
      </div>
    </div>
  );
}
