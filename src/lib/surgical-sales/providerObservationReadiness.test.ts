import { describe, expect, it } from "vitest";

import { INTRO_CALL_TOM_SANDY_JENNIFER_DICTATION } from "@/lib/surgical-sales/debriefIntroCallRegressionFixtures";
import { PROVIDER_COMMERCIAL_INTELLIGENCE_DB_KEY } from "@/lib/surgical-sales/providerCommercialIntelligenceModel";
import { buildProviderObservationReadiness, isSchedulerContactLinkedOnFile } from "@/lib/surgical-sales/providerObservationReadiness";

describe("buildProviderObservationReadiness", () => {
  it("returns unknown for empty contact", () => {
    const readiness = buildProviderObservationReadiness({});
    expect(readiness.providerInterest).toBe("unknown");
    expect(readiness.blockers).toEqual([]);
  });

  it("maps Tom Sandy post-intro debrief contact to access blockers", () => {
    const readiness = buildProviderObservationReadiness({
      provider_observation_feasibility: "interested",
      provider_observation_access_path:
        "Observation interest: Yes. Observation approval: No. Access path identified: Partial.",
      provider_scheduling_contact:
        "Jennifer in his office handles scheduling coordination with the hospital OR team.",
      provider_observation_credentialing_needed: "required",
      provider_credentialing_status:
        "Vendor credentialing required; IntelliCentrics vs hospital pathway unknown.",
      provider_procedure_focus:
        "Robotic ventral hernia repair · Increasing procedure volume | Abdominal wall reconstruction · Increasing case volume",
    });

    expect(readiness).toMatchObject({
      providerInterest: "yes",
      observationApproved: "no",
      credentialingRequired: "yes",
      credentialingPathKnown: "no",
      schedulerIdentified: "partial",
      schedulerContactInfoCaptured: "no",
    });
    expect(readiness.readinessLevel).toBe("not_ready");
    expect(readiness.compactObservationAccess).toBe("Permission Requested");
    expect(readiness.briefingStatusLine).toMatch(/receptive to observation/i);
    expect(readiness.blockers).toEqual(
      expect.arrayContaining(["Scheduler Contact", "Credentialing Pathway"]),
    );
    expect(readiness.blockers.length).toBeGreaterThanOrEqual(3);
  });

  it("infers negative case/date signals from Tom Sandy dictation phrases in stored fields", () => {
    const readiness = buildProviderObservationReadiness({
      provider_observation_feasibility:
        "Observation interest: Yes. Observation approval: No. Access path identified: Partial.",
      provider_credentialing_status: INTRO_CALL_TOM_SANDY_JENNIFER_DICTATION.slice(0, 200),
    });
    expect(readiness.observationDatesDiscussed).toBe("no");
  });

  it("treats validated scheduler Save & Link as captured without phone or email", () => {
    const contact = {
      provider_observation_feasibility: "yes",
      provider_observation_coordinator_contact: "Karen · Scheduler · Observation scheduling",
      provider_intelligence_field_metadata: {
        provider_observation_coordinator_contact: {
          lifecycle_state: "validated",
          validated_at: "2026-06-02T00:00:00Z",
        },
      },
      [PROVIDER_COMMERCIAL_INTELLIGENCE_DB_KEY]: {
        scheduling: {
          scheduler_identified: "partial",
          scheduler_contact_linked: "unknown",
        },
      },
    };

    expect(isSchedulerContactLinkedOnFile(contact)).toBe(true);
    expect(buildProviderObservationReadiness(contact)).toMatchObject({
      schedulerIdentified: "yes",
      schedulerContactInfoCaptured: "yes",
    });
  });
});
