import React, { useEffect, useState } from "react";
import api from "@/services/api";
import { toast } from "sonner";
import { resolveAsset } from "@/utils/format";

const sections = [
  { id: "brand", label: "Brand & Logos", keys: ["logo_light", "logo_dark", "favicon", "site_title", "site_description", "site_keywords", "og_image"] },
  { id: "hero", label: "Hero Section", keys: ["hero_heading", "hero_subheading", "hero_image", "hero_video", "hero_cta_text", "hero_cta_link"] },
  { id: "shipping", label: "Shipping & COD", keys: ["shipping_fee", "free_shipping_threshold", "cod_enabled", "cod_advance", "cod_fee", "low_stock_threshold"] },
  { id: "whatsapp", label: "WhatsApp", keys: ["whatsapp_number", "whatsapp_access_token", "whatsapp_phone_id", "whatsapp_gateway_url", "whatsapp_order_template", "whatsapp_shipped_template", "whatsapp_delivered_template", "whatsapp_cod_reminder_template"] },
  { id: "referral", label: "Referral System", keys: ["referral_enabled", "referral_discount_type", "referral_discount_value", "referral_min_order", "referral_max_discount"] },
  { id: "razorpay", label: "Razorpay", keys: ["razorpay_key_id", "razorpay_key_secret", "razorpay_webhook_secret"] },
  { id: "r2", label: "Cloudflare R2", keys: ["r2_account_id", "r2_bucket", "r2_access_key", "r2_secret_key", "r2_public_url", "r2_endpoint"] },
  { id: "google", label: "Google", keys: ["google_client_id", "google_client_secret", "google_sheets_webhook"] },
  { id: "footer", label: "Footer & Social", keys: ["instagram_url", "youtube_url", "footer_text", "privacy_policy", "terms", "refund_policy", "shipping_policy"] },
  { id: "announce", label: "Announcement Bar", keys: ["announcement_enabled", "announcement_messages"] },
  { id: "security", label: "Admin Security", keys: [] },
];

const BOOL_KEYS = new Set(["cod_enabled", "announcement_enabled", "referral_enabled"]);
const NUM_KEYS = new Set([
  "shipping_fee", "free_shipping_threshold", "cod_advance", "cod_fee", "low_stock_threshold",
  "referral_discount_value", "referral_min_order", "referral_max_discount",
]);
const TEXTAREA_KEYS = new Set([
  "site_description", "footer_text", "privacy_policy", "terms", "refund_policy", "shipping_policy",
  "whatsapp_order_template", "whatsapp_shipped_template", "whatsapp_delivered_template", "whatsapp_cod_reminder_template",
]);
const IMG_KEYS = new Set(["logo_light", "logo_dark", "favicon", "hero_image", "og_image"]);
const SELECT_KEYS = { referral_discount_type: ["flat", "percent"] };

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
        {tab !== "security" && (
          <button data-testid="settings-save" onClick={save} className="bg-[var(--text)] text-[var(--bg)] px-5 py-2 text-xs uppercase tracking-[0.2em]">Save Changes</button>
        )}
      </div>

      <div className="mt-8 flex gap-2 overflow-x-auto pb-2 border-b border-[var(--border)]">
        {sections.map((sec) => (
          <button key={sec.id} onClick={() => setTab(sec.id)} className={`px-4 py-2 text-xs uppercase tracking-[0.2em] whitespace-nowrap ${tab === sec.id ? "bg-[var(--text)] text-[var(--bg)]" : "text-[var(--text-muted)] hover:text-[var(--text)]"}`}>{sec.label}</button>
        ))}
      </div>

      {tab === "security" ? (
        <AdminSecurityPanel />
      ) : (
      <div className="mt-8 grid md:grid-cols-2 gap-5">
        {active.keys.map((k) => {
          const val = s[k];
          const isBool = BOOL_KEYS.has(k) || typeof val === "boolean";
          const isNum = NUM_KEYS.has(k) || (typeof val === "number" && !isBool);
          const isTextarea = TEXTAREA_KEYS.has(k) || (typeof val === "string" && val.length > 80);
          const isImg = IMG_KEYS.has(k);
          if (k === "announcement_messages") {
            return (
              <div key={k} className="md:col-span-2">
                <div className="text-[10px] uppercase tracking-[0.25em] font-mono text-[var(--text-muted)] mb-1">{k}</div>
                <textarea rows={5} value={(val || []).join("\n")} onChange={(e) => setS({ ...s, [k]: e.target.value.split("\n").filter(Boolean) })} className="w-full bg-transparent border border-[var(--border)] p-3 text-sm" placeholder="One message per line" />
              </div>
            );
          }
          if (isBool) {
            return (
              <label key={k} className="flex items-center gap-3 text-sm py-2">
                <input type="checkbox" checked={!!val} onChange={(e) => setS({ ...s, [k]: e.target.checked })} />
                <span className="font-mono text-xs uppercase tracking-[0.2em]">{k}</span>
              </label>
            );
          }
          if (SELECT_KEYS[k]) {
            return (
              <div key={k}>
                <div className="text-[10px] uppercase tracking-[0.25em] font-mono text-[var(--text-muted)] mb-1">{k}</div>
                <select value={val || SELECT_KEYS[k][0]} onChange={(e) => setS({ ...s, [k]: e.target.value })} className="w-full bg-transparent border-b border-[var(--border)] py-2 text-sm">
                  {SELECT_KEYS[k].map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            );
          }
          if (isImg) {
            return (
              <div key={k}>
                <div className="text-[10px] uppercase tracking-[0.25em] font-mono text-[var(--text-muted)] mb-1">{k}</div>
                <input className="w-full bg-transparent border-b border-[var(--border)] py-2 text-sm" value={val || ""} onChange={(e) => setS({ ...s, [k]: e.target.value })} placeholder="URL or upload below" />
                <input type="file" accept="image/*" onChange={(e) => e.target.files[0] && upload(k, e.target.files[0])} className="text-xs mt-2" />
                {val && <img src={resolveAsset(val)} alt="" className="mt-2 h-16 object-contain bg-[var(--surface)]" />}
              </div>
            );
          }
          return (
            <div key={k} className={isTextarea ? "md:col-span-2" : ""}>
              <div className="text-[10px] uppercase tracking-[0.25em] font-mono text-[var(--text-muted)] mb-1">{k}</div>
              {isTextarea ? (
                <textarea rows={3} value={val || ""} onChange={(e) => setS({ ...s, [k]: e.target.value })} className="w-full bg-transparent border border-[var(--border)] p-3 text-sm" />
              ) : (
                <input type={isNum ? "number" : "text"} value={val ?? ""} onChange={(e) => setS({ ...s, [k]: isNum ? (e.target.value === "" ? null : parseFloat(e.target.value) || 0) : e.target.value })} className="w-full bg-transparent border-b border-[var(--border)] py-2 text-sm" />
              )}
            </div>
          );
        })}
      </div>
      )}
    </div>
  );
}

