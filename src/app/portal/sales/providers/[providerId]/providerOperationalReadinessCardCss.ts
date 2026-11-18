export const providerOperationalReadinessCardCss = `
.ops-ready-card {
  border-radius: 10px;
  border: 1px solid var(--border);
  background: var(--surface);
  border-left: 3px solid var(--border);
  overflow: hidden;
}

.ops-ready-card--operationally_ready,
.ops-ready-card--confirmed {
  border-left-color: #22c55e;
}

.ops-ready-card--partial {
  border-left-color: #ca8a04;
}

.ops-ready-card--unmapped {
  border-left-color: #ca8a04;
}

.ops-ready-card--not_started {
  border-left-color: color-mix(in srgb, var(--foreground) 20%, var(--border));
}

.ops-ready-card--pulse {
  animation: ops-ready-card-pulse 0.85s ease-out;
}

@keyframes ops-ready-card-pulse {
  0% {
    box-shadow: 0 0 0 0 color-mix(in srgb, var(--brand-600, #2563eb) 35%, transparent);
  }
  100% {
    box-shadow: none;
  }
}

.ops-ready-card-scan {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px;
  align-items: stretch;
  padding: 8px 10px;
}

.ops-ready-card-scan-main {
  display: grid;
  gap: 4px;
  margin: 0;
  padding: 0;
  border: none;
  background: transparent;
  text-align: left;
  cursor: pointer;
  font: inherit;
  color: inherit;
  min-width: 0;
}

.ops-ready-card-scan-main:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.ops-ready-card-scan-top {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.ops-ready-card-scope {
  flex-shrink: 0;
  font-size: 8px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 2px 6px;
  border-radius: 4px;
  line-height: 1.2;
}

.ops-ready-card-scope--facility {
  color: #0f766e;
  background: color-mix(in srgb, #0d9488 12%, var(--surface));
}

.ops-ready-card-scope--provider {
  color: #1d4ed8;
  background: color-mix(in srgb, #3b82f6 10%, var(--surface));
}

.ops-ready-card-scope--case {
  color: #7c3aed;
  background: color-mix(in srgb, #8b5cf6 10%, var(--surface));
}

.ops-ready-card-title {
  margin: 0;
  font-size: 13px;
  font-weight: 800;
  line-height: 1.2;
}

.ops-ready-card-visibility {
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  line-height: 1.2;
}

.ops-ready-card-visibility--operationally_ready,
.ops-ready-card-visibility--confirmed {
  color: #166534;
}

.ops-ready-card-visibility--partial,
.ops-ready-card-visibility--unmapped {
  color: #92400e;
}

.ops-ready-card-visibility--not_started {
  color: var(--muted);
}

.ops-ready-card-summary {
  margin: 0;
  font-size: 12px;
  font-weight: 650;
  line-height: 1.35;
  color: color-mix(in srgb, var(--foreground) 88%, var(--muted));
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.ops-ready-card-open-count {
  margin: 0;
  font-size: 11px;
  font-weight: 700;
  color: #9a3412;
}

.ops-ready-card-scan-actions {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 4px;
  flex-shrink: 0;
}

.ops-ready-card-primary {
  min-width: 64px;
  min-height: 32px;
  padding: 6px 10px;
  border: none;
  border-radius: 7px;
  background: var(--brand-600, #2563eb);
  color: #fff;
  font-size: 11px;
  font-weight: 800;
  cursor: pointer;
}

.ops-ready-card-expand {
  min-height: 24px;
  padding: 2px 6px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--surface);
  color: var(--muted);
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
}

.ops-ready-card-primary:disabled,
.ops-ready-card-expand:disabled,
.ops-ready-card-secondary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.ops-ready-card-drawer {
  padding: 0 10px 10px;
  display: grid;
  gap: 8px;
  border-top: 1px solid color-mix(in srgb, var(--border) 70%, transparent);
}

.ops-ready-drawer-block {
  display: grid;
  gap: 4px;
}

.ops-ready-drawer-kicker {
  margin: 0;
  font-size: 9px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--muted);
}

.ops-ready-drawer-list {
  margin: 0;
  padding: 0 0 0 14px;
  display: grid;
  gap: 4px;
}

.ops-ready-drawer-list li {
  font-size: 11px;
  font-weight: 650;
  line-height: 1.35;
  color: color-mix(in srgb, var(--foreground) 90%, var(--muted));
}

.ops-ready-drawer-empty {
  margin: 0;
  font-size: 11px;
  color: var(--muted);
}

.ops-ready-drawer-next {
  margin: 0;
  font-size: 11px;
  font-weight: 700;
  line-height: 1.4;
}

.ops-ready-card-drawer-foot {
  display: flex;
  justify-content: flex-end;
}

.ops-ready-card-secondary {
  min-height: 30px;
  padding: 5px 10px;
  border: 1px solid var(--border);
  border-radius: 7px;
  background: var(--surface);
  color: var(--foreground);
  font-size: 10px;
  font-weight: 800;
  cursor: pointer;
}

/* —— Intelligence index (deep dossier list) —— */

.intel-index-list--dossier {
  display: flex;
  flex-direction: column;
  gap: 1px;
  border: 1px solid color-mix(in srgb, var(--border) 75%, transparent);
  border-radius: 8px;
  overflow: hidden;
  background: var(--surface);
}

.ops-ready-card--index {
  border: none;
  border-radius: 0;
  border-left: none;
  background: transparent;
  box-shadow: none;
}

.ops-ready-card--index + .ops-ready-card--index {
  border-top: 1px solid color-mix(in srgb, var(--border) 65%, transparent);
}

.ops-ready-card--index.ops-ready-card--expanded {
  background: color-mix(in srgb, var(--foreground) 2%, var(--surface));
}

.ops-ready-index-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
  align-items: start;
  padding: 6px 8px;
  min-height: 0;
}

.ops-ready-index-main {
  display: grid;
  gap: 2px;
  margin: 0;
  padding: 0;
  border: none;
  background: transparent;
  text-align: left;
  cursor: pointer;
  font: inherit;
  color: inherit;
  min-width: 0;
}

.ops-ready-index-main:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.ops-ready-index-title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.25;
  letter-spacing: -0.01em;
  color: var(--foreground);
}

.ops-ready-index-scope {
  margin: 0;
  font-size: 11px;
  font-weight: 400;
  line-height: 1.2;
  color: var(--muted);
}

.ops-ready-index-summary {
  margin: 0;
  font-size: 13px;
  font-weight: 400;
  line-height: 1.35;
  color: color-mix(in srgb, var(--foreground) 88%, var(--muted));
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.ops-ready-index-open {
  margin: 0;
  font-size: 11px;
  font-weight: 500;
  line-height: 1.3;
  color: color-mix(in srgb, var(--muted) 95%, var(--foreground));
}

.ops-ready-card--index.ops-ready-card--partial .ops-ready-index-open,
.ops-ready-card--index.ops-ready-card--unmapped .ops-ready-index-open {
  color: color-mix(in srgb, #b45309 70%, var(--muted));
}

.ops-ready-index-aside {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  flex-shrink: 0;
  padding-top: 1px;
}

.ops-ready-index-refine {
  margin: 0;
  padding: 0;
  border: none;
  background: none;
  font-size: 11px;
  font-weight: 500;
  line-height: 1.2;
  color: color-mix(in srgb, var(--foreground) 70%, var(--muted));
  text-decoration: underline;
  text-underline-offset: 2px;
  text-decoration-color: color-mix(in srgb, var(--muted) 45%, transparent);
  cursor: pointer;
  white-space: nowrap;
}

.ops-ready-index-refine:hover:not(:disabled) {
  color: var(--foreground);
  text-decoration-color: color-mix(in srgb, var(--foreground) 35%, transparent);
}

.ops-ready-index-refine:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.ops-ready-index-expand {
  min-width: 22px;
  min-height: 20px;
  padding: 0;
  border: none;
  background: none;
  font-size: 10px;
  line-height: 1;
  color: var(--muted);
  cursor: pointer;
}

.ops-ready-index-expand:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.ops-ready-index-link {
  padding: 0;
  border: none;
  background: none;
  font-size: 11px;
  font-weight: 500;
  color: var(--muted);
  text-decoration: underline;
  text-underline-offset: 2px;
  cursor: pointer;
}

.ops-ready-card-drawer--index {
  padding: 6px 8px 8px;
  gap: 6px;
  border-top: 1px solid color-mix(in srgb, var(--border) 60%, transparent);
}

.ops-ready-card-drawer--index .ops-ready-drawer-kicker {
  font-size: 9px;
  font-weight: 600;
}

.ops-ready-card-drawer--index .ops-ready-drawer-list {
  gap: 2px;
}

.ops-ready-card-drawer--index .ops-ready-drawer-list li {
  font-size: 11px;
  font-weight: 400;
}

@media (min-width: 720px) {
  .ops-ready-card-scan {
    padding: 10px 12px;
  }

  .ops-ready-card-summary {
    font-size: 13px;
  }

  .ops-ready-card-primary {
    min-height: 34px;
  }

  .ops-ready-index-row {
    padding: 7px 10px;
  }
}

@media (max-width: 640px) {
  .ops-ready-card-scan {
    grid-template-columns: 1fr;
    gap: 10px;
    padding: 10px;
  }

  .ops-ready-card-scan-actions {
    display: grid;
    grid-template-columns: 1fr;
    gap: 8px;
  }

  .ops-ready-card-primary,
  .ops-ready-card-secondary,
  .ops-ready-card-expand,
  .ops-ready-index-refine,
  .ops-ready-index-expand {
    min-height: 44px;
    width: 100%;
    box-sizing: border-box;
  }

  .ops-ready-index-row {
    display: grid;
    gap: 8px;
    padding: 10px;
  }

  .ops-ready-index-aside {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }

  .ops-ready-card-drawer-foot {
    display: grid;
    gap: 8px;
  }

  .ops-ready-card-drawer-foot .ops-ready-card-secondary,
  .ops-ready-card-drawer-foot .ops-ready-card-primary {
    width: 100%;
  }
}
`;
