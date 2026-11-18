/** Observation Debrief prepare — sales coaching layout. */
export const prepareProviderDebriefCss = `
.prepare-for-meeting-page--provider-debrief {
  --dpb-page-bg: #dfe5ed;
  --dpb-surface: #ffffff;
  --dpb-border-soft: rgba(15, 23, 42, 0.08);
  --dpb-ink: #0b1220;
  --dpb-ink-soft: #334155;
  --dpb-meta: #64748b;
  --dpb-accent: #9333ea;
  --dpb-accent-deep: #7e22ce;
  --dpb-hero-bg: linear-gradient(152deg, #0a0f1a 0%, #0f172a 42%, #162033 100%);
  --dpb-elev-hero: 0 14px 44px rgba(15, 23, 42, 0.16);
  --dpb-pad-x: clamp(12px, 2.4vw, 20px);
  --dpb-read-max: 720px;
  --dpb-footer-h: calc(64px + env(safe-area-inset-bottom, 0px));
  min-height: 100%;
  background: var(--dpb-page-bg);
  color: var(--dpb-ink-soft);
  padding-bottom: var(--dpb-footer-h);
}

.prepare-for-meeting-page--provider-debrief.mc-workspace {
  --mc-accent: var(--dpb-accent);
  background: var(--dpb-page-bg);
}

.prepare-for-meeting-page--provider-debrief .dpb-command {
  position: relative;
  box-shadow: var(--dpb-elev-hero);
}

.prepare-for-meeting-page--provider-debrief .dpb-command__surface {
  background: var(--dpb-hero-bg);
  color: #f8fafc;
  padding: 8px var(--dpb-pad-x) 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.prepare-for-meeting-page--provider-debrief .dpb-command__top {
  display: flex;
  align-items: center;
  gap: 8px;
}

.prepare-for-meeting-page--provider-debrief .dpb-command__back-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

.prepare-for-meeting-page--provider-debrief .dpb-command__menu {
  color: #e2e8f0 !important;
  border-color: rgba(255, 255, 255, 0.14) !important;
}

.prepare-for-meeting-page--provider-debrief .dpb-command__back {
  font-size: 13px;
  font-weight: 700;
  color: rgba(226, 232, 240, 0.92);
  text-decoration: none;
}

.prepare-for-meeting-page--provider-debrief .dpb-command__kicker {
  margin: 0;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(148, 163, 184, 0.95);
}

.prepare-for-meeting-page--provider-debrief .dpb-command__provider {
  margin: 0;
  font-size: clamp(20px, 4vw, 26px);
  font-weight: 800;
  line-height: 1.12;
  letter-spacing: -0.03em;
  color: #f8fafc;
}

.prepare-for-meeting-page--provider-debrief .dpb-command__org {
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  color: rgba(226, 232, 240, 0.88);
}

.prepare-for-meeting-page--provider-debrief .dpb-command__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 2px;
}

.prepare-for-meeting-page--provider-debrief .dpb-command__type,
.prepare-for-meeting-page--provider-debrief .dpb-command__chip,
.prepare-for-meeting-page--provider-debrief .dpb-command__when {
  display: inline-flex;
  align-items: center;
  min-height: 22px;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.prepare-for-meeting-page--provider-debrief .dpb-command__type {
  color: #fff;
  background: color-mix(in srgb, var(--dpb-accent) 72%, rgba(15, 23, 42, 0.9));
}

.prepare-for-meeting-page--provider-debrief .dpb-command__chip,
.prepare-for-meeting-page--provider-debrief .dpb-command__when {
  color: rgba(226, 232, 240, 0.92);
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
}

.prepare-for-meeting-page--provider-debrief .dpb-main {
  max-width: var(--dpb-read-max);
  margin: 0 auto;
  padding: 10px var(--dpb-pad-x) 12px;
}

.prepare-for-meeting-page--provider-debrief .dpb-coach-stack {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.prepare-for-meeting-page--provider-debrief .dpb-coach {
  padding: 10px 12px;
  border-radius: 10px;
  background: var(--dpb-surface);
  border: 1px solid var(--dpb-border-soft);
}

.prepare-for-meeting-page--provider-debrief .dpb-coach__title {
  margin: 0 0 8px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--dpb-meta);
}

.prepare-for-meeting-page--provider-debrief .dpb-coach__section-sub {
  margin: -4px 0 10px;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.4;
  color: var(--dpb-meta);
}

.prepare-for-meeting-page--provider-debrief .dpb-conv__header {
  padding: 12px 14px;
  border-radius: 10px;
  background: var(--dpb-hero-bg);
  color: #f8fafc;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.prepare-for-meeting-page--provider-debrief .dpb-conv__kicker {
  margin: 0 0 6px;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(148, 163, 184, 0.95);
}

.prepare-for-meeting-page--provider-debrief .dpb-conv__question {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  line-height: 1.45;
  color: #f8fafc;
}

.prepare-for-meeting-page--provider-debrief .dpb-conv__decision {
  margin: 0 0 10px;
  font-size: 15px;
  font-weight: 800;
  line-height: 1.4;
  color: var(--dpb-ink);
}

.prepare-for-meeting-page--provider-debrief .dpb-conv__facts,
.prepare-for-meeting-page--provider-debrief .dpb-conv__ops {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.prepare-for-meeting-page--provider-debrief .dpb-conv__fact,
.prepare-for-meeting-page--provider-debrief .dpb-conv__ops-row {
  display: grid;
  grid-template-columns: minmax(0, 34%) minmax(0, 1fr);
  gap: 8px;
  padding: 8px 10px;
  border-radius: 8px;
  background: #fafbfc;
  border: 1px solid var(--dpb-border-soft);
}

.prepare-for-meeting-page--provider-debrief .dpb-conv__fact dt,
.prepare-for-meeting-page--provider-debrief .dpb-conv__ops-row dt {
  margin: 0;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--dpb-meta);
}

.prepare-for-meeting-page--provider-debrief .dpb-conv__fact dd,
.prepare-for-meeting-page--provider-debrief .dpb-conv__ops-row dd {
  margin: 0;
}

.prepare-for-meeting-page--provider-debrief .dpb-conv__ops-status {
  margin: 0 0 4px;
  font-size: 13px;
  font-weight: 700;
  color: var(--dpb-ink);
}

.prepare-for-meeting-page--provider-debrief .dpb-conv__outcomes {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 8px;
}

.prepare-for-meeting-page--provider-debrief .dpb-conv__outcome {
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid var(--dpb-border-soft);
  background: #fafbfc;
}

.prepare-for-meeting-page--provider-debrief .dpb-conv__outcome-name {
  margin: 0 0 4px;
  font-size: 13px;
  font-weight: 800;
  color: var(--dpb-ink);
}

.prepare-for-meeting-page--provider-debrief .dpb-conv__outcome-action {
  margin: 4px 0 0;
  font-size: 12px;
  font-weight: 700;
  color: var(--dpb-accent-deep);
}

.prepare-for-meeting-page--provider-debrief .dpb-conv__path-when {
  margin: 0 0 6px;
  font-size: 12px;
  line-height: 1.4;
  color: var(--dpb-ink-soft);
}

.prepare-for-meeting-page--provider-debrief .dpb-conv__path-when .dpb-coach__label {
  display: block;
  margin-bottom: 2px;
}

.prepare-for-meeting-page--provider-debrief .dpb-conv__conditional .dpb-brief__evidence-summary {
  color: var(--dpb-accent-deep);
}

.prepare-for-meeting-page--provider-debrief .dpb-coach__block + .dpb-coach__block {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--dpb-border-soft);
}

.prepare-for-meeting-page--provider-debrief .dpb-coach__label {
  margin: 0 0 3px;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--dpb-accent-deep);
}

.prepare-for-meeting-page--provider-debrief .dpb-coach__lead {
  margin: 0;
  font-size: 15px;
  font-weight: 800;
  line-height: 1.35;
  letter-spacing: -0.02em;
  color: var(--dpb-ink);
}

.prepare-for-meeting-page--provider-debrief .dpb-coach__body,
.prepare-for-meeting-page--provider-debrief .dpb-coach__opening,
.prepare-for-meeting-page--provider-debrief .dpb-coach__outcome {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.45;
  color: var(--dpb-ink-soft);
}

.prepare-for-meeting-page--provider-debrief .dpb-coach__opening {
  font-size: 14px;
  font-weight: 700;
  color: var(--dpb-ink);
}

.prepare-for-meeting-page--provider-debrief .dpb-coach__group {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--dpb-border-soft);
}

.prepare-for-meeting-page--provider-debrief .dpb-coach__list,
.prepare-for-meeting-page--provider-debrief .dpb-coach__checklist {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.prepare-for-meeting-page--provider-debrief .dpb-coach__list li,
.prepare-for-meeting-page--provider-debrief .dpb-coach__checklist li {
  position: relative;
  padding-left: 16px;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.4;
  color: var(--dpb-ink-soft);
}

.prepare-for-meeting-page--provider-debrief .dpb-coach__list li::before {
  content: "";
  position: absolute;
  left: 0;
  top: 7px;
  width: 5px;
  height: 5px;
  border-radius: 999px;
  background: var(--dpb-accent);
}

.prepare-for-meeting-page--provider-debrief .dpb-coach__checklist li::before {
  content: "";
  position: absolute;
  left: 0;
  top: 4px;
  width: 12px;
  height: 12px;
  border-radius: 3px;
  border: 2px solid color-mix(in srgb, var(--dpb-accent) 55%, transparent);
  background: transparent;
}

.prepare-for-meeting-page--provider-debrief .dpb-coach__paths {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.prepare-for-meeting-page--provider-debrief .dpb-coach__path {
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid var(--dpb-border-soft);
  background: #fafbfc;
}

.prepare-for-meeting-page--provider-debrief .dpb-coach__path--recommended {
  border-color: color-mix(in srgb, var(--dpb-accent) 40%, transparent);
  background: color-mix(in srgb, var(--dpb-accent) 6%, #fff);
}

.prepare-for-meeting-page--provider-debrief .dpb-coach__path-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 3px;
}

.prepare-for-meeting-page--provider-debrief .dpb-coach__path-name {
  font-size: 13px;
  font-weight: 800;
  color: var(--dpb-ink);
}

.prepare-for-meeting-page--provider-debrief .dpb-coach__path-badge {
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--dpb-accent-deep);
  padding: 2px 6px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--dpb-accent) 12%, #fff);
}

.prepare-for-meeting-page--provider-debrief .dpb-coach__path-note {
  margin: 0;
  font-size: 12px;
  line-height: 1.4;
  color: var(--dpb-ink-soft);
}

.prepare-for-meeting-page--provider-debrief .dpb-coach__product {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.prepare-for-meeting-page--provider-debrief .dpb-coach__product-name {
  margin: 0;
  font-size: 15px;
  font-weight: 800;
  color: var(--dpb-ink);
}

.prepare-for-meeting-page--provider-debrief .dpb-coach__product-name--muted {
  color: var(--dpb-meta);
  font-weight: 700;
}

.prepare-for-meeting-page--provider-debrief .dpb-coach__fit {
  margin: 0;
  display: inline-flex;
  align-items: center;
  min-height: 22px;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--dpb-accent-deep);
  background: color-mix(in srgb, var(--dpb-accent) 10%, #fff);
  border: 1px solid color-mix(in srgb, var(--dpb-accent) 24%, transparent);
}

.prepare-for-meeting-page--provider-debrief .dpb-coach__fit[data-fit-level="none"] {
  color: var(--dpb-meta);
  background: #f1f5f9;
  border-color: var(--dpb-border-soft);
}

.prepare-for-meeting-page--provider-debrief .dpb-brief__executive {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  line-height: 1.55;
  color: var(--dpb-ink);
  letter-spacing: -0.01em;
}

.prepare-for-meeting-page--provider-debrief .dpb-brief__snapshot-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.prepare-for-meeting-page--provider-debrief .dpb-brief__snapshot-tile {
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid var(--dpb-border-soft);
  background: #fafbfc;
}

.prepare-for-meeting-page--provider-debrief .dpb-brief__snapshot-label {
  margin: 0 0 4px;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--dpb-meta);
}

.prepare-for-meeting-page--provider-debrief .dpb-brief__snapshot-value {
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  line-height: 1.35;
  color: var(--dpb-ink);
}

.prepare-for-meeting-page--provider-debrief .dpb-brief__products {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.prepare-for-meeting-page--provider-debrief .dpb-brief__product {
  padding: 12px;
  border-radius: 8px;
  border: 1px solid var(--dpb-border-soft);
  background: #fafbfc;
}

.prepare-for-meeting-page--provider-debrief .dpb-brief__product--lead {
  border-color: color-mix(in srgb, var(--dpb-accent) 35%, transparent);
  background: color-mix(in srgb, var(--dpb-accent) 5%, #fff);
}

.prepare-for-meeting-page--provider-debrief .dpb-brief__product-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 10px;
}

.prepare-for-meeting-page--provider-debrief .dpb-brief__product-name {
  margin: 0;
  font-size: 15px;
  font-weight: 800;
  color: var(--dpb-ink);
}

.prepare-for-meeting-page--provider-debrief .dpb-brief__product-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  justify-content: flex-end;
}

.prepare-for-meeting-page--provider-debrief .dpb-brief__product-badge {
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--dpb-accent-deep);
  padding: 2px 6px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--dpb-accent) 12%, #fff);
}

.prepare-for-meeting-page--provider-debrief .dpb-brief__product-fit {
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--dpb-ink-soft);
  padding: 2px 6px;
  border-radius: 999px;
  background: #f1f5f9;
  border: 1px solid var(--dpb-border-soft);
}

.prepare-for-meeting-page--provider-debrief .dpb-brief__product[data-fit-level="high"] .dpb-brief__product-fit {
  color: var(--dpb-accent-deep);
  background: color-mix(in srgb, var(--dpb-accent) 10%, #fff);
  border-color: color-mix(in srgb, var(--dpb-accent) 22%, transparent);
}

.prepare-for-meeting-page--provider-debrief .dpb-brief__product-field {
  margin-bottom: 8px;
}

.prepare-for-meeting-page--provider-debrief .dpb-brief__product-field:last-child {
  margin-bottom: 0;
}

.prepare-for-meeting-page--provider-debrief .dpb-brief__evidence {
  border-radius: 8px;
  border: 1px solid var(--dpb-border-soft);
  background: var(--dpb-surface);
  overflow: hidden;
}

.prepare-for-meeting-page--provider-debrief .dpb-brief__evidence-summary {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 12px 14px;
  font-size: 14px;
  font-weight: 800;
  color: var(--dpb-ink);
  cursor: pointer;
  list-style: none;
}

.prepare-for-meeting-page--provider-debrief .dpb-brief__evidence-summary::-webkit-details-marker {
  display: none;
}

.prepare-for-meeting-page--provider-debrief .dpb-brief__evidence-hint {
  font-size: 11px;
  font-weight: 600;
  color: var(--dpb-meta);
}

.prepare-for-meeting-page--provider-debrief .dpb-brief__evidence-body {
  padding: 0 14px 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  border-top: 1px solid var(--dpb-border-soft);
}

.prepare-for-meeting-page--provider-debrief .dpb-brief__evidence-block {
  padding-top: 12px;
}

.prepare-for-meeting-page--provider-debrief .dpb-brief__refs li {
  font-size: 12px;
  color: var(--dpb-meta);
}

.prepare-for-meeting-page--provider-debrief .dpb-coach__readiness-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.prepare-for-meeting-page--provider-debrief .dpb-coach__dimension {
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid var(--dpb-border-soft);
  background: #fafbfc;
}

.prepare-for-meeting-page--provider-debrief .dpb-coach__dimension-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
}

.prepare-for-meeting-page--provider-debrief .dpb-coach__dimension-name {
  font-size: 13px;
  font-weight: 800;
  color: var(--dpb-ink);
}

.prepare-for-meeting-page--provider-debrief .dpb-coach__dimension-meta {
  display: flex;
  align-items: center;
  gap: 6px;
}

.prepare-for-meeting-page--provider-debrief .dpb-coach__dimension-score {
  font-size: 12px;
  font-weight: 800;
  color: var(--dpb-ink);
}

.prepare-for-meeting-page--provider-debrief .dpb-coach__confidence {
  display: inline-flex;
  align-items: center;
  min-height: 20px;
  padding: 2px 6px;
  border-radius: 999px;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--dpb-accent-deep);
  background: color-mix(in srgb, var(--dpb-accent) 10%, #fff);
  border: 1px solid color-mix(in srgb, var(--dpb-accent) 20%, transparent);
}

.prepare-for-meeting-page--provider-debrief .dpb-coach__score-bar {
  height: 6px;
  border-radius: 999px;
  background: #e2e8f0;
  overflow: hidden;
  margin-bottom: 6px;
}

.prepare-for-meeting-page--provider-debrief .dpb-coach__score-bar-fill {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, var(--dpb-accent) 0%, var(--dpb-accent-deep) 100%);
}

.prepare-for-meeting-page--provider-debrief .dpb-coach__score-bar-fill[data-band="weak"] {
  background: #94a3b8;
}

.prepare-for-meeting-page--provider-debrief .dpb-coach__score-bar-fill[data-band="developing"] {
  background: #f59e0b;
}

.prepare-for-meeting-page--provider-debrief .dpb-coach__score-bar-fill[data-band="strong"] {
  background: var(--dpb-accent);
}

.prepare-for-meeting-page--provider-debrief .dpb-coach__score-bar-fill[data-band="ready"] {
  background: #16a34a;
}

.prepare-for-meeting-page--provider-debrief .dpb-coach__dimension-reasoning {
  margin: 0 0 6px;
  font-size: 12px;
  line-height: 1.45;
  color: var(--dpb-ink-soft);
}

.prepare-for-meeting-page--provider-debrief .dpb-coach__dimension-evidence {
  margin: 0;
  padding-left: 14px;
}

.prepare-for-meeting-page--provider-debrief .dpb-coach__dimension-evidence li {
  font-size: 11px;
  line-height: 1.4;
  color: var(--dpb-meta);
}

.prepare-for-meeting-page--provider-debrief .dpb-coach__lever-risk {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 8px;
}

.prepare-for-meeting-page--provider-debrief .dpb-coach__callout {
  margin: 0;
  padding: 8px 10px;
  border-radius: 8px;
  font-size: 12px;
  line-height: 1.4;
  font-weight: 600;
}

.prepare-for-meeting-page--provider-debrief .dpb-coach__callout--lever {
  color: var(--dpb-accent-deep);
  background: color-mix(in srgb, var(--dpb-accent) 8%, #fff);
  border: 1px solid color-mix(in srgb, var(--dpb-accent) 20%, transparent);
}

.prepare-for-meeting-page--provider-debrief .dpb-coach__callout--risk {
  color: #b45309;
  background: color-mix(in srgb, #f59e0b 8%, #fff);
  border: 1px solid color-mix(in srgb, #f59e0b 20%, transparent);
}

.prepare-for-meeting-page--provider-debrief .dpb-coach-alert {
  margin: 0;
  padding: 10px 12px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  background: color-mix(in srgb, #f59e0b 10%, #fff);
  border: 1px solid color-mix(in srgb, #f59e0b 24%, transparent);
}

.prepare-for-meeting-page--provider-debrief .dpb-active-prepare-banner {
  margin: 0 0 12px;
}

.prepare-for-meeting-page--provider-debrief .dpb-coach-empty {
  margin: 0;
  font-size: 13px;
  color: var(--dpb-meta);
}

.prepare-for-meeting-page--provider-debrief .dpb-coach-links {
  display: flex;
  gap: 10px;
}

.prepare-for-meeting-page--provider-debrief .dpb-coach-link {
  font-size: 12px;
  font-weight: 700;
  color: var(--dpb-accent-deep);
  text-decoration: none;
}

.prepare-for-meeting-page--provider-debrief .dpb-coach-link--muted {
  color: var(--dpb-meta);
  font-weight: 600;
}

.prepare-for-meeting-page--provider-debrief .dpb-footer {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 40;
  padding: 8px var(--dpb-pad-x) calc(8px + env(safe-area-inset-bottom, 0px));
  background: linear-gradient(180deg, transparent 0%, var(--dpb-page-bg) 20%);
  border-top: 1px solid var(--dpb-border-soft);
}

.prepare-for-meeting-page--provider-debrief .dpb-footer__inner {
  max-width: var(--dpb-read-max);
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.prepare-for-meeting-page--provider-debrief .dpb-footer__primary {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  border: 0;
  border-radius: 10px;
  font-family: inherit;
  font-size: 14px;
  font-weight: 800;
  text-decoration: none;
  color: #fff;
  background: linear-gradient(135deg, var(--dpb-accent) 0%, var(--dpb-accent-deep) 100%);
  cursor: pointer;
}

.prepare-for-meeting-page--provider-debrief .dpb-footer__primary:disabled {
  opacity: 0.6;
  cursor: default;
}

.prepare-for-meeting-page--provider-debrief .dpb-footer__alert {
  margin: 0 0 10px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, #b3261e 35%, var(--dpb-border, #d8dce4));
  background: color-mix(in srgb, #b3261e 8%, #fff);
  color: #8c1d18;
  font-size: 13px;
  font-weight: 600;
}

.prepare-for-meeting-page--provider-debrief .dpb-footer__secondary {
  text-align: center;
  font-size: 11px;
  font-weight: 700;
  color: var(--dpb-meta);
  text-decoration: none;
}

@media (min-width: 720px) {
  .prepare-for-meeting-page--provider-debrief .dpb-footer__inner {
    flex-direction: row;
    align-items: center;
  }

  .prepare-for-meeting-page--provider-debrief .dpb-footer__primary {
    flex: 1;
  }
}

/* Planning workspace */
.prepare-for-meeting-page--provider-debrief .dpb-plan-stack {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.prepare-for-meeting-page--provider-debrief .dpb-prepare-summary {
  padding: 14px 14px 12px;
  border-radius: 12px;
  background: linear-gradient(145deg, #ffffff 0%, #f8fafc 100%);
  border: 1px solid color-mix(in srgb, var(--dpb-accent) 16%, var(--dpb-border-soft));
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.05);
}

.prepare-for-meeting-page--provider-debrief .dpb-prepare-summary__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.prepare-for-meeting-page--provider-debrief .dpb-prepare-summary__lead {
  margin: 0 0 8px;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.5;
  color: var(--dpb-ink-soft);
}

.prepare-for-meeting-page--provider-debrief .dpb-prepare-summary__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.prepare-for-meeting-page--provider-debrief .dpb-prepare-summary__pill {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  padding: 2px 9px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  color: var(--dpb-ink-soft);
  background: #f1f5f9;
  border: 1px solid var(--dpb-border-soft);
}

.prepare-for-meeting-page--provider-debrief .dpb-prepare-summary__pill--accent {
  color: var(--dpb-accent-deep);
  background: color-mix(in srgb, var(--dpb-accent) 10%, #fff);
  border-color: color-mix(in srgb, var(--dpb-accent) 24%, transparent);
}

.prepare-for-meeting-page--provider-debrief .dpb-prepare-summary__save {
  flex-shrink: 0;
  min-height: 28px;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.02em;
  color: var(--dpb-meta);
  background: #f8fafc;
  border: 1px solid var(--dpb-border-soft);
}

.prepare-for-meeting-page--provider-debrief .dpb-prepare-summary__save--saved {
  color: #166534;
  background: #ecfdf3;
  border-color: #bbf7d0;
}

.prepare-for-meeting-page--provider-debrief .dpb-prepare-summary__save--saving {
  color: var(--dpb-accent-deep);
  background: color-mix(in srgb, var(--dpb-accent) 8%, #fff);
  border-color: color-mix(in srgb, var(--dpb-accent) 22%, transparent);
}

.prepare-for-meeting-page--provider-debrief .dpb-prepare-summary__save--error {
  color: #b42318;
  background: #fef3f2;
  border-color: #fecdca;
}

.prepare-for-meeting-page--provider-debrief .dpb-prepare-summary__checklist {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.prepare-for-meeting-page--provider-debrief .dpb-prepare-summary__check {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 26px;
  padding: 2px 9px 2px 7px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  color: var(--dpb-meta);
  background: #fff;
  border: 1px dashed color-mix(in srgb, var(--dpb-meta) 28%, transparent);
}

.prepare-for-meeting-page--provider-debrief .dpb-prepare-summary__check--done {
  color: var(--dpb-ink-soft);
  border-style: solid;
  border-color: color-mix(in srgb, var(--dpb-accent) 24%, transparent);
  background: color-mix(in srgb, var(--dpb-accent) 5%, #fff);
}

.prepare-for-meeting-page--provider-debrief .dpb-prepare-summary__check-dot {
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: #cbd5e1;
}

.prepare-for-meeting-page--provider-debrief .dpb-prepare-summary__check--done .dpb-prepare-summary__check-dot {
  background: var(--dpb-accent);
}

.prepare-for-meeting-page--provider-debrief .dpb-prepare-loading {
  display: grid;
  gap: 8px;
  padding: 14px;
  border-radius: 12px;
  background: var(--dpb-surface);
  border: 1px solid var(--dpb-border-soft);
}

.prepare-for-meeting-page--provider-debrief .dpb-prepare-loading__bar {
  height: 10px;
  border-radius: 999px;
  background: linear-gradient(90deg, #eef2f7 0%, #f8fafc 45%, #eef2f7 90%);
  background-size: 200% 100%;
  animation: dpb-prepare-shimmer 1.2s ease-in-out infinite;
}

.prepare-for-meeting-page--provider-debrief .dpb-prepare-loading__bar--short {
  width: 62%;
}

@keyframes dpb-prepare-shimmer {
  0% { background-position: 100% 0; }
  100% { background-position: -100% 0; }
}

.prepare-for-meeting-page--provider-debrief .dpb-plan-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.prepare-for-meeting-page--provider-debrief .dpb-plan-group__head {
  padding: 0 2px;
}

.prepare-for-meeting-page--provider-debrief .dpb-plan-group__label {
  margin: 0;
  font-size: 13px;
  font-weight: 800;
  letter-spacing: -0.01em;
  color: var(--dpb-ink);
}

.prepare-for-meeting-page--provider-debrief .dpb-plan-group__hint {
  margin: 2px 0 0;
  font-size: 12px;
  font-weight: 600;
  color: var(--dpb-meta);
}

.prepare-for-meeting-page--provider-debrief .dpb-plan-group__sections {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.prepare-for-meeting-page--provider-debrief .dpb-plan__status {
  min-height: 16px;
  font-size: 11px;
  font-weight: 700;
  color: var(--dpb-meta);
  text-align: right;
}

.prepare-for-meeting-page--provider-debrief .dpb-plan {
  padding: 10px 12px;
  border-radius: 10px;
  background: var(--dpb-surface);
  border: 1px solid var(--dpb-border-soft);
}

.prepare-for-meeting-page--provider-debrief .dpb-plan--emphasis {
  border-color: color-mix(in srgb, var(--dpb-accent) 22%, var(--dpb-border-soft));
  box-shadow: inset 3px 0 0 color-mix(in srgb, var(--dpb-accent) 72%, transparent);
}

.prepare-for-meeting-page--provider-debrief .dpb-plan--optional {
  background: #fcfcfd;
}

.prepare-for-meeting-page--provider-debrief .dpb-plan--collapsible {
  padding: 0;
  overflow: hidden;
}

.prepare-for-meeting-page--provider-debrief .dpb-plan__summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 12px;
  cursor: pointer;
  list-style: none;
}

.prepare-for-meeting-page--provider-debrief .dpb-plan__summary::-webkit-details-marker {
  display: none;
}

.prepare-for-meeting-page--provider-debrief .dpb-plan__summary-text {
  display: grid;
  gap: 2px;
}

.prepare-for-meeting-page--provider-debrief .dpb-plan__hint--inline {
  margin: 0;
  text-transform: none;
  letter-spacing: 0;
  font-weight: 600;
}

.prepare-for-meeting-page--provider-debrief .dpb-plan__summary-chevron {
  width: 8px;
  height: 8px;
  border-right: 2px solid var(--dpb-meta);
  border-bottom: 2px solid var(--dpb-meta);
  transform: rotate(45deg);
  transition: transform 0.15s ease;
  flex-shrink: 0;
}

.prepare-for-meeting-page--provider-debrief .dpb-plan--collapsible[open] .dpb-plan__summary-chevron {
  transform: rotate(225deg);
  margin-top: 4px;
}

.prepare-for-meeting-page--provider-debrief .dpb-plan__body {
  padding: 0 12px 12px;
}

.prepare-for-meeting-page--provider-debrief .dpb-plan--briefing {
  border-style: dashed;
}

.prepare-for-meeting-page--provider-debrief .dpb-plan__head {
  margin-bottom: 8px;
}

.prepare-for-meeting-page--provider-debrief .dpb-plan__head-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.prepare-for-meeting-page--provider-debrief .dpb-plan__head-actions {
  flex-shrink: 0;
}

.prepare-for-meeting-page--provider-debrief .dpb-plan__title {
  margin: 0;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--dpb-meta);
}

.prepare-for-meeting-page--provider-debrief .dpb-plan__hint {
  margin: 3px 0 0;
  font-size: 11px;
  font-weight: 600;
  line-height: 1.35;
  color: var(--dpb-meta);
}

.prepare-for-meeting-page--provider-debrief .dpb-plan__subsection {
  margin: 0 0 6px;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--dpb-accent-deep);
}

.prepare-for-meeting-page--provider-debrief .dpb-plan__signal {
  margin: 10px 0 0;
  padding: 10px 12px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.5;
  color: var(--dpb-ink-soft);
  background: color-mix(in srgb, var(--dpb-accent) 6%, #fff);
  border-left: 3px solid color-mix(in srgb, var(--dpb-accent) 55%, transparent);
}

.prepare-for-meeting-page--provider-debrief .dpb-plan__prompt {
  display: block;
  margin: 0 0 6px;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.4;
  color: var(--dpb-ink-soft);
}

.prepare-for-meeting-page--provider-debrief .dpb-plan__textarea,
.prepare-for-meeting-page--provider-debrief .dpb-plan__input {
  width: 100%;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid var(--dpb-border-soft);
  background: #fafbfc;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.45;
  color: var(--dpb-ink);
  resize: vertical;
  outline: none;
  font-family: inherit;
}

.prepare-for-meeting-page--provider-debrief .dpb-plan__textarea:focus,
.prepare-for-meeting-page--provider-debrief .dpb-plan__input:focus {
  border-color: color-mix(in srgb, var(--dpb-accent) 45%, transparent);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--dpb-accent) 12%, transparent);
}

.prepare-for-meeting-page--provider-debrief .dpb-plan__textarea--objective {
  font-size: 15px;
  font-weight: 700;
  line-height: 1.4;
}

.prepare-for-meeting-page--provider-debrief .dpb-plan__facts,
.prepare-for-meeting-page--provider-debrief .dpb-plan__questions {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.prepare-for-meeting-page--provider-debrief .dpb-plan__facts--chips {
  gap: 8px;
}

.prepare-for-meeting-page--provider-debrief .dpb-plan__fact {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  padding: 9px 10px;
  border-radius: 8px;
  background: #f8fafc;
  border: 1px solid var(--dpb-border-soft);
}

.prepare-for-meeting-page--provider-debrief .dpb-plan__fact-label {
  font-size: 13px;
  font-weight: 700;
  line-height: 1.4;
  color: var(--dpb-ink);
}

.prepare-for-meeting-page--provider-debrief .dpb-plan__fact-count {
  flex-shrink: 0;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  color: var(--dpb-accent-deep);
  background: color-mix(in srgb, var(--dpb-accent) 10%, #fff);
  border: 1px solid color-mix(in srgb, var(--dpb-accent) 20%, transparent);
  border-radius: 999px;
  padding: 3px 7px;
  white-space: nowrap;
}

.prepare-for-meeting-page--provider-debrief .dpb-plan__questions li {
  position: relative;
  padding-left: 14px;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.4;
  color: var(--dpb-ink-soft);
}

.prepare-for-meeting-page--provider-debrief .dpb-plan__questions li::before {
  content: "?";
  position: absolute;
  left: 0;
  top: 0;
  font-size: 11px;
  font-weight: 800;
  color: var(--dpb-accent-deep);
}

.prepare-for-meeting-page--provider-debrief .dpb-plan__checklist {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.prepare-for-meeting-page--provider-debrief .dpb-plan__check {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.4;
  color: var(--dpb-ink-soft);
  cursor: pointer;
}

.prepare-for-meeting-page--provider-debrief .dpb-plan__check input {
  margin-top: 3px;
  accent-color: var(--dpb-accent);
}

.prepare-for-meeting-page--provider-debrief .dpb-plan__add-row {
  display: flex;
  gap: 6px;
  margin-top: 8px;
}

.prepare-for-meeting-page--provider-debrief .dpb-plan__input--inline {
  flex: 1;
  min-width: 0;
  resize: none;
}

.prepare-for-meeting-page--provider-debrief .dpb-plan__add-btn {
  flex-shrink: 0;
  min-height: 40px;
  padding: 0 12px;
  border-radius: 8px;
  border: 1px solid var(--dpb-border-soft);
  background: #fff;
  font-size: 12px;
  font-weight: 800;
  color: var(--dpb-accent-deep);
  cursor: pointer;
}

.prepare-for-meeting-page--provider-debrief .dpb-plan__outcomes {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 8px;
}

.prepare-for-meeting-page--provider-debrief .dpb-plan__outcome {
  display: inline-flex;
  align-items: center;
  min-height: 34px;
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid var(--dpb-border-soft);
  background: #fafbfc;
  font-size: 12px;
  font-weight: 700;
  color: var(--dpb-ink-soft);
  cursor: pointer;
}

.prepare-for-meeting-page--provider-debrief .dpb-plan__outcome input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.prepare-for-meeting-page--provider-debrief .dpb-plan__outcome--selected {
  border-color: color-mix(in srgb, var(--dpb-accent) 45%, transparent);
  background: color-mix(in srgb, var(--dpb-accent) 8%, #fff);
  color: var(--dpb-accent-deep);
}

.prepare-for-meeting-page--provider-debrief .dpb-plan__outcome + .dpb-plan__input {
  margin-top: 8px;
}

.prepare-for-meeting-page--provider-debrief .dpb-plan__assist-row {
  display: flex;
  gap: 6px;
  margin-top: 8px;
}

.prepare-for-meeting-page--provider-debrief .dpb-plan__assist-btn {
  min-height: 34px;
  padding: 0 12px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--dpb-accent) 30%, transparent);
  background: color-mix(in srgb, var(--dpb-accent) 6%, #fff);
  font-size: 12px;
  font-weight: 800;
  color: var(--dpb-accent-deep);
  cursor: pointer;
}

.prepare-for-meeting-page--provider-debrief .dpb-plan__assist-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.prepare-for-meeting-page--provider-debrief .dpb-plan__assist-btn--inline {
  min-height: 28px;
  padding: 0 10px;
  font-size: 11px;
}

.prepare-for-meeting-page--provider-debrief .dpb-plan__qcards {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.prepare-for-meeting-page--provider-debrief .dpb-plan__qcard {
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid var(--dpb-border-soft);
  background: #fafbfc;
}

.prepare-for-meeting-page--provider-debrief .dpb-plan__qcard--used {
  border-color: color-mix(in srgb, var(--dpb-accent) 35%, transparent);
  background: color-mix(in srgb, var(--dpb-accent) 5%, #fff);
}

.prepare-for-meeting-page--provider-debrief .dpb-plan__qcard--editing {
  background: #fff;
}

.prepare-for-meeting-page--provider-debrief .dpb-plan__qcard-text {
  margin: 0 0 8px;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.45;
  color: var(--dpb-ink);
}

.prepare-for-meeting-page--provider-debrief .dpb-plan__qcard-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.prepare-for-meeting-page--provider-debrief .dpb-plan__qcard-btn {
  min-height: 28px;
  padding: 0 10px;
  border-radius: 6px;
  border: 1px solid var(--dpb-border-soft);
  background: #fff;
  font-size: 11px;
  font-weight: 700;
  color: var(--dpb-ink-soft);
  cursor: pointer;
}

.prepare-for-meeting-page--provider-debrief .dpb-plan__qcard-btn--primary {
  border-color: color-mix(in srgb, var(--dpb-accent) 35%, transparent);
  color: var(--dpb-accent-deep);
  background: color-mix(in srgb, var(--dpb-accent) 6%, #fff);
}

.prepare-for-meeting-page--provider-debrief .dpb-plan__textarea--compact {
  margin-bottom: 8px;
  min-height: 56px;
}

.prepare-for-meeting-page--provider-debrief .dpb-plan__email-draft {
  display: grid;
  gap: 12px;
}

.prepare-for-meeting-page--provider-debrief .dpb-plan__email-goals {
  display: grid;
  gap: 8px;
}

.prepare-for-meeting-page--provider-debrief .dpb-plan__email-goals .dpb-plan__outcome span {
  display: grid;
  gap: 2px;
}

.prepare-for-meeting-page--provider-debrief .dpb-plan__email-goals .dpb-plan__outcome small {
  font-size: 12px;
  font-weight: 400;
  color: var(--dpb-muted, #5c6670);
  line-height: 1.35;
}

.prepare-for-meeting-page--provider-debrief .dpb-plan__email-product-label,
.prepare-for-meeting-page--provider-debrief .dpb-plan__email-field-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--dpb-ink, #1a2332);
}

.prepare-for-meeting-page--provider-debrief .dpb-plan__email-product {
  max-width: 320px;
}

.prepare-for-meeting-page--provider-debrief .dpb-plan__email-meta {
  font-size: 12px;
  color: var(--dpb-muted, #5c6670);
  align-self: center;
}

.prepare-for-meeting-page--provider-debrief .dpb-plan__email-error {
  margin: 0;
  font-size: 13px;
  color: #b42318;
}

.prepare-for-meeting-page--provider-debrief .dpb-plan__email-result {
  display: grid;
  gap: 8px;
  padding: 12px;
  border: 1px solid color-mix(in srgb, var(--dpb-accent) 18%, #d8dee6);
  border-radius: 10px;
  background: color-mix(in srgb, var(--dpb-accent) 4%, #fff);
}

.prepare-for-meeting-page--provider-debrief .dpb-plan__email-result-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.prepare-for-meeting-page--provider-debrief .dpb-plan__email-result-title {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
}
`;
