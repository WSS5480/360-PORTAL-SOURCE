"use client";

import {
  INTELLIGENCE_UNLOCKS_NEXT_LABEL,
  intelligenceUnlocksNextCapability,
  intelligenceUnlocksNextLine,
} from "@/lib/surgical-sales/providerIntelligenceUnlocksNext";

export function ProviderIntelligenceUnlocksNextLine({
  dbKey,
  line,
  compact = false,
}: {
  /** Field key — builds unlock line when `line` is omitted. */
  dbKey?: string;
  /** Preformatted unlock line (e.g. from IntelligenceLearningGap.unlocksNext). */
  line?: string;
  compact?: boolean;
}) {
  const text = line ?? (dbKey ? intelligenceUnlocksNextLine(dbKey) : "");
  if (!text) return null;

  const capability =
    dbKey && text.startsWith("Unlocks ")
      ? intelligenceUnlocksNextCapability(dbKey)
      : text.replace(/^Unlocks\s+/i, "").replace(/^→\s*Unlocks\s+/i, "");

  return (
    <p
      className={`provider-intel-unlocks-next${compact ? " provider-intel-unlocks-next--compact" : ""}`}
    >
      <span className="provider-intel-unlocks-next-kicker">{INTELLIGENCE_UNLOCKS_NEXT_LABEL}</span>
      <span className="provider-intel-unlocks-next-value">{capability}</span>
    </p>
  );
}
