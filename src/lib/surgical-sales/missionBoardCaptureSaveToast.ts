import type { DebriefProposedContactItem } from "@/lib/surgical-sales/debriefDetectedContact";
import type { LogUpdateParseResult } from "@/lib/surgical-sales/logUpdateParseFreeform";
import { logUpdateSavedDisplayLine } from "@/lib/surgical-sales/intelligenceSaveConfirmation";
import { logUpdateQuickCaptureSuccessDetail } from "@/lib/surgical-sales/logUpdateUx";

export type MissionBoardCaptureSaveToast = {
  title: string;
  detail?: string;
};

const INTERNAL_LINE_RE =
  /\b(saved to|organization intelligence|provider intelligence|provider_|dbkey|engagement_note)\b/i;

const FIELD_TOAST_OVERRIDES: Record<string, (value: string) => string | null> = {
  provider_observation_feasibility: (value) => {
    const normalized = value.trim().toLowerCase();
    if (["interested", "yes", "discussed"].includes(normalized) || /interest/i.test(value)) {
      return "Observation interest recorded";
    }
    if (/permission|requested|pending/i.test(value)) {
      return "Permission requested";
    }
    return null;
  },
  provider_evaluation_openness: (value) =>
    /interest|open|receptive/i.test(value) ? "Observation interest recorded" : null,
  provider_observation_credentialing_needed: () => "Credentialing requirement added",
  provider_observation_coordinator_contact: () => "Scheduler contact noted",
};

function isUserFacingSaveLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  if (INTERNAL_LINE_RE.test(trimmed)) return false;
  if (/^[a-z0-9_]+:/i.test(trimmed)) return false;
  return true;
}

function friendlySaveLine(dbKey: string, value: string, fallback: string): string {
  const override = FIELD_TOAST_OVERRIDES[dbKey]?.(value);
  if (override) return override;
  if (isUserFacingSaveLine(fallback)) return fallback;
  return fallback;
}

function schedulerCandidateSaved(contacts: DebriefProposedContactItem[]): boolean {
  return contacts.some((contact) => {
    if (contact.disposition === "skipped") return false;
    const role = `${contact.roleLabel ?? ""} ${contact.workflowLabel ?? ""}`;
    return /schedul/i.test(role) || contact.mentionLevel === "potential_support_contact";
  });
}

/** User-facing toast copy for Mission Board quick capture — no storage destinations or field keys. */
export function buildMissionBoardCaptureSaveToast(
  review: LogUpdateParseResult,
  proposedContacts: DebriefProposedContactItem[] = [],
): MissionBoardCaptureSaveToast {
  const lines: string[] = [];

  if (review.usesProviderIntelligence) {
    for (const field of review.fieldUpdates.filter((update) => update.accepted)) {
      const line = friendlySaveLine(
        field.dbKey,
        field.proposedValue,
        logUpdateSavedDisplayLine(field),
      );
      if (line && !lines.includes(line)) {
        lines.push(line);
      }
    }
  }

  if (schedulerCandidateSaved(proposedContacts) && !lines.some((line) => /scheduler candidate/i.test(line))) {
    lines.push("Scheduler candidate saved");
  }

  return {
    title: "Provider updated",
    detail: lines.length > 0 ? lines.join(" • ") : undefined,
  };
}

export function isMissionBoardQuickCaptureSurface(
  surface: string | null | undefined,
): boolean {
  return surface === "mission_board";
}

/** Toast after Quick Capture — note saved; suggestions queued for later review. */
export function buildQuickCaptureSaveToast(suggestionCount: number): MissionBoardCaptureSaveToast {
  return { title: logUpdateQuickCaptureSuccessDetail(suggestionCount) };
}
