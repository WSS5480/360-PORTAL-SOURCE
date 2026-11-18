import { describe, expect, it } from "vitest";

import {
  CASE_INTELLIGENCE_LOGISTICS_DB_KEYS,
  isCaseIntelligenceDbKey,
} from "./caseIntelligenceFields";
import { intelligenceScopeForDbKey } from "./intelligenceScopeModel";

describe("caseIntelligenceFields", () => {
  it("registers logistics keys as case scope", () => {
    for (const key of CASE_INTELLIGENCE_LOGISTICS_DB_KEYS) {
      expect(isCaseIntelligenceDbKey(key)).toBe(true);
      expect(intelligenceScopeForDbKey(key)).toBe("case");
    }
  });

  it("includes observation workflow keys as case scope", () => {
    expect(intelligenceScopeForDbKey("live_observation_workflow")).toBe("case");
    expect(intelligenceScopeForDbKey("debrief_key_findings")).toBe("case");
  });
});
