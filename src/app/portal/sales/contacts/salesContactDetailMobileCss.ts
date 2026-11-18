/** Mobile-only layout for Sales Command contact detail (desktop panels unchanged). */
export const salesContactDetailMobileCss = `
@media (max-width: 768px) {
  .sales-contact-detail-root .contact-rel-org-row {
    flex-direction: column !important;
    align-items: flex-start !important;
    gap: 8px !important;
  }

  .sales-contact-detail-root .contact-rel-org-row__name,
  .sales-contact-detail-root .contact-rel-org-row__detail {
    min-width: 0;
    overflow-wrap: anywhere;
    word-break: break-word;
  }

  .sales-contact-detail-root .contact-rel-hero__actions {
    width: 100%;
  }

  .sales-contact-detail-root .contact-rel-hero__actions > a,
  .sales-contact-detail-root .contact-rel-hero__actions > button {
    flex: 1 1 calc(50% - 4px);
    min-height: 44px;
    justify-content: center;
  }

  .sales-contact-detail-root .contact-rel-activity-row,
  .sales-contact-detail-root .contact-rel-provider-row {
    flex-wrap: wrap;
    gap: 6px 10px;
  }

  .sales-contact-detail-root .contact-rel-activity-row > *,
  .sales-contact-detail-root .contact-rel-provider-row > * {
    min-width: 0;
    overflow-wrap: anywhere;
  }
}

@media (max-width: 480px) {
  .sales-contact-detail-root .contact-rel-hero__actions > a,
  .sales-contact-detail-root .contact-rel-hero__actions > button {
    flex: 1 1 100%;
    width: 100%;
  }
}

@media (max-width: 1024px) {
  body:has(.sales-contact-detail-root) .portal-contentWrap:not(:has(.provider-workspace-page)):not(:has(.case-workspace-page)) {
    padding-bottom: calc(68px + env(safe-area-inset-bottom, 0px)) !important;
  }
}
`;
