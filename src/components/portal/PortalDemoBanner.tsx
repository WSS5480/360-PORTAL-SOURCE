"use client";

import React from "react";

export default function PortalDemoBanner() {
  const [isDemo, setIsDemo] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/portal/me", { cache: "no-store" });
        const json = await res.json();
        if (!cancelled && json?.ok && json.current_account_is_demo) {
          setIsDemo(true);
        }
      } catch {
        // ignore
      }
    }

    void load();

    function onRefetch() {
      void load();
    }
    window.addEventListener("portal-me-refetch", onRefetch);
    return () => {
      cancelled = true;
      window.removeEventListener("portal-me-refetch", onRefetch);
    };
  }, []);

  if (!isDemo) return null;

  return (
    <div
      role="status"
      style={{
        marginBottom: 12,
        padding: "10px 14px",
        borderRadius: 12,
        border: "1px solid rgba(245,158,11,0.45)",
        background: "linear-gradient(180deg, rgba(255,251,235,0.98), rgba(254,243,199,0.92))",
        color: "#92400e",
        fontSize: 13,
        fontWeight: 800,
        lineHeight: 1.45,
      }}
    >
      Demo account — orders and fulfillment run normally here but do not take inventory, debit virtual warehouse balance, or send emails.
    </div>
  );
}
