export const caseObservationTabPlaceholderCss = `
.case-obs-tab-panel {
  display: grid;
  gap: 0;
  min-width: 0;
  background: #fff;
}
.case-obs-tab-placeholder {
  display: grid;
  gap: 6px;
  padding: 16px 12px 20px;
  min-width: 0;
}
.case-obs-tab-placeholder-kicker {
  margin: 0;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted);
}
.case-obs-tab-placeholder-copy {
  margin: 0;
  font-size: 13px;
  font-weight: 650;
  line-height: 1.45;
  color: color-mix(in srgb, var(--foreground) 72%, var(--muted));
}
`;
