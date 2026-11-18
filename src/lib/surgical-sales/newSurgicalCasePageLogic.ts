/**
 * Pure rules for New Surgical Case — shared by the portal client and unit tests.
 */

import { detectSurgicalPhiPatternKinds } from "@/lib/surgical-sales/phiContentHeuristics";
import { isCaseDateInThePast } from "@/lib/surgical-sales/casePerformedStatus";
import {
  OBSERVATION_OBJECTIVE_CHIP_OPTIONS,
  type ObservationObjectivesDraft,
} from "@/lib/surgical-sales/observationObjectives";
import { SALES_PATHWAY_STAGE_SHORT_LABELS } from "@/lib/surgical-sales/salesPathwayCanonical";

export type NewCaseType = "observation" | "product_support";

export type NewCasePathwayContext = {
  stageText: string;
  phaseText: string | null;
  missionText: string;
};

export function resolveNewCasePathwayContext(caseType: NewCaseType): NewCasePathwayContext {
  const ctx = resolveOperationalPlanningContext(caseType);
  return {
    stageText: ctx.stageText,
    phaseText: ctx.phaseText,
    missionText: ctx.missionText,
  };
}

export function resolveQuickAddPostSaveHref(caseId: string, _caseType: NewCaseType): string {
  const id = encodeURIComponent(caseId);
  return `/portal/sales/cases/${id}`;
}

/** Rep-facing pathway framing for the quick-add capture screen. */
export function resolveQuickAddPathwayContext(caseType: NewCaseType): NewCasePathwayContext {
  if (caseType === "product_support") {
    return {
      stageText: `${SALES_PATHWAY_STAGE_SHORT_LABELS.evaluation} / Support`,
      phaseText: "Quick capture",
      missionText: "Log the case now — enrich support details after save",
    };
  }
  return {
    stageText: `${SALES_PATHWAY_STAGE_SHORT_LABELS.discovery} → ${SALES_PATHWAY_STAGE_SHORT_LABELS.observe}`,
    phaseText: "Quick capture",
    missionText: "Log the case now — enrich access and goals on the case page when ready",
  };
}

/** Rep-facing framing for post-save operational planning. */
export function resolveOperationalPlanningContext(caseType: NewCaseType): NewCasePathwayContext & {
  pageTitle: string;
  pageSubtitle: string;
} {
  if (caseType === "product_support") {
    return {
      stageText: `${SALES_PATHWAY_STAGE_SHORT_LABELS.evaluation} / Support`,
      phaseText: "Support planning phase",
      missionText: "Product, coverage, and field execution details",
      pageTitle: "Support planning",
      pageSubtitle: "Enrich product, inventory, and coverage intelligence at your pace.",
    };
  }
  return {
    stageText: `${SALES_PATHWAY_STAGE_SHORT_LABELS.discovery} → ${SALES_PATHWAY_STAGE_SHORT_LABELS.observe}`,
    phaseText: "Operational planning phase",
    missionText: "Access, objectives, and field intelligence enrichment",
    pageTitle: "Observation planning",
    pageSubtitle: "Build operational readiness progressively — nothing blocks draft save.",
  };
}

export type QuickAddValidationInput = {
  caseType: NewCaseType;
  surgeonId: string;
  accountId: string;
  caseDate: string;
  procedureType: string;
  notes: string;
  phiAcknowledged: boolean;
  expectedRevenue?: string;
};

/** Parse optional USD revenue text ($1,200 → 1200). Empty → null. */
export function parseOptionalCaseRevenue(raw: string): { ok: true; value: number | null } | { ok: false } {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: true, value: null };
  const n = Number(trimmed.replace(/[$,]/g, ""));
  if (!Number.isFinite(n) || n < 0) return { ok: false };
  return { ok: true, value: n };
}

