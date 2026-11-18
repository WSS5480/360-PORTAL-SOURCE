import { normalizeEngagementType } from "@/lib/surgical-sales/engagements/engagementTypes";

/** Inputs that should trigger a server prep refetch (not product focus alone on intro call). */
export type EngagementWizardPrepFetchInput = {
  provider_id: string;
  engagement_type: string;
  organization_id: string;
  opportunity_id: string;
  engagement_date: string;
  case_id: string;
  product_line: string;
  prep_mode: string;
};

/**
 * Stable identity for wizard-prep fetch. Excludes intro-call product_line so changing
 * Product Focus does not refetch or remount the preparation UI.
 */
export function engagementWizardPrepFetchIdentityKey(
  input: EngagementWizardPrepFetchInput,
): string {
  const isIntroCall = normalizeEngagementType(input.engagement_type) === "intro_call";
  return [
    input.provider_id.trim(),
    input.engagement_type.trim(),
    input.organization_id.trim(),
    input.opportunity_id.trim(),
    input.engagement_date.trim(),
    input.case_id.trim(),
    isIntroCall ? "" : input.prep_mode.trim(),
  ].join("\0");
}

export function buildEngagementWizardPrepFetchParams(
  input: EngagementWizardPrepFetchInput,
): URLSearchParams | null {
  const providerId = input.provider_id.trim();
  const engagementType = input.engagement_type.trim();
  if (!providerId || !engagementType) return null;

  const params = new URLSearchParams({
    provider_id: providerId,
    engagement_type: engagementType,
  });
  if (input.organization_id.trim()) params.set("organization_id", input.organization_id.trim());
  if (input.opportunity_id.trim()) params.set("opportunity_id", input.opportunity_id.trim());
  if (input.engagement_date.trim()) params.set("engagement_date", input.engagement_date.trim());
  if (input.product_line.trim()) params.set("product_line", input.product_line.trim());
  if (input.case_id.trim()) params.set("case_id", input.case_id.trim());
  const isIntroCall = normalizeEngagementType(engagementType) === "intro_call";
  if (!isIntroCall && input.prep_mode.trim()) params.set("prep_mode", input.prep_mode.trim());
  return params;
}
