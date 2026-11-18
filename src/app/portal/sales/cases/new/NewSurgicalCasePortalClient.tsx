"use client";

import Link from "next/link";
import { OPPORTUNITY_UI } from "@/lib/sales/opportunityUiLabels";
import { useRouter, useSearchParams } from "next/navigation";
import React from "react";
import { PortalMobileMenuButton } from "@/components/portal/PortalMobileMenuButton";
import { SalesCommandPage, sc, surgicalCaseModalActionsCss } from "@/components/sales/salesCommandUi";
import { contactFormModalCss } from "@/components/sales/contactFormModalCss";
import type { ResolvedCaseProcedureTemplate } from "@/lib/surgical-sales/caseProcedureTemplateSpecs";
import {
  contactDisplayName,
  formatSurgicalContactRole,
  NEW_SURGICAL_CASE_PHI_BANNER,
} from "@/lib/surgical-sales/labels";
import ManageSupportContactsModal from "@/components/sales/ManageSupportContactsModal";
import { detectSurgicalPhiPatternKinds } from "@/lib/surgical-sales/phiContentHeuristics";
import PhiPatternAdvisoryModal, { PhiPatternInlineHint } from "@/components/sales/PhiPatternAdvisoryModal";
import { readResponseJson } from "@/lib/utils/readResponseJson";
import type { ProviderDirectoryRow } from "@/lib/surgical-sales/providerDirectory";
import { isProviderRole } from "@/lib/surgical-sales/providerRoles";
import {
  NewCaseProviderContextCard,
  NewCaseProviderPanel,
  type NewCaseProviderContext,
  type ProviderPickOption,
} from "./NewCaseProviderPanel";
import { buildNewCaseOperationalReadiness } from "@/lib/surgical-sales/buildNewCaseOperationalReadiness";
import {
  missionNextFieldLabelClass,
  resolveMissionNextFieldHighlight,
  type MissionNextFieldKey,
} from "@/lib/surgical-sales/resolveMissionNextFieldHighlight";
import {
  NewCaseOperationalReadinessPanel,
  newCaseOperationalReadinessCss,
} from "./NewCaseOperationalReadinessPanel";
import { NewCaseObservationObjectivesSection } from "./NewCaseObservationObjectivesSection";
import { NewCaseProceduralContextNotes } from "./NewCaseProceduralContextNotes";
import type { ObservationObjectivesDraft } from "@/lib/surgical-sales/observationObjectives";
import { observationObjectivesFromCaseRow } from "@/lib/surgical-sales/observationObjectives";
import { NewCaseCollapsibleSection } from "./NewCaseCollapsibleSection";
import { NewCaseOptionalPlanningSection } from "./NewCaseOptionalPlanningSection";
import { buildOptionalPlanningSummary } from "@/lib/surgical-sales/buildOptionalPlanningSummary";
import { buildProductSupportOptionalPlanningSummary } from "@/lib/surgical-sales/buildProductSupportOptionalPlanningSummary";
import {
  cleanProcedureSuggestions,
  collectQuickAddProcedureSuggestions,
  priorCaseProcedureTypesFromRows,
} from "@/lib/surgical-sales/quickAddProcedureSuggestions";
import {
  buildCaseSupportPlanSummary,
  buildProductInventorySummary,
  buildSupportSetupSummary,
  caseSupportPlanComplete as isCaseSupportPlanComplete,
  productInventoryComplete as isProductInventoryComplete,
  supportSetupComplete as isSupportSetupComplete,
} from "@/lib/surgical-sales/productSupportMission";
import { NewCaseProductSupportMissionWorkflow } from "./NewCaseProductSupportMissionWorkflow";
import { newCaseLayoutCss } from "./newCaseLayoutCss";
import {
  buildNewCaseCreatePayload,
  observationAccessFromCaseRow,
  resolveOperationalPlanningContext,
  type ObservationAccessDraft,
  type ObservationValidationTargetHint,
  resolveNeedsProducts,
  resolveObservationProductLineComplete,
  resolveShowCompactProviderContext,
  validateNewCaseDraft,
  validateNewCaseSubmit,
} from "@/lib/surgical-sales/newSurgicalCasePageLogic";
import { resolveNewCaseFinalSaveStatus } from "@/lib/surgical-sales/casePerformedStatus";
import { NewCaseFormSaveActions } from "./NewCaseFormSaveActions";
import { userFacingError } from "@/lib/errors/userFacingError";
import { SURGICAL_PRODUCT_FAMILY_ORDER } from "@/lib/surgical-sales/productFamilyVisual";

type AccountRow = { id: string; name: string | null };
type ProductRow = { id: string; name: string };
type SkuRow = { id: string; sku: string; description?: string | null };
type ContactRow = {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  role_type?: string | null;
  archived_at?: string | null;
};
type RelationshipRow = {
  id: string;
  relationship_type?: string | null;
  notes?: string | null;
  related_contact?: ContactRow | null;
};
type OpportunityRow = {
  id: string;
  account_id?: string | null;
  account_name?: string | null;
  physician_name?: string | null;
  product_display?: string | null;
  product_line?: string | null;
  stage?: string | null;
};

type OpportunityOption = { id: string; title: string | null; stage?: string | null };

function formatRelatedOpportunityLabel(o: OpportunityRow): string {
  const account = String(o.account_name || "Organization").trim();
  const product = String(o.product_display || o.product_line || OPPORTUNITY_UI.fallbackRecordLabel).trim();
  const physician = String(o.physician_name || "").trim();
  return physician ? `${account} — ${product} · ${physician}` : `${account} — ${product}`;
}

type NewCaseTypeId = "observation" | "product_support";

function NewCaseTypeSelector({
  caseType,
  onSelect,
}: {
  caseType: NewCaseTypeId;
  onSelect: (next: NewCaseTypeId) => void;
}) {
  return (
    <div className="new-case-type-grid" role="group" aria-label="Case type">
      <button
        type="button"
        onClick={() => onSelect("observation")}
        className={`new-case-type-btn ${caseType === "observation" ? "is-selected" : "is-unselected"}`}
        aria-pressed={caseType === "observation"}
      >
        <span className={`new-case-type-status ${caseType === "observation" ? "is-selected" : "is-unselected"}`}>
          {caseType === "observation" ? "Selected" : "Tap to select"}
        </span>
        <span style={{ fontWeight: 800, fontSize: 12 }}>👁 Observation Case</span>
        <span
          className="new-case-type-desc"
          style={{
            color: caseType === "observation" ? "color-mix(in srgb,var(--foreground) 82%,var(--muted))" : undefined,
          }}
        >
          Observe procedure, capture workflow gaps, surgeon feedback, and clinical needs.
        </span>
      </button>
      <button
        type="button"
        onClick={() => onSelect("product_support")}
        className={`new-case-type-btn ${caseType === "product_support" ? "is-selected" : "is-unselected"}`}
        aria-pressed={caseType === "product_support"}
      >
        <span className={`new-case-type-status ${caseType === "product_support" ? "is-selected" : "is-unselected"}`}>
          {caseType === "product_support" ? "Selected" : "Tap to select"}
        </span>
        <span className="new-case-type-requires">Requires product/SKU</span>
        <span style={{ fontWeight: 800, fontSize: 12 }}>🧰 Product Support Case</span>
        <span
          className="new-case-type-desc"
          style={{
            color: caseType === "product_support" ? "color-mix(in srgb,var(--foreground) 82%,var(--muted))" : undefined,
          }}
        >
          For live product support, SKU tracking, inventory, documentation, and procedural coverage.
        </span>
      </button>
    </div>
  );
}

function LockedCaseField({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="new-case-locked-field" aria-readonly="true">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
        <span style={{ fontWeight: 700, fontSize: 12 }}>{label}</span>
        <span className="new-case-locked-pill" aria-hidden>
          Locked
        </span>
      </div>
      <div style={{ fontSize: 13, fontWeight: 650, lineHeight: 1.35, color: "var(--foreground)" }}>{value}</div>
      <div style={{ fontSize: 11, color: "var(--muted)", lineHeight: 1.35 }}>{hint}</div>
    </div>
  );
}

function MissionStep({
  step,
  title,
  isActive,
  isComplete,
  isLocked,
  summary,
  tone = "default",
  onActivate,
  sectionRef,
  onFocusWithin,
  onBlurWithin,
  children,
}: {
  step: number;
  title: string;
  isActive: boolean;
  isComplete: boolean;
  isLocked: boolean;
  summary: string;
  tone?: "default" | "optional";
  onActivate: () => void;
  sectionRef?: React.RefObject<HTMLElement | null>;
  onFocusWithin?: () => void;
  onBlurWithin?: () => void;
  children: React.ReactNode;
}) {
  return (
    <section
      ref={sectionRef}
      className={`new-case-mission-step ${tone === "optional" ? "new-case-mission-step--optional" : ""} ${isActive ? "is-active" : ""} ${isComplete ? "is-complete" : ""} ${isLocked ? "is-locked" : ""}`}
      aria-label={`${step}. ${title}`}
      onFocusCapture={onFocusWithin}
      onBlurCapture={onBlurWithin}
    >
      <button
        type="button"
        className="new-case-mission-step-header"
        onClick={onActivate}
        disabled={isLocked}
        aria-expanded={isActive}
      >
        <span className="new-case-mission-step-index">Step {step}</span>
        <span className="new-case-mission-step-title">{title}</span>
        <span className="new-case-mission-step-state">
          {isLocked ? "Up next" : isActive ? "In focus" : isComplete ? "Settled" : "Open"}
        </span>
      </button>
      {isActive ? (
        <div className="new-case-mission-step-body">{children}</div>
      ) : (
        <div className="new-case-mission-step-summary-row">
          <p className="new-case-mission-step-summary">{summary}</p>
          {isComplete ? (
            <button type="button" className="new-case-mission-step-edit" onClick={onActivate}>
              Edit
            </button>
          ) : null}
        </div>
      )}
    </section>
  );
}

