/**
 * Shared debrief narrative analyze path — used by Prepare debrief analyze and Mission Board post-complete dictation.
 */

import { supabaseAdmin } from "@/lib/supabase/admin";
import { SALES_ORGANIZATIONS_TABLE } from "@/lib/surgical-sales/salesOrganizationTable";
import { contactDisplayName } from "@/lib/surgical-sales/labels";
import {
  buildTacticalDebriefAnalysisFromLogUpdate,
  type TacticalDebriefAnalysis,
} from "@/lib/surgical-sales/engagements/prepareTacticalDebriefAnalyze";
import {
  buildIntelligenceCaptureScopeFromEngagement,
  buildIntelligencePropagationTargets,
  type IntelligenceCaptureScope,
  type IntelligencePropagationTarget,
} from "@/lib/surgical-sales/intelligenceCapture/intelligenceCaptureScope";
import { loadLogUpdateMappingContext } from "@/lib/surgical-sales/loadLogUpdateMappingContext";
import {
  buildParseResultFromDebriefFacts,
  runOpenAiDebriefFactExtraction,
} from "@/lib/surgical-sales/debriefIntelligencePipeline";
import { buildKeywordFallbackParseResult } from "@/lib/surgical-sales/logUpdateOpenAiMapping";
import { buildDebriefCompletionValidationModel } from "@/lib/surgical-sales/engagements/buildDebriefCompletionValidationModel";
import type {
  DebriefCompletionContext,
  DebriefNextStepSnapshot,
  DebriefPatternValidationResult,
  DebriefValidationDebugPayload,
} from "@/lib/surgical-sales/engagements/debriefCompletionValidationTypes";
import { loadDebriefCompletionContext } from "@/lib/surgical-sales/engagements/loadDebriefCompletionContext";
import { applyPostObservationDebriefReviewGuard } from "@/lib/surgical-sales/engagements/postObservationDebriefCompletion";
import { isDebriefValidationEngagementType } from "@/lib/surgical-sales/engagements/isPostObservationProviderDebrief";
import {
  classifyIntroCallConversationResult,
  isIntroCallDebriefFirstEngagementType,
  resolveEngagementOutcomeAuthorityId,
} from "@/lib/surgical-sales/engagements/introCallDebriefFirstCompletion";
import { readStartMissionSnapshot } from "@/lib/surgical-sales/engagements/startMissionSnapshot";
import type { DebriefAtomicFact } from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefAtomicFacts";
import type { LogUpdateParseResult } from "@/lib/surgical-sales/logUpdateParseFreeform";
import { captureUniversalSurgicalIntelligence } from "@/lib/surgical-sales/universalExtractor/runUniversalExtractorShadow";
import { universalCaptureToExtractionRun } from "@/lib/surgical-sales/universalExtractor/universalCaptureToExtractionRun";
import type { UniversalFactExtractionRun } from "@/lib/surgical-sales/universalExtractor/loadUniversalSurgicalFacts";
import {
  buildReviewProjectionFromUniversalFacts,
  stripDipLogUpdateToWorkflowOnly,
} from "@/lib/surgical-sales/universalExtractor/buildReviewProjectionFromUniversalFacts";
import {
  isDipReviewShadowEnabled,
  isUniversalFactsReviewAuthorityEnabled,
} from "@/lib/surgical-sales/universalExtractor/universalExtractorReviewFlag";

export type AnalyzeEngagementDebriefNarrativeInput = {
  engagement: Record<string, unknown>;
  narrative: string;
  actorUserId: string;
};

export type AnalyzeEngagementDebriefNarrativeResult = {
  scope: IntelligenceCaptureScope;
  analysis: TacticalDebriefAnalysis;
  logUpdate: LogUpdateParseResult | null;
  facts: DebriefAtomicFact[];
  mappingSource: "openai" | "keyword_fallback";
  mappingWarning?: string;
  propagationTargets: IntelligencePropagationTarget[];
  providerContactSnapshot: Record<string, unknown> | null;
  discoveryContext: unknown;
  engagementOutcomeId: string | null;
  isPostObservationProviderDebrief: boolean;
  debriefCompletionContext: DebriefCompletionContext | null;
  debriefValidationResults: DebriefPatternValidationResult[];
  debriefNextStep: DebriefNextStepSnapshot | null;
  debriefValidationDebug: DebriefValidationDebugPayload | null;
  universalFactCaptureId: string | null;
};

