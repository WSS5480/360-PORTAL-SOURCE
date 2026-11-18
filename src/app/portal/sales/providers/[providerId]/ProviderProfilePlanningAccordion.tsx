"use client";



import React from "react";

import { sortSectionsForIncrementalView } from "@/lib/surgical-sales/providerIntelligenceIncrementalCapture";

import {

  normalizePlanningSectionId,

  type ProviderPlanningTabSectionId,

} from "@/lib/surgical-sales/providerPlanningTabSections";

import {
  ACCOUNT_UNDERSTANDING_AREAS,
  PROVIDER_ACCOUNT_UNDERSTANDING,
} from "@/lib/surgical-sales/providerAccountUnderstanding";
import { ProviderOperationalIntelligence } from "./ProviderOperationalIntelligence";
import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import type { ProviderDebriefNarrativeContext } from "@/lib/surgical-sales/engagements/loadLatestProviderDebriefNarrative";
import { ProviderGuidedIntelCapture } from "./ProviderGuidedIntelCapture";
import { ProviderIntelligenceItemDetailPanel } from "./ProviderIntelligenceItemDetailPanel";
import { resolveIntelligenceItemIdFromSection } from "@/lib/surgical-sales/buildIntelligenceItemDetailView";
import { buildIntelligenceLearningGaps } from "@/lib/surgical-sales/providerIntelligenceLearningGaps";
import {
  buildDiscoveryAnswerImpact,
  buildDiscoveryReadinessChangelog,
  type DiscoveryAnswerImpact,
} from "@/lib/surgical-sales/discoveryLiveUpdate";
import { buildGuidedIntelCaptureLaunchStats } from "@/lib/surgical-sales/providerGuidedIntelCapture";
import type { CommercialDeploymentReadinessSnapshot } from "@/lib/surgical-sales/commercialDeploymentReadiness";
import { enrichProviderIntelligenceContact } from "@/lib/surgical-sales/enrichProviderIntelligenceContact";
import {
  filterContactToProviderIntelligenceScope,
  type ProviderIntelligenceSectionId,
} from "@/lib/surgical-sales/providerIntelligenceArchitecture";
import { contactDisplayName } from "@/lib/surgical-sales/labels";

import { intelligenceMetadataFromContact } from "@/lib/surgical-sales/providerCreateWizard";

import type { ProviderIntelligenceFieldMetadataMap } from "@/lib/surgical-sales/providerIntelligenceFieldMetadata";

import type { ProviderPlanningCompletion } from "@/lib/surgical-sales/providerPlanningCompletion";

import type { ProviderClinicalDiscoveryAnswer } from "@/lib/surgical-sales/providerClinicalDiscoveryAnswers";
import type { ProviderProfilePayload } from "./providerProfileTypes";
import type { UniversalFactsReadModelPayload } from "@/lib/surgical-sales/universalExtractor/universalFactsReadModelAdapters";
import type { OrganizationIntelligenceBaseline } from "@/lib/surgical-sales/loadOrganizationIntelligenceBaseline";
import type { ProviderAiSalesBriefing } from "@/lib/surgical-sales/generateProviderAiSalesBriefing";
import {
  buildProviderIntelligenceMaturitySnapshot,
  isIntelligenceSectionVisibleForMaturityStage,
} from "@/lib/surgical-sales/providerIntelligenceMaturity";
import { useIntelligenceCardActions } from "./useIntelligenceCardActions";
import type { IntelligenceDiscoveryStakeholder } from "@/lib/surgical-sales/providerIntelligenceStakeholderDiscovery";
import { discoverySupportContactPlanningFieldKeys } from "@/lib/surgical-sales/discoveryIntelligenceSupportContact";

const OBSERVATION_SECTION_ID = "observation_readiness" as const;



