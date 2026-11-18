import {
  observationObjectivesHasContent,
  type ObservationObjectivesDraft,
} from "@/lib/surgical-sales/observationObjectives";
import {
  calculateCaseReadiness,
  type CaseReadinessResult,
} from "@/lib/surgical-sales/calculateCaseReadiness";
import { isCaseDateInThePast, localCalendarYmd } from "@/lib/surgical-sales/casePerformedStatus";
import { type NewCaseExtraLine, type NewCaseSaveBlocker } from "@/lib/surgical-sales/newSurgicalCasePageLogic";

export type ReadinessTone = "ready" | "missing" | "neutral" | "caution" | "unknown" | "critical";

export type ReadinessLine = {
  text: string;
  tone: ReadinessTone;
};

export type ReadinessSectionKey =
  | "primary_state"
  | "ready"
  | "missing_intelligence"
  | "access_risks"
  | "missing_required"
  | "support_risks";

export type OperationalReadinessSection = {
  key: ReadinessSectionKey;
  title: string;
  lines: ReadinessLine[];
};

export type NewCaseOperationalReadinessInput = {
  caseType: "observation" | "product_support";
  surgeonId: string;
  accountId: string;
  relatedOpportunityId: string;
  caseDate: string;
  caseTime: string;
  procedureType: string;
  needsProducts: boolean;
  /** Observation only: user opened optional product focus section. */
  observationProductExpanded: boolean;
  observationObjectives: ObservationObjectivesDraft;
  productId: string;
  skuId: string;
  expectedQty: string;
  expectedRevenue: string;
  extraLines: NewCaseExtraLine[];
  productName: string | null;
  skuLabel: string | null;
  draftCaseId: string | null;
  providerContact: Record<string, unknown> | null;
  observationSchedulingOwner: string;
  observationAccessPathway: string;
  observationCredentialingRequirement:
    | "unknown"
    | "not_required"
    | "required_not_started"
    | "in_progress"
    | "verified";
  supportSetupProcedure: string;
  supportObjective: string;
  supportRepRole: string;
  supportRequiredMaterials: string;
  followUpNeeded: boolean;
  /** YYYY-MM-DD override for tests; defaults to the viewer's local calendar day. */
  todayYmd?: string;
};

export type MissionControlPrimaryState =
  | "draft_ready"
  | "planning_incomplete"
  | "execution_ready"
  | "missing_required";

export type MissionControlProgressStep = {
  key:
    | "mission_setup"
    | "access_readiness"
    | "observation_goals"
    | "support_setup"
    | "product_inventory"
    | "support_plan";
  label: string;
  complete: boolean;
  statusLabel: string;
};

export type MissionControlView = {
  primaryState: MissionControlPrimaryState;
  primaryStateLabel: string;
  nextStep: string;
  nextStepTone: ReadinessTone;
  resolvePhaseIndex: number;
  progress: MissionControlProgressStep[];
  secondary: {
    productInterest: string;
    linkedInitiative: string;
  };
};

export type NewCaseOperationalReadinessView = {
  sections: OperationalReadinessSection[];
  missionControl: MissionControlView;
  nextAction: string;
  nextActionTone: ReadinessTone;
  caseReadiness: CaseReadinessResult;
  saveCta: {
    mode: "scheduled" | "draft" | "completed";
    label: string;
    helperText: string;
    disabled: boolean;
  };
  saveBlockers: NewCaseSaveBlocker[];
};

function blockerLines(blockers: NewCaseSaveBlocker[], tone: ReadinessTone = "missing"): ReadinessLine[] {
  return blockers.map((blocker) => ({
    text: blocker.message,
    tone,
  }));
}

function mapAccessRiskTone(text: string): ReadinessTone {
  if (text === "Credentialing verified" || text.startsWith("Product interest:")) return "ready";
  if (
    text === "Product interest optional" ||
    text === "Support objective not documented" ||
    text === "No related opportunity" ||
    text.includes("optional reference")
  ) {
    return "neutral";
  }
  if (text === "Case saved as draft") return "caution";
  return "neutral";
}

function buildNextActionTone(readiness: CaseReadinessResult): ReadinessTone {
  if (!readiness.canSaveFinal) return "critical";
  if (readiness.readinessLevel === "execution_ready") return "ready";
  if (readiness.readinessLevel === "planning_incomplete") return "caution";
  return "critical";
}

