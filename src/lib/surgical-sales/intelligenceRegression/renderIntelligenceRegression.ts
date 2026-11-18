import { buildObservationRepPresentationView } from "@/lib/surgical-sales/buildObservationRepPresentationView";
import { buildProductSupportRepPresentationView } from "@/lib/surgical-sales/buildProductSupportRepPresentationView";
import { parseLogUpdateFreeform } from "@/lib/surgical-sales/logUpdateParseFreeform";
import {
  buildRepFriendlyIntelligenceBriefing,
  groupRepFriendlyIntelligenceItems,
  summarizeRepFriendlyIntelligenceGroups,
  type RepFriendlyIntelligenceBriefing,
  type RepFriendlyIntelligenceGroup,
} from "@/lib/surgical-sales/repFriendlyIntelligenceGroups";
import type { UniversalFactExtractionRun } from "@/lib/surgical-sales/universalExtractor/loadUniversalSurgicalFacts";
import { composeDebriefReviewDisplay } from "@/lib/surgical-sales/universalExtractor/composeDebriefReviewDisplay";
import { runUniversalSurgicalExtraction } from "@/lib/surgical-sales/universalExtractor/runUniversalSurgicalExtraction";
import type { UniversalExtractorInput } from "@/lib/surgical-sales/universalExtractor/types";

export type IntelligenceRegressionFixtureType =
  | "intro_call"
  | "observation"
  | "debrief"
  | "product_support_case";

export type IntelligenceRegressionRenderedItem = {
  categoryId: string;
  categoryTitle: string;
  text: string;
  verificationStatus?: string;
  evidenceText?: string;
  extractedFactId?: string;
};

export type IntelligenceRegressionRenderedModel = {
  fixtureType: IntelligenceRegressionFixtureType;
  summary: string;
  groups: RepFriendlyIntelligenceGroup[];
  items: IntelligenceRegressionRenderedItem[];
  renderedText: string;
  audit: Array<{
    claim: string;
    evidenceText: string;
    sourceNoteText: string;
    extractedFactId: string;
    assignedCategory: string;
    verificationStatus: string;
  }>;
};

function sourceTypeForFixtureType(
  type: IntelligenceRegressionFixtureType,
): UniversalExtractorInput["declared_source_type"] {
  if (type === "intro_call") return "intro_call";
  if (type === "debrief") return "debrief_note";
  if (type === "product_support_case") return "product_support_case";
  return "observation_case";
}

function universalRunFromNote(input: {
  note: string;
  fixtureType: IntelligenceRegressionFixtureType;
  caseId?: string;
}): UniversalFactExtractionRun {
  const declaredSourceType = sourceTypeForFixtureType(input.fixtureType);
  const extraction = runUniversalSurgicalExtraction({
    raw_note: input.note,
    declared_source_type: declaredSourceType,
  });
  const captureId = `regression-${input.fixtureType}`;

  return {
    capture_id: captureId,
    declared_source_type: declaredSourceType,
    extraction_model: extraction.model,
    created_at: extraction.extracted_at,
    operational_note_id: "regression-note",
    facts: extraction.facts.map((fact, index) => ({
      ...fact,
      id: `${captureId}-${index}`,
      capture_id: captureId,
      provider_id: "regression-provider",
      organization_id: "regression-org",
      case_id: input.caseId ?? null,
      encounter_id: null,
      suppressed: false,
      created_at: extraction.extracted_at,
    })),
  };
}

function regressionActivity(note: string) {
  return {
    id: "regression-note",
    activity_type: "note",
    body: note,
    metadata_json: {},
    created_at: "2026-01-01T00:00:00.000Z",
  };
}

function modelFromBriefing(input: {
  fixtureType: IntelligenceRegressionFixtureType;
  briefing: RepFriendlyIntelligenceBriefing;
}): IntelligenceRegressionRenderedModel {
  const items = input.briefing.groups.flatMap((group) =>
    group.items.map((item) => ({
      categoryId: group.id,
      categoryTitle: group.title,
      text: item.text,
      verificationStatus: item.verification?.verificationStatus,
      evidenceText: item.verification?.evidenceText,
      extractedFactId: item.verification?.extractedFactId,
    })),
  );
  const audit = input.briefing.groups.flatMap((group) =>
    group.items.map((item) => ({
      claim: item.verification.claim,
      evidenceText: item.verification.evidenceText,
      sourceNoteText: item.verification.sourceNoteText,
      extractedFactId: item.verification.extractedFactId,
      assignedCategory: item.verification.assignedCategory,
      verificationStatus: item.verification.verificationStatus,
    })),
  );
  const renderedText = [
    input.briefing.summary,
    ...input.briefing.groups.flatMap((group) => [group.title, ...group.items.map((item) => item.text)]),
  ]
    .filter(Boolean)
    .join("\n");

  return {
    fixtureType: input.fixtureType,
    summary: input.briefing.summary,
    groups: input.briefing.groups,
    items,
    renderedText,
    audit,
  };
}

function briefingFromGroups(groups: RepFriendlyIntelligenceGroup[]): RepFriendlyIntelligenceBriefing {
  return {
    groups,
    summary: summarizeRepFriendlyIntelligenceGroups(groups),
  };
}

export function renderIntelligenceRegressionModel(input: {
  fixtureType: IntelligenceRegressionFixtureType;
  note: string;
}): IntelligenceRegressionRenderedModel {
  const note = input.note.trim();
  const caseId = "regression-case";
  const universalRun = universalRunFromNote({ note, fixtureType: input.fixtureType, caseId });

  if (input.fixtureType === "intro_call" || input.fixtureType === "debrief") {
    const logUpdate = parseLogUpdateFreeform(note);
    const composed = composeDebriefReviewDisplay({
      dictation: note,
      logUpdate: { ...logUpdate, debriefUniversalFactsRuns: [universalRun] },
      debriefRuns: [universalRun],
    });
    return modelFromBriefing({
      fixtureType: input.fixtureType,
      briefing: composed.categorizedBriefing,
    });
  }

  if (input.fixtureType === "product_support_case") {
    const presentation = buildProductSupportRepPresentationView({
      caseRow: {
        id: caseId,
        case_type: "product_support",
        status: "confirmed",
        provider_name: "Regression Provider",
      },
      activities: [regressionActivity(note)],
      universalFactsReadModel: { caseRuns: [universalRun] },
      providerContact: { id: "regression-provider", display_name: "Regression Provider" },
    });
    const groups = groupRepFriendlyIntelligenceItems([
      ...presentation.thisCase.items,
      ...presentation.followUp.items,
    ]);
    return modelFromBriefing({ fixtureType: input.fixtureType, briefing: briefingFromGroups(groups) });
  }

  const presentation = buildObservationRepPresentationView({
    caseRow: {
      id: caseId,
      status: "confirmed",
      provider_name: "Regression Provider",
    },
    activities: [regressionActivity(note)],
    universalFactsReadModel: { caseRuns: [universalRun] },
    providerContact: { id: "regression-provider", display_name: "Regression Provider" },
  });
  const groups = groupRepFriendlyIntelligenceItems([
    ...presentation.thisObservation.items,
    ...presentation.stillNeedToLearn,
  ]);
  return modelFromBriefing({ fixtureType: input.fixtureType, briefing: briefingFromGroups(groups) });
}
