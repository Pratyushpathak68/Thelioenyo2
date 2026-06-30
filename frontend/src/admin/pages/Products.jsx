import React, { useEffect, useState } from "react";
import api from "@/services/api";
import { toast } from "sonner";
import { Plus, Copy, Trash2, Eye, EyeOff, Edit } from "lucide-react";
import { formatINR } from "@/utils/format";

const empty = { slug: "", name: "", description: "", price: 0, sale_price: null, images: [], collection_slug: "", sizes: [{size:"XS",stock:0},{size:"S",stock:0},{size:"M",stock:0},{size:"L",stock:0},{size:"XL",stock:0},{size:"XXL",stock:0}], fabric: "", gsm: "", fit: "", care: "", tags: [], is_featured: false, is_hidden: false, size_chart_image: "" };

export default function Products() {
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);
  const [collections, setCollections] = useState([]);

  const load = () => api.get("/admin/products", { params: { limit: 1000 } }).then(({ data }) => setItems(data));
  useEffect(() => { load(); api.get("/collections").then(({ data }) => setCollections(data)); }, []);

  const save = async () => {
    try {
      const body = { ...editing };
      const col = collections.find((c) => c.slug === body.collection_slug);
      if (col) body.collection_id = col.id;
      body.price = parseFloat(body.price);
      if (body.sale_price === "" || body.sale_price === null) body.sale_price = null; else body.sale_price = parseFloat(body.sale_price);
      if (typeof body.tags === "string") body.tags = body.tags.split(",").map((t) => t.trim()).filter(Boolean);
      body.sizes = body.sizes.map((s) => ({ size: s.size, stock: parseInt(s.stock) || 0 }));
      if (body.id) await api.put(`/admin/products/${body.id}`, body);
      else await api.post("/admin/products", body);
      toast.success("Saved"); setEditing(null); load();
    } catch (e) { toast.error(e?.response?.data?.detail || "Save failed"); }
  };

  const upload = async (file, key) => {
    const fd = new FormData(); fd.append("file", file);
    const { data } = await api.post("/admin/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
    if (key === "size_chart_image") setEditing({ ...editing, size_chart_image: data.url });
    else setEditing({ ...editing, images: [...(editing.images || []), data.url] });
  };

  const del = async (id) => { if (!window.confirm("Delete this product?")) return; await api.delete(`/admin/products/${id}`); load(); };
  const dup = async (id) => { await api.post(`/admin/products/${id}/duplicate`); load(); toast.success("Duplicated"); };
  const toggleHide = async (p) => { await api.put(`/admin/products/${p.id}`, { is_hidden: !p.is_hidden }); load(); };

  if (editing) {
    return (
      <div data-testid="admin-product-form">
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-display text-3xl uppercase font-black tracking-tight">{editing.id ? "Edit Product" : "New Product"}</h1>
          <div className="flex gap-2">
            <button onClick={() => setEditing(null)} className="px-5 py-2 text-xs uppercase tracking-[0.2em] border border-[var(--border)]">Cancel</button>
            <button data-testid="prod-save" onClick={save} className="bg-[var(--text)] text-[var(--bg)] px-5 py-2 text-xs uppercase tracking-[0.2em]">Save</button>
          </div>
        </div>
        <div className="grid md:grid-cols-2 gap-5">
          <Field label="Name"><input className="w-full bg-transparent border-b border-[var(--border)] py-2" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value, slug: editing.slug || e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-") })} /></Field>
          <Field label="Slug"><input data-testid="prod-slug" className="w-full bg-transparent border-b border-[var(--border)] py-2 font-mono" value={editing.slug} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} /></Field>
          <Field label="Price (₹)"><input type="number" className="w-full bg-transparent border-b border-[var(--border)] py-2" value={editing.price} onChange={(e) => setEditing({ ...editing, price: e.target.value })} /></Field>
          <Field label="Sale Price (₹)"><input type="number" className="w-full bg-transparent border-b border-[var(--border)] py-2" value={editing.sale_price ?? ""} onChange={(e) => setEditing({ ...editing, sale_price: e.target.value })} /></Field>
          <Field label="Collection">
            <select className="w-full bg-transparent border-b border-[var(--border)] py-2" value={editing.collection_slug || ""} onChange={(e) => setEditing({ ...editing, collection_slug: e.target.value })}>
              <option value="">—</option>
              {collections.map((c) => <option key={c.id} value={c.slug}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Fit"><input className="w-full bg-transparent border-b border-[var(--border)] py-2" value={editing.fit} onChange={(e) => setEditing({ ...editing, fit: e.target.value })} /></Field>
          <Field label="Fabric"><input className="w-full bg-transparent border-b border-[var(--border)] py-2" value={editing.fabric} onChange={(e) => setEditing({ ...editing, fabric: e.target.value })} /></Field>
          <Field label="GSM"><input className="w-full bg-transparent border-b border-[var(--border)] py-2" value={editing.gsm} onChange={(e) => setEditing({ ...editing, gsm: e.target.value })} /></Field>
          <Field label="Care"><input className="w-full bg-transparent border-b border-[var(--border)] py-2" value={editing.care} onChange={(e) => setEditing({ ...editing, care: e.target.value })} /></Field>
          <Field label="Tags (comma)"><input className="w-full bg-transparent border-b border-[var(--border)] py-2" value={Array.isArray(editing.tags) ? editing.tags.join(", ") : editing.tags} onChange={(e) => setEditing({ ...editing, tags: e.target.value })} /></Field>
        </div>
        <Field label="Description" className="mt-5"><textarea rows={4} className="w-full bg-transparent border border-[var(--border)] p-3" value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></Field>

        <Field label="Sizes & Stock" className="mt-5">
          <div className="grid grid-cols-6 gap-2">
            {editing.sizes.map((s, i) => (
              <div key={s.size} className="border border-[var(--border)] p-3 text-center">
                <div className="text-xs font-mono">{s.size}</div>
                <input type="number" min={0} className="w-full bg-transparent text-center mt-2 border-b border-[var(--border)]" value={s.stock} onChange={(e) => { const arr = [...editing.sizes]; arr[i] = { ...s, stock: e.target.value }; setEditing({ ...editing, sizes: arr }); }} />
              </div>
            ))}
          </div>
        </Field>

        <Field label="Images" className="mt-5">
          <input type="file" accept="image/*" multiple onChange={(e) => Array.from(e.target.files).forEach((f) => upload(f, "images"))} className="text-xs" />
          <div className="grid grid-cols-4 gap-2 mt-3">
            {(editing.images || []).map((src, i) => (
              <div key={i} className="relative">
                <img src={src.startsWith("http") ? src : `${process.env.REACT_APP_BACKEND_URL}${src}`} alt="" className="w-full aspect-square object-cover" />
                <button onClick={() => setEditing({ ...editing, images: editing.images.filter((_, x) => x !== i) })} className="absolute top-1 right-1 bg-[var(--bg)] p-1"><Trash2 size={12} /></button>
              </div>
            ))}
          </div>
        </Field>

        <Field label="Size Chart Image" className="mt-5">
          <input type="file" accept="image/*" onChange={(e) => e.target.files[0] && upload(e.target.files[0], "size_chart_image")} className="text-xs" />
          {editing.size_chart_image && <img src={editing.size_chart_image.startsWith("http") ? editing.size_chart_image : `${process.env.REACT_APP_BACKEND_URL}${editing.size_chart_image}`} alt="" className="mt-3 max-w-xs" />}
        </Field>

        <div className="mt-5 flex gap-6 text-sm">
          <label className="flex items-center gap-2"><input type="checkbox" checked={editing.is_featured} onChange={(e) => setEditing({ ...editing, is_featured: e.target.checked })} /> Featured</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={editing.is_hidden} onChange={(e) => setEditing({ ...editing, is_hidden: e.target.checked })} /> Hidden</label>
        </div>

        <div className="mt-10 pt-6 border-t border-[var(--border)]">
          <div className="text-[10px] uppercase tracking-[0.3em] font-mono text-[var(--text-muted)] mb-4">SEO</div>
          <div className="grid md:grid-cols-2 gap-5">
            <Field label="Meta Title"><input className="w-full bg-transparent border-b border-[var(--border)] py-2" value={editing.seo_title || ""} onChange={(e) => setEditing({ ...editing, seo_title: e.target.value })} placeholder={editing.name} /></Field>
            <Field label="Meta Keywords"><input className="w-full bg-transparent border-b border-[var(--border)] py-2" value={editing.seo_keywords || ""} onChange={(e) => setEditing({ ...editing, seo_keywords: e.target.value })} placeholder="streetwear, oversized, premium" /></Field>
            <Field label="OG Image URL" className="md:col-span-2"><input className="w-full bg-transparent border-b border-[var(--border)] py-2 text-sm" value={editing.og_image || ""} onChange={(e) => setEditing({ ...editing, og_image: e.target.value })} placeholder="Falls back to first product image" /></Field>
            <Field label="Meta Description" className="md:col-span-2"><textarea rows={3} className="w-full bg-transparent border border-[var(--border)] p-3" value={editing.seo_description || ""} onChange={(e) => setEditing({ ...editing, seo_description: e.target.value })} placeholder="160-character summary for Google search results" /></Field>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="admin-products">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl uppercase font-black tracking-tight">Products</h1>
        <button data-testid="new-product-btn" onClick={() => setEditing({ ...empty })} className="bg-[var(--text)] text-[var(--bg)] px-5 py-2 text-xs uppercase tracking-[0.2em] flex items-center gap-2"><Plus size={14} /> New</button>
      </div>
      <div className="mt-8 bg-[var(--bg)] border border-[var(--border)]">
        {items.map((p) => (
          <div key={p.id} className="flex items-center gap-4 p-4 border-b border-[var(--border)]">
            <img src={p.images?.[0]?.startsWith("http") ? p.images[0] : `${process.env.REACT_APP_BACKEND_URL}${p.images?.[0] || ""}`} alt="" className="w-14 h-16 object-cover bg-[var(--surface)]" />
            <div className="flex-1">
              <div className="text-sm font-medium">{p.name} {p.is_hidden && <span className="text-xs text-[var(--text-muted)] ml-2">[Hidden]</span>}</div>
              <div className="text-xs text-[var(--text-muted)] font-mono mt-1">/{p.slug} • {p.collection_slug}</div>
            </div>
            <div className="font-mono text-sm">{formatINR(p.sale_price || p.price)}</div>
            <div className="flex gap-2">
              <button onClick={() => toggleHide(p)} className="p-2 border border-[var(--border)]" title="Toggle visibility">{p.is_hidden ? <EyeOff size={14} /> : <Eye size={14} />}</button>
              <button onClick={() => dup(p.id)} className="p-2 border border-[var(--border)]" title="Duplicate"><Copy size={14} /></button>
              <button onClick={() => setEditing(p)} className="p-2 border border-[var(--border)]"><Edit size={14} /></button>
              <button onClick={() => del(p.id)} className="p-2 border border-[var(--border)]"><Trash2 size={14} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Field({ label, children, className = "" }) {
  return (
    <div className={className}>
      <div className="text-[10px] uppercase tracking-[0.25em] font-mono text-[var(--text-muted)] mb-1">{label}</div>
      {children}
    </div>
  );
}
