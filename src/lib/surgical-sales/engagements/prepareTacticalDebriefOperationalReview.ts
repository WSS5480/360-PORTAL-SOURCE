import type {
  TacticalDebriefAnalysis,
  TacticalDebriefCategoryId,
  TacticalDebriefInsightItem,
} from "@/lib/surgical-sales/engagements/prepareTacticalDebriefAnalyze";
import { intelligenceSaveDestinationLabel } from "@/lib/surgical-sales/intelligenceSaveDestination";
import {
  TACTICAL_DEBRIEF_OPERATIONAL_SECTION_LABELS,
  type TacticalDebriefOperationalSectionId,
} from "@/lib/surgical-sales/engagements/prepareTacticalDebriefUx";
import type { IntelligencePropagationTarget } from "@/lib/surgical-sales/intelligenceCapture/intelligenceCaptureScope";
import type { LogUpdateParseResult } from "@/lib/surgical-sales/logUpdateParseFreeform";
import type { LogUpdateRoutedFieldUpdate } from "@/lib/surgical-sales/logUpdateProviderRouting";
import { sanitizeFieldIntelligenceText } from "@/lib/surgical-sales/fieldIntelligenceLanguage";

export type OperationalReviewMarker = "confirmed" | "partial" | "pending" | "risk" | "opportunity" | "action";

export type OperationalReviewLine = {
  id: string;
  marker: OperationalReviewMarker;
  text: string;
};

export type TacticalDebriefOperationalSection = {
  id: TacticalDebriefOperationalSectionId;
  title: string;
  lines: OperationalReviewLine[];
};

export type TacticalDebriefOperationalReview = {
  sections: TacticalDebriefOperationalSection[];
  update_count: number;
};

const INTERNAL_NOTE_MARKERS = [
  /^---\s*tactical\s+debrief\s+---\s*$/i,
  /^what happened:\s*$/i,
  /^operational intelligence captured:\s*$/i,
];

export function sanitizeDebriefDisplayText(text: string): string {
  let t = String(text ?? "")
    .replace(/^[-*•\d.]+\s*/, "")
    .replace(/^[A-Za-z][\w\s/&-]{2,42}:\s+/, "")
    .trim();
  if (!t) return "";
  if (/^[-—\s]*tactical\s+debrief[-—\s]*$/i.test(t)) return "";
  for (const re of INTERNAL_NOTE_MARKERS) {
    if (re.test(t)) return "";
  }
  if (/^---\s*.+---\s*$/i.test(t)) return "";
  const cleaned = sanitizeFieldIntelligenceText(t.replace(/\s+/g, " ").trim(), { maxLen: 500 });
  return cleaned || t.replace(/\s+/g, " ").trim();
}

function looksPartial(text: string): boolean {
  return /\b(partial|unclear|maybe|might|possibly|still confirming|not sure|TBD|unknown)\b/i.test(text);
}

function markerForField(update: LogUpdateRoutedFieldUpdate): OperationalReviewMarker {
  if (!update.accepted) return "pending";
  if (update.conflict && !update.conflict.resolution) return "partial";
  if (update.conflict?.resolution === "append") return "partial";
  return "confirmed";
}

function fieldReviewLine(update: LogUpdateRoutedFieldUpdate): OperationalReviewLine | null {
  const marker = markerForField(update);
  const label = update.label.trim();
  if (!label) return null;

  const scopeTag = intelligenceSaveDestinationLabel(update.proposedDestination);
  let text = `[${scopeTag}] ${label}`;
  if (marker === "partial") {
    text = looksPartial(label) ? text : `${text} — needs confirmation`;
  } else if (marker === "pending") {
    text = `Still confirm: ${text}`;
  }

  return { id: `field-${update.id}`, marker, text };
}

function insightHeadline(categoryId: TacticalDebriefCategoryId, item: string): string {
  const detail = sanitizeDebriefDisplayText(item);
  const partial = looksPartial(detail);

  switch (categoryId) {
    case "new_stakeholders":
      return partial ? "Stakeholder signal needs confirmation" : "Stakeholder identified";
    case "or_access":
      return partial ? "Observation process needs confirmation" : "OR access pathway identified";
    case "blockers_resolved":
      return "Operational risk signal cleared";
    case "workflow_intelligence":
      return partial ? "Workflow friction signal added" : "Workflow intelligence captured";
    case "product_interest":
      return "Product interest signal captured";
    case "next_step_opportunity":
      return partial ? "Next step needs confirmation" : "Next-step opportunity identified";
    case "deployment_readiness":
      return partial ? "Deployment readiness needs confirmation" : "Relationship / readiness signal updated";
    default:
      return detail.slice(0, 72) || "Intelligence signal captured";
  }
}

