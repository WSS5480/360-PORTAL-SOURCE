import { buildProviderOverviewHref } from "@/lib/surgical-sales/engagements/engagementCreateWizard";
import type { LogUpdateOpenAiMapping } from "@/lib/surgical-sales/logUpdateOpenAiMapping";
import type { LogUpdateParseResult } from "@/lib/surgical-sales/logUpdateParseFreeform";
import { propagationTargetDestinationId } from "@/lib/surgical-sales/debriefReviewPropagation";
import type { IntelligencePropagationTarget } from "@/lib/surgical-sales/intelligenceCapture/intelligenceCaptureScope";
import { fieldLabelForDbKey } from "@/lib/surgical-sales/logUpdateProviderRouting";
import { buildBriefSaveSummaryLines } from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefIntelligenceBriefCopy";
import {
  buildIntelligencePostSaveActions,
  type IntelligencePostSaveAction,
} from "@/lib/surgical-sales/intelligencePostSaveActions";
import {
  buildDebriefMappingHandoff,
  type DebriefMappingHandoff,
} from "@/lib/surgical-sales/buildDebriefMappingHandoff";
import {
  buildLogUpdateIntelligenceSaveConfirmation,
  type IntelligenceSaveConfirmationGroup,
} from "@/lib/surgical-sales/intelligenceSaveConfirmation";

export type SaveConfirmationMarker = "confirmed" | "warning" | "new";

export type SaveConfirmationLine = {
  id: string;
  text: string;
  marker: SaveConfirmationMarker;
};

export type SaveConfirmationCategory = {
  id: "provider_profile" | "engagement_record" | "operational_readiness" | "propagation";
  title: string;
  lines: SaveConfirmationLine[];
};

/** Zones on Field Briefing to pulse-highlight after save. */
export type FieldBriefingHighlightZone = "today" | "asks" | "risks" | "next" | "reference";

/** @deprecated Use IntelligencePostSaveAction */
export type TacticalDebriefPostTouchAction = IntelligencePostSaveAction;

export type TacticalDebriefSaveConfirmation = {
  categories: SaveConfirmationCategory[];
  /** Where accepted intelligence was stored — primary post-save display. */
  destinationGroups: IntelligenceSaveConfirmationGroup[];
  briefingHighlightZones: FieldBriefingHighlightZone[];
  propagationSummary: IntelligencePropagationTarget[];
  /** One-line progress signal for post-touch summary. */
  progressLine: string;
  /** Short bullets of what changed on file. */
  changedSummary: string[];
  remainingBlockers: string[];
  recommendedNextAction: string | null;
  postTouchActions: IntelligencePostSaveAction[];
  providerOverviewHref: string | null;
  mappingHandoff: DebriefMappingHandoff | null;
};

function line(
  id: string,
  text: string,
  marker: SaveConfirmationMarker = "confirmed",
): SaveConfirmationLine {
  return { id, text, marker };
}

function zonesForDbKey(dbKey: string): FieldBriefingHighlightZone[] {
  if (
    /observation|credential|access|coordinator|scheduling|cadence|feasibility/i.test(dbKey)
  ) {
    return ["today", "risks"];
  }
  if (/workflow|procedure|technique|volume|pain/i.test(dbKey)) {
    return ["today", "asks"];
  }
  if (/evaluation|vendor|preference|competitive|procurement/i.test(dbKey)) {
    return ["today", "reference"];
  }
  if (/communication|relationship|champion|responsiveness|follow_up|decision/i.test(dbKey)) {
    return ["today", "asks"];
  }
  return ["today"];
}

function zonesForPropagationTarget(id: string): FieldBriefingHighlightZone[] {
  switch (id) {
    case "observation_access_notes":
    case "or_access":
      return ["today", "risks"];
    case "clinical_focus":
      return ["today", "asks"];
    case "workflow_participants":
      return ["today", "asks"];
    case "follow_up_actions":
      return ["next"];
    case "engagement_notes":
    case "engagement":
      return ["next"];
    case "provider_profile":
    case "provider_understanding":
      return ["today", "reference"];
    case "deployment_readiness":
    case "organization":
      return ["reference"];
    default:
      return ["today"];
  }
}

