/**
 * Provider Detail — mobile field-rep briefing (≤768px, tuned for 390–400px).
 * Chrome order: header → What matters now → primary CTA → tabs.
 * Body order: intelligence → relationship → upcoming → activity → cases/initiatives.
 */
export const providerDetailMobileCss = `
@media (max-width: 768px) {
  .provider-profile-root--mobile {
    min-height: 100dvh;
    max-width: 100vw;
    overflow-x: hidden;
  }

  .provider-profile-root--mobile .provider-profile-sticky {
    position: static;
    z-index: auto;
    box-shadow: none;
    border-bottom: none;
    background: #fff;
    max-width: 100vw;
    overflow-x: hidden;
  }

  .provider-profile-mobile-chrome {
    padding: 4px 10px 5px;
    min-width: 0;
    max-width: 100%;
    overflow-x: hidden;
    box-sizing: border-box;
  }

  .provider-profile-root--mobile .provider-profile-header--briefing {
    display: flex;
    flex-direction: column;
    gap: 0;
    min-width: 0;
  }

  .provider-profile-root--mobile .provider-profile-back {
    margin-bottom: 2px;
    font-size: 10px;
  }

  .provider-profile-root--mobile .provider-profile-header--briefing {
    padding: 0;
    background: transparent;
    min-width: 0;
  }

  /* 1. Compact header */
  .provider-profile-root--mobile .provider-readiness-bar {
    margin-top: 4px;
    padding: 6px 8px;
    font-size: 10px;
    line-height: 1.4;
    overflow-x: visible;
    white-space: normal;
    display: flex;
    flex-wrap: wrap;
    gap: 4px 8px;
    -webkit-overflow-scrolling: touch;
  }

  .provider-profile-root--mobile .provider-hd {
    min-width: 0;
  }

  .provider-profile-root--mobile .provider-hd-main {
    display: flex;
    flex-direction: row;
    align-items: flex-start;
    gap: 10px;
    min-width: 0;
  }

  .provider-profile-root--mobile .provider-hd-menu {
    flex-shrink: 0;
    margin-top: 2px;
  }

  .provider-profile-root--mobile .provider-hd--compact .provider-hd-identity {
    flex: 1;
    min-width: 0;
  }

  .provider-profile-root--mobile .provider-hd--compact .provider-hd-name {
    font-size: 17px;
    font-weight: 800;
    letter-spacing: -0.02em;
    line-height: 1.2;
  }

  .provider-profile-root--mobile .provider-hd--compact .provider-hd-meta {
    font-size: 12px;
    margin-top: 2px;
  }

  .provider-profile-root--mobile .provider-hd--compact .provider-hd-lifecycle {
    margin: 3px 0 0;
    font-size: 11px;
    font-weight: 600;
    color: color-mix(in srgb, var(--foreground) 50%, transparent);
  }

  .provider-profile-root--mobile .provider-hd--compact .provider-hd-touch {
    display: none;
  }

  .provider-profile-root--mobile .provider-hd-avatar-wrap,
  .provider-profile-root--mobile .provider-hd-avatar-wrap--compact {
    width: 38px;
    height: 38px;
  }

  .provider-profile-root--mobile .provider-hd-avatar,
  .provider-profile-root--mobile .provider-hd-avatar-wrap--compact .provider-hd-avatar {
    width: 38px;
    height: 38px;
    font-size: 12px;
  }

  .provider-profile-root--mobile .provider-hd-org-logo {
    width: 18px;
    height: 18px;
  }

  .provider-profile-root--mobile .provider-hd-focus-chips {
    margin-top: 4px;
  }

  .provider-profile-root--mobile .provider-hd-focus-chip {
    font-size: 9px;
    max-width: min(160px, 46vw);
  }

  .provider-profile-root--mobile .provider-hd-name {
    font-size: 16px;
    letter-spacing: -0.02em;
    line-height: 1.2;
    overflow-wrap: anywhere;
  }

  .provider-profile-root--mobile .provider-hd-meta {
    font-size: 11px;
    margin-top: 2px;
    overflow-wrap: anywhere;
  }

  .provider-profile-root--mobile .provider-hd-badges {
    margin-top: 4px;
    gap: 3px;
    max-width: 100%;
  }

  .provider-profile-root--mobile .provider-hd-badge {
    font-size: 8px;
    padding: 2px 6px;
    max-width: 46vw;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .provider-profile-root--mobile .provider-hd-touch {
    display: none;
  }

  /* 2. What matters now */
  .provider-profile-root--mobile .provider-wmn {
    margin: 4px 0 0;
    padding: 5px 7px;
    border-radius: 6px;
    min-width: 0;
  }

  .provider-profile-root--mobile .provider-wmn-title {
    font-size: 9px;
    margin-bottom: 3px;
  }

  .provider-profile-root--mobile .provider-wmn-list {
    gap: 2px;
  }

  .provider-profile-root--mobile .provider-wmn-item {
    font-size: 10px;
    line-height: 1.35;
    overflow-wrap: anywhere;
  }

  .provider-profile-root--mobile .provider-wmn-item--next {
    display: flex;
    flex-wrap: wrap;
    gap: 2px 4px;
    align-items: baseline;
  }

  .provider-profile-root--mobile .provider-wmn-next-action {
    font-size: 10px;
  }

  /* Header action row stays compact on mobile — no sticky bottom engagement bar */
  .provider-profile-root--mobile .provider-act-row--hierarchy,
  .provider-profile-root--mobile .provider-cc-next-action-overflow {
    display: none !important;
  }

  .provider-profile-root--mobile .provider-act-btn--primary {
    flex: 1 1 100%;
    width: 100%;
    min-height: 44px;
    max-height: none;
    font-size: 13px;
    font-weight: 800;
    padding: 0 12px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .provider-profile-root--mobile .provider-act-btn--secondary {
    flex: 1 1 calc(50% - 3px);
    min-width: 0;
    min-height: 44px;
    max-height: none;
    font-size: 12px;
    padding: 0 10px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .provider-profile-root--mobile .provider-act-more-wrap {
    flex: 1 1 calc(50% - 3px);
    min-width: 0;
    display: flex !important;
  }

  .provider-profile-root--mobile .provider-act-btn--overflow {
    width: 100%;
    min-height: 44px;
    max-height: none;
    font-size: 12px;
    padding: 0 10px;
    justify-content: center;
    white-space: nowrap;
  }

  .provider-profile-root--mobile .provider-act-menu {
    right: 0;
    left: auto;
    min-width: 200px;
    max-width: calc(100vw - 20px);
  }

  /* Mobile section nav uses ProviderMobileTabNav (providerMobileTabNavCss) */
  .provider-profile-root--mobile .provider-profile-tabs {
    display: none;
  }

  .provider-profile-root--mobile .provider-mobile-tabs-shell {
    max-width: 100vw;
    overflow: visible;
  }

  .provider-profile-root--mobile .provider-mobile-tabs-row {
    max-width: 100%;
    min-width: 0;
  }

  .provider-profile-root--mobile .provider-intel-workspace,
  .provider-profile-root--mobile .pau {
    min-width: 0;
    max-width: 100%;
    overflow-x: visible;
    overflow-wrap: anywhere;
  }

  .provider-profile-root--mobile .pau-intel-card,
  .provider-profile-root--mobile .pau-synthesis,
  .provider-profile-root--mobile .provider-intel-compact-card {
    max-width: 100%;
    min-width: 0;
    overflow: visible;
  }

  .provider-profile-root--mobile .provider-profile-body {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 4px 10px calc(14px + env(safe-area-inset-bottom, 0px));
    min-width: 0;
    max-width: 100%;
    overflow-x: hidden;
    box-sizing: border-box;
  }

  .provider-profile-root--mobile.provider-profile-root--field-execution .provider-profile-body {
    padding-top: 4px;
  }

  .provider-profile-root--mobile.provider-profile-root--field-execution
    .provider-mobile-tab--active {
    color: var(--brand-700, #1d4ed8);
  }

  .provider-profile-root--mobile.provider-profile-root--field-execution
    .provider-mobile-tab--active::after {
    background: var(--brand-600, #2563eb);
  }

  .provider-profile-root--mobile.provider-profile-root--command-center .provider-profile-body {
    padding-top: 2px;
  }

  .provider-profile-root--mobile .provider-cc-layout {
    gap: 12px;
  }

  .provider-profile-root--mobile .provider-cc-row {
    gap: 12px;
  }

  .provider-profile-root--mobile .provider-cc {
    min-width: 0;
    max-width: 100%;
    overflow-x: hidden;
  }

  /* Overview section order (4–8 in scrollable body) */
  .provider-profile-root--mobile .provider-cc-layout {
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 0;
    max-width: 100%;
  }

  /* Rows are grouping on desktop only — flatten on mobile so panel order still works */
  .provider-profile-root--mobile .provider-cc-row {
    display: contents;
  }

  .provider-profile-root--mobile .provider-cc-panel {
    padding: 6px 8px 7px;
    border-radius: 8px;
    min-width: 0;
    max-width: 100%;
    overflow: hidden;
    box-sizing: border-box;
    box-shadow: none;
    border-color: color-mix(in srgb, var(--foreground) 5%, transparent);
  }

  .provider-profile-root--mobile .provider-cc-panel--intel {
    border-color: color-mix(in srgb, var(--brand-600) 10%, var(--border));
    background: color-mix(in srgb, var(--brand-600) 3%, #fff);
  }

  /* Scrollable body order: intel → relationship → upcoming → activity → work */
  .provider-profile-root--mobile .provider-cc-panel--intel {
    order: 1;
  }

  .provider-profile-root--mobile .provider-cc-panel--relationship {
    order: 2;
  }

  .provider-profile-root--mobile .provider-cc-panel--upcoming {
    order: 3;
  }

  .provider-profile-root--mobile .provider-cc-panel--activity {
    order: 4;
  }

  .provider-profile-root--mobile .provider-cc-panel--work {
    order: 5;
  }

  .provider-profile-root--mobile .provider-cc-panel--details {
    order: 6;
  }

  /* Engagements list lives on Engagements tab — keep overview scannable */
  .provider-profile-root--mobile.provider-profile-root--command-center .provider-cc-panel--engagements {
    display: none;
  }

  .provider-profile-root--mobile .provider-cc-panel--engagements,
  .provider-profile-root--mobile .provider-cc-panel--activity {
    max-height: none;
    display: block;
    overflow: visible;
  }

  .provider-profile-root--mobile .provider-cc-section {
    max-width: 100%;
    min-width: 0;
    overflow: hidden;
  }

  .provider-profile-root--mobile .provider-cc-section-head {
    flex-wrap: wrap;
    gap: 4px;
    min-width: 0;
  }

  .provider-profile-root--mobile .provider-cc-section-title {
    font-size: 11px;
    min-width: 0;
    overflow-wrap: anywhere;
  }

  .provider-profile-root--mobile .provider-cc-section-meta {
    font-size: 10px;
    overflow-wrap: anywhere;
  }

  /* 4. Upcoming engagement */
  .provider-profile-root--mobile .provider-upcoming-eng-card {
    padding: 7px 8px;
    gap: 6px;
    min-width: 0;
  }

  .provider-profile-root--mobile .provider-upcoming-eng-type {
    font-size: 12px;
    overflow-wrap: anywhere;
  }

  .provider-profile-root--mobile .provider-upcoming-eng-facts {
    gap: 3px;
  }

  .provider-profile-root--mobile .provider-upcoming-eng-fact {
    grid-template-columns: 58px minmax(0, 1fr);
    font-size: 10px;
    gap: 4px;
  }

  .provider-profile-root--mobile .provider-upcoming-eng-fact dd {
    overflow-wrap: anywhere;
    word-break: break-word;
  }

  .provider-profile-root--mobile .provider-upcoming-eng-actions {
    flex-direction: column;
    align-items: stretch;
    gap: 5px;
    width: 100%;
  }

  .provider-profile-root--mobile .provider-upcoming-eng-cta {
    width: 100%;
    min-height: 44px;
    max-height: none;
    font-size: 13px;
    padding: 0 12px;
    box-sizing: border-box;
  }

  /* 5–6. Intelligence + relationship */
  .provider-profile-root--mobile .provider-intel-briefing {
    gap: 8px;
    padding: 0;
    min-width: 0;
  }

  .provider-profile-root--mobile .provider-intel-lead {
    font-size: 11px;
    line-height: 1.4;
    overflow-wrap: anywhere;
  }

  .provider-profile-root--mobile .provider-intel-signals {
    gap: 6px;
  }

  .provider-profile-root--mobile .provider-intel-signal-title {
    font-size: 9px;
  }

  .provider-profile-root--mobile .provider-intel-signal-detail {
    font-size: 10px;
  }

  .provider-profile-root--mobile .provider-intel-next {
    padding-top: 6px;
  }

  .provider-profile-root--mobile .provider-intel-next-kicker {
    font-size: 9px;
  }

  .provider-profile-root--mobile .provider-intel-next-text {
    font-size: 10px;
    overflow-wrap: anywhere;
  }

  .provider-profile-root--mobile .provider-intel-next-btn {
    font-size: 10px;
  }

  .provider-profile-root--mobile .provider-rel-memory-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
  }

  .provider-profile-root--mobile .provider-rel-memory-age {
    padding-top: 0;
  }

  .provider-profile-root--mobile .provider-rel-signal {
    font-size: 11px;
    padding: 4px 7px 4px 6px;
  }

  .provider-profile-root--mobile .provider-rel-rows {
    gap: 4px;
  }

  .provider-profile-root--mobile .provider-rel-row {
    padding: 5px 7px;
    min-width: 0;
  }

  .provider-profile-root--mobile .provider-rel-row-value,
  .provider-profile-root--mobile .provider-rel-row-value--hint {
    overflow-wrap: anywhere;
    word-break: break-word;
  }

  .provider-profile-root--mobile .provider-rel-cta--compact {
    width: 100%;
    min-height: 44px;
    max-height: none;
    font-size: 13px;
    margin-top: 6px;
    box-sizing: border-box;
  }

  /* 7. Engagements + cases/opportunities — single column, no tables */
  .provider-profile-root--mobile .provider-pipe-grid {
    display: flex !important;
    flex-direction: column !important;
    grid-template-columns: none !important;
    gap: 6px !important;
    min-width: 0;
  }

  .provider-profile-root--mobile .provider-pipe-col {
    padding: 6px 7px;
    min-width: 0;
    max-width: 100%;
  }

  .provider-profile-root--mobile .provider-eng-prev-list,
  .provider-profile-root--mobile .provider-case-prev-list,
  .provider-profile-root--mobile .provider-opp-prev-list {
    min-width: 0;
    max-width: 100%;
  }

  .provider-profile-root--mobile .provider-eng-prev-card,
  .provider-profile-root--mobile .provider-case-prev-card,
  .provider-profile-root--mobile .provider-opp-prev-card {
    min-width: 0;
    max-width: 100%;
    overflow: hidden;
  }

  .provider-profile-root--mobile .provider-eng-prev-card-main,
  .provider-profile-root--mobile .provider-case-prev-main,
  .provider-profile-root--mobile .provider-opp-prev-main {
    padding: 6px 7px;
    min-width: 0;
  }

  .provider-profile-root--mobile .provider-eng-prev-card-top {
    flex-wrap: wrap;
    gap: 4px;
    min-width: 0;
  }

  .provider-profile-root--mobile .provider-eng-prev-type,
  .provider-profile-root--mobile .provider-eng-prev-when,
  .provider-profile-root--mobile .provider-case-prev-type,
  .provider-profile-root--mobile .provider-opp-prev-product {
    overflow-wrap: anywhere;
    word-break: break-word;
  }

  .provider-profile-root--mobile .provider-eng-prev-links {
    flex-wrap: wrap;
    gap: 4px 8px;
    padding: 4px 7px 5px;
  }

  .provider-profile-root--mobile .provider-eng-prev-empty-cta,
  .provider-profile-root--mobile .provider-pipe-empty-cta {
    min-height: 44px;
    max-height: none;
    font-size: 13px;
    width: 100%;
    box-sizing: border-box;
  }

  /* 8. Recent activity */
  .provider-profile-root--mobile .provider-act-prev-list {
    gap: 5px;
    min-width: 0;
    max-width: 100%;
    overflow: visible;
  }

  .provider-profile-root--mobile .provider-act-prev-link {
    padding: 6px 7px;
    min-width: 0;
    max-width: 100%;
    overflow: hidden;
    box-sizing: border-box;
  }

  .provider-profile-root--mobile .provider-act-prev-row-top {
    gap: 4px;
    min-width: 0;
  }

  .provider-profile-root--mobile .provider-act-prev-title,
  .provider-profile-root--mobile .provider-act-prev-summary,
  .provider-profile-root--mobile .provider-act-prev-next {
    font-size: 10px;
  }

  .provider-profile-root--mobile .provider-act-prev-related {
    overflow-wrap: anywhere;
    word-break: break-word;
  }

  .provider-profile-root--mobile .provider-act-prev-time {
    font-size: 9px;
    flex-shrink: 0;
  }

  .provider-profile-root--mobile .provider-cc-empty,
  .provider-profile-root--mobile .provider-pipe-empty,
  .provider-profile-root--mobile .provider-act-prev-empty,
  .provider-profile-root--mobile .provider-eng-prev-empty {
    padding: 6px 0;
    min-width: 0;
  }

  .provider-profile-root--mobile .provider-cc-details-facts,
  .provider-profile-root--mobile .provider-cc-details-orgs {
    display: flex;
    flex-direction: column;
    grid-template-columns: unset !important;
    gap: 6px;
    min-width: 0;
  }

  .provider-profile-root--mobile .provider-cc-details-crm select {
    width: 100%;
    max-width: 100%;
    box-sizing: border-box;
  }

  .provider-profile-root--mobile .provider-profile-section-title {
    font-size: 10px;
    margin: 0 0 4px;
  }

  .provider-profile-root--mobile .provider-compact-list {
    border-radius: 7px;
    min-width: 0;
  }

  .provider-profile-root--mobile .provider-compact-list li {
    padding: 7px 8px;
    min-width: 0;
  }

  .provider-profile-root--mobile .provider-compact-list a {
    font-size: 12px;
    overflow-wrap: anywhere;
  }

  .provider-profile-root--mobile .provider-profile-saved-banner {
    margin: 0 0 4px;
    padding: 7px 8px;
    border-radius: 7px;
    min-width: 0;
  }

  .provider-profile-root--mobile .provider-engagements-tab-actions {
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 0;
  }

  .provider-profile-root--mobile .provider-engagements-tab-actions .provider-profile-action {
    width: 100%;
    min-height: 44px;
    max-height: none;
    font-size: 13px;
    box-sizing: border-box;
  }

  .provider-profile-root--mobile .provider-engagement-mobile-card {
    border-radius: 7px;
    max-width: 100%;
    min-width: 0;
  }

  .provider-profile-root--mobile .provider-engagement-mobile-actions {
    flex-wrap: wrap;
    gap: 4px;
    padding: 6px 7px 7px;
  }

  .provider-profile-root--mobile .provider-engagement-mobile-action {
    min-height: 40px;
    max-height: none;
    padding: 0 10px;
    font-size: 12px;
    flex: 1 1 auto;
    min-width: 0;
    max-width: 100%;
    box-sizing: border-box;
  }

  .provider-profile-root--mobile .provider-planning-summary {
    margin: 0 0 6px;
    min-width: 0;
    overflow: hidden;
  }

  .provider-profile-root--mobile .provider-planning-accordion--mobile .provider-accordion-trigger {
    padding: 7px 8px;
    min-height: 0;
  }

  .provider-profile-root--mobile .provider-planning-save-bar--mobile {
    bottom: calc(6px + env(safe-area-inset-bottom, 0px));
    padding: 6px 10px;
    margin: 0 -10px;
    z-index: 28;
  }

  .provider-profile-root--mobile.provider-profile-root--intelligence-tab .provider-profile-body {
    padding-bottom: calc(60px + env(safe-area-inset-bottom, 0px));
  }

  .provider-profile-root--mobile .unified-activity-feed-toolbar {
    flex-wrap: wrap;
    max-width: 100%;
    overflow: hidden;
  }

  .provider-profile-root--mobile .unified-activity-feed-filters {
    flex-wrap: nowrap;
    overflow-x: auto;
    max-width: 100%;
  }
}

/* 390–400px width polish */
@media (max-width: 420px) {
  .provider-profile-root--mobile .provider-profile-mobile-chrome {
    padding-left: 8px;
    padding-right: 8px;
  }


  .provider-profile-root--mobile .provider-profile-body {
    padding-left: 10px;
    padding-right: 10px;
    padding-bottom: calc(60px + env(safe-area-inset-bottom, 0px));
  }

  .provider-profile-root--mobile .provider-hd-name {
    font-size: 15px;
  }

  .provider-profile-root--mobile .provider-hd-badge {
    max-width: 44vw;
    font-size: 7px;
    padding: 2px 5px;
  }


  .provider-profile-root--mobile .provider-act-btn--primary {
    font-size: 12px;
    min-height: 44px;
    max-height: none;
  }

  .provider-profile-root--mobile .provider-upcoming-eng-cta {
    font-size: 12px;
    min-height: 44px;
    max-height: none;
  }

  .provider-profile-root--mobile .provider-cc-panel {
    padding: 5px 7px 6px;
  }

  .provider-profile-root--mobile .provider-cc-layout {
    gap: 5px;
  }

  .provider-profile-root--mobile .provider-upcoming-eng-fact {
    grid-template-columns: 52px minmax(0, 1fr);
  }

  .provider-profile-root--mobile .provider-cc-text-btn {
    font-size: 10px;
  }
}
`;
