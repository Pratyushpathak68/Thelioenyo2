import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { X, Plus, Minus, Trash2 } from "lucide-react";
import { useStore } from "@/contexts/StoreContext";
import { formatINR, resolveAsset } from "@/utils/format";

export default function CartDrawer() {
  const { cartOpen, setCartOpen, cart, updateQty, removeItem, subtotal, settings } = useStore();
  const navigate = useNavigate();
  if (!cartOpen) return null;
  const shipping = subtotal >= (settings?.free_shipping_threshold || 2999) || cart.length === 0 ? 0 : (settings?.shipping_fee || 120);
  return (
    <div data-testid="cart-drawer" className="fixed inset-0 z-[70] flex justify-end" onClick={() => setCartOpen(false)}>
      <div className="absolute inset-0 bg-black/50" />
      <aside onClick={(e) => e.stopPropagation()} className="relative bg-[var(--bg)] w-full sm:w-[460px] h-full flex flex-col border-l border-[var(--border)]">
        <div className="p-5 flex items-center justify-between border-b border-[var(--border)]">
          <div className="font-display uppercase tracking-tight text-xl">Your Bag</div>
          <button data-testid="cart-close" onClick={() => setCartOpen(false)}><X size={20} /></button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {cart.length === 0 ? (
            <div className="p-10 text-center text-sm text-[var(--text-muted)]">
              Your bag is empty.<br/>
              <Link onClick={() => setCartOpen(false)} to="/collection/all" className="link-underline mt-4 inline-block uppercase tracking-[0.2em] text-xs">Continue Shopping</Link>
            </div>
          ) : cart.map((it, idx) => (
            <div key={`${it.product_id}-${it.size}-${idx}`} className="flex gap-4 p-5 border-b border-[var(--border)]">
              <img src={resolveAsset(it.image)} alt={it.name} className="w-20 h-24 object-cover bg-[var(--surface)]" />
              <div className="flex-1">
                <div className="text-sm font-medium">{it.name}</div>
                <div className="text-xs text-[var(--text-muted)] mt-1 font-mono">Size: {it.size}</div>
                <div className="flex items-center justify-between mt-3">
                  <div className="inline-flex items-center border border-[var(--border)]">
                    <button data-testid={`qty-dec-${idx}`} onClick={() => updateQty(idx, it.qty - 1)} className="px-2 py-1"><Minus size={12} /></button>
                    <span className="px-3 text-sm font-mono">{it.qty}</span>
                    <button data-testid={`qty-inc-${idx}`} onClick={() => updateQty(idx, it.qty + 1)} className="px-2 py-1"><Plus size={12} /></button>
                  </div>
                  <button data-testid={`remove-${idx}`} onClick={() => removeItem(idx)}><Trash2 size={14} /></button>
                </div>
              </div>
              <div className="font-mono text-sm">{formatINR(it.price * it.qty)}</div>
            </div>
          ))}
        </div>
        {cart.length > 0 && (
          <div className="border-t border-[var(--border)] p-5 space-y-3">
            <div className="flex justify-between text-sm"><span>Subtotal</span><span className="font-mono">{formatINR(subtotal)}</span></div>
            <div className="flex justify-between text-sm"><span>Shipping</span><span className="font-mono">{shipping === 0 ? "FREE" : formatINR(shipping)}</span></div>
            <div className="flex justify-between text-base font-medium pt-2 border-t border-[var(--border)]"><span>Total</span><span className="font-mono">{formatINR(subtotal + shipping)}</span></div>
            <button data-testid="cart-checkout" onClick={() => { setCartOpen(false); navigate("/checkout"); }} className="w-full bg-[var(--text)] text-[var(--bg)] py-4 uppercase text-xs tracking-[0.3em] hover:opacity-80">Checkout</button>
          </div>
        )}
      </aside>
    </div>
  );
}
