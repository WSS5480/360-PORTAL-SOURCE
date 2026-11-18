import { describe, expect, it } from "vitest";

import {
  buildOrganizationSuggestedContextForProvider,
  caseFindingShouldNotPromoteToOrganization,
  peerObservationApprovalShouldNotCopy,
  peerProviderProductShouldNotCopyToNewProvider,
} from "./buildOrganizationSuggestedContextForProvider";
import { mergeOrganizationInheritanceResolutions } from "./providerIntelligenceFieldMetadata";
import { readOrganizationInheritanceFromContact } from "./organizationIntelligenceInheritance";
import type { OrganizationIntelligenceBaseline } from "./loadOrganizationIntelligenceBaseline";
import { buildProviderIntelligenceKnowledgeDashboardView } from "./buildProviderIntelligenceKnowledgeDashboardView";
import { buildImmediateActionOpenQuestions } from "./buildProviderOpenQuestions";
import { schedulingContactUnresolvedPhrase } from "./intelligenceGapQualification";
import {
  containsProviderSpecificLanguage,
  detectOrganizationScopeCorrection,
  filterOrganizationIntelligenceBaseline,
  isEligibleOrganizationBaselineValue,
} from "./organizationIntelligenceReusableFilter";

const TEST_HOSPITAL_BASELINE: OrganizationIntelligenceBaseline = {
  organizationId: "org-test-hospital",
  organizationName: "Test Hospital",
  supportContacts: [
    {
      contactId: "karen-id",
      contactName: "Karen Smith",
      contactRole: "scheduler",
      workflowRole: "observation_scheduling_owner",
      contributorCount: 2,
    },
  ],
  fields: {
    provider_facility_scheduling_contact: {
      dbKey: "provider_facility_scheduling_contact",
      label: "Facility scheduling contact",
      value: "karen|Karen Smith",
      displayLine: "Karen Smith (Scheduler)",
      contributorCount: 2,
    },
    provider_credentialing_status: {
      dbKey: "provider_credentialing_status",
      label: "Vendor credentialing process",
      value: "vendormate|Vendormate credentialing",
      displayLine: "Vendormate credentialing process",
      contributorCount: 2,
    },
    provider_observation_access_path: {
      dbKey: "provider_observation_access_path",
      label: "OR access rules",
      value: "badge|Badge check-in required",
      displayLine: "Badge check-in required",
      contributorCount: 1,
    },
    provider_or_team_dynamics: {
      dbKey: "provider_or_team_dynamics",
      label: "OR / facility workflow culture",
      value: "robotic|Robotic program active",
      displayLine: "Robotic program active",
      contributorCount: 2,
    },
  },
};

const BARD_MESH_PEER_STATEMENT =
  "He is currently using Bard Mesh in a lot of his hernia cases from what I understood.";

