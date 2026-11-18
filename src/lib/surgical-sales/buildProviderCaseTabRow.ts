import { formatCaseIdentityDate } from "@/lib/surgical-sales/buildCaseIdentity";
import { buildProviderCaseTimelineRow } from "@/lib/surgical-sales/buildProviderCaseTimelineRow";
import { formatRepFacingDisplayText } from "@/lib/surgical-sales/formatProviderIntelligencePreviewForRep";
import { formatSurgicalCaseType, isSurgicalObservationCase } from "@/lib/surgical-sales/labels";
import { buildObservationWorkflowIntelView } from "@/lib/surgical-sales/observationCaseExtractedWorkflowIntel";
import { observationQuickFindingsFromCaseRow } from "@/lib/surgical-sales/observationQuickFindings";
import {
  resolveProviderCaseCompletion,
  resolveProviderCaseStatusPresentation,
} from "@/lib/surgical-sales/resolveProviderCaseCompletion";

export type ProviderCaseKeySignalTone = "product" | "challenge" | "friction" | "positive" | "neutral";

export type ProviderCaseKeySignal = {
  label: string;
  tone: ProviderCaseKeySignalTone;
};

export type ProviderCaseTabRow = {
  caseId: string;
  procedureTitle: string;
  caseSubtitle: string;
  caseTypeLabel: string;
  dateLine: string;
  /** Day + time dictation was marked complete; null when not completed. */
  dictationCompletedLine: string | null;
  status: { id: string; label: string };
  completion: ReturnType<typeof resolveProviderCaseCompletion>;
  keySignals: ProviderCaseKeySignal[];
  detailHref: string;
  addNoteHref: string;
  intelligenceHref: string;
};

