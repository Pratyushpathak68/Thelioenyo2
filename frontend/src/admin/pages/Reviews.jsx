import React, { useEffect, useState } from "react";
import api from "@/services/api";
import { Check, X, Trash2 } from "lucide-react";

export default function Reviews() {
  const [items, setItems] = useState([]);
  const load = () => api.get("/admin/reviews").then(({ data }) => setItems(data));
  useEffect(() => { load(); }, []);

  const approve = async (r, v) => { await api.put(`/admin/reviews/${r.id}`, { is_approved: v }); load(); };
  const del = async (r) => { if (!window.confirm("Delete?")) return; await api.delete(`/admin/reviews/${r.id}`); load(); };

  return (
    <div data-testid="admin-reviews">
      <h1 className="font-display text-3xl uppercase font-black tracking-tight">Reviews</h1>
      <div className="mt-8 space-y-3">
        {items.map((r) => (
          <div key={r.id} className="bg-[var(--bg)] border border-[var(--border)] p-5 flex gap-4">
            <div className="flex-1">
              <div className="text-xs font-mono">{r.user_name} • {r.user_email} {r.verified_buyer && <span className="text-green-600 ml-2">✓ Verified</span>}</div>
              <div className="text-sm mt-1">{"★".repeat(r.rating)} {r.text}</div>
              <div className="text-[10px] font-mono text-[var(--text-muted)] mt-2">Product: {r.product_id}</div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => approve(r, true)} className={`p-2 border ${r.is_approved ? "bg-green-600 text-white border-green-600" : "border-[var(--border)]"}`} title="Approve"><Check size={14} /></button>
              <button onClick={() => approve(r, false)} className={`p-2 border ${!r.is_approved ? "bg-red-600 text-white border-red-600" : "border-[var(--border)]"}`} title="Reject"><X size={14} /></button>
              <button onClick={() => del(r)} className="p-2 border border-[var(--border)]"><Trash2 size={14} /></button>
            </div>
          </div>
        ))}
        {items.length === 0 && <div className="text-sm text-[var(--text-muted)]">No reviews yet.</div>}
      </div>
    </div>
  );
}
