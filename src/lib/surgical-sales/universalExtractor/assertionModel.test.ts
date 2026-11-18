import { describe, expect, it } from "vitest";

import { resolveDebriefValidationAssertion } from "./assertionModel";
import {
  DEBRIEF_VALIDATION_CONFIRM_SIZING_NOTE,
  DEBRIEF_VALIDATION_REJECT_SIZING_NOTE,
} from "./universalDeclaredSourceTypes";

describe("resolveDebriefValidationAssertion", () => {
  it("returns validated for confirmed recurring sizing language", () => {
    expect(resolveDebriefValidationAssertion(DEBRIEF_VALIDATION_CONFIRM_SIZING_NOTE)).toBe("validated");
  });

  it("returns rejected for negated recurring sizing language", () => {
    expect(resolveDebriefValidationAssertion(DEBRIEF_VALIDATION_REJECT_SIZING_NOTE)).toBe("rejected");
  });
});
