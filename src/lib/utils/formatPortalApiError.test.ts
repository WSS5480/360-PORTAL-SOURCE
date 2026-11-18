import { describe, expect, it } from "vitest";
import { formatPortalApiError } from "./formatPortalApiError";

describe("formatPortalApiError", () => {
  it("returns string errors as-is", () => {
    expect(formatPortalApiError("Provider required")).toBe("Provider required");
  });

  it("flattens Zod-style error objects", () => {
    expect(
      formatPortalApiError({
        formErrors: ["Unrecognized key(s) in object: 'scheduled_date'"],
        fieldErrors: {},
      }),
    ).toBe("Unrecognized key(s) in object: 'scheduled_date'");
  });

  it("falls back when error is empty", () => {
    expect(formatPortalApiError({}, "Update failed")).toBe("Update failed");
  });
});
