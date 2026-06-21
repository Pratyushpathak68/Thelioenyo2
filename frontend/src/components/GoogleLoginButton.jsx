import React, { useEffect, useRef } from "react";
import api from "@/services/api";
import { useStore } from "@/contexts/StoreContext";
import { toast } from "sonner";

export default function GoogleLoginButton({ onLogin }) {
  const ref = useRef(null);
  const { settings, setUser, user } = useStore();
  const clientId = settings?.google_client_id;

  useEffect(() => {
    if (!clientId || user) return;
    const init = () => {
      if (!window.google || !ref.current) return;
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: async (resp) => {
          try {
            const { data } = await api.post("/auth/google", { credential: resp.credential });
            localStorage.setItem("lioneyo_user_token", data.token);
            setUser(data.user);
            toast.success(`Welcome, ${data.user.name}`);
            onLogin && onLogin(data.user);
          } catch (e) {
            toast.error("Google login failed");
          }
        },
      });
      window.google.accounts.id.renderButton(ref.current, {
        type: "standard", theme: "filled_black", size: "large",
        text: "continue_with", shape: "rectangular", logo_alignment: "left", width: 320,
      });
    };
    if (window.google) init();
    else {
      const s = document.createElement("script");
      s.src = "https://accounts.google.com/gsi/client"; s.async = true; s.defer = true;
      s.onload = init;
      document.body.appendChild(s);
    }
  }, [clientId, user, setUser, onLogin]);

  if (user) return null;
  if (!clientId) return null;
  return (
    <div data-testid="google-login-wrapper" className="mt-2 mb-4 p-4 border border-[var(--border)] bg-[var(--surface)]">
      <div className="text-[10px] uppercase tracking-[0.25em] font-mono text-[var(--text-muted)] mb-3">Sign in to save your order & track history</div>
      <div ref={ref} />
    </div>
  );
}
