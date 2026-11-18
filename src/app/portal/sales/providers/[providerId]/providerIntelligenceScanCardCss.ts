export const providerIntelligenceScanCardCss = `
.provider-intel-scan-card {
  display: grid;
  gap: 8px;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));
  background: var(--surface);
}

.provider-intel-scan-card--operationally_ready,
.provider-intel-scan-card--confirmed {
  border-color: color-mix(in srgb, var(--success, #22c55e) 28%, var(--border));
}

.provider-intel-scan-card--partial {
  border-color: color-mix(in srgb, #ca8a04 28%, var(--border));
}

.provider-intel-scan-card--unmapped {
  border-color: color-mix(in srgb, #dc2626 24%, var(--border));
}

.provider-intel-scan-card--not_started {
  border-color: color-mix(in srgb, var(--foreground) 12%, var(--border));
  background: color-mix(in srgb, var(--foreground) 2%, var(--surface));
}

.provider-intel-scan-card--live-pulse {
  animation: provider-intel-scan-pulse 0.85s ease-out;
}

@keyframes provider-intel-scan-pulse {
  0% {
    box-shadow: 0 0 0 0 color-mix(in srgb, var(--brand-600, #2563eb) 45%, transparent);
    transform: scale(1);
  }
  35% {
    box-shadow: 0 0 0 6px color-mix(in srgb, var(--brand-600, #2563eb) 8%, transparent);
    transform: scale(1.008);
  }
  100% {
    box-shadow: none;
    transform: scale(1);
  }
}

.provider-intel-scan-card-tap {
  display: grid;
  gap: 8px;
  width: 100%;
  margin: 0;
  padding: 0;
  border: none;
  background: none;
  text-align: left;
  cursor: pointer;
  color: inherit;
  font: inherit;
}

.provider-intel-scan-card-tap:disabled {
  cursor: not-allowed;
  opacity: 0.65;
}

.provider-intel-scan-card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}

.provider-intel-scan-card-title {
  margin: 0;
  font-size: 15px;
  font-weight: 800;
  line-height: 1.25;
  letter-spacing: -0.02em;
}

.provider-intel-scan-card-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.provider-intel-scan-pill {
  display: inline-flex;
  align-items: center;
  padding: 3px 8px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.02em;
  border: 1px solid transparent;
}

.provider-intel-scan-pill--confirmed {
  color: #166534;
  background: color-mix(in srgb, var(--success, #22c55e) 12%, var(--surface));
  border-color: color-mix(in srgb, var(--success, #22c55e) 30%, var(--border));
}

.provider-intel-scan-pill--open {
  color: #9a3412;
  background: color-mix(in srgb, #fb923c 14%, var(--surface));
  border-color: color-mix(in srgb, #ea580c 28%, var(--border));
}

.provider-intel-scan-card-summary {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.35;
  color: color-mix(in srgb, var(--foreground) 82%, var(--muted));
}

.provider-intel-scan-card-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 10px;
}

.provider-intel-scan-card-primary {
  padding: 8px 12px;
  border-radius: 8px;
  border: none;
  background: var(--brand-600, #2563eb);
  color: #fff;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
}

.provider-intel-scan-card-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.provider-intel-scan-card-details {
  padding: 0;
  border: none;
  background: none;
  font-size: 12px;
  font-weight: 700;
  color: var(--brand-600, #2563eb);
  text-decoration: underline;
  text-underline-offset: 2px;
  cursor: pointer;
}

.provider-intel-scan-card-details:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.provider-intel-detail-overlay {
  position: fixed;
  inset: 0;
  z-index: 74;
  background: color-mix(in srgb, var(--foreground) 38%, transparent);
  display: flex;
  justify-content: flex-end;
  align-items: stretch;
}

.provider-intel-detail-drawer {
  background: var(--surface);
  border-left: 1px solid var(--border);
  width: min(480px, 100vw);
  max-height: 100dvh;
  display: grid;
  grid-template-rows: auto 1fr auto;
  box-shadow: -8px 0 32px color-mix(in srgb, var(--foreground) 14%, transparent);
  animation: provider-intel-detail-in 0.2s ease-out;
}

@keyframes provider-intel-detail-in {
  from { transform: translateX(100%); opacity: 0.65; }
  to { transform: translateX(0); opacity: 1; }
}

.provider-intel-detail-head {
  padding: 14px 14px 10px;
  border-bottom: 1px solid var(--border);
  display: grid;
  gap: 8px;
}

.provider-intel-detail-head-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.provider-intel-detail-title {
  margin: 0;
  font-size: 16px;
  font-weight: 800;
  line-height: 1.25;
}

.provider-intel-detail-close {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--surface);
  font-size: 18px;
  cursor: pointer;
  color: var(--muted);
}

.provider-intel-detail-body {
  overflow-y: auto;
  padding: 12px 14px;
  display: grid;
  gap: 14px;
  min-height: 0;
}

.provider-intel-detail-block {
  display: grid;
  gap: 6px;
}

.provider-intel-detail-kicker {
  margin: 0;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--muted);
}

.provider-intel-detail-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 6px;
  font-size: 13px;
  line-height: 1.4;
}

.provider-intel-detail-list li {
  padding: 8px 10px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--foreground) 3%, var(--surface));
  border: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
}

.provider-intel-detail-gap-btn {
  width: 100%;
  text-align: left;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
  background: var(--surface);
  font-size: 13px;
  font-weight: 600;
  line-height: 1.35;
  cursor: pointer;
}

.provider-intel-detail-empty {
  margin: 0;
  font-size: 13px;
  line-height: 1.4;
  color: var(--muted);
  font-style: italic;
}

.provider-intel-detail-note {
  margin: 0;
  font-size: 13px;
  line-height: 1.4;
  color: color-mix(in srgb, var(--foreground) 78%, var(--muted));
}

.provider-intel-detail-next {
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  line-height: 1.4;
}

.provider-intel-detail-foot {
  padding: 10px 14px calc(10px + env(safe-area-inset-bottom, 0px));
  border-top: 1px solid var(--border);
  display: grid;
  gap: 8px;
  background: var(--surface);
}

.provider-intel-detail-foot-primary {
  padding: 10px 12px;
  border-radius: 8px;
  border: none;
  background: var(--brand-600, #2563eb);
  color: #fff;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
}

.provider-intel-detail-foot-secondary {
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--surface);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}

@media (max-width: 420px) {
  .provider-intel-scan-card {
    padding: 10px 12px;
    gap: 6px;
  }
  .provider-intel-scan-card-title {
    font-size: 14px;
  }
  .provider-intel-scan-card-summary {
    font-size: 12px;
  }
}
`;