function formatDictationCompletedAt(iso: unknown): string | null {
  if (typeof iso !== "string" || !iso.trim()) return null;
  const date = new Date(iso.trim());
  if (Number.isNaN(date.getTime())) return null;
  const day = date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const time = date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${day} · ${time}`;
}

function resolveDictationCompletedLine(caseRow: Record<string, unknown>): string | null {
  const fromObservation = formatDictationCompletedAt(caseRow.observation_completed_at);
  if (fromObservation) return fromObservation;

  const status = String(caseRow.status ?? "").toLowerCase();
  if (status !== "completed") return null;

  const activities = Array.isArray(caseRow.activities) ? caseRow.activities : [];
  let latestNoteAt: string | null = null;
  for (const activity of activities) {
    if (!activity || typeof activity !== "object") continue;
    const row = activity as Record<string, unknown>;
    if (String(row.activity_type ?? "").toLowerCase() !== "note") continue;
    const createdAt = typeof row.created_at === "string" ? row.created_at.trim() : "";
    if (!createdAt) continue;
    if (!latestNoteAt || createdAt > latestNoteAt) latestNoteAt = createdAt;
  }
  return formatDictationCompletedAt(latestNoteAt);
}

const MAX_KEY_SIGNALS = 4;

function shortenSignalLabel(raw: string): string {
  const text = String(raw ?? "").trim();
  if (!text) return "";
  const formatted = formatRepFacingDisplayText(text) ?? text;
  if (formatted.length <= 120) return formatted;
  const slice = formatted.slice(0, 119);
  const lastSpace = slice.lastIndexOf(" ");
  if (lastSpace > 60) return `${slice.slice(0, lastSpace).trim()}…`;
  return `${slice.trim()}…`;
}

function inferSignalTone(label: string): ProviderCaseKeySignalTone {
  const text = label.toLowerCase();
  if (/\b(bard|mesh|acsis|product|kit|graft|fixation)\b/.test(text)) return "product";
  if (/\b(visualization|challenge|pain|difficult|frustration|frustrated)\b/.test(text)) return "challenge";
  if (/\b(friction|delay|bottleneck|issue|problem)\b/.test(text)) return "friction";
  if (/\b(staff|organized|familiar|positive|smooth|efficient)\b/.test(text)) return "positive";
  return "neutral";
}

function pushUniqueSignal(signals: ProviderCaseKeySignal[], seen: Set<string>, raw: unknown): void {
  if (signals.length >= MAX_KEY_SIGNALS) return;
  const label = shortenSignalLabel(String(raw ?? ""));
  if (!label) return;
  const key = label.toLowerCase();
  if (seen.has(key)) return;
  seen.add(key);
  signals.push({ label, tone: inferSignalTone(label) });
}

function quickFindingSignals(
  caseRow: Record<string, unknown>,
  signals: ProviderCaseKeySignal[],
  seen: Set<string>,
): void {
  const findings = observationQuickFindingsFromCaseRow(caseRow);
  if (findings.workflow_fit === "Strong" || findings.workflow_fit === "Possible") {
    pushUniqueSignal(signals, seen, "Product fit signal");
  }
  if (findings.product_interest === "Mentioned" || findings.product_interest === "Strong") {
    pushUniqueSignal(signals, seen, "Product interest");
  }
  if (findings.competitor_seen === "Yes") {
    pushUniqueSignal(signals, seen, "Competitor observed");
  }
  if (findings.workflow_friction === "Yes") {
    pushUniqueSignal(signals, seen, "Workflow friction");
  }
  if (findings.key_finding_note) {
    pushUniqueSignal(signals, seen, findings.key_finding_note);
  }
}

function collectKeySignals(caseRow: Record<string, unknown>): ProviderCaseKeySignal[] {
  const signals: ProviderCaseKeySignal[] = [];
  const seen = new Set<string>();

  const intel = buildObservationWorkflowIntelView(caseRow);
  for (const category of intel.categories) {
    for (const item of category.items) {
      pushUniqueSignal(signals, seen, item);
      if (signals.length >= MAX_KEY_SIGNALS) return signals;
    }
  }

  if (isSurgicalObservationCase(caseRow.case_type)) {
    quickFindingSignals(caseRow, signals, seen);
  }

  const timeline = buildProviderCaseTimelineRow(caseRow);
  for (const line of timeline.outcomeLines) {
    if (line === "Learning in progress" || line === "Coverage outcome pending" || line === "Outcome not recorded") {
      continue;
    }
    pushUniqueSignal(signals, seen, line);
    if (signals.length >= MAX_KEY_SIGNALS) return signals;
  }

  return signals;
}

function buildCaseSubtitle(caseRow: Record<string, unknown>, caseTypeLabel: string): string {
  const caseNumber = String(caseRow.case_number ?? "").trim();
  if (caseNumber) return `${caseTypeLabel} ${caseNumber}`;
  return caseTypeLabel;
}

function fieldNotesTab(caseRow: Record<string, unknown>): string {
  return isSurgicalObservationCase(caseRow.case_type) ? "workflow" : "field_notes";
}

export function buildProviderCaseTabRow(caseRow: Record<string, unknown>): ProviderCaseTabRow {
  const caseId = String(caseRow.id ?? "");
  const timeline = buildProviderCaseTimelineRow(caseRow);
  const caseTypeLabel = formatSurgicalCaseType(String(caseRow.case_type ?? ""));
  const { dateLine } = formatCaseIdentityDate(
    caseRow.case_date as string | null | undefined,
    caseRow.case_time as string | null | undefined,
  );
  const notesTab = fieldNotesTab(caseRow);
  const procedureTitle =
    timeline.procedureLabel.trim() && timeline.procedureLabel !== "Procedure pending"
      ? timeline.procedureLabel
      : caseTypeLabel;

  return {
    caseId,
    procedureTitle,
    caseSubtitle: buildCaseSubtitle(caseRow, caseTypeLabel),
    caseTypeLabel,
    dateLine,
    dictationCompletedLine: resolveDictationCompletedLine(caseRow),
    status: resolveProviderCaseStatusPresentation(caseRow),
    completion: resolveProviderCaseCompletion(caseRow),
    keySignals: collectKeySignals(caseRow),
    detailHref: `/portal/sales/cases/${encodeURIComponent(caseId)}`,
    addNoteHref: `/portal/sales/cases/${encodeURIComponent(caseId)}?tab=${notesTab}`,
    intelligenceHref: `/portal/sales/cases/${encodeURIComponent(caseId)}?tab=${isSurgicalObservationCase(caseRow.case_type) ? "activity" : "intelligence"}`,
  };
}

export function buildProviderCaseTabRows(cases: Record<string, unknown>[]): ProviderCaseTabRow[] {
  return cases.map((caseRow) => buildProviderCaseTabRow(caseRow));
}
