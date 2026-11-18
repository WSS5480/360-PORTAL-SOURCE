/**
 * Provider overview — field deployment briefing layout.
 */
export const providerOverviewNarrativeCss = `
.provider-profile-root--command-center .provider-profile-body {
  padding-top: 12px;
}

.provider-profile-root {
  --ops-section-gap: 20px;
  --ops-card-radius: 14px;
  --ops-card-shadow: 0 1px 2px rgba(15, 23, 42, 0.04), 0 8px 24px rgba(15, 23, 42, 0.05);
  --ops-surface-page: #f4f6f9;
  --ops-surface-raised: #fff;
  --ops-surface-inset: color-mix(in srgb, var(--foreground) 2.5%, #f4f6f9);
  --ops-surface-accent: color-mix(in srgb, var(--brand-600) 5%, #fff);
  --ops-divider: color-mix(in srgb, var(--foreground) 4%, transparent);
  --ops-border-warn: none;
  --ops-border-blocked: none;
}

.provider-profile-root .provider-ops-dashboard,
.provider-profile-root .provider-ops-briefing-flow {
  display: flex;
  flex-direction: column;
  gap: var(--ops-section-gap);
  min-width: 0;
  max-width: 68rem;
  padding-bottom: 8px;
}

/* ── Field deployment briefing (four instant answers) ── */
.provider-profile-root .provider-deploy-briefing {
  padding: 20px 22px 18px;
  border-radius: var(--ops-card-radius);
  background: var(--ops-surface-raised);
  border: none;
  box-shadow: var(--ops-card-shadow);
}

.provider-profile-root .provider-deploy-briefing-head {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.provider-profile-root .provider-deploy-briefing-title {
  margin: 2px 0 0;
  font-size: 15px;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--foreground);
}

.provider-profile-root .provider-deploy-briefing-kicker {
  margin: 2px 0 0;
  font-size: 11px;
  font-weight: 650;
  line-height: 1.35;
  color: var(--muted);
}

.provider-profile-root .provider-deploy-briefing-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  justify-content: flex-end;
  align-items: center;
}

.provider-profile-root .provider-deploy-lane-badge {
  font-size: 10px;
  font-weight: 800;
  padding: 3px 8px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--foreground) 6%, var(--surface));
  color: var(--foreground);
  flex-shrink: 0;
}

.provider-profile-root .provider-deploy-protect-badge {
  font-size: 9px;
  font-weight: 900;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  padding: 3px 8px;
  border-radius: 999px;
  flex-shrink: 0;
}

.provider-profile-root .provider-deploy-protect-badge--clear_to_deploy {
  color: #166534;
  background: color-mix(in srgb, #15803d 10%, var(--surface));
}

.provider-profile-root .provider-deploy-protect-badge--validate_before_travel {
  color: #1d4ed8;
  background: color-mix(in srgb, #3b82f6 10%, var(--surface));
}

.provider-profile-root .provider-deploy-protect-badge--hold_field_time,
.provider-profile-root .provider-deploy-protect-badge--protect_field_time {
  color: #92400e;
  background: color-mix(in srgb, #f59e0b 12%, var(--surface));
}

.provider-profile-root .provider-deploy-directive {
  margin: 0 0 16px;
  padding: 12px 14px;
  border-radius: 10px;
  background: var(--ops-surface-inset);
  border: none;
  border-left: 3px solid color-mix(in srgb, var(--brand-600) 50%, transparent);
}

.provider-profile-root .provider-deploy-directive-label {
  display: block;
  font-size: 9px;
  font-weight: 850;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--muted);
  margin-bottom: 3px;
}

.provider-profile-root .provider-deploy-directive-text {
  margin: 0;
  font-size: 12px;
  font-weight: 750;
  line-height: 1.4;
  color: var(--foreground);
}

.provider-profile-root .provider-deploy-known {
  margin: 0 0 12px;
  padding: 8px 10px;
  border-radius: 6px;
  background: color-mix(in srgb, #16a34a 6%, var(--surface));
  border: 1px solid color-mix(in srgb, #16a34a 18%, var(--border));
}

.provider-profile-root .provider-deploy-known-title {
  margin: 0 0 6px;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: color-mix(in srgb, #166534 85%, var(--muted));
}

.provider-profile-root .provider-deploy-known-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.provider-profile-root .provider-deploy-known-item {
  font-size: 12px;
  font-weight: 650;
  line-height: 1.35;
  color: var(--foreground);
  padding-left: 1.15em;
  position: relative;
}

.provider-profile-root .provider-deploy-known-item::before {
  content: "✓";
  position: absolute;
  left: 0;
  color: #16a34a;
  font-weight: 800;
  font-size: 11px;
}

.provider-profile-root .provider-deploy-answers {
  display: grid;
  gap: 12px;
}

@media (min-width: 720px) {
  .provider-profile-root .provider-deploy-answers {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.provider-profile-root .provider-deploy-answer {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px 14px;
  border-radius: 12px;
  border: none;
  background: var(--ops-surface-inset);
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.03);
  min-height: 0;
}

.provider-profile-root .provider-deploy-answer--primary {
  background: color-mix(in srgb, var(--brand-600) 5%, #fff);
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
}

@media (min-width: 720px) {
  .provider-profile-root .provider-deploy-answer--primary {
    grid-column: 1 / -1;
  }
}

.provider-profile-root .provider-deploy-answer--success {
  background: color-mix(in srgb, #15803d 4%, #fff);
}

.provider-profile-root .provider-deploy-answer--caution,
.provider-profile-root .provider-deploy-answer--warn {
  background: color-mix(in srgb, #b45309 4%, #fff);
}

.provider-profile-root .provider-deploy-answer--blocked {
  background: color-mix(in srgb, #b91c1c 4%, #fff);
}

.provider-profile-root .provider-deploy-answer-question {
  margin: 0;
  font-size: 10px;
  font-weight: 850;
  line-height: 1.25;
  color: var(--muted);
}

.provider-profile-root .provider-deploy-answer-text {
  margin: 0;
  font-size: 12px;
  font-weight: 750;
  line-height: 1.35;
  color: var(--foreground);
}

.provider-profile-root .provider-deploy-answer-bullets {
  margin: 0;
  padding: 0 0 0 14px;
  font-size: 10px;
  font-weight: 650;
  line-height: 1.35;
  color: var(--muted);
}

.provider-profile-root .provider-deploy-answer-action {
  align-self: flex-start;
  margin-top: 2px;
  padding: 0;
  border: none;
  background: none;
  font-size: 10px;
  font-weight: 800;
  color: var(--brand-700);
  cursor: pointer;
  text-decoration: underline;
  font-family: inherit;
}

.provider-profile-root .provider-deploy-primary-move {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--ops-divider);
}

.provider-profile-root .provider-deploy-primary-move-label {
  display: block;
  font-size: 9px;
  font-weight: 850;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--brand-700) 80%, var(--muted));
}

.provider-profile-root .provider-deploy-primary-move-text,
.provider-profile-root .provider-deploy-primary-move-link {
  margin: 3px 0 0;
  font-size: 13px;
  font-weight: 800;
  line-height: 1.35;
  color: var(--brand-700);
  text-decoration: none;
}

.provider-profile-root .provider-deploy-primary-move-link:hover {
  text-decoration: underline;
}

.provider-profile-root .provider-deploy-detail {
  margin-top: 8px;
}

.provider-profile-root .provider-deploy-detail-summary {
  font-size: 10px;
  font-weight: 800;
  color: var(--muted);
  cursor: pointer;
  list-style: none;
}

.provider-profile-root .provider-deploy-detail-summary::-webkit-details-marker {
  display: none;
}

.provider-profile-root .provider-deploy-detail-body {
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.provider-profile-root .provider-deploy-ledger-grid {
  display: grid;
  gap: 8px;
}

@media (min-width: 640px) {
  .provider-profile-root .provider-deploy-ledger-grid {
    grid-template-columns: 1fr 1fr;
  }
}

.provider-profile-root .provider-deploy-ledger-heading {
  margin: 0 0 4px;
  font-size: 10px;
  font-weight: 800;
  color: var(--foreground);
}

.provider-profile-root .provider-deploy-ledger-empty {
  margin: 0;
  font-size: 10px;
  font-weight: 650;
  color: var(--muted);
}

.provider-profile-root .provider-deploy-ledger {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 3px;
}

.provider-profile-root .provider-deploy-ledger-btn {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  width: 100%;
  padding: 4px 0;
  border: none;
  background: none;
  text-align: left;
  cursor: pointer;
  font-family: inherit;
}

.provider-profile-root .provider-deploy-ledger-text {
  font-size: 10px;
  font-weight: 700;
  color: var(--foreground);
}

.provider-profile-root .provider-ops-execute-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 12px;
  border-radius: 8px;
  background: var(--ops-surface-raised);
}

.provider-profile-root .provider-ops-deploy-detail,
.provider-profile-root .provider-ops-momentum-detail {
  border-radius: 8px;
  background: var(--ops-surface-inset);
  padding: 4px 10px;
}

.provider-profile-root .provider-ops-deploy-detail-summary,
.provider-profile-root .provider-ops-momentum-detail-summary {
  font-size: 11px;
  font-weight: 800;
  color: var(--foreground);
  cursor: pointer;
  padding: 6px 0;
  list-style: none;
}

.provider-profile-root .provider-ops-deploy-detail-summary::-webkit-details-marker,
.provider-profile-root .provider-ops-momentum-detail-summary::-webkit-details-marker {
  display: none;
}

.provider-profile-root .provider-ops-deploy-detail-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-bottom: 8px;
}

/* Canonical execution blockers (overview only) */
.provider-profile-root .provider-ops-blockers {
  padding: 18px 20px;
  border-radius: var(--ops-card-radius);
  background: var(--ops-surface-raised);
  border: none;
  box-shadow: var(--ops-card-shadow);
}

.provider-profile-root .provider-ops-blockers--clear {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.provider-profile-root .provider-ops-blockers-clear {
  margin: 0;
  font-size: 11px;
  font-weight: 650;
  color: var(--muted);
}

.provider-profile-root .provider-ops-blockers-title {
  margin: 0;
  font-size: 12px;
  font-weight: 800;
  color: var(--foreground);
}

.provider-profile-root .provider-ops-blockers-kicker {
  margin: 2px 0 0;
  font-size: 10px;
  font-weight: 650;
  color: var(--muted);
}

.provider-profile-root .provider-ops-blockers-list {
  margin: 12px 0 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 10px;
}

.provider-profile-root .provider-ops-blockers-btn {
  width: 100%;
  text-align: left;
  padding: 12px 14px;
  border-radius: 10px;
  border: none;
  background: var(--ops-surface-inset);
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.03);
  cursor: pointer;
  font-family: inherit;
}

.provider-profile-root .provider-ops-blockers-item--hard_stop .provider-ops-blockers-btn {
  background: color-mix(in srgb, #b91c1c 4%, #fff);
}

.provider-profile-root .provider-ops-blockers-kind {
  display: block;
  font-size: 9px;
  font-weight: 850;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--muted);
}

.provider-profile-root .provider-ops-blockers-headline {
  display: block;
  margin-top: 2px;
  font-size: 11px;
  font-weight: 750;
  color: var(--foreground);
}

.provider-profile-root .provider-ops-blockers-resolve {
  display: block;
  margin-top: 2px;
  font-size: 10px;
  font-weight: 650;
  color: var(--muted);
}

.provider-profile-root .provider-ops-field-time-risk-panel {
  padding: 0;
  margin: 0;
}

.provider-profile-root .provider-ops-field-time-risk-panel .provider-field-time-risk--full {
  padding: 16px 18px;
  border-radius: var(--ops-card-radius);
  background: var(--ops-surface-raised);
  border: none;
  box-shadow: var(--ops-card-shadow);
}

.provider-profile-root .provider-ops-blockers-foot-link,
.provider-profile-root .provider-ops-blockers-link {
  margin-top: 8px;
  padding: 0;
  border: none;
  background: none;
  font-size: 10px;
  font-weight: 800;
  color: var(--brand-700);
  cursor: pointer;
  text-decoration: underline;
  font-family: inherit;
}

.provider-profile-root .provider-ops-row {
  display: grid;
  gap: 10px;
  min-width: 0;
}

@media (min-width: 768px) {
  .provider-profile-root .provider-ops-row--intel {
    grid-template-columns: minmax(0, 1.05fr) minmax(0, 0.95fr);
    align-items: start;
  }

  .provider-profile-root .provider-ops-row--intel > :only-child {
    grid-column: 1 / -1;
  }

  .provider-profile-root .provider-ops-row--ops:not(.provider-ops-row--single) {
    grid-template-columns: minmax(0, 0.92fr) minmax(0, 1.08fr);
    align-items: start;
  }

  .provider-profile-root .provider-ops-row--gaps {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    align-items: start;
  }
}

.provider-profile-root .provider-ops-mission-cell {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.provider-profile-root .provider-ops-ops-panel {
  padding: 18px 20px;
  border-radius: var(--ops-card-radius);
  border: none;
  background: var(--ops-surface-raised);
  box-shadow: var(--ops-card-shadow);
}

.provider-profile-root .provider-ops-platform-eyebrow {
  margin: 0 0 6px;
  font-size: 9px;
  font-weight: 900;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: color-mix(in srgb, #0f766e 72%, var(--muted));
}

.provider-profile-root .provider-ops-cmd .provider-ops-section-head {
  margin-bottom: 6px;
}

/* ── Shared scan layout ── */
.provider-profile-root .provider-ops-section-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}

.provider-profile-root .provider-ops-section-kicker {
  margin: 2px 0 0;
  font-size: 12px;
  font-weight: 800;
  line-height: 1.25;
  color: var(--foreground);
  letter-spacing: -0.01em;
}

.provider-profile-root .provider-ops-section-link {
  font-size: 11px;
  font-weight: 800;
  color: var(--brand-700);
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  font-family: inherit;
  text-decoration: underline;
  flex-shrink: 0;
}

.provider-profile-root .provider-ops-signals {
  margin: 0;
  display: grid;
  gap: 6px;
}

.provider-profile-root .provider-ops-signals-row {
  display: grid;
  grid-template-columns: minmax(4.5rem, 5.5rem) 1fr;
  gap: 6px 12px;
  align-items: start;
}

.provider-profile-root .provider-ops-signals dt {
  margin: 0;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--muted);
  line-height: 1.3;
}

.provider-profile-root .provider-ops-signals dd {
  margin: 0;
  font-size: 13px;
  line-height: 1.35;
  font-weight: 700;
  color: var(--foreground);
}

@media (min-width: 640px) {
  .provider-profile-root .provider-ops-signals--cols-2 {
    grid-template-columns: 1fr 1fr;
    gap: 10px 16px;
  }

  .provider-profile-root .provider-ops-signals--cols-2 .provider-ops-signals-row {
    grid-template-columns: 1fr;
    gap: 3px;
  }
}

/* ── 1. Command summary (field-ops dashboard) ── */
.provider-profile-root .provider-ops-cmd {
  border: none;
  background: var(--ops-surface-raised);
}

.provider-profile-root .provider-ops-cmd-layout {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
  min-width: 0;
}

@media (min-width: 640px) {
  .provider-profile-root .provider-ops-cmd-layout {
    grid-template-columns: minmax(0, 1.2fr) minmax(0, 0.8fr);
    gap: 12px;
    align-items: start;
  }

  .provider-profile-root .provider-ops-cmd-aside {
    padding-left: 14px;
    border-left: none;
  }
}

.provider-profile-root .provider-ops-stage-progression {
  margin-top: 10px;
  padding-top: 10px;
  border-top: none;
}

.provider-profile-root .provider-ops-stage-progression-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
}

.provider-profile-root .provider-ops-stage-progression-heading {
  margin: 0;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--muted);
  line-height: 1.3;
}

.provider-profile-root .provider-ops-stage-progression-pct {
  flex-shrink: 0;
  font-size: 10px;
  font-weight: 800;
  color: var(--brand-700);
}

.provider-profile-root .provider-ops-stage-progression-track {
  height: 4px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--foreground) 8%, var(--border));
  overflow: hidden;
  margin-bottom: 8px;
}

.provider-profile-root .provider-ops-stage-progression-fill {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: color-mix(in srgb, var(--brand-600) 75%, #047857);
}

.provider-profile-root .provider-ops-stage-progression-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px 10px;
}

.provider-profile-root .provider-ops-stage-progression-item,
button.provider-ops-stage-progression-item {
  display: flex;
  align-items: flex-start;
  gap: 5px;
  min-width: 0;
  font-size: 11px;
  line-height: 1.35;
  font-weight: 700;
  color: color-mix(in srgb, var(--foreground) 82%, var(--muted));
}

button.provider-ops-stage-progression-item {
  width: 100%;
  padding: 0;
  border: none;
  background: none;
  font-family: inherit;
  text-align: left;
  cursor: pointer;
}

button.provider-ops-stage-progression-item--action:hover {
  color: var(--brand-700);
}

.provider-profile-root .provider-ops-stage-progression-item--met {
  color: color-mix(in srgb, #047857 80%, var(--muted));
}

.provider-profile-root .provider-ops-stage-progression-marker {
  flex-shrink: 0;
  width: 0.85em;
  font-size: 10px;
  font-weight: 900;
  line-height: 1.35;
}

.provider-profile-root .provider-ops-stage-progression-label {
  min-width: 0;
}

@media (max-width: 520px) {
  .provider-profile-root .provider-ops-stage-progression-list {
    grid-template-columns: 1fr;
  }
}

.provider-profile-root .provider-ops-cmd-main .provider-ops-momentum-indicators {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
}

.provider-profile-root .provider-ops-cmd-aside .provider-ops-readiness {
  margin-top: 0;
  padding-top: 0;
  border-top: none;
}

.provider-profile-root .provider-ops-momentum-indicators-heading {
  margin: 0 0 6px;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted);
}

.provider-profile-root .provider-ops-momentum-indicators-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.provider-profile-root .provider-ops-momentum-chip {
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding: 6px 8px;
  border-radius: 6px;
  border: none;
  background: var(--ops-surface-inset);
}

.provider-profile-root .provider-ops-momentum-chip--positive {
  border-left: 3px solid color-mix(in srgb, #047857 70%, transparent);
  background: color-mix(in srgb, #047857 5%, #fff);
}

.provider-profile-root .provider-ops-momentum-chip--warn {
  border-left: 3px solid color-mix(in srgb, #d97706 75%, transparent);
  background: color-mix(in srgb, #d97706 6%, #fff);
}

.provider-profile-root .provider-ops-momentum-chip--negative {
  border-left: 3px solid color-mix(in srgb, #b91c1c 75%, transparent);
  background: color-mix(in srgb, #b91c1c 5%, #fff);
}

.provider-profile-root .provider-ops-momentum-chip--neutral {
  background: var(--ops-surface-inset);
}

.provider-profile-root .provider-ops-momentum-chip-label {
  font-size: 12px;
  font-weight: 900;
  letter-spacing: -0.01em;
  color: var(--foreground);
}

.provider-profile-root .provider-ops-momentum-chip--positive .provider-ops-momentum-chip-label {
  color: color-mix(in srgb, #047857 90%, var(--foreground));
}

.provider-profile-root .provider-ops-momentum-chip--warn .provider-ops-momentum-chip-label {
  color: color-mix(in srgb, #b45309 90%, var(--foreground));
}

.provider-profile-root .provider-ops-momentum-chip--negative .provider-ops-momentum-chip-label {
  color: color-mix(in srgb, #b91c1c 88%, var(--foreground));
}

.provider-profile-root .provider-ops-momentum-chip-scan {
  font-size: 11px;
  line-height: 1.35;
  font-weight: 600;
  color: color-mix(in srgb, var(--foreground) 68%, var(--muted));
}

@media (min-width: 640px) {
  .provider-profile-root .provider-ops-momentum-indicators-list {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px 8px;
  }
}

.provider-profile-root .provider-ops-readiness-heading {
  margin: 0 0 6px;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--muted);
}

.provider-profile-root .provider-ops-readiness-grid {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px 10px;
}

.provider-profile-root .provider-ops-readiness-cell {
  min-width: 0;
  padding: 8px 10px;
  border-radius: 8px;
  border: none;
  background: var(--ops-surface-inset);
}

.provider-profile-root .provider-ops-readiness-label {
  margin: 0 0 4px;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--muted);
  line-height: 1.25;
}

.provider-profile-root .provider-ops-readiness-state {
  margin: 0;
  font-size: 13px;
  line-height: 1.25;
  font-weight: 900;
  letter-spacing: -0.01em;
  color: var(--foreground);
}

.provider-profile-root .provider-ops-readiness-context {
  margin: 4px 0 0;
  font-size: 10px;
  line-height: 1.35;
  color: color-mix(in srgb, var(--foreground) 62%, var(--muted));
}

.provider-profile-root .provider-ops-readiness-state--emerging {
  color: color-mix(in srgb, var(--foreground) 55%, var(--muted));
}

.provider-profile-root .provider-ops-readiness-state--partially_validated {
  color: color-mix(in srgb, #b45309 88%, var(--foreground));
}

.provider-profile-root .provider-ops-readiness-state--operationally_viable {
  color: color-mix(in srgb, var(--brand-800) 90%, var(--foreground));
}

.provider-profile-root .provider-ops-readiness-state--observation_ready {
  color: color-mix(in srgb, #0f766e 85%, var(--foreground));
}

.provider-profile-root .provider-ops-readiness-state--evaluation_active {
  color: color-mix(in srgb, #1d4ed8 82%, var(--foreground));
}

.provider-profile-root .provider-ops-readiness-state--adoption_building {
  color: color-mix(in srgb, #047857 85%, var(--foreground));
}

.provider-profile-root .provider-ops-readiness--strip {
  margin-top: 0;
}

.provider-profile-root .provider-ops-readiness--strip .provider-ops-readiness-context {
  display: none;
}

.provider-profile-root .provider-ops-readiness--strip .provider-ops-readiness-cell {
  padding: 5px 7px;
}

.provider-profile-root .provider-ops-cmd-right {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-top: 2px;
  border-top: none;
}

.provider-profile-root .provider-ops-cmd-block-label {
  margin: 0 0 4px;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--muted);
}

.provider-profile-root .provider-ops-cmd-list {
  margin: 0;
  padding: 0 0 0 14px;
  list-style: disc;
}

.provider-profile-root .provider-ops-cmd-list li {
  margin-bottom: 2px;
}

.provider-profile-root .provider-ops-cmd-list-btn {
  padding: 0;
  border: none;
  background: none;
  font-size: 12px;
  line-height: 1.35;
  font-weight: 600;
  color: var(--foreground);
  text-align: left;
  cursor: pointer;
  font-family: inherit;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.provider-profile-root .provider-ops-cmd-list-btn:hover {
  color: var(--brand-700);
}

.provider-profile-root .provider-ops-cmd-empty {
  margin: 0;
  font-size: 11px;
  color: var(--muted);
}

.provider-profile-root .provider-ops-cmd-next-text {
  margin: 0 0 10px;
  font-size: 12px;
  line-height: 1.45;
  font-weight: 600;
  color: color-mix(in srgb, var(--foreground) 82%, var(--muted));
}

.provider-profile-root .provider-ops-cmd-cta {
  display: inline-flex;
  align-items: center;
  min-height: 36px;
  padding: 0 14px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 800;
  text-decoration: none;
  color: #fff;
  background: var(--brand-600);
  border: 1px solid var(--brand-600);
}

.provider-profile-root .provider-ops-cmd--warn {
  border: var(--ops-border-warn);
  background: color-mix(in srgb, #d97706 4%, #fff);
}

.provider-profile-root .provider-ops-cmd--brand .provider-ops-cmd-stage {
  color: var(--brand-800);
}

.provider-profile-root .provider-ops-cmd--success {
  background: color-mix(in srgb, #047857 4%, var(--ops-surface-raised));
}

.provider-profile-root .provider-ops-cmd--opportunity .provider-ops-cmd-stage {
  color: color-mix(in srgb, var(--brand-700) 70%, #047857);
}

/* ── 1b. OR operational readiness engine ── */
.provider-profile-root .provider-ops-obs-readiness {
  border: none;
  background: var(--ops-surface-raised);
}

.provider-profile-root .provider-ops-obs-readiness--success {
  background: color-mix(in srgb, #047857 4%, var(--ops-surface-raised));
}

.provider-profile-root .provider-ops-obs-readiness--warn {
  border: var(--ops-border-warn);
  background: color-mix(in srgb, #d97706 4%, #fff);
}

.provider-profile-root .provider-ops-obs-readiness--blocked {
  border: var(--ops-border-blocked);
  background: color-mix(in srgb, #b91c1c 4%, #fff);
}

.provider-profile-root .provider-ops-obs-readiness--neutral {
  border: none;
}

.provider-profile-root .provider-ops-obs-readiness-engine {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
  min-width: 0;
}

@media (min-width: 640px) {
  .provider-profile-root .provider-ops-obs-readiness-engine {
    grid-template-columns: minmax(0, 0.38fr) minmax(0, 1fr);
    gap: 10px 14px;
    align-items: start;
  }
}

.provider-profile-root .provider-ops-obs-readiness-left {
  padding: 8px 10px;
  border-radius: 7px;
  background: var(--ops-surface-inset);
  border: none;
}

.provider-profile-root .provider-ops-obs-readiness--success .provider-ops-obs-readiness-left {
  background: color-mix(in srgb, #047857 6%, #fff);
}

.provider-profile-root .provider-ops-obs-readiness--warn .provider-ops-obs-readiness-left {
  background: color-mix(in srgb, #d97706 6%, #fff);
  border-left: 3px solid color-mix(in srgb, #d97706 65%, transparent);
}

.provider-profile-root .provider-ops-obs-readiness--blocked .provider-ops-obs-readiness-left {
  background: color-mix(in srgb, #b91c1c 6%, #fff);
  border-left: 3px solid color-mix(in srgb, #b91c1c 65%, transparent);
}

.provider-profile-root .provider-ops-obs-readiness-state {
  margin: 0 0 6px;
  font-size: 15px;
  font-weight: 900;
  letter-spacing: -0.02em;
  line-height: 1.2;
  color: var(--foreground);
}

.provider-profile-root .provider-ops-obs-readiness--success .provider-ops-obs-readiness-state {
  color: color-mix(in srgb, #047857 90%, var(--foreground));
}

.provider-profile-root .provider-ops-obs-readiness--warn .provider-ops-obs-readiness-state {
  color: color-mix(in srgb, #b45309 90%, var(--foreground));
}

.provider-profile-root .provider-ops-obs-readiness--blocked .provider-ops-obs-readiness-state {
  color: color-mix(in srgb, #b91c1c 90%, var(--foreground));
}

.provider-profile-root .provider-ops-obs-readiness-interpretation {
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.4;
  color: color-mix(in srgb, var(--foreground) 78%, var(--muted));
}

.provider-profile-root .provider-ops-obs-readiness-right {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
  min-width: 0;
}

@media (min-width: 520px) {
  .provider-profile-root .provider-ops-obs-readiness-right {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 6px 8px;
  }
}

.provider-profile-root .provider-ops-obs-readiness-col {
  min-width: 0;
  padding: 6px 8px;
  border-radius: 6px;
  border: none;
  background: var(--ops-surface-inset);
}

.provider-profile-root .provider-ops-obs-readiness-col-title {
  margin: 0 0 5px;
  font-size: 9px;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: color-mix(in srgb, #0f4c5c 48%, var(--muted));
}

.provider-profile-root .provider-ops-obs-readiness-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.provider-profile-root .provider-ops-obs-readiness-item {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 1px;
  width: 100%;
  padding: 4px 0;
  border: none;
  border-bottom: 1px solid color-mix(in srgb, var(--foreground) 6%, transparent);
  background: none;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.provider-profile-root .provider-ops-obs-readiness-item:last-child {
  border-bottom: none;
}

.provider-profile-root .provider-ops-obs-readiness-item:hover {
  color: var(--brand-700);
}

.provider-profile-root .provider-ops-obs-readiness-item-label {
  font-size: 10px;
  font-weight: 800;
  line-height: 1.25;
  color: inherit;
}

.provider-profile-root .provider-ops-obs-readiness-item-value {
  font-size: 10px;
  font-weight: 600;
  line-height: 1.3;
  color: color-mix(in srgb, var(--foreground) 68%, var(--muted));
}

.provider-profile-root .provider-ops-obs-readiness-list--validated .provider-ops-obs-readiness-item {
  border-left: 2px solid color-mix(in srgb, #047857 50%, transparent);
  padding-left: 6px;
}

.provider-profile-root .provider-ops-obs-readiness-list--blocking .provider-ops-obs-readiness-item {
  border-left: 2px solid color-mix(in srgb, #b91c1c 45%, transparent);
  padding-left: 6px;
}

.provider-profile-root .provider-ops-obs-readiness-list--unknown .provider-ops-obs-readiness-item {
  border-left: 2px solid color-mix(in srgb, #d97706 45%, transparent);
  padding-left: 6px;
}

.provider-profile-root .provider-ops-obs-readiness-item-value--open {
  color: color-mix(in srgb, #92400e 80%, var(--muted));
  font-weight: 800;
}

.provider-profile-root .provider-ops-obs-readiness-empty {
  margin: 0;
  font-size: 10px;
  line-height: 1.35;
  font-weight: 600;
  color: color-mix(in srgb, var(--foreground) 50%, var(--muted));
}

.provider-profile-root .provider-ops-obs-readiness-footer {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
  margin-top: 4px;
  padding-top: 10px;
  border-top: none;
}

@media (min-width: 560px) {
  .provider-profile-root .provider-ops-obs-readiness-footer {
    grid-template-columns: minmax(0, 0.42fr) minmax(0, 1fr);
    gap: 10px 14px;
    align-items: start;
  }
}

.provider-profile-root .provider-ops-obs-readiness-footer-label {
  margin: 0 0 3px;
  font-size: 9px;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted);
}

.provider-profile-root .provider-ops-obs-readiness-schedule {
  padding: 6px 8px;
  border-radius: 6px;
  border: none;
  background: var(--ops-surface-inset);
}

.provider-profile-root .provider-ops-obs-readiness-schedule--yes {
  background: color-mix(in srgb, #047857 7%, #fff);
}

.provider-profile-root .provider-ops-obs-readiness-schedule--caution {
  border: var(--ops-border-warn);
  background: color-mix(in srgb, #d97706 7%, #fff);
}

.provider-profile-root .provider-ops-obs-readiness-schedule--no {
  border: var(--ops-border-blocked);
  background: color-mix(in srgb, #b91c1c 6%, #fff);
}

.provider-profile-root .provider-ops-obs-readiness-schedule-answer {
  margin: 0;
  font-size: 14px;
  font-weight: 900;
  letter-spacing: -0.02em;
  color: var(--foreground);
}

.provider-profile-root .provider-ops-obs-readiness-schedule--yes .provider-ops-obs-readiness-schedule-answer {
  color: #047857;
}

.provider-profile-root .provider-ops-obs-readiness-schedule--no .provider-ops-obs-readiness-schedule-answer {
  color: #b91c1c;
}

.provider-profile-root .provider-ops-obs-readiness-schedule-scan {
  margin: 4px 0 0;
  font-size: 11px;
  font-weight: 600;
  line-height: 1.35;
  color: color-mix(in srgb, var(--foreground) 72%, var(--muted));
}

.provider-profile-root .provider-ops-obs-readiness-confirm-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.provider-profile-root .provider-ops-obs-readiness-confirm-item {
  display: block;
  width: 100%;
  text-align: left;
  padding: 3px 0 3px 10px;
  border: none;
  border-left: 2px solid color-mix(in srgb, #d97706 40%, var(--border));
  background: none;
  font: inherit;
  font-size: 11px;
  font-weight: 700;
  line-height: 1.35;
  color: var(--foreground);
  cursor: pointer;
}

.provider-profile-root .provider-ops-obs-readiness-confirm-item:hover {
  color: var(--brand-700);
}

/* ── 1b. Observation feasibility (legacy — retained for reference) ── */
.provider-profile-root .provider-ops-obs-feasibility {
  border: 2px solid color-mix(in srgb, #0f766e 32%, var(--border));
  background: linear-gradient(
    165deg,
    color-mix(in srgb, #0f766e 8%, #fff) 0%,
    #fff 55%
  );
  box-shadow: 0 1px 0 color-mix(in srgb, var(--foreground) 5%, transparent);
}

.provider-profile-root .provider-ops-obs-feasibility--success {
  border-color: color-mix(in srgb, #047857 40%, var(--border));
}

.provider-profile-root .provider-ops-obs-feasibility--warn {
  border-color: color-mix(in srgb, #d97706 35%, var(--border));
  background: linear-gradient(
    165deg,
    color-mix(in srgb, #d97706 6%, #fff) 0%,
    #fff 55%
  );
}

.provider-profile-root .provider-ops-obs-feasibility--blocked {
  border-color: color-mix(in srgb, #b91c1c 35%, var(--border));
  background: linear-gradient(
    165deg,
    color-mix(in srgb, #b91c1c 5%, #fff) 0%,
    #fff 55%
  );
}

.provider-profile-root .provider-ops-obs-feasibility--neutral {
  border-color: color-mix(in srgb, var(--foreground) 14%, var(--border));
}

.provider-profile-root .provider-ops-obs-feasibility-body {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
  min-width: 0;
}

@media (min-width: 520px) {
  .provider-profile-root .provider-ops-obs-feasibility-body {
    grid-template-columns: minmax(0, 0.95fr) minmax(0, 1.05fr);
    gap: 10px 12px;
    align-items: start;
  }
}

.provider-profile-root .provider-ops-obs-feasibility-verdict {
  margin: 0;
  padding: 0;
  border: none;
}

.provider-profile-root .provider-ops-obs-feasibility-verdict-label {
  margin: 0 0 3px;
  font-size: 15px;
  font-weight: 900;
  letter-spacing: -0.02em;
  line-height: 1.2;
  color: var(--foreground);
}

.provider-profile-root .provider-ops-obs-feasibility--success .provider-ops-obs-feasibility-verdict-label {
  color: color-mix(in srgb, #047857 92%, var(--foreground));
}

.provider-profile-root .provider-ops-obs-feasibility--warn .provider-ops-obs-feasibility-verdict-label {
  color: color-mix(in srgb, #b45309 92%, var(--foreground));
}

.provider-profile-root .provider-ops-obs-feasibility--blocked .provider-ops-obs-feasibility-verdict-label {
  color: color-mix(in srgb, #b91c1c 90%, var(--foreground));
}

.provider-profile-root .provider-ops-obs-feasibility-verdict-scan {
  margin: 0;
  font-size: 12px;
  line-height: 1.35;
  font-weight: 700;
  color: color-mix(in srgb, var(--foreground) 75%, var(--muted));
}

.provider-profile-root .provider-ops-obs-feasibility-inputs-heading,
.provider-profile-root .provider-ops-obs-feasibility-validation-heading {
  margin: 0 0 8px;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted);
}

.provider-profile-root .provider-ops-obs-feasibility-input-grid {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}

.provider-profile-root .provider-ops-obs-feasibility-input {
  min-width: 0;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));
  background: #fff;
}

.provider-profile-root .provider-ops-obs-feasibility-input--clear {
  border-left: 3px solid color-mix(in srgb, #047857 70%, var(--border));
}

.provider-profile-root .provider-ops-obs-feasibility-input--restrictive {
  border-left: 3px solid color-mix(in srgb, #d97706 70%, var(--border));
}

.provider-profile-root .provider-ops-obs-feasibility-input--unknown {
  border-left: 3px solid color-mix(in srgb, var(--foreground) 18%, var(--border));
  background: color-mix(in srgb, var(--foreground) 3%, #fff);
}

.provider-profile-root .provider-ops-obs-feasibility-ready {
  margin: 0;
  font-size: 11px;
  line-height: 1.35;
  font-weight: 700;
  color: color-mix(in srgb, #047857 75%, var(--muted));
}

.provider-profile-root .provider-ops-obs-feasibility-input-btn {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  padding: 6px 8px;
  border: none;
  background: none;
  font-family: inherit;
  text-align: left;
  cursor: pointer;
}

.provider-profile-root .provider-ops-obs-feasibility-input-btn:hover {
  background: color-mix(in srgb, var(--brand-600) 4%, transparent);
}

.provider-profile-root .provider-ops-obs-feasibility-input-label {
  font-size: 9px;
  font-weight: 900;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--muted);
}

.provider-profile-root .provider-ops-obs-feasibility-input-value {
  font-size: 12px;
  line-height: 1.3;
  font-weight: 800;
  color: var(--foreground);
}

.provider-profile-root .provider-ops-obs-feasibility-input--unknown .provider-ops-obs-feasibility-input-value {
  color: var(--muted);
  font-weight: 700;
}

.provider-profile-root .provider-ops-obs-feasibility-validation {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
}

.provider-profile-root .provider-ops-obs-feasibility-validation-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.provider-profile-root .provider-ops-obs-feasibility-validation-item {
  padding: 0;
  border: none;
  background: none;
  font-family: inherit;
  font-size: 12px;
  line-height: 1.35;
  font-weight: 700;
  color: color-mix(in srgb, #b45309 88%, var(--foreground));
  text-align: left;
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.provider-profile-root .provider-ops-obs-feasibility-validation-item:hover {
  color: var(--brand-700);
}

@media (max-width: 560px) {
  .provider-profile-root .provider-ops-obs-feasibility-input-grid {
    grid-template-columns: 1fr;
  }
}

/* ── 1c. Discovery progression (known / unknown) ── */
.provider-profile-root .provider-ops-discovery-panel {
  border: none;
  background: var(--ops-surface-raised);
}

.provider-profile-root .provider-ops-discovery-areas {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
}

@media (min-width: 640px) {
  .provider-profile-root .provider-ops-discovery-areas {
    grid-template-columns: 1fr 1fr;
  }

  .provider-profile-root .provider-ops-row--intel .provider-ops-discovery-areas {
    grid-template-columns: 1fr;
  }
}

.provider-profile-root .provider-ops-discovery-area {
  padding: 6px 0 4px;
  border-radius: 0;
  border: none;
  background: transparent;
  border-bottom: 1px solid color-mix(in srgb, var(--foreground) 5%, transparent);
}

.provider-profile-root .provider-ops-discovery-area:last-child {
  border-bottom: none;
}

.provider-profile-root .provider-ops-discovery-area--scan .provider-intel-scan-lanes {
  margin-top: 2px;
}

.provider-profile-root .provider-ops-discovery-area-title {
  margin: 0 0 3px;
  font-size: 11px;
  font-weight: 850;
  letter-spacing: 0.03em;
  text-transform: none;
  color: var(--foreground);
}

.provider-profile-root .provider-ops-discovery-pulses {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.provider-profile-root .provider-ops-discovery-pulse {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  width: 100%;
  padding: 7px 10px;
  border-radius: 7px;
  border: none;
  background: var(--ops-surface-inset);
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.provider-profile-root .provider-ops-discovery-pulse:hover {
  background: color-mix(in srgb, var(--brand-600) 8%, var(--ops-surface-inset));
}

.provider-profile-root .provider-ops-discovery-pulse-label {
  font-size: 12px;
  font-weight: 800;
  color: var(--brand-800);
}

.provider-profile-root .provider-ops-discovery-pulse-meta {
  font-size: 11px;
  font-weight: 600;
  color: color-mix(in srgb, var(--foreground) 55%, transparent);
  white-space: nowrap;
}

/* Known/open lanes use .provider-intel-scan-lanes (see providerProfileCss) */
.provider-profile-root .provider-ops-known-unknown.provider-intel-scan-lanes {
  gap: 6px 14px;
}

.provider-profile-root .provider-intel-scan-lanes--compact {
  gap: 8px;
}

.provider-profile-root .provider-ops-mission-discovery,
.provider-profile-root .provider-ops-efficiency-discovery {
  margin-top: 10px;
  padding-top: 10px;
  border-top: none;
}

.provider-profile-root .provider-ops-mission-discovery-title,
.provider-profile-root .provider-ops-efficiency-discovery-title {
  margin: 0 0 8px;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--muted);
}

.provider-profile-root .provider-ops-strategy-gap .provider-ops-known-unknown {
  margin-top: 10px;
}

@media (max-width: 520px) {
  .provider-profile-root .provider-ops-known-unknown {
    grid-template-columns: 1fr;
  }
}

/* ── 1c. Field efficiency intelligence ── */
.provider-profile-root .provider-ops-efficiency-panel {
  border: none;
  background: color-mix(in srgb, #0f766e 4%, var(--ops-surface-raised));
}

.provider-profile-root .provider-ops-efficiency-primary {
  padding: 8px 10px;
  margin-top: 2px;
  border-radius: 7px;
  border: none;
  background: var(--ops-surface-inset);
  border-left: 3px solid color-mix(in srgb, var(--foreground) 18%, transparent);
}

.provider-profile-root .provider-ops-efficiency-primary--invest_field {
  border-left-color: color-mix(in srgb, #047857 75%, var(--border));
}

.provider-profile-root .provider-ops-efficiency-primary--hold_field {
  border-left-color: color-mix(in srgb, #b45309 70%, var(--border));
}

.provider-profile-root .provider-ops-efficiency-primary--map_first {
  border-left-color: color-mix(in srgb, #1d4ed8 65%, var(--border));
}

.provider-profile-root .provider-ops-efficiency-primary--protect_field {
  border-left-color: color-mix(in srgb, var(--brand-600) 70%, var(--border));
}

.provider-profile-root .provider-ops-efficiency-primary-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 6px;
}

.provider-profile-root .provider-ops-efficiency-primary-headline {
  margin: 0;
  font-size: 15px;
  font-weight: 900;
  letter-spacing: -0.02em;
  line-height: 1.2;
  color: var(--foreground);
}

.provider-profile-root .provider-ops-efficiency-posture {
  flex-shrink: 0;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  padding: 3px 7px;
  border-radius: 999px;
  border: none;
  background: var(--ops-surface-inset);
  color: var(--muted);
}

.provider-profile-root .provider-ops-efficiency-posture--invest_field {
  color: color-mix(in srgb, #047857 90%, var(--foreground));
  border-color: color-mix(in srgb, #047857 28%, var(--border));
  background: color-mix(in srgb, #047857 6%, #fff);
}

.provider-profile-root .provider-ops-efficiency-posture--hold_field {
  color: color-mix(in srgb, #b45309 90%, var(--foreground));
  border-color: color-mix(in srgb, #b45309 28%, var(--border));
  background: color-mix(in srgb, #b45309 6%, #fff);
}

.provider-profile-root .provider-ops-efficiency-posture--map_first {
  color: color-mix(in srgb, #1d4ed8 88%, var(--foreground));
  border-color: color-mix(in srgb, #1d4ed8 24%, var(--border));
  background: color-mix(in srgb, #1d4ed8 5%, #fff);
}

.provider-profile-root .provider-ops-efficiency-posture--protect_field {
  color: color-mix(in srgb, var(--brand-800) 90%, var(--foreground));
  border-color: color-mix(in srgb, var(--brand-600) 24%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 5%, #fff);
}

.provider-profile-root .provider-ops-efficiency-allocation {
  margin: 0 0 10px;
  font-size: 12px;
  line-height: 1.3;
  font-weight: 800;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--foreground) 72%, var(--muted));
}

.provider-profile-root .provider-ops-efficiency-primary .provider-ops-signals {
  margin-top: 4px;
}

.provider-profile-root .provider-ops-efficiency-sources {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.provider-profile-root .provider-ops-efficiency-sources li {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  padding: 2px 6px;
  border-radius: 4px;
  color: var(--muted);
  background: var(--ops-surface-inset);
  border: none;
}

.provider-profile-root .provider-ops-efficiency-supporting {
  margin: 8px 0 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.provider-profile-root .provider-ops-efficiency-supporting-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));
  background: #fff;
  cursor: pointer;
  font-family: inherit;
  text-align: left;
}

.provider-profile-root .provider-ops-efficiency-supporting-btn:hover {
  border-color: color-mix(in srgb, var(--brand-600) 30%, var(--border));
}

.provider-profile-root .provider-ops-efficiency-supporting-headline {
  font-size: 12px;
  font-weight: 700;
  color: var(--foreground);
}

.provider-profile-root .provider-ops-efficiency-supporting-posture {
  flex-shrink: 0;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--muted);
}

/* ── Block titles ── */
.provider-profile-root .provider-ops-block-title {
  margin: 0;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: color-mix(in srgb, #0f4c5c 55%, var(--muted));
}

.provider-profile-root .provider-ops-block-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}

.provider-profile-root .provider-ops-block-link,
.provider-profile-root .provider-ops-panel-link {
  font-size: 11px;
  font-weight: 700;
  color: var(--brand-700);
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  font-family: inherit;
  text-decoration: underline;
  text-underline-offset: 2px;
  flex-shrink: 0;
}

/* ── 2. Operational risks ── */
.provider-profile-root .provider-ops-risks-panel {
  border: 1px solid color-mix(in srgb, #b91c1c 18%, var(--border));
  background: color-mix(in srgb, #b91c1c 4%, #fff);
}

.provider-profile-root .provider-ops-risks-panel-clear {
  margin: 0;
  font-size: 13px;
  line-height: 1.35;
  font-weight: 700;
  color: color-mix(in srgb, #047857 80%, var(--muted));
}

.provider-profile-root .provider-ops-risks-panel-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.provider-profile-root .provider-ops-risk-card {
  padding: 8px 10px 8px 8px;
  border-radius: 7px;
  border: none;
  background: #fff;
  border-left: 3px solid color-mix(in srgb, var(--foreground) 20%, transparent);
}

.provider-profile-root .provider-ops-risk-card--high {
  border-left-color: color-mix(in srgb, #b91c1c 70%, var(--border));
}

.provider-profile-root .provider-ops-risk-card--medium {
  border-left-color: color-mix(in srgb, #d97706 65%, var(--border));
}

.provider-profile-root .provider-ops-risk-card--low {
  border-left-color: color-mix(in srgb, var(--foreground) 25%, var(--border));
}

.provider-profile-root .provider-ops-risk-card-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 4px;
}

.provider-profile-root .provider-ops-risk-card-title {
  margin: 0;
  font-size: 12px;
  font-weight: 800;
  color: var(--foreground);
}

.provider-profile-root .provider-ops-risk-severity {
  flex-shrink: 0;
  padding: 2px 7px;
  border-radius: 5px;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.provider-profile-root .provider-ops-risk-severity--high {
  color: #991b1b;
  background: color-mix(in srgb, #b91c1c 10%, #fff);
  border: 1px solid color-mix(in srgb, #b91c1c 22%, var(--border));
}

.provider-profile-root .provider-ops-risk-severity--medium {
  color: #92400e;
  background: color-mix(in srgb, #d97706 10%, #fff);
  border: 1px solid color-mix(in srgb, #d97706 22%, var(--border));
}

.provider-profile-root .provider-ops-risk-severity--low {
  color: color-mix(in srgb, var(--foreground) 60%, var(--muted));
  background: color-mix(in srgb, var(--foreground) 4%, #fff);
  border: 1px solid color-mix(in srgb, var(--foreground) 12%, var(--border));
}

.provider-profile-root .provider-ops-risk-card-headline {
  margin: 0 0 8px;
  font-size: 13px;
  font-weight: 800;
  line-height: 1.3;
  color: var(--foreground);
}

.provider-profile-root .provider-ops-risk-card .provider-ops-signals {
  margin-bottom: 8px;
}

@media (min-width: 640px) {
  .provider-profile-root .provider-ops-risk-card .provider-ops-signals {
    grid-template-columns: 1fr 1fr;
    gap: 10px 14px;
  }

  .provider-profile-root .provider-ops-risk-card .provider-ops-signals-row {
    grid-template-columns: 1fr;
    gap: 3px;
  }
}

.provider-profile-root .provider-ops-risk-mitigate {
  min-height: 30px;
  padding: 0 10px;
  border-radius: 7px;
  font-size: 11px;
  font-weight: 700;
  color: var(--brand-800);
  background: color-mix(in srgb, var(--brand-600) 8%, #fff);
  border: 1px solid color-mix(in srgb, var(--brand-600) 28%, var(--border));
  cursor: pointer;
  font-family: inherit;
}

.provider-profile-root .provider-ops-risk-mitigate:hover {
  border-color: color-mix(in srgb, var(--brand-600) 45%, var(--border));
}

/* ── 3. Strategy (operational gaps) ── */
.provider-profile-root .provider-ops-strategy {
  border: none;
  background: var(--ops-surface-raised);
}

.provider-profile-root .provider-ops-strategy-head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 6px 10px;
  margin-bottom: 8px;
}

.provider-profile-root .provider-ops-strategy-kicker {
  margin: 0;
  font-size: 10px;
  font-weight: 700;
  color: var(--muted);
}

.provider-profile-root .provider-ops-strategy-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.provider-profile-root .provider-ops-strategy-gap {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px 8px 8px 7px;
  border-radius: 7px;
  border: 1px solid color-mix(in srgb, #d97706 16%, var(--border));
  background: color-mix(in srgb, #d97706 3%, #fff);
}

.provider-profile-root .provider-ops-strategy-gap-main {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  min-width: 0;
}

.provider-profile-root .provider-ops-strategy-rank {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 900;
  color: #92400e;
  background: color-mix(in srgb, #d97706 12%, #fff);
}

.provider-profile-root .provider-ops-strategy-gap-headline {
  margin: 0 0 6px;
  font-size: 13px;
  line-height: 1.35;
  font-weight: 800;
  color: var(--foreground);
}

.provider-profile-root .provider-ops-strategy-gap-meta {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.provider-profile-root .provider-ops-strategy-gap-meta > div {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 4px 8px;
  align-items: start;
}

.provider-profile-root .provider-ops-strategy-gap-meta dt {
  margin: 0;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--muted);
  white-space: nowrap;
}

.provider-profile-root .provider-ops-strategy-gap-meta dd {
  margin: 0;
  font-size: 12px;
  line-height: 1.4;
  color: color-mix(in srgb, var(--foreground) 85%, var(--muted));
}

.provider-profile-root .provider-ops-strategy-capture {
  align-self: flex-start;
  min-height: 32px;
  padding: 0 12px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 800;
  color: #fff;
  background: var(--brand-600);
  border: 1px solid var(--brand-600);
  cursor: pointer;
  font-family: inherit;
}

.provider-profile-root .provider-ops-strategy-capture:hover {
  filter: brightness(1.05);
}

.provider-profile-root .provider-ops-strategy-empty {
  margin: 0;
  font-size: 12px;
  line-height: 1.45;
  color: var(--muted);
}

.provider-profile-root .provider-ops-strategy-empty-link {
  font-size: inherit;
  font-weight: 700;
  color: var(--brand-700);
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  font-family: inherit;
  text-decoration: underline;
}

@media (min-width: 640px) {
  .provider-profile-root .provider-ops-strategy-gap {
    flex-direction: row;
    align-items: flex-end;
    justify-content: space-between;
  }
}

/* ── 4. Mission control (next interaction) ── */
.provider-profile-root .provider-ops-mission {
  border: 2px solid color-mix(in srgb, var(--brand-600) 35%, var(--border));
  background: linear-gradient(
    165deg,
    color-mix(in srgb, var(--brand-600) 6%, #fff) 0%,
    #fff 48%
  );
  box-shadow: 0 1px 0 color-mix(in srgb, var(--foreground) 6%, transparent);
}

.provider-profile-root .provider-ops-mission-kicker {
  margin: 0 0 4px;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--brand-700);
}

.provider-profile-root .provider-ops-mission-title {
  margin: 0;
  font-size: 17px;
  font-weight: 900;
  letter-spacing: -0.02em;
  line-height: 1.15;
  color: var(--foreground);
}

.provider-profile-root .provider-ops-mission-subtitle {
  margin: -6px 0 10px;
  font-size: 13px;
  font-weight: 700;
  color: color-mix(in srgb, var(--foreground) 75%, var(--muted));
}

.provider-profile-root .provider-ops-mission .provider-ops-signals {
  margin-bottom: 8px;
}

@media (min-width: 640px) {
  .provider-profile-root .provider-ops-mission .provider-ops-signals {
    grid-template-columns: 1fr 1fr;
    gap: 10px 16px;
  }

  .provider-profile-root .provider-ops-mission .provider-ops-signals-row {
    grid-template-columns: 1fr;
    gap: 3px;
  }
}

.provider-profile-root .provider-ops-mission-lead {
  margin: 4px 0 0;
  font-size: 13px;
  line-height: 1.4;
  color: var(--muted);
}

.provider-profile-root .provider-ops-mission-when-row {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 8px 12px;
  margin-top: 8px;
}

.provider-profile-root .provider-ops-mission-when {
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  color: var(--foreground);
}

.provider-profile-root .provider-ops-mission-status {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--muted);
}

.provider-profile-root .provider-ops-mission-why {
  margin: 12px 0 0;
  padding: 10px 12px;
  border-radius: 8px;
  border-left: 3px solid var(--brand-600);
  background: color-mix(in srgb, var(--brand-600) 5%, #fff);
  font-size: 14px;
  line-height: 1.45;
  font-weight: 700;
  color: var(--foreground);
}

.provider-profile-root .provider-ops-mission-brief {
  margin: 12px 0 0;
  display: grid;
  gap: 8px;
}

.provider-profile-root .provider-ops-mission-brief > div {
  display: grid;
  grid-template-columns: minmax(7rem, 9rem) 1fr;
  gap: 6px 10px;
  align-items: start;
}

.provider-profile-root .provider-ops-mission-brief dt {
  margin: 0;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--muted);
  line-height: 1.35;
}

.provider-profile-root .provider-ops-mission-brief dd {
  margin: 0;
  font-size: 13px;
  line-height: 1.4;
  font-weight: 600;
  color: var(--foreground);
}

.provider-profile-root .provider-ops-mission-brief-detail {
  display: block;
  margin-top: 2px;
  font-size: 11px;
  font-weight: 500;
  color: var(--muted);
}

.provider-profile-root .provider-ops-mission-prep--ready {
  color: color-mix(in srgb, #047857 90%, var(--foreground));
}

.provider-profile-root .provider-ops-mission-prep--attention {
  color: color-mix(in srgb, #b45309 90%, var(--foreground));
}

.provider-profile-root .provider-ops-mission-prep--critical {
  color: color-mix(in srgb, #b91c1c 88%, var(--foreground));
  font-weight: 800;
}

.provider-profile-root .provider-ops-mission-gap-btn {
  padding: 0;
  border: none;
  background: none;
  font: inherit;
  font-size: inherit;
  font-weight: 700;
  color: var(--brand-700);
  text-align: left;
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.provider-profile-root .provider-ops-mission-gap-btn:hover {
  color: var(--brand-800);
}

.provider-profile-root .provider-ops-mission-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 10px;
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
}

.provider-profile-root .provider-ops-mission-cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  padding: 0 20px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 800;
  text-decoration: none;
  color: #fff;
  background: var(--brand-600);
  border: 1px solid var(--brand-600);
  box-shadow: 0 1px 2px color-mix(in srgb, var(--brand-800) 25%, transparent);
}

.provider-profile-root .provider-ops-mission-cta:hover {
  background: var(--brand-700);
  border-color: var(--brand-700);
}

.provider-profile-root .provider-ops-mission-cta-secondary {
  display: inline-flex;
  align-items: center;
  min-height: 40px;
  padding: 0 14px;
  border-radius: 9px;
  font-size: 12px;
  font-weight: 800;
  text-decoration: none;
  color: var(--foreground);
  background: #fff;
  border: 1px solid color-mix(in srgb, var(--foreground) 14%, var(--border));
}

.provider-profile-root .provider-ops-mission-cell .provider-ops-action-row {
  margin-top: 0;
  padding-left: 0;
}

@media (min-width: 640px) {
  .provider-profile-root .provider-ops-mission-brief {
    grid-template-columns: 1fr 1fr;
    gap: 10px 16px;
  }

  .provider-profile-root .provider-ops-mission-brief > div {
    grid-template-columns: 1fr;
    gap: 3px;
  }
}

/* ── 5. Active engagement (legacy compact — unused) ── */
.provider-profile-root .provider-ops-hero--compact {
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
  background: color-mix(in srgb, var(--foreground) 2%, #fff);
}

.provider-profile-root .provider-ops-hero--compact .provider-ops-block-title {
  margin-bottom: 6px;
}

.provider-profile-root .provider-ops-engagement-card {
  padding: 10px 12px;
  border-radius: 8px;
  background: #fff;
  border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
  border-left: 3px solid var(--brand-600);
}

.provider-profile-root .provider-ops-engagement-card--empty {
  border-left-color: color-mix(in srgb, var(--foreground) 20%, var(--border));
}

.provider-profile-root .provider-ops-engagement-kicker {
  margin: 0 0 4px;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--muted);
}

.provider-profile-root .provider-ops-engagement-type {
  margin: 0;
  font-size: 13px;
  font-weight: 800;
  color: var(--foreground);
}

.provider-profile-root .provider-ops-engagement-status {
  margin-left: 8px;
  font-size: 11px;
  font-weight: 700;
  color: var(--muted);
}

.provider-profile-root .provider-ops-engagement-title {
  margin: 2px 0 0;
  font-size: 14px;
  font-weight: 700;
}

.provider-profile-root .provider-ops-engagement-when,
.provider-profile-root .provider-ops-engagement-prep {
  margin: 2px 0 0;
  font-size: 12px;
  color: var(--muted);
}

.provider-profile-root .provider-ops-engagement-links {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
  margin-top: 6px;
}

.provider-profile-root .provider-ops-link {
  font-size: 12px;
  font-weight: 700;
  color: var(--foreground);
  text-decoration: underline;
  text-underline-offset: 2px;
}

.provider-profile-root .provider-ops-link--accent {
  color: var(--brand-700);
}

.provider-profile-root .provider-ops-quiet {
  margin: 0;
  font-size: 12px;
  line-height: 1.45;
  color: var(--muted);
}

.provider-profile-root .provider-ops-hero--compact .provider-ops-action-row {
  margin-top: 8px;
}

.provider-profile-root .provider-ops-action-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.provider-profile-root .provider-ops-action-chip {
  display: inline-flex;
  align-items: center;
  padding: 5px 10px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 700;
  color: var(--foreground);
  text-decoration: none;
  background: #fff;
  border: 1px solid color-mix(in srgb, var(--foreground) 12%, var(--border));
  cursor: pointer;
  font-family: inherit;
}

.provider-profile-root .provider-ops-action-chip:hover {
  border-color: color-mix(in srgb, var(--brand-600) 35%, var(--border));
}

.provider-profile-root .provider-ops-action-chip--muted {
  color: var(--muted);
  background: transparent;
}

.provider-profile-root .provider-ops-more-menu {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
}

.provider-profile-root .provider-ops-more-item {
  font-size: 11px;
  font-weight: 600;
  color: var(--foreground);
  text-decoration: underline;
}

.provider-profile-root .provider-ops-inline-link,
.provider-profile-root .provider-ops-inline-link-anchor {
  font-size: 12px;
  font-weight: 700;
  color: var(--brand-700);
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  font-family: inherit;
  text-decoration: underline;
  text-underline-offset: 2px;
}

/* ── 5. Recent momentum ── */
.provider-profile-root .provider-ops-momentum-panel {
  border: none;
  background: var(--ops-surface-raised);
}

.provider-profile-root .provider-ops-momentum-feeds {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
  margin-top: 6px;
}

@media (min-width: 768px) {
  .provider-profile-root .provider-ops-momentum-feeds {
    grid-template-columns: 1fr 1fr;
    align-items: start;
  }

  .provider-profile-root .provider-ops-momentum-feeds > :only-child {
    grid-column: 1 / -1;
  }
}

.provider-profile-root .provider-ops-feed-panel {
  min-width: 0;
}

.provider-profile-root .provider-ops-feed-panel .provider-cc-section-head {
  margin-bottom: 4px;
}

.provider-profile-root .provider-ops-feed-panel .provider-cc-section-title {
  font-size: 10px;
}

.provider-profile-root .provider-ops-feed-panel .provider-act-prev-list,
.provider-profile-root .provider-ops-feed-panel .provider-eng-prev-list {
  gap: 4px;
}

.provider-profile-root .provider-ops-feed-panel .provider-act-prev-item,
.provider-profile-root .provider-ops-feed-panel .provider-eng-prev-card {
  padding: 6px 8px;
  border-radius: 6px;
  background: var(--ops-surface-inset);
  border: none;
}

.provider-profile-root .provider-ops-feed-panel .provider-cc-section-meta {
  display: none;
}

/* ── 6. Below fold ── */
.provider-profile-root .provider-ops-record {
  margin-top: var(--ops-section-gap);
  padding: 16px 18px;
  border-radius: var(--ops-card-radius);
  border: none;
  background: var(--ops-surface-raised);
  box-shadow: var(--ops-card-shadow);
}

.provider-profile-root .provider-ops-record summary {
  font-size: 11px;
  font-weight: 700;
  color: var(--muted);
  cursor: pointer;
  list-style: none;
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 6px 10px;
}

.provider-profile-root .provider-ops-record summary::-webkit-details-marker {
  display: none;
}

.provider-profile-root .provider-ops-record-meta {
  font-weight: 600;
  color: color-mix(in srgb, var(--foreground) 40%, var(--muted));
}

.provider-profile-root .provider-ops-record-body {
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.provider-profile-root .provider-ops-contact {
  margin-top: 4px;
}

.provider-profile-root .provider-ops-contact summary {
  font-size: 11px;
  font-weight: 700;
  color: var(--muted);
  cursor: pointer;
}

.provider-profile-root .provider-ops-contact-body {
  margin-top: 8px;
  font-size: 12px;
}

/* ── Work streams (record) ── */
.provider-profile-root .provider-ops-work-streams {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.provider-profile-root .provider-ops-work-guidance-title {
  margin: 0 0 4px;
  font-size: 11px;
  font-weight: 700;
  color: color-mix(in srgb, var(--foreground) 55%, var(--muted));
}

.provider-profile-root .provider-ops-work-guidance-text {
  margin: 0;
  font-size: 12px;
  line-height: 1.45;
  color: color-mix(in srgb, var(--foreground) 70%, var(--muted));
}

.provider-profile-root .provider-ops-work-guidance-action {
  display: inline-block;
  margin-top: 6px;
  font-size: 11px;
  font-weight: 700;
  color: var(--brand-700);
  text-decoration: underline;
}

@media (min-width: 640px) {
  .provider-profile-root .provider-ops-cmd-grid {
    grid-template-columns: minmax(0, 0.95fr) minmax(0, 1.05fr);
    gap: 14px;
    align-items: start;
  }

  .provider-profile-root .provider-ops-cmd-right {
    padding-top: 0;
    border-top: none;
    border-left: none;
    padding-left: 16px;
  }

  .provider-profile-root .provider-ops-momentum-feeds {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .provider-profile-root .provider-ops-momentum-feeds:has(> :only-child) {
    grid-template-columns: 1fr;
  }
}

@media (min-width: 769px) {
  .provider-profile-root .provider-ops-dashboard,
  .provider-profile-root .provider-ops-briefing-flow {
    max-width: 62rem;
  }
}

.provider-profile-root--command-center .provider-profile-tab {
  min-height: 36px;
  padding: 0 11px;
  margin-bottom: -1px;
  border-radius: 6px 6px 0 0;
  border: none;
  border-bottom: 2px solid transparent;
  background: transparent;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: color-mix(in srgb, var(--foreground) 50%, transparent);
  cursor: pointer;
  transition:
    color 0.14s cubic-bezier(0.22, 1, 0.36, 1),
    background 0.14s cubic-bezier(0.22, 1, 0.36, 1),
    border-color 0.14s ease,
    box-shadow 0.14s ease;
}

.provider-profile-root--command-center .provider-profile-tab:hover {
  color: var(--foreground);
  background: color-mix(in srgb, var(--foreground) 3%, transparent);
}

.provider-profile-root--command-center .provider-profile-tab--active {
  color: var(--foreground);
  background: #fff;
  border-bottom-color: var(--brand-600, #2563eb);
  font-weight: 700;
  box-shadow: 0 -1px 0 #fff, 0 -4px 12px rgba(15, 23, 42, 0.04);
}

.provider-profile-root--command-center .provider-profile-tab:active {
  transform: scale(0.98);
}

.provider-profile-root--command-center .provider-profile-tab:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--brand-600) 45%, transparent);
  outline-offset: -2px;
}

.provider-profile-root--command-center .provider-ops-dashboard,
.provider-profile-root--command-center .provider-ops-briefing-flow {
  gap: var(--ops-section-gap);
}

.provider-profile-root--command-center .provider-ops-row {
  gap: var(--ops-section-gap);
}

.provider-profile-root--command-center .provider-ops-ops-panel {
  padding: 18px 20px;
  border-radius: var(--ops-card-radius);
  box-shadow: var(--ops-card-shadow);
}

.provider-profile-root--command-center .provider-ops-section-head {
  margin-bottom: 5px;
  gap: 6px;
}

.provider-profile-root--command-center .provider-ops-section-kicker {
  margin-top: 1px;
  font-size: 11px;
}

.provider-profile-root--command-center .provider-ops-signals {
  gap: 4px;
}

.provider-profile-root--command-center .provider-ops-signals-row {
  gap: 4px 8px;
}

.provider-profile-root--command-center .provider-ops-signals dd {
  font-size: 12px;
  line-height: 1.3;
}

/* Field command — procedural briefing */
.provider-profile-root .provider-ops-cmd--briefing {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.provider-profile-root .provider-ops-cmd-brief-head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 4px 10px;
}

.provider-profile-root .provider-ops-cmd-brief-head .provider-ops-platform-eyebrow {
  margin: 0;
}

.provider-profile-root .provider-ops-cmd-brief-head .provider-ops-cmd-lane {
  margin: 0;
  font-size: 10px;
  font-weight: 700;
  color: color-mix(in srgb, var(--foreground) 52%, var(--muted));
}

.provider-profile-root .provider-ops-cmd-brief-block--directive {
  padding: 6px 8px;
  border-radius: 6px;
  background: var(--ops-surface-accent);
  border: none;
}

.provider-profile-root .provider-ops-cmd-brief-label {
  margin: 0 0 4px;
  font-size: 9px;
  font-weight: 900;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: color-mix(in srgb, #0f4c5c 50%, var(--muted));
}

.provider-profile-root .provider-ops-cmd-brief-block--directive .provider-ops-cmd-brief-label {
  color: color-mix(in srgb, var(--brand-800) 75%, var(--muted));
}

.provider-profile-root .provider-ops-cmd-directive {
  margin: 0;
  font-size: 14px;
  font-weight: 800;
  line-height: 1.35;
  letter-spacing: -0.02em;
  color: var(--foreground);
}

.provider-profile-root .provider-ops-cmd-brief-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
}

@media (min-width: 560px) {
  .provider-profile-root .provider-ops-cmd-brief-grid {
    grid-template-columns: 1fr 1fr;
    gap: 8px 12px;
  }
}

.provider-profile-root .provider-ops-cmd-brief-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.provider-profile-root .provider-ops-cmd-brief-item {
  display: block;
  width: 100%;
  text-align: left;
  padding: 3px 0;
  border: none;
  background: none;
  font: inherit;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.35;
  color: var(--foreground);
  cursor: pointer;
}

.provider-profile-root .provider-ops-cmd-brief-list--validated .provider-ops-cmd-brief-item {
  color: color-mix(in srgb, var(--foreground) 88%, var(--muted));
}

.provider-profile-root .provider-ops-cmd-brief-list--risk .provider-ops-cmd-brief-item {
  padding-left: 10px;
  border-left: 2px solid color-mix(in srgb, #d97706 60%, transparent);
  color: color-mix(in srgb, #92400e 35%, var(--foreground));
}

.provider-profile-root .provider-ops-cmd-brief-item:hover {
  background: color-mix(in srgb, var(--brand-600) 4%, transparent);
}

.provider-profile-root .provider-ops-cmd-brief-empty {
  margin: 0;
  font-size: 11px;
  line-height: 1.35;
  font-weight: 600;
  color: color-mix(in srgb, var(--foreground) 55%, var(--muted));
}

.provider-profile-root .provider-ops-cmd-brief-block--unlocks {
  padding-top: 2px;
}

.provider-profile-root .provider-ops-cmd-unlocks {
  margin: 0;
  font-size: 11px;
  line-height: 1.4;
  font-weight: 600;
  color: color-mix(in srgb, var(--foreground) 78%, var(--muted));
}

.provider-profile-root .provider-ops-cmd-brief-block--action {
  padding: 6px 8px;
  border-radius: 6px;
  border: none;
  background: var(--ops-surface-inset);
}

.provider-profile-root .provider-ops-cmd-next-action {
  margin: 0;
  font-size: 13px;
  font-weight: 800;
  line-height: 1.35;
  color: var(--brand-800);
}

.provider-profile-root--command-center .provider-ops-cmd--briefing {
  gap: 6px;
}

.provider-profile-root--command-center .provider-ops-cmd-directive {
  font-size: 13px;
}

.provider-profile-root--command-center .provider-ops-cmd-brief-block--directive {
  padding: 5px 7px;
}

/* Field command — executive band (legacy) */
.provider-profile-root--command-center .provider-ops-cmd--executive .provider-ops-cmd-intro {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 10px;
  margin-bottom: 6px;
}

.provider-profile-root--command-center .provider-ops-cmd--executive .provider-ops-platform-eyebrow {
  margin: 0;
}

.provider-profile-root--command-center .provider-ops-cmd-title-row {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 8px;
  min-width: 0;
}

.provider-profile-root--command-center .provider-ops-cmd-title-row .provider-ops-block-title {
  font-size: 10px;
}

.provider-profile-root--command-center .provider-ops-cmd-lane {
  margin: 0;
  font-size: 11px;
  font-weight: 800;
  line-height: 1.25;
  color: var(--foreground);
  letter-spacing: -0.01em;
}

.provider-profile-root--command-center .provider-ops-cmd-executive-grid {
  display: grid;
  gap: 6px;
  min-width: 0;
}

@media (min-width: 720px) {
  .provider-profile-root--command-center .provider-ops-cmd-executive-grid {
    grid-template-columns: minmax(0, 0.95fr) minmax(0, 1.05fr);
    gap: 8px 12px;
    align-items: start;
  }
}

.provider-profile-root--command-center .provider-ops-cmd--executive .provider-ops-readiness--strip {
  margin: 0;
}

.provider-profile-root--command-center .provider-ops-cmd--executive .provider-ops-readiness-heading {
  margin: 0 0 4px;
  font-size: 9px;
}

.provider-profile-root--command-center .provider-ops-cmd--executive .provider-ops-readiness-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 4px 6px;
}

@media (min-width: 720px) {
  .provider-profile-root--command-center .provider-ops-cmd--executive .provider-ops-readiness-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (min-width: 960px) {
  .provider-profile-root--command-center .provider-ops-cmd--executive .provider-ops-readiness-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

.provider-profile-root--command-center .provider-ops-cmd--executive .provider-ops-readiness-cell {
  padding: 4px 6px;
  border-radius: 6px;
}

.provider-profile-root--command-center .provider-ops-cmd--executive .provider-ops-readiness-label {
  margin-bottom: 2px;
  font-size: 8px;
}

.provider-profile-root--command-center .provider-ops-cmd--executive .provider-ops-readiness-state {
  font-size: 11px;
}

.provider-profile-root--command-center .provider-ops-cmd--executive .provider-ops-momentum-indicators {
  margin-top: 8px;
  padding-top: 8px;
  border-top: none;
}

.provider-profile-root--command-center .provider-ops-cmd--executive .provider-ops-momentum-indicators-heading {
  margin-bottom: 4px;
  font-size: 9px;
}

.provider-profile-root--command-center .provider-ops-cmd--executive .provider-ops-momentum-indicators-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.provider-profile-root--command-center .provider-ops-cmd--executive .provider-ops-momentum-indicators-list > li {
  flex: 1 1 9.5rem;
  min-width: 0;
  max-width: 100%;
}

.provider-profile-root--command-center .provider-ops-cmd--executive .provider-ops-momentum-chip {
  flex-direction: row;
  align-items: baseline;
  justify-content: space-between;
  gap: 6px;
  padding: 4px 7px;
  border-radius: 5px;
  border-left-width: 2px;
}

.provider-profile-root--command-center .provider-ops-cmd--executive .provider-ops-momentum-chip-label {
  font-size: 10px;
  flex-shrink: 0;
}

.provider-profile-root--command-center .provider-ops-cmd--executive .provider-ops-momentum-chip-scan {
  font-size: 9px;
  line-height: 1.25;
  text-align: right;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.provider-profile-root--command-center .provider-ops-cmd--executive .provider-ops-stage-progression {
  margin-top: 6px;
  padding-top: 6px;
}

.provider-profile-root--command-center .provider-ops-cmd--executive .provider-ops-stage-progression-head {
  margin-bottom: 4px;
}

.provider-profile-root--command-center .provider-ops-cmd--executive .provider-ops-stage-progression-heading {
  font-size: 9px;
}

.provider-profile-root--command-center .provider-ops-cmd--executive .provider-ops-stage-progression-pct {
  font-size: 10px;
}

.provider-profile-root--command-center .provider-ops-cmd--executive .provider-ops-stage-progression-track {
  height: 4px;
  margin-bottom: 5px;
}

.provider-profile-root--command-center .provider-ops-cmd--executive .provider-ops-stage-progression-list {
  display: flex;
  flex-wrap: wrap;
  gap: 3px 8px;
}

.provider-profile-root--command-center .provider-ops-cmd--executive .provider-ops-stage-progression-item,
.provider-profile-root--command-center .provider-ops-cmd--executive button.provider-ops-stage-progression-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 0;
  font-size: 10px;
  line-height: 1.3;
}

.provider-profile-root--command-center .provider-ops-cmd--executive .provider-ops-stage-progression-marker {
  font-size: 9px;
}

/* Intel row — denser feasibility + map */
@media (min-width: 768px) {
  .provider-profile-root--command-center .provider-ops-row--intel {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: 6px;
  }
}

.provider-profile-root--command-center .provider-ops-obs-readiness-engine {
  gap: 8px;
}

.provider-profile-root--command-center .provider-ops-obs-readiness-left {
  padding: 6px 8px;
}

.provider-profile-root--command-center .provider-ops-obs-readiness-col {
  padding: 5px 6px;
}

.provider-profile-root--command-center .provider-ops-discovery-pulses {
  gap: 3px;
}

.provider-profile-root--command-center .provider-ops-discovery-pulse {
  padding: 5px 8px;
}

.provider-profile-root--command-center .provider-ops-row--ops:not(.provider-ops-row--single) {
  gap: 6px;
}

/* Quiet surfaces — reduce outline fatigue on overview */
.provider-profile-root--command-center .provider-profile-body {
  background: var(--ops-surface-page);
}

.provider-profile-root--command-center .provider-readiness-bar {
  border: none;
  background: var(--ops-surface-inset);
}

.provider-profile-root--command-center .provider-readiness-bar--limited {
  border: var(--ops-border-warn);
}

.provider-profile-root--command-center .provider-readiness-bar--building {
  border: none;
}

.provider-profile-root--command-center .provider-readiness-bar--strong {
  border: none;
}

.provider-profile-root--command-center .provider-ops-cmd,
.provider-profile-root--command-center .provider-ops-ops-panel,
.provider-profile-root--command-center .provider-ops-discovery-panel,
.provider-profile-root--command-center .provider-ops-strategy,
.provider-profile-root--command-center .provider-ops-momentum-panel,
.provider-profile-root--command-center .provider-ops-obs-readiness,
.provider-profile-root--command-center .provider-ops-efficiency-panel {
  border: none;
}

.provider-profile-root--command-center .provider-ops-obs-readiness--warn {
  border: var(--ops-border-warn);
}

.provider-profile-root--command-center .provider-ops-obs-readiness--blocked {
  border: var(--ops-border-blocked);
}

.provider-profile-root--command-center .provider-ops-cmd--warn {
  border: var(--ops-border-warn);
}

.provider-profile-root--command-center .provider-ops-risks-panel {
  border: var(--ops-border-blocked);
}

.provider-profile-root--command-center .provider-ops-strategy-gap {
  border: var(--ops-border-warn);
}

.provider-profile-root--command-center .provider-ops-obs-readiness-item {
  border-bottom-color: transparent;
}

.provider-profile-root--command-center .provider-ops-obs-readiness-list--blocking .provider-ops-obs-readiness-item,
.provider-profile-root--command-center .provider-ops-obs-readiness-list--unknown .provider-ops-obs-readiness-item {
  border-bottom-color: color-mix(in srgb, var(--foreground) 5%, transparent);
}

/* ── Surgical operations UI (overview cards) ── */
.provider-profile-root .provider-ops-ops-panel--surgical {
  padding: 10px 12px 11px;
  border-radius: 6px;
}

.provider-profile-root .provider-ops-block-title {
  font-size: 10px;
  letter-spacing: 0.12em;
  color: color-mix(in srgb, #0f4c5c 62%, var(--muted));
}

.provider-profile-root .provider-ops-section-kicker {
  font-size: 10px;
  font-weight: 700;
  color: color-mix(in srgb, var(--foreground) 52%, var(--muted));
  letter-spacing: 0.02em;
}

.provider-profile-root .provider-ops-finding,
.provider-profile-root .provider-ops-finding-label,
.provider-profile-root .provider-ops-finding-value {
  display: block;
}

.provider-profile-root .provider-ops-findings-table {
  display: flex;
  flex-direction: column;
  gap: 0;
  border-radius: 5px;
  overflow: hidden;
  background: var(--ops-surface-inset);
}

.provider-profile-root .provider-ops-finding {
  display: grid;
  grid-template-columns: minmax(5.5rem, 6.5rem) minmax(0, 1fr);
  gap: 6px 10px;
  padding: 5px 8px;
  border-bottom: 1px solid color-mix(in srgb, var(--foreground) 5%, transparent);
  align-items: baseline;
}

.provider-profile-root .provider-ops-finding:last-child {
  border-bottom: none;
}

.provider-profile-root .provider-ops-finding-label {
  font-size: 9px;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted);
  line-height: 1.25;
}

.provider-profile-root .provider-ops-finding-value {
  font-size: 11px;
  font-weight: 700;
  line-height: 1.35;
  color: var(--foreground);
}

.provider-profile-root .provider-ops-finding--validated .provider-ops-finding-value {
  color: color-mix(in srgb, #047857 88%, var(--foreground));
}

.provider-profile-root .provider-ops-finding--open .provider-ops-finding-value,
.provider-profile-root .provider-ops-finding--warn .provider-ops-finding-value {
  color: color-mix(in srgb, #92400e 75%, var(--foreground));
}

.provider-profile-root .provider-ops-finding--blocked .provider-ops-finding-value {
  color: color-mix(in srgb, #b91c1c 88%, var(--foreground));
}

/* Field command — surgical briefing */
.provider-profile-root .provider-ops-cmd--surgical {
  gap: 8px;
}

.provider-profile-root .provider-ops-cmd-lane-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--brand-800);
  background: color-mix(in srgb, var(--brand-600) 10%, #fff);
}

.provider-profile-root .provider-ops-cmd-risk-band .provider-field-time-risk--hero {
  padding: 6px 8px;
  border-radius: 5px;
}

.provider-profile-root .provider-ops-cmd-risk-band .provider-field-time-risk-guidance {
  display: none;
}

/* Pathway progression confidence */
.provider-profile-root .provider-ops-pathway-confidence {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 4px 0 2px;
}

.provider-profile-root .provider-ops-pathway-confidence-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.provider-profile-root .provider-ops-pathway-confidence-row {
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding: 4px 0;
  border-bottom: 1px solid color-mix(in srgb, var(--foreground) 6%, transparent);
}

.provider-profile-root .provider-ops-pathway-confidence-row:last-child {
  border-bottom: none;
}

.provider-profile-root .provider-ops-pathway-confidence-top {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
}

.provider-profile-root .provider-ops-pathway-confidence-label {
  font-size: 11px;
  font-weight: 600;
  color: color-mix(in srgb, var(--foreground) 78%, transparent);
}

.provider-profile-root .provider-ops-pathway-confidence-badge {
  flex-shrink: 0;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  padding: 1px 6px;
  border-radius: 3px;
}

.provider-profile-root .provider-ops-pathway-confidence-badge--emerging {
  color: #6b7280;
  background: color-mix(in srgb, #6b7280 12%, #fff);
}

.provider-profile-root .provider-ops-pathway-confidence-badge--low {
  color: #b45309;
  background: color-mix(in srgb, #d97706 14%, #fff);
}

.provider-profile-root .provider-ops-pathway-confidence-badge--moderate {
  color: #1d4ed8;
  background: color-mix(in srgb, #3b82f6 12%, #fff);
}

.provider-profile-root .provider-ops-pathway-confidence-badge--solid {
  color: #047857;
  background: color-mix(in srgb, #10b981 14%, #fff);
}

.provider-profile-root .provider-ops-pathway-confidence-scan {
  margin: 0;
  font-size: 10px;
  line-height: 1.35;
  color: color-mix(in srgb, var(--foreground) 58%, transparent);
}

.provider-profile-root .provider-field-time-risk-inputs--hero-strip {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin: 4px 0 0;
  padding: 0;
  list-style: none;
}

.provider-profile-root .provider-field-time-risk-strip-dot {
  display: block;
  width: 8px;
  height: 8px;
  border-radius: 2px;
  background: color-mix(in srgb, var(--foreground) 20%, transparent);
}

.provider-profile-root .provider-field-time-risk-strip-dot--strong {
  background: #047857;
}

.provider-profile-root .provider-field-time-risk-strip-dot--partial {
  background: color-mix(in srgb, #1d4ed8 70%, transparent);
}

.provider-profile-root .provider-field-time-risk-strip-dot--open {
  background: #d97706;
}

.provider-profile-root .provider-field-time-risk-strip-dot--blocking {
  background: #b91c1c;
}

.provider-profile-root .provider-ops-cmd-findings-band {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px 12px;
}

.provider-profile-root .provider-ops-cmd-findings {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.provider-profile-root .provider-ops-cmd-finding-btn {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  width: 100%;
  padding: 3px 0;
  border: none;
  background: none;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.provider-profile-root .provider-ops-cmd-finding-btn:hover .provider-ops-cmd-finding-text {
  color: var(--brand-700);
}

.provider-profile-root .provider-ops-cmd-finding-marker {
  flex-shrink: 0;
  width: 12px;
  font-size: 10px;
  font-weight: 900;
  line-height: 1.35;
  color: var(--muted);
}

.provider-profile-root .provider-ops-cmd-findings--validated .provider-ops-cmd-finding-marker {
  color: #047857;
}

.provider-profile-root .provider-ops-cmd-findings--open .provider-ops-cmd-finding-marker {
  color: #d97706;
}

.provider-profile-root .provider-ops-cmd-finding-text {
  font-size: 11px;
  font-weight: 700;
  line-height: 1.35;
  color: var(--foreground);
}

.provider-profile-root .provider-ops-cmd-status-table {
  margin-top: 2px;
}

.provider-profile-root .provider-ops-cmd-brief-empty {
  font-size: 10px;
  font-weight: 700;
  color: color-mix(in srgb, var(--foreground) 45%, var(--muted));
}

/* Strategy gaps — findings rows */
.provider-profile-root .provider-ops-strategy-findings {
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 100%;
}

.provider-profile-root .provider-ops-strategy-findings .provider-ops-finding {
  padding: 3px 0;
  border-bottom: none;
  background: none;
}

.provider-profile-root .provider-ops-strategy-rank {
  font-variant-numeric: tabular-nums;
  font-size: 10px;
  color: color-mix(in srgb, var(--foreground) 40%, var(--muted));
  background: transparent;
}

.provider-profile-root .provider-ops-strategy-gap-headline {
  display: none;
}

.provider-profile-root .provider-ops-known-unknown--surgical .provider-intel-scan-primary {
  font-size: 11px;
}

.provider-profile-root .provider-ops-discovery-pulse-meta {
  font-size: 10px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.04em;
  color: color-mix(in srgb, var(--foreground) 50%, var(--muted));
}

.provider-profile-root .provider-ops-obs-readiness-scan {
  margin: 0;
  font-size: 11px;
  font-weight: 600;
  line-height: 1.35;
  color: color-mix(in srgb, var(--foreground) 68%, var(--muted));
}

.provider-profile-root .provider-ops-obs-readiness-interpretation {
  display: none;
}

.provider-profile-root .provider-ops-obs-readiness-state {
  font-size: 14px;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}

/* Operational impact — blocker consequences */
.provider-profile-root .provider-ops-operational-impact {
  margin: 3px 0 0;
  font-size: 10px;
  line-height: 1.35;
  font-weight: 600;
  color: color-mix(in srgb, var(--foreground) 62%, var(--muted));
}

.provider-profile-root .provider-ops-operational-impact--compact {
  margin: 2px 0 0;
  font-size: 9px;
  line-height: 1.3;
}

.provider-profile-root .provider-ops-operational-impact-label {
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: color-mix(in srgb, #92400e 55%, var(--muted));
}

.provider-profile-root .provider-ops-operational-impact-text {
  font-weight: 600;
  color: color-mix(in srgb, var(--foreground) 72%, var(--muted));
}

.provider-profile-root .provider-ops-operational-impact--structured {
  margin-top: 6px;
  font-size: 10px;
  font-weight: 600;
}

.provider-profile-root .provider-ops-operational-impact-heading {
  margin: 0 0 4px;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: color-mix(in srgb, #92400e 55%, var(--muted));
}

.provider-profile-root .provider-ops-operational-impact-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.provider-profile-root .provider-ops-operational-impact-item {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.provider-profile-root .provider-ops-operational-impact-dim {
  font-size: 8px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--foreground) 48%, var(--muted));
}

.provider-profile-root .provider-ops-finding--impact-scan {
  grid-column: 1 / -1;
  padding: 2px 0 0;
}

.provider-profile-root .provider-ops-finding--impact-scan .provider-intel-scan-tags {
  gap: 2px 3px;
}

.provider-profile-root .provider-intel-mission-brief-row--impact dd {
  margin: 0;
}

.provider-profile-root .provider-intel-area-confidence-gap-item .provider-ops-operational-impact {
  margin: 4px 0 0 8px;
  padding-left: 8px;
  border-left: 2px solid color-mix(in srgb, #92400e 25%, transparent);
}

.provider-profile-root .provider-ops-cmd-finding-body {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0;
  min-width: 0;
}

.provider-profile-root .provider-ops-cmd-finding-btn {
  align-items: flex-start;
}


.provider-profile-root .provider-ops-obs-readiness-col .provider-intel-scan-list {
  margin-top: 2px;
}

.provider-profile-root .provider-ops-obs-readiness-col-title {
  margin: 0 0 2px;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.provider-profile-root .provider-ops-finding--warn .provider-ops-finding-value {
  color: color-mix(in srgb, var(--foreground) 75%, var(--muted));
  font-weight: 600;
}
`;
