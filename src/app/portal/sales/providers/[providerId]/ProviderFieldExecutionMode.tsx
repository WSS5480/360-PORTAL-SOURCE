"use client";

import Link from "next/link";
import React from "react";
import {
  buildProviderFieldExecutionBriefing,
  FIELD_EXECUTION_BRIEFING_KICKER,
  FIELD_EXECUTION_BRIEFING_TITLE,
  type FieldExecutionAction,
  type FieldExecutionConfirmation,
  type FieldExecutionContact,
  type ProviderFieldExecutionBriefing,
} from "@/lib/surgical-sales/buildProviderFieldExecutionBriefing";
import type { ProviderPrimaryOperationalRiskTone } from "@/lib/surgical-sales/buildProviderPrimaryOperationalRisk";
import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import type { ProviderIntelligenceSectionId } from "@/lib/surgical-sales/providerIntelligenceArchitecture";
import type { ProviderPlanningCompletion } from "@/lib/surgical-sales/providerPlanningCompletion";
import { providerFieldExecutionCss } from "./providerFieldExecutionCss";

function riskToneClass(tone: ProviderPrimaryOperationalRiskTone): string {
  return `provider-field-exec-risk--${tone}`;
}

function confirmTierClass(tier: FieldExecutionConfirmation["tier"]): string {
  return tier === "outdated" ? " provider-field-exec-confirm-item--outdated" : "";
}

function ContactRow({
  contact,
  onTap,
}: {
  contact: FieldExecutionContact;
  onTap?: (sectionId: ProviderIntelligenceSectionId, dbKey: string) => void;
}) {
  const canTap = contact.dbKey && contact.sectionId && onTap;
  return (
    <li
      className={`provider-field-exec-contact${contact.kind === "coordinator" ? " provider-field-exec-contact--coordinator" : ""}`}
    >
      <span className="provider-field-exec-contact-role">{contact.role}</span>
      <span className="provider-field-exec-contact-name">{contact.name}</span>
      {contact.detail ? (
        <span className="provider-field-exec-contact-detail">{contact.detail}</span>
      ) : null}
      {canTap ? (
        <button
          type="button"
          className="provider-field-exec-contact-tap"
          onClick={() => onTap(contact.sectionId!, contact.dbKey!)}
        >
          Update
        </button>
      ) : null}
    </li>
  );
}

function FieldExecutionActionButton({
  action,
  onCapture,
  onManageContacts,
}: {
  action: FieldExecutionAction;
  onCapture: (sectionId: ProviderIntelligenceSectionId, dbKey?: string) => void;
  onManageContacts: () => void;
}) {
  if (action.kind === "contacts") {
    return (
      <button
        type="button"
        className={`provider-field-exec-action${action.primary ? " provider-field-exec-action--primary" : ""}`}
        onClick={onManageContacts}
      >
        {action.label}
      </button>
    );
  }

  if (action.kind === "intelligence" && action.href) {
    return (
      <Link href={action.href} className="provider-field-exec-action provider-field-exec-action--ghost">
        {action.label}
      </Link>
    );
  }

  if (action.href && (action.kind === "engagement" || action.kind === "prepare")) {
    return (
      <Link
        href={action.href}
        className={`provider-field-exec-action${action.primary ? " provider-field-exec-action--primary" : ""}`}
      >
        {action.label}
      </Link>
    );
  }

  if (
    action.sectionId &&
    (action.kind === "deploy_mission" ||
      action.kind === "reconfirm" ||
      action.kind === "capture")
  ) {
    return (
      <button
        type="button"
        className={`provider-field-exec-action${action.primary ? " provider-field-exec-action--primary" : ""}`}
        onClick={() => onCapture(action.sectionId!, action.dbKey)}
      >
        {action.label}
      </button>
    );
  }

  return null;
}

