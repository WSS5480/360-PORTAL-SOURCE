"use client";

import type { IntelligenceGapOperationalConsequence } from "@/lib/surgical-sales/providerOperationalImpact";
import type { IntelligenceGapFieldGuidance } from "@/lib/surgical-sales/providerIntelligenceGapFieldGuidance";
import { REP_INTELLIGENCE_VOCAB } from "@/lib/surgical-sales/intelligenceCapture/repIntelligenceVocabulary";
import { scanLine } from "@/lib/surgical-sales/providerOverviewScanCopy";
import { ProviderGapFieldGuidance } from "./ProviderGapFieldGuidance";

/** Micro operational tags for fast scanning on open gaps. */
export function ProviderOperationalImpactTags({
  consequence,
  maxLen = 32,
}: {
  consequence: IntelligenceGapOperationalConsequence;
  maxLen?: number;
}) {
  const pills: { key: string; kicker: string; text: string; mod: string }[] = [
    {
      key: "or",
      kicker: "OR",
      text: scanLine(consequence.operationalProblem, maxLen),
      mod: "problem",
    },
    {
      key: "risk",
      kicker: "Risk",
      text: scanLine(consequence.businessRisk, maxLen),
      mod: "risk",
    },
    {
      key: "field",
      kicker: "Field",
      text: scanLine(consequence.fieldInefficiency, maxLen),
      mod: "field",
    },
  ];

  return (
    <div className="provider-intel-scan-tags" role="group" aria-label="Operational impact">
      {pills.map((pill) => (
        <span
          key={pill.key}
          className={`provider-intel-scan-tag-pill provider-intel-scan-tag-pill--${pill.mod}`}
          title={
            pill.mod === "problem"
              ? consequence.operationalProblem
              : pill.mod === "risk"
                ? consequence.businessRisk
                : consequence.fieldInefficiency
          }
        >
          <span className="provider-intel-scan-tag-pill-kicker">{pill.kicker}</span>
          <span className="provider-intel-scan-tag-pill-text">{pill.text}</span>
        </span>
      ))}
    </div>
  );
}

export function IntelligenceScanLaneHeader({
  kind,
  count,
}: {
  kind: "validated" | "open";
  count: number;
}) {
  return (
    <header className={`provider-intel-scan-lane-head provider-intel-scan-lane-head--${kind}`}>
      <span className={`provider-intel-scan-lane-tag provider-intel-scan-lane-tag--${kind}`}>
        {kind === "validated" ? REP_INTELLIGENCE_VOCAB.captured : REP_INTELLIGENCE_VOCAB.stillExploring}
      </span>
      <span
        className="provider-intel-scan-lane-count"
        aria-label={`${count} ${kind === "validated" ? "captured" : "still exploring"} findings`}
      >
        {count}
      </span>
    </header>
  );
}

export function IntelligenceScanValidatedRow({
  label,
  onClick,
}: {
  label: string;
  onClick?: () => void;
}) {
  const content = (
    <>
      <span className="provider-intel-scan-status provider-intel-scan-status--validated" aria-hidden>
        ✓
      </span>
      <span className="provider-intel-scan-primary">{label}</span>
    </>
  );

  if (onClick) {
    return (
      <li className="provider-intel-scan-item provider-intel-scan-item--validated">
        <button type="button" className="provider-intel-scan-hit" onClick={onClick}>
          {content}
        </button>
      </li>
    );
  }

  return (
    <li className="provider-intel-scan-item provider-intel-scan-item--validated">
      <div className="provider-intel-scan-hit provider-intel-scan-hit--static">{content}</div>
    </li>
  );
}

export function IntelligenceScanOpenRow({
  label,
  consequence,
  fieldGuidance,
  onClick,
  showTags = true,
  showFieldGuidance = true,
}: {
  label: string;
  consequence: IntelligenceGapOperationalConsequence;
  fieldGuidance?: IntelligenceGapFieldGuidance;
  onClick?: () => void;
  /** When false, only primary label + field summary (ultra-compact). */
  showTags?: boolean;
  /** Executable who / how / when — hidden in ultra-compact overview lanes. */
  showFieldGuidance?: boolean;
}) {
  const content = (
    <>
      <span className="provider-intel-scan-status provider-intel-scan-status--open">Open</span>
      <span className="provider-intel-scan-primary">{label}</span>
      {showTags ? (
        <ProviderOperationalImpactTags consequence={consequence} />
      ) : (
        <span className="provider-intel-scan-field-line" title={consequence.fieldInefficiency}>
          {consequence.summary}
        </span>
      )}
      {fieldGuidance && showFieldGuidance ? (
        <ProviderGapFieldGuidance guidance={fieldGuidance} compact />
      ) : null}
    </>
  );

  if (onClick) {
    return (
      <li className="provider-intel-scan-item provider-intel-scan-item--open">
        <button type="button" className="provider-intel-scan-hit provider-intel-scan-hit--open" onClick={onClick}>
          {content}
        </button>
      </li>
    );
  }

  return (
    <li className="provider-intel-scan-item provider-intel-scan-item--open">
      <div className="provider-intel-scan-hit provider-intel-scan-hit--static provider-intel-scan-hit--open">
        {content}
      </div>
    </li>
  );
}

export function IntelligenceScanEmpty({ kind }: { kind: "validated" | "open" }) {
  return (
    <p className={`provider-intel-scan-empty provider-intel-scan-empty--${kind}`}>
      {kind === "validated" ? "None on file yet" : "None flagged"}
    </p>
  );
}
