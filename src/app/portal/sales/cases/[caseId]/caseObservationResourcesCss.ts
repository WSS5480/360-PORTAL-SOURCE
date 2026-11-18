export const caseObservationResourcesCss = `
.case-obs-resources {
  display: grid;
  gap: 12px;
  min-width: 0;
  max-width: 720px;
}
.case-obs-resources-panel {
  display: grid;
  gap: 12px;
}
.case-obs-resources-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}.case-obs-resources-phi {
  margin: 0;
  font-size: 11px;
  line-height: 1.45;
  font-weight: 650;
  color: var(--muted);
}
.case-obs-resources-empty-wrap {
  display: grid;
  gap: 10px;
}
.case-obs-resources-placeholders {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 6px;
}
.case-obs-resources-placeholders li {
  font-size: 13px;
  font-weight: 650;
  color: color-mix(in srgb, var(--foreground) 45%, var(--muted));
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px dashed color-mix(in srgb, var(--foreground) 12%, var(--border));
  background: color-mix(in srgb, var(--foreground) 2%, #fff);
}.case-obs-resources-categories {
  display: grid;
  gap: 10px;
}
.case-obs-resources-category {
  display: grid;
  gap: 6px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
  background: color-mix(in srgb, var(--foreground) 2%, #fff);
}
.case-obs-resources-category-title {
  margin: 0;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--muted);
}
.case-obs-resources-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 6px;
}
.case-obs-resources-item {
  margin: 0;
}
.case-obs-resources-item-btn {
  width: 100%;
  display: grid;
  gap: 2px;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
  background: #fff;
  text-align: left;
  font: inherit;
  cursor: pointer;
}
.case-obs-resources-item-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.case-obs-resources-item-name {
  font-size: 12px;
  font-weight: 800;
  color: var(--foreground);
}
.case-obs-resources-item-meta {
  font-size: 10px;
  font-weight: 650;
  color: var(--muted);
}
.case-obs-resources-empty-wrap {
  display: grid;
  gap: 12px;
  padding: 8px 12px 20px;
}
`;
