import { describe, expect, it } from "vitest";

import {
  detectIntelligenceReversals,
  existingValueContradictsReversal,
  schedulingContactReplacementNamed,
  textNegatesCredentialingRequirement,
  textNegatesObservationAccess,
} from "@/lib/surgical-sales/intelligenceContradictionDetection";
import {
  applyIntelligenceReversalsToFieldUpdates,
  routeLogUpdateToProviderFields,
} from "@/lib/surgical-sales/logUpdateProviderRouting";

const VALIDATION_FAILURE_NOTE =
  "Previously I was told vendor credentialing was required before observation. Today he clarified credentialing is no longer required and we can attend cases immediately.";

describe("detectIntelligenceReversals", () => {
  it("detects credentialing required → not required", () => {
    const reversals = detectIntelligenceReversals(VALIDATION_FAILURE_NOTE);
    const credentialing = reversals.find((r) => r.domain === "credentialing_requirement");
    expect(credentialing).toBeTruthy();
    expect(credentialing?.dbKey).toBe("provider_observation_credentialing_needed");
    expect(credentialing?.negatedValue).toMatch(/not required/i);
  });

  it("detects 'not needed' and 'not necessary' phrasing", () => {
    expect(
      detectIntelligenceReversals("Credentialing is not needed for observation anymore.").some(
        (r) => r.domain === "credentialing_requirement",
      ),
    ).toBe(true);
    expect(
      detectIntelligenceReversals("He said vendor credentialing is not necessary.").some(
        (r) => r.domain === "credentialing_requirement",
      ),
    ).toBe(true);
  });

  it("textNegatesCredentialingRequirement: 'Credentialing is no longer required' is a negation", () => {
    expect(textNegatesCredentialingRequirement("Credentialing is no longer required")).toBe(true);
    expect(textNegatesCredentialingRequirement(VALIDATION_FAILURE_NOTE)).toBe(true);
    expect(textNegatesCredentialingRequirement("Vendor credentialing is required.")).toBe(false);
    expect(
      textNegatesCredentialingRequirement(
        "Credentialing is required before observation. A signed contract is not necessary.",
      ),
    ).toBe(false);
  });

  it("detects correction cue + immediate access as credentialing reversal", () => {
    const reversals = detectIntelligenceReversals(
      "Previously believed credentialing was a gate. Actually we can attend cases immediately, he clarified about credentialing.",
    );
    expect(reversals.some((r) => r.domain === "credentialing_requirement")).toBe(true);
  });

  it("schedulingContactReplacementNamed recognizes a named successor", () => {
    expect(
      schedulingContactReplacementNamed("Amy now coordinates observation scheduling and case dates."),
    ).toBe(true);
    expect(schedulingContactReplacementNamed("Scheduling now goes through Amy.")).toBe(true);
    expect(schedulingContactReplacementNamed("Amy has taken over observation scheduling.")).toBe(
      true,
    );
    expect(
      schedulingContactReplacementNamed(
        "Karen is no longer handling scheduling for observations — no scheduling contact is identified.",
      ),
    ).toBe(false);
  });

  it("a named successor suppresses the scheduling-contact removal reversal", () => {
    const reversals = detectIntelligenceReversals(
      "Karen is no longer handling scheduling. Amy now coordinates observation scheduling and case dates.",
    );
    expect(reversals.some((r) => r.domain === "scheduling_contact")).toBe(false);
  });

  it("removal without a successor still fires the scheduling-contact reversal", () => {
    const reversals = detectIntelligenceReversals(
      "Karen is no longer handling scheduling for observations — no scheduling contact is identified.",
    );
    expect(reversals.some((r) => r.domain === "scheduling_contact")).toBe(true);
  });

  it("detects approved → not approved", () => {
    const reversals = detectIntelligenceReversals(
      "Observation is no longer approved — the approval was rescinded by the OR manager.",
    );
    const approval = reversals.find((r) => r.domain === "approval_status");
    expect(approval).toBeTruthy();
    expect(approval?.dbKey).toBe("provider_observation_feasibility");
    expect(approval?.negatedValue).toMatch(/not approved/i);
  });

  it("detects allowed → not allowed", () => {
    const reversals = detectIntelligenceReversals(
      "He told me observation is no longer allowed at this facility.",
    );
    const allowance = reversals.find((r) => r.domain === "observation_allowance");
    expect(allowance).toBeTruthy();
    expect(allowance?.dbKey).toBe("provider_observation_feasibility");
    expect(allowance?.negatedValue).toMatch(/not allowed/i);
  });

  it("detects suspension / pause / unavailability phrasing as access reversals", () => {
    const phrases = [
      "Observation access has been temporarily suspended.",
      "They told me observation access is no longer available.",
      "Observations are paused until further notice.",
      "Vendors are not allowed in the OR for now.",
      "We cannot attend cases at this facility right now.",
      "Observation access was revoked by the OR director.",
      "Observation visits are on hold pending a policy review.",
    ];
    for (const phrase of phrases) {
      const reversals = detectIntelligenceReversals(phrase);
      expect(
        reversals.some(
          (r) => r.domain === "observation_allowance" || r.domain === "approval_status",
        ),
        `expected reversal for: ${phrase}`,
      ).toBe(true);
    }
  });

  it("textNegatesObservationAccess overrides historical approval references", () => {
    expect(
      textNegatesObservationAccess(
        "Observation was previously approved. Today the OR manager said observation access is temporarily suspended.",
      ),
    ).toBe(true);
    expect(
      textNegatesObservationAccess("Observation was approved — cleared to observe next week."),
    ).toBe(false);
    expect(
      textNegatesObservationAccess("The product trial was paused. Observation is unaffected."),
    ).toBe(false);
  });

  it("detects identified → not identified for scheduling contact", () => {
    const reversals = detectIntelligenceReversals(
      "Karen is no longer handling scheduling — no scheduling contact is identified right now.",
    );
    const scheduling = reversals.find((r) => r.domain === "scheduling_contact");
    expect(scheduling).toBeTruthy();
    expect(scheduling?.dbKey).toBe("provider_observation_coordinator_contact");
  });

  it("does not false-positive when negation is in a different sentence than the domain", () => {
    const reversals = detectIntelligenceReversals(
      "Credentialing is required before observation. A sales contract is not necessary.",
    );
    expect(reversals.some((r) => r.domain === "credentialing_requirement")).toBe(false);
  });

  it("returns nothing for plain positive notes", () => {
    expect(
      detectIntelligenceReversals(
        "Credentialing is required before observation. Karen handles scheduling.",
      ),
    ).toEqual([]);
  });
});

