"use client";

import { sc } from "@/components/sales/salesCommandUi";
import {
  SURGICAL_PHI_PATTERN_WARNING_HEADLINE,
  surgicalPhiPatternSummary,
} from "@/lib/surgical-sales/phiContentHeuristics";

export function PhiPatternInlineHint({ kinds }: { kinds: string[] }) {
  if (kinds.length === 0) return null;
  const summary = surgicalPhiPatternSummary(kinds);
  return (
    <div
      role="status"
      style={{
        marginTop: 8,
        padding: "8px 10px",
        borderRadius: 10,
        border: "1px solid color-mix(in srgb, #b45309 40%, var(--border))",
        background: "color-mix(in srgb, #b45309 10%, var(--surface))",
        fontSize: 12,
        fontWeight: 650,
        lineHeight: 1.45,
        color: "#9a3412",
      }}
    >
      {SURGICAL_PHI_PATTERN_WARNING_HEADLINE} Possible match: {summary}. You can still save; the system logs advisory
      events for review.
    </div>
  );
}

export default function PhiPatternAdvisoryModal({
  open,
  kinds,
  onCancel,
  onContinue,
}: {
  open: boolean;
  kinds: string[];
  onCancel: () => void;
  onContinue: () => void;
}) {
  if (!open) return null;
  const summary = surgicalPhiPatternSummary(kinds);

  return (
    <div
      role="dialog"
      aria-modal
      aria-labelledby="phi-advisory-title"
      style={{
        position: "fixed",
        inset: 0,
        background: "color-mix(in srgb, var(--foreground) 40%, transparent)",
        display: "grid",
        placeItems: "center",
        padding: 16,
        zIndex: 80,
      }}
    >
      <div
        style={{
          background: "var(--surface)",
          borderRadius: 14,
          padding: 22,
          maxWidth: 440,
          width: "100%",
          border: "1px solid color-mix(in srgb, #b45309 35%, var(--border))",
          boxShadow: "0 12px 40px color-mix(in srgb, var(--foreground) 12%, transparent)",
        }}
      >
        <h2 id="phi-advisory-title" style={{ margin: "0 0 10px", fontSize: 18, fontWeight: 900, color: "#9a3412" }}>
          {SURGICAL_PHI_PATTERN_WARNING_HEADLINE}
        </h2>
        <p style={{ margin: "0 0 12px", fontSize: 14, lineHeight: 1.55, color: "var(--foreground)" }}>
          Our automated check noticed text that may resemble a Social Security number, date of birth, or medical record
          identifier. These checks can be wrong (for example, product codes or scheduling dates).
        </p>
        {summary ? (
          <p style={{ margin: "0 0 14px", fontSize: 13, fontWeight: 700, color: "var(--muted)" }}>Flags: {summary}</p>
        ) : null}
        <p style={{ margin: "0 0 18px", fontSize: 13, lineHeight: 1.5, color: "var(--muted)" }}>
          Only enter facility, logistics, and commercial context here. If this is a false alarm, you may continue — the
          attempt is logged for compliance review.
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap" }}>
          <button type="button" style={sc.btnSecondary} onClick={onCancel}>
            Go back and edit
          </button>
          <button type="button" style={sc.btnPrimary} onClick={onContinue}>
            I understand — continue
          </button>
        </div>
      </div>
    </div>
  );
}
