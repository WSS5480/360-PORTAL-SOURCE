import { supabaseAdmin } from "@/lib/supabase/admin";
import { formatIntelligenceCaptureSummaryChip } from "@/lib/surgical-sales/providerIntelligenceStructuredCapture";
import { fieldHasIntelligenceSignal } from "@/lib/surgical-sales/providerIntelligenceIncrementalCapture";
import {
  ORGANIZATION_INTELLIGENCE_DB_KEYS,
  ORGANIZATION_INTELLIGENCE_FIELD_DEFS,
} from "@/lib/surgical-sales/organizationIntelligenceFields";
import { isProviderRole } from "@/lib/surgical-sales/providerRoles";
import { readProviderCommercialIntelligence } from "@/lib/surgical-sales/providerCommercialIntelligenceModel";
import { contactDisplayName } from "@/lib/surgical-sales/labels";
import {
  filterOrganizationIntelligenceBaseline,
  isEligibleOrganizationBaselineValue,
} from "@/lib/surgical-sales/organizationIntelligenceReusableFilter";

export type OrganizationSupportContactBaseline = {
  contactId: string | null;
  contactName: string;
  contactRole: string | null;
  workflowRole: string | null;
  contributorCount: number;
};

export type OrganizationIntelligenceBaselineField = {
  dbKey: string;
  label: string;
  value: string;
  displayLine: string;
  /** How many other providers at this facility contributed this value. */
  contributorCount: number;
};

export type OrganizationIntelligenceBaseline = {
  organizationId: string;
  organizationName: string;
  fields: Record<string, OrganizationIntelligenceBaselineField>;
  /** Organization-scoped support contacts aggregated from peer providers. */
  supportContacts: OrganizationSupportContactBaseline[];
};

function normalizeValueKey(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, " ");
}

function displayLineFor(dbKey: string, raw: string): string {
  const chip = formatIntelligenceCaptureSummaryChip(dbKey, raw);
  if (chip) return chip;
  const t = raw.trim();
  return t.length > 120 ? `${t.slice(0, 119)}…` : t;
}

