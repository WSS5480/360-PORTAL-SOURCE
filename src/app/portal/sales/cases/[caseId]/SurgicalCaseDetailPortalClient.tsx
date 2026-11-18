"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import React from "react";
import { SalesCommandPage, sc, surgicalCaseModalActionsCss } from "@/components/sales/salesCommandUi";
import { userFacingError } from "@/lib/errors/userFacingError";
import {
  contactDisplayName,
  formatSurgicalCaseDocumentType,
  formatSurgicalCaseNumber,
  formatSurgicalCaseStatus,
  formatSurgicalCaseType,
  isSurgicalObservationCase,
  SURGICAL_CASE_DOCUMENT_TYPES,
  SURGICAL_CASE_STATUSES,
  SURGICAL_PHI_UI_NOTICE,
} from "@/lib/surgical-sales/labels";
import { OBSERVATION_FORM_DOCUMENT_TYPE } from "@/lib/surgical-sales/observationFormLibrary";
import {
  surgicalCaseDocumentFileLooksLikeImage,
  surgicalCaseDocumentTypeAllowsPhoto,
} from "@/lib/surgical-sales/surgicalPayloadGuards";
import { caseTypeBadgeStyle } from "@/components/sales/crmUi";
import { formatSurgicalCaseActivityType } from "@/lib/surgical-sales/caseActivityLabels";
import { detectSurgicalPhiPatternKinds } from "@/lib/surgical-sales/phiContentHeuristics";
import PhiPatternAdvisoryModal, { PhiPatternInlineHint } from "@/components/sales/PhiPatternAdvisoryModal";
import {
  buildCaptureIntelligenceOpenContext,
  useCaptureIntelligence,
} from "@/components/sales/captureIntelligence/CaptureIntelligenceHost";
import { captureIntelligenceTitleForContext } from "@/lib/surgical-sales/captureIntelligence";
import { LOG_UPDATE_UI_ENABLED } from "@/lib/surgical-sales/logUpdateUx";
import SalesCrmConfirmModal from "@/components/sales/SalesCrmConfirmModal";
import { surgicalProductFamilyLeftBorderColor } from "@/lib/surgical-sales/productFamilyVisual";
import {
  SurgicalBillingReadinessBanner,
} from "@/components/sales/SurgicalBillingReadiness";
import { CaseDetailMobileBottomBar } from "./CaseDetailMobileBottomBar";
import type { MobileHeaderChip } from "./CaseDetailMobileHeader";
import { caseMobilePolishCss } from "./caseMobilePolishCss";
import { caseDesktopScaleCss } from "../caseDesktopScaleCss";
import { caseMissionControlPolishCss } from "./caseMissionControlPolishCss";
import { OPPORTUNITY_UI } from "@/lib/sales/opportunityUiLabels";
import { buildCreateOpportunityHref } from "@/lib/surgical-sales/providerNextStepLinks";
import { buildProviderOverviewHref } from "@/lib/surgical-sales/engagements/engagementCreateWizard";
import { ObservationCaseBriefing } from "./ObservationCaseBriefing";
import { ObservationCaseFieldNotes } from "./ObservationCaseFieldNotes";
import { ObservationCaseIntelligenceTab } from "./ObservationCaseIntelligenceTab";
import {
  formatObservationCaseExecutionStatusLabel,
  resolveObservationCaseExecutionStatus,
} from "@/lib/surgical-sales/observationCaseExecutionStatus";
import { isCaseDateInThePast } from "@/lib/surgical-sales/casePerformedStatus";
import {
  canStartObservationLifecycle,
  OBSERVATION_LIFECYCLE_STATUS,
} from "@/lib/surgical-sales/observationCaseLifecycle";
import {
  observationHeaderMoreActions,
  observationHeaderPrimaryAction,
  observationToProductSupportCasePatch,
  OBSERVATION_HEADER_ACTION_LABELS,
  type ObservationHeaderMoreActionId,
  type ObservationHeaderPrimaryActionId,
} from "@/lib/surgical-sales/buildObservationCaseHeaderControls";
import {
  buildObservationCaptureFeedback,
  type ObservationCaptureFeedbackResult,
} from "@/lib/surgical-sales/observationCaptureFeedback";
import type { ProductSupportCaptureFeedbackResult } from "@/lib/surgical-sales/productSupportCaptureFeedback";
import { CaseObservationResourcesTab } from "./CaseObservationResourcesTab";
import { SurgicalCaseDetailShell, type SurgicalCaseHeaderChip } from "./SurgicalCaseDetailShell";
import { ObservationCaseMetadataRow } from "./ObservationCaseMetadataRow";
import { ProductSupportCaseBriefing } from "./ProductSupportCaseBriefing";
import { ProductSupportCaseDetailShell, type ProductSupportWorkspaceTabId } from "./ProductSupportCaseDetailShell";
import { ProductSupportCaseDocumentsTab } from "./ProductSupportCaseDocumentsTab";
import { ProductSupportCaseFieldNotes } from "./ProductSupportCaseFieldNotes";
import { ProductSupportCaseFollowUpTab } from "./ProductSupportCaseFollowUpTab";
import { ProductSupportCaseIntelligenceTab } from "./ProductSupportCaseIntelligenceTab";
import { ProductSupportCaseProductsTab } from "./ProductSupportCaseProductsTab";
import { buildProductSupportCaseIdentity } from "@/lib/surgical-sales/buildProductSupportCaseIdentity";
import { filterSurgicalCaseDetailWarnings } from "@/lib/surgical-sales/filterSurgicalCaseDetailWarnings";
import { buildCaseIdentity, formatCaseIdentityPageTitle } from "@/lib/surgical-sales/buildCaseIdentity";
import { providerSpecialtyLabel } from "@/lib/surgical-sales/caseExecutionHeaderHelpers";
import { providerDisplayNameFromRow } from "./CaseProviderIntelligenceSnapshot";
import { cleanProcedureSuggestions } from "@/lib/surgical-sales/quickAddProcedureSuggestions";
import { CaseObservationObjectivesRecap } from "./CaseObservationObjectivesRecap";
import type { CaseOperationalContextView } from "@/lib/surgical-sales/buildCaseOperationalContextView";
import type { UniversalFactsReadModelPayload } from "@/lib/surgical-sales/universalExtractor/universalFactsReadModelAdapters";
import { OperationalNoteComposer } from "@/components/sales/OperationalNoteComposer";
import type { CreateOperationalNoteClientInput, OperationalNoteContextDefaults } from "@/lib/notes/operationalNote";
import { operationalNoteContextFromCaseRow } from "@/lib/notes/createOperationalNote";
import {
  countCaseSetupReadiness,
  PRE_CALL_PLAN_CASE_KEYS,
  type PreCallPlanContext,
} from "@/lib/surgical-sales/preCallPlanFields";
import { UpdateProviderIntelligenceModal } from "./UpdateProviderIntelligenceModal";
import {
  AddCaseInsightActionButton,
  AddCaseInsightToProviderDiscoveryModal,
} from "./AddCaseInsightToProviderDiscoveryModal";
import { ADD_CASE_INSIGHT_TO_PROVIDER_DISCOVERY_LABEL } from "@/lib/surgical-sales/providerClinicalDiscoveryCaseInsight";
import {
  activityItemEligibleForProviderIntelligencePromote,
  UPDATE_PROVIDER_INTELLIGENCE_ACTION_LABEL,
} from "@/lib/surgical-sales/providerIntelligencePromote";
import type { ProviderIntelligenceSnapshot } from "@/lib/surgical-sales/providerIntelligenceSnapshot";
import {
  CASE_OBSERVATION_GOAL_KEYS,
  OBSERVATION_CASE_WORKFLOW_AUDIT_LABELS,
  OBSERVATION_DEBRIEF_CORE_KEYS,
  OBSERVATION_DEBRIEF_KEYS,
  OBSERVATION_FOLLOW_UP_KEYS,
  OBSERVATION_LIVE_CORE_FIELDS,
  OBSERVATION_LIVE_FIELDS,
  OBSERVATION_LIVE_KEYS,
  OBSERVATION_ROUTING_KEYS,
  OBSERVATION_DEBRIEF_TEXT_FIELDS,
  OBSERVATION_FOLLOW_UP_TEXT_FIELDS,
  type ObservationCaseWorkflowFieldKey,
} from "@/lib/surgical-sales/observationCaseWorkflowFields";
import {
  ObservationWorkflowMobilePanel,
  WorkflowFieldSubitems,
  type WorkflowTextFieldConfig,
} from "./ObservationWorkflowMobilePanel";
import { CaseIntelligenceLogisticsSection } from "./CaseIntelligenceLogisticsSection";
import { UnifiedActivityFeed } from "@/components/sales/UnifiedActivityFeed";
import { useUnifiedActivityFeed } from "@/hooks/useUnifiedActivityFeed";
import type { UnifiedActivityFeedFilterId, UnifiedActivityFeedItem } from "@/lib/activity/activityFeedPresentation";
import {
  mobileWorkflowStageStatus,
  normalizeObservationWorkflowStageId,
  observationWorkflowMobileStageLabel,
  type MobileWorkflowStageRow,
  type ObservationWorkflowStageId,
} from "./observationWorkflowStages";
import {
  billingReadinessLabel,
  computeSurgicalBillingChecklist,
  surgicalCaseBillingExemptCopy,
  surgicalCaseRequiresBillingWorkflow,
  type BillingReadinessLevel,
} from "@/lib/surgical-sales/billingReadiness";
import { SALES_STAGES, SALES_STAGE_LABEL } from "@/lib/sales/stages";

type ActivityRow = {
  id: string;
  user_id: string;
  activity_type: string;
  body: string;
  metadata_json?: Record<string, unknown>;
  created_at: string;
  actor_display_name?: string;
};

type LineRow = {
  id: string;
  product_id?: string;
  expected_quantity?: number | null;
  actual_quantity?: number | null;
  notes?: string | null;
  sku_code?: string | null;
  sku_description?: string | null;
  product_name?: string | null;
};

type DocRow = {
  id: string;
  document_type: string;
  file_name: string;
  uploaded_by: string;
  created_at: string;
  uploader_display_name?: string;
};

type DetailBilling = {
  po_uploaded: boolean;
  invoice_uploaded: boolean;
  quantities_confirmed: boolean;
  readiness: BillingReadinessLevel;
  score: number;
  billing_reviewed_at: string | null;
  billing_admin_notes: string | null;
};

type DetailJson = {
  ok?: boolean;
  case?: Record<string, unknown>;
  engagement?: Record<string, unknown> | null;
  pre_call_plan_source?: "engagement" | "case";
  account?: { id: string; name?: string | null } | null;
  surgeon?: Record<string, unknown> | null;
  provider_intelligence?: ProviderIntelligenceSnapshot | null;
  case_operational_context?: CaseOperationalContextView | null;
  product?: { id?: string; name?: string | null } | null;
  sales_rep?: { user_id: string; display_name: string };
  lines?: LineRow[];
  activities?: ActivityRow[];
  provider_prior_observation_cases?: Array<Record<string, unknown>>;
  provider_prior_cases?: Array<Record<string, unknown>>;
  universal_facts_read_model?: UniversalFactsReadModelPayload | null;
  documents?: DocRow[];
  billing?: DetailBilling;
  error?: string;
};

type OpportunityRow = {
  id: string;
  account_id?: string | null;
  account_name?: string | null;
  physician_name?: string | null;
  product_display?: string | null;
  product_line?: string | null;
  stage?: string | null;
  notes?: string | null;
};

type CaseWorkspaceTab = "overview" | "workflow" | "activity" | "resources";

type ObservationWorkflowDraft = {
  live_observation_workflow: string;
  live_observation_clinical_pain_points: string;
  live_observation_surgeon_reactions: string;
  live_observation_product_fit: string;
  live_observation_competitors: string;
  live_observation_staff_process: string;
  live_observation_questions: string;
  live_observation_follow_up_items: string;
  debrief_key_findings: string;
  debrief_opportunity_score: string;
  debrief_recommended_next_stage: string;
  debrief_product_opportunity_identified: boolean;
  follow_up_needed: boolean;
  debrief_suggested_next_action: string;
  debrief_convert_to_product_support_case: boolean;
  related_opportunity_id: string;
};

type ObservationWorkflowFieldKey = ObservationCaseWorkflowFieldKey;

type ObservationTextFieldConfig = {
  key: ObservationWorkflowFieldKey;
  label: string;
  helper?: string;
  rows?: number;
  multiline?: boolean;
};

type ObservationRecommendation = {
  id: string;
  title: string;
  detail: string;
  cta?: string;
  kind?: "move_stage" | "new_product_support_case" | "open_opportunity";
};

const PRE_CALL_PLAN_ACTIVITY_KEYS = [...PRE_CALL_PLAN_CASE_KEYS] as const;

const OBSERVATION_AUDIT_LABELS: Record<string, string> = {
  ...OBSERVATION_CASE_WORKFLOW_AUDIT_LABELS,
  notes: "Case notes",
};
const ACTIVITY_FEED_FILTERS = [
  { id: "all", label: "All" },
  { id: "notes", label: "Notes" },
  { id: "discovery", label: "Discovery" },
  { id: "system", label: "System" },
  { id: "workflow", label: "Workflow" },
  { id: "products", label: "Products" },
  { id: "documents", label: "Documents" },
] as const;

function readCaseText(caseRow: Record<string, unknown>, key: string): string {
  return caseRow[key] == null ? "" : String(caseRow[key]);
}

function readCaseBool(caseRow: Record<string, unknown>, key: string): boolean {
  return Boolean(caseRow[key]);
}

function buildObservationWorkflowDraft(caseRow: Record<string, unknown>): ObservationWorkflowDraft {
  return {
    live_observation_workflow: readCaseText(caseRow, "live_observation_workflow"),
    live_observation_clinical_pain_points: readCaseText(caseRow, "live_observation_clinical_pain_points"),
    live_observation_surgeon_reactions: readCaseText(caseRow, "live_observation_surgeon_reactions"),
    live_observation_product_fit: readCaseText(caseRow, "live_observation_product_fit"),
    live_observation_competitors: readCaseText(caseRow, "live_observation_competitors"),
    live_observation_staff_process: readCaseText(caseRow, "live_observation_staff_process"),
    live_observation_questions: readCaseText(caseRow, "live_observation_questions"),
    live_observation_follow_up_items: readCaseText(caseRow, "live_observation_follow_up_items"),
    debrief_key_findings: readCaseText(caseRow, "debrief_key_findings"),
    debrief_opportunity_score:
      caseRow.debrief_opportunity_score == null ? "" : String(caseRow.debrief_opportunity_score),
    debrief_recommended_next_stage: readCaseText(caseRow, "debrief_recommended_next_stage"),
    debrief_product_opportunity_identified: readCaseBool(caseRow, "debrief_product_opportunity_identified"),
    follow_up_needed: readCaseBool(caseRow, "follow_up_needed"),
    debrief_suggested_next_action: readCaseText(caseRow, "debrief_suggested_next_action"),
    debrief_convert_to_product_support_case: readCaseBool(caseRow, "debrief_convert_to_product_support_case"),
    related_opportunity_id: readCaseText(caseRow, "related_opportunity_id"),
  };
}

function normalizeObservationDraftValue(key: ObservationWorkflowFieldKey, draft: ObservationWorkflowDraft): unknown {
  const value = draft[key];
  if (key === "debrief_product_opportunity_identified" || key === "follow_up_needed" || key === "debrief_convert_to_product_support_case") {
    return Boolean(value);
  }
  if (key === "debrief_opportunity_score") {
    const raw = String(value).trim();
    if (!raw) return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? Math.max(0, Math.min(100, Math.round(parsed))) : null;
  }
  if (key === "debrief_recommended_next_stage" || key === "related_opportunity_id") {
    const raw = String(value).trim();
    return raw || null;
  }
  const raw = String(value).trim();
  return raw || null;
}

function buildObservationWorkflowPatch(
  draft: ObservationWorkflowDraft,
  keys: readonly ObservationWorkflowFieldKey[]
): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  for (const key of keys) {
    patch[key] = normalizeObservationDraftValue(key, draft);
  }
  return patch;
}

function observationFieldHasValue(caseRow: Record<string, unknown>, key: ObservationWorkflowFieldKey): boolean {
  if (key === "debrief_product_opportunity_identified" || key === "follow_up_needed" || key === "debrief_convert_to_product_support_case") {
    return Boolean(caseRow[key]);
  }
  const value = caseRow[key];
  if (value == null) return false;
  return String(value).trim().length > 0;
}

function countObservationFields(caseRow: Record<string, unknown>, keys: readonly ObservationWorkflowFieldKey[]): number {
  return keys.filter((key) => observationFieldHasValue(caseRow, key)).length;
}

function buildMobileWorkflowStageRows(
  caseRow: Record<string, unknown>,
  noteCount: number,
  preCallContext?: PreCallPlanContext,
): MobileWorkflowStageRow[] {
  const setup = countCaseSetupReadiness(caseRow);
  const stages = (
    [
      { id: "setup" as const, filled: setup.filled, total: setup.total },
      {
        id: "live" as const,
        filled: countObservationFields(caseRow, OBSERVATION_LIVE_KEYS) + (noteCount > 0 ? 1 : 0),
        total: OBSERVATION_LIVE_KEYS.length + 1,
      },
      {
        id: "debrief" as const,
        filled: countObservationFields(caseRow, OBSERVATION_DEBRIEF_CORE_KEYS),
        total: OBSERVATION_DEBRIEF_CORE_KEYS.length,
      },
      {
        id: "follow_up" as const,
        filled: countObservationFields(caseRow, OBSERVATION_FOLLOW_UP_KEYS),
        total: OBSERVATION_FOLLOW_UP_KEYS.length,
      },
      {
        id: "routing" as const,
        filled: countObservationFields(caseRow, OBSERVATION_ROUTING_KEYS),
        total: OBSERVATION_ROUTING_KEYS.length,
      },
    ] as const
  ).map((stage) => ({
    ...stage,
    title: observationWorkflowMobileStageLabel(stage.id),
  }));
  return stages.map((stage) => ({
    ...stage,
    status: mobileWorkflowStageStatus(stage.filled, stage.total),
  }));
}

function formatRelatedOpportunityLabel(o: OpportunityRow): string {
  const account = String(o.account_name || "Organization").trim();
  const product = String(o.product_display || o.product_line || OPPORTUNITY_UI.fallbackRecordLabel).trim();
  const physician = String(o.physician_name || "").trim();
  return physician ? `${account} — ${product} · ${physician}` : `${account} — ${product}`;
}

function buildObservationRecommendations(params: {
  caseRow: Record<string, unknown>;
  relatedOpportunity: OpportunityRow | null;
}): ObservationRecommendation[] {
  const { caseRow, relatedOpportunity } = params;
  const recommendations: ObservationRecommendation[] = [];
  const productOpportunity = Boolean(caseRow.debrief_product_opportunity_identified);
  const followUpNeeded = Boolean(caseRow.follow_up_needed);
  const convertToSupport = Boolean(caseRow.debrief_convert_to_product_support_case);
  const suggestedNextAction = String(caseRow.debrief_suggested_next_action || "").trim();
  const linkedOpportunityId = String(caseRow.related_opportunity_id || "").trim();
  const recommendedStage = String(caseRow.debrief_recommended_next_stage || "").trim();
  const opportunityScoreRaw = caseRow.debrief_opportunity_score;
  const opportunityScore =
    opportunityScoreRaw == null || opportunityScoreRaw === "" ? null : Number(opportunityScoreRaw);

  if (recommendedStage) {
    recommendations.push({
      id: "stage-recommendation",
      title: `Move to ${SALES_STAGE_LABEL[recommendedStage as (typeof SALES_STAGES)[number]] ?? recommendedStage}`,
      detail: linkedOpportunityId
        ? "Observation signals support advancing the related evaluation."
        : "Link this case to an evaluation so the recommendation can update opportunity stage.",
      cta: linkedOpportunityId ? OPPORTUNITY_UI.updateInitiativeStageCta : OPPORTUNITY_UI.linkInitiativeCta,
      kind: linkedOpportunityId ? "move_stage" : "open_opportunity",
    });
  } else if (productOpportunity || (opportunityScore != null && opportunityScore >= 70)) {
    recommendations.push({
      id: "validate-needs",
      title: `Move to ${SALES_STAGE_LABEL.clinical_validation}`,
      detail: "Strong clinical interest was observed; formalize next-step discovery and validation.",
      cta: linkedOpportunityId ? OPPORTUNITY_UI.updateInitiativeStageCta : OPPORTUNITY_UI.linkInitiativeCta,
      kind: linkedOpportunityId ? "move_stage" : "open_opportunity",
    });
  }

  if (productOpportunity || (opportunityScore != null && opportunityScore >= 80)) {
    recommendations.push({
      id: "evaluation-case",
      title: "Schedule evaluation case",
      detail: "The observation suggests the account is ready for a hands-on next step.",
    });
  }

  if (followUpNeeded || suggestedNextAction) {
    recommendations.push({
      id: "follow-up",
      title: suggestedNextAction || "Present outcome data",
      detail: "Capture the next best action now so it turns into a concrete follow-up.",
    });
  }

  if (!linkedOpportunityId) {
    recommendations.push({
      id: "link-opportunity",
      title: "Link or create an evaluation",
      detail: "Tie the observation to pipeline so discovery insights feed opportunity stage and next actions.",
      cta: "Open evaluation",
      kind: "open_opportunity",
    });
  } else if (relatedOpportunity && !String(relatedOpportunity.physician_name || "").trim()) {
    recommendations.push({
      id: "add-surgeon-stakeholder",
      title: "Add surgeon stakeholder",
      detail: "The related evaluation does not yet show a primary physician champion from this observation.",
      cta: "Open evaluation",
      kind: "open_opportunity",
    });
  }

  if (convertToSupport) {
    recommendations.push({
      id: "convert-support",
      title: "Create Product Support Case",
      detail: "Turn the observation into an execution case so product questions and logistics stay tracked.",
      cta: "Create support case",
      kind: "new_product_support_case",
    });
  }

  return recommendations.slice(0, 5);
}

function pickPrimaryObservationNextMove(recommendations: ObservationRecommendation[]): ObservationRecommendation | null {
  const priority = [
    "follow-up",
    "stage-recommendation",
    "validate-needs",
    "convert-support",
    "evaluation-case",
    "link-opportunity",
    "add-surgeon-stakeholder",
  ];
  for (const id of priority) {
    const match = recommendations.find((recommendation) => recommendation.id === id);
    if (match) return match;
  }
  return recommendations[0] ?? null;
}

