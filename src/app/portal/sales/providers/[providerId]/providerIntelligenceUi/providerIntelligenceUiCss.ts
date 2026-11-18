/** Provider intelligence UI — shared tokens and primitive styles (pi-*). */

export const providerIntelligenceUiCss = `
.pi-root,
.oid-panel {
  --pi-primary: var(--brand-600, #0d9488);
  --pi-primary-strong: var(--brand-700, #0f766e);
  --pi-primary-soft: #ecfdf5;
  --pi-primary-border: #99f6e4;
  --pi-warning: #c2410c;
  --pi-warning-soft: #fff7ed;
  --pi-warning-border: #fdba74;
  --pi-success: #047857;
  --pi-success-soft: #ecfdf5;
  --pi-success-border: #6ee7b7;
  --pi-info: #0369a1;
  --pi-info-soft: #f0f9ff;
  --pi-info-border: #7dd3fc;
  --pi-neutral-heading: #0f172a;
  --pi-neutral-body: #334155;
  --pi-neutral-secondary: #475569;
  --pi-neutral-muted: #64748b;
  --pi-neutral-faint: #94a3b8;
  --pi-bg: #f1f5f9;
  --pi-surface: #ffffff;
  --pi-border: #e2e8f0;
  --pi-border-strong: #cbd5e1;
  --pi-radius: 14px;
  --pi-radius-sm: 10px;
  --pi-shadow-sm: 0 1px 2px rgba(15, 23, 42, 0.05);
  --pi-shadow: 0 1px 3px rgba(15, 23, 42, 0.08), 0 8px 24px rgba(15, 23, 42, 0.06);
  --pi-shadow-hover: 0 4px 6px rgba(15, 23, 42, 0.06), 0 14px 32px rgba(15, 23, 42, 0.1);
  --pi-space-1: 6px;
  --pi-space-2: 10px;
  --pi-space-3: 14px;
  --pi-space-4: 18px;
  --pi-space-5: 24px;
  --pi-space-6: 32px;
  color: var(--pi-neutral-body);
}

/* —— Layout —— */

.pi-page-section {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.pi-page-section--spaced {
  margin-top: var(--pi-space-6);
}

.pi-page-section--spaced:first-child,
.pi-page-section:first-child {
  margin-top: 0;
}

/* —— Surface —— */

.pi-surface {
  background: var(--pi-surface);
  border: 1px solid var(--pi-border);
  border-radius: var(--pi-radius);
  box-shadow: var(--pi-shadow);
  min-width: 0;
}

.pi-surface--flush {
  box-shadow: var(--pi-shadow-sm);
}

.pi-surface--hero {
  position: relative;
  overflow: hidden;
  border-color: color-mix(in srgb, var(--pi-primary) 28%, var(--pi-border));
}

.pi-surface-body {
  padding: var(--pi-space-5);
}

.pi-surface-body--compact {
  padding: var(--pi-space-4);
}

/* —— Section header —— */

.pi-section-header {
  display: flex;
  flex-direction: column;
  gap: var(--pi-space-2);
  padding: var(--pi-space-5) var(--pi-space-5) var(--pi-space-3);
  border-bottom: 1px solid var(--pi-border);
  background: linear-gradient(180deg, #f8fafc 0%, var(--pi-surface) 100%);
}

.pi-section-header-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--pi-space-3);
}

.pi-section-header-title {
  margin: 0;
  font-size: 17px;
  font-weight: 800;
  letter-spacing: -0.025em;
  color: var(--pi-neutral-heading);
}

.pi-section-header-subtitle {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.5;
  color: var(--pi-neutral-secondary);
}

/* —— Chips & badges —— */

.pi-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px 4px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 800;
  line-height: 1.2;
  white-space: nowrap;
  border: 1px solid transparent;
}

.pi-chip-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}

.pi-chip--warning {
  color: var(--pi-warning);
  background: var(--pi-warning-soft);
  border-color: var(--pi-warning-border);
}
.pi-chip--warning .pi-chip-dot {
  background: var(--pi-warning);
}

.pi-chip--info,
.pi-chip--progress {
  color: var(--pi-info);
  background: var(--pi-info-soft);
  border-color: var(--pi-info-border);
}
.pi-chip--info .pi-chip-dot,
.pi-chip--progress .pi-chip-dot {
  background: var(--pi-info);
}

.pi-chip--success {
  color: var(--pi-success);
  background: var(--pi-success-soft);
  border-color: var(--pi-success-border);
}
.pi-chip--success .pi-chip-dot {
  background: var(--pi-success);
}

.pi-chip--neutral {
  color: var(--pi-neutral-secondary);
  background: #f8fafc;
  border-color: var(--pi-border);
}
.pi-chip--neutral .pi-chip-dot {
  background: var(--pi-neutral-faint);
}

.pi-scope {
  display: inline-flex;
  align-items: center;
  padding: 4px 9px;
  border-radius: 6px;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.pi-scope--facility {
  color: #0f766e;
  background: #f0fdfa;
  border: 1px solid #99f6e4;
}

.pi-scope--provider {
  color: #1e40af;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
}

.pi-scope--engagement {
  color: #5b21b6;
  background: #f5f3ff;
  border: 1px solid #ddd6fe;
}

/* —— Buttons & CTAs —— */

.pi-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 38px;
  padding: 9px 18px;
  border-radius: var(--pi-radius-sm);
  font-size: 13px;
  font-weight: 700;
  line-height: 1.2;
  text-decoration: none;
  white-space: nowrap;
  cursor: pointer;
  font-family: inherit;
  transition:
    background 0.15s ease,
    border-color 0.15s ease,
    color 0.15s ease,
    box-shadow 0.15s ease,
    transform 0.12s ease;
}

.pi-btn:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--pi-primary) 55%, transparent);
  outline-offset: 2px;
}

.pi-btn--lg {
  min-height: 42px;
  padding: 10px 20px;
  font-size: 14px;
}

.pi-btn--sm {
  min-height: 34px;
  padding: 7px 12px;
  font-size: 12px;
}

.pi-btn--primary {
  border: 1px solid var(--pi-primary-strong);
  background: var(--pi-primary);
  color: #fff;
  box-shadow: 0 1px 2px rgba(13, 148, 136, 0.25), 0 4px 12px rgba(13, 148, 136, 0.18);
}

.pi-btn--primary:hover:not(:disabled) {
  background: var(--pi-primary-strong);
  transform: translateY(-1px);
}

.pi-btn--secondary {
  border: 1px solid var(--pi-border-strong);
  background: var(--pi-surface);
  color: var(--pi-neutral-heading);
  box-shadow: var(--pi-shadow-sm);
}

.pi-btn--secondary:hover:not(:disabled) {
  border-color: color-mix(in srgb, var(--pi-primary) 40%, var(--pi-border-strong));
  background: var(--pi-primary-soft);
  color: var(--pi-primary-strong);
}

.pi-btn--ghost {
  border: 1px solid var(--pi-border);
  background: var(--pi-surface);
  color: var(--pi-neutral-body);
  box-shadow: var(--pi-shadow-sm);
}

.pi-btn--ghost:hover:not(:disabled) {
  border-color: var(--pi-border-strong);
  background: #f8fafc;
  color: var(--pi-neutral-heading);
}

.pi-btn--info {
  color: var(--pi-info);
  border-color: var(--pi-info-border);
  background: var(--pi-info-soft);
}

.pi-btn--info:hover:not(:disabled) {
  background: #e0f2fe;
}

.pi-btn:disabled {
  opacity: 0.48;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.pi-cta-group {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--pi-space-3);
}

.pi-cta-group--stretch .pi-btn {
  flex: 1 1 auto;
}

.pi-cta-group--end {
  justify-content: flex-end;
}

/* —— Insight list —— */

.pi-insight-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: var(--pi-space-3);
}

.pi-insight-item {
  display: flex;
  align-items: stretch;
  gap: var(--pi-space-3);
  padding: var(--pi-space-4);
  border-radius: var(--pi-radius-sm);
  background: #f8fafc;
  border: 1px solid var(--pi-border);
}

.pi-insight-accent {
  flex-shrink: 0;
  width: 3px;
  border-radius: 3px;
}

.pi-insight-accent--facility {
  background: linear-gradient(180deg, #14b8a6, #5eead4);
}

.pi-insight-accent--provider {
  background: linear-gradient(180deg, #3b82f6, #93c5fd);
}

.pi-insight-body {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.pi-insight-label {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.pi-insight-label--facility {
  color: #0f766e;
}

.pi-insight-label--provider {
  color: #1d4ed8;
}

.pi-insight-text {
  font-size: 14px;
  font-weight: 600;
  line-height: 1.5;
  color: var(--pi-neutral-body);
}

.pi-empty {
  margin: 0;
  padding: var(--pi-space-4);
  font-size: 14px;
  font-weight: 600;
  line-height: 1.45;
  color: var(--pi-neutral-secondary);
  background: var(--pi-surface);
  border: 1px dashed var(--pi-border-strong);
  border-radius: var(--pi-radius-sm);
}

/* —— Task card —— */

.pi-task-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: var(--pi-space-4);
  align-items: start;
  padding: var(--pi-space-4) var(--pi-space-4) var(--pi-space-4) var(--pi-space-5);
  background: var(--pi-surface);
  border: 1px solid var(--pi-border);
  border-left: 3px solid var(--pi-warning-border);
  border-radius: var(--pi-radius-sm);
  box-shadow: var(--pi-shadow-sm);
  transition:
    border-color 0.15s ease,
    box-shadow 0.18s ease,
    transform 0.12s ease;
}

.pi-task-card:hover {
  border-color: var(--pi-border-strong);
  border-left-color: var(--pi-warning);
  box-shadow: var(--pi-shadow-hover);
  transform: translateY(-1px);
}

.pi-task-card--selected {
  border-color: color-mix(in srgb, var(--pi-primary) 45%, var(--pi-border));
  border-left-color: var(--pi-primary);
  background: var(--pi-primary-soft);
  box-shadow:
    0 0 0 1px color-mix(in srgb, var(--pi-primary) 22%, transparent),
    var(--pi-shadow-hover);
}

.pi-task-card--selected .pi-task-card-title {
  color: var(--pi-primary-strong);
}

.pi-task-card-main {
  display: flex;
  flex-direction: column;
  gap: var(--pi-space-2);
  margin: 0;
  padding: 0;
  border: none;
  background: transparent;
  text-align: left;
  font: inherit;
  color: inherit;
  cursor: pointer;
  min-width: 0;
}

.pi-task-card-main:disabled {
  cursor: default;
}

.pi-task-card-main:not(:disabled):focus-visible {
  outline: 2px solid color-mix(in srgb, var(--pi-primary) 50%, transparent);
  outline-offset: 3px;
  border-radius: 6px;
}

.pi-task-card-title {
  margin: 0;
  font-size: 16px;
  font-weight: 800;
  line-height: 1.3;
  letter-spacing: -0.02em;
  color: var(--pi-neutral-heading);
}

.pi-task-card-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--pi-space-2);
}

.pi-task-card-hint {
  margin: var(--pi-space-1) 0 0;
  font-size: 14px;
  font-weight: 500;
  line-height: 1.5;
  color: var(--pi-neutral-body);
}

.pi-task-card-actions {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: var(--pi-space-2);
  min-width: 132px;
}

/* —— Next move row —— */

.pi-next-move {
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr) auto;
  gap: var(--pi-space-4);
  align-items: center;
  padding: var(--pi-space-5);
  background: var(--pi-surface);
  border: 1px solid var(--pi-border);
  border-radius: var(--pi-radius-sm);
  box-shadow: var(--pi-shadow-sm);
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.pi-next-move:hover {
  border-color: color-mix(in srgb, var(--pi-primary) 32%, var(--pi-border));
  box-shadow: var(--pi-shadow-hover);
}

.pi-next-move-step-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.pi-next-move-step-label {
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--pi-neutral-secondary);
}

.pi-next-move-step {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 11px;
  font-size: 18px;
  font-weight: 900;
  font-variant-numeric: tabular-nums;
  color: var(--pi-primary-strong);
  background: var(--pi-primary-soft);
  border: 2px solid var(--pi-primary-border);
}

.pi-next-move-body {
  min-width: 0;
}

.pi-next-move-title {
  margin: 0;
  font-size: 16px;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--pi-neutral-heading);
}

.pi-next-move-purpose {
  margin: var(--pi-space-2) 0 0;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--pi-primary-strong);
}

.pi-next-move-desc {
  margin: 4px 0 0;
  font-size: 14px;
  font-weight: 500;
  line-height: 1.45;
  color: var(--pi-neutral-secondary);
}

.pi-next-move-cta {
  display: flex;
  align-items: center;
  justify-content: flex-end;
}

.pi-next-move-cta .pi-btn--primary {
  min-width: 148px;
}

@media (max-width: 768px) {
  .pi-task-card {
    grid-template-columns: 1fr;
  }

  .pi-task-card-actions {
    flex-direction: row;
    flex-wrap: wrap;
    min-width: 0;
    padding-top: var(--pi-space-2);
    border-top: 1px solid var(--pi-border);
  }

  .pi-next-move {
    grid-template-columns: 56px minmax(0, 1fr);
  }

  .pi-next-move-cta {
    grid-column: 1 / -1;
    justify-content: flex-start;
  }

  .pi-next-move-cta .pi-btn--primary {
    width: 100%;
    min-width: 0;
  }

  .pi-cta-group--stretch {
    flex-direction: column;
  }
}
`;
