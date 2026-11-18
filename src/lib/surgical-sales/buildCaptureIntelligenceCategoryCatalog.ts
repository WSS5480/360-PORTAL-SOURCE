/**
 * Admin catalog — all category registries used by capture intelligence / AI extraction.
 * Built from source-of-truth constants (code-defined, not database rows).
 */

import {
  AI_NOTE_CAPTURE_CLASSIFICATIONS,
  AI_NOTE_CAPTURE_DESTINATIONS,
  AI_NOTE_CAPTURE_REVIEW_GROUPS,
} from "@/lib/surgical-sales/aiNoteCapture/types";
import { AI_NOTE_CLASSIFICATION_LABELS, AI_NOTE_DESTINATION_LABELS } from "@/lib/surgical-sales/aiNoteCapture/labels";
import {
  CAPTURE_INTELLIGENCE_REVIEW_SECTIONS,
  captureIntelligenceSectionForCategory,
} from "@/lib/surgical-sales/captureIntelligence";
import {
  DEBRIEF_INTELLIGENCE_CATEGORIES,
  DEBRIEF_INTELLIGENCE_CATEGORY_DESCRIPTIONS,
  DEBRIEF_INTELLIGENCE_CATEGORY_LABELS,
  type DebriefExtractionSignalKind,
} from "@/lib/surgical-sales/debriefIntelligenceCategories";
import {
  INTELLIGENCE_CAPTURE_CATEGORY_DEFS,
  type IntelligenceCaptureCategoryDef,
} from "@/lib/surgical-sales/intelligenceCaptureCategories";
import { OPTIONAL_INTELLIGENCE_CATEGORIES } from "@/lib/surgical-sales/optionalIntelligenceCategories";
import { STAGE_MAPPING_QUESTIONS } from "@/lib/surgical-sales/stageMappingQuestions";

import type {
  CaptureIntelligenceCategoryCatalogGroup,
  CaptureIntelligenceCategoryCatalogRow,
  CaptureIntelligenceCategoryCatalogStats,
} from "@/lib/surgical-sales/captureIntelligenceCategoryCatalogTypes";

export type {
  CaptureIntelligenceCategoryCatalogGroup,
  CaptureIntelligenceCategoryCatalogRow,
  CaptureIntelligenceCategoryCatalogStats,
} from "@/lib/surgical-sales/captureIntelligenceCategoryCatalogTypes";

const DEBRIEF_EXTRACTION_SIGNAL_KINDS = [
  "confirmed_fact",
  "inferred_signal",
  "interest_signal",
  "approval_signal",
  "mentioned_person",
  "confirmed_contact",
  "pain_point",
  "product_interest",
  "next_step",
  "completed_action",
  "unknown",
] as const satisfies readonly DebriefExtractionSignalKind[];

const DEBRIEF_SIGNAL_KIND_LABELS: Record<DebriefExtractionSignalKind, string> = {
  confirmed_fact: "Confirmed fact",
  inferred_signal: "Inferred signal",
  interest_signal: "Interest signal",
  approval_signal: "Approval signal",
  mentioned_person: "Mentioned person",
  confirmed_contact: "Confirmed contact",
  pain_point: "Pain point",
  product_interest: "Product interest",
  next_step: "Next step",
  completed_action: "Completed action",
  unknown: "Unknown / uncategorized",
};

const DEBRIEF_SIGNAL_KIND_DESCRIPTIONS: Record<DebriefExtractionSignalKind, string> = {
  confirmed_fact: "Explicit statement treated as field-ready intelligence.",
  inferred_signal: "Derived from context without a direct quote.",
  interest_signal: "Soft interest (e.g. open to observation) without explicit approval.",
  approval_signal: "Explicit permission or approval language.",
  mentioned_person: "Name-only mention — not auto-promoted to support contact.",
  confirmed_contact: "Person with enough detail to link as a support contact.",
  pain_point: "Workflow or clinical friction — routed carefully vs product fit.",
  product_interest: "Explicit interest in our product, trial, or evaluation.",
  next_step: "Follow-up action, owner, or timing.",
  completed_action: "Something already done during the visit.",
  unknown: "Could not classify — rep review required.",
};

function formatCaptureMissionCategory(def: IntelligenceCaptureCategoryDef): CaptureIntelligenceCategoryCatalogRow {
  const details: string[] = [`Unlocks at pathway stage: ${def.unlockAt}`];
  if (def.requiresObservationApproval) {
    details.push("Requires observation approval on file");
  }
  if (def.signalIds.length) {
    const signalLabels = def.signalIds.map((id) => STAGE_MAPPING_QUESTIONS[id] ?? id);
    details.push(`Discovery signals: ${signalLabels.join(", ")}`);
  }
  if (def.exampleFindings?.length) {
    details.push(`Example themes: ${def.exampleFindings.join(" · ")}`);
  }
  return {
    id: def.id,
    label: def.name,
    description: def.description,
    details,
  };
}

