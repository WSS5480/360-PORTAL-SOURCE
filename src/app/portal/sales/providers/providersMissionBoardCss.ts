import { missionBoardEvaluationPathCss } from "./missionBoardEvaluationPathCss";

/** Mission board layout + compact provider card styles. */

export const providersMissionBoardCss = `
${missionBoardEvaluationPathCss}
@keyframes provider-mission-column-enter {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes provider-mission-priority-pulse {
  0%,
  100% {
    box-shadow: 0 0 0 0 color-mix(in srgb, #ef4444 40%, transparent);
  }
  50% {
    box-shadow: 0 0 0 4px color-mix(in srgb, #ef4444 0%, transparent);
  }
}

.mission-board {
  flex: 1;
  min-height: 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  background:
    radial-gradient(ellipse 120% 80% at 0% 0%, color-mix(in srgb, var(--brand-600) 6%, transparent), transparent 55%),
    radial-gradient(ellipse 90% 60% at 100% 100%, color-mix(in srgb, #22d3ee 5%, transparent), transparent 50%),
    color-mix(in srgb, var(--foreground) 2%, var(--surface));
}

.mission-board-columns {
  flex: 1;
  min-height: 0;
  display: flex;
  gap: 10px;
  padding: 10px 12px 14px;
  overflow-x: auto;
  overflow-y: hidden;
  -webkit-overflow-scrolling: touch;
  align-items: stretch;
  scroll-snap-type: x proximity;
}

.mission-board-column {
  flex: 0 0 min(320px, 84vw);
  min-width: 300px;
  display: flex;
  flex-direction: column;
  min-height: 0;
  position: relative;
  background: color-mix(in srgb, var(--surface) 94%, var(--foreground) 2%);
  border: 1px solid color-mix(in srgb, var(--foreground) 7%, var(--border));
  border-radius: 14px;
  overflow: hidden;
  box-shadow:
    0 1px 2px color-mix(in srgb, var(--foreground) 4%, transparent),
    0 8px 24px color-mix(in srgb, var(--foreground) 5%, transparent);
  scroll-snap-align: start;
  animation: provider-mission-column-enter 320ms ease both;
}

.mission-board-column::before {
  content: "";
  position: absolute;
  inset: 0 0 auto;
  height: 3px;
  background: linear-gradient(90deg, var(--mission-accent, var(--brand-600)), color-mix(in srgb, var(--mission-accent, var(--brand-600)) 55%, #fff));
  z-index: 1;
}

.mission-board-column-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  padding: 12px 12px 10px;
  border-bottom: 1px solid color-mix(in srgb, var(--foreground) 5%, var(--border));
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--mission-accent-soft, var(--brand-600)) 10%, var(--surface)) 0%,
    var(--surface) 100%
  );
  flex-shrink: 0;
}

.mission-board-column-header-main {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.mission-board-column-objective {
  margin: 0;
  font-size: 10px;
  font-weight: 650;
  line-height: 1.4;
  color: color-mix(in srgb, var(--foreground) 52%, var(--muted));
}

.mission-board-column-title {
  margin: 0;
  font-size: 12px;
  font-weight: 900;
  letter-spacing: -0.01em;
  color: var(--mission-accent, var(--foreground));
  line-height: 1.2;
}

.mission-board-column-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 24px;
  padding: 0 8px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--mission-accent-soft, var(--brand-600)) 14%, var(--surface));
  border: 1px solid color-mix(in srgb, var(--mission-accent, var(--brand-600)) 22%, var(--border));
  color: var(--mission-accent, var(--foreground));
  font-size: 11px;
  font-weight: 900;
  flex-shrink: 0;
  box-shadow: inset 0 1px 0 color-mix(in srgb, #fff 40%, transparent);
}

.mission-board-column-cards {
  margin: 0;
  padding: 8px;
  list-style: none;
  display: grid;
  gap: 8px;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  flex: 1;
  min-height: 0;
  align-content: start;
}

.provider-mission-board {
  flex: 1;
  min-height: 0;
  min-width: 0;
}

.provider-mission-board-kicker {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  padding: 10px 14px 2px;
  font-size: 11px;
  font-weight: 750;
  line-height: 1.35;
  color: color-mix(in srgb, var(--foreground) 62%, var(--muted));
}

.provider-mission-board-kicker::before {
  content: "";
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: linear-gradient(135deg, var(--brand-600), #22d3ee);
  box-shadow: 0 0 8px color-mix(in srgb, var(--brand-600) 35%, transparent);
  flex-shrink: 0;
}

/* Stage accent tokens */
.provider-mission-board-column[data-mission-column="discovery"] {
  --mission-accent: #b45309;
  --mission-accent-soft: #f59e0b;
}

.provider-mission-board-column[data-mission-column="observe"] {
  --mission-accent: #15803d;
  --mission-accent-soft: #22c55e;
}

.provider-mission-board-column[data-mission-column="debrief"] {
  --mission-accent: #1d4ed8;
  --mission-accent-soft: #3b82f6;
}

.provider-mission-board-column[data-mission-column="evaluation"] {
  --mission-accent: #6d28d9;
  --mission-accent-soft: #a78bfa;
}

.provider-mission-board-column[data-mission-column="commitment"] {
  --mission-accent: #0f766e;
  --mission-accent-soft: #14b8a6;
}

.provider-mission-board-column[data-mission-column="outcomes"] {
  --mission-accent: #115e59;
  --mission-accent-soft: #2dd4bf;
}

.provider-mission-board-column-empty {
  list-style: none;
  margin: 0;
  padding: 20px 14px;
  border-radius: 10px;
  border: 1px dashed color-mix(in srgb, var(--mission-accent, var(--foreground)) 18%, var(--border));
  background: color-mix(in srgb, var(--mission-accent-soft, var(--foreground)) 4%, var(--surface));
  text-align: center;
  font-size: 11px;
  font-weight: 700;
  line-height: 1.4;
  color: color-mix(in srgb, var(--foreground) 48%, var(--muted));
}

.provider-mission-board-card {
  list-style: none;
}

.provider-mission-board-card-shell {
  display: grid;
  gap: 10px;
  min-width: 0;
  padding: 12px 13px;
  border-radius: 11px;
  border: 1px solid color-mix(in srgb, var(--foreground) 7%, var(--border));
  border-left-width: 4px;
  border-left-color: var(--card-stage-accent, var(--brand-600));
  background: linear-gradient(
    165deg,
    var(--surface) 0%,
    color-mix(in srgb, var(--card-stage-accent, var(--brand-600)) 3%, var(--surface)) 100%
  );
  color: inherit;
  box-shadow:
    0 1px 2px color-mix(in srgb, var(--foreground) 4%, transparent),
    inset 0 1px 0 color-mix(in srgb, #fff 50%, transparent);
  transition:
    border-color 160ms ease,
    box-shadow 160ms ease,
    transform 160ms ease;
}

.provider-mission-board-card[data-priority="overdue"] .provider-mission-board-card-shell {
  border-color: color-mix(in srgb, #ef4444 28%, var(--border));
  background: linear-gradient(
    165deg,
    color-mix(in srgb, #ef4444 4%, var(--surface)) 0%,
    var(--surface) 100%
  );
}

.provider-mission-board-card-shell:focus-within {
  box-shadow:
    0 0 0 2px color-mix(in srgb, var(--card-stage-accent, var(--brand-600)) 22%, transparent),
    0 6px 20px color-mix(in srgb, var(--card-stage-accent, var(--brand-600)) 12%, transparent);
}

.provider-mission-board-card[data-pathway-stage="discovery"] {
  --card-stage-accent: #b45309;
}

.provider-mission-board-card[data-pathway-stage="observe"] {
  --card-stage-accent: #15803d;
}

.provider-mission-board-card[data-pathway-stage="debrief"] {
  --card-stage-accent: #1d4ed8;
}

.provider-mission-board-card[data-pathway-stage="evaluation"] {
  --card-stage-accent: #6d28d9;
}

.provider-mission-board-card[data-pathway-stage="commitment"] {
  --card-stage-accent: #0f766e;
}

.provider-mission-board-card[data-pathway-stage="outcomes"] {
  --card-stage-accent: #115e59;
}

.provider-mission-board-card-shell:hover {
  border-color: color-mix(in srgb, var(--card-stage-accent, var(--brand-600)) 32%, var(--border));
  box-shadow:
    0 6px 20px color-mix(in srgb, var(--card-stage-accent, var(--brand-600)) 14%, transparent),
    inset 0 1px 0 color-mix(in srgb, #fff 60%, transparent);
  transform: translateY(-2px);
}

.provider-mission-board-card--collapsed .provider-mission-board-card-shell {
  gap: 0;
  padding-block: 9px;
}

.provider-mission-board-card--expanded .provider-mission-board-card-shell {
  border-color: color-mix(in srgb, var(--card-stage-accent, var(--brand-600)) 34%, var(--border));
  box-shadow:
    0 8px 22px color-mix(in srgb, var(--card-stage-accent, var(--brand-600)) 14%, transparent),
    inset 0 1px 0 color-mix(in srgb, #fff 60%, transparent);
}

.provider-mission-board-column--drop-valid {
  border-color: color-mix(in srgb, #16a34a 55%, var(--border));
  background: color-mix(in srgb, #16a34a 5%, var(--surface));
  box-shadow:
    0 0 0 2px color-mix(in srgb, #16a34a 22%, transparent),
    0 8px 24px color-mix(in srgb, #16a34a 14%, transparent);
}

.provider-mission-board-column--drop-valid.provider-mission-board-column--drop-hover {
  border-color: color-mix(in srgb, #16a34a 72%, var(--border));
  box-shadow:
    0 0 0 3px color-mix(in srgb, #16a34a 28%, transparent),
    0 10px 28px color-mix(in srgb, #16a34a 18%, transparent);
}

.provider-mission-board-column--drop-invalid {
  border-color: color-mix(in srgb, #dc2626 48%, var(--border));
  background: color-mix(in srgb, #dc2626 5%, var(--surface));
  box-shadow: inset 0 0 0 1px color-mix(in srgb, #dc2626 12%, transparent);
}

.provider-mission-board-column--drop-invalid.provider-mission-board-column--drop-hover {
  border-color: color-mix(in srgb, #dc2626 62%, var(--border));
  box-shadow:
    0 0 0 2px color-mix(in srgb, #dc2626 20%, transparent),
    inset 0 0 0 1px color-mix(in srgb, #dc2626 16%, transparent);
}

.provider-mission-board--drag-active .provider-mission-board-column--drop-neutral {
  opacity: 0.52;
  filter: grayscale(0.35);
  border-color: color-mix(in srgb, var(--foreground) 8%, var(--border));
}

.provider-mission-board-column-drop-hint {
  margin: 0;
  padding: 8px 12px;
  font-size: 11px;
  font-weight: 800;
  line-height: 1.35;
  letter-spacing: -0.01em;
  border-bottom: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
}

.provider-mission-board-column-drop-hint--valid {
  color: color-mix(in srgb, #15803d 88%, var(--foreground));
  background: color-mix(in srgb, #16a34a 10%, var(--surface));
}

.provider-mission-board-column-drop-hint--invalid {
  color: color-mix(in srgb, #b91c1c 90%, var(--foreground));
  background: color-mix(in srgb, #dc2626 8%, var(--surface));
}

.provider-mission-board-column--drop-neutral {
  transition:
    opacity 160ms ease,
    filter 160ms ease,
    border-color 160ms ease,
    box-shadow 160ms ease,
    background 160ms ease;
}

.provider-mission-board-column--drop-valid,
.provider-mission-board-column--drop-invalid {
  transition:
    opacity 160ms ease,
    border-color 120ms ease,
    box-shadow 120ms ease,
    background 120ms ease;
}

.provider-mission-board-card--dragging .provider-mission-board-card-shell {
  opacity: 0.55;
  transform: scale(0.98);
}

.provider-mission-board-card-drag-handle {
  flex-shrink: 0;
  width: 16px;
  font-size: 14px;
  line-height: 1;
  color: color-mix(in srgb, var(--foreground) 35%, var(--muted));
  cursor: grab;
  user-select: none;
}

.provider-mission-board-card-shell:active .provider-mission-board-card-drag-handle {
  cursor: grabbing;
}

.provider-mission-board-card-identity {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  min-width: 0;
}

.provider-mission-board-card-identity-text {
  display: grid;
  gap: 2px;
  min-width: 0;
  flex: 1;
}

.provider-mission-board-toast {
  position: fixed;
  left: 50%;
  bottom: max(18px, env(safe-area-inset-bottom, 0px));
  transform: translateX(-50%);
  z-index: 10050;
  display: flex;
  align-items: center;
  gap: 12px;
  max-width: min(520px, calc(100vw - 24px));
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));
  background: color-mix(in srgb, var(--surface) 94%, transparent);
  box-shadow: 0 12px 40px color-mix(in srgb, var(--foreground) 16%, transparent);
  backdrop-filter: blur(10px);
}

.provider-mission-board-toast p {
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  line-height: 1.4;
  color: var(--foreground);
}

.provider-mission-board-toast-detail {
  font-size: 12px;
  font-weight: 600;
  color: var(--muted);
}

.provider-mission-board-toast-dismiss {
  border: none;
  background: none;
  color: var(--muted);
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
  font-family: inherit;
  flex-shrink: 0;
}

.provider-mission-board-column--drop-neutral {
  /* dimmed while dragging — see .provider-mission-board--drag-active */
}

.provider-mission-board-card-head {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  min-width: 0;
}

.provider-mission-board-card-head-actions {
  display: flex;
  flex-shrink: 0;
  align-items: flex-start;
  gap: 6px;
}

.provider-mission-board-card-head-link {
  display: grid;
  gap: 2px;
  min-width: 0;
  flex: 1;
  width: 100%;
  border: none;
  text-decoration: none;
  color: inherit;
  background: transparent;
  border-radius: 6px;
  padding: 1px 2px;
  margin: -1px -2px;
  text-align: left;
  cursor: pointer;
  font: inherit;
  transition: background 140ms ease;
}

.provider-mission-board-card-head-link:hover {
  background: color-mix(in srgb, var(--card-stage-accent, var(--brand-600)) 8%, transparent);
}

.provider-mission-board-card-head-link:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--card-stage-accent, var(--brand-600)) 45%, transparent);
  outline-offset: 2px;
}

.provider-mission-board-card-add-case,
.provider-mission-board-card-open-profile {
  flex-shrink: 0;
  align-self: flex-start;
  min-height: 28px;
  padding: 4px 8px;
  border-radius: 7px;
  border: 1px solid color-mix(in srgb, var(--foreground) 12%, var(--border));
  background: var(--surface);
  color: var(--foreground);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.02em;
  cursor: pointer;
  font-family: inherit;
  text-decoration: none;
  white-space: nowrap;
  transition: background 140ms ease, border-color 140ms ease;
}

.provider-mission-board-card-add-case:hover:not(:disabled),
.provider-mission-board-card-open-profile:hover {
  background: color-mix(in srgb, var(--card-stage-accent, var(--brand-600)) 10%, var(--surface));
  border-color: color-mix(in srgb, var(--card-stage-accent, var(--brand-600)) 35%, var(--border));
}

.provider-mission-board-card-add-case:focus-visible,
.provider-mission-board-card-open-profile:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--card-stage-accent, var(--brand-600)) 45%, transparent);
  outline-offset: 2px;
}

.provider-mission-board-card-add-case:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.provider-mission-board-card-name {
  font-size: 15px;
  font-weight: 900;
  letter-spacing: -0.025em;
  line-height: 1.2;
  color: var(--foreground);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.provider-mission-board-card-org {
  font-size: 11px;
  font-weight: 600;
  line-height: 1.35;
  color: var(--muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.provider-mission-board-card-status-line {
  margin: 0;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.35;
  color: color-mix(in srgb, var(--foreground) 72%, var(--muted));
}

.provider-mission-board-card-status-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  min-width: 0;
}

.provider-mission-board-card-stage {
  display: inline-flex;
  align-items: center;
  padding: 3px 8px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 800;
  line-height: 1.25;
  letter-spacing: 0.01em;
  color: var(--card-stage-accent, var(--foreground));
  background: color-mix(in srgb, var(--card-stage-accent, var(--brand-600)) 12%, var(--surface));
  border: 1px solid color-mix(in srgb, var(--card-stage-accent, var(--brand-600)) 22%, var(--border));
}

.provider-mission-board-card-progress-block {
  display: grid;
  gap: 5px;
}

.provider-mission-board-card-progress-label {
  margin: 0;
  font-size: 11px;
  font-weight: 750;
  line-height: 1.35;
  color: color-mix(in srgb, var(--foreground) 78%, var(--muted));
}

.provider-mission-board-card-progress-bar {
  height: 4px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--foreground) 8%, var(--border));
  overflow: hidden;
}

.provider-mission-board-card-progress-fill {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(
    90deg,
    var(--card-stage-accent, var(--brand-600)),
    color-mix(in srgb, var(--card-stage-accent, var(--brand-600)) 70%, #fff)
  );
}

.provider-mission-board-card-touch {
  margin: 0;
  font-size: 10px;
  font-weight: 650;
  line-height: 1.35;
  color: var(--muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.provider-mission-board-card-primary-cta {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 36px;
  min-width: 0;
  padding: 8px 10px;
  border-radius: 9px;
  border: 1px solid color-mix(in srgb, var(--card-stage-accent, var(--brand-600)) 35%, var(--border));
  background: color-mix(in srgb, var(--card-stage-accent, var(--brand-600)) 14%, var(--surface));
  color: var(--foreground);
  font-size: 12px;
  font-weight: 850;
  line-height: 1.25;
  letter-spacing: -0.01em;
  text-decoration: none;
  text-align: center;
  white-space: normal;
  text-wrap: balance;
  cursor: pointer;
  font-family: inherit;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  transition: background 140ms ease, border-color 140ms ease;
}

.provider-mission-board-card-primary-cta:hover {
  background: color-mix(in srgb, var(--card-stage-accent, var(--brand-600)) 22%, var(--surface));
  border-color: color-mix(in srgb, var(--card-stage-accent, var(--brand-600)) 48%, var(--border));
}

.provider-mission-board-card-primary-cta:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--card-stage-accent, var(--brand-600)) 45%, transparent);
  outline-offset: 2px;
}

.provider-mission-board-card-quick-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
  width: 100%;
  min-width: 0;
}

.provider-mission-board-card-quick-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 32px;
  min-width: 0;
  max-width: 100%;
  padding: 5px 6px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--foreground) 9%, var(--border));
  background: color-mix(in srgb, var(--foreground) 2%, var(--surface));
  color: color-mix(in srgb, var(--foreground) 88%, var(--muted));
  font-size: 10px;
  font-weight: 800;
  line-height: 1.2;
  white-space: normal;
  text-wrap: balance;
  text-align: center;
  overflow: hidden;
  text-decoration: none;
  cursor: pointer;
  font-family: inherit;
  transition: background 140ms ease, border-color 140ms ease;
}


.provider-mission-board-card-quick-action:hover {
  background: color-mix(in srgb, var(--foreground) 4%, var(--surface));
  border-color: color-mix(in srgb, var(--foreground) 14%, var(--border));
}

.provider-mission-board-card-quick-action:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--brand-600) 35%, transparent);
  outline-offset: 1px;
}

.provider-mission-board-card-quick-action--dictate {
  color: color-mix(in srgb, var(--brand-700) 85%, var(--foreground));
  border-color: color-mix(in srgb, var(--brand-600) 22%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 8%, var(--surface));
}

.provider-mission-board-card-status {
  margin: 0;
  display: inline-flex;
  align-items: center;
  max-width: 100%;
  padding: 3px 8px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 800;
  line-height: 1.25;
  letter-spacing: 0.01em;
  color: var(--card-stage-accent, var(--foreground));
  background: color-mix(in srgb, var(--card-stage-accent, var(--brand-600)) 12%, var(--surface));
  border: 1px solid color-mix(in srgb, var(--card-stage-accent, var(--brand-600)) 22%, var(--border));
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.provider-mission-board-card-priority {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 7px;
  border-radius: 999px;
  font-size: 9px;
  font-weight: 850;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  flex-shrink: 0;
}

.provider-mission-board-card-priority--overdue {
  color: #991b1b;
  background: color-mix(in srgb, #ef4444 12%, var(--surface));
  border: 1px solid color-mix(in srgb, #ef4444 24%, var(--border));
  animation: provider-mission-priority-pulse 2.4s ease infinite;
}

.provider-mission-board-card-priority--action {
  color: #1e40af;
  background: color-mix(in srgb, #3b82f6 12%, var(--surface));
  border: 1px solid color-mix(in srgb, #3b82f6 24%, var(--border));
}

.provider-mission-board-card-next-block {
  display: grid;
  gap: 3px;
  padding: 8px 9px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--foreground) 3%, var(--surface));
  border: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
}

.provider-mission-board-card-next-block--case {
  gap: 4px;
  padding: 10px 10px 8px;
}

.provider-mission-board-card-next-heading {
  margin: 0 0 2px;
  font-size: 9px;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--brand-700) 70%, var(--foreground));
}

.provider-mission-board-case-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 6px;
  padding-top: 8px;
  border-top: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
}

.provider-mission-board-case-actions--stack {
  flex-direction: column;
}

.provider-mission-board-case-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 28px;
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--foreground) 12%, var(--border));
  background: color-mix(in srgb, var(--foreground) 2%, var(--surface));
  font-size: 11px;
  font-weight: 700;
  color: var(--foreground);
  text-decoration: none;
  cursor: pointer;
}

.provider-mission-board-case-action--open {
  color: color-mix(in srgb, var(--brand-700) 85%, var(--foreground));
  border-color: color-mix(in srgb, var(--brand-600) 22%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 8%, var(--surface));
}

.provider-mission-board-case-action:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.provider-mission-board-card-observe-footer {
  display: grid;
  gap: 8px;
  margin-top: 8px;
}

.provider-mission-board-card-observe-link {
  justify-self: start;
  padding: 0;
  border: none;
  background: none;
  font: inherit;
  font-size: 11px;
  font-weight: 700;
  color: color-mix(in srgb, var(--brand-700) 85%, var(--foreground));
  cursor: pointer;
  text-decoration: underline;
}

.provider-mission-board-card-observe-link:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.provider-mission-board-card-primary-cta--add {
  margin-top: 0;
}

.provider-mission-board-card-row {
  display: flex;
  align-items: baseline;
  gap: 5px;
  min-width: 0;
}

.provider-mission-board-card-k {
  flex-shrink: 0;
  font-size: 9px;
  font-weight: 900;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--foreground) 38%, var(--muted));
}

.provider-mission-board-card-next {
  font-size: 12px;
  font-weight: 800;
  line-height: 1.35;
  letter-spacing: -0.01em;
  color: var(--foreground);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.provider-mission-board-card-upcoming {
  font-size: 11px;
  font-weight: 700;
  line-height: 1.35;
  color: color-mix(in srgb, var(--brand-700) 75%, var(--foreground));
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.provider-mission-board-card-upcoming-row {
  padding-top: 2px;
}

.provider-mission-board-card-upcoming-row .provider-mission-board-card-k::before {
  content: "◷";
  margin-right: 3px;
  font-size: 10px;
  opacity: 0.75;
}

.providers-directory-root--mission .sc-mobile-list-body {
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding: 0;
}

.providers-directory-root--mission .provider-mission-board {
  min-height: calc(100dvh - 220px);
}

.provider-mission-board-mobile {
  display: none;
}

@media (max-width: 699px) {
  body:has(.providers-directory-root--mission) .crm-sticky-action-bar,
  body:has(.providers-directory-root--mission) .pov-sticky-action,
  body:has(.providers-directory-root--mission) .provider-upcoming-eng-cta,
  body:has(.providers-directory-root--mission) .sales-mobile-action-bar-shell {
    display: none !important;
  }

  body:has(.providers-directory-root--mission) .sc-native-page,
  body:has(.providers-directory-root--mission) .portal-contentWrap {
    padding-bottom: 0 !important;
  }

  .providers-directory-root--mission .sc-mobile-list-header-top {
    align-items: center;
    min-height: 34px;
    padding: 4px 10px 3px;
    gap: 6px;
  }

  .providers-directory-root--mission .sc-mobile-list-title {
    font-size: 15px;
    line-height: 1.05;
  }

  .providers-directory-root--mission .sc-mobile-list-count {
    display: none;
  }

  .providers-directory-root--mission .providers-directory-header-actions {
    gap: 4px;
  }

  .providers-directory-root--mission .providers-directory-contacts-link,
  .providers-directory-root--mission .providers-directory-add-btn {
    min-height: 44px;
    padding: 0 10px;
    font-size: 12px;
    border-radius: 10px;
  }

  .providers-directory-root--mission .providers-directory-add-btn svg {
    width: 12px;
    height: 12px;
  }

  .providers-directory-root--mission .providers-directory-toolbar-row--primary {
    gap: 6px;
    padding: 2px 10px 3px;
  }

  .providers-directory-root--mission .providers-directory-toolbar-search.sc-mobile-list-search-wrap {
    height: 44px;
    min-height: 44px;
    padding: 0 10px;
    border-radius: 10px;
  }

  .providers-directory-root--mission .sc-mobile-list-search {
    font-size: 16px;
  }

  .providers-directory-root--mission .providers-directory-toolbar-cluster {
    gap: 5px;
  }

  .providers-directory-root--mission .providers-directory-toolbar-cluster .sc-mobile-list-tool-btn {
    width: 44px;
    height: 44px;
    min-width: 44px;
    min-height: 44px;
    border-radius: 10px;
  }

  .providers-directory-root--mission .providers-directory-toolbar-row--view {
    padding: 0 10px 4px;
  }

  .providers-directory-root--mission .providers-directory-toolbar-row--view .directory-view-mode-toggle__btn {
    min-height: 44px;
    padding: 3px 10px;
    font-size: 12px;
  }

  .providers-directory-root--mission .providers-directory-toolbar-row--view .directory-view-mode-toggle__icon {
    display: none;
  }

  .providers-directory-root--mission .sc-mobile-list-body {
    background: color-mix(in srgb, var(--surface) 96%, var(--foreground) 2%);
  }

  .providers-directory-root--mission .provider-mission-board {
    display: none;
  }

  .provider-mission-board-mobile {
    display: grid;
    gap: 14px;
    padding: 12px 16px 24px;
    background: linear-gradient(
      180deg,
      color-mix(in srgb, var(--brand-600) 4%, var(--surface)) 0%,
      color-mix(in srgb, var(--surface) 98%, var(--foreground) 2%) 100%
    );
  }

  .provider-mission-board-mobile-stepper {
    display: grid;
    grid-template-columns: repeat(6, minmax(0, 1fr));
    column-gap: 5px;
    padding: 1px 0 4px;
  }

  .provider-mission-board-mobile-step {
    position: relative;
    display: grid;
    justify-items: center;
    gap: 2px;
    min-width: 0;
    color: color-mix(in srgb, var(--foreground) 48%, var(--muted));
  }

  .provider-mission-board-mobile-step::after {
    content: "";
    position: absolute;
    left: calc(50% + 5px);
    right: calc(-50% - 1px);
    bottom: 2px;
    height: 1px;
    background: color-mix(in srgb, var(--foreground) 24%, var(--border));
  }

  .provider-mission-board-mobile-step:last-child::after {
    display: none;
  }

  .provider-mission-board-mobile-step-label {
    max-width: 100%;
    font-size: 7px;
    font-weight: 850;
    line-height: 1;
    letter-spacing: -0.035em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: clip;
  }

  .provider-mission-board-mobile-step-dot {
    position: relative;
    z-index: 1;
    width: 5px;
    height: 5px;
    border-radius: 999px;
    background: var(--surface);
    border: 1px solid color-mix(in srgb, var(--foreground) 42%, var(--border));
  }

  .provider-mission-board-mobile-step--complete,
  .provider-mission-board-mobile-step--active {
    color: color-mix(in srgb, var(--brand-700) 85%, var(--foreground));
  }

  .provider-mission-board-mobile-step--complete .provider-mission-board-mobile-step-dot,
  .provider-mission-board-mobile-step--active .provider-mission-board-mobile-step-dot {
    background: linear-gradient(135deg, var(--brand-600), #0f766e);
    border-color: color-mix(in srgb, var(--brand-700) 78%, var(--border));
    box-shadow: 0 0 0 1px color-mix(in srgb, var(--brand-600) 12%, transparent);
  }

  .provider-mission-board-mobile-primary-card {
    display: grid;
    gap: 12px;
    padding: 16px;
    border-radius: 14px;
    border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
    border-left: 4px solid var(--card-stage-accent, var(--brand-600));
    background: linear-gradient(
      160deg,
      var(--surface) 0%,
      color-mix(in srgb, var(--card-stage-accent, var(--brand-600)) 4%, var(--surface)) 100%
    );
    box-shadow:
      0 12px 28px color-mix(in srgb, var(--foreground) 9%, transparent),
      inset 0 1px 0 color-mix(in srgb, #fff 54%, transparent);
  }

  .provider-mission-board-mobile-primary-card[data-pathway-stage="discovery"] {
    --card-stage-accent: #b45309;
  }

  .provider-mission-board-mobile-primary-card[data-pathway-stage="observe"] {
    --card-stage-accent: #15803d;
  }

  .provider-mission-board-mobile-primary-card[data-pathway-stage="debrief"] {
    --card-stage-accent: #1d4ed8;
  }

  .provider-mission-board-mobile-primary-card[data-pathway-stage="evaluation"] {
    --card-stage-accent: #6d28d9;
  }

  .provider-mission-board-mobile-primary-card[data-pathway-stage="commitment"] {
    --card-stage-accent: #0f766e;
  }

  .provider-mission-board-mobile-primary-card[data-pathway-stage="outcomes"] {
    --card-stage-accent: #115e59;
  }

  .provider-mission-board-mobile-primary-head,
  .provider-mission-board-mobile-row {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
  }

  .provider-mission-board-mobile-avatar {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: 0 0 40px;
    width: 40px;
    height: 40px;
    border-radius: 11px;
    background: color-mix(in srgb, var(--card-stage-accent, var(--brand-600)) 11%, var(--surface));
    color: color-mix(in srgb, var(--card-stage-accent, var(--brand-700)) 86%, var(--foreground));
    font-size: 12px;
    font-weight: 900;
    letter-spacing: 0.03em;
  }

  .provider-mission-board-mobile-primary-title,
  .provider-mission-board-mobile-row-main {
    display: grid;
    align-content: center;
    gap: 2px;
    min-width: 0;
    min-height: 44px;
    flex: 1;
    color: inherit;
    text-decoration: none;
  }

  .provider-mission-board-mobile-primary-title strong,
  .provider-mission-board-mobile-row-main strong {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 16px;
    font-weight: 900;
    line-height: 1.2;
    letter-spacing: -0.03em;
  }

  .provider-mission-board-mobile-primary-title span,
  .provider-mission-board-mobile-row-main span,
  .provider-mission-board-mobile-row-main small {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--muted);
    font-size: 12px;
    font-weight: 650;
    line-height: 1.25;
  }

  .provider-mission-board-mobile-card-menu {
    position: relative;
    flex-shrink: 0;
  }

  .provider-mission-board-mobile-card-menu summary {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    border-radius: 999px;
    color: color-mix(in srgb, var(--foreground) 72%, var(--muted));
    font-size: 15px;
    font-weight: 900;
    cursor: pointer;
    list-style: none;
  }

  .provider-mission-board-mobile-card-menu summary::-webkit-details-marker {
    display: none;
  }

  .provider-mission-board-mobile-card-menu[open] summary {
    background: color-mix(in srgb, var(--foreground) 6%, var(--surface));
  }

  /* A closed <details> still lays out its absolutely positioned panel, which then
     overlaps the card body with invisible controls. Keep it out of the layout. */
  .provider-mission-board-mobile-card-menu:not([open]) .provider-mission-board-mobile-card-menu-list {
    display: none;
  }

  .provider-mission-board-mobile-card-menu-list {
    position: absolute;
    top: calc(100% + 6px);
    right: 0;
    z-index: 3;
    display: grid;
    min-width: 180px;
    padding: 6px;
    border-radius: 12px;
    border: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));
    background: var(--surface);
    box-shadow: 0 16px 36px color-mix(in srgb, var(--foreground) 18%, transparent);
  }

  .provider-mission-board-mobile-card-menu-list a,
  .provider-mission-board-mobile-card-menu-list button {
    display: flex;
    align-items: center;
    min-height: 44px;
    padding: 8px 10px;
    border: none;
    border-radius: 9px;
    background: transparent;
    color: var(--foreground);
    font: inherit;
    font-size: 13px;
    font-weight: 800;
    text-align: left;
    text-decoration: none;
    cursor: pointer;
  }

  .provider-mission-board-mobile-card-menu-list a:hover,
  .provider-mission-board-mobile-card-menu-list button:hover {
    background: color-mix(in srgb, var(--brand-600) 8%, var(--surface));
  }

  .provider-mission-board-mobile-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 7px;
    margin: 0;
    color: color-mix(in srgb, var(--foreground) 58%, var(--muted));
    font-size: 12px;
    font-weight: 700;
  }

  .provider-mission-board-mobile-meta strong {
    color: var(--card-stage-accent, var(--foreground));
  }

  .provider-mission-board-mobile-status-card {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
    padding: 12px;
    border-radius: 12px;
    border: 1px solid color-mix(in srgb, var(--foreground) 7%, var(--border));
    background: color-mix(in srgb, var(--surface) 94%, var(--foreground) 2%);
  }

  .provider-mission-board-mobile-status-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: 0 0 34px;
    width: 34px;
    height: 34px;
    border-radius: 10px;
    background: color-mix(in srgb, var(--card-stage-accent, var(--brand-600)) 8%, var(--surface));
    color: var(--card-stage-accent, var(--brand-600));
    font-weight: 900;
  }

  .provider-mission-board-mobile-status-card div {
    display: grid;
    gap: 2px;
    min-width: 0;
    flex: 1;
  }

  .provider-mission-board-mobile-status-card span {
    font-size: 11px;
    font-weight: 800;
    color: color-mix(in srgb, var(--foreground) 48%, var(--muted));
  }

  .provider-mission-board-mobile-status-card strong {
    font-size: 14px;
    font-weight: 900;
    color: var(--foreground);
  }

  .provider-mission-board-mobile-status-card button,
  .provider-mission-board-mobile-quick-action,
  .provider-mission-board-mobile-quick-actions button,
  .provider-mission-board-mobile-more summary,
  .provider-mission-board-mobile-more-menu button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 44px;
    border-radius: 10px;
    border: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));
    background: var(--surface);
    color: var(--foreground);
    font: inherit;
    font-size: 12px;
    font-weight: 850;
    cursor: pointer;
    text-align: center;
    text-decoration: none;
  }

  .provider-mission-board-mobile-next-action {
    display: grid;
    gap: 6px;
    width: 100%;
    padding: 16px;
    border-radius: 12px;
    border: 1px solid color-mix(in srgb, var(--card-stage-accent, var(--brand-600)) 14%, var(--border));
    background: linear-gradient(
      145deg,
      color-mix(in srgb, var(--card-stage-accent, var(--brand-600)) 8%, var(--surface)) 0%,
      color-mix(in srgb, var(--card-stage-accent, var(--brand-600)) 3%, var(--surface)) 100%
    );
    color: inherit;
    text-align: left;
    cursor: pointer;
    font-family: inherit;
  }

  .provider-mission-board-mobile-next-action span {
    color: color-mix(in srgb, var(--card-stage-accent, var(--brand-600)) 78%, var(--foreground));
    font-size: 11px;
    font-weight: 900;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .provider-mission-board-mobile-next-action strong {
    font-size: 17px;
    font-weight: 950;
    line-height: 1.2;
    letter-spacing: -0.03em;
  }

  .provider-mission-board-mobile-next-action small {
    color: color-mix(in srgb, var(--foreground) 64%, var(--muted));
    font-size: 12px;
    font-weight: 650;
    line-height: 1.35;
  }

  .provider-mission-board-mobile-quick-actions {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
  }

  .provider-mission-board-mobile-quick-actions button {
    padding-inline: 6px;
    font-size: 11px;
    line-height: 1.15;
  }

  .provider-mission-board-mobile-move {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    min-height: 46px;
    width: 100%;
    border: none;
    border-radius: 11px;
    background: linear-gradient(135deg, var(--brand-700), #0f766e);
    color: #fff;
    font-family: inherit;
    font-size: 14px;
    font-weight: 900;
    cursor: pointer;
    box-shadow: 0 10px 22px color-mix(in srgb, var(--brand-700) 24%, transparent);
  }

  .provider-mission-board-mobile-more {
    display: grid;
    gap: 8px;
  }

  .provider-mission-board-mobile-more summary {
    display: flex;
    align-items: center;
    justify-content: center;
    list-style: none;
  }

  .provider-mission-board-mobile-more summary::-webkit-details-marker {
    display: none;
  }

  .provider-mission-board-mobile-more-menu {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }

  .provider-mission-board-mobile-other {
    display: grid;
    gap: 10px;
  }

  .provider-mission-board-mobile-other header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    color: color-mix(in srgb, var(--foreground) 62%, var(--muted));
  }

  .provider-mission-board-mobile-other h2 {
    margin: 0;
    font-size: 11px;
    font-weight: 900;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .provider-mission-board-mobile-other header span {
    font-size: 11px;
    font-weight: 750;
  }

  .provider-mission-board-mobile-other ul {
    display: grid;
    gap: 8px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .provider-mission-board-mobile-row {
    padding: 10px;
    border-radius: 13px;
    border: 1px solid color-mix(in srgb, var(--foreground) 7%, var(--border));
    background: var(--surface);
    box-shadow: 0 4px 14px color-mix(in srgb, var(--foreground) 5%, transparent);
  }

  .provider-mission-board-mobile-row-switch {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
    flex: 1;
    padding: 0;
    border: none;
    background: transparent;
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: pointer;
  }

  .provider-mission-board-mobile-row-switch-label {
    flex-shrink: 0;
    padding: 5px 8px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--brand-600) 8%, var(--surface));
    color: color-mix(in srgb, var(--brand-700) 86%, var(--foreground));
    font-size: 11px;
    font-weight: 900;
    white-space: nowrap;
  }

  .provider-mission-board-mobile-row-action {
    display: inline-flex;
    align-items: center;
    justify-content: flex-end;
    gap: 6px;
    min-height: 44px;
    max-width: 132px;
    border: none;
    background: transparent;
    color: color-mix(in srgb, var(--brand-700) 84%, var(--foreground));
    font: inherit;
    font-size: 12px;
    font-weight: 900;
    text-align: right;
    cursor: pointer;
  }

  .provider-mission-board-mobile button:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
}

@media (min-width: 900px) {
  .providers-directory-root--mission .provider-mission-board {
    min-height: calc(100dvh - 200px);
  }

  .mission-board-columns {
    gap: 12px;
    padding: 12px 16px 16px;
  }

  .mission-board-column {
    flex: 0 0 min(340px, 28vw);
    min-width: 280px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .mission-board-column,
  .provider-mission-board-card-shell,
  .provider-mission-board-card-priority--overdue {
    animation: none;
    transition: none;
  }
}
`;
