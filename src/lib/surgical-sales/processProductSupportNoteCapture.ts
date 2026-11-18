import { persistOperationalNoteAiExtraction } from "@/lib/notes/persistOperationalNoteAiExtraction";

import { supabaseAdmin } from "@/lib/supabase/admin";

import {

  buildProductSupportClassificationFieldPatch,

  buildProductSupportOutcomePatches,

} from "@/lib/surgical-sales/buildProductSupportNoteFieldPatches";

import { extractObservationNoteEntities } from "@/lib/surgical-sales/extractObservationNoteEntities";

import {

  extractProductSupportObservation,

  type ProductSupportObservationExtraction,

} from "@/lib/surgical-sales/extractProductSupportObservation";

import { extractProductSupportOutcomesFromNote } from "@/lib/surgical-sales/extractProductSupportOutcomesFromNote";

import { mergeObservationNoteIntoCaseSnapshot } from "@/lib/surgical-sales/mergeObservationCaseIntelligenceSnapshot";

import { buildLiveObservationPatchesFromExtraction } from "@/lib/surgical-sales/observationNoteEntityMapping";

import { isActionableIntelligenceFinding } from "@/lib/surgical-sales/observationFindingQuality";

import {

  buildOpportunityIntelligencePatchesFromObservationExtraction,

  mergeOpportunityIntelligenceContactPatch,

} from "@/lib/surgical-sales/promoteOpportunityIntelligenceFromObservation";

import type { OperationalNoteType } from "@/lib/notes/operationalNote";

import type { ProductSupportOutcomesExtraction } from "@/lib/surgical-sales/extractProductSupportOutcomesFromNote";

import {

  attachUniversalCaptureToNoteEnvelope,

  captureUniversalSurgicalIntelligence,

  mapCaseContextToUniversalSource,

  type UniversalCaptureEnvelope,

} from "@/lib/surgical-sales/universalExtractor";



export type ProductSupportNoteAiExtraction = {

  productSupport: ProductSupportObservationExtraction;

  observation: ReturnType<typeof extractObservationNoteEntities>;

  outcomes: ProductSupportOutcomesExtraction;

};



export type ProductSupportNoteCaptureResult = {

  extraction: ProductSupportNoteAiExtraction;

  liveFieldPatches: Record<string, string>;

  outcomePatches: Record<string, unknown>;

  universalCapture: UniversalCaptureEnvelope | null;

};



function noteTypeForClassification(category: ProductSupportObservationExtraction["primaryClassification"]): OperationalNoteType {

  switch (category) {

    case "provider_feedback":

      return "provider_intelligence";

    case "product_fit_signal":

      return "opportunity_signal";

    case "product_signal":

      return "product_usage";

    case "follow_up":

      return "follow_up";

    case "issue":

      return "risk_issue";

    default:

      return "case_observation";

  }

}

function buildProductSupportCasePatches(

  extraction: ProductSupportObservationExtraction,

  caseRow: Record<string, unknown>,

): Record<string, unknown> {

  const patches: Record<string, unknown> = {};



  if (extraction.primaryClassification === "follow_up") {

    patches.follow_up_needed = true;

    const existingNext = String(caseRow.debrief_suggested_next_action ?? "").trim();

    const followUpFinding = "Follow-up required";

    if (!existingNext && isActionableIntelligenceFinding(followUpFinding)) {

      patches.debrief_suggested_next_action = followUpFinding;

    }

  }



  return patches;

}



function mergeStringFieldPatches(...patchSets: Array<Record<string, string>>): Record<string, string> {

  const merged: Record<string, string> = {};

  for (const patchSet of patchSets) {

    for (const [key, value] of Object.entries(patchSet)) {

      merged[key] = value;

    }

  }

  return merged;

}



