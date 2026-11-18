/** Product Support case detail shell — execution workflow layout (separate from observation). */
export const productSupportCaseDetailShellCss = `
.portal-shell:has(.product-support-case-detail-shell) {
  background: var(--background) !important;
}
.portal-contentWrap:has(.product-support-case-detail-shell) {
  padding: 0 !important;
  padding-top: 0 !important;
}
.portal-content:has(.product-support-case-detail-shell) {
  gap: 0 !important;
  max-width: none !important;
}
.crm-sales-page-bg:has(.product-support-case-detail-shell) {
  gap: 0 !important;
  padding: 0 !important;
  max-width: none !important;
  background: var(--background) !important;
}

.product-support-case-detail-shell {
  --psd-pad-x: 16px;
  --psd-gap: 10px;
  --psd-border: color-mix(in srgb, var(--foreground) 8%, var(--border));
  --psd-muted: color-mix(in srgb, var(--foreground) 55%, var(--muted));
  /* The 100% term matters: without it the tab strip's content width stretches this
     shell past a phone screen, and the browser then shrinks the whole page to fit. */
  max-width: min(1180px, 100%);
  margin: 0 auto;
  min-width: 0;
  padding: 0 var(--psd-pad-x) 24px;
  background: color-mix(in srgb, var(--foreground) 2%, #fff);
  box-sizing: border-box;
}

.product-support-case-detail-shell .case-ps-detail-header {
  display: flex;
  flex-wrap: nowrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px 20px;
  padding: 12px 0 10px;
  border-bottom: 1px solid var(--psd-border);
  background: #fff;
  min-width: 0;
}

.product-support-case-detail-shell .case-ps-detail-header-main {
  display: grid;
  gap: 4px;
  min-width: 0;
  flex: 1 1 auto;
}

.product-support-case-detail-shell .case-ps-detail-back {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  font-size: 12px;
  font-weight: 650;
  color: var(--psd-muted);
  text-decoration: none;
  width: fit-content;
}
.product-support-case-detail-shell .case-ps-detail-back:hover {
  color: var(--foreground);
}

.product-support-case-detail-shell .case-ps-detail-title {
  margin: 0;
  font-size: 20px;
  font-weight: 800;
  line-height: 1.2;
  letter-spacing: -0.02em;
}

.product-support-case-detail-shell .case-ps-detail-kicker {
  margin: 0;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--brand-700);
  line-height: 1.3;
}

.product-support-case-detail-shell .case-ps-detail-subtitle {
  margin: 0;
  font-size: 14px;
  font-weight: 650;
  line-height: 1.35;
  color: var(--foreground);
}

.product-support-case-detail-shell .case-ps-detail-meta {
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  color: var(--psd-muted);
  line-height: 1.35;
}

.product-support-case-detail-shell .case-ps-detail-meta-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 8px 14px;
  margin: 0;
}
.product-support-case-detail-shell .case-ps-detail-meta-item dt {
  margin: 0 0 2px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--psd-muted);
}
.product-support-case-detail-shell .case-ps-detail-meta-item dd {
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.product-support-case-detail-shell .case-ps-detail-provider-link {
  color: inherit;
  font-weight: inherit;
  text-decoration: none;
}

.product-support-case-detail-shell .case-ps-detail-provider-link:hover {
  color: var(--brand-700);
  text-decoration: underline;
  text-underline-offset: 2px;
}

.product-support-case-detail-shell .case-ps-detail-header-actions {
  display: flex;
  flex-wrap: nowrap;
  gap: 8px;
  flex-shrink: 0;
}
.product-support-case-detail-shell .case-ps-detail-btn {
  min-height: 44px;
  padding: 7px 14px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 700;
  border: 1px solid var(--psd-border);
  background: #fff;
  cursor: pointer;
  white-space: nowrap;
  font-family: inherit;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  color: var(--foreground);
}
.product-support-case-detail-shell .case-ps-detail-btn--primary {
  color: #fff;
  background: linear-gradient(180deg, var(--brand-600, #2563eb), color-mix(in srgb, var(--brand-700, #1d4ed8) 92%, #000));
  border-color: color-mix(in srgb, var(--brand-600, #2563eb) 70%, #000);
  box-shadow: 0 4px 14px color-mix(in srgb, var(--brand-600, #2563eb) 28%, transparent);
}
.product-support-case-detail-shell .case-ps-detail-btn--more {
  min-width: 44px;
  padding-inline: 10px;
  font-size: 18px;
  line-height: 1;
}
.product-support-case-detail-shell .case-ps-detail-status-pill {
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 800;
  color: #15803d;
  background: color-mix(in srgb, #16a34a 16%, #fff);
  border: 1px solid color-mix(in srgb, #16a34a 28%, var(--border));
}
.product-support-case-detail-shell .case-ps-detail-tabs {
  display: flex;
  gap: 0;
  overflow-x: auto;
  border-bottom: 1px solid var(--psd-border);
  background: #fff;
  margin: 0 calc(-1 * var(--psd-pad-x));
  padding: 0 var(--psd-pad-x);
  -webkit-overflow-scrolling: touch;
}
.product-support-case-detail-shell .case-ps-detail-tab {
  flex-shrink: 0;
  min-height: 44px;
  padding: 10px 14px;
  border: none;
  border-bottom: 2px solid transparent;
  background: transparent;
  font-size: 13px;
  font-weight: 700;
  color: var(--psd-muted);
  cursor: pointer;
  font-family: inherit;
}
.product-support-case-detail-shell .case-ps-detail-tab[aria-selected="true"] {
  color: var(--brand-700, var(--brand-600));
  border-bottom-color: var(--brand-600);
}
.product-support-case-detail-shell .case-ps-detail-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.product-support-case-detail-shell .case-ps-detail-banners {
  margin: 0 calc(-1 * var(--psd-pad-x));
}
.product-support-case-detail-shell .case-ps-detail-banners > * {
  padding: 8px var(--psd-pad-x);
  border-bottom: 1px solid var(--psd-border);
  font-size: 12px;
  font-weight: 700;
  background: #fff;
}

.product-support-case-detail-shell .case-ps-detail-panel {
  padding-top: var(--psd-gap);
  min-width: 0;
}

.product-support-case-detail-shell .case-ps-detail-card {
  display: grid;
  gap: 8px;
  padding: 10px 12px;
  border: 1px solid var(--psd-border);
  border-radius: 10px;
  background: #fff;
}
.product-support-case-detail-shell .case-ps-detail-card-title {
  margin: 0;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--psd-muted);
}
.product-support-case-detail-shell .case-ps-detail-card-body {
  margin: 0;
  font-size: 14px;
  font-weight: 650;
  line-height: 1.4;
}
.product-support-case-detail-shell .case-ps-detail-card-empty {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--psd-muted);
}
.product-support-case-detail-shell .case-ps-detail-list {
  margin: 0;
  padding: 0 0 0 16px;
  display: grid;
  gap: 4px;
  font-size: 13px;
  font-weight: 650;
  line-height: 1.35;
}
.product-support-case-detail-shell .case-ps-detail-link-btn {
  justify-self: start;
  padding: 0;
  border: none;
  background: none;
  font-size: 13px;
  font-weight: 700;
  color: var(--brand-700, var(--brand-600));
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 2px;
  font-family: inherit;
}

.product-support-case-detail-shell .case-ps-detail-bottom-wrap {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 40;
  pointer-events: none;
}
.product-support-case-detail-shell .case-ps-detail-bottom-wrap .case-mobile-bottom-bar {
  pointer-events: auto;
}

body:has(.product-support-case-detail-shell) .sales-log-update-desktop-btn,
body:has(.product-support-case-detail-shell) .sales-log-update-fab,
body:has(.product-support-case-detail-shell) .sales-mobile-action-bar-shell {
  display: none !important;
}

@media (min-width: 900px) {
  .product-support-case-detail-shell {
    --psd-pad-x: 24px;
    padding-bottom: 32px;
  }
  .product-support-case-detail-shell .case-ps-detail-bottom-wrap {
    display: none !important;
  }
}

@media (max-width: 899px) {
  .product-support-case-detail-shell {
    padding-bottom: calc(52px + env(safe-area-inset-bottom, 0px));
  }
  .product-support-case-detail-shell .case-ps-detail-meta-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .product-support-case-detail-shell .case-ps-detail-meta-item:nth-child(5),
  .product-support-case-detail-shell .case-ps-detail-meta-item:nth-child(6) {
    grid-column: span 1;
  }
  .product-support-case-detail-shell .case-ps-detail-header {
    flex-wrap: wrap;
  }
  .product-support-case-detail-shell .case-ps-detail-header-actions {
    width: 100%;
  }
  .product-support-case-detail-shell .case-ps-detail-header-actions .case-ps-detail-btn {
    flex: 1 1 0;
    min-width: 0;
  }
  .product-support-case-detail-shell .case-ps-detail-provider-link {
    display: inline-flex;
    align-items: center;
    min-height: 44px;
  }
}
`;
