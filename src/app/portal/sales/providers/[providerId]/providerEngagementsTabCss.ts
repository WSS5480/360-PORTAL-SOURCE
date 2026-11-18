/** Provider Engagements tab — compact timeline rows (aligned with Cases tab density). */
export const providerEngagementsTabCss = `
.provider-profile-root--engagements-tab .provider-tab-workspace {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  overflow-x: clip;
}

.provider-profile-root--engagements-tab .provider-profile-body {
  overflow-x: clip;
}

.pet {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
}

.pet-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px 12px;
  min-width: 0;
}

.pet-head-copy {
  min-width: 0;
  flex: 1 1 auto;
}

.pet-head-title {
  margin: 0;
  font-size: 15px;
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1.2;
  color: var(--foreground);
}

.pet-head-meta {
  margin: 3px 0 0;
  font-size: 12px;
  line-height: 1.35;
  color: var(--muted);
}

.pet-head-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  padding: 0 12px;
  border-radius: 7px;
  border: 1px solid var(--brand-600);
  background: var(--brand-600);
  color: #fff;
  font-size: 11px;
  font-weight: 800;
  text-decoration: none;
  white-space: nowrap;
  flex-shrink: 0;
}

.pet-head-action:hover {
  filter: brightness(1.04);
}

.pet-loading {
  margin: 0;
  font-size: 12px;
  color: var(--muted);
}

.pet-empty {
  margin: 0;
  padding: 18px 16px;
  border-radius: 10px;
  border: 1px dashed color-mix(in srgb, var(--foreground) 12%, var(--border));
  text-align: center;
}

.pet-empty-text {
  margin: 0;
  font-size: 13px;
  line-height: 1.45;
  color: var(--muted);
}

.pet-empty-cta {
  display: inline-flex;
  margin-top: 10px;
  min-height: 44px;
  padding: 0 12px;
  align-items: center;
  border-radius: 7px;
  border: 1px solid var(--brand-600);
  background: var(--brand-600);
  color: #fff;
  font-size: 11px;
  font-weight: 800;
  text-decoration: none;
}

.pet-empty-inline {
  margin: 0;
  padding: 10px 12px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--foreground) 3%, var(--surface));
  font-size: 12px;
  color: var(--muted);
}

.pet-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  min-width: 0;
  width: 100%;
  border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
  border-radius: 10px;
  background: var(--surface);
  overflow: hidden;
}

.pet-section-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin: 0;
  padding: 7px 12px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--foreground) 52%, transparent);
  background: color-mix(in srgb, var(--foreground) 4%, var(--surface));
  border-bottom: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
}

.pet-section-label:not(:first-child) {
  border-top: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
}

.pet-section-label__count {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.04em;
  color: var(--muted);
}

.pet-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px 10px;
  align-items: center;
  padding: 10px 12px;
  border-bottom: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
  min-width: 0;
}

.pet-row:last-child {
  border-bottom: none;
}

.pet-row--attention {
  background: color-mix(in srgb, #f59e0b 6%, var(--surface));
  box-shadow: inset 3px 0 0 #f59e0b;
}

.pet-row--legacy {
  background: color-mix(in srgb, var(--foreground) 2.5%, var(--surface));
}

.pet-row__main {
  display: grid;
  align-content: center;
  min-height: 44px;
  min-width: 0;
  text-decoration: none;
  color: inherit;
}

.pet-row__main:hover .pet-row__type {
  color: var(--brand-700);
}

.pet-row__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-width: 0;
}

.pet-row__type {
  font-size: 13px;
  font-weight: 800;
  letter-spacing: -0.01em;
  color: var(--foreground);
  line-height: 1.25;
}

.pet-row__status {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  min-height: 22px;
  padding: 0 7px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.02em;
  line-height: 1;
}

.pet-row__status--planned {
  color: #1d4ed8;
  background: color-mix(in srgb, #3b82f6 14%, #fff);
}

.pet-row__status--active {
  color: #b45309;
  background: color-mix(in srgb, #f59e0b 16%, #fff);
}

.pet-row__status--done {
  color: #047857;
  background: color-mix(in srgb, #10b981 14%, #fff);
}

.pet-row__status--neutral {
  color: var(--muted);
  background: color-mix(in srgb, var(--foreground) 6%, #fff);
}

.pet-row__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 8px;
  margin-top: 4px;
  min-width: 0;
}

.pet-row__when {
  font-size: 12px;
  font-weight: 600;
  color: var(--muted);
  line-height: 1.3;
}

.pet-row__pill {
  display: inline-flex;
  align-items: center;
  min-height: 20px;
  padding: 0 6px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 700;
  color: color-mix(in srgb, var(--foreground) 72%, transparent);
  background: color-mix(in srgb, var(--foreground) 6%, #fff);
}

.pet-row__flag {
  display: inline-flex;
  align-items: center;
  min-height: 20px;
  padding: 0 6px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 800;
  color: #b45309;
  background: color-mix(in srgb, #f59e0b 14%, #fff);
}

.pet-row__outcome {
  font-size: 11px;
  font-weight: 600;
  color: color-mix(in srgb, var(--foreground) 68%, transparent);
  line-height: 1.3;
}

.pet-row__actions {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 6px;
  flex-shrink: 0;
}

.pet-row__action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  padding: 0 12px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--brand-600) 35%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 8%, #fff);
  color: var(--brand-700);
  font-size: 11px;
  font-weight: 800;
  text-decoration: none;
  white-space: nowrap;
  flex-shrink: 0;
  cursor: pointer;
  font-family: inherit;
  box-sizing: border-box;
}

.pet-row__action--primary {
  border-color: var(--brand-600);
  background: var(--brand-600);
  color: #fff;
}

.pet-row__action--secondary {
  border-color: color-mix(in srgb, var(--brand-600) 35%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 8%, #fff);
  color: var(--brand-700);
}

.pet-row__action:hover {
  filter: brightness(1.04);
}

.pet-row__action--secondary:hover {
  border-color: var(--brand-600);
  background: color-mix(in srgb, var(--brand-600) 14%, #fff);
}

@media (max-width: 560px) {
  .pet-row {
    grid-template-columns: minmax(0, 1fr);
  }

  .pet-row__actions {
    width: 100%;
  }

  .pet-row__action {
    width: 100%;
    justify-content: center;
  }
}
`;
