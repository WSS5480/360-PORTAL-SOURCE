import { resolveScopeForTacticalDebriefItem } from "@/lib/surgical-sales/intelligenceScopeInference";
import {
  resolveIntelligenceSaveDestination,
  type IntelligenceSaveDestination,
} from "@/lib/surgical-sales/intelligenceSaveDestination";
import type { IntelligenceScope } from "@/lib/surgical-sales/intelligenceScopeModel";
import { parseLogUpdateFreeform, type LogUpdateParseResult } from "@/lib/surgical-sales/logUpdateParseFreeform";
import type { LogUpdateOpenAiMapping } from "@/lib/surgical-sales/logUpdateOpenAiMapping";
import { formatOperationalInsightBullet } from "@/lib/surgical-sales/engagements/prepareTacticalDebriefOperationalReview";
import {
  TACTICAL_DEBRIEF_SECTION_EMPTY,
  TACTICAL_DEBRIEF_SECTION_LABELS,
  type TacticalDebriefReviewSectionId,
} from "@/lib/surgical-sales/engagements/prepareTacticalDebriefUx";

function scopedDebriefItem(
  categoryId: TacticalDebriefCategoryId,
  text: string,
): TacticalDebriefInsightItem {
  const { scope, reason } = resolveScopeForTacticalDebriefItem(categoryId, text);
  const destination = resolveIntelligenceSaveDestination({ scope, text });
  return {
    text,
    proposed_scope: scope,
    scope_reason: reason,
    proposed_destination: destination.destination,
    destination_reason: destination.reason,
  };
}

export type TacticalDebriefCategoryId =
  | "blockers_resolved"
  | "new_stakeholders"
  | "or_access"
  | "workflow_intelligence"
  | "product_interest"
  | "next_step_opportunity"
  | "deployment_readiness";

export type TacticalDebriefInsightItem = {
  text: string;
  proposed_scope: IntelligenceScope;
  scope_reason: string;
  proposed_destination: IntelligenceSaveDestination;
  destination_reason: string;
};

export type TacticalDebriefInsight = {
  category_id: TacticalDebriefCategoryId;
  category_label: string;
  items: TacticalDebriefInsightItem[];
};

export type TacticalDebriefReviewSection = {
  id: TacticalDebriefReviewSectionId;
  title: string;
  items: string[];
  empty_hint: string | null;
};

export type TacticalDebriefAnalysis = {
  insights: TacticalDebriefInsight[];
  summary: string;
  signal_count: number;
  sections: TacticalDebriefReviewSection[];
  log_update: LogUpdateParseResult | null;
};

const INSIGHTS_BY_SECTION: Record<
  Exclude<TacticalDebriefReviewSectionId, "suggested_system_updates" | "detected_signals">,
  TacticalDebriefCategoryId[]
> = {
  operational_risks: ["deployment_readiness", "or_access"],
  stakeholder_insights: ["new_stakeholders"],
  workflow_intelligence: ["workflow_intelligence"],
  recommended_next_actions: ["next_step_opportunity"],
};

const DETECTED_SIGNAL_CATEGORIES: TacticalDebriefCategoryId[] = [
  "blockers_resolved",
  "product_interest",
];