export function validateQuickAddCase(input: QuickAddValidationInput): NewCaseSubmitValidationResult {
  const blockers: NewCaseSaveBlocker[] = [];

  if (!input.surgeonId.trim()) {
    blockers.push({
      id: "provider",
      message:
        input.caseType === "observation"
          ? "Select a provider for this observation case."
          : "Select a provider for this support case.",
    });
  }

  if (!input.accountId.trim()) {
    blockers.push({
      id: "facility",
      message: "Select a facility.",
    });
  }

  if (!input.caseDate.trim()) {
    blockers.push({
      id: "case_date",
      message: "Set a case date.",
    });
  }

  if (!input.procedureType.trim()) {
    blockers.push({
      id: "procedure",
      message: "Add procedure or specialty context.",
    });
  }

  if (input.expectedRevenue != null && input.expectedRevenue.trim()) {
    const parsed = parseOptionalCaseRevenue(input.expectedRevenue);
    if (!parsed.ok) {
      blockers.push({
        id: "revenue",
        message: "Revenue per case must be a valid amount (zero or greater).",
      });
    }
  }

  const kinds = detectSurgicalPhiPatternKinds(input.notes);
  if (kinds.length && !input.phiAcknowledged) {
    blockers.push({
      id: "notes_phi",
      message: "Review notes for possible PHI before saving.",
    });
  }

  if (blockers.length === 0) {
    return { ok: true, blockers: [] };
  }

  const phiBlocker = blockers.find((b) => b.id === "notes_phi");
  if (phiBlocker) {
    return { ok: false, error: "PHI_ACK_REQUIRED", blockers };
  }

  return { ok: false, error: blockers[0]!.message, blockers };
}

const EMPTY_OBSERVATION_OBJECTIVES: ObservationObjectivesDraft = {
  observation_goal: "",
  observation_key_questions: "",
  observation_signals_to_validate: "",
};

const DEFAULT_OBSERVATION_ACCESS: ObservationAccessDraft = {
  scheduling_owner: "",
  access_pathway: "Unknown",
  credentialing_requirement: "unknown",
  vendor_restrictions: "",
  preferred_timing: "",
};

function credentialingFromCaseRow(raw: unknown): ObservationAccessDraft["credentialing_requirement"] {
  const value = String(raw ?? "unknown").trim();
  if (value === "verified" || value === "completed") return "verified";
  if (value === "not_required") return "not_required";
  if (value === "in_progress") return "in_progress";
  if (value === "required" || value === "required_not_started") return "required_not_started";
  return "unknown";
}

export function observationAccessFromCaseRow(row: Record<string, unknown>): ObservationAccessDraft {
  const pathway = String(row.observation_access_pathway ?? "").trim();
  return {
    scheduling_owner: String(row.observation_access_scheduling_owner ?? "").trim(),
    access_pathway: pathway || "Unknown",
    credentialing_requirement: credentialingFromCaseRow(row.observation_access_credentialing),
    vendor_restrictions: String(row.observation_access_vendor_restrictions ?? "").trim(),
    preferred_timing: String(row.observation_access_preferred_timing ?? "").trim(),
  };
}

export function observationAccessHasContent(draft: ObservationAccessDraft): boolean {
  return Boolean(
    draft.scheduling_owner.trim() ||
      (draft.access_pathway.trim() && draft.access_pathway.trim().toLowerCase() !== "unknown") ||
      draft.credentialing_requirement !== "unknown" ||
      draft.vendor_restrictions.trim() ||
      draft.preferred_timing.trim(),
  );
}

export function buildObservationAccessPatch(access: ObservationAccessDraft): Record<string, unknown> {
  return {
    observation_access: {
      scheduling_owner: access.scheduling_owner.trim() || null,
      access_pathway: access.access_pathway.trim() || null,
      credentialing_requirement: access.credentialing_requirement,
      vendor_restrictions: access.vendor_restrictions.trim() || null,
      preferred_timing: access.preferred_timing.trim() || null,
    },
  };
}

export function buildObservationObjectivesPatch(
  objectives: ObservationObjectivesDraft,
): Record<string, unknown> {
  return {
    observation_goal: objectives.observation_goal.trim() || null,
    observation_key_questions: objectives.observation_key_questions.trim() || null,
    observation_signals_to_validate: objectives.observation_signals_to_validate.trim() || null,
  };
}

