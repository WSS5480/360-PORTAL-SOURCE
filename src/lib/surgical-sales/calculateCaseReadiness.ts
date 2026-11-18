import {
  DISCOVERY_FIELD_STATUS,
  resolveFacilityVendorPathwayStatus,
  resolveSchedulingOwnerStatus,
} from "@/lib/surgical-sales/discoveryIntelligenceSignalStatus";
import {
  observationObjectivesHasContent,
  type ObservationObjectivesDraft,
} from "@/lib/surgical-sales/observationObjectives";
import {
  collectNewCaseSaveBlockers,
  type NewCaseExtraLine,
  type NewCaseSaveBlocker,
  type NewCaseType,
} from "@/lib/surgical-sales/newSurgicalCasePageLogic";
import {
  resolveObservationAccessWorkflowState,
  type CredentialingWorkflowStatus,
} from "@/lib/surgical-sales/observationAccessWorkflowState";

export type CaseReadinessLevel =
  | "missing_required"
  | "draft_ready"
  | "planning_incomplete"
  | "execution_ready";

export type CaseDraftReadinessInput = {
  caseType: NewCaseType;
  surgeonId: string;
  accountId: string;
  caseDate: string;
  caseTime: string;
  procedureType: string;
  relatedOpportunityId: string;
  needsProducts: boolean;
  observationProductExpanded: boolean;
  observationObjectives: ObservationObjectivesDraft;
  observationSchedulingOwner: string;
  observationAccessPathway: string;
  observationCredentialingRequirement:
    | "unknown"
    | "not_required"
    | "required_not_started"
    | "in_progress"
    | "verified";
  productId: string;
  skuId: string;
  expectedQty: string;
  expectedRevenue: string;
  extraLines: NewCaseExtraLine[];
  productName: string | null;
  skuLabel: string | null;
  draftCaseId: string | null;
  supportSetupProcedure: string;
  supportObjective: string;
  supportRepRole: string;
  supportRequiredMaterials: string;
  followUpNeeded: boolean;
};

export type CaseProviderIntelligenceInput = {
  providerContact: Record<string, unknown> | null;
};

export type CaseReadinessResult = {
  readinessLevel: CaseReadinessLevel;
  readyItems: string[];
  missingRequired: string[];
  missingIntelligence: string[];
  accessRisks: string[];
  nextAction: string;
  canSaveDraft: boolean;
  canSaveFinal: boolean;
  saveBlockers: NewCaseSaveBlocker[];
};

function isDiscoveryKnown(status: string): boolean {
  return status !== DISCOVERY_FIELD_STATUS.unknown;
}

function schedulingOwnerUnknown(contact: Record<string, unknown> | null): boolean {
  if (!contact) return true;
  return !isDiscoveryKnown(resolveSchedulingOwnerStatus(contact));
}

function schedulingOwnerKnown(input: CaseDraftReadinessInput, providerIntelligence: CaseProviderIntelligenceInput): boolean {
  if (input.observationSchedulingOwner.trim()) return true;
  return !schedulingOwnerUnknown(providerIntelligence.providerContact);
}

function observationAccessPathUnknown(contact: Record<string, unknown> | null): boolean {
  if (!contact) return true;
  const pathway = resolveFacilityVendorPathwayStatus(contact);
  if (!isDiscoveryKnown(pathway)) {
    const workflow = resolveObservationAccessWorkflowState(contact);
    return workflow.observationAccessStatus === "unknown";
  }
  return false;
}

function accessPathKnown(input: CaseDraftReadinessInput, providerIntelligence: CaseProviderIntelligenceInput): boolean {
  const local = input.observationAccessPathway.trim().toLowerCase();
  if (local && local !== "unknown") return true;
  return !observationAccessPathUnknown(providerIntelligence.providerContact);
}

function resolveCredentialingStatus(contact: Record<string, unknown> | null): CredentialingWorkflowStatus {
  return contact
    ? resolveObservationAccessWorkflowState(contact).credentialingStatus
    : "unknown";
}

function resolveObservationCredentialingStatus(
  input: CaseDraftReadinessInput,
  providerIntelligence: CaseProviderIntelligenceInput,
): CredentialingWorkflowStatus {
  switch (input.observationCredentialingRequirement) {
    case "verified":
      return "completed";
    case "not_required":
      return "not_required";
    case "required_not_started":
      return "required";
    case "in_progress":
      return "in_progress";
    default:
      return resolveCredentialingStatus(providerIntelligence.providerContact);
  }
}

