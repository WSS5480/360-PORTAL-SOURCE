/** Native-mobile polish for surgical case workspace at all viewport widths. */
export const caseMobilePolishCss = `
  .case-workspace-page {
    --case-m-xs: 10px;
    --case-m-sm: 11px;
    --case-m-md: 12px;
    --case-m-lg: 13px;
    --case-m-icon: 15px;
    --case-m-tap: 40px;
    --case-m-divider: color-mix(in srgb, var(--foreground) 6%, var(--border));
    --case-m-pad-x: 12px;
    -webkit-text-size-adjust: 100%;
    text-size-adjust: 100%;
  }

  .case-detail-page-pad {
    padding-bottom: calc(46px + env(safe-area-inset-bottom, 0px)) !important;
  }

  .case-workspace-body {
    gap: 0 !important;
  }

  .case-workspace-body > .case-workspace-banner--toast {
    margin: 0 !important;
    padding: 6px var(--case-m-pad-x) !important;
    border: none !important;
    border-bottom: 1px solid var(--case-m-divider) !important;
    border-radius: 0 !important;
    background: #fff !important;
    font-size: var(--case-m-sm) !important;
    font-weight: 700 !important;
    line-height: 1.35 !important;
    box-shadow: none !important;
  }

  .case-mobile-panel.case-detail-surface {
    border: none !important;
    border-radius: 0 !important;
    box-shadow: none !important;
    padding: 0 !important;
    background: #fff !important;
    min-width: 0;
  }

  .case-mobile-panel + .case-mobile-panel,
  .case-workspace-body > .case-detail-surface + .case-detail-surface {
    border-top: none !important;
  }

  /* Unified 15px inline icons in mobile panels */
  .case-mobile-overview-icon svg,
  .case-mobile-header-icons svg,
  .case-activity-quick-note-icon svg,
  .case-mobile-tab-action-icon svg {
    width: var(--case-m-icon) !important;
    height: var(--case-m-icon) !important;
  }

  .case-wf-progress-dot--done svg {
    width: 10px !important;
    height: 10px !important;
  }

  /* Flatten legacy shell workflow progress wrapper */
  .case-mobile-overview-panel .case-wf-progress {
    border-top: 1px solid var(--case-m-divider) !important;
  }

  .case-wf-progress {
    margin: 0 !important;
    border: none !important;
    border-radius: 0 !important;
    box-shadow: none !important;
  }

  /* Bottom bar: edge-to-edge, compact, no floating card */
  .case-bottom-action-shell--mobile {
    padding: 0 !important;
    left: 0 !important;
    right: 0 !important;
    width: 100% !important;
    max-width: 100% !important;
  }

  .case-mobile-bottom-bar {
    height: auto !important;
    min-height: 44px !important;
    padding: 2px 2px calc(2px + env(safe-area-inset-bottom, 0px)) !important;
    border-top: 1px solid var(--case-m-divider) !important;
    box-shadow: none !important;
  }

  .case-mobile-bottom-bar .case-mobile-tab-action {
    gap: 2px !important;
    min-height: 44px !important;
    min-width: 0 !important;
    max-width: none !important;
    padding: 2px 4px !important;
  }

  .case-mobile-bottom-bar .case-mobile-tab-action-icon {
    width: 28px !important;
    height: 28px !important;
    border-radius: 8px !important;
    border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border)) !important;
    background: color-mix(in srgb, var(--foreground) 4%, #fff) !important;
  }

  .case-mobile-bottom-bar .case-mobile-tab-action--primary .case-mobile-tab-action-icon {
    background: var(--brand-600) !important;
    border-color: var(--brand-600) !important;
  }

  .case-mobile-bottom-bar .case-mobile-tab-action-label {
    font-size: var(--case-m-xs) !important;
    font-weight: 600 !important;
    max-width: 100% !important;
  }

  /* Modals: compact on phone */
  .case-modal-shell-panel {
    max-height: min(88vh, 720px);
    border-radius: 12px 12px 0 0 !important;
  }

  .status-pick-list {
    gap: 6px !important;
  }

  .status-pick-list > button {
    min-height: 42px !important;
    padding: 8px 12px !important;
    font-size: var(--case-m-md) !important;
    border-radius: 8px !important;
  }

  /* Prevent horizontal bleed */
  .case-workspace-page *,
  .case-workspace-page *::before,
  .case-workspace-page *::after {
    box-sizing: border-box;
  }

  .case-workspace-page img,
  .case-workspace-page video,
  .case-workspace-page svg {
    max-width: 100%;
  }

  .case-workspace-page input,
  .case-workspace-page textarea,
  .case-workspace-page select {
    font-size: 16px;
    max-width: 100%;
  }

  .case-workspace-page button:not(.case-activity-feed-filter):not(.case-workspace-tab):not(.case-mobile-tab-action) {
    max-width: 100%;
  }

  .case-mobile-only.case-activity-feed-mobile {
    display: grid !important;
  }

  .case-activity-feed-filters {
    flex-wrap: nowrap !important;
    overflow-x: auto !important;
    overflow-y: hidden !important;
    -webkit-overflow-scrolling: touch;
  }

  .case-activity-feed-filter {
    flex: 0 0 auto !important;
    flex-shrink: 0 !important;
    max-width: none !important;
    width: auto !important;
    min-height: 28px !important;
    transform: none !important;
  }

  .case-workflow-fallback-panel {
    border: none !important;
    border-radius: 0 !important;
    box-shadow: none !important;
    padding: 10px var(--case-m-pad-x) !important;
    background: #fff !important;
  }

  .case-workflow-fallback-copy {
    margin: 0;
    font-size: var(--case-m-sm);
    color: var(--muted);
    line-height: 1.4;
  }

  .case-workflow-loose-actions {
    display: none !important;
  }

  .case-wf-progress-cta {
    padding: 7px 12px !important;
    font-size: 11px !important;
  }

@media (min-width: 721px) {
  .case-workspace-page {
    --case-m-xs: 12px;
    --case-m-sm: 13px;
    --case-m-md: 14px;
    --case-m-lg: 16px;
    --case-m-icon: 18px;
    --case-m-tap: 48px;
    --case-m-pad-x: 20px;
  }

  .case-workspace-page input,
  .case-workspace-page textarea,
  .case-workspace-page select {
    font-size: 14px;
  }
}

@media (max-width: 400px) {
  .case-workspace-page {
    --case-m-pad-x: 10px;
  }

  .case-workspace-tabbar .case-workspace-tab {
    font-size: var(--case-m-xs) !important;
    padding: 6px 2px 4px !important;
  }

  .case-mobile-header-title {
    font-size: 14px !important;
  }

  .case-mobile-bottom-bar .case-mobile-tab-action-label {
    font-size: 11px !important;
  }
}

  .case-pre-call-plan--embedded {
    margin: 0;
    padding: 0;
    border: none;
  }
  .case-pre-call-plan--embedded .case-pre-call-plan-fields {
    gap: 8px;
  }
  .case-pre-call-plan {
    margin: 0 0 12px;
    padding: 12px var(--case-m-pad-x);
    border-bottom: 1px solid var(--case-m-divider);
    display: grid;
    gap: 10px;
  }
  .case-pre-call-plan-head {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: flex-start;
    justify-content: space-between;
  }
  .case-pre-call-plan-title {
    margin: 0;
    font-size: 14px;
    font-weight: 900;
    line-height: 1.25;
  }
  .case-pre-call-plan-sub {
    margin: 4px 0 0;
    font-size: 11px;
    color: var(--muted);
    line-height: 1.45;
    max-width: 52ch;
  }
  .case-pre-call-plan-progress {
    font-size: 11px;
    font-weight: 800;
    color: var(--brand-700);
    white-space: nowrap;
  }
  .case-pre-call-plan-fields {
    display: grid;
    gap: 10px;
  }
  .case-pre-call-plan-field {
    display: grid;
    gap: 4px;
  }
  .case-pre-call-plan-label {
    font-size: 12px;
    font-weight: 800;
  }
  .case-pre-call-plan-helper {
    font-size: 10px;
    color: var(--muted);
    line-height: 1.4;
  }
  .case-pre-call-plan-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
  }
}
`;
