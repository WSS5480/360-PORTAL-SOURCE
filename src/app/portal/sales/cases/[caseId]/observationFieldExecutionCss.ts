export const observationFieldExecutionCss = `

.case-obs-execution{display:grid;gap:18px;min-width:0}

.case-obs-briefing-tab{display:grid;gap:10px;min-width:0}

.case-obs-execution-block{

  display:grid;gap:10px;padding:12px 14px;border-radius:var(--mc-radius-md,12px);

  border:1px solid color-mix(in srgb,var(--mc-accent,#0d9488) 10%,var(--mc-border,#c9d2df));

  background:linear-gradient(180deg,color-mix(in srgb,var(--mc-accent,#0d9488) 4%,#fff) 0%,#fff 70%)

}

.case-obs-execution-heading{

  margin:0;font-size:10px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;

  color:color-mix(in srgb,var(--mc-accent,#0d9488) 70%,var(--mc-ink,#0b1220))

}

.case-obs-execution-focus-chips{display:flex;flex-wrap:wrap;gap:8px}

.case-obs-execution-focus-chip{

  display:inline-flex;align-items:center;padding:7px 12px;border-radius:999px;

  border:1px solid color-mix(in srgb,var(--mc-accent,#0d9488) 22%,var(--mc-border,#c9d2df));

  background:color-mix(in srgb,var(--mc-accent,#0d9488) 8%,#fff);

  font-size:12px;font-weight:750;line-height:1.25;

  color:color-mix(in srgb,var(--mc-accent,#0d9488) 82%,var(--mc-ink,#0b1220));

  box-shadow:0 1px 0 color-mix(in srgb,var(--mc-accent,#0d9488) 8%,transparent)

}

.case-obs-execution-mission{

  margin:0;font-size:17px;font-weight:800;line-height:1.4;letter-spacing:-.01em;color:var(--mc-ink,#0b1220)

}

.case-obs-execution-primary{

  width:100%;min-height:56px;padding:14px 18px;border:none;border-radius:14px;

  background:linear-gradient(180deg,var(--brand-600,#0d9488),color-mix(in srgb,var(--brand-700,#0f766e) 92%,#000));

  color:#fff;font-size:17px;font-weight:850;cursor:pointer;font-family:inherit;

  box-shadow:0 6px 20px color-mix(in srgb,var(--brand-600,#0d9488) 32%,transparent)

}

.case-obs-execution-primary--briefing{

  min-height:46px;padding:11px 16px;border-radius:12px;font-size:15px;font-weight:800;

  box-shadow:0 4px 14px color-mix(in srgb,var(--brand-600,#0d9488) 26%,transparent)

}

.case-obs-execution-primary:disabled{opacity:.55;cursor:not-allowed}

.case-obs-execution-insight-section{

  display:grid;gap:8px;padding:12px 14px;border-radius:var(--mc-radius-md,12px);

  border:1px solid var(--mc-border,#c9d2df);background:#fff;

  box-shadow:var(--mc-elev-panel,0 4px 16px rgba(15,23,42,.05))

}

.case-obs-execution-insight-list{margin:0;padding:0;list-style:none;display:grid;gap:8px}

.case-obs-execution-insight-list li{

  position:relative;padding:8px 10px 8px 28px;font-size:14px;font-weight:650;line-height:1.4;

  color:var(--mc-ink-soft,#334155);border-radius:8px;

  background:color-mix(in srgb,var(--mc-accent,#0d9488) 4%,#f8fafc)

}

.case-obs-execution-insight-list li::before{

  content:"";position:absolute;left:10px;top:.72em;width:8px;height:8px;border-radius:999px;

  background:var(--mc-accent,#0d9488);box-shadow:0 0 8px color-mix(in srgb,var(--mc-accent,#0d9488) 45%,transparent)

}

.case-obs-execution-empty{margin:0;font-size:14px;font-weight:600;line-height:1.45;color:var(--mc-meta,#64748b)}

.case-obs-execution-empty--lead{padding-bottom:4px;font-size:15px}

.case-obs-execution-note-stream{

  display:grid;gap:0;border-radius:var(--mc-radius-md,12px);overflow:hidden;

  border:1px solid var(--mc-border,#c9d2df);background:#fff

}

.case-obs-execution-note-item{

  padding:12px 14px;border-bottom:1px solid color-mix(in srgb,var(--mc-border,#c9d2df) 80%,transparent);

  background:linear-gradient(180deg,#fff 0%,#fafcff 100%)

}

.case-obs-execution-note-item:last-child{border-bottom:none}

.case-obs-execution-note-time{margin:0 0 4px;font-size:11px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;color:var(--mc-accent,#0d9488)}

.case-obs-execution-note-body{margin:0;font-size:15px;font-weight:650;line-height:1.45;color:var(--mc-ink,#0b1220)}

.case-obs-execution-complete-summary{

  display:grid;gap:12px;padding:16px;border-radius:var(--mc-radius-md,12px);

  border:1px solid color-mix(in srgb,#16a34a 24%,var(--mc-border,#c9d2df));

  background:linear-gradient(165deg,color-mix(in srgb,#16a34a 8%,#fff) 0%,#fff 55%);

  box-shadow:0 8px 24px color-mix(in srgb,#16a34a 12%,transparent)

}

.case-obs-execution-complete-title{margin:0;font-size:18px;font-weight:900;line-height:1.25;color:var(--mc-ink,#0b1220)}

.case-obs-execution-complete-meta{margin:0;font-size:13px;font-weight:650;color:var(--mc-meta,#64748b)}

.case-obs-execution-complete-stats{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin:0}

.case-obs-execution-complete-stat{

  display:grid;gap:4px;min-width:0;padding:10px 12px;border-radius:10px;

  background:color-mix(in srgb,#16a34a 6%,#f8fafc);border:1px solid color-mix(in srgb,#16a34a 14%,var(--mc-border,#c9d2df))

}

.case-obs-execution-complete-stat dt{margin:0;font-size:10px;font-weight:750;letter-spacing:.06em;text-transform:uppercase;color:var(--mc-meta,#64748b)}

.case-obs-execution-complete-stat dd{margin:0;font-size:22px;font-weight:900;line-height:1.1;color:var(--mc-ink,#0b1220)}

.case-obs-execution-capture{

  display:grid;gap:10px;padding:12px 14px;border-radius:var(--mc-radius-md,12px);

  border:1px solid color-mix(in srgb,var(--mc-accent,#0d9488) 12%,var(--mc-border,#c9d2df));

  background:linear-gradient(180deg,color-mix(in srgb,var(--mc-accent,#0d9488) 5%,#fff) 0%,#fff 100%)

}

.case-obs-briefing-capture{

  display:grid;gap:8px;padding:12px 14px;border-radius:var(--mc-radius-md,12px);

  border:1px solid color-mix(in srgb,var(--mc-accent,#0d9488) 10%,var(--mc-border,#c9d2df));

  background:#fff;

  box-shadow:var(--mc-elev-panel,0 2px 10px rgba(15,23,42,.04))

}

.case-obs-briefing-capture-title{

  margin:0;font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;

  color:color-mix(in srgb,var(--mc-accent,#0d9488) 68%,var(--mc-ink,#0b1220))

}

.case-obs-briefing-capture-body{display:grid;gap:8px}

.case-obs-execution-or{margin:0;text-align:center;font-size:10px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:var(--mc-meta,#64748b)}

.case-obs-execution-quick{display:grid;gap:6px}

.case-obs-execution-quick-area{

  width:100%;box-sizing:border-box;min-height:88px;padding:12px;border-radius:12px;

  border:1px solid var(--mc-border,#c9d2df);font-size:16px;background:#fff;

  color:var(--mc-ink,#0b1220);resize:vertical;font-family:inherit;line-height:1.45;

  box-shadow:inset 0 1px 2px color-mix(in srgb,var(--mc-ink,#0b1220) 4%,transparent)

}

.case-obs-execution-quick-save{

  justify-self:start;min-height:42px;padding:9px 16px;border-radius:999px;border:0;

  background:linear-gradient(180deg,var(--mc-ink,#1e293b),#0f172a);color:#fff;

  font-size:13px;font-weight:750;cursor:pointer;font-family:inherit;

  box-shadow:0 4px 12px rgba(15,23,42,.18)

}

.case-obs-execution-quick-save:disabled{opacity:.5;cursor:not-allowed}

.case-obs-execution-meta{margin:0;font-size:11px;line-height:1.35;color:var(--mc-meta,#64748b);font-weight:550}

.case-obs-capture-feedback{
  display:grid;gap:7px;padding:10px 12px;border-radius:12px;
  border:1px solid color-mix(in srgb,var(--mc-accent,#0d9488) 20%,var(--mc-border,#c9d2df));
  background:color-mix(in srgb,var(--mc-accent,#0d9488) 5%,#fff)
}

.case-obs-capture-feedback-title{
  margin:0;font-size:10px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;
  color:color-mix(in srgb,var(--mc-accent,#0d9488) 72%,var(--mc-ink,#0b1220))
}

.case-obs-capture-feedback-list{margin:0;padding:0;list-style:none;display:flex;flex-wrap:wrap;gap:6px}

.case-obs-capture-feedback-chip{
  display:inline-flex;align-items:center;max-width:100%;padding:6px 11px;border-radius:999px;
  border:1px solid color-mix(in srgb,var(--mc-accent,#0d9488) 22%,var(--mc-border,#c9d2df));
  background:#fff;font-size:12px;font-weight:700;line-height:1.3;
  color:color-mix(in srgb,var(--mc-accent,#0d9488) 78%,var(--mc-ink,#0b1220));
  overflow-wrap:anywhere
}

.case-obs-capture-saved{
  margin:0;padding:8px 12px;border-radius:10px;font-size:13px;font-weight:700;line-height:1.35;
  color:color-mix(in srgb,var(--mc-accent,#0d9488) 82%,var(--mc-ink,#0b1220));
  background:color-mix(in srgb,var(--mc-accent,#0d9488) 8%,#fff);
  border:1px solid color-mix(in srgb,var(--mc-accent,#0d9488) 18%,var(--mc-border,#c9d2df))
}

.case-obs-mark-complete-nudge{
  display:grid;gap:8px;padding:10px 12px;border-radius:12px;
  border:1px solid color-mix(in srgb,var(--mc-ink,#0b1220) 10%,var(--mc-border,#c9d2df));
  background:color-mix(in srgb,var(--mc-ink,#0b1220) 3%,#fff)
}

.case-obs-mark-complete-nudge__text{margin:0;font-size:12px;line-height:1.4;color:var(--mc-ink,#0b1220);font-weight:600}

.case-obs-mark-complete-nudge__btn{
  justify-self:start;min-height:38px;padding:8px 14px;border-radius:999px;border:0;
  background:linear-gradient(180deg,var(--mc-accent,#0d9488),#0f766e);color:#fff;
  font-size:12px;font-weight:750;cursor:pointer;font-family:inherit
}

.case-obs-mark-complete-nudge__btn:disabled{opacity:.55;cursor:not-allowed}

.case-obs-case-brief{
  display:grid;gap:10px;padding:12px 14px;border-radius:var(--mc-radius-md,12px);
  border:1px solid color-mix(in srgb,var(--mc-accent,#0d9488) 12%,var(--mc-border,#c9d2df));
  background:#fff;
  box-shadow:var(--mc-elev-panel,0 2px 10px rgba(15,23,42,.04))
}

.case-obs-case-brief-title{
  margin:0;font-size:11px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;
  color:color-mix(in srgb,var(--mc-accent,#0d9488) 72%,var(--mc-ink,#0b1220))
}

.case-obs-case-brief-body{display:grid;gap:12px}

.case-obs-case-brief-primary{
  display:grid;gap:8px;padding:14px 16px;border-radius:12px;
  background:linear-gradient(135deg,color-mix(in srgb,var(--mc-accent,#0d9488) 10%,#fff) 0%,#fff 70%);
  border:1.5px solid color-mix(in srgb,var(--mc-accent,#0d9488) 28%,var(--mc-border,#c9d2df));
  box-shadow:0 4px 14px color-mix(in srgb,var(--mc-accent,#0d9488) 12%,transparent)
}

.case-obs-case-brief-primary-label{
  margin:0;font-size:11px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;
  color:color-mix(in srgb,var(--mc-accent,#0d9488) 85%,var(--mc-ink,#0b1220))
}

.case-obs-case-brief-why{
  display:grid;gap:6px;padding:10px 12px;border-radius:10px;
  background:color-mix(in srgb,var(--mc-accent,#0d9488) 4%,#fff);
  border:1px solid color-mix(in srgb,var(--mc-border,#c9d2df) 90%,transparent)
}

.case-obs-case-brief-why-text{
  margin:0;font-size:13px;font-weight:600;line-height:1.5;color:var(--mc-ink-soft,#334155)
}

.case-obs-case-brief-supporting{
  display:grid;gap:12px;
}

@media (min-width:720px){
  .case-obs-case-brief-supporting{grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:14px}
}

.case-obs-case-brief-grid{
  display:grid;gap:12px;
}

@media (min-width:720px){
  .case-obs-case-brief-grid{grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:14px}
}

.case-obs-case-brief-panel{display:grid;gap:6px;align-content:start}

.case-obs-case-brief-label{
  margin:0;font-size:10px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;
  color:var(--mc-meta,#64748b)
}

.case-obs-case-brief-list{
  margin:0;padding:0;list-style:none;display:grid;gap:5px
}

.case-obs-case-brief-list-item{
  display:grid;grid-template-columns:14px minmax(0,1fr);gap:8px;align-items:start;
  margin:0;font-size:12px;font-weight:600;line-height:1.4;color:var(--mc-ink-soft,#334155)
}

.case-obs-case-brief-icon{
  display:block;position:relative;width:12px;height:12px;margin-top:2px;border-radius:999px;flex-shrink:0
}

.case-obs-case-brief-list--known .case-obs-case-brief-icon{
  border:1.5px solid color-mix(in srgb,var(--mc-accent,#0d9488) 55%,var(--mc-border,#c9d2df));
  background:color-mix(in srgb,var(--mc-accent,#0d9488) 12%,#fff);
  box-shadow:inset 0 0 0 2px #fff;
}

.case-obs-case-brief-list--known .case-obs-case-brief-icon::after{
  content:"";display:block;width:4px;height:7px;margin:1px 0 0 3px;
  border-right:1.5px solid color-mix(in srgb,var(--mc-accent,#0d9488) 80%,#0b1220);
  border-bottom:1.5px solid color-mix(in srgb,var(--mc-accent,#0d9488) 80%,#0b1220);
  transform:rotate(45deg)
}

.case-obs-case-brief-list--missing .case-obs-case-brief-icon{
  border:1.5px solid color-mix(in srgb,var(--mc-meta,#64748b) 45%,var(--mc-border,#c9d2df));
  background:#fff
}

.case-obs-case-brief-list--focus .case-obs-case-brief-list-item{
  font-size:13px;font-weight:700;line-height:1.45;color:var(--mc-ink,#0b1220)
}

.case-obs-case-brief-list--focus .case-obs-case-brief-icon{
  border:none;
  background:color-mix(in srgb,var(--mc-accent,#0d9488) 22%,#fff);
  box-shadow:0 0 0 2px color-mix(in srgb,var(--mc-accent,#0d9488) 18%,#fff)
}

.case-obs-case-brief-list--focus .case-obs-case-brief-icon::after{
  content:"";display:block;width:0;height:0;margin:3px 0 0 4px;
  border-top:3px solid transparent;border-bottom:3px solid transparent;
  border-left:5px solid color-mix(in srgb,var(--mc-accent,#0d9488) 80%,#0b1220)
}

.case-obs-case-brief-focus{
  padding:10px 12px;border-radius:10px;
  background:color-mix(in srgb,var(--mc-accent,#0d9488) 7%,#fff);
  border:1px solid color-mix(in srgb,var(--mc-accent,#0d9488) 14%,var(--mc-border,#c9d2df))
}

.case-obs-case-brief-focus-text{
  display:grid;grid-template-columns:16px minmax(0,1fr);gap:8px;align-items:start;
  margin:4px 0 0;font-size:13px;font-weight:650;line-height:1.45;color:var(--mc-ink,#0b1220)
}

.case-obs-case-brief-focus-icon{
  width:14px;height:14px;margin-top:1px;border-radius:999px;
  background:color-mix(in srgb,var(--mc-accent,#0d9488) 18%,#fff);
  border:1.5px solid color-mix(in srgb,var(--mc-accent,#0d9488) 45%,var(--mc-border,#c9d2df));
  position:relative
}

.case-obs-case-brief-focus-icon::before{
  content:"";position:absolute;left:50%;top:2px;width:1.5px;height:5px;transform:translateX(-50%);
  background:color-mix(in srgb,var(--mc-accent,#0d9488) 75%,#0b1220);border-radius:999px
}

.case-obs-case-brief-focus-icon::after{
  content:"";position:absolute;left:50%;bottom:2px;width:3px;height:3px;transform:translateX(-50%);
  background:color-mix(in srgb,var(--mc-accent,#0d9488) 75%,#0b1220);border-radius:999px
}

.case-obs-case-focus{
  display:grid;gap:10px;padding:12px 14px;border-radius:var(--mc-radius-md,12px);
  border:1px solid color-mix(in srgb,var(--mc-accent,#0d9488) 12%,var(--mc-border,#c9d2df));
  background:#fff;
  box-shadow:var(--mc-elev-panel,0 2px 10px rgba(15,23,42,.04))
}

.case-obs-case-focus-title{
  margin:0;font-size:11px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;
  color:color-mix(in srgb,var(--mc-accent,#0d9488) 72%,var(--mc-ink,#0b1220))
}

.case-obs-case-focus-body{display:grid;gap:10px}

.case-obs-case-focus-section{display:grid;gap:4px}

.case-obs-case-focus-label{
  margin:0;font-size:10px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;
  color:var(--mc-meta,#64748b)
}

.case-obs-case-focus-primary{
  margin:0;font-size:15px;font-weight:750;line-height:1.35;letter-spacing:-.01em;color:var(--mc-ink,#0b1220)
}

.case-obs-case-focus-why{
  margin:0;font-size:13px;font-weight:600;line-height:1.4;color:var(--mc-ink-soft,#475569)
}

.case-obs-case-focus-cue-row{display:flex;flex-wrap:wrap;gap:6px}

.case-obs-case-focus-cue{
  display:inline-flex;align-items:center;max-width:100%;padding:5px 10px;border-radius:999px;
  border:1px solid color-mix(in srgb,var(--mc-accent,#0d9488) 18%,var(--mc-border,#c9d2df));
  background:color-mix(in srgb,var(--mc-accent,#0d9488) 6%,#fff);
  font-size:12px;font-weight:650;line-height:1.3;color:var(--mc-ink-soft,#334155)
}

.case-obs-case-focus-prior-list{margin:0;padding:0;list-style:none;display:grid;gap:3px}

.case-obs-case-focus-prior-item{
  margin:0;font-size:12px;font-weight:600;line-height:1.35;color:var(--mc-meta,#64748b)
}

.case-obs-case-focus-grid{display:grid;gap:14px}

@media (min-width:720px){
  .case-obs-case-focus-grid{grid-template-columns:minmax(0,1.1fr) minmax(0,.9fr);gap:18px}
}

.case-obs-case-focus-col{display:grid;gap:12px;align-content:start}

.case-obs-case-focus-block{display:grid;gap:6px}

.case-obs-case-focus-list{margin:0;padding:0;list-style:none;display:grid;gap:5px}

.case-obs-case-focus-list-item{
  position:relative;margin:0;padding:0 0 0 14px;font-size:13px;font-weight:650;line-height:1.45;
  color:var(--mc-ink-soft,#334155)
}

.case-obs-case-focus-list-item::before{
  content:"";position:absolute;left:0;top:.62em;width:5px;height:5px;border-radius:999px;
  background:color-mix(in srgb,var(--mc-accent,#0d9488) 55%,var(--mc-ink-soft,#64748b))
}

.case-obs-case-focus-goal{
  margin:0;font-size:13px;font-weight:650;line-height:1.45;color:var(--mc-ink-soft,#334155)
}

`;