const muted: React.CSSProperties = { color: "var(--muted)", fontSize: 12, fontWeight: 600 };

function statusBadgeStyle(status: string): React.CSSProperties {
  const s = status.toLowerCase();
  const map: Record<string, { bg: string; fg: string }> = {
    scheduled: { bg: "color-mix(in srgb, #2563eb 16%, var(--surface))", fg: "#1d4ed8" },
    confirmed: { bg: "color-mix(in srgb, #7c3aed 18%, var(--surface))", fg: "#5b21b6" },
    completed: { bg: "color-mix(in srgb, #16a34a 18%, var(--surface))", fg: "#15803d" },
    docs_needed: { bg: "color-mix(in srgb, #ea580c 18%, var(--surface))", fg: "#c2410c" },
    billing_review: { bg: "color-mix(in srgb, #ca8a04 22%, var(--surface))", fg: "#a16207" },
    invoiced: { bg: "color-mix(in srgb, #0d9488 18%, var(--surface))", fg: "#0f766e" },
    closed: { bg: "color-mix(in srgb, var(--foreground) 10%, var(--surface))", fg: "color-mix(in srgb, var(--foreground) 62%, var(--muted))" },
    cancelled: { bg: "color-mix(in srgb, #dc2626 16%, var(--surface))", fg: "#b91c1c" },
  };
  const pair = map[s] || { bg: "color-mix(in srgb, var(--brand-600) 12%, var(--surface))", fg: "var(--brand-700)" };
  return {
    display: "inline-flex",
    alignItems: "center",
    padding: "5px 12px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: "0.02em",
    background: pair.bg,
    color: pair.fg,
    transition: "background 0.22s ease, color 0.22s ease, box-shadow 0.22s ease",
  };
}

const shellCss = `
.case-detail-page-pad {
  padding-bottom: 92px;
}
.case-workspace-shell {
  display: grid;
  gap: 14px;
  min-width: 0;
}
.case-workspace-sticky {
  position: sticky;
  top: 8px;
  z-index: 36;
  display: grid;
  gap: 8px;
}
.case-workspace-header {
  border: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
  border-radius: 14px;
  background: var(--surface);
  box-shadow: 0 1px 2px color-mix(in srgb, var(--foreground) 3%, transparent);
  padding: 12px 14px;
}
.case-mobile-header-top {
  display: none;
}
.case-mobile-header-icons {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
}
.case-mobile-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  padding: 0;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--foreground);
  cursor: pointer;
  touch-action: manipulation;
}
.case-mobile-icon-btn:active {
  background: color-mix(in srgb, var(--foreground) 6%, var(--surface));
}
.case-mobile-back {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  color: var(--brand-700);
  text-decoration: none;
  font-size: 20px;
  font-weight: 700;
  flex-shrink: 0;
}
.case-mobile-header-title {
  flex: 1;
  min-width: 0;
  font-size: 16px;
  font-weight: 900;
  letter-spacing: -0.02em;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.case-mobile-header-context {
  display: none;
}
.case-mobile-header-identity {
  flex: 1;
  min-width: 0;
  display: grid;
  gap: 1px;
}
.case-mobile-header-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  min-width: 0;
  font-size: 11px;
  font-weight: 600;
  line-height: 1.3;
  color: var(--muted);
}
.case-mobile-header-meta a {
  color: var(--muted);
  text-decoration: none;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}
.case-mobile-header-meta-sep {
  opacity: 0.55;
  flex-shrink: 0;
}
.case-mobile-header-meta-surgeon {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}
.case-mobile-header-chips {
  display: none;
}
.case-workspace-banner {
  margin: 0;
}
.case-workspace-body {
  min-width: 0;
}
.case-workspace-tab {
  white-space: nowrap;
  min-height: 34px;
  padding: 7px 12px !important;
  font-size: 12px !important;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
  background: var(--surface);
  color: var(--brand-700);
  font-weight: 700;
  box-shadow: none;
  cursor: pointer;
  touch-action: manipulation;
}
.case-workspace-tab[aria-selected="true"] {
  background: color-mix(in srgb, var(--brand-600) 10%, var(--surface));
  border-color: color-mix(in srgb, var(--brand-600) 28%, var(--border));
  color: var(--brand-700);
}
.case-workspace-header-main {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: flex-start;
  justify-content: space-between;
}
.case-workspace-context {
  display: grid;
  gap: 6px;
  min-width: 0;
  flex: 1 1 360px;
}
.case-workspace-title-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}
.case-workspace-title {
  margin: 0;
  font-size: 20px;
  font-weight: 900;
  letter-spacing: -0.025em;
  line-height: 1.12;
}
.case-workspace-subline {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 10px;
  align-items: center;
  font-size: 12px;
  color: var(--muted);
}
.case-workspace-chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}
.case-workspace-opportunity-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 9px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 800;
  background: color-mix(in srgb, var(--brand-600) 8%, var(--surface));
  color: var(--brand-700);
  border: 1px solid color-mix(in srgb, var(--brand-600) 18%, var(--border));
  text-decoration: none;
  white-space: nowrap;
}
.case-workspace-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  justify-content: flex-end;
  align-items: center;
  flex: 0 1 auto;
}
.case-workspace-actions > button,
.case-workspace-actions > a {
  min-height: 36px;
  padding: 7px 11px !important;
  font-size: 12px !important;
}
.case-workspace-tabbar {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  padding: 4px;
  border-radius: 12px;
  border: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
  background: color-mix(in srgb, var(--foreground) 2%, var(--surface));
}
.case-workspace-tabbar .case-workspace-tab {
  flex: 0 0 auto;
}
.case-workspace-two-col {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(300px, 0.95fr);
  gap: 14px;
  align-items: start;
}
.case-workspace-three-col {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
  align-items: start;
}
.case-workspace-card-stack {
  display: grid;
  gap: 12px;
}
.case-workspace-field-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}
.case-workspace-stat-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}
.case-workspace-stat {
  border: 1px solid color-mix(in srgb, var(--foreground) 5%, var(--border));
  border-radius: 10px;
  padding: 10px;
  background: color-mix(in srgb, var(--foreground) 1.5%, var(--surface));
  display: grid;
  gap: 4px;
}
.case-workspace-stat-value {
  font-size: 18px;
  font-weight: 900;
  letter-spacing: -0.02em;
}
.case-overview-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(300px, 0.85fr);
  gap: 14px;
  align-items: start;
}
.case-overview-column {
  display: grid;
  gap: 8px;
}
.case-overview-section {
  border: 1px solid color-mix(in srgb, var(--foreground) 5%, var(--border));
  border-radius: 10px;
  background: transparent;
  overflow: hidden;
}
.case-overview-section > summary {
  list-style: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 10px;
  font-size: 12px;
  font-weight: 900;
}
.case-overview-section > summary::-webkit-details-marker { display: none; }
.case-overview-section-summary-note {
  font-size: 10px;
  color: var(--muted);
  font-weight: 700;
}
.case-overview-section-body {
  display: grid;
  gap: 8px;
  padding: 8px 10px 10px;
  border-top: 1px solid color-mix(in srgb, var(--foreground) 5%, var(--border));
}
.case-overview-meta-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px 12px;
}
.case-overview-meta-row {
  display: grid;
  gap: 2px;
  min-width: 0;
}
.case-overview-label {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted);
}
.case-overview-value {
  font-size: 14px;
  font-weight: 800;
  line-height: 1.35;
  color: var(--foreground);
  word-break: break-word;
}
.case-overview-muted {
  color: var(--muted);
  font-weight: 600;
}
.case-overview-chip-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}
.case-overview-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
  background: var(--surface);
  font-size: 10px;
  font-weight: 800;
}
.case-overview-product-list,
.case-overview-alert-list {
  display: grid;
  gap: 6px;
}
.case-overview-product-row,
.case-overview-alert-row {
  display: grid;
  gap: 4px;
  padding: 8px 10px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--foreground) 1.5%, var(--surface));
  border: 1px solid color-mix(in srgb, var(--foreground) 4%, var(--border));
}
.case-overview-alert-row[data-tone="warning"] {
  border-color: color-mix(in srgb, #f59e0b 18%, var(--border));
  background: color-mix(in srgb, #f59e0b 5%, var(--surface));
}
.case-overview-alert-row[data-tone="danger"] {
  border-color: color-mix(in srgb, #dc2626 18%, var(--border));
  background: color-mix(in srgb, #dc2626 4%, var(--surface));
}
.case-overview-empty {
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px dashed color-mix(in srgb, var(--foreground) 10%, var(--border));
  color: var(--muted);
  font-size: 12px;
  line-height: 1.45;
  background: color-mix(in srgb, var(--foreground) 1%, var(--surface));
}
.case-inline-empty {
  display: grid;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px dashed color-mix(in srgb, var(--foreground) 10%, var(--border));
  background: color-mix(in srgb, var(--foreground) 1%, var(--surface));
}
.case-inline-empty-title {
  font-size: 13px;
  font-weight: 800;
  color: var(--foreground);
  line-height: 1.35;
}
.case-inline-empty-body {
  font-size: 12px;
  line-height: 1.45;
  color: var(--muted);
}
.case-inline-empty-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.case-detail-quick-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  justify-content: flex-start;
  width: 100%;
}
.case-detail-quick-actions > button,
.case-detail-quick-actions > a {
  min-height: 34px;
  padding: 7px 11px !important;
  font-size: 12px !important;
  flex: 0 1 auto;
  max-width: 100%;
  justify-content: center;
  touch-action: manipulation;
}
.case-bottom-action-shell {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 45;
  padding: 8px clamp(12px, 3vw, 24px);
  padding-bottom: max(8px, env(safe-area-inset-bottom, 0px));
  pointer-events: none;
}
.case-bottom-action-shell--mobile {
  display: none;
}
.case-bottom-action-shell--desktop {
  display: block;
}
.case-bottom-action-bar {
  margin: 0 auto;
  max-width: 1180px;
  display: flex;
  justify-content: center;
}
.case-bottom-action-bar-inner {
  pointer-events: auto;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  padding: 6px;
  border-radius: 12px;
  border: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
  background: color-mix(in srgb, var(--surface) 95%, transparent);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  box-shadow: 0 2px 10px color-mix(in srgb, var(--foreground) 4%, transparent);
}
.case-action-shortcut {
  margin-left: 5px;
  font-size: 10px;
  font-weight: 700;
  opacity: 0.58;
}
.case-mobile-fab-shell {
  display: none;
}
.case-mobile-bottom-bar {
  pointer-events: auto;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  align-items: center;
  justify-items: center;
  gap: 0;
  width: 100%;
  max-width: none;
  margin: 0;
  height: auto;
  min-height: 48px;
  box-sizing: border-box;
  padding: 4px 2px calc(4px + env(safe-area-inset-bottom, 0px));
  border-radius: 0;
  border: none;
  border-top: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
  background: #fff;
  box-shadow: none;
}
.case-mobile-bottom-bar .case-mobile-tab-action {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  width: auto;
  max-width: none;
  min-width: 0;
  min-height: 0;
  height: auto;
  margin: 0;
  padding: 0 !important;
  border: none !important;
  border-radius: 0 !important;
  background: transparent !important;
  color: var(--foreground) !important;
  box-shadow: none !important;
  appearance: none;
  -webkit-appearance: none;
  touch-action: manipulation;
  cursor: pointer;
  font: inherit;
  text-decoration: none;
}
.case-mobile-bottom-bar .case-mobile-tab-action:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.case-mobile-bottom-bar .case-mobile-tab-action-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--foreground) 4%, #fff);
  border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
  color: var(--foreground);
  flex-shrink: 0;
}
.case-mobile-bottom-bar .case-mobile-tab-action--primary .case-mobile-tab-action-icon {
  background: var(--brand-600);
  border-color: var(--brand-600);
  color: #fff;
}
.case-mobile-bottom-bar .case-mobile-tab-action-label {
  font-size: 10px;
  font-weight: 600;
  line-height: 1.2;
  text-align: center;
  color: var(--foreground);
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.surgical-case-motion .case-mobile-bottom-bar .case-mobile-tab-action {
  transition: opacity 0.12s ease;
}
.surgical-case-motion .case-mobile-bottom-bar .case-mobile-tab-action:hover {
  filter: none;
}
.surgical-case-motion .case-mobile-bottom-bar .case-mobile-tab-action:active {
  transform: none;
  opacity: 0.72;
}
.case-mobile-overview-panel .case-wf-progress {
  margin: 0;
  border-radius: 0;
  border-left: none;
  border-right: none;
  border-top: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
}
.case-wf-progress {
  margin: 0;
  border: none;
  border-radius: 0;
  background: #fff;
  overflow: hidden;
}
.case-wf-progress-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 10px;
  border-bottom: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
}
.case-wf-progress-kicker {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted);
}
.case-wf-progress-summary {
  font-size: 11px;
  font-weight: 700;
  color: var(--muted);
  white-space: nowrap;
}
.case-wf-progress-list {
  margin: 0;
  padding: 0;
  list-style: none;
}
.case-wf-progress-row {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 8px;
  align-items: center;
  padding: 8px 10px;
  border-bottom: 1px solid color-mix(in srgb, var(--foreground) 5%, var(--border));
  min-width: 0;
}
.case-wf-progress-row:last-child {
  border-bottom: none;
}
.case-wf-progress-row[data-active="true"] {
  background: color-mix(in srgb, var(--brand-600) 6%, var(--surface));
}
.case-wf-progress-dot {
  width: 14px;
  height: 14px;
  border-radius: 999px;
  border: 2px solid color-mix(in srgb, var(--foreground) 18%, var(--border));
  background: var(--surface);
  flex-shrink: 0;
}
.case-wf-progress-dot--active {
  border-color: var(--brand-600);
  background: color-mix(in srgb, var(--brand-600) 18%, var(--surface));
}
.case-wf-progress-dot--done {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border: none;
  background: var(--brand-600);
  color: #fff;
}
.case-wf-progress-main {
  min-width: 0;
  display: grid;
  gap: 2px;
}
.case-wf-progress-title {
  font-size: 12px;
  font-weight: 800;
  line-height: 1.3;
  color: var(--foreground);
}
.case-wf-progress-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: center;
  font-size: 10px;
  font-weight: 650;
  color: var(--muted);
  line-height: 1.3;
}
.case-wf-progress-chevron {
  font-size: 16px;
  line-height: 1;
  color: var(--muted);
  flex-shrink: 0;
}
.case-wf-progress-cta {
  display: block;
  width: 100%;
  padding: 9px 10px !important;
  border: none !important;
  border-top: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border)) !important;
  border-radius: 0 !important;
  background: color-mix(in srgb, var(--foreground) 2%, var(--surface)) !important;
  color: var(--brand-700) !important;
  font-size: 12px !important;
  font-weight: 800 !important;
  text-align: center;
  box-shadow: none !important;
  touch-action: manipulation;
}
.case-mobile-panel {
  min-width: 0;
}
.case-mobile-dense-list {
  display: grid;
  background: var(--surface);
}
.case-mobile-dense-row {
  display: grid;
  grid-template-columns: 16px minmax(64px, 26%) 1fr;
  gap: 8px;
  padding: 7px 10px;
  border-bottom: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
  min-width: 0;
}
.case-phi-hide-mobile {
  display: block;
}
.case-resources-phi {
  margin: 0;
}
.case-resources-mobile-stack {
  display: grid;
  gap: 0;
}
.case-doc-row-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}
.case-mobile-dense-row:last-child {
  border-bottom: none;
}
.case-mobile-dense-icon {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 1px;
  color: var(--muted);
}
.case-mobile-dense-label {
  font-size: 11px;
  font-weight: 700;
  color: var(--muted);
  line-height: 1.35;
  padding-top: 1px;
}
.case-mobile-dense-value {
  font-size: 13px;
  font-weight: 700;
  line-height: 1.4;
  color: var(--foreground);
  word-break: break-word;
  min-width: 0;
}
.case-mobile-dense-value a {
  color: var(--foreground);
  text-decoration: none;
}
.case-mobile-section {
  border-bottom: 8px solid color-mix(in srgb, var(--foreground) 4%, var(--background));
}
.case-mobile-section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 12px 6px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--muted);
}
.case-mobile-section-note {
  font-size: 10px;
  font-weight: 700;
  text-transform: none;
  letter-spacing: 0;
  color: var(--muted);
}
.case-mobile-chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 0 12px 8px;
}
.case-mobile-chip {
  display: inline-flex;
  align-items: center;
  padding: 3px 8px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 800;
  border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
  background: color-mix(in srgb, var(--foreground) 2%, var(--surface));
  color: var(--foreground);
  text-decoration: none;
  white-space: nowrap;
}
.case-mobile-chip--brand {
  border-color: color-mix(in srgb, var(--brand-600) 20%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 6%, var(--surface));
  color: var(--brand-700);
}
.case-activity-note-composer {
  display: grid;
  gap: 8px;
  padding: 10px 12px;
  border-bottom: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
  background: var(--surface);
}
.case-activity-note-composer textarea {
  width: 100%;
  min-height: 72px;
  resize: vertical;
  box-sizing: border-box;
}
.case-activity-filter-row {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  padding: 8px 12px;
  border-bottom: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
  background: var(--surface);
}
.case-activity-filter-chip {
  flex: 0 0 auto;
  padding: 5px 10px !important;
  font-size: 11px !important;
  min-height: 30px !important;
  border-radius: 999px !important;
  border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border)) !important;
  background: var(--surface) !important;
  color: var(--muted) !important;
  font-weight: 700 !important;
  box-shadow: none !important;
}
.case-activity-filter-chip[aria-pressed="true"] {
  border-color: color-mix(in srgb, var(--brand-600) 24%, var(--border)) !important;
  background: color-mix(in srgb, var(--brand-600) 8%, var(--surface)) !important;
  color: var(--brand-700) !important;
}
.case-activity-timeline {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  background: var(--surface);
}
.case-activity-timeline-item {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 10px;
  padding: 12px;
  border-bottom: 1px solid color-mix(in srgb, var(--foreground) 5%, var(--border));
  min-width: 0;
}
.case-desktop-only {
  display: none !important;
}
@media (max-width: 1100px) {
  .case-workspace-two-col,
  .case-workspace-three-col,
  .case-overview-layout {
    grid-template-columns: 1fr;
  }
}
@media (min-width: 641px) {
  .case-overview-section > summary {
    cursor: default;
  }
  .case-overview-section:not([open]) > .case-overview-section-body {
    display: grid;
  }
}
@media (max-width: 400px) {
  .case-mobile-header-meta {
    flex-direction: column;
    align-items: flex-start;
    gap: 1px;
  }
  .case-mobile-header-meta-sep {
    display: none;
  }
  .case-mobile-header-meta-surgeon {
    white-space: normal;
    overflow: visible;
    text-overflow: unset;
  }
  .case-mobile-header-meta a {
    white-space: normal;
  }
  .case-mobile-dense-row {
    grid-template-columns: 14px minmax(58px, 30%) 1fr;
    gap: 6px;
    padding: 6px 8px;
  }
  .case-workspace-tabbar .case-workspace-tab {
    font-size: 11px !important;
    padding: 6px 1px !important;
  }
  .case-mobile-bottom-bar .case-mobile-tab-action-label {
    font-size: 11px;
  }
}
@media (max-width: 480px) {
  .case-detail-quick-actions > button,
  .case-detail-quick-actions > a { flex: 1 1 100%; }
}
.activity-audit-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
@media (max-width: 520px) {
  .activity-audit-cols { grid-template-columns: 1fr; }
}
.edit-case-two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
@media (max-width: 540px) {
  .edit-case-two-col { grid-template-columns: 1fr; }
}
.status-pick-list { display: grid; gap: 10px; }
.status-pick-list > button {
  width: 100%;
  min-height: 48px;
  justify-content: flex-start;
  touch-action: manipulation;
}
${surgicalCaseModalActionsCss}
.case-modal-shell-overlay {
  padding: max(12px, env(safe-area-inset-top, 0px)) max(12px, env(safe-area-inset-right, 0px))
    max(16px, env(safe-area-inset-bottom, 0px)) max(12px, env(safe-area-inset-left, 0px));
  touch-action: manipulation;
}
.case-modal-shell-panel {
  max-width: min(480px, calc(100vw - 24px));
  width: 100%;
}
.case-modal-shell-close {
  min-width: 44px;
  min-height: 44px;
  padding: 8px 12px;
  justify-content: center;
  touch-action: manipulation;
}
.case-detail-top-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
  align-items: center;
  touch-action: manipulation;
}
@media (max-width: 520px) {
  .case-detail-top-actions {
    width: 100%;
    justify-content: stretch;
    flex-direction: column;
    align-items: stretch;
  }
  .case-detail-top-actions > span { justify-content: center; }
  .case-detail-top-actions > button,
  .case-detail-top-actions > a {
    width: 100%;
    justify-content: center;
    min-height: 48px;
  }
}
.case-upload-pickers {
  display: grid;
  gap: 10px;
}
.case-upload-pick-btn {
  width: 100%;
  min-height: 52px;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: var(--surface);
  font-weight: 800;
  font-size: 15px;
  text-align: left;
  cursor: pointer;
  touch-action: manipulation;
}
.case-upload-pick-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.case-upload-pick-camera {
  display: none;
}
@media (pointer: coarse), (max-width: 720px) {
  .case-upload-pick-camera {
    display: block;
  }
}
.case-upload-selected {
  display: grid;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: color-mix(in srgb, var(--foreground) 3%, var(--surface));
}
.case-upload-selected img {
  width: 100%;
  max-height: 180px;
  object-fit: contain;
  border-radius: 8px;
  background: #fff;
}
`;

const detailSurfaceCard: React.CSSProperties = {
  border: "1px solid color-mix(in srgb, var(--foreground) 6%, var(--border))",
  borderRadius: 12,
  padding: 14,
  background: "var(--surface)",
  boxShadow: "0 1px 2px color-mix(in srgb, var(--foreground) 2%, transparent)",
};

function firstCaseText(caseRow: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = caseRow[key];
    if (value == null) continue;
    const text = String(value).trim();
    if (text) return text;
  }
  return "";
}

function supportTypeLabel(caseRow: Record<string, unknown>, observation: boolean): string {
  const explicit = firstCaseText(caseRow, ["support_type", "support_category", "service_type"]);
  if (explicit) return explicit;
  if (observation) return "Observation support";
  return "Field product support";
}