export function ProviderFieldExecutionMode({
  contact,
  planning,
  relationshipStage,
  engagements,
  opportunities,
  cases,
  relatedContacts,
  newEngagementHref,
  prepareEngagementHref,
  intelligenceHref,
  onCapture,
  onManageContacts,
}: {
  contact: Record<string, unknown>;
  planning?: ProviderPlanningCompletion | null;
  relationshipStage?: string | null;
  engagements?: ProviderEngagementSummary[];
  opportunities?: Array<Record<string, unknown>>;
  cases?: Array<Record<string, unknown>>;
  relatedContacts?: Record<string, unknown>[];
  newEngagementHref: string;
  prepareEngagementHref?: string | null;
  intelligenceHref: string;
  onCapture: (sectionId: ProviderIntelligenceSectionId, dbKey?: string) => void;
  onManageContacts: () => void;
}) {
  const briefing = React.useMemo(
    () =>
      buildProviderFieldExecutionBriefing({
        contact,
        planning,
        relationshipStage,
        engagements,
        opportunities,
        cases,
        relatedContacts,
        newEngagementHref,
        prepareEngagementHref,
        intelligenceHref,
      }),
    [
      contact,
      planning,
      relationshipStage,
      engagements,
      opportunities,
      cases,
      relatedContacts,
      newEngagementHref,
      prepareEngagementHref,
      intelligenceHref,
    ],
  );

  const primaryActions = briefing.actions.filter(
    (a) => a.kind !== "intelligence" && a.kind !== "deploy_mission" && a.kind !== "reconfirm",
  );
  const deployAction = briefing.actions.find((a) => a.kind === "deploy_mission");

  return (
    <div className="provider-field-exec" aria-label={FIELD_EXECUTION_BRIEFING_TITLE}>
      <style dangerouslySetInnerHTML={{ __html: providerFieldExecutionCss }} />

      <header className="provider-field-exec-hero">
        <p className="provider-field-exec-hero-kicker">{FIELD_EXECUTION_BRIEFING_KICKER}</p>
        <h1 className="provider-field-exec-hero-title">{FIELD_EXECUTION_BRIEFING_TITLE}</h1>
        <div className="provider-field-exec-hero-meta">
          <span className="provider-field-exec-hero-pill">{briefing.postureLabel}</span>
          <span className="provider-field-exec-hero-pill">{briefing.workflowLabel}</span>
        </div>
      </header>

      <RiskBlock briefing={briefing} onCapture={onCapture} />
      <MissionBlock briefing={briefing} onCapture={onCapture} deployAction={deployAction} />
      <ConfirmationsBlock briefing={briefing} onCapture={onCapture} />
      <ContactsBlock briefing={briefing} onCapture={onCapture} onManageContacts={onManageContacts} />
      <ActionsBlock
        actions={primaryActions}
        onCapture={onCapture}
        onManageContacts={onManageContacts}
      />
    </div>
  );
}

function RiskBlock({
  briefing,
  onCapture,
}: {
  briefing: ProviderFieldExecutionBriefing;
  onCapture: (sectionId: ProviderIntelligenceSectionId, dbKey?: string) => void;
}) {
  const risk = briefing.operationalRisk;
  if (!risk) return null;

  return (
    <section className={`provider-field-exec-block provider-field-exec-risk ${riskToneClass(risk.tone)}`}>
      <div className="provider-field-exec-block-head">
        <span className="provider-field-exec-block-step">1</span>
        <h2 className="provider-field-exec-block-title">Current operational risk</h2>
      </div>
      <div className="provider-field-exec-block-body">
        <p className="provider-field-exec-risk-headline">{risk.headline}</p>
        {risk.scan ? <p className="provider-field-exec-risk-scan">{risk.scan}</p> : null}
        {risk.cta ? (
          <button
            type="button"
            className="provider-field-exec-risk-cta"
            onClick={() => onCapture(risk.cta!.sectionId, risk.cta!.dbKey)}
          >
            {risk.cta.label}
          </button>
        ) : null}
      </div>
    </section>
  );
}

