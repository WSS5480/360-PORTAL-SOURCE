export const salesCalendarCss = `
.sales-cal-root {
  display: grid;
  gap: 12px;
  min-width: 0;
}
.sales-cal-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 10px;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: color-mix(in srgb, var(--surface) 96%, var(--brand-600) 2%);
}
.sales-cal-toolbar-nav {
  display: flex;
  align-items: center;
  gap: 4px;
}
.sales-cal-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 34px;
  padding: 0 12px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--foreground);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}
.sales-cal-btn:hover {
  background: color-mix(in srgb, var(--brand-600) 6%, var(--surface));
}
.sales-cal-btn--icon {
  width: 34px;
  padding: 0;
}
.sales-cal-btn--today {
  font-weight: 700;
}
.sales-cal-range-label {
  font-size: 14px;
  font-weight: 700;
  min-width: 120px;
  letter-spacing: -0.02em;
}
.sales-cal-segmented {
  display: inline-flex;
  border: 1px solid var(--border);
  border-radius: 9px;
  overflow: hidden;
  margin-left: auto;
}
.sales-cal-segment {
  border: 0;
  background: transparent;
  color: var(--muted);
  font-size: 12px;
  font-weight: 700;
  padding: 7px 12px;
  cursor: pointer;
}
.sales-cal-segment.is-active {
  background: color-mix(in srgb, var(--brand-600) 14%, var(--surface));
  color: var(--foreground);
}
.sales-cal-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  padding: 8px 10px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: var(--surface);
}
.sales-cal-filter-toggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  user-select: none;
}
.sales-cal-filter-toggle input {
  accent-color: var(--brand-600);
}
.sales-cal-filter-input {
  min-height: 32px;
  padding: 0 10px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--surface);
  font-size: 12px;
  min-width: 110px;
}
.sales-cal-week {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 6px;
  min-width: 0;
}
.sales-cal-week-col {
  min-width: 0;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface);
  display: flex;
  flex-direction: column;
  min-height: 220px;
}
.sales-cal-week-col.is-today {
  border-color: color-mix(in srgb, var(--brand-600) 40%, var(--border));
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--brand-600) 18%, transparent);
}
.sales-cal-week-head {
  padding: 8px 8px 6px;
  border: 0;
  border-bottom: 1px solid var(--border);
  background: transparent;
  cursor: pointer;
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--muted);
  text-align: left;
}
.sales-cal-week-head:hover {
  background: color-mix(in srgb, var(--brand-600) 5%, transparent);
}
.sales-cal-week-head strong {
  display: block;
  font-size: 18px;
  color: var(--foreground);
  letter-spacing: -0.03em;
  margin-top: 2px;
  text-transform: none;
}
.sales-cal-week-body {
  padding: 6px;
  display: grid;
  gap: 4px;
  align-content: start;
  flex: 1;
}
.sales-cal-month {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 4px;
  min-width: 0;
}
.sales-cal-month-dow {
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--muted);
  text-align: center;
  padding: 4px 0;
}
.sales-cal-month-cell {
  min-height: 88px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  padding: 4px;
  display: flex;
  flex-direction: column;
  gap: 3px;
  cursor: pointer;
  min-width: 0;
}
.sales-cal-month-cell.is-outside {
  opacity: 0.45;
}
.sales-cal-month-cell.is-today {
  border-color: color-mix(in srgb, var(--brand-600) 45%, var(--border));
}
.sales-cal-month-cell:hover {
  background: color-mix(in srgb, var(--brand-600) 5%, var(--surface));
}
.sales-cal-month-daynum {
  font-size: 12px;
  font-weight: 700;
  line-height: 1;
}
.sales-cal-pill {
  width: 100%;
  text-align: left;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: color-mix(in srgb, var(--foreground) 2%, var(--surface));
  padding: 4px 6px;
  cursor: pointer;
  min-width: 0;
}
.sales-cal-pill:hover {
  border-color: color-mix(in srgb, var(--brand-600) 35%, var(--border));
}
.sales-cal-pill--engagement {
  border-color: color-mix(in srgb, #2563eb 38%, var(--border));
  background: color-mix(in srgb, #2563eb 9%, var(--surface));
}
.sales-cal-pill--engagement:hover {
  border-color: color-mix(in srgb, #2563eb 58%, var(--border));
}
.sales-cal-pill--observation {
  border-color: color-mix(in srgb, #0d9488 42%, var(--border));
  background: color-mix(in srgb, #0d9488 10%, var(--surface));
}
.sales-cal-pill--observation:hover {
  border-color: color-mix(in srgb, #0d9488 62%, var(--border));
}
.sales-cal-pill--product_support {
  border-color: color-mix(in srgb, #ea580c 42%, var(--border));
  background: color-mix(in srgb, #ea580c 10%, var(--surface));
}
.sales-cal-pill--product_support:hover {
  border-color: color-mix(in srgb, #ea580c 62%, var(--border));
}
.sales-cal-pill--time_off,
.sales-cal-pill--time-off {
  border-color: color-mix(in srgb, #a855f7 38%, var(--border));
  background: color-mix(in srgb, #a855f7 11%, var(--surface));
}
.sales-cal-pill--time_off:hover,
.sales-cal-pill--time-off:hover {
  border-color: color-mix(in srgb, #a855f7 55%, var(--border));
}
.sales-cal-pill-title {
  font-size: 11px;
  font-weight: 700;
  line-height: 1.25;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.sales-cal-pill-sub {
  font-size: 10px;
  color: var(--muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 1px;
}
.sales-cal-pill-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 3px;
  margin-top: 3px;
}
.sales-cal-chip {
  font-size: 11px;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 999px;
  border: 1px solid var(--border);
  line-height: 1.3;
}
.sales-cal-chip--debrief {
  border-color: color-mix(in srgb, #f59e0b 45%, var(--border));
  background: color-mix(in srgb, #f59e0b 12%, transparent);
}
.sales-cal-chip--prep {
  border-color: color-mix(in srgb, var(--brand-600) 35%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 10%, transparent);
}
.sales-cal-chip--follow {
  color: var(--muted);
}
.sales-cal-chip--type-engagement {
  color: color-mix(in srgb, var(--brand-700) 80%, var(--foreground));
}
.sales-cal-chip--type-observation {
  color: color-mix(in srgb, #0d9488 85%, var(--foreground));
}
.sales-cal-chip--type-product_support,
.sales-cal-chip--type-case {
  color: color-mix(in srgb, #ea580c 88%, var(--foreground));
}
.sales-cal-chip--type-time_off {
  color: color-mix(in srgb, #7c3aed 85%, var(--foreground));
}
.sales-cal-more {
  font-size: 10px;
  font-weight: 700;
  color: var(--muted);
  padding: 2px 4px;
}
.sales-cal-agenda-group {
  display: grid;
  gap: 6px;
}
.sales-cal-agenda-date {
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--muted);
  padding: 8px 0 2px;
  position: sticky;
  top: 0;
  background: color-mix(in srgb, var(--background) 92%, transparent);
  backdrop-filter: blur(6px);
  z-index: 1;
}
.sales-cal-agenda-row {
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr);
  gap: 10px;
  align-items: start;
  padding: 8px 10px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface);
  cursor: pointer;
  text-align: left;
  width: 100%;
}
.sales-cal-agenda-row:hover {
  border-color: color-mix(in srgb, var(--brand-600) 30%, var(--border));
}
.sales-cal-agenda-row--engagement {
  border-left: 4px solid #2563eb;
  background: color-mix(in srgb, #2563eb 5%, var(--surface));
}
.sales-cal-agenda-row--observation {
  border-left: 4px solid #0d9488;
  background: color-mix(in srgb, #0d9488 6%, var(--surface));
}
.sales-cal-agenda-row--product_support {
  border-left: 4px solid #ea580c;
  background: color-mix(in srgb, #ea580c 6%, var(--surface));
}
.sales-cal-agenda-row--time_off {
  border-left: 4px solid #a855f7;
  background: color-mix(in srgb, #a855f7 6%, var(--surface));
}
.sales-cal-agenda-time {
  font-size: 11px;
  font-weight: 700;
  color: var(--muted);
}
.sales-cal-agenda-title {
  font-size: 13px;
  font-weight: 700;
  line-height: 1.3;
}
.sales-cal-agenda-sub {
  font-size: 12px;
  color: var(--muted);
  margin-top: 2px;
}
.sales-cal-empty {
  font-size: 13px;
  color: var(--muted);
  padding: 24px 12px;
  text-align: center;
  border: 1px dashed var(--border);
  border-radius: 10px;
}
.sales-cal-drawer-overlay {
  position: fixed;
  inset: 0;
  z-index: 1200;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  justify-content: flex-end;
}
.sales-cal-drawer-overlay.is-mobile {
  align-items: flex-end;
  justify-content: center;
}
.sales-cal-drawer {
  width: min(420px, 100vw);
  max-height: 100vh;
  overflow: auto;
  background: var(--surface);
  border-left: 1px solid var(--border);
  display: flex;
  flex-direction: column;
}
.sales-cal-drawer-overlay.is-mobile .sales-cal-drawer {
  width: 100%;
  max-height: min(88vh, 720px);
  border-left: 0;
  border-top: 1px solid var(--border);
  border-radius: 16px 16px 0 0;
}
.sales-cal-drawer-head {
  padding: 16px 16px 10px;
  border-bottom: 1px solid var(--border);
  display: flex;
  justify-content: space-between;
  gap: 12px;
}
.sales-cal-drawer-body {
  padding: 14px 16px 20px;
  display: grid;
  gap: 12px;
}
.sales-cal-drawer-actions {
  padding: 12px 16px 16px;
  border-top: 1px solid var(--border);
  display: grid;
  gap: 8px;
  position: sticky;
  bottom: 0;
  background: var(--surface);
}
.sales-cal-kv {
  display: grid;
  gap: 2px;
  font-size: 13px;
}
.sales-cal-kv dt {
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--muted);
}
.sales-cal-kv dd {
  margin: 0;
  font-weight: 600;
}
.sales-cal-filter-sheet {
  position: fixed;
  inset: 0;
  z-index: 1190;
  background: rgba(0, 0, 0, 0.35);
  display: flex;
  align-items: flex-end;
}
.sales-cal-filter-sheet-panel {
  width: 100%;
  max-height: 80vh;
  overflow: auto;
  background: var(--surface);
  border-radius: 16px 16px 0 0;
  padding: 16px;
  display: grid;
  gap: 12px;
}
@media (max-width: 900px) {
  .sales-cal-week,
  .sales-cal-month {
    display: none;
  }
  .sales-cal-filters--desktop {
    display: none;
  }
  .sales-cal-segmented {
    margin-left: 0;
  }
  /* —— Touch targets —— */
  .sales-cal-btn {
    min-height: 44px;
  }
  .sales-cal-btn--icon {
    width: 44px;
  }
  .sales-cal-segment {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 44px;
    padding: 7px 14px;
  }
}
/* Small phones: 44px targets plus a 120px date label no longer fit on one row. */
@media (max-width: 480px) {
  .sales-cal-toolbar {
    padding: 10px 8px;
  }
  .sales-cal-toolbar-nav {
    flex-wrap: wrap;
    row-gap: 8px;
  }
  .sales-cal-range-label {
    min-width: 0;
    flex: 1 1 100%;
    order: -1;
  }
}
@media (min-width: 901px) {
  .sales-cal-filters-mobile-trigger {
    display: none;
  }
}
`;