function OverviewMetaRow({
  label,
  value,
  mutedValue,
}: {
  label: string;
  value: React.ReactNode;
  mutedValue?: boolean;
}) {
  return (
    <div className="case-overview-meta-row">
      <div className="case-overview-label">{label}</div>
      <div className={`case-overview-value${mutedValue ? " case-overview-muted" : ""}`}>{value}</div>
    </div>
  );
}

function OverviewSection({
  title,
  summaryNote,
  children,
}: {
  title: string;
  summaryNote?: string;
  children: React.ReactNode;
}) {
  return (
    <details className="case-overview-section">
      <summary>
        <span>{title}</span>
        {summaryNote ? <span className="case-overview-section-summary-note">{summaryNote}</span> : null}
      </summary>
      <div className="case-overview-section-body">{children}</div>
    </details>
  );
}

function CompactInlineEmpty({
  title,
  description,
  actions,
}: {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="case-inline-empty">
      <div className="case-inline-empty-title">{title}</div>
      {description ? <div className="case-inline-empty-body">{description}</div> : null}
      {actions ? <div className="case-inline-empty-actions">{actions}</div> : null}
    </div>
  );
}

type CaseRowIconKind =
  | "org"
  | "surgeon"
  | "datetime"
  | "procedure"
  | "caseType"
  | "support"
  | "products"
  | "opportunity"
  | "owner"
  | "status";

