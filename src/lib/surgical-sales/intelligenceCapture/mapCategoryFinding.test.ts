import { describe, expect, it } from "vitest";
import { mapCategoryFinding } from "@/lib/surgical-sales/intelligenceCapture/mapCategoryFinding";

describe("mapCategoryFinding", () => {
  it("maps observation access interest without exposing internal labels to confirmation", () => {
    const mapped = mapCategoryFinding({
      categoryId: "observation_access",
      finding: "Provider said observation should not be a problem.",
    });
    expect(mapped).toBeTruthy();
    expect(mapped?.confirmationMessage).toMatch(/interest|saved/i);
    expect(mapped?.confirmationMessage).not.toMatch(/provider_observation_feasibility/i);
    expect(mapped?.fieldPatches.some((p) => p.dbKey === "provider_observation_feasibility")).toBe(
      true,
    );
    expect(mapped?.fieldEvidence.provider_observation_feasibility).toBe(
      "Provider said observation should not be a problem.",
    );
    expect(mapped?.followUpRequired).toBe(true);
  });

  it("maps explicit observation approval with a stronger confirmation", () => {
    const mapped = mapCategoryFinding({
      categoryId: "observation_access",
      finding: "Observation was approved for next month.",
    });
    expect(mapped?.confirmationMessage).toMatch(/approved/i);
    expect(mapped?.followUpRequired).toBe(false);
    expect(mapped?.fieldPatches[0]?.value).toMatch(/Observation approval: Yes/i);
  });

  it("routes scheduling findings to access pathway fields", () => {
    const mapped = mapCategoryFinding({
      categoryId: "access_pathway",
      finding: "Karen in the office handles all observation scheduling.",
    });
    expect(
      mapped?.fieldPatches.some((p) =>
        [
          "provider_scheduling_contact",
          "provider_observation_scheduling_control",
          "provider_observation_coordinator_contact",
        ].includes(p.dbKey),
      ),
    ).toBe(true);
    expect(mapped?.confirmationMessage).not.toMatch(/dbKey|signal/i);
  });

  it("maps procedure workflow findings to workflow fields after observation", () => {
    const mapped = mapCategoryFinding({
      categoryId: "procedure_workflow",
      finding: "Turnover between cases is slow — staff waiting on room setup.",
    });
    expect(
      mapped?.fieldPatches.some((p) => p.dbKey === "provider_workflow_pain_points"),
    ).toBe(true);
    expect(mapped?.confirmationMessage).toMatch(/saved/i);
    expect(mapped?.confirmationMessage).not.toMatch(/provider_workflow/i);
  });

  it("stores rep evidence without returning internal mapping keys in confirmation", () => {
    const mapped = mapCategoryFinding({
      categoryId: "clinical_focus",
      finding: "Mostly complex abdominal wall cases with increasing robotic volume.",
    });
    expect(mapped?.fieldEvidence).toBeTruthy();
    expect(Object.values(mapped?.fieldEvidence ?? {})[0]).toContain("abdominal wall");
    expect(mapped?.confirmationMessage).toMatch(/saved/i);
  });
});
