/** Mobile-first organizations directory (≤900px). Desktop chrome uses org-cmd-* inline styles. */

export const orgAccountsListMobileCss = `
.crm-sales-page-bg:has(.org-directory-root) {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  overflow-x: hidden;
  box-sizing: border-box;
}

.org-directory-root {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  overflow-x: hidden;
  box-sizing: border-box;
}

.org-card-mobile-only,
.org-attn-card-mobile,
.org-attn-meta--mobile,
.org-all-section-title {
  display: none;
}

@media (max-width: 900px) {
  .org-directory-desktop-only,
  .org-card-desktop-only,
  .org-attn-card-desktop,
  .org-attn-meta--desktop {
    display: none !important;
  }

  .org-card-mobile-only,
  .org-attn-card-mobile,
  .org-attn-meta--mobile,
  .org-all-section-title {
    display: block;
  }

  .org-directory-root {
    display: flex;
    flex-direction: column;
    min-height: calc(100dvh - 52px);
    background: #fff;
    max-width: 100% !important;
    margin: 0 !important;
    border: none !important;
    border-radius: 0 !important;
    box-shadow: none !important;
  }

  .org-directory-root .sc-mobile-list-sticky-shell,
  .org-directory-root .sc-mobile-list-header,
  .org-directory-root .sc-mobile-list-sticky-tools,
  .org-directory-root .org-directory-list-body {
    width: 100%;
    max-width: 100%;
    min-width: 0;
    box-sizing: border-box;
  }

  .org-directory-root .sc-mobile-list-header-identity {
    min-width: 0;
    overflow: hidden;
  }

  .org-directory-root .sc-mobile-list-title,
  .org-directory-root .sc-mobile-list-count {
    overflow-wrap: break-word;
    word-break: normal;
    white-space: normal;
  }

  .org-directory-root .sc-mobile-list-header-top {
    grid-template-columns: auto minmax(0, 1fr) auto;
    align-items: center;
  }

  .org-directory-root .sc-mobile-list-search-row {
    grid-template-columns: minmax(0, 1fr) 36px;
    min-width: 0;
  }

  .org-directory-root .sc-mobile-list-search-wrap {
    min-width: 0;
    overflow: hidden;
  }

  .org-directory-root .sc-mobile-list-search {
    min-width: 0;
    width: 100%;
  }

  .org-directory-root .org-directory-list-body {
    flex: 1;
    min-width: 0;
    width: 100%;
    max-width: 100%;
    overflow-x: hidden;
    padding-bottom: calc(68px + env(safe-area-inset-bottom, 0px));
  }

  /* Needs attention */
  .org-directory-root .org-attn-section {
    padding: 4px 0 0;
    margin: 0;
    border-bottom: none;
    width: 100%;
    max-width: 100%;
    min-width: 0;
    overflow-x: hidden;
  }

  .org-directory-root .org-attn-head {
    padding: 10px 12px 8px;
    margin-bottom: 0;
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
  }

  .org-directory-root .org-attn-title {
    margin: 0;
    font-size: 11px;
  }

  .org-directory-root .org-attn-meta--mobile {
    font-size: 11px;
    font-weight: 650;
    color: var(--muted);
  }

  .org-directory-root .org-attn-strip {
    display: flex !important;
    flex-direction: column !important;
    gap: 8px !important;
    overflow: hidden !important;
    padding: 0 12px 12px !important;
    margin: 0 !important;
    width: 100% !important;
    max-width: 100% !important;
    box-sizing: border-box;
  }

  .org-directory-root .org-attn-card {
    flex: none !important;
    width: 100% !important;
    max-width: 100% !important;
    min-width: 0 !important;
    box-sizing: border-box;
    border-radius: 10px;
    margin: 0;
    padding: 12px;
    border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
    border-left-width: 3px;
    box-shadow: none;
  }

  .org-attn-card-mobile {
    display: grid;
    gap: 8px;
    min-width: 0;
    width: 100%;
  }

  .org-attn-mobile-name {
    font-size: 16px;
    font-weight: 800;
    letter-spacing: -0.02em;
    line-height: 1.25;
    color: var(--foreground);
    overflow-wrap: break-word;
    word-break: normal;
  }

  .org-attn-mobile-reason {
    margin: 0;
    font-size: 13px;
    line-height: 1.4;
    font-weight: 550;
    color: color-mix(in srgb, var(--foreground) 72%, var(--muted));
    overflow-wrap: break-word;
    word-break: normal;
  }

  .org-attn-mobile-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
  }

  .org-directory-root .org-attn-cta--primary {
    border-color: color-mix(in srgb, var(--brand-600) 42%, var(--border));
    background: var(--brand-600);
    color: #fff;
    font-weight: 800;
  }

  .org-directory-root .org-attn-cta--primary:hover {
    filter: brightness(1.04);
    color: #fff;
  }

  /* All organizations */
  .org-all-section-title {
    margin: 0;
    padding: 12px 12px 6px;
    font-size: 11px;
    font-weight: 850;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: color-mix(in srgb, var(--foreground) 88%, var(--muted));
    border-top: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
  }

  .org-directory-root .org-card-grid {
    display: flex !important;
    flex-direction: column !important;
    grid-template-columns: none !important;
    gap: 0 !important;
    padding: 0 !important;
    width: 100% !important;
    max-width: 100% !important;
    min-width: 0;
  }

  .org-directory-root .org-account-card {
    width: 100% !important;
    max-width: 100% !important;
    min-width: 0 !important;
    box-sizing: border-box;
    border-radius: 0;
    border-left: none;
    border-right: none;
    border-top: none;
    box-shadow: none;
    padding: 0;
    border-bottom: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
    overflow: hidden;
  }

  .org-directory-root .org-account-card:hover,
  .org-directory-root .org-account-card:focus-within {
    transform: none;
    box-shadow: none;
  }

  .org-card-mobile-only {
    width: 100%;
    min-width: 0;
    padding: 12px;
    box-sizing: border-box;
  }

  .org-card-mobile-body {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 10px;
    min-width: 0;
    width: 100%;
  }

  .org-card-mobile-text {
    flex: 1 1 auto;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .org-card-mobile-name {
    display: flex;
    align-items: center;
    /* The name is the row's primary link, so it carries a full touch target. */
    min-height: 44px;
    font-size: 16px;
    font-weight: 800;
    letter-spacing: -0.02em;
    line-height: 1.25;
    color: var(--foreground);
    text-decoration: none;
    overflow-wrap: break-word;
    word-break: normal;
    white-space: normal;
  }

  .org-card-mobile-name:hover {
    color: var(--brand-700);
    text-decoration: underline;
    text-underline-offset: 2px;
  }

  .org-card-mobile-meta {
    font-size: 12px;
    line-height: 1.35;
    color: var(--muted);
    font-weight: 550;
    overflow-wrap: break-word;
    word-break: normal;
  }

  .org-card-mobile-chip {
    align-self: flex-start;
    max-width: 100%;
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.02em;
    line-height: 1.3;
    padding: 3px 8px;
    border-radius: 999px;
    border: 1px solid color-mix(in srgb, var(--warning) 35%, var(--border));
    background: color-mix(in srgb, var(--warning) 10%, var(--surface));
    color: color-mix(in srgb, var(--warning) 55%, var(--foreground));
    overflow-wrap: break-word;
    word-break: normal;
    white-space: normal;
  }

  .org-card-mobile-actions {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    gap: 6px;
  }

  .org-directory-tools {
    border-bottom: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
  }

  .org-directory-add-btn {
    border: 1px solid color-mix(in srgb, var(--brand-600) 22%, var(--border));
    background: color-mix(in srgb, var(--brand-600) 8%, #fff);
    color: var(--brand-700);
  }

  .org-directory-filters {
    display: grid;
    gap: 8px;
    padding: 0 12px 10px;
    min-width: 0;
    width: 100%;
    box-sizing: border-box;
  }

  .org-directory-filters label {
    display: grid;
    gap: 4px;
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--muted);
    min-width: 0;
  }

  .org-directory-filters select {
    width: 100%;
    max-width: 100%;
    min-width: 0;
    min-height: 40px;
    box-sizing: border-box;
    padding: 8px 32px 8px 10px;
    border-radius: 10px;
    border: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));
    font-size: 14px;
    font-weight: 600;
    background: var(--surface);
    color: var(--foreground);
  }

  .org-directory-filters-actions {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    padding-top: 2px;
  }

  .org-directory-clear-filters {
    flex: 0 0 auto;
    border: none;
    background: transparent;
    font-size: 11px;
    font-weight: 800;
    color: var(--brand-700);
    cursor: pointer;
    padding: 6px 0;
    font-family: inherit;
  }

  .org-directory-root .sc-mobile-filter-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    align-items: center;
    padding: 0 12px 8px;
    max-width: 100%;
    min-width: 0;
  }

  .org-directory-root .sc-mobile-filter-chip {
    font-size: 10px;
    font-weight: 800;
    padding: 3px 8px;
    border-radius: 999px;
    border: 1px solid color-mix(in srgb, var(--brand-600) 20%, var(--border));
    background: color-mix(in srgb, var(--brand-600) 8%, var(--surface));
    color: var(--brand-700);
    max-width: 100%;
    overflow-wrap: break-word;
    white-space: normal;
  }

  .org-directory-root .org-menu-pop {
    right: 0;
    left: auto;
    max-width: min(100vw - 24px, 220px);
  }
}

@media (max-width: 1024px) {
  body:has(.org-directory-root) .org-directory-root.sc-native-page {
    padding-bottom: calc(68px + env(safe-area-inset-bottom, 0px));
  }
}

@media (min-width: 721px) and (max-width: 900px) {
  .org-directory-root.sc-native-page,
  .org-cmd-page.org-directory-root.sc-native-page {
    max-width: 100% !important;
    margin: 0 !important;
    border: none !important;
    border-radius: 0 !important;
    box-shadow: none !important;
  }
}

@media (min-width: 901px) {
  .org-directory-mobile-only {
    display: none !important;
  }

  .org-directory-root.sc-native-page {
    display: flex;
    flex-direction: column;
    min-height: 0;
  }
}
`;
