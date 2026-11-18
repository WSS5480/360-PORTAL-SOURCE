"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import React from "react";
import { createPortal } from "react-dom";
import { caseStatusBadgeStyle, caseTypeBadgeStyle } from "@/components/sales/crmUi";
import { PortalMobileMenuButton } from "@/components/portal/PortalMobileMenuButton";
import { PortalEmptyState } from "@/components/sales/PortalEmptyState";
import { SalesCommandPage, SalesMetricCard, SalesPanel, sc } from "@/components/sales/salesCommandUi";
import { userFacingError } from "@/lib/errors/userFacingError";
import { orgAccountDetailCss } from "../orgAccountDetailCss";
import { SurgicalAccountIntelligencePanel } from "@/components/sales/SurgicalAccountIntelligencePanel";
import { OrganizationProductApprovalsPanel } from "@/components/sales/OrganizationProductApprovalsPanel";
import ManageSupportContactsModal from "@/components/sales/ManageSupportContactsModal";
import SalesCrmConfirmModal from "@/components/sales/SalesCrmConfirmModal";
import RemovePersonModal from "@/components/sales/RemovePersonModal";
import EditOrganizationModal from "@/components/sales/EditOrganizationModal";
import { contactFormModalCss } from "@/components/sales/contactFormModalCss";
import type { AccountIntelligence } from "@/lib/surgical-sales/accountIntelligence";
import { SURGICAL_CONTACT_ROLE_TYPES_V2 } from "@/lib/surgical-sales/contactConstants";
import {
  contactDisplayName,
  formatSurgicalAccountStatus,
  formatSurgicalAccountType,
  formatSurgicalCaseStatus,
  formatSurgicalCaseType,
  formatSurgicalContactRole,
  isSurgicalObservationCase,
  SURGICAL_PHI_UI_NOTICE,
} from "@/lib/surgical-sales/labels";
import { billingReadinessLabel, type BillingReadinessLevel } from "@/lib/surgical-sales/billingReadiness";
import {
  isOrganizationBillingIncomplete,
  organizationBillingDetailsMessage,
} from "@/lib/surgical-sales/organizationBillingDetails";
import type { OrgActivityFeedItem, OrgStatusNote } from "@/lib/surgical-sales/buildOrganizationActivityFeed";
import { OrganizationNotesPanel } from "@/components/sales/OrganizationNotesPanel";
import { readResponseJson } from "@/lib/utils/readResponseJson";
import {
  buildCaptureIntelligenceOpenContext,
  useCaptureIntelligence,
} from "@/components/sales/captureIntelligence/CaptureIntelligenceHost";
import { captureIntelligenceTitleForContext } from "@/lib/surgical-sales/captureIntelligence";
import { LOG_UPDATE_UI_ENABLED } from "@/lib/surgical-sales/logUpdateUx";
import { isProviderRole } from "@/lib/surgical-sales/providerRoles";
import type { ProviderRemoveScope } from "@/lib/surgical-sales/providerRemoveScope";
import { AdoptionInitiativesListPanel } from "@/components/sales/crmEntityRelationshipPanels";
import { buildCreateOpportunityHref } from "@/lib/surgical-sales/providerNextStepLinks";
import type { LinkedOpportunitySummary } from "@/lib/surgical-sales/opportunityRelationships";

type Account = Record<string, unknown>;
type Contact = Record<string, unknown> & { id?: string; created_by_user_id?: string | null; created_by?: string | null };
type CaseRow = Record<string, unknown>;
type Relationship = Record<string, unknown> & {
  id?: string;
  primary_contact_id?: string;
  related_contact_id?: string;
  relationship_type?: string;
  created_by?: string | null;
};
type SupportJoin = { rel: Relationship; contact?: Contact };

type OrgTab = "overview" | "contacts" | "cases" | "billing" | "product_approvals" | "notes" | "activity";

type ActivityKindFilter = "" | OrgActivityFeedItem["feed_kind"];

const ACTIVITY_FEED_KIND_FILTERS: Array<{ id: ActivityKindFilter; label: string }> = [
  { id: "", label: "All" },
  { id: "case", label: "Cases" },
  { id: "contact", label: "Contacts" },
  { id: "relationship", label: "Support links" },
  { id: "note", label: "Notes" },
  { id: "document", label: "Documents" },
  { id: "billing", label: "Billing" },
  { id: "other", label: "Other" },
];

function orgActivityFeedIcon(item: OrgActivityFeedItem): string {
  const t = String(item.activity_type || "").toLowerCase();
  if (t === "contact_added") return "👤";
  if (t === "contact_updated") return "✏️";
  if (t === "support_relationship_added") return "🔗";
  if (t === "case_created") return "📁";
  if (t === "case_updated") return "⌁";
  if (t === "status_change") return "↻";
  if (t === "note") return "📝";
  if (t === "document_uploaded") return "📄";
  if (t === "document_deleted") return "🗑️";
  if (t === "billing_update") return "💳";
  if (t === "product_updated") return "◫";
  return "●";
}

/** Related-record links in the activity feed sit in a text row but must stay thumb-sized. */
const activityRecordLink: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  minHeight: 44,
  color: "var(--brand-600)",
  textDecoration: "none",
};

function OrgActivityFeedRow({ item, isLast }: { item: OrgActivityFeedItem; isLast: boolean }) {
  const meta = item.metadata_json;
  const docType =
    meta && typeof meta === "object" && meta !== null && "document_type" in meta
      ? String((meta as { document_type?: unknown }).document_type || "")
          .replace(/_/g, " ")
          .trim()
      : "";
  const body =
    item.body?.trim() ||
    (item.activity_type === "document_uploaded" && docType ? `Type: ${docType}` : "") ||
    (item.activity_type === "status_change" && meta && typeof meta === "object" && "new_values" in meta
      ? formatStatusChangeSnippet(meta as Record<string, unknown>)
      : "");

  return (
    <div style={{ display: "grid", gridTemplateColumns: "44px minmax(0, 1fr)", gap: 12, alignItems: "stretch", width: "100%", maxWidth: "100%" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minHeight: 0, flexShrink: 0 }}>
        <div
          aria-hidden
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 20,
            background: "linear-gradient(145deg, color-mix(in srgb, var(--brand-600) 12%, var(--surface)), var(--surface))",
            border: "1px solid var(--crm-card-edge, color-mix(in srgb, var(--foreground) 10%, var(--border)))",
            boxShadow: "0 2px 8px color-mix(in srgb, var(--foreground) 5%, transparent)",
          }}
        >
          {orgActivityFeedIcon(item)}
        </div>
        {!isLast ? (
          <div
            aria-hidden
            style={{
              width: 2,
              flex: 1,
              minHeight: 12,
              marginTop: 6,
              borderRadius: 2,
              background: "linear-gradient(180deg, color-mix(in srgb, var(--brand-600) 35%, var(--border)), color-mix(in srgb, var(--crm-cyan-bright, #22d3ee) 20%, var(--border)))",
            }}
          />
        ) : null}
      </div>
      <div
        style={{
          minWidth: 0,
          borderRadius: 14,
          border: "1px solid var(--crm-card-edge, color-mix(in srgb, var(--foreground) 9%, var(--border)))",
          background: "var(--crm-surface-elevated, var(--surface))",
          padding: "12px 14px",
          marginBottom: isLast ? 0 : 4,
          boxShadow: "var(--crm-card-shadow, 0 1px 0 color-mix(in srgb, var(--foreground) 4%, transparent))",
        }}
      >
        <div style={{ fontWeight: 900, fontSize: 14, letterSpacing: "-0.02em", lineHeight: 1.35, wordBreak: "break-word" }}>{item.summary}</div>
        <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", fontSize: 12, fontWeight: 700 }}>
          {item.case_id ? (
            <Link href={`/portal/sales/cases/${item.case_id}`} style={activityRecordLink}>
              {item.case_number ? `Case ${item.case_number}` : "Open case"}
            </Link>
          ) : null}
          {item.contact_id ? (
            <Link href={`/portal/sales/contacts/${item.contact_id}`} style={activityRecordLink}>
              {item.contact_label || "Contact"}
            </Link>
          ) : null}
          {item.secondary_contact_id ? (
            <span style={{ color: "var(--muted)", fontWeight: 600 }}>
              ↔{" "}
              <Link href={`/portal/sales/contacts/${item.secondary_contact_id}`} style={activityRecordLink}>
                {item.secondary_contact_label || "Contact"}
              </Link>
            </span>
          ) : null}
        </div>
        {body ? (
          <div style={{ marginTop: 8, fontSize: 13, lineHeight: 1.5, color: "var(--foreground)", whiteSpace: "pre-wrap" }}>{body}</div>
        ) : null}
        <div style={{ marginTop: 10, fontSize: 11, color: "var(--muted)", fontWeight: 700, display: "flex", flexWrap: "wrap", gap: 8 }}>
          <span>{new Date(item.created_at).toLocaleString()}</span>
          <span>·</span>
          <span>{item.actor_display_name === "—" ? "Actor not recorded" : item.actor_display_name}</span>
        </div>
      </div>
    </div>
  );
}

function formatStatusChangeSnippet(meta: Record<string, unknown>): string {
  const nv = meta.new_values;
  if (!nv || typeof nv !== "object" || nv === null) return "";
  const o = nv as Record<string, unknown>;
  if (typeof o.status === "string") return `New status: ${o.status.replace(/_/g, " ")}`;
  return "";
}

function parseOrgTab(raw: string | null | undefined): OrgTab {
  const t = String(raw || "")
    .toLowerCase()
    .trim();
  if (t === "documents") return "billing";
  if (t === "contacts" || t === "cases" || t === "billing" || t === "product_approvals" || t === "notes" || t === "activity") return t;
  return "overview";
}

function fmtDate(s: unknown) {
  if (!s || typeof s !== "string") return "";
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString();
}

function fmtCaseTime(t: unknown) {
  const s = t == null ? "" : String(t);
  return s.length >= 5 ? s.slice(0, 5) : s;
}

function organizationAccountTitle(account: Account): string {
  const fromName = String(account.name ?? "").trim();
  if (fromName) return fromName;
  const display = String((account as { display_name?: unknown }).display_name ?? "").trim();
  if (display) return display;
  return "";
}

type DoctorSupportSlotDef = {
  slotKey: string;
  label: string;
  icon: string;
  /** `surgical_sales_contact_relationships.relationship_type` to pre-fill when adding from this row */
  linkRelType: string;
  relTypes: string[];
  contactRoles: string[];
};

const DOCTOR_SUPPORT_SLOT_DEFS: DoctorSupportSlotDef[] = [
  {
    slotKey: "office_manager",
    label: "Office Manager",
    icon: "🏢",
    linkRelType: "office_manager",
    relTypes: ["office_manager"],
    contactRoles: ["office_manager"],
  },
  {
    slotKey: "scheduler",
    label: "Scheduler",
    icon: "📅",
    linkRelType: "scheduler",
    relTypes: ["scheduler"],
    contactRoles: ["scheduler"],
  },
  {
    slotKey: "assistant",
    label: "Assistant",
    icon: "🤝",
    linkRelType: "assistant",
    relTypes: ["assistant"],
    contactRoles: ["assistant"],
  },
  {
    slotKey: "gatekeeper",
    label: "Gatekeeper",
    icon: "🛡️",
    linkRelType: "gatekeeper",
    relTypes: ["gatekeeper"],
    contactRoles: ["gatekeeper"],
  },
  {
    slotKey: "billing",
    label: "Billing",
    icon: "💳",
    linkRelType: "billing_contact",
    relTypes: ["billing_contact", "purchasing_contact"],
    contactRoles: ["billing", "purchasing"],
  },
];

/** Relationship types where we infer the org chart slot from the linked contact’s `role_type`. */
const REL_TYPES_TRUST_CONTACT_ROLE = new Set(["works_with", "colleague", "reports_to", "other", ""]);

function supportJoinMatchesSlot(s: SupportJoin, slot: DoctorSupportSlotDef): boolean {
  const rt = String(s.rel?.relationship_type || "").toLowerCase();
  const cr = String(s.contact?.role_type || "").toLowerCase();
  if (slot.relTypes.some((t) => t === rt)) return true;
  if (REL_TYPES_TRUST_CONTACT_ROLE.has(rt) || !rt) {
    return slot.contactRoles.some((r) => r === cr);
  }
  return false;
}

function bucketDoctorSupportBySlots(support: SupportJoin[]): Map<string, SupportJoin[]> {
  const buckets = new Map<string, SupportJoin[]>();
  for (const def of DOCTOR_SUPPORT_SLOT_DEFS) buckets.set(def.slotKey, []);
  const assignedRelIds = new Set<string>();
  for (const s of support) {
    const rid = String(s.rel?.id || "");
    if (!rid) continue;
    for (const def of DOCTOR_SUPPORT_SLOT_DEFS) {
      if (supportJoinMatchesSlot(s, def)) {
        if (!assignedRelIds.has(rid)) {
          buckets.get(def.slotKey)!.push(s);
          assignedRelIds.add(rid);
        }
        break;
      }
    }
  }
  return buckets;
}

function roleIconEmoji(roleType: string): string {
  const r = String(roleType);
  const map: Record<string, string> = {
    surgeon: "⚕️",
    physician_assistant: "🧑‍⚕️",
    nurse: "💉",
    scheduler: "📅",
    office_manager: "🏢",
    gatekeeper: "🛡️",
    billing: "💳",
    purchasing: "🧾",
    assistant: "🤝",
    admin: "⚙️",
    other: "👤",
  };
  return map[r] || map.other;
}

function RoleIcon({ roleType }: { roleType: string }) {
  return (
    <span aria-hidden style={{ fontSize: 17, lineHeight: 1, display: "inline-flex" }}>
      {roleIconEmoji(roleType)}
    </span>
  );
}

function influencePillStyle(level: string): React.CSSProperties {
  const base: React.CSSProperties = {
    borderRadius: 999,
    padding: "3px 8px",
    fontSize: 11,
    fontWeight: 700,
    textTransform: "capitalize",
    border: "1px solid color-mix(in srgb, var(--foreground) 9%, var(--border))",
    background: "color-mix(in srgb, var(--foreground) 3%, transparent)",
    color: "color-mix(in srgb, var(--foreground) 80%, var(--muted))",
  };
  if (level === "decision_maker")
    return {
      ...base,
      background: "color-mix(in srgb, #6366f1 16%, transparent)",
      borderColor: "color-mix(in srgb, #6366f1 38%, var(--border))",
    };
  if (level === "influencer")
    return {
      ...base,
      background: "color-mix(in srgb, #0ea5e9 14%, transparent)",
      borderColor: "color-mix(in srgb, #0284c7 32%, var(--border))",
    };
  if (level === "gatekeeper")
    return {
      ...base,
      background: "color-mix(in srgb, #f59e0b 12%, transparent)",
      borderColor: "color-mix(in srgb, #d97706 30%, var(--border))",
    };
  return base;
}

function strengthPillStyle(level: string): React.CSSProperties {
  const base: React.CSSProperties = {
    borderRadius: 999,
    padding: "3px 8px",
    fontSize: 11,
    fontWeight: 700,
    textTransform: "capitalize",
    border: "1px solid color-mix(in srgb, var(--foreground) 9%, var(--border))",
    background: "color-mix(in srgb, var(--foreground) 3%, transparent)",
    color: "color-mix(in srgb, var(--foreground) 80%, var(--muted))",
  };
  if (level === "strong")
    return {
      ...base,
      background: "color-mix(in srgb, #22c55e 14%, transparent)",
      borderColor: "color-mix(in srgb, #16a34a 32%, var(--border))",
    };
  if (level === "medium")
    return {
      ...base,
      background: "color-mix(in srgb, #eab308 12%, transparent)",
      borderColor: "color-mix(in srgb, #ca8a04 28%, var(--border))",
    };
  if (level === "weak")
    return {
      ...base,
      background: "color-mix(in srgb, var(--foreground) 8%, transparent)",
      borderColor: "color-mix(in srgb, var(--foreground) 14%, var(--border))",
    };
  return base;
}

function normalizeRelationshipStrength(raw: unknown): "strong" | "medium" | "weak" | "unknown" {
  const s = String(raw ?? "").trim().toLowerCase();
  if (s === "strong" || s === "medium" || s === "weak") return s;
  return "unknown";
}

const RELATIONSHIP_STRENGTH_DOT_HINT: Record<ReturnType<typeof normalizeRelationshipStrength>, string> = {
  strong: "Strong relationship: high trust and engagement with this contact at the organization.",
  medium: "Medium relationship: moderate depth—keep cultivating this contact.",
  weak: "Weak relationship: limited tie-in; opportunity to deepen account penetration.",
  unknown: "Relationship strength not rated yet for this contact.",
};

function RelationshipStrengthDot({ strength }: { strength: unknown }) {
  const level = normalizeRelationshipStrength(strength);
  const hint = RELATIONSHIP_STRENGTH_DOT_HINT[level];
  const fill =
    level === "strong"
      ? "#16a34a"
      : level === "medium"
        ? "#ca8a04"
        : level === "weak"
          ? "#dc2626"
          : "color-mix(in srgb, var(--muted) 70%, var(--border))";
  return (
    <span
      title={hint}
      aria-label={hint}
      role="img"
      style={{
        display: "inline-block",
        width: 10,
        height: 10,
        borderRadius: 999,
        background: fill,
        flexShrink: 0,
        boxShadow: "0 0 0 1px color-mix(in srgb, var(--foreground) 14%, transparent)",
        verticalAlign: "middle",
      }}
    />
  );
}

function roleTypeBadgeStyle(role: string): React.CSSProperties {
  const base: React.CSSProperties = {
    borderRadius: 999,
    padding: "4px 10px",
    fontSize: 11,
    fontWeight: 900,
    letterSpacing: "0.02em",
    border: "1px solid color-mix(in srgb, var(--foreground) 14%, var(--border))",
    background: "var(--surface)",
    whiteSpace: "nowrap",
  };
  if (role === "surgeon" || role === "physician_assistant")
    return {
      ...base,
      background: "color-mix(in srgb, #4f46e5 12%, var(--surface))",
      borderColor: "color-mix(in srgb, #4f46e5 32%, var(--border))",
    };
  if (role === "billing" || role === "purchasing")
    return {
      ...base,
      background: "color-mix(in srgb, #059669 11%, var(--surface))",
      borderColor: "color-mix(in srgb, #047857 28%, var(--border))",
    };
  if (["scheduler", "office_manager", "assistant", "gatekeeper"].includes(role))
    return {
      ...base,
      background: "color-mix(in srgb, #7c3aed 10%, var(--surface))",
      borderColor: "color-mix(in srgb, #6d28d9 26%, var(--border))",
    };
  return base;
}

function DoctorSupportPreview({
  support,
  narrow: _narrow,
  onRequestAddForSlot,
  onRequestRemoveRelationship,
  relationshipRemovable,
}: {
  support: SupportJoin[];
  narrow: boolean;
  /** Opens manage-support for this doctor with link type pre-filled for this row. */
  onRequestAddForSlot?: (linkRelationshipType: string) => void;
  onRequestRemoveRelationship?: (args: { relationship: Relationship; supportContact: Contact | undefined }) => void;
  relationshipRemovable?: (rel: Relationship) => boolean;
}) {
  void _narrow;
  const buckets = React.useMemo(() => bucketDoctorSupportBySlots(support), [support]);
  const IMPORTANT_EMPTY_SLOT_KEYS = new Set(["office_manager", "scheduler", "billing"]);
  const chipStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "4px 9px",
    borderRadius: 999,
    border: "1px solid color-mix(in srgb, var(--brand-600) 20%, var(--border))",
    background: "color-mix(in srgb, var(--brand-600) 6%, var(--surface))",
    color: "var(--foreground)",
    textDecoration: "none",
    fontSize: 11.5,
    fontWeight: 700,
    lineHeight: 1.2,
    whiteSpace: "normal",
    maxWidth: "100%",
    overflowWrap: "anywhere",
  };
  const addChipStyle: React.CSSProperties = {
    border: "none",
    background: "none",
    color: "var(--brand-700)",
    fontWeight: 700,
    fontSize: 11.5,
    cursor: "pointer",
    padding: "4px 2px",
    whiteSpace: "nowrap",
  };

  return (
    <div className="org-support-chip-wrap" style={{ display: "flex", flexWrap: "wrap", gap: 6 }} role="list" aria-label="Support roles for this surgeon">
      {DOCTOR_SUPPORT_SLOT_DEFS.map((slot) => {
        const matches = buckets.get(slot.slotKey) || [];
        const showAdd = matches.length === 0 && onRequestAddForSlot && IMPORTANT_EMPTY_SLOT_KEYS.has(slot.slotKey);
        if (matches.length === 0 && !showAdd) return null;
        const chips = matches.map((m) => {
          const cid = String(m.contact?.id || "");
          const nm = contactDisplayName((m.contact || {}) as Parameters<typeof contactDisplayName>[0]);
          if (!nm) return null;
          const label = `${slot.label} • ${nm}`;
          const rel = m.rel;
          const showRelMenu = Boolean(onRequestRemoveRelationship && relationshipRemovable?.(rel));
          const chipInner = cid ? (
            <Link role="listitem" href={`/portal/sales/contacts/${cid}`} style={chipStyle} className="org-support-chip">
              {label}
            </Link>
          ) : (
            <span role="listitem" style={{ ...chipStyle, cursor: "default" }} className="org-support-chip">
              {label}
            </span>
          );
          return (
            <span key={String(m.rel.id)} style={{ display: "inline-flex", alignItems: "center", gap: 4 }} className="org-support-chip-with-actions">
              {chipInner}
              {showRelMenu ? (
                <CompactActionMenu
                  align="left"
                  items={[
                    {
                      label: "Remove support link",
                      tone: "danger",
                      onClick: () =>
                        onRequestRemoveRelationship?.({ relationship: rel, supportContact: m.contact }),
                    },
                  ]}
                />
              ) : null}
            </span>
          );
        });
        return (
          <React.Fragment key={slot.slotKey}>
            {chips}
            {showAdd ? (
              <button type="button" onClick={() => onRequestAddForSlot(slot.linkRelType)} style={addChipStyle}>
                + Add {slot.label}
              </button>
            ) : null}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function parseCaseYmdLocal(s: unknown): string | null {
  if (!s || typeof s !== "string") return null;
  if (!/^\d{4}-\d{2}-\d{2}/.test(s)) return null;
  return s.slice(0, 10);
}

function todayYmdLocal(): string {
  return new Date().toISOString().slice(0, 10);
}

function caseStatusTerminal(s: unknown): boolean {
  const x = String(s || "").toLowerCase();
  return x === "closed" || x === "cancelled";
}

function splitCasesUpcomingRecent(cases: CaseRow[]): { upcoming: CaseRow[]; recent: CaseRow[] } {
  const today = todayYmdLocal();
  const nonCancelled = cases.filter((c) => String(c.status || "").toLowerCase() !== "cancelled");
  const upcoming = nonCancelled
    .filter((c) => {
      const cd = parseCaseYmdLocal(c.case_date);
      if (!cd) return false;
      if (cd < today) return false;
      return !caseStatusTerminal(c.status);
    })
    .sort((a, b) => String(parseCaseYmdLocal(a.case_date)).localeCompare(String(parseCaseYmdLocal(b.case_date))));
  const upcomingIds = new Set(upcoming.map((c) => String(c.id)));
  const recent = nonCancelled
    .filter((c) => !upcomingIds.has(String(c.id)))
    .sort((a, b) => {
      const da = parseCaseYmdLocal(a.case_date) || "";
      const db = parseCaseYmdLocal(b.case_date) || "";
      return db.localeCompare(da);
    });
  return { upcoming, recent };
}

/** Prioritize completed / closed / invoiced for the “history” block (still shows all non-upcoming). */
function sortCaseHistoryRows(rows: CaseRow[]): CaseRow[] {
  const list = [...rows];
  const rank = (c: CaseRow) => {
    const s = String(c.status || "").toLowerCase();
    if (s === "completed") return 0;
    if (s === "invoiced" || s === "closed") return 1;
    return 2;
  };
  list.sort((a, b) => {
    const ra = rank(a);
    const rb = rank(b);
    if (ra !== rb) return ra - rb;
    const da = parseCaseYmdLocal(a.case_date) || "";
    const db = parseCaseYmdLocal(b.case_date) || "";
    return db.localeCompare(da);
  });
  return list;
}

function formatMoney(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

const fieldInput: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "11px 14px",
  borderRadius: 10,
  border: "1px solid color-mix(in srgb, var(--foreground) 10%, var(--border))",
  fontSize: 14,
  background: "var(--surface)",
  color: "var(--foreground)",
};

const TAB_DEFS: Array<{ id: OrgTab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "contacts", label: "Providers" },
  { id: "cases", label: "Cases" },
  { id: "billing", label: "Billing" },
  { id: "product_approvals", label: "Product Approvals" },
  { id: "notes", label: "Notes" },
  { id: "activity", label: "Activity" },
];

const CASE_TAB_FILTERS: Array<{ id: string; label: string }> = [
  { id: "", label: "All" },
  { id: "active", label: "Active pipeline" },
  { id: "scheduled", label: "Scheduled" },
  { id: "confirmed", label: "Confirmed" },
  { id: "completed", label: "Completed" },
  { id: "docs_needed", label: "Docs needed" },
  { id: "billing_review", label: "Billing review" },
  { id: "closed", label: "Closed / invoiced" },
];

const CASE_RECORD_SCOPE_FILTERS: Array<{ id: "active" | "archived" | "all"; label: string }> = [
  { id: "active", label: "Active" },
  { id: "archived", label: "Archived" },
  { id: "all", label: "All" },
];

const CRM_SKEL_STYLE = `
@keyframes crm-skel-pulse {
  0%, 100% { opacity: 0.52; }
  50% { opacity: 0.92; }
}
`;

function skelRect(h: number, w?: string | number, br = 12): React.CSSProperties {
  const width = w == null ? "100%" : typeof w === "number" ? `${w}px` : w;
  return {
    height: h,
    width,
    borderRadius: br,
    background: "color-mix(in srgb, var(--foreground) 9%, var(--border))",
    animation: "crm-skel-pulse 1.05s ease-in-out infinite",
  };
}

function OrgMetricCardsSkeleton({ narrow }: { narrow: boolean }) {
  return (
    <div
      style={
        narrow
          ? { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 0 }
          : { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10, marginTop: 14 }
      }
    >
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} style={{ minWidth: 0, borderRadius: 14, border: "1px solid color-mix(in srgb, var(--foreground) 8%, var(--border))", padding: 14, background: "var(--surface)" }}>
          <div style={{ ...skelRect(11, "52%"), marginBottom: 10 }} />
          <div style={skelRect(26, "72%")} />
          <div style={{ ...skelRect(9, "88%"), marginTop: 8 }} />
        </div>
      ))}
    </div>
  );
}