export function buildTacticalDebriefSaveConfirmation(params: {
  logUpdate: LogUpdateParseResult | null;
  propagationTargets: IntelligencePropagationTarget[];
  engagementDebriefSaved: boolean;
  providerNoteSaved: boolean;
  engagementDebriefLine?: string | null;
  contactFollowUpTasks?: string[];
}): TacticalDebriefSaveConfirmation {
  const { logUpdate, propagationTargets, engagementDebriefSaved, providerNoteSaved } = params;
  const zoneSet = new Set<FieldBriefingHighlightZone>();

  const providerLines: SaveConfirmationLine[] = [];
  const engagementLines: SaveConfirmationLine[] = [];
  const readinessLines: SaveConfirmationLine[] = [];

  if (logUpdate?.usesProviderIntelligence) {
    const acceptedFields = logUpdate.fieldUpdates.filter((u) => u.accepted);
    const briefLines = buildBriefSaveSummaryLines(acceptedFields);
    if (briefLines.length > 0) {
      for (const text of briefLines) {
        providerLines.push(line(`brief-${text}`, text, "confirmed"));
      }
      for (const field of acceptedFields) {
        for (const z of zonesForDbKey(field.dbKey)) zoneSet.add(z);
      }
    } else {
      for (const field of acceptedFields) {
        const label = field.label.trim() || fieldLabelForDbKey(field.dbKey);
        providerLines.push(line(`field-${field.id}`, `${label} updated`, "confirmed"));
        for (const z of zonesForDbKey(field.dbKey)) zoneSet.add(z);
      }
    }
  }

  if (providerNoteSaved && logUpdate?.saveAsNoteAccepted) {
    providerLines.push(line("provider-note", "Field note added to provider access notes", "new"));
    zoneSet.add("reference");
  }

  const ai = logUpdate?.aiMapping;
  if (ai && logUpdate.aiMapping) {
    for (const u of ai.confirmed_updates) {
      const exists = providerLines.some((l) => l.text.toLowerCase().includes(u.label.toLowerCase().slice(0, 12)));
      if (!exists && u.save_target === "provider") {
        providerLines.push(line(`ai-c-${u.label}`, `${u.label} confirmed`, "confirmed"));
      }
    }
    for (const p of ai.partial_updates) {
      readinessLines.push(
        line(
          `partial-${p.label}`,
          `${p.label} — still to confirm: ${p.still_needs.slice(0, 2).join("; ") || "follow-up"}`,
          "warning",
        ),
      );
    }
    for (const q of ai.still_to_validate) {
      readinessLines.push(
        line(`confirm-${q.question.slice(0, 24)}`, q.question, q.priority === "high" ? "warning" : "warning"),
      );
    }
    for (const a of ai.recommended_next_moves) {
      engagementLines.push(
        line(`action-${a.action.slice(0, 20)}`, `Next action: ${a.action}`, "new"),
      );
      zoneSet.add("next");
    }
  } else if (logUpdate) {
    for (const gap of logUpdate.intelligenceReview.stillWorthConfirming) {
      readinessLines.push(line(`gap-${gap.slice(0, 20)}`, gap, "warning"));
    }
  }

  if (engagementDebriefSaved) {
    engagementLines.unshift(
      line("engagement-debrief", "Tactical debrief saved on this engagement", "confirmed"),
    );
    zoneSet.add("next");
  }

  for (const target of propagationTargets.filter((t) => t.active)) {
    for (const z of zonesForPropagationTarget(propagationTargetDestinationId(target))) {
      zoneSet.add(z);
    }
  }

  if (providerLines.length === 0 && logUpdate?.usesProviderIntelligence) {
    providerLines.push(line("provider-none", "No provider profile fields selected", "warning"));
  }

  const categories: SaveConfirmationCategory[] = [];

  if (providerLines.length > 0) {
    categories.push({ id: "provider_profile", title: "Provider profile", lines: providerLines });
  }
  if (engagementLines.length > 0) {
    categories.push({ id: "engagement_record", title: "Engagement record", lines: engagementLines });
  }
  if (readinessLines.length > 0) {
    categories.push({
      id: "operational_readiness",
      title: "Operational readiness",
      lines: readinessLines,
    });
  }

  const savedPropagation = propagationTargets.map((t) => ({
    ...t,
    active: t.active || engagementDebriefSaved,
    detail: t.active ? t.detail ?? "Updated successfully" : t.detail,
  }));

  const changedSummary = categories.flatMap((cat) =>
    cat.lines.filter((l) => l.marker === "confirmed" || l.marker === "new").map((l) => l.text),
  );

  const contactTasks = (params.contactFollowUpTasks ?? []).filter(Boolean);
  const remainingBlockers = [
    ...readinessLines.filter((l) => l.marker === "warning").map((l) => l.text),
    ...contactTasks,
  ].slice(0, 6);

  const recommendedNextAction =
    engagementLines.find((l) => l.text.toLowerCase().startsWith("next action:"))?.text.replace(
      /^Next action:\s*/i,
      "",
    ) ??
    ai?.recommended_next_moves?.[0]?.action ??
    null;

  const fieldsUpdated = providerLines.filter((l) => l.marker === "confirmed").length;
  const progressParts: string[] = [];
  if (fieldsUpdated > 0) {
    progressParts.push(
      `${fieldsUpdated} profile ${fieldsUpdated === 1 ? "field" : "fields"} updated`,
    );
  }
  if (engagementDebriefSaved) progressParts.push("touch debrief saved");
  if (providerNoteSaved) progressParts.push("field note added");
  const progressLine =
    progressParts.length > 0
      ? progressParts.join(" · ")
      : "Operational intelligence captured on this touch";

  const engagementDebriefLine = params.engagementDebriefSaved
    ? params.engagementDebriefLine?.trim() || "Touch debrief saved"
    : null;

  const destinationGroups = buildLogUpdateIntelligenceSaveConfirmation(params.logUpdate, {
    engagementDebriefLine,
    providerNoteLine: params.providerNoteSaved ? "Field note saved to provider access" : null,
  });

  return {
    categories,
    destinationGroups,
    briefingHighlightZones: [...zoneSet],
    propagationSummary: savedPropagation,
    progressLine,
    changedSummary: changedSummary.slice(0, 8),
    remainingBlockers,
    recommendedNextAction,
    postTouchActions: [],
    providerOverviewHref: null,
    mappingHandoff: null,
  };
}

/** @deprecated Use buildIntelligencePostSaveActions */
export function buildTacticalDebriefPostTouchActions(params: {
  providerId: string | null | undefined;
  accountId?: string | null;
  caseId?: string | null;
}): IntelligencePostSaveAction[] {
  return buildIntelligencePostSaveActions(params);
}

export function finalizeTacticalDebriefSaveConfirmation(
  confirmation: TacticalDebriefSaveConfirmation,
  params: {
    providerId: string | null | undefined;
    accountId?: string | null;
    caseId?: string | null;
    logUpdate?: LogUpdateParseResult | null;
  },
): TacticalDebriefSaveConfirmation {
  const providerId = String(params.providerId ?? "").trim();
  return {
    ...confirmation,
    postTouchActions: buildIntelligencePostSaveActions(params),
    providerOverviewHref: providerId ? buildProviderOverviewHref(providerId) : null,
    mappingHandoff: buildDebriefMappingHandoff({
      providerId,
      logUpdate: params.logUpdate ?? null,
    }),
  };
}
