export const observationCaseFeedCss = `
.case-obs-feed {
  display: grid;
  gap: 10px;
  min-width: 0;
}
.case-obs-feed-empty {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.45;
  color: var(--cod-muted, var(--muted));
}
.case-obs-feed-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 10px;
}
.case-obs-feed-entry {
  display: grid;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
  background: color-mix(in srgb, var(--foreground) 1.5%, var(--surface));
}
.case-obs-feed-entry-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.case-obs-feed-entry-time {
  font-size: 11px;
  font-weight: 700;
  color: var(--muted);
  white-space: nowrap;
}
.case-obs-feed-block {
  display: grid;
  gap: 4px;
}
.case-obs-feed-block-label {
  margin: 0;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--foreground) 52%, var(--muted));
}
.case-obs-feed-block-text {
  margin: 0;
  font-size: 13px;
  font-weight: 650;
  line-height: 1.45;
  color: var(--foreground);
}
.case-obs-feed-signals {
  display: grid;
  gap: 8px;
  padding-top: 4px;
  border-top: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
}
.case-obs-feed-signal {
  display: grid;
  gap: 4px;
}
.case-obs-feed-signal--product .case-obs-feed-block-label {
  color: var(--brand-700);
}
.case-obs-feed-signal--provider .case-obs-feed-block-label {
  color: color-mix(in srgb, #7c3aed 70%, var(--foreground));
}
.case-obs-feed-signal--competitor .case-obs-feed-block-label {
  color: color-mix(in srgb, #b45309 75%, var(--foreground));
}
.case-obs-feed-confidence {
  margin: 0;
  font-size: 11px;
  font-weight: 700;
  color: var(--muted);
}
.case-obs-feed-confidence-value {
  color: color-mix(in srgb, var(--foreground) 72%, var(--muted));
}
.case-obs-feed-link-btn {
  justify-self: start;
}
`;
