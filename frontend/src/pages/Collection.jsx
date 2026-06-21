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
    <div data-testid="collection-page">
      {/* Collection Hero */}
      <section className="relative h-[60vh] md:h-[75vh] w-full overflow-hidden bg-black">
        {(collection?.cover_image || slug === "all") && (
          <img
            src={collection?.cover_image || "https://images.unsplash.com/photo-1542838686-37da4a9fd1b3?w=1920&q=80"}
            alt={collection?.name || slug}
            className="absolute inset-0 w-full h-full object-cover opacity-70"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
        <div className="relative h-full max-w-screen-2xl mx-auto px-5 md:px-10 flex flex-col justify-end pb-12 md:pb-16 text-white fade-up">
          <div className="flex items-center gap-3 text-[#3b6bff] font-mono text-[10px] md:text-xs uppercase tracking-[0.35em]">
            <span className="inline-block w-1.5 h-1.5 bg-[#3b6bff]" />
            Collection
            <span className="inline-block w-16 h-px bg-[#3b6bff]" />
          </div>
          <h1 className="font-display text-5xl md:text-7xl lg:text-8xl uppercase font-black tracking-tighter mt-4">{collection?.name || slug}</h1>
          {collection?.description && <p className="text-white/70 mt-4 max-w-2xl text-sm md:text-base">{collection.description}</p>}
          <div className="mt-4 text-xs uppercase tracking-[0.2em] font-mono text-white/60">{products.length} Pieces</div>
        </div>
      </section>

      <div className="max-w-screen-2xl mx-auto px-5 md:px-10 pt-12 pb-32">
      {loading ? (
        <div className="text-sm uppercase tracking-[0.2em] text-[var(--text-muted)]">Loading…</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-14">
          {products.map((p, i) => <ProductCard key={p.id} p={p} index={i} />)}
        </div>
      )}
      </div>
    </div>
  );
}
