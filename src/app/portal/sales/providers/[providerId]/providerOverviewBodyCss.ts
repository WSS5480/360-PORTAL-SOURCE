import { discoveryProgressChecklistCss } from "../discoveryProgressChecklistCss";
import { observationProgressPanelCss } from "../observationProgressPanelCss";
import { evaluationPathPanelCss } from "../evaluationPathPanelCss";
import { providerOverviewStateTokensCss } from "./providerOverviewStateTokens";

/** Provider overview — 3-zone operational briefing layout. */
export const providerOverviewBodyCss = `
${providerOverviewStateTokensCss}
${discoveryProgressChecklistCss}
${observationProgressPanelCss}
${evaluationPathPanelCss}

.pov-body {
  --pov-content-pad: clamp(6px, 1vw, 14px);
  --pov-page-bg: #dfe5ed;
  --pov-surface: #ffffff;
  --pov-ops-bg: linear-gradient(165deg, #e4eaf2 0%, #f0f4f9 38%, #f8fafc 100%);
  --pov-ops-panel: rgba(255, 255, 255, 0.72);
  --pov-intel-bg: linear-gradient(180deg, #121a28 0%, #1a2436 48%, #152030 100%);
  --pov-intel-surface: rgba(255, 255, 255, 0.04);
  --pov-support-bg: linear-gradient(180deg, #ffffff 0%, #f6f9fc 55%, #eef3f8 100%);
  --pov-border: #c9d2df;
  --pov-border-soft: rgba(15, 23, 42, 0.08);
  --pov-ink: #0b1220;
  --pov-navy: #0f172a;
  --pov-ink-soft: #334155;
  --pov-meta: #64748b;
  --pov-teal: #0d9488;
  --pov-teal-deep: #0f766e;
  --pov-hero-accent: #0d9488;
  --pov-hero-bg: linear-gradient(152deg, #0a0f1a 0%, #0f172a 42%, #162033 100%);
  --pov-hero-muted: #94a3b8;
  --pov-support-width: clamp(280px, 34%, 380px);
  /* Visual hierarchy elevations (hero → rail → ops → intel → detail) */
  --pov-elev-hero: 0 14px 44px rgba(15, 23, 42, 0.16);
  --pov-elev-rail: 0 6px 20px rgba(15, 23, 42, 0.1);
  --pov-elev-ops: 0 1px 2px rgba(15, 23, 42, 0.05);
  --pov-elev-layout: 0 6px 24px rgba(15, 23, 42, 0.06);
  width: 100%;
  max-width: none;
  margin: 0;
  padding: 0 0 clamp(12px, 2vw, 20px);
  color: var(--pov-ink-soft);
  font-size: 14px;
  line-height: 1.45;
}

.pov-body[data-stage="discovery"] { --pov-hero-accent: #2563eb; }
.pov-body[data-stage="observe"] { --pov-hero-accent: #0d9488; }
.pov-body[data-stage="debrief"] { --pov-hero-accent: #9333ea; }
.pov-body[data-stage="evaluation"] { --pov-hero-accent: #06b6d4; }
.pov-body[data-stage="commitment"] { --pov-hero-accent: #16a34a; }
.pov-body[data-stage="outcomes"] { --pov-hero-accent: #ca8a04; }

.pov-pathway-track__segment[data-segment="discovery"] { --pov-stage-accent: #2563eb; }
.pov-pathway-track__segment[data-segment="observe"] { --pov-stage-accent: #0d9488; }
.pov-pathway-track__segment[data-segment="debrief"] { --pov-stage-accent: #9333ea; }
.pov-pathway-track__segment[data-segment="evaluation"] { --pov-stage-accent: #06b6d4; }
.pov-pathway-track__segment[data-segment="commitment"] { --pov-stage-accent: #16a34a; }
.pov-pathway-track__segment[data-segment="outcomes"] { --pov-stage-accent: #ca8a04; }

.pov-body *,
.pov-body *::before,
.pov-body *::after {
  box-sizing: border-box;
}

.pov-body--briefing,
.pov-body--pathway,
.pov-body--tactical {
  max-width: none;
  width: 100%;
}

.provider-profile-root--command-center .provider-profile-body:has(.pov-body--briefing),
.provider-profile-root--command-center .provider-profile-body:has(.pov-body--pathway),
.provider-profile-root--command-center .provider-profile-body:has(.pov-body--tactical),
.provider-profile-root--command-center .provider-profile-body:has(.pov-body--command-center) {
  background: var(--pov-page-bg);
  padding: 4px var(--pov-content-pad) calc(16px + env(safe-area-inset-bottom, 0px));
  max-width: none;
}

.provider-profile-root--command-center .provider-profile-body:has(.pov-body--briefing) > *,
.provider-profile-root--command-center .provider-profile-body:has(.pov-body--pathway) > *,
.provider-profile-root--command-center .provider-profile-body:has(.pov-body--tactical) > *,
.provider-profile-root--command-center .provider-profile-body:has(.pov-body--command-center) > * {
  max-width: none;
  width: 100%;
}

.pov-workspace {
  width: 100%;
  max-width: none;
}

/* ── 3-zone briefing grid ── */
.pov-briefing-layout {
  display: grid;
  width: 100%;
  max-width: none;
  grid-template-columns: 1fr;
  grid-template-areas:
    "command"
    "bottom";
  gap: 0;
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, #0f172a 10%, var(--pov-border));
  box-shadow: var(--pov-elev-layout);
}

.pov-zone-section__title {
  margin: 0 0 12px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--pov-navy);
}

.pov-zone-section__title--intel {
  color: #e8eef6;
  letter-spacing: 0.11em;
}

/* ═══ ZONE 1: Command header + mission summary (full width) ═══ */
.pov-command-stack {
  grid-area: command;
  width: 100%;
  position: relative;
  z-index: 3;
  display: flex;
  flex-direction: column;
}

.pov-command-header {
  width: 100%;
  box-shadow: var(--pov-elev-hero);
}

.pov-command-header__surface {
  background: var(--pov-hero-bg);
  color: #f8fafc;
  padding: clamp(10px, 1.4vw, 16px) clamp(12px, 1.8vw, 22px);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.pov-command-header__hero {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.pov-command-header__hero-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.pov-command-header__goal {
  margin: 0;
  font-size: 13px;
  line-height: 1.4;
  color: rgba(226, 232, 240, 0.92);
  max-width: 52ch;
}

.pov-command-header__execution {
  display: grid;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 10px;
  background: color-mix(in srgb, #fff 4%, rgba(15, 23, 42, 0.35));
  border: 1px solid rgba(255, 255, 255, 0.1);
}

@media (min-width: 720px) {
  .pov-command-header__execution {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: 14px;
  }
}

.pov-command-header__exec-block {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.pov-command-header__exec-label {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(148, 163, 184, 0.95);
}

.pov-command-header__exec-value {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.35;
  color: #f8fafc;
}

.pov-command-header__exec-value--emphasis {
  font-size: 14px;
  font-weight: 700;
}

.pov-command-header__exec-value--muted {
  color: rgba(148, 163, 184, 0.85);
  font-weight: 500;
}

.pov-command-header__exec-meta {
  margin: 0;
  font-size: 11px;
  color: rgba(148, 163, 184, 0.95);
}

.pov-command-header__exec-cta {
  display: inline-flex;
  align-self: flex-start;
  margin-top: 4px;
  padding: 5px 10px;
  border-radius: 7px;
  font-size: 11px;
  font-weight: 700;
  text-decoration: none;
  color: #0f172a;
  background: #f8fafc;
}

.pov-command-header__exec-cta:hover {
  background: #e2e8f0;
}

.pov-command-header__exec-actions {
  margin-top: 6px;
}

.pov-command-header__stage-details {
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.03);
}

.pov-command-header__stage-details-summary {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  cursor: pointer;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: rgba(148, 163, 184, 0.95);
  list-style: none;
}

.pov-command-header__stage-details-summary::-webkit-details-marker {
  display: none;
}

.pov-command-header__stage-details-badge {
  margin-left: auto;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0;
  text-transform: none;
  color: #e2e8f0;
}

.pov-command-header__stage-details-body {
  padding: 0 10px 10px;
}

.pov-pathway-track--dots-only .pov-pathway-track__list,
.pov-pathway-track--dots-only .pov-pathway-track__compact-line {
  display: none;
}

.pov-pathway-track--dots-only .pov-pathway-track__compact {
  margin: 0;
}

.pov-exec-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.pov-exec-actions__primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 7px 12px;
  border-radius: 8px;
  border: none;
  font-size: 12px;
  font-weight: 700;
  text-decoration: none;
  cursor: pointer;
  color: #0f172a;
  background: #f8fafc;
}

.pov-exec-actions__primary--debrief {
  background: color-mix(in srgb, #f59e0b 88%, #fff);
}

.pov-exec-actions__secondary {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.pov-exec-actions__secondary-btn {
  padding: 5px 9px;
  border-radius: 7px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  background: transparent;
  font-size: 11px;
  font-weight: 600;
  color: #e2e8f0;
  text-decoration: none;
  cursor: pointer;
}

.pov-exec-actions__more {
  padding: 4px 8px;
  border: none;
  background: transparent;
  font-size: 10px;
  font-weight: 600;
  color: rgba(148, 163, 184, 0.95);
  cursor: pointer;
}

.pov-exec-actions__more-panel {
  flex-basis: 100%;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-top: 4px;
}

.pov-exec-actions__more-link {
  padding: 0;
  border: none;
  background: transparent;
  font-size: 11px;
  font-weight: 600;
  color: #cbd5e1;
  text-decoration: none;
  text-align: left;
  cursor: pointer;
}

.pov-supporting-stack {
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--pov-border) 88%, var(--foreground));
  background: var(--pov-surface);
  overflow: hidden;
}

.pov-supporting-stack__summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 9px 12px;
  cursor: pointer;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--pov-navy) 82%, var(--foreground));
  list-style: none;
}

.pov-supporting-stack__summary::-webkit-details-marker {
  display: none;
}

.pov-supporting-stack__summary::after {
  content: "▸";
  font-size: 11px;
  font-weight: 700;
  color: var(--pov-meta);
}

.pov-supporting-stack[open] > .pov-supporting-stack__summary::after {
  content: "▾";
}

.pov-supporting-stack__body {
  padding: 0 12px 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  border-top: 1px solid var(--pov-border-soft);
}

.pov-supporting-stack__section-label {
  margin: 0 0 6px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--pov-meta);
}

.pov-supporting-stack__unknowns {
  margin: 0;
  padding: 0 0 0 14px;
  list-style: disc;
  font-size: 12px;
  line-height: 1.4;
}

.pov-supporting-stack__unknown-btn {
  padding: 0;
  border: none;
  background: transparent;
  font: inherit;
  color: inherit;
  text-align: left;
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.pov-supporting-stack__sections {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.pov-supporting-subsection__title {
  margin: 0 0 6px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--pov-meta);
}

.pov-supporting-subsection + .pov-supporting-subsection {
  padding-top: 12px;
  border-top: 1px solid var(--pov-border-soft);
}

.pov-command-header__grid {
  display: grid;
  gap: clamp(14px, 1.6vw, 20px);
  align-items: start;
}

@media (min-width: 900px) {
  .pov-command-header__grid {
    grid-template-columns: minmax(0, 1.5fr) minmax(260px, 1fr);
    gap: clamp(16px, 2vw, 24px);
  }
}

.pov-command-header__left {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
}

.pov-command-header__right {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
  padding: clamp(12px, 1.4vw, 16px);
  border-radius: 12px;
  background: color-mix(in srgb, #fff 4%, rgba(15, 23, 42, 0.35));
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);
}

.pov-command-header__confidence-row {
  margin-top: 6px;
}

.pov-command-header__confidence {
  display: inline-flex;
  align-items: center;
  padding: 3px 9px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #e2e8f0;
  background: color-mix(in srgb, var(--pov-hero-accent) 22%, rgba(15, 23, 42, 0.5));
  border: 1px solid color-mix(in srgb, var(--pov-hero-accent) 40%, rgba(255, 255, 255, 0.12));
}

.pov-command-header__focus {
  padding: 8px 10px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.pov-command-header__focus-label {
  margin: 0 0 4px;
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(148, 163, 184, 0.95);
}

.pov-command-header__focus-value {
  margin: 0;
  font-size: 13px;
  font-weight: 500;
  line-height: 1.4;
  color: #f8fafc;
}

.pov-command-header__blockers {
  padding: 8px 10px;
  border-radius: 8px;
  background: color-mix(in srgb, #f59e0b 8%, rgba(15, 23, 42, 0.4));
  border: 1px solid color-mix(in srgb, #f59e0b 22%, rgba(255, 255, 255, 0.1));
}

.pov-command-header__blockers-label {
  margin: 0 0 6px;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(253, 230, 138, 0.9);
}

.pov-command-header__blockers-list {
  margin: 0;
  padding: 0 0 0 1.1em;
  list-style: disc;
}

.pov-command-header__blockers-list li {
  font-size: 12px;
  font-weight: 500;
  line-height: 1.38;
  color: #fef3c7;
}

.pov-command-header__blockers-list li + li {
  margin-top: 3px;
}

.pov-command-header__recommended {
  padding: 10px 12px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--pov-hero-accent) 12%, rgba(15, 23, 42, 0.45));
  border: 1px solid color-mix(in srgb, var(--pov-hero-accent) 28%, rgba(255, 255, 255, 0.1));
}

.pov-command-header__recommended-label {
  margin: 0 0 4px;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(148, 163, 184, 0.95);
}

.pov-command-header__recommended-value {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.4;
  color: #99f6e4;
}

.pov-command-header__rail {
  margin-top: 2px;
}

.pov-command-header__rail .pov-rail--embedded {
  padding: 0;
  background: transparent;
  border: none;
  box-shadow: none;
}

.pov-command-header__mast {
  margin-bottom: 0;
}

.pov-command-header__kicker {
  margin: 0 0 6px;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--pov-hero-muted);
}

.pov-command-header__title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  flex-wrap: wrap;
}

.pov-command-header__stage {
  margin: 0;
  font-size: clamp(1.85rem, 3.2vw, 2.65rem);
  font-weight: 600;
  letter-spacing: -0.035em;
  line-height: 1.02;
  color: #fff;
}

.pov-command-header__progress {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.pov-command-header__progress-value {
  font-size: 12px;
  font-weight: 600;
  color: var(--pov-hero-muted);
  font-variant-numeric: tabular-nums;
}

.pov-command-header__progress-bar {
  width: 88px;
  height: 4px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.14);
  overflow: hidden;
}

.pov-command-header__progress-fill {
  display: block;
  height: 100%;
  background: var(--pov-hero-accent);
  border-radius: inherit;
}

.pov-command-header__mission {
  margin: 8px 0 0;
  max-width: 72ch;
  font-size: clamp(13px, 1.3vw, 15px);
  font-weight: 400;
  line-height: 1.5;
  color: #cbd5e1;
}

.pov-command-header__pathway {
  padding: 6px 0 2px;
  margin: 0;
}

.pov-command-header .pov-pathway-track {
  width: 100%;
  overflow: visible;
}

.pov-pathway-track__compact {
  display: none;
}

.pov-pathway-track__scroll {
  overflow: visible;
}

.pov-command-header .pov-pathway-track__list {
  margin: 0;
  padding: 4px 0 0;
  list-style: none;
  display: flex;
  align-items: flex-start;
  width: 100%;
  min-width: 0;
  overflow: visible;
}

.pov-command-header .pov-pathway-track__segment {
  display: flex;
  align-items: flex-start;
  flex: 1 1 0;
  min-width: 0;
}

.pov-command-header .pov-pathway-track__segment:last-child {
  flex: 0 0 auto;
}

.pov-command-header .pov-pathway-track__step {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-shrink: 0;
  gap: 6px;
  min-width: 0;
  max-width: 100%;
}

.pov-command-header .pov-pathway-track__marker {
  flex-shrink: 0;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.14);
  border: 1.5px solid rgba(255, 255, 255, 0.28);
  box-shadow: none;
  transition: box-shadow 0.2s ease;
}

.pov-command-header .pov-pathway-track__label {
  display: block;
  width: max-content;
  max-width: 100%;
  padding: 0 1px;
  font-size: clamp(7px, 0.72vw, 9px);
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  text-align: center;
  line-height: 1.25;
  color: rgba(255, 255, 255, 0.3);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pov-command-header .pov-pathway-track__connector {
  flex: 1 1 auto;
  min-width: 6px;
  height: 2px;
  margin: 4px 4px 0;
  align-self: flex-start;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.1);
}

.pov-command-header .pov-pathway-track__step--complete .pov-pathway-track__marker {
  background: color-mix(in srgb, #14b8a6 75%, #fff);
  border-color: color-mix(in srgb, #14b8a6 85%, #fff);
  box-shadow: 0 0 6px color-mix(in srgb, #14b8a6 40%, transparent);
}

.pov-command-header .pov-pathway-track__step--complete .pov-pathway-track__label {
  color: rgba(255, 255, 255, 0.72);
}

.pov-command-header .pov-pathway-track__connector--complete {
  background: linear-gradient(
    90deg,
    color-mix(in srgb, #14b8a6 75%, transparent),
    color-mix(in srgb, #14b8a6 40%, rgba(255, 255, 255, 0.12))
  );
}

.pov-command-header .pov-pathway-track__connector--current {
  background: linear-gradient(
    90deg,
    color-mix(in srgb, var(--pov-hero-accent) 70%, transparent),
    rgba(255, 255, 255, 0.12)
  );
}

.pov-command-header .pov-pathway-track__step--current .pov-pathway-track__marker {
  width: 11px;
  height: 11px;
  margin-top: -1px;
  background: var(--pov-hero-accent);
  border-color: #fff;
  box-shadow:
    0 0 0 3px color-mix(in srgb, var(--pov-hero-accent) 32%, transparent),
    0 0 14px color-mix(in srgb, var(--pov-hero-accent) 55%, transparent);
}

.pov-command-header .pov-pathway-track__step--current .pov-pathway-track__label {
  color: #fff;
  font-weight: 700;
  font-size: clamp(7px, 0.78vw, 10px);
  letter-spacing: 0.07em;
}

.pov-command-header .pov-pathway-track__step--upcoming .pov-pathway-track__marker {
  background: transparent;
  border-color: rgba(255, 255, 255, 0.18);
}

.pov-command-header .pov-pathway-track__step--upcoming .pov-pathway-track__label {
  color: rgba(255, 255, 255, 0.22);
}

.pov-command-header .pov-pathway-track__connector--upcoming {
  background: rgba(255, 255, 255, 0.1);
}

@media (min-width: 721px) and (max-width: 1100px) {
  .pov-command-header .pov-pathway-track__label {
    font-size: 7px;
    letter-spacing: 0.05em;
  }

  .pov-command-header .pov-pathway-track__connector {
    margin: 4px 2px 0;
  }
}

.pov-command-header__telemetry {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
  border-top: none;
  padding-top: 0;
}

.pov-command-header__telemetry-cell {
  padding: 0;
  border-right: none;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  padding-bottom: 10px;
}

.pov-command-header__telemetry-cell:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.pov-command-header__telemetry-value--emphasis {
  font-weight: 600;
  color: #fff;
  font-size: 14px;
  line-height: 1.35;
}

.pov-command-header__telemetry-label {
  margin: 0 0 4px;
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(148, 163, 184, 0.95);
}

.pov-command-header__telemetry-value {
  margin: 0;
  font-size: 13px;
  font-weight: 500;
  line-height: 1.38;
  color: #f1f5f9;
}

.pov-command-header__telemetry-value--muted {
  color: rgba(148, 163, 184, 0.9);
}

.pov-command-header__telemetry-meta {
  margin: 3px 0 0;
  font-size: 10px;
  color: rgba(148, 163, 184, 0.95);
}

.pov-command-header__engagement-cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-top: 8px;
  min-height: 34px;
  padding: 7px 12px;
  border-radius: 7px;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.2;
  text-decoration: none;
  color: var(--pov-navy);
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid color-mix(in srgb, var(--pov-border) 80%, transparent);
  transition: filter 0.15s ease, transform 0.12s ease;
}

.pov-command-header__engagement-cta:hover {
  filter: brightness(1.03);
  transform: translateY(-1px);
}

.pov-command-header__engagement-cta--debrief {
  color: #fff;
  background: linear-gradient(
    165deg,
    color-mix(in srgb, var(--pov-hero-accent) 88%, #fff) 0%,
    color-mix(in srgb, var(--pov-hero-accent) 55%, var(--pov-navy)) 42%,
    var(--pov-navy) 100%
  );
  border-color: color-mix(in srgb, var(--pov-hero-accent) 50%, #0f172a);
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.12) inset,
    0 4px 14px color-mix(in srgb, var(--pov-hero-accent) 30%, rgba(15, 23, 42, 0.22));
}

.pov-command-header__mobile-next,
.pov-command-header__mobile-cta {
  display: none;
}

/* ═══ ZONE 2: Connected operational workspace ═══ */
.pov-zone-ops-main {
  grid-area: ops-main;
  min-width: 0;
  padding: clamp(12px, 1.4vw, 16px) clamp(14px, 1.8vw, 22px);
  background: #e8edf3;
  border-right: 1px solid color-mix(in srgb, var(--pov-border) 70%, #fff);
  position: relative;
  z-index: 1;
}

.pov-ops-pathway {
  background: rgba(255, 255, 255, 0.88);
  border: 1px solid color-mix(in srgb, var(--pov-border) 75%, transparent);
  border-radius: 10px;
  overflow: hidden;
  box-shadow: var(--pov-elev-ops);
  min-width: 0;
}

.pov-ops-pathway__head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: clamp(14px, 1.4vw, 16px) clamp(16px, 1.8vw, 20px);
  border-bottom: 1px solid var(--pov-border-soft);
  background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
}

.pov-ops-pathway__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  color: var(--pov-teal, #0d9488);
  background: color-mix(in srgb, var(--pov-teal, #0d9488) 12%, #fff);
  border: 1px solid color-mix(in srgb, var(--pov-teal, #0d9488) 22%, transparent);
}

.pov-ops-pathway__title {
  margin: 0;
  padding: 0;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--pov-navy);
  background: transparent;
  border-bottom: none;
}

.pov-ops-pathway__purpose {
  margin: 6px 0 0;
  font-size: 12px;
  font-weight: 500;
  line-height: 1.45;
  color: var(--pov-ink-soft);
}

.pov-ops-readiness-grid {
  display: grid;
  gap: 10px;
  padding: 12px;
  background: color-mix(in srgb, #e2e8f0 35%, transparent);
}

@media (min-width: 900px) {
  .pov-ops-readiness-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
  }
}

.pov-ops-readiness-card {
  display: flex;
  flex-direction: column;
  gap: 0;
  min-width: 0;
  border-radius: 12px;
  border: 1px solid color-mix(in srgb, var(--pov-border) 70%, #cbd5e1);
  background: #fff;
  box-shadow:
    0 1px 2px rgba(15, 23, 42, 0.05),
    0 8px 24px rgba(15, 23, 42, 0.04);
  overflow: hidden;
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease,
    transform 0.15s ease;
}

.pov-ops-readiness-card:hover {
  border-color: color-mix(in srgb, var(--pov-teal, #0d9488) 32%, var(--pov-border));
  box-shadow:
    0 2px 4px rgba(15, 23, 42, 0.06),
    0 12px 28px rgba(15, 23, 42, 0.07);
}

.pov-ops-readiness-card--expanded {
  border-color: color-mix(in srgb, var(--pov-teal, #0d9488) 40%, var(--pov-border));
}

.pov-ops-readiness-card--constrained {
  border-color: color-mix(in srgb, #f87171 45%, var(--pov-border));
}

.pov-ops-readiness-card__mast {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 12px 8px;
  background: linear-gradient(180deg, #fff 0%, #f8fafc 100%);
  border-bottom: 1px solid var(--pov-border-soft);
}

.pov-ops-readiness-card__summary {
  margin: 0;
  padding: 0 12px 8px;
  font-size: 11px;
  font-weight: 500;
  line-height: 1.35;
  color: #64748b;
}

.pov-ops-readiness-card__identity {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  min-width: 0;
}

.pov-ops-readiness-card__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  margin-top: 0;
  border-radius: 7px;
  color: var(--pov-teal, #0d9488);
  background: color-mix(in srgb, var(--pov-teal, #0d9488) 10%, #fff);
  border: 1px solid color-mix(in srgb, var(--pov-teal, #0d9488) 18%, transparent);
}

.pov-ops-readiness-card--constrained .pov-ops-readiness-card__icon {
  color: #b45309;
  background: #fff7ed;
  border-color: #fed7aa;
}

.pov-ops-readiness-card__headings {
  min-width: 0;
}

.pov-ops-readiness-card__title {
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: -0.01em;
  line-height: 1.25;
  color: #0f172a;
  text-transform: none;
}

.pov-ops-readiness-card__subtitle {
  margin: 3px 0 0;
  font-size: 11px;
  font-weight: 500;
  line-height: 1.35;
  color: #64748b;
}

.pov-ops-readiness-card__progress {
  flex-shrink: 0;
  padding: 4px 8px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  color: var(--pov-teal, #0d9488);
  background: color-mix(in srgb, var(--pov-teal, #0d9488) 10%, #fff);
  border: 1px solid color-mix(in srgb, var(--pov-teal, #0d9488) 22%, transparent);
}

.pov-ops-readiness-card--constrained .pov-ops-readiness-card__progress {
  color: #b91c1c;
  background: #fef2f2;
  border-color: #fecaca;
}

.pov-ops-readiness-card__blockers-panel {
  margin: 8px 10px 0;
  padding: 8px 10px;
  border-radius: 8px;
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-left: 3px solid #f59e0b;
}

.pov-ops-readiness-card--constrained .pov-ops-readiness-card__blockers-panel {
  background: #fef2f2;
  border-color: #fecaca;
  border-left-color: #ef4444;
}

.pov-ops-readiness-card__blockers-head {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
}

.pov-ops-readiness-card__blockers-icon {
  flex-shrink: 0;
  color: #b45309;
}

.pov-ops-readiness-card--constrained .pov-ops-readiness-card__blockers-icon {
  color: #dc2626;
}

.pov-ops-readiness-card__section-label {
  margin: 0;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #92400e;
}

.pov-ops-readiness-card--constrained .pov-ops-readiness-card__section-label {
  color: #b91c1c;
}

.pov-ops-readiness-card__blockers {
  margin: 0;
  padding: 0;
  list-style: none;
}

.pov-ops-readiness-card__blockers li {
  position: relative;
  padding-left: 14px;
  font-size: 11px;
  font-weight: 600;
  line-height: 1.4;
  color: #334155;
}

.pov-ops-readiness-card__blockers li::before {
  content: "";
  position: absolute;
  left: 0;
  top: 0.55em;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #f59e0b;
}

.pov-ops-readiness-card--constrained .pov-ops-readiness-card__blockers li::before {
  background: #ef4444;
}

.pov-ops-readiness-card__blockers li + li {
  margin-top: 6px;
}

.pov-ops-readiness-card__actions {
  display: flex;
  flex-direction: column;
  gap: 0;
  padding: 10px 10px 8px;
}

.pov-ops-readiness-card__primary {
  display: block;
  width: 100%;
  margin: 0;
  padding: 8px 12px;
  border: none;
  border-radius: 9px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.01em;
  color: #fff;
  background: linear-gradient(180deg, #0f766e 0%, #0d9488 100%);
  box-shadow: 0 1px 2px rgba(15, 118, 110, 0.35);
  cursor: pointer;
  transition:
    filter 0.15s ease,
    box-shadow 0.15s ease;
}

.pov-ops-readiness-card__primary:hover:not(:disabled) {
  filter: brightness(1.06);
  box-shadow: 0 4px 12px rgba(13, 148, 136, 0.28);
}

.pov-ops-readiness-card__primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  box-shadow: none;
}

.pov-ops-readiness-card__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.pov-ops-readiness-chip {
  margin: 0;
  padding: 5px 10px;
  border: 1px solid color-mix(in srgb, var(--pov-teal, #0d9488) 45%, #cbd5e1);
  border-radius: 999px;
  background: #fff;
  font-size: 11px;
  font-weight: 600;
  line-height: 1.2;
  color: #0f766e;
  cursor: pointer;
  transition:
    background 0.12s ease,
    border-color 0.12s ease,
    color 0.12s ease;
}

.pov-ops-readiness-chip:hover:not(:disabled) {
  background: color-mix(in srgb, var(--pov-teal, #0d9488) 8%, #fff);
  border-color: var(--pov-teal, #0d9488);
  color: #0d9488;
}

.pov-ops-readiness-chip:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.pov-ops-readiness-card__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 10px 10px;
  margin-top: auto;
  border-top: 1px solid var(--pov-border-soft);
  background: #f8fafc;
}

.pov-ops-readiness-card__link {
  margin: 0;
  padding: 0;
  border: none;
  background: none;
  font-size: 11px;
  font-weight: 600;
  color: #64748b;
  text-decoration: none;
  cursor: pointer;
  transition: color 0.12s ease;
}

.pov-ops-readiness-card__link:hover {
  color: #0f172a;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.pov-ops-readiness-card__panel {
  padding: 10px 12px 14px;
  display: grid;
  gap: 6px;
  background: #f8fafc;
  border-top: 1px solid var(--pov-border-soft);
}

.pov-ops-readiness-signal {
  display: grid;
  gap: 2px;
  padding: 8px 10px;
  border-radius: 6px;
  background: #fff;
  border: 1px solid var(--pov-border-soft);
}

.pov-ops-readiness-signal__topic {
  font-size: 11px;
  font-weight: 700;
  color: #0f172a;
}

.pov-ops-readiness-signal__meta {
  font-size: 10px;
  line-height: 1.35;
  font-weight: 500;
  color: #94a3b8;
}

.pov-ops-readiness-signal__contact {
  font-size: 10px;
  font-weight: 500;
  color: #64748b;
}

.pov-ops-legacy-rows {
  list-style: none;
  margin: 0;
  padding: 0;
}

.pov-ops-legacy-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 0;
  border-bottom: 1px solid var(--pov-border-soft);
  font-size: 13px;
}

.pov-ops-legacy-row:last-child {
  border-bottom: none;
}

.pov-ops-legacy-row__label {
  color: var(--pov-navy);
  font-weight: 500;
}

.pov-ops-legacy-row__marker {
  color: var(--pov-meta);
  font-weight: 700;
}

.pov-ops-pathway__priorities {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0;
  border-bottom: 1px solid var(--pov-border-soft);
  background: rgba(255, 255, 255, 0.5);
}

@media (min-width: 720px) {
  .pov-ops-pathway__priorities {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.pov-ops-pathway__priority {
  padding: clamp(14px, 1.5vw, 18px) clamp(16px, 1.8vw, 20px);
  min-width: 0;
}

.pov-ops-pathway__priority + .pov-ops-pathway__priority {
  border-top: 1px solid var(--pov-border-soft);
}

@media (min-width: 720px) {
  .pov-ops-pathway__priority + .pov-ops-pathway__priority {
    border-top: none;
    border-left: 1px solid var(--pov-border-soft);
  }
}

.pov-ops-pathway__priority-label {
  display: block;
  margin-bottom: 5px;
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: var(--pov-meta);
}

.pov-ops-pathway__priority-value {
  margin: 0;
  font-size: clamp(13px, 1.4vw, 14px);
  font-weight: 600;
  line-height: 1.4;
  color: var(--pov-navy);
}

.pov-ops-pathway__section {
  padding: clamp(12px, 1.3vw, 14px) clamp(14px, 1.6vw, 18px);
  border-top: 1px solid var(--pov-border-soft);
}

.pov-ops-pathway__section-title {
  margin: 0 0 8px;
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--pov-meta);
}

.pov-ops-pathway__section-purpose,
.pov-ops-pathway__group-summary,
.pov-discovery-block-purpose {
  margin: -4px 0 10px;
  font-size: 12px;
  line-height: 1.45;
  color: var(--pov-ink-soft);
}

.pov-ops-pathway__section--locked {
  background: transparent;
  padding-top: 10px;
  padding-bottom: 12px;
}

.pov-ops-pathway__locked-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px 16px;
}

@media (max-width: 520px) {
  .pov-ops-pathway__locked-list {
    grid-template-columns: 1fr;
  }
}

.pov-ops-pathway__locked-item {
  position: relative;
  padding-left: 10px;
  font-size: 12px;
  line-height: 1.35;
  font-weight: 400;
  color: #94a3b8;
}

.pov-ops-pathway__locked-item::before {
  content: "";
  position: absolute;
  left: 0;
  top: 0.55em;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--pov-meta) 70%, transparent);
}

.pov-ops-rows {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0;
}

.pov-ops-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px 12px;
  padding: 8px 0;
  border-bottom: 1px solid var(--pov-border-soft);
  font-size: 13px;
  line-height: 1.35;
}

.pov-ops-row:last-child {
  border-bottom: none;
}

.pov-ops-pathway__early-prep-hint {
  margin: 0 0 8px;
  padding: 0 0 0 8px;
  font-size: 11px;
  line-height: 1.4;
  font-weight: 500;
  color: var(--pov-meta);
}

.pov-ops-rows--secondary .pov-ops-row {
  opacity: 0.92;
}

.pov-ops-pathway__section--clinical {
  background: transparent;
  padding-top: 10px;
}

.pov-ops-pathway__section--clinical .pov-ops-pathway__section-title {
  color: #94a3b8;
}

.pov-ops-row__label {
  color: var(--pov-ink);
  font-weight: 500;
  font-size: 13px;
}

.pov-ops-pill {
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.02em;
  line-height: 1.25;
  white-space: nowrap;
  border: 1px solid transparent;
}

.pov-ops-pill--approved,
.pov-ops-pill--confirmed,
.pov-ops-pill--validated,
.pov-ops-pill--mapped,
.pov-ops-pill--confirmed_champion,
.pov-ops-pill--strong,
.pov-ops-pill--high,
.pov-ops-pill--complete {
  color: #065f46;
  background: #ecfdf5;
  border-color: #a7f3d0;
}

.pov-ops-pill--interested,
.pov-ops-pill--identified,
.pov-ops-pill--partially_known,
.pov-ops-pill--partially_understood,
.pov-ops-pill--partially_observed,
.pov-ops-pill--partially_mapped,
.pov-ops-pill--potential,
.pov-ops-pill--potential_champion,
.pov-ops-pill--moderate,
.pov-ops-pill--partial {
  color: #92400e;
  background: #fffbeb;
  border-color: #fde68a;
}

.pov-ops-pill--pending,
.pov-ops-pill--unknown,
.pov-ops-pill--not_observed,
.pov-ops-pill--open {
  color: #1e40af;
  background: #eff6ff;
  border-color: #bfdbfe;
}

.pov-ops-pill--declined,
.pov-ops-pill--low,
.pov-ops-pill--blocked {
  color: #9f1239;
  background: #fff1f2;
  border-color: #fecdd3;
}

.pov-ops-row__trail {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 6px 8px;
  min-width: 0;
}

.pov-ops-row__actions {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 2px 0;
  max-width: 100%;
}

.pov-ops-row__action {
  margin: 0;
  padding: 0 0 0 10px;
  border: none;
  background: transparent;
  font-size: 11px;
  font-weight: 600;
  line-height: 1.25;
  color: var(--brand-600, #2563eb);
  cursor: pointer;
  text-decoration: none;
  white-space: nowrap;
  position: relative;
}

.pov-ops-row__action + .pov-ops-row__action::before {
  content: "";
  position: absolute;
  left: 4px;
  top: 50%;
  width: 2px;
  height: 2px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--pov-meta) 70%, transparent);
  transform: translateY(-50%);
}

.pov-ops-row__action:hover:not(:disabled) {
  color: var(--brand-700, #1d4ed8);
  text-decoration: underline;
  text-underline-offset: 2px;
}

.pov-ops-row__action:disabled {
  opacity: 0.45;
  cursor: wait;
}

.pov-ops-status--complete {
  color: #047857;
}

.pov-ops-status--partial {
  color: #b45309;
}

.pov-ops-status--open {
  color: #64748b;
}

.pov-ops-status--blocked {
  color: #c2410c;
}

.pov-ops-status--prepare_early {
  color: #2563eb;
}

.pov-ops-status--deferred,
.pov-ops-status--not_started,
.pov-ops-status--pending {
  color: #94a3b8;
}

/* Mission-control rail — embedded in command header or standalone */
.pov-rail--embedded,
.pov-zone-support .pov-rail {
  display: flex;
  flex-direction: column;
  gap: 0;
  padding: clamp(14px, 1.4vw, 18px);
  border: none;
  border-radius: 0;
  background: #f1f5f9;
  box-shadow: none;
}

@media (min-width: 1101px) {
  .pov-zone-support .pov-rail {
    position: sticky;
    top: 12px;
    max-height: calc(100vh - 24px);
    overflow: auto;
  }
}

.pov-rail__block {
  padding: 10px 0;
  border-bottom: 1px solid color-mix(in srgb, var(--pov-border) 65%, transparent);
}

.pov-rail__block:first-child {
  padding-top: 0;
}

.pov-rail__block:last-child {
  padding-bottom: 0;
  border-bottom: none;
}

.pov-rail__block--action {
  padding-bottom: 12px;
}

.pov-rail__block--secondary {
  padding-top: 8px;
}

.pov-rail__kicker {
  display: block;
  margin: 0 0 10px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--pov-hero-accent);
}

.pov-rail__field-label {
  display: block;
  margin: 0 0 5px;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--pov-meta);
}

button.pov-rail__cta,
button.pov-rail__secondary-cta {
  cursor: pointer;
  font-family: inherit;
}

.pov-rail__cta {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 52px;
  padding: 14px 16px;
  border-radius: 9px;
  font-size: 15px;
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: 0.01em;
  text-align: center;
  text-decoration: none;
  color: #fff;
  background: linear-gradient(
    165deg,
    color-mix(in srgb, var(--pov-hero-accent) 88%, #fff) 0%,
    color-mix(in srgb, var(--pov-hero-accent) 55%, var(--pov-navy)) 42%,
    var(--pov-navy) 100%
  );
  border: 1px solid color-mix(in srgb, var(--pov-hero-accent) 50%, #0f172a);
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.12) inset,
    0 6px 20px color-mix(in srgb, var(--pov-hero-accent) 35%, rgba(15, 23, 42, 0.25));
  transition: filter 0.15s ease, transform 0.12s ease, box-shadow 0.15s ease;
}

.pov-rail__cta:hover {
  filter: brightness(1.06);
  transform: translateY(-1px);
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.14) inset,
    0 8px 24px color-mix(in srgb, var(--pov-hero-accent) 38%, rgba(15, 23, 42, 0.28));
}

.pov-rail__why-now {
  margin: 0;
  font-size: 12px;
  line-height: 1.45;
  font-weight: 500;
  color: var(--pov-ink-soft);
}

.pov-rail__priority-unknowns-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.pov-rail__priority-unknown {
  display: block;
  width: 100%;
  margin: 0;
  padding: 2px 0;
  border: none;
  background: transparent;
  text-align: left;
  font-size: 11px;
  font-weight: 500;
  line-height: 1.35;
  color: var(--pov-meta);
  cursor: default;
}

button.pov-rail__priority-unknown {
  color: var(--pov-ink-soft);
  cursor: pointer;
  text-decoration: none;
}

button.pov-rail__priority-unknown:hover {
  color: var(--pov-navy);
}

.pov-rail__upcoming-line {
  margin: 0;
  font-size: 12px;
  line-height: 1.4;
  font-weight: 600;
  color: var(--pov-navy);
}

.pov-rail__upcoming-meta {
  margin: 3px 0 0;
  font-size: 11px;
  line-height: 1.35;
  font-weight: 500;
  color: var(--pov-meta);
}

.pov-rail__block--engagement {
  padding-bottom: 10px;
}

.pov-rail__cta--debrief {
  background: linear-gradient(
    165deg,
    color-mix(in srgb, #f59e0b 82%, #fff) 0%,
    color-mix(in srgb, #d97706 58%, var(--pov-navy)) 38%,
    color-mix(in srgb, #b45309 70%, #0f172a) 100%
  );
  border-color: color-mix(in srgb, #f59e0b 55%, #0f172a);
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.14) inset,
    0 6px 20px color-mix(in srgb, #f59e0b 32%, rgba(15, 23, 42, 0.28));
}

.pov-discovery-approval-actions {
  display: grid;
  gap: 10px;
}

.pov-discovery-approval-actions__copy {
  margin: 0;
  font-size: 12px;
  line-height: 1.45;
  color: var(--pov-meta);
}

button.pov-discovery-approval-actions__cta {
  cursor: pointer;
  font-family: inherit;
}

.pov-discovery-approval-actions__cta {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 52px;
  padding: 14px 16px;
  border-radius: 9px;
  font-size: 15px;
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: 0.01em;
  text-align: center;
  color: #fff;
  background: linear-gradient(
    165deg,
    color-mix(in srgb, var(--pov-hero-accent) 88%, #fff) 0%,
    color-mix(in srgb, var(--pov-hero-accent) 55%, var(--pov-navy)) 42%,
    var(--pov-navy) 100%
  );
  border: 1px solid color-mix(in srgb, var(--pov-hero-accent) 50%, #0f172a);
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.12) inset,
    0 6px 20px color-mix(in srgb, var(--pov-hero-accent) 35%, rgba(15, 23, 42, 0.25));
  transition: filter 0.15s ease, transform 0.12s ease, box-shadow 0.15s ease;
}

.pov-discovery-approval-actions__cta:hover {
  filter: brightness(1.06);
  transform: translateY(-1px);
}

.pov-optional-intel {
  margin-top: 10px;
  border-radius: 12px;
  border: 1px solid color-mix(in srgb, var(--pov-border) 88%, var(--foreground));
  background: color-mix(in srgb, var(--surface) 96%, var(--pov-navy));
  overflow: hidden;
}

.pov-optional-intel--overview {
  border-radius: 10px;
  margin-top: 8px;
}

button.pov-optional-intel-link {
  cursor: pointer;
  font-family: inherit;
  background: none;
  border: none;
  padding: 0;
  margin-top: 8px;
  font-size: 12px;
  font-weight: 700;
  color: color-mix(in srgb, var(--pov-hero-accent) 78%, var(--pov-navy));
  text-align: left;
}

.pov-optional-intel-link:hover {
  text-decoration: underline;
}

.pov-optional-intel-link--inline {
  margin-top: 10px;
}

.pov-optional-intel--compact {
  margin-top: 8px;
}

.pov-optional-intel__summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 12px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 700;
  color: var(--pov-navy);
  list-style: none;
}

.pov-optional-intel__summary::-webkit-details-marker {
  display: none;
}

.pov-optional-intel__count {
  font-size: 10px;
  font-weight: 600;
  color: var(--pov-meta);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.pov-optional-intel__body {
  padding: 0 12px 12px;
  border-top: 1px solid color-mix(in srgb, var(--pov-border) 70%, transparent);
}

.pov-optional-intel__body--overview {
  padding-top: 8px;
}

.pov-optional-intel__group {
  margin: 0 0 10px;
}

.pov-optional-intel__group:last-of-type {
  margin-bottom: 0;
}

.pov-optional-intel__group-label {
  margin: 0 0 4px;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--pov-meta);
}

.pov-optional-intel__group-list {
  margin: 0;
  padding: 0 0 0 14px;
  list-style: none;
  display: grid;
  gap: 2px;
}

.pov-optional-intel__group-row {
  font-size: 12px;
  line-height: 1.45;
  color: var(--foreground);
}

.pov-optional-intel__group-row::before {
  content: "– ";
  color: var(--pov-meta);
}

.pov-optional-intel__row-label {
  font-weight: 600;
}

.pov-optional-intel__row-value--empty {
  color: var(--pov-meta);
  font-weight: 500;
}

.pov-optional-intel__lead {
  margin: 10px 0 8px;
  font-size: 11px;
  line-height: 1.45;
  color: var(--pov-meta);
}

.pov-optional-intel__list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 8px;
}

.pov-optional-intel__item {
  padding: 8px 10px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--foreground) 2%, var(--surface));
  border: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
}

.pov-optional-intel__item-label {
  margin: 0 0 4px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--pov-meta);
}

.pov-optional-intel__item-summary {
  margin: 0;
  font-size: 12px;
  line-height: 1.45;
  color: var(--foreground);
}

.pov-optional-intel__empty {
  margin: 10px 0;
  font-size: 12px;
  color: var(--pov-meta);
}

button.pov-optional-intel__add {
  cursor: pointer;
  font-family: inherit;
}

.pov-optional-intel__add {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-top: 8px;
  min-height: 36px;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--pov-hero-accent) 28%, var(--border));
  background: color-mix(in srgb, var(--pov-hero-accent) 6%, var(--surface));
  font-size: 12px;
  font-weight: 700;
  color: var(--pov-navy);
}

.pov-optional-intel__add:hover {
  filter: brightness(1.03);
}

.pov-rail__secondary-cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  margin-top: 8px;
  min-height: 40px;
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.2;
  text-align: center;
  text-decoration: none;
  color: var(--pov-navy);
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid color-mix(in srgb, var(--pov-border) 75%, transparent);
  transition: filter 0.15s ease, background 0.15s ease;
}

.pov-rail__secondary-cta:hover {
  filter: brightness(1.02);
  background: rgba(255, 255, 255, 0.92);
}

.pov-rail__secondary-actions {
  display: grid;
  gap: 6px;
  margin-top: 8px;
}

.pov-rail__secondary-actions .pov-rail__secondary-cta {
  margin-top: 0;
}

.pov-rail__secondary-link {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 2px 0;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.35;
  color: var(--pov-meta);
  text-decoration: none;
  background: none;
  border: none;
  cursor: pointer;
  font-family: inherit;
  text-align: left;
}

.pov-rail__secondary-link:hover {
  color: var(--pov-navy);
  text-decoration: underline;
  text-underline-offset: 2px;
}

.pov-rail__more-toggle {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin: 0;
  padding: 0;
  border: none;
  background: none;
  font-size: 11px;
  font-weight: 600;
  color: var(--pov-meta);
  cursor: pointer;
  font-family: inherit;
}

.pov-rail__more-toggle:hover {
  color: var(--pov-navy);
}

.pov-rail--embedded .pov-rail__block {
  padding: 8px 0;
  border-bottom-color: rgba(255, 255, 255, 0.1);
}

.pov-rail--embedded .pov-rail__block--action {
  padding-top: 0;
  padding-bottom: 10px;
}

.pov-rail--embedded .pov-rail__field-label {
  color: rgba(148, 163, 184, 0.95);
}

.pov-rail--embedded .pov-rail__why-now {
  color: #e2e8f0;
  font-size: 12px;
}

.pov-rail--embedded .pov-rail__priority-unknown {
  color: #cbd5e1;
  font-size: 12px;
}

.pov-rail--embedded button.pov-rail__priority-unknown {
  color: #e2e8f0;
}

.pov-rail--embedded .pov-rail__more-toggle {
  color: rgba(148, 163, 184, 0.95);
}

.pov-rail--embedded .pov-rail__more-toggle:hover {
  color: #f1f5f9;
}

.pov-rail--embedded .pov-rail__upcoming-line {
  color: #f1f5f9;
}

.pov-rail--embedded .pov-rail__upcoming-meta {
  color: rgba(148, 163, 184, 0.95);
}

.pov-rail--embedded .pov-rail__secondary-cta {
  margin-top: 8px;
  color: #e2e8f0;
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.14);
}

.pov-rail--embedded .pov-rail__secondary-cta:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.12);
}

.pov-rail--embedded .pov-rail__secondary-link:hover {
  color: #e2e8f0;
  text-decoration: none;
}

/* ═══ Bottom accordion stack (reference + optional context) ═══ */
.pov-bottom-stack {
  grid-area: bottom;
  padding: 8px clamp(10px, 1.4vw, 14px) clamp(10px, 1.2vw, 12px);
  background: color-mix(in srgb, var(--pov-surface) 94%, var(--pov-page-bg));
  border-top: 1px solid var(--pov-border-soft);
}

.pov-bottom-accordion {
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--pov-border) 88%, var(--foreground));
  background: var(--pov-surface);
  overflow: hidden;
}

.pov-bottom-accordion__summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 9px 12px;
  cursor: pointer;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--pov-navy) 82%, var(--foreground));
  list-style: none;
}

.pov-bottom-accordion__summary::-webkit-details-marker {
  display: none;
}

.pov-bottom-accordion__summary::after {
  content: "▸";
  font-size: 11px;
  font-weight: 700;
  color: var(--pov-meta);
}

.pov-bottom-accordion[open] > .pov-bottom-accordion__summary::after {
  content: "▾";
}

.pov-bottom-accordion__body {
  padding: 0 12px 10px;
}

.pov-bottom-accordion__empty {
  margin: 0;
  font-size: 12px;
  line-height: 1.45;
  color: var(--pov-meta);
}

.pov-bottom-accordion__footer-link {
  display: inline-block;
  margin-top: 8px;
  font-size: 12px;
  font-weight: 700;
  color: color-mix(in srgb, var(--pov-hero-accent) 78%, var(--pov-navy));
  text-decoration: none;
}

.pov-bottom-accordion__footer-link:hover {
  text-decoration: underline;
}

.pov-bottom-accordion__summary-label {
  min-width: 0;
}

.pov-bottom-accordion__badge {
  margin-left: auto;
  margin-right: 4px;
  min-width: 18px;
  height: 18px;
  padding: 0 6px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0;
  text-transform: none;
  color: color-mix(in srgb, var(--pov-navy) 88%, var(--foreground));
  background: color-mix(in srgb, var(--pov-hero-accent) 12%, var(--pov-page-bg));
  border: 1px solid color-mix(in srgb, var(--pov-hero-accent) 24%, var(--pov-border));
}

.pov-access-intelligence__list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 4px;
}

.pov-access-intelligence__row {
  font-size: 12px;
  line-height: 1.45;
  color: color-mix(in srgb, var(--pov-navy) 88%, var(--foreground));
}

.pov-access-intelligence__row--empty {
  color: var(--pov-meta);
}

.pov-activity-timeline__groups {
  display: grid;
  gap: 10px;
}

.pov-activity-timeline__group-label {
  margin: 0 0 4px;
  font-size: 11px;
  font-weight: 650;
  color: var(--pov-meta);
}

.pov-activity-timeline__entries {
  margin: 0;
  padding: 0 0 0 14px;
  list-style: disc;
  display: grid;
  gap: 3px;
}

.pov-activity-timeline__entry {
  font-size: 12px;
  line-height: 1.4;
  color: color-mix(in srgb, var(--pov-navy) 88%, var(--foreground));
}

.pov-activity-timeline__link {
  font-weight: 650;
  color: inherit;
  text-decoration: none;
}

.pov-activity-timeline__link:hover {
  text-decoration: underline;
}

.pov-what-we-know__list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 6px;
}

.pov-what-we-know__item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 12px;
  line-height: 1.45;
  color: color-mix(in srgb, var(--pov-navy) 88%, var(--foreground));
}

.pov-what-we-know__mark {
  flex: 0 0 auto;
  color: color-mix(in srgb, var(--pov-hero-accent) 72%, #166534);
  font-weight: 800;
}

.pov-what-we-know__text {
  min-width: 0;
}

.pov-bottom-stack .pov-optional-intel {
  margin-top: 0;
  border: 1px solid color-mix(in srgb, var(--pov-border) 88%, var(--foreground));
  background: var(--pov-surface);
}

.pov-bottom-stack .pov-optional-intel__body--overview {
  padding-top: 0;
}

.pov-bottom-stack .pov-optional-intel__group {
  margin-bottom: 8px;
}

.pov-bottom-stack .pov-optional-intel-link--inline {
  margin-top: 4px;
}

.pov-optional-intel__flat-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 4px;
}

.pov-optional-intel__flat-row {
  font-size: 12px;
  line-height: 1.45;
  color: color-mix(in srgb, var(--pov-navy) 88%, var(--foreground));
}

.pov-optional-intel__flat-label {
  font-weight: 650;
}

.pov-optional-intel__flat-value {
  font-weight: 400;
}

/* Legacy intel zone (unused on overview bottom) */
.pov-zone-intel .pov-access-intelligence {
  position: relative;
  z-index: 1;
  margin-bottom: 14px;
}

.pov-zone-intel .pov-access-intelligence .bg-intel-sections-lead {
  display: none;
}

.pov-zone-intel {
  grid-area: intel;
  background: var(--pov-intel-bg);
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  padding: clamp(12px, 1.5vw, 18px) clamp(14px, 1.8vw, 22px) clamp(14px, 1.6vw, 20px);
  position: relative;
  z-index: 0;
}

.pov-zone-intel::before {
  content: "";
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse 60% 50% at 100% 0%, rgba(13, 148, 136, 0.07), transparent 50%);
  pointer-events: none;
}

.pov-zone-intel .pov-intel-workspace {
  position: relative;
  z-index: 1;
}

.pov-zone-intel .pov-zone-section__title--intel {
  font-size: 10px;
  letter-spacing: 0.1em;
  color: #cbd5e1;
}

.pov-intel-workspace__head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 10px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
}

.pov-intel-workspace__head-main {
  min-width: 0;
}

.pov-intel-workspace__subtitle {
  margin: 4px 0 0;
  font-size: 12px;
  color: #64748b;
  max-width: 56ch;
}

.pov-intel-workspace__aggregate {
  flex-shrink: 0;
  text-align: right;
  padding: 0;
  border-radius: 0;
  background: transparent;
  border: none;
}

.pov-intel-workspace__aggregate-value {
  display: block;
  font-size: 1.25rem;
  font-weight: 600;
  line-height: 1;
  letter-spacing: -0.02em;
  color: #94a3b8;
  font-variant-numeric: tabular-nums;
}

.pov-intel-workspace__aggregate-label {
  display: block;
  margin-top: 4px;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #64748b;
}

.pov-intel-workspace__lanes {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px;
  min-height: 0;
}

.pov-intel-lane {
  padding: clamp(10px, 1.2vw, 12px) clamp(12px, 1.3vw, 14px);
  min-width: 0;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  box-shadow: none;
  display: flex;
  flex-direction: column;
}

.pov-intel-lane--confirmed {
  background: rgba(16, 185, 129, 0.06);
  border-color: rgba(52, 211, 153, 0.14);
}

.pov-intel-lane--validating {
  background: rgba(245, 158, 11, 0.05);
  border-color: rgba(251, 191, 36, 0.12);
}

.pov-intel-lane--unknown {
  background: rgba(148, 163, 184, 0.05);
  border-color: rgba(148, 163, 184, 0.1);
}

.pov-intel-lane__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
  padding-bottom: 6px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.pov-intel-lane__head-text {
  min-width: 0;
}

.pov-intel-lane__title {
  margin: 0;
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #94a3b8;
}

.pov-intel-lane__descriptor {
  margin: 3px 0 0;
  font-size: 10px;
  font-weight: 500;
  color: #64748b;
}

.pov-intel-lane__stat {
  font-size: 1rem;
  font-weight: 600;
  line-height: 1;
  color: #94a3b8;
  font-variant-numeric: tabular-nums;
}

.pov-intel-lane--confirmed .pov-intel-lane__stat {
  color: #6ee7b7;
}

.pov-intel-lane--validating .pov-intel-lane__stat {
  color: #d4a72c;
}

.pov-intel-lane--unknown .pov-intel-lane__stat {
  color: #94a3b8;
}

.pov-intel-lane__list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0;
  flex: 1;
}

.pov-intel-lane__row {
  padding: 5px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
}

.pov-intel-lane__row:last-child {
  border-bottom: none;
}

.pov-intel-lane__signal {
  display: block;
  font-size: 12px;
  font-weight: 500;
  line-height: 1.4;
  color: #cbd5e1;
}

.pov-intel-lane__subs {
  margin: 3px 0 0;
  padding: 0 0 0 8px;
  list-style: none;
  font-size: 10px;
  line-height: 1.38;
  color: #64748b;
}

.pov-intel-lane__subs li::before {
  content: "› ";
  color: #64748b;
}

.pov-intel-lane__empty {
  margin: 0;
  font-size: 11px;
  color: #475569;
  font-style: italic;
}

@media (min-width: 1400px) {
  .pov-intel-workspace__lanes {
    gap: 8px;
  }
}

/* Status rail (new provider banner) */
.pov-status-rail {
  padding-bottom: 12px;
  margin-bottom: 10px;
  border-bottom: 1px solid var(--pov-border);
}

.pov-status-rail-live {
  display: inline-block;
  width: 7px;
  height: 7px;
  margin-right: 6px;
  border-radius: 999px;
  background: var(--pov-teal);
  vertical-align: middle;
}

.pov-status-rail-head {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 8px;
}

.pov-status-rail-kicker {
  margin: 0 0 4px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--pov-teal-deep);
}

.pov-status-rail-detail {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.4;
}

.pov-status-rail-dismiss {
  border: none;
  background: transparent;
  font-size: 11px;
  font-weight: 600;
  color: var(--pov-meta);
  cursor: pointer;
  text-decoration: underline;
}

.pov-status-rail-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.pov-status-rail-btn {
  display: inline-flex;
  align-items: center;
  min-height: 36px;
  padding: 0 12px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 700;
  text-decoration: none;
  cursor: pointer;
  font-family: inherit;
  border: 1px solid transparent;
}

.pov-status-rail-btn--primary {
  background: var(--pov-teal);
  color: #fff;
}

.pov-status-rail-btn--secondary {
  color: var(--pov-teal-deep);
  border-color: var(--pov-border);
  background: transparent;
}

.pov-status-rail-more {
  position: relative;
}

.pov-status-rail-menu {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  z-index: 20;
  min-width: 168px;
  padding: 4px;
  border-radius: 8px;
  border: 1px solid var(--pov-border);
  background: #fff;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.1);
}

.pov-status-rail-menu-item {
  display: block;
  padding: 8px 10px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--pov-ink-soft);
  text-decoration: none;
}

/* ── Tablet ── */
@media (max-width: 1100px) {
  .pov-briefing-layout {
    grid-template-columns: 1fr;
    grid-template-areas:
      "command"
      "bottom";
  }

  .pov-command-header__grid {
    grid-template-columns: 1fr;
  }

  .pov-command-header__right {
    border-radius: 10px;
  }

  .pov-ops-pathway__priorities {
    grid-template-columns: 1fr;
  }

  .pov-ops-pathway__priority + .pov-ops-pathway__priority {
    border-top: 1px solid var(--pov-border-soft);
    border-left: none;
  }

  .pov-intel-workspace__head {
    flex-direction: column;
    align-items: flex-start;
  }

  .pov-intel-workspace__aggregate {
    align-self: stretch;
    text-align: left;
    display: flex;
    align-items: baseline;
    gap: 10px;
  }

  .pov-intel-workspace__aggregate-label {
    margin-top: 0;
  }

  .pov-intel-workspace__lanes {
    grid-template-columns: 1fr;
  }
}

/* ── Mobile ── */
@media (max-width: 720px) {
  .pov-body {
    padding-bottom: calc(68px + env(safe-area-inset-bottom, 0px));
  }

  .pov-briefing-layout {
    border-radius: 10px;
  }

  .pov-command-header__surface {
    padding: 12px 12px 10px;
  }

  .pov-bottom-stack {
    padding: 6px 10px 8px;
    gap: 5px;
  }

  .pov-bottom-accordion__summary {
    padding: 8px 10px;
    font-size: 10px;
  }

  .pov-command-header__stage {
    font-size: 1.7rem;
  }

  .pov-pathway-track__scroll {
    overflow-x: auto;
    overflow-y: hidden;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior-x: contain;
    scroll-snap-type: x proximity;
    scrollbar-width: none;
    width: 100%;
    max-width: 100%;
    margin: 0;
    padding: 2px 0 4px;
    box-sizing: border-box;
  }

  .pov-pathway-track__scroll::-webkit-scrollbar {
    display: none;
  }

  .pov-pathway-track--workflow .pov-pathway-track__list {
    display: flex;
    align-items: flex-start;
    width: max-content;
    min-width: 100%;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .pov-cc-mission-deck .pov-pathway-track--workflow .pov-pathway-track__list {
    min-width: max-content;
  }

  .pov-pathway-track--workflow .pov-pathway-track__segment {
    display: flex;
    align-items: flex-start;
    flex: 0 0 auto;
    scroll-snap-align: start;
    min-width: 112px;
    max-width: none;
  }

  .pov-pathway-track--workflow .pov-pathway-track__segment:last-child {
    flex: 0 0 auto;
  }

  .pov-pathway-track--workflow .pov-pathway-track__step {
    min-width: 112px;
    width: 112px;
    max-width: 112px;
  }

  .pov-pathway-track--workflow .pov-pathway-track__label {
    font-size: 9px;
    line-height: 1.3;
    white-space: normal;
    text-wrap: balance;
    max-width: 108px;
  }

  .pov-pathway-track--workflow .pov-pathway-track__connector {
    flex: 0 0 20px;
    min-width: 20px;
    max-width: 20px;
    margin-top: 13px;
  }

  .pov-pathway-track--workflow .pov-pathway-track__active-tag,
  .pov-pathway-track--workflow .pov-pathway-track__action-tag {
    font-size: 7px;
    padding: 2px 5px;
  }

  .pov-cc-pathway--deck {
    overflow: visible;
    background: transparent;
    padding: 10px 10px 12px;
  }

  .pov-cc-mission-deck .pov-pathway-track--workflow .pov-pathway-track__segment {
    flex: 0 0 auto;
  }

  .pov-command-header__telemetry {
    grid-template-columns: 1fr;
  }

  .pov-command-header__telemetry-cell {
    border-right: none;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    padding: 10px 0;
  }

  .pov-command-header__telemetry-cell:last-child {
    border-bottom: none;
  }

  .pov-command-header__mobile-next {
    display: flex;
    align-items: center;
    gap: 10px;
    position: fixed;
    left: 10px;
    right: 10px;
    bottom: calc(10px + env(safe-area-inset-bottom, 0px));
    z-index: 40;
    padding: 11px 13px;
    border-radius: 9px;
    background: var(--pov-surface);
    border: 1px solid var(--pov-border);
    box-shadow: 0 4px 20px rgba(15, 23, 42, 0.12);
  }

  .pov-command-header__mobile-kicker {
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--pov-meta);
    flex-shrink: 0;
  }

  .pov-command-header__mobile-text {
    font-size: 13px;
    font-weight: 500;
    color: var(--pov-navy);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .pov-command-header__right {
    padding: 12px;
  }

  .pov-rail__cta {
    min-height: 48px;
    font-size: 14px;
  }
}

/* ═══ Command center layout (6-section provider overview) ═══ */
.pov-body--command-center {
  padding-bottom: clamp(8px, 1.5vw, 16px);
}

.pov-cc {
  display: flex;
  flex-direction: column;
  gap: 14px;
  width: 100%;
  max-width: none;
}

.pov-cc-section-title {
  margin: 0 0 8px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--pov-navy);
}

/* ── Dark mission deck (unified pathway hero) ── */
.pov-cc-mission-deck {
  border-radius: 18px;
  overflow: hidden;
  background: var(--pov-hero-bg);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: var(--pov-elev-hero);
}

.pov-cc-hero {
  display: grid;
  gap: 0;
}

.pov-cc-hero__top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: clamp(14px, 2vw, 20px) clamp(14px, 2vw, 22px) 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.pov-cc-hero__identity {
  min-width: 0;
  flex: 1 1 240px;
}

.pov-cc-hero__kicker {
  margin: 0 0 6px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--pov-hero-muted);
}

.pov-cc-hero__name {
  margin: 0;
  font-size: clamp(20px, 2.4vw, 28px);
  font-weight: 800;
  line-height: 1.15;
  letter-spacing: -0.03em;
  color: #f8fafc;
}

.pov-cc-hero__meta-grid {
  display: grid;
  gap: 2px;
  margin-top: 6px;
}

.pov-cc-hero__meta {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: #94a3b8;
}

.pov-cc-hero__meta--specialty {
  color: #cbd5e1;
}

.pov-cc-hero__meta--muted {
  font-style: italic;
  opacity: 0.85;
}

.pov-cc-hero__status {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 10px;
  flex-shrink: 0;
}

.pov-cc-hero__stage-badge {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.pov-cc-hero__stage-label {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--pov-hero-muted);
}

.pov-cc-hero__stage-pill {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 4px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  color: #fff;
  background: color-mix(in srgb, var(--pov-hero-accent) 72%, rgba(15, 23, 42, 0.9));
  border: 1px solid color-mix(in srgb, var(--pov-hero-accent) 55%, rgba(255, 255, 255, 0.2));
  box-shadow: 0 0 18px color-mix(in srgb, var(--pov-hero-accent) 35%, transparent);
}

.pov-cc-hero__progress-ring {
  --pov-progress: 0%;
  position: relative;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  background:
    radial-gradient(farthest-side, #0f172a 68%, transparent 70%),
    conic-gradient(var(--pov-hero-accent) var(--pov-progress), rgba(255, 255, 255, 0.1) 0);
  box-shadow: 0 0 16px color-mix(in srgb, var(--pov-hero-accent) 35%, transparent);
}

.pov-cc-hero__progress-value {
  font-size: 11px;
  font-weight: 800;
  color: #f8fafc;
  font-variant-numeric: tabular-nums;
}

.pov-cc-hero__pathway {
  padding: 14px clamp(14px, 2vw, 22px) 18px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0.01) 100%);
}

.pov-cc-hero__pathway-head {
  margin-bottom: 12px;
}

.pov-cc-hero__pathway-kicker {
  margin: 0 0 4px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--pov-hero-accent) 70%, #fff);
}

.pov-cc-hero__stage {
  margin: 0;
  font-size: clamp(20px, 2.4vw, 28px);
  font-weight: 800;
  line-height: 1.15;
  letter-spacing: -0.03em;
  color: #fff;
}

.pov-cc-hero__objective {
  margin: 0;
  max-width: 58ch;
  font-size: 14px;
  line-height: 1.45;
  font-weight: 700;
  color: #e2e8f0;
}

/* Legacy header aliases (unused in command center) */
.pov-cc-header--mission {
  display: block;
  padding: clamp(14px, 2vw, 18px) clamp(14px, 2vw, 20px) 12px;
  background: transparent;
  border: none;
  border-radius: 0;
  box-shadow: none;
}

.pov-cc-header__kicker {
  margin: 0 0 8px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--pov-hero-muted);
}

.pov-cc-header__row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.pov-cc-header__identity {
  min-width: 0;
  flex: 1 1 240px;
}

.pov-cc-header__name {
  margin: 0;
  font-size: clamp(18px, 2.2vw, 24px);
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: -0.02em;
  color: #f8fafc;
}

.pov-cc-header__meta {
  margin: 6px 0 0;
  font-size: 13px;
  color: #94a3b8;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
}

.pov-cc-header__meta-muted {
  font-style: italic;
  opacity: 0.85;
}

.pov-cc-header__meta-sep {
  opacity: 0.55;
}

.pov-cc-header__mission-rail {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 10px;
  flex-shrink: 0;
}

.pov-cc-header__stage-badge {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.pov-cc-header__stage-label {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--pov-hero-muted);
}

.pov-cc-header__stage-pill {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 4px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  color: #fff;
  background: color-mix(in srgb, var(--pov-hero-accent) 72%, rgba(15, 23, 42, 0.9));
  border: 1px solid color-mix(in srgb, var(--pov-hero-accent) 55%, rgba(255, 255, 255, 0.2));
  box-shadow: 0 0 18px color-mix(in srgb, var(--pov-hero-accent) 35%, transparent);
}

.pov-cc-header__progress {
  display: inline-flex;
  align-items: center;
  gap: 10px;
}

.pov-cc-header__progress-value {
  font-size: 11px;
  font-weight: 700;
  color: var(--pov-hero-muted);
  font-variant-numeric: tabular-nums;
  min-width: 2.5em;
  text-align: right;
}

.pov-cc-header__progress-bar {
  width: 96px;
  height: 5px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.12);
  overflow: hidden;
}

.pov-cc-header__progress-fill {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--pov-hero-accent), color-mix(in srgb, var(--pov-hero-accent) 65%, #fff));
  box-shadow: 0 0 10px color-mix(in srgb, var(--pov-hero-accent) 45%, transparent);
}

/* §2 Pathway on dark deck */
.pov-cc-pathway--deck {
  padding: clamp(12px, 2vw, 16px) clamp(12px, 2vw, 18px) clamp(14px, 2vw, 18px);
  border-radius: inherit;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.01) 100%);
  border: none;
  box-shadow: none;
}

.pov-cc-pathway__kicker {
  margin: 0 0 10px;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.11em;
  text-transform: uppercase;
  color: rgba(148, 163, 184, 0.9);
}

.pov-customer-banner__title {
  margin: 0;
  font-size: 20px;
  font-weight: 800;
  letter-spacing: -0.03em;
  color: #f8fafc;
}

.pov-customer-banner__copy {
  margin: 6px 0 0;
  max-width: 52ch;
  font-size: 13px;
  line-height: 1.45;
  color: rgba(226, 232, 240, 0.82);
}

@media (min-width: 721px) {
  .pov-cc-pathway--deck {
    overflow-x: auto;
  }

  .pov-cc-mission-deck .pov-pathway-track--workflow .pov-pathway-track__list {
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    align-items: flex-start;
    width: 100%;
    min-width: min(100%, 680px);
  }

  .pov-cc-mission-deck .pov-pathway-track--workflow .pov-pathway-track__segment {
    display: flex;
    align-items: flex-start;
    flex: 1 1 0;
    min-width: 0;
  }

  .pov-cc-mission-deck .pov-pathway-track--workflow .pov-pathway-track__segment:last-child {
    flex: 0 0 auto;
  }

  .pov-cc-mission-deck .pov-pathway-track--workflow .pov-pathway-track__label {
    white-space: nowrap;
  }

  .pov-cc-mission-deck .pov-pathway-track--workflow .pov-pathway-track__connector {
    flex: 1 1 auto;
    min-width: 10px;
  }
}

.pov-cc-mission-deck .pov-pathway-track--workflow .pov-pathway-track__list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  align-items: flex-start;
}

.pov-cc-mission-deck .pov-pathway-track--workflow .pov-pathway-track__segment {
  display: flex;
  align-items: flex-start;
}

.pov-cc-mission-deck .pov-pathway-track--workflow .pov-pathway-track__step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  min-width: 0;
}

.pov-cc-mission-deck .pov-pathway-track--workflow .pov-pathway-track__marker {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.08);
  border: 1.5px solid rgba(255, 255, 255, 0.22);
  font-size: 10px;
  font-weight: 700;
  color: #94a3b8;
}

.pov-cc-mission-deck .pov-pathway-track--workflow .pov-pathway-track__marker-index,
.pov-cc-mission-deck .pov-pathway-track--workflow .pov-pathway-track__marker-icon {
  line-height: 1;
}

.pov-cc-mission-deck .pov-pathway-track--workflow .pov-pathway-track__label {
  font-size: clamp(8px, 0.72vw, 10px);
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  text-align: center;
  line-height: 1.25;
  color: rgba(148, 163, 184, 0.88);
}

.pov-cc-mission-deck .pov-pathway-track--workflow .pov-pathway-track__active-tag {
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--pov-hero-accent);
  padding: 2px 6px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--pov-hero-accent) 18%, transparent);
  border: 1px solid color-mix(in srgb, var(--pov-hero-accent) 35%, transparent);
}

.pov-cc-mission-deck .pov-pathway-track--workflow .pov-pathway-track__connector {
  height: 2px;
  margin: 11px 6px 0;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.12);
}

.pov-cc-mission-deck .pov-pathway-track--workflow .pov-pathway-track__step--complete .pov-pathway-track__marker {
  background: color-mix(in srgb, var(--pov-stage-accent, var(--pov-hero-accent)) 35%, rgba(15, 23, 42, 0.85));
  border-color: var(--pov-stage-accent, var(--pov-hero-accent));
  color: #fff;
  box-shadow: 0 0 10px color-mix(in srgb, var(--pov-stage-accent, var(--pov-hero-accent)) 45%, transparent);
}

.pov-cc-mission-deck .pov-pathway-track--workflow .pov-pathway-track__step--complete .pov-pathway-track__label {
  color: #e2e8f0;
  font-weight: 700;
}

.pov-cc-mission-deck .pov-pathway-track--workflow .pov-pathway-track__connector--complete {
  background: linear-gradient(
    90deg,
    var(--pov-stage-accent, var(--pov-teal)),
    color-mix(in srgb, var(--pov-stage-accent, var(--pov-teal)) 35%, transparent)
  );
}

.pov-cc-mission-deck .pov-pathway-track--workflow .pov-pathway-track__step--current .pov-pathway-track__marker {
  width: 28px;
  height: 28px;
  margin-top: -3px;
  background: var(--pov-stage-accent, var(--pov-hero-accent));
  border-color: color-mix(in srgb, var(--pov-stage-accent, var(--pov-hero-accent)) 80%, #fff);
  color: #fff;
  box-shadow:
    0 0 0 4px color-mix(in srgb, var(--pov-stage-accent, var(--pov-hero-accent)) 24%, transparent),
    0 0 22px color-mix(in srgb, var(--pov-stage-accent, var(--pov-hero-accent)) 55%, transparent);
}

.pov-cc-mission-deck .pov-pathway-track--workflow .pov-pathway-track__marker-pulse {
  display: block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #fff;
  animation: pov-pathway-pulse 1.6s ease-in-out infinite;
}

@keyframes pov-pathway-pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.25); opacity: 0.75; }
}

.pov-cc-mission-deck .pov-pathway-track--workflow .pov-pathway-track__step--current .pov-pathway-track__label {
  color: #fff;
  font-weight: 800;
}

.pov-cc-mission-deck .pov-pathway-track--workflow .pov-pathway-track__connector--current {
  background: linear-gradient(
    90deg,
    color-mix(in srgb, var(--pov-stage-accent, var(--pov-hero-accent)) 75%, transparent),
    rgba(255, 255, 255, 0.1)
  );
}

.pov-cc-mission-deck .pov-pathway-track--workflow .pov-pathway-track__step--upcoming .pov-pathway-track__marker {
  background: transparent;
  border-color: rgba(255, 255, 255, 0.14);
  color: rgba(148, 163, 184, 0.55);
}

.pov-cc-mission-deck .pov-pathway-track--workflow .pov-pathway-track__step--upcoming .pov-pathway-track__label {
  color: rgba(100, 116, 139, 0.75);
  opacity: 0.9;
}

.pov-cc-mission-deck .pov-pathway-track--workflow .pov-pathway-track__step--actionable {
  border: none;
  background: transparent;
  padding: 0;
  cursor: pointer;
  font: inherit;
  color: inherit;
  transition: transform 0.15s ease;
}

.pov-cc-mission-deck .pov-pathway-track--workflow .pov-pathway-track__step--actionable:hover {
  transform: translateY(-1px);
}

.pov-cc-mission-deck .pov-pathway-track--workflow .pov-pathway-track__step--actionable:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--pov-stage-accent, var(--pov-hero-accent)) 65%, #fff);
  outline-offset: 3px;
  border-radius: 8px;
}

.pov-cc-mission-deck .pov-pathway-track--workflow .pov-pathway-track__action-tag {
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--pov-stage-accent, var(--pov-hero-accent)) 75%, #fff);
  padding: 2px 6px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--pov-stage-accent, var(--pov-hero-accent)) 14%, transparent);
  border: 1px solid color-mix(in srgb, var(--pov-stage-accent, var(--pov-hero-accent)) 28%, transparent);
}

@media (max-width: 720px) {
  .pov-cc-mission-deck .pov-cc-pathway--deck {
    overflow: hidden;
    padding: 12px 0 16px;
    min-height: 118px;
  }

  .pov-cc-mission-deck .pov-cc-pathway__kicker {
    padding: 0 12px;
    margin-bottom: 8px;
  }

  .pov-cc-mission-deck .pov-pathway-track {
    min-width: 0;
    width: 100%;
  }

  .pov-cc-mission-deck .pov-pathway-track__scroll {
    overflow-x: auto;
    overflow-y: hidden;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior-x: contain;
    scroll-snap-type: x proximity;
    scrollbar-width: none;
    width: 100%;
    max-width: 100%;
    padding: 4px 12px 8px;
    margin: 0;
    box-sizing: border-box;
  }

  .pov-cc-mission-deck .pov-pathway-track__scroll::-webkit-scrollbar {
    display: none;
  }

  .pov-cc-mission-deck .pov-pathway-track--workflow .pov-pathway-track__list {
    width: max-content;
    min-width: 100%;
    gap: 0;
  }

  .pov-cc-mission-deck .pov-pathway-track--workflow .pov-pathway-track__segment {
    flex: 0 0 auto;
    min-width: 112px;
    max-width: none;
    scroll-snap-align: start;
  }

  .pov-cc-mission-deck .pov-pathway-track--workflow .pov-pathway-track__step {
    width: 112px;
    min-width: 112px;
    max-width: 112px;
    gap: 6px;
  }

  .pov-cc-mission-deck .pov-pathway-track--workflow .pov-pathway-track__label {
    white-space: normal;
    text-wrap: balance;
    max-width: 108px;
    font-size: 9px;
    line-height: 1.3;
  }

  .pov-cc-mission-deck .pov-pathway-track--workflow .pov-pathway-track__connector {
    flex: 0 0 20px;
    min-width: 20px;
    max-width: 20px;
    margin: 13px 0 0;
  }

  .pov-cc-mission-deck .pov-pathway-track--workflow .pov-pathway-track__active-tag,
  .pov-cc-mission-deck .pov-pathway-track--workflow .pov-pathway-track__action-tag {
    font-size: 7px;
    padding: 2px 6px;
    max-width: 108px;
    text-align: center;
    white-space: normal;
    line-height: 1.2;
  }
}

/* §3 Mission Control — dark ops card */
.pov-cc-mission-control {
  padding: 16px 18px 14px;
  border-radius: 16px;
  background: linear-gradient(165deg, #0a101a 0%, #111827 38%, #0f172a 100%);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 10px 32px rgba(15, 23, 42, 0.22);
  color: #e2e8f0;
}

.pov-cc-mission-control__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.pov-cc-mission-control__kicker {
  margin: 0 0 4px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(148, 163, 184, 0.92);
}

.pov-cc-mission-control__title {
  margin: 0;
  font-size: 18px;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: #fff;
}

.pov-cc-mission-control__status-dot {
  width: 10px;
  height: 10px;
  margin-top: 6px;
  border-radius: 50%;
  background: #22c55e;
  box-shadow: 0 0 12px rgba(34, 197, 94, 0.65);
}

.pov-cc-mission-control__grid {
  display: grid;
  gap: 10px;
  grid-template-columns: 1fr;
}

@media (min-width: 720px) {
  .pov-cc-mission-control__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (min-width: 980px) {
  .pov-cc-mission-control__grid {
    grid-template-columns: 1.2fr 1fr 1fr auto;
    align-items: stretch;
  }
}

.pov-cc-mission-control__panel {
  padding: 12px 14px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.pov-cc-mission-control__panel--primary {
  border-color: color-mix(in srgb, var(--pov-hero-accent) 45%, rgba(255, 255, 255, 0.12));
  background: color-mix(in srgb, var(--pov-hero-accent) 10%, rgba(255, 255, 255, 0.04));
}

.pov-cc-mission-control__label {
  margin: 0 0 6px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(148, 163, 184, 0.95);
}

.pov-cc-mission-control__value {
  margin: 0;
  font-size: 15px;
  font-weight: 800;
  line-height: 1.35;
  color: #fff;
}

.pov-cc-mission-control__detail {
  margin: 4px 0 0;
  font-size: 12px;
  line-height: 1.4;
  font-weight: 600;
  color: #94a3b8;
}

.pov-cc-mission-control__briefing {
  margin: 0;
  font-size: 20px;
  font-weight: 800;
  line-height: 1.15;
  color: #fff;
}

.pov-cc-mission-control__briefing--not_started { color: #fbbf24; }
.pov-cc-mission-control__briefing--in_progress { color: #38bdf8; }
.pov-cc-mission-control__briefing--ready { color: #34d399; }
.pov-cc-mission-control__briefing--reviewed { color: #e2e8f0; }

.pov-cc-mission-control__briefing-lines {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 4px;
}

.pov-cc-mission-control__briefing-line {
  font-size: 13px;
  line-height: 1.45;
  color: #e2e8f0;
}

.pov-cc-mission-control__milestones {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.pov-cc-mission-control__milestone {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.02em;
  padding: 5px 10px;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.35);
  color: #94a3b8;
  background: rgba(15, 23, 42, 0.45);
}

.pov-cc-mission-control__milestone--complete {
  color: #34d399;
  border-color: rgba(52, 211, 153, 0.45);
  background: rgba(52, 211, 153, 0.08);
}

.pov-cc-mission-control__milestone--current {
  color: #38bdf8;
  border-color: rgba(56, 189, 248, 0.55);
  background: rgba(56, 189, 248, 0.12);
  box-shadow: 0 0 0 1px rgba(56, 189, 248, 0.15);
}

.pov-cc-mission-control__milestone--upcoming {
  color: #64748b;
  border-color: rgba(100, 116, 139, 0.25);
  background: rgba(15, 23, 42, 0.25);
}

.pov-cc-mission-control__fact-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 4px;
}

.pov-cc-mission-control__fact-line {
  font-size: 13px;
  line-height: 1.45;
  color: #e2e8f0;
}

.pov-cc-mission-control__fact-line--optional {
  color: #cbd5e1;
}

.pov-cc-mission-control__recommended {
  margin-top: 4px;
  padding-top: 12px;
  border-top: 1px solid rgba(148, 163, 184, 0.15);
}

.pov-cc-mission-control__recommended-action {
  margin: 4px 0 0;
  font-size: 16px;
  font-weight: 750;
  line-height: 1.35;
  color: #f8fafc;
}

.pov-cc-mission-control__panel--status {
  grid-column: 1 / -1;
}

.pov-cc-mission-control__cta-wrap {
  display: flex;
  align-items: stretch;
}

.pov-cc-mission-control__cta-wrap--dual {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.pov-cc-mission-control__cta-wrap--dual .pov-cc-mission-control__cta.mc-cta--secondary {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.14);
  box-shadow: none;
  color: #e2e8f0;
}

.pov-cc-mission-control__panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.pov-cc-mission-control__edit-btn {
  border: 0;
  background: transparent;
  color: #93c5fd;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  cursor: pointer;
  padding: 0;
}

.pov-cc-mission-control__cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 48px;
  padding: 10px 16px;
  border-radius: 12px;
  border: 1px solid color-mix(in srgb, var(--pov-hero-accent) 70%, #000);
  background: linear-gradient(180deg, var(--pov-hero-accent), color-mix(in srgb, var(--pov-hero-accent) 78%, #000));
  color: #fff;
  font-size: 13px;
  font-weight: 800;
  text-decoration: none;
  text-align: center;
  box-shadow: 0 6px 18px color-mix(in srgb, var(--pov-hero-accent) 35%, transparent);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.pov-cc-mission-control__cta:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 22px color-mix(in srgb, var(--pov-hero-accent) 42%, transparent);
  color: #fff;
}

.pov-cc-mission-control__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 14px;
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  font-size: 12px;
  color: #94a3b8;
}

.pov-cc-mission-control__meta-item strong {
  font-weight: 800;
}

.pov-cc-mission-control__observation--permission_confirmed,
.pov-cc-mission-control__observation--observation_scheduled,
.pov-cc-mission-control__observation--observation_completed { color: #34d399; }
.pov-cc-mission-control__observation--denied { color: #f87171; }
.pov-cc-mission-control__observation--permission_not_yet_confirmed,
.pov-cc-mission-control__observation--interested { color: #fbbf24; }
.pov-cc-mission-control__observation--unknown { color: #94a3b8; }

.pov-cc-mission-control__secondary-block {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.pov-cc-mission-control__secondary-block > .pov-cc-mission-control__label {
  margin-bottom: 8px;
}

.pov-cc-mission-control__secondary {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.pov-cc-mission-control__secondary-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 34px;
  padding: 6px 12px;
  border-radius: 9px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(255, 255, 255, 0.06);
  color: #e2e8f0;
  font-size: 12px;
  font-weight: 700;
  text-decoration: none;
  cursor: pointer;
  transition: border-color 0.15s ease, background 0.15s ease;
}

.pov-cc-mission-control__secondary-btn:hover {
  border-color: rgba(255, 255, 255, 0.28);
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.pov-cc-mission-control__focus {
  display: grid;
  gap: 10px;
  margin-top: 10px;
}

@media (min-width: 720px) {
  .pov-cc-mission-control__focus {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.pov-cc-mission-control__inline-action {
  margin-top: 8px;
  padding: 0;
  border: none;
  background: transparent;
  color: #93c5fd;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.pov-cc-mission-control__inline-action:hover {
  color: #bfdbfe;
}

.pov-cc-summary {
  padding: 14px 16px;
  border-radius: 14px;
  background: #fff;
  border: 1px solid color-mix(in srgb, var(--pov-navy) 10%, var(--pov-border));
  box-shadow: var(--pov-elev-layout);
}

.pov-cc-summary__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 10px;
}

.pov-cc-summary__title {
  margin: 0;
  font-size: 15px;
  font-weight: 800;
  letter-spacing: -0.01em;
  color: var(--pov-navy);
}

.pov-cc-summary__link {
  flex-shrink: 0;
  font-size: 12px;
  font-weight: 700;
  color: var(--pov-teal-deep);
  text-decoration: none;
}

.pov-cc-summary__link:hover {
  text-decoration: underline;
}

.pov-cc-summary__list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.pov-cc-summary__item {
  position: relative;
  padding-left: 14px;
  font-size: 13px;
  line-height: 1.45;
  color: var(--pov-ink-soft);
}

.pov-cc-summary__item::before {
  content: "";
  position: absolute;
  left: 0;
  top: 0.55em;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--pov-teal);
}

/* Legacy ops panel (other tabs) */
.pov-cc-ops-panel {
  padding: 14px 16px;
  border-radius: 14px;
  background: var(--pov-ops-bg);
  border: 1px solid color-mix(in srgb, var(--pov-navy) 10%, var(--pov-border));
  box-shadow: var(--pov-elev-rail);
}

.pov-cc-ops-panel__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 12px;
  padding-bottom: 10px;
  border-bottom: 1px solid color-mix(in srgb, var(--pov-navy) 8%, transparent);
}

.pov-cc-ops-panel__title {
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--pov-navy);
}

.pov-cc-ops-panel__tag {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--pov-teal-deep);
  padding: 3px 8px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--pov-teal) 12%, #fff);
  border: 1px solid color-mix(in srgb, var(--pov-teal) 22%, transparent);
}

.pov-cc-next-action {
  padding: 0;
  border-radius: 0;
  background: transparent;
  border: none;
  box-shadow: none;
}

.pov-cc-next-action__grid {
  display: grid;
  gap: 10px 16px;
  grid-template-columns: 1fr;
}

@media (min-width: 640px) {
  .pov-cc-next-action__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (min-width: 900px) {
  .pov-cc-next-action__grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

.pov-cc-next-action__field {
  min-width: 0;
  padding: 8px 10px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid color-mix(in srgb, var(--pov-navy) 6%, transparent);
}

.pov-cc-next-action__label {
  display: block;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--pov-meta);
  margin-bottom: 4px;
}

.pov-cc-next-action__value {
  margin: 0;
  font-size: 13px;
  line-height: 1.35;
  color: var(--pov-ink-soft);
}

.pov-cc-next-action__value--emphasis {
  font-weight: 700;
  color: var(--pov-navy);
  font-size: 14px;
}

.pov-cc-next-action__value--status {
  font-weight: 700;
}

.pov-cc-next-action__value--status-approved {
  color: var(--pov-teal-deep);
}

.pov-cc-next-action__value--status-denied {
  color: #b91c1c;
}

.pov-cc-next-action__value--status-discussed {
  color: #b45309;
}

.pov-cc-next-action__value--status-unknown {
  color: var(--pov-meta);
}

.pov-cc-next-action__value--muted {
  color: var(--pov-meta);
  font-style: italic;
}

.pov-cc-next-action__buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid color-mix(in srgb, var(--pov-navy) 8%, transparent);
}

.pov-cc-next-action__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 36px;
  padding: 7px 14px;
  border-radius: 9px;
  border: 1px solid color-mix(in srgb, var(--pov-navy) 14%, var(--pov-border));
  background: rgba(255, 255, 255, 0.88);
  color: var(--pov-navy);
  font-size: 12px;
  font-weight: 700;
  text-decoration: none;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.06);
}

.pov-cc-next-action__btn:hover {
  border-color: #94a3b8;
  box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08);
}

.pov-cc-next-action__btn--primary {
  background: linear-gradient(180deg, var(--pov-hero-accent), color-mix(in srgb, var(--pov-hero-accent) 82%, #000));
  border-color: color-mix(in srgb, var(--pov-hero-accent) 85%, #000);
  color: #fff;
  box-shadow: 0 4px 14px color-mix(in srgb, var(--pov-hero-accent) 28%, transparent);
}

.pov-cc-next-action__btn--primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 18px color-mix(in srgb, var(--pov-hero-accent) 32%, transparent);
  color: #fff;
}

/* §3b Mission status / field briefing panel */
.pov-cc-mission-status__grid {
  display: grid;
  gap: 10px;
  grid-template-columns: 1fr;
}

@media (min-width: 720px) {
  .pov-cc-mission-status__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.pov-cc-mission-status__grid--fallback {
  grid-template-columns: 1fr;
}

@media (min-width: 900px) {
  .pov-cc-mission-status__grid--fallback {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

.pov-cc-mission-status__card {
  padding: 10px 12px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.78);
  border: 1px solid color-mix(in srgb, var(--pov-navy) 7%, transparent);
}

.pov-cc-mission-status__card--briefing {
  border-color: color-mix(in srgb, var(--pov-teal) 24%, transparent);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.92) 0%, color-mix(in srgb, var(--pov-teal) 6%, #fff) 100%);
}

.pov-cc-mission-status__card--span-2 {
  grid-column: 1 / -1;
}

@media (min-width: 720px) {
  .pov-cc-mission-status__card--span-2 {
    grid-column: span 2;
  }
}

.pov-cc-mission-status__card-title {
  margin: 0 0 6px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--pov-meta);
}

.pov-cc-mission-status__facts {
  margin: 0;
  display: grid;
  gap: 6px;
}

.pov-cc-mission-status__fact {
  display: grid;
  grid-template-columns: 88px 1fr;
  gap: 8px;
  align-items: baseline;
}

.pov-cc-mission-status__fact dt {
  margin: 0;
  font-size: 11px;
  font-weight: 600;
  color: var(--pov-meta);
}

.pov-cc-mission-status__fact dd {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--pov-navy);
}

.pov-cc-mission-status__badge {
  display: inline-flex;
  align-items: center;
  min-height: 22px;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  color: var(--pov-navy);
  background: color-mix(in srgb, var(--pov-navy) 6%, #fff);
  border: 1px solid color-mix(in srgb, var(--pov-navy) 10%, transparent);
}

.pov-cc-mission-status__objective,
.pov-cc-mission-status__next-action {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  line-height: 1.35;
  color: var(--pov-navy);
}

.pov-cc-mission-status__next-detail {
  margin: 4px 0 0;
  font-size: 12px;
  line-height: 1.4;
  color: var(--pov-ink-soft);
}

.pov-cc-mission-status__briefing-status {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  line-height: 1.2;
  color: var(--pov-navy);
}

.pov-cc-mission-status__briefing-status--not_started {
  color: #b45309;
}

.pov-cc-mission-status__briefing-status--in_progress {
  color: #0369a1;
}

.pov-cc-mission-status__briefing-status--ready {
  color: var(--pov-teal-deep);
}

.pov-cc-mission-status__briefing-status--reviewed {
  color: var(--pov-navy);
}

.pov-cc-mission-status__next-step {
  margin: 6px 0 0;
  font-size: 12px;
  font-weight: 600;
  color: var(--pov-ink-soft);
}

.pov-cc-mission-status__observation {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
}

.pov-cc-mission-status__primary {
  margin-top: 12px;
}

.pov-cc-mission-status__secondary {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid color-mix(in srgb, var(--pov-navy) 8%, transparent);
}

/* §4 Field intelligence — collapsed summary strip */
.pov-cc-intel-zone {
  border-radius: 14px;
  background: var(--pov-support-bg);
  border: 1px solid color-mix(in srgb, var(--pov-navy) 8%, var(--pov-border));
  box-shadow: var(--pov-elev-layout);
  overflow: hidden;
}

.pov-cc-intel-zone--collapsed {
  box-shadow: 0 2px 10px rgba(15, 23, 42, 0.04);
}

.pov-cc-intel-zone__strip {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  padding: 12px 16px;
  border: none;
  background: transparent;
  text-align: left;
  cursor: pointer;
  color: inherit;
}

.pov-cc-intel-zone__strip:hover {
  background: color-mix(in srgb, var(--pov-navy) 3%, #fff);
}

.pov-cc-intel-zone__strip-copy {
  min-width: 0;
}

.pov-cc-intel-zone__toggle {
  flex-shrink: 0;
  font-size: 12px;
  font-weight: 800;
  color: color-mix(in srgb, var(--pov-hero-accent) 78%, var(--pov-navy));
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--pov-hero-accent) 22%, var(--pov-border));
  background: color-mix(in srgb, var(--pov-hero-accent) 6%, #fff);
}

.pov-cc-intel-zone__details {
  padding: 0 16px 16px;
  border-top: 1px solid color-mix(in srgb, var(--pov-navy) 8%, var(--pov-border));
}

.pov-cc-intel-zone__head {
  margin-bottom: 12px;
}

.pov-cc-intel-zone__kicker {
  margin: 0 0 4px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.11em;
  text-transform: uppercase;
  color: var(--pov-meta);
}

.pov-cc-intel-zone__title {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: var(--pov-navy);
}

.pov-cc-intel-zone__summary {
  margin: 4px 0 0;
  display: flex;
  flex-wrap: wrap;
  gap: 6px 10px;
  font-size: 12px;
  line-height: 1.4;
  color: var(--pov-meta);
}

.pov-cc-intel-zone__stat {
  font-weight: 700;
}

.pov-cc-intel-zone__stat--confirmed {
  color: var(--pov-teal-deep);
}

.pov-cc-intel-zone__stat--learning {
  color: #b45309;
}

.pov-cc-intel-zone__gaps {
  color: var(--pov-ink-soft);
}

.pov-cc-intel-zone__lead {
  margin: 12px 0;
  font-size: 12px;
  line-height: 1.4;
  color: var(--pov-meta);
  max-width: 62ch;
}

.pov-cc-intel-grid {
  display: grid;
  gap: 10px;
  grid-template-columns: 1fr;
}

@media (min-width: 640px) {
  .pov-cc-intel-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (min-width: 1100px) {
  .pov-cc-intel-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

.pov-cc-intel-card {
  padding: 10px 12px 12px;
  border-radius: 12px;
  background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
  border: 1px solid color-mix(in srgb, var(--pov-navy) 8%, var(--pov-border));
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.05);
}

.pov-cc-intel-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
}

.pov-cc-intel-card__title {
  margin: 0;
  font-size: 12px;
  font-weight: 700;
  color: var(--pov-navy);
}

.pov-cc-intel-card__meter {
  font-size: 10px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--pov-meta);
  padding: 2px 7px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--pov-navy) 5%, #fff);
}

.pov-cc-intel-card__progress {
  height: 3px;
  border-radius: 999px;
  background: #e2e8f0;
  overflow: hidden;
  margin-bottom: 8px;
}

.pov-cc-intel-card__progress-fill {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--pov-teal), color-mix(in srgb, var(--pov-teal) 55%, #fff));
}

.pov-cc-intel-card__list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.pov-cc-intel-card__row {
  padding-top: 6px;
  border-top: 1px solid color-mix(in srgb, var(--pov-navy) 6%, transparent);
}

.pov-cc-intel-card__row:first-child {
  padding-top: 0;
  border-top: none;
}

.pov-cc-intel-card__row-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 2px;
}

.pov-cc-intel-card__row-label {
  font-size: 11px;
  font-weight: 700;
  color: var(--pov-navy);
}

.pov-cc-intel-card__badge {
  flex-shrink: 0;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  padding: 2px 6px;
  border-radius: 999px;
}

.pov-cc-intel-card__badge--confirmed {
  color: var(--pov-teal-deep);
  background: color-mix(in srgb, var(--pov-teal) 12%, #fff);
  border: 1px solid color-mix(in srgb, var(--pov-teal) 25%, transparent);
}

.pov-cc-intel-card__badge--learning {
  color: #b45309;
  background: color-mix(in srgb, #d97706 10%, #fff);
  border: 1px solid color-mix(in srgb, #d97706 22%, transparent);
}

.pov-cc-intel-card__value {
  margin: 0;
  font-size: 12px;
  line-height: 1.35;
  color: var(--pov-ink-soft);
}

.pov-cc-intel-card__value--unknown {
  color: var(--pov-meta);
  font-style: italic;
}

.pov-cc-intel-card__gate {
  display: inline-block;
  margin-top: 4px;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--pov-meta);
}

.pov-cc-command-zone .pov-cc-command-grid--compact {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  padding: 0 14px 14px;
}

@media (min-width: 720px) {
  .pov-cc-command-zone .pov-cc-command-grid--compact {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

.pov-cc-command-zone.pov-cc-intel-zone--expanded .pov-cc-command-grid--compact {
  display: none;
}

.pov-cc-command-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

@media (min-width: 720px) {
  .pov-cc-command-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

.pov-cc-command-card {
  padding: 12px 14px;
  border-radius: 12px;
  background: #fff;
  border: 1px solid color-mix(in srgb, var(--pov-navy) 10%, var(--pov-border));
  box-shadow: var(--pov-elev-layout);
}

.pov-cc-command-card__label {
  margin: 0 0 6px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--pov-meta);
}

.pov-cc-command-card__value {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  line-height: 1.25;
  color: var(--pov-navy);
}

.pov-cc-command-card__detail {
  margin: 6px 0 0;
  font-size: 12px;
  line-height: 1.4;
  color: var(--pov-meta);
}

.pov-cc-command-card--open .pov-cc-command-card__value {
  color: color-mix(in srgb, var(--pov-navy) 55%, var(--pov-meta));
}

.pov-cc-command-card--learning .pov-cc-command-card__value {
  color: color-mix(in srgb, var(--pov-navy) 75%, #b45309);
}

.pov-cc-command-card--progress .pov-cc-command-card__value {
  color: #b45309;
}

.pov-cc-command-card--ready .pov-cc-command-card__value {
  color: #047857;
}

.pov-cc-command-card--action .pov-cc-command-card__value {
  color: var(--pov-navy);
}

.pov-cc-intel-zone__stat--action {
  font-weight: 700;
  color: var(--pov-navy);
}

/* §5 Recent activity — timeline feed */
.pov-cc-activity--feed {
  padding: 14px 16px 16px;
  border-radius: 14px;
  background: #fff;
  border: 1px solid color-mix(in srgb, var(--pov-navy) 10%, var(--pov-border));
  box-shadow: var(--pov-elev-layout);
  overflow: visible;
}

.pov-cc-activity {
  padding: 0;
  border-radius: 0;
  background: transparent;
  border: none;
  box-shadow: none;
}

.pov-cc-activity__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 12px;
}

.pov-cc-activity__kicker {
  margin: 0 0 4px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.11em;
  text-transform: uppercase;
  color: var(--pov-meta);
}

.pov-cc-activity__title {
  margin: 0;
  font-size: 16px;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--pov-navy);
}

.pov-cc-activity__link {
  font-size: 12px;
  font-weight: 700;
  color: color-mix(in srgb, var(--pov-hero-accent) 82%, var(--pov-navy));
  text-decoration: none;
  padding: 5px 10px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--pov-hero-accent) 18%, var(--pov-border));
  background: color-mix(in srgb, var(--pov-hero-accent) 5%, #fff);
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.pov-cc-activity__link:hover {
  border-color: color-mix(in srgb, var(--pov-hero-accent) 35%, var(--pov-border));
  box-shadow: 0 2px 8px color-mix(in srgb, var(--pov-hero-accent) 12%, transparent);
  color: color-mix(in srgb, var(--pov-hero-accent) 88%, var(--pov-navy));
}

.pov-cc-activity-feed {
  display: grid;
  gap: 14px;
  padding-left: 10px;
}

.pov-cc-activity-feed__group {
  position: relative;
}

.pov-cc-activity-feed__date {
  margin: 0 0 8px 4px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--pov-navy);
}

.pov-cc-activity-feed__list {
  margin: 0;
  padding: 0 0 0 18px;
  list-style: none;
  display: grid;
  gap: 0;
  border-left: 2px solid color-mix(in srgb, var(--pov-hero-accent) 35%, var(--pov-border));
}

.pov-cc-activity-feed__item {
  position: relative;
  padding-left: 12px;
}

.pov-cc-activity-feed__item::before {
  content: "";
  position: absolute;
  left: -21px;
  top: 18px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--pov-hero-accent);
  box-shadow: 0 0 0 3px #fff;
}

.pov-cc-activity-feed__link,
.pov-cc-activity-feed__row {
  display: grid;
  grid-template-columns: 28px 1fr auto;
  gap: 10px;
  align-items: start;
  padding: 10px 10px 10px 0;
  border-bottom: 1px solid color-mix(in srgb, var(--pov-navy) 6%, transparent);
  color: var(--pov-navy);
  text-decoration: none;
  transition: box-shadow 0.15s ease, border-color 0.15s ease;
}

.pov-cc-activity-feed__item:last-child .pov-cc-activity-feed__link,
.pov-cc-activity-feed__item:last-child .pov-cc-activity-feed__row {
  border-bottom: none;
}

.pov-cc-activity-feed__link:hover {
  background: transparent;
  color: var(--pov-navy);
  box-shadow: inset 3px 0 0 color-mix(in srgb, var(--pov-hero-accent) 45%, transparent);
}

.pov-cc-activity-feed__link:hover .pov-cc-activity-feed__line {
  color: var(--pov-navy);
}

.pov-cc-activity-feed__link:hover .pov-cc-activity-feed__type,
.pov-cc-activity-feed__link:hover .pov-cc-activity-feed__time {
  color: var(--pov-meta);
}

.pov-cc-activity-feed__icon {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: -0.02em;
  color: #fff;
  background: var(--pov-navy);
}

.pov-cc-activity-feed__icon--engagement { background: #2563eb; }
.pov-cc-activity-feed__icon--note { background: #64748b; }
.pov-cc-activity-feed__icon--intelligence { background: #9333ea; }
.pov-cc-activity-feed__icon--case { background: #0d9488; }
.pov-cc-activity-feed__icon--opportunity { background: #16a34a; }
.pov-cc-activity-feed__icon--product { background: #ca8a04; }
.pov-cc-activity-feed__icon--lifecycle { background: #475569; }

.pov-cc-activity-feed__icon--engagement::before { content: "EN"; }
.pov-cc-activity-feed__icon--note::before { content: "NT"; }
.pov-cc-activity-feed__icon--intelligence::before { content: "IN"; }
.pov-cc-activity-feed__icon--case::before { content: "CS"; }
.pov-cc-activity-feed__icon--opportunity::before { content: "EV"; }
.pov-cc-activity-feed__icon--product::before { content: "PR"; }
.pov-cc-activity-feed__icon--lifecycle::before { content: "MS"; }

.pov-cc-activity-feed__content {
  min-width: 0;
  display: grid;
  gap: 2px;
}

.pov-cc-activity-feed__type {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--pov-meta);
}

.pov-cc-activity-feed__line {
  font-size: 14px;
  font-weight: 700;
  line-height: 1.35;
  color: var(--pov-navy);
}

.pov-cc-activity-feed__time {
  font-size: 11px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--pov-meta);
  white-space: nowrap;
  padding-top: 2px;
}

.pov-cc-activity__empty {
  margin: 0;
  font-size: 13px;
  color: var(--pov-meta);
  font-style: italic;
}

/* §6 Optional intelligence reference */
.pov-cc-supporting--light {
  padding: 14px 16px;
  border-radius: 14px;
  background: var(--pov-support-bg);
  border: 1px solid color-mix(in srgb, var(--pov-navy) 8%, var(--pov-border));
  box-shadow: var(--pov-elev-ops);
}

.pov-cc-supporting__head {
  margin-bottom: 10px;
}

.pov-cc-supporting__kicker {
  margin: 0 0 4px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.11em;
  text-transform: uppercase;
  color: var(--pov-meta);
}

.pov-cc-supporting__title {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: var(--pov-navy);
}

.pov-cc-supporting {
  padding: 0;
  border-radius: 0;
  background: transparent;
  border: none;
  box-shadow: none;
}

.pov-cc-supporting__accordions {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.pov-cc-supporting__item {
  border: 1px solid color-mix(in srgb, var(--pov-navy) 8%, var(--pov-border));
  border-radius: 10px;
  overflow: hidden;
  background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
}

.pov-cc-supporting__summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  font-size: 13px;
  font-weight: 600;
  color: var(--pov-navy);
  cursor: pointer;
  list-style: none;
  background: #f8fafc;
}

.pov-cc-supporting__summary::-webkit-details-marker {
  display: none;
}

.pov-cc-supporting__body {
  padding: 8px 12px 12px;
  font-size: 13px;
  color: var(--pov-ink-soft);
}

.pov-cc-supporting__list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.pov-cc-supporting__row {
  line-height: 1.4;
}

.pov-cc-supporting__meta {
  color: var(--pov-meta);
}

.pov-cc-supporting__label {
  font-weight: 600;
  color: var(--pov-navy);
}

.pov-cc-supporting__empty {
  margin: 0;
  color: var(--pov-meta);
  font-style: italic;
}

.pov-cc-supporting__action {
  margin-top: 8px;
  padding: 6px 10px;
  border-radius: 6px;
  border: 1px solid var(--pov-border);
  background: #fff;
  font-size: 12px;
  font-weight: 600;
  color: var(--pov-navy);
  cursor: pointer;
}

.pov-cc-supporting__action:hover {
  border-color: color-mix(in srgb, var(--pov-navy) 18%, var(--pov-border));
  box-shadow: 0 2px 6px rgba(15, 23, 42, 0.06);
}

/* —— Field Briefing (provider overview operational intelligence) —— */
.pov-field-briefing {
  margin-top: 12px;
  padding: 16px 18px 18px;
  border-radius: 12px;
  border: 1px solid var(--pov-border);
  background: linear-gradient(180deg, #fff 0%, color-mix(in srgb, var(--pov-surface) 40%, #fff) 100%);
  display: grid;
  gap: 18px;
}

.pov-field-briefing__head {
  display: grid;
  gap: 4px;
}

.pov-field-briefing__kicker {
  margin: 0;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--pov-meta);
}

.pov-field-briefing__title {
  margin: 0;
  font-size: 18px;
  font-weight: 800;
  color: var(--pov-navy);
  letter-spacing: -0.02em;
}

.pov-field-briefing__section {
  display: grid;
  gap: 10px;
}

.pov-field-briefing__section--mission {
  padding-top: 4px;
}

.pov-field-briefing__section-title {
  margin: 0;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--pov-navy) 72%, var(--pov-meta));
}

.pov-field-briefing__progress-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.pov-field-briefing__progress-card {
  display: grid;
  gap: 4px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid var(--pov-border);
  background: color-mix(in srgb, var(--pov-surface) 55%, #fff);
}

.pov-field-briefing__progress-label {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--pov-meta);
}

.pov-field-briefing__progress-value {
  font-size: 16px;
  font-weight: 800;
  color: var(--pov-navy);
  letter-spacing: -0.02em;
}

.pov-field-briefing__progress-meta {
  font-size: 12px;
  line-height: 1.35;
  color: var(--pov-meta);
}

.pov-field-briefing__progress-note,
.pov-field-briefing__gaps-lead {
  margin: 0;
  font-size: 12px;
  line-height: 1.45;
  color: var(--pov-meta);
}

.pov-field-briefing__access-grid {
  display: grid;
  gap: 12px;
}

.pov-field-briefing__access-headline {
  display: flex;
  align-items: center;
}

.pov-field-briefing__status-value {
  display: inline-flex;
  align-items: center;
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 14px;
  font-weight: 800;
  letter-spacing: -0.01em;
}

.pov-field-briefing__status-value--approved {
  background: color-mix(in srgb, #059669 14%, #fff);
  color: #047857;
}

.pov-field-briefing__status-value--interested {
  background: color-mix(in srgb, #2563eb 12%, #fff);
  color: #1d4ed8;
}

.pov-field-briefing__status-value--pending {
  background: color-mix(in srgb, #d97706 14%, #fff);
  color: #b45309;
}

.pov-field-briefing__status-value--blocked {
  background: color-mix(in srgb, #dc2626 12%, #fff);
  color: #b91c1c;
}

.pov-field-briefing__status-value--unknown {
  background: color-mix(in srgb, var(--pov-meta) 12%, #fff);
  color: var(--pov-meta);
}

.pov-field-briefing__status-dl {
  margin: 0;
  display: grid;
  gap: 8px;
}

.pov-field-briefing__status-row {
  display: grid;
  grid-template-columns: minmax(120px, 34%) 1fr;
  gap: 10px;
  align-items: start;
  font-size: 13px;
  line-height: 1.45;
}

.pov-field-briefing__status-row dt {
  margin: 0;
  font-weight: 600;
  color: var(--pov-meta);
}

.pov-field-briefing__status-row dd {
  margin: 0;
  color: var(--pov-navy);
}

.pov-field-briefing__blocker-list {
  margin: 0;
  padding-left: 16px;
  display: grid;
  gap: 4px;
}

.pov-field-briefing__none {
  color: var(--pov-meta);
  font-style: italic;
}

.pov-field-briefing__confidence {
  font-weight: 700;
}

.pov-field-briefing__confidence--high {
  color: #047857;
}

.pov-field-briefing__confidence--moderate {
  color: #1d4ed8;
}

.pov-field-briefing__confidence--low {
  color: #b45309;
}

.pov-field-briefing__confidence--none {
  color: var(--pov-meta);
}

.pov-field-briefing__list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 8px;
}

.pov-field-briefing__list-item {
  display: grid;
  grid-template-columns: 18px 1fr;
  gap: 8px;
  align-items: start;
  font-size: 13px;
  line-height: 1.45;
  color: var(--pov-navy);
}

.pov-field-briefing__bullet {
  color: #059669;
  font-weight: 700;
  line-height: 1.45;
}

.pov-field-briefing__bullet--gap {
  color: #d97706;
  font-size: 10px;
  line-height: 1.8;
}

.pov-field-briefing__gap-domains {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.pov-field-briefing__gap-domain {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 11px;
  line-height: 1.2;
  border: 1px solid rgba(15, 23, 42, 0.1);
  background: rgba(248, 250, 252, 0.9);
}

.pov-field-briefing__gap-domain-label {
  font-weight: 600;
  color: var(--pov-navy);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.pov-field-briefing__gap-domain-status {
  color: var(--pov-meta);
  text-transform: capitalize;
}

.pov-field-briefing__gap-domain--known {
  border-color: rgba(5, 150, 105, 0.25);
  background: rgba(236, 253, 245, 0.9);
}

.pov-field-briefing__gap-domain--partial {
  border-color: rgba(217, 119, 6, 0.25);
  background: rgba(255, 251, 235, 0.95);
}

.pov-field-briefing__gap-domain--missing {
  border-color: rgba(220, 38, 38, 0.2);
  background: rgba(254, 242, 242, 0.95);
}

.pov-field-briefing__list-item--gap {
  grid-template-columns: auto 1fr;
  gap: 10px;
}

.pov-field-briefing__gap-priority {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 52px;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  line-height: 1.4;
}

.pov-field-briefing__gap-priority--high {
  color: #991b1b;
  background: rgba(254, 226, 226, 0.95);
}

.pov-field-briefing__gap-priority--medium {
  color: #92400e;
  background: rgba(254, 243, 199, 0.95);
}

.pov-field-briefing__gap-priority--low {
  color: #334155;
  background: rgba(241, 245, 249, 0.95);
}

.pov-field-briefing__empty {
  margin: 0;
  font-size: 13px;
  line-height: 1.45;
  color: var(--pov-meta);
  font-style: italic;
}

.pov-field-briefing__mission-card {
  padding: 14px 16px;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--pov-navy) 10%, var(--pov-border));
  background: color-mix(in srgb, var(--pov-navy) 3%, #fff);
  display: grid;
  gap: 12px;
}

.pov-field-briefing__mission-objective {
  margin: 0;
  font-size: 16px;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--pov-navy);
}

.pov-field-briefing__mission-dl {
  margin: 0;
  display: grid;
  gap: 10px;
}

.pov-field-briefing__mission-dl dt {
  margin: 0 0 2px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--pov-meta);
}

.pov-field-briefing__mission-dl dd {
  margin: 0;
  font-size: 13px;
  line-height: 1.45;
  color: var(--pov-navy);
}

.pov-field-briefing__footer {
  display: flex;
  justify-content: flex-start;
  padding-top: 2px;
}

.pov-field-briefing__footer-action {
  padding: 0;
  border: none;
  background: none;
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  color: var(--pov-navy);
  text-decoration: underline;
  text-underline-offset: 2px;
  cursor: pointer;
}

.pov-field-briefing__footer-action:hover {
  color: color-mix(in srgb, var(--pov-navy) 80%, #2563eb);
}

@media (max-width: 640px) {
  .pov-field-briefing {
    padding: 14px;
  }

  .pov-field-briefing__status-row {
    grid-template-columns: 1fr;
    gap: 2px;
  }
}

/* ── Compact overview layout (mission card) ── */
.pov-cc--compact {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-width: 920px;
}

.pov-overview-header {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px 20px;
  padding: 14px 16px;
  border-radius: 14px;
  background: linear-gradient(165deg, #0a101a 0%, #111827 55%, #0f172a 100%);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #e2e8f0;
}

.pov-overview-header__name {
  margin: 0;
  font-size: 22px;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: #fff;
}

.pov-overview-header__org {
  margin: 4px 0 0;
  font-size: 13px;
  color: rgba(148, 163, 184, 0.95);
}

.pov-overview-header__org--muted {
  font-style: italic;
  opacity: 0.85;
}

.pov-overview-header__pathway {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
  min-width: min(100%, 280px);
}

.pov-overview-header__stage {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pov-overview-header__stage-label,
.pov-overview-header__goal-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(148, 163, 184, 0.9);
}

.pov-overview-header__stage-pill {
  font-size: 12px;
}

.pov-overview-header__goal {
  margin: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  text-align: right;
}

.pov-overview-header__goal-text {
  font-size: 13px;
  font-weight: 600;
  color: #f8fafc;
  max-width: 36ch;
}

.pov-mission-card--active-touch {
  border-color: rgba(56, 189, 248, 0.45);
  box-shadow:
    0 0 0 1px rgba(56, 189, 248, 0.12),
    0 12px 32px rgba(15, 23, 42, 0.28);
}

.pov-mission-card--live {
  border-color: rgba(245, 158, 11, 0.55);
  box-shadow:
    0 0 0 1px rgba(245, 158, 11, 0.16),
    0 12px 32px rgba(15, 23, 42, 0.28);
}

.pov-mission-card--debrief {
  border-color: rgba(251, 191, 36, 0.5);
  box-shadow:
    0 0 0 1px rgba(251, 191, 36, 0.14),
    0 12px 32px rgba(15, 23, 42, 0.28);
}

.pov-mission-card__active {
  margin: -2px -2px 12px;
  padding: 14px 14px 16px;
  border-radius: 12px;
  background: linear-gradient(160deg, rgba(14, 165, 233, 0.16) 0%, rgba(15, 23, 42, 0.55) 100%);
  border: 1px solid rgba(56, 189, 248, 0.28);
}

.pov-mission-card--live .pov-mission-card__active {
  background: linear-gradient(160deg, rgba(245, 158, 11, 0.18) 0%, rgba(15, 23, 42, 0.55) 100%);
  border-color: rgba(245, 158, 11, 0.34);
}

.pov-mission-card--debrief .pov-mission-card__active {
  background: linear-gradient(160deg, rgba(251, 191, 36, 0.16) 0%, rgba(15, 23, 42, 0.55) 100%);
  border-color: rgba(251, 191, 36, 0.32);
}

.pov-mission-card--pending .pov-mission-card__active {
  background: linear-gradient(160deg, rgba(59, 130, 246, 0.14) 0%, rgba(15, 23, 42, 0.55) 100%);
  border-color: rgba(59, 130, 246, 0.28);
}

.pov-mission-card__active-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 8px;
}

.pov-mission-card__active-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.pov-mission-card__active-badge--live {
  color: #fde68a;
  background: rgba(245, 158, 11, 0.18);
  border: 1px solid rgba(245, 158, 11, 0.35);
  animation: pov-mission-card-live-pulse 2.4s ease-in-out infinite;
}

.pov-mission-card__active-badge--live::before {
  content: "";
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: #f59e0b;
  box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.55);
  animation: pov-mission-card-live-dot 2.4s ease-in-out infinite;
}

.pov-mission-card__active-badge--ready {
  color: #86efac;
  background: rgba(34, 197, 94, 0.14);
  border: 1px solid rgba(34, 197, 94, 0.28);
}

.pov-mission-card__active-badge--pending {
  color: #93c5fd;
  background: rgba(59, 130, 246, 0.14);
  border: 1px solid rgba(59, 130, 246, 0.28);
}

.pov-mission-card__active-badge--debrief {
  color: #fcd34d;
  background: rgba(251, 191, 36, 0.16);
  border: 1px solid rgba(251, 191, 36, 0.32);
}

.pov-mission-card__active-title {
  margin: 0;
  font-size: 22px;
  font-weight: 800;
  letter-spacing: -0.03em;
  color: #fff;
  line-height: 1.15;
}

.pov-mission-card__active-meta {
  margin: 6px 0 0;
  font-size: 13px;
  font-weight: 600;
  color: rgba(226, 232, 240, 0.92);
}

.pov-mission-card__active-next {
  margin: 8px 0 0;
  font-size: 13px;
  line-height: 1.4;
  color: rgba(148, 163, 184, 0.98);
}

.pov-mission-card__active-cta {
  display: inline-flex;
  margin-top: 14px;
  width: 100%;
  justify-content: center;
}

.pov-mission-card__active-shortcuts {
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid rgba(148, 163, 184, 0.16);
}

.pov-mission-card__active-shortcuts .pov-mission-card__quick-grid {
  margin-top: 0;
}

.pov-mission-card__intro-fast-log {
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px solid rgba(148, 163, 184, 0.16);
}

.pov-mission-card__intro-fast-log-lead {
  margin: 0 0 10px;
  font-size: 13px;
  line-height: 1.4;
  color: rgba(148, 163, 184, 0.98);
  text-align: center;
}

.pov-mission-card__intro-fast-log .pov-mission-card__cta {
  width: 100%;
  justify-content: center;
}

.pov-mission-card__pathway-context {
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid rgba(148, 163, 184, 0.18);
}

.pov-mission-card__pathway-context-label {
  margin: 0 0 10px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(148, 163, 184, 0.95);
}

.pov-mission-card__pathway-context .pov-mission-card__facts {
  margin-top: 0;
}

@keyframes pov-mission-card-live-pulse {
  0%,
  100% {
    box-shadow: 0 0 0 0 rgba(245, 158, 11, 0);
  }
  50% {
    box-shadow: 0 0 0 4px rgba(245, 158, 11, 0.12);
  }
}

@keyframes pov-mission-card-live-dot {
  0%,
  100% {
    box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.55);
  }
  50% {
    box-shadow: 0 0 0 5px rgba(245, 158, 11, 0);
  }
}

.pov-mission-card {
  padding: 14px 16px;
  border-radius: 14px;
  background: linear-gradient(165deg, #0a101a 0%, #111827 38%, #0f172a 100%);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.18);
  color: #e2e8f0;
}

.pov-mission-card__title {
  margin: 0;
  font-size: 17px;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: #fff;
}

.pov-mission-card__facts {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px 14px;
  margin: 12px 0 0;
}

.pov-mission-card__fact {
  margin: 0;
}

.pov-mission-card__fact--wide {
  grid-column: 1 / -1;
}

.pov-mission-card__fact dt {
  margin: 0 0 3px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(148, 163, 184, 0.92);
}

.pov-mission-card__fact dd {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #f1f5f9;
  line-height: 1.35;
}

.pov-mission-card__permission--positive {
  color: #86efac;
}

.pov-mission-card__permission--warm {
  color: #fde68a;
}

.pov-mission-card__permission--open {
  color: #cbd5e1;
}

.pov-mission-card__permission--muted {
  color: #94a3b8;
}

.pov-mission-card__upcoming {
  margin: 10px 0 0;
  font-size: 12px;
  color: rgba(148, 163, 184, 0.95);
}

.pov-mission-card__edit-link {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  margin-left: 8px;
  padding: 0;
  border: none;
  background: none;
  font: inherit;
  font-size: 11px;
  font-weight: 700;
  color: color-mix(in srgb, var(--pov-hero-accent, #38bdf8) 85%, #fff);
  cursor: pointer;
  text-decoration: underline;
}

.pov-mission-card__primary {
  margin-top: 12px;
}

.pov-mission-card__primary--dual {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  min-width: 0;
}

.pov-mission-card__cta,
.pov-mission-card__cta.mc-cta {
  display: inline-flex;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
  justify-content: center;
  align-items: center;
  white-space: normal;
  text-align: center;
  line-height: 1.25;
  padding-left: 10px;
  padding-right: 10px;
  overflow-wrap: anywhere;
  hyphens: auto;
}

.pov-mission-card__cta--secondary {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.18);
}

.pov-mission-card__error {
  margin: 8px 0 0;
  font-size: 12px;
  color: var(--danger, #f87171);
}

.pov-mission-card__quick {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.pov-mission-card__quick-label {
  margin: 0 0 8px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(148, 163, 184, 0.92);
}

.pov-mission-card__quick-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.pov-mission-card__quick-btn {
  display: inline-flex;
  align-items: center;
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(255, 255, 255, 0.05);
  font-size: 11px;
  font-weight: 600;
  color: #e2e8f0;
  text-decoration: none;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease;
}

.pov-mission-card__quick-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.22);
}

.pov-mission-card--observation-command {
  padding: 16px 18px;
}

.pov-obs-mission {
  display: grid;
  gap: 12px;
}

.pov-obs-mission__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.pov-obs-mission__title {
  margin: 0;
  font-size: 17px;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: #fff;
}

.pov-obs-mission__progress {
  margin: 2px 0 0;
  flex-shrink: 0;
  font-size: 12px;
  font-weight: 600;
  color: rgba(148, 163, 184, 0.95);
  text-align: right;
  white-space: nowrap;
}

.pov-obs-mission__objective {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: rgba(226, 232, 240, 0.92);
}

.pov-obs-mission__focus {
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid rgba(56, 189, 248, 0.18);
  background: rgba(15, 23, 42, 0.55);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
}

.pov-obs-mission__focus-label {
  margin: 0 0 6px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(125, 211, 252, 0.92);
}

.pov-obs-mission__procedure {
  margin: 0 0 4px;
  font-size: 15px;
  font-weight: 800;
  color: #f8fafc;
  line-height: 1.3;
}

.pov-obs-mission__meta {
  margin: 0 0 4px;
  font-size: 13px;
  font-weight: 600;
  color: rgba(203, 213, 225, 0.95);
}

.pov-obs-mission__status {
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  color: rgba(148, 163, 184, 0.95);
}

.pov-obs-mission__empty {
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px dashed rgba(255, 255, 255, 0.12);
  background: rgba(15, 23, 42, 0.35);
}

.pov-obs-mission__empty p {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: rgba(148, 163, 184, 0.95);
}

.pov-obs-mission__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.pov-obs-mission__action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 36px;
  padding: 0 14px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  text-decoration: none;
  cursor: pointer;
}

.pov-obs-mission__action--primary {
  flex: 1 1 140px;
}

.pov-obs-mission__action--secondary {
  flex: 1 1 120px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(255, 255, 255, 0.05);
  color: #e2e8f0;
}

.pov-obs-mission__action--secondary:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.22);
}

.pov-obs-mission__action--secondary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.pov-obs-mission__view-all {
  justify-self: start;
  font-size: 12px;
  font-weight: 700;
  color: color-mix(in srgb, var(--pov-hero-accent, #38bdf8) 85%, #fff);
  text-decoration: none;
}

.pov-obs-mission__view-all:hover {
  text-decoration: underline;
}

.pov-cc-summary {
  padding: 12px 14px;
}

.pov-cc-summary__title {
  margin: 0 0 8px;
  font-size: 14px;
  font-weight: 800;
}

.pov-cc-summary__list {
  margin: 0;
  padding-left: 18px;
  font-size: 13px;
  line-height: 1.45;
}

.pov-cc-summary__item + .pov-cc-summary__item {
  margin-top: 4px;
}

.pov-cc-activity--compact {
  padding: 12px 14px;
}

.pov-cc-activity--compact .pov-cc-activity__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}

.pov-cc-activity--compact .pov-cc-activity__title {
  margin: 0;
  font-size: 14px;
  font-weight: 800;
}

.pov-cc-activity-feed--compact {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.pov-cc-activity-feed--compact .pov-cc-activity-feed__item {
  margin: 0;
}

.pov-cc-activity-feed--compact .pov-cc-activity-feed__item::before {
  display: none;
}

.pov-cc-activity-feed--compact .pov-cc-activity-feed__link,
.pov-cc-activity-feed--compact .pov-cc-activity-feed__row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 10px;
  background: rgba(15, 23, 42, 0.04);
  border: 1px solid rgba(15, 23, 42, 0.06);
  text-decoration: none;
  color: inherit;
}

.pov-cc-activity-feed--compact .pov-cc-activity-feed__line {
  font-size: 13px;
  line-height: 1.35;
}

.pov-cc-activity-feed--compact .pov-cc-activity-feed__time {
  margin-left: auto;
  flex-shrink: 0;
  font-size: 11px;
  color: rgba(100, 116, 139, 0.95);
}

@media (max-width: 640px) {
  .pov-overview-header__pathway {
    align-items: flex-start;
    text-align: left;
  }

  .pov-overview-header__goal {
    align-items: flex-start;
    text-align: left;
  }

  .pov-mission-card__facts {
    grid-template-columns: 1fr;
  }

  /* Long labels like "Update Permission Status" overflow side-by-side on phones. */
  .pov-mission-card__primary--dual,
  .pov-cc-mission-control__cta-wrap--dual {
    grid-template-columns: 1fr;
  }

  .pov-mission-card__cta,
  .pov-mission-card__cta.mc-cta,
  .pov-cc-mission-control__cta,
  .pov-cc-mission-control__cta.mc-cta {
    width: 100%;
    max-width: 100%;
    min-height: 44px;
    white-space: normal;
  }

  .pov-cc-activity-feed--compact .pov-cc-activity-feed__link,
  .pov-cc-activity-feed--compact .pov-cc-activity-feed__row {
    flex-wrap: wrap;
    row-gap: 4px;
  }

  .pov-cc-activity-feed--compact .pov-cc-activity-feed__content {
    flex: 1 1 calc(100% - 36px);
    min-width: 0;
  }

  .pov-cc-activity-feed--compact .pov-cc-activity-feed__time {
    margin-left: 36px;
    width: calc(100% - 36px);
  }

  .pov-exec-actions {
    width: 100%;
  }

  .pov-exec-actions__primary,
  .pov-exec-actions__secondary-btn,
  .pov-exec-actions__more,
  .pov-mission-card__quick-btn,
  .pov-cc-next-action__btn,
  .pov-cc-mission-control__secondary-btn,
  .pov-cc-mission-control__edit-btn {
    min-height: 44px;
    box-sizing: border-box;
  }

  .pov-exec-actions__primary {
    width: 100%;
    justify-content: center;
  }

  .pov-exec-actions__secondary {
    width: 100%;
  }

  .pov-exec-actions__secondary-btn,
  .pov-mission-card__quick-btn,
  .pov-cc-next-action__btn,
  .pov-cc-mission-control__secondary-btn {
    flex: 1 1 calc(50% - 4px);
    justify-content: center;
  }

  .pov-cc-mission-control__secondary,
  .pov-mission-card__quick-grid {
    width: 100%;
  }
}
`;