function normalizeContactNameKey(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

function aggregateOrganizationSupportContacts(
  peers: Array<Record<string, unknown>>,
  relatedByPeerId: Map<string, Array<Record<string, unknown>>>,
): OrganizationSupportContactBaseline[] {
  const byName = new Map<
    string,
    {
      contactId: string | null;
      contactName: string;
      contactRole: string | null;
      workflowRole: string | null;
      count: number;
    }
  >();

  const recordContact = (input: {
    contactId: string | null;
    contactName: string;
    contactRole: string | null;
    workflowRole: string | null;
  }) => {
    const name = input.contactName.trim();
    if (!name) return;
    const key = normalizeContactNameKey(name);
    const existing = byName.get(key);
    if (!existing) {
      byName.set(key, {
        contactId: input.contactId,
        contactName: name,
        contactRole: input.contactRole,
        workflowRole: input.workflowRole,
        count: 1,
      });
      return;
    }
    existing.count += 1;
    if (!existing.contactId && input.contactId) existing.contactId = input.contactId;
    if (!existing.contactRole && input.contactRole) existing.contactRole = input.contactRole;
    if (!existing.workflowRole && input.workflowRole) existing.workflowRole = input.workflowRole;
  };

  for (const peer of peers) {
    const commercial = readProviderCommercialIntelligence(peer);
    for (const sc of commercial?.support_contacts ?? []) {
      if (sc.scope !== "organization") continue;
      recordContact({
        contactId: sc.linked_contact_id,
        contactName: sc.contact_name,
        contactRole: sc.contact_role,
        workflowRole: sc.contact_role,
      });
    }

    const peerId = String(peer.id ?? "").trim();
    for (const rel of relatedByPeerId.get(peerId) ?? []) {
      const ownershipType = String(rel.ownership_type ?? "").trim();
      if (ownershipType !== "organization" && ownershipType !== "shared") continue;
      const related = rel.related as Record<string, unknown> | null | undefined;
      const contactName = related
        ? contactDisplayName({
            first_name: String(related.first_name ?? ""),
            last_name: String(related.last_name ?? ""),
            email: String(related.email ?? ""),
          })
        : "";
      recordContact({
        contactId: related ? String(related.id ?? "").trim() || null : null,
        contactName,
        contactRole: String(rel.workflow_role ?? rel.relationship_type ?? "").trim() || null,
        workflowRole: String(rel.workflow_role ?? "").trim() || null,
      });
    }
  }

  return [...byName.values()]
    .sort((a, b) => b.count - a.count || a.contactName.localeCompare(b.contactName))
    .map((row) => ({
      contactId: row.contactId,
      contactName: row.contactName,
      contactRole: row.contactRole,
      workflowRole: row.workflowRole,
      contributorCount: row.count,
    }));
}

function pickConsensusValue(
  dbKey: string,
  entries: Array<{ value: string; updatedAt: string }>,
): { value: string; displayLine: string; contributorCount: number } | null {
  if (entries.length === 0) return null;

  const byNorm = new Map<string, { value: string; count: number; latest: string }>();
  for (const entry of entries) {
    const norm = normalizeValueKey(entry.value);
    if (!norm) continue;
    const existing = byNorm.get(norm);
    if (!existing) {
      byNorm.set(norm, { value: entry.value, count: 1, latest: entry.updatedAt });
    } else {
      existing.count += 1;
      if (entry.updatedAt > existing.latest) {
        existing.latest = entry.updatedAt;
        existing.value = entry.value;
      }
    }
  }

  let best: { value: string; count: number; latest: string } | null = null;
  for (const row of byNorm.values()) {
    if (!best || row.count > best.count || (row.count === best.count && row.latest > best.latest)) {
      best = row;
    }
  }
  if (!best) return null;

  return {
    value: best.value,
    displayLine: displayLineFor(dbKey, best.value),
    contributorCount: best.count,
  };
}

/**
 * Aggregate organization-scoped intelligence from other providers at the same facility.
 */
export async function loadOrganizationIntelligenceBaseline(params: {
  organizationId: string;
  organizationName: string;
  excludeProviderId: string;
}): Promise<OrganizationIntelligenceBaseline> {
  const orgId = params.organizationId.trim();
  const fields: Record<string, OrganizationIntelligenceBaselineField> = {};

  if (!orgId) {
    return {
      organizationId: "",
      organizationName: params.organizationName,
      fields,
      supportContacts: [],
    };
  }

  const selectCols = [
    "id",
    "role_type",
    "updated_at",
    "provider_planning_updated_at",
    "provider_commercial_intelligence",
    ...ORGANIZATION_INTELLIGENCE_DB_KEYS,
  ].join(", ");

  const { data: peers, error } = await supabaseAdmin
    .from("surgical_sales_contacts")
    .select(selectCols)
    .neq("id", params.excludeProviderId)
    .or(`account_id.eq.${orgId},organization_id.eq.${orgId}`)
    .limit(200);

  if (error || !peers?.length) {
    return {
      organizationId: orgId,
      organizationName: params.organizationName,
      fields,
      supportContacts: [],
    };
  }

  const peerRows = peers as unknown as Array<Record<string, unknown>>;
  const peerIds = peerRows.map((row) => String(row.id ?? "").trim()).filter(Boolean);
  const relatedByPeerId = new Map<string, Array<Record<string, unknown>>>();

  if (peerIds.length > 0) {
    const { data: relRows } = await supabaseAdmin
      .from("surgical_sales_contact_relationships")
      .select(
        "primary_contact_id, related_contact_id, relationship_type, ownership_type, workflow_role, related:surgical_sales_contacts!related_contact_id(id, first_name, last_name, email, role_type)",
      )
      .in("primary_contact_id", peerIds)
      .in("ownership_type", ["organization", "shared"])
      .limit(500);

    for (const rel of (relRows || []) as Array<Record<string, unknown>>) {
      const primaryId = String(rel.primary_contact_id ?? "").trim();
      if (!primaryId) continue;
      const bucket = relatedByPeerId.get(primaryId) ?? [];
      bucket.push(rel);
      relatedByPeerId.set(primaryId, bucket);
    }
  }

  const supportContacts = aggregateOrganizationSupportContacts(peerRows, relatedByPeerId);

  const labelByKey = new Map(ORGANIZATION_INTELLIGENCE_FIELD_DEFS.map((f) => [f.dbKey, f.label]));

  for (const dbKey of ORGANIZATION_INTELLIGENCE_DB_KEYS) {
    const peerEntries: Array<{ value: string; updatedAt: string }> = [];

    for (const row of peerRows) {
      if (!isProviderRole(String(row.role_type ?? ""))) continue;
      const raw = String(row[dbKey] ?? "").trim();
      if (!fieldHasIntelligenceSignal(dbKey, raw)) continue;
      if (!isEligibleOrganizationBaselineValue(dbKey, raw)) continue;
      const updatedAt = String(row.provider_planning_updated_at ?? row.updated_at ?? "");
      peerEntries.push({ value: raw, updatedAt });
    }

    const consensus = pickConsensusValue(dbKey, peerEntries);
    if (!consensus) continue;

    fields[dbKey] = {
      dbKey,
      label: labelByKey.get(dbKey) ?? dbKey,
      value: consensus.value,
      displayLine: displayLineFor(dbKey, consensus.value),
      contributorCount: consensus.contributorCount,
    };
  }

  return filterOrganizationIntelligenceBaseline({
    organizationId: orgId,
    organizationName: params.organizationName,
    fields,
    supportContacts,
  });
}
