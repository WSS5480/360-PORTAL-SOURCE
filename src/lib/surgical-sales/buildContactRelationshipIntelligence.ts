import { contactDisplayName, formatSurgicalContactRole } from "@/lib/surgical-sales/labels";
import { contactRowNeedsDetails } from "@/lib/surgical-sales/debriefDetectedContact";

export type ContactInfluenceAreaId =
  | "scheduling"
  | "credentialing"
  | "purchasing"
  | "office_workflow"
  | "clinical_access"
  | "billing";

export type ContactInfluenceArea = {
  id: ContactInfluenceAreaId;
  label: string;
  active: boolean;
};

export type ContactSupportedProvider = {
  id: string;
  name: string;
  roleLabel: string;
  href: string;
  needsDetails: boolean;
  relationshipLabel: string;
};

export type ContactOrgSummaryRow = {
  id: string;
  orgName: string;
  roleLabel: string;
  isPrimary: boolean;
  isActive: boolean;
  href: string | null;
  detail: string | null;
};

export type ContactRelationshipIntelligence = {
  purposeLine: string;
  influenceAreas: ContactInfluenceArea[];
  supportedProviders: ContactSupportedProvider[];
  missingItems: string[];
  orgSummary: ContactOrgSummaryRow[];
  statusTokens: string[];
  reachLine: string | null;
};

const INFLUENCE_AREA_LABELS: Record<ContactInfluenceAreaId, string> = {
  scheduling: "Scheduling",
  credentialing: "Credentialing",
  purchasing: "Purchasing",
  office_workflow: "Office workflow",
  clinical_access: "Clinical access",
  billing: "Billing",
};

function roleInfluenceAreas(roleType: string): Set<ContactInfluenceAreaId> {
  const role = roleType.toLowerCase();
  const areas = new Set<ContactInfluenceAreaId>();
  if (role === "scheduler") areas.add("scheduling");
  if (role === "office_manager" || role === "assistant" || role === "admin") areas.add("office_workflow");
  if (role === "gatekeeper") {
    areas.add("office_workflow");
    areas.add("clinical_access");
  }
  if (role === "billing") areas.add("billing");
  if (role === "purchasing") areas.add("purchasing");
  if (role === "nurse" || role === "physician_assistant") areas.add("clinical_access");
  if (areas.size === 0) areas.add("office_workflow");
  return areas;
}

function relationshipTypeInfluence(type: string): Set<ContactInfluenceAreaId> {
  const t = type.toLowerCase();
  const areas = new Set<ContactInfluenceAreaId>();
  if (t === "scheduler") areas.add("scheduling");
  if (t === "office_manager" || t === "assistant" || t === "gatekeeper") areas.add("office_workflow");
  if (t === "billing_contact") areas.add("billing");
  if (t === "purchasing_contact") areas.add("purchasing");
  return areas;
}

export function resolveContactPurposeLine(roleType: string): string {
  const role = roleType.toLowerCase();
  if (role === "scheduler") {
    return "Coordinates case scheduling and OR access for the surgeons this contact supports.";
  }
  if (role === "office_manager") {
    return "Runs office workflow and often controls who gets access to supported surgeons.";
  }
  if (role === "gatekeeper") {
    return "Filters access to surgeons — a key stakeholder for observation approval and scheduling.";
  }
  if (role === "assistant") {
    return "Supports surgeon workflow and can unblock day-to-day access and follow-up.";
  }
  if (role === "billing") {
    return "Handles billing and reimbursement paths tied to supported providers.";
  }
  if (role === "purchasing") {
    return "Influences product evaluation, trial, and purchasing decisions.";
  }
  if (role === "nurse" || role === "physician_assistant") {
    return "Clinical support contact who influences in-room workflow and surgeon access.";
  }
  if (role === "admin") {
    return "Administrative contact who shapes facility access and internal routing.";
  }
  return "Support contact who influences access to surgeons and account workflow.";
}

function buildReachLine(contact: Record<string, unknown>): string | null {
  const parts: string[] = [];
  const title = String(contact.title ?? "").trim();
  const email = String(contact.email ?? "").trim();
  const phone = String(contact.phone ?? "").trim();
  const mobile = String(contact.mobile_phone ?? "").trim();
  if (title) parts.push(title);
  if (email) parts.push(email);
  if (phone) parts.push(phone);
  if (mobile && mobile !== phone) parts.push(`Mobile ${mobile}`);
  return parts.length > 0 ? parts.join(" · ") : null;
}