function saveValidationInput(input: CaseDraftReadinessInput) {
  return {
    caseType: input.caseType,
    surgeonId: input.surgeonId,
    accountId: input.accountId,
    caseDate: input.caseDate,
    showProductsForObservation: input.observationProductExpanded,
    productId: input.productId,
    skuId: input.skuId,
    expectedQty: input.expectedQty,
    expectedRevenue: input.expectedRevenue,
    needsProducts: input.needsProducts,
    extraLines: input.extraLines,
    notes: "",
    phiAcknowledged: true,
  } as const;
}

function formatCaseDateTime(caseDate: string, caseTime: string): string {
  const date = caseDate.trim();
  const time = caseTime.trim();
  if (!date) return "";
  if (!time) return date;
  return `${date} · ${time}`;
}

function buildObservationReadiness(
  input: CaseDraftReadinessInput,
  providerIntelligence: CaseProviderIntelligenceInput,
  missingRequired: string[],
  saveBlockers: NewCaseSaveBlocker[],
): CaseReadinessResult {
  const hasProvider = Boolean(input.surgeonId.trim());
  const hasFacility = Boolean(input.accountId.trim());
  const hasDate = Boolean(input.caseDate.trim());
  const hasObjectives = observationObjectivesHasContent(input.observationObjectives);
  const hasInitiative = Boolean(input.relatedOpportunityId.trim());
  const draftReady = hasProvider && hasFacility && hasDate;
  const schedulingKnown = schedulingOwnerKnown(input, providerIntelligence);
  const accessKnown = accessPathKnown(input, providerIntelligence);
  const credentialingStatus = resolveObservationCredentialingStatus(input, providerIntelligence);
  const planningIncomplete = draftReady && !hasObjectives;
  const executionReady = draftReady && hasObjectives;

  const readyItems: string[] = [];
  if (hasProvider) readyItems.push("Provider selected");
  if (hasFacility) readyItems.push("Facility selected");
  if (hasDate) {
    const when = formatCaseDateTime(input.caseDate, input.caseTime);
    readyItems.push(when ? `Date selected · ${when}` : "Date selected");
  }
  if (draftReady) readyItems.push("Ready to save draft observation case.");
  if (hasObjectives) readyItems.push("Observation objectives started");
  if (hasInitiative) readyItems.push("Related opportunity on file");

  const missingIntelligence: string[] = [];
  if (draftReady && !hasObjectives) {
    missingIntelligence.push("Observation objectives not captured yet");
  }

  const accessRisks: string[] = [];
  if (draftReady) {
    if (!schedulingKnown) accessRisks.push("Scheduling owner — optional reference");
    if (!accessKnown) accessRisks.push("Access pathway — optional reference");
  }
  if (credentialingStatus === "completed" || credentialingStatus === "not_required") {
    accessRisks.push("Credentialing verified");
  } else if (credentialingStatus === "in_progress" || credentialingStatus === "required") {
    accessRisks.push("Credentialing in progress — optional reference");
  } else if (draftReady) {
    accessRisks.push("Credentialing — optional reference");
  }
  if (input.productId.trim() && input.skuId.trim() && input.productName) {
    const label = input.skuLabel ? `${input.productName} · ${input.skuLabel}` : input.productName;
    accessRisks.push(`Product interest: ${label}`);
  } else {
    accessRisks.push("Product interest optional");
  }
  if (input.draftCaseId) accessRisks.push("Case saved as draft");

  let nextAction = "Save observation case.";
  if (!draftReady) {
    nextAction = missingRequired[0] ?? "Capture baseline case details.";
  } else if (!hasObjectives) {
    nextAction = "Add observation objective.";
  }

  const readinessLevel: CaseReadinessLevel =
    missingRequired.length > 0
      ? "missing_required"
      : executionReady
        ? "execution_ready"
        : planningIncomplete
          ? "planning_incomplete"
          : draftReady
            ? "draft_ready"
            : "missing_required";

  return {
    readinessLevel,
    readyItems,
    missingRequired,
    missingIntelligence,
    accessRisks,
    nextAction,
    canSaveDraft: draftReady,
    canSaveFinal: saveBlockers.filter((b) => b.id !== "notes_phi").length === 0,
    saveBlockers,
  };
}