function parseSupportIdsFromQuery(raw: string): string[] {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function allowedProduct(p: ProductRow): boolean {
  const n = String(p.name || "").trim().toLowerCase();
  return SURGICAL_PRODUCT_FAMILY_ORDER.some((f) => f.toLowerCase() === n);
}

type EngagementCasePrefillPayload = {
  engagement_id: string;
  engagement_type_label: string;
  title: string | null;
  provider_id: string;
  provider_name: string;
  organization_id: string | null;
  organization_name: string | null;
  opportunity_id: string | null;
  suggested_case_type: "observation" | "product_support";
  suggested_case_date: string | null;
  suggested_notes: string | null;
  pre_call: { filled: number; total: number; complete: boolean };
  has_linked_case: boolean;
  linked_case_id: string | null;
};

type NewCaseDefaultsPayload = {
  preferred_surgeon_contact_id: string | null;
  sku_rank: { sku_id: string; count: number }[];
  suggested_expected_quantity: number | null;
  suggested_procedure_type: string | null;
  procedure_suggestions?: string[];
  recent_cases: {
    id: string;
    case_number: string;
    case_date: string | null;
    status: string;
    product_name: string | null;
  }[];
};

function lsLastAccountKey(userId: string) {
  return `surgical-new-case:v1:lastAccount:${userId}`;
}
function lsLastProductKey(userId: string) {
  return `surgical-new-case:v1:lastProduct:${userId}`;
}
function lsLastSurgeonKey(userId: string, accountId: string) {
  return `surgical-new-case:v1:lastSurgeon:${userId}:${accountId}`;
}

function sortSkusByRank(skus: SkuRow[], rank: { sku_id: string; count: number }[]): SkuRow[] {
  if (!rank.length) return [...skus].sort((a, b) => a.sku.localeCompare(b.sku));
  const order = new Map(rank.map((r, i) => [r.sku_id, i]));
  return [...skus].sort((a, b) => {
    const ia = order.has(a.id) ? order.get(a.id)! : 9999;
    const ib = order.has(b.id) ? order.get(b.id)! : 9999;
    if (ia !== ib) return ia - ib;
    return a.sku.localeCompare(b.sku);
  });
}

type ExtraLine = { key: string; product_id: string; sku_id: string; expected_quantity: string };

function newExtraLine(): ExtraLine {
  return { key: `${Date.now()}-${Math.random().toString(36).slice(2)}`, product_id: "", sku_id: "", expected_quantity: "1" };
}

export default function NewSurgicalCasePortalClient({ planningCaseId }: { planningCaseId?: string } = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isPlanningMode = Boolean(planningCaseId?.trim());
  const formatMissionDate = React.useCallback((value: string): string => {
    const raw = String(value || "").trim();
    if (!raw) return "No date";
    const parts = raw.split("-");
    if (parts.length === 3 && parts[0] && parts[1] && parts[2]) return `${parts[1]}/${parts[2]}/${parts[0]}`;
    return raw;
  }, []);
  const countDelimitedItems = React.useCallback((value: string): number => {
    return value
      .split(/\n|,|;/g)
      .map((part) => part.trim())
      .filter(Boolean).length;
  }, []);
  const [accounts, setAccounts] = React.useState<AccountRow[]>([]);
  const [products, setProducts] = React.useState<ProductRow[]>([]);
  const [skus, setSkus] = React.useState<SkuRow[]>([]);
  const [contacts, setContacts] = React.useState<ContactRow[]>([]);
  const [globalSurgeons, setGlobalSurgeons] = React.useState<ContactRow[]>([]);
  const [globalSurgeonQuery, setGlobalSurgeonQuery] = React.useState("");
  const [supportRels, setSupportRels] = React.useState<RelationshipRow[]>([]);
  const [supportBusy, setSupportBusy] = React.useState(false);
  const [prefillSupportIds, setPrefillSupportIds] = React.useState<string[]>([]);

  const [accountId, setAccountId] = React.useState("");
  const [surgeonId, setSurgeonId] = React.useState("");
  const [providerContext, setProviderContext] = React.useState<NewCaseProviderContext | null>(null);
  const [providerContextBusy, setProviderContextBusy] = React.useState(false);
  const [providerSearchQuery, setProviderSearchQuery] = React.useState("");
  const [providerSearchResults, setProviderSearchResults] = React.useState<ProviderDirectoryRow[]>([]);
  const [providerSearchBusy, setProviderSearchBusy] = React.useState(false);
  const [caseDate, setCaseDate] = React.useState("");
  const [caseTime, setCaseTime] = React.useState("");
  const [procedureType, setProcedureType] = React.useState("");
  const [productId, setProductId] = React.useState("");
  const [skuId, setSkuId] = React.useState("");
  const [expectedQty, setExpectedQty] = React.useState("1");
  const [expectedRevenue, setExpectedRevenue] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [observationObjectives, setObservationObjectives] = React.useState<ObservationObjectivesDraft>({
    observation_goal: "",
    observation_key_questions: "",
    observation_signals_to_validate: "",
  });
  const [observationAccess, setObservationAccess] = React.useState<ObservationAccessDraft>({
    scheduling_owner: "",
    access_pathway: "Unknown",
    credentialing_requirement: "unknown",
    vendor_restrictions: "",
    preferred_timing: "",
  });
  const [observationValidationTargetHints, setObservationValidationTargetHints] = React.useState<
    ObservationValidationTargetHint[]
  >([]);
  const [caseType, setCaseType] = React.useState<"observation" | "product_support">("observation");
  const [showProductsForObservation, setShowProductsForObservation] = React.useState(false);
  const [draftCaseId, setDraftCaseId] = React.useState<string | null>(planningCaseId?.trim() || null);
  const [draftSaving, setDraftSaving] = React.useState(false);
  const [draftSavedFlash, setDraftSavedFlash] = React.useState(false);
  const [followUpNeeded, setFollowUpNeeded] = React.useState(false);
  const [supportObjective, setSupportObjective] = React.useState("");
  const [supportRepRole, setSupportRepRole] = React.useState("");
  const [supportRequiredMaterials, setSupportRequiredMaterials] = React.useState("");
  const [relatedOpportunityId, setRelatedOpportunityId] = React.useState("");
  const [opportunities, setOpportunities] = React.useState<OpportunityRow[]>([]);
  const [lockedOpportunity, setLockedOpportunity] = React.useState<OpportunityRow | null>(null);

  const [err, setErr] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [loadBusy, setLoadBusy] = React.useState(true);
  const [phiModal, setPhiModal] = React.useState<{ kinds: string[] } | null>(null);
  const phiAckRef = React.useRef(false);
  const notePhiKinds = React.useMemo(() => detectSurgicalPhiPatternKinds(notes), [notes]);

  React.useEffect(() => {
    phiAckRef.current = false;
  }, [notes]);

  const [portalUserId, setPortalUserId] = React.useState<string | null>(null);
  const [defaults, setDefaults] = React.useState<NewCaseDefaultsPayload | null>(null);
  const [defaultsBusy, setDefaultsBusy] = React.useState(false);
  const defaultsReqSeq = React.useRef(0);
  const appliedLsAccount = React.useRef(false);
  const appliedLsProduct = React.useRef(false);
  const appliedQuerySurgeon = React.useRef(false);
  const [procedureTouched, setProcedureTouched] = React.useState(false);
  const [qtyTouched, setQtyTouched] = React.useState(false);
  const didInitCaseDate = React.useRef(false);

  const [caseTemplates, setCaseTemplates] = React.useState<ResolvedCaseProcedureTemplate[]>([]);
  const [templateKey, setTemplateKey] = React.useState("");
  const [extraLines, setExtraLines] = React.useState<ExtraLine[]>([]);
  const [extraSkuOptions, setExtraSkuOptions] = React.useState<Record<string, SkuRow[]>>({});

  const [modalOpen, setModalOpen] = React.useState(false);
  const [cFirst, setCFirst] = React.useState("");
  const [cLast, setCLast] = React.useState("");
  const [cEmail, setCEmail] = React.useState("");
  const [cBusy, setCBusy] = React.useState(false);
  const [cErr, setCErr] = React.useState<string | null>(null);
  const [manageSupportOpen, setManageSupportOpen] = React.useState(false);
  const [oppPrefillDone, setOppPrefillDone] = React.useState(false);
  const lockedOpportunityId = React.useMemo(() => (searchParams.get("opportunity_id") || "").trim(), [searchParams]);
  const opportunityLocked = !!lockedOpportunityId;
  const lockedEngagementId = React.useMemo(() => (searchParams.get("engagement_id") || "").trim(), [searchParams]);
  const engagementLocked = Boolean(lockedEngagementId);
  const launchSurgeonContactId = React.useMemo(
    () => (searchParams.get("surgeon_contact_id") || "").trim(),
    [searchParams],
  );
  const [providerPickerUnlocked, setProviderPickerUnlocked] = React.useState(false);
  const effectiveSurgeonId = React.useMemo(
    () => surgeonId.trim() || launchSurgeonContactId.trim(),
    [surgeonId, launchSurgeonContactId],
  );
  const showCompactProviderContext = resolveShowCompactProviderContext(
    effectiveSurgeonId,
    providerPickerUnlocked,
  );
  const [engagementPrefill, setEngagementPrefill] = React.useState<EngagementCasePrefillPayload | null>(null);
  const [engagementPrefillErr, setEngagementPrefillErr] = React.useState<string | null>(null);
  const appliedEngagementPrefill = React.useRef(false);

  const opportunityOptions = React.useMemo((): OpportunityOption[] => {
    const byId = new Map<string, OpportunityRow>();
    for (const o of opportunities) {
      if (accountId.trim() && String(o.account_id || "") !== accountId) continue;
      byId.set(o.id, o);
    }
    if (lockedOpportunityId && lockedOpportunity) {
      byId.set(lockedOpportunity.id, lockedOpportunity);
    }
    if (relatedOpportunityId && !byId.has(relatedOpportunityId)) {
      const selected = opportunities.find((o) => o.id === relatedOpportunityId);
      if (selected) byId.set(selected.id, selected);
    }
    return [...byId.values()]
      .sort((a, b) => formatRelatedOpportunityLabel(a).localeCompare(formatRelatedOpportunityLabel(b)))
      .map((o) => ({
        id: o.id,
        title: formatRelatedOpportunityLabel(o),
        stage: o.stage ?? null,
      }));
  }, [opportunities, accountId, lockedOpportunityId, lockedOpportunity, relatedOpportunityId]);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!isPlanningMode) setLoadBusy(true);
      setErr(null);
      try {
        const [aRes, pRes, tRes, oRes] = await Promise.all([
          fetch("/api/portal/sales/surgical-accounts", { cache: "no-store" }),
          fetch("/api/portal/sales/surgical-catalog/products", { cache: "no-store" }),
          fetch("/api/portal/sales/surgical-cases/case-templates", { cache: "no-store" }),
          fetch("/api/portal/sales/opportunities", { cache: "no-store" }),
        ]);
        const aJson = await readResponseJson<{ ok?: boolean; organizations?: AccountRow[]; error?: string }>(aRes);
        const pJson = await readResponseJson<{ ok?: boolean; products?: ProductRow[]; error?: string }>(pRes);
        if (cancelled) return;
        if (!aJson.ok) throw new Error(aJson.error || "");
        if (!pJson.ok) throw new Error(pJson.error || "");
        setAccounts(
          (aJson.organizations || []).map((org) => ({
            id: org.id,
            name: org.name ?? null,
          })),
        );
        setProducts((pJson.products || []).filter(allowedProduct));
        try {
          const tJson = await readResponseJson<{ ok?: boolean; templates?: ResolvedCaseProcedureTemplate[] }>(tRes);
          if (!cancelled && tJson.ok && tJson.templates?.length) setCaseTemplates(tJson.templates);
        } catch {
          /* case templates are optional */
        }
        try {
          const oJson = await readResponseJson<{ ok?: boolean; opportunities?: OpportunityRow[] }>(oRes);
          if (!cancelled && oJson.ok) setOpportunities(oJson.opportunities || []);
        } catch {
          /* related opportunities are optional */
        }
      } catch (e: unknown) {
        if (!cancelled) setErr(userFacingError(e, "We could not load this page. Please try again."));
      } finally {
        if (!cancelled && !isPlanningMode) setLoadBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isPlanningMode]);

  React.useEffect(() => {
    const oid = lockedOpportunityId;
    if (!oid || oppPrefillDone) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`/api/portal/sales/opportunities/${encodeURIComponent(oid)}`, { cache: "no-store" });
        const j = await readResponseJson<{ ok?: boolean; opportunity?: Record<string, unknown> }>(res);
        if (cancelled || !j.ok || !j.opportunity) return;
        const opp = j.opportunity;
        const aid = String(opp.account_id || "").trim();
        const physician = String(opp.physician_name || "").trim();
        const pid = String(opp.product_id || "").trim();
        if (aid) setAccountId((prev) => (prev || aid));
        if (physician) {
          setSurgeonId((prev) => prev);
        }
        if (pid) {
          setProductId((prev) => prev || pid);
          setCaseType("product_support");
        }
        setRelatedOpportunityId(oid);
        setLockedOpportunity({
          id: oid,
          account_id: aid || null,
          account_name: String(opp.account_name || "").trim() || null,
          physician_name: physician || null,
          product_display: String(opp.product_display || "").trim() || null,
          product_line: String(opp.product_line || "").trim() || null,
        });
      } finally {
        if (!cancelled) setOppPrefillDone(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [lockedOpportunityId, oppPrefillDone]);

  React.useEffect(() => {
    if (opportunityLocked) return;
    if (!relatedOpportunityId) return;
    const hit = opportunities.find((o) => o.id === relatedOpportunityId);
    if (!hit) return;
    if (accountId && String(hit.account_id || "") !== accountId) {
      setRelatedOpportunityId("");
    }
  }, [accountId, opportunities, relatedOpportunityId, opportunityLocked]);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/portal/me", { cache: "no-store" });
        const j = await readResponseJson<{ ok?: boolean; user?: { id?: string } }>(res);
        if (cancelled || !res.ok || !j.ok || !j.user?.id) return;
        setPortalUserId(String(j.user.id));
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    if (didInitCaseDate.current) return;
    didInitCaseDate.current = true;
    setCaseDate((d) => (d.trim() ? d : new Date().toISOString().slice(0, 10)));
  }, []);

  React.useEffect(() => {
    if (loadBusy || !portalUserId || appliedLsAccount.current) return;
    if (accounts.length === 0) return;
    appliedLsAccount.current = true;
    try {
      const sp = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
      const qAid = (sp.get("account_id") || "").trim();
      if (qAid && accounts.some((a) => a.id === qAid)) {
        setAccountId(qAid);
        return;
      }
      const la = localStorage.getItem(lsLastAccountKey(portalUserId));
      if (la && accounts.some((a) => a.id === la)) {
        setAccountId(la);
      }
    } catch {
      /* ignore */
    }
  }, [loadBusy, portalUserId, accounts]);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = (new URLSearchParams(window.location.search).get("support_contact_ids") || "").trim();
    if (!raw) return;
    setPrefillSupportIds(parseSupportIdsFromQuery(raw));
  }, []);

  React.useEffect(() => {
    if (loadBusy || !portalUserId || appliedLsProduct.current) return;
    if (products.length === 0) return;
    appliedLsProduct.current = true;
    try {
      const lp = localStorage.getItem(lsLastProductKey(portalUserId));
      if (lp && products.some((p) => p.id === lp)) {
        setProductId(lp);
      }
    } catch {
      /* ignore */
    }
  }, [loadBusy, portalUserId, products]);

  React.useEffect(() => {
    setQtyTouched(false);
  }, [accountId, productId]);

  React.useEffect(() => {
    if (isPlanningMode) return;
    if (caseType === "observation" && surgeonId) return;
    setProcedureTouched(false);
    setProcedureType("");
  }, [accountId, caseType, isPlanningMode, surgeonId]);

  React.useEffect(() => {
    if (!portalUserId) return;
    setDefaults(null);
    const seq = ++defaultsReqSeq.current;
    const u = new URL("/api/portal/sales/surgical-cases/new-defaults", window.location.origin);
    if (accountId) u.searchParams.set("account_id", accountId);
    if (productId) u.searchParams.set("product_id", productId);
    if (surgeonId) u.searchParams.set("surgeon_contact_id", surgeonId);
    setDefaultsBusy(true);
    void (async () => {
      try {
        const res = await fetch(u.toString(), { cache: "no-store" });
        const j = await readResponseJson<{ ok?: boolean; defaults?: NewCaseDefaultsPayload }>(res);
        if (seq !== defaultsReqSeq.current) return;
        if (!res.ok || !j.ok || !j.defaults) {
          setDefaults(null);
          return;
        }
        setDefaults(j.defaults);
      } catch {
        if (seq === defaultsReqSeq.current) setDefaults(null);
      } finally {
        if (seq === defaultsReqSeq.current) setDefaultsBusy(false);
      }
    })();
  }, [accountId, productId, portalUserId, surgeonId]);

  React.useEffect(() => {
    if (caseType === "observation") return;
    if (!accountId || !portalUserId) {
      if (!accountId) setSurgeonId("");
      return;
    }
    if (contacts.length === 0) {
      setSurgeonId("");
      return;
    }
    const ids = new Set(contacts.map((c) => c.id));
    if (!appliedQuerySurgeon.current && typeof window !== "undefined") {
      const qSid = (new URLSearchParams(window.location.search).get("surgeon_contact_id") || "").trim();
      if (qSid && ids.has(qSid)) {
        appliedQuerySurgeon.current = true;
        setSurgeonId(qSid);
        return;
      }
    }
    setSurgeonId((prev) => {
      if (prev && ids.has(prev)) return prev;
      const pref = defaults?.preferred_surgeon_contact_id;
      if (pref && ids.has(pref)) return pref;
      try {
        const raw = localStorage.getItem(lsLastSurgeonKey(portalUserId, accountId));
        if (raw && ids.has(raw)) return raw;
      } catch {
        /* ignore */
      }
      if (contacts.length === 1) return contacts[0]!.id;
      return "";
    });
  }, [contacts, accountId, portalUserId, defaults?.preferred_surgeon_contact_id, caseType]);

  React.useEffect(() => {
    if (!defaults?.suggested_procedure_type || procedureTouched) return;
    setProcedureType((prev) => (prev.trim() ? prev : defaults.suggested_procedure_type!));
  }, [defaults?.suggested_procedure_type, procedureTouched]);

  const procedureSuggestions = React.useMemo(
    () =>
      cleanProcedureSuggestions([
        ...(defaults?.procedure_suggestions ?? []),
        ...collectQuickAddProcedureSuggestions(
          providerContext?.provider ?? null,
          providerContext?.specialty ?? null,
          providerContext?.priorCaseProcedureTypes ?? null,
        ),
      ]),
    [defaults?.procedure_suggestions, providerContext],
  );

  React.useEffect(() => {
    if (defaults?.suggested_expected_quantity == null || qtyTouched) return;
    setExpectedQty(String(Math.round(defaults.suggested_expected_quantity)));
  }, [defaults?.suggested_expected_quantity, qtyTouched]);

  const displaySkus = React.useMemo(() => sortSkusByRank(skus, defaults?.sku_rank ?? []), [skus, defaults?.sku_rank]);
  const mergedSurgeons = React.useMemo(() => {
    const byId = new Map<string, ContactRow>();
    for (const c of contacts) byId.set(c.id, c);
    for (const c of globalSurgeons) if (!byId.has(c.id)) byId.set(c.id, c);
    return [...byId.values()];
  }, [contacts, globalSurgeons]);

  const skusForExtraRow = React.useCallback(
    (rowProductId: string): SkuRow[] => {
      if (rowProductId && rowProductId === productId) return displaySkus;
      return (rowProductId && extraSkuOptions[rowProductId]) || [];
    },
    [productId, displaySkus, extraSkuOptions]
  );

  React.useEffect(() => {
    if (displaySkus.length === 0) return;
    const ids = new Set(displaySkus.map((s) => s.id));
    setSkuId((prev) => {
      if (prev && ids.has(prev)) return prev;
      return displaySkus[0]?.id ?? "";
    });
  }, [displaySkus]);

  React.useEffect(() => {
    if (!productId) {
      setSkus([]);
      setSkuId("");
      return;
    }
    let cancelled = false;
    void (async () => {
      const res = await fetch(`/api/portal/sales/surgical-catalog/skus?product_id=${encodeURIComponent(productId)}`, { cache: "no-store" });
      const j = await readResponseJson<{ ok?: boolean; skus?: SkuRow[] }>(res);
      if (cancelled) return;
      if (!j.ok) {
        setSkus([]);
        setSkuId("");
        return;
      }
      setSkus(j.skus || []);
    })();
    return () => {
      cancelled = true;
    };
  }, [productId]);

  React.useEffect(() => {
    const ids = [...new Set(extraLines.map((e) => e.product_id).filter(Boolean))].filter((id) => id !== productId);
    if (ids.length === 0) {
      setExtraSkuOptions({});
      return;
    }
    let cancelled = false;
    void (async () => {
      const map: Record<string, SkuRow[]> = {};
      await Promise.all(
        ids.map(async (pid) => {
          const res = await fetch(`/api/portal/sales/surgical-catalog/skus?product_id=${encodeURIComponent(pid)}`, {
            cache: "no-store",
          });
          const j = await readResponseJson<{ ok?: boolean; skus?: SkuRow[] }>(res);
          if (j.ok && j.skus) map[pid] = j.skus;
        })
      );
      if (!cancelled) setExtraSkuOptions(map);
    })();
    return () => {
      cancelled = true;
    };
  }, [extraLines, productId]);

  React.useEffect(() => {
    if (!accountId) {
      setContacts([]);
      if (caseType !== "observation") setSurgeonId("");
      return;
    }
    let cancelled = false;
    void (async () => {
      const res = await fetch(`/api/portal/sales/surgical-accounts/${encodeURIComponent(accountId)}`, { cache: "no-store" });
      const j = await readResponseJson<{ ok?: boolean; contacts?: ContactRow[] }>(res);
      if (cancelled) return;
      if (!j.ok || !j.contacts) {
        setContacts([]);
        return;
      }
      setContacts((j.contacts || []).filter((c) => String(c.role_type || "") === "surgeon"));
    })();
    return () => {
      cancelled = true;
    };
  }, [accountId, caseType]);

  React.useEffect(() => {
    const q = globalSurgeonQuery.trim();
    if (q.length < 2) {
      setGlobalSurgeons([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      const res = await fetch(`/api/portal/sales/surgical-contacts?role_type=surgeon&q=${encodeURIComponent(q)}`, {
        cache: "no-store",
      });
      const j = await readResponseJson<{ ok?: boolean; contacts?: ContactRow[] }>(res);
      if (cancelled) return;
      setGlobalSurgeons(j.ok && j.contacts ? j.contacts : []);
    })();
    return () => {
      cancelled = true;
    };
  }, [globalSurgeonQuery]);

  React.useEffect(() => {
    if (!surgeonId) {
      setSupportRels([]);
      return;
    }
    let cancelled = false;
    setSupportBusy(true);
    void (async () => {
      const res = await fetch(
        `/api/portal/sales/surgical-contact-relationships?primary_contact_id=${encodeURIComponent(surgeonId)}`,
        { cache: "no-store" }
      );
      const j = await readResponseJson<{ ok?: boolean; relationships?: RelationshipRow[] }>(res);
      if (cancelled) return;
      setSupportRels(j.ok && j.relationships ? j.relationships : []);
      setSupportBusy(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [surgeonId]);

  const prefillSupportIdSet = React.useMemo(() => new Set(prefillSupportIds), [prefillSupportIds]);
  const supportRelsDisplay = React.useMemo(() => {
    if (prefillSupportIdSet.size === 0) return supportRels;
    return [...supportRels].sort((a, b) => {
      const aId = String(a.related_contact?.id || "");
      const bId = String(b.related_contact?.id || "");
      const aRank = prefillSupportIdSet.has(aId) ? 0 : 1;
      const bRank = prefillSupportIdSet.has(bId) ? 0 : 1;
      if (aRank !== bRank) return aRank - bRank;
      return String(a.related_contact?.last_name || "").localeCompare(String(b.related_contact?.last_name || ""));
    });
  }, [supportRels, prefillSupportIdSet]);
  const supportContactPickOptions = React.useMemo(() => {
    const seen = new Set<string>();
    return supportRelsDisplay
      .map((rel) => rel.related_contact)
      .filter((contact): contact is ContactRow => Boolean(contact?.id))
      .filter((contact) => {
        if (seen.has(contact.id)) return false;
        seen.add(contact.id);
        return true;
      })
      .map((contact) => ({
        id: contact.id,
        label: `${contactDisplayName(contact)}${contact.email ? ` · ${contact.email}` : ""}`,
      }));
  }, [supportRelsDisplay]);
  const observationProductLineComplete = resolveObservationProductLineComplete(productId, skuId);
  const needsProducts = resolveNeedsProducts({
    caseType,
    showProductsForObservation,
    observationProductLineComplete,
  });

  const clearObservationProductFocus = React.useCallback(() => {
    setShowProductsForObservation(false);
    setProductId("");
    setSkuId("");
    setExpectedQty("1");
    setExpectedRevenue("");
    setExtraLines([]);
  }, []);

  const trackObservationValidationTargets = React.useCallback(
    (hints: ObservationValidationTargetHint[]) => {
      if (hints.length === 0) return;
      setObservationValidationTargetHints((prev) => {
        const map = new Map<string, ObservationValidationTargetHint>();
        for (const item of [...prev, ...hints]) {
          const key = item.label.trim().toLowerCase();
          if (!key) continue;
          map.set(key, item);
        }
        return [...map.values()];
      });
    },
    [],
  );

  const selectCaseType = React.useCallback(
    (next: "observation" | "product_support") => {
      setCaseType(next);
      if (next === "product_support") {
        setShowProductsForObservation(false);
        return;
      }
      if (!resolveObservationProductLineComplete(productId, skuId)) {
        setShowProductsForObservation(false);
      }
    },
    [productId, skuId],
  );

  React.useEffect(() => {
    if (caseType !== "observation") return;
    if (observationProductLineComplete) {
      setShowProductsForObservation(true);
      return;
    }
    if (!productId.trim() && !skuId.trim()) {
      setShowProductsForObservation(false);
    }
  }, [caseType, observationProductLineComplete, productId, skuId]);

  const saveValidationInput = React.useMemo(
    () => ({
      caseType,
      surgeonId: effectiveSurgeonId,
      accountId,
      caseDate,
      showProductsForObservation,
      productId,
      skuId,
      expectedQty,
      expectedRevenue,
      needsProducts,
      extraLines,
      notes,
      phiAcknowledged: true,
    }),
    [
      accountId,
      caseDate,
      caseType,
      effectiveSurgeonId,
      expectedQty,
      expectedRevenue,
      extraLines,
      needsProducts,
      notes,
      productId,
      showProductsForObservation,
      skuId,
    ],
  );

  const [saveGuidanceVisible, setSaveGuidanceVisible] = React.useState(false);
  const selectedOrgName = accounts.find((a) => a.id === accountId)?.name || "—";

  const lockedOrganizationLabel = String(lockedOpportunity?.account_name || "").trim() || selectedOrgName;
  const lockedRelatedOpportunityLabel = React.useMemo(() => {
    if (!relatedOpportunityId) return "—";
    const hit =
      opportunityOptions.find((o) => o.id === relatedOpportunityId) ||
      (lockedOpportunity?.id === relatedOpportunityId ? lockedOpportunity : null);
    return hit ? formatRelatedOpportunityLabel(hit) : OPPORTUNITY_UI.newCaseLoadingInitiative;
  }, [relatedOpportunityId, opportunityOptions, lockedOpportunity]);
  const selectedSurgeon = mergedSurgeons.find((s) => s.id === surgeonId);

  const applyProviderContext = React.useCallback(
    (ctx: NewCaseProviderContext) => {
      setProviderContext(ctx);

      if (!opportunityLocked) {
        const primaryId = String(ctx.primary_organization?.id || "").trim();
        if (primaryId) {
          setAccountId((prev) => (prev && prev === primaryId ? prev : primaryId));
        }
      }

      if (!isPlanningMode) {
        const suggestions = collectQuickAddProcedureSuggestions(
          ctx.provider,
          ctx.specialty,
          ctx.priorCaseProcedureTypes ?? null,
        );
        const proc = suggestions[0] ?? "";
        if (proc) {
          setProcedureType((prev) => (procedureTouched && prev.trim() ? prev : proc));
        }
      }

      setOpportunities((prev) => {
        const map = new Map(prev.map((o) => [o.id, o]));
        for (const o of ctx.opportunities) {
          map.set(o.id, {
            id: o.id,
            account_id: o.account_id ?? null,
            account_name: o.account_name ?? null,
            physician_name: o.physician_name ?? null,
            product_display: o.product_display ?? null,
            product_line: o.product_line ?? null,
          });
        }
        return [...map.values()];
      });

    },
    [isPlanningMode, opportunityLocked, procedureTouched],
  );

  const loadProviderContext = React.useCallback(
    async (providerId: string) => {
      if (!providerId) {
        setProviderContext(null);
        return;
      }
      setProviderContextBusy(true);
      try {
        const res = await fetch(`/api/portal/sales/providers/${encodeURIComponent(providerId)}`, { cache: "no-store" });
        const j = await readResponseJson<
          { ok?: boolean; error?: string; cases?: Array<{ procedure_type?: string | null }> } & Partial<NewCaseProviderContext>
        >(res);
        if (!res.ok || !j.ok || !j.planning_completion || !j.provider) {
          setProviderContext(null);
          return;
        }
        applyProviderContext({
          provider: j.provider,
          specialty: j.specialty ?? null,
          primary_organization: j.primary_organization ?? { id: "", name: null, territory: null },
          organization_links: j.organization_links ?? [],
          planning_completion: j.planning_completion,
          priorCaseProcedureTypes: priorCaseProcedureTypesFromRows(j.cases),
          opportunities: j.opportunities ?? [],
        });
      } catch {
        setProviderContext(null);
      } finally {
        setProviderContextBusy(false);
      }
    },
    [applyProviderContext],
  );
  const loadProviderContextRef = React.useRef(loadProviderContext);
  loadProviderContextRef.current = loadProviderContext;
  const planningCaseHydratedRef = React.useRef(false);
  React.useEffect(() => {
    planningCaseHydratedRef.current = false;
  }, [planningCaseId]);

  React.useEffect(() => {
    if (!isPlanningMode || !planningCaseId?.trim()) return;
    if (planningCaseHydratedRef.current) return;
    let cancelled = false;
    void (async () => {
      setLoadBusy(true);
      setErr(null);
      try {
        const res = await fetch(`/api/portal/sales/surgical-cases/${encodeURIComponent(planningCaseId)}`, {
          cache: "no-store",
        });
        const j = await readResponseJson<{
          ok?: boolean;
          case?: Record<string, unknown>;
          error?: string;
        }>(res);
        if (cancelled) return;
        if (!res.ok || !j.ok || !j.case) {
          throw new Error(typeof j.error === "string" ? j.error : "Could not load case for planning.");
        }
        const row = j.case;
        const loadedCaseType = row.case_type === "observation" ? "observation" : "product_support";
        setCaseType(loadedCaseType);
        setAccountId(String(row.account_id ?? ""));
        setSurgeonId(String(row.surgeon_contact_id ?? ""));
        setCaseDate(String(row.case_date ?? ""));
        setCaseTime(String(row.case_time ?? ""));
        setProcedureType(String(row.procedure_type ?? ""));
        setProcedureTouched(true);
        setNotes(String(row.notes ?? ""));
        setFollowUpNeeded(Boolean(row.follow_up_needed));
        setRelatedOpportunityId(String(row.related_opportunity_id ?? ""));
        setObservationObjectives(observationObjectivesFromCaseRow(row));
        setObservationAccess(observationAccessFromCaseRow(row));
        setSupportRepRole(String(row.case_support_coverage ?? "").trim());
        setSupportRequiredMaterials(String(row.case_product_needs ?? "").trim());
        setSupportObjective(String(row.procedure_type ?? "").trim());
        setDraftCaseId(planningCaseId);
        planningCaseHydratedRef.current = true;
        const surgeon = String(row.surgeon_contact_id ?? "").trim();
        if (surgeon) void loadProviderContextRef.current(surgeon);
      } catch (e: unknown) {
        if (!cancelled) setErr(userFacingError(e, "Could not load case."));
      } finally {
        if (!cancelled) setLoadBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isPlanningMode, planningCaseId]);

  const handleObservationProviderChange = React.useCallback(
    (id: string) => {
      setSurgeonId(id);
      setProviderContext(null);
      if (!id) return;
      void loadProviderContext(id);
    },
    [loadProviderContext],
  );

  React.useEffect(() => {
    if (!lockedEngagementId) return;
    let cancelled = false;
    void (async () => {
      setEngagementPrefillErr(null);
      try {
        const res = await fetch(
          `/api/portal/sales/engagements/${encodeURIComponent(lockedEngagementId)}/case-prefill`,
          { cache: "no-store" },
        );
        const j = await readResponseJson<{ ok?: boolean; prefill?: EngagementCasePrefillPayload; error?: string }>(res);
        if (cancelled) return;
        if (!res.ok || !j.ok || !j.prefill) {
          throw new Error(typeof j.error === "string" ? j.error : "Could not load engagement.");
        }
        if (j.prefill.has_linked_case && j.prefill.linked_case_id) {
          router.replace(`/portal/sales/cases/${encodeURIComponent(j.prefill.linked_case_id)}`);
          return;
        }
        setEngagementPrefill(j.prefill);
      } catch (e: unknown) {
        if (!cancelled) {
          setEngagementPrefillErr(userFacingError(e, "Could not load engagement."));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [lockedEngagementId, router]);

  React.useEffect(() => {
    if (!engagementPrefill || appliedEngagementPrefill.current || loadBusy) return;
    appliedEngagementPrefill.current = true;
    setCaseType(engagementPrefill.suggested_case_type);
    setSurgeonId(engagementPrefill.provider_id);
    void loadProviderContext(engagementPrefill.provider_id);
    if (engagementPrefill.organization_id) {
      setAccountId(engagementPrefill.organization_id);
    }
    if (engagementPrefill.opportunity_id) {
      setRelatedOpportunityId(engagementPrefill.opportunity_id);
    }
    if (engagementPrefill.suggested_case_date) {
      setCaseDate(engagementPrefill.suggested_case_date);
    }
    if (engagementPrefill.suggested_notes) {
      setNotes(engagementPrefill.suggested_notes);
    }
  }, [engagementPrefill, loadBusy, loadProviderContext]);

  const launchCaseType = React.useMemo(() => {
    const raw = (searchParams.get("case_type") || "").trim();
    if (raw === "observation" || raw === "product_support") return raw;
    return null;
  }, [searchParams]);

  React.useEffect(() => {
    if (loadBusy || engagementLocked || isPlanningMode) return;
    if (launchCaseType === "observation") setCaseType("observation");
    if (launchCaseType === "product_support") selectCaseType("product_support");
  }, [engagementLocked, isPlanningMode, launchCaseType, loadBusy, selectCaseType]);

  React.useEffect(() => {
    if (loadBusy || engagementLocked || isPlanningMode) return;
    if (!launchSurgeonContactId || appliedQuerySurgeon.current) return;
    appliedQuerySurgeon.current = true;
    setSurgeonId(launchSurgeonContactId);
    void loadProviderContext(launchSurgeonContactId);
  }, [engagementLocked, isPlanningMode, launchSurgeonContactId, loadBusy, loadProviderContext]);

  const handleUnlockProviderPicker = React.useCallback((options?: { clearSelection?: boolean }) => {
    setProviderPickerUnlocked(true);
    if (options?.clearSelection) {
      setSurgeonId("");
      setProviderContext(null);
      setProviderSearchQuery("");
    }
  }, []);

  React.useEffect(() => {
    if (caseType !== "observation" || showCompactProviderContext) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      setProviderSearchBusy(true);
      void (async () => {
        try {
          const u = new URL("/api/portal/sales/providers", window.location.origin);
          const q = providerSearchQuery.trim();
          if (q) u.searchParams.set("q", q);
          const res = await fetch(u.toString(), { cache: "no-store" });
          const j = await readResponseJson<{ ok?: boolean; providers?: ProviderDirectoryRow[] }>(res);
          if (!cancelled) setProviderSearchResults(j.ok && j.providers ? j.providers : []);
        } catch {
          if (!cancelled) setProviderSearchResults([]);
        } finally {
          if (!cancelled) setProviderSearchBusy(false);
        }
      })();
    }, 280);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [caseType, providerSearchQuery, showCompactProviderContext]);

  const providerPickOptions = React.useMemo((): ProviderPickOption[] => {
    const byId = new Map<string, ProviderPickOption>();
    for (const p of providerSearchResults) {
      byId.set(p.id, {
        id: p.id,
        label: contactDisplayName(p),
        subtitle: String(p.primary_organization_name || p.specialty || "").trim() || undefined,
      });
    }
    if (surgeonId && providerContext) {
      byId.set(surgeonId, {
        id: surgeonId,
        label: contactDisplayName(providerContext.provider as ContactRow),
        subtitle:
          String(providerContext.primary_organization?.name || providerContext.specialty || "").trim() || undefined,
      });
    } else if (surgeonId) {
      const hit = providerSearchResults.find((p) => p.id === surgeonId);
      if (hit) {
        byId.set(surgeonId, {
          id: surgeonId,
          label: contactDisplayName(hit),
          subtitle: String(hit.primary_organization_name || hit.specialty || "").trim() || undefined,
        });
      }
    }
    return [...byId.values()].sort((a, b) => a.label.localeCompare(b.label));
  }, [providerSearchResults, surgeonId, providerContext]);

  const observationOrgAccounts = React.useMemo(() => {
    if (!providerContext) return accounts;
    const ids = new Set<string>();
    const primaryId = String(providerContext.primary_organization?.id || "").trim();
    if (primaryId) ids.add(primaryId);
    for (const link of providerContext.organization_links) {
      const aid = String(link.account_id || link.accounts?.id || "").trim();
      if (aid) ids.add(aid);
    }
    if (ids.size === 0) return accounts;
    const linked = accounts.filter((a) => ids.has(a.id));
    return linked.length > 0 ? linked : accounts;
  }, [accounts, providerContext]);

  const createProviderHref = React.useMemo(() => {
    const returnTo = "/portal/sales/cases/new?case_type=observation";
    const u = new URL("/portal/sales/providers/new", "http://local");
    u.searchParams.set("return_to", returnTo);
    if (accountId) u.searchParams.set("account_id", accountId);
    return `${u.pathname}${u.search}`;
  }, [accountId]);
  const selectedSku = displaySkus.find((s) => s.id === skuId)?.sku || "—";
  const selectedProductName = products.find((p) => p.id === productId)?.name ?? null;

  const planningContext = React.useMemo(() => resolveOperationalPlanningContext(caseType), [caseType]);
  const pathwayContext = planningContext;

  const operationalReadiness = React.useMemo(
    () =>
      buildNewCaseOperationalReadiness({
        caseType,
        surgeonId: effectiveSurgeonId,
        accountId,
        relatedOpportunityId,
        caseDate,
        caseTime,
        procedureType,
        needsProducts,
        productId,
        skuId,
        expectedQty,
        expectedRevenue,
        extraLines,
        productName: selectedProductName,
        skuLabel: selectedSku !== "—" ? selectedSku : null,
        draftCaseId,
        observationProductExpanded: showProductsForObservation,
        observationObjectives,
        observationSchedulingOwner: observationAccess.scheduling_owner,
        observationAccessPathway: observationAccess.access_pathway,
        observationCredentialingRequirement: observationAccess.credentialing_requirement,
        providerContact:
          effectiveSurgeonId && providerContext?.provider
            ? (providerContext.provider as Record<string, unknown>)
            : null,
        supportSetupProcedure: caseType === "product_support" ? procedureType : "",
        supportObjective,
        supportRepRole,
        supportRequiredMaterials,
        followUpNeeded,
      }),
    [
      accountId,
      caseDate,
      caseTime,
      caseType,
      draftCaseId,
      followUpNeeded,
      needsProducts,
      observationAccess.access_pathway,
      observationAccess.credentialing_requirement,
      observationAccess.scheduling_owner,
      showProductsForObservation,
      observationObjectives,
      procedureType,
      expectedQty,
      expectedRevenue,
      extraLines,
      productId,
      providerContext?.provider,
      relatedOpportunityId,
      selectedProductName,
      selectedSku,
      skuId,
      effectiveSurgeonId,
      supportObjective,
      supportRepRole,
      supportRequiredMaterials,
    ],
  );
  const saveBlockers = operationalReadiness.saveBlockers;
  const nextFieldHighlight = React.useMemo(
    () =>
      caseType === "observation" ? resolveMissionNextFieldHighlight(operationalReadiness.nextAction) : null,
    [caseType, operationalReadiness.nextAction],
  );
  const [dismissedNextFieldHighlight, setDismissedNextFieldHighlight] = React.useState<MissionNextFieldKey | null>(
    null,
  );
  React.useEffect(() => {
    setDismissedNextFieldHighlight(null);
  }, [nextFieldHighlight]);
  const showNextFieldHighlight = React.useCallback(
    (field: MissionNextFieldKey) => nextFieldHighlight === field && dismissedNextFieldHighlight !== field,
    [dismissedNextFieldHighlight, nextFieldHighlight],
  );
  const dismissNextFieldHighlight = React.useCallback((field: MissionNextFieldKey) => {
    setDismissedNextFieldHighlight(field);
  }, []);
  const nextFieldLabelProps = React.useCallback(
    (field: MissionNextFieldKey) => ({
      className: missionNextFieldLabelClass(showNextFieldHighlight(field)),
      ...(showNextFieldHighlight(field) ? { "data-next-field-highlight": field } : {}),
    }),
    [showNextFieldHighlight],
  );
  const missionSetupComplete = Boolean(
    caseType === "observation" &&
      effectiveSurgeonId.trim() &&
      accountId.trim() &&
      caseDate.trim() &&
      procedureType.trim(),
  );
  const accessReadinessComplete = Boolean(
    missionSetupComplete &&
      observationAccess.scheduling_owner.trim() &&
      observationAccess.access_pathway !== "Unknown" &&
      observationAccess.credentialing_requirement !== "unknown",
  );
  const observationGoalsComplete = Boolean(
    observationObjectives.observation_goal.trim() ||
      observationObjectives.observation_key_questions.trim() ||
      observationObjectives.observation_signals_to_validate.trim(),
  );
  const optionalPlanningSummary = React.useMemo(
    () =>
      buildOptionalPlanningSummary({
        productInterestSelected: Boolean(showProductsForObservation && productId.trim() && skuId.trim()),
        initiativeLinked: Boolean(relatedOpportunityId.trim()),
        notesAdded: Boolean(notes.trim() || followUpNeeded),
      }),
    [followUpNeeded, notes, productId, relatedOpportunityId, showProductsForObservation, skuId],
  );
  const maxUnlockedObservationStep = !missionSetupComplete ? 0 : observationGoalsComplete ? 3 : 2;
  const supportSetupCompleteFlag = isSupportSetupComplete({
    accountId,
    caseDate,
    setupProcedure: procedureType,
  });
  const supportProductInventoryComplete = isProductInventoryComplete({
    productId,
    skuId,
    expectedQty,
  });
  const supportCasePlanComplete = isCaseSupportPlanComplete({
    supportObjective,
    supportRepRole,
    supportRequiredMaterials,
  });
  const maxUnlockedSupportMissionStep = !supportSetupCompleteFlag
    ? 0
    : !supportProductInventoryComplete
      ? 1
      : !supportCasePlanComplete
        ? 2
        : 3;
  const maxUnlockedMissionStep =
    caseType === "observation" ? maxUnlockedObservationStep : maxUnlockedSupportMissionStep;
  const [activeMissionStep, setActiveMissionStep] = React.useState(0);
  const [editingMissionStep, setEditingMissionStep] = React.useState<number | null>(null);
  const missionStepRefs = React.useMemo(
    () => [React.createRef<HTMLElement>(), React.createRef<HTMLElement>(), React.createRef<HTMLElement>(), React.createRef<HTMLElement>()],
    [],
  );
  const goToMissionStep = React.useCallback(
    (index: number) => {
      const targetIndex = Math.min(Math.max(index, 0), maxUnlockedMissionStep);
      setActiveMissionStep(targetIndex);
      window.setTimeout(() => {
        const el = missionStepRefs[targetIndex]?.current;
        if (el && typeof el.scrollIntoView === "function") {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 0);
    },
    [caseType, maxUnlockedMissionStep, missionStepRefs],
  );
  const resolveMissionNextStep = React.useCallback(() => {
    const phaseIndex = operationalReadiness.missionControl.resolvePhaseIndex;
    goToMissionStep(phaseIndex);
  }, [goToMissionStep, operationalReadiness.missionControl.resolvePhaseIndex]);
  const handleMissionStepFocus = React.useCallback((index: number) => {
    setEditingMissionStep(index);
  }, []);
  const handleMissionStepBlur = React.useCallback(
    (index: number) => {
      window.setTimeout(() => {
        const section = missionStepRefs[index]?.current;
        if (!section) return;
        const activeEl = document.activeElement;
        if (activeEl && section.contains(activeEl)) return;
        setEditingMissionStep((prev) => (prev === index ? null : prev));
      }, 0);
    },
    [missionStepRefs],
  );
  const missionSetupSummary = missionSetupComplete
    ? `${contactDisplayName(providerContext?.provider || selectedSurgeon || { first_name: "", last_name: "", id: "" })} · ${
        selectedOrgName || "No facility"
      } · ${formatMissionDate(caseDate)} · ${procedureType.trim() || "Procedure pending"}`
    : "Provider, facility, date, and procedure needed";
  const accessNotStarted = Boolean(
    !observationAccess.scheduling_owner.trim() &&
      observationAccess.access_pathway === "Unknown" &&
      observationAccess.credentialing_requirement === "unknown" &&
      !observationAccess.vendor_restrictions.trim() &&
      !observationAccess.preferred_timing.trim(),
  );
  const credentialingSummary =
    observationAccess.credentialing_requirement === "verified"
      ? "Credentialing verified"
      : observationAccess.credentialing_requirement === "not_required"
        ? "Credentialing not required"
        : "Credentialing captured";
  const accessSummary = accessReadinessComplete
    ? `Scheduling owner known · Access pathway documented · ${credentialingSummary}`
    : accessNotStarted
      ? "Scheduling and credentialing picture still forming"
      : "Access details captured — field picture still developing";
  const goalsNotStarted = Boolean(
    !observationObjectives.observation_goal.trim() &&
      !observationObjectives.observation_key_questions.trim() &&
      !observationObjectives.observation_signals_to_validate.trim(),
  );
  const objectiveCount = Math.max(
    1,
    countDelimitedItems(observationObjectives.observation_goal) + countDelimitedItems(observationObjectives.observation_key_questions),
  );
  const unresolvedSignalCount = Math.max(
    observationValidationTargetHints.length,
    countDelimitedItems(observationObjectives.observation_signals_to_validate),
  );
  const goalsSummary = !accessReadinessComplete
    ? "Observation goals can be added while operational details continue evolving"
    : observationGoalsComplete
      ? `${objectiveCount} objective planned · ${unresolvedSignalCount} unresolved signals carried forward`
      : goalsNotStarted
        ? "Still developing"
        : "Objective details in progress";
  const optionalPlanningActive = Boolean(showProductsForObservation || relatedOpportunityId || notes.trim() || followUpNeeded);
  const missionChecklistItems = [
    {
      key: "setup",
      title: "Mission setup",
      status: missionSetupComplete ? "complete" : effectiveSurgeonId || accountId || procedureType ? "attention" : "not-started",
      icon: missionSetupComplete ? "✓" : effectiveSurgeonId || accountId || procedureType ? "!" : "○",
      summary: missionSetupSummary,
      stepIndex: 0,
    },
    {
      key: "access",
      title: "Access readiness",
      status: accessReadinessComplete ? "complete" : accessNotStarted ? "not-started" : "attention",
      icon: accessReadinessComplete ? "✓" : accessNotStarted ? "○" : "⚠",
      summary: accessSummary,
      stepIndex: 1,
    },
    {
      key: "goals",
      title: "Observation goals",
      status: observationGoalsComplete ? "complete" : goalsNotStarted ? "not-started" : "attention",
      icon: observationGoalsComplete ? "✓" : goalsNotStarted ? "○" : "!",
      summary: goalsSummary,
      stepIndex: 2,
    },
    {
      key: "planning",
      title: "Optional planning",
      status: optionalPlanningActive ? "complete" : "not-started",
      icon: optionalPlanningActive ? "✓" : "—",
      summary: optionalPlanningSummary,
      stepIndex: 3,
    },
  ] as const;

  const supportOptionalPlanningSummary = React.useMemo(
    () =>
      buildProductSupportOptionalPlanningSummary({
        initiativeLinked: Boolean(relatedOpportunityId.trim()),
        notesAdded: Boolean(notes.trim()),
      }),
    [notes, relatedOpportunityId],
  );
  const supportOptionalPlanningActive = Boolean(relatedOpportunityId.trim() || notes.trim());
  const supportChecklistItems = [
    {
      key: "setup",
      title: "Support setup",
      status: supportSetupCompleteFlag ? "complete" : accountId || caseDate || procedureType ? "attention" : "not-started",
      icon: supportSetupCompleteFlag ? "✓" : accountId || caseDate || procedureType ? "!" : "○",
      summary: buildSupportSetupSummary({
        accountName: selectedOrgName,
        surgeonName: selectedSurgeon ? contactDisplayName(selectedSurgeon) : "",
        caseDate: formatMissionDate(caseDate),
        setupProcedure: procedureType,
        complete: supportSetupCompleteFlag,
      }),
      stepIndex: 0,
    },
    {
      key: "inventory",
      title: "Product & inventory",
      status: supportProductInventoryComplete ? "complete" : productId || skuId ? "attention" : "not-started",
      icon: supportProductInventoryComplete ? "✓" : productId || skuId ? "!" : "○",
      summary: buildProductInventorySummary({
        productLabel: selectedProductName,
        skuLabel: selectedSku,
        expectedQty,
        complete: supportProductInventoryComplete,
      }),
      stepIndex: 1,
    },
    {
      key: "plan",
      title: "Case support plan",
      status: supportCasePlanComplete ? "complete" : supportObjective || supportRepRole ? "attention" : "not-started",
      icon: supportCasePlanComplete ? "✓" : supportObjective || supportRepRole ? "!" : "○",
      summary: buildCaseSupportPlanSummary({
        supportObjective,
        supportRepRole,
        followUpNeeded,
        complete: supportCasePlanComplete,
      }),
      stepIndex: 2,
    },
    {
      key: "planning",
      title: "Optional planning",
      status: supportOptionalPlanningActive ? "complete" : "not-started",
      icon: supportOptionalPlanningActive ? "✓" : "—",
      summary: supportOptionalPlanningSummary,
      stepIndex: 3,
    },
  ] as const;

  React.useEffect(() => {
    setActiveMissionStep(0);
  }, [caseType]);

  React.useEffect(() => {
    setActiveMissionStep((prev) => Math.min(prev, maxUnlockedMissionStep));
  }, [caseType, maxUnlockedMissionStep]);

  React.useEffect(() => {
    if (editingMissionStep !== null) return;
    if (caseType === "observation") {
      setActiveMissionStep((prev) => {
        if (prev === 0 && missionSetupComplete) return 1;
        if (prev === 1 && accessReadinessComplete) return 2;
        return prev;
      });
      return;
    }
    setActiveMissionStep((prev) => {
      if (prev === 0 && supportSetupCompleteFlag) return 1;
      if (prev === 1 && supportProductInventoryComplete) return 2;
      return prev;
    });
  }, [
    accessReadinessComplete,
    caseType,
    editingMissionStep,
    missionSetupComplete,
    supportProductInventoryComplete,
    supportSetupCompleteFlag,
  ]);

  const applyCaseTemplate = React.useCallback(
    (key: string) => {
      setTemplateKey(key);
      if (!key) {
        setExtraLines([]);
        return;
      }
      const t = caseTemplates.find((x) => x.id === key);
      if (!t?.lines.length) return;
      const [first, ...rest] = t.lines;
      setProcedureTouched(true);
      setProcedureType(t.procedure_type);
      setProductId(first.product_id);
      setSkuId(first.sku_id);
      setExpectedQty(String(first.expected_quantity));
      setQtyTouched(true);
      setExtraLines(
        rest.map((ln) => ({
          key: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          product_id: ln.product_id,
          sku_id: ln.sku_id,
          expected_quantity: String(ln.expected_quantity),
        }))
      );
    },
    [caseTemplates]
  );

  const openModal = () => {
    if (!accountId) {
      setErr("Select an organization before adding a contact.");
      return;
    }
    setCErr(null);
    setModalOpen(true);
  };

  const saveContact = async () => {
    if (!accountId) return;
    setCBusy(true);
    setCErr(null);
    try {
      const res = await fetch(`/api/portal/sales/surgical-accounts/${encodeURIComponent(accountId)}/contacts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: cFirst.trim() || null,
          last_name: cLast.trim() || null,
          email: cEmail.trim() || null,
          role_type: "surgeon",
        }),
      });
      const j = await readResponseJson<{ ok?: boolean; contact?: ContactRow; error?: unknown }>(res);
      if (!j.ok) throw new Error(typeof j.error === "string" ? j.error : "Could not save contact");
      const c = j.contact;
      if (c) {
        setContacts((prev) => [c, ...prev]);
        setSurgeonId(c.id);
      }
      setModalOpen(false);
      setCFirst("");
      setCLast("");
      setCEmail("");
    } catch (e: unknown) {
      setCErr(userFacingError(e, "We could not save your changes. Please try again."));
    } finally {
      setCBusy(false);
    }
  };

  const buildCaseRequestBody = React.useCallback(
    (status: "draft" | "scheduled" | "completed") =>
      buildNewCaseCreatePayload({
        caseType,
        engagementLocked,
        lockedEngagementId,
        accountId,
        surgeonId: effectiveSurgeonId,
        caseDate,
        caseTime,
        procedureType,
        needsProducts,
        productId,
        skuId,
        expectedQty,
        expectedRevenue,
        extraLines,
        notes,
        followUpNeeded,
        relatedOpportunityId,
        observationObjectives,
        observationAccess,
        observationValidationTargetHints,
        supportSetupProcedure: procedureType,
        supportObjective,
        supportRepRole,
        supportRequiredMaterials,
        status,
      }),
    [
      accountId,
      caseDate,
      caseTime,
      caseType,
      effectiveSurgeonId,
      expectedQty,
      expectedRevenue,
      extraLines,
      followUpNeeded,
      needsProducts,
      notes,
      procedureType,
      productId,
      engagementLocked,
      lockedEngagementId,
      observationObjectives,
      observationAccess,
      observationValidationTargetHints,
      relatedOpportunityId,
      skuId,
      supportObjective,
      supportRepRole,
      supportRequiredMaterials,
    ],
  );

  const persistCase = React.useCallback(
    async (status: "draft" | "scheduled" | "completed", options?: { stayOnPage?: boolean }) => {
      const body = buildCaseRequestBody(status);
      type CaseResponse = {
        ok?: boolean;
        case?: { id: string };
        error?: unknown;
        warnings?: string[];
      };

      const res = draftCaseId
        ? await fetch(`/api/portal/sales/surgical-cases/${encodeURIComponent(draftCaseId)}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          })
        : await fetch("/api/portal/sales/surgical-cases", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });

      const j = await readResponseJson<CaseResponse>(res);
      if (!res.ok || !j.ok) {
        const msg =
          typeof j.error === "string"
            ? j.error
            : j.error && typeof j.error === "object" && "formErrors" in (j.error as object)
              ? "Some required details are missing. Check the highlighted fields and try again."
              : "We could not save this case. Please try again.";
        throw new Error(msg);
      }

      const savedId = j.case?.id ?? draftCaseId;
      if (!savedId) throw new Error("We could not save this case. Please try again.");

      if (portalUserId) {
        try {
          localStorage.setItem(lsLastAccountKey(portalUserId), accountId);
          if (productId) localStorage.setItem(lsLastProductKey(portalUserId), productId);
          if (surgeonId) localStorage.setItem(lsLastSurgeonKey(portalUserId, accountId), surgeonId);
        } catch {
          /* ignore */
        }
      }

      const warns = j.warnings?.filter((x) => typeof x === "string") ?? [];
      if (warns.length) {
        try {
          sessionStorage.setItem(`surgical-case-warnings:${savedId}`, JSON.stringify(warns));
        } catch {
          /* ignore */
        }
      }

      if (options?.stayOnPage) {
        setDraftCaseId(savedId);
        return savedId;
      }

      if (isPlanningMode) {
        router.push(`/portal/sales/cases/${encodeURIComponent(savedId)}`);
        return savedId;
      }

      const newId = encodeURIComponent(savedId);
      const org = String(accountId || "").trim();
      const uuidOk = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(org);
      if (uuidOk) {
        router.push(`/portal/sales/accounts/${org}?tab=cases&highlight_case=${newId}`);
      } else {
        router.push(`/portal/sales/cases/${newId}`);
      }
      return savedId;
    },
    [accountId, buildCaseRequestBody, draftCaseId, isPlanningMode, portalUserId, productId, router, surgeonId],
  );

  const runCreate = async () => {
    setBusy(true);
    try {
      await persistCase(resolveNewCaseFinalSaveStatus(caseDate));
    } catch (e: unknown) {
      phiAckRef.current = false;
      setErr(userFacingError(e, "We could not create that record. Please try again."));
    } finally {
      setBusy(false);
    }
  };

  const saveDraft = async () => {
    setErr(null);
    const validation = validateNewCaseDraft({
      accountId,
      notes,
      phiAcknowledged: phiAckRef.current,
    });
    if (!validation.ok) {
      if (validation.error === "PHI_ACK_REQUIRED") {
        setPhiModal({ kinds: detectSurgicalPhiPatternKinds(notes) });
        return;
      }
      setSaveGuidanceVisible(true);
      return;
    }

    setDraftSaving(true);
    try {
      await persistCase("draft", { stayOnPage: true });
      setDraftSavedFlash(true);
      window.setTimeout(() => setDraftSavedFlash(false), 4000);
    } catch (e: unknown) {
      phiAckRef.current = false;
      setErr(userFacingError(e, "We could not save this draft. Please try again."));
    } finally {
      setDraftSaving(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setSaveGuidanceVisible(true);
    if (!operationalReadiness.caseReadiness.canSaveFinal) return;

    const validation = validateNewCaseSubmit({
      ...saveValidationInput,
      phiAcknowledged: phiAckRef.current,
    });

    if (!validation.ok) {
      if (validation.error === "PHI_ACK_REQUIRED") {
        setPhiModal({ kinds: detectSurgicalPhiPatternKinds(notes) });
        return;
      }
      return;
    }

    await runCreate();
  };

  return (
    <SalesCommandPage
      nativeLayout
      omitBuiltInHeader
      title={isPlanningMode ? planningContext.pageTitle : "New Surgical Case"}
      subtitle={
        isPlanningMode
          ? planningContext.pageSubtitle
          : engagementLocked
            ? "Create a surgical case from this engagement. Planning stays on the engagement."
            : "Create an observation or product support case without entering PHI."
      }
      actions={null}
    >
      <style
        dangerouslySetInnerHTML={{
          __html: `${surgicalCaseModalActionsCss}\n${newCaseLayoutCss}\n${newCaseOperationalReadinessCss}`,
        }}
      />
      {loadBusy ? <div style={{ color: "var(--muted)" }}>Loading…</div> : null}
      {err || engagementPrefillErr ? (
        <div role="alert" style={sc.alertError}>
          {err || engagementPrefillErr}
        </div>
      ) : null}

      {engagementPrefill ? (
        <div
          role="status"
          style={{
            border: "1px solid color-mix(in srgb, var(--brand-600) 22%, var(--border))",
            background: "color-mix(in srgb, var(--brand-600) 6%, var(--surface))",
            borderRadius: 10,
            padding: "7px 9px",
            fontSize: 12,
            lineHeight: 1.45,
            margin: "0 10px",
          }}
        >
          <strong>From engagement:</strong> {engagementPrefill.title || engagementPrefill.engagement_type_label}
          {!showCompactProviderContext ? (
            <>
              {" · "}
              Provider {engagementPrefill.provider_name}
              {engagementPrefill.organization_name ? ` · ${engagementPrefill.organization_name}` : ""}
            </>
          ) : null}
          <br />
          Engagement plan: {engagementPrefill.pre_call.filled}/{engagementPrefill.pre_call.total}
          {engagementPrefill.pre_call.complete ? " (complete)" : ""}. This case covers setup, live observation,
          products used, debrief, and follow-up.{" "}
          <Link
            href={`/portal/sales/engagements/${encodeURIComponent(engagementPrefill.engagement_id)}`}
            style={sc.linkBrand}
          >
            View engagement →
          </Link>
        </div>
      ) : null}

      <header className="create-case-header">
        <div className="create-case-header-nav">
          <PortalMobileMenuButton className="sales-cmd-mobile-menu" />
          <Link
            href={isPlanningMode && planningCaseId ? `/portal/sales/cases/${encodeURIComponent(planningCaseId)}` : "/portal/sales/cases"}
            className="create-case-back"
          >
            {isPlanningMode ? "← Back to case" : "← Back to Cases"}
          </Link>
        </div>
        <h1 className="create-case-title">{isPlanningMode ? planningContext.pageTitle : "New surgical case"}</h1>
        <p className="create-case-subtitle">
          {isPlanningMode
            ? planningContext.pageSubtitle
            : engagementLocked
              ? "Create a surgical case from this engagement. Planning stays on the engagement."
              : "Create an observation or product support case without entering PHI."}
        </p>
        <div className="new-case-pathway-context" aria-live="polite">
          <p className="new-case-pathway-stage">
            <span className="new-case-pathway-label">Pathway stage:</span>
            <span className="new-case-pathway-value">{pathwayContext.stageText}</span>
            {pathwayContext.phaseText ? (
              <>
                <span className="new-case-pathway-sep" aria-hidden="true">
                  ·
                </span>
                <span className="new-case-pathway-phase">{pathwayContext.phaseText}</span>
              </>
            ) : null}
          </p>
          <p className="new-case-pathway-mission">{pathwayContext.missionText}</p>
        </div>
      </header>
      <div className="create-case-native-root">
        <div className="new-case-layout">
          <form onSubmit={submit} className="new-case-form">
            <p className="new-case-phi-banner" role="status" aria-label={NEW_SURGICAL_CASE_PHI_BANNER.full}>
              <span className="new-case-phi-banner-label">{NEW_SURGICAL_CASE_PHI_BANNER.label}</span>
              {NEW_SURGICAL_CASE_PHI_BANNER.detail}
            </p>

            <NewCaseOperationalReadinessPanel
              view={operationalReadiness}
              variant="mobile"
              onResolveNextStep={resolveMissionNextStep}
            />

            {caseType === "observation" ? (
              <div className="new-case-mission-workflow">
                <section className="new-case-mission-checklist" aria-label="Mission checklist">
                  {missionChecklistItems.map((item) => (
                    <button
                      type="button"
                      key={item.key}
                      className={`new-case-mission-checklist-item status-${item.status}`}
                      onClick={() => goToMissionStep(item.stepIndex)}
                    >
                      <div className="new-case-mission-checklist-head">
                        <span className="new-case-mission-checklist-title">{item.title}</span>
                        <span className="new-case-mission-checklist-icon" aria-hidden>
                          {item.icon}
                        </span>
                      </div>
                      <span className="new-case-mission-checklist-summary">{item.summary}</span>
                    </button>
                  ))}
                </section>
                <MissionStep
                  step={1}
                  title="Mission Setup"
                  isActive={activeMissionStep === 0}
                  isComplete={missionSetupComplete}
                  isLocked={false}
                  onActivate={() => goToMissionStep(0)}
                  sectionRef={missionStepRefs[0]}
                  onFocusWithin={() => handleMissionStepFocus(0)}
                  onBlurWithin={() => handleMissionStepBlur(0)}
                  summary={
                    missionSetupComplete
                      ? `${contactDisplayName(providerContext?.provider || selectedSurgeon || { first_name: "", last_name: "", id: "" })} · ${selectedOrgName || "No facility"} · ${formatMissionDate(caseDate)} · ${procedureType || "No procedure"}`
                      : "Set case type, provider context, facility, date, and procedure"
                  }
                >
                  <section className="new-case-section">
                    <h3 className="new-case-title">Case Type</h3>
                    <NewCaseTypeSelector caseType={caseType} onSelect={selectCaseType} />
                  </section>
                  {showCompactProviderContext ? (
                    <NewCaseProviderContextCard
                      surgeonId={effectiveSurgeonId}
                      providerContext={providerContext}
                      providerContextBusy={providerContextBusy}
                      onChangeProvider={() => handleUnlockProviderPicker({ clearSelection: true })}
                      onAddDifferentProvider={() => handleUnlockProviderPicker()}
                    />
                  ) : (
                    <NewCaseProviderPanel
                      surgeonId={surgeonId}
                      providerSearchQuery={providerSearchQuery}
                      onProviderSearchQueryChange={setProviderSearchQuery}
                      providerPickOptions={providerPickOptions}
                      providerSearchBusy={providerSearchBusy}
                      onProviderChange={handleObservationProviderChange}
                      providerContext={providerContext}
                      providerContextBusy={providerContextBusy}
                      createProviderHref={createProviderHref}
                      hideIntelligencePreview={false}
                    />
                  )}
                  <section className="new-case-section">
                    <h3 className="new-case-title">Organization / facility</h3>
                    {opportunityLocked || (engagementLocked && engagementPrefill?.organization_id) ? (
                      <LockedCaseField
                        label="Organization"
                        value={engagementPrefill?.organization_name || lockedOrganizationLabel}
                        hint={engagementLocked ? "Set from the linked engagement." : OPPORTUNITY_UI.newCaseLockedOrgFromInitiative}
                      />
                    ) : (
                      <label style={{ display: "grid", gap: 6 }}>
                        <span style={{ fontWeight: 700, fontSize: 12 }}>
                          Organization <span style={{ color: "var(--brand-600)" }}>*</span>
                        </span>
                        <select
                          required
                          value={accountId}
                          onChange={(e) => setAccountId(e.target.value)}
                          disabled={!surgeonId}
                          style={sc.input}
                        >
                          <option value="">{surgeonId ? "Select organization…" : "Select a provider first…"}</option>
                          {observationOrgAccounts.map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.name || a.id}
                            </option>
                          ))}
                        </select>
                        {surgeonId && providerContext && observationOrgAccounts.length > 0 ? (
                          <span style={{ fontSize: 11, color: "var(--muted)", lineHeight: 1.35 }}>
                            Showing organizations linked to this provider. Primary org is selected when available.
                          </span>
                        ) : null}
                      </label>
                    )}
                  </section>
                  <section className="new-case-section">
                    <h3 className="new-case-title">Case date</h3>
                    <div className="new-case-fields-2">
                      <label style={{ display: "grid", gap: 6 }}>
                        <span style={{ fontWeight: 700, fontSize: 12 }}>Case date</span>
                        <input required type="date" value={caseDate} onChange={(e) => setCaseDate(e.target.value)} style={sc.input} />
                      </label>
                      <label style={{ display: "grid", gap: 6 }}>
                        <span style={{ fontWeight: 700, fontSize: 12 }}>Case time (optional)</span>
                        <input type="time" value={caseTime} onChange={(e) => setCaseTime(e.target.value)} style={sc.input} />
                      </label>
                    </div>
                  </section>
                  <section className="new-case-section">
                    <h3 className="new-case-title">Procedure</h3>
                    <label style={{ display: "grid", gap: 6 }}>
                      <span style={{ fontWeight: 700, fontSize: 12 }}>Procedure type or specialty</span>
                      <input
                        value={procedureType}
                        onChange={(e) => {
                          setProcedureTouched(true);
                          setProcedureType(e.target.value);
                        }}
                        style={sc.input}
                      />
                      {procedureSuggestions.length > 0 ? (
                        <div className="quick-add-procedure-chips" role="group" aria-label="Suggested procedures">
                          {procedureSuggestions.map((suggestion) => {
                            const selected = procedureType.trim().toLowerCase() === suggestion.toLowerCase();
                            return (
                              <button
                                key={suggestion}
                                type="button"
                                className={`quick-add-procedure-chip ${selected ? "is-selected" : ""}`}
                                aria-pressed={selected}
                                onClick={() => {
                                  setProcedureTouched(true);
                                  setProcedureType(suggestion);
                                }}
                              >
                                {suggestion}
                              </button>
                            );
                          })}
                        </div>
                      ) : null}
                      <NewCaseProceduralContextNotes
                        procedureType={procedureType}
                        providerContact={effectiveSurgeonId && providerContext ? providerContext.provider : null}
                      />
                    </label>
                  </section>
                </MissionStep>

                <MissionStep
                  step={2}
                  title="Access Readiness"
                  isActive={activeMissionStep === 1}
                  isComplete={accessReadinessComplete}
                  isLocked={maxUnlockedMissionStep < 1}
                  onActivate={() => goToMissionStep(1)}
                  sectionRef={missionStepRefs[1]}
                  onFocusWithin={() => handleMissionStepFocus(1)}
                  onBlurWithin={() => handleMissionStepBlur(1)}
                  summary={
                    accessReadinessComplete
                      ? `Scheduling owner known · Access pathway documented · ${credentialingSummary}`
                      : "Capture scheduling ownership, pathway, credentialing, and restrictions"
                  }
                >
                  <section className="new-case-section">
                    <h3 className="new-case-title">Observation access</h3>
                    <div className="new-case-fields-2">
                      <label {...nextFieldLabelProps("scheduling_owner")}>
                        <span style={{ fontWeight: 700, fontSize: 12 }}>Scheduling owner</span>
                        {supportContactPickOptions.length > 0 ? (
                          <select
                            value=""
                            onChange={(e) => {
                              const picked = supportContactPickOptions.find((opt) => opt.id === e.target.value);
                              if (picked) {
                                dismissNextFieldHighlight("scheduling_owner");
                                setObservationAccess((prev) => ({ ...prev, scheduling_owner: picked.label }));
                              }
                            }}
                            style={sc.input}
                          >
                            <option value="">Select known contact…</option>
                            {supportContactPickOptions.map((opt) => (
                              <option key={opt.id} value={opt.id}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        ) : null}
                        <input
                          value={observationAccess.scheduling_owner}
                          onChange={(e) => {
                            dismissNextFieldHighlight("scheduling_owner");
                            setObservationAccess((prev) => ({ ...prev, scheduling_owner: e.target.value }));
                          }}
                          placeholder="Who controls case timing or OR scheduling?"
                          style={sc.input}
                        />
                      </label>
                      <label {...nextFieldLabelProps("credentialing_requirement")}>
                        <span style={{ fontWeight: 700, fontSize: 12 }}>Credentialing requirements</span>
                        <select
                          value={observationAccess.credentialing_requirement}
                          onChange={(e) => {
                            dismissNextFieldHighlight("credentialing_requirement");
                            setObservationAccess((prev) => ({
                              ...prev,
                              credentialing_requirement: e.target.value as ObservationAccessDraft["credentialing_requirement"],
                            }));
                          }}
                          style={sc.input}
                        >
                          <option value="unknown">Unknown</option>
                          <option value="not_required">Not required</option>
                          <option value="required_not_started">Required - not started</option>
                          <option value="in_progress">In progress</option>
                          <option value="verified">Verified</option>
                        </select>
                      </label>
                    </div>
                    <label {...nextFieldLabelProps("access_pathway")}>
                      <span style={{ fontWeight: 700, fontSize: 12 }}>Observation access pathway</span>
                      <select
                        value={observationAccess.access_pathway}
                        onChange={(e) => {
                          dismissNextFieldHighlight("access_pathway");
                          setObservationAccess((prev) => ({ ...prev, access_pathway: e.target.value }));
                        }}
                        style={sc.input}
                      >
                        <option>Unknown</option>
                        <option>Surgeon invites rep directly</option>
                        <option>Office manager coordinates</option>
                        <option>OR scheduler required</option>
                        <option>Vendor credentialing portal required</option>
                      </select>
                    </label>
                    <label style={{ display: "grid", gap: 6 }}>
                      <span style={{ fontWeight: 700, fontSize: 12 }}>Vendor/rep restrictions (optional)</span>
                      <textarea
                        value={observationAccess.vendor_restrictions}
                        onChange={(e) => setObservationAccess((prev) => ({ ...prev, vendor_restrictions: e.target.value }))}
                        rows={2}
                        placeholder="Facility rules, vendor limits, OR access restrictions..."
                        style={{ ...sc.input, resize: "vertical" }}
                      />
                    </label>
                    <label style={{ display: "grid", gap: 6 }}>
                      <span style={{ fontWeight: 700, fontSize: 12 }}>Preferred observation timing (optional)</span>
                      <input
                        value={observationAccess.preferred_timing}
                        onChange={(e) => setObservationAccess((prev) => ({ ...prev, preferred_timing: e.target.value }))}
                        placeholder="Preferred days, block time, procedure schedule clues..."
                        style={sc.input}
                      />
                    </label>
                  </section>
                </MissionStep>

                <MissionStep
                  step={3}
                  title="Observation Goals"
                  isActive={activeMissionStep === 2}
                  isComplete={observationGoalsComplete}
                  isLocked={maxUnlockedMissionStep < 2}
                  onActivate={() => goToMissionStep(2)}
                  sectionRef={missionStepRefs[2]}
                  onFocusWithin={() => handleMissionStepFocus(2)}
                  onBlurWithin={() => handleMissionStepBlur(2)}
                  summary={
                    observationGoalsComplete
                      ? `${objectiveCount} objective planned · ${unresolvedSignalCount} unresolved signals carried forward`
                      : goalsSummary
                  }
                >
                  <NewCaseObservationObjectivesSection
                    value={observationObjectives}
                    onChange={setObservationObjectives}
                    onTrackValidationTargets={trackObservationValidationTargets}
                    providerContact={effectiveSurgeonId && providerContext ? providerContext.provider : null}
                    planning={providerContext?.planning_completion ?? null}
                    providerContextBusy={providerContextBusy && Boolean(effectiveSurgeonId)}
                    accessReadinessComplete={accessReadinessComplete}
                    highlightPrimaryObjective={showNextFieldHighlight("observation_goal")}
                    onDismissPrimaryObjectiveHighlight={() => dismissNextFieldHighlight("observation_goal")}
                  />
                </MissionStep>

                <MissionStep
                  step={4}
                  title="Optional Planning"
                  tone="optional"
                  isActive={activeMissionStep === 3}
                  isComplete={optionalPlanningActive}
                  isLocked={maxUnlockedMissionStep < 3}
                  onActivate={() => goToMissionStep(3)}
                  sectionRef={missionStepRefs[3]}
                  onFocusWithin={() => handleMissionStepFocus(3)}
                  onBlurWithin={() => handleMissionStepBlur(3)}
                  summary={optionalPlanningSummary}
                >
                  <NewCaseOptionalPlanningSection
                    showProductsForObservation={showProductsForObservation}
                    onEnableProductInterest={() => setShowProductsForObservation(true)}
                    onClearProductInterest={clearObservationProductFocus}
                    products={products}
                    productId={productId}
                    onProductIdChange={setProductId}
                    displaySkus={displaySkus}
                    skuId={skuId}
                    onSkuIdChange={setSkuId}
                    expectedQty={expectedQty}
                    onExpectedQtyChange={setExpectedQty}
                    expectedRevenue={expectedRevenue}
                    onExpectedRevenueChange={setExpectedRevenue}
                    opportunityLocked={opportunityLocked}
                    lockedRelatedOpportunityLabel={lockedRelatedOpportunityLabel}
                    relatedOpportunityId={relatedOpportunityId}
                    onRelatedOpportunityIdChange={setRelatedOpportunityId}
                    opportunityOptions={opportunityOptions}
                    formatRelatedOpportunityLabel={formatRelatedOpportunityLabel}
                    loadBusy={loadBusy}
                    accountId={accountId}
                    providerContext={providerContext}
                    notes={notes}
                    onNotesChange={setNotes}
                    followUpNeeded={followUpNeeded}
                    onFollowUpNeededChange={setFollowUpNeeded}
                    notePhiKinds={notePhiKinds}
                  />
                </MissionStep>
              </div>
            ) : (
              <NewCaseProductSupportMissionWorkflow
                checklistItems={supportChecklistItems}
                onChecklistClick={goToMissionStep}
                activeStep={activeMissionStep}
                onGoToStep={goToMissionStep}
                stepRefs={missionStepRefs}
                onStepFocus={handleMissionStepFocus}
                onStepBlur={handleMissionStepBlur}
                caseTypeSelector={<NewCaseTypeSelector caseType={caseType} onSelect={selectCaseType} />}
                opportunityLocked={opportunityLocked}
                lockedOrganizationLabel={lockedOrganizationLabel}
                accounts={accounts}
                accountId={accountId}
                onAccountIdChange={setAccountId}
                mergedSurgeons={mergedSurgeons}
                surgeonId={surgeonId}
                onSurgeonIdChange={setSurgeonId}
                caseDate={caseDate}
                onCaseDateChange={setCaseDate}
                caseTime={caseTime}
                onCaseTimeChange={setCaseTime}
                setupProcedure={procedureType}
                onSetupProcedureChange={setProcedureType}
                products={products}
                productId={productId}
                onProductIdChange={setProductId}
                displaySkus={displaySkus}
                skuId={skuId}
                onSkuIdChange={setSkuId}
                expectedQty={expectedQty}
                onExpectedQtyChange={setExpectedQty}
                expectedRevenue={expectedRevenue}
                onExpectedRevenueChange={setExpectedRevenue}
                supportObjective={supportObjective}
                onSupportObjectiveChange={setSupportObjective}
                supportRepRole={supportRepRole}
                onSupportRepRoleChange={setSupportRepRole}
                supportRequiredMaterials={supportRequiredMaterials}
                onSupportRequiredMaterialsChange={setSupportRequiredMaterials}
                followUpNeeded={followUpNeeded}
                onFollowUpNeededChange={setFollowUpNeeded}
                supportSetupComplete={supportSetupCompleteFlag}
                productInventoryComplete={supportProductInventoryComplete}
                caseSupportPlanComplete={supportCasePlanComplete}
                maxUnlockedStep={maxUnlockedSupportMissionStep}
                optionalPlanningActive={supportOptionalPlanningActive}
                optionalPlanningSummary={supportOptionalPlanningSummary}
                showProductsForObservation={false}
                onEnableProductInterest={() => {}}
                onClearProductInterest={clearObservationProductFocus}
                opportunityLockedInitiative={opportunityLocked}
                lockedRelatedOpportunityLabel={lockedRelatedOpportunityLabel}
                relatedOpportunityId={relatedOpportunityId}
                onRelatedOpportunityIdChange={setRelatedOpportunityId}
                opportunityOptions={opportunityOptions}
                formatRelatedOpportunityLabel={formatRelatedOpportunityLabel}
                loadBusy={loadBusy}
                providerContext={providerContext}
                notes={notes}
                onNotesChange={setNotes}
                notePhiKinds={notePhiKinds}
                contactDisplayName={contactDisplayName}
                formatSurgicalContactRole={formatSurgicalContactRole}
              />
            )}

            <NewCaseFormSaveActions
              saveCta={operationalReadiness.saveCta}
              saveBlockers={saveBlockers}
              showGuidance={saveGuidanceVisible || saveBlockers.length > 0}
              busy={busy}
              draftSaving={draftSaving}
              draftSavedFlash={draftSavedFlash}
              loadBusy={loadBusy}
              onSaveDraft={() => void saveDraft()}
              onSaveScheduled={() => {
                const form = document.querySelector("form.new-case-form");
                if (form instanceof HTMLFormElement) form.requestSubmit();
              }}
            />
          </form>
          <NewCaseOperationalReadinessPanel
            view={operationalReadiness}
            variant="desktop"
            onResolveNextStep={resolveMissionNextStep}
          />
        </div>
      </div>

      <PhiPatternAdvisoryModal
        open={phiModal !== null}
        kinds={phiModal?.kinds ?? []}
        onCancel={() => setPhiModal(null)}
        onContinue={() => {
          phiAckRef.current = true;
          setPhiModal(null);
          void runCreate();
        }}
      />

      {modalOpen ? (
        <div
          role="dialog"
          aria-modal
          style={{ ...sc.modalBackdrop, padding: 12, zIndex: 50 }}
          onPointerDown={(e) => e.target === e.currentTarget && setModalOpen(false)}
        >
          <style dangerouslySetInnerHTML={{ __html: contactFormModalCss }} />
          <div className="contact-modal-panel">
            <h3 className="contact-modal-title">New contact</h3>
            {cErr ? <div className="contact-modal-err">{cErr}</div> : null}
            <div className="contact-modal-body">
              <div className="contact-modal-grid contact-modal-grid--2">
                <label className="contact-modal-field">
                  First name
                  <input value={cFirst} onChange={(e) => setCFirst(e.target.value)} />
                </label>
                <label className="contact-modal-field">
                  Last name
                  <input value={cLast} onChange={(e) => setCLast(e.target.value)} />
                </label>
              </div>
              <label className="contact-modal-field">
                Email (optional)
                <input type="email" value={cEmail} onChange={(e) => setCEmail(e.target.value)} />
              </label>
              <p className="contact-modal-field-hint" style={{ margin: 0 }}>
                Saved as Surgeon on the selected organization.
              </p>
              <div className="contact-modal-actions case-modal-actions">
                <button type="button" style={sc.btnGhost} onClick={() => setModalOpen(false)} disabled={cBusy}>
                  Cancel
                </button>
                <button type="button" style={sc.btnPrimary} onClick={() => void saveContact()} disabled={cBusy}>
                  {cBusy ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
      {manageSupportOpen && surgeonId ? (
        <ManageSupportContactsModal
          doctorId={surgeonId}
          contextOrganizationId={accountId || null}
          onClose={() => setManageSupportOpen(false)}
          onChanged={() => {
            setManageSupportOpen(false);
            void (async () => {
              const res = await fetch(`/api/portal/sales/surgical-accounts/${encodeURIComponent(accountId)}`, { cache: "no-store" });
              const j = await readResponseJson<{ ok?: boolean; contacts?: ContactRow[] }>(res);
              if (j.ok && j.contacts) setContacts(j.contacts);
            })();
          }}
        />
      ) : null}
    </SalesCommandPage>
  );
}
