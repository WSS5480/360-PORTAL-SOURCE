export const OBSERVATION_RESOURCES_EMPTY_MESSAGE = "No resources uploaded for this case yet.";

export const OBSERVATION_RESOURCE_CATEGORIES = [
  { id: "observation_forms", title: "Observation forms" },
  { id: "uploaded_documents", title: "Uploaded documents" },
  { id: "case_photos", title: "Case photos" },
  { id: "pdfs", title: "PDFs" },
  { id: "product_guides", title: "Product guides" },
  { id: "facility_docs", title: "Facility docs" },
  { id: "credentialing_docs", title: "Credentialing docs" },
] as const;

export type ObservationResourceCategoryId = (typeof OBSERVATION_RESOURCE_CATEGORIES)[number]["id"];

export type ObservationResourceDocument = {
  id: string;
  document_type: string;
  file_name: string;
  uploaded_by: string;
  created_at: string;
  uploader_display_name?: string;
  file_size_bytes?: number | null;
};

export type ObservationResourceCategory = {
  id: ObservationResourceCategoryId;
  title: string;
  documents: ObservationResourceDocument[];
};

export type ObservationResourcesView = {
  hasContent: boolean;
  categories: ObservationResourceCategory[];
  photosAllowed: boolean;
};

const IMAGE_FILE_PATTERN = /\.(jpe?g|png|gif|webp|heic)$/i;
const PDF_FILE_PATTERN = /\.pdf$/i;

/** Policy gate for showing a dedicated case-photos section. */
export function observationCasePhotosAllowed(): boolean {
  return false;
}

function classifyObservationResourceDocument(
  doc: ObservationResourceDocument,
  photosAllowed: boolean,
): ObservationResourceCategoryId {
  const fileName = doc.file_name.trim().toLowerCase();
  const documentType = doc.document_type.trim().toLowerCase();

  if (documentType === "observation_form") return "observation_forms";
  if (photosAllowed && IMAGE_FILE_PATTERN.test(fileName)) return "case_photos";
  if (/credential|clearance|vendor.?portal/.test(fileName) || documentType.includes("credential")) {
    return "credentialing_docs";
  }
  if (/guide|brochure|ifu|product.?sheet|sell.?sheet/.test(fileName)) return "product_guides";
  if (/facility|spd|preference.?card|or.?access|room.?turnover/.test(fileName)) return "facility_docs";
  if (PDF_FILE_PATTERN.test(fileName)) return "pdfs";
  return "uploaded_documents";
}

export function buildObservationResourcesView(
  documents: ObservationResourceDocument[],
): ObservationResourcesView {
  const photosAllowed = observationCasePhotosAllowed();
  const grouped = new Map<ObservationResourceCategoryId, ObservationResourceDocument[]>();

  for (const doc of documents) {
    const categoryId = classifyObservationResourceDocument(doc, photosAllowed);
    const bucket = grouped.get(categoryId) ?? [];
    bucket.push(doc);
    grouped.set(categoryId, bucket);
  }

  const categories = OBSERVATION_RESOURCE_CATEGORIES.map((meta) => ({
    id: meta.id,
    title: meta.title,
    documents: grouped.get(meta.id) ?? [],
  })).filter((category) => category.documents.length > 0);

  return {
    hasContent: categories.length > 0,
    categories,
    photosAllowed,
  };
}
