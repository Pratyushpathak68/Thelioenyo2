import React, { useEffect, useState } from "react";
import api from "@/services/api";
import { toast } from "sonner";
import { Trash2, Plus } from "lucide-react";

export default function Collections() {
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);

  const load = () => api.get("/collections").then(({ data }) => setItems(data));
  useEffect(() => { load(); }, []);

  const save = async () => {
    try {
      if (editing.id) await api.put(`/admin/collections/${editing.id}`, editing);
      else await api.post("/admin/collections", editing);
      toast.success("Saved"); setEditing(null); load();
    } catch (e) { toast.error(e?.response?.data?.detail || "Failed"); }
  };

  const del = async (id) => { if (!window.confirm("Delete?")) return; await api.delete(`/admin/collections/${id}`); load(); };

  return (
    <div data-testid="admin-collections">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl uppercase font-black tracking-tight">Collections</h1>
        <button onClick={() => setEditing({ slug: "", name: "", description: "", cover_image: "", is_featured: false, order: 0 })} className="bg-[var(--text)] text-[var(--bg)] px-5 py-2 text-xs uppercase tracking-[0.2em] flex items-center gap-2"><Plus size={14} /> New</button>
      </div>

      {editing && (
        <div className="mt-6 bg-[var(--bg)] border border-[var(--border)] p-6 grid md:grid-cols-2 gap-4">
          <Input label="Name" value={editing.name} onChange={(v) => setEditing({ ...editing, name: v, slug: editing.slug || v.toLowerCase().replace(/[^a-z0-9]+/g, "-") })} />
          <Input label="Slug" value={editing.slug} onChange={(v) => setEditing({ ...editing, slug: v })} />
          <Input label="Cover Image URL" value={editing.cover_image || ""} onChange={(v) => setEditing({ ...editing, cover_image: v })} />
          <Input label="Order" type="number" value={editing.order} onChange={(v) => setEditing({ ...editing, order: parseInt(v) || 0 })} />
          <div className="md:col-span-2">
            <div className="text-[10px] uppercase tracking-[0.25em] font-mono text-[var(--text-muted)] mb-1">Description</div>
            <textarea rows={3} className="w-full bg-transparent border border-[var(--border)] p-3" value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={editing.is_featured} onChange={(e) => setEditing({ ...editing, is_featured: e.target.checked })} /> Featured on Homepage</label>
          <div className="md:col-span-2 mt-2 pt-4 border-t border-[var(--border)]">
            <div className="text-[10px] uppercase tracking-[0.3em] font-mono text-[var(--text-muted)] mb-3">SEO</div>
            <div className="grid md:grid-cols-2 gap-4">
              <Input label="Meta Title" value={editing.seo_title || ""} onChange={(v) => setEditing({ ...editing, seo_title: v })} />
              <div>
                <div className="text-[10px] uppercase tracking-[0.25em] font-mono text-[var(--text-muted)] mb-1">Meta Description</div>
                <textarea rows={2} className="w-full bg-transparent border border-[var(--border)] p-3" value={editing.seo_description || ""} onChange={(e) => setEditing({ ...editing, seo_description: e.target.value })} />
              </div>
            </div>
          </div>
          <div className="md:col-span-2 flex gap-2">
            <button onClick={save} className="bg-[var(--text)] text-[var(--bg)] px-5 py-2 text-xs uppercase tracking-[0.2em]">Save</button>
            <button onClick={() => setEditing(null)} className="border border-[var(--border)] px-5 py-2 text-xs uppercase tracking-[0.2em]">Cancel</button>
          </div>
        </div>
      )}

      <div className="mt-8 bg-[var(--bg)] border border-[var(--border)]">
        {items.map((c) => (
          <div key={c.id} className="flex items-center gap-4 p-4 border-b border-[var(--border)]">
            <img src={c.cover_image} alt="" className="w-16 h-12 object-cover bg-[var(--surface)]" />
            <div className="flex-1">
              <div className="font-medium text-sm">{c.name}</div>
              <div className="text-xs text-[var(--text-muted)] font-mono">/{c.slug} • Order {c.order}</div>
            </div>
            <button onClick={() => setEditing(c)} className="text-xs uppercase tracking-[0.2em] link-underline">Edit</button>
            <button onClick={() => del(c.id)} className="p-2"><Trash2 size={14} /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

const Input = ({ label, value, onChange, type = "text" }) => (
  <div>
    <div className="text-[10px] uppercase tracking-[0.25em] font-mono text-[var(--text-muted)] mb-1">{label}</div>
    <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="w-full bg-transparent border-b border-[var(--border)] py-2" />
  </div>
);
