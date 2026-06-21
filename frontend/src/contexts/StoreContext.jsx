import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import api from "@/services/api";

const StoreCtx = createContext(null);
export const useStore = () => useContext(StoreCtx);

const CART_KEY = "lioneyo_cart";
const WISH_KEY = "lioneyo_wish";
const THEME_KEY = "lioneyo_theme";

export function StoreProvider({ children }) {
  const [settings, setSettings] = useState(null);
  const [cart, setCart] = useState(() => JSON.parse(localStorage.getItem(CART_KEY) || "[]"));
  const [wishlist, setWishlist] = useState(() => JSON.parse(localStorage.getItem(WISH_KEY) || "[]"));
  const [theme, setTheme] = useState(() => localStorage.getItem(THEME_KEY) || "light");
  const [user, setUser] = useState(null);
  const [cartOpen, setCartOpen] = useState(false);

  useEffect(() => {
    api.get("/settings").then(({ data }) => setSettings(data)).catch(() => {});
    const t = localStorage.getItem("lioneyo_user_token");
    if (t) api.get("/auth/me").then(({ data }) => setUser(data.user)).catch(() => {});
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => { localStorage.setItem(CART_KEY, JSON.stringify(cart)); }, [cart]);
  useEffect(() => { localStorage.setItem(WISH_KEY, JSON.stringify(wishlist)); }, [wishlist]);

  const addToCart = useCallback((item) => {
    setCart((prev) => {
      const idx = prev.findIndex((x) => x.product_id === item.product_id && x.size === item.size);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], qty: copy[idx].qty + item.qty };
        return copy;
      }
      return [...prev, item];
    });
    setCartOpen(true);
  }, []);

  const updateQty = useCallback((idx, qty) => {
    setCart((prev) => prev.map((it, i) => (i === idx ? { ...it, qty: Math.max(1, qty) } : it)));
  }, []);

  const removeItem = useCallback((idx) => {
    setCart((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const clearCart = useCallback(() => setCart([]), []);

  const toggleWish = useCallback((pid) => {
    setWishlist((prev) => (prev.includes(pid) ? prev.filter((x) => x !== pid) : [...prev, pid]));
  }, []);

  const subtotal = cart.reduce((s, it) => s + it.price * it.qty, 0);

  const logout = useCallback(() => {
    localStorage.removeItem("lioneyo_user_token");
    setUser(null);
  }, []);

  return (
    <StoreCtx.Provider value={{
      settings, theme, setTheme,
      cart, addToCart, updateQty, removeItem, clearCart, subtotal,
      wishlist, toggleWish,
      user, setUser, logout,
      cartOpen, setCartOpen,
    }}>
      {children}
    </StoreCtx.Provider>
  );
}