export function summarizeObservationAccessHint(access: ObservationAccessDraft): string {
  if (!observationAccessHasContent(access)) {
    return "Scheduler, pathway, credentialing — optional";
  }
  const parts: string[] = [];
  if (access.scheduling_owner.trim()) parts.push(access.scheduling_owner.trim());
  if (access.access_pathway.trim() && access.access_pathway.trim().toLowerCase() !== "unknown") {
    parts.push(access.access_pathway.trim());
  }
  if (access.credentialing_requirement !== "unknown") {
    const credLabels: Record<ObservationAccessDraft["credentialing_requirement"], string> = {
      unknown: "Credentialing unknown",
      not_required: "No credentialing",
      required_not_started: "Credentialing not started",
      in_progress: "Credentialing in progress",
      verified: "Credentialing verified",
    };
    parts.push(credLabels[access.credentialing_requirement]);
  }
  return parts.slice(0, 2).join(" · ") || "Access details on file";
}

export function buildQuickAddCreatePayload(input: {
  caseType: NewCaseType;
  accountId: string;
  surgeonId: string;
  caseDate: string;
  caseTime?: string;
  procedureType: string;
  notes: string;
  expectedRevenue?: string;
  engagementLocked?: boolean;
  lockedEngagementId?: string;
}): Record<string, unknown> {
  return buildNewCaseCreatePayload({
    caseType: input.caseType,
    engagementLocked: Boolean(input.engagementLocked),
    lockedEngagementId: input.lockedEngagementId ?? "",
    accountId: input.accountId,
    surgeonId: input.surgeonId,
    caseDate: input.caseDate,
    caseTime: input.caseTime ?? "",
    procedureType: input.procedureType,
    needsProducts: false,
    productId: "",
    skuId: "",
    expectedQty: "1",
    expectedRevenue: input.expectedRevenue ?? "",
    extraLines: [],
    notes: input.notes,
    followUpNeeded: false,
    relatedOpportunityId: "",
    observationObjectives: EMPTY_OBSERVATION_OBJECTIVES,
    observationAccess: DEFAULT_OBSERVATION_ACCESS,
    observationValidationTargetHints: [],
    supportSetupProcedure: input.procedureType,
    supportObjective: "",
    supportRepRole: "",
    supportRequiredMaterials: "",
    status:
      input.caseType === "observation" && isCaseDateInThePast(input.caseDate) ? "completed" : "draft",
  });
}

export type NewCaseExtraLine = {
  product_id: string;
  sku_id: string;
  expected_quantity: string;
};

export type ObservationAccessDraft = {
  scheduling_owner: string;
  access_pathway: string;
  credentialing_requirement: "unknown" | "not_required" | "required_not_started" | "in_progress" | "verified";
  vendor_restrictions: string;
  preferred_timing: string;
};

export type ObservationValidationTargetSource =
  | "manual"
  | "provider_signal"
  | "procedural_context"
  | "chip";

export type ObservationValidationTarget = {
  id: string;
  label: string;
  source: ObservationValidationTargetSource;
  status: "planned";
  created_at: string;
};

export type ObservationValidationTargetHint = {
  label: string;
  source: ObservationValidationTargetSource;
};

export function resolveShowCompactProviderContext(
  launchSurgeonContactId: string,
  providerPickerUnlocked: boolean,
): boolean {
  return Boolean(launchSurgeonContactId.trim()) && !providerPickerUnlocked;
}

export function resolveObservationProductLineComplete(productId: string, skuId: string): boolean {
  return Boolean(productId.trim() && skuId.trim());
}

export function resolveNeedsProducts(params: {
  caseType: NewCaseType;
  showProductsForObservation: boolean;
  observationProductLineComplete: boolean;
}): boolean {
  return (
    params.caseType === "product_support" ||
    (params.caseType === "observation" &&
      params.showProductsForObservation &&
      params.observationProductLineComplete)
  );
}

export type NewCaseSubmitValidationInput = {
  caseType: NewCaseType;
  surgeonId: string;
  accountId: string;
  caseDate: string;
  showProductsForObservation: boolean;
  productId: string;
  skuId: string;
  expectedQty: string;
  expectedRevenue: string;
  needsProducts: boolean;
  extraLines: NewCaseExtraLine[];
  notes: string;
  phiAcknowledged: boolean;
};

