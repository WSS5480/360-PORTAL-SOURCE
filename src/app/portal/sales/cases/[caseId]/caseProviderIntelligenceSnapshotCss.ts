export const caseProviderIntelligenceSnapshotCss = `
.case-provider-intel-snapshot {
  display: grid;
  gap: 10px;
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
}

.case-provider-intel-snapshot--embedded {
  margin-bottom: 0;
  padding-bottom: 0;
  border-bottom: none;
}

.case-provider-intel-snapshot--compact {
  margin: 0;
  padding: 8px var(--case-m-pad-x, 12px);
  border-bottom: 1px solid var(--case-m-divider, color-mix(in srgb, var(--foreground) 6%, var(--border)));
  background: color-mix(in srgb, var(--brand-600) 3%, var(--surface));
}

.case-provider-intel-compact-grid {
  display: grid;
  gap: 8px;
}

.case-provider-intel-compact-row {
  display: grid;
  gap: 2px;
}

.case-pre-call-mobile-intro {
  margin: 0 0 8px;
  font-size: 11px;
  line-height: 1.45;
  color: var(--muted);
}

.case-pre-call-mobile .case-obs-subitems {
  margin: 0 -2px;
}

.case-provider-intel-snapshot-head {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  align-items: flex-start;
  flex-wrap: wrap;
}

.case-provider-intel-snapshot-title {
  margin: 0;
  font-size: 13px;
  font-weight: 900;
  letter-spacing: -0.02em;
}

.case-provider-intel-snapshot-sub {
  margin: 4px 0 0;
  font-size: 11px;
  color: var(--muted);
  line-height: 1.4;
}

.case-provider-intel-snapshot-updated {
  font-size: 10px;
  font-weight: 700;
  color: var(--muted);
  white-space: nowrap;
}

.case-provider-intel-snapshot-alert {
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, #f59e0b 28%, var(--border));
  background: color-mix(in srgb, #f59e0b 8%, var(--surface));
  font-size: 11px;
  line-height: 1.4;
  font-weight: 650;
}

.case-provider-intel-snapshot-grid {
  display: grid;
  gap: 8px;
}

.case-provider-intel-snapshot-row {
  display: grid;
  gap: 2px;
  font-size: 12px;
  line-height: 1.4;
}

.case-provider-intel-snapshot-label {
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--muted);
}

.case-provider-intel-snapshot-value {
  color: var(--foreground);
}

.case-provider-intel-snapshot-value--muted {
  color: var(--muted);
  font-style: italic;
}

.case-provider-intel-snapshot-prompts {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 4px;
}

.case-provider-intel-snapshot-prompts li {
  font-size: 11px;
  line-height: 1.35;
}

.case-provider-intel-snapshot-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 2px;
}

.case-provider-intel-snapshot-actions a,
.case-provider-intel-snapshot-actions button {
  min-height: 38px;
  flex: 1 1 140px;
  justify-content: center;
}

@media (max-width: 640px) {
  .case-provider-intel-snapshot-actions a,
  .case-provider-intel-snapshot-actions button {
    flex: 1 1 100%;
  }
}
`;
