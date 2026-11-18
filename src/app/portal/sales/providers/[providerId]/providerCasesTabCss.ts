/** Provider Cases tab — timeline index matching design mockup. */
export const providerCasesTabCss = `
.provider-profile-root--cases-tab .provider-tab-workspace {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  overflow-x: clip;
}

.provider-profile-root--cases-tab .provider-profile-body {
  overflow-x: clip;
}

.provider-profile-root--cases-tab .provider-profile-body > * {
  max-width: 100%;
  min-width: 0;
}

.pct {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
}

.pct-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  min-width: 0;
  padding: 18px 20px;
  border-radius: 18px;
  border: 1px solid color-mix(in srgb, var(--brand-600) 14%, var(--border));
  background:
    radial-gradient(circle at top left, color-mix(in srgb, var(--brand-600) 11%, transparent), transparent 34%),
    linear-gradient(135deg, #fff 0%, color-mix(in srgb, var(--brand-600) 3%, var(--surface)) 100%);
  box-shadow: 0 10px 28px color-mix(in srgb, var(--foreground) 5%, transparent);
}

.pct-head-copy {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.pct-head-eyebrow {
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--brand-700) 78%, var(--foreground));
}

.pct-head-title {
  margin: 0;
  font-size: clamp(20px, 3vw, 28px);
  font-weight: 900;
  letter-spacing: -0.045em;
  color: var(--foreground);
}

.pct-head-subtitle {
  max-width: 560px;
  margin: 0;
  font-size: 13px;
  font-weight: 650;
  line-height: 1.45;
  color: color-mix(in srgb, var(--foreground) 62%, var(--muted));
}

.pct-head-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  padding: 0 14px;
  border-radius: 999px;
  border: 1px solid var(--brand-600);
  background: var(--brand-600);
  color: #fff;
  font-size: 12px;
  font-weight: 900;
  text-decoration: none;
  white-space: nowrap;
  flex-shrink: 0;
  box-shadow: 0 8px 18px color-mix(in srgb, var(--brand-600) 18%, transparent);
}

.pct-head-action:hover {
  filter: brightness(1.04);
}

.pct-empty {
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 28px 20px;
  border-radius: 18px;
  border: 1px dashed color-mix(in srgb, var(--brand-600) 22%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 3%, #fff);
  font-size: 14px;
  line-height: 1.45;
  color: var(--muted);
  text-align: center;
}

.pct-empty strong {
  font-size: 16px;
  color: var(--foreground);
}

.pct-empty p {
  margin: 0;
}

.pct-empty-cta {
  display: inline-flex;
  margin-top: 10px;
  min-height: 44px;
  padding: 0 12px;
  align-items: center;
  border-radius: 7px;
  border: 1px solid var(--brand-600);
  background: var(--brand-600);
  color: #fff;
  font-size: 11px;
  font-weight: 800;
  text-decoration: none;
}

.pct-table-head {
  display: none;
}

.pct-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
  max-width: 100%;
  width: 100%;
  box-sizing: border-box;
}

.pct-row {
  position: relative;
  display: grid;
  gap: 9px;
  padding: 11px 12px;
  border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
  border-left: 3px solid color-mix(in srgb, var(--brand-600) 58%, var(--border));
  border-radius: 12px;
  background: #fff;
  min-width: 0;
  max-width: 100%;
  box-sizing: border-box;
  overflow-wrap: anywhere;
  isolation: isolate;
  box-shadow: 0 8px 22px color-mix(in srgb, var(--foreground) 4%, transparent);
  transition:
    border-color 150ms ease,
    box-shadow 150ms ease,
    transform 150ms ease;
}

.pct-row:hover {
  border-color: color-mix(in srgb, var(--brand-600) 24%, var(--border));
  box-shadow: 0 12px 28px color-mix(in srgb, var(--brand-600) 8%, transparent);
  transform: translateY(-1px);
}

.pct-row::before {
  content: none;
}

.pct-row::after {
  content: none;
}

.pct-row-main {
  display: grid;
  gap: 8px;
  min-width: 0;
}

.pct-row-meta {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 220px), 1fr));
  gap: 8px;
  min-width: 0;
  padding-top: 8px;
  border-top: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
}

.pct-mobile-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 2px;
}

.pct-row-type {
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--brand-700) 78%, var(--foreground));
}

.pct-row-title {
  margin: 0;
  font-size: 15px;
  font-weight: 900;
  line-height: 1.18;
  letter-spacing: -0.03em;
  color: var(--foreground);
  overflow-wrap: anywhere;
  word-break: break-word;
}

.pct-row-title a {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  color: inherit;
  text-decoration: none;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.pct-row-title a:hover {
  color: var(--brand-700);
}

.pct-row-sub {
  margin: 3px 0 0;
  font-size: 11px;
  font-weight: 700;
  line-height: 1.25;
  color: var(--muted);
  overflow-wrap: anywhere;
  word-break: break-word;
}

.pct-section-label {
  display: block;
  margin-bottom: 4px;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--foreground) 42%, var(--muted));
}

.pct-row-sub-sep,
.pct-date--inline {
  display: inline;
}

.pct-col--case,
.pct-col--date,
.pct-col--status,
.pct-col--completion,
.pct-col--signals,
.pct-col--actions {
  min-width: 0;
  max-width: 100%;
  overflow-wrap: anywhere;
}

.pct-row-meta > .pct-col {
  min-width: 0;
  padding: 7px 8px;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
  background: color-mix(in srgb, var(--foreground) 1.5%, #fff);
}

.pct-col--date,
.pct-col--completion {
  display: block;
}

.pct-col--signals {
  min-width: 0;
}

.pct-col--actions {
  padding-top: 2px;
  min-width: 0;
}

.pct-status {
  display: inline-flex;
  align-items: center;
  min-height: 22px;
  padding: 0 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 900;
  white-space: nowrap;
  flex-shrink: 0;
  border: 1px solid currentColor;
}

.pct-status--scheduled {
  background: color-mix(in srgb, #2563eb 10%, #fff);
  color: #1d4ed8;
}

.pct-status--in_progress,
.pct-status--confirmed {
  background: color-mix(in srgb, #d97706 12%, #fff);
  color: #b45309;
}

.pct-status--completed,
.pct-status--closed,
.pct-status--debrief_planned {
  background: color-mix(in srgb, #16a34a 12%, #fff);
  color: #166534;
}

.pct-status--rescheduled {
  background: color-mix(in srgb, #7c3aed 10%, #fff);
  color: #5b21b6;
}

.pct-status--cancelled {
  background: color-mix(in srgb, var(--foreground) 6%, #fff);
  color: var(--muted);
}

.pct-date {
  font-size: 11px;
  font-weight: 650;
  color: color-mix(in srgb, var(--foreground) 70%, var(--muted));
  white-space: normal;
  overflow-wrap: anywhere;
}

.pct-completion-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.pct-completion-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-height: 20px;
  padding: 2px 6px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--foreground) 7%, var(--border));
  background: color-mix(in srgb, var(--foreground) 2%, #fff);
  font-size: 11px;
  font-weight: 750;
  line-height: 1.2;
  color: var(--muted);
}

.pct-completion-item--done {
  border-color: color-mix(in srgb, #16a34a 18%, var(--border));
  background: color-mix(in srgb, #16a34a 7%, #fff);
  color: color-mix(in srgb, var(--foreground) 78%, var(--muted));
}

.pct-completion-icon {
  width: 11px;
  text-align: center;
  font-size: 11px;
  line-height: 1;
  flex-shrink: 0;
}

.pct-completion-item--done .pct-completion-icon {
  color: #16a34a;
}

.pct-dictation-complete {
  margin: 6px 0 0;
  font-size: 11px;
  font-weight: 650;
  line-height: 1.35;
  color: color-mix(in srgb, var(--foreground) 62%, var(--muted));
}

.pct-signals {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  min-width: 0;
}

.pct-signal {
  display: inline-flex;
  max-width: 100%;
  min-height: 22px;
  align-items: center;
  padding: 2px 7px;
  border-radius: 999px;
  border: 1px solid transparent;
  font-size: 11px;
  font-weight: 800;
  line-height: 1.18;
  overflow-wrap: anywhere;
  word-break: break-word;
  white-space: normal;
  box-sizing: border-box;
}

.pct-signal--product {
  background: color-mix(in srgb, #2563eb 12%, #fff);
  border-color: color-mix(in srgb, #2563eb 18%, var(--border));
  color: #1d4ed8;
}

.pct-signal--challenge {
  background: color-mix(in srgb, #7c3aed 12%, #fff);
  border-color: color-mix(in srgb, #7c3aed 18%, var(--border));
  color: #5b21b6;
}

.pct-signal--friction {
  background: color-mix(in srgb, #ea580c 12%, #fff);
  border-color: color-mix(in srgb, #ea580c 18%, var(--border));
  color: #c2410c;
}

.pct-signal--positive {
  background: color-mix(in srgb, #16a34a 12%, #fff);
  border-color: color-mix(in srgb, #16a34a 18%, var(--border));
  color: #166534;
}

.pct-signal--neutral {
  background: color-mix(in srgb, var(--foreground) 6%, #fff);
  border-color: color-mix(in srgb, var(--foreground) 8%, var(--border));
  color: color-mix(in srgb, var(--foreground) 72%, var(--muted));
}

.pct-signal--empty {
  font-size: 11px;
  font-weight: 650;
  color: var(--muted);
  font-style: italic;
}

.pct-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  min-width: 0;
  max-width: 100%;
  justify-content: flex-start;
}

.pct-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  padding: 0 12px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--brand-600) 18%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 6%, #fff);
  font-size: 11px;
  font-weight: 850;
  color: var(--brand-700);
  text-decoration: none;
  font-family: inherit;
  cursor: pointer;
  overflow-wrap: anywhere;
  word-break: break-word;
  text-align: center;
  white-space: normal;
}

.pct-link:hover {
  border-color: color-mix(in srgb, var(--brand-600) 36%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 10%, #fff);
}

.pct-link--desktop {
  display: none;
}

.pct-menu-item--mobile {
  display: block;
}

.pct-menu {
  position: relative;
}

.pct-menu-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  padding: 0;
  border: 1px solid color-mix(in srgb, var(--foreground) 9%, var(--border));
  border-radius: 999px;
  background: #fff;
  color: var(--muted);
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
  font-family: inherit;
}

.pct-menu-btn:hover {
  background: color-mix(in srgb, var(--foreground) 5%, var(--surface));
  color: var(--foreground);
}

.pct-menu-panel {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  z-index: 50;
  min-width: 140px;
  padding: 4px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--surface);
  box-shadow: 0 6px 20px color-mix(in srgb, #000 10%, transparent);
}

.pct-menu-item {
  display: block;
  width: 100%;
  padding: 7px 10px;
  border: none;
  border-radius: 6px;
  background: none;
  text-align: left;
  font-size: 12px;
  font-weight: 650;
  color: var(--foreground);
  text-decoration: none;
  font-family: inherit;
  cursor: pointer;
}

.pct-menu-item:hover {
  background: color-mix(in srgb, var(--brand-600) 8%, var(--surface));
}

.pct-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 14px;
  margin: 2px 0 0;
  padding: 0;
  list-style: none;
  font-size: 11px;
  font-weight: 650;
  color: var(--muted);
}

.pct-legend-item {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.pct-legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  flex-shrink: 0;
}

.pct-legend-dot--completed { background: #16a34a; }
.pct-legend-dot--in_progress { background: #d97706; }
.pct-legend-dot--scheduled { background: #2563eb; }
.pct-legend-dot--planned { background: #7c3aed; }
.pct-legend-dot--cancelled { background: color-mix(in srgb, var(--foreground) 28%, #fff); }

.pct-completion-item span:last-child {
  overflow-wrap: anywhere;
  word-break: break-word;
  min-width: 0;
}

@media (min-width: 901px) {
  .pct-table-head {
    display: none;
  }

  .pct-row {
    grid-template-columns: minmax(240px, 1.15fr) minmax(0, 2fr);
    align-items: center;
    gap: 12px;
    padding: 10px 12px;
  }

  .pct-row-main {
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: start;
    gap: 12px;
  }

  .pct-row-meta {
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 210px), 1fr));
    align-items: center;
    gap: 8px;
    padding-top: 0;
    border-top: 0;
  }

  .pct-mobile-head {
    justify-content: flex-start;
  }

  .pct-mobile-head .pct-status {
    display: none;
  }

  .pct-col--date,
  .pct-col--status,
  .pct-col--completion {
    display: block;
  }

  .pct-row-sub-sep,
  .pct-date--inline {
    display: none;
  }

  .pct-row-title {
    font-size: 16px;
    line-height: 1.18;
    word-break: break-word;
  }

  .pct-row-sub {
    font-size: 11px;
    line-height: 1.25;
    word-break: break-word;
  }

  .pct-completion-item {
    align-items: center;
  }

  .pct-completion-item span:last-child {
    white-space: normal;
    line-height: 1.35;
  }

  .pct-signals {
    align-content: flex-start;
  }

  .pct-signal {
    white-space: normal;
    text-align: left;
    max-width: none;
    height: auto;
    min-height: 20px;
    padding-top: 2px;
    padding-bottom: 2px;
  }

  .pct-col--actions {
    padding-top: 0;
    justify-self: stretch;
    align-self: start;
  }

  .pct-col--actions .pct-actions {
    justify-content: flex-start;
  }

  .pct-link--desktop {
    display: inline-flex;
  }

  .pct-menu-item--mobile {
    display: none;
  }
}

@media (max-width: 900px) {
  .pct-head {
    display: grid;
    padding: 16px;
  }

  .pct-head-action {
    justify-self: start;
  }

  .pct-mobile-head {
    min-width: 0;
  }

  .pct-row-type {
    min-width: 0;
    overflow-wrap: anywhere;
  }

  .pct-row {
    padding: 11px;
  }

  .pct-row-meta {
    grid-template-columns: 1fr;
  }

  .pct-col--status {
    display: none;
  }
}
`;
