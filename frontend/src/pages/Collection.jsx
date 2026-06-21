import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "@/services/api";
import ProductCard from "@/components/ProductCard";

export default function Collection() {
  const { slug } = useParams();
  const [products, setProducts] = useState([]);
  const [collection, setCollection] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
    setLoading(true);
    const params = slug === "all" ? {} : { collection: slug };
    api.get("/products", { params }).then(({ data }) => setProducts(data)).finally(() => setLoading(false));
    if (slug !== "all") api.get(`/collections/${slug}`).then(({ data }) => setCollection(data)).catch(() => setCollection(null));
    else setCollection({ name: "All Products", description: "The complete catalog." });
  }, [slug]);

  return (
    <div data-testid="collection-page" className="max-w-screen-2xl mx-auto px-5 md:px-10 pt-12 pb-32">
      <div className="mb-10 md:mb-16 fade-up">
        <div className="text-[10px] uppercase tracking-[0.3em] font-mono text-[var(--text-muted)]">Collection</div>
        <h1 className="font-display text-4xl md:text-6xl lg:text-7xl uppercase font-black tracking-tighter mt-3">{collection?.name || slug}</h1>
        {collection?.description && <p className="text-[var(--text-muted)] mt-4 max-w-2xl">{collection.description}</p>}
        <div className="mt-4 text-xs uppercase tracking-[0.2em] font-mono text-[var(--text-muted)]">{products.length} Pieces</div>
      </div>
      {loading ? (
        <div className="text-sm uppercase tracking-[0.2em] text-[var(--text-muted)]">Loading…</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-14">
          {products.map((p, i) => <ProductCard key={p.id} p={p} index={i} />)}
        </div>
      )}
    </div>
  );
}
