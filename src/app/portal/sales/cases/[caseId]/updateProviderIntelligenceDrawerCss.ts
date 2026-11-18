export const updateProviderIntelligenceDrawerCss = `
.provider-intel-promote-overlay {
  position: fixed;
  inset: 0;
  z-index: 60;
  background: color-mix(in srgb, var(--foreground) 35%, transparent);
  display: flex;
  justify-content: flex-end;
  align-items: stretch;
  padding: 0;
}

.provider-intel-promote-drawer {
  background: var(--surface);
  border-left: 1px solid var(--border);
  width: min(520px, 100vw);
  max-height: 100dvh;
  display: grid;
  grid-template-rows: auto 1fr auto;
  box-shadow: -8px 0 32px color-mix(in srgb, var(--foreground) 12%, transparent);
  animation: provider-intel-promote-slide-in 0.22s ease-out;
}

@keyframes provider-intel-promote-slide-in {
  from {
    transform: translateX(100%);
    opacity: 0.6;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.provider-intel-promote-drawer-head {
  padding: 16px 16px 12px;
  border-bottom: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.provider-intel-promote-drawer-body {
  overflow: auto;
  padding: 12px 16px 16px;
  display: grid;
  gap: 10px;
  -webkit-overflow-scrolling: touch;
}

.provider-intel-promote-drawer-foot {
  padding: 12px 16px max(16px, env(safe-area-inset-bottom, 0px));
  border-top: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
}

.provider-intel-promote-field {
  border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
  border-radius: 10px;
  padding: 12px;
  display: grid;
  gap: 8px;
  background: var(--surface);
}

.provider-intel-promote-field[data-status="accepted"] {
  border-color: color-mix(in srgb, var(--brand-600) 22%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 3%, var(--surface));
}

.provider-intel-promote-field[data-status="skipped"] {
  opacity: 0.72;
}

.provider-intel-promote-field-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.provider-intel-promote-field-actions button {
  min-height: 34px;
  font-size: 12px !important;
  padding: 6px 10px !important;
}

@media (max-width: 640px) {
  .provider-intel-promote-overlay {
    align-items: flex-end;
    justify-content: center;
  }

  .provider-intel-promote-drawer {
    width: 100%;
    max-height: min(94dvh, 100%);
    border-left: none;
    border-top: 1px solid var(--border);
    border-radius: 14px 14px 0 0;
    animation-name: provider-intel-promote-slide-up;
  }

  @keyframes provider-intel-promote-slide-up {
    from {
      transform: translateY(100%);
    }
    to {
      transform: translateY(0);
    }
  }
}
`;
