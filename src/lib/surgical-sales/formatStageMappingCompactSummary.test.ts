import { describe, expect, it } from "vitest";
import { buildStageMappingSession } from "./buildStageMappingSession";
import { buildDiscoveryIntelligenceGroupsView } from "./buildDiscoveryIntelligenceGroupsView";
import { formatStageMappingCompactSummary } from "./formatStageMappingCompactSummary";
import type { StageMappingQuestion } from "./buildStageMappingSession";

function questionFor(signalId: StageMappingQuestion["signalId"]): StageMappingQuestion {
  const view = buildDiscoveryIntelligenceGroupsView({
    contact: { provider_relationship_stage: "prospect" },
  });
  const session = buildStageMappingSession(view, { contact: {} });
  const found = session.operationalQuestions.find((q) => q.signalId === signalId);
  if (!found) throw new Error(`missing ${signalId}`);
  return found;
}

describe("formatStageMappingCompactSummary", () => {
  it("summarizes observation approval without raw tokens", () => {
    const summary = formatStageMappingCompactSummary({
      question: questionFor("observation_approval"),
      contact: {
        provider_observation_feasibility: "approved",
        provider_intelligence_field_metadata: {
          provider_observation_feasibility: {
            source_type: "profile",
            source_label: "Manual mapping",
            updated_at: "2026-05-01T00:00:00.000Z",
            validated_at: "2026-05-01T00:00:00.000Z",
            lifecycle_state: "validated",
          },
        },
      },
      selectedChoice: "approved",
    });

    expect(summary).toBe("Observation access approved");
    expect(summary).not.toMatch(/approved on file|_/);
  });

  it("summarizes scheduling control and owner name", () => {
    const summary = formatStageMappingCompactSummary({
      question: questionFor("scheduling_owner"),
      contact: {
        provider_observation_scheduling_control: "provider_office",
        provider_scheduling_contact: "Karen Smith · Office scheduler",
      },
      selectedChoice: "provider_office",
    });

    expect(summary).toBe(
      "Karen Smith may be involved in scheduling, but ownership is not confirmed.",
    );
  });

  it("summarizes scheduling path when no owner name is known", () => {
    const summary = formatStageMappingCompactSummary({
      question: questionFor("scheduling_owner"),
      contact: {
        provider_observation_scheduling_control: "provider_office",
      },
      selectedChoice: "provider_office",
    });

    expect(summary).toBe("Observation scheduling is handled by the provider office");
  });

  it("summarizes credentialing required and access pathway", () => {
    const summary = formatStageMappingCompactSummary({
      question: questionFor("facility_vendor_pathway"),
      contact: {
        provider_observation_credentialing_needed: "required",
        provider_observation_access_path: "office_manager",
      },
      metadata: {
        approval_required: "yes",
        access_pathway: "office_manager",
      },
    });

    expect(summary).toMatch(/Credentialing required before observation/);
    expect(summary).toMatch(/Access pathway runs through office manager/);
    expect(summary).not.toMatch(/office_manager|approval_required/);
  });

  it("summarizes credentialing not required", () => {
    const summary = formatStageMappingCompactSummary({
      question: questionFor("facility_vendor_pathway"),
      contact: {
        provider_observation_credentialing_needed: "cleared",
      },
      metadata: { approval_required: "no" },
    });

    expect(summary).toBe("Credentialing not required");
  });

  it("summarizes workflow roles in plain language", () => {
    const summary = formatStageMappingCompactSummary({
      question: questionFor("scheduling_owner"),
      contact: {},
      providerContactDraft: {
        mode: "create",
        createStep: 1,
        selectedContactId: "",
        contactTypeId: "office_staff",
        jobTitle: "Office Manager",
        workflowResponsibilities: ["observation_scheduling_owner"],
        ownershipType: "provider",
        showProviders: false,
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        notes: "",
        organizationId: null,
        roleId: "office_manager",
      },
    });

    expect(summary).toBe("Role includes observation scheduling");
    expect(summary).not.toMatch(/observation_scheduling_owner/);
  });
});