function buildSections(input: NewCaseOperationalReadinessInput, readiness: CaseReadinessResult): OperationalReadinessSection[] {
  const sections: OperationalReadinessSection[] = [];
  const nonPhiBlockers = readiness.saveBlockers.filter((b) => b.id !== "notes_phi");

  if (input.caseType === "observation") {
    sections.push({
      key: "primary_state",
      title: "Operational posture",
      lines: [
        readiness.readinessLevel === "execution_ready"
          ? { text: "Field picture supports observation execution.", tone: "ready" }
          : readiness.readinessLevel === "missing_required"
            ? { text: "Required baseline details missing", tone: "critical" }
            : { text: "Baseline captured — field plan still evolving", tone: "ready" },
      ],
    });
    sections.push({
      key: "ready",
      title: "Ready",
      lines: readiness.readyItems.map((text) => ({ text, tone: "ready" })),
    });
    sections.push({
      key: "missing_intelligence",
      title: "Field planning",
      lines: readiness.missingIntelligence.map((text) => ({ text, tone: "caution" })),
    });
    sections.push({
      key: "access_risks",
      title: "Access reference (optional)",
      lines: readiness.accessRisks.map((text) => ({ text, tone: mapAccessRiskTone(text) })),
    });
    if (nonPhiBlockers.length > 0) {
      sections.unshift({
        key: "missing_required",
        title: "Before save",
        lines: blockerLines(nonPhiBlockers, "critical"),
      });
    }
  } else {
    sections.push({
      key: "ready",
      title: "Ready",
      lines: readiness.readyItems.map((text) => ({ text, tone: "ready" })),
    });
    sections.push({
      key: "missing_required",
      title: "Before save",
      lines: blockerLines(nonPhiBlockers, "critical"),
    });
    sections.push({
      key: "support_risks",
      title: "Support risks",
      lines: readiness.accessRisks.map((text) => ({ text, tone: mapAccessRiskTone(text) })),
    });
    if (readiness.missingIntelligence.length > 0) {
      sections.push({
        key: "missing_intelligence",
        title: "Support planning",
        lines: readiness.missingIntelligence.map((text) => ({ text, tone: "caution" })),
      });
    }
  }

  return sections.filter((section) => section.lines.length > 0);
}

function primaryStateLabel(level: CaseReadinessResult["readinessLevel"]): string {
  switch (level) {
    case "execution_ready":
      return "Field execution ready";
    case "planning_incomplete":
      return "Operational picture developing";
    case "draft_ready":
      return "Baseline captured";
    default:
      return "Required details missing";
  }
}

function observationProgressStatusLabel(
  key: MissionControlProgressStep["key"],
  complete: boolean,
  partial: boolean,
): string {
  if (complete) return "Settled";
  if (partial) {
    return key === "access_readiness" ? "Partial" : "In progress";
  }
  return "Still developing";
}

function supportProgressStatusLabel(complete: boolean, partial: boolean): string {
  if (complete) return "Settled";
  if (partial) return "In progress";
  return "Still developing";
}

