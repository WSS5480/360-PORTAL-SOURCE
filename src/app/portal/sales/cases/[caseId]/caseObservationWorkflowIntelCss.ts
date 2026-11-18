export const caseObservationWorkflowIntelCss = `
.case-obs-workflow-intel {
  display: grid;
  gap: 12px;
  padding: 8px 12px 20px;
  min-width: 0;
}
.case-obs-workflow-intel-lead {
  margin: 0;
  font-size: 12px;
  line-height: 1.45;
  font-weight: 600;
  color: color-mix(in srgb, var(--foreground) 68%, var(--muted));
}
.case-obs-workflow-intel-updated {
  color: var(--muted);
  font-weight: 650;
}
.case-obs-workflow-intel-categories {
  display: grid;
  gap: 10px;
}
.case-obs-workflow-intel-category {
  display: grid;
  gap: 6px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
  background: color-mix(in srgb, var(--foreground) 2%, #fff);
}
.case-obs-workflow-intel-category-title {
  margin: 0;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--muted);
}
.case-obs-workflow-intel-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 6px;
}
.case-obs-workflow-intel-item {
  margin: 0;
  font-size: 13px;
  line-height: 1.45;
  font-weight: 650;
  color: var(--foreground);
}
`;
