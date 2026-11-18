"use client";

import Link from "next/link";
import type { ProviderOverviewFieldCommandModel } from "@/lib/surgical-sales/buildProviderOverviewBody";
import { PROVIDER_FIELD_OPS_SECTION } from "@/lib/surgical-sales/providerFieldOperationsUiLabels";
import {
  PROVIDER_OVERVIEW_STATE_CLASS,
  btnClasses,
  stateClasses,
  validationStateFromLabel,
} from "./providerOverviewStateTokens";

function SignalRow({ label, pills }: { label: string; pills: string[] }) {
  const state = validationStateFromLabel(label);
  return (
    <div className={`pov-fc-signal-row pov-fc-signal-row--${state}`}>
      <span className={`pov-fc-signal-label ${stateClasses(state, "label")}`}>{label}:</span>
      <span className="pov-fc-signal-items">
        {pills.map((pill, index) => (
          <span key={pill} className="pov-fc-signal-item-wrap">
            {index > 0 ? (
              <span className="pov-fc-signal-sep" aria-hidden>
                {" "}
                ·{" "}
              </span>
            ) : null}
            <span className={`pov-fc-signal-item pov-fc-signal-item--${state}`}>{pill}</span>
          </span>
        ))}
      </span>
    </div>
  );
}

export function ProviderOverviewFieldCommandCard({
  model,
  onLogFieldUpdate,
}: {
  model: ProviderOverviewFieldCommandModel;
  onLogFieldUpdate?: () => void;
}) {
  return (
    <section
      className="pov-body-card pov-fc pov-fc--command-module"
      aria-label={PROVIDER_FIELD_OPS_SECTION.fieldCommand}
    >
      <div className="pov-fc-inner">
        <div className="pov-fc-head">
          <span className={`${PROVIDER_OVERVIEW_STATE_CLASS.status} ${PROVIDER_OVERVIEW_STATE_CLASS.badge}`}>
            {model.stage}
          </span>
          <p className="pov-fc-confidence">
            <span>{PROVIDER_FIELD_OPS_SECTION.fieldConfidence}: </span>
            <span className="pov-fc-confidence-value">{model.fieldConfidence}</span>
          </p>
        </div>

        <div className="pov-fc-command">
          <p className="pov-fc-eyebrow">{model.eyebrow}</p>
          <h2 className="pov-fc-title">{model.heading}</h2>
          <p className="pov-fc-subtext">{model.subtext}</p>
        </div>

        {model.validationGroups.length > 0 ? (
          <div className="pov-fc-signals">
            {model.validationGroups.map((group) => (
              <SignalRow key={group.label} label={group.label} pills={group.pills} />
            ))}
          </div>
        ) : null}

        <div className="pov-fc-actions">
          <Link href={model.primaryCta.href} className={`${btnClasses("primary")} pov-fc-btn-primary`}>
            {model.primaryCta.label}
          </Link>
          {model.secondaryCta && onLogFieldUpdate ? (
            <button
              type="button"
              className={`${btnClasses("secondary")} pov-fc-btn-secondary`}
              onClick={onLogFieldUpdate}
            >
              {model.secondaryCta.label}
            </button>
          ) : null}
        </div>
      </div>

      <div className="pov-fc-mobile-sticky">
        <Link href={model.primaryCta.href} className={`${btnClasses("primary")} pov-fc-btn-primary`}>
          {model.primaryCta.label}
        </Link>
      </div>
    </section>
  );
}
