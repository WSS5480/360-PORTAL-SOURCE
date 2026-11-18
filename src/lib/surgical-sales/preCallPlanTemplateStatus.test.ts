import { describe, expect, it } from "vitest";
import {
  isPlaybookVisibleToReps,
  normalizePreCallPlanTemplateStatus,
} from "./preCallPlanTemplateStatus";

describe("preCallPlanTemplateStatus", () => {
  it("defaults unknown values to active", () => {
    expect(normalizePreCallPlanTemplateStatus(null)).toBe("active");
    expect(normalizePreCallPlanTemplateStatus("")).toBe("active");
  });

  it("tracks rep visibility", () => {
    expect(isPlaybookVisibleToReps("active")).toBe(true);
    expect(isPlaybookVisibleToReps("inactive")).toBe(false);
    expect(isPlaybookVisibleToReps("archived")).toBe(false);
  });
});
