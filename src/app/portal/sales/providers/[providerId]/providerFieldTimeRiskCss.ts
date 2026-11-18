/** Field execution risk indicator — overview + profile surfaces */
export const providerFieldTimeRiskCss = `
.provider-field-time-risk {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.provider-field-time-risk--hero {
  padding: 8px 10px;
  border-radius: 7px;
  border: none;
  background: color-mix(in srgb, var(--foreground) 4%, #fff);
}

.provider-field-time-risk--success.provider-field-time-risk--hero {
  background: color-mix(in srgb, #047857 5%, #fff);
}

.provider-field-time-risk--caution.provider-field-time-risk--hero {
  border: 1px solid color-mix(in srgb, #d97706 28%, var(--border));
  background: color-mix(in srgb, #d97706 6%, #fff);
}

.provider-field-time-risk--warn.provider-field-time-risk--hero {
  border: 1px solid color-mix(in srgb, #d97706 32%, var(--border));
  background: color-mix(in srgb, #d97706 7%, #fff);
}

.provider-field-time-risk--danger.provider-field-time-risk--hero {
  border: 1px solid color-mix(in srgb, #b91c1c 30%, var(--border));
  background: color-mix(in srgb, #b91c1c 6%, #fff);
}

.provider-field-time-risk-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}

.provider-field-time-risk-kicker {
  margin: 0 0 2px;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--foreground) 48%, var(--muted));
}

.provider-field-time-risk-title {
  margin: 0;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: color-mix(in srgb, #0f4c5c 55%, var(--muted));
}

.provider-field-time-risk-badge {
  flex-shrink: 0;
  max-width: 55%;
  padding: 3px 8px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 800;
  line-height: 1.25;
  text-align: right;
  letter-spacing: -0.01em;
  overflow-wrap: anywhere;
  white-space: normal;
}

@media (max-width: 480px) {
  .provider-field-time-risk-head {
    flex-wrap: wrap;
    gap: 6px;
  }

  .provider-field-time-risk-badge {
    max-width: 100%;
    text-align: left;
  }
}

.provider-field-time-risk-badge--efficient_field_target {
  color: #047857;
  background: color-mix(in srgb, #047857 12%, #fff);
  border: 1px solid color-mix(in srgb, #047857 28%, transparent);
}

.provider-field-time-risk-badge--worth_exploratory_visit {
  color: #1d4ed8;
  background: color-mix(in srgb, #3b82f6 10%, #fff);
  border: 1px solid color-mix(in srgb, #3b82f6 22%, transparent);
}

.provider-field-time-risk-badge--requires_remote_validation_first {
  color: #92400e;
  background: color-mix(in srgb, #d97706 12%, #fff);
  border: 1px solid color-mix(in srgb, #d97706 28%, transparent);
}

.provider-field-time-risk-badge--high_wasted_field_risk {
  color: #991b1b;
  background: color-mix(in srgb, #b91c1c 10%, #fff);
  border: 1px solid color-mix(in srgb, #b91c1c 28%, transparent);
}

.provider-field-time-risk-guidance {
  margin: 0;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.35;
  color: var(--foreground);
}

.provider-field-time-risk--compact .provider-field-time-risk-guidance {
  font-size: 11px;
}

.provider-field-time-risk-inputs {
  margin: 2px 0 0;
  padding: 0;
  list-style: none;
  display: grid;
  grid-template-columns: 1fr;
  gap: 3px;
}

@media (min-width: 480px) {
  .provider-field-time-risk-inputs {
    grid-template-columns: 1fr 1fr;
    gap: 3px 8px;
  }
}

.provider-field-time-risk-input-btn,
.provider-field-time-risk-input-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
  padding: 4px 6px;
  border-radius: 5px;
  border: none;
  background: color-mix(in srgb, var(--foreground) 3%, #fff);
  font: inherit;
  text-align: left;
}

button.provider-field-time-risk-input-btn {
  cursor: pointer;
}

button.provider-field-time-risk-input-btn:hover {
  background: color-mix(in srgb, var(--brand-600) 7%, #fff);
}

.provider-field-time-risk-input-label {
  font-size: 10px;
  font-weight: 700;
  color: color-mix(in srgb, var(--foreground) 75%, var(--muted));
}

.provider-field-time-risk-input-status {
  flex-shrink: 0;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.provider-field-time-risk-input-status--strong {
  color: #047857;
}

.provider-field-time-risk-input-status--partial {
  color: color-mix(in srgb, #1d4ed8 80%, var(--foreground));
}

.provider-field-time-risk-input-status--open {
  color: #92400e;
}

.provider-field-time-risk-input-status--blocking {
  color: #991b1b;
}

.provider-field-time-risk-input-row--strong {
  opacity: 0.92;
}

.provider-profile-root--command-center .provider-ops-cmd-field-time-risk {
  margin-bottom: 2px;
}

.provider-readiness-stack .provider-field-time-risk--compact {
  margin-top: 2px;
}

/* Predictive narrative layout */
.provider-field-time-risk--predictive .provider-field-time-risk-predictive {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.provider-field-time-risk-block-label {
  display: block;
  margin: 0 0 3px;
  font-size: 9px;
  font-weight: 850;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--muted);
}

.provider-field-time-risk-block-text {
  margin: 0;
  font-size: 12px;
  font-weight: 650;
  line-height: 1.4;
  color: var(--foreground);
}

.provider-field-time-risk-block--fail .provider-field-time-risk-block-label {
  color: color-mix(in srgb, #b91c1c 70%, var(--muted));
}

.provider-field-time-risk--danger .provider-field-time-risk-block--fail .provider-field-time-risk-block-text {
  font-weight: 750;
}

.provider-field-time-risk-block--assumption {
  padding: 6px 8px;
  border-radius: 6px;
  background: color-mix(in srgb, var(--foreground) 4%, #fff);
  border-left: 2px solid color-mix(in srgb, #d97706 45%, transparent);
}

.provider-field-time-risk-block--reduce .provider-field-time-risk-block-label {
  color: color-mix(in srgb, #047857 75%, var(--muted));
}

.provider-field-time-risk-reducers {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 4px;
}

.provider-field-time-risk-reducer-btn,
.provider-field-time-risk-reducer-text {
  display: block;
  font-size: 11px;
  font-weight: 750;
  line-height: 1.35;
  color: color-mix(in srgb, #047857 85%, var(--foreground));
}

button.provider-field-time-risk-reducer-btn {
  padding: 0;
  border: none;
  background: none;
  text-align: left;
  cursor: pointer;
  font-family: inherit;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.provider-field-time-risk-signals-detail {
  margin-top: 4px;
}

.provider-field-time-risk-signals-summary {
  font-size: 10px;
  font-weight: 800;
  color: var(--muted);
  cursor: pointer;
  list-style: none;
}

.provider-field-time-risk-signals-summary::-webkit-details-marker {
  display: none;
}

.provider-field-time-risk-signals {
  margin: 6px 0 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 3px;
}

.provider-field-time-risk-signal-btn {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 1px;
  width: 100%;
  padding: 4px 6px;
  border: none;
  border-radius: 5px;
  background: color-mix(in srgb, var(--foreground) 3%, #fff);
  cursor: pointer;
  font-family: inherit;
  text-align: left;
}

.provider-field-time-risk-signal-label {
  font-size: 10px;
  font-weight: 800;
  color: var(--foreground);
}

.provider-field-time-risk-signal-scan {
  font-size: 10px;
  font-weight: 650;
  color: var(--muted);
}

.provider-field-time-risk-compact-scan {
  margin: 0;
  font-size: 11px;
  font-weight: 650;
  line-height: 1.35;
  color: var(--foreground);
}

.provider-field-time-risk--hero .provider-field-time-risk-predictive {
  gap: 6px;
}

.provider-field-time-risk--hero .provider-field-time-risk-block-text {
  font-size: 11px;
}

.provider-field-time-risk--compact .provider-field-time-risk-predictive {
  display: none;
}

.provider-field-time-risk-posture {
  margin: 2px 0 0;
  font-size: 11px;
  font-weight: 700;
  line-height: 1.3;
  color: color-mix(in srgb, var(--foreground) 72%, var(--muted));
}

.provider-field-time-risk-dimensions {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0;
  border-top: 1px solid color-mix(in srgb, var(--foreground) 6%, transparent);
}

.provider-field-time-risk-dimension {
  padding: 4px 0;
  border-bottom: 1px solid color-mix(in srgb, var(--foreground) 4%, transparent);
}

.provider-field-time-risk-dimension:last-child {
  border-bottom: none;
}

.provider-field-time-risk-dimension-btn {
  display: grid;
  grid-template-columns: auto 1fr;
  grid-template-rows: auto auto;
  gap: 1px 6px;
  width: 100%;
  padding: 0;
  border: none;
  background: none;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.provider-field-time-risk-dimension-label {
  grid-column: 1;
  font-size: 9px;
  font-weight: 900;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--foreground) 55%, var(--muted));
}

.provider-field-time-risk-dimension-level {
  grid-column: 2;
  justify-self: start;
  font-size: 9px;
  font-weight: 800;
  padding: 1px 5px;
  border-radius: 3px;
}

.provider-field-time-risk-dimension--critical .provider-field-time-risk-dimension-level,
.provider-field-time-risk-dimension--high .provider-field-time-risk-dimension-level {
  color: #92400e;
  background: color-mix(in srgb, #f59e0b 10%, transparent);
}

.provider-field-time-risk-dimension--low .provider-field-time-risk-dimension-level,
.provider-field-time-risk-dimension--elevated .provider-field-time-risk-dimension-level {
  color: color-mix(in srgb, var(--foreground) 55%, var(--muted));
  background: color-mix(in srgb, var(--foreground) 4%, transparent);
}

.provider-field-time-risk-dimension-scan {
  grid-column: 1 / -1;
  font-size: 10px;
  font-weight: 600;
  line-height: 1.3;
  color: color-mix(in srgb, var(--foreground) 68%, var(--muted));
}

.provider-field-time-risk-dimension-btn:hover .provider-field-time-risk-dimension-scan {
  color: var(--brand-700, var(--brand-600));
}
`;
