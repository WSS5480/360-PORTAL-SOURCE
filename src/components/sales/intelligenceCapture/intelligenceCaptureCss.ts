/** Shared styles for Log Update + Tactical Debrief capture scope & propagation UI */
export const intelligenceCaptureCss = `
.intel-capture-context {
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--brand-600) 22%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 6%, #fff);
  display: grid;
  gap: 4px;
}

.intel-capture-context-kicker {
  margin: 0;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--muted);
}

.intel-capture-context-line {
  margin: 0;
  font-size: 13px;
  font-weight: 800;
  line-height: 1.35;
  color: var(--foreground);
}

.intel-capture-context-locked {
  margin: 0;
  font-size: 11px;
  line-height: 1.35;
  color: var(--muted);
}

.intel-capture-propagation {
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
  background: color-mix(in srgb, var(--foreground) 2%, #fff);
  display: grid;
  gap: 6px;
}

.intel-capture-propagation-title {
  margin: 0;
  font-size: 12px;
  font-weight: 800;
}

.intel-capture-propagation-sub {
  margin: 0;
  font-size: 11px;
  line-height: 1.4;
  color: var(--muted);
}

.intel-capture-propagation-groups {
  display: grid;
  gap: 10px;
}

.intel-capture-propagation-group {
  display: grid;
  gap: 4px;
}

.intel-capture-propagation-group-title {
  margin: 0;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.02em;
  color: var(--foreground);
}

.intel-capture-propagation-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 5px;
}

.intel-capture-propagation-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 12px;
  line-height: 1.35;
  color: color-mix(in srgb, var(--foreground) 55%, var(--muted));
}

.intel-capture-propagation-item--active {
  color: var(--foreground);
  font-weight: 600;
}

.intel-capture-propagation-check {
  flex-shrink: 0;
  font-weight: 800;
  color: var(--brand-700);
  width: 14px;
}

.intel-capture-propagation-item:not(.intel-capture-propagation-item--active) .intel-capture-propagation-check {
  color: var(--muted);
  font-weight: 600;
}

.intel-capture-propagation-detail {
  font-weight: 500;
  color: var(--muted);
}

.intel-save-confirmation-groups {
  display: grid;
  gap: 12px;
}

.intel-save-confirmation-heading {
  margin: 0 0 4px;
  font-size: 13px;
  font-weight: 800;
  line-height: 1.3;
  color: var(--foreground);
}

.intel-post-save-footer {
  display: grid;
  gap: 10px;
  width: 100%;
}

.intel-post-save-primary {
  width: 100%;
  padding: 12px 14px;
  border: none;
  border-radius: 10px;
  background: var(--brand-600);
  color: #fff;
  font-size: 14px;
  font-weight: 800;
  cursor: pointer;
}

.intel-post-save-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.intel-post-save-action {
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--brand-700);
  font-size: 13px;
  font-weight: 700;
  text-decoration: none;
}

.intel-post-save-action:hover {
  border-color: color-mix(in srgb, var(--brand-600) 35%, var(--border));
}
`;
