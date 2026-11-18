export const providerProfileCss = `

.provider-profile-root {

  display: flex;

  flex-direction: column;

  min-height: 100dvh;

  max-width: 100%;

  overflow-x: hidden;

  background: #fff;

}



.provider-intelligence-lead {
  margin: 0 0 8px;
  font-size: 11px;
  line-height: 1.4;
  color: var(--muted);
  font-weight: 600;
}

.provider-profile-sticky {

  position: sticky;

  top: 0;

  z-index: 30;

  background: #fff;

  border-bottom: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));

  box-shadow: 0 1px 0 color-mix(in srgb, var(--foreground) 4%, transparent);

}



.provider-profile-header {

  padding: 8px 12px 6px;

  background: linear-gradient(180deg, color-mix(in srgb, var(--brand-600) 5%, #fff), #fff);

}

.provider-readiness-bar {
  margin: 6px 0 0;
  padding: 7px 10px;
  border-radius: 8px;
  border: none;
  background: color-mix(in srgb, var(--foreground) 4%, #fff);
  font-size: 11px;
  font-weight: 600;
  line-height: 1.45;
  letter-spacing: -0.01em;
  color: color-mix(in srgb, var(--foreground) 82%, transparent);
}

.provider-readiness-bar-sep {
  font-weight: 500;
  color: color-mix(in srgb, var(--foreground) 38%, transparent);
}

.provider-readiness-bar--limited {
  border-color: color-mix(in srgb, var(--warn-600, #d97706) 28%, transparent);
  background: color-mix(in srgb, var(--warn-600, #d97706) 6%, #fff);
}

.provider-readiness-bar--building {
  background: color-mix(in srgb, var(--brand-600) 6%, #fff);
}

.provider-readiness-bar--strong {
  background: color-mix(in srgb, var(--ok-600, #059669) 6%, #fff);
}

.provider-readiness-stack {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.provider-readiness-freshness-warn {
  margin: 0;
  padding: 6px 10px;
  border-radius: 8px;
  font-size: 10px;
  font-weight: 700;
  line-height: 1.35;
  color: var(--warn-800, #92400e);
  background: color-mix(in srgb, var(--warn-600, #d97706) 12%, #fff);
  border: 1px solid color-mix(in srgb, var(--warn-600, #d97706) 28%, transparent);
}

/* Operational trust — validated / emerging / open assumption */
.provider-intel-trust-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 7px;
  border-radius: 999px;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  white-space: nowrap;
  border: 1px solid transparent;
}

.provider-intel-trust-badge--compact {
  font-size: 8px;
  padding: 1px 6px;
}

.provider-intel-trust-badge--validated {
  color: #166534;
  background: color-mix(in srgb, #16a34a 14%, var(--surface));
  border-color: color-mix(in srgb, #16a34a 28%, var(--border));
}

.provider-intel-trust-badge--emerging {
  color: #92400e;
  background: color-mix(in srgb, #f59e0b 12%, var(--surface));
  border-color: color-mix(in srgb, #f59e0b 26%, var(--border));
}

.provider-intel-trust-badge--unknown {
  color: var(--muted);
  background: color-mix(in srgb, var(--foreground) 4%, var(--surface));
  border-color: color-mix(in srgb, var(--foreground) 10%, var(--border));
  font-weight: 700;
}

.provider-intel-trust-legend {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
}

.provider-intel-trust-legend-item {
  display: inline-flex;
}

.provider-intel-ws-summary-head-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 6px 10px;
  width: 100%;
}

.provider-intel-freshness-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 7px;
  border-radius: 999px;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  white-space: nowrap;
}

.provider-intel-freshness-badge--compact {
  font-size: 8px;
  padding: 1px 6px;
}

.provider-intel-freshness-badge--recent {
  color: var(--ok-700, #047857);
  background: color-mix(in srgb, var(--ok-600, #059669) 12%, transparent);
}

.provider-intel-freshness-badge--current {
  color: #166534;
  background: color-mix(in srgb, #16a34a 12%, transparent);
}

.provider-intel-freshness-badge--aging,
.provider-intel-freshness-badge--unverified {
  color: #92400e;
  background: color-mix(in srgb, #f59e0b 12%, transparent);
}

.provider-intel-freshness-badge--needs_refresh {
  color: var(--warn-800, #92400e);
  background: color-mix(in srgb, var(--warn-600, #d97706) 14%, transparent);
}

.provider-intel-freshness-badge--outdated {
  color: #fff;
  background: var(--warn-700, #b45309);
}

.provider-intel-freshness-alert {
  margin: 0 0 10px;
  padding: 8px 10px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--warn-600, #d97706) 8%, #fff);
  border: 1px solid color-mix(in srgb, var(--warn-600, #d97706) 22%, transparent);
}

.provider-intel-freshness-alert-label {
  display: block;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.01em;
  color: var(--warn-800, #92400e);
  margin-bottom: 4px;
}

.provider-intel-freshness-alert-list {
  margin: 0;
  padding: 0 0 0 14px;
  font-size: 11px;
  font-weight: 600;
  line-height: 1.4;
  color: color-mix(in srgb, var(--foreground) 82%, transparent);
}

.provider-intel-freshness-panel {
  margin: 0 0 12px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--warn-600, #d97706) 20%, transparent);
  background: color-mix(in srgb, var(--warn-600, #d97706) 6%, #fff);
}

.provider-intel-freshness-panel-head {
  margin-bottom: 8px;
}

.provider-intel-freshness-panel-title {
  margin: 0 0 4px;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.02em;
  color: var(--warn-800, #92400e);
}

.provider-intel-freshness-panel-lead {
  margin: 0;
  font-size: 11px;
  line-height: 1.4;
  color: color-mix(in srgb, var(--foreground) 75%, transparent);
}

.provider-intel-freshness-panel-stats {
  margin: 6px 0 0;
  font-size: 10px;
  font-weight: 700;
  color: var(--warn-800, #92400e);
}

.provider-intel-freshness-panel-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.provider-intel-freshness-row {
  padding: 8px 10px;
  border-radius: 8px;
  background: #fff;
  border: 1px solid color-mix(in srgb, var(--border) 80%, transparent);
}

.provider-intel-freshness-row--outdated {
  border-color: color-mix(in srgb, var(--warn-700, #b45309) 35%, transparent);
}

.provider-intel-freshness-row-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 8px;
  margin-bottom: 4px;
}

.provider-intel-freshness-row-field {
  font-size: 11px;
  font-weight: 800;
  flex: 1 1 auto;
  min-width: 120px;
}

.provider-intel-freshness-row-decay {
  font-size: 10px;
  font-weight: 700;
  color: var(--warn-800, #92400e);
  margin-left: auto;
}

.provider-intel-freshness-row-warning {
  margin: 0 0 4px;
  font-size: 11px;
  font-weight: 600;
  line-height: 1.35;
  color: color-mix(in srgb, var(--foreground) 85%, transparent);
}

.provider-intel-freshness-row-prompt {
  margin: 0 0 6px;
  font-size: 10px;
  line-height: 1.35;
  font-style: italic;
  color: color-mix(in srgb, var(--foreground) 65%, transparent);
}

.provider-intel-freshness-row-cta {
  font-size: 10px;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 6px;
  border: 1px solid color-mix(in srgb, var(--warn-600, #d97706) 40%, transparent);
  background: color-mix(in srgb, var(--warn-600, #d97706) 10%, #fff);
  color: var(--warn-800, #92400e);
  cursor: pointer;
}

.provider-intel-section-detail-reconfirm {
  margin: 6px 0 0;
  font-size: 10px;
  line-height: 1.35;
  font-style: italic;
  color: var(--warn-800, #92400e);
}

.provider-intel-section-detail-decay {
  font-size: 10px;
  font-weight: 700;
  color: var(--warn-800, #92400e);
}

.provider-intel-quick-signal-freshness {
  margin: 0 0 10px;
  padding: 8px 10px;
  border-radius: 8px;
  border-left: 3px solid var(--warn-600, #d97706);
  background: color-mix(in srgb, var(--warn-600, #d97706) 8%, #fff);
}

.provider-intel-quick-signal-freshness-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 8px;
  margin-bottom: 4px;
}

.provider-intel-quick-signal-freshness-warning {
  margin: 0 0 4px;
  font-size: 11px;
  font-weight: 600;
  line-height: 1.35;
}

.provider-intel-quick-signal-freshness-prompt {
  margin: 0;
  font-size: 10px;
  line-height: 1.35;
  font-style: italic;
}

.provider-intel-section-scan-block--stale {
  border-left: 3px solid var(--warn-600, #d97706);
  padding-left: 8px;
}

.provider-intel-section-stale-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.provider-intel-section-stale-item {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.provider-intel-section-stale-text {
  font-size: 11px;
  font-weight: 600;
  line-height: 1.35;
  color: color-mix(in srgb, var(--foreground) 78%, transparent);
}

.provider-intel-section-detail-validated-at {
  display: block;
  font-size: 10px;
  font-weight: 600;
  color: color-mix(in srgb, var(--foreground) 55%, transparent);
  margin-top: 2px;
}

.provider-intel-section-detail-validation--recent {
  color: var(--ok-700, #047857);
  background: color-mix(in srgb, var(--ok-600, #059669) 10%, transparent);
}

.provider-intel-section-detail-validation--needs_refresh,
.provider-intel-section-detail-validation--outdated {
  color: var(--warn-800, #92400e);
  background: color-mix(in srgb, var(--warn-600, #d97706) 12%, transparent);
}

.provider-intel-section-detail-validation--unverified,
.provider-intel-section-detail-validation--aging {
  color: var(--brand-700);
  background: color-mix(in srgb, var(--brand-600) 8%, transparent);
}

.provider-intel-section-detail-validation--current {
  color: color-mix(in srgb, var(--foreground) 65%, transparent);
  background: color-mix(in srgb, var(--foreground) 5%, transparent);
}



.provider-profile-back {

  font-size: 11px;

  font-weight: 800;

  color: var(--brand-700);

  text-decoration: none;

  display: inline-block;

  margin-bottom: 4px;

}



.provider-profile-name {

  font-size: 18px;

  font-weight: 900;

  letter-spacing: -0.03em;

  line-height: 1.15;

  margin: 0;

}



.provider-profile-sub {

  margin-top: 2px;

  font-size: 12px;

  color: var(--muted);

  line-height: 1.35;

}



.provider-profile-chips {

  display: flex;

  flex-wrap: wrap;

  gap: 4px;

  margin-top: 6px;

}



.provider-profile-chip {

  font-size: 10px;

  font-weight: 800;

  padding: 3px 8px;

  border-radius: 999px;

  border: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));

  background: color-mix(in srgb, var(--foreground) 4%, var(--surface));
  font-family: inherit;
}

button.provider-profile-chip {
  cursor: pointer;
}

.provider-profile-chip--brand {

  background: color-mix(in srgb, var(--brand-600) 12%, var(--surface));

  border-color: color-mix(in srgb, var(--brand-600) 24%, var(--border));

  color: var(--brand-700);

}



.provider-profile-chip--complete {

  background: color-mix(in srgb, #16a34a 10%, var(--surface));

  border-color: color-mix(in srgb, #16a34a 28%, var(--border));

  color: #15803d;

}



.provider-profile-actions {

  display: flex;

  flex-direction: column;

  gap: 6px;

  margin-top: 8px;

  min-width: 0;

}



.provider-profile-action {

  width: 100%;

  min-height: 34px;

  padding: 0 6px;

  border-radius: 8px;

  font-size: 11px;

  font-weight: 800;

  text-decoration: none;

  display: inline-flex;

  align-items: center;

  justify-content: center;

  border: 1px solid color-mix(in srgb, var(--brand-600) 18%, var(--border));

  background: color-mix(in srgb, var(--brand-600) 6%, var(--surface));

  color: var(--brand-700);

  cursor: pointer;

  font-family: inherit;

}



.provider-profile-action--primary {

  background: var(--brand-600);

  color: #fff;

  border-color: color-mix(in srgb, var(--brand-600) 80%, black);

}



.provider-profile-tabs {

  display: flex;

  flex-wrap: nowrap;

  gap: 4px;

  padding: 5px 8px;

  min-width: 0;

  overflow-x: auto;

  -webkit-overflow-scrolling: touch;

  scrollbar-width: none;

}

.provider-profile-tabs::-webkit-scrollbar {

  display: none;

}



.provider-profile-tab {

  flex: 0 0 auto;

  min-height: 30px;

  padding: 0 10px;

  border-radius: 999px;

  border: 1px solid transparent;

  background: transparent;

  font-size: 11px;

  font-weight: 600;

  color: var(--muted);

  cursor: pointer;

  white-space: nowrap;

}



.provider-profile-tab--active {

  background: var(--brand-050);

  border-color: color-mix(in srgb, var(--brand-600) 22%, var(--border));

  color: var(--brand-800, var(--brand-700));

  font-weight: 900;

}



.provider-profile-body {

  padding: 8px 12px calc(20px + env(safe-area-inset-bottom, 0px));

  display: grid;

  gap: 8px;

  min-width: 0;

}



.provider-profile-section-title {

  font-size: 10px;

  font-weight: 900;

  letter-spacing: 0.06em;

  text-transform: uppercase;

  color: var(--muted);

  margin: 0 0 6px;

}



.provider-profile-card {

  border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));

  border-radius: 8px;

  padding: 7px 9px;

  background: var(--surface);

  font-size: 12px;

}



.provider-profile-field {

  display: grid;

  gap: 3px;

  margin-bottom: 8px;

}



.provider-profile-field:last-child {

  margin-bottom: 0;

}



.provider-profile-field label {

  font-size: 11px;

  font-weight: 800;

}



.provider-profile-field textarea,

.provider-profile-field input {

  width: 100%;

  box-sizing: border-box;

  padding: 7px 9px;

  border-radius: 8px;

  border: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));

  font-size: 13px;

  font-family: inherit;

  background: #fff;

}



.provider-profile-field .hint {

  font-size: 10px;

  color: var(--muted);

  line-height: 1.35;

}



/* At a glance */

.provider-at-a-glance {

  border: 1px solid color-mix(in srgb, var(--brand-600) 18%, var(--border));

  border-radius: 8px;

  padding: 7px 9px;

  background: color-mix(in srgb, var(--brand-600) 4%, var(--surface));

}



.provider-at-a-glance-planning {

  display: flex;

  align-items: center;

  gap: 6px;

  width: 100%;

  padding: 0;

  margin: 0 0 8px;

  border: none;

  background: transparent;

  cursor: pointer;

  text-align: left;

  font-family: inherit;

}



.provider-at-a-glance-planning-label {

  font-size: 10px;

  font-weight: 900;

  text-transform: uppercase;

  letter-spacing: 0.05em;

  color: var(--muted);

}



.provider-at-a-glance-planning-status {

  flex: 1;

  font-size: 12px;

  font-weight: 800;

}



.provider-at-a-glance-planning-status--complete { color: #15803d; }

.provider-at-a-glance-planning-status--in_progress { color: var(--brand-700); }

.provider-at-a-glance-planning-status--needs_update { color: var(--brand-700); }

.provider-at-a-glance-planning-status--not_started { color: var(--muted); }



.provider-at-a-glance-planning-cta {

  font-size: 11px;

  font-weight: 800;

  color: var(--brand-700);

}



.provider-at-a-glance-specialty {

  margin: 0 0 6px;

  font-size: 12px;

  line-height: 1.35;

}



.provider-at-a-glance-intel {

  list-style: none;

  margin: 0;

  padding: 0;

  display: grid;

  gap: 5px;

}



.provider-at-a-glance-intel li {

  display: grid;

  gap: 1px;

}



.provider-at-a-glance-intel-label {

  font-size: 10px;

  font-weight: 800;

  text-transform: uppercase;

  letter-spacing: 0.04em;

  color: var(--muted);

}



.provider-at-a-glance-intel-value {

  font-size: 12px;

  line-height: 1.35;

}



.provider-at-a-glance-prompt {

  margin-top: 8px;

  padding-top: 8px;

  border-top: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));

}



.provider-at-a-glance-prompt-body {

  margin: 2px 0 0;

  font-size: 12px;

  line-height: 1.4;

  white-space: pre-wrap;

}



.provider-at-a-glance-empty {

  margin: 0;

  font-size: 12px;

  color: var(--muted);

  line-height: 1.4;

}



/* Planning accordion */

.provider-planning-accordion-progress {

  height: 4px;

  border-radius: 999px;

  background: color-mix(in srgb, var(--foreground) 8%, var(--border));

  overflow: hidden;

  margin-bottom: 8px;

}



.provider-planning-accordion-progress > span {

  display: block;

  height: 100%;

  background: var(--brand-600);

}



.provider-planning-accordion-list {

  display: grid;

  gap: 6px;

}



.provider-accordion-item {

  border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));

  border-radius: 10px;

  overflow: hidden;

  background: #fff;

}



.provider-accordion-item--open {

  border-color: color-mix(in srgb, var(--brand-600) 22%, var(--border));

}



.provider-accordion-trigger {

  width: 100%;

  display: flex;

  align-items: flex-start;

  justify-content: space-between;

  gap: 8px;

  padding: 8px 10px;

  border: none;

  background: color-mix(in srgb, var(--foreground) 2%, var(--surface));

  cursor: pointer;

  text-align: left;

  font-family: inherit;

}



.provider-accordion-trigger-main {

  display: grid;

  gap: 2px;

  min-width: 0;

}



.provider-accordion-title {

  font-size: 12px;

  font-weight: 800;

}



.provider-accordion-preview {

  font-size: 11px;

  color: var(--muted);

  line-height: 1.35;

}



.provider-accordion-badge {

  flex-shrink: 0;

  font-size: 9px;

  font-weight: 800;

  padding: 2px 6px;

  border-radius: 999px;

  text-transform: uppercase;

  letter-spacing: 0.03em;

}



.provider-accordion-badge-count {

  font-weight: 650;

  text-transform: none;

  letter-spacing: 0;

  opacity: 0.92;

}



.provider-accordion-badge--complete {

  background: color-mix(in srgb, #16a34a 12%, var(--surface));

  color: #15803d;

}



.provider-accordion-badge--in_progress {

  background: color-mix(in srgb, var(--brand-600) 10%, var(--surface));

  color: var(--brand-700);

}



.provider-accordion-badge--not_started {

  background: color-mix(in srgb, var(--foreground) 6%, var(--surface));

  color: var(--muted);

}



.provider-accordion-panel {

  padding: 8px 10px 10px;

  border-top: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));

}



.provider-accordion-readonly {

  margin: 0;

  font-size: 11px;

  color: var(--muted);

  line-height: 1.4;

}



.provider-accordion-readonly-grid {

  display: grid;

  gap: 4px;

}



.provider-accordion-readonly-line {

  margin: 0;

  font-size: 12px;

  line-height: 1.35;

}



.provider-accordion-readonly-line span {

  font-weight: 800;

  color: var(--muted);

  font-size: 10px;

  text-transform: uppercase;

  letter-spacing: 0.03em;

}



.provider-discovery-accordion {

  display: grid;

  gap: 6px;

}



.provider-discovery-intro {

  margin: 0 0 4px;

  font-size: 11px;

  color: var(--muted);

  line-height: 1.4;

}



.provider-discovery-list {

  display: grid;

  gap: 4px;

}



.provider-discovery-item {

  border: 1px solid color-mix(in srgb, var(--foreground) 7%, var(--border));

  border-radius: 8px;

  overflow: hidden;

  background: color-mix(in srgb, var(--foreground) 1.5%, #fff);

}



.provider-discovery-item--open {

  border-color: color-mix(in srgb, var(--brand-600) 20%, var(--border));

}



.provider-discovery-item--answered:not(.provider-discovery-item--open) .provider-discovery-trigger {

  background: color-mix(in srgb, var(--brand-600) 3%, var(--surface));

}



.provider-discovery-trigger {

  width: 100%;

  display: flex;

  align-items: flex-start;

  gap: 8px;

  padding: 7px 8px;

  border: none;

  background: transparent;

  cursor: pointer;

  text-align: left;

  font-family: inherit;

}



.provider-discovery-trigger-num {

  flex-shrink: 0;

  width: 20px;

  height: 20px;

  border-radius: 6px;

  display: inline-flex;

  align-items: center;

  justify-content: center;

  font-size: 10px;

  font-weight: 900;

  background: color-mix(in srgb, var(--foreground) 6%, var(--surface));

  color: var(--muted);

}



.provider-discovery-item--open .provider-discovery-trigger-num {

  background: color-mix(in srgb, var(--brand-600) 14%, var(--surface));

  color: var(--brand-700);

}



.provider-discovery-trigger-main {

  display: grid;

  gap: 2px;

  min-width: 0;

  flex: 1;

}



.provider-discovery-trigger-label {

  font-size: 11px;

  font-weight: 800;

  color: var(--foreground);

}



.provider-discovery-trigger-preview {

  font-size: 10px;

  color: var(--muted);

  line-height: 1.35;

}



.provider-discovery-status {

  flex-shrink: 0;

  font-size: 9px;

  font-weight: 800;

  color: var(--muted);

  padding-top: 2px;

}



.provider-discovery-status--done {

  color: var(--brand-700);

}



.provider-discovery-panel {

  padding: 0 8px 8px 36px;

  display: grid;

  gap: 6px;

}



.provider-discovery-question {

  margin: 0;

  font-size: 12px;

  font-weight: 650;

  line-height: 1.4;

  color: color-mix(in srgb, var(--foreground) 88%, var(--muted));

}



.provider-discovery-panel textarea {

  width: 100%;

  min-height: 72px;

  resize: vertical;

  border-radius: 8px;

  border: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));

  padding: 8px 10px;

  font-size: 13px;

  font-family: inherit;

  line-height: 1.4;

  background: #fff;

}



.provider-accordion-panel:has(.provider-discovery-section) {

  padding: 0;

  gap: 0;

}



.provider-discovery-section {

  display: grid;

  gap: 8px;

}



.provider-discovery-section-header {

  display: grid;

  gap: 4px;

}



.provider-discovery-section-header-top {

  display: flex;

  align-items: baseline;

  justify-content: space-between;

  gap: 10px;

  flex-wrap: wrap;

}



.provider-discovery-section-title {

  margin: 0;

  font-size: 12px;

  font-weight: 900;

  letter-spacing: 0.02em;

}



.provider-discovery-section-count {

  font-size: 10px;

  font-weight: 800;

  color: var(--brand-700);

  white-space: nowrap;

}



.provider-discovery-section-helper {

  margin: 0;

  font-size: 11px;

  color: var(--muted);

  line-height: 1.4;

}



.provider-discovery-row {

  border: 1px solid color-mix(in srgb, var(--foreground) 7%, var(--border));

  border-radius: 8px;

  overflow: hidden;

  background: color-mix(in srgb, var(--foreground) 1.5%, #fff);

}



.provider-discovery-row--open {

  border-color: color-mix(in srgb, var(--brand-600) 22%, var(--border));

}



.provider-discovery-row--complete:not(.provider-discovery-row--open) {

  background: color-mix(in srgb, var(--brand-600) 3%, var(--surface));

}



.provider-discovery-row-trigger {

  width: 100%;

  display: flex;

  align-items: flex-start;

  gap: 8px;

  padding: 8px 10px;

  border: none;

  background: transparent;

  cursor: pointer;

  text-align: left;

  font-family: inherit;

}



.provider-discovery-row-index {

  flex-shrink: 0;

  width: 20px;

  height: 20px;

  border-radius: 6px;

  display: inline-flex;

  align-items: center;

  justify-content: center;

  font-size: 10px;

  font-weight: 900;

  background: color-mix(in srgb, var(--foreground) 6%, var(--surface));

  color: var(--muted);

}



.provider-discovery-row--open .provider-discovery-row-index {

  background: color-mix(in srgb, var(--brand-600) 14%, var(--surface));

  color: var(--brand-700);

}



.provider-discovery-row-body {

  display: grid;

  gap: 2px;

  min-width: 0;

  flex: 1;

}



.provider-discovery-row-label {

  font-size: 11px;

  font-weight: 800;

  color: var(--foreground);

}



.provider-discovery-row-question {

  font-size: 10px;

  color: var(--muted);

  line-height: 1.35;

  display: -webkit-box;

  -webkit-line-clamp: 2;

  -webkit-box-orient: vertical;

  overflow: hidden;

}



.provider-discovery-row--open .provider-discovery-row-question {

  display: none;

}



.provider-discovery-row-meta {

  display: flex;

  flex-wrap: wrap;

  align-items: center;

  gap: 0;

  font-size: 9px;

  color: var(--muted);

  margin-top: 2px;

}



.provider-discovery-row-state {

  font-weight: 800;

  text-transform: uppercase;

  letter-spacing: 0.03em;

}



.provider-discovery-row-state--done {

  color: var(--brand-700);

}



.provider-discovery-row-meta-dot {

  margin: 0 4px;

}



.provider-discovery-row-confidence {

  text-transform: capitalize;

}



.provider-discovery-row-tags {

  display: flex;

  flex-wrap: wrap;

  gap: 4px;

  margin-top: 6px;

}



.provider-discovery-chips {

  display: flex;

  flex-wrap: wrap;

  gap: 4px;

}



.provider-discovery-chip {

  display: inline-flex;

  align-items: center;

  gap: 2px;

  border-radius: 999px;

  padding: 2px 8px;

  font-size: 10px;

  font-weight: 650;

  line-height: 1.3;

  background: color-mix(in srgb, var(--foreground) 6%, #fff);

  border: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));

  color: var(--foreground);

}



.provider-discovery-chip--more {

  color: var(--muted);

}



.provider-discovery-chip-remove {

  border: none;

  background: transparent;

  padding: 0 2px;

  margin: 0;

  font-size: 12px;

  line-height: 1;

  color: var(--muted);

  cursor: pointer;

  font-family: inherit;

}



.provider-discovery-custom-tag-row {

  display: flex;

  gap: 8px;

  align-items: center;

}



.provider-discovery-custom-tag-row input {

  flex: 1;

  min-width: 0;

}



.provider-discovery-row-chevron {

  flex-shrink: 0;

  font-size: 18px;

  line-height: 1;

  color: var(--muted);

  transform: rotate(0deg);

  transition: transform 0.15s ease;

  padding-top: 1px;

}



.provider-discovery-row-chevron--open {

  transform: rotate(90deg);

  color: var(--brand-700);

}



.provider-discovery-editor {

  padding: 0 10px 10px 38px;

  display: grid;

  gap: 10px;

  border-top: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));

  background: color-mix(in srgb, var(--brand-600) 2%, #fff);

}



.provider-discovery-editor-question {

  margin: 8px 0 0;

  font-size: 12px;

  font-weight: 650;

  line-height: 1.4;

  color: color-mix(in srgb, var(--foreground) 88%, var(--muted));

}



.provider-discovery-field {

  display: grid;

  gap: 4px;

}



.provider-discovery-field > span {

  font-size: 10px;

  font-weight: 800;

  text-transform: uppercase;

  letter-spacing: 0.03em;

  color: var(--muted);

}



.provider-discovery-field textarea,

.provider-discovery-field input {

  width: 100%;

  border-radius: 8px;

  border: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));

  padding: 8px 10px;

  font-size: 13px;

  font-family: inherit;

  line-height: 1.4;

  background: #fff;

}



.provider-discovery-field textarea {

  min-height: 88px;

  resize: vertical;

}



.provider-discovery-tags-block {

  display: grid;

  gap: 6px;

}



.provider-discovery-tags-label {

  font-size: 10px;

  font-weight: 800;

  text-transform: uppercase;

  letter-spacing: 0.03em;

  color: var(--muted);

}



.provider-discovery-tags {

  display: flex;

  flex-wrap: wrap;

  gap: 6px;

}



.provider-discovery-tag {

  border: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));

  border-radius: 999px;

  padding: 4px 10px;

  font-size: 11px;

  font-weight: 650;

  background: #fff;

  color: var(--foreground);

  cursor: pointer;

  font-family: inherit;

}



.provider-discovery-tag--on {

  border-color: color-mix(in srgb, var(--brand-600) 35%, var(--border));

  background: color-mix(in srgb, var(--brand-600) 10%, #fff);

  color: var(--brand-700);

}



.provider-discovery-confidence {

  border: none;

  margin: 0;

  padding: 0;

  min-width: 0;

}



.provider-discovery-confidence legend {

  font-size: 10px;

  font-weight: 800;

  text-transform: uppercase;

  letter-spacing: 0.03em;

  color: var(--muted);

  padding: 0;

  margin-bottom: 6px;

}



.provider-discovery-confidence-row {

  display: flex;

  gap: 6px;

  flex-wrap: wrap;

}



.provider-discovery-confidence-btn {

  flex: 1;

  min-width: 72px;

  border: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));

  border-radius: 8px;

  padding: 6px 10px;

  font-size: 12px;

  font-weight: 700;

  background: #fff;

  cursor: pointer;

  font-family: inherit;

}



.provider-discovery-confidence-btn--active {

  border-color: color-mix(in srgb, var(--brand-600) 35%, var(--border));

  background: color-mix(in srgb, var(--brand-600) 10%, #fff);

  color: var(--brand-700);

}



.provider-discovery-editor-actions {

  display: flex;

  align-items: center;

  gap: 8px;

  flex-wrap: wrap;

}



.provider-discovery-save-msg {

  font-size: 11px;

  color: var(--danger);

}



.provider-discovery-save-msg--ok {

  color: var(--brand-700);

}



.provider-discovery-sheet-root {

  position: fixed;

  inset: 0;

  z-index: 120;

  display: flex;

  flex-direction: column;

  justify-content: flex-end;

  pointer-events: none;

}



.provider-discovery-sheet-backdrop {

  position: absolute;

  inset: 0;

  border: none;

  background: color-mix(in srgb, var(--foreground) 35%, transparent);

  pointer-events: auto;

  cursor: pointer;

}



.provider-discovery-sheet {

  position: relative;

  z-index: 1;

  max-height: min(88vh, 640px);

  overflow: auto;

  border-radius: 14px 14px 0 0;

  background: #fff;

  border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));

  border-bottom: none;

  box-shadow: 0 -8px 32px color-mix(in srgb, var(--foreground) 12%, transparent);

  pointer-events: auto;

  display: grid;

  gap: 0;

  padding-bottom: max(12px, env(safe-area-inset-bottom));

}



.provider-discovery-sheet-handle {

  width: 36px;

  height: 4px;

  border-radius: 999px;

  background: color-mix(in srgb, var(--foreground) 18%, var(--border));

  margin: 8px auto 4px;

}



.provider-discovery-sheet-head {

  display: flex;

  align-items: center;

  justify-content: space-between;

  gap: 8px;

  padding: 0 12px 8px;

  border-bottom: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));

}



.provider-discovery-sheet-head h4 {

  margin: 0;

  font-size: 14px;

  font-weight: 900;

}



.provider-discovery-sheet-close {

  width: 32px;

  height: 32px;

  border: none;

  border-radius: 8px;

  background: color-mix(in srgb, var(--foreground) 5%, var(--surface));

  font-size: 20px;

  line-height: 1;

  cursor: pointer;

  color: var(--muted);

}



.provider-discovery-sheet .provider-discovery-editor {

  padding: 12px;

  border-top: none;

  background: transparent;

}



@media (max-width: 768px) {

  .provider-discovery-row-question {

    -webkit-line-clamp: 1;

  }

}



.provider-planning-autosave-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
  align-items: center;
  font-size: 11px;
  color: var(--muted);
  margin-bottom: 8px;
}

.provider-planning-autosave-meta--error {
  color: var(--danger);
  font-weight: 700;
}

.provider-accordion-updated {
  display: block;
  font-size: 10px;
  font-weight: 600;
  color: var(--muted);
  margin-top: 2px;
}

.provider-profile-field--required label::after {
  content: " *";
  color: var(--danger);
  font-weight: 800;
}

.provider-planning-fields {
  display: grid;
  gap: 10px;
}

.provider-intel-structured {
  display: grid;
  gap: 8px;
}

.provider-intel-segmented {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.provider-intel-segmented .provider-discovery-confidence-btn {
  flex: 1 1 auto;
  min-width: 88px;
}

.provider-intel-notes-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.03em;
  color: var(--muted);
}

.provider-intel-notes-input {
  width: 100%;
  min-height: 52px;
  resize: vertical;
  font-size: 13px;
  line-height: 1.4;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));
  font-family: inherit;
}

.provider-intel-compact-input {
  width: 100%;
  font-size: 13px;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));
  font-family: inherit;
}

.provider-intel-legacy-hint {
  margin: 0;
  font-size: 11px;
  line-height: 1.4;
  color: var(--muted);
  font-style: italic;
}

.provider-intel-section-cards {
  gap: 10px;
}

.provider-intel-section-card {
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 1px 0 color-mix(in srgb, var(--foreground) 6%, transparent);
}

.provider-intel-section-card .provider-accordion-trigger {
  position: relative;
  flex-direction: column;
  align-items: stretch;
  gap: 8px;
  padding-top: 12px;
}

.provider-intel-section-progress {
  display: block;
  height: 3px;
  width: 100%;
  border-radius: 999px;
  background: color-mix(in srgb, var(--foreground) 8%, var(--border));
  overflow: hidden;
}

.provider-intel-section-progress-fill {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(
    90deg,
    color-mix(in srgb, var(--brand-600) 70%, #fff),
    var(--brand-600)
  );
  transition: width 0.2s ease;
}

.provider-intel-section-card .provider-accordion-trigger-main {
  width: 100%;
}

.provider-intel-section-card .provider-accordion-badge {
  align-self: flex-start;
}

.provider-intel-section-panel-hint {
  margin: 0 0 10px;
  font-size: 11px;
  line-height: 1.45;
  color: var(--muted);
  font-weight: 600;
}

.provider-intel-overall-confidence {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 11px;
}

.provider-intel-overall-confidence-label {
  font-weight: 800;
  color: var(--foreground);
}

.provider-intel-overall-confidence-meta {
  color: var(--muted);
  font-weight: 650;
}

.provider-planning-accordion--incremental,
.provider-planning-accordion--scannable {
  gap: 6px;
}

.provider-planning-accordion--scannable {
  max-width: none;
}

.provider-intel-scannable-top {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px 12px;
}

/* Next Discovery Priorities — primary operating panel */
.provider-intel-discovery-hero {
  margin: 0;
  padding: 10px 12px 10px;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--brand-600) 22%, var(--border));
  background: linear-gradient(
    165deg,
    color-mix(in srgb, var(--brand-600) 7%, var(--surface)) 0%,
    var(--surface) 55%
  );
  box-shadow: 0 1px 2px color-mix(in srgb, var(--foreground) 5%, transparent);
}

.provider-intel-discovery-hero-head {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 8px;
  padding-bottom: 8px;
  border-bottom: 1px solid color-mix(in srgb, var(--brand-600) 14%, var(--border));
}

.provider-intel-discovery-hero-titles {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.provider-intel-discovery-hero-eyebrow {
  margin: 0;
  font-size: 11px;
  font-weight: 650;
  letter-spacing: 0.01em;
  color: var(--muted);
}

.provider-intel-discovery-hero-title {
  margin: 0;
  font-size: 15px;
  font-weight: 850;
  line-height: 1.25;
  letter-spacing: -0.02em;
  color: var(--foreground);
}

.provider-intel-discovery-hero-context {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.provider-intel-discovery-hero-commercial {
  margin: 0;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.35;
  color: var(--foreground);
}

.provider-intel-discovery-hero-readiness--strong {
  color: color-mix(in srgb, #16a34a 88%, var(--foreground));
}

.provider-intel-discovery-hero-readiness--building {
  color: color-mix(in srgb, #d97706 88%, var(--foreground));
}

.provider-intel-discovery-hero-readiness--limited {
  color: color-mix(in srgb, #dc2626 78%, var(--foreground));
}

.provider-intel-discovery-hero-meta {
  margin: 0;
  font-size: 12px;
  font-weight: 650;
  line-height: 1.45;
  color: var(--muted);
}

.provider-intel-discovery-hero-meta-item {
  color: color-mix(in srgb, var(--foreground) 72%, var(--muted));
}

.provider-intel-discovery-hero-meta-item--confidence {
  font-weight: 750;
  color: var(--foreground);
}

.provider-intel-discovery-hero-meta-sep {
  margin: 0 6px;
  opacity: 0.45;
}

.provider-intel-discovery-priority-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.provider-intel-discovery-priority {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 7px 9px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
  background: color-mix(in srgb, var(--surface) 92%, var(--background));
}

.provider-intel-discovery-priority-main {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  min-width: 0;
}

.provider-intel-discovery-priority-rank {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 850;
  line-height: 1;
  color: var(--surface);
  background: var(--brand-600);
  box-shadow: 0 2px 6px color-mix(in srgb, var(--brand-600) 35%, transparent);
}

.provider-intel-discovery-priority-body {
  flex: 1;
  min-width: 0;
}

.provider-intel-discovery-priority-headline {
  margin: 0 0 4px;
  font-size: 13px;
  font-weight: 800;
  line-height: 1.3;
  color: var(--foreground);
}

.provider-intel-discovery-priority-narrative {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.provider-intel-discovery-priority-narrative-row {
  display: grid;
  grid-template-columns: 4.5rem minmax(0, 1fr);
  gap: 6px 8px;
  align-items: start;
}

.provider-intel-discovery-priority-narrative dt {
  margin: 0;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.01em;
  color: var(--muted);
}

.provider-intel-discovery-priority-narrative dd {
  margin: 0;
  font-size: 12px;
  font-weight: 550;
  line-height: 1.4;
  color: color-mix(in srgb, var(--foreground) 88%, var(--muted));
}

.provider-intel-discovery-priority-capture {
  align-self: stretch;
  min-height: 32px;
  padding: 6px 10px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--brand-600) 35%, var(--border));
  background: var(--brand-600);
  color: var(--surface);
  font-family: inherit;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.provider-intel-discovery-priority-capture:hover {
  background: color-mix(in srgb, var(--brand-600) 88%, var(--foreground));
}

.provider-intel-discovery-priority-capture:active {
  transform: translateY(1px);
}

.provider-intel-discovery-hero-empty {
  margin: 0;
  padding: 10px 12px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 650;
  line-height: 1.4;
  color: var(--muted);
  background: color-mix(in srgb, var(--foreground) 4%, var(--surface));
}

/* Intelligence collection queue — tactical deployment rows */
.provider-intel-exec-queue {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.provider-intel-exec-queue-head {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 6px 12px;
}

.provider-intel-exec-queue-eyebrow {
  margin: 0;
  font-size: 10px;
  font-weight: 750;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--brand-600) 72%, var(--muted));
}

.provider-intel-exec-queue-title {
  margin: 2px 0 0;
  font-size: 15px;
  font-weight: 850;
  letter-spacing: -0.02em;
  line-height: 1.2;
}

.provider-intel-exec-queue-stage {
  margin: 0;
  font-size: 11px;
  font-weight: 600;
  color: color-mix(in srgb, var(--foreground) 52%, transparent);
  max-width: 22rem;
  text-align: right;
}

.provider-intel-exec-queue-columns {
  display: none;
  grid-template-columns:
    28px minmax(120px, 1.1fr) minmax(72px, 0.65fr) minmax(0, 1fr) minmax(0, 0.95fr)
    minmax(0, 0.95fr) minmax(0, 0.85fr) minmax(0, 0.9fr) auto;
  gap: 6px 10px;
  padding: 0 0 4px;
  font-size: 9px;
  font-weight: 750;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--foreground) 42%, transparent);
}

.provider-intel-exec-queue-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0;
}

.provider-intel-exec-queue-item {
  border-bottom: 1px solid color-mix(in srgb, var(--foreground) 5%, transparent);
}

.provider-intel-exec-queue-item:last-child {
  border-bottom: none;
}

.provider-intel-exec-queue-row {
  padding: 8px 0;
}

.provider-intel-exec-queue-row--critical {
  background: color-mix(in srgb, #dc2626 4%, transparent);
}

.provider-intel-exec-queue-row--high {
  background: color-mix(in srgb, #d97706 3%, transparent);
}

.provider-intel-exec-queue-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px 10px;
  align-items: start;
}

.provider-intel-exec-queue-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.provider-intel-exec-queue-cell--mission {
  gap: 3px;
}

.provider-intel-exec-queue-cell--rank {
  flex-direction: row;
  align-items: center;
  gap: 8px;
}

.provider-intel-exec-queue-rank {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 5px;
  font-size: 10px;
  font-weight: 850;
  color: var(--brand-700, var(--brand-600));
  background: color-mix(in srgb, var(--brand-600) 12%, var(--surface));
}

.provider-intel-exec-queue-mission {
  margin: 0;
  font-size: 13px;
  font-weight: 850;
  line-height: 1.25;
}

.provider-intel-exec-queue-mission-scan {
  margin: 0;
  font-size: 10px;
  font-weight: 600;
  line-height: 1.35;
  color: color-mix(in srgb, var(--foreground) 55%, transparent);
}

.provider-intel-exec-queue-kicker {
  font-size: 9px;
  font-weight: 750;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--foreground) 44%, transparent);
}

.provider-intel-exec-queue-leverage {
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
  flex-wrap: wrap;
}

.provider-intel-exec-queue-leverage-score {
  font-size: 18px;
  font-weight: 900;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.provider-intel-exec-queue-leverage-tier {
  font-size: 10px;
  font-weight: 750;
  letter-spacing: 0.02em;
}

.provider-intel-exec-queue-leverage--deploy .provider-intel-exec-queue-leverage-score {
  color: #b91c1c;
}

.provider-intel-exec-queue-leverage--high .provider-intel-exec-queue-leverage-score {
  color: var(--brand-700, var(--brand-600));
}

.provider-intel-exec-queue-leverage--next .provider-intel-exec-queue-leverage-score {
  color: #92400e;
}

.provider-intel-exec-queue-leverage--backlog .provider-intel-exec-queue-leverage-score {
  color: color-mix(in srgb, var(--foreground) 50%, transparent);
}

.provider-intel-exec-queue-value {
  font-size: 11px;
  font-weight: 600;
  line-height: 1.35;
  color: color-mix(in srgb, var(--foreground) 80%, transparent);
}

.provider-intel-exec-queue-value--unlock {
  font-weight: 650;
  color: color-mix(in srgb, var(--brand-700, var(--brand-600)) 72%, var(--foreground));
}

.provider-intel-exec-queue-value--timing {
  font-weight: 700;
  color: color-mix(in srgb, var(--foreground) 72%, transparent);
}

.provider-intel-exec-queue-value--gain {
  font-weight: 750;
  color: var(--brand-700, var(--brand-600));
}

.provider-intel-exec-queue-deploy {
  min-height: 30px;
  padding: 5px 12px;
  border-radius: 5px;
  border: 1px solid color-mix(in srgb, var(--brand-600) 40%, var(--border));
  background: var(--brand-600);
  color: var(--surface);
  font-family: inherit;
  font-size: 11px;
  font-weight: 800;
  line-height: 1.2;
  cursor: pointer;
  white-space: nowrap;
}

.provider-intel-exec-queue-deploy:hover {
  background: color-mix(in srgb, var(--brand-600) 88%, var(--foreground));
}

.provider-intel-exec-queue-empty {
  margin: 0;
  font-size: 12px;
  color: var(--muted);
}

@media (min-width: 900px) {
  .provider-intel-exec-queue-columns {
    display: grid;
  }

  .provider-intel-exec-queue-grid {
    grid-template-columns:
      28px minmax(120px, 1.1fr) minmax(72px, 0.65fr) minmax(0, 1fr) minmax(0, 0.95fr)
      minmax(0, 0.95fr) minmax(0, 0.85fr) minmax(0, 0.9fr) auto;
    align-items: center;
  }

  .provider-intel-exec-queue-cell--rank {
    flex-direction: column;
  }

  .provider-intel-exec-queue-mission-scan {
    display: none;
  }

  .provider-intel-exec-queue-cell .provider-intel-exec-queue-kicker {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
}

/* Legacy field missions cards (retained for other surfaces) */
.provider-intel-discovery-hero--missions .provider-intel-discovery-hero-eyebrow {
  margin: 0;
  font-size: 11px;
  font-weight: 650;
  letter-spacing: 0.01em;
  color: color-mix(in srgb, var(--brand-600) 70%, var(--muted));
}

.provider-intel-mission-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.provider-intel-mission-card {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 5px 6px 4px;
  border-radius: 6px;
  border: none;
  background: color-mix(in srgb, var(--foreground) 3%, var(--surface, #fff));
  border-left: 2px solid color-mix(in srgb, var(--brand-600) 35%, transparent);
}

.provider-intel-mission-impact-scan {
  padding: 0 0 0 26px;
}

.provider-intel-mission-impact-scan .provider-intel-scan-tags {
  gap: 2px 3px;
}

.provider-intel-mission-card--critical {
  border-left: 3px solid color-mix(in srgb, #dc2626 70%, transparent);
  background: color-mix(in srgb, #dc2626 5%, var(--surface, #fff));
}

.provider-intel-mission-card--high {
  border-left: 3px solid color-mix(in srgb, #d97706 65%, transparent);
  background: color-mix(in srgb, #d97706 5%, var(--surface, #fff));
}

.provider-intel-mission-card--medium {
  border-left: 3px solid color-mix(in srgb, #b45309 45%, transparent);
  background: color-mix(in srgb, var(--foreground) 3%, var(--surface, #fff));
}

.provider-intel-mission-card--supporting {
  border-left: none;
  padding-left: 9px;
}

.provider-intel-mission-card-top {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 6px 8px;
  align-items: start;
}

.provider-intel-mission-rank {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 5px;
  font-size: 10px;
  font-weight: 850;
  line-height: 1;
  color: var(--brand-700, var(--brand-600));
  background: color-mix(in srgb, var(--brand-600) 14%, var(--surface));
  flex-shrink: 0;
}

.provider-intel-mission-card-title-block {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.provider-intel-mission-title {
  margin: 0;
  font-size: 13px;
  font-weight: 850;
  line-height: 1.25;
  letter-spacing: -0.01em;
  color: var(--foreground);
}

.provider-intel-mission-urgency {
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--muted);
}

.provider-intel-mission-urgency--critical {
  color: #b91c1c;
}

.provider-intel-mission-urgency--high {
  color: var(--brand-700, var(--brand-600));
}

.provider-intel-mission-urgency--medium {
  color: #92400e;
}

.provider-intel-mission-cta {
  align-self: start;
  min-height: 28px;
  padding: 4px 8px;
  border-radius: 6px;
  border: 1px solid color-mix(in srgb, var(--brand-600) 35%, var(--border));
  background: var(--brand-600);
  color: var(--surface);
  font-family: inherit;
  font-size: 10px;
  font-weight: 800;
  line-height: 1.2;
  cursor: pointer;
  white-space: nowrap;
}

.provider-intel-mission-cta:hover {
  background: color-mix(in srgb, var(--brand-600) 88%, var(--foreground));
}

.provider-intel-mission-brief {
  display: grid;
  grid-template-columns: 1fr;
  gap: 3px 8px;
  margin: 0;
  padding-top: 3px;
  border-top: 1px solid color-mix(in srgb, var(--foreground) 5%, transparent);
}

.provider-intel-mission-brief--scan {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 2px 10px;
  padding-top: 2px;
  border-top: none;
}

@media (min-width: 640px) {
  .provider-intel-mission-brief {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .provider-intel-mission-brief-row--gain {
    grid-column: 1 / -1;
  }
}

.provider-intel-mission-brief-row {
  display: grid;
  grid-template-columns: minmax(5.5rem, 7rem) minmax(0, 1fr);
  gap: 4px 8px;
  align-items: start;
  margin: 0;
}

.provider-intel-mission-brief-row dt {
  margin: 0;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.01em;
  color: var(--muted);
}

.provider-intel-mission-brief-row dd {
  margin: 0;
  font-size: 11px;
  font-weight: 600;
  line-height: 1.35;
  color: color-mix(in srgb, var(--foreground) 86%, var(--muted));
}

.provider-intel-mission-brief-row--gain dd {
  font-weight: 750;
  color: var(--brand-700, var(--brand-600));
}

@media (min-width: 720px) {
  .provider-intel-discovery-priority {
    flex-direction: row;
    align-items: flex-end;
    gap: 12px;
  }

  .provider-intel-discovery-priority-main {
    flex: 1;
  }

  .provider-intel-discovery-priority-capture {
    align-self: flex-end;
    flex: 0 0 auto;
    min-width: 10rem;
  }
}

/* Unified operational readiness framework */
.provider-ops-readiness-framework {
  margin: 0 0 8px;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 3%, var(--surface));
}

.provider-ops-readiness-framework-head {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 8px;
}

@media (min-width: 900px) {
  .provider-ops-readiness-framework-head {
    flex-direction: row;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
  }
}

.provider-ops-readiness-framework-title {
  margin: 0;
  font-size: 12px;
  font-weight: 750;
  letter-spacing: -0.01em;
  color: var(--foreground);
}

.provider-ops-readiness-framework-kicker {
  margin: 2px 0 0;
  font-size: 10px;
  line-height: 1.35;
  font-weight: 600;
  color: var(--muted);
  max-width: 42rem;
}

.provider-ops-readiness-verdict {
  padding: 8px 10px;
  border-radius: 7px;
  border: 1px solid color-mix(in srgb, var(--foreground) 12%, var(--border));
  background: color-mix(in srgb, var(--foreground) 3%, var(--surface));
  max-width: 22rem;
}

.provider-ops-readiness-verdict--not_viable_yet {
  border-color: color-mix(in srgb, #b91c1c 30%, var(--border));
  background: color-mix(in srgb, #b91c1c 5%, var(--surface));
}

.provider-ops-readiness-verdict--observation_possible_with_risk {
  border-color: color-mix(in srgb, #d97706 30%, var(--border));
  background: color-mix(in srgb, #d97706 5%, var(--surface));
}

.provider-ops-readiness-verdict--operationally_qualified {
  border-color: color-mix(in srgb, var(--brand-600) 24%, var(--border));
}

.provider-ops-readiness-verdict--evaluation_ready,
.provider-ops-readiness-verdict--commercial_expansion_candidate {
  border-color: color-mix(in srgb, #15803d 28%, var(--border));
  background: color-mix(in srgb, #15803d 4%, var(--surface));
}

.provider-ops-readiness-verdict-label {
  display: block;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--foreground);
}

.provider-ops-readiness-verdict-scan {
  margin: 4px 0 0;
  font-size: 10px;
  line-height: 1.4;
  color: var(--muted);
}

.provider-ops-readiness-verdict-next {
  margin: 4px 0 0;
  font-size: 9px;
  font-weight: 700;
  color: color-mix(in srgb, var(--brand-700) 70%, var(--foreground));
}

.provider-ops-readiness-framework-guidance {
  margin: 0;
  font-size: 10px;
  line-height: 1.4;
  font-weight: 700;
  color: color-mix(in srgb, var(--brand-700) 75%, var(--foreground));
  max-width: 22rem;
}

.provider-ops-readiness-protect {
  margin: 0 0 8px;
  padding: 8px 10px;
  border-radius: 7px;
  border: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));
  background: color-mix(in srgb, var(--foreground) 3%, var(--surface));
}

.provider-ops-readiness-protect--protect_field_time,
.provider-ops-readiness-protect--hold_field_time {
  border-color: color-mix(in srgb, #b91c1c 28%, var(--border));
  background: color-mix(in srgb, #b91c1c 5%, var(--surface));
}

.provider-ops-readiness-protect--validate_before_travel {
  border-color: color-mix(in srgb, #d97706 28%, var(--border));
  background: color-mix(in srgb, #d97706 5%, var(--surface));
}

.provider-ops-readiness-protect--clear_to_deploy {
  border-color: color-mix(in srgb, #047857 24%, var(--border));
  background: color-mix(in srgb, #047857 4%, var(--surface));
}

.provider-ops-readiness-protect-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.provider-ops-readiness-protect-title {
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: color-mix(in srgb, #0f4c5c 55%, var(--muted));
}

.provider-ops-readiness-protect-score {
  font-size: 10px;
  font-weight: 800;
  color: var(--foreground);
}

.provider-ops-readiness-protect-posture {
  margin: 4px 0 6px;
  font-size: 11px;
  font-weight: 700;
  line-height: 1.35;
  color: var(--foreground);
}

.provider-ops-readiness-protect-dims {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.provider-ops-readiness-protect-dim {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 6px;
  border-radius: 999px;
  font-size: 9px;
  font-weight: 700;
  border: 1px solid color-mix(in srgb, var(--foreground) 12%, var(--border));
  background: var(--surface);
}

.provider-ops-readiness-protect-dim--critical,
.provider-ops-readiness-protect-dim--high {
  border-color: color-mix(in srgb, #b91c1c 30%, var(--border));
  color: #991b1b;
}

.provider-ops-readiness-protect-dim--elevated {
  border-color: color-mix(in srgb, #d97706 30%, var(--border));
  color: #b45309;
}

.provider-ops-readiness-protect-dim-level {
  font-weight: 800;
  opacity: 0.85;
}

.provider-ops-readiness-protect-deploy {
  margin: 6px 0 0;
  font-size: 10px;
  line-height: 1.4;
  font-weight: 600;
  color: var(--muted);
}

.provider-ops-readiness-motion-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 6px;
}

@media (min-width: 720px) {
  .provider-ops-readiness-motion-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

.provider-ops-readiness-motion {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 7px 8px;
  border-radius: 7px;
  border: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));
  background: var(--surface);
  min-height: 0;
}

.provider-ops-readiness-motion--primary {
  border-color: color-mix(in srgb, var(--brand-600) 28%, var(--border));
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--brand-600) 8%, transparent);
}

.provider-ops-readiness-motion--tone-success {
  border-color: color-mix(in srgb, #15803d 24%, var(--border));
}

.provider-ops-readiness-motion--tone-blocked {
  border-color: color-mix(in srgb, #b91c1c 22%, var(--border));
}

.provider-ops-readiness-motion-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 6px;
}

.provider-ops-readiness-motion-title {
  margin: 0;
  font-size: 10px;
  font-weight: 800;
  color: var(--foreground);
}

.provider-ops-readiness-motion-verdict {
  flex-shrink: 0;
  max-width: 55%;
  font-size: 8px;
  font-weight: 800;
  line-height: 1.2;
  padding: 2px 5px;
  border-radius: 999px;
  text-align: right;
  color: var(--muted);
  background: color-mix(in srgb, var(--foreground) 6%, var(--surface));
}

.provider-ops-readiness-motion-verdict--ready {
  color: #15803d;
  background: color-mix(in srgb, #15803d 12%, var(--surface));
}

.provider-ops-readiness-motion-verdict--approaching {
  color: #b45309;
  background: color-mix(in srgb, #b45309 12%, var(--surface));
}

.provider-ops-readiness-motion-verdict--blocked {
  color: #b91c1c;
  background: color-mix(in srgb, #b91c1c 10%, var(--surface));
}

.provider-ops-readiness-motion-headline {
  margin: 0;
  font-size: 10px;
  line-height: 1.35;
  font-weight: 650;
  color: var(--foreground);
}

.provider-ops-readiness-motion-blockers {
  margin: 0;
  padding: 0 0 0 14px;
  font-size: 9px;
  line-height: 1.35;
  font-weight: 600;
  color: var(--muted);
}

.provider-ops-readiness-motion-link {
  align-self: flex-start;
  margin-top: 2px;
  padding: 0;
  border: none;
  background: none;
  font-size: 9px;
  font-weight: 750;
  color: var(--brand-600);
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.provider-ops-readiness-pillars-details {
  margin-top: 8px;
}

.provider-ops-readiness-pillars-summary {
  font-size: 10px;
  font-weight: 750;
  color: var(--muted);
  cursor: pointer;
  list-style: none;
}

.provider-ops-readiness-pillars-summary::-webkit-details-marker {
  display: none;
}

.provider-ops-readiness-pillar-list {
  margin: 6px 0 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 4px;
}

@media (min-width: 900px) {
  .provider-ops-readiness-pillar-list {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.provider-ops-readiness-pillar {
  padding: 5px 6px;
  border-radius: 6px;
  border: 1px dashed color-mix(in srgb, var(--foreground) 12%, var(--border));
  background: color-mix(in srgb, var(--foreground) 1.5%, var(--surface));
}

.provider-ops-readiness-pillar--validated {
  border-style: solid;
  border-color: color-mix(in srgb, #15803d 20%, var(--border));
}

.provider-ops-readiness-pillar--blocked {
  border-style: solid;
  border-color: color-mix(in srgb, #b91c1c 18%, var(--border));
}

.provider-ops-readiness-pillar-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 6px;
}

.provider-ops-readiness-pillar-label {
  font-size: 9px;
  font-weight: 800;
  color: var(--foreground);
}

.provider-ops-readiness-pillar-posture {
  font-size: 8px;
  font-weight: 750;
  color: var(--muted);
  text-align: right;
}

.provider-ops-readiness-pillar-posture--validated {
  color: #15803d;
}

.provider-ops-readiness-pillar-posture--blocked {
  color: #b91c1c;
}

.provider-ops-readiness-pillar-scan {
  margin: 2px 0 0;
  font-size: 9px;
  line-height: 1.35;
  font-weight: 600;
  color: var(--muted);
}

/* Workspace confidence strip — secondary to discovery hero */
.provider-intel-ws-summary {
  margin: 0;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));
  background: color-mix(in srgb, var(--foreground) 2%, var(--surface));
  box-shadow: none;
}

.provider-intel-ws-summary--confidence .provider-intel-ws-summary-head--compact {
  margin-bottom: 6px;
}

.provider-intel-ws-summary-head--compact {
  margin-bottom: 4px;
}

.provider-intel-ws-summary-section-title {
  margin: 0;
  width: 100%;
  font-size: 12px;
  font-weight: 750;
  letter-spacing: -0.01em;
  color: color-mix(in srgb, var(--foreground) 78%, var(--muted));
}

.provider-intel-ws-summary-head {
  margin-bottom: 8px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 8px;
}

.provider-intel-ws-summary-commercial {
  margin: 0;
  width: 100%;
  font-size: 15px;
  font-weight: 800;
  line-height: 1.3;
  letter-spacing: -0.02em;
  color: var(--foreground);
}

.provider-intel-ws-summary-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  width: 100%;
}

.provider-intel-ws-summary-discovery {
  padding-top: 10px;
  border-top: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
}

.provider-intel-ws-summary-gaps {
  margin-top: 4px;
  padding-top: 6px;
  border-top: 1px solid color-mix(in srgb, var(--foreground) 7%, var(--border));
}

@media (min-width: 720px) {
  .provider-intel-ws-summary--confidence .provider-intel-ws-summary-head {
    margin-bottom: 4px;
  }
}

.provider-intel-capture-actions {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 6px;
}

.provider-intel-capture-action {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
  min-height: 34px;
  padding: 6px 10px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--brand-600) 22%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 6%, var(--surface));
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.provider-intel-capture-action:active {
  background: color-mix(in srgb, var(--brand-600) 12%, var(--surface));
}

.provider-intel-capture-action-body {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  min-width: 0;
}

.provider-intel-capture-action-label {
  font-size: 13px;
  font-weight: 750;
  line-height: 1.25;
  color: var(--foreground);
  min-width: 0;
}

.provider-intel-capture-action-chevron {
  flex-shrink: 0;
  font-size: 16px;
  font-weight: 800;
  color: var(--brand-700, var(--brand-600));
}

.provider-intel-capture-action--quick {
  border-color: color-mix(in srgb, var(--brand-600) 28%, var(--border));
}

.provider-intel-briefing-status-row {
  display: flex;
  flex-wrap: wrap;
  gap: 3px;
  width: 100%;
}

.provider-intel-briefing-chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 3px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.provider-intel-briefing-chip-row--inline {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 3px;
  vertical-align: middle;
}

.provider-intel-briefing-chip {
  display: inline-flex;
  align-items: center;
  max-width: 100%;
  padding: 2px 6px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));
  background: var(--surface);
  font-size: 10px;
  font-weight: 700;
  line-height: 1.25;
  color: var(--foreground);
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
}

button.provider-intel-briefing-chip {
  cursor: pointer;
}

button.provider-intel-briefing-chip:hover {
  border-color: color-mix(in srgb, var(--brand-600) 28%, var(--border));
  color: var(--brand-700, var(--brand-600));
}

.provider-intel-briefing-chip--read {
  border-color: color-mix(in srgb, var(--brand-600) 20%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 6%, var(--surface));
}

.provider-intel-briefing-chip--stage {
  color: var(--brand-700, var(--brand-600));
  background: color-mix(in srgb, var(--brand-600) 10%, var(--surface));
}

.provider-intel-briefing-chip--maturity {
  font-weight: 800;
  color: var(--brand-700, var(--brand-600));
  background: color-mix(in srgb, var(--brand-600) 14%, var(--surface));
  border-color: color-mix(in srgb, var(--brand-600) 28%, var(--border));
}

.provider-intel-maturity-progress {
  margin-top: 2px;
  padding: 6px 8px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
  background: color-mix(in srgb, var(--foreground) 3%, var(--surface));
}

.provider-intel-maturity-progress-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 6px;
}

.provider-intel-maturity-progress-label {
  font-size: 11px;
  font-weight: 750;
  color: var(--foreground);
}

.provider-intel-maturity-progress-pct {
  font-size: 11px;
  font-weight: 800;
  color: var(--brand-600);
}

.provider-intel-maturity-progress-track {
  height: 6px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--foreground) 8%, var(--border));
  overflow: hidden;
  margin-bottom: 8px;
}

.provider-intel-maturity-progress-fill {
  display: block;
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(
    90deg,
    var(--brand-600),
    color-mix(in srgb, var(--brand-600) 70%, #16a34a)
  );
  transition: width 0.25s ease;
}

.provider-intel-maturity-criteria {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.provider-intel-maturity-criterion {
  font-size: 11px;
  font-weight: 600;
  line-height: 1.35;
  color: var(--muted);
}

.provider-intel-maturity-criterion--met {
  color: color-mix(in srgb, #15803d 88%, var(--foreground));
}

.provider-intel-briefing-chip--confidence {
  color: var(--muted);
}

.provider-intel-briefing-chip--signal,
.provider-intel-briefing-chip--trust-emerging {
  background: color-mix(in srgb, #f59e0b 10%, var(--surface));
  border-color: color-mix(in srgb, #f59e0b 24%, var(--border));
  color: #92400e;
}

.provider-intel-briefing-chip--trust-validated {
  background: color-mix(in srgb, #16a34a 10%, var(--surface));
  border-color: color-mix(in srgb, #16a34a 24%, var(--border));
  color: #166534;
  font-weight: 800;
}

.provider-intel-briefing-chip--gap,
.provider-intel-briefing-chip--trust-unknown {
  border-color: color-mix(in srgb, var(--foreground) 14%, var(--border));
  color: var(--muted);
  background: color-mix(in srgb, var(--foreground) 3%, var(--surface));
  border-style: dashed;
}

.provider-intel-briefing-chip--partial {
  border-style: dashed;
}

.provider-intel-briefing-chip--action {
  border-color: color-mix(in srgb, var(--brand-600) 24%, var(--border));
  font-weight: 750;
}

.provider-intel-briefing-chip--muted {
  color: var(--muted);
  background: color-mix(in srgb, var(--muted) 6%, var(--surface));
}

.provider-intel-ws-summary-detail {
  margin: 0;
  width: 100%;
  font-size: 11px;
  line-height: 1.4;
  color: var(--muted);
  font-weight: 600;
}

.provider-intel-ws-summary-expand-btn--inline {
  margin-top: 0;
}

.provider-intel-ws-summary-readiness-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: currentColor;
  flex-shrink: 0;
}

.provider-intel-ws-summary-readiness--strong {
  color: #15803d;
}

.provider-intel-ws-summary-readiness--building {
  color: color-mix(in srgb, #b45309 90%, var(--foreground));
}

.provider-intel-ws-summary-readiness--limited {
  color: var(--muted);
}

.provider-intel-ws-summary-cards {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 5px;
  margin-bottom: 0;
}

.provider-intel-ws-summary-cards--console {
  gap: 6px;
}

@media (min-width: 640px) {
  .provider-intel-ws-summary-cards--console {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (min-width: 1100px) {
  .provider-intel-ws-summary-cards--console {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

@media (min-width: 720px) {
  .provider-intel-ws-summary-cards:not(.provider-intel-ws-summary-cards--console) {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

/* Area confidence console cards */
.provider-intel-area-confidence {
  display: flex;
  flex-direction: column;
  gap: 5px;
  min-height: 0;
  padding: 7px 8px 6px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));
  background: var(--surface);
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.provider-intel-area-confidence:hover {
  border-color: color-mix(in srgb, var(--brand-600) 18%, var(--border));
}

.provider-intel-area-confidence--low {
  border-color: color-mix(in srgb, var(--muted) 28%, var(--border));
}

.provider-intel-area-confidence--partial {
  border-color: color-mix(in srgb, #b45309 22%, var(--border));
}

.provider-intel-area-confidence--strong {
  border-color: color-mix(in srgb, var(--brand-600) 20%, var(--border));
}

.provider-intel-area-confidence--validated {
  border-color: color-mix(in srgb, #15803d 22%, var(--border));
}

.provider-intel-area-confidence-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 6px;
}

.provider-intel-area-confidence-title {
  margin: 0;
  font-size: 10px;
  font-weight: 850;
  line-height: 1.2;
  letter-spacing: 0.02em;
  color: var(--foreground);
}

.provider-intel-area-confidence-state {
  flex-shrink: 0;
  max-width: 52%;
  font-size: 9px;
  font-weight: 800;
  line-height: 1.2;
  padding: 2px 5px;
  border-radius: 999px;
  text-align: right;
  background: color-mix(in srgb, var(--muted) 10%, var(--surface));
  color: var(--muted);
}

.provider-intel-area-confidence-state--partial {
  background: color-mix(in srgb, #b45309 12%, var(--surface));
  color: #92400e;
}

.provider-intel-area-confidence-state--strong {
  background: color-mix(in srgb, var(--brand-600) 12%, var(--surface));
  color: var(--brand-700, var(--brand-600));
}

.provider-intel-area-confidence-state--validated {
  background: color-mix(in srgb, #15803d 12%, var(--surface));
  color: #15803d;
}

.provider-intel-area-confidence-summary {
  margin: 0;
  font-size: 11px;
  font-weight: 600;
  line-height: 1.35;
  color: color-mix(in srgb, var(--foreground) 82%, var(--muted));
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.provider-intel-area-confidence-metrics {
  display: flex;
  gap: 10px;
  margin: 0;
}

.provider-intel-area-confidence-metric {
  display: flex;
  align-items: baseline;
  gap: 4px;
  min-width: 0;
}

.provider-intel-area-confidence-metric dt {
  margin: 0;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.01em;
  color: var(--muted);
}

.provider-intel-area-confidence-metric dd {
  margin: 0;
  font-size: 12px;
  font-weight: 850;
  line-height: 1;
  color: var(--foreground);
  font-variant-numeric: tabular-nums;
}

.provider-intel-area-confidence-metric-value--warn {
  color: #b45309;
}

.provider-intel-area-confidence-metric-value--ok {
  color: #15803d;
}

.provider-intel-area-confidence-metric-value--emerging {
  color: #b45309;
}

/* Relationship operational maturity indicators */
.provider-intel-rel-maturity {
  margin: 8px 0 10px;
  padding: 8px 9px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));
  background: color-mix(in srgb, var(--foreground) 2%, var(--surface));
}

.provider-intel-rel-maturity--compact {
  margin: 6px 0 8px;
  padding: 6px 8px;
}

.provider-intel-rel-maturity-head {
  display: grid;
  gap: 3px;
  margin-bottom: 6px;
}

.provider-intel-rel-maturity-kicker {
  margin: 0;
  font-size: 10px;
  font-weight: 650;
  line-height: 1.35;
  color: var(--muted);
}

.provider-intel-rel-maturity-headline {
  margin: 0;
  font-size: 11px;
  font-weight: 750;
  line-height: 1.4;
  color: var(--foreground);
}

.provider-intel-rel-maturity-headline--success {
  color: color-mix(in srgb, #166534 88%, var(--foreground));
}

.provider-intel-rel-maturity-headline--warn {
  color: #92400e;
}

.provider-intel-rel-maturity-headline--blocked {
  color: #b45309;
}

.provider-intel-rel-maturity-meta {
  margin: 0;
  font-size: 9px;
  font-weight: 650;
  color: var(--muted);
}

.provider-intel-rel-maturity-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 4px;
}

.provider-intel-rel-maturity-item {
  border-radius: 6px;
  border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
  overflow: hidden;
}

.provider-intel-rel-maturity-item--positive {
  border-color: color-mix(in srgb, #16a34a 20%, var(--border));
  background: color-mix(in srgb, #16a34a 4%, var(--surface));
}

.provider-intel-rel-maturity-item--caution {
  border-color: color-mix(in srgb, #f59e0b 20%, var(--border));
  background: color-mix(in srgb, #f59e0b 4%, var(--surface));
}

.provider-intel-rel-maturity-item--restrictive {
  border-color: color-mix(in srgb, #dc2626 18%, var(--border));
  background: color-mix(in srgb, #dc2626 4%, var(--surface));
}

.provider-intel-rel-maturity-item--unknown {
  border-style: dashed;
  opacity: 0.92;
}

.provider-intel-rel-maturity-btn {
  display: grid;
  gap: 2px;
  width: 100%;
  padding: 5px 7px;
  border: none;
  background: transparent;
  text-align: left;
  cursor: pointer;
  font-family: inherit;
}

.provider-intel-rel-maturity-btn:hover {
  background: color-mix(in srgb, var(--brand-600) 6%, var(--surface));
}

.provider-intel-rel-maturity-label {
  font-size: 10px;
  font-weight: 750;
  color: color-mix(in srgb, var(--foreground) 75%, var(--muted));
}

.provider-intel-rel-maturity-scan {
  font-size: 10px;
  font-weight: 650;
  line-height: 1.35;
  color: var(--foreground);
}

.provider-intel-area-confidence-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 1px;
}

.provider-intel-area-confidence-cta {
  flex: 1;
  min-width: 0;
  min-height: 28px;
  padding: 4px 8px;
  border-radius: 6px;
  border: 1px solid color-mix(in srgb, var(--brand-600) 38%, var(--border));
  background: var(--brand-600);
  color: var(--surface);
  font-family: inherit;
  font-size: 11px;
  font-weight: 800;
  line-height: 1.2;
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.provider-intel-area-confidence-cta:hover:not(:disabled) {
  background: color-mix(in srgb, var(--brand-600) 88%, var(--foreground));
}

.provider-intel-area-confidence-cta:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.provider-intel-area-confidence--validated .provider-intel-area-confidence-cta,
.provider-intel-area-confidence--strong .provider-intel-area-confidence-cta {
  background: color-mix(in srgb, var(--brand-600) 8%, var(--surface));
  color: var(--brand-700, var(--brand-600));
  border-color: color-mix(in srgb, var(--brand-600) 28%, var(--border));
}

.provider-intel-area-confidence-menu {
  position: relative;
  flex-shrink: 0;
}

.provider-intel-area-confidence-menu-trigger {
  list-style: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  min-height: 28px;
  border-radius: 6px;
  border: 1px solid color-mix(in srgb, var(--foreground) 12%, var(--border));
  background: var(--surface);
  font-size: 14px;
  font-weight: 900;
  line-height: 1;
  color: var(--muted);
  cursor: pointer;
  user-select: none;
}

.provider-intel-area-confidence-menu-trigger::-webkit-details-marker {
  display: none;
}

.provider-intel-area-confidence-menu[open] .provider-intel-area-confidence-menu-trigger,
.provider-intel-area-confidence-menu-trigger:hover {
  border-color: color-mix(in srgb, var(--brand-600) 24%, var(--border));
  color: var(--brand-700, var(--brand-600));
}

.provider-intel-area-confidence-menu-list {
  position: absolute;
  right: 0;
  top: calc(100% + 3px);
  z-index: 12;
  list-style: none;
  margin: 0;
  padding: 4px;
  min-width: 10.5rem;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));
  background: var(--surface);
  box-shadow: 0 6px 18px color-mix(in srgb, var(--foreground) 12%, transparent);
}

.provider-intel-area-confidence-menu-item {
  display: block;
  width: 100%;
  padding: 5px 8px;
  border: none;
  border-radius: 5px;
  background: transparent;
  font-family: inherit;
  font-size: 11px;
  font-weight: 700;
  line-height: 1.25;
  text-align: left;
  color: var(--foreground);
  cursor: pointer;
}

.provider-intel-area-confidence-menu-item:hover:not(:disabled) {
  background: color-mix(in srgb, var(--brand-600) 8%, var(--surface));
  color: var(--brand-700, var(--brand-600));
}

.provider-intel-area-confidence-menu-item:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.provider-intel-area-confidence-detail {
  margin-top: 0;
}

.provider-intel-area-confidence-detail-trigger {
  list-style: none;
  font-size: 10px;
  font-weight: 750;
  color: var(--muted);
  cursor: pointer;
  user-select: none;
}

.provider-intel-area-confidence-detail-trigger::-webkit-details-marker {
  display: none;
}

.provider-intel-area-confidence:not(:hover):not(:focus-within) .provider-intel-area-confidence-detail:not([open]) {
  opacity: 0.72;
}

.provider-intel-area-confidence-detail[open] .provider-intel-area-confidence-detail-trigger,
.provider-intel-area-confidence-detail-trigger:hover {
  color: var(--brand-700, var(--brand-600));
}

.provider-intel-area-confidence-detail-body {
  margin-top: 4px;
  padding-top: 4px;
  border-top: 1px dashed color-mix(in srgb, var(--foreground) 10%, var(--border));
}

.provider-intel-area-confidence-detail-text {
  margin: 0 0 4px;
  font-size: 10px;
  font-weight: 600;
  line-height: 1.4;
  color: var(--muted);
}

.provider-intel-area-confidence-gap-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 2px;
}

.provider-intel-area-confidence-gap-btn {
  padding: 0;
  border: none;
  background: none;
  font: inherit;
  font-size: 10px;
  font-weight: 650;
  line-height: 1.35;
  color: color-mix(in srgb, var(--foreground) 78%, var(--muted));
  text-align: left;
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.provider-intel-area-confidence-gap-btn:hover {
  color: var(--brand-700, var(--brand-600));
}

.provider-intel-area-confidence-detail-empty {
  margin: 0;
  font-size: 10px;
  font-weight: 600;
  color: var(--muted);
}

.provider-intel-ws-summary-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 3px;
  padding: 7px 8px;
  min-height: 0;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));
  background: var(--surface);
  text-align: left;
}

.provider-intel-ws-summary-card--workspace {
  gap: 0;
  padding: 0;
  border: none;
  background: transparent;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--foreground) 10%, var(--border));
}

.provider-intel-ws-summary-card--workspace .provider-intel-card-layer--summary {
  padding: 7px 8px 5px;
}

.provider-intel-ws-summary-card--workspace .provider-intel-card-layer--actions {
  border-top-width: 1px;
}

.provider-intel-ws-summary-card-scan {
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 100%;
}

.provider-intel-ws-summary-card--workspace:hover {
  border-color: color-mix(in srgb, var(--brand-600) 20%, var(--border));
}

.provider-intel-ws-summary-card--low {
  border-color: color-mix(in srgb, var(--muted) 30%, var(--border));
}

.provider-intel-ws-summary-card--partial {
  border-color: color-mix(in srgb, #b45309 24%, var(--border));
}

.provider-intel-ws-summary-card--strong {
  border-color: color-mix(in srgb, var(--brand-600) 22%, var(--border));
}

.provider-intel-ws-summary-card--validated {
  border-color: color-mix(in srgb, #15803d 24%, var(--border));
}

.provider-intel-ws-summary-card-title {
  font-size: 10px;
  font-weight: 800;
  line-height: 1.2;
  color: var(--foreground);
}

.provider-intel-ws-summary-card-body {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: center;
  max-height: 2.5em;
  overflow: hidden;
}

.provider-intel-ws-summary-card-gap {
  font-size: 9px;
  font-weight: 650;
  line-height: 1.2;
  color: var(--muted);
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.provider-intel-ws-summary-card-gap--ok {
  color: #15803d;
}

.provider-intel-ws-summary-card-confidence {
  font-size: 9px;
  font-weight: 750;
  padding: 2px 5px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--muted) 10%, var(--surface));
  color: var(--muted);
}

.provider-intel-ws-summary-card-confidence--partial {
  background: color-mix(in srgb, #b45309 12%, var(--surface));
  color: #92400e;
}

.provider-intel-ws-summary-card-confidence--strong {
  background: color-mix(in srgb, var(--brand-600) 12%, var(--surface));
  color: var(--brand-700, var(--brand-600));
}

.provider-intel-ws-summary-card-confidence--validated {
  background: color-mix(in srgb, #15803d 12%, var(--surface));
  color: #15803d;
}

.provider-intel-ws-summary-columns {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
  padding-top: 10px;
  border-top: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
}

@media (min-width: 640px) {
  .provider-intel-ws-summary-columns {
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }
}

.provider-intel-ws-summary-col-title {
  margin: 0 0 4px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.01em;
  color: var(--muted);
}

.provider-intel-ws-summary-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.provider-intel-ws-summary-list li {
  margin: 0;
}

.provider-intel-ws-summary-list-btn {
  width: 100%;
  padding: 0;
  border: none;
  background: none;
  text-align: left;
  font-size: 11px;
  font-weight: 650;
  line-height: 1.35;
  color: var(--foreground);
  cursor: pointer;
}

.provider-intel-ws-summary-list-btn:hover {
  color: var(--brand-700, var(--brand-600));
  text-decoration: underline;
}

.provider-intel-ws-summary-list-btn--action {
  font-weight: 700;
}

.provider-intel-ws-summary-col-stage {
  display: inline-block;
  margin-left: 6px;
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: var(--brand-700);
  background: color-mix(in srgb, var(--brand-600) 12%, var(--surface));
  vertical-align: middle;
}

.provider-intel-ws-summary-expand-btn {
  margin-top: 6px;
  padding: 0;
  border: none;
  background: none;
  font-size: 11px;
  font-weight: 700;
  color: var(--brand-700);
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.provider-intel-ws-summary-expand-btn:hover {
  color: var(--brand-800);
}

.provider-intel-ws-summary-empty {
  margin: 0;
  font-size: 11px;
  color: var(--muted);
  line-height: 1.35;
}

/* Intelligence status cards — scan at a glance */
.provider-intel-status-cards {
  margin: 0 0 12px;
}

.provider-intel-status-cards-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

@media (min-width: 720px) {
  .provider-intel-status-cards-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

.provider-intel-status-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-height: 100%;
  padding: 10px 11px;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));
  background: var(--surface);
}

.provider-intel-status-card--low {
  border-color: color-mix(in srgb, var(--muted) 35%, var(--border));
  background: color-mix(in srgb, var(--muted) 4%, var(--surface));
}

.provider-intel-status-card--partial {
  border-color: color-mix(in srgb, #b45309 22%, var(--border));
  background: color-mix(in srgb, #b45309 3%, var(--surface));
}

.provider-intel-status-card--strong {
  border-color: color-mix(in srgb, var(--brand-600) 20%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 4%, var(--surface));
}

.provider-intel-status-card--validated {
  border-color: color-mix(in srgb, #15803d 22%, var(--border));
  background: color-mix(in srgb, #15803d 4%, var(--surface));
}

.provider-intel-status-card-head {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.provider-intel-status-card-title {
  margin: 0;
  font-size: 11px;
  font-weight: 800;
  line-height: 1.25;
  letter-spacing: 0.01em;
  color: var(--foreground);
}

.provider-intel-status-card-confidence {
  align-self: flex-start;
  font-size: 10px;
  font-weight: 750;
  line-height: 1.2;
  padding: 2px 6px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--muted) 12%, var(--surface));
  color: var(--muted);
}

.provider-intel-status-card-confidence--partial {
  background: color-mix(in srgb, #b45309 12%, var(--surface));
  color: color-mix(in srgb, #92400e 85%, var(--foreground));
}

.provider-intel-status-card-confidence--strong {
  background: color-mix(in srgb, var(--brand-600) 12%, var(--surface));
  color: var(--brand-700, var(--brand-600));
}

.provider-intel-status-card-confidence--validated {
  background: color-mix(in srgb, #15803d 12%, var(--surface));
  color: #15803d;
}

.provider-intel-status-card-interpretation {
  margin: 0;
  flex: 1;
  font-size: 11px;
  line-height: 1.4;
  font-weight: 550;
  color: var(--foreground);
}

.provider-intel-status-card-missing {
  margin: 0;
  font-size: 10px;
  line-height: 1.35;
  color: var(--muted);
}

.provider-intel-status-card-missing-label {
  display: block;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
  margin-bottom: 2px;
}

.provider-intel-status-card-cta {
  align-self: flex-start;
  margin-top: auto;
  padding: 5px 10px;
  font-size: 10px;
  font-weight: 750;
  border-radius: 6px;
  border: 1px solid color-mix(in srgb, var(--brand-600) 35%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 8%, var(--surface));
  color: var(--brand-700, var(--brand-600));
  cursor: pointer;
}

.provider-intel-status-card-cta:hover {
  background: color-mix(in srgb, var(--brand-600) 14%, var(--surface));
}

.provider-intel-status-card-cta--review {
  border-color: color-mix(in srgb, var(--foreground) 14%, var(--border));
  background: var(--surface);
  color: var(--foreground);
}

.provider-intel-status-card-cta--review:hover {
  background: color-mix(in srgb, var(--foreground) 4%, var(--surface));
}

.provider-intel-status-card--workspace,
.provider-intel-section-card--workspace {
  display: flex;
  flex-direction: column;
}

.provider-intel-section-card-head {
  display: block;
}

.provider-intel-section-card--workspace .provider-intel-section-card-trigger {
  width: 100%;
}

.provider-intel-card-actions {
  margin-top: auto;
}

.provider-intel-card-actions-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.provider-intel-card-action {
  font-size: 10px;
  font-weight: 750;
  line-height: 1.2;
  padding: 3px 6px;
  border-radius: 6px;
  border: 1px solid color-mix(in srgb, var(--foreground) 12%, var(--border));
  background: var(--surface);
  color: var(--foreground);
  cursor: pointer;
  font-family: inherit;
}

.provider-intel-card-action:hover:not(:disabled) {
  border-color: color-mix(in srgb, var(--brand-600) 35%, var(--border));
  color: var(--brand-700, var(--brand-600));
}

.provider-intel-card-action:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.provider-intel-card-action--primary {
  border-color: color-mix(in srgb, var(--brand-600) 40%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 10%, var(--surface));
  color: var(--brand-700, var(--brand-600));
}

.provider-planning-autosave-meta--inline {
  margin: 0;
  flex-shrink: 0;
  font-size: 10px;
}

.provider-planning-summary--compact {
  margin-bottom: 4px;
}

.provider-planning-summary--compact .provider-planning-strip {
  margin: 0;
}

/* Strategic overview — one compact card */
.provider-intel-overview {
  flex: 1;
  min-width: min(100%, 280px);
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--brand-600) 16%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 4%, var(--surface));
}

.provider-intel-overview--mature {
  border-color: color-mix(in srgb, var(--foreground) 10%, var(--border));
  background: var(--surface);
}

.provider-intel-overview-headline {
  margin: 0;
  font-size: 12px;
  line-height: 1.45;
  font-weight: 650;
  color: var(--foreground);
}

.provider-intel-overview-gaps {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 8px;
  margin-top: 8px;
}

.provider-intel-overview-gaps-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: var(--muted);
}

.provider-intel-overview-gap-chips {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.provider-intel-gap-chip {
  font-size: 11px;
  font-weight: 650;
  line-height: 1.3;
  padding: 4px 8px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));
  background: var(--surface);
  color: var(--foreground);
  cursor: pointer;
  max-width: 100%;
  text-align: left;
}

.provider-intel-gap-chip--unknown {
  border-style: dashed;
  border-color: color-mix(in srgb, var(--foreground) 14%, var(--border));
  color: var(--muted);
  background: color-mix(in srgb, var(--foreground) 3%, var(--surface));
}

.provider-intel-gap-chip--emerging,
.provider-intel-gap-chip--partial {
  border-color: color-mix(in srgb, #f59e0b 24%, var(--border));
  background: color-mix(in srgb, #f59e0b 6%, var(--surface));
  color: #92400e;
}

.provider-intel-overview-prompts {
  margin-top: 8px;
}

.provider-intel-overview-prompts-toggle {
  font-size: 10px;
  font-weight: 750;
  color: var(--brand-700);
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.provider-intel-overview-prompts-list {
  list-style: none;
  margin: 6px 0 0;
  padding: 0;
  display: grid;
  gap: 4px;
}

.provider-intel-overview-prompt {
  width: 100%;
  text-align: left;
  font-size: 11px;
  line-height: 1.4;
  font-weight: 600;
  color: var(--foreground);
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
}

.provider-intel-overview-prompt:hover {
  color: var(--brand-700);
}

/* Compact intelligence cards — summary first, expand on demand */
.provider-intel-compact-card {
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--foreground) 9%, var(--border));
  background: var(--surface);
  overflow: hidden;
}

.provider-intel-compact-card-trigger {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 6px;
  width: 100%;
  padding: 6px 8px;
  border: none;
  background: transparent;
  cursor: pointer;
  text-align: left;
  font-family: inherit;
}

.provider-intel-compact-card-trigger:hover {
  background: color-mix(in srgb, var(--foreground) 3%, var(--surface));
}

.provider-intel-compact-card-main {
  display: grid;
  gap: 4px;
  min-width: 0;
  flex: 1;
}

.provider-intel-compact-card-title-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 8px;
}

.provider-intel-compact-card-title {
  font-size: 12px;
  font-weight: 800;
  color: var(--foreground);
}

.provider-intel-section-completion-meta {
  display: block;
  margin-top: 4px;
  font-size: 10px;
  font-weight: 650;
  line-height: 1.3;
  color: var(--muted);
}

.provider-intel-compact-card-summary {
  font-size: 11px;
  line-height: 1.4;
  font-weight: 600;
  color: var(--foreground);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.provider-intel-compact-card-summary--muted {
  color: var(--muted);
  font-weight: 650;
}

.provider-intel-compact-card-chevron {
  flex-shrink: 0;
  font-size: 14px;
  font-weight: 800;
  line-height: 1;
  color: var(--muted);
  margin-top: 1px;
}

.provider-intel-compact-card-body {
  padding: 0;
  border-top: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
}

.provider-intel-compact-card-body.provider-intel-card-layer--capture {
  border-top-color: color-mix(in srgb, var(--foreground) 8%, var(--border));
}

.provider-intel-compact-card-meta {
  margin: 8px 0 0;
  font-size: 10px;
  color: var(--muted);
  font-weight: 650;
}

.provider-obs-readiness-card.provider-intel-compact-card {
  border-color: color-mix(in srgb, var(--brand-600) 22%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 3%, var(--surface));
}

.provider-obs-readiness-card.provider-intel-compact-card--open {
  border-color: color-mix(in srgb, var(--brand-600) 30%, var(--border));
}

.provider-intel-section-cards--compact {
  display: grid;
  gap: 6px;
}

@media (min-width: 720px) {
  .provider-intel-section-cards--compact {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 6px 8px;
  }
}

.provider-intel-section-card--mature .provider-intel-compact-card-summary {
  color: var(--muted);
}

.provider-planning-fields--grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px 12px;
}

@media (max-width: 720px) {
  .provider-planning-fields--grid {
    grid-template-columns: 1fr;
  }
}

.provider-profile-field--intel label {
  font-size: 11px;
  font-weight: 750;
}

.provider-planning-fields--compact .provider-profile-field--intel {
  gap: 4px;
}

.provider-planning-fields--compact .provider-intel-segmented .provider-discovery-confidence-btn {
  min-width: 0;
  flex: 1 1 72px;
  font-size: 11px;
  padding: 5px 6px;
}

.provider-planning-fields--compact .provider-intel-notes-input {
  min-height: 44px;
  font-size: 12px;
  padding: 6px 8px;
}

.provider-planning-fields--compact .provider-intel-compact-input {
  font-size: 12px;
  padding: 6px 8px;
}

.provider-profile-field--span-grid {
  grid-column: 1 / -1;
}

.provider-planning-save-bar--compact {
  margin-top: 4px;
  justify-content: flex-end;
}

.provider-planning-save-bar--compact .provider-planning-save-hint {
  display: none;
}

.provider-intel-areas-heading {
  margin: 0 0 4px;
  font-size: 12px;
  font-weight: 750;
  letter-spacing: -0.01em;
  color: var(--muted);
}

.provider-intel-evolution-lead {
  display: grid;
  gap: 4px;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid color-mix(in srgb, var(--brand-600) 18%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 5%, var(--surface));
}

.provider-intel-evolution-title {
  margin: 0;
  font-size: 13px;
  font-weight: 800;
  letter-spacing: -0.01em;
}

.provider-intel-evolution-copy {
  margin: 0;
  font-size: 12px;
  line-height: 1.45;
  font-weight: 650;
  color: var(--foreground);
}

.provider-intel-evolution-sub {
  margin: 0;
  font-size: 11px;
  line-height: 1.4;
  color: var(--muted);
}

.provider-obs-readiness-card {
  display: grid;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 14px;
  border: 1px solid color-mix(in srgb, var(--brand-600) 28%, var(--border));
  background: linear-gradient(
    165deg,
    color-mix(in srgb, var(--brand-600) 8%, var(--surface)) 0%,
    var(--surface) 55%
  );
  box-shadow: 0 1px 0 color-mix(in srgb, var(--brand-600) 12%, transparent);
}

.provider-obs-readiness-card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.provider-obs-readiness-card-heading {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.provider-obs-readiness-card-title {
  margin: 0;
  font-size: 15px;
  font-weight: 800;
  letter-spacing: -0.02em;
}

.provider-obs-readiness-card-subtitle {
  margin: 0;
  font-size: 11px;
  line-height: 1.45;
  color: var(--muted);
  font-weight: 600;
  max-width: 42rem;
}

.provider-obs-readiness-card-hint {
  margin: 0;
  font-size: 11px;
  line-height: 1.45;
  color: var(--muted);
  font-weight: 650;
}

.provider-obs-readiness-card--unknown {
  border-color: color-mix(in srgb, var(--foreground) 14%, var(--border));
  background: var(--surface);
}

.provider-obs-readiness-card--validated {
  border-color: color-mix(in srgb, #16a34a 28%, var(--border));
}

.provider-intel-learning-gaps {
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));
  background: var(--surface);
}

.provider-intel-learning-gaps-title {
  margin: 0 0 4px;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: -0.01em;
}

.provider-intel-learning-gaps-lead {
  margin: 0 0 8px;
  font-size: 10px;
  line-height: 1.4;
  color: var(--muted);
}

.provider-intel-learning-gaps-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 5px;
}

.provider-intel-learning-gap-row {
  border-radius: 6px;
  border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
  background: color-mix(in srgb, var(--foreground) 2%, var(--surface));
  overflow: hidden;
}

.provider-intel-learning-gap-row--emerging,
.provider-intel-learning-gap-row--partial,
.provider-intel-learning-gap-row--outdated {
  border-color: color-mix(in srgb, #f59e0b 22%, var(--border));
  background: color-mix(in srgb, #f59e0b 4%, var(--surface));
}

.provider-intel-learning-gap-row--unknown {
  border-style: dashed;
  border-color: color-mix(in srgb, var(--foreground) 12%, var(--border));
  background: transparent;
}

.provider-intel-learning-gap-row-main {
  display: flex;
  flex-direction: column;
  gap: 3px;
  width: 100%;
  padding: 6px 8px;
  border: none;
  background: transparent;
  text-align: left;
  cursor: pointer;
  font-family: inherit;
}

.provider-intel-learning-gap-row-main:hover {
  background: color-mix(in srgb, var(--brand-600) 6%, var(--surface));
}

.provider-intel-learning-gap-row-label {
  font-size: 11px;
  font-weight: 800;
  line-height: 1.3;
  color: var(--foreground);
}

.provider-intel-learning-gap-row-source {
  margin: 0;
  font-size: 10px;
  font-weight: 600;
  line-height: 1.35;
  color: var(--muted);
}

.provider-intel-learning-gap-row-source-kicker {
  font-weight: 700;
  font-size: 9px;
  letter-spacing: 0.01em;
  color: color-mix(in srgb, var(--brand-600) 65%, var(--muted));
}

.provider-intel-area-confidence-gap-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.provider-intel-area-confidence-gap-source {
  margin: 0;
  font-size: 9px;
  font-weight: 600;
  line-height: 1.35;
  color: var(--muted);
}

.provider-intel-area-confidence-gap-source-kicker {
  font-weight: 700;
  letter-spacing: 0.01em;
  font-size: 9px;
  color: color-mix(in srgb, var(--brand-600) 60%, var(--muted));
}

.provider-intel-learning-gap {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
  background: color-mix(in srgb, var(--foreground) 2%, var(--surface));
}

.provider-intel-learning-gap--unknown {
  border-color: color-mix(in srgb, var(--foreground) 12%, var(--border));
}

.provider-intel-learning-gap--partial {
  border-color: color-mix(in srgb, #f59e0b 20%, var(--border));
  background: color-mix(in srgb, #f59e0b 4%, var(--surface));
}

.provider-intel-learning-gap-phrase {
  font-size: 12px;
  font-weight: 650;
  line-height: 1.35;
  flex: 1;
  min-width: 0;
}

.provider-intel-learning-gap-action {
  flex-shrink: 0;
  font-size: 10px;
  font-weight: 800;
  color: var(--brand-700);
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.provider-intel-panel-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}

.provider-intel-panel-title {
  margin: 0;
  font-size: 12px;
  font-weight: 800;
}

.provider-intel-panel-badge {
  font-size: 10px;
  font-weight: 750;
  padding: 3px 8px;
  border-radius: 999px;
  color: var(--brand-700);
  background: color-mix(in srgb, var(--brand-600) 10%, var(--surface));
  border: 1px solid color-mix(in srgb, var(--brand-600) 20%, var(--border));
}

.provider-intel-quick-signal-strip {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 8px;
  padding: 8px 10px;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--brand-600) 18%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 4%, var(--surface));
}

.provider-intel-quick-signal-strip-label {
  margin: 0 0 6px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.01em;
  color: var(--muted);
  flex-shrink: 0;
}

.provider-intel-quick-captures,
.provider-intel-interaction-card {
  padding: 7px 9px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
  background: var(--surface);
}

.provider-intel-interaction-card {
  border-color: color-mix(in srgb, #f59e0b 22%, var(--border));
  background: color-mix(in srgb, #f59e0b 4%, var(--surface));
}

.provider-intel-interaction-card-head {
  flex-wrap: wrap;
  gap: 6px 8px;
}

.provider-intel-interaction-card-head .provider-intel-collapsible-trigger {
  width: auto;
  flex: 0 0 auto;
}

.provider-intel-interaction-card-head .provider-intel-briefing-chip-row--inline {
  flex: 1 1 auto;
  min-width: 0;
}

.provider-intel-quick-capture-grid {
  display: grid;
  gap: 10px;
}

@media (min-width: 640px) {
  .provider-intel-quick-capture-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.provider-intel-quick-capture-card {
  display: grid;
  gap: 6px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--foreground) 7%, var(--border));
  background: color-mix(in srgb, var(--foreground) 2%, var(--surface));
}

.provider-intel-quick-capture-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.provider-intel-quick-capture-area {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.05em;
  color: var(--muted);
}

.provider-intel-quick-capture-jump {
  font-size: 10px;
  font-weight: 750;
  color: var(--brand-700);
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.provider-intel-quick-capture-label {
  font-size: 12px;
  font-weight: 800;
}

.provider-intel-quick-capture-hint {
  margin: 0;
  font-size: 11px;
  line-height: 1.35;
  color: var(--muted);
}

.provider-intel-interaction-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 10px;
}

.provider-intel-interaction-item {
  display: grid;
  gap: 4px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, #f59e0b 18%, var(--border));
  background: color-mix(in srgb, var(--surface) 92%, #fffbeb);
}

.provider-intel-interaction-timing {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: #b45309;
}

.provider-intel-interaction-prompt {
  margin: 0;
  font-size: 12px;
  line-height: 1.45;
  font-weight: 650;
}

.provider-intel-interaction-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
  font-size: 10px;
  color: var(--muted);
  font-weight: 650;
}

.provider-intel-interaction-add {
  font-size: 10px;
  font-weight: 800;
  color: var(--brand-700);
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 2px;
}

/* Two-layer intelligence scope banners */
.intel-layer-scope {
  padding: 6px 8px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--brand-600) 12%, var(--border));
  background: color-mix(in srgb, var(--surface-2) 60%, var(--surface));
  display: grid;
  gap: 4px;
}

.intel-layer-scope-kicker {
  margin: 0;
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: var(--brand-700, var(--text-muted));
}

.intel-layer-scope-body {
  margin: 0;
  font-size: 0.82rem;
  line-height: 1.45;
  color: var(--text-muted);
}

.intel-layer-scope-topics {
  margin: 0;
  padding: 0 0 0 1rem;
  font-size: 0.78rem;
  line-height: 1.4;
  color: var(--text-muted);
  columns: 2;
  column-gap: 12px;
}

.intel-layer-scope-foot {
  margin: 0;
  font-size: 0.75rem;
  line-height: 1.4;
  color: var(--text-muted);
}

.intel-layer-scope--engagement {
  border-color: color-mix(in srgb, var(--accent, var(--brand-600)) 18%, var(--border));
}

.intel-layer-scope--provider:not(.intel-layer-scope--open) {
  padding: 6px 8px;
}

.intel-layer-scope-compact {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 6px;
}

.intel-layer-scope-topic-chips {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 3px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.intel-layer-scope-expanded {
  width: 100%;
  padding-top: 4px;
  border-top: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
}

.intel-layer-scope-toggle {
  margin-left: auto;
}

.provider-intel-stage-scope {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  margin: 0;
  font-size: 10px;
  color: var(--muted);
  font-weight: 650;
}

.provider-intel-stage-scope-hint {
  font-weight: 600;
  opacity: 0.85;
}

.provider-intel-collapsible {
  padding: 6px 8px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
  background: var(--surface);
}

.provider-intel-collapsible-head {
  display: flex;
  align-items: center;
}

.provider-intel-collapsible-trigger {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 8px;
  width: 100%;
  padding: 0;
  border: none;
  background: none;
  text-align: left;
  cursor: pointer;
}

.provider-intel-collapsible-title {
  font-size: 11px;
  font-weight: 800;
  color: var(--foreground);
}

.provider-intel-collapsible--open .provider-intel-quick-capture-grid,
.provider-intel-collapsible--open .provider-intel-interaction-list {
  margin-top: 8px;
}

.provider-intel-section-collapsed--briefing {
  gap: 6px;
  padding: 0 10px 10px;
}

.provider-intel-section-collapsed--scan {
  gap: 8px;
}

.provider-intel-section-scan-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 8px;
}

.provider-intel-section-collapsed-metrics,
.provider-intel-section-collapsed-progress {
  margin: 0;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.35;
  color: color-mix(in srgb, var(--foreground) 68%, transparent);
}

.provider-intel-compact-card-trigger .provider-intel-section-collapsed-metrics {
  display: block;
  width: 100%;
  margin-top: 2px;
}

.provider-intel-compact-card-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
}

.provider-intel-section-card--understanding .provider-intel-compact-card-trigger .provider-intel-section-collapsed-metrics {
  display: none;
}

.provider-intel-section-findings-list--scan {
  gap: 8px;
}

.provider-intel-section-finding--scan {
  display: grid;
  gap: 2px;
  padding: 0;
  border: none;
  background: transparent;
}

.provider-intel-section-finding--scan .provider-intel-section-finding-label {
  font-size: 11px;
  font-weight: 800;
  color: color-mix(in srgb, var(--foreground) 52%, transparent);
}

.provider-intel-section-finding--scan .provider-intel-section-finding-value {
  font-size: 13px;
  line-height: 1.4;
}

.provider-intel-section-status {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.01em;
  padding: 3px 8px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));
  background: color-mix(in srgb, var(--foreground) 3%, var(--surface));
  color: var(--muted);
}

.provider-intel-section-status--complete {
  color: var(--brand-700, var(--brand-600));
  border-color: color-mix(in srgb, var(--brand-600) 25%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 8%, var(--surface));
}

.provider-intel-section-status--in_progress {
  color: var(--foreground);
}

.provider-intel-section-scan-block {
  display: grid;
  gap: 3px;
}

.provider-intel-section-block-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.01em;
  color: color-mix(in srgb, var(--muted) 90%, transparent);
}

.provider-intel-section-expanded-stack {
  display: grid;
  gap: 0;
}

.provider-intel-section-capture-panel {
  display: grid;
  gap: 8px;
}

.provider-intel-section-capture-title,
.provider-intel-section-details-title {
  margin: 0;
  font-size: 12px;
  font-weight: 750;
  letter-spacing: -0.01em;
  color: var(--muted);
}

.provider-intel-section-details {
  display: grid;
  gap: 6px;
}

.provider-intel-section-details:not(.provider-intel-card-layer--detail) {
  padding-top: 12px;
  border-top: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
}

.provider-intel-section-details-lead {
  margin: 0;
  font-size: 11px;
  line-height: 1.4;
  font-weight: 600;
  color: var(--muted);
}

.provider-intel-section-detail-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 8px;
}

.provider-intel-section-detail-row {
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
  background: color-mix(in srgb, var(--foreground) 2%, var(--surface));
  display: grid;
  gap: 6px;
}

.provider-intel-section-detail-row--validated {
  border-color: color-mix(in srgb, #16a34a 22%, var(--border));
  background: color-mix(in srgb, #16a34a 5%, var(--surface));
}

.provider-intel-section-detail-row--emerging {
  border-color: color-mix(in srgb, #f59e0b 22%, var(--border));
  background: color-mix(in srgb, #f59e0b 4%, var(--surface));
}

.provider-intel-section-detail-row--unknown {
  border-style: dashed;
  border-color: color-mix(in srgb, var(--foreground) 12%, var(--border));
  background: transparent;
  opacity: 0.92;
}

.provider-intel-section-detail-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.provider-intel-section-detail-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.01em;
  color: var(--muted);
}

.provider-intel-section-detail-value {
  margin: 0;
  font-size: 12px;
  line-height: 1.45;
  font-weight: 650;
  color: var(--foreground);
}

.provider-intel-section-detail-notes {
  margin: 0;
  font-size: 11px;
  line-height: 1.4;
  color: var(--foreground);
  display: grid;
  gap: 2px;
}

.provider-intel-section-detail-meta-label {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.01em;
  color: var(--muted);
}

.provider-intel-section-detail-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 10px;
  align-items: center;
}

.provider-intel-section-detail-meta-item {
  font-size: 10px;
  font-weight: 650;
  color: var(--muted);
}

.provider-intel-section-detail-validation {
  font-size: 10px;
  font-weight: 750;
  padding: 2px 6px;
  border-radius: 4px;
  background: color-mix(in srgb, var(--foreground) 6%, var(--surface));
  color: var(--muted);
}

.provider-intel-section-detail-validation--validated {
  color: #166534;
  background: color-mix(in srgb, #16a34a 12%, var(--surface));
}

.provider-intel-section-detail-validation--emerging,
.provider-intel-section-detail-validation--assumed,
.provider-intel-section-detail-validation--refresh,
.provider-intel-section-detail-validation--outdated,
.provider-intel-section-detail-validation--thin {
  color: #92400e;
  background: color-mix(in srgb, #f59e0b 10%, transparent);
}

.provider-intel-section-detail-validation--unknown {
  color: var(--muted);
  background: color-mix(in srgb, var(--foreground) 5%, var(--surface));
  font-style: italic;
}

/* Signal-driven intelligence workspace — console density */
.provider-intel-workspace {
  display: flex;
  flex-direction: column;
  gap: 0;
  max-width: 100%;
  min-width: 0;
}

/* Sentence case for scan labels & headers; uppercase reserved for micro-tags (trust, freshness, urgency) */
.provider-intel-workspace .provider-intel-ws-summary-section-title,
.provider-intel-workspace .provider-intel-ws-summary-col-title,
.provider-intel-workspace .provider-intel-discovery-hero-eyebrow,
.provider-intel-workspace .provider-intel-areas-heading,
.provider-intel-workspace .provider-intel-section-tier-label,
.provider-intel-workspace .provider-intel-section-details-title,
.provider-intel-workspace .provider-intel-section-block-label,
.provider-intel-workspace .provider-intel-section-status,
.provider-intel-workspace .provider-intel-section-signal-label,
.provider-intel-workspace .provider-intel-section-gaps-label,
.provider-intel-workspace .provider-intel-overview-gaps-label,
.provider-intel-workspace .provider-intel-freshness-alert-label,
.provider-intel-workspace .provider-intel-notes-label,
.provider-intel-workspace .provider-intel-quick-signal-strip-label,
.provider-intel-workspace .provider-intel-quick-capture-area,
.provider-intel-workspace .provider-intel-interaction-timing,
.provider-intel-workspace .provider-intel-progressive-progress-label,
.provider-intel-workspace .provider-intel-why-it-matters-label,
.provider-intel-workspace .provider-intel-guided-summary-kicker,
.provider-intel-workspace .provider-intel-status-card-missing-label,
.provider-intel-workspace .provider-intel-section-detail-label,
.provider-intel-workspace .provider-intel-section-detail-meta-label,
.provider-intel-workspace .provider-intel-gap-line-source-kicker,
.provider-intel-workspace .provider-intel-learning-gap-row-source-kicker,
.provider-intel-workspace .provider-intel-area-confidence-gap-source-kicker,
.provider-intel-workspace .provider-intel-discovery-priority-narrative dt,
.provider-intel-workspace .provider-intel-mission-brief-row dt,
.provider-intel-workspace .provider-intel-discovery-priority-drivers li,
.provider-intel-workspace .provider-intel-area-confidence-metric dt {
  text-transform: none;
  letter-spacing: 0.01em;
}

.provider-intel-workspace .provider-intel-ws-summary-section-title {
  font-weight: 750;
  color: color-mix(in srgb, var(--foreground) 72%, var(--muted));
}

.provider-intel-workspace .provider-intel-discovery-hero-title,
.provider-intel-workspace .provider-intel-section-details-title,
.provider-intel-workspace .provider-intel-areas-heading {
  text-transform: none;
  letter-spacing: -0.01em;
}

.provider-profile-root--intelligence-tab .provider-accordion-badge {
  text-transform: none;
  letter-spacing: 0.01em;
  font-weight: 700;
}

.provider-profile-root--intelligence-tab .provider-accordion-readonly-line span,
.provider-profile-root--intelligence-tab .provider-discovery-field > span,
.provider-profile-root--intelligence-tab .provider-discovery-tags-label,
.provider-profile-root--intelligence-tab .provider-discovery-confidence legend,
.provider-profile-root--intelligence-tab .provider-discovery-source-label,
.provider-profile-root--intelligence-tab .provider-profile-saved-banner-lead {
  text-transform: none;
  letter-spacing: 0.01em;
}

.provider-intel-workspace-tier {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.provider-intel-workspace-tier + .provider-intel-workspace-tier {
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
}

.provider-intel-workspace-tier--command {
  margin-top: 8px;
  padding-top: 0;
  border-top: none;
  gap: 0;
}

/* Intelligence tab — single operational story */
.provider-intel-workspace-tier--story {
  margin-top: 8px;
  padding-top: 0;
  border-top: none;
  gap: 0;
}

.provider-intel-operational-story {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 0;
  border-radius: 0;
  background: transparent;
}

.provider-intel-story-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.provider-intel-story-lane {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  color: var(--brand-800);
  background: color-mix(in srgb, var(--brand-600) 12%, #fff);
}

.provider-intel-story-primary {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px 0 4px;
}

.provider-intel-story-primary-label {
  margin: 0;
  font-size: 11px;
  font-weight: 700;
  color: color-mix(in srgb, var(--foreground) 62%, transparent);
}

.provider-intel-story-primary-headline {
  margin: 0;
  font-size: 17px;
  font-weight: 800;
  line-height: 1.25;
  letter-spacing: -0.02em;
  color: var(--foreground);
}

.provider-intel-story-primary--danger .provider-intel-story-primary-headline {
  color: color-mix(in srgb, #b91c1c 90%, var(--foreground));
}

.provider-intel-story-primary--warn .provider-intel-story-primary-headline {
  color: color-mix(in srgb, #b45309 88%, var(--foreground));
}

.provider-intel-story-primary-scan {
  margin: 0;
  font-size: 11px;
  line-height: 1.4;
  color: color-mix(in srgb, var(--foreground) 58%, transparent);
}

.provider-intel-story-ladder {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0;
  border-top: none;
  padding-top: 4px;
}

.provider-intel-story-step {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 2px;
  align-items: start;
  padding: 8px 0;
  border-bottom: 1px solid color-mix(in srgb, var(--foreground) 5%, transparent);
}

.provider-intel-story-step:last-child {
  border-bottom: none;
}

.provider-intel-story-step--emphasized {
  grid-template-columns: 1.4rem minmax(0, 1fr);
  gap: 8px;
  margin: 4px 0;
  padding: 8px 10px;
  border: none;
  border-bottom: none;
  border-radius: 6px;
  background: color-mix(in srgb, var(--foreground) 2.5%, var(--surface));
}

.provider-intel-story-step--emphasized.provider-intel-story-step--danger {
  background: color-mix(in srgb, #b91c1c 6%, var(--surface));
  box-shadow: inset 3px 0 0 #b91c1c;
}

.provider-intel-story-step--emphasized.provider-intel-story-step--warn,
.provider-intel-story-step--emphasized.provider-intel-story-step--caution {
  background: color-mix(in srgb, #d97706 7%, var(--surface));
  box-shadow: inset 3px 0 0 #d97706;
}

.provider-intel-story-step--emphasized.provider-intel-story-step--action.provider-intel-story-step--brand,
.provider-intel-story-step--emphasized.provider-intel-story-step--action.provider-intel-story-step--warn,
.provider-intel-story-step--emphasized.provider-intel-story-step--action.provider-intel-story-step--danger {
  background: color-mix(in srgb, var(--brand-600) 7%, var(--surface));
  box-shadow: inset 3px 0 0 var(--brand-600);
}

.provider-intel-story-step--quiet {
  padding: 6px 0;
}

.provider-intel-story-step-rank {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.25rem;
  height: 1.25rem;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 800;
  color: color-mix(in srgb, var(--foreground) 55%, transparent);
  background: color-mix(in srgb, var(--foreground) 6%, transparent);
}

.provider-intel-story-step--action .provider-intel-story-step-rank {
  color: var(--brand-800);
  background: color-mix(in srgb, var(--brand-600) 14%, #fff);
}

.provider-intel-story-step--risk.provider-intel-story-step--warn .provider-intel-story-step-rank,
.provider-intel-story-step--risk.provider-intel-story-step--danger .provider-intel-story-step-rank {
  color: #b45309;
  background: color-mix(in srgb, #d97706 16%, #fff);
}

.provider-intel-story-step-label {
  margin: 0;
  font-size: 10px;
  font-weight: 700;
  color: color-mix(in srgb, var(--foreground) 55%, transparent);
}

.provider-intel-story-step-headline {
  margin: 2px 0 0;
  font-size: 13px;
  font-weight: 750;
  line-height: 1.3;
  color: var(--foreground);
}

.provider-intel-story-step-scan {
  margin: 2px 0 0;
  font-size: 11px;
  line-height: 1.35;
  color: color-mix(in srgb, var(--foreground) 58%, transparent);
}

.provider-intel-story-cta {
  margin-top: 6px;
  padding: 4px 10px;
  border-radius: 5px;
  border: 1px solid color-mix(in srgb, var(--brand-600) 28%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 8%, var(--surface));
  font-size: 11px;
  font-weight: 750;
  color: var(--brand-800);
  cursor: pointer;
}

.provider-intel-story-cta:hover {
  background: color-mix(in srgb, var(--brand-600) 14%, var(--surface));
}

.provider-intel-story-link-cta {
  margin-top: 4px;
  padding: 0;
  border: none;
  background: none;
  font: inherit;
  font-size: 11px;
  font-weight: 700;
  color: var(--brand-700, var(--brand-600));
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.provider-intel-story-link-cta:hover {
  color: var(--brand-800, var(--brand-700));
}

.provider-intel-workspace-tier--supporting {
  gap: 0;
}

/* Calm intelligence workspace — typography over boxes (~40% less card chrome) */
.provider-intel-workspace--calm .provider-intel-workspace-tier + .provider-intel-workspace-tier {
  margin-top: 18px;
  padding-top: 0;
  border-top: none;
}

/* Operational progression timeline */
.provider-intel-progression {
  margin: 0 0 14px;
  padding: 12px 12px 10px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--foreground) 7%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 4%, var(--surface));
}

.provider-intel-progression-head {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 8px 16px;
  align-items: flex-end;
  margin-bottom: 10px;
}

.provider-intel-progression-kicker {
  margin: 0;
  font-size: 10px;
  font-weight: 750;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--brand-600) 70%, var(--muted));
}

.provider-intel-progression-title {
  margin: 2px 0 0;
  font-size: 14px;
  font-weight: 850;
  letter-spacing: -0.02em;
}

.provider-intel-progression-momentum {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  min-width: 7rem;
}

.provider-intel-progression-momentum-value {
  font-size: 20px;
  font-weight: 900;
  font-variant-numeric: tabular-nums;
  line-height: 1;
  color: var(--brand-700, var(--brand-600));
}

.provider-intel-progression-momentum-label {
  font-size: 10px;
  font-weight: 650;
  text-align: right;
  color: color-mix(in srgb, var(--foreground) 52%, transparent);
  max-width: 12rem;
}

.provider-intel-progression-track-wrap {
  overflow-x: auto;
  padding-bottom: 4px;
  margin-bottom: 10px;
}

.provider-intel-progression-track {
  display: flex;
  align-items: flex-start;
  gap: 0;
  list-style: none;
  margin: 0;
  padding: 4px 2px 0;
  min-width: min(100%, 640px);
}

.provider-intel-progression-step {
  display: flex;
  align-items: center;
  flex: 1 1 0;
  min-width: 88px;
}

.provider-intel-progression-connector {
  flex: 1 1 8px;
  height: 2px;
  min-width: 8px;
  margin-top: 9px;
  background: color-mix(in srgb, var(--foreground) 12%, transparent);
}

.provider-intel-progression-connector--complete {
  background: color-mix(in srgb, #15803d 55%, transparent);
}

.provider-intel-progression-connector--blocked {
  background: repeating-linear-gradient(
    90deg,
    #b91c1c 0,
    #b91c1c 4px,
    transparent 4px,
    transparent 7px
  );
}

.provider-intel-progression-connector--muted {
  background: color-mix(in srgb, var(--foreground) 8%, transparent);
}

.provider-intel-progression-node {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  text-align: center;
  padding: 0 4px;
  min-width: 72px;
}

.provider-intel-progression-node-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 2px solid color-mix(in srgb, var(--foreground) 20%, transparent);
  background: var(--surface);
  box-sizing: border-box;
}

.provider-intel-progression-node--complete .provider-intel-progression-node-dot {
  border-color: #15803d;
  background: #15803d;
}

.provider-intel-progression-node--current .provider-intel-progression-node-dot {
  width: 14px;
  height: 14px;
  border-color: var(--brand-600);
  background: var(--brand-600);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--brand-600) 22%, transparent);
}

.provider-intel-progression-node--blocked .provider-intel-progression-node-dot {
  border-color: #b91c1c;
  background: color-mix(in srgb, #b91c1c 25%, var(--surface));
}

.provider-intel-progression-node--upcoming .provider-intel-progression-node-dot {
  opacity: 0.55;
}

.provider-intel-progression-node-label {
  font-size: 9px;
  font-weight: 750;
  line-height: 1.25;
  color: color-mix(in srgb, var(--foreground) 78%, transparent);
}

.provider-intel-progression-node--current .provider-intel-progression-node-label {
  font-weight: 850;
  color: var(--foreground);
}

.provider-intel-progression-node-badge {
  font-size: 8px;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--brand-700, var(--brand-600));
}

.provider-intel-progression-node-block {
  font-size: 8px;
  font-weight: 650;
  line-height: 1.3;
  color: #b91c1c;
  max-width: 92px;
}

.provider-intel-progression-foot {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px 16px;
  padding-top: 8px;
  border-top: 1px solid color-mix(in srgb, var(--foreground) 6%, transparent);
}

@media (min-width: 640px) {
  .provider-intel-progression-foot {
    grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
  }
}

.provider-intel-progression-foot-kicker {
  display: block;
  font-size: 9px;
  font-weight: 750;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--foreground) 46%, transparent);
  margin-bottom: 2px;
}

.provider-intel-progression-foot-current strong,
.provider-intel-progression-foot-unlock strong {
  font-size: 12px;
  font-weight: 800;
  line-height: 1.35;
}

.provider-intel-progression-foot-unlock strong {
  color: color-mix(in srgb, var(--brand-700, var(--brand-600)) 85%, var(--foreground));
}

.provider-intel-progression-foot-blocked {
  margin: 4px 0 0;
  font-size: 11px;
  font-weight: 650;
  color: #b91c1c;
}

.provider-intel-progression-foot-clear {
  margin: 0;
  font-size: 11px;
  font-weight: 650;
  color: color-mix(in srgb, #15803d 75%, var(--foreground));
}

/* Intelligence progression dashboard — deployment + evolution lanes */
.provider-intel-progression-dashboard {
  margin: 0 0 12px;
  padding: 12px 12px 10px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--brand-600) 18%, var(--border));
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--brand-600) 4%, var(--surface)) 0%,
    var(--surface) 55%
  );
  box-shadow: inset 3px 0 0 color-mix(in srgb, var(--brand-600) 45%, transparent);
}

.provider-intel-progression-dashboard-hero {
  margin-bottom: 10px;
}

.provider-intel-progression-dashboard-kicker {
  margin: 0 0 2px;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--foreground) 48%, var(--muted));
}

.provider-intel-progression-dashboard-title {
  margin: 0 0 6px;
  font-size: 13px;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--foreground);
}

.provider-intel-progression-dashboard-movement {
  margin: 0 0 4px;
  font-size: 11px;
  font-weight: 750;
  line-height: 1.35;
  color: color-mix(in srgb, var(--brand-700) 80%, var(--foreground));
}

.provider-intel-progression-dashboard-evolution {
  margin: 0;
  font-size: 10px;
  line-height: 1.4;
  color: var(--muted);
}

.provider-intel-progression-deploy {
  margin-bottom: 10px;
  padding-bottom: 10px;
  border-bottom: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
}

.provider-intel-progression-track-wrap--deploy {
  overflow-x: auto;
  padding-bottom: 4px;
}

.provider-intel-progression-lanes-kicker {
  margin: 0 0 6px;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--foreground) 45%, var(--muted));
}

.provider-intel-progression-lanes-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
}

@media (min-width: 720px) {
  .provider-intel-progression-lanes-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

.provider-intel-progression-lane {
  padding: 8px 8px 6px;
  border-radius: 7px;
  border: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));
  background: color-mix(in srgb, var(--foreground) 2%, var(--surface));
}

.provider-intel-progression-lane-head {
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: 4px 8px;
  align-items: baseline;
  margin-bottom: 6px;
}

.provider-intel-progression-lane-label {
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: color-mix(in srgb, #0f4c5c 50%, var(--muted));
}

.provider-intel-progression-lane-state {
  font-size: 10px;
  font-weight: 750;
  color: var(--foreground);
  text-align: right;
}

.provider-intel-progression-lane-pct {
  font-size: 10px;
  font-weight: 800;
  color: var(--brand-700);
}

.provider-intel-progression-lane-track {
  position: relative;
  height: 8px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--foreground) 8%, var(--border));
  overflow: hidden;
}

.provider-intel-progression-lane-fill {
  position: absolute;
  inset: 0 auto 0 0;
  border-radius: 999px;
  background: linear-gradient(
    90deg,
    color-mix(in srgb, var(--brand-600) 70%, #15803d),
    color-mix(in srgb, var(--brand-600) 45%, transparent)
  );
  transition: width 0.35s ease;
}

.provider-intel-progression-lane-steps {
  position: absolute;
  inset: 0;
  display: flex;
  justify-content: space-between;
  margin: 0;
  padding: 0 2px;
  list-style: none;
  pointer-events: none;
}

.provider-intel-progression-lane-step {
  width: 6px;
  height: 6px;
  margin-top: 1px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--foreground) 18%, var(--surface));
  border: 1px solid color-mix(in srgb, var(--foreground) 20%, transparent);
}

.provider-intel-progression-lane-step--complete {
  background: #15803d;
  border-color: #15803d;
}

.provider-intel-progression-lane-step--current {
  background: var(--brand-600);
  border-color: var(--brand-600);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--brand-600) 25%, transparent);
}

.provider-intel-progression-lane-scan {
  margin: 6px 0 0;
  font-size: 9px;
  line-height: 1.35;
  color: var(--muted);
}

.provider-intel-progression-compact {
  margin: 0 0 10px;
  padding: 8px 10px;
  border-radius: 7px;
  border: 1px solid color-mix(in srgb, var(--brand-600) 16%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 4%, var(--surface));
}

.provider-intel-progression-compact-kicker {
  margin: 0 0 3px;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--muted);
}

.provider-intel-progression-compact-headline {
  margin: 0 0 6px;
  font-size: 11px;
  font-weight: 750;
  line-height: 1.35;
  color: var(--foreground);
}

.provider-intel-progression-compact-lanes {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.provider-intel-progression-compact-chip {
  padding: 2px 6px;
  border-radius: 999px;
  font-size: 9px;
  font-weight: 700;
  border: 1px solid color-mix(in srgb, var(--foreground) 12%, var(--border));
  background: var(--surface);
  color: color-mix(in srgb, var(--foreground) 75%, var(--muted));
}

.provider-intel-progression-node--current .provider-intel-progression-node-dot {
  animation: provider-intel-progression-pulse 2s ease-in-out infinite;
}

@keyframes provider-intel-progression-pulse {
  0%,
  100% {
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--brand-600) 22%, transparent);
  }
  50% {
    box-shadow: 0 0 0 5px color-mix(in srgb, var(--brand-600) 12%, transparent);
  }
}

/* Field time waste prevention — proactive visit failure scan */
.provider-intel-waste-prevention {
  margin: 0 0 14px;
  padding: 12px 12px 10px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
  background: color-mix(in srgb, var(--foreground) 2%, var(--surface));
  box-shadow: inset 3px 0 0 color-mix(in srgb, var(--brand-600) 35%, transparent);
}

.provider-intel-waste-prevention--do_not_deploy {
  background: color-mix(in srgb, #b91c1c 6%, var(--surface));
  box-shadow: inset 3px 0 0 #b91c1c;
}

.provider-intel-waste-prevention--hold_visit {
  background: color-mix(in srgb, #d97706 6%, var(--surface));
  box-shadow: inset 3px 0 0 #d97706;
}

.provider-intel-waste-prevention--validate_first {
  box-shadow: inset 3px 0 0 color-mix(in srgb, #b45309 55%, transparent);
}

.provider-intel-waste-prevention--protected {
  box-shadow: inset 3px 0 0 #15803d;
}

.provider-intel-waste-prevention-head {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 8px 14px;
  align-items: flex-start;
}

.provider-intel-waste-prevention-eyebrow {
  margin: 0;
  font-size: 10px;
  font-weight: 750;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--brand-600) 72%, var(--muted));
}

.provider-intel-waste-prevention-title {
  margin: 2px 0 0;
  font-size: 15px;
  font-weight: 850;
  letter-spacing: -0.02em;
}

.provider-intel-waste-prevention-question {
  margin: 6px 0 0;
  font-size: 13px;
  font-weight: 800;
  line-height: 1.3;
  color: color-mix(in srgb, var(--foreground) 88%, transparent);
}

.provider-intel-waste-prevention--do_not_deploy .provider-intel-waste-prevention-question {
  color: color-mix(in srgb, #b91c1c 88%, var(--foreground));
}

.provider-intel-waste-prevention-posture-block {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  text-align: right;
}

.provider-intel-waste-prevention-posture {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--foreground) 58%, transparent);
}

.provider-intel-waste-prevention-score {
  font-size: 20px;
  font-weight: 900;
  font-variant-numeric: tabular-nums;
  line-height: 1;
  color: var(--brand-700, var(--brand-600));
}

.provider-intel-waste-prevention-score-suffix {
  font-size: 10px;
  font-weight: 650;
  color: color-mix(in srgb, var(--foreground) 48%, transparent);
}

.provider-intel-waste-prevention-headline {
  margin: 8px 0 0;
  font-size: 12px;
  font-weight: 650;
  line-height: 1.4;
  color: color-mix(in srgb, var(--foreground) 72%, transparent);
}

.provider-intel-waste-prevention-meta {
  margin: 4px 0 10px;
  font-size: 10px;
  font-weight: 600;
  color: color-mix(in srgb, var(--foreground) 48%, transparent);
}

.provider-intel-waste-prevention-threats {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0;
}

.provider-intel-waste-threat {
  border-top: 1px solid color-mix(in srgb, var(--foreground) 6%, transparent);
}

.provider-intel-waste-threat--active {
  background: color-mix(in srgb, var(--foreground) 2%, transparent);
}

.provider-intel-waste-threat--clear {
  opacity: 0.72;
}

.provider-intel-waste-threat-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 6px 10px;
  padding: 8px 0;
}

.provider-intel-waste-threat-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.provider-intel-waste-threat-cell--category {
  flex-direction: row;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 6px 10px;
}

.provider-intel-waste-threat-label {
  font-size: 11px;
  font-weight: 800;
}

.provider-intel-waste-threat-level {
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.provider-intel-waste-threat--critical .provider-intel-waste-threat-level,
.provider-intel-waste-threat--high .provider-intel-waste-threat-level {
  color: #b91c1c;
}

.provider-intel-waste-threat--elevated .provider-intel-waste-threat-level {
  color: #b45309;
}

.provider-intel-waste-threat-kicker {
  font-size: 9px;
  font-weight: 750;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--foreground) 44%, transparent);
}

.provider-intel-waste-threat-failure {
  margin: 0;
  font-size: 11px;
  font-weight: 700;
  line-height: 1.35;
  color: color-mix(in srgb, var(--foreground) 82%, transparent);
}

.provider-intel-waste-threat--active .provider-intel-waste-threat-failure {
  color: color-mix(in srgb, #b91c1c 75%, var(--foreground));
}

.provider-intel-waste-threat-prevent {
  margin: 0;
  font-size: 11px;
  font-weight: 600;
  line-height: 1.35;
  color: color-mix(in srgb, var(--foreground) 62%, transparent);
}

.provider-intel-waste-threat-cta {
  min-height: 28px;
  padding: 4px 10px;
  border-radius: 5px;
  border: 1px solid color-mix(in srgb, var(--brand-600) 35%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 10%, var(--surface));
  font-size: 11px;
  font-weight: 750;
  color: var(--brand-700, var(--brand-600));
  cursor: pointer;
  white-space: nowrap;
}

.provider-intel-waste-threat-cta:hover {
  background: color-mix(in srgb, var(--brand-600) 16%, var(--surface));
}

@media (min-width: 800px) {
  .provider-intel-waste-threat-grid {
    grid-template-columns: minmax(140px, 0.9fr) minmax(0, 1.2fr) minmax(0, 1fr) auto;
    align-items: start;
  }
}

.provider-intel-workspace-tier--waste-prevention,
.provider-intel-workspace-tier--collection-queue {
  margin-bottom: 14px;
}

/* Primary operational risk — single persistent orienting banner */
.provider-intel-primary-risk {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  margin: 0 0 12px;
  padding: 10px 12px;
  border: none;
  border-radius: 6px;
  background: color-mix(in srgb, var(--foreground) 3%, var(--surface));
  box-shadow: inset 3px 0 0 color-mix(in srgb, var(--foreground) 18%, transparent);
}

.provider-intel-primary-risk--warn {
  background: color-mix(in srgb, #d97706 8%, var(--surface));
  box-shadow: inset 3px 0 0 #d97706;
}

.provider-intel-primary-risk--danger {
  background: color-mix(in srgb, #b91c1c 7%, var(--surface));
  box-shadow: inset 3px 0 0 #b91c1c;
}

.provider-intel-primary-risk--caution {
  background: color-mix(in srgb, var(--foreground) 4%, var(--surface));
  box-shadow: inset 3px 0 0 color-mix(in srgb, var(--foreground) 22%, transparent);
}

.provider-intel-primary-risk--success {
  background: color-mix(in srgb, #15803d 6%, var(--surface));
  box-shadow: inset 3px 0 0 #15803d;
}

.provider-intel-primary-risk-copy {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.provider-intel-primary-risk-question {
  margin: 0;
  font-size: 10px;
  font-weight: 650;
  line-height: 1.35;
  color: color-mix(in srgb, var(--foreground) 52%, transparent);
}

.provider-intel-primary-risk-label {
  margin: 0;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--foreground) 58%, transparent);
}

.provider-intel-primary-risk-headline {
  margin: 2px 0 0;
  font-size: 15px;
  font-weight: 800;
  line-height: 1.25;
  letter-spacing: -0.02em;
  color: var(--foreground);
}

.provider-intel-primary-risk--danger .provider-intel-primary-risk-headline {
  color: color-mix(in srgb, #b91c1c 92%, var(--foreground));
}

.provider-intel-primary-risk--warn .provider-intel-primary-risk-headline {
  color: color-mix(in srgb, #b45309 90%, var(--foreground));
}

.provider-intel-primary-risk-scan {
  margin: 4px 0 0;
  font-size: 11px;
  line-height: 1.35;
  color: color-mix(in srgb, var(--foreground) 58%, transparent);
}

.provider-intel-primary-risk-cta {
  flex-shrink: 0;
  align-self: center;
  padding: 5px 10px;
  border-radius: 5px;
  border: 1px solid color-mix(in srgb, var(--brand-600) 28%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 8%, var(--surface));
  font-size: 11px;
  font-weight: 750;
  color: var(--brand-800);
  cursor: pointer;
  white-space: nowrap;
}

.provider-intel-primary-risk-cta:hover {
  background: color-mix(in srgb, var(--brand-600) 14%, var(--surface));
}

.provider-intel-workspace--calm .provider-intel-story-lane {
  padding: 0;
  border-radius: 0;
  text-transform: none;
  letter-spacing: 0.01em;
  font-size: 11px;
  font-weight: 700;
  color: color-mix(in srgb, var(--foreground) 55%, transparent);
  background: transparent;
}

.provider-intel-workspace--calm .provider-intel-story-primary-headline {
  font-size: 18px;
  font-weight: 800;
}

.provider-intel-ws-summary--flat {
  margin: 0;
  padding: 0;
  border: none;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}

.provider-intel-ws-summary-head--flat {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
  margin: 0 0 6px;
  flex-wrap: wrap;
}

.provider-intel-ws-summary-trust-hint {
  margin: 0;
  font-size: 10px;
  font-weight: 600;
  color: color-mix(in srgb, var(--foreground) 48%, transparent);
}

.provider-intel-ws-summary-trust-rows {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0;
}

.provider-intel-ws-summary-trust-row {
  border-bottom: 1px solid color-mix(in srgb, var(--foreground) 4%, transparent);
}

.provider-intel-ws-summary-trust-row .provider-intel-area-confidence--flat {
  padding: 4px 0;
}

.provider-intel-ws-summary-trust-row:last-child {
  border-bottom: none;
}

/* Operational scan by area — compact horizontal lanes */
.provider-intel-ws-summary--scan .provider-intel-ws-summary-head--flat {
  margin-bottom: 4px;
}

.provider-intel-area-scan-header {
  display: none;
  grid-template-columns: minmax(108px, 16%) minmax(92px, 13%) minmax(0, 1fr) minmax(0, 1fr) auto;
  gap: 8px 12px;
  padding: 0 0 4px;
  font-size: 9px;
  font-weight: 750;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--foreground) 42%, transparent);
}

@media (min-width: 720px) {
  .provider-intel-area-scan-header {
    display: grid;
  }

  .provider-intel-area-lane-grid {
    grid-template-columns: minmax(108px, 16%) minmax(92px, 13%) minmax(0, 1fr) minmax(0, 1fr) auto;
  }

  .provider-intel-area-lane-cell .provider-intel-area-lane-kicker {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
}

.provider-intel-area-scan-lanes {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0;
}

.provider-intel-area-scan-lane-item {
  border-bottom: 1px solid color-mix(in srgb, var(--foreground) 5%, transparent);
}

.provider-intel-area-scan-lane-item:last-child {
  border-bottom: none;
}

.provider-intel-area-lane {
  padding: 4px 0;
  border: none;
  border-radius: 0;
  background: transparent;
}

.provider-intel-area-lane:hover {
  background: color-mix(in srgb, var(--foreground) 2%, transparent);
}

.provider-intel-area-lane-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 4px 8px;
  align-items: center;
}

.provider-intel-area-lane-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.provider-intel-area-lane-cell--area {
  flex-direction: row;
  align-items: baseline;
  gap: 8px;
}

.provider-intel-area-lane-cell--cta {
  align-items: flex-start;
}

.provider-intel-area-lane-title {
  margin: 0;
  font-size: 12px;
  font-weight: 800;
  line-height: 1.25;
  color: var(--foreground);
}

.provider-intel-area-lane-kicker {
  font-size: 9px;
  font-weight: 750;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--foreground) 46%, transparent);
}

.provider-intel-area-lane-state {
  display: inline-block;
  width: fit-content;
  max-width: 100%;
  font-size: 9px;
  font-weight: 800;
  line-height: 1.25;
  letter-spacing: 0.03em;
  padding: 1px 5px;
  border-radius: 3px;
  color: color-mix(in srgb, var(--foreground) 72%, transparent);
  background: color-mix(in srgb, var(--foreground) 5%, transparent);
}

.provider-intel-area-lane-state--partial {
  color: #92400e;
  background: color-mix(in srgb, #f59e0b 10%, transparent);
}

.provider-intel-area-lane-state--strong {
  color: var(--brand-700, var(--brand-600));
  background: color-mix(in srgb, var(--brand-600) 10%, transparent);
}

.provider-intel-area-lane-state--validated {
  color: #166534;
  background: color-mix(in srgb, #15803d 10%, transparent);
}

.provider-intel-area-lane-state--low {
  color: #b91c1c;
  background: color-mix(in srgb, #dc2626 8%, transparent);
}

.provider-intel-area-lane-value {
  font-size: 11px;
  line-height: 1.35;
  font-weight: 600;
  color: color-mix(in srgb, var(--foreground) 78%, transparent);
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.provider-intel-area-lane-value--unlock {
  font-weight: 650;
  color: color-mix(in srgb, var(--brand-700, var(--brand-600)) 70%, var(--foreground));
}

.provider-intel-area-lane-cta {
  flex-shrink: 0;
  padding: 2px 8px;
  border: none;
  border-radius: 3px;
  background: color-mix(in srgb, var(--brand-600) 10%, var(--surface));
  font-size: 10px;
  font-weight: 800;
  line-height: 1.2;
  color: var(--brand-700, var(--brand-600));
  white-space: nowrap;
  cursor: pointer;
}

.provider-intel-area-lane-cta:hover:not(:disabled) {
  background: color-mix(in srgb, var(--brand-600) 14%, var(--surface));
}

.provider-intel-area-lane-cta:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.provider-intel-area-confidence--flat {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  grid-template-rows: auto auto auto;
  gap: 1px 8px;
  padding: 5px 0;
  border: none;
  border-radius: 0;
  background: transparent;
}

.provider-intel-area-confidence--flat .provider-intel-scan-list--area-inline {
  grid-column: 1 / -1;
  grid-row: 3;
  margin: 0;
  padding-top: 3px;
  border-top: 1px solid color-mix(in srgb, var(--foreground) 5%, transparent);
}

.provider-intel-area-confidence--flat:hover {
  border-color: transparent;
  background: color-mix(in srgb, var(--foreground) 2%, transparent);
}

.provider-intel-area-confidence--flat .provider-intel-area-confidence-head {
  grid-column: 1;
  grid-row: 1;
  margin: 0;
}

.provider-intel-area-confidence--flat .provider-intel-area-confidence-summary {
  grid-column: 1 / -1;
  grid-row: 2;
  margin: 0;
  font-size: 11px;
  -webkit-line-clamp: 2;
}

.provider-intel-area-confidence--flat .provider-intel-area-confidence-actions {
  grid-column: 2;
  grid-row: 1;
  align-self: start;
  margin: 0;
}

.provider-intel-area-confidence--flat .provider-intel-area-confidence-cta {
  padding: 0;
  border: none;
  background: none;
  font-size: 11px;
  font-weight: 700;
  color: var(--brand-700, var(--brand-600));
  text-decoration: underline;
  text-underline-offset: 2px;
}

.provider-intel-area-confidence--flat .provider-intel-area-confidence-cta:hover:not(:disabled) {
  background: none;
  color: var(--brand-800, var(--brand-700));
}

.provider-intel-area-confidence--flat .provider-intel-area-confidence-menu {
  display: none;
}

.provider-intel-area-confidence--flat .provider-intel-area-confidence-state {
  font-size: 10px;
  padding: 0;
  border: none;
  background: transparent;
  font-weight: 700;
}

.provider-intel-area-confidence--flat .provider-intel-area-confidence-title {
  font-size: 12px;
  font-weight: 750;
}

.provider-intel-supporting--validated-only {
  padding: 0;
  border: none;
  background: transparent;
}

.provider-profile-root--intelligence-tab .provider-intel-workspace--calm .provider-intel-compact-card {
  border: none;
  border-radius: 0;
  box-shadow: none;
  background: transparent;
}

.provider-profile-root--intelligence-tab .provider-intel-workspace--calm .provider-intel-section-cards--compact {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.provider-profile-root--intelligence-tab .provider-intel-workspace--calm .provider-intel-section-card {
  box-shadow: none;
  border-bottom: 1px solid color-mix(in srgb, var(--foreground) 6%, transparent);
}

.provider-profile-root--intelligence-tab .provider-intel-workspace--calm .provider-intel-compact-card-trigger {
  padding: 10px 0;
}

.provider-profile-root--intelligence-tab .provider-intel-workspace--calm .provider-intel-compact-card-body {
  border-top: none;
  padding-top: 4px;
}

.provider-profile-root--intelligence-tab .provider-intel-workspace--calm .provider-intel-card-layer--summary,
.provider-profile-root--intelligence-tab .provider-intel-workspace--calm .provider-intel-card-layer--capture,
.provider-profile-root--intelligence-tab .provider-intel-workspace--calm .provider-intel-card-layer--detail {
  border: none;
  border-radius: 0;
  background: transparent;
  margin: 0;
  padding: 4px 0 8px;
}

.provider-profile-root--intelligence-tab .provider-intel-workspace--calm .provider-intel-card-layer--actions {
  border: none;
  border-top: 1px solid color-mix(in srgb, var(--foreground) 6%, transparent);
  background: transparent;
  padding: 6px 0;
}

.provider-profile-root--intelligence-tab .provider-intel-workspace--calm .provider-intel-gap-line-item {
  border: none;
  border-radius: 0;
  padding: 4px 0;
  background: transparent;
}

.provider-profile-root--intelligence-tab .provider-intel-workspace--calm .provider-intel-freshness-alert {
  margin-bottom: 8px;
  padding: 6px 8px;
  border-radius: 4px;
  border-width: 1px;
  border-left-width: 3px;
}

.provider-intel-supporting {
  border-radius: 6px;
  background: color-mix(in srgb, var(--foreground) 2%, var(--surface));
}

.provider-intel-supporting-summary {
  cursor: pointer;
  list-style: none;
  padding: 8px 10px;
  font-size: 12px;
  font-weight: 750;
  color: color-mix(in srgb, var(--foreground) 72%, transparent);
}

.provider-intel-supporting-summary::-webkit-details-marker {
  display: none;
}

.provider-intel-supporting-summary::before {
  content: "▸ ";
  display: inline-block;
  width: 0.85rem;
  color: color-mix(in srgb, var(--foreground) 45%, transparent);
}

.provider-intel-supporting[open] .provider-intel-supporting-summary::before {
  content: "▾ ";
}

.provider-intel-supporting-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 0 10px 10px;
}

.provider-intel-supporting-kicker {
  margin: 0 0 4px;
  font-size: 10px;
  font-weight: 700;
  color: color-mix(in srgb, var(--foreground) 50%, transparent);
}

.provider-intel-supporting-mission-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.provider-intel-supporting-mission-btn {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  width: 100%;
  padding: 6px 8px;
  border: none;
  border-radius: 5px;
  background: color-mix(in srgb, var(--foreground) 4%, transparent);
  text-align: left;
  cursor: pointer;
}

.provider-intel-supporting-mission-btn:hover {
  background: color-mix(in srgb, var(--brand-600) 8%, transparent);
}

.provider-intel-supporting-mission-title {
  font-size: 12px;
  font-weight: 700;
  color: var(--foreground);
}

.provider-intel-supporting-mission-scan {
  font-size: 10px;
  line-height: 1.35;
  color: color-mix(in srgb, var(--foreground) 55%, transparent);
}

.provider-intel-supporting-aside-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
}

@media (min-width: 900px) {
  .provider-intel-supporting-aside-grid {
    grid-template-columns: 1fr 1fr;
  }
}

.provider-intel-workspace-tier--areas .provider-intel-areas-heading {
  margin: 0 0 6px;
  font-size: 12px;
  font-weight: 750;
  color: color-mix(in srgb, var(--foreground) 65%, transparent);
}

.provider-intel-workspace-command-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
  align-items: start;
}

.provider-intel-workspace-command-aside {
  min-width: 0;
}

.provider-intel-workspace-command-main {
  min-width: 0;
}

@media (min-width: 768px) {
  .provider-intel-workspace-command-grid {
    grid-template-columns: minmax(10rem, 13rem) minmax(0, 1fr);
    gap: 8px;
  }
}

.provider-intel-workspace-tier--operational {
  gap: 0;
}

.provider-intel-workspace-operational-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
  align-items: start;
}

.provider-intel-workspace-operational-aside {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

@media (min-width: 768px) {
  .provider-intel-workspace-operational-grid {
    grid-template-columns: minmax(0, 1.5fr) minmax(11rem, 1fr);
    gap: 8px;
  }
}

.provider-intel-workspace-tier--areas {
  gap: 6px;
}

.provider-intel-stage-scope {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 6px 10px;
  margin: 0;
  font-size: 12px;
  line-height: 1.35;
}

.provider-intel-stage-scope-label {
  font-weight: 800;
  color: var(--brand-700, var(--brand-600));
}

.provider-intel-stage-scope-hint {
  font-size: 11px;
  font-weight: 650;
  color: var(--muted);
}

/* Layer: summary (scan) — lightest weight inside cards */
.provider-intel-card-layer--summary {
  padding: 5px 8px 3px;
  gap: 5px;
}

.provider-intel-card-layer--summary-band {
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));
  background: color-mix(in srgb, var(--foreground) 2%, var(--surface));
}

.provider-intel-section-collapsed.provider-intel-card-layer--summary {
  display: grid;
  gap: 8px;
}

/* Intelligence scan lanes — validated vs open (dense, borderless) */
.provider-intel-scan-lanes {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px 12px;
  align-items: start;
}

.provider-intel-scan-lanes--compact {
  grid-template-columns: 1fr;
  gap: 8px;
}

.provider-intel-scan-lane {
  min-width: 0;
}

.provider-intel-scan-lane-head {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0 0 4px;
  min-height: 18px;
}

.provider-intel-scan-lane-tag {
  flex-shrink: 0;
  font-size: 8px;
  font-weight: 900;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  padding: 1px 5px;
  border-radius: 3px;
  line-height: 1.35;
}

.provider-intel-scan-lane-tag--validated {
  color: #166534;
  background: color-mix(in srgb, #15803d 10%, transparent);
}

.provider-intel-scan-lane-tag--open {
  color: #92400e;
  background: color-mix(in srgb, #f59e0b 12%, transparent);
}

.provider-intel-scan-lane-count {
  margin-left: auto;
  font-size: 12px;
  font-weight: 850;
  font-variant-numeric: tabular-nums;
  color: color-mix(in srgb, var(--foreground) 55%, var(--muted));
}

.provider-intel-scan-lane--validated .provider-intel-scan-lane-count {
  color: #15803d;
}

.provider-intel-scan-lane--open .provider-intel-scan-lane-count {
  color: #b45309;
}

.provider-intel-scan-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0;
}

.provider-intel-scan-item {
  margin: 0;
  padding: 0;
  border-bottom: 1px solid color-mix(in srgb, var(--foreground) 5%, transparent);
}

.provider-intel-scan-item:last-child {
  border-bottom: none;
}

.provider-intel-scan-hit {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  grid-template-rows: auto auto;
  gap: 2px 6px;
  align-items: start;
  width: 100%;
  padding: 4px 2px 4px 0;
  border: none;
  background: none;
  font: inherit;
  text-align: left;
  cursor: default;
}

button.provider-intel-scan-hit {
  cursor: pointer;
}

button.provider-intel-scan-hit:hover .provider-intel-scan-primary {
  color: var(--brand-700, var(--brand-600));
}

.provider-intel-scan-hit--open {
  grid-template-rows: auto auto;
}

.provider-intel-scan-status {
  grid-row: 1 / -1;
  align-self: center;
  font-size: 8px;
  font-weight: 900;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  line-height: 1.2;
  padding: 2px 4px;
  border-radius: 3px;
}

.provider-intel-scan-status--validated {
  color: #166534;
  background: color-mix(in srgb, #15803d 8%, transparent);
}

.provider-intel-scan-status--open {
  color: #92400e;
  background: color-mix(in srgb, #f59e0b 10%, transparent);
}

.provider-intel-scan-primary {
  grid-column: 2;
  font-size: 11px;
  font-weight: 750;
  line-height: 1.3;
  color: var(--foreground);
}

.provider-intel-scan-item--validated .provider-intel-scan-primary {
  font-weight: 700;
  color: color-mix(in srgb, var(--foreground) 88%, var(--muted));
}

.provider-intel-scan-item--open .provider-intel-scan-primary {
  font-weight: 800;
  color: var(--foreground);
}

.provider-intel-scan-tags {
  grid-column: 2;
  display: flex;
  flex-wrap: wrap;
  gap: 3px;
  min-width: 0;
}

.provider-intel-gap-field-guidance {
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 4px 8px;
  margin: 2px 0 0;
  padding: 4px 0 0;
  border-top: 1px solid color-mix(in srgb, var(--foreground) 6%, transparent);
}

.provider-intel-gap-field-guidance--compact {
  gap: 2px 6px;
  padding-top: 3px;
}

.provider-intel-gap-field-guidance-row {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.provider-intel-gap-field-guidance dt {
  margin: 0;
  font-size: 8px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--foreground) 45%, transparent);
}

.provider-intel-gap-field-guidance dd {
  margin: 0;
  font-size: 10px;
  font-weight: 650;
  line-height: 1.25;
  color: color-mix(in srgb, var(--foreground) 88%, transparent);
}

.provider-intel-scan-hit--open:has(.provider-intel-gap-field-guidance) {
  grid-template-rows: auto auto auto;
}

.provider-intel-scan-tag-pill {
  display: inline-flex;
  align-items: baseline;
  gap: 3px;
  max-width: 100%;
  padding: 1px 4px;
  border-radius: 3px;
  font-size: 9px;
  font-weight: 650;
  line-height: 1.25;
  background: color-mix(in srgb, var(--foreground) 4%, transparent);
  color: color-mix(in srgb, var(--foreground) 62%, var(--muted));
}

.provider-intel-scan-tag-pill-kicker {
  font-size: 8px;
  font-weight: 900;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  flex-shrink: 0;
}

.provider-intel-scan-tag-pill-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}

.provider-intel-scan-tag-pill--problem {
  background: color-mix(in srgb, #1d4ed8 6%, transparent);
  color: color-mix(in srgb, #1e40af 75%, var(--muted));
}

.provider-intel-scan-tag-pill--problem .provider-intel-scan-tag-pill-kicker {
  color: #1d4ed8;
}

.provider-intel-scan-tag-pill--risk {
  background: color-mix(in srgb, #b45309 8%, transparent);
  color: color-mix(in srgb, #92400e 80%, var(--muted));
}

.provider-intel-scan-tag-pill--risk .provider-intel-scan-tag-pill-kicker {
  color: #b45309;
}

.provider-intel-scan-tag-pill--field {
  background: color-mix(in srgb, #f59e0b 8%, transparent);
  color: color-mix(in srgb, var(--foreground) 70%, var(--muted));
}

.provider-intel-scan-tag-pill--field .provider-intel-scan-tag-pill-kicker {
  color: #b45309;
}

.provider-intel-scan-field-line {
  grid-column: 2;
  font-size: 9px;
  font-weight: 600;
  line-height: 1.3;
  color: color-mix(in srgb, var(--foreground) 58%, var(--muted));
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.provider-intel-scan-empty {
  margin: 0;
  padding: 3px 0;
  font-size: 10px;
  font-weight: 600;
  color: var(--muted);
}

.provider-intel-scan-empty--validated {
  color: color-mix(in srgb, #15803d 55%, var(--muted));
}

.provider-intel-scan-item--more {
  border-bottom: none;
}

.provider-intel-scan-more {
  display: block;
  padding: 3px 0;
  font-size: 9px;
  font-weight: 750;
  color: var(--muted);
}

.provider-intel-scan-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: center;
}

.provider-intel-scan-legend-pill {
  font-size: 8px;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  padding: 1px 5px;
  border-radius: 3px;
  line-height: 1.35;
}

.provider-intel-scan-legend-pill--validated {
  color: #166534;
  background: color-mix(in srgb, #15803d 10%, transparent);
}

.provider-intel-scan-legend-pill--emerging {
  color: #92400e;
  background: color-mix(in srgb, #f59e0b 10%, transparent);
}

.provider-intel-scan-legend-pill--open {
  color: #b45309;
  background: color-mix(in srgb, #f59e0b 8%, transparent);
}

.provider-intel-scan-list--gaps,
.provider-intel-scan-list--area-inline,
.provider-intel-scan-list--area-detail {
  margin-top: 2px;
}

@media (max-width: 520px) {
  .provider-intel-scan-lanes {
    grid-template-columns: 1fr;
  }
}

/* Legacy gap lines — alias to scan list density */
.provider-intel-gap-lines {
  list-style: none;
  margin: 2px 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0;
}

.provider-intel-gap-line-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 4px 0;
  border: none;
  border-radius: 0;
  background: transparent;
  border-bottom: 1px solid color-mix(in srgb, var(--foreground) 5%, transparent);
}

.provider-intel-gap-line-item--emerging,
.provider-intel-gap-line-item--partial,
.provider-intel-gap-line-item--outdated {
  border-color: color-mix(in srgb, #f59e0b 20%, var(--border));
  background: color-mix(in srgb, #f59e0b 5%, var(--surface));
}

.provider-intel-gap-line-item--unknown {
  border-style: dashed;
  border-color: color-mix(in srgb, var(--foreground) 10%, var(--border));
  background: transparent;
  opacity: 0.9;
}

.provider-intel-gap-line-item--more {
  padding: 2px 0;
  border: none;
  background: transparent;
}

.provider-intel-gap-line-main {
  min-width: 0;
}

.provider-intel-gap-line-label,
.provider-intel-gap-line-btn {
  font-size: 11px;
  font-weight: 750;
  line-height: 1.3;
  color: var(--foreground);
}

.provider-intel-gap-line-btn {
  padding: 0;
  border: none;
  background: none;
  font: inherit;
  text-align: left;
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.provider-intel-gap-line-btn:hover {
  color: var(--brand-700, var(--brand-600));
}

.provider-intel-gap-line-source {
  margin: 0;
  font-size: 10px;
  font-weight: 600;
  line-height: 1.35;
  color: var(--muted);
}

.provider-intel-gap-line-source-kicker {
  font-weight: 700;
  letter-spacing: 0.01em;
  font-size: 9px;
  color: color-mix(in srgb, var(--brand-600) 65%, var(--muted));
}

.provider-intel-unlocks-next {
  margin: 3px 0 0;
  font-size: 11px;
  line-height: 1.35;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: baseline;
}

.provider-intel-unlocks-next--compact {
  margin: 2px 0 0;
  font-size: 10px;
}

.provider-intel-unlocks-next-kicker {
  font-weight: 750;
  color: color-mix(in srgb, var(--brand-700, var(--brand-600)) 75%, var(--muted));
}

.provider-intel-unlocks-next-value {
  font-weight: 650;
  color: color-mix(in srgb, var(--foreground) 72%, transparent);
}

.provider-intel-gap-line-item .provider-intel-unlocks-next {
  padding-left: 0;
}

.provider-intel-quick-signal-body .provider-intel-unlocks-next {
  margin: 0 0 8px;
  padding: 6px 8px;
  border-radius: 4px;
  background: color-mix(in srgb, var(--brand-600) 6%, var(--surface));
  box-shadow: inset 2px 0 0 var(--brand-600);
}

.provider-intel-gap-line--more {
  font-size: 10px;
  font-weight: 700;
  color: var(--muted);
}

.provider-intel-gap-lines-empty {
  margin: 2px 0 0;
  font-size: 11px;
  font-weight: 600;
  color: var(--muted);
}

/* Layer: actions — operational band */
.provider-intel-card-layer--actions {
  margin-top: 0;
  padding: 7px 9px 8px;
  border-top: 2px solid color-mix(in srgb, var(--brand-600) 22%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 7%, var(--surface));
}

.provider-intel-card-actions--compact.provider-intel-card-layer--actions {
  padding: 4px 6px 5px;
}

/* Layer: capture (expanded edit) */
.provider-intel-card-layer--capture {
  padding: 8px 10px 6px;
  border-top: 1px solid color-mix(in srgb, var(--foreground) 7%, var(--border));
  background: var(--surface);
}

.provider-intel-card-layer--capture .provider-intel-why-it-matters--section {
  margin-bottom: 6px;
}

/* Layer: detail — de-emphasized reference */
.provider-intel-card-layer--detail {
  margin: 0 8px 8px;
  padding: 10px 10px 8px;
  border-radius: 8px;
  border: 1px dashed color-mix(in srgb, var(--foreground) 14%, var(--border));
  background: color-mix(in srgb, var(--foreground) 2.5%, var(--background, var(--surface)));
}

.provider-intel-card-layer--detail .provider-intel-section-details-title {
  font-size: 9px;
  letter-spacing: 0.06em;
  color: color-mix(in srgb, var(--muted) 92%, transparent);
}

.provider-intel-card-layer--detail .provider-intel-section-details-lead {
  font-size: 10px;
  font-weight: 600;
}

.provider-intel-card-layer--detail .provider-intel-section-detail-row {
  padding: 7px 9px;
  gap: 4px;
  border-color: color-mix(in srgb, var(--foreground) 6%, var(--border));
  background: transparent;
}

.provider-intel-card-layer--detail .provider-intel-section-detail-value {
  font-size: 11px;
  font-weight: 600;
  color: color-mix(in srgb, var(--foreground) 88%, var(--muted));
}

.provider-intel-interaction-card-hint {
  font-size: 10px;
  font-weight: 700;
  color: var(--muted);
  white-space: nowrap;
}

.provider-intel-workspace-top {
  display: flex;
  justify-content: flex-end;
}

.provider-intel-workspace-briefing {
  padding: 12px 14px;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--brand-600) 16%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 4%, var(--surface));
}

.provider-intel-section-signals {
  display: grid;
  gap: 10px;
}

.provider-intel-section-signal-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 6px;
}

.provider-intel-section-signal-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  grid-template-rows: auto auto;
  gap: 2px 8px;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
  background: color-mix(in srgb, var(--foreground) 2%, var(--surface));
}

.provider-intel-section-signal-label {
  grid-column: 1;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.03em;
  color: var(--muted);
}

.provider-intel-section-signal-value {
  grid-column: 1;
  font-size: 12px;
  line-height: 1.4;
  font-weight: 650;
  color: var(--foreground);
}

.provider-intel-section-signal-edit {
  grid-column: 2;
  grid-row: 1 / span 2;
  align-self: center;
  font-size: 10px;
  font-weight: 750;
  color: var(--brand-700);
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.provider-intel-section-empty {
  margin: 0;
  font-size: 11px;
  line-height: 1.45;
  color: var(--muted);
  font-weight: 600;
}

.provider-intel-section-gaps {
  display: grid;
  gap: 6px;
}

.provider-intel-section-gaps-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: var(--muted);
}

.provider-intel-section-gaps-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.provider-intel-capture-cta {
  justify-self: start;
  font-size: 11px;
  font-weight: 750;
  padding: 6px 12px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--brand-600) 28%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 8%, var(--surface));
  color: var(--brand-700);
  cursor: pointer;
  font-family: inherit;
}

.provider-intel-capture-cta:hover {
  background: color-mix(in srgb, var(--brand-600) 14%, var(--surface));
}

.provider-intel-area-edit {
  display: grid;
  gap: 10px;
  padding-top: 4px;
  border-top: 1px dashed color-mix(in srgb, var(--foreground) 10%, var(--border));
}

.provider-intel-area-edit-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.provider-intel-area-edit-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: var(--muted);
}

.provider-intel-area-edit-done {
  font-size: 10px;
  font-weight: 750;
  color: var(--brand-700);
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 2px;
  font-family: inherit;
}

.provider-intel-section-card--editing {
  border-color: color-mix(in srgb, var(--brand-600) 28%, var(--border));
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--brand-600) 8%, transparent);
}

/* Summary-first section cards */
.provider-intel-section-card--summary-first .provider-intel-section-card-trigger {
  padding-bottom: 6px;
}

.provider-intel-section-collapsed {
  display: grid;
  gap: 8px;
  padding: 0 10px 2px;
  border-top: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
}

.provider-intel-section-collapsed.provider-intel-card-layer--summary {
  padding: 6px 10px 2px;
}

.provider-intel-section-signal-line {
  margin: 0;
  font-size: 12px;
  line-height: 1.45;
  font-weight: 700;
  color: var(--foreground);
}

.provider-intel-section-findings-list,
.provider-intel-section-missing-list {
  list-style: none;
  margin: 2px 0 0;
  padding: 0;
  display: grid;
  gap: 4px;
}

.provider-intel-section-findings-list li,
.provider-intel-section-finding {
  display: grid;
  gap: 3px;
}

.provider-intel-section-finding {
  padding: 5px 6px;
  border-radius: 6px;
  border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
}

.provider-intel-section-finding--validated {
  border-color: color-mix(in srgb, #16a34a 22%, var(--border));
  background: color-mix(in srgb, #16a34a 5%, var(--surface));
}

.provider-intel-section-finding--emerging {
  border-color: color-mix(in srgb, #f59e0b 20%, var(--border));
  background: color-mix(in srgb, #f59e0b 4%, var(--surface));
}

.provider-intel-section-finding-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
}

.provider-intel-section-finding-label {
  font-size: 10px;
  font-weight: 750;
  color: var(--muted);
}

.provider-intel-section-finding--validated .provider-intel-section-finding-value {
  color: color-mix(in srgb, #166534 75%, var(--foreground));
  font-weight: 700;
}

.provider-intel-section-finding-value {
  font-size: 11px;
  line-height: 1.4;
  font-weight: 650;
  color: var(--foreground);
}

.provider-intel-section-missing-item {
  display: block;
  width: 100%;
  text-align: left;
  font-size: 11px;
  line-height: 1.35;
  font-weight: 650;
  padding: 0;
  border: none;
  background: none;
  color: var(--foreground);
  cursor: pointer;
  font-family: inherit;
}

button.provider-intel-section-missing-item {
  text-decoration: underline;
  text-underline-offset: 2px;
  color: var(--brand-700);
}

.provider-intel-section-card-footer {
  margin: 0;
  font-size: 10px;
  font-weight: 650;
  color: var(--muted);
}

.provider-intel-section-card-footer--muted {
  font-style: italic;
}

.provider-intel-section-expanded {
  display: grid;
  gap: 10px;
}

/* Next discovery priorities engine */
.provider-intel-discovery-priorities {
  padding: 12px 14px;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--brand-600) 20%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 5%, var(--surface));
}

.provider-intel-discovery-priorities-lead {
  margin: 0 0 10px;
  font-size: 11px;
  line-height: 1.45;
  color: var(--muted);
  font-weight: 600;
}

.provider-intel-discovery-priorities-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 8px;
}

.provider-intel-discovery-priorities-more {
  margin-top: 8px;
  padding: 0;
  border: none;
  background: none;
  font-size: 11px;
  font-weight: 700;
  color: var(--brand-700);
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.provider-intel-discovery-priorities-more:hover {
  color: var(--brand-800);
}

.provider-intel-discovery-priority {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 8px 10px;
  align-items: start;
  padding: 10px 10px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
  background: var(--surface);
}

.provider-intel-discovery-priority-rank {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 800;
  color: var(--brand-700);
  background: color-mix(in srgb, var(--brand-600) 12%, var(--surface));
  flex-shrink: 0;
}

.provider-intel-discovery-priority-body {
  display: grid;
  gap: 3px;
  min-width: 0;
}

.provider-intel-discovery-priority-headline {
  margin: 0;
  padding: 0;
  border: none;
  background: none;
  font: inherit;
  font-size: 12px;
  line-height: 1.4;
  font-weight: 750;
  color: var(--foreground);
  text-align: left;
  cursor: pointer;
}

button.provider-intel-discovery-priority-headline:hover {
  color: var(--brand-700);
  text-decoration: underline;
  text-underline-offset: 2px;
}

.provider-intel-discovery-priority-headline--static {
  cursor: default;
}

.provider-intel-discovery-priority-rationale {
  margin: 0;
  font-size: 10px;
  line-height: 1.4;
  color: var(--muted);
  font-weight: 600;
}

.provider-intel-discovery-priority-drivers {
  list-style: none;
  margin: 4px 0 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.provider-intel-discovery-priority-drivers li {
  font-size: 10px;
  font-weight: 650;
  letter-spacing: 0.03em;
  padding: 2px 6px;
  border-radius: 999px;
  color: var(--muted);
  background: color-mix(in srgb, var(--foreground) 5%, var(--surface));
  border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
}

.provider-intel-discovery-priority-action {
  align-self: center;
  font-size: 10px;
  font-weight: 750;
  color: var(--brand-700);
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 2px;
  white-space: nowrap;
  font-family: inherit;
}

/* Progressive discovery interview */
.provider-intel-progressive {
  display: grid;
  gap: 12px;
}

.provider-intel-progressive-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.provider-intel-progressive-progress {
  display: grid;
  gap: 4px;
  flex: 1;
  min-width: 0;
}

.provider-intel-progressive-progress-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: var(--muted);
}

.provider-intel-progressive-progress-bar {
  display: block;
  height: 4px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--foreground) 8%, var(--border));
  overflow: hidden;
}

.provider-intel-progressive-progress-bar > span {
  display: block;
  height: 100%;
  border-radius: 999px;
  background: color-mix(in srgb, var(--brand-600) 55%, var(--border));
  transition: width 0.2s ease;
}

.provider-intel-progressive-link {
  font-size: 10px;
  font-weight: 750;
  color: var(--brand-700);
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 2px;
  white-space: nowrap;
  font-family: inherit;
}

.provider-intel-progressive-question {
  padding: 12px 12px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--brand-600) 18%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 4%, var(--surface));
}

.provider-intel-progressive-prompt {
  margin: 0 0 6px;
  font-size: 14px;
  line-height: 1.4;
  font-weight: 750;
  color: var(--foreground);
}

.provider-intel-progressive-hint {
  margin: 0 0 10px;
  font-size: 11px;
  line-height: 1.45;
  color: var(--muted);
  font-weight: 600;
}

.provider-intel-progressive--interview .provider-intel-progressive-prompt {
  font-size: 15px;
  line-height: 1.35;
  margin-bottom: 10px;
}

.provider-intel-progressive-beat {
  font-size: 10px;
  font-weight: 700;
  color: var(--brand-700, var(--brand-600));
}

.provider-intel-progressive-why,
.provider-intel-why-it-matters {
  margin: 0 0 12px;
  padding: 8px 10px;
  border-radius: 8px;
  border-left: 3px solid color-mix(in srgb, var(--brand-600) 35%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 5%, var(--surface));
}

.provider-intel-why-it-matters--section {
  margin: 0 0 14px;
}

.provider-intel-compact-card-body .provider-intel-why-it-matters--field {
  margin-top: 4px;
  margin-bottom: 8px;
}

.provider-profile-field .provider-intel-why-it-matters--field {
  margin-top: 2px;
  margin-bottom: 6px;
  padding: 6px 8px;
}

.provider-intel-progressive-why-label,
.provider-intel-why-it-matters-label {
  display: block;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.01em;
  color: var(--muted);
  margin-bottom: 4px;
}

.provider-intel-progressive-why-text,
.provider-intel-why-it-matters-text {
  margin: 0;
  font-size: 11px;
  line-height: 1.45;
  font-weight: 600;
  color: var(--foreground);
}

.provider-intel-progressive-nav-btn--skip {
  color: var(--muted);
  border-style: dashed;
}

.provider-intel-guided-summary {
  display: grid;
  gap: 10px;
  padding: 4px 0;
}

.provider-intel-guided-summary-head {
  display: grid;
  gap: 4px;
}

.provider-intel-guided-summary-title {
  margin: 0;
  font-size: 13px;
  font-weight: 800;
  color: var(--foreground);
}

.provider-intel-guided-summary-lead {
  margin: 0;
  font-size: 11px;
  font-weight: 600;
  color: var(--muted);
}

.provider-intel-guided-summary-kicker {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.01em;
  color: var(--muted);
}

.provider-intel-guided-summary-block {
  display: grid;
  gap: 6px;
}

.provider-intel-guided-summary-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 6px;
}

.provider-intel-guided-summary-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 8px;
}

.provider-intel-guided-summary-label {
  font-size: 11px;
  font-weight: 750;
  color: var(--foreground);
}

.provider-intel-guided-summary-empty {
  margin: 0;
  font-size: 11px;
  color: var(--muted);
  font-weight: 600;
}

.provider-intel-guided-summary-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
  padding-top: 4px;
}

.provider-intel-attribution {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 8px;
  margin-top: 6px;
}

.provider-intel-attribution--brief {
  margin: 4px 0 0;
  font-size: 10px;
  line-height: 1.35;
  color: var(--muted);
  font-weight: 600;
}

.provider-intel-attribution-line {
  font-size: 10px;
  line-height: 1.35;
  font-weight: 650;
  color: var(--muted);
  padding: 2px 6px;
  border-radius: 4px;
  background: color-mix(in srgb, var(--muted) 8%, var(--surface));
}

.provider-intel-attribution-line:first-child {
  color: var(--foreground);
  font-weight: 750;
}

.provider-intel-progressive-field-label {
  display: block;
  font-size: 10px;
  font-weight: 750;
  color: var(--muted);
  margin-bottom: 6px;
}

.provider-intel-progressive-control {
  display: grid;
  gap: 6px;
}

.provider-intel-progressive-stance {
  display: grid;
  gap: 6px;
  margin-bottom: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px dashed color-mix(in srgb, var(--foreground) 14%, transparent);
  background: color-mix(in srgb, var(--foreground) 2%, var(--surface));
}

.provider-intel-progressive-stance-label {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--foreground) 52%, transparent);
}

.provider-intel-progressive-stance-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.provider-intel-progressive-stance-btn {
  font-size: 10px;
  font-weight: 700;
  padding: 5px 10px;
  border-radius: 6px;
  border: 1px solid color-mix(in srgb, var(--foreground) 12%, var(--border));
  background: #fff;
  color: color-mix(in srgb, var(--foreground) 72%, transparent);
  cursor: pointer;
  font-family: inherit;
}

.provider-intel-progressive-stance-btn:hover:not(:disabled) {
  border-color: color-mix(in srgb, var(--brand-600) 28%, var(--border));
  color: var(--brand-800, #1e40af);
}

.provider-intel-progressive-stance-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.provider-intel-progressive-nav {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.provider-intel-progressive-nav-btn {
  font-size: 11px;
  font-weight: 750;
  padding: 6px 12px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--foreground) 12%, var(--border));
  background: var(--surface);
  color: var(--foreground);
  cursor: pointer;
  font-family: inherit;
}

.provider-intel-progressive-nav-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.provider-intel-progressive-nav-btn--secondary {
  color: var(--muted);
}

.provider-intel-progressive-nav-btn--primary {
  border-color: color-mix(in srgb, var(--brand-600) 30%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 10%, var(--surface));
  color: var(--brand-700);
  margin-left: auto;
}

.provider-intel-progressive-complete,
.provider-intel-progressive-done-msg {
  margin: 0;
  font-size: 11px;
  font-weight: 650;
  color: var(--muted);
}

.provider-intel-progressive--done {
  display: grid;
  gap: 8px;
  padding: 4px 0;
}

.provider-intel-areas-heading {
  margin: 4px 0 0;
  font-size: 12px;
  font-weight: 750;
  letter-spacing: 0.05em;
  color: var(--muted);
}

.provider-intel-section-tier-label {
  margin: 0 0 8px;
  font-size: 11px;
  font-weight: 750;
  letter-spacing: 0.05em;
  color: var(--muted);
}

.provider-intel-deepen-toggle {
  margin: 10px 0 4px;
  font-size: 11px;
  font-weight: 750;
  color: var(--brand-700);
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.provider-intel-deepen-locked {
  margin: 10px 0 0;
  font-size: 11px;
  line-height: 1.4;
  color: var(--muted);
  font-style: italic;
}

.provider-intel-section-card--mature .provider-accordion-preview {
  opacity: 0.85;
}

.provider-planning-fields--compact .provider-profile-field {
  gap: 4px;
}

.provider-planning-fields--compact .provider-profile-field label {
  font-size: 11px;
}

.provider-profile-field--emphasized {
  padding: 8px 10px;
  margin: 0 -10px 8px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--brand-600) 28%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 6%, var(--surface));
}

.provider-intel-confidence-badge {
  display: inline-flex;
  align-items: center;
  align-self: flex-start;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 750;
  letter-spacing: 0.01em;
  border: 1px solid transparent;
  flex-shrink: 0;
}

.provider-intel-confidence-badge--unknown,
.provider-intel-confidence-badge--not_started {
  color: color-mix(in srgb, var(--foreground) 55%, transparent);
  background: color-mix(in srgb, var(--foreground) 6%, var(--surface));
  border-color: color-mix(in srgb, var(--foreground) 14%, var(--border));
}

.provider-intel-confidence-badge--partial {
  color: #854d0e;
  background: color-mix(in srgb, #fbbf24 14%, var(--surface));
  border-color: color-mix(in srgb, #f59e0b 30%, var(--border));
}

.provider-intel-confidence-badge--unmapped {
  color: #991b1b;
  background: color-mix(in srgb, #fecaca 35%, var(--surface));
  border-color: color-mix(in srgb, #dc2626 28%, var(--border));
}

.provider-intel-confidence-badge--confirmed,
.provider-intel-confidence-badge--validated {
  color: #166534;
  background: color-mix(in srgb, var(--success, #22c55e) 12%, var(--surface));
  border-color: color-mix(in srgb, var(--success, #22c55e) 30%, var(--border));
}

.provider-intel-section-card--unknown .provider-intel-section-progress-fill {
  background: color-mix(in srgb, var(--foreground) 25%, var(--border));
}

.provider-intel-section-card--partial .provider-intel-section-progress-fill {
  background: linear-gradient(90deg, #fbbf24, #f59e0b);
}

.provider-intel-section-card--confirmed .provider-intel-section-progress-fill {
  background: linear-gradient(
    90deg,
    color-mix(in srgb, var(--brand-600) 55%, #fff),
    var(--brand-600)
  );
}

.provider-intel-section-card--validated .provider-intel-section-progress-fill {
  background: linear-gradient(90deg, #4ade80, #16a34a);
}

.provider-intel-section-card .provider-accordion-badge {
  display: none;
}

.provider-planning-save-hint {
  font-size: 11px;
  color: var(--muted);
}

.provider-planning-save-bar {

  display: flex;

  align-items: center;

  gap: 8px;

  flex-wrap: wrap;

  margin-top: 10px;

  position: sticky;

  bottom: 8px;

  padding: 8px 0;

  background: linear-gradient(180deg, transparent, #fff 24%);

}



.provider-planning-save-msg {

  font-size: 12px;

  color: var(--danger);

}



.provider-planning-save-msg--ok {

  color: var(--brand-700);

}



/* Compact lists */

.provider-compact-list {

  list-style: none;

  margin: 0;

  padding: 0;

  border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));

  border-radius: 10px;

  overflow: hidden;

}



.provider-compact-list li {

  border-bottom: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));

}



.provider-compact-list li:last-child {

  border-bottom: none;

}



.provider-compact-row {

  display: flex;

  align-items: center;

  justify-content: space-between;

  gap: 8px;

  padding: 8px 10px;

  text-decoration: none;

  color: inherit;

  min-width: 0;

}



.provider-compact-row-main {

  display: grid;

  gap: 1px;

  min-width: 0;

}



.provider-compact-row-title {

  font-size: 13px;

  font-weight: 800;

}



.provider-compact-row-sub {

  font-size: 11px;

  color: var(--muted);

  line-height: 1.3;

}



.provider-compact-row-end {

  display: flex;

  flex-direction: column;

  align-items: flex-end;

  gap: 2px;

  flex-shrink: 0;

}



.provider-compact-pill {

  font-size: 9px;

  font-weight: 800;

  padding: 2px 5px;

  border-radius: 4px;

  background: color-mix(in srgb, var(--brand-600) 10%, var(--surface));

  color: var(--brand-700);

}



.provider-compact-status {

  font-size: 10px;

  font-weight: 700;

  color: var(--muted);

}



.provider-compact-empty {

  margin: 0;

  font-size: 12px;

  color: var(--muted);

}

.provider-compact-empty-block {
  display: grid;
  gap: 10px;
}

.provider-compact-empty-cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: fit-content;
  min-height: 36px;
  padding: 8px 14px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 800;
  text-decoration: none;
  background: var(--brand-600, #2563eb);
  color: #fff;
}



/* Activity feed */

.provider-activity-feed {

  display: grid;

  gap: 8px;

}



.provider-activity-quick {

  display: flex;

  gap: 6px;

}



.provider-activity-quick input {

  flex: 1;

  min-height: 36px;

  padding: 0 10px;

  border-radius: 8px;

  border: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));

  font-size: 14px;

}



.provider-activity-phi {

  margin: 0;

  font-size: 10px;

  font-weight: 700;

  color: var(--muted);

  line-height: 1.35;

}



.provider-activity-msg {

  margin: 0;

  font-size: 11px;

  font-weight: 700;

  color: var(--brand-700);

}



.provider-activity-outreach-toggle {

  width: 100%;

  min-height: 44px;

  text-align: left;

  padding: 6px 0;

  border: none;

  background: transparent;

  font-size: 11px;

  font-weight: 800;

  color: var(--brand-700);

  cursor: pointer;

  font-family: inherit;

}



.provider-activity-outreach {

  padding: 6px 8px;

  border-radius: 8px;

  background: color-mix(in srgb, var(--foreground) 3%, var(--surface));

  border: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));

}



.provider-activity-access-notes {

  margin: 6px 0 0;

  font-size: 12px;

  white-space: pre-wrap;

  line-height: 1.4;

}



.provider-activity-filters {

  display: flex;

  flex-wrap: wrap;

  gap: 4px;

}



.provider-activity-filter {

  flex: 0 0 auto;

  min-height: 28px;

  padding: 0 10px;

  border-radius: 999px;

  border: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));

  background: color-mix(in srgb, var(--foreground) 3%, var(--surface));

  font-size: 10px;

  font-weight: 800;

  color: var(--muted);

  cursor: pointer;

  font-family: inherit;

}



.provider-activity-filter--active {

  background: color-mix(in srgb, var(--brand-600) 12%, var(--surface));

  border-color: color-mix(in srgb, var(--brand-600) 24%, var(--border));

  color: var(--brand-700);

}



.provider-timeline-actor {

  margin: 2px 0 0;

  font-size: 10px;

  font-weight: 700;

  color: var(--muted);

}



.provider-timeline-feed {

  list-style: none;

  margin: 0;

  padding: 0;

  display: grid;

  gap: 0;

}



.provider-timeline-row {

  padding: 8px 0 8px 10px;

  border-left: 2px solid color-mix(in srgb, var(--brand-600) 30%, var(--border));

  margin-bottom: 2px;

}



.provider-timeline-row time {

  font-size: 10px;

  font-weight: 700;

  color: var(--muted);

}



.provider-timeline-title {

  margin: 2px 0 0;

  font-size: 12px;

  font-weight: 800;

  line-height: 1.3;

}



.provider-timeline-meta {

  font-weight: 600;

  color: var(--muted);

}



.provider-timeline-body {

  margin: 3px 0 0;

  font-size: 12px;

  line-height: 1.4;

  color: color-mix(in srgb, var(--foreground) 88%, var(--muted));

  white-space: pre-wrap;

}



.provider-timeline-empty {

  padding: 12px 0;

  font-size: 12px;

  color: var(--muted);

  list-style: none;

}



.provider-overview-facts {

  display: grid;

  gap: 6px;

}



.provider-overview-fact {

  font-size: 12px;

  line-height: 1.35;

}



.provider-overview-fact span {

  color: var(--muted);

  font-weight: 700;

}



.provider-overview-link-row {

  display: inline-block;

  margin-top: 6px;

  font-size: 11px;

  font-weight: 800;

}



/* Planning tab — mobile-native */

.provider-planning-summary {

  margin-bottom: 8px;

}

.provider-planning-strip {

  display: grid;

  gap: 6px;

}

.provider-planning-strip-top {

  display: flex;

  flex-wrap: wrap;

  align-items: center;

  gap: 6px;

}

.provider-planning-strip-meta {

  font-size: 10px;

  font-weight: 700;

  color: var(--muted);

  line-height: 1.35;

}

.provider-planning-strip-bar {

  height: 4px;

  border-radius: 999px;

  background: color-mix(in srgb, var(--foreground) 8%, var(--border));

  overflow: hidden;

}

.provider-planning-strip-bar > span {

  display: block;

  height: 100%;

  background: var(--brand-600);

}

.provider-planning-strip-sections {

  display: flex;

  flex-wrap: wrap;

  gap: 4px;

}

.provider-planning-strip-pill {

  font-size: 9px;

  font-weight: 800;

  padding: 3px 6px;

  border-radius: 6px;

  border: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));

  background: color-mix(in srgb, var(--foreground) 3%, var(--surface));

  color: var(--muted);

  text-transform: capitalize;

}

.provider-planning-strip-pill-count {

  opacity: 0.85;

  font-weight: 650;

  margin-left: 2px;

}

.provider-planning-strip-pill--complete {

  background: color-mix(in srgb, #16a34a 10%, var(--surface));

  border-color: color-mix(in srgb, #16a34a 24%, var(--border));

  color: #15803d;

}

.provider-planning-strip-pill--in_progress {

  background: color-mix(in srgb, var(--brand-600) 10%, var(--surface));

  border-color: color-mix(in srgb, var(--brand-600) 22%, var(--border));

  color: var(--brand-700);

}

.provider-planning-strip-pill--unknown {
  background: color-mix(in srgb, var(--foreground) 5%, var(--surface));
  border-color: color-mix(in srgb, var(--foreground) 12%, var(--border));
  color: var(--muted);
}

.provider-planning-strip-pill--partial {
  background: color-mix(in srgb, #f59e0b 10%, var(--surface));
  border-color: color-mix(in srgb, #f59e0b 24%, var(--border));
  color: #92400e;
}

.provider-planning-strip-pill--confirmed {
  background: color-mix(in srgb, var(--brand-600) 10%, var(--surface));
  border-color: color-mix(in srgb, var(--brand-600) 22%, var(--border));
  color: var(--brand-700);
}

.provider-planning-strip-pill--validated {
  background: color-mix(in srgb, #16a34a 10%, var(--surface));
  border-color: color-mix(in srgb, #16a34a 24%, var(--border));
  color: #15803d;
}

.provider-discovery-section--embedded {

  gap: 6px;

  padding: 0;

}

.provider-discovery-embedded-count {

  margin: 0;

  padding: 0 10px 4px;

  font-size: 10px;

  font-weight: 800;

  color: var(--brand-700);

}

.provider-discovery-phi-notice {

  margin: 0 0 8px;

  font-size: 10px;

  font-weight: 600;

  color: var(--muted);

  line-height: 1.35;

}

.provider-discovery-source-block {

  display: grid;

  gap: 4px;

}

.provider-discovery-source-label {

  font-size: 10px;

  font-weight: 800;

  color: var(--muted);

  text-transform: uppercase;

  letter-spacing: 0.04em;

}

.provider-discovery-source-indicator {

  margin: 0;

  padding: 6px 8px;

  border-radius: 8px;

  font-size: 11px;

  font-weight: 650;

  line-height: 1.35;

  background: color-mix(in srgb, var(--brand-600) 6%, var(--surface));

  border: 1px solid color-mix(in srgb, var(--brand-600) 16%, var(--border));

  color: var(--brand-800);

}

.provider-discovery-source-empty {

  margin: 0;

  font-size: 11px;

  color: var(--muted);

}

.provider-discovery-field--source span {

  font-size: 10px;

  font-weight: 700;

  color: var(--muted);

}

.provider-discovery-sheet-head-text {

  min-width: 0;

  flex: 1;

}

.provider-discovery-sheet-subtitle {

  margin: 2px 0 0;

  font-size: 11px;

  font-weight: 650;

  color: var(--muted);

  line-height: 1.35;

}

.provider-discovery-editor-actions--sheet {

  position: sticky;

  bottom: 0;

  padding-top: 8px;

  margin-top: 4px;

  background: linear-gradient(180deg, transparent, #fff 28%);

}

.provider-discovery-editor-actions--sheet .provider-profile-action--primary {

  width: 100%;

  min-height: 40px;

}

@media (max-width: 768px) {

  .provider-profile-root--planning-tab .provider-profile-header {

    padding: 6px 12px 4px;

  }

  .provider-profile-root--planning-tab .provider-profile-name {

    font-size: 16px;

    line-height: 1.2;

  }

  .provider-profile-root--planning-tab .provider-profile-sub {

    font-size: 11px;

    display: -webkit-box;

    -webkit-line-clamp: 1;

    -webkit-box-orient: vertical;

    overflow: hidden;

  }

  .provider-profile-root--planning-tab .provider-profile-chips {

    margin-top: 4px;

    gap: 3px;

  }

  .provider-profile-root--planning-tab .provider-profile-chip {

    font-size: 9px;

    padding: 2px 6px;

  }

  .provider-profile-root--planning-tab .provider-profile-actions {

    display: none;

  }

  .provider-profile-sticky--planning .provider-profile-tabs {

    padding: 4px 8px 6px;

  }

  .provider-profile-tab {

    min-height: 26px;

    padding: 0 8px;

    font-size: 10px;

  }

  .provider-profile-body {

    padding: 6px 10px calc(50px + env(safe-area-inset-bottom, 0px));

    gap: 6px;

  }

  .provider-planning-summary {

    margin-bottom: 6px;

    padding: 0;

    border: none;

    background: transparent;

  }

  .provider-planning-accordion--mobile .provider-planning-accordion-progress {

    margin-bottom: 6px;

  }

  .provider-planning-accordion--mobile .provider-accordion-trigger {

    padding: 7px 8px;

  }

  .provider-planning-accordion--mobile .provider-accordion-title {

    font-size: 11px;

  }

  .provider-planning-accordion--mobile .provider-accordion-preview {

    font-size: 10px;

    -webkit-line-clamp: 1;

    display: -webkit-box;

    -webkit-box-orient: vertical;

    overflow: hidden;

  }

  .provider-planning-accordion--mobile .provider-accordion-badge {

    font-size: 8px;

    padding: 2px 5px;

  }

  .provider-accordion-panel--mobile {

    padding: 6px 8px 8px;

  }

  .provider-accordion-panel--mobile .provider-profile-field {

    gap: 3px;

  }

  .provider-accordion-panel--mobile .provider-profile-field label {

    font-size: 10px;

  }

  .provider-accordion-panel--mobile .provider-profile-field textarea {

    min-height: 52px;

    font-size: 13px;

    padding: 7px 9px;

  }

  .provider-accordion-panel:has(.provider-discovery-section--embedded) {

    padding: 0;

  }

  .provider-discovery-section--embedded .provider-discovery-list {

    gap: 4px;

    padding: 0 6px 6px;

  }

  .provider-discovery-row-trigger {

    padding: 7px 8px;

  }

  .provider-discovery-row-question {

    -webkit-line-clamp: 1;

  }

  .provider-planning-save-bar--mobile {

    position: fixed;

    left: 0;

    right: 0;

    bottom: 0;

    z-index: 25;

    margin: 0;

    padding: 5px 10px calc(5px + env(safe-area-inset-bottom, 0px));

    background: color-mix(in srgb, #fff 96%, transparent);

    backdrop-filter: blur(6px);

    border-top: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));

    box-shadow: none;

  }

  .provider-planning-save-bar--mobile .provider-profile-action--primary {

    flex: 1;

    min-height: 34px;

    font-size: 12px;

  }

}

@media (min-width: 720px) {

  .provider-profile-name {

    font-size: 22px;

  }



  .provider-profile-actions {

    display: flex;

    flex-wrap: wrap;

  }



  .provider-profile-action {

    flex: 0 0 auto;

    min-width: 100px;

    padding: 0 12px;

    font-size: 12px;

  }



  .provider-profile-body {

    padding: 12px 14px 24px;

    gap: 12px;

    max-width: 720px;

  }

  .provider-profile-root--intelligence-tab .provider-profile-body {
    max-width: none;
    width: 100%;
    margin: 0;
  }

  .provider-profile-root--cases-tab .provider-profile-body {
    max-width: none;
    width: 100%;
    margin: 0;
    min-width: 0;
    overflow-x: clip;
  }

  .provider-profile-root--cases-tab .provider-profile-body > * {
    max-width: 100%;
    min-width: 0;
  }

}

.provider-engagements-tab {
  display: grid;
  gap: 20px;
}

.provider-engagements-org-hint {
  margin: 0 0 10px;
  font-size: 12px;
  color: var(--muted);
  line-height: 1.4;
}

.provider-engagements-tab-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.provider-engagement-list .provider-engagement-row {
  align-items: flex-start;
}

.provider-engagement-row-end {
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.provider-engagement-meta {
  display: block;
  font-size: 11px;
  color: var(--muted);
  line-height: 1.35;
  margin-top: 4px;
}

.provider-compact-pill--complete {
  background: color-mix(in srgb, var(--success) 12%, var(--surface));
  color: #166534;
}

.provider-engagement-mobile-list {
  display: none;
  gap: 10px;
}

.provider-engagement-mobile-card {
  border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
  border-radius: 12px;
  background: #fff;
  overflow: hidden;
}

.provider-engagement-mobile-card-main {
  display: block;
  padding: 12px 14px;
  text-decoration: none;
  color: inherit;
}

.provider-engagement-mobile-card-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 10px;
}

.provider-engagement-mobile-card-title {
  margin: 0;
  font-size: 15px;
  font-weight: 800;
  line-height: 1.3;
}

.provider-engagement-card-status {
  flex-shrink: 0;
  padding: 3px 8px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  border: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));
  background: color-mix(in srgb, var(--foreground) 4%, var(--surface));
  color: var(--muted);
}

.provider-engagement-card-status--active {
  border-color: color-mix(in srgb, var(--brand-600) 22%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 8%, var(--surface));
  color: var(--brand-700);
}

.provider-engagement-card-status--completed {
  border-color: color-mix(in srgb, var(--success) 28%, var(--border));
  background: color-mix(in srgb, var(--success) 10%, var(--surface));
  color: #166534;
}

.provider-engagement-mobile-card-sub,
.provider-engagement-mobile-card-when {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--muted);
  line-height: 1.4;
}

.provider-engagement-mobile-card-badges {
  margin-top: 8px;
}

.provider-engagement-mobile-pill {
  display: inline-flex;
  padding: 3px 8px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 800;
  border: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));
  background: color-mix(in srgb, var(--foreground) 4%, var(--surface));
  color: var(--muted);
}

.provider-engagement-mobile-pill--done {
  border-color: color-mix(in srgb, var(--success) 28%, var(--border));
  background: color-mix(in srgb, var(--success) 10%, var(--surface));
  color: #166534;
}

.provider-engagement-mobile-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 0 10px 10px;
  border-top: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
}

.provider-engagement-mobile-action {
  flex: 1 1 calc(50% - 4px);
  min-height: 36px;
  padding: 0 8px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 800;
  text-decoration: none;
  text-align: center;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid color-mix(in srgb, var(--brand-600) 16%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 5%, var(--surface));
  color: var(--brand-700);
  cursor: pointer;
  font-family: inherit;
}

.provider-engagement-mobile-action--primary {
  background: var(--brand-600);
  color: #fff;
  border-color: color-mix(in srgb, var(--brand-600) 80%, black);
}

.provider-engagement-mobile-action:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

@media (max-width: 768px) {
  .provider-engagement-list--desktop {
    display: none !important;
  }

  .provider-engagement-mobile-list {
    display: grid;
  }

  .provider-engagements-tab-actions .provider-profile-action {
    width: 100%;
    justify-content: center;
  }
}

@media (min-width: 769px) {
  .provider-engagement-mobile-list {
    display: none !important;
  }
}

/* Provider Intelligence — mobile briefing (390–400px targets) */
@media (max-width: 480px) {
  .provider-planning-accordion--scannable.provider-intel-workspace {
    max-width: none;
    width: 100%;
    overflow-x: clip;
    gap: 8px;
    padding: 0 10px 12px;
    box-sizing: border-box;
  }

  .provider-intel-workspace-top {
    order: 90;
    margin: 4px 0 0;
    font-size: 10px;
  }

  .provider-intel-workspace-command-aside {
    display: none;
  }

  .provider-intel-workspace-operational-aside {
    display: none;
  }

  .provider-intel-workspace-tier + .provider-intel-workspace-tier {
    margin-top: 10px;
    padding-top: 8px;
  }

  .provider-intel-workspace-tier--command {
    margin-top: 6px;
  }

  .provider-intel-discovery-hero {
    order: 0;
    margin: 0 0 6px;
    padding: 8px 10px 8px;
    max-width: 100%;
    overflow: hidden;
  }

  .provider-intel-discovery-hero-title {
    font-size: 14px;
  }

  .provider-intel-discovery-hero-commercial {
    font-size: 13px;
  }

  .provider-intel-discovery-priority {
    padding: 10px 10px;
  }

  .provider-intel-discovery-priority-headline {
    font-size: 14px;
  }

  .provider-intel-discovery-priority-narrative-row {
    grid-template-columns: 3.75rem minmax(0, 1fr);
  }

  .provider-intel-ws-summary {
    order: 1;
    margin: 0 0 6px;
    padding: 7px 8px;
    max-width: 100%;
    overflow: hidden;
  }

  .provider-intel-ws-summary-context-btn {
    display: none;
  }

  .provider-intel-ws-summary-detail {
    display: none;
  }

  .provider-intel-ws-summary-cards {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 6px;
    margin-bottom: 0;
  }

  .provider-intel-ws-summary-card {
    min-height: 48px;
    padding: 7px 7px;
  }

  .provider-intel-ws-summary-card-title {
    font-size: 9px;
    line-height: 1.2;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .provider-intel-ws-summary-card-scan .provider-intel-ws-summary-card-gap {
    display: none;
  }

  .provider-intel-ws-summary-gaps {
    display: none;
  }

  .provider-intel-workspace-areas {
    order: 3;
    min-width: 0;
  }

  .provider-intel-section-cards {
    min-width: 0;
  }

  .provider-intel-compact-card-trigger {
    min-height: 40px;
    padding: 7px 8px;
  }

  .provider-intel-compact-card-title {
    font-size: 11px;
    line-height: 1.25;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .provider-intel-section-completion-meta,
  .provider-intel-section-progress {
    display: none;
  }

  .provider-intel-section-collapsed--briefing,
  .provider-intel-section-collapsed--scan {
    padding: 0 8px 8px;
  }

  .provider-intel-section-detail-value {
    font-size: 13px;
  }

  .provider-intel-progressive--interview .provider-intel-progressive-prompt {
    font-size: 14px;
  }

  .provider-intel-progressive-why-text {
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .provider-intel-segmented {
    flex-wrap: wrap;
    max-width: 100%;
  }

  .provider-intel-segmented .provider-discovery-confidence-btn {
    flex: 1 1 auto;
    min-width: 0;
    min-height: 40px;
    font-size: 11px;
    padding: 8px 10px;
  }

  .provider-discovery-tags {
    flex-wrap: wrap;
    max-width: 100%;
  }

  .provider-discovery-tag {
    min-height: 40px;
    padding: 8px 12px;
  }

  .provider-intel-progressive-nav-btn {
    min-height: 44px;
    padding: 10px 14px;
  }

  .provider-planning-fields--compact .provider-planning-fields--grid {
    grid-template-columns: 1fr;
  }

  .provider-planning-save-bar--mobile.provider-planning-save-bar--compact {
    order: 95;
    position: sticky;
    bottom: 0;
    z-index: 5;
    margin: 8px -10px 0;
    padding: 8px 10px;
    background: color-mix(in srgb, var(--surface) 92%, transparent);
    border-top: 1px solid var(--border);
    backdrop-filter: blur(6px);
  }

  .provider-planning-save-bar--mobile .provider-profile-action {
    width: 100%;
    min-height: 36px;
  }
}

@media (min-width: 769px) {
  .provider-profile-root--intelligence-tab .provider-planning-accordion--scannable.provider-intel-workspace {
    padding: 0 4px 8px;
  }

  .provider-profile-root--intelligence-tab .provider-intel-workspace-tier + .provider-intel-workspace-tier {
    margin-top: 16px;
    padding-top: 0;
    border-top: none;
  }
}

@media (max-width: 768px) {
  .provider-profile-root--intelligence-tab .provider-profile-header {
    padding: 6px 12px 4px;
  }
  .provider-profile-root--intelligence-tab .provider-profile-name {
    font-size: 16px;
    line-height: 1.2;
  }
  .provider-profile-root--intelligence-tab .provider-profile-sub {
    font-size: 11px;
    display: -webkit-box;
    -webkit-line-clamp: 1;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .provider-profile-root--intelligence-tab .provider-profile-chips {
    margin-top: 4px;
    gap: 3px;
  }
  .provider-profile-root--intelligence-tab .provider-profile-chip {
    font-size: 9px;
    padding: 2px 6px;
  }
  .provider-profile-root--intelligence-tab .provider-profile-actions {
    display: none;
  }
  .provider-profile-sticky--intelligence .provider-profile-tabs {
    padding: 4px 8px 6px;
  }
}

.provider-profile-saved-banner {
  position: relative;
  margin: 0 12px 6px;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));
  background: color-mix(in srgb, var(--foreground) 2%, var(--surface));
  box-shadow: none;
}

.provider-profile-saved-banner--compact {
  padding: 7px 10px 7px;
  padding-right: 64px;
}

.provider-profile-saved-banner-inner {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 8px 14px;
}

.provider-profile-saved-banner-copy {
  flex: 1 1 200px;
  min-width: 0;
}

.provider-profile-saved-banner p {
  margin: 0;
  font-size: 12px;
  line-height: 1.4;
}

.provider-profile-saved-banner-title {
  margin: 0 0 2px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: -0.01em;
  line-height: 1.25;
  color: var(--foreground);
}

.provider-profile-saved-banner-hint {
  margin: 0;
  font-size: 11px;
  line-height: 1.35;
  color: color-mix(in srgb, var(--foreground) 55%, transparent);
  font-style: normal;
}

.provider-profile-saved-banner--compact .provider-act-row {
  flex: 1 1 280px;
  margin: 0;
}

.provider-profile-saved-banner-lead {
  margin: 0 0 8px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--muted);
}

.provider-profile-saved-banner .provider-act-row {
  margin-top: 0;
}

.provider-profile-saved-dismiss {
  margin-top: 8px;
  padding: 0;
  border: none;
  background: none;
  font-size: 11px;
  font-weight: 600;
  font-family: inherit;
  color: var(--muted);
  cursor: pointer;
  text-decoration: none;
}

.provider-profile-saved-dismiss:hover {
  color: var(--foreground);
  text-decoration: underline;
  text-underline-offset: 2px;
}

.provider-profile-saved-dismiss--corner {
  position: absolute;
  top: 6px;
  right: 8px;
  margin: 0;
  font-size: 10px;
  font-weight: 600;
  color: color-mix(in srgb, var(--foreground) 48%, transparent);
  z-index: 1;
}

.provider-profile-action--ghost {
  background: transparent;
  border-color: transparent;
  color: var(--muted);
}

.provider-rel-status-card {
  padding: 10px 12px;
}

.provider-rel-status-summary {
  display: grid;
  gap: 8px;
}

.provider-rel-status-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  font-size: 12px;
}

.provider-rel-status-label {
  font-weight: 700;
  color: var(--muted);
}

.provider-rel-status-value {
  font-size: 11px;
  font-weight: 800;
  padding: 3px 8px;
  border-radius: 999px;
  white-space: nowrap;
}

.provider-rel-status-summary--compact .provider-rel-status-row {
  font-size: 11px;
}

/* Account investigation — executive briefing (minimal surface) */
.provider-intel-workspace--investigation {
  gap: 0;
  background: color-mix(in srgb, var(--foreground) 2%, var(--background));
}

.provider-investigation {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 2px 0 4px;
  max-width: 640px;
}

.provider-investigation-hero {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 0;
}

.provider-investigation-summary {
  margin: 0;
  font-size: 15px;
  line-height: 1.5;
  font-weight: 500;
  color: var(--foreground);
}

.provider-investigation-deploy {
  margin: 0;
  font-size: 13px;
  line-height: 1.45;
  font-weight: 650;
  color: color-mix(in srgb, var(--foreground) 75%, var(--muted));
}

.provider-investigation-deploy--clear {
  color: color-mix(in srgb, var(--brand-700, var(--brand-600)) 85%, var(--foreground));
}

.provider-investigation-deploy--caution {
  color: color-mix(in srgb, var(--foreground) 65%, #92400e);
}

.provider-investigation-deploy--hold {
  color: color-mix(in srgb, var(--foreground) 70%, var(--muted));
}

.provider-investigation-stale-toggle,
.provider-investigation-missing-toggle {
  margin: 0;
  padding: 0;
  border: none;
  background: none;
  font-size: 12px;
  line-height: 1.4;
  color: var(--muted);
  text-align: left;
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.provider-investigation-stale-list,
.provider-investigation-missing-list {
  margin: 6px 0 0;
  padding: 0 0 0 16px;
  font-size: 12px;
  line-height: 1.4;
  color: var(--muted);
}

.provider-investigation-missing-link {
  padding: 0;
  border: none;
  background: none;
  font-size: 12px;
  color: var(--brand-700, var(--brand-600));
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.provider-investigation-hero-action {
  margin-top: 4px;
  padding-top: 12px;
  border-top: 1px solid var(--border);
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px 14px;
}

.provider-investigation-action-line {
  margin: 0;
  flex: 1 1 12rem;
  font-size: 14px;
  font-weight: 700;
  line-height: 1.35;
  color: var(--foreground);
}

.provider-investigation-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.provider-investigation-section-title {
  margin: 0;
  font-size: 11px;
  font-weight: 750;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--muted);
}

/* Operational warnings — calm caution cards */
.provider-op-warnings {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.provider-op-warnings-title {
  margin: 0;
  font-size: 11px;
  font-weight: 750;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--muted);
}

.provider-op-warnings-stack {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.provider-op-warning-card {
  padding: 14px 16px;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));
  background: var(--surface);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.provider-op-warning-title {
  margin: 0;
  font-size: 15px;
  font-weight: 750;
  line-height: 1.35;
  color: var(--foreground);
}

.provider-op-warning-facts {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.provider-op-warning-facts > div {
  display: grid;
  gap: 2px;
}

.provider-op-warning-facts dt {
  margin: 0;
  font-size: 11px;
  font-weight: 700;
  color: var(--muted);
}

.provider-op-warning-facts dd {
  margin: 0;
  font-size: 13px;
  line-height: 1.45;
  color: color-mix(in srgb, var(--foreground) 82%, var(--muted));
}

.provider-op-warning-cta {
  align-self: flex-start;
  font-size: 12px;
  font-weight: 700;
  padding: 8px 14px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--brand-600) 35%, var(--border));
  background: var(--surface);
  color: var(--brand-700, var(--brand-600));
  cursor: pointer;
}

.provider-op-warning-cta:hover {
  border-color: color-mix(in srgb, var(--brand-600) 50%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 6%, var(--surface));
}

.provider-investigation-onfile-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.provider-investigation-onfile-row {
  width: 100%;
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 6px 12px;
  padding: 8px 0;
  border: none;
  border-bottom: 1px solid color-mix(in srgb, var(--border) 70%, transparent);
  background: none;
  text-align: left;
  cursor: pointer;
}

.provider-investigation-onfile-row:last-child {
  border-bottom: none;
}

.provider-investigation-onfile-label {
  font-size: 12px;
  font-weight: 700;
  color: var(--muted);
  min-width: 5.5rem;
}

.provider-investigation-onfile-value {
  font-size: 13px;
  line-height: 1.4;
  color: var(--foreground);
  flex: 1;
}

.provider-investigation-cta {
  flex-shrink: 0;
  font-size: 12px;
  font-weight: 700;
  padding: 6px 12px;
  border-radius: 7px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--foreground);
  cursor: pointer;
}

.provider-investigation-cta--primary {
  background: var(--brand-600);
  border-color: var(--brand-600);
  color: #fff;
}

.provider-investigation-empty {
  margin: 0;
  font-size: 13px;
  color: var(--muted);
}

.provider-investigation-details-toggle {
  width: 100%;
  text-align: left;
  padding: 12px 0;
  margin-top: 16px;
  border: none;
  border-top: 1px solid var(--border);
  background: none;
  font-size: 13px;
  font-weight: 700;
  color: color-mix(in srgb, var(--foreground) 70%, var(--muted));
  cursor: pointer;
}

.provider-intel-section-cards--executive .provider-intel-confidence-badge,
.provider-intel-section-card--executive .provider-intel-confidence-badge,
.provider-intel-section-card--executive .provider-intel-section-progress,
.provider-intel-section-card--executive .provider-intel-section-completion-meta {
  display: none !important;
}

.provider-intel-section-collapsed-executive {
  margin: 0 0 0 12px;
  padding: 0 28px 10px 0;
  font-size: 12px;
  line-height: 1.4;
  color: var(--muted);
}

.provider-intel-workspace--investigation .provider-intel-workspace-tier--areas {
  margin-top: 0;
  padding-top: 0;
  border-top: none;
}

/* Recommended field discoveries — stacked guidance cards */
.provider-field-discoveries {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.provider-field-discoveries-title {
  margin: 0;
  font-size: 11px;
  font-weight: 750;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--muted);
}

.provider-field-discoveries-stack {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.provider-field-discovery-card {
  padding: 16px 18px;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: var(--surface);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.provider-field-discovery-title {
  margin: 0;
  font-size: 16px;
  font-weight: 800;
  line-height: 1.3;
  letter-spacing: -0.02em;
  color: var(--foreground);
}

.provider-field-discovery-facts {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.provider-field-discovery-facts > div {
  display: grid;
  gap: 3px;
}

.provider-field-discovery-facts dt {
  margin: 0;
  font-size: 11px;
  font-weight: 750;
  color: var(--muted);
}

.provider-field-discovery-facts dd {
  margin: 0;
  font-size: 14px;
  line-height: 1.45;
  color: color-mix(in srgb, var(--foreground) 88%, var(--muted));
}

.provider-field-discovery-cta {
  align-self: flex-start;
  margin-top: 2px;
  font-size: 13px;
  font-weight: 750;
  padding: 10px 16px;
  border-radius: 8px;
  border: none;
  background: var(--brand-600);
  color: #fff;
  cursor: pointer;
}

.provider-field-discovery-cta:hover {
  background: color-mix(in srgb, var(--brand-600) 90%, #000);
}

@media (max-width: 640px) {
  .provider-intel-area-lane-grid {
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 3px 8px;
  }

  .provider-intel-area-lane-cell--area {
    grid-column: 1;
  }

  .provider-intel-area-lane-cell--state {
    grid-column: 2;
    grid-row: 1;
    align-items: flex-end;
  }

  .provider-intel-area-lane-cell--blocker,
  .provider-intel-area-lane-cell--unlock {
    grid-column: 1 / -1;
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 2px 6px;
  }

  .provider-intel-area-lane-cell--cta {
    grid-column: 1 / -1;
  }

  .provider-intel-area-lane-title {
    font-size: 11px;
  }

  .provider-intel-area-lane-kicker {
    flex-shrink: 0;
  }

  .provider-intel-area-lane-value {
    font-size: 10px;
    -webkit-line-clamp: 1;
  }

  .provider-readiness-freshness-warn {
    display: none;
  }

  .provider-investigation {
    gap: 16px;
  }

  .provider-investigation-hero-action {
    flex-direction: column;
    align-items: stretch;
  }

  .provider-investigation-cta--primary {
    width: 100%;
  }

  .provider-field-discovery-cta {
    width: 100%;
    text-align: center;
  }
}

/* Shared facility vs provider-specific intelligence */
.provider-intel-scope-split {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin: 0;
}

.provider-intel-scope-panel {
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
  background: #fff;
  box-shadow: 0 1px 0 rgba(15, 23, 42, 0.03);
}

.provider-intel-scope-panel--facility {
  border-color: color-mix(in srgb, #0d9488 18%, var(--border));
  background: color-mix(in srgb, #0d9488 3%, #fff);
}

.provider-intel-scope-panel--provider {
  border-color: color-mix(in srgb, var(--brand-600) 18%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 3%, #fff);
}

.provider-intel-scope-panel-head {
  margin-bottom: 10px;
  padding-bottom: 8px;
  border-bottom: 1px solid color-mix(in srgb, var(--border) 80%, transparent);
}

.provider-intel-scope-panel-title {
  margin: 0;
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.02em;
  color: var(--foreground);
}

.provider-intel-scope-panel--facility .provider-intel-scope-panel-title {
  color: #0f766e;
}

.provider-intel-scope-panel--provider .provider-intel-scope-panel-title {
  color: var(--brand-700);
}

.provider-intel-scope-panel-subtitle {
  margin: 4px 0 0;
  font-size: 12px;
  font-weight: 650;
  color: var(--muted);
}

.provider-intel-scope-inherit-line {
  margin: 4px 0 0;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #0f766e;
}

.provider-intel-scope-bullet-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 6px;
}

.provider-intel-scope-bullet {
  margin: 0;
  font-size: 13px;
  line-height: 1.4;
  color: var(--foreground);
}

.provider-intel-scope-bullet-btn {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  width: 100%;
  padding: 4px 6px;
  margin: -4px -6px;
  border: none;
  border-radius: 6px;
  background: transparent;
  text-align: left;
  cursor: pointer;
  font: inherit;
  color: inherit;
}

.provider-intel-scope-bullet-btn:hover {
  background: color-mix(in srgb, var(--foreground) 5%, transparent);
}

.provider-intel-scope-bullet-marker {
  flex-shrink: 0;
  font-weight: 800;
  color: var(--muted);
}

.provider-intel-scope-bullet--known .provider-intel-scope-bullet-marker {
  color: color-mix(in srgb, var(--brand-600) 70%, var(--muted));
}

.provider-intel-scope-bullet--gap {
  color: color-mix(in srgb, var(--foreground) 72%, var(--muted));
  font-style: italic;
}

.provider-intel-scope-empty {
  margin: 0;
  font-size: 12px;
  line-height: 1.45;
  color: var(--muted);
}

@media (max-width: 768px) {
  .provider-intel-scope-split {
    grid-template-columns: 1fr;
  }
}

`;