function OrgContactsTabSkeleton({ narrow }: { narrow: boolean }) {
  return (
    <SalesPanel density="compact" nativeFlat={narrow} title="Providers & contacts">
      <div style={{ ...skelRect(44, narrow ? "100%" : 200), marginBottom: 14 }} />
      <div style={{ display: "grid", gridTemplateColumns: narrow ? "1fr" : "repeat(auto-fill, minmax(300px, 1fr))", gap: 12 }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            style={{
              borderRadius: 16,
              border: "1px solid color-mix(in srgb, var(--brand-600) 20%, var(--border))",
              padding: 16,
              display: "grid",
              gap: 12,
              background: "linear-gradient(165deg, color-mix(in srgb, var(--brand-600) 6%, var(--surface)), var(--surface))",
            }}
          >
            <div style={{ display: "flex", gap: 10 }}>
              <div style={skelRect(40, 40, 10)} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ ...skelRect(18, "75%"), marginBottom: 8 }} />
                <div style={{ ...skelRect(14, "40%") }} />
              </div>
            </div>
            <div style={{ ...skelRect(14, "100%") }} />
            <div style={{ display: "flex", gap: 8 }}>
              <div style={{ ...skelRect(36, 100, 10) }} />
              <div style={{ ...skelRect(36, 100, 10) }} />
            </div>
          </div>
        ))}
      </div>
    </SalesPanel>
  );
}

function OrgCasesTabSkeleton({ narrow }: { narrow: boolean }) {
  return (
    <SalesPanel density="compact" nativeFlat={narrow} title="Cases">
      <div
        style={{
          borderRadius: 16,
          border: "1px solid var(--crm-card-edge, color-mix(in srgb, var(--foreground) 8%, var(--border)))",
          padding: narrow ? 12 : 16,
          marginBottom: 18,
        }}
      >
        <div style={{ ...skelRect(12, 120), marginBottom: 12 }} />
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} style={{ ...skelRect(36, 96, 999) }} />
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: narrow ? "1fr" : "repeat(2, 1fr)", gap: 12, marginTop: 14 }}>
          <div style={skelRect(44)} />
          <div style={skelRect(44)} />
        </div>
      </div>
      <div style={{ display: "grid", gap: 12 }}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            style={{
              borderRadius: 16,
              border: "1px solid var(--crm-card-edge, color-mix(in srgb, var(--foreground) 10%, var(--border)))",
              padding: 16,
              display: "grid",
              gap: 10,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
              <div style={{ ...skelRect(20, "40%") }} />
              <div style={{ ...skelRect(24, 72, 999) }} />
            </div>
            <div style={{ ...skelRect(14, "55%") }} />
            <div style={{ ...skelRect(14, "88%") }} />
          </div>
        ))}
      </div>
    </SalesPanel>
  );
}

function OrgOverviewSkeleton({ narrow }: { narrow: boolean }) {
  return (
    <div style={{ display: "grid", gap: narrow ? 8 : 10 }}>
      {!narrow ? <OrgMetricCardsSkeleton narrow={narrow} /> : null}
      <div style={{ display: "grid", gap: narrow ? 8 : 10, gridTemplateColumns: narrow ? "1fr" : "minmax(0, 1fr) minmax(0, 1fr)" }}>
        <SalesPanel density="compact" nativeFlat={narrow} title="Quick actions">
          <div style={{ display: "grid", gap: 10 }}>
            <div style={skelRect(48)} />
            <div style={skelRect(48)} />
            <div style={skelRect(48)} />
          </div>
        </SalesPanel>
        <SalesPanel density="compact" nativeFlat={narrow} title="Account snapshot">
          <div style={{ display: "grid", gap: 12 }}>
            <div style={skelRect(16)} />
            <div style={skelRect(16)} />
            <div style={{ ...skelRect(14, "100%") }} />
          </div>
        </SalesPanel>
      </div>
      <SalesPanel density="compact" nativeFlat={narrow} title="Case activity">
        <div style={{ display: "grid", gap: 12, gridTemplateColumns: narrow ? "1fr" : "1fr 1fr" }}>
          {Array.from({ length: 2 }).map((_, col) => (
            <div key={col} style={{ display: "grid", gap: 8 }}>
              <div style={{ ...skelRect(12, 100), marginBottom: 4 }} />
              {Array.from({ length: 3 }).map((__, i) => (
                <div key={i} style={{ ...skelRect(72, "100%", 14) }} />
              ))}
            </div>
          ))}
        </div>
      </SalesPanel>
      <SalesPanel density="compact" nativeFlat={narrow} title="Recent activity">
        <div style={{ display: "grid", gap: 10 }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} style={{ display: "flex", gap: 12 }}>
              <div style={skelRect(40, 40, 12)} />
              <div style={{ flex: 1 }}>
                <div style={{ ...skelRect(16, "70%"), marginBottom: 8 }} />
                <div style={{ ...skelRect(13, "95%") }} />
              </div>
            </div>
          ))}
        </div>
      </SalesPanel>
    </div>
  );
}

function OrgAccountBootstrapSkeleton({
  activeTab,
  narrow,
  accountId,
}: {
  activeTab: OrgTab;
  narrow: boolean;
  accountId: string;
}) {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CRM_SKEL_STYLE }} />
      <div
        className="org-account-detail-root org-workspace-page sc-native-page org-account-detail-native"
        style={{
          display: "grid",
          gap: narrow ? 8 : 11,
          paddingBottom: narrow ? "calc(108px + env(safe-area-inset-bottom, 0px))" : 12,
          width: "100%",
          maxWidth: "100%",
          minWidth: 0,
          overflowX: "hidden",
          boxSizing: "border-box",
        }}
      >
        {!narrow ? (
          <div
            style={{
              borderRadius: 18,
              padding: "22px 22px 20px",
              background:
                "linear-gradient(135deg, color-mix(in srgb, var(--brand-600) 42%, #0f172a) 0%, color-mix(in srgb, #0f172a 88%, var(--brand-600)) 45%, color-mix(in srgb, var(--brand-600) 28%, #020617) 100%)",
              border: "1px solid color-mix(in srgb, white 14%, transparent)",
              color: "#f8fafc",
            }}
          >
            <div style={{ ...skelRect(14, 180), background: "rgba(255,255,255,0.18)", marginBottom: 12 }} />
            <div style={{ ...skelRect(36, "min(420px, 88%)"), background: "rgba(255,255,255,0.22)", marginBottom: 12 }} />
            <div style={{ display: "flex", gap: 8 }}>
              <div style={{ ...skelRect(28, 100, 999), background: "rgba(255,255,255,0.16)" }} />
              <div style={{ ...skelRect(28, 120, 999), background: "rgba(255,255,255,0.16)" }} />
            </div>
          </div>
        ) : (
          <div style={{ padding: "8px 0 0" }}>
            <div style={{ ...skelRect(22, "70%"), marginBottom: 10 }} />
            <OrgMetricCardsSkeleton narrow />
          </div>
        )}

        <div
          className="org-account-tabs"
          style={{
            display: "flex",
            gap: 8,
            flexWrap: narrow ? "nowrap" : "wrap",
            overflowX: narrow ? "auto" : undefined,
            paddingBottom: 4,
            marginTop: narrow ? 0 : 0,
            scrollbarWidth: "none",
          }}
        >
          {TAB_DEFS.map((t) => {
            const on = activeTab === t.id;
            return (
              <div
                key={t.id}
                style={{
                  flex: "0 0 auto",
                  borderRadius: 999,
                  padding: narrow ? "8px 13px" : "9px 16px",
                  fontSize: narrow ? 12 : 13,
                  fontWeight: 800,
                  border: on ? "1px solid color-mix(in srgb, var(--brand-600) 45%, var(--border))" : "1px solid color-mix(in srgb, var(--foreground) 10%, var(--border))",
                  background: on
                    ? "linear-gradient(165deg, color-mix(in srgb, var(--brand-600) 16%, var(--surface)), var(--surface))"
                    : "color-mix(in srgb, var(--foreground) 4%, var(--surface))",
                  color: "var(--foreground)",
                  opacity: on ? 1 : 0.75,
                }}
              >
                {t.label}
              </div>
            );
          })}
        </div>

        {activeTab === "overview" ? (
          <OrgOverviewSkeleton narrow={narrow} />
        ) : activeTab === "contacts" ? (
          <OrgContactsTabSkeleton narrow={narrow} />
        ) : activeTab === "cases" ? (
          <OrgCasesTabSkeleton narrow={narrow} />
        ) : activeTab === "billing" ? (
          <SalesPanel density="compact" nativeFlat={narrow} title="Billing & documents">
            <div style={{ display: "grid", gridTemplateColumns: narrow ? "1fr" : "repeat(3, 1fr)", gap: 10, marginBottom: 16 }}>
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} style={{ borderRadius: 14, border: "1px solid color-mix(in srgb, var(--foreground) 8%, var(--border))", padding: 14 }}>
                  <div style={{ ...skelRect(12, "55%"), marginBottom: 10 }} />
                  <div style={skelRect(28, "40%")} />
                </div>
              ))}
            </div>
            <div style={skelRect(120)} />
          </SalesPanel>
        ) : activeTab === "product_approvals" ? (
          <SalesPanel density="compact" nativeFlat={narrow} title="Product approvals">
            <div style={{ display: "grid", gridTemplateColumns: narrow ? "1fr 1fr" : "repeat(4, 1fr)", gap: 10, marginBottom: 16 }}>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} style={{ borderRadius: 14, border: "1px solid color-mix(in srgb, var(--foreground) 8%, var(--border))", padding: 14 }}>
                  <div style={{ ...skelRect(12, "55%"), marginBottom: 10 }} />
                  <div style={skelRect(28, "40%")} />
                </div>
              ))}
            </div>
            <div style={skelRect(180)} />
          </SalesPanel>
        ) : activeTab === "notes" ? (
          <SalesPanel density="compact" nativeFlat={narrow} title="Organization notes">
            <div style={{ ...skelRect(96), marginBottom: 16 }} />
            <div style={{ display: "grid", gap: 10 }}>
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} style={{ borderRadius: 14, border: "1px solid color-mix(in srgb, var(--foreground) 8%, var(--border))", padding: 14 }}>
                  <div style={{ ...skelRect(14, "90%"), marginBottom: 8 }} />
                  <div style={skelRect(12, "40%")} />
                </div>
              ))}
            </div>
          </SalesPanel>
        ) : (
          <SalesPanel density="compact" nativeFlat={narrow} title="Activity timeline">
            <div style={{ display: "grid", gap: 12 }}>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} style={{ display: "flex", gap: 12 }}>
                  <div style={skelRect(40, 40, 12)} />
                  <div style={{ flex: 1 }}>
                    <div style={{ ...skelRect(15, "65%"), marginBottom: 8 }} />
                    <div style={{ ...skelRect(13, "90%") }} />
                  </div>
                </div>
              ))}
            </div>
          </SalesPanel>
        )}

        <p role="status" style={{ margin: 0, fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>
          Loading this organization…
        </p>
      </div>
    </>
  );
}