describe("existingValueContradictsReversal", () => {
  it("required existing record contradicts not-required reversal", () => {
    expect(
      existingValueContradictsReversal(
        "credentialing_requirement",
        "Credentialing must be complete before observation.",
      ),
    ).toBe(true);
  });

  it("approved existing record contradicts not-approved reversal", () => {
    expect(existingValueContradictsReversal("approval_status", "Approved")).toBe(true);
  });

  it("allowed existing record contradicts not-allowed reversal", () => {
    expect(
      existingValueContradictsReversal(
        "observation_allowance",
        "Allowed after credentialing is complete.",
      ),
    ).toBe(true);
  });

  it("identified contact contradicts not-identified reversal", () => {
    expect(
      existingValueContradictsReversal(
        "scheduling_contact",
        "Karen — observation scheduling coordinator",
      ),
    ).toBe(true);
  });

  it("empty or already-negative records do not create conflicts", () => {
    expect(existingValueContradictsReversal("credentialing_requirement", "")).toBe(false);
    expect(
      existingValueContradictsReversal("credentialing_requirement", "Not required — waived."),
    ).toBe(false);
    expect(existingValueContradictsReversal("observation_allowance", "Restricted")).toBe(false);
  });
});

describe("routeLogUpdateToProviderFields — contradiction handling", () => {
  it("validation-failure note produces one negated credentialing update, not two positive facts", () => {
    const updates = routeLogUpdateToProviderFields(VALIDATION_FAILURE_NOTE, {
      provider_observation_credentialing_needed: "Credentialing must be complete before observation.",
    });

    const labels = updates.map((u) => u.label);
    expect(labels).not.toContain("Vendor credentialing on file");
    expect(labels).not.toContain("Credentialing still required");
    expect(labels).not.toContain("Credentialing required before observation");

    const credentialingUpdates = updates.filter(
      (u) =>
        u.dbKey === "provider_observation_credentialing_needed" ||
        u.dbKey === "provider_credentialing_status",
    );
    expect(credentialingUpdates).toHaveLength(1);

    const reversal = credentialingUpdates[0];
    expect(reversal.label).toBe("Credentialing no longer required");
    expect(reversal.proposedValue).toMatch(/not required/i);

    expect(reversal.conflict).toBeTruthy();
    expect(reversal.conflict?.existingValue).toMatch(/must be complete/i);
    expect(reversal.conflict?.newValue).toMatch(/not required/i);
    expect(reversal.conflict?.resolution).toBeNull();
  });

  it("no conflict when there is no existing credentialing record", () => {
    const updates = routeLogUpdateToProviderFields(VALIDATION_FAILURE_NOTE, {});
    const reversal = updates.find(
      (u) => u.dbKey === "provider_observation_credentialing_needed",
    );
    expect(reversal).toBeTruthy();
    expect(reversal?.conflict).toBeNull();
  });

  it("approved → not approved creates a single feasibility conflict", () => {
    const updates = routeLogUpdateToProviderFields(
      "Bad news — observation approval was revoked, he is not approved to host us anymore.",
      { provider_observation_feasibility: "Approved" },
    );

    const feasibility = updates.filter((u) => u.dbKey === "provider_observation_feasibility");
    expect(feasibility).toHaveLength(1);
    expect(feasibility[0].proposedValue).toMatch(/not approved/i);
    expect(feasibility[0].conflict?.existingValue).toBe("Approved");
    expect(feasibility[0].conflict?.resolution).toBeNull();
  });

  it("allowed → not allowed creates a single feasibility conflict", () => {
    const updates = routeLogUpdateToProviderFields(
      "The facility changed policy — observation is no longer allowed for vendors.",
      { provider_observation_feasibility: "Allowed after credentialing is complete." },
    );

    const feasibility = updates.filter((u) => u.dbKey === "provider_observation_feasibility");
    expect(feasibility).toHaveLength(1);
    expect(feasibility[0].proposedValue).toMatch(/not allowed/i);
    expect(feasibility[0].conflict).toBeTruthy();
    expect(feasibility[0].conflict?.resolution).toBeNull();
  });

  it("suspension overrides a historical 'previously approved' reference", () => {
    const updates = routeLogUpdateToProviderFields(
      "Observation was previously approved and we were allowed in cases. Today the OR manager said observation access is temporarily suspended.",
      { provider_observation_feasibility: "Allowed — observation approved." },
    );

    const feasibility = updates.filter((u) => u.dbKey === "provider_observation_feasibility");
    expect(feasibility).toHaveLength(1);
    // Current state, not the historical approval, is what gets proposed.
    expect(feasibility[0].proposedValue).not.toMatch(/^allowed\b/i);
    expect(feasibility[0].proposedValue).toMatch(/not allowed|not approved/i);
    expect(feasibility[0].conflict?.existingValue).toBe("Allowed — observation approved.");
    expect(feasibility[0].conflict?.resolution).toBeNull();
  });

  it("'observations paused' with an approved record creates a replace conflict", () => {
    const updates = routeLogUpdateToProviderFields(
      "Front desk says observations are paused until the new policy review wraps up.",
      { provider_observation_feasibility: "Approved — can observe any Tuesday." },
    );

    const feasibility = updates.filter((u) => u.dbKey === "provider_observation_feasibility");
    expect(feasibility).toHaveLength(1);
    expect(feasibility[0].conflict).toBeTruthy();
    expect(feasibility[0].conflict?.resolution).toBeNull();
  });

  it("identified → not identified creates a single scheduling-contact conflict", () => {
    const updates = routeLogUpdateToProviderFields(
      "Karen is no longer handling scheduling for observations — no scheduling contact is identified.",
      { provider_observation_coordinator_contact: "Karen — observation scheduling coordinator" },
    );

    const scheduling = updates.filter(
      (u) =>
        u.dbKey === "provider_observation_coordinator_contact" ||
        u.dbKey === "provider_scheduling_contact",
    );
    expect(scheduling).toHaveLength(1);
    expect(scheduling[0].proposedValue).toMatch(/no scheduling contact identified/i);
    expect(scheduling[0].conflict?.existingValue).toMatch(/Karen/i);
    expect(scheduling[0].conflict?.resolution).toBeNull();
  });

  it("scheduler replacement preserves the successor's name, role, and evidence in the conflict", () => {
    const note =
      "Karen is no longer handling scheduling. Amy now coordinates observation scheduling and case dates.";
    const updates = routeLogUpdateToProviderFields(note, {
      provider_observation_coordinator_contact: "Karen handles observation scheduling",
    });

    expect(updates.some((u) => /no scheduling contact identified/i.test(u.proposedValue))).toBe(
      false,
    );

    const contact = updates.filter(
      (u) =>
        u.dbKey === "provider_observation_coordinator_contact" ||
        u.dbKey === "provider_scheduling_contact",
    );
    expect(contact.length).toBeGreaterThan(0);
    const replacement = contact.find((u) => /Amy/.test(u.proposedValue));
    expect(replacement).toBeTruthy();
    expect(replacement?.proposedValue).toMatch(/coordinat/i);
    expect(replacement?.proposedValue).toMatch(/Amy now coordinates observation scheduling/i);
    expect(replacement?.proposedValue).not.toMatch(/Previously Karen handled/i);
    expect(replacement?.conflict).toBeTruthy();
    expect(replacement?.conflict?.existingValue).toMatch(/Karen/);
    expect(replacement?.conflict?.newValue).toMatch(/Amy/);
    expect(replacement?.conflict?.resolution).toBeNull();
  });

  it("historical Karen sentence does not become the proposed replacement when Amy succeeds", () => {
    const note =
      "Previously Karen handled observation scheduling. Today Dr. Onion told me Karen is no longer involved. Amy now coordinates all observation scheduling and case dates.";
    const updates = routeLogUpdateToProviderFields(note, {
      provider_observation_coordinator_contact: "Karen handles observation scheduling",
    });
    const replacement = updates.find(
      (u) =>
        (u.dbKey === "provider_observation_coordinator_contact" ||
          u.dbKey === "provider_scheduling_contact") &&
        /Amy/.test(u.proposedValue),
    );
    expect(replacement).toBeTruthy();
    expect(replacement?.proposedValue).not.toMatch(/Previously Karen handled/i);
    expect(replacement?.proposedValue).toMatch(/Amy now coordinates all observation scheduling/i);
  });

  it("positive notes are unaffected by the contradiction pass", () => {
    const updates = routeLogUpdateToProviderFields(
      "Observation is allowed only after credentialing is complete. Karen the scheduler handles observation coordination.",
      {},
    );
    expect(updates.length).toBeGreaterThan(0);
    expect(updates.some((u) => u.id.startsWith("reversal-"))).toBe(false);
  });
});