export async function processProductSupportNoteCapture(input: {

  caseId: string;

  caseRow: Record<string, unknown>;

  noteId: string;

  noteBody: string;

  legacyCaseActivityId?: string | null;

  captureMode?: "voice" | "quick" | null;

  capturedByUserId?: string | null;

}): Promise<ProductSupportNoteCaptureResult> {

  const productSupport = extractProductSupportObservation(input.noteBody);

  const observation = extractObservationNoteEntities(input.noteBody);

  const outcomes = extractProductSupportOutcomesFromNote(input.noteBody);

  const extraction: ProductSupportNoteAiExtraction = { productSupport, observation, outcomes };



  const snapshot = mergeObservationNoteIntoCaseSnapshot(

    input.caseRow.observation_workflow_intelligence_snapshot,

    observation,

  );

  const observationLivePatches = buildLiveObservationPatchesFromExtraction(observation, input.caseRow);

  const classificationPatch = buildProductSupportClassificationFieldPatch(productSupport, input.caseRow);

  const liveFieldPatches = mergeStringFieldPatches(observationLivePatches, classificationPatch);

  const outcomePatches = buildProductSupportOutcomePatches(outcomes);

  const productSupportPatches = buildProductSupportCasePatches(productSupport, input.caseRow);



  const universalCapture = await captureUniversalSurgicalIntelligence({

    raw_note: input.noteBody,

    declared_source_type: mapCaseContextToUniversalSource({

      case_type: "product_support",

    }),

    context: {

      case_id: input.caseId,

      provider_id: String(input.caseRow.surgeon_contact_id ?? "").trim() || undefined,

      organization_id: String(input.caseRow.account_id ?? "").trim() || undefined,

      encounter_id: String(input.caseRow.engagement_id ?? "").trim() || undefined,

      product_context: String(input.caseRow.procedure_type ?? "").trim() || undefined,

    },

    caseRow: input.caseRow,

    operational_note_id: input.noteId,

    created_by_user_id: input.capturedByUserId ?? null,

    legacy_extraction: extraction,

  });



  const persistedEnvelope = attachUniversalCaptureToNoteEnvelope({ ...extraction }, universalCapture);



  await persistOperationalNoteAiExtraction(input.noteId, persistedEnvelope);



  await supabaseAdmin

    .from("sales_operational_notes")

    .update({

      note_type: noteTypeForClassification(productSupport.primaryClassification),

      tags: [productSupport.classificationLabel],

      source: "ai",

    })

    .eq("id", input.noteId);



  await supabaseAdmin

    .from("surgical_sales_cases")

    .update({

      observation_workflow_intelligence_snapshot: snapshot,

      ...liveFieldPatches,

      ...outcomePatches,

      ...productSupportPatches,

    })

    .eq("id", input.caseId);



  if (input.legacyCaseActivityId) {

    const { data: activityRow } = await supabaseAdmin

      .from("surgical_sales_case_activities")

      .select("metadata_json")

      .eq("id", input.legacyCaseActivityId)

      .maybeSingle();



    const metadata =

      activityRow?.metadata_json && typeof activityRow.metadata_json === "object"

        ? (activityRow.metadata_json as Record<string, unknown>)

        : {};



    await supabaseAdmin

      .from("surgical_sales_case_activities")

      .update({

        metadata_json: {

          ...metadata,

          note_id: input.noteId,

          ai_extraction: extraction,

          intelligence_processing: false,

          observation_classification: productSupport.classificationLabel,

          capture_mode: input.captureMode ?? null,

        },

      })

      .eq("id", input.legacyCaseActivityId);

  }



  const providerId = String(input.caseRow.surgeon_contact_id ?? "").trim();

  if (providerId) {

    const { data: providerRow } = await supabaseAdmin

      .from("surgical_sales_contacts")

      .select("*")

      .eq("id", providerId)

      .maybeSingle();



    if (providerRow) {

      const patches = buildOpportunityIntelligencePatchesFromObservationExtraction(

        observation,

        providerRow as Record<string, unknown>,

      );

      const merged = mergeOpportunityIntelligenceContactPatch(

        providerRow as Record<string, unknown>,

        patches,

      );

      const patchBody = Object.fromEntries(

        patches.map((patch) => [patch.dbKey, merged[patch.dbKey]]),

      );

      if (Object.keys(patchBody).length > 0) {

        await supabaseAdmin.from("surgical_sales_contacts").update(patchBody).eq("id", providerId);

      }

    }

  }



  return {

    extraction,

    liveFieldPatches,

    outcomePatches,

    universalCapture,

  };

}
