/** Shared Operations queue — dense command-center rows (providers, orgs, cases). */

export const operationsQueueCss = `
/* —— View mode toggle —— */
.directory-view-mode-toggle,
.provider-view-mode-toggle {
  display: inline-flex;
  align-items: stretch;
  gap: 2px;
  padding: 2px;
  border-radius: 9px;
  background: color-mix(in srgb, var(--foreground) 4%, #f1f5f9);
  box-shadow: inset 0 1px 2px color-mix(in srgb, var(--foreground) 6%, transparent);
  flex-shrink: 0;
}

.directory-view-mode-toggle__btn,
.provider-view-mode-toggle__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  margin: 0;
  border: none;
  background: transparent;
  color: color-mix(in srgb, var(--foreground) 45%, var(--muted));
  font-size: 10px;
  font-weight: 800;
  letter-spacing: -0.01em;
  padding: 0 10px;
  min-height: 30px;
  border-radius: 7px;
  cursor: pointer;
  font-family: inherit;
  white-space: nowrap;
  transition: background 120ms ease, color 120ms ease, box-shadow 120ms ease;
}

.directory-view-mode-toggle__btn:hover:not(.directory-view-mode-toggle__btn--active),
.provider-view-mode-toggle__btn:hover:not(.provider-view-mode-toggle__btn--active) {
  color: color-mix(in srgb, var(--foreground) 70%, var(--muted));
  background: color-mix(in srgb, #fff 70%, transparent);
}

.directory-view-mode-toggle__btn:focus-visible,
.provider-view-mode-toggle__btn:focus-visible {
  outline: 2px solid color-mix(in srgb, #22d3ee 80%, var(--brand-600));
  outline-offset: 2px;
}

.directory-view-mode-toggle__btn--active,
.provider-view-mode-toggle__btn--active {
  background: linear-gradient(
    165deg,
    color-mix(in srgb, #22d3ee 22%, var(--brand-600)) 0%,
    var(--brand-600) 55%,
    color-mix(in srgb, var(--brand-600) 88%, #0e7490) 100%
  );
  color: #fff;
  box-shadow: 0 1px 6px color-mix(in srgb, var(--brand-600) 24%, transparent);
}

.directory-view-mode-toggle__icon,
.provider-view-mode-toggle__icon {
  display: inline-flex;
  opacity: 0.88;
  flex-shrink: 0;
}

/* —— Readiness gaps —— */
.ops-queue-readiness-block {
  display: grid;
  gap: 3px;
  min-width: 0;
}

.ops-queue-readiness-headline {
  margin: 0;
  font-size: 11px;
  font-weight: 850;
  line-height: 1.25;
  letter-spacing: -0.02em;
  color: var(--foreground);
}

.ops-queue-readiness-subline {
  margin: 0;
  font-size: 10px;
  font-weight: 700;
  line-height: 1.3;
  color: var(--muted);
}

.ops-queue-readiness-list,
.ops-queue-signals {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 4px 6px;
  min-width: 0;
}

.ops-queue-readiness-empty,
.ops-queue-signals-empty {
  font-size: 10px;
  font-weight: 650;
  color: var(--muted);
}

.ops-queue-readiness-item,
.ops-queue-signal {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  max-width: 100%;
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 750;
  line-height: 1.25;
  letter-spacing: -0.01em;
  border: 1px solid transparent;
}

.ops-queue-readiness-item__icon,
.ops-queue-signal__icon {
  flex-shrink: 0;
  font-size: 9px;
  font-weight: 900;
  line-height: 1;
}

.ops-queue-readiness-item__label,
.ops-queue-signal__label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ops-queue-readiness-item--ok,
.ops-queue-signal--ok {
  background: color-mix(in srgb, #14b8a6 10%, #fff);
  color: #0f766e;
  border-color: color-mix(in srgb, #14b8a6 18%, var(--border));
}

.ops-queue-readiness-item--warn,
.ops-queue-signal--warn {
  background: color-mix(in srgb, #f59e0b 10%, #fff);
  color: #b45309;
  border-color: color-mix(in srgb, #f59e0b 20%, var(--border));
}

.ops-queue-readiness-item--gap,
.ops-queue-signal--gap {
  background: color-mix(in srgb, var(--foreground) 4%, #fff);
  color: color-mix(in srgb, var(--foreground) 72%, var(--muted));
  border-color: color-mix(in srgb, var(--foreground) 10%, var(--border));
}

.ops-queue-readiness-item--more,
.ops-queue-signal--more {
  background: transparent;
  color: var(--muted);
  border-color: color-mix(in srgb, var(--foreground) 8%, var(--border));
  font-weight: 800;
}

/* —— Tactical chips —— */
.ops-queue-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  justify-content: flex-end;
}

.ops-queue-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 22px;
  padding: 0 7px;
  border-radius: 5px;
  border: 1px solid color-mix(in srgb, var(--foreground) 12%, var(--border));
  background: color-mix(in srgb, var(--foreground) 2%, #fff);
  color: color-mix(in srgb, var(--foreground) 78%, var(--muted));
  font-size: 9px;
  font-weight: 850;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  text-decoration: none;
  font-family: inherit;
  white-space: nowrap;
  transition: background 100ms ease, border-color 100ms ease, color 100ms ease;
}

.ops-queue-chip:hover {
  background: color-mix(in srgb, #22d3ee 8%, #fff);
  border-color: color-mix(in srgb, #22d3ee 28%, var(--border));
  color: #0e7490;
}

.ops-queue-chip:focus-visible {
  outline: 2px solid color-mix(in srgb, #22d3ee 70%, var(--brand-600));
  outline-offset: 1px;
}

.ops-queue-chip--emphasis {
  background: color-mix(in srgb, var(--brand-600) 10%, #fff);
  border-color: color-mix(in srgb, var(--brand-600) 22%, var(--border));
  color: var(--brand-700);
}

/* —— Queue panel shell —— */
.ops-queue-panel {
  margin: 6px 12px 14px;
  border-radius: 10px;
  background: #fff;
  border: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
  box-shadow: 0 4px 18px color-mix(in srgb, var(--foreground) 4%, transparent);
  overflow: hidden;
}

.ops-queue-head {
  display: grid;
  grid-template-columns: minmax(140px, 1.1fr) minmax(0, 1.6fr) minmax(148px, 0.95fr);
  gap: 8px 10px;
  padding: 6px 12px;
  background: color-mix(in srgb, var(--foreground) 3%, #f8fafc);
  font-size: 9px;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--foreground) 48%, var(--muted));
  border-bottom: 1px solid color-mix(in srgb, var(--foreground) 5%, var(--border));
}

.ops-queue-body {
  display: flex;
  flex-direction: column;
}

.ops-queue-row {
  display: grid;
  grid-template-columns: minmax(140px, 1.1fr) minmax(0, 1.6fr) minmax(148px, 0.95fr);
  gap: 8px 10px;
  align-items: center;
  min-height: 40px;
  padding: 6px 12px;
  border-bottom: 1px solid color-mix(in srgb, var(--foreground) 5%, transparent);
  transition: background 100ms ease, box-shadow 100ms ease, border-color 100ms ease;
}

.ops-queue-row:last-child {
  border-bottom: none;
}

.ops-queue-row:hover {
  background: color-mix(in srgb, #22d3ee 3%, #fff);
}

.ops-queue-row--clickable {
  position: relative;
  cursor: pointer;
  display: block;
  padding: 0;
}

.ops-queue-row--clickable:hover {
  background: color-mix(in srgb, #22d3ee 6%, #fff);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, #22d3ee 22%, var(--border));
}

.ops-queue-row__overlay {
  position: absolute;
  inset: 0;
  z-index: 1;
  border-radius: 0;
  text-decoration: none;
}

.ops-queue-row__overlay:focus-visible {
  outline: 2px solid color-mix(in srgb, #22d3ee 75%, var(--brand-600));
  outline-offset: -2px;
}

.ops-queue-row__main {
  position: relative;
  z-index: 0;
  display: flex;
  align-items: center;
  gap: 8px 10px;
  min-height: 40px;
  padding: 6px 12px;
}

.ops-queue-row__grid {
  flex: 1;
  min-width: 0;
  display: grid;
  grid-template-columns: minmax(140px, 1.1fr) minmax(0, 1.6fr) minmax(88px, 0.75fr);
  gap: 8px 10px;
  align-items: center;
}

.ops-queue-row__actions {
  position: relative;
  z-index: 2;
  flex-shrink: 0;
  display: grid;
  gap: 3px;
  justify-items: end;
  text-align: right;
}

.ops-queue-row__actions--mobile {
  padding: 0 10px 8px;
  justify-items: start;
  text-align: left;
}

.ops-queue-mobile-row--clickable {
  position: relative;
  cursor: pointer;
}

.ops-queue-mobile-row--clickable:hover {
  border-color: color-mix(in srgb, #22d3ee 32%, var(--border));
  background: color-mix(in srgb, #22d3ee 5%, #fff);
  box-shadow: 0 0 0 1px color-mix(in srgb, #22d3ee 18%, transparent);
}

.ops-queue-mobile-row--clickable .ops-queue-row__content {
  position: relative;
  z-index: 0;
  display: grid;
  gap: 6px;
  padding: 8px 10px 0;
}

.ops-queue-open-hint {
  flex-shrink: 0;
  font-size: 9px;
  font-weight: 850;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--brand-700);
  position: relative;
  z-index: 2;
}

.ops-queue-row--blocked {
  background: color-mix(in srgb, #f59e0b 4%, #fff);
}

.ops-queue-row--blocked:hover {
  background: color-mix(in srgb, #f59e0b 7%, #fff);
}

.ops-queue-row--advancing {
  box-shadow: inset 3px 0 0 color-mix(in srgb, #14b8a6 70%, transparent);
}

.ops-queue-col {
  min-width: 0;
}

.ops-queue-col--right {
  display: grid;
  gap: 3px;
  justify-items: end;
  text-align: right;
}

.ops-queue-identity-name {
  display: block;
  font-size: 12px;
  font-weight: 850;
  letter-spacing: -0.02em;
  line-height: 1.2;
  color: var(--foreground);
}

.ops-queue-identity-name a {
  color: inherit;
  text-decoration: none;
}

.ops-queue-identity-name a:hover {
  color: var(--brand-700);
  text-decoration: underline;
  text-underline-offset: 2px;
}

.ops-queue-identity-sub,
.ops-queue-meta-line {
  display: block;
  margin-top: 1px;
  font-size: 10px;
  line-height: 1.3;
  color: var(--muted);
  font-weight: 650;
}

.ops-queue-stage {
  display: inline-block;
  margin-top: 2px;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: var(--brand-700);
}

.ops-queue-meta-compact {
  font-size: 9px;
  font-weight: 700;
  color: color-mix(in srgb, var(--foreground) 55%, var(--muted));
  line-height: 1.3;
}

/* —— Mobile operations cards —— */
.ops-queue-mobile-list {
  list-style: none;
  margin: 0;
  padding: 4px 12px 16px;
  display: grid;
  gap: 6px;
}

.ops-queue-mobile-row {
  list-style: none;
  margin: 0;
  padding: 8px 10px;
  border-radius: 8px;
  background: #fff;
  border: 1px solid color-mix(in srgb, var(--foreground) 7%, var(--border));
  display: grid;
  gap: 6px;
}

.ops-queue-mobile-row--blocked {
  border-color: color-mix(in srgb, #f59e0b 28%, var(--border));
  background: color-mix(in srgb, #f59e0b 3%, #fff);
}

.ops-queue-mobile-row--advancing {
  border-left: 3px solid #14b8a6;
}

.ops-queue-mobile-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  min-width: 0;
}

.ops-queue-mobile-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 6px;
}

.ops-queue-open-link {
  display: inline-flex;
  align-items: center;
  min-height: 22px;
  padding: 0 8px;
  border-radius: 5px;
  background: color-mix(in srgb, var(--brand-600) 10%, #fff);
  border: 1px solid color-mix(in srgb, var(--brand-600) 18%, var(--border));
  color: var(--brand-700);
  font-size: 9px;
  font-weight: 850;
  text-decoration: none;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.ops-queue-open-link:hover {
  background: var(--brand-600);
  color: #fff;
  border-color: var(--brand-600);
}

@media (max-width: 900px) {
  .ops-queue-panel {
    display: none !important;
  }

  /* Touch targets: the desktop toggle is deliberately dense, phones are not. */
  .directory-view-mode-toggle__btn,
  .provider-view-mode-toggle__btn {
    min-height: 44px;
    font-size: 12px;
  }

  /* The queue rows are the primary way into a record on a phone, so every link
     in them gets a full thumb target instead of the desktop chip height. */
  .ops-queue-mobile-row .ops-queue-identity-name a {
    display: inline-flex;
    align-items: center;
    min-height: 44px;
  }

  .ops-queue-mobile-row .ops-queue-open-link,
  .ops-queue-mobile-row .ops-queue-chip {
    min-height: 44px;
    padding: 0 12px;
    border-radius: 8px;
    font-size: 11px;
  }

  .ops-queue-mobile-row .ops-queue-chips {
    gap: 6px;
    justify-content: flex-start;
  }
}

@media (min-width: 901px) {
  .ops-queue-mobile-list {
    display: none !important;
  }
}
`;
