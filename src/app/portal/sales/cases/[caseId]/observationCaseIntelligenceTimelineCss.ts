export const observationCaseIntelligenceTimelineCss = `
.case-obs-intel-timeline {
  display: grid;
  gap: 10px;
  min-width: 0;
}
.case-obs-intel-timeline-empty {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.45;
  color: var(--cod-muted, var(--muted));
}
.case-obs-intel-timeline-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 0;
}
.case-obs-intel-timeline-item {
  display: grid;
  grid-template-columns: 14px minmax(0, 1fr);
  gap: 12px;
  padding: 0 0 14px;
}
.case-obs-intel-timeline-item:last-child {
  padding-bottom: 0;
}
.case-obs-intel-timeline-rail {
  position: relative;
  display: flex;
  justify-content: center;
}
.case-obs-intel-timeline-rail::before {
  content: "";
  position: absolute;
  top: 16px;
  bottom: -14px;
  width: 2px;
  background: color-mix(in srgb, var(--foreground) 10%, var(--border));
}
.case-obs-intel-timeline-item:last-child .case-obs-intel-timeline-rail::before {
  display: none;
}
.case-obs-intel-timeline-dot {
  width: 12px;
  height: 12px;
  margin-top: 4px;
  border-radius: 999px;
  border: 2px solid var(--surface, #fff);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--foreground) 10%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 55%, var(--surface));
}
.case-obs-intel-timeline-item--intro_call .case-obs-intel-timeline-dot {
  background: color-mix(in srgb, #7c3aed 62%, var(--surface));
}
.case-obs-intel-timeline-item--access_pathway_captured .case-obs-intel-timeline-dot,
.case-obs-intel-timeline-item--observation_scheduled .case-obs-intel-timeline-dot {
  background: color-mix(in srgb, #16a34a 62%, var(--surface));
}
.case-obs-intel-timeline-item--observation_note .case-obs-intel-timeline-dot {
  background: color-mix(in srgb, #0d9488 62%, var(--surface));
}
.case-obs-intel-timeline-item--signal_extracted .case-obs-intel-timeline-dot {
  background: color-mix(in srgb, #d97706 68%, var(--surface));
}
.case-obs-intel-timeline-body {
  display: grid;
  gap: 4px;
  min-width: 0;
}
.case-obs-intel-timeline-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
}
.case-obs-intel-timeline-title {
  margin: 0;
  font-size: 11px;
  font-weight: 850;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--brand-700) 78%, var(--foreground));
}
.case-obs-intel-timeline-item--signal_extracted .case-obs-intel-timeline-title {
  color: #b45309;
}
.case-obs-intel-timeline-time {
  font-size: 10px;
  font-weight: 700;
  color: var(--muted);
  white-space: nowrap;
}
.case-obs-intel-timeline-detail {
  margin: 0;
  font-size: 13px;
  font-weight: 650;
  line-height: 1.45;
  color: var(--foreground);
}
.case-obs-intel-timeline-link-btn {
  justify-self: start;
}
.case-obs-note-log{display:grid;gap:10px;min-width:0}
.case-obs-note-log-list{margin:0;padding:0;list-style:none;display:grid;gap:10px}
.case-obs-note-log-item{
  display:grid;gap:4px;padding:10px 12px;border-radius:10px;
  border:1px solid color-mix(in srgb,var(--foreground) 6%,var(--border));
  background:color-mix(in srgb,var(--surface-2) 30%,var(--surface))
}
.case-obs-note-log-time{font-size:11px;font-weight:700;color:var(--muted);line-height:1.2}
.case-obs-note-log-body{margin:0;font-size:14px;font-weight:600;line-height:1.45;color:var(--foreground);overflow-wrap:anywhere}
`;
