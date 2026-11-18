export const engagementWizardPreparationCss = `
.ew-prep-root {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

.ew-prep-root--strategic {
  display: flex;
  flex-direction: column;
}

.ew-prep-hierarchy-stack {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
}

.ew-prep-guidance--compact {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

.ew-prep-compact {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.ew-prep-compact-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 2px;
}

.ew-prep-compact-mode-chip {
  font-size: 10px;
  font-weight: 700;
  color: var(--brand-800);
  background: color-mix(in srgb, var(--brand-600) 10%, #fff);
  border: 1px solid color-mix(in srgb, var(--brand-600) 20%, var(--border));
  border-radius: 999px;
  padding: 3px 10px;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ew-prep-compact-apply-all {
  font-size: 10px;
  font-weight: 700;
  color: var(--brand-700);
  background: transparent;
  border: 1px solid color-mix(in srgb, var(--brand-600) 35%, var(--border));
  border-radius: 6px;
  padding: 4px 10px;
  cursor: pointer;
}

.ew-prep-compact-apply-all:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.ew-prep-compact-core {
  display: flex;
  flex-direction: column;
  gap: 0;
  border: 1px solid var(--border);
  border-radius: 10px;
  overflow: hidden;
  background: #fff;
}

.ew-prep-compact-section {
  padding: 10px 12px;
  border-bottom: 1px solid color-mix(in srgb, var(--border) 80%, transparent);
}

.ew-prep-compact-section:last-child {
  border-bottom: none;
}

.ew-prep-compact-section-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
}

.ew-prep-compact-section-title {
  margin: 0;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--muted);
}

.ew-prep-compact-action {
  flex-shrink: 0;
  font-size: 10px;
  font-weight: 700;
  color: var(--brand-700);
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.ew-prep-compact-action:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.ew-prep-compact-goal {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.45;
  color: var(--text);
}

.ew-prep-compact-why {
  margin: 6px 0 0;
  font-size: 11px;
  line-height: 1.4;
  color: var(--muted);
}

.ew-prep-compact-list {
  margin: 0;
  padding-left: 1.1rem;
  font-size: 12px;
  line-height: 1.45;
  color: var(--text);
}

.ew-prep-compact-list--numbered {
  list-style: decimal;
}

.ew-prep-compact-list li + li {
  margin-top: 4px;
}

.ew-prep-compact-signals {
  list-style: none;
  padding-left: 0;
}

.ew-prep-compact-signal {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 6px;
}

.ew-prep-compact-signal + .ew-prep-compact-signal {
  margin-top: 6px;
}

.ew-prep-compact-signal-tag {
  font-size: 9px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  padding: 2px 6px;
  border-radius: 4px;
  background: color-mix(in srgb, var(--muted) 12%, #fff);
  color: var(--muted);
}

.ew-prep-compact-signal-tag--observable {
  color: #0d6e6e;
  background: color-mix(in srgb, #0d6e6e 10%, #fff);
}

.ew-prep-compact-signal-tag--evaluatable {
  color: #6b4c9a;
  background: color-mix(in srgb, #6b4c9a 10%, #fff);
}

.ew-prep-compact-signal-tag--adoptable {
  color: #b45309;
  background: color-mix(in srgb, #b45309 10%, #fff);
}

.ew-prep-compact-signal-text {
  font-size: 12px;
  line-height: 1.4;
  flex: 1;
  min-width: 0;
}

.ew-prep-compact-next {
  margin: 0;
  font-size: 12px;
  line-height: 1.45;
  font-style: italic;
  color: var(--text);
}

.ew-prep-compact-next-alt {
  margin: 6px 0 0;
  font-size: 11px;
  line-height: 1.4;
  color: var(--muted);
}

.ew-prep-compact-next-alt-label {
  font-weight: 700;
  font-style: normal;
}

.ew-prep-compact-muted {
  margin: 0 0 6px;
  font-size: 11px;
  line-height: 1.4;
  color: var(--muted);
}

.ew-prep-compact-status {
  margin: 0;
  font-size: 12px;
  color: var(--muted);
}

.ew-prep-optional {
  border: 1px solid color-mix(in srgb, var(--border) 90%, transparent);
  border-radius: 8px;
  background: color-mix(in srgb, var(--muted) 3%, #fff);
}

.ew-prep-optional-summary {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 6px;
  padding: 8px 10px;
  cursor: pointer;
  list-style: none;
  font-size: 11px;
  font-weight: 700;
  color: var(--text);
}

.ew-prep-optional-summary::-webkit-details-marker {
  display: none;
}

.ew-prep-optional-summary::before {
  content: "▸";
  display: inline-block;
  margin-right: 6px;
  font-size: 10px;
  color: var(--muted);
  transition: transform 0.15s ease;
}

.ew-prep-optional[open] > .ew-prep-optional-summary::before {
  transform: rotate(90deg);
}

.ew-prep-optional-hint {
  font-size: 10px;
  font-weight: 500;
  color: var(--muted);
}

.ew-prep-optional-body {
  padding: 0 10px 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ew-prep-optional-body .ew-prep-mode-select,
.ew-prep-optional-body .ew-prep-product-focus {
  margin-bottom: 0;
}

.ew-prep-optional-body .ew-prep-compact-section {
  border: 1px solid var(--border);
  border-radius: 8px;
}

.ew-prep-manual-slot {
  margin-top: 2px;
}

.ew-prep-hierarchy,
.ew-prep-hierarchy-stack .ew-prep-hierarchy {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}

.ew-prep-hierarchy-tier {
  min-width: 0;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
  background: #fff;
}

.ew-prep-hierarchy-tier--primary {
  border-color: color-mix(in srgb, var(--brand-600) 20%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 3%, #fff);
  box-shadow: 0 1px 0 color-mix(in srgb, var(--brand-600) 6%, transparent);
}

.ew-prep-hierarchy-tier--secondary {
  border-color: color-mix(in srgb, var(--muted) 22%, var(--border));
  background: color-mix(in srgb, var(--muted) 3%, #fff);
}

.ew-prep-hierarchy-tier--tertiary {
  border-style: dashed;
  border-color: color-mix(in srgb, var(--muted) 30%, var(--border));
  background: color-mix(in srgb, var(--muted) 2%, #fff);
}

.ew-prep-hierarchy-tier-head {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 12px 0;
}

.ew-prep-hierarchy-step {
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 800;
  color: var(--brand-800);
  background: color-mix(in srgb, var(--brand-600) 14%, #fff);
  border: 1px solid color-mix(in srgb, var(--brand-600) 28%, var(--border));
}

.ew-prep-hierarchy-tier--tertiary .ew-prep-hierarchy-step {
  color: var(--muted);
  background: color-mix(in srgb, var(--muted) 8%, #fff);
  border-color: color-mix(in srgb, var(--muted) 22%, var(--border));
}

.ew-prep-hierarchy-tier-titles {
  min-width: 0;
  flex: 1;
}

.ew-prep-hierarchy-title {
  margin: 0;
  font-size: 12px;
  font-weight: 800;
  line-height: 1.3;
  color: var(--text);
}

.ew-prep-hierarchy-tier--tertiary .ew-prep-hierarchy-title {
  font-size: 11px;
  font-weight: 700;
  color: var(--muted);
}

.ew-prep-hierarchy-desc {
  margin: 3px 0 0;
  font-size: 10px;
  line-height: 1.4;
  color: var(--muted);
}

.ew-prep-hierarchy-tier-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px 12px 12px;
  min-width: 0;
}

.ew-prep-hierarchy-tier--tertiary .ew-prep-hierarchy-tier-body {
  padding-top: 4px;
}

.ew-prep-hierarchy-tier-body > .ew-prep-suggestion-card,
.ew-prep-hierarchy-tier-body > .ew-prep-discovery-focus,
.ew-prep-hierarchy-tier-body > .ew-prep-specialization,
.ew-prep-hierarchy-tier-body > .ew-prep-workflow-hint,
.ew-prep-hierarchy-tier-body > .ew-prep-specialty-focus {
  margin: 0;
}

.ew-prep-apply-plan-btn--tier {
  align-self: flex-start;
  margin-top: 2px;
}

.ew-prep-observation-qualify {
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--brand-600) 14%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 4%, #fff);
}

.ew-prep-observation-qualify-lead {
  margin: 0;
  font-size: 10px;
  line-height: 1.45;
  color: var(--text);
}

.ew-prep-observation-qualify-question {
  margin: 6px 0 0;
  font-size: 10px;
  line-height: 1.4;
}

.ew-prep-observation-qualify-label {
  font-weight: 700;
  color: var(--muted);
}

.ew-prep-hierarchy-tier--tertiary .ew-prep-playbooks-wrap {
  border: none;
  margin: 0;
  padding: 0;
  background: transparent;
  box-shadow: none;
}

.ew-prep-hierarchy-tier--tertiary .ew-prep-guides--optional {
  border: none;
  background: transparent;
}

.ew-prep-hierarchy-tier--secondary .ew-prep-customize {
  border: none;
  margin: 0;
  background: transparent;
}

.ew-prep-mode-select {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 12px;
  margin-bottom: 10px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--brand-600) 22%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 5%, #fff);
}

.ew-prep-mode-select-label {
  display: block;
  margin-bottom: 4px;
  font-size: 10px;
  font-weight: 800;
  color: var(--text);
}

.ew-prep-mode-select-control {
  width: 100%;
  font-size: 11px;
}

.ew-prep-mode-select-preview-title {
  margin: 0;
  font-size: 10px;
  font-weight: 800;
  color: var(--text);
}

.ew-prep-mode-select-preview-summary {
  margin: 3px 0 0;
  font-size: 10px;
  line-height: 1.4;
  color: var(--muted);
}

.ew-prep-mode-select-preview-hint {
  margin: 4px 0 0;
  font-size: 10px;
  line-height: 1.35;
  color: var(--muted);
  font-style: italic;
}

.ew-prep-product-focus {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--brand-600) 16%, var(--border));
  background: #fff;
}

.ew-prep-product-focus--discovery {
  border-color: color-mix(in srgb, var(--muted) 28%, var(--border));
  background: color-mix(in srgb, var(--muted) 4%, #fff);
}

.ew-prep-product-focus--selected {
  border-color: color-mix(in srgb, var(--brand-600) 28%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 6%, #fff);
}

.ew-prep-product-focus-label {
  display: block;
  margin-bottom: 4px;
  font-size: 10px;
  font-weight: 800;
  color: var(--text);
}

.ew-prep-product-focus-optional {
  font-weight: 600;
  color: var(--muted);
}

.ew-prep-product-focus-select {
  width: 100%;
  font-size: 11px;
}

.ew-prep-product-focus-preview-title {
  margin: 0;
  font-size: 10px;
  font-weight: 800;
  color: var(--text);
}

.ew-prep-product-focus-preview-summary {
  margin: 3px 0 0;
  font-size: 10px;
  line-height: 1.4;
  color: var(--muted);
}

.ew-prep-product-focus-preview-workflow {
  margin: 4px 0 0;
  font-size: 10px;
  line-height: 1.4;
  font-style: italic;
  color: var(--brand-800);
}

.ew-prep-product-focus-opp-hint {
  margin: 0;
  font-size: 9px;
  line-height: 1.35;
  color: var(--muted);
}

.ew-prep-dominant-mode {
  margin: 0 0 8px;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--brand-600) 22%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 6%, #fff);
}

.ew-prep-dominant-mode--general_discovery,
.ew-prep-dominant-mode--workflow_discovery {
  border-color: color-mix(in srgb, var(--muted) 28%, var(--border));
  background: color-mix(in srgb, var(--muted) 5%, #fff);
}

.ew-prep-dominant-mode--product_exploration,
.ew-prep-dominant-mode--product_workflow {
  border-color: color-mix(in srgb, var(--brand-600) 30%, var(--border));
}

.ew-prep-dominant-mode--observation_qualification {
  border-color: color-mix(in srgb, #0d6e6e 28%, var(--border));
  background: color-mix(in srgb, #0d6e6e 5%, #fff);
}

.ew-prep-dominant-mode--evaluation_preparation,
.ew-prep-dominant-mode--product_evaluation {
  border-color: color-mix(in srgb, #6b4c9a 24%, var(--border));
  background: color-mix(in srgb, #6b4c9a 5%, #fff);
}

.ew-prep-dominant-mode--live_case_support,
.ew-prep-dominant-mode--product_observation {
  border-color: color-mix(in srgb, #b45309 26%, var(--border));
  background: color-mix(in srgb, #b45309 5%, #fff);
}

.ew-prep-dominant-mode-label {
  margin: 0;
  font-size: 11px;
  font-weight: 800;
  color: var(--text);
}

.ew-prep-dominant-mode-summary {
  margin: 3px 0 0;
  font-size: 10px;
  line-height: 1.4;
  color: var(--muted);
}

.ew-prep-suggestions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

.ew-prep-playbooks-wrap {
  min-width: 0;
}

.ew-prep-playbooks-wrap--optional {
  margin-top: 2px;
}

.ew-prep-context {
  padding: 8px 10px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--foreground) 4%, var(--surface));
  border: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
}

.ew-prep-context-line {
  margin: 0;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.35;
  color: var(--foreground);
  word-break: break-word;
}

.ew-prep-context-sep {
  margin: 0 4px;
  color: var(--muted);
  font-weight: 600;
}

.ew-prep-context-meta {
  margin: 4px 0 0;
  font-size: 10px;
}

.ew-prep-context-meta a {
  color: var(--brand-700);
  font-weight: 700;
  text-decoration: none;
}

/* Intro call — compact readiness snapshot (≤2 lines) */
.ew-prep-readiness-snapshot {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 0 0 6px;
  border-bottom: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
  min-width: 0;
}

.ew-prep-readiness-snapshot-primary {
  display: grid;
  grid-template-columns: 1fr auto;
  grid-template-rows: auto auto;
  gap: 2px 8px;
  align-items: center;
}

.ew-prep-readiness-snapshot-headline {
  margin: 0;
  grid-column: 1 / -1;
  font-size: 11px;
  font-weight: 800;
  line-height: 1.25;
  color: var(--foreground);
  letter-spacing: -0.01em;
}

.ew-prep-readiness-snapshot-stats {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.ew-prep-readiness-snapshot-level {
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.ew-prep-readiness-snapshot--strong .ew-prep-readiness-snapshot-level {
  color: var(--brand-700);
}

.ew-prep-readiness-snapshot--solid .ew-prep-readiness-snapshot-level {
  color: var(--brand-800);
}

.ew-prep-readiness-snapshot--minimal .ew-prep-readiness-snapshot-level {
  color: var(--muted);
}

.ew-prep-readiness-snapshot-pct {
  font-size: 10px;
  font-weight: 700;
  color: var(--muted);
  font-variant-numeric: tabular-nums;
}

.ew-prep-readiness-snapshot-bar {
  grid-column: 1 / -1;
  height: 4px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--foreground) 8%, var(--border));
  overflow: hidden;
}

.ew-prep-readiness-snapshot-bar-fill {
  display: block;
  height: 100%;
  border-radius: 999px;
  background: var(--brand-600);
  transition: width 0.15s ease;
}

.ew-prep-readiness-snapshot--minimal .ew-prep-readiness-snapshot-bar-fill {
  background: color-mix(in srgb, var(--muted) 70%, var(--foreground));
}

.ew-prep-readiness-snapshot-gaps {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 6px;
  min-width: 0;
}

.ew-prep-readiness-snapshot-gaps-label {
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--muted);
  flex-shrink: 0;
}

.ew-prep-readiness-snapshot-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin: 0;
  padding: 0;
  list-style: none;
  min-width: 0;
}

.ew-prep-readiness-snapshot-chip {
  padding: 2px 7px;
  border-radius: 999px;
  font-size: 9px;
  font-weight: 700;
  line-height: 1.2;
  color: color-mix(in srgb, #b45309 90%, var(--foreground));
  background: color-mix(in srgb, #f59e0b 12%, #fff);
  border: 1px solid color-mix(in srgb, #f59e0b 28%, var(--border));
}

.ew-prep-readiness-snapshot-complete {
  margin: 0;
  font-size: 9px;
  font-weight: 600;
  color: var(--brand-700);
  line-height: 1.2;
}

.ew-prep-readiness {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 6px 8px;
  border-radius: 6px;
  border: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
  background: color-mix(in srgb, var(--foreground) 2%, var(--surface));
}

.ew-prep-readiness-bar-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.ew-prep-readiness-pct {
  font-size: 10px;
  font-weight: 700;
  color: var(--muted);
  font-variant-numeric: tabular-nums;
}

.ew-prep-readiness-progress {
  height: 4px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--foreground) 8%, var(--border));
  overflow: hidden;
}

.ew-prep-readiness-progress > span {
  display: block;
  height: 100%;
  border-radius: 999px;
  background: var(--brand-600);
  transition: width 0.15s ease;
}

.ew-prep-readiness--minimal {
  border-color: color-mix(in srgb, var(--foreground) 8%, var(--border));
}

.ew-prep-readiness--solid {
  border-color: color-mix(in srgb, var(--brand-600) 16%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 4%, var(--surface));
}

.ew-prep-readiness--strong {
  border-color: color-mix(in srgb, var(--brand-600) 22%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 6%, var(--surface));
}

.ew-prep-readiness-heading {
  margin: 0;
  font-size: 10px;
  font-weight: 700;
  color: var(--muted);
  line-height: 1.3;
}

.ew-prep-readiness-level {
  font-weight: 800;
  color: var(--foreground);
}

.ew-prep-readiness--solid .ew-prep-readiness-level {
  color: var(--brand-800);
}

.ew-prep-readiness--strong .ew-prep-readiness-level {
  color: var(--brand-700);
}

.ew-prep-readiness-signals {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.ew-prep-readiness-signal {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 9px;
  font-weight: 600;
  color: color-mix(in srgb, var(--muted) 92%, transparent);
  line-height: 1.2;
}

.ew-prep-readiness-signal--met {
  color: var(--foreground);
}

.ew-prep-readiness-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  flex-shrink: 0;
  border: 1px solid color-mix(in srgb, var(--muted) 50%, var(--border));
  background: transparent;
}

.ew-prep-readiness-signal--met .ew-prep-readiness-dot {
  border-color: color-mix(in srgb, var(--brand-600) 40%, var(--border));
  background: var(--brand-600);
}

.ew-prep-workflow-hint {
  margin: 0 0 8px;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px dashed color-mix(in srgb, var(--foreground) 14%, var(--border));
  background: color-mix(in srgb, var(--foreground) 2.5%, #fff);
}

.ew-prep-workflow-hint-lead {
  margin: 0;
  font-size: 11px;
  line-height: 1.4;
  font-weight: 600;
  color: color-mix(in srgb, var(--foreground) 88%, var(--muted));
}

.ew-prep-workflow-hint-sub {
  margin: 4px 0 0;
  font-size: 10px;
  line-height: 1.35;
  color: var(--muted);
}

.ew-prep-workflow-hint--guidance {
  display: none;
}

.ew-prep-discovery-focus {
  margin: 0 0 8px;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--brand-600) 16%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 4%, #fff);
}

.ew-prep-discovery-focus-header {
  margin-bottom: 8px;
}

.ew-prep-discovery-focus-title {
  margin: 0;
  font-size: 12px;
  font-weight: 800;
  color: var(--foreground);
  letter-spacing: 0.01em;
}

.ew-prep-discovery-focus-lead {
  margin: 4px 0 0;
  font-size: 11px;
  line-height: 1.35;
  font-weight: 600;
  color: var(--foreground);
}

.ew-prep-discovery-focus-sub {
  margin: 2px 0 0;
  font-size: 10px;
  line-height: 1.35;
  color: var(--muted);
}

.ew-prep-discovery-focus-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.ew-prep-discovery-focus-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 6px;
  background: color-mix(in srgb, var(--foreground) 2%, #fff);
  border: 1px solid color-mix(in srgb, var(--foreground) 5%, var(--border));
}

.ew-prep-discovery-focus-index {
  flex-shrink: 0;
  width: 18px;
  height: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  font-size: 9px;
  font-weight: 800;
  color: var(--brand-800);
  background: color-mix(in srgb, var(--brand-600) 12%, #fff);
  border: 1px solid color-mix(in srgb, var(--brand-600) 20%, var(--border));
}

.ew-prep-discovery-focus-body {
  min-width: 0;
  flex: 1;
}

.ew-prep-discovery-focus-item-title {
  display: block;
  font-size: 10px;
  font-weight: 800;
  color: var(--foreground);
  line-height: 1.3;
}

.ew-prep-discovery-focus-item-desc {
  margin: 2px 0 0;
  font-size: 9px;
  line-height: 1.35;
  color: var(--muted);
}

.ew-prep-discovery-focus--guidance {
  display: none;
}

.ew-prep-specialization {
  margin: 0 0 8px;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: #fff;
}

.ew-prep-specialization--low {
  border-color: color-mix(in srgb, var(--muted) 35%, var(--border));
  background: color-mix(in srgb, var(--muted) 4%, #fff);
}

.ew-prep-specialization--medium {
  border-color: color-mix(in srgb, var(--brand-600) 22%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 6%, #fff);
}

.ew-prep-specialization--high {
  border-color: color-mix(in srgb, var(--brand-600) 32%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 10%, #fff);
  box-shadow: 0 1px 0 color-mix(in srgb, var(--brand-600) 8%, transparent);
}

.ew-prep-specialization-track {
  display: flex;
  align-items: center;
  gap: 0;
  margin-bottom: 6px;
}

.ew-prep-specialization-step {
  flex: 1;
  text-align: center;
  padding: 4px 6px;
  border-radius: 6px;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  color: var(--muted);
  background: color-mix(in srgb, var(--muted) 6%, #fff);
  border: 1px solid color-mix(in srgb, var(--muted) 18%, var(--border));
}

.ew-prep-specialization-step--active {
  color: var(--brand-800);
  background: color-mix(in srgb, var(--brand-600) 10%, #fff);
  border-color: color-mix(in srgb, var(--brand-600) 28%, var(--border));
}

.ew-prep-specialization-step--current {
  font-weight: 800;
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--brand-600) 35%, transparent);
}

.ew-prep-specialization-connector {
  flex: 0 0 10px;
  height: 2px;
  margin: 0 2px;
  border-radius: 1px;
  background: color-mix(in srgb, var(--muted) 25%, var(--border));
}

.ew-prep-specialization-connector--active {
  background: color-mix(in srgb, var(--brand-600) 45%, var(--border));
}

.ew-prep-specialization-label {
  margin: 0;
  font-size: 11px;
  font-weight: 800;
  color: var(--text);
}

.ew-prep-specialization-summary {
  margin: 3px 0 0;
  font-size: 10px;
  line-height: 1.4;
  color: var(--muted);
}

.ew-prep-specialty-focus {
  margin: 0 0 8px;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--brand-600) 16%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 4%, #fff);
}

.ew-prep-specialty-focus--high {
  border-color: color-mix(in srgb, #14b8a6 28%, var(--border));
  background: color-mix(in srgb, #14b8a6 6%, #fff);
}

.ew-prep-specialty-focus-title {
  margin: 0;
  font-size: 11px;
  font-weight: 800;
  color: var(--text);
}

.ew-prep-specialty-focus-lead {
  margin: 3px 0 0;
  font-size: 10px;
  line-height: 1.4;
  color: var(--muted);
}

.ew-prep-specialty-focus-list {
  margin: 6px 0 0;
  padding-left: 16px;
  font-size: 10px;
  line-height: 1.45;
  color: var(--text);
}

.ew-prep-specialty-focus-list li {
  margin: 0 0 3px;
}

.ew-prep-guidance--specialization-low .ew-prep-card--priority {
  border-color: color-mix(in srgb, var(--muted) 22%, var(--border));
}

.ew-prep-guidance--specialization-medium .ew-prep-card--priority {
  border-color: color-mix(in srgb, var(--brand-600) 24%, var(--border));
}

.ew-prep-guidance--specialization-high .ew-prep-card--priority {
  border-color: color-mix(in srgb, var(--brand-600) 36%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 4%, #fff);
}

.ew-prep-root--specialization-high .ew-prep-playbooks-wrap {
  border-color: color-mix(in srgb, var(--brand-600) 28%, var(--border));
}

.ew-prep-context {
  margin: 0 0 8px;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--brand-600) 18%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 5%, #fff);
}

.ew-prep-context-head {
  display: flex;
  flex-direction: column;
  gap: 3px;
  margin-bottom: 6px;
}

.ew-prep-context-badge {
  align-self: flex-start;
  padding: 2px 7px;
  border-radius: 999px;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--brand-800);
  background: color-mix(in srgb, var(--brand-600) 14%, #fff);
  border: 1px solid color-mix(in srgb, var(--brand-600) 24%, var(--border));
}

.ew-prep-context--evaluation_planning .ew-prep-context-badge {
  color: #0f766e;
  background: color-mix(in srgb, #14b8a6 12%, #fff);
  border-color: color-mix(in srgb, #14b8a6 28%, var(--border));
}

.ew-prep-context--observation_support .ew-prep-context-badge {
  color: #6d28d9;
  background: color-mix(in srgb, #8b5cf6 10%, #fff);
  border-color: color-mix(in srgb, #8b5cf6 22%, var(--border));
}

.ew-prep-context-summary {
  margin: 0;
  font-size: 11px;
  line-height: 1.35;
  color: var(--foreground);
  font-weight: 600;
}

.ew-prep-context-focus {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.ew-prep-context-focus li {
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 9px;
  font-weight: 700;
  line-height: 1.25;
  color: var(--muted);
  background: color-mix(in srgb, var(--foreground) 4%, var(--surface));
  border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
}

.ew-prep-intro {
  padding: 10px 12px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--brand-600) 6%, #fff);
  border: 1px solid color-mix(in srgb, var(--brand-600) 18%, var(--border));
}

.ew-prep-intro-lead {
  margin: 0;
  font-size: 13px;
  font-weight: 800;
  line-height: 1.35;
  color: var(--foreground);
}

.ew-prep-intro-sub {
  margin: 4px 0 0;
  font-size: 11px;
  line-height: 1.4;
  color: var(--muted);
}

.ew-prep-apply-plan-btn {
  margin-top: 8px;
  padding: 6px 12px;
  border: none;
  border-radius: 6px;
  background: var(--brand-600);
  color: #fff;
  font-size: 11px;
  font-weight: 800;
  cursor: pointer;
  font-family: inherit;
}

.ew-prep-apply-plan-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.ew-prep-step-hint {
  margin: 0;
  font-size: 11px;
  line-height: 1.35;
  color: var(--muted);
}

.ew-prep-step-hint--secondary {
  font-size: 10px;
  opacity: 0.9;
}

.ew-prep-guidance {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--foreground) 3%, var(--surface));
  border: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
}

.ew-prep-guidance-empty {
  margin: 0;
  padding: 4px 2px;
}

.ew-prep-suggestion-card {
  border: 1px solid color-mix(in srgb, var(--brand-600) 14%, var(--border));
  border-radius: 8px;
  padding: 8px 10px;
  background: #fff;
  min-width: 0;
}

.ew-prep-suggestion-card--subdued {
  border-color: color-mix(in srgb, var(--foreground) 8%, var(--border));
  background: color-mix(in srgb, var(--foreground) 1%, #fff);
}

.ew-prep-suggestion-title {
  margin: 0;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.02em;
  color: var(--foreground);
  text-transform: none;
}

.ew-prep-suggestion-meta {
  margin-top: 4px;
}

.ew-prep-customize {
  border: 1px dashed color-mix(in srgb, var(--foreground) 12%, var(--border));
  border-radius: 8px;
  background: color-mix(in srgb, var(--foreground) 1%, #fff);
}

.ew-prep-customize-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 10px;
  cursor: pointer;
  list-style: none;
  user-select: none;
}

.ew-prep-customize-summary::-webkit-details-marker {
  display: none;
}

.ew-prep-customize-title {
  font-size: 11px;
  font-weight: 800;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.ew-prep-customize-meta {
  font-size: 10px;
  font-weight: 600;
  color: color-mix(in srgb, var(--muted) 90%, transparent);
}

.ew-prep-customize-body {
  padding: 0 10px 10px;
  border-top: 1px solid color-mix(in srgb, var(--foreground) 5%, var(--border));
}

.ew-prep-customize-lead {
  margin: 8px 0 6px;
  font-size: 10px;
  line-height: 1.35;
  color: var(--muted);
}

.ew-prep-customize-lead strong {
  font-weight: 800;
  color: var(--foreground);
}

.ew-prep-advanced-options {
  margin-top: 4px;
}

.ew-prep-card {
  border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
  border-radius: 8px;
  padding: 8px 10px;
  background: #fff;
  min-width: 0;
}

.ew-prep-card--secondary {
  background: color-mix(in srgb, var(--foreground) 2%, #fff);
  border-style: dashed;
  border-color: color-mix(in srgb, var(--foreground) 10%, var(--border));
}

.ew-prep-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 4px;
}

.ew-prep-card-title {
  margin: 0;
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--muted);
}

.ew-prep-card-action {
  padding: 4px 8px;
  border-radius: 6px;
  border: 1px solid color-mix(in srgb, var(--brand-600) 30%, var(--border));
  background: transparent;
  font-size: 10px;
  font-weight: 800;
  color: var(--brand-700);
  cursor: pointer;
  font-family: inherit;
  flex-shrink: 0;
}

.ew-prep-card-action:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.ew-prep-goal-text {
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  line-height: 1.3;
}

.ew-prep-why-matters {
  margin: 6px 0 0;
  padding: 6px 8px;
  border-radius: 6px;
  border-left: 2px solid color-mix(in srgb, var(--brand-600) 35%, var(--border));
  background: color-mix(in srgb, var(--foreground) 2%, var(--surface));
}

.ew-prep-why-matters-label {
  margin: 0 0 2px;
  font-size: 9px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--muted);
}

.ew-prep-why-matters-body {
  margin: 0;
  font-size: 11px;
  font-weight: 600;
  line-height: 1.35;
  color: var(--foreground);
}

.ew-prep-opening-text {
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.4;
  font-style: italic;
  color: var(--foreground);
}

.ew-prep-opening-alt {
  margin: 6px 0 0;
  font-size: 11px;
  line-height: 1.35;
  color: var(--muted);
  font-style: italic;
}

.ew-prep-opening-alt-label {
  font-style: normal;
  font-weight: 800;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.ew-prep-opening-meta {
  margin-top: 4px;
}

.ew-prep-discovery-list {
  margin: 0;
  padding-left: 16px;
  font-size: 11px;
  line-height: 1.35;
}

.ew-prep-discovery-list li {
  margin: 0 0 4px;
}

.ew-prep-discovery-list li:last-child {
  margin-bottom: 0;
}

.ew-prep-discovery-meta {
  margin-top: 4px;
}

.ew-prep-talking-list {
  margin: 0;
  padding-left: 16px;
  font-size: 11px;
  line-height: 1.35;
}

.ew-prep-talking-list li {
  margin: 0 0 3px;
}

.ew-prep-talking-list li:last-child {
  margin-bottom: 0;
}

.ew-prep-suggestion-card--observation-pathway {
  border-color: color-mix(in srgb, var(--brand-600) 20%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 3%, #fff);
}

.ew-prep-success-panel {
  border: 1px solid color-mix(in srgb, var(--brand-600) 16%, var(--border));
  border-radius: 8px;
  padding: 7px 10px;
  background: color-mix(in srgb, var(--brand-600) 4%, #fff);
  min-width: 0;
}

.ew-prep-success-title {
  margin: 0 0 2px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.02em;
  color: var(--foreground);
}

.ew-prep-success-lead {
  margin: 0 0 5px;
  font-size: 10px;
  line-height: 1.3;
  color: var(--muted);
}

.ew-prep-success-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 3px;
}

.ew-prep-success-list li {
  position: relative;
  padding-left: 12px;
  font-size: 10px;
  font-weight: 600;
  line-height: 1.3;
  color: var(--foreground);
}

.ew-prep-success-list li::before {
  content: "";
  position: absolute;
  left: 0;
  top: 0.45em;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--brand-600) 55%, var(--border));
}

.ew-prep-observation-lead {
  margin: 0 0 6px;
  font-size: 10px;
  line-height: 1.35;
  color: var(--muted);
}

.ew-prep-observation-goals-list {
  margin: 0;
  padding-left: 16px;
  font-size: 11px;
  line-height: 1.35;
}

.ew-prep-observation-goals-list li {
  margin: 0 0 4px;
}

.ew-prep-observation-goals-list li:last-child {
  margin-bottom: 0;
}

.ew-prep-commercialization-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.ew-prep-commercialization-item {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  font-size: 11px;
  line-height: 1.35;
}

.ew-prep-commercialization-tag {
  flex-shrink: 0;
  margin-top: 1px;
  padding: 1px 5px;
  border-radius: 4px;
  font-size: 8px;
  font-weight: 800;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  line-height: 1.2;
}

.ew-prep-commercialization-tag--observable {
  color: var(--brand-800);
  background: color-mix(in srgb, var(--brand-600) 12%, var(--surface));
  border: 1px solid color-mix(in srgb, var(--brand-600) 22%, var(--border));
}

.ew-prep-commercialization-tag--evaluatable {
  color: #0f766e;
  background: color-mix(in srgb, #14b8a6 10%, var(--surface));
  border: 1px solid color-mix(in srgb, #14b8a6 22%, var(--border));
}

.ew-prep-commercialization-tag--adoptable {
  color: #6d28d9;
  background: color-mix(in srgb, #8b5cf6 10%, var(--surface));
  border: 1px solid color-mix(in srgb, #8b5cf6 20%, var(--border));
}

.ew-prep-commercialization-text {
  min-width: 0;
  color: var(--foreground);
}

.ew-prep-muted {
  margin: 0;
  font-size: 11px;
  color: var(--muted);
  line-height: 1.35;
}

.ew-prep-alert {
  margin: 0;
  font-size: 11px;
  color: #b45309;
}

.ew-prep-guides {
  min-width: 0;
  padding: 8px 10px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--foreground) 2%, #fff);
  border: 1px solid color-mix(in srgb, var(--foreground) 5%, var(--border));
}

.ew-prep-guides--optional {
  padding: 0;
  border: none;
  background: transparent;
}

.ew-prep-guides-optional-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 6px;
  border: 1px dashed color-mix(in srgb, var(--foreground) 12%, var(--border));
  background: color-mix(in srgb, var(--foreground) 2%, #fff);
  font-size: 10px;
  font-weight: 700;
  color: var(--muted);
  cursor: pointer;
  list-style: none;
  user-select: none;
}

.ew-prep-guides-optional-summary::-webkit-details-marker {
  display: none;
}

.ew-prep-guides-optional-title {
  color: color-mix(in srgb, var(--foreground) 72%, var(--muted));
}

.ew-prep-guides-optional-count {
  font-size: 9px;
  font-weight: 800;
  padding: 1px 5px;
  border-radius: 4px;
  background: color-mix(in srgb, var(--foreground) 5%, var(--surface));
  color: var(--muted);
}

.ew-prep-guides-optional-body {
  margin-top: 6px;
  padding: 6px 8px 8px;
  border-radius: 6px;
  border: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
  background: color-mix(in srgb, var(--foreground) 1.5%, #fff);
}

.ew-prep-guides-helper--optional {
  margin: 0 0 6px;
  font-size: 9px;
  line-height: 1.35;
}

.ew-prep-guides-subsection {
  margin-top: 6px;
}

.ew-prep-guides-subsection:first-of-type {
  margin-top: 0;
}

.ew-prep-guides-subsection-label {
  margin: 0 0 3px;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  color: var(--muted);
}

.ew-prep-guide-list--lightweight .ew-prep-guide-item,
.ew-prep-guide-list--overlay .ew-prep-guide-item {
  padding: 4px 0;
}

.ew-prep-guide-item--lightweight .ew-prep-guide-name,
.ew-prep-guide-item--overlay .ew-prep-guide-name {
  font-size: 10px;
  font-weight: 600;
}

.ew-prep-guide-item--overlay .ew-prep-guide-meta {
  font-style: italic;
}

.ew-prep-guide-item--overlay .ew-prep-guide-reason,
.ew-prep-guide-item--lightweight .ew-prep-guide-reason {
  color: var(--muted);
  font-weight: 500;
}

.ew-prep-guide-item--overlay .ew-prep-guide-btn,
.ew-prep-guide-item--lightweight .ew-prep-guide-btn {
  padding: 2px 6px;
  font-size: 8px;
  font-weight: 700;
  border-color: color-mix(in srgb, var(--foreground) 14%, var(--border));
  color: var(--muted);
}

.ew-prep-guide-item--overlay .ew-prep-guide-btn:hover:not(:disabled),
.ew-prep-guide-item--lightweight .ew-prep-guide-btn:hover:not(:disabled) {
  background: color-mix(in srgb, var(--foreground) 4%, #fff);
  color: var(--foreground);
}

.ew-prep-guide-item--overlay.ew-prep-guide-item--on,
.ew-prep-guide-item--lightweight.ew-prep-guide-item--on {
  background: color-mix(in srgb, var(--foreground) 3%, transparent);
}

.ew-prep-guides-header {
  margin-bottom: 6px;
}

.ew-prep-guides-title {
  margin: 0;
  font-size: 11px;
  font-weight: 800;
  color: var(--foreground);
  letter-spacing: 0.01em;
  text-transform: none;
}

.ew-prep-guides-title--overlay,
.ew-prep-guides-header--compact .ew-prep-guides-title {
  font-size: 10px;
  font-weight: 700;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.ew-prep-guides-header--compact {
  margin-bottom: 4px;
}

.ew-prep-guides-helper--overlay {
  font-size: 9px;
}

.ew-prep-guides-helper {
  margin: 3px 0 0;
  font-size: 10px;
  line-height: 1.35;
  color: var(--muted);
}

.ew-prep-guides-status,
.ew-prep-guides-empty {
  margin: 0;
}

.ew-prep-guide-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0;
}

.ew-prep-guide-item {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 0;
  border-bottom: 1px solid color-mix(in srgb, var(--foreground) 4%, var(--border));
}

.ew-prep-guide-item:last-child {
  border-bottom: none;
}

.ew-prep-guide-item--on {
  background: color-mix(in srgb, var(--brand-600) 4%, transparent);
  margin: 0 -6px;
  padding-left: 6px;
  padding-right: 6px;
  border-radius: 4px;
}

.ew-prep-guide-main {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
  flex: 1;
}

.ew-prep-guide-name {
  font-size: 11px;
  font-weight: 700;
  line-height: 1.3;
  color: var(--foreground);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.ew-prep-guide-meta {
  font-size: 9px;
  font-weight: 600;
  color: var(--muted);
  line-height: 1.25;
}

.ew-prep-guide-reason {
  font-size: 9px;
  font-weight: 600;
  color: color-mix(in srgb, var(--brand-700) 75%, var(--muted));
  line-height: 1.25;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.ew-prep-guide-btn {
  flex-shrink: 0;
  padding: 3px 7px;
  border-radius: 4px;
  border: 1px solid color-mix(in srgb, var(--brand-600) 22%, var(--border));
  background: transparent;
  color: var(--brand-700);
  font-size: 9px;
  font-weight: 800;
  cursor: pointer;
  font-family: inherit;
  line-height: 1.2;
}

.ew-prep-guide-btn:hover:not(:disabled) {
  background: color-mix(in srgb, var(--brand-600) 6%, #fff);
}

.ew-prep-guide-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.ew-prep-guide-item--on .ew-prep-guide-btn {
  border-color: color-mix(in srgb, var(--brand-600) 35%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 8%, #fff);
}

.ew-prep-guides-more {
  margin-top: 2px;
  border-top: 1px solid color-mix(in srgb, var(--foreground) 4%, var(--border));
}

.ew-prep-guides-more-summary {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 0 2px;
  font-size: 10px;
  font-weight: 700;
  color: var(--muted);
  cursor: pointer;
  list-style: none;
  user-select: none;
}

.ew-prep-guides-more-summary::-webkit-details-marker {
  display: none;
}

.ew-prep-guides-more-count {
  font-size: 9px;
  font-weight: 800;
  padding: 1px 5px;
  border-radius: 4px;
  background: color-mix(in srgb, var(--foreground) 6%, var(--surface));
  color: var(--muted);
}

.ew-prep-guides-more .ew-prep-guide-list {
  padding-bottom: 2px;
}

.ew-prep-collapsible {
  border: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
  border-radius: 8px;
  overflow: hidden;
  background: color-mix(in srgb, var(--foreground) 1%, #fff);
}

.ew-prep-collapsible-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 7px 10px;
  font-size: 11px;
  font-weight: 800;
  color: var(--muted);
  cursor: pointer;
  list-style: none;
  user-select: none;
}

.ew-prep-collapsible-summary::-webkit-details-marker {
  display: none;
}

.ew-prep-collapsible-body {
  padding: 0 8px 8px;
  border-top: 1px solid color-mix(in srgb, var(--foreground) 5%, var(--border));
}

.ew-prep-more-options .pcp-template-picker--wizard-minimal .pcp-template-body--browse {
  padding: 0;
  max-height: min(36dvh, 320px);
  overflow-y: auto;
}

.ew-prep-more-options .pcp-template-picker--wizard-minimal .pcp-suggested,
.ew-prep-more-options .pcp-template-picker--wizard-minimal .pcp-tcard-grid,
.ew-prep-more-options .pcp-template-picker--wizard-minimal .pcp-template-chips-row {
  display: none !important;
}

.ew-prep-more-options .pcp-template-picker--wizard-minimal .pcp-template-search-wrap {
  margin-bottom: 6px;
}

.ew-prep-more-options .pcp-template-picker--wizard-minimal .pcp-template-results-head {
  margin-bottom: 4px;
}

.ew-prep-more-options .pcp-wizard-minimal-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 4px;
}

.ew-prep-more-options .pcp-wizard-minimal-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 6px;
  border: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
  background: #fff;
}

.ew-prep-more-options .pcp-wizard-minimal-name {
  display: block;
  font-size: 11px;
  font-weight: 800;
  line-height: 1.25;
}

.ew-prep-more-options .pcp-wizard-minimal-meta {
  display: block;
  font-size: 9px;
  color: var(--muted);
  font-weight: 700;
}

.ew-prep-more-options .pcp-wizard-minimal-use {
  flex-shrink: 0;
  padding: 4px 10px;
  border: none;
  border-radius: 6px;
  background: var(--brand-600);
  color: #fff;
  font-size: 10px;
  font-weight: 800;
  cursor: pointer;
  font-family: inherit;
}


.ew-prep-prep-fields {
  min-width: 0;
}

.ew-prep-prep-fields-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
}

.ew-prep-prep-fields-title {
  margin: 0;
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--muted);
}

.ew-prep-prep-fields-count {
  font-size: 10px;
  font-weight: 700;
  color: var(--muted);
}

.ew-prep-prep-fields .eng-workflow-fields {
  gap: 6px;
}

.ew-prep-guided-fields {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

.ew-prep-guided-priority {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.ew-prep-guided-field {
  display: grid;
  gap: 3px;
  min-width: 0;
}

.ew-prep-guided-field-label {
  font-size: 11px;
  font-weight: 800;
  color: var(--foreground);
}

.ew-prep-guided-field textarea {
  width: 100%;
  box-sizing: border-box;
  padding: 6px 9px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));
  font-size: 14px;
  font-family: inherit;
  background: #fff;
  resize: vertical;
  min-height: 32px;
  max-height: 120px;
  line-height: 1.35;
}

.ew-prep-guided-field textarea::placeholder {
  color: color-mix(in srgb, var(--muted) 88%, transparent);
  font-size: 12px;
  font-weight: 500;
  line-height: 1.3;
}

.ew-prep-guided-field textarea.ew-prep-guided-field--filled {
  border-color: color-mix(in srgb, var(--brand-600) 25%, var(--border));
}

.ew-prep-guided-advanced {
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
  background: color-mix(in srgb, var(--foreground) 2%, var(--surface));
}

.ew-prep-guided-advanced-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 7px 10px;
  cursor: pointer;
  font-size: 11px;
  font-weight: 800;
  color: var(--muted);
  list-style: none;
}

.ew-prep-guided-advanced-summary::-webkit-details-marker {
  display: none;
}

.ew-prep-guided-advanced-hint {
  font-size: 10px;
  font-weight: 600;
  color: color-mix(in srgb, var(--muted) 85%, transparent);
}

.ew-prep-guided-advanced-body {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 0 10px 8px;
  border-top: 1px solid color-mix(in srgb, var(--foreground) 5%, var(--border));
}

.ew-prep-lightweight-links {
  display: grid;
  gap: 6px;
  margin-bottom: 6px;
}

.ew-prep-lightweight-links label {
  font-size: 10px;
  font-weight: 800;
  color: var(--muted);
}

.ew-prep-lightweight-links select {
  width: 100%;
  box-sizing: border-box;
  padding: 7px 9px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));
  font-size: 16px;
  font-family: inherit;
  background: #fff;
}

.ew-prep-status {
  font-size: 10px;
  color: var(--muted);
  margin: 0;
}

.ew-prep-intro-official {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
}

.ew-prep-intro-official--mission {
  gap: 8px;
}

.ew-prep-intro-tier--plan-primary {
  /* Call Plan is the primary workspace in document order */
}

.ew-prep-intro-tier--context-compact .ew-prep-intro-tier-label {
  margin-bottom: 2px;
}

.ew-prep-intro-readiness {
  margin: 0;
  min-width: 0;
}

.ew-prep-intro-tier {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.ew-prep-intro-tier-label {
  margin: 0;
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--muted);
}

.ew-prep-intro-tier-label--secondary {
  margin-bottom: 2px;
}

.ew-prep-intro-tier--plan {
  padding: 10px;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--brand-600) 22%, var(--border));
  background: #fff;
  box-shadow: 0 1px 0 color-mix(in srgb, var(--foreground) 4%, transparent);
}

.ew-prep-call-plan-head {
  margin-bottom: 8px;
}

.ew-prep-call-plan-title {
  margin: 0;
  font-size: 15px;
  font-weight: 900;
  letter-spacing: -0.02em;
  color: var(--foreground);
}

.ew-prep-call-plan-sub {
  margin: 4px 0 0;
  font-size: 10px;
  line-height: 1.4;
  color: var(--muted);
}

.ew-prep-call-plan-cards {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ew-prep-call-plan-card {
  border: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));
  border-radius: 10px;
  background: color-mix(in srgb, var(--foreground) 2%, #fff);
  overflow: hidden;
}

.ew-prep-call-plan-card-head {
  padding: 7px 10px 0;
}

.ew-prep-call-plan-card-title {
  margin: 0;
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--foreground);
}

.ew-prep-call-plan-card-helper {
  margin: 3px 0 0;
  font-size: 9px;
  line-height: 1.35;
  color: var(--muted);
}

.ew-prep-call-plan-card-body {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 6px 10px 8px;
}

.ew-prep-call-plan-card-body--split {
  gap: 8px;
}

.ew-prep-call-plan-card-field {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.ew-prep-call-plan-card-sublabel {
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--muted);
}

.ew-prep-call-plan-card-field-hint {
  font-size: 9px;
  line-height: 1.3;
  color: var(--muted);
}

.ew-prep-call-plan-card-field textarea {
  width: 100%;
  min-height: 0;
  margin: 0;
  padding: 7px 9px;
  border: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));
  border-radius: 8px;
  font-size: 12px;
  line-height: 1.45;
  font-family: inherit;
  resize: vertical;
  background: #fff;
  color: var(--foreground);
}

.ew-prep-call-plan-card-field textarea:focus {
  outline: 2px solid color-mix(in srgb, var(--brand-600) 35%, transparent);
  outline-offset: 1px;
}

.ew-prep-call-plan-card-field textarea:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Recommendations — compact collapsed / expanded review */
.ew-prep-ai-recs {
  border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
  border-radius: 10px;
  background: color-mix(in srgb, var(--foreground) 2%, #fff);
  overflow: hidden;
  min-width: 0;
}

.ew-prep-ai-recs--collapsed .ew-prep-ai-recs-compact {
  display: flex;
  align-items: stretch;
  justify-content: space-between;
  gap: 8px;
  min-height: 72px;
  max-height: 90px;
  padding: 8px 10px;
  box-sizing: border-box;
}

.ew-prep-ai-recs-compact-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  justify-content: center;
}

.ew-prep-ai-recs-compact-head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 8px;
  min-width: 0;
}

.ew-prep-ai-recs-title {
  margin: 0;
  font-size: 11px;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--foreground);
}

.ew-prep-ai-recs-template-name {
  font-size: 11px;
  font-weight: 700;
  color: var(--brand-700);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ew-prep-ai-recs-metrics {
  display: flex;
  flex-wrap: wrap;
  gap: 2px 10px;
  margin: 0;
  min-width: 0;
}

.ew-prep-ai-recs-metric {
  display: inline-flex;
  align-items: baseline;
  gap: 4px;
  margin: 0;
  min-width: 0;
}

.ew-prep-ai-recs-metric--wide {
  flex: 1 1 100%;
}

.ew-prep-ai-recs-metric dt {
  margin: 0;
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--muted);
}

.ew-prep-ai-recs-metric dd {
  margin: 0;
  font-size: 10px;
  font-weight: 700;
  color: var(--foreground);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ew-prep-ai-recs-metric--wide dd {
  white-space: normal;
  line-height: 1.25;
}

.ew-prep-ai-recs-hint {
  margin: 4px 0 0;
  font-size: 9px;
  line-height: 1.35;
  color: var(--muted);
}

.ew-prep-ai-recs-compact-actions {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
  flex-shrink: 0;
}

.ew-prep-ai-recs-btn {
  min-height: 30px;
  padding: 0 10px;
  border-radius: 8px;
  font-size: 10px;
  font-weight: 800;
  font-family: inherit;
  border: 1px solid color-mix(in srgb, var(--foreground) 12%, var(--border));
  background: #fff;
  color: var(--foreground);
  cursor: pointer;
  white-space: nowrap;
}

.ew-prep-ai-recs-btn--primary {
  background: var(--brand-600);
  color: #fff;
  border-color: var(--brand-600);
}

.ew-prep-ai-recs-btn--ghost {
  font-size: 10px;
  padding: 0 8px;
  min-height: 28px;
  background: transparent;
}

.ew-prep-ai-recs-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.ew-prep-ai-recs-btn-label--short {
  display: none;
}

.ew-prep-template-preview--drawer {
  padding: 0;
  border: none;
  background: transparent;
  border-radius: 0;
  gap: 8px;
}

.ew-prep-template-preview--drawer .ew-prep-template-preview-sub--drawer {
  margin: 0 0 6px;
  font-size: 10px;
  line-height: 1.4;
  color: var(--muted);
}

.ew-prep-template-preview--drawer .ew-prep-template-preview-notice {
  font-size: 10px;
  padding: 5px 8px;
}

.ew-prep-template-preview--drawer .ew-prep-template-preview-sections {
  max-height: none;
  overflow: visible;
  gap: 6px;
}

.ew-prep-template-preview--drawer .ew-prep-template-preview-block {
  padding: 7px 9px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
  background: color-mix(in srgb, var(--foreground) 2%, #fff);
}

.ew-prep-template-preview--drawer .ew-prep-template-preview-label {
  font-size: 9px;
}

.ew-prep-template-preview--drawer .ew-prep-template-preview-value {
  font-size: 11px;
  line-height: 1.4;
}

.ew-prep-intro-suggestions {
  border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
  border-radius: 10px;
  background: color-mix(in srgb, var(--foreground) 2%, #fff);
  overflow: hidden;
}

.ew-prep-intro-suggestions-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 10px;
  font-size: 12px;
  font-weight: 700;
  color: var(--foreground);
  cursor: pointer;
  list-style: none;
  user-select: none;
}

.ew-prep-intro-suggestions-summary::-webkit-details-marker {
  display: none;
}

.ew-prep-intro-suggestions-summary::before {
  content: "▸";
  margin-right: 6px;
  font-size: 10px;
  color: var(--muted);
  transition: transform 0.15s ease;
}

.ew-prep-intro-suggestions[open] > .ew-prep-intro-suggestions-summary::before {
  transform: rotate(90deg);
}

.ew-prep-intro-suggestions-summary-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  flex: 1;
}

.ew-prep-intro-suggestions-title {
  font-size: 12px;
  font-weight: 800;
}

.ew-prep-intro-suggestions-hint {
  font-size: 10px;
  font-weight: 600;
  color: var(--muted);
}

.ew-prep-intro-suggestions-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 0 10px 10px;
  border-top: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
}

.ew-prep-template-preview--embedded {
  padding: 8px 0 0;
  border: none;
  background: transparent;
  border-radius: 0;
}

.ew-prep-template-preview--embedded .ew-prep-template-preview-sub--embedded {
  margin: 0 0 8px;
  font-size: 10px;
  line-height: 1.4;
  color: var(--muted);
}

.ew-prep-template-preview--embedded .ew-prep-template-preview-sections {
  max-height: 160px;
  overflow-y: auto;
  padding-right: 2px;
}

.ew-prep-intro-tier--secondary {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-top: 4px;
  border-top: 1px dashed color-mix(in srgb, var(--foreground) 10%, var(--border));
}

.ew-prep-optional--intro {
  border: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
  border-radius: 8px;
  background: color-mix(in srgb, var(--foreground) 2%, #fff);
}

.ew-prep-manual-slot--intro {
  margin: 0;
}

.ew-prep-intro-context-line {
  margin: 0;
  padding: 6px 10px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.35;
  letter-spacing: -0.01em;
  color: var(--foreground);
  background: color-mix(in srgb, var(--foreground) 4%, #fff);
  border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
  word-break: break-word;
}

.ew-prep-intro-context-sep {
  font-weight: 500;
  color: var(--muted);
}

.ew-prep-intro-official-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.ew-prep-intro-official-title {
  margin: 0;
  font-size: 15px;
  font-weight: 800;
  letter-spacing: -0.02em;
}

.ew-prep-intro-official-banner {
  margin: 0;
  padding: 8px 10px;
  border-radius: 8px;
  font-size: 12px;
  line-height: 1.4;
  background: color-mix(in srgb, var(--brand-600) 8%, #fff);
  border: 1px solid color-mix(in srgb, var(--brand-600) 18%, var(--border));
  color: var(--foreground);
}

.ew-prep-intro-official .case-pre-call-plan-fields {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ew-prep-intro-official .case-pre-call-plan-field textarea {
  min-height: 0;
}

.ew-prep-conversation-focus {
  margin: 0;
  padding: 0;
  border: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.ew-prep-conversation-focus-legend {
  padding: 0;
  font-size: 10px;
  font-weight: 800;
  color: var(--text);
}

.ew-prep-conversation-focus-hint {
  margin: 0;
  font-size: 9px;
  line-height: 1.35;
  color: var(--muted);
}

.ew-prep-conversation-focus-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.ew-prep-conversation-focus-chip {
  appearance: none;
  margin: 0;
  padding: 6px 12px;
  border-radius: 999px;
  border: 1.5px solid color-mix(in srgb, var(--foreground) 14%, var(--border));
  background: color-mix(in srgb, var(--foreground) 3%, #fff);
  font-size: 11px;
  font-weight: 600;
  line-height: 1.3;
  color: color-mix(in srgb, var(--foreground) 72%, transparent);
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    background 0.15s ease,
    color 0.15s ease,
    box-shadow 0.15s ease;
}

.ew-prep-conversation-focus-chip:hover:not(:disabled):not(.ew-prep-conversation-focus-chip--active) {
  border-color: color-mix(in srgb, var(--brand-600) 50%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 8%, #fff);
  color: var(--foreground);
}

.ew-prep-conversation-focus-chip:focus-visible {
  outline: 2px solid var(--brand-600);
  outline-offset: 2px;
}

.ew-prep-conversation-focus-chip--active {
  border-color: var(--brand-600, #2563eb);
  background: var(--brand-600, #2563eb);
  color: #fff;
  font-weight: 800;
  box-shadow:
    0 0 0 2px color-mix(in srgb, var(--brand-600, #2563eb) 28%, #fff),
    0 1px 3px color-mix(in srgb, var(--brand-600, #2563eb) 35%, transparent);
}

.ew-prep-conversation-focus-chip--active:hover:not(:disabled) {
  border-color: var(--brand-700, #1d4ed8);
  background: var(--brand-700, #1d4ed8);
  color: #fff;
}

.ew-prep-conversation-focus-chip:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.ew-prep-template-preview {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--brand-600) 22%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 5%, #fff);
}

.ew-prep-template-preview-head {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}

.ew-prep-template-preview-title {
  margin: 0;
  font-size: 13px;
  font-weight: 800;
}

.ew-prep-template-preview-sub {
  margin: 4px 0 0;
  font-size: 11px;
  line-height: 1.4;
  color: var(--muted);
  max-width: 42ch;
}

.ew-prep-template-badge {
  display: inline-flex;
  align-items: center;
  padding: 3px 8px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.02em;
  white-space: nowrap;
  border: 1px solid var(--border);
  background: #fff;
  color: var(--foreground);
}

.ew-prep-template-badge--generic_discovery,
.ew-prep-template-badge--acsis_preview,
.ew-prep-template-badge--biotissue_preview,
.ew-prep-template-badge--endolumik_preview,
.ew-prep-template-badge--telabio_preview,
.ew-prep-template-badge--skeletal_dynamics_preview {
  border-color: color-mix(in srgb, var(--brand-600) 25%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 10%, #fff);
  color: var(--brand-700, var(--foreground));
}

.ew-prep-template-badge--acsis_applied,
.ew-prep-template-badge--biotissue_applied,
.ew-prep-template-badge--endolumik_applied,
.ew-prep-template-badge--telabio_applied,
.ew-prep-template-badge--skeletal_dynamics_applied {
  border-color: color-mix(in srgb, var(--brand-600) 40%, var(--border));
  background: var(--brand-600);
  color: #fff;
}

.ew-prep-template-badge--custom_edited {
  border-color: color-mix(in srgb, #b45309 35%, var(--border));
  background: color-mix(in srgb, #f59e0b 15%, #fff);
  color: #92400e;
}

.ew-prep-template-preview-notice {
  margin: 0;
  padding: 6px 8px;
  border-radius: 6px;
  font-size: 11px;
  line-height: 1.4;
  background: color-mix(in srgb, var(--foreground) 4%, #fff);
  border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
}

.ew-prep-template-preview-notice--edits {
  border-color: color-mix(in srgb, #f59e0b 30%, var(--border));
  background: color-mix(in srgb, #f59e0b 8%, #fff);
}

.ew-prep-template-preview-sections {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 280px;
  overflow-y: auto;
}

.ew-prep-template-preview-block {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.ew-prep-template-preview-label {
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--muted);
}

.ew-prep-template-preview-value {
  margin: 0;
  font-size: 12px;
  line-height: 1.45;
  white-space: pre-wrap;
  word-break: break-word;
}

.ew-prep-template-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.ew-prep-template-action {
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: #fff;
  font-size: 12px;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
}

.ew-prep-template-action--primary {
  border-color: var(--brand-600);
  background: var(--brand-600);
  color: #fff;
}

.ew-prep-saved-plan {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.ew-prep-saved-plan-title {
  margin: 0;
  font-size: 13px;
  font-weight: 800;
}

.ew-prep-saved-plan-sub {
  margin: 0;
  font-size: 11px;
  color: var(--muted);
  line-height: 1.35;
}

.ew-prep-template-dialog-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: color-mix(in srgb, var(--foreground) 35%, transparent);
}

.ew-prep-template-dialog {
  width: min(100%, 400px);
  padding: 16px;
  border-radius: 12px;
  background: #fff;
  border: 1px solid var(--border);
  box-shadow: 0 12px 40px color-mix(in srgb, var(--foreground) 18%, transparent);
}

.ew-prep-template-dialog-title {
  margin: 0 0 8px;
  font-size: 15px;
  font-weight: 800;
}

.ew-prep-template-dialog-desc {
  margin: 0 0 14px;
  font-size: 13px;
  line-height: 1.45;
  color: var(--muted);
}

.ew-prep-template-dialog-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
}

.ew-prep-template-dialog-btn {
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: #fff;
  font-size: 13px;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
}

.ew-prep-template-dialog-btn--secondary {
  border-color: color-mix(in srgb, var(--brand-600) 30%, var(--border));
  color: var(--brand-700, var(--foreground));
}

.ew-prep-template-dialog-btn--primary {
  border-color: var(--brand-600);
  background: var(--brand-600);
  color: #fff;
}

/* ── Mission prep UI polish (density, hierarchy, operational feel) ── */
.ew-prep-root,
.ew-prep-intro-official--mission {
  --ew-prep-mission-teal: #0d9488;
  --ew-prep-mission-navy: #0f2744;
  --ew-prep-mission-surface: #ffffff;
  --ew-prep-mission-muted: #64748b;
  --ew-prep-mission-border: color-mix(in srgb, #0f2744 8%, #e2e8f0);
}

.ew-prep-hierarchy-stack,
.ew-prep-intro-official--mission {
  gap: 8px;
}

.ew-prep-readiness-snapshot {
  gap: 6px;
  padding: 8px 10px;
  border-radius: 10px;
  border: 1px solid var(--ew-prep-mission-border);
  background: linear-gradient(180deg, #f8fafc 0%, #fff 100%);
  border-bottom: none;
}

.ew-prep-readiness-snapshot-headline {
  font-size: 12px;
  font-weight: 800;
  color: var(--ew-prep-mission-navy);
  letter-spacing: -0.01em;
}

.ew-prep-readiness-snapshot-bar {
  height: 5px;
  background: #e2e8f0;
}

.ew-prep-readiness-snapshot-bar-fill {
  background: linear-gradient(90deg, #0f766e, var(--ew-prep-mission-teal));
}

.ew-prep-readiness-snapshot-chip {
  padding: 3px 8px;
  font-size: 10px;
  font-weight: 700;
  color: #78350f;
  background: #fffbeb;
  border-color: color-mix(in srgb, #f59e0b 22%, #e2e8f0);
}

.ew-prep-intro-tier--plan {
  padding: 8px 10px;
  border-radius: 11px;
  border: 1px solid var(--ew-prep-mission-border);
  background: var(--ew-prep-mission-surface);
  box-shadow: 0 1px 8px rgba(15, 39, 68, 0.04);
}

.ew-prep-call-plan-head {
  margin-bottom: 6px;
  padding-bottom: 6px;
  border-bottom: 1px solid color-mix(in srgb, var(--ew-prep-mission-navy) 6%, transparent);
}

.ew-prep-call-plan-title {
  font-size: 14px;
  font-weight: 800;
  color: var(--ew-prep-mission-navy);
}

.ew-prep-call-plan-sub {
  font-size: 10px;
  color: var(--ew-prep-mission-muted);
  opacity: 0.92;
}

.ew-prep-call-plan-cards {
  gap: 0;
  border: 1px solid var(--ew-prep-mission-border);
  border-radius: 10px;
  background: #fafbfc;
  overflow: hidden;
}

.ew-prep-call-plan-card {
  border: none;
  border-radius: 0;
  background: transparent;
  border-bottom: 1px solid color-mix(in srgb, var(--ew-prep-mission-navy) 5%, #e8edf3);
}

.ew-prep-call-plan-card:last-child {
  border-bottom: none;
}

.ew-prep-call-plan-card-head {
  padding: 8px 10px 0;
  background: color-mix(in srgb, #fff 88%, #f1f5f9);
}

.ew-prep-call-plan-card-title {
  font-size: 10px;
  letter-spacing: 0.06em;
  color: var(--ew-prep-mission-navy);
}

.ew-prep-call-plan-card-helper {
  font-size: 10px;
  line-height: 1.32;
  color: var(--ew-prep-mission-muted);
  opacity: 0.9;
}

.ew-prep-call-plan-card-body {
  gap: 5px;
  padding: 6px 10px 8px;
  background: #fff;
}

.ew-prep-call-plan-card-sublabel {
  font-size: 9px;
  color: var(--ew-prep-mission-muted);
}

.ew-prep-call-plan-card-field-hint {
  font-size: 9px;
  opacity: 0.85;
}

.ew-prep-call-plan-card-field textarea,
.ew-prep-call-plan-textarea {
  width: 100%;
  min-height: 0;
  margin: 0;
  padding: 6px 9px;
  border: 1px solid color-mix(in srgb, var(--ew-prep-mission-navy) 8%, #e2e8f0);
  border-radius: 8px;
  font-size: 13px;
  line-height: 1.42;
  font-family: inherit;
  resize: none;
  overflow-y: auto;
  background: #fff;
  color: var(--foreground);
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease;
}

.ew-prep-call-plan-card-field textarea::placeholder,
.ew-prep-call-plan-textarea::placeholder {
  color: color-mix(in srgb, var(--ew-prep-mission-muted) 75%, transparent);
  font-weight: 500;
}

.ew-prep-call-plan-card-field textarea:focus,
.ew-prep-call-plan-textarea:focus {
  outline: none;
  border-color: color-mix(in srgb, var(--ew-prep-mission-teal) 55%, #e2e8f0);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--ew-prep-mission-teal) 14%, transparent);
}

.ew-prep-conversation-focus {
  gap: 5px;
  padding: 8px 10px;
  border-radius: 10px;
  border: 1px solid var(--ew-prep-mission-border);
  background: #fff;
}

.ew-prep-conversation-focus-legend {
  font-size: 10px;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--ew-prep-mission-navy);
}

.ew-prep-conversation-focus-hint {
  font-size: 10px;
  color: var(--ew-prep-mission-muted);
}

.ew-prep-conversation-focus-chips {
  gap: 5px;
}

.ew-prep-conversation-focus-chip {
  padding: 5px 11px;
  font-size: 11px;
  font-weight: 700;
  border-width: 1px;
  border-color: color-mix(in srgb, var(--ew-prep-mission-teal) 18%, #e2e8f0);
  background: #f8fafc;
  color: #334155;
}

.ew-prep-conversation-focus-chip--active {
  border-color: var(--ew-prep-mission-teal);
  background: var(--ew-prep-mission-teal);
  color: #fff;
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--ew-prep-mission-teal) 18%, #fff);
}

.ew-prep-ai-recs {
  border: 1px solid var(--ew-prep-mission-border);
  border-radius: 10px;
  background: linear-gradient(180deg, #f8fafc 0%, #fff 55%);
  box-shadow: 0 1px 6px rgba(15, 39, 68, 0.04);
}

.ew-prep-ai-recs--collapsed .ew-prep-ai-recs-compact {
  min-height: 0;
  max-height: none;
  padding: 8px 10px;
  align-items: center;
}

.ew-prep-ai-recs-compact-actions {
  flex-direction: row;
  flex-wrap: wrap;
  gap: 6px;
  justify-content: flex-end;
}

.ew-prep-ai-recs-btn {
  min-height: 32px;
  padding: 0 12px;
  font-size: 11px;
  font-weight: 700;
  border-radius: 8px;
}

.ew-prep-ai-recs-btn--primary {
  background: var(--ew-prep-mission-teal);
  border-color: #0f766e;
}

.ew-prep-ai-recs-btn:not(.ew-prep-ai-recs-btn--primary) {
  background: #fff;
  color: #475569;
  border-color: color-mix(in srgb, var(--ew-prep-mission-navy) 10%, #e2e8f0);
}

.ew-prep-ai-recs-title {
  font-size: 10px;
  letter-spacing: 0.06em;
  color: var(--ew-prep-mission-navy);
}

.ew-prep-ai-recs-metric dt {
  font-size: 9px;
  color: var(--ew-prep-mission-muted);
}

.ew-prep-ai-recs-metric dd {
  font-size: 11px;
  font-weight: 700;
}

.ew-prep-readiness {
  padding: 8px 10px;
  border-radius: 10px;
  border: 1px solid var(--ew-prep-mission-border);
  background: #fff;
  gap: 6px;
}

.ew-prep-readiness-heading {
  font-size: 11px;
}

.ew-prep-readiness-progress {
  height: 5px;
}

.ew-prep-readiness-progress > span {
  background: var(--ew-prep-mission-teal);
}

@media (max-width: 720px) {
  .ew-prep-ai-recs-compact-actions,
  .ew-prep-suggested-prep-actions {
    width: 100%;
    justify-content: stretch;
  }

  .ew-prep-ai-recs-btn {
    flex: 1 1 calc(50% - 4px);
    min-height: 40px;
  }

  .ew-prep-ai-recs-btn--primary {
    flex: 1 1 100%;
  }

  .ew-prep-suggested-prep-body {
    grid-template-columns: 1fr;
  }

  .ew-prep-call-plan-card-field textarea,
  .ew-prep-call-plan-textarea {
    font-size: 16px;
  }
}

/* Engagement prep flow — product → focus → suggested prep → manual */
.ew-prep-prep-flow {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 2px;
}

.ew-prep-prep-flow-step {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 8px 10px;
  align-items: start;
}

.ew-prep-prep-flow-step--suggested {
  display: block;
}

.ew-prep-prep-flow-step--suggested .ew-prep-suggested-prep {
  width: 100%;
}

.ew-prep-flow-step {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  margin-top: 2px;
  border-radius: 6px;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.04em;
  color: var(--ew-prep-mission-teal);
  background: color-mix(in srgb, var(--ew-prep-mission-teal) 12%, #fff);
  border: 1px solid color-mix(in srgb, var(--ew-prep-mission-teal) 28%, #e2e8f0);
}

.ew-prep-prep-flow-step--product .ew-prep-product-focus,
.ew-prep-prep-flow-step--focus .ew-prep-conversation-focus {
  margin: 0;
}

.ew-prep-product-focus-kicker {
  margin: 2px 0 0;
  font-size: 10px;
  line-height: 1.35;
  color: var(--ew-prep-mission-muted);
  font-weight: 500;
}

.ew-prep-product-focus-label {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--ew-prep-mission-navy);
}

.ew-prep-conversation-focus-legend {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.05em;
}

.ew-prep-prep-flow-manual-label {
  margin: 0 0 4px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--ew-prep-mission-muted);
}

.ew-prep-prep-flow-step--manual .ew-prep-manual-trigger {
  margin-top: 0;
  padding: 6px 10px;
  font-size: 10px;
  font-weight: 600;
  color: #64748b;
  border-color: color-mix(in srgb, var(--ew-prep-mission-navy) 12%, #e2e8f0);
}

.ew-prep-suggested-prep {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 12px;
  border: 1px solid var(--ew-prep-mission-border);
  border-radius: 10px;
  background: #fff;
  box-shadow: 0 1px 4px rgba(15, 39, 68, 0.03);
}

.ew-prep-suggested-prep-head {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.ew-prep-suggested-prep-head-text {
  flex: 1;
  min-width: 0;
}

.ew-prep-suggested-prep-title {
  margin: 0;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--ew-prep-mission-navy);
}

.ew-prep-suggested-prep-meta {
  margin: 2px 0 0;
  font-size: 10px;
  font-weight: 600;
  color: var(--ew-prep-mission-muted);
}

.ew-prep-suggested-prep-body {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px 12px;
  padding-top: 2px;
  border-top: 1px solid color-mix(in srgb, var(--ew-prep-mission-border) 80%, #fff);
}

.ew-prep-suggested-prep-block-label {
  margin: 0 0 4px;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--ew-prep-mission-muted);
}

.ew-prep-suggested-prep-list {
  margin: 0;
  padding: 0 0 0 14px;
  font-size: 11px;
  font-weight: 600;
  line-height: 1.45;
  color: #334155;
}

.ew-prep-suggested-prep-list li + li {
  margin-top: 2px;
}

.ew-prep-suggested-prep-empty {
  margin: 0;
  font-size: 11px;
  font-weight: 500;
  color: var(--ew-prep-mission-muted);
}

.ew-prep-suggested-prep-probes-count {
  margin: 0;
  font-size: 11px;
  font-weight: 700;
  color: var(--ew-prep-mission-navy);
}

.ew-prep-suggested-prep-actions {
  padding-top: 2px;
  border-top: 1px solid color-mix(in srgb, var(--ew-prep-mission-border) 70%, #fff);
}

.ew-prep-ai-recs-review-focus-summary {
  margin: 4px 0 0;
  font-size: 11px;
  font-weight: 600;
  line-height: 1.4;
  color: var(--ew-prep-mission-muted);
}

.ew-prep-intro-official--refreshing {
  opacity: 0.92;
}

.ew-prep-suggested-prep--refreshing .ew-prep-suggested-prep-body {
  opacity: 0.55;
  transition: opacity 0.15s ease;
}

.ew-prep-suggested-prep-body {
  transition: opacity 0.2s ease;
}
`;
