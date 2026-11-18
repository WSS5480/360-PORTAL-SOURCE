import { describe, expect, it } from "vitest";
import {
  formatObservationCaseOperationalContext,
  isObservationOverviewPlaceholderValue,
  observationCaseReadinessLabel,
  observationWorkflowRepStatus,
} from "./observationCaseDetailVocabulary";

import { buildCaseOperationalContextView } from "./buildCaseOperationalContextView";

describe("observationCaseDetailVocabulary", () => {
  it("maps readiness states to rep-friendly labels", () => {
    expect(observationCaseReadinessLabel("early")).toBe("Needs confirmation");
    expect(observationCaseReadinessLabel("developing")).toBe("Partial");
    expect(observationCaseReadinessLabel("strong")).toBe("Known");
    expect(observationCaseReadinessLabel("validated")).toBe("Ready");
  });

  it("maps workflow stage status to rep-friendly labels", () => {
    expect(observationWorkflowRepStatus("Not started")).toBe("Not yet observed in the field");
    expect(observationWorkflowRepStatus("In progress")).toBe("Needs confirmation");
    expect(observationWorkflowRepStatus("Completed")).toBe("Known");
  });

  it("formats operational context for observation briefs", () => {
    const view = formatObservationCaseOperationalContext(
      buildCaseOperationalContextView({
        caseRow: {
          case_implants_on_site: "yes|On site",
          case_trays_sterilization_status: "",
        },
        surgeonContact: {
          provider_procedure_focus: "hernia|Hernia focus",
        },
        organizationName: "Metro General",
      }),
    );

    expect(view.readinessLabel).not.toBe("Visibility developing");
    expect(view.readinessLabel).not.toBe("Workflow mostly mapped");
    expect(view.dimensions.map((dimension) => dimension.id)).toEqual([
      "facility_logistics",
      "provider_preferences",
    ]);
    expect(view.caseDay.items).toHaveLength(0);
    expect(view.dimensions.every((dimension) => !dimension.line.includes("Still open"))).toBe(true);
    expect(view.readinessLabel).toBe("Partial");
  });

  it("drops uncaptured facility and provider checklist rows from the brief", () => {
    const base = buildCaseOperationalContextView({
      caseRow: { case_implants_on_site: "yes|On site" },
      surgeonContact: { provider_procedure_focus: "hernia|Hernia focus" },
      organizationName: "Metro General",
    });

    const view = formatObservationCaseOperationalContext({
      ...base,
      facility: {
        ...base.facility,
        items: [
          ...base.facility.items,
          {
            id: "or_access_rules",
            label: "OR access",
            value: "Still open for this case",
            scope: "facility",
          },
        ],
      },
      provider: {
        ...base.provider,
        items: [
          {
            id: "provider_support_expectations",
            label: "In-room support expectations",
            value: "Not captured yet",
            scope: "provider",
          },
        ],
      },
    });

    expect(view.facility.items.every((item) => item.value !== "Still open for this case")).toBe(true);
    expect(view.facility.items.every((item) => item.value !== "Not captured yet")).toBe(true);
    expect(view.provider.items).toHaveLength(0);
    expect(isObservationOverviewPlaceholderValue("Not captured yet")).toBe(true);
    expect(isObservationOverviewPlaceholderValue("Still open for this case")).toBe(true);
  });
});
