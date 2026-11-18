"use client";



import React from "react";

import {

  INTELLIGENCE_CAPTURE_FLOW_UI,

  intelligenceCaptureMethodDef,

  normalizeIntelligenceCaptureMethodId,

  type IntelligenceCaptureMethodId,

  type LegacyIntelligenceCaptureMethodId,

} from "@/lib/surgical-sales/intelligenceCapture/intelligenceCaptureMethods";

import { intelligenceCaptureCategoryDef } from "@/lib/surgical-sales/intelligenceCaptureCategories";

import type { IntelligenceCaptureCategoryId } from "@/lib/surgical-sales/intelligenceCaptureCategories";

import type { IntelligenceCaptureCategorySlice } from "@/lib/surgical-sales/intelligenceCaptureCategories";

import { IntelligenceCaptureBulkTextPanel } from "./IntelligenceCaptureBulkTextPanel";

import { IntelligenceCaptureCategoryWorkspace } from "./IntelligenceCaptureCategoryWorkspace";

import { StageMappingQuestionCard } from "./StageMappingQuestionCard";

import { SCHEDULING_FACILITY_DRAFT_KEY } from "@/lib/surgical-sales/schedulingOwnershipFields";

import { STAGE_MAPPING_UI } from "@/lib/surgical-sales/stageMappingQuestions";



type ValidationHandlers = React.ComponentProps<typeof IntelligenceCaptureCategoryWorkspace>["validationHandlers"];



function IntelligenceCaptureGuidedEntryPanel({

  categoryId,

  slice,

  onBack,

  validationHandlers,

}: {

  categoryId: IntelligenceCaptureCategoryId;

  slice: IntelligenceCaptureCategorySlice;

  onBack: () => void;

  validationHandlers: ValidationHandlers;

}) {

  const category = intelligenceCaptureCategoryDef(categoryId);

  const method = intelligenceCaptureMethodDef("guided_entry");

  const questions = React.useMemo(() => {

    return [...slice.open, ...slice.laterStage, ...slice.confirmed];

  }, [slice]);



  return (

    <div className="intel-capture-guided-panel">

      <header className="intel-capture-guided-head">

        <button type="button" className="intel-capture-category-back" onClick={onBack}>

          ← {INTELLIGENCE_CAPTURE_FLOW_UI.backToMethods}

        </button>

        <h3 className="intel-capture-guided-title">

          {category.name} · {method.name}

        </h3>

        <p className="intel-capture-guided-desc">{method.description}</p>

      </header>



      {questions.length === 0 ? (

        <p className="intel-capture-guided-empty">{STAGE_MAPPING_UI.sessionCompleteNote}</p>

      ) : (

        <div className="stage-mapping-questions intel-capture-guided-questions">

          {questions.map((question) => (

            <StageMappingQuestionCard

              key={question.signalId}

              question={question}

              contact={validationHandlers.contact}

              active={validationHandlers.activeSignalId === question.signalId}

              busy={validationHandlers.busySignalId === question.signalId}

              selectedChoice={validationHandlers.selectedChoiceBySignal[question.signalId] ?? null}

              metadata={validationHandlers.metadataBySignal[question.signalId] ?? {}}

              notes={validationHandlers.notesBySignal[question.signalId] ?? ""}

              contactDraft={validationHandlers.contactDraftBySignal[question.signalId] ?? null}

              facilityContactDraft={

                question.signalId === "scheduling_owner"

                  ? validationHandlers.facilityContactDraftBySignal[SCHEDULING_FACILITY_DRAFT_KEY] ?? null

                  : null

              }

              contactPool={validationHandlers.pool}

              organizationId={validationHandlers.organizationId}

              organizationName={validationHandlers.organizationName}

              providerId={validationHandlers.providerId}

              lastImpactLine={validationHandlers.impactBySignal[question.signalId] ?? null}

              submitError={validationHandlers.submitErrorBySignal[question.signalId] ?? null}

              onChoiceSelect={(choice) => validationHandlers.onChoiceSelect(question, choice)}

              onChoiceDeselect={() => validationHandlers.onChoiceDeselect(question)}

              onMetadataChange={(key, value) =>

                validationHandlers.onMetadataChange(question.signalId, key, value)

              }

              onNotesChange={(value) => validationHandlers.onNotesChange(question.signalId, value)}

              onContactDraftChange={(draft) =>

                validationHandlers.onContactDraftChange(question.signalId, draft)

              }

              onFacilityContactDraftChange={(draft) =>

                validationHandlers.onFacilityContactDraftChange(SCHEDULING_FACILITY_DRAFT_KEY, draft)

              }

              onSubmitContact={() => validationHandlers.onSubmitContact(question)}

              onSubmitChoice={(choice, overrides) =>

                validationHandlers.onSubmitChoice(question, choice, overrides)

              }

              contactOptIn={

                question.signalId in validationHandlers.contactOptInBySignal

                  ? validationHandlers.contactOptInBySignal[question.signalId]!

                  : null

              }

              onContactIntent={(intent) => validationHandlers.onContactIntent(question, intent)}

              onOpenCredentialingWorkflow={

                question.signalId === "facility_vendor_pathway"

                  ? validationHandlers.onOpenCredentialingWorkflow

                  : undefined

              }

              forceExpandTick={

                validationHandlers.forceExpandSignalId === question.signalId

                  ? validationHandlers.forceExpandNonce

                  : 0

              }

              evidenceConfidence={

                validationHandlers.evidenceConfidenceBySignal[question.signalId] ?? null

              }

              onEvidenceConfidenceChange={(confidence) =>

                validationHandlers.onEvidenceConfidenceChange(question.signalId, confidence)

              }

              evidenceText={validationHandlers.evidenceBySignal[question.signalId] ?? ""}

              onEvidenceTextChange={(value) =>

                validationHandlers.onEvidenceTextChange(question.signalId, value)

              }

              highlighted={validationHandlers.highlightSignalId === question.signalId}

              dismissedSuggestedContactLead={Boolean(

                validationHandlers.dismissedSuggestedContactLeads[question.signalId],

              )}

              contactSearchPrefill={

                validationHandlers.contactSearchPrefillBySignal[question.signalId] ?? null

              }

              onSuggestedContactLead={(action, lead) =>

                validationHandlers.onSuggestedContactLead(question, action, lead)

              }

            />

          ))}

        </div>

      )}

    </div>

  );

}



