export const providerGuidedIntelCaptureCss = `
.provider-guided-intel-launch {
  margin-bottom: 10px;
}

.provider-guided-intel-launch-card {
  display: grid;
  gap: 6px;
  padding: 8px 10px;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--brand-600) 28%, var(--border));
  background: linear-gradient(
    145deg,
    color-mix(in srgb, var(--brand-600) 10%, var(--surface)) 0%,
    var(--surface) 70%
  );
}

.provider-guided-intel-launch-head {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 6px;
}

.provider-guided-intel-launch-titles {
  display: grid;
  gap: 2px;
}

.provider-guided-intel-launch-eyebrow {
  margin: 0;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted);
}

.provider-guided-intel-launch-title {
  margin: 0;
  font-size: 15px;
  font-weight: 800;
  line-height: 1.25;
}

.provider-guided-intel-launch-sub {
  margin: 0;
  font-size: 12px;
  line-height: 1.35;
  color: var(--muted);
}

.provider-guided-intel-launch-meta {
  font-size: 10px;
  font-weight: 700;
  color: var(--muted);
  white-space: nowrap;
}

.provider-guided-intel-launch-btn {
  width: 100%;
  padding: 10px 12px;
  border-radius: 8px;
  border: none;
  background: var(--brand-600, #2563eb);
  color: #fff;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
}

.provider-guided-intel-launch-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.provider-guided-intel-path {
  display: grid;
  gap: 4px;
}

.provider-guided-intel-path-label {
  margin: 0;
  font-size: 11px;
  font-weight: 700;
  line-height: 1.3;
}

.provider-guided-intel-path-hint {
  margin: 0;
  font-size: 11px;
  line-height: 1.35;
  color: var(--muted);
}

.provider-guided-intel-path-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.provider-guided-intel-path-chip {
  padding: 4px 8px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: var(--surface);
  font-size: 10px;
  font-weight: 700;
  cursor: pointer;
}

.provider-guided-intel-path-chip--active {
  border-color: color-mix(in srgb, var(--brand-600) 50%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 12%, var(--surface));
  color: var(--brand-700, var(--brand-600));
}

/* —— Rapid Discovery session —— */

.provider-guided-intel-overlay {
  position: fixed;
  inset: 0;
  z-index: 85;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 0;
  background: color-mix(in srgb, #0f172a 55%, transparent);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.provider-guided-intel-shell {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  width: min(640px, 95vw);
  max-width: 640px;
  height: min(100dvh, 100%);
  max-height: 100dvh;
  margin: 0 auto;
  overflow: hidden;
  background: #fff;
  background: var(--surface, #ffffff);
  box-shadow: 0 24px 64px color-mix(in srgb, #0f172a 28%, transparent);
  isolation: isolate;
}

.provider-guided-intel-top {
  padding: 14px 16px 12px;
  border-bottom: 1px solid color-mix(in srgb, var(--border) 80%, transparent);
  display: grid;
  gap: 10px;
  flex-shrink: 0;
  background: var(--surface, #ffffff);
}

.provider-guided-intel-top-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.provider-guided-intel-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  letter-spacing: -0.01em;
  line-height: 1.25;
  color: var(--foreground);
}

.provider-guided-intel-close {
  width: 30px;
  height: 30px;
  flex-shrink: 0;
  border-radius: 6px;
  border: 1px solid var(--border);
  background: var(--surface);
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
  color: var(--muted);
}

.provider-guided-intel-progress-block {
  display: grid;
  gap: 8px;
}

.provider-guided-intel-progress-question {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: color-mix(in srgb, var(--foreground) 72%, var(--muted));
}

.provider-guided-intel-progress-track {
  height: 4px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--foreground) 8%, transparent);
  overflow: hidden;
}

.provider-guided-intel-progress-fill {
  display: block;
  height: 100%;
  background: var(--brand-600, #2563eb);
  transition: width 0.2s ease;
}

.provider-guided-intel-progress-remaining,
.provider-guided-intel-progress-map {
  display: none;
}

.provider-guided-intel-progress-track--pulse .provider-guided-intel-progress-fill {
  animation: guided-intel-progress-pulse 0.45s ease;
}

@keyframes guided-intel-progress-pulse {
  0% { filter: brightness(1); }
  40% { filter: brightness(1.15); }
  100% { filter: brightness(1); }
}

.provider-guided-intel-scope-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  max-width: 100%;
}

.provider-guided-intel-scope-chip {
  padding: 5px 10px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--border) 85%, transparent);
  background: var(--surface, #fff);
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  color: color-mix(in srgb, var(--foreground) 70%, var(--muted));
}

.provider-guided-intel-scope-chip--active {
  border-color: color-mix(in srgb, var(--brand-600) 45%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 10%, var(--surface));
  color: var(--brand-700, var(--brand-600));
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--brand-600) 18%, transparent);
}

.provider-guided-intel-progress-label {
  margin: 0;
  font-size: 11px;
  font-weight: 600;
  color: var(--muted);
}

.provider-guided-intel-exit-stats {
  margin: 0 0 10px;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 6px;
}

.provider-guided-intel-exit-stats li {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  line-height: 1.35;
}

.intel-save-confirmation {
  display: grid;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--brand-600) 22%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 5%, var(--surface));
}

.provider-guided-intel-save-confirmation {
  margin-bottom: 4px;
}

.provider-guided-intel-save-confirmation--inline {
  margin-bottom: 8px;
}

.intel-save-confirmation-title {
  margin: 0;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--muted);
}

.intel-save-confirmation-group {
  display: grid;
  gap: 4px;
}

.intel-save-confirmation-heading {
  margin: 0 0 4px;
  font-size: 13px;
  font-weight: 800;
  line-height: 1.3;
  color: var(--foreground);
}

.intel-save-confirmation-list {
  margin: 0;
  padding: 0 0 0 16px;
  display: grid;
  gap: 3px;
}

.intel-save-confirmation-list li {
  font-size: 13px;
  line-height: 1.35;
  font-weight: 600;
}

.provider-guided-intel-done-for-now {
  width: 100%;
  margin-top: 4px;
  padding: 8px 10px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--muted);
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.provider-guided-intel-done-for-now:hover:not(:disabled) {
  color: var(--foreground);
}

.provider-guided-intel-done-for-now:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.provider-guided-intel-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  flex: 1;
  background: var(--surface, #ffffff);
}

.provider-guided-intel-question-zone {
  display: flex;
  flex-direction: column;
  gap: 14px;
  flex: 1;
  min-height: 0;
}

.provider-guided-intel-impact {
  display: grid;
  gap: 2px;
  padding: 6px 8px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, #16a34a 35%, var(--border));
  background: color-mix(in srgb, #16a34a 8%, var(--surface));
  animation: guided-intel-impact-in 0.28s ease;
}

.provider-guided-intel-impact--summary {
  margin-bottom: 4px;
}

@keyframes guided-intel-impact-in {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}

.provider-guided-intel-impact-line {
  font-size: 12px;
  font-weight: 800;
  line-height: 1.3;
  color: color-mix(in srgb, #15803d 85%, var(--foreground));
}

.provider-guided-intel-impact-detail {
  font-size: 11px;
  line-height: 1.35;
  color: var(--muted);
}

.provider-guided-intel-question-head {
  display: none;
}

.provider-guided-intel-shell .provider-guided-intel-dest-chip {
  display: none;
}

.provider-guided-intel-chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}

.provider-guided-intel-context-chip,
.provider-guided-intel-audience-category-chip {
  align-self: flex-start;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  padding: 3px 8px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--brand-600) 28%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 8%, var(--surface));
  color: color-mix(in srgb, var(--foreground) 82%, transparent);
}

.provider-guided-intel-audience-category-chip {
  border-color: color-mix(in srgb, var(--accent-600, var(--brand-600)) 35%, var(--border));
  background: color-mix(in srgb, var(--accent-600, var(--brand-600)) 10%, var(--surface));
}

.provider-guided-intel-field-chip {
  font-size: 10px;
  font-weight: 700;
  color: var(--muted);
}

.provider-guided-intel-prompt {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  line-height: 1.35;
  letter-spacing: -0.02em;
  color: var(--foreground);
}

.provider-guided-intel-inherited {
  display: grid;
  gap: 6px;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, #0d9488 32%, var(--border));
  background: color-mix(in srgb, #0d9488 8%, var(--surface));
}

.provider-guided-intel-inherited-line {
  margin: 0;
  font-size: 13px;
  font-weight: 800;
  line-height: 1.3;
}

.provider-guided-intel-inherited-hint {
  margin: 0 0 4px;
  font-size: 11px;
  line-height: 1.35;
  color: var(--muted);
}

.provider-guided-intel-inherited-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.provider-guided-intel-inherited-btn {
  flex: 1 1 auto;
  min-width: 0;
  padding: 7px 8px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--surface);
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
}

.provider-guided-intel-inherited-btn--primary {
  background: var(--brand-600, #2563eb);
  border-color: var(--brand-600, #2563eb);
  color: #fff;
}

.provider-guided-intel-control {
  min-height: 0;
  max-width: 100%;
  overflow-x: hidden;
}

.provider-guided-intel-secondary-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 8px;
  justify-content: center;
}

.provider-guided-intel-stance {
  margin: 0;
  padding: 6px 10px;
  border: none;
  border-radius: 6px;
  background: transparent;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  color: color-mix(in srgb, var(--foreground) 62%, var(--muted));
  text-decoration: underline;
  text-underline-offset: 2px;
  text-decoration-color: color-mix(in srgb, var(--muted) 50%, transparent);
}

.provider-guided-intel-stance:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.provider-guided-intel-stance:not(:disabled):hover {
  color: var(--foreground);
}

.provider-guided-intel-error {
  margin: 0;
  font-size: 11px;
  line-height: 1.35;
  color: #b91c1c;
}

.provider-guided-intel-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px 16px calc(12px + env(safe-area-inset-bottom, 0px));
  border-top: 1px solid color-mix(in srgb, var(--border) 80%, transparent);
  background: var(--surface, #ffffff);
  flex-shrink: 0;
}

.provider-guided-intel-action {
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--border) 85%, transparent);
  background: var(--surface, #fff);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.provider-guided-intel-action--primary {
  width: 100%;
  padding: 12px 16px;
  border-radius: 10px;
  border: none;
  background: var(--brand-600, #2563eb);
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  box-shadow: 0 1px 2px color-mix(in srgb, var(--brand-600) 35%, transparent);
}

.provider-guided-intel-action--primary:disabled {
  opacity: 0.5;
}

.provider-guided-intel-action:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

/* Rapid field controls (scoped to guided capture) */

.provider-guided-intel-shell .provider-intel-field--rapid,
.provider-guided-intel-shell .provider-intel-structured--rapid {
  display: grid;
  gap: 6px;
}

.provider-guided-intel-shell .provider-intel-segmented--rapid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  max-width: 100%;
}

.provider-guided-intel-shell .provider-discovery-confidence-btn--rapid {
  flex: 0 1 auto;
  min-width: 0;
  padding: 6px 10px;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.2;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--foreground) 12%, var(--border));
  background: var(--surface);
  transition: border-color 0.12s ease, background 0.12s ease, color 0.12s ease;
}

.provider-guided-intel-shell .provider-discovery-confidence-btn--rapid.provider-discovery-confidence-btn--active {
  border-color: color-mix(in srgb, var(--brand-600) 55%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 16%, var(--surface));
  color: var(--brand-700, var(--brand-600));
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--brand-600) 28%, transparent);
}

.provider-guided-intel-shell .provider-discovery-tags--rapid {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.provider-guided-intel-shell .provider-discovery-tag--rapid {
  padding: 6px 10px;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.2;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--foreground) 12%, var(--border));
  background: var(--surface);
  transition: border-color 0.12s ease, background 0.12s ease, color 0.12s ease;
}

.provider-guided-intel-shell .provider-discovery-tag--rapid.provider-discovery-tag--on {
  border-color: color-mix(in srgb, var(--brand-600) 55%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 16%, var(--surface));
  color: var(--brand-700, var(--brand-600));
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--brand-600) 28%, transparent);
}

.provider-guided-intel-shell .provider-intel-notes-input--rapid,
.provider-guided-intel-shell .provider-intel-compact-input--rapid {
  width: 100%;
  min-height: 0;
  padding: 6px 8px;
  font-size: 12px;
  line-height: 1.35;
  border-radius: 8px;
  border: 1px solid var(--border);
  resize: none;
}

.provider-guided-intel-shell .provider-intel-select--rapid {
  width: 100%;
  padding: 6px 8px;
  font-size: 12px;
  border-radius: 8px;
}

.provider-guided-intel-shell .provider-intel-note-collapse {
  display: grid;
  gap: 4px;
}

.provider-guided-intel-shell .provider-intel-note-collapse-toggle {
  justify-self: start;
  padding: 0;
  border: none;
  background: none;
  font-size: 11px;
  font-weight: 600;
  color: var(--brand-600, #2563eb);
  text-decoration: underline;
  text-underline-offset: 2px;
  cursor: pointer;
}

.provider-guided-intel-shell .provider-intel-legacy-hint {
  margin: 0;
  font-size: 10px;
  line-height: 1.35;
  color: var(--muted);
}

.provider-guided-intel-summary {
  padding: 12px;
  display: grid;
  gap: 10px;
  overflow-y: auto;
  min-height: 0;
}

.provider-guided-intel-summary h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 800;
}

.provider-guided-intel-summary-block {
  display: grid;
  gap: 4px;
}

.provider-guided-intel-summary-kicker {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--muted);
}

.provider-guided-intel-summary-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 4px;
  font-size: 12px;
  line-height: 1.4;
}

.provider-guided-intel-why-panel {
  font-size: 12px;
  line-height: 1.4;
  color: var(--muted);
  margin: 0;
}

/* ~400px QA: one question fits without scrolling the question pane */
@media (max-width: 420px) {
  .provider-guided-intel-top {
    padding: 6px 10px 4px;
  }
  .provider-guided-intel-progress-question {
    font-size: 11px;
  }
  .provider-guided-intel-prompt {
    font-size: 14px;
    line-height: 1.22;
  }
  .provider-guided-intel-progress-remaining {
    font-size: 12px;
  }
  .provider-guided-intel-body {
    padding: 8px 10px 4px;
    gap: 6px;
  }
  .provider-guided-intel-actions {
    gap: 5px;
    padding: 6px 10px calc(6px + env(safe-area-inset-bottom, 0px));
  }
.provider-guided-intel-shell .provider-discovery-confidence-btn--rapid,
.provider-guided-intel-shell .provider-discovery-tag--rapid {
  padding: 8px 12px;
  font-size: 13px;
}
  .provider-guided-intel-path-chips {
    gap: 3px;
  }
  .provider-guided-intel-path-chip {
    font-size: 9px;
    padding: 3px 6px;
  }
}

@media (min-width: 641px) {
  .provider-guided-intel-overlay {
    align-items: center;
    padding: 24px;
  }

  .provider-guided-intel-shell {
    height: min(88dvh, 720px);
    max-height: 88dvh;
    border-radius: 14px;
    border: 1px solid color-mix(in srgb, var(--border) 70%, transparent);
  }
}

@media (max-width: 640px) {
  .provider-guided-intel-shell {
    width: 100%;
    max-width: 100%;
    border-radius: 14px 14px 0 0;
  }
}

.provider-guided-intel-section-kicker {
  margin: 0 0 6px;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted);
}

.rd-operational {
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px dashed color-mix(in srgb, var(--border) 70%, transparent);
}

.rd-operational-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.rd-operational-chip {
  min-height: 32px;
  padding: 0 10px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: var(--surface);
  font-size: 11px;
  font-weight: 700;
  color: var(--foreground);
  cursor: pointer;
}

.rd-operational-chip--active {
  border-color: color-mix(in srgb, var(--brand-600) 45%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 10%, var(--surface));
  color: var(--brand-700, var(--brand-600));
}

.rd-pathway-impact {
  margin-top: 10px;
  padding: 8px 10px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--brand-600) 5%, var(--surface));
  border: 1px solid color-mix(in srgb, var(--brand-600) 14%, var(--border));
}

.rd-pathway-impact-list {
  margin: 0;
  padding: 0 0 0 16px;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.4;
  color: var(--foreground);
}

.rd-pathway-req {
  margin: 6px 0 0;
  font-size: 11px;
  font-weight: 600;
  color: var(--muted);
}

.provider-guided-intel-impact-status {
  display: block;
  margin-top: 2px;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--brand-600);
}

.rd-support {
  margin-top: 10px;
  border: 1px solid color-mix(in srgb, var(--border) 80%, transparent);
  border-radius: 10px;
  overflow: hidden;
}

.rd-support-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 10px;
  border: none;
  background: color-mix(in srgb, var(--brand-600) 4%, var(--surface));
  text-align: left;
  cursor: pointer;
}

.rd-support-toggle-label {
  font-size: 12px;
  font-weight: 800;
  color: var(--foreground);
}

.rd-support-toggle-hint {
  flex: 1;
  font-size: 11px;
  font-weight: 600;
  color: var(--muted);
}

.rd-support-toggle-chevron {
  font-size: 14px;
  font-weight: 700;
  color: var(--muted);
}

.rd-support-body {
  padding: 8px 10px 10px;
  display: grid;
  gap: 8px;
}

.rd-support-mode {
  display: flex;
  gap: 6px;
}

.rd-support-mode-btn {
  flex: 1;
  min-height: 30px;
  border-radius: 6px;
  border: 1px solid var(--border);
  background: var(--surface);
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
}

.rd-support-mode-btn--active {
  border-color: color-mix(in srgb, var(--brand-600) 40%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 8%, var(--surface));
}

.rd-support-input {
  width: 100%;
  min-height: 34px;
  padding: 6px 8px;
  border-radius: 6px;
  border: 1px solid var(--border);
  font-size: 13px;
}

.rd-support-textarea {
  min-height: 56px;
  resize: vertical;
}

.rd-support-pick-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 4px;
  max-height: 140px;
  overflow-y: auto;
}

.rd-support-pick {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  width: 100%;
  padding: 6px 8px;
  border-radius: 6px;
  border: 1px solid var(--border);
  background: var(--surface);
  text-align: left;
  cursor: pointer;
}

.rd-support-pick--selected {
  border-color: color-mix(in srgb, var(--brand-600) 45%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 8%, var(--surface));
}

.rd-support-pick-name {
  font-size: 12px;
  font-weight: 700;
}

.rd-support-pick-meta {
  font-size: 10px;
  font-weight: 600;
  color: var(--muted);
}

.rd-support-create-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.rd-support-field {
  display: grid;
  gap: 3px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--muted);
}

.rd-support-field--full {
  grid-column: 1 / -1;
}

.rd-support-empty,
.rd-support-footnote {
  margin: 0;
  font-size: 11px;
  font-weight: 600;
  color: var(--muted);
}

@media (max-width: 640px) {
  .provider-guided-intel-close {
    width: 44px;
    height: 44px;
    min-width: 44px;
    min-height: 44px;
  }

  .rd-support-create-grid {
    grid-template-columns: 1fr;
  }

  .rd-support-mode-btn {
    min-height: 44px;
  }

  .provider-guided-intel-action {
    min-height: 44px;
  }

  .provider-guided-intel-inherited-btn {
    min-height: 44px;
  }

  .rd-operational-chip {
    min-height: 44px;
    padding-top: 0;
    padding-bottom: 0;
  }
}
`;
