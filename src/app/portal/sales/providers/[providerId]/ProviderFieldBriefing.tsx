"use client";

import Link from "next/link";
import React from "react";
import {
  buildProviderFieldBriefing,
  PROVIDER_FIELD_BRIEFING_SECTION,
  PROVIDER_FIELD_BRIEFING_TITLE,
} from "@/lib/surgical-sales/buildProviderFieldBriefing";
import { fieldBriefingLogResponseHref } from "@/lib/surgical-sales/buildProviderFieldBriefingAsks";
import type { FieldBriefingActiveTouch } from "@/lib/surgical-sales/providerFieldBriefingTouch";
import type { ProviderProfilePayload } from "./providerProfileTypes";
import { ProviderFieldBriefingSetup } from "./ProviderFieldBriefingSetup";

function copyText(text: string): Promise<void> {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text);
  }
  return Promise.reject(new Error("clipboard unavailable"));
}

function ProviderFieldBriefingSheet({
  data,
  providerId,
  displayName,
  intelligenceHref,
  activeTouch,
  onLogFieldUpdate,
}: {
  data: ProviderProfilePayload;
  providerId: string;
  displayName: string;
  intelligenceHref: string;
  activeTouch: FieldBriefingActiveTouch;
  onLogFieldUpdate: () => void;
}) {
  const contact = data.provider ?? {};
  const newEngagementHref = `/portal/sales/engagements/new?provider_id=${encodeURIComponent(providerId)}`;

  const [aiBriefingSummary, setAiBriefingSummary] = React.useState<string | null>(null);

  const briefing = React.useMemo(
    () =>
      buildProviderFieldBriefing({
        contact,
        planning: data.planning_completion,
        relationshipStage: String(contact.provider_relationship_stage ?? ""),
        specialty: data.specialty,
        providerName: displayName,
        facilityName: data.primary_organization?.name ?? null,
        engagements: data.engagements,
        opportunities: data.opportunities,
        cases: data.cases,
        prepareEngagementHref: activeTouch.prepareHref,
        intelligenceHref,
        newEngagementHref,
        providerId,
        activeTouch,
      }),
    [contact, data, displayName, activeTouch, intelligenceHref, newEngagementHref, providerId],
  );

  React.useEffect(() => {
    setAiBriefingSummary(null);
    const controller = new AbortController();
    void fetch("/api/portal/sales/intelligence/field-briefing/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        providerName: displayName,
        facilityName: data.primary_organization?.name ?? null,
        touchType: activeTouch.engagementType,
        relationshipStage: String(contact.provider_relationship_stage ?? ""),
        existingAsks: briefing.priorityAsks.map((a) => a.text),
        openGaps: briefing.criticalUnknowns.map((c) => c.label),
        knownFields: [],
      }),
    })
      .then((r) => r.json())
      .then((j: { ok?: boolean; enhancement?: { summary?: string } }) => {
        if (j.ok && j.enhancement?.summary) setAiBriefingSummary(j.enhancement.summary);
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [
    providerId,
    activeTouch.engagementId,
    activeTouch.engagementType,
    displayName,
    data.primary_organization?.name,
    contact.provider_relationship_stage,
    briefing.priorityAsks.length,
    briefing.criticalUnknowns.length,
  ]);

  const [copiedAskIndex, setCopiedAskIndex] = React.useState<number | null>(null);
  const [doneIndexes, setDoneIndexes] = React.useState<Set<number>>(() => new Set());

  React.useEffect(() => {
    if (copiedAskIndex === null) return;
    const t = window.setTimeout(() => setCopiedAskIndex(null), 1400);
    return () => window.clearTimeout(t);
  }, [copiedAskIndex]);

  const copyAllAsks = () => {
    const text = briefing.priorityAsks.map((q, i) => `${i + 1}. ${q.text}`).join("\n");
    void copyText(text).then(() => setCopiedAskIndex(-1), () => setCopiedAskIndex(null));
  };

  const touch = briefing.touch;
  const { meetingObjective: mo, footer } = briefing;
  const facilityLabel = mo.facilityName ?? touch.organizationName;

  return (
    <article className="pfb" aria-label={PROVIDER_FIELD_BRIEFING_TITLE}>
      <div className={`pfb-touch${touch.isDraft ? " pfb-touch--draft" : ""}`}>
        <p className="pfb-touch-kicker">{touch.isDraft ? "Draft prep" : "This touch"}</p>
        <p className="pfb-touch-main">
          <strong>{touch.touchLabel}</strong>
          {touch.whenLabel ? (
            <>
              <span className="pfb-touch-sep" aria-hidden>
                {" "}
                ·{" "}
              </span>
              <span className="pfb-touch-when">{touch.whenLabel}</span>
            </>
          ) : null}
        </p>
        {touch.engagementTitle ? <p className="pfb-touch-sub">{touch.engagementTitle}</p> : null}
        <p className="pfb-touch-links">
          {touch.isDraft ? (
            <Link href={touch.createEngagementHref}>Create engagement</Link>
          ) : touch.prepareHref ? (
            <Link href={touch.prepareHref}>Open Field Briefing</Link>
          ) : null}
        </p>
      </div>

      {aiBriefingSummary ? (
        <p className="pfb-ai-summary">{aiBriefingSummary}</p>
      ) : null}

      <header className="pfb-head">
        <div className="pfb-head-top">
          <div className="pfb-head-id">
            <p className="pfb-head-name">{mo.providerName}</p>
            {facilityLabel ? <p className="pfb-head-fac">{facilityLabel}</p> : null}
          </div>
          <span className="pfb-head-stage">{briefing.relationshipStageLabel}</span>
        </div>
      </header>

      <section className="pfb-sec pfb-sec--objective" aria-labelledby="pfb-obj">
        <h2 id="pfb-obj" className="pfb-sec-title">
          {PROVIDER_FIELD_BRIEFING_SECTION.objective}
        </h2>
        <p className="pfb-mission">{mo.objective}</p>
        {mo.touchContext ? <p className="pfb-ctx">{mo.touchContext}</p> : null}
      </section>

      {briefing.priorityAsks.length > 0 ? (
        <section className="pfb-sec" aria-labelledby="pfb-q">
          <div className="pfb-sec-hd">
            <h2 id="pfb-q" className="pfb-sec-title">
              {PROVIDER_FIELD_BRIEFING_SECTION.askThese}
            </h2>
            <button type="button" className="pfb-sec-util" onClick={copyAllAsks}>
              {copiedAskIndex === -1 ? "Copied" : "Copy all"}
            </button>
          </div>
          <ol className="pfb-asks">
            {briefing.priorityAsks.map((ask, index) => {
              const copied = copiedAskIndex === index;
              const done = doneIndexes.has(index);
              const n = index + 1;
              const logHref = fieldBriefingLogResponseHref(intelligenceHref, ask.id);
              return (
                <li key={ask.id} className={`pfb-ask${done ? " pfb-ask--done" : ""}`}>
                  <p className="pfb-ask-line">
                    <span className="pfb-ask-n" aria-hidden>
                      {n}
                    </span>
                    <span className="pfb-ask-q">{ask.text}</span>
                  </p>
                  <div className="pfb-ask-meta">
                    <button
                      type="button"
                      className="pfb-ask-act"
                      onClick={() => {
                        void copyText(ask.text).then(
                          () => setCopiedAskIndex(index),
                          () => setCopiedAskIndex(null),
                        );
                      }}
                    >
                      {copied ? "Copied" : "Copy"}
                    </button>
                    <span className="pfb-ask-sep" aria-hidden>
                      ·
                    </span>
                    <button
                      type="button"
                      className={`pfb-ask-act${done ? " pfb-ask-act--on" : ""}`}
                      onClick={() =>
                        setDoneIndexes((prev) => {
                          const next = new Set(prev);
                          if (next.has(index)) next.delete(index);
                          else next.add(index);
                          return next;
                        })
                      }
                      aria-pressed={done}
                    >
                      {done ? "Asked" : "Mark asked"}
                    </button>
                    <span className="pfb-ask-sep" aria-hidden>
                      ·
                    </span>
                    <Link href={logHref} className="pfb-ask-act pfb-ask-act--link">
                      Log response
                    </Link>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      ) : null}

      {briefing.criticalUnknowns.length > 0 ? (
        <section className="pfb-sec" aria-labelledby="pfb-learn">
          <h2 id="pfb-learn" className="pfb-sec-title">
            {PROVIDER_FIELD_BRIEFING_SECTION.useThisTouchToLearn}
          </h2>
          <ul className="pfb-tags">
            {briefing.criticalUnknowns.map((chip) => (
              <li key={chip.id} className="pfb-tag">
                {chip.label}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {briefing.tacticalWarnings.length > 0 ? (
        <section className="pfb-sec pfb-sec--warn" aria-labelledby="pfb-w">
          <h2 id="pfb-w" className="pfb-sec-title">
            {PROVIDER_FIELD_BRIEFING_SECTION.avoid}
          </h2>
          <ul className="pfb-lines">
            {briefing.tacticalWarnings.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {briefing.successCriteria.length > 0 ? (
        <section className="pfb-sec pfb-sec--ok" aria-labelledby="pfb-s">
          <h2 id="pfb-s" className="pfb-sec-title">
            {PROVIDER_FIELD_BRIEFING_SECTION.goodTouchGetsYou}
          </h2>
          <ul className="pfb-lines pfb-lines--ok">
            {briefing.successCriteria.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="pfb-sec pfb-sec--after" aria-labelledby="pfb-after">
        <h2 id="pfb-after" className="pfb-sec-title">
          {PROVIDER_FIELD_BRIEFING_SECTION.afterTouch}
        </h2>
        <p className="pfb-after-hint">{PROVIDER_FIELD_BRIEFING_SECTION.afterTouchHint}</p>
      </section>

      <footer className="pfb-foot" aria-label="Field actions">
        {footer.logFieldUpdateHref ? (
          <Link href={footer.logFieldUpdateHref} className="pfb-foot-primary">
            Create engagement
          </Link>
        ) : (
          <button type="button" className="pfb-foot-primary" onClick={onLogFieldUpdate}>
            {PROVIDER_FIELD_BRIEFING_SECTION.logFieldUpdate}
          </button>
        )}
        <div className="pfb-foot-secondary">
          <Link href={footer.intelligenceHref} className="pfb-foot-ghost">
            Open intelligence
          </Link>
          <Link href={footer.scheduleNextStepHref} className="pfb-foot-ghost">
            {touch.isDraft ? "Schedule touch" : "Schedule next step"}
          </Link>
        </div>
      </footer>
    </article>
  );
}

export function ProviderFieldBriefing({
  data,
  providerId,
  displayName,
  intelligenceHref,
  activeTouch,
  organizationId,
  onLogFieldUpdate,
}: {
  data: ProviderProfilePayload;
  providerId: string;
  displayName: string;
  intelligenceHref: string;
  activeTouch: FieldBriefingActiveTouch | null;
  organizationId?: string | null;
  onLogFieldUpdate: () => void;
}) {
  const newEngagementHref = `/portal/sales/engagements/new?provider_id=${encodeURIComponent(providerId)}`;

  if (!activeTouch) {
    return (
      <ProviderFieldBriefingSetup
        providerId={providerId}
        organizationId={organizationId}
        newEngagementHref={newEngagementHref}
      />
    );
  }

  return (
    <ProviderFieldBriefingSheet
      data={data}
      providerId={providerId}
      displayName={displayName}
      intelligenceHref={intelligenceHref}
      activeTouch={activeTouch}
      onLogFieldUpdate={onLogFieldUpdate}
    />
  );
}
