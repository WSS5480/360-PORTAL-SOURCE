export const intelligenceItemDetailCss = `
.oid-overlay {
  position: fixed;
  inset: 0;
  z-index: 80;
  background: rgba(15, 23, 42, 0.42);
  backdrop-filter: blur(2px);
  display: flex;
  justify-content: flex-end;
  align-items: stretch;
}

.oid-panel {
  --oid-heading: #0f172a;
  --oid-body: #334155;
  --oid-secondary: #475569;
  --oid-muted: #64748b;
  --oid-border: #e2e8f0;
  --oid-border-strong: #cbd5e1;
  --oid-brand: var(--brand-600, #0d9488);
  --oid-brand-strong: var(--brand-700, #0f766e);
  --oid-brand-soft: #ecfdf5;
  --oid-brand-border: #99f6e4;
  --oid-warn: #c2410c;
  --oid-warn-soft: #fff7ed;
  --oid-warn-border: #fdba74;
  --oid-info: #0369a1;
  --oid-info-soft: #f0f9ff;
  --oid-ok: #047857;
  --oid-ok-soft: #ecfdf5;
  --oid-shadow: 0 8px 32px rgba(15, 23, 42, 0.14), 0 2px 8px rgba(15, 23, 42, 0.08);

  width: min(520px, 100vw);
  max-height: 100dvh;
  background: #f8fafc;
  border-left: 1px solid var(--oid-border-strong);
  box-shadow: var(--oid-shadow);
  display: grid;
  grid-template-rows: auto 1fr;
  animation: oid-slide-in 0.24s cubic-bezier(0.22, 1, 0.36, 1);
}

@keyframes oid-slide-in {
  from {
    transform: translateX(100%);
    opacity: 0.85;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.oid-scroll {
  overflow-y: auto;
  min-height: 0;
  padding: 20px 20px 28px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* —— Header —— */

.oid-hero {
  position: relative;
  overflow: hidden;
  background: #fff;
  border-bottom: 1px solid var(--oid-border);
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.8);
}

.oid-hero-accent {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 5px;
  background: linear-gradient(180deg, var(--oid-brand) 0%, #14b8a6 100%);
  z-index: 1;
}

.oid-hero-top {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  padding: 20px 20px 14px 24px;
}

.oid-hero-copy {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
}

.oid-title {
  margin: 0;
  font-size: 24px;
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1.15;
  color: var(--oid-heading);
}

.oid-hero-badges {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.oid-implication {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  line-height: 1.5;
  color: var(--oid-body);
}

.oid-subtitle {
  margin: 0;
  font-size: 14px;
  font-weight: 500;
  line-height: 1.45;
  color: var(--oid-secondary);
}

.oid-applies {
  margin: 0;
  font-size: 13px;
  font-weight: 500;
  line-height: 1.4;
  color: var(--oid-secondary);
}

.oid-applies-label {
  display: block;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--oid-muted);
  margin-bottom: 2px;
}

.oid-close {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border: 1px solid var(--oid-border);
  border-radius: 10px;
  background: #fff;
  font-size: 20px;
  line-height: 1;
  color: var(--oid-secondary);
  cursor: pointer;
  transition: background 0.12s ease, border-color 0.12s ease, color 0.12s ease;
}

.oid-close:hover {
  background: #f1f5f9;
  border-color: var(--oid-border-strong);
  color: var(--oid-heading);
}

.oid-close:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--oid-brand) 50%, transparent);
  outline-offset: 2px;
}

.oid-hero-action {
  position: relative;
  z-index: 2;
  margin: 0 20px 18px 24px;
  padding: 12px 14px;
  border-radius: 10px;
  background: var(--oid-brand-soft);
  border: 1px solid var(--oid-brand-border);
}

.oid-hero-action-label {
  display: block;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--oid-brand-strong);
  margin-bottom: 4px;
}

.oid-hero-action-text {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  line-height: 1.45;
  color: var(--oid-heading);
}

/* —— Blocks —— */

.oid-block {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.oid-block-title {
  margin: 0;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--oid-border);
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--oid-heading);
}

.oid-block-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.oid-empty {
  margin: 0;
  padding: 14px 16px;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.45;
  color: var(--oid-secondary);
  background: #fff;
  border: 1px dashed var(--oid-border-strong);
  border-radius: 10px;
}

/* —— Still to validate —— */

.oid-validate-grid {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.oid-validate-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px 14px;
  align-items: start;
  padding: 14px 14px 12px 16px;
  background: #fff;
  border: 1px solid var(--oid-border);
  border-left: 3px solid var(--oid-warn-border);
  border-radius: 10px;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.oid-validate-card:hover {
  border-color: var(--oid-border-strong);
  border-left-color: var(--oid-warn);
  box-shadow: 0 4px 14px rgba(15, 23, 42, 0.08);
}

.oid-validate-card-main {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

.oid-validate-card-top {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.oid-validate-label {
  font-size: 15px;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--oid-heading);
}

.oid-validate-hint {
  margin: 0;
  font-size: 13px;
  font-weight: 500;
  line-height: 1.5;
  color: var(--oid-body);
}

.oid-validate-actions {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 6px;
  min-width: 118px;
  padding-top: 2px;
}

.oid-act {
  margin: 0;
  padding: 7px 10px;
  border: 1px solid var(--oid-border);
  border-radius: 8px;
  background: #fff;
  font-size: 11px;
  font-weight: 700;
  color: var(--oid-body);
  cursor: pointer;
  transition: background 0.12s ease, border-color 0.12s ease;
}

.oid-act:hover:not(:disabled) {
  background: #f8fafc;
  border-color: var(--oid-border-strong);
  color: var(--oid-heading);
}

.oid-act--info {
  color: var(--oid-info);
  border-color: color-mix(in srgb, var(--oid-info) 30%, var(--oid-border));
  background: var(--oid-info-soft);
}

.oid-act:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

/* —— Context cards —— */

.oid-ctx-card {
  background: #fff;
  border: 1px solid var(--oid-border);
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
}

.oid-ctx-card--facility {
  border-top: 3px solid #14b8a6;
}

.oid-ctx-card--provider {
  border-top: 3px solid #3b82f6;
}

.oid-ctx-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 12px 14px;
  background: #f8fafc;
  border-bottom: 1px solid var(--oid-border);
}

.oid-ctx-card-count {
  font-size: 11px;
  font-weight: 700;
  color: var(--oid-secondary);
}

.oid-ctx-card-list {
  margin: 0;
  padding: 10px;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.oid-ctx-card-item {
  display: flex;
  align-items: stretch;
  gap: 10px;
  padding: 12px 12px;
  border-radius: 8px;
  background: #f8fafc;
  border: 1px solid var(--oid-border);
}

.oid-ctx-accent {
  flex-shrink: 0;
  width: 3px;
  border-radius: 3px;
}

.oid-ctx-accent--facility {
  background: linear-gradient(180deg, #14b8a6, #5eead4);
}

.oid-ctx-accent--provider {
  background: linear-gradient(180deg, #3b82f6, #93c5fd);
}

.oid-ctx-text {
  font-size: 14px;
  font-weight: 600;
  line-height: 1.5;
  color: var(--oid-body);
}

/* —— Ask block + steps —— */

.oid-ask-block {
  padding: 12px 14px;
  border-radius: 10px;
  background: #fff;
  border: 1px solid var(--oid-border);
}

.oid-ask-kicker {
  margin: 0 0 8px;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--oid-brand-strong);
}

.oid-ask-list {
  margin: 0;
  padding: 0 0 0 18px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.oid-ask-list li {
  font-size: 14px;
  font-weight: 500;
  line-height: 1.45;
  color: var(--oid-body);
}

.oid-steps {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.oid-step {
  display: grid;
  grid-template-columns: 64px minmax(0, 1fr) auto;
  gap: 12px 14px;
  align-items: center;
  padding: 14px 16px;
  background: #fff;
  border: 1px solid var(--oid-border);
  border-radius: 10px;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.oid-step:hover {
  border-color: color-mix(in srgb, var(--oid-brand) 35%, var(--oid-border));
  box-shadow: 0 4px 14px rgba(15, 23, 42, 0.07);
}

.oid-step-step-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
}

.oid-step-step-label {
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--oid-secondary);
}

.oid-step-index {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  font-size: 17px;
  font-weight: 900;
  font-variant-numeric: tabular-nums;
  color: var(--oid-brand-strong);
  background: var(--oid-brand-soft);
  border: 2px solid var(--oid-brand-border);
}

.oid-step-body {
  min-width: 0;
}

.oid-step-label {
  display: block;
  font-size: 15px;
  font-weight: 800;
  color: var(--oid-heading);
  letter-spacing: -0.02em;
}

.oid-step-purpose {
  margin: 6px 0 0;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--oid-brand-strong);
}

.oid-step-desc {
  margin: 3px 0 0;
  font-size: 13px;
  font-weight: 500;
  line-height: 1.45;
  color: var(--oid-secondary);
}

.oid-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 36px;
  padding: 8px 14px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 700;
  text-decoration: none;
  white-space: nowrap;
  cursor: pointer;
  transition: background 0.12s ease, transform 0.1s ease, box-shadow 0.12s ease;
}

.oid-btn--primary {
  border: 1px solid var(--oid-brand-strong);
  background: var(--oid-brand);
  color: #fff;
  box-shadow: 0 1px 3px rgba(13, 148, 136, 0.25);
}

.oid-btn--primary:hover:not(:disabled) {
  background: var(--oid-brand-strong);
  transform: translateY(-1px);
}

.oid-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* —— Source —— */

.oid-source {
  border: 1px dashed var(--oid-border-strong);
  border-radius: 10px;
  background: #fff;
  overflow: hidden;
}

.oid-source-trigger {
  width: 100%;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  border: none;
  background: #f8fafc;
  cursor: pointer;
  text-align: left;
  font: inherit;
  color: inherit;
}

.oid-source-trigger:hover {
  background: #f1f5f9;
}

.oid-source-trigger-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.oid-source-title {
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--oid-secondary);
}

.oid-source-sub {
  font-size: 12px;
  font-weight: 500;
  color: var(--oid-muted);
}

.oid-source-chevron {
  font-size: 12px;
  font-weight: 800;
  color: var(--oid-muted);
  padding-top: 2px;
}

.oid-source-body {
  padding: 12px 14px 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  border-top: 1px solid var(--oid-border);
}

.oid-source-line {
  margin: 0;
  display: grid;
  gap: 4px;
  font-size: 13px;
  line-height: 1.45;
}

.oid-source-line strong {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--oid-muted);
}

.oid-source-line span {
  font-weight: 600;
  color: var(--oid-body);
}

/* Reuse intelligence UI chips inside drawer */
.oid-panel .pi-chip,
.oid-panel .pi-scope {
  font-size: 11px;
}

@media (max-width: 640px) {
  .oid-overlay {
    align-items: flex-end;
    justify-content: stretch;
  }

  .oid-panel {
    width: 100%;
    max-height: 94dvh;
    border-left: none;
    border-radius: 16px 16px 0 0;
    animation: oid-sheet-up 0.26s cubic-bezier(0.22, 1, 0.36, 1);
  }

  @keyframes oid-sheet-up {
    from {
      transform: translateY(100%);
    }
    to {
      transform: translateY(0);
    }
  }

  .oid-validate-card {
    grid-template-columns: 1fr;
  }

  .oid-validate-actions {
    flex-direction: row;
    flex-wrap: wrap;
    min-width: 0;
  }

  .oid-step {
    grid-template-columns: 52px minmax(0, 1fr);
  }

  .oid-step .oid-btn {
    grid-column: 1 / -1;
    width: 100%;
    justify-content: center;
  }
}
`;
