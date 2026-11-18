export const caseIdentityCss = `
.case-identity {
  display: grid;
  gap: 8px;
  min-width: 0;
}

.case-identity-primary {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.case-identity-type {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--brand-700);
  line-height: 1.3;
}

.case-identity-provider,
.case-identity-provider-link {
  font-size: 15px;
  font-weight: 800;
  line-height: 1.25;
  letter-spacing: -0.01em;
  color: var(--foreground);
  word-break: break-word;
}

.case-identity-provider-link {
  text-decoration: none;
}

.case-identity-provider-link:hover {
  color: var(--brand-700);
  text-decoration: underline;
  text-underline-offset: 2px;
}

.case-identity-specialty {
  font-size: 12px;
  font-weight: 700;
  line-height: 1.35;
  color: color-mix(in srgb, var(--foreground) 72%, var(--muted));
  word-break: break-word;
}

.case-identity-location {
  display: grid;
  gap: 2px;
  margin-top: 2px;
}

.case-identity-facility,
.case-identity-facility-link {
  font-size: 13px;
  font-weight: 750;
  line-height: 1.35;
  color: color-mix(in srgb, var(--foreground) 86%, var(--muted));
  text-decoration: none;
  word-break: break-word;
}

.case-identity-facility-link:hover {
  color: var(--brand-700);
}

.case-identity-date {
  font-size: 13px;
  font-weight: 800;
  line-height: 1.3;
  color: var(--foreground);
}

.case-identity-secondary {
  display: grid;
  gap: 4px;
  padding-top: 8px;
  border-top: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
}

.case-identity-secondary-row {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 8px;
  align-items: baseline;
  font-size: 12px;
  line-height: 1.35;
}

.case-identity-label {
  font-weight: 800;
  color: var(--muted);
  white-space: nowrap;
}

.case-identity-value {
  font-weight: 750;
  color: var(--foreground);
}

.case-identity-signals {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.case-identity-signal {
  padding: 3px 8px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--brand-600) 8%, #fff);
  color: var(--brand-700);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.02em;
  line-height: 1.3;
}

.case-identity-tap {
  font-size: 11px;
  font-weight: 800;
  color: var(--brand-700);
}

.case-identity--header .case-identity-provider {
  font-size: 18px;
  font-weight: 900;
}

.case-identity--header .case-identity-location {
  display: grid;
  gap: 2px;
}

.case-identity--header .case-identity-secondary {
  border-top: none;
  padding-top: 0;
  gap: 6px;
}

.case-identity--header .case-identity-secondary-row {
  display: inline-flex;
  gap: 6px;
  margin-right: 10px;
}

.case-identity--compact .case-identity-signals,
.case-identity--compact .case-identity-tap {
  display: none;
}

.case-identity--compact .case-identity-provider {
  font-size: 14px;
}

.case-identity--list .case-identity-tap,
.case-identity--list .case-identity-signals {
  display: none;
}

.case-identity--list .case-identity-secondary {
  border-top: none;
  padding-top: 4px;
  grid-template-columns: repeat(2, auto);
  justify-content: start;
  column-gap: 12px;
}

.case-identity--preview .case-identity-tap {
  display: none;
}

@media (min-width: 901px) {
  .case-identity--board .case-identity-provider,
  .case-identity--header .case-identity-provider {
    font-size: 16px;
  }
}
`;