function SalesToastStack({ items }: { items: { id: string; message: string }[] }) {
  if (!items.length) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        bottom: 24,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 10050,
        display: "grid",
        gap: 8,
        maxWidth: "min(420px, calc(100vw - 24px))",
        pointerEvents: "none",
      }}
    >
      {items.map((t) => (
        <div
          key={t.id}
          style={{
            padding: "12px 18px",
            borderRadius: 14,
            fontWeight: 750,
            fontSize: 14,
            color: "#f0fdf4",
            background: "linear-gradient(165deg, color-mix(in srgb, #15803d 92%, #14532d), #166534)",
            border: "1px solid color-mix(in srgb, #4ade80 45%, transparent)",
            boxShadow: "0 12px 32px color-mix(in srgb, #000 22%, transparent)",
          }}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}

function newItemGlowBox(active: boolean): React.CSSProperties {
  if (!active) return {};
  return {
    boxShadow:
      "0 0 0 2px color-mix(in srgb, var(--brand-600) 72%, transparent), 0 10px 28px color-mix(in srgb, var(--brand-600) 18%, transparent)",
    transition: "box-shadow 0.4s ease",
  };
}

function caseMatchesCaseTabFilter(c: CaseRow, filterId: string): boolean {
  if (!filterId) return true;
  const st = String(c.status || "").toLowerCase();
  if (filterId === "active") return !["closed", "cancelled", "invoiced"].includes(st);
  if (filterId === "completed") return st === "completed";
  if (filterId === "closed") return st === "closed" || st === "invoiced";
  return st === filterId;
}

function orgCaseCanMarkComplete(status: unknown): boolean {
  const st = String(status || "").toLowerCase();
  return !["completed", "closed", "cancelled", "invoiced"].includes(st);
}

function AttentionNavRow({
  href,
  title,
  badge,
  urgency,
}: {
  href: string;
  title: string;
  badge?: string;
  urgency: "critical" | "warning";
}) {
  const accent = urgency === "critical" ? "#dc2626" : "#ca8a04";
  const wash =
    urgency === "critical"
      ? "color-mix(in srgb, #dc2626 8%, var(--surface))"
      : "color-mix(in srgb, #ca8a04 9%, var(--surface))";
  return (
    <Link
      href={href}
      style={{
        display: "grid",
        gridTemplateColumns: "1fr auto",
        gap: 8,
        alignItems: "center",
        padding: "10px 12px",
        borderRadius: 12,
        border: "1px solid color-mix(in srgb, var(--foreground) 5%, var(--border))",
        borderLeft: `3px solid ${accent}`,
        background: wash,
        textDecoration: "none",
        color: "var(--foreground)",
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 850, fontSize: 14, letterSpacing: "-0.02em" }}>{title}</div>
      </div>
      {badge ? (
        <span
          style={{
            fontWeight: 900,
            fontSize: 13,
            padding: "6px 11px",
            borderRadius: 999,
            background: "color-mix(in srgb, var(--foreground) 7%, var(--surface))",
            border: `1px solid color-mix(in srgb, ${accent} 35%, var(--border))`,
            color: accent,
            flexShrink: 0,
          }}
        >
          {badge}
        </span>
      ) : (
        <span style={{ fontSize: 18, color: accent, fontWeight: 900 }} aria-hidden>
          →
        </span>
      )}
    </Link>
  );
}

export default function SurgicalCrmAccountDetailPortalClient({ accountId }: { accountId: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeTab = parseOrgTab(searchParams.get("tab"));

  const setTab = React.useCallback(
    (t: OrgTab) => {
      const p = new URLSearchParams(searchParams.toString());
      if (t === "overview") p.delete("tab");
      else p.set("tab", t);
      router.replace(`${pathname}?${p.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const [meId, setMeId] = React.useState<string | null>(null);
  const [viewerIsAdmin, setViewerIsAdmin] = React.useState(false);
  const [account, setAccount] = React.useState<Account | null>(null);
  const [contacts, setContacts] = React.useState<Contact[]>([]);
  const [relationships, setRelationships] = React.useState<Relationship[]>([]);
  const [cases, setCases] = React.useState<CaseRow[]>([]);
  const [opportunities, setOpportunities] = React.useState<LinkedOpportunitySummary[]>([]);
  const [accountIntel, setAccountIntel] = React.useState<AccountIntelligence | null>(null);
  const [activityFeed, setActivityFeed] = React.useState<OrgActivityFeedItem[]>([]);
  const [organizationNotes, setOrganizationNotes] = React.useState<OrgStatusNote[]>([]);
  const [activityFeedKindFilter, setActivityFeedKindFilter] = React.useState<ActivityKindFilter>("");
  const [err, setErr] = React.useState<string | null>(null);
  const [contactModal, setContactModal] = React.useState<Contact | "new" | null>(null);
  const [newContactRolePreset, setNewContactRolePreset] = React.useState<string | undefined>(undefined);
  const [supportManagerDoctorId, setSupportManagerDoctorId] = React.useState<string | null>(null);
  const [supportModalPreferredRelType, setSupportModalPreferredRelType] = React.useState<string | null>(null);
  const [orgCaseStatusBusyId, setOrgCaseStatusBusyId] = React.useState<string | null>(null);
  const [orgCaseCompleteTarget, setOrgCaseCompleteTarget] = React.useState<CaseRow | null>(null);
  const [orgCaseCompleteErr, setOrgCaseCompleteErr] = React.useState<string | null>(null);
  const [orgArchiveConfirm, setOrgArchiveConfirm] = React.useState<null | "archive" | "restore">(null);
  const [orgArchiveBusy, setOrgArchiveBusy] = React.useState(false);
  const [orgEditOpen, setOrgEditOpen] = React.useState(false);
  const [contactArchiveTarget, setContactArchiveTarget] = React.useState<Contact | null>(null);
  const [contactArchiveBusy, setContactArchiveBusy] = React.useState(false);
  const [contactArchiveError, setContactArchiveError] = React.useState<string | null>(null);
  const [relRemoveTarget, setRelRemoveTarget] = React.useState<null | { relId: string; message: string }>(null);
  const [relRemoveBusy, setRelRemoveBusy] = React.useState(false);
  const captureIntelligence = useCaptureIntelligence();

  const closeContactModal = React.useCallback(() => {
    setContactModal(null);
    setNewContactRolePreset(undefined);
  }, []);

  const openNewContact = React.useCallback((rolePreset?: string) => {
    setNewContactRolePreset(rolePreset);
    setContactModal("new");
  }, []);
  const [search, setSearch] = React.useState("");
  const [roleFilter, setRoleFilter] = React.useState("");
  const [influenceFilter, setInfluenceFilter] = React.useState("");
  const [strengthFilter, setStrengthFilter] = React.useState("");
  const [caseStatusFilter, setCaseStatusFilter] = React.useState("");
  const [caseProductFilter, setCaseProductFilter] = React.useState("");
  const [caseSurgeonFilter, setCaseSurgeonFilter] = React.useState("");
  const [caseDateFrom, setCaseDateFrom] = React.useState("");
  const [caseDateTo, setCaseDateTo] = React.useState("");
  const [caseRecordScope, setCaseRecordScope] = React.useState<"active" | "archived" | "all">("active");
  const [caseGapFilter, setCaseGapFilter] = React.useState<"" | "missing_po" | "missing_invoice">("");
  const [narrow, setNarrow] = React.useState(false);
  /** Mobile bottom action bar shrinks slightly while scrolling down. */
  const [mobileActionBarCompact, setMobileActionBarCompact] = React.useState(false);
  /** Viewports below this width use case cards for history (avoids 920px table vs sidebar + padding). */
  const [wideCaseTableLayout, setWideCaseTableLayout] = React.useState(true);
  const [orgBootstrapLoading, setOrgBootstrapLoading] = React.useState(true);
  const [toasts, setToasts] = React.useState<{ id: string; message: string }[]>([]);
  const [pulseContactId, setPulseContactId] = React.useState<string | null>(null);
  const [pulseCaseId, setPulseCaseId] = React.useState<string | null>(null);
  const processedHighlightCaseId = React.useRef<string | null>(null);

  const pushToast = React.useCallback((message: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    setToasts((prev) => [...prev, { id, message }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  }, []);

  const flashContactHighlight = React.useCallback((id: string) => {
    setPulseContactId(id);
    window.setTimeout(() => {
      setPulseContactId((cur) => (cur === id ? null : cur));
    }, 4200);
  }, []);

  const flashCaseHighlight = React.useCallback((id: string) => {
    setPulseCaseId(id);
    window.setTimeout(() => {
      setPulseCaseId((cur) => (cur === id ? null : cur));
    }, 4200);
  }, []);

  const orgArchiveEligible = React.useMemo(() => {
    return Boolean(meId && account);
  }, [meId, account]);

  const canArchiveThisContact = React.useCallback(
    (_c: Contact) => {
      return Boolean(meId);
    },
    [meId],
  );

  const canRemoveThisRelationship = React.useCallback(
    (_rel: Relationship) => {
      return Boolean(meId);
    },
    [meId],
  );

  const load = React.useCallback(async () => {
    setErr(null);
    try {
      const [meRes, dRes] = await Promise.all([
        fetch("/api/portal/me", { cache: "no-store" }),
        fetch(`/api/portal/sales/surgical-accounts/${accountId}`, { cache: "no-store" }),
      ]);
      const meJson = await readResponseJson<{ ok?: boolean; user?: { id?: string; is_admin?: boolean } }>(meRes);
      if (meJson.ok && meJson.user?.id) setMeId(meJson.user.id);
      if (meJson.ok) setViewerIsAdmin(meJson.user?.is_admin === true);

      const json = await readResponseJson<{
        ok?: boolean;
        account?: Account;
        contacts?: Contact[];
        relationships?: Relationship[];
        cases?: CaseRow[];
        opportunities?: LinkedOpportunitySummary[];
        account_intelligence?: AccountIntelligence | null;
        account_activity_feed?: OrgActivityFeedItem[];
        organization_notes?: OrgStatusNote[];
        error?: string;
      }>(dRes);
      if (!json.ok) throw new Error(json.error || "");
      setAccount(json.account || null);
      setContacts(json.contacts || []);
      setRelationships(json.relationships || []);
      setCases(json.cases || []);
      setOpportunities(Array.isArray(json.opportunities) ? json.opportunities : []);
      setAccountIntel(json.account_intelligence ?? null);
      setActivityFeed(Array.isArray(json.account_activity_feed) ? json.account_activity_feed : []);
      setOrganizationNotes(Array.isArray(json.organization_notes) ? json.organization_notes : []);
    } catch (e: unknown) {
      setErr(userFacingError(e, "Something went wrong. Please try again."));
    } finally {
      setOrgBootstrapLoading(false);
    }
  }, [accountId]);

  const markOrgCaseComplete = React.useCallback(
    async (c: CaseRow) => {
      const id = String(c.id || "");
      if (!id || !orgCaseCanMarkComplete(c.status)) return;
      if ((c as { archived_at?: string | null }).archived_at) {
        window.alert("Restore this case before changing status.");
        return;
      }
      setOrgCaseCompleteErr(null);
      setOrgCaseCompleteTarget(c);
    },
    [],
  );

  React.useEffect(() => {
    void load();
  }, [load]);

  React.useEffect(() => {
    processedHighlightCaseId.current = null;
  }, [accountId]);

  const stripAttentionFromUrl = React.useCallback(() => {
    const p = new URLSearchParams(searchParams.toString());
    if (!p.has("att")) return;
    p.delete("att");
    setCaseGapFilter("");
    const qs = p.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  React.useEffect(() => {
    const a = searchParams.get("att");
    if (!a) return;
    if (a === "missing_po") {
      setCaseGapFilter("missing_po");
      setCaseStatusFilter("");
    } else if (a === "missing_invoice") {
      setCaseGapFilter("missing_invoice");
      setCaseStatusFilter("");
    } else if (a === "docs_needed") {
      setCaseGapFilter("");
      setCaseStatusFilter("docs_needed");
    } else if (a === "no_upcoming") {
      setCaseGapFilter("");
      setCaseStatusFilter("");
    }
  }, [searchParams]);

  React.useEffect(() => {
    const hc = (searchParams.get("highlight_case") || "").trim();
    if (!hc || !account) return;
    if (processedHighlightCaseId.current === hc) return;
    processedHighlightCaseId.current = hc;
    const p = new URLSearchParams(searchParams.toString());
    p.delete("highlight_case");
    const qs = p.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    void (async () => {
      await load();
      pushToast("Case created");
      flashCaseHighlight(hc);
    })();
  }, [account, flashCaseHighlight, load, pathname, pushToast, router, searchParams]);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 1024px)");
    const apply = () => setNarrow(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(min-width: 1025px)");
    const apply = () => setWideCaseTableLayout(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const mobileBarScrollYRef = React.useRef(0);
  React.useEffect(() => {
    if (typeof window === "undefined" || !narrow) {
      setMobileActionBarCompact(false);
      return;
    }
    const onScroll = () => {
      const y = window.scrollY;
      const prev = mobileBarScrollYRef.current;
      if (y < 20) {
        setMobileActionBarCompact(false);
      } else if (y > prev + 12) {
        setMobileActionBarCompact(true);
      } else if (y < prev - 12) {
        setMobileActionBarCompact(false);
      }
      mobileBarScrollYRef.current = y;
    };
    mobileBarScrollYRef.current = window.scrollY;
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [narrow]);

  const filteredActivityFeed = React.useMemo(() => {
    if (!activityFeedKindFilter) return activityFeed;
    return activityFeed.filter((i) => i.feed_kind === activityFeedKindFilter);
  }, [activityFeed, activityFeedKindFilter]);

  const useCaseCardsForHistory = narrow || !wideCaseTableLayout;
  const useMultiColumnCaseGrid = !narrow && wideCaseTableLayout;

  const contactsSearchRef = React.useRef<HTMLInputElement | null>(null);

  const focusContactsSearch = React.useCallback(() => {
    setTab("contacts");
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        const el = contactsSearchRef.current;
        if (el) {
          el.focus();
          try {
            el.scrollIntoView({ block: "center", behavior: "smooth" });
          } catch {
            el.scrollIntoView({ block: "center" });
          }
        }
      });
    });
  }, [setTab]);

  const focusContactOpenedRef = React.useRef(false);
  const newContactOpenedRef = React.useRef(false);

  React.useEffect(() => {
    focusContactOpenedRef.current = false;
    newContactOpenedRef.current = false;
  }, [accountId]);

  React.useEffect(() => {
    if (focusContactOpenedRef.current) return;
    const fc = (searchParams.get("focus_contact") || "").trim();
    if (!fc || contacts.length === 0) return;
    const hit = contacts.find((c) => String(c.id) === fc);
    if (hit) {
      setNewContactRolePreset(undefined);
      setContactModal(hit);
      if (parseOrgTab(searchParams.get("tab")) !== "contacts") {
        const p = new URLSearchParams(searchParams.toString());
        p.set("tab", "contacts");
        router.replace(`${pathname}?${p.toString()}`, { scroll: false });
      }
      focusContactOpenedRef.current = true;
    }
  }, [searchParams, contacts, pathname, router]);

  React.useEffect(() => {
    if (newContactOpenedRef.current) return;
    const nc = (searchParams.get("new_contact") || "").trim();
    if (nc !== "1") return;
    newContactOpenedRef.current = true;
    const rolePreset = (searchParams.get("role") || "").trim();
    setNewContactRolePreset(rolePreset || undefined);
    setContactModal("new");
    const p = new URLSearchParams(searchParams.toString());
    p.delete("new_contact");
    p.delete("role");
    p.set("tab", "contacts");
    router.replace(`${pathname}?${p.toString()}`, { scroll: false });
  }, [searchParams, pathname, router]);

  React.useEffect(() => {
    if (!account) return;
    const t = organizationAccountTitle(account);
    document.title = t ? `${t} · Organization` : "Organization";
  }, [account]);

  const casesActiveForOverview = React.useMemo(
    () => cases.filter((c) => !(c as { archived_at?: string | null }).archived_at),
    [cases],
  );

  const upcomingCases = React.useMemo(() => splitCasesUpcomingRecent(casesActiveForOverview).upcoming, [casesActiveForOverview]);

  const overviewUpcomingCases = React.useMemo(() => upcomingCases.slice(0, 3), [upcomingCases]);

  const overviewRecentCases = React.useMemo(() => {
    const { recent } = splitCasesUpcomingRecent(casesActiveForOverview);
    return recent.slice(0, 3);
  }, [casesActiveForOverview]);

  const casesFiltered = React.useMemo(() => {
    return cases.filter((c) => {
      const arch = (c as { archived_at?: string | null }).archived_at;
      if (caseRecordScope === "active" && arch) return false;
      if (caseRecordScope === "archived" && !arch) return false;
      if (caseStatusFilter && !caseMatchesCaseTabFilter(c, caseStatusFilter)) return false;
      if (caseGapFilter === "missing_po" && !Boolean((c as { missing_po?: boolean }).missing_po)) return false;
      if (caseGapFilter === "missing_invoice" && !Boolean((c as { missing_invoice?: boolean }).missing_invoice)) return false;
      if (caseProductFilter) {
        const pid = String((c as { product_id?: string }).product_id || "");
        if (pid !== caseProductFilter) return false;
      }
      if (caseSurgeonFilter) {
        const sid = String((c as { surgeon_contact_id?: string }).surgeon_contact_id || "");
        if (sid !== caseSurgeonFilter) return false;
      }
      if (caseDateFrom) {
        const cd = parseCaseYmdLocal(c.case_date);
        if (!cd || cd < caseDateFrom) return false;
      }
      if (caseDateTo) {
        const cd = parseCaseYmdLocal(c.case_date);
        if (!cd || cd > caseDateTo) return false;
      }
      return true;
    });
  }, [cases, caseRecordScope, caseStatusFilter, caseGapFilter, caseProductFilter, caseSurgeonFilter, caseDateFrom, caseDateTo]);

  const { upcoming: upcomingCasesFiltered, recent: recentCasesRaw } = React.useMemo(
    () => splitCasesUpcomingRecent(casesFiltered),
    [casesFiltered],
  );
  const recentCasesFiltered = React.useMemo(() => sortCaseHistoryRows(recentCasesRaw), [recentCasesRaw]);

  const caseProductOptions = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const c of cases) {
      const id = String((c as { product_id?: string }).product_id || "");
      const name = String((c as { product_name?: string | null }).product_name || "").trim();
      if (id) map.set(id, name || id);
    }
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [cases]);

  const caseSurgeonOptions = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const c of cases) {
      const id = String((c as { surgeon_contact_id?: string }).surgeon_contact_id || "");
      const dis = String((c as { surgeon_display?: string | null }).surgeon_display || "").trim();
      if (id) map.set(id, dis || "Surgeon");
    }
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [cases]);

  const filteredContacts = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return contacts.filter((c) => {
      if (q) {
        const values = [
          contactDisplayName(c as Parameters<typeof contactDisplayName>[0]),
          String(c.title || ""),
          String(c.email || ""),
          String(c.phone || ""),
          String(c.mobile_phone || ""),
        ].map((v) => v.toLowerCase());
        if (!values.some((v) => v.includes(q))) return false;
      }
      if (roleFilter && String(c.role_type || "") !== roleFilter) return false;
      if (influenceFilter && String(c.influence_level || "unknown") !== influenceFilter) return false;
      if (strengthFilter && String(c.relationship_strength || "unknown") !== strengthFilter) return false;
      return true;
    });
  }, [contacts, search, roleFilter, influenceFilter, strengthFilter]);

  const doctors = React.useMemo(
    () => filteredContacts.filter((c) => ["surgeon", "physician_assistant"].includes(String(c.role_type || ""))),
    [filteredContacts],
  );

  const needsAttentionMetrics = React.useMemo(() => {
    const missingPo = cases.filter((c) => Boolean((c as { missing_po?: boolean }).missing_po)).length;
    const missingInvoice = cases.filter((c) => Boolean((c as { missing_invoice?: boolean }).missing_invoice)).length;
    const docsNeeded = cases.filter((c) => String(c.status || "").toLowerCase() === "docs_needed").length;
    const noUpcoming = cases.length > 0 && upcomingCases.length === 0;
    return { missingPo, missingInvoice, docsNeeded, noUpcoming };
  }, [cases, upcomingCases]);

  const hasBillingContact = React.useMemo(
    () => contacts.some((c) => ["billing", "purchasing"].includes(String(c.role_type || ""))),
    [contacts],
  );
  const billingDetailsMissing = React.useMemo(
    () => (account ? isOrganizationBillingIncomplete(account, { hasBillingContact }) : false),
    [account, hasBillingContact],
  );
  const billingDetailsMessage = React.useMemo(
    () => organizationBillingDetailsMessage({ contactCount: contacts.length, hasBillingContact }),
    [contacts.length, hasBillingContact],
  );

  type NextBestActionItem =
    | { id: string; title: string; body: string; cta: string; href: string }
    | { id: string; title: string; body: string; cta: string; kind: "add_surgeon" };

  const nextBestActions = React.useMemo((): NextBestActionItem[] => {
    const surgeonCt = contacts.filter((c) => ["surgeon", "physician_assistant"].includes(String(c.role_type || ""))).length;
    const list: NextBestActionItem[] = [];
    const firstPo = cases.find((c) => Boolean((c as { missing_po?: boolean }).missing_po));

    if (surgeonCt === 0) {
      list.push({
        id: "add_surgeon",
        title: "Add a surgeon",
        body: "Add a doctor or PA on this account so you can create cases and map their support network.",
        cta: "Add surgeon",
        kind: "add_surgeon",
      });
    }

    if (billingDetailsMissing) {
      list.push({
        id: "billing_details",
        title: "Complete billing details",
        body: billingDetailsMessage,
        cta: hasBillingContact ? "Add billing address" : "Add billing contact",
        href: hasBillingContact ? `${pathname}?tab=billing` : `${pathname}?tab=contacts&new_contact=1&role=billing`,
      });
    }

    if (needsAttentionMetrics.missingPo > 0 && firstPo?.id) {
      const n = needsAttentionMetrics.missingPo;
      const pid = String(firstPo.id);
      list.push({
        id: "upload_po",
        title: "Upload purchase orders",
        body:
          n === 1
            ? "A case is missing a PO—upload it to unblock billing and document checks."
            : `${n} cases are missing a PO. Start with the next one in your queue.`,
        cta: "Upload PO",
        href: `/portal/sales/cases/${encodeURIComponent(pid)}?upload=purchase_order`,
      });
    }

    const needSchedule = surgeonCt > 0 && (cases.length === 0 || upcomingCases.length === 0);
    if (needSchedule) {
      list.push({
        id: "schedule_case",
        title: cases.length === 0 ? "Schedule your first case" : "Schedule the next case",
        body:
          cases.length === 0
            ? "Get a procedure on the calendar to track products, documents, and revenue for this account."
            : "Nothing is on the calendar after today—add a case to keep pipeline momentum.",
        cta: "Schedule a case",
        href: `/portal/sales/cases/new?account_id=${encodeURIComponent(accountId)}`,
      });
    }

    return list.slice(0, 3);
  }, [
    accountId,
    billingDetailsMessage,
    billingDetailsMissing,
    cases,
    contacts,
    hasBillingContact,
    needsAttentionMetrics.missingPo,
    pathname,
    upcomingCases.length,
  ]);

  const attentionHref = React.useCallback(
    (att: string, tab: OrgTab) => {
      const p = new URLSearchParams();
      p.set("tab", tab);
      p.set("att", att);
      return `${pathname}?${p.toString()}`;
    },
    [pathname],
  );

  const contactById = React.useMemo(() => new Map(contacts.map((c) => [String(c.id), c])), [contacts]);

  const supportNetwork = React.useMemo(
    () =>
      filteredContacts.filter((c) =>
        ["scheduler", "office_manager", "assistant", "gatekeeper", "nurse", "admin"].includes(String(c.role_type || "")),
      ),
    [filteredContacts],
  );

  const doctorSupport = React.useCallback(
    (doctorId: string) =>
      relationships
        .filter((r) => String(r.primary_contact_id || "") === doctorId)
        .map((r) => ({ rel: r, contact: contactById.get(String(r.related_contact_id || "")) }))
        .filter((x) => !!x.contact),
    [relationships, contactById],
  );

  const doctorsForSupport = React.useCallback(
    (supportId: string) =>
      relationships
        .filter((r) => String(r.related_contact_id || "") === supportId)
        .map((r) => ({ rel: r, contact: contactById.get(String(r.primary_contact_id || "")) }))
        .filter((x) => !!x.contact),
    [relationships, contactById],
  );

  const contactNeedsAttentionRows = React.useMemo(() => {
    // Contact metadata (relationship strength, support links) is optional reference — not rep action items.
    return [] as Array<{ key: string; href: string; title: string; urgency: "critical" | "warning" }>;
  }, []);

  if (err && !account) {
    return (
      <SalesCommandPage density="tight" titleTone="onDark" kicker="" title="Organization" subtitle="">
        <div style={sc.alertError}>{err}</div>
        <Link href="/portal/sales/accounts" style={{ ...sc.linkBrand, color: "#7dd3fc", marginTop: 12, display: "inline-block" }}>
          ← Back to organizations
        </Link>
      </SalesCommandPage>
    );
  }
  if (!account) {
    if (orgBootstrapLoading) {
      return (
        <SalesCommandPage omitBuiltInHeader density="tight" titleTone="onDark" kicker="" title="Organization" subtitle="">
          <OrgAccountBootstrapSkeleton activeTab={activeTab} narrow={narrow} accountId={accountId} />
        </SalesCommandPage>
      );
    }
    return (
      <SalesCommandPage density="tight" titleTone="onDark" kicker="" title="Organization" subtitle="">
        <div style={{ color: "var(--muted)", fontWeight: 600 }}>This organization could not be loaded.</div>
        <Link href="/portal/sales/accounts" style={{ ...sc.linkBrand, color: "#7dd3fc", marginTop: 12, display: "inline-block" }}>
          ← Back to organizations
        </Link>
      </SalesCommandPage>
    );
  }

  const name = organizationAccountTitle(account);
  const notes = String(account.surgical_crm_notes ?? "");
  const billingContactsOnAccount = contacts.filter((c) => ["billing", "purchasing"].includes(String(c.role_type || "")));
  const totalDoctors = contacts.filter((c) => ["surgeon", "physician_assistant"].includes(String(c.role_type || ""))).length;
  const totalSupportNetwork = contacts.filter((c) =>
    ["scheduler", "office_manager", "assistant", "gatekeeper", "nurse", "admin"].includes(String(c.role_type || ""))
  ).length;

  const orgTitle = name || "Unnamed organization";
  const isOrgArchived = Boolean(String(account.surgical_crm_archived_at ?? "").trim());

  const surgeonCount = contacts.filter((c) => ["surgeon", "physician_assistant"].includes(String(c.role_type || ""))).length;
  const supportContactCount = contacts.filter((c) => !["surgeon", "physician_assistant"].includes(String(c.role_type || ""))).length;
  const pipelineCount = cases.filter(
    (c) =>
      !(c as { archived_at?: string | null }).archived_at &&
      !caseStatusTerminal(c.status) &&
      String(c.status || "").toLowerCase() !== "cancelled",
  ).length;
  const docBillingSignals = (accountIntel?.insights || []).filter((i) => /billing|invoice|po|document|doc/i.test(i));
  const totalCasesDisplay = accountIntel != null ? String(accountIntel.total_cases) : String(cases.length);
  const upcomingCountDisplay = accountIntel != null ? String(accountIntel.upcoming_case_count) : String(upcomingCases.length);
  const revenue = accountIntel?.revenue_estimate_expected_total ?? 0;

  const keySurgeons = contacts.filter((c) => ["surgeon", "physician_assistant"].includes(String(c.role_type || ""))).slice(0, 3);

  const nextUpcoming = accountIntel?.upcoming_cases?.[0];

  const heroShell: React.CSSProperties = {
    borderRadius: 18,
    padding: narrow ? "14px 14px 16px" : "22px 22px 20px",
    background:
      "linear-gradient(135deg, color-mix(in srgb, var(--brand-600) 42%, #0f172a) 0%, color-mix(in srgb, #0f172a 88%, var(--brand-600)) 45%, color-mix(in srgb, var(--brand-600) 28%, #020617) 100%)",
    border: "1px solid color-mix(in srgb, white 14%, transparent)",
    boxShadow: "0 18px 40px color-mix(in srgb, #000 28%, transparent)",
    color: "#f8fafc",
  };

  const badgeOnHero: React.CSSProperties = {
    borderRadius: 999,
    padding: "4px 10px",
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: "0.04em",
    textTransform: "uppercase" as const,
    background: "rgba(255,255,255,0.12)",
    border: "1px solid rgba(255,255,255,0.22)",
    color: "#e2e8f0",
  };

  const primaryRowBtn: React.CSSProperties = {
    ...sc.btnPrimary,
    minHeight: 44,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    boxShadow: "0 6px 18px color-mix(in srgb, #000 22%, transparent)",
  };

  const ghostOnHero: React.CSSProperties = {
    ...sc.btnGhost,
    border: "1px solid rgba(255,255,255,0.35)",
    color: "#f1f5f9",
    background: "rgba(255,255,255,0.08)",
    minHeight: 44,
  };

  const tabStripStyle: React.CSSProperties = {
    display: "flex",
    gap: narrow ? 6 : 8,
    overflowX: "auto",
    WebkitOverflowScrolling: "touch",
    paddingBottom: 4,
    marginTop: narrow ? 0 : 16,
    scrollbarWidth: "none",
    msOverflowStyle: "none",
  };

  const renderTabPills = () => (
    <div
      className="org-account-tabs"
      style={{
        ...tabStripStyle,
      }}
    >
      {TAB_DEFS.map((t) => {
        const on = activeTab === t.id;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            style={{
              flex: "0 0 auto",
              borderRadius: 999,
              padding: narrow ? "8px 13px" : "9px 16px",
              fontSize: narrow ? 12 : 13,
              fontWeight: 800,
              border: on ? "1px solid color-mix(in srgb, var(--brand-600) 45%, var(--border))" : "1px solid color-mix(in srgb, var(--foreground) 10%, var(--border))",
              background: on
                ? "linear-gradient(165deg, color-mix(in srgb, var(--brand-600) 18%, var(--surface)), var(--surface))"
                : "color-mix(in srgb, var(--foreground) 4%, var(--surface))",
              color: "var(--foreground)",
              cursor: "pointer",
              whiteSpace: "nowrap",
              minHeight: narrow ? 44 : undefined,
            }}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );

  const metricStrip = (
    <div
      style={
        narrow
          ? {
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 8,
              marginTop: 0,
            }
          : {
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
              gap: 10,
              marginTop: 10,
            }
      }
      className="org-account-metrics"
    >
      <div style={{ minWidth: 0 }}>
        <SalesMetricCard label="Total cases" value={totalCasesDisplay} hint="Your org case count" />
      </div>
      <div style={{ minWidth: 0 }}>
        <SalesMetricCard label="Upcoming" value={upcomingCountDisplay} hint="On the calendar" />
      </div>
      <div style={{ minWidth: 0 }}>
        <SalesMetricCard label="Surgeons" value={String(surgeonCount)} hint="Doctors & PAs on file" />
      </div>
      <div style={{ minWidth: 0 }}>
        <SalesMetricCard label="Support contacts" value={String(supportContactCount)} hint="Non-surgeon roster" />
      </div>
      <div style={{ minWidth: 0 }}>
        <SalesMetricCard
          label="Docs & billing"
          value={docBillingSignals.length > 0 ? String(docBillingSignals.length) : String(pipelineCount)}
          hint={docBillingSignals.length > 0 ? "Insight mentions" : "Active pipeline cases"}
          tone={docBillingSignals.length > 0 ? "caution" : "default"}
        />
      </div>
      <div style={{ minWidth: 0 }}>
        <SalesMetricCard
          label="Est. revenue"
          value={revenue > 0 ? formatMoney(revenue) : "—"}
          hint={revenue > 0 ? "Expected total (intel)" : "No expected revenue total"}
        />
      </div>
    </div>
  );

  const orgCaseRevenue = (c: CaseRow) => {
    const exp = c.expected_revenue;
    const act = c.actual_revenue;
    const en = typeof exp === "number" ? exp : exp != null ? Number(exp) : NaN;
    const an = typeof act === "number" ? act : act != null ? Number(act) : NaN;
    return {
      expLabel: Number.isFinite(en) && en > 0 ? formatMoney(en) : "—",
      actLabel: Number.isFinite(an) && an > 0 ? formatMoney(an) : "—",
    };
  };

  const orgCaseDocIndicators = (c: CaseRow) => {
    const missPo = Boolean((c as { missing_po?: boolean }).missing_po);
    const missInv = Boolean((c as { missing_invoice?: boolean }).missing_invoice);
    return (
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
        <span
          style={{
            fontSize: 11,
            fontWeight: 900,
            padding: "4px 8px",
            borderRadius: 8,
            border: "1px solid color-mix(in srgb, var(--foreground) 10%, var(--border))",
            background: missPo ? "color-mix(in srgb, #f59e0b 16%, var(--surface))" : "color-mix(in srgb, #16a34a 10%, var(--surface))",
            color: missPo ? "#92400e" : "var(--foreground)",
          }}
        >
          PO {missPo ? "needed" : "ok"}
        </span>
        <span
          style={{
            fontSize: 11,
            fontWeight: 900,
            padding: "4px 8px",
            borderRadius: 8,
            border: "1px solid color-mix(in srgb, var(--foreground) 10%, var(--border))",
            background: missInv ? "color-mix(in srgb, #f59e0b 16%, var(--surface))" : "color-mix(in srgb, #16a34a 10%, var(--surface))",
            color: missInv ? "#92400e" : "var(--foreground)",
          }}
        >
          Invoice {missInv ? "needed" : "ok"}
        </span>
      </div>
    );
  };

  const orgCaseQuickSecondary: React.CSSProperties = {
    ...sc.btnSecondary,
    padding: "9px 12px",
    minHeight: 42,
    fontSize: 12,
    fontWeight: 750,
    textDecoration: "none",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    boxSizing: "border-box",
    flex: narrow ? "1 1 140px" : undefined,
  };

  const orgCaseQuickActions = (c: CaseRow) => {
    const id = String(c.id || "");
    if (!id) return null;
    const base = `/portal/sales/cases/${encodeURIComponent(id)}`;
    const busy = orgCaseStatusBusyId === id;
    const canComplete = orgCaseCanMarkComplete(c.status);
    const isArchived = Boolean((c as { archived_at?: string | null }).archived_at);
    const quickStyleArchived = (style: React.CSSProperties): React.CSSProperties =>
      isArchived ? { ...style, opacity: 0.45, pointerEvents: "none" as const } : style;
    return (
      <div style={{ marginTop: 4 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        <Link
          href={`${base}?openNote=1`}
          style={quickStyleArchived(orgCaseQuickSecondary)}
          aria-disabled={isArchived}
          onClick={(e) => {
            if (isArchived) e.preventDefault();
          }}
        >
          Add note
        </Link>
        <Link
          href={`${base}?upload=purchase_order`}
          style={quickStyleArchived(orgCaseQuickSecondary)}
          aria-disabled={isArchived}
          onClick={(e) => {
            if (isArchived) e.preventDefault();
          }}
        >
          Upload PO
        </Link>
        {canComplete ? (
          <button
            type="button"
            disabled={busy || isArchived}
            onClick={() => void markOrgCaseComplete(c)}
            style={{
              ...sc.btnSecondary,
              padding: "9px 12px",
              minHeight: 42,
              fontSize: 12,
              fontWeight: 800,
              border: "1px solid color-mix(in srgb, var(--success) 35%, var(--border))",
              color: "color-mix(in srgb, var(--success) 90%, var(--foreground))",
              flex: narrow ? "1 1 140px" : undefined,
              opacity: isArchived ? 0.45 : 1,
            }}
          >
            {busy ? "Saving…" : "Mark complete"}
          </button>
        ) : null}
        </div>
      </div>
    );
  };

  const orgCaseCard = (c: CaseRow, variant: "upcoming" | "recent") => {
    const id = String(c.id || "");
    const href = id ? `/portal/sales/cases/${id}` : "#";
    const timePart = fmtCaseTime((c as { case_time?: string | null }).case_time);
    const dateLine = fmtDate(c.case_date) || "Date TBD";
    const dateTimeLine = timePart ? `${dateLine} · ${timePart}` : dateLine;
    const accent =
      variant === "upcoming"
        ? "color-mix(in srgb, var(--brand-600) 6%, var(--surface))"
        : "color-mix(in srgb, var(--foreground) 2%, var(--surface))";
    const { expLabel, actLabel } = orgCaseRevenue(c);
    const surgeon = String((c as { surgeon_display?: string | null }).surgeon_display || "").trim() || "—";
    const product = String((c as { product_name?: string | null }).product_name || "").trim() || "—";
    const rowArchived = Boolean((c as { archived_at?: string | null }).archived_at);
    return (
      <div
        key={id || String(c.case_number)}
        style={{
          borderRadius: 14,
          border: "1px solid color-mix(in srgb, var(--foreground) 6%, var(--border))",
          background: accent,
          padding: narrow ? 12 : 14,
          display: "grid",
          gap: 8,
          ...newItemGlowBox(Boolean(id && pulseCaseId === id)),
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start", minWidth: 0 }}>
          <Link
            href={href}
            style={{
              fontWeight: 900,
              fontSize: 15,
              color: "var(--foreground)",
              textDecoration: "none",
              letterSpacing: "-0.02em",
              wordBreak: "break-word",
              minWidth: 0,
            }}
          >
            {String(c.case_number)}
          </Link>
          <span style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", justifyContent: "flex-end" }}>
            {rowArchived ? (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 900,
                  padding: "4px 9px",
                  borderRadius: 999,
                  background: "color-mix(in srgb, var(--foreground) 7%, var(--surface))",
                  border: "1px solid color-mix(in srgb, var(--foreground) 12%, var(--border))",
                  color: "var(--muted)",
                }}
              >
                Archived
              </span>
            ) : null}
            <span style={caseStatusBadgeStyle(String(c.status || ""))}>{formatSurgicalCaseStatus(String(c.status || ""))}</span>
          </span>
        </div>
        <div style={{ fontSize: 13, color: "var(--muted)", fontWeight: 650 }}>{dateTimeLine}</div>
        <div style={{ fontSize: 13, fontWeight: 650, lineHeight: 1.4, wordBreak: "break-word" }}>
          {product}
          <span style={{ color: "var(--muted)", fontWeight: 600 }}> · </span>
          {surgeon}
        </div>
        {orgCaseDocIndicators(c)}
        <div style={{ fontSize: 12, fontWeight: 650, color: "var(--muted)" }}>
          Est. <span style={{ color: "var(--foreground)", fontWeight: 700 }}>{expLabel}</span>
          <span style={{ margin: "0 6px", opacity: 0.45 }}>·</span>
          Act. <span style={{ color: "var(--foreground)", fontWeight: 700 }}>{actLabel}</span>
        </div>
        {orgCaseQuickActions(c)}
      </div>
    );
  };

  const orgOverviewCasePreviewLink = (c: CaseRow) => {
    const id = String(c.id || "");
    const href = id ? `/portal/sales/cases/${encodeURIComponent(id)}` : "#";
    const timePart = fmtCaseTime((c as { case_time?: string | null }).case_time);
    const dateLine = fmtDate(c.case_date) || "Date TBD";
    const dateDisplay = timePart ? `${dateLine} · ${timePart}` : dateLine;
    const surgeon = String((c as { surgeon_display?: string | null }).surgeon_display || "").trim() || "—";
    const product = String((c as { product_name?: string | null }).product_name || "").trim() || "—";
    const num = String(c.case_number || "Case");
    return (
      <Link
        href={href}
        style={{
          display: "block",
          textDecoration: "none",
          color: "inherit",
          borderRadius: 12,
          border: "1px solid color-mix(in srgb, var(--foreground) 5%, var(--border))",
          padding: "10px 12px",
          background: "color-mix(in srgb, var(--foreground) 2%, var(--surface))",
          transition: "background 0.12s ease, border-color 0.12s ease",
          ...newItemGlowBox(Boolean(id && pulseCaseId === id)),
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 4 }}>
          <span style={{ fontWeight: 900, fontSize: 14, letterSpacing: "-0.02em", wordBreak: "break-word", minWidth: 0 }}>{num}</span>
          <span style={{ ...caseStatusBadgeStyle(String(c.status || "")), flexShrink: 0 }}>{formatSurgicalCaseStatus(String(c.status || ""))}</span>
        </div>
        <div style={{ fontSize: 12, fontWeight: 650, color: "var(--muted)", marginBottom: 6 }}>{dateDisplay}</div>
        <div style={{ fontSize: 13, fontWeight: 650, lineHeight: 1.35, wordBreak: "break-word" }}>
          {product}
          <span style={{ color: "var(--muted)", fontWeight: 600 }}> · </span>
          {surgeon}
        </div>
      </Link>
    );
  };

  const orgCasesTableDesktop = (rows: CaseRow[]) => (
    <div className="org-cases-table-desktop" style={{ ...sc.tableShell, maxWidth: "100%" }}>
      <div className="portal-table-wrap" style={{ overflowX: "auto", WebkitOverflowScrolling: "touch", maxWidth: "100%" }}>
        <table className="sales-cmd-table" style={{ width: "100%", minWidth: 920, fontSize: 13 }}>
          <thead>
            <tr>
              <th>Case</th>
              <th>Date / time</th>
              <th>Product</th>
              <th>Surgeon</th>
              <th>Status</th>
              <th>Docs</th>
              <th>Est.</th>
              <th>Actual</th>
              <th style={{ textAlign: "right" }}>Quick actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => {
              const id = String(c.id || "");
              const base = id ? `/portal/sales/cases/${encodeURIComponent(id)}` : "#";
              const timePart = fmtCaseTime((c as { case_time?: string | null }).case_time);
              const dateLine = fmtDate(c.case_date) || "—";
              const dateTime = timePart ? `${dateLine} ${timePart}` : dateLine;
              const { expLabel, actLabel } = orgCaseRevenue(c);
              const missPo = Boolean((c as { missing_po?: boolean }).missing_po);
              const missInv = Boolean((c as { missing_invoice?: boolean }).missing_invoice);
              const surgeon = String((c as { surgeon_display?: string | null }).surgeon_display || "").trim() || "—";
              const product = String((c as { product_name?: string | null }).product_name || "").trim() || "—";
              const compactBtn: React.CSSProperties = {
                ...sc.btnSecondary,
                flex: "0 0 auto",
                minHeight: 38,
                padding: "7px 10px",
                fontSize: 11,
                fontWeight: 750,
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              };
              const busyRow = orgCaseStatusBusyId === id;
              const canComplete = orgCaseCanMarkComplete(c.status);
              return (
                <tr
                  key={id || String(c.case_number)}
                  style={id && pulseCaseId === id ? { boxShadow: "inset 0 0 0 2px color-mix(in srgb, var(--brand-600) 65%, transparent)", background: "color-mix(in srgb, var(--brand-600) 6%, var(--surface))" } : undefined}
                >
                  <td style={{ fontWeight: 850 }}>
                    <Link href={base} style={{ color: "var(--foreground)", textDecoration: "none" }}>
                      {String(c.case_number)}
                    </Link>
                  </td>
                  <td style={{ whiteSpace: "nowrap", color: "var(--muted)", fontWeight: 600 }}>{dateTime}</td>
                  <td style={{ maxWidth: 220, fontWeight: 650 }}>{product}</td>
                  <td style={{ maxWidth: 180 }}>{surgeon}</td>
                  <td>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                      {isSurgicalObservationCase((c as { case_type?: string | null }).case_type) ? (
                        <span style={caseTypeBadgeStyle((c as { case_type?: string | null }).case_type)}>
                          {formatSurgicalCaseType((c as { case_type?: string | null }).case_type)}
                        </span>
                      ) : null}
                      <span style={caseStatusBadgeStyle(String(c.status || ""))}>{formatSurgicalCaseStatus(String(c.status || ""))}</span>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11, fontWeight: 800 }}>
                      <span style={{ color: missPo ? "var(--warning)" : "var(--success)" }}>PO {missPo ? "need" : "✓"}</span>
                      <span style={{ color: missInv ? "var(--warning)" : "var(--success)" }}>Inv {missInv ? "need" : "✓"}</span>
                    </div>
                  </td>
                  <td style={{ fontWeight: 750, whiteSpace: "nowrap" }}>{expLabel}</td>
                  <td style={{ fontWeight: 750, whiteSpace: "nowrap" }}>{actLabel}</td>
                  <td style={{ textAlign: "right" }}>
                    <div style={{ display: "inline-flex", flexWrap: "wrap", gap: 6, justifyContent: "flex-end", maxWidth: 360 }}>
                      <Link href={`${base}?openNote=1`} style={compactBtn}>
                        Add note
                      </Link>
                      <Link href={`${base}?upload=purchase_order`} style={compactBtn}>
                        Upload PO
                      </Link>
                      {canComplete ? (
                        <button
                          type="button"
                          disabled={busyRow}
                          onClick={() => void markOrgCaseComplete(c)}
                          style={{
                            ...compactBtn,
                            border: "1px solid color-mix(in srgb, var(--success) 35%, var(--border))",
                            color: "color-mix(in srgb, var(--success) 90%, var(--foreground))",
                            cursor: busyRow ? "wait" : "pointer",
                          }}
                        >
                          {busyRow ? "…" : "Mark complete"}
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  const overviewPanel = (
    <div style={{ display: "grid", gap: narrow ? 8 : 10 }}>
      {!narrow ? metricStrip : null}

      <SalesPanel density="compact" nativeFlat={narrow} title="Case activity">
        {cases.length === 0 ? (
          <PortalEmptyState
            compact
            icon="📋"
            title="No surgical cases yet"
            description="Create a case to see upcoming and recent activity here without switching tabs."
            footer={
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                <Link href={`/portal/sales/cases/new?account_id=${accountId}`} style={{ ...sc.btnPrimary, fontSize: 13, padding: "10px 16px", textDecoration: "none" }}>
                  Create case
                </Link>
                <button type="button" style={{ ...sc.btnSecondary, fontSize: 13, padding: "10px 16px" }} onClick={() => setTab("cases")}>
                  Cases tab
                </button>
              </div>
            }
          />
        ) : (
          <>
            <div style={{ display: "grid", gap: narrow ? 10 : 12, gridTemplateColumns: narrow ? "1fr" : "minmax(0, 1fr) minmax(0, 1fr)" }}>
              <div style={{ display: "grid", gap: 8, minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.06em", color: "var(--muted)" }}>Upcoming</div>
                {overviewUpcomingCases.length === 0 ? (
                  <div>
                    <p style={{ margin: 0, fontSize: 14, color: "var(--muted)", fontWeight: 600, lineHeight: 1.45 }}>
                      Nothing scheduled ahead.
                    </p>
                    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 14 }}>
                      <button type="button" onClick={() => setTab("cases")} style={{ ...sc.linkBrandAction, fontWeight: 800, cursor: "pointer", padding: 0, border: "none", background: "none" }}>
                        See all cases
                      </button>
                      <Link href={`/portal/sales/cases/new?account_id=${accountId}`} style={{ ...sc.linkBrandAction, fontWeight: 800 }}>
                        Add a case
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "grid", gap: 6 }}>
                    {overviewUpcomingCases.map((c) => (
                      <React.Fragment key={String(c.id || c.case_number)}>{orgOverviewCasePreviewLink(c)}</React.Fragment>
                    ))}
                  </div>
                )}
              </div>
              <div style={{ display: "grid", gap: 8, minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.06em", color: "var(--muted)" }}>Recent</div>
                {overviewRecentCases.length === 0 ? (
                  <div>
                    <p style={{ margin: 0, fontSize: 14, color: "var(--muted)", fontWeight: 600, lineHeight: 1.45 }}>
                      No prior cases yet.
                    </p>
                    <button type="button" onClick={() => setTab("cases")} style={{ ...sc.linkBrandAction, fontWeight: 800, cursor: "pointer", padding: 0, border: "none", background: "none" }}>
                      See all cases
                    </button>
                  </div>
                ) : (
                  <div style={{ display: "grid", gap: 6 }}>
                    {overviewRecentCases.map((c) => (
                      <React.Fragment key={String(c.id || c.case_number)}>{orgOverviewCasePreviewLink(c)}</React.Fragment>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div style={{ marginTop: 8, paddingTop: 8 }}>
              <button
                type="button"
                onClick={() => setTab("cases")}
                style={{ ...sc.linkBrandAction, fontWeight: 800, fontSize: 14, cursor: "pointer", padding: 0, border: "none", background: "none" }}
              >
                View all cases →
              </button>
            </div>
          </>
        )}
      </SalesPanel>

      <AdoptionInitiativesListPanel
        title="Opportunities"
        opportunities={opportunities}
        createHref={buildCreateOpportunityHref({ accountId })}
      />

      {nextBestActions.length > 0 ? (
        <SalesPanel density="compact" nativeFlat={narrow} title="Next best action">
          <div
            style={{
              display: "grid",
              gap: 12,
              gridTemplateColumns: narrow ? "1fr" : "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
            }}
          >
            {nextBestActions.map((action) => {
              const cardBase: React.CSSProperties = {
                borderRadius: 14,
                border: "1px solid color-mix(in srgb, var(--brand-600) 18%, var(--border))",
                background: "color-mix(in srgb, var(--brand-600) 5%, var(--surface))",
                padding: narrow ? 14 : 15,
                display: "grid",
                gap: 10,
                boxSizing: "border-box",
                minHeight: 132,
              };
              const ctaStyle: React.CSSProperties = {
                ...sc.btnPrimary,
                minHeight: 50,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 15,
                fontWeight: 800,
                borderRadius: 12,
                marginTop: "auto",
                textDecoration: "none",
                width: "100%",
                boxSizing: "border-box",
              };
              const titleStyle: React.CSSProperties = {
                margin: 0,
                fontSize: narrow ? 16 : 17,
                fontWeight: 900,
                letterSpacing: "-0.02em",
                lineHeight: 1.25,
                color: "var(--foreground)",
              };
              const bodyStyle: React.CSSProperties = {
                margin: 0,
                fontSize: 14,
                fontWeight: 600,
                lineHeight: 1.5,
                color: "var(--muted)",
              };
              if ("href" in action) {
                return (
                  <Link
                    key={action.id}
                    href={action.href}
                    style={{
                      ...cardBase,
                      textDecoration: "none",
                      color: "inherit",
                    }}
                  >
                    <h3 style={titleStyle}>{action.title}</h3>
                    <p style={bodyStyle}>{action.body}</p>
                    <span style={ctaStyle}>{action.cta}</span>
                  </Link>
                );
              }
              if (action.kind === "add_surgeon") {
                return (
                  <button
                    key={action.id}
                    type="button"
                    onClick={() => openNewContact("surgeon")}
                    style={{
                      ...cardBase,
                      cursor: "pointer",
                      textAlign: "left",
                      font: "inherit",
                      WebkitTapHighlightColor: "transparent",
                      touchAction: "manipulation",
                    }}
                  >
                    <h3 style={titleStyle}>{action.title}</h3>
                    <p style={bodyStyle}>{action.body}</p>
                    <span style={{ ...ctaStyle, border: "none", width: "100%" }}>{action.cta}</span>
                  </button>
                );
              }
              return null;
            })}
          </div>
        </SalesPanel>
      ) : null}

      <div style={{ display: "grid", gap: narrow ? 8 : 10, gridTemplateColumns: narrow ? "1fr" : "minmax(0, 1fr) minmax(0, 1fr)" }}>
        {!narrow ? (
          <SalesPanel density="compact" nativeFlat={narrow} title="Quick actions">
            <div style={{ display: "grid", gap: 10 }}>
              <Link
                href={`/portal/sales/cases/new?account_id=${accountId}`}
                style={{ ...sc.btnPrimary, textAlign: "center", minHeight: 48, display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                Add case
              </Link>
              <button type="button" style={{ ...sc.btnSecondary, minHeight: 48 }} onClick={() => openNewContact()}>
                Add contact
              </button>
              <button type="button" style={{ ...sc.btnSecondary, minHeight: 48 }} onClick={() => setTab("notes")}>
                Add note
              </button>
              <button type="button" style={{ ...sc.btnSecondary, minHeight: 48 }} onClick={() => setTab("billing")}>
                Review billing & documents
              </button>
              <button type="button" onClick={() => setOrgEditOpen(true)} style={{ ...sc.btnGhost, textAlign: "center", minHeight: 48, display: "flex", alignItems: "center", justifyContent: "center" }}>
                Edit organization
              </button>
            </div>
          </SalesPanel>
        ) : null}

        <SalesPanel density="compact" nativeFlat={narrow} title="Account snapshot">
          <dl style={{ display: "grid", gap: 10, margin: 0, fontSize: 14 }}>
            <div>
              <dt style={{ ...sc.sectionLabel, marginBottom: 4 }}>Type</dt>
              <dd style={{ margin: 0 }}>{formatSurgicalAccountType(String(account.surgical_crm_type))}</dd>
            </div>
            <div>
              <dt style={{ ...sc.sectionLabel, marginBottom: 4 }}>Status</dt>
              <dd style={{ margin: 0 }}>{formatSurgicalAccountStatus(String(account.surgical_crm_status))}</dd>
            </div>
            {notes ? (
              <div>
                <dt style={{ ...sc.sectionLabel, marginBottom: 4 }}>Standing notes</dt>
                <dd style={{ margin: 0, lineHeight: 1.5, whiteSpace: "pre-wrap", fontSize: 13 }}>{notes.length > 280 ? `${notes.slice(0, 280)}…` : notes}</dd>
              </div>
            ) : null}
          </dl>
          {narrow ? (
            <button
              type="button"
              onClick={() => setOrgEditOpen(true)}
              style={{
                ...sc.linkBrand,
                fontSize: 13,
                fontWeight: 800,
                marginTop: 4,
                display: "inline-flex",
                alignItems: "center",
                minHeight: 44,
                border: "none",
                background: "none",
                padding: 0,
                cursor: "pointer",
              }}
            >
              Edit organization →
            </button>
          ) : null}
        </SalesPanel>
      </div>

      <SalesPanel density="compact" nativeFlat={narrow} title="Organization notes">
        <div style={{ display: "grid", gap: 10 }}>
          {organizationNotes.length > 0 ? (
            <div style={{ display: "grid", gap: 8 }}>
              {organizationNotes.slice(0, 3).map((note) => (
                <div
                  key={note.id}
                  style={{
                    borderRadius: 12,
                    border: "1px solid color-mix(in srgb, var(--foreground) 9%, var(--border))",
                    padding: "10px 12px",
                  }}
                >
                  <div style={{ fontSize: 13, lineHeight: 1.5, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                    {note.body.length > 220 ? `${note.body.slice(0, 220)}…` : note.body}
                  </div>
                  <div style={{ marginTop: 8, fontSize: 11, color: "var(--muted)", fontWeight: 700 }}>
                    {new Date(note.created_at).toLocaleString()} · {note.actor_display_name === "—" ? "Actor not recorded" : note.actor_display_name}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <PortalEmptyState
              compact
              icon="📝"
              title="No organization notes yet"
              description="Add status updates here. Case and provider notes still show under Activity."
            />
          )}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <button type="button" style={{ ...sc.btnPrimary, minHeight: 44 }} onClick={() => setTab("notes")}>
              Add note
            </button>
            {organizationNotes.length > 3 ? (
              <button type="button" style={sc.btnGhost} onClick={() => setTab("notes")}>
                View all notes
              </button>
            ) : null}
          </div>
        </div>
      </SalesPanel>

      {cases.length > 0 || surgeonCount > 0 || billingDetailsMissing ? (
        <SalesPanel density="compact" nativeFlat={narrow} title="Needs attention">
          <div style={{ display: "grid", gap: 8 }}>
            {billingDetailsMissing ? (
              <AttentionNavRow
                href={attentionHref("billing_details", "billing")}
                urgency="warning"
                title="Missing billing details"
                badge="!"
              />
            ) : null}
            {needsAttentionMetrics.missingPo > 0 ? (
              <AttentionNavRow
                href={attentionHref("missing_po", "cases")}
                urgency="critical"
                title="Cases missing PO"
                badge={String(needsAttentionMetrics.missingPo)}
              />
            ) : null}
            {needsAttentionMetrics.missingInvoice > 0 ? (
              <AttentionNavRow
                href={attentionHref("missing_invoice", "cases")}
                urgency="critical"
                title="Cases missing invoice"
                badge={String(needsAttentionMetrics.missingInvoice)}
              />
            ) : null}
            {needsAttentionMetrics.docsNeeded > 0 ? (
              <AttentionNavRow
                href={attentionHref("docs_needed", "cases")}
                urgency="critical"
                title="Cases stuck in Docs needed"
                badge={String(needsAttentionMetrics.docsNeeded)}
              />
            ) : null}
            {needsAttentionMetrics.noUpcoming ? (
              <AttentionNavRow
                href={attentionHref("no_upcoming", "cases")}
                urgency="warning"
                title="No upcoming cases scheduled"
              />
            ) : null}
            {needsAttentionMetrics.missingPo === 0 &&
            needsAttentionMetrics.missingInvoice === 0 &&
            needsAttentionMetrics.docsNeeded === 0 &&
            !needsAttentionMetrics.noUpcoming &&
            !billingDetailsMissing ? (
              <div
                style={{
                  borderRadius: 12,
                  padding: "12px 14px",
                  border: "1px solid color-mix(in srgb, #16a34a 18%, var(--border))",
                  background: "color-mix(in srgb, #16a34a 6%, var(--surface))",
                  fontSize: 13,
                  fontWeight: 650,
                  color: "#166534",
                }}
              >
                Nothing urgent on this account right now—POs, invoices, and doc status look clear.
              </div>
            ) : null}
          </div>
        </SalesPanel>
      ) : null}

      <SalesPanel density="compact" nativeFlat={narrow} title="Recent activity">
        <div style={{ display: "grid", gap: 10 }}>
          {activityFeed.length > 0 ? (
            <div style={{ display: "grid", gap: 4 }}>
              {activityFeed.slice(0, 5).map((item, idx, arr) => (
                <OrgActivityFeedRow key={item.id} item={item} isLast={idx === arr.length - 1} />
              ))}
            </div>
          ) : (
            <PortalEmptyState
              compact
              icon="✨"
              title="No activity yet"
              description="Log notes, upload documents, add contacts, and work cases—this timeline fills in automatically."
              footer={
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                  <Link
                    href={`/portal/sales/cases/new?account_id=${accountId}`}
                    style={{ ...sc.btnPrimary, fontSize: 13, padding: "10px 16px", textDecoration: "none", display: "inline-flex", alignItems: "center", justifyContent: "center", minHeight: 44 }}
                  >
                    Create case
                  </Link>
                  <button type="button" style={{ ...sc.btnSecondary, fontSize: 13, padding: "10px 16px" }} onClick={() => openNewContact("surgeon")}>
                    Add doctor
                  </button>
                </div>
              }
            />
          )}
          {accountIntel?.insights?.length ? (
            <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 4, fontSize: 13, color: "var(--muted)" }}>
              {accountIntel.insights.slice(0, 4).map((line, i) => (
                <li key={`${i}-${line.slice(0, 20)}`}>{line}</li>
              ))}
            </ul>
          ) : null}
          <button type="button" style={{ ...sc.btnGhost, marginTop: 4 }} onClick={() => setTab("activity")}>
            Open full activity
          </button>
        </div>
      </SalesPanel>

      <div style={{ display: "grid", gap: 10, gridTemplateColumns: narrow ? "1fr" : "repeat(2, minmax(0, 1fr))" }}>
        <SalesPanel density="compact" nativeFlat={narrow} title="Next case">
          {nextUpcoming ? (
            <div style={{ display: "grid", gap: 10 }}>
              <div style={{ fontWeight: 900, fontSize: 16 }}>{nextUpcoming.case_number}</div>
              <div style={{ color: "var(--muted)", fontSize: 13 }}>{fmtDate(nextUpcoming.case_date)}</div>
              <div style={{ fontSize: 14 }}>{nextUpcoming.product_name || "Product TBD"}</div>
              <Link href={`/portal/sales/cases/${nextUpcoming.id}`} style={sc.btnSecondary}>
                Open case
              </Link>
            </div>
          ) : (
            <PortalEmptyState
              compact
              icon="📅"
              title="No upcoming case scheduled"
              description="Create a case with a future procedure date to see your next surgery on the overview."
              actions={[
                {
                  href: `/portal/sales/cases/new?account_id=${accountId}`,
                  label: "Create case",
                  variant: "primary",
                },
              ]}
            />
          )}
        </SalesPanel>

        <SalesPanel density="compact" nativeFlat={narrow} title="Key doctors">
          {keySurgeons.length === 0 ? (
            <PortalEmptyState
              compact
              icon="⚕️"
              title="No surgeons linked yet"
              description="Add a surgeon so reps can create cases and manage support contacts."
              footer={
                <button type="button" style={{ ...sc.btnPrimary, fontSize: 13, padding: "10px 16px" }} onClick={() => openNewContact("surgeon")}>
                  Add doctor
                </button>
              }
            />
          ) : (
            <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 8, fontSize: 14 }}>
              {keySurgeons.map((c) => (
                <li key={String(c.id)}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <span style={{ fontWeight: 800 }}>{contactDisplayName(c as Parameters<typeof contactDisplayName>[0])}</span>
                    <RelationshipStrengthDot strength={c.relationship_strength} />
                  </span>
                  <span style={{ color: "var(--muted)" }}> · {formatSurgicalContactRole(String(c.role_type || "other"))}</span>
                </li>
              ))}
            </ul>
          )}
          <button type="button" style={{ ...sc.btnGhost, marginTop: 10 }} onClick={() => setTab("contacts")}>
            View contacts
          </button>
        </SalesPanel>
      </div>
    </div>
  );

  const filterCompact: React.CSSProperties = {
    width: "100%",
    boxSizing: "border-box",
    padding: "8px 11px",
    borderRadius: 10,
    border: "1px solid color-mix(in srgb, var(--foreground) 10%, var(--border))",
    fontSize: 13,
    background: "var(--surface)",
    color: "var(--foreground)",
  };

  const doctorCardShell: React.CSSProperties = {
    borderRadius: 14,
    border: "1px solid color-mix(in srgb, var(--brand-600) 22%, var(--border))",
    background: "linear-gradient(165deg, color-mix(in srgb, var(--brand-600) 8%, var(--surface)) 0%, color-mix(in srgb, var(--surface) 96%, var(--brand-600)) 100%)",
    padding: narrow ? 9 : 11,
    display: "grid",
    gap: narrow ? 6 : 8,
    transition: "transform 0.12s ease, border-color 0.12s ease, box-shadow 0.12s ease",
    boxShadow: "0 4px 16px color-mix(in srgb, var(--brand-600) 8%, transparent)",
  };

  const supportCardShell: React.CSSProperties = {
    borderRadius: 12,
    border: "1px solid color-mix(in srgb, var(--foreground) 6%, var(--border))",
    background: "color-mix(in srgb, var(--foreground) 1.8%, var(--surface))",
    padding: narrow ? 8 : 9,
    display: "grid",
    gap: narrow ? 5 : 6,
    transition: "transform 0.12s ease, border-color 0.12s ease, box-shadow 0.12s ease",
  };

  const contactActionBtn: React.CSSProperties = {
    ...sc.btnSecondary,
    minHeight: narrow ? 44 : 30,
    flex: narrow ? "1 1 calc(50% - 4px)" : "0 0 auto",
    justifyContent: "center",
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    fontSize: 11,
    fontWeight: 700,
    borderRadius: 7,
    padding: "4px 8px",
    lineHeight: 1.2,
  };

  const contactsFilterToolbar = (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 6,
        alignItems: "center",
        marginBottom: narrow ? 8 : 9,
        padding: narrow ? 7 : 8,
        borderRadius: 10,
        border: "1px solid color-mix(in srgb, var(--foreground) 6%, var(--border))",
        background: "color-mix(in srgb, var(--foreground) 2.5%, var(--surface))",
      }}
      className="org-contacts-command-bar"
    >
      <input
        id="org-contacts-search"
        ref={contactsSearchRef}
        placeholder="Search name, email, phone…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ ...filterCompact, padding: "7px 10px", minHeight: 34, flex: narrow ? "1 1 100%" : "2 1 260px", minWidth: narrow ? 0 : 220 }}
        autoComplete="off"
        className="org-contacts-cmd-search"
      />
      <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} style={{ ...filterCompact, padding: "7px 10px", minHeight: 34, flex: "0 1 120px", minWidth: 102 }} className="org-contacts-cmd-control">
        <option value="">All roles</option>
        {SURGICAL_CONTACT_ROLE_TYPES_V2.map((r) => (
          <option key={r} value={r}>
            {formatSurgicalContactRole(r)}
          </option>
        ))}
      </select>
      <select value={influenceFilter} onChange={(e) => setInfluenceFilter(e.target.value)} style={{ ...filterCompact, padding: "7px 10px", minHeight: 34, flex: "0 1 112px", minWidth: 96 }} className="org-contacts-cmd-control">
        <option value="">Influence</option>
        {["decision_maker", "influencer", "gatekeeper", "unknown"].map((v) => (
          <option key={v} value={v}>
            {v.replace(/_/g, " ")}
          </option>
        ))}
      </select>
      <select value={strengthFilter} onChange={(e) => setStrengthFilter(e.target.value)} style={{ ...filterCompact, padding: "7px 10px", minHeight: 34, flex: "0 1 100px", minWidth: 90 }} className="org-contacts-cmd-control">
        <option value="">Strength</option>
        {["strong", "medium", "weak", "unknown"].map((v) => (
          <option key={v} value={v}>
            {v}
          </option>
        ))}
      </select>
      <button
        type="button"
        style={{ ...sc.btnSecondary, minHeight: 34, fontSize: 12, padding: "7px 10px", borderRadius: 8, flex: "0 0 auto" }}
        onClick={() => openNewContact()}
        className="org-contacts-cmd-add"
      >
        + Add
      </button>
      {search || roleFilter || influenceFilter || strengthFilter ? (
        <button
          type="button"
          style={{ ...sc.btnGhost, flex: "0 0 auto", minHeight: 34, alignSelf: "center", fontWeight: 700, fontSize: 11.5, padding: "7px 9px", borderRadius: 8 }}
          className="org-contacts-cmd-control"
          onClick={() => {
            setSearch("");
            setRoleFilter("");
            setInfluenceFilter("");
            setStrengthFilter("");
            stripAttentionFromUrl();
          }}
        >
          Clear filters
        </button>
      ) : null}
    </div>
  );

  const contactsPanel = (
    <SalesPanel density="compact" nativeFlat={narrow} title="Providers & contacts">
      {contacts.length === 0 ? (
        <PortalEmptyState
          icon="👥"
          title="No contacts on this account yet"
          description="Add a doctor or support contact to start building this account network."
          footer={
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              <button type="button" style={{ ...sc.btnPrimary, fontSize: 14, padding: "11px 18px", minHeight: 44 }} onClick={() => openNewContact("surgeon")}>
                Add doctor
              </button>
              <button type="button" style={{ ...sc.btnSecondary, fontSize: 14, padding: "11px 18px", minHeight: 44 }} onClick={() => openNewContact("office_manager")}>
                Add support contact
              </button>
            </div>
          }
        />
      ) : (
        <>
          {contactsFilterToolbar}
          {contactNeedsAttentionRows.length > 0 ? (
            <div style={{ display: "grid", gap: 6, marginBottom: 9 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: "var(--muted)", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                Needs attention
              </div>
              <div style={{ display: "grid", gap: 5 }}>
                {contactNeedsAttentionRows.map((row) => (
                  <AttentionNavRow key={row.key} href={row.href} title={row.title} urgency={row.urgency} />
                ))}
              </div>
            </div>
          ) : null}

          <ContactSection dense={narrow} icon="⚕️" title="Providers" count={doctors.length}>
            {doctors.length === 0 ? (
              totalDoctors === 0 ? (
                <PortalEmptyState
                  compact
                  icon="⚕️"
                  title="No surgeons linked yet"
                  description="Add a doctor to start case workflows."
                  footer={
                    <button type="button" style={{ ...sc.btnPrimary, fontSize: 13, padding: "10px 16px" }} onClick={() => openNewContact("surgeon")}>
                      Add doctor
                    </button>
                  }
                />
              ) : (
                <PortalEmptyState
                  compact
                  icon="🔍"
                  title="No doctors match filters"
                  footer={
                    <button
                      type="button"
                      style={{ ...sc.btnSecondary, fontSize: 13, padding: "10px 16px" }}
                      onClick={() => {
                        setSearch("");
                        setRoleFilter("");
                        setInfluenceFilter("");
                        setStrengthFilter("");
                        stripAttentionFromUrl();
                      }}
                    >
                      Clear filters
                    </button>
                  }
                />
              )
            ) : (
          <div className="org-contact-card-grid" style={{ display: "grid", gap: narrow ? 8 : 10 }}>
            {doctors.map((c) => {
              const id = String(c.id || "");
              const support = doctorSupport(id);
              const supportContactIds = support
                .map((s) => String(s.contact?.id || "").trim())
                .filter(Boolean);
              const createCaseHref = `/portal/sales/cases/new?account_id=${encodeURIComponent(accountId)}&surgeon_contact_id=${encodeURIComponent(id)}${
                supportContactIds.length ? `&support_contact_ids=${encodeURIComponent(supportContactIds.join(","))}` : ""
              }`;
              const editable = Boolean(meId);
              const titleText = String(c.title ?? "").trim();
              const inf = String(c.influence_level ?? "").trim() || "unknown";
              const str = String(c.relationship_strength ?? "").trim() || "unknown";
              const roleKey = String(c.role_type || "other");
              const isPrimary = Boolean(c.is_primary_contact ?? c.is_primary);
              const worksAtCount = Number((c as { organization_count?: number }).organization_count || 0);
              const orgRelPrimary = Boolean((c as { org_relationship_is_primary?: boolean }).org_relationship_is_primary);
              const orgRelActive = Boolean((c as { org_relationship_is_active?: boolean }).org_relationship_is_active ?? true);
              const influenceKnown = inf !== "unknown";
              const strengthKnown = str !== "unknown";
              return (
                <div
                  className="org-doctor-card"
                  key={id}
                  style={{
                    ...doctorCardShell,
                    ...newItemGlowBox(pulseContactId === id),
                    borderColor:
                      roleKey === "surgeon"
                        ? "color-mix(in srgb, #4f46e5 34%, var(--border))"
                        : roleKey === "physician_assistant"
                          ? "color-mix(in srgb, #0ea5e9 30%, var(--border))"
                          : (doctorCardShell.borderColor as string | undefined),
                    minHeight: narrow ? 152 : 164,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start" }}>
                    <div style={{ display: "flex", gap: 8, minWidth: 0, alignItems: "flex-start" }}>
                      <span style={{ marginTop: 1 }}>
                        <RoleIcon roleType={roleKey} />
                      </span>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", fontWeight: 900, fontSize: 15.5, lineHeight: 1.2, letterSpacing: "-0.02em" }}>
                          <span>{contactDisplayName(c as Parameters<typeof contactDisplayName>[0])}</span>
                          {strengthKnown ? <RelationshipStrengthDot strength={c.relationship_strength} /> : null}
                        </div>
                        {titleText ? <div style={{ color: "var(--muted)", fontSize: 11.5, marginTop: 1, fontWeight: 500 }}>{titleText}</div> : null}
                      </div>
                    </div>
                    <span style={roleTypeBadgeStyle(roleKey)}>{formatSurgicalContactRole(roleKey)}</span>
                  </div>

                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4, alignItems: "center" }}>
                    {influenceKnown ? <span style={influencePillStyle(inf)}>Influence: {inf.replace(/_/g, " ")}</span> : null}
                    {strengthKnown ? <span style={strengthPillStyle(str)}>Strength: {str}</span> : null}
                    {isPrimary ? (
                      <span
                        style={{
                          borderRadius: 999,
                          padding: "3px 8px",
                          fontSize: 11,
                          fontWeight: 900,
                          background: "color-mix(in srgb, #f59e0b 14%, transparent)",
                          border: "1px solid color-mix(in srgb, #d97706 30%, var(--border))",
                        }}
                      >
                        Primary
                      </span>
                    ) : null}
                    {orgRelPrimary ? <span style={miniBadge}>Primary clinician</span> : orgRelActive ? <span style={miniBadge}>Visiting clinician</span> : <span style={miniBadge}>Shared clinician</span>}
                    {worksAtCount > 1 ? <span style={miniBadge}>Works at {worksAtCount} organizations</span> : null}
                  </div>

                  <DoctorSupportPreview
                    support={support}
                    narrow={narrow}
                    onRequestAddForSlot={(linkRelType) => {
                      setSupportModalPreferredRelType(linkRelType);
                      setSupportManagerDoctorId(id);
                    }}
                    relationshipRemovable={canRemoveThisRelationship}
                    onRequestRemoveRelationship={({ relationship, supportContact }) => {
                      const rid = String(relationship.id || "");
                      if (!rid) return;
                      const doctorNm = contactDisplayName(c as Parameters<typeof contactDisplayName>[0]);
                      const supNm = contactDisplayName((supportContact || {}) as Parameters<typeof contactDisplayName>[0]);
                      setRelRemoveTarget({
                        relId: rid,
                        message: `Remove this support relationship? This will unlink ${supNm || "this contact"} from ${doctorNm} but will not delete either contact.`,
                      });
                    }}
                  />

                  <div className="org-contact-card-actions" style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", marginTop: 2 }}>
                    <Link
                      href={createCaseHref}
                      style={{
                        ...contactActionBtn,
                        ...sc.btnPrimary,
                        border: "none",
                        minHeight: narrow ? 44 : 32,
                        fontSize: 11.5,
                        fontWeight: 800,
                        padding: "5px 10px",
                        boxShadow: "0 2px 10px color-mix(in srgb, var(--brand-600) 24%, transparent)",
                      }}
                    >
                      Create Case
                    </Link>
                    <button
                      type="button"
                      style={{ ...contactActionBtn, ...sc.btnSecondary }}
                      onClick={() => {
                        setSupportModalPreferredRelType(null);
                        setSupportManagerDoctorId(id);
                      }}
                    >
                      Add Support
                    </button>
                    {canArchiveThisContact(c) ? (
                      <button
                        type="button"
                        style={{ ...contactActionBtn, ...sc.btnGhost }}
                        onClick={() => setContactArchiveTarget(c)}
                      >
                        Remove
                      </button>
                    ) : null}
                    {editable ? (
                      <CompactActionMenu
                        items={[
                          { label: "Open contact", href: `/portal/sales/contacts/${id}` },
                          { label: "Edit contact", onClick: () => setContactModal(c) },
                        ]}
                      />
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ContactSection>

      <ContactSection dense={narrow} icon="🧑‍💼" title="Support" count={supportNetwork.length}>
        {supportNetwork.length === 0 ? (
          totalSupportNetwork === 0 ? (
            <PortalEmptyState
              compact
              icon="🧑‍💼"
              title="No support contacts yet"
              description="Add schedulers, office managers, and billing contacts."
              footer={
                <button type="button" style={{ ...sc.btnPrimary, fontSize: 13, padding: "10px 16px" }} onClick={() => openNewContact("scheduler")}>
                  Add support contact
                </button>
              }
            />
          ) : (
            <PortalEmptyState
              compact
              icon="🔍"
              title="No support contacts match filters"
              footer={
                <button
                  type="button"
                  style={{ ...sc.btnSecondary, fontSize: 13, padding: "10px 16px" }}
                  onClick={() => {
                    setSearch("");
                    setRoleFilter("");
                    setInfluenceFilter("");
                    setStrengthFilter("");
                  }}
                >
                  Clear filters
                </button>
              }
            />
          )
        ) : (
          <div className="org-contact-card-grid" style={{ display: "grid", gap: narrow ? 8 : 10 }}>
            {supportNetwork.map((c) => {
              const id = String(c.id || "");
              const supported = doctorsForSupport(id);
              return (
                <SupportContactCard
                  key={id}
                  c={c}
                  supported={supported}
                  narrow={narrow}
                  shellStyle={supportCardShell}
                  actionBtnStyle={contactActionBtn}
                  highlight={pulseContactId === id}
                  onEdit={() => setContactModal(c)}
                  canEdit={Boolean(meId)}
                  canArchive={canArchiveThisContact(c)}
                  onArchive={() => setContactArchiveTarget(c)}
                  onLinkSurgeonRequest={() => setTab("contacts")}
                />
              );
            })}
          </div>
        )}
      </ContactSection>

          {filteredContacts.length === 0 && contacts.length > 0 ? (
            <PortalEmptyState
              compact
              icon="🔍"
              title="No contacts match your filters"
              footer={
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  <button
                    type="button"
                    style={{ ...sc.btnSecondary, fontSize: 13, padding: "10px 16px" }}
                    onClick={() => {
                      setSearch("");
                      setRoleFilter("");
                      setInfluenceFilter("");
                      setStrengthFilter("");
                    }}
                  >
                    Clear filters
                  </button>
                  <button type="button" style={{ ...sc.btnPrimary, fontSize: 13, padding: "10px 16px" }} onClick={() => openNewContact()}>
                    Add contact
                  </button>
                </div>
              }
            />
          ) : null}
        </>
      )}
    </SalesPanel>
  );

  const clearOrgCaseFilters = () => {
    setCaseStatusFilter("");
    setCaseGapFilter("");
    setCaseProductFilter("");
    setCaseSurgeonFilter("");
    setCaseDateFrom("");
    setCaseDateTo("");
    setCaseRecordScope("active");
    stripAttentionFromUrl();
  };

  const orgCaseFiltersActive = Boolean(
    caseRecordScope !== "active" || caseStatusFilter || caseGapFilter || caseProductFilter || caseSurgeonFilter || caseDateFrom || caseDateTo,
  );

  const casesPanel = (
    <SalesPanel density="compact" nativeFlat={narrow} title="Cases">
      {cases.length === 0 ? (
        <PortalEmptyState
          icon="📋"
          title="No surgical cases yet"
          description="Create the first case to track procedure activity, products, documents, and billing for this organization."
          actions={[
            {
              href: `/portal/sales/cases/new?account_id=${accountId}`,
              label: "Create case",
              variant: "primary",
            },
          ]}
        />
      ) : (
        <div style={{ display: "grid", gap: narrow ? 10 : 12 }}>
          <div
            style={{
              display: "grid",
              gap: 12,
              padding: narrow ? 10 : 14,
              borderRadius: 14,
              border: "1px solid color-mix(in srgb, var(--foreground) 6%, var(--border))",
              background: "color-mix(in srgb, var(--foreground) 2.5%, var(--surface))",
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: "0.12em", textTransform: "uppercase", color: "color-mix(in srgb, var(--brand-700) 50%, var(--muted))" }}>
              Filters
            </div>
            <div
              style={
                narrow
                  ? {
                      overflowX: "auto",
                      WebkitOverflowScrolling: "touch",
                      scrollbarWidth: "none",
                    }
                  : undefined
              }
              className={narrow ? "org-case-status-scroll" : undefined}
            >
              <div
                className="org-account-tabs"
                style={{
                  display: "flex",
                  gap: 8,
                  flexWrap: narrow ? "nowrap" : "wrap",
                  alignItems: "center",
                  padding: narrow ? 8 : 10,
                  borderRadius: 12,
                  border: "1px solid color-mix(in srgb, var(--foreground) 8%, var(--border))",
                  background: "var(--surface)",
                  minWidth: narrow ? "min-content" : undefined,
                }}
              >
                <span style={{ fontSize: 12, fontWeight: 900, color: "var(--muted)", marginRight: 4, flex: "0 0 auto" }}>Status</span>
                {CASE_TAB_FILTERS.map((f) => {
                  const on = caseStatusFilter === f.id;
                  return (
                    <button
                      key={f.id || "all"}
                      type="button"
                      onClick={() => {
                        setCaseGapFilter("");
                        setCaseStatusFilter(f.id);
                        stripAttentionFromUrl();
                      }}
                      style={{
                        flex: "0 0 auto",
                        borderRadius: 999,
                        padding: narrow ? "8px 13px" : "7px 12px",
                        fontSize: 12,
                        fontWeight: 800,
                        minHeight: narrow ? 40 : undefined,
                        border: on ? "1px solid color-mix(in srgb, var(--brand-600) 45%, var(--border))" : "1px solid color-mix(in srgb, var(--foreground) 10%, var(--border))",
                        background: on
                          ? "linear-gradient(165deg, color-mix(in srgb, var(--brand-600) 16%, var(--surface)), var(--surface))"
                          : "var(--surface)",
                        color: "var(--foreground)",
                        cursor: "pointer",
                      }}
                    >
                      {f.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div
              style={
                narrow
                  ? {
                      overflowX: "auto",
                      WebkitOverflowScrolling: "touch",
                      scrollbarWidth: "none",
                    }
                  : undefined
              }
              className={narrow ? "org-case-status-scroll" : undefined}
            >
              <div
                className="org-account-tabs"
                style={{
                  display: "flex",
                  gap: 8,
                  flexWrap: narrow ? "nowrap" : "wrap",
                  alignItems: "center",
                  padding: narrow ? 8 : 10,
                  borderRadius: 12,
                  border: "1px solid color-mix(in srgb, var(--foreground) 8%, var(--border))",
                  background: "var(--surface)",
                  minWidth: narrow ? "min-content" : undefined,
                }}
              >
                <span style={{ fontSize: 12, fontWeight: 900, color: "var(--muted)", marginRight: 4, flex: "0 0 auto" }}>Records</span>
                {CASE_RECORD_SCOPE_FILTERS.map((f) => {
                  const on = caseRecordScope === f.id;
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setCaseRecordScope(f.id)}
                      style={{
                        flex: "0 0 auto",
                        borderRadius: 999,
                        padding: narrow ? "8px 13px" : "7px 12px",
                        fontSize: 12,
                        fontWeight: 800,
                        minHeight: narrow ? 40 : undefined,
                        border: on ? "1px solid color-mix(in srgb, var(--brand-600) 45%, var(--border))" : "1px solid color-mix(in srgb, var(--foreground) 10%, var(--border))",
                        background: on
                          ? "linear-gradient(165deg, color-mix(in srgb, var(--brand-600) 16%, var(--surface)), var(--surface))"
                          : "var(--surface)",
                        color: "var(--foreground)",
                        cursor: "pointer",
                      }}
                    >
                      {f.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div
              className="org-case-advanced-filters"
              style={{
                display: "grid",
                gridTemplateColumns: narrow ? "1fr" : "repeat(auto-fit, minmax(160px, 1fr))",
                gap: 12,
                alignItems: "end",
              }}
            >
              <label style={{ display: "grid", gap: 6, fontSize: 12, fontWeight: 800 }}>
                Product
                <select value={caseProductFilter} onChange={(e) => setCaseProductFilter(e.target.value)} style={fieldInput}>
                  <option value="">All products</option>
                  {caseProductOptions.map(([pid, label]) => (
                    <option key={pid} value={pid}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label style={{ display: "grid", gap: 6, fontSize: 12, fontWeight: 800 }}>
                Surgeon
                <select value={caseSurgeonFilter} onChange={(e) => setCaseSurgeonFilter(e.target.value)} style={fieldInput}>
                  <option value="">All surgeons</option>
                  {caseSurgeonOptions.map(([sid, label]) => (
                    <option key={sid} value={sid}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label style={{ display: "grid", gap: 6, fontSize: 12, fontWeight: 800 }}>
                From date
                <input type="date" value={caseDateFrom} onChange={(e) => setCaseDateFrom(e.target.value)} style={fieldInput} />
              </label>
              <label style={{ display: "grid", gap: 6, fontSize: 12, fontWeight: 800 }}>
                To date
                <input type="date" value={caseDateTo} onChange={(e) => setCaseDateTo(e.target.value)} style={fieldInput} />
              </label>
              {orgCaseFiltersActive ? (
                <button type="button" onClick={clearOrgCaseFilters} style={{ ...sc.btnGhost, minHeight: 44, fontWeight: 800 }}>
                  Clear filters
                </button>
              ) : null}
            </div>
          </div>

          {casesFiltered.length === 0 ? (
            <PortalEmptyState
              icon="🔍"
              title="No cases match these filters"
              description="Try another status, widen the date range, or clear filters to see the full case history."
              footer={
                <button type="button" style={{ ...sc.btnSecondary, minHeight: 44, fontWeight: 800 }} onClick={clearOrgCaseFilters}>
                  Clear filters
                </button>
              }
            />
          ) : (
            <div style={{ display: "grid", gap: 14 }}>
              <section>
                <div style={{ fontWeight: 900, fontSize: 15, letterSpacing: "-0.02em", marginBottom: 8 }}>Upcoming</div>
                {upcomingCasesFiltered.length === 0 ? (
                  <p style={{ margin: 0, color: "var(--muted)", fontSize: 14, fontWeight: 600 }}>No upcoming cases for this view.</p>
                ) : useMultiColumnCaseGrid ? (
                  <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fill, minmax(min(300px, 100%), 1fr))" }}>
                    {upcomingCasesFiltered.map((c) => orgCaseCard(c, "upcoming"))}
                  </div>
                ) : (
                  <div style={{ display: "grid", gap: 8 }}>{upcomingCasesFiltered.map((c) => orgCaseCard(c, "upcoming"))}</div>
                )}
              </section>
              <section>
                <div style={{ fontWeight: 900, fontSize: 15, letterSpacing: "-0.02em", marginBottom: 8 }}>History</div>
                {recentCasesFiltered.length === 0 ? (
                  <p style={{ margin: 0, color: "var(--muted)", fontSize: 14, fontWeight: 600 }}>No past cases for this view.</p>
                ) : useCaseCardsForHistory ? (
                  <div style={{ display: "grid", gap: 8 }}>{recentCasesFiltered.map((c) => orgCaseCard(c, "recent"))}</div>
                ) : (
                  orgCasesTableDesktop(recentCasesFiltered)
                )}
              </section>
            </div>
          )}
        </div>
      )}
    </SalesPanel>
  );

  const casesMissingPo = cases.filter((c) => Boolean((c as { missing_po?: boolean }).missing_po));
  const casesMissingInvoice = cases.filter((c) => Boolean((c as { missing_invoice?: boolean }).missing_invoice));
  const casesBillingReview = cases.filter((c) => String(c.status || "").toLowerCase() === "billing_review");

  const billingCaseDetailCard = (c: CaseRow) => {
    const id = String(c.id || "");
    const po = Boolean((c as { checklist_po?: boolean }).checklist_po);
    const inv = Boolean((c as { checklist_invoice?: boolean }).checklist_invoice);
    const qty = Boolean((c as { checklist_quantities?: boolean }).checklist_quantities);
    const readiness = (c as { billing_readiness?: string }).billing_readiness;
    const score = Number((c as { billing_checklist_score?: number }).billing_checklist_score ?? 0);
    return (
      <div
        key={id}
        style={{
          borderRadius: 12,
          border: "1px solid color-mix(in srgb, var(--foreground) 6%, var(--border))",
          padding: 12,
          display: "grid",
          gap: 8,
          background: "color-mix(in srgb, var(--brand-600) 4%, var(--surface))",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontWeight: 900, fontSize: 15 }}>{String(c.case_number)}</div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>{fmtDate(c.case_date)}</div>
          </div>
          <span style={{ ...badgeStyle, background: "color-mix(in srgb, var(--foreground) 6%, transparent)" }}>{formatSurgicalCaseStatus(String(c.status))}</span>
        </div>
        {readiness ? (
          <div style={{ fontSize: 12, fontWeight: 800, color: "var(--muted)" }}>
            Billing readiness · {billingReadinessLabel(readiness as BillingReadinessLevel)} ({score}/3)
          </div>
        ) : null}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, fontSize: 12, fontWeight: 700 }}>
          <span style={{ ...miniBadge, border: po ? "1px solid color-mix(in srgb, #16a34a 35%, var(--border))" : undefined }}>PO {po ? "✓" : "—"}</span>
          <span style={{ ...miniBadge, border: inv ? "1px solid color-mix(in srgb, #16a34a 35%, var(--border))" : undefined }}>Invoice {inv ? "✓" : "—"}</span>
          <span style={{ ...miniBadge, border: qty ? "1px solid color-mix(in srgb, #16a34a 35%, var(--border))" : undefined }}>Quantities {qty ? "✓" : "—"}</span>
        </div>
        <Link href={`/portal/sales/cases/${id}`} style={{ ...sc.btnSecondary, minHeight: 40, justifyContent: "center", display: "inline-flex", alignItems: "center" }}>
          Open case
        </Link>
      </div>
    );
  };

  const billingPanel = (
    <div style={{ display: "grid", gap: 10 }}>
      {billingDetailsMissing ? (
        <SalesPanel density="compact" nativeFlat={narrow} title="Organization billing profile">
          <p style={{ margin: "0 0 12px", fontSize: 14, lineHeight: 1.5, color: "var(--muted)", fontWeight: 600 }}>{billingDetailsMessage}</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <button type="button" style={{ ...sc.btnPrimary, minHeight: 44 }} onClick={() => setOrgEditOpen(true)}>
              {hasBillingContact ? "Add billing address" : "Edit organization"}
            </button>
            {!hasBillingContact ? (
              <button type="button" style={{ ...sc.btnSecondary, minHeight: 44 }} onClick={() => openNewContact("billing")}>
                Add billing contact
              </button>
            ) : null}
          </div>
        </SalesPanel>
      ) : null}
      <SalesPanel density="compact" nativeFlat={narrow} title="Billing & documents">
        <div style={{ display: "grid", gridTemplateColumns: narrow ? "1fr" : "repeat(3, minmax(0, 1fr))", gap: 8, marginBottom: 12 }}>
          <SalesMetricCard label="Missing PO" value={String(casesMissingPo.length)} hint="Cases without purchase order" tone={casesMissingPo.length ? "caution" : "default"} />
          <SalesMetricCard label="Missing invoice" value={String(casesMissingInvoice.length)} hint="Cases without invoice doc" tone={casesMissingInvoice.length ? "caution" : "default"} />
          <SalesMetricCard label="Billing review" value={String(casesBillingReview.length)} hint="Status = billing review" />
        </div>

        <div style={{ fontWeight: 900, fontSize: 14, marginBottom: 8 }}>Missing PO</div>
        {casesMissingPo.length === 0 ? (
          <p style={{ margin: "0 0 16px", color: "var(--muted)", fontSize: 14 }}>No cases missing a PO in this list.</p>
        ) : (
          <div style={{ display: "grid", gap: 10, gridTemplateColumns: narrow ? "1fr" : "repeat(auto-fill, minmax(280px, 1fr))", marginBottom: 18 }}>
            {casesMissingPo.map((c) => billingCaseDetailCard(c))}
          </div>
        )}

        <div style={{ fontWeight: 900, fontSize: 14, marginBottom: 8 }}>Missing invoice</div>
        {casesMissingInvoice.length === 0 ? (
          <p style={{ margin: "0 0 16px", color: "var(--muted)", fontSize: 14 }}>No cases missing an invoice in this list.</p>
        ) : (
          <div style={{ display: "grid", gap: 10, gridTemplateColumns: narrow ? "1fr" : "repeat(auto-fill, minmax(280px, 1fr))", marginBottom: 18 }}>
            {casesMissingInvoice.map((c) => billingCaseDetailCard(c))}
          </div>
        )}

        <div style={{ fontWeight: 900, fontSize: 14, marginBottom: 8 }}>Billing review queue</div>
        {casesBillingReview.length === 0 ? (
          <p style={{ margin: "0 0 16px", color: "var(--muted)", fontSize: 14 }}>No cases currently in billing review.</p>
        ) : (
          <div style={{ display: "grid", gap: 10, gridTemplateColumns: narrow ? "1fr" : "repeat(auto-fill, minmax(280px, 1fr))", marginBottom: 18 }}>
            {casesBillingReview.map((c) => billingCaseDetailCard(c))}
          </div>
        )}

        <div style={{ fontWeight: 900, fontSize: 14, marginBottom: 8 }}>Documents checklist (all recent cases)</div>
        {cases.length === 0 ? (
          <PortalEmptyState
            compact
            icon="📄"
            title="No documents yet"
            description="Create a case first—then upload POs, invoices, and other files from the case workspace to populate this checklist."
            actions={[
              {
                href: `/portal/sales/cases/new?account_id=${accountId}`,
                label: "Create case",
                variant: "primary",
              },
            ]}
          />
        ) : (
          <div style={{ display: "grid", gap: 10, gridTemplateColumns: narrow ? "1fr" : "repeat(auto-fill, minmax(280px, 1fr))" }}>{cases.slice(0, 12).map((c) => billingCaseDetailCard(c))}</div>
        )}
      </SalesPanel>

      <SalesPanel density="compact" nativeFlat={narrow} title="Billing contacts">
        {billingContactsOnAccount.length === 0 ? (
          <PortalEmptyState
            compact
            icon="💳"
            title="No billing contacts on file"
            description="Tag someone in billing or purchasing so finance handoffs stay clean."
            footer={
              <button type="button" style={{ ...sc.btnPrimary, fontSize: 13, padding: "10px 16px" }} onClick={() => openNewContact("billing")}>
                Add billing contact
              </button>
            }
          />
        ) : (
          <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 8, fontSize: 14 }}>
            {billingContactsOnAccount.map((c) => (
              <li key={String(c.id)}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  <Link
                    href={`/portal/sales/contacts/${String(c.id)}`}
                    style={{ display: "inline-flex", alignItems: "center", minHeight: 44, fontWeight: 800, color: "var(--foreground)" }}
                  >
                    {contactDisplayName(c as Parameters<typeof contactDisplayName>[0])}
                  </Link>
                  <RelationshipStrengthDot strength={c.relationship_strength} />
                </span>
                <span style={{ color: "var(--muted)" }}> · {formatSurgicalContactRole(String(c.role_type || "other"))}</span>
              </li>
            ))}
          </ul>
        )}
      </SalesPanel>
    </div>
  );

  const productApprovalsPanel = (
    <OrganizationProductApprovalsPanel accountId={accountId} contacts={contacts} narrow={narrow} />
  );

  const notesPanel = (
    <OrganizationNotesPanel
      accountId={accountId}
      notes={organizationNotes}
      standingNotes={notes}
      archived={isOrgArchived}
      narrow={narrow}
      onSaved={async () => {
        await load();
        pushToast("Note saved");
      }}
      onEditStandingNotes={() => setOrgEditOpen(true)}
    />
  );

  const activityPanel = (
    <div style={{ display: "grid", gap: 10 }}>
      <SalesPanel density="compact" nativeFlat={narrow} title="Activity timeline">
        {activityFeed.length === 0 ? (
          <PortalEmptyState
            icon="✨"
            title="No activity yet"
            description="Work this account—cases, contacts, uploads, and notes will roll into a single timeline here. Organization status notes also live on the Notes tab."
            footer={
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                <button type="button" style={{ ...sc.btnPrimary, fontSize: 14, padding: "11px 16px", minHeight: 44 }} onClick={() => setTab("notes")}>
                  Add note
                </button>
                <Link
                  href={`/portal/sales/cases/new?account_id=${accountId}`}
                  style={{ ...sc.btnSecondary, fontSize: 14, padding: "11px 16px", textDecoration: "none", display: "inline-flex", alignItems: "center", justifyContent: "center", minHeight: 44 }}
                >
                  Create case
                </Link>
                <button type="button" style={{ ...sc.btnSecondary, fontSize: 14, padding: "11px 16px", minHeight: 44 }} onClick={() => openNewContact("surgeon")}>
                  Add doctor
                </button>
              </div>
            }
          />
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            <div
              className={narrow ? "org-activity-filter-scroll" : undefined}
              style={
                narrow
                  ? { overflowX: "auto", WebkitOverflowScrolling: "touch", scrollbarWidth: "none" }
                  : undefined
              }
            >
              <div className="org-activity-filter-row" style={{ display: "flex", flexWrap: narrow ? "nowrap" : "wrap", gap: 8 }}>
              {ACTIVITY_FEED_KIND_FILTERS.map((f) => {
                const active = activityFeedKindFilter === f.id;
                return (
                  <button
                    key={f.id || "all"}
                    type="button"
                    onClick={() => setActivityFeedKindFilter(f.id)}
                    style={{
                      ...(active ? sc.btnPrimary : sc.btnSecondary),
                      fontSize: 12,
                      padding: "8px 12px",
                      borderRadius: 999,
                    }}
                  >
                    {f.label}
                    {f.id ? (
                      <span style={{ opacity: 0.85, fontWeight: 700, marginLeft: 6 }}>
                        ({activityFeed.filter((i) => i.feed_kind === f.id).length})
                      </span>
                    ) : (
                      <span style={{ opacity: 0.85, fontWeight: 700, marginLeft: 6 }}>({activityFeed.length})</span>
                    )}
                  </button>
                );
              })}
              </div>
            </div>
            {filteredActivityFeed.length === 0 ? (
              <PortalEmptyState
                compact
                icon="🏷️"
                title="Nothing in this category"
                description="Pick another filter or view all activity to see the full timeline."
                footer={
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                    <button type="button" style={{ ...sc.btnSecondary, fontSize: 13, padding: "10px 16px" }} onClick={() => setActivityFeedKindFilter("")}>
                      Show all activity
                    </button>
                    {activityFeedKindFilter === "note" ? (
                      <button type="button" style={{ ...sc.btnPrimary, fontSize: 13, padding: "10px 16px" }} onClick={() => setTab("notes")}>
                        Add organization note
                      </button>
                    ) : null}
                  </div>
                }
              />
            ) : (
              <div style={{ display: "grid", gap: 4 }}>
                {filteredActivityFeed.map((item, idx, arr) => (
                  <OrgActivityFeedRow key={item.id} item={item} isLast={idx === arr.length - 1} />
                ))}
              </div>
            )}
          </div>
        )}
      </SalesPanel>
      <SalesPanel density="compact" nativeFlat={narrow} title="Signals & product mix">
        {accountIntel?.insights?.length ? (
          <ul style={{ margin: "0 0 12px", paddingLeft: 18, display: "grid", gap: 6, fontSize: 14 }}>
            {accountIntel.insights.map((line, i) => (
              <li key={`${i}-${line.slice(0, 32)}`}>{line}</li>
            ))}
          </ul>
        ) : (
          <p style={{ margin: "0 0 12px", color: "var(--muted)", fontSize: 14 }}>No insight bullets yet.</p>
        )}
        {accountIntel?.cases_by_product?.length ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {accountIntel.cases_by_product.map((p) => (
              <span key={p.product_id} style={miniBadge}>
                {p.name}: {p.count}
              </span>
            ))}
          </div>
        ) : null}
        <div style={{ marginTop: 16 }}>
          <SurgicalAccountIntelligencePanel
            intel={accountIntel}
            appearance="portal"
            caseHref={(caseId) => `/portal/sales/cases/${caseId}`}
            footnote="Metrics use every case you own for this organization."
          />
        </div>
      </SalesPanel>
    </div>
  );

  const tabContent =
    activeTab === "overview"
      ? overviewPanel
      : activeTab === "contacts"
        ? contactsPanel
        : activeTab === "cases"
          ? casesPanel
          : activeTab === "billing"
            ? billingPanel
            : activeTab === "product_approvals"
              ? productApprovalsPanel
              : activeTab === "notes"
                ? notesPanel
                : activityPanel;

  const mobilePageShell = narrow ? (
    <>
      <div
        className="org-detail-mobile-sticky"
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          padding: "calc(6px + env(safe-area-inset-top, 0px)) 2px 0",
          background: "color-mix(in srgb, var(--background) 96%, transparent)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid color-mix(in srgb, var(--foreground) 8%, var(--border))",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6, paddingBottom: 8 }}>
          <PortalMobileMenuButton className="sales-cmd-mobile-menu" />
          <Link
            href="/portal/sales/accounts"
            aria-label="Back to organizations"
            style={{
              ...sc.linkBrand,
              color: "var(--brand-600)",
              fontWeight: 800,
              flex: "0 0 auto",
              minWidth: 44,
              minHeight: 44,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 10,
            }}
          >
            ←
          </Link>
          <div style={{ minWidth: 0, flex: 1 }}>
            <h1
              style={{
                margin: 0,
                fontWeight: 900,
                fontSize: 15,
                lineHeight: 1.15,
                overflow: "hidden",
                textOverflow: "ellipsis",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
              }}
            >
              {orgTitle}
            </h1>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 4 }}>
              <span style={{ ...badgeStyle, fontSize: 11, padding: "2px 7px" }}>{formatSurgicalAccountType(String(account.surgical_crm_type))}</span>
              <span style={{ ...badgeStyle, fontSize: 11, padding: "2px 7px" }}>{formatSurgicalAccountStatus(String(account.surgical_crm_status))}</span>
            </div>
          </div>
          {orgArchiveEligible ? (
            <CompactActionMenu
              items={[
                isOrgArchived
                  ? { label: "Restore organization", onClick: () => setOrgArchiveConfirm("restore") }
                  : { label: "Archive organization", onClick: () => setOrgArchiveConfirm("archive") },
              ]}
            />
          ) : null}
        </div>
        <div style={{ padding: "4px 0 8px", borderTop: "1px solid color-mix(in srgb, var(--foreground) 6%, var(--border))" }}>{renderTabPills()}</div>
      </div>
      <div style={{ padding: "10px 0 0", width: "100%", maxWidth: "100%", minWidth: 0 }}>{metricStrip}</div>
    </>
  ) : null;

  const desktopHero = !narrow ? (
    <div style={heroShell}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
        <div style={{ minWidth: 0, flex: "1 1 280px" }}>
          <Link href="/portal/sales/accounts" style={{ color: "#7dd3fc", fontWeight: 800, fontSize: 13, display: "inline-flex", gap: 6, alignItems: "center" }}>
            ← Back to organizations
          </Link>
          <h1 style={{ margin: "10px 0 8px", fontSize: 30, lineHeight: 1.1, letterSpacing: "-0.02em", wordBreak: "break-word" }}>{orgTitle}</h1>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span style={badgeOnHero}>{formatSurgicalAccountType(String(account.surgical_crm_type))}</span>
            <span style={badgeOnHero}>{formatSurgicalAccountStatus(String(account.surgical_crm_status))}</span>
          </div>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "flex-end", flex: "1 1 240px" }}>
          <Link href={`/portal/sales/cases/new?account_id=${accountId}`} style={primaryRowBtn}>
            Add case
          </Link>
          <button type="button" style={primaryRowBtn} onClick={() => openNewContact()}>
            Add contact
          </button>
          {LOG_UPDATE_UI_ENABLED ? (
            <button
              type="button"
              style={ghostOnHero}
              onClick={() => {
                const ctx = buildCaptureIntelligenceOpenContext("organization", {
                  organizationId: accountId,
                  organizationLabel: String(account?.name ?? "Organization"),
                });
                captureIntelligence.open(ctx, { onSaved: () => void load() });
              }}
            >
              {captureIntelligenceTitleForContext(
                buildCaptureIntelligenceOpenContext("organization", { organizationId: accountId }),
              )}
            </button>
          ) : null}
          <button type="button" onClick={() => setOrgEditOpen(true)} style={ghostOnHero}>
            Edit organization
          </button>
          {orgArchiveEligible ? (
            isOrgArchived ? (
              <button type="button" style={ghostOnHero} onClick={() => setOrgArchiveConfirm("restore")}>
                Restore organization
              </button>
            ) : (
              <button type="button" style={ghostOnHero} onClick={() => setOrgArchiveConfirm("archive")}>
                Archive organization
              </button>
            )
          ) : null}
        </div>
      </div>
      {isOrgArchived ? (
        <div
          style={{
            marginTop: 16,
            padding: "12px 14px",
            borderRadius: 12,
            background: "rgba(0,0,0,0.22)",
            border: "1px solid rgba(255,255,255,0.2)",
            color: "#e2e8f0",
            fontSize: 14,
            fontWeight: 650,
            lineHeight: 1.45,
          }}
        >
          This organization is archived — it is hidden from active directory views. Linked contacts and cases stay intact for history and billing.
        </div>
      ) : null}
    </div>
  ) : null;

  return (
    <SalesCommandPage omitBuiltInHeader density="tight" titleTone="onDark" kicker="" title={orgTitle} subtitle="">
      <style dangerouslySetInnerHTML={{ __html: orgAccountDetailCss }} />
      <div
        className="org-account-detail-root org-workspace-page sc-native-page org-account-detail-native"
        style={{
          display: "grid",
          gap: narrow ? 8 : 11,
          paddingBottom: narrow
            ? `calc(${mobileActionBarCompact ? 82 : 108}px + env(safe-area-inset-bottom, 0px))`
            : 12,
          width: "100%",
          maxWidth: "100%",
          minWidth: 0,
          overflowX: "hidden",
          boxSizing: "border-box",
        }}
      >
        {err ? <div style={sc.alertError}>{err}</div> : null}
                {billingDetailsMissing && !isOrgArchived ? (
          <div
            role="alert"
            style={{
              borderRadius: 12,
              padding: narrow ? "12px 14px" : "14px 16px",
              border: "1px solid color-mix(in srgb, #b45309 40%, var(--border))",
              background: "color-mix(in srgb, #b45309 10%, var(--surface))",
              display: "grid",
              gap: 10,
            }}
          >
            <div>
              <div style={{ margin: 0, fontSize: 14, fontWeight: 900, color: "#9a3412" }}>
                Missing billing details
              </div>
              <p style={{ margin: "6px 0 0", fontSize: 13, lineHeight: 1.45, color: "var(--foreground)", fontWeight: 600 }}>{billingDetailsMessage}</p>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <button type="button" style={{ ...sc.btnPrimary, minHeight: 42 }} onClick={() => setOrgEditOpen(true)}>
                {hasBillingContact ? "Add billing address" : "Edit organization"}
              </button>
              {!hasBillingContact ? (
                <button type="button" style={{ ...sc.btnSecondary, minHeight: 42 }} onClick={() => openNewContact("billing")}>
                  Add billing contact
                </button>
              ) : (
                <button type="button" style={{ ...sc.btnSecondary, minHeight: 42 }} onClick={() => setTab("billing")}>
                  Open billing tab
                </button>
              )}
            </div>
          </div>
        ) : null}

        {mobilePageShell}
        {!narrow ? desktopHero : null}
        {!narrow ? renderTabPills() : null}
        <div className="org-tab-content">{tabContent}</div>
      </div>

      {narrow ? (
        <div
          className="crm-mobile-org-action-bar"
          role="navigation"
          aria-label="Organization quick actions"
          style={{
            position: "fixed",
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 60,
            paddingLeft: 10,
            paddingRight: 10,
            paddingTop: mobileActionBarCompact ? 6 : 10,
            paddingBottom: "calc(10px + env(safe-area-inset-bottom, 0px))",
            background: "color-mix(in srgb, var(--background) 93%, transparent)",
            WebkitBackdropFilter: "saturate(150%) blur(16px)",
            backdropFilter: "saturate(150%) blur(16px)",
            borderTop: "1px solid color-mix(in srgb, var(--foreground) 10%, var(--border))",
            boxShadow: "0 -10px 28px color-mix(in srgb, #000 14%, transparent)",
            transition: "padding-top 0.22s ease, padding-bottom 0.22s ease",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 8,
              maxWidth: 720,
              margin: "0 auto",
            }}
          >
            <Link
              href={`/portal/sales/cases/new?account_id=${accountId}`}
              style={{
                minWidth: 0,
                minHeight: mobileActionBarCompact ? 48 : 54,
                borderRadius: 14,
                padding: mobileActionBarCompact ? "8px 6px" : "12px 8px",
                fontWeight: 800,
                fontSize: mobileActionBarCompact ? 13 : 15,
                lineHeight: 1.25,
                textAlign: "center",
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                border: "1px solid color-mix(in srgb, var(--crm-cyan-bright, #22d3ee) 35%, var(--brand-600))",
                background:
                  "linear-gradient(165deg, color-mix(in srgb, var(--brand-600) 92%, white) 0%, var(--brand-600) 55%, color-mix(in srgb, var(--brand-700) 88%, var(--brand-600)) 100%)",
                boxShadow: "0 3px 12px color-mix(in srgb, var(--brand-600) 32%, transparent)",
                WebkitTapHighlightColor: "transparent",
                touchAction: "manipulation",
                boxSizing: "border-box",
              }}
            >
              Add case
            </Link>
            <button
              type="button"
              onClick={() => openNewContact()}
              style={{
                minWidth: 0,
                minHeight: mobileActionBarCompact ? 48 : 54,
                borderRadius: 14,
                padding: mobileActionBarCompact ? "8px 6px" : "12px 8px",
                fontWeight: 800,
                fontSize: mobileActionBarCompact ? 13 : 15,
                lineHeight: 1.25,
                cursor: "pointer",
                color: "var(--brand-700)",
                border: "1px solid color-mix(in srgb, var(--brand-600) 28%, var(--border))",
                background: "color-mix(in srgb, var(--brand-600) 9%, var(--surface))",
                boxShadow: "0 1px 0 color-mix(in srgb, var(--foreground) 5%, transparent)",
                WebkitTapHighlightColor: "transparent",
                touchAction: "manipulation",
                boxSizing: "border-box",
              }}
            >
              Add contact
            </button>
            {LOG_UPDATE_UI_ENABLED ? (
              <button
                type="button"
                onClick={() => {
                  const ctx = buildCaptureIntelligenceOpenContext("organization", {
                    organizationId: accountId,
                    organizationLabel: String(account?.name ?? "Organization"),
                  });
                  captureIntelligence.open(ctx, { onSaved: () => void load() });
                }}
                style={{
                  minWidth: 0,
                  minHeight: mobileActionBarCompact ? 48 : 54,
                  borderRadius: 14,
                  padding: mobileActionBarCompact ? "8px 6px" : "12px 8px",
                  fontWeight: 800,
                  fontSize: mobileActionBarCompact ? 12 : 13,
                  lineHeight: 1.25,
                  cursor: "pointer",
                  color: "var(--brand-700)",
                  border: "1px solid color-mix(in srgb, var(--brand-600) 28%, var(--border))",
                  background: "color-mix(in srgb, var(--brand-600) 9%, var(--surface))",
                  WebkitTapHighlightColor: "transparent",
                  touchAction: "manipulation",
                  boxSizing: "border-box",
                }}
              >
                {captureIntelligenceTitleForContext(
                  buildCaptureIntelligenceOpenContext("organization", { organizationId: accountId }),
                )}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => focusContactsSearch()}
              aria-label="Search contacts on this organization"
              style={{
                minWidth: 0,
                minHeight: mobileActionBarCompact ? 48 : 54,
                borderRadius: 14,
                padding: mobileActionBarCompact ? "8px 6px" : "12px 8px",
                fontWeight: 800,
                fontSize: mobileActionBarCompact ? 13 : 15,
                lineHeight: 1.25,
                cursor: "pointer",
                color: "var(--foreground)",
                border: "1px solid color-mix(in srgb, var(--foreground) 12%, var(--border))",
                background: "color-mix(in srgb, var(--surface-2) 88%, var(--brand-600) 4%)",
                WebkitTapHighlightColor: "transparent",
                touchAction: "manipulation",
                boxSizing: "border-box",
              }}
            >
              Search
            </button>
          </div>
        </div>
      ) : null}

      {contactModal ? (
        <PortalContactModal
          accountId={accountId}
          opportunityId={(searchParams.get("opportunity_id") || "").trim() || null}
          contact={contactModal === "new" ? null : contactModal}
          defaultRoleWhenNew={contactModal === "new" ? newContactRolePreset : undefined}
          onClose={closeContactModal}
          onSaved={(detail) => {
            closeContactModal();
            if (detail?.contact?.id) {
              const id = String(detail.contact.id);
              if (detail.created) {
                setContacts((prev) => (prev.some((c) => String(c.id) === id) ? prev : [detail.contact!, ...prev]));
                pushToast("Contact added");
              } else {
                setContacts((prev) => prev.map((c) => (String(c.id) === id ? { ...c, ...detail.contact } : c)));
                pushToast("Contact saved");
              }
              flashContactHighlight(id);
            }
            void load();
          }}
        />
      ) : null}
      {supportManagerDoctorId ? (
        <ManageSupportContactsModal
          doctorId={supportManagerDoctorId}
          contextOrganizationId={accountId}
          preferredRelationshipType={supportModalPreferredRelType}
          onClose={() => {
            setSupportManagerDoctorId(null);
            setSupportModalPreferredRelType(null);
          }}
          onChanged={() => void load()}
          onRelationshipCreated={(rel) => {
            const rid = String(rel.id || "");
            setRelationships((prev) => {
              if (rid && prev.some((r) => String(r.id) === rid)) return prev;
              return [rel, ...prev];
            });
            pushToast("Support contact linked");
            flashContactHighlight(supportManagerDoctorId);
          }}
          onSupportContactCreatedAndLinked={(newContact, rel) => {
            const cid = String(newContact.id || "");
            const rid = String(rel.id || "");
            if (cid) {
              setContacts((prev) => (prev.some((c) => String(c.id) === cid) ? prev : [newContact, ...prev]));
              flashContactHighlight(cid);
            }
            if (rid) {
              setRelationships((prev) => {
                if (prev.some((r) => String(r.id) === rid)) return prev;
                return [rel, ...prev];
              });
            }
            pushToast("Support contact created and linked");
          }}
        />
      ) : null}
      <SalesCrmConfirmModal
        open={orgCaseCompleteTarget !== null}
        title="Mark case completed?"
        message={
          orgCaseCompleteTarget
            ? `Case ${String(orgCaseCompleteTarget.case_number || orgCaseCompleteTarget.id).trim()} will be marked completed. You can still add notes and files afterward.`
            : ""
        }
        confirmLabel="Mark completed"
        busy={orgCaseStatusBusyId === String(orgCaseCompleteTarget?.id || "")}
        error={orgCaseCompleteErr}
        onClose={() => {
          if (orgCaseStatusBusyId !== String(orgCaseCompleteTarget?.id || "")) {
            setOrgCaseCompleteTarget(null);
            setOrgCaseCompleteErr(null);
          }
        }}
        onConfirm={async () => {
          const target = orgCaseCompleteTarget;
          const id = target ? String(target.id || "") : "";
          if (!id) return;
          setOrgCaseStatusBusyId(id);
          setOrgCaseCompleteErr(null);
          try {
            const res = await fetch(`/api/portal/sales/surgical-cases/${encodeURIComponent(id)}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ status: "completed" }),
            });
            const j = (await res.json()) as { ok?: boolean; error?: unknown; case?: Record<string, unknown> };
            if (!res.ok || !j.ok) throw new Error(typeof j.error === "string" ? j.error : "Could not update the case.");
            const savedStatus = j.case?.status !== undefined ? String(j.case.status) : "completed";
            setCases((prev) => prev.map((row) => (String(row.id) === id ? { ...row, status: savedStatus } : row)));
            setOrgCaseCompleteTarget(null);
            setOrgCaseCompleteErr(null);
            void load();
          } catch (e: unknown) {
            setOrgCaseCompleteErr(userFacingError(e, "We could not save that update. Please try again."));
          } finally {
            setOrgCaseStatusBusyId(null);
          }
        }}
      />
      <SalesCrmConfirmModal
        open={orgArchiveConfirm !== null}
        title={orgArchiveConfirm === "restore" ? "Restore organization?" : "Archive organization?"}
        message={
          orgArchiveConfirm === "restore"
            ? "Restore this organization? It will appear again in active directory views."
            : "Archive this organization? It will be hidden from active views but historical cases will remain intact."
        }
        confirmLabel={orgArchiveConfirm === "restore" ? "Restore" : "Archive"}
        danger={orgArchiveConfirm === "archive"}
        busy={orgArchiveBusy}
        onClose={() => {
          if (!orgArchiveBusy) setOrgArchiveConfirm(null);
        }}
        onConfirm={async () => {
          if (!orgArchiveConfirm) return;
          setOrgArchiveBusy(true);
          try {
            const res = await fetch(`/api/portal/sales/surgical-accounts/${encodeURIComponent(accountId)}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(orgArchiveConfirm === "restore" ? { restore: true } : { archive: true }),
            });
            const j = (await res.json()) as { ok?: boolean; error?: string };
            if (!res.ok || !j.ok) throw new Error(j.error || "");
            pushToast(orgArchiveConfirm === "restore" ? "Organization restored." : "Organization archived.");
            setOrgArchiveConfirm(null);
            await load();
          } catch (e: unknown) {
            pushToast(userFacingError(e, "Could not update organization."));
          } finally {
            setOrgArchiveBusy(false);
          }
        }}
      />
      <EditOrganizationModal
        open={orgEditOpen}
        accountId={accountId}
        organization={account}
        onClose={() => setOrgEditOpen(false)}
        onSaved={(org) => {
          setAccount(org);
          pushToast("Organization updated.");
          void load();
        }}
      />
      <RemovePersonModal
        open={contactArchiveTarget !== null}
        personName={
          contactArchiveTarget
            ? contactDisplayName(contactArchiveTarget as Parameters<typeof contactDisplayName>[0]) || "this person"
            : "this person"
        }
        isProvider={isProviderRole(String(contactArchiveTarget?.role_type || ""))}
        busy={contactArchiveBusy}
        error={contactArchiveError}
        onClose={() => {
          if (!contactArchiveBusy) {
            setContactArchiveTarget(null);
            setContactArchiveError(null);
          }
        }}
        onConfirm={async (scope: ProviderRemoveScope) => {
          const cid = contactArchiveTarget?.id ? String(contactArchiveTarget.id) : "";
          if (!cid) return;
          const asProvider = isProviderRole(String(contactArchiveTarget?.role_type || ""));
          setContactArchiveBusy(true);
          setContactArchiveError(null);
          try {
            if (asProvider) {
              const res = await fetch(`/api/portal/sales/providers/${encodeURIComponent(cid)}/remove`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ scope }),
              });
              const j = (await res.json()) as { ok?: boolean; error?: string };
              if (!res.ok || !j.ok) throw new Error(j.error || "");
            } else {
              const res = await fetch(`/api/portal/sales/surgical-contacts/${encodeURIComponent(cid)}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ archive: true }),
              });
              const j = (await res.json()) as { ok?: boolean; error?: string };
              if (!res.ok || !j.ok) throw new Error(j.error || "");
            }
            pushToast(scope === "keep_as_contact" ? "Hidden from Providers. Still in Contacts." : "Removed from active lists.");
            setContactArchiveTarget(null);
            await load();
          } catch (e: unknown) {
            setContactArchiveError(userFacingError(e, "Could not remove this person."));
          } finally {
            setContactArchiveBusy(false);
          }
        }}
      />
      <SalesCrmConfirmModal
        open={relRemoveTarget !== null}
        title="Remove support relationship?"
        message={relRemoveTarget?.message || ""}
        confirmLabel="Remove"
        danger
        busy={relRemoveBusy}
        onClose={() => {
          if (!relRemoveBusy) setRelRemoveTarget(null);
        }}
        onConfirm={async () => {
          if (!relRemoveTarget?.relId) return;
          setRelRemoveBusy(true);
          try {
            const res = await fetch(`/api/portal/sales/surgical-contact-relationships/${encodeURIComponent(relRemoveTarget.relId)}`, {
              method: "DELETE",
            });
            const j = (await res.json()) as { ok?: boolean; error?: string };
            if (!res.ok || !j.ok) throw new Error(j.error || "");
            pushToast("Support link removed.");
            setRelRemoveTarget(null);
            await load();
          } catch (e: unknown) {
            pushToast(userFacingError(e, "Could not remove link."));
          } finally {
            setRelRemoveBusy(false);
          }
        }}
      />
      <SalesToastStack items={toasts} />
    </SalesCommandPage>
  );
}

