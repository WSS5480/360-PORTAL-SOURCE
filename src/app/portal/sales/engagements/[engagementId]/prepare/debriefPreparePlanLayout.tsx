"use client";

import React from "react";

export function DebriefPreparePlanGroup({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="dpb-plan-group" aria-label={label}>
      <header className="dpb-plan-group__head">
        <h2 className="dpb-plan-group__label">{label}</h2>
        {hint ? <p className="dpb-plan-group__hint">{hint}</p> : null}
      </header>
      <div className="dpb-plan-group__sections">{children}</div>
    </section>
  );
}

export function DebriefPreparePlanSection({
  title,
  children,
  hint,
  actions,
  collapsible = false,
  defaultCollapsed = false,
  tone = "default",
}: {
  title: string;
  hint?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  tone?: "default" | "emphasis" | "optional";
}) {
  const testId = `plan-section-${title.toLowerCase().replace(/\s+/g, "-")}`;

  if (collapsible) {
    return (
      <details
        className={`dpb-plan dpb-plan--collapsible dpb-plan--${tone}`}
        data-testid={testId}
        open={!defaultCollapsed}
      >
        <summary className="dpb-plan__summary">
          <div className="dpb-plan__summary-text">
            <span className="dpb-plan__title">{title}</span>
            {hint ? <span className="dpb-plan__hint dpb-plan__hint--inline">{hint}</span> : null}
          </div>
          <span className="dpb-plan__summary-chevron" aria-hidden />
        </summary>
        <div className="dpb-plan__body">{children}</div>
      </details>
    );
  }

  return (
    <section
      className={`dpb-plan dpb-plan--${tone}`}
      data-testid={testId}
    >
      <div className="dpb-plan__head">
        <div className="dpb-plan__head-row">
          <h3 className="dpb-plan__title">{title}</h3>
          {actions ? <div className="dpb-plan__head-actions">{actions}</div> : null}
        </div>
        {hint ? <p className="dpb-plan__hint">{hint}</p> : null}
      </div>
      {children}
    </section>
  );
}
