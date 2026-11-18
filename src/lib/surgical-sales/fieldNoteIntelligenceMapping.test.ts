import { describe, expect, it } from "vitest";
import { buildProviderDossierGroups } from "@/app/portal/sales/providers/[providerId]/ProviderIntelligenceRepository";
import { universalEmergingChipFromFact } from "@/lib/surgical-sales/universalExtractor/intelligenceDisplayFromFact";
import {
  DR_LETTUCE_LOUNGE_NOTE,
  reviewParseFromDictation,
  ufRunsFromDictation,
} from "@/lib/surgical-sales/fieldNoteIntelligenceFixtures";

describe("Dr. Lettuce lounge field note intelligence mapping", () => {
  it("builds rep-readable dossier groups from saved universal facts", () => {
    const runs = ufRunsFromDictation(DR_LETTUCE_LOUNGE_NOTE, "lettuce-lounge");
    const groups = buildProviderDossierGroups({
      emergingSignals: runs.flatMap((run) =>
        run.facts
          .map((fact) => universalEmergingChipFromFact(fact, run))
          .filter(Boolean)
          .map((chip) => ({
            id: chip!.id,
            text: chip!.text,
            tone: "known" as const,
            evidenceQuote: chip!.evidenceQuote,
            evidenceSource: chip!.evidenceSource,
            evidenceCapturedAt: chip!.evidenceCapturedAt,
          })),
      ),
      commercialMeaning: [],
      keyPeople: [{ id: "jessica", name: "Jessica", role: "Scheduling Coordinator", missingInfo: null, whyTheyMatter: null }],
      caseIntelligence: null,
      evidenceCards: [],
      contact: {
        provider_procedure_focus: "Robotic ventral hernia repair — volume increasing",
        provider_workflow_pain_points: "Positioning in larger defects can be challenging with current mesh",
      },
      engagements: [],
    });

    const allItems = groups.flatMap((group) => group.items.map((item) => item.text)).join(" | ");
    expect(allItems).not.toMatch(/during an actual before making any decisions/i);
    expect(allItems.toLowerCase()).toMatch(/ventral|hernia|robotic|jessica|position|defect/i);
  });

  it("projects review updates without provider-as-contact mistakes", () => {
    const runs = ufRunsFromDictation(DR_LETTUCE_LOUNGE_NOTE, "lettuce-lounge");
    expect(runs[0]!.facts.length).toBeGreaterThan(2);
    const logUpdate = reviewParseFromDictation(DR_LETTUCE_LOUNGE_NOTE, "lettuce-lounge");

    const values = logUpdate.fieldUpdates.map((field) => field.proposedValue).join(" ");
    expect(values).not.toMatch(/Lettuce\s+—\s+Scheduling/i);
    expect(values.toLowerCase()).toMatch(/jessica|ventral|hernia|observe|evaluation/i);

    for (const field of logUpdate.fieldUpdates) {
      expect(field.proposedValue).not.toMatch(/during an actual before making any decisions/i);
    }
  });

  it("builds dossier groups reps can read without transcript fragments", () => {
    const runs = ufRunsFromDictation(DR_LETTUCE_LOUNGE_NOTE, "lettuce-lounge");

    const chips = runs.flatMap((run) =>
      run.facts
        .map((fact) => universalEmergingChipFromFact(fact, run))
        .filter(Boolean)
        .map((chip) => ({
          id: chip!.id,
          text: chip!.text,
          tone: "known" as const,
          evidenceQuote: chip!.evidenceQuote,
          evidenceSource: chip!.evidenceSource,
          evidenceCapturedAt: chip!.evidenceCapturedAt,
        })),
    );

    const groups = buildProviderDossierGroups({
      emergingSignals: chips,
      commercialMeaning: [],
      keyPeople: [{ id: "jessica", name: "Jessica", role: "Scheduling Coordinator", missingInfo: null, whyTheyMatter: null }],
      caseIntelligence: null,
      evidenceCards: [],
      contact: {
        provider_procedure_focus: "Robotic ventral hernia repair — volume increasing",
        provider_workflow_pain_points: "Positioning in larger defects can be challenging with current mesh",
        provider_evaluation_openness: "how the product performs during an actual case before making any decisions",
        provider_intelligence_field_metadata: {
          provider_procedure_focus: { evidence_text: "robotic ventral hernia repair" },
          provider_workflow_pain_points: { evidence_text: "easier to position laparoscopically" },
          provider_evaluation_openness: { evidence_text: "during an actual case before making any decisions" },
        },
      },
      engagements: [],
    });

    const allItems = groups.flatMap((group) => group.items.map((item) => item.text)).join(" | ");
    expect(allItems).not.toMatch(/during an actual before making any decisions/i);
    expect(allItems.toLowerCase()).toMatch(/ventral|hernia|robotic|jessica|position|defect/i);
  });
});
