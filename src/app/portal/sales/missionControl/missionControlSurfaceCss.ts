/** Light supporting surfaces, sections, and primary CTAs beneath the mission deck. */
export const missionControlSurfaceCss = `
.mc-body {
  padding: 4px var(--mc-content-pad) 12px;
}

.mc-surface {
  border-radius: var(--mc-radius-md);
  border: 1px solid var(--mc-border);
  background: linear-gradient(180deg, var(--mc-surface) 0%, color-mix(in srgb, var(--mc-accent) 3%, #fff) 100%);
  box-shadow: var(--mc-elev-panel);
}

.mc-surface--raised {
  box-shadow: var(--mc-elev-surface);
}

.mc-surface--accent-top {
  border-top: 3px solid var(--mc-accent);
  box-shadow: var(--mc-elev-surface), inset 0 1px 0 rgba(255, 255, 255, 0.72);
}

.mc-section {
  padding: 10px 12px 12px;
}

.mc-section__kicker {
  margin: 0 0 4px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--mc-meta);
}

.mc-section__title {
  margin: 0 0 8px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--mc-accent) 72%, var(--mc-ink));
}

.mc-section__lead {
  margin: 0 0 8px;
  font-size: 12px;
  font-weight: 500;
  line-height: 1.4;
  color: var(--mc-meta);
}

.mc-stack {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.mc-ops-card {
  padding: 12px 14px;
  border-radius: var(--mc-radius-md);
  background: var(--mc-hero-bg-alt);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 18px 46px rgba(15, 23, 42, 0.24), inset 0 1px 0 rgba(255, 255, 255, 0.08);
  color: #e2e8f0;
}

.mc-ops-card__kicker {
  margin: 0 0 4px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(148, 163, 184, 0.92);
}

.mc-ops-card__title {
  margin: 0;
  font-size: 16px;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: #fff;
}

.mc-cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  padding: 7px 14px;
  border-radius: var(--mc-radius-sm);
  font-size: 13px;
  font-weight: 700;
  font-family: inherit;
  text-decoration: none;
  cursor: pointer;
  white-space: nowrap;
  border: 1px solid transparent;
  transition: background 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease, transform 0.12s ease, filter 0.15s ease;
}

.mc-cta--primary {
  color: #fff;
  background: linear-gradient(180deg, var(--brand-600, #2563eb), color-mix(in srgb, var(--brand-700, #1d4ed8) 92%, #000));
  border-color: color-mix(in srgb, var(--brand-600, #2563eb) 70%, #000);
  box-shadow: 0 4px 14px color-mix(in srgb, var(--brand-600, #2563eb) 28%, transparent);
}

.mc-cta--primary:hover:not(:disabled) {
  filter: brightness(1.05);
  transform: translateY(-1px);
}

.mc-cta--ready {
  color: #fff;
  background: linear-gradient(180deg, #16a34a, #15803d);
  border-color: color-mix(in srgb, #16a34a 70%, #000);
  box-shadow: 0 4px 14px color-mix(in srgb, #16a34a 28%, transparent);
}

.mc-cta--secondary {
  color: #cbd5e1;
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(255, 255, 255, 0.12);
}

.mc-cta--secondary:hover:not(:disabled) {
  border-color: rgba(255, 255, 255, 0.22);
  color: #fff;
  transform: translateY(-1px);
}

.mc-cta--surface {
  color: var(--mc-ink);
  background: #fff;
  border-color: var(--mc-border);
}

.mc-cta:disabled {
  opacity: 0.65;
  cursor: wait;
}
`;
