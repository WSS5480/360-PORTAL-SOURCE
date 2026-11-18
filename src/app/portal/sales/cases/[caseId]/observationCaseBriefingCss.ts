export const observationCaseBriefingCss = `
.case-obs-field-execution,.case-obs-briefing-tab,.case-obs-field-notes-tab,.case-obs-intelligence-tab{max-width:920px}
.case-obs-briefing-tab{gap:12px}
.case-obs-briefing-mission-line{margin:0;font-size:15px;font-weight:700;line-height:1.45;color:var(--foreground)}
.case-obs-briefing-section--cta{
  gap:8px;padding:14px 12px;
  border:2px solid color-mix(in srgb,var(--brand-600) 30%,var(--border));
  background:linear-gradient(180deg,color-mix(in srgb,var(--brand-600) 8%,var(--surface)) 0%,var(--surface) 50%)
}
.case-obs-briefing-dictate-btn--cta{min-height:72px;font-size:20px}
.case-obs-intel-lines{margin:8px 0 0;padding:0 0 0 18px;display:grid;gap:6px;font-size:13px;font-weight:650;line-height:1.35}
.case-obs-field-execution{max-width:920px}
.case-obs-briefing-stack{display:grid;gap:14px;min-width:0}
.case-obs-briefing-section{display:grid;gap:10px;padding:16px;border-radius:16px;border:1px solid color-mix(in srgb,var(--foreground) 8%,var(--border));background:#fff;min-width:0;box-shadow:0 1px 0 color-mix(in srgb,var(--foreground) 4%,transparent)}
.case-obs-briefing-section--card{padding:16px}
.case-obs-metadata-row{
  display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px 14px;padding:14px 16px;
  border-radius:16px;border:1px solid color-mix(in srgb,var(--foreground) 8%,var(--border));background:#fff
}
@media (min-width:720px){.case-obs-metadata-row{grid-template-columns:repeat(5,minmax(0,1fr))}}
.case-obs-metadata-item{display:grid;gap:3px;min-width:0}
.case-obs-metadata-label{margin:0;font-size:10px;font-weight:750;letter-spacing:.04em;text-transform:uppercase;color:var(--muted)}
.case-obs-metadata-value{margin:0;font-size:13px;font-weight:700;line-height:1.35;color:var(--foreground);overflow-wrap:anywhere}
.case-obs-briefing-section--secondary{
  padding:10px 12px;
  border-color:color-mix(in srgb,var(--foreground) 5%,var(--border));
  background:color-mix(in srgb,var(--surface-2) 22%,var(--surface));
}
.case-obs-briefing-section--secondary .case-obs-briefing-title{font-size:13px;font-weight:750;color:color-mix(in srgb,var(--foreground) 65%,var(--muted))}
.case-obs-briefing-section--capture{
  gap:12px;padding:14px 12px 16px;
  border:2px solid color-mix(in srgb,var(--brand-600) 35%,var(--border));
  background:linear-gradient(180deg,color-mix(in srgb,var(--brand-600) 9%,var(--surface)) 0%,var(--surface) 42%);
  box-shadow:0 10px 28px color-mix(in srgb,var(--brand-600) 10%,transparent);
}
.case-obs-briefing-workflow-kicker{
  margin:0;font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;
  color:var(--brand-700);line-height:1.2
}
.case-obs-briefing-head{display:grid;gap:4px}
.case-obs-briefing-title{margin:0;font-size:15px;font-weight:800;line-height:1.25;color:var(--foreground)}
.case-obs-briefing-lead{margin:0;font-size:13px;line-height:1.45;font-weight:550;color:color-mix(in srgb,var(--foreground) 58%,var(--muted))}
.case-obs-briefing-capture{display:grid;gap:12px;min-width:0}
.case-obs-briefing-dictate-btn{
  width:100%;min-height:84px;padding:16px 18px;border-radius:16px;border:none;
  background:var(--brand-600);color:#fff;font-size:22px;font-weight:850;line-height:1.15;
  cursor:pointer;font-family:inherit;touch-action:manipulation;
  box-shadow:0 8px 20px color-mix(in srgb,var(--brand-600) 28%,transparent)
}
.case-obs-briefing-dictate-btn:disabled{opacity:.55;cursor:not-allowed;box-shadow:none}
.case-obs-briefing-dictate-btn--active{
  background:color-mix(in srgb,var(--brand-600) 88%,#000);
  animation:case-obs-briefing-pulse 1.4s ease-in-out infinite
}
@keyframes case-obs-briefing-pulse{
  0%,100%{box-shadow:0 8px 20px color-mix(in srgb,var(--brand-600) 28%,transparent)}
  50%{box-shadow:0 8px 20px color-mix(in srgb,var(--brand-600) 28%,transparent),0 0 0 6px color-mix(in srgb,var(--brand-600) 18%,transparent)}
}
.case-obs-briefing-or{
  margin:0;text-align:center;font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;
  color:color-mix(in srgb,var(--foreground) 42%,var(--muted));line-height:1
}
.case-obs-briefing-quick-note-btn{
  width:100%;min-height:52px;padding:12px 16px;border-radius:14px;
  border:1px solid color-mix(in srgb,var(--foreground) 12%,var(--border));background:#fff;
  color:var(--foreground);font-size:16px;font-weight:750;cursor:pointer;font-family:inherit;
  touch-action:manipulation
}
.case-obs-briefing-quick-note-btn:disabled{opacity:.55;cursor:not-allowed}
.case-obs-briefing-quick-note{display:grid;gap:6px}
.case-obs-briefing-quick-note-actions{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.case-obs-briefing-quick-note-cancel{
  min-height:42px;padding:9px 14px;border-radius:999px;border:1px solid color-mix(in srgb,var(--foreground) 12%,var(--border));
  background:var(--surface);color:color-mix(in srgb,var(--foreground) 72%,var(--muted));font-size:13px;
  font-weight:700;cursor:pointer;font-family:inherit
}
.case-obs-briefing-quick-note-label{font-size:12px;font-weight:750;color:color-mix(in srgb,var(--foreground) 62%,var(--muted))}
.case-obs-briefing-quick-note-area{
  width:100%;box-sizing:border-box;min-height:72px;padding:11px 12px;border-radius:12px;
  border:1px solid color-mix(in srgb,var(--foreground) 10%,var(--border));font-size:16px;
  background:var(--surface);color:var(--foreground);resize:vertical;font-family:inherit;line-height:1.45
}
.case-obs-briefing-quick-note-area:focus{
  outline:none;border-color:color-mix(in srgb,var(--brand-600) 40%,var(--border));
  box-shadow:0 0 0 3px color-mix(in srgb,var(--brand-600) 12%,transparent)
}
.case-obs-briefing-quick-note-save{
  justify-self:start;min-height:42px;padding:9px 16px;border-radius:999px;border:0;
  background:color-mix(in srgb,var(--foreground) 82%,#000);color:#fff;font-size:13px;
  font-weight:750;cursor:pointer;font-family:inherit
}
.case-obs-briefing-quick-note-save:disabled{opacity:.5;cursor:not-allowed}
.case-obs-briefing-capture-meta{margin:0;font-size:11px;line-height:1.35;color:var(--muted);font-weight:550}
.case-obs-briefing-capture .case-obs-execute-live{
  padding:10px 12px;border-radius:12px;border:1px dashed color-mix(in srgb,var(--brand-600) 28%,var(--border));
  background:color-mix(in srgb,var(--brand-600) 5%,var(--surface))
}
.case-obs-briefing-capture .case-obs-execute-live-text{margin:0;font-size:15px;line-height:1.45;color:var(--foreground)}
.case-obs-briefing-capture .case-obs-execute-error{margin:0;font-size:12px;font-weight:650;color:var(--danger)}
.case-obs-looking-for-field{display:grid;gap:6px}
.case-obs-looking-for-label{font-size:12px;font-weight:700;color:color-mix(in srgb,var(--foreground) 72%,var(--muted))}
.case-obs-looking-for-input{
  width:100%;box-sizing:border-box;min-height:88px;padding:12px 14px;border-radius:12px;
  border:1px solid color-mix(in srgb,var(--foreground) 10%,var(--border));font-size:16px;
  background:var(--surface);color:var(--foreground);resize:vertical;font-family:inherit;line-height:1.45
}
.case-obs-looking-for-chips{
  display:flex;flex-wrap:wrap;gap:8px;margin:0;padding:0;list-style:none
}
.case-obs-looking-for-badge{
  display:inline-flex;align-items:center;
  border:1px solid color-mix(in srgb,var(--brand-600) 22%,var(--border));
  background:color-mix(in srgb,var(--brand-600) 8%,#fff);
  border-radius:999px;padding:8px 14px;font-size:13px;font-weight:700;
  color:var(--brand-700);line-height:1.2;min-height:36px
}
.case-obs-looking-for-chip{
  border:1px solid color-mix(in srgb,var(--foreground) 12%,var(--border));
  background:#fff;
  border-radius:999px;padding:8px 14px;font-size:13px;font-weight:650;
  font-family:inherit;color:var(--foreground);line-height:1.2;min-height:42px
}
.case-obs-looking-for-chip.is-selected{
  border-color:color-mix(in srgb,var(--brand-600) 45%,var(--border));
  background:color-mix(in srgb,var(--brand-600) 10%,#fff);
  color:var(--brand-700);font-weight:750
}
.case-obs-looking-for-save{
  justify-self:start;min-height:44px;padding:10px 16px;border-radius:999px;border:0;
  background:var(--brand-600);color:white;font-size:13px;font-weight:750;cursor:pointer;font-family:inherit
}
.case-obs-looking-for-save:disabled{opacity:.55;cursor:not-allowed}
.case-obs-things-learned-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}
.case-obs-things-learned-count{
  flex:0 0 auto;padding:4px 10px;border-radius:999px;font-size:11px;font-weight:800;
  color:var(--brand-700);background:color-mix(in srgb,var(--brand-600) 12%,#fff);
  border:1px solid color-mix(in srgb,var(--brand-600) 20%,var(--border))
}
.case-obs-things-learned-list{margin:0;padding:0;list-style:none;display:grid;gap:8px}
.case-obs-things-learned-item{
  margin:0;border-radius:12px;border:1px solid color-mix(in srgb,var(--foreground) 6%,var(--border));
  background:color-mix(in srgb,var(--surface-2) 28%,#fff);overflow:hidden
}
.case-obs-things-learned-row{
  width:100%;display:flex;align-items:flex-start;gap:10px;padding:12px 14px;border:0;background:transparent;
  text-align:left;cursor:pointer;font-family:inherit;color:var(--foreground)
}
.case-obs-things-learned-text{flex:1;font-size:14px;line-height:1.45;font-weight:600}
.case-obs-things-learned-chevron{color:var(--muted);font-size:12px;line-height:1.6}
.case-obs-things-learned-sources{
  margin:0;padding:8px 14px 12px 44px;list-style:disc;display:grid;gap:4px;
  font-size:12px;line-height:1.4;color:color-mix(in srgb,var(--foreground) 68%,var(--muted));
  border-top:1px solid color-mix(in srgb,var(--foreground) 6%,var(--border));background:#fff
}
.case-obs-things-learned-more{
  justify-self:start;border:0;background:transparent;padding:0;font-size:13px;font-weight:750;
  color:var(--brand-700);cursor:pointer;font-family:inherit
}
.case-obs-things-learned-check{
  flex:0 0 auto;width:20px;height:20px;display:inline-flex;align-items:center;justify-content:center;
  border-radius:999px;font-size:12px;font-weight:850;line-height:1;
  color:var(--brand-700);background:color-mix(in srgb,var(--brand-600) 14%,var(--surface))
}
.case-obs-things-learned-empty{margin:0;font-size:13px;line-height:1.45;color:var(--muted);font-weight:550}
.case-obs-debrief-planning{display:grid;gap:12px;min-width:0}
.case-obs-debrief-planning-empty{margin:0;font-size:14px;line-height:1.45;font-weight:600;color:color-mix(in srgb,var(--foreground) 58%,var(--muted))}
.case-obs-debrief-planning-topics{display:grid;gap:8px}
.case-obs-debrief-planning-topics-title{margin:0;font-size:12px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;color:color-mix(in srgb,var(--foreground) 62%,var(--muted))}
.case-obs-debrief-planning-topics-list{margin:0;padding:0;list-style:none;display:grid;gap:8px}
.case-obs-debrief-planning-topic{
  margin:0;padding:10px 12px;border-radius:10px;font-size:14px;line-height:1.45;font-weight:600;
  background:color-mix(in srgb,var(--surface-2) 35%,var(--surface));
  border:1px solid color-mix(in srgb,var(--foreground) 6%,var(--border));color:var(--foreground)
}
.case-obs-debrief-planning-cta{
  width:100%;min-height:48px;padding:12px 16px;border-radius:12px;border:none;
  background:color-mix(in srgb,var(--foreground) 84%,#000);color:#fff;font-size:15px;font-weight:800;
  cursor:pointer;font-family:inherit;touch-action:manipulation
}
.case-obs-debrief-planning-cta:disabled{opacity:.5;cursor:not-allowed}
.case-obs-debrief-summary-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}
.case-obs-debrief-summary-badge{
  padding:4px 10px;border-radius:999px;font-size:11px;font-weight:800;color:#047857;
  background:color-mix(in srgb,#059669 12%,#fff);border:1px solid color-mix(in srgb,#059669 24%,var(--border))
}
.case-obs-debrief-summary-stats{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
@media (min-width:640px){.case-obs-debrief-summary-stats{grid-template-columns:repeat(4,minmax(0,1fr))}}
.case-obs-debrief-summary-stat{
  padding:12px;border-radius:12px;border:1px solid color-mix(in srgb,var(--foreground) 6%,var(--border));
  background:color-mix(in srgb,var(--surface-2) 24%,#fff)
}
.case-obs-debrief-summary-stat-value{margin:0;font-size:22px;font-weight:850;line-height:1;color:var(--foreground)}
.case-obs-debrief-summary-stat-label{margin:4px 0 0;font-size:11px;font-weight:650;color:var(--muted)}
.case-obs-debrief-summary-cta{
  width:100%;min-height:48px;padding:12px 16px;border-radius:12px;
  border:1px solid color-mix(in srgb,var(--foreground) 10%,var(--border));background:#fff;
  font-size:15px;font-weight:750;cursor:pointer;font-family:inherit
}
.case-obs-provider-snapshot{
  display:grid;gap:12px;padding:16px;border-radius:16px;border:1px solid color-mix(in srgb,var(--foreground) 8%,var(--border));background:#fff
}
.case-obs-provider-snapshot-list{margin:0;padding:0;list-style:none;display:grid;gap:10px}
.case-obs-provider-snapshot-item{
  padding:12px 14px;border-radius:12px;border:1px solid color-mix(in srgb,var(--foreground) 6%,var(--border));
  background:color-mix(in srgb,var(--surface-2) 20%,#fff)
}
.case-obs-provider-snapshot-item-title{margin:0 0 4px;font-size:12px;font-weight:800;letter-spacing:.03em;text-transform:uppercase;color:color-mix(in srgb,var(--foreground) 58%,var(--muted))}
.case-obs-provider-snapshot-item-summary{margin:0;font-size:14px;line-height:1.45;font-weight:600;color:var(--foreground)}
.case-obs-provider-snapshot-link{
  justify-self:start;border:0;background:transparent;padding:0;font-size:13px;font-weight:750;
  color:var(--brand-700);cursor:pointer;font-family:inherit
}
@media (max-width:700px){
  .case-obs-briefing-section{padding:12px 10px}
  .case-obs-looking-for-chip{flex:1 1 calc(50% - 8px);text-align:center}
}
`;
