"use client";

import Link from "next/link";
import React from "react";

import {
  buildOperationalIntelligenceWorkspaceView,
  type IntelligenceRecommendedMove,
  type IntelligenceValidationQueueRow,
  type ValidationQueueAction,
} from "@/lib/surgical-sales/buildOperationalIntelligenceWorkspaceView";
import type { OperationalReadinessCardView } from "@/lib/surgical-sales/buildOperationalReadinessCardView";
import { ProviderOperationalReadinessCard } from "./ProviderOperationalReadinessCard";
import type { OrganizationIntelligenceBaseline } from "@/lib/surgical-sales/loadOrganizationIntelligenceBaseline";
import type { ProviderIntelligenceFieldMetadataMap } from "@/lib/surgical-sales/providerIntelligenceFieldMetadata";
import { LOG_UPDATE_UI_ENABLED } from "@/lib/surgical-sales/logUpdateUx";
import type { ProviderPlanningCompletion } from "@/lib/surgical-sales/providerPlanningCompletion";
import type { ProviderIntelligenceMaturitySnapshot } from "@/lib/surgical-sales/providerIntelligenceMaturity";
import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import type { ProviderIntelligenceSectionId } from "@/lib/surgical-sales/providerIntelligenceArchitecture";
import { PROVIDER_ACCOUNT_UNDERSTANDING } from "@/lib/surgical-sales/providerAccountUnderstanding";
import { ProviderDiscoveryLivePanel } from "./ProviderDiscoveryLivePanel";
import type { DiscoveryAnswerImpact } from "@/lib/surgical-sales/discoveryLiveUpdate";
import type { IntelligenceScope } from "@/lib/surgical-sales/intelligenceScopeModel";
import { operationalIntelligencePageCss } from "./providerIntelligenceUi/operationalIntelligencePageCss";
import { OperationalIntelligenceHero } from "./providerIntelligenceUi/OperationalIntelligenceHero";
import {
  ContextInsightSurface,
  IntelligenceTaskCard,
  NextMoveRow,
  PageSection,
  PiButtonPrimary,
  PiLinkPrimary,
  SectionHeader,
  SurfaceBody,
  SurfaceCard,
} from "./providerIntelligenceUi";
import type { IntelligenceCardReadinessTone } from "@/lib/surgical-sales/providerIntelligenceCardStatus";
import { sanitizeIntelligenceTabUserCopy } from "@/lib/surgical-sales/buildIntelligenceTabPresentation";
import type { ProviderIntelligenceDashboardView } from "@/lib/surgical-sales/buildProviderIntelligenceDashboardView";

const TONE_PRIORITY: Record<IntelligenceCardReadinessTone, number> = {
  unmapped: 0,
  partial: 1,
  not_started: 2,
  confirmed: 3,
  operationally_ready: 4,
};

function sortByAttention(cards: OperationalReadinessCardView[]): OperationalReadinessCardView[] {
  return [...cards].sort((a, b) => TONE_PRIORITY[a.tone] - TONE_PRIORITY[b.tone]);
}

