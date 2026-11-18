export const observationCaseQuestionsToAnswerCss = `
.case-obs-questions-to-answer-head {
  display: grid;
  gap: 6px;
  margin-bottom: 12px;
}
.case-obs-questions-to-answer-lead {
  margin: 0;
  font-size: 13px;
  font-weight: 650;
  line-height: 1.45;
  color: color-mix(in srgb, var(--foreground) 62%, var(--muted));
}
.case-obs-questions-to-answer-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 8px;
}
.case-obs-questions-to-answer-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
  background: color-mix(in srgb, var(--foreground) 1.5%, var(--surface));
}
.case-obs-questions-to-answer-label {
  font-size: 14px;
  font-weight: 750;
  line-height: 1.35;
  color: var(--foreground);
}
.case-obs-questions-to-answer-status {
  flex-shrink: 0;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  padding: 4px 8px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));
  color: var(--muted);
}
.case-obs-questions-to-answer-status--answered {
  border-color: color-mix(in srgb, var(--brand-600) 24%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 8%, var(--surface));
  color: var(--brand-700);
}
.case-obs-questions-to-answer-status--partial {
  border-color: color-mix(in srgb, #f59e0b 22%, var(--border));
  background: color-mix(in srgb, #f59e0b 6%, var(--surface));
  color: color-mix(in srgb, #b45309 80%, var(--foreground));
}
`;