describe("organization suggested context for new providers", () => {
  it("Test 1 — organization scheduler suggestion: Karen appears as suggested, not confirmed", () => {
    const view = buildOrganizationSuggestedContextForProvider({
      contact: { id: "dr-banana" },
      providerId: "dr-banana",
      organizationBaseline: TEST_HOSPITAL_BASELINE,
    });

    const scheduler = view.suggestedItems.find((item) => /Karen Smith/i.test(item.title));
    expect(scheduler).toBeTruthy();
    expect(scheduler?.title).toBe("Observation scheduling contact suggested: Karen Smith");
    expect(scheduler?.detailLine).toBe("Observation scheduling contact");
    expect(scheduler?.confirmationStatus).toBe("suggested");
    expect(scheduler?.statusLabels).toContain("Learned at facility");
    expect(scheduler?.statusLabels).toContain("Review for this provider");
    expect(scheduler?.statusLabels).not.toContain("Applied to this provider");
    expect(scheduler?.scopedItem.linkedContactId).toBe("karen-id");
    expect(scheduler?.actions.find((action) => action.id === "confirm")).toMatchObject({
      linkedContactId: "karen-id",
      workflowRole: "observation_scheduling_owner",
      relationshipType: "scheduler",
    });
    expect(view.suggestedItems.map((item) => item.title)).toEqual([
      expect.stringMatching(/Karen Smith/i),
    ]);
  });

  it("Test 2 — confirm organization contact: Karen linked to provider and remains organization-level", () => {
    const { metadata, fieldValues } = mergeOrganizationInheritanceResolutions({
      existing: {},
      resolutions: {
        provider_facility_scheduling_contact: {
          stance: "applies",
          facility_display_line: "Karen Smith (Scheduler)",
          facility_value: "karen|Karen Smith",
        },
      },
      captureContext: { source_type: "profile", source_label: "Organization context confirm" },
      actor: { userId: "rep-1", userName: "Rep" },
      baseline: TEST_HOSPITAL_BASELINE,
    });

    expect(fieldValues.provider_facility_scheduling_contact).toBe("karen|Karen Smith");
    expect(metadata.provider_facility_scheduling_contact?.organization_inheritance?.stance).toBe("applies");

    const view = buildOrganizationSuggestedContextForProvider({
      contact: {
        id: "dr-banana",
        provider_facility_scheduling_contact: fieldValues.provider_facility_scheduling_contact,
        provider_intelligence_field_metadata: metadata,
      },
      providerId: "dr-banana",
      organizationBaseline: TEST_HOSPITAL_BASELINE,
    });

    expect(
      view.suggestedItems.some((item) => item.scopedItem.dbKey === "provider_facility_scheduling_contact"),
    ).toBe(false);
    expect(readOrganizationInheritanceFromContact(
      {
        provider_facility_scheduling_contact: fieldValues.provider_facility_scheduling_contact,
        provider_intelligence_field_metadata: metadata,
      },
      "provider_facility_scheduling_contact",
    )?.stance).toBe("applies");
  });

  it("hides an applied support-contact suggestion when the baseline has no field row", () => {
    const { metadata, fieldValues } = mergeOrganizationInheritanceResolutions({
      existing: {},
      resolutions: {
        provider_facility_scheduling_contact: {
          stance: "applies",
          facility_display_line: "Sarah",
          facility_value: "Sarah",
          linked_contact_id: "sarah-id",
          workflow_role: "observation_scheduling_owner",
          relationship_type: "scheduler",
        },
      },
      captureContext: { source_type: "profile", source_label: "Suggested facility intelligence" },
      actor: { userId: "rep-1", userName: "Rep" },
      baseline: {
        organizationId: "org-test-hospital",
        organizationName: "Test Hospital",
        supportContacts: [
          {
            contactId: "sarah-id",
            contactName: "Sarah",
            contactRole: "scheduler",
            workflowRole: "observation_scheduling_owner",
            contributorCount: 1,
          },
        ],
        fields: {},
      },
    });

    expect(fieldValues.provider_facility_scheduling_contact).toBe("Sarah");

    const view = buildOrganizationSuggestedContextForProvider({
      contact: {
        id: "dr-lettuce",
        provider_facility_scheduling_contact: fieldValues.provider_facility_scheduling_contact,
        provider_intelligence_field_metadata: metadata,
      },
      providerId: "dr-lettuce",
      organizationBaseline: {
        organizationId: "org-test-hospital",
        organizationName: "Test Hospital",
        supportContacts: [
          {
            contactId: "sarah-id",
            contactName: "Sarah",
            contactRole: "scheduler",
            workflowRole: "observation_scheduling_owner",
            contributorCount: 1,
          },
        ],
        fields: {},
      },
      relatedContacts: [{ id: "sarah-id", first_name: "Sarah", role_type: "scheduler" }],
    });

    expect(view.suggestedItems.some((item) => /Sarah/i.test(item.title))).toBe(false);
  });

  it("hides an applied support-contact suggestion from inheritance metadata even if the field value is empty", () => {
    const view = buildOrganizationSuggestedContextForProvider({
      contact: {
        id: "dr-lettuce",
        provider_facility_scheduling_contact: null,
        provider_intelligence_field_metadata: {
          provider_facility_scheduling_contact: {
            source_type: "profile",
            source_label: "Suggested facility intelligence",
            updated_at: "2026-06-26T12:00:00Z",
            lifecycle_state: "confirmed",
            organization_inheritance: {
              stance: "applies",
              facility_display_line: "Sarah",
              facility_value: "Sarah",
              resolved_at: "2026-06-26T12:00:00Z",
            },
          },
        },
      },
      providerId: "dr-lettuce",
      organizationBaseline: {
        organizationId: "org-test-hospital",
        organizationName: "Test Hospital",
        supportContacts: [
          {
            contactId: "sarah-id",
            contactName: "Sarah",
            contactRole: "scheduler",
            workflowRole: "observation_scheduling_owner",
            contributorCount: 1,
          },
        ],
        fields: {},
      },
      relatedContacts: [{ id: "sarah-id", first_name: "Sarah", role_type: "scheduler" }],
    });

    expect(view.suggestedItems.some((item) => /Sarah/i.test(item.title))).toBe(false);
  });

  it("does not suggest facility support contacts unless they are linked contacts", () => {
    const view = buildOrganizationSuggestedContextForProvider({
      contact: { id: "dr-banana" },
      providerId: "dr-banana",
      organizationBaseline: {
        ...TEST_HOSPITAL_BASELINE,
        supportContacts: [
          {
            contactId: null,
            contactName: "Karen Smith",
            contactRole: "scheduler",
            workflowRole: "observation_scheduling_owner",
            contributorCount: 2,
          },
        ],
        fields: {
          provider_facility_scheduling_contact: {
            dbKey: "provider_facility_scheduling_contact",
            label: "Facility scheduling contact",
            value: "Karen Smith handles scheduling",
            displayLine: "Karen Smith handles scheduling",
            contributorCount: 2,
          },
        },
      },
    });

    expect(view.suggestedItems).toEqual([]);
    expect(view.hasSuggestions).toBe(false);
  });

  it("suggests support contact from a structured facility scheduling field", () => {
    const view = buildOrganizationSuggestedContextForProvider({
      contact: { id: "dr-banana" },
      providerId: "dr-banana",
      organizationBaseline: {
        ...TEST_HOSPITAL_BASELINE,
        supportContacts: [],
        fields: {
          provider_facility_scheduling_contact: TEST_HOSPITAL_BASELINE.fields.provider_facility_scheduling_contact!,
        },
      },
    });

    const scheduler = view.suggestedItems.find((item) => /Karen Smith/i.test(item.title));
    expect(scheduler).toBeTruthy();
    expect(scheduler?.kind).toBe("support_contact");
    expect(scheduler?.scopedItem.linkedContactId).toBe("karen");
    expect(scheduler?.title).toBe("Observation scheduling contact suggested: Karen Smith");
    expect(scheduler?.detailLine).toBe("Observation scheduling contact");
    expect(view.suggestedItems.every((item) => item.kind === "support_contact")).toBe(true);
  });

  it("suggests support contacts aggregated from provider plus organization relationships", () => {
    const view = buildOrganizationSuggestedContextForProvider({
      contact: { id: "dr-banana" },
      providerId: "dr-banana",
      organizationBaseline: {
        organizationId: "org-test-hospital",
        organizationName: "Test Hospital",
        fields: {},
        supportContacts: [
          {
            contactId: "sarah-id",
            contactName: "Sarah Scheduler",
            contactRole: "scheduler",
            workflowRole: "observation_scheduling_owner",
            contributorCount: 1,
          },
        ],
      },
    });

    const scheduler = view.suggestedItems.find((item) => /Sarah Scheduler/i.test(item.title));
    expect(scheduler).toBeTruthy();
    expect(scheduler?.kind).toBe("support_contact");
    expect(scheduler?.scopedItem.linkedContactId).toBe("sarah-id");
    expect(scheduler?.title).toBe("Observation scheduling contact suggested: Sarah Scheduler");
    expect(scheduler?.detailLine).toBe("Observation scheduling contact");
  });

  it("hides a facility support contact after marking it not applicable to the provider", () => {
    const { metadata, fieldValues } = mergeOrganizationInheritanceResolutions({
      existing: {},
      resolutions: {
        provider_facility_scheduling_contact: {
          stance: "does_not_apply",
          facility_display_line: "Sarah Scheduler",
          facility_value: "Sarah Scheduler",
        },
      },
      captureContext: { source_type: "profile", source_label: "Organization context dismiss" },
      actor: { userId: "rep-1", userName: "Rep" },
      baseline: {
        organizationId: "org-test-hospital",
        organizationName: "Test Hospital",
        fields: {},
        supportContacts: [
          {
            contactId: "sarah-id",
            contactName: "Sarah Scheduler",
            contactRole: "scheduler",
            workflowRole: "observation_scheduling_owner",
            contributorCount: 1,
          },
        ],
      },
    });

    const view = buildOrganizationSuggestedContextForProvider({
      contact: {
        id: "dr-banana",
        provider_facility_scheduling_contact: fieldValues.provider_facility_scheduling_contact,
        provider_intelligence_field_metadata: metadata,
      },
      providerId: "dr-banana",
      organizationBaseline: {
        organizationId: "org-test-hospital",
        organizationName: "Test Hospital",
        fields: {},
        supportContacts: [
          {
            contactId: "sarah-id",
            contactName: "Sarah Scheduler",
            contactRole: "scheduler",
            workflowRole: "observation_scheduling_owner",
            contributorCount: 1,
          },
        ],
      },
    });

    expect(view.suggestedItems.some((item) => /Sarah Scheduler/i.test(item.title))).toBe(false);
    expect(view.hasSuggestions).toBe(false);
  });

  it("suggests a facility support contact when the existing contact record resolves the link", () => {
    const view = buildOrganizationSuggestedContextForProvider({
      contact: { id: "dr-banana" },
      providerId: "dr-banana",
      relatedContacts: [
        {
          id: "karen-id",
          first_name: "Karen",
          last_name: "Smith",
        },
      ],
      organizationBaseline: {
        ...TEST_HOSPITAL_BASELINE,
        supportContacts: [
          {
            contactId: null,
            contactName: "Karen Smith",
            contactRole: "scheduler",
            workflowRole: "observation_scheduling_owner",
            contributorCount: 2,
          },
        ],
        fields: {
          provider_facility_scheduling_contact: TEST_HOSPITAL_BASELINE.fields.provider_facility_scheduling_contact!,
        },
      },
    });

    const scheduler = view.suggestedItems.find((item) => /Karen Smith/i.test(item.title));
    expect(scheduler).toBeTruthy();
    expect(scheduler?.confirmationStatus).toBe("suggested");
    expect(scheduler?.scopedItem.linkedContactId).toBe("karen-id");
  });

  it("Test 3 — provider-specific product not copied to new provider", () => {
    const peerApple = {
      provider_competitive_products: "Bard Mesh",
      provider_current_vendors: "",
    };
    const newBanana = { provider_competitive_products: "", provider_current_vendors: "" };

    expect(
      peerProviderProductShouldNotCopyToNewProvider({ peerContact: peerApple, newProviderContact: newBanana }),
    ).toBe(true);

    const baselineWithMisscopedProduct: OrganizationIntelligenceBaseline = {
      ...TEST_HOSPITAL_BASELINE,
      fields: {
        ...TEST_HOSPITAL_BASELINE.fields,
        provider_preference_card_signals: {
          dbKey: "provider_preference_card_signals",
          label: "Purchasing / committee process",
          value: BARD_MESH_PEER_STATEMENT,
          displayLine: BARD_MESH_PEER_STATEMENT,
          contributorCount: 1,
        },
      },
    };

    const view = buildOrganizationSuggestedContextForProvider({
      contact: newBanana,
      providerId: "dr-banana",
      organizationBaseline: filterOrganizationIntelligenceBaseline(baselineWithMisscopedProduct),
    });

    expect(view.suggestedItems.some((item) => /bard mesh/i.test(item.detailLine))).toBe(false);
    expect(view.suggestedItems.some((item) => /Karen Smith/i.test(item.title))).toBe(true);
  });

  it("Andy Pumpkin — org panel shows Karen only, not Dr. Apple Bard Mesh statement", () => {
    const baseline: OrganizationIntelligenceBaseline = {
      organizationId: "org-test-hospital",
      organizationName: "Test Hospital",
      supportContacts: TEST_HOSPITAL_BASELINE.supportContacts,
      fields: {
        provider_facility_scheduling_contact: TEST_HOSPITAL_BASELINE.fields.provider_facility_scheduling_contact!,
        provider_preference_card_signals: {
          dbKey: "provider_preference_card_signals",
          label: "Purchasing / committee process",
          value: BARD_MESH_PEER_STATEMENT,
          displayLine: BARD_MESH_PEER_STATEMENT,
          contributorCount: 1,
        },
      },
    };

    const view = buildOrganizationSuggestedContextForProvider({
      contact: { id: "andy-pumpkin", first_name: "Andy", last_name: "Pumpkin" },
      providerId: "andy-pumpkin",
      organizationBaseline: filterOrganizationIntelligenceBaseline(baseline),
    });

    expect(view.suggestedItems.some((item) => /Karen Smith/i.test(item.title))).toBe(true);
    expect(view.suggestedItems.some((item) => /Facility commercial context noted/i.test(item.title))).toBe(
      false,
    );
    expect(view.suggestedItems.some((item) => /bard mesh/i.test(item.detailLine))).toBe(false);
  });

  it("confirmed organization scheduler clears scheduling contact gap warnings", () => {
    const contact = {
      id: "andy-pumpkin",
      provider_observation_feasibility: "Observation approval: Yes",
      provider_facility_scheduling_contact: "karen|Karen Smith",
      provider_intelligence_field_metadata: {
        provider_facility_scheduling_contact: {
          source_type: "profile",
          source_label: "Organization context confirm",
          updated_at: "2026-06-08T00:00:00.000Z",
          lifecycle_state: "confirmed",
          confirmed_at: "2026-06-08T00:00:00.000Z",
          organization_inheritance: {
            stance: "applies",
            facility_display_line: "Karen Smith (Scheduler)",
            facility_value: "karen|Karen Smith",
            resolved_at: "2026-06-08T00:00:00.000Z",
          },
        },
      },
    };

    expect(
      schedulingContactUnresolvedPhrase(
        "provider_facility_scheduling_contact",
        contact.provider_facility_scheduling_contact as string,
        contact,
      ),
    ).toBeNull();

    const gaps = buildImmediateActionOpenQuestions(contact);
    expect(gaps.some((gap) => /scheduler contact information unknown/i.test(gap.text))).toBe(false);
  });

  it("Test 4 — facility access process and credentialing-required facts are not provider suggestions", () => {
    const view = buildOrganizationSuggestedContextForProvider({
      contact: { id: "dr-banana" },
      providerId: "dr-banana",
      organizationBaseline: TEST_HOSPITAL_BASELINE,
    });

    const credentialing = view.suggestedItems.find(
      (item) => item.scopedItem.dbKey === "provider_credentialing_status",
    );
    expect(credentialing).toBeUndefined();

    const observationAccess = view.suggestedItems.find(
      (item) => item.scopedItem.dbKey === "provider_observation_access_path",
    );
    expect(observationAccess).toBeUndefined();

    expect(view.panelTitle).toBe("Suggested Facility Intelligence");
    expect(view.panelSubtext).toMatch(/already learned these things about the facility/i);
    expect(view.suggestedItems.map((item) => item.title)).toEqual([
      expect.stringMatching(/Karen Smith/i),
    ]);
  });

  it("facility credentialing complete appears as the only field suggestion", () => {
    const view = buildOrganizationSuggestedContextForProvider({
      contact: { id: "dr-banana" },
      providerId: "dr-banana",
      organizationBaseline: {
        ...TEST_HOSPITAL_BASELINE,
        supportContacts: [],
        fields: {
          provider_credentialing_status: {
            dbKey: "provider_credentialing_status",
            label: "Vendor credentialing process",
            value: "cleared",
            displayLine: "Credentialing complete",
            contributorCount: 2,
          },
          provider_observation_credentialing_needed: {
            dbKey: "provider_observation_credentialing_needed",
            label: "Observation credentialing required?",
            value: "cleared",
            displayLine: "Credentialing complete",
            contributorCount: 2,
          },
          provider_observation_access_path: TEST_HOSPITAL_BASELINE.fields.provider_observation_access_path!,
        },
      },
    });

    expect(view.suggestedItems).toHaveLength(1);
    expect(view.suggestedItems.every((item) => /credentialing/i.test(item.title))).toBe(true);
    expect(view.suggestedItems[0]?.title).toBe("Facility Credentialing Complete");
    expect(view.suggestedItems.some((item) => item.scopedItem.dbKey === "provider_observation_access_path")).toBe(false);
    expect(view.suggestedItems[0]?.actions.some((action) => action.label === "Apply to Provider")).toBe(true);
  });

  it("Test 5 — provider observation approval not copied", () => {
    expect(
      peerObservationApprovalShouldNotCopy({
        peerContact: {
          provider_observation_feasibility: "Observation approval: Yes",
          provider_commercial_intelligence: {
            version: 1,
            observation: { approval_status: "approved" },
          },
        },
      }),
    ).toBe(true);

    const view = buildProviderIntelligenceKnowledgeDashboardView({
      contact: { id: "dr-banana" },
      providerId: "dr-banana",
      organizationBaseline: TEST_HOSPITAL_BASELINE,
    });

    const approvalStep = view.progress.accessSteps.find((step) => step.id === "approval");
    expect(approvalStep?.state).toBe("missing");
    expect(approvalStep?.detailLine).toBeUndefined();
  });

  it("Test 6 — organization procedure context and provider case volume are not provider suggestions", () => {
    const view = buildOrganizationSuggestedContextForProvider({
      contact: { id: "dr-banana", provider_case_volume_estimate: "" },
      providerId: "dr-banana",
      organizationBaseline: TEST_HOSPITAL_BASELINE,
    });

    expect(view.suggestedItems.some((item) => /robotic program/i.test(item.title))).toBe(false);
    expect(view.suggestedItems.some((item) => /case volume|case mix/i.test(item.title))).toBe(false);
  });

  it("Test 7 — ambiguous case finding not promoted to new provider", () => {
    expect(
      caseFindingShouldNotPromoteToOrganization({
        text: "Visualization/fixation issue observed during Dr. Apple's case",
        dbKey: "provider_clinical_frustrations",
      }),
    ).toBe(true);

    const view = buildOrganizationSuggestedContextForProvider({
      contact: { id: "dr-banana" },
      providerId: "dr-banana",
      organizationBaseline: {
        ...TEST_HOSPITAL_BASELINE,
        fields: {
          ...TEST_HOSPITAL_BASELINE.fields,
        },
      },
    });

    expect(view.suggestedItems.some((item) => /fixation|visualization/i.test(item.detailLine))).toBe(false);
  });
});

describe("organizationIntelligenceReusableFilter", () => {
  it("detects provider-specific pronoun language", () => {
    expect(containsProviderSpecificLanguage(BARD_MESH_PEER_STATEMENT)).toBe(true);
    expect(containsProviderSpecificLanguage("The hospital requires all vendors to credential.")).toBe(false);
  });

  it("rejects mis-scoped product statements from org baseline eligibility", () => {
    expect(
      isEligibleOrganizationBaselineValue("provider_preference_card_signals", BARD_MESH_PEER_STATEMENT),
    ).toBe(false);
    expect(
      isEligibleOrganizationBaselineValue(
        "provider_current_vendors",
        "The facility uses Bard Mesh as a standard formulary item.",
      ),
    ).toBe(true);
  });

  it("detects scope correction for mis-scoped org mirror fields", () => {
    expect(
      detectOrganizationScopeCorrection("provider_preference_card_signals", BARD_MESH_PEER_STATEMENT),
    ).toEqual(
      expect.objectContaining({
        correctedScope: "provider",
      }),
    );
  });
});
