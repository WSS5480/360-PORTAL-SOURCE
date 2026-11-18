export const productSupportCaseOverviewCss = `

.case-ps-detail-overview-stack {

  display: grid;

  gap: 10px;

  max-width: 720px;

}



.case-ps-capture-card {

  border-color: color-mix(in srgb, var(--brand-600) 22%, var(--border));

  background: color-mix(in srgb, var(--brand-600) 4%, #fff);

}



.case-ps-capture-title {

  color: var(--brand-700, var(--brand-600));

}



.case-ps-capture-lead {

  margin: 0;

  font-size: 13px;

  font-weight: 650;

  line-height: 1.45;

  color: color-mix(in srgb, var(--foreground) 62%, var(--muted));

}



.case-ps-capture-primary-btn,
.case-ps-capture-hero-btn {
  min-height: 56px;
  padding: 14px 18px;
  border-radius: 14px;
  border: none;
  background: var(--brand-600);
  color: #fff;
  font-size: 18px;
  font-weight: 800;
  cursor: pointer;
  font-family: inherit;
  width: 100%;
  box-shadow: 0 2px 8px color-mix(in srgb, var(--brand-600) 28%, transparent);
}

.case-ps-capture-mode-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.case-ps-capture-mode-btn {
  min-height: 88px;
  padding: 12px;
  border-radius: 12px;
  border: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));
  background: #fff;
  display: grid;
  gap: 6px;
  justify-items: center;
  align-content: center;
  cursor: pointer;
  font-family: inherit;
}

.case-ps-capture-mode-icon {
  font-size: 22px;
  line-height: 1;
}

.case-ps-capture-mode-label {
  font-size: 14px;
  font-weight: 800;
  color: var(--foreground);
}

.case-ps-capture-live-label {
  margin: 0 0 4px;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--foreground) 55%, var(--muted));
}

.case-ps-capture-actions {

  display: grid;

  gap: 8px;

}



.case-ps-capture-dictate-btn {

  min-height: 56px;

  padding: 12px 16px;

  border-radius: 12px;

  border: 1px solid color-mix(in srgb, var(--brand-600) 28%, var(--border));

  background: var(--brand-600);

  color: #fff;

  font-size: 16px;

  font-weight: 800;

  cursor: pointer;

  font-family: inherit;

}



.case-ps-capture-dictate-btn--active {

  background: color-mix(in srgb, var(--brand-600) 82%, #000);

}



.case-ps-capture-dictate-btn:disabled {

  opacity: 0.55;

  cursor: not-allowed;

}



.case-ps-capture-type-btn,

.case-ps-capture-save-btn,

.case-ps-capture-cancel-btn {

  min-height: 36px;

  padding: 8px 12px;

  border-radius: 8px;

  font-size: 13px;

  font-weight: 700;

  cursor: pointer;

  font-family: inherit;

}



.case-ps-capture-type-btn,

.case-ps-capture-cancel-btn {

  border: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));

  background: #fff;

  color: var(--foreground);

}



.case-ps-capture-save-btn {

  border: 1px solid var(--brand-600);

  background: var(--brand-600);

  color: #fff;

}



.case-ps-capture-note-form {

  display: grid;

  gap: 8px;

}



.case-ps-capture-note-area {

  width: 100%;

  min-height: 96px;

  padding: 10px 12px;

  border-radius: 8px;

  border: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));

  font: inherit;

  resize: vertical;

  box-sizing: border-box;

}



.case-ps-capture-note-actions {

  display: flex;

  flex-wrap: wrap;

  gap: 8px;

}



.case-ps-capture-live {

  padding: 8px 10px;

  border-radius: 8px;

  background: color-mix(in srgb, var(--foreground) 3%, #fff);

  border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));

}



.case-ps-capture-live-text {

  margin: 0;

  font-size: 13px;

  font-weight: 650;

  line-height: 1.45;

}



.case-ps-capture-hint,

.case-ps-capture-phi {

  margin: 0;

  font-size: 11px;

  font-weight: 650;

  line-height: 1.4;

  color: color-mix(in srgb, var(--foreground) 55%, var(--muted));

}



.case-ps-capture-error {

  margin: 0;

  font-size: 12px;

  font-weight: 700;

  color: var(--danger, #dc2626);

}



.case-ps-outcome-grid {

  display: grid;

  grid-template-columns: repeat(2, minmax(0, 1fr));

  gap: 8px;

}



.case-ps-outcome-btn {

  min-height: 44px;

  padding: 8px 10px;

  border-radius: 8px;

  border: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));

  background: #fff;

  font-size: 13px;

  font-weight: 700;

  text-align: left;

  cursor: pointer;

  font-family: inherit;

}



.case-ps-outcome-btn[aria-pressed="true"] {

  border-color: color-mix(in srgb, var(--brand-600) 30%, var(--border));

  background: color-mix(in srgb, var(--brand-600) 10%, #fff);

  color: var(--brand-700, var(--brand-600));

}



.case-ps-outcome-btn:disabled {

  opacity: 0.55;

  cursor: not-allowed;

}



.case-ps-next-step-field {

  display: grid;

  gap: 6px;

}



.case-ps-next-step-label {

  font-size: 12px;

  font-weight: 700;

  color: color-mix(in srgb, var(--foreground) 55%, var(--muted));

}



.case-ps-next-step-input {

  width: 100%;

  min-height: 72px;

  padding: 10px 12px;

  border-radius: 8px;

  border: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));

  font: inherit;

  resize: vertical;

  box-sizing: border-box;

}



.case-ps-next-step-value {

  margin: 0;

  font-size: 14px;

  font-weight: 650;

  line-height: 1.45;

}



.case-ps-next-step-saving {

  margin: 0;

  font-size: 11px;

  font-weight: 650;

  color: color-mix(in srgb, var(--foreground) 55%, var(--muted));

}



.case-ps-contacts-grid {

  margin: 0;

  display: grid;

  gap: 8px;

}



.case-ps-contact-row {

  display: grid;

  grid-template-columns: 108px 1fr;

  gap: 8px;

  font-size: 13px;

  line-height: 1.35;

}



.case-ps-contact-label {

  margin: 0;

  font-weight: 800;

  color: color-mix(in srgb, var(--foreground) 55%, var(--muted));

}



.case-ps-contact-value {

  margin: 0;

  font-weight: 650;

}



.case-ps-activity-timeline {

  display: grid;

  gap: 0;

}



.case-ps-activity-item {

  display: grid;

  gap: 2px;

  padding: 6px 0;

  border-top: 1px solid color-mix(in srgb, var(--foreground) 5%, var(--border));

}



.case-ps-activity-item:first-child {

  border-top: none;

  padding-top: 0;

}



.case-ps-activity-row {

  display: flex;

  justify-content: space-between;

  gap: 8px;

}



.case-ps-activity-label {

  font-size: 12px;

  font-weight: 800;

}



.case-ps-activity-time {

  font-size: 11px;

  font-weight: 650;

  color: color-mix(in srgb, var(--foreground) 55%, var(--muted));

}



.case-ps-activity-preview {

  margin: 0;

  font-size: 12px;

  font-weight: 650;

  color: color-mix(in srgb, var(--foreground) 65%, var(--muted));

}



.case-ps-activity-actor {

  font-size: 11px;

  font-weight: 650;

  color: color-mix(in srgb, var(--foreground) 55%, var(--muted));

}



.case-ps-moments-group {
  display: grid;
  gap: 8px;
}

.case-ps-moments-group-title {
  margin: 0;
  font-size: 12px;
  font-weight: 800;
  color: color-mix(in srgb, var(--foreground) 62%, var(--muted));
}

.case-ps-moments-chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.case-ps-moments-chip {
  min-height: 44px;
  padding: 8px 12px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));
  background: #fff;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  font-family: inherit;
}

.case-ps-moments-chip[aria-pressed="true"] {
  border-color: color-mix(in srgb, var(--brand-600) 30%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 10%, #fff);
  color: var(--brand-700, var(--brand-600));
}

.case-ps-timeline {
  display: grid;
  gap: 0;
}

.case-ps-timeline-item {
  display: grid;
  gap: 4px;
  padding: 10px 0;
  border-top: 1px solid color-mix(in srgb, var(--foreground) 5%, var(--border));
}

.case-ps-timeline-item:first-child {
  border-top: none;
  padding-top: 0;
}

.case-ps-timeline-item[data-kind="ai_insight"] {
  padding-left: 12px;
  border-left: 2px solid color-mix(in srgb, var(--brand-600) 24%, var(--border));
}

.case-ps-timeline-row {
  display: flex;
  justify-content: space-between;
  gap: 8px;
}

.case-ps-timeline-label {
  font-size: 12px;
  font-weight: 800;
}

.case-ps-timeline-time {
  font-size: 11px;
  font-weight: 650;
  color: color-mix(in srgb, var(--foreground) 55%, var(--muted));
}

.case-ps-timeline-body {
  margin: 0;
  font-size: 13px;
  font-weight: 650;
  line-height: 1.45;
}

.case-ps-timeline-actor {
  font-size: 11px;
  font-weight: 650;
  color: color-mix(in srgb, var(--foreground) 55%, var(--muted));
}

.case-ps-product-fit-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 8px;
}

.case-ps-product-fit-row {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: center;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
  background: #fff;
}

.case-ps-product-fit-row[data-tone="validated"] {
  border-color: color-mix(in srgb, #059669 24%, var(--border));
  background: color-mix(in srgb, #059669 6%, #fff);
}

.case-ps-product-fit-row[data-tone="emerging"] {
  border-color: color-mix(in srgb, #d97706 24%, var(--border));
  background: color-mix(in srgb, #d97706 6%, #fff);
}

.case-ps-product-fit-name {
  font-size: 14px;
  font-weight: 800;
}

.case-ps-product-fit-status {
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: color-mix(in srgb, var(--foreground) 55%, var(--muted));
}

@media (max-width: 520px) {
  .case-ps-moments-chip-row {
    display: grid;
    grid-template-columns: 1fr;
  }
}

`;

