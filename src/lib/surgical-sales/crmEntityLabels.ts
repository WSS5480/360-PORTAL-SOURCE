/**
 * UI-facing labels for the surgical CRM entity model.
 * DB/API may still use legacy names (contact, surgeon_contact_id); these aliases clarify intent.
 */

/** DB table for all people; provider is a filtered view (clinician roles). */
export const CRM_ENTITY_CONTACT = "contact" as const;

/** Sales-portal label for clinician contacts (surgeon, physician_assistant). */
export const CRM_ENTITY_PROVIDER = "provider" as const;

/** DB table `accounts`; surfaced as Organization in surgical CRM. */
export const CRM_ENTITY_ORGANIZATION = "organization" as const;

/** Case field storing provider id (legacy column name). */
export const CASE_PROVIDER_FIELD = "surgeon_contact_id" as const;

/** Opportunity field storing provider id (aligned with cases). */
export const OPPORTUNITY_PROVIDER_FIELD = "surgeon_contact_id" as const;

export const FIELD_LABELS = {
  [CASE_PROVIDER_FIELD]: "Provider",
  provider_contact_id: "Provider",
  account_id: "Organization",
  related_opportunity_id: "Related opportunity",
  physician_name: "Clinician",
  notes: "Case notes",
} as const;

export function labelForCaseProviderField(): string {
  return FIELD_LABELS[CASE_PROVIDER_FIELD];
}

export function labelForOpportunityClinician(): string {
  return FIELD_LABELS.physician_name;
}

/** Shown when legacy API messages still say "surgeon contact". */
export function mapLegacyProviderErrorMessage(message: string): string {
  return message
    .replace(/Surgeon contact/gi, "Provider")
    .replace(/surgeon contact/gi, "provider")
    .replace(/surgeon must/gi, "provider must")
    .replace(/surgeon on file/gi, "provider on file");
}
