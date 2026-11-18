"use client";

import Link from "next/link";
import React from "react";

import { providerIntelligenceUiCss } from "./providerIntelligenceUiCss";

export { providerIntelligenceUiCss };

export type StatusChipVariant = "warning" | "info" | "success" | "neutral" | "progress";

export type ScopeKind = "Facility" | "Provider" | "Engagement";

export type InsightScope = "facility" | "provider";

export function statusLabelToVariant(statusLabel: string): StatusChipVariant {
  const s = statusLabel.toLowerCase();
  if (s.includes("confirmed")) return "success";
  if (s.includes("not relevant") || s.includes("not observed")) return "neutral";
  if (s.includes("still learning") || s.includes("in progress")) return "progress";
  if (s.includes("needs validation")) return "warning";
  return "info";
}

export function ProviderIntelligenceStyles() {
  return <style>{providerIntelligenceUiCss}</style>;
}

export function PageSection({
  children,
  className = "",
  spaced = true,
}: {
  children: React.ReactNode;
  className?: string;
  spaced?: boolean;
}) {
  return (
    <section
      className={`pi-page-section${spaced ? " pi-page-section--spaced" : ""} ${className}`.trim()}
    >
      {children}
    </section>
  );
}

export function SurfaceCard({
  children,
  className = "",
  variant = "default",
}: {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "flush" | "hero";
}) {
  return (
    <div className={`pi-surface pi-surface--${variant} ${className}`.trim()}>{children}</div>
  );
}

export function SurfaceBody({
  children,
  className = "",
  compact = false,
}: {
  children: React.ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={`pi-surface-body${compact ? " pi-surface-body--compact" : ""} ${className}`.trim()}
    >
      {children}
    </div>
  );
}

export function SectionHeader({
  title,
  titleId,
  subtitle,
  action,
  className = "",
}: {
  title: string;
  titleId?: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={`pi-section-header ${className}`.trim()}>
      <div className="pi-section-header-row">
        <div>
          {titleId ? (
            <h2 id={titleId} className="pi-section-header-title">
              {title}
            </h2>
          ) : (
            <h2 className="pi-section-header-title">{title}</h2>
          )}
          {subtitle ? <p className="pi-section-header-subtitle">{subtitle}</p> : null}
        </div>
        {action}
      </div>
    </header>
  );
}

export function StatusChip({
  label,
  variant,
}: {
  label: string;
  variant?: StatusChipVariant;
}) {
  const tone = variant ?? statusLabelToVariant(label);
  const mod =
    tone === "warning"
      ? "warning"
      : tone === "success"
        ? "success"
        : tone === "neutral"
          ? "neutral"
          : "info";
  return (
    <span className={`pi-chip pi-chip--${mod}`}>
      <span className="pi-chip-dot" aria-hidden />
      {label}
    </span>
  );
}

export function ScopeBadge({ scope }: { scope: ScopeKind }) {
  const tone =
    scope === "Facility" ? "facility" : scope === "Provider" ? "provider" : "engagement";
  return <span className={`pi-scope pi-scope--${tone}`}>{scope}</span>;
}

