"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

function InviteAcceptInner() {
  const sp = useSearchParams();
  const router = useRouter();

  const inviteId = useMemo(() => sp.get("invite") || "", [sp]);
  const error = useMemo(() => sp.get("error") || "", [sp]);

  const [msg, setMsg] = useState("Preparing invite…");

  useEffect(() => {
    if (error) {
      setMsg(`Invite link error: ${error}`);
      return;
    }

    if (!inviteId) {
      setMsg("Missing invite id.");
      return;
    }

    setMsg("Redirecting to set password…");
    router.replace(`/set-password?invite=${encodeURIComponent(inviteId)}&next=${encodeURIComponent("/portal")}`);
  }, [inviteId, error, router]);

  return (
    <main style={{ padding: 16 }}>
      <h1 style={{ fontSize: 18, fontWeight: 900, margin: 0 }}>Accept Invite</h1>
      <p style={{ marginTop: 8, opacity: 0.8 }}>{msg}</p>
    </main>
  );
}

export default function InviteAcceptPage() {
  // Suspense wrapper prevents build-time/prerender failures around useSearchParams().
  return (
    <Suspense
      fallback={
        <main style={{ padding: 16 }}>
          <h1 style={{ fontSize: 18, fontWeight: 900, margin: 0 }}>Accept Invite</h1>
          <p style={{ marginTop: 8, opacity: 0.8 }}>Preparing invite…</p>
        </main>
      }
    >
      <InviteAcceptInner />
    </Suspense>
  );
}