function insightLine(
  categoryId: TacticalDebriefCategoryId,
  item: TacticalDebriefInsightItem,
  index: number,
): OperationalReviewLine {
  const detail = sanitizeDebriefDisplayText(item.text);
  const scopeTag = intelligenceSaveDestinationLabel(item.proposed_destination);
  const headline = insightHeadline(categoryId, item.text);
  const partial = looksPartial(detail) || categoryId === "deployment_readiness" && /\b(risk|block|not ready)\b/i.test(detail);
  const marker: OperationalReviewMarker =
    categoryId === "deployment_readiness" && /\b(risk|block|friction|delay)\b/i.test(detail)
      ? "risk"
      : categoryId === "next_step_opportunity"
        ? "opportunity"
        : partial
          ? "partial"
          : "confirmed";

  const body =
    detail && detail.length > 12 && !detail.toLowerCase().startsWith(headline.toLowerCase())
      ? `${headline} — ${detail.length > 90 ? `${detail.slice(0, 89)}…` : detail}`
      : headline;
  const text = `[${scopeTag}] ${body}`;

  return { id: `insight-${categoryId}-${index}`, marker, text };
}

function section(
  id: TacticalDebriefOperationalSectionId,
  lines: OperationalReviewLine[],
): TacticalDebriefOperationalSection {
  return {
    id,
    title: TACTICAL_DEBRIEF_OPERATIONAL_SECTION_LABELS[id],
    lines,
  };
}

