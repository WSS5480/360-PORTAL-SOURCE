export const observationWorkflowMobileCss = `
.case-mobile-workflow-tab--procedural {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

.case-workflow-tab-lead {
  margin: 0;
  padding: 0 12px 4px;
  font-size: 11px;
  line-height: 1.45;
  color: var(--muted);
  font-weight: 600;
}

.case-mobile-workflow-tab .case-obs-workflow {
  border-top: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
}
.case-obs-workflow {
  display: grid;
  gap: 0;
  margin: 0;
  background: #fff;
  border: none;
  border-radius: 0;
  overflow: hidden;
  min-width: 0;
}
.case-mobile-panel > .case-obs-workflow {
  border-radius: 0;
}
.case-obs-workflow-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 12px 6px;
  border-bottom: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
}
.case-obs-workflow-kicker {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted);
}
.case-obs-workflow-summary {
  font-size: 11px;
  font-weight: 700;
  color: var(--muted);
  white-space: nowrap;
}
.case-obs-stepper {
  display: grid;
  min-width: 0;
}
.case-obs-step {
  position: relative;
  min-width: 0;
}
.case-obs-step-rail {
  position: absolute;
  left: 21px;
  top: 34px;
  bottom: 0;
  width: 2px;
  background: color-mix(in srgb, var(--foreground) 10%, var(--border));
  pointer-events: none;
}
.case-obs-step:last-child .case-obs-step-rail {
  display: none;
}
.case-obs-step-header {
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr) auto;
  gap: 8px;
  align-items: center;
  width: 100%;
  min-height: 46px;
  padding: 7px 12px 7px 8px;
  border: none;
  border-bottom: 1px solid color-mix(in srgb, var(--foreground) 5%, var(--border));
  background: transparent;
  text-align: left;
  cursor: pointer;
  touch-action: manipulation;
  appearance: none;
  -webkit-appearance: none;
}
.case-obs-step[data-progress="active"] .case-obs-step-header {
  background: color-mix(in srgb, var(--brand-600) 5%, #fff);
}
.case-obs-step[data-expanded="true"] .case-obs-step-header {
  border-bottom-color: transparent;
}
.case-obs-step-indicator {
  position: relative;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  margin: 0 auto;
  border-radius: 999px;
  border: 2px solid color-mix(in srgb, var(--foreground) 18%, var(--border));
  background: #fff;
  flex-shrink: 0;
}
.case-obs-step[data-progress="active"] .case-obs-step-indicator {
  border-color: var(--brand-600);
  background: color-mix(in srgb, var(--brand-600) 10%, #fff);
}
.case-obs-step[data-progress="completed"] .case-obs-step-indicator {
  border: none;
  background: #16a34a;
  color: #fff;
}
.case-obs-step-main {
  min-width: 0;
  display: grid;
  gap: 2px;
}
.case-obs-step-title {
  font-size: 13px;
  font-weight: 800;
  line-height: 1.3;
  color: var(--foreground);
}
.case-obs-step-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 6px;
  font-size: 11px;
  font-weight: 600;
  color: var(--muted);
  line-height: 1.3;
}
.case-obs-step-chevron {
  font-size: 18px;
  line-height: 1;
  color: var(--muted);
  flex-shrink: 0;
  width: 24px;
  text-align: center;
}
.case-obs-step-body {
  padding: 0 12px 10px 50px;
  display: grid;
  gap: 8px;
  border-bottom: 1px solid color-mix(in srgb, var(--foreground) 5%, var(--border));
  background: color-mix(in srgb, var(--foreground) 1.5%, #fff);
}
.case-obs-step-intro {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
}
.case-obs-step-hint {
  font-size: 11px;
  line-height: 1.4;
  color: var(--muted);
  flex: 1 1 180px;
  min-width: 0;
}
.case-obs-autosave-chip {
  display: inline-flex;
  align-items: center;
  padding: 3px 7px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 800;
  white-space: nowrap;
}
.case-obs-subitems {
  display: grid;
  gap: 0;
  border: none;
  border-radius: 0;
  overflow: hidden;
  background: #fff;
  border-top: 1px solid color-mix(in srgb, var(--foreground) 5%, var(--border));
  border-bottom: 1px solid color-mix(in srgb, var(--foreground) 5%, var(--border));
}
.case-obs-subitem {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  gap: 8px;
  align-items: center;
  width: 100%;
  min-height: 44px;
  padding: 8px 10px;
  border: none;
  border-bottom: 1px solid color-mix(in srgb, var(--foreground) 5%, var(--border));
  background: #fff;
  text-align: left;
  cursor: pointer;
  touch-action: manipulation;
  appearance: none;
  -webkit-appearance: none;
}
.case-obs-subitem:last-child {
  border-bottom: none;
}
.case-obs-subitem-text {
  min-width: 0;
  display: grid;
  gap: 2px;
}
.case-obs-subitem-title {
  font-size: 12px;
  font-weight: 800;
  line-height: 1.3;
  color: var(--foreground);
}
.case-obs-subitem-helper {
  font-size: 10px;
  line-height: 1.35;
  color: var(--muted);
}
.case-obs-subitem-badge {
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  padding: 2px 6px;
  border-radius: 4px;
  border: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));
  color: var(--muted);
  white-space: nowrap;
}
.case-obs-subitem-badge--optional {
  background: color-mix(in srgb, var(--foreground) 3%, #fff);
}
.case-obs-subitem-chevron {
  font-size: 16px;
  color: var(--muted);
  flex-shrink: 0;
}
.case-obs-subitem-editor {
  padding: 0 10px 10px;
  border-bottom: 1px solid color-mix(in srgb, var(--foreground) 5%, var(--border));
  background: color-mix(in srgb, var(--foreground) 2%, #fff);
}
.case-obs-subitem-editor textarea,
.case-obs-subitem-editor input,
.case-obs-subitem-editor select {
  width: 100%;
  box-sizing: border-box;
  font-size: 14px;
}
.case-obs-inline-card {
  display: grid;
  gap: 6px;
  padding: 0;
  border: none;
  border-radius: 0;
  background: transparent;
}
.case-obs-inline-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.case-obs-inline-actions > button,
.case-obs-inline-actions > a {
  min-height: 44px !important;
  padding: 7px 10px !important;
  font-size: 12px !important;
}
.case-obs-suggested {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
  margin: 0;
  padding: 8px 12px;
  border: none;
  border-top: 1px solid color-mix(in srgb, var(--brand-600) 18%, var(--border));
  border-radius: 0;
  background: color-mix(in srgb, var(--brand-600) 5%, #fff);
  color: var(--brand-700);
  font-size: 12px;
  font-weight: 800;
  text-align: left;
  cursor: pointer;
  touch-action: manipulation;
  appearance: none;
  -webkit-appearance: none;
  box-shadow: none;
}
.case-obs-suggested-chevron {
  font-size: 18px;
  color: var(--brand-600);
  flex-shrink: 0;
}
.surgical-case-motion .case-obs-step-header:hover,
.surgical-case-motion .case-obs-subitem:hover,
.surgical-case-motion .case-obs-suggested:hover {
  filter: none;
}
.surgical-case-motion .case-obs-step-header:active,
.surgical-case-motion .case-obs-subitem:active,
.surgical-case-motion .case-obs-suggested:active {
  transform: none;
  opacity: 0.85;
}
`;