function MissionBlock({
  briefing,
  onCapture,
  deployAction,
}: {
  briefing: ProviderFieldExecutionBriefing;
  onCapture: (sectionId: ProviderIntelligenceSectionId, dbKey?: string) => void;
  deployAction?: FieldExecutionAction;
}) {
  const mission = briefing.nextMission;
  if (!mission) {
    return (
      <section className="provider-field-exec-block">
        <div className="provider-field-exec-block-head">
          <span className="provider-field-exec-block-step">2</span>
          <h2 className="provider-field-exec-block-title">Next mission</h2>
        </div>
        <div className="provider-field-exec-block-body">
          <p className="provider-field-exec-confirm-empty">No ranked mission — intelligence queue is clear.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="provider-field-exec-block">
      <div className="provider-field-exec-block-head">
        <span className="provider-field-exec-block-step">2</span>
        <h2 className="provider-field-exec-block-title">Next mission</h2>
      </div>
      <div className="provider-field-exec-block-body">
        <p className="provider-field-exec-mission-title">{mission.missionTitle}</p>
        <p className="provider-field-exec-mission-scan">{mission.headline}</p>
        <div className="provider-field-exec-mission-grid">
          <div>
            <span className="provider-field-exec-mission-kicker">Unlock</span>
            <span className="provider-field-exec-mission-value">{mission.operationalUnlock}</span>
          </div>
          <div>
            <span className="provider-field-exec-mission-kicker">Timing</span>
            <span className="provider-field-exec-mission-value">{mission.interactionTiming}</span>
          </div>
          <div>
            <span className="provider-field-exec-mission-kicker">Capture via</span>
            <span className="provider-field-exec-mission-value">{mission.captureSource}</span>
          </div>
          <div>
            <span className="provider-field-exec-mission-kicker">Gain</span>
            <span className="provider-field-exec-mission-value">{mission.confidenceGainEstimate}</span>
          </div>
        </div>
        <span className="provider-field-exec-mission-leverage">
          Leverage {mission.leverageScore} · {mission.leverageTier}
        </span>
        {deployAction ? (
          <button
            type="button"
            className="provider-field-exec-mission-deploy"
            style={{ marginTop: 10 }}
            onClick={() => onCapture(deployAction.sectionId!, deployAction.dbKey)}
          >
            {deployAction.label}
          </button>
        ) : null}
      </div>
    </section>
  );
}

function ConfirmationsBlock({
  briefing,
  onCapture,
}: {
  briefing: ProviderFieldExecutionBriefing;
  onCapture: (sectionId: ProviderIntelligenceSectionId, dbKey?: string) => void;
}) {
  return (
    <section className="provider-field-exec-block">
      <div className="provider-field-exec-block-head">
        <span className="provider-field-exec-block-step">3</span>
        <h2 className="provider-field-exec-block-title">Confirm before the visit</h2>
      </div>
      <div className="provider-field-exec-block-body">
        {briefing.confirmations.length === 0 ? (
          <p className="provider-field-exec-confirm-empty">Signals are current — nothing to reconfirm before this visit.</p>
        ) : (
          <ul className="provider-field-exec-confirm-list">
            {briefing.confirmations.map((item) => (
              <li
                key={item.dbKey}
                className={`provider-field-exec-confirm-item${confirmTierClass(item.tier)}`}
              >
                <div className="provider-field-exec-confirm-head">
                  <span className="provider-field-exec-confirm-label">{item.fieldLabel}</span>
                  <span className="provider-field-exec-confirm-pct">{item.confidencePercent}%</span>
                </div>
                <p className="provider-field-exec-confirm-warning">{item.warning}</p>
                <p className="provider-field-exec-confirm-prompt">{item.prompt}</p>
                <button
                  type="button"
                  className="provider-field-exec-confirm-cta"
                  onClick={() => onCapture(item.sectionId, item.dbKey)}
                >
                  {item.cta}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function ContactsBlock({
  briefing,
  onCapture,
  onManageContacts,
}: {
  briefing: ProviderFieldExecutionBriefing;
  onCapture: (sectionId: ProviderIntelligenceSectionId, dbKey?: string) => void;
  onManageContacts: () => void;
}) {
  return (
    <section className="provider-field-exec-block">
      <div className="provider-field-exec-block-head">
        <span className="provider-field-exec-block-step">4</span>
        <h2 className="provider-field-exec-block-title">Key contacts</h2>
      </div>
      <div className="provider-field-exec-block-body">
        {briefing.contacts.length === 0 ? (
          <p className="provider-field-exec-confirm-empty">No contacts on file — map OR coordinator first.</p>
        ) : (
          <ul className="provider-field-exec-contact-list">
            {briefing.contacts.map((c) => (
              <ContactRow key={c.id} contact={c} onTap={onCapture} />
            ))}
          </ul>
        )}
        <button type="button" className="provider-field-exec-contacts-manage" onClick={onManageContacts}>
          Manage support network
        </button>
      </div>
    </section>
  );
}

function ActionsBlock({
  actions,
  onCapture,
  onManageContacts,
}: {
  actions: FieldExecutionAction[];
  onCapture: (sectionId: ProviderIntelligenceSectionId, dbKey?: string) => void;
  onManageContacts: () => void;
}) {
  const visible = actions.filter((a) => a.kind !== "contacts" || actions.length <= 3);
  if (visible.length === 0) return null;

  return (
    <section className="provider-field-exec-block">
      <div className="provider-field-exec-block-head">
        <span className="provider-field-exec-block-step">5</span>
        <h2 className="provider-field-exec-block-title">Immediate field actions</h2>
      </div>
      <div className="provider-field-exec-actions">
        {visible.map((action) => (
          <FieldExecutionActionButton
            key={action.id}
            action={action}
            onCapture={onCapture}
            onManageContacts={onManageContacts}
          />
        ))}
      </div>
    </section>
  );
}