export const TACTICAL_DEBRIEF_CATEGORIES: ReadonlyArray<{
  id: TacticalDebriefCategoryId;
  label: string;
  patterns: readonly RegExp[];
}> = [
  {
    id: "blockers_resolved",
    label: "Blockers resolved",
    patterns: [
      /\b(credential|credentialed|approved|approval|cleared|unblocked|resolved|removed barrier|signed off|green.?light)\b/i,
      /\b(no longer (?:a )?blocker|barrier (?:is )?down)\b/i,
    ],
  },
  {
    id: "new_stakeholders",
    label: "New stakeholders",
    patterns: [
      /\b(champion|coordinator|director|manager|nurse|PA|fellow|resident|stakeholder|decision.?maker)\b/i,
      /\b(met with|introduced to|spoke with|brought in|looping in|reports to)\b/i,
    ],
  },
  {
    id: "or_access",
    label: "OR access updates",
    patterns: [
      /\b(OR access|observation access|block time|vendor access|sterile field|observer|credentialing|coordinator)\b/i,
      /\b(schedule(?:d)? observation|first case|block|vendor rep rules)\b/i,
    ],
  },
  {
    id: "workflow_intelligence",
    label: "Workflow intelligence",
    patterns: [
      /\b(workflow|procedure|volume|case mix|fixation|closure|turnover|sequence|protocol|tray|preference card)\b/i,
      /\b(how they|runs cases|standard approach|highest.?volume)\b/i,
    ],
  },
  {
    id: "product_interest",
    label: "Product interest",
    patterns: [
      /\b(interested|evaluation|trial|demo|sample|competitor|incumbent|switch|product line|portfolio)\b/i,
      /\b(wants to see|open to|pushing back on|skeptical about)\b/i,
    ],
  },
  {
    id: "next_step_opportunity",
    label: "Next-step opportunity",
    patterns: [
      /\b(next step|follow.?up|follow up|schedule|book|send|commit|agreed to|before (?:we )?leave|dated)\b/i,
      /\b(observation window|evaluation case|second visit|call back)\b/i,
    ],
  },
  {
    id: "deployment_readiness",
    label: "Deployment readiness",
    patterns: [
      /\b(ready for|readiness|adoption|go.?live|rollout|committee|value analysis|purchasing|supply chain)\b/i,
      /\b(too early|not ready|needs more|pilot|first case timeline)\b/i,
    ],
  },
];

function splitNarrativeSentences(text: string): string[] {
  return text
    .split(/\n+|(?<=[.!?])\s+/)
    .map((s) => s.replace(/^[-*•\d.]+\s*/, "").trim())
    .filter((s) => s.length >= 12);
}

function clampItem(text: string, max = 140): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function sentenceMatches(sentence: string, patterns: readonly RegExp[]): boolean {
  return patterns.some((p) => p.test(sentence));
}

export function analyzeTacticalDebriefNarrative(narrative: string): {
  insights: TacticalDebriefInsight[];
  summary: string;
  signal_count: number;
} {
  const text = narrative.trim();
  if (!text) {
    return { insights: [], summary: "Add what happened before analyzing.", signal_count: 0 };
  }

  const sentences = splitNarrativeSentences(text);
  const insights: TacticalDebriefInsight[] = [];

  for (const cat of TACTICAL_DEBRIEF_CATEGORIES) {
    const items: string[] = [];
    const seen = new Set<string>();
    for (const sentence of sentences) {
      if (!sentenceMatches(sentence, cat.patterns)) continue;
      const item = clampItem(sentence);
      const key = item.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      items.push(item);
      if (items.length >= 3) break;
    }
    if (items.length > 0) {
      insights.push({
        category_id: cat.id,
        category_label: cat.label,
        items: items.map((text) => scopedDebriefItem(cat.id, text)),
      });
    }
  }

  const signal_count = insights.reduce((n, i) => n + i.items.length, 0);
  const summary =
    signal_count === 0
      ? "No structured signals yet — add OR access, workflow, stakeholders, or next steps."
      : `Found ${signal_count} intel signal${signal_count === 1 ? "" : "s"} across ${insights.length} area${insights.length === 1 ? "" : "s"}.`;

  return { insights, summary, signal_count };
}

export function formatTacticalDebriefNotes(input: {
  narrative: string;
  insights: TacticalDebriefInsight[];
  include_only_category_ids?: Set<TacticalDebriefCategoryId>;
}): string {
  const narrative = input.narrative.trim();
  const blocks: string[] = [];
  if (narrative) {
    blocks.push("What happened:\n" + narrative);
  }
  const selected = input.insights.filter(
    (i) => !input.include_only_category_ids || input.include_only_category_ids.has(i.category_id),
  );
  if (selected.length > 0) {
    blocks.push("Operational intelligence captured:");
    for (const insight of selected) {
      for (const item of insight.items) {
        blocks.push(`• ${formatOperationalInsightBullet(insight.category_id, item.text)}`);
      }
    }
  }
  return blocks.join("\n\n").trim();
}

