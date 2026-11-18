import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { normalizeClinicalFocusCard } from "@/lib/surgical-sales/debriefActionableReviewCardNormalize";
import { buildInitialProposedContacts } from "@/lib/surgical-sales/buildDebriefIntelligenceExtractionReview";
import { runDebriefExtractionPipeline } from "@/lib/surgical-sales/debriefExtractionRegressionRunner";
import {
  buildDebriefIntelligenceBrief,
  followUpImpliedByConfirmedIntelligence,
} from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefIntelligenceBrief";
import { normalizeAndDedupeAtomicFacts } from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefAtomicFacts";
import { MARK_ONION_JENNIFER_REYNOLDS_INTRO_DICTATION } from "@/lib/surgical-sales/debriefIntroCallRegressionFixtures";
import { composeDebriefReviewDisplay } from "@/lib/surgical-sales/universalExtractor/composeDebriefReviewDisplay";
import { expandClinicalOverlaysFromFact } from "@/lib/surgical-sales/universalExtractor/adaptUniversalFactsToDebriefClinicalBrief";
import { runUniversalSurgicalExtraction } from "@/lib/surgical-sales/universalExtractor/runUniversalSurgicalExtraction";
import type { UniversalFactExtractionRun } from "@/lib/surgical-sales/universalExtractor/loadUniversalSurgicalFacts";
import { splitCompoundProcedureLabels } from "@/lib/surgical-sales/sharedIntelligence/procedurePatterns";
import { dedupeReviewDisplayCards } from "@/lib/surgical-sales/sharedIntelligence/dedupeReviewDisplayCards";

function ufRunsFromDictation(dictation: string, captureId: string): UniversalFactExtractionRun[] {
  const extraction = runUniversalSurgicalExtraction({
    raw_note: dictation,
    declared_source_type: "intro_call",
  });
  return [
    {
      capture_id: captureId,
      declared_source_type: "intro_call",
      extraction_model: extraction.model,
      created_at: extraction.extracted_at,
      operational_note_id: null,
      facts: extraction.facts.map((fact, index) => ({
        ...fact,
        id: `${captureId}-${index}`,
        capture_id: captureId,
        provider_id: null,
        organization_id: null,
        case_id: null,
        encounter_id: null,
        suppressed: false,
        created_at: extraction.extracted_at,
      })),
    },
  ];
}

