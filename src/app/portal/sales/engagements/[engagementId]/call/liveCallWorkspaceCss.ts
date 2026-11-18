/** Active engagement execution workspace — visually distinct from prepare (light) mode. */
export const liveCallWorkspaceCss = `
.live-call-page {
  --live-call-bg: #0c1222;
  --live-call-surface: #151d2e;
  --live-call-surface-raised: #1c2640;
  --live-call-text: #f1f5f9;
  --live-call-muted: #94a3b8;
  --live-call-accent: #38bdf8;
  --live-call-success: #34d399;
  --live-call-warning: #fbbf24;
  --live-call-danger: #f87171;
  --live-call-pad-x: clamp(14px, 4vw, 20px);
  --live-call-footer-h: calc(24px + env(safe-area-inset-bottom, 0px));
  min-height: 100dvh;
  background: radial-gradient(120% 80% at 50% -20%, #1a2744 0%, var(--live-call-bg) 55%);
  color: var(--live-call-text);
}

.live-call-page--loading,
.live-call-page--error {
  padding: 24px var(--live-call-pad-x);
}

.live-call-page__alert {
  margin: 0 0 12px;
  padding: 12px 14px;
  border-radius: 10px;
  background: color-mix(in srgb, var(--live-call-danger) 18%, var(--live-call-surface));
  color: #fecaca;
  font-size: 13px;
  font-weight: 600;
}

.live-call-workspace {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 640px;
  margin: 0 auto;
  padding: 12px var(--live-call-pad-x) calc(16px + env(safe-area-inset-bottom, 0px));
}

.live-call-workspace__header {
  padding: 8px 0 4px;
}

.live-call-workspace__bar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.live-call-workspace__back {
  font-size: 13px;
  font-weight: 700;
  color: var(--live-call-meta, #64748b);
  text-decoration: none;
  white-space: nowrap;
}

.live-call-workspace__back:hover {
  color: var(--live-call-ink, #0b1220);
}

.live-call-workspace__kicker {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--live-call-accent);
}

.live-call-workspace__provider {
  margin: 0;
  font-size: clamp(26px, 6vw, 32px);
  font-weight: 900;
  line-height: 1.1;
  letter-spacing: -0.03em;
}

.live-call-workspace__type {
  display: inline-flex;
  margin-top: 10px;
  padding: 5px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--live-call-text);
  background: var(--live-call-surface-raised);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.live-call-workspace__card {
  background: var(--live-call-surface);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: clamp(16px, 3.5vw, 20px);
}

.live-call-workspace__card--goal {
  border-left: 3px solid color-mix(in srgb, var(--live-call-accent) 70%, transparent);
}

.live-call-workspace__card--evidence,
.live-call-workspace__card--followups,
.live-call-workspace__card--opportunity {
  border-left: 3px solid color-mix(in srgb, var(--live-call-muted) 35%, transparent);
}

.live-call-workspace__evidence-list,
.live-call-workspace__followup-list,
.live-call-workspace__opportunity-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.live-call-workspace__evidence-item,
.live-call-workspace__followup-item,
.live-call-workspace__opportunity-item {
  position: relative;
  padding-left: 16px;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.45;
  color: var(--live-call-text);
}

.live-call-workspace__evidence-item::before,
.live-call-workspace__opportunity-item::before {
  content: "•";
  position: absolute;
  left: 0;
  color: var(--live-call-accent);
  font-weight: 900;
}

.live-call-workspace__followup-list {
  counter-reset: debrief-followup;
}

.live-call-workspace__followup-item {
  counter-increment: debrief-followup;
  padding: 10px 12px 10px 14px;
  border-radius: 10px;
  background: var(--live-call-surface-raised);
}

.live-call-workspace__followup-item::before {
  content: counter(debrief-followup) ".";
  position: absolute;
  left: 0;
  top: 10px;
  font-size: 12px;
  font-weight: 900;
  color: var(--live-call-muted);
}

.live-call-workspace__opportunity-headline {
  margin: 0 0 10px;
  font-size: 15px;
  font-weight: 700;
  line-height: 1.4;
  color: var(--live-call-text);
}

.live-call-workspace--provider-debrief .live-call-workspace__kicker {
  color: #a5b4fc;
}

.live-call-workspace--provider-debrief-exec {
  gap: 10px;
}

.live-call-workspace--provider-debrief-exec .live-call-workspace__card {
  padding: 12px 14px;
}

.live-call-workspace__header--provider-debrief .live-call-workspace__org {
  margin: 2px 0 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--live-call-muted);
}

.live-call-workspace--provider-debrief-exec .live-call-workspace__card--hero {
  border-color: color-mix(in srgb, var(--live-call-accent) 42%, transparent);
  background: linear-gradient(
    165deg,
    color-mix(in srgb, var(--live-call-accent) 14%, var(--live-call-surface)) 0%,
    var(--live-call-surface) 100%
  );
}

.live-call-workspace__mission-note {
  margin: 6px 0 0;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.4;
  color: var(--live-call-muted);
}

.live-call-workspace__followup-list--compact {
  margin: 8px 0 0;
  gap: 6px;
}

.live-call-workspace__followup-list--compact .live-call-workspace__followup-item {
  padding: 6px 10px 6px 14px;
  font-size: 13px;
}

.live-call-workspace__validation-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.live-call-workspace__validation-item {
  font-size: 13px;
  font-weight: 600;
  line-height: 1.4;
  color: var(--live-call-text);
}

.live-call-workspace__opportunity-ask {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  line-height: 1.4;
  color: var(--live-call-text);
}

.live-call-workspace__desired-outcome {
  margin: 0 0 10px;
  font-size: 14px;
  font-weight: 700;
  line-height: 1.4;
  color: var(--live-call-text);
}

.live-call-workspace__card--primary {
  border-color: color-mix(in srgb, var(--live-call-accent) 40%, transparent);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--live-call-accent) 15%, transparent),
    0 8px 24px rgba(0, 0, 0, 0.25);
  background: linear-gradient(
    165deg,
    color-mix(in srgb, var(--live-call-accent) 12%, var(--live-call-surface)) 0%,
    var(--live-call-surface) 100%
  );
}

.live-call-workspace__label {
  margin: 0 0 10px;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--live-call-muted);
}

.live-call-workspace__goal {
  margin: 0;
  font-size: clamp(17px, 4vw, 20px);
  font-weight: 700;
  line-height: 1.4;
}

.live-call-workspace__primary {
  margin: 0;
  font-size: clamp(20px, 4.5vw, 24px);
  font-weight: 800;
  line-height: 1.35;
  letter-spacing: -0.02em;
}

.live-call-workspace__secondary {
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  background: var(--live-call-surface);
  overflow: hidden;
}

.live-call-workspace__secondary-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 14px 16px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 800;
  list-style: none;
  color: var(--live-call-text);
}

.live-call-workspace__secondary-summary::-webkit-details-marker {
  display: none;
}

.live-call-workspace__secondary-summary::after {
  content: "▾";
  font-size: 12px;
  color: var(--live-call-muted);
  transition: transform 0.15s ease;
}

.live-call-workspace__secondary[open] > .live-call-workspace__secondary-summary::after {
  transform: rotate(180deg);
}

.live-call-workspace__secondary-count {
  font-size: 11px;
  font-weight: 800;
  color: var(--live-call-muted);
  background: rgba(255, 255, 255, 0.08);
  border-radius: 999px;
  padding: 2px 8px;
}

.live-call-workspace__secondary-list {
  margin: 0;
  padding: 0 16px 14px 16px;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.live-call-workspace__secondary-item {
  padding: 10px 12px;
  border-radius: 10px;
  background: var(--live-call-surface-raised);
  font-size: 14px;
  font-weight: 600;
  line-height: 1.4;
}

.live-call-workspace__secondary-empty {
  margin: 0;
  padding: 0 16px 14px;
  font-size: 13px;
  color: var(--live-call-muted);
}

.live-call-workspace__notes-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 10px;
}

.live-call-workspace__notes-status {
  font-size: 11px;
  font-weight: 700;
  color: var(--live-call-muted);
}

.live-call-workspace__notes {
  width: 100%;
  min-height: 112px;
  max-height: 200px;
  padding: 14px 16px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: var(--live-call-surface-raised);
  color: var(--live-call-text);
  font-size: 16px;
  font-weight: 500;
  line-height: 1.5;
  resize: vertical;
  font-family: inherit;
}

.live-call-workspace__notes::placeholder {
  color: color-mix(in srgb, var(--live-call-muted) 80%, transparent);
}

.live-call-workspace__notes:focus {
  outline: none;
  border-color: color-mix(in srgb, var(--live-call-accent) 55%, transparent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--live-call-accent) 18%, transparent);
}

.live-call-workspace__notes:disabled {
  opacity: 0.65;
}

/* Outcome + End Engagement — single decision unit (scrolls with page) */
.live-call-workspace__card--decision {
  border-color: color-mix(in srgb, var(--live-call-accent) 35%, rgba(255, 255, 255, 0.1));
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--live-call-accent) 12%, transparent);
}

.live-call-workspace__decision-title {
  margin: 0 0 12px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--live-call-muted);
}

.live-call-workspace__decision-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.live-call-workspace__decision-panel--intro {
  padding-top: 4px;
}

.live-call-workspace__intro-debrief-hint {
  margin: 0;
  font-size: 14px;
  line-height: 1.45;
  color: var(--live-call-muted);
}

.live-call-workspace__outcome-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.live-call-workspace__outcome-option {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  min-height: 48px;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: var(--live-call-surface-raised);
  color: var(--live-call-text);
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.12s ease, border-color 0.12s ease, box-shadow 0.12s ease;
}

.live-call-workspace__outcome-radio {
  width: 18px;
  height: 18px;
  margin: 0;
  flex-shrink: 0;
  accent-color: var(--live-call-accent);
}

.live-call-workspace__outcome-option-label {
  flex: 1;
  text-align: left;
}

.live-call-workspace__outcome-option--selected {
  border-color: color-mix(in srgb, var(--live-call-accent) 55%, transparent);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--live-call-accent) 35%, transparent);
}

.live-call-workspace__outcome-option--success {
  border-color: color-mix(in srgb, var(--live-call-success) 35%, transparent);
}

.live-call-workspace__outcome-option--success.live-call-workspace__outcome-option--selected {
  border-color: color-mix(in srgb, var(--live-call-success) 55%, transparent);
  background: color-mix(in srgb, var(--live-call-success) 10%, var(--live-call-surface-raised));
}

.live-call-workspace__outcome-option--neutral.live-call-workspace__outcome-option--selected {
  border-color: color-mix(in srgb, var(--live-call-warning) 55%, transparent);
  background: color-mix(in srgb, var(--live-call-warning) 10%, var(--live-call-surface-raised));
}

.live-call-workspace__outcome-option--negative.live-call-workspace__outcome-option--selected {
  border-color: color-mix(in srgb, var(--live-call-danger) 55%, transparent);
  background: color-mix(in srgb, var(--live-call-danger) 10%, var(--live-call-surface-raised));
}

.live-call-workspace__decision-panel .live-call-workspace__end-engagement {
  width: 100%;
  margin: 0;
  min-height: 52px;
  padding: 14px 20px;
  border: none;
  border-radius: 14px;
  background: linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%);
  color: #fff;
  font-size: 16px;
  font-weight: 900;
  letter-spacing: 0.02em;
  cursor: pointer;
  box-shadow: 0 10px 28px rgba(14, 165, 233, 0.28);
}

.live-call-workspace__end-engagement {
  width: 100%;
  margin-top: 0;
  min-height: 52px;
}

.live-call-workspace__end-engagement:disabled {
  opacity: 0.45;
  cursor: not-allowed;
  box-shadow: none;
}

.live-call-workspace__outcome-recorded {
  margin: 0;
  padding: 12px 14px;
  border-radius: 10px;
  background: color-mix(in srgb, var(--live-call-success) 12%, var(--live-call-surface));
  font-size: 14px;
  font-weight: 700;
  color: #d1fae5;
}

.live-call-page__footer {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 40;
  padding: 12px var(--live-call-pad-x) calc(12px + env(safe-area-inset-bottom, 0px));
  background: linear-gradient(180deg, transparent 0%, var(--live-call-bg) 24%);
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(14px);
}

.live-call-page__footer-inner {
  max-width: 640px;
  margin: 0 auto;
}

.live-call-page__complete {
  width: 100%;
  min-height: 52px;
  padding: 14px 20px;
  border: none;
  border-radius: 14px;
  background: linear-gradient(
    180deg,
    var(--live-call-accent) 0%,
    color-mix(in srgb, var(--live-call-accent) 75%, #0369a1) 100%
  );
  color: #0c1222;
  font-size: 16px;
  font-weight: 900;
  letter-spacing: 0.02em;
  cursor: pointer;
  box-shadow: 0 6px 24px color-mix(in srgb, var(--live-call-accent) 35%, transparent);
}

.live-call-page__complete:hover:not(:disabled) {
  filter: brightness(1.06);
}

.live-call-page__complete:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  box-shadow: none;
}

@media (max-width: 480px) {
  .live-call-page {
    --live-call-pad-x: 12px;
  }

  .live-call-workspace {
    gap: 10px;
    padding: 6px var(--live-call-pad-x) calc(20px + env(safe-area-inset-bottom, 0px));
  }

  .live-call-workspace__header {
    padding: 4px 0 2px;
  }

  .live-call-workspace__bar {
    margin-bottom: 8px;
    gap: 8px;
  }

  .live-call-workspace__provider {
    font-size: 22px;
  }

  .live-call-workspace__type {
    margin-top: 6px;
    font-size: 10px;
    padding: 4px 10px;
  }

  .live-call-workspace__kicker {
    font-size: 10px;
  }

  .live-call-workspace__edit-brief {
    font-size: 10px;
    padding: 5px 10px;
  }

  .live-call-workspace__card {
    padding: 12px 14px;
    border-radius: 12px;
  }

  .live-call-workspace__goal {
    font-size: 16px;
  }

  .live-call-workspace__primary {
    font-size: 18px;
  }

  .live-call-workspace__secondary-summary {
    padding: 12px 14px;
    font-size: 12px;
  }

  .live-call-workspace__notes {
    min-height: 88px;
    max-height: 160px;
    padding: 12px 14px;
    font-size: 16px;
  }

  .live-call-workspace__outcome-option {
    min-height: 44px;
    padding: 10px 12px;
    font-size: 14px;
  }

  .live-call-workspace__decision-panel .live-call-workspace__end-engagement,
  .live-call-workspace__end-engagement {
    min-height: 48px;
    padding: 12px 16px;
    font-size: 15px;
    border-radius: 12px;
  }

  .live-call-workspace__intro-debrief-hint {
    font-size: 13px;
  }

  .live-call-page__footer {
    padding: 10px var(--live-call-pad-x) calc(10px + env(safe-area-inset-bottom, 0px));
  }

  .live-call-page__complete {
    min-height: 48px;
    font-size: 15px;
    border-radius: 12px;
  }
}
`;
