import { describe, expect, it } from "vitest";
import {
  actualRevenueToPersistOnComplete,
  isCaseDateInThePast,
  resolveNewCaseFinalSaveStatus,
  resolvedActualQuantityForCompletedLine,
  resolvedBookedRevenueForCase,
} from "./casePerformedStatus";

describe("isCaseDateInThePast", () => {
  it("treats yesterday as past", () => {
    expect(isCaseDateInThePast("2026-08-17", "2026-08-18")).toBe(true);
  });

  it("treats today and future dates as not past", () => {
    expect(isCaseDateInThePast("2026-08-18", "2026-08-18")).toBe(false);
    expect(isCaseDateInThePast("2026-08-19", "2026-08-18")).toBe(false);
  });

  it("ignores empty or invalid dates", () => {
    expect(isCaseDateInThePast("", "2026-08-18")).toBe(false);
    expect(isCaseDateInThePast(null, "2026-08-18")).toBe(false);
  });
});

describe("resolveNewCaseFinalSaveStatus", () => {
  it("saves past cases as completed", () => {
    expect(resolveNewCaseFinalSaveStatus("2026-08-17", "2026-08-18")).toBe("completed");
  });

  it("keeps today and future cases scheduled", () => {
    expect(resolveNewCaseFinalSaveStatus("2026-08-18", "2026-08-18")).toBe("scheduled");
    expect(resolveNewCaseFinalSaveStatus("2026-08-20", "2026-08-18")).toBe("scheduled");
  });
});

describe("resolvedActualQuantityForCompletedLine", () => {
  it("keeps an entered actual quantity", () => {
    expect(resolvedActualQuantityForCompletedLine(2, 1)).toBe(1);
  });

  it("copies expected quantity when actual is missing", () => {
    expect(resolvedActualQuantityForCompletedLine(3, null)).toBe(3);
    expect(resolvedActualQuantityForCompletedLine(3, undefined)).toBe(3);
  });
});

describe("resolvedBookedRevenueForCase", () => {
  it("prefers actual when entered", () => {
    expect(resolvedBookedRevenueForCase(4500, 4200)).toBe(4200);
  });

  it("uses expected when actual is blank", () => {
    expect(resolvedBookedRevenueForCase(4500, null)).toBe(4500);
    expect(resolvedBookedRevenueForCase(4500, undefined)).toBe(4500);
  });
});

describe("actualRevenueToPersistOnComplete", () => {
  it("keeps an entered actual", () => {
    expect(actualRevenueToPersistOnComplete(4500, 4100)).toBe(4100);
  });

  it("copies expected into actual when actual is missing", () => {
    expect(actualRevenueToPersistOnComplete(4500, null)).toBe(4500);
  });

  it("does not write zero as a stand-in actual", () => {
    expect(actualRevenueToPersistOnComplete(0, null)).toBeNull();
  });
});
