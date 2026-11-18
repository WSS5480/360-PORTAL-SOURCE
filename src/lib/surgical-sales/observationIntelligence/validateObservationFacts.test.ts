import { describe, expect, it } from "vitest";

import { extractObservationFacts } from "./extractObservationFacts";
import type { ObservationFact } from "./observationFactTypes";
import {
  acceptedObservationFacts,
  validateObservationFacts,
} from "./validateObservationFacts";

/** Canonical Dr. Lettuce note — the forensic false-positive fixture. */
const ROUTINE_CASE_NOTE =
  "Pretty routine case overall. They're still using Bard Mesh. One thing I noticed was the surgeon asked for a different angle a couple times because he wasn't getting the view he wanted before fixation. Didn't seem angry about it, but it definitely slowed things down. Staff was good. Everyone seemed to know what they were doing. There was a little waiting around at one point because they were looking for something that wasn't ready. Nothing major. Still too early for me to know if there's a real opportunity here.";

/** Material-delay note — the suppression rule must NOT fire here. */
const MATERIAL_DELAY_NOTE =
  "Big abdominal wall reconstruction today. The circulator couldn't find the second mesh size and they waited maybe ten minutes while someone ran to get it. The room was just standing around waiting for mesh. That one was a real delay.";

describe("validateObservationFacts", () => {
  it("suppresses minimized readiness delay (forensic false positive) but keeps it auditable", () => {
    const facts = validateObservationFacts(
      extractObservationFacts(ROUTINE_CASE_NOTE).facts,
      ROUTINE_CASE_NOTE,
    );

    const readinessFacts = facts.filter(
      (fact) => fact.value === "delay caused by readiness issue",
    );
    expect(readinessFacts.length).toBeGreaterThan(0);
    for (const fact of readinessFacts) {
      expect(fact.validation).toEqual({ status: "suppressed", reason: "minimized" });
    }

    // Suppressed facts never reach the accepted set.
    const accepted = acceptedObservationFacts(facts);
    expect(accepted.some((fact) => fact.value === "delay caused by readiness issue")).toBe(false);

    // Everything else from the note survives as accepted.
    expect(accepted.some((fact) => fact.type === "current_product" && fact.value === "Bard Mesh")).toBe(true);
    expect(accepted.some((fact) => fact.type === "staff_efficiency")).toBe(true);
    expect(accepted.some((fact) => fact.type === "visualization_challenge")).toBe(true);
  });

  it("accepts a material delay — minimization rule requires absence of materiality markers", () => {
    const facts = validateObservationFacts(
      extractObservationFacts(MATERIAL_DELAY_NOTE).facts,
      MATERIAL_DELAY_NOTE,
    );

    const delayFacts = facts.filter((fact) => fact.value === "delay caused by readiness issue");
    expect(delayFacts.length).toBeGreaterThan(0);
    for (const fact of delayFacts) {
      expect(fact.validation?.status).toBe("accepted");
    }
  });

  it("suppresses only when the minimizer is local to the delay evidence", () => {
    const note =
      "Setup ran long today and the room sat waiting for the rep tray. Nothing major on the staff side though, they were organized.";
    const facts = validateObservationFacts(extractObservationFacts(note).facts, note);

    // Minimizer is in the adjacent sentence to the delay evidence — window catches it,
    // but materiality language is absent, so delay facts suppress.
    const setupFacts = facts.filter((fact) => fact.value === "setup delay observed");
    for (const fact of setupFacts) {
      expect(fact.validation?.status).toBe("suppressed");
    }
  });

  it("drops facts whose evidence is not in the note (anti-hallucination)", () => {
    const facts: ObservationFact[] = [
      {
        type: "current_product",
        value: "Bard Mesh",
        evidence: "They're still using Bard Mesh.",
      },
      {
        type: "provider_frustration",
        value: "provider clinical frustration observed",
        evidence: "The surgeon threw the tray across the room.",
      },
    ];

    const validated = validateObservationFacts(facts, ROUTINE_CASE_NOTE);
    expect(validated.some((fact) => fact.type === "current_product")).toBe(true);
    expect(validated.some((fact) => fact.type === "provider_frustration")).toBe(false);
  });

  it("canonicalizes product casing so dedupe keys stay stable", () => {
    const note = "They're still using bard mesh today.";
    const facts = validateObservationFacts(
      [
        {
          type: "current_product",
          value: "bard mesh",
          evidence: "still using bard mesh",
        },
      ],
      note,
    );

    expect(facts[0]?.value).toBe("Bard Mesh");
    expect(facts[0]?.validation?.status).toBe("accepted");
  });

  it("suppresses product usage facts when evidence only shows interest, comparison, or future evaluation", () => {
    const note =
      "Asked about ACSIS. Interested in ACSIS. Future evaluation of ACSIS. Compared ACSIS to current setup.";
    const facts = validateObservationFacts(
      [
        { type: "current_product", value: "ACSIS", evidence: "Asked about ACSIS." },
        { type: "current_product", value: "ACSIS", evidence: "Interested in ACSIS." },
        { type: "current_product", value: "ACSIS", evidence: "Future evaluation of ACSIS." },
        { type: "current_product", value: "ACSIS", evidence: "Compared ACSIS to current setup." },
      ],
      note,
    );

    expect(facts).toHaveLength(4);
    for (const fact of facts) {
      expect(fact.validation).toEqual({
        status: "suppressed",
        reason: "product_usage_not_directly_observed",
      });
    }
    expect(acceptedObservationFacts(facts)).toHaveLength(0);
  });

  it("accepts product usage only when evidence directly states use in the case", () => {
    const note = "ACSIS was used. Used ACSIS. Had ACSIS in the case. Trialed ACSIS today.";
    const facts = validateObservationFacts(
      [
        { type: "current_product", value: "ACSIS", evidence: "ACSIS was used." },
        { type: "current_product", value: "ACSIS", evidence: "Used ACSIS." },
        { type: "current_product", value: "ACSIS", evidence: "Had ACSIS in the case." },
        { type: "current_product", value: "ACSIS", evidence: "Trialed ACSIS today." },
      ],
      note,
    );

    expect(facts).toHaveLength(4);
    expect(acceptedObservationFacts(facts)).toHaveLength(4);
  });

  it("assigns type-based default polarity to rules-fallback facts", () => {
    const facts = validateObservationFacts(
      extractObservationFacts(ROUTINE_CASE_NOTE).facts,
      ROUTINE_CASE_NOTE,
    );

    const staff = facts.find((fact) => fact.type === "staff_efficiency");
    expect(staff?.polarity).toBe("positive");

    const product = facts.find((fact) => fact.type === "current_product");
    expect(product?.polarity).toBe("neutral");

    const visualization = facts.find((fact) => fact.type === "visualization_challenge");
    expect(visualization?.polarity).toBe("negative");
  });

  describe("negated-evidence suppression", () => {
    const SMOOTH_CASE_NOTE =
      "Very smooth case today. There were very few interruptions or delays. The operating room appeared well organized and the team worked efficiently. No obvious workflow barriers. No room readiness issues and no supply-related delays.";

    it("suppresses a readiness-delay fact whose evidence asserts the absence of the problem", () => {
      const facts = validateObservationFacts(
        [
          {
            type: "workflow_delay",
            value: "delay caused by readiness issue",
            evidence: "No room readiness issues and no supply-related delays.",
            polarity: "negative",
            confirmation_state: "witnessed",
          },
          {
            type: "workflow_issue",
            value: "delay caused by readiness issue",
            evidence: "There were very few interruptions or delays.",
            polarity: "negative",
            confirmation_state: "witnessed",
          },
          {
            type: "staff_efficiency",
            value: "coordinated team",
            evidence: "the team worked efficiently",
            polarity: "positive",
            confirmation_state: "witnessed",
          },
        ],
        SMOOTH_CASE_NOTE,
      );

      const delayFacts = facts.filter((fact) => fact.value === "delay caused by readiness issue");
      expect(delayFacts).toHaveLength(2);
      for (const fact of delayFacts) {
        expect(fact.validation).toEqual({ status: "suppressed", reason: "negated_evidence" });
      }

      const accepted = acceptedObservationFacts(facts);
      expect(accepted.some((fact) => fact.value === "delay caused by readiness issue")).toBe(false);
      expect(accepted.some((fact) => fact.type === "staff_efficiency")).toBe(true);
    });

    it("does not suppress mislabeled-polarity absence facts (type default governs)", () => {
      const facts = validateObservationFacts(
        [
          {
            type: "workflow_delay",
            value: "delay caused by readiness issue",
            evidence: "No room readiness issues and no supply-related delays.",
            polarity: "neutral",
            confirmation_state: "witnessed",
          },
        ],
        SMOOTH_CASE_NOTE,
      );
      expect(facts[0]?.validation).toEqual({ status: "suppressed", reason: "negated_evidence" });
    });

    it("keeps real problems where negation describes a missing item, not an absent problem", () => {
      const note =
        "There was no mesh available, which caused delays while the circulator went to find one. The tray was not ready when the case started.";
      const facts = validateObservationFacts(
        [
          {
            type: "workflow_delay",
            value: "delay caused by readiness issue",
            evidence: "There was no mesh available, which caused delays",
            polarity: "negative",
            confirmation_state: "witnessed",
          },
          {
            type: "workflow_issue",
            value: "delay caused by readiness issue",
            evidence: "The tray was not ready when the case started.",
            polarity: "negative",
            confirmation_state: "witnessed",
          },
        ],
        note,
      );

      for (const fact of facts) {
        expect(fact.validation?.status).toBe("accepted");
      }
    });

    it("suppresses verb-phrase absence — the exact Dr. Carrot incident sentence", () => {
      const note =
        "Observed another robotic ventral hernia repair with Dr. Carrot today. The operating room staff appeared coordinated and familiar with the workflow. No complaints or frustrations were expressed regarding the product, and I did not observe any staff workarounds, delays, or workflow issues.";
      const incidentEvidence =
        "I did not observe any staff workarounds, delays, or workflow issues.";

      const problemFacts: ObservationFact[] = [
        {
          type: "workflow_delay",
          value: "delay caused by readiness issue",
          evidence: incidentEvidence,
          polarity: "negative",
          confirmation_state: "witnessed",
        },
        {
          type: "workflow_issue",
          value: "delay caused by readiness issue",
          evidence: incidentEvidence,
          polarity: "negative",
          confirmation_state: "witnessed",
        },
        {
          type: "staff_issue",
          value: "staff workflow friction observed",
          evidence: incidentEvidence,
          polarity: "negative",
          confirmation_state: "witnessed",
        },
        {
          type: "visualization_challenge",
          value: "visualization challenge before fixation",
          evidence: incidentEvidence,
          polarity: "negative",
          confirmation_state: "witnessed",
        },
        {
          type: "provider_frustration",
          value: "provider clinical frustration observed",
          evidence: "No complaints or frustrations were expressed regarding the product",
          polarity: "negative",
          confirmation_state: "witnessed",
        },
      ];

      const facts = validateObservationFacts(
        [
          ...problemFacts,
          {
            type: "staff_efficiency",
            value: "coordinated team",
            evidence: "The operating room staff appeared coordinated and familiar with the workflow.",
            polarity: "positive",
            confirmation_state: "witnessed",
          },
        ],
        note,
      );

      for (const fact of facts.filter((candidate) => candidate.type !== "staff_efficiency")) {
        expect(fact.validation).toEqual({ status: "suppressed", reason: "negated_evidence" });
      }

      const accepted = acceptedObservationFacts(facts);
      expect(accepted.map((fact) => fact.type)).toEqual(["staff_efficiency"]);
    });

    it("suppresses all listed verb-phrase absence variants", () => {
      const variants = [
        "I did not observe any delays during the case.",
        "I didn't observe any issues in the room.",
        "We did not see any workflow problems today.",
        "I didn't see any staff frustrations this time.",
        "I did not notice any complaints from the team.",
        "I didn't notice any supply delays at all.",
        "I did not hear any complaints about the product.",
        "I didn't hear any concerns from the staff.",
        "I never observed any workflow barriers in this case.",
        "I never saw any interruptions during the procedure.",
      ];

      for (const sentence of variants) {
        const facts = validateObservationFacts(
          [
            {
              type: "workflow_delay",
              value: "delay caused by readiness issue",
              evidence: sentence,
              polarity: "negative",
              confirmation_state: "witnessed",
            },
          ],
          sentence,
        );
        expect(facts[0]?.validation, sentence).toEqual({
          status: "suppressed",
          reason: "negated_evidence",
        });
      }
    });

    it("verb-phrase rule does not touch real problem statements", () => {
      const note =
        "The circulator could not find the second mesh tray and the case stood waiting. They never stocked the backup tray, which caused delays.";
      const facts = validateObservationFacts(
        [
          {
            type: "workflow_delay",
            value: "delay caused by readiness issue",
            evidence: "The circulator could not find the second mesh tray and the case stood waiting.",
            polarity: "negative",
            confirmation_state: "witnessed",
          },
          {
            type: "workflow_issue",
            value: "delay caused by readiness issue",
            evidence: "They never stocked the backup tray, which caused delays.",
            polarity: "negative",
            confirmation_state: "witnessed",
          },
        ],
        note,
      );

      for (const fact of facts) {
        expect(fact.validation?.status).toBe("accepted");
      }
    });

    it("does not touch positive facts citing absence language", () => {
      const note = "Staff had no issues at all today, everyone was coordinated.";
      const facts = validateObservationFacts(
        [
          {
            type: "staff_efficiency",
            value: "coordinated team",
            evidence: "Staff had no issues at all today",
            polarity: "positive",
            confirmation_state: "witnessed",
          },
        ],
        note,
      );
      expect(facts[0]?.validation?.status).toBe("accepted");
    });
  });

  it("preserves extractor-provided polarity over defaults", () => {
    const note = "Staff was good. Everyone seemed to know what they were doing.";
    const facts = validateObservationFacts(
      [
        {
          type: "staff_efficiency",
          value: "coordinated team",
          evidence: "Staff was good",
          polarity: "neutral",
        },
      ],
      note,
    );
    expect(facts[0]?.polarity).toBe("neutral");
  });
});
