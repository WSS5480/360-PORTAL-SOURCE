"use client";

export default function CopyAccountIdButton(props: { accountId: string; variant?: "panel" | "hero" }) {
  const { accountId, variant = "panel" } = props;
  const hero = variant === "hero";

  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(accountId);
          alert("Account ID copied.");
        } catch {
          alert("Could not copy. Select and copy manually: " + accountId);
        }
      }}
      style={{
        padding: "8px 12px",
        borderRadius: 12,
        border: hero ? "1px solid rgba(255,255,255,0.28)" : "1px solid rgba(0,0,0,0.12)",
        background: hero ? "rgba(255,255,255,0.1)" : "white",
        color: hero ? "white" : "inherit",
        fontWeight: 900,
        cursor: "pointer",
        fontSize: 12,
      }}
    >
      Copy ID
    </button>
  );
}
