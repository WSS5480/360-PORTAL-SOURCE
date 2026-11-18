"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function PortalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div style={{ padding: 24, maxWidth: 480 }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Something went wrong</h2>
      <p style={{ opacity: 0.85, marginBottom: 16 }}>An unexpected error occurred. Please try again.</p>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={() => reset()}
          style={{
            padding: "10px 16px",
            background: "#111",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          Try again
        </button>
        <Link
          href="/portal"
          style={{
            padding: "10px 16px",
            background: "transparent",
            color: "#111",
            border: "1px solid #ccc",
            borderRadius: 6,
            textDecoration: "none",
            fontWeight: 600,
          }}
        >
          Back to portal
        </Link>
      </div>
    </div>
  );
}
