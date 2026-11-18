/** Field intelligence processing — shared loading presentation */
export const fieldIntelligenceProcessingCss = `
.fip {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 20px 14px 24px;
  min-width: 0;
}

.fip--embedded {
  padding: 16px 4px 8px;
}

.fip-head {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  min-width: 0;
}

.fip-spinner {
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  margin-top: 2px;
  border-radius: 50%;
  border: 2px solid color-mix(in srgb, var(--brand-600) 18%, var(--border));
  border-top-color: var(--brand-600);
  animation: fip-spin 0.85s linear infinite;
}

@keyframes fip-spin {
  to {
    transform: rotate(360deg);
  }
}

.fip-copy {
  flex: 1;
  min-width: 0;
}

.fip-title {
  margin: 0;
  font-size: 14px;
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1.25;
  color: var(--foreground);
}

.fip-subtitle {
  margin: 4px 0 0;
  font-size: 12px;
  line-height: 1.4;
  color: var(--muted);
}

.fip-context {
  margin: 0;
  padding: 6px 9px;
  border-radius: 7px;
  font-size: 11px;
  font-weight: 600;
  line-height: 1.35;
  color: color-mix(in srgb, var(--foreground) 72%, transparent);
  background: color-mix(in srgb, var(--foreground) 3%, var(--surface));
  border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
}

.fip-rotating {
  margin: 0;
  font-size: 11px;
  font-weight: 700;
  line-height: 1.35;
  color: var(--brand-700);
  min-height: 1.35em;
  transition: opacity 0.18s ease;
}

.fip-steps {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 6px;
}

.fip-step {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  line-height: 1.3;
  color: color-mix(in srgb, var(--foreground) 55%, transparent);
}

.fip-step--active {
  color: var(--foreground);
  font-weight: 700;
}

.fip-step--done {
  color: color-mix(in srgb, var(--foreground) 68%, transparent);
}

.fip-step-marker {
  flex-shrink: 0;
  width: 14px;
  height: 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 800;
  line-height: 1;
}

.fip-step-marker--pending {
  width: 8px;
  height: 8px;
  margin: 3px;
  border-radius: 50%;
  border: 1px solid color-mix(in srgb, var(--foreground) 22%, var(--border));
  background: transparent;
}

.fip-step-marker--active {
  width: 8px;
  height: 8px;
  margin: 3px;
  border-radius: 50%;
  background: var(--brand-600);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--brand-600) 18%, transparent);
  animation: fip-pulse 1.4s ease-in-out infinite;
}

@keyframes fip-pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.55;
  }
}

.fip-step-marker--done {
  color: #15803d;
}
`;
