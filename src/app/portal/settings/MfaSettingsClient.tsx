"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import MfaEnrollClient from "@/app/login/MfaEnrollClient";

const BRAND_BLUE = "#1e88e5";
const TEXT_DARK = "#0f172a";
const TEXT_MUTED = "#64748b";

export default function MfaSettingsClient() {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const [hasMfa, setHasMfa] = useState<boolean | null>(null);
  const [showEnroll, setShowEnroll] = useState(false);

  const loadFactors = useCallback(async () => {
    const { data, error: listErr } = await supabase.auth.mfa.listFactors();
    if (listErr) {
      setHasMfa(false);
      return;
    }
    setHasMfa((data?.totp?.length ?? 0) > 0);
  }, [supabase]);

  useEffect(() => {
    loadFactors();
  }, [loadFactors]);

  if (hasMfa === null) {
    return <div style={{ color: TEXT_MUTED, fontSize: 14 }}>Loading…</div>;
  }

  if (showEnroll) {
    return (
      <div style={{ marginTop: 16 }}>
        <MfaEnrollClient
          onEnrolled={() => {
            setShowEnroll(false);
            setHasMfa(true);
          }}
          onCancelled={() => setShowEnroll(false)}
        />
      </div>
    );
  }

  if (hasMfa) {
    return (
      <div style={{ marginTop: 16 }}>
        <div
          style={{
            padding: 14,
            borderRadius: 12,
            background: "rgba(16, 185, 129, 0.10)",
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: "rgba(16, 185, 129, 0.25)",
            color: "rgb(6, 95, 70)",
            fontWeight: 900,
            fontSize: 14,
          }}
        >
          Two-factor authentication is enabled.
        </div>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 16 }}>
      <button
        type="button"
        onClick={() => setShowEnroll(true)}
        style={{
          padding: "12px 18px",
          borderRadius: 12,
          borderWidth: 1,
          borderStyle: "solid",
          borderColor: "rgba(30,136,229,0.35)",
          background: BRAND_BLUE,
          color: "white",
          fontWeight: 950,
          fontSize: 15,
          cursor: "pointer",
        }}
      >
        Enable two-factor authentication
      </button>
    </div>
  );
}
