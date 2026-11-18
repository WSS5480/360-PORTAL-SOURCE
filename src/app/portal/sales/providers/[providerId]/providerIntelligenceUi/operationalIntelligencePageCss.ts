/** Operational Intelligence tab — page layout (uses pi-* primitives). */

export const operationalIntelligencePageCss = `
.oi-workspace.pi-root {
  --oi-max: 1060px;
  max-width: var(--oi-max);
  margin: 0 auto;
  padding: var(--pi-space-4) 0 var(--pi-space-7);
  display: flex;
  flex-direction: column;
  gap: 0;
  background: var(--pi-bg);
  border-radius: var(--pi-radius);
}

.oi-workspace-empty {
  margin: 0;
}

/* —— Hero (page-specific) —— */

.oi-hero-accent {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 5px;
  background: linear-gradient(
    180deg,
    var(--pi-primary) 0%,
    color-mix(in srgb, var(--pi-primary) 55%, #38bdf8) 100%
  );
  z-index: 2;
}

.oi-hero-glow {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--pi-primary) 14%, #fff) 0%,
    #fff 42%,
    color-mix(in srgb, #38bdf8 6%, #fff) 100%
  );
  pointer-events: none;
}

.oi-hero-inner {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: var(--pi-space-5);
  padding: var(--pi-space-6) var(--pi-space-6) var(--pi-space-5) calc(var(--pi-space-6) + 4px);
}

.oi-hero-copy {
  display: flex;
  flex-direction: column;
  gap: var(--pi-space-2);
  max-width: 56em;
}

.oi-hero-eyebrow {
  margin: 0;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--pi-primary-strong);
}

.oi-hero-title {
  margin: 0;
  font-size: 30px;
  font-weight: 800;
  letter-spacing: -0.035em;
  line-height: 1.12;
  color: var(--pi-neutral-heading);
}

.oi-hero-summary {
  margin: 0;
  font-size: 16px;
  font-weight: 500;
  line-height: 1.55;
  color: var(--pi-neutral-body);
}

.oi-hero-metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--pi-space-3);
  margin: 0;
  padding: 0;
  list-style: none;
}

.oi-hero-metric {
  display: flex;
  align-items: flex-start;
  gap: var(--pi-space-3);
  padding: var(--pi-space-4);
  border-radius: var(--pi-radius-sm);
  background: rgba(255, 255, 255, 0.82);
  border: 1px solid var(--pi-primary-border);
  box-shadow: var(--pi-shadow-sm);
}

.oi-hero-metric-icon {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 9px;
  font-size: 13px;
  font-weight: 900;
  line-height: 1;
}

.oi-hero-metric-icon--facility {
  color: #0f766e;
  background: #ccfbf1;
  border: 1px solid #5eead4;
}

.oi-hero-metric-icon--provider {
  color: #1d4ed8;
  background: #dbeafe;
  border: 1px solid #93c5fd;
}

.oi-hero-metric-icon--time {
  color: var(--pi-primary-strong);
  background: var(--pi-primary-soft);
  border: 1px solid var(--pi-primary-border);
  font-size: 16px;
}

.oi-hero-metric-copy {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.oi-hero-metric-label {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--pi-neutral-secondary);
}

.oi-hero-metric-value {
  font-size: 15px;
  font-weight: 800;
  line-height: 1.25;
  color: var(--pi-neutral-heading);
}

.oi-hero-cta-bar {
  padding-top: var(--pi-space-4);
  border-top: 1px solid var(--pi-border);
}

/* —— Page layout —— */

.pi-task-stack {
  display: flex;
  flex-direction: column;
  gap: var(--pi-space-3);
}

.oi-context-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--pi-space-4);
}

.pi-context-surface {
  overflow: hidden;
}

.pi-context-surface--facility {
  border-top: 4px solid #14b8a6;
}

.pi-context-surface--provider {
  border-top: 4px solid #3b82f6;
}

.pi-context-surface .pi-surface-body {
  padding: 0;
}

.pi-context-surface-head {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: start;
  gap: var(--pi-space-3);
  padding: var(--pi-space-5) var(--pi-space-5) var(--pi-space-4);
  border-bottom: 1px solid var(--pi-border);
  background: #f8fafc;
}

.pi-context-surface-mark {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 900;
}

.pi-context-surface-mark--facility {
  color: #0f766e;
  background: #ccfbf1;
  border: 1px solid #5eead4;
}

.pi-context-surface-mark--provider {
  color: #1d4ed8;
  background: #dbeafe;
  border: 1px solid #93c5fd;
}

.pi-context-surface-titles {
  min-width: 0;
}

.pi-context-surface-title {
  margin: 0;
  font-size: 16px;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--pi-neutral-heading);
}

.pi-context-surface-subtitle {
  margin: 5px 0 0;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.45;
  color: var(--pi-neutral-secondary);
}

.pi-context-surface .pi-insight-list {
  padding: var(--pi-space-4);
}

.pi-next-move-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: var(--pi-space-3);
}

/* —— Deep intelligence (secondary) —— */

.oi-deep.pi-surface {
  margin-top: var(--pi-space-6);
  border-style: dashed;
  border-color: var(--pi-border-strong);
  box-shadow: var(--pi-shadow-sm);
}

.oi-deep-trigger {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--pi-space-4);
  width: 100%;
  margin: 0;
  padding: var(--pi-space-4) var(--pi-space-5);
  border: none;
  background: #f8fafc;
  text-align: left;
  cursor: pointer;
  font: inherit;
  color: inherit;
  transition: background 0.15s ease;
}

.oi-deep-trigger:hover {
  background: #f1f5f9;
}

.oi-deep-trigger:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--pi-primary) 50%, transparent);
  outline-offset: -2px;
}

.oi-deep-trigger-text {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.oi-deep-title {
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--pi-neutral-secondary);
}

.oi-deep-subtitle {
  font-size: 13px;
  font-weight: 600;
  color: var(--pi-neutral-muted);
  line-height: 1.45;
}

.oi-deep-chevron {
  flex-shrink: 0;
  font-size: 13px;
  font-weight: 800;
  color: var(--pi-neutral-muted);
  padding-top: 2px;
}

.oi-deep-body {
  display: flex;
  flex-direction: column;
  gap: var(--pi-space-4);
  padding: var(--pi-space-4) var(--pi-space-5) var(--pi-space-5);
  border-top: 1px solid var(--pi-border);
  background: var(--pi-surface);
}

.oi-deep-engagements {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: var(--pi-space-2);
}

.oi-deep-engagement-link {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: var(--pi-space-3) var(--pi-space-4);
  border-radius: var(--pi-radius-sm);
  border: 1px solid var(--pi-border);
  font-size: 14px;
  font-weight: 700;
  text-decoration: none;
  color: var(--pi-neutral-heading);
  background: var(--pi-surface);
  transition: border-color 0.12s ease, background 0.12s ease, box-shadow 0.12s ease;
}

.oi-deep-engagement-link:hover {
  border-color: var(--pi-primary-border);
  background: var(--pi-primary-soft);
  box-shadow: var(--pi-shadow-sm);
}

.oi-deep-engagement-meta {
  font-size: 13px;
  font-weight: 600;
  color: var(--pi-neutral-secondary);
}

@media (max-width: 900px) {
  .oi-hero-metrics {
    grid-template-columns: 1fr;
  }

  .oi-context-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .oi-hero-inner {
    padding: var(--pi-space-5) var(--pi-space-4) var(--pi-space-4) calc(var(--pi-space-4) + 4px);
  }

  .oi-hero-title {
    font-size: 24px;
  }
}
`;