function CaseRowIcon({ kind }: { kind: CaseRowIconKind }) {
  const stroke = "currentColor";
  const common = { width: 16, height: 16, viewBox: "0 0 24 24", fill: "none", stroke, strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (kind === "org") {
    return (
      <svg {...common} aria-hidden>
        <path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6" />
      </svg>
    );
  }
  if (kind === "surgeon") {
    return (
      <svg {...common} aria-hidden>
        <circle cx="12" cy="8" r="3" />
        <path d="M5 21v-1a5 5 0 0 1 10 0v1" />
      </svg>
    );
  }
  if (kind === "datetime") {
    return (
      <svg {...common} aria-hidden>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M16 3v4M8 3v4M3 11h18" />
      </svg>
    );
  }
  if (kind === "procedure") {
    return (
      <svg {...common} aria-hidden>
        <path d="M12 3v18M8 7h8M8 17h8" />
      </svg>
    );
  }
  if (kind === "products") {
    return (
      <svg {...common} aria-hidden>
        <path d="M21 8l-9-5-9 5v8l9 5 9-5V8z" />
        <path d="M12 3v18M3.5 8.5l8.5 5 8.5-5" />
      </svg>
    );
  }
  if (kind === "opportunity") {
    return (
      <svg {...common} aria-hidden>
        <path d="M12 2v20M17 7H9.5a3.5 3.5 0 0 0 0 7H14a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    );
  }
  if (kind === "owner") {
    return (
      <svg {...common} aria-hidden>
        <path d="M16 21v-2a4 4 0 0 0-8 0v2" />
        <circle cx="12" cy="8" r="3" />
        <path d="M20 8v6M23 11h-6" />
      </svg>
    );
  }
  return (
    <svg {...common} aria-hidden>
      <circle cx="12" cy="12" r="9" />
      {kind === "status" ? <path d="M8 12l2.5 2.5L16 9" /> : null}
    </svg>
  );
}

function CaseMobileDenseRow({
  icon,
  label,
  value,
  muted,
}: {
  icon: CaseRowIconKind;
  label: string;
  value: React.ReactNode;
  muted?: boolean;
}) {
  return (
    <div className="case-mobile-dense-row">
      <div className="case-mobile-dense-icon">
        <CaseRowIcon kind={icon} />
      </div>
      <div className="case-mobile-dense-label">{label}</div>
      <div className={`case-mobile-dense-value${muted ? " case-overview-muted" : ""}`}>{value}</div>
    </div>
  );
}

function ActivityNoteComposer({
  disabled,
  busy,
  onSave,
}: {
  disabled?: boolean;
  busy?: boolean;
  onSave: (body: string) => Promise<void>;
}) {
  const [body, setBody] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const submit = async () => {
    const trimmed = body.trim();
    if (!trimmed || disabled || saving) return;
    setSaving(true);
    try {
      await onSave(trimmed);
      setBody("");
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="case-activity-note-composer">
      <textarea
        value={body}
        onChange={(event) => setBody(event.target.value)}
        rows={3}
        disabled={disabled || saving || busy}
        placeholder="Add a case note…"
        style={{ ...sc.input, resize: "vertical" }}
        onKeyDown={(event) => {
          if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
            event.preventDefault();
            void submit();
          }
        }}
      />
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          type="button"
          style={{
            ...(body.trim() ? sc.btnPrimary : sc.btnSecondary),
            minHeight: 36,
            padding: "7px 14px",
            fontSize: 12,
          }}
          disabled={disabled || saving || busy || !body.trim()}
          onClick={() => void submit()}
        >
          {saving ? "Saving…" : "Add note"}
        </button>
      </div>
    </div>
  );
}

function observationStageStatus(filled: number, total: number): "Not started" | "In progress" | "Complete" {
  if (filled <= 0) return "Not started";
  if (filled >= total && total > 0) return "Complete";
  return "In progress";
}

type ActivityFeedFilterId = (typeof ACTIVITY_FEED_FILTERS)[number]["id"];
type ActivityFeedCategory = Exclude<ActivityFeedFilterId, "all">;

type TimelineRow =
  | { kind: "activity"; a: ActivityRow }
  | { kind: "case_created"; id: string; created_at: string; actor: string };

type ActivityFeedItem = {
  id: string;
  category: ActivityFeedCategory;
  activityType: string;
  typeLabel: string;
  title: string;
  timestamp: string;
  userLabel: string;
  details?: string;
  meta?: Record<string, unknown>;
  metaChips?: string[];
  pulseId?: string | null;
};

function buildTimelineRows(activities: ActivityRow[] | undefined, caseRow: Record<string, unknown>, defaultActor: string): TimelineRow[] {
  const acts = [...(activities || [])];
  const hasCreated = acts.some((x) => String(x.activity_type).toLowerCase() === "case_created");
  const createdAt = caseRow.created_at ? String(caseRow.created_at) : "";
  const rows: TimelineRow[] = [];
  if (!hasCreated && createdAt) {
    rows.push({ kind: "case_created", id: "__case_created__", created_at: createdAt, actor: defaultActor });
  }
  for (const a of acts) {
    rows.push({ kind: "activity", a });
  }
  rows.sort((x, y) => {
    const tx = x.kind === "case_created" ? x.created_at : x.a.created_at;
    const ty = y.kind === "case_created" ? y.created_at : y.a.created_at;
    return new Date(tx).getTime() - new Date(ty).getTime();
  });
  return rows;
}

function activityAuditMeta(meta: Record<string, unknown> | undefined): { prev: unknown; next: unknown } | null {
  const prev = meta?.previous_values;
  const next = meta?.new_values;
  const hasPrev = prev != null && typeof prev === "object" && Object.keys(prev as object).length > 0;
  const hasNext = next != null && typeof next === "object" && Object.keys(next as object).length > 0;
  if (!hasPrev && !hasNext) return null;
  return { prev: hasPrev ? prev : null, next: hasNext ? next : null };
}

function ActivityAuditFootnote({ meta }: { meta: Record<string, unknown> | undefined }) {
  const pair = activityAuditMeta(meta);
  if (!pair) return null;
  return (
    <details style={{ marginTop: 10 }}>
      <summary style={{ cursor: "pointer", fontSize: 12, fontWeight: 800, color: "var(--muted)" }}>Before / after (audit)</summary>
      <div
        className="activity-audit-cols"
        style={{
          marginTop: 8,
          fontSize: 11,
          fontFamily: "ui-monospace, monospace",
          lineHeight: 1.45,
        }}
      >
        <div>
          <div style={{ fontWeight: 800, marginBottom: 4, color: "var(--muted)" }}>Previous</div>
          <pre
            style={{
              margin: 0,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              maxHeight: 200,
              overflow: "auto",
              padding: 8,
              borderRadius: 8,
              background: "color-mix(in srgb, var(--foreground) 4%, var(--surface))",
            }}
          >
            {pair.prev != null ? JSON.stringify(pair.prev, null, 2) : "—"}
          </pre>
        </div>
        <div>
          <div style={{ fontWeight: 800, marginBottom: 4, color: "var(--muted)" }}>New</div>
          <pre
            style={{
              margin: 0,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              maxHeight: 200,
              overflow: "auto",
              padding: 8,
              borderRadius: 8,
              background: "color-mix(in srgb, var(--foreground) 4%, var(--surface))",
            }}
          >
            {pair.next != null ? JSON.stringify(pair.next, null, 2) : "—"}
          </pre>
        </div>
      </div>
    </details>
  );
}

function activityChangedKeys(meta: Record<string, unknown> | undefined): string[] {
  const keys = new Set<string>();
  const prev = meta?.previous_values;
  const next = meta?.new_values;
  const fields = meta?.fields;
  if (prev && typeof prev === "object") {
    Object.keys(prev).forEach((key) => keys.add(key));
  }
  if (next && typeof next === "object") {
    Object.keys(next).forEach((key) => keys.add(key));
  }
  if (Array.isArray(fields)) {
    fields.forEach((field) => {
      if (typeof field === "string" && field.trim()) keys.add(field.trim());
    });
  }
  return [...keys];
}

function activityFieldLabel(key: string): string {
  const normalized = String(key || "").trim();
  if (!normalized) return "Field";
  if (OBSERVATION_AUDIT_LABELS[normalized]) return OBSERVATION_AUDIT_LABELS[normalized];
  return normalized.replace(/_/g, " ").replace(/\b\w/g, (match) => match.toUpperCase());
}

function hasAnyActivityKey(keys: readonly string[], candidates: readonly string[]): boolean {
  return keys.some((key) => candidates.includes(key as ObservationWorkflowFieldKey | "notes"));
}

function activityFeedCategoryLabel(category: ActivityFeedCategory): string {
  if (category === "notes") return "Notes";
  if (category === "discovery") return "Discovery";
  if (category === "workflow") return "Workflow";
  if (category === "products") return "Products";
  if (category === "documents") return "Documents";
  return "System";
}

function formatStatusChangeSnippet(meta: Record<string, unknown> | undefined): string {
  const next = meta?.new_values;
  if (!next || typeof next !== "object") return "";
  const status = (next as { status?: unknown }).status;
  return typeof status === "string" && status.trim() ? `New status: ${formatSurgicalCaseStatus(status)}` : "";
}

function buildActivityFeedItems(
  activities: ActivityRow[] | undefined,
  caseRow: Record<string, unknown>,
  defaultActor: string
): ActivityFeedItem[] {
  const items: ActivityFeedItem[] = [];
  const timelineRows = buildTimelineRows(activities, caseRow, defaultActor);
  const caseNotes = String(caseRow.notes || "").trim();
  const caseNotesTimestamp = String(caseRow.updated_at || caseRow.created_at || "").trim();

  if (caseNotes && caseNotesTimestamp) {
    items.push({
      id: "__case_notes__",
      category: "notes",
      activityType: "case_notes",
      typeLabel: "Notes",
      title: "Notes on record",
      timestamp: caseNotesTimestamp,
      userLabel: defaultActor || "Case record",
      details: caseNotes,
      pulseId: null,
    });
  }

  for (const row of timelineRows) {
    if (row.kind === "case_created") {
      items.push({
        id: row.id,
        category: "system",
        activityType: "case_created",
        typeLabel: "System",
        title: "Case created",
        timestamp: row.created_at,
        userLabel: row.actor,
        pulseId: null,
      });
      continue;
    }

    const activity = row.a;
    const rawType = String(activity.activity_type || "").trim().toLowerCase();
    const changedKeys = activityChangedKeys(activity.metadata_json);
    const workflowKeys = [
      ...CASE_OBSERVATION_GOAL_KEYS,
      ...OBSERVATION_LIVE_KEYS,
      ...OBSERVATION_DEBRIEF_KEYS,
    ] as readonly ObservationWorkflowFieldKey[];

    let category: ActivityFeedCategory = "system";
    let title = formatSurgicalCaseActivityType(activity.activity_type);

    if (rawType === "note") {
      category = "notes";
      title = "Note added";
    } else if (rawType === "provider_intelligence_promoted") {
      category = "workflow";
      title = "Provider intelligence updated from case";
    } else if (rawType === "pre_call_plan_created") {
      category = "workflow";
      title = "Pre-Call Plan created";
    } else if (rawType === "pre_call_plan_updated") {
      category = "workflow";
      title = "Pre-Call Plan updated";
    } else if (rawType === "pre_call_plan_completed") {
      category = "workflow";
      title = "Pre-Call Plan completed";
    } else if (
      rawType === "clinical_discovery_insight_from_case"
      || (activity.metadata_json &&
        typeof activity.metadata_json === "object" &&
        (activity.metadata_json as { activity_category?: string }).activity_category === "discovery")
    ) {
      category = "discovery";
      title =
        rawType === "clinical_discovery_insight_from_case"
          ? "Provider discovery insight added"
          : "Clinical discovery updated";
    } else if (rawType === "document_uploaded") {
      category = "documents";
      title = "Document uploaded";
    } else if (rawType === "document_deleted") {
      category = "documents";
      title = "Document removed";
    } else if (rawType === "product_updated") {
      category = "products";
      title = "Product added";
    } else if (rawType === "case_updated") {
      if (changedKeys.includes("notes")) {
        category = "notes";
        title = "Case notes updated";
      } else if (hasAnyActivityKey(changedKeys, OBSERVATION_ROUTING_KEYS)) {
        category = "workflow";
        title = changedKeys.includes("debrief_recommended_next_stage") || changedKeys.includes("related_opportunity_id")
          ? "Next move routing updated"
          : "Outcome routing updated";
      } else if (hasAnyActivityKey(changedKeys, OBSERVATION_FOLLOW_UP_KEYS)) {
        category = "workflow";
        title = changedKeys.includes("debrief_suggested_next_action") ? "Suggested next action updated" : "Follow-up updated";
      } else if (hasAnyActivityKey(changedKeys, OBSERVATION_DEBRIEF_CORE_KEYS)) {
        category = "workflow";
        title = "Debrief updated";
      } else if (hasAnyActivityKey(changedKeys, PRE_CALL_PLAN_ACTIVITY_KEYS)) {
        category = "workflow";
        title = "Pre-Call Plan updated (engagement)";
      } else if (hasAnyActivityKey(changedKeys, OBSERVATION_LIVE_KEYS)) {
        category = "workflow";
        title = changedKeys.length === 1 ? "Workflow step completed" : "Live observation updated";
      } else if (changedKeys.includes("product_id")) {
        category = "products";
        title = "Primary product updated";
      } else if (hasAnyActivityKey(changedKeys, workflowKeys)) {
        category = "workflow";
        title = "Workflow updated";
      } else {
        title = "Case details updated";
      }
    } else if (rawType === "status_change") {
      category = "system";
      title = "Status changed";
    } else if (rawType === "billing_update" || rawType === "case_created") {
      category = "system";
    }

    const detailLines: string[] = [];
    const body = String(activity.body || "").trim();
    if (rawType === "case_updated") {
      const labels = changedKeys.map(activityFieldLabel);
      if (labels.length > 0) detailLines.push(`Updated: ${labels.join(", ")}.`);
    } else if (rawType === "status_change") {
      const statusDetail = formatStatusChangeSnippet(activity.metadata_json);
      if (statusDetail) detailLines.push(statusDetail);
    }
    if (rawType === "clinical_discovery_insight_from_case") {
      const qLabel = (activity.metadata_json as { question_label?: string } | undefined)?.question_label;
      if (qLabel && !detailLines.includes(qLabel)) detailLines.push(qLabel);
    }
    if (body && !detailLines.includes(body)) detailLines.push(body);

    const metaChips =
      rawType === "case_updated" && changedKeys.length > 0
        ? changedKeys.map(activityFieldLabel).slice(0, 4)
        : undefined;

    items.push({
      id: activity.id,
      category,
      activityType: rawType || "activity",
      typeLabel: activityFeedCategoryLabel(category),
      title,
      timestamp: activity.created_at,
      userLabel: activity.actor_display_name ?? activity.user_id,
      details: detailLines.join("\n"),
      meta: activity.metadata_json,
      metaChips,
      pulseId: activity.id,
    });
  }

  items.sort((left, right) => new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime());
  return items;
}

function TimelineGlyph({ activityType }: { activityType: string }) {
  const t = activityType.toLowerCase();
  const wrap: React.CSSProperties = {
    width: 36,
    height: 36,
    borderRadius: 10,
    display: "grid",
    placeItems: "center",
    flexShrink: 0,
    fontSize: 16,
    lineHeight: 1,
  };
  if (t === "case_created") return <div style={{ ...wrap, background: "color-mix(in srgb, var(--brand-600) 14%, var(--surface))" }}>✦</div>;
  if (t === "status_change") return <div style={{ ...wrap, background: "color-mix(in srgb, #7c3aed 14%, var(--surface))" }}>↻</div>;
  if (t === "note") return <div style={{ ...wrap, background: "color-mix(in srgb, #0d9488 14%, var(--surface))" }}>✎</div>;
  if (t === "document_uploaded" || t === "document_deleted")
    return <div style={{ ...wrap, background: "color-mix(in srgb, #2563eb 12%, var(--surface))" }}>📄</div>;
  if (t === "product_updated") return <div style={{ ...wrap, background: "color-mix(in srgb, #ea580c 12%, var(--surface))" }}>◫</div>;
  if (t === "billing_update") return <div style={{ ...wrap, background: "color-mix(in srgb, #ca8a04 14%, var(--surface))" }}>$</div>;
  if (t === "case_updated") return <div style={{ ...wrap, background: "color-mix(in srgb, #0f766e 14%, var(--surface))" }}>⌁</div>;
  if (t === "pre_call_plan_created" || t === "pre_call_plan_updated" || t === "pre_call_plan_completed") {
    return <div style={{ ...wrap, background: "color-mix(in srgb, #0369a1 14%, var(--surface))" }}>☎</div>;
  }
  return <div style={{ ...wrap, background: "color-mix(in srgb, var(--foreground) 8%, var(--surface))" }}>•</div>;
}

function documentTypeGlyph(documentType: string): string {
  const s = documentType.toLowerCase();
  if (s === "purchase_order") return "PO";
  if (s === "invoice") return "INV";
  if (s === "packing_slip") return "PS";
  if (s === "consignment_form") return "CF";
  if (s === "implant_log") return "IL";
  return "DOC";
}

function documentIconColor(documentType: string): { bg: string; fg: string } {
  const s = documentType.toLowerCase();
  if (s === "purchase_order") return { bg: "color-mix(in srgb, #2563eb 14%, var(--surface))", fg: "#1d4ed8" };
  if (s === "invoice") return { bg: "color-mix(in srgb, #0d9488 14%, var(--surface))", fg: "#0f766e" };
  if (s === "packing_slip") return { bg: "color-mix(in srgb, var(--foreground) 8%, var(--surface))", fg: "var(--muted)" };
  return { bg: "color-mix(in srgb, var(--brand-600) 10%, var(--surface))", fg: "var(--brand-700)" };
}

export default function SurgicalCaseDetailPortalClient({ caseId }: { caseId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const captureIntelligence = useCaptureIntelligence();
  const [data, setData] = React.useState<DetailJson | null>(null);
  const [err, setErr] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);
  const [dataWarnings, setDataWarnings] = React.useState<string[]>([]);

  const [editOpen, setEditOpen] = React.useState(false);
  const [addLineOpen, setAddLineOpen] = React.useState(false);
  const [uploadOpen, setUploadOpen] = React.useState(false);
  const [uploadPresetType, setUploadPresetType] = React.useState<string>("purchase_order");
  const [uploadLockType, setUploadLockType] = React.useState(false);
  const [statusOpen, setStatusOpen] = React.useState(false);
  const [noteOpen, setNoteOpen] = React.useState(false);
  const [workspaceTab, setWorkspaceTab] = React.useState<CaseWorkspaceTab>("overview");
  const [observationDictationRequest, setObservationDictationRequest] = React.useState(0);
  const [intelligenceProcessingStartedAtMs, setIntelligenceProcessingStartedAtMs] = React.useState<number | null>(null);
  const [pendingIntelligenceNoteId, setPendingIntelligenceNoteId] = React.useState<string | null>(null);
  const [observationRescheduleOpen, setObservationRescheduleOpen] = React.useState(false);
  const [observationCancelConfirmOpen, setObservationCancelConfirmOpen] = React.useState(false);
  const [convertToSupportConfirmOpen, setConvertToSupportConfirmOpen] = React.useState(false);
  const [productSupportTab, setProductSupportTab] = React.useState<ProductSupportWorkspaceTabId>("briefing");

  const goToWorkflowStage = React.useCallback((_stageId?: ObservationWorkflowStageId | "pre") => {
    setWorkspaceTab("workflow");
  }, []);

  const openPromoteProviderIntelligence = React.useCallback(() => {
    setPromoteIntelOpen(true);
  }, []);
  const openAddCaseInsight = React.useCallback(() => {
    setDiscoveryInsightOpen(true);
  }, []);
  const [deletingDocId, setDeletingDocId] = React.useState<string | null>(null);
  const [completionAffirmation, setCompletionAffirmation] = React.useState(false);
  const [docProgressPulse, setDocProgressPulse] = React.useState(false);
  const [caseArchiveModal, setCaseArchiveModal] = React.useState<"archive" | "restore" | null>(null);
  const [caseArchiveBusy, setCaseArchiveBusy] = React.useState(false);
  const [mobileActionSheetOpen, setMobileActionSheetOpen] = React.useState(false);
  const [promoteIntelOpen, setPromoteIntelOpen] = React.useState(false);
  const [discoveryInsightOpen, setDiscoveryInsightOpen] = React.useState(false);
  const handleBriefingSaved = React.useCallback((savedCase: Record<string, unknown>) => {
    setData((prev) => (prev?.case ? { ...prev, case: { ...prev.case, ...savedCase } } : prev));
  }, []);

  const [accounts, setAccounts] = React.useState<{ id: string; name?: string | null }[]>([]);
  const [products, setProducts] = React.useState<{ id: string; name: string }[]>([]);

  const shortcutsBlockedRef = React.useRef(false);

  const detailHasCompletedPendingNote = React.useCallback((detail: DetailJson | null, noteId: string | null): boolean => {
    if (!noteId) return false;
    return Boolean(
      detail?.activities?.some((activity) => {
        const metadata = activity.metadata_json;
        if (!metadata || typeof metadata !== "object") return false;
        const metadataNoteId = String(metadata.note_id ?? "").trim();
        const activityId = String(activity.id ?? "").trim();
        if (metadataNoteId !== noteId && activityId !== noteId) return false;
        return Boolean(metadata.ai_extraction) || metadata.intelligence_processing === false;
      }),
    );
  }, []);

  const detailHasServerPendingIntelligence = React.useCallback((detail: DetailJson | null): boolean => {
    return Boolean(
      detail?.activities?.some((activity) => {
        const metadata = activity.metadata_json;
        if (!metadata || typeof metadata !== "object") return false;
        return metadata.intelligence_processing === true && !metadata.ai_extraction;
      }),
    );
  }, []);

  const load = React.useCallback(async () => {
    setErr(null);
    const res = await fetch(`/api/portal/sales/surgical-cases/${encodeURIComponent(caseId)}`, { cache: "no-store" });
    const j = (await res.json()) as DetailJson;
    if (!res.ok || !j.ok || !j.case) throw new Error(j.error || "Not found");
    setData(j);
    if (pendingIntelligenceNoteId && detailHasCompletedPendingNote(j, pendingIntelligenceNoteId)) {
      setPendingIntelligenceNoteId(null);
      setIntelligenceProcessingStartedAtMs(null);
    } else if (!pendingIntelligenceNoteId) {
      if (detailHasServerPendingIntelligence(j)) {
        setIntelligenceProcessingStartedAtMs((prev) => prev ?? Date.now());
      } else {
        setIntelligenceProcessingStartedAtMs(null);
      }
    }
  }, [caseId, detailHasCompletedPendingNote, detailHasServerPendingIntelligence, pendingIntelligenceNoteId]);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        await load();
      } catch (e: unknown) {
        if (!cancelled) setErr(userFacingError(e, "We could not load this page. Please try again."));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  React.useEffect(() => {
    if (!intelligenceProcessingStartedAtMs) return;
    let cancelled = false;
    const interval = window.setInterval(() => {
      if (cancelled) return;
      void load().catch((error: unknown) => {
        console.error("[case intelligence polling]", error);
      });
    }, 2500);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [intelligenceProcessingStartedAtMs, load]);

  React.useEffect(() => {
    if (searchParams.get("openNote") !== "1") return;
    setNoteOpen(true);
    const next = new URLSearchParams(searchParams.toString());
    next.delete("openNote");
    const qs = next.toString();
    router.replace(`/portal/sales/cases/${encodeURIComponent(caseId)}${qs ? `?${qs}` : ""}`, { scroll: false });
  }, [caseId, router, searchParams]);

  React.useEffect(() => {
    const uploadRaw = (searchParams.get("upload") || "").trim().toLowerCase();
    if (!uploadRaw) return;
    const alias: Record<string, string> = {
      po: "purchase_order",
      purchase_order: "purchase_order",
      inv: "invoice",
      invoice: "invoice",
    };
    let docType = alias[uploadRaw];
    if (!docType && (SURGICAL_CASE_DOCUMENT_TYPES as readonly string[]).includes(uploadRaw as (typeof SURGICAL_CASE_DOCUMENT_TYPES)[number])) {
      docType = uploadRaw;
    }
    const next = new URLSearchParams(searchParams.toString());
    next.delete("upload");
    const qs = next.toString();
    const path = `/portal/sales/cases/${encodeURIComponent(caseId)}${qs ? `?${qs}` : ""}`;
    if (!docType) {
      router.replace(path, { scroll: false });
      return;
    }
    setUploadPresetType(docType);
    setUploadLockType(docType === OBSERVATION_FORM_DOCUMENT_TYPE);
    setUploadOpen(true);
    router.replace(path, { scroll: false });
  }, [caseId, router, searchParams]);

  React.useEffect(() => {
    try {
      const k = `surgical-case-warnings:${caseId}`;
      const raw = sessionStorage.getItem(k);
      if (!raw) return;
      sessionStorage.removeItem(k);
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed) && parsed.every((x) => typeof x === "string")) {
        setDataWarnings(parsed);
      }
    } catch {
      /* ignore */
    }
  }, [caseId]);

  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (shortcutsBlockedRef.current) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      if (!el) return;
      if (el.closest('[role="dialog"]')) return;
      const tag = el.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable) return;
      const k = e.key.toLowerCase();
      if (k === "n") {
        e.preventDefault();
        setNoteOpen(true);
      } else if (k === "u" && !isSurgicalObservationCase((data?.case?.case_type as string | null | undefined) ?? null)) {
        e.preventDefault();
        setUploadPresetType("purchase_order");
        setUploadLockType(false);
        setUploadOpen(true);
      } else if (k === "s") {
        e.preventDefault();
        setStatusOpen(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const refresh = async () => {
    try {
      await load();
    } catch (e: unknown) {
      setErr(userFacingError(e, "We could not refresh this page. Please try again."));
    }
  };

  const patchCase = async (body: Record<string, unknown>): Promise<boolean> => {
    const prevStatus = String((data?.case as Record<string, unknown> | undefined)?.status ?? "");
    setBusy(true);
    setMsg(null);
    setDataWarnings([]);
    try {
      const res = await fetch(`/api/portal/sales/surgical-cases/${encodeURIComponent(caseId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = (await res.json()) as { ok?: boolean; error?: unknown; warnings?: unknown; case?: Record<string, unknown> };
      if (!res.ok || !j.ok) {
        setMsg(typeof j.error === "string" ? j.error : "Update failed");
        return false;
      }
      const savedCase = j.case;
      if (savedCase && data?.case) {
        setData((prev) => (prev?.case ? { ...prev, case: { ...prev.case, ...savedCase } } : prev));
      }
      const nextSt =
        savedCase?.status !== undefined
          ? String(savedCase.status).toLowerCase()
          : body.status !== undefined
            ? String(body.status).toLowerCase()
            : prevStatus.toLowerCase();
      if (body.status !== undefined && nextSt === "completed" && prevStatus.toLowerCase() !== "completed") {
        setCompletionAffirmation(true);
        window.setTimeout(() => setCompletionAffirmation(false), 3200);
        const completedCaseType = (savedCase?.case_type ?? data?.case?.case_type) as string | null | undefined;
      }
      const w = j.warnings;
      const rawWarnings = Array.isArray(w) && w.every((x) => typeof x === "string") ? (w as string[]) : [];
      const savedCaseType = (savedCase?.case_type ?? data?.case?.case_type) as string | null | undefined;
      setDataWarnings(filterSurgicalCaseDetailWarnings(rawWarnings, isSurgicalObservationCase(savedCaseType)));
      setMsg("Saved.");
      if (!savedCase) await refresh();
      return true;
    } catch (e: unknown) {
      setMsg(userFacingError(e));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const openEdit = async () => {
    setMsg(null);
    try {
      const [aRes, pRes] = await Promise.all([
        fetch("/api/portal/sales/surgical-accounts", { cache: "no-store" }),
        fetch("/api/portal/sales/surgical-catalog/products", { cache: "no-store" }),
      ]);
      const aJson = (await aRes.json()) as { organizations?: { id: string; name?: string | null }[] };
      const pJson = (await pRes.json()) as { products?: { id: string; name: string }[] };
      setAccounts(aJson.organizations || []);
      setProducts(pJson.products || []);
    } catch {
      setAccounts([]);
      setProducts([]);
    }
    setEditOpen(true);
  };

  const openAddLine = async () => {
    setMsg(null);
    const pRes = await fetch("/api/portal/sales/surgical-catalog/products", { cache: "no-store" });
    const pJson = (await pRes.json()) as { products?: { id: string; name: string }[] };
    setProducts(pJson.products || []);
    setAddLineOpen(true);
  };

  const downloadDoc = async (docId: string) => {
    const res = await fetch(
      `/api/portal/sales/surgical-cases/${encodeURIComponent(caseId)}/documents/${encodeURIComponent(docId)}/download`,
      { cache: "no-store" }
    );
    const j = (await res.json()) as { ok?: boolean; url?: string; error?: string };
    if (!res.ok || !j.ok || !j.url) {
      setMsg(j.error || "Download failed");
      return;
    }
    window.open(j.url, "_blank", "noopener,noreferrer");
  };

  const deleteDoc = async (docId: string) => {
    if (!window.confirm("Remove this document from the case?")) return;
    setDeletingDocId(docId);
    setMsg(null);
    try {
      const res = await fetch(`/api/portal/sales/surgical-cases/${encodeURIComponent(caseId)}/documents/${encodeURIComponent(docId)}`, {
        method: "DELETE",
      });
      const j = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !j.ok) throw new Error(j.error || "Delete failed");
      setMsg("Document removed.");
      await refresh();
    } catch (e: unknown) {
      setMsg(userFacingError(e, "We could not delete that. Please try again."));
    } finally {
      setDeletingDocId(null);
    }
  };

  const buildLegacyCaseFeed = React.useCallback((): UnifiedActivityFeedItem[] => {
    if (!data?.case) return [];
    const caseRow = data.case as Record<string, unknown>;
    const legacy = buildActivityFeedItems(data.activities, caseRow, data.sales_rep?.display_name ?? "Rep");
    return legacy.map((item) => ({
      id: item.id,
      category: (item.category === "discovery" ? "workflow" : item.category) as UnifiedActivityFeedItem["category"],
      title: item.title,
      summary: item.details || item.title,
      timestamp: item.timestamp,
      userLabel: item.userLabel,
      metaChips: item.metaChips,
      metadata: item.meta,
      pulseId: item.pulseId,
      isLegacyFallback: true,
    }));
  }, [data?.activities, data?.case, data?.sales_rep?.display_name]);

  const activityFeedRefreshKey = `${data?.activities?.length ?? 0}:${String((data?.case as Record<string, unknown> | undefined)?.updated_at ?? "")}`;
  const {
    items: unifiedActivityFeedItems,
    source: activityFeedSource,
    loading: activityFeedLoading,
    reload: reloadActivityFeed,
  } = useUnifiedActivityFeed({
    entityType: "case",
    entityId: caseId,
    buildLegacyFallback: buildLegacyCaseFeed,
    refreshKey: activityFeedRefreshKey,
  });

  const [activityFilter, setActivityFilter] = React.useState<UnifiedActivityFeedFilterId>("all");

  const [timelinePulseIds, setTimelinePulseIds] = React.useState<Set<string>>(() => new Set());
  const timelineSeenRef = React.useRef<Set<string>>(new Set());
  const timelineInitRef = React.useRef(false);

  React.useEffect(() => {
    const acts = data?.activities;
    if (!Array.isArray(acts)) return;
    const ids = acts.map((a) => a.id);
    if (!timelineInitRef.current) {
      if (ids.length === 0) return;
      timelineInitRef.current = true;
      timelineSeenRef.current = new Set(ids);
      return;
    }
    const prevSeen = timelineSeenRef.current;
    const newIds = ids.filter((id) => !prevSeen.has(id));
    timelineSeenRef.current = new Set([...prevSeen, ...ids]);
    if (newIds.length === 0) return;
    setTimelinePulseIds((prev) => {
      const next = new Set(prev);
      for (const id of newIds) next.add(id);
      return next;
    });
    const t = window.setTimeout(() => {
      setTimelinePulseIds((prev) => {
        const next = new Set(prev);
        for (const id of newIds) next.delete(id);
        return next;
      });
    }, 1300);
    return () => window.clearTimeout(t);
  }, [data?.activities]);

  const detailStatusFlashRef = React.useRef<string | null>(null);
  const [overviewCompleteFlash, setOverviewCompleteFlash] = React.useState(false);
  React.useEffect(() => {
    if (!data?.case) return;
    const s = String((data.case as Record<string, unknown>).status ?? "").trim();
    const prev = detailStatusFlashRef.current;
    if (prev === null) {
      detailStatusFlashRef.current = s;
      return;
    }
    if (s.toLowerCase() === "completed" && prev.toLowerCase() !== "completed") {
      setOverviewCompleteFlash(true);
      const t = window.setTimeout(() => setOverviewCompleteFlash(false), 650);
      detailStatusFlashRef.current = s;
      return () => window.clearTimeout(t);
    }
    detailStatusFlashRef.current = s;
    return undefined;
  }, [data?.case]);

  const caseRowForHooks = data?.case as Record<string, unknown> | undefined;
  const observationNoteCount = (data?.activities || []).filter(
    (activity) => String(activity.activity_type).toLowerCase() === "note"
  ).length;
  const isObservationCaseForHooks = caseRowForHooks
    ? isSurgicalObservationCase(caseRowForHooks.case_type as string | null | undefined)
    : false;
  const preCallPlanContext = React.useMemo((): PreCallPlanContext => {
    const surgeonRow = data?.surgeon as Record<string, unknown> | undefined;
    return {
      hospitalDefault: data?.account?.name ?? null,
      surgeonDefault: surgeonRow ? providerDisplayNameFromRow(surgeonRow) : null,
    };
  }, [data?.account?.name, data?.surgeon]);

  const mobileWorkflowStages = React.useMemo(
    () =>
      caseRowForHooks && isObservationCaseForHooks
        ? buildMobileWorkflowStageRows(caseRowForHooks, observationNoteCount, preCallPlanContext)
        : [],
    [caseRowForHooks, isObservationCaseForHooks, observationNoteCount, preCallPlanContext]
  );
  const linkedOpportunityHrefForHooks = caseRowForHooks?.related_opportunity_id
    ? `/portal/sales/opportunities/${encodeURIComponent(String(caseRowForHooks.related_opportunity_id))}`
    : null;
  const caseArchivedForHooks = caseRowForHooks ? Boolean(caseRowForHooks.archived_at) : false;
  const mobileHeaderChips = React.useMemo((): MobileHeaderChip[] => {
    if (!caseRowForHooks) return [];
    const chips: MobileHeaderChip[] = [];
    if (isObservationCaseForHooks) {
      if (caseArchivedForHooks) {
        chips.push({ id: "archived", label: "Archived" });
      }
    } else if (caseRowForHooks.case_type) {
      chips.push({
        id: "case-type",
        label: formatSurgicalCaseType(caseRowForHooks.case_type as string | null | undefined),
        brand: true,
      });
    }
    if (linkedOpportunityHrefForHooks) {
      chips.push({
        id: "opportunity",
        label: OPPORTUNITY_UI.linkedFieldLabel,
        href: linkedOpportunityHrefForHooks,
        brand: true,
      });
    }
    if (caseArchivedForHooks) {
      chips.push({ id: "archived", label: "Archived" });
    }
    return chips;
  }, [
    caseRowForHooks,
    isObservationCaseForHooks,
    caseRowForHooks?.case_type,
    linkedOpportunityHrefForHooks,
    caseArchivedForHooks,
  ]);

  const caseIdentity = React.useMemo(() => {
    if (!caseRowForHooks) {
      return buildCaseIdentity({});
    }
    const surgeonRow = (data?.surgeon as Record<string, unknown> | null) ?? null;
    const surgeonDisplayForIdentity = surgeonRow
      ? contactDisplayName(surgeonRow as Parameters<typeof contactDisplayName>[0])
      : "No clinician assigned";
    return buildCaseIdentity({
      case_type: caseRowForHooks.case_type as string | null | undefined,
      surgeon_display: surgeonDisplayForIdentity,
      surgeon_specialty: providerSpecialtyLabel(surgeonRow, data?.provider_intelligence ?? null),
      account_name: data?.account?.name ?? null,
      case_date: caseRowForHooks.case_date as string | null | undefined,
      case_time: (caseRowForHooks as { case_time?: string | null }).case_time ?? null,
      status: caseRowForHooks.status as string | null | undefined,
      observation_access_pathway: caseRowForHooks.observation_access_pathway as string | null | undefined,
      observation_access_scheduling_owner: caseRowForHooks.observation_access_scheduling_owner as
        | string
        | null
        | undefined,
      observation_access_credentialing: caseRowForHooks.observation_access_credentialing as string | null | undefined,
      case_number: caseRowForHooks.case_number as string | null | undefined,
      procedure_type: (caseRowForHooks as { procedure_type?: string | null }).procedure_type ?? null,
      noteCount: observationNoteCount,
      providerContact: surgeonRow,
      providerIntelligence: data?.provider_intelligence ?? null,
      priorObservationCases: data?.provider_prior_observation_cases ?? [],
    });
  }, [
    caseRowForHooks,
    data?.account?.name,
    data?.provider_intelligence,
    data?.provider_prior_observation_cases,
    data?.surgeon,
    observationNoteCount,
  ]);

  const linkedProviderIdForInsight = React.useMemo(() => {
    const fromSurgeon = data?.surgeon
      ? String((data.surgeon as { id?: string }).id || "").trim()
      : "";
    if (fromSurgeon) return fromSurgeon;
    const fromCase = caseRowForHooks?.surgeon_contact_id
      ? String(caseRowForHooks.surgeon_contact_id).trim()
      : "";
    return fromCase || null;
  }, [data?.surgeon, caseRowForHooks?.surgeon_contact_id]);
  const providerOverviewHref = linkedProviderIdForInsight
    ? buildProviderOverviewHref(linkedProviderIdForInsight)
    : undefined;
  const providerIntelligence = data?.provider_intelligence;
  const caseArchivedForInsight = Boolean(
    (data?.case as Record<string, unknown> | undefined)?.archived_at,
  );
  const canAddCaseInsight = Boolean(linkedProviderIdForInsight && !caseArchivedForInsight);
  const canPromoteProviderIntelligence = Boolean(
    providerIntelligence && linkedProviderIdForInsight && !caseArchivedForInsight,
  );
  shortcutsBlockedRef.current =
    noteOpen ||
    uploadOpen ||
    statusOpen ||
    editOpen ||
    addLineOpen ||
    busy ||
    caseArchiveModal != null ||
    promoteIntelOpen ||
    discoveryInsightOpen ||
    observationRescheduleOpen ||
    observationCancelConfirmOpen ||
    convertToSupportConfirmOpen;

  if (err) {
    return (
      <SalesCommandPage title="Case" subtitle="">
        <div role="alert" style={sc.alertError}>
          {err}
        </div>
        <Link href="/portal/sales/cases" data-surgical-press style={{ ...sc.btnSecondary, display: "inline-flex", marginTop: 12 }}>
          Back to cases
        </Link>
      </SalesCommandPage>
    );
  }

  if (!data?.case) {
    return (
      <SalesCommandPage title="Case" subtitle="">
        <div style={{ color: "var(--muted)" }}>Loading…</div>
      </SalesCommandPage>
    );
  }

  const c = data.case;
  const st = String(c.status ?? "");
  const caseArchived = Boolean(c.archived_at);
  const docRows = data.documents || [];
  const hasPurchaseOrder = docRows.some((d) => String(d.document_type).toLowerCase() === "purchase_order");
  const hasInvoice = docRows.some((d) => String(d.document_type).toLowerCase() === "invoice");
  const qtyLinesForBilling = (data.lines || []).map((l) => ({ actual_quantity: l.actual_quantity }));
  const requiresBillingDocuments = surgicalCaseRequiresBillingWorkflow({
    caseType: (c.case_type as string | null | undefined) ?? null,
    productId: (c.product_id as string | null | undefined) ?? null,
    productLineCount: (data.lines || []).length,
  });
  const checklist = computeSurgicalBillingChecklist(
    st,
    hasPurchaseOrder,
    hasInvoice,
    qtyLinesForBilling,
    requiresBillingDocuments
  );
  const bill: DetailBilling =
    data.billing ??
    {
      ...checklist,
      billing_reviewed_at: (c.billing_reviewed_at as string | null | undefined) ?? null,
      billing_admin_notes: (c.billing_admin_notes as string | null | undefined) ?? null,
    };
  const completedBillingWarnings =
    requiresBillingDocuments && st.toLowerCase() === "completed" && (!hasPurchaseOrder || !hasInvoice)
      ? [
          !hasPurchaseOrder ? "No purchase order is on file." : null,
          !hasInvoice ? "No invoice is on file." : null,
        ].filter(Boolean) as string[]
      : [];
  const otherChecklistTypes = ["packing_slip", "consignment_form", "implant_log", "other"] as const;
  const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
  const resourcesExpectedRevenue = Number(c.expected_revenue) > 0 ? money.format(Number(c.expected_revenue)) : "—";
  const resourcesActualRevenue =
    c.actual_revenue != null && Number(c.actual_revenue) > 0 ? money.format(Number(c.actual_revenue)) : "—";
  const resourcesVarianceLabel =
    c.actual_revenue != null && Number(c.expected_revenue || 0) > 0
      ? money.format(Number(c.actual_revenue) - Number(c.expected_revenue))
      : c.actual_revenue != null && Number(c.expected_revenue || 0) === 0 && Number(c.actual_revenue) > 0
        ? money.format(Number(c.actual_revenue))
        : "—";
  const caseDate = c.case_date ? new Date(String(c.case_date) + "T12:00:00Z").toLocaleDateString() : "—";
  const caseTime = c.case_time ? String(c.case_time) : "—";
  const productFamilyAccent = surgicalProductFamilyLeftBorderColor(data.product?.name ?? null);
  const isObservationCase = isSurgicalObservationCase(c.case_type as string | null | undefined);
  const visibleDataWarnings = filterSurgicalCaseDetailWarnings(dataWarnings, isObservationCase);
  const resourcePhiWarning = "Do not upload patient names, DOBs, MRNs, photos, or other PHI.";
  const observationResourceMessage = "PO and invoice are not required.";
  const billingExemptMessage = !requiresBillingDocuments
    ? isObservationCase
      ? observationResourceMessage
      : surgicalCaseBillingExemptCopy()
    : "";
  const surgeonDisplay = data.surgeon ? contactDisplayName(data.surgeon as Parameters<typeof contactDisplayName>[0]) : "No clinician assigned";
  const linkedOpportunityHref = linkedOpportunityHrefForHooks;
  const linkedProviderName = data.surgeon ? providerDisplayNameFromRow(data.surgeon as Record<string, unknown>) : "Provider";

  const openDefaultUpload = () => {
    setUploadPresetType(requiresBillingDocuments ? "purchase_order" : "other");
    setUploadLockType(false);
    setUploadOpen(true);
  };
  const openObservationFormUpload = () => {
    setUploadPresetType(OBSERVATION_FORM_DOCUMENT_TYPE);
    setUploadLockType(true);
    setUploadOpen(true);
  };
  const openStatusPicker = () => setStatusOpen(true);
  const openAddProduct = () => void openAddLine();
  const runMobileAction = (action: () => void) => {
    setMobileActionSheetOpen(false);
    action();
  };
  const captureCaseCtx = buildCaptureIntelligenceOpenContext("case", {
    caseId,
    caseLabel: String(c.case_number ?? "Case"),
    providerId: linkedProviderIdForInsight ?? undefined,
    providerLabel: surgeonDisplay !== "No clinician assigned" ? surgeonDisplay : undefined,
    opportunityId: c.related_opportunity_id ? String(c.related_opportunity_id) : undefined,
    organizationId: data.account?.id,
    organizationLabel: data.account?.name ?? undefined,
  });
  const captureCaseLabel = captureIntelligenceTitleForContext(captureCaseCtx);
  const openCaptureIntelligence = () => {
    captureIntelligence.open(captureCaseCtx, { onSaved: () => void refresh() });
  };
  const deleteCaseNote = async (noteId: string) => {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(
        `/api/portal/sales/surgical-cases/${encodeURIComponent(caseId)}/notes/${encodeURIComponent(noteId)}`,
        { method: "DELETE" },
      );
      const contentType = res.headers.get("content-type") ?? "";
      const j =
        contentType.includes("application/json")
          ? ((await res.json()) as { ok?: boolean; error?: string })
          : await (async () => {
              const text = (await res.text()).trim();
              const isHtml = /^<!doctype html|^<html\b/i.test(text);
              return { ok: false, error: !text || isHtml ? `Delete failed (${res.status})` : text };
            })();
      if (!res.ok || !j.ok) throw new Error(j.error || "");
      setMsg("Note deleted.");
      await refresh();
      void reloadActivityFeed();
    } catch (e: unknown) {
      setMsg(userFacingError(e));
      throw e;
    } finally {
      setBusy(false);
    }
  };

  const saveActivityNote = async (
    bodyOrInput: string | { body: string; captureMode?: "voice" | "quick" },
  ): Promise<{
    intelligence: {
      live_field_patches?: Record<string, string>;
      ai_extraction?: Record<string, unknown>;
    } | null;
    capture_feedback: ObservationCaptureFeedbackResult | ProductSupportCaptureFeedbackResult | null;
  } | null> => {
    const body = typeof bodyOrInput === "string" ? bodyOrInput : bodyOrInput.body;
    const captureMode = typeof bodyOrInput === "string" ? undefined : bodyOrInput.captureMode;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/portal/sales/surgical-cases/${encodeURIComponent(caseId)}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body,
          ...(captureMode ? { capture_mode: captureMode } : {}),
        }),
      });
      const j = (await res.json()) as {
        ok?: boolean;
        error?: string;
        note?: { id?: string };
        legacy_activity_id?: string | null;
        intelligence?: {
          live_field_patches?: Record<string, string>;
          ai_extraction?: Record<string, unknown>;
        } | null;
        capture_feedback?: ObservationCaptureFeedbackResult | ProductSupportCaptureFeedbackResult | null;
        universal_facts_read_model?: UniversalFactsReadModelPayload | null;
        intelligence_processing?: boolean;
      };
      if (!res.ok || !j.ok) throw new Error(j.error || "");

      setData((prev) => {
        if (!prev?.case) return prev;
        const activityId = String(j.legacy_activity_id ?? j.note?.id ?? `note-${Date.now()}`);
        const optimisticActivity: ActivityRow = {
          id: activityId,
          user_id: "",
          activity_type: "note",
          body,
          created_at: new Date().toISOString(),
          metadata_json: {
            note_id: j.note?.id ?? null,
            ai_extraction: j.intelligence?.ai_extraction ?? null,
            intelligence_processing: Boolean(j.intelligence_processing),
          },
        };
        const existingIds = new Set((prev.activities ?? []).map((activity) => activity.id));
        const activities = existingIds.has(activityId)
          ? (prev.activities ?? []).map((activity) =>
              activity.id === activityId
                ? {
                    ...activity,
                    body,
                    metadata_json: {
                      ...(activity.metadata_json ?? {}),
                      note_id: j.note?.id ?? null,
                      ai_extraction: j.intelligence?.ai_extraction ?? activity.metadata_json?.ai_extraction ?? null,
                      intelligence_processing: Boolean(j.intelligence_processing),
                    },
                  }
                : activity,
            )
          : [optimisticActivity, ...(prev.activities ?? [])];

        return {
          ...prev,
          case: {
            ...prev.case,
            ...(j.intelligence?.live_field_patches ?? {}),
          },
          activities,
          universal_facts_read_model:
            j.universal_facts_read_model ?? prev.universal_facts_read_model ?? null,
        };
      });

      if (j.intelligence_processing) {
        setPendingIntelligenceNoteId(String(j.note?.id ?? j.legacy_activity_id ?? "").trim() || null);
        setIntelligenceProcessingStartedAtMs(Date.now());
      }
      setMsg(j.intelligence_processing ? "Note added. Intelligence is processing." : "Note added.");
      if (!j.intelligence_processing) {
        void refresh();
      }
      void reloadActivityFeed();
      return {
        intelligence: j.intelligence ?? null,
        capture_feedback: j.capture_feedback ?? null,
      };
    } catch (e: unknown) {
      setMsg(userFacingError(e));
      throw e;
    } finally {
      setBusy(false);
    }
  };
  const linkedOpportunityLabel = linkedOpportunityHref
    ? "Related evaluation linked"
    : "No related evaluation";
  const facilityLocation = firstCaseText(c as Record<string, unknown>, ["facility_name", "facility", "location_name", "location", "site_name"]);
  const caseSupportType = supportTypeLabel(c as Record<string, unknown>, isObservationCase);
  const lineProducts = (() => {
    const seen = new Set<string>();
    const rows: Array<{ id: string; name: string; detail: string }> = [];
    const detailed: Array<{
      id: string;
      name: string;
      skuCode?: string | null;
      expectedQuantity?: number | null;
      actualQuantity?: number | null;
    }> = [];
    for (const line of data.lines || []) {
      const name = String(line.product_name || data.product?.name || "").trim();
      const detailBits = [
        line.sku_code ? `SKU ${line.sku_code}` : "",
        line.expected_quantity != null ? `Exp ${line.expected_quantity}` : "",
        line.actual_quantity != null ? `Act ${line.actual_quantity}` : "",
      ].filter(Boolean);
      const dedupeKey = `${name}|${detailBits.join("|")}`;
      if (!name || seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);
      rows.push({
        id: line.id,
        name,
        detail: detailBits.join(" · ") || "Line item on file",
      });
      detailed.push({
        id: line.id,
        name,
        skuCode: line.sku_code ?? null,
        expectedQuantity: line.expected_quantity ?? null,
        actualQuantity: line.actual_quantity ?? null,
      });
    }
    if (rows.length === 0 && data.product?.name) {
      const name = String(data.product.name);
      rows.push({ id: "primary-product", name, detail: "Primary product on case" });
      detailed.push({ id: "primary-product", name, skuCode: null, expectedQuantity: null, actualQuantity: null });
    }
    return { rows, detailed };
  })();
  const productsOverviewValue =
    lineProducts.rows.length === 0
      ? "None attached"
      : lineProducts.rows.length === 1
        ? lineProducts.rows[0].name
        : `${lineProducts.rows.length} products`;

  const productSupportCaseIdentity = buildProductSupportCaseIdentity({
    case_type: c.case_type as string | null | undefined,
    surgeon_display: surgeonDisplay,
    surgeon_specialty: providerSpecialtyLabel(
      (data.surgeon as Record<string, unknown> | null) ?? null,
      data?.provider_intelligence ?? null,
    ),
    account_name: data.account?.name ?? null,
    case_date: c.case_date as string | null | undefined,
    case_time: (c as { case_time?: string | null }).case_time ?? null,
    status: c.status as string | null | undefined,
    procedure_type: c.procedure_type ? String(c.procedure_type) : null,
    observation_access_pathway: c.observation_access_pathway as string | null | undefined,
    observation_access_scheduling_owner: c.observation_access_scheduling_owner as string | null | undefined,
    observation_access_credentialing: c.observation_access_credentialing as string | null | undefined,
    case_number: c.case_number as string | null | undefined,
    surgeon_contact_id: c.surgeon_contact_id as string | null | undefined,
    account_id: c.account_id as string | null | undefined,
    productsLabel: productsOverviewValue,
    products: lineProducts.detailed,
    operationalContext: data.case_operational_context ?? null,
    providerContact: (data.surgeon as Record<string, unknown> | null) ?? null,
    providerIntelligence: data?.provider_intelligence ?? null,
  });

  const caseDetailBanners = (
    <>
      {msg ? (
        <div
          role="status"
          style={{
            color:
              msg.startsWith("Saved") ||
              msg.toLowerCase().includes("added") ||
              msg.toLowerCase().includes("removed")
                ? "var(--success)"
                : "var(--danger)",
          }}
        >
          {msg}
        </div>
      ) : null}
      {completionAffirmation ? (
        <div role="status">Case marked complete — solid work keeping the portfolio moving.</div>
      ) : null}
      {!isObservationCase && completedBillingWarnings.length > 0 ? (
        <div role="status">
          <span style={{ fontWeight: 900, color: "#b45309" }}>Billing · </span>
          {completedBillingWarnings.join(" ")}
        </div>
      ) : null}
    </>
  );

  const openProductSupportFieldNotes = () => {
    setProductSupportTab("field_notes");
    window.setTimeout(() => {
      document.getElementById("case-ps-field-notes-quick")?.focus();
    }, 0);
  };

  const observationExecutionStatus = isObservationCase
    ? resolveObservationCaseExecutionStatus({
        caseRow: c as Record<string, unknown>,
        activities: data.activities,
      })
    : null;
  const observationExecutionStatusView = observationExecutionStatus
    ? {
        id: observationExecutionStatus,
        label: formatObservationCaseExecutionStatusLabel(observationExecutionStatus),
      }
    : null;

  const openObservationFieldNotes = () => {
    setWorkspaceTab("workflow");
  };

  async function ensureObservationStarted() {
    if (
      !observationExecutionStatus ||
      !canStartObservationLifecycle(observationExecutionStatus)
    ) {
      return true;
    }
    return patchCase({ status: OBSERVATION_LIFECYCLE_STATUS.inProgress });
  }

  async function beginObservationCapture() {
    await ensureObservationStarted();
  }

  async function saveObservationNote(
    body: string,
    _meta?: { captureMode?: "voice" | "quick" },
  ): Promise<ObservationCaptureFeedbackResult | void> {
    await beginObservationCapture();
    const saved = await saveActivityNote(body);
    if (saved?.capture_feedback && "items" in saved.capture_feedback) {
      return saved.capture_feedback;
    }
    const items = buildObservationCaptureFeedback({
      caseId,
      noteBody: body,
      aiExtraction: saved?.intelligence?.ai_extraction ?? null,
    });
    return items.length > 0 ? { status: "chips", items } : undefined;
  }

  async function startObservationWorkflow() {
    const ok = await ensureObservationStarted();
    if (ok) openObservationFieldNotes();
  }

  async function completeObservationLifecycle() {
    const ok = await patchCase({ status: OBSERVATION_LIFECYCLE_STATUS.completed });
    if (ok) setWorkspaceTab("activity");
  }

  async function reopenObservationLifecycle() {
    const ok = await patchCase({ status: OBSERVATION_LIFECYCLE_STATUS.inProgress });
    if (ok) openObservationFieldNotes();
  }

  async function cancelObservationLifecycle() {
    const ok = await patchCase({ status: OBSERVATION_LIFECYCLE_STATUS.cancelled });
    if (ok) setObservationCancelConfirmOpen(false);
  }

  async function convertObservationToProductSupport() {
    const ok = await patchCase(observationToProductSupportCasePatch());
    if (ok) setConvertToSupportConfirmOpen(false);
  }

  function runObservationHeaderAction(actionId: ObservationHeaderPrimaryActionId) {
    switch (actionId) {
      case "start_observation":
        void startObservationWorkflow();
        break;
      case "complete_observation":
        void completeObservationLifecycle();
        break;
      case "mark_completed":
        void completeObservationLifecycle();
        break;
      case "view_intelligence":
        setWorkspaceTab("activity");
        break;
      case "update_datetime":
        setObservationRescheduleOpen(true);
        break;
      case "reopen_observation":
        void reopenObservationLifecycle();
        break;
    }
  }

  function runObservationMoreAction(actionId: ObservationHeaderMoreActionId) {
    switch (actionId) {
      case "mark_completed":
        void completeObservationLifecycle();
        break;
      case "reschedule":
        setObservationRescheduleOpen(true);
        break;
      case "cancel_observation":
        setObservationCancelConfirmOpen(true);
        break;
      case "reopen_observation":
        void reopenObservationLifecycle();
        break;
      case "start_observation":
        void startObservationWorkflow();
        break;
      case "archive_case":
        setCaseArchiveModal("archive");
        break;
      case "convert_to_product_support":
        setConvertToSupportConfirmOpen(true);
        break;
    }
  }

  const observationHeaderOpts = { caseDate: c.case_date };
  const observationPrimaryActionId = observationExecutionStatus
    ? observationHeaderPrimaryAction(observationExecutionStatus, observationHeaderOpts)
    : null;
  const observationMoreActionIds = observationExecutionStatus
    ? observationHeaderMoreActions(observationExecutionStatus, observationHeaderOpts)
    : [];

  const observationLifecycleAction = observationPrimaryActionId ? (
    <button
      type="button"
      className="case-obs-detail-btn case-obs-detail-btn--primary"
      disabled={busy || caseArchived}
      onClick={() => runObservationHeaderAction(observationPrimaryActionId)}
    >
      {OBSERVATION_HEADER_ACTION_LABELS[observationPrimaryActionId]}
    </button>
  ) : null;

  const caseDetailBottomBar = (
    <CaseDetailMobileBottomBar
      variant={isObservationCase ? "observation" : "product_support"}
      observationExecutionStatus={observationExecutionStatus ?? undefined}
      observationCaseDate={typeof c.case_date === "string" ? c.case_date : null}
      disabled={busy || caseArchived}
      onAddNote={() =>
        isObservationCase ? openObservationFieldNotes() : openProductSupportFieldNotes()
      }
      onObservationPrimaryAction={() => {
        if (observationPrimaryActionId) runObservationHeaderAction(observationPrimaryActionId);
      }}
      onCompleteObservation={() => void completeObservationLifecycle()}
      onUpload={openDefaultUpload}
      onMore={() => setMobileActionSheetOpen(true)}
      onStatus={openStatusPicker}
      onAddProduct={openAddProduct}
    />
  );

  return (
    <SalesCommandPage
      title={
        isObservationCase
          ? formatCaseIdentityPageTitle(caseIdentity)
          : `${productSupportCaseIdentity.caseTypeLabel} — ${productSupportCaseIdentity.providerName}`
      }
      omitBuiltInHeader
      density="dense"
    >
      <style dangerouslySetInnerHTML={{ __html: `${shellCss}\n${caseMissionControlPolishCss}\n${caseMobilePolishCss}\n${caseDesktopScaleCss}` }} />

      {isObservationCase ? (
        <SurgicalCaseDetailShell
          identity={caseIdentity}
          workspaceTab={workspaceTab}
          onTabChange={setWorkspaceTab}
          busy={busy || caseArchived}
          onEditCase={() => void openEdit()}
          onLogUpdate={openCaptureIntelligence}
          onMore={() => setMobileActionSheetOpen(true)}
          observationLayout
          planDebriefAction={null}
          observationExecutionStatus={observationExecutionStatusView}
          observationLifecycleAction={observationLifecycleAction}
          observationMetadata={
            <ObservationCaseMetadataRow
              identity={caseIdentity}
              caseRow={c as Record<string, unknown>}
              activities={data.activities}
            />
          }
          headerChips={mobileHeaderChips as SurgicalCaseHeaderChip[]}
          providerHref={providerOverviewHref}
          overviewCompleteFlash={overviewCompleteFlash}
          banners={caseDetailBanners}
          overview={
            <ObservationCaseBriefing
              identity={caseIdentity}
              caseRow={c as Record<string, unknown>}
              providerContact={(data.surgeon as Record<string, unknown> | null) ?? null}
              priorCases={data.provider_prior_observation_cases ?? []}
              activities={data.activities}
              disabled={caseArchived || busy}
              onSaveNote={saveObservationNote}
              onBeginCapture={beginObservationCapture}
              dictationRequest={observationDictationRequest}
              onViewFindings={() => setWorkspaceTab("activity")}
              universalFactsReadModel={data.universal_facts_read_model ?? null}
              onMarkComplete={completeObservationLifecycle}
              showMarkCompleteNudge={
                observationExecutionStatus === "in_progress" ||
                (observationExecutionStatus === "scheduled" && isCaseDateInThePast(c.case_date))
              }
              observationForms={(data.documents ?? []).filter(
                (doc) => String(doc.document_type || "").toLowerCase() === OBSERVATION_FORM_DOCUMENT_TYPE,
              )}
              onUploadObservationForm={openObservationFormUpload}
              onDownloadObservationForm={(docId) => void downloadDoc(docId)}
            />
          }
          overviewSnapshot={null}
          execute={
            <ObservationCaseFieldNotes
              activities={data.activities}
              disabled={caseArchived || busy}
              onSaveNote={saveObservationNote}
              onBeginCapture={beginObservationCapture}
              onDeleteNote={caseArchived ? undefined : deleteCaseNote}
              onMarkComplete={completeObservationLifecycle}
              showMarkCompleteNudge={
                observationExecutionStatus === "in_progress" ||
                (observationExecutionStatus === "scheduled" && isCaseDateInThePast(c.case_date))
              }
            />
          }
          activity={
            <ObservationCaseIntelligenceTab
              caseId={caseId}
              caseRow={c as Record<string, unknown>}
              activities={data.activities}
              providerContact={(data.surgeon as Record<string, unknown> | null) ?? null}
              priorCases={data.provider_prior_observation_cases ?? []}
              disabled={caseArchived || busy}
              onDebriefError={(message) => setMsg(message)}
              intelligenceProcessingStartedAtMs={intelligenceProcessingStartedAtMs}
              universalFactsReadModel={data.universal_facts_read_model ?? null}
            />
          }
          resources={
            <CaseObservationResourcesTab
              documents={data.documents ?? []}
              phiWarning={resourcePhiWarning}
              disabled={caseArchived || busy}
              onUpload={openDefaultUpload}
              onDownloadDoc={(docId) => void downloadDoc(docId)}
              onUploadObservationForm={openObservationFormUpload}
            />
          }
          bottomBar={caseDetailBottomBar}
        />
      ) : (
        <ProductSupportCaseDetailShell
          identity={productSupportCaseIdentity}
          workspaceTab={productSupportTab}
          onTabChange={setProductSupportTab}
          busy={busy || caseArchived}
          onEditCase={() => void openEdit()}
          onCompleteCase={openStatusPicker}
          onMore={() => setMobileActionSheetOpen(true)}
          headerAccentColor={productFamilyAccent || undefined}
          providerHref={providerOverviewHref}
          banners={caseDetailBanners}
          briefing={
            <ProductSupportCaseBriefing
              caseRow={c as Record<string, unknown>}
              products={lineProducts.detailed}
              providerContact={(data.surgeon as Record<string, unknown> | null) ?? null}
              operationalContext={data.case_operational_context ?? null}
              activities={data.activities}
              priorCases={data.provider_prior_cases ?? data.provider_prior_observation_cases ?? []}
              specialty={productSupportCaseIdentity.specialty}
              universalFactsReadModel={data.universal_facts_read_model ?? null}
              supportRepName={data.sales_rep?.display_name ?? null}
              poAttached={hasPurchaseOrder}
              disabled={caseArchived || busy}
              onStartDictation={openProductSupportFieldNotes}
              onOpenProducts={() => setProductSupportTab("products")}
              onUploadDocument={openDefaultUpload}
              onViewAllInsights={() => setProductSupportTab("intelligence")}
              onViewWatchList={() => setProductSupportTab("intelligence")}
              onViewCaseDetails={() => setProductSupportTab("products")}
            />
          }
          fieldNotes={
            <ProductSupportCaseFieldNotes
              activities={data.activities}
              defaultActor={data.sales_rep?.display_name ?? "Rep"}
              disabled={caseArchived || busy}
              onSaveNote={async (body, captureMode) => {
                const saved = await saveActivityNote({ body, captureMode });
                const feedback = saved?.capture_feedback;
                return feedback && "findings" in feedback ? feedback : undefined;
              }}
              onDeleteNote={caseArchived ? undefined : deleteCaseNote}
            />
          }
          products={
            <ProductSupportCaseProductsTab
              caseId={caseId}
              lines={lineProducts.detailed}
              disabled={caseArchived || busy}
              onAddProduct={openAddProduct}
              onLineUpdated={() => void refresh()}
            />
          }
          documents={
            <ProductSupportCaseDocumentsTab
              documents={docRows}
              phiReminder={resourcePhiWarning}
              disabled={caseArchived || busy}
              onUpload={openDefaultUpload}
              onDownloadDoc={(docId) => void downloadDoc(docId)}
            />
          }
          intelligence={
            <ProductSupportCaseIntelligenceTab
              caseRow={c as Record<string, unknown>}
              activities={data.activities}
              universalFactsReadModel={data.universal_facts_read_model ?? null}
              providerContact={(data.surgeon as Record<string, unknown> | null) ?? null}
              operationalContext={data.case_operational_context ?? null}
              priorCases={data.provider_prior_cases ?? data.provider_prior_observation_cases ?? []}
              specialty={productSupportCaseIdentity.specialty}
              intelligenceProcessingStartedAtMs={intelligenceProcessingStartedAtMs}
            />
          }
          followUp={
            <ProductSupportCaseFollowUpTab
              caseRow={c as Record<string, unknown>}
              procedureType={c.procedure_type ? String(c.procedure_type) : null}
              supportType={caseSupportType}
              products={lineProducts.detailed}
              operationalContext={data.case_operational_context ?? null}
              linkedOpportunityHref={linkedOpportunityHref}
              status={st}
              requiresBillingDocuments={requiresBillingDocuments}
              disabled={caseArchived || busy}
              onPatchCase={patchCase}
              bill={
                data.billing
                  ? {
                      po_uploaded: hasPurchaseOrder,
                      invoice_uploaded: hasInvoice,
                      quantities_confirmed: Boolean(data.billing.quantities_confirmed),
                    }
                  : null
              }
            />
          }
          bottomBar={caseDetailBottomBar}
        />
      )}


      {mobileActionSheetOpen ? (
        <ModalShell title="More actions" onClose={() => setMobileActionSheetOpen(false)}>
          <div className="status-pick-list">
            {isObservationCase
              ? observationMoreActionIds.map((actionId) => (
                  <button
                    key={actionId}
                    type="button"
                    style={
                      actionId === "cancel_observation" || actionId === "archive_case"
                        ? {
                            ...sc.btnSecondary,
                            color: "var(--danger)",
                            borderColor: "color-mix(in srgb, var(--danger) 35%, var(--border))",
                          }
                        : sc.btnSecondary
                    }
                    disabled={busy || caseArchived}
                    onClick={() =>
                      runMobileAction(() => {
                        if (actionId === "cancel_observation") {
                          setObservationCancelConfirmOpen(true);
                          return;
                        }
                        if (actionId === "convert_to_product_support") {
                          setConvertToSupportConfirmOpen(true);
                          return;
                        }
                        runObservationMoreAction(actionId);
                      })
                    }
                  >
                    {OBSERVATION_HEADER_ACTION_LABELS[actionId]}
                  </button>
                ))
              : (
              <button type="button" style={sc.btnSecondary} onClick={() => runMobileAction(openAddProduct)} disabled={busy || caseArchived}>
                Add product
              </button>
            )}
            {!isObservationCase && LOG_UPDATE_UI_ENABLED ? (
              <button
                type="button"
                style={sc.btnSecondary}
                onClick={() => runMobileAction(openCaptureIntelligence)}
                disabled={busy || caseArchived}
              >
                {captureCaseLabel}
              </button>
            ) : null}
            <button type="button" style={sc.btnSecondary} onClick={() => runMobileAction(() => void openEdit())} disabled={busy || caseArchived}>
              Edit case
            </button>
            {linkedOpportunityHref ? (
              <button type="button" style={sc.btnSecondary} onClick={() => runMobileAction(() => router.push(linkedOpportunityHref))}>
                Open evaluation
              </button>
            ) : null}
            {!caseArchived ? (
              !isObservationCase ? (
                <button
                  type="button"
                  style={{ ...sc.btnSecondary, color: "var(--danger)", borderColor: "color-mix(in srgb, var(--danger) 35%, var(--border))" }}
                  onClick={() => runMobileAction(() => setCaseArchiveModal("archive"))}
                  disabled={busy}
                >
                  Archive
                </button>
              ) : null
            ) : (
              <button type="button" style={sc.btnSecondary} onClick={() => runMobileAction(() => setCaseArchiveModal("restore"))} disabled={busy}>
                Restore
              </button>
            )}
            <button type="button" style={sc.btnSecondary} onClick={() => runMobileAction(() => router.push("/portal/sales/cases"))}>
              All cases
            </button>
          </div>
        </ModalShell>
      ) : null}

      {editOpen ? (
        <EditCaseModal
          caseRow={c}
          caseType={(c.case_type as string | null | undefined) ?? null}
          accounts={accounts}
          products={products}
          onClose={() => setEditOpen(false)}
          onSave={async (patch) => {
            const ok = await patchCase(patch);
            if (ok) setEditOpen(false);
            return ok;
          }}
        />
      ) : null}

      {addLineOpen ? (
        <AddLineModal
          products={products}
          onClose={() => setAddLineOpen(false)}
          onSave={async (body) => {
            setBusy(true);
            setMsg(null);
            try {
              const res = await fetch(`/api/portal/sales/surgical-cases/${encodeURIComponent(caseId)}/products`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
              });
              const j = (await res.json()) as { ok?: boolean; error?: string };
              if (!res.ok || !j.ok) throw new Error(j.error || "");
              setMsg("Line added.");
              setAddLineOpen(false);
              await refresh();
            } catch (e: unknown) {
              setMsg(userFacingError(e));
            } finally {
              setBusy(false);
            }
          }}
        />
      ) : null}

      {uploadOpen ? (
        <UploadDocModal
          caseId={caseId}
          initialDocumentType={uploadPresetType}
          lockDocumentType={uploadLockType}
          onClose={() => setUploadOpen(false)}
          onDone={async () => {
            setUploadOpen(false);
            setDocProgressPulse(true);
            await refresh();
            window.setTimeout(() => setDocProgressPulse(false), 1400);
          }}
          onMsg={setMsg}
        />
      ) : null}

      {statusOpen ? (
        <StatusModal
          current={st}
          busy={busy}
          onClose={() => setStatusOpen(false)}
          onPick={async (s) => {
            const ok = await patchCase({ status: s });
            if (ok) setStatusOpen(false);
          }}
        />
      ) : null}

      {observationRescheduleOpen && data?.case ? (
        <RescheduleObservationModal
          caseRow={data.case as Record<string, unknown>}
          busy={busy}
          onClose={() => setObservationRescheduleOpen(false)}
          onSave={async (patch) => {
            const ok = await patchCase({
              ...patch,
              status: OBSERVATION_LIFECYCLE_STATUS.rescheduled,
            });
            if (ok) setObservationRescheduleOpen(false);
            return ok;
          }}
        />
      ) : null}

      <SalesCrmConfirmModal
        open={observationCancelConfirmOpen}
        title="Cancel observation?"
        message="This observation will be marked cancelled. You can reopen it later if plans change."
        confirmLabel="Cancel observation"
        danger
        busy={busy}
        onClose={() => !busy && setObservationCancelConfirmOpen(false)}
        onConfirm={() => void cancelObservationLifecycle()}
      />

      <SalesCrmConfirmModal
        open={convertToSupportConfirmOpen}
        title="Change to product support?"
        message="This observation becomes a product support case. Date, provider, and facility stay the same. You can add products after the change."
        confirmLabel="Change to product support"
        busy={busy}
        onClose={() => !busy && setConvertToSupportConfirmOpen(false)}
        onConfirm={() => void convertObservationToProductSupport()}
      />

      {noteOpen && data?.case ? (
        <NoteModal
          context={operationalNoteContextFromCaseRow(caseId, data.case as Record<string, unknown>)}
          onClose={() => setNoteOpen(false)}
          onAddCaseInsight={canAddCaseInsight ? openAddCaseInsight : undefined}
          onSave={async (input) => {
            setBusy(true);
            setMsg(null);
            try {
              const res = await fetch(`/api/portal/sales/surgical-cases/${encodeURIComponent(caseId)}/notes`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(input),
              });
              const j = (await res.json()) as { ok?: boolean; error?: string };
              if (!res.ok || !j.ok) throw new Error(j.error || "");
              setNoteOpen(false);
              setMsg("Note added.");
              await refresh();
            } catch (e: unknown) {
              setMsg(userFacingError(e));
            } finally {
              setBusy(false);
            }
          }}
        />
      ) : null}

      {promoteIntelOpen && data?.case && (providerIntelligence?.provider_id || linkedProviderIdForInsight) ? (
        <UpdateProviderIntelligenceModal
          open={promoteIntelOpen}
          caseId={caseId}
          caseRow={data.case as Record<string, unknown>}
          providerId={providerIntelligence?.provider_id || linkedProviderIdForInsight!}
          providerName={surgeonDisplay}
          onClose={() => setPromoteIntelOpen(false)}
          onSaved={(next, message) => {
            setData((prev) => (prev ? { ...prev, provider_intelligence: next } : prev));
            setMsg(message);
            void refresh();
          }}
        />
      ) : null}

      {discoveryInsightOpen && linkedProviderIdForInsight ? (
        <AddCaseInsightToProviderDiscoveryModal
          open={discoveryInsightOpen}
          caseId={caseId}
          providerId={linkedProviderIdForInsight}
          providerName={surgeonDisplay}
          engagementId={
            data?.engagement && typeof data.engagement.id === "string" ? data.engagement.id : null
          }
          onClose={() => setDiscoveryInsightOpen(false)}
          onSaved={({ message, prepareHref }) => {
            setMsg(
              prepareHref
                ? `${message} Open Prepare for Meeting from the linked engagement.`
                : message,
            );
            void refresh();
          }}
        />
      ) : null}

      <SalesCrmConfirmModal
        open={caseArchiveModal != null}
        title={caseArchiveModal === "restore" ? "Restore case?" : "Archive case?"}
        message={
          caseArchiveModal === "restore"
            ? "Restore this case? It will show up again in your active case list and can be edited."
            : "Archive this case? It will be hidden from your active case list. Documents, timeline, and billing history stay on file."
        }
        confirmLabel={caseArchiveModal === "restore" ? "Restore" : "Archive"}
        danger={caseArchiveModal !== "restore"}
        busy={caseArchiveBusy}
        onClose={() => !caseArchiveBusy && setCaseArchiveModal(null)}
        onConfirm={async () => {
          if (!caseArchiveModal) return;
          setCaseArchiveBusy(true);
          setMsg(null);
          try {
            const ok = await patchCase(caseArchiveModal === "restore" ? { restore: true } : { archive: true });
            if (ok) setCaseArchiveModal(null);
          } finally {
            setCaseArchiveBusy(false);
          }
        }}
      />
    </SalesCommandPage>
  );
}

function ObservationWorkflowPanel({
  caseId,
  caseRow,
  engagement,
  accountId,
  linkedProviderId,
  accountName,
  caseArchived,
  busy,
  activities,
  providerIntelligence,
  surgeon,
  requestedStage,
  onRequestedStageHandled,
  onCasePatched,
  onRefresh,
  onMessage,
  onOpenActivity,
  onPromoteProviderIntelligence,
  onAddCaseInsight,
  promoteDisabled,
}: {
  caseId: string;
  caseRow: Record<string, unknown>;
  engagement?: Record<string, unknown> | null;
  accountId?: string | null;
  linkedProviderId?: string | null;
  accountName?: string | null;
  caseArchived: boolean;
  busy: boolean;
  activities: ActivityRow[];
  providerIntelligence: DetailJson["provider_intelligence"];
  surgeon: Record<string, unknown> | null | undefined;
  requestedStage?: ObservationWorkflowStageId | null;
  onRequestedStageHandled?: () => void;
  onCasePatched: (savedCase: Record<string, unknown>) => void;
  onRefresh: () => void;
  onMessage: (msg: string | null) => void;
  onOpenActivity: () => void;
  onPromoteProviderIntelligence?: () => void;
  onAddCaseInsight?: () => void;
  promoteDisabled?: boolean;
}) {
  const [draft, setDraft] = React.useState<ObservationWorkflowDraft>(() => buildObservationWorkflowDraft(caseRow));
  const [dirtyKeys, setDirtyKeys] = React.useState<ObservationWorkflowFieldKey[]>([]);
  const [savingKeys, setSavingKeys] = React.useState<ObservationWorkflowFieldKey[]>([]);
  const [autosaveError, setAutosaveError] = React.useState<string | null>(null);
  const [savingDraft, setSavingDraft] = React.useState(false);
  const [lastSavedAt, setLastSavedAt] = React.useState<number | null>(null);
  const [quickNote, setQuickNote] = React.useState("");
  const [noteBusy, setNoteBusy] = React.useState(false);
  const [opportunities, setOpportunities] = React.useState<OpportunityRow[]>([]);
  const [opportunitiesBusy, setOpportunitiesBusy] = React.useState(false);
  const [opportunityActionBusy, setOpportunityActionBusy] = React.useState(false);
  const quickNoteRef = React.useRef<HTMLTextAreaElement | null>(null);
  const workflowCss = `
  .observation-grid-2{display:grid;grid-template-columns:1fr 1fr;gap:10px}
  .observation-grid-3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
  .observation-card{border:1px solid color-mix(in srgb,var(--foreground) 5%,var(--border));border-radius:10px;padding:12px;background:color-mix(in srgb,var(--foreground) 1.5%,var(--surface));display:grid;gap:10px}
  .observation-phase-chip{display:inline-flex;align-items:center;gap:6px;padding:4px 8px;border-radius:999px;font-size:10px;font-weight:800}
  .observation-recommendation-list{display:grid;gap:8px}
  .observation-recommendation-item{border:1px solid color-mix(in srgb,var(--foreground) 5%,var(--border));border-radius:10px;padding:10px;background:color-mix(in srgb,var(--foreground) 1%,var(--surface))}
  .workflow-stage-list{display:grid;gap:6px}
  .workflow-stage{border:1px solid color-mix(in srgb,var(--foreground) 5%,var(--border));border-radius:10px;background:var(--surface);overflow:hidden}
  .workflow-stage[data-active="true"]{border-color:color-mix(in srgb,var(--brand-600) 18%,var(--border));background:color-mix(in srgb,var(--brand-600) 2%,var(--surface))}
  .workflow-stage-summary{list-style:none;display:grid;gap:8px;padding:10px 12px;cursor:pointer}
  .workflow-stage-summary::-webkit-details-marker{display:none}
  .workflow-stage-summary-main{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:start}
  .workflow-stage-summary-title{display:grid;gap:4px;min-width:0}
  .workflow-stage-summary-meta{display:flex;flex-wrap:wrap;gap:6px 8px;align-items:center}
  .workflow-stage-count{font-size:10px;font-weight:800;color:var(--muted)}
  .workflow-stage-last{font-size:10px;color:var(--muted);font-weight:700}
  .workflow-stage-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap;justify-content:flex-end}
  .workflow-stage-actions > button{min-height:32px;padding:7px 11px !important;font-size:12px !important}
  .workflow-stage-body{display:grid;gap:10px;padding:0 12px 12px}
  .workflow-stage-local-status{display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap;padding-top:2px}
  .workflow-stage-divider{height:1px;background:color-mix(in srgb,var(--foreground) 5%,var(--border));margin:2px 0}
  .workflow-stage-hint{font-size:11px;color:var(--muted);line-height:1.45}
  @media (max-width: 860px){
    .observation-grid-2,.observation-grid-3{grid-template-columns:1fr}
    .workflow-stage-summary-main{grid-template-columns:1fr}
    .workflow-stage-actions{justify-content:flex-start}
  }
  @media (max-width: 640px){
    .observation-grid-2,.observation-grid-3{grid-template-columns:1fr;gap:8px}
    .workflow-stage-list{gap:0}
    .workflow-stage-local-status{font-size:11px}
    .workflow-stage-hint{font-size:10px}
  }`;

  const latestDraftRef = React.useRef(draft);
  React.useEffect(() => {
    latestDraftRef.current = draft;
  }, [draft]);

  const caseDraftSignature = React.useMemo(() => JSON.stringify(buildObservationWorkflowDraft(caseRow)), [caseRow]);
  React.useEffect(() => {
    if (savingDraft || dirtyKeys.length > 0) return;
    const nextDraft = buildObservationWorkflowDraft(caseRow);
    if (JSON.stringify(nextDraft) !== JSON.stringify(latestDraftRef.current)) {
      setDraft(nextDraft);
      latestDraftRef.current = nextDraft;
    }
  }, [caseDraftSignature, caseRow, dirtyKeys.length, savingDraft]);

  const dirtyKeySet = React.useMemo(() => new Set(dirtyKeys), [dirtyKeys]);
  const savingKeySet = React.useMemo(() => new Set(savingKeys), [savingKeys]);

  React.useEffect(() => {
    let cancelled = false;
    setOpportunitiesBusy(true);
    void (async () => {
      try {
        const res = await fetch("/api/portal/sales/opportunities", { cache: "no-store" });
        const j = (await res.json()) as { ok?: boolean; opportunities?: OpportunityRow[] };
        if (cancelled) return;
        setOpportunities(j.ok && Array.isArray(j.opportunities) ? j.opportunities : []);
      } catch {
        if (!cancelled) setOpportunities([]);
      } finally {
        if (!cancelled) setOpportunitiesBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const saveDirtyFields = React.useCallback(
    async (keysToSave: readonly ObservationWorkflowFieldKey[]) => {
      if (savingDraft || caseArchived || keysToSave.length === 0) return;
      const payload = buildObservationWorkflowPatch(latestDraftRef.current, keysToSave);
      setSavingDraft(true);
      setSavingKeys([...keysToSave]);
      setAutosaveError(null);
      try {
        const res = await fetch(`/api/portal/sales/surgical-cases/${encodeURIComponent(caseId)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const j = (await res.json()) as { ok?: boolean; error?: unknown; case?: Record<string, unknown> };
        if (!res.ok || !j.ok || !j.case) {
          throw new Error(typeof j.error === "string" ? j.error : "Autosave failed");
        }
        onCasePatched(j.case);
        setDirtyKeys((prev) =>
          prev.filter((key) => {
            if (!keysToSave.includes(key)) return true;
            return JSON.stringify(normalizeObservationDraftValue(key, latestDraftRef.current)) !== JSON.stringify(payload[key]);
          })
        );
        setLastSavedAt(Date.now());
      } catch (error: unknown) {
        setAutosaveError(userFacingError(error, "We could not save your changes. Please try again."));
      } finally {
        setSavingDraft(false);
        setSavingKeys([]);
      }
    },
    [caseArchived, caseId, onCasePatched, savingDraft]
  );

  React.useEffect(() => {
    if (caseArchived || savingDraft || dirtyKeys.length === 0) return;
    const handle = window.setTimeout(() => {
      void saveDirtyFields(dirtyKeys);
    }, 700);
    return () => window.clearTimeout(handle);
  }, [caseArchived, dirtyKeys, saveDirtyFields, savingDraft]);

  const setDraftField = React.useCallback(
    <K extends ObservationWorkflowFieldKey>(key: K, value: ObservationWorkflowDraft[K]) => {
      setDraft((prev) => {
        const next = { ...prev, [key]: value };
        latestDraftRef.current = next;
        return next;
      });
      setDirtyKeys((prev) => (prev.includes(key) ? prev : [...prev, key]));
      setAutosaveError(null);
    },
    []
  );

  const previewCaseRow = React.useMemo(
    () =>
      ({
        ...caseRow,
        ...buildObservationWorkflowPatch(
          draft,
          Object.keys(draft) as ObservationWorkflowFieldKey[]
        ),
      }) as Record<string, unknown>,
    [caseRow, draft]
  );

  const providerName = surgeon ? providerDisplayNameFromRow(surgeon) : "Provider";
  const surgeonProviderId = surgeon ? String((surgeon as { id?: string }).id || "").trim() || null : null;
  const caseAccountId = String(caseRow.account_id || "").trim();
  const opportunityOptions = React.useMemo(() => {
    const rows = opportunities.filter((opp) => !caseAccountId || String(opp.account_id || "") === caseAccountId || opp.id === draft.related_opportunity_id);
    rows.sort((a, b) => formatRelatedOpportunityLabel(a).localeCompare(formatRelatedOpportunityLabel(b)));
    return rows;
  }, [caseAccountId, draft.related_opportunity_id, opportunities]);

  const linkedOpportunity =
    opportunityOptions.find((opp) => opp.id === draft.related_opportunity_id) ||
    opportunities.find((opp) => opp.id === draft.related_opportunity_id) ||
    null;

  const recommendations = React.useMemo(
    () => buildObservationRecommendations({ caseRow: previewCaseRow, relatedOpportunity: linkedOpportunity }),
    [linkedOpportunity, previewCaseRow]
  );
  const debriefRecommendations = React.useMemo(
    () => recommendations.filter((recommendation) => recommendation.id === "validate-needs" || recommendation.id === "evaluation-case"),
    [recommendations]
  );
  const routingRecommendations = React.useMemo(
    () => recommendations.filter((recommendation) => recommendation.id === "stage-recommendation" || recommendation.id === "link-opportunity" || recommendation.id === "add-surgeon-stakeholder"),
    [recommendations]
  );
  const followUpSuggestion = React.useMemo(
    () =>
      String(draft.debrief_suggested_next_action || "").trim() ||
      recommendations.find((recommendation) => recommendation.id === "follow-up")?.title ||
      "",
    [draft.debrief_suggested_next_action, recommendations]
  );

  const noteActivities = React.useMemo(
    () => activities.filter((activity) => String(activity.activity_type).toLowerCase() === "note"),
    [activities]
  );

  const stageSummary = React.useMemo(
    () => {
      const caseUpdatedAt = String(caseRow.updated_at || "").trim() || null;
      const latestNoteAt = noteActivities.length > 0 ? String(noteActivities[0].created_at) : null;
      const buildUpdatedAt = (keys: readonly ObservationWorkflowFieldKey[], preferred?: string | null) => {
        const hasValue = countObservationFields(previewCaseRow, keys) > 0;
        if (!hasValue) return null;
        return preferred || caseUpdatedAt;
      };
      const setup = countCaseSetupReadiness(previewCaseRow);
      const stageDefs = [
        {
          id: "setup" as const,
          filled: setup.filled,
          total: setup.total,
          keys: [] as ObservationWorkflowFieldKey[],
          lastUpdatedAt: setup.filled > 0 ? caseUpdatedAt : null,
          primaryAction: "Confirm case setup",
        },
        {
          id: "live" as const,
          filled: countObservationFields(previewCaseRow, OBSERVATION_LIVE_KEYS) + (noteActivities.length > 0 ? 1 : 0),
          total: OBSERVATION_LIVE_KEYS.length + 1,
          keys: OBSERVATION_LIVE_KEYS,
          lastUpdatedAt: latestNoteAt || buildUpdatedAt(OBSERVATION_LIVE_KEYS),
          primaryAction: "Add live note",
        },
        {
          id: "debrief" as const,
          filled: countObservationFields(previewCaseRow, OBSERVATION_DEBRIEF_CORE_KEYS),
          total: OBSERVATION_DEBRIEF_CORE_KEYS.length,
          keys: OBSERVATION_DEBRIEF_CORE_KEYS,
          lastUpdatedAt: buildUpdatedAt(OBSERVATION_DEBRIEF_CORE_KEYS),
          primaryAction: "Complete debrief",
        },
        {
          id: "follow_up" as const,
          filled: countObservationFields(previewCaseRow, OBSERVATION_FOLLOW_UP_KEYS),
          total: OBSERVATION_FOLLOW_UP_KEYS.length,
          keys: OBSERVATION_FOLLOW_UP_KEYS,
          lastUpdatedAt: buildUpdatedAt(OBSERVATION_FOLLOW_UP_KEYS, latestNoteAt),
          primaryAction: "Set follow-up",
        },
        {
          id: "routing" as const,
          filled: countObservationFields(previewCaseRow, OBSERVATION_ROUTING_KEYS),
          total: OBSERVATION_ROUTING_KEYS.length,
          keys: OBSERVATION_ROUTING_KEYS,
          lastUpdatedAt: buildUpdatedAt(OBSERVATION_ROUTING_KEYS),
          primaryAction: draft.related_opportunity_id ? "Route outcome" : OPPORTUNITY_UI.linkInitiativeCta,
        },
      ];
      return stageDefs.map((stage) => ({
        ...stage,
        title: observationWorkflowMobileStageLabel(stage.id),
      }));
    },
    [accountName, caseRow.updated_at, draft.related_opportunity_id, noteActivities, previewCaseRow, providerName]
  );

  const defaultExpandedStage = React.useMemo((): ObservationWorkflowStageId => {
    const setup = countCaseSetupReadiness(caseRow);
    const initialStages = [
      { id: "setup" as const, filled: setup.filled, total: setup.total },
      { id: "live" as const, filled: countObservationFields(caseRow, OBSERVATION_LIVE_KEYS), total: OBSERVATION_LIVE_KEYS.length + 1 },
      { id: "debrief" as const, filled: countObservationFields(caseRow, OBSERVATION_DEBRIEF_CORE_KEYS), total: OBSERVATION_DEBRIEF_CORE_KEYS.length },
      { id: "follow_up" as const, filled: countObservationFields(caseRow, OBSERVATION_FOLLOW_UP_KEYS), total: OBSERVATION_FOLLOW_UP_KEYS.length },
      { id: "routing" as const, filled: countObservationFields(caseRow, OBSERVATION_ROUTING_KEYS), total: OBSERVATION_ROUTING_KEYS.length },
    ];
    return initialStages.find((stage) => stage.filled < stage.total)?.id ?? "routing";
  }, [accountName, caseRow, providerName]);

  const [activeStage, setActiveStage] = React.useState<ObservationWorkflowStageId | null>(
    () => requestedStage ?? defaultExpandedStage
  );

  React.useEffect(() => {
    if (!requestedStage) return;
    const stage = normalizeObservationWorkflowStageId(requestedStage) ?? defaultExpandedStage;
    setActiveStage(stage);
    onRequestedStageHandled?.();
    window.requestAnimationFrame(() => {
      document.getElementById(`workflow-stage-${stage}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }, [defaultExpandedStage, requestedStage, onRequestedStageHandled]);

  const statusForKeys = React.useCallback((keys: readonly string[]) => {
    const typedKeys = keys as readonly ObservationWorkflowFieldKey[];
    if (typedKeys.some((key) => savingKeySet.has(key))) {
      return {
        label: "Saving…",
        style: {
          background: "color-mix(in srgb, var(--brand-600) 10%, var(--surface))",
          color: "var(--brand-700)",
          border: "1px solid color-mix(in srgb, var(--brand-600) 20%, var(--border))",
        },
      };
    }
    if (typedKeys.some((key) => dirtyKeySet.has(key))) {
      return {
        label: "Unsaved changes",
        style: {
          background: "color-mix(in srgb, #f59e0b 10%, var(--surface))",
          color: "#b45309",
          border: "1px solid color-mix(in srgb, #f59e0b 24%, var(--border))",
        },
      };
    }
    return {
      label: lastSavedAt ? "Saved" : "Saved",
      style: {
        background: "color-mix(in srgb, var(--success) 9%, var(--surface))",
        color: "#166534",
        border: "1px solid color-mix(in srgb, var(--success) 22%, var(--border))",
      },
    };
  }, [dirtyKeySet, lastSavedAt, savingKeySet]);

  async function saveQuickNote() {
    const trimmed = quickNote.trim();
    if (!trimmed || caseArchived) return;
    setNoteBusy(true);
    setAutosaveError(null);
    try {
      const body = trimmed.startsWith("-") ? trimmed : `- ${trimmed}`;
      const res = await fetch(`/api/portal/sales/surgical-cases/${encodeURIComponent(caseId)}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const j = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !j.ok) throw new Error(j.error || "");
      setQuickNote("");
      onMessage("Live note added.");
      onRefresh();
    } catch (error: unknown) {
      setAutosaveError(userFacingError(error, "Could not save note"));
    } finally {
      setNoteBusy(false);
    }
  }

  async function moveOpportunityStage(targetStage: string) {
    if (!linkedOpportunity || !targetStage) return;
    setOpportunityActionBusy(true);
    setAutosaveError(null);
    try {
      const res = await fetch(`/api/portal/sales/opportunities/${encodeURIComponent(linkedOpportunity.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: targetStage }),
      });
      const j = (await res.json()) as { ok?: boolean; error?: string; opportunity?: OpportunityRow };
      if (!res.ok || !j.ok || !j.opportunity) {
        throw new Error(j.error || `Could not update ${OPPORTUNITY_UI.initiativeStageLabel.toLowerCase()}`);
      }
      setOpportunities((prev) => prev.map((row) => (row.id === j.opportunity!.id ? { ...row, ...j.opportunity } : row)));
      onMessage(`Opportunity moved to ${SALES_STAGE_LABEL[targetStage as (typeof SALES_STAGES)[number]] ?? targetStage}.`);
    } catch (error: unknown) {
      setAutosaveError(
        error instanceof Error ? error.message : `Could not update ${OPPORTUNITY_UI.initiativeStageLabel.toLowerCase()}`,
      );
    } finally {
      setOpportunityActionBusy(false);
    }
  }

  function runRecommendation(rec: ObservationRecommendation) {
    if (rec.kind === "move_stage") {
      const targetStage =
        String(previewCaseRow.debrief_recommended_next_stage || "").trim() ||
        (Boolean(previewCaseRow.debrief_product_opportunity_identified) || Number(previewCaseRow.debrief_opportunity_score || 0) >= 70
          ? "clinical_validation"
          : "");
      if (targetStage) {
        void moveOpportunityStage(targetStage);
      }
    }
  }

  function renderRecommendationAction(rec: ObservationRecommendation) {
    if (!rec.cta) return null;
    if (rec.kind === "new_product_support_case") {
      return (
        <Link
          href={`/portal/sales/cases/new?account_id=${encodeURIComponent(String(caseRow.account_id || ""))}${caseRow.surgeon_contact_id ? `&surgeon_contact_id=${encodeURIComponent(String(caseRow.surgeon_contact_id))}` : ""}${draft.related_opportunity_id ? `&opportunity_id=${encodeURIComponent(draft.related_opportunity_id)}` : ""}`}
          data-surgical-press
          style={{ ...sc.btnSecondary, marginTop: 8, justifyContent: "center" }}
        >
          {rec.cta}
        </Link>
      );
    }
    if (rec.kind === "open_opportunity" && draft.related_opportunity_id) {
      return (
        <Link
          href={`/portal/sales/opportunities/${encodeURIComponent(draft.related_opportunity_id)}`}
          data-surgical-press
          style={{ ...sc.btnSecondary, marginTop: 8, justifyContent: "center" }}
        >
          {rec.cta}
        </Link>
      );
    }
    if (rec.kind === "open_opportunity") {
      const createHref = buildCreateOpportunityHref({
        caseId: String(caseRow.id || ""),
        providerId: caseRow.surgeon_contact_id ? String(caseRow.surgeon_contact_id) : undefined,
        accountId: caseRow.account_id ? String(caseRow.account_id) : undefined,
      });
      return (
        <Link href={createHref} data-surgical-press style={{ ...sc.btnSecondary, marginTop: 8, justifyContent: "center" }}>
          {rec.cta}
        </Link>
      );
    }
    return (
      <button
        type="button"
        style={{ ...sc.btnSecondary, marginTop: 8, justifyContent: "center" }}
        disabled={opportunityActionBusy || !linkedOpportunity}
        onClick={() => runRecommendation(rec)}
      >
        {opportunityActionBusy ? "Updating…" : rec.cta}
      </button>
    );
  }

  const stageStatusBadgeStyle = (status: "Not started" | "In progress" | "Complete"): React.CSSProperties => {
    if (status === "Complete") {
      return {
        background: "color-mix(in srgb, var(--success) 9%, var(--surface))",
        color: "#166534",
        border: "1px solid color-mix(in srgb, var(--success) 24%, var(--border))",
      };
    }
    if (status === "In progress") {
      return {
        background: "color-mix(in srgb, var(--brand-600) 9%, var(--surface))",
        color: "var(--brand-700)",
        border: "1px solid color-mix(in srgb, var(--brand-600) 20%, var(--border))",
      };
    }
    return {
      background: "color-mix(in srgb, var(--foreground) 4%, var(--surface))",
      color: "var(--muted)",
      border: "1px solid color-mix(in srgb, var(--foreground) 10%, var(--border))",
    };
  };

  const toggleStage = React.useCallback((stageId: ObservationWorkflowStageId) => {
    setActiveStage((prev) => (prev === stageId ? null : stageId));
  }, []);

  const expandStage = React.useCallback((stageId: ObservationWorkflowStageId) => {
    setActiveStage(stageId);
  }, []);

  const runPrimaryAction = React.useCallback(
    (stageId: ObservationWorkflowStageId) => {
      expandStage(stageId);
      if (stageId === "live") {
        window.setTimeout(() => quickNoteRef.current?.focus(), 0);
      }
    },
    [expandStage]
  );

  const primaryMove = React.useMemo(() => pickPrimaryObservationNextMove(recommendations), [recommendations]);

  const draftTextValues = React.useMemo(() => {
    const out: Record<string, string> = {};
    (Object.keys(draft) as ObservationWorkflowFieldKey[]).forEach((key) => {
      const value = draft[key];
      if (typeof value === "boolean") return;
      out[key] = String(value ?? "");
    });
    return out;
  }, [draft]);

  const liveFieldsMobile: WorkflowTextFieldConfig[] = OBSERVATION_LIVE_CORE_FIELDS.map((field) => ({
    key: field.key,
    label: field.label,
    rows: field.rows,
  }));

  const debriefFieldsMobile: WorkflowTextFieldConfig[] = OBSERVATION_DEBRIEF_TEXT_FIELDS.map((field) => ({
    key: field.key,
    label: field.label,
    helper: field.helper,
    rows: field.rows,
    inputKind: field.inputKind,
  }));

  const followUpFieldsMobile: WorkflowTextFieldConfig[] = OBSERVATION_FOLLOW_UP_TEXT_FIELDS.map((field) => ({
    key: field.key,
    label: field.label,
    helper: field.helper,
    rows: field.rows,
    inputKind: field.inputKind,
  }));

  const handlePrimarySuggestion = React.useCallback(() => {
    if (!primaryMove) return;
    if (primaryMove.id === "follow-up") {
      expandStage("follow_up");
      return;
    }
    if (
      primaryMove.id === "stage-recommendation" ||
      primaryMove.id === "link-opportunity" ||
      primaryMove.id === "add-surgeon-stakeholder"
    ) {
      expandStage("routing");
      return;
    }
    if (primaryMove.id === "validate-needs" || primaryMove.id === "evaluation-case") {
      expandStage("debrief");
      return;
    }
    expandStage("live");
  }, [expandStage, primaryMove]);

  const renderMobileStageBody = (stageId: ObservationWorkflowStageId) => {
    if (stageId === "setup") {
      const setup = countCaseSetupReadiness(caseRow);
      return (
        <div style={{ display: "grid", gap: 12 }}>
          <p style={{ margin: 0, fontSize: 11, color: "var(--muted)", lineHeight: 1.45 }}>
            Confirm organization, provider, and case date before live observation. Visit planning lives on the linked
            engagement when one is attached.
          </p>
          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 6 }}>
            {[
              { label: "Organization", ok: Boolean(String(caseRow.account_id ?? "").trim()) },
              { label: "Provider", ok: Boolean(String(caseRow.surgeon_contact_id ?? "").trim()) },
              { label: "Case date", ok: Boolean(String(caseRow.case_date ?? "").trim()) },
            ].map((row) => (
              <li
                key={row.label}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 8,
                  fontSize: 12,
                  fontWeight: 700,
                  padding: "8px 10px",
                  borderRadius: 8,
                  border: "1px solid color-mix(in srgb, var(--foreground) 8%, var(--border))",
                  background: row.ok
                    ? "color-mix(in srgb, var(--success) 6%, var(--surface))"
                    : "color-mix(in srgb, var(--foreground) 2%, var(--surface))",
                }}
              >
                <span>{row.label}</span>
                <span style={{ color: row.ok ? "#166534" : "var(--muted)" }}>{row.ok ? "Ready" : "Needed"}</span>
              </li>
            ))}
          </ul>
          <p style={{ margin: 0, fontSize: 11, color: "var(--muted)" }}>
            {setup.filled}/{setup.total} setup items complete
          </p>
          <CaseIntelligenceLogisticsSection
            caseId={caseId}
            caseRow={caseRow}
            disabled={caseArchived || busy}
            onSaved={onCasePatched}
          />
        </div>
      );
    }

    if (stageId === "live") {
      return (
        <>
          <div className="case-obs-inline-card">
            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 800 }}>Quick bullet note</span>
              <textarea
                ref={quickNoteRef}
                value={quickNote}
                onChange={(event) => setQuickNote(event.target.value)}
                rows={3}
                disabled={caseArchived || noteBusy}
                placeholder="Short field note, quote, objection, reaction, or follow-up item…"
                style={{ ...sc.input, resize: "vertical" }}
              />
            </label>
            <div className="case-obs-inline-actions">
              <button type="button" style={sc.btnSecondary} onClick={onOpenActivity}>
                View activity
              </button>
              {onAddCaseInsight ? (
                <AddCaseInsightActionButton onClick={onAddCaseInsight} disabled={promoteDisabled} style={{ flex: "1 1 160px" }} />
              ) : null}
              <button type="button" style={sc.btnPrimary} disabled={caseArchived || noteBusy || !quickNote.trim()} onClick={() => void saveQuickNote()}>
                {noteBusy ? "Saving…" : "Add live note"}
              </button>
            </div>
          </div>
          <WorkflowFieldSubitems
            fields={liveFieldsMobile}
            values={draftTextValues}
            onChange={(key, value) => setDraftField(key as ObservationWorkflowFieldKey, value as ObservationWorkflowDraft[ObservationWorkflowFieldKey])}
            disabled={caseArchived}
            inputStyle={sc.input}
          />
        </>
      );
    }

    if (stageId === "debrief") {
      return (
        <>
          <CaseObservationObjectivesRecap caseRow={caseRow} />
          <WorkflowFieldSubitems
            fields={debriefFieldsMobile}
            values={draftTextValues}
            onChange={(key, value) => setDraftField(key as ObservationWorkflowFieldKey, value as ObservationWorkflowDraft[ObservationWorkflowFieldKey])}
            disabled={caseArchived}
            inputStyle={sc.input}
          />
          {onAddCaseInsight ? (
            <AddCaseInsightActionButton
              onClick={onAddCaseInsight}
              disabled={promoteDisabled}
              style={{ marginTop: 4, width: "100%" }}
            />
          ) : null}
          {onPromoteProviderIntelligence ? (
            <button
              type="button"
              data-surgical-press
              style={{ ...sc.btnSecondary, justifyContent: "center", marginTop: 4 }}
              disabled={promoteDisabled}
              onClick={onPromoteProviderIntelligence}
            >
              {UPDATE_PROVIDER_INTELLIGENCE_ACTION_LABEL}
            </button>
          ) : null}
        </>
      );
    }

    if (stageId === "follow_up") {
      return (
        <>
          <WorkflowFieldSubitems
            fields={followUpFieldsMobile}
            values={draftTextValues}
            onChange={(key, value) => setDraftField(key as ObservationWorkflowFieldKey, value as ObservationWorkflowDraft[ObservationWorkflowFieldKey])}
            disabled={caseArchived}
            inputStyle={sc.input}
          />
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 700, padding: "4px 2px" }}>
            <input type="checkbox" checked={draft.follow_up_needed} onChange={(event) => setDraftField("follow_up_needed", event.target.checked)} disabled={caseArchived} />
            Follow-up needed?
          </label>
        </>
      );
    }

    return (
      <div style={{ display: "grid", gap: 8 }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 800 }}>Link to opportunity</span>
          <select
            value={draft.related_opportunity_id}
            onChange={(event) => setDraftField("related_opportunity_id", event.target.value)}
            disabled={caseArchived || opportunitiesBusy}
            style={sc.input}
          >
            <option value="">{opportunitiesBusy ? "Loading opportunities…" : "No related opportunity"}</option>
            {opportunityOptions.map((opp) => (
              <option key={opp.id} value={opp.id}>
                {formatRelatedOpportunityLabel(opp)}
              </option>
            ))}
          </select>
        </label>
        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 800 }}>Recommended next stage</span>
          <select
            value={draft.debrief_recommended_next_stage}
            onChange={(event) => setDraftField("debrief_recommended_next_stage", event.target.value)}
            disabled={caseArchived}
            style={sc.input}
          >
            <option value="">No recommendation yet</option>
            {SALES_STAGES.map((stageOption) => (
              <option key={stageOption} value={stageOption}>
                {SALES_STAGE_LABEL[stageOption]}
              </option>
            ))}
          </select>
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 700 }}>
          <input
            type="checkbox"
            checked={draft.debrief_product_opportunity_identified}
            onChange={(event) => setDraftField("debrief_product_opportunity_identified", event.target.checked)}
            disabled={caseArchived}
          />
          Product fit identified?
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 700 }}>
          <input
            type="checkbox"
            checked={draft.debrief_convert_to_product_support_case}
            onChange={(event) => setDraftField("debrief_convert_to_product_support_case", event.target.checked)}
            disabled={caseArchived}
          />
          Convert to Product Support Case?
        </label>
        {linkedOpportunity ? (
          <div className="case-obs-inline-actions">
            <Link href={`/portal/sales/opportunities/${encodeURIComponent(linkedOpportunity.id)}`} data-surgical-press style={sc.btnSecondary}>
              Open opportunity
            </Link>
            {draft.debrief_recommended_next_stage ? (
              <button
                type="button"
                style={sc.btnPrimary}
                disabled={caseArchived || opportunityActionBusy || busy}
                onClick={() => void moveOpportunityStage(draft.debrief_recommended_next_stage)}
              >
                {opportunityActionBusy ? "Updating…" : "Update stage"}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <div className="case-detail-surface case-mobile-panel case-mobile-workflow-tab case-mobile-workflow-tab--procedural">
      <style dangerouslySetInnerHTML={{ __html: workflowCss }} />
      <p className="case-workflow-tab-lead">
        Pre-case preparation, validation targets, and structured workflow intelligence. Use Overview for live field
        notes in the OR.
      </p>
      <ObservationWorkflowMobilePanel
        stages={stageSummary}
        activeStage={activeStage}
        onStageToggle={toggleStage}
        statusForKeys={statusForKeys}
        autosaveError={autosaveError}
        renderStageBody={renderMobileStageBody}
        primarySuggestionTitle={primaryMove?.title ?? null}
        onPrimarySuggestion={primaryMove ? handlePrimarySuggestion : undefined}
        onAddCaseInsight={onAddCaseInsight}
        addCaseInsightDisabled={promoteDisabled}
      />
    </div>
  );
}

function LineUsageCard({
  line,
  caseId,
  disabled,
  onSaved,
  onError,
}: {
  line: LineRow;
  caseId: string;
  disabled: boolean;
  onSaved: () => void;
  onError: (m: string) => void;
}) {
  const [actual, setActual] = React.useState(line.actual_quantity != null ? String(line.actual_quantity) : "");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    setActual(line.actual_quantity != null ? String(line.actual_quantity) : "");
  }, [line.id, line.actual_quantity]);

  const save = async () => {
    const n = actual.trim() === "" ? null : Number(actual);
    if (actual.trim() !== "" && (!Number.isFinite(n) || (n as number) < 0)) {
      onError("Actual quantity must be empty or a non-negative number.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(
        `/api/portal/sales/surgical-cases/${encodeURIComponent(caseId)}/products/${encodeURIComponent(line.id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ actual_quantity: n }),
        }
      );
      const j = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !j.ok) throw new Error(j.error || "Update failed");
      onSaved();
    } catch (e: unknown) {
      onError(userFacingError(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        padding: 10,
        borderRadius: 10,
        border: "1px solid color-mix(in srgb, var(--foreground) 5%, var(--border))",
        background: "color-mix(in srgb, var(--foreground) 1.5%, var(--surface))",
        display: "grid",
        gap: 8,
      }}
    >
      <div style={{ fontWeight: 800, fontSize: 14 }}>{line.product_name || "—"}</div>
      <div>
        <div style={{ fontSize: 11, fontWeight: 800, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>SKU</div>
        <div style={{ fontWeight: 800, fontSize: 13 }}>{line.sku_code || "—"}</div>
        {line.sku_description ? <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{line.sku_description}</div> : null}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, color: "var(--muted)" }}>Expected</div>
          <div style={{ fontWeight: 700 }}>{line.expected_quantity != null ? String(line.expected_quantity) : "—"}</div>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 8, flex: "1 1 120px" }}>
          <label style={{ display: "grid", gap: 4, flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: "var(--muted)" }}>Actual used</span>
            <input
              value={actual}
              onChange={(e) => setActual(e.target.value)}
              style={{ ...sc.input, maxWidth: 120 }}
              inputMode="decimal"
              disabled={disabled || saving}
            />
          </label>
          <button type="button" style={{ ...sc.btnPrimary, minWidth: 120, justifyContent: "center" }} disabled={disabled || saving} onClick={() => void save()}>
            {saving ? "…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

function EditCaseModal({
  caseRow,
  caseType,
  accounts,
  products,
  onClose,
  onSave,
}: {
  caseRow: Record<string, unknown>;
  caseType?: string | null;
  accounts: { id: string; name?: string | null }[];
  products: { id: string; name: string }[];
  onClose: () => void;
  onSave: (patch: Record<string, unknown>) => Promise<boolean>;
}) {
  const [editCaseType, setEditCaseType] = React.useState<"observation" | "product_support">(
    isSurgicalObservationCase(caseType) ? "observation" : "product_support",
  );
  const isObservationCase = editCaseType === "observation";
  type NewCaseDefaultsPayload = { procedure_suggestions?: string[] };
  const [accountId, setAccountId] = React.useState(String(caseRow.account_id ?? ""));
  const [surgeonId, setSurgeonId] = React.useState(caseRow.surgeon_contact_id ? String(caseRow.surgeon_contact_id) : "");
  const [contacts, setContacts] = React.useState<{ id: string; first_name?: string | null; last_name?: string | null; email?: string | null }[]>([]);
  const [caseDate, setCaseDate] = React.useState(caseRow.case_date ? String(caseRow.case_date).slice(0, 10) : "");
  const [caseTime, setCaseTime] = React.useState(caseRow.case_time ? String(caseRow.case_time).slice(0, 5) : "");
  const [procedure, setProcedure] = React.useState(caseRow.procedure_type ? String(caseRow.procedure_type) : "");
  const [productId, setProductId] = React.useState(caseRow.product_id ? String(caseRow.product_id) : "");
  const [expRev, setExpRev] = React.useState(caseRow.expected_revenue != null ? String(caseRow.expected_revenue) : "");
  const [actRev, setActRev] = React.useState(caseRow.actual_revenue != null ? String(caseRow.actual_revenue) : "");
  const [notes, setNotes] = React.useState(caseRow.notes ? String(caseRow.notes) : "");
  const [saving, setSaving] = React.useState(false);
  const [defaults, setDefaults] = React.useState<NewCaseDefaultsPayload | null>(null);
  const [phiAdvisory, setPhiAdvisory] = React.useState<null | { onContinue: () => Promise<void> }>(null);
  const notePhiKinds = React.useMemo(() => detectSurgicalPhiPatternKinds(notes), [notes]);
  const procedureSuggestions = React.useMemo(
    () => cleanProcedureSuggestions(defaults?.procedure_suggestions ?? []),
    [defaults?.procedure_suggestions],
  );

  React.useEffect(() => {
    if (!accountId) {
      setContacts([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      const res = await fetch(`/api/portal/sales/surgical-accounts/${encodeURIComponent(accountId)}`, { cache: "no-store" });
      const j = (await res.json()) as { contacts?: typeof contacts };
      if (!cancelled) setContacts(j.contacts || []);
    })();
    return () => {
      cancelled = true;
    };
  }, [accountId]);

  React.useEffect(() => {
    let cancelled = false;
    const u = new URL("/api/portal/sales/surgical-cases/new-defaults", window.location.origin);
    if (accountId) u.searchParams.set("account_id", accountId);
    if (productId) u.searchParams.set("product_id", productId);
    if (surgeonId) u.searchParams.set("surgeon_contact_id", surgeonId);
    void (async () => {
      try {
        const res = await fetch(u.toString(), { cache: "no-store" });
        const j = (await res.json()) as { ok?: boolean; defaults?: NewCaseDefaultsPayload };
        if (!cancelled) setDefaults(res.ok && j.ok ? j.defaults ?? null : null);
      } catch {
        if (!cancelled) setDefaults(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [accountId, productId, surgeonId]);

  const runSave = async () => {
    setSaving(true);
    try {
      const patch: Record<string, unknown> = {
        case_type: editCaseType,
        account_id: accountId,
        surgeon_contact_id: surgeonId || null,
        case_date: caseDate,
        case_time: caseTime.trim() || null,
        procedure_type: procedure.trim() || null,
        notes: notes.trim() || null,
      };
      if (editCaseType === "product_support") {
        patch.product_id = productId.trim() ? productId : null;
        if (isSurgicalObservationCase(caseType)) {
          patch.debrief_convert_to_product_support_case = true;
        }
      }
      if (expRev.trim() !== "") {
        const n = Number(expRev.replace(/[$,]/g, ""));
        if (Number.isFinite(n) && n >= 0) patch.expected_revenue = n;
      }
      if (actRev.trim() !== "") {
        const n = Number(actRev.replace(/[$,]/g, ""));
        if (Number.isFinite(n) && n >= 0) patch.actual_revenue = n;
      }

      await onSave(patch);
    } finally {
      setSaving(false);
    }
  };

  const submit = () => {
    void (async () => {
      if (notePhiKinds.length) {
        setPhiAdvisory({ onContinue: runSave });
        return;
      }
      await runSave();
    })();
  };

  return (
    <>
      <PhiPatternAdvisoryModal
        open={phiAdvisory !== null}
        kinds={notePhiKinds}
        onCancel={() => setPhiAdvisory(null)}
        onContinue={() => {
          const fn = phiAdvisory?.onContinue;
          setPhiAdvisory(null);
          void fn?.();
        }}
      />
      <ModalShell title="Edit case" onClose={onClose}>
      <div style={{ display: "grid", gap: 12 }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontWeight: 700, fontSize: 13 }}>Case type</span>
          <select
            value={editCaseType}
            onChange={(e) => setEditCaseType(e.target.value === "observation" ? "observation" : "product_support")}
            style={sc.input}
          >
            <option value="observation">Observation</option>
            <option value="product_support">Product support</option>
          </select>
        </label>
        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontWeight: 700, fontSize: 13 }}>Organization</span>
          <select value={accountId} onChange={(e) => setAccountId(e.target.value)} style={sc.input}>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name || a.id}
              </option>
            ))}
          </select>
        </label>
        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontWeight: 700, fontSize: 13 }}>Surgeon / contact</span>
          <select value={surgeonId} onChange={(e) => setSurgeonId(e.target.value)} style={sc.input}>
            <option value="">None</option>
            {contacts.map((c) => (
              <option key={c.id} value={c.id}>
                {contactDisplayName(c)}
              </option>
            ))}
          </select>
        </label>
        <div className="edit-case-two-col">
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontWeight: 700, fontSize: 13 }}>Case date</span>
            <input type="date" value={caseDate} onChange={(e) => setCaseDate(e.target.value)} style={sc.input} />
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontWeight: 700, fontSize: 13 }}>Case time</span>
            <input type="time" value={caseTime} onChange={(e) => setCaseTime(e.target.value)} style={sc.input} />
          </label>
        </div>
        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontWeight: 700, fontSize: 13 }}>Procedure</span>
          <input value={procedure} onChange={(e) => setProcedure(e.target.value)} style={sc.input} />
          {procedureSuggestions.length > 0 ? (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }} role="group" aria-label="Suggested procedures">
              {procedureSuggestions.map((suggestion) => {
                const selected = procedure.trim().toLowerCase() === suggestion.toLowerCase();
                return (
                  <button
                    key={suggestion}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setProcedure(suggestion)}
                    style={{
                      borderRadius: 999,
                      padding: "5px 12px",
                      fontSize: 11,
                      fontWeight: 750,
                      cursor: "pointer",
                      fontFamily: "inherit",
                      border: selected
                        ? "1px solid rgba(13, 148, 136, 0.5)"
                        : "1px solid color-mix(in srgb, var(--foreground) 10%, var(--border))",
                      background: selected ? "linear-gradient(180deg, #f0fdfa, #ccfbf1)" : "#fff",
                      color: selected ? "#0f766e" : "color-mix(in srgb, var(--foreground) 78%, var(--muted))",
                    }}
                  >
                    {suggestion}
                  </button>
                );
              })}
            </div>
          ) : null}
        </label>
        {!isObservationCase ? (
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontWeight: 700, fontSize: 13 }}>Product family</span>
            <select value={productId} onChange={(e) => setProductId(e.target.value)} style={sc.input}>
              <option value="">—</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontWeight: 700, fontSize: 13 }}>Revenue per case (USD)</span>
          <input value={expRev} onChange={(e) => setExpRev(e.target.value)} placeholder="Expected" style={sc.input} />
        </label>
        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontWeight: 700, fontSize: 13 }}>Actual revenue (USD)</span>
          <input value={actRev} onChange={(e) => setActRev(e.target.value)} placeholder="Optional until case closes" style={sc.input} />
        </label>
        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontWeight: 700, fontSize: 13 }}>Case notes</span>
          <p className="case-phi-hide-mobile" style={{ ...muted, margin: 0, lineHeight: 1.45, fontWeight: 600 }}>{SURGICAL_PHI_UI_NOTICE}</p>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} style={{ ...sc.input, resize: "vertical" }} />
          <div className="case-phi-hide-mobile">
            <PhiPatternInlineHint kinds={notePhiKinds} />
          </div>
        </label>
        <div className="case-modal-actions">
          <button type="button" style={sc.btnSecondary} onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="button" style={sc.btnPrimary} onClick={submit} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </ModalShell>
    </>
  );
}

