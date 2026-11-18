/** Inline portal menu on Sales Command mobile chrome (replaces fixed top-left shortcut). */
export const salesCmdMobileMenuCss = `
.surgical-cmd-header-menu {
  display: none;
}

@media (max-width: 900px) {
  .surgical-cmd-header {
    display: grid !important;
    grid-template-columns: auto minmax(0, 1fr);
    grid-template-rows: auto auto;
    align-items: start !important;
    gap: 8px 10px !important;
    padding: 8px 12px 6px;
    margin: 0 -12px;
    border-bottom: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
    background: #fff;
  }

  .surgical-cmd-header--on-dark {
    background: transparent;
    border-bottom: none;
    margin: 0;
  }

  .surgical-cmd-header-menu {
    display: inline-flex;
    grid-column: 1;
    grid-row: 1 / span 2;
    align-self: start;
    flex-shrink: 0;
    margin: 0;
  }

  .surgical-cmd-header-main {
    grid-column: 2;
    grid-row: 1;
    min-width: 0;
  }

  .surgical-cmd-header-actions {
    grid-column: 1 / -1;
    grid-row: 2;
    width: 100%;
    flex: none !important;
  }

  .crm-sales-page-bg > div[aria-hidden]:first-of-type {
    display: none;
  }

  .sales-cmd-mobile-menu {
    flex-shrink: 0;
    margin: 0;
  }

  .sales-cmd-mobile-chrome {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    align-items: center;
    gap: 8px;
    padding: 8px 12px 6px;
    border-bottom: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
    background: #fff;
  }

  .sales-cmd-mobile-chrome--flush {
    padding-left: 12px;
    padding-right: 12px;
    border-bottom: none;
  }

  /* Always-available sidebar control when a screen omits an in-page ☰. */
  .sales-cmd-mobile-menu-fallback {
    position: fixed;
    top: max(10px, env(safe-area-inset-top, 0px));
    left: max(10px, env(safe-area-inset-left, 0px));
    z-index: 70;
    box-shadow: 0 8px 22px rgba(2, 6, 23, 0.18);
    background: rgba(255, 255, 255, 0.96);
    border: 1px solid rgba(15, 23, 42, 0.12);
  }
}

@media (min-width: 901px) {
  .sales-cmd-mobile-menu-fallback {
    display: none !important;
  }
}
`;
