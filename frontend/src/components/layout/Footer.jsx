import React from "react";
import { Link } from "react-router-dom";
import { Instagram, Youtube } from "lucide-react";
import { useStore } from "@/contexts/StoreContext";

export default function Footer() {
  const { settings } = useStore();
  return (
    <footer data-testid="site-footer" className="border-t border-[var(--border)] mt-32 bg-[var(--bg)]">
      <div className="max-w-screen-2xl mx-auto px-5 md:px-10 py-16 grid md:grid-cols-4 gap-12">
        <div className="md:col-span-2">
          <div className="font-display text-3xl md:text-4xl uppercase font-black tracking-tighter">THE LIONEYO</div>
          <p className="mt-4 text-sm text-[var(--text-muted)] max-w-md">
            Premium streetwear, crafted with intention. Limited drops. Heavyweight fabrics. Made for those who move differently.
          </p>
          <div className="flex gap-4 mt-6">
            {settings?.instagram_url && (
              <a data-testid="footer-instagram" href={settings.instagram_url} target="_blank" rel="noreferrer" aria-label="Instagram">
                <Instagram size={18} />
              </a>
            )}
            {settings?.youtube_url && (
              <a data-testid="footer-youtube" href={settings.youtube_url} target="_blank" rel="noreferrer" aria-label="YouTube">
                <Youtube size={18} />
              </a>
            )}
            {settings?.whatsapp_number && (
              <a data-testid="footer-whatsapp" href={`https://wa.me/91${settings.whatsapp_number}`} target="_blank" rel="noreferrer" className="text-xs uppercase tracking-[0.2em] link-underline">
                WhatsApp
              </a>
            )}
          </div>
        </div>

        <div>
          <div className="text-xs uppercase tracking-[0.2em] mb-4">Shop</div>
          <ul className="space-y-2 text-sm">
            <li><Link className="link-underline" to="/collection/all">All Products</Link></li>
            <li><Link className="link-underline" to="/collection/anime">Anime</Link></li>
            <li><Link className="link-underline" to="/collection/streetwear">Streetwear</Link></li>
            <li><Link className="link-underline" to="/collection/essentials">Essentials</Link></li>
          </ul>
        </div>

        <div>
          <div className="text-xs uppercase tracking-[0.2em] mb-4">Support</div>
          <ul className="space-y-2 text-sm">
            <li><Link className="link-underline" to="/track">Track Order</Link></li>
            <li><Link className="link-underline" to="/page/shipping">Shipping</Link></li>
            <li><Link className="link-underline" to="/page/refund">Refund Policy</Link></li>
            <li><Link className="link-underline" to="/page/privacy">Privacy</Link></li>
            <li><Link className="link-underline" to="/page/terms">Terms</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-[var(--border)]">
        <div className="max-w-screen-2xl mx-auto px-5 md:px-10 py-6 flex flex-col md:flex-row justify-between gap-2 text-xs text-[var(--text-muted)]">
          <div>{settings?.footer_text || "© THE LIONEYO. All rights reserved."}</div>
          <div className="uppercase tracking-[0.2em] font-mono">lioneyo.com</div>
        </div>
      </div>
    </footer>
  );
}