export function ProviderIntelligenceDashboard({
  contact,
  planning,
  providerId,
  providerName,
  organizationName,
  organizationBaseline,
  engagements,
  cases,
  opportunities,
  relationshipStage,
  fieldMetadata,
  maturitySnapshot,
  organizationLinked,
  onContinueDiscovery,
  onLogUpdate,
  onEditField,
  onViewDetails,
  onOpenItemDetail,
  sectionPulse = {},
  disabled = false,
  guidedCaptureActive = false,
  latestDiscoveryImpact = null,
  discoveryReadinessChangelog = [],
  discoveryFeedbackQueue = [],
  deepIntelligence,
  selectedDetailItemId = null,
}: {
  contact: Record<string, unknown>;
  planning?: ProviderPlanningCompletion | null;
  providerId: string;
  providerName?: string | null;
  organizationName?: string | null;
  organizationBaseline?: OrganizationIntelligenceBaseline | null;
  engagements?: ProviderEngagementSummary[];
  cases?: Array<Record<string, unknown>>;
  opportunities?: Array<Record<string, unknown>>;
  relationshipStage?: string | null;
  fieldMetadata?: ProviderIntelligenceFieldMetadataMap;
  maturitySnapshot?: ProviderIntelligenceMaturitySnapshot;
  organizationLinked?: boolean;
  onContinueDiscovery: () => void;
  onLogUpdate: () => void;
  onEditField: (dbKey: string) => void;
  onViewDetails: (sectionId: ProviderIntelligenceSectionId) => void;
  onOpenItemDetail?: (itemId: string, statusLabel?: string) => void;
  sectionPulse?: Partial<Record<ProviderIntelligenceSectionId, number>>;
  disabled?: boolean;
  guidedCaptureActive?: boolean;
  latestDiscoveryImpact?: DiscoveryAnswerImpact | null;
  discoveryReadinessChangelog?: string[];
  discoveryFeedbackQueue?: { id: string; line: string; scope: IntelligenceScope }[];
  deepIntelligence?: React.ReactNode;
  selectedDetailItemId?: string | null;
}) {
  const workspace = React.useMemo(
    () =>
      buildOperationalIntelligenceWorkspaceView({
        contact,
        planning,
        providerId,
        providerName,
        organizationName,
        organizationBaseline,
        engagements,
        cases,
        opportunities,
        relationshipStage,
        fieldMetadata,
        maturitySnapshot,
        organizationLinked,
      }),
    [
      contact,
      planning,
      providerId,
      providerName,
      organizationName,
      organizationBaseline,
      engagements,
      cases,
      opportunities,
      relationshipStage,
      fieldMetadata,
      maturitySnapshot,
      organizationLinked,
    ],
  );

  const briefingHref = `/portal/sales/providers/${encodeURIComponent(providerId)}?tab=briefing`;
  const newEngagementHref = `/portal/sales/engagements/new?provider_id=${encodeURIComponent(providerId)}`;

  if (!workspace) {
    return <p className="pi-empty oi-workspace-empty">{PROVIDER_ACCOUNT_UNDERSTANDING.emptyReload}</p>;
  }

  return (
    <div className="oi-workspace pi-root" aria-label="Operational intelligence">
      <style>{operationalIntelligencePageCss}</style>

      <PageSection spaced={false}>
        <OperationalIntelligenceHero
          header={workspace.header}
          disabled={disabled}
          onBuildIntelligence={onContinueDiscovery}
          onLogUpdate={onLogUpdate}
        />
      </PageSection>

      <PageSection>
        <SurfaceCard>
          <SectionHeader
            titleId="oi-validation-title"
            title="Needs validation"
            subtitle="Confirm these on your next touch before committing field time."
          />
          <SurfaceBody>
            {workspace.validationQueue.length === 0 ? (
              <p className="pi-empty">No open validation items — context is current for now.</p>
            ) : (
              <div className="pi-task-stack">
                {workspace.validationQueue.map((row) => (
                  <IntelligenceTaskCard
                    key={row.id}
                    title={row.title}
                    hint={row.hint}
                    scopeLabel={row.scopeLabel}
                    statusLabel={row.statusLabel}
                    disabled={disabled}
                    selected={selectedDetailItemId === row.id}
                    onOpen={() => onOpenItemDetail?.(row.id, row.statusLabel)}
                    onUpdate={() =>
                      handleValidationAction(row, "update", {
                        onEditField,
                        onContinueDiscovery,
                        onOpenItemDetail,
                      })
                    }
                    onAskNextTouch={() =>
                      handleValidationAction(row, "ask_next_touch", {
                        onEditField,
                        onContinueDiscovery,
                        onOpenItemDetail,
                      })
                    }
                    onMarkNotRelevant={() =>
                      handleValidationAction(row, "mark_not_relevant", {
                        onEditField,
                        onContinueDiscovery,
                        onOpenItemDetail,
                      })
                    }
                  />
                ))}
              </div>
            )}
          </SurfaceBody>
        </SurfaceCard>
      </PageSection>

      <PageSection>
        <div className="oi-context-grid">
          <ContextInsightSurface
            title="Facility context"
            subtitle={workspace.facilityContext.subtitle}
            scope="Facility"
            lines={workspace.facilityContext.lines}
            emptyMessage="Nothing captured at the facility level yet."
          />
          <ContextInsightSurface
            title="Provider context"
            subtitle={workspace.providerContext.subtitle}
            scope="Provider"
            lines={workspace.providerContext.lines}
            emptyMessage="Nothing captured for this provider yet."
          />
        </div>
      </PageSection>

      <PageSection>
        <SurfaceCard>
          <SectionHeader
            titleId="oi-moves-title"
            title="Recommended next moves"
            subtitle="Work top to bottom — each step unlocks the next field move."
          />
          <SurfaceBody>
            <ol className="pi-next-move-list">
              {workspace.recommendedMoves.map((move, index) => (
                <NextMoveRow
                  key={move.id}
                  step={index + 1}
                  title={move.title}
                  description={move.description}
                  action={
                    <NextMoveAction
                      move={move}
                      disabled={disabled}
                      briefingHref={briefingHref}
                      newEngagementHref={newEngagementHref}
                      onLogUpdate={onLogUpdate}
                      onContinueDiscovery={onContinueDiscovery}
                    />
                  }
                />
              ))}
            </ol>
          </SurfaceBody>
        </SurfaceCard>
      </PageSection>

      <DeepIntelligenceSection
        moduleCards={sortByAttention(workspace.deep.moduleCards)}
        engagements={workspace.deep.engagements}
        guidedCaptureActive={guidedCaptureActive}
        latestDiscoveryImpact={latestDiscoveryImpact}
        discoveryReadinessChangelog={discoveryReadinessChangelog}
        discoveryFeedbackQueue={discoveryFeedbackQueue}
        onEditField={onEditField}
        onViewDetails={onViewDetails}
        sectionPulse={sectionPulse}
        disabled={disabled}
        deepIntelligence={deepIntelligence}
      />
    </div>
  );
}