export function IntelligenceCaptureMethodView({

  categoryId,

  methodId,

  slice,

  contact,

  providerId,

  onBack,

  onFindingSaved,

  validationHandlers,

  reviewMode = false,

}: {

  categoryId: IntelligenceCaptureCategoryId;

  methodId: IntelligenceCaptureMethodId | LegacyIntelligenceCaptureMethodId | null;

  slice: IntelligenceCaptureCategorySlice;

  contact: Record<string, unknown>;

  providerId: string;

  onBack: () => void;

  onFindingSaved: (provider: Record<string, unknown>) => void | Promise<void>;

  validationHandlers: ValidationHandlers;

  reviewMode?: boolean;

}) {

  if (reviewMode) {

    return (

      <IntelligenceCaptureCategoryWorkspace

        categoryId={categoryId}

        slice={slice}

        contact={contact}

        providerId={providerId}

        onBack={onBack}

        onFindingSaved={onFindingSaved}

        validationHandlers={validationHandlers}

      />

    );

  }



  const normalizedMethodId = normalizeIntelligenceCaptureMethodId(methodId);

  if (!normalizedMethodId) return null;



  if (normalizedMethodId === "guided_entry") {

    return (

      <IntelligenceCaptureGuidedEntryPanel

        categoryId={categoryId}

        slice={slice}

        onBack={onBack}

        validationHandlers={validationHandlers}

      />

    );

  }



  return (

    <IntelligenceCaptureBulkTextPanel

      categoryId={categoryId}

      providerId={providerId}

      onBack={onBack}

      onFindingSaved={onFindingSaved}

    />

  );

}


