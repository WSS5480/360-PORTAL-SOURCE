/**
 * Mobile readiness floors for Sales Command.
 *
 * Injected by SalesCommandChrome, so these rules only apply on /portal/sales routes.
 * They set minimums that the per-page stylesheets are free to exceed:
 *
 *  - no body text below 11px, and no heading below 13px
 *  - text fields at 16px so iOS does not zoom the page when one is focused
 *  - fields, icon buttons and back links at least 44px on their short edge
 *
 * Deliberately compact chrome (segmented tabs, pills, sticky footers) is left to the
 * page stylesheets; only controls that were small enough to be hard to hit or read
 * are raised here.
 */

export const salesMobileReadinessCss = `
@media (max-width: 900px) {
  /* ---------- layout width guard ---------- */
  /*
   * A page shell that is wider than the screen makes the browser shrink the entire
   * document to fit, which silently shrinks every label on the page. Workspace
   * shells stay inside the screen so wide content scrolls inside its own container.
   */
  /*
   * "max-width: <desktop>; margin: 0 auto" is the page-shell idiom here, and the portal
   * shell lays those shells out as column flex items. Auto side margins opt a flex item
   * out of stretching, so it falls back to its own min-content width — wider than the
   * phone whenever a table or rail inside it is wide. Clamping to 100% keeps the shell on
   * screen and leaves the wide part to scroll inside its own container.
   */
  .portal-content > .crm-sales-page-bg,
  .mc-workspace,
  .sc-native-page,
  .crm-sales-page-bg > * {
    max-width: 100%;
    min-width: 0;
  }

  /* ---------- legibility floor ---------- */
  .pov-pathway-track__label,
  .pov-pathway-track__active-tag,
  .pov-pathway-track__action-tag,
  .pov-cc-pathway__kicker,
  .pov-mission-card__quick-label,
  .provider-mission-board-mobile-step-label,
  .providers-mission-metric-label,
  .providers-mission-command-center-kicker,
  .provider-command-header__stage,
  .directory-view-mode-toggle__label,
  .sc-mobile-list-count,
  .create-engagement-header-meta,
  .create-engagement-mission-card__desc,
  .create-engagement-footer-helper,
  .create-engagement-mission-picker__lead,
  .create-provider-pathway__label,
  .quick-add-phi-hint,
  .lb-badge,
  .lb-you-pill,
  .lb-trend,
  .lb-podium-rank,
  .lb-performance-summary-label,
  .lb-rank-table-rank,
  .lb-rank-table-score-head {
    font-size: 11px !important;
  }

  .create-engagement-recommended-mission__title {
    font-size: 13px !important;
  }

  /* Definition lists on provider and contact records. */
  .provider-workspace-page dt,
  .sales-contact-detail-root dt {
    font-size: 11px !important;
  }

  /* ---------- text fields ---------- */
  /*
   * iOS Safari zooms the viewport when a focused field is under 16px, which leaves
   * the page scrolled sideways after the keyboard closes.
   */
  input:not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="file"]),
  select,
  textarea {
    font-size: 16px !important;
  }

  input:not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="file"]),
  select {
    min-height: 44px;
  }

  .sc-mobile-list-search,
  .opportunity-pipeline-search {
    min-height: 44px !important;
    box-sizing: border-box;
  }

  /* ---------- icon-only and utility controls ---------- */
  .sc-mobile-list-tool-btn,
  .sc-mobile-list-icon-btn,
  .org-action-btn--icon,
  .sales-cal-btn--icon,
  .sales-cal-btn--today,
  .sales-cal-filters-mobile-trigger,
  .compact-action-menu,
  .provider-hd-actions-trigger {
    min-width: 44px;
    min-height: 44px;
  }

  .provider-workspace-page summary,
  .sales-contact-detail-root summary,
  .org-workspace-page summary {
    min-height: 44px;
    display: flex;
    align-items: center;
  }

  /* ---------- back links ---------- */
  .provider-profile-back,
  .create-provider-back,
  .create-engagement-back,
  .create-case-back,
  .prepare-for-meeting-back,
  .engagement-detail-mobile-back {
    display: inline-flex !important;
    align-items: center;
    min-height: 44px;
    font-size: 13px !important;
  }

  /* ---------- inline actions that were only a text row tall ---------- */
  .pov-cc-activity__link,
  .quick-add-new-provider-link,
  .providers-directory-add-btn,
  .providers-directory-contacts-link,
  .create-provider-org-new-link,
  .lb-rank-table-name-btn {
    display: inline-flex;
    align-items: center;
    min-height: 44px;
  }
}
`;
