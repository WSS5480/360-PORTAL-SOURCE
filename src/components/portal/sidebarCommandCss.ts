/** Sidebar shell layout + Sales Command nav (logo block styles stay in Sidebar.tsx). */

export const sidebarCommandCss = `
.portal-sidebar-shell {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  max-height: 100%;
  overflow: hidden;
}

.portal-sidebar-brand-slot {
  flex: 0 0 auto;
  flex-shrink: 0;
}

.portal-sidebar-brand {
  align-items: stretch;
}

.portal-sidebar-logo-stage {
  box-sizing: border-box;
  position: relative;
  width: 100%;
  height: 44px;
  padding: 0;
  border-radius: 10px;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.12);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.1);
}

.portal-sidebar-logo-image {
  position: absolute;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  object-position: center center;
  transform: translateY(4px) scale(2.45);
  transform-origin: center center;
}

.portal-sidebar-brand-underline {
  align-self: center;
  width: 62px;
  height: 3px;
  border-radius: 999px;
  background: var(--brand-600);
  opacity: 0.95;
}

.portal-sidebar-scroll {
  flex: 1 1 auto;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  padding: 8px 0 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.portal-sidebar-sales {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 0 2px;
}

.portal-sidebar-sales-section {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.portal-sidebar-sales-section-label {
  font-size: 9px;
  font-weight: 900;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--muted) 82%, black);
  padding: 0 8px 4px;
}

.portal-sidebar-sales-nav {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.portal-sidebar-sales-link {
  display: flex;
  align-items: center;
  gap: 9px;
  min-height: 38px;
  padding: 7px 10px 7px 8px;
  border-radius: 8px;
  text-decoration: none;
  color: var(--foreground);
  background: transparent;
  border: 1px solid transparent;
  transition: background 120ms ease, border-color 120ms ease, color 120ms ease;
}

.portal-sidebar-sales-link:hover {
  background: color-mix(in srgb, var(--brand-600) 6%, #fff);
  border-color: color-mix(in srgb, var(--brand-600) 10%, transparent);
}

.portal-sidebar-sales-link:focus-visible {
  outline: 2px solid color-mix(in srgb, #22d3ee 75%, var(--brand-600));
  outline-offset: 1px;
}

.portal-sidebar-sales-link--active {
  background: color-mix(in srgb, #22d3ee 7%, color-mix(in srgb, var(--brand-050) 92%, #fff));
  border-color: color-mix(in srgb, #22d3ee 18%, var(--border));
  color: var(--brand-700);
  box-shadow: inset 3px 0 0 var(--brand-600);
  padding-left: 6px;
}

.portal-sidebar-sales-link__icon {
  display: inline-flex;
  flex-shrink: 0;
  color: color-mix(in srgb, var(--foreground) 62%, var(--muted));
}

.portal-sidebar-sales-link--active .portal-sidebar-sales-link__icon {
  color: color-mix(in srgb, #0e7490 75%, var(--brand-700));
}

.portal-sidebar-sales-link__label {
  flex: 1;
  min-width: 0;
  font-size: 13px;
  font-weight: 750;
  line-height: 1.2;
  letter-spacing: -0.01em;
}

.portal-sidebar-sales-link--active .portal-sidebar-sales-link__label {
  font-weight: 850;
}

.portal-sidebar-sales-badge {
  flex-shrink: 0;
  min-width: 18px;
  padding: 2px 6px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 900;
  line-height: 1.2;
  text-align: center;
  font-variant-numeric: tabular-nums;
  background: color-mix(in srgb, #22d3ee 12%, #fff);
  color: #0e7490;
  border: 1px solid color-mix(in srgb, #22d3ee 22%, var(--border));
}

.portal-sidebar-sales-badge--warn {
  background: color-mix(in srgb, #f59e0b 12%, #fff);
  color: #b45309;
  border-color: color-mix(in srgb, #f59e0b 24%, var(--border));
}

/* Compact bottom account area */
.portal-sidebar-footer {
  flex: 0 0 auto;
  flex-shrink: 0;
  margin-top: 0;
  padding: 10px 8px 4px;
  border-top: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
  background: color-mix(in srgb, var(--foreground) 2%, #fff);
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 140px;
}

.portal-sidebar-footer__identity {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-width: 0;
}

.portal-sidebar-footer__text {
  min-width: 0;
  flex: 1;
}

.portal-sidebar-footer__name {
  display: block;
  font-size: 12px;
  font-weight: 850;
  line-height: 1.25;
  color: var(--foreground);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.portal-sidebar-footer__email {
  display: block;
  font-size: 10px;
  font-weight: 650;
  line-height: 1.25;
  color: var(--muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-top: 1px;
}

.portal-sidebar-footer__role {
  flex-shrink: 0;
  padding: 3px 7px;
  border-radius: 999px;
  font-size: 9px;
  font-weight: 900;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  background: color-mix(in srgb, var(--brand-600) 10%, #fff);
  color: var(--brand-700);
  border: 1px solid color-mix(in srgb, var(--brand-600) 16%, var(--border));
}

.portal-sidebar-footer__actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.portal-sidebar-footer__btn {
  margin: 0;
  padding: 0;
  border: none;
  background: none;
  font-family: inherit;
  font-size: 11px;
  font-weight: 800;
  color: var(--brand-700);
  cursor: pointer;
  text-decoration: none;
  line-height: 1.3;
}

.portal-sidebar-footer__btn:hover {
  text-decoration: underline;
}

.portal-sidebar-footer__btn:focus-visible {
  outline: 2px solid color-mix(in srgb, #22d3ee 70%, var(--brand-600));
  outline-offset: 2px;
  border-radius: 4px;
}

.portal-sidebar-footer__btn--muted {
  color: color-mix(in srgb, var(--foreground) 55%, var(--muted));
  font-weight: 750;
}

.portal-sidebar-footer__err {
  font-size: 10px;
  font-weight: 700;
  line-height: 1.3;
  color: rgb(153, 27, 27);
}

.portal-sidebar-footer__skeleton {
  display: block;
  width: 120px;
  height: 12px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--foreground) 10%, transparent);
}

/*
 * Below 900px the sidebar becomes a touch drawer. Desktop keeps its tighter
 * density; on a phone every row is sized for a fingertip and the small
 * supporting text is raised to a readable size.
 * Inline styles on the customer nav links require !important to override.
 */
@media (max-width: 900px) {
  .portal-sidebar-sales-link {
    min-height: 44px;
  }

  .portal-sidebar-sales-link__label {
    font-size: 14px;
  }

  .portal-sidebar-sales-section-label,
  .portal-sidebar-nav-section-label {
    font-size: 11px !important;
    letter-spacing: 0.08em;
    padding-bottom: 6px;
  }

  .portal-sidebar-nav-link,
  .portal-sidebar-subnav-link {
    min-height: 44px !important;
  }

  .portal-sidebar-nav-link__label,
  .portal-sidebar-subnav-link__label {
    font-size: 14px !important;
  }

  .portal-sidebar-footer__email {
    font-size: 12px;
  }

  .portal-sidebar-footer__role {
    font-size: 11px;
    padding: 4px 9px;
  }

  .portal-sidebar-footer__actions {
    gap: 8px;
  }

  .portal-sidebar-footer__btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 44px;
    min-width: 88px;
    padding: 0 14px;
    font-size: 13px;
    border-radius: 12px;
    background: color-mix(in srgb, var(--brand-600) 8%, transparent);
  }

  .portal-sidebar-footer__btn--muted {
    background: color-mix(in srgb, var(--foreground) 5%, transparent);
  }

  .portal-sidebar-footer {
    max-height: none;
  }

  /* iOS zooms the whole page when a control under 16px receives focus. */
  #portal-account-switch {
    font-size: 16px !important;
  }
}
`;