function AdminSecurityPanel() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  const change = async () => {
    if (!current || !next) { toast.error("Fill all fields"); return; }
    if (next.length < 8) { toast.error("New password must be 8+ characters"); return; }
    if (next !== confirm) { toast.error("Passwords don't match"); return; }
    setBusy(true);
    try {
      await api.post("/admin/change-password", { current_password: current, new_password: next });
      toast.success("Password changed");
      setCurrent(""); setNext(""); setConfirm("");
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Change failed");
    } finally { setBusy(false); }
  };

  return (
    <div className="mt-8 max-w-md" data-testid="admin-security-panel">
      <h2 className="font-display text-xl uppercase font-black tracking-tight">Change Admin Password</h2>
      <p className="text-xs text-[var(--text-muted)] mt-2">Use a strong password — minimum 8 characters. You&apos;ll need the new password next time you log in.</p>
      <div className="mt-6 space-y-4">
        <div>
          <div className="text-[10px] uppercase tracking-[0.25em] font-mono text-[var(--text-muted)] mb-1">Current Password</div>
          <input data-testid="cur-pw" type="password" value={current} onChange={(e) => setCurrent(e.target.value)} className="w-full bg-transparent border-b border-[var(--border)] py-2 text-sm" />
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-[0.25em] font-mono text-[var(--text-muted)] mb-1">New Password</div>
          <input data-testid="new-pw" type="password" value={next} onChange={(e) => setNext(e.target.value)} className="w-full bg-transparent border-b border-[var(--border)] py-2 text-sm" />
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-[0.25em] font-mono text-[var(--text-muted)] mb-1">Confirm New Password</div>
          <input data-testid="confirm-pw" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="w-full bg-transparent border-b border-[var(--border)] py-2 text-sm" />
        </div>
        <button data-testid="change-pw-btn" onClick={change} disabled={busy} className="bg-[var(--text)] text-[var(--bg)] px-6 py-3 text-xs uppercase tracking-[0.2em] disabled:opacity-50">{busy ? "Updating…" : "Update Password"}</button>
      </div>
    </div>
  );
}
