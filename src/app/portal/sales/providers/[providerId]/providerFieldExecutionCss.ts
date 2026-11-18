/**
 * Field execution mode — mobile-first procedural deployment briefing (390–430px).
 */

export const providerFieldExecutionCss = `
  .provider-field-exec {
    display: flex;
    flex-direction: column;
    gap: 10px;
    max-width: 100%;
    padding: 0 0 24px;
  }

  .provider-field-exec-hero {
    padding: 12px 14px;
    border-radius: 12px;
    background: linear-gradient(
      165deg,
      color-mix(in srgb, var(--brand-700, #1d4ed8) 92%, #0f172a) 0%,
      color-mix(in srgb, var(--brand-900, #1e3a8a) 96%, #020617) 100%
    );
    color: #f8fafc;
    box-shadow: 0 8px 24px color-mix(in srgb, var(--brand-900, #1e3a8a) 28%, transparent);
  }

  .provider-field-exec-hero-kicker {
    margin: 0 0 4px;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    opacity: 0.82;
  }

  .provider-field-exec-hero-title {
    margin: 0 0 8px;
    font-size: 18px;
    font-weight: 800;
    line-height: 1.15;
    letter-spacing: -0.02em;
  }

  .provider-field-exec-hero-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 6px 10px;
    font-size: 10px;
    font-weight: 700;
  }

  .provider-field-exec-hero-pill {
    padding: 3px 8px;
    border-radius: 999px;
    background: color-mix(in srgb, #fff 14%, transparent);
    border: 1px solid color-mix(in srgb, #fff 22%, transparent);
  }

  .provider-field-exec-block {
    border-radius: 10px;
    border: 1px solid color-mix(in srgb, var(--border) 88%, transparent);
    background: var(--surface, #fff);
    overflow: hidden;
  }

  .provider-field-exec-block-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
    padding: 8px 12px;
    border-bottom: 1px solid color-mix(in srgb, var(--border) 70%, transparent);
    background: color-mix(in srgb, var(--foreground) 3%, var(--surface, #fff));
  }

  .provider-field-exec-block-step {
    font-size: 10px;
    font-weight: 800;
    color: var(--brand-700, #1d4ed8);
    letter-spacing: 0.04em;
  }

  .provider-field-exec-block-title {
    margin: 0;
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.03em;
    text-transform: uppercase;
    color: color-mix(in srgb, var(--foreground) 72%, transparent);
  }

  .provider-field-exec-block-body {
    padding: 10px 12px 12px;
  }

  /* Risk — step 1 */
  .provider-field-exec-risk {
    border-left: 4px solid var(--warn-600, #d97706);
  }

  .provider-field-exec-risk--success {
    border-left-color: var(--ok-600, #059669);
  }

  .provider-field-exec-risk--neutral {
    border-left-color: color-mix(in srgb, var(--foreground) 25%, transparent);
  }

  .provider-field-exec-risk--caution {
    border-left-color: #ca8a04;
  }

  .provider-field-exec-risk--warn,
  .provider-field-exec-risk--danger {
    border-left-color: var(--warn-700, #b45309);
  }

  .provider-field-exec-risk-headline {
    margin: 0 0 6px;
    font-size: 15px;
    font-weight: 800;
    line-height: 1.25;
    color: var(--foreground);
  }

  .provider-field-exec-risk-scan {
    margin: 0;
    font-size: 12px;
    line-height: 1.4;
    color: color-mix(in srgb, var(--foreground) 78%, transparent);
  }

  .provider-field-exec-risk-cta {
    margin-top: 10px;
    width: 100%;
    min-height: 40px;
    border-radius: 8px;
    border: none;
    font-size: 12px;
    font-weight: 800;
    cursor: pointer;
    background: color-mix(in srgb, var(--warn-700, #b45309) 92%, #000);
    color: #fff;
  }

  .provider-field-exec-risk--success .provider-field-exec-risk-cta {
    background: color-mix(in srgb, var(--ok-600, #059669) 90%, #000);
  }

  /* Mission — step 2 */
  .provider-field-exec-mission-title {
    margin: 0 0 4px;
    font-size: 16px;
    font-weight: 800;
    line-height: 1.2;
  }

  .provider-field-exec-mission-scan {
    margin: 0 0 8px;
    font-size: 12px;
    line-height: 1.35;
    color: color-mix(in srgb, var(--foreground) 75%, transparent);
  }

  .provider-field-exec-mission-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px 10px;
    margin: 0 0 10px;
    font-size: 10px;
  }

  .provider-field-exec-mission-kicker {
    display: block;
    font-weight: 700;
    color: color-mix(in srgb, var(--foreground) 55%, transparent);
    margin-bottom: 2px;
  }

  .provider-field-exec-mission-value {
    font-weight: 700;
    line-height: 1.3;
  }

  .provider-field-exec-mission-leverage {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 8px;
    border-radius: 6px;
    background: color-mix(in srgb, var(--brand-600, #2563eb) 10%, transparent);
    font-size: 11px;
    font-weight: 800;
    color: var(--brand-800, #1e40af);
  }

  .provider-field-exec-mission-deploy {
    width: 100%;
    min-height: 44px;
    border-radius: 8px;
    border: none;
    font-size: 13px;
    font-weight: 800;
    cursor: pointer;
    background: var(--brand-600, #2563eb);
    color: #fff;
  }

  /* Confirmations — step 3 */
  .provider-field-exec-confirm-list {
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .provider-field-exec-confirm-item {
    padding: 8px 10px;
    border-radius: 8px;
    background: color-mix(in srgb, var(--warn-600, #d97706) 6%, #fff);
    border: 1px solid color-mix(in srgb, var(--warn-600, #d97706) 18%, transparent);
  }

  .provider-field-exec-confirm-item--outdated {
    border-color: color-mix(in srgb, var(--warn-700, #b45309) 35%, transparent);
  }

  .provider-field-exec-confirm-head {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 8px;
    margin-bottom: 4px;
  }

  .provider-field-exec-confirm-label {
    font-size: 11px;
    font-weight: 800;
  }

  .provider-field-exec-confirm-pct {
    font-size: 10px;
    font-weight: 800;
    color: var(--warn-800, #92400e);
    white-space: nowrap;
  }

  .provider-field-exec-confirm-warning {
    margin: 0 0 4px;
    font-size: 11px;
    line-height: 1.35;
    font-weight: 600;
  }

  .provider-field-exec-confirm-prompt {
    margin: 0 0 8px;
    font-size: 10px;
    line-height: 1.35;
    font-style: italic;
    color: color-mix(in srgb, var(--foreground) 62%, transparent);
  }

  .provider-field-exec-confirm-cta {
    width: 100%;
    min-height: 36px;
    border-radius: 6px;
    border: 1px solid color-mix(in srgb, var(--warn-600, #d97706) 35%, transparent);
    background: #fff;
    font-size: 11px;
    font-weight: 800;
    color: var(--warn-800, #92400e);
    cursor: pointer;
  }

  .provider-field-exec-confirm-empty {
    margin: 0;
    font-size: 11px;
    color: color-mix(in srgb, var(--foreground) 60%, transparent);
  }

  /* Contacts — step 4 */
  .provider-field-exec-contact-list {
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .provider-field-exec-contact {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 4px 8px;
    padding: 8px 10px;
    border-radius: 8px;
    background: color-mix(in srgb, var(--foreground) 2%, #fff);
    border: 1px solid color-mix(in srgb, var(--border) 80%, transparent);
  }

  .provider-field-exec-contact--coordinator {
    border-color: color-mix(in srgb, var(--brand-600, #2563eb) 22%, transparent);
  }

  .provider-field-exec-contact-role {
    grid-column: 1 / -1;
    font-size: 9px;
    font-weight: 800;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: color-mix(in srgb, var(--foreground) 52%, transparent);
  }

  .provider-field-exec-contact-name {
    font-size: 13px;
    font-weight: 800;
    line-height: 1.25;
  }

  .provider-field-exec-contact-detail {
    grid-column: 1 / -1;
    font-size: 11px;
    line-height: 1.35;
    color: color-mix(in srgb, var(--foreground) 72%, transparent);
  }

  .provider-field-exec-contact-tap {
    align-self: center;
    font-size: 10px;
    font-weight: 800;
    padding: 4px 8px;
    border-radius: 6px;
    border: 1px solid color-mix(in srgb, var(--brand-600, #2563eb) 30%, transparent);
    background: color-mix(in srgb, var(--brand-600, #2563eb) 8%, #fff);
    color: var(--brand-800, #1e40af);
    cursor: pointer;
    white-space: nowrap;
  }

  .provider-field-exec-contacts-manage {
    margin-top: 8px;
    width: 100%;
    min-height: 36px;
    border-radius: 8px;
    border: 1px dashed color-mix(in srgb, var(--border) 90%, transparent);
    background: transparent;
    font-size: 11px;
    font-weight: 700;
    cursor: pointer;
  }

  /* Actions — step 5 */
  .provider-field-exec-actions {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 10px 12px 12px;
  }

  .provider-field-exec-action {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 42px;
    padding: 10px 14px;
    border-radius: 10px;
    font-size: 12px;
    font-weight: 800;
    text-decoration: none;
    cursor: pointer;
    border: 1px solid color-mix(in srgb, var(--border) 90%, transparent);
    background: var(--surface, #fff);
    color: var(--foreground);
  }

  .provider-field-exec-action--primary {
    min-height: 48px;
    font-size: 13px;
    border: none;
    background: var(--brand-600, #2563eb);
    color: #fff;
  }

  .provider-field-exec-action--ghost {
    min-height: 36px;
    font-size: 11px;
    font-weight: 700;
    border: none;
    background: transparent;
    color: color-mix(in srgb, var(--foreground) 55%, transparent);
    text-decoration: underline;
    text-underline-offset: 2px;
  }

  /* Desktop: field execution is a narrow briefing column, not a compressed dashboard */
  @media (min-width: 769px) {
    .provider-field-exec {
      max-width: 420px;
      margin: 0 auto;
    }

    .provider-field-exec-hero-title {
      font-size: 20px;
    }
  }
`;
