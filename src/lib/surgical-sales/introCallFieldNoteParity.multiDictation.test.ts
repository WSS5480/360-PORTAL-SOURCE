import { describe, expect, it } from "vitest";
import { extractUniversalCategorySignals } from "@/lib/surgical-sales/sharedIntelligence/extractUniversalCategorySignals";
import { runUniversalSurgicalExtraction } from "@/lib/surgical-sales/universalExtractor/runUniversalSurgicalExtraction";
import { normalizeClinicalIntelligenceFromFact } from "@/lib/surgical-sales/debriefClinicalFactExtraction";

type DictationCase = {
  name: string;
  providerName: string;
  dictation: string;
  expectLabels: RegExp[];
  forbidLabels: RegExp[];
  clinicalEvidence?: string;
  clinicalValue?: string;
  expectClinicalSignal?: string;
};

const CASES: DictationCase[] = [
  {
    name: "pepper trauma — approved observation + office manager",
    providerName: "Dr. Pepper",
    dictation: [
      "Intro call with Dr. Pepper went very well. She was enthusiastic about continuing the conversation.",
      "She described increasing distal radius fracture volume and more upper extremity trauma referrals.",
      "She uses Acumed for many distal radius cases.",
      "She approved a case observation for next month. Maya, her office manager, coordinates scheduling with the hospital.",
      "My next step is to send available dates and coordinate the observation window with Maya.",
    ].join(" "),
    expectLabels: [/Maya · Office Manager/i, /Observation/i],
    forbidLabels: [/Pepper\s+Today/i, /Pepper · Scheduling/i, /New Procedure Adoption/i],
  },
  {
    name: "salt bariatric — credentialing + evidence sequencing",
    providerName: "Dr. Salt",
    dictation: [
      "Met Dr. Salt for an introductory call. He was interested but cautious and said product evaluation should wait until after I observe a case.",
      "He is doing more bariatric and laparoscopic cholecystectomy procedures this quarter.",
      "He mentioned Symbotex as one of the meshes they use today.",
      "Observation is possible, but vendor credentialing is required before anyone can enter the OR.",
      "Renee handles scheduling and helps coordinate credentialing paperwork for observation access.",
      "My next step is to send the insurance certificate for the credentialing packet.",
    ].join(" "),
    expectLabels: [/Renee · (?:Scheduling Coordinator|Evaluation Contact)/i, /credential|Observation/i],
    forbidLabels: [/Salt\s+Today/i, /Salt · Scheduling/i, /New Procedure Adoption/i],
  },
  {
    name: "berry foot ankle — declined observation",
    providerName: "Dr. Berry",
    dictation: [
      "I spoke with Dr. Berry for an intro call. He was reserved but open to a follow-up conversation.",
      "Foot and ankle reconstruction is a major focus area in his practice, including complex ankle fracture cases.",
      "He currently uses Phasix for select soft tissue cases.",
      "He declined observation access for now and said we should revisit it after another conversation.",
      "Nora handles scheduling for his office.",
      "My next step is to prepare a short office meeting agenda.",
    ].join(" "),
    expectLabels: [/Nora · Scheduling Coordinator/i, /declined|Observation/i],
    forbidLabels: [/Berry\s+Today/i, /Berry · Scheduling/i, /New Procedure Adoption/i],
  },
  {
    name: "field note — lounge follow-up with known scheduler language",
    providerName: "Tom Lettuce",
    dictation: [
      "Ran into Dr. Lettuce in the physician lounge this afternoon after his last case.",
      "He said he looked over the clinical article I sent last week and appreciated the data,",
      "but he still wants to see how the product performs during an actual case before making any decisions.",
      "Jessica mentioned they have a robotic ventral hernia repair coming up in about two weeks",
      "that might be a good opportunity for an observation if scheduling works out.",
      "Dr. Lettuce also said they're seeing a higher volume of larger ventral defects lately,",
      "so he's paying closer attention to products that are easier to position laparoscopically.",
      "No action needed today other than following up with Jessica next week",
      "to confirm whether the observation date is available.",
    ].join(" "),
    expectLabels: [/Jessica/i, /ventral hernia|Robotic ventral/i],
    forbidLabels: [/Lettuce\s+Today/i, /Lettuce · Scheduling/i, /Lettuce\s+In\s+·/i],
    clinicalEvidence:
      "Dr. Lettuce also said they're seeing a higher volume of larger ventral defects lately",
    clinicalValue: "Ventral hernia repair",
    expectClinicalSignal: "increasing_procedure_volume",
  },
];

describe("Multi-dictation intro/field-note accuracy", () => {
  for (const source of ["intro_call", "discovery_note"] as const) {
    for (const scenario of CASES) {
      it(`${source}: ${scenario.name}`, () => {
        const signals = extractUniversalCategorySignals(scenario.dictation, {
          providerName: scenario.providerName,
        });
        const extraction = runUniversalSurgicalExtraction({
          raw_note: scenario.dictation,
          declared_source_type: source,
          context: { provider_display_name: scenario.providerName },
        });
        const blob = [
          ...signals.map((s) => `${s.concept}: ${s.normalized_label}`),
          ...extraction.facts.map(
            (f) => `${f.concept}: ${f.normalized_label} ${f.person_mentioned ?? ""} ${f.product_mentioned ?? ""}`,
          ),
        ].join("\n");

        for (const pattern of scenario.expectLabels) {
          expect(blob, `${scenario.name} missing ${pattern}`).toMatch(pattern);
        }
        for (const pattern of scenario.forbidLabels) {
          expect(blob, `${scenario.name} forbidden ${pattern}`).not.toMatch(pattern);
        }

        if (scenario.clinicalEvidence && scenario.clinicalValue && scenario.expectClinicalSignal) {
          const clinical = normalizeClinicalIntelligenceFromFact({
            value: scenario.clinicalValue,
            evidence: scenario.clinicalEvidence,
          });
          expect(clinical?.signal).toBe(scenario.expectClinicalSignal);
        }
      });
    }
  }
});
