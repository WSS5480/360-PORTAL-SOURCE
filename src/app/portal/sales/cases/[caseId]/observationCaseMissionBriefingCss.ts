export const observationCaseMissionBriefingCss = `
.case-obs-mission-brief {
  display: grid;
  gap: 0;
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--brand-700) 28%, var(--border));
  background: var(--surface, #fff);
  box-shadow:
    0 1px 0 color-mix(in srgb, var(--foreground) 4%, transparent),
    0 16px 40px color-mix(in srgb, var(--brand-700) 8%, transparent);
}
.case-obs-mission-brief--compact .case-obs-mission-objective {
  font-size: 16px;
}
.case-obs-mission-brief-banner {
  padding: 16px 18px 14px;
  background:
    linear-gradient(
      135deg,
      color-mix(in srgb, var(--brand-700) 92%, #0f172a) 0%,
      color-mix(in srgb, var(--brand-600) 78%, #134e4a) 52%,
      color-mix(in srgb, var(--brand-700) 88%, #1e293b) 100%
    );
  color: #f8fafc;
}
.case-obs-mission-brief-banner-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}
.case-obs-mission-brief-kicker {
  margin: 0 0 4px;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: color-mix(in srgb, #ffffff 72%, var(--brand-300, #99f6e4));
}
.case-obs-mission-brief-lead {
  margin: 0 0 6px;
  font-size: 15px;
  font-weight: 700;
  line-height: 1.35;
  color: #ffffff;
}
.case-obs-mission-block--opportunity {
  background:
    linear-gradient(
      180deg,
      color-mix(in srgb, #d97706 4%, var(--surface, #fff)) 0%,
      var(--surface, #fff) 100%
    );
}
.case-obs-mission-plan-list {
  margin: 0;
  padding: 0 0 0 18px;
  display: grid;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.45;
  color: color-mix(in srgb, var(--foreground) 82%, var(--muted));
}
.case-obs-mission-plan-list li {
  padding-left: 2px;
}
.case-obs-mission-plan-empty {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  font-style: italic;
  color: var(--muted);
}
.case-obs-mission-opportunity-summary {
  margin: 0;
  font-size: 14px;
  font-weight: 650;
  line-height: 1.5;
  color: color-mix(in srgb, var(--foreground) 82%, var(--muted));
}
.case-obs-mission-brief-context {
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  color: color-mix(in srgb, #ffffff 88%, transparent);
}
.case-obs-mission-brief-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}
.case-obs-mission-brief-tag {
  display: inline-flex;
  align-items: center;
  min-height: 26px;
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, #ffffff 18%, transparent);
  background: color-mix(in srgb, #ffffff 8%, transparent);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.02em;
  color: #f8fafc;
}
.case-obs-mission-brief-tag--product {
  background: color-mix(in srgb, #fbbf24 24%, transparent);
  border-color: color-mix(in srgb, #fbbf24 42%, transparent);
}
.case-obs-mission-brief-body {
  display: grid;
  gap: 0;
}
.case-obs-mission-block {
  padding: 16px 18px;
  border-top: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
}
.case-obs-mission-block--hero {
  padding-top: 18px;
  background:
    linear-gradient(
      180deg,
      color-mix(in srgb, var(--brand-600) 5%, var(--surface, #fff)) 0%,
      var(--surface, #fff) 100%
    );
}
.case-obs-mission-block--intel-grid {
  background:
    linear-gradient(
      180deg,
      color-mix(in srgb, var(--foreground) 2.5%, var(--surface, #fff)) 0%,
      var(--surface, #fff) 100%
    );
}
.case-obs-mission-block--opportunity-grid {
  background:
    linear-gradient(
      180deg,
      color-mix(in srgb, #d97706 6%, var(--surface, #fff)) 0%,
      var(--surface, #fff) 100%
    );
}
.case-obs-mission-block--next {
  background: color-mix(in srgb, var(--foreground) 2%, var(--surface, #fff));
}
.case-obs-mission-block-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}
.case-obs-mission-block-title {
  margin: 0;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--brand-700) 78%, var(--muted));
}
.case-obs-mission-block-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.case-obs-mission-objective {
  margin: 0;
  font-size: 20px;
  font-weight: 800;
  line-height: 1.4;
  letter-spacing: -0.03em;
  color: var(--foreground);
  max-width: 48rem;
}
.case-obs-mission-intel-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(168px, 1fr));
  gap: 10px;
}
.case-obs-mission-intel-card {
  display: grid;
  gap: 8px;
  min-height: 118px;
  padding: 11px 12px;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));
  background:
    linear-gradient(
      165deg,
      color-mix(in srgb, var(--foreground) 1.5%, var(--surface, #fff)) 0%,
      var(--surface, #fff) 100%
    );
  box-shadow: inset 0 1px 0 color-mix(in srgb, #ffffff 60%, transparent);
}
.case-obs-mission-intel-card--watch_target {
  border-top: 3px solid color-mix(in srgb, var(--brand-600) 55%, transparent);
}
.case-obs-mission-intel-card--learning_gap {
  border-top: 3px solid color-mix(in srgb, var(--foreground) 22%, var(--border));
}
.case-obs-mission-intel-card--opportunity {
  border-top: 3px solid color-mix(in srgb, #d97706 62%, transparent);
  background:
    linear-gradient(
      165deg,
      color-mix(in srgb, #d97706 4%, var(--surface, #fff)) 0%,
      var(--surface, #fff) 100%
    );
}
.case-obs-mission-intel-card--confirmed {
  border-color: color-mix(in srgb, #16a34a 24%, var(--border));
}
.case-obs-mission-intel-card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}
.case-obs-mission-intel-card-title {
  margin: 0;
  font-size: 11px;
  font-weight: 850;
  line-height: 1.35;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--foreground);
}
.case-obs-mission-intel-card-detail {
  margin: 0;
  font-size: 12px;
  font-weight: 650;
  line-height: 1.4;
  color: color-mix(in srgb, var(--foreground) 78%, var(--muted));
}
.case-obs-mission-intel-badge {
  flex-shrink: 0;
  font-size: 8px;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 3px 6px;
  border-radius: 4px;
  border: 1px solid transparent;
}
.case-obs-mission-intel-badge--watch {
  color: var(--brand-700);
  border-color: color-mix(in srgb, var(--brand-600) 24%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 8%, var(--surface, #fff));
}
.case-obs-mission-intel-badge--validate {
  color: #92400e;
  border-color: color-mix(in srgb, #f59e0b 28%, var(--border));
  background: color-mix(in srgb, #f59e0b 10%, var(--surface, #fff));
}
.case-obs-mission-intel-badge--confirmed {
  color: #166534;
  border-color: color-mix(in srgb, #16a34a 28%, var(--border));
  background: color-mix(in srgb, #16a34a 10%, var(--surface, #fff));
}
.case-obs-mission-intel-badge--hypothesis {
  color: #9a3412;
  border-color: color-mix(in srgb, #ea580c 28%, var(--border));
  background: color-mix(in srgb, #ea580c 10%, var(--surface, #fff));
}
.case-obs-mission-intel-card-meta {
  margin: 0;
  margin-top: auto;
  display: grid;
  gap: 4px;
  padding-top: 4px;
  border-top: 1px dashed color-mix(in srgb, var(--foreground) 8%, var(--border));
}
.case-obs-mission-intel-card-meta div {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
}
.case-obs-mission-intel-card-meta dt {
  margin: 0;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--foreground) 48%, var(--muted));
}
.case-obs-mission-intel-card-meta dd {
  margin: 0;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.02em;
  color: color-mix(in srgb, var(--foreground) 82%, var(--muted));
  text-align: right;
}
.case-obs-mission-next-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 8px;
  counter-reset: mission-step;
}
.case-obs-mission-next-list li {
  position: relative;
  padding-left: 28px;
  font-size: 13px;
  font-weight: 700;
  line-height: 1.45;
  color: var(--foreground);
}
.case-obs-mission-next-list li::before {
  counter-increment: mission-step;
  content: counter(mission-step);
  position: absolute;
  left: 0;
  top: 0;
  width: 20px;
  height: 20px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  font-size: 10px;
  font-weight: 900;
  color: var(--brand-700);
  background: color-mix(in srgb, var(--brand-600) 12%, var(--surface, #fff));
  border: 1px solid color-mix(in srgb, var(--brand-600) 22%, var(--border));
}
.case-obs-mission-edit-btn {
  justify-self: start;
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
.case-obs-mission-edit-btn:disabled {
  opacity: 0.45;
  cursor: default;
}
.case-obs-mission-edit-btn:hover:not(:disabled) {
  text-decoration: underline;
}
.case-obs-mission-status {
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
.case-obs-mission-status--prefilled,
.case-obs-mission-status--review,
.case-obs-mission-status--ready {
  color: var(--brand-700);
  border-color: color-mix(in srgb, var(--brand-600) 22%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 6%, var(--surface, #fff));
}
.case-obs-mission-status--complete {
  color: #15803d;
  border-color: color-mix(in srgb, #16a34a 24%, var(--border));
  background: color-mix(in srgb, #16a34a 8%, var(--surface, #fff));
}
.case-obs-mission-status--in_progress {
  color: var(--brand-700);
  border-color: color-mix(in srgb, var(--brand-600) 28%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 10%, var(--surface, #fff));
}
.case-obs-mission-status--needs_input {
  color: #b45309;
  border-color: color-mix(in srgb, #f59e0b 28%, var(--border));
  background: color-mix(in srgb, #f59e0b 8%, var(--surface, #fff));
}
.case-obs-mission-prepare-meta {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px 14px;
  margin: 0;
  padding: 0 0 4px;
}
.case-obs-mission-prepare-meta-row {
  display: grid;
  gap: 3px;
  min-width: 0;
}
.case-obs-mission-prepare-meta-row dt {
  margin: 0;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted);
}
.case-obs-mission-prepare-meta-row dd {
  margin: 0;
  font-size: 14px;
  font-weight: 800;
  line-height: 1.35;
  color: var(--foreground);
  word-break: break-word;
}
@media (max-width: 640px) {
  .case-obs-mission-prepare-meta {
    grid-template-columns: 1fr;
  }
}
`;