describe("Mark Onion extraction quality", () => {
  beforeEach(() => {
    vi.stubEnv("UF_AUTHORITY_REVIEW", "1");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("splits compound ventral hernia and AWR procedure labels", () => {
    const parts = splitCompoundProcedureLabels(
      "strong volume of ventral hernia and abdominal wall reconstruction cases",
    );
    expect(parts).toHaveLength(2);
    expect(parts.join(" ")).toMatch(/ventral hernia/i);
    expect(parts.join(" ")).toMatch(/abdominal wall reconstruction/i);
  });

  it("strips narrative lead-in from compound clinical procedure labels", () => {
    const parts = splitCompoundProcedureLabels(
      "they're continuing to see a strong volume of ventral hernia and abdominal wall reconstruction cases",
    );

    expect(parts).toEqual(["Ventral hernia repair", "Abdominal wall reconstruction"]);
  });

  it("emits procedure-focus overlays for strong-volume ventral hernia and AWR text", () => {
    const evidence =
      "He mentioned they're continuing to see a strong volume of ventral hernia and abdominal wall reconstruction cases.";

    const extraction = runUniversalSurgicalExtraction({
      raw_note: evidence,
      declared_source_type: "intro_call",
    });
    const overlays = extraction.facts.flatMap((fact, index) =>
      expandClinicalOverlaysFromFact({
        ...fact,
        id: `fact-clinical-${index}`,
        capture_id: "capture",
        provider_id: null,
        organization_id: null,
        case_id: null,
        encounter_id: null,
        suppressed: false,
        created_at: new Date().toISOString(),
      }),
    );

    const procedures = overlays.map((row) => row.procedureFocus.toLowerCase());
    expect(overlays.length).toBeGreaterThanOrEqual(2);
    expect(procedures.some((p) => /ventral/.test(p))).toBe(true);
    expect(procedures.some((p) => /abdominal wall/.test(p))).toBe(true);
    expect(extraction.facts.some((fact) => fact.concept === "procedure_volume_trend")).toBe(false);
  });

  it("keeps ventral and AWR as separate clinical review cards after dedupe", () => {
    const ventralCard = normalizeClinicalFocusCard({
      id: "uf:ventral",
      category: "clinical_focus",
      headline: "Ventral hernia · Clinical Trend",
      insightTitle: "Ventral hernia · Clinical Trend",
      clinicalCategoryLabel: "Clinical Trend",
      clinicalDisplayValue: "Strong volume",
      clinicalProcedureFocus: "Ventral hernia",
      fields: [],
      evidenceQuotes: ['"ventral hernia"'],
      confidence: "High",
      actions: [],
      linkedFieldUpdateIds: [],
      linkedIntelligenceIds: [],
    });
    const awrCard = normalizeClinicalFocusCard({
      id: "uf:awr",
      category: "clinical_focus",
      headline: "Abdominal wall reconstruction · Clinical Trend",
      insightTitle: "Abdominal wall reconstruction · Clinical Trend",
      clinicalCategoryLabel: "Clinical Trend",
      clinicalDisplayValue: "Strong volume",
      clinicalProcedureFocus: "Abdominal wall reconstruction",
      fields: [],
      evidenceQuotes: ['"abdominal wall reconstruction"'],
      confidence: "High",
      actions: [],
      linkedFieldUpdateIds: [],
      linkedIntelligenceIds: [],
    });

    const merged = dedupeReviewDisplayCards([ventralCard, awrCard], MARK_ONION_JENNIFER_REYNOLDS_INTRO_DICTATION);
    const clinical = merged.filter((card) => card.category === "clinical_focus");
    expect(clinical).toHaveLength(2);
  });

  it("supplements workflow_contact for Jennifer Reynolds when atomic facts omit her", () => {
    const facts = normalizeAndDedupeAtomicFacts([], MARK_ONION_JENNIFER_REYNOLDS_INTRO_DICTATION);
    const jennifer = facts.find(
      (fact) => fact.fact_type === "workflow_contact" && /jennifer/i.test(fact.entity),
    );
    expect(jennifer).toBeTruthy();
    expect(jennifer?.entity).toMatch(/Jennifer Reynolds/i);
  });

  it("keeps compound process-learning follow-ups but suppresses direct contact duplicates", () => {
    const outcomes = [
      {
        id: "contact-jennifer",
        kind: "contact" as const,
        cardIds: [],
        summaryLine: "Jennifer Reynolds — Scheduling Coordinator",
        primaryLine: "Jennifer Reynolds",
        subtitle: "Scheduling Coordinator",
        bullets: [],
        evidenceQuotes: [],
        linkedFieldUpdateIds: [],
      },
    ];

    expect(
      followUpImpliedByConfirmedIntelligence(
        { primaryLine: "Connect with office staff to understand the observation process." },
        outcomes,
      ),
    ).toBe(false);

    expect(
      followUpImpliedByConfirmedIntelligence(
        { primaryLine: "Connect with Jennifer to coordinate observation access." },
        outcomes,
      ),
    ).toBe(true);
  });

  it("dedupes generic follow-ups in Mark Onion composed brief", () => {
    const dictation = MARK_ONION_JENNIFER_REYNOLDS_INTRO_DICTATION;
    const pipeline = runDebriefExtractionPipeline({ dictation });
    const proposedContacts = buildInitialProposedContacts({
      review: pipeline.parse,
      sourceReference: "provider:mark-onion",
    });
    const debriefRuns = ufRunsFromDictation(dictation, "capture-mark-onion-quality");
    const composed = composeDebriefReviewDisplay({
      dictation,
      logUpdate: { ...pipeline.parse, debriefUniversalFactsRuns: debriefRuns },
      debriefRuns,
      proposedContacts,
    });
    const brief = buildDebriefIntelligenceBrief({ cards: composed.actionableCards });
    const clinicalLines = brief.clinicalInsights.map((row) => row.primaryLine.toLowerCase());
    const workflowLines = brief.workflowInsights.map((row) => row.primaryLine.toLowerCase());
    const outputText = [
      ...debriefRuns.flatMap((run) =>
        run.facts.map((fact) => `${fact.concept} ${fact.normalized_label} ${fact.evidence_text}`),
      ),
      ...pipeline.parse.fieldUpdates.map((field) => `${field.dbKey} ${field.proposedValue}`),
      ...composed.actionableCards.map((card) => `${card.category} ${card.headline}`),
    ].join("\n");

    expect(brief.observationAccess?.observationFields.approval).toMatch(/not yet approved/i);
    expect(clinicalLines.some((line) => /ventral hernia repair/.test(line))).toBe(true);
    expect(clinicalLines.some((line) => /abdominal wall reconstruction/.test(line))).toBe(true);
    expect(workflowLines.some((line) => /relationship momentum|open to continued discussion/.test(line))).toBe(false);
    expect(brief.followUpActions).toHaveLength(0);

    const jenniferContact = composed.actionableCards.find(
      (card) => card.category === "workflow_participant" && /jennifer reynolds/i.test(card.headline),
    );
    expect(jenniferContact?.headline).toMatch(/Jennifer Reynolds/i);
    expect(outputText).not.toMatch(/increasing (?:procedure|case) volume/i);
    expect(outputText).not.toMatch(/discuss(?:ed|ing).{0,120}(?:practice|types of cases|case mix)/i);
    expect(outputText).not.toMatch(/routine or smooth case progression|case_outcome|no meaningful intelligence/i);
  });

  it("does not show an empty review when a saved debrief is missing hydrated UF runs", () => {
    const dictation = MARK_ONION_JENNIFER_REYNOLDS_INTRO_DICTATION;
    const pipeline = runDebriefExtractionPipeline({ dictation });
    const composed = composeDebriefReviewDisplay({
      dictation,
      logUpdate: {
        ...pipeline.parse,
        atomicFacts: [],
        fieldUpdates: [],
        debriefUniversalFactsRuns: undefined,
      },
      debriefRuns: [],
      proposedContacts: [],
    });
    const brief = buildDebriefIntelligenceBrief({ cards: composed.actionableCards });
    const clinicalLines = brief.clinicalInsights.map((row) => row.primaryLine.toLowerCase());

    expect(composed.displaySource).toBe("uf_authority");
    expect(composed.actionableCards.length).toBeGreaterThan(0);
    expect(brief.observationAccess).toBeTruthy();
    expect(brief.contacts.some((contact) => /jennifer reynolds/i.test(contact.primaryLine))).toBe(true);
    expect(clinicalLines.some((line) => /ventral hernia repair/.test(line))).toBe(true);
    expect(clinicalLines.some((line) => /abdominal wall reconstruction/.test(line))).toBe(true);
    expect(brief.workflowInsights.some((line) => /open to continued discussion/.test(line.primaryLine.toLowerCase()))).toBe(false);
    expect(brief.followUpActions).toHaveLength(0);
  });

  it("supplements the legacy review path with UF cards so key signals are not lost", () => {
    vi.stubEnv("UF_AUTHORITY_REVIEW", "0");

    const dictation = MARK_ONION_JENNIFER_REYNOLDS_INTRO_DICTATION;
    const pipeline = runDebriefExtractionPipeline({ dictation });
    const proposedContacts = buildInitialProposedContacts({
      review: pipeline.parse,
      sourceReference: "provider:mark-onion",
    });
    const debriefRuns = ufRunsFromDictation(dictation, "capture-mark-onion-legacy");
    const composed = composeDebriefReviewDisplay({
      dictation,
      logUpdate: { ...pipeline.parse, debriefUniversalFactsRuns: debriefRuns },
      debriefRuns,
      proposedContacts,
    });
    const brief = buildDebriefIntelligenceBrief({ cards: composed.actionableCards });
    const clinicalLines = brief.clinicalInsights.map((row) => row.primaryLine.toLowerCase());

    expect(composed.displaySource).toBe("dip");
    expect(brief.contacts.some((contact) => /jennifer reynolds/i.test(contact.primaryLine))).toBe(true);
    expect(clinicalLines.some((line) => /ventral hernia repair/.test(line))).toBe(true);
    expect(clinicalLines.some((line) => /abdominal wall reconstruction/.test(line))).toBe(true);
    expect(brief.workflowInsights.some((line) => /open to continued discussion/.test(line.primaryLine.toLowerCase()))).toBe(false);
    expect(brief.followUpActions).toHaveLength(0);
  });
});