function ContactSection({
  dense,
  icon,
  title,
  description,
  count,
  children,
}: {
  dense?: boolean;
  icon: string;
  title: string;
  description?: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section style={{ marginBottom: dense ? 10 : 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: dense ? 6 : 8, marginBottom: dense ? 6 : 7 }}>
        <span style={{ fontSize: dense ? 14 : 16, lineHeight: 1, opacity: 0.8 }} aria-hidden>
          {icon}
        </span>
        <div style={{ minWidth: 0 }}>
          <h3 style={{ margin: 0, fontSize: dense ? 13 : 13.5, fontWeight: 800, letterSpacing: "-0.01em", color: "color-mix(in srgb, var(--foreground) 88%, var(--muted))" }}>
            {title} <span style={{ color: "var(--muted)", fontWeight: 700 }}>({count})</span>
          </h3>
          {description ? <p style={{ margin: dense ? "3px 0 0" : "4px 0 0", fontSize: 12.5, color: "var(--muted)", lineHeight: 1.45 }}>{description}</p> : null}
        </div>
      </div>
      {children}
    </section>
  );
}

type CompactActionMenuItem = {
  label: string;
  href?: string;
  onClick?: () => void;
  tone?: "default" | "danger";
};

const compactActionMenuTriggerStyle: React.CSSProperties = {
  listStyle: "none",
  cursor: "pointer",
  borderRadius: 8,
  border: "1px solid color-mix(in srgb, var(--foreground) 10%, var(--border))",
  background: "var(--surface)",
  minWidth: 44,
  minHeight: 44,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 15,
  fontWeight: 800,
  lineHeight: 1,
  userSelect: "none",
  padding: 0,
};

