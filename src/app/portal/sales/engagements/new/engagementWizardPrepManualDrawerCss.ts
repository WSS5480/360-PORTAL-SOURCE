export const engagementWizardPrepManualDrawerCss = `
.ew-prep-manual-overlay {
  position: fixed;
  inset: 0;
  z-index: 55;
  background: color-mix(in srgb, var(--foreground) 32%, transparent);
  display: flex;
  justify-content: flex-end;
  align-items: stretch;
}

.ew-prep-manual-drawer {
  background: var(--surface);
  border-left: 1px solid var(--border);
  width: min(440px, 100vw);
  max-height: 100dvh;
  display: grid;
  grid-template-rows: auto 1fr auto;
  box-shadow: -8px 0 28px color-mix(in srgb, var(--foreground) 10%, transparent);
  animation: ew-prep-manual-slide-in 0.2s ease-out;
}

@keyframes ew-prep-manual-slide-in {
  from {
    transform: translateX(100%);
    opacity: 0.65;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.ew-prep-manual-drawer-head {
  padding: 14px 16px 12px;
  border-bottom: 1px solid var(--border);
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 10px;
}

.ew-prep-manual-drawer-title {
  margin: 0;
  font-size: 16px;
  font-weight: 800;
  color: var(--text);
}

.ew-prep-manual-drawer-sub {
  margin: 4px 0 0;
  font-size: 11px;
  line-height: 1.4;
  color: var(--muted);
}

.ew-prep-manual-drawer-close {
  flex-shrink: 0;
  min-width: 40px;
  min-height: 40px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  font-size: 16px;
  cursor: pointer;
  color: var(--text);
}

.ew-prep-manual-drawer-close:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.ew-prep-manual-drawer-body {
  overflow: auto;
  padding: 12px 16px 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  -webkit-overflow-scrolling: touch;
}

.ew-prep-manual-drawer-foot {
  padding: 12px 16px max(14px, env(safe-area-inset-bottom, 0px));
  border-top: 1px solid var(--border);
  display: flex;
  justify-content: flex-end;
}

.ew-prep-manual-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.ew-prep-manual-field-label {
  font-size: 11px;
  font-weight: 700;
  color: var(--text);
}

.ew-prep-manual-field-hint {
  margin: 0;
  font-size: 10px;
  line-height: 1.35;
  color: var(--muted);
}

.ew-prep-manual-field textarea {
  width: 100%;
  min-height: 0;
  font-size: 12px;
  line-height: 1.45;
  border-radius: 8px;
  border: 1px solid var(--border);
  padding: 8px 10px;
  resize: vertical;
  font-family: inherit;
}

.ew-prep-manual-field textarea:focus {
  outline: 2px solid color-mix(in srgb, var(--brand-600) 35%, transparent);
  outline-offset: 1px;
}

.ew-prep-manual-trigger {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
  padding: 8px 12px;
  font-size: 11px;
  font-weight: 700;
  color: var(--brand-800);
  background: transparent;
  border: 1px dashed color-mix(in srgb, var(--brand-600) 35%, var(--border));
  border-radius: 8px;
  cursor: pointer;
}

.ew-prep-manual-trigger:hover:not(:disabled) {
  background: color-mix(in srgb, var(--brand-600) 6%, #fff);
}

.ew-prep-manual-trigger:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.ew-prep-manual-trigger-badge {
  font-size: 10px;
  font-weight: 600;
  color: var(--muted);
  padding: 2px 6px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--muted) 12%, #fff);
}

@media (max-width: 640px) {
  .ew-prep-manual-overlay {
    align-items: flex-end;
  }

  .ew-prep-manual-drawer {
    width: 100%;
    max-height: min(92dvh, 100%);
    border-left: none;
    border-radius: 12px 12px 0 0;
    animation: ew-prep-manual-slide-up 0.22s ease-out;
  }

  @keyframes ew-prep-manual-slide-up {
    from {
      transform: translateY(100%);
    }
    to {
      transform: translateY(0);
    }
  }
}
`;
