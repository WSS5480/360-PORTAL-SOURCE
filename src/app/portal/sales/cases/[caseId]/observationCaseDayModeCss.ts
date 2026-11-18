export const observationCaseDayModeCss = `
.case-obs-day-mode {
  display: grid;
  gap: 12px;
  min-width: 0;
}

.case-obs-day-mode-hero {
  display: grid;
  gap: 6px;
  padding: 14px 16px;
  border-radius: 14px;
  border: 1px solid color-mix(in srgb, #16a34a 28%, var(--border));
  background: linear-gradient(
    135deg,
    color-mix(in srgb, #16a34a 10%, #fff) 0%,
    color-mix(in srgb, var(--brand-600) 6%, #fff) 100%
  );
}

.case-obs-day-mode-kicker {
  margin: 0;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #15803d;
}

.case-obs-day-mode-title {
  margin: 0;
  font-size: 22px;
  font-weight: 900;
  line-height: 1.15;
  letter-spacing: -0.03em;
  color: var(--foreground);
}

.case-obs-day-mode-context {
  margin: 0;
  font-size: 13px;
  font-weight: 650;
  line-height: 1.4;
  color: color-mix(in srgb, var(--foreground) 68%, var(--muted));
}

.case-obs-day-mode-section {
  display: grid;
  gap: 10px;
  padding: 14px 16px;
  border-radius: 14px;
  border: 1px solid var(--cod-border, var(--border));
  background: #fff;
}

.case-obs-day-mode-section--watch {
  border-color: color-mix(in srgb, var(--brand-600) 28%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 4%, #fff);
  box-shadow: inset 3px 0 0 var(--brand-600);
}

.case-obs-day-mode-section--coaching {
  border-color: color-mix(in srgb, #16a34a 22%, var(--border));
  background: color-mix(in srgb, #16a34a 3%, #fff);
}

.case-obs-day-mode-section-title {
  margin: 0;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--cod-muted, var(--muted));
}

.case-obs-day-mode-mission-text {
  margin: 0;
  font-size: 16px;
  font-weight: 750;
  line-height: 1.4;
  color: var(--foreground);
}

.case-obs-day-mode-missing-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 8px;
}

.case-obs-day-mode-missing-list li {
  position: relative;
  padding-left: 14px;
  font-size: 14px;
  font-weight: 650;
  line-height: 1.4;
  color: color-mix(in srgb, var(--foreground) 78%, var(--muted));
}

.case-obs-day-mode-missing-list li::before {
  content: "";
  position: absolute;
  left: 0;
  top: 0.55em;
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: #d97706;
}

.case-obs-day-mode-watch-next {
  margin: 0;
  font-size: 17px;
  font-weight: 850;
  line-height: 1.35;
  color: var(--foreground);
}

.case-obs-day-mode-coaching-text {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  line-height: 1.45;
  color: color-mix(in srgb, var(--foreground) 82%, var(--muted));
}

.case-obs-day-mode-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.case-obs-day-mode-action {
  min-height: 64px;
  padding: 12px 14px;
  border-radius: 14px;
  border: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));
  background: #fff;
  color: var(--foreground);
  font-size: 15px;
  font-weight: 850;
  line-height: 1.25;
  text-align: left;
  cursor: pointer;
  font-family: inherit;
  touch-action: manipulation;
  box-shadow: 0 1px 0 color-mix(in srgb, var(--foreground) 4%, transparent);
}

.case-obs-day-mode-action:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.case-obs-day-mode-action--primary {
  grid-column: 1 / -1;
  min-height: 72px;
  border-color: color-mix(in srgb, var(--brand-600) 34%, var(--border));
  background: var(--brand-600);
  color: #fff;
  font-size: 18px;
  box-shadow: 0 10px 28px color-mix(in srgb, var(--brand-600) 24%, transparent);
}

.case-obs-day-mode-action--active {
  border-color: color-mix(in srgb, var(--brand-600) 40%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 8%, #fff);
  color: var(--brand-700, var(--brand-600));
}

.case-obs-day-mode-panel {
  display: grid;
  gap: 10px;
  padding: 14px 16px;
  border-radius: 14px;
  border: 1px solid var(--cod-border, var(--border));
  background: #fff;
}

.case-obs-day-mode-panel--open {
  border-color: color-mix(in srgb, var(--brand-600) 22%, var(--border));
  box-shadow: inset 3px 0 0 var(--brand-600);
}

.case-obs-day-mode-panel-title {
  margin: 0;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--cod-muted, var(--muted));
}

.case-obs-day-mode-signals {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 8px;
}

.case-obs-day-mode-signals li {
  position: relative;
  padding-left: 14px;
  font-size: 15px;
  font-weight: 700;
  line-height: 1.35;
  color: var(--foreground);
}

.case-obs-day-mode-signals li::before {
  content: "";
  position: absolute;
  left: 0;
  top: 0.55em;
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: var(--brand-600);
}

.case-obs-day-mode-empty {
  margin: 0;
  font-size: 13px;
  font-weight: 650;
  line-height: 1.4;
  color: color-mix(in srgb, var(--foreground) 52%, var(--muted));
}

.case-obs-day-mode-note-form {
  display: grid;
  gap: 8px;
}

.case-obs-day-mode-note-area {
  width: 100%;
  min-height: 96px;
  box-sizing: border-box;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid color-mix(in srgb, var(--foreground) 12%, var(--border));
  background: #fff;
  font-size: 17px;
  line-height: 1.5;
  font-family: inherit;
  color: var(--foreground);
  resize: vertical;
}

.case-obs-day-mode-note-actions {
  display: flex;
  gap: 8px;
}

.case-obs-day-mode-save-btn,
.case-obs-day-mode-cancel-btn {
  min-height: 48px;
  padding: 0 16px;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 800;
  cursor: pointer;
  font-family: inherit;
  touch-action: manipulation;
}

.case-obs-day-mode-save-btn {
  flex: 1;
  border: none;
  background: var(--brand-600);
  color: #fff;
}

.case-obs-day-mode-save-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.case-obs-day-mode-cancel-btn {
  border: 1px solid color-mix(in srgb, var(--foreground) 12%, var(--border));
  background: #fff;
  color: var(--foreground);
}

.case-obs-day-mode-quick-form {
  display: grid;
  gap: 8px;
}

.case-obs-day-mode-quick-input {
  width: 100%;
  min-height: 48px;
  box-sizing: border-box;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid color-mix(in srgb, var(--foreground) 12%, var(--border));
  background: #fff;
  font-size: 17px;
  font-family: inherit;
  color: var(--foreground);
}

.case-obs-day-mode-quick-input:focus,
.case-obs-day-mode-note-area:focus {
  outline: none;
  border-color: color-mix(in srgb, var(--brand-600) 40%, var(--border));
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--brand-600) 12%, transparent);
}

.case-obs-day-mode-live {
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--brand-600) 20%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 5%, #fff);
}

.case-obs-day-mode-live-text {
  margin: 0;
  font-size: 15px;
  font-weight: 650;
  line-height: 1.45;
}

.case-obs-day-mode-hint,
.case-obs-day-mode-phi {
  margin: 0;
  font-size: 11px;
  font-weight: 650;
  line-height: 1.35;
  color: color-mix(in srgb, var(--foreground) 50%, var(--muted));
}

.case-obs-day-mode-phi {
  color: #92400e;
}

.case-obs-day-mode-error {
  margin: 0;
  font-size: 12px;
  font-weight: 700;
  color: var(--danger);
}

.case-obs-day-mode-planning-collapse {
  border: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
  border-radius: 12px;
  background: color-mix(in srgb, var(--foreground) 2%, #fff);
  overflow: hidden;
}

.case-obs-day-mode-planning-collapse summary {
  padding: 10px 12px;
  cursor: pointer;
  list-style: none;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--foreground) 62%, var(--muted));
}

.case-obs-day-mode-planning-collapse summary::-webkit-details-marker {
  display: none;
}

.case-obs-day-mode-planning-body {
  padding: 0 12px 12px;
  display: grid;
  gap: 10px;
}

@media (max-width: 560px) {
  .case-obs-day-mode-actions {
    grid-template-columns: 1fr;
  }

  .case-obs-day-mode-action--primary {
    grid-column: auto;
  }
}
`;
