export const createEngagementWizardCss = `
.create-engagement-root {
  width: 100%;
  max-width: 100%;
  min-height: calc(100dvh - 52px);
  background: #fff;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  overflow-x: hidden;
}

.create-engagement-header {
  flex-shrink: 0;
  padding: 8px 12px 6px;
  border-bottom: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
  background: #fff;
}

.create-engagement-header-nav {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
  min-width: 0;
}

.create-engagement-back {
  font-size: 12px;
  font-weight: 800;
  color: var(--brand-700);
  text-decoration: none;
  display: inline-block;
  margin-bottom: 0;
}

.create-engagement-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-width: 0;
}

.create-engagement-title {
  margin: 0;
  font-size: 15px;
  font-weight: 900;
  letter-spacing: -0.02em;
  line-height: 1.2;
  min-width: 0;
}

.create-engagement-header-meta {
  flex-shrink: 0;
  font-size: 10px;
  font-weight: 800;
  color: var(--muted);
  white-space: nowrap;
}

.create-engagement-sub {
  display: none;
}

.create-engagement-progress {
  margin-top: 6px;
  height: 3px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--foreground) 8%, var(--border));
  overflow: hidden;
}

.create-engagement-progress > span {
  display: block;
  height: 100%;
  background: var(--brand-600);
  border-radius: 999px;
  transition: width 0.2s ease;
}

.create-engagement-stepper {
  display: grid;
  gap: 0;
  border-bottom: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
  background: color-mix(in srgb, var(--foreground) 2%, #fff);
}

.create-engagement-stepper-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  width: 100%;
  padding: 8px 10px;
  border: none;
  border-bottom: 1px solid color-mix(in srgb, var(--foreground) 5%, var(--border));
  background: transparent;
  text-align: left;
  cursor: pointer;
  font-family: inherit;
}

.create-engagement-stepper-item:last-child {
  border-bottom: none;
}

.create-engagement-stepper-item--active {
  background: color-mix(in srgb, var(--brand-600) 6%, #fff);
}

.create-engagement-stepper-item--done .create-engagement-stepper-index {
  background: color-mix(in srgb, var(--brand-600) 14%, var(--surface));
  color: var(--brand-700);
}

.create-engagement-stepper-index {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 900;
  background: color-mix(in srgb, var(--foreground) 6%, var(--surface));
  color: var(--muted);
}

.create-engagement-stepper-item--active .create-engagement-stepper-index {
  background: var(--brand-600);
  color: #fff;
}

.create-engagement-stepper-text {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.create-engagement-stepper-label {
  font-size: 12px;
  font-weight: 800;
  color: var(--foreground);
  line-height: 1.3;
}

.create-engagement-stepper-meta {
  font-size: 10px;
  font-weight: 700;
  color: var(--muted);
}

.create-engagement-body {
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
  padding: 8px 12px 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  overflow-x: hidden;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.create-engagement-template-collapsible {
  border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
  border-radius: 8px;
  background: #fff;
  overflow: hidden;
  min-width: 0;
}

.create-engagement-template-collapsible-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 12px;
  cursor: pointer;
  list-style: none;
  user-select: none;
  touch-action: manipulation;
}

.create-engagement-template-collapsible-summary::-webkit-details-marker {
  display: none;
}

.create-engagement-template-collapsible-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 800;
  color: var(--foreground);
  line-height: 1.25;
}

.create-engagement-template-collapsible-optional {
  font-size: 10px;
  font-weight: 700;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.create-engagement-template-collapsible-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 600;
  color: var(--muted);
  line-height: 1.3;
}

.create-engagement-template-collapsible-badge {
  color: var(--brand-700);
  font-weight: 800;
}

.create-engagement-template-collapsible-chevron {
  font-size: 12px;
  line-height: 1;
  color: var(--muted);
}

.create-engagement-template-collapsible[open] .create-engagement-template-collapsible-summary {
  border-bottom: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
  background: color-mix(in srgb, var(--foreground) 2%, #fff);
}

.create-engagement-template-panel {
  display: flex;
  flex-direction: column;
  gap: 0;
  min-width: 0;
  min-height: 0;
}

.create-engagement-template-panel-hint {
  margin: 0;
  padding: 8px 12px 0;
  font-size: 11px;
  color: var(--muted);
  line-height: 1.4;
}

.create-engagement-template-panel .pcp-template-embedded {
  border: none;
}

.create-engagement-template-panel .pcp-template-embedded .pcp-template-body {
  max-height: min(44dvh, 400px);
  padding: 8px 12px 10px;
}

.create-engagement-plan-fields {
  display: grid;
  gap: 8px;
  min-width: 0;
  padding-top: 10px;
}

.create-engagement-plan-fields-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
}

.create-engagement-plan-fields-title {
  margin: 0;
  font-size: 13px;
  font-weight: 800;
  letter-spacing: -0.01em;
}

.create-engagement-plan-fields-meta {
  font-size: 10px;
  font-weight: 700;
  color: var(--muted);
  white-space: nowrap;
}

.create-engagement-plan-fields .create-engagement-field {
  gap: 3px;
}

.create-engagement-field {
  display: grid;
  gap: 4px;
}

.create-engagement-field label {
  font-size: 12px;
  font-weight: 800;
}

.create-engagement-field .hint {
  font-size: 11px;
  color: var(--muted);
  line-height: 1.35;
}

.create-engagement-field input,
.create-engagement-field select,
.create-engagement-field textarea {
  width: 100%;
  box-sizing: border-box;
  padding: 7px 9px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));
  font-size: 14px;
  font-family: inherit;
  background: #fff;
}

.create-engagement-field textarea {
  resize: vertical;
  min-height: 72px;
}

.create-engagement-grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.create-engagement-org-picker {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: stretch;
}
.create-engagement-org-picker select {
  flex: 1 1 180px;
  min-width: 0;
}
.create-engagement-org-new-btn {
  flex: 0 0 auto;
}

.create-engagement-org-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 6px;
}

.create-engagement-org-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  border: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));
  background: color-mix(in srgb, var(--foreground) 4%, var(--surface));
}

.create-engagement-org-chip button {
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
  color: var(--muted);
  padding: 0;
}

.create-engagement-discovery-block {
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
}

.create-engagement-discovery-heading {
  margin: 0 0 8px;
  font-size: 13px;
  font-weight: 900;
  letter-spacing: -0.02em;
}

.create-engagement-alert {
  padding: 10px 12px;
  border-radius: 10px;
  font-size: 12px;
  line-height: 1.45;
  border: 1px solid color-mix(in srgb, #f59e0b 28%, var(--border));
  background: color-mix(in srgb, #f59e0b 8%, var(--surface));
}

.create-engagement-alert--info {
  border-color: color-mix(in srgb, var(--brand-600) 22%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 6%, var(--surface));
}

.provider-discovery-accordion { display: grid; gap: 6px; }
.provider-discovery-intro { margin: 0 0 4px; font-size: 11px; color: var(--muted); line-height: 1.4; }
.provider-discovery-list { display: grid; gap: 4px; }
.provider-discovery-item { border: 1px solid color-mix(in srgb, var(--foreground) 7%, var(--border)); border-radius: 8px; overflow: hidden; background: #fff; }
.provider-discovery-item--open { border-color: color-mix(in srgb, var(--brand-600) 20%, var(--border)); }
.provider-discovery-item--answered:not(.provider-discovery-item--open) .provider-discovery-trigger { background: color-mix(in srgb, var(--brand-600) 3%, var(--surface)); }
.provider-discovery-trigger { width: 100%; display: flex; align-items: flex-start; gap: 8px; padding: 7px 8px; border: none; background: transparent; cursor: pointer; text-align: left; font-family: inherit; }
.provider-discovery-trigger-num { flex-shrink: 0; width: 20px; height: 20px; border-radius: 6px; display: inline-flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 900; background: color-mix(in srgb, var(--foreground) 6%, var(--surface)); color: var(--muted); }
.provider-discovery-item--open .provider-discovery-trigger-num { background: color-mix(in srgb, var(--brand-600) 14%, var(--surface)); color: var(--brand-700); }
.provider-discovery-trigger-main { display: grid; gap: 2px; min-width: 0; flex: 1; }
.provider-discovery-trigger-label { font-size: 12px; font-weight: 800; line-height: 1.25; }
.provider-discovery-trigger-preview { font-size: 10px; color: var(--muted); line-height: 1.35; }
.provider-discovery-status { flex-shrink: 0; font-size: 9px; font-weight: 800; text-transform: uppercase; color: var(--muted); }
.provider-discovery-status--done { color: var(--brand-700); }
.provider-discovery-panel { padding: 0 8px 8px 36px; display: grid; gap: 6px; }
.provider-discovery-question { margin: 0; font-size: 11px; color: var(--muted); line-height: 1.4; }
.provider-discovery-panel textarea { width: 100%; box-sizing: border-box; padding: 8px 10px; border-radius: 8px; border: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border)); font-size: 13px; font-family: inherit; resize: vertical; min-height: 64px; }

.create-engagement-segments {
  flex-shrink: 0;
  display: flex;
  gap: 0;
  padding: 0 12px;
  border-bottom: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
  background: color-mix(in srgb, var(--foreground) 2%, #fff);
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}

.create-engagement-segments::-webkit-scrollbar {
  display: none;
}

.create-engagement-segment {
  flex: 1 0 auto;
  min-width: 0;
  padding: 7px 10px;
  border: none;
  border-bottom: 2px solid transparent;
  background: transparent;
  font-family: inherit;
  font-size: 11px;
  font-weight: 800;
  color: var(--muted);
  cursor: pointer;
  white-space: nowrap;
  margin-bottom: -1px;
}

.create-engagement-segment--active {
  color: var(--brand-700);
  border-bottom-color: var(--brand-600);
}

.create-engagement-segment:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.create-engagement-footer {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px 8px;
  padding: 6px 12px calc(6px + env(safe-area-inset-bottom, 0px));
  border-top: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
  background: #fff;
  box-sizing: border-box;
}

.create-engagement-footer button,
.create-engagement-footer a {
  flex: 0 0 auto;
  min-height: 32px;
  max-height: 32px;
  padding: 0 12px;
  border-radius: 7px;
  font-size: 12px;
  font-weight: 800;
  font-family: inherit;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  white-space: nowrap;
  border: 1px solid color-mix(in srgb, var(--brand-600) 18%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 6%, var(--surface));
  color: var(--brand-700);
  cursor: pointer;
}

.create-engagement-footer .primary {
  background: var(--brand-600);
  color: #fff;
  border-color: color-mix(in srgb, var(--brand-600) 80%, black);
  padding: 0 14px;
  min-width: 4.5rem;
  max-width: 10rem;
  margin-left: auto;
}

.create-engagement-footer .ghost {
  padding: 0 8px;
  min-width: auto;
  background: transparent;
  border-color: transparent;
  color: var(--muted);
  font-weight: 700;
}

.create-engagement-footer .secondary {
  background: #fff;
  color: var(--brand-700);
  border-color: color-mix(in srgb, var(--brand-600) 24%, var(--border));
  font-weight: 800;
}

.create-engagement-footer--type-selected,
.create-engagement-footer--quick-add,
.create-engagement-footer--details-save {
  flex-direction: column;
  align-items: stretch;
  gap: 6px;
  padding-top: 8px;
  padding-bottom: calc(8px + env(safe-area-inset-bottom, 0px));
}

.create-engagement-footer-selected {
  margin: 0;
  font-size: 11px;
  line-height: 1.3;
  color: var(--foreground);
}

.create-engagement-footer-selected strong {
  font-weight: 800;
}

.create-engagement-footer-helper {
  margin: 0;
  flex: 1 1 100%;
  width: 100%;
  font-size: 10px;
  line-height: 1.35;
  color: var(--muted);
}

.create-engagement-footer-helper--inline {
  flex: 1 1 auto;
  width: auto;
  min-width: 0;
}

.create-engagement-footer--type-selected .create-engagement-footer-actions,
.create-engagement-footer--quick-add .create-engagement-footer-actions,
.create-engagement-footer--details-save .create-engagement-footer-actions {
  width: 100%;
}

.create-engagement-footer--type-selected .create-engagement-footer-actions .secondary,
.create-engagement-footer--quick-add .create-engagement-footer-actions .secondary,
.create-engagement-footer--details-save .create-engagement-footer-actions .secondary {
  flex: 1 1 auto;
}

.create-engagement-footer--type-selected .create-engagement-footer-actions .primary,
.create-engagement-footer--quick-add .create-engagement-footer-actions .primary,
.create-engagement-footer--details-save .create-engagement-footer-actions .primary {
  flex: 1 1 auto;
  max-width: none;
  margin-left: 0;
}

.create-engagement-footer .linkish,
.create-engagement-footer .create-engagement-footer-draft {
  padding: 0 6px;
  min-width: auto;
  background: transparent;
  border: none;
  color: var(--brand-700);
  font-size: 11px;
  font-weight: 700;
}

.create-engagement-footer-tools {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 2px 10px;
  width: 100%;
  flex: 1 1 100%;
}

.create-engagement-footer-tools .linkish {
  min-height: 28px;
  max-height: 28px;
  padding: 0 2px;
  font-size: 10px;
  font-weight: 700;
}

.create-engagement-footer-actions {
  display: flex;
  align-items: center;
  gap: 6px 8px;
  width: 100%;
  flex: 1 1 100%;
}

.create-engagement-footer-actions .primary {
  flex: 1 1 auto;
  max-width: none;
  margin-left: auto;
}

.create-engagement-footer--prep {
  flex-direction: column;
  align-items: stretch;
  gap: 4px;
  padding-top: 4px;
  padding-bottom: calc(4px + env(safe-area-inset-bottom, 0px));
}

.create-engagement-footer--review .primary {
  max-width: 11rem;
}

.create-engagement-footer button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

@media (max-width: 639px) {
  .create-engagement-footer:not(.create-engagement-footer--prep) {
    gap: 4px 8px;
  }

  .create-engagement-footer:not(.create-engagement-footer--prep) .primary {
    flex: 1 1 100%;
    max-width: none;
    margin-left: 0;
    order: 2;
    min-height: 36px;
    max-height: 36px;
  }

  .create-engagement-footer:not(.create-engagement-footer--prep) .ghost,
  .create-engagement-footer:not(.create-engagement-footer--prep) .linkish {
    order: 0;
  }

  .create-engagement-footer--review {
    gap: 4px 8px;
  }

  .create-engagement-footer--review .primary {
    flex: 1 1 100%;
    max-width: none;
    margin-left: 0;
    order: 2;
    min-height: 36px;
    max-height: 36px;
  }

  .create-engagement-footer--review .ghost,
  .create-engagement-footer--review .create-engagement-footer-draft {
    order: 0;
  }

  .create-engagement-footer--prep .create-engagement-footer-actions .primary {
    flex: 1 1 100%;
    min-height: 36px;
    max-height: 36px;
    margin-left: 0;
  }
}

@media (min-width: 640px) {
  .create-engagement-footer:not(.create-engagement-footer--prep) .primary {
    margin-left: auto;
  }

  .create-engagement-footer--prep {
    flex-direction: row;
    flex-wrap: wrap;
    align-items: center;
    justify-content: flex-end;
  }

  .create-engagement-footer--prep .create-engagement-footer-tools {
    flex: 1 1 auto;
    width: auto;
    min-width: 0;
    order: 0;
  }

  .create-engagement-footer--prep .create-engagement-footer-actions {
    flex: 0 0 auto;
    width: auto;
    order: 1;
  }

  .create-engagement-footer--prep .create-engagement-footer-actions .primary {
    flex: 0 0 auto;
    max-width: 9rem;
    margin-left: 0;
  }

  .create-engagement-footer--review .primary {
    margin-left: auto;
  }
}

.create-engagement-completion-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 800;
  border: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));
  background: color-mix(in srgb, var(--foreground) 4%, var(--surface));
}

.create-engagement-completion-chip--in_progress {
  border-color: color-mix(in srgb, var(--brand-600) 22%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 8%, var(--surface));
  color: var(--brand-700);
}

.create-engagement-completion-chip--complete {
  border-color: color-mix(in srgb, #16a34a 28%, var(--border));
  background: color-mix(in srgb, #16a34a 10%, var(--surface));
  color: #166534;
}

.create-engagement-completion-chip--outcome_recorded {
  border-color: color-mix(in srgb, #6366f1 28%, var(--border));
  background: color-mix(in srgb, #6366f1 10%, var(--surface));
  color: #4338ca;
}

.create-engagement-review-card {
  border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
  border-radius: 8px;
  padding: 10px 12px;
  background: color-mix(in srgb, var(--foreground) 2%, var(--surface));
  display: grid;
  gap: 8px;
}

.create-engagement-review-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: 13px;
  line-height: 1.4;
}

.create-engagement-review-row span:first-child {
  color: var(--muted);
  font-weight: 700;
  flex-shrink: 0;
}

.create-engagement-review-row span:last-child {
  text-align: right;
  font-weight: 600;
}

.create-engagement-step-fields {
  display: grid;
  gap: 8px;
  min-width: 0;
}

@media (min-width: 769px) {
  .create-engagement-header,
  .create-engagement-body,
  .create-engagement-footer {
    padding-left: clamp(20px, 2.5vw, 40px);
    padding-right: clamp(20px, 2.5vw, 40px);
  }

  .create-engagement-stepper {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .create-engagement-stepper-item {
    border-bottom: none;
    border-right: 1px solid color-mix(in srgb, var(--foreground) 5%, var(--border));
  }

  .create-engagement-stepper-item:last-child {
    border-right: none;
  }

  .create-engagement-step-fields {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px 14px;
  }

  .create-engagement-field--full {
    grid-column: 1 / -1;
  }

  .create-engagement-plan-fields .case-pre-call-plan-fields {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px 14px;
    align-items: start;
  }

  .create-engagement-plan-fields .case-pre-call-plan-field--full {
    grid-column: 1 / -1;
  }

  .create-engagement-review-card {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 6px 14px;
  }

  .create-engagement-review-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
  }

  .create-engagement-review-row span:last-child {
    text-align: left;
  }

  .create-engagement-template-panel .pcp-template-embedded .pcp-template-body {
    max-height: min(40dvh, 360px);
  }

  .create-engagement-footer {
    width: 100%;
    box-sizing: border-box;
  }
}

@media (min-width: 1200px) {
  .create-engagement-header,
  .create-engagement-body,
  .create-engagement-footer {
    padding-left: 32px;
    padding-right: 32px;
  }

  .create-engagement-step-fields,
  .create-engagement-plan-fields .case-pre-call-plan-fields,
  .create-engagement-review-card {
    gap: 10px 20px;
  }
}

@media (max-width: 768px) {
  .create-engagement-stepper {
    display: flex;
    flex-wrap: nowrap;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
  }
  .create-engagement-stepper::-webkit-scrollbar {
    display: none;
  }
  .create-engagement-stepper-item {
    flex: 1 0 auto;
    min-width: 96px;
    max-width: 150px;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 7px 8px;
    border-bottom: none;
    border-right: 1px solid color-mix(in srgb, var(--foreground) 5%, var(--border));
    text-align: center;
  }
  .create-engagement-stepper-item:last-child {
    border-right: none;
  }
  .create-engagement-stepper-text {
    gap: 0;
    width: 100%;
  }
  .create-engagement-stepper-label {
    font-size: 10px;
    line-height: 1.2;
  }
  .create-engagement-stepper-meta {
    display: none;
  }
  .create-engagement-template-panel .pcp-template-embedded .pcp-template-body {
    max-height: min(50dvh, 440px);
  }
}

@media (max-width: 520px) {
  .create-engagement-grid-2 {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .create-engagement-step-fields,
  .create-engagement-plan-fields .case-pre-call-plan-fields,
  .eng-workflow-fields {
    grid-template-columns: 1fr !important;
  }
  .create-engagement-review-card {
    grid-template-columns: 1fr !important;
  }
}

.create-engagement-type-groups {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* —— Step 1: compact mission selector —— */
.create-engagement-mission-picker {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-width: 0;
}

.create-engagement-recommended-mission {
  display: grid;
  gap: 8px;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid color-mix(in srgb, var(--brand-600) 22%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 5%, var(--surface, #fff));
}

.create-engagement-recommended-mission__title {
  margin: 0;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--brand-700);
}

.create-engagement-recommended-mission__card {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px 14px;
  width: 100%;
  margin: 0;
  padding: 10px 12px;
  border: 1px solid color-mix(in srgb, var(--brand-600) 18%, var(--border));
  border-radius: 10px;
  background: #fff;
  text-align: left;
  font-family: inherit;
  cursor: pointer;
}

.create-engagement-recommended-mission__card--selected {
  border-color: color-mix(in srgb, var(--brand-600) 45%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 6%, #fff);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--brand-600) 18%, transparent);
}

.create-engagement-recommended-mission__main {
  display: grid;
  gap: 4px;
  min-width: 0;
  flex: 1 1 220px;
}

.create-engagement-recommended-mission__name {
  margin: 0;
  font-size: 16px;
  font-weight: 900;
  letter-spacing: -0.02em;
  color: var(--foreground);
}

.create-engagement-recommended-mission__reason {
  margin: 0;
  font-size: 13px;
  font-weight: 650;
  line-height: 1.45;
  color: color-mix(in srgb, var(--foreground) 70%, var(--muted));
}

.create-engagement-recommended-mission__check {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 999px;
  background: var(--brand-600);
  color: #fff;
  font-size: 12px;
  font-weight: 900;
}

.create-engagement-mission-browse {
  display: grid;
  gap: 10px;
}

.create-engagement-mission-category-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.create-engagement-mission-category-tab {
  min-height: 44px;
  padding: 6px 14px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));
  background: var(--surface, #fff);
  color: var(--muted);
  font-size: 12px;
  font-weight: 800;
  font-family: inherit;
  cursor: pointer;
}

.create-engagement-mission-category-tab--active {
  border-color: color-mix(in srgb, var(--brand-600) 28%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 8%, var(--surface, #fff));
  color: var(--brand-700);
}

.create-engagement-mission-picker__intro {
  display: grid;
  gap: 2px;
}

.create-engagement-mission-picker__title {
  margin: 0;
  font-size: 14px;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--foreground);
}

.create-engagement-mission-picker__lead {
  margin: 0;
  font-size: 11px;
  line-height: 1.35;
  color: var(--muted);
  max-width: 40rem;
}

.create-engagement-mission-picker__groups {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.create-engagement-mission-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.create-engagement-mission-group__title {
  margin: 0;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--foreground) 68%, var(--muted));
}

.create-engagement-mission-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 4px;
}

.create-engagement-mission-card {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 8px;
  align-items: center;
  width: 100%;
  min-height: 44px;
  margin: 0;
  padding: 6px 8px;
  border: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));
  border-radius: 8px;
  background: #fff;
  text-align: left;
  font-family: inherit;
  cursor: pointer;
  transition:
    border-color 120ms ease,
    box-shadow 120ms ease,
    background 120ms ease;
}

.create-engagement-mission-card:hover {
  border-color: color-mix(in srgb, var(--brand-600) 28%, var(--border));
  box-shadow: 0 1px 6px color-mix(in srgb, var(--foreground) 5%, transparent);
}

.create-engagement-mission-card--selected {
  border-color: var(--brand-600);
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--brand-600) 10%, #fff) 0%,
    color-mix(in srgb, var(--brand-600) 4%, #fff) 100%
  );
  box-shadow:
    0 0 0 1px color-mix(in srgb, var(--brand-600) 35%, transparent),
    0 2px 8px color-mix(in srgb, var(--brand-600) 10%, transparent);
}

.create-engagement-mission-card__icon {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 26px;
  height: 26px;
  border-radius: 7px;
  font-size: 12px;
  font-weight: 700;
  line-height: 1;
  color: var(--brand-800);
  background: color-mix(in srgb, var(--brand-600) 12%, #fff);
  border: 1px solid color-mix(in srgb, var(--brand-600) 18%, var(--border));
}

.create-engagement-mission-card--selected .create-engagement-mission-card__icon {
  background: var(--brand-600);
  color: #fff;
  border-color: transparent;
}

.create-engagement-mission-card__content {
  display: grid;
  gap: 1px;
  min-width: 0;
}

.create-engagement-mission-card__name {
  font-size: 12px;
  font-weight: 800;
  line-height: 1.2;
  color: var(--foreground);
}

.create-engagement-mission-card__desc {
  font-size: 10px;
  line-height: 1.3;
  color: var(--muted);
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.create-engagement-mission-card__workflow {
  font-size: 9px;
  font-weight: 600;
  line-height: 1.25;
  color: color-mix(in srgb, var(--foreground) 55%, var(--muted));
}

.create-engagement-mission-card--selected .create-engagement-mission-card__workflow {
  color: color-mix(in srgb, var(--brand-700) 75%, var(--muted));
}

.create-engagement-mission-card__check {
  flex-shrink: 0;
  align-self: center;
  width: 18px;
  height: 18px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  font-size: 10px;
  font-weight: 800;
  color: #fff;
  background: var(--brand-600);
}

@media (min-width: 640px) {
  .create-engagement-mission-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 5px;
  }

  .create-engagement-mission-card {
    padding: 7px 9px;
    align-items: start;
  }

  .create-engagement-mission-card__check {
    align-self: start;
    margin-top: 2px;
  }
}

@media (min-width: 1024px) {
  .create-engagement-mission-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

/* Mission preview panel — compact workflow explainer */
.create-engagement-mission-preview {
  margin-top: 2px;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px dashed color-mix(in srgb, var(--foreground) 12%, var(--border));
  background: color-mix(in srgb, var(--foreground) 2%, #fff);
}

.create-engagement-mission-preview--active {
  border-style: solid;
  border-color: color-mix(in srgb, var(--brand-600) 20%, var(--border));
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--brand-600) 5%, #fff) 0%,
    color-mix(in srgb, var(--foreground) 1%, #fff) 100%
  );
}

.create-engagement-mission-preview__empty {
  margin: 0;
  font-size: 10px;
  line-height: 1.35;
  color: var(--muted);
}

.create-engagement-mission-preview__body {
  display: grid;
  gap: 8px;
  min-width: 0;
}

.create-engagement-mission-preview__head {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 8px;
  align-items: start;
}

.create-engagement-mission-preview__icon {
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
  color: var(--brand-800);
  background: color-mix(in srgb, var(--brand-600) 12%, #fff);
  border: 1px solid color-mix(in srgb, var(--brand-600) 18%, var(--border));
}

.create-engagement-mission-preview--active .create-engagement-mission-preview__icon {
  background: var(--brand-600);
  color: #fff;
  border-color: transparent;
}

.create-engagement-mission-preview__intro {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.create-engagement-mission-preview__title {
  margin: 0;
  font-size: 12px;
  font-weight: 800;
  line-height: 1.2;
  color: var(--foreground);
}

.create-engagement-mission-preview__purpose {
  margin: 0;
  font-size: 10px;
  line-height: 1.35;
  color: var(--muted);
}

.create-engagement-mission-preview__paths {
  display: grid;
  gap: 6px;
}

@media (min-width: 640px) {
  .create-engagement-mission-preview__paths {
    grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
    gap: 8px;
  }
}

.create-engagement-mission-preview__path {
  display: grid;
  gap: 2px;
  min-width: 0;
  padding: 6px 7px;
  border-radius: 6px;
  background: color-mix(in srgb, var(--foreground) 3%, #fff);
  border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
}

.create-engagement-mission-preview__path--plan {
  border-color: color-mix(in srgb, var(--brand-600) 16%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 4%, #fff);
}

.create-engagement-mission-preview__path-label {
  margin: 0;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--foreground) 62%, var(--muted));
}

.create-engagement-mission-preview__path--plan .create-engagement-mission-preview__path-label {
  color: var(--brand-700);
}

.create-engagement-mission-preview__path-note {
  margin: 0;
  font-size: 9px;
  line-height: 1.3;
  color: var(--muted);
}

.create-engagement-mission-preview__steps {
  margin: 0;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 2px 0;
  font-size: 9px;
  line-height: 1.35;
  font-weight: 600;
  color: color-mix(in srgb, var(--foreground) 78%, var(--muted));
}

.create-engagement-mission-preview__step {
  display: inline;
  white-space: nowrap;
}

.create-engagement-mission-preview__step-arrow {
  margin: 0 3px;
  color: color-mix(in srgb, var(--brand-600) 70%, var(--muted));
  font-weight: 700;
}

.create-engagement-type-group-title {
  margin: 0 0 4px;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--muted);
}

.create-engagement-type-group-desc {
  display: none;
}

.create-engagement-type-selected-desc {
  margin: 6px 0 0;
  font-size: 11px;
  line-height: 1.35;
  color: var(--muted);
  max-width: 42rem;
}

.create-engagement-type-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.create-engagement-type-chip {
  border: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));
  border-radius: 999px;
  padding: 6px 10px;
  min-height: 30px;
  font-size: 12px;
  font-weight: 700;
  font-family: inherit;
  background: #fff;
  color: var(--foreground);
  cursor: pointer;
  line-height: 1.2;
  max-width: 100%;
}

.create-engagement-type-chip--selected {
  border-color: var(--brand-600);
  background: color-mix(in srgb, var(--brand-600) 10%, #fff);
  color: var(--brand-800);
}

.create-engagement-type-card,
.create-engagement-type-card-radio {
  display: none;
}

.create-engagement-workflow-mode {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 4px;
  padding: 8px 10px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--foreground) 2%, #fff);
  border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
}

.create-engagement-workflow-mode-options {
  display: flex;
  gap: 0;
  padding: 2px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--foreground) 5%, var(--border));
}

.create-engagement-workflow-mode-btn {
  flex: 1;
  padding: 7px 8px;
  border-radius: 6px;
  border: none;
  background: transparent;
  font-size: 11px;
  font-weight: 800;
  cursor: pointer;
  font-family: inherit;
  color: var(--muted);
}

.create-engagement-workflow-mode-btn--active {
  border-color: var(--brand-600);
  background: color-mix(in srgb, var(--brand-600) 8%, #fff);
  color: var(--brand-800);
}

.create-engagement-context-line {
  margin: 0;
  font-size: 11px;
  color: var(--muted);
  line-height: 1.35;
}

.create-engagement-context-line strong {
  color: var(--foreground);
  font-weight: 800;
}

.create-engagement-step-lead {
  margin: 0 0 8px;
  font-size: 12px;
  color: var(--muted);
  line-height: 1.4;
}

.create-engagement-preparation-intro {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 4px;
}

.create-engagement-preparation-title {
  margin: 0;
  font-size: 14px;
  font-weight: 800;
  letter-spacing: -0.01em;
}

.create-engagement-preparation-desc {
  margin: 4px 0 0;
  font-size: 11px;
  color: var(--muted);
  line-height: 1.35;
}

.create-engagement-preparation-progress {
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 700;
  color: var(--brand-700);
}

.create-engagement-preparation-fields {
  min-width: 0;
}

.create-engagement-playbooks-collapsible {
  border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
  border-radius: 8px;
  overflow: hidden;
  margin-top: 8px;
}

.create-engagement-playbooks-optional {
  font-size: 10px;
  color: var(--muted);
  font-weight: 700;
  text-transform: lowercase;
}

.create-engagement-playbooks-body {
  padding: 0 10px 10px;
  border-top: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
  min-width: 0;
}

.create-engagement-preparation--strategic .create-engagement-playbooks-body .pcp-template-embedded .pcp-template-body {
  max-height: min(42dvh, 400px);
  padding: 6px 0 10px;
}

@media (min-width: 769px) {
  .create-engagement-preparation--strategic .create-engagement-playbooks-body .pcp-template-embedded .pcp-template-body {
    max-height: min(36dvh, 360px);
  }
}

.create-engagement-fields-collapsible {
  border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
  border-radius: 8px;
  overflow: hidden;
  margin-top: 6px;
}

.create-engagement-fields-collapsible-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
  list-style: none;
  user-select: none;
}

.create-engagement-fields-collapsible-summary::-webkit-details-marker {
  display: none;
}

.create-engagement-fields-collapsible-body {
  padding: 0 10px 10px;
  border-top: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
}

.create-engagement-preparation--office-visit {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.create-engagement-preparation--lightweight,
.create-engagement-preparation--strategic {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.create-engagement-schedule-toggle {
  display: block;
  width: 100%;
  text-align: left;
  background: transparent;
  border: 1px dashed var(--line, rgba(120, 130, 150, 0.4));
  border-radius: 10px;
  padding: 10px 12px;
  font-size: 12px;
  font-weight: 700;
  color: var(--muted);
  cursor: pointer;
}

.create-engagement-schedule-toggle:hover {
  color: var(--fg, inherit);
  border-color: var(--brand, currentColor);
}

.create-engagement-review-card {
  gap: 6px;
  padding: 8px 10px;
}

.create-engagement-review-row {
  font-size: 12px;
  gap: 8px;
}

.create-engagement-stepper {
  display: none;
}

.eng-workflow-fields {
  display: grid;
  gap: 8px;
  min-width: 0;
}

.eng-workflow-fields--compact {
  gap: 6px;
}

.eng-workflow-field {
  display: grid;
  gap: 3px;
  min-width: 0;
}

.eng-workflow-field-label {
  font-size: 11px;
  font-weight: 800;
  color: var(--foreground);
}

.eng-workflow-field-helper {
  font-size: 10px;
  color: var(--muted);
  line-height: 1.3;
}

.eng-workflow-field textarea {
  width: 100%;
  box-sizing: border-box;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));
  font-size: 16px;
  font-family: inherit;
  background: #fff;
  resize: vertical;
  min-height: 40px;
  line-height: 1.35;
}

.eng-workflow-fields--compact .eng-workflow-field textarea {
  font-size: 16px;
  min-height: 36px;
  padding: 7px 9px;
}

.create-engagement-field input,
.create-engagement-field select {
  font-size: 16px;
}

.create-engagement-field textarea {
  min-height: 56px;
}

@media (max-width: 420px) {
  .create-engagement-segment {
    font-size: 10px;
    padding: 6px 8px;
  }
  .create-engagement-body {
    padding-left: 10px;
    padding-right: 10px;
  }
}

@media (min-width: 769px) {
  .create-engagement-root {
    width: 100%;
    max-width: none;
    min-height: 100dvh;
    margin: 0;
    border: none;
  }

  .create-engagement-header,
  .create-engagement-body,
  .create-engagement-footer {
    padding-left: clamp(16px, 3vw, 40px);
    padding-right: clamp(16px, 3vw, 40px);
  }

  .create-engagement-body--preparation {
    display: flex;
    flex-direction: column;
    min-height: 0;
    overflow-y: auto;
  }

  .create-engagement-preparation--strategic {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .create-engagement-preparation--strategic .create-engagement-preparation-fields {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
  }

  .create-engagement-preparation--strategic .create-engagement-playbooks-collapsible {
    flex-shrink: 0;
    max-height: 42vh;
    overflow: auto;
  }

  .create-engagement-sub {
    display: block;
    margin: 2px 0 0;
    font-size: 11px;
    color: var(--muted);
  }

  .create-engagement-type-group-desc {
    display: block;
    margin: 0 0 6px;
    font-size: 11px;
  }

}

@media (min-width: 1024px) {
  .create-engagement-preparation--strategic .create-engagement-playbooks-collapsible {
    max-height: 36vh;
  }
}

.create-engagement-segments--locked {
  pointer-events: none;
  opacity: 0.55;
}

.ew-save-success {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}

.ew-save-success-hero {
  padding: 12px;
  border-radius: 10px;
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--brand-600) 10%, #fff) 0%,
    color-mix(in srgb, var(--brand-600) 3%, var(--surface)) 100%
  );
  border: 1px solid color-mix(in srgb, var(--brand-600) 20%, var(--border));
}

.ew-save-success-kicker {
  margin: 0 0 2px;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--brand-700);
}

.ew-save-success-title {
  margin: 0;
  font-size: 18px;
  font-weight: 800;
  line-height: 1.2;
}

.ew-save-success-lead {
  margin: 6px 0 0;
  font-size: 13px;
  line-height: 1.35;
}

.ew-save-success-hint {
  margin: 8px 0 0;
  font-size: 11px;
  line-height: 1.4;
  color: var(--muted);
}

.ew-save-success-actions {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.ew-save-success-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 36px;
  padding: 0 14px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 800;
  text-decoration: none;
  font-family: inherit;
  box-sizing: border-box;
}

.ew-save-success-btn--primary {
  background: var(--brand-600);
  color: #fff;
  border: 1px solid color-mix(in srgb, var(--brand-600) 80%, black);
}

.ew-save-success-btn--secondary {
  background: #fff;
  color: var(--brand-700);
  border: 1px solid color-mix(in srgb, var(--brand-600) 22%, var(--border));
}

@media (min-width: 480px) {
  .ew-save-success-actions {
    display: grid;
    grid-template-columns: 1fr;
    gap: 6px;
  }

  .ew-save-success-btn--primary {
    order: -1;
  }
}

/* —— Mission launch (Plan Intro Call, Plan Debrief, etc.) — premium field-setup shell —— */
.create-engagement-root--mission-launched {
  --mission-accent: var(--brand-600);
  --mission-accent-deep: var(--brand-700);
  --mission-accent-soft: color-mix(in srgb, var(--brand-600) 12%, #fff);
  --mission-accent-border: color-mix(in srgb, var(--brand-600) 28%, var(--border));
  background:
    radial-gradient(1200px 520px at 100% -10%, color-mix(in srgb, var(--mission-accent) 14%, transparent), transparent 58%),
    radial-gradient(900px 420px at -5% 0%, color-mix(in srgb, var(--mission-accent) 8%, transparent), transparent 55%),
    linear-gradient(180deg, color-mix(in srgb, var(--mission-accent) 4%, #f8fafc) 0%, #f1f5f9 42%, #eef2f7 100%);
}

.create-engagement-root--intro-call {
  --mission-accent: #0ea5e9;
  --mission-accent-deep: #0284c7;
  --mission-accent-soft: color-mix(in srgb, #0ea5e9 12%, #fff);
  --mission-accent-border: color-mix(in srgb, #0ea5e9 28%, var(--border));
}

.create-engagement-root--provider-debrief {
  --mission-accent: #7c3aed;
  --mission-accent-deep: #6d28d9;
  --mission-accent-soft: color-mix(in srgb, #7c3aed 12%, #fff);
  --mission-accent-border: color-mix(in srgb, #7c3aed 28%, var(--border));
}

.create-engagement-root--product-demo {
  --mission-accent: #d97706;
  --mission-accent-deep: #b45309;
  --mission-accent-soft: color-mix(in srgb, #d97706 12%, #fff);
  --mission-accent-border: color-mix(in srgb, #d97706 28%, var(--border));
}

.create-engagement-root--follow-up {
  --mission-accent: #059669;
  --mission-accent-deep: #047857;
  --mission-accent-soft: color-mix(in srgb, #059669 12%, #fff);
  --mission-accent-border: color-mix(in srgb, #059669 28%, var(--border));
}

.create-engagement-root--in-service-training {
  --mission-accent: #6366f1;
  --mission-accent-deep: #4f46e5;
  --mission-accent-soft: color-mix(in srgb, #6366f1 12%, #fff);
  --mission-accent-border: color-mix(in srgb, #6366f1 28%, var(--border));
}

.create-engagement-root--reactivation {
  --mission-accent: #e11d48;
  --mission-accent-deep: #be123c;
  --mission-accent-soft: color-mix(in srgb, #e11d48 12%, #fff);
  --mission-accent-border: color-mix(in srgb, #e11d48 28%, var(--border));
}

.create-engagement-root--mission-launched .create-engagement-header {
  padding: 12px clamp(14px, 3vw, 40px) 14px;
  border-bottom: 1px solid color-mix(in srgb, var(--foreground) 7%, var(--border));
  background: color-mix(in srgb, #fff 88%, transparent);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  box-shadow: 0 1px 0 color-mix(in srgb, #fff 70%, transparent);
}

.create-engagement-root--mission-launched .create-engagement-back {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px 4px 6px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
  background: color-mix(in srgb, #fff 92%, var(--surface));
  text-decoration: none;
  transition: border-color 0.15s ease, background 0.15s ease;
}

.create-engagement-root--mission-launched .create-engagement-back:hover {
  border-color: color-mix(in srgb, var(--mission-accent, var(--brand-600)) 35%, var(--border));
  background: #fff;
}

.create-engagement-title-block {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.create-engagement-mission-kicker {
  margin: 0;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--mission-accent-deep, var(--brand-700)) 78%, var(--muted));
}

.create-engagement-root--mission-launched .create-engagement-title {
  font-size: clamp(1.25rem, 2.4vw, 1.65rem);
  font-weight: 900;
  letter-spacing: -0.03em;
  line-height: 1.15;
}

.create-engagement-header-meta--mission {
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));
  background: color-mix(in srgb, #fff 90%, var(--surface));
  color: var(--muted);
  font-size: 10px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.create-engagement-root--mission-launched .create-engagement-body {
  padding: 16px clamp(14px, 3vw, 40px) 24px;
  gap: 12px;
}

.create-engagement-details-shell {
  width: 100%;
  max-width: 720px;
  margin: 0 auto;
}

.create-engagement-details-card {
  border-radius: 18px;
  border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
  background:
    linear-gradient(180deg, #fff 0%, color-mix(in srgb, var(--mission-accent-soft, var(--surface)) 38%, #fff) 100%);
  box-shadow:
    0 1px 0 color-mix(in srgb, #fff 80%, transparent) inset,
    0 18px 40px -28px color-mix(in srgb, var(--foreground) 28%, transparent),
    0 4px 14px -8px color-mix(in srgb, var(--mission-accent-deep, var(--brand-700)) 18%, transparent);
  overflow: hidden;
}

.create-engagement-details-card-head {
  display: grid;
  gap: 10px;
  padding: 18px 18px 14px;
  border-bottom: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
  background: color-mix(in srgb, var(--mission-accent-soft, color-mix(in srgb, var(--brand-600) 5%, #fff)) 55%, #fff);
}

.create-engagement-mission-badge {
  display: inline-flex;
  align-items: center;
  width: fit-content;
  max-width: 100%;
  padding: 5px 12px;
  border-radius: 999px;
  border: 1px solid var(--mission-accent-border, color-mix(in srgb, var(--brand-600) 24%, var(--border)));
  background: color-mix(in srgb, var(--mission-accent-soft, color-mix(in srgb, var(--brand-600) 8%, #fff)) 70%, #fff);
  color: var(--mission-accent-deep, var(--brand-700));
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.create-engagement-details-card-head .create-engagement-step-lead {
  margin: 0;
  font-size: 14px;
  line-height: 1.55;
  color: color-mix(in srgb, var(--foreground) 78%, var(--muted));
  max-width: 52ch;
}

.create-engagement-details-card-head--mission {
  padding: 20px 20px 16px;
  gap: 0;
}

.create-engagement-details-card-head--mission .create-engagement-step-lead {
  font-size: 15px;
  line-height: 1.5;
  color: color-mix(in srgb, var(--foreground) 84%, var(--muted));
  max-width: none;
}

.create-engagement-details-card .create-engagement-step-fields {
  display: grid;
  gap: 14px;
  padding: 16px 18px 18px;
}

.create-engagement-root--mission-launched .create-engagement-field label {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--foreground) 72%, var(--muted));
}

.create-engagement-root--mission-launched .create-engagement-field input,
.create-engagement-root--mission-launched .create-engagement-field select,
.create-engagement-root--mission-launched .create-engagement-field textarea {
  min-height: 46px;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));
  background: #fff;
  box-shadow: 0 1px 0 color-mix(in srgb, #fff 80%, transparent) inset;
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease,
    background 0.15s ease;
}

.create-engagement-root--mission-launched .create-engagement-field input:focus,
.create-engagement-root--mission-launched .create-engagement-field select:focus,
.create-engagement-root--mission-launched .create-engagement-field textarea:focus {
  outline: none;
  border-color: color-mix(in srgb, var(--mission-accent, var(--brand-600)) 45%, var(--border));
  box-shadow:
    0 0 0 3px color-mix(in srgb, var(--mission-accent, var(--brand-600)) 16%, transparent),
    0 1px 0 color-mix(in srgb, #fff 80%, transparent) inset;
}

.create-engagement-root--mission-launched .create-engagement-schedule-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 14px 16px;
  border-radius: 14px;
  border: 1px dashed color-mix(in srgb, var(--mission-accent, var(--brand-600)) 28%, var(--border));
  background: color-mix(in srgb, var(--mission-accent-soft, color-mix(in srgb, var(--brand-600) 6%, #fff)) 55%, #fff);
  color: color-mix(in srgb, var(--foreground) 70%, var(--muted));
  font-size: 13px;
  font-weight: 700;
  transition: border-color 0.15s ease, background 0.15s ease, transform 0.15s ease;
}

.create-engagement-root--mission-launched .create-engagement-schedule-toggle::after {
  content: "+";
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 500;
  line-height: 1;
  color: var(--mission-accent-deep, var(--brand-700));
  background: color-mix(in srgb, var(--mission-accent-soft, color-mix(in srgb, var(--brand-600) 10%, #fff)) 80%, #fff);
  border: 1px solid color-mix(in srgb, var(--mission-accent, var(--brand-600)) 22%, var(--border));
}

.create-engagement-root--mission-launched .create-engagement-schedule-toggle:hover {
  border-color: color-mix(in srgb, var(--mission-accent, var(--brand-600)) 42%, var(--border));
  background: #fff;
  color: var(--foreground);
}

.create-engagement-mission-footer-helper {
  width: 100%;
  margin: 0;
  padding: 0 2px 2px;
  font-size: 12px;
  line-height: 1.45;
  font-weight: 600;
  color: color-mix(in srgb, var(--foreground) 58%, var(--muted));
  text-align: center;
}

.create-engagement-root--mission-launched .create-engagement-alert {
  max-width: 720px;
  margin: 0 auto;
  width: 100%;
  border-radius: 14px;
}

.create-engagement-footer--mission-launch {
  padding: 12px clamp(14px, 3vw, 40px) calc(12px + env(safe-area-inset-bottom, 0px));
  border-top: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
  background: color-mix(in srgb, #fff 90%, transparent);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  box-shadow: 0 -8px 28px -20px color-mix(in srgb, var(--foreground) 35%, transparent);
}

.create-engagement-footer--mission-launch.create-engagement-footer--details-save {
  gap: 10px;
  flex-wrap: wrap;
}

.create-engagement-footer--mission-launch .create-engagement-mission-footer-helper {
  flex-basis: 100%;
  order: -2;
  max-width: 720px;
  margin: 0 auto;
}

.create-engagement-footer--mission-launch .ghost {
  align-self: flex-start;
  min-height: 40px;
  max-height: none;
  padding: 0 12px;
  border-radius: 999px;
  border: 1px solid transparent;
  color: color-mix(in srgb, var(--foreground) 62%, var(--muted));
}

.create-engagement-footer--mission-launch .ghost:hover {
  border-color: color-mix(in srgb, var(--foreground) 10%, var(--border));
  background: color-mix(in srgb, #fff 80%, var(--surface));
  color: var(--foreground);
}

.create-engagement-footer--mission-launch .create-engagement-footer-actions {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  width: 100%;
}

.create-engagement-footer--mission-launch .create-engagement-footer-actions button {
  min-height: 44px;
  max-height: none;
  padding: 0 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: -0.01em;
  box-shadow: 0 1px 0 color-mix(in srgb, #fff 35%, transparent) inset;
}

.create-engagement-footer--mission-launch .create-engagement-footer-actions .secondary {
  background: #fff;
  border-color: color-mix(in srgb, var(--foreground) 12%, var(--border));
  color: color-mix(in srgb, var(--foreground) 78%, var(--muted));
}

.create-engagement-footer--mission-launch .create-engagement-footer-actions .primary {
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--mission-accent, var(--brand-600)) 92%, #fff) 0%,
    var(--mission-accent-deep, var(--brand-600)) 100%
  );
  border-color: color-mix(in srgb, var(--mission-accent-deep, var(--brand-700)) 80%, #000);
  color: #fff;
  box-shadow:
    0 1px 0 color-mix(in srgb, #fff 22%, transparent) inset,
    0 10px 22px -14px color-mix(in srgb, var(--mission-accent-deep, var(--brand-700)) 55%, transparent);
}

.create-engagement-footer--mission-launch .create-engagement-footer-actions .primary:hover {
  filter: brightness(1.03);
}

@media (max-width: 639px) {
  .create-engagement-footer--mission-launch .create-engagement-footer-actions {
    grid-template-columns: 1fr;
  }

  .create-engagement-footer--mission-launch .create-engagement-footer-actions .primary {
    order: -1;
  }

  .create-engagement-details-card-head {
    padding: 16px 14px 12px;
  }

  .create-engagement-details-card .create-engagement-step-fields {
    padding: 14px;
  }
}

@media (min-width: 769px) {
  .create-engagement-root--mission-launched .create-engagement-header,
  .create-engagement-root--mission-launched .create-engagement-body,
  .create-engagement-footer--mission-launch {
    padding-left: clamp(24px, 4vw, 48px);
    padding-right: clamp(24px, 4vw, 48px);
  }

  .create-engagement-details-shell {
    max-width: 760px;
  }

  .create-engagement-details-card .create-engagement-step-fields {
    grid-template-columns: 1fr 1fr;
    align-items: start;
  }

  .create-engagement-details-card .create-engagement-field--full,
  .create-engagement-details-card .create-engagement-schedule-toggle {
    grid-column: 1 / -1;
  }
}
`;

