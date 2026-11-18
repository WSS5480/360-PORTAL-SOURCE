import { describe, expect, it } from "vitest";

import { formatClinicalStorageValue } from "@/lib/surgical-sales/debriefClinicalFactExtraction";
import {
  buildFieldUpdatesFromClassifiedFacts,
  proposedContactsFromAtomicFacts,
  type DebriefAtomicFact,
} from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefAtomicFacts";
import type { DebriefClassifiedFact } from "@/lib/surgical-sales/debriefIntelligencePipeline/types";
import { buildProposedContactFromExtraction } from "@/lib/surgical-sales/debriefDetectedContact";
import {
  intelligenceFieldConflict,
  mergeIntelligenceFieldValue,
  resolveClinicalDbKeyAndSignal,
  resolveIntelligenceMergeCategory,
  shouldRecommendObservationApprovalReplace,
} from "@/lib/surgical-sales/debriefIntelligenceMergeCategories";
import { PERSISTENT_INTELLIGENCE_WRITABLE_DB_KEYS } from "@/lib/surgical-sales/intelligenceScopeInference";

describe("debriefIntelligenceMergeCategories", () => {
  it("does not conflict when procedure and clinical frustration differ in category", () => {
    const existing = formatClinicalStorageValue("Ventral hernia repair", "Procedure focus area");
    const proposed = formatClinicalStorageValue(
      "Abdominal wall reconstruction",
      "Clinical frustration",
    );

    expect(
      resolveIntelligenceMergeCategory({
        dbKey: "provider_procedure_focus",
        value: existing,
      }),
    ).toBe("clinical_procedures");
    expect(
      resolveIntelligenceMergeCategory({
        dbKey: "provider_clinical_frustrations",
        value: proposed,
      }),
    ).toBe("clinical_pain_points");

    expect(
      intelligenceFieldConflict({
        dbKey: "provider_procedure_focus",
        existingValue: existing,
        proposedValue: proposed,
      }),
    ).toBeNull();
  });

  it("routes clinical frustration to provider_clinical_frustrations", () => {
    const resolved = resolveClinicalDbKeyAndSignal({
      value: "Visualization during robotic abdominal wall reconstruction",
      evidence:
        "He mentioned visualization is a challenge during robotic abdominal wall reconstruction.",
      attribute: "clinical_frustration",
    });
    expect(resolved?.dbKey).toBe("provider_clinical_frustrations");
    expect(resolved?.clinicalSignal).toBe("clinical_frustration");
  });

  it("merges pain points into pain bucket without replacing procedure bucket", () => {
    const procedure = formatClinicalStorageValue("Ventral hernia repair", "Procedure focus area");
    const pain = formatClinicalStorageValue(
      "Abdominal wall reconstruction",
      "Clinical frustration",
    );
    const merged = mergeIntelligenceFieldValue(
      "clinical_pain_points",
      procedure,
      pain,
      "provider_procedure_focus",
    );
    expect(merged).toContain("Ventral hernia repair");
    expect(merged).toContain("Clinical frustration");
  });

  it("auto-resolves generic existing values to specific proposed values without a user decision", () => {
    const generic = formatClinicalStorageValue("General", "Procedure focus area");
    const specific = formatClinicalStorageValue("Ventral hernia repair", "Procedure focus area");

    const conflict = intelligenceFieldConflict({
      dbKey: "provider_procedure_focus",
      existingValue: generic,
      proposedValue: specific,
    });
    expect(conflict?.resolution).toBe("replace");
  });

  it("suppresses generic proposed values when a specific value is already on file", () => {
    const generic = formatClinicalStorageValue("General", "Procedure focus area");
    const specific = formatClinicalStorageValue("Ventral hernia repair", "Procedure focus area");

    expect(
      intelligenceFieldConflict({
        dbKey: "provider_procedure_focus",
        existingValue: specific,
        proposedValue: generic,
      }),
    ).toBeNull();
  });

  it("drops generic placeholder segments when merging procedure focus", () => {
    const merged = mergeIntelligenceFieldValue(
      "clinical_procedures",
      formatClinicalStorageValue("General", "Procedure focus area"),
      formatClinicalStorageValue("Ventral hernia repair", "Procedure focus area"),
      "provider_procedure_focus",
    );
    expect(merged).toContain("Ventral hernia repair");
    expect(merged).not.toContain("General");
  });

  it("recommends replace when observation moves from discussed to approved", () => {
    expect(
      shouldRecommendObservationApprovalReplace("interested", "approved"),
    ).toBe(true);
    expect(
      shouldRecommendObservationApprovalReplace(
        "Observation interest: Yes. Observation approval: No.",
        "approved",
      ),
    ).toBe(true);

    const conflict = intelligenceFieldConflict({
      dbKey: "provider_observation_feasibility",
      existingValue: "interested",
      proposedValue: "approved",
    });
    expect(conflict?.resolution).toBe("replace");
  });

  it("auto-resolves observation maturity from discussed to interested without a manual conflict", () => {
    expect(shouldRecommendObservationApprovalReplace("discussed", "interested")).toBe(true);

    const conflict = intelligenceFieldConflict({
      dbKey: "provider_observation_feasibility",
      existingValue: "discussed",
      proposedValue: "interested",
    });

    expect(conflict?.resolution).toBe("replace");
  });

  it("does not downgrade observation maturity from interested back to discussed", () => {
    const conflict = intelligenceFieldConflict({
      dbKey: "provider_observation_feasibility",
      existingValue: "interested",
      proposedValue: "discussed",
    });

    expect(conflict).toBeNull();
  });

  it("buildFieldUpdatesFromClassifiedFacts keeps procedure and pain point rows separate", () => {
    const classified: DebriefClassifiedFact[] = [
      {
        fact_key: "clinical_procedure_discussed",
        classification: "clinical_focus",
        evidence_quote: "He focuses on general surgery cases.",
        confidence: "High",
        attributes: {
          value: formatClinicalStorageValue("General", "Procedure focus area"),
          attribute: "procedure_focus",
        },
      },
      {
        fact_key: "clinical_procedure_discussed",
        classification: "clinical_focus",
        evidence_quote:
          "Visualization during robotic abdominal wall reconstruction is a challenge.",
        confidence: "High",
        attributes: {
          value: "Visualization during robotic abdominal wall reconstruction",
          attribute: "clinical_frustration",
        },
      },
    ];

    const updates = buildFieldUpdatesFromClassifiedFacts({
      classifiedFacts: classified,
      existingFields: {
        provider_procedure_focus: formatClinicalStorageValue("General", "Procedure focus area"),
      },
      writableFieldKeys: [...PERSISTENT_INTELLIGENCE_WRITABLE_DB_KEYS],
    });

    const procedure = updates.find((u) => u.dbKey === "provider_procedure_focus");
    const pain = updates.find((u) => u.dbKey === "provider_clinical_frustrations");
    expect(procedure).toBeTruthy();
    expect(pain).toBeTruthy();
    expect(procedure?.conflict).toBeNull();
    expect(pain?.conflict).toBeNull();
  });

  it("contact field updates preserve the person's name, role, and evidence", () => {
    const classified: DebriefClassifiedFact[] = [
      {
        id: "fact-amy",
        fact_key: "scheduling_person_named",
        fact_text: "scheduling_person_named",
        classification: "scheduling",
        intelligenceCategory: "people_contacts",
        evidence_quote: "Amy now coordinates observation scheduling and case dates.",
        subject: "Amy",
        named_people: ["Amy"],
        confidence: "High",
        attributes: {
          value: "Observation Scheduling Coordinator",
          attribute: "role",
          personName: "Amy",
        },
      },
    ];

    const updates = buildFieldUpdatesFromClassifiedFacts({
      classifiedFacts: classified,
      existingFields: {
        provider_scheduling_contact: "Karen handles observation scheduling",
        provider_observation_coordinator_contact: "Karen handles observation scheduling",
      },
      writableFieldKeys: [...PERSISTENT_INTELLIGENCE_WRITABLE_DB_KEYS],
    });

    const contact = updates.find(
      (u) =>
        u.dbKey === "provider_scheduling_contact" ||
        u.dbKey === "provider_observation_coordinator_contact",
    );
    expect(contact).toBeTruthy();
    // The merge card must show WHO replaces Karen — never a bare role label.
    expect(contact?.proposedValue).toMatch(/Amy/);
    expect(contact?.proposedValue).toMatch(/Observation Scheduling Coordinator/);
    expect(contact?.proposedValue).toMatch(/Amy now coordinates observation scheduling/);
    expect(contact?.conflict).toBeTruthy();
    expect(contact?.conflict?.existingValue).toMatch(/Karen/);
    expect(contact?.conflict?.newValue).toMatch(/Amy/);
  });

  it("departed Karen plus successor Amy in full dictation proposes Amy, not historical Karen", () => {
    const sourceText =
      "Previously Karen handled observation scheduling. Today Dr. Onion told me Karen is no longer involved. Amy now coordinates all observation scheduling and case dates.";
    const classified: DebriefClassifiedFact[] = [
      {
        id: "fact-karen-historical",
        fact_key: "scheduling_person_named",
        fact_text: "scheduling_person_named",
        classification: "scheduling",
        intelligenceCategory: "people_contacts",
        evidence_quote: "Previously Karen handled observation scheduling.",
        subject: "Karen",
        named_people: ["Karen"],
        confidence: "High",
        attributes: {
          value: "Scheduling Coordinator",
          attribute: "role",
          personName: "Karen",
        },
      },
      {
        id: "fact-amy-successor",
        fact_key: "scheduling_person_named",
        fact_text: "scheduling_person_named",
        classification: "scheduling",
        intelligenceCategory: "people_contacts",
        evidence_quote: "Amy now coordinates all observation scheduling and case dates.",
        subject: "Amy",
        named_people: ["Amy"],
        confidence: "High",
        attributes: {
          value: "Observation Scheduling Coordinator",
          attribute: "role",
          personName: "Amy",
        },
      },
    ];

    const updates = buildFieldUpdatesFromClassifiedFacts({
      classifiedFacts: classified,
      existingFields: {
        provider_scheduling_contact: "Karen handles observation scheduling",
        provider_observation_coordinator_contact: "Karen handles observation scheduling",
      },
      writableFieldKeys: [...PERSISTENT_INTELLIGENCE_WRITABLE_DB_KEYS],
      sourceText,
    });

    const contact = updates.find(
      (u) =>
        u.dbKey === "provider_scheduling_contact" ||
        u.dbKey === "provider_observation_coordinator_contact",
    );
    expect(contact).toBeTruthy();
    expect(contact?.proposedValue).toMatch(/Amy/);
    expect(contact?.proposedValue).not.toMatch(/Previously Karen handled/i);
    expect(contact?.conflict?.existingValue).toMatch(/Karen/);
    expect(contact?.conflict?.newValue).toMatch(/Amy/);
  });

  it("same person re-confirmed in the same contact slot creates no update and no conflict", () => {
    const classified: DebriefClassifiedFact[] = [
      {
        id: "fact-karen",
        fact_key: "scheduling_person_named",
        fact_text: "scheduling_person_named",
        classification: "scheduling",
        intelligenceCategory: "people_contacts",
        evidence_quote: "Karen still handles observation scheduling.",
        subject: "Karen",
        named_people: ["Karen"],
        confidence: "High",
        attributes: {
          value: "Scheduling Coordinator",
          attribute: "role",
          personName: "Karen",
        },
      },
    ];

    const updates = buildFieldUpdatesFromClassifiedFacts({
      classifiedFacts: classified,
      existingFields: {
        provider_scheduling_contact: "Karen = scheduling coordinator",
        provider_observation_coordinator_contact: "Karen = scheduling coordinator",
      },
      writableFieldKeys: [...PERSISTENT_INTELLIGENCE_WRITABLE_DB_KEYS],
    });

    const contact = updates.find(
      (u) =>
        u.dbKey === "provider_scheduling_contact" ||
        u.dbKey === "provider_observation_coordinator_contact",
    );
    expect(contact).toBeUndefined();
  });
});