function AddLineModal({
  products,
  onClose,
  onSave,
}: {
  products: { id: string; name: string }[];
  onClose: () => void;
  onSave: (body: { product_id: string; sku_id: string; expected_quantity: number }) => Promise<void>;
}) {
  const [productId, setProductId] = React.useState("");
  const [skuId, setSkuId] = React.useState("");
  const [qty, setQty] = React.useState("1");
  const [skus, setSkus] = React.useState<{ id: string; sku: string; description?: string | null }[]>([]);

  React.useEffect(() => {
    if (!productId) {
      setSkus([]);
      setSkuId("");
      return;
    }
    let cancelled = false;
    void (async () => {
      const res = await fetch(`/api/portal/sales/surgical-catalog/skus?product_id=${encodeURIComponent(productId)}`, {
        cache: "no-store",
      });
      const j = (await res.json()) as { skus?: { id: string; sku: string; description?: string | null }[] };
      if (!cancelled) {
        setSkus(j.skus || []);
        setSkuId("");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [productId]);

  return (
    <ModalShell title="Add product / SKU" onClose={onClose}>
      <div style={{ display: "grid", gap: 12 }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontWeight: 700, fontSize: 13 }}>Product</span>
          <select value={productId} onChange={(e) => setProductId(e.target.value)} style={sc.input}>
            <option value="">Select…</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontWeight: 700, fontSize: 13 }}>SKU</span>
          <select value={skuId} onChange={(e) => setSkuId(e.target.value)} style={sc.input} disabled={!productId}>
            <option value="">{skus.length ? "Select SKU…" : "—"}</option>
            {skus.map((s) => (
              <option key={s.id} value={s.id}>
                {s.sku}
              </option>
            ))}
          </select>
        </label>
        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontWeight: 700, fontSize: 13 }}>Expected quantity</span>
          <input value={qty} onChange={(e) => setQty(e.target.value)} style={sc.input} type="number" min={1} />
        </label>
        <div className="case-modal-actions">
          <button type="button" style={sc.btnSecondary} onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            style={sc.btnPrimary}
            onClick={() =>
              void onSave({
                product_id: productId,
                sku_id: skuId,
                expected_quantity: Number(qty),
              })
            }
            disabled={!productId || !skuId || !Number.isFinite(Number(qty)) || Number(qty) <= 0}
          >
            Add
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

function UploadDocModal({
  caseId,
  initialDocumentType,
  lockDocumentType = false,
  onClose,
  onDone,
  onMsg,
}: {
  caseId: string;
  initialDocumentType: string;
  lockDocumentType?: boolean;
  onClose: () => void;
  onDone: () => Promise<void>;
  onMsg: (s: string | null) => void;
}) {
  const [docType, setDocType] = React.useState<string>(initialDocumentType);
  React.useEffect(() => {
    setDocType(initialDocumentType);
  }, [initialDocumentType]);
  const [file, setFile] = React.useState<File | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [phiAdvisory, setPhiAdvisory] = React.useState<null | { onContinue: () => Promise<void> }>(null);
  const cameraInputRef = React.useRef<HTMLInputElement>(null);
  const galleryInputRef = React.useRef<HTMLInputElement>(null);
  const pdfInputRef = React.useRef<HTMLInputElement>(null);
  const fileNamePhiKinds = React.useMemo(() => detectSurgicalPhiPatternKinds(file?.name ?? ""), [file?.name]);
  const photoAllowed = surgicalCaseDocumentTypeAllowsPhoto(docType);
  const previewUrl = React.useMemo(() => {
    if (!file) return null;
    const mime = (file.type || "").toLowerCase();
    if (mime !== "image/jpeg" && mime !== "image/jpg" && mime !== "image/png" && mime !== "image/webp") return null;
    return URL.createObjectURL(file);
  }, [file]);
  React.useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function chooseFile(next: File | null) {
    setFile(next);
    if (cameraInputRef.current) cameraInputRef.current.value = "";
    if (galleryInputRef.current) galleryInputRef.current.value = "";
    if (pdfInputRef.current) pdfInputRef.current.value = "";
  }

  function changeDocType(nextType: string) {
    setDocType(nextType);
    if (file && surgicalCaseDocumentFileLooksLikeImage(file) && !surgicalCaseDocumentTypeAllowsPhoto(nextType)) {
      setFile(null);
    }
  }

  const runUpload = async () => {
    if (!file) {
      onMsg("Choose a file.");
      return;
    }
    setBusy(true);
    onMsg(null);
    try {
      const fd = new FormData();
      fd.set("document_type", docType);
      fd.set("file", file);
      const res = await fetch(`/api/portal/sales/surgical-cases/${encodeURIComponent(caseId)}/documents`, {
        method: "POST",
        body: fd,
      });
      const j = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !j.ok) throw new Error(j.error || "Upload failed");
      await onDone();
    } catch (e: unknown) {
      onMsg(userFacingError(e, "We could not upload that file. Please try again."));
    } finally {
      setBusy(false);
    }
  };

  const submit = () => {
    void (async () => {
      if (!file) {
        onMsg("Choose a file.");
        return;
      }
      if (fileNamePhiKinds.length) {
        setPhiAdvisory({ onContinue: runUpload });
        return;
      }
      await runUpload();
    })();
  };

  const modalTitle = photoAllowed ? `Upload ${formatSurgicalCaseDocumentType(docType).toLowerCase()}` : "Upload document";

  return (
    <>
      <PhiPatternAdvisoryModal
        open={phiAdvisory !== null}
        kinds={fileNamePhiKinds}
        onCancel={() => setPhiAdvisory(null)}
        onContinue={() => {
          const fn = phiAdvisory?.onContinue;
          setPhiAdvisory(null);
          void fn?.();
        }}
      />
      <ModalShell title={modalTitle} onClose={onClose}>
      <div style={{ display: "grid", gap: 12 }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontWeight: 700, fontSize: 13 }}>Type</span>
          {lockDocumentType ? (
            <div style={{ ...sc.input, display: "flex", alignItems: "center" }}>
              {formatSurgicalCaseDocumentType(docType)}
            </div>
          ) : (
            <select value={docType} onChange={(e) => changeDocType(e.target.value)} style={sc.input}>
              {SURGICAL_CASE_DOCUMENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {formatSurgicalCaseDocumentType(t)}
                </option>
              ))}
            </select>
          )}
        </label>
        <div style={{ display: "grid", gap: 8 }}>
          <span style={{ fontWeight: 700, fontSize: 13 }}>File</span>
          {photoAllowed ? (
            <p style={{ ...muted, margin: 0, lineHeight: 1.45, fontWeight: 600 }}>
              PDF or a photo of the paper {formatSurgicalCaseDocumentType(docType).toLowerCase()}. Do not include patient names, faces, DOBs, MRNs, or other PHI.
            </p>
          ) : (
            <>
              <p style={{ ...muted, margin: 0, lineHeight: 1.45, fontWeight: 600 }}>PDF or office documents only.</p>
              <p className="case-upload-phi" style={{ ...muted, margin: 0, lineHeight: 1.45, fontWeight: 600 }}>{SURGICAL_PHI_UI_NOTICE}</p>
            </>
          )}

          {photoAllowed ? (
            <>
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                hidden
                onChange={(e) => chooseFile(e.target.files?.[0] ?? null)}
              />
              <input
                ref={galleryInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => chooseFile(e.target.files?.[0] ?? null)}
              />
              <input
                ref={pdfInputRef}
                type="file"
                accept="application/pdf,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
                hidden
                onChange={(e) => chooseFile(e.target.files?.[0] ?? null)}
              />
              <div className="case-upload-pickers">
                <button
                  type="button"
                  className="case-upload-pick-btn case-upload-pick-camera"
                  disabled={busy}
                  onClick={() => cameraInputRef.current?.click()}
                >
                  Take photo
                </button>
                <button type="button" className="case-upload-pick-btn" disabled={busy} onClick={() => galleryInputRef.current?.click()}>
                  Choose from photos
                </button>
                <button type="button" className="case-upload-pick-btn" disabled={busy} onClick={() => pdfInputRef.current?.click()}>
                  Choose PDF
                </button>
              </div>
            </>
          ) : (
            <input
              type="file"
              accept="application/pdf,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
              onChange={(e) => chooseFile(e.target.files?.[0] ?? null)}
              style={sc.input}
            />
          )}

          {file ? (
            <div className="case-upload-selected">
              <span style={{ fontWeight: 800, fontSize: 13 }}>{file.name}</span>
              {previewUrl ? <img src={previewUrl} alt="Selected photo preview" /> : null}
            </div>
          ) : null}
          <PhiPatternInlineHint kinds={fileNamePhiKinds} />
        </div>
        <div className="case-modal-actions">
          <button type="button" style={sc.btnSecondary} onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="button" style={sc.btnPrimary} onClick={submit} disabled={busy}>
            {busy ? "Uploading…" : "Upload"}
          </button>
        </div>
      </div>
    </ModalShell>
    </>
  );
}

