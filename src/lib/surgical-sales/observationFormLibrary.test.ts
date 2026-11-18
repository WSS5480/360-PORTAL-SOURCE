import { describe, expect, it } from "vitest";
import {
  buildObservationFormLibraryView,
  canViewObservationForm,
  canViewTeamObservationForms,
  filterObservationFormLibraryItems,
  type ObservationFormLibraryItem,
} from "./observationFormLibrary";

function form(partial: Partial<ObservationFormLibraryItem> & { id: string }): ObservationFormLibraryItem {
  return {
    fileName: `${partial.id}.pdf`,
    createdAt: "2026-10-06T12:00:00.000Z",
    caseId: "case-1",
    caseNumber: "OBS-1",
    caseDate: "2026-10-06",
    caseHref: "/portal/sales/cases/case-1",
    providerName: "Dr. Salt",
    facilityName: "Pilot Hospital",
    uploadedBy: "rep-1",
    uploaderName: "Preston",
    ...partial,
  };
}

describe("observation form access", () => {
  it("lets a rep see only their own form", () => {
    expect(
      canViewObservationForm({ isTerritoryManager: false, viewerId: "rep-1", uploadedBy: "rep-1" }),
    ).toBe(true);
    expect(
      canViewObservationForm({ isTerritoryManager: false, viewerId: "rep-1", uploadedBy: "rep-2" }),
    ).toBe(false);
  });

  it("lets a territory manager see every form", () => {
    expect(canViewTeamObservationForms({ isTerritoryManager: true })).toBe(true);
    expect(
      canViewObservationForm({ isTerritoryManager: true, viewerId: "tm-1", uploadedBy: "rep-2" }),
    ).toBe(true);
  });
});

describe("observation form library", () => {
  it("groups a rep's forms by month", () => {
    const view = buildObservationFormLibraryView({
      canViewTeam: false,
      items: [
        form({ id: "a", createdAt: "2026-10-02T10:00:00.000Z" }),
        form({ id: "b", createdAt: "2026-09-18T10:00:00.000Z" }),
        form({ id: "c", createdAt: "2026-10-06T10:00:00.000Z" }),
      ],
    });
    expect(view.groups.map((g) => g.title)).toEqual(["October 2026", "September 2026"]);
    expect(view.groups[0]?.forms.map((f) => f.id)).toEqual(["c", "a"]);
  });

  it("groups team forms by rep for territory managers", () => {
    const view = buildObservationFormLibraryView({
      canViewTeam: true,
      items: [
        form({ id: "p", uploadedBy: "rep-2", uploaderName: "Preston" }),
        form({ id: "a", uploadedBy: "rep-1", uploaderName: "Alex" }),
        form({ id: "p2", uploadedBy: "rep-2", uploaderName: "Preston", createdAt: "2026-10-01T10:00:00.000Z" }),
      ],
    });
    expect(view.groups.map((g) => g.title)).toEqual(["Alex", "Preston"]);
    expect(view.groups[1]?.forms.map((f) => f.id)).toEqual(["p", "p2"]);
  });

  it("filters across provider, file, and rep", () => {
    const items = [
      form({ id: "1", fileName: "salt-form.pdf", providerName: "Dr. Salt" }),
      form({ id: "2", fileName: "apple.pdf", providerName: "John Apple", uploaderName: "Maya" }),
    ];
    expect(filterObservationFormLibraryItems(items, "salt").map((f) => f.id)).toEqual(["1"]);
    expect(filterObservationFormLibraryItems(items, "maya").map((f) => f.id)).toEqual(["2"]);
  });
});
