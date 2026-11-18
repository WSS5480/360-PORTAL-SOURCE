import { describe, expect, it } from "vitest";
import {
  asProviderId,
  isSameProviderAndContactId,
  mergeLegacyContactOrganizationIds,
  readCaseProviderId,
} from "@/lib/surgical-sales/crmEntityRelationships";
import { mapLegacyProviderErrorMessage } from "@/lib/surgical-sales/crmEntityLabels";

describe("crmEntityRelationships", () => {
  const sampleUuid = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";

  it("maps provider and contact ids as the same uuid", () => {
    expect(asProviderId(sampleUuid)).toBe(sampleUuid);
    expect(isSameProviderAndContactId(sampleUuid, sampleUuid)).toBe(true);
    expect(asProviderId("")).toBeNull();
    expect(asProviderId("not-a-uuid")).toBeNull();
  });

  it("reads case provider from surgeon_contact_id", () => {
    expect(readCaseProviderId({ surgeon_contact_id: sampleUuid })).toBe(sampleUuid);
    expect(readCaseProviderId({ surgeon_contact_id: null })).toBeNull();
  });

  it("merges legacy contact org columns with junction ids", () => {
    const junction = new Set(["11111111-1111-4111-8111-111111111111"]);
    const merged = mergeLegacyContactOrganizationIds(
      { account_id: "22222222-2222-4222-8222-222222222222", organization_id: null },
      junction,
    );
    expect(merged.has("11111111-1111-4111-8111-111111111111")).toBe(true);
    expect(merged.has("22222222-2222-4222-8222-222222222222")).toBe(true);
  });

  it("maps legacy surgeon error copy to provider", () => {
    expect(mapLegacyProviderErrorMessage("Surgeon contact must belong to the selected account")).toBe(
      "Provider must belong to the selected account",
    );
  });
});
