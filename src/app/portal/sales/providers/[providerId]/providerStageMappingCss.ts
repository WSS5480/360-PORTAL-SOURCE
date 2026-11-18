/** Stage mapping mode — guided discovery intelligence workflow. */

export const providerStageMappingCss = `
.stage-mapping-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1200;
  background: rgba(15, 23, 42, 0.55);
  backdrop-filter: blur(4px);
}

.stage-mapping-panel {
  position: fixed;
  inset: 0;
  z-index: 1201;
  display: grid;
  grid-template-rows: auto 1fr auto;
  background: #f8fafc;
  color: #0f172a;
}

@media (min-width: 900px) {
  .stage-mapping-panel {
    inset: 24px 32px;
    max-width: 920px;
    margin: 0 auto;
    border-radius: 14px;
    border: 1px solid color-mix(in srgb, #0f172a 12%, #cbd5e1);
    box-shadow: 0 24px 64px rgba(15, 23, 42, 0.28);
    overflow: hidden;
  }
}

.stage-mapping-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px 12px;
  background: linear-gradient(180deg, #0f172a 0%, #1e293b 100%);
  color: #f8fafc;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.stage-mapping-header-main {
  min-width: 0;
}

.stage-mapping-kicker {
  margin: 0 0 4px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(148, 163, 184, 0.95);
}

.stage-mapping-title {
  margin: 0 0 8px;
  font-size: 18px;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.stage-mapping-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
}

.stage-mapping-stat {
  font-size: 11px;
  font-weight: 600;
  color: #cbd5e1;
}

.stage-mapping-stat strong {
  color: #fff;
  font-weight: 800;
}

.stage-mapping-stat--resolved strong {
  color: #5eead4;
}

.stage-mapping-stat--operational strong {
  color: #7dd3fc;
}

.stage-mapping-stat--sales strong {
  color: #c4b5fd;
}

.stage-mapping-stat--required strong {
  color: #5eead4;
}

.stage-mapping-stat--helpful strong {
  color: #cbd5e1;
}

.stage-mapping-stat--later {
  color: #94a3b8;
}

.stage-mapping-stat--later strong {
  color: #e2e8f0;
}

.stage-mapping-guidance {
  margin: 0;
  padding: 8px 10px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 600;
  line-height: 1.4;
  color: #334155;
  background: color-mix(in srgb, #14b8a6 8%, #fff);
  border: 1px solid color-mix(in srgb, #14b8a6 22%, #cbd5e1);
}

.stage-mapping-guidance strong {
  color: #0f766e;
}

.stage-mapping-header-actions {
  display: flex;
  flex-shrink: 0;
  gap: 6px;
}

.stage-mapping-header-btn {
  margin: 0;
  padding: 7px 10px;
  border-radius: 7px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: rgba(255, 255, 255, 0.06);
  color: #e2e8f0;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  font-family: inherit;
}

.stage-mapping-header-btn:hover {
  background: rgba(255, 255, 255, 0.12);
}

.stage-mapping-header-btn--close {
  width: 32px;
  padding: 0;
  display: grid;
  place-items: center;
}

.stage-mapping-body {
  overflow: auto;
  padding: 12px 14px 104px;
  display: grid;
  gap: 12px;
}

.stage-mapping-focus-banner {
  display: grid;
  gap: 4px;
  padding: 12px 14px;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, #0ea5e9 28%, #e2e8f0);
  background: color-mix(in srgb, #0ea5e9 6%, #fff);
}

.stage-mapping-focus-kicker {
  margin: 0;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #0369a1;
}

.stage-mapping-focus-headline {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: #0f172a;
}

.stage-mapping-focus-planning {
  display: grid;
  gap: 8px;
  padding: 12px 14px;
  border-radius: 10px;
  border: 1px dashed color-mix(in srgb, #8b5cf6 30%, #e2e8f0);
  background: color-mix(in srgb, #8b5cf6 5%, #fff);
}

.stage-mapping-focus-planning-title {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: #0f172a;
}

.stage-mapping-focus-planning-note {
  margin: 0;
  font-size: 12px;
  line-height: 1.45;
  color: #475569;
}

.stage-mapping-focus-planning-note--muted {
  color: #64748b;
}

.stage-mapping-focus-planning-list {
  margin: 0;
  padding-left: 18px;
  display: grid;
  gap: 4px;
  font-size: 12px;
  color: #334155;
}

.stage-mapping-focus-planning-link {
  font-size: 12px;
  font-weight: 600;
  color: #0369a1;
  text-decoration: none;
}

.stage-mapping-focus-planning-link:hover {
  text-decoration: underline;
}

.stage-mapping-category--primary {
  box-shadow: 0 1px 0 color-mix(in srgb, #0ea5e9 18%, transparent);
}

.stage-mapping-category--collapsed {
  opacity: 0.92;
}

.stage-mapping-category-head--collapsible {
  cursor: pointer;
  list-style: none;
}

.stage-mapping-category-head--collapsible::-webkit-details-marker {
  display: none;
}

.stage-mapping-section {
  display: grid;
  gap: 10px;
}

.stage-mapping-category {
  display: grid;
  gap: 10px;
  padding: 12px;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
  background: #fff;
}

.stage-mapping-category--opportunity {
  border-color: color-mix(in srgb, #f59e0b 32%, #e2e8f0);
  background: color-mix(in srgb, #f59e0b 6%, #fff);
}

.stage-mapping-stat--opportunity strong {
  color: #fbbf24;
}

.stage-mapping-category--operational {
  border-color: color-mix(in srgb, #0ea5e9 28%, #e2e8f0);
  background: color-mix(in srgb, #0ea5e9 4%, #fff);
}

.stage-mapping-category--sales {
  border-color: color-mix(in srgb, #8b5cf6 28%, #e2e8f0);
  background: color-mix(in srgb, #8b5cf6 4%, #fff);
}

.stage-mapping-category-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}

.stage-mapping-category-head-main {
  min-width: 0;
}

.stage-mapping-category-title {
  margin: 0;
  font-size: 14px;
  font-weight: 800;
  letter-spacing: -0.01em;
  color: #0f172a;
}

.stage-mapping-category-subtitle {
  margin: 4px 0 0;
  font-size: 11px;
  font-weight: 600;
  line-height: 1.4;
  color: #475569;
}

.stage-mapping-category-examples {
  margin: 4px 0 0;
  font-size: 10px;
  font-weight: 600;
  line-height: 1.35;
  color: #64748b;
}

.stage-mapping-category-meta {
  flex-shrink: 0;
  font-size: 10px;
  font-weight: 700;
  color: #64748b;
  white-space: nowrap;
}

.stage-mapping-category-confirmed-title {
  margin: 0;
  font-size: 12px;
  font-weight: 800;
  color: #334155;
}

.stage-mapping-category-confirmed {
  margin-top: 2px;
}

.stage-mapping-section-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}

.stage-mapping-section-head-main {
  min-width: 0;
}

.stage-mapping-section-head--collapsible {
  cursor: pointer;
  list-style: none;
}

.stage-mapping-section-head--collapsible::-webkit-details-marker {
  display: none;
}

.stage-mapping-section-focus,
.stage-mapping-section-defer-note {
  margin: 4px 0 0;
  font-size: 10px;
  font-weight: 600;
  line-height: 1.35;
  color: #64748b;
}

.stage-mapping-section--deferred {
  opacity: 0.92;
}

.stage-mapping-later-details {
  margin-top: 6px;
  border-radius: 9px;
  border: 1px dashed color-mix(in srgb, #64748b 35%, #cbd5e1);
  background: color-mix(in srgb, #64748b 4%, #fff);
  overflow: hidden;
}

.stage-mapping-later-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 10px;
  cursor: pointer;
  list-style: none;
}

.stage-mapping-later-toggle::-webkit-details-marker {
  display: none;
}

.stage-mapping-later-toggle-label {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #64748b;
}

.stage-mapping-later-toggle-meta {
  font-size: 10px;
  font-weight: 600;
  color: #94a3b8;
  text-align: right;
}

.stage-mapping-questions--deferred {
  padding: 0 8px 8px;
}

.stage-mapping-section-title {
  margin: 0;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #334155;
}

.stage-mapping-section-meta {
  font-size: 10px;
  font-weight: 700;
  color: #64748b;
}

.stage-mapping-questions {
  display: grid;
  gap: 8px;
}

.stage-mapping-question {
  padding: 12px 14px;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, #0f172a 8%, #cbd5e1);
  background: #fff;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
  display: grid;
  gap: 0;
}

.stage-mapping-question--resolved {
  border-color: color-mix(in srgb, #14b8a6 28%, #cbd5e1);
  background: color-mix(in srgb, #14b8a6 4%, #fff);
}

.stage-mapping-question--active {
  border-color: color-mix(in srgb, var(--brand-600, #2563eb) 35%, #cbd5e1);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--brand-600, #2563eb) 18%, transparent);
}

.stage-mapping-question--highlighted {
  border-color: color-mix(in srgb, #f59e0b 45%, #cbd5e1);
  box-shadow:
    0 0 0 2px color-mix(in srgb, #f59e0b 22%, transparent),
    0 8px 24px rgba(245, 158, 11, 0.12);
  animation: stage-mapping-highlight-pulse 1.4s ease-in-out 2;
}

@keyframes stage-mapping-highlight-pulse {
  0%,
  100% {
    box-shadow:
      0 0 0 2px color-mix(in srgb, #f59e0b 22%, transparent),
      0 8px 24px rgba(245, 158, 11, 0.12);
  }
  50% {
    box-shadow:
      0 0 0 3px color-mix(in srgb, #f59e0b 34%, transparent),
      0 10px 28px rgba(245, 158, 11, 0.18);
  }
}

.stage-mapping-current-intelligence,
.stage-mapping-still-need,
.stage-mapping-suggested-contact {
  margin: 0 0 12px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, #0f172a 8%, #e2e8f0);
  background: #fff;
}

.stage-mapping-question--field {
  display: grid;
  gap: 8px;
}

.stage-mapping-field-question {
  margin: 0;
  font-size: 14px;
  font-weight: 800;
  line-height: 1.35;
  letter-spacing: -0.02em;
  color: #0f172a;
}

.stage-mapping-field-answer {
  margin: 0;
  font-size: 13px;
  font-weight: 500;
  line-height: 1.45;
  color: #334155;
}

.stage-mapping-field-empty {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  font-style: italic;
  color: #94a3b8;
}

.stage-mapping-field-status {
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
}

.stage-mapping-field-status-value {
  font-weight: 800;
  color: #334155;
}

.stage-mapping-field-status-value--partial {
  color: #b45309;
}

.stage-mapping-field-status-value--confirmed {
  color: #0f766e;
}

.stage-mapping-field-status-value--potential_lead {
  color: #c2410c;
}

.stage-mapping-field-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 2px;
}

.stage-mapping-field-action {
  margin: 0;
  padding: 6px 12px;
  border-radius: 7px;
  border: 1px solid #cbd5e1;
  background: #fff;
  color: #334155;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  font-family: inherit;
}

.stage-mapping-field-action:hover:not(:disabled) {
  background: #f8fafc;
  border-color: #94a3b8;
}

.stage-mapping-field-action--primary {
  border-color: color-mix(in srgb, var(--brand-600, #2563eb) 35%, #cbd5e1);
  background: color-mix(in srgb, var(--brand-600, #2563eb) 8%, #fff);
  color: #1d4ed8;
}

.stage-mapping-field-action--primary:hover:not(:disabled) {
  background: color-mix(in srgb, var(--brand-600, #2563eb) 14%, #fff);
}

.stage-mapping-field-action:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.stage-mapping-field-editor {
  display: grid;
  gap: 10px;
  margin-top: 4px;
}

.stage-mapping-field-lead {
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid #fde68a;
  background: #fffbeb;
}

.stage-mapping-field-lead-hint {
  margin: 0 0 8px;
  font-size: 12px;
  font-weight: 600;
  color: #92400e;
}

.stage-mapping-field-lead-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

/* Scan-first card header */
.stage-mapping-scan-head {
  margin: 0 0 10px;
}

.stage-mapping-scan-head--compact {
  margin-bottom: 6px;
}

.stage-mapping-scan-head-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.stage-mapping-scan-question {
  margin: 0;
  flex: 1;
  min-width: 0;
  font-size: 15px;
  font-weight: 800;
  line-height: 1.35;
  letter-spacing: -0.02em;
  color: #0f172a;
}

.stage-mapping-scan-question--compact {
  font-size: 13px;
  font-weight: 700;
}

.stage-mapping-scan-badge {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  line-height: 1.2;
}

.stage-mapping-scan-badge--confirmed {
  color: #0f766e;
  background: #ecfdf5;
  border: 1px solid #99f6e4;
}

.stage-mapping-scan-badge--partial {
  color: #b45309;
  background: #fffbeb;
  border: 1px solid #fde68a;
}

.stage-mapping-scan-badge--unknown,
.stage-mapping-scan-badge--open {
  color: #64748b;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
}

.stage-mapping-scan-badge--potential_lead {
  color: #c2410c;
  background: #fff7ed;
  border: 1px solid #fdba74;
}

.stage-mapping-scan-intel-line {
  margin: 6px 0 0;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.4;
  color: #475569;
}

/* Intelligence review brief — scan-first hierarchy */
.stage-mapping-intel-brief {
  display: grid;
  gap: 0;
  margin: 0 0 8px;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, #0f172a 8%, #e2e8f0);
  background: #fff;
  overflow: hidden;
}

.stage-mapping-intel-brief__section {
  padding: 10px 12px;
  border-bottom: 1px solid #f1f5f9;
}

.stage-mapping-intel-brief__section:last-child {
  border-bottom: none;
}

.stage-mapping-intel-brief__section--know {
  background: #fff;
  padding-top: 12px;
  padding-bottom: 12px;
}

.stage-mapping-intel-brief__section--gaps {
  background: color-mix(in srgb, #f59e0b 5%, #fff);
}

.stage-mapping-intel-brief__section--next {
  background: color-mix(in srgb, #14b8a6 6%, #fff);
}

.stage-mapping-intel-brief__heading {
  margin: 0 0 5px;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #94a3b8;
}

.stage-mapping-intel-brief__section--know .stage-mapping-intel-brief__heading {
  color: #64748b;
}

.stage-mapping-intel-brief__summary-row {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 8px 12px;
}

.stage-mapping-intel-brief__summary {
  margin: 0;
  flex: 1 1 180px;
  min-width: 0;
  font-size: 16px;
  font-weight: 700;
  line-height: 1.4;
  color: #0f172a;
  letter-spacing: -0.015em;
}

.stage-mapping-intel-brief__summary--empty {
  font-size: 14px;
  font-weight: 600;
  color: #94a3b8;
  font-style: italic;
}

.stage-mapping-intel-brief__meta {
  display: grid;
  gap: 6px;
  margin-top: 10px;
}

.stage-mapping-intel-brief__field {
  display: grid;
  grid-template-columns: minmax(0, max-content) minmax(0, 1fr);
  gap: 6px 8px;
  align-items: start;
  font-size: 12px;
  line-height: 1.45;
}

.stage-mapping-intel-brief__field-label {
  font-weight: 700;
  color: #64748b;
  white-space: nowrap;
}

.stage-mapping-intel-brief__field-value {
  min-width: 0;
  color: #334155;
}

.stage-mapping-intel-brief__field--confidence-high .stage-mapping-intel-brief__field-value {
  color: #166534;
  font-weight: 700;
}

.stage-mapping-intel-brief__field--confidence-medium .stage-mapping-intel-brief__field-value {
  color: #92400e;
  font-weight: 700;
}

.stage-mapping-intel-brief__field--confidence-low .stage-mapping-intel-brief__field-value {
  color: #9a3412;
  font-weight: 700;
}

.stage-mapping-intel-brief__list--inline {
  margin: 0;
  padding-left: 16px;
}

.stage-mapping-intel-brief__confidence {
  flex: 0 0 auto;
  margin: 2px 0 0;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  line-height: 1.35;
  white-space: nowrap;
}

.stage-mapping-intel-brief__confidence--high {
  color: #166534;
  background: #dcfce7;
}

.stage-mapping-intel-brief__confidence--medium {
  color: #92400e;
  background: #fef3c7;
}

.stage-mapping-intel-brief__confidence--low {
  color: #9a3412;
  background: #ffedd5;
}

.stage-mapping-intel-brief__source {
  margin: 6px 0 0;
  font-size: 11px;
  font-weight: 600;
  line-height: 1.35;
  color: #64748b;
}

.stage-mapping-intel-brief__mapped-category {
  margin: 0 0 6px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  line-height: 1.35;
  color: #64748b;
}

.stage-mapping-intel-brief__raw-evidence {
  margin-top: 8px;
  padding: 8px 10px;
  border-radius: 8px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
}

.stage-mapping-intel-brief__raw-label {
  display: block;
  margin-bottom: 4px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #94a3b8;
}

.stage-mapping-intel-brief__raw-quote {
  margin: 0;
  font-size: 12px;
  line-height: 1.45;
  color: #475569;
  font-style: italic;
}

.stage-mapping-intel-brief__empty {
  margin: 0;
  font-size: 14px;
  line-height: 1.4;
  color: #94a3b8;
  font-style: italic;
}

.stage-mapping-intel-brief__list {
  margin: 0;
  padding-left: 16px;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.45;
  color: #475569;
}

.stage-mapping-intel-brief__next-line {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  line-height: 1.45;
  color: #0f766e;
}

.stage-mapping-add-intelligence,
.stage-mapping-intel-action,
.stage-mapping-contact-submit {
  font: inherit;
}

.stage-mapping-add-intelligence {
  margin-top: 8px;
  padding: 10px 14px;
  border: 1px dashed #94a3b8;
  border-radius: 10px;
  background: #f8fafc;
  color: #0f766e;
  font-weight: 700;
  cursor: pointer;
}

.stage-mapping-intel-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}

.stage-mapping-intel-action {
  padding: 8px 12px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: #fff;
  color: #334155;
  font-weight: 600;
  cursor: pointer;
}

.stage-mapping-intel-action--primary {
  border-color: #0f766e;
  background: #0f766e;
  color: #fff;
}

.stage-mapping-intel-editor {
  display: grid;
  gap: 12px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #e2e8f0;
}

.stage-mapping-editor-field {
  display: grid;
  gap: 6px;
}

.stage-mapping-editor-label {
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: #64748b;
}

.stage-mapping-confidence-fieldset {
  border: 0;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 8px;
}

.stage-mapping-confidence-options {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.stage-mapping-confidence-option {
  padding: 8px 10px;
  border: 1px solid #cbd5e1;
  border-radius: 999px;
  background: #fff;
  color: #334155;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.stage-mapping-confidence-option--selected {
  border-color: #0f766e;
  background: #ecfdf5;
  color: #0f766e;
}

.stage-mapping-intel-brief__read-block {
  display: grid;
  gap: 4px;
  margin-bottom: 10px;
}

.stage-mapping-intel-brief__read-label {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  color: #64748b;
}

.stage-mapping-intel-brief__confidence-read {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: #0f766e;
}

.stage-mapping-intel-brief__source-line,
.stage-mapping-intel-brief__next-action {
  margin: 0;
  font-size: 12px;
  color: #64748b;
}

.stage-mapping-intel-brief__lead {
  margin-top: 4px;
  padding-top: 8px;
  border-top: 1px dashed color-mix(in srgb, #14b8a6 25%, #e2e8f0);
}

.stage-mapping-intel-brief__lead-name {
  margin: 0 0 2px;
  font-size: 14px;
  font-weight: 800;
  color: #0f172a;
}

.stage-mapping-intel-brief__lead-hint {
  margin: 0 0 8px;
  font-size: 11px;
  color: #64748b;
}

.stage-mapping-intel-brief__lead-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.stage-mapping-intel-brief__lead-btn {
  margin: 0;
  padding: 6px 10px;
  border-radius: 7px;
  border: 1px solid #cbd5e1;
  background: #fff;
  font-size: 11px;
  font-weight: 700;
  color: #334155;
  cursor: pointer;
  font-family: inherit;
}

.stage-mapping-intel-brief__lead-btn--primary {
  border-color: color-mix(in srgb, var(--brand-600, #2563eb) 40%, #cbd5e1);
  background: color-mix(in srgb, var(--brand-600, #2563eb) 8%, #fff);
  color: #1e40af;
}

.stage-mapping-intel-brief__lead-btn--ghost {
  border-color: transparent;
  background: transparent;
  color: #64748b;
}

.stage-mapping-intel-head {
  margin-bottom: 8px;
}

.stage-mapping-intel-head-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.stage-mapping-intel-topic {
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  line-height: 1.35;
  letter-spacing: -0.01em;
  color: #475569;
}

.stage-mapping-intel-context {
  margin: 4px 0 0;
  font-size: 11px;
  font-weight: 500;
  line-height: 1.4;
  color: #94a3b8;
}

.stage-mapping-intel-blocker {
  margin: 0 0 8px;
}

.stage-mapping-confirm,
.stage-mapping-disclosure {
  margin: 8px 0 0;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  overflow: hidden;
}

.stage-mapping-confirm--open,
.stage-mapping-disclosure--open {
  border-style: solid;
  border-color: color-mix(in srgb, #0f172a 12%, #cbd5e1);
  background: #fff;
}

.stage-mapping-disclosure--details {
  border-color: color-mix(in srgb, #64748b 20%, #e2e8f0);
  background: #fafbfc;
}

.stage-mapping-confirm-toggle,
.stage-mapping-disclosure-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  margin: 0;
  padding: 8px 12px;
  border: none;
  background: none;
  cursor: pointer;
  font-family: inherit;
  text-align: left;
}

.stage-mapping-disclosure-chevron {
  flex-shrink: 0;
  width: 12px;
  font-size: 10px;
  color: #64748b;
  line-height: 1;
}

.stage-mapping-disclosure-title {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #64748b;
}

.stage-mapping-confirm-toggle-hint,
.stage-mapping-disclosure-hint {
  flex: 1;
  min-width: 0;
  font-size: 11px;
  font-weight: 600;
  color: #94a3b8;
  text-align: right;
}

.stage-mapping-confirm-body,
.stage-mapping-disclosure-body {
  padding: 0 12px 12px;
  display: grid;
  gap: 8px;
  border-top: 1px solid #f1f5f9;
}

.stage-mapping-disclosure-body .stage-mapping-followup {
  margin: 0;
}

.stage-mapping-disclosure-body .stage-mapping-evidence-quote {
  margin: 0 0 4px;
}

.stage-mapping-validation-details {
  margin: 0;
}

.stage-mapping-validation-details > summary {
  font-size: 11px;
  font-weight: 700;
  color: #64748b;
  cursor: pointer;
  list-style: none;
  padding: 4px 0;
}

.stage-mapping-validation-details > summary::-webkit-details-marker {
  display: none;
}

.stage-mapping-validation-details-body {
  display: grid;
  gap: 6px;
  padding: 4px 0 0;
}

.stage-mapping-meta-field--compact {
  margin: 0;
}

.stage-mapping-meta-field--compact span {
  font-size: 10px;
  font-weight: 700;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.stage-mapping-current-intelligence {
  border-color: color-mix(in srgb, #2563eb 18%, #e2e8f0);
  background: color-mix(in srgb, #2563eb 4%, #fff);
}

.stage-mapping-current-intelligence-kicker,
.stage-mapping-still-need-kicker,
.stage-mapping-suggested-contact-kicker {
  margin: 0 0 6px;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #64748b;
}

.stage-mapping-current-intelligence-summary {
  margin: 0 0 8px;
  font-size: 14px;
  font-weight: 650;
  line-height: 1.4;
  color: #0f172a;
}

.stage-mapping-current-intelligence-meta {
  display: grid;
  gap: 6px;
  margin: 0;
  font-size: 12px;
}

.stage-mapping-current-intelligence-meta div {
  display: grid;
  grid-template-columns: 72px 1fr;
  gap: 8px;
}

.stage-mapping-current-intelligence-meta dt {
  margin: 0;
  font-weight: 700;
  color: #64748b;
}

.stage-mapping-current-intelligence-meta dd {
  margin: 0;
  color: #334155;
}

.stage-mapping-current-intelligence-next {
  margin: 8px 0 0;
  font-size: 12px;
  line-height: 1.4;
  color: #475569;
}

.stage-mapping-current-intelligence-next-kicker {
  font-weight: 700;
  color: #0f172a;
}

.stage-mapping-still-need-list {
  margin: 0;
  padding-left: 18px;
  font-size: 13px;
  line-height: 1.45;
  color: #334155;
}

.stage-mapping-suggested-contact-name {
  margin: 0 0 2px;
  font-size: 16px;
  font-weight: 800;
  color: #0f172a;
}

.stage-mapping-suggested-contact-hint {
  margin: 0 0 10px;
  font-size: 12px;
  color: #64748b;
}

.stage-mapping-suggested-contact-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

/* Decision-first card hierarchy */
.stage-mapping-decision-head {
  margin-bottom: 10px;
}

.stage-mapping-decision-head--compact {
  margin-bottom: 4px;
}

.stage-mapping-decision-head-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.stage-mapping-decision-title {
  margin: 0;
  font-size: 16px;
  font-weight: 750;
  line-height: 1.25;
  letter-spacing: -0.02em;
  color: #0f172a;
}

.stage-mapping-decision-subtext {
  margin: 6px 0 0;
  font-size: 12px;
  font-weight: 500;
  line-height: 1.4;
  color: #64748b;
}

.stage-mapping-decision-status {
  flex-shrink: 0;
  padding: 3px 8px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  border: 1px solid #e2e8f0;
  background: #f1f5f9;
  color: #64748b;
}

.stage-mapping-decision-status--unknown {
  color: #64748b;
  background: #f8fafc;
}

.stage-mapping-decision-status--partial,
.stage-mapping-decision-status--captured {
  color: #b45309;
  background: #fffbeb;
  border-color: #fde68a;
}

.stage-mapping-decision-status--validated,
.stage-mapping-decision-status--confirmed {
  color: #0f766e;
  background: #ecfdf5;
  border-color: #99f6e4;
}

.stage-mapping-decision-primary {
  margin-bottom: 8px;
}

.stage-mapping-choices--primary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(92px, 1fr));
  gap: 8px;
  margin: 0 0 8px;
}

.stage-mapping-choice--primary {
  margin: 0;
  min-height: 42px;
  padding: 10px 8px;
  border-radius: 8px;
  border: 1.5px solid #cbd5e1;
  background: #fff;
  font-size: 12px;
  font-weight: 750;
  color: #0f172a;
  cursor: pointer;
  font-family: inherit;
  transition:
    background 0.12s ease,
    border-color 0.12s ease,
    box-shadow 0.12s ease,
    transform 0.08s ease;
}

.stage-mapping-choice--primary:hover:not(:disabled) {
  border-color: color-mix(in srgb, var(--brand-600, #2563eb) 50%, #cbd5e1);
  box-shadow: 0 1px 4px rgba(15, 23, 42, 0.08);
}

.stage-mapping-choice--primary.stage-mapping-choice--selected {
  border-width: 2px;
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--brand-600, #2563eb) 25%, transparent);
}

.stage-mapping-suggested-inline {
  margin: 0 0 8px;
  font-size: 11px;
  font-weight: 600;
  color: #64748b;
}

.stage-mapping-suggested-inline strong {
  color: #b45309;
  font-weight: 750;
}

.stage-mapping-decision-context {
  display: grid;
  gap: 6px;
  padding-top: 4px;
  border-top: 1px solid #f1f5f9;
}

.stage-mapping-understanding {
  margin: 0;
  font-size: 12px;
  line-height: 1.4;
  color: #475569;
}

.stage-mapping-understanding-kicker {
  font-weight: 700;
  color: #64748b;
}

.stage-mapping-blocker-inline {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  margin: 0;
  padding: 0;
  font-size: 12px;
  font-weight: 650;
  line-height: 1.35;
  color: #b45309;
}

.stage-mapping-blocker-icon {
  flex-shrink: 0;
  line-height: 1.2;
}

.stage-mapping-expand-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  margin: 0;
  padding: 4px 0;
  border: none;
  background: none;
  font-size: 11px;
  font-weight: 700;
  color: #475569;
  cursor: pointer;
  font-family: inherit;
  text-align: left;
}

.stage-mapping-expand-toggle:hover:not(:disabled) {
  color: #0f172a;
}

.stage-mapping-expand-chevron {
  font-size: 14px;
  font-weight: 700;
  color: #94a3b8;
  line-height: 1;
}

.stage-mapping-expand-body {
  margin-top: 4px;
  padding: 0 0 4px 8px;
  border-left: 2px solid #e2e8f0;
}

.stage-mapping-evidence-quote {
  margin: 0 0 4px;
  font-size: 12px;
  line-height: 1.45;
  color: #334155;
  font-style: normal;
}

.stage-mapping-evidence-source {
  margin: 0;
  font-size: 10px;
  color: #94a3b8;
}

.stage-mapping-optional-stack {
  display: grid;
  gap: 8px;
}

.stage-mapping-why-inline {
  margin: 0;
  font-size: 11px;
  line-height: 1.4;
  color: #64748b;
}

.stage-mapping-notes-label {
  font-size: 10px;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.stage-mapping-followup {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px dashed #e2e8f0;
}

.stage-mapping-contact-prompt-label {
  margin: 0 0 8px;
  font-size: 12px;
  font-weight: 650;
  color: #334155;
}

.stage-mapping-contact-prompt-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.stage-mapping-contact-submit--primary {
  width: 100%;
  margin-top: 4px;
}

.stage-mapping-question-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}

.stage-mapping-question-text {
  margin: 0;
  font-size: 13px;
  font-weight: 650;
  line-height: 1.35;
  color: #0f172a;
}

.stage-mapping-choices {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.stage-mapping-choice {
  margin: 0;
  padding: 6px 10px;
  border-radius: 7px;
  border: 1px solid #cbd5e1;
  background: #fff;
  font-size: 11px;
  font-weight: 700;
  color: #334155;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.12s ease, border-color 0.12s ease, color 0.12s ease;
}

.stage-mapping-choice:hover:not(:disabled) {
  border-color: color-mix(in srgb, var(--brand-600, #2563eb) 40%, #cbd5e1);
  color: #0f172a;
}

.stage-mapping-question-head-main {
  display: grid;
  gap: 6px;
  min-width: 0;
}

.stage-mapping-question-badges {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.stage-mapping-priority {
  display: inline-flex;
  align-items: center;
  padding: 2px 7px;
  border-radius: 999px;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  border: 1px solid transparent;
}

.stage-mapping-priority--required_now {
  color: #0e7490;
  background: #ecfeff;
  border-color: #67e8f9;
}

.stage-mapping-priority--helpful {
  color: #475569;
  background: #f1f5f9;
  border-color: #cbd5e1;
}

.stage-mapping-priority--later_stage {
  color: #64748b;
  background: #f8fafc;
  border-color: #e2e8f0;
}

.stage-mapping-expectation-helper {
  margin: 0;
  font-size: 11px;
  font-weight: 600;
  line-height: 1.35;
  color: #64748b;
}

.stage-mapping-question--required_now.stage-mapping-question--active {
  border-color: color-mix(in srgb, #0891b2 35%, #cbd5e1);
  box-shadow: 0 0 0 1px color-mix(in srgb, #0891b2 18%, transparent);
}

.stage-mapping-question--helpful {
  border-left: 3px solid color-mix(in srgb, #64748b 35%, #cbd5e1);
}

.stage-mapping-question--later_stage,
.stage-mapping-question--dimmed {
  opacity: 0.82;
  background: color-mix(in srgb, #64748b 3%, #fff);
}

.stage-mapping-question--later_stage .stage-mapping-question-text,
.stage-mapping-question--dimmed .stage-mapping-question-text {
  color: #475569;
}

.stage-mapping-meta-field--optional > span {
  color: #64748b;
  font-weight: 650;
}

.stage-mapping-notes--optional::placeholder {
  color: #94a3b8;
}

.stage-mapping-type-badge {
  display: inline-flex;
  align-items: center;
  width: fit-content;
  padding: 2px 7px;
  border-radius: 999px;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  border: 1px solid transparent;
}

.stage-mapping-type-badge--approval {
  color: #0f766e;
  background: #ecfdf5;
  border-color: #99f6e4;
}

.stage-mapping-type-badge--ownership {
  color: #1d4ed8;
  background: #eff6ff;
  border-color: #bfdbfe;
}

.stage-mapping-type-badge--champion {
  color: #7c3aed;
  background: #f5f3ff;
  border-color: #ddd6fe;
}

.stage-mapping-type-badge--workflow {
  color: #0369a1;
  background: #f0f9ff;
  border-color: #bae6fd;
}

.stage-mapping-type-badge--product_fit {
  color: #b45309;
  background: #fffbeb;
  border-color: #fde68a;
}

.stage-mapping-type-badge--opportunity {
  color: #be123c;
  background: #fff1f2;
  border-color: #fecdd3;
}

.stage-mapping-type-badge--timing {
  color: #0e7490;
  background: #ecfeff;
  border-color: #a5f3fc;
}

.stage-mapping-type-badge--pathway {
  color: #4338ca;
  background: #eef2ff;
  border-color: #c7d2fe;
}

.stage-mapping-question--ownership,
.stage-mapping-question--champion {
  border-left: 3px solid color-mix(in srgb, #2563eb 55%, #cbd5e1);
}

.stage-mapping-question--workflow {
  border-left: 3px solid color-mix(in srgb, #0284c7 55%, #cbd5e1);
}

.stage-mapping-question--opportunity {
  border-left: 3px solid color-mix(in srgb, #e11d48 45%, #cbd5e1);
}

.stage-mapping-choices--opportunity .stage-mapping-choice--positive {
  min-width: 72px;
}

.stage-mapping-choice--positive:hover:not(:disabled),
.stage-mapping-choice--positive.stage-mapping-choice--selected {
  border-color: #14b8a6;
  background: #ecfdf5;
  color: #0f766e;
}

.stage-mapping-choice--partial:hover:not(:disabled),
.stage-mapping-choice--partial.stage-mapping-choice--selected {
  border-color: #f59e0b;
  background: #fffbeb;
  color: #b45309;
}

.stage-mapping-choice--neutral:hover:not(:disabled),
.stage-mapping-choice--neutral.stage-mapping-choice--selected {
  border-color: #94a3b8;
  background: #f8fafc;
  color: #475569;
}

.stage-mapping-choice--negative:hover:not(:disabled),
.stage-mapping-choice--negative.stage-mapping-choice--selected {
  border-color: #f87171;
  background: #fef2f2;
  color: #b91c1c;
}

.stage-mapping-choice--action:hover:not(:disabled),
.stage-mapping-choice--action.stage-mapping-choice--selected {
  border-color: var(--brand-600, #2563eb);
  background: color-mix(in srgb, var(--brand-600, #2563eb) 8%, #fff);
  color: #1d4ed8;
}

.stage-mapping-meta-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin-top: 8px;
}

.stage-mapping-meta-field {
  display: grid;
  gap: 4px;
  font-size: 10px;
  font-weight: 700;
  color: #64748b;
}

.stage-mapping-meta-field--full {
  grid-column: 1 / -1;
}

.stage-mapping-meta-input {
  width: 100%;
  padding: 6px 8px;
  border-radius: 7px;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  font-size: 12px;
  font-family: inherit;
  color: #0f172a;
}

.stage-mapping-contact {
  margin-top: 8px;
  padding: 8px;
  border-radius: 9px;
  border: 1px solid color-mix(in srgb, var(--brand-600, #2563eb) 22%, #cbd5e1);
  background: color-mix(in srgb, var(--brand-600, #2563eb) 4%, #fff);
}

.stage-mapping-contact .rd-support {
  margin-top: 0;
  border: none;
  border-radius: 0;
}

.stage-mapping-contact-submit {
  margin-top: 8px;
  width: 100%;
  padding: 8px 12px;
  border: none;
  border-radius: 8px;
  background: var(--brand-600, #2563eb);
  color: #fff;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
  font-family: inherit;
}

.stage-mapping-contact-submit:hover:not(:disabled) {
  filter: brightness(1.05);
}

.stage-mapping-contact-submit:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.facility-cred-panel {
  margin-top: 8px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px dashed color-mix(in srgb, #64748b 35%, #cbd5e1);
  background: color-mix(in srgb, #64748b 4%, #fff);
}

.facility-cred-panel-head {
  margin-bottom: 8px;
}

.facility-cred-panel-title {
  margin: 0 0 4px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #475569;
}

.facility-cred-panel-helper {
  margin: 0;
  font-size: 11px;
  font-weight: 600;
  line-height: 1.35;
  color: #64748b;
}

.scheduling-ownership-panel {
  margin-top: 10px;
  padding: 12px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: #f8fafc;
}

.scheduling-ownership-shared-helper {
  margin: 0 0 10px;
  font-size: 12px;
  font-weight: 600;
  color: #475569;
}

.scheduling-ownership-slot + .scheduling-ownership-slot {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed #cbd5e1;
}

.scheduling-ownership-slot-title {
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  color: #0f172a;
}

.scheduling-ownership-slot-helper {
  margin: 4px 0 8px;
  font-size: 11px;
  font-weight: 600;
  color: #64748b;
}

.stage-mapping-choice--confirmed:hover:not(:disabled),
.stage-mapping-choice--confirmed.stage-mapping-choice--selected {
  border-color: #14b8a6;
  background: #ecfdf5;
  color: #0f766e;
}

.stage-mapping-choice--partial:hover:not(:disabled),
.stage-mapping-choice--partial.stage-mapping-choice--selected {
  border-color: #f59e0b;
  background: #fffbeb;
  color: #b45309;
}

.stage-mapping-choice--unknown:hover:not(:disabled),
.stage-mapping-choice--unknown.stage-mapping-choice--selected {
  border-color: #94a3b8;
  background: #f8fafc;
  color: #475569;
}

.stage-mapping-choice--declined:hover:not(:disabled),
.stage-mapping-choice--declined.stage-mapping-choice--selected {
  border-color: #f87171;
  background: #fef2f2;
  color: #b91c1c;
}

.stage-mapping-choice:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.stage-mapping-notes {
  width: 100%;
  margin-top: 8px;
  padding: 7px 9px;
  border-radius: 7px;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  font-size: 12px;
  line-height: 1.35;
  font-family: inherit;
  color: #0f172a;
  resize: vertical;
  min-height: 34px;
}

.stage-mapping-notes:focus {
  outline: 2px solid color-mix(in srgb, var(--brand-600, #2563eb) 45%, transparent);
  outline-offset: 1px;
  border-color: color-mix(in srgb, var(--brand-600, #2563eb) 35%, #cbd5e1);
}

.stage-mapping-impact {
  margin-top: 8px;
  padding: 6px 8px;
  border-radius: 6px;
  background: color-mix(in srgb, #14b8a6 8%, #fff);
  border: 1px solid color-mix(in srgb, #14b8a6 22%, #cbd5e1);
  font-size: 11px;
  font-weight: 600;
  color: #0f766e;
}

.stage-mapping-footer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 14px calc(10px + env(safe-area-inset-bottom, 0px));
  background: #fff;
  border-top: 1px solid #e2e8f0;
  box-shadow: 0 -4px 16px rgba(15, 23, 42, 0.06);
}

.stage-mapping-inline-complete {
  margin: 6px 14px 10px;
  padding: 6px 8px;
  border-radius: 7px;
  border: 1px solid color-mix(in srgb, #14b8a6 24%, #cbd5e1);
  background: color-mix(in srgb, #14b8a6 8%, #fff);
  font-size: 11px;
  font-weight: 650;
  color: #0f766e;
}

.stage-mapping-footer-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.stage-mapping-footer-btn {
  margin: 0;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid #cbd5e1;
  background: #fff;
  font-size: 12px;
  font-weight: 700;
  color: #334155;
  cursor: pointer;
  font-family: inherit;
}

.stage-mapping-footer-btn:hover:not(:disabled) {
  background: #f8fafc;
}

.stage-mapping-footer-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.stage-mapping-footer-btn--primary {
  border-color: var(--brand-600, #2563eb);
  background: var(--brand-600, #2563eb);
  color: #fff;
}

.stage-mapping-footer-btn--primary:hover:not(:disabled) {
  filter: brightness(1.05);
}

.stage-mapping-entry {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.stage-mapping-entry-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  margin: 0;
  padding: 11px 14px;
  border: none;
  border-radius: 9px;
  background: linear-gradient(
    165deg,
    color-mix(in srgb, var(--brand-600, #2563eb) 92%, #fff) 0%,
    var(--brand-600, #2563eb) 100%
  );
  color: #fff;
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.01em;
  cursor: pointer;
  font-family: inherit;
  box-shadow: 0 4px 14px color-mix(in srgb, var(--brand-600, #2563eb) 35%, rgba(15, 23, 42, 0.2));
}

.stage-mapping-entry-btn:hover {
  filter: brightness(1.05);
}

.stage-mapping-entry-copy {
  margin: 0 0 10px;
  font-size: 12px;
  line-height: 1.4;
  color: rgba(226, 232, 240, 0.88);
}

.stage-mapping-entry-eyebrow {
  margin: 0 0 4px;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(148, 163, 184, 0.95);
}

.stage-mapping-question--collapsed {
  padding: 8px 10px;
}

.stage-mapping-decision-title--compact {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 700;
  line-height: 1.3;
  color: #0f172a;
}

.stage-mapping-compact-check {
  display: inline-grid;
  place-items: center;
  width: 16px;
  height: 16px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 800;
  color: #64748b;
  background: #e2e8f0;
}

.stage-mapping-compact-check--confirmed {
  color: #0f766e;
  background: #ccfbf1;
}

.stage-mapping-compact-action {
  margin: 0;
  padding: 2px 6px;
  border: 1px solid #cbd5e1;
  border-radius: 999px;
  background: #fff;
  font-size: 10px;
  font-weight: 700;
  color: #1d4ed8;
  cursor: pointer;
  font-family: inherit;
}

.stage-mapping-compact-action:hover:not(:disabled) {
  border-color: #93c5fd;
  background: #eff6ff;
}

.stage-mapping-collapsed-meta {
  display: flex;
  align-items: center;
  gap: 6px;
}

.stage-mapping-collapsed-confidence {
  font-size: 10px;
  font-weight: 600;
  color: #64748b;
}

.stage-mapping-collapsed-source {
  font-size: 10px;
  font-weight: 500;
  color: #94a3b8;
  letter-spacing: 0.01em;
}

.stage-mapping-source-hint {
  margin: 0;
  font-size: 11px;
  font-weight: 500;
  color: #94a3b8;
}

.stage-mapping-decision-status--conditional,
.stage-mapping-decision-status--likely {
  color: #c2410c;
  background: #fff7ed;
  border-color: #fed7aa;
}

.stage-mapping-question--active .stage-mapping-decision-primary {
  padding: 2px 0 0;
}

.stage-mapping-intel-summary {
  margin: 4px 0 0;
  font-size: 11px;
  line-height: 1.35;
}

.stage-mapping-evidence-line {
  margin: 4px 0 0;
  font-size: 11px;
  line-height: 1.4;
  color: #334155;
}

.stage-mapping-evidence-source {
  margin: 2px 0 0;
  font-size: 10px;
}

.stage-mapping-suggested {
  margin: 6px 0 0;
  font-size: 11px;
  font-weight: 650;
  color: #334155;
}

.stage-mapping-suggested-kicker {
  display: block;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #64748b;
  margin-bottom: 2px;
}

.stage-mapping-choice--suggested {
  box-shadow: 0 0 0 1px color-mix(in srgb, #f59e0b 45%, transparent);
}

.stage-mapping-collapse {
  margin-top: 6px;
}

.stage-mapping-collapse-toggle {
  margin: 0;
  padding: 0;
  border: none;
  background: none;
  font-size: 11px;
  font-weight: 700;
  color: #475569;
  cursor: pointer;
  font-family: inherit;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.stage-mapping-collapse-body {
  margin-top: 6px;
}

.stage-mapping-text-btn {
  margin: 6px 0 0;
  padding: 0;
  border: none;
  background: none;
  font-size: 11px;
  font-weight: 700;
  color: var(--brand-600, #2563eb);
  cursor: pointer;
  font-family: inherit;
}

.stage-mapping-notes-wrap {
  display: grid;
  gap: 4px;
  margin-top: 6px;
}

.stage-mapping-meta-grid--compact {
  gap: 6px;
}

.facility-cred-panel--compact {
  margin-top: 8px;
  padding: 0;
  border: none;
  background: transparent;
  box-shadow: none;
}

.facility-cred-panel--compact .facility-cred-panel-head {
  margin-bottom: 6px;
}

.facility-cred-panel--compact .facility-cred-panel-title {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: #64748b;
}

.facility-cred-panel--compact .facility-cred-panel-helper {
  margin: 2px 0 0;
  font-size: 11px;
  line-height: 1.35;
}

.facility-cred-compact-grid {
  display: grid;
  gap: 6px;
}

.facility-cred-open-workflow {
  margin-top: 8px;
}

/* Intelligence capture category dashboard */
.intel-capture-dashboard {
  display: grid;
  gap: 14px;
}

.intel-capture-dashboard-intro {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.45;
  color: #475569;
}

.intel-capture-dashboard-grid {
  display: grid;
  gap: 10px;
}

@media (min-width: 640px) {
  .intel-capture-dashboard-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.intel-capture-category-card {
  margin: 0;
  padding: 0;
  border: 1px solid color-mix(in srgb, #0f172a 10%, #cbd5e1);
  border-radius: 12px;
  background: #fff;
  text-align: left;
  cursor: pointer;
  font-family: inherit;
  transition: border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;
}

.intel-capture-category-card:hover {
  border-color: color-mix(in srgb, #14b8a6 35%, #cbd5e1);
  box-shadow: 0 6px 20px rgba(15, 23, 42, 0.08);
  transform: translateY(-1px);
}

.intel-capture-category-card--suggested {
  border-color: color-mix(in srgb, #14b8a6 40%, #cbd5e1);
  background: linear-gradient(
    180deg,
    color-mix(in srgb, #14b8a6 6%, #fff) 0%,
    #fff 100%
  );
}

.intel-capture-category-card-inner {
  display: grid;
  gap: 8px;
  padding: 14px 14px 12px;
}

.intel-capture-category-card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}

.intel-capture-category-card-title-row {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 6px 10px;
  width: 100%;
}

.intel-capture-category-card-title {
  margin: 0;
  font-size: 14px;
  font-weight: 800;
  letter-spacing: -0.01em;
  color: #0f172a;
}

.intel-capture-category-card-status {
  flex-shrink: 0;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.intel-capture-category-card-status--empty {
  color: #64748b;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
}

.intel-capture-category-card-status--partial {
  color: #b45309;
  background: #fffbeb;
  border: 1px solid #fde68a;
}

.intel-capture-category-card-status--healthy {
  color: #0f766e;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
}

.intel-capture-category-card-status--complete {
  color: #1d4ed8;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
}

.intel-capture-category-card--empty {
  border-color: #e2e8f0;
}

.intel-capture-category-card--partial {
  border-color: color-mix(in srgb, #f59e0b 28%, #e2e8f0);
}

.intel-capture-category-card--healthy {
  border-color: color-mix(in srgb, #14b8a6 30%, #e2e8f0);
}

.intel-capture-category-card--complete {
  border-color: color-mix(in srgb, #3b82f6 30%, #e2e8f0);
}

.intel-capture-category-card-desc {
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.4;
  color: #64748b;
}

.intel-capture-category-card-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 12px;
  padding-top: 4px;
  border-top: 1px solid #e2e8f0;
}

.intel-capture-category-card-stat {
  font-size: 11px;
  font-weight: 700;
  color: #64748b;
}

.intel-capture-category-card-stat strong {
  color: #0f172a;
  font-weight: 800;
}

.intel-capture-category-card-stat--open strong {
  color: #b45309;
}

.intel-capture-category-detail-head {
  display: grid;
  gap: 6px;
  margin-bottom: 12px;
}

.intel-capture-category-back {
  margin: 0;
  padding: 0;
  border: none;
  background: none;
  font-size: 12px;
  font-weight: 700;
  color: #0f766e;
  cursor: pointer;
  font-family: inherit;
  text-align: left;
  width: fit-content;
}

.intel-capture-category-back:hover {
  text-decoration: underline;
  text-underline-offset: 2px;
}

.intel-capture-category-detail-title {
  margin: 0;
  font-size: 17px;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: #0f172a;
}

.intel-capture-category-detail-desc {
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.4;
  color: #64748b;
}

.intel-capture-category-detail-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 14px;
  font-size: 11px;
  font-weight: 700;
  color: #64748b;
}

.intel-capture-category-detail-meta strong {
  color: #0f172a;
}

.intel-capture-finding-panel {
  display: grid;
  gap: 16px;
}

.intel-capture-finding-compose {
  display: grid;
  gap: 10px;
  padding: 14px;
  border-radius: 12px;
  border: 1px solid color-mix(in srgb, #14b8a6 22%, #cbd5e1);
  background: color-mix(in srgb, #14b8a6 5%, #fff);
}

.intel-capture-finding-label {
  display: grid;
  gap: 6px;
  font-size: 12px;
  font-weight: 800;
  color: #0f172a;
}

.intel-capture-finding-input {
  width: 100%;
  min-height: 108px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid #cbd5e1;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.45;
  color: #0f172a;
  font-family: inherit;
  resize: vertical;
  background: #fff;
}

.intel-capture-finding-input:focus {
  outline: 2px solid color-mix(in srgb, #14b8a6 35%, transparent);
  border-color: color-mix(in srgb, #14b8a6 45%, #cbd5e1);
}

.intel-capture-finding-actions {
  display: flex;
  gap: 8px;
}

.intel-capture-finding-save {
  margin: 0;
  padding: 9px 14px;
  border: none;
  border-radius: 8px;
  background: #0f766e;
  color: #fff;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
  font-family: inherit;
}

.intel-capture-finding-save:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.intel-capture-finding-confirmation {
  margin: 0;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.4;
  color: #0f766e;
}

.intel-capture-finding-followup {
  color: #64748b;
  font-weight: 600;
}

.intel-capture-finding-error {
  margin: 0;
  font-size: 12px;
  font-weight: 700;
  color: #b91c1c;
}

.intel-capture-finding-feed-title {
  margin: 0 0 8px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #64748b;
}

.intel-capture-finding-feed-empty {
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  color: #94a3b8;
}

.intel-capture-finding-feed-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 8px;
}

.intel-capture-finding-feed-item {
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
  background: #fff;
}

.intel-capture-finding-feed-text {
  margin: 0 0 4px;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.4;
  color: #0f172a;
}

.intel-capture-finding-feed-meta {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #94a3b8;
}

.intel-capture-validation-details {
  border-radius: 10px;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  padding: 0 12px 12px;
}

.intel-capture-validation-summary {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 6px 12px;
  padding: 12px 0;
  cursor: pointer;
  list-style: none;
}

.intel-capture-validation-summary::-webkit-details-marker {
  display: none;
}

.intel-capture-validation-title {
  font-size: 12px;
  font-weight: 800;
  color: #334155;
}

.intel-capture-validation-hint {
  font-size: 11px;
  font-weight: 600;
  color: #94a3b8;
}

.intel-capture-validation-footnote {
  margin: 8px 0 0;
  font-size: 11px;
  font-weight: 600;
  color: #94a3b8;
}

.stage-mapping-questions--validation {
  gap: 8px;
}

.intel-cat-workspace {
  display: grid;
  gap: 14px;
}

.intel-cat-workspace-header {
  display: grid;
  gap: 4px;
}

.intel-cat-workspace-title {
  margin: 0;
  font-size: 17px;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: #0f172a;
}

.intel-cat-workspace-desc {
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.45;
  color: #64748b;
}

.intel-cat-workspace-progress {
  display: grid;
  gap: 8px;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
}

.intel-cat-workspace-progress--empty {
  border-color: #e2e8f0;
  background: #f8fafc;
}

.intel-cat-workspace-progress--partial {
  border-color: #fde68a;
  background: #fffbeb;
}

.intel-cat-workspace-progress--healthy {
  border-color: #bbf7d0;
  background: #f0fdf4;
}

.intel-cat-workspace-progress--complete {
  border-color: #bfdbfe;
  background: #eff6ff;
}

.intel-cat-workspace-progress-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
}

.intel-cat-workspace-progress-label {
  font-size: 12px;
  font-weight: 800;
  color: #334155;
}

.intel-cat-workspace-progress-status {
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.intel-cat-workspace-progress-status--empty {
  color: #64748b;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
}

.intel-cat-workspace-progress-status--partial {
  color: #b45309;
  background: #fff;
  border: 1px solid #fde68a;
}

.intel-cat-workspace-progress-status--healthy {
  color: #0f766e;
  background: #fff;
  border: 1px solid #bbf7d0;
}

.intel-cat-workspace-progress-status--complete {
  color: #1d4ed8;
  background: #fff;
  border: 1px solid #bfdbfe;
}

.intel-cat-workspace-progress-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 14px;
  font-size: 11px;
  font-weight: 700;
  color: #64748b;
}

.intel-cat-workspace-progress-stats strong {
  color: #0f172a;
  font-weight: 800;
}

.intel-cat-workspace-compose {
  margin: 0;
}

.intel-cat-workspace-grid {
  display: grid;
  gap: 10px;
}

@media (min-width: 640px) {
  .intel-cat-workspace-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .intel-cat-workspace-grid > .intel-cat-workspace-section:last-child:nth-child(odd) {
    grid-column: 1 / -1;
  }
}

.intel-cat-workspace-section {
  display: grid;
  gap: 8px;
  padding: 12px;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
  background: #fff;
}

.intel-cat-workspace-section-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
}

.intel-cat-workspace-section-title {
  margin: 0;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: #334155;
}

.intel-cat-workspace-section-count {
  min-width: 20px;
  padding: 2px 7px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 800;
  text-align: center;
  color: #475569;
  background: #f1f5f9;
}

.intel-cat-workspace-empty {
  margin: 0;
  font-size: 11px;
  font-weight: 600;
  line-height: 1.45;
  color: #94a3b8;
}

.intel-cat-workspace-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 8px;
}

.intel-cat-workspace-list-item {
  display: grid;
  gap: 3px;
  padding: 8px 10px;
  border-radius: 8px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
}

.intel-cat-workspace-list-item--confirmed {
  border-color: #bbf7d0;
  background: #f0fdf4;
}

.intel-cat-workspace-list-text {
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.4;
  color: #0f172a;
}

.intel-cat-workspace-quote {
  font-style: italic;
}

.intel-cat-workspace-list-meta {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  color: #94a3b8;
}

.intel-cat-workspace-open-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 6px;
}

.intel-cat-workspace-open-item {
  display: grid;
  gap: 4px;
  width: 100%;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid #fde68a;
  background: #fffbeb;
  text-align: left;
  cursor: pointer;
  font-family: inherit;
  transition: border-color 0.15s ease, background 0.15s ease;
}

.intel-cat-workspace-open-item:hover {
  border-color: #fbbf24;
  background: #fef3c7;
}

.intel-cat-workspace-open-item--active {
  border-color: #0d9488;
  background: #f0fdfa;
  box-shadow: 0 0 0 1px #99f6e4;
}

.intel-cat-workspace-open-question {
  font-size: 12px;
  font-weight: 700;
  line-height: 1.35;
  color: #0f172a;
}

.intel-cat-workspace-open-status {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  color: #b45309;
}

.intel-cat-workspace-open-item--active .intel-cat-workspace-open-status {
  color: #0f766e;
}

.intel-cat-workspace-validation {
  display: grid;
  gap: 10px;
  padding: 12px;
  border-radius: 10px;
  border: 1px solid #99f6e4;
  background: #f0fdfa;
}

.intel-cat-workspace-validation-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.intel-cat-workspace-validation-title {
  margin: 0;
  font-size: 12px;
  font-weight: 800;
  color: #0f766e;
}

.intel-cat-workspace-validation-close {
  margin: 0;
  padding: 4px 8px;
  border: none;
  border-radius: 6px;
  background: transparent;
  font-size: 11px;
  font-weight: 700;
  color: #64748b;
  cursor: pointer;
  font-family: inherit;
}

.intel-cat-workspace-validation-close:hover {
  color: #0f172a;
  background: #e2e8f0;
}

.intel-capture-method-picker {
  display: grid;
  gap: 14px;
}

.intel-capture-method-picker-head {
  display: grid;
  gap: 4px;
}

.intel-capture-method-picker-title {
  margin: 0;
  font-size: 17px;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: #0f172a;
}

.intel-capture-method-picker-subtitle {
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.45;
  color: #64748b;
}

.intel-capture-method-picker-examples {
  margin: 0;
  font-size: 11px;
  font-weight: 600;
  line-height: 1.4;
  color: #94a3b8;
}

.intel-capture-method-review-link {
  margin: 4px 0 0;
  padding: 0;
  border: none;
  background: none;
  font-size: 11px;
  font-weight: 700;
  color: #0f766e;
  cursor: pointer;
  font-family: inherit;
  text-align: left;
  width: fit-content;
}

.intel-capture-method-review-link:hover {
  text-decoration: underline;
  text-underline-offset: 2px;
}

.intel-capture-method-grid {
  display: grid;
  gap: 10px;
}

@media (min-width: 560px) {
  .intel-capture-method-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.intel-capture-method-card {
  display: grid;
  gap: 4px;
  padding: 14px;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  background: #fff;
  text-align: left;
  cursor: pointer;
  font-family: inherit;
  transition: border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;
}

.intel-capture-method-card:hover {
  border-color: #99f6e4;
  box-shadow: 0 4px 14px rgba(15, 118, 110, 0.08);
  transform: translateY(-1px);
}

.intel-capture-method-card-icon {
  font-size: 18px;
  line-height: 1;
}

.intel-capture-method-card-name {
  font-size: 14px;
  font-weight: 800;
  color: #0f172a;
}

.intel-capture-method-card-desc {
  font-size: 12px;
  font-weight: 600;
  line-height: 1.4;
  color: #475569;
}

.intel-capture-method-card-hint {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  color: #94a3b8;
}

.intel-capture-bulk-panel,
.intel-capture-quick-panel,
.intel-capture-guided-panel {
  display: grid;
  gap: 12px;
}

.intel-capture-bulk-head,
.intel-capture-quick-head,
.intel-capture-guided-head {
  display: grid;
  gap: 4px;
}

.intel-capture-bulk-title,
.intel-capture-quick-title,
.intel-capture-guided-title {
  margin: 0;
  font-size: 16px;
  font-weight: 800;
  color: #0f172a;
}

.intel-capture-bulk-desc,
.intel-capture-guided-desc {
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.45;
  color: #64748b;
}

.intel-capture-finding-input--bulk {
  min-height: 180px;
  resize: vertical;
}

.intel-capture-bulk-voice {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
}

.intel-capture-bulk-mic {
  width: 44px;
  height: 44px;
  border-radius: 999px;
  border: 1px solid #99f6e4;
  background: #f0fdfa;
  font-size: 20px;
  cursor: pointer;
  line-height: 1;
}

.intel-capture-bulk-mic--active {
  border-color: #0d9488;
  background: #ccfbf1;
  box-shadow: 0 0 0 3px rgba(20, 184, 166, 0.2);
}

.intel-capture-bulk-voice-meta {
  display: grid;
  gap: 2px;
  flex: 1;
  min-width: 140px;
}

.intel-capture-bulk-voice-status {
  font-size: 12px;
  font-weight: 700;
  color: #0f766e;
}

.intel-capture-bulk-voice-hint,
.intel-capture-bulk-voice-captured {
  font-size: 11px;
  font-weight: 600;
  color: #64748b;
}

.intel-capture-bulk-voice-error {
  font-size: 11px;
  font-weight: 700;
  color: #b45309;
}

.intel-capture-bulk-voice-pause {
  margin: 0;
  padding: 6px 10px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  background: #fff;
  font-size: 11px;
  font-weight: 700;
  color: #475569;
  cursor: pointer;
  font-family: inherit;
}

.intel-capture-bulk-preview {
  display: grid;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
}

.intel-capture-bulk-preview-title {
  margin: 0;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  color: #64748b;
}

.intel-capture-bulk-preview-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 6px;
}

.intel-capture-bulk-preview-item {
  padding: 8px 10px;
  border-radius: 8px;
  background: #fff;
  border: 1px solid #e2e8f0;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.4;
  color: #0f172a;
}

.intel-capture-guided-questions {
  gap: 10px;
}

.intel-capture-guided-empty {
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  color: #94a3b8;
}

.intel-capture-first {
  display: grid;
  gap: 12px;
  padding: 16px;
  border-radius: 14px;
  border: 1px solid #c7d2fe;
  background: linear-gradient(180deg, #eef2ff 0%, #fff 70%);
  margin-bottom: 16px;
}

.intel-capture-first-head {
  display: grid;
  gap: 4px;
}

.intel-capture-first-title {
  margin: 0;
  font-size: 16px;
  font-weight: 800;
  color: #0f172a;
}

.intel-capture-first-subtitle {
  margin: 0;
  font-size: 12.5px;
  font-weight: 600;
  color: #475569;
}

.intel-capture-first-input {
  width: 100%;
  box-sizing: border-box;
  padding: 12px;
  border-radius: 10px;
  border: 1px solid #cbd5e1;
  background: #fff;
  font: inherit;
  font-size: 13.5px;
  line-height: 1.5;
  color: #0f172a;
  resize: vertical;
  min-height: 110px;
}

.intel-capture-first-input:focus {
  outline: 2px solid #6366f1;
  outline-offset: 1px;
}

.intel-capture-first-actions {
  display: flex;
  justify-content: flex-end;
}

.intel-capture-first-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 10px;
}

.intel-capture-first-card {
  display: grid;
  gap: 8px;
  padding: 12px;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  background: #fff;
}

.intel-capture-first-card--discarded {
  opacity: 0.55;
  background: #f8fafc;
}

.intel-capture-first-card--saved {
  border-color: #86efac;
  background: #f0fdf4;
}

.intel-capture-first-card-finding {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.5;
  color: #0f172a;
}

.intel-capture-first-card-reason {
  margin: 0;
  font-size: 11.5px;
  font-weight: 600;
  color: #64748b;
}

.intel-capture-first-card-access {
  margin: 0;
  display: grid;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 700;
  background: #fef9c3;
  border: 1px solid #fde047;
  color: #854d0e;
}

.intel-capture-first-card-access--approved {
  background: #dcfce7;
  border-color: #86efac;
  color: #166534;
}

.intel-capture-first-card-access-note {
  font-size: 12px;
  font-weight: 700;
}

.intel-capture-first-card-access-choices {
  display: grid;
  gap: 4px;
}

.intel-capture-first-card-access-choice {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  color: #0f172a;
  cursor: pointer;
}

.intel-capture-first-card-controls {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
}

.intel-capture-first-card-select {
  display: grid;
  gap: 4px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  color: #64748b;
}

.intel-capture-first-card-select select {
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  text-transform: none;
  letter-spacing: normal;
  color: #0f172a;
  padding: 7px 10px;
  border-radius: 8px;
  border: 1px solid #cbd5e1;
  background: #fff;
  min-width: 220px;
}

.intel-capture-first-card-discard {
  border: 1px solid #e2e8f0;
  background: #fff;
  border-radius: 8px;
  padding: 7px 12px;
  font-size: 12px;
  font-weight: 700;
  color: #64748b;
  cursor: pointer;
}

.intel-capture-first-card-discard:hover {
  border-color: #94a3b8;
  color: #0f172a;
}

.intel-capture-first-card-status--saved {
  font-size: 12px;
  font-weight: 800;
  color: #16a34a;
}

.intel-capture-first-card-error {
  margin: 0;
  font-size: 12px;
  font-weight: 700;
  color: #dc2626;
}

.intel-capture-first-unplaced {
  display: grid;
  gap: 8px;
  padding: 12px;
  border-radius: 12px;
  border: 1px dashed #fbbf24;
  background: #fffbeb;
}

.intel-capture-first-unplaced-title {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 800;
  color: #92400e;
}

.intel-capture-first-unplaced-badge {
  font-size: 10.5px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  padding: 2px 8px;
  border-radius: 999px;
  background: #fde68a;
  color: #78350f;
}

.intel-capture-first-unplaced-hint {
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  color: #a16207;
}

.intel-capture-browse-areas {
  display: grid;
  gap: 2px;
  margin: 4px 0 10px;
}

.intel-capture-browse-areas-title {
  margin: 0;
  font-size: 13.5px;
  font-weight: 800;
  color: #0f172a;
}

.intel-capture-browse-areas-subtitle {
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
}

@media (max-width: 480px) {
  .stage-mapping-header {
    padding: 10px 12px;
    gap: 8px;
  }

  .stage-mapping-title {
    font-size: 15px;
  }

  .stage-mapping-header-btn {
    min-height: 40px;
    padding: 8px 10px;
  }

  .stage-mapping-header-btn--close {
    width: 40px;
    min-height: 40px;
  }

  .stage-mapping-body {
    padding: 10px 10px calc(96px + env(safe-area-inset-bottom, 0px));
    gap: 10px;
  }

  .stage-mapping-choices--primary {
    grid-template-columns: 1fr;
  }

  .stage-mapping-choice--primary {
    min-height: 44px;
  }

  .stage-mapping-meta-grid,
  .stage-mapping-choices {
    grid-template-columns: 1fr;
  }

  .stage-mapping-notes {
    min-height: 72px;
    font-size: 16px;
  }

  .stage-mapping-footer {
    flex-direction: column;
    align-items: stretch;
    padding: 10px 10px calc(10px + env(safe-area-inset-bottom, 0px));
  }

  .stage-mapping-footer-actions {
    width: 100%;
    display: grid;
    grid-template-columns: 1fr;
    gap: 8px;
  }

  .stage-mapping-footer-btn {
    width: 100%;
    min-height: 44px;
    box-sizing: border-box;
  }

  .intel-capture-bulk-voice-meta {
    min-width: 0;
  }

  .intel-capture-first-card-controls {
    flex-direction: column;
    align-items: stretch;
  }

  .intel-capture-first-card-select,
  .intel-capture-first-card-select select {
    width: 100%;
    min-width: 0;
    box-sizing: border-box;
  }

  .intel-capture-first-card-select select {
    min-height: 44px;
    font-size: 16px;
  }

  .intel-capture-first-card-discard {
    width: 100%;
    min-height: 44px;
    box-sizing: border-box;
  }
}
`;
