import { describe, expect, it } from "vitest";
import { persistOptionalIntelligence } from "./persistOptionalIntelligence";

describe("persistOptionalIntelligence", () => {
  it("rejects support contacts category because contacts must be structured records", async () => {
    await expect(
      persistOptionalIntelligence({
        providerId: "prov-1",
        categoryId: "staff_contacts",
        value: "Karen Smith scheduler",
      }),
    ).rejects.toThrow(/support contact workflow/i);
  });
});