export function buildCaptureIntelligenceCategoryCatalog(): CaptureIntelligenceCategoryCatalogGroup[] {
  const aiRoutingRows: CaptureIntelligenceCategoryCatalogRow[] = AI_NOTE_CAPTURE_CLASSIFICATIONS.map((id) => {
    const reviewGroup = AI_NOTE_CAPTURE_REVIEW_GROUPS.find((g) => g.category === id);
    const reviewSection = captureIntelligenceSectionForCategory(id);
    const details: string[] = [];
    if (reviewGroup) details.push(`Review group: ${reviewGroup.label}`);
    if (reviewSection) details.push(`Review destination: ${reviewSection.label}`);
    return {
      id,
      label: AI_NOTE_CLASSIFICATION_LABELS[id],
      description: `AI routing id \`${id}\``,
      details,
    };
  });

  const destinationRows: CaptureIntelligenceCategoryCatalogRow[] = AI_NOTE_CAPTURE_DESTINATIONS.map((id) => ({
    id,
    label: AI_NOTE_DESTINATION_LABELS[id],
    description: "Persist target when a suggestion is accepted.",
    details: [],
  }));

  const reviewSectionRows: CaptureIntelligenceCategoryCatalogRow[] = CAPTURE_INTELLIGENCE_REVIEW_SECTIONS.map(
    (section) => ({
      id: section.id,
      label: section.label,
      description: "Rep review bucket in capture intelligence.",
      details: [`Classifications: ${section.categories.join(", ")}`],
    }),
  );

  const debriefCategoryRows: CaptureIntelligenceCategoryCatalogRow[] = DEBRIEF_INTELLIGENCE_CATEGORIES.map((id) => ({
    id,
    label: DEBRIEF_INTELLIGENCE_CATEGORY_LABELS[id],
    description: DEBRIEF_INTELLIGENCE_CATEGORY_DESCRIPTIONS[id],
    details: [],
  }));

  const debriefSignalRows: CaptureIntelligenceCategoryCatalogRow[] = DEBRIEF_EXTRACTION_SIGNAL_KINDS.map((id) => ({
    id,
    label: DEBRIEF_SIGNAL_KIND_LABELS[id],
    description: DEBRIEF_SIGNAL_KIND_DESCRIPTIONS[id],
    details: [],
  }));

  const captureMissionRows = INTELLIGENCE_CAPTURE_CATEGORY_DEFS.map(formatCaptureMissionCategory);

  const optionalRows: CaptureIntelligenceCategoryCatalogRow[] = OPTIONAL_INTELLIGENCE_CATEGORIES.map((cat) => ({
    id: cat.id,
    label: cat.label,
    description: cat.helper,
    details: [
      cat.captureMode === "support_contact" ? "Capture mode: support contact workflow" : "Capture mode: free text",
      cat.primaryDbKey ? `Primary field: ${cat.primaryDbKey}` : "",
      cat.dbKeys.length ? `Related fields: ${cat.dbKeys.join(", ")}` : "",
      cat.intelligenceKey ? `Intelligence column: ${cat.intelligenceKey}` : "",
    ].filter(Boolean),
  }));

  return [
    {
      id: "ai_routing",
      title: "AI note routing classifications",
      description:
        "Top-level categories the capture engine assigns to each extracted suggestion before rep review and commit.",
      rows: aiRoutingRows,
    },
    {
      id: "review_sections",
      title: "Capture review sections",
      description: "How accepted suggestions are grouped in the capture intelligence review UI.",
      rows: reviewSectionRows,
    },
    {
      id: "destinations",
      title: "Persist destinations",
      description: "CRM entities suggestions can be written to when accepted.",
      rows: destinationRows,
    },
    {
      id: "debrief_intelligence",
      title: "Debrief intelligence categories",
      description:
        "Normalized intelligence buckets used when debrief / log-update extraction classifies each item (primary + secondary tags).",
      rows: debriefCategoryRows,
    },
    {
      id: "debrief_signals",
      title: "Debrief extraction signal kinds",
      description: "Signal type assigned to each extracted debrief item before category classification.",
      rows: debriefSignalRows,
    },
    {
      id: "capture_mission",
      title: "Field intelligence capture areas",
      description:
        "Rep-facing mission categories on the provider intelligence capture dashboard — unlock by sales pathway stage.",
      rows: captureMissionRows,
    },
    {
      id: "optional_intelligence",
      title: "Optional / supplementary intelligence",
      description: "Non-gating profile intelligence categories (never block pathway progression).",
      rows: optionalRows,
    },
  ];
}

export function captureIntelligenceCategoryCatalogStats(
  catalog: CaptureIntelligenceCategoryCatalogGroup[],
): CaptureIntelligenceCategoryCatalogStats {
  const totalRows = catalog.reduce((sum, group) => sum + group.rows.length, 0);
  return { groupCount: catalog.length, totalRows };
}
