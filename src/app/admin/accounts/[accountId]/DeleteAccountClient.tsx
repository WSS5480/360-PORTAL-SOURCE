"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeleteAccountClient({ accountId, accountName }: { accountId: string; accountName: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/accounts/${accountId}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Failed to delete account");
        setDeleting(false);
        return;
      }
      router.push("/admin/accounts");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete account");
      setDeleting(false);
    }
  };

  return (
    <div style={{ marginTop: 0 }}>
      {!confirming ? (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          style={{
            padding: "10px 16px",
            borderRadius: 10,
            border: "1px solid rgba(220,38,38,0.5)",
            background: "rgba(220,38,38,0.08)",
            color: "#dc2626",
            fontWeight: 900,
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          Delete account
        </button>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 400 }}>
          <div style={{ fontSize: 13, color: "#64748b" }}>
            Permanently delete <strong style={{ color: "#0f172a" }}>{accountName}</strong>? This will remove all
            orders, invoices, IVRs, documents, and members. This cannot be undone.
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              style={{
                padding: "10px 16px",
                borderRadius: 10,
                border: "none",
                background: "#dc2626",
                color: "white",
                fontWeight: 900,
                fontSize: 13,
                cursor: deleting ? "not-allowed" : "pointer",
                opacity: deleting ? 0.7 : 1,
              }}
            >
              {deleting ? "Deleting…" : "Yes, delete account"}
            </button>
            <button
              type="button"
              onClick={() => {
                setConfirming(false);
                setError(null);
              }}
              disabled={deleting}
              style={{
                padding: "10px 16px",
                borderRadius: 10,
                border: "1px solid rgba(0,0,0,0.2)",
                background: "white",
                color: "#64748b",
                fontWeight: 900,
                fontSize: 13,
                cursor: deleting ? "not-allowed" : "pointer",
              }}
            >
              Cancel
            </button>
          </div>
          {error && (
            <div style={{ fontSize: 13, color: "#dc2626", fontWeight: 600 }}>{error}</div>
          )}
        </div>
      )}
    </div>
  );
}
