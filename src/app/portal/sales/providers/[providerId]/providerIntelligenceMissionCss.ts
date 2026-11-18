/** Provider Intelligence tab — repository layout (aligned with Engagements / Cases tabs). */
export const providerIntelligenceMissionCss = `
.provider-profile-root--intelligence-tab .provider-profile-body {
  width: 100%;
  max-width: none;
  margin: 0;
  padding: 0;
  background: transparent;
}

.provider-profile-root--intelligence-tab .provider-profile-body > * {
  max-width: none;
  width: 100%;
}

@media (min-width: 720px) {
  .provider-profile-root--intelligence-tab .provider-profile-sticky,
  .provider-profile-root--intelligence-tab .provider-profile-header,
  .provider-profile-root--intelligence-tab .provider-profile-tabs {
    width: 100%;
    max-width: none;
    padding-left: clamp(24px, 2vw, 32px);
    padding-right: clamp(24px, 2vw, 32px);
    box-sizing: border-box;
  }
}

.mc-workspace--provider-intelligence {
  max-width: none;
  width: 100%;
  padding: 4px var(--mc-content-pad) calc(16px + env(safe-area-inset-bottom, 0px));
}

.mc-workspace--provider-intelligence .dig {
  max-width: none;
  margin: 0;
  padding: 0;
}

.provider-intel-capture-bar {
  margin-bottom: 10px;
}

.pi-dossier-workspace {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.pi-dossier-deck {
  margin-bottom: 2px;
}

.pi-dossier-deck__inner {
  padding: clamp(12px, 1.5vw, 18px) clamp(14px, 1.8vw, 22px);
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.pi-dossier-deck__bar {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 14px 20px;
}

.pi-dossier-deck__coverage {
  flex-shrink: 0;
  text-align: right;
  padding: 10px 14px;
  border-radius: var(--mc-radius-md);
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.pi-dossier-deck__coverage-label {
  display: block;
  margin: 0 0 4px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--mc-hero-muted);
}

.pi-dossier-deck__coverage-value {
  display: block;
  margin: 0;
  font-size: clamp(18px, 2.2vw, 24px);
  font-weight: 800;
  line-height: 1.1;
  letter-spacing: -0.03em;
  color: var(--mc-hero-ink);
  font-variant-numeric: tabular-nums;
}

.pi-dossier-deck__lead {
  margin: 0;
  font-size: 13px;
  line-height: 1.45;
  color: var(--mc-hero-subtle);
  max-width: 58ch;
}

.pi-dossier-deck__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.pi-dossier-stack {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.pi-dossier-section {
  padding: 14px 16px 16px;
}

.pi-dossier-section__head {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px 16px;
  margin-bottom: 14px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--mc-border-soft);
}

.pi-dossier-section__titles {
  min-width: min(100%, 240px);
}

.pi-dossier-section__title {
  margin: 0;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--mc-accent) 72%, var(--mc-ink));
}

.pi-dossier-section__purpose {
  margin: 6px 0 0;
  font-size: 13px;
  font-weight: 500;
  line-height: 1.45;
  color: var(--mc-meta);
  max-width: 52ch;
}

.pi-dossier-confidence {
  display: grid;
  gap: 6px;
  min-width: 148px;
  padding: 10px 12px;
  border-radius: var(--mc-radius-md);
  background: var(--mc-hero-bg-alt);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #e2e8f0;
}

.pi-dossier-confidence__label {
  margin: 0;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(148, 163, 184, 0.95);
}

.pi-dossier-confidence__value {
  margin: 0;
  font-size: 14px;
  font-weight: 800;
  color: #fff;
}

.pi-dossier-confidence__meter {
  display: block;
  height: 3px;
  border-radius: 999px;
  background: var(--mc-accent);
  max-width: 100%;
}

.pi-dossier-confidence--unknown .pi-dossier-confidence__meter {
  background: #64748b;
}

.pi-dossier-confidence--partial .pi-dossier-confidence__meter {
  background: color-mix(in srgb, #f59e0b 75%, var(--mc-accent));
}

.pi-dossier-section__lanes {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(0, 1fr);
  gap: 12px;
}

@media (max-width: 900px) {
  .pi-dossier-section__lanes {
    grid-template-columns: 1fr;
  }
}

.pi-dossier-lane__title {
  margin: 0 0 10px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.11em;
  text-transform: uppercase;
  color: var(--mc-meta);
}

.pi-dossier-lane__empty {
  margin: 0;
  padding: 12px 14px;
  border-radius: var(--mc-radius-md);
  font-size: 13px;
  line-height: 1.45;
  color: var(--mc-meta);
  background: var(--mc-surface-muted);
  border: 1px dashed var(--mc-border);
}

.pi-dossier-lane__empty--clear {
  border-style: solid;
  background: color-mix(in srgb, var(--mc-accent) 5%, #fff);
}

.pi-dossier-fact-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 10px;
}

.pi-dossier-fact-card {
  padding: 12px 14px;
  border-radius: var(--mc-radius-md);
  background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
  border: 1px solid color-mix(in srgb, var(--mc-ink) 8%, var(--mc-border));
  box-shadow: var(--mc-elev-panel);
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.pi-dossier-fact-card__head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 6px 10px;
}

.pi-dossier-fact-card__label {
  margin: 0;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--mc-meta);
}

.pi-dossier-fact-card__when {
  font-size: 10px;
  font-weight: 600;
  color: #94a3b8;
}

.pi-dossier-fact-card__value {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.5;
  color: var(--mc-ink-soft);
}

.pi-dossier-fact-card__source {
  font-size: 11px;
  font-weight: 600;
  color: var(--mc-meta);
}

.pi-dossier-unknown-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.pi-dossier-unknown-item {
  padding: 10px 12px;
  border-radius: var(--mc-radius-sm);
  background: color-mix(in srgb, var(--foreground, #0f172a) 3%, #fff);
  border: 1px solid var(--mc-border);
  display: grid;
  gap: 2px;
}

.pi-dossier-unknown-item__label {
  font-size: 13px;
  font-weight: 700;
  color: var(--mc-ink-soft);
}

.pi-dossier-unknown-item__detail {
  font-size: 12px;
  color: var(--mc-meta);
}

.pi-dossier-evidence {
  margin-top: 4px;
}

.pi-dossier-evidence.mc-surface {
  padding: 12px 14px;
}

.pi-dossier-evidence .dig-knowledge-evidence-summary,
.pi-dossier-evidence .dig-knowledge-evidence-title,
.pi-dossier-evidence .dig-knowledge-evidence-meta {
  color: var(--mc-ink-soft);
}

.pi-dossier-evidence .dig-intel-timeline-link {
  background: var(--mc-surface-muted);
}
`;
