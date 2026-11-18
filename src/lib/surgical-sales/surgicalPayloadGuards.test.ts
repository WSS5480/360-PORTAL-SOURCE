import { describe, expect, it } from "vitest";
import {
  assertAllowedSurgicalCaseDocumentFile,
  surgicalCaseDocumentFileLooksLikeImage,
  surgicalCaseDocumentTypeAllowsPhoto,
} from "./surgicalPayloadGuards";

function file(name: string, type: string) {
  return new File(["x"], name, { type });
}

describe("surgical case document upload types", () => {
  it("still accepts PDF and office files on every document type", () => {
    expect(assertAllowedSurgicalCaseDocumentFile(file("po.pdf", "application/pdf"), "implant_log")).toBeNull();
    expect(
      assertAllowedSurgicalCaseDocumentFile(
        file("notes.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
        "other"
      )
    ).toBeNull();
  });

  it("accepts invoice and purchase-order photos, including iPhone HEIC", () => {
    expect(assertAllowedSurgicalCaseDocumentFile(file("invoice.jpg", "image/jpeg"), "invoice")).toBeNull();
    expect(assertAllowedSurgicalCaseDocumentFile(file("po.png", "image/png"), "purchase_order")).toBeNull();
    expect(assertAllowedSurgicalCaseDocumentFile(file("form.jpg", "image/jpeg"), "observation_form")).toBeNull();
    expect(assertAllowedSurgicalCaseDocumentFile(file("IMG_1234.HEIC", "image/heic"), "invoice")).toBeNull();
    expect(assertAllowedSurgicalCaseDocumentFile(file("scan.webp", ""), "invoice")).toBeNull();
  });

  it("keeps photos off other document types and still blocks video", () => {
    expect(assertAllowedSurgicalCaseDocumentFile(file("card.jpg", "image/jpeg"), "implant_log")).toMatch(/photos are only allowed/i);
    expect(assertAllowedSurgicalCaseDocumentFile(file("clip.mp4", "video/mp4"), "invoice")).toMatch(/video/i);
  });

  it("identifies photo-friendly types for the mobile picker", () => {
    expect(surgicalCaseDocumentTypeAllowsPhoto("invoice")).toBe(true);
    expect(surgicalCaseDocumentTypeAllowsPhoto("PURCHASE_ORDER")).toBe(true);
    expect(surgicalCaseDocumentTypeAllowsPhoto("observation_form")).toBe(true);
    expect(surgicalCaseDocumentTypeAllowsPhoto("packing_slip")).toBe(false);
    expect(surgicalCaseDocumentFileLooksLikeImage(file("invoice.jpg", "image/jpeg"))).toBe(true);
    expect(surgicalCaseDocumentFileLooksLikeImage(file("invoice.pdf", "application/pdf"))).toBe(false);
  });
});
