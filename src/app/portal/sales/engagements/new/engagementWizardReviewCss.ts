export const engagementWizardReviewCss = `
.ew-review-root {
  --ew-review-teal: #0d9488;
  --ew-review-navy: #0f2744;
  --ew-review-muted: #64748b;
  --ew-review-border: color-mix(in srgb, var(--ew-review-navy) 5%, #eef2f6);
  --ew-review-read-max: 38rem;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
  max-width: 100%;
  padding-bottom: 4px;
}

.ew-review-hero {
  padding: 9px 11px;
  border-radius: 8px;
  background: linear-gradient(135deg, #f0fdfa 0%, #fff 62%);
  border: 1px solid color-mix(in srgb, var(--ew-review-teal) 14%, var(--ew-review-border));
  max-width: calc(var(--ew-review-read-max) + 2rem);
  transition: border-color 0.2s ease;
}

.ew-review-hero-kicker {
  margin: 0 0 2px;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: #0f766e;
}

.ew-review-hero-title {
  margin: 0;
  font-size: 17px;
  font-weight: 800;
  line-height: 1.15;
  letter-spacing: -0.02em;
  color: var(--ew-review-navy);
}

.ew-review-hero-sub {
  margin: 4px 0 0;
  font-size: 11px;
  line-height: 1.38;
  font-weight: 600;
  color: #475569;
  max-width: 42ch;
}

.ew-review-hero-meta {
  margin: 4px 0 0;
  font-size: 10px;
  line-height: 1.35;
  color: var(--ew-review-muted);
}

.ew-review-hero-meta-primary {
  font-weight: 800;
  color: var(--ew-review-navy);
}

.ew-review-readiness {
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 8px 10px;
  border-radius: 8px;
  background: #fff;
  border: 1px solid var(--ew-review-border);
  max-width: var(--ew-review-read-max);
  transition: box-shadow 0.2s ease;
}

.ew-review-readiness:hover {
  box-shadow: 0 2px 10px rgba(15, 39, 68, 0.04);
}

.ew-review-readiness-compact {
  min-width: 0;
}

.ew-review-readiness-detail {
  padding-top: 6px;
  margin-top: 2px;
  border-top: 1px solid color-mix(in srgb, var(--ew-review-border) 55%, transparent);
}

.ew-review-readiness-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 3px;
}

.ew-review-readiness-badge {
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  padding: 2px 7px;
  border-radius: 999px;
}

.ew-review-readiness-badge--ready {
  color: #065f46;
  background: #ecfdf5;
}

.ew-review-readiness-badge--developing {
  color: #92400e;
  background: #fffbeb;
}

.ew-review-readiness-pct {
  font-size: 11px;
  font-weight: 800;
  color: var(--ew-review-muted);
  font-variant-numeric: tabular-nums;
}

.ew-review-readiness-bar {
  height: 3px;
  border-radius: 999px;
  background: #e8edf3;
  overflow: hidden;
  margin-bottom: 4px;
  max-width: 12rem;
}

.ew-review-readiness-bar > span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #0f766e, var(--ew-review-teal));
  transition: width 0.35s ease;
}

.ew-review-readiness-notes {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-wrap: wrap;
  gap: 3px;
}

.ew-review-readiness-notes li {
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 9px;
  font-weight: 600;
  color: #0f766e;
  background: color-mix(in srgb, var(--ew-review-teal) 6%, #fff);
}

.ew-review-readiness-met {
  margin: 0 0 3px;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 1px;
  max-width: 32ch;
}

.ew-review-readiness-met li {
  display: flex;
  align-items: flex-start;
  gap: 5px;
  font-size: 10px;
  font-weight: 600;
  line-height: 1.32;
  color: #065f46;
  padding: 1px 0;
  border-radius: 3px;
  transition: background 0.15s ease;
}

.ew-review-readiness-met li:hover {
  background: color-mix(in srgb, #10b981 6%, transparent);
}

.ew-review-readiness-check {
  flex-shrink: 0;
  font-weight: 800;
  opacity: 0.9;
}

.ew-review-readiness-gaps {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 3px 5px;
}

.ew-review-readiness-gaps-label {
  font-size: 8px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--ew-review-muted) 75%, transparent);
}

.ew-review-readiness-gap-chips {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-wrap: wrap;
  gap: 3px;
}

.ew-review-readiness-gap-chips li {
  padding: 1px 5px;
  border-radius: 4px;
  font-size: 9px;
  font-weight: 500;
  color: #a16207;
  background: color-mix(in srgb, #f59e0b 6%, #fff);
}

.ew-review-context {
  padding: 8px 10px;
  border-radius: 8px;
  background: #fafbfc;
  border: 1px solid var(--ew-review-border);
  max-width: var(--ew-review-read-max);
}

.ew-review-context-objective {
  margin: 0 0 5px;
  padding: 0;
  list-style: none;
  max-width: 36ch;
}

.ew-review-context-objective li {
  position: relative;
  padding-left: 11px;
  margin: 0 0 2px;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.35;
  color: var(--ew-review-navy);
}

.ew-review-context-objective li::before {
  content: "";
  position: absolute;
  left: 0;
  top: 0.55em;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--ew-review-teal);
}

.ew-review-context-purpose--muted {
  margin: 0 0 5px;
  font-size: 11px;
  font-weight: 600;
  color: var(--ew-review-muted);
}

.ew-review-context-meta {
  margin: 0;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 4px 10px;
  padding-top: 6px;
  margin-top: 4px;
  border-top: none;
  box-shadow: inset 0 1px 0 color-mix(in srgb, var(--ew-review-border) 80%, transparent);
}

.ew-review-context-meta dt {
  margin: 0;
  font-size: 8px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--ew-review-muted);
}

.ew-review-context-meta dd {
  margin: 0;
  font-size: 10px;
  font-weight: 600;
  line-height: 1.3;
  color: #475569;
  word-break: break-word;
}

.ew-review-block {
  border-radius: 8px;
  padding: 9px 11px 10px;
  background: #fff;
  min-width: 0;
  border: 1px solid var(--ew-review-border);
  border-left: 3px solid var(--ew-review-teal);
  max-width: calc(var(--ew-review-read-max) + 2rem);
}

.ew-review-block-title {
  margin: 0;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--ew-review-navy);
}

.ew-review-brief-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 4px 6px;
  margin-bottom: 2px;
}

.ew-review-plan-note {
  margin: 0 0 8px;
  font-size: 9px;
  line-height: 1.35;
  color: var(--ew-review-muted);
  max-width: 40ch;
}

.ew-review-prep-playbook {
  padding: 2px 6px;
  border-radius: 4px;
  background: color-mix(in srgb, var(--ew-review-teal) 6%, #fff);
  font-size: 9px;
  font-weight: 700;
  color: #0f766e;
}

.ew-review-brief-shell {
  max-width: var(--ew-review-read-max);
}

.ew-review-brief-grid {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-width: 0;
}

.ew-review-brief-section {
  padding: 0;
  min-width: 0;
}

.ew-review-brief-section + .ew-review-brief-section {
  padding-top: 0;
  border-top: none;
}

.ew-review-brief-section--objective {
  padding: 8px 10px;
  margin: 0 -2px;
  border-radius: 6px;
  background: color-mix(in srgb, var(--ew-review-teal) 4%, #fafbfc);
}

.ew-review-brief-section--unknownsRemaining {
  padding-top: 2px;
}

.ew-review-brief-section--pathwayImpact {
  padding: 6px 0 2px;
}

.ew-review-brief-section--expectedOutcome,
.ew-review-brief-section--nextStep {
  padding-top: 2px;
}

.ew-review-brief-section-head {
  margin-bottom: 5px;
}

.ew-review-brief-section--objective .ew-review-brief-section-head {
  margin-bottom: 6px;
}

.ew-review-brief-section-title {
  margin: 0;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: #475569;
}

.ew-review-brief-section--primary .ew-review-brief-section-title,
.ew-review-brief-section--objective .ew-review-brief-section-title {
  color: #0f766e;
  font-size: 10px;
}

.ew-review-brief-section--unknownsRemaining .ew-review-brief-section-title {
  color: #b45309;
}

.ew-review-brief-section-sub {
  margin: 2px 0 0;
  font-size: 10px;
  font-weight: 500;
  line-height: 1.35;
  color: color-mix(in srgb, var(--ew-review-muted) 88%, transparent);
}

.ew-review-brief-section--objective .ew-review-brief-section-sub {
  font-size: 10px;
  color: #64748b;
}

.ew-review-brief-groups {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.ew-review-brief-subgroup {
  padding: 0;
  min-width: 0;
}

.ew-review-brief-subgroup-title {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 5px;
  margin: 0 0 4px;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  color: #334155;
}

.ew-review-brief-list {
  margin: 0;
  padding: 0;
  list-style: none;
  max-width: 36ch;
}

.ew-review-brief-list li {
  position: relative;
  padding-left: 10px;
  margin: 0 0 2px;
  font-size: 11px;
  font-weight: 600;
  line-height: 1.4;
  color: #1e293b;
}

.ew-review-brief-list li::before {
  content: "";
  position: absolute;
  left: 0;
  top: 0.55em;
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--ew-review-teal) 55%, #cbd5e1);
}

.ew-review-brief-list-item--suggested {
  color: var(--ew-review-muted);
  font-weight: 500;
}

.ew-review-brief-list-item--suggested::before {
  width: 4px;
  height: 4px;
  border-radius: 0;
  background: transparent;
  border: 1px solid color-mix(in srgb, var(--ew-review-muted) 50%, transparent);
  top: 0.5em;
}

.ew-review-op-tag {
  flex-shrink: 0;
  padding: 0 3px;
  border-radius: 2px;
  font-size: 6px;
  font-weight: 700;
  letter-spacing: 0.06em;
  line-height: 1.35;
  opacity: 0.88;
}

.ew-review-op-tag--workflow {
  color: #0f766e;
  background: color-mix(in srgb, var(--ew-review-teal) 8%, transparent);
}

.ew-review-op-tag--access {
  color: #1e40af;
  background: color-mix(in srgb, #3b82f6 8%, transparent);
}

.ew-review-op-tag--observation {
  color: #5b21b6;
  background: color-mix(in srgb, #8b5cf6 8%, transparent);
}

.ew-review-op-tag--risk {
  color: #b45309;
  background: color-mix(in srgb, #f59e0b 8%, transparent);
}

.ew-review-brief-empty {
  margin: 0;
  max-width: 34ch;
  font-size: 10px;
  line-height: 1.35;
  color: var(--ew-review-muted);
  font-style: italic;
}

.ew-review-after {
  margin: 0;
  padding: 8px 10px;
  border-radius: 8px;
  font-size: 10px;
  line-height: 1.4;
  color: #475569;
  background: #fafbfc;
  border: 1px solid var(--ew-review-border);
  border-left: 3px solid var(--ew-review-teal);
  max-width: var(--ew-review-read-max);
}

.ew-review-after-title {
  margin: 0 0 4px;
  font-size: 8px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--ew-review-muted);
}

.ew-review-after-steps {
  margin: 0;
  padding-left: 16px;
  display: flex;
  flex-direction: column;
  gap: 3px;
  max-width: 40ch;
}

.ew-review-after-steps li {
  font-weight: 600;
}

.ew-review-brief-section:focus-within,
.ew-review-readiness:focus-within {
  outline: none;
}

@media (min-width: 640px) {
  .ew-review-readiness {
    flex-direction: row;
    align-items: flex-start;
    gap: 10px;
    padding: 7px 10px;
  }

  .ew-review-readiness-compact {
    flex: 0 0 10.5rem;
  }

  .ew-review-readiness-detail {
    flex: 1 1 auto;
    padding-top: 0;
    margin-top: 0;
    border-top: none;
    padding-left: 10px;
    box-shadow: inset 1px 0 0 color-mix(in srgb, var(--ew-review-border) 70%, transparent);
  }

  .ew-review-brief-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    column-gap: 16px;
    row-gap: 14px;
  }

  .ew-review-brief-section--objective,
  .ew-review-brief-section--unknownsRemaining,
  .ew-review-brief-section--pathwayImpact,
  .ew-review-brief-section--expectedOutcome {
    grid-column: 1 / -1;
  }

  .ew-review-brief-section--discoveryTargets {
    grid-column: 1 / -1;
  }

  .ew-review-brief-groups {
    flex-direction: row;
    gap: 14px;
  }

  .ew-review-brief-subgroup {
    flex: 1 1 0;
    min-width: 0;
  }

  .ew-review-context-meta {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 639px) {
  .ew-review-root {
    padding-bottom: calc(10px + env(safe-area-inset-bottom, 0px));
  }

  .ew-review-context-meta {
    grid-template-columns: 1fr;
  }

  .ew-review-brief-groups {
    flex-direction: column;
    gap: 8px;
  }

  .ew-review-op-tag {
    display: none;
  }

  .ew-review-brief-subgroup-title {
    font-size: 9px;
  }

  .ew-review-readiness {
    max-width: 100%;
  }

  .ew-review-block,
  .ew-review-hero,
  .ew-review-context,
  .ew-review-after {
    max-width: 100%;
  }
}
`;
