export const backgroundIntelligenceSectionsCss = `
.bg-intel-sections {
  display: grid;
  gap: 8px;
  margin-top: 12px;
}

.bg-intel-sections--compact {
  gap: 6px;
  margin-top: 8px;
}

.bg-intel-section {
  border: 1px solid color-mix(in srgb, var(--border) 88%, var(--foreground) 4%);
  border-radius: 10px;
  background: color-mix(in srgb, var(--surface) 96%, var(--muted) 4%);
  overflow: hidden;
}

.bg-intel-section[open] {
  background: color-mix(in srgb, var(--surface) 98%, var(--brand-600) 2%);
}

.bg-intel-section-summary {
  list-style: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 10px;
  font-size: 12px;
  font-weight: 650;
  letter-spacing: -0.01em;
  color: var(--muted);
}

.bg-intel-section-summary::-webkit-details-marker {
  display: none;
}

.bg-intel-section-summary::after {
  content: "▸";
  font-size: 11px;
  color: color-mix(in srgb, var(--muted) 80%, var(--foreground) 20%);
}

.bg-intel-section[open] > .bg-intel-section-summary::after {
  content: "▾";
}

.bg-intel-section-body {
  padding: 0 10px 10px;
  display: grid;
  gap: 8px;
}

.bg-intel-item {
  display: grid;
  gap: 2px;
  padding: 8px 9px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--surface) 92%, var(--foreground) 2%);
  border: 1px solid color-mix(in srgb, var(--border) 90%, transparent);
}

.bg-intel-item-label {
  margin: 0;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--muted) 88%, var(--foreground) 12%);
}

.bg-intel-item-summary {
  margin: 0;
  font-size: 12px;
  line-height: 1.45;
  color: var(--foreground);
  font-weight: 550;
}

.bg-intel-item-meta {
  margin: 0;
  font-size: 10px;
  line-height: 1.35;
  color: var(--muted);
}

.bg-intel-sections-lead {
  margin: 0 0 4px;
  font-size: 11px;
  line-height: 1.4;
  color: var(--muted);
}
`;
