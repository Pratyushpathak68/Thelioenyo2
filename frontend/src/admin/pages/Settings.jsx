import React, { useEffect, useState } from "react";
import api from "@/services/api";
import { toast } from "sonner";

const sections = [
  { id: "brand", label: "Brand & Logos", keys: ["logo_light", "logo_dark", "favicon", "site_title", "site_description", "site_keywords", "og_image"] },
  { id: "hero", label: "Hero Section", keys: ["hero_heading", "hero_subheading", "hero_image", "hero_video", "hero_cta_text", "hero_cta_link"] },
  { id: "shipping", label: "Shipping & COD", keys: ["shipping_fee", "free_shipping_threshold", "cod_enabled", "cod_advance", "cod_fee", "low_stock_threshold"] },
  { id: "whatsapp", label: "WhatsApp", keys: ["whatsapp_number", "whatsapp_order_template", "whatsapp_shipped_template", "whatsapp_delivered_template"] },
  { id: "razorpay", label: "Razorpay", keys: ["razorpay_key_id", "razorpay_key_secret", "razorpay_webhook_secret"] },
  { id: "r2", label: "Cloudflare R2", keys: ["r2_account_id", "r2_bucket", "r2_access_key", "r2_secret_key", "r2_public_url", "r2_endpoint"] },
  { id: "google", label: "Google", keys: ["google_client_id", "google_client_secret", "google_sheets_webhook"] },
  { id: "footer", label: "Footer & Social", keys: ["instagram_url", "youtube_url", "footer_text", "privacy_policy", "terms", "refund_policy", "shipping_policy"] },
  { id: "announce", label: "Announcement Bar", keys: ["announcement_enabled", "announcement_messages"] },
];

export default function AdminSettings() {
  const [s, setS] = useState(null);
  const [tab, setTab] = useState("brand");
  useEffect(() => { api.get("/admin/settings").then(({ data }) => setS(data)); }, []);

  if (!s) return <div className="text-sm uppercase tracking-[0.2em]">Loading…</div>;

  const upload = async (key, file) => {
    const fd = new FormData(); fd.append("file", file);
    const { data } = await api.post("/admin/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
    setS({ ...s, [key]: data.url });
  };

  const save = async () => {
    try { await api.put("/admin/settings", s); toast.success("Saved"); }
    catch (e) { toast.error("Save failed"); }
  };

  const active = sections.find((x) => x.id === tab);

  return (
    <div data-testid="admin-settings">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl uppercase font-black tracking-tight">Settings</h1>
        <button data-testid="settings-save" onClick={save} className="bg-[var(--text)] text-[var(--bg)] px-5 py-2 text-xs uppercase tracking-[0.2em]">Save Changes</button>
      </div>

      <div className="mt-8 flex gap-2 overflow-x-auto pb-2 border-b border-[var(--border)]">
        {sections.map((sec) => (
          <button key={sec.id} onClick={() => setTab(sec.id)} className={`px-4 py-2 text-xs uppercase tracking-[0.2em] whitespace-nowrap ${tab === sec.id ? "bg-[var(--text)] text-[var(--bg)]" : "text-[var(--text-muted)] hover:text-[var(--text)]"}`}>{sec.label}</button>
        ))}
      </div>

      <div className="mt-8 grid md:grid-cols-2 gap-5">
        {active.keys.map((k) => {
          const val = s[k];
          if (k === "announcement_messages") {
            return (
              <div key={k} className="md:col-span-2">
                <div className="text-[10px] uppercase tracking-[0.25em] font-mono text-[var(--text-muted)] mb-1">{k}</div>
                <textarea rows={5} value={(val || []).join("\n")} onChange={(e) => setS({ ...s, [k]: e.target.value.split("\n").filter(Boolean) })} className="w-full bg-transparent border border-[var(--border)] p-3 text-sm" placeholder="One message per line" />
              </div>
            );
          }
          if (typeof val === "boolean") {
            return (
              <label key={k} className="flex items-center gap-3 text-sm py-2">
                <input type="checkbox" checked={val} onChange={(e) => setS({ ...s, [k]: e.target.checked })} />
                <span className="font-mono text-xs uppercase tracking-[0.2em]">{k}</span>
              </label>
            );
          }
          if (["logo_light", "logo_dark", "favicon", "hero_image", "og_image"].includes(k)) {
            return (
              <div key={k}>
                <div className="text-[10px] uppercase tracking-[0.25em] font-mono text-[var(--text-muted)] mb-1">{k}</div>
                <input className="w-full bg-transparent border-b border-[var(--border)] py-2 text-sm" value={val || ""} onChange={(e) => setS({ ...s, [k]: e.target.value })} placeholder="URL or upload below" />
                <input type="file" accept="image/*" onChange={(e) => e.target.files[0] && upload(k, e.target.files[0])} className="text-xs mt-2" />
                {val && <img src={val.startsWith("http") ? val : `${process.env.REACT_APP_BACKEND_URL}${val}`} alt="" className="mt-2 h-16 object-contain bg-[var(--surface)]" />}
              </div>
            );
          }
          return (
            <div key={k} className={typeof val === "string" && val.length > 80 ? "md:col-span-2" : ""}>
              <div className="text-[10px] uppercase tracking-[0.25em] font-mono text-[var(--text-muted)] mb-1">{k}</div>
              {typeof val === "string" && val.length > 80 ? (
                <textarea rows={3} value={val || ""} onChange={(e) => setS({ ...s, [k]: e.target.value })} className="w-full bg-transparent border border-[var(--border)] p-3 text-sm" />
              ) : (
                <input type={typeof val === "number" ? "number" : "text"} value={val ?? ""} onChange={(e) => setS({ ...s, [k]: typeof val === "number" ? parseFloat(e.target.value) || 0 : e.target.value })} className="w-full bg-transparent border-b border-[var(--border)] py-2 text-sm" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