function buildMissionControl(
  input: NewCaseOperationalReadinessInput,
  readiness: CaseReadinessResult,
): MissionControlView {
  const hasProvider = Boolean(input.surgeonId.trim());
  const hasFacility = Boolean(input.accountId.trim());
  const hasDate = Boolean(input.caseDate.trim());
  const hasProcedure = Boolean(input.procedureType.trim());
  const missionSetupComplete = hasProvider && hasFacility && hasDate && hasProcedure;

  const schedulingKnown = Boolean(input.observationSchedulingOwner.trim()) || readiness.missingIntelligence.every(
    (line) => line !== "Scheduling owner unknown",
  );
  const accessKnown =
    Boolean(input.observationAccessPathway.trim() && input.observationAccessPathway.trim().toLowerCase() !== "unknown") ||
    readiness.missingIntelligence.every((line) => line !== "Observation access path unknown");
  const credentialingReady = readiness.accessRisks.some((line) => line === "Credentialing verified");
  const accessReadinessComplete =
    input.caseType === "observation" &&
    missionSetupComplete &&
    schedulingKnown &&
    accessKnown &&
    credentialingReady;
  const observationGoalsComplete =
    input.caseType === "observation" && observationObjectivesHasContent(input.observationObjectives);
  const setupPartial = Boolean(
    input.surgeonId.trim() || input.accountId.trim() || input.procedureType.trim() || input.caseDate.trim(),
  );
  const accessPartial = Boolean(
    input.observationSchedulingOwner.trim() ||
      (input.observationAccessPathway.trim() &&
        input.observationAccessPathway.trim().toLowerCase() !== "unknown") ||
      input.observationCredentialingRequirement !== "unknown",
  );
  const goalsPartial = observationObjectivesHasContent(input.observationObjectives);

  const progress: MissionControlProgressStep[] =
    input.caseType === "observation"
      ? [
          {
            key: "mission_setup",
            label: "Mission setup",
            complete: missionSetupComplete,
            statusLabel: observationProgressStatusLabel("mission_setup", missionSetupComplete, setupPartial),
          },
          {
            key: "access_readiness",
            label: "Access reference (optional)",
            complete: accessReadinessComplete,
            statusLabel: accessReadinessComplete
              ? "On file"
              : accessPartial
                ? "Partial"
                : "Optional",
          },
          {
            key: "observation_goals",
            label: "Observation goals",
            complete: observationGoalsComplete,
            statusLabel: observationProgressStatusLabel("observation_goals", observationGoalsComplete, goalsPartial),
          },
        ]
      : (() => {
          const setupProcedure = input.supportSetupProcedure.trim() || input.procedureType.trim();
          const supportSetupReady = hasFacility && hasDate && Boolean(setupProcedure);
          const setupPartialSupport = Boolean(input.accountId.trim() || input.caseDate.trim() || setupProcedure);
          const qty = Number(input.expectedQty);
          const productInventoryReady =
            Boolean(input.productId.trim() && input.skuId.trim()) && Number.isFinite(qty) && qty > 0;
          const productPartial = Boolean(input.productId.trim() || input.skuId.trim() || input.expectedQty.trim());
          const supportPlanReady = Boolean(
            input.supportObjective.trim() &&
              input.supportRepRole.trim() &&
              input.supportRequiredMaterials.trim(),
          );
          const supportPlanPartial = Boolean(
            input.supportObjective.trim() || input.supportRepRole.trim() || input.supportRequiredMaterials.trim(),
          );
          return [
            {
              key: "support_setup",
              label: "Support setup",
              complete: supportSetupReady,
              statusLabel: supportProgressStatusLabel(supportSetupReady, setupPartialSupport),
            },
            {
              key: "product_inventory",
              label: "Product & inventory",
              complete: productInventoryReady,
              statusLabel: supportProgressStatusLabel(productInventoryReady, productPartial),
            },
            {
              key: "support_plan",
              label: "Case support plan",
              complete: supportPlanReady,
              statusLabel: supportProgressStatusLabel(supportPlanReady, supportPlanPartial),
            },
          ] as MissionControlProgressStep[];
        })();

  let resolvePhaseIndex = 0;
  if (input.caseType === "observation") {
    if (!missionSetupComplete) resolvePhaseIndex = 0;
    else if (!observationObjectivesHasContent(input.observationObjectives)) resolvePhaseIndex = 2;
    else resolvePhaseIndex = 2;
  } else {
    const setupProcedure = input.supportSetupProcedure.trim() || input.procedureType.trim();
    const supportSetupReady = hasFacility && hasDate && Boolean(setupProcedure);
    const qty = Number(input.expectedQty);
    const productInventoryReady =
      Boolean(input.productId.trim() && input.skuId.trim()) && Number.isFinite(qty) && qty > 0;
    const supportPlanReady = Boolean(
      input.supportObjective.trim() && input.supportRepRole.trim() && input.supportRequiredMaterials.trim(),
    );
    if (!supportSetupReady) resolvePhaseIndex = 0;
    else if (!productInventoryReady) resolvePhaseIndex = 1;
    else if (!supportPlanReady) resolvePhaseIndex = 2;
    else resolvePhaseIndex = 2;
  }

  const productInterest =
    input.productId.trim() && input.skuId.trim() && input.productName
      ? input.caseType === "observation"
        ? `Interest: ${input.productName}`
        : `SKU line: ${input.productName}`
      : input.caseType === "observation"
        ? "Product interest optional"
        : "Product line required";
  const linkedInitiative = input.relatedOpportunityId.trim()
    ? "Opportunity linked"
    : "No related opportunity";

  return {
    primaryState: readiness.readinessLevel,
    primaryStateLabel: primaryStateLabel(readiness.readinessLevel),
    nextStep: readiness.nextAction,
    nextStepTone: buildNextActionTone(readiness),
    resolvePhaseIndex,
    progress,
    secondary: {
      productInterest,
      linkedInitiative,
    },
  };
}

