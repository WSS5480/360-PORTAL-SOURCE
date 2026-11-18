export type OrganizationBillingFields = {
  surgical_crm_billing_address?: string | null;
  surgical_crm_billing_city?: string | null;
  surgical_crm_billing_state?: string | null;
  surgical_crm_billing_postal_code?: string | null;
};

export function organizationBillingCityState(org: OrganizationBillingFields): string {
  const city = (org.surgical_crm_billing_city || "").trim();
  const state = (org.surgical_crm_billing_state || "").trim();
  if (city && state) return `${city}, ${state}`;
  if (city) return city;
  if (state) return state;
  return "";
}

/** True when the org has no billing address on file and no billing/purchasing contact. */
export function isOrganizationBillingIncomplete(
  org: OrganizationBillingFields,
  opts?: { hasBillingContact?: boolean },
): boolean {
  if (opts?.hasBillingContact) return false;
  const address = (org.surgical_crm_billing_address || "").trim();
  const location = organizationBillingCityState(org);
  return !address && !location;
}

export function organizationBillingDetailsMessage(opts: {
  contactCount: number;
  hasBillingContact: boolean;
}): string {
  if (opts.contactCount === 0) {
    return "Add contacts on this account, then complete a billing address or assign someone in billing or purchasing.";
  }
  if (!opts.hasBillingContact) {
    return "Complete the organization's billing address or add a billing or purchasing contact.";
  }
  return "Complete the organization's billing address for POs and invoicing.";
}
