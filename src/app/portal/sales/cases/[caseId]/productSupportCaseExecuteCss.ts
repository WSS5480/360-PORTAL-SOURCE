export const productSupportCaseExecuteCss = `
.case-ps-execute {
  display: grid;
  gap: 14px;
  min-width: 0;
  max-width: 640px;
}

.case-ps-execute-section.case-ps-detail-card {
  padding: 10px 12px;
}

.case-ps-execute-intro {
  margin: 0 0 10px;
  font-size: 12px;
  font-weight: 650;
  line-height: 1.4;
  color: color-mix(in srgb, var(--foreground) 55%, var(--muted));
}

.case-ps-execute-product-row {
  display: grid;
  gap: 8px;
  padding: 10px 0;
  border-bottom: 1px solid color-mix(in srgb, var(--foreground) 5%, var(--border));
}

.case-ps-execute-product-row:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.case-ps-execute-product-name {
  margin: 0;
  font-size: 14px;
  font-weight: 800;
  line-height: 1.35;
}

.case-ps-execute-product-meta {
  margin: 0;
  font-size: 12px;
  font-weight: 650;
  color: var(--muted);
}

.case-ps-execute-field-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.case-ps-execute-field {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.case-ps-execute-field-label {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--muted);
}

.case-ps-execute-field-input {
  width: 100%;
  min-height: 40px;
  box-sizing: border-box;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--foreground) 12%, var(--border));
  background: #fff;
  font-size: 14px;
  font-family: inherit;
  color: var(--foreground);
}

.case-ps-execute-field-input:focus {
  outline: none;
  border-color: color-mix(in srgb, var(--brand-600) 40%, var(--border));
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--brand-600) 12%, transparent);
}

.case-ps-execute-outcome-grid {
  display: grid;
  gap: 8px;
}

.case-ps-execute-outcome-btn {
  width: 100%;
  min-height: 44px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--foreground) 12%, var(--border));
  background: #fff;
  font-size: 14px;
  font-weight: 750;
  text-align: left;
  cursor: pointer;
  font-family: inherit;
  touch-action: manipulation;
}

.case-ps-execute-outcome-btn[aria-pressed="true"] {
  border-color: color-mix(in srgb, var(--brand-600) 32%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 8%, #fff);
  color: var(--brand-700, var(--brand-600));
}

.case-ps-execute-outcome-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.case-ps-execute-dictate-btn {
  width: 100%;
  min-height: 56px;
  padding: 14px 16px;
  border-radius: 10px;
  border: none;
  background: var(--brand-600);
  color: #fff;
  font-size: 16px;
  font-weight: 800;
  cursor: pointer;
  font-family: inherit;
  touch-action: manipulation;
}

.case-ps-execute-dictate-btn--active {
  background: color-mix(in srgb, var(--brand-600) 88%, #000);
  animation: case-ps-pulse 1.4s ease-in-out infinite;
}

@keyframes case-ps-pulse {
  0%, 100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--brand-600) 40%, transparent); }
  50% { box-shadow: 0 0 0 6px color-mix(in srgb, var(--brand-600) 0%, transparent); }
}

.case-ps-execute-dictate-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.case-ps-execute-live {
  margin-top: 8px;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--brand-600) 20%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 5%, #fff);
}

.case-ps-execute-live-text {
  margin: 0;
  font-size: 15px;
  font-weight: 650;
  line-height: 1.45;
}

.case-ps-execute-doc-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.case-ps-execute-doc-btn {
  min-height: 44px;
  padding: 8px 10px;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--foreground) 12%, var(--border));
  background: #fff;
  font-size: 12px;
  font-weight: 750;
  line-height: 1.3;
  cursor: pointer;
  font-family: inherit;
  touch-action: manipulation;
}

.case-ps-execute-doc-btn[data-uploaded="true"] {
  border-color: color-mix(in srgb, #059669 24%, var(--border));
  background: color-mix(in srgb, #059669 6%, #fff);
  color: #047857;
}

.case-ps-execute-doc-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.case-ps-execute-complete-btn {
  width: 100%;
  min-height: 48px;
  padding: 12px 16px;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--brand-600) 28%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 8%, #fff);
  color: var(--brand-700, var(--brand-600));
  font-size: 14px;
  font-weight: 800;
  cursor: pointer;
  font-family: inherit;
  touch-action: manipulation;
}

.case-ps-execute-complete-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.case-ps-execute-error {
  margin: 8px 0 0;
  font-size: 12px;
  font-weight: 700;
  color: var(--danger);
}

.case-ps-execute-hint {
  margin: 8px 0 0;
  font-size: 11px;
  font-weight: 650;
  line-height: 1.35;
  color: color-mix(in srgb, var(--foreground) 50%, var(--muted));
}

@media (max-width: 480px) {
  .case-ps-execute-doc-grid {
    grid-template-columns: 1fr;
  }
}
`;