function RescheduleObservationModal({
  caseRow,
  busy,
  onClose,
  onSave,
}: {
  caseRow: Record<string, unknown>;
  busy: boolean;
  onClose: () => void;
  onSave: (patch: { case_date: string; case_time: string | null }) => Promise<boolean>;
}) {
  const [caseDate, setCaseDate] = React.useState(
    caseRow.case_date ? String(caseRow.case_date).slice(0, 10) : "",
  );
  const [caseTime, setCaseTime] = React.useState(
    caseRow.case_time ? String(caseRow.case_time).slice(0, 5) : "",
  );
  const [saving, setSaving] = React.useState(false);

  const submit = () => {
    if (!caseDate.trim()) return;
    void (async () => {
      setSaving(true);
      try {
        await onSave({
          case_date: caseDate,
          case_time: caseTime.trim() || null,
        });
      } finally {
        setSaving(false);
      }
    })();
  };

  return (
    <ModalShell title="Reschedule observation" onClose={onClose}>
      <div style={{ display: "grid", gap: 12 }}>
        <label style={{ display: "grid", gap: 6, fontSize: 13, fontWeight: 700 }}>
          Case date
          <input type="date" value={caseDate} onChange={(e) => setCaseDate(e.target.value)} />
        </label>
        <label style={{ display: "grid", gap: 6, fontSize: 13, fontWeight: 700 }}>
          Case time
          <input type="time" value={caseTime} onChange={(e) => setCaseTime(e.target.value)} />
        </label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "flex-end" }}>
          <button type="button" style={sc.btnSecondary} onClick={onClose} disabled={saving || busy}>
            Cancel
          </button>
          <button
            type="button"
            style={sc.btnPrimary}
            onClick={submit}
            disabled={saving || busy || !caseDate.trim()}
          >
            Save new date
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