export async function analyzeEngagementDebriefNarrative(
  input: AnalyzeEngagementDebriefNarrativeInput,
): Promise<AnalyzeEngagementDebriefNarrativeResult | null> {
  const engagement = input.engagement;
  const narrative = input.narrative.trim();
  if (narrative.length < 8) return null;

  const providerIdRaw = String(engagement.provider_id ?? "");
  const orgIdRaw = engagement.organization_id ? String(engagement.organization_id) : null;
  const oppIdRaw = engagement.opportunity_id ? String(engagement.opportunity_id) : null;
  const engagementId = String(engagement.id ?? "");

  const providerId = providerIdRaw || null;
  let organizationId = orgIdRaw;
  let organizationName: string | null = null;
  let productFocus = String(engagement.product_line ?? "").trim() || null;

  const [providerRes, orgRes, oppRes] = await Promise.all([
    providerId
      ? supabaseAdmin.from("surgical_sales_contacts").select("*").eq("id", providerId).maybeSingle()
      : Promise.resolve({ data: null }),
    orgIdRaw
      ? supabaseAdmin.from(SALES_ORGANIZATIONS_TABLE).select("id, name").eq("id", orgIdRaw).maybeSingle()
      : Promise.resolve({ data: null }),
    oppIdRaw
      ? supabaseAdmin.from("sales_opportunities").select("product_line").eq("id", oppIdRaw).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const providerRow = providerRes.data as Record<string, unknown> | null;
  const organization = orgRes.data as { id?: string; name?: string } | null;
  const opportunity = oppRes.data as { product_line?: string | null } | null;

  if (organization?.name) organizationName = organization.name;
  if (!organizationId && organization?.id) organizationId = organization.id;
  if (!productFocus && opportunity?.product_line) {
    productFocus = String(opportunity.product_line).trim() || null;
  }

  const scope = buildIntelligenceCaptureScopeFromEngagement({
    engagementId,
    providerId,
    organizationId,
    providerLabel: providerRow ? contactDisplayName(providerRow) : null,
    organizationLabel: organizationName,
    engagementType: String(engagement.engagement_type ?? ""),
    productLine: productFocus,
    opportunityProductLine: opportunity?.product_line ?? null,
  });

  const mappingContext = await loadLogUpdateMappingContext({
    actorUserId: input.actorUserId,
    rawNote: narrative,
    providerId,
    organizationId,
    engagementId,
    productFocus,
    preloaded: {
      engagement,
      providerRow,
      organizationName,
      productFocus,
    },
    discoveryLoadMode: "lite",
    compactDiscoveryPrompt: true,
  }).catch((e: unknown) => {
    console.error("[analyzeEngagementDebriefNarrative] loadLogUpdateMappingContext failed:", e);
    return null;
  });

  if (!mappingContext) return null;

  const existingFields = mappingContext.existingKnownFields;
  const engagementType = String(engagement.engagement_type ?? "");
  const engagementOutcomeId = isIntroCallDebriefFirstEngagementType(engagementType)
    ? classifyIntroCallConversationResult(narrative).outcomeId
    : resolveEngagementOutcomeAuthorityId({
        engagementType,
        debriefSnapshot: engagement.debrief_intelligence_snapshot,
      }) ??
      readStartMissionSnapshot(engagement.debrief_intelligence_snapshot)?.outcome_id ??
      null;

  let debriefCompletionContext: DebriefCompletionContext | null = null;
  if (isDebriefValidationEngagementType(String(engagement.engagement_type ?? ""))) {
    const loadedCompletion = await loadDebriefCompletionContext({
      engagement,
      engagementId,
      userId: input.actorUserId,
    });
    if (loadedCompletion.ok) {
      debriefCompletionContext = loadedCompletion.context;
    }
  }

  const isPostObservationProviderDebrief =
    debriefCompletionContext?.isPostObservationProviderDebrief ?? false;

  const universalDeclaredSourceType = isIntroCallDebriefFirstEngagementType(engagementType)
    ? "intro_call"
    : isPostObservationProviderDebrief
      ? "debrief_validation"
      : "debrief_note";

  const captureDebriefUniversalFacts = async (
    legacyFacts?: DebriefAtomicFact[],
  ): Promise<UniversalFactExtractionRun[]> => {
    const caseId = engagement.case_id ? String(engagement.case_id).trim() : null;
    const capture = await captureUniversalSurgicalIntelligence({
      raw_note: narrative,
      declared_source_type: universalDeclaredSourceType,
      context: {
        encounter_id: engagementId || undefined,
        provider_id: providerId ?? undefined,
        organization_id: organizationId ?? undefined,
        case_id: caseId ?? undefined,
        product_context: productFocus ?? undefined,
      },
      caseRow: {
        id: caseId,
        surgeon_contact_id: engagement.provider_id,
        account_id: engagement.organization_id,
        engagement_id: engagementId,
        procedure_type: engagement.product_line,
      },
      created_by_user_id: input.actorUserId,
      legacy_extraction:
        legacyFacts && legacyFacts.length > 0 && isDipReviewShadowEnabled()
          ? { facts: legacyFacts }
          : undefined,
    });
    if (!capture) return [];
    return [universalCaptureToExtractionRun({ capture, context: {
      encounter_id: engagementId || undefined,
      provider_id: providerId ?? undefined,
      organization_id: organizationId ?? undefined,
      case_id: caseId ?? undefined,
      product_context: productFocus ?? undefined,
    } })];
  };

  const attachUniversalFactsToLogUpdate = (
    logUpdate: LogUpdateParseResult | null,
    debriefRuns: UniversalFactExtractionRun[],
  ): LogUpdateParseResult | null => {
    if (!logUpdate || debriefRuns.length === 0) return logUpdate;
    return { ...logUpdate, debriefUniversalFactsRuns: debriefRuns };
  };

  const buildResult = (
    logUpdate: LogUpdateParseResult | null,
    facts: DebriefAtomicFact[],
    mappingSource: "openai" | "keyword_fallback",
    mappingWarning?: string,
    debriefUniversalFactsRuns: UniversalFactExtractionRun[] = [],
  ): AnalyzeEngagementDebriefNarrativeResult => {
    const propagationTargets = buildIntelligencePropagationTargets({
      scope,
      logUpdate,
      insights: buildTacticalDebriefAnalysisFromLogUpdate(narrative, logUpdate, {
        providerId,
        existingProviderFields: existingFields,
      }).insights,
      engagementNotesSaved: false,
    });

    let debriefValidationResults: DebriefPatternValidationResult[] = [];
    let debriefNextStep: DebriefNextStepSnapshot | null = null;
    let debriefValidationDebug: DebriefValidationDebugPayload | null = null;
    let guardedLogUpdate = attachUniversalFactsToLogUpdate(logUpdate, debriefUniversalFactsRuns);
    if (isPostObservationProviderDebrief && debriefCompletionContext) {
      const validationModel = buildDebriefCompletionValidationModel({
        completionContext: debriefCompletionContext,
        narrative,
        facts,
      });
      debriefValidationResults = validationModel.patternValidations;
      debriefNextStep = validationModel.nextStep;
      debriefValidationDebug = validationModel.debug;
      if (guardedLogUpdate) {
        guardedLogUpdate = applyPostObservationDebriefReviewGuard({
          logUpdate: guardedLogUpdate,
          narrative,
          validationResults: debriefValidationResults,
        });
      }
    }

    const guardedAnalysis = buildTacticalDebriefAnalysisFromLogUpdate(narrative, guardedLogUpdate, {
      providerId,
      existingProviderFields: existingFields,
    });

    return {
      scope,
      analysis: guardedAnalysis,
      logUpdate: guardedAnalysis.log_update,
      facts,
      mappingSource,
      mappingWarning,
      propagationTargets,
      providerContactSnapshot: providerRow,
      discoveryContext: mappingContext.discoveryContext ?? null,
      engagementOutcomeId,
      isPostObservationProviderDebrief,
      debriefCompletionContext,
      debriefValidationResults,
      debriefNextStep,
      debriefValidationDebug,
      universalFactCaptureId: debriefUniversalFactsRuns[0]?.capture_id ?? null,
    };
  };

  const ufReviewAuthority = isUniversalFactsReviewAuthorityEnabled();

  try {
    const factExtraction = await runOpenAiDebriefFactExtraction(mappingContext);
    const dipLogUpdate = buildParseResultFromDebriefFacts({
      sourceText: narrative,
      facts: factExtraction.facts,
      context: providerId ? { providerId, engagementId } : { engagementId },
      existingFields,
      mappingSource: "openai",
    });

    let logUpdate: LogUpdateParseResult | null = dipLogUpdate;
    let debriefRuns: UniversalFactExtractionRun[];

    if (ufReviewAuthority) {
      debriefRuns = await captureDebriefUniversalFacts(
        isDipReviewShadowEnabled() ? factExtraction.facts : undefined,
      );
      logUpdate = buildReviewProjectionFromUniversalFacts({
        dictation: narrative,
        debriefRuns,
        workflowLogUpdate: stripDipLogUpdateToWorkflowOnly(dipLogUpdate),
        existingFields,
      }).logUpdate;
    } else {
      debriefRuns = await captureDebriefUniversalFacts(factExtraction.facts);
      logUpdate = attachUniversalFactsToLogUpdate(dipLogUpdate, debriefRuns);
    }

    return buildResult(logUpdate, factExtraction.facts, "openai", undefined, debriefRuns);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "AI fact extraction failed";
    const dipLogUpdate = providerId
      ? buildKeywordFallbackParseResult(narrative, { providerId, engagementId }, existingFields)
      : null;

    let debriefRuns: UniversalFactExtractionRun[] = [];
    try {
      debriefRuns = await captureDebriefUniversalFacts(undefined);
    } catch (ufError: unknown) {
      console.error("[analyzeEngagementDebriefNarrative] universal fact capture failed:", ufError);
    }

    let logUpdate: LogUpdateParseResult | null = dipLogUpdate;
    if (ufReviewAuthority && dipLogUpdate && debriefRuns.length > 0) {
      logUpdate = buildReviewProjectionFromUniversalFacts({
        dictation: narrative,
        debriefRuns,
        workflowLogUpdate: stripDipLogUpdateToWorkflowOnly(dipLogUpdate),
        existingFields,
      }).logUpdate;
    } else if (dipLogUpdate) {
      logUpdate = attachUniversalFactsToLogUpdate(dipLogUpdate, debriefRuns);
    }

    return buildResult(logUpdate, [], "keyword_fallback", message, debriefRuns);
  }
}
