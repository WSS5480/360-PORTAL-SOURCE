export const experimentalProviderIntelligenceComparisonCss = `
.exp-provider-intel-compare {
  margin-top: 16px;
  padding: 14px 16px;
  border: 1px dashed var(--border, #d1d5db);
  border-radius: 10px;
  background: color-mix(in srgb, var(--muted, #f3f4f6) 55%, transparent);
}
.exp-provider-intel-compare__kicker {
  margin: 0 0 4px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--muted-foreground, #6b7280);
}
.exp-provider-intel-compare__title {
  margin: 0 0 6px;
  font-size: 15px;
  font-weight: 700;
}
.exp-provider-intel-compare__note {
  margin: 0 0 14px;
  font-size: 12px;
  line-height: 1.45;
  color: var(--muted-foreground, #6b7280);
}
.exp-provider-intel-compare__columns {
  display: grid;
  gap: 12px;
}
@media (min-width: 900px) {
  .exp-provider-intel-compare__columns {
    grid-template-columns: 1fr 1fr;
    align-items: start;
  }
}
.exp-provider-intel-compare__column {
  padding: 12px;
  border-radius: 8px;
  background: var(--background, #fff);
  border: 1px solid var(--border, #e5e7eb);
  min-height: 120px;
}
.exp-provider-intel-compare__column--experimental {
  border-color: color-mix(in srgb, var(--brand-600, #2563eb) 28%, var(--border, #e5e7eb));
}
.exp-provider-intel-compare__column-title {
  margin: 0 0 4px;
  font-size: 13px;
  font-weight: 700;
}
.exp-provider-intel-compare__column-subtitle {
  margin: 0 0 12px;
  font-size: 12px;
  color: var(--muted-foreground, #6b7280);
}
.exp-provider-intel-compare__empty {
  margin: 0;
  font-size: 12px;
  color: var(--muted-foreground, #6b7280);
  font-style: italic;
}
.exp-provider-intel-compare__list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 10px;
}
.exp-provider-intel-compare__topic {
  padding-bottom: 10px;
  border-bottom: 1px solid var(--border, #e5e7eb);
}
.exp-provider-intel-compare__topic:last-child {
  padding-bottom: 0;
  border-bottom: none;
}
.exp-provider-intel-compare__topic-label {
  margin: 0 0 4px;
  font-size: 13px;
  font-weight: 600;
}
.exp-provider-intel-compare__counts {
  margin: 0;
  display: grid;
  gap: 2px;
  font-size: 12px;
  color: var(--muted-foreground, #6b7280);
}
.exp-provider-intel-compare__evidence {
  margin: 4px 0 0;
  font-size: 11px;
  color: var(--muted-foreground, #6b7280);
  font-style: italic;
}
.exp-provider-intel-compare__status {
  margin: 0;
  font-size: 12px;
  color: var(--muted-foreground, #6b7280);
}
.exp-provider-intel-compare__error {
  margin: 0;
  font-size: 12px;
  color: var(--destructive, #b91c1c);
}
`;
