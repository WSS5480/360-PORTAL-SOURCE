export const observationCaseChecklistCss = `
.case-obs-field-checklist {
  display: grid;
  gap: 12px;
  padding: 16px 18px;
  border-radius: 16px;
  border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
  background: var(--surface, #fff);
}

.case-obs-field-checklist--compact {
  padding: 12px 14px;
  border-radius: 14px;
  gap: 8px;
}

.case-obs-field-checklist-title {
  margin: 0;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--brand-700) 78%, var(--muted));
}

.case-obs-field-checklist-progress {
  margin: 0;
  font-size: 12px;
  font-weight: 700;
  color: color-mix(in srgb, var(--foreground) 58%, var(--muted));
}

.case-obs-field-checklist-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 6px;
}

.case-obs-field-checklist-item {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 36px;
  padding: 6px 10px;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
  background: color-mix(in srgb, var(--foreground) 1%, var(--surface, #fff));
}

.case-obs-field-checklist-item--checked {
  border-color: color-mix(in srgb, #16a34a 22%, var(--border));
  background: color-mix(in srgb, #16a34a 4%, var(--surface, #fff));
}

.case-obs-field-checklist-marker {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  border-radius: 6px;
  border: 2px solid color-mix(in srgb, var(--foreground) 18%, var(--border));
  display: grid;
  place-items: center;
  font-size: 11px;
  font-weight: 900;
  color: transparent;
}

.case-obs-field-checklist-item--checked .case-obs-field-checklist-marker {
  border-color: #16a34a;
  background: #16a34a;
  color: #fff;
}

.case-obs-field-checklist-label {
  font-size: 14px;
  font-weight: 700;
  line-height: 1.3;
  color: var(--foreground);
}

.case-obs-field-checklist--compact .case-obs-field-checklist-label {
  font-size: 13px;
}

.case-obs-field-checklist-item:not(.case-obs-field-checklist-item--checked) .case-obs-field-checklist-label {
  color: color-mix(in srgb, var(--foreground) 72%, var(--muted));
}
`;
