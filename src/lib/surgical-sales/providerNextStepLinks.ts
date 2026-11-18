/** Deep link to product product opportunity create with contextual prefill. */
export function buildCreateOpportunityHref(params: {
  accountId?: string | null;
  providerId?: string | null;
  engagementId?: string | null;
  caseId?: string | null;
}): string {
  const p = new URLSearchParams({ new: "1" });
  const accountId = String(params.accountId ?? "").trim();
  const providerId = String(params.providerId ?? "").trim();
  const engagementId = String(params.engagementId ?? "").trim();
  const caseId = String(params.caseId ?? "").trim();
  if (accountId) p.set("account_id", accountId);
  if (providerId) p.set("surgeon_contact_id", providerId);
  if (engagementId) p.set("engagement_id", engagementId);
  if (caseId) p.set("case_id", caseId);
  return `/portal/sales/opportunities?${p.toString()}`;
}
