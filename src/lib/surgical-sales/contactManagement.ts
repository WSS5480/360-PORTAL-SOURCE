import { supabaseAdmin } from "@/lib/supabase/admin";
import { isSalesCrmTeamMember } from "@/lib/sales/isSalesCrmTeamMember";
import type { ContactSalesIntelligenceInput } from "@/lib/surgical-sales/contactConstants";

export {
  SURGICAL_CONTACT_ROLE_TYPES_V2,
  SURGICAL_CONTACT_INFLUENCE_LEVELS,
  SURGICAL_CONTACT_RELATIONSHIP_STRENGTHS,
  SURGICAL_CONTACT_RELATIONSHIP_TYPES,
  SURGICAL_CONTACT_PREFERRED_METHODS,
  SURGICAL_CONTACT_VERIFICATION_STATUSES,
} from "@/lib/surgical-sales/contactConstants";
export type { SurgicalContactVerificationStatus } from "@/lib/surgical-sales/contactConstants";

export type { ContactSalesIntelligenceInput } from "@/lib/surgical-sales/contactConstants";

export function formatSurgicalContactDbError(message: string | null | undefined): string {
  const m = String(message || "");
  if (
    m.includes("verification_status") &&
    m.includes("surgical_sales_contacts") &&
    m.toLowerCase().includes("schema cache")
  ) {
    return `${m} Apply migration db/migrations/20260666_contact_verification_status.sql in the Supabase SQL Editor, then reload the API schema if needed.`;
  }
  return m;
}

/** Re-export relationship helpers (provider = contact; org links via junction + legacy columns). */
export {
  assertProviderLinkedToOrganization,
  assertSurgeonOnAccount,
  contactBelongsToOrganization,
  asProviderId,
} from "@/lib/surgical-sales/crmEntityRelationships";

/** Merge only keys present on `input` into `patch`. Validates ISO timestamps. Returns error message or null. */
export function mergeContactSalesIntelligenceIntoPatch(
  patch: Record<string, unknown>,
  input: ContactSalesIntelligenceInput
): string | null {
  const trimOrNull = (s: string | null, max: number): string | null => {
    if (s === null) return null;
    const t = s.trim();
    if (!t) return null;
    return t.length > max ? t.slice(0, max) : t;
  };

  if (input.preferred_contact_method !== undefined) {
    patch.preferred_contact_method = input.preferred_contact_method;
  }
  if (input.best_time_to_contact !== undefined) {
    patch.best_time_to_contact = trimOrNull(input.best_time_to_contact, 500);
  }
  if (input.access_notes !== undefined) {
    patch.access_notes = trimOrNull(input.access_notes, 8000);
  }
  if (input.personality_notes !== undefined) {
    patch.personality_notes = trimOrNull(input.personality_notes, 8000);
  }
  if (input.do_not_contact !== undefined) {
    patch.do_not_contact = input.do_not_contact === true;
  }

  for (const key of ["last_contacted_at", "next_follow_up_at"] as const) {
    if (input[key] === undefined) continue;
    const raw = input[key];
    if (raw === null || raw === "") {
      patch[key] = null;
      continue;
    }
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) {
      return `Invalid ${key.replace(/_/g, " ")}`;
    }
    patch[key] = d.toISOString();
  }

  return null;
}

type ContactAuthRow = {
  id: string;
  organization_id?: string | null;
  account_id?: string | null;
  created_by?: string | null;
  created_by_user_id?: string | null;
};

export function resolveOrganizationId(row: ContactAuthRow): string | null {
  const org = row.organization_id ?? row.account_id ?? null;
  return org ? String(org) : null;
}

export function resolveCreatedBy(row: ContactAuthRow): string | null {
  const createdBy = row.created_by ?? row.created_by_user_id ?? null;
  return createdBy ? String(createdBy) : null;
}

export async function repCanAccessContact(userId: string, row: ContactAuthRow): Promise<boolean> {
  if (await isSalesCrmTeamMember(userId)) return true;
  const createdBy = resolveCreatedBy(row);
  return Boolean(createdBy && createdBy === userId);
}

export async function loadRepVisibleContactIds(userId: string): Promise<Set<string>> {
  const ids = new Set<string>();

  if (await isSalesCrmTeamMember(userId)) {
    const { data: allRows } = await supabaseAdmin.from("surgical_sales_contacts").select("id").limit(5000);
    for (const row of (allRows || []) as Array<{ id: string }>) ids.add(String(row.id));
    return ids;
  }

  const { data: byCreator } = await supabaseAdmin
    .from("surgical_sales_contacts")
    .select("id")
    .or(`created_by.eq.${userId},created_by_user_id.eq.${userId}`)
    .limit(5000);
  for (const row of (byCreator || []) as Array<{ id: string }>) ids.add(String(row.id));
  return ids;
}

export async function upsertContactOrganizationLink(args: {
  contactId: string;
  accountId: string;
  actorId: string;
  roleType: string;
  isPrimary: boolean;
  isActive?: boolean;
  specialty?: string | null;
  relationshipNotes?: string | null;
  preferredHospital?: string | null;
  influenceLevel?: string;
}) {
  const isActive = args.isActive ?? true;
  const influenceLevel = args.influenceLevel ?? "unknown";
  await supabaseAdmin.from("surgical_sales_contact_organizations").upsert(
    {
      contact_id: args.contactId,
      account_id: args.accountId,
      role_type: args.roleType,
      is_primary_org: args.isPrimary,
      is_active: isActive,
      specialty: args.specialty ?? null,
      relationship_notes: args.relationshipNotes ?? null,
      preferred_hospital: args.preferredHospital ?? null,
      influence_level: influenceLevel,
      created_by: args.actorId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "contact_id,account_id" },
  );
  if (args.isPrimary) {
    await supabaseAdmin
      .from("surgical_sales_contact_organizations")
      .update({ is_primary_org: false, updated_at: new Date().toISOString() })
      .eq("contact_id", args.contactId)
      .neq("account_id", args.accountId);
  }
}

export function mapContactWriteFields(input: {
  organization_id?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  title?: string | null;
  email?: string | null;
  phone?: string | null;
  mobile_phone?: string | null;
  role_type?: string | null;
  influence_level?: string | null;
  relationship_strength?: string | null;
  is_primary_contact?: boolean;
  notes?: string | null;
  created_by?: string | null;
  verification_status?: string | null;
}): Record<string, unknown> {
  const organizationId = input.organization_id ?? null;
  const emailRaw = input.email?.trim();
  const out: Record<string, unknown> = {
    organization_id: organizationId,
    account_id: organizationId,
    first_name: (input.first_name ?? "").trim(),
    last_name: (input.last_name ?? "").trim(),
    title: input.title?.trim() || null,
    email: emailRaw ? emailRaw.toLowerCase() : null,
    phone: input.phone?.trim() || null,
    mobile_phone: input.mobile_phone?.trim() || null,
    role_type: input.role_type || "other",
    influence_level: input.influence_level || "unknown",
    relationship_strength: input.relationship_strength || "unknown",
    is_primary_contact: input.is_primary_contact === true,
    is_primary: input.is_primary_contact === true,
    notes: input.notes?.trim() || null,
    created_by: input.created_by ?? null,
    created_by_user_id: input.created_by ?? null,
  };
  // Only persist when explicitly set — verified is the DB default after
  // db/migrations/20260666_contact_verification_status.sql; omitting avoids
  // schema-cache errors on databases that have not applied that migration yet.
  if (input.verification_status === "suggested" || input.verification_status === "verified") {
    out.verification_status = input.verification_status;
  }
  return out;
}

