import { collectOieCoachingGuidanceInputs } from "@/lib/surgical-sales/universalExtractor/collectOieCoachingGuidanceInputs";
import {
  COACHING_GUIDANCE_TOPIC_GROUPS,
  OIE_COMMERCIAL_NORMALIZED_FINDING_IDS,
  topicForOieNormalizedFindingId,
  topicForUfConcept,
} from "@/lib/surgical-sales/universalExtractor/coachingGuidanceConceptMapping";
import type {
  CoachingGuidanceAlignmentConflict,
  CoachingGuidanceAlignmentTopic,
  CoachingGuidanceInputsComparison,
} from "@/lib/surgical-sales/universalExtractor/coachingGuidanceInputsTypes";
import { summarizeUfCoachingGuidanceInputs } from "@/lib/surgical-sales/universalExtractor/summarizeUfCoachingGuidanceInputs";
import type { UniversalFactsReadModelPayload } from "@/lib/surgical-sales/universalExtractor/universalFactsReadModelAdapters";

function formatUfLabel(concept: string, sampleEvidence: string | null): string {
  if (sampleEvidence) return sampleEvidence;
  return concept.replace(/_/g, " ");
}

function buildAlignment(input: {
  oiePriorIds: string[];
  oiePriorLabels: Map<string, string>;
  ufPriorConcepts: string[];
  ufPriorLabels: Map<string, string>;
}): CoachingGuidanceInputsComparison["alignment"] {
  const overlap: CoachingGuidanceAlignmentTopic[] = [];
  const oieOnly: Array<{ id: string; label: string; reason: string }> = [];
  const ufOnly: Array<{ concept: string; label: string; reason: string }> = [];
  const conflicts: CoachingGuidanceAlignmentConflict[] = [];

  const oieTopics = new Map<string, string[]>();
  for (const id of input.oiePriorIds) {
    const topic = topicForOieNormalizedFindingId(id);
    if (!topic) {
      if (OIE_COMMERCIAL_NORMALIZED_FINDING_IDS.has(id)) {
        oieOnly.push({
          id,
          label: input.oiePriorLabels.get(id) ?? id,
          reason: "OIE commercial/opportunity signal — no UF coaching concept",
        });
      } else {
        oieOnly.push({
          id,
          label: input.oiePriorLabels.get(id) ?? id,
          reason: "No mapped UF coaching concept",
        });
      }
      continue;
    }
    const bucket = oieTopics.get(topic) ?? [];
    bucket.push(id);
    oieTopics.set(topic, bucket);
  }

  const ufTopics = new Map<string, string[]>();
  for (const concept of input.ufPriorConcepts) {
    const topic = topicForUfConcept(concept);
    if (!topic) {
      ufOnly.push({
        concept,
        label: formatUfLabel(concept, input.ufPriorLabels.get(concept) ?? null),
        reason: "No mapped OIE guidance signal",
      });
      continue;
    }
    const bucket = ufTopics.get(topic) ?? [];
    bucket.push(concept);
    ufTopics.set(topic, bucket);
  }

  for (const group of COACHING_GUIDANCE_TOPIC_GROUPS) {
    const oieIds = (oieTopics.get(group.topic) ?? []).filter(Boolean);
    const ufConcepts = (ufTopics.get(group.topic) ?? []).filter(Boolean);
    if (oieIds.length > 0 && ufConcepts.length > 0) {
      overlap.push({
        topic: group.topic,
        oieNormalizedFindingIds: oieIds,
        ufConcepts,
        notes: group.notes,
      });
      oieTopics.delete(group.topic);
      ufTopics.delete(group.topic);
    }
  }

  for (const [topic, ids] of oieTopics) {
    for (const id of ids) {
      oieOnly.push({
        id,
        label: input.oiePriorLabels.get(id) ?? id,
        reason: `Mapped topic "${topic}" has no UF counterpart on this case`,
      });
    }
  }

  for (const [topic, concepts] of ufTopics) {
    for (const concept of concepts) {
      ufOnly.push({
        concept,
        label: formatUfLabel(concept, input.ufPriorLabels.get(concept) ?? null),
        reason: `Mapped topic "${topic}" has no OIE counterpart on this case`,
      });
    }
  }

  const staffDelayOie = input.oiePriorIds.filter((id) =>
    ["staff_supply_delay", "workflow_delay", "staff_supply_setup_delay"].includes(id),
  );
  const ufAlternative = input.ufPriorConcepts.includes("alternative_used");
  const ufInventory = input.ufPriorConcepts.includes("inventory_availability_issue");
  if (staffDelayOie.length > 0 && ufAlternative && !ufInventory) {
    conflicts.push({
      topic: "staff_friction_or_delay",
      oieLabel: input.oiePriorLabels.get(staffDelayOie[0]!) ?? staffDelayOie[0]!,
      ufLabel: formatUfLabel("alternative_used", input.ufPriorLabels.get("alternative_used") ?? null),
      reason: "OIE classifies implant unavailability as staff supply delay; UF uses alternative_used",
    });
  }

  const sizingUf = input.ufPriorConcepts.includes("sizing_or_fit_issue");
  const commercialOie = input.oiePriorIds.filter((id) => OIE_COMMERCIAL_NORMALIZED_FINDING_IDS.has(id));
  if (sizingUf && commercialOie.length > 0) {
    conflicts.push({
      topic: "implant_sizing_or_fit",
      oieLabel: input.oiePriorLabels.get(commercialOie[0]!) ?? commercialOie[0]!,
      ufLabel: formatUfLabel(
        "sizing_or_fit_issue",
        input.ufPriorLabels.get("sizing_or_fit_issue") ?? null,
      ),
      reason: "UF captures sizing_or_fit_issue; OIE may route to commercial product_interest",
    });
  }

  return { overlap, oieOnly, ufOnly, conflicts };
}

