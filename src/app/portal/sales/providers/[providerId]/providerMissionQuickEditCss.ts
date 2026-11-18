/** Quick-edit / delete engagement sheets on Provider Overview mission control. */
export const providerMissionQuickEditCss = `
.engagement-outcome-sheet-backdrop {
  position: fixed;
  inset: 0;
  z-index: 80;
  background: color-mix(in srgb, #000 35%, transparent);
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.engagement-outcome-sheet {
  width: 100%;
  max-width: 520px;
  max-height: 85dvh;
  overflow: auto;
  border-radius: 16px 16px 0 0;
  padding: 16px 16px calc(16px + env(safe-area-inset-bottom, 0px));
  background: #fff;
  border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
  box-shadow: 0 -8px 32px color-mix(in srgb, #000 12%, transparent);
}

.engagement-outcome-sheet-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.engagement-outcome-sheet-head h2 {
  margin: 0;
  font-size: 16px;
  font-weight: 900;
}

.engagement-outcome-sheet-close {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));
  background: var(--surface);
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
}

.engagement-outcome-sheet-hint {
  margin: 0 0 12px;
  font-size: 12px;
  color: var(--muted);
  line-height: 1.45;
}

.engagement-outcome-sheet-actions {
  display: flex;
  gap: 8px;
  margin-top: 14px;
}

.engagement-outcome-sheet-actions button {
  flex: 1;
  min-height: 42px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 800;
  border: 1px solid color-mix(in srgb, var(--brand-600) 18%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 6%, var(--surface));
  color: var(--brand-700);
  cursor: pointer;
  font-family: inherit;
}

.engagement-outcome-sheet-actions button.primary {
  background: var(--brand-600);
  color: #fff;
  border-color: var(--brand-600);
}

.engagement-detail-mobile-field {
  display: grid;
  gap: 4px;
  margin-bottom: 10px;
}

.engagement-detail-mobile-field > span:first-child {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--muted);
}

.engagement-detail-mobile-field textarea,
.engagement-detail-mobile-field select,
.engagement-detail-mobile-field input {
  width: 100%;
  min-height: 40px;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));
  background: var(--surface);
  font-size: 14px;
  font-family: inherit;
}

.engagement-record-danger-zone {
  padding-top: 8px;
  border-top: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
}

.engagement-record-danger-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 36px;
  padding: 0 12px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--danger, #dc2626) 35%, var(--border));
  background: color-mix(in srgb, var(--danger, #dc2626) 8%, #fff);
  color: var(--danger, #dc2626);
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
  font-family: inherit;
}
`;