describe("confirmed contact extraction", () => {
  it("Sarah Williams with phone and email is a confirmed support contact", () => {
    const dictation =
      "Sarah Williams coordinates OR scheduling. Her email is sarah.williams@hospital.org and phone is (555) 867-5309.";
    const facts: DebriefAtomicFact[] = [
      {
        fact_type: "scheduling",
        entity: "Sarah Williams",
        attribute: "scheduling coordinator",
        value: "Sarah Williams coordinates OR scheduling",
        confidence: "high",
        evidence:
          "Sarah Williams coordinates OR scheduling. Her email is sarah.williams@hospital.org and phone is (555) 867-5309.",
      },
    ];

    const contacts = proposedContactsFromAtomicFacts({
      facts,
      dictation,
      sourceReference: "test",
    });

    expect(contacts).toHaveLength(1);
    expect(contacts[0]?.displayName).toBe("Sarah Williams");
    expect(contacts[0]?.mentionLevel).toBe("confirmed_support_contact");
    expect(contacts[0]?.contactDetailsMissing).toBe(false);
    expect(contacts[0]?.email).toMatch(/sarah\.williams@hospital\.org/i);
    expect(contacts[0]?.phone).toMatch(/867-5309/);
    expect(contacts[0]?.roleLabel).toMatch(/Scheduling Coordinator/i);
  });

  it("buildProposedContactFromExtraction marks explicit phone as confirmed", () => {
    const contact = buildProposedContactFromExtraction({
      name: "Sarah Williams",
      quote: "Sarah Williams — sarah.williams@hospital.org — (555) 867-5309",
      sourceReference: "test",
      debriefText:
        "Sarah Williams coordinates scheduling. sarah.williams@hospital.org (555) 867-5309",
      index: 0,
    });
    expect(contact.mentionLevel).toBe("confirmed_support_contact");
    expect(contact.contactDetailsMissing).toBe(false);
  });
});
