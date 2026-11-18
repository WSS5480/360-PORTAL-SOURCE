import { describe, expect, it } from "vitest";
import { containsInitiativeWording, OPPORTUNITY_UI } from "@/lib/sales/opportunityUiLabels";

const NEW_CASE_COPY_KEYS = [
  "newCaseLinkedInitiativeOptional",
  "newCaseNoLinkedInitiative",
  "newCaseShowingInitiativesForOrg",
  "newCaseIncludesInitiativesForProvider",
  "newCaseLockedInitiativeLabel",
  "newCaseLockedInitiativeHint",
  "newCaseLoadingInitiative",
  "newCaseLockedOrgFromInitiative",
  "newCaseProviderPanelIntro",
] as const;

describe("OPPORTUNITY_UI new case copy", () => {
  it("avoids legacy initiative wording on new surgical case strings", () => {
    for (const key of NEW_CASE_COPY_KEYS) {
      const value = OPPORTUNITY_UI[key];
      expect(containsInitiativeWording(value), `OPPORTUNITY_UI.${key} = "${value}"`).toBe(false);
      expect(value.toLowerCase()).toMatch(
        /evaluat(?:e|ion)|provider|product fit|prospect|related opportunity|related opportunit/,
      );
    }
  });
});
