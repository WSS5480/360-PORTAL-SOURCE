export const caseFieldWatchBriefingCss = `
.case-field-watch {
  display: grid;
  gap: 12px;
  min-width: 0;
}
.case-field-watch--empty {
  display: grid;
  gap: 6px;
}
.case-field-watch-empty-line {
  margin: 0;
  font-size: 12px;
  line-height: 1.45;
  font-weight: 550;
  color: var(--mc-meta, #64748b);
}
.case-field-watch-group {
  display: grid;
  gap: 6px;
  min-width: 0;
}
.case-field-watch-group-label {
  margin: 0;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--mc-accent, var(--brand-600)) 72%, var(--mc-ink, #0b1220));
}
.case-field-watch-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 6px;
}
.case-field-watch-item {
  display: grid;
  gap: 2px;
  min-width: 0;
}
.case-field-watch-item-text {
  font-size: 13px;
  font-weight: 650;
  line-height: 1.35;
  color: var(--mc-ink, #0b1220);
}
.case-field-watch-item-source {
  font-size: 11px;
  font-weight: 600;
  line-height: 1.3;
  color: var(--mc-meta, #64748b);
}
`;
