"use client";



import React from "react";

import { useRouter } from "next/navigation";



import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import type { ProviderDebriefNarrativeContext } from "@/lib/surgical-sales/engagements/loadLatestProviderDebriefNarrative";

import type { ProviderPlanningCompletion } from "@/lib/surgical-sales/providerPlanningCompletion";

import type { ProviderClinicalDiscoveryAnswer } from "@/lib/surgical-sales/providerClinicalDiscoveryAnswers";

import { INTELLIGENCE_CAPTURE_DASHBOARD_UI } from "@/lib/surgical-sales/intelligenceCaptureCategories";

import { contactDisplayName } from "@/lib/surgical-sales/labels";

import type { ProviderOverviewFocusedModal } from "@/lib/surgical-sales/providerOverviewFocusedActionRouting";

import type { ProviderPathwayExecutionAction } from "@/lib/surgical-sales/providerPathwayExecutionRouting";

import type { OrganizationIntelligenceBaseline } from "@/lib/surgical-sales/loadOrganizationIntelligenceBaseline";
import type { UniversalFactsReadModelPayload } from "@/lib/surgical-sales/universalExtractor/universalFactsReadModelAdapters";
import type { ProviderAiSalesBriefing } from "@/lib/surgical-sales/generateProviderAiSalesBriefing";

import { ProviderIntelligenceRepository } from "./ProviderIntelligenceRepository";

import { ProviderDiscoveryMappingHost } from "./ProviderDiscoveryMappingHost";

import { ProviderOverviewFocusedActionHost } from "./ProviderOverviewFocusedActionHost";

import { ProviderIntelligenceGapNoteDrawer } from "./ProviderIntelligenceGapNoteDrawer";



