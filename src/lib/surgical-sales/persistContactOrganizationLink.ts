/**
 * Client helper — upsert organization membership for an existing contact.
 */

import { readFetchJson } from "@/lib/surgical-sales/readFetchJson";

export async function persistContactOrganizationLink(input: {
  contactId: string;
  organizationId: string;
  roleType: string;
}): Promise<void> {
  const res = await fetch(
    `/api/portal/sales/surgical-contacts/${encodeURIComponent(input.contactId)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        organization_id: input.organizationId,
        link_organization_id: input.organizationId,
        link_organization_role_type: input.roleType,
      }),
    },
  );
  const j = await readFetchJson<{ ok?: boolean; error?: string }>(
    res,
    "Could not link contact to organization",
  );
  if (!res.ok || !j.ok) {
    throw new Error(j.error ?? "Could not link contact to organization.");
  }
}
