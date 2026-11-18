import type { AiNoteCaptureContext } from "@/lib/surgical-sales/aiNoteCapture/types";
import type { TacticalDebriefInsight } from "@/lib/surgical-sales/engagements/prepareTacticalDebriefAnalyze";
import { formatEngagementType } from "@/lib/surgical-sales/engagements/engagementTypes";
import {
  defaultCaptureScopeForDbKey,
  INTELLIGENCE_SCOPE_LABELS,
  intelligenceScopeForDbKey,
  type IntelligenceScope,
} from "@/lib/surgical-sales/intelligenceScopeModel";
import { isOrganizationIntelligenceDbKey } from "@/lib/surgical-sales/organizationIntelligenceFields";
import type { DebriefProposedContactItem } from "@/lib/surgical-sales/debriefDetectedContact";
import {
  buildDebriefReviewPropagationTargets,
  propagationTargetDestinationId,
  type DebriefReviewPropagationTarget,
  type DebriefReviewUpdateDestination,
} from "@/lib/surgical-sales/debriefReviewPropagation";
import type { LogUpdateParseResult } from "@/lib/surgical-sales/logUpdateParseFreeform";

/** Locked capture scope inherited from an engagement (no manual target picking). */
export type IntelligenceCaptureScope = {
  engagementId: string | null;
  providerId: string | null;
  organizationId: string | null;
  providerLabel: string | null;
  organizationLabel: string | null;
  engagementTypeLabel: string | null;
  /** Raw `engagement_type` for outcome / follow-up sync on debrief save. */
  engagementType: string | null;
  productFocus: string | null;
  /** When true, UI must not let the rep change provider/org targets. */
  locked: boolean;
};

/** Rep-facing propagation checklist — commercial impact destinations only. */
export type IntelligencePropagationTargetId = DebriefReviewPropagationTarget["id"];

export type IntelligencePropagationTarget = DebriefReviewPropagationTarget;

/** Three-scope propagation summary for capture review. */
export type IntelligenceScopePropagationTarget = {
  scope: IntelligenceScope;
  label: string;
  active: boolean;
  detail: string | null;
};

export function formatIntelligenceCaptureBanner(scope: IntelligenceCaptureScope): string {
  const parts = [
    scope.providerLabel,
    scope.organizationLabel,
    scope.engagementTypeLabel,
    scope.productFocus,
  ].filter((p): p is string => Boolean(p?.trim()));
  if (parts.length === 0) return "Updating from this engagement";
  return `Updating: ${parts.join(" • ")}`;
}

/** Compact log-update context — provider and facility only. */
export function formatLogUpdateContextLine(scope: IntelligenceCaptureScope): string {
  const parts = [scope.providerLabel, scope.organizationLabel].filter((p): p is string =>
    Boolean(p?.trim()),
  );
  if (parts.length === 0) return "Field intelligence capture";
  return `Updating: ${parts.join(" • ")}`;
}

export function buildIntelligenceCaptureScopeFromEngagement(input: {
  engagementId: string;
  providerId?: string | null;
  organizationId?: string | null;
  providerLabel?: string | null;
  organizationLabel?: string | null;
  engagementType?: string | null;
  engagementTypeLabel?: string | null;
  productLine?: string | null;
  opportunityProductLine?: string | null;
}): IntelligenceCaptureScope {
  const productRaw =
    String(input.productLine ?? "").trim() ||
    String(input.opportunityProductLine ?? "").trim().split(/[,;|]/)[0]?.trim() ||
    null;

  return {
    engagementId: input.engagementId,
    providerId: input.providerId ? String(input.providerId) : null,
    organizationId: input.organizationId ? String(input.organizationId) : null,
    providerLabel: input.providerLabel?.trim() || null,
    organizationLabel: input.organizationLabel?.trim() || null,
    engagementType: input.engagementType ? String(input.engagementType).trim() || null : null,
    engagementTypeLabel:
      input.engagementTypeLabel?.trim() ||
      (input.engagementType ? formatEngagementType(String(input.engagementType)) : null),
    productFocus: productRaw,
    locked: true,
  };
}

