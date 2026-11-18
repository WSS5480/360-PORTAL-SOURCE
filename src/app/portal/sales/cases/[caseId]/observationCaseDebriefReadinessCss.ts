export const observationCaseDebriefReadinessCss = `
.case-obs-debrief-readiness {
  display: grid;
  gap: 12px;
}
.case-obs-debrief-readiness--active {
  border-color: color-mix(in srgb, var(--brand-600) 18%, var(--border));
}
.case-obs-debrief-readiness-head {
  display: grid;
  gap: 4px;
}
.case-obs-debrief-readiness-lead {
  margin: 0;
  font-size: 12px;
  font-weight: 650;
  line-height: 1.45;
  color: color-mix(in srgb, var(--foreground) 62%, var(--muted));
}
.case-obs-debrief-readiness-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}
.case-obs-debrief-readiness-block {
  display: grid;
  gap: 6px;
  padding: 8px 10px;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
  background: color-mix(in srgb, var(--foreground) 1.5%, var(--surface, #fff));
  min-width: 0;
}
.case-obs-debrief-readiness-block-title {
  margin: 0;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--cod-muted, var(--muted));
}
.case-obs-debrief-readiness-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 4px;
}
.case-obs-debrief-readiness-list li {
  font-size: 12px;
  font-weight: 700;
  line-height: 1.35;
  color: var(--foreground);
  word-break: break-word;
}
.case-obs-debrief-readiness-empty {
  margin: 0;
  font-size: 12px;
  font-weight: 650;
  line-height: 1.4;
  color: var(--cod-muted, var(--muted));
}
.case-obs-debrief-readiness-topics {
  display: grid;
  gap: 8px;
}
.case-obs-debrief-readiness-topic {
  display: grid;
  gap: 6px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--brand-600) 14%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 4%, var(--surface, #fff));
}
.case-obs-debrief-readiness-topic-source {
  display: grid;
  gap: 2px;
}
.case-obs-debrief-readiness-topic-label {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--cod-muted, var(--muted));
}
.case-obs-debrief-readiness-topic-value {
  font-size: 12px;
  font-weight: 800;
  line-height: 1.35;
  color: var(--foreground);
}
.case-obs-debrief-readiness-topic-arrow {
  font-size: 11px;
  font-weight: 800;
  color: color-mix(in srgb, var(--brand-600) 70%, var(--foreground));
}
.case-obs-debrief-readiness-topic-suggestion {
  margin: 0;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.45;
  color: color-mix(in srgb, var(--foreground) 82%, var(--muted));
}
.case-obs-debrief-readiness-objectives {
  display: grid;
  gap: 6px;
}
.case-obs-debrief-readiness-objective {
  margin: 0;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
  background: var(--surface, #fff);
  font-size: 12px;
  font-weight: 700;
  line-height: 1.4;
  color: var(--foreground);
}
.case-obs-debrief-readiness-cta {
  display: grid;
  gap: 8px;
  padding-top: 4px;
}
.case-obs-debrief-readiness-cta-btn {
  width: 100%;
  min-height: 40px;
  padding: 10px 12px;
  border: 1px solid var(--brand-600);
  border-radius: 10px;
  background: var(--brand-600);
  color: #fff;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
  font-family: inherit;
  touch-action: manipulation;
}
.case-obs-debrief-readiness-cta-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.case-obs-debrief-readiness-cta-btn:not(:disabled):hover {
  filter: brightness(0.98);
}
.case-obs-debrief-readiness-cta-note {
  margin: 0;
  font-size: 11px;
  font-weight: 650;
  line-height: 1.4;
  color: color-mix(in srgb, var(--foreground) 58%, var(--muted));
  text-align: center;
}
@media (max-width: 720px) {
  .case-obs-debrief-readiness-grid {
    grid-template-columns: 1fr;
  }
}
`;