function insightItems(
  insights: TacticalDebriefInsight[],
  categoryIds: TacticalDebriefCategoryId[],
): string[] {
  const items: string[] = [];
  const seen = new Set<string>();
  for (const insight of insights) {
    if (!categoryIds.includes(insight.category_id)) continue;
    for (const item of insight.items) {
      const text = typeof item === "string" ? item : item.text;
      const key = text.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      items.push(text);
    }
  }
  return items;
}

function buildReviewSection(
  id: TacticalDebriefReviewSectionId,
  items: string[],
): TacticalDebriefReviewSection {
  return {
    id,
    title: TACTICAL_DEBRIEF_SECTION_LABELS[id],
    items,
    empty_hint: items.length === 0 ? (TACTICAL_DEBRIEF_SECTION_EMPTY[id] ?? null) : null,
  };
}

export function buildTacticalDebriefAnalysisFromLogUpdate(
  narrative: string,
  logUpdate: LogUpdateParseResult | null,
  opts?: { providerId?: string | null; existingProviderFields?: Record<string, string> },
): TacticalDebriefAnalysis {
  const ai = logUpdate?.aiMapping;
  if (ai && logUpdate?.aiMapping) {
    return buildTacticalDebriefAnalysisFromAiMapping(narrative, ai, logUpdate);
  }
  if (logUpdate?.atomicFacts?.length) {
    return buildTacticalDebriefAnalysisFromStructuredFacts(narrative, logUpdate);
  }
  return buildTacticalDebriefAnalysis(narrative, opts);
}

function buildTacticalDebriefAnalysisFromStructuredFacts(
  narrative: string,
  logUpdate: LogUpdateParseResult,
): TacticalDebriefAnalysis {
  const facts = logUpdate.atomicFacts ?? [];
  const signal_count = facts.length;
  const workflow_intelligence = facts
    .filter((f) =>
      ["clinical_focus", "observation_access", "credentialing", "scheduling", "facility_intelligence"].includes(
        f.fact_type,
      ),
    )
    .map((f) => `${f.attribute}: ${f.value}`);

  const stakeholder_insights = facts
    .filter((f) => f.fact_type === "workflow_contact" || f.fact_type === "relationship")
    .map((f) => (f.entity ? `${f.entity} — ${f.value}` : f.value));

  const recommended_next_actions = facts
    .filter((f) => f.fact_type === "follow_up")
    .map((f) => f.value);

  const detected_signals = facts.slice(0, 6).map((f) => `${f.fact_type}: ${f.value.slice(0, 120)}`);

  const sections: TacticalDebriefReviewSection[] = [
    buildReviewSection("detected_signals", detected_signals),
    buildReviewSection("operational_risks", []),
    buildReviewSection("stakeholder_insights", stakeholder_insights),
    buildReviewSection("workflow_intelligence", workflow_intelligence),
    buildReviewSection("recommended_next_actions", recommended_next_actions),
    buildReviewSection(
      "suggested_system_updates",
      logUpdate.fieldUpdates.map((u) => u.label),
    ),
  ];

  const insights: TacticalDebriefInsight[] = [];
  if (workflow_intelligence.length) {
    insights.push({
      category_id: "workflow_intelligence",
      category_label: "Workflow intelligence",
      items: workflow_intelligence.map((text) => scopedDebriefItem("workflow_intelligence", text)),
    });
  }

  return {
    insights,
    summary: "",
    signal_count,
    sections,
    log_update: logUpdate,
  };
}

