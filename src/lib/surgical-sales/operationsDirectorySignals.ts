/** Compact readiness gaps for directory Operations queues — field-facing language only. */

export type OpsReadinessTone = "ok" | "warn" | "gap";

export type DirectoryReadinessGap = {
  id: string;
  label: string;
  tone: OpsReadinessTone;
};

/** @deprecated Use DirectoryReadinessGap */
export type DirectoryOperationalSignal = DirectoryReadinessGap;

export type DirectoryReadinessSummary = {
  headline: string;
  subline?: string;
  gaps: DirectoryReadinessGap[];
  /** Gaps that still need action (warn + gap tones). */
  openGapCount: number;
};

export const OPS_READINESS_ICON: Record<OpsReadinessTone, string> = {
  ok: "✓",
  warn: "⚠",
  gap: "△",
};

/** @deprecated Use OPS_READINESS_ICON */
export const OPS_SIGNAL_ICON = OPS_READINESS_ICON;

export function openReadinessGaps(gaps: DirectoryReadinessGap[]): DirectoryReadinessGap[] {
  return gaps.filter((g) => g.tone === "warn" || g.tone === "gap");
}

export function buildReadinessHeadline(
  gaps: DirectoryReadinessGap[],
  opts?: {
    readyHeadline?: string;
    contextLabel?: string;
    contextPercent?: number;
  },
): Pick<DirectoryReadinessSummary, "headline" | "subline"> {
  const open = openReadinessGaps(gaps);
  const readyHeadline = opts?.readyHeadline ?? "Operational readiness · On track";
  const contextLabel = opts?.contextLabel;
  const contextPercent = opts?.contextPercent;

  if (open.length === 0) {
    const headline =
      contextLabel && contextPercent !== undefined
        ? `${contextLabel}: ${contextPercent}%`
        : readyHeadline;
    return { headline };
  }

  if (open.length === 1) {
    return {
      headline: open[0].label,
      subline:
        contextLabel && contextPercent !== undefined
          ? `${contextLabel}: ${contextPercent}%`
          : undefined,
    };
  }

  return {
    headline: `⚠ ${open.length} items to understand`,
    subline:
      contextLabel && contextPercent !== undefined
        ? `${contextLabel}: ${contextPercent}%`
        : undefined,
  };
}

export type TacticalActionChip = {
  id: string;
  label: string;
  href: string;
  emphasis?: boolean;
};
