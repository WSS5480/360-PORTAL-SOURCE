/** Observation case Workflow tab — prep and structured intelligence sections. */

export const caseObservationWorkflowTabCss = `
.case-obs-tab-panel .case-obs-workflow-intro,
.case-obs-tab-panel .case-obs-workflow-sections {
  padding-left: 12px;
  padding-right: 12px;
}

.case-obs-tab-panel .case-obs-workflow-sections {
  padding-bottom: 12px;
}

.case-obs-workflow-intro {
  margin: 0 0 12px;
  font-size: 12px;
  line-height: 1.45;
  color: var(--muted);
}

.case-obs-workflow-sections {
  display: grid;
  gap: 0;
  min-width: 0;
}

.case-obs-workflow-section {
  display: grid;
  gap: 10px;
  padding: 12px 0;
  border-bottom: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
  min-width: 0;
}

.case-obs-workflow-section:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.case-obs-workflow-section-title {
  margin: 0;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted);
}

.case-obs-workflow-section-lead {
  margin: -4px 0 0;
  font-size: 12px;
  line-height: 1.4;
  color: color-mix(in srgb, var(--foreground) 62%, var(--muted));
}

.case-obs-readiness {
  display: grid;
  gap: 10px;
  padding: 12px 0 14px;
  border-bottom: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
}

.case-obs-readiness-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.case-obs-readiness-title {
  margin: 0;
  font-size: 13px;
  font-weight: 900;
  letter-spacing: -0.01em;
  color: var(--foreground);
}

.case-obs-readiness-lead {
  margin: 0;
  font-size: 12px;
  line-height: 1.45;
  color: color-mix(in srgb, var(--foreground) 58%, var(--muted));
}

.case-obs-readiness-groups {
  display: grid;
  gap: 12px;
}

.case-obs-readiness-group {
  display: grid;
  gap: 6px;
}

.case-obs-readiness-group-title {
  margin: 0;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--muted);
}

.case-obs-readiness-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 5px;
}

.case-obs-readiness-list li {
  position: relative;
  padding-left: 14px;
  font-size: 13px;
  font-weight: 650;
  line-height: 1.4;
  color: var(--foreground);
}

.case-obs-readiness-list li::before {
  content: "";
  position: absolute;
  left: 0;
  top: 0.55em;
  width: 5px;
  height: 5px;
  border-radius: 999px;
  background: currentColor;
  opacity: 0.55;
}

.case-obs-readiness-list--open li {
  color: color-mix(in srgb, var(--foreground) 82%, #92400e);
}

.case-obs-readiness-list--open li::before {
  background: #d97706;
  opacity: 1;
}

.case-obs-readiness-list--confirmed li,
.case-obs-readiness-list--known li {
  color: color-mix(in srgb, var(--foreground) 78%, #166534);
}

.case-obs-readiness-list--confirmed li::before,
.case-obs-readiness-list--known li::before {
  background: #16a34a;
  opacity: 1;
}

.case-obs-readiness-list--needs-confirmation li {
  color: color-mix(in srgb, var(--foreground) 80%, #b45309);
}

.case-obs-readiness-list--needs-confirmation li::before {
  background: #d97706;
  opacity: 1;
}

.case-obs-readiness-list--next-questions li {
  color: color-mix(in srgb, var(--foreground) 82%, var(--brand-700));
}

.case-obs-readiness-list--next-questions li::before {
  background: var(--brand-600);
  opacity: 1;
}

.case-obs-readiness-empty-group {
  margin: 0;
  font-size: 12px;
  font-weight: 650;
  color: var(--muted);
}

.case-obs-onsite {
  border-bottom: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
}

.case-obs-onsite-toggle {
  display: grid;
  grid-template-columns: 1fr auto;
  grid-template-rows: auto auto;
  gap: 2px 8px;
  width: 100%;
  padding: 10px 0;
  border: none;
  background: transparent;
  text-align: left;
  cursor: pointer;
  font-family: inherit;
}

.case-obs-onsite-toggle > span:first-child {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--muted);
}

.case-obs-onsite-toggle-hint {
  grid-column: 1;
  font-size: 11px;
  font-weight: 650;
  color: color-mix(in srgb, var(--foreground) 55%, var(--muted));
}

.case-obs-onsite-chevron {
  grid-row: 1 / span 2;
  grid-column: 2;
  align-self: center;
  font-size: 10px;
  color: var(--muted);
}

.case-obs-onsite-body {
  display: grid;
  gap: 12px;
  padding-bottom: 12px;
}

.case-obs-onsite-block {
  display: grid;
  gap: 8px;
}

.case-obs-onsite-block-title {
  margin: 0;
  font-size: 11px;
  font-weight: 800;
  color: var(--foreground);
}

.case-obs-ai-extract {
  display: grid;
  gap: 10px;
  margin-top: 4px;
  padding: 10px 0 14px;
  border-top: 1px dashed color-mix(in srgb, var(--foreground) 10%, var(--border));
}

.case-obs-ai-extract--pending {
  opacity: 0.92;
}

.case-obs-ai-extract-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.case-obs-ai-extract-title {
  margin: 0;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--foreground) 52%, var(--muted));
}

.case-obs-ai-extract-lead {
  margin: 4px 0 0;
  max-width: 52ch;
  font-size: 11px;
  line-height: 1.45;
  font-weight: 600;
  color: color-mix(in srgb, var(--foreground) 48%, var(--muted));
}

.case-obs-ai-extract-updated {
  margin: 0;
  flex-shrink: 0;
  font-size: 10px;
  font-weight: 650;
  color: var(--muted);
}

.case-obs-ai-extract-grid {
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}

.case-obs-ai-extract-card {
  display: grid;
  gap: 6px;
  min-height: 72px;
  padding: 9px 10px;
  border-radius: 8px;
  min-width: 0;
}

.case-obs-ai-extract-card--empty {
  border: 1px dashed color-mix(in srgb, var(--foreground) 10%, var(--border));
  background: color-mix(in srgb, var(--foreground) 1.5%, transparent);
}

.case-obs-ai-extract-card--filled {
  border: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));
  background: color-mix(in srgb, var(--foreground) 3%, #fff);
}

.case-obs-ai-extract--active .case-obs-ai-extract-card--empty {
  opacity: 0.88;
}

.case-obs-ai-extract-card-title {
  margin: 0;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--foreground) 55%, var(--muted));
}

.case-obs-ai-extract-card--filled .case-obs-ai-extract-card-title {
  color: var(--muted);
}

.case-obs-ai-extract-placeholder {
  margin: 0;
  font-size: 11px;
  line-height: 1.4;
  font-weight: 600;
  color: color-mix(in srgb, var(--foreground) 42%, var(--muted));
}

.case-obs-ai-extract-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 5px;
}

.case-obs-ai-extract-item {
  margin: 0;
  font-size: 12px;
  line-height: 1.45;
  font-weight: 650;
  color: var(--foreground);
}
`;
