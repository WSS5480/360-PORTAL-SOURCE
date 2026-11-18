/** Intelligence field counts as confirmed only when validated on file (not default-filled). */

function fieldMetadataEntry(
  contact: Record<string, unknown>,
  dbKey: string,
): Record<string, unknown> | null {
  const raw = contact.provider_intelligence_field_metadata;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const entry = (raw as Record<string, unknown>)[dbKey];
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) return null;
  return entry as Record<string, unknown>;
}

export function isIntelligenceFieldValidatedOnFile(
  dbKey: string,
  contact: Record<string, unknown>,
): boolean {
  const raw = String(contact[dbKey] ?? "").trim();
  if (!raw) return false;

  const meta = fieldMetadataEntry(contact, dbKey);
  if (meta) {
    if (String(meta.validated_at ?? "").trim()) return true;
    if (String(meta.lifecycle_state ?? "").trim() === "validated") return true;
  }

  if (/\bvalidated_at:/i.test(raw)) return true;

  return false;
}