function completedSaveCta(caseType: NewCaseOperationalReadinessInput["caseType"]): NewCaseOperationalReadinessView["saveCta"] {
  return {
    mode: "completed",
    label: caseType === "observation" ? "Save completed observation" : "Save completed case",
    helperText: "This date is in the past — the case will be saved as completed.",
    disabled: false,
  };
}

function buildSaveCta(input: NewCaseOperationalReadinessInput, readiness: CaseReadinessResult): NewCaseOperationalReadinessView["saveCta"] {
  const firstMissingRequired = readiness.missingRequired[0] ?? "";
  const todayYmd = input.todayYmd ?? localCalendarYmd();
  const alreadyPerformed = isCaseDateInThePast(input.caseDate, todayYmd);

  if (input.caseType === "observation") {
    if (readiness.readinessLevel === "missing_required") {
      return {
        mode: "scheduled",
        label: "Save observation case",
        helperText: firstMissingRequired || "Add required baseline details before saving.",
        disabled: true,
      };
    }
    if (readiness.readinessLevel === "planning_incomplete" || readiness.readinessLevel === "draft_ready") {
      return {
        mode: "draft",
        label: "Save draft observation case",
        helperText: alreadyPerformed
          ? "This date is in the past. Save a draft now, or finish required details to log it as completed."
          : "Field planning can continue after save.",
        disabled: false,
      };
    }
    if (alreadyPerformed && readiness.canSaveFinal) {
      return completedSaveCta("observation");
    }
    return {
      mode: "scheduled",
      label: "Save observation case",
      helperText: "Field picture supports observation execution.",
      disabled: false,
    };
  }

  const missingProductOrSku = readiness.saveBlockers.some((b) => b.id === "product" || b.id === "sku");
  if (missingProductOrSku) {
    return {
      mode: "scheduled",
      label: "Save product support case",
      helperText: "Product/SKU required for support case.",
      disabled: true,
    };
  }
  if (alreadyPerformed && readiness.canSaveFinal) {
    return completedSaveCta("product_support");
  }
  return {
    mode: "scheduled",
    label: "Save product support case",
    helperText: firstMissingRequired || "Ready to save product support case.",
    disabled: !readiness.canSaveFinal,
  };
}

export function buildNewCaseOperationalReadiness(
  input: NewCaseOperationalReadinessInput,
): NewCaseOperationalReadinessView {
  const caseReadiness = calculateCaseReadiness(
    {
      caseType: input.caseType,
      surgeonId: input.surgeonId,
      accountId: input.accountId,
      caseDate: input.caseDate,
      caseTime: input.caseTime,
      procedureType: input.procedureType,
      relatedOpportunityId: input.relatedOpportunityId,
      needsProducts: input.needsProducts,
      observationProductExpanded: input.observationProductExpanded,
      observationObjectives: input.observationObjectives,
      observationSchedulingOwner: input.observationSchedulingOwner,
      observationAccessPathway: input.observationAccessPathway,
      observationCredentialingRequirement: input.observationCredentialingRequirement,
      productId: input.productId,
      skuId: input.skuId,
      expectedQty: input.expectedQty,
      expectedRevenue: input.expectedRevenue,
      extraLines: input.extraLines,
      productName: input.productName,
      skuLabel: input.skuLabel,
      draftCaseId: input.draftCaseId,
      supportSetupProcedure: input.supportSetupProcedure,
      supportObjective: input.supportObjective,
      supportRepRole: input.supportRepRole,
      supportRequiredMaterials: input.supportRequiredMaterials,
      followUpNeeded: input.followUpNeeded,
    },
    {
      providerContact: input.providerContact,
    },
  );
  const sections = buildSections(input, caseReadiness);
  const saveCta = buildSaveCta(input, caseReadiness);

  return {
    sections,
    missionControl: buildMissionControl(input, caseReadiness),
    nextAction: caseReadiness.nextAction,
    nextActionTone: buildNextActionTone(caseReadiness),
    caseReadiness,
    saveCta,
    saveBlockers: caseReadiness.saveBlockers,
  };
}

/** @deprecated Grouped view uses `sections` — kept for tests migrating from flat rows. */
export type OperationalReadinessRow = {
  label: string;
  value: string;
  tone: ReadinessTone;
};
