/**
 * Debrief approval view — operational signals, pathway-mapped updates, gaps only.
 */

import type { TacticalDebriefAnalysis } from "@/lib/surgical-sales/engagements/prepareTacticalDebriefAnalyze";
import { sanitizeDebriefDisplayText } from "@/lib/surgical-sales/engagements/prepareTacticalDebriefOperationalReview";
import { formatOperationalInsightBullet } from "@/lib/surgical-sales/engagements/prepareTacticalDebriefOperationalReview";
import type { LogUpdateParseResult } from "@/lib/surgical-sales/logUpdateParseFreeform";
import type { LogUpdateOpenAiMapping } from "@/lib/surgical-sales/logUpdateOpenAiMapping";
import type { LogUpdateRoutedFieldUpdate } from "@/lib/surgical-sales/logUpdateProviderRouting";
import {
  confidenceForFieldUpdate,
  recommendedUpdateHeadline,
} from "@/lib/surgical-sales/logUpdateReviewPresentation";
import type { IntelligenceDomain } from "@/lib/surgical-sales/structuredIntelligenceAnalysis";
import { sanitizeFieldIntelligenceText } from "@/lib/surgical-sales/fieldIntelligenceLanguage";

export type DebriefSuggestedStatus = "confirmed" | "partial" | "positive" | "unknown";

export type DebriefApprovalSignal = {
  id: string;
  text: string;
};

export type DebriefApprovalSuggestedUpdate = {
  id: string;
  label: string;
  status: DebriefSuggestedStatus;
  statusDisplay: string;
  pathwayRequirement: string | null;
};

export type DebriefApprovalMissingItem = {
  id: string;
  text: string;
};

export type DebriefApprovalSaveItem = {
  field: LogUpdateRoutedFieldUpdate;
};

export type DebriefApprovalView = {
  signalsDetected: DebriefApprovalSignal[];
  suggestedUpdates: DebriefApprovalSuggestedUpdate[];
  stillMissing: DebriefApprovalMissingItem[];
  saveItems: DebriefApprovalSaveItem[];
};

const PATHWAY_BY_DOMAIN: Partial<Record<IntelligenceDomain, string>> = {
  or_access: "OR access approval",
  credentialing: "Credentialing path",
  scheduling: "Scheduler identified",
  workflow: "Workflow validated",
  relationship: "Engagement style",
  stakeholders: "Stakeholder map",
  evaluation: "Observation willingness",
  product_fit: "Product fit",
  case_mix: "Procedure mix",
  procurement: "Vendor clearance",
  next_steps: "Next touch logistics",
};

/** Rep-facing status words — business language, never extraction taxonomy. */
const STATUS_DISPLAY: Record<DebriefSuggestedStatus, string> = {
  confirmed: "Confirmed",
  partial: "Needs confirmation",
  positive: "Positive signal",
  unknown: "Review",
};

function pathwayForDomain(domain: IntelligenceDomain | string | undefined): string | null {
  if (!domain) return null;
  return PATHWAY_BY_DOMAIN[domain as IntelligenceDomain] ?? null;
}

function statusForConfirmed(domain: IntelligenceDomain, confidence: string): DebriefSuggestedStatus {
  if (domain === "evaluation" || domain === "relationship") {
    if (confidence === "high" || confidence === "medium") return "positive";
  }
  if (confidence === "high") return "confirmed";
  if (confidence === "medium") return "partial";
  return "unknown";
}

function statusForPartial(): DebriefSuggestedStatus {
  return "partial";
}

function toSuggestedRow(
  id: string,
  label: string,
  status: DebriefSuggestedStatus,
  domain?: IntelligenceDomain | string,
): DebriefApprovalSuggestedUpdate {
  const cleanLabel = sanitizeFieldIntelligenceText(label, { maxLen: 48 }) || label;
  return {
    id,
    label: cleanLabel,
    status,
    statusDisplay: STATUS_DISPLAY[status],
    pathwayRequirement: pathwayForDomain(domain),
  };
}

function buildFromAiMapping(ai: LogUpdateOpenAiMapping): Pick<
  DebriefApprovalView,
  "signalsDetected" | "suggestedUpdates" | "stillMissing"
> {
  const signalsDetected: DebriefApprovalSignal[] = ai.operational_signals
    .map((s, i) => {
      const text = sanitizeDebriefDisplayText(s.signal) || sanitizeDebriefDisplayText(s.evidence);
      if (!text) return null;
      return { id: `signal-${i}`, text };
    })
    .filter((s): s is DebriefApprovalSignal => Boolean(s));

  const suggestedUpdates: DebriefApprovalSuggestedUpdate[] = [];

  ai.confirmed_updates.forEach((u, i) => {
    suggestedUpdates.push(
      toSuggestedRow(
        `ai-confirmed-${i}`,
        u.label,
        statusForConfirmed(u.domain, u.confidence),
        u.domain,
      ),
    );
  });

  ai.partial_updates.forEach((u, i) => {
    suggestedUpdates.push(toSuggestedRow(`ai-partial-${i}`, u.label, statusForPartial(), u.domain));
  });

  const stillMissing: DebriefApprovalMissingItem[] = [];

  ai.still_to_validate.forEach((q, i) => {
    const text = sanitizeDebriefDisplayText(q.question);
    if (!text) return;
    stillMissing.push({
      id: `validate-${i}`,
      text: text.endsWith("?") ? text : `${text}?`,
    });
  });

  ai.partial_updates.forEach((u, i) => {
    for (const need of u.still_needs) {
      const t = sanitizeDebriefDisplayText(need);
      if (!t) continue;
      stillMissing.push({ id: `need-${i}-${t.slice(0, 12)}`, text: t });
    }
  });

  ai.do_not_update.forEach((row, i) => {
    const t = sanitizeDebriefDisplayText(row.item);
    if (!t) return;
    stillMissing.push({ id: `skip-${i}`, text: t });
  });

  return { signalsDetected, suggestedUpdates, stillMissing };
}

