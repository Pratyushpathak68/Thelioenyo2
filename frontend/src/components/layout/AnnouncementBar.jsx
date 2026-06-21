import React from "react";
import { useStore } from "@/contexts/StoreContext";

export default function AnnouncementBar() {
  const { settings } = useStore();
  const msgs = settings?.announcement_messages || [];
  if (!settings?.announcement_enabled || !msgs.length) return null;
  const loop = [...msgs, ...msgs, ...msgs, ...msgs];
  return (
    <div data-testid="announcement-bar" className="bg-[var(--text)] text-[var(--bg)] overflow-hidden border-b border-[var(--text)]">
      <div className="marquee-track inline-flex whitespace-nowrap py-2.5">
        {loop.map((m, i) => (
          <span key={i} className="px-8 text-[11px] tracking-[0.25em] uppercase font-mono">{m}</span>
        ))}
      </div>
    </div>
  );
}
