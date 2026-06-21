import React, { useEffect, useState } from "react";
import api from "@/services/api";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

const empty = { code: "", discount_type: "flat", discount_value: 0, min_order: 0, max_discount: null, usage_limit: 0, is_active: true, is_popup: false, popup_button_text: "COPY CODE" };

export default function Coupons() {
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);
  const load = () => api.get("/admin/coupons").then(({ data }) => setItems(data));
  useEffect(() => { load(); }, []);

  const save = async () => {
    const body = { ...editing, discount_value: parseFloat(editing.discount_value), min_order: parseFloat(editing.min_order), max_discount: editing.max_discount ? parseFloat(editing.max_discount) : null, usage_limit: parseInt(editing.usage_limit) || 0 };
    if (body.id) await api.put(`/admin/coupons/${body.id}`, body);
    else await api.post("/admin/coupons", body);
    toast.success("Saved"); setEditing(null); load();
  };

  const del = async (id) => { if (!window.confirm("Delete?")) return; await api.delete(`/admin/coupons/${id}`); load(); };

  return (
    <div data-testid="admin-coupons">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl uppercase font-black tracking-tight">Coupons</h1>
        <button onClick={() => setEditing({ ...empty })} className="bg-[var(--text)] text-[var(--bg)] px-5 py-2 text-xs uppercase tracking-[0.2em] flex items-center gap-2"><Plus size={14} /> New</button>
      </div>

      {editing && (
        <div className="mt-6 bg-[var(--bg)] border border-[var(--border)] p-6 grid md:grid-cols-3 gap-4">
          <Field label="Code"><input className="w-full bg-transparent border-b border-[var(--border)] py-2 font-mono uppercase" value={editing.code} onChange={(e) => setEditing({ ...editing, code: e.target.value.toUpperCase() })} /></Field>
          <Field label="Type"><select className="w-full bg-transparent border-b border-[var(--border)] py-2" value={editing.discount_type} onChange={(e) => setEditing({ ...editing, discount_type: e.target.value })}><option value="flat">Flat ₹</option><option value="percent">Percent %</option></select></Field>
          <Field label="Value"><input type="number" className="w-full bg-transparent border-b border-[var(--border)] py-2" value={editing.discount_value} onChange={(e) => setEditing({ ...editing, discount_value: e.target.value })} /></Field>
          <Field label="Min Order"><input type="number" className="w-full bg-transparent border-b border-[var(--border)] py-2" value={editing.min_order} onChange={(e) => setEditing({ ...editing, min_order: e.target.value })} /></Field>
          <Field label="Max Discount"><input type="number" className="w-full bg-transparent border-b border-[var(--border)] py-2" value={editing.max_discount || ""} onChange={(e) => setEditing({ ...editing, max_discount: e.target.value })} /></Field>
          <Field label="Usage Limit (0=∞)"><input type="number" className="w-full bg-transparent border-b border-[var(--border)] py-2" value={editing.usage_limit} onChange={(e) => setEditing({ ...editing, usage_limit: e.target.value })} /></Field>
          <Field label="Popup Button Text"><input className="w-full bg-transparent border-b border-[var(--border)] py-2" value={editing.popup_button_text} onChange={(e) => setEditing({ ...editing, popup_button_text: e.target.value })} /></Field>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={editing.is_active} onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })} /> Active</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={editing.is_popup} onChange={(e) => setEditing({ ...editing, is_popup: e.target.checked })} /> Show in Popup</label>
          <div className="md:col-span-3 flex gap-2">
            <button onClick={save} className="bg-[var(--text)] text-[var(--bg)] px-5 py-2 text-xs uppercase tracking-[0.2em]">Save</button>
            <button onClick={() => setEditing(null)} className="border border-[var(--border)] px-5 py-2 text-xs uppercase tracking-[0.2em]">Cancel</button>
          </div>
        </div>
      )}

      <div className="mt-8 bg-[var(--bg)] border border-[var(--border)]">
        {items.map((c) => (
          <div key={c.id} className="flex items-center gap-4 p-4 border-b border-[var(--border)]">
            <div className="font-mono text-sm flex-1">{c.code} <span className="text-[var(--text-muted)] ml-3 text-xs">{c.discount_type === "flat" ? `₹${c.discount_value}` : `${c.discount_value}%`} OFF • Min ₹{c.min_order} • Used {c.used_count}</span></div>
            {c.is_popup && <span className="text-[10px] uppercase tracking-[0.2em] bg-[var(--text)] text-[var(--bg)] px-2 py-0.5">Popup</span>}
            {!c.is_active && <span className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)]">Inactive</span>}
            <button onClick={() => setEditing(c)} className="text-xs uppercase tracking-[0.2em] link-underline">Edit</button>
            <button onClick={() => del(c.id)} className="p-2"><Trash2 size={14} /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

const Field = ({ label, children }) => (<div><div className="text-[10px] uppercase tracking-[0.25em] font-mono text-[var(--text-muted)] mb-1">{label}</div>{children}</div>);