/** Side-by-side OIE vs UF coaching guidance inputs for evaluation (Phase A). */
export function buildCoachingGuidanceInputsComparison(input: {
  caseRow: Record<string, unknown>;
  priorCases?: Array<Record<string, unknown>>;
  activities?: Array<{ activity_type?: string; body?: string }>;
  providerContact?: Record<string, unknown> | null;
  universalFactsReadModel?: UniversalFactsReadModelPayload | null;
}): CoachingGuidanceInputsComparison {
  const oie = collectOieCoachingGuidanceInputs(input);
  const caseId = String(input.caseRow.id ?? "").trim();
  const providerId = String(input.caseRow.surgeon_contact_id ?? "").trim() || null;
  const caseNumber = String(input.caseRow.case_number ?? "").trim() || null;

  const uf =
    input.universalFactsReadModel?.programRuns?.length
      ? summarizeUfCoachingGuidanceInputs({
          programRuns: input.universalFactsReadModel.programRuns,
          caseRuns: input.universalFactsReadModel.caseRuns,
          caseRow: input.caseRow,
          priorCases: input.priorCases,
          briefingKind: oie.briefingKind,
          programCompletedCount: oie.programCompletedCount,
        })
      : null;

  const oiePriorLabels = new Map(
    oie.briefingPriorSignals.map((signal) => [signal.normalizedFindingId, signal.label]),
  );
  const ufPriorLabels = new Map(
    (uf?.priorSignals ?? []).map((signal) => [signal.concept, signal.sampleEvidence ?? ""]),
  );

  const alignment = buildAlignment({
    oiePriorIds: oie.briefingPriorSignals.map((signal) => signal.normalizedFindingId),
    oiePriorLabels,
    ufPriorConcepts: (uf?.priorSignals ?? []).map((signal) => signal.concept),
    ufPriorLabels,
  });

  return {
    caseId,
    providerId,
    caseNumber,
    evaluationOnly: true,
    oie,
    uf,
    alignment,
  };
}
