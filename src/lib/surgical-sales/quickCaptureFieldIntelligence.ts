import type { AiNoteCaptureContext } from "@/lib/surgical-sales/aiNoteCapture/types";
import { buildInitialProposedContacts } from "@/lib/surgical-sales/buildDebriefIntelligenceExtractionReview";
import {
  buildParseResultFromDebriefFacts,
  runOpenAiDebriefFactExtraction,
} from "@/lib/surgical-sales/debriefIntelligencePipeline";
import { applyLogUpdateToProvider } from "@/lib/surgical-sales/logUpdateApplyProvider";
import type { LogUpdateParseResult } from "@/lib/surgical-sales/logUpdateParseFreeform";
import { buildKeywordFallbackParseResult } from "@/lib/surgical-sales/logUpdateOpenAiMapping";
import { loadLogUpdateMappingContext } from "@/lib/surgical-sales/loadLogUpdateMappingContext";
import type { IntelligenceCaptureContext } from "@/lib/surgical-sales/providerIntelligenceFieldMetadata";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  buildLogUpdateParseWithUniversalFacts,
  captureUniversalFactsForLogUpdateReview,
  legacyExtractionFromDipFacts,
  resolveUniversalDeclaredSourceForLogUpdate,
} from "@/lib/surgical-sales/universalExtractor/buildLogUpdateParseWithUniversalFacts";
import { buildFieldEvidenceFromLogUpdate } from "@/lib/surgical-sales/engagements/debriefIntelligenceSnapshot";
import { logUpdateAcceptedFieldPatches } from "@/lib/surgical-sales/logUpdateProviderRouting";
import { persistProviderCandidateContacts } from "@/lib/surgical-sales/candidateContactIntelligence";

export type QuickCaptureFieldIntelligenceResult =
  | {
      ok: true;
      suggestionCount: number;
      suggestionLabels: string[];
      captureId: string;
      mappingWarning: string | null;
    }
  | { ok: false; message: string };

function captureContextFromLaunch(
  launchSurface: string | null | undefined,
  engagementId: string | null,
): IntelligenceCaptureContext {
  if (engagementId) {
    return {
      source_type: "engagement",
      source_engagement_id: engagementId,
      source_label: "Field note",
      declared_source_type: "field_note",
    };
  }
  if (launchSurface === "mission_board") {
    return {
      source_type: "ai_capture",
      source_label: "Mission Board field note",
      declared_source_type: "field_note",
    };
  }
  return {
    source_type: "ai_capture",
    source_label: "Quick capture field note",
    declared_source_type: "field_note",
  };
}

async function resolveQuickCaptureEngagementType(input: {
  engagementId?: string | null;
  context?: AiNoteCaptureContext;
}): Promise<string | null> {
  if (input.context?.engagementType) {
    return String(input.context.engagementType).trim() || null;
  }

  const engagementId = String(input.engagementId ?? input.context?.engagementId ?? "").trim();
  if (!engagementId) return null;

  const { data } = await supabaseAdmin
    .from("surgical_sales_engagements")
    .select("engagement_type")
    .eq("id", engagementId)
    .maybeSingle();

  return String(data?.engagement_type ?? "").trim() || null;
}