function buildTacticalDebriefAnalysisFromAiMapping(
  narrative: string,
  ai: LogUpdateOpenAiMapping,
  logUpdate: LogUpdateParseResult,
): TacticalDebriefAnalysis {
  const signal_count =
    ai.confirmed_updates.length + ai.partial_updates.length + ai.still_to_validate.length;

  const operational_risks = ai.do_not_update
    .filter((d) => /\b(risk|block|delay|uncertain)\b/i.test(d.reason))
    .map((d) => d.item);

  const stakeholder_insights = [
    ...ai.confirmed_updates.filter((u) => u.domain === "stakeholders" || u.domain === "relationship"),
    ...ai.partial_updates.filter((u) => u.domain === "stakeholders" || u.domain === "relationship"),
  ].map((u) => `${u.label}: ${u.value}`);

  const workflow_intelligence = [
    ...ai.confirmed_updates.filter((u) =>
      ["workflow", "case_mix", "or_access", "scheduling", "credentialing"].includes(u.domain),
    ),
    ...ai.partial_updates.filter((u) =>
      ["workflow", "case_mix", "or_access", "scheduling", "credentialing"].includes(u.domain),
    ),
  ].map((u) => `${u.label}: ${u.value}`);

  const recommended_next_actions = ai.recommended_next_moves.map(
    (a) => `${a.action} (${a.owner_type}, ${a.priority} priority)`,
  );

  const detected_signals = ai.confirmed_updates
    .slice(0, 6)
    .map((u) => `${u.label} — ${u.value.slice(0, 120)}`);

  const sections: TacticalDebriefReviewSection[] = [
    buildReviewSection(
      "detected_signals",
      detected_signals.length ? detected_signals : [ai.summary],
    ),
    buildReviewSection("operational_risks", operational_risks),
    buildReviewSection("stakeholder_insights", stakeholder_insights),
    buildReviewSection("workflow_intelligence", workflow_intelligence),
    buildReviewSection("recommended_next_actions", recommended_next_actions),
    buildReviewSection(
      "suggested_system_updates",
      logUpdate.fieldUpdates.map((u) => u.label),
    ),
  ];

  const insights: TacticalDebriefInsight[] = [];
  if (workflow_intelligence.length) {
    insights.push({
      category_id: "workflow_intelligence",
      category_label: "Workflow intelligence",
      items: workflow_intelligence.map((text) => scopedDebriefItem("workflow_intelligence", text)),
    });
  }
  if (recommended_next_actions.length) {
    insights.push({
      category_id: "next_step_opportunity",
      category_label: "Next-step opportunity",
      items: recommended_next_actions.map((text) => scopedDebriefItem("next_step_opportunity", text)),
    });
  }

  return {
    insights,
    summary: ai.summary,
    signal_count,
    sections,
    log_update: logUpdate,
  };
}

export function buildTacticalDebriefAnalysis(
  narrative: string,
  opts?: { providerId?: string | null; existingProviderFields?: Record<string, string> },
): TacticalDebriefAnalysis {
  const { insights, summary, signal_count } = analyzeTacticalDebriefNarrative(narrative);

  const detectedItems = insightItems(insights, DETECTED_SIGNAL_CATEGORIES);
  const detectedSection = buildReviewSection(
    "detected_signals",
    detectedItems.length > 0
      ? detectedItems
      : signal_count > 0
        ? insights.flatMap((i) => i.items.map((item) => item.text)).slice(0, 4)
        : [],
  );

  const sections: TacticalDebriefReviewSection[] = [
    detectedSection,
    buildReviewSection("operational_risks", insightItems(insights, INSIGHTS_BY_SECTION.operational_risks)),
    buildReviewSection(
      "stakeholder_insights",
      insightItems(insights, INSIGHTS_BY_SECTION.stakeholder_insights),
    ),
    buildReviewSection(
      "workflow_intelligence",
      insightItems(insights, INSIGHTS_BY_SECTION.workflow_intelligence),
    ),
    buildReviewSection(
      "recommended_next_actions",
      insightItems(insights, INSIGHTS_BY_SECTION.recommended_next_actions),
    ),
  ];

  const log_update = opts?.providerId
    ? parseLogUpdateFreeform(narrative, { providerId: opts.providerId }, opts.existingProviderFields ?? {})
    : null;

  const systemItems =
    log_update?.fieldUpdates
      .filter((u) => u.accepted)
      .map((u) => u.label) ?? [];

  sections.push(
    buildReviewSection(
      "suggested_system_updates",
      systemItems.length > 0
        ? systemItems
        : log_update?.fieldUpdates.map((u) => u.label) ?? [],
    ),
  );

  return { insights, summary, signal_count, sections, log_update };
}
