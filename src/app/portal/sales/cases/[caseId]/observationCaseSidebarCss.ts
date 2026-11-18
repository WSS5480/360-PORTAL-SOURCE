export const observationCaseSidebarCss = `
.case-obs-sidebar {
  display: grid;
  gap: 12px;
  min-width: 0;
}
.case-obs-sidebar-section {
  display: grid;
  gap: 8px;
  padding: 10px 12px;
  border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
  border-radius: 12px;
  background: var(--surface, #fff);
}
.case-obs-sidebar-section-title {
  margin: 0;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--foreground) 68%, var(--muted));
}
.case-obs-sidebar-readiness-list,
.case-obs-sidebar-metrics {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 8px;
}
.case-obs-sidebar-readiness-item {
  display: grid;
  min-width: 0;
}
.case-obs-sidebar-readiness-static {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 8px;
  align-items: start;
}
.case-obs-sidebar-readiness-btn {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 8px;
  align-items: start;
  width: 100%;
  padding: 6px 8px;
  margin: -6px -8px;
  border: none;
  border-radius: 8px;
  background: transparent;
  text-align: left;
  cursor: pointer;
  font-family: inherit;
  color: inherit;
}
.case-obs-sidebar-readiness-btn:hover:not(:disabled) {
  background: color-mix(in srgb, var(--brand-600) 5%, var(--surface, #fff));
}
.case-obs-sidebar-readiness-btn:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--brand-600) 55%, transparent);
  outline-offset: 1px;
}
.case-obs-sidebar-readiness-btn:disabled {
  cursor: default;
}
.case-obs-sidebar-readiness-btn--needs_input .case-obs-sidebar-readiness-completion {
  color: #b45309;
}
.case-obs-sidebar-readiness-btn--complete .case-obs-sidebar-readiness-completion {
  color: #15803d;
}
.case-obs-sidebar-readiness-completion {
  flex-shrink: 0;
  font-size: 9px;
  font-weight: 900;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--brand-700);
  white-space: nowrap;
  padding-top: 2px;
}
.case-obs-sidebar-readiness-marker {
  width: 16px;
  height: 16px;
  border-radius: 999px;
  border: 2px solid color-mix(in srgb, var(--foreground) 16%, var(--border));
  margin-top: 1px;
  flex-shrink: 0;
}
.case-obs-sidebar-readiness-marker--confirmed {
  border-color: #16a34a;
  background: color-mix(in srgb, #16a34a 18%, #fff);
  box-shadow: inset 0 0 0 2px #fff;
}
.case-obs-sidebar-readiness-main {
  display: grid;
  gap: 2px;
  min-width: 0;
}
.case-obs-sidebar-readiness-label {
  font-size: 11px;
  font-weight: 800;
  color: var(--foreground);
  line-height: 1.3;
}
.case-obs-sidebar-readiness-value {
  font-size: 11px;
  font-weight: 650;
  color: var(--cod-muted, var(--muted));
  line-height: 1.35;
}
.case-obs-sidebar-intel-indicator {
  display: grid;
  gap: 4px;
  padding: 8px 10px;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
  background: color-mix(in srgb, var(--foreground) 2%, var(--surface, #fff));
}
.case-obs-sidebar-intel-indicator--watch {
  border-color: color-mix(in srgb, #d97706 28%, var(--border));
  background: color-mix(in srgb, #d97706 5%, var(--surface, #fff));
}
.case-obs-sidebar-intel-indicator--identified {
  border-color: color-mix(in srgb, var(--brand-600) 32%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 7%, var(--surface, #fff));
  box-shadow: inset 3px 0 0 color-mix(in srgb, var(--brand-600) 72%, #fff);
}
.case-obs-sidebar-intel-indicator-label {
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--foreground) 68%, var(--muted));
}
.case-obs-sidebar-intel-indicator-status {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}
.case-obs-sidebar-intel-indicator-icon {
  flex-shrink: 0;
  font-size: 12px;
  line-height: 1;
  color: #d97706;
}
.case-obs-sidebar-intel-indicator-dot {
  width: 7px;
  height: 7px;
  border-radius: 999px;
  flex-shrink: 0;
  background: var(--brand-600);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--brand-600) 18%, #fff);
}
.case-obs-sidebar-intel-indicator-copy {
  font-size: 12px;
  font-weight: 750;
  line-height: 1.35;
  color: var(--foreground);
}
.case-obs-sidebar-intel-indicator--watch .case-obs-sidebar-intel-indicator-copy {
  color: color-mix(in srgb, var(--foreground) 72%, var(--muted));
}
.case-obs-sidebar-intel-indicator--identified .case-obs-sidebar-intel-indicator-copy {
  font-weight: 850;
  color: var(--brand-700, var(--brand-600));
}
.case-obs-sidebar-action-section {
  border-color: color-mix(in srgb, var(--brand-600) 22%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 4%, var(--surface, #fff));
}
.case-obs-sidebar-action-copy {
  margin: 0;
  font-size: 11px;
  font-weight: 650;
  line-height: 1.4;
  color: color-mix(in srgb, var(--foreground) 62%, var(--muted));
}
.case-obs-sidebar-action-btn {
  width: 100%;
  min-height: 40px;
  padding: 10px 12px;
  border: 1px solid var(--brand-600);
  border-radius: 10px;
  background: var(--brand-600);
  color: #fff;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
  font-family: inherit;
  touch-action: manipulation;
}
.case-obs-sidebar-action-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.case-obs-sidebar-action-btn:not(:disabled):hover {
  filter: brightness(0.98);
}
`;