const compactActionMenuPopoverShell: React.CSSProperties = {
  minWidth: 140,
  maxWidth: "min(240px, calc(100vw - 24px))",
  borderRadius: 10,
  border: "1px solid color-mix(in srgb, var(--foreground) 10%, var(--border))",
  background: "var(--surface)",
  boxShadow: "0 10px 26px color-mix(in srgb, var(--foreground) 16%, transparent)",
  padding: 4,
  display: "grid",
  gap: 2,
};

function CompactActionMenu({
  items,
  align = "right",
}: {
  items: CompactActionMenuItem[];
  align?: "left" | "right";
}) {
  const [open, setOpen] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  const [menuStyle, setMenuStyle] = React.useState<React.CSSProperties | null>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const menuId = React.useId();

  React.useEffect(() => setMounted(true), []);

  const close = React.useCallback(() => setOpen(false), []);

  const positionMenu = React.useCallback(() => {
    const trigger = triggerRef.current;
    const menu = menuRef.current;
    if (!trigger || !menu) return;

    const rect = trigger.getBoundingClientRect();
    const menuHeight = menu.offsetHeight;
    const menuWidth = menu.offsetWidth;
    const gap = 4;
    const spaceBelow = window.innerHeight - rect.bottom;
    const flipUp = spaceBelow < menuHeight + gap && rect.top > menuHeight + gap;
    const top = flipUp
      ? Math.max(8, rect.top - menuHeight - gap)
      : Math.min(window.innerHeight - menuHeight - 8, rect.bottom + gap);
    const left =
      align === "left"
        ? Math.max(12, Math.min(rect.left, window.innerWidth - menuWidth - 12))
        : Math.max(12, Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 12));

    setMenuStyle({
      position: "fixed",
      top,
      left,
      zIndex: 200,
      ...compactActionMenuPopoverShell,
    });
  }, [align]);

  React.useLayoutEffect(() => {
    if (!open) return;
    positionMenu();
  }, [open, positionMenu, items.length]);

  React.useEffect(() => {
    if (!open) return;
    const onScrollOrResize = () => positionMenu();
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [open, positionMenu]);

  React.useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      close();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, close]);

  if (!items.length) return null;

  const menu =
    open && mounted
      ? createPortal(
          <div
            ref={menuRef}
            id={menuId}
            role="menu"
            className="compact-action-menu-popover"
            style={menuStyle ?? { ...compactActionMenuPopoverShell, position: "fixed", visibility: "hidden" }}
          >
            {items.map((item) => {
              const itemStyle: React.CSSProperties = {
                padding: "7px 8px",
                borderRadius: 8,
                textDecoration: "none",
                color: item.tone === "danger" ? "var(--danger)" : "var(--foreground)",
                fontSize: 11.5,
                fontWeight: 700,
                border: "none",
                background: "transparent",
                textAlign: "left",
                cursor: "pointer",
                width: "100%",
              };
              if (item.href) {
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    role="menuitem"
                    style={itemStyle}
                    onClick={close}
                  >
                    {item.label}
                  </Link>
                );
              }
              return (
                <button
                  key={item.label}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    item.onClick?.();
                    close();
                  }}
                  style={itemStyle}
                >
                  {item.label}
                </button>
              );
            })}
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="compact-action-menu"
        style={compactActionMenuTriggerStyle}
        aria-label="More actions"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((value) => !value)}
      >
        ⋯
      </button>
      {menu}
    </>
  );
}