function dedupeLines(lines: OperationalReviewLine[]): OperationalReviewLine[] {
  const seen = new Set<string>();
  const out: OperationalReviewLine[] = [];
  for (const line of lines) {
    const key = `${line.marker}:${line.text.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(line);
  }
  return out;
}

export function prepareLogUpdateForCommit(logUpdate: LogUpdateParseResult): LogUpdateParseResult {
  return {
    ...logUpdate,
    fieldUpdates: logUpdate.fieldUpdates.map((u) => ({
      ...u,
      accepted: true,
      conflict: u.conflict ? { ...u.conflict, resolution: u.conflict.resolution ?? "replace" } : null,
    })),
    saveAsNoteAccepted: true,
  };
}

export function buildTacticalDebriefOperationalReview(input: {
  analysis: TacticalDebriefAnalysis;
  propagationTargets?: IntelligencePropagationTarget[];
}): TacticalDebriefOperationalReview {
  const { analysis, propagationTargets = [] } = input;
  const logUpdate = analysis.log_update;

  const confirmed: OperationalReviewLine[] = [];
  const partial: OperationalReviewLine[] = [];
  const worthConfirming: OperationalReviewLine[] = [];
  const suggestedNext: OperationalReviewLine[] = [];
  const whereUpdates: OperationalReviewLine[] = [];

  const ai = logUpdate?.aiMapping;
  if (ai && logUpdate?.aiMapping) {
    confirmed.push({
      id: "ai-summary",
      marker: "confirmed",
      text: sanitizeDebriefDisplayText(ai.summary) || ai.summary,
    });

    ai.confirmed_updates.forEach((u, i) => {
      const marker: OperationalReviewMarker =
        u.confidence === "high" ? "confirmed" : u.confidence === "medium" ? "partial" : "pending";
      confirmed.push({
        id: `ai-confirmed-${i}`,
        marker,
        text: `[${u.save_target}] ${u.label} (${u.domain.replace(/_/g, " ")}) — ${sanitizeDebriefDisplayText(u.value) || u.value}`,
      });
    });

    ai.partial_updates.forEach((u, i) => {
      partial.push({
        id: `ai-partial-${i}`,
        marker: "partial",
        text: `${u.label} — ${sanitizeDebriefDisplayText(u.value) || u.value}${
          u.still_needs.length ? ` · Still needs: ${u.still_needs.join("; ")}` : ""
        }`,
      });
    });

    ai.still_to_validate.forEach((q, i) => {
      worthConfirming.push({
        id: `ai-confirm-${i}`,
        marker: q.priority === "high" ? "pending" : "pending",
        text: q.question,
      });
    });

    ai.recommended_next_moves.forEach((a, i) => {
      suggestedNext.push({
        id: `ai-action-${i}`,
        marker: "action",
        text: `${a.action} (${a.owner_type})`,
      });
    });

    for (const field of logUpdate.fieldUpdates) {
      const line = fieldReviewLine(field);
      if (!line) continue;
      if (line.marker === "confirmed") confirmed.push(line);
      else if (line.marker === "partial") partial.push(line);
      else worthConfirming.push(line);
    }
  } else if (logUpdate?.usesProviderIntelligence) {
    for (const field of logUpdate.fieldUpdates) {
      const line = fieldReviewLine(field);
      if (!line) continue;
      if (line.marker === "confirmed") confirmed.push(line);
      else if (line.marker === "partial") partial.push(line);
      else worthConfirming.push(line);
    }
  }

  if (!(ai && logUpdate?.aiMapping)) {
    for (const insight of analysis.insights) {
      insight.items.forEach((item, index) => {
        const line = insightLine(insight.category_id, item, index);
        if (line.marker === "risk" || line.marker === "opportunity") {
          suggestedNext.push({ ...line, marker: "action" });
        } else if (line.marker === "partial") {
          partial.push(line);
        } else {
          confirmed.push(line);
        }
      });
    }

    for (const sectionId of ["operational_risks", "recommended_next_actions"] as const) {
      const block = analysis.sections.find((s) => s.id === sectionId);
      if (!block) continue;
      for (const item of block.items) {
        const text = sanitizeDebriefDisplayText(item);
        if (!text) continue;
        suggestedNext.push({
          id: `next-${sectionId}-${text.slice(0, 20)}`,
          marker: "action",
          text:
            sectionId === "operational_risks"
              ? looksPartial(text)
                ? `Address operational risk — ${text}`
                : `Operational risk to track — ${text}`
              : looksPartial(text)
                ? `Confirm next step — ${text}`
                : `Suggested next step — ${text}`,
        });
      }
    }
  } else if (ai) {
    for (const item of ai.do_not_update) {
      worthConfirming.push({
        id: `ai-skip-${item.item.slice(0, 16)}`,
        marker: "pending",
        text: `${item.item} — ${item.reason}`,
      });
    }
  }

  if (confirmed.length === 0 && analysis.signal_count > 0) {
    worthConfirming.push({
      id: "confirm-signals",
      marker: "pending",
      text: "Review captured signals before your next touch",
    });
  }

  if (worthConfirming.length === 0 && analysis.signal_count === 0) {
    worthConfirming.push({
      id: "confirm-empty",
      marker: "pending",
      text: "Add OR access, workflow, or stakeholder detail on your next visit",
    });
  }

  for (const target of propagationTargets.filter((t) => t.active)) {
    whereUpdates.push({
      id: `prop-${target.id}`,
      marker: "action",
      text: target.detail ? `${target.label} — ${target.detail}` : target.label,
    });
  }

  if (suggestedNext.length === 0 && analysis.signal_count > 0) {
    suggestedNext.push({
      id: "followup-generic",
      marker: "action",
      text: "Lock a dated follow-up before you leave the site",
    });
  }

  if (whereUpdates.length === 0 && propagationTargets.length > 0) {
    whereUpdates.push({
      id: "where-engagement",
      marker: "action",
      text: "This engagement record",
    });
  }

  const sections = [
    section("confirmed", dedupeLines(confirmed)),
    section("partial", dedupeLines(partial)),
    section("worth_confirming", dedupeLines(worthConfirming)),
    section("suggested_next_actions", dedupeLines(suggestedNext)),
    section("where_this_updates", dedupeLines(whereUpdates)),
  ].filter((s) => s.lines.length > 0);

  const update_count =
    confirmed.length +
    partial.length +
    (logUpdate?.fieldUpdates.filter((u) => u.accepted).length ?? 0);

  return { sections, update_count };
}

export function formatOperationalInsightBullet(
  categoryId: TacticalDebriefCategoryId,
  item: string,
): string {
  const headline = insightHeadline(categoryId, item);
  const detail = sanitizeDebriefDisplayText(item);
  if (!detail || detail.toLowerCase() === headline.toLowerCase()) return headline;
  return `${headline} — ${detail.length > 120 ? `${detail.slice(0, 119)}…` : detail}`;
}
