export const credentialingPlatformPickerCss = `
.cred-platform-picker {
  position: relative;
  grid-column: 1 / -1;
}

.cred-platform-label {
  display: block;
  font-size: 11px;
  font-weight: 700;
  color: #334155;
}

.cred-platform-helper {
  margin: 4px 0 6px;
  font-size: 11px;
  font-weight: 600;
  line-height: 1.35;
  color: #64748b;
}

.cred-platform-input {
  display: block;
  width: 100%;
  padding: 7px 9px;
  border-radius: 8px;
  border: 1px solid #cbd5e1;
  background: #fff;
  font-size: 12px;
  font-weight: 650;
  color: #0f172a;
  font-family: inherit;
}

.cred-platform-input:focus {
  outline: 2px solid color-mix(in srgb, var(--brand-600, #2563eb) 35%, transparent);
  border-color: var(--brand-600, #2563eb);
}

.cred-platform-dropdown {
  position: absolute;
  z-index: 20;
  left: 0;
  right: 0;
  margin-top: 4px;
  border-radius: 8px;
  border: 1px solid #cbd5e1;
  background: #fff;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.12);
  overflow: hidden;
}

.cred-platform-list {
  margin: 0;
  padding: 4px;
  list-style: none;
  max-height: 160px;
  overflow: auto;
}

.cred-platform-option {
  display: block;
  width: 100%;
  padding: 7px 8px;
  border: none;
  border-radius: 6px;
  background: transparent;
  text-align: left;
  font-size: 12px;
  font-weight: 650;
  color: #0f172a;
  cursor: pointer;
  font-family: inherit;
}

.cred-platform-option:hover,
.cred-platform-option--selected {
  background: color-mix(in srgb, var(--brand-600, #2563eb) 8%, #f8fafc);
}

.cred-platform-option--create {
  color: #1d4ed8;
  font-weight: 800;
}

.cred-platform-actions {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 4px;
  border-top: 1px solid #e2e8f0;
  background: #f8fafc;
}

.cred-platform-empty {
  margin: 0;
  padding: 8px;
  font-size: 11px;
  font-weight: 600;
  color: #64748b;
}

.cred-platform-error {
  margin: 4px 0 0;
  font-size: 11px;
  font-weight: 600;
  color: #b91c1c;
}

.cred-platform-create-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
}

.cred-platform-create-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.cred-platform-create-field span {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  color: #475569;
}

.cred-platform-create-field input,
.cred-platform-create-field textarea {
  width: 100%;
  padding: 7px 9px;
  border-radius: 8px;
  border: 1px solid #cbd5e1;
  background: #fff;
  font-size: 12px;
  font-weight: 650;
  color: #0f172a;
  font-family: inherit;
}

.cred-platform-create-field textarea {
  resize: vertical;
  min-height: 52px;
}

.cred-platform-create-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.cred-platform-create-btn {
  padding: 6px 10px;
  border-radius: 8px;
  border: 1px solid #cbd5e1;
  background: #fff;
  font-size: 11px;
  font-weight: 800;
  color: #334155;
  cursor: pointer;
  font-family: inherit;
}

.cred-platform-create-btn--primary {
  border-color: var(--brand-600, #2563eb);
  background: var(--brand-600, #2563eb);
  color: #fff;
}

.cred-platform-create-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
`;
