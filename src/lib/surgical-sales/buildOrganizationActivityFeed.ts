import { contactDisplayName } from "@/lib/surgical-sales/labels";
import { formatSurgicalCaseActivityType } from "@/lib/surgical-sales/caseActivityLabels";

export type OrgActivityFeedItem = {
  id: string;
  feed_kind: "case" | "contact" | "relationship" | "note" | "document" | "billing" | "other";
  activity_type: string;
  summary: string;
  body: string | null;
  created_at: string;
  actor_display_name: string;
  case_id: string | null;
  case_number: string | null;
  contact_id: string | null;
  contact_label: string | null;
  /** For support relationships: primary (e.g. surgeon) contact. */
  secondary_contact_id: string | null;
  secondary_contact_label: string | null;
  metadata_json: Record<string, unknown> | null;
};

type ContactRow = {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  created_by?: string | null;
};

type RelRow = {
  id: string;
  primary_contact_id: string;
  related_contact_id: string;
  relationship_type: string;
  created_at?: string | null;
  created_by?: string | null;
};

type CaseActRow = {
  id: string;
  case_id: string;
  activity_type: string;
  body: string | null;
  metadata_json: unknown;
  created_at: string;
  user_id: string;
};

export type OrgStatusNote = {
  id: string;
  body: string;
  created_at: string;
  created_by_user_id: string;
  actor_display_name: string;
  note_type: string;
};

export type OrgStatusNoteRow = {
  id: string;
  body: string | null;
  note_type?: string | null;
  created_at: string;
  created_by_user_id: string;
};

function feedKindForCaseActivity(type: string): OrgActivityFeedItem["feed_kind"] {
  const t = String(type || "").toLowerCase();
  if (t === "note") return "note";
  if (t === "document_uploaded" || t === "document_deleted") return "document";
  if (t === "billing_update") return "billing";
  return "case";
}

function formatRelationshipType(relType: string): string {
  return String(relType || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function displayNameFromRow(c: ContactRow): string {
  return contactDisplayName({
    first_name: c.first_name,
    last_name: c.last_name,
    email: c.email,
  } as Parameters<typeof contactDisplayName>[0]);
}

const CONTACT_UPDATE_MS = 3000;

export function mapOrganizationStatusNotes(
  rows: OrgStatusNoteRow[],
  profileBy: Map<string, string>,
): OrgStatusNote[] {
  return rows.map((row) => {
    const uid = String(row.created_by_user_id || "");
    return {
      id: String(row.id),
      body: String(row.body ?? "").trim(),
      created_at: String(row.created_at),
      created_by_user_id: uid,
      actor_display_name: profileBy.get(uid) || (uid ? uid.slice(0, 8) : "—"),
      note_type: String(row.note_type || "general"),
    };
  });
}

export function buildOrganizationActivityFeed(params: {
  caseActivities: CaseActRow[];
  caseNumberById: Map<string, string>;
  contacts: ContactRow[];
  relationships: RelRow[];
  organizationNotes?: OrgStatusNote[];
  profileBy: Map<string, string>;
}): OrgActivityFeedItem[] {
  const { caseActivities, caseNumberById, contacts, relationships, organizationNotes, profileBy } = params;
  const contactById = new Map(contacts.map((c) => [String(c.id), c]));
  const items: OrgActivityFeedItem[] = [];

  for (const row of caseActivities) {
    const uid = String(row.user_id || "");
    const actor = profileBy.get(uid) || (uid ? uid.slice(0, 8) : "—");
    const caseId = String(row.case_id || "");
    const meta = row.metadata_json && typeof row.metadata_json === "object" && !Array.isArray(row.metadata_json)
      ? (row.metadata_json as Record<string, unknown>)
      : null;
    items.push({
      id: `ca-${row.id}`,
      feed_kind: feedKindForCaseActivity(row.activity_type),
      activity_type: row.activity_type,
      summary: formatSurgicalCaseActivityType(row.activity_type),
      body: row.body,
      created_at: row.created_at,
      actor_display_name: actor,
      case_id: caseId || null,
      case_number: caseNumberById.get(caseId) ?? null,
      contact_id: null,
      contact_label: null,
      secondary_contact_id: null,
      secondary_contact_label: null,
      metadata_json: meta,
    });
  }

  for (const c of contacts) {
    const id = String(c.id || "");
    if (!id) continue;
    const label = displayNameFromRow(c);
    const createdAt = c.created_at ? String(c.created_at) : "";
    const createdBy = c.created_by ? String(c.created_by) : "";
    const actorAdd = createdBy ? profileBy.get(createdBy) || "—" : "—";

    if (createdAt) {
      items.push({
        id: `c-add-${id}`,
        feed_kind: "contact",
        activity_type: "contact_added",
        summary: `Contact added · ${label}`,
        body: null,
        created_at: createdAt,
        actor_display_name: actorAdd,
        case_id: null,
        case_number: null,
        contact_id: id,
        contact_label: label,
        secondary_contact_id: null,
        secondary_contact_label: null,
        metadata_json: null,
      });
    }

    const updatedAt = c.updated_at ? String(c.updated_at) : "";
    if (updatedAt && createdAt) {
      const t0 = new Date(createdAt).getTime();
      const t1 = new Date(updatedAt).getTime();
      if (Number.isFinite(t0) && Number.isFinite(t1) && t1 - t0 > CONTACT_UPDATE_MS) {
        items.push({
          id: `c-upd-${id}-${updatedAt}`,
          feed_kind: "contact",
          activity_type: "contact_updated",
          summary: `Contact updated · ${label}`,
          body: null,
          created_at: updatedAt,
          actor_display_name: "—",
          case_id: null,
          case_number: null,
          contact_id: id,
          contact_label: label,
          secondary_contact_id: null,
          secondary_contact_label: null,
          metadata_json: null,
        });
      }
    }
  }

  for (const r of relationships) {
    const rid = String(r.id || "");
    if (!rid) continue;
    const primary = contactById.get(String(r.primary_contact_id));
    const related = contactById.get(String(r.related_contact_id));
    const primaryLabel = primary ? displayNameFromRow(primary) : "Contact";
    const relatedLabel = related ? displayNameFromRow(related) : "Contact";
    const relType = formatRelationshipType(String(r.relationship_type || "other"));
    const createdAt = r.created_at ? String(r.created_at) : new Date().toISOString();
    const cb = r.created_by ? String(r.created_by) : "";
    const actor = cb ? profileBy.get(cb) || "—" : "—";

    items.push({
      id: `rel-${rid}`,
      feed_kind: "relationship",
      activity_type: "support_relationship_added",
      summary: `Support relationship · ${relatedLabel} → ${primaryLabel} (${relType})`,
      body: null,
      created_at: createdAt,
      actor_display_name: actor,
      case_id: null,
      case_number: null,
      contact_id: String(r.related_contact_id),
      contact_label: relatedLabel,
      secondary_contact_id: String(r.primary_contact_id),
      secondary_contact_label: primaryLabel,
      metadata_json: { relationship_type: r.relationship_type },
    });
  }

  for (const note of organizationNotes ?? []) {
    if (!note.body) continue;
    items.push({
      id: `org-note-${note.id}`,
      feed_kind: "note",
      activity_type: "note",
      summary: "Organization note",
      body: note.body,
      created_at: note.created_at,
      actor_display_name: note.actor_display_name,
      case_id: null,
      case_number: null,
      contact_id: null,
      contact_label: null,
      secondary_contact_id: null,
      secondary_contact_label: null,
      metadata_json: { note_id: note.id, note_type: note.note_type, source: "organization" },
    });
  }

  items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return items;
}
