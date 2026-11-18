export const observationCaseSummaryCss = `
.case-obs-summary--compact{padding:0}
.case-obs-summary-compact{display:grid;gap:6px}
.case-obs-summary-compact-line{
  margin:0;font-size:15px;font-weight:750;line-height:1.35;color:var(--foreground);overflow-wrap:anywhere
}
.case-obs-summary-compact-procedure{
  margin:0;font-size:13px;font-weight:600;line-height:1.35;color:color-mix(in srgb,var(--foreground) 62%,var(--muted))
}
.case-obs-summary.case-obs-briefing-section{padding:12px}
.case-obs-summary-grid{display:grid;gap:8px}
@media (min-width:560px){.case-obs-summary-grid{grid-template-columns:1fr 1fr}}
.case-obs-summary-item{display:grid;gap:2px;min-width:0}
.case-obs-summary-label{
  margin:0;font-size:10px;font-weight:750;letter-spacing:.04em;text-transform:uppercase;
  color:var(--muted);line-height:1.2
}
.case-obs-summary-value{
  margin:0;font-size:13px;font-weight:650;line-height:1.35;color:var(--foreground);
  overflow-wrap:anywhere
}
.case-obs-summary-status{
  display:inline-flex;align-items:center;align-self:start;
  border-radius:999px;padding:3px 9px;font-size:11px;font-weight:750;line-height:1.2;
  border:1px solid color-mix(in srgb,var(--brand-600) 24%,var(--border));
  background:color-mix(in srgb,var(--brand-600) 8%,var(--surface));
  color:var(--brand-700)
}
.case-obs-summary-status--in_progress{
  border-color:color-mix(in srgb,#d97706 28%,var(--border));
  background:color-mix(in srgb,#d97706 10%,var(--surface));
  color:#b45309
}
.case-obs-summary-status--completed,
.case-obs-summary-status--debrief_planned{
  border-color:color-mix(in srgb,#059669 28%,var(--border));
  background:color-mix(in srgb,#059669 10%,var(--surface));
  color:#047857
}
.case-obs-summary-status--closed{
  border-color:color-mix(in srgb,var(--foreground) 14%,var(--border));
  background:color-mix(in srgb,var(--surface-2) 50%,var(--surface));
  color:color-mix(in srgb,var(--foreground) 72%,var(--muted))
}
`;