export function InsightList({
  items,
  scope,
  emptyMessage,
}: {
  items: { id: string; text: string }[];
  scope?: InsightScope;
  emptyMessage?: string;
}) {
  if (items.length === 0) {
    return emptyMessage ? <p className="pi-empty">{emptyMessage}</p> : null;
  }

  return (
    <ul className="pi-insight-list">
      {items.map((item) => (
        <li key={item.id} className="pi-insight-item">
          {scope ? (
            <span className={`pi-insight-accent pi-insight-accent--${scope}`} aria-hidden />
          ) : null}
          <div className="pi-insight-body">
            {scope ? (
              <span className={`pi-insight-label pi-insight-label--${scope}`}>
                {scope === "facility" ? "Facility" : "Provider"}
              </span>
            ) : null}
            <span className="pi-insight-text">{item.text}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function CTAGroup({
  children,
  className = "",
  align = "start",
  stretch = false,
}: {
  children: React.ReactNode;
  className?: string;
  align?: "start" | "end";
  stretch?: boolean;
}) {
  return (
    <div
      className={`pi-cta-group${align === "end" ? " pi-cta-group--end" : ""}${stretch ? " pi-cta-group--stretch" : ""} ${className}`.trim()}
    >
      {children}
    </div>
  );
}

type PiButtonProps = {
  children: React.ReactNode;
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
};

export function PiButtonPrimary({ children, disabled, onClick, className = "" }: PiButtonProps) {
  return (
    <button
      type="button"
      className={`pi-btn pi-btn--primary ${className}`.trim()}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export function PiButtonSecondary({ children, disabled, onClick, className = "" }: PiButtonProps) {
  return (
    <button
      type="button"
      className={`pi-btn pi-btn--secondary ${className}`.trim()}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export function PiButtonGhost({
  children,
  disabled,
  onClick,
  className = "",
  info = false,
  small = false,
}: PiButtonProps & { info?: boolean; small?: boolean }) {
  return (
    <button
      type="button"
      className={`pi-btn pi-btn--ghost${info ? " pi-btn--info" : ""}${small ? " pi-btn--sm" : ""} ${className}`.trim()}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export function PiLinkPrimary({
  href,
  children,
  className = "",
  small = false,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
  small?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`pi-btn pi-btn--primary${small ? " pi-btn--sm" : ""} ${className}`.trim()}
    >
      {children}
    </Link>
  );
}

export function IntelligenceTaskCard({
  title,
  hint,
  scopeLabel,
  statusLabel,
  disabled,
  selected = false,
  onOpen,
  onUpdate,
  onAskNextTouch,
  onMarkNotRelevant,
}: {
  title: string;
  hint: string;
  scopeLabel: ScopeKind;
  statusLabel: string;
  disabled?: boolean;
  selected?: boolean;
  onOpen?: () => void;
  onUpdate: () => void;
  onAskNextTouch: () => void;
  onMarkNotRelevant: () => void;
}) {
  return (
    <article className={`pi-task-card${selected ? " pi-task-card--selected" : ""}`}>
      <button
        type="button"
        className="pi-task-card-main"
        disabled={disabled || !onOpen}
        onClick={onOpen}
      >
        <h3 className="pi-task-card-title">{title}</h3>
        <div className="pi-task-card-meta">
          <ScopeBadge scope={scopeLabel} />
          <StatusChip label={statusLabel} />
        </div>
        <p className="pi-task-card-hint">{hint}</p>
      </button>
      <div className="pi-task-card-actions" role="group" aria-label={`Actions for ${title}`}>
        <PiButtonGhost small disabled={disabled} onClick={onUpdate}>
          Update
        </PiButtonGhost>
        <PiButtonGhost small info disabled={disabled} onClick={onAskNextTouch}>
          Ask next touch
        </PiButtonGhost>
        <PiButtonGhost small disabled={disabled} onClick={onMarkNotRelevant}>
          Mark not relevant
        </PiButtonGhost>
      </div>
    </article>
  );
}

export function NextMoveRow({
  step,
  title,
  purpose = "Why this matters",
  description,
  action,
}: {
  step: number;
  title: string;
  purpose?: string;
  description: string;
  action: React.ReactNode;
}) {
  return (
    <li className="pi-next-move">
      <div className="pi-next-move-step-wrap" aria-hidden>
        <span className="pi-next-move-step-label">Step</span>
        <span className="pi-next-move-step">{step}</span>
      </div>
      <div className="pi-next-move-body">
        <h3 className="pi-next-move-title">{title}</h3>
        {purpose ? <p className="pi-next-move-purpose">{purpose}</p> : null}
        <p className="pi-next-move-desc">{description}</p>
      </div>
      <div className="pi-next-move-cta">{action}</div>
    </li>
  );
}

/** Facility / provider context block — SurfaceCard + header + InsightList */
export function ContextInsightSurface({
  title,
  subtitle,
  scope,
  lines,
  emptyMessage,
}: {
  title: string;
  subtitle: string;
  scope: Extract<ScopeKind, "Facility" | "Provider">;
  lines: { id: string; text: string }[];
  emptyMessage: string;
}) {
  const tone = scope === "Facility" ? "facility" : "provider";
  const mark = tone === "facility" ? "◇" : "◆";

  return (
    <SurfaceCard className={`pi-context-surface pi-context-surface--${tone}`}>
      <header className={`pi-context-surface-head pi-context-surface-head--${tone}`}>
        <span className={`pi-context-surface-mark pi-context-surface-mark--${tone}`} aria-hidden>
          {mark}
        </span>
        <div className="pi-context-surface-titles">
          <h2 className="pi-context-surface-title">{title}</h2>
          <p className="pi-context-surface-subtitle">{subtitle}</p>
        </div>
        <ScopeBadge scope={scope} />
      </header>
      <InsightList
        items={lines}
        scope={tone}
        emptyMessage={emptyMessage}
      />
    </SurfaceCard>
  );
}
