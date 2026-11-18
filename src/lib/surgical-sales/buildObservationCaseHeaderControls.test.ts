import { describe, expect, it } from "vitest";
import {
  observationHeaderMoreActions,
  observationHeaderPrimaryAction,
  observationToProductSupportCasePatch,
} from "./buildObservationCaseHeaderControls";

describe("buildObservationCaseHeaderControls", () => {
  it("maps primary header actions by execution status", () => {
    expect(observationHeaderPrimaryAction("scheduled")).toBe("start_observation");
    expect(observationHeaderPrimaryAction("in_progress")).toBe("complete_observation");
    expect(observationHeaderPrimaryAction("completed")).toBe("view_intelligence");
    expect(observationHeaderPrimaryAction("debrief_planned")).toBe("view_intelligence");
    expect(observationHeaderPrimaryAction("rescheduled")).toBe("update_datetime");
    expect(observationHeaderPrimaryAction("cancelled")).toBe("reopen_observation");
    expect(
      observationHeaderPrimaryAction("scheduled", { caseDate: "2026-08-17", todayYmd: "2026-08-18" }),
    ).toBe("mark_completed");
  });

  it("maps more-menu actions by execution status", () => {
    expect(observationHeaderMoreActions("scheduled")).toEqual([
      "mark_completed",
      "reschedule",
      "cancel_observation",
      "convert_to_product_support",
    ]);
    expect(observationHeaderMoreActions("in_progress")).toEqual([
      "reschedule",
      "cancel_observation",
      "convert_to_product_support",
    ]);
    expect(observationHeaderMoreActions("completed")).toEqual(["reopen_observation", "convert_to_product_support"]);
    expect(observationHeaderMoreActions("rescheduled")).toEqual([
      "start_observation",
      "cancel_observation",
      "convert_to_product_support",
    ]);
    expect(observationHeaderMoreActions("cancelled")).toEqual(["archive_case"]);
    expect(
      observationHeaderMoreActions("scheduled", { caseDate: "2026-08-17", todayYmd: "2026-08-18" }),
    ).toEqual(["start_observation", "reschedule", "cancel_observation", "convert_to_product_support"]);
  });

  it("builds a product-support conversion patch", () => {
    expect(observationToProductSupportCasePatch()).toEqual({
      case_type: "product_support",
      debrief_convert_to_product_support_case: true,
    });
  });
});
