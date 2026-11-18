"use client";

import React from "react";
import {
  FIELD_INTELLIGENCE_PROCESSING_MESSAGE_MS,
  FIELD_INTELLIGENCE_PROCESSING_ROTATING_MESSAGES,
  FIELD_INTELLIGENCE_PROCESSING_STEP_MS,
  FIELD_INTELLIGENCE_PROCESSING_STEPS,
  FIELD_INTELLIGENCE_PROCESSING_SUBTITLE,
  FIELD_INTELLIGENCE_PROCESSING_TITLE,
  fieldIntelligenceProcessingStepState,
  formatFieldIntelligenceProcessingContext,
} from "@/lib/surgical-sales/fieldIntelligenceProcessingUx";
import { fieldIntelligenceProcessingCss } from "./fieldIntelligenceProcessingCss";

function useFieldIntelligenceProcessingAnimation(active: boolean) {
  const [messageIndex, setMessageIndex] = React.useState(0);
  const [activeStepIndex, setActiveStepIndex] = React.useState(0);

  React.useEffect(() => {
    if (!active) {
      setMessageIndex(0);
      setActiveStepIndex(0);
      return;
    }
    const msgId = window.setInterval(() => {
      setMessageIndex((i) => (i + 1) % FIELD_INTELLIGENCE_PROCESSING_ROTATING_MESSAGES.length);
    }, FIELD_INTELLIGENCE_PROCESSING_MESSAGE_MS);
    const stepId = window.setInterval(() => {
      setActiveStepIndex((i) => Math.min(i + 1, FIELD_INTELLIGENCE_PROCESSING_STEPS.length - 1));
    }, FIELD_INTELLIGENCE_PROCESSING_STEP_MS);
    return () => {
      window.clearInterval(msgId);
      window.clearInterval(stepId);
    };
  }, [active]);

  return { messageIndex, activeStepIndex };
}

export function FieldIntelligenceProcessingPanel({
  active,
  contextLine,
  providerLabel,
  organizationLabel,
  engagementTypeLabel,
  showTitle = true,
  embedded = false,
  className = "",
}: {
  active: boolean;
  /** Overrides built-in context formatting when set. */
  contextLine?: string | null;
  providerLabel?: string | null;
  organizationLabel?: string | null;
  engagementTypeLabel?: string | null;
  showTitle?: boolean;
  /** Tighter padding when nested inside an existing sheet body. */
  embedded?: boolean;
  className?: string;
}) {
  const { messageIndex, activeStepIndex } = useFieldIntelligenceProcessingAnimation(active);

  const resolvedContext =
    contextLine?.trim() ||
    formatFieldIntelligenceProcessingContext({
      providerLabel,
      organizationLabel,
      engagementTypeLabel,
    });

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: fieldIntelligenceProcessingCss }} />
      <div
        className={`fip${embedded ? " fip--embedded" : ""}${className ? ` ${className}` : ""}`}
        role="status"
        aria-live="polite"
        aria-busy={active}
      >
        <div className="fip-head">
          <span className="fip-spinner" aria-hidden />
          <div className="fip-copy">
            {showTitle ? <p className="fip-title">{FIELD_INTELLIGENCE_PROCESSING_TITLE}</p> : null}
            <p className="fip-subtitle">{FIELD_INTELLIGENCE_PROCESSING_SUBTITLE}</p>
            <p className="fip-rotating" key={messageIndex}>
              {FIELD_INTELLIGENCE_PROCESSING_ROTATING_MESSAGES[messageIndex]}
            </p>
          </div>
        </div>

        <p className="fip-context">{resolvedContext}</p>

        <ol className="fip-steps" aria-label="Analysis progress">
          {FIELD_INTELLIGENCE_PROCESSING_STEPS.map((label, index) => {
            const state = fieldIntelligenceProcessingStepState(index, activeStepIndex);
            return (
              <li
                key={label}
                className={`fip-step${state === "active" ? " fip-step--active" : ""}${state === "done" ? " fip-step--done" : ""}`}
              >
                <span
                  className={`fip-step-marker fip-step-marker--${state}`}
                  aria-hidden
                >
                  {state === "done" ? "✓" : null}
                </span>
                {label}
              </li>
            );
          })}
        </ol>
      </div>
    </>
  );
}
