"use client";

export default function PrintButtonClient() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      style={{
        padding: "10px 14px",
        borderRadius: 10,
        border: "1px solid rgba(0,0,0,0.18)",
        background: "#111",
        color: "white",
        fontWeight: 900,
        cursor: "pointer",
      }}
    >
      Print
    </button>
  );
}
