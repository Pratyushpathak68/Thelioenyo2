import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Heart, Share2 } from "lucide-react";
import { useStore } from "@/contexts/StoreContext";
import { formatINR, resolveAsset } from "@/utils/format";

export default function ProductCard({ p, index = 0 }) {
  const { wishlist, toggleWish } = useStore();
  const [hover, setHover] = useState(false);
  const discount = p.sale_price && p.price > p.sale_price ? Math.round((1 - p.sale_price / p.price) * 100) : 0;
  const img1 = resolveAsset(p.images?.[0]);
  const img2 = resolveAsset(p.images?.[1] || p.images?.[0]);

  const onShare = async (e) => {
    e.preventDefault(); e.stopPropagation();
    const url = `${window.location.origin}/product/${p.slug}`;
    if (navigator.share) {
      try { await navigator.share({ title: p.name, url }); } catch (_) {}
    } else {
      await navigator.clipboard.writeText(url);
    }
  };

  return (
    <Link
      data-testid={`product-card-${p.slug}`}
      to={`/product/${p.slug}`}
      className="group block fade-up"
      style={{ animationDelay: `${index * 60}ms` }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div className="relative aspect-[4/5] bg-[var(--surface)] zoom-wrap overflow-hidden">
        <img
          src={hover ? img2 : img1}
          alt={p.name}
          loading="lazy"
          className="w-full h-full object-cover transition-opacity duration-500"
        />
        {discount > 0 && (
          <span className="absolute top-3 left-3 bg-[var(--text)] text-[var(--bg)] text-[10px] uppercase tracking-[0.2em] font-mono px-2 py-1">−{discount}%</span>
        )}
        <div className="absolute top-3 right-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            data-testid={`wishlist-${p.slug}`}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleWish(p.id); }}
            className="bg-[var(--bg)] p-2"
            aria-label="Wishlist"
          >
            <Heart size={14} fill={wishlist.includes(p.id) ? "currentColor" : "none"} />
          </button>
          <button data-testid={`share-${p.slug}`} onClick={onShare} className="bg-[var(--bg)] p-2" aria-label="Share">
            <Share2 size={14} />
          </button>
        </div>
      </div>
      <div className="pt-4 pb-2">
        <div className="text-sm md:text-base font-medium leading-tight">{p.name}</div>
        <div className="mt-2 flex items-baseline gap-2 font-mono text-sm">
          {p.sale_price ? (
            <>
              <span>{formatINR(p.sale_price)}</span>
              <span className="text-[var(--text-muted)] line-through text-xs">{formatINR(p.price)}</span>
            </>
          ) : (
            <span>{formatINR(p.price)}</span>
          )}
        </div>
      </div>
    </Link>
  );
}
