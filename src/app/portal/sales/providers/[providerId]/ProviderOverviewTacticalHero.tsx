"use client";

import type { ProviderOverviewTacticalHeroModel } from "@/lib/surgical-sales/buildProviderOverviewBody";

function riskTone(value: string): "high" | "moderate" | "low" {
  const v = value.toLowerCase();
  if (v.includes("high") || v.includes("elevated")) return "high";
  if (v.includes("low")) return "low";
  return "moderate";
}

function confidenceTone(value: string): "early" | "partial" | "strong" {
  const v = value.toLowerCase();
  if (v.includes("early") || v.includes("limited")) return "early";
  if (v.includes("strong") || v.includes("high")) return "strong";
  return "partial";
}

export function ProviderOverviewTacticalHero({
  model,
  primaryGap,
  nextMove,
}: {
  model: ProviderOverviewTacticalHeroModel;
  primaryGap?: string | null;
  nextMove?: string;
}) {
  const risk = model.metrics.find((m) => m.id === "risk");
  const confidence = model.metrics.find((m) => m.id === "confidence");
  const readiness = model.metrics.find((m) => m.id === "readiness");
  const nextMoveLine = nextMove
    ? /^next move:/i.test(nextMove)
      ? nextMove
      : `Next move: ${nextMove}`
    : model.nextMove
      ? /^next move:/i.test(model.nextMove)
        ? model.nextMove
        : `Next move: ${model.nextMove}`
      : null;

  const showBlocker = Boolean(primaryGap || nextMoveLine);

  return (
    <>
    <section
      className="pov-main-section pov-main-section--mission pov-mission-briefing"
      aria-label="Current pathway status"
      data-testid="pov-mission"
    >
      <header className="pov-mission">
        <p className="pov-section-kicker">Mission</p>
        <h1 className="pov-mission__headline">{model.stageLabel}</h1>
        {model.tacticalSummary ? (
          <p className="pov-mission__support">{model.tacticalSummary}</p>
        ) : null}
      </header>

      <div className="pov-metric-bar" aria-label="Tactical metrics" data-testid="pov-metric-bar">
        {risk ? (
          <div className="pov-metric-bar__segment">
            <span className="pov-metric-bar__label">Visibility</span>
            <span className={`pov-metric-bar__value pov-metric-bar__value--${riskTone(risk.value)}`}>
              {risk.value}
            </span>
          </div>
        ) : null}
        {confidence ? (
          <div className="pov-metric-bar__segment">
            <span className="pov-metric-bar__label">Access confidence</span>
            <span
              className={`pov-metric-bar__value pov-metric-bar__value--confidence-${confidenceTone(confidence.value)}`}
            >
              {confidence.value}
            </span>
          </div>
        ) : null}
        {readiness ? (
          <div className="pov-metric-bar__segment">
            <span className="pov-metric-bar__label">Observation readiness</span>
            <span className="pov-metric-bar__value">{readiness.value}</span>
          </div>
        ) : null}
      </div>
    </section>

    {showBlocker ? (
      <section
        className="pov-main-section pov-main-section--blocker pov-blocker-band"
        aria-label="Current focus"
        data-testid="pov-blocker-band"
      >
        <p className="pov-section-kicker">Current focus</p>
        <div className="pov-blocker-band__body">
          {primaryGap ? (
            <p className="pov-blocker-band__gap" data-testid="pov-primary-gap">
              {primaryGap}
            </p>
          ) : null}
          {nextMoveLine ? (
            <p className="pov-blocker-band__move" data-testid="pov-next-move">
              {nextMoveLine}
            </p>
          ) : null}
        </div>
      </section>
    ) : null}
    </>
  );
}
