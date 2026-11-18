import { operationsQueueCss } from "../shared/operationsQueueCss";

export const casesOperationsCss = `
${operationsQueueCss}

/* List view (default) — dense scannable table */
.cases-directory-root--operations .mission-board {
  display: none !important;
}

.cases-directory-root--operations .sc-mobile-list-body {
  overflow-y: auto;
}

/* Board view — workflow columns */
.cases-directory-root--mission .cases-list-panel,
.cases-directory-root--mission .cases-list-mobile-list {
  display: none !important;
}

.cases-directory-root--mission .sc-mobile-list-body {
  overflow: hidden;
}

.cases-directory-toolbar-row--view {
  padding: 0 0 8px;
}

.cases-directory-toolbar-row--view .directory-view-mode-toggle {
  width: 100%;
}

.cases-directory-toolbar-row--view .directory-view-mode-toggle__btn {
  flex: 1;
  min-height: 44px;
}

.cases-directory-toolbar-toggle-desktop {
  display: none;
}

.cases-directory-root .sc-mobile-list-search-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.cases-directory-root .sc-mobile-list-search-wrap {
  flex: 1;
  min-width: 0;
}

@media (min-width: 901px) {
  .cases-directory-toolbar-toggle-desktop {
    display: block;
  }

  .cases-directory-toolbar-row--view {
    display: none;
  }
}

/* ======================================================================
   Cases directory — design pass ("field dossier" language).
   Scoped to .cases-directory-root: presentation only, shared components
   (ops queue, identity, header row) are restyled here without edits.
   ====================================================================== */

/* ---- Page canvas ---- */
.cases-directory-root .sc-mobile-list-body {
  background:
    radial-gradient(48rem 18rem at 6% -6%, rgba(13, 148, 136, 0.06), transparent 60%),
    radial-gradient(42rem 16rem at 98% 0%, rgba(37, 99, 235, 0.05), transparent 55%),
    linear-gradient(180deg, #e9edf4 0%, #e2e8f0 100%);
}

/* ---- Sticky command toolbar ---- */
.cases-directory-root .sc-mobile-list-sticky-shell {
  position: sticky;
  background: linear-gradient(180deg, #fff 0%, #fafcff 100%);
  border-bottom: 1px solid color-mix(in srgb, var(--foreground) 9%, var(--border));
  box-shadow: 0 6px 18px rgba(15, 23, 42, 0.05);
}

.cases-directory-root .sc-mobile-list-sticky-shell::before {
  content: "";
  display: block;
  height: 3px;
  background: linear-gradient(90deg, var(--brand-600, #2563eb), #22d3ee 55%, transparent 95%);
}

.cases-directory-root .sc-mobile-list-title {
  font-weight: 850;
  letter-spacing: -0.025em;
}

.cases-directory-root .sc-mobile-list-count {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 3px;
  padding: 2px 9px 2px 7px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.02em;
  color: #0e7490;
  background: color-mix(in srgb, #22d3ee 9%, #fff);
  border: 1px solid color-mix(in srgb, #22d3ee 26%, var(--border));
  font-variant-numeric: tabular-nums;
}

.cases-directory-root .sc-mobile-list-count::before {
  content: "";
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #06b6d4;
}

.cases-directory-root .sc-mobile-list-icon-btn {
  border-radius: 10px;
  color: #fff;
  background: linear-gradient(
    165deg,
    color-mix(in srgb, #22d3ee 22%, var(--brand-600)) 0%,
    var(--brand-600) 55%,
    color-mix(in srgb, var(--brand-600) 88%, #0e7490) 100%
  );
  box-shadow: 0 3px 10px color-mix(in srgb, var(--brand-600) 28%, transparent);
  transition: transform 0.14s ease, box-shadow 0.14s ease, filter 0.14s ease;
}

.cases-directory-root .sc-mobile-list-icon-btn:hover {
  transform: translateY(-1px);
  filter: brightness(1.06);
  box-shadow: 0 5px 14px color-mix(in srgb, var(--brand-600) 36%, transparent);
}

.cases-directory-root .sc-mobile-list-search-wrap {
  border-radius: 11px;
  background: color-mix(in srgb, var(--foreground) 3%, #f6f8fb);
  border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
  transition: border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
}

.cases-directory-root .sc-mobile-list-search-wrap:focus-within {
  background: #fff;
  border-color: color-mix(in srgb, #22d3ee 45%, var(--border));
  box-shadow: 0 0 0 3px color-mix(in srgb, #22d3ee 16%, transparent);
}

.cases-directory-root .sc-mobile-list-tool-btn {
  border-radius: 10px;
  transition: transform 0.14s ease, border-color 0.14s ease, background 0.14s ease, box-shadow 0.14s ease;
}

.cases-directory-root .sc-mobile-list-tool-btn:hover {
  transform: translateY(-1px);
  border-color: color-mix(in srgb, #22d3ee 35%, var(--border));
  background: color-mix(in srgb, #22d3ee 6%, #fff);
  box-shadow: 0 3px 10px rgba(15, 23, 42, 0.08);
}

/* ---- Entrance: panels settle in ---- */
@media (prefers-reduced-motion: no-preference) {
  .cases-directory-root .cases-list-panel,
  .cases-directory-root .cases-list-mobile-list,
  .cases-directory-root .mission-board-column {
    animation: cases-rise 0.4s cubic-bezier(0.22, 0.9, 0.32, 1) backwards;
  }
  .cases-directory-root .mission-board-column:nth-child(2) { animation-delay: 0.05s; }
  .cases-directory-root .mission-board-column:nth-child(3) { animation-delay: 0.1s; }
  .cases-directory-root .mission-board-column:nth-child(4) { animation-delay: 0.15s; }
  .cases-directory-root .mission-board-column:nth-child(5) { animation-delay: 0.2s; }
  .cases-directory-root .mission-board-column:nth-child(n + 6) { animation-delay: 0.25s; }
}

@keyframes cases-rise {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* =========================== List view =========================== */

.cases-directory-root--operations .sc-mobile-list-body {
  padding-top: 12px;
}

.cases-directory-root .cases-list-panel {
  margin: 0 14px 16px;
  border-radius: 16px;
  background: #fff;
  border: 1px solid color-mix(in srgb, var(--foreground) 9%, var(--border));
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.07);
  overflow: hidden;
}

.cases-directory-root .cases-list-head {
  padding: 10px 16px;
  background: linear-gradient(180deg, #f8fafc, #f1f5f9);
  border-bottom: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
  font-size: 10px;
  letter-spacing: 0.1em;
  color: color-mix(in srgb, var(--foreground) 55%, var(--muted));
}

.cases-directory-root .cases-list-row.ops-queue-row--clickable .ops-queue-row__main {
  min-height: 44px;
  padding: 10px 16px;
  border-bottom: 1px solid color-mix(in srgb, var(--foreground) 5%, var(--border));
  transition: background 0.14s ease, box-shadow 0.14s ease;
}

.cases-directory-root .cases-list-row.ops-queue-row--clickable:last-child .ops-queue-row__main {
  border-bottom: none;
}

.cases-directory-root .cases-list-row.ops-queue-row--clickable:hover {
  background: transparent;
  box-shadow: none;
}

.cases-directory-root .cases-list-row.ops-queue-row--clickable:hover .ops-queue-row__main {
  background: color-mix(in srgb, #22d3ee 5%, #fff);
  box-shadow: inset 3px 0 0 color-mix(in srgb, #06b6d4 70%, transparent);
}

.cases-directory-root .cases-list-row--attention .ops-queue-row__main {
  background: linear-gradient(90deg, color-mix(in srgb, #f59e0b 7%, #fff), color-mix(in srgb, #f59e0b 3%, #fff) 55%, #fff);
  box-shadow: inset 3px 0 0 color-mix(in srgb, #f59e0b 75%, transparent);
}

.cases-directory-root .cases-list-row--attention:hover .ops-queue-row__main {
  background: linear-gradient(90deg, color-mix(in srgb, #f59e0b 10%, #fff), color-mix(in srgb, #f59e0b 5%, #fff) 55%, #fff);
  box-shadow: inset 3px 0 0 color-mix(in srgb, #f59e0b 90%, transparent);
}

/* The "Open" affordance reads as a button and nudges on hover. */
.cases-directory-root .cases-list-mobile-row .ops-queue-open-hint,
.cases-directory-root .cases-list-row .ops-queue-open-hint {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-height: 26px;
  padding: 0 10px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--brand-600) 20%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 6%, #fff);
  color: var(--brand-700);
  transition: background 0.14s ease, color 0.14s ease, border-color 0.14s ease;
}

.cases-directory-root .cases-list-mobile-row .ops-queue-open-hint::after,
.cases-directory-root .cases-list-row .ops-queue-open-hint::after {
  content: "\\2192";
  font-size: 11px;
  transition: transform 0.14s ease;
}

.cases-directory-root .cases-list-mobile-row.ops-queue-mobile-row--clickable:hover .ops-queue-open-hint {
  background: var(--brand-600);
  border-color: var(--brand-600);
  color: #fff;
}

.cases-directory-root .cases-list-row.ops-queue-row--clickable:hover .ops-queue-open-hint {
  background: var(--brand-600);
  border-color: var(--brand-600);
  color: #fff;
}

.cases-directory-root .cases-list-row.ops-queue-row--clickable:hover .ops-queue-open-hint::after {
  transform: translateX(2px);
}

/* Case identity inside the list — teal kicker with marker dot. */
.cases-directory-root .cases-list-row .case-identity-type,
.cases-directory-root .cases-list-mobile-row .case-identity-type {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: #0f766e;
}

.cases-directory-root .cases-list-row .case-identity-type::before,
.cases-directory-root .cases-list-mobile-row .case-identity-type::before {
  content: "";
  width: 5px;
  height: 5px;
  border-radius: 2px;
  background: #14b8a6;
}

/* ---- Mobile list rows: floating cards ---- */
.cases-directory-root .cases-list-mobile-list {
  padding: 12px 12px 16px;
  display: grid;
  gap: 8px;
}

.cases-directory-root .cases-list-mobile-row.ops-queue-mobile-row {
  border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 4px 14px rgba(15, 23, 42, 0.05);
  overflow: hidden;
  transition: transform 0.14s ease, box-shadow 0.14s ease, border-color 0.14s ease;
}

.cases-directory-root .cases-list-mobile-row.ops-queue-mobile-row--clickable:hover {
  transform: translateY(-1px);
  border-color: color-mix(in srgb, #22d3ee 32%, var(--border));
  background: #fff;
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.09);
}

.cases-directory-root .cases-list-mobile-row--attention.ops-queue-mobile-row--clickable {
  background: linear-gradient(180deg, color-mix(in srgb, #f59e0b 6%, #fff), #fff 70%);
  border-color: color-mix(in srgb, #f59e0b 30%, var(--border));
  box-shadow: inset 3px 0 0 color-mix(in srgb, #f59e0b 75%, transparent), 0 4px 14px rgba(15, 23, 42, 0.05);
}

/* =========================== Board view =========================== */

.cases-directory-root .mission-board {
  background:
    radial-gradient(46rem 18rem at 8% -8%, rgba(13, 148, 136, 0.07), transparent 60%),
    radial-gradient(40rem 16rem at 96% 0%, rgba(37, 99, 235, 0.06), transparent 55%),
    linear-gradient(180deg, #e9edf4 0%, #e2e8f0 100%);
}

/* Stage accent palette — the board reads left-to-right as a pipeline. */
.cases-directory-root .mission-board-column {
  --stage-accent: #64748b;
  position: relative;
  border-radius: 14px;
  border: 1px solid color-mix(in srgb, var(--foreground) 9%, var(--border));
  background: linear-gradient(180deg, #fbfcfe, #f4f7fa);
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.06);
}

.cases-directory-root .mission-board-column[data-workflow-stage="requested"] { --stage-accent: #64748b; }
.cases-directory-root .mission-board-column[data-workflow-stage="approved"] { --stage-accent: #2563eb; }
.cases-directory-root .mission-board-column[data-workflow-stage="scheduled"] { --stage-accent: #0d9488; }
.cases-directory-root .mission-board-column[data-workflow-stage="completed"] { --stage-accent: #059669; }
.cases-directory-root .mission-board-column[data-workflow-stage="debrief_ready"] { --stage-accent: #9333ea; }
.cases-directory-root .mission-board-column[data-workflow-stage="follow_up"] { --stage-accent: #d97706; }
.cases-directory-root .mission-board-column[data-workflow-stage="closed"] { --stage-accent: #94a3b8; }

.cases-directory-root .mission-board-column::before {
  content: "";
  position: absolute;
  inset: 0 0 auto;
  height: 3px;
  background: linear-gradient(90deg, var(--stage-accent), color-mix(in srgb, var(--stage-accent) 35%, transparent));
  z-index: 1;
}

.cases-directory-root .mission-board-column-header {
  padding: 11px 12px 10px;
  background: #fff;
  border-bottom: 1px solid color-mix(in srgb, var(--stage-accent) 14%, var(--border));
}

.cases-directory-root .mission-board-column-title {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 11px;
  font-weight: 850;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--stage-accent) 72%, var(--foreground));
}

.cases-directory-root .mission-board-column-title::before {
  content: "";
  flex-shrink: 0;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--stage-accent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--stage-accent) 16%, transparent);
}

.cases-directory-root .mission-board-column-count {
  min-width: 22px;
  height: 20px;
  border-radius: 999px;
  color: color-mix(in srgb, var(--stage-accent) 80%, #000);
  background: color-mix(in srgb, var(--stage-accent) 11%, #fff);
  border: 1px solid color-mix(in srgb, var(--stage-accent) 26%, transparent);
  font-variant-numeric: tabular-nums;
}

.cases-directory-root .mission-board-column-cards {
  padding: 10px;
  gap: 10px;
}

/* ---- Board cards ---- */
.cases-directory-root .cases-board-card {
  border-radius: 14px;
  border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
  box-shadow: 0 3px 10px rgba(15, 23, 42, 0.05);
  transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
}

.cases-directory-root .cases-board-card:has(.cases-board-card-link:hover) {
  transform: translateY(-2px);
  border-color: color-mix(in srgb, var(--stage-accent, var(--brand-600)) 32%, var(--border));
  box-shadow: 0 12px 26px rgba(15, 23, 42, 0.11);
}

.cases-directory-root .cases-board-card[data-needs-attention="true"] {
  background: linear-gradient(180deg, color-mix(in srgb, #f59e0b 6%, #fff), #fff 65%);
  border-color: color-mix(in srgb, #f59e0b 28%, var(--border));
  box-shadow: inset 3px 0 0 color-mix(in srgb, #f59e0b 75%, transparent), 0 3px 10px rgba(15, 23, 42, 0.05);
}

.cases-directory-root .cases-board-card[data-needs-attention="true"]:has(.cases-board-card-link:hover) {
  border-color: color-mix(in srgb, #f59e0b 42%, var(--border));
  box-shadow: inset 3px 0 0 color-mix(in srgb, #f59e0b 90%, transparent), 0 12px 26px color-mix(in srgb, #f59e0b 14%, transparent);
}

.cases-directory-root .cases-board-card-provider {
  letter-spacing: -0.015em;
}

.cases-directory-root .cases-board-card-date {
  color: color-mix(in srgb, var(--stage-accent, var(--foreground)) 60%, var(--muted));
}

/* Insight reads as a annotated callout. */
.cases-directory-root .cases-board-card-priority-insight {
  padding: 8px 10px;
  border-radius: 10px;
  background: color-mix(in srgb, var(--stage-accent, #64748b) 5%, #f8fafc);
  border-left: 2px solid color-mix(in srgb, var(--stage-accent, #64748b) 55%, transparent);
}

.cases-directory-root .cases-board-card-priority-insight-label {
  color: color-mix(in srgb, var(--stage-accent, #64748b) 65%, var(--muted));
}

.cases-directory-root .cases-board-card-metric-pill {
  border-radius: 7px;
  background: color-mix(in srgb, var(--foreground) 3%, #fff);
  transition: border-color 0.14s ease, background 0.14s ease;
}

.cases-directory-root .cases-board-card-link:hover .cases-board-card-metric-pill {
  border-color: color-mix(in srgb, var(--stage-accent, var(--brand-600)) 24%, var(--border));
}

/* CTA — gradient, with an arrow that nudges on hover. */
.cases-directory-root .cases-board-card-cta {
  gap: 7px;
  border-radius: 11px;
  background: linear-gradient(
    165deg,
    color-mix(in srgb, #22d3ee 22%, var(--brand-600)) 0%,
    var(--brand-600) 55%,
    color-mix(in srgb, var(--brand-600) 88%, #0e7490) 100%
  );
  box-shadow: 0 4px 12px color-mix(in srgb, var(--brand-600) 26%, transparent), inset 0 1px 0 rgba(255, 255, 255, 0.22);
  transition: filter 0.14s ease, box-shadow 0.14s ease;
}

.cases-directory-root .cases-board-card-cta::after {
  content: "\\2192";
  font-size: 13px;
  transition: transform 0.14s ease;
}

.cases-directory-root .cases-board-card-link:hover .cases-board-card-cta {
  filter: brightness(1.06);
  box-shadow: 0 6px 16px color-mix(in srgb, var(--brand-600) 34%, transparent), inset 0 1px 0 rgba(255, 255, 255, 0.22);
}

.cases-directory-root .cases-board-card-link:hover .cases-board-card-cta::after {
  transform: translateX(3px);
}

.cases-directory-root .cases-board-card[data-needs-attention="true"] .cases-board-card-cta {
  background: linear-gradient(165deg, #f59e0b 0%, #d97706 60%, #b45309 100%);
  box-shadow: 0 4px 12px color-mix(in srgb, #d97706 30%, transparent), inset 0 1px 0 rgba(255, 255, 255, 0.25);
}

/* ---- Floating action button ---- */
.cases-directory-root .sc-mobile-list-fab {
  background: linear-gradient(
    165deg,
    color-mix(in srgb, #22d3ee 22%, var(--brand-600)) 0%,
    var(--brand-600) 55%,
    color-mix(in srgb, var(--brand-600) 88%, #0e7490) 100%
  );
  box-shadow: 0 10px 26px color-mix(in srgb, var(--brand-600) 40%, transparent), inset 0 1px 0 rgba(255, 255, 255, 0.25);
  transition: transform 0.15s ease, box-shadow 0.15s ease, filter 0.15s ease;
}

.cases-directory-root .sc-mobile-list-fab:hover {
  transform: translateY(-2px);
  filter: brightness(1.06);
  box-shadow: 0 14px 32px color-mix(in srgb, var(--brand-600) 48%, transparent), inset 0 1px 0 rgba(255, 255, 255, 0.25);
}

/* ---- Empty state ---- */
.cases-directory-root .sc-mobile-list-empty {
  margin: 16px 14px;
  padding: 30px 20px;
  border-radius: 16px;
  background:
    radial-gradient(20rem 8rem at 50% -40%, rgba(13, 148, 136, 0.08), transparent 70%),
    #fff;
  border: 1.5px dashed color-mix(in srgb, var(--foreground) 16%, var(--border));
}
`;