export function buildLogUpdateContextFromEngagementScope(
  scope: IntelligenceCaptureScope,
): AiNoteCaptureContext {
  return {
    engagementId: scope.engagementId ?? undefined,
    providerId: scope.providerId ?? undefined,
    providerLabel: scope.providerLabel ?? undefined,
    organizationId: scope.organizationId ?? undefined,
    organizationLabel: scope.organizationLabel ?? undefined,
    engagementTypeLabel: scope.engagementTypeLabel ?? undefined,
    productFocus: scope.productFocus ?? undefined,
    scopeLocked: scope.locked,
    launchSurface: "provider",
  };
}

function insightsTouchCategory(
  insights: TacticalDebriefInsight[],
  ids: TacticalDebriefInsight["category_id"][],
): boolean {
  return insights.some((i) => ids.includes(i.category_id) && i.items.length > 0);
}

function countFieldsByScope(
  dbKeys: string[],
): Record<IntelligenceScope, number> {
  const counts: Record<IntelligenceScope, number> = {
    organization: 0,
    provider: 0,
    case: 0,
  };
  for (const key of dbKeys) {
    const scope = intelligenceScopeForDbKey(key) ?? defaultCaptureScopeForDbKey(key);
    counts[scope] += 1;
  }
  return counts;
}

/** Canonical three-scope propagation — organization is not folded into provider by default. */
export function buildIntelligenceScopePropagationTargets(params: {
  scope: IntelligenceCaptureScope;
  logUpdate: LogUpdateParseResult | null;
  insights?: TacticalDebriefInsight[];
  engagementNotesSaved?: boolean;
}): IntelligenceScopePropagationTarget[] {
  const { scope, logUpdate, insights = [], engagementNotesSaved = false } = params;
  const acceptedFields =
    logUpdate?.fieldUpdates.filter((u) => u.accepted).map((u) => u.dbKey) ?? [];
  const fieldCounts = countFieldsByScope(acceptedFields);
  const anyFieldUpdates = acceptedFields.length > 0;
  const orgFieldUpdates = acceptedFields.filter(isOrganizationIntelligenceDbKey).length;

  const targets: IntelligenceScopePropagationTarget[] = [];

  if (scope.engagementId) {
    targets.push({
      scope: "case",
      label: INTELLIGENCE_SCOPE_LABELS.case,
      active: engagementNotesSaved || anyFieldUpdates,
      detail: engagementNotesSaved
        ? "Visit notes saved on this case touch"
        : anyFieldUpdates
          ? "Linked to this case"
          : null,
    });
  }

  if (scope.organizationId) {
    targets.push({
      scope: "organization",
      label: INTELLIGENCE_SCOPE_LABELS.organization,
      active:
        orgFieldUpdates > 0 ||
        acceptedFields.some(isOrganizationIntelligenceDbKey) ||
        insightsTouchCategory(insights, ["or_access"]),
      detail:
        orgFieldUpdates > 0
          ? `${orgFieldUpdates} facility field${orgFieldUpdates === 1 ? "" : "s"}`
          : insightsTouchCategory(insights, ["or_access"])
            ? "Facility access context from this touch"
            : null,
    });
  }

  if (scope.providerId) {
    const providerFieldCount = fieldCounts.provider;
    targets.push({
      scope: "provider",
      label: INTELLIGENCE_SCOPE_LABELS.provider,
      active: providerFieldCount > 0 || logUpdate?.usesProviderIntelligence === true,
      detail:
        providerFieldCount > 0
          ? `${providerFieldCount} surgeon-specific field${providerFieldCount === 1 ? "" : "s"}`
          : null,
    });
  }

  return targets;
}

/** Rep-friendly checklist — only destinations affected by accepted updates. */
export function buildIntelligencePropagationTargets(params: {
  scope: IntelligenceCaptureScope;
  logUpdate: LogUpdateParseResult | null;
  insights?: TacticalDebriefInsight[];
  proposedContacts?: DebriefProposedContactItem[];
  engagementNotesSaved?: boolean;
}): IntelligencePropagationTarget[] {
  return buildDebriefReviewPropagationTargets(params);
}

export function countActivePropagationTargets(targets: IntelligencePropagationTarget[]): number {
  return targets.filter((t) => t.active).length;
}

export function countActiveScopePropagationTargets(targets: IntelligenceScopePropagationTarget[]): number {
  return targets.filter((t) => t.active).length;
}
