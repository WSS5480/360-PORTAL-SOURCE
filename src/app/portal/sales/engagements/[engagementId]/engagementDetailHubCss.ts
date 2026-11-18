/** Engagement detail hub — command center layout (not stacked form cards). */
export const engagementDetailHubCss = `
.edh {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-width: 680px;
}

.edh-header {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: start;
  gap: 10px 14px;
  padding: 14px 16px;
  border-radius: 14px;
  border: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));
  background: linear-gradient(
    165deg,
    #fff 0%,
    color-mix(in srgb, var(--brand-600) 5%, #fff) 100%
  );
  box-shadow: 0 1px 2px color-mix(in srgb, var(--foreground) 4%, transparent);
}

.edh-header--active {
  border-color: color-mix(in srgb, #0284c7 22%, var(--border));
  background: linear-gradient(
    165deg,
    #f8fafc 0%,
    #fff 48%,
    color-mix(in srgb, #0284c7 7%, #fff) 100%
  );
}

.edh-header-main {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.edh-provider {
  margin: 0;
  font-size: clamp(26px, 5.5vw, 34px);
  font-weight: 900;
  line-height: 1.08;
  letter-spacing: -0.035em;
  color: var(--foreground);
}

.edh-provider-link {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  color: inherit;
  text-decoration: none;
}

.edh-provider-link:hover {
  color: var(--brand-700);
}

.edh-organization {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  line-height: 1.3;
  color: color-mix(in srgb, var(--foreground) 88%, var(--muted));
}

.edh-type {
  margin: 2px 0 0;
  font-size: 13px;
  font-weight: 700;
  line-height: 1.3;
  color: var(--muted);
  letter-spacing: 0;
  text-transform: none;
}

.edh-badge {
  display: inline-flex;
  align-self: start;
  padding: 5px 11px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  white-space: nowrap;
}

.edh-badge--planned {
  background: color-mix(in srgb, var(--brand-600) 12%, #fff);
  color: var(--brand-800);
  border: 1px solid color-mix(in srgb, var(--brand-600) 22%, var(--border));
}

.edh-badge--active,
.edh-badge--in_progress {
  background: color-mix(in srgb, #0284c7 12%, #fff);
  color: #075985;
  border: 1px solid color-mix(in srgb, #0284c7 24%, var(--border));
}

.edh-badge--debrief_needed {
  background: color-mix(in srgb, #d97706 14%, #fff);
  color: #92400e;
  border: 1px solid color-mix(in srgb, #d97706 28%, var(--border));
}

.edh-badge--completed {
  background: color-mix(in srgb, #059669 12%, #fff);
  color: #065f46;
  border: 1px solid color-mix(in srgb, #059669 24%, var(--border));
}

.edh-badge--other {
  background: var(--surface-2, #f4f4f5);
  color: var(--muted);
  border: 1px solid var(--border);
}

.edh-command {
  border-radius: 14px;
  border: 1px solid color-mix(in srgb, var(--brand-600) 14%, var(--border));
  background: linear-gradient(
    165deg,
    color-mix(in srgb, var(--brand-600) 4%, #fff) 0%,
    #fff 40%
  );
  box-shadow:
    0 1px 2px color-mix(in srgb, var(--foreground) 5%, transparent),
    0 8px 24px color-mix(in srgb, var(--brand-600) 5%, transparent);
  overflow: hidden;
}

.edh--active .edh-command {
  border-color: color-mix(in srgb, #0284c7 16%, var(--border));
}

.edh-command-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px 24px;
  margin: 0;
  padding: 14px 16px 0;
}

.edh-command-row {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.edh-command-row--full {
  grid-column: 1 / -1;
}

.edh-command-row dt {
  margin: 0;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted);
}

.edh-command-row dd {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  line-height: 1.4;
  color: var(--foreground);
}

.edh-command-row dd.edh-value--muted {
  color: var(--muted);
  font-weight: 600;
}

.edh-command-row dd.edh-value--goal {
  font-size: 15px;
  font-weight: 700;
  line-height: 1.45;
}

.edh-command-row dd.edh-value--prep-ready {
  color: var(--brand-700);
  font-weight: 800;
}

.edh-command-row dd.edh-value--prep-not_started {
  color: var(--muted);
  font-weight: 700;
}

.edh-command-row dd.edh-value--multiline {
  white-space: pre-wrap;
  font-weight: 600;
}

.edh-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin: 0;
  padding: 12px 16px 14px;
  border-top: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
  background: color-mix(in srgb, var(--foreground) 2%, #fff);
}

.edh-actions .engagement-edit-trigger {
  margin-right: 0;
}

.edh-footer {
  display: flex;
  justify-content: flex-end;
  padding-top: 0;
}

.edh-delete {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--danger);
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.edh-delete:disabled {
  opacity: 0.55;
  cursor: wait;
}

.engagement-detail-mobile .edh {
  max-width: none;
  gap: 8px;
}

.engagement-detail-mobile .edh-header {
  margin: 0 calc(-1 * var(--edm-pad-x, 12px));
  padding-left: var(--edm-pad-x, 12px);
  padding-right: var(--edm-pad-x, 12px);
  border-radius: 0;
  border-left: none;
  border-right: none;
}

.engagement-detail-mobile .edh-provider {
  font-size: clamp(24px, 7vw, 30px);
}

@media (max-width: 560px) {
  .edh-header {
    grid-template-columns: 1fr;
  }

  .edh-badge {
    justify-self: flex-start;
  }

  .edh-command-grid {
    grid-template-columns: 1fr;
    padding: 12px 14px 0;
  }

  .edh-actions {
    flex-direction: column;
    align-items: stretch;
    padding: 10px 14px 12px;
  }

  .edh-actions .engagement-record-action,
  .edh-actions .engagement-edit-trigger {
    width: 100%;
    justify-content: center;
  }
}
`;

