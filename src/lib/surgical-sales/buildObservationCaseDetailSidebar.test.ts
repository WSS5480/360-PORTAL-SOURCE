import { describe, expect, it } from "vitest";
import { buildObservationProductsObserved } from "./buildObservationCaseDetailSidebar";
import { isObservationReadyForDebrief } from "./buildCaseIdentity";

describe("buildObservationProductsObserved", () => {
  it("collects competitor and line product labels", () => {
    const items = buildObservationProductsObserved(
      {
        live_observation_competitors: "Competitor tray on field",
        live_observation_product_fit: "Possible ACSIS fit",
      },
      ["Endolumik demo kit"],
    );

    expect(items).toContain("Competitor tray on field");
    expect(items).toContain("Possible ACSIS fit");
    expect(items).toContain("Endolumik demo kit");
  });
});

describe("isObservationReadyForDebrief", () => {
  it("returns false before five completed observations", () => {
    expect(
      isObservationReadyForDebrief({
        caseRow: { surgeon_contact_id: "provider-1", status: "completed" },
        providerContact: { observation_count: 2 },
      }),
    ).toBe(false);
  });

  it("returns true after five completed observations", () => {
    expect(
      isObservationReadyForDebrief({
        caseRow: { surgeon_contact_id: "provider-1", status: "completed" },
        providerContact: { observation_count: 5 },
      }),
    ).toBe(true);
  });
});
