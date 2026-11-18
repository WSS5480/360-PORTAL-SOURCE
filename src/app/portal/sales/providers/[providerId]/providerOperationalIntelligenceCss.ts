/** Operational Intelligence — pathway advancement layout. */

export const providerOperationalIntelligenceCss = `
.oip {
  --oip-max: 720px;
  --oip-ink: #0f172a;
  --oip-muted: #64748b;
  --oip-teal: #0d9488;
  --oip-border: #e2e8f0;
  --oip-surface: #ffffff;
  max-width: var(--oip-max);
  margin: 0 auto;
  padding: 12px 14px 32px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.oip-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
}

.oip-head-text {
  min-width: 0;
}

.oip-kicker {
  margin: 0 0 4px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--oip-teal);
}

.oip-title {
  margin: 0;
  font-size: 22px;
  font-weight: 800;
  letter-spacing: -0.03em;
  color: var(--oip-ink);
}

.oip-confidence {
  flex-shrink: 0;
  text-align: right;
}

.oip-confidence-value {
  display: block;
  font-size: 28px;
  font-weight: 800;
  line-height: 1;
  color: var(--oip-ink);
  letter-spacing: -0.04em;
}

.oip-confidence-label {
  display: block;
  margin-top: 2px;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--oip-muted);
}

.oip-confidence-bar {
  height: 6px;
  border-radius: 999px;
  background: #e2e8f0;
  overflow: hidden;
}

.oip-confidence-fill {
  height: 100%;
  background: linear-gradient(90deg, #0f766e, #14b8a6);
  border-radius: inherit;
}

.oip-sec-title {
  margin: 0 0 10px;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--oip-ink);
}

.oip-cards {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.oip-card {
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid var(--oip-border);
  background: var(--oip-surface);
}

.oip-card--req {
  border-color: color-mix(in srgb, var(--oip-teal) 28%, var(--oip-border));
}

.oip-card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 8px;
}

.oip-card-req {
  margin: 0;
  font-size: 16px;
  font-weight: 800;
  line-height: 1.25;
  color: var(--oip-ink);
  letter-spacing: -0.02em;
}

.oip-card-badges {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  flex-shrink: 0;
}

.oip-badge {
  display: inline-flex;
  padding: 3px 8px;
  border-radius: 6px;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.oip-badge--validated {
  color: #065f46;
  background: #ecfdf5;
  border: 1px solid #6ee7b7;
}

.oip-badge--confirmed {
  color: #1e40af;
  background: #eff6ff;
  border: 1px solid #93c5fd;
}

.oip-badge--not_validated {
  color: #92400e;
  background: #fffbeb;
  border: 1px solid #fcd34d;
}

.oip-badge--unknown {
  color: #1e3a8a;
  background: #eff6ff;
  border: 1px solid #93c5fd;
}

.oip-badge--confidence {
  color: var(--oip-muted);
  background: #f8fafc;
  border: 1px solid var(--oip-border);
  text-transform: none;
  font-weight: 700;
}

.oip-dl {
  margin: 0;
  display: grid;
  gap: 6px;
}

.oip-dl div {
  display: grid;
  gap: 2px;
}

.oip-dt {
  margin: 0;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--oip-muted);
}

.oip-dd {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.4;
  color: #334155;
}

.oip-dd--evidence {
  font-style: italic;
}

.oip-card-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid var(--oip-border);
}

.oip-btn {
  min-height: 40px;
  padding: 0 14px;
  border-radius: 9px;
  border: 1px solid var(--oip-border);
  background: #fff;
  font-size: 13px;
  font-weight: 700;
  color: var(--oip-ink);
  cursor: pointer;
  font-family: inherit;
}

.oip-btn--primary {
  color: #fff;
  background: linear-gradient(180deg, #14b8a6, #0d9488);
  border-color: #0d9488;
}

.oip-compact-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.oip-compact-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 10px;
  background: #f8fafc;
  border: 1px solid var(--oip-border);
}

.oip-compact-label {
  font-size: 14px;
  font-weight: 700;
  color: var(--oip-ink);
  min-width: 0;
}

.oip-compact-meta {
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 700;
  color: var(--oip-muted);
}

.provider-profile-root--intelligence-tab .provider-intel-workspace--pathway {
  padding: 0;
  background: transparent;
  max-width: none;
}

.provider-profile-root--intelligence-tab .provider-planning-accordion--scannable.provider-intel-workspace {
  max-width: none;
}

@media (max-width: 720px) {
  .oip {
    padding: 10px 12px 24px;
  }

  .oip-card-head {
    flex-direction: column;
    align-items: flex-start;
  }

  .oip-card-badges {
    flex-direction: row;
    align-items: center;
  }

  .oip-btn {
    flex: 1 1 100%;
    min-height: 44px;
  }
}

/* Discovery intelligence — mission-control workspace */
.dig {
  --dig-ink: #0f172a;
  --dig-muted: #64748b;
  --dig-teal: #0f766e;
  --dig-teal-soft: #ecfdf5;
  --dig-orange: #c2410c;
  --dig-orange-soft: #fff7ed;
  --dig-gray: #64748b;
  --dig-gray-soft: #f1f5f9;
  --dig-red: #b91c1c;
  --dig-red-soft: #fef2f2;
  --dig-border: #e2e8f0;
  --dig-surface: #ffffff;
  --dig-zone-radius: 14px;
  width: 100%;
  max-width: none;
  margin: 0;
  padding: 16px 20px 32px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.dig-zone {
  border-radius: var(--dig-zone-radius);
  background: var(--dig-surface);
  box-shadow:
    0 1px 2px rgba(15, 23, 42, 0.04),
    0 4px 16px rgba(15, 23, 42, 0.03);
}

.dig-zone--command {
  padding: 0;
  background: linear-gradient(165deg, #f8fafc 0%, #ffffff 42%, #f8fafc 100%);
  border: 1px solid color-mix(in srgb, var(--dig-teal) 14%, var(--dig-border));
}

.dig-zone--not-started {
  padding: 28px 24px 32px;
  border: 1px solid var(--dig-border);
}

.dig-not-started {
  max-width: 520px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.dig-not-started-kicker {
  margin: 0;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--dig-muted);
}

.dig-not-started-status {
  margin: 0;
  font-size: 26px;
  font-weight: 800;
  letter-spacing: -0.03em;
  color: var(--dig-ink);
}

.dig-not-started-message {
  margin: 0;
  font-size: 15px;
  line-height: 1.5;
  color: var(--dig-muted);
}

.dig-not-started-actions {
  margin-top: 12px;
  padding-top: 20px;
  border-top: 1px solid var(--dig-border);
}

.dig-not-started-actions-label {
  margin: 0 0 12px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--dig-muted);
}

.dig-not-started-actions-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.dig-not-started-cta {
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.dig-action--secondary {
  background: var(--dig-surface);
  color: var(--dig-ink);
  border: 1px solid var(--dig-border);
}

.dig-action--secondary:hover {
  background: var(--dig-gray-soft);
}

.dig-zone--activity {
  padding: 14px 18px;
  background: var(--dig-gray-soft);
  border: 1px solid var(--dig-border);
}

.dig-zone--domains {
  padding: 18px 20px 20px;
  background: linear-gradient(180deg, #fafbfc 0%, var(--dig-surface) 24%);
  border: 1px solid var(--dig-border);
}

.dig-zone-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.dig-zone-title {
  margin: 0;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--dig-ink);
}

.dig-zone-meta {
  font-size: 11px;
  font-weight: 600;
  color: var(--dig-muted);
  white-space: nowrap;
}

.dig-command-deck {
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(280px, 0.85fr);
  gap: 0;
  align-items: stretch;
}

.dig-command-deck .dig-brief {
  margin: 0;
  padding: 20px 22px;
  border: none;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}

.dig-command-deck .dig-brief + .dig-mission-panel {
  border-left: 1px solid var(--dig-border);
}

.dig-kicker {
  margin: 0 0 4px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--dig-teal);
}

.dig-title {
  margin: 0;
  font-size: 22px;
  font-weight: 800;
  letter-spacing: -0.03em;
  color: var(--dig-ink);
}

.dig-confidence-bar {
  height: 6px;
  border-radius: 999px;
  background: #e2e8f0;
  overflow: hidden;
}

.dig-confidence-fill {
  height: 100%;
  background: linear-gradient(90deg, #0f766e, #14b8a6);
  border-radius: inherit;
  transition: width 0.35s ease;
}

.dig-confidence-fill--validated {
  background: linear-gradient(90deg, #0f766e, #5eead4);
}

.dig-confidence-fill--partial {
  background: linear-gradient(90deg, #ea580c, #fdba74);
}

.dig-confidence-fill--untouched {
  background: #cbd5e1;
}

.dig-confidence-fill--blocked {
  background: linear-gradient(90deg, #b91c1c, #f87171);
}

/* Intelligence briefing — summary + collapsible domains */
.dig-brief {
  padding: 14px 16px;
  border: 1px solid color-mix(in srgb, var(--dig-teal) 22%, var(--dig-border));
  border-radius: 14px;
  background: linear-gradient(180deg, #f8fafc 0%, var(--dig-surface) 48%);
  box-shadow: 0 1px 0 rgba(15, 23, 42, 0.04);
}

.dig-brief-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
}

.dig-brief-head-text {
  min-width: 0;
}

.dig-brief-readiness {
  flex-shrink: 0;
  text-align: right;
}

.dig-brief-readiness-tier {
  display: block;
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.1em;
  color: var(--dig-teal);
}

.dig-brief-readiness-mapped {
  display: block;
  margin-top: 2px;
  font-size: 11px;
  font-weight: 600;
  color: var(--dig-muted);
}

.dig-brief-readiness--validated .dig-brief-readiness-tier {
  color: var(--dig-teal);
}

.dig-brief-readiness--partial .dig-brief-readiness-tier {
  color: var(--dig-orange);
}

.dig-brief-readiness--untouched .dig-brief-readiness-tier {
  color: var(--dig-gray);
}

.dig-brief-readiness--blocked .dig-brief-readiness-tier {
  color: var(--dig-red);
}

.dig-confidence-bar--brief {
  margin-top: 10px;
}

.dig-brief-narrative {
  margin: 14px 0 0;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.5;
  color: #334155;
  max-width: 52ch;
}

.dig-brief-gap {
  margin: 12px 0 0;
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 8px;
}

.dig-brief-gap-label {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--dig-muted);
}

.dig-brief-gap-value {
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  color: #334155;
  background: var(--dig-orange-soft);
  border: 1px solid color-mix(in srgb, var(--dig-orange) 20%, var(--dig-border));
}

.stage-mapping-entry {
  margin-top: 14px;
  padding: 12px 14px;
  border-top: none;
  border-radius: 10px;
  background: color-mix(in srgb, var(--brand-600, #2563eb) 7%, #f8fafc);
  border: 1px solid color-mix(in srgb, var(--brand-600, #2563eb) 20%, var(--dig-border));
}

.stage-mapping-entry-eyebrow {
  margin: 0 0 4px;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--brand-700, #1d4ed8);
}

.stage-mapping-entry-copy {
  margin: 0 0 10px;
  font-size: 13px;
  line-height: 1.45;
  font-weight: 500;
  color: #475569;
  max-width: 52ch;
}

.stage-mapping-entry-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  margin: 0;
  padding: 11px 14px;
  border: none;
  border-radius: 9px;
  background: linear-gradient(
    165deg,
    color-mix(in srgb, var(--brand-600, #2563eb) 92%, #fff) 0%,
    var(--brand-600, #2563eb) 100%
  );
  color: #fff;
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.01em;
  cursor: pointer;
  font-family: inherit;
  box-shadow: 0 4px 14px color-mix(in srgb, var(--brand-600, #2563eb) 35%, rgba(15, 23, 42, 0.2));
}

.stage-mapping-entry-btn:hover {
  filter: brightness(1.05);
}

.dig-activity-list--strip {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.dig-activity-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 12px;
  line-height: 1.3;
  background: var(--dig-surface);
  border: 1px solid var(--dig-border);
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.03);
  transition: box-shadow 0.18s ease, border-color 0.18s ease;
}

.dig-activity-pill:hover {
  border-color: color-mix(in srgb, var(--dig-teal) 22%, var(--dig-border));
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.06);
}

.dig-activity-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--dig-gray);
  flex-shrink: 0;
}

.dig-activity-pill--validated .dig-activity-dot {
  background: var(--dig-teal);
}

.dig-activity-pill--partial .dig-activity-dot {
  background: var(--dig-orange);
}

.dig-activity-pill--blocked .dig-activity-dot {
  background: var(--dig-red);
}

.dig-activity-line {
  font-weight: 600;
  color: #334155;
  white-space: nowrap;
}

.dig-activity-when {
  font-size: 11px;
  font-weight: 700;
  color: var(--dig-muted);
  white-space: nowrap;
}

.dig-mission-panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 20px 22px;
  min-height: 100%;
}

.dig-mission-panel-kicker {
  margin: 0;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--dig-teal);
}

.dig-mission-panel-block {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.dig-mission-label {
  margin: 0;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--dig-muted);
}

.dig-mission-objective {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  line-height: 1.4;
  color: var(--dig-ink);
  letter-spacing: -0.02em;
}

.dig-mission-panel-block--question {
  padding: 12px 14px;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--dig-teal) 26%, var(--dig-border));
  background: linear-gradient(135deg, var(--dig-teal-soft) 0%, var(--dig-surface) 100%);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.6);
}

.dig-mission-question {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  line-height: 1.45;
  color: var(--dig-ink);
}

.dig-mission-upcoming {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.4;
  color: #334155;
}

.dig-mission-panel-link {
  margin-top: auto;
  padding: 0;
  border: none;
  background: transparent;
  align-self: flex-start;
  font-size: 12px;
  font-weight: 700;
  color: var(--dig-muted);
  cursor: pointer;
  font-family: inherit;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.dig-mission-panel-link:hover {
  color: var(--dig-teal);
}

.dig-mapped-pill {
  flex-shrink: 0;
  align-self: flex-start;
  padding: 5px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  line-height: 1.2;
  white-space: nowrap;
  color: var(--dig-muted);
  background: var(--dig-surface);
  border: 1px solid var(--dig-border);
}

.dig-mapped-pill--validated {
  color: var(--dig-teal);
  background: var(--dig-teal-soft);
  border-color: color-mix(in srgb, var(--dig-teal) 18%, var(--dig-border));
}

.dig-mapped-pill--partial {
  color: var(--dig-orange);
  background: var(--dig-orange-soft);
  border-color: color-mix(in srgb, var(--dig-orange) 18%, var(--dig-border));
}

.dig-mapped-pill--untouched {
  color: var(--dig-gray);
  background: var(--dig-gray-soft);
}

.dig-mapped-pill--blocked {
  color: var(--dig-red);
  background: var(--dig-red-soft);
  border-color: color-mix(in srgb, var(--dig-red) 18%, var(--dig-border));
}

.dig-domain-icon {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  color: var(--dig-teal);
  background: var(--dig-teal-soft);
  border: 1px solid color-mix(in srgb, var(--dig-teal) 18%, var(--dig-border));
}

.dig-domain-icon-svg {
  display: block;
}

.dig-op-card--validated .dig-domain-icon {
  color: var(--dig-teal);
  background: var(--dig-teal-soft);
}

.dig-op-card--partial .dig-domain-icon {
  color: var(--dig-orange);
  background: var(--dig-orange-soft);
}

.dig-op-card--untouched .dig-domain-icon {
  color: var(--dig-gray);
  background: var(--dig-gray-soft);
}

.dig-op-card--blocked .dig-domain-icon {
  color: var(--dig-red);
  background: var(--dig-red-soft);
}

.dig-domains-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
  align-items: start;
}

.dig-domain-card {
  display: flex;
  flex-direction: column;
  min-height: 0;
  border: 1px solid var(--dig-border);
  border-radius: 14px;
  background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
  overflow: hidden;
}

.dig-domain-card--expanded {
  grid-column: 1 / -1;
}

.dig-op-card {
  transition:
    border-color 0.22s ease,
    box-shadow 0.22s ease,
    transform 0.18s ease;
}

.dig-op-card:hover {
  box-shadow:
    0 4px 14px rgba(15, 23, 42, 0.07),
    0 1px 3px rgba(15, 23, 42, 0.04);
  transform: translateY(-1px);
}

.dig-op-card--validated {
  border-color: color-mix(in srgb, var(--dig-teal) 22%, var(--dig-border));
}

.dig-op-card--partial {
  border-color: color-mix(in srgb, var(--dig-orange) 22%, var(--dig-border));
}

.dig-op-card--untouched {
  border-color: var(--dig-border);
}

.dig-op-card--blocked {
  border-color: color-mix(in srgb, var(--dig-red) 24%, var(--dig-border));
}

.dig-op-card--expanded {
  border-color: color-mix(in srgb, var(--dig-teal) 30%, var(--dig-border));
  box-shadow:
    0 2px 12px rgba(15, 23, 42, 0.06),
    0 0 0 1px color-mix(in srgb, var(--dig-teal) 8%, transparent);
}

.dig-domain-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  padding: 16px 18px 12px;
  border-bottom: 1px solid color-mix(in srgb, var(--dig-border) 80%, transparent);
}

.dig-domain-card__header-main {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  min-width: 0;
  flex: 1;
}

.dig-domain-card__titles {
  min-width: 0;
  flex: 1;
}

.dig-domain-card__title-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.dig-domain-priority {
  display: inline-flex;
  padding: 2px 7px;
  border-radius: 4px;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.dig-domain-priority--critical {
  color: var(--dig-red);
  background: var(--dig-red-soft);
}

.dig-domain-priority--important {
  color: var(--dig-orange);
  background: var(--dig-orange-soft);
}

.dig-domain-priority--monitoring {
  color: var(--dig-muted);
  background: var(--dig-gray-soft);
}

.dig-domain-card__body {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px 18px 14px;
  min-width: 0;
}

.dig-domain-card__footer {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 18px 16px;
  margin-top: auto;
  border-top: 1px solid var(--dig-border);
  background: color-mix(in srgb, var(--dig-gray-soft) 50%, var(--dig-surface));
}

.dig-domain-expand-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-left: auto;
  padding: 8px 12px;
  border: 1px solid var(--dig-border);
  border-radius: 8px;
  background: var(--dig-surface);
  font-size: 12px;
  font-weight: 700;
  color: var(--dig-muted);
  cursor: pointer;
  font-family: inherit;
  white-space: nowrap;
  transition:
    border-color 0.18s ease,
    color 0.18s ease,
    box-shadow 0.18s ease;
}

.dig-domain-expand-btn:hover {
  color: var(--dig-teal);
  border-color: color-mix(in srgb, var(--dig-teal) 28%, var(--dig-border));
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--dig-teal) 12%, transparent);
}

.dig-domain-cta-placeholder {
  flex: 1;
}

.dig-op-card__panel {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 0.28s cubic-bezier(0.4, 0, 0.2, 1);
}

.dig-op-card--expanded .dig-op-card__panel {
  grid-template-rows: 1fr;
}

.dig-op-card__panel-inner {
  overflow: hidden;
  min-height: 0;
}

.dig-op-card--collapsed .dig-op-card__panel-inner {
  pointer-events: none;
}

.dig-op-section-title {
  margin: 0 0 8px;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--dig-muted);
}

.dig-op-signals {
  padding: 0 14px 14px;
}

.dig-op-signals .dig-signals {
  padding: 0;
}

@media (prefers-reduced-motion: reduce) {
  .dig-op-card,
  .dig-op-card__panel {
    transition: none;
  }
}

.dig-domain-chevron {
  flex-shrink: 0;
  font-size: 11px;
  color: var(--dig-muted);
}

.dig-domain-title {
  margin: 0;
  font-size: 16px;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--dig-ink);
  line-height: 1.2;
}

.dig-domain-purpose {
  margin: 4px 0 0;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.4;
  color: #334155;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}

.dig-domain-updated {
  margin: 4px 0 0;
  font-size: 11px;
  font-weight: 600;
  line-height: 1.3;
  color: var(--dig-muted);
}

.dig-domain-chips {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.dig-domain-chip {
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  line-height: 1.35;
  color: #334155;
  background: var(--dig-orange-soft);
  border: 1px solid color-mix(in srgb, var(--dig-orange) 16%, var(--dig-border));
  max-width: 100%;
}

.dig-domain-chip--more {
  color: var(--dig-muted);
  background: var(--dig-gray-soft);
  border-color: var(--dig-border);
  font-weight: 600;
}

.dig-domain-chip--blocked {
  background: var(--dig-red-soft);
  border-color: color-mix(in srgb, var(--dig-red) 18%, var(--dig-border));
}

.dig-domain-cta {
  flex: 1;
  min-height: 40px;
  min-width: 0;
}

.dig-domain-detail {
  background: #f8fafc;
}

.dig-domain-validation {
  padding: 12px 14px 10px;
  border-bottom: 1px solid var(--dig-border);
}

.dig-domain-framing {
  margin: 0;
  display: grid;
  gap: 8px;
}

.dig-domain-framing-row {
  margin: 0;
  display: grid;
  gap: 2px;
}

.dig-domain-framing-row dt {
  margin: 0;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--dig-muted);
}

.dig-domain-framing-row dd {
  margin: 0;
  font-size: 13px;
  font-weight: 500;
  line-height: 1.4;
  color: var(--dig-ink);
}

.dig-domain-framing-row--resolve dd {
  font-weight: 700;
  color: var(--dig-teal);
}

.dig-domain-empty {
  margin: 0;
  padding: 14px;
  font-size: 13px;
  color: var(--dig-muted);
}

.dig-signals {
  margin: 0;
  padding: 10px 12px 12px;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.dig-signal {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px 12px;
  align-items: start;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid var(--dig-border);
  background: var(--dig-surface);
  transition:
    border-color 0.18s ease,
    box-shadow 0.18s ease;
}

.dig-signal:hover {
  border-color: color-mix(in srgb, var(--dig-teal) 22%, var(--dig-border));
  box-shadow: 0 1px 6px rgba(15, 23, 42, 0.04);
}

.dig-signal--gate {
  border-color: color-mix(in srgb, var(--dig-teal) 35%, var(--dig-border));
  box-shadow: inset 3px 0 0 #5eead4;
}

.dig-signal--strategic {
  opacity: 0.92;
}

.dig-signal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.dig-signal-label {
  margin: 0;
  font-size: 14px;
  font-weight: 800;
  color: var(--dig-ink);
}

.dig-signal--strategic .dig-signal-label {
  font-weight: 700;
  color: #64748b;
}

.dig-signal-detail {
  margin: 4px 0 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--dig-muted);
}

.dig-signal-meta {
  margin: 6px 0 0;
  font-size: 12px;
  font-weight: 500;
  line-height: 1.4;
  color: #475569;
}

.dig-signal-meta--note {
  font-style: italic;
  color: #334155;
}

.dig-signal-evidence {
  margin: 8px 0 0;
  padding: 8px 10px;
  border-radius: 8px;
  border-left: 3px solid #fdba74;
  background: #fff7ed;
  font-size: 12px;
  font-weight: 500;
  line-height: 1.45;
  color: #431407;
  font-style: italic;
}

.dig-signal-source {
  margin: 6px 0 0;
  font-size: 11px;
  font-weight: 600;
  line-height: 1.4;
  color: #64748b;
}

.dig-signal-meta-kicker {
  display: block;
  margin-bottom: 2px;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--dig-muted);
  font-style: normal;
}

.dig-signal-touch {
  margin: 6px 0 0;
  font-size: 12px;
  color: #94a3b8;
}

.dig-signal-touch-kicker {
  margin-right: 6px;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.dig-signal-actions {
  align-self: center;
  min-width: 0;
}

.dig-signal-actions-inner {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.15s ease;
}

.dig-signal:hover .dig-signal-actions-inner,
.dig-signal:focus-within .dig-signal-actions-inner,
.dig-signal-actions-inner--open,
.dig-signal-actions-inner--solo {
  opacity: 1;
  pointer-events: auto;
}

@media (hover: none) {
  .dig-signal-actions-inner {
    opacity: 1;
    pointer-events: auto;
  }
}

.dig-status {
  display: inline-flex;
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.03em;
}

.dig-status--validated {
  color: #065f46;
  background: #ecfdf5;
  border: 1px solid #6ee7b7;
}

.dig-status--captured {
  color: #92400e;
  background: #fffbeb;
  border: 1px solid #fcd34d;
}

.dig-status--partial {
  color: #7c2d12;
  background: #fff7ed;
  border: 1px solid #fdba74;
}

.dig-status--unknown,
.dig-status--open {
  color: #1e3a8a;
  background: #eff6ff;
  border: 1px solid #93c5fd;
}

.dig-status--blocked {
  color: #991b1b;
  background: #fef2f2;
  border: 1px solid #fca5a5;
}

.dig-status--not_applicable {
  color: #475569;
  background: #f1f5f9;
  border: 1px solid #cbd5e1;
}

.dig-action {
  margin-left: 0;
  min-height: 32px;
  padding: 0 10px;
  border-radius: 7px;
  border: 1px solid var(--dig-border);
  background: #fff;
  font-size: 12px;
  font-weight: 700;
  color: var(--dig-ink);
  cursor: pointer;
  font-family: inherit;
}

.dig-action--primary {
  color: #fff;
  background: linear-gradient(180deg, #14b8a6, #0d9488);
  border-color: #0d9488;
  transition:
    box-shadow 0.18s ease,
    transform 0.12s ease;
}

.dig-action--primary:hover:not(:disabled) {
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--dig-teal) 22%, transparent);
}

.dig-action--primary:active:not(:disabled) {
  transform: translateY(1px);
}

.dig-action--signal {
  min-height: 30px;
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
}

.dig-action--more {
  min-height: 30px;
  padding: 0 10px;
  font-size: 11px;
  font-weight: 700;
  color: var(--dig-muted);
  background: transparent;
  border-color: transparent;
}

.dig-action--more:hover {
  color: var(--dig-ink);
  background: #f1f5f9;
  border-color: var(--dig-border);
}

.dig-action-more {
  position: relative;
  display: inline-flex;
}

.dig-action-menu {
  position: absolute;
  right: 0;
  top: calc(100% + 4px);
  z-index: 20;
  min-width: 168px;
  padding: 4px;
  border-radius: 8px;
  border: 1px solid var(--dig-border);
  background: #fff;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.12);
}

.dig-action-menu-item {
  display: block;
  width: 100%;
  padding: 8px 10px;
  border: none;
  border-radius: 6px;
  background: transparent;
  text-align: left;
  font-size: 12px;
  font-weight: 600;
  color: var(--dig-ink);
  cursor: pointer;
  font-family: inherit;
}

.dig-action-menu-item:hover:not(:disabled) {
  background: #f1f5f9;
}

.dig-action-menu-item:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.dig-sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

@media (max-width: 1024px) {
  .dig-command-deck {
    grid-template-columns: 1fr;
  }

  .dig-command-deck .dig-brief + .dig-mission-panel {
    border-left: none;
    border-top: 1px solid var(--dig-border);
  }
}

@media (max-width: 768px) {
  .dig {
    padding: 12px 14px 24px;
    gap: 16px;
  }

  .dig-domains-grid {
    grid-template-columns: 1fr;
    gap: 14px;
  }

  .dig-domain-card--expanded {
    grid-column: auto;
  }

  .dig-domain-purpose {
    white-space: normal;
  }

  .dig-domain-card__footer {
    flex-wrap: wrap;
  }

  .dig-domain-expand-btn {
    margin-left: 0;
    width: 100%;
    justify-content: center;
  }

  .dig-activity-line {
    white-space: normal;
  }
}

@media (max-width: 720px) {
  .dig-domain-cta {
    flex: 1 1 100%;
  }

  .dig-signal {
    grid-template-columns: 1fr;
  }

  .dig-signal-actions-inner {
    flex-direction: column;
    align-items: stretch;
    opacity: 1;
    pointer-events: auto;
  }

  .dig-action--signal {
    display: inline-flex;
  }

  .dig-action {
    min-height: 40px;
  }

  .dig-action-more {
    width: 100%;
  }

  .dig-action-menu {
    right: 0;
    left: 0;
    min-width: 0;
  }
}

/* Knowledge workspace */
.dig-knowledge-workspace {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.dig-knowledge-header {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.dig-knowledge-header-main {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: min(100%, 280px);
}

.dig-knowledge-title {
  margin: 0;
  font-size: 22px;
  font-weight: 800;
  letter-spacing: -0.03em;
  color: var(--dig-ink);
}

.dig-knowledge-subtitle {
  margin: 0;
  font-size: 15px;
  line-height: 1.5;
  color: var(--dig-muted);
}

.dig-knowledge-empty,
.dig-knowledge-known-empty {
  margin: 0;
  font-size: 14px;
  line-height: 1.45;
  color: var(--dig-muted);
}

.dig-knowledge-header-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.dig-zone--knowledge-known,
.dig-zone--knowledge-gaps {
  padding: 20px 22px;
  border: 1px solid var(--dig-border);
}

.dig-knowledge-gap-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.dig-knowledge-gap-row-main {
  width: 100%;
  display: grid;
  gap: 6px;
  padding: 12px 14px;
  border-radius: 10px;
  border: 1px solid var(--dig-border);
  background: #f8fafc;
  text-align: left;
  cursor: pointer;
  transition:
    border-color 0.18s ease,
    box-shadow 0.18s ease;
}

.dig-knowledge-gap-row-main:hover {
  border-color: color-mix(in srgb, var(--dig-teal) 24%, var(--dig-border));
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.06);
}

.dig-knowledge-gap-row-label {
  font-size: 14px;
  font-weight: 800;
  color: var(--dig-ink);
}

.dig-knowledge-evidence {
  padding: 14px 18px;
  border-radius: var(--dig-zone-radius);
  border: 1px solid var(--dig-border);
  background: var(--dig-surface);
}

.dig-knowledge-evidence-summary {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 8px 12px;
  cursor: pointer;
  list-style: none;
}

.dig-knowledge-evidence-summary::-webkit-details-marker {
  display: none;
}

.dig-knowledge-evidence-title {
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--dig-ink);
}

.dig-knowledge-evidence-meta {
  font-size: 12px;
  font-weight: 600;
  color: var(--dig-muted);
}

.dig-knowledge-evidence-empty {
  margin: 12px 0 0;
  font-size: 14px;
  color: var(--dig-muted);
}

.dig-knowledge-evidence[open] .dig-intel-timeline-list {
  margin-top: 14px;
}

/* Provider dossier */
.dig-dossier {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.dig-dossier-page-header {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.dig-dossier-page-header__main {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: min(100%, 280px);
}

.dig-dossier-page-title {
  margin: 0;
  font-size: 24px;
  font-weight: 800;
  letter-spacing: -0.03em;
  color: var(--dig-ink);
}

.dig-dossier-page-subtitle {
  margin: 0;
  font-size: 15px;
  line-height: 1.5;
  color: var(--dig-muted);
}

.dig-dossier-page-header__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.dig-dossier-sections {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.dig-dossier-section {
  padding: 22px 24px;
  border-radius: var(--dig-zone-radius);
  border: 1px solid var(--dig-border);
  background: var(--dig-surface);
  box-shadow: 0 1px 0 rgba(15, 23, 42, 0.04);
}

.dig-dossier-section__header {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--dig-border);
}

.dig-dossier-section__title {
  margin: 0;
  font-size: 17px;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--dig-ink);
}

.dig-dossier-section__purpose {
  margin: 6px 0 0;
  font-size: 13px;
  line-height: 1.45;
  color: var(--dig-muted);
  max-width: 52ch;
}

.dig-dossier-confidence {
  display: grid;
  gap: 4px;
  min-width: 140px;
  padding: 10px 12px;
  border-radius: 10px;
  background: #f8fafc;
  border: 1px solid var(--dig-border);
}

.dig-dossier-confidence__label {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--dig-muted);
}

.dig-dossier-confidence__value {
  font-size: 14px;
  font-weight: 800;
  color: var(--dig-ink);
}

.dig-dossier-confidence__meter {
  display: block;
  height: 3px;
  margin-top: 4px;
  border-radius: 999px;
  background: var(--dig-teal);
  max-width: 100%;
}

.dig-dossier-confidence--unknown .dig-dossier-confidence__meter {
  background: #cbd5e1;
}

.dig-dossier-confidence--partial .dig-dossier-confidence__meter {
  background: color-mix(in srgb, var(--dig-teal) 55%, #94a3b8);
}

.dig-dossier-confidence--validated .dig-dossier-confidence__meter {
  background: var(--dig-teal);
}

.dig-dossier-section__columns {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
  gap: 20px;
}

@media (max-width: 900px) {
  .dig-dossier-section__columns {
    grid-template-columns: 1fr;
  }
}

.dig-dossier-lane__title {
  margin: 0 0 12px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--dig-muted);
}

.dig-dossier-lane__empty {
  margin: 0;
  font-size: 14px;
  line-height: 1.45;
  color: var(--dig-muted);
  padding: 12px 14px;
  border-radius: 10px;
  background: #f8fafc;
  border: 1px dashed var(--dig-border);
}

.dig-dossier-lane__empty--clear {
  border-style: solid;
  background: color-mix(in srgb, var(--dig-teal) 6%, #f8fafc);
}

.dig-dossier-card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
}

.dig-dossier-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 14px 16px;
  border-radius: 12px;
  background: #fff;
  border: 1px solid color-mix(in srgb, var(--dig-teal) 14%, var(--dig-border));
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
}

.dig-dossier-card__header {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 6px 10px;
}

.dig-dossier-card__label {
  margin: 0;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--dig-muted);
}

.dig-dossier-card__when {
  font-size: 11px;
  font-weight: 600;
  color: #94a3b8;
}

.dig-dossier-card__value {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.5;
  color: #1e293b;
}

.dig-dossier-card__source {
  font-size: 11px;
  font-weight: 600;
  color: #64748b;
}

.dig-dossier-unknown-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.dig-dossier-unknown-item {
  display: grid;
  gap: 2px;
  padding: 10px 12px;
  border-radius: 10px;
  background: var(--dig-gray-soft);
  border: 1px solid var(--dig-border);
}

.dig-dossier-unknown-item__label {
  font-size: 14px;
  font-weight: 700;
  color: #475569;
}

.dig-dossier-unknown-item__detail {
  font-size: 12px;
  color: var(--dig-muted);
}

.dig-dossier-evidence {
  margin-top: 4px;
}

/* Progressive intelligence states (legacy) */
.dig-progressive {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.dig-progressive-header {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.dig-progressive-page-title {
  margin: 0;
  font-size: 22px;
  font-weight: 800;
  letter-spacing: -0.03em;
  color: var(--dig-ink);
}

.dig-progressive-headline {
  margin: 0;
  font-size: 15px;
  line-height: 1.5;
  color: var(--dig-muted);
}

.dig-zone--progressive-main {
  padding: 20px 22px;
  border: 1px solid var(--dig-border);
}

.dig-progressive-section-title {
  margin: 0 0 16px;
  font-size: 14px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--dig-ink);
}

.dig-progressive-known-unknown {
  display: grid;
  gap: 18px;
}

.dig-progressive-block-title {
  margin: 0 0 8px;
  font-size: 13px;
  font-weight: 800;
  color: var(--dig-ink);
}

.dig-progressive-known-list,
.dig-progressive-unknown-list,
.dig-progressive-finding-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.dig-progressive-known-item {
  display: grid;
  gap: 2px;
  padding: 10px 12px;
  border-radius: 10px;
  background: var(--dig-teal-soft);
  border: 1px solid color-mix(in srgb, var(--dig-teal) 18%, var(--dig-border));
}

.dig-progressive-known-label {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--dig-muted);
}

.dig-progressive-known-value {
  font-size: 14px;
  font-weight: 600;
  line-height: 1.4;
  color: #334155;
}

.dig-progressive-unknown-list li {
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #475569;
  background: var(--dig-gray-soft);
  border: 1px solid var(--dig-border);
}

.dig-progressive-findings {
  display: grid;
  gap: 16px;
}

.dig-progressive-finding-title {
  margin: 0 0 8px;
  font-size: 13px;
  font-weight: 800;
  color: var(--dig-teal);
}

.dig-progressive-finding-list li {
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 14px;
  line-height: 1.45;
  color: #334155;
  background: #f8fafc;
  border: 1px solid var(--dig-border);
}

.dig-progressive-findings--validated .dig-progressive-finding-title {
  color: var(--dig-ink);
}

.dig-progressive-actions {
  padding: 16px 20px;
  border-radius: var(--dig-zone-radius);
  background: var(--dig-surface);
  border: 1px solid var(--dig-border);
}

.dig-progressive-actions-label {
  margin: 0 0 10px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--dig-muted);
}

.dig-progressive-cta {
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 40px;
  padding: 0 16px;
}

.dig-zone--timeline {
  padding: 14px 18px;
}

.dig-zone--timeline-primary {
  border: 1px solid color-mix(in srgb, var(--dig-teal) 18%, var(--dig-border));
}

.dig-intel-timeline-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.dig-intel-timeline-item {
  margin: 0;
}

.dig-intel-timeline-link {
  display: grid;
  gap: 4px;
  padding: 12px 14px;
  border-radius: 10px;
  border: 1px solid var(--dig-border);
  background: #f8fafc;
  text-decoration: none;
  color: inherit;
  transition:
    border-color 0.18s ease,
    box-shadow 0.18s ease;
}

.dig-intel-timeline-link:hover {
  border-color: color-mix(in srgb, var(--dig-teal) 24%, var(--dig-border));
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.06);
}

.dig-intel-timeline-title {
  font-size: 14px;
  font-weight: 800;
  color: var(--dig-ink);
}

.dig-intel-timeline-detail {
  font-size: 13px;
  line-height: 1.45;
  color: #334155;
}

.dig-intel-timeline-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
  font-size: 11px;
  font-weight: 600;
  color: var(--dig-muted);
}

.dig-intel-timeline-source {
  color: #64748b;
}

.dig-intel-timeline-when {
  margin-left: auto;
}

.dig-progressive-empty {
  margin: 0;
  font-size: 14px;
  color: var(--dig-muted);
}

/* Intelligence domain cards — locked / building / validated */
.dig-domain-card--locked {
  background: #f1f5f9;
  border-color: #e2e8f0;
  opacity: 0.92;
}

.dig-domain-card--locked .dig-domain-icon {
  color: var(--dig-gray);
  background: #e2e8f0;
  border-color: #cbd5e1;
}

.dig-domain-card--building {
  border-color: color-mix(in srgb, var(--dig-orange) 22%, var(--dig-border));
}

.dig-domain-card--validated {
  border-color: color-mix(in srgb, var(--dig-teal) 24%, var(--dig-border));
}

.dig-domain-card__locked-message {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--dig-muted);
}

.dig-domain-card__section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.dig-domain-card__section + .dig-domain-card__section {
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid color-mix(in srgb, var(--dig-border) 80%, transparent);
}

.dig-domain-card__section-title {
  margin: 0;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--dig-muted);
}

.dig-domain-card__fact-list,
.dig-domain-card__unknown-list,
.dig-domain-card__observation-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.dig-domain-card__fact,
.dig-domain-card__observation {
  display: grid;
  gap: 4px;
  padding: 10px 12px;
  border-radius: 10px;
  background: #f8fafc;
  border: 1px solid var(--dig-border);
}

.dig-domain-card--validated .dig-domain-card__fact {
  background: var(--dig-teal-soft);
  border-color: color-mix(in srgb, var(--dig-teal) 18%, var(--dig-border));
}

.dig-domain-card__fact-label {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--dig-muted);
}

.dig-domain-card__fact-value,
.dig-domain-card__objective,
.dig-domain-card__action {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.45;
  color: #334155;
}

.dig-domain-card__trace {
  font-size: 11px;
  font-weight: 600;
  color: #64748b;
}

.dig-domain-card__unknown-list li {
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #475569;
  background: var(--dig-gray-soft);
  border: 1px solid var(--dig-border);
}

.dig-domain-card__observation-quote {
  margin: 0;
  font-size: 13px;
  line-height: 1.45;
  font-style: italic;
  color: #334155;
}
`;