export function ProviderProfilePlanningAccordion({
  providerId,
  accountId,
  provider,
  planning,

  specialty,

  relationshipStage,

  engagements,

  opportunities,

  cases,

  planDraft,

  setPlanDraft,

  saving,

  lastSavedAt,

  autosaveError,

  onSaveDraft,

  initialOpenSection,

  suppressProgressBar: _suppressProgressBar = false,

  onClinicalDiscoverySaved,

  organizationName,

  organizationBaseline,

  relatedContacts,

  onLogUpdate,

  onOpenOptionalIntelligence,

  onRefreshProvider,

  activityTimeline,

  clinicalDiscoveryAnswers,

  universalFactsReadModel,

  providerAiSummary,

  debriefNarrativeContext,

}: {

  providerId: string;

  provider: Record<string, unknown>;

  planning?: ProviderPlanningCompletion;

  specialty?: string | null;

  relationshipStage?: string | null;

  engagements?: ProviderEngagementSummary[];

  opportunities?: Array<Record<string, unknown>>;

  cases?: Array<Record<string, unknown>>;

  planDraft: Record<string, string>;

  setPlanDraft: React.Dispatch<React.SetStateAction<Record<string, string>>>;

  saving: boolean;

  lastSavedAt: number | null;

  autosaveError: string | null;

  onSaveDraft: () => Promise<void>;

  onClinicalDiscoverySaved?: (payload: ProviderProfilePayload) => void;

  initialOpenSection?: string | null;

  suppressProgressBar?: boolean;

  accountId?: string | null;

  organizationName?: string | null;

  organizationBaseline?: OrganizationIntelligenceBaseline | null;

  relatedContacts?: Record<string, unknown>[];

  onLogUpdate: () => void;

  onOpenOptionalIntelligence?: () => void;

  onRefreshProvider?: () => void | Promise<void>;

  activityTimeline?: Array<Record<string, unknown>>;

  clinicalDiscoveryAnswers?: ProviderClinicalDiscoveryAnswer[];

  universalFactsReadModel?: UniversalFactsReadModelPayload | null;

  providerAiSummary?: ProviderAiSalesBriefing | null;

  debriefNarrativeContext?: ProviderDebriefNarrativeContext | null;

}) {

  const intelligenceContact = React.useMemo(
    () =>
      enrichProviderIntelligenceContact({
        contact: provider,
        relatedContacts: relatedContacts ?? [],
        planDraft,
      }),
    [provider, planDraft, relatedContacts],
  );

  const contact = React.useMemo(
    () => filterContactToProviderIntelligenceScope(intelligenceContact),
    [intelligenceContact],
  );

  const scopeContact = intelligenceContact;

  const providerDisplayName = React.useMemo(
    () =>
      contactDisplayName({
        first_name: provider.first_name as string,
        last_name: provider.last_name as string,
        email: provider.email as string,
      }),
    [provider],
  );



  const fieldMetadata = React.useMemo(

    (): ProviderIntelligenceFieldMetadataMap => intelligenceMetadataFromContact(provider),

    [provider],

  );



  const sections = React.useMemo(() => {

    const all = planning?.sections ?? [];

    const ordered = all.filter((s): s is NonNullable<typeof s> => Boolean(s));

    return sortSectionsForIncrementalView(ordered);

  }, [planning?.sections]);



  const maturitySnapshot = React.useMemo(
    () =>
      buildProviderIntelligenceMaturitySnapshot({
        contact,
        planning,
        relationshipStage: relationshipStage ?? String(provider.provider_relationship_stage ?? ""),
        opportunities,
        cases,
        engagements,
      }),
    [contact, planning, relationshipStage, provider.provider_relationship_stage, opportunities, cases, engagements],
  );

  const accordionSections = React.useMemo(
    () =>
      sections
        .filter((s) => s.id !== OBSERVATION_SECTION_ID)
        .filter((s) =>
          isIntelligenceSectionVisibleForMaturityStage(
            s.id as ProviderPlanningTabSectionId,
            maturitySnapshot.stage,
          ),
        ),
    [sections, maturitySnapshot.stage],
  );



  const normalizedInitial = normalizePlanningSectionId(initialOpenSection);



  const [openId, setOpenId] = React.useState<ProviderPlanningTabSectionId | "">(() => {

    if (normalizedInitial && normalizedInitial !== OBSERVATION_SECTION_ID) {

      return normalizedInitial;

    }

    return "";

  });



  const [deepenExpanded, setDeepenExpanded] = React.useState<Record<string, boolean>>({});

  const [emphasizeKeys, setEmphasizeKeys] = React.useState<string[]>([]);
  const [guidedCaptureOpen, setGuidedCaptureOpen] = React.useState(false);
  const [guidedEmphasizeDbKey, setGuidedEmphasizeDbKey] = React.useState<string | undefined>();
  const [detailItemId, setDetailItemId] = React.useState<string | null>(null);
  const [detailStatusOverride, setDetailStatusOverride] = React.useState<string | undefined>();
  const [discoveryPathOverride, setDiscoveryPathOverride] =
    React.useState<IntelligenceDiscoveryStakeholder | null>(null);
  const [discoveryImpacts, setDiscoveryImpacts] = React.useState<DiscoveryAnswerImpact[]>([]);
  const [sectionPulse, setSectionPulse] = React.useState<
    Partial<Record<ProviderIntelligenceSectionId, number>>
  >({});
  const readinessBaselineRef = React.useRef<CommercialDeploymentReadinessSnapshot | null>(null);

  const discoveryStakeholder = React.useMemo(
    () => discoveryPathOverride ?? "unspecified",
    [discoveryPathOverride],
  );



  React.useEffect(() => {

    if (normalizedInitial && normalizedInitial !== OBSERVATION_SECTION_ID) {

      setOpenId(normalizedInitial);

    }

  }, [normalizedInitial]);



  function openGuidedCapture(dbKey?: string) {
    readinessBaselineRef.current = buildGuidedIntelCaptureLaunchStats(contact, {
      planning,
      fieldMetadata,
      maturitySnapshot,
      discoveryStakeholder,
    }).deployment;
    setGuidedEmphasizeDbKey(dbKey);
    setGuidedCaptureOpen(true);
  }

  function closeGuidedCapture() {
    setGuidedCaptureOpen(false);
    setGuidedEmphasizeDbKey(undefined);
  }

  function handleDiscoveryAnswerApplied(input: {
    dbKey: string;
    value: string;
    beforeContact: Record<string, unknown>;
    afterContact: Record<string, unknown>;
  }) {
    const impact = buildDiscoveryAnswerImpact({
      dbKey: input.dbKey,
      value: input.value,
      beforeContact: input.beforeContact,
      afterContact: input.afterContact,
      planning,
      fieldMetadata,
      discoveryStakeholder,
      organizationName,
    });
    if (!impact) return;
    setDiscoveryImpacts((prev) => [...prev, impact].slice(-12));
    setSectionPulse((prev) => ({
      ...prev,
      [impact.sectionId]: (prev[impact.sectionId] ?? 0) + 1,
    }));
  }

  const latestDiscoveryImpact =
    discoveryImpacts.length > 0 ? discoveryImpacts[discoveryImpacts.length - 1]! : null;

  const discoveryReadinessChangelog = React.useMemo(
    () => buildDiscoveryReadinessChangelog(discoveryImpacts),
    [discoveryImpacts],
  );

  const discoveryFeedbackQueue = React.useMemo(
    () =>
      [...discoveryImpacts]
        .reverse()
        .slice(0, 4)
        .map((impact) => ({
          id: `${impact.dbKey}-${impact.at}`,
          line: impact.feedbackLine,
          scope: impact.saveConfirmation?.scope ?? "provider",
        })),
    [discoveryImpacts],
  );

  function openFullArea(sectionId: ProviderPlanningTabSectionId | typeof OBSERVATION_SECTION_ID) {
    setOpenId(
      sectionId === OBSERVATION_SECTION_ID
        ? ("or_environment" as ProviderPlanningTabSectionId)
        : sectionId,
    );
    setEmphasizeKeys([]);
  }

  const { validating, workspaceForSection, handlersForSection } = useIntelligenceCardActions({
    providerId,
    accountId,
    contact,
    planning,
    fieldMetadata,
    openQuickCapture: (_sectionId, dbKey) => openGuidedCapture(dbKey),
    openFullArea,
    onProviderUpdated: (payload) => {
      onClinicalDiscoverySaved?.(payload);
    },
  });



  function toggle(id: ProviderPlanningTabSectionId) {

    if (openId === id) {

      setOpenId("");

      setEmphasizeKeys([]);

      return;

    }

    setOpenId(id);

    setEmphasizeKeys([]);

  }



  const showAutosaveMeta = saving || Boolean(autosaveError);

  const organizationLinked = Boolean(
    organizationName?.trim() || provider.organization_id || provider.account_id || accountId,
  );

  return (

    <section

      className="provider-planning-accordion provider-planning-accordion--mobile provider-intel-workspace provider-intel-workspace--knowledge provider-intel-workspace--page"

      aria-label="Provider intelligence"

    >

      {showAutosaveMeta ? (
        <div className="provider-intel-workspace-top">
          <div className="provider-planning-autosave-meta provider-planning-autosave-meta--inline" aria-live="polite">
            {saving ? <span>Saving…</span> : null}
            {autosaveError ? (
              <span className="provider-planning-autosave-meta--error">{autosaveError}</span>
            ) : null}
          </div>
        </div>
      ) : null}

      <ProviderOperationalIntelligence
        contact={scopeContact}
        planning={planning}
        relationshipStage={relationshipStage}
        engagements={engagements}
        opportunities={opportunities}
        cases={cases}
        providerId={providerId}
        organizationId={accountId}
        organizationName={organizationName}
        organizationBaseline={organizationBaseline}
        specialty={specialty}
        relatedContacts={relatedContacts ?? []}
        activityTimeline={activityTimeline}
        clinicalDiscoveryAnswers={clinicalDiscoveryAnswers}
        universalFactsReadModel={universalFactsReadModel}
        providerAiSummary={providerAiSummary}
        debriefNarrativeContext={debriefNarrativeContext}
        onLogUpdate={onLogUpdate}
        onOpenOptionalIntelligence={onOpenOptionalIntelligence}
        onProfileRefresh={onRefreshProvider}
        onProviderUpdated={async (updated) => {
          if (updated) {
            const planningKeys = discoverySupportContactPlanningFieldKeys();
            setPlanDraft((prev) => {
              const next = { ...prev };
              for (const key of planningKeys) {
                const v = updated[key];
                if (v != null && String(v).trim()) next[key] = String(v);
              }
              return next;
            });
            onClinicalDiscoverySaved?.({
              ok: true,
              provider: updated,
              planning_completion: planning,
            } as ProviderProfilePayload);
          }
          await onRefreshProvider?.();
        }}
      />

      <ProviderIntelligenceItemDetailPanel
        open={detailItemId != null}
        itemId={detailItemId}
        statusOverride={detailStatusOverride}
        contact={contact}
        planning={planning}
        providerId={providerId}
        organizationName={organizationName}
        providerName={providerDisplayName}
        fieldMetadata={fieldMetadata}
        engagements={engagements}
        briefingHref={`/portal/sales/providers/${encodeURIComponent(providerId)}?tab=briefing`}
        disabled={saving}
        onClose={() => {
          setDetailItemId(null);
          setDetailStatusOverride(undefined);
        }}
        onLogUpdate={() => {
          setDetailItemId(null);
          onLogUpdate();
        }}
        onAskNextTouch={() => {
          setDetailItemId(null);
          openGuidedCapture();
        }}
        onCaptureField={(dbKey) => {
          setDetailItemId(null);
          openGuidedCapture(dbKey);
        }}
        onMarkNotRelevant={async (dbKey) => {
          const res = await fetch(
            `/api/portal/sales/providers/${encodeURIComponent(providerId)}`,
            {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                intelligence_discovery_stances: { [dbKey]: "not_relevant" },
              }),
            },
          );
          const payload = (await res.json()) as ProviderProfilePayload;
          if (res.ok && payload.ok) {
            onClinicalDiscoverySaved?.(payload);
          }
        }}
      />

      <ProviderGuidedIntelCapture
        open={guidedCaptureOpen}
        contact={contact}
        planning={planning}
        fieldMetadata={fieldMetadata}
        planDraft={planDraft}
        setPlanDraft={setPlanDraft}
        saving={saving}
        saveError={autosaveError}
        providerId={providerId}
        maturitySnapshot={maturitySnapshot}
        emphasizeDbKey={guidedEmphasizeDbKey}
        discoveryStakeholder={discoveryStakeholder}
        onDiscoveryStakeholderChange={setDiscoveryPathOverride}
        organizationBaseline={organizationBaseline}
        organizationName={organizationName}
        organizationId={accountId}
        relatedContacts={relatedContacts ?? []}
        onSave={onSaveDraft}
        onClose={closeGuidedCapture}
        onAnswerApplied={handleDiscoveryAnswerApplied}
        onProviderUpdated={(updated) => {
          onClinicalDiscoverySaved?.({
            ok: true,
            provider: updated,
            planning_completion: planning,
          } as ProviderProfilePayload);
        }}
      />

    </section>

  );

}

