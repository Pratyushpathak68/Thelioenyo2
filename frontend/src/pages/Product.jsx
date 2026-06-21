import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Heart, Share2, Truck, Shield, RotateCcw, Award, ChevronDown, ChevronUp, X } from "lucide-react";
import api from "@/services/api";
import { useStore } from "@/contexts/StoreContext";
import { formatINR, resolveAsset } from "@/utils/format";
import ProductCard from "@/components/ProductCard";
import { toast } from "sonner";

const Accordion = ({ title, children, defaultOpen = false }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-[var(--border)]">
      <button data-testid={`acc-${title.toLowerCase().replace(/\s/g, "-")}`} onClick={() => setOpen(!open)} className="w-full flex items-center justify-between py-5 text-xs uppercase tracking-[0.25em]">
        <span>{title}</span>
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>
      {open && <div className="pb-5 text-sm text-[var(--text-muted)] leading-relaxed">{children}</div>}
    </div>
  );
};

export default function Product() {
  const { slug } = useParams();
  const { addToCart, wishlist, toggleWish, settings } = useStore();
  const [p, setP] = useState(null);
  const [related, setRelated] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [size, setSize] = useState(null);
  const [activeImg, setActiveImg] = useState(0);
  const [sizeChartOpen, setSizeChartOpen] = useState(false);
  const [viewers] = useState(Math.floor(Math.random() * 12) + 5);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
    setP(null); setSize(null); setActiveImg(0);
    api.get(`/products/${slug}`).then(({ data }) => {
      setP(data);
      api.get(`/reviews/${data.id}`).then((r) => setReviews(r.data)).catch(() => {});
    });
    api.get(`/products/${slug}/related`).then(({ data }) => setRelated(data));
  }, [slug]);

  if (!p) return <div className="max-w-screen-2xl mx-auto px-5 md:px-10 py-20 text-sm uppercase tracking-[0.2em]">Loading…</div>;

  const stockForSize = (sz) => p.sizes?.find((x) => x.size === sz)?.stock ?? 0;
  const totalStock = (p.sizes || []).reduce((s, x) => s + x.stock, 0);
  const lowStock = size && stockForSize(size) > 0 && stockForSize(size) <= (settings?.low_stock_threshold || 5);
  const discount = p.sale_price && p.price > p.sale_price ? Math.round((1 - p.sale_price / p.price) * 100) : 0;
  const eta = new Date(Date.now() + 5 * 86400000).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });

  const onAdd = () => {
    if (!size) return toast.error("Please select a size");
    if (stockForSize(size) === 0) return toast.error("Out of stock");
    addToCart({
      product_id: p.id, product_slug: p.slug, name: p.name,
      image: p.images?.[0] || "", size, qty: 1, price: p.sale_price || p.price,
    });
    toast.success("Added to bag");
  };

  const share = async () => {
    const url = `${window.location.origin}/product/${p.slug}`;
    if (navigator.share) {
      try { await navigator.share({ title: p.name, url }); return; } catch (_) {}
    }
    await navigator.clipboard.writeText(url);
    toast.success("Link copied");
  };

  return (
    <div data-testid="product-page" className="max-w-screen-2xl mx-auto px-5 md:px-10 pt-8 pb-32">
      <div className="text-xs uppercase tracking-[0.2em] font-mono text-[var(--text-muted)] mb-6">
        <Link to="/" className="link-underline">Home</Link> / <Link to={`/collection/${p.collection_slug}`} className="link-underline">{p.collection_slug}</Link> / <span>{p.name}</span>
      </div>

      <div className="grid md:grid-cols-2 gap-10 md:gap-16">
        {/* Gallery */}
        <div>
          <div className="aspect-[4/5] bg-[var(--surface)] zoom-wrap overflow-hidden">
            <img src={resolveAsset(p.images?.[activeImg])} alt={p.name} className="w-full h-full object-cover" />
          </div>
          <div className="grid grid-cols-4 gap-2 mt-2">
            {(p.images || []).map((src, i) => (
              <button key={i} data-testid={`thumb-${i}`} onClick={() => setActiveImg(i)} className={`aspect-square overflow-hidden ${i === activeImg ? "ring-1 ring-[var(--text)]" : ""}`}>
                <img src={resolveAsset(src)} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>

        {/* Info */}
        <div className="md:sticky md:top-24 md:self-start">
          {discount > 0 && <div className="text-[10px] uppercase tracking-[0.3em] font-mono mb-3 bg-[var(--text)] text-[var(--bg)] inline-block px-2 py-1">−{discount}% Off</div>}
          <h1 className="font-display text-3xl md:text-4xl uppercase font-black tracking-tight">{p.name}</h1>
          <div className="mt-4 flex items-baseline gap-3 font-mono">
            {p.sale_price ? (
              <>
                <span className="text-2xl">{formatINR(p.sale_price)}</span>
                <span className="text-[var(--text-muted)] line-through">{formatINR(p.price)}</span>
              </>
            ) : <span className="text-2xl">{formatINR(p.price)}</span>}
            <span className="text-xs text-[var(--text-muted)] ml-2">Incl. all taxes</span>
          </div>

          <p className="mt-6 text-sm text-[var(--text-muted)] leading-relaxed">{p.description}</p>

          {/* Size */}
          <div className="mt-8">
            <div className="flex items-center justify-between mb-3">
              <div className="text-[11px] uppercase tracking-[0.25em] font-mono">Select Size</div>
              {p.size_chart_image && (
                <button data-testid="size-chart-open" onClick={() => setSizeChartOpen(true)} className="text-[11px] uppercase tracking-[0.2em] link-underline">View Size Chart</button>
              )}
            </div>
            <div className="grid grid-cols-6 gap-2">
              {(p.sizes || []).map((s) => (
                <button
                  data-testid={`size-${s.size}`}
                  key={s.size}
                  disabled={s.stock === 0}
                  onClick={() => setSize(s.size)}
                  className={`py-3 text-sm font-mono border ${size === s.size ? "bg-[var(--text)] text-[var(--bg)] border-[var(--text)]" : "border-[var(--border)] hover:border-[var(--text)]"} ${s.stock === 0 ? "opacity-30 line-through cursor-not-allowed" : ""}`}
                >
                  {s.size}
                </button>
              ))}
            </div>
            {lowStock && <div className="text-xs text-red-600 mt-2 font-mono">⚠ Only {stockForSize(size)} left in size {size}</div>}
          </div>

          <div className="mt-4 text-xs font-mono text-[var(--text-muted)] flex items-center gap-4">
            <span>👁 {viewers} viewing now</span>
            {totalStock > 0 && <span>📦 {totalStock} in stock</span>}
          </div>

          {/* CTA */}
          <div className="mt-6 grid grid-cols-[1fr_auto_auto] gap-2">
            <button data-testid="add-to-cart-button" onClick={onAdd} className="bg-[var(--text)] text-[var(--bg)] py-4 uppercase text-xs tracking-[0.3em] hover:opacity-80">Add To Bag</button>
            <button data-testid="wishlist-btn" onClick={() => toggleWish(p.id)} className="border border-[var(--border)] p-4 hover:border-[var(--text)]"><Heart size={16} fill={wishlist.includes(p.id) ? "currentColor" : "none"} /></button>
            <button data-testid="share-btn" onClick={share} className="border border-[var(--border)] p-4 hover:border-[var(--text)]"><Share2 size={16} /></button>
          </div>

          <div className="mt-6 text-xs flex items-center gap-2 text-[var(--text-muted)] font-mono">
            <Truck size={14} /> Estimated delivery by <span className="text-[var(--text)]">{eta}</span>
          </div>

          {/* Trust */}
          <div className="mt-8 grid grid-cols-2 gap-3">
            {[{i: Shield, t: "Secure Checkout"}, {i: Truck, t: "Fast Shipping"}, {i: RotateCcw, t: "Easy Returns"}, {i: Award, t: "Premium Quality"}].map(({ i: Ic, t }) => (
              <div key={t} className="flex items-center gap-2 text-xs text-[var(--text-muted)]"><Ic size={14} /> {t}</div>
            ))}
          </div>

          {/* Details */}
          <div className="mt-10">
            <Accordion title="Description" defaultOpen>{p.description}</Accordion>
            <Accordion title="Fabric & Construction">
              <div className="space-y-1">
                {p.fabric && <div>Fabric: {p.fabric}</div>}
                {p.gsm && <div>GSM: {p.gsm}</div>}
                {p.fit && <div>Fit: {p.fit}</div>}
              </div>
            </Accordion>
            <Accordion title="Care Instructions">{p.care || "Machine wash cold. Do not bleach. Tumble dry low."}</Accordion>
            <Accordion title="Shipping & Returns">Standard delivery in 4–7 business days across India. Free shipping above ₹{settings?.free_shipping_threshold || 2999}. 7-day returns on unworn items.</Accordion>
          </div>
        </div>
      </div>

      {/* Reviews */}
      {reviews.length > 0 && (
        <section className="mt-24 border-t border-[var(--border)] pt-12">
          <h2 className="font-display text-2xl md:text-3xl uppercase font-black tracking-tight">Reviews</h2>
          <div className="mt-8 grid md:grid-cols-2 gap-6">
            {reviews.map((r) => (
              <div key={r.id} className="border border-[var(--border)] p-5">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span>{r.user_name} {r.verified_buyer && <span className="ml-1 text-green-600">✓ Verified</span>}</span>
                  <span>{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</span>
                </div>
                <p className="text-sm mt-3 text-[var(--text-muted)]">{r.text}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Related */}
      {related.length > 0 && (
        <section className="mt-24 border-t border-[var(--border)] pt-12">
          <h2 className="font-display text-2xl md:text-3xl uppercase font-black tracking-tight">You May Also Like</h2>
          <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-10">
            {related.slice(0, 4).map((rp, i) => <ProductCard key={rp.id} p={rp} index={i} />)}
          </div>
        </section>
      )}

      {/* Size chart modal */}
      {sizeChartOpen && p.size_chart_image && (
        <div data-testid="size-chart-modal" className="fixed inset-0 z-[80] bg-black/70 flex items-center justify-center p-5" onClick={() => setSizeChartOpen(false)}>
          <div className="relative max-w-3xl w-full" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setSizeChartOpen(false)} className="absolute -top-10 right-0 text-white"><X size={20} /></button>
            <img src={resolveAsset(p.size_chart_image)} alt="Size chart" className="w-full" />
          </div>
        </div>
      )}
    </div>
  );
}
