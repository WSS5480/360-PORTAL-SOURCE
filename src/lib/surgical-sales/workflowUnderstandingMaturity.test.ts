import { describe, expect, it } from "vitest";
import {
  formatWorkflowMaturityPersistValue,
  inferWorkflowMaturityFromText,
  normalizeWorkflowMaturityChoice,
  resolveWorkflowMaturityFromContact,
  resolveWorkflowVisibilityStatus,
  suggestWorkflowMaturityFromEngagementContext,
  workflowMaturityLabel,
} from "@/lib/surgical-sales/workflowUnderstandingMaturity";
import { DISCOVERY_FIELD_STATUS } from "@/lib/surgical-sales/discoveryIntelligenceSignalStatus";

const F = DISCOVERY_FIELD_STATUS;

describe("workflowUnderstandingMaturity", () => {
  it("normalizes legacy observation choices", () => {
    expect(normalizeWorkflowMaturityChoice("fully_observed")).toBe("observed_in_field");
    expect(normalizeWorkflowMaturityChoice("partially_observed")).toBe("partially_understood");
    expect(normalizeWorkflowMaturityChoice("not_observed")).toBe("unknown");
  });

  it("infers maturity from debrief phrases", () => {
    expect(inferWorkflowMaturityFromText("We discussed their hernia flow")).toBe("discussed_only");
    expect(inferWorkflowMaturityFromText("I saw the OR setup and tray prep")).toBe("observed_in_field");
    expect(
      inferWorkflowMaturityFromText("We now fully understand their workflow and product fit"),
    ).toBe("fully_validated");
  });

  it("parses stored maturity tokens on contact fields", () => {
    const contact = {
      provider_procedure_focus: "partially_understood|Some workflow visibility — lap focus",
    };
    expect(resolveWorkflowMaturityFromContact(contact)).toBe("partially_understood");
    expect(resolveWorkflowVisibilityStatus(contact)).toBe(F.captured);
  });

  it("formats persist values with maturity prefix", () => {
    expect(formatWorkflowMaturityPersistValue("discussed_only", "Hernia flow on intro")).toMatch(
      /^discussed_only\|/,
    );
  });

  it("suggests maturity from engagement context", () => {
    expect(
      suggestWorkflowMaturityFromEngagementContext({
        engagementType: "observation",
        engagementStatus: "completed",
        narrative: "Debrief after OR observation",
      })?.suggested,
    ).toBe("observed_in_field");

    expect(
      suggestWorkflowMaturityFromEngagementContext({
        engagementType: "product_case",
        narrative: "Successful case completed",
      })?.suggested,
    ).toBe("fully_validated");

    expect(
      suggestWorkflowMaturityFromEngagementContext({
        engagementType: "intro_call",
        narrative: "We discussed their workflow",
      })?.suggested,
    ).toBe("discussed_only");
  });

  it("exposes human labels for maturity values", () => {
    expect(workflowMaturityLabel("fully_validated")).toBe("Fully validated");
  });
});
