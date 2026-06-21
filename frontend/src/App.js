import React, { useEffect } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { Toaster } from "sonner";
import { StoreProvider, useStore } from "@/contexts/StoreContext";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import AnnouncementBar from "@/components/layout/AnnouncementBar";
import CouponPopup from "@/components/CouponPopup";
import CartDrawer from "@/components/CartDrawer";
import Home from "@/pages/Home";
import Collection from "@/pages/Collection";
import Product from "@/pages/Product";
import Checkout from "@/pages/Checkout";
import OrderTracking from "@/pages/OrderTracking";
import OrderSuccess from "@/pages/OrderSuccess";
import Account from "@/pages/Account";
import AdminLogin from "@/admin/AdminLogin";
import AdminApp from "@/admin/AdminApp";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo({ top: 0, behavior: "instant" }); }, [pathname]);
  return null;
}

function PublicShell({ children }) {
  return (
    <>
      <AnnouncementBar />
      <Header />
      {children}
      <Footer />
      <CartDrawer />
      <CouponPopup />
    </>
  );
}

function Shell() {
  const { pathname } = useLocation();
  const isAdmin = pathname.startsWith("/admin");
  if (isAdmin) {
    return (
      <Routes>
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/*" element={<AdminApp />} />
      </Routes>
    );
  }
  return (
    <PublicShell>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/collection/:slug" element={<Collection />} />
        <Route path="/product/:slug" element={<Product />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/track" element={<OrderTracking />} />
        <Route path="/track/:orderNumber" element={<OrderTracking />} />
        <Route path="/order/success/:orderNumber" element={<OrderSuccess />} />
        <Route path="/account" element={<Account />} />
      </Routes>
    </PublicShell>
  );
}

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <StoreProvider>
          <ScrollToTop />
          <Shell />
          <Toaster position="bottom-right" theme="light" />
        </StoreProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;
