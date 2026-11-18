import { describe, expect, it, beforeEach } from "vitest";
import {
  ADD_PROVIDER_DRAFT_STORAGE_KEY,
  addProviderDraftHasContent,
  clearAddProviderDraft,
  readAddProviderDraft,
  writeAddProviderDraft,
  type AddProviderDraft,
} from "./addProviderDraftStorage";

const sample: AddProviderDraft = {
  version: 1,
  savedAt: new Date().toISOString(),
  step: "basics",
  firstName: "Alex",
  lastName: "Lee",
  title: "",
  roleType: "surgeon",
  onboardingRelationship: "early_discovery",
  providerCrmStatus: "prospect",
  email: "",
  phone: "",
  mobilePhone: "",
  specialty: "Orthopedic spine",
  primaryOrgId: "",
  extraOrgIds: [],
};

describe("addProviderDraftStorage", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("writes and reads draft", () => {
    writeAddProviderDraft(sample);
    const restored = readAddProviderDraft();
    expect(restored?.firstName).toBe("Alex");
    expect(restored?.specialty).toBe("Orthopedic spine");
  });

  it("clears draft", () => {
    writeAddProviderDraft(sample);
    clearAddProviderDraft();
    expect(sessionStorage.getItem(ADD_PROVIDER_DRAFT_STORAGE_KEY)).toBeNull();
  });

  it("detects meaningful content", () => {
    expect(addProviderDraftHasContent(sample)).toBe(true);
    expect(
      addProviderDraftHasContent({
        ...sample,
        firstName: "",
        lastName: "",
        specialty: "",
        email: "",
        phone: "",
        mobilePhone: "",
      }),
    ).toBe(false);
  });
});