function dedupeSuggested(updates: DebriefApprovalSuggestedUpdate[]): DebriefApprovalSuggestedUpdate[] {
  const seen = new Set<string>();
  const out: DebriefApprovalSuggestedUpdate[] = [];
  for (const row of updates) {
    const key = row.label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }
  return out;
}

function dedupeMissing(items: DebriefApprovalMissingItem[]): DebriefApprovalMissingItem[] {
  const seen = new Set<string>();
  const out: DebriefApprovalMissingItem[] = [];
  for (const row of items) {
    const key = row.text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }
  return out;
}

function dedupeSignals(signals: DebriefApprovalSignal[]): DebriefApprovalSignal[] {
  const seen = new Set<string>();
  const out: DebriefApprovalSignal[] = [];
  for (const row of signals) {
    const key = row.text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }
  return out;
}

export function buildDebriefApprovalView(review: LogUpdateParseResult): DebriefApprovalView {
  const saveItems: DebriefApprovalSaveItem[] = review.fieldUpdates.map((field) => ({ field }));

  const aiMapping = review.aiMapping;
  if (aiMapping) {
    const fromAi = buildFromAiMapping(aiMapping);
    const fieldSuggested = saveItems.map((item, i) => {
      const label = recommendedUpdateHeadline(item.field);
      const conf = confidenceForFieldUpdate(item.field, aiMapping);
      let status: DebriefSuggestedStatus = "unknown";
      if (item.field.id.startsWith("ai-partial-")) status = "partial";
      else if (conf === "high") status = "confirmed";
      else if (conf === "medium") status = "partial";
      return toSuggestedRow(`field-${i}`, label, status);
    });

    const mergedSuggested = dedupeSuggested([...fromAi.suggestedUpdates, ...fieldSuggested]);

    return {
      signalsDetected: dedupeSignals(fromAi.signalsDetected).slice(0, 8),
      suggestedUpdates: mergedSuggested.slice(0, 10),
      stillMissing: dedupeMissing(fromAi.stillMissing).slice(0, 8),
      saveItems,
    };
  }

  return buildDebriefApprovalViewFromAnalysisFallback(review, saveItems);
}

function buildDebriefApprovalViewFromAnalysisFallback(
  review: LogUpdateParseResult,
  saveItems: DebriefApprovalSaveItem[],
): DebriefApprovalView {
  const signalsDetected: DebriefApprovalSignal[] = [];
  const suggestedUpdates: DebriefApprovalSuggestedUpdate[] = saveItems.map((item, i) =>
    toSuggestedRow(`field-${i}`, recommendedUpdateHeadline(item.field), "partial"),
  );

  const stillMissing: DebriefApprovalMissingItem[] = review.intelligenceReview.stillWorthConfirming
    .map((gap, i) => ({
      id: `gap-${i}`,
      text: sanitizeDebriefDisplayText(gap) || gap,
    }))
    .filter((g) => g.text.length > 3);

  return {
    signalsDetected,
    suggestedUpdates,
    stillMissing: dedupeMissing(stillMissing).slice(0, 8),
    saveItems,
  };
}

export function buildDebriefApprovalViewFromTacticalAnalysis(
  analysis: TacticalDebriefAnalysis,
): DebriefApprovalView {
  const logUpdate = analysis.log_update;
  if (logUpdate) {
    return buildDebriefApprovalView(logUpdate);
  }

  const signalsDetected: DebriefApprovalSignal[] = [];
  const suggestedUpdates: DebriefApprovalSuggestedUpdate[] = [];
  const stillMissing: DebriefApprovalMissingItem[] = [];

  for (const insight of analysis.insights) {
    insight.items.forEach((item, index) => {
      const line = sanitizeDebriefDisplayText(formatOperationalInsightBullet(insight.category_id, item.text));
      if (!line) return;
      if (insight.category_id === "next_step_opportunity") {
        stillMissing.push({ id: `insight-${insight.category_id}-${index}`, text: line });
        return;
      }
      if (
        insight.category_id === "or_access" ||
        insight.category_id === "workflow_intelligence" ||
        insight.category_id === "new_stakeholders"
      ) {
        signalsDetected.push({ id: `insight-${insight.category_id}-${index}`, text: line });
      } else {
        suggestedUpdates.push(
          toSuggestedRow(`insight-${insight.category_id}-${index}`, line, "partial", insight.category_id),
        );
      }
    });
  }

  for (const section of analysis.sections) {
    if (section.id === "recommended_next_actions" || section.id === "operational_risks") {
      for (const item of section.items) {
        const t = sanitizeDebriefDisplayText(item);
        if (t) stillMissing.push({ id: `sec-${section.id}-${t.slice(0, 16)}`, text: t });
      }
      continue;
    }
    if (section.id === "detected_signals") {
      for (const item of section.items) {
        const t = sanitizeDebriefDisplayText(item);
        if (t) signalsDetected.push({ id: `sec-${t.slice(0, 16)}`, text: t });
      }
    }
  }

  return {
    signalsDetected: dedupeSignals(signalsDetected).slice(0, 8),
    suggestedUpdates: dedupeSuggested(suggestedUpdates).slice(0, 8),
    stillMissing: dedupeMissing(stillMissing).slice(0, 8),
    saveItems: [],
  };
}