function handleValidationAction(
  row: IntelligenceValidationQueueRow,
  action: ValidationQueueAction,
  handlers: {
    onEditField: (dbKey: string) => void;
    onContinueDiscovery: () => void;
    onOpenItemDetail?: (itemId: string, statusLabel?: string) => void;
  },
) {
  if (action === "ask_next_touch") {
    handlers.onContinueDiscovery();
    return;
  }
  if (action === "mark_not_relevant" || action === "update") {
    if (row.dbKey) {
      handlers.onEditField(row.dbKey);
      return;
    }
    handlers.onOpenItemDetail?.(row.id, row.statusLabel);
    return;
  }
  if (row.dbKey) {
    handlers.onEditField(row.dbKey);
    return;
  }
  handlers.onOpenItemDetail?.(row.id, row.statusLabel);
}

function NextMoveAction({
  move,
  disabled,
  briefingHref,
  newEngagementHref,
  onLogUpdate,
  onContinueDiscovery,
}: {
  move: IntelligenceRecommendedMove;
  disabled?: boolean;
  briefingHref: string;
  newEngagementHref: string;
  onLogUpdate: () => void;
  onContinueDiscovery: () => void;
}) {
  if (move.actionKind === "open_briefing") {
    return <PiLinkPrimary href={briefingHref}>{move.actionLabel}</PiLinkPrimary>;
  }
  if (move.actionKind === "schedule") {
    return <PiLinkPrimary href={newEngagementHref}>{move.actionLabel}</PiLinkPrimary>;
  }
  if (move.actionKind === "log") {
    if (!LOG_UPDATE_UI_ENABLED) return null;
    return (
      <PiButtonPrimary disabled={disabled} onClick={onLogUpdate}>
        {move.actionLabel}
      </PiButtonPrimary>
    );
  }
  return (
    <PiButtonPrimary disabled={disabled} onClick={onContinueDiscovery}>
      {move.actionLabel}
    </PiButtonPrimary>
  );
}