export type NewCaseSaveBlockerId =
  | "provider"
  | "facility"
  | "case_date"
  | "procedure"
  | "product"
  | "sku"
  | "product_focus"
  | "quantity"
  | "extra_lines"
  | "revenue"
  | "notes_phi";

export type NewCaseSaveBlocker = {
  id: NewCaseSaveBlockerId;
  message: string;
};

export type NewCaseSubmitValidationResult =
  | { ok: true; blockers: [] }
  | { ok: false; error: string; blockers: NewCaseSaveBlocker[] };

export function newCaseScheduledSaveLabel(caseType: NewCaseType, saving: boolean): string {
  if (saving) {
    return caseType === "observation" ? "Saving observation case…" : "Saving product support case…";
  }
  return caseType === "observation" ? "Save observation case" : "Save product support case";
}

export function newCaseReadyToSaveMessage(caseType: NewCaseType): string {
  return caseType === "observation"
    ? "Ready to save observation case."
    : "Ready to save product support case.";
}

/** Required-field blockers for scheduled save — shared by validation, readiness, and inline guidance. */
export function collectNewCaseSaveBlockers(input: NewCaseSubmitValidationInput): NewCaseSaveBlocker[] {
  const blockers: NewCaseSaveBlocker[] = [];

  if (!input.surgeonId.trim()) {
    blockers.push({
      id: "provider",
      message:
        input.caseType === "observation"
          ? "Select a provider for this observation case."
          : "Select a provider for this support case.",
    });
  }

  if (!input.accountId.trim()) {
    blockers.push({
      id: "facility",
      message: "Select an organization (facility).",
    });
  }

  const observationProductLineComplete = resolveObservationProductLineComplete(
    input.productId,
    input.skuId,
  );

  if (input.caseType === "product_support" || input.needsProducts) {
    if (input.caseType === "product_support" && !input.productId.trim()) {
      blockers.push({
        id: "product",
        message: "Select a product family for this support case.",
      });
    } else if (input.needsProducts && !input.productId.trim()) {
      blockers.push({
        id: "product",
        message: "Select a product family.",
      });
    }

    if (input.caseType === "product_support" && input.productId.trim() && !input.skuId.trim()) {
      blockers.push({
        id: "sku",
        message: "Select a SKU for this support case.",
      });
    } else if (input.needsProducts && input.productId.trim() && !input.skuId.trim()) {
      blockers.push({
        id: "sku",
        message: "Select a SKU.",
      });
    }

    if (input.needsProducts && input.productId.trim() && input.skuId.trim()) {
      const qty = Number(input.expectedQty);
      if (!Number.isFinite(qty) || qty <= 0) {
        blockers.push({
          id: "quantity",
          message: "Enter a positive expected quantity.",
        });
      }
    }

    for (const row of input.extraLines) {
      const touched = Boolean(row.product_id || row.sku_id || row.expected_quantity.trim() !== "");
      if (!touched) continue;
      const eq = Number(row.expected_quantity);
      if (!row.product_id || !row.sku_id || !Number.isFinite(eq) || eq <= 0) {
        blockers.push({
          id: "extra_lines",
          message: "Each extra SKU row needs a product, SKU, and positive quantity — or clear the row.",
        });
        break;
      }
    }
  }

  if (!input.caseDate.trim()) {
    blockers.push({
      id: "case_date",
      message: "Set a case date.",
    });
  }

  if (input.caseType === "observation" && input.showProductsForObservation) {
    const productTouched = Boolean(
      input.productId.trim() || input.skuId.trim() || input.expectedRevenue.trim(),
    );
    if (productTouched && !observationProductLineComplete) {
      blockers.push({
        id: "product_focus",
        message: "Finish optional product interest (product and SKU) or remove it.",
      });
    }
  }

  const revParsed = parseOptionalCaseRevenue(input.expectedRevenue);
  if (!revParsed.ok) {
    blockers.push({
      id: "revenue",
      message: "Revenue per case must be a valid amount (zero or greater).",
    });
  }

  const kinds = detectSurgicalPhiPatternKinds(input.notes);
  if (kinds.length && !input.phiAcknowledged) {
    blockers.push({
      id: "notes_phi",
      message: "Review notes for possible PHI before saving.",
    });
  }

  return blockers;
}

