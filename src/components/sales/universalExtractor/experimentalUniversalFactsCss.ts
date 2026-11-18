export const experimentalUniversalFactsCss = `
.exp-universal-facts {
  margin-top: 16px;
  border: 1px dashed color-mix(in srgb, #7c3aed 35%, var(--border));
  border-radius: 10px;
  background: color-mix(in srgb, #7c3aed 4%, var(--surface));
}
.exp-universal-facts__summary {
  cursor: pointer;
  padding: 12px 14px;
  font-weight: 700;
  font-size: 13px;
  color: color-mix(in srgb, #7c3aed 80%, var(--foreground));
  list-style: none;
}
.exp-universal-facts__summary::-webkit-details-marker {
  display: none;
}
.exp-universal-facts__summary::before {
  content: "▸ ";
}
.exp-universal-facts[open] .exp-universal-facts__summary::before {
  content: "▾ ";
}
.exp-universal-facts__body {
  padding: 0 14px 14px;
}
.exp-universal-facts__note {
  margin: 0 0 12px;
  font-size: 12px;
  color: var(--muted-foreground, #6b7280);
  line-height: 1.45;
}
.exp-universal-facts__empty {
  margin: 0;
  font-size: 13px;
  color: var(--muted-foreground, #6b7280);
}
.exp-universal-facts__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 10px;
}
.exp-universal-facts__item {
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
  background: var(--surface);
}
.exp-universal-facts__concept {
  margin: 0 0 6px;
  font-size: 13px;
  font-weight: 700;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}
.exp-universal-facts__meta {
  margin: 0;
  font-size: 12px;
  color: var(--muted-foreground, #6b7280);
  line-height: 1.5;
}
.exp-universal-facts__label {
  margin: 6px 0 0;
  font-size: 12px;
  line-height: 1.4;
}
.exp-universal-facts__error {
  margin: 0;
  font-size: 12px;
  color: var(--danger, #b91c1c);
}
.exp-universal-facts__runs {
  display: grid;
  gap: 0;
}
.exp-universal-facts__run {
  margin: 0;
}
.exp-universal-facts__run-title {
  margin: 0 0 8px;
  font-size: 14px;
  font-weight: 700;
  color: var(--foreground);
}
.exp-universal-facts__run-meta {
  margin: 0 0 12px;
  font-size: 12px;
  color: var(--muted-foreground, #6b7280);
  line-height: 1.5;
}
.exp-universal-facts__run-empty {
  margin: 0;
  font-size: 12px;
  color: var(--muted-foreground, #6b7280);
  font-style: italic;
}
.exp-universal-facts__run-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 10px;
}
.exp-universal-facts__run-divider {
  border: 0;
  border-top: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));
  margin: 16px 0;
}
.exp-universal-facts__evidence {
  margin-top: 8px;
}
.exp-universal-facts__evidence-summary {
  cursor: pointer;
  font-size: 11px;
  color: var(--muted-foreground, #6b7280);
}
.exp-universal-facts__evidence-list {
  margin: 8px 0 0;
  padding-left: 18px;
  font-size: 11px;
  color: var(--muted-foreground, #6b7280);
  line-height: 1.45;
}
.exp-universal-facts__evidence-item + .exp-universal-facts__evidence-item {
  margin-top: 4px;
}
.exp-universal-facts__probe {
  margin-bottom: 4px;
}
.exp-universal-facts__probe-title,
.exp-universal-facts__saved-title {
  margin: 0 0 8px;
  font-size: 14px;
  font-weight: 700;
}
.exp-universal-facts__probe-note {
  margin: 0 0 12px;
  font-size: 12px;
  color: var(--muted-foreground, #6b7280);
  line-height: 1.45;
}
.exp-universal-facts__probe-field {
  display: grid;
  gap: 6px;
  margin-bottom: 10px;
}
.exp-universal-facts__probe-label {
  font-size: 12px;
  font-weight: 600;
}
.exp-universal-facts__probe-select,
.exp-universal-facts__probe-textarea {
  width: 100%;
  border: 1px solid color-mix(in srgb, var(--foreground) 12%, var(--border));
  border-radius: 8px;
  padding: 8px 10px;
  font-size: 13px;
  background: var(--surface);
  color: var(--foreground);
}
.exp-universal-facts__probe-textarea {
  resize: vertical;
  min-height: 72px;
  font-family: inherit;
  line-height: 1.45;
}
.exp-universal-facts__probe-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}
.exp-universal-facts__probe-btn {
  border: 0;
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  background: color-mix(in srgb, #7c3aed 88%, #000);
  color: #fff;
}
.exp-universal-facts__probe-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.exp-universal-facts__probe-btn--secondary {
  background: color-mix(in srgb, #7c3aed 12%, var(--surface));
  color: color-mix(in srgb, #7c3aed 80%, var(--foreground));
  border: 1px solid color-mix(in srgb, #7c3aed 35%, var(--border));
}
.exp-universal-facts__probe-results {
  display: grid;
  gap: 12px;
}
.exp-universal-facts__probe-result {
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, #7c3aed 22%, var(--border));
  background: color-mix(in srgb, #7c3aed 3%, var(--surface));
}
.exp-universal-facts__probe-result-title {
  margin: 0 0 4px;
  font-size: 13px;
  font-weight: 700;
}
.exp-universal-facts__probe-result-meta {
  margin: 0 0 10px;
  font-size: 11px;
  color: var(--muted-foreground, #6b7280);
}
.exp-universal-facts__probe-presets {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}
.exp-universal-facts__probe-preset {
  border: 1px solid color-mix(in srgb, #7c3aed 25%, var(--border));
  border-radius: 999px;
  padding: 6px 10px;
  font-size: 11px;
  background: var(--surface);
  color: color-mix(in srgb, #7c3aed 75%, var(--foreground));
  cursor: pointer;
}
.exp-universal-facts__probe-preset:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.exp-universal-facts__timeline {
  margin-bottom: 8px;
}
.exp-universal-facts__timeline-title {
  margin: 0 0 8px;
  font-size: 14px;
  font-weight: 700;
}
.exp-universal-facts__timeline-note {
  margin: 0 0 12px;
  font-size: 12px;
  color: var(--muted-foreground, #6b7280);
  line-height: 1.45;
}
.exp-universal-facts__timeline-entry + .exp-universal-facts__timeline-entry {
  margin-top: 12px;
}
.exp-universal-facts__timeline-concept {
  margin: 0 0 8px;
  font-size: 13px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}
.exp-universal-facts__timeline-groups {
  display: grid;
  gap: 10px;
}
.exp-universal-facts__timeline-group-title {
  margin: 0 0 6px;
  font-size: 12px;
  font-weight: 700;
}
.exp-universal-facts__timeline-group-events {
  margin: 0;
  padding-left: 18px;
  display: grid;
  gap: 8px;
  list-style: disc;
}
.exp-universal-facts__timeline-events {
  margin: 0;
  padding-left: 18px;
  display: grid;
  gap: 6px;
}
.exp-universal-facts__timeline-event {
  font-size: 12px;
  line-height: 1.45;
}
.exp-universal-facts__timeline-evidence {
  margin: 4px 0 0;
  color: var(--muted-foreground, #6b7280);
  font-style: italic;
}
.exp-universal-facts__timeline-assertion {
  font-weight: 700;
  margin-right: 8px;
}
.exp-universal-facts__timeline-source {
  margin-right: 8px;
  color: var(--muted-foreground, #6b7280);
}
.exp-universal-facts__timeline-time {
  color: var(--muted-foreground, #6b7280);
}
`;