function StatusModal({
  current,
  busy,
  onClose,
  onPick,
}: {
  current: string;
  busy: boolean;
  onClose: () => void;
  onPick: (s: string) => Promise<void>;
}) {
  return (
    <ModalShell title="Change status" onClose={onClose}>
      <div className="status-pick-list">
        {SURGICAL_CASE_STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            style={{
              ...sc.btnSecondary,
              opacity: s === current ? 0.55 : 1,
            }}
            disabled={s === current || busy}
            onClick={() => void onPick(s)}
          >
            {formatSurgicalCaseStatus(s)}
            {s === current ? " (current)" : ""}
          </button>
        ))}
      </div>
    </ModalShell>
  );
}

function NoteModal({
  context,
  onClose,
  onSave,
  onAddCaseInsight,
}: {
  context: OperationalNoteContextDefaults;
  onClose: () => void;
  onSave: (input: CreateOperationalNoteClientInput) => Promise<void>;
  onAddCaseInsight?: () => void;
}) {
  const [busy, setBusy] = React.useState(false);
  const [phiAdvisory, setPhiAdvisory] = React.useState<null | { input: CreateOperationalNoteClientInput }>(null);
  const [phiPreview, setPhiPreview] = React.useState("");
  const bodyPhiKinds = React.useMemo(() => detectSurgicalPhiPatternKinds(phiPreview), [phiPreview]);

  const runSave = async (input: CreateOperationalNoteClientInput) => {
    setBusy(true);
    try {
      await onSave(input);
    } finally {
      setBusy(false);
    }
  };

  const handleSave = async (input: CreateOperationalNoteClientInput) => {
    const trimmed = input.body.trim();
    if (!trimmed) return;
    setPhiPreview(trimmed);
    if (detectSurgicalPhiPatternKinds(trimmed).length) {
      setPhiAdvisory({ input: { ...input, body: trimmed } });
      return;
    }
    await runSave({ ...input, body: trimmed });
  };

  return (
    <>
      <PhiPatternAdvisoryModal
        open={phiAdvisory !== null}
        kinds={detectSurgicalPhiPatternKinds(phiAdvisory?.input.body ?? "")}
        onCancel={() => setPhiAdvisory(null)}
        onContinue={() => {
          const input = phiAdvisory?.input;
          setPhiAdvisory(null);
          if (input) void runSave(input);
        }}
      />
      <ModalShell title="Add timeline note" onClose={onClose}>
        <OperationalNoteComposer context={context} busy={busy} disabled={busy} rows={5} onSave={handleSave} />
        <div className="case-phi-hide-mobile" style={{ marginTop: 8 }}>
          <PhiPatternInlineHint kinds={bodyPhiKinds} />
        </div>
        <p className="case-phi-hide-mobile" style={{ ...muted, marginTop: 8, fontWeight: 600 }}>{SURGICAL_PHI_UI_NOTICE}</p>
        <div className="case-modal-actions" style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "flex-end" }}>
          {onAddCaseInsight ? (
            <button
              type="button"
              style={sc.btnSecondary}
              disabled={busy}
              onClick={() => {
                onClose();
                onAddCaseInsight();
              }}
            >
              {ADD_CASE_INSIGHT_TO_PROVIDER_DISCOVERY_LABEL}
            </button>
          ) : null}
          <button type="button" style={sc.btnSecondary} onClick={onClose} disabled={busy}>
            Cancel
          </button>
        </div>
      </ModalShell>
    </>
  );
}

function ModalShell({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal
      className="case-modal-shell-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        background: "color-mix(in srgb, var(--foreground) 35%, transparent)",
        display: "grid",
        placeItems: "center",
        zIndex: 60,
      }}
    >
      <div
        className="case-modal-shell-panel"
        style={{
          background: "var(--surface)",
          borderRadius: 14,
          padding: 20,
          border: "1px solid var(--border)",
          maxHeight: "min(90vh, calc(100dvh - 32px))",
          overflow: "auto",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 14 }}>
          <div style={{ fontWeight: 900, fontSize: 18 }}>{title}</div>
          <button type="button" className="case-modal-shell-close" style={{ ...sc.btnSecondary }} onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
