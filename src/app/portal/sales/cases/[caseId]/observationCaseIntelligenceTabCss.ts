import { providerOverviewStateTokensCss } from "../../providers/[providerId]/providerOverviewStateTokens";

/** Case Intelligence tab — aligned with provider overview + case brief design system. */
export const observationCaseIntelligenceTabCss = `
${providerOverviewStateTokensCss}

.case-obs-intel {
  --mc-accent: var(--brand-600, #0d9488);
  --mc-ink: #0b1220;
  --mc-ink-soft: #334155;
  --mc-meta: #64748b;
  --mc-border: #c9d2df;
  --mc-radius-md: 14px;
  --mc-elev-panel: 0 1px 2px rgba(15, 23, 42, 0.04), 0 8px 24px rgba(15, 23, 42, 0.06);
  --mc-elev-hero: 0 14px 44px rgba(15, 23, 42, 0.14);
  --pov-hero-accent: var(--mc-accent);
  min-width: 0;
  width: 100%;
  max-width: min(680px, 100%);
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow-x: hidden;
  color: var(--mc-ink-soft);
  font-size: 14px;
  line-height: 1.45;
}

/* ── Command strip (provider overview command header, compact) ── */
.case-obs-intel-command {
  border-radius: 16px;
  overflow: hidden;
  box-shadow: var(--mc-elev-hero);
  background: linear-gradient(152deg, #0a0f1a 0%, #0f172a 42%, #162033 100%);
  color: #f8fafc;
}

.case-obs-intel-command__surface {
  padding: 14px 16px;
  display: grid;
  gap: 10px;
}

.case-obs-intel-command__head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px 12px;
}

.case-obs-intel-command__kicker {
  margin: 0;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(148, 163, 184, 0.95);
}

.case-obs-intel-command__badges {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  justify-content: flex-end;
}

.case-obs-intel-badge {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  padding: 2px 9px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  white-space: nowrap;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.08);
  color: #e2e8f0;
}

.case-obs-intel-badge--complete {
  color: #86efac;
  background: color-mix(in srgb, #10b981 16%, rgba(255, 255, 255, 0.06));
  border-color: color-mix(in srgb, #10b981 28%, rgba(255, 255, 255, 0.1));
}

.case-obs-intel-badge--progress {
  color: #fde68a;
  background: color-mix(in srgb, #f59e0b 16%, rgba(255, 255, 255, 0.06));
  border-color: color-mix(in srgb, #f59e0b 28%, rgba(255, 255, 255, 0.1));
}

.case-obs-intel-badge--notes {
  color: #99f6e4;
  background: color-mix(in srgb, var(--mc-accent) 18%, rgba(255, 255, 255, 0.06));
  border-color: color-mix(in srgb, var(--mc-accent) 30%, rgba(255, 255, 255, 0.1));
  text-transform: none;
  letter-spacing: -0.01em;
  font-size: 11px;
}

.case-obs-intel-badge--updating {
  color: #fef3c7;
  background: color-mix(in srgb, #f59e0b 20%, rgba(255, 255, 255, 0.06));
  border-color: color-mix(in srgb, #f59e0b 34%, rgba(255, 255, 255, 0.1));
}

.case-obs-intel-updating {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 9px 10px;
  padding: 12px;
  border-radius: 14px;
  color: #78350f;
  background: linear-gradient(180deg, color-mix(in srgb, #f59e0b 16%, #fff), #fff);
  border: 1px solid color-mix(in srgb, #f59e0b 34%, var(--mc-border));
  box-shadow: 0 1px 2px rgba(146, 64, 14, 0.08), 0 10px 28px rgba(146, 64, 14, 0.12);
}

.case-obs-intel-updating__spinner {
  flex-shrink: 0;
  width: 14px;
  height: 14px;
  border-radius: 999px;
  border: 2px solid color-mix(in srgb, #f59e0b 26%, transparent);
  border-top-color: #d97706;
  animation: case-obs-intel-spin 0.9s linear infinite;
}

.case-obs-intel-updating__copy {
  display: grid;
  gap: 2px;
  font-size: 12px;
  font-weight: 650;
  line-height: 1.35;
}

.case-obs-intel-updating__copy strong {
  display: inline-flex;
  align-items: baseline;
  color: #713f12;
  font-weight: 850;
}

.case-obs-intel-loading-dots {
  display: inline-flex;
  width: 1.1em;
  margin-left: 1px;
}

.case-obs-intel-loading-dots span {
  opacity: 0.25;
  animation: case-obs-intel-dot 1.2s infinite ease-in-out;
}

.case-obs-intel-loading-dots span:nth-child(2) {
  animation-delay: 0.16s;
}

.case-obs-intel-loading-dots span:nth-child(3) {
  animation-delay: 0.32s;
}

@keyframes case-obs-intel-dot {
  0%,
  80%,
  100% {
    opacity: 0.25;
    transform: translateY(0);
  }
  40% {
    opacity: 1;
    transform: translateY(-1px);
  }
}

.case-obs-intel-updating__button {
  grid-column: 2;
  justify-self: start;
  border: 1px solid color-mix(in srgb, #d97706 38%, var(--mc-border));
  background: #fff7ed;
  color: #92400e;
  border-radius: 999px;
  padding: 6px 11px;
  font: inherit;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
}

.case-obs-intel-updating__button:hover {
  background: #ffedd5;
}

.case-obs-intel-updating__button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

@keyframes case-obs-intel-spin {
  to {
    transform: rotate(360deg);
  }
}

.case-obs-intel-command__metrics {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px 12px;
  padding: 10px 12px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

@media (min-width: 520px) {
  .case-obs-intel-command__metrics {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

.case-obs-intel-command__metric {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.case-obs-intel-command__metric-label {
  margin: 0;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(148, 163, 184, 0.95);
}

.case-obs-intel-command__metric-value {
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  line-height: 1.3;
  color: #f8fafc;
}

.case-obs-intel-command__note {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.45;
  color: rgba(226, 232, 240, 0.92);
  max-width: 52ch;
}

/* ── Briefing shell (provider overview briefing layout) ── */
.case-obs-intel-briefing {
  display: flex;
  flex-direction: column;
  gap: 0;
  min-width: 0;
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, #0f172a 10%, var(--mc-border));
  box-shadow: var(--mc-elev-panel);
  background: #fff;
}

.case-obs-intel-panel {
  display: grid;
  gap: 10px;
  padding: 14px 16px;
  min-width: 0;
  background: #fff;
}

.case-obs-intel-panel + .case-obs-intel-panel {
  border-top: 1px solid color-mix(in srgb, var(--mc-border) 88%, transparent);
}

.case-obs-intel-panel__kicker {
  margin: 0;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--mc-meta);
}

.case-obs-intel-panel-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
}

.case-obs-intel-panel-head-main {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  min-width: 0;
}

.case-obs-intel-title {
  margin: 0;
  font-size: 13px;
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1.25;
  color: var(--mc-ink);
}

.case-obs-intel-count-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  color: color-mix(in srgb, var(--mc-accent) 82%, var(--mc-ink));
  background: color-mix(in srgb, var(--mc-accent) 10%, #fff);
  border: 1px solid color-mix(in srgb, var(--mc-accent) 22%, var(--mc-border));
}

.case-obs-intel-pending-pill {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #b45309;
  background: color-mix(in srgb, #f59e0b 12%, #fff);
  border: 1px solid color-mix(in srgb, #f59e0b 22%, transparent);
}

/* ── Hero primary (this observation / pre-capture mission) ── */
.case-obs-intel-panel--primary {
  padding: 16px 16px 14px;
  background: linear-gradient(
    165deg,
    color-mix(in srgb, var(--mc-accent) 11%, #fff) 0%,
    #fff 55%,
    color-mix(in srgb, var(--mc-accent) 4%, #fff) 100%
  );
}

.case-obs-intel-panel--primary .case-obs-intel-panel__kicker {
  color: color-mix(in srgb, var(--mc-accent) 78%, var(--mc-ink));
}

.case-obs-intel-panel--primary .case-obs-intel-title {
  font-size: 16px;
  font-weight: 850;
  letter-spacing: -0.03em;
}

.case-obs-intel-panel--current.case-obs-intel-panel--primary {
  background: linear-gradient(165deg, #0a101a 0%, #111827 38%, #0f172a 100%);
  border-top: none;
  color: #e2e8f0;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);
}

.case-obs-intel-panel--current.case-obs-intel-panel--primary .case-obs-intel-panel__kicker {
  color: rgba(148, 163, 184, 0.95);
}

.case-obs-intel-panel--current.case-obs-intel-panel--primary .case-obs-intel-title {
  color: #fff;
}

.case-obs-intel-panel--current.case-obs-intel-panel--primary .case-obs-intel-count-badge {
  color: #99f6e4;
  background: color-mix(in srgb, var(--mc-accent) 18%, rgba(255, 255, 255, 0.06));
  border-color: color-mix(in srgb, var(--mc-accent) 32%, rgba(255, 255, 255, 0.12));
}

.case-obs-intel-panel--learn.case-obs-intel-panel--primary {
  background: linear-gradient(
    165deg,
    color-mix(in srgb, #6366f1 10%, #fff) 0%,
    #fff 58%,
    color-mix(in srgb, #6366f1 4%, #fff) 100%
  );
}

.case-obs-intel-panel--learn.case-obs-intel-panel--primary .case-obs-intel-panel__kicker {
  color: #4338ca;
}

.case-obs-intel-panel--secondary {
  padding: 12px 16px;
  background: color-mix(in srgb, var(--foreground, #0f172a) 2%, #fff);
}

.case-obs-intel-panel--secondary .case-obs-intel-title {
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--mc-meta);
}

.case-obs-intel-panel--tertiary {
  padding: 10px 16px 12px;
  background: color-mix(in srgb, var(--foreground, #0f172a) 2.5%, #f8fafc);
}

.case-obs-intel-panel--tertiary .case-obs-intel-title {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--mc-meta);
}

/* ── Empty states ── */
.case-obs-intel-empty-wrap {
  display: grid;
  gap: 8px;
  justify-items: center;
  text-align: center;
  padding: 4px 0;
}

.case-obs-intel-empty-wrap--awaiting {
  padding: 16px 14px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px dashed rgba(255, 255, 255, 0.18);
}

.case-obs-intel-panel--tertiary .case-obs-intel-empty-wrap--awaiting,
.case-obs-intel-panel--learn.case-obs-intel-panel--primary .case-obs-intel-empty-wrap--awaiting {
  background: color-mix(in srgb, var(--mc-accent) 5%, #fff);
  border-color: color-mix(in srgb, var(--mc-accent) 22%, var(--mc-border));
}

.case-obs-intel-empty-icon {
  width: 30px;
  height: 30px;
  color: color-mix(in srgb, var(--mc-accent) 70%, rgba(255, 255, 255, 0.5));
}

.case-obs-intel-empty {
  margin: 0;
  max-width: 36ch;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.45;
  color: rgba(148, 163, 184, 0.95);
}

.case-obs-intel-panel--tertiary .case-obs-intel-empty,
.case-obs-intel-panel--learn .case-obs-intel-empty {
  color: var(--mc-meta);
}

.case-obs-intel-panel--learn.case-obs-intel-panel--primary .case-obs-intel-empty {
  color: var(--mc-ink-soft);
}

/* ── Insight chips (dark hero + light contexts) ── */
.case-obs-intel-chip-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
  width: 100%;
  min-width: 0;
}

.case-obs-intel-chip-grid > li {
  min-width: 0;
  max-width: 100%;
}

.case-obs-intel-group-stack {
  display: grid;
  gap: 10px;
}

.case-obs-intel-generated-summary {
  margin: 0;
  padding: 10px 12px;
  border-radius: 12px;
  color: #f8fafc;
  background: rgba(20, 184, 166, 0.12);
  border: 1px solid rgba(94, 234, 212, 0.18);
  font-size: 13px;
  font-weight: 650;
  line-height: 1.45;
}

.case-obs-intel-group {
  display: grid;
  gap: 7px;
  min-width: 0;
  padding: 10px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.045);
}

.case-obs-intel-group-head {
  display: grid;
  gap: 2px;
}

.case-obs-intel-group-title {
  margin: 0;
  font-size: 11px;
  font-weight: 900;
  line-height: 1.2;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: #f8fafc;
}

.case-obs-intel-group-description {
  margin: 0;
  font-size: 11px;
  font-weight: 600;
  line-height: 1.35;
  color: rgba(203, 213, 225, 0.82);
}

.case-obs-intel-chip-grid--current {
  display: grid;
  grid-template-columns: 1fr;
  gap: 7px;
}

.case-obs-intel-chip-grid--current > li {
  width: 100%;
}

.case-obs-intel-chip {
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 7px;
  max-width: 100%;
  padding: 7px 11px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.25;
  letter-spacing: -0.01em;
  overflow-wrap: anywhere;
}

.case-obs-intel-panel--current.case-obs-intel-panel--primary .case-obs-intel-chip {
  width: 100%;
  justify-content: flex-start;
  color: #f8fafc;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.12);
}

.case-obs-intel-panel--current:not(.case-obs-intel-panel--primary) .case-obs-intel-chip {
  color: var(--mc-ink);
  background: color-mix(in srgb, var(--mc-accent) 8%, #fff);
  border: 1px solid color-mix(in srgb, var(--mc-accent) 18%, var(--mc-border));
}

.case-obs-intel-chip-main {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex: 1 1 auto;
  min-width: 0;
}

.case-obs-intel-chip-dot {
  flex: 0 0 6px;
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: #5eead4;
}

.case-obs-intel-chip-quote {
  display: block;
  margin-top: 4px;
  padding-left: 12px;
  font-size: 12px;
  font-style: italic;
  line-height: 1.4;
  opacity: 0.75;
  overflow-wrap: anywhere;
}

.case-obs-intel-evidence {
  display: contents;
}

.case-obs-intel-evidence[open] {
  display: contents;
}

.case-obs-intel-evidence__summary {
  display: inline-flex;
  align-items: center;
  flex: 0 0 auto;
  margin-left: auto;
  cursor: pointer;
  list-style: none;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: color-mix(in srgb, currentColor 76%, #fff);
}

.case-obs-intel-evidence__summary::-webkit-details-marker {
  display: none;
}

.case-obs-intel-evidence__summary::after {
  content: " +";
  margin-left: 4px;
}

.case-obs-intel-evidence[open] .case-obs-intel-evidence__summary::after {
  content: " -";
}

.case-obs-intel-evidence__body {
  flex: 1 0 100%;
  width: 100%;
  display: grid;
  gap: 8px;
  margin-top: 8px;
  padding: 9px 10px;
  border-radius: 10px;
  background: rgba(15, 23, 42, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.case-obs-intel-evidence__heading {
  margin: 0;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  opacity: 0.82;
}

.case-obs-intel-evidence__item {
  display: grid;
  gap: 4px;
}

.case-obs-intel-evidence__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 0;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  opacity: 0.72;
}

.case-obs-intel-evidence__quote {
  margin: 0;
  font-size: 11px;
  font-style: italic;
  font-weight: 600;
  line-height: 1.45;
  opacity: 0.9;
  overflow-wrap: anywhere;
}

.case-obs-intel-chip--contact .case-obs-intel-chip-dot { background: #f9a8d4; }
.case-obs-intel-chip--product .case-obs-intel-chip-dot { background: #5eead4; }
.case-obs-intel-chip--provider .case-obs-intel-chip-dot { background: #fcd34d; }
.case-obs-intel-chip--workflow .case-obs-intel-chip-dot { background: #c4b5fd; }
.case-obs-intel-chip--staff .case-obs-intel-chip-dot { background: #93c5fd; }
.case-obs-intel-chip--opportunity .case-obs-intel-chip-dot { background: #86efac; }
.case-obs-intel-chip--general .case-obs-intel-chip-dot { background: #94a3b8; }

/* ── Debrief readiness accordion (provider bottom accordion) ── */
.case-obs-intel-readiness {
  border-radius: 14px;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--mc-border) 88%, var(--foreground));
  background: #fff;
  box-shadow: var(--mc-elev-panel);
}

.case-obs-intel-readiness__summary {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  grid-template-areas:
    "title toggle"
    "badge badge";
  gap: 6px 10px;
  align-items: center;
  padding: 11px 14px;
  cursor: pointer;
  list-style: none;
}

.case-obs-intel-readiness__summary::-webkit-details-marker {
  display: none;
}

.case-obs-intel-readiness__title {
  grid-area: title;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--mc-meta);
}

.case-obs-intel-readiness__badge {
  grid-area: badge;
  justify-self: start;
}

.case-obs-intel-readiness__toggle {
  grid-area: toggle;
  font-size: 11px;
  font-weight: 700;
  color: color-mix(in srgb, var(--mc-accent) 78%, var(--mc-ink));
  white-space: nowrap;
}

.case-obs-intel-readiness__toggle::after {
  content: " ▸";
  font-size: 11px;
}

.case-obs-intel-readiness[open] .case-obs-intel-readiness__toggle::after {
  content: " ▾";
}

.case-obs-intel-readiness__body {
  display: grid;
  gap: 14px;
  padding: 0 14px 14px;
  border-top: 1px solid color-mix(in srgb, var(--mc-border) 88%, transparent);
}

.case-obs-intel-readiness__program {
  padding-top: 12px;
  display: grid;
  gap: 7px;
}

.case-obs-intel-readiness__program-count {
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  color: var(--mc-ink);
}

.case-obs-intel-readiness__evidence {
  display: grid;
  gap: 4px;
}

.case-obs-intel-readiness__evidence-headline {
  margin: 0;
  font-size: 14px;
  font-weight: 750;
  color: var(--mc-ink);
}

.case-obs-intel-readiness__next {
  display: grid;
  gap: 4px;
}

.case-obs-intel-readiness__areas {
  display: grid;
  gap: 6px;
}

.case-obs-intel-areas-lead {
  margin: 0;
  font-size: 12px;
  font-weight: 650;
  color: var(--mc-meta);
}

.case-obs-intel-area-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 4px;
}

.case-obs-intel-area-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 6px 10px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--foreground, #0f172a) 3%, #fff);
}

.case-obs-intel-area-label {
  font-size: 12px;
  font-weight: 650;
  line-height: 1.35;
  color: var(--mc-ink-soft);
  min-width: 0;
  overflow-wrap: anywhere;
}

.case-obs-intel-area-status {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  white-space: nowrap;
}

.case-obs-intel-area-status--known {
  color: #047857;
  background: color-mix(in srgb, #10b981 12%, #fff);
  border: 1px solid color-mix(in srgb, #10b981 24%, transparent);
}

.case-obs-intel-area-status--early {
  color: #b45309;
  background: color-mix(in srgb, #f59e0b 12%, #fff);
  border: 1px solid color-mix(in srgb, #f59e0b 22%, transparent);
}

.case-obs-intel-area-status--missing {
  color: var(--mc-meta);
  background: #fff;
  border: 1px dashed color-mix(in srgb, var(--mc-meta) 40%, var(--mc-border));
}

.case-obs-intel-progress {
  height: 6px;
  border-radius: 999px;
  overflow: hidden;
  background: color-mix(in srgb, var(--mc-border) 70%, #fff);
}

.case-obs-intel-progress-fill {
  height: 100%;
  border-radius: 999px;
  transition: width 0.35s cubic-bezier(0.22, 1, 0.36, 1);
  background: linear-gradient(90deg, var(--mc-accent), color-mix(in srgb, var(--mc-accent) 65%, #fff));
}

.case-obs-intel-goal {
  margin: 0;
  font-size: 12px;
  line-height: 1.45;
  color: var(--mc-meta);
}

.case-obs-intel-goal-label {
  display: block;
  margin-bottom: 2px;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--mc-meta);
}

.case-obs-intel-readiness__section-label {
  margin: 0 0 5px;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--mc-meta);
}

.case-obs-intel-gap-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 4px;
}

.case-obs-intel-gap-item {
  margin: 0;
  padding: 6px 10px 6px 18px;
  font-size: 12px;
  line-height: 1.38;
  color: var(--mc-ink-soft);
  position: relative;
  background: color-mix(in srgb, var(--foreground, #0f172a) 3%, #fff);
  border-radius: 8px;
}

.case-obs-intel-gap-item::before {
  content: "";
  position: absolute;
  left: 8px;
  top: 0.72em;
  width: 4px;
  height: 4px;
  border-radius: 999px;
  background: #94a3b8;
}

.case-obs-intel-readiness__detail {
  margin: 0;
  font-size: 13px;
  line-height: 1.45;
  color: var(--mc-ink);
  font-weight: 650;
}

.case-obs-intel-readiness__actions {
  padding-top: 4px;
}

.case-obs-intel-generate-btn {
  width: 100%;
}

@media (min-width: 640px) {
  .case-obs-intel-readiness__summary {
    grid-template-columns: auto minmax(0, 1fr) auto;
    grid-template-areas: "title badge toggle";
    align-items: center;
  }

  .case-obs-intel-readiness__badge {
    justify-self: center;
  }

  .case-obs-intel-generate-btn {
    width: auto;
    min-width: 220px;
  }
}

@media (max-width: 639px) {
  .case-obs-intel {
    gap: 10px;
  }

  .case-obs-intel-command__surface {
    padding: 12px 14px;
  }

  .case-obs-intel-panel--primary .case-obs-intel-title {
    font-size: 15px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .case-obs-intel-progress-fill {
    transition: none;
  }
}
`;
