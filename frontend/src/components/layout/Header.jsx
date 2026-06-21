import React, { useEffect, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Search, ShoppingBag, Sun, Moon, Heart, User, Menu, X } from "lucide-react";
import { useStore } from "@/contexts/StoreContext";
import { resolveAsset } from "@/utils/format";

export default function Header() {
  const { settings, theme, setTheme, cart, setCartOpen, user } = useStore();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const logoSrc = theme === "dark" ? settings?.logo_dark : settings?.logo_light;
  const cartCount = cart.reduce((s, i) => s + i.qty, 0);

  return (
    <header
      data-testid="site-header"
      className={`sticky top-0 z-40 transition-colors duration-300 ${scrolled ? "bg-[var(--bg)]/90 backdrop-blur border-b border-[var(--border)]" : "bg-transparent"}`}
    >
      <div className="max-w-screen-2xl mx-auto px-5 md:px-10 h-16 md:h-20 flex items-center justify-between">
        <button data-testid="mobile-menu-btn" className="md:hidden" onClick={() => setOpen(!open)}>
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>

        <nav className="hidden md:flex items-center gap-8 text-xs uppercase tracking-[0.18em]">
          <NavLink data-testid="nav-shop" to="/collection/all" className="link-underline">Shop</NavLink>
          <NavLink data-testid="nav-anime" to="/collection/anime" className="link-underline">Anime</NavLink>
          <NavLink data-testid="nav-streetwear" to="/collection/streetwear" className="link-underline">Streetwear</NavLink>
          <NavLink data-testid="nav-essentials" to="/collection/essentials" className="link-underline">Essentials</NavLink>
        </nav>

        <Link data-testid="logo-home" to="/" className="font-display text-xl md:text-2xl font-black tracking-tight uppercase">
          {logoSrc ? (
            <img src={resolveAsset(logoSrc)} alt="THE LIONEYO" className="h-9 md:h-11 w-auto" />
          ) : (
            <span>THE LIONEYO</span>
          )}
        </Link>

        <div className="flex items-center gap-3 md:gap-5">
          <button data-testid="theme-toggle" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} aria-label="Toggle theme">
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <Link data-testid="nav-track" to="/track" className="hidden md:inline text-xs uppercase tracking-[0.18em] link-underline">Track</Link>
          <button data-testid="open-cart" onClick={() => setCartOpen(true)} className="relative" aria-label="Open cart">
            <ShoppingBag size={20} />
            {cartCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-[var(--text)] text-[var(--bg)] text-[10px] font-mono px-1.5 py-0.5">{cartCount}</span>
            )}
          </button>
        </div>
      </div>

      {open && (
        <div className="md:hidden border-t border-[var(--border)] bg-[var(--bg)]">
          <div className="px-5 py-6 flex flex-col gap-4 text-sm uppercase tracking-[0.2em]">
            <Link data-testid="mnav-shop" to="/collection/all" onClick={() => setOpen(false)}>Shop All</Link>
            <Link to="/collection/anime" onClick={() => setOpen(false)}>Anime</Link>
            <Link to="/collection/streetwear" onClick={() => setOpen(false)}>Streetwear</Link>
            <Link to="/collection/essentials" onClick={() => setOpen(false)}>Essentials</Link>
            <Link to="/track" onClick={() => setOpen(false)}>Track Order</Link>
          </div>
        </div>
      )}
    </header>
  );
}
