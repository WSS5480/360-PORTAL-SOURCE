export const aiNoteCaptureCss = `
.sales-mobile-action-bar-shell {
  display: none;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 44;
  pointer-events: none;
}
.sales-mobile-action-bar--single {
  grid-template-columns: 1fr;
}
.sales-mobile-action-bar {
  pointer-events: auto;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  width: 100%;
  max-width: none;
  margin: 0;
  padding: 8px 12px calc(8px + env(safe-area-inset-bottom, 0px));
  box-sizing: border-box;
  border-top: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
  background: var(--surface);
  box-shadow: none;
}
.sales-mobile-action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  max-height: 44px;
  padding: 0 12px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));
  background: var(--surface);
  font-size: 13px;
  font-weight: 700;
  line-height: 1.2;
  color: var(--foreground);
  text-decoration: none;
  text-align: center;
  cursor: pointer;
  box-sizing: border-box;
  -webkit-tap-highlight-color: transparent;
}
.sales-mobile-action-btn--primary {
  border-color: color-mix(in srgb, var(--brand-600) 28%, var(--border));
  background: var(--brand-600);
  color: #fff;
  font-weight: 800;
}
.sales-mobile-action-btn:active {
  opacity: 0.92;
}
@media (max-width: 1024px) {
  .sales-mobile-action-bar-shell {
    display: block;
  }
}
@media (max-width: 360px) {
  .sales-mobile-action-bar {
    grid-template-columns: 1fr;
    gap: 6px;
  }
}
body:has(.case-bottom-action-shell--mobile) .sales-mobile-action-bar-shell,
body:has(.org-account-detail-native .org-mobile-action-bar) .sales-mobile-action-bar-shell {
  display: none !important;
}
@media (min-width: 1025px) {
  .sales-mobile-action-bar-shell {
    display: none !important;
  }
}

.sales-log-update-fab {
  position: fixed;
  right: 14px;
  bottom: calc(58px + env(safe-area-inset-bottom, 0px));
  z-index: 43;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 40px;
  max-height: 40px;
  padding: 0 12px 0 10px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--brand-600) 30%, var(--border));
  background: var(--brand-600);
  color: #fff;
  font-size: 12px;
  font-weight: 800;
  line-height: 1;
  cursor: pointer;
  box-shadow: 0 2px 8px color-mix(in srgb, var(--brand-600) 22%, transparent);
  -webkit-tap-highlight-color: transparent;
}
.sales-log-update-fab-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  font-size: 16px;
  font-weight: 900;
  line-height: 1;
}
.sales-log-update-fab-label {
  white-space: nowrap;
}
body:has(.case-bottom-action-shell--mobile) .sales-log-update-fab {
  bottom: calc(52px + env(safe-area-inset-bottom, 0px));
}
@media (max-width: 1024px) {
  .sales-log-update-fab {
    display: none !important;
  }
}
@media (min-width: 1025px) {
  .sales-log-update-fab {
    display: none !important;
  }
}

.sales-log-update-desktop-btn {
  display: none;
}
@media (min-width: 1025px) {
  .sales-log-update-desktop-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    position: fixed;
    top: 12px;
    right: 16px;
    z-index: 42;
    min-height: 36px;
    padding: 0 14px;
    border-radius: 8px;
    border: 1px solid color-mix(in srgb, var(--brand-600) 28%, var(--border));
    background: var(--surface);
    color: var(--brand-700, var(--brand-600));
    font-size: 13px;
    font-weight: 800;
    cursor: pointer;
    box-shadow: none;
  }
  .sales-log-update-desktop-btn:hover {
    background: color-mix(in srgb, var(--brand-600) 6%, var(--surface));
  }
  body:has(.provider-workspace-page) .sales-log-update-desktop-btn,
  body:has(.prepare-for-meeting-page) .sales-log-update-desktop-btn {
    display: none !important;
  }
}

.ai-note-capture-sheet {
  position: fixed;
  inset: 0;
  z-index: 70;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  background: color-mix(in srgb, var(--foreground) 42%, transparent);
}
.ai-note-capture-panel {
  display: flex;
  flex-direction: column;
  max-height: min(92vh, 760px);
  background: var(--surface);
  border-radius: 16px 16px 0 0;
  border-top: 1px solid var(--border);
  box-shadow: 0 -8px 32px color-mix(in srgb, var(--foreground) 10%, transparent);
}
.ai-note-capture-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 12px 14px 8px;
  border-bottom: 1px solid var(--border);
}
.ai-note-capture-panel-title {
  margin: 0;
  font-size: 16px;
  font-weight: 900;
  letter-spacing: -0.02em;
}
.ai-note-capture-panel-body {
  overflow: auto;
  padding: 12px 14px 16px;
  -webkit-overflow-scrolling: touch;
}
.ai-note-capture-step-label {
  margin: 0 0 8px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--muted);
}
.ai-note-capture-mode-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.ai-note-capture-mode-btn {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  min-height: 72px;
  padding: 12px;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: color-mix(in srgb, var(--surface) 92%, var(--foreground) 2%);
  text-align: left;
  font: inherit;
}
.ai-note-capture-mode-btn:active { transform: scale(0.98); }
.ai-note-capture-mode-btn--active {
  border-color: color-mix(in srgb, var(--brand-600) 45%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 8%, var(--surface));
}
.ai-note-capture-mode-btn-title { font-size: 13px; font-weight: 800; }
.ai-note-capture-mode-btn-sub { font-size: 11px; color: var(--muted); line-height: 1.35; }
.ai-note-capture-hipaa {
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, #b45309 35%, var(--border));
  background: color-mix(in srgb, #b45309 8%, var(--surface));
  font-size: 12px;
  line-height: 1.45;
  color: #9a3412;
  font-weight: 650;
}
.ai-note-capture-phi-alert {
  padding: 10px 12px;
  margin-bottom: 10px;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, #dc2626 35%, var(--border));
  background: color-mix(in srgb, #dc2626 8%, var(--surface));
  font-size: 12px;
  line-height: 1.4;
  color: #991b1b;
}
.ai-note-capture-compose-tools {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 10px;
}
.ai-note-capture-compose-tool {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 36px;
  padding: 0 12px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));
  background: var(--surface);
  font-size: 12px;
  font-weight: 700;
  color: var(--foreground);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
.ai-note-capture-compose-tool--active {
  border-color: color-mix(in srgb, var(--brand-600) 35%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 8%, var(--surface));
  color: var(--brand-700, var(--brand-600));
}
.ai-note-capture-compose-tool:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.ai-note-capture-compose-lead {
  margin: 0 0 10px;
  font-size: 12px;
  line-height: 1.45;
  color: var(--muted);
}
.ai-note-capture-compose-hipaa {
  margin: 0 0 12px;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
  background: color-mix(in srgb, var(--foreground) 2%, var(--surface));
  font-size: 11px;
  line-height: 1.4;
  color: color-mix(in srgb, var(--foreground) 72%, transparent);
}
.ai-note-capture-compose-ack {
  display: flex;
  gap: 8px;
  margin-top: 8px;
  font-size: 12px;
  align-items: flex-start;
  line-height: 1.35;
}
.ai-note-capture-textarea--compose {
  min-height: 180px;
  font-size: 15px;
  line-height: 1.45;
}
.ai-note-capture-textarea {
  width: 100%;
  min-height: 140px;
  resize: vertical;
  border-radius: 10px;
  border: 1px solid var(--border);
  padding: 10px 12px;
  font: inherit;
  font-size: 14px;
  line-height: 1.45;
  background: var(--surface);
}
.ai-note-capture-footer {
  display: flex;
  gap: 8px;
  padding: 10px 14px calc(10px + env(safe-area-inset-bottom, 0px));
  border-top: 1px solid var(--border);
  background: var(--surface);
  position: sticky;
  bottom: 0;
}
.ai-note-capture-footer:has(.ai-note-capture-footer-review) {
  flex-direction: column;
}
.ai-note-capture-footer > button { flex: 1; min-height: 44px; }
.ai-note-capture-footer-review {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}
.ai-note-capture-footer-review-row {
  display: flex;
  gap: 8px;
  width: 100%;
}
.ai-note-capture-footer-review-row button {
  flex: 1;
  min-height: 44px;
}
.ai-note-capture-footer-save {
  width: 100%;
  min-height: 44px;
}
.log-update-review-subtitle {
  margin: 0 0 14px;
  font-size: 13px;
  line-height: 1.45;
  color: var(--muted);
}
.log-update-review-section {
  margin-bottom: 16px;
}
.log-update-review-section-title {
  margin: 0 0 8px;
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  color: var(--brand-700, var(--brand-600));
}
.log-update-review-subblock {
  margin-bottom: 12px;
}
.log-update-review-subblock-title {
  margin: 0 0 6px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: var(--muted);
}
.log-update-review-line--confirmed {
  padding: 6px 10px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--foreground);
  background: color-mix(in srgb, #16a34a 8%, var(--surface));
  border: 1px solid color-mix(in srgb, #16a34a 22%, var(--border));
}
.log-update-review-partial-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 8px;
}
.log-update-review-partial-list li {
  padding: 8px 10px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--brand-600) 6%, var(--surface));
  border: 1px solid color-mix(in srgb, var(--brand-600) 18%, var(--border));
}
.log-update-review-partial-label {
  display: block;
  font-size: 13px;
  font-weight: 700;
  color: var(--foreground);
}
.log-update-review-partial-reason {
  display: block;
  margin-top: 3px;
  font-size: 12px;
  line-height: 1.35;
  font-weight: 500;
  color: var(--muted);
}
.log-update-review-related-areas {
  margin: 0;
  font-size: 13px;
  line-height: 1.4;
  font-weight: 600;
  color: var(--foreground);
}
.log-update-review-checklist,
.log-update-review-gaps {
  margin: 0;
  padding: 0;
  list-style: none;
}
.log-update-review-checklist li,
.log-update-review-gaps li {
  margin-bottom: 6px;
}
.log-update-review-check {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  font-size: 14px;
  line-height: 1.4;
  font-weight: 600;
  cursor: pointer;
  min-height: 44px;
  padding: 8px 10px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: color-mix(in srgb, var(--surface) 98%, var(--foreground) 1%);
  -webkit-tap-highlight-color: transparent;
}
.log-update-review-check input {
  margin-top: 3px;
  flex-shrink: 0;
  width: 18px;
  height: 18px;
}
.log-update-review-check--note {
  align-items: flex-start;
}
.log-update-review-note-text {
  font-size: 13px;
  font-weight: 500;
  color: var(--muted);
  white-space: pre-wrap;
  word-break: break-word;
}
.log-update-review-gaps li {
  padding: 8px 10px;
  border-radius: 8px;
  font-size: 13px;
  line-height: 1.35;
  color: var(--muted);
  background: color-mix(in srgb, var(--foreground) 3%, var(--surface));
  border: 1px dashed color-mix(in srgb, var(--foreground) 12%, var(--border));
}
.log-update-review-count {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--muted);
}
.log-update-review-recommended-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 8px;
}
.log-update-review-recommended-card {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin: 0;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--brand-600) 18%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 5%, var(--surface));
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
.log-update-review-recommended-check {
  margin-top: 2px;
  flex-shrink: 0;
  width: 18px;
  height: 18px;
}
.log-update-review-recommended-body {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}
.log-update-review-recommended-headline {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 6px;
  font-size: 13px;
  font-weight: 700;
  color: var(--foreground);
}
.log-update-review-recommended-scope {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.02em;
  color: var(--brand-700, var(--brand-600));
  flex-shrink: 0;
}
.log-update-review-scope-note {
  display: block;
  font-size: 12px;
  line-height: 1.35;
  font-weight: 600;
  color: var(--muted);
}
.log-update-review-recommended-title {
  font-weight: 700;
}
.log-update-review-recommended-detail {
  font-size: 12px;
  line-height: 1.4;
  font-weight: 500;
  color: var(--muted);
}
.log-update-review-confidence-hint {
  font-size: 11px;
  font-weight: 600;
  color: color-mix(in srgb, var(--muted) 88%, var(--foreground));
}
.log-update-review-validation-list {
  margin: 0;
  padding: 0 0 0 14px;
  list-style: disc;
}
.log-update-review-validation-list li {
  margin-bottom: 6px;
  font-size: 13px;
  line-height: 1.4;
  color: var(--foreground);
}
.log-update-review-next-moves {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 6px;
}
.log-update-review-next-moves li {
  padding: 8px 10px;
  border-radius: 8px;
  font-size: 13px;
  line-height: 1.35;
}
.log-update-review-next-move--guidance {
  color: var(--muted);
  background: color-mix(in srgb, var(--foreground) 3%, var(--surface));
  border: 1px dashed color-mix(in srgb, var(--foreground) 10%, var(--border));
}
.log-update-review-next-move--task {
  color: var(--foreground);
  font-weight: 600;
  background: color-mix(in srgb, var(--brand-600) 6%, var(--surface));
  border: 1px solid color-mix(in srgb, var(--brand-600) 16%, var(--border));
}
.log-update-review-raw-debrief {
  margin: 16px 0 0;
  padding: 0;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
  background: color-mix(in srgb, var(--foreground) 2%, var(--surface));
}
.log-update-review-raw-summary {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  list-style: none;
  cursor: pointer;
}
.log-update-review-raw-summary::-webkit-details-marker {
  display: none;
}
.log-update-review-raw-summary-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.log-update-review-raw-preview {
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  color: var(--foreground);
}
.log-update-review-raw-hint {
  margin: 0;
  font-size: 12px;
  line-height: 1.35;
  color: var(--muted);
  font-weight: 500;
}
.log-update-review-raw-toggle {
  flex-shrink: 0;
  font-size: 12px;
  font-weight: 700;
  color: var(--brand-700, var(--brand-600));
  text-decoration: underline;
  text-underline-offset: 2px;
}
.log-update-review-raw-debrief[open] .log-update-review-raw-toggle--show {
  display: none;
}
.log-update-review-raw-debrief:not([open]) .log-update-review-raw-toggle--hide {
  display: none;
}
.log-update-review-raw-body {
  padding: 0 12px 12px;
  border-top: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
}
.log-update-review-raw-text {
  margin: 10px 0 0;
  font-size: 13px;
  line-height: 1.5;
  color: var(--foreground);
  white-space: pre-wrap;
  word-break: break-word;
  overflow-wrap: anywhere;
  max-height: min(40vh, 320px);
  overflow-y: auto;
}
.log-update-review-selection-hint,
.log-update-review-footer-hint {
  margin: 0 0 12px;
  font-size: 12px;
  line-height: 1.45;
  font-weight: 600;
  color: var(--muted);
}
.log-update-review-section-lead {
  margin: -4px 0 8px;
  font-size: 12px;
  line-height: 1.4;
  color: var(--muted);
}
.log-update-review-needs-review-list .log-update-review-recommended-card {
  border-style: dashed;
  background: color-mix(in srgb, var(--foreground) 2%, var(--surface));
}
.log-update-review-save-summary,
.log-update-review-footer-summary {
  margin: 0 0 10px;
  font-size: 12px;
  font-weight: 650;
  color: var(--muted);
}
.log-update-review-empty-hint {
  margin: 0;
  font-size: 13px;
  line-height: 1.4;
  color: var(--muted);
}
.deb-approval {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.deb-approval-hint {
  margin: 0;
  font-size: 12px;
  line-height: 1.45;
  font-weight: 600;
  color: var(--muted);
}
.deb-approval-sec-title {
  margin: 0 0 8px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--muted);
}
.deb-approval-signals,
.deb-approval-missing {
  margin: 0;
  padding: 0 0 0 18px;
  font-size: 13px;
  line-height: 1.45;
}
.deb-approval-signals li,
.deb-approval-missing li {
  margin: 0 0 6px;
}
.deb-approval-status-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.deb-approval-status {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 6px;
  padding: 8px 10px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--foreground) 3%, var(--surface));
  font-size: 13px;
  line-height: 1.35;
}
.deb-approval-status-label {
  font-weight: 650;
}
.deb-approval-status-eq {
  color: var(--muted);
  font-weight: 600;
}
.deb-approval-status-value {
  font-weight: 800;
  text-transform: lowercase;
}
.deb-approval-status--positive .deb-approval-status-value {
  color: #0d9488;
}
.deb-approval-status--partial .deb-approval-status-value {
  color: #b45309;
}
.deb-approval-status--unknown .deb-approval-status-value {
  color: var(--muted);
}
.deb-approval-status-pathway {
  flex: 1 1 100%;
  font-size: 11px;
  font-weight: 600;
  color: var(--muted);
}
.deb-approval-save-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.deb-approval-save-check {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  cursor: pointer;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: var(--surface);
}
.deb-approval-save-check input {
  margin-top: 3px;
  flex-shrink: 0;
}
.deb-approval-save-body {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}
.deb-approval-save-title {
  font-size: 13px;
  font-weight: 700;
}
.deb-approval-save-scope {
  font-size: 11px;
  font-weight: 700;
  color: var(--muted);
}
.deb-approval-save-detail {
  font-size: 12px;
  line-height: 1.4;
  color: var(--muted);
}
.deb-approval-conflict {
  margin: 6px 0 0 28px;
  padding: 10px;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, #b45309 35%, var(--border));
  font-size: 12px;
}
.deb-approval-conflict-actions {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}
.deb-approval-empty,
.deb-approval-save-summary {
  margin: 0;
  font-size: 12px;
  line-height: 1.45;
  color: var(--muted);
  font-weight: 650;
}
.ai-debrief-review {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.ai-debrief-review--streamlined,
.ai-debrief-review--operational,
.ai-debrief-review--approval,
.ai-debrief-review--rep-friendly {
  gap: 10px;
  padding: 0;
}
.ai-debrief-review--streamlined {
  gap: 8px;
}
.ai-debrief-review-decisions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--foreground) 12%, var(--surface));
  background: color-mix(in srgb, var(--foreground) 2%, var(--surface));
}
.ai-debrief-review-decisions__title {
  margin: 0;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted);
}
.ai-debrief-review-decisions__contacts {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.ai-debrief-review-details {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.ai-debrief-review-details__toggle {
  align-self: flex-start;
  margin: 0;
  padding: 0;
  border: 0;
  background: transparent;
  font: inherit;
  font-size: 12px;
  font-weight: 700;
  color: color-mix(in srgb, var(--foreground) 72%, var(--surface));
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 2px;
}
.ai-debrief-review-details__toggle:hover:not(:disabled) {
  color: var(--foreground);
}
.ai-debrief-review-details__panel {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-top: 4px;
}
.ai-debrief-review-header--details {
  gap: 2px;
  padding-bottom: 6px;
  border-bottom: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--surface));
}
.ai-note-capture-footer-review--streamlined .log-update-review-footer-summary {
  display: none;
}
.ai-debrief-review--flat {
  gap: 14px;
}
.ai-debrief-review--flat .ai-debrief-summary {
  padding: 0 0 0 10px;
  border: 0;
  border-left: 2px solid color-mix(in srgb, var(--foreground) 22%, var(--surface));
  background: transparent;
  border-radius: 0;
}
.ai-debrief-review--flat .ai-debrief-review-decisions {
  padding: 0;
  border: 0;
  background: transparent;
  gap: 6px;
}
.ai-debrief-review-suggestions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.ai-debrief-review-suggestions__title {
  margin: 0;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--muted);
}
.ai-debrief-review--flat .ai-intelligence-brief__section {
  padding: 0;
  border: 0;
  background: transparent;
  gap: 6px;
}
.ai-debrief-review--flat .ai-intelligence-brief__item {
  padding: 8px 0;
  border-radius: 0;
  border: 0;
  border-bottom: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--surface));
  background: transparent;
}
.ai-debrief-review--flat .ai-intelligence-brief__item:last-child {
  border-bottom: 0;
}
.ai-debrief-review-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.ai-debrief-review-section__title {
  margin: 0;
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.02em;
  color: var(--foreground);
}
.ai-debrief-review-section__title--sub {
  font-size: 12px;
  color: var(--muted);
}
.ai-debrief-key-takeaways-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.ai-debrief-key-takeaways-list li {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  min-width: 0;
  font-size: 14px;
  line-height: 1.45;
  font-weight: 600;
  color: var(--foreground);
  overflow-wrap: break-word;
  word-break: break-word;
}
.ai-debrief-key-takeaways-check {
  flex-shrink: 0;
  color: var(--brand-700);
  font-weight: 800;
}
.ai-debrief-next-steps-list {
  margin: 0;
  padding-left: 20px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
  line-height: 1.45;
  font-weight: 650;
  color: var(--foreground);
}
.ai-debrief-updates-by-category {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.ai-debrief-update-category__title {
  margin: 0 0 8px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--muted);
}
.ai-debrief-update-category__cards {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.ai-debrief-update-card {
  padding: 12px 14px;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
  background: color-mix(in srgb, var(--foreground) 2%, var(--surface));
}
.ai-debrief-update-card__fields {
  margin: 0;
  display: grid;
  gap: 10px;
}
.ai-debrief-update-card__field {
  display: grid;
  gap: 3px;
}
.ai-debrief-update-card__field dt {
  margin: 0;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--muted);
}
.ai-debrief-update-card__field dd {
  margin: 0;
  font-size: 13px;
  line-height: 1.45;
  font-weight: 600;
  color: var(--foreground);
  white-space: pre-line;
}
.ai-debrief-update-card__quote {
  font-style: italic;
  color: #475569;
  font-weight: 550;
}
.ai-debrief-update-card__confidence {
  display: inline-flex;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.02em;
}
.ai-debrief-update-card__confidence--high {
  background: color-mix(in srgb, #0d9488 12%, var(--surface));
  color: #0f766e;
}
.ai-debrief-update-card__confidence--medium {
  background: color-mix(in srgb, #b45309 10%, var(--surface));
  color: #9a3412;
}
.ai-debrief-update-card__confidence--low {
  background: color-mix(in srgb, var(--foreground) 6%, var(--surface));
  color: var(--muted);
}
.ai-debrief-update-category__contact-wrap {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.ai-typed-review-cards {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.ai-typed-review-card {
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
  background: color-mix(in srgb, var(--foreground) 2%, var(--surface));
  overflow: hidden;
}
.ai-typed-review-card__type {
  margin: 0;
  padding: 10px 14px 0;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--muted);
}
.ai-typed-review-card__body {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 8px 14px 14px;
}
.ai-typed-review-card__footer {
  padding: 0 14px 14px;
  border-top: 1px dashed color-mix(in srgb, var(--foreground) 8%, var(--border));
}
.ai-typed-review-card__title {
  margin: 0;
  font-size: 16px;
  font-weight: 750;
  line-height: 1.35;
  color: var(--foreground);
}
.ai-typed-review-card__clinical-head {
  display: grid;
  gap: 4px;
}
.ai-typed-review-card__clinical-category {
  margin: 0;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--muted);
}
.ai-typed-review-card__fields {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.ai-typed-review-card__row {
  display: grid;
  gap: 4px;
}
.ai-typed-review-card__row-label {
  margin: 0;
  font-size: 11px;
  font-weight: 700;
  color: var(--muted);
}
.ai-typed-review-card__row-value {
  margin: 0;
  font-size: 14px;
  font-weight: 650;
  line-height: 1.4;
  color: var(--foreground);
}
.ai-typed-review-card__section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.ai-typed-review-card__section-title {
  margin: 0;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--muted);
}
.ai-typed-review-card__evidence-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.ai-typed-review-card__evidence-item {
  margin: 0;
  padding: 10px 12px;
  border-radius: 8px;
  font-size: 13px;
  line-height: 1.45;
  font-weight: 500;
  color: color-mix(in srgb, var(--foreground) 82%, var(--muted));
  background: color-mix(in srgb, var(--foreground) 4%, var(--surface));
  border: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
  word-break: break-word;
}
.ai-typed-review-card__evidence-empty {
  margin: 0;
  font-size: 12px;
  color: var(--muted);
}
.ai-typed-review-card__confidence {
  display: inline-flex;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 800;
}
.ai-typed-review-card__confidence--high {
  background: color-mix(in srgb, #0d9488 12%, var(--surface));
  color: #0f766e;
}
.ai-typed-review-card__confidence--medium {
  background: color-mix(in srgb, #b45309 10%, var(--surface));
  color: #9a3412;
}
.ai-typed-review-card__confidence--low {
  background: color-mix(in srgb, var(--foreground) 6%, var(--surface));
  color: var(--muted);
}
.ai-typed-review-card__action-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.ai-typed-review-card__status {
  margin: 0;
  font-size: 12px;
  font-weight: 700;
  color: var(--muted);
}
.ai-typed-review-card__undo {
  margin-top: 8px;
}
.ai-typed-review-card--observation-access .ai-typed-review-card__body {
  gap: 12px;
}
.ai-debrief-update-card__field-label {
  margin: 0 0 4px;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--muted);
}
.ai-debrief-review-empty {
  margin: 0;
  font-size: 13px;
  color: var(--muted);
}
.ai-debrief-approval-count {
  margin: 0;
  font-size: 12px;
  font-weight: 700;
  color: var(--muted);
}
.ai-debrief-review--rep-friendly .ai-debrief-review-header {
  gap: 2px;
  padding-bottom: 6px;
  border-bottom: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--surface));
}
.ai-debrief-review-header__title {
  margin: 0;
  font-size: 16px;
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1.2;
  color: var(--foreground);
}
.ai-debrief-review-header__subtitle {
  margin: 0;
  font-size: 12px;
  line-height: 1.35;
  font-weight: 600;
  color: var(--muted);
}
.ai-debrief-review--rep-friendly .ai-debrief-review-section {
  gap: 0;
}
.ai-intelligence-brief {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.ai-intelligence-brief--mission {
  gap: 8px;
}
.ai-brief-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  max-width: 100%;
  padding: 2px 7px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--foreground) 12%, var(--surface));
  background: color-mix(in srgb, var(--foreground) 4%, var(--surface));
  font-size: 11px;
  line-height: 1.3;
  font-weight: 650;
  color: var(--foreground);
  white-space: nowrap;
}
.ai-brief-chip__label {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--muted);
}
.ai-brief-chip__value {
  overflow: hidden;
  text-overflow: ellipsis;
}
.ai-brief-chip--positive {
  border-color: color-mix(in srgb, #0d9488 28%, var(--surface));
  background: color-mix(in srgb, #0d9488 10%, var(--surface));
  color: #115e59;
}
.ai-brief-chip--caution {
  border-color: color-mix(in srgb, #d97706 28%, var(--surface));
  background: color-mix(in srgb, #d97706 10%, var(--surface));
  color: #92400e;
}
.ai-brief-chip--neutral {
  border-color: color-mix(in srgb, var(--foreground) 14%, var(--surface));
  background: color-mix(in srgb, var(--foreground) 5%, var(--surface));
}
.ai-brief-chip--provider {
  border-color: color-mix(in srgb, var(--foreground) 18%, var(--surface));
  background: color-mix(in srgb, var(--foreground) 8%, var(--surface));
  font-size: 12px;
  font-weight: 700;
}
.ai-brief-chip--takeaway {
  white-space: normal;
  border-radius: 6px;
  padding: 3px 8px;
  font-size: 11px;
  line-height: 1.35;
}
.ai-brief-chip--priority-high {
  border-color: color-mix(in srgb, #dc2626 30%, var(--surface));
  background: color-mix(in srgb, #dc2626 12%, var(--surface));
  color: #991b1b;
  font-weight: 750;
}
.ai-brief-chip--priority-medium {
  border-color: color-mix(in srgb, #d97706 30%, var(--surface));
  background: color-mix(in srgb, #d97706 12%, var(--surface));
  color: #92400e;
  font-weight: 750;
}
.ai-brief-chip--priority-low {
  border-color: color-mix(in srgb, var(--foreground) 16%, var(--surface));
  background: color-mix(in srgb, var(--foreground) 6%, var(--surface));
  color: var(--muted);
  font-weight: 700;
}
.ai-debrief-summary {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px 10px 8px 12px;
  border-radius: 0 8px 8px 0;
  border: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--surface));
  border-left: 3px solid color-mix(in srgb, var(--foreground) 55%, var(--surface));
  background: color-mix(in srgb, var(--foreground) 3%, var(--surface));
}
.ai-debrief-summary__head {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px 8px;
}
.ai-debrief-summary__title {
  margin: 0;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted);
}
.ai-debrief-summary__takeaways-block {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.ai-debrief-summary__takeaways-heading {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--muted);
}
.ai-debrief-summary__takeaways {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.ai-debrief-summary__takeaways li {
  margin: 0;
  min-width: 0;
}
.ai-debrief-summary__takeaway {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  font-size: 12px;
  line-height: 1.35;
  color: var(--foreground);
}
.ai-debrief-summary__takeaway-mark {
  flex: 0 0 auto;
  font-size: 11px;
  font-weight: 800;
  color: color-mix(in srgb, var(--foreground) 72%, var(--surface));
  line-height: 1.35;
}
.ai-debrief-summary__takeaway-text {
  min-width: 0;
}
.ai-intelligence-brief__section {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 6px 8px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--surface));
  background: color-mix(in srgb, var(--foreground) 1.5%, var(--surface));
}
.ai-intelligence-brief__section--contacts,
.ai-intelligence-brief__section--clinical {
  padding: 5px 8px;
  border-color: color-mix(in srgb, var(--foreground) 6%, var(--surface));
  background: transparent;
}
.ai-clinical-insights__group {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-top: 6px;
}
.ai-clinical-insights__group:first-of-type {
  margin-top: 2px;
}
.ai-clinical-insights__group-title {
  margin: 0;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.03em;
  color: color-mix(in srgb, var(--foreground) 78%, var(--surface));
}
.ai-clinical-insights__list {
  margin: 0;
  padding: 0;
}
.ai-clinical-insights__list .ai-intelligence-brief__primary {
  font-size: 13px;
  font-weight: 600;
}
.ai-intelligence-brief__section--dominant {
  padding: 7px 9px 6px 10px;
  border-left-width: 3px;
  border-left-style: solid;
}
.ai-intelligence-brief__section--observation {
  border-left-color: #0d9488;
  border-color: color-mix(in srgb, #0d9488 22%, var(--surface));
  background: color-mix(in srgb, #0d9488 5%, var(--surface));
}
.ai-intelligence-brief__section--observation .ai-intelligence-brief__heading {
  color: #115e59;
}
.ai-intelligence-brief__section--follow-up {
  border-left-color: #d97706;
  border-color: color-mix(in srgb, #d97706 24%, var(--surface));
  background: color-mix(in srgb, #d97706 5%, var(--surface));
}
.ai-intelligence-brief__section--follow-up .ai-intelligence-brief__heading {
  color: #92400e;
}
.ai-intelligence-brief__section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-height: 18px;
}
.ai-intelligence-brief__heading {
  margin: 0;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted);
}
.ai-intelligence-brief__section-count {
  flex-shrink: 0;
  min-width: 18px;
  padding: 1px 6px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--foreground) 8%, var(--surface));
  font-size: 10px;
  font-weight: 800;
  line-height: 1.4;
  text-align: center;
  color: var(--muted);
}
.ai-intelligence-brief__list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0;
}
.ai-intelligence-brief__item {
  display: grid;
  grid-template-columns: 28px 1fr;
  gap: 6px;
  align-items: start;
  padding: 5px 0;
  border: 0;
  border-radius: 0;
  background: transparent;
  border-bottom: 1px solid color-mix(in srgb, var(--foreground) 7%, var(--surface));
}
.ai-intelligence-brief__item:last-child {
  border-bottom: 0;
  padding-bottom: 2px;
}
.ai-intelligence-brief__section--dominant .ai-intelligence-brief__item {
  border-bottom-color: color-mix(in srgb, var(--foreground) 10%, transparent);
}
.ai-intelligence-brief__item--unchecked {
  opacity: 0.68;
}
.ai-intelligence-brief__item--observation_access .ai-intelligence-brief__primary {
  font-size: 14px;
  font-weight: 750;
}
.ai-intelligence-brief__select {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  margin: 0;
  padding-top: 1px;
  min-height: 32px;
  min-width: 28px;
}
.ai-intelligence-brief__checkbox {
  width: 15px;
  height: 15px;
  margin: 0;
  accent-color: var(--foreground);
  cursor: pointer;
}
.ai-intelligence-brief__item-main {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}
.ai-intelligence-brief__row-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 6px;
}
.ai-intelligence-brief__row-copy {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  flex: 1;
}
.ai-intelligence-brief__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: center;
}
.ai-intelligence-brief__expand {
  flex-shrink: 0;
  margin: 0;
  padding: 1px 0;
  border: 0;
  background: transparent;
  font-size: 11px;
  font-weight: 650;
  color: var(--muted);
  cursor: pointer;
  text-decoration: none;
  white-space: nowrap;
}
.ai-intelligence-brief__expand:hover:not(:disabled) {
  color: var(--foreground);
  text-decoration: underline;
  text-underline-offset: 2px;
}
.ai-intelligence-brief__expand:disabled {
  cursor: default;
  opacity: 0.6;
}
.ai-intelligence-brief__details-panel {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 0;
  padding: 6px 0 2px;
  border-top: 1px dashed color-mix(in srgb, var(--foreground) 12%, var(--surface));
}
.ai-intelligence-brief__priority-band {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.ai-intelligence-brief__priority-band + .ai-intelligence-brief__priority-band {
  margin-top: 4px;
  padding-top: 4px;
  border-top: 1px solid color-mix(in srgb, #d97706 16%, var(--surface));
}
.ai-intelligence-brief__priority-head {
  display: flex;
  align-items: center;
  min-height: 20px;
  padding: 0 0 2px;
}
.ai-intelligence-brief__primary {
  margin: 0;
  font-size: 13px;
  font-weight: 650;
  line-height: 1.35;
  color: var(--foreground);
}
.ai-debrief-pathway-impact {
  margin: 2px 0 0;
  font-size: 12px;
  line-height: 1.4;
  color: var(--muted);
}
.ai-debrief-pathway-impact__label {
  font-weight: 650;
  color: color-mix(in srgb, var(--foreground) 72%, var(--muted));
}
.ai-debrief-pathway-impact__text {
  font-weight: 500;
}
.ai-intelligence-brief__subtitle {
  font-weight: 550;
  color: var(--muted);
}
.ai-intelligence-brief__bullets {
  margin: 0;
  padding-left: 18px;
  font-size: 14px;
  line-height: 1.45;
}
.ai-intelligence-brief__bullets li {
  margin: 0 0 4px;
}
.ai-intelligence-brief__evidence {
  margin: 0;
  padding: 6px 8px;
  border-left: 2px solid color-mix(in srgb, var(--foreground) 18%, var(--surface));
  font-size: 11px;
  line-height: 1.4;
  color: var(--muted);
}
.ai-intelligence-brief__evidence p {
  margin: 0 0 6px;
}
.ai-intelligence-brief__evidence p:last-child {
  margin-bottom: 0;
}
.ai-intelligence-brief__contact-form {
  margin-top: 4px;
}
.ai-debrief-contact-capture {
  margin-top: 2px;
}
.ai-intelligence-brief__details-panel .ai-debrief-contact-actions {
  gap: 6px;
}
.ai-intelligence-brief__details-panel .ai-debrief-contact-form {
  gap: 8px;
}
.ai-intelligence-brief__details-panel .ai-debrief-contact-form-grid {
  gap: 6px;
}
.ai-debrief-review--light {
  gap: 22px;
  padding: 2px 0 4px;
}
.ai-debrief-key-insights-title {
  margin: 0 0 8px;
  font-size: 12px;
  font-weight: 750;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--muted);
}
.ai-debrief-key-insights-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.ai-debrief-key-insights-list li {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 14px;
  line-height: 1.35;
  font-weight: 650;
}
.ai-debrief-key-insights-check {
  flex-shrink: 0;
  color: #0d9488;
  font-weight: 800;
}
.ai-debrief-insight-groups {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.ai-debrief-insight-group {
  padding: 8px 10px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--foreground) 2%, var(--surface));
  border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
}
.ai-debrief-insight-group__row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}
.ai-debrief-insight-group__chevron {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  margin-top: 1px;
  padding: 0;
  border: none;
  background: none;
  font-size: 12px;
  line-height: 1;
  color: var(--muted);
  cursor: pointer;
  font-family: inherit;
}
.ai-debrief-insight-group__main {
  flex: 1;
  min-width: 0;
}
.ai-debrief-insight-group__line {
  margin: 0;
  font-size: 14px;
  line-height: 1.35;
  font-weight: 700;
}
.ai-debrief-insight-group__needs {
  margin: 4px 0 0;
  font-size: 12px;
  line-height: 1.35;
  color: var(--muted);
  font-weight: 600;
}
.ai-debrief-insight-group__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  flex-shrink: 0;
  align-items: flex-start;
}
.ai-debrief-insight-group__actions .ai-debrief-card__btn {
  min-height: 30px;
  padding: 5px 10px;
  font-size: 11px;
}
.ai-debrief-insight-group__body {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid color-mix(in srgb, var(--border) 65%, transparent);
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.ai-debrief-insight-group__detail {
  margin: 0;
  font-size: 12px;
  line-height: 1.4;
  color: var(--muted);
  font-weight: 600;
}
.ai-debrief-insight-item__title {
  margin: 0 0 4px;
  font-size: 13px;
  font-weight: 750;
  line-height: 1.35;
  color: var(--text);
}
.ai-debrief-insight-item__summary {
  margin: 0;
  font-size: 13px;
  line-height: 1.45;
  color: #334155;
  font-weight: 500;
}
.ai-debrief-insight-item__needs {
  margin: 8px 0 0;
}
.ai-debrief-insight-item__needs-k {
  margin: 0 0 4px;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--muted);
}
.ai-debrief-insight-item__needs ul {
  margin: 0;
  padding-left: 18px;
  font-size: 12px;
  line-height: 1.4;
  color: #475569;
  font-weight: 600;
}
.ai-debrief-insight-item__meta {
  margin: 8px 0 0;
  display: grid;
  gap: 6px;
  font-size: 11px;
  line-height: 1.35;
}
.ai-debrief-insight-item__meta div {
  display: grid;
  gap: 2px;
}
.ai-debrief-insight-item__meta dt {
  margin: 0;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--muted);
  font-size: 10px;
}
.ai-debrief-insight-item__meta dd {
  margin: 0;
  font-weight: 600;
  color: #334155;
}
.ai-debrief-insight-item__hint {
  margin: 6px 0 0;
  font-size: 12px;
  color: #b45309;
  font-weight: 600;
}
.ai-debrief-insight-item__state {
  font-size: 11px;
  font-weight: 700;
  color: #0d9488;
}
.ai-debrief-operational-card__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 4px;
}
.ai-debrief-operational-card__status {
  flex-shrink: 0;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--muted);
}
.ai-debrief-evidence {
  margin-top: 8px;
}
.ai-debrief-evidence__toggle {
  border: none;
  background: transparent;
  padding: 0;
  font-size: 11px;
  font-weight: 800;
  color: var(--brand-700);
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 2px;
}
.ai-debrief-evidence__panel {
  margin-top: 8px;
  padding: 10px 10px 8px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
  background: color-mix(in srgb, var(--foreground) 2%, #fff);
}
.ai-debrief-evidence__heading {
  margin: 0 0 8px;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--muted);
}
.ai-debrief-evidence__fields {
  margin: 0;
  display: grid;
  gap: 8px;
}
.ai-debrief-evidence__field {
  display: grid;
  gap: 2px;
}
.ai-debrief-evidence__field dt {
  margin: 0;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--muted);
}
.ai-debrief-evidence__field dd {
  margin: 0;
  font-size: 12px;
  line-height: 1.4;
  font-weight: 600;
  color: #334155;
}
.ai-debrief-insight-group__title {
  margin: 0 0 4px;
  font-size: 13px;
  font-weight: 800;
  line-height: 1.25;
  color: var(--foreground);
}
.ai-debrief-insight-item--merged {
  padding: 8px 10px;
  border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
  border-radius: 8px;
  background: #fff;
}
.ai-debrief-operational-sections {
  display: grid;
  gap: 6px;
}
.ai-debrief-operational-card {
  padding: 8px 10px;
  border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
  border-radius: 8px;
  background: #fff;
}
.ai-debrief-operational-card__label {
  margin: 0 0 6px;
  font-size: 13px;
  font-weight: 800;
  line-height: 1.25;
}
.ai-debrief-operational-card__summary {
  margin: 0;
  font-size: 13px;
  line-height: 1.45;
  color: #334155;
  font-weight: 500;
}
.ai-debrief-operational-card__needed {
  margin: 8px 0 0;
}
.ai-debrief-operational-card__needed-k {
  margin: 0 0 4px;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--muted);
}
.ai-debrief-operational-card__needed-list {
  margin: 0;
  padding-left: 18px;
  font-size: 12px;
  line-height: 1.4;
  color: #475569;
  font-weight: 600;
}
.ai-debrief-operational-card__action-hint {
  margin: 8px 0 0;
  font-size: 12px;
  font-weight: 700;
  color: var(--brand-700);
}
.ai-debrief-card__conflict-prompt {
  margin: 6px 0 0;
  font-size: 12px;
  font-weight: 700;
}
.ai-debrief-review-header {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.ai-debrief-review-title {
  margin: 0;
  font-size: 18px;
  font-weight: 750;
  letter-spacing: -0.02em;
}
.ai-debrief-review-context {
  margin: 0;
  font-size: 11px;
  line-height: 1.3;
  color: var(--muted);
  font-weight: 600;
}
.ai-debrief-touch-summary {
  margin: 0;
  max-height: 80px;
  overflow: hidden;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, #0d9488 18%, var(--border));
  background: color-mix(in srgb, #0d9488 5%, var(--surface));
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.ai-debrief-touch-summary__row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  min-width: 0;
}
.ai-debrief-touch-summary__total {
  margin: 0;
  font-size: 12px;
  line-height: 1.3;
  font-weight: 800;
  color: var(--foreground);
  min-width: 0;
}
.ai-debrief-touch-summary__check {
  color: #0d9488;
  font-weight: 900;
  margin-right: 4px;
}
.ai-debrief-touch-summary__badges {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 4px;
  flex-shrink: 0;
}
.ai-debrief-touch-summary__badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 6px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));
  background: color-mix(in srgb, var(--foreground) 3%, #fff);
  font-size: 10px;
  line-height: 1.2;
  font-weight: 700;
  color: var(--muted);
  white-space: nowrap;
}
.ai-debrief-touch-summary__next-move {
  margin: 0;
  font-size: 11px;
  line-height: 1.35;
  color: var(--foreground);
  min-width: 0;
}
.ai-debrief-touch-summary__next-move-label {
  font-weight: 700;
  color: var(--muted);
}
.ai-debrief-touch-summary__next-move-text {
  font-weight: 800;
}
.ai-debrief-known-need {
  display: grid;
  gap: 6px;
}
.ai-debrief-known-need__block {
  display: grid;
  gap: 2px;
}
.ai-debrief-known-need__label {
  margin: 0;
  font-size: 10px;
  line-height: 1.2;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--muted);
}
.ai-debrief-known-need__known-line {
  margin: 0;
  display: flex;
  align-items: flex-start;
  gap: 6px;
  font-size: 13px;
  line-height: 1.35;
  font-weight: 700;
  color: var(--foreground);
}
.ai-debrief-known-need__check {
  flex-shrink: 0;
  color: #0d9488;
  font-weight: 900;
}
.ai-debrief-known-need__need-list {
  margin: 0;
  padding: 0 0 0 14px;
  list-style: disc;
  display: grid;
  gap: 2px;
  font-size: 13px;
  line-height: 1.35;
  font-weight: 650;
  color: var(--foreground);
}
.ai-debrief-known-need__need-list li {
  margin: 0;
}
.ai-debrief-approval-preview {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.ai-debrief-approval-preview__item {
  display: grid;
  gap: 4px;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
  background: #fff;
}
.ai-debrief-approval-preview__label {
  font-size: 13px;
  font-weight: 800;
  line-height: 1.25;
  color: var(--foreground);
}
.ai-debrief-approval-preview__item {
  padding: 12px 14px;
  border-radius: 12px;
  background: color-mix(in srgb, var(--foreground) 2.5%, var(--surface));
  box-shadow: 0 1px 0 color-mix(in srgb, var(--border) 80%, transparent);
}
.ai-debrief-approval-preview__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 4px;
}
.ai-debrief-approval-preview__label {
  font-size: 13px;
  font-weight: 800;
  color: var(--foreground);
}
.ai-debrief-approval-preview__status {
  flex-shrink: 0;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: var(--muted);
}
.ai-debrief-approval-preview__summary {
  margin: 0;
  font-size: 13px;
  line-height: 1.4;
  font-weight: 600;
  color: color-mix(in srgb, var(--foreground) 82%, transparent);
}
.ai-debrief-review-found {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.ai-debrief-review-found-line {
  margin: 0;
  font-size: 14px;
  line-height: 1.35;
  font-weight: 700;
  color: var(--foreground);
}
.ai-debrief-review-found-line--muted {
  font-size: 13px;
  font-weight: 600;
  color: var(--muted);
}
.ai-debrief-cards {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.ai-debrief-card {
  padding: 14px 14px 12px;
  border-radius: 14px;
  background: color-mix(in srgb, var(--foreground) 2.5%, var(--surface));
  box-shadow: 0 1px 0 color-mix(in srgb, var(--border) 80%, transparent);
}
.ai-debrief-card--needs_review {
  background: color-mix(in srgb, var(--foreground) 2.5%, var(--surface));
}
.ai-debrief-card--accepted,
.ai-debrief-card--edited {
  background: color-mix(in srgb, #0d9488 6%, var(--surface));
}
.ai-debrief-card--ignored {
  opacity: 0.62;
  background: color-mix(in srgb, var(--foreground) 4%, var(--surface));
}
.ai-debrief-card__state {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--muted);
}
.ai-debrief-card--accepted .ai-debrief-card__state,
.ai-debrief-card--edited .ai-debrief-card__state {
  color: #0d9488;
}
.ai-debrief-card--ignored .ai-debrief-card__state {
  color: var(--muted);
}
.ai-debrief-card__btn--accepted,
.ai-debrief-card__btn--ignored {
  cursor: default;
  opacity: 0.92;
}
.ai-debrief-card__btn--accepted {
  border-color: color-mix(in srgb, #0d9488 35%, var(--border));
  background: color-mix(in srgb, #0d9488 12%, var(--surface));
  color: #0d9488;
}
.ai-debrief-card__btn--ignored {
  color: var(--muted);
}
.ai-debrief-card__edit {
  margin-top: 10px;
}
.ai-debrief-card__head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}
.ai-debrief-card__title {
  margin: 0;
  font-size: 14px;
  font-weight: 750;
  letter-spacing: -0.01em;
}
.ai-debrief-card__included {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #0d9488;
}
.ai-debrief-card__confidence {
  font-size: 10px;
  font-weight: 700;
  color: var(--muted);
  padding: 2px 7px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--foreground) 5%, var(--surface));
}
.ai-debrief-card__summary {
  margin: 0;
  font-size: 13px;
  line-height: 1.45;
  color: var(--foreground);
}
.ai-debrief-card__hint {
  margin: 8px 0 0;
  font-size: 12px;
  line-height: 1.35;
  color: #b45309;
  font-weight: 600;
}
.ai-debrief-card__quote-toggle {
  margin: 8px 0 0;
  padding: 0;
  border: none;
  background: none;
  font-size: 11px;
  font-weight: 650;
  color: var(--muted);
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 2px;
}
.ai-debrief-card__quote {
  margin: 8px 0 0;
  padding: 0;
  border: none;
  font-size: 12px;
  line-height: 1.45;
  color: var(--muted);
  font-style: normal;
}
.ai-debrief-card__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}
.ai-debrief-card__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 34px;
  padding: 7px 12px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--border) 85%, transparent);
  background: var(--surface);
  font-size: 12px;
  font-weight: 700;
  color: var(--foreground);
  cursor: pointer;
  font-family: inherit;
}
.ai-debrief-card__btn--primary {
  border-color: color-mix(in srgb, var(--brand-600) 35%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 10%, var(--surface));
  color: var(--brand-700);
}
.ai-debrief-card__btn--ghost {
  border-color: transparent;
  background: transparent;
  color: var(--muted);
  padding-left: 0;
  padding-right: 0;
}
.ai-debrief-card__conflict {
  margin: 10px 0 0;
  padding: 10px 12px;
  border-radius: 10px;
  background: color-mix(in srgb, #b45309 6%, var(--surface));
  font-size: 12px;
  line-height: 1.4;
}
.ai-debrief-card__conflict-line {
  margin: 0 0 4px;
}
.ai-debrief-card__conflict-line span {
  font-weight: 700;
}
.ai-debrief-card__conflict-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}
.ai-debrief-card__conflict-actions button {
  font-size: 12px;
  font-weight: 700;
  border: none;
  background: none;
  color: var(--brand-700);
  cursor: pointer;
  padding: 0;
  font-family: inherit;
}
.ai-debrief-followup {
  padding-top: 4px;
}
.ai-debrief-followup-title {
  margin: 0 0 10px;
  font-size: 13px;
  font-weight: 750;
}
.ai-debrief-followup-group + .ai-debrief-followup-group {
  margin-top: 10px;
}
.ai-debrief-followup-k {
  margin: 0 0 6px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--muted);
}
.ai-debrief-followup-group ul {
  margin: 0;
  padding-left: 18px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 13px;
  line-height: 1.4;
}
.ai-debrief-details {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding-top: 6px;
  border-top: 1px solid color-mix(in srgb, var(--border) 70%, transparent);
}
.ai-debrief-details-block {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.ai-debrief-details-k {
  margin: 0;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--muted);
}
.ai-debrief-details-text {
  margin: 0;
  font-size: 13px;
  line-height: 1.45;
  color: var(--muted);
}
.ai-debrief-inline-edit {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.ai-debrief-inline-edit-actions {
  display: flex;
  gap: 8px;
}
.ai-debrief-review-summary,
.ai-debrief-organized {
  margin: 0;
  font-size: 13px;
  line-height: 1.45;
  color: var(--muted);
}
.ai-debrief-organized-k {
  font-weight: 700;
  color: var(--foreground);
}
.ai-debrief-sec-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}
.ai-debrief-sec h4 {
  margin: 0;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--muted);
}
.ai-debrief-btn--ghost {
  border: none;
  background: transparent;
  font-size: 12px;
  font-weight: 700;
  color: var(--brand-700);
  cursor: pointer;
  padding: 4px 0;
}
.ai-debrief-btn--primary {
  font-weight: 700;
  color: var(--brand-700);
}
.ai-debrief-update-list,
.ai-debrief-contact-list,
.ai-debrief-platform-list,
.ai-debrief-pathway-list,
.ai-debrief-unresolved-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.ai-debrief-update {
  padding: 12px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: var(--surface);
}
.ai-debrief-update--high_confidence {
  border-color: color-mix(in srgb, #0d9488 28%, var(--border));
}
.ai-debrief-update--needs_review {
  border-color: color-mix(in srgb, #b45309 28%, var(--border));
}
.ai-debrief-update--ambiguous {
  border-color: color-mix(in srgb, var(--foreground) 12%, var(--border));
}
.ai-debrief-update-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}
.ai-debrief-conf {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  padding: 2px 6px;
  border-radius: 4px;
  background: color-mix(in srgb, var(--foreground) 6%, var(--surface));
}
.ai-debrief-conf--high_confidence {
  color: #0d9488;
  background: color-mix(in srgb, #0d9488 12%, var(--surface));
}
.ai-debrief-conf--needs_review {
  color: #b45309;
  background: color-mix(in srgb, #b45309 12%, var(--surface));
}
.ai-debrief-update-field {
  font-size: 13px;
  font-weight: 700;
}
.ai-debrief-update-scope {
  font-size: 11px;
  font-weight: 700;
  color: var(--muted);
}
.ai-debrief-update-extract,
.ai-debrief-update-value,
.ai-debrief-update-detail {
  margin: 0 0 4px;
  font-size: 13px;
  line-height: 1.4;
}
.ai-debrief-quote {
  margin: 8px 0 0;
  padding: 8px 10px;
  border-left: 3px solid color-mix(in srgb, var(--brand-600) 40%, var(--border));
  font-size: 12px;
  line-height: 1.4;
  color: var(--muted);
  font-style: italic;
}
.ai-debrief-conflicts-banner {
  margin: 0 0 14px;
  padding: 12px 14px;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, #b45309 45%, var(--border));
  background: color-mix(in srgb, #b45309 8%, var(--surface));
}
.ai-debrief-conflicts-banner__title {
  margin: 0 0 4px;
  font-size: 13px;
  font-weight: 800;
  color: #b45309;
}
.ai-debrief-conflicts-banner__hint {
  margin: 0 0 10px;
  font-size: 12px;
  color: var(--muted);
}
.ai-debrief-conflicts-banner__list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.ai-debrief-conflict {
  margin-top: 8px;
  padding: 10px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, #b45309 35%, var(--border));
  font-size: 12px;
}
.ai-debrief-conflicts-banner__list .ai-debrief-conflict {
  margin-top: 0;
}
.ai-debrief-conflict-title {
  margin: 0 0 6px;
  font-weight: 800;
  color: #b45309;
}
.ai-debrief-conflict-actions {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}
.ai-debrief-update-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 10px;
  align-items: center;
}
.ai-debrief-check {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}
.ai-debrief-edit {
  width: 100%;
  margin: 6px 0;
  padding: 8px;
  border-radius: 8px;
  border: 1px solid var(--border);
  font-size: 13px;
  font-family: inherit;
  resize: vertical;
}
.ai-debrief-contact,
.ai-debrief-platform {
  padding: 10px 12px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--foreground) 3%, var(--surface));
  font-size: 13px;
  line-height: 1.4;
}
.ai-debrief-contact-hint {
  margin: 6px 0 0;
  font-size: 11px;
  color: var(--muted);
}
.ai-debrief-next-move {
  margin: 8px 0 0;
  font-size: 13px;
  font-weight: 700;
  color: var(--brand-700);
}
.ai-debrief-contact-sec-hint {
  margin: 0 0 10px;
  font-size: 12px;
  line-height: 1.4;
  color: var(--muted);
  font-weight: 600;
}
.ai-debrief-contact-card-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.ai-debrief-contact-card {
  padding: 12px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: color-mix(in srgb, var(--brand-600) 4%, var(--surface));
}
.ai-debrief-contact-card--embedded {
  padding: 8px 10px;
}
.ai-debrief-contact-card--embedded .ai-debrief-contact-card__head {
  margin-bottom: 0;
}
.ai-debrief-contact-card--embedded .ai-debrief-contact-card__details {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 6px;
  padding-top: 6px;
  border-top: 1px dashed color-mix(in srgb, var(--foreground) 12%, var(--surface));
}
.ai-debrief-contact-card--skipped {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  opacity: 0.75;
}
.ai-debrief-contact-prompt {
  margin: 0 0 8px;
  font-size: 14px;
  font-weight: 700;
  line-height: 1.35;
}
.ai-debrief-contact-card--workflow-participant .ai-debrief-contact-prompt {
  font-size: 16px;
}
.ai-debrief-workflow-participant-label {
  font-weight: 700;
  color: var(--muted);
}
.ai-debrief-workflow-participant-role,
.ai-debrief-workflow-participant-status {
  margin: 0 0 8px;
  font-size: 13px;
  line-height: 1.45;
}
.ai-debrief-workflow-participant-evidence {
  margin: 0 0 8px;
  font-size: 13px;
}
.ai-debrief-workflow-participant-evidence .ai-debrief-quote {
  margin: 4px 0 0;
}
.ai-debrief-contact-meta {
  margin: 0 0 8px;
  font-size: 12px;
  color: var(--muted);
}
.ai-debrief-contact-missing-badge {
  display: inline-block;
  margin-bottom: 10px;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #b45309;
  background: color-mix(in srgb, #b45309 12%, var(--surface));
  border: 1px solid color-mix(in srgb, #b45309 25%, var(--border));
}
.ai-debrief-contact-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.ai-debrief-contact-actions button {
  font-size: 12px;
  font-weight: 700;
  padding: 6px 10px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--surface);
  cursor: pointer;
}
.ai-debrief-contact-actions .ai-debrief-btn--primary {
  background: var(--brand-600);
  color: #fff;
  border-color: var(--brand-600);
}
.ai-debrief-contact-form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin: 10px 0;
}
.ai-debrief-contact-form-grid label,
.ai-debrief-contact-notes-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 11px;
  font-weight: 700;
  color: var(--muted);
}
.ai-debrief-contact-form-grid input,
.ai-debrief-contact-notes-field textarea {
  font-size: 13px;
  padding: 8px;
  border-radius: 8px;
  border: 1px solid var(--border);
}
.ai-debrief-contact-form-hint {
  margin: 0 0 8px;
  font-size: 12px;
  line-height: 1.4;
  color: var(--muted);
}
.ai-debrief-contact-link-hits {
  margin: 8px 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.ai-debrief-contact-link-hits button {
  width: 100%;
  text-align: left;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--surface);
  cursor: pointer;
  font-size: 13px;
}
.ai-debrief-contact-link-sub {
  display: block;
  font-size: 11px;
  color: var(--muted);
  font-weight: 600;
}
.ai-debrief-contact-followups {
  margin: 10px 0 0;
  padding: 0 0 0 18px;
  font-size: 12px;
  line-height: 1.4;
  color: var(--muted);
  font-style: italic;
}
.ai-note-capture-footer-review {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}
.ai-note-capture-footer-review-secondary {
  display: flex;
  gap: 8px;
  width: 100%;
}
.ai-note-capture-footer-review-secondary button {
  flex: 1;
  min-height: 44px;
}
.log-update-review-phi {
  margin-bottom: 12px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, #b45309 40%, var(--border));
  background: color-mix(in srgb, #b45309 10%, var(--surface));
  font-size: 12px;
  line-height: 1.45;
  color: #9a3412;
  font-weight: 650;
}
.log-update-review-phi ul {
  margin: 8px 0 0;
  padding-left: 18px;
}
.log-update-conflict {
  margin: 6px 0 0 28px;
  padding: 10px;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, #b45309 35%, var(--border));
  background: color-mix(in srgb, #b45309 8%, var(--surface));
}
.log-update-conflict-line {
  margin: 0 0 6px;
  font-size: 12px;
  line-height: 1.4;
  color: var(--foreground);
}
.log-update-conflict-kicker {
  font-weight: 800;
  color: #9a3412;
}
.log-update-conflict-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.log-update-conflict-btn {
  flex: 1;
  min-width: 0;
  min-height: 40px;
  padding: 0 10px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--brand-600) 30%, var(--border));
  background: var(--brand-600);
  color: #fff;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
}
.log-update-conflict-btn--secondary {
  background: var(--surface);
  color: var(--foreground);
  border-color: var(--border);
}
.log-update-toast-stack {
  position: fixed;
  left: 50%;
  bottom: calc(72px + env(safe-area-inset-bottom, 0px));
  transform: translateX(-50%);
  z-index: 80;
  pointer-events: none;
}
.log-update-toast {
  padding: 10px 16px;
  border-radius: 10px;
  background: color-mix(in srgb, var(--brand-700, #166534) 92%, #000);
  color: #fff;
  font-size: 14px;
  font-weight: 800;
  box-shadow: 0 4px 16px color-mix(in srgb, #000 18%, transparent);
}
.ai-note-capture-review-group { margin-bottom: 14px; }
.ai-note-capture-review-group-title {
  margin: 0 0 8px;
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--brand-700);
}
.ai-note-capture-suggestion {
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 10px 12px;
  margin-bottom: 8px;
  background: color-mix(in srgb, var(--surface) 96%, var(--foreground) 1%);
}
.ai-note-capture-suggestion--accepted {
  border-color: color-mix(in srgb, var(--brand-600) 40%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 6%, var(--surface));
}
.ai-note-capture-suggestion--ignored { opacity: 0.55; }
.ai-note-capture-suggestion--simple .ai-note-capture-suggestion-placement {
  margin: 0 0 6px;
  font-size: 12px;
  font-weight: 800;
  color: var(--brand-700, var(--brand-600));
  line-height: 1.3;
}
.ai-note-capture-suggestion--simple .ai-note-capture-suggestion-body {
  margin: 0;
  font-size: 14px;
  line-height: 1.45;
  font-weight: 600;
  white-space: pre-wrap;
}
.ai-note-capture-suggestion-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  margin-bottom: 6px;
  font-size: 11px;
}
.ai-note-capture-chip {
  display: inline-flex;
  padding: 2px 8px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--brand-600) 12%, var(--surface));
  font-weight: 750;
  font-size: 10px;
}
.ai-note-capture-confidence { color: var(--muted); font-weight: 650; }
.ai-note-capture-original-toggle {
  margin-top: 6px;
  padding: 0;
  border: none;
  background: none;
  font-size: 11px;
  font-weight: 700;
  color: var(--brand-600);
  cursor: pointer;
  text-decoration: underline;
}
.ai-note-capture-original-text {
  margin: 4px 0 0;
  font-size: 11px;
  color: var(--muted);
  font-style: italic;
  line-height: 1.35;
}
.ai-note-capture-suggestion-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
  align-items: center;
}
.ai-note-capture-suggestion-actions button {
  min-height: 36px;
  padding: 6px 10px;
  font-size: 12px;
}
.ai-note-capture-accept-check {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 700;
  min-height: 36px;
  padding: 0 4px;
}
.ai-note-capture-processing {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 28px 12px;
  color: var(--muted);
  font-size: 13px;
}
.ai-note-capture-spinner {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 3px solid color-mix(in srgb, var(--brand-600) 20%, var(--border));
  border-top-color: var(--brand-600);
  animation: ai-note-capture-spin 0.8s linear infinite;
}
@keyframes ai-note-capture-spin { to { transform: rotate(360deg); } }
@media (min-width: 641px) {
  .ai-note-capture-sheet { align-items: center; justify-content: center; padding: 16px; }
  .ai-note-capture-panel {
    width: min(520px, 100%);
    max-height: min(88vh, 720px);
    border-radius: 14px;
    border: 1px solid var(--border);
  }
}
@media (max-width: 420px) {
  .ai-note-capture-mode-grid { grid-template-columns: 1fr; }
  .ai-note-capture-suggestion-actions button { flex: 1 1 calc(50% - 6px); }
  .ai-note-capture-field-compare { grid-template-columns: 1fr !important; }
}

.ai-note-capture-panel-heading {
  display: grid;
  gap: 2px;
  min-width: 0;
}
.ai-note-capture-panel-subtitle {
  margin: 0;
  font-size: 12px;
  line-height: 1.35;
  font-weight: 500;
  color: var(--muted);
}
.ai-note-capture-panel-close {
  flex: 0 0 auto;
  min-height: 36px;
  padding: 6px 12px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--surface);
  font-size: 12px;
  font-weight: 700;
  font-family: inherit;
  color: var(--foreground);
  cursor: pointer;
}

.log-update-capture {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 0;
}
.log-update-capture-context {
  padding: 7px 10px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--foreground) 3%, var(--surface));
  border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
}
.log-update-capture-context-line {
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.35;
  color: var(--foreground);
}
.log-update-capture-phi-banner {
  margin: 0;
  padding: 0;
  font-size: 11px;
  line-height: 1.4;
  font-weight: 500;
  color: var(--muted);
  background: transparent;
  border: none;
}
.log-update-capture-editor {
  position: relative;
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 140px;
}
.log-update-capture-live-badge {
  position: absolute;
  top: 8px;
  right: 10px;
  margin: 0;
  padding: 2px 7px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--brand-700, var(--brand-600));
  background: color-mix(in srgb, var(--brand-600) 10%, var(--surface));
  border: 1px solid color-mix(in srgb, var(--brand-600) 22%, var(--border));
  pointer-events: none;
}
.log-update-capture-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 10px;
}
.log-update-capture-toolbar-mic {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 36px;
  padding: 0 14px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--brand-600) 28%, var(--border));
  background: var(--surface);
  font-family: inherit;
  font-size: 13px;
  font-weight: 700;
  color: var(--brand-700, var(--brand-600));
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
.log-update-capture-toolbar-mic--active {
  border-color: color-mix(in srgb, var(--brand-600) 45%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 10%, var(--surface));
  color: var(--foreground);
}
.log-update-capture-toolbar-mic--paused {
  border-color: color-mix(in srgb, var(--foreground) 18%, var(--border));
  background: color-mix(in srgb, var(--foreground) 4%, var(--surface));
  color: var(--foreground);
}
.log-update-capture-toolbar-mic:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.log-update-capture-toolbar-status {
  flex: 1 1 120px;
  margin: 0;
  min-width: 0;
  font-size: 12px;
  font-weight: 500;
  line-height: 1.35;
  color: var(--muted);
}
.log-update-capture-toolbar-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-left: auto;
}
.log-update-capture-toolbar-secondary {
  min-height: 34px;
  padding: 0 10px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--surface);
  font-size: 12px;
  font-weight: 600;
  font-family: inherit;
  color: var(--foreground);
  cursor: pointer;
}
.log-update-capture-textarea {
  width: 100%;
  flex: 1 1 auto;
  min-height: 140px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: var(--surface);
  font-size: 15px;
  line-height: 1.45;
  font-family: inherit;
  color: var(--foreground);
  resize: vertical;
  box-sizing: border-box;
}
.log-update-capture-textarea--live {
  border-color: color-mix(in srgb, var(--brand-600) 35%, var(--border));
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--brand-600) 8%, transparent);
}
.log-update-capture-textarea--transcribing {
  color: var(--muted);
}
.log-update-capture-textarea:focus {
  outline: none;
  border-color: color-mix(in srgb, var(--brand-600) 40%, var(--border));
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--brand-600) 10%, transparent);
}
.log-update-capture-more {
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
}
.log-update-capture-more-summary {
  padding: 8px 10px;
  font-size: 12px;
  font-weight: 700;
  color: var(--muted);
  cursor: pointer;
  list-style: none;
}
.log-update-capture-more-summary::-webkit-details-marker {
  display: none;
}
.log-update-capture-more-body {
  padding: 0 10px 10px;
  display: grid;
  gap: 8px;
}
.log-update-capture-more-actions {
  display: flex;
  gap: 8px;
}
.log-update-capture-more-btn {
  flex: 1;
  min-height: 40px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--surface);
  font-size: 12px;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
}
.log-update-capture-more-hint {
  margin: 0;
  font-size: 11px;
  line-height: 1.35;
  color: var(--muted);
}
.log-update-capture-dictation-captured {
  margin: 0;
  font-size: 11px;
  font-weight: 700;
  color: var(--brand-700);
  text-align: center;
}
.log-update-capture-voice-unsupported {
  margin: 0;
  font-size: 12px;
  line-height: 1.4;
  color: var(--muted);
}
.log-update-capture-voice-error {
  margin: 0;
  font-size: 12px;
  color: #b91c1c;
  font-weight: 600;
}

.log-update-capture-footer {
  display: grid;
  gap: 10px;
  width: 100%;
}
.log-update-capture-footer-cancel {
  min-height: 44px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: var(--surface);
  font-size: 14px;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
}
.log-update-capture-footer-primary {
  display: grid;
  gap: 8px;
}
.log-update-capture-footer-phi-ack {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 11px;
  line-height: 1.35;
  font-weight: 600;
  color: var(--muted);
  cursor: pointer;
}
.log-update-capture-footer-phi-ack input {
  margin-top: 2px;
  flex-shrink: 0;
}
.log-update-capture-footer-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.log-update-capture-footer-quick {
  min-height: 48px;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--brand-600) 28%, var(--border));
  background: var(--surface);
  color: var(--brand-700);
  font-size: 14px;
  font-weight: 800;
  font-family: inherit;
  cursor: pointer;
}
.log-update-capture-footer-quick:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.log-update-capture-footer-submit {
  min-height: 48px;
  border-radius: 10px;
  border: none;
  background: var(--brand-600);
  color: #fff;
  font-size: 15px;
  font-weight: 800;
  font-family: inherit;
  cursor: pointer;
}
.log-update-capture-footer-submit:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
@media (max-width: 420px) {
  .log-update-capture-footer-actions {
    grid-template-columns: 1fr;
  }
}

.ai-note-capture-footer:has(.log-update-capture-footer) {
  flex-direction: column;
  align-items: stretch;
}

.log-update-review-summary {
  margin: 0;
  font-size: 14px;
  line-height: 1.45;
  color: var(--text);
}
.intel-scope-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  border: 1px solid var(--border);
  background: var(--surface-2, var(--surface));
  color: var(--muted);
}
.intel-scope-badge--organization {
  border-color: color-mix(in srgb, #0d9488 35%, var(--border));
  color: #0f766e;
  background: color-mix(in srgb, #0d9488 8%, var(--surface));
}
.intel-scope-badge--provider {
  border-color: color-mix(in srgb, var(--brand-600) 35%, var(--border));
  color: var(--brand-700);
  background: color-mix(in srgb, var(--brand-600) 8%, var(--surface));
}
.intel-scope-badge--engagement {
  border-color: color-mix(in srgb, #7c3aed 35%, var(--border));
  color: #6d28d9;
  background: color-mix(in srgb, #7c3aed 8%, var(--surface));
}
.log-update-review-check {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}
.log-update-mapping-meta {
  margin: 6px 0 0;
  display: flex;
  flex-wrap: wrap;
  gap: 6px 10px;
  font-size: 11px;
  color: var(--muted);
}
.log-update-mapping-meta span:first-child {
  font-weight: 700;
  color: var(--brand-700);
}
.log-update-mapping-reason {
  flex: 1 1 100%;
  line-height: 1.35;
}
.log-update-review-gap-priority {
  font-weight: 600;
  color: var(--muted);
}
.log-update-mapping-failed {
  padding: 12px 0;
}
.log-update-mapping-failed-detail {
  margin: 8px 0 0;
  font-size: 12px;
  line-height: 1.4;
  color: #b91c1c;
  font-weight: 600;
}
.log-update-mapping-failed-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

@media (max-width: 640px) {
  .ai-note-capture-sheet {
    justify-content: stretch;
    padding: 0;
  }
  .ai-note-capture-panel {
    width: 100%;
    max-height: 100dvh;
    min-height: 100dvh;
    border-radius: 0;
    border-top: none;
    display: flex;
    flex-direction: column;
  }
  .ai-note-capture-panel--compose {
    max-height: 100dvh;
  }
  .ai-note-capture-panel--compose .ai-note-capture-panel-header {
    flex-shrink: 0;
    padding: 10px 12px 8px;
  }
  .ai-note-capture-panel--compose .ai-note-capture-panel-subtitle {
    font-size: 11px;
  }
  .ai-note-capture-panel--compose .ai-note-capture-panel-body {
    flex: 1 1 auto;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    padding: 10px 12px 8px;
  }
  .ai-note-capture-panel--compose .log-update-capture {
    flex: 1 1 auto;
    min-height: 0;
  }
  .ai-note-capture-panel--compose .log-update-capture-editor {
    flex: 1 1 auto;
    min-height: 0;
  }
  .ai-note-capture-panel--compose .log-update-capture-textarea {
    min-height: 0;
    height: 100%;
    resize: none;
    font-size: 16px;
  }
  .ai-note-capture-panel--compose .log-update-capture-toolbar,
  .ai-note-capture-panel--compose .log-update-capture-phi-banner,
  .ai-note-capture-panel--compose .log-update-capture-more {
    flex-shrink: 0;
  }
  .ai-note-capture-panel--compose .ai-note-capture-footer {
    flex-shrink: 0;
    padding-bottom: calc(10px + env(safe-area-inset-bottom, 0px));
  }
  .ai-debrief-contact-form-grid {
    grid-template-columns: 1fr;
  }
  .ai-debrief-card__btn {
    min-height: 44px;
    padding-top: 10px;
    padding-bottom: 10px;
  }
  .ai-debrief-contact-actions button {
    min-height: 44px;
    padding-top: 10px;
    padding-bottom: 10px;
  }
  .ai-debrief-card__conflict-actions button {
    min-height: 44px;
  }
  .deb-approval-save-check {
    min-height: 44px;
  }
  .log-update-review-check {
    min-height: 44px;
  }
}
.ai-debrief-review--completion-compact {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.ai-debrief-completion-outcome {
  border-left-color: color-mix(in srgb, #16a34a 58%, var(--surface));
  padding: 12px 14px 12px 16px;
  gap: 4px;
}
.ai-debrief-completion-outcome-kicker {
  margin: 0;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted);
}
.ai-debrief-completion-outcome-title {
  margin: 0;
  font-size: 20px;
  line-height: 1.2;
  color: var(--foreground);
}
.ai-debrief-completion-outcome-quote {
  margin: 6px 0 0;
  font-size: 12px;
  line-height: 1.45;
  color: var(--muted);
  font-style: italic;
}
.ai-debrief-completion-record-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.ai-debrief-completion-record-list li {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--surface));
  background: color-mix(in srgb, var(--foreground) 2%, var(--surface));
}
.ai-debrief-completion-record-label {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--muted);
}
.ai-debrief-completion-record-value {
  font-size: 13px;
  line-height: 1.35;
  color: var(--foreground);
}

.ai-note-capture-sheet--review-intelligence {
  justify-content: center;
  align-items: center;
  padding: 24px;
  background:
    radial-gradient(circle at 50% 0%, color-mix(in srgb, var(--brand-600) 16%, transparent), transparent 42%),
    color-mix(in srgb, var(--foreground) 54%, transparent);
  backdrop-filter: blur(10px);
}
.ai-note-capture-panel--review-intelligence {
  width: min(1080px, calc(100vw - 48px));
  max-height: min(88vh, 860px);
  overflow: hidden;
  border-radius: 24px;
  border: 1px solid color-mix(in srgb, var(--foreground) 9%, var(--border));
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--surface) 96%, white 4%) 0%, var(--surface) 36%),
    var(--surface);
  box-shadow:
    0 30px 90px color-mix(in srgb, #020617 30%, transparent),
    0 1px 0 color-mix(in srgb, white 42%, transparent) inset;
}
.ai-note-capture-panel--review-intelligence .ai-note-capture-panel-header {
  padding: 22px 24px 18px;
  border-bottom: 1px solid color-mix(in srgb, var(--foreground) 7%, transparent);
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--foreground) 2.5%, transparent), transparent),
    color-mix(in srgb, var(--surface) 96%, var(--foreground) 1%);
}
.ai-note-capture-panel--review-intelligence .ai-note-capture-panel-heading {
  gap: 5px;
}
.ai-note-capture-panel--review-intelligence .ai-note-capture-panel-title {
  font-size: clamp(22px, 2.1vw, 30px);
  line-height: 1.08;
  font-weight: 820;
  letter-spacing: -0.045em;
}
.ai-note-capture-panel--review-intelligence .ai-note-capture-panel-subtitle {
  max-width: 720px;
  font-size: 13px;
  line-height: 1.55;
  color: color-mix(in srgb, var(--foreground) 58%, var(--muted));
}
.ai-note-capture-panel--review-intelligence .ai-note-capture-panel-close {
  min-height: 34px;
  padding: 0 13px;
  border-radius: 999px;
  border-color: color-mix(in srgb, var(--foreground) 10%, var(--border));
  background: color-mix(in srgb, var(--surface) 92%, var(--foreground) 3%);
  color: color-mix(in srgb, var(--foreground) 70%, var(--muted));
  font-size: 12px;
  font-weight: 760;
  box-shadow: 0 1px 1px color-mix(in srgb, #020617 5%, transparent);
}
.ai-note-capture-panel--review-intelligence .ai-note-capture-panel-close:hover:not(:disabled) {
  background: color-mix(in srgb, var(--foreground) 5%, var(--surface));
  color: var(--foreground);
}
.ai-note-capture-panel-body--review-intelligence {
  padding: 24px;
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--foreground) 1.5%, transparent), transparent 180px),
    color-mix(in srgb, var(--surface) 96%, var(--foreground) 1%);
}
.ai-note-capture-panel-body--review-intelligence .ai-debrief-review--rep-friendly {
  gap: 18px;
}
.ai-note-capture-panel-body--review-intelligence .ai-debrief-summary {
  padding: 16px 18px;
  border-radius: 18px;
  border: 1px solid color-mix(in srgb, var(--brand-600) 14%, var(--border));
  border-left: 1px solid color-mix(in srgb, var(--brand-600) 14%, var(--border));
  background:
    linear-gradient(135deg, color-mix(in srgb, var(--brand-600) 7%, var(--surface)), var(--surface) 62%),
    var(--surface);
  box-shadow: 0 12px 32px color-mix(in srgb, #020617 7%, transparent);
}
.ai-note-capture-panel-body--review-intelligence .ai-debrief-summary__title,
.ai-note-capture-panel-body--review-intelligence .ai-debrief-summary__takeaways-heading,
.ai-note-capture-panel-body--review-intelligence .ai-debrief-review-suggestions__title,
.ai-note-capture-panel-body--review-intelligence .ai-intelligence-brief__heading {
  letter-spacing: 0.095em;
  color: color-mix(in srgb, var(--foreground) 48%, var(--muted));
}
.ai-note-capture-panel-body--review-intelligence .ai-debrief-summary__takeaway {
  font-size: 13px;
  line-height: 1.5;
}
.ai-note-capture-panel-body--review-intelligence .ai-debrief-summary__takeaway-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 999px;
  background: color-mix(in srgb, #10b981 14%, var(--surface));
  color: #047857;
  line-height: 1;
}
.ai-note-capture-panel-body--review-intelligence .ai-debrief-review-suggestions {
  gap: 12px;
}
.ai-note-capture-panel-body--review-intelligence .ai-debrief-review-suggestions__title {
  padding-left: 2px;
  font-size: 11px;
  font-weight: 850;
}
.ai-note-capture-panel-body--review-intelligence .ai-debrief-review-context {
  margin: -4px 0 2px;
  color: color-mix(in srgb, var(--foreground) 54%, var(--muted));
}
.ai-note-capture-panel-body--review-intelligence .ai-intelligence-brief,
.ai-note-capture-panel-body--review-intelligence .ai-intelligence-brief--mission {
  gap: 14px;
}
.ai-note-capture-panel-body--review-intelligence .ai-debrief-review--flat .ai-intelligence-brief__section,
.ai-note-capture-panel-body--review-intelligence .ai-intelligence-brief__section {
  gap: 10px;
  padding: 14px;
  border-radius: 18px;
  border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
  background: color-mix(in srgb, var(--surface) 97%, var(--foreground) 1.5%);
  box-shadow:
    0 1px 0 color-mix(in srgb, white 42%, transparent) inset,
    0 10px 28px color-mix(in srgb, #020617 5%, transparent);
}
.ai-note-capture-panel-body--review-intelligence .ai-intelligence-brief__section--dominant {
  border-left: 1px solid color-mix(in srgb, #0d9488 24%, var(--border));
}
.ai-note-capture-panel-body--review-intelligence .ai-intelligence-brief__section--observation {
  border-color: color-mix(in srgb, #0d9488 22%, var(--border));
  background: linear-gradient(135deg, color-mix(in srgb, #0d9488 7%, var(--surface)), var(--surface) 68%);
}
.ai-note-capture-panel-body--review-intelligence .ai-intelligence-brief__section--follow-up {
  border-color: color-mix(in srgb, #d97706 20%, var(--border));
  background: linear-gradient(135deg, color-mix(in srgb, #d97706 7%, var(--surface)), var(--surface) 68%);
}
.ai-note-capture-panel-body--review-intelligence .ai-intelligence-brief__section-head {
  padding-bottom: 4px;
}
.ai-note-capture-panel-body--review-intelligence .ai-intelligence-brief__section-count {
  min-width: 24px;
  padding: 3px 8px;
  border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
  background: color-mix(in srgb, var(--surface) 88%, var(--foreground) 4%);
  color: color-mix(in srgb, var(--foreground) 62%, var(--muted));
}
.ai-note-capture-panel-body--review-intelligence .ai-debrief-review--flat .ai-intelligence-brief__item,
.ai-note-capture-panel-body--review-intelligence .ai-intelligence-brief__item {
  grid-template-columns: 32px 1fr;
  gap: 10px;
  padding: 12px;
  border: 1px solid color-mix(in srgb, var(--foreground) 7%, transparent);
  border-radius: 14px;
  background: color-mix(in srgb, var(--surface) 96%, white 2%);
}
.ai-note-capture-panel-body--review-intelligence .ai-intelligence-brief__item + .ai-intelligence-brief__item {
  margin-top: 8px;
}
.ai-note-capture-panel-body--review-intelligence .ai-intelligence-brief__item:last-child {
  padding-bottom: 12px;
}
.ai-note-capture-panel-body--review-intelligence .ai-intelligence-brief__item--unchecked {
  opacity: 0.52;
  background: color-mix(in srgb, var(--surface) 95%, var(--foreground) 2%);
}
.ai-note-capture-panel-body--review-intelligence .ai-intelligence-brief__select {
  min-height: 28px;
  min-width: 28px;
  padding-top: 2px;
}
.ai-note-capture-panel-body--review-intelligence .ai-intelligence-brief__checkbox {
  width: 17px;
  height: 17px;
  accent-color: var(--brand-600);
}
.ai-note-capture-panel-body--review-intelligence .ai-intelligence-brief__primary {
  font-size: 14px;
  line-height: 1.45;
  font-weight: 690;
  letter-spacing: -0.01em;
}
.ai-note-capture-panel-body--review-intelligence .ai-intelligence-brief__meta {
  gap: 6px;
}
.ai-note-capture-panel-body--review-intelligence .ai-brief-chip {
  padding: 4px 9px;
  border-radius: 999px;
  border-color: color-mix(in srgb, var(--foreground) 10%, var(--border));
  background: color-mix(in srgb, var(--surface) 88%, var(--foreground) 3%);
  font-size: 11px;
  font-weight: 720;
}
.ai-note-capture-panel-body--review-intelligence .ai-brief-chip__label {
  color: color-mix(in srgb, var(--foreground) 42%, var(--muted));
}
.ai-note-capture-panel-body--review-intelligence .ai-brief-chip--positive {
  border-color: color-mix(in srgb, #10b981 24%, var(--border));
  background: color-mix(in srgb, #10b981 10%, var(--surface));
  color: #047857;
}
.ai-note-capture-panel-body--review-intelligence .ai-brief-chip--caution,
.ai-note-capture-panel-body--review-intelligence .ai-brief-chip--priority-medium {
  border-color: color-mix(in srgb, #f59e0b 24%, var(--border));
  background: color-mix(in srgb, #f59e0b 10%, var(--surface));
  color: #92400e;
}
.ai-note-capture-panel-body--review-intelligence .ai-intelligence-brief__expand {
  padding: 5px 9px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--foreground) 4%, transparent);
  color: color-mix(in srgb, var(--foreground) 58%, var(--muted));
  font-size: 11px;
  font-weight: 760;
}
.ai-note-capture-panel-body--review-intelligence .ai-intelligence-brief__expand:hover:not(:disabled) {
  background: color-mix(in srgb, var(--foreground) 7%, transparent);
  text-decoration: none;
}
.ai-note-capture-panel-body--review-intelligence .ai-intelligence-brief__details-panel,
.ai-note-capture-panel-body--review-intelligence .log-update-review-raw-debrief {
  border-color: color-mix(in srgb, var(--foreground) 9%, var(--border));
}
.ai-note-capture-footer--review-intelligence {
  padding: 14px 24px calc(14px + env(safe-area-inset-bottom, 0px));
  border-top: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
  background: color-mix(in srgb, var(--surface) 94%, var(--foreground) 2%);
  box-shadow: 0 -16px 36px color-mix(in srgb, #020617 7%, transparent);
}
.ai-note-capture-footer--review-intelligence .ai-note-capture-footer-review {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 12px;
}
.ai-note-capture-footer--review-intelligence .log-update-review-footer-hint {
  margin: 0;
  font-size: 12px;
  line-height: 1.45;
  color: color-mix(in srgb, var(--foreground) 54%, var(--muted));
}
.ai-note-capture-footer--review-intelligence .ai-note-capture-footer-save {
  width: auto;
  min-width: 190px;
  min-height: 42px;
  border-radius: 999px !important;
  border: 1px solid color-mix(in srgb, var(--brand-600) 52%, #020617) !important;
  background: linear-gradient(180deg, color-mix(in srgb, var(--brand-600) 94%, white 6%), var(--brand-600)) !important;
  font-size: 13px !important;
  font-weight: 820 !important;
  box-shadow:
    0 10px 24px color-mix(in srgb, var(--brand-600) 24%, transparent),
    0 1px 0 color-mix(in srgb, white 35%, transparent) inset !important;
}
.ai-note-capture-footer--review-intelligence .ai-note-capture-footer-save:disabled {
  opacity: 0.48;
  box-shadow: none !important;
}
.ai-note-capture-footer--review-intelligence .ai-note-capture-footer-review-secondary {
  width: auto;
}
.ai-note-capture-footer--review-intelligence .ai-note-capture-footer-review-secondary button {
  min-width: 92px;
  min-height: 42px;
  border-radius: 999px !important;
  border-color: color-mix(in srgb, var(--foreground) 10%, var(--border)) !important;
  background: var(--surface) !important;
  color: color-mix(in srgb, var(--foreground) 70%, var(--muted)) !important;
  font-size: 13px !important;
  font-weight: 760 !important;
}
@media (max-width: 760px) {
  .ai-note-capture-sheet--review-intelligence {
    justify-content: flex-end;
    align-items: stretch;
    padding: 0;
  }
  .ai-note-capture-panel--review-intelligence {
    width: 100%;
    max-height: 100dvh;
    min-height: 100dvh;
    border-radius: 0;
  }
  .ai-note-capture-panel--review-intelligence .ai-note-capture-panel-header {
    padding: 16px 16px 12px;
  }
  .ai-note-capture-panel-body--review-intelligence {
    padding: 16px;
  }
  .ai-note-capture-footer--review-intelligence {
    padding: 12px 16px calc(12px + env(safe-area-inset-bottom, 0px));
  }
  .ai-note-capture-footer--review-intelligence .ai-note-capture-footer-review {
    grid-template-columns: 1fr;
  }
  .ai-note-capture-footer--review-intelligence .ai-note-capture-footer-save,
  .ai-note-capture-footer--review-intelligence .ai-note-capture-footer-review-secondary button {
    width: 100%;
  }
}
`;