describe("applyIntelligenceReversalsToFieldUpdates", () => {
  it("strips positive-direction AI updates and substitutes the negated fact", () => {
    const aiUpdates = [
      {
        id: "ai-0",
        label: "Credentialing required",
        dbKey: "provider_observation_credentialing_needed",
        proposedValue: "Credentialing must be complete before observation.",
        accepted: true,
        conflict: null,
        proposedScope: "provider" as const,
        scopeReason: "test",
        proposedDestination: "provider_profile" as never,
        destinationReason: "test",
      },
      {
        id: "ai-1",
        label: "Vendor credentialing on file",
        dbKey: "provider_credentialing_status",
        proposedValue: "Vendor credentialing discussed.",
        accepted: true,
        conflict: null,
        proposedScope: "provider" as const,
        scopeReason: "test",
        proposedDestination: "provider_profile" as never,
        destinationReason: "test",
      },
    ];

    const result = applyIntelligenceReversalsToFieldUpdates(
      VALIDATION_FAILURE_NOTE,
      aiUpdates,
      { provider_observation_credentialing_needed: "required" },
    );

    expect(result.some((u) => u.id === "ai-0")).toBe(false);
    expect(result.some((u) => u.id === "ai-1")).toBe(false);

    const reversal = result.find((u) => u.id === "reversal-credentialing_requirement");
    expect(reversal).toBeTruthy();
    expect(reversal?.conflict?.existingValue).toBe("required");
    expect(reversal?.conflict?.resolution).toBeNull();
  });

  it("is idempotent — applying twice does not duplicate the reversal", () => {
    const once = applyIntelligenceReversalsToFieldUpdates(VALIDATION_FAILURE_NOTE, [], {});
    const twice = applyIntelligenceReversalsToFieldUpdates(VALIDATION_FAILURE_NOTE, once, {});
    expect(twice).toHaveLength(once.length);
  });

  it("returns input unchanged when no reversal language is present", () => {
    const updates = [
      {
        id: "ai-0",
        label: "Credentialing required",
        dbKey: "provider_observation_credentialing_needed",
        proposedValue: "Credentialing must be complete before observation.",
        accepted: true,
        conflict: null,
        proposedScope: "provider" as const,
        scopeReason: "test",
        proposedDestination: "provider_profile" as never,
        destinationReason: "test",
      },
    ];
    const result = applyIntelligenceReversalsToFieldUpdates(
      "Credentialing is required before observation.",
      updates,
      {},
    );
    expect(result).toBe(updates);
  });
});
