export const caseOperationalIntelligenceCss = `
.case-ops-intel {
  border-radius: 12px;
  border: 1px solid var(--border);
  background: var(--surface);
  padding: 12px 14px;
  display: grid;
  gap: 12px;
}

.case-ops-intel--embedded {
  margin-bottom: 10px;
}

.case-ops-intel-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.case-ops-intel-title {
  margin: 0;
  font-size: 15px;
  font-weight: 800;
}

.case-ops-intel-lead {
  margin: 4px 0 0;
  font-size: 12px;
  line-height: 1.4;
  color: var(--muted);
}

.case-ops-readiness-pill {
  flex-shrink: 0;
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 4px 8px;
  border-radius: 6px;
}

.case-ops-readiness-pill--early {
  color: #64748b;
  background: color-mix(in srgb, var(--foreground) 6%, var(--surface));
}

.case-ops-readiness-pill--developing {
  color: #92400e;
  background: color-mix(in srgb, #eab308 12%, var(--surface));
}

.case-ops-readiness-pill--strong,
.case-ops-readiness-pill--validated {
  color: #166534;
  background: color-mix(in srgb, #22c55e 12%, var(--surface));
}

.case-ops-readiness-summary {
  margin: 0;
  font-size: 13px;
  font-weight: 650;
  line-height: 1.4;
}

.case-ops-readiness-grid {
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
}

.case-ops-readiness-dim {
  border-radius: 8px;
  border: 1px solid var(--border);
  padding: 8px 10px;
  display: grid;
  gap: 4px;
  background: color-mix(in srgb, var(--foreground) 2%, var(--surface));
}

.case-ops-readiness-dim-top {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.case-ops-readiness-dim-label {
  font-size: 11px;
  font-weight: 800;
}

.case-ops-readiness-dim-state {
  font-size: 9px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--muted);
}

.case-ops-readiness-dim-line {
  margin: 0;
  font-size: 11px;
  line-height: 1.35;
  color: color-mix(in srgb, var(--foreground) 88%, var(--muted));
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.case-ops-ctx-sections {
  display: grid;
  gap: 10px;
}

.case-ops-ctx-block {
  border-top: 1px solid color-mix(in srgb, var(--border) 80%, transparent);
  padding-top: 10px;
  display: grid;
  gap: 6px;
}

.case-ops-ctx-block-title {
  margin: 0;
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.case-ops-ctx-inherit {
  margin: 2px 0 0;
  font-size: 11px;
  color: #0f766e;
}

.case-ops-ctx-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 8px;
}

.case-ops-ctx-line {
  border-radius: 8px;
  padding: 8px 10px;
  background: color-mix(in srgb, var(--foreground) 3%, var(--surface));
  border: 1px solid color-mix(in srgb, var(--border) 70%, transparent);
}

.case-ops-ctx-line-top {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 4px;
}

.case-ops-ctx-label {
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--muted);
}

.case-ops-ctx-inherited-tag {
  font-size: 9px;
  font-weight: 800;
  color: #0f766e;
  padding: 1px 5px;
  border-radius: 4px;
  background: color-mix(in srgb, #0d9488 10%, var(--surface));
}

.case-ops-ctx-value {
  margin: 0;
  font-size: 12px;
  font-weight: 650;
  line-height: 1.35;
}

.case-ops-ctx-empty {
  margin: 0;
  font-size: 12px;
  color: var(--muted);
}

.case-ops-prior {
  border-radius: 8px;
  padding: 8px 10px;
  background: color-mix(in srgb, #fb923c 10%, var(--surface));
  border: 1px solid color-mix(in srgb, #ea580c 25%, var(--border));
}

.case-ops-prior-kicker {
  display: block;
  font-size: 9px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #9a3412;
  margin-bottom: 4px;
}

.case-ops-prior-text {
  margin: 0;
  font-size: 12px;
  line-height: 1.4;
}

.case-ops-intel-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.case-ops-intel-foot {
  margin: 0;
  font-size: 11px;
  color: var(--muted);
}

@media (min-width: 720px) {
  .case-ops-readiness-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}
`;