export async function quickCaptureFieldIntelligence(input: {
  providerId: string;
  userId: string;
  actorName: string;
  rawNote: string;
  organizationId?: string | null;
  engagementId?: string | null;
  productFocus?: string | null;
  launchSurface?: string | null;
  context?: AiNoteCaptureContext;
}): Promise<QuickCaptureFieldIntelligenceResult> {
  const rawNote = input.rawNote.trim();
  if (!rawNote) return { ok: false, message: "Add what you learned before continuing." };

  const captureContext = captureContextFromLaunch(input.launchSurface, input.engagementId ?? null);

  const noteSave = await applyLogUpdateToProvider({
    providerId: input.providerId,
    actorUserId: input.userId,
    actorName: input.actorName,
    sourceText: rawNote,
    saveAsNote: true,
    fieldPatches: [],
    captureContext,
  });
  if (!noteSave.ok) return { ok: false, message: noteSave.message };

  const engagementType = await resolveQuickCaptureEngagementType({
    engagementId: input.engagementId ?? null,
    context: input.context,
  });
  const universalDeclaredSource = resolveUniversalDeclaredSourceForLogUpdate({
    engagementType,
    engagementTypeLabel: input.context?.engagementTypeLabel ?? null,
  });

  const mappingContext = await loadLogUpdateMappingContext({
    actorUserId: input.userId,
    rawNote,
    providerId: input.providerId,
    organizationId: input.organizationId ?? null,
    engagementId: input.engagementId ?? null,
    productFocus: input.productFocus ?? null,
  });
  if (!mappingContext) {
    try {
      await captureUniversalFactsForLogUpdateReview({
        rawNote,
        userId: input.userId,
        providerId: input.providerId,
        organizationId: input.organizationId ?? null,
        engagementId: input.engagementId ?? null,
        productFocus: input.productFocus ?? null,
        providerLabel: input.context?.providerLabel ?? null,
        universalDeclaredSource,
      });
    } catch (err) {
      console.error("[quickCaptureFieldIntelligence] universal fact capture failed:", err);
    }
    return {
      ok: true,
      suggestionCount: 0,
      suggestionLabels: [],
      captureId: "",
      mappingWarning: "AI mapping unavailable — field note saved.",
    };
  }

  const captureContextAi: AiNoteCaptureContext | undefined = input.context ?? {
    providerId: input.providerId,
    organizationId: input.organizationId ?? undefined,
    engagementId: input.engagementId ?? undefined,
    productFocus: input.productFocus ?? undefined,
    launchSurface: input.launchSurface as AiNoteCaptureContext["launchSurface"],
  };

  let dipLogUpdate: LogUpdateParseResult;
  let mappingWarning: string | null = null;
  let legacyExtraction: unknown;
  try {
    const factExtraction = await runOpenAiDebriefFactExtraction(mappingContext);
    legacyExtraction = legacyExtractionFromDipFacts(factExtraction.facts);
    dipLogUpdate = buildParseResultFromDebriefFacts({
      sourceText: rawNote,
      facts: factExtraction.facts,
      context: captureContextAi,
      existingFields: mappingContext.existingKnownFields,
      mappingSource: "openai",
    });
  } catch (err) {
    mappingWarning = err instanceof Error ? err.message : "AI mapping failed";
    dipLogUpdate = buildKeywordFallbackParseResult(
      rawNote,
      captureContextAi,
      mappingContext.existingKnownFields,
    );
  }

  const { parse, debriefRuns } = await buildLogUpdateParseWithUniversalFacts({
    rawNote,
    userId: input.userId,
    providerId: input.providerId,
    dipLogUpdate,
    existingFields: mappingContext.existingKnownFields,
    organizationId: input.organizationId ?? null,
    engagementId: input.engagementId ?? null,
    productFocus: input.productFocus ?? null,
    engagementType,
    engagementTypeLabel: input.context?.engagementTypeLabel ?? null,
    providerLabel: mappingContext.providerName ?? input.context?.providerLabel ?? null,
    legacyExtraction,
  });

  const sourceRef = input.engagementId
    ? `engagement:${input.engagementId}`
    : `provider:${input.providerId}`;
  const proposedContacts = buildInitialProposedContacts({
    review: parse,
    discoveryContext: mappingContext.discoveryContext ?? null,
    sourceReference: sourceRef,
  });
  if (proposedContacts.length > 0) {
    await persistProviderCandidateContacts({
      providerId: input.providerId,
      contacts: proposedContacts,
      sourceEngagementId: input.engagementId ?? null,
    }).catch((err) => {
      console.error("[quickCaptureFieldIntelligence] candidate contact persistence failed:", err);
    });
  }

  const autoApplyReview: LogUpdateParseResult = {
    ...parse,
    saveAsNoteAccepted: false,
    fieldUpdates: parse.fieldUpdates.map((update) => ({
      ...update,
      accepted: update.conflict && !update.conflict.resolution ? false : Boolean(update.proposedValue.trim()),
    })),
  };
  const fieldPatches = logUpdateAcceptedFieldPatches(autoApplyReview.fieldUpdates);
  if (fieldPatches.length > 0) {
    const intelligenceSave = await applyLogUpdateToProvider({
      providerId: input.providerId,
      actorUserId: input.userId,
      actorName: input.actorName,
      sourceText: rawNote,
      saveAsNote: false,
      fieldPatches,
      captureContext,
      fieldEvidence: buildFieldEvidenceFromLogUpdate(autoApplyReview),
      atomicFacts: (parse as { atomicFacts?: never }).atomicFacts,
    });
    if (!intelligenceSave.ok) {
      return { ok: false, message: intelligenceSave.message };
    }
  }

  return {
    ok: true,
    suggestionCount: fieldPatches.length + proposedContacts.length,
    suggestionLabels: [
      ...fieldPatches.map((patch) => patch.dbKey),
      ...proposedContacts.map((contact) => contact.displayName),
    ],
    captureId: debriefRuns[0]?.capture_id ?? "",
    mappingWarning,
  };
}