function SupportContactCard({
  c,
  supported,
  onEdit,
  canEdit,
  canArchive,
  onArchive,
  narrow: _narrow,
  shellStyle,
  actionBtnStyle,
  highlight,
  onLinkSurgeonRequest,
}: {
  c: Contact;
  supported: Array<{ rel: Relationship; contact?: Contact }>;
  onEdit: () => void;
  canEdit: boolean;
  canArchive?: boolean;
  onArchive?: () => void;
  narrow: boolean;
  shellStyle: React.CSSProperties;
  actionBtnStyle: React.CSSProperties;
  highlight?: boolean;
  onLinkSurgeonRequest?: () => void;
}) {
  const cid = String(c.id || "");
  const viewHref = cid ? `/portal/sales/contacts/${cid}` : "#";
  const emailText = String(c.email ?? "").trim();
  const phoneText = String(c.phone ?? "").trim();
  const mobileText = String(c.mobile_phone ?? "").trim();
  const linePhone = phoneText || mobileText;
  const roleKey = String(c.role_type || "other");
  const inf = String(c.influence_level ?? "").trim() || "unknown";
  const str = String(c.relationship_strength ?? "").trim() || "unknown";
  const influenceKnown = inf !== "unknown";
  const strengthKnown = str !== "unknown";

  const firstSupported = supported[0];
  const firstDoc = firstSupported?.contact;
  const firstDocId = String(firstDoc?.id || "");

  const secondaryContactAction: React.CSSProperties = {
    ...actionBtnStyle,
    textDecoration: "none",
    boxSizing: "border-box",
  };

  return (
    <div
      className="org-support-card"
      style={{
        ...shellStyle,
        ...newItemGlowBox(Boolean(highlight)),
        minHeight: _narrow ? 132 : 144,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 7, alignItems: "flex-start" }}>
        <div style={{ display: "flex", gap: 8, minWidth: 0, alignItems: "flex-start" }}>
          <span style={{ marginTop: 1 }}>
            <RoleIcon roleType={roleKey} />
          </span>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <Link
                href={viewHref}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  minHeight: _narrow ? 44 : undefined,
                  fontWeight: 900,
                  fontSize: 13.5,
                  lineHeight: 1.2,
                  color: "var(--foreground)",
                  textDecoration: "none",
                  wordBreak: "break-word",
                }}
              >
                {contactDisplayName(c as Parameters<typeof contactDisplayName>[0])}
              </Link>
              {strengthKnown ? <RelationshipStrengthDot strength={c.relationship_strength} /> : null}
            </div>
            <span style={{ ...roleTypeBadgeStyle(roleKey), display: "inline-block", marginTop: 4 }}>{formatSurgicalContactRole(roleKey)}</span>
          </div>
        </div>
      </div>
      {emailText || linePhone ? (
        <div style={{ fontSize: 11.5, color: "var(--foreground)", lineHeight: 1.3 }}>
          {emailText ? <div style={{ wordBreak: "break-all" }}>{emailText}</div> : null}
          {linePhone ? <div style={{ fontWeight: 600 }}>{linePhone}</div> : null}
        </div>
      ) : null}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
        {influenceKnown ? <span style={influencePillStyle(inf)}>Influence: {inf.replace(/_/g, " ")}</span> : null}
        {strengthKnown ? <span style={strengthPillStyle(str)}>Strength: {str}</span> : null}
      </div>
      {supported.length > 0 ? (
        <div style={{ display: "grid", gap: 4 }}>
          {supported.slice(0, 2).map((s) => {
            const doc = s.contact;
            const did = String(doc?.id || "");
            if (!did) return null;
            return (
              <div key={String(s.rel.id || did)} style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: "var(--muted)", whiteSpace: "nowrap" }}>Supports:</span>
                <Link
                  href={`/portal/sales/contacts/${did}`}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    minHeight: 44,
                    fontSize: 12.5,
                    fontWeight: 700,
                    color: "var(--foreground)",
                    textDecoration: "none",
                  }}
                >
                  {contactDisplayName((doc || {}) as Parameters<typeof contactDisplayName>[0])}
                </Link>
              </div>
            );
          })}
        </div>
      ) : null}
      <div className="org-contact-card-actions" style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", marginTop: 1 }}>
        {firstDocId ? (
          <Link href={`/portal/sales/contacts/${firstDocId}`} style={{ ...actionBtnStyle, ...sc.btnSecondary, textDecoration: "none" }}>
            Link doctor
            {supported.length > 1 ? (
              <span style={{ marginLeft: 6, fontWeight: 700, opacity: 0.92 }}>(+{supported.length - 1})</span>
            ) : null}
          </Link>
        ) : (
          <button type="button" style={{ ...actionBtnStyle, ...sc.btnSecondary }} onClick={() => onLinkSurgeonRequest?.()}>
            + Link doctor
          </button>
        )}
        {linePhone ? (
          <a href={`tel:${linePhone.replace(/\s/g, "")}`} style={secondaryContactAction}>
            Call
          </a>
        ) : null}
        {emailText ? (
          <a href={`mailto:${emailText}`} style={secondaryContactAction}>
            Email
          </a>
        ) : null}
        {canArchive ? (
          <button type="button" style={{ ...actionBtnStyle, ...sc.btnGhost }} onClick={() => onArchive?.()}>
            Remove
          </button>
        ) : null}
        {canEdit ? (
          <CompactActionMenu
            items={[
              { label: "Open contact", href: viewHref },
              { label: "Edit contact", onClick: onEdit },
            ]}
          />
        ) : null}
      </div>
    </div>
  );
}