export function validateNewCaseSubmit(input: NewCaseSubmitValidationInput): NewCaseSubmitValidationResult {
  const blockers = collectNewCaseSaveBlockers(input);
  if (blockers.length === 0) {
    return { ok: true, blockers: [] };
  }

  const phiBlocker = blockers.find((b) => b.id === "notes_phi");
  if (phiBlocker) {
    return { ok: false, error: "PHI_ACK_REQUIRED", blockers };
  }

  return { ok: false, error: blockers[0]!.message, blockers };
}

export type NewCaseDraftValidationInput = Pick<
  NewCaseSubmitValidationInput,
  "accountId" | "notes" | "phiAcknowledged"
>;

export function validateNewCaseDraft(input: NewCaseDraftValidationInput): NewCaseSubmitValidationResult {
  const blockers: NewCaseSaveBlocker[] = [];

  if (!input.accountId.trim()) {
    blockers.push({
      id: "facility",
      message: "Select an organization before saving a draft.",
    });
  }

  const kinds = detectSurgicalPhiPatternKinds(input.notes);
  if (kinds.length && !input.phiAcknowledged) {
    blockers.push({
      id: "notes_phi",
      message: "Review notes for possible PHI before saving.",
    });
  }

  if (blockers.length === 0) {
    return { ok: true, blockers: [] };
  }

  const phiBlocker = blockers.find((b) => b.id === "notes_phi");
  if (phiBlocker) {
    return { ok: false, error: "PHI_ACK_REQUIRED", blockers };
  }

  return { ok: false, error: blockers[0]!.message, blockers };
}

export type NewCaseCreatePayloadInput = {
  caseType: NewCaseType;
  engagementLocked: boolean;
  lockedEngagementId: string;
  accountId: string;
  surgeonId: string;
  caseDate: string;
  caseTime: string;
  procedureType: string;
  needsProducts: boolean;
  productId: string;
  skuId: string;
  expectedQty: string;
  expectedRevenue: string;
  extraLines: NewCaseExtraLine[];
  notes: string;
  followUpNeeded: boolean;
  relatedOpportunityId: string;
  observationObjectives: ObservationObjectivesDraft;
  observationAccess: ObservationAccessDraft;
  observationValidationTargetHints?: ObservationValidationTargetHint[];
  supportSetupProcedure: string;
  supportObjective: string;
  supportRepRole: string;
  supportRequiredMaterials: string;
  status: "draft" | "scheduled" | "completed";
};

