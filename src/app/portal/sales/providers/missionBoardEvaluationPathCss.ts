export const missionBoardEvaluationPathCss = `
.mission-board-evaluation-path-modal {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.mb-eval-path__head {
  display: grid;
  gap: 4px;
}

.mb-eval-path__kicker {
  margin: 0;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--muted);
}

.mb-eval-path__title {
  margin: 0;
  font-size: 20px;
  font-weight: 800;
  color: var(--foreground);
}

.mb-eval-path__org {
  margin: 0;
  font-size: 13px;
  color: var(--muted);
}

.mb-eval-path__context {
  display: grid;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));
  background: color-mix(in srgb, var(--surface) 92%, #0ea5e9 8%);
}

.mb-eval-path__context-label {
  margin: 0;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--muted);
}

.mb-eval-path__context-text {
  margin: 0;
  font-size: 13px;
  line-height: 1.45;
  color: var(--foreground);
}

.mb-eval-path__options {
  display: grid;
  gap: 8px;
}

.mb-eval-path__option {
  display: grid;
  gap: 4px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--foreground) 12%, var(--border));
  background: var(--surface);
  cursor: pointer;
  text-align: left;
}

.mb-eval-path__option[data-selected="true"] {
  border-color: color-mix(in srgb, var(--brand-600) 55%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 8%, var(--surface));
}

.mb-eval-path__option-title {
  font-size: 14px;
  font-weight: 800;
  color: var(--foreground);
}

.mb-eval-path__option-desc {
  font-size: 12px;
  line-height: 1.4;
  color: var(--muted);
}

.mb-eval-path__field {
  display: grid;
  gap: 6px;
}

.mb-eval-path__field-label {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--muted);
}

.mb-eval-path__field-input {
  width: 100%;
  box-sizing: border-box;
  min-height: 40px;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--foreground) 12%, var(--border));
  font-size: 14px;
  font-family: inherit;
  background: var(--surface);
  color: var(--foreground);
}

.mb-eval-path__error {
  margin: 0;
  font-size: 13px;
  color: #dc2626;
}

.provider-mission-board-card-evaluation-block {
  display: grid;
  gap: 6px;
  margin: 0 0 8px;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
  background: color-mix(in srgb, var(--foreground) 2%, #fff);
}

.provider-mission-board-card-evaluation-row {
  display: grid;
  gap: 2px;
}

.provider-mission-board-card-evaluation-k {
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--foreground) 45%, var(--muted));
}

.provider-mission-board-card-evaluation-v {
  font-size: 12px;
  line-height: 1.35;
  color: var(--foreground);
}
`;
