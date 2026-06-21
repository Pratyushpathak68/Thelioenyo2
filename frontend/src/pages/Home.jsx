import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import api from "@/services/api";
import ProductCard from "@/components/ProductCard";
import { useStore } from "@/contexts/StoreContext";

export default function Home() {
  const { settings } = useStore();
  const [featured, setFeatured] = useState([]);
  const [collections, setCollections] = useState([]);

  useEffect(() => {
    api.get("/products", { params: { featured: true, limit: 8 } }).then(({ data }) => setFeatured(data));
    api.get("/collections").then(({ data }) => setCollections(data.filter((c) => c.is_featured)));
  }, []);

  return (
    <div data-testid="home-page">
      {/* HERO */}
      <section className="relative h-[88vh] md:h-screen w-full overflow-hidden">
        <img
          src={settings?.hero_image || "https://images.pexels.com/photos/10469630/pexels-photo-10469630.jpeg"}
          alt="Hero"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/30" />
        <div className="relative h-full max-w-screen-2xl mx-auto px-5 md:px-10 flex flex-col justify-end pb-16 md:pb-24 text-white fade-up">
          <div className="text-[10px] md:text-xs uppercase tracking-[0.4em] font-mono mb-4 opacity-80">Drop 01 — Available Now</div>
          <h1 className="font-display text-5xl md:text-7xl lg:text-8xl uppercase font-black tracking-tighter leading-[0.95] max-w-4xl">
            {settings?.hero_heading || "Crafted For Those Who Move Differently"}
          </h1>
          <p className="mt-5 max-w-xl text-sm md:text-base opacity-80">{settings?.hero_subheading || "Premium streetwear. Heavyweight fabrics. Limited drops."}</p>
          <div className="mt-8 flex gap-4">
            <Link data-testid="hero-shop-cta" to={settings?.hero_cta_link || "/collection/all"} className="inline-flex items-center gap-3 bg-white text-black px-8 py-4 uppercase text-xs tracking-[0.3em] hover:opacity-80 transition">
              {settings?.hero_cta_text || "Shop The Drop"} <ArrowRight size={14} />
            </Link>
            <Link to="/collection/anime" className="inline-flex items-center gap-3 border border-white px-8 py-4 uppercase text-xs tracking-[0.3em] hover:bg-white hover:text-black transition">
              Anime Collection
            </Link>
          </div>
        </div>
      </section>

      {/* COLLECTIONS */}
      <section className="max-w-screen-2xl mx-auto px-5 md:px-10 py-20 md:py-32">
        <div className="flex items-end justify-between mb-12">
          <div>
            <div className="text-[10px] uppercase tracking-[0.3em] font-mono text-[var(--text-muted)]">01 — Collections</div>
            <h2 className="font-display text-3xl md:text-5xl uppercase font-black tracking-tighter mt-2">Shop By Universe</h2>
          </div>
          <Link to="/collection/all" className="hidden md:inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] link-underline">View All <ArrowRight size={14} /></Link>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {collections.map((c, i) => (
            <Link data-testid={`collection-${c.slug}`} key={c.id} to={`/collection/${c.slug}`} className="relative block aspect-[3/4] zoom-wrap overflow-hidden group fade-up" style={{ animationDelay: `${i * 100}ms` }}>
              <img src={c.cover_image} alt={c.name} className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                <div className="text-[10px] uppercase tracking-[0.3em] font-mono opacity-80">0{i + 1}</div>
                <div className="font-display text-2xl md:text-3xl uppercase font-black tracking-tight">{c.name}</div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* FEATURED */}
      <section className="max-w-screen-2xl mx-auto px-5 md:px-10 pb-20 md:pb-32">
        <div className="flex items-end justify-between mb-12">
          <div>
            <div className="text-[10px] uppercase tracking-[0.3em] font-mono text-[var(--text-muted)]">02 — Featured</div>
            <h2 className="font-display text-3xl md:text-5xl uppercase font-black tracking-tighter mt-2">The Drop</h2>
          </div>
          <Link to="/collection/all" className="hidden md:inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] link-underline">All Products <ArrowRight size={14} /></Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-12">
          {featured.map((p, i) => <ProductCard key={p.id} p={p} index={i} />)}
        </div>
      </section>

      {/* MANIFESTO */}
      <section className="border-t border-[var(--border)] py-20 md:py-32">
        <div className="max-w-screen-2xl mx-auto px-5 md:px-10 grid md:grid-cols-2 gap-12 md:gap-24 items-center">
          <div>
            <div className="text-[10px] uppercase tracking-[0.3em] font-mono text-[var(--text-muted)]">03 — Manifesto</div>
            <h2 className="font-display text-3xl md:text-5xl uppercase font-black tracking-tighter mt-3">Built Heavy. Worn Loud.</h2>
            <p className="mt-6 text-[var(--text-muted)] leading-relaxed">
              We don't make basics. Every drop is engineered with premium fabrics — heavyweight 240 GSM cottons, garment-dyed finishes, and reinforced seams.
              Limited quantities. Real construction. Designed for the ones who treat their wardrobe like a uniform.
            </p>
            <Link to="/collection/all" className="inline-block mt-8 border border-[var(--text)] px-8 py-4 uppercase text-xs tracking-[0.3em] hover:bg-[var(--text)] hover:text-[var(--bg)] transition">Discover The Craft</Link>
          </div>
          <div className="aspect-[4/5] zoom-wrap overflow-hidden">
            <img src="https://images.unsplash.com/photo-1532332248682-206cc786359f?w=1200&q=80" alt="Craft" className="w-full h-full object-cover" />
          </div>
        </div>
      </section>
    </div>
  );
}