function normalizeObjectiveLines(text: string): string[] {
  return text
    .split(/\n+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function buildObservationValidationTargets(params: {
  objectives: ObservationObjectivesDraft;
  procedureType: string;
  hints?: ObservationValidationTargetHint[];
  createdAtIso: string;
}): ObservationValidationTarget[] {
  const hintsByLabel = new Map<string, ObservationValidationTargetSource>();
  for (const hint of params.hints ?? []) {
    const key = hint.label.trim().toLowerCase();
    if (!key) continue;
    hintsByLabel.set(key, hint.source);
  }

  const chipSet = new Set(OBSERVATION_OBJECTIVE_CHIP_OPTIONS.map((chip) => chip.toLowerCase()));
  const procedure = params.procedureType.trim().toLowerCase();
  const lines = [
    ...normalizeObjectiveLines(params.objectives.observation_goal),
    ...normalizeObjectiveLines(params.objectives.observation_key_questions),
    ...normalizeObjectiveLines(params.objectives.observation_signals_to_validate),
  ];

  const targets: ObservationValidationTarget[] = [];
  const seen = new Set<string>();
  for (const line of lines) {
    const label = line.trim();
    if (!label) continue;
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    const hinted = hintsByLabel.get(key);
    const source: ObservationValidationTargetSource =
      hinted ??
      (chipSet.has(key)
        ? "chip"
        : procedure && key.includes(procedure)
          ? "procedural_context"
          : "manual");

    targets.push({
      id: `ovt-${targets.length + 1}`,
      label,
      source,
      status: "planned",
      created_at: params.createdAtIso,
    });
  }
  return targets;
}

export function buildNewCaseCreatePayload(input: NewCaseCreatePayloadInput): Record<string, unknown> {
  const qty = Number(input.expectedQty);
  const extrasPayload = input.needsProducts
    ? input.extraLines
        .filter((row) => row.product_id && row.sku_id)
        .map((row) => ({
          product_id: row.product_id,
          sku_id: row.sku_id,
          expected_quantity: Number(row.expected_quantity),
        }))
    : [];

  const parsedRevenue = parseOptionalCaseRevenue(input.expectedRevenue);
  const revenue = parsedRevenue.ok ? parsedRevenue.value : null;

  const body: Record<string, unknown> = {
    case_type: input.caseType,
    ...(input.engagementLocked && input.lockedEngagementId
      ? { engagement_id: input.lockedEngagementId }
      : {}),
    account_id: input.accountId,
    surgeon_contact_id: input.surgeonId || null,
    case_date: input.caseDate,
    case_time: input.caseTime.trim() || null,
    procedure_type:
      input.caseType === "product_support"
        ? (input.supportObjective.trim() || input.supportSetupProcedure.trim() || input.procedureType.trim() || null)
        : input.procedureType.trim() || null,
    product_id: input.needsProducts ? input.productId : null,
    expected_revenue: revenue,
    notes: input.notes.trim() || null,
    follow_up_needed: input.followUpNeeded,
    related_opportunity_id: input.relatedOpportunityId.trim() || null,
    status: input.status,
  };

  if (input.caseType === "product_support") {
    body.case_support_coverage = input.supportRepRole.trim() || null;
    body.case_product_needs = input.supportRequiredMaterials.trim() || null;
  }

  if (input.caseType === "observation") {
    const createdAtIso = new Date().toISOString();
    body.observation_goal = input.observationObjectives.observation_goal.trim() || null;
    body.observation_key_questions =
      input.observationObjectives.observation_key_questions.trim() || null;
    body.observation_signals_to_validate =
      input.observationObjectives.observation_signals_to_validate.trim() || null;
    body.observation_access = {
      scheduling_owner: input.observationAccess.scheduling_owner.trim() || null,
      access_pathway: input.observationAccess.access_pathway.trim() || null,
      credentialing_requirement: input.observationAccess.credentialing_requirement,
      vendor_restrictions: input.observationAccess.vendor_restrictions.trim() || null,
      preferred_timing: input.observationAccess.preferred_timing.trim() || null,
    };
    body.observation_validation_targets = buildObservationValidationTargets({
      objectives: input.observationObjectives,
      procedureType: input.procedureType,
      hints: input.observationValidationTargetHints ?? [],
      createdAtIso,
    });
  }

  if (input.needsProducts && extrasPayload.length > 0) {
    body.line_items = [
      { product_id: input.productId, sku_id: input.skuId, expected_quantity: qty },
      ...extrasPayload,
    ];
    body.sku_id = input.skuId;
    body.expected_quantity = qty;
  } else if (input.needsProducts) {
    body.sku_id = input.skuId;
    body.expected_quantity = qty;
  }

  return body;
}

/** Rep-facing strings that must not use legacy “opportunity” wording on the new case page. */
export const NEW_CASE_VISIBLE_COPY_STRINGS = [
  "Related opportunity (optional)",
  "No related opportunity",
  "Related opportunity",
  "Save observation case",
  "Save product support case",
  "Save completed case",
  "Save completed observation",
  "Product interest (optional)",
  "Add product interest",
  "Provider Context",
  "Operational readiness",
  "PHI Restricted: Do not enter patient identifiers.",
  "Pathway stage:",
  "Discovery → Observe",
  "Observation planning phase",
  "Experience / Support",
] as const;

const OPPORTUNITY_WORD_RE = /\bopportunit(?:y|ies)\b/i;

export function containsOpportunityWording(text: string): boolean {
  return OPPORTUNITY_WORD_RE.test(text);
}

const SNAKE_CASE_LABEL_RE = /\b[a-z][a-z0-9]*(?:_[a-z0-9]+){2,}\b/;

export function containsRawIntelligenceLabel(text: string): boolean {
  return SNAKE_CASE_LABEL_RE.test(text);
}
