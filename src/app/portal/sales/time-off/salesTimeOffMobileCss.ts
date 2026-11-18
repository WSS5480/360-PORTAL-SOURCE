/** Mobile layout for Sales Command time-off page (desktop unchanged). */
export const salesTimeOffMobileCss = `
@media (max-width: 560px) {
  .sales-time-off-page .sales-time-off-date-grid {
    grid-template-columns: 1fr !important;
  }

  .sales-time-off-page .sales-time-off-modal {
    width: min(100%, calc(100vw - 24px)) !important;
    max-width: none !important;
    max-height: calc(100dvh - 24px - env(safe-area-inset-bottom, 0px));
    overflow-y: auto;
    margin: 12px auto;
  }

  .sales-time-off-page .sales-time-off-modal-actions {
    flex-direction: column-reverse;
    align-items: stretch !important;
  }

  .sales-time-off-page .sales-time-off-modal-actions > button {
    width: 100%;
    min-height: 48px;
    justify-content: center;
  }

  .sales-time-off-page .sales-time-off-card-head {
    flex-direction: column;
    align-items: flex-start !important;
  }

  .sales-time-off-page .sales-time-off-card-submitted {
    margin-left: 0 !important;
  }
}

@media (max-width: 1024px) {
  body:has(.sales-time-off-page) .portal-contentWrap:not(:has(.provider-workspace-page)):not(:has(.case-workspace-page)) {
    padding-bottom: calc(68px + env(safe-area-inset-bottom, 0px)) !important;
  }
}
`;
