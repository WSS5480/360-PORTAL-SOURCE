export const observationCaseExecuteCss = `
.case-obs-execute-briefing-collapse {
  border: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
  border-radius: 12px;
  background: var(--surface, #fff);
  overflow: hidden;
}
.case-obs-execute-briefing-collapse-summary {
  padding: 10px 12px;
  cursor: pointer;
  list-style: none;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--foreground) 72%, var(--muted));
}
.case-obs-execute-briefing-collapse-summary::-webkit-details-marker {
  display: none;
}
.case-obs-execute-briefing-collapse .case-obs-mission-brief {
  border: none;
  border-radius: 0;
  border-top: 1px solid color-mix(in srgb, var(--foreground) 5%, var(--border));
  background: transparent;
}

.case-obs-execute--capture-only {
  display: grid;
  gap: 0;
  min-width: 0;
}
.case-obs-execute {
  display: grid;
  gap: 14px;
  min-width: 0;
}

.case-obs-execute-section.case-obs-detail-card {
  padding: 14px 16px;
}

.case-obs-execute-intro {
  margin: 0 0 10px;
  font-size: 12px;
  line-height: 1.45;
  font-weight: 600;
  color: color-mix(in srgb, var(--foreground) 62%, var(--muted));
}

.case-obs-execute-section .case-obs-intelligence {
  gap: 8px;
}

.case-obs-execute-focus-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 8px;
}

.case-obs-execute-focus-list li {
  position: relative;
  padding-left: 14px;
  font-size: 15px;
  font-weight: 650;
  line-height: 1.35;
  color: var(--foreground);
}

.case-obs-execute-focus-list li::before {
  content: "";
  position: absolute;
  left: 0;
  top: 0.55em;
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: var(--brand-600);
}

.case-obs-execute-actions {
  display: grid;
  gap: 8px;
}

.case-obs-execute-dictate-btn {
  width: 100%;
  min-height: 52px;
  padding: 12px 16px;
  border-radius: 10px;
  border: none;
  background: var(--brand-600);
  color: #fff;
  font-size: 16px;
  font-weight: 800;
  cursor: pointer;
  font-family: inherit;
  touch-action: manipulation;
}

.case-obs-execute-dictate-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.case-obs-execute-dictate-btn--active {
  background: color-mix(in srgb, var(--brand-600) 88%, #000);
  animation: case-obs-pulse 1.4s ease-in-out infinite;
}

@keyframes case-obs-pulse {
  0%, 100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--brand-600) 40%, transparent); }
  50% { box-shadow: 0 0 0 6px color-mix(in srgb, var(--brand-600) 0%, transparent); }
}

.case-obs-execute-type-btn {
  width: 100%;
  min-height: 44px;
  padding: 10px 16px;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--foreground) 12%, var(--border));
  background: #fff;
  color: var(--foreground);
  font-size: 14px;
  font-weight: 750;
  cursor: pointer;
  font-family: inherit;
  touch-action: manipulation;
}

.case-obs-execute-type-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.case-obs-execute-live {
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--brand-600) 20%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 5%, #fff);
}

.case-obs-execute-live-text {
  margin: 0;
  font-size: 15px;
  font-weight: 650;
  line-height: 1.45;
  color: var(--foreground);
}

.case-obs-execute-note-form {
  display: grid;
  gap: 8px;
}

.case-obs-execute-note-area {
  width: 100%;
  min-height: 88px;
  box-sizing: border-box;
  padding: 12px 14px;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--foreground) 12%, var(--border));
  background: #fff;
  font-size: 16px;
  line-height: 1.5;
  font-family: inherit;
  color: var(--foreground);
  resize: vertical;
}

.case-obs-execute-note-area:focus {
  outline: none;
  border-color: color-mix(in srgb, var(--brand-600) 40%, var(--border));
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--brand-600) 12%, transparent);
}

.case-obs-execute-note-actions {
  display: flex;
  gap: 8px;
}

.case-obs-execute-save-btn {
  flex: 1;
  min-height: 44px;
  border-radius: 10px;
  border: none;
  background: var(--brand-600);
  color: #fff;
  font-size: 14px;
  font-weight: 800;
  cursor: pointer;
  font-family: inherit;
  touch-action: manipulation;
}

.case-obs-execute-save-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.case-obs-execute-cancel-btn {
  min-height: 44px;
  padding: 0 14px;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--foreground) 12%, var(--border));
  background: #fff;
  font-size: 14px;
  font-weight: 750;
  cursor: pointer;
  font-family: inherit;
}

.case-obs-execute-hint {
  margin: 0;
  font-size: 11px;
  font-weight: 650;
  line-height: 1.35;
  color: color-mix(in srgb, var(--foreground) 50%, var(--muted));
}

.case-obs-execute-phi {
  margin: 0;
  font-size: 10px;
  font-weight: 700;
  color: #92400e;
}

.case-obs-execute-error {
  margin: 0;
  font-size: 12px;
  font-weight: 700;
  color: var(--danger);
}

.case-obs-execute-timeline {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 0;
}

.case-obs-execute-timeline-item {
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr);
  gap: 10px;
  padding: 10px 0;
  border-bottom: 1px solid color-mix(in srgb, var(--foreground) 5%, var(--border));
}

.case-obs-execute-timeline-item:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.case-obs-execute-timeline-body {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.case-obs-execute-timeline-time {
  font-size: 12px;
  font-weight: 750;
  line-height: 1.4;
  color: var(--muted);
}

.case-obs-execute-timeline-text {
  margin: 0;
  font-size: 14px;
  font-weight: 650;
  line-height: 1.45;
  color: var(--foreground);
}

.case-obs-execute-ai-tag {
  display: inline-flex;
  align-self: start;
  padding: 2px 7px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--foreground) 5%, #fff);
  color: var(--muted);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.03em;
  text-transform: uppercase;
}

.case-obs-execute-timeline-empty {
  margin: 0;
  font-size: 13px;
  font-weight: 650;
  line-height: 1.4;
  color: color-mix(in srgb, var(--foreground) 50%, var(--muted));
}

.case-obs-execute-complete {
  padding: 0;
  border: none;
  background: transparent;
}

.case-obs-execute-complete-btn {
  width: 100%;
  min-height: 48px;
  padding: 12px 16px;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--brand-600) 28%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 8%, #fff);
  color: var(--brand-700, var(--brand-600));
  font-size: 14px;
  font-weight: 800;
  cursor: pointer;
  font-family: inherit;
  touch-action: manipulation;
}

.case-obs-execute-complete-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.case-obs-execute-next-step-copy {
  margin: 0 0 12px;
  font-size: 13px;
  font-weight: 650;
  line-height: 1.45;
  color: color-mix(in srgb, var(--foreground) 72%, var(--muted));
}

.case-obs-plan-debrief-btn {
  min-height: 44px;
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--brand-600) 28%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 8%, #fff);
  color: var(--brand-700, var(--brand-600));
  font-size: 14px;
  font-weight: 800;
  cursor: pointer;
  font-family: inherit;
  touch-action: manipulation;
}

.case-obs-plan-debrief-btn--primary {
  background: var(--brand-600);
  border-color: var(--brand-600);
  color: #fff;
}

.case-obs-plan-debrief-btn--secondary {
  background: transparent;
  color: var(--foreground);
  border-color: color-mix(in srgb, var(--foreground) 12%, var(--border));
}

.case-obs-plan-debrief-btn--wide {
  width: 100%;
}

.case-obs-plan-debrief-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
`;
