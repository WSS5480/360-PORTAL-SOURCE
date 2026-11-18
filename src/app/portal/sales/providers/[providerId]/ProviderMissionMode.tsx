"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React from "react";
import {
  buildProviderMissionMode,
  fieldBriefingLogResponseHref,
  PROVIDER_MISSION_MODE_SECTION,
  PROVIDER_MISSION_MODE_TITLE,
} from "@/lib/surgical-sales/buildProviderMissionMode";
import type { FieldBriefingActiveTouch } from "@/lib/surgical-sales/providerFieldBriefingTouch";
import {
  FIELD_BRIEFING_EMPTY_BODY,
  FIELD_BRIEFING_EMPTY_TITLE,
  FIELD_BRIEFING_TOUCH_OPTIONS,
  providerFieldBriefingTabHref,
} from "@/lib/surgical-sales/providerFieldBriefingTouch";
import type { ProviderProfilePayload } from "./providerProfileTypes";
import { isProviderSalesCustomer } from "@/lib/surgical-sales/providerRelationshipStage";

function MissionModeTouchPicker({
  providerId,
  onSelectTouch,
}: {
  providerId: string;
  onSelectTouch: (touchId: (typeof FIELD_BRIEFING_TOUCH_OPTIONS)[number]["id"]) => void;
}) {
  return (
    <div className="pmm-setup" aria-label="Configure mission touch">
      <p className="pmm-setup-title">{FIELD_BRIEFING_EMPTY_TITLE}</p>
      <p className="pmm-setup-body">{FIELD_BRIEFING_EMPTY_BODY}</p>
      <ul className="pmm-setup-touches">
        {FIELD_BRIEFING_TOUCH_OPTIONS.map((option) => (
          <li key={option.id}>
            <button type="button" className="pmm-setup-touch" onClick={() => onSelectTouch(option.id)}>
              <span className="pmm-setup-touch-label">{option.label}</span>
              <span className="pmm-setup-touch-desc">{option.description}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ProviderMissionMode({
  data,
  providerId,
  intelligenceHref,
  newEngagementHref,
  activeTouch,
  onLogFieldUpdate,
  onStartDictation,
  showTouchPicker,
}: {
  data: ProviderProfilePayload;
  providerId: string;
  intelligenceHref: string;
  newEngagementHref: string;
  activeTouch: FieldBriefingActiveTouch | null;
  onLogFieldUpdate: () => void;
  onStartDictation: () => void;
  /** When true and no touch, show touch-type picker above mission content. */
  showTouchPicker?: boolean;
}) {
  const router = useRouter();
  const contact = data.provider ?? {};

  const mission = React.useMemo(
    () =>
      buildProviderMissionMode({
        contact,
        planning: data.planning_completion,
        relationshipStage: String(contact.provider_relationship_stage ?? ""),
        engagements: data.engagements,
        opportunities: data.opportunities,
        cases: data.cases,
        intelligenceHref,
        newEngagementHref,
        providerId,
        activeTouch,
      }),
    [contact, data, intelligenceHref, newEngagementHref, providerId, activeTouch],
  );

  const handleQuickAction = (kind: string) => {
    if (kind === "dictation") onStartDictation();
    if (kind === "log_update") onLogFieldUpdate();
  };

  return (
    <article className="pmm" aria-label={PROVIDER_MISSION_MODE_TITLE}>
      {showTouchPicker && !activeTouch ? (
        <MissionModeTouchPicker
          providerId={providerId}
          onSelectTouch={(touchId) => router.replace(providerFieldBriefingTabHref(providerId, { touch: touchId }))}
        />
      ) : null}

      <header className="pmm-hero">
        {activeTouch ? (
          <div className="pmm-touch">
            <p className="pmm-touch-kicker">Active touch</p>
            <p className="pmm-touch-main">
              <strong>{activeTouch.touchLabel}</strong>
              {activeTouch.whenLabel ? (
                <span className="pmm-touch-when"> · {activeTouch.whenLabel}</span>
              ) : null}
            </p>
          </div>
        ) : null}
        <span className="pmm-stage-pill">
          {isProviderSalesCustomer(contact) ? "Customer" : `${mission.pathwayStageLabel} pathway`}
        </span>
      </header>

      <section className="pmm-sec pmm-sec--objective" aria-labelledby="pmm-obj">
        <h2 id="pmm-obj" className="pmm-sec-title">
          {PROVIDER_MISSION_MODE_SECTION.todaysObjective}
        </h2>
        <p className="pmm-objective">{mission.todaysObjective}</p>
      </section>

      {mission.questions.length > 0 ? (
        <section className="pmm-sec" aria-labelledby="pmm-q">
          <h2 id="pmm-q" className="pmm-sec-title">
            {PROVIDER_MISSION_MODE_SECTION.questionsToAsk}
          </h2>
          <ol className="pmm-list">
            {mission.questions.map((ask, index) => (
              <li key={ask.id} className="pmm-q">
                <span className="pmm-q-n" aria-hidden>
                  {index + 1}
                </span>
                <p className="pmm-q-text">{ask.text}</p>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {mission.avoid.length > 0 ? (
        <section className="pmm-sec" aria-labelledby="pmm-avoid">
          <h2 id="pmm-avoid" className="pmm-sec-title">
            {PROVIDER_MISSION_MODE_SECTION.thingsToAvoid}
          </h2>
          <ul className="pmm-list pmm-avoid">
            {mission.avoid.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {mission.mustLearn.length > 0 ? (
        <section className="pmm-sec" aria-labelledby="pmm-learn">
          <h2 id="pmm-learn" className="pmm-sec-title">
            {PROVIDER_MISSION_MODE_SECTION.mustLearn}
          </h2>
          <ul className="pmm-list pmm-learn">
            {mission.mustLearn.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="pmm-sec" aria-labelledby="pmm-actions">
        <h2 id="pmm-actions" className="pmm-sec-title">
          {PROVIDER_MISSION_MODE_SECTION.quickActions}
        </h2>
        <div className="pmm-actions">
          {mission.quickActions.map((action) => {
            if (action.kind === "confirm_requirement" && mission.confirmRequirementHref) {
              return (
                <Link
                  key={action.id}
                  href={mission.confirmRequirementHref}
                  className="pmm-action pmm-action--confirm"
                >
                  {action.label}
                </Link>
              );
            }
            if (action.kind === "dictation" || action.kind === "log_update") {
              return (
                <button
                  key={action.id}
                  type="button"
                  className={`pmm-action${action.primary ? " pmm-action--primary" : ""}`}
                  onClick={() => handleQuickAction(action.kind)}
                >
                  {action.label}
                </button>
              );
            }
            return null;
          })}
        </div>
      </section>

      {mission.questions.length > 0 ? (
        <p className="pmm-log-hint">
          <Link href={fieldBriefingLogResponseHref(intelligenceHref, mission.questions[0]!.id)}>
            Log answer in intelligence
          </Link>
        </p>
      ) : null}
    </article>
  );
}
