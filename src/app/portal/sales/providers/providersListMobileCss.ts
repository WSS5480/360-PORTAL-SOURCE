/** Mobile-first providers directory — mission board card layout. */



export const providersListMobileCss = `

.providers-directory-root .sc-mobile-provider-list {

  list-style: none;

  margin: 0;

  padding: 0;

}



.mission-provider-card {

  display: flex;

  flex-direction: column;

  border-radius: 12px;

  border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));

  background: var(--surface);

  overflow: hidden;

  box-shadow: 0 1px 2px color-mix(in srgb, var(--foreground) 4%, transparent);

  transition: box-shadow 120ms ease, border-color 120ms ease;

}



.mission-provider-card[data-has-upcoming="true"] {

  border-color: color-mix(in srgb, #22c55e 28%, var(--border));

}



.mission-provider-card:hover {

  box-shadow:

    0 1px 0 color-mix(in srgb, var(--brand-600) 10%, var(--border)),

    0 8px 20px color-mix(in srgb, var(--brand-600) 6%, transparent);

}



.mission-provider-card-body {

  display: grid;

  gap: 8px;

  padding: 12px 12px 10px;

  min-width: 0;

}



.mission-provider-header {

  display: grid;

  gap: 2px;

  min-width: 0;

}



.mission-provider-name {

  margin: 0;

  font-size: 16px;

  font-weight: 800;

  letter-spacing: -0.025em;

  line-height: 1.2;

  color: var(--foreground);

  overflow: hidden;

  text-overflow: ellipsis;

  white-space: nowrap;

}



.mission-provider-meta {

  margin: 0;

  font-size: 12px;

  font-weight: 600;

  line-height: 1.3;

  color: color-mix(in srgb, var(--foreground) 62%, var(--muted));

  overflow: hidden;

  text-overflow: ellipsis;

  white-space: nowrap;

}



.mission-provider-badge {

  display: inline-flex;

  align-items: center;

  gap: 8px;

  align-self: start;

  max-width: 100%;

  margin-top: 2px;

  padding: 8px 12px;

  border-radius: 10px;

  border: 1px solid transparent;

  font-size: 14px;

  font-weight: 800;

  letter-spacing: -0.02em;

  line-height: 1.2;

}



.mission-provider-badge-dot {

  width: 10px;

  height: 10px;

  border-radius: 999px;

  flex-shrink: 0;

  box-shadow: 0 0 0 2px color-mix(in srgb, var(--surface) 70%, transparent);

}



.mission-provider-badge-label {

  overflow: hidden;

  text-overflow: ellipsis;

  white-space: nowrap;

}



.mission-provider-badge--green {

  background: color-mix(in srgb, #22c55e 14%, var(--surface));

  border-color: color-mix(in srgb, #22c55e 32%, var(--border));

  color: #166534;

}



.mission-provider-badge--green .mission-provider-badge-dot {

  background: #22c55e;

}



.mission-provider-badge--yellow {

  background: color-mix(in srgb, #f59e0b 14%, var(--surface));

  border-color: color-mix(in srgb, #f59e0b 32%, var(--border));

  color: #92400e;

}



.mission-provider-badge--yellow .mission-provider-badge-dot {

  background: #f59e0b;

}



.mission-provider-badge--blue {

  background: color-mix(in srgb, #3b82f6 14%, var(--surface));

  border-color: color-mix(in srgb, #3b82f6 32%, var(--border));

  color: #1e40af;

}



.mission-provider-badge--blue .mission-provider-badge-dot {

  background: #3b82f6;

}



.mission-provider-badge--red {

  background: color-mix(in srgb, #ef4444 12%, var(--surface));

  border-color: color-mix(in srgb, #ef4444 30%, var(--border));

  color: #991b1b;

}



.mission-provider-badge--red .mission-provider-badge-dot {

  background: #ef4444;

}



.mission-provider-badge--neutral {

  background: color-mix(in srgb, var(--foreground) 6%, var(--surface));

  border-color: color-mix(in srgb, var(--foreground) 12%, var(--border));

  color: var(--muted);

}



.mission-provider-badge--neutral .mission-provider-badge-dot {

  background: var(--muted);

}



.mission-provider-touch {

  margin: 0;

  font-size: 12px;

  font-weight: 600;

  line-height: 1.35;

  color: var(--muted);

  overflow: hidden;

  text-overflow: ellipsis;

  white-space: nowrap;

}



.mission-provider-next {

  margin: 0;

  font-size: 15px;

  font-weight: 800;

  letter-spacing: -0.02em;

  line-height: 1.25;

  color: var(--foreground);

  overflow: hidden;

  text-overflow: ellipsis;

  white-space: nowrap;

}



.mission-provider-upcoming {

  display: flex;

  align-items: center;

  gap: 6px;

  margin: 0;

  padding: 6px 8px;

  border-radius: 8px;

  background: color-mix(in srgb, #22c55e 8%, var(--surface));

  border: 1px solid color-mix(in srgb, #22c55e 18%, var(--border));

  font-size: 12px;

  font-weight: 700;

  line-height: 1.3;

  color: color-mix(in srgb, #166534 88%, var(--foreground));

  overflow: hidden;

  text-overflow: ellipsis;

  white-space: nowrap;

}



.mission-provider-upcoming-icon {

  flex-shrink: 0;

  font-size: 13px;

  line-height: 1;

}



.mission-provider-actions {

  display: grid;

  grid-template-columns: repeat(2, minmax(0, 1fr));

  gap: 0;

  border-top: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));

}



.mission-provider-actions--secondary {

  border-top: none;

  background: color-mix(in srgb, var(--foreground) 2%, var(--surface));

}



.mission-provider-action {

  display: flex;

  align-items: center;

  justify-content: center;

  min-height: 42px;

  padding: 8px 10px;

  border: none;

  border-right: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));

  background: transparent;

  color: color-mix(in srgb, var(--foreground) 72%, var(--muted));

  font-size: 11px;

  font-weight: 800;

  text-decoration: none;

  text-align: center;

  touch-action: manipulation;

  transition: background 120ms ease, color 120ms ease;

}



.mission-provider-action:nth-child(2n) {

  border-right: none;

}



.mission-provider-action--primary-btn {

  background: color-mix(in srgb, var(--brand-600) 8%, var(--surface));

  color: var(--brand-700);

  font-size: 12px;

}



.mission-provider-action:hover {

  background: color-mix(in srgb, var(--brand-600) 8%, var(--surface));

  color: var(--brand-700);

}



.mission-provider-action:focus-visible {

  outline: 2px solid color-mix(in srgb, #22d3ee 75%, var(--brand-600));

  outline-offset: -2px;

  z-index: 1;

}



.providers-directory-root {

  max-width: 100%;

  overflow-x: hidden;

}



.providers-directory-header-text {

  min-width: 0;

}

.providers-directory-header-actions {
  flex-wrap: wrap;
  justify-content: flex-end;
}



.providers-directory-tools {

  border-bottom: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));

}



.providers-directory-root .sc-mobile-list-search-row {

  grid-template-columns: minmax(0, 1fr) 36px 36px;

}



.providers-directory-add-btn {
  text-decoration: none;
}



.providers-directory-clear-filters {

  flex: 0 0 auto;

  border: none;

  background: transparent;

  font-size: 10px;

  font-weight: 800;

  color: var(--brand-700);

  cursor: pointer;

  padding: 3px 6px;

  font-family: inherit;

}



.providers-directory-root .sc-mobile-filter-chips {

  align-items: center;

}



.providers-directory-root .sc-mobile-filter-chips {

  display: flex;

  flex-wrap: wrap;

  gap: 4px;

  padding: 0 12px 8px;

}



.providers-directory-root .sc-mobile-filter-chip {

  font-size: 10px;

  font-weight: 800;

  padding: 3px 8px;

  border-radius: 999px;

  border: 1px solid color-mix(in srgb, var(--brand-600) 20%, var(--border));

  background: color-mix(in srgb, var(--brand-600) 8%, var(--surface));

  color: var(--brand-700);

}



@media (max-width: 900px) {

  .providers-directory-root .sc-mobile-provider-list {

    display: grid;

    gap: 10px;

    padding: 10px 12px 14px;

  }

}



@media (min-width: 901px) {

  .providers-directory-root .sc-mobile-provider-list {

    display: grid;

    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));

    gap: 12px;

    padding: 12px;

    align-items: stretch;

  }



  .mission-provider-card {

    height: 100%;

    min-height: 0;

    display: flex;

    flex-direction: column;

  }



  .mission-provider-card-body {

    flex: 1;

    min-height: 0;

  }



  .mission-provider-actions {

    margin-top: auto;

  }

}

`;


