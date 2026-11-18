/** Mobile-first surgical cases list (≤640px). */

export const surgicalCasesListMobileCss = `

.surgical-cases-crm-page .crm-sales-page-bg {
  padding: 0 !important;
  gap: 0 !important;
  max-width: none !important;
}

.case-list-desktop-only {
  display: none !important;
}

.surgical-cases-mobile-root {
  display: flex;
  flex-direction: column;
  min-height: calc(100dvh - 52px);
  min-width: 0;
  background: #fff;
}

.surgical-cases-crm-page button.sc-mobile-list-segment,
.surgical-cases-crm-page .sc-mobile-list-segment {
  flex: 0 0 auto !important;
  flex-shrink: 0 !important;
  max-width: none !important;
  width: auto !important;
  min-height: 44px !important;
  height: 44px !important;
  padding: 0 12px !important;
  font-size: 12px !important;
  line-height: 1 !important;
  transform: none !important;
  overflow: visible !important;
}

.surgical-cases-crm-page .sc-mobile-list-tool-btn,
.surgical-cases-crm-page .sc-mobile-list-icon-btn {
  flex: 0 0 auto !important;
  max-width: none !important;
  width: 44px !important;
  min-width: 44px !important;
}

.sc-mobile-list-sticky-shell {
  position: sticky;
  top: 0;
  z-index: 40;
  background: #fff;
  border-bottom: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
}
.sc-mobile-list-header {
  display: grid;
  gap: 0;
}

.sc-mobile-list-header-top {

  display: grid;

  grid-template-columns: auto 1fr auto;

  align-items: flex-start;

  gap: 8px;

  padding: 8px 12px 6px;

  min-height: 44px;

}

.sc-mobile-list-menu {
  flex-shrink: 0;
  margin-top: 0;
}

.sc-mobile-list-header-identity {
  min-width: 0;
}

.sc-mobile-list-title {

  margin: 0;

  font-size: 17px;

  font-weight: 800;

  letter-spacing: -0.02em;

  line-height: 1.2;

  color: var(--foreground);

}

.sc-mobile-list-count {

  font-size: 11px;

  font-weight: 700;

  color: var(--muted);

  margin-top: 2px;

}

.sc-mobile-list-header-actions {

  display: flex;

  align-items: center;

  gap: 4px;

}

.sc-mobile-list-icon-btn {

  display: inline-flex;

  align-items: center;

  justify-content: center;

  width: 44px;

  height: 44px;

  border: none;

  border-radius: 10px;

  background: transparent;

  color: var(--foreground);

  cursor: pointer;

  touch-action: manipulation;

}

.sc-mobile-list-icon-btn:active {

  background: color-mix(in srgb, var(--foreground) 6%, #fff);

}



.sc-mobile-list-sticky-tools {
  display: grid;
  gap: 0;
  min-width: 0;
  overflow: visible;
}

.sc-mobile-list-search-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 44px 44px;
  gap: 6px;
  align-items: center;
  padding: 6px 12px 8px;
  min-width: 0;
}

.sc-mobile-list-search-wrap {

  display: flex;

  align-items: center;

  gap: 6px;

  min-width: 0;

  padding: 0 10px;

  height: 44px;

  border-radius: 10px;

  border: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));

  background: color-mix(in srgb, var(--foreground) 2%, #fff);

}

.sc-mobile-list-search-wrap svg {

  flex-shrink: 0;

  color: var(--muted);

}

.sc-mobile-list-search {

  width: 100%;

  min-width: 0;

  align-self: stretch;

  border: none;

  background: transparent;

  font-size: 16px;

  font-weight: 500;

  color: var(--foreground);

  outline: none;

  padding: 0;

}

.sc-mobile-list-search::placeholder {

  color: var(--muted);

  font-weight: 500;

}

.sc-mobile-list-tool-btn {

  display: inline-flex;

  align-items: center;

  justify-content: center;

  width: 44px;

  height: 44px;

  border-radius: 10px;

  border: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));

  background: #fff;

  color: var(--foreground);

  cursor: pointer;

  touch-action: manipulation;

  position: relative;

}

.sc-mobile-list-tool-btn[aria-pressed="true"] {

  border-color: var(--brand-600);

  background: color-mix(in srgb, var(--brand-600) 8%, #fff);

  color: var(--brand-700);

}

.sc-mobile-list-tool-badge {

  position: absolute;

  top: 4px;

  right: 4px;

  width: 7px;

  height: 7px;

  border-radius: 999px;

  background: var(--brand-600);

}

.sc-mobile-list-filters {
  padding: 0 12px 6px;
  min-width: 0;
}
.sc-mobile-list-filters--compact {
  padding: 0 12px 4px;
}
.sc-mobile-list-filters-grid {
  display: grid;
  /* minmax(0, …) so a date field's intrinsic width can't widen the page. */
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 4px 6px;
}
.sc-mobile-list-filters--compact .sc-mobile-list-filters-grid {
  grid-template-columns: minmax(0, 0.9fr) minmax(0, 0.9fr) minmax(0, 1.2fr) minmax(0, 1.2fr);
  gap: 4px;
}
.sc-mobile-list-filter-field {
  display: grid;
  min-width: 0;
}
.sc-mobile-list-filter-field--wide {
  grid-column: 1 / -1;
}
.sc-mobile-list-filter-sr {
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
.sc-mobile-list-filter-field input[type="date"] {
  color-scheme: light;
}
/* Native date and select controls carry a wide intrinsic size; without this they
   push the filter grid — and with it the whole page — past the screen edge. */
.sc-mobile-list-filter-field input,
.sc-mobile-list-filter-field select {
  min-width: 0;
  max-width: 100%;
}
.sc-mobile-list-sticky-tools--compact .sc-mobile-list-search-row {
  padding: 4px 12px 4px;
}
@media (max-width: 519px) {
  .sc-mobile-list-filters--compact .sc-mobile-list-filters-grid {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  }
}
/* Two date pickers side by side stop fitting below ~360px. */
@media (max-width: 360px) {
  .sc-mobile-list-filters-grid,
  .sc-mobile-list-filters--compact .sc-mobile-list-filters-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
@media (min-width: 520px) {
  .sc-mobile-list-filters-grid {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1.2fr) minmax(0, 1.2fr);
  }
  .sc-mobile-list-filter-field--wide {
    grid-column: auto;
  }
}

.sc-mobile-list-segments-track {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  overflow-x: auto;
  overflow-y: visible;
  -webkit-overflow-scrolling: touch;
  scroll-padding: 0 10px;
  scrollbar-width: none;
  padding-bottom: 8px;
}
.sc-mobile-list-segments-track::-webkit-scrollbar {
  display: none;
}
.sc-mobile-list-segments {
  display: inline-flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 4px;
  width: max-content;
  box-sizing: border-box;
  padding: 2px 10px 0;
}

.sc-mobile-list-segment {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  flex-shrink: 0;
  max-width: none;
  width: auto;
  min-height: 24px;
  height: 24px;
  margin: 0;
  padding: 0 7px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));
  background: #fff;
  color: var(--muted);
  font-size: 10px;
  font-weight: 700;
  line-height: 1;
  letter-spacing: -0.01em;
  white-space: nowrap;
  overflow: visible;
  cursor: pointer;
  touch-action: manipulation;
  appearance: none;
  -webkit-appearance: none;
  box-shadow: none;
  transform: none;
}

.sc-mobile-list-segment[aria-pressed="true"] {

  border-color: var(--brand-600);

  background: var(--brand-600);

  color: #fff;

}



.sc-mobile-list-body {
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  padding-bottom: calc(72px + env(safe-area-inset-bottom, 0px));
}

.mission-board {
  flex: 1;
  min-height: 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  background: color-mix(in srgb, var(--foreground) 2%, #fff);
}

.mission-board-columns {
  flex: 1;
  min-height: 0;
  display: flex;
  gap: 8px;
  padding: 8px 10px 10px;
  overflow-x: auto;
  overflow-y: hidden;
  -webkit-overflow-scrolling: touch;
  align-items: stretch;
}

.mission-board-column {
  flex: 0 0 min(360px, 88vw);
  min-width: 360px;
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: color-mix(in srgb, var(--foreground) 3%, #fff);
  border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
  border-radius: 10px;
  overflow: hidden;
}

.mission-board-column-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 10px;
  border-bottom: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
  background: #fff;
  flex-shrink: 0;
}

.mission-board-column-title {
  margin: 0;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.02em;
  color: var(--foreground);
  line-height: 1.2;
}

.mission-board-column-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--foreground) 6%, #fff);
  color: var(--muted);
  font-size: 10px;
  font-weight: 800;
  flex-shrink: 0;
}

.mission-board-column-cards {
  margin: 0;
  padding: 8px;
  list-style: none;
  display: grid;
  gap: 8px;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  flex: 1;
  min-height: 0;
  align-content: start;
}

.mission-case-card {
  display: grid;
  gap: 0;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
  background: #fff;
  overflow: hidden;
  box-shadow: 0 1px 2px color-mix(in srgb, var(--foreground) 4%, transparent);
}

.mission-case-card[data-has-blockers="true"] {
  border-color: color-mix(in srgb, var(--warning) 28%, var(--border));
}

.mission-case-card-body {
  display: grid;
  gap: 3px;
  padding: 8px 10px 6px;
  min-width: 0;
}

.mission-case-card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 6px;
  min-width: 0;
}

.mission-case-card-title {
  margin: 0;
  font-size: 13px;
  font-weight: 800;
  letter-spacing: -0.01em;
  line-height: 1.25;
  color: var(--foreground);
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.mission-case-status-pill {
  flex-shrink: 0;
  display: inline-flex;
  padding: 2px 6px;
  border-radius: 999px;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  border: 1px solid color-mix(in srgb, var(--brand-600) 22%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 8%, #fff);
  color: var(--brand-700);
  white-space: nowrap;
}

.mission-case-card-meta {
  margin: 0;
  font-size: 11px;
  font-weight: 600;
  line-height: 1.35;
  color: color-mix(in srgb, var(--foreground) 72%, var(--muted));
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mission-case-card-procedure {
  margin: 0;
  font-size: 10px;
  font-weight: 600;
  line-height: 1.3;
  color: var(--muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mission-case-card-id {
  margin: 0;
  font-size: 10px;
  font-weight: 600;
  color: var(--muted);
  letter-spacing: 0.01em;
}

.mission-case-blockers {
  margin: 4px 0 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 3px;
}

.mission-case-blocker {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 10px;
  font-weight: 700;
  line-height: 1.3;
  color: var(--warning);
}

.mission-case-blocker::before {
  content: "";
  width: 5px;
  height: 5px;
  border-radius: 999px;
  background: currentColor;
  flex-shrink: 0;
}

.mission-case-open-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 30px;
  padding: 6px 10px;
  border-top: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 4%, #fff);
  color: var(--brand-700);
  font-size: 11px;
  font-weight: 800;
  text-decoration: none;
  touch-action: manipulation;
}

.mission-case-open-btn:active {
  background: color-mix(in srgb, var(--brand-600) 10%, #fff);
}

@media (min-width: 901px) {
  .mission-board-columns {
    display: grid;
    grid-template-columns: repeat(6, minmax(280px, 1fr));
    overflow-x: auto;
    padding: 12px 16px 16px;
    gap: 12px;
  }

  .mission-board-column[data-workflow-stage="closed"] {
    grid-column: span 1;
  }

  .mission-board-column {
    flex: initial;
    min-width: 300px;
  }

  .mission-board-column-title {
    font-size: 12px;
  }
}

.sc-mobile-list-feed {

  margin: 0;

  padding: 0;

  list-style: none;

  display: grid;

  min-width: 0;

}

.sc-mobile-list-section-label {

  padding: 8px 12px 4px;

  font-size: 10px;

  font-weight: 800;

  letter-spacing: 0.06em;

  text-transform: uppercase;

  color: var(--muted);

  background: color-mix(in srgb, var(--foreground) 2%, #fff);

  border-bottom: 1px solid color-mix(in srgb, var(--foreground) 5%, var(--border));

  position: sticky;

  top: 0;

  z-index: 2;

}



.sc-mobile-case-row {

  display: grid;

  gap: 0;

  border-bottom: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));

  background: #fff;

  min-width: 0;

}

.sc-mobile-case-row[data-attention="true"] {

  background: color-mix(in srgb, var(--warning) 4%, #fff);

}

.sc-mobile-case-row-main {

  display: grid;

  gap: 4px;

  padding: 10px 12px 8px;

  text-align: left;

  color: inherit;

  text-decoration: none;

  min-width: 0;

}

.sc-mobile-case-row-top {

  display: flex;

  align-items: flex-start;

  justify-content: space-between;

  gap: 8px;

  min-width: 0;

}

.sc-mobile-case-id {

  font-size: 13px;

  font-weight: 800;

  letter-spacing: -0.01em;

  color: var(--foreground);

  min-width: 0;

  overflow: hidden;

  text-overflow: ellipsis;

  white-space: nowrap;

}

.sc-mobile-case-badges {

  display: flex;

  flex-wrap: nowrap;

  gap: 4px;

  flex-shrink: 0;

  align-items: center;

}

.sc-mobile-case-status-badge {

  display: inline-flex;

  padding: 2px 6px;

  border-radius: 6px;

  font-size: 9px;

  font-weight: 800;

  letter-spacing: 0.02em;

  text-transform: uppercase;

  border: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));

  background: color-mix(in srgb, var(--foreground) 3%, #fff);

  color: var(--muted);

  white-space: nowrap;

}

.sc-mobile-case-status-badge--brand {

  border-color: color-mix(in srgb, var(--brand-600) 28%, var(--border));

  background: color-mix(in srgb, var(--brand-600) 10%, #fff);

  color: var(--brand-700);

}

.sc-mobile-case-priority {

  width: 7px;

  height: 7px;

  border-radius: 999px;

  background: var(--danger);

  flex-shrink: 0;

}

.sc-mobile-case-line {

  font-size: 12px;

  line-height: 1.35;

  color: color-mix(in srgb, var(--foreground) 88%, var(--muted));

  overflow: hidden;

  text-overflow: ellipsis;

  white-space: nowrap;

}

.sc-mobile-case-line strong {

  font-weight: 700;

  color: var(--foreground);

}

.sc-mobile-case-workflow {

  font-size: 11px;

  font-weight: 700;

  color: var(--brand-700);

  line-height: 1.3;

}

.sc-mobile-case-indicators {

  display: flex;

  flex-wrap: wrap;

  gap: 4px;

  align-items: center;

}

.sc-mobile-case-indicator {

  display: inline-flex;

  padding: 2px 6px;

  border-radius: 4px;

  font-size: 9px;

  font-weight: 800;

  letter-spacing: 0.02em;

  text-transform: uppercase;

  border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));

  background: color-mix(in srgb, var(--foreground) 2%, #fff);

  color: var(--muted);

}

.sc-mobile-case-indicator--brand {

  border-color: color-mix(in srgb, var(--brand-600) 22%, var(--border));

  color: var(--brand-700);

}

.sc-mobile-case-indicator--warn {

  border-color: color-mix(in srgb, var(--warning) 30%, var(--border));

  color: var(--warning);

}



.sc-mobile-case-actions {

  display: grid;

  grid-template-columns: repeat(4, 1fr);

  gap: 0;

  border-top: 1px solid color-mix(in srgb, var(--foreground) 5%, var(--border));

}

.sc-mobile-case-action {

  display: flex;

  align-items: center;

  justify-content: center;

  min-height: 36px;

  padding: 6px 4px;

  border: none;

  border-right: 1px solid color-mix(in srgb, var(--foreground) 5%, var(--border));

  background: color-mix(in srgb, var(--foreground) 1.5%, #fff);

  color: var(--brand-700);

  font-size: 10px;

  font-weight: 800;

  text-decoration: none;

  cursor: pointer;

  touch-action: manipulation;

  max-width: none;

  width: auto;

}

.sc-mobile-case-action:last-child {

  border-right: none;

}

.sc-mobile-case-action:disabled {

  opacity: 0.45;

  cursor: not-allowed;

}

.sc-mobile-case-action:active:not(:disabled) {

  background: color-mix(in srgb, var(--brand-600) 8%, #fff);

}



.sc-mobile-list-empty {

  padding: 24px 16px;

  text-align: center;

  display: grid;

  gap: 10px;

  justify-items: center;

}

.sc-mobile-list-empty-title {

  font-size: 14px;

  font-weight: 800;

  color: var(--foreground);

}

.sc-mobile-list-empty-copy {

  font-size: 12px;

  line-height: 1.45;

  color: var(--muted);

  max-width: 280px;

}

.sc-mobile-list-empty-cta {

  display: inline-flex;

  align-items: center;

  justify-content: center;

  min-height: 44px;

  padding: 0 16px;

  border-radius: 10px;

  border: none;

  background: var(--brand-600);

  color: #fff;

  font-size: 13px;

  font-weight: 800;

  text-decoration: none;

  cursor: pointer;

  touch-action: manipulation;

}



.sc-mobile-list-loading {

  padding: 16px 12px;

  font-size: 12px;

  font-weight: 600;

  color: var(--muted);

}



.sc-mobile-list-fab {

  position: fixed;

  right: 14px;

  bottom: calc(14px + env(safe-area-inset-bottom, 0px));

  z-index: 50;

  display: inline-flex;

  align-items: center;

  justify-content: center;

  width: 52px;

  height: 52px;

  border-radius: 999px;

  border: none;

  background: var(--brand-600);

  color: #fff;

  font-size: 26px;

  font-weight: 300;

  line-height: 1;

  text-decoration: none;

  box-shadow: 0 4px 16px color-mix(in srgb, var(--brand-600) 40%, transparent);

  cursor: pointer;

  touch-action: manipulation;

  max-width: none;

}

.sc-mobile-list-fab:active {

  transform: scale(0.96);

}



.sc-mobile-status-sheet-backdrop {

  position: fixed;

  inset: 0;

  z-index: 70;

  background: color-mix(in srgb, var(--foreground) 32%, transparent);

  display: grid;

  align-items: end;

}

.sc-mobile-status-sheet {

  background: #fff;

  border-top-left-radius: 14px;

  border-top-right-radius: 14px;

  padding: 12px 12px max(16px, env(safe-area-inset-bottom, 0px));

  display: grid;

  gap: 8px;

  max-height: min(70vh, 480px);

  overflow-y: auto;

}

.sc-mobile-status-sheet-title {

  font-size: 14px;

  font-weight: 800;

  padding: 0 4px 4px;

}

.sc-mobile-status-option {

  display: flex;

  align-items: center;

  justify-content: space-between;

  min-height: 42px;

  padding: 0 12px;

  border-radius: 10px;

  border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));

  background: #fff;

  font-size: 13px;

  font-weight: 700;

  cursor: pointer;

  touch-action: manipulation;

  max-width: none;

  width: 100%;

}

.sc-mobile-status-option[aria-current="true"] {

  border-color: var(--brand-600);

  background: color-mix(in srgb, var(--brand-600) 8%, #fff);

  color: var(--brand-700);

}

.sc-mobile-status-sheet-close {

  min-height: 40px;

  border-radius: 10px;

  border: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));

  background: #fff;

  font-size: 13px;

  font-weight: 700;

  cursor: pointer;

  max-width: none;

  width: 100%;

}



.surgical-case-motion .sc-mobile-list-segment:hover,

.surgical-case-motion .sc-mobile-case-action:hover {

  filter: none;

}

.surgical-case-motion .sc-mobile-list-segment:active {

  transform: none !important;

  opacity: 0.88;

}

@media (max-width: 640px) {
  .sc-mobile-list-segments-track {
    overflow-x: auto !important;
    overflow-y: visible !important;
  }
  .sc-mobile-list-segments {
    display: inline-flex !important;
    flex-wrap: nowrap !important;
    width: max-content !important;
    max-width: none !important;
    gap: 4px !important;
  }
  .sc-mobile-list-segment {
    flex: 0 0 auto !important;
    flex-shrink: 0 !important;
    max-width: none !important;
    width: auto !important;
    min-height: 44px !important;
    height: 44px !important;
    padding: 0 12px !important;
    font-size: 12px !important;
    line-height: 1 !important;
    transform: none !important;
  }
  .sc-mobile-case-action {
    max-width: none !important;
  }
  .surgical-cases-crm-page button {
    max-width: none;
  }
  .surgical-cases-crm-page .sc-mobile-list-segment,
  .surgical-cases-crm-page .sc-mobile-list-tool-btn,
  .surgical-cases-crm-page .sc-mobile-list-icon-btn,
  .surgical-cases-crm-page .sc-mobile-case-action,
  .surgical-cases-crm-page .sc-mobile-list-fab {
    max-width: none !important;
  }
}

`;


