export const intelligenceScopeItemCss = `
.intel-scope-badge {
  display: inline-flex;
  align-items: center;
  border: 1px solid var(--border);
  background: var(--surface-2, var(--surface));
  color: var(--muted);
}
.intel-scope-badge--organization {
  border-color: color-mix(in srgb, #0d9488 35%, var(--border));
  color: #0f766e;
  background: color-mix(in srgb, #0d9488 8%, var(--surface));
}
.intel-scope-badge--provider {
  border-color: color-mix(in srgb, var(--brand-600, #2563eb) 35%, var(--border));
  color: var(--brand-700, #1d4ed8);
  background: color-mix(in srgb, var(--brand-600, #2563eb) 8%, var(--surface));
}
.intel-scope-badge--case,
.intel-scope-badge--engagement {
  border-color: color-mix(in srgb, #7c3aed 35%, var(--border));
  color: #6d28d9;
  background: color-mix(in srgb, #7c3aed 8%, var(--surface));
}

.intel-item-line {
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
  flex-wrap: wrap;
  line-height: 1.35;
}

.intel-item-line-text {
  font-weight: 600;
}

.intel-scope-badge--item {
  padding: 1px 6px;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  border-radius: 4px;
  vertical-align: baseline;
  flex-shrink: 0;
}

.intel-save-confirmation-list .intel-item-line-text,
.provider-intel-scope-bullet-text .intel-item-line-text,
.pau-discovery-live-save-list .intel-item-line-text {
  font-size: inherit;
}
`;
