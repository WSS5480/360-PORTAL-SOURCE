/**
 * Lightweight operational memory — tactical pulse lines (not an activity feed).
 */

import type { ProviderIntelligenceScopeDisplay } from "@/lib/surgical-sales/buildProviderIntelligenceScopeDisplay";
import {
  resolveProviderLastActivity,
  resolveProviderLastEngagement,
} from "@/lib/surgical-sales/buildProviderStrategicSummary";
import type { ProviderOverviewIntelligenceDensity } from "@/lib/surgical-sales/buildProviderOverviewIntelligenceDensity";
import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import { fieldHasIntelligenceSignal } from "@/lib/surgical-sales/providerIntelligenceIncrementalCapture";
import {
  parseProviderIntelligenceFieldMetadata,
  type IntelligenceFieldAttribution,
  type ProviderIntelligenceFieldMetadataMap,
} from "@/lib/surgical-sales/providerIntelligenceFieldMetadata";
import { intelligenceFieldDisplayName } from "@/lib/surgical-sales/providerIntelligenceLifecycle";
import { scanLine } from "@/lib/surgical-sales/providerOverviewScanCopy";
import {
  OVERVIEW_INTELLIGENCE_FRESHNESS_SPARSE,
  OVERVIEW_LAST_UPDATE_SPARSE,
  OVERVIEW_LATEST_VALIDATED_SPARSE,
  OVERVIEW_OPERATIONAL_CONFIDENCE_BUILDING,
  OVERVIEW_OPERATIONAL_TOUCH_BUILDING,
  OVERVIEW_RECENT_LEARNING_SPARSE,
  OVERVIEW_VISIBILITY_STILL_FORMING,
  OVERVIEW_WORKFLOW_INTELLIGENCE_DEVELOPING,
} from "@/lib/surgical-sales/providerOverviewEarlyDiscoveryVocabulary";
import { PROVIDER_FIELD_OPS_MEMORY_KICKER } from "@/lib/surgical-sales/providerFieldOperationsUiLabels";

export type OperationalMemoryTone = "update" | "learning" | "validated" | "freshness";

export type OperationalMemoryLine = {
  id: string;
  kicker: string;
  line: string;
  tone: OperationalMemoryTone;
};

export type ProviderOverviewOperationalMemory = {
  lines: OperationalMemoryLine[];
};

const KICKER = PROVIDER_FIELD_OPS_MEMORY_KICKER;

const SHORT_FIELD_LABEL: Partial<Record<string, string>> = {
  provider_procedure_focus: "Procedure mix",
  provider_technique_preferences: "Technique preference",
  provider_observation_access_path: "OR access",
  provider_observation_feasibility: "Observation access",
  provider_observation_coordinator_contact: "Scheduling pathway",
  provider_credentialing_status: "Vendor clearance",
  provider_preference_card_signals: "Dock preference",
  provider_evaluation_openness: "Evaluation openness",
  provider_workflow_pain_points: "Workflow friction",
};

const GAP_FRESHNESS_LINE: Partial<Record<string, string>> = {
  provider_preference_card_signals: "Dock preferences not yet validated",
  provider_observation_access_path: "OR access not yet validated",
  provider_observation_feasibility: "Observation viability not yet validated",
  provider_procedure_focus: "Procedure mix still emerging",
  provider_credentialing_status: "Vendor clearance path still forming",
  provider_evaluation_openness: "Evaluation openness developing",
};

function shortFieldLabel(dbKey: string): string {
  return SHORT_FIELD_LABEL[dbKey] ?? scanLine(intelligenceFieldDisplayName(dbKey), 28);
}

