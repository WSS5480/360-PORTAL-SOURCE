import { describe, expect, it } from "vitest";

import {
  buildContextualProviderQuickActions,
  enrichOpenQuestionWithPathwayAction,
  resolvePathwayActionForAccessStep,
  resolvePathwayActionForOpenQuestionId,
} from "./providerPathwayExecutionRouting";

const DR_APPLE_CONTACT = {
  provider_observation_feasibility: "approved",
  provider_observation_credentialing_needed: "required",
  provider_credentialing_status: "Vendor credentialing required before OR access",
  provider_observation_coordinator_contact: "Karen — contact info missing",
  provider_intelligence_field_metadata: {
    provider_observation_feasibility: {
      lifecycle_state: "validated",
      validated_at: "2026-06-01T12:00:00Z",
    },
  },
};

describe("providerPathwayExecutionRouting", () => {
  it("hides Update Permission when observation approval is confirmed", () => {
    const actions = buildContextualProviderQuickActions({
      intelligenceHref: "/portal/sales/providers/p1?tab=intelligence",
      newEngagementHref: "/eng/new",
      providerId: "p1",
      contact: DR_APPLE_CONTACT,
    });

    expect(actions.some((a) => /update permission/i.test(a.label))).toBe(false);
  });

  it("shows Add Observation Case when approval is confirmed and no observation is scheduled", () => {
    const actions = buildContextualProviderQuickActions({
      intelligenceHref: "/portal/sales/providers/p1?tab=intelligence",
      newEngagementHref: "/eng/new",
      providerId: "p1",
      contact: DR_APPLE_CONTACT,
    });

    expect(actions.some((a) => a.label === "Add Observation Case")).toBe(true);
    expect(actions.find((a) => a.label === "Add Observation Case")?.href).toMatch(/case_type=observation/);
  });

  it("shows scheduler and credentialing quick actions for Dr. Apple state", () => {
    const actions = buildContextualProviderQuickActions({
      intelligenceHref: "/portal/sales/providers/p1?tab=intelligence",
      newEngagementHref: "/eng/new",
      providerId: "p1",
      contact: DR_APPLE_CONTACT,
    });
    const labels = actions.map((a) => a.label);

    expect(labels).toContain("Field note");
    expect(labels).toContain("Add support contact");
    expect(labels).toContain("Add Observation Case");
    expect(labels).toContain("Update Scheduler Contact");
    expect(labels).toContain("Add Credentialing Note");
  });

  it("routes credentialing gap to credentialing focused modal", () => {
    const action = resolvePathwayActionForOpenQuestionId("gap-credentialing-path", {
      providerId: "p1",
    });
    expect(action).toEqual({ kind: "focusedModal", modal: "credentialing" });
  });

  it("routes first observation gap to Add Observation Case href", () => {
    const action = resolvePathwayActionForOpenQuestionId("gap-first-observation", {
      providerId: "p1",
      accountId: "acct-1",
    });
    expect(action?.kind).toBe("href");
    if (action?.kind === "href") {
      expect(action.href).toMatch(/case_type=observation/);
      expect(action.label).toBe("Add Observation Case");
    }
  });

  it("routes scheduler contact gap to scheduler focused modal", () => {
    const action = resolvePathwayActionForOpenQuestionId("gap-scheduler-contact", {
      providerId: "p1",
    });
    expect(action).toEqual({ kind: "focusedModal", modal: "scheduler" });
  });

  it("does not route generic case/date question ids to anything useful (legacy guard)", () => {
    expect(
      resolvePathwayActionForOpenQuestionId("learn-case", { providerId: "p1" })?.kind,
    ).toBe("href");
  });

  it("routes incomplete credentialing access step to credentialing drawer", () => {
    const action = resolvePathwayActionForAccessStep("credentialing", "partial", {
      providerId: "p1",
    });
    expect(action).toEqual({ kind: "focusedModal", modal: "credentialing" });
  });

  it("routes incomplete observation scheduled step to Add Observation Case", () => {
    const action = resolvePathwayActionForAccessStep("scheduled", "missing", {
      providerId: "p1",
    });
    expect(action?.kind).toBe("href");
  });

  it("routes provider pain gap to quick note instead of mapping", () => {
    const action = resolvePathwayActionForOpenQuestionId("gap-provider-pain", {
      providerId: "p1",
    });
    expect(action).toEqual({
      kind: "quickNote",
      categoryId: "clinical_challenges",
      label: "Add provider pain points",
      hint: "Dictate or type what you heard — we route it to clinical challenges when you save.",
    });
  });

  it("routes product confirmation gap to quick note on commercial landscape", () => {
    const action = resolvePathwayActionForOpenQuestionId("gap-product-confirmation", {
      providerId: "p1",
    });
    expect(action).toEqual({
      kind: "quickNote",
      categoryId: "opportunity_signals",
      label: "Confirm product use",
      hint: "What products are in use or competing — we route it to commercial landscape when you save.",
    });
  });

  it("routes field-specific learning gaps to quick note", () => {
    const action = resolvePathwayActionForOpenQuestionId("gap-provider_procedure_focus", {
      providerId: "p1",
    });
    expect(action).toEqual({
      kind: "quickNote",
      categoryId: "clinical_focus",
      label: "Add note",
    });
  });

  it("enriches Karen scheduler gap with scheduler modal action", () => {
    const card = enrichOpenQuestionWithPathwayAction(
      {
        id: "gap-scheduler-contact",
        text: "Karen contact information unknown",
        description: "Scheduler was referenced, but contact details are incomplete.",
        actionLabel: "Update Scheduler Contact",
      },
      { providerId: "p1" },
    );
    expect(card.action).toEqual({ kind: "focusedModal", modal: "scheduler" });
  });
});
