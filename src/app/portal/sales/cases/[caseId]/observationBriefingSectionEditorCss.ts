export const observationBriefingSectionEditorCss = `
.case-obs-briefing-editor-overlay {
  position: fixed;
  inset: 0;
  z-index: 70;
  display: grid;
  place-items: center;
  padding: 16px;
  background: color-mix(in srgb, var(--foreground) 35%, transparent);
}
.case-obs-briefing-editor-panel {
  width: min(560px, 100%);
  max-height: min(90vh, calc(100dvh - 32px));
  overflow: auto;
  border-radius: 14px;
  border: 1px solid var(--border);
  background: var(--surface, #fff);
  box-shadow: 0 12px 40px color-mix(in srgb, var(--foreground) 18%, transparent);
}
.case-obs-briefing-editor-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 18px 12px;
  border-bottom: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
}
.case-obs-briefing-editor-title {
  margin: 0;
  font-size: 18px;
  font-weight: 900;
  line-height: 1.25;
  color: var(--foreground);
}
.case-obs-briefing-editor-subtitle {
  margin: 4px 0 0;
  font-size: 12px;
  font-weight: 650;
  line-height: 1.4;
  color: var(--muted);
}
.case-obs-briefing-editor-close {
  flex-shrink: 0;
  min-height: 34px;
  padding: 0 12px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--surface, #fff);
  color: var(--foreground);
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
  font-family: inherit;
}
.case-obs-briefing-editor-body {
  display: grid;
  gap: 14px;
  padding: 14px 18px 18px;
}
.case-obs-briefing-editor-field-label {
  display: block;
  margin: 0 0 6px;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--muted);
}
.case-obs-briefing-editor-textarea {
  width: 100%;
  min-height: 120px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));
  background: var(--surface, #fff);
  color: var(--foreground);
  font-size: 13px;
  font-weight: 650;
  line-height: 1.45;
  font-family: inherit;
  resize: vertical;
}
.case-obs-briefing-editor-textarea:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--brand-600) 55%, transparent);
  outline-offset: 1px;
}
.case-obs-briefing-editor-suggestions {
  display: grid;
  gap: 8px;
  padding: 12px;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--brand-600) 16%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 4%, var(--surface, #fff));
}
.case-obs-briefing-editor-suggestions-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.case-obs-briefing-editor-suggestions-title {
  margin: 0;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--brand-700);
}
.case-obs-briefing-editor-suggestions-note {
  margin: 0;
  font-size: 10px;
  font-weight: 650;
  line-height: 1.35;
  color: var(--muted);
}
.case-obs-briefing-editor-suggestions-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 8px;
}
.case-obs-briefing-editor-suggestion {
  display: grid;
  gap: 6px;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
  background: var(--surface, #fff);
}
.case-obs-briefing-editor-suggestion-text {
  margin: 0;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.4;
  color: var(--foreground);
}
.case-obs-briefing-editor-suggestion-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.case-obs-briefing-editor-suggestion-source {
  font-size: 10px;
  font-weight: 750;
  color: var(--muted);
}
.case-obs-briefing-editor-suggestion-apply {
  flex-shrink: 0;
  min-height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--brand-600) 24%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 8%, var(--surface, #fff));
  color: var(--brand-700);
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  cursor: pointer;
  font-family: inherit;
}
.case-obs-briefing-editor-suggestion-apply--primary {
  background: var(--brand-600);
  border-color: var(--brand-600);
  color: #fff;
}
.case-obs-briefing-editor-suggestion-apply:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.case-obs-briefing-editor-error {
  margin: 0;
  font-size: 12px;
  font-weight: 700;
  color: #b91c1c;
}
.case-obs-briefing-editor-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
  padding-top: 4px;
}
.case-obs-briefing-editor-btn {
  min-height: 38px;
  padding: 0 14px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
  font-family: inherit;
}
.case-obs-briefing-editor-btn--secondary {
  border: 1px solid var(--border);
  background: var(--surface, #fff);
  color: var(--foreground);
}
.case-obs-briefing-editor-btn--primary {
  border: 1px solid var(--brand-600);
  background: var(--brand-600);
  color: #fff;
}
.case-obs-briefing-editor-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
`;
