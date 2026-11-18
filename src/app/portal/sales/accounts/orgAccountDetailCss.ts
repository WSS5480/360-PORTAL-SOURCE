/** Organization account detail — shared + mobile-native (≤1024px, matches JS `narrow`). */

export const orgAccountDetailCss = `
.org-account-tabs::-webkit-scrollbar { display: none; }
.org-account-detail-root .org-account-tabs { max-width: 100%; }
.org-contact-card-grid {
  width: 100%;
  grid-template-columns: minmax(0, 1fr);
  align-items: stretch;
}
.org-doctor-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 20px color-mix(in srgb, var(--brand-600) 16%, transparent);
}
.org-support-card:hover {
  border-color: color-mix(in srgb, var(--foreground) 12%, var(--border));
}
.org-doctor-card,
.org-support-card {
  cursor: default;
  position: relative;
  z-index: 0;
  overflow: visible;
}
.compact-action-menu {
  position: relative;
}
.compact-action-menu-popover {
  z-index: 200;
}
.org-contact-card-grid a,
.org-contact-card-grid button,
.org-contact-card-grid summary {
  transition: background-color 0.14s ease, border-color 0.14s ease, box-shadow 0.14s ease, transform 0.12s ease;
}
.org-contact-card-grid a:hover,
.org-contact-card-grid button:hover,
.org-contact-card-grid summary:hover {
  border-color: color-mix(in srgb, var(--brand-600) 34%, var(--border));
}
.org-contact-card-grid a:active,
.org-contact-card-grid button:active,
.org-contact-card-grid summary:active {
  transform: translateY(0.5px);
}
.org-contact-card-grid summary {
  cursor: pointer;
}
.org-contact-card-grid a:focus-visible,
.org-contact-card-grid button:focus-visible,
.org-contact-card-grid summary:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--brand-600) 62%, transparent);
  outline-offset: 1px;
}
.org-contact-card-grid [role="listitem"] {
  transition: border-color 0.14s ease, background-color 0.14s ease;
}
.org-contact-card-grid [role="listitem"]:hover {
  border-color: color-mix(in srgb, var(--brand-600) 30%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 10%, var(--surface));
}
@media (min-width: 1024px) {
  .org-contact-card-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (min-width: 1440px) {
  .org-contact-card-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
.org-contacts-filter-scroll::-webkit-scrollbar,
.org-case-status-scroll::-webkit-scrollbar,
.org-activity-filter-scroll::-webkit-scrollbar,
.org-contacts-top-actions::-webkit-scrollbar { display: none; }

.org-intel-upcoming-cards { display: none; }
.org-intel-upcoming-card {
  border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
  border-radius: 10px;
  padding: 10px 12px;
  display: grid;
  gap: 4px;
  font-size: 13px;
  background: var(--surface);
}
.org-intel-upcoming-card-row {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  align-items: baseline;
}
.org-intel-upcoming-card-label {
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--muted);
}

@media (max-width: 1024px) {
  .org-account-detail-native.org-workspace-page {
    background: #fff;
  }
  .org-account-detail-native .org-tab-content {
    /* Bottom room so the fixed quick-action bar never sits on top of content. */
    padding: 0 12px calc(96px + env(safe-area-inset-bottom, 0px));
    min-width: 0;
  }
  .org-detail-mobile-sticky .org-account-tabs {
    display: flex;
    flex-wrap: nowrap;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    gap: 8px;
    padding-bottom: 4px;
    scrollbar-width: none;
  }
  .org-detail-mobile-sticky .org-account-tabs button {
    min-height: 44px;
  }
  .org-account-detail-native .org-account-metrics {
    display: flex !important;
    flex-wrap: nowrap !important;
    overflow-x: auto !important;
    -webkit-overflow-scrolling: touch;
    gap: 8px !important;
    grid-template-columns: unset !important;
    scrollbar-width: none;
    padding-bottom: 4px;
  }
  .org-account-detail-native .org-account-metrics > div {
    flex: 0 0 auto;
    min-width: 124px;
    max-width: 148px;
  }
  .org-activity-filter-scroll {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
    margin: 0 -2px;
    padding: 0 2px 4px;
  }
  .org-activity-filter-scroll .org-activity-filter-row {
    flex-wrap: nowrap !important;
    width: max-content;
    min-width: min(100%, max-content);
  }
  .org-activity-filter-scroll .org-activity-filter-row button {
    flex: 0 0 auto !important;
    white-space: nowrap;
    min-height: 44px;
  }
  .org-case-advanced-filters {
    grid-template-columns: 1fr !important;
  }
  .org-cases-table-desktop {
    display: none !important;
  }
  .org-doctor-card {
    min-height: unset !important;
  }
  .org-intel-upcoming-table {
    display: none !important;
  }
  .org-intel-upcoming-cards {
    display: grid;
    gap: 8px;
  }
  .org-intel-panel .org-intel-metrics {
    display: flex !important;
    flex-wrap: nowrap !important;
    overflow-x: auto !important;
    -webkit-overflow-scrolling: touch;
    gap: 8px !important;
    grid-template-columns: unset !important;
    scrollbar-width: none;
    padding-bottom: 4px;
  }
  .org-intel-panel .org-intel-metrics > div {
    flex: 0 0 auto;
    min-width: 128px;
    max-width: 160px;
  }
  .org-account-detail-native .portal-table-wrap {
    display: none !important;
  }
  .org-account-detail-native .crm-mobile-org-action-bar button,
  .org-account-detail-native .crm-mobile-org-action-bar a {
    min-height: 44px;
  }
}

@media (max-width: 768px) {
  .org-contacts-command-bar {
    gap: 6px !important;
    padding: 8px !important;
  }
  .org-contacts-cmd-search {
    flex: 1 1 100% !important;
    min-width: 0 !important;
  }
  .org-contacts-cmd-control,
  .org-contacts-cmd-add {
    flex: 1 1 calc(50% - 4px) !important;
    min-height: 44px !important;
    min-width: 0 !important;
  }
  .org-contact-card-actions > a,
  .org-contact-card-actions > button,
  .org-contact-card-actions > details {
    flex: 1 1 calc(50% - 4px) !important;
    min-height: 40px !important;
  }
  .org-support-chip-wrap {
    gap: 5px !important;
  }
  .org-support-chip {
    max-width: 100% !important;
  }
  .org-account-detail-root {
    overflow-x: clip !important;
  }
  .org-contact-card-grid {
    gap: 8px !important;
  }
}
@media (max-width: 430px) {
  .org-contacts-cmd-control,
  .org-contacts-cmd-add {
    flex: 1 1 calc(50% - 4px) !important;
  }
  .org-contact-card-actions > a,
  .org-contact-card-actions > button,
  .org-contact-card-actions > details {
    flex: 1 1 calc(50% - 4px) !important;
  }
}
@media (max-width: 390px) {
  .org-contacts-command-bar {
    padding: 7px !important;
    gap: 5px !important;
  }
  .org-contact-card-actions > a,
  .org-contact-card-actions > button,
  .org-contact-card-actions > details {
    flex: 1 1 100% !important;
  }
}
@media (prefers-reduced-motion: reduce) {
  .crm-mobile-org-action-bar { transition: none !important; }
  .org-contact-card-grid a,
  .org-contact-card-grid button,
  .org-contact-card-grid summary,
  .org-contact-card-grid [role="listitem"],
  .org-doctor-card,
  .org-support-card {
    transition: none !important;
  }
}
`;
