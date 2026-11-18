/** Compact new/edit contact modal (org detail, new case). */

export const contactFormModalCss = `
.contact-modal-panel {
  width: min(540px, 100%);
  max-height: min(88dvh, 720px);
  overflow: auto;
  -webkit-overflow-scrolling: touch;
  padding: 14px 16px 12px;
  border-radius: 14px;
  background: var(--crm-surface-elevated, var(--surface));
  border: 1px solid color-mix(in srgb, var(--crm-cyan-bright, #22d3ee) 18%, var(--border));
  box-shadow: 0 20px 44px color-mix(in srgb, var(--crm-navy, #0c1929) 16%, transparent);
  box-sizing: border-box;
}

.contact-modal-panel--sheet {
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  max-height: min(86dvh, 720px);
  padding: 12px 14px calc(10px + env(safe-area-inset-bottom, 0px));
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 0;
}

.contact-modal-title {
  margin: 0 0 8px;
  font-size: 15px;
  font-weight: 900;
  line-height: 1.2;
}

.contact-modal-mode-tabs {
  display: flex;
  gap: 6px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}

.contact-modal-mode-tabs button {
  min-height: 44px !important;
  padding: 8px 12px !important;
  font-size: 12px !important;
}

.contact-modal-body {
  display: grid;
  gap: 6px;
}

.contact-modal-grid {
  display: grid;
  gap: 6px;
}

.contact-modal-grid--2 {
  grid-template-columns: 1fr 1fr;
}

.contact-modal-field {
  display: grid;
  gap: 3px;
  font-size: 12px;
  font-weight: 700;
  margin: 0;
}

.contact-modal-field input,
.contact-modal-field select,
.contact-modal-field textarea {
  width: 100%;
  box-sizing: border-box;
  padding: 7px 10px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));
  font-size: 13px;
  background: var(--surface);
  color: var(--foreground);
  min-height: 34px;
}

.contact-modal-field textarea {
  min-height: 56px;
  resize: vertical;
  line-height: 1.35;
}

.contact-modal-field-hint {
  font-size: 11px;
  font-weight: 600;
  color: var(--muted);
  line-height: 1.35;
}

.contact-modal-check {
  display: flex;
  gap: 6px;
  align-items: center;
  font-size: 12px;
  font-weight: 700;
  margin: 0;
}

.contact-modal-check input {
  margin: 0;
}

.contact-modal-err {
  color: var(--danger);
  margin-bottom: 6px;
  font-size: 12px;
  line-height: 1.35;
}

.contact-modal-existing-list {
  max-height: 200px;
  overflow: auto;
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 6px;
  display: grid;
  gap: 4px;
}

.contact-modal-existing-item {
  text-align: left;
  border: 1px solid var(--border);
  border-radius: 7px;
  padding: 6px 8px;
  background: var(--surface);
  cursor: pointer;
}

.contact-modal-existing-item-title {
  font-weight: 800;
  font-size: 12px;
}

.contact-modal-existing-item-meta {
  font-size: 10px;
  color: var(--muted);
}

.contact-modal-dup {
  margin-bottom: 6px;
  border: 1px solid color-mix(in srgb, var(--warning) 40%, var(--border));
  border-radius: 8px;
  padding: 8px;
  background: color-mix(in srgb, var(--warning) 8%, var(--surface));
  font-size: 11px;
}

.contact-modal-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
}

.contact-modal-actions--stack {
  flex-direction: column-reverse;
}

.contact-modal-actions--stack button {
  width: 100%;
}

.contact-modal-actions button {
  min-height: 44px !important;
  padding: 7px 12px !important;
  font-size: 13px !important;
}

@media (max-width: 640px) {
  .contact-modal-grid--2 {
    grid-template-columns: 1fr;
  }
}
`;
