"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import React from "react";
import type { CSSProperties } from "react";
import { SalesCmdLink, SalesCommandPage, SalesPanel, sc } from "@/components/sales/salesCommandUi";
import { userFacingError } from "@/lib/errors/userFacingError";
import { dollarsToCents, formatUsdFromCents } from "@/lib/sales/formatUsd";
import {
  PRACTICE_SETTING_LABEL,
  PRACTICE_SETTINGS,
  parsePracticeSetting,
  type PracticeSetting,
} from "@/lib/sales/practiceSetting";
import { LOST_REASONS } from "@/lib/sales/activityTypes";
import {
  isLostStage,
  isOpenSalesStage,
  isWonStage,
  normalizeSalesStage,
  parseSalesStage,
  pipelineStageIndex,
  SALES_FUNNEL_STAGE_ORDER,
  SALES_STAGE_LABEL,
  SALES_STAGE_PROBABILITY,
  SALES_STAGES,
  salesStageLabel,
  salesStageStyle,
  type SalesStage,
} from "@/lib/sales/stages";
import { OPPORTUNITY_UI, adoptionInitiativeCountLabel } from "@/lib/sales/opportunityUiLabels";
import { assessOpportunitySalesExecutionNeedsAction } from "@/lib/surgical-sales/salesExecutionNeedsAction";
import { uniqueOrderedIds } from "@/lib/sales/uniqueOrderedIds";
import { CreateAdoptionInitiativeModal } from "@/components/sales/CreateAdoptionInitiativeModal";
import { opportunitiesListMobileCss } from "@/app/portal/sales/opportunities/opportunitiesListMobileCss";
import { OpportunitiesMobileList } from "@/app/portal/sales/opportunities/OpportunitiesMobileList";
import { contactDisplayName, formatSurgicalContactRole } from "@/lib/surgical-sales/labels";
import { SURGICAL_CONTACT_ROLE_TYPES_V2 } from "@/lib/surgical-sales/contactConstants";

type CatalogProduct = { id: string; name: string; code: string | null; qcode: string | null; is_active?: boolean };
type SurgicalProduct = { id: string; name: string };
type SurgicalSku = { id: string; sku: string; description?: string | null };
type SurgicalFamilyOption = { id: string; name: string };
const DEFAULT_SURGICAL_FAMILIES: SurgicalFamilyOption[] = [
  { id: "family-acsis", name: "ACSIS" },
  { id: "family-endolumik", name: "Endolumik" },
  { id: "family-skeletal-dynamics", name: "Skeletal Dynamics" },
  { id: "family-biotissue", name: "BioTissue" },
  { id: "family-telabio", name: "TelaBio" },
];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DOCTOR_ROLES = new Set(["surgeon", "physician_assistant"]);
const CRM_ORG_OTHER = "__crm_org_other__";
const CLINICIAN_OTHER = "__clinician_other__";

function sortContactsForOpportunityForm(contacts: Record<string, unknown>[]) {
  return [...contacts].sort((a, b) => {
    const ar = String(a.role_type || "");
    const br = String(b.role_type || "");
    const aDoc = DOCTOR_ROLES.has(ar) ? 0 : 1;
    const bDoc = DOCTOR_ROLES.has(br) ? 0 : 1;
    if (aDoc !== bDoc) return aDoc - bDoc;
    return contactDisplayName(a as Parameters<typeof contactDisplayName>[0]).localeCompare(
      contactDisplayName(b as Parameters<typeof contactDisplayName>[0])
    );
  });
}

type Opp = {
  id: string;
  owner_user_id: string;
  account_id?: string | null;
  account_name: string;
  physician_name: string | null;
  surgeon_contact_id?: string | null;
  product_line: string;
  product_id?: string | null;
  additional_product_ids?: string[] | null;
  product_display?: string;
  practice_setting?: string | null;
  city?: string | null;
  state?: string | null;
  value_cents: number;
  stage: SalesStage;
  close_date: string | null;
  notes: string | null;
  closed_lost_reason?: string | null;
  updated_at?: string;
  owner_name?: string | null;
  owner_email?: string | null;
  next_action?: string | null;
  linked_cases_count?: number;
  linked_engagements_count?: number;
};

function useOpportunitiesMobileLayout() {
  const [mobile, setMobile] = React.useState(false);
  React.useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const apply = () => setMobile(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
  return mobile;
}

type SortKey = "updated_at" | "account_name" | "close_date" | "value_cents" | "stage_order" | "days_in_stage" | "created_at" | "last_activity";
type FeedTask = { id: string; opportunity_id: string; title: string; due_date: string };
type FeedAct = { id: string; opportunity_id: string; activity_at: string; summary?: string | null };
type SurgicalCaseRow = { id: string; account_id?: string | null };

const STAGE_ORDER = SALES_FUNNEL_STAGE_ORDER;

function daysSince(iso?: string | null): number | null {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms)) return null;
  return Math.max(0, Math.floor(ms / 86400000));
}

const filterMini: CSSProperties = {
  fontSize: 11,
  fontWeight: 800,
  letterSpacing: "0.09em",
  textTransform: "uppercase",
  color: "var(--muted)",
  marginBottom: 8,
};

const emptyForm = {
  account_id: "",
  account_name: "",
  physician_name: "",
  primary_family_id: "",
  product_labels: [] as string[],
  manual_variant: "",
  value_dollars: "",
  practice_setting: "private_practice" as PracticeSetting,
  stage: "discovery" as SalesStage,
  city: "",
  state: "",
  close_date: "",
  close_date_unknown: false,
  notes: "",
  closed_lost_reason: "",
};

type OppContactDraft = {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  role_type: (typeof SURGICAL_CONTACT_ROLE_TYPES_V2)[number];
};

function defaultAddContactDraft(): OppContactDraft {
  return { first_name: "", last_name: "", email: "", phone: "", role_type: "surgeon" };
}

