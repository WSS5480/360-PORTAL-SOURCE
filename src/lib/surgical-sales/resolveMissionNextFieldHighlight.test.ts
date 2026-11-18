import { describe, expect, it } from "vitest";
import {
  missionNextFieldLabelClass,
  resolveMissionNextFieldHighlight,
} from "@/lib/surgical-sales/resolveMissionNextFieldHighlight";

describe("resolveMissionNextFieldHighlight", () => {
  it("maps observation next actions to form fields", () => {
    expect(resolveMissionNextFieldHighlight("Confirm scheduling owner.")).toBe("scheduling_owner");
    expect(resolveMissionNextFieldHighlight("Confirm observation access pathway.")).toBe("access_pathway");
    expect(resolveMissionNextFieldHighlight("Verify credentialing requirements.")).toBe(
      "credentialing_requirement",
    );
    expect(resolveMissionNextFieldHighlight("Add observation objective.")).toBe("observation_goal");
  });

  it("returns null for unrelated next actions", () => {
    expect(resolveMissionNextFieldHighlight("Save observation case.")).toBeNull();
    expect(resolveMissionNextFieldHighlight("Select a provider for this observation case.")).toBeNull();
  });

  it("returns highlight class only when active", () => {
    expect(missionNextFieldLabelClass(true)).toBe("new-case-field-label new-case-field-label--next");
    expect(missionNextFieldLabelClass(false)).toBeUndefined();
  });
});