function formatRelativeAge(iso: string): string | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const diffDays = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (diffDays === 0) return "today";
  if (diffDays === 1) return "yesterday";
  if (diffDays < 14) return `${diffDays} days ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatCaptureSource(sourceLabel: string): string | null {
  const s = sourceLabel.trim();
  if (!s) return null;
  if (/intro call/i.test(s)) return "captured during intro call";
  if (/scheduler|scheduling|coordinator/i.test(s)) return "captured from scheduler";
  if (/observation/i.test(s)) return "captured during observation";
  if (/or staff|charge nurse/i.test(s)) return "captured from OR staff";
  if (/profile/i.test(s)) return null;
  return `captured from ${s.toLowerCase()}`;
}

type FieldEvent = {
  dbKey: string;
  label: string;
  updatedAt: number;
  validatedAt: number | null;
  meta: IntelligenceFieldAttribution;
};

function collectFieldEvents(
  contact: Record<string, unknown>,
  fieldMeta: ProviderIntelligenceFieldMetadataMap,
): FieldEvent[] {
  const events: FieldEvent[] = [];
  const keys = new Set([
    ...Object.keys(fieldMeta),
    ...Object.keys(contact).filter((k) => k.startsWith("provider_")),
  ]);

  for (const dbKey of keys) {
    const meta = fieldMeta[dbKey];
    const raw = String(contact[dbKey] ?? "").trim();
    if (!meta?.updated_at?.trim() && !fieldHasIntelligenceSignal(dbKey, raw)) continue;
    if (!meta?.updated_at?.trim()) continue;

    const updatedAt = new Date(meta.updated_at).getTime();
    if (Number.isNaN(updatedAt)) continue;

    const validatedRaw = meta.validated_at?.trim();
    const validatedAt = validatedRaw ? new Date(validatedRaw).getTime() : null;

    events.push({
      dbKey,
      label: shortFieldLabel(dbKey),
      updatedAt,
      validatedAt: validatedAt != null && !Number.isNaN(validatedAt) ? validatedAt : null,
      meta,
    });
  }

  return events.sort((a, b) => b.updatedAt - a.updatedAt);
}

function pickPriorityGap(scope: ProviderIntelligenceScopeDisplay): string | null {
  const gaps = [
    ...scope.provider.bullets.filter((b) => b.state === "gap"),
    ...scope.facility.bullets.filter((b) => b.state === "gap"),
  ];
  for (const bullet of gaps) {
    const line = GAP_FRESHNESS_LINE[bullet.dbKey];
    if (line) return line;
  }
  const first = gaps[0];
  if (!first) return null;
  const label = SHORT_FIELD_LABEL[first.dbKey] ?? shortFieldLabel(first.dbKey);
  return scanLine(`${label} still unvalidated`, 52);
}

export function buildProviderOverviewOperationalMemory(input: {
  contact: Record<string, unknown>;
  scope: ProviderIntelligenceScopeDisplay;
  density: ProviderOverviewIntelligenceDensity;
  providerId?: string;
  activityTimeline?: Array<Record<string, unknown>>;
  engagements?: ProviderEngagementSummary[];
  briefingFreshness?: string | null;
}): ProviderOverviewOperationalMemory {
  const fieldMeta = parseProviderIntelligenceFieldMetadata(
    input.contact.provider_intelligence_field_metadata,
  );
  const events = collectFieldEvents(input.contact, fieldMeta);

  const lines: OperationalMemoryLine[] = [];

  const lastEvent = events[0];
  const lastActivity = resolveProviderLastActivity(input.activityTimeline ?? []);
  const lastEngagement = resolveProviderLastEngagement(input.engagements ?? [], "provider");

  if (lastEvent) {
    const age = formatRelativeAge(lastEvent.meta.updated_at);
    lines.push({
      id: "last-update",
      kicker: KICKER.lastUpdate,
      line: scanLine(`${lastEvent.label} updated ${age ?? "recently"}`, 56),
      tone: "update",
    });
  } else if (lastActivity) {
    lines.push({
      id: "last-update",
      kicker: KICKER.lastUpdate,
      line: scanLine(`${lastActivity.label} · ${lastActivity.atLabel.toLowerCase()}`, 56),
      tone: "update",
    });
  } else if (lastEngagement) {
    lines.push({
      id: "last-update",
      kicker: KICKER.lastUpdate,
      line: scanLine(`${lastEngagement.label} · ${lastEngagement.atLabel.toLowerCase()}`, 56),
      tone: "update",
    });
  } else {
    lines.push({
      id: "last-update",
      kicker: KICKER.lastUpdate,
      line:
        input.density === "sparse"
          ? OVERVIEW_LAST_UPDATE_SPARSE
          : OVERVIEW_OPERATIONAL_TOUCH_BUILDING,
      tone: "update",
    });
  }

  const learningEvent = events.find((e) => !e.validatedAt);
  if (learningEvent) {
    const source = learningEvent.meta.source_label
      ? formatCaptureSource(learningEvent.meta.source_label)
      : null;
    const age = formatRelativeAge(learningEvent.meta.updated_at);
    const line = source
      ? scanLine(`${learningEvent.label} signal ${source}`, 56)
      : scanLine(`${learningEvent.label} updated ${age ?? "recently"}`, 56);
    lines.push({
      id: "recent-learning",
      kicker: KICKER.recentLearning,
      line,
      tone: "learning",
    });
  } else {
    const learningBullet = [...input.scope.facility.bullets, ...input.scope.provider.bullets].find(
      (b) => b.state === "known" && b.contextHint,
    );
    if (learningBullet?.contextHint) {
      const hint = learningBullet.contextHint.toLowerCase();
      const label = shortFieldLabel(learningBullet.dbKey);
      const line = /captured|observed/i.test(hint)
        ? scanLine(`${label} ${hint}`, 56)
        : scanLine(`${label} — ${hint}`, 56);
      lines.push({
        id: "recent-learning",
        kicker: KICKER.recentLearning,
        line,
        tone: "learning",
      });
    } else {
      lines.push({
        id: "recent-learning",
        kicker: KICKER.recentLearning,
        line:
          input.density === "sparse"
            ? OVERVIEW_RECENT_LEARNING_SPARSE
            : OVERVIEW_WORKFLOW_INTELLIGENCE_DEVELOPING,
        tone: "learning",
      });
    }
  }

  const validatedEvents = events
    .filter((e) => e.validatedAt != null)
    .sort((a, b) => (b.validatedAt ?? 0) - (a.validatedAt ?? 0));
  const validatedEvent = validatedEvents[0];
  if (validatedEvent && validatedEvent.meta.validated_at) {
    const age = formatRelativeAge(validatedEvent.meta.validated_at);
    lines.push({
      id: "latest-validated",
      kicker: KICKER.latestValidated,
      line: scanLine(`${validatedEvent.label} validated ${age ?? "on file"}`, 56),
      tone: "validated",
    });
  } else {
    const confirmedBullet = [...input.scope.facility.bullets, ...input.scope.provider.bullets].find(
      (b) => b.state === "known" && b.confidenceLabel === "Field confirmed",
    );
    if (confirmedBullet) {
      lines.push({
        id: "latest-validated",
        kicker: KICKER.latestValidated,
        line: scanLine(`${shortFieldLabel(confirmedBullet.dbKey)} confirmed on file`, 56),
        tone: "validated",
      });
    } else {
      lines.push({
        id: "latest-validated",
        kicker: KICKER.latestValidated,
        line:
          input.density === "sparse"
            ? OVERVIEW_LATEST_VALIDATED_SPARSE
            : `${OVERVIEW_OPERATIONAL_CONFIDENCE_BUILDING} — validate on next touch`,
        tone: "validated",
      });
    }
  }

  const gapLine = pickPriorityGap(input.scope);
  const openCount =
    input.scope.facility.bullets.filter((b) => b.state === "gap").length +
    input.scope.provider.bullets.filter((b) => b.state === "gap").length;

  let freshnessLine = gapLine;
  if (!freshnessLine && input.briefingFreshness) {
    freshnessLine = scanLine(
      input.briefingFreshness.replace(/^Operational intelligence /i, "").replace(/^Intelligence /i, ""),
      52,
    );
  }
  if (!freshnessLine && openCount > 0) {
    freshnessLine = scanLine(
      `${openCount} signal${openCount === 1 ? "" : "s"} need validation in intelligence`,
      52,
    );
  }
  if (!freshnessLine) {
    freshnessLine =
      input.density === "sparse"
        ? OVERVIEW_INTELLIGENCE_FRESHNESS_SPARSE
        : `${OVERVIEW_OPERATIONAL_CONFIDENCE_BUILDING} — keep validating on touch`;
  }

  lines.push({
    id: "intelligence-freshness",
    kicker: KICKER.intelligenceFreshness,
    line: freshnessLine,
    tone: "freshness",
  });

  return { lines };
}
