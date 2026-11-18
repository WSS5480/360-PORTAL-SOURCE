/** Playbook toolbar inside planned prepare planning surface. */
export const preparePlaybookAssistantCss = `
.pfm-playbook-assistant {
  padding: 12px 14px 14px;
  border-bottom: 1px solid color-mix(in srgb, var(--pfm-border, #c9d2df) 85%, transparent);
  background: linear-gradient(180deg, #f8fafc 0%, #fff 100%);
}

.pfm-playbook-assistant__head {
  margin-bottom: 10px;
}

.pfm-playbook-assistant__kicker {
  margin: 0 0 2px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #64748b;
}

.pfm-playbook-assistant__title {
  margin: 0;
  font-size: 14px;
  font-weight: 800;
  color: #0b1220;
}

.pfm-playbook-assistant__grid {
  display: grid;
  gap: 10px;
}

@media (min-width: 720px) {
  .pfm-playbook-assistant__grid {
    grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr) auto;
    align-items: end;
    gap: 10px 12px;
  }

  .pfm-playbook-assistant__actions {
    flex-direction: row;
    flex-wrap: nowrap;
  }
}

.pfm-playbook-assistant__field {
  display: flex;
  flex-direction: column;
  gap: 5px;
  min-width: 0;
}

.pfm-playbook-assistant__label {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #64748b;
}

.pfm-playbook-assistant__select {
  width: 100%;
  box-sizing: border-box;
  padding: 9px 11px;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, #0b1220 9%, #c9d2df);
  font-size: 14px;
  font-family: inherit;
  background: #fff;
  color: #0b1220;
}

.pfm-playbook-assistant__select:disabled {
  opacity: 0.6;
}

.pfm-playbook-assistant__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.pfm-playbook-assistant__btn {
  flex: 1 1 auto;
  min-height: 40px;
  padding: 8px 14px;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, #0b1220 10%, #c9d2df);
  font-size: 13px;
  font-weight: 800;
  font-family: inherit;
  background: #fff;
  color: #0b1220;
  cursor: pointer;
}

.pfm-playbook-assistant__btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pfm-playbook-assistant__btn--primary {
  border-color: color-mix(in srgb, #0d9488 35%, #c9d2df);
  background: color-mix(in srgb, #0d9488 10%, #fff);
  color: #0f766e;
}

.pfm-playbook-assistant__alert {
  margin: 8px 0 0;
  font-size: 12px;
  color: #b45309;
}

.pfm-playbook-assistant__loading {
  margin: 0;
  font-size: 12px;
  color: #64748b;
}

/* Sheets */
.pfm-playbook-sheet-backdrop {
  position: fixed;
  inset: 0;
  z-index: 120;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 0;
  background: color-mix(in srgb, #0b1220 35%, transparent);
}

@media (min-width: 640px) {
  .pfm-playbook-sheet-backdrop {
    align-items: center;
    padding: 16px;
  }
}

.pfm-playbook-sheet {
  width: 100%;
  max-width: 520px;
  max-height: min(85vh, 640px);
  display: flex;
  flex-direction: column;
  border-radius: 14px 14px 0 0;
  background: #fff;
  border: 1px solid #c9d2df;
  box-shadow: 0 16px 48px rgba(15, 23, 42, 0.18);
}

@media (min-width: 640px) {
  .pfm-playbook-sheet {
    border-radius: 14px;
  }
}

.pfm-playbook-sheet__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px 10px;
  border-bottom: 1px solid #c9d2df;
}

.pfm-playbook-sheet__title {
  margin: 0;
  font-size: 16px;
  font-weight: 800;
  line-height: 1.25;
  color: #0b1220;
}

.pfm-playbook-sheet__sub {
  margin: 4px 0 0;
  font-size: 12px;
  color: #64748b;
  line-height: 1.4;
}

.pfm-playbook-sheet__close {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 8px;
  background: #f1f5f9;
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
  color: #64748b;
}

.pfm-playbook-sheet__body {
  flex: 1;
  overflow: auto;
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.pfm-playbook-sheet__foot {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 12px 16px calc(12px + env(safe-area-inset-bottom, 0px));
  border-top: 1px solid #c9d2df;
}

.pfm-playbook-sheet__foot .pfm-playbook-assistant__btn {
  flex: 1 1 140px;
}

.pfm-playbook-sheet__foot .pfm-playbook-assistant__btn--danger {
  border-color: color-mix(in srgb, #dc2626 35%, #c9d2df);
  background: color-mix(in srgb, #dc2626 8%, #fff);
  color: #991b1b;
}

.pfm-playbook-preview-section {
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid #c9d2df;
  background: #f8fafc;
}

.pfm-playbook-preview-section__head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 6px 10px;
  margin-bottom: 6px;
}

.pfm-playbook-preview-section__label {
  font-size: 12px;
  font-weight: 800;
  color: #0b1220;
}

.pfm-playbook-preview-section__chip {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  padding: 3px 8px;
  border-radius: 999px;
}

.pfm-playbook-preview-section__chip--fill {
  color: #166534;
  background: color-mix(in srgb, #16a34a 12%, #fff);
}

.pfm-playbook-preview-section__chip--keep {
  color: #92400e;
  background: color-mix(in srgb, #d97706 12%, #fff);
}

.pfm-playbook-preview-section__chip--empty {
  color: #64748b;
  background: #f1f5f9;
}

.pfm-playbook-preview-section__text {
  margin: 0;
  font-size: 13px;
  line-height: 1.45;
  color: #334155;
  white-space: pre-wrap;
}

.pfm-playbook-preview-section__empty {
  margin: 0;
  font-size: 12px;
  color: #64748b;
  font-style: italic;
}

.pfm-playbook-apply-conflict-list {
  margin: 0;
  padding: 0 0 0 18px;
  font-size: 13px;
  line-height: 1.5;
  color: #334155;
}

.pfm-playbook-apply-conflict-note {
  margin: 0;
  font-size: 12px;
  line-height: 1.45;
  color: #64748b;
}
`;
