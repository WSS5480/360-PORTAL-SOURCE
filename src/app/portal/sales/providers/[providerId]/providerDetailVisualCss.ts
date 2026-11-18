/**
 * Provider Detail visual cleanup — soft grouped panels, minimal dividers, dense briefing layout.
 * Loaded after command-center + profile CSS.
 */
export const providerDetailVisualCss = `
/* ── Page & overview rhythm ── */
.provider-profile-root .provider-profile-body {
  gap: 8px;
  padding: 8px 12px calc(14px + env(safe-area-inset-bottom, 0px));
  background: color-mix(in srgb, var(--foreground) 1.2%, #fff);
}

.provider-profile-root--command-center .provider-profile-body {
  padding-top: 12px;
  background: #f4f6f9;
}

.provider-profile-root .provider-cc {
  min-width: 0;
  width: 100%;
}

/* Command center layout shell */
.provider-profile-root .provider-cc-stage-banner {
  padding: 8px 12px 9px;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--brand-600) 14%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 5%, #fff);
}

.provider-profile-root .provider-cc-stage-kicker {
  margin: 0 0 2px;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--muted);
}

.provider-profile-root .provider-cc-stage-title {
  margin: 0;
  font-size: 14px;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--foreground);
}

.provider-profile-root .provider-cc-stage-hint {
  margin: 4px 0 0;
  font-size: 11px;
  line-height: 1.45;
  color: var(--muted);
}

.provider-profile-root .provider-cc-panel--obs-readiness {
  background: color-mix(in srgb, var(--brand-600) 3%, #fff);
  border-color: color-mix(in srgb, var(--brand-600) 10%, var(--border));
}

.provider-profile-root .provider-obs-readiness-overview {
  display: grid;
  gap: 8px;
}

.provider-profile-root .provider-obs-readiness-overview-lead {
  margin: 0;
  font-size: 11px;
  line-height: 1.45;
  color: var(--muted);
}

.provider-profile-root .provider-obs-readiness-overview-meter {
  margin: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 6px 10px;
  align-items: baseline;
  font-size: 11px;
}

.provider-profile-root .provider-obs-readiness-overview-meter-value {
  font-size: 18px;
  font-weight: 800;
  color: var(--foreground);
  letter-spacing: -0.02em;
}

.provider-profile-root .provider-obs-readiness-overview-meter-label {
  color: var(--muted);
  font-weight: 600;
}

.provider-profile-root .provider-obs-readiness-overview-gaps {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 6px;
}

.provider-profile-root .provider-obs-readiness-overview-gap-btn {
  width: 100%;
  text-align: left;
  padding: 7px 9px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
  background: var(--surface);
  font-size: 11px;
  font-weight: 600;
  line-height: 1.4;
  color: var(--foreground);
  cursor: pointer;
  font-family: inherit;
}

.provider-profile-root .provider-obs-readiness-overview-gap-btn:hover {
  border-color: color-mix(in srgb, var(--brand-600) 22%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 4%, #fff);
}

.provider-profile-root .provider-pipe-grid--single {
  grid-template-columns: minmax(0, 1fr);
}

.provider-profile-root .provider-intel-stage-scope {
  margin: 0 0 8px;
  padding: 7px 10px;
  border-radius: 8px;
  font-size: 11px;
  line-height: 1.45;
  color: var(--muted);
  background: color-mix(in srgb, var(--foreground) 3%, var(--surface));
  border: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
}

.provider-profile-root .provider-intel-stage-scope strong {
  color: var(--foreground);
  font-weight: 800;
}

.provider-profile-root .provider-cc-layout {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
}

.provider-profile-root .provider-cc-row {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

.provider-profile-root .provider-cc-panel {
  border-radius: 10px;
  padding: 10px 12px 11px;
  border: 1px solid color-mix(in srgb, var(--foreground) 5%, transparent);
  background: color-mix(in srgb, var(--foreground) 2.5%, #fff);
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
  min-width: 0;
}

.provider-profile-root .provider-cc-panel--intel {
  background: color-mix(in srgb, var(--brand-600) 4%, #fff);
  border-color: color-mix(in srgb, var(--brand-600) 12%, var(--border));
}

.provider-profile-root .provider-cc-panel--relationship {
  background: color-mix(in srgb, var(--foreground) 2%, var(--surface));
}

.provider-profile-root .provider-cc-panel--upcoming {
  background: color-mix(in srgb, var(--foreground) 2%, #fff);
}

.provider-profile-root .provider-cc-panel--engagements,
.provider-profile-root .provider-cc-panel--activity {
  background: color-mix(in srgb, var(--foreground) 2.5%, var(--surface));
}

.provider-profile-root .provider-cc-panel--work {
  background: color-mix(in srgb, var(--foreground) 2%, #fff);
}

.provider-profile-root .provider-cc-panel--details {
  padding: 6px 10px 8px;
}

/* Sections: one per panel, no stacked dividers */
.provider-profile-root .provider-cc-section {
  padding: 0;
  margin: 0;
  border: none;
}

/* Section headers */
.provider-profile-root .provider-cc-section-head {
  margin-bottom: 8px;
  align-items: center;
}

.provider-profile-root .provider-cc-section-title {
  font-size: 12px;
  font-weight: 800;
  letter-spacing: -0.01em;
  text-transform: none;
  color: var(--foreground);
}

.provider-profile-root .provider-cc-section-title .provider-intel-pill {
  margin-left: 6px;
  vertical-align: middle;
}

.provider-profile-root .provider-cc-section-link,
.provider-profile-root .provider-cc-text-btn {
  font-size: 11px;
  font-weight: 700;
  color: var(--muted);
  text-decoration: none;
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  font-family: inherit;
}

.provider-profile-root .provider-cc-section-link:hover,
.provider-profile-root .provider-cc-text-btn:hover {
  color: var(--foreground);
  text-decoration: underline;
  text-underline-offset: 2px;
}

.provider-profile-root .provider-cc-section-meta {
  margin: 0 0 5px;
  font-size: 10px;
  font-weight: 600;
  color: var(--muted);
}

/* ── Header chrome ── */
.provider-profile-root .provider-profile-sticky {
  box-shadow: 0 1px 0 color-mix(in srgb, var(--foreground) 4%, transparent);
  border-bottom: none;
  background: #fff;
}

.provider-profile-root .provider-profile-header {
  background: #fff;
  padding: 8px 12px 6px;
}

.provider-profile-root .provider-profile-header--mission .provider-hd {
  margin-top: 2px;
}

.provider-profile-root .provider-profile-header--mission .provider-hd-touch {
  margin: 6px 2px 0;
}

.provider-profile-root .provider-wmn {
  margin: 4px 0 6px;
  padding: 6px 8px;
  border: none;
  border-radius: 7px;
  background: color-mix(in srgb, var(--brand-600) 5%, var(--surface));
}

.provider-profile-root .provider-hd-badge--brand {
  border-color: color-mix(in srgb, var(--brand-600) 22%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 8%, #fff);
  color: var(--brand-700);
}

.provider-profile-root .provider-hd-badge--ok {
  border-color: color-mix(in srgb, #0d9488 22%, var(--border));
  background: color-mix(in srgb, #14b8a6 10%, #fff);
  color: #0f766e;
}

.provider-profile-root .provider-hd-badge--warn {
  border-color: color-mix(in srgb, #d97706 24%, var(--border));
  background: color-mix(in srgb, #d97706 8%, #fff);
  color: #92400e;
}

.provider-profile-root .provider-hd-badge--muted {
  border-color: color-mix(in srgb, var(--foreground) 10%, var(--border));
  background: color-mix(in srgb, var(--foreground) 4%, var(--surface));
  color: var(--muted);
}

.provider-profile-root .provider-hd-touch-link {
  color: var(--foreground);
  text-decoration: underline;
  text-underline-offset: 2px;
}

.provider-profile-root .provider-act-row--hierarchy {
  margin-top: 5px;
  gap: 5px;
}

.provider-profile-root .provider-act-btn {
  min-height: 30px;
  padding: 0 10px;
  font-size: 11px;
  border-radius: 6px;
}

.provider-profile-root .provider-act-btn--primary {
  background: var(--brand-600);
  border-color: var(--brand-600);
  color: #fff;
  font-weight: 800;
}

.provider-profile-root .provider-act-btn--overflow {
  color: var(--muted);
}

/* ── Intelligence briefing (command center) ── */
.provider-profile-root .provider-cc-section--intel .provider-cc-section-title {
  letter-spacing: -0.01em;
}

.provider-profile-root .provider-intel-briefing {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 2px 0 4px;
}

.provider-profile-root .provider-intel-briefing-head {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.provider-profile-root .provider-intel-lead {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.5;
  letter-spacing: -0.01em;
  color: color-mix(in srgb, var(--foreground) 92%, var(--muted));
}

.provider-profile-root .provider-intel-readiness {
  margin: 0;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 600;
  line-height: 1.3;
  color: var(--muted);
}

.provider-profile-root .provider-intel-readiness-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
  background: color-mix(in srgb, var(--muted) 40%, transparent);
}

.provider-profile-root .provider-intel-readiness--strong {
  color: color-mix(in srgb, #15803d 75%, var(--foreground));
}

.provider-profile-root .provider-intel-readiness--strong .provider-intel-readiness-dot {
  background: #16a34a;
}

.provider-profile-root .provider-intel-readiness--building {
  color: color-mix(in srgb, #b45309 80%, var(--foreground));
}

.provider-profile-root .provider-intel-readiness--building .provider-intel-readiness-dot {
  background: #d97706;
}

.provider-profile-root .provider-intel-readiness--limited .provider-intel-readiness-dot {
  background: color-mix(in srgb, var(--muted) 55%, transparent);
}

.provider-profile-root .provider-intel-focus {
  margin: 0;
  font-size: 11px;
  font-weight: 500;
  line-height: 1.45;
  color: color-mix(in srgb, var(--foreground) 68%, var(--muted));
}

.provider-profile-root .provider-intel-signals {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.provider-profile-root .provider-intel-signal {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  min-width: 0;
}

.provider-profile-root .provider-intel-signal-dot {
  width: 8px;
  height: 8px;
  margin-top: 4px;
  border-radius: 50%;
  flex-shrink: 0;
  background: color-mix(in srgb, var(--muted) 35%, transparent);
}

.provider-profile-root .provider-intel-signal-dot--strong {
  background: #16a34a;
}

.provider-profile-root .provider-intel-signal-dot--building {
  background: #d97706;
}

.provider-profile-root .provider-intel-signal-body {
  min-width: 0;
  flex: 1;
}

.provider-profile-root .provider-intel-signal-title {
  margin: 0 0 2px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  color: var(--muted);
}

.provider-profile-root .provider-intel-signal-detail {
  margin: 0;
  font-size: 11px;
  font-weight: 500;
  line-height: 1.4;
  color: color-mix(in srgb, var(--foreground) 80%, var(--muted));
}

.provider-profile-root .provider-intel-next {
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 10px 0 0;
  border-top: none;
  background: none;
  position: relative;
}

.provider-profile-root .provider-intel-next::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(
    90deg,
    color-mix(in srgb, var(--foreground) 8%, transparent),
    color-mix(in srgb, var(--foreground) 2%, transparent) 70%,
    transparent
  );
}

.provider-profile-root .provider-intel-next-kicker {
  margin: 0;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: var(--muted);
}

.provider-profile-root .provider-intel-next-text {
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.45;
  color: var(--foreground);
}

.provider-profile-root .provider-intel-next-btn {
  align-self: flex-start;
  margin: 2px 0 0;
  padding: 0;
  border: none;
  background: none;
  font: inherit;
  font-size: 11px;
  font-weight: 700;
  color: var(--brand-600, #2563eb);
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.provider-profile-root .provider-intel-next-btn:hover {
  color: color-mix(in srgb, var(--brand-600, #2563eb) 85%, var(--foreground));
}

.provider-profile-root .provider-intel-pill--building {
  color: #92400e;
  background: color-mix(in srgb, #d97706 8%, #fff);
  border-color: color-mix(in srgb, #d97706 20%, var(--border));
}

/* ── Relationship (inset rows, no table borders) ── */
.provider-profile-root .provider-rel-panel {
  padding: 0;
  border: none;
  background: transparent;
}

.provider-profile-root .provider-rel-hero {
  display: none;
}

.provider-profile-root .provider-rel-coverage {
  margin: 0 0 6px;
  font-size: 10px;
  font-weight: 600;
  color: var(--muted);
}

.provider-profile-root .provider-rel-signals-block {
  margin: 0 0 10px;
}

.provider-profile-root .provider-rel-signals-label {
  margin: 0 0 5px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: var(--muted);
}

.provider-profile-root .provider-rel-signals {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.provider-profile-root .provider-rel-signal {
  padding: 4px 8px 4px 7px;
  border-radius: 5px;
  border-left: 2px solid color-mix(in srgb, var(--foreground) 14%, transparent);
  background: color-mix(in srgb, var(--foreground) 2.5%, #fff);
  font-size: 11px;
  font-weight: 500;
  line-height: 1.35;
  color: color-mix(in srgb, var(--foreground) 78%, var(--muted));
}

.provider-profile-root .provider-rel-memory-block {
  margin: 0 0 10px;
  padding-top: 2px;
}

.provider-profile-root .provider-rel-memory-label {
  margin: 0 0 5px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: var(--muted);
}

.provider-profile-root .provider-rel-memory-empty {
  margin: 0;
  font-size: 10px;
  line-height: 1.4;
  color: color-mix(in srgb, var(--muted) 88%, var(--foreground));
}

.provider-profile-root .provider-rel-memory {
  display: flex;
  flex-direction: column;
  gap: 5px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.provider-profile-root .provider-rel-memory-item {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  padding: 5px 8px 5px 7px;
  border-radius: 5px;
  border-left: 2px solid color-mix(in srgb, var(--accent, #2563eb) 35%, transparent);
  background: color-mix(in srgb, var(--foreground) 1.5%, #fff);
}

.provider-profile-root .provider-rel-memory-text {
  flex: 1;
  min-width: 0;
  font-size: 11px;
  font-weight: 500;
  line-height: 1.35;
  color: color-mix(in srgb, var(--foreground) 82%, var(--muted));
}

.provider-profile-root .provider-rel-memory-age {
  flex-shrink: 0;
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: var(--muted);
  white-space: nowrap;
  padding-top: 1px;
}

.provider-profile-root .provider-rel-rows {
  display: flex;
  flex-direction: column;
  gap: 4px;
  border: none;
}

.provider-profile-root .provider-rel-row {
  padding: 5px 8px;
  border-radius: 6px;
  border: none;
  background: color-mix(in srgb, var(--foreground) 2%, #fff);
}

.provider-profile-root .provider-rel-row--empty {
  background: color-mix(in srgb, var(--foreground) 1.5%, var(--surface));
}

.provider-profile-root .provider-rel-row-label {
  font-size: 10px;
  font-weight: 700;
  margin-bottom: 2px;
  color: var(--muted);
}

.provider-profile-root .provider-rel-row-value {
  font-size: 12px;
  font-weight: 600;
}

.provider-profile-root .provider-rel-row-value--hint {
  font-size: 11px;
  font-weight: 500;
  font-style: italic;
  color: var(--muted);
  line-height: 1.35;
}

.provider-profile-root .provider-rel-cta--compact {
  margin-top: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 28px;
  padding: 0 10px;
  border-radius: 6px;
  border: 1px solid color-mix(in srgb, var(--foreground) 12%, var(--border));
  background: #fff;
  font-size: 11px;
  font-weight: 700;
  color: var(--foreground);
  text-decoration: none;
  cursor: pointer;
  font-family: inherit;
  width: fit-content;
  max-width: 100%;
}

.provider-profile-root .provider-rel-cta--compact:hover {
  background: color-mix(in srgb, var(--foreground) 3%, #fff);
}

/* ── Upcoming engagement preview ── */
.provider-profile-root .provider-upcoming-eng-card {
  padding: 8px 10px;
  border-radius: 7px;
  background: color-mix(in srgb, var(--brand-600) 5%, #fff);
  border: 1px solid color-mix(in srgb, var(--brand-600) 14%, var(--border));
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.provider-profile-root .provider-upcoming-eng-type-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
}

.provider-profile-root .provider-upcoming-eng-type {
  font-size: 13px;
  font-weight: 900;
  letter-spacing: -0.02em;
  color: var(--foreground);
}

.provider-profile-root .provider-upcoming-eng-title {
  margin: 2px 0 0;
  font-size: 11px;
  font-weight: 600;
  color: var(--muted);
  line-height: 1.35;
}

.provider-profile-root .provider-upcoming-eng-status {
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  padding: 2px 7px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));
  background: #fff;
  color: var(--muted);
}

.provider-profile-root .provider-upcoming-eng-status--planned {
  color: var(--brand-700);
  border-color: color-mix(in srgb, var(--brand-600) 22%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 8%, #fff);
}

.provider-profile-root .provider-upcoming-eng-status--active {
  color: #0f766e;
  border-color: color-mix(in srgb, #0d9488 22%, var(--border));
  background: color-mix(in srgb, #14b8a6 10%, #fff);
}

.provider-profile-root .provider-upcoming-eng-facts {
  margin: 6px 0 0;
  display: grid;
  gap: 4px;
}

.provider-profile-root .provider-upcoming-eng-fact {
  display: grid;
  grid-template-columns: 72px 1fr;
  gap: 6px;
  align-items: baseline;
  font-size: 11px;
  line-height: 1.35;
}

.provider-profile-root .provider-upcoming-eng-fact dt {
  margin: 0;
  font-weight: 700;
  color: var(--muted);
}

.provider-profile-root .provider-upcoming-eng-fact dd {
  margin: 0;
  font-weight: 600;
  color: var(--foreground);
}

.provider-profile-root .provider-upcoming-eng-prep--ready {
  color: #0f766e;
}

.provider-profile-root .provider-upcoming-eng-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.provider-profile-root .provider-upcoming-eng-cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 30px;
  padding: 0 12px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 800;
  font-family: inherit;
  text-decoration: none;
  white-space: nowrap;
  border: 1px solid color-mix(in srgb, var(--foreground) 12%, var(--border));
  background: #fff;
  color: var(--foreground);
}

.provider-profile-root .provider-upcoming-eng-cta--primary {
  background: var(--brand-600);
  color: #fff;
  border-color: var(--brand-600);
}

.provider-profile-root .provider-upcoming-eng-cta--secondary {
  color: var(--brand-700);
  border-color: color-mix(in srgb, var(--brand-600) 22%, var(--border));
  background: #fff;
}

.provider-profile-root .provider-upcoming-eng-empty {
  padding: 6px 0 2px;
}

.provider-profile-root .provider-upcoming-eng-empty-text {
  margin: 0 0 8px;
  font-size: 11px;
  font-weight: 500;
  line-height: 1.45;
  color: var(--muted);
}

.provider-profile-root .provider-upcoming-eng-inline-link {
  font-weight: 700;
  color: var(--foreground);
  text-decoration: underline;
  text-underline-offset: 2px;
}

/* ── Work pipeline: column sub-panels on desktop ── */
.provider-profile-root .provider-pipe-grid {
  gap: 8px;
}

.provider-profile-root .provider-pipe-col {
  padding: 6px 8px;
  border-radius: 6px;
  background: color-mix(in srgb, var(--foreground) 2%, #fff);
  min-width: 0;
}

.provider-profile-root .provider-pipe-col-title {
  font-size: 11px;
  font-weight: 800;
  color: var(--muted);
  margin: 0 0 5px;
}

/* List rows: gap-separated chips, not ruled lines */
.provider-profile-root .provider-eng-prev-list,
.provider-profile-root .provider-case-prev-list,
.provider-profile-root .provider-opp-prev-list {
  gap: 5px;
  border: none;
}

.provider-profile-root .provider-eng-prev-card,
.provider-profile-root .provider-case-prev-card,
.provider-profile-root .provider-opp-prev-card {
  border: none;
  border-radius: 6px;
  background: color-mix(in srgb, var(--foreground) 2.5%, #fff);
  overflow: hidden;
}

.provider-profile-root .provider-eng-prev-card-main,
.provider-profile-root .provider-case-prev-main,
.provider-profile-root .provider-opp-prev-main {
  padding: 7px 8px;
}

.provider-profile-root .provider-eng-prev-links,
.provider-profile-root .provider-case-prev-links {
  padding: 4px 8px 6px;
  border: none;
  background: color-mix(in srgb, var(--foreground) 1.5%, var(--surface));
}

.provider-profile-root .provider-eng-prev-type {
  color: var(--foreground);
  font-weight: 800;
}

.provider-profile-root .provider-eng-prev-status--planned {
  color: var(--muted);
  border-color: color-mix(in srgb, var(--foreground) 10%, var(--border));
  background: #fff;
}

.provider-profile-root .provider-eng-prev-link,
.provider-profile-root .provider-case-prev-link,
.provider-profile-root .provider-opp-prev-product,
.provider-profile-root .provider-pipe-more,
.provider-profile-root .provider-eng-prev-more {
  color: var(--foreground);
  font-weight: 700;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.provider-profile-root .provider-case-prev-type--obs {
  color: var(--foreground);
  border-color: color-mix(in srgb, var(--foreground) 10%, var(--border));
  background: #fff;
}

.provider-profile-root .provider-opp-prev-next-label {
  font-weight: 600;
  color: var(--muted);
}

/* Empty states: inline in panel, no dashed boxes */
.provider-profile-root .provider-cc-empty,
.provider-profile-root .provider-eng-prev-empty,
.provider-profile-root .provider-pipe-empty,
.provider-profile-root .provider-act-prev-empty {
  padding: 4px 0;
  border: none;
  background: transparent;
  text-align: left;
}

.provider-profile-root .provider-eng-prev-empty-text,
.provider-profile-root .provider-pipe-empty-text,
.provider-profile-root .provider-act-prev-empty-text {
  margin: 0 0 6px;
  font-size: 11px;
  font-weight: 500;
  color: var(--muted);
  line-height: 1.45;
}

.provider-profile-root .provider-eng-prev-empty-link {
  color: var(--foreground);
  font-weight: 700;
  text-decoration: underline;
}

.provider-profile-root .provider-eng-prev-empty-cta,
.provider-profile-root .provider-pipe-empty-cta {
  min-height: 28px;
  padding: 0 10px;
  font-size: 11px;
  font-weight: 700;
  border-radius: 6px;
}

.provider-profile-root .provider-pipe-empty-cta--secondary {
  color: var(--foreground);
  background: #fff;
  border-color: color-mix(in srgb, var(--foreground) 12%, var(--border));
}

/* ── Activity: simple dense list (no heavy timeline rail) ── */
.provider-profile-root .provider-act-prev-list {
  margin: 0;
  padding: 0;
  border: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.provider-profile-root .provider-act-prev-item {
  padding: 0;
}

.provider-profile-root .provider-act-prev-item::before {
  display: none;
}

.provider-profile-root .provider-act-prev-link {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 7px 8px;
  border-radius: 6px;
  background: color-mix(in srgb, var(--foreground) 2%, #fff);
  text-decoration: none;
  color: inherit;
}

.provider-profile-root .provider-act-prev-link:active {
  opacity: 0.9;
}

.provider-profile-root .provider-act-prev-row-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.provider-profile-root .provider-act-prev-kind {
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  padding: 2px 6px;
  border-radius: 4px;
  border: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));
  background: #fff;
  color: var(--muted);
  flex-shrink: 0;
}

.provider-profile-root .provider-act-prev-time {
  font-size: 10px;
  font-weight: 600;
  color: var(--muted);
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
}

.provider-profile-root .provider-act-prev-title {
  font-size: 12px;
  font-weight: 800;
  line-height: 1.3;
  color: var(--foreground);
}

.provider-profile-root .provider-act-prev-summary {
  font-size: 11px;
  font-weight: 600;
  line-height: 1.4;
  color: var(--foreground);
}

.provider-profile-root .provider-act-prev-related {
  font-size: 10px;
  font-weight: 600;
  color: var(--muted);
}

.provider-profile-root .provider-act-prev-next {
  display: block;
  margin-top: 2px;
  font-size: 10px;
  font-weight: 600;
  color: color-mix(in srgb, var(--brand-600) 72%, var(--muted));
}

.provider-profile-root .provider-act-prev-kind--engagement {
  color: var(--brand-700);
  border-color: color-mix(in srgb, var(--brand-600) 22%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 6%, #fff);
}

.provider-profile-root .provider-act-prev-kind--product {
  color: #5b21b6;
  border-color: color-mix(in srgb, #7c3aed 18%, var(--border));
  background: color-mix(in srgb, #7c3aed 6%, #fff);
}

.provider-profile-root .provider-act-prev-empty-link {
  color: var(--foreground);
  font-weight: 700;
}

/* ── CRM details (collapsed, low chrome) ── */
.provider-profile-root .provider-cc-details {
  margin-top: 2px;
  padding: 6px 10px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--foreground) 4%, transparent);
  background: color-mix(in srgb, var(--foreground) 2%, var(--surface));
}

.provider-profile-root .provider-cc-details summary {
  padding: 2px 0 6px;
  font-size: 11px;
  font-weight: 700;
  color: var(--muted);
}

.provider-profile-root .provider-cc-details-body {
  padding: 0 0 4px;
  font-size: 11px;
}

.provider-profile-root .provider-cc-details-crm select {
  min-height: 28px;
  font-size: 11px;
  border-radius: 6px;
  border-color: color-mix(in srgb, var(--foreground) 10%, var(--border));
}

/* ── Tabs & other tabs ── */
.provider-profile-root .provider-profile-tab {
  color: var(--muted);
}

.provider-profile-root .provider-profile-tab--active {
  color: var(--brand-800, var(--brand-700));
  font-weight: 900;
  background: color-mix(in srgb, var(--brand-600) 8%, #fff);
  border-color: color-mix(in srgb, var(--brand-600) 20%, var(--border));
}

.provider-profile-root .provider-profile-section-title {
  font-size: 12px;
  font-weight: 800;
  letter-spacing: -0.01em;
  text-transform: none;
  color: var(--foreground);
  margin-bottom: 6px;
}

.provider-profile-root .provider-compact-list {
  border: none;
  border-radius: 8px;
  background: color-mix(in srgb, var(--foreground) 2.5%, #fff);
  overflow: hidden;
}

.provider-profile-root .provider-compact-list li {
  padding: 8px 10px;
  border-bottom: none;
}

.provider-profile-root .provider-compact-list li + li {
  border-top: 1px solid color-mix(in srgb, var(--foreground) 3%, transparent);
}

.provider-profile-root .provider-profile-action {
  min-height: 30px;
  width: auto;
  padding: 0 12px;
  font-size: 11px;
  font-weight: 700;
  color: var(--foreground);
  background: #fff;
  border-color: color-mix(in srgb, var(--foreground) 12%, var(--border));
}

.provider-profile-root .provider-profile-action--primary {
  background: var(--brand-600);
  color: #fff;
  border-color: var(--brand-600);
}

@media (min-width: 640px) {
  .provider-profile-root .provider-pipe-grid {
    gap: 10px;
  }
}

/* ── Desktop command center (grouped rows, balanced 2-col rhythm) ── */
@media (min-width: 900px) {
  .provider-profile-root--command-center .provider-profile-body {
    display: flex;
    justify-content: center;
    padding: 8px 12px calc(14px + env(safe-area-inset-bottom, 0px));
    background: color-mix(in srgb, var(--foreground) 1.5%, var(--surface));
  }

  .provider-profile-root--command-center .provider-cc {
    width: 100%;
    max-width: 1280px;
    margin-inline: auto;
  }

  .provider-profile-root--command-center .provider-cc--dashboard {
    max-width: 100%;
    margin-inline: auto;
    padding: 0 20px;
    box-sizing: border-box;
  }

  .provider-profile-root--command-center .provider-cc-layout {
    gap: 18px;
  }

  .provider-profile-root--command-center .provider-cc-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: 12px 16px;
    min-width: 0;
  }

  .provider-profile-root--command-center .provider-cc-row--briefing {
    align-items: start;
  }

  .provider-profile-root--command-center .provider-cc-row--briefing:has(.provider-cc-panel--obs-readiness) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  @media (max-width: 900px) {
    .provider-profile-root--command-center .provider-cc-row--briefing:has(.provider-cc-panel--obs-readiness) {
      grid-template-columns: minmax(0, 1fr);
    }
  }

  .provider-profile-root--command-center .provider-cc-row--pipeline {
    align-items: stretch;
  }

  .provider-profile-root--command-center .provider-cc-row--feed {
    align-items: stretch;
  }

  .provider-profile-root--command-center .provider-cc-panel {
    padding: 12px 14px 13px;
  }

  .provider-profile-root--command-center .provider-cc-panel--intel {
    padding-top: 11px;
  }

  .provider-profile-root--command-center .provider-cc-panel--engagements,
  .provider-profile-root--command-center .provider-cc-panel--activity {
    display: flex;
    flex-direction: column;
    min-height: 220px;
    max-height: min(300px, 42vh);
  }

  .provider-profile-root--command-center .provider-cc-panel--engagements .provider-cc-section,
  .provider-profile-root--command-center .provider-cc-panel--activity .provider-cc-section {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
  }

  .provider-profile-root--command-center .provider-eng-prev-list,
  .provider-profile-root--command-center .provider-act-prev-list {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
    padding-right: 2px;
  }

  .provider-profile-root--command-center .provider-cc-panel--work .provider-pipe-grid {
    grid-template-columns: 1fr;
    gap: 10px;
  }

  .provider-profile-root--command-center .provider-cc-panel--details {
    margin-top: 2px;
    padding: 8px 14px 10px;
  }

  .provider-profile-root--command-center .provider-cc-details-facts {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px 16px;
  }

  .provider-profile-root--command-center .provider-cc-details-orgs {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px 12px;
    margin-top: 10px !important;
  }

  .provider-profile-root--command-center .provider-intel-briefing {
    gap: 12px;
  }
}

@media (min-width: 1100px) {
  .provider-profile-root--command-center .provider-cc {
    max-width: 1120px;
  }

  .provider-profile-root--command-center .provider-cc-row {
    gap: 14px 18px;
  }

  .provider-profile-root--command-center .provider-cc-panel--work .provider-pipe-grid {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: 12px;
  }
}

@media (min-width: 1200px) {
  .provider-profile-root--command-center .provider-cc {
    max-width: 1160px;
  }

  .provider-profile-root--command-center .provider-cc-layout {
    gap: 20px;
  }
}
`;
