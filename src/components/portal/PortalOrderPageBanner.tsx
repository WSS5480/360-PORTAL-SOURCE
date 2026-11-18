"use client";

import React from "react";

const baseBorder: React.CSSProperties = {
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "var(--border)",
};

export default function PortalOrderPageBanner({
  kind,
  children,
}: {
  kind: "error" | "info";
  children: React.ReactNode;
}) {
  const bg =
    kind === "error"
      ? "color-mix(in srgb, var(--danger) 10%, var(--surface))"
      : "color-mix(in srgb, var(--surface) 90%, var(--background))";
  const border =
    kind === "error" ? "color-mix(in srgb, var(--danger) 26%, var(--border))" : "var(--border)";
  const color =
    kind === "error" ? "color-mix(in srgb, var(--danger) 78%, black)" : "var(--foreground)";

  return (
    <div
      style={{
        ...baseBorder,
        borderColor: border,
        background: bg,
        color,
        borderRadius: 16,
        padding: 14,
        boxShadow: "var(--shadow-1)",
        fontWeight: 900,
        whiteSpace: "pre-wrap",
      }}
    >
      {children}
    </div>
  );
}
