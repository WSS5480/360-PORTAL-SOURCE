/**
 * Server-side guards for surgical sales JSON bodies and uploads.
 * Rejects nested object keys that look like patient / PHI record fields (API abuse),
 * and blocks video/audio plus photos except on invoice and purchase-order uploads.
 */

const FORBIDDEN_KEY_EXACT = new Set(
  [
    "patient_id",
    "patient_name",
    "patient_names",
    "patient_dob",
    "patient_mrn",
    "patient_uid",
    "patient_ssn",
    "mrn",
    "medical_record",
    "medical_record_number",
    "date_of_birth",
    "dob",
    "ssn",
    "social_security_number",
    "diagnosis",
    "diagnosis_code",
    "diagnosis_codes",
    "icd10",
    "icd_10",
    "phi",
    "hipaa",
    "insurance_member_id",
    "insurance_id",
    "encounter_id",
    "visit_number",
    "accession_number",
    "chart_number",
    "record_number",
  ].map((k) => k.toLowerCase())
);

function objectKeyViolatesPatientFieldPolicy(key: string): boolean {
  const k = key.trim().toLowerCase();
  if (!k) return false;
  if (FORBIDDEN_KEY_EXACT.has(k)) return true;
  if (k.startsWith("patient_")) return true;
  if (k.endsWith("_mrn") || k.endsWith("_dob") || k.endsWith("_ssn")) return true;
  if (k.includes("medical_record")) return true;
  return false;
}

function collectObjectKeys(value: unknown, out: string[]): void {
  if (value === null || value === undefined) return;
  if (Array.isArray(value)) {
    for (const item of value) collectObjectKeys(item, out);
    return;
  }
  if (typeof value === "object" && value.constructor === Object) {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out.push(k);
      collectObjectKeys(v, out);
    }
  }
}

/** Returns an error message, or null if OK. */
export function assertNoForbiddenPatientPayloadKeys(raw: unknown): string | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw !== "object" || Array.isArray(raw)) return null;
  const keys: string[] = [];
  collectObjectKeys(raw, keys);
  for (const k of keys) {
    if (objectKeyViolatesPatientFieldPolicy(k)) {
      return `Request contains a disallowed field name (${k}). Do not send patient identifiers or PHI columns in the API payload.`;
    }
  }
  return null;
}

const ALLOWED_DOC_MIME = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/csv",
]);

const ALLOWED_DOC_EXT = new Set(["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "csv"]);

const PHOTO_DOCUMENT_TYPES = new Set(["invoice", "purchase_order", "observation_form"]);

const ALLOWED_IMAGE_MIME = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

const ALLOWED_IMAGE_EXT = new Set(["jpg", "jpeg", "png", "webp", "heic", "heif"]);

function fileExtension(fileName: string): string {
  const parts = fileName.split(".");
  return parts.length > 1 ? parts.pop()!.toLowerCase() : "";
}

export function surgicalCaseDocumentTypeAllowsPhoto(documentType: string | null | undefined): boolean {
  return PHOTO_DOCUMENT_TYPES.has(String(documentType || "").trim().toLowerCase());
}

export function surgicalCaseDocumentFileLooksLikeImage(file: File): boolean {
  const mime = (file.type || "").toLowerCase().trim();
  if (mime.startsWith("image/")) return true;
  return ALLOWED_IMAGE_EXT.has(fileExtension(file.name));
}

function isAllowedInvoicePhoto(file: File): boolean {
  const mime = (file.type || "").toLowerCase().trim();
  if (ALLOWED_IMAGE_MIME.has(mime)) return true;
  const ext = fileExtension(file.name);
  if (!mime || mime === "application/octet-stream") {
    return ALLOWED_IMAGE_EXT.has(ext);
  }
  return false;
}

/** Returns an error message, or null if OK. */
export function assertAllowedSurgicalCaseDocumentFile(file: File, documentType?: string | null): string | null {
  const mime = (file.type || "").toLowerCase().trim();
  const allowsPhoto = surgicalCaseDocumentTypeAllowsPhoto(documentType);

  if (mime.startsWith("video/") || mime.startsWith("audio/")) {
    return "Video and audio uploads are not allowed on surgical case documents. Use a PDF, office document, or a photo of the invoice.";
  }

  if (isAllowedInvoicePhoto(file)) {
    if (allowsPhoto) return null;
    return "Photos are only allowed for invoices, purchase orders, and observation forms. Use a PDF or office document.";
  }

  if (mime.startsWith("image/")) {
    return "That image format is not supported. Use a JPEG, PNG, or HEIC photo, or a PDF.";
  }

  if (mime && ALLOWED_DOC_MIME.has(mime)) return null;

  const ext = fileExtension(file.name);
  if (ext && ALLOWED_DOC_EXT.has(ext)) return null;

  if (mime && mime !== "application/octet-stream") {
    return `Unsupported file type (${mime || "unknown"}). Allowed types include PDF, photos of invoices, and common office formats.`;
  }
  if (!ext || !ALLOWED_DOC_EXT.has(ext)) {
    return "Could not verify a safe file type. Use a PDF, a photo of the invoice, or a .docx / .xlsx document.";
  }
  return null;
}