function PortalContactModal({
  accountId,
  opportunityId,
  contact,
  defaultRoleWhenNew,
  onClose,
  onSaved,
}: {
  accountId: string;
  opportunityId?: string | null;
  contact: Contact | null;
  defaultRoleWhenNew?: string;
  onClose: () => void;
  onSaved: (detail?: { contact?: Contact; created?: boolean }) => void;
}) {
  const [first, setFirst] = React.useState("");
  const [last, setLast] = React.useState("");
  const [title, setTitle] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [mobilePhone, setMobilePhone] = React.useState("");
  const [role, setRole] = React.useState("other");
  const [influenceLevel, setInfluenceLevel] = React.useState("unknown");
  const [relationshipStrength, setRelationshipStrength] = React.useState("unknown");
  const [primary, setPrimary] = React.useState(false);
  const [notes, setNotes] = React.useState("");
  const [orgSpecialty, setOrgSpecialty] = React.useState("");
  const [preferredHospital, setPreferredHospital] = React.useState("");
  const [orgActive, setOrgActive] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [formErr, setFormErr] = React.useState<string | null>(null);
  const [modalNarrow, setModalNarrow] = React.useState(false);
  const [mode, setMode] = React.useState<"create" | "existing">("create");
  const [existingQ, setExistingQ] = React.useState("");
  const [existingRoleFilter, setExistingRoleFilter] = React.useState("");
  const [existingBusy, setExistingBusy] = React.useState(false);
  const [existingResults, setExistingResults] = React.useState<Contact[]>([]);
  const [possibleDuplicates, setPossibleDuplicates] = React.useState<Array<Contact & { existing_orgs?: string[] }>>([]);
  const [markChampion, setMarkChampion] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 1024px)");
    const apply = () => setModalNarrow(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  React.useEffect(() => {
    if (contact) {
      setFirst(String(contact.first_name ?? ""));
      setLast(String(contact.last_name ?? ""));
      setTitle(String(contact.title ?? ""));
      setEmail(String(contact.email ?? ""));
      setPhone(String(contact.phone ?? ""));
      setMobilePhone(String(contact.mobile_phone ?? ""));
      setRole(String(contact.role_type ?? "other"));
      setInfluenceLevel(String(contact.influence_level ?? "unknown"));
      setRelationshipStrength(String(contact.relationship_strength ?? "unknown"));
      setPrimary(Boolean(contact.is_primary_contact ?? contact.is_primary));
      setNotes(String(contact.notes ?? ""));
      setOrgSpecialty("");
      setPreferredHospital("");
      setOrgActive(true);
      setMode("create");
      setMarkChampion(false);
    } else {
      setFirst("");
      setLast("");
      setTitle("");
      setEmail("");
      setPhone("");
      setMobilePhone("");
      const roles = SURGICAL_CONTACT_ROLE_TYPES_V2 as readonly string[];
      setRole(defaultRoleWhenNew && roles.includes(defaultRoleWhenNew) ? defaultRoleWhenNew : "other");
      setInfluenceLevel("unknown");
      setRelationshipStrength("unknown");
      setPrimary(false);
      setNotes("");
      setOrgSpecialty("");
      setPreferredHospital("");
      setOrgActive(true);
      setMode("create");
      setMarkChampion(defaultRoleWhenNew === "surgeon" || defaultRoleWhenNew === "physician_assistant");
    }
  }, [contact, defaultRoleWhenNew]);

  const canMarkChampion = Boolean(opportunityId) && (role === "surgeon" || role === "physician_assistant");
  React.useEffect(() => {
    if (!canMarkChampion) return;
    if (influenceLevel === "decision_maker") {
      setMarkChampion(true);
    }
  }, [canMarkChampion, influenceLevel]);

  async function markContactAsChampion(opportunityIdValue: string, sourceContact: Contact) {
    const contactName = contactDisplayName(sourceContact as Parameters<typeof contactDisplayName>[0]);
    const championName = contactName === "—" ? null : contactName;
    const res = await fetch(`/api/portal/sales/opportunities/${encodeURIComponent(opportunityIdValue)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        surgeon_champion_confirmed: true,
        surgeon_champion_name: championName,
      }),
    });
    const json = (await res.json()) as { ok?: boolean; error?: string };
    if (!json.ok) throw new Error(json.error || "Contact saved, but champion update failed");
  }

  React.useEffect(() => {
    if (contact || mode !== "existing") return;
    let cancelled = false;
    setExistingBusy(true);
    const id = window.setTimeout(async () => {
      try {
        const p = new URLSearchParams();
        if (existingQ.trim()) p.set("q", existingQ.trim());
        if (existingRoleFilter) p.set("role_type", existingRoleFilter);
        const res = await fetch(`/api/portal/sales/surgical-contacts?${p.toString()}`, { cache: "no-store" });
        const j = (await res.json()) as { ok?: boolean; contacts?: Contact[] };
        if (!cancelled) setExistingResults(j.ok ? j.contacts || [] : []);
      } catch {
        if (!cancelled) setExistingResults([]);
      } finally {
        if (!cancelled) setExistingBusy(false);
      }
    }, 180);
    return () => {
      cancelled = true;
      window.clearTimeout(id);
    };
  }, [contact, mode, existingQ, existingRoleFilter]);

  async function linkExistingContact(contactId: string) {
    setSaving(true);
    setFormErr(null);
    try {
      const res = await fetch(`/api/portal/sales/surgical-accounts/${accountId}/contacts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          link_existing_contact_id: contactId,
          role_type: role,
          influence_level: influenceLevel,
          org_role_type: role,
          org_influence_level: influenceLevel,
          org_is_primary: primary,
          org_is_active: orgActive,
          org_specialty: orgSpecialty || null,
          preferred_hospital: preferredHospital || null,
          org_notes: notes || null,
        }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string; contact?: Contact };
      if (!json.ok || !json.contact) throw new Error(json.error || "Link failed");
      if (markChampion && canMarkChampion && opportunityId) {
        await markContactAsChampion(opportunityId, json.contact);
      }
      onSaved({ contact: json.contact, created: false });
    } catch (e: unknown) {
      setFormErr(userFacingError(e, "We could not link that contact. Please try again."));
    } finally {
      setSaving(false);
    }
  }

  async function submit(opts?: { allowDuplicate?: boolean }) {
    setSaving(true);
    setFormErr(null);
    try {
      const body = {
        first_name: first,
        last_name: last,
        title: title || null,
        email: email || null,
        phone: phone || null,
        mobile_phone: mobilePhone || null,
        role_type: role,
        influence_level: influenceLevel,
        relationship_strength: relationshipStrength,
        is_primary_contact: primary,
        notes: notes || null,
        org_specialty: orgSpecialty || null,
        preferred_hospital: preferredHospital || null,
        org_influence_level: influenceLevel,
        org_role_type: role,
        org_is_primary: primary,
        org_is_active: orgActive,
        org_notes: notes || null,
        allow_duplicate: Boolean(opts?.allowDuplicate),
      };
      if (contact?.id) {
        const res = await fetch(`/api/portal/sales/surgical-contacts/${contact.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const json = (await res.json()) as { ok?: boolean; error?: string; contact?: Contact };
        if (!json.ok) throw new Error(json.error || "Save failed");
        onSaved({ contact: json.contact, created: false });
      } else {
        const res = await fetch(`/api/portal/sales/surgical-accounts/${accountId}/contacts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const json = (await res.json()) as {
          ok?: boolean;
          error?: string;
          contact?: Contact;
          code?: string;
          matches?: Array<Contact & { existing_orgs?: string[] }>;
        };
        if (res.status === 409 && json.code === "possible_duplicate") {
          setPossibleDuplicates(json.matches || []);
          throw new Error("Possible existing clinician found. Choose Add Existing or create anyway.");
        }
        if (!json.ok || !json.contact) throw new Error(json.error || "Create failed");
        setPossibleDuplicates([]);
        if (markChampion && canMarkChampion && opportunityId) {
          await markContactAsChampion(opportunityId, json.contact);
        }
        onSaved({ contact: json.contact, created: true });
      }
    } catch (e: unknown) {
      setFormErr(userFacingError(e, "Something went wrong. Please try again."));
    } finally {
      setSaving(false);
    }
  }

  const backdropStyle: React.CSSProperties = {
    ...sc.modalBackdrop,
    ...(modalNarrow
      ? {
          alignItems: "flex-end",
          padding: 6,
          paddingBottom: "calc(6px + env(safe-area-inset-bottom, 0px))",
        }
      : { padding: 12 }),
  };
  const panelClass = `contact-modal-panel${modalNarrow ? " contact-modal-panel--sheet" : ""}`;

  return (
    <div style={backdropStyle} onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <style dangerouslySetInnerHTML={{ __html: contactFormModalCss }} />
      <div className={panelClass} role="dialog" aria-modal>
        <h3 className="contact-modal-title">{contact ? "Edit contact" : "New contact"}</h3>
        {!contact ? (
          <div className="contact-modal-mode-tabs">
            <button type="button" onClick={() => setMode("create")} style={mode === "create" ? sc.btnPrimary : sc.btnSecondary}>
              Create New
            </button>
            <button type="button" onClick={() => setMode("existing")} style={mode === "existing" ? sc.btnPrimary : sc.btnSecondary}>
              Add Existing
            </button>
          </div>
        ) : null}
        {formErr ? <div className="contact-modal-err">{formErr}</div> : null}
        {!contact && mode === "existing" ? (
          <div className="contact-modal-body">
            <div className="contact-modal-grid contact-modal-grid--2">
              <label className="contact-modal-field">
                Search
                <input value={existingQ} onChange={(e) => setExistingQ(e.target.value)} placeholder="Name, email, phone" />
              </label>
              <label className="contact-modal-field">
                Role filter
                <select value={existingRoleFilter} onChange={(e) => setExistingRoleFilter(e.target.value)}>
                  <option value="">All roles</option>
                  {SURGICAL_CONTACT_ROLE_TYPES_V2.map((r) => (
                    <option key={r} value={r}>
                      {formatSurgicalContactRole(r)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="contact-modal-existing-list">
              {existingBusy ? <div style={{ color: "var(--muted)", fontSize: 11 }}>Searching…</div> : null}
              {!existingBusy && existingResults.length === 0 ? (
                <div style={{ color: "var(--muted)", fontSize: 11 }}>No contacts found.</div>
              ) : null}
              {existingResults.map((c) => {
                const orgCount = Number((c as { organization_count?: number }).organization_count || 0);
                return (
                  <button
                    key={String(c.id)}
                    type="button"
                    onClick={() => void linkExistingContact(String(c.id))}
                    disabled={saving}
                    className="contact-modal-existing-item"
                  >
                    <div className="contact-modal-existing-item-title">
                      {contactDisplayName(c as Parameters<typeof contactDisplayName>[0])}
                    </div>
                    <div className="contact-modal-existing-item-meta">
                      {formatSurgicalContactRole(String(c.role_type || "other"))}
                      {orgCount > 0 ? ` · ${orgCount} org${orgCount === 1 ? "" : "s"}` : ""}
                      {String(c.email || c.phone || c.mobile_phone || "") ? ` · ${String(c.email || c.phone || c.mobile_phone || "")}` : ""}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
        {!contact && mode === "create" && possibleDuplicates.length > 0 ? (
          <div className="contact-modal-dup">
            <div style={{ fontWeight: 800, marginBottom: 4 }}>Possible existing clinician</div>
            <div style={{ display: "grid", gap: 4 }}>
              {possibleDuplicates.slice(0, 4).map((c) => (
                <div
                  key={String(c.id)}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 8,
                    alignItems: "center",
                    border: "1px solid var(--border)",
                    borderRadius: 7,
                    padding: "5px 7px",
                    background: "var(--surface)",
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 750 }}>{contactDisplayName(c as Parameters<typeof contactDisplayName>[0])}</div>
                    <div style={{ fontSize: 11, color: "var(--muted)" }}>
                      {(c.existing_orgs || []).slice(0, 2).join(", ") || "No linked orgs"}
                    </div>
                  </div>
                  <button type="button" onClick={() => void linkExistingContact(String(c.id))} style={{ ...sc.btnSecondary, minHeight: 28, padding: "3px 8px", fontSize: 11 }}>
                    Use existing
                  </button>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 6, display: "flex", justifyContent: "flex-end" }}>
              <button type="button" disabled={saving} onClick={() => void submit({ allowDuplicate: true })} style={{ ...sc.btnGhost, minHeight: 28, padding: "3px 8px", fontSize: 11 }}>
                {saving ? "Saving…" : "Create anyway"}
              </button>
            </div>
          </div>
        ) : null}
        {contact || mode === "create" ? (
          <div className="contact-modal-body">
            <div className="contact-modal-grid contact-modal-grid--2">
              <label className="contact-modal-field">
                First name
                <input value={first} onChange={(e) => setFirst(e.target.value)} />
              </label>
              <label className="contact-modal-field">
                Last name
                <input value={last} onChange={(e) => setLast(e.target.value)} />
              </label>
            </div>
            <div className="contact-modal-grid contact-modal-grid--2">
              <label className="contact-modal-field">
                Title
                <input value={title} onChange={(e) => setTitle(e.target.value)} />
              </label>
              <label className="contact-modal-field">
                Role type
                <select value={role} onChange={(e) => setRole(e.target.value)}>
                  {SURGICAL_CONTACT_ROLE_TYPES_V2.map((r) => (
                    <option key={r} value={r}>
                      {formatSurgicalContactRole(r)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {canMarkChampion ? (
              <label className="contact-modal-check">
                <input type="checkbox" checked={markChampion} onChange={(e) => setMarkChampion(e.target.checked)} />
                Mark as opportunity champion
              </label>
            ) : null}
            <div className="contact-modal-grid contact-modal-grid--2">
              <label className="contact-modal-field">
                Email
                <input value={email} onChange={(e) => setEmail(e.target.value)} />
              </label>
              <label className="contact-modal-field">
                Phone
                <input value={phone} onChange={(e) => setPhone(e.target.value)} />
              </label>
            </div>
            <label className="contact-modal-field">
              Mobile phone
              <input value={mobilePhone} onChange={(e) => setMobilePhone(e.target.value)} />
            </label>
            <div className="contact-modal-grid contact-modal-grid--2">
              <label className="contact-modal-field">
                Influence
                <select value={influenceLevel} onChange={(e) => setInfluenceLevel(e.target.value)}>
                  <option value="decision_maker">Champion (decision maker)</option>
                  <option value="influencer">Influencer</option>
                  <option value="gatekeeper">Gatekeeper</option>
                  <option value="unknown">Unknown</option>
                </select>
              </label>
              <label className="contact-modal-field">
                Relationship
                <select value={relationshipStrength} onChange={(e) => setRelationshipStrength(e.target.value)}>
                  {["strong", "medium", "weak", "unknown"].map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="contact-modal-check">
              <input type="checkbox" checked={primary} onChange={(e) => setPrimary(e.target.checked)} />
              Primary contact
            </label>
            <label className="contact-modal-field">
              Notes
              <span className="contact-modal-field-hint">{SURGICAL_PHI_UI_NOTICE}</span>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
            </label>
            {!contact ? (
              <div className="contact-modal-grid contact-modal-grid--2">
                <label className="contact-modal-field">
                  Specialty (this org)
                  <input value={orgSpecialty} onChange={(e) => setOrgSpecialty(e.target.value)} />
                </label>
                <label className="contact-modal-field">
                  Preferred hospital
                  <input value={preferredHospital} onChange={(e) => setPreferredHospital(e.target.value)} />
                </label>
              </div>
            ) : null}
            {!contact ? (
              <label className="contact-modal-check">
                <input type="checkbox" checked={orgActive} onChange={(e) => setOrgActive(e.target.checked)} />
                Active at this location
              </label>
            ) : null}
            <div className={`contact-modal-actions${modalNarrow ? " contact-modal-actions--stack" : ""}`}>
              <button type="button" onClick={onClose} style={sc.btnGhost}>
                Cancel
              </button>
              <button type="button" disabled={saving} onClick={() => void submit()} style={sc.btnPrimary}>
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        ) : (
          <div className={`contact-modal-actions${modalNarrow ? " contact-modal-actions--stack" : ""}`}>
            <button type="button" onClick={onClose} style={sc.btnGhost}>
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const badgeStyle: React.CSSProperties = {
  borderRadius: 999,
  padding: "3px 8px",
  fontSize: 11,
  fontWeight: 800,
  border: "1px solid color-mix(in srgb, var(--foreground) 15%, var(--border))",
};

const miniBadge: React.CSSProperties = {
  borderRadius: 999,
  padding: "2px 8px",
  fontSize: 11,
  fontWeight: 700,
  background: "color-mix(in srgb, var(--foreground) 6%, transparent)",
};