function buildProductSupportReadiness(
  input: CaseDraftReadinessInput,
  missingRequired: string[],
  saveBlockers: NewCaseSaveBlocker[],
): CaseReadinessResult {
  const hasProvider = Boolean(input.surgeonId.trim());
  const hasFacility = Boolean(input.accountId.trim());
  const hasDate = Boolean(input.caseDate.trim());
  const setupProcedure = (input.supportSetupProcedure ?? "").trim() || input.procedureType.trim();
  const supportObjective = (input.supportObjective ?? "").trim();
  const supportRepRole = (input.supportRepRole ?? "").trim();
  const supportRequiredMaterials = (input.supportRequiredMaterials ?? "").trim();
  const hasProductLine = Boolean(input.productId.trim() && input.skuId.trim());
  const qty = Number(input.expectedQty);
  const hasQuantity = Number.isFinite(qty) && qty > 0;
  const productInventoryReady = hasProductLine && hasQuantity;
  const hasSupportObjective = Boolean(supportObjective);
  const hasRepRole = Boolean(supportRepRole);
  const hasRequiredMaterials = Boolean(supportRequiredMaterials);
  const supportPlanReady = hasSupportObjective && hasRepRole && hasRequiredMaterials;
  const hasInitiative = Boolean(input.relatedOpportunityId.trim());
  const supportSetupReady = hasFacility && hasDate && Boolean(setupProcedure);
  const executionReady =
    missingRequired.length === 0 && supportSetupReady && productInventoryReady && supportPlanReady;

  const readyItems: string[] = [];
  if (hasProvider) readyItems.push("Provider selected");
  if (hasFacility) readyItems.push("Facility selected");
  if (hasDate) {
    const when = formatCaseDateTime(input.caseDate, input.caseTime);
    readyItems.push(when ? `Case date set · ${when}` : "Case date set");
  }
  if (setupProcedure) readyItems.push("Procedure context captured");
  if (productInventoryReady) {
    const label =
      input.productName && input.skuLabel
        ? `${input.productName} · ${input.skuLabel}`
        : input.productName || "Product and SKU selected";
    readyItems.push(label);
  }
  if (supportPlanReady) readyItems.push("Case support plan documented");
  if (hasInitiative) readyItems.push("Related opportunity on file");
  if (executionReady) readyItems.push("Ready to save product support case.");

  const missingIntelligence: string[] = [];
  if (supportSetupReady && !executionReady) {
    if (!productInventoryReady) {
      if (!hasProductLine) missingIntelligence.push("Product and SKU not selected");
      else if (!hasQuantity) missingIntelligence.push("Expected quantity not set");
    }
    if (productInventoryReady && !supportPlanReady) {
      if (!hasSupportObjective) missingIntelligence.push("Support objective not documented");
      if (!hasRepRole) missingIntelligence.push("Rep role not assigned");
      if (!hasRequiredMaterials) missingIntelligence.push("Required materials not listed");
    }
    if (missingIntelligence.length > 0) missingIntelligence.push("Support execution planning incomplete.");
  }

  const accessRisks: string[] = [];
  if (!hasInitiative) accessRisks.push("No related opportunity");
  if (input.followUpNeeded) accessRisks.push("Follow-up flagged");
  if (input.draftCaseId) accessRisks.push("Case saved as draft");

  let nextAction = "Save product support case.";
  if (!hasFacility) {
    nextAction = "Select an organization (facility).";
  } else if (!hasDate) {
    nextAction = "Set a case date.";
  } else if (!setupProcedure) {
    nextAction = "Add procedure or case context.";
  } else if (!input.productId.trim()) {
    nextAction = "Select a product family for this support case.";
  } else if (!input.skuId.trim()) {
    nextAction = "Select a SKU for this support case.";
  } else if (!hasQuantity) {
    nextAction = "Enter a positive expected quantity.";
  } else if (!hasSupportObjective) {
    nextAction = "Document the support objective.";
  } else if (!hasRepRole) {
    nextAction = "Assign rep coverage role.";
  } else if (!hasRequiredMaterials) {
    nextAction = "List required materials.";
  } else if (missingRequired[0]) {
    nextAction = missingRequired[0]!;
  }

  const readinessLevel: CaseReadinessLevel =
    missingRequired.length > 0
      ? "missing_required"
      : executionReady
        ? "execution_ready"
        : supportSetupReady
          ? "planning_incomplete"
          : hasFacility
            ? "draft_ready"
            : "missing_required";

  return {
    readinessLevel,
    readyItems,
    missingRequired,
    missingIntelligence,
    accessRisks,
    nextAction,
    canSaveDraft: hasFacility,
    canSaveFinal: saveBlockers.filter((b) => b.id !== "notes_phi").length === 0,
    saveBlockers,
  };
}

export function calculateCaseReadiness(
  caseDraft: CaseDraftReadinessInput,
  providerIntelligence: CaseProviderIntelligenceInput,
): CaseReadinessResult {
  const saveBlockers = collectNewCaseSaveBlockers(saveValidationInput(caseDraft));
  const missingRequired = saveBlockers.filter((b) => b.id !== "notes_phi").map((b) => b.message);

  if (caseDraft.caseType === "observation") {
    return buildObservationReadiness(caseDraft, providerIntelligence, missingRequired, saveBlockers);
  }
  return buildProductSupportReadiness(caseDraft, missingRequired, saveBlockers);
}
