"use client";

import Link from "next/link";
import { PROVIDER_PLANNING_LABEL } from "@/lib/surgical-sales/providerPlanning";
import { buildProviderIntelligenceSnapshot } from "@/lib/surgical-sales/providerIntelligenceSnapshot";
import type { ProviderPlanningCompletion } from "@/lib/surgical-sales/providerPlanningCompletion";
import {
  buildIntelligenceLearningGaps,
  formatLearningGapsSummary,
} from "@/lib/surgical-sales/providerIntelligenceLearningGaps";
import { sc } from "@/components/sales/salesCommandUi";
import {
  PROVIDER_FIELD_OPS_SECTION,
  PROVIDER_FIELD_OPS_TAB_LABELS,
} from "@/lib/surgical-sales/providerFieldOperationsUiLabels";

function truncate(value: string, max = 140): string {
  const t = value.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

export function ProviderProfileAtAGlance({
  provider,
  providerId,
  specialty,
  planning,
  onOpenIntelligence,
}: {
  provider: Record<string, unknown>;
  providerId: string;
  specialty: string | null;
  planning?: ProviderPlanningCompletion;
  onOpenIntelligence: () => void;
}) {
  const snap = buildProviderIntelligenceSnapshot(provider, providerId);
  const planningStatus = planning?.status ?? "not_started";
  const planningLabel = PROVIDER_PLANNING_LABEL[planningStatus];
  const learningGaps = buildIntelligenceLearningGaps(provider, planning, 2);
  const learningHint =
    learningGaps.length > 0 ? formatLearningGapsSummary(learningGaps, 1) : null;

  const intelRows = [
    { label: "Procedures", value: snap.procedures },
    { label: "Vendors", value: snap.current_vendors },
    { label: "Competitive", value: snap.competitive_products },
    { label: "Evaluation", value: snap.evaluation_openness },
  ].filter((r) => r.value);

  return (
    <section
      className="provider-at-a-glance"
      aria-label={PROVIDER_FIELD_OPS_SECTION.operationalIntelligenceAtGlance}
    >
      <button type="button" className="provider-at-a-glance-planning" onClick={onOpenIntelligence}>
        <span className="provider-at-a-glance-planning-label">
          {PROVIDER_FIELD_OPS_TAB_LABELS.intelligence}
        </span>
        <span className={`provider-at-a-glance-planning-status provider-at-a-glance-planning-status--${planningStatus}`}>
          {planningLabel}
          {learningHint ? ` · ${learningHint}` : ""}
        </span>
        <span className="provider-at-a-glance-planning-cta">View →</span>
      </button>

      {learningGaps.length > 0 ? (
        <p className="provider-at-a-glance-specialty" style={{ marginTop: 8 }}>
          <strong>Still learning:</strong> {formatLearningGapsSummary(learningGaps, 2)}
        </p>
      ) : null}

      {specialty ? (
        <p className="provider-at-a-glance-specialty">
          <strong>Specialty:</strong> {specialty}
        </p>
      ) : null}

      {intelRows.length > 0 ? (
        <ul className="provider-at-a-glance-intel">
          {intelRows.map((r) => (
            <li key={r.label}>
              <span className="provider-at-a-glance-intel-label">{r.label}</span>
              <span className="provider-at-a-glance-intel-value">{truncate(r.value!)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="provider-at-a-glance-empty">
          No procedural intelligence documented.{" "}
          <Link href={`/portal/sales/providers/${encodeURIComponent(providerId)}?tab=intelligence`} style={sc.linkBrand}>
            Add intelligence
          </Link>
        </p>
      )}
    </section>
  );
}
