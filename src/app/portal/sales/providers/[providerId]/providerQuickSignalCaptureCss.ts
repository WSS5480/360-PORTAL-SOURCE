export const providerQuickSignalCaptureCss = `
.provider-intel-quick-signal-overlay {
  position: fixed;
  inset: 0;
  z-index: 70;
  background: color-mix(in srgb, var(--foreground) 38%, transparent);
  display: flex;
  justify-content: flex-end;
  align-items: stretch;
  padding: 0;
}

.provider-intel-quick-signal-drawer {
  background: var(--surface);
  border-left: 1px solid var(--border);
  width: min(440px, 100vw);
  height: 100dvh;
  max-height: 100dvh;
  min-height: 0;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  box-shadow: -8px 0 32px color-mix(in srgb, var(--foreground) 14%, transparent);
  animation: provider-intel-quick-signal-in 0.2s ease-out;
}

@keyframes provider-intel-quick-signal-in {
  from {
    transform: translateX(100%);
    opacity: 0.65;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.provider-intel-quick-signal-head {
  padding: 14px 14px 10px;
  border-bottom: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
  display: grid;
  gap: 6px;
}

.provider-intel-quick-signal-head-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.provider-intel-quick-signal-title {
  margin: 0;
  font-size: 15px;
  font-weight: 800;
  line-height: 1.25;
  color: var(--foreground);
}

.provider-intel-quick-signal-close {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));
  background: var(--surface);
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
  color: var(--muted);
}

.provider-intel-quick-signal-close:hover {
  color: var(--foreground);
  border-color: color-mix(in srgb, var(--brand-600) 24%, var(--border));
}

.provider-intel-quick-signal-kicker {
  margin: 0;
  font-size: 10px;
  font-weight: 700;
  color: var(--muted);
  line-height: 1.3;
}

.provider-intel-quick-signal-body {
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  padding: 12px 14px 16px;
  display: grid;
  gap: 10px;
  align-content: start;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
}

.provider-intel-quick-signal-helper {
  margin: 0;
  font-size: 11px;
  line-height: 1.4;
  color: var(--muted);
  font-weight: 600;
}

.provider-intel-quick-signal-field {
  display: grid;
  gap: 8px;
}

.provider-intel-quick-signal-field-label {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--muted);
}

.provider-intel-quick-signal-foot {
  padding: 12px 14px max(14px, env(safe-area-inset-bottom, 0px));
  border-top: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
}

.provider-intel-quick-signal-foot .provider-intel-quick-signal-save {
  min-height: 40px;
  padding: 8px 16px;
  border-radius: 8px;
  border: none;
  background: var(--brand-600);
  color: #fff;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
}

.provider-intel-quick-signal-foot .provider-intel-quick-signal-save:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.provider-intel-quick-signal-foot .provider-intel-quick-signal-cancel {
  min-height: 40px;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));
  background: var(--surface);
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  color: var(--muted);
}

/* Discovery Mapping question drawer */
.provider-intel-quick-signal-drawer--mapping .provider-intel-quick-signal-body {
  gap: 12px;
}

.dmq-section-title {
  margin: 0;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--muted);
}

.dmq-state {
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--brand-600) 22%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 6%, #fff);
  display: grid;
  gap: 6px;
}

.dmq-state-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.dmq-status-chip {
  flex-shrink: 0;
  padding: 3px 8px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.03em;
  text-transform: uppercase;
}

.dmq-status-chip--unknown {
  background: color-mix(in srgb, var(--muted) 14%, #fff);
  color: var(--muted);
}

.dmq-status-chip--partial {
  background: color-mix(in srgb, #d97706 14%, #fff);
  color: #92400e;
}

.dmq-status-chip--likely {
  background: color-mix(in srgb, var(--brand-600) 12%, #fff);
  color: var(--brand-800, var(--brand-700));
}

.dmq-status-chip--validated,
.dmq-status-chip--confirmed {
  background: color-mix(in srgb, #16a34a 12%, #fff);
  color: #166534;
}

.dmq-state-summary {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.45;
  color: var(--foreground);
}

.dmq-evidence {
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
  background: #fff;
  display: grid;
  gap: 6px;
}

.dmq-evidence-quote {
  margin: 0;
  padding: 0;
  border: none;
  font-size: 12px;
  line-height: 1.45;
  font-weight: 500;
  color: color-mix(in srgb, var(--foreground) 88%, var(--muted));
}

.dmq-evidence-source {
  margin: 0;
  font-size: 11px;
  color: var(--muted);
  display: flex;
  gap: 6px;
  align-items: baseline;
}

.dmq-evidence-source-kicker {
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-size: 9px;
}

.dmq-workflow {
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--warning, #c9a227) 28%, var(--border));
  background: color-mix(in srgb, var(--warning, #c9a227) 6%, #fff);
}

.dmq-workflow-grid {
  margin: 0;
  display: grid;
  gap: 6px;
}

.dmq-workflow-grid div {
  display: grid;
  gap: 2px;
}

.dmq-workflow-grid dt {
  margin: 0;
  font-size: 9px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--muted);
}

.dmq-workflow-grid dd {
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  color: var(--foreground);
}

.dmq-question-text {
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  line-height: 1.4;
  color: var(--foreground);
}

.dmq-picks {
  display: grid;
  gap: 8px;
}

.dmq-why {
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
  background: color-mix(in srgb, var(--foreground) 2%, #fff);
}

.cred-drawer-discovered {
  margin-top: 12px;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
  background: color-mix(in srgb, var(--foreground) 2%, #f8fafc);
}

.cred-drawer-discovered-list {
  margin: 6px 0 0;
  padding-left: 16px;
  font-size: 12px;
  line-height: 1.4;
  color: var(--foreground);
}

.cred-drawer-discovered-source {
  margin: 6px 0 0;
  font-size: 11px;
  color: var(--muted);
}

.cred-drawer-status-grid {
  display: grid;
  gap: 6px;
}

.cred-drawer-status-option {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
  background: #fff;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.cred-drawer-status-option:has(input:checked) {
  border-color: color-mix(in srgb, var(--brand-600, #2563eb) 40%, var(--border));
  background: color-mix(in srgb, var(--brand-600, #2563eb) 8%, #fff);
}

.cred-drawer-input,
.cred-drawer-textarea {
  width: 100%;
  margin-top: 4px;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));
  font-size: 12px;
  line-height: 1.4;
  font-family: inherit;
}

.cred-drawer-textarea {
  resize: vertical;
  min-height: 72px;
}

.dmq-why-title {
  margin: 0 0 4px;
  font-size: 10px;
  font-weight: 700;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.dmq-why-text {
  margin: 0;
  font-size: 11px;
  line-height: 1.4;
  color: var(--muted);
  font-weight: 500;
}

@media (max-width: 640px) {

  .provider-intel-quick-signal-overlay {
    align-items: flex-end;
    justify-content: center;
  }

  .provider-intel-quick-signal-drawer {
    width: 100%;
    height: min(92dvh, 100%);
    max-height: min(92dvh, 100%);
    border-left: none;
    border-top: 1px solid var(--border);
    border-radius: 14px 14px 0 0;
    animation-name: provider-intel-quick-signal-up;
  }

  @keyframes provider-intel-quick-signal-up {
    from {
      transform: translateY(100%);
    }
    to {
      transform: translateY(0);
    }
  }
}

.provider-intel-quick-signal-desc {
  margin: 0;
  font-size: 11px;
  line-height: 1.45;
  color: var(--muted);
}

.provider-intel-quick-signal-error {
  margin: 0;
  padding: 8px 10px;
  border-radius: 8px;
  font-size: 12px;
  color: #b91c1c;
  background: color-mix(in srgb, #ef4444 8%, var(--surface));
  border: 1px solid color-mix(in srgb, #ef4444 24%, var(--border));
}

.optional-intel-drawer-body {
  display: grid;
  gap: 12px;
  align-content: start;
}

.optional-intel-drawer-categories {
  display: grid;
  gap: 6px;
}

.optional-intel-drawer-category {
  text-align: left;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
  background: var(--surface);
  font-size: 12px;
  font-weight: 600;
  color: var(--foreground);
  cursor: pointer;
  font-family: inherit;
}

.optional-intel-drawer-category--active {
  border-color: color-mix(in srgb, var(--brand-600, #2563eb) 40%, var(--border));
  background: color-mix(in srgb, var(--brand-600, #2563eb) 8%, var(--surface));
}

.optional-intel-drawer-field {
  display: grid;
  gap: 6px;
}

.optional-intel-drawer-field-label {
  font-size: 12px;
  font-weight: 800;
  color: var(--foreground);
}

.optional-intel-drawer-field-helper {
  font-size: 11px;
  line-height: 1.4;
  color: var(--muted);
}

.optional-intel-drawer-textarea {
  width: 100%;
  box-sizing: border-box;
  min-height: 120px;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));
  font-size: 13px;
  line-height: 1.45;
  font-family: inherit;
  resize: vertical;
}

.optional-intel-drawer-support-contact {
  display: grid;
  gap: 10px;
}

.optional-intel-drawer-support-contact-copy {
  margin: 0;
  font-size: 13px;
  line-height: 1.45;
  color: var(--muted);
}

.optional-intel-drawer-support-contact-list {
  margin: 0;
  padding-left: 18px;
  font-size: 13px;
  line-height: 1.4;
  color: var(--foreground);
}

.optional-intel-drawer-support-contact-btn {
  justify-self: start;
}

.provider-intel-gap-note-voice {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 10px;
  margin-bottom: 10px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
  background: color-mix(in srgb, var(--foreground) 2%, var(--surface));
}

.provider-intel-gap-note-mic {
  width: 40px;
  height: 40px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--foreground) 12%, var(--border));
  background: var(--surface);
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
}

.provider-intel-gap-note-mic--active {
  border-color: color-mix(in srgb, var(--brand-600) 40%, var(--border));
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--brand-600) 16%, transparent);
}

.provider-intel-gap-note-voice-meta {
  display: grid;
  gap: 2px;
  font-size: 12px;
  color: var(--muted);
  flex: 1;
  min-width: 120px;
}

.provider-intel-gap-note-voice-muted,
.provider-intel-gap-note-voice-captured {
  font-size: 11px;
}

.provider-intel-gap-note-voice-captured {
  color: color-mix(in srgb, var(--brand-600) 70%, var(--foreground));
}

.provider-intel-gap-note-voice-error,
.provider-intel-gap-note-error {
  color: #b91c1c;
}

.provider-intel-gap-note-voice-pause {
  border: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));
  background: var(--surface);
  border-radius: 8px;
  padding: 6px 10px;
  font-size: 12px;
  cursor: pointer;
}
`;
