/**
 * Controls visibility of inline Experimental Universal Facts panels in workflow screens.
 * Separate from persistence — facts can persist while UI stays hidden in production.
 */

export function isUniversalFactsPanelServerEnabled(): boolean {
  return (
    process.env.UNIVERSAL_SURGICAL_FACTS_PANEL === "1" ||
    process.env.NEXT_PUBLIC_UNIVERSAL_SURGICAL_FACTS_PANEL === "1"
  );
}

/** Client-side gate for rendering read-only comparison panels. */
export function isUniversalFactsPanelClientEnabled(): boolean {
  return process.env.NEXT_PUBLIC_UNIVERSAL_SURGICAL_FACTS_PANEL === "1";
}

export function universalFactsConfidenceScore(confidence: string): number {
  switch (confidence) {
    case "high":
      return 0.91;
    case "medium":
      return 0.77;
    case "low":
      return 0.54;
    default:
      return 0.5;
  }
}
