/** Field brief editor + question sheet — scoped to dark active engagement workspace. */
export const liveEngagementBriefEditCss = `
.live-call-workspace__bar {
  flex-wrap: wrap;
}

.live-call-workspace__edit-brief {
  margin-left: auto;
  appearance: none;
  border: 1px solid rgba(56, 189, 248, 0.35);
  background: color-mix(in srgb, var(--live-call-accent) 12%, var(--live-call-surface));
  color: var(--live-call-accent);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  padding: 6px 12px;
  border-radius: 999px;
  cursor: pointer;
}

.live-call-workspace__edit-brief:active:not(:disabled) {
  transform: scale(0.98);
}

.live-call-workspace__edit-brief:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.live-call-workspace__card--brief-edit {
  padding: clamp(14px, 3vw, 18px);
}

.live-call-workspace .pfm-brief-edit {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 0;
}

.live-call-workspace .pfm-brief-edit-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.live-call-workspace .pfm-brief-edit-btn {
  appearance: none;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 700;
  padding: 9px 14px;
  cursor: pointer;
  font-family: inherit;
}

.live-call-workspace .pfm-brief-edit-btn--primary {
  border: none;
  background: var(--live-call-accent);
  color: #0c1222;
}

.live-call-workspace .pfm-brief-edit-btn--secondary {
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: var(--live-call-surface-raised);
  color: var(--live-call-text);
}

.live-call-workspace .pfm-brief-edit-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

@media (max-width: 480px) {
  .live-call-workspace .pfm-brief-edit-toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .live-call-workspace .pfm-brief-edit-btn {
    width: 100%;
    min-height: 44px;
    font-size: 13px;
  }

  .live-call-workspace .pfm-brief-edit-btn--primary {
    order: 2;
  }

  .live-call-workspace .pfm-brief-edit-btn--secondary {
    order: 1;
  }

  .live-call-workspace .pfm-brief-edit-field textarea {
    font-size: 16px;
    min-height: 44px;
  }
}

.live-call-workspace .pfm-brief-edit-section-title {
  margin: 0 0 8px;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--live-call-muted);
}

.live-call-workspace .pfm-brief-edit-goal-input {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 10px;
  padding: 10px 12px;
  font: inherit;
  font-size: 14px;
  line-height: 1.4;
  resize: vertical;
  min-height: 4.5rem;
  background: var(--live-call-surface-raised);
  color: var(--live-call-text);
}

.live-call-workspace .pfm-brief-edit-queue {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0;
}

.live-call-workspace .pfm-brief-edit-queue-item {
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr) auto;
  gap: 0 6px;
  align-items: start;
  padding: 8px 0;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.live-call-workspace .pfm-brief-edit-queue-item:first-child,
.live-call-workspace .pfm-brief-edit-queue-item--primary {
  border-top: none;
}

.live-call-workspace .pfm-brief-edit-queue-item--primary {
  border-left: 3px solid color-mix(in srgb, var(--live-call-accent) 55%, transparent);
  padding-left: 6px;
  margin-left: -6px;
}

.live-call-workspace .pfm-brief-edit-queue-main {
  min-width: 0;
}

.live-call-workspace .pfm-brief-edit-primary-badge {
  display: inline-flex;
  align-items: center;
  min-height: 18px;
  padding: 0 6px;
  border-radius: 999px;
  font-size: 8px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--live-call-accent);
  background: color-mix(in srgb, var(--live-call-accent) 14%, var(--live-call-surface));
  border: 1px solid rgba(56, 189, 248, 0.3);
}

.live-call-workspace .pfm-brief-edit-set-primary {
  appearance: none;
  border: none;
  background: transparent;
  padding: 4px 6px;
  font-size: 10px;
  font-weight: 700;
  font-family: inherit;
  color: var(--live-call-accent);
  cursor: pointer;
  white-space: nowrap;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.live-call-workspace .pfm-brief-edit-set-primary:hover:not(:disabled) {
  color: #7dd3fc;
}

.live-call-workspace .pfm-brief-edit-set-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.live-call-workspace .pfm-brief-edit-queue-item--dragging {
  opacity: 0.55;
}

.live-call-workspace .pfm-brief-edit-drag {
  appearance: none;
  border: none;
  background: transparent;
  color: var(--live-call-muted);
  cursor: grab;
  padding: 2px 0;
  font-size: 14px;
  line-height: 1;
}

.live-call-workspace .pfm-brief-edit-queue-text {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.38;
  padding-top: 1px;
  color: var(--live-call-text);
}

.live-call-workspace .pfm-brief-edit-queue-placeholder {
  color: var(--live-call-muted);
  font-weight: 500;
}

.live-call-workspace .pfm-brief-edit-queue-actions {
  display: flex;
  gap: 2px;
}

.live-call-workspace .pfm-brief-edit-icon-btn {
  appearance: none;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--live-call-muted);
  font-size: 14px;
  cursor: pointer;
}

.live-call-workspace .pfm-brief-edit-icon-btn--danger {
  font-size: 18px;
  line-height: 1;
}

.live-call-workspace .pfm-brief-edit-icon-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.06);
  color: var(--live-call-text);
}

.live-call-workspace .pfm-brief-edit-add {
  appearance: none;
  margin-top: 10px;
  border: 1px dashed rgba(56, 189, 248, 0.4);
  background: color-mix(in srgb, var(--live-call-accent) 8%, var(--live-call-surface));
  color: var(--live-call-accent);
  font-size: 12px;
  font-weight: 700;
  padding: 10px 12px;
  border-radius: 10px;
  width: 100%;
  cursor: pointer;
  text-align: left;
  font-family: inherit;
}

.live-call-workspace .pfm-brief-edit-queue-empty {
  margin: 0 0 8px;
  font-size: 12px;
  color: var(--live-call-muted);
}

.live-call-page .pfm-today-sheet-backdrop {
  position: fixed;
  inset: 0;
  z-index: 90;
  background: color-mix(in srgb, #000 55%, transparent);
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.live-call-page .pfm-today-sheet {
  width: 100%;
  max-width: 520px;
  max-height: 70dvh;
  overflow: auto;
  border-radius: 16px 16px 0 0;
  padding: 14px 14px calc(14px + env(safe-area-inset-bottom, 0px));
  background: var(--live-call-surface);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 -8px 32px rgba(0, 0, 0, 0.45);
  color: var(--live-call-text);
}

.live-call-page .pfm-today-sheet-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
}

.live-call-page .pfm-today-sheet-head h2 {
  margin: 0;
  font-size: 15px;
  font-weight: 900;
}

.live-call-page .pfm-today-sheet-close {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: var(--live-call-surface-raised);
  color: var(--live-call-text);
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
}

.live-call-page .pfm-today-sheet-field {
  display: grid;
  gap: 6px;
}

.live-call-page .pfm-today-sheet-field > span {
  font-size: 11px;
  font-weight: 800;
  color: var(--live-call-muted);
}

.live-call-page .pfm-today-sheet-field textarea {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
  min-height: 88px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  font-size: 16px;
  font-family: inherit;
  line-height: 1.4;
  resize: vertical;
  background: var(--live-call-surface-raised);
  color: var(--live-call-text);
}

.live-call-page .pfm-today-sheet-actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

.live-call-page .pfm-today-sheet-actions button {
  flex: 1;
  min-height: 42px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 800;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: var(--live-call-surface-raised);
  color: var(--live-call-text);
  cursor: pointer;
  font-family: inherit;
}

.live-call-page .pfm-today-sheet-actions button.primary {
  background: var(--live-call-accent);
  color: #0c1222;
  border-color: var(--live-call-accent);
}

.live-call-page .pfm-today-sheet-actions button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

@media (max-width: 480px) {
  .live-call-page .pfm-today-sheet-actions {
    flex-direction: column;
  }

  .live-call-page .pfm-today-sheet-actions button {
    width: 100%;
    min-height: 44px;
  }

  .live-call-page .pfm-today-sheet-actions button.primary {
    order: 2;
  }

  .live-call-workspace .pfm-brief-edit-queue-item {
    grid-template-columns: 24px minmax(0, 1fr);
    gap: 6px;
  }

  .live-call-workspace .pfm-brief-edit-set-primary {
    grid-column: 1 / -1;
    justify-self: start;
    min-height: 32px;
  }
}
`;
