/**
 * Case detail pages — mission-control polish aligned with provider overview.
 */
export const caseMissionControlPolishCss = `
.surgical-case-detail-shell.mc-workspace,
.product-support-case-detail-shell.mc-workspace {
  background: var(--mc-page-bg) !important;
  padding-bottom: calc(24px + env(safe-area-inset-bottom, 0px));
}

.surgical-case-detail-shell.mc-workspace .case-obs-detail-panel,
.product-support-case-detail-shell.mc-workspace .case-ps-detail-panel {
  padding: 12px 0 8px;
  min-width: 0;
}

/* ── Pill tab bar on soft ops gradient ── */
.surgical-case-detail-shell.mc-workspace .case-obs-detail-tabs,
.product-support-case-detail-shell.mc-workspace .case-ps-detail-tabs {
  display: flex;
  gap: 6px;
  margin: 0 calc(-1 * var(--cod-pad-x, 16px));
  padding: 10px var(--cod-pad-x, 16px) 12px;
  border-bottom: none;
  background: linear-gradient(180deg, #e4eaf2 0%, #eef2f7 55%, #f4f7fb 100%);
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.product-support-case-detail-shell.mc-workspace .case-ps-detail-tabs {
  margin: 0 calc(-1 * var(--psd-pad-x, 16px));
  padding: 10px var(--psd-pad-x, 16px) 12px;
}

.surgical-case-detail-shell.mc-workspace .case-obs-detail-tab,
.product-support-case-detail-shell.mc-workspace .case-ps-detail-tab {
  flex: 0 0 auto;
  margin-bottom: 0;
  padding: 8px 14px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--mc-accent) 12%, var(--mc-border));
  background: rgba(255, 255, 255, 0.72);
  color: var(--mc-meta);
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.01em;
  transition: background 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease, color 0.15s ease;
}

.surgical-case-detail-shell.mc-workspace .case-obs-detail-tab[aria-selected="true"],
.product-support-case-detail-shell.mc-workspace .case-ps-detail-tab[aria-selected="true"] {
  color: color-mix(in srgb, var(--mc-accent) 82%, var(--mc-ink));
  background: #fff;
  border-color: color-mix(in srgb, var(--mc-accent) 32%, var(--mc-border));
  box-shadow:
    0 2px 10px color-mix(in srgb, var(--mc-accent) 14%, transparent),
    inset 0 1px 0 rgba(255, 255, 255, 0.9);
}

.surgical-case-detail-shell.mc-workspace .case-obs-detail-tab:hover,
.product-support-case-detail-shell.mc-workspace .case-ps-detail-tab:hover {
  color: var(--mc-ink-soft);
  border-color: color-mix(in srgb, var(--mc-accent) 22%, var(--mc-border));
}

/* ── Dark deck header: glowing status + hero buttons ── */
.surgical-case-detail-shell .case-obs-detail-header.mc-deck .case-obs-detail-status-badge,
.product-support-case-detail-shell .case-ps-detail-header.mc-deck .case-ps-detail-status-pill {
  color: #fff;
  background: color-mix(in srgb, var(--mc-accent) 72%, rgba(15, 23, 42, 0.9));
  border: 1px solid color-mix(in srgb, var(--mc-accent) 55%, rgba(255, 255, 255, 0.2));
  box-shadow: 0 0 14px color-mix(in srgb, var(--mc-accent) 32%, transparent);
}

.surgical-case-detail-shell .case-obs-detail-header.mc-deck .case-obs-detail-status-badge--in_progress {
  background: color-mix(in srgb, #d97706 72%, rgba(15, 23, 42, 0.9));
  border-color: color-mix(in srgb, #d97706 55%, rgba(255, 255, 255, 0.2));
  box-shadow: 0 0 14px color-mix(in srgb, #d97706 28%, transparent);
}

.surgical-case-detail-shell .case-obs-detail-header.mc-deck .case-obs-detail-status-badge--completed,
.surgical-case-detail-shell .case-obs-detail-header.mc-deck .case-obs-detail-status-badge--debrief_planned {
  background: color-mix(in srgb, #16a34a 72%, rgba(15, 23, 42, 0.9));
  border-color: color-mix(in srgb, #16a34a 55%, rgba(255, 255, 255, 0.2));
  box-shadow: 0 0 14px color-mix(in srgb, #16a34a 28%, transparent);
}

.surgical-case-detail-shell .case-obs-detail-header.mc-deck .case-obs-detail-status-badge--rescheduled {
  background: color-mix(in srgb, #6366f1 72%, rgba(15, 23, 42, 0.9));
  border-color: color-mix(in srgb, #6366f1 55%, rgba(255, 255, 255, 0.2));
  box-shadow: 0 0 14px color-mix(in srgb, #6366f1 28%, transparent);
}

.surgical-case-detail-shell .case-obs-detail-header.mc-deck .case-obs-detail-status-badge--cancelled {
  background: color-mix(in srgb, #64748b 72%, rgba(15, 23, 42, 0.9));
  border-color: color-mix(in srgb, #64748b 55%, rgba(255, 255, 255, 0.2));
  box-shadow: 0 0 14px color-mix(in srgb, #64748b 24%, transparent);
}

.surgical-case-detail-shell .case-obs-detail-header.mc-deck .case-obs-detail-btn,
.product-support-case-detail-shell .case-ps-detail-header.mc-deck .case-ps-detail-btn {
  color: #e2e8f0;
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.14);
}

.surgical-case-detail-shell .case-obs-detail-header.mc-deck .case-obs-detail-btn:hover:not(:disabled),
.product-support-case-detail-shell .case-ps-detail-header.mc-deck .case-ps-detail-btn:hover:not(:disabled) {
  color: #fff;
  border-color: rgba(255, 255, 255, 0.24);
  background: rgba(255, 255, 255, 0.1);
}

.surgical-case-detail-shell .case-obs-detail-header.mc-deck .case-obs-detail-btn--primary,
.product-support-case-detail-shell .case-ps-detail-header.mc-deck .case-ps-detail-btn--primary {
  color: #fff;
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--mc-accent) 92%, #fff),
    color-mix(in srgb, var(--mc-accent) 78%, #0f172a)
  );
  border-color: color-mix(in srgb, var(--mc-accent) 65%, #000);
  box-shadow: 0 4px 16px color-mix(in srgb, var(--mc-accent) 35%, transparent);
}

/* ── Tab content cards ── */
.case-mission-card,
.case-obs-execution,
.case-ps-field-notes-stack,
.case-ps-products-stack,
.case-ps-briefing-grid > .case-ps-briefing-card,
.product-support-case-detail-shell .case-ps-tab-panel > section {
  border-radius: var(--mc-radius-lg);
  border: 1px solid var(--mc-border);
  background: var(--mc-surface);
  box-shadow: var(--mc-elev-surface);
}

.case-obs-execution,
.case-ps-field-notes-stack,
.case-ps-products-stack {
  position: relative;
  max-width: 720px;
  margin: 0 auto;
  padding: 18px 16px 20px;
  min-width: 0;
}

.product-support-case-detail-shell.mc-workspace .case-ps-briefing-grid {
  max-width: 960px;
  margin: 0 auto;
  padding: 4px 0 8px;
}

.case-obs-execution::before,
.case-ps-field-notes-stack::before,
.case-ps-products-stack::before,
.case-ps-briefing-grid > .case-ps-briefing-card--accent::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  border-radius: var(--mc-radius-lg) var(--mc-radius-lg) 0 0;
  background: linear-gradient(
    90deg,
    color-mix(in srgb, var(--mc-accent) 88%, #fff),
    color-mix(in srgb, var(--mc-accent) 45%, transparent)
  );
  pointer-events: none;
}

.case-ps-briefing-grid > .case-ps-briefing-card {
  position: relative;
  overflow: hidden;
  border-radius: var(--mc-radius-lg);
  border: 1px solid var(--mc-border);
  background: var(--mc-surface);
  box-shadow: var(--mc-elev-panel);
}

.case-ps-briefing-grid > .case-ps-briefing-card--accent {
  border-color: color-mix(in srgb, var(--mc-accent) 24%, var(--mc-border));
  background: linear-gradient(
    165deg,
    color-mix(in srgb, var(--mc-accent) 7%, #fff) 0%,
    #fff 48%
  );
}

/* ── Banners sit on surface strip ── */
.surgical-case-detail-shell.mc-workspace .case-obs-detail-banners,
.product-support-case-detail-shell.mc-workspace .case-ps-detail-banners {
  margin: 0 calc(-1 * var(--cod-pad-x, 16px));
  background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
  border-bottom: 1px solid var(--mc-border);
}

.product-support-case-detail-shell.mc-workspace .case-ps-detail-banners {
  margin: 0 calc(-1 * var(--psd-pad-x, 16px));
}

.surgical-case-detail-shell.mc-workspace .case-obs-detail-banners > *,
.product-support-case-detail-shell.mc-workspace .case-ps-detail-banners > * {
  background: transparent;
  border-bottom-color: color-mix(in srgb, var(--mc-border) 70%, transparent);
  color: var(--mc-ink-soft);
}

/* ── Mobile bottom bar: floating mission dock ── */
.case-bottom-action-shell--mobile .case-mobile-bottom-bar {
  margin: 0 auto;
  max-width: min(1180px, 100%);
  border-radius: 16px 16px 0 0;
  border: 1px solid var(--mc-border);
  border-bottom: none;
  background: color-mix(in srgb, #fff 92%, var(--mc-page-bg));
  box-shadow: 0 -8px 28px rgba(15, 23, 42, 0.08);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

.case-mobile-bottom-bar .case-mobile-tab-action--primary .case-mobile-tab-action-icon {
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--brand-600, var(--mc-accent)) 95%, #fff),
    color-mix(in srgb, var(--brand-700, var(--mc-accent)) 88%, #000)
  );
  border-color: color-mix(in srgb, var(--brand-600, var(--mc-accent)) 70%, #000);
  box-shadow: 0 4px 12px color-mix(in srgb, var(--brand-600, var(--mc-accent)) 30%, transparent);
}
`;
