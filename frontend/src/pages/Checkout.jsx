import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "@/contexts/StoreContext";
import api from "@/services/api";
import { formatINR, resolveAsset } from "@/utils/format";
import { toast } from "sonner";
import GoogleLoginButton from "@/components/GoogleLoginButton";

export default function Checkout() {
  const { cart, subtotal, settings, clearCart, user } = useStore();
  const navigate = useNavigate();
  const [coupon, setCoupon] = useState("");
  const [discount, setDiscount] = useState(0);
  const [appliedCode, setAppliedCode] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("prepaid");
  const [addr, setAddr] = useState({ full_name: user?.name || "", phone: "", email: user?.email || "", line1: "", line2: "", city: "", state: "", pincode: "", country: "India" });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.async = true;
    document.body.appendChild(s);
    return () => { document.body.removeChild(s); };
  }, []);

  useEffect(() => { window.scrollTo(0, 0); if (cart.length === 0) navigate("/collection/all"); }, [cart, navigate]);

  const shipping = subtotal >= (settings?.free_shipping_threshold || 2999) ? 0 : (settings?.shipping_fee || 120);
  const codFee = paymentMethod === "partial_cod" ? (settings?.cod_fee || 0) : 0;
  const total = Math.max(0, subtotal + shipping + codFee - discount);
  const advance = settings?.cod_advance || 150;

  const applyCoupon = async () => {
    if (!coupon) return;
    try {
      const { data } = await api.post("/coupons/validate", { code: coupon, subtotal });
      setDiscount(data.discount); setAppliedCode(data.code);
      toast.success(`Coupon ${data.code} applied — ${formatINR(data.discount)} off`);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Invalid coupon");
    }
  };

  const placeOrder = async () => {
    for (const k of ["full_name", "phone", "email", "line1", "city", "state", "pincode"]) {
      if (!addr[k]) return toast.error(`Please fill ${k.replace("_", " ")}`);
    }
    setLoading(true);
    try {
      const items = cart.map((c) => ({
        product_id: c.product_id, product_slug: c.product_slug, name: c.name,
        image: c.image, size: c.size, qty: c.qty, price: c.price,
      }));
      const body = {
        items, subtotal, discount, shipping, cod_fee: codFee, total,
        payment_method: paymentMethod, coupon_code: appliedCode || null,
        shipping_address: addr, user_email: addr.email,
      };
      const { data } = await api.post("/orders/create", body);
      const rzp = data.razorpay;

      const options = {
        key: rzp.key_id, amount: rzp.amount, currency: rzp.currency, order_id: rzp.order_id,
        name: "THE LIONEYO", description: paymentMethod === "partial_cod" ? `Advance ₹${advance} • Remaining COD` : "Order Payment",
        prefill: { name: addr.full_name, email: addr.email, contact: addr.phone },
        theme: { color: "#000000" },
        handler: async (resp) => {
          try {
            await api.post("/orders/verify", {
              razorpay_order_id: resp.razorpay_order_id,
              razorpay_payment_id: resp.razorpay_payment_id,
              razorpay_signature: resp.razorpay_signature,
            });
            toast.success("Payment successful!");
            clearCart();
            navigate(`/order/success/${data.order.order_number}`);
          } catch (e) {
            toast.error("Payment verification failed. Contact support.");
          }
        },
        modal: { ondismiss: () => setLoading(false) },
      };
      // eslint-disable-next-line no-undef
      const rp = new window.Razorpay(options);
      rp.open();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Order failed");
      setLoading(false);
    }
  };

  return (
    <div data-testid="checkout-page" className="max-w-screen-2xl mx-auto px-5 md:px-10 pt-8 pb-32 grid lg:grid-cols-[1.4fr_1fr] gap-12">
      {/* Form */}
      <div>
        <h1 className="font-display text-3xl md:text-4xl uppercase font-black tracking-tight">Checkout</h1>

        <GoogleLoginButton onLogin={(u) => setAddr({ ...addr, full_name: u.name, email: u.email })} />

        <div className="mt-10">
          <div className="text-[10px] uppercase tracking-[0.3em] font-mono text-[var(--text-muted)] mb-4">01 — Shipping</div>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              ["full_name", "Full Name"], ["phone", "Phone"], ["email", "Email"],
              ["line1", "Address Line 1"], ["line2", "Address Line 2 (optional)"],
              ["city", "City"], ["state", "State"], ["pincode", "Pincode"],
            ].map(([k, label]) => (
              <div key={k} className={k === "line1" || k === "line2" ? "md:col-span-2" : ""}>
                <label className="text-[10px] uppercase tracking-[0.25em] font-mono text-[var(--text-muted)]">{label}</label>
                <input
                  data-testid={`addr-${k}`}
                  value={addr[k]}
                  onChange={(e) => setAddr({ ...addr, [k]: e.target.value })}
                  className="mt-1 w-full bg-transparent border-b border-[var(--border)] focus:border-[var(--text)] outline-none py-2 text-sm"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10">
          <div className="text-[10px] uppercase tracking-[0.3em] font-mono text-[var(--text-muted)] mb-4">02 — Payment</div>
          <div className="space-y-2">
            <label data-testid="pm-prepaid" className={`flex items-start gap-3 p-4 border cursor-pointer ${paymentMethod === "prepaid" ? "border-[var(--text)]" : "border-[var(--border)]"}`}>
              <input type="radio" checked={paymentMethod === "prepaid"} onChange={() => setPaymentMethod("prepaid")} />
              <div>
                <div className="text-sm font-medium uppercase tracking-wide">Pay Online (Razorpay)</div>
                <div className="text-xs text-[var(--text-muted)] mt-1">UPI, Cards, Wallets, Netbanking</div>
              </div>
            </label>
            {settings?.cod_enabled && (
              <label data-testid="pm-partial-cod" className={`flex items-start gap-3 p-4 border cursor-pointer ${paymentMethod === "partial_cod" ? "border-[var(--text)]" : "border-[var(--border)]"}`}>
                <input type="radio" checked={paymentMethod === "partial_cod"} onChange={() => setPaymentMethod("partial_cod")} />
                <div>
                  <div className="text-sm font-medium uppercase tracking-wide">Partial COD — Pay ₹{advance} Now</div>
                  <div className="text-xs text-[var(--text-muted)] mt-1">Pay ₹{advance} advance online, remaining ₹{Math.max(0, total - advance)} on delivery</div>
                </div>
              </label>
            )}
          </div>
        </div>

        <button data-testid="place-order-btn" disabled={loading} onClick={placeOrder} className="mt-10 w-full bg-[var(--text)] text-[var(--bg)] py-5 uppercase text-xs tracking-[0.3em] hover:opacity-80 disabled:opacity-50">
          {loading ? "Processing…" : (paymentMethod === "partial_cod" ? `Pay ₹${advance} Now • Place Order` : `Pay ${formatINR(total)} • Place Order`)}
        </button>

        <div className="mt-6 grid grid-cols-2 md:grid-cols-3 gap-2 text-xs text-[var(--text-muted)]">
          {(settings?.trust_badges || []).slice(0, 6).map((t) => (
            <div key={t} className="flex items-center gap-2"><span>✓</span> {t}</div>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="border border-[var(--border)] p-6 h-fit lg:sticky lg:top-24">
        <div className="text-[10px] uppercase tracking-[0.3em] font-mono text-[var(--text-muted)] mb-4">Order Summary</div>
        <div className="space-y-3 max-h-60 overflow-y-auto">
          {cart.map((it, i) => (
            <div key={i} className="flex gap-3 text-sm">
              <img src={resolveAsset(it.image)} alt="" className="w-14 h-16 object-cover bg-[var(--surface)]" />
              <div className="flex-1">
                <div className="text-xs">{it.name}</div>
                <div className="text-[10px] text-[var(--text-muted)] font-mono">Size {it.size} • Qty {it.qty}</div>
              </div>
              <div className="font-mono text-xs">{formatINR(it.price * it.qty)}</div>
            </div>
          ))}
        </div>

        <div className="mt-5 flex gap-2">
          <input data-testid="coupon-input" value={coupon} onChange={(e) => setCoupon(e.target.value.toUpperCase())} placeholder="COUPON CODE" className="flex-1 bg-transparent border border-[var(--border)] focus:border-[var(--text)] outline-none px-3 py-2 text-xs font-mono uppercase" />
          <button data-testid="coupon-apply" onClick={applyCoupon} className="bg-[var(--text)] text-[var(--bg)] px-4 text-xs uppercase tracking-[0.2em]">Apply</button>
        </div>

        <div className="mt-5 space-y-2 text-sm border-t border-[var(--border)] pt-4">
          <div className="flex justify-between"><span>Subtotal</span><span className="font-mono">{formatINR(subtotal)}</span></div>
          {discount > 0 && <div className="flex justify-between text-green-700 dark:text-green-400"><span>Discount ({appliedCode})</span><span className="font-mono">−{formatINR(discount)}</span></div>}
          <div className="flex justify-between"><span>Shipping</span><span className="font-mono">{shipping === 0 ? "FREE" : formatINR(shipping)}</span></div>
          {codFee > 0 && <div className="flex justify-between"><span>COD Fee</span><span className="font-mono">{formatINR(codFee)}</span></div>}
          <div className="flex justify-between text-base font-medium border-t border-[var(--border)] pt-3"><span>Total</span><span className="font-mono">{formatINR(total)}</span></div>
          {paymentMethod === "partial_cod" && (
            <div className="text-xs text-[var(--text-muted)] mt-2 font-mono">
              Pay now: <span className="text-[var(--text)]">{formatINR(advance)}</span><br/>
              On delivery: <span className="text-[var(--text)]">{formatINR(Math.max(0, total - advance))}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