export default function SalesOpportunitiesClient() {
  const mobileLayout = useOpportunitiesMobileLayout();
  const sp = useSearchParams();
  const [rows, setRows] = React.useState<Opp[]>([]);
  const [catalog, setCatalog] = React.useState<CatalogProduct[]>([]);
  const [surgicalFamilies, setSurgicalFamilies] = React.useState<SurgicalFamilyOption[]>(DEFAULT_SURGICAL_FAMILIES);
  const [variantsByFamily, setVariantsByFamily] = React.useState<Record<string, string[]>>({});
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState<string | null>(null);
  const [modal, setModal] = React.useState<"add" | "edit" | null>(null);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [form, setForm] = React.useState(emptyForm);
  const [saving, setSaving] = React.useState(false);
  const [searchQ, setSearchQ] = React.useState("");
  const [stageFilter, setStageFilter] = React.useState<"" | SalesStage>("");
  const [settingFilter, setSettingFilter] = React.useState<"" | PracticeSetting>("");
  const [sortKey, setSortKey] = React.useState<SortKey>("updated_at");
  const [sortDesc, setSortDesc] = React.useState(true);
  const [crmOrgs, setCrmOrgs] = React.useState<{ id: string; name: string; city?: string; state?: string }[]>([]);
  const [productFamilyFilter, setProductFamilyFilter] = React.useState("");
  const [organizationFilter, setOrganizationFilter] = React.useState("");
  const [clinicianFilter, setClinicianFilter] = React.useState("");
  const [ownerFilter, setOwnerFilter] = React.useState("");
  const [closeFilter, setCloseFilter] = React.useState<"" | "with_close" | "without_close" | "overdue">("");
  const [needsNextStepOnly, setNeedsNextStepOnly] = React.useState(false);
  const [showMoreFilters, setShowMoreFilters] = React.useState(false);
  const [feedTasks, setFeedTasks] = React.useState<FeedTask[]>([]);
  const [feedActs, setFeedActs] = React.useState<FeedAct[]>([]);
  const [caseRows, setCaseRows] = React.useState<SurgicalCaseRow[]>([]);

  React.useEffect(() => {
    const raw = sp.get("stage");
    const p = raw ? parseSalesStage(raw) : null;
    if (p) setStageFilter(p);
  }, [sp]);

  const newModalBoot = React.useRef(false);
  const createPrefillQuery = React.useMemo(
    () => ({
      surgeonContactId: (sp.get("surgeon_contact_id") || "").trim() || undefined,
      engagementId: (sp.get("engagement_id") || "").trim() || undefined,
      caseId: (sp.get("case_id") || "").trim() || undefined,
      accountId: (sp.get("account_id") || "").trim() || undefined,
    }),
    [sp],
  );
  React.useEffect(() => {
    if (newModalBoot.current) return;
    if (sp.get("new") === "1") {
      newModalBoot.current = true;
      setModal("add");
    }
  }, [sp]);

  const [crmContacts, setCrmContacts] = React.useState<Record<string, unknown>[]>([]);
  const [crmContactsBusy, setCrmContactsBusy] = React.useState(false);
  const [clinicianManualMode, setClinicianManualMode] = React.useState(false);
  const [showAddContacts, setShowAddContacts] = React.useState(false);
  const [addContactDrafts, setAddContactDrafts] = React.useState<OppContactDraft[]>(() => [defaultAddContactDraft()]);
  const [addPrimaryContactIdx, setAddPrimaryContactIdx] = React.useState<number | null>(null);

  React.useEffect(() => {
    setAddPrimaryContactIdx((p) => {
      if (addContactDrafts.length === 0) return null;
      if (p == null) return null;
      return Math.min(p, addContactDrafts.length - 1);
    });
  }, [addContactDrafts.length]);

  const staleOnly = sp.get("stale") === "1";
  const coldOnly = sp.get("cold") === "1";
  const todayUtcForStale = new Date().toISOString().slice(0, 10);
  const coldCutoffMs = Date.now() - 14 * 86400000;
  const getPrimaryFamilyLabel = React.useCallback((o: Opp) => {
    const raw = String(o.product_display || o.product_line || "").trim();
    if (!raw) return "No product family";
    const firstEntry = raw.split(",")[0]?.trim() || raw;
    return firstEntry.split(" · ")[0]?.trim() || firstEntry;
  }, []);
  const taskByOpp = React.useMemo(() => {
    const m = new Map<string, FeedTask>();
    for (const t of feedTasks) {
      const key = String(t.opportunity_id || "");
      if (!key) continue;
      const cur = m.get(key);
      if (!cur || String(t.due_date) < String(cur.due_date)) m.set(key, t);
    }
    return m;
  }, [feedTasks]);
  const lastActivityByOpp = React.useMemo(() => {
    const m = new Map<string, string>();
    for (const a of feedActs) {
      const key = String(a.opportunity_id || "");
      if (!key) continue;
      const cur = m.get(key);
      if (!cur || new Date(a.activity_at).getTime() > new Date(cur).getTime()) m.set(key, a.activity_at);
    }
    return m;
  }, [feedActs]);
  const caseCountByAccount = React.useMemo(() => {
    const m = new Map<string, number>();
    for (const c of caseRows) {
      const key = String(c.account_id || "");
      if (!key) continue;
      m.set(key, (m.get(key) || 0) + 1);
    }
    return m;
  }, [caseRows]);

  const filteredRows = React.useMemo(() => {
    const q = searchQ.trim().toLowerCase();
    return rows.filter((o) => {
      if (stageFilter && o.stage !== stageFilter) return false;
      if (settingFilter && parsePracticeSetting(o.practice_setting) !== settingFilter) return false;
      if (productFamilyFilter && getPrimaryFamilyLabel(o).toLowerCase() !== productFamilyFilter.toLowerCase()) return false;
      if (organizationFilter && o.account_name.toLowerCase() !== organizationFilter.toLowerCase()) return false;
      if (clinicianFilter && String(o.physician_name || "").toLowerCase() !== clinicianFilter.toLowerCase()) return false;
      if (ownerFilter) {
        const owner = String(o.owner_name || o.owner_email || "you").trim().toLowerCase();
        if (owner !== ownerFilter.toLowerCase()) return false;
      }
      if (closeFilter === "with_close" && !o.close_date) return false;
      if (closeFilter === "without_close" && o.close_date) return false;
      if (closeFilter === "overdue" && (!o.close_date || String(o.close_date) >= todayUtcForStale)) return false;
      if (staleOnly) {
        if (!isOpenSalesStage(o.stage)) return false;
        if (!o.close_date || String(o.close_date) >= todayUtcForStale) return false;
      }
      if (coldOnly) {
        if (!isOpenSalesStage(o.stage)) return false;
        const ut = o.updated_at ? new Date(o.updated_at).getTime() : 0;
        if (ut >= coldCutoffMs) return false;
      }
      if (needsNextStepOnly && taskByOpp.has(o.id)) return false;
      if (!q) return true;
      const hay = [
        o.account_name,
        o.physician_name,
        o.product_display,
        o.product_line,
        o.city,
        o.state,
        o.notes,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [
    rows,
    searchQ,
    stageFilter,
    settingFilter,
    staleOnly,
    coldOnly,
    todayUtcForStale,
    coldCutoffMs,
    productFamilyFilter,
    organizationFilter,
    clinicianFilter,
    ownerFilter,
    closeFilter,
    needsNextStepOnly,
    taskByOpp,
    getPrimaryFamilyLabel,
  ]);

  const displayRows = React.useMemo(() => {
    const list = [...filteredRows];
    const m = sortDesc ? -1 : 1;
    list.sort((a, b) => {
      if (sortKey === "account_name") return m * a.account_name.localeCompare(b.account_name);
      if (sortKey === "value_cents") return m * ((a.value_cents || 0) - (b.value_cents || 0));
      if (sortKey === "stage_order") {
        return m * (pipelineStageIndex(a.stage) - pipelineStageIndex(b.stage));
      }
      if (sortKey === "days_in_stage") {
        const ad = daysSince(a.updated_at) ?? 0;
        const bd = daysSince(b.updated_at) ?? 0;
        return m * (ad - bd);
      }
      if (sortKey === "created_at") {
        const ad = a.id;
        const bd = b.id;
        return m * ad.localeCompare(bd);
      }
      if (sortKey === "last_activity") {
        const ad = lastActivityByOpp.get(a.id) ? new Date(lastActivityByOpp.get(a.id)!).getTime() : 0;
        const bd = lastActivityByOpp.get(b.id) ? new Date(lastActivityByOpp.get(b.id)!).getTime() : 0;
        return m * (ad - bd);
      }
      if (sortKey === "close_date") {
        const sent = sortDesc ? "0000-01-01" : "9999-12-31";
        const ad = a.close_date || sent;
        const bd = b.close_date || sent;
        return m * String(ad).localeCompare(String(bd));
      }
      const au = a.updated_at ? new Date(a.updated_at).getTime() : 0;
      const bu = b.updated_at ? new Date(b.updated_at).getTime() : 0;
      return m * (au - bu);
    });
    return list;
  }, [filteredRows, sortKey, sortDesc, lastActivityByOpp]);

  const productFamilyOptions = React.useMemo(
    () => [...new Set(rows.map((o) => getPrimaryFamilyLabel(o)).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [rows, getPrimaryFamilyLabel]
  );
  const organizationOptions = React.useMemo(() => {
    const fromRows = rows.map((o) => String(o.account_name || "").trim()).filter(Boolean);
    const fromDirectory = crmOrgs.map((o) => String(o.name || "").trim()).filter(Boolean);
    return [...new Set([...fromRows, ...fromDirectory])].sort((a, b) => a.localeCompare(b));
  }, [rows, crmOrgs]);
  const clinicianOptions = React.useMemo(
    () => [...new Set(rows.map((o) => String(o.physician_name || "").trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [rows]
  );
  const ownerOptions = React.useMemo(
    () =>
      [...new Set(rows.map((o) => String(o.owner_name || o.owner_email || "You").trim()).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b)
      ),
    [rows]
  );

  const leadMetrics = React.useMemo(() => {
    const open = rows.filter((r) => isOpenSalesStage(r.stage));
    const evaluation = rows.filter((r) => {
      const s = normalizeSalesStage(r.stage);
      return s === "evaluation_planned" || s === "evaluation_active";
    }).length;
    const won = rows.filter((r) => isWonStage(r.stage)).length;
    const lost = rows.filter((r) => isLostStage(r.stage)).length;
    const needsAttention = rows.filter((r) => {
      const oppTasks = feedTasks.filter((t) => t.opportunity_id === r.id);
      return assessOpportunitySalesExecutionNeedsAction({
        id: r.id,
        next_action: r.next_action,
        hasOpenTask: oppTasks.length > 0,
        hasOverdueTask: oppTasks.some((t) => String(t.due_date) < todayUtcForStale),
      }).needsAction;
    }).length;
    const pipeline = open.reduce((sum, r) => sum + (r.value_cents || 0), 0);
    return { open: open.length, evaluation, needsAttention, won, lost, pipeline };
  }, [rows, feedTasks, todayUtcForStale]);

  const needsAttentionRows = React.useMemo(() => {
    return rows
      .map((r) => {
        const oppTasks = feedTasks.filter((t) => t.opportunity_id === r.id);
        const assessment = assessOpportunitySalesExecutionNeedsAction({
          id: r.id,
          next_action: r.next_action,
          hasOpenTask: oppTasks.length > 0,
          hasOverdueTask: oppTasks.some((t) => String(t.due_date) < todayUtcForStale),
        });
        return { row: r, issues: assessment.items.map((item) => item.label) };
      })
      .filter((x) => x.issues.length > 0)
      .sort((a, b) => b.issues.length - a.issues.length)
      .slice(0, 8);
  }, [rows, feedTasks, todayUtcForStale]);

  const orgOptionsForSelect = React.useMemo(() => {
    if (!form.account_id || !UUID_RE.test(form.account_id)) return crmOrgs;
    if (crmOrgs.some((o) => o.id === form.account_id)) return crmOrgs;
    return [{ id: form.account_id, name: form.account_name.trim() || "Organization", city: form.city, state: form.state }, ...crmOrgs];
  }, [crmOrgs, form.account_id, form.account_name]);

  const orgSelectValue = React.useMemo(() => {
    if (form.account_id && orgOptionsForSelect.some((o) => o.id === form.account_id)) return form.account_id;
    return CRM_ORG_OTHER;
  }, [form.account_id, orgOptionsForSelect]);

  React.useEffect(() => {
    if (modal !== "add") return;
    const accountId = form.account_id.trim();
    if (!UUID_RE.test(accountId)) return;
    const org = orgOptionsForSelect.find((o) => o.id === accountId);
    if (!org) return;
    setForm((f) => {
      if (f.account_name.trim() && f.city.trim() && f.state.trim()) return f;
      return {
        ...f,
        account_name: f.account_name.trim() || org.name,
        city: f.city.trim() || org.city || "",
        state: f.state.trim() || org.state || "",
      };
    });
  }, [modal, form.account_id, orgOptionsForSelect]);

  const clinicianSelectValue = React.useMemo(() => {
    if (clinicianManualMode) return CLINICIAN_OTHER;
    const name = form.physician_name.trim();
    if (!name) return "";
    const hit = crmContacts.find(
      (c) => contactDisplayName(c as Parameters<typeof contactDisplayName>[0]) === name
    );
    if (hit && typeof hit.id === "string") return hit.id;
    return CLINICIAN_OTHER;
  }, [clinicianManualMode, form.physician_name, crmContacts]);

  const filteredVariantOptions = React.useMemo(() => {
    if (!form.primary_family_id) return [];
    return variantsByFamily[form.primary_family_id] || [];
  }, [form.primary_family_id, variantsByFamily]);

  const allFilteredVariantsSelected = React.useMemo(() => {
    return filteredVariantOptions.length > 0 && filteredVariantOptions.every((label) => form.product_labels.includes(label));
  }, [filteredVariantOptions, form.product_labels]);

  function exportCsv() {
    const esc = (s: string) => `"${String(s).replace(/"/g, '""')}"`;
    const header = [
      "Organization",
      "Clinician",
      "Product",
      "Care setting",
      "Est value",
      "Stage",
      "Last updated",
      "Close date",
      "City",
      "State",
      "Notes",
    ];
    const lines = [header.join(",")];
    for (const o of displayRows) {
      const setting = parsePracticeSetting(o.practice_setting);
      const vals = [
        o.account_name,
        o.physician_name || "",
        o.product_display || o.product_line,
        PRACTICE_SETTING_LABEL[setting],
        o.value_cents ? formatUsdFromCents(o.value_cents) : "",
        salesStageLabel(o.stage),
        o.updated_at ? new Date(o.updated_at).toLocaleString() : "",
        o.close_date || "",
        o.city || "",
        o.state || "",
        (o.notes || "").replace(/\r?\n/g, " "),
      ];
      lines.push(vals.map(esc).join(","));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `opportunities-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const loadOrganizations = React.useCallback(async () => {
    try {
      const orgRes = await fetch("/api/portal/sales/surgical-accounts?for_opportunities=1&directory_scope=active", {
        cache: "no-store",
      });
      const orgJson = (await orgRes.json()) as {
        ok?: boolean;
        organizations?: { id: string; name?: string | null; surgical_crm_billing_city?: string | null; surgical_crm_billing_state?: string | null }[];
      };
      if (orgJson.ok && Array.isArray(orgJson.organizations)) {
        setCrmOrgs(
          orgJson.organizations.map((o) => ({
            id: o.id,
            name: String(o.name || "").trim() || "Organization",
            city: String(o.surgical_crm_billing_city || "").trim(),
            state: String(o.surgical_crm_billing_state || "").trim(),
          }))
        );
      }
    } catch {
      /* directory optional */
    }
  }, []);

  React.useEffect(() => {
    void loadOrganizations();
  }, [loadOrganizations]);

  React.useEffect(() => {
    if (!modal || !UUID_RE.test(form.account_id)) {
      setCrmContacts([]);
      setCrmContactsBusy(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      setCrmContactsBusy(true);
      try {
        const res = await fetch(`/api/portal/sales/surgical-accounts/${encodeURIComponent(form.account_id)}`, {
          cache: "no-store",
        });
        const j = (await res.json()) as { ok?: boolean; contacts?: Record<string, unknown>[] };
        if (cancelled) return;
        const raw = j.ok && Array.isArray(j.contacts) ? j.contacts : [];
        setCrmContacts(sortContactsForOpportunityForm(raw));
      } catch {
        if (!cancelled) setCrmContacts([]);
      } finally {
        if (!cancelled) setCrmContactsBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [form.account_id, modal]);

  React.useEffect(() => {
    if (modal !== "add") return;
    if (!form.account_id || !UUID_RE.test(form.account_id)) return;
    if (clinicianManualMode) return;
    if (form.physician_name.trim()) return;
    if (crmContactsBusy || crmContacts.length === 0) return;
    const suggestedContact =
      crmContacts.find((c) => {
        const role = String((c as { role_type?: string | null }).role_type || "").toLowerCase();
        return role === "surgeon" || role === "physician_assistant";
      }) || crmContacts[0];
    const suggestedName = suggestedContact
      ? contactDisplayName(suggestedContact as Parameters<typeof contactDisplayName>[0])
      : "";
    if (!suggestedName || suggestedName === "—") return;
    setClinicianManualMode(false);
    setForm((f) => (f.physician_name.trim() ? f : { ...f, physician_name: suggestedName }));
  }, [modal, form.account_id, form.physician_name, crmContactsBusy, crmContacts, clinicianManualMode]);

  React.useEffect(() => {
    void (async () => {
      try {
        const productsRes = await fetch("/api/portal/sales/products", { cache: "no-store" });
        const productsJson = await productsRes.json();
        if (productsJson.ok && Array.isArray(productsJson.products)) setCatalog(productsJson.products);
        const famRes = await fetch("/api/portal/sales/surgical-catalog/products", { cache: "no-store" });
        const famJson = await famRes.json();
        if (famJson.ok && Array.isArray(famJson.products)) {
          const families = (famJson.products as SurgicalProduct[]).sort((a, b) => a.name.localeCompare(b.name));
          if (families.length > 0) {
            const mergedByName = new Map<string, SurgicalFamilyOption>();
            for (const required of DEFAULT_SURGICAL_FAMILIES) {
              mergedByName.set(required.name.toLowerCase(), required);
            }
            for (const f of families) {
              mergedByName.set(f.name.toLowerCase(), { id: f.id, name: f.name });
            }
            setSurgicalFamilies(Array.from(mergedByName.values()).sort((a, b) => a.name.localeCompare(b.name)));
          }
          const all = await Promise.all(
            families.map(async (f) => {
              if (!UUID_RE.test(f.id)) return [f.id, [] as string[]] as const;
              const r = await fetch(`/api/portal/sales/surgical-catalog/skus?product_id=${encodeURIComponent(f.id)}`, { cache: "no-store" });
              const j = await r.json();
              const skus = (j.ok && Array.isArray(j.skus) ? (j.skus as SurgicalSku[]) : []).map(
                (s) => `${f.name} · ${s.sku}${s.description ? ` — ${s.description}` : ""}`
              );
              return [f.id, skus] as const;
            })
          );
          const next: Record<string, string[]> = {};
          for (const [familyId, labels] of all) {
            next[familyId] = [...new Set(labels)].sort((a, b) => a.localeCompare(b));
          }
          setVariantsByFamily(next);
        }
      } catch {
        // catalog is optional for display; save still validates server-side
      }
    })();
  }, []);

  async function refresh(opts?: { soft?: boolean }) {
    const soft = !!opts?.soft;
    if (!soft) setLoading(true);
    setErr(null);
    try {
      const [oppRes, feedRes, caseRes] = await Promise.all([
        fetch("/api/portal/sales/opportunities", { cache: "no-store" }),
        fetch("/api/portal/sales/feed", { cache: "no-store" }),
        fetch("/api/portal/sales/surgical-cases?case_scope=active", { cache: "no-store" }),
      ]);
      const [j, f, c] = await Promise.all([oppRes.json(), feedRes.json(), caseRes.json()]);
      if (!j.ok) {
        setErr(userFacingError(j.error, "We could not load your opportunities. Please try again."));
        setRows([]);
        return;
      }
      setRows((j.opportunities || []) as Opp[]);
      setFeedTasks(f?.ok && Array.isArray(f.tasks) ? (f.tasks as FeedTask[]) : []);
      setFeedActs(f?.ok && Array.isArray(f.activities) ? (f.activities as FeedAct[]) : []);
      setCaseRows(c?.ok && Array.isArray(c.cases) ? (c.cases as SurgicalCaseRow[]) : []);
    } catch (e) {
      setErr(userFacingError(e, "We could not load your opportunities. Please try again."));
    } finally {
      if (!soft) setLoading(false);
    }
  }

  React.useEffect(() => {
    void refresh();
  }, []);

  function openAdd() {
    setErr(null);
    setEditingId(null);
    setForm(emptyForm);
    setShowAddContacts(false);
    setAddContactDrafts([defaultAddContactDraft()]);
    setAddPrimaryContactIdx(null);
    setModal("add");
    void loadOrganizations();
  }

  function openEdit(o: Opp) {
    setErr(null);
    setEditingId(o.id);
    const primary = o.product_id ? String(o.product_id) : "";
    const extras = Array.isArray(o.additional_product_ids) ? o.additional_product_ids.map(String).filter(Boolean) : [];
    let product_ids = uniqueOrderedIds(primary ? [primary, ...extras] : extras);
    if (product_ids.length === 0 && o.product_line.trim()) {
      const byName = catalog.find((p) => p.name === o.product_line.trim());
      if (byName) product_ids = [byName.id];
    }
    const lineParts = o.product_line
      ? String(o.product_line)
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean)
      : [];
    const firstFamilyName = lineParts[0]?.split(" · ")[0]?.trim() || "";
    const matchedFamily = surgicalFamilies.find((f) => f.name.toLowerCase() === firstFamilyName.toLowerCase());
    setForm({
      account_id: o.account_id || "",
      account_name: o.account_name,
      physician_name: o.physician_name || "",
      primary_family_id: matchedFamily?.id || "",
      product_labels: lineParts.length ? lineParts : product_ids.map((id) => catalog.find((c) => c.id === id)?.name || id),
      manual_variant: "",
      value_dollars: o.value_cents ? String(o.value_cents / 100) : "",
      practice_setting: parsePracticeSetting(o.practice_setting),
      stage: o.stage,
      city: o.city || "",
      state: o.state || "",
      close_date: o.close_date || "",
      close_date_unknown: !o.close_date,
      notes: o.notes || "",
      closed_lost_reason: o.closed_lost_reason || "",
    });
    setModal("edit");
  }

  async function save(addAnother: boolean) {
    if (!form.account_id && !form.account_name.trim()) {
      setErr("Pick an organization from the list or type a new organization name.");
      return;
    }
    if (!form.primary_family_id) {
      setErr("Choose at least one product line.");
      return;
    }
    const familyName = (surgicalFamilies.find((x) => x.id === form.primary_family_id)?.name || "").trim();
    const product_labels =
      modal === "add"
        ? [...new Set([familyName, ...form.product_labels].map((s) => s.trim()).filter(Boolean))]
        : form.product_labels.length > 0
          ? form.product_labels
          : familyName
            ? [familyName]
            : [];
    if (product_labels.length === 0) {
      setErr("Could not resolve the selected product family name.");
      return;
    }
    if (form.stage === "lost" && !form.closed_lost_reason.trim()) {
      setErr("Select a loss reason when marking an evaluation as closed lost.");
      return;
    }
    const preparedContacts = addContactDrafts
      .map((d, idx) => ({
        idx,
        first_name: d.first_name.trim(),
        last_name: d.last_name.trim() || null,
        email: d.email.trim() || null,
        phone: d.phone.trim() || null,
        role_type: d.role_type,
      }))
      .filter((d) => d.first_name.length > 0);
    const preparedPrimaryIndex = preparedContacts.findIndex((d) => d.idx === addPrimaryContactIdx);

    const rawVal = form.value_dollars.trim();
    let value_cents = 0;
    if (rawVal) {
      const c = dollarsToCents(rawVal);
      if (c === null) {
        setErr("If you enter an estimated value, use a valid dollar amount.");
        return;
      }
      value_cents = c;
    }

    setSaving(true);
    setErr(null);
    try {
      const payload =
        modal === "add"
          ? {
              account_id: form.account_id || null,
              account_name: form.account_name.trim(),
              physician_name: form.physician_name.trim() || null,
              surgeon_contact_id:
                clinicianSelectValue && clinicianSelectValue !== CLINICIAN_OTHER ? clinicianSelectValue : null,
              new_contacts:
                preparedContacts.length > 0
                  ? preparedContacts.map((d) => ({
                      first_name: d.first_name,
                      last_name: d.last_name,
                      email: d.email,
                      phone: d.phone,
                      role_type: d.role_type,
                    }))
                  : undefined,
              primary_contact_index: preparedPrimaryIndex >= 0 ? preparedPrimaryIndex : undefined,
              product_labels,
              value_cents,
              practice_setting: form.practice_setting,
              stage: form.stage,
              city: form.city.trim() || null,
              state: form.state.trim() || null,
              close_date: form.close_date_unknown ? null : form.close_date.trim() || null,
              notes: form.notes.trim() || null,
              closed_lost_reason:
                form.stage === "lost" ? form.closed_lost_reason.trim() || null : null,
            }
          : {
              account_id: form.account_id || null,
              account_name: form.account_name.trim(),
              physician_name: form.physician_name.trim() || null,
              surgeon_contact_id:
                clinicianSelectValue && clinicianSelectValue !== CLINICIAN_OTHER ? clinicianSelectValue : null,
              product_labels,
              value_cents,
              practice_setting: form.practice_setting,
              stage: form.stage,
              city: form.city.trim() || null,
              state: form.state.trim() || null,
              close_date: form.close_date_unknown ? null : form.close_date.trim() || null,
              notes: form.notes.trim() || null,
              closed_lost_reason:
                form.stage === "lost" ? form.closed_lost_reason.trim() || null : null,
            };

      const url =
        modal === "edit" && editingId
          ? `/api/portal/sales/opportunities/${encodeURIComponent(editingId)}`
          : "/api/portal/sales/opportunities";
      const res = await fetch(url, {
        method: modal === "edit" ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await res.json();
      if (!j.ok) {
        setErr(j.error || "Save failed");
        setSaving(false);
        return;
      }
      await refresh({ soft: true });
      if (addAnother) {
        setForm(emptyForm);
        setShowAddContacts(false);
        setAddContactDrafts([defaultAddContactDraft()]);
        setAddPrimaryContactIdx(null);
        setModal("add");
        setEditingId(null);
      } else {
        setModal(null);
      }
    } catch (e) {
      setErr(userFacingError(e, "That evaluation did not save. Please try again."));
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this evaluation?")) return;
    setErr(null);
    try {
      const res = await fetch(`/api/portal/sales/opportunities/${encodeURIComponent(id)}`, { method: "DELETE" });
      const j = await res.json();
      if (!j.ok) {
        setErr(userFacingError(j.error, "That evaluation could not be deleted. Please try again."));
        return;
      }
      await refresh({ soft: true });
    } catch (e) {
      setErr(userFacingError(e, "That evaluation could not be deleted. Please try again."));
    }
  }

  async function quickMoveStage(o: Opp) {
    const next = window.prompt(
      `Move stage for ${o.account_name}.\nEnter: ${STAGE_ORDER.map((s) => SALES_STAGE_LABEL[s]).join(" | ")}`,
      salesStageLabel(o.stage)
    );
    if (!next) return;
    const selected = STAGE_ORDER.find((s) => SALES_STAGE_LABEL[s].toLowerCase() === next.trim().toLowerCase());
    if (!selected) return;
    let closed_lost_reason: string | null | undefined = undefined;
    if (selected === "lost") {
      const reason = window.prompt("Optional lost reason:", String(o.closed_lost_reason || ""));
      if (reason === null) return;
      closed_lost_reason = reason.trim() || null;
    }
    const res = await fetch(`/api/portal/sales/opportunities/${encodeURIComponent(o.id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(selected === "lost" ? { stage: selected, closed_lost_reason } : { stage: selected }),
    });
    const j = await res.json();
    if (!j.ok) {
      setErr(j.error || "Could not move stage");
      return;
    }
    await refresh({ soft: true });
  }

  async function quickAddTask(o: Opp) {
    const title = window.prompt("Task title:", `Follow up ${o.account_name}`);
    if (!title) return;
    const due = window.prompt("Due date (YYYY-MM-DD):", new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10));
    if (!due) return;
    const res = await fetch("/api/portal/sales/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ opportunity_id: o.id, title: title.trim(), due_date: due.trim() }),
    });
    const j = await res.json();
    if (!j.ok) {
      setErr(j.error || "Could not add task");
      return;
    }
    await refresh({ soft: true });
  }

  async function quickLogActivity(o: Opp) {
    const summary = window.prompt("Activity note:", `Follow-up touchpoint for ${o.account_name}`);
    if (!summary) return;
    const res = await fetch(`/api/portal/sales/opportunities/${encodeURIComponent(o.id)}/activities`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activity_type: "note", summary: summary.trim() }),
    });
    const j = await res.json();
    if (!j.ok) {
      setErr(j.error || "Could not log activity");
      return;
    }
    await refresh({ soft: true });
  }

  const toolbar = (
    <>
      <SalesCmdLink href="/portal/sales" variant="secondary">
        ← Dashboard
      </SalesCmdLink>
      <SalesCmdLink href="/portal/sales/board" variant="secondary">
        Pipeline board
      </SalesCmdLink>
      <button
        type="button"
        onClick={exportCsv}
        disabled={displayRows.length === 0}
        style={{
          ...sc.btnGhost,
          cursor: displayRows.length === 0 ? "not-allowed" : "pointer",
          opacity: displayRows.length === 0 ? 0.5 : 1,
        }}
      >
        Export CSV
      </button>
      <button type="button" onClick={openAdd} style={sc.btnPrimary}>
        + {OPPORTUNITY_UI.createButton}
      </button>
    </>
  );

  return (
    <SalesCommandPage
      title={OPPORTUNITY_UI.navListTitle}
      subtitle={OPPORTUNITY_UI.listPageSubtitle}
      omitBuiltInHeader
      nativeLayout
      actions={null}
    >
      <style
        dangerouslySetInnerHTML={{
          __html: `
.opps-dense .sales-cmd-table th,.opps-dense .sales-cmd-table td{padding:8px 10px!important}
.opps-dense .sales-cmd-table{font-size:12px}
.opps-dense .sales-cmd-table thead th{font-size:10px}
.opps-dense .sales-cmd-opp-link{font-size:13px}
.opps-dense .sales-cmd-table-wrap{margin:0 -12px -12px;border-radius:0 0 10px 10px}
.opps-dense .opps-toolbar{display:grid;grid-template-columns:minmax(240px,2.2fr) repeat(4,minmax(110px,1fr)) auto;gap:6px;align-items:center}
.opps-dense .opps-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(126px,1fr));gap:6px;margin-top:6px}
.opps-dense .opps-toolbar-compact{margin-bottom:4px}
.opps-dense .opps-input{min-height:36px!important;height:36px!important;padding:6px 10px!important;font-size:12px!important}
.opps-dense .opps-actions{position:relative}
.opps-dense .opps-actions summary{list-style:none;cursor:pointer;border:1px solid color-mix(in srgb,var(--foreground) 10%,var(--border));border-radius:8px;width:28px;height:28px;display:flex;align-items:center;justify-content:center;color:var(--muted)}
.opps-dense .opps-actions summary::-webkit-details-marker{display:none}
.opps-dense .opps-actions-menu{position:absolute;right:0;top:32px;z-index:30;min-width:150px;border:1px solid color-mix(in srgb,var(--foreground) 10%,var(--border));border-radius:10px;background:var(--surface);box-shadow:0 8px 26px color-mix(in srgb,var(--foreground) 14%,transparent);padding:6px;display:grid;gap:4px}
.opps-dense .opps-actions-menu a,.opps-dense .opps-actions-menu button{text-align:left;width:100%;min-height:28px!important;font-size:11px!important;padding:4px 8px!important;border-radius:7px!important}
@media (max-width: 1100px){.opps-dense .opps-toolbar{grid-template-columns:repeat(3,minmax(160px,1fr))}}
@media (max-width: 760px){.opps-dense .opps-toolbar{grid-template-columns:1fr}}
${opportunitiesListMobileCss}
`,
        }}
      />
      <div className="opps-dense sc-native-page surgical-cases-mobile-root">
      {mobileLayout ? (
        <OpportunitiesMobileList
          rows={displayRows}
          loading={loading}
          err={err && !modal ? err : null}
          feedTasks={feedTasks}
          lastActivityByOpp={lastActivityByOpp}
          onOpenCreate={openAdd}
          onAddNote={(o) => void quickLogActivity(o as Opp)}
          onRefresh={() => void refresh({ soft: true })}
        />
      ) : (
        <>
      {err && !modal ? (
        <div role="alert" style={sc.alertError}>
          {err}
        </div>
      ) : null}

      <SalesPanel title={`Find ${OPPORTUNITY_UI.navListTitle}`} nativeFlat>
        <div className="sales-cmd-filter opps-toolbar-compact" style={{ display: "grid", gap: 8 }}>
          <div className="opps-toolbar">
            <input
              type="search"
              placeholder="Search org, surgeon, product, city, state"
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              style={{ ...inputStyle, width: "100%" }}
              className="opps-input"
            />
            <select value={stageFilter} onChange={(e) => setStageFilter((e.target.value || "") as "" | SalesStage)} style={{ ...inputStyle, width: "100%" }} className="opps-input">
              <option value="">Stage</option>
              {SALES_STAGES.map((s) => (
                <option key={s} value={s}>
                  {SALES_STAGE_LABEL[s]}
                </option>
              ))}
            </select>
            <select value={organizationFilter} onChange={(e) => setOrganizationFilter(e.target.value)} style={{ ...inputStyle, width: "100%" }} className="opps-input">
              <option value="">Organization</option>
              {organizationOptions.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
            <select value={ownerFilter} onChange={(e) => setOwnerFilter(e.target.value)} style={{ ...inputStyle, width: "100%" }} className="opps-input">
              <option value="">Owner</option>
              {ownerOptions.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
            <select value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)} style={{ ...inputStyle, width: "100%" }} className="opps-input">
              <option value="updated_at">Sort: Updated</option>
              <option value="last_activity">Sort: Activity</option>
              <option value="days_in_stage">Sort: Days in stage</option>
              <option value="account_name">Sort: Organization</option>
              <option value="close_date">Sort: Close date</option>
              <option value="value_cents">Sort: Value</option>
              <option value="stage_order">Sort: Stage</option>
              <option value="created_at">Sort: Created</option>
            </select>
            <button type="button" onClick={() => setShowMoreFilters((v) => !v)} style={{ ...sc.btnGhost, minHeight: 36, padding: "0 10px", fontSize: 12 }}>
              {showMoreFilters ? "Hide filters" : "Filters"}
            </button>
          </div>
          {showMoreFilters ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 6 }}>
              <select value={settingFilter} onChange={(e) => setSettingFilter((e.target.value || "") as "" | PracticeSetting)} style={{ ...inputStyle, width: "100%" }} className="opps-input">
                <option value="">Care setting</option>
                {PRACTICE_SETTINGS.map((k) => (
                  <option key={k} value={k}>
                    {PRACTICE_SETTING_LABEL[k]}
                  </option>
                ))}
              </select>
              <select value={productFamilyFilter} onChange={(e) => setProductFamilyFilter(e.target.value)} style={{ ...inputStyle, width: "100%" }} className="opps-input">
                <option value="">Product family</option>
                {productFamilyOptions.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
              <select value={clinicianFilter} onChange={(e) => setClinicianFilter(e.target.value)} style={{ ...inputStyle, width: "100%" }} className="opps-input">
                <option value="">Clinician</option>
                {clinicianOptions.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
              <select value={closeFilter} onChange={(e) => setCloseFilter(e.target.value as typeof closeFilter)} style={{ ...inputStyle, width: "100%" }} className="opps-input">
                <option value="">Close date</option>
                <option value="with_close">Has expected close</option>
                <option value="without_close">No expected close</option>
                <option value="overdue">Overdue expected close</option>
              </select>
              <select value={sortDesc ? "desc" : "asc"} onChange={(e) => setSortDesc(e.target.value === "desc")} style={{ ...inputStyle, width: "100%" }} className="opps-input">
                <option value="desc">Direction: Desc</option>
                <option value="asc">Direction: Asc</option>
              </select>
              <label style={{ display: "inline-flex", alignItems: "center", gap: 8, minHeight: 36, fontSize: 12, color: "var(--muted)", fontWeight: 650 }}>
                <input type="checkbox" checked={needsNextStepOnly} onChange={(e) => setNeedsNextStepOnly(e.target.checked)} />
                Needs next step
              </label>
            </div>
          ) : null}
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, justifyContent: "space-between" }}>
            <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 650 }}>
              {loading ? "Loading…" : `Showing ${filteredRows.length} of ${rows.length} ${rows.length === 1 ? OPPORTUNITY_UI.initiativeSingular : OPPORTUNITY_UI.initiativePlural}`}
            </span>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              {(searchQ || stageFilter || settingFilter || productFamilyFilter || organizationFilter || clinicianFilter || ownerFilter || closeFilter || needsNextStepOnly) && rows.length > 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQ("");
                    setStageFilter("");
                    setSettingFilter("");
                    setProductFamilyFilter("");
                    setOrganizationFilter("");
                    setClinicianFilter("");
                    setOwnerFilter("");
                    setCloseFilter("");
                    setNeedsNextStepOnly(false);
                  }}
                  style={{ ...sc.btnGhost, minHeight: 30, padding: "0 8px", fontSize: 11.5 }}
                >
                  Clear
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </SalesPanel>

      <section className="opps-kpis opps-kpis-scroll" aria-label="Pipeline summary">
        <KpiChip label={OPPORTUNITY_UI.openInitiativesLabel} value={String(leadMetrics.open)} />
        <KpiChip label="Leads in evaluation" value={String(leadMetrics.evaluation)} />
        <KpiChip label="Leads needing attention" value={String(leadMetrics.needsAttention)} tone="warn" />
        <KpiChip label="Won / Pref Card updates" value={String(leadMetrics.won)} tone="ok" />
        <KpiChip label="Closed lost" value={String(leadMetrics.lost)} tone="danger" />
        <KpiChip label="Pipeline value" value={formatUsdFromCents(leadMetrics.pipeline)} />
      </section>

      <SalesPanel
        title="Prospect pipeline"
      >
        {loading ? (
          <div style={{ padding: "36px 20px", textAlign: "center", color: "var(--muted)", fontSize: 15 }}>Loading…</div>
        ) : rows.length === 0 ? (
          <div style={{ padding: "40px 24px", textAlign: "center", maxWidth: 400, margin: "0 auto" }}>
            <p style={{ margin: "0 0 16px", fontSize: 15, color: "var(--muted)", lineHeight: 1.5 }}>
              {OPPORTUNITY_UI.emptyDescription}
            </p>
            <button type="button" onClick={openAdd} style={sc.btnPrimary}>
              {OPPORTUNITY_UI.emptyListCta}
            </button>
          </div>
        ) : filteredRows.length === 0 ? (
          <div style={{ padding: "36px 24px", textAlign: "center" }}>
            <p style={{ margin: "0 0 14px", color: "var(--muted)", fontSize: 15 }}>Nothing matches these filters.</p>
            <button
              type="button"
              onClick={() => {
                setSearchQ("");
                setStageFilter("");
                setSettingFilter("");
                setProductFamilyFilter("");
                setOrganizationFilter("");
                setClinicianFilter("");
                setOwnerFilter("");
                setCloseFilter("");
                setNeedsNextStepOnly(false);
              }}
              style={{ ...sc.btnSecondary, cursor: "pointer", fontFamily: "inherit" }}
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="sales-cmd-table-wrap" style={{ overflowX: "auto" }}>
            <table className="sales-cmd-table" style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th>Organization</th>
                  <th>Provider</th>
                  <th>Product</th>
                  <th>Stage</th>
                  <th>Next action</th>
                  <th>Cases</th>
                  <th>Engagements</th>
                  <th>Last activity</th>
                </tr>
              </thead>
              <tbody>
                {displayRows.map((o) => {
                  const nextTask = taskByOpp.get(o.id);
                  const nextFromField = String(o.next_action || "").trim();
                  const nextLabel = nextFromField || (nextTask ? nextTask.title : "—");
                  const lastIso = lastActivityByOpp.get(o.id) || o.updated_at || "";
                  const lastLabel = lastIso ? `${daysSince(lastIso) ?? 0}d ago` : "—";
                  const st = salesStageStyle(o.stage);
                  return (
                    <tr key={o.id}>
                      <td>
                        <Link href={`/portal/sales/opportunities/${encodeURIComponent(o.id)}`} className="sales-cmd-opp-link" style={sc.linkBrand}>
                          {o.account_name}
                        </Link>
                      </td>
                      <td>{o.physician_name || "—"}</td>
                      <td>{o.product_display || o.product_line || "—"}</td>
                      <td>
                        <span style={{ fontSize: 11, fontWeight: 800, padding: "3px 8px", borderRadius: 999, background: st.bg, color: st.fg, border: `1px solid ${st.border}` }}>
                          {salesStageLabel(o.stage)}
                        </span>
                      </td>
                      <td style={{ maxWidth: 200 }}>{nextLabel}</td>
                      <td>{o.linked_cases_count ?? 0}</td>
                      <td>{o.linked_engagements_count ?? 0}</td>
                      <td>{lastLabel}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </SalesPanel>

      <SalesPanel nativeFlat title="Needs Attention" description="Opportunities that likely need immediate action.">
        {needsAttentionRows.length === 0 ? (
          <p style={{ margin: 0, fontSize: 13, color: "var(--muted)" }}>No urgent evaluation blockers right now.</p>
        ) : (
          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 6 }}>
            {needsAttentionRows.map(({ row, issues }) => (
              <li key={row.id} style={{ border: "1px solid color-mix(in srgb,var(--warning) 22%,var(--border))", borderRadius: 8, padding: "6px 8px", background: "color-mix(in srgb,var(--warning) 6%,var(--surface))" }}>
                <Link href={`/portal/sales/opportunities/${encodeURIComponent(row.id)}`} style={{ color: "var(--foreground)", fontWeight: 750, textDecoration: "none" }}>
                  {`⚠ ${row.account_name}`}
                </Link>
                <div style={{ marginTop: 3, fontSize: 11, color: "var(--muted)" }}>{issues.join(" · ")}</div>
              </li>
            ))}
          </ul>
        )}
      </SalesPanel>

        </>
      )}

      {modal === "add" ? (
        <CreateAdoptionInitiativeModal
          prefillQuery={createPrefillQuery}
          onClose={() => {
            setErr(null);
            setModal(null);
          }}
          onSaved={async () => {
            await refresh({ soft: true });
          }}
        />
      ) : modal === "edit" ? (
        <div
          role="dialog"
          aria-modal
          style={sc.modalBackdrop}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setErr(null);
              setModal(null);
              setEditingId(null);
            }
          }}
        >
          <div style={sc.modalPanelLg}>
            {err ? (
              <div role="alert" style={{ ...sc.alertError, marginBottom: 16 }}>
                {err}
              </div>
            ) : null}
            <div style={{ fontWeight: 800, fontSize: 20, marginBottom: 6, letterSpacing: "-0.02em" }}>
              {OPPORTUNITY_UI.editModalTitle}
            </div>
            <p style={{ margin: "0 0 14px", fontSize: 12, color: "var(--muted)", lineHeight: 1.4 }}>
              Organization and clinician follow the same hierarchy as the evaluation detail header; then adjust product and stage.
            </p>
            <FormSection
              title="Organization & site"
              description="The detail page uses the organization as the title; Product Opportunity · primary contact · care setting · city/state appear in the subtitle."
              isFirst
            >
              <div style={{ display: "grid", gap: 8 }}>
                <Field label="Organization (CRM directory)">
                  <select
                    value={orgSelectValue}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === CRM_ORG_OTHER) {
                        setClinicianManualMode(false);
                        setForm((f) => ({ ...f, account_id: "", physician_name: "" }));
                        return;
                      }
                      const org = orgOptionsForSelect.find((o) => o.id === v);
                      setForm((f) => ({
                        ...f,
                        account_id: v,
                        account_name: org?.name || f.account_name,
                        city: org?.city || "",
                        state: org?.state || "",
                        physician_name: "",
                      }));
                      setClinicianManualMode(false);
                    }}
                    style={inputStyle}
                  >
                    <option value={CRM_ORG_OTHER}>New organization — type the name below</option>
                    {orgOptionsForSelect.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Organization name" required hint={undefined}>
                  <input
                    value={form.account_name}
                    onChange={(e) => setForm((f) => ({ ...f, account_name: e.target.value }))}
                    style={inputStyle}
                    placeholder="e.g. Memorial Hospital"
                  />
                </Field>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 8 }}>
                <Field label="Care setting">
                  <select
                    value={form.practice_setting}
                    onChange={(e) => setForm((f) => ({ ...f, practice_setting: e.target.value as PracticeSetting }))}
                    style={inputStyle}
                  >
                    {PRACTICE_SETTINGS.map((k) => (
                      <option key={k} value={k}>
                        {PRACTICE_SETTING_LABEL[k]}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="City">
                  <input
                    value={form.city}
                    onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                    style={inputStyle}
                    placeholder="e.g. Tampa"
                  />
                </Field>
                <Field label="State">
                  <input
                    value={form.state}
                    onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))}
                    style={inputStyle}
                    placeholder="e.g. FL"
                  />
                </Field>
              </div>
            </FormSection>
            <FormSection title="Clinician"
                description="Link to an existing CRM contact or type a display name; this appears after the organization on the evaluation header."
              >
                <div style={{ display: "grid", gap: 12 }}>
                  <Field label="Clinician (optional)">
                    <select
                      value={clinicianSelectValue}
                      disabled={!form.account_id || crmContactsBusy}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (!v) {
                          setClinicianManualMode(false);
                          setForm((f) => ({ ...f, physician_name: "" }));
                          return;
                        }
                        if (v === CLINICIAN_OTHER) {
                          setClinicianManualMode(true);
                          setForm((f) => ({ ...f, physician_name: "" }));
                          return;
                        }
                        setClinicianManualMode(false);
                        const c = crmContacts.find((x) => String(x.id) === v);
                        const nm = c ? contactDisplayName(c as Parameters<typeof contactDisplayName>[0]) : "";
                        setForm((f) => ({ ...f, physician_name: nm }));
                      }}
                      style={inputStyle}
                    >
                      <option value="">{form.account_id ? "No surgeon on file" : "Pick an organization first"}</option>
                      {crmContacts.map((c) => {
                        const id = String(c.id ?? "");
                        const nm = contactDisplayName(c as Parameters<typeof contactDisplayName>[0]);
                        const role = formatSurgicalContactRole(String(c.role_type || "other"));
                        return (
                          <option key={id} value={id}>
                            {nm} ({role})
                          </option>
                        );
                      })}
                      <option value={CLINICIAN_OTHER}>Type a different name</option>
                    </select>
                    {crmContactsBusy ? (
                      <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>Loading contacts…</span>
                    ) : form.account_id && crmContacts.length === 0 ? (
                      <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>
                        No contacts in CRM for this site yet—you can type a name below or add contacts on the organization page.
                      </span>
                    ) : null}
                  </Field>
                  {clinicianManualMode ? (
                    <Field label="Clinician name">
                      <input
                        value={form.physician_name}
                        onChange={(e) => setForm((f) => ({ ...f, physician_name: e.target.value }))}
                        style={inputStyle}
                        placeholder="e.g. Dr. Smith"
                      />
                    </Field>
                  ) : null}
                </div>
              </FormSection>
            <FormSection
              title="Offer & stage"
              description="Set product families, stage, and value for this lead."
            >
              <div style={{ display: "grid", gap: 8 }}>
                <Field label="Product lines" required hint={undefined}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {surgicalFamilies.map((fam) => {
                      const famName = fam.name.trim();
                      const isPrimary = form.primary_family_id === fam.id;
                      const isAdditional = form.product_labels.includes(famName);
                      const selected = isPrimary || isAdditional;
                      return (
                        <button
                          key={fam.id}
                          type="button"
                          onClick={() =>
                            setForm((prev) => {
                              const currentPrimaryId = prev.primary_family_id;
                              const currentAdditional = [...prev.product_labels];
                              const primaryName =
                                surgicalFamilies.find((x) => x.id === currentPrimaryId)?.name.trim() || "";
                              if (!selected) {
                                if (!currentPrimaryId) {
                                  return { ...prev, primary_family_id: fam.id, manual_variant: "" };
                                }
                                return { ...prev, product_labels: uniqueOrderedIds([...currentAdditional, famName]) };
                              }
                              if (isPrimary) {
                                if (currentAdditional.length === 0) {
                                  return { ...prev, primary_family_id: "", product_labels: [], manual_variant: "" };
                                }
                                const nextPrimaryName = currentAdditional[0]!;
                                const nextPrimary = surgicalFamilies.find((x) => x.name.trim() === nextPrimaryName);
                                return {
                                  ...prev,
                                  primary_family_id: nextPrimary?.id || "",
                                  product_labels: currentAdditional.filter((n) => n !== nextPrimaryName && n !== primaryName),
                                  manual_variant: "",
                                };
                              }
                              return { ...prev, product_labels: currentAdditional.filter((n) => n !== famName) };
                            })
                          }
                          style={{
                            borderRadius: 999,
                            border: selected
                              ? "1px solid color-mix(in srgb, var(--brand-600) 42%, var(--border))"
                              : "1px solid color-mix(in srgb, var(--foreground) 12%, var(--border))",
                            background: selected
                              ? "color-mix(in srgb, var(--brand-600) 10%, var(--surface))"
                              : "var(--surface)",
                            color: "var(--foreground)",
                            fontSize: 12,
                            fontWeight: 700,
                            padding: "6px 10px",
                            cursor: "pointer",
                          }}
                        >
                          {isPrimary ? "★ " : selected ? "✓ " : ""}{fam.name}
                        </button>
                      );
                    })}
                  </div>
                  {modal === "edit" ? (
                    <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>
                      Click to select. The starred family is primary.
                    </span>
                  ) : null}
                </Field>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 8 }}>
                <Field label="Stage">
                  <select
                    value={form.stage}
                    onChange={(e) => setForm((f) => ({ ...f, stage: e.target.value as SalesStage }))}
                    style={inputStyle}
                  >
                    {SALES_STAGES.map((s) => (
                      <option key={s} value={s}>
                        {SALES_STAGE_LABEL[s]}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Estimated value">
                  <input
                    value={form.value_dollars}
                    onChange={(e) => setForm((f) => ({ ...f, value_dollars: e.target.value }))}
                    style={inputStyle}
                    placeholder="USD"
                  />
                </Field>
              </div>
              {modal === "edit" ? (
                <div style={{ display: "grid", gap: 12 }}>
                  <Field label="Surgical variants (optional)">
                    {form.primary_family_id && filteredVariantOptions.length > 0 ? (
                      <label
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 8,
                          fontSize: 13,
                          fontWeight: 600,
                          color: "var(--muted)",
                          cursor: "pointer",
                          userSelect: "none",
                          marginBottom: 4,
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={allFilteredVariantsSelected}
                          onChange={() => {
                            setForm((f) => {
                              if (allFilteredVariantsSelected) {
                                return {
                                  ...f,
                                  product_labels: f.product_labels.filter((label) => !filteredVariantOptions.includes(label)),
                                };
                              }
                              return {
                                ...f,
                                product_labels: uniqueOrderedIds([...f.product_labels, ...filteredVariantOptions]),
                              };
                            });
                          }}
                          style={{ width: 16, height: 16, cursor: "pointer" }}
                        />
                        Select all
                      </label>
                    ) : null}
                    <div
                      style={{
                        maxHeight: 240,
                        overflowY: "auto",
                        borderRadius: 10,
                        border: "1px solid color-mix(in srgb, var(--foreground) 10%, var(--border))",
                        background: "var(--surface-2)",
                        padding: "8px 4px",
                      }}
                    >
                      {form.primary_family_id && filteredVariantOptions.length === 0 ? (
                        <div style={{ padding: "12px 14px", fontSize: 13, color: "var(--muted)", lineHeight: 1.45 }}>
                          No catalog SKUs for this family—you can save with the main product only. Add a manual variant below if you need a specific code on the record.
                        </div>
                      ) : !form.primary_family_id ? (
                        <div style={{ padding: "12px 14px", fontSize: 13, color: "var(--muted)" }}>
                          Select a main product family first.
                        </div>
                      ) : (
                        filteredVariantOptions.map((label) => {
                          const checked = form.product_labels.includes(label);
                          return (
                            <label
                              key={label}
                              style={{
                                display: "flex",
                                gap: 10,
                                alignItems: "flex-start",
                                padding: "8px 12px",
                                cursor: "pointer",
                                borderRadius: 8,
                                fontSize: 14,
                                fontWeight: 500,
                                lineHeight: 1.35,
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => {
                                  setForm((f) => {
                                    if (f.product_labels.includes(label)) {
                                      return { ...f, product_labels: f.product_labels.filter((x) => x !== label) };
                                    }
                                    return { ...f, product_labels: [...f.product_labels, label] };
                                  });
                                }}
                                style={{ marginTop: 2, flexShrink: 0 }}
                              />
                              <span>
                                {label}
                              </span>
                            </label>
                          );
                        })
                      )}
                    </div>
                    {form.product_labels.length > 0 ? (
                      <div style={{ marginTop: 8, fontSize: 12, fontWeight: 600, color: "var(--muted)" }}>
                        {form.product_labels.length} selected
                      </div>
                    ) : null}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8, marginTop: 10 }}>
                      <input
                        value={form.manual_variant}
                        onChange={(e) => setForm((f) => ({ ...f, manual_variant: e.target.value }))}
                        placeholder="Manual variant (e.g. Skeletal Dynamics · SD-XXXX)"
                        style={inputStyle}
                      />
                      <button
                        type="button"
                        style={sc.btnSecondary}
                        disabled={!form.primary_family_id}
                        onClick={() => {
                          const v = form.manual_variant.trim();
                          if (!v || !form.primary_family_id) return;
                          const familyName = (surgicalFamilies.find((x) => x.id === form.primary_family_id)?.name || "").trim();
                          const value = v.startsWith(`${familyName} · `) ? v : `${familyName} · ${v}`;
                          setForm((f) =>
                            f.product_labels.includes(value)
                              ? { ...f, manual_variant: "" }
                              : { ...f, product_labels: [...f.product_labels, value], manual_variant: "" }
                          );
                        }}
                      >
                        Add
                      </button>
                    </div>
                  </Field>
                </div>
              ) : null}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 8 }}>
                {form.stage === "lost" ? (
                  <Field label="Loss reason">
                    <select
                      value={form.closed_lost_reason}
                      onChange={(e) => setForm((f) => ({ ...f, closed_lost_reason: e.target.value }))}
                      style={inputStyle}
                    >
                      <option value="">Select…</option>
                      {LOST_REASONS.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                ) : null}
              </div>
            </FormSection>
            <FormSection title="Forecast & notes" description={undefined}>
              <div style={{ display: "grid", gap: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 750, color: "var(--muted)", letterSpacing: "0.02em" }}>
                  Expected close date
                </span>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 12,
                    alignItems: "center",
                  }}
                >
                  <input
                    type="date"
                    disabled={form.close_date_unknown}
                    value={form.close_date_unknown ? "" : form.close_date}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        close_date: e.target.value,
                        close_date_unknown: false,
                      }))
                    }
                    style={{
                      ...inputStyle,
                      opacity: form.close_date_unknown ? 0.55 : 1,
                      maxWidth: "100%",
                    }}
                  />
                  <label
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                      userSelect: "none",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={form.close_date_unknown}
                      onChange={(e) => {
                        const on = e.target.checked;
                        setForm((f) => ({
                          ...f,
                          close_date_unknown: on,
                          close_date: on ? "" : f.close_date,
                        }));
                      }}
                      style={{ width: 18, height: 18, cursor: "pointer" }}
                    />
                    Unknown
                  </label>
                </div>
              </div>
              <Field
                label="Notes"
                hint="Sales context only — no patient names, DOBs, MRNs, or other PHI."
              >
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  style={{ ...inputStyle, minHeight: 96, resize: "vertical" as const }}
                  placeholder="Next steps, committee timing, formulary…"
                />
              </Field>
            </FormSection>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14, justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => {
                  setErr(null);
                  setModal(null);
                  setEditingId(null);
                }}
                style={sc.btnGhost}
              >
                Cancel
              </button>
              
              <button type="button" disabled={saving} onClick={() => save(false)} style={sc.btnPrimary}>
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      </div>
    </SalesCommandPage>
  );
}