function DeepIntelligenceSection({
  moduleCards,
  engagements,
  guidedCaptureActive,
  latestDiscoveryImpact,
  discoveryReadinessChangelog,
  discoveryFeedbackQueue,
  onEditField,
  onViewDetails,
  sectionPulse,
  disabled,
  deepIntelligence,
}: {
  moduleCards: OperationalReadinessCardView[];
  engagements: ProviderIntelligenceDashboardView["engagements"];
  guidedCaptureActive?: boolean;
  latestDiscoveryImpact?: DiscoveryAnswerImpact | null;
  discoveryReadinessChangelog?: string[];
  discoveryFeedbackQueue?: { id: string; line: string; scope: IntelligenceScope }[];
  onEditField: (dbKey: string) => void;
  onViewDetails: (sectionId: ProviderIntelligenceSectionId) => void;
  sectionPulse?: Partial<Record<ProviderIntelligenceSectionId, number>>;
  disabled?: boolean;
  deepIntelligence?: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  const showLive =
    guidedCaptureActive || latestDiscoveryImpact || (discoveryFeedbackQueue?.length ?? 0) > 0;

  return (
    <SurfaceCard variant="flush" className="oi-deep">
      <button
        type="button"
        className="oi-deep-trigger"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="oi-deep-trigger-text">
          <span className="oi-deep-title">Deep operational intelligence</span>
          <span className="oi-deep-subtitle">
            Mappings, modules, engagement history, and field editor.
          </span>
        </span>
        <span className="oi-deep-chevron" aria-hidden>
          {open ? "▾" : "▸"}
        </span>
      </button>

      {open ? (
        <div className="oi-deep-body">
          {showLive ? (
            <ProviderDiscoveryLivePanel
              active={Boolean(guidedCaptureActive)}
              latestImpact={latestDiscoveryImpact ?? null}
              readinessChangelog={discoveryReadinessChangelog ?? []}
              feedbackQueue={discoveryFeedbackQueue ?? []}
            />
          ) : null}

          {moduleCards.length > 0 ? (
            <div className="intel-index-list intel-index-list--dossier">
              {moduleCards.map((card) => (
                <ProviderOperationalReadinessCard
                  key={card.id}
                  card={card}
                  disabled={disabled}
                  compact
                  variant="index"
                  defaultExpanded={false}
                  pulseKey={sectionPulse?.[card.sectionId]}
                  onPrimaryAction={(_sectionId, dbKey) => onEditField(dbKey)}
                  onViewDetails={onViewDetails}
                />
              ))}
            </div>
          ) : null}

          <DeepEngagements touches={engagements} />

          {deepIntelligence}
        </div>
      ) : null}
    </SurfaceCard>
  );
}

function DeepEngagements({
  touches,
}: {
  touches: ProviderIntelligenceDashboardView["engagements"];
}) {
  if (touches.length === 0) return null;

  return (
    <ul className="oi-deep-engagements" aria-label="Recent engagements">
      {touches.slice(0, 4).map((touch) => (
        <li key={touch.id}>
          <Link href={touch.href} className="oi-deep-engagement-link">
            <span>
              {touch.typeLabel}
              <span className="oi-deep-engagement-meta"> · {touch.dateLabel}</span>
            </span>
            {touch.summary ? (
              <span className="oi-deep-engagement-meta">
                {sanitizeIntelligenceTabUserCopy(touch.summary)}
              </span>
            ) : null}
          </Link>
        </li>
      ))}
    </ul>
  );
}
