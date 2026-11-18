export const observationCaseOpportunityRadarCss = `
.case-obs-opportunity-radar {
  display: grid;
  gap: 12px;
  padding: 16px 18px;
  border-radius: 16px;
  border: 1px solid color-mix(in srgb, #d97706 22%, var(--border));
  background:
    radial-gradient(
      circle at 100% 0%,
      color-mix(in srgb, #d97706 10%, transparent) 0%,
      transparent 52%
    ),
    linear-gradient(
      180deg,
      color-mix(in srgb, #d97706 5%, var(--surface, #fff)) 0%,
      var(--surface, #fff) 100%
    );
  box-shadow: inset 0 1px 0 color-mix(in srgb, #ffffff 70%, transparent);
}
.case-obs-opportunity-radar-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
}
.case-obs-opportunity-radar-title-wrap {
  display: grid;
  gap: 4px;
}
.case-obs-opportunity-radar-kicker {
  margin: 0;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: color-mix(in srgb, #b45309 82%, var(--muted));
}
.case-obs-opportunity-radar-lead {
  margin: 0;
  font-size: 12px;
  font-weight: 650;
  line-height: 1.45;
  color: color-mix(in srgb, var(--foreground) 72%, var(--muted));
  max-width: 42rem;
}
.case-obs-opportunity-radar-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.case-obs-opportunity-radar-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 10px;
}
.case-obs-opportunity-radar-blip {
  display: grid;
  gap: 8px;
  min-height: 112px;
  padding: 12px;
  border-radius: 12px;
  border: 1px solid color-mix(in srgb, #d97706 16%, var(--border));
  background: color-mix(in srgb, var(--foreground) 1.5%, var(--surface, #fff));
}
.case-obs-opportunity-radar-blip--validated {
  border-color: color-mix(in srgb, #16a34a 28%, var(--border));
  background:
    linear-gradient(
      165deg,
      color-mix(in srgb, #16a34a 5%, var(--surface, #fff)) 0%,
      var(--surface, #fff) 100%
    );
}
.case-obs-opportunity-radar-blip-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}
.case-obs-opportunity-radar-blip-title {
  margin: 0;
  font-size: 12px;
  font-weight: 850;
  line-height: 1.35;
  letter-spacing: 0.02em;
  text-transform: capitalize;
  color: var(--foreground);
}
.case-obs-opportunity-radar-trend {
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 900;
  color: color-mix(in srgb, var(--foreground) 55%, var(--muted));
}
.case-obs-opportunity-radar-trend--up {
  color: #15803d;
}
.case-obs-opportunity-radar-trend--down {
  color: #b45309;
}
.case-obs-opportunity-radar-confidence {
  display: grid;
  gap: 4px;
}
.case-obs-opportunity-radar-confidence-label {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--foreground) 52%, var(--muted));
}
.case-obs-opportunity-radar-confidence-value {
  font-size: 11px;
  letter-spacing: 0.04em;
  color: var(--foreground);
}
.case-obs-opportunity-radar-confidence-bar {
  height: 5px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--foreground) 8%, var(--border));
  overflow: hidden;
}
.case-obs-opportunity-radar-confidence-fill {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(
    90deg,
    color-mix(in srgb, #d97706 70%, #fbbf24) 0%,
    color-mix(in srgb, #ea580c 82%, #f59e0b) 100%
  );
}
.case-obs-opportunity-radar-blip--validated .case-obs-opportunity-radar-confidence-fill {
  background: linear-gradient(
    90deg,
    color-mix(in srgb, #16a34a 72%, #4ade80) 0%,
    color-mix(in srgb, #15803d 82%, #22c55e) 100%
  );
}
.case-obs-opportunity-radar-confidence-fill--medium {
  width: 58%;
}
.case-obs-opportunity-radar-confidence-fill--high {
  width: 100%;
}
.case-obs-opportunity-radar-confidence-fill--low {
  width: 32%;
}
.case-obs-opportunity-radar-detail {
  margin: 0;
  font-size: 11px;
  font-weight: 650;
  line-height: 1.4;
  color: color-mix(in srgb, var(--foreground) 74%, var(--muted));
}
.case-obs-opportunity-radar-source {
  margin: 0;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: color-mix(in srgb, #b45309 72%, var(--muted));
}
.case-obs-opportunity-radar .case-obs-mission-edit-btn {
  border: none;
  background: transparent;
  padding: 0;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--brand-700);
  cursor: pointer;
  font-family: inherit;
}
.case-obs-opportunity-radar .case-obs-mission-edit-btn:hover {
  text-decoration: underline;
}
.case-obs-opportunity-radar .case-obs-mission-status {
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  white-space: nowrap;
  padding: 3px 8px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));
  color: var(--cod-muted, var(--muted));
}
.case-obs-opportunity-radar .case-obs-mission-status--prefilled,
.case-obs-opportunity-radar .case-obs-mission-status--review,
.case-obs-opportunity-radar .case-obs-mission-status--ready {
  color: var(--brand-700);
  border-color: color-mix(in srgb, var(--brand-600) 22%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 6%, var(--surface, #fff));
}
`;