function Field({
  label,
  children,
  required,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
  hint?: string;
}) {
  return (
    <label style={{ display: "grid", gap: 5 }}>
      <span style={{ fontSize: 11, fontWeight: 730, color: "var(--muted)", letterSpacing: "0.015em" }}>
        {label}
        {required ? <span style={{ color: "var(--danger)", marginLeft: 4 }} aria-hidden>*</span> : null}
      </span>
      {children}
      {hint ? (
        <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600, lineHeight: 1.4 }}>{hint}</span>
      ) : null}
    </label>
  );
}

function KpiChip({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "ok" | "warn" | "danger" }) {
  const border =
    tone === "ok"
      ? "color-mix(in srgb,var(--success) 32%,var(--border))"
      : tone === "warn"
        ? "color-mix(in srgb,var(--warning) 36%,var(--border))"
        : tone === "danger"
          ? "color-mix(in srgb,var(--danger) 36%,var(--border))"
          : "color-mix(in srgb,var(--foreground) 10%,var(--border))";
  const bg =
    tone === "ok"
      ? "color-mix(in srgb,var(--success) 8%,var(--surface))"
      : tone === "warn"
        ? "color-mix(in srgb,var(--warning) 10%,var(--surface))"
        : tone === "danger"
          ? "color-mix(in srgb,var(--danger) 8%,var(--surface))"
          : "color-mix(in srgb,var(--surface-2) 40%,var(--surface))";
  return (
    <div className="opps-kpi-chip" style={{ border: `1px solid ${border}`, background: bg }}>
      <div className="opps-kpi-chip-label">{label}</div>
      <div className="opps-kpi-chip-value">{value}</div>
    </div>
  );
}

const inputStyle: CSSProperties = {
  ...sc.input,
  minHeight: 38,
  paddingTop: 7,
  paddingBottom: 7,
};

function FormSection({
  title,
  description,
  children,
  isFirst,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  isFirst?: boolean;
}) {
  return (
    <div
      style={{
        display: "grid",
        gap: 8,
        ...(isFirst
          ? {}
          : {
              paddingTop: 14,
              marginTop: 2,
              borderTop: "1px solid color-mix(in srgb, var(--foreground) 8%, var(--border))",
            }),
      }}
    >
      <div style={sc.formSectionTitle}>{title}</div>
      {description ? (
        <p style={{ margin: 0, fontSize: 12, color: "var(--muted)", lineHeight: 1.45, fontWeight: 600 }}>{description}</p>
      ) : null}
      <div style={{ display: "grid", gap: 8 }}>{children}</div>
    </div>
  );
}


