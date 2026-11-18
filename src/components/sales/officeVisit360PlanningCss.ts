export const officeVisit360PlanningCss = `
.office-visit-360-plan {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.office-visit-360-section {
  border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
  border-radius: 8px;
  background: #fff;
  overflow: hidden;
}

.office-visit-360-section[open] {
  border-color: color-mix(in srgb, var(--brand-600) 22%, var(--border));
}

.office-visit-360-section-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 10px;
  cursor: pointer;
  list-style: none;
  user-select: none;
  touch-action: manipulation;
}

.office-visit-360-section-summary::-webkit-details-marker {
  display: none;
}

.office-visit-360-section-title {
  font-size: 12px;
  font-weight: 800;
  color: var(--foreground);
  line-height: 1.25;
}

.office-visit-360-section-preview {
  font-size: 10px;
  font-weight: 600;
  color: var(--muted);
  text-align: right;
  line-height: 1.3;
  max-width: 55%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.office-visit-360-section[open] .office-visit-360-section-preview {
  display: none;
}

.office-visit-360-section-body {
  padding: 0 10px 10px;
  border-top: 1px solid color-mix(in srgb, var(--foreground) 5%, var(--border));
  display: grid;
  gap: 6px;
}

.office-visit-360-section-helper {
  margin: 8px 0 0;
  font-size: 10px;
  color: var(--muted);
  line-height: 1.35;
}

.office-visit-360-section textarea {
  width: 100%;
  box-sizing: border-box;
  margin-top: 4px;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));
  font-size: 16px;
  font-family: inherit;
  line-height: 1.35;
  resize: vertical;
  min-height: 40px;
  background: #fff;
}

.office-visit-360-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-top: 4px;
}

.office-visit-360-chip {
  border: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));
  border-radius: 999px;
  padding: 4px 8px;
  font-size: 10px;
  font-weight: 700;
  font-family: inherit;
  background: color-mix(in srgb, var(--foreground) 3%, #fff);
  color: var(--foreground);
  cursor: pointer;
  line-height: 1.2;
}

.office-visit-360-chip:active {
  background: color-mix(in srgb, var(--brand-600) 10%, #fff);
  border-color: color-mix(in srgb, var(--brand-600) 35%, var(--border));
}

.office-visit-360-templates-wrap {
  margin-bottom: 6px;
}

.office-visit-360-templates-wrap .pcp-template-embedded .pcp-template-body {
  max-height: min(40dvh, 360px);
}
`;
