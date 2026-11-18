export const observationCaseIntelligenceCss = `
.case-obs-intelligence {
  display: grid;
  gap: 14px;
  min-width: 0;
}

.case-obs-intelligence-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.case-obs-intelligence-kicker {
  margin: 0 0 4px;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--brand-600) 72%, var(--muted));
}

.case-obs-intelligence-title {
  margin: 0;
  font-size: 20px;
  font-weight: 900;
  line-height: 1.15;
  letter-spacing: -0.02em;
  color: var(--foreground);
}

.case-obs-intelligence-lead {
  margin: 6px 0 0;
  font-size: 13px;
  line-height: 1.45;
  font-weight: 650;
  color: color-mix(in srgb, var(--foreground) 62%, var(--muted));
  max-width: 42rem;
}

.case-obs-intelligence-updated {
  margin: 0;
  flex-shrink: 0;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--muted);
}

.case-obs-intelligence-empty-card {
  display: grid;
  gap: 6px;
  padding: 16px;
  border-radius: 14px;
  border: 1px dashed color-mix(in srgb, var(--brand-600) 24%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 3%, var(--surface, #fff));
}

.case-obs-intelligence-empty-title {
  margin: 0;
  font-size: 15px;
  font-weight: 900;
  color: var(--foreground);
}

.case-obs-intelligence-empty-copy {
  margin: 0;
  font-size: 13px;
  font-weight: 650;
  line-height: 1.45;
  color: color-mix(in srgb, var(--foreground) 58%, var(--muted));
}

.case-obs-intelligence-footnote {
  margin: 0;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--foreground) 48%, var(--muted));
}

.case-obs-intelligence-summary {
  margin: 0;
  padding: 12px 14px;
  border-radius: 14px;
  border: 1px solid color-mix(in srgb, var(--brand-600) 20%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 6%, var(--surface, #fff));
  color: var(--foreground);
  font-size: 13px;
  font-weight: 700;
  line-height: 1.45;
}

.case-obs-intelligence-grid {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
}

.case-obs-intel-card {
  display: grid;
  gap: 10px;
  min-height: 132px;
  padding: 14px;
  border-radius: 14px;
  border: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));
  background:
    linear-gradient(
      180deg,
      color-mix(in srgb, var(--foreground) 1.5%, var(--surface, #fff)) 0%,
      var(--surface, #fff) 100%
    );
  box-shadow: inset 0 1px 0 color-mix(in srgb, #ffffff 70%, transparent);
}

.case-obs-intel-card--filled {
  border-color: color-mix(in srgb, var(--brand-600) 22%, var(--border));
  background:
    linear-gradient(
      165deg,
      color-mix(in srgb, var(--brand-600) 5%, var(--surface, #fff)) 0%,
      var(--surface, #fff) 100%
    );
}

.case-obs-intel-card--confirmed {
  box-shadow: inset 3px 0 0 var(--brand-600);
}

.case-obs-intel-card--watch {
  border-style: dashed;
}

.case-obs-intel-card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.case-obs-intel-card-head-main {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.case-obs-intel-card-title {
  margin: 0;
  font-size: 14px;
  font-weight: 900;
  line-height: 1.25;
  color: var(--foreground);
}

.case-obs-intel-card-hint {
  margin: 0;
  font-size: 11px;
  font-weight: 650;
  line-height: 1.4;
  color: color-mix(in srgb, var(--foreground) 56%, var(--muted));
}

.case-obs-intel-card-badge {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  padding: 3px 8px;
  border-radius: 999px;
  font-size: 9px;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.case-obs-intel-card-badge--confirmed {
  color: #166534;
  background: #dcfce7;
  border: 1px solid color-mix(in srgb, #16a34a 24%, transparent);
}

.case-obs-intel-card-badge--watch {
  color: #92400e;
  background: #fef3c7;
  border: 1px solid color-mix(in srgb, #d97706 24%, transparent);
}

.case-obs-intel-card-badge--open {
  color: color-mix(in srgb, var(--foreground) 62%, var(--muted));
  background: color-mix(in srgb, var(--foreground) 4%, var(--border));
}

.case-obs-intel-card-meter {
  height: 4px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--foreground) 6%, var(--border));
  overflow: hidden;
}

.case-obs-intel-card-meter-fill {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--brand-600), #16a34a);
}

.case-obs-intel-card-signals {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 6px;
}

.case-obs-intel-card-signals li {
  position: relative;
  padding-left: 12px;
  font-size: 13px;
  line-height: 1.4;
  font-weight: 700;
  color: var(--foreground);
}

.case-obs-intel-card-signals li::before {
  content: "";
  position: absolute;
  left: 0;
  top: 0.55em;
  width: 5px;
  height: 5px;
  border-radius: 999px;
  background: var(--brand-600);
}

.case-obs-intel-card-more {
  margin: 0;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--brand-600) 78%, var(--muted));
}

.case-obs-intel-card-empty {
  margin: 0;
  font-size: 12px;
  line-height: 1.4;
  font-weight: 650;
  color: color-mix(in srgb, var(--foreground) 48%, var(--muted));
}

.case-obs-intelligence--compact .case-obs-intelligence-grid {
  grid-template-columns: 1fr;
}

.case-obs-intelligence--compact .case-obs-intel-card {
  min-height: 0;
}

.case-obs-intelligence--compact .case-obs-intelligence-title {
  font-size: 16px;
}
`;
