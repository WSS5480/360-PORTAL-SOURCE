import { describe, expect, it } from "vitest";
import { userFacingError } from "./userFacingError";

describe("userFacingError", () => {
  it("rewrites terse API statuses into actionable copy", () => {
    expect(userFacingError("Not found")).toBe("This record is no longer available.");
    expect(userFacingError("Forbidden")).toBe("You do not have access to this record.");
    expect(userFacingError("Unauthorized")).toBe("Your session expired. Sign in again to continue.");
    expect(userFacingError("Invalid engagement id")).toContain("not valid");
  });

  it("replaces engineering output with the fallback", () => {
    const fallback = "We could not load this page.";
    expect(userFacingError("account_manager_id is null", fallback)).toBe(fallback);
    expect(userFacingError("TypeError: x is not a function", fallback)).toBe(fallback);
    expect(userFacingError('relation "sales_opportunities" does not exist', fallback)).toBe(fallback);
    expect(userFacingError("new row violates row-level security policy", fallback)).toBe(fallback);
    expect(userFacingError("HTTP 500", fallback)).toBe(fallback);
    expect(userFacingError("fetch failed for 3f2a9c1e-7b4d-4a11-9c02-8de5f1a2b3c4", fallback)).toBe(fallback);
    expect(userFacingError({ code: 42 }, fallback)).toBe(fallback);
    expect(userFacingError("", fallback)).toBe(fallback);
  });

  it("passes through copy already written for users", () => {
    const message = "Choose delete or restore, not both.";
    expect(userFacingError(message)).toBe(message);
    expect(userFacingError("Please include a bit more detail in your message.")).toBe(
      "Please include a bit more detail in your message.",
    );
  });
});
