/**
 * Rapid Discovery — create/link support contacts without duplicate CRM entry.
 */

import { contactDisplayName } from "@/lib/surgical-sales/labels";
import {
  formatOperationalContactIntelligenceLine,
  formatOperationalRelationshipNotes,
  operationalContactType,
} from "@/lib/surgical-sales/operationalSupportContact";
import { persistContactOrganizationLink } from "@/lib/surgical-sales/persistContactOrganizationLink";
import { readFetchJson } from "@/lib/surgical-sales/readFetchJson";
import {
  assignmentLinksToProvider,
} from "@/lib/surgical-sales/contactRelationshipAssignment";
import type { SurgicalContactVerificationStatus } from "@/lib/surgical-sales/contactConstants";
import {
  draftLinksToOrganization,
  syncDraftRoleId,
  type RapidDiscoverySupportContactDraft,
} from "@/lib/surgical-sales/rapidDiscoverySupportContact";

export type RapidDiscoveryLinkedSupportContact = {
  contact: Record<string, unknown>;
  relationship: Record<string, unknown>;
  intelligenceValue: string;
  displayName: string;
};

export async function saveRapidDiscoverySupportContact(input: {
  providerId: string;
  draft: RapidDiscoverySupportContactDraft;
  dbKey: string;
  relationshipNotes?: string;
  verificationStatus?: SurgicalContactVerificationStatus;
}): Promise<RapidDiscoveryLinkedSupportContact> {
  const draft = syncDraftRoleId(input.draft);
  const typeSpec = operationalContactType(draft.contactTypeId);
  const linkOrg = draftLinksToOrganization(draft);
  let contact: Record<string, unknown>;

  const verificationStatus = input.verificationStatus ?? "verified";

  if (draft.mode === "select" && draft.selectedContactId) {
    const res = await fetch(
      `/api/portal/sales/surgical-contacts/${encodeURIComponent(draft.selectedContactId)}`,
      { cache: "no-store" },
    );
    const j = await readFetchJson<{ ok?: boolean; contact?: Record<string, unknown>; error?: string }>(
      res,
      "Could not load support contact",
    );
    if (!res.ok || !j.contact) throw new Error(j.error ?? "Could not load support contact.");
    contact = j.contact;

    const shouldVerify =
      verificationStatus === "verified" ||
      Boolean(draft.email.trim() || draft.phone.trim() || draft.firstName.trim() || draft.lastName.trim());
    if (shouldVerify) {
      const patchRes = await fetch(
        `/api/portal/sales/surgical-contacts/${encodeURIComponent(draft.selectedContactId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            first_name: draft.firstName.trim() || null,
            last_name: draft.lastName.trim() || null,
            email: draft.email.trim() || null,
            phone: draft.phone.trim() || null,
            mobile_phone: draft.phone.trim() || null,
            title: draft.jobTitle.trim() || null,
            notes: draft.notes.trim() || null,
          }),
        },
      );
      const patchJson = await readFetchJson<{ ok?: boolean; contact?: Record<string, unknown>; error?: string }>(
        patchRes,
        "Could not update support contact",
      );
      if (!patchRes.ok || !patchJson.contact) {
        throw new Error(patchJson.error ?? "Could not update support contact.");
      }
      contact = patchJson.contact;
    }
    if (linkOrg && draft.organizationId) {
      await persistContactOrganizationLink({
        contactId: String(contact.id),
        organizationId: draft.organizationId,
        roleType: typeSpec.roleType,
      });
    }
  } else {
    const res = await fetch("/api/portal/sales/surgical-contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        organization_id: linkOrg ? draft.organizationId : null,
        link_organization_id: linkOrg ? draft.organizationId : null,
        link_organization_role_type: linkOrg ? typeSpec.roleType : null,
        first_name: draft.firstName.trim() || null,
        last_name: draft.lastName.trim() || null,
        email: draft.email.trim() || null,
        phone: draft.phone.trim() || null,
        mobile_phone: draft.phone.trim() || null,
        title: draft.jobTitle.trim() || null,
        role_type: typeSpec.roleType,
        notes: draft.notes.trim() || null,
        ...(verificationStatus === "suggested" ? { verification_status: "suggested" } : {}),
      }),
    });
    const j = await readFetchJson<{ ok?: boolean; contact?: Record<string, unknown>; error?: string }>(
      res,
      "Could not create support contact",
    );
    if (!res.ok || !j.contact) throw new Error(j.error ?? "Could not create support contact.");
    contact = j.contact;
  }

  const displayName = contactDisplayName(contact as Parameters<typeof contactDisplayName>[0]);
  const relationshipNoteBody = formatOperationalRelationshipNotes({
    jobTitle: draft.jobTitle.trim() || undefined,
    workflowResponsibilityIds: draft.workflowResponsibilities,
    context: input.relationshipNotes,
  });

  const primaryWorkflowRole = draft.workflowResponsibilities[0] ?? null;
  let relationship: Record<string, unknown>;

  if (assignmentLinksToProvider(draft.ownershipType)) {
    const relRes = await fetch("/api/portal/sales/surgical-contact-relationships", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        primary_contact_id: input.providerId,
        related_contact_id: String(contact.id),
        relationship_type: typeSpec.relationshipType,
        ownership_type: draft.ownershipType,
        workflow_role: primaryWorkflowRole,
        notes:
          draft.notes.trim() ||
          relationshipNoteBody ||
          `${displayName} — linked via provider intelligence (${input.dbKey})`,
      }),
    });
    const relJson = await readFetchJson<{
      ok?: boolean;
      relationship?: Record<string, unknown>;
      error?: string;
    }>(relRes, "Could not link support contact to provider");
    if (!relRes.ok || !relJson.relationship) {
      throw new Error(relJson.error ?? "Could not link support contact to provider.");
    }
    relationship = relJson.relationship;
  } else {
    relationship = {
      ownership_type: draft.ownershipType,
      workflow_role: primaryWorkflowRole,
      notes: relationshipNoteBody,
    };
  }

  const intelligenceValue = formatOperationalContactIntelligenceLine({
    contact,
    jobTitle: draft.jobTitle.trim() || undefined,
    workflowResponsibilityIds: draft.workflowResponsibilities,
    notes: draft.notes,
  });

  return {
    contact,
    relationship,
    intelligenceValue,
    displayName,
  };
}
