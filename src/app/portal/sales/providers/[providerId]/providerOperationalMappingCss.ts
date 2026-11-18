export const providerOperationalMappingCss = `
.provider-intel-mapping-overlay {
  position: fixed;
  inset: 0;
  z-index: 72;
  background: color-mix(in srgb, var(--foreground) 38%, transparent);
  display: flex;
  justify-content: flex-end;
  align-items: stretch;
}

.provider-intel-mapping-drawer {
  background: var(--surface);
  border-left: 1px solid var(--border);
  width: min(480px, 100vw);
  max-height: 100dvh;
  display: grid;
  grid-template-rows: auto 1fr auto;
  box-shadow: -8px 0 32px color-mix(in srgb, var(--foreground) 14%, transparent);
  animation: provider-intel-mapping-in 0.2s ease-out;
}

@keyframes provider-intel-mapping-in {
  from { transform: translateX(100%); opacity: 0.65; }
  to { transform: translateX(0); opacity: 1; }
}

.provider-intel-mapping-head {
  padding: 14px 14px 10px;
  border-bottom: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
  display: grid;
  gap: 8px;
}

.provider-intel-mapping-head-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.provider-intel-mapping-title {
  margin: 0;
  font-size: 16px;
  font-weight: 800;
  line-height: 1.25;
}

.provider-intel-mapping-close {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));
  background: var(--surface);
  font-size: 18px;
  cursor: pointer;
  color: var(--muted);
}

.provider-intel-mapping-progress-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}

.provider-intel-mapping-badge {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  padding: 3px 8px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));
}

.provider-intel-mapping-badge--unknown { background: color-mix(in srgb, var(--muted) 12%, transparent); }
.provider-intel-mapping-badge--partial { background: color-mix(in srgb, #d97706 14%, transparent); }
.provider-intel-mapping-badge--confirmed { background: color-mix(in srgb, #2563eb 12%, transparent); }
.provider-intel-mapping-badge--validated { background: color-mix(in srgb, #059669 12%, transparent); }

.provider-intel-mapping-progress-chip {
  font-size: 11px;
  font-weight: 600;
  color: var(--muted);
}

.provider-intel-mapping-body {
  overflow-y: auto;
  padding: 12px 14px 16px;
  display: grid;
  gap: 14px;
}

.provider-intel-mapping-block {
  display: grid;
  gap: 6px;
}

.provider-intel-mapping-block-label {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--muted);
}

.provider-intel-mapping-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 6px;
}

.provider-intel-mapping-list li {
  font-size: 13px;
  line-height: 1.4;
}

.provider-intel-mapping-empty {
  margin: 0;
  font-size: 13px;
  color: var(--muted);
  font-style: italic;
}

.provider-intel-mapping-unresolved-btn {
  text-align: left;
  width: 100%;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
  background: var(--surface);
  font-size: 13px;
  cursor: pointer;
}

.provider-intel-mapping-unresolved-btn--active {
  border-color: color-mix(in srgb, var(--brand-600) 40%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 6%, var(--surface));
}

.provider-intel-mapping-active {
  border: 1px solid color-mix(in srgb, var(--brand-600) 22%, var(--border));
  border-radius: 10px;
  padding: 12px;
  display: grid;
  gap: 10px;
  background: color-mix(in srgb, var(--brand-600) 4%, var(--surface));
}

.provider-intel-mapping-prompt {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  line-height: 1.35;
}

.provider-intel-mapping-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}

.provider-intel-mapping-action {
  font-size: 12px;
  font-weight: 700;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));
  background: var(--surface);
  cursor: pointer;
}

.provider-intel-mapping-action--primary {
  grid-column: 1 / -1;
  background: color-mix(in srgb, var(--brand-600) 12%, var(--surface));
  border-color: color-mix(in srgb, var(--brand-600) 35%, var(--border));
}

.provider-intel-mapping-foot {
  padding: 10px 14px 14px;
  border-top: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.provider-intel-mapping-foot-btn {
  font-size: 13px;
  font-weight: 700;
  padding: 9px 14px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));
  background: var(--surface);
  cursor: pointer;
}

.provider-intel-mapping-foot-btn--primary {
  background: var(--brand-600, #2563eb);
  color: #fff;
  border-color: transparent;
}

@media (max-width: 640px) {
  .provider-intel-mapping-overlay {
    align-items: flex-end;
  }
  .provider-intel-mapping-drawer {
    width: 100%;
    max-height: 92dvh;
    border-left: none;
    border-top: 1px solid var(--border);
    border-radius: 14px 14px 0 0;
    animation-name: provider-intel-mapping-up;
  }
  @keyframes provider-intel-mapping-up {
    from { transform: translateY(100%); }
    to { transform: translateY(0); }
  }
}
`;