export function ProviderOperationalIntelligence({

  contact,

  planning,

  relationshipStage,

  engagements,

  opportunities,

  cases,

  providerId,

  organizationId,

  organizationName,

  organizationBaseline,

  specialty: _specialty,

  relatedContacts = [],

  onLogUpdate,

  onProviderUpdated,

  onProfileRefresh,

  onOpenOptionalIntelligence: _onOpenOptionalIntelligence,

  clinicalDiscoveryAnswers,

  activityTimeline,

  universalFactsReadModel,

  providerAiSummary,

  debriefNarrativeContext,

}: {

  contact: Record<string, unknown>;

  planning?: ProviderPlanningCompletion | null;

  relationshipStage?: string | null;

  engagements?: ProviderEngagementSummary[];

  opportunities?: Array<Record<string, unknown>>;

  cases?: Array<Record<string, unknown>>;

  providerId: string;

  organizationId?: string | null;

  organizationName?: string | null;

  organizationBaseline?: OrganizationIntelligenceBaseline | null;

  specialty?: string | null;

  relatedContacts?: Record<string, unknown>[];

  onLogUpdate: () => void;

  onProviderUpdated?: (provider: Record<string, unknown>) => void | Promise<void>;

  onProfileRefresh?: () => void | Promise<void>;

  onOpenOptionalIntelligence?: () => void;

  clinicalDiscoveryAnswers?: ProviderClinicalDiscoveryAnswer[];

  activityTimeline?: Array<Record<string, unknown>>;

  universalFactsReadModel?: UniversalFactsReadModelPayload | null;

  providerAiSummary?: ProviderAiSalesBriefing | null;

  debriefNarrativeContext?: ProviderDebriefNarrativeContext | null;

}) {

  const router = useRouter();

  const [mappingOpen, setMappingOpen] = React.useState(false);

  const handleLogUpdate = React.useCallback(() => {
    onLogUpdate();
  }, [onLogUpdate]);

  const [focusedModal, setFocusedModal] = React.useState<ProviderOverviewFocusedModal | null>(null);

  const [gapNoteTarget, setGapNoteTarget] = React.useState<Extract<
    ProviderPathwayExecutionAction,
    { kind: "quickNote" }
  > | null>(null);



  const executePathwayAction = React.useCallback(

    (action: ProviderPathwayExecutionAction) => {

      if (action.kind === "quickNote") {

        setGapNoteTarget(action);

        return;

      }

      if (action.kind === "href") {

        router.push(action.href);

        return;

      }

      setFocusedModal(action.modal);

    },

    [router],

  );



  return (

    <>

      <div
        className="pov-body pov-body--command-center mc-workspace mc-workspace--provider-intelligence"
        aria-label="Provider intelligence"
      >
        <div className="pov-cc pov-cc--compact" data-testid="provider-intelligence-workspace">
          <header className="pib-intel-page-head pib-hero">
            <span className="pib-hero__glow" aria-hidden />
            <span className="pib-hero__grid" aria-hidden />
            <div className="pib-intel-page-head__main pib-hero__main">
              <p className="pib-hero__kicker">
                <span className="pib-hero__kicker-dot" aria-hidden />
                Provider dossier
              </p>
              <h2 className="pib-intel-page-head__title pib-hero__title">
                {INTELLIGENCE_CAPTURE_DASHBOARD_UI.kicker}
              </h2>
              <p className="pib-intel-page-head__subtitle pib-hero__subtitle">
                {INTELLIGENCE_CAPTURE_DASHBOARD_UI.subtitle}
              </p>
            </div>
            <button
              type="button"
              className="mc-cta mc-cta--primary pib-hero__cta"
              onClick={() => setMappingOpen(true)}
            >
              <span className="pib-hero__cta-plus" aria-hidden>
                +
              </span>
              {INTELLIGENCE_CAPTURE_DASHBOARD_UI.title}
            </button>
          </header>

          <ProviderIntelligenceRepository

          contact={contact}

          providerId={providerId}

          accountId={organizationId}

          planning={planning}

          relationshipStage={relationshipStage}

          organizationName={organizationName}

          organizationBaseline={organizationBaseline}

          engagements={engagements}

          opportunities={opportunities}

          cases={cases}

          activityTimeline={activityTimeline}

          relatedContacts={relatedContacts}

          clinicalDiscoveryAnswers={clinicalDiscoveryAnswers as ProviderClinicalDiscoveryAnswer[] | undefined}

          providerAiSummary={providerAiSummary}

          debriefNarrativeContext={debriefNarrativeContext}

          onExecutePathwayAction={executePathwayAction}

          onProviderUpdated={onProviderUpdated}

          universalFactsReadModel={universalFactsReadModel}

          />
        </div>
      </div>

        <ProviderDiscoveryMappingHost

          open={mappingOpen}

          onOpenChange={setMappingOpen}

          contact={contact}

          planning={planning}

          relationshipStage={relationshipStage}

          engagements={engagements}

          opportunities={opportunities}

          cases={cases}

          providerId={providerId}

          organizationId={organizationId ?? null}

          organizationName={organizationName}

          relatedContacts={relatedContacts}

          onLogFieldIntel={handleLogUpdate}

          onProviderUpdated={onProviderUpdated}

          onProfileRefresh={onProfileRefresh}

          enableUrlDeepLink

        />

      <ProviderOverviewFocusedActionHost

        activeModal={focusedModal}

        contact={contact}

        providerId={providerId}

        providerLabel={contactDisplayName(contact)}

        organizationId={organizationId ?? null}

        organizationName={organizationName}

        relatedContacts={relatedContacts}

        onClose={() => setFocusedModal(null)}

        onProviderUpdated={onProviderUpdated}

      />



      <ProviderIntelligenceGapNoteDrawer

        open={gapNoteTarget != null}

        providerId={providerId}

        categoryId={gapNoteTarget?.categoryId ?? "clinical_challenges"}

        title={gapNoteTarget?.label ?? "Add note"}

        hint={gapNoteTarget?.hint}

        onClose={() => setGapNoteTarget(null)}

        onSaved={async (provider) => {
          await onProviderUpdated?.(provider);
        }}

      />

    </>

  );

}