function buildMissingItems(input: {
  contact: Record<string, unknown>;
  supportedProviders: ContactSupportedProvider[];
  orgSummary: ContactOrgSummaryRow[];
}): string[] {
  const missing: string[] = [];
  const contact = input.contact;
  const preferred = String(contact.preferred_contact_method ?? "unknown");
  if (preferred === "unknown") missing.push("Preferred contact method");
  if (!String(contact.best_time_to_contact ?? "").trim()) missing.push("Best time to contact");
  if (!String(contact.access_notes ?? "").trim()) missing.push("Access notes");
  if (!String(contact.personality_notes ?? "").trim()) missing.push("Relationship notes");
  if (!String(contact.email ?? "").trim() && !String(contact.phone ?? "").trim() && !String(contact.mobile_phone ?? "").trim()) {
    missing.push("Email or phone");
  }
  if (String(contact.influence_level ?? "unknown") === "unknown") missing.push("Influence level");
  if (input.supportedProviders.length === 0) missing.push("Linked supported providers");
  if (input.orgSummary.length === 0) missing.push("Organization affiliation");
  return missing;
}

export function buildContactRelationshipIntelligence(input: {
  contact: Record<string, unknown>;
  organizationLinks?: Array<Record<string, unknown>>;
  relatedContacts?: Array<Record<string, unknown>>;
  relationships?: Array<Record<string, unknown>>;
}): ContactRelationshipIntelligence {
  const contact = input.contact ?? {};
  const roleType = String(contact.role_type || "other");
  const orgLinks = input.organizationLinks ?? [];
  const relatedContacts = input.relatedContacts ?? [];
  const relationships = input.relationships ?? [];

  const influenceSet = roleInfluenceAreas(roleType);
  for (const rel of relationships) {
    for (const area of relationshipTypeInfluence(String(rel.relationship_type || ""))) {
      influenceSet.add(area);
    }
  }
  // Scheduling and credentialing are commonly co-owned in surgical access.
  if (influenceSet.has("scheduling")) influenceSet.add("credentialing");

  const influenceAreas: ContactInfluenceArea[] = (
    Object.keys(INFLUENCE_AREA_LABELS) as ContactInfluenceAreaId[]
  ).map((id) => ({
    id,
    label: INFLUENCE_AREA_LABELS[id],
    active: influenceSet.has(id),
  }));

  const supportedProviders: ContactSupportedProvider[] = relatedContacts.map((provider) => {
    const rel = relationships.find((r) => String(r.primary_contact_id || "") === String(provider.id || ""));
    return {
      id: String(provider.id || ""),
      name: contactDisplayName(provider as Parameters<typeof contactDisplayName>[0]),
      roleLabel: formatSurgicalContactRole(String(provider.role_type || "other")),
      href: `/portal/sales/providers/${encodeURIComponent(String(provider.id || ""))}`,
      needsDetails: contactRowNeedsDetails(provider),
      relationshipLabel: String(rel?.relationship_type || "works_with").replace(/_/g, " "),
    };
  });

  const orgSummary: ContactOrgSummaryRow[] = orgLinks.map((link) => {
    const accountId = String(link.account_id ?? "");
    const orgName = String(
      (link as { accounts?: { name?: string | null } | null }).accounts?.name || "Organization",
    );
    const bits = [
      String(link.role_type || "other").replace(/_/g, " "),
      link.specialty ? String(link.specialty) : null,
      link.preferred_hospital ? `Prefers ${String(link.preferred_hospital)}` : null,
    ].filter(Boolean);
    return {
      id: String(link.id ?? accountId),
      orgName,
      roleLabel: String(link.role_type || "other").replace(/_/g, " "),
      isPrimary: Boolean(link.is_primary_org),
      isActive: Boolean(link.is_active ?? true),
      href: accountId ? `/portal/sales/accounts/${encodeURIComponent(accountId)}` : null,
      detail: bits.length > 0 ? bits.join(" · ") : null,
    };
  });

  const statusTokens: string[] = [];
  if (Boolean(String((contact as { archived_at?: string | null }).archived_at ?? "").trim())) {
    statusTokens.push("Archived");
  } else {
    statusTokens.push("Active");
  }
  if (contact.do_not_contact) statusTokens.push("Do not contact");
  const inf = String(contact.influence_level ?? "").trim();
  if (inf && inf !== "unknown") statusTokens.push(`Influence: ${inf.replace(/_/g, " ")}`);
  const str = String(contact.relationship_strength ?? "").trim();
  if (str && str !== "unknown") statusTokens.push(`Strength: ${str.replace(/_/g, " ")}`);

  const missingItems = buildMissingItems({ contact, supportedProviders, orgSummary });

  return {
    purposeLine: resolveContactPurposeLine(roleType),
    influenceAreas,
    supportedProviders,
    missingItems,
    orgSummary,
    statusTokens,
    reachLine: buildReachLine(contact),
  };
}
