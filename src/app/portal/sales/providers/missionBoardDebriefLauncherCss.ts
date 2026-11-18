export const missionBoardDebriefLauncherCss = `
.mission-board-debrief-launcher-modal {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.mb-debrief-launcher__head {
  display: grid;
  gap: 4px;
}

.mb-debrief-launcher__kicker {
  margin: 0;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--muted);
}

.mb-debrief-launcher__title {
  margin: 0;
  font-size: 20px;
  font-weight: 800;
  color: var(--foreground);
}

.mb-debrief-launcher__org {
  margin: 0;
  font-size: 13px;
  color: var(--muted);
}

.mb-debrief-launcher__loading,
.mb-debrief-launcher__text,
.mb-debrief-launcher__lead {
  margin: 0;
  font-size: 14px;
  line-height: 1.45;
  color: var(--foreground);
}

.mb-debrief-launcher__body {
  display: grid;
  gap: 12px;
  max-height: min(52vh, 420px);
  overflow: auto;
  padding-right: 2px;
}

.mb-debrief-launcher__section {
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));
  background: color-mix(in srgb, var(--surface) 92%, #9333ea 8%);
}

.mb-debrief-launcher__label {
  margin: 0 0 6px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: #7e22ce;
}

.mb-debrief-launcher__facts {
  margin: 0;
  padding-left: 18px;
  display: grid;
  gap: 6px;
}

.mb-debrief-launcher__facts li {
  font-size: 13px;
  line-height: 1.4;
  color: var(--foreground);
}

.mb-debrief-launcher__facts li::marker {
  content: "✓ ";
  color: #16a34a;
  font-weight: 700;
}

.mb-debrief-launcher__quote {
  margin: 0;
  font-size: 14px;
  line-height: 1.5;
  font-style: italic;
  color: var(--foreground);
}

.mb-debrief-launcher__error {
  margin: 0;
  padding: 10px 12px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #8c1d18;
  background: color-mix(in srgb, #b3261e 8%, #fff);
  border: 1px solid color-mix(in srgb, #b3261e 24%, transparent);
}

.mb-debrief-launcher__actions {
  display: grid;
  gap: 8px;
}

.mb-debrief-launcher__primary,
.mb-debrief-launcher__secondary,
.mb-debrief-launcher__cancel {
  min-height: 42px;
  border-radius: 10px;
  font-family: inherit;
  font-size: 14px;
  font-weight: 800;
  cursor: pointer;
}

.mb-debrief-launcher__primary {
  border: 0;
  color: #fff;
  background: linear-gradient(135deg, #9333ea 0%, #7e22ce 100%);
}

.mb-debrief-launcher__secondary {
  border: 1px solid color-mix(in srgb, #9333ea 35%, var(--border));
  background: var(--surface);
  color: #7e22ce;
}

.mb-debrief-launcher__cancel {
  border: 0;
  background: transparent;
  color: var(--muted);
  font-weight: 700;
}

.mb-debrief-launcher__primary:disabled,
.mb-debrief-launcher__secondary:disabled,
.mb-debrief-launcher__cancel:disabled {
  opacity: 0.6;
  cursor: default;
}

.mb-debrief-launcher__complete {
  border: 1px solid color-mix(in srgb, #16a34a 35%, var(--border));
  background: color-mix(in srgb, #16a34a 8%, var(--surface));
  color: #15803d;
}

.mb-debrief-launcher__complete-state {
  margin: 0;
  padding: 10px 12px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 700;
  color: #15803d;
  background: color-mix(in srgb, #16a34a 10%, #fff);
  border: 1px solid color-mix(in srgb, #16a34a 24%, transparent);
}

.mb-debrief-complete {
  display: grid;
  gap: 10px;
}

.mb-debrief-complete__options {
  display: grid;
  gap: 8px;
}

.mb-debrief-complete__option {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 13px;
  line-height: 1.4;
  color: var(--foreground);
  cursor: pointer;
}

.mb-debrief-complete__option input {
  margin-top: 2px;
}

.mb-debrief-complete__select,
.mb-debrief-complete__notes {
  width: 100%;
  box-sizing: border-box;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--foreground) 12%, var(--border));
  padding: 8px 10px;
  font-family: inherit;
  font-size: 13px;
  color: var(--foreground);
  background: var(--surface);
}

.mb-debrief-complete__notes {
  resize: vertical;
  min-height: 72px;
}

.mb-debrief-complete__actions {
  display: grid;
  gap: 8px;
}

.mb-debrief-complete__voice {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 10px;
  margin-bottom: 8px;
}

.mb-debrief-complete__dictate {
  min-height: 36px;
  padding: 0 12px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, #9333ea 35%, var(--border));
  background: color-mix(in srgb, #9333ea 8%, var(--surface));
  color: #7e22ce;
  font-family: inherit;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
}

.mb-debrief-complete__dictate--active {
  border-color: color-mix(in srgb, #dc2626 35%, var(--border));
  background: color-mix(in srgb, #dc2626 10%, var(--surface));
  color: #b91c1c;
}

.mb-debrief-complete__dictate:disabled {
  opacity: 0.6;
  cursor: default;
}

.mb-debrief-complete__voice-meta {
  display: grid;
  gap: 2px;
  flex: 1 1 160px;
}

.mb-debrief-complete__voice-status,
.mb-debrief-complete__voice-hint,
.mb-debrief-complete__voice-captured {
  font-size: 12px;
  line-height: 1.35;
  color: var(--muted);
}

.mb-debrief-complete__voice-captured {
  color: #15803d;
  font-weight: 700;
}

.mb-debrief-complete__voice-error {
  font-size: 12px;
  line-height: 1.35;
  color: #b3261e;
  font-weight: 600;
}

.mb-debrief-complete__voice-pause {
  min-height: 32px;
  padding: 0 10px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--foreground) 12%, var(--border));
  background: var(--surface);
  color: var(--foreground);
  font-family: inherit;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.mb-debrief-complete__voice-pause:disabled {
  opacity: 0.6;
  cursor: default;
}

.mb-debrief-dictation__report {
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px dashed color-mix(in srgb, var(--foreground) 14%, var(--border));
  background: color-mix(in srgb, var(--surface) 96%, #9333ea 4%);
}

.mb-debrief-dictation__report-grid {
  margin: 0;
  display: grid;
  gap: 8px;
}

.mb-debrief-dictation__report-row {
  display: grid;
  gap: 2px;
}

.mb-debrief-dictation__report-row dt {
  margin: 0;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--muted);
}

.mb-debrief-dictation__report-row dd {
  margin: 0;
  font-size: 13px;
  line-height: 1.4;
  color: var(--foreground);
}

.mb-debrief-dictation__stage {
  margin: 10px 0 0;
  font-size: 12px;
  color: var(--muted);
}
`;
