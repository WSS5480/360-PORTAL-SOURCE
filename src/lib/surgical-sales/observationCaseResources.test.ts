import { describe, expect, it } from "vitest";
import {
  buildObservationResourcesView,
  OBSERVATION_RESOURCES_EMPTY_MESSAGE,
  observationCasePhotosAllowed,
} from "./observationCaseResources";

describe("observationCaseResources", () => {
  it("exposes the empty-state copy", () => {
    expect(OBSERVATION_RESOURCES_EMPTY_MESSAGE).toBe("No resources uploaded for this case yet.");
  });

  it("returns an empty view when no documents exist", () => {
    const view = buildObservationResourcesView([]);
    expect(view.hasContent).toBe(false);
    expect(view.categories).toHaveLength(0);
    expect(observationCasePhotosAllowed()).toBe(false);
  });

  it("groups documents into resource categories", () => {
    const view = buildObservationResourcesView([
      {
        id: "1",
        document_type: "other",
        file_name: "facility-access-checklist.pdf",
        uploaded_by: "rep-1",
        created_at: "2026-05-29T12:00:00.000Z",
      },
      {
        id: "2",
        document_type: "other",
        file_name: "acs-product-guide.pdf",
        uploaded_by: "rep-1",
        created_at: "2026-05-29T12:05:00.000Z",
      },
      {
        id: "3",
        document_type: "other",
        file_name: "vendor-credentialing-form.docx",
        uploaded_by: "rep-1",
        created_at: "2026-05-29T12:10:00.000Z",
      },
      {
        id: "4",
        document_type: "other",
        file_name: "case-notes.txt",
        uploaded_by: "rep-1",
        created_at: "2026-05-29T12:15:00.000Z",
      },
    ]);

    expect(view.hasContent).toBe(true);
    expect(view.categories.map((category) => category.id)).toEqual([
      "uploaded_documents",
      "product_guides",
      "facility_docs",
      "credentialing_docs",
    ]);
    expect(view.categories.find((category) => category.id === "case_photos")).toBeUndefined();
  });

  it("puts generic pdf files in the pdfs category", () => {
    const view = buildObservationResourcesView([
      {
        id: "1",
        document_type: "other",
        file_name: "room-layout.pdf",
        uploaded_by: "rep-1",
        created_at: "2026-05-29T12:00:00.000Z",
      },
    ]);

    expect(view.categories.map((category) => category.id)).toEqual(["pdfs"]);
  });

  it("keeps completed observation forms in their own category", () => {
    const view = buildObservationResourcesView([
      {
        id: "1",
        document_type: "observation_form",
        file_name: "completed-observation.pdf",
        uploaded_by: "rep-1",
        created_at: "2026-10-06T12:00:00.000Z",
      },
    ]);

    expect(view.categories.map((category) => category.id)).toEqual(["observation_forms"]);
  });
});
