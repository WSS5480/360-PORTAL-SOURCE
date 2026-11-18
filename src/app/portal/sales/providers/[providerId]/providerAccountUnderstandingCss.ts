/** Provider Intelligence tab — rep-readable account notes */
export const providerAccountUnderstandingCss = `
.pau {
  display: flex;
  flex-direction: column;
  gap: 20px;
  min-width: 0;
}

.pau-lead {
  margin: 0;
  font-size: 15px;
  font-weight: 500;
  line-height: 1.4;
  color: color-mix(in srgb, var(--foreground) 58%, transparent);
  letter-spacing: -0.01em;
}

/* —— Confirmed (anchor before open questions) —— */
.pau-anchor {
  padding: 14px 16px 12px;
  border-radius: 12px;
  border: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));
  background: color-mix(in srgb, var(--foreground) 2%, #fff);
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
}

.pau-anchor-title {
  margin: 0 0 10px;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--foreground) 52%, transparent);
}

.pau-anchor-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.pau-anchor-item {
  display: flex;
  align-items: baseline;
  gap: 8px;
  font-size: 15px;
  font-weight: 600;
  line-height: 1.35;
  color: var(--foreground);
  letter-spacing: -0.02em;
}

.pau-anchor-check {
  flex-shrink: 0;
  font-size: 14px;
  font-weight: 800;
  line-height: 1;
  color: color-mix(in srgb, var(--foreground) 45%, transparent);
}

.pau-anchor-line {
  min-width: 0;
}

.pau-empty {
  margin: 0;
  font-size: 14px;
  color: var(--muted);
}

.pau-band {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.pau-band-kicker {
  margin: 0 0 2px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--foreground) 40%, transparent);
}

.pau-band-heading {
  margin: 0 0 10px;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--foreground) 52%, transparent);
}

/* —— Account operational picture (synthesis strip) —— */
.pau-synthesis {
  padding: 14px 16px;
  border-radius: 12px;
  border: 1px solid color-mix(in srgb, var(--brand-600) 16%, var(--border));
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--brand-600) 5%, #fff),
    color-mix(in srgb, var(--foreground) 2%, #fff)
  );
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
}

.pau-synthesis-title {
  margin: 0 0 10px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--foreground) 50%, transparent);
}

.pau-synthesis-grid {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.pau-synthesis-row {
  margin: 0;
  display: grid;
  grid-template-columns: minmax(108px, 34%) 1fr;
  gap: 8px 12px;
  align-items: baseline;
}

.pau-synthesis-row dt {
  margin: 0;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--foreground) 48%, transparent);
}

.pau-synthesis-row dd {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.4;
  color: var(--foreground);
}

.pau-synthesis-row--blockers dd,
.pau-synthesis-row--missing dd {
  color: color-mix(in srgb, var(--warn-800, #92400e) 85%, var(--foreground));
}

.pau-synthesis-row--tactical dd {
  color: var(--brand-800, #1e40af);
}

/* —— Operational intelligence cards —— */
.pau-intel-stack,
.pau-confirm-stack {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

@media (max-width: 420px) {
  .pau-intel-stack {
    gap: 8px;
  }
}

.pau-intel-card {
  padding: 14px 16px 12px;
  border-radius: 12px;
  border: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));
  background: #fff;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
}

.pau-intel-card--unverified,
.pau-intel-card--high_risk {
  border-color: color-mix(in srgb, #dc2626 22%, transparent);
}

.pau-intel-card--not_explored {
  border-color: color-mix(in srgb, var(--foreground) 14%, transparent);
  background: color-mix(in srgb, var(--foreground) 2%, #fff);
}

.pau-intel-card--partial {
  border-color: color-mix(in srgb, #ca8a04 24%, transparent);
}

.pau-intel-card--confirmed {
  border-color: color-mix(in srgb, var(--ok-600, #059669) 18%, transparent);
}

.pau-intel-card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 12px;
}

.pau-intel-card-titles {
  min-width: 0;
}

.pau-intel-card-title {
  margin: 0;
  font-size: 17px;
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1.25;
}

.pau-intel-card-hint {
  margin: 4px 0 0;
  font-size: 12px;
  line-height: 1.35;
  color: color-mix(in srgb, var(--foreground) 52%, transparent);
}

.pau-intel-confidence {
  flex-shrink: 0;
  padding: 3px 8px;
  border-radius: 6px;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  background: color-mix(in srgb, var(--foreground) 8%, transparent);
  color: color-mix(in srgb, var(--foreground) 65%, transparent);
}

.pau-intel-confidence--confirmed,
.pau-intel-card--confirmed .pau-intel-confidence {
  background: color-mix(in srgb, var(--ok-600, #059669) 14%, transparent);
  color: var(--ok-800, #065f46);
}

.pau-intel-confidence--partial,
.pau-intel-card--partial .pau-intel-confidence {
  background: color-mix(in srgb, #ca8a04 16%, transparent);
  color: #854d0e;
}

.pau-intel-confidence--unmapped,
.pau-intel-card--unmapped .pau-intel-confidence,
.pau-intel-confidence--unverified,
.pau-intel-confidence--high_risk,
.pau-intel-card--high_risk .pau-intel-confidence {
  background: color-mix(in srgb, #dc2626 14%, transparent);
  color: #991b1b;
}

.pau-intel-confidence--not_started,
.pau-intel-confidence--not_explored,
.pau-intel-card--not_started .pau-intel-confidence,
.pau-intel-card--not_explored .pau-intel-confidence {
  background: color-mix(in srgb, var(--foreground) 10%, transparent);
  color: color-mix(in srgb, var(--foreground) 58%, transparent);
}

.pau-intel-card--unmapped {
  border-color: color-mix(in srgb, #dc2626 22%, transparent);
}

.pau-intel-card--not_started {
  border-color: color-mix(in srgb, var(--foreground) 14%, transparent);
  background: color-mix(in srgb, var(--foreground) 2%, #fff);
}

.pau-intel-scan-metrics {
  margin: 0 0 12px;
  font-size: 13px;
  font-weight: 700;
  line-height: 1.35;
  color: color-mix(in srgb, var(--foreground) 72%, transparent);
}

.pau-intel-scan-stack {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 12px;
}

.pau-intel-scan-block {
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--foreground) 8%, transparent);
  background: color-mix(in srgb, var(--foreground) 2%, #fff);
}

.pau-intel-scan-block--next {
  border-color: color-mix(in srgb, var(--brand-600) 18%, transparent);
  background: color-mix(in srgb, var(--brand-600) 5%, #fff);
}

.pau-intel-scan-kicker {
  margin: 0 0 4px;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--foreground) 48%, transparent);
}

.pau-intel-scan-body {
  margin: 0;
  font-size: 14px;
  line-height: 1.45;
  color: color-mix(in srgb, var(--foreground) 88%, transparent);
}

.pau-intel-scan-body--action {
  font-weight: 700;
}

.pau-mission-readiness {
  margin: 0 0 20px;
  padding: 14px 16px;
  border-radius: 12px;
  border: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 4%, #fff);
}

.pau-mission-readiness-head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px 12px;
  margin-bottom: 10px;
}

.pau-mission-readiness-tiers {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.pau-mission-readiness-tier {
  font-size: 11px;
  font-weight: 800;
  padding: 4px 8px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: #fff;
}

.pau-mission-readiness-tier--low {
  color: #b45309;
  border-color: color-mix(in srgb, #b45309 35%, var(--border));
}

.pau-mission-readiness-tier--building {
  color: var(--brand-700, #1d4ed8);
}

.pau-mission-readiness-tier--high {
  color: #15803d;
  border-color: color-mix(in srgb, #15803d 35%, var(--border));
}

.pau-mission-readiness-recs {
  margin: 0;
  padding: 0 0 0 16px;
  display: grid;
  gap: 4px;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.35;
  color: color-mix(in srgb, var(--foreground) 78%, transparent);
}

.pau-mission-readiness-title {
  margin: 0;
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}

.pau-mission-readiness-score {
  font-size: 22px;
  font-weight: 800;
  letter-spacing: -0.03em;
}

.pau-mission-readiness-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 8px;
}

.pau-mission-readiness-pill {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--foreground) 8%, transparent);
  background: #fff;
  font-size: 11px;
}

.pau-mission-readiness-pill-label {
  font-weight: 700;
  line-height: 1.2;
}

.pau-mission-readiness-pill-status {
  font-size: 9px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.pau-mission-readiness-pill--confirmed .pau-mission-readiness-pill-status {
  color: var(--ok-800, #065f46);
}

.pau-mission-readiness-pill--partial .pau-mission-readiness-pill-status {
  color: #854d0e;
}

.pau-mission-readiness-pill--high_risk .pau-mission-readiness-pill-status {
  color: #991b1b;
}

.pau-mission-readiness-pill--not_explored .pau-mission-readiness-pill-status {
  color: color-mix(in srgb, var(--foreground) 50%, transparent);
}

.pau-mission-readiness-score--up {
  color: var(--brand-700, #1d4ed8);
}

.pau-mission-readiness-delta {
  margin-left: 6px;
  font-size: 13px;
  font-weight: 800;
  color: var(--success, #16a34a);
  vertical-align: middle;
}

.pau-mission-readiness-why {
  margin: 0 0 10px;
  padding: 8px 10px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--success, #22c55e) 6%, #fff);
  border: 1px solid color-mix(in srgb, var(--success, #22c55e) 22%, var(--border));
}

.pau-mission-readiness-why-kicker {
  display: block;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--foreground) 55%, transparent);
  margin-bottom: 4px;
}

.pau-mission-readiness-why-list {
  margin: 0;
  padding: 0 0 0 16px;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.4;
  color: color-mix(in srgb, var(--foreground) 78%, transparent);
}

.pau-discovery-live {
  display: grid;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px dashed color-mix(in srgb, var(--foreground) 14%, var(--border));
  background: color-mix(in srgb, var(--foreground) 2%, var(--surface));
  transition: border-color 0.2s ease, background 0.2s ease;
}

.pau-discovery-live--active {
  border-style: solid;
  border-color: color-mix(in srgb, var(--brand-600, #2563eb) 35%, var(--border));
  background: color-mix(in srgb, var(--brand-600, #2563eb) 5%, var(--surface));
}

.pau-discovery-live-kicker {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--brand-600, #2563eb);
}

.pau-discovery-live-save {
  display: grid;
  gap: 4px;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, #0d9488 28%, var(--border));
  background: color-mix(in srgb, #0d9488 6%, var(--surface));
}

.pau-discovery-live-save-heading {
  margin: 0;
  font-size: 12px;
  font-weight: 800;
}

.pau-discovery-live-save-list {
  margin: 0;
  padding: 0 0 0 14px;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.35;
}

.pau-discovery-live-latest {
  display: grid;
  gap: 4px;
}

.pau-discovery-live-impact {
  margin: 0;
  font-size: 13px;
  font-weight: 800;
  color: var(--success, #15803d);
}

.pau-discovery-live-summary {
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.35;
  color: color-mix(in srgb, var(--foreground) 80%, var(--muted));
}

.pau-discovery-live-counts {
  margin: 0;
  font-size: 11px;
  font-weight: 700;
  color: color-mix(in srgb, var(--foreground) 65%, var(--muted));
}

.pau-discovery-live-readiness-list,
.pau-discovery-live-feed {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 4px;
}

.pau-discovery-live-feed-item {
  font-size: 12px;
  font-weight: 700;
  color: color-mix(in srgb, var(--foreground) 75%, transparent);
}

.pau-intel-mission-line {
  margin: 0 0 10px;
  font-size: 12px;
  line-height: 1.35;
  color: color-mix(in srgb, var(--foreground) 58%, transparent);
}

.pau-intel-grid {
  margin: 0 0 12px;
  display: flex;
  flex-direction: column;
  gap: 9px;
}

.pau-intel-row {
  margin: 0;
  padding: 8px 10px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--foreground) 2%, #fff);
  border: 1px solid color-mix(in srgb, var(--foreground) 6%, transparent);
}

.pau-intel-row--risk {
  border-color: color-mix(in srgb, var(--warn-600, #d97706) 18%, transparent);
  background: color-mix(in srgb, var(--warn-600, #d97706) 4%, #fff);
}

.pau-intel-row--tactical {
  border-color: color-mix(in srgb, var(--brand-600) 14%, transparent);
  background: color-mix(in srgb, var(--brand-600) 4%, #fff);
}

.pau-intel-row--action dd {
  font-weight: 700;
}

.pau-intel-row dt {
  margin: 0 0 3px;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--foreground) 45%, transparent);
}

.pau-intel-row dd {
  margin: 0;
  font-size: 13px;
  line-height: 1.42;
  color: color-mix(in srgb, var(--foreground) 84%, transparent);
}

.pau-intel-row--source dd {
  font-size: 11px;
  font-weight: 600;
  color: color-mix(in srgb, var(--foreground) 58%, transparent);
}

.pau-confirm-card,
.pau-confirm-card-title,
.pau-confirm-facts,
.pau-confirm-fact,
.pau-confirm-fact dt,
.pau-confirm-fact dd {
  /* legacy aliases — prefer pau-intel-* */
}

.pau-band-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.pau-band-grid--thin {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 10px;
}

.pau-band-stack {
  display: flex;
  flex-direction: column;
  gap: 0;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
  background: color-mix(in srgb, var(--foreground) 1.5%, #fff);
  overflow: hidden;
}

/* —— Uncertainty cards: one unknown per card —— */
.pau-uncertainty-stack {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.pau-uncertainty-card {
  padding: 14px 16px 12px;
  border-radius: 12px;
  border: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));
  background: #fff;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.05);
}

.pau-uncertainty-card--expanded {
  padding-bottom: 0;
}

.pau-uncertainty-card-head {
  margin: 0 0 8px;
}

.pau-uncertainty-section-title {
  margin: 0;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--foreground) 52%, transparent);
}

.pau-uncertainty-summary {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin: 0 0 10px;
}

.pau-uncertainty-summary-line {
  margin: 0;
  font-size: 15px;
  font-weight: 500;
  line-height: 1.38;
  color: var(--foreground);
  letter-spacing: -0.02em;
}

.pau-uncertainty-summary-line:first-child {
  font-size: 15px;
  font-weight: 600;
}

.pau-uncertainty-disclosure-toggle {
  display: inline-flex;
  align-items: center;
  margin: 0 0 2px;
  padding: 6px 0;
  border: none;
  background: none;
  font-family: inherit;
  font-size: 13px;
  font-weight: 700;
  line-height: 1.3;
  color: var(--brand-700);
  cursor: pointer;
  letter-spacing: -0.01em;
  -webkit-tap-highlight-color: transparent;
}

.pau-uncertainty-disclosure-toggle:hover {
  text-decoration: underline;
}

@media (max-width: 640px) {
  .pau-uncertainty-disclosure-toggle {
    min-height: 44px;
    padding: 10px 0;
  }

  .pau-uncertainty-card {
    padding: 12px 14px 10px;
  }

  .pau-uncertainty-summary-line {
    font-size: 14px;
  }
}

.pau-uncertainty-detail {
  margin: 8px -16px 0;
  padding-top: 4px;
  border-top: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
}

.pau-uncertainty-detail .pau-uncertainty-facts {
  margin: 12px 16px 0;
}

.pau-uncertainty-note-text {
  display: block;
}

.pau-uncertainty-note-meta {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  font-weight: 500;
  color: color-mix(in srgb, var(--foreground) 48%, transparent);
}

.pau-uncertainty-note-empty {
  font-style: italic;
  color: var(--muted);
}

.pau-uncertainty-facts {
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.pau-uncertainty-fact {
  margin: 0;
}

.pau-uncertainty-fact dt {
  margin: 0 0 3px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--foreground) 42%, transparent);
}

.pau-uncertainty-fact dd {
  margin: 0;
  font-size: 15px;
  font-weight: 500;
  line-height: 1.4;
  color: var(--foreground);
  letter-spacing: -0.02em;
}

.pau-uncertainty-fact--primary dd {
  font-size: 16px;
  font-weight: 600;
  line-height: 1.35;
}

/* Capture row — continues the gap card into a lightweight field workflow step */
.pau-uncertainty-detail .pau-capture-action-wrap {
  margin: 14px 0 0;
  border-radius: 0 0 11px 11px;
}

.pau-capture-action-wrap {
  margin: 14px -18px -16px;
  padding: 0;
  border-top: 1px solid color-mix(in srgb, var(--brand-700) 14%, var(--border));
  border-radius: 0 0 11px 11px;
  overflow: hidden;
  background: color-mix(in srgb, var(--brand-700) 4%, #fff);
}

.pau-capture-action {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  width: 100%;
  margin: 0;
  padding: 12px 16px 13px;
  border: none;
  background: transparent;
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.pau-capture-action:hover {
  background: color-mix(in srgb, var(--brand-700) 8%, #fff);
}

.pau-capture-action:active {
  background: color-mix(in srgb, var(--brand-700) 12%, #fff);
}

.pau-capture-action-icon {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 9px;
  color: var(--brand-700);
  background: color-mix(in srgb, var(--brand-700) 10%, #fff);
  border: 1px solid color-mix(in srgb, var(--brand-700) 18%, var(--border));
}

.pau-capture-action-icon-svg {
  display: block;
}

.pau-capture-action-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding-top: 2px;
}

.pau-capture-action-label {
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  font-size: 14px;
  font-weight: 750;
  line-height: 1.25;
  color: var(--foreground);
  letter-spacing: -0.02em;
}

.pau-capture-action-chevron {
  font-size: 15px;
  font-weight: 800;
  color: var(--brand-700);
  line-height: 1;
}

.pau-capture-action-helper {
  font-size: 13px;
  font-weight: 500;
  line-height: 1.4;
  color: color-mix(in srgb, var(--foreground) 62%, transparent);
  letter-spacing: -0.01em;
}

/* Legacy full-width CTA — kept for any stragglers */
.pau-uncertainty-cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  margin: 0;
  padding: 11px 14px;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--brand-700) 35%, var(--border));
  background: color-mix(in srgb, var(--brand-700) 6%, #fff);
  font-size: 14px;
  font-weight: 700;
  line-height: 1.25;
  color: var(--brand-700);
  cursor: pointer;
  letter-spacing: -0.01em;
}

.pau-uncertainty-cta:hover {
  background: color-mix(in srgb, var(--brand-700) 10%, #fff);
}

.pau-solid-list,
.pau-thin-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
  background: color-mix(in srgb, var(--foreground) 1.5%, #fff);
  overflow: hidden;
}

.pau-solid-row,
.pau-thin-row {
  display: grid;
  grid-template-columns: minmax(128px, 32%) 1fr;
  gap: 8px 12px;
  align-items: baseline;
  padding: 11px 14px;
  border-top: 1px solid color-mix(in srgb, var(--foreground) 5%, var(--border));
}

.pau-solid-row:first-child,
.pau-thin-row:first-child {
  border-top: none;
}

.pau-solid-title,
.pau-thin-title {
  font-size: 13px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: color-mix(in srgb, var(--foreground) 68%, transparent);
}

.pau-solid-summary {
  font-size: 14px;
  font-weight: 500;
  line-height: 1.35;
  color: var(--foreground);
  letter-spacing: -0.01em;
}

.pau-thin-hint {
  font-size: 13px;
  font-weight: 500;
  line-height: 1.4;
  color: var(--muted);
}

/* —— Active lanes: full narrative cards —— */
.pau-lane--active {
  padding: 16px 18px;
  border-radius: 12px;
  border: 1px solid color-mix(in srgb, var(--foreground) 12%, var(--border));
  background: #fff;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
}

.pau-lane--active .pau-lane-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 8px;
}

.pau-lane--active .pau-lane-title {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  letter-spacing: -0.03em;
  line-height: 1.2;
}

.pau-lane-state--active {
  padding: 3px 9px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 700;
  color: color-mix(in srgb, var(--foreground) 62%, transparent);
  background: color-mix(in srgb, var(--foreground) 4%, var(--surface));
  border: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));
}

.pau-lane-snapshot {
  margin: 0 0 8px;
  font-size: 15px;
  font-weight: 500;
  line-height: 1.45;
  color: var(--foreground);
  letter-spacing: -0.02em;
}

.pau-open-loops {
  margin: 0 0 10px;
  padding: 8px 10px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  line-height: 1.4;
  color: color-mix(in srgb, var(--foreground) 75%, transparent);
  background: color-mix(in srgb, var(--foreground) 3%, #fff);
  border-left: 3px solid color-mix(in srgb, var(--foreground) 22%, transparent);
}

.pau-open-loops-mark {
  font-weight: 700;
  margin-right: 0.35em;
}

.pau-lane-cta--primary {
  margin-top: 4px;
  padding: 8px 0 0;
  font-size: 14px;
  font-weight: 700;
  color: var(--brand-700);
  border: none;
  background: none;
  cursor: pointer;
  letter-spacing: -0.01em;
}

.pau-lane-cta--primary:hover {
  text-decoration: underline;
}

/* —— Steady lanes: compact scan rows —— */
.pau-lane--steady {
  padding: 0;
  border: none;
  background: transparent;
  box-shadow: none;
}

.pau-lane--steady + .pau-lane--steady .pau-lane-steady-inner {
  border-top: 1px solid color-mix(in srgb, var(--foreground) 5%, var(--border));
}

.pau-lane-steady-inner {
  display: grid;
  grid-template-columns: minmax(120px, 28%) 1fr auto;
  gap: 8px 14px;
  align-items: center;
  padding: 11px 14px;
}

.pau-lane-title--compact {
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: color-mix(in srgb, var(--foreground) 70%, transparent);
}

.pau-lane-snapshot--inline {
  margin: 0;
  font-size: 14px;
  font-weight: 500;
  line-height: 1.35;
  color: var(--foreground);
  letter-spacing: -0.01em;
}

.pau-lane-state--steady {
  font-size: 10px;
  font-weight: 600;
  color: color-mix(in srgb, var(--foreground) 42%, transparent);
  white-space: nowrap;
}

/* —— Thin lanes: light tiles —— */
.pau-lane--thin {
  padding: 12px 14px;
  border-radius: 10px;
  border: 1px dashed color-mix(in srgb, var(--foreground) 10%, var(--border));
  background: color-mix(in srgb, var(--foreground) 1%, #fff);
}

.pau-lane-head--thin {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
}

.pau-lane--thin .pau-lane-title {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.pau-lane--thin .pau-lane-state {
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 600;
  color: var(--muted);
  background: color-mix(in srgb, var(--foreground) 3%, var(--surface));
  border: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
}

.pau-lane-snapshot--muted {
  margin: 0 0 8px;
  font-size: 13px;
  font-weight: 500;
  line-height: 1.4;
  color: var(--muted);
  font-style: italic;
}

.pau-lane--thin .pau-lane-cta {
  margin-top: 6px;
  padding: 0;
  font-size: 13px;
  font-weight: 700;
  color: var(--brand-700);
  border: none;
  background: none;
  cursor: pointer;
}

/* —— Collapsed secondary details —— */
.pau-more {
  margin: 0;
}

.pau-more-toggle {
  font-size: 12px;
  font-weight: 600;
  color: color-mix(in srgb, var(--foreground) 48%, transparent);
  cursor: pointer;
  list-style: none;
}

.pau-more-toggle::-webkit-details-marker {
  display: none;
}

.pau-more[open] .pau-more-toggle {
  color: color-mix(in srgb, var(--foreground) 62%, transparent);
  margin-bottom: 6px;
}

.pau-more-body {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 0 0 2px;
}

.pau-more-hint {
  margin: 0;
  font-size: 12px;
  line-height: 1.4;
  color: var(--muted);
}

.pau-more-stakes {
  margin: 0;
  font-size: 13px;
  line-height: 1.4;
  color: color-mix(in srgb, var(--foreground) 68%, transparent);
}

.pau-more-source {
  margin: 0;
  font-size: 13px;
  font-weight: 500;
  line-height: 1.35;
  color: color-mix(in srgb, var(--foreground) 78%, transparent);
}

.pau-more-source-label {
  font-weight: 700;
  margin-right: 0.35em;
}

/* Field editor tier — de-emphasized */
.provider-intel-workspace--understanding .provider-intel-workspace-tier--areas {
  margin-top: 8px;
}

.provider-intel-workspace--understanding .provider-account-fields-toggle {
  width: 100%;
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
  background: color-mix(in srgb, var(--foreground) 2%, #fff);
  font-size: 13px;
  font-weight: 600;
  color: color-mix(in srgb, var(--foreground) 55%, transparent);
  cursor: pointer;
  text-align: left;
}

.provider-intel-workspace--understanding .provider-account-fields-toggle:hover {
  color: var(--foreground);
}

.provider-intel-section-card--understanding .provider-intel-confidence-badge,
.provider-intel-section-card--understanding .provider-intel-section-progress,
.provider-intel-section-card--understanding .provider-intel-section-completion-meta {
  display: none !important;
}

.provider-intel-section-collapsed-understanding {
  margin: 0;
  padding: 0 0 0 2px;
  font-size: 13px;
  font-weight: 500;
  color: color-mix(in srgb, var(--foreground) 52%, transparent);
}

@media (max-width: 640px) {
  .pau-lane-steady-inner {
    grid-template-columns: 1fr;
    gap: 4px;
  }

  .pau-band-grid--thin {
    grid-template-columns: 1fr;
  }
}
`;
