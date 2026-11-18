export const productSupportCaseBriefingCss = `

.case-ps-briefing-grid{

  display:grid;gap:14px;min-width:0;

  grid-template-columns:minmax(0,1fr);

}

@media (min-width:900px){

  .case-ps-briefing-grid{grid-template-columns:repeat(2,minmax(0,1fr))}

  .case-ps-briefing-card--quick-actions{grid-column:span 1}

}

.case-ps-briefing-card{

  display:grid;gap:10px;padding:16px;border-radius:var(--mc-radius-lg,16px);

  border:1px solid var(--mc-border,#c9d2df);

  background:var(--mc-surface,#fff);min-width:0;box-shadow:var(--mc-elev-surface,0 2px 8px rgba(15,23,42,.05))

}

.case-ps-briefing-card--accent{

  border-color:color-mix(in srgb,var(--mc-accent,var(--brand-600)) 24%,var(--mc-border,#c9d2df));

  background:linear-gradient(165deg,color-mix(in srgb,var(--mc-accent,var(--brand-600)) 7%,#fff) 0%,#fff 48%)

}

.case-ps-briefing-card-head{display:flex;align-items:flex-start;justify-content:space-between;gap:8px}

.case-ps-briefing-card-title{

  margin:0;font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;line-height:1.25;

  color:color-mix(in srgb,var(--mc-accent,var(--brand-600)) 70%,var(--mc-ink,#0b1220))

}

.case-ps-briefing-card-lead{margin:0;font-size:12px;line-height:1.4;font-weight:550;color:var(--mc-meta,#64748b)}

.case-ps-briefing-list{margin:0;padding:0;list-style:none;display:grid;gap:8px}

.case-ps-briefing-list li{

  display:flex;align-items:flex-start;gap:8px;font-size:13px;font-weight:650;line-height:1.35;color:var(--mc-ink,#0b1220)

}

.case-ps-planned-row{align-items:center;justify-content:space-between;gap:10px}

.case-ps-planned-row span{min-width:0}

.case-ps-planned-remove{

  flex-shrink:0;min-height:44px;padding:0 8px;border:none;background:none;

  font-size:13px;font-weight:750;color:var(--danger,#b91c1c);cursor:pointer;font-family:inherit

}

.case-ps-planned-remove:disabled{opacity:.55;cursor:not-allowed}

.case-ps-planned-confirm{

  display:grid;gap:8px;padding:10px 12px;border-radius:12px;

  border:1px solid color-mix(in srgb,var(--danger,#b91c1c) 22%,var(--mc-border,#c9d2df));

  background:color-mix(in srgb,var(--danger,#b91c1c) 6%,#fff)

}

.case-ps-planned-confirm-actions{display:flex;flex-wrap:wrap;gap:8px}

.case-ps-planned-confirm-actions .case-ps-briefing-secondary-btn{width:auto;min-width:88px}

.case-ps-planned-remove-confirm{

  min-height:46px;padding:10px 14px;border-radius:12px;border:none;

  background:var(--danger,#b91c1c);color:#fff;font-size:14px;font-weight:750;cursor:pointer;font-family:inherit

}

.case-ps-planned-remove-confirm:disabled{opacity:.55;cursor:not-allowed}

.case-ps-briefing-check{

  flex-shrink:0;width:18px;height:18px;border-radius:999px;

  background:color-mix(in srgb,var(--mc-accent,var(--brand-600)) 14%,#f8fafc);

  color:color-mix(in srgb,var(--mc-accent,var(--brand-600)) 88%,#000);

  display:inline-flex;align-items:center;justify-content:center;font-size:11px;font-weight:900

}

.case-ps-briefing-bullet::before{content:"•";color:var(--mc-accent,var(--brand-600));font-weight:900;margin-right:2px}

.case-ps-briefing-signal::before{content:"🔥";margin-right:4px}

.case-ps-briefing-link{

  justify-self:start;display:inline-flex;align-items:center;min-height:44px;
  padding:0;border:none;background:none;font-size:13px;font-weight:750;

  color:color-mix(in srgb,var(--mc-accent,var(--brand-600)) 88%,#000);cursor:pointer;

  text-decoration:underline;text-underline-offset:2px;font-family:inherit

}

.case-ps-briefing-snapshot{display:grid;gap:6px}

.case-ps-briefing-snapshot-row{display:flex;justify-content:space-between;gap:12px;font-size:13px;line-height:1.35}

.case-ps-briefing-snapshot-label{color:var(--mc-meta,#64748b);font-weight:650}

.case-ps-briefing-snapshot-value{font-weight:750;color:var(--mc-ink,#0b1220);text-align:right}

.case-ps-briefing-actions{display:grid;gap:10px}

.case-ps-briefing-dictate-btn{

  width:100%;min-height:72px;padding:14px 16px;border-radius:14px;border:none;

  background:linear-gradient(180deg,var(--brand-600),color-mix(in srgb,var(--brand-700) 92%,#000));

  color:#fff;font-size:18px;font-weight:850;cursor:pointer;font-family:inherit;

  box-shadow:0 6px 20px color-mix(in srgb,var(--brand-600) 32%,transparent)

}

.case-ps-briefing-dictate-btn:disabled{opacity:.55;cursor:not-allowed}

.case-ps-briefing-secondary-btn{

  width:100%;min-height:46px;padding:10px 14px;border-radius:12px;

  border:1px solid color-mix(in srgb,var(--mc-accent,var(--brand-600)) 28%,var(--mc-border,#c9d2df));

  background:#fff;color:color-mix(in srgb,var(--mc-accent,var(--brand-600)) 88%,#000);

  font-size:14px;font-weight:750;cursor:pointer;font-family:inherit

}

.case-ps-briefing-secondary-btn:disabled{opacity:.55;cursor:not-allowed}

.case-ps-field-notes-stack{display:grid;gap:14px;max-width:920px;min-width:0}

.case-ps-field-notes-capture{

  display:grid;gap:12px;padding:16px;border-radius:var(--mc-radius-md,12px);

  border:1px solid color-mix(in srgb,var(--mc-accent,var(--brand-600)) 12%,var(--mc-border,#c9d2df));

  background:linear-gradient(180deg,color-mix(in srgb,var(--mc-accent,var(--brand-600)) 5%,#fff) 0%,#fff 100%)

}

.case-ps-field-notes-or{margin:0;text-align:center;font-size:10px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:var(--mc-meta,#64748b)}

.case-ps-field-notes-quick{display:grid;gap:6px}

.case-ps-field-notes-area{

  width:100%;box-sizing:border-box;min-height:88px;padding:12px;border-radius:12px;

  border:1px solid var(--mc-border,#c9d2df);font-size:16px;background:#fff;

  color:var(--mc-ink,#0b1220);resize:vertical;font-family:inherit;line-height:1.45;

  box-shadow:inset 0 1px 2px color-mix(in srgb,var(--mc-ink,#0b1220) 4%,transparent)

}

.case-ps-field-notes-save{

  justify-self:start;min-height:42px;padding:9px 16px;border-radius:999px;border:0;

  background:linear-gradient(180deg,var(--mc-ink,#1e293b),#0f172a);color:#fff;

  font-size:13px;font-weight:750;cursor:pointer;font-family:inherit;

  box-shadow:0 4px 12px rgba(15,23,42,.18)

}

.case-ps-field-notes-save:disabled{opacity:.5;cursor:not-allowed}

.case-ps-field-notes-meta{margin:0;font-size:11px;line-height:1.35;color:var(--mc-meta,#64748b);font-weight:550}

.case-ps-field-notes-timeline{

  display:grid;gap:0;border-radius:var(--mc-radius-md,12px);overflow:hidden;

  border:1px solid var(--mc-border,#c9d2df);background:#fff

}

.case-ps-field-notes-item{

  display:grid;gap:4px;padding:12px 14px;

  border-bottom:1px solid color-mix(in srgb,var(--mc-border,#c9d2df) 80%,transparent);

  background:linear-gradient(180deg,#fff 0%,#fafcff 100%)

}

.case-ps-field-notes-item:last-child{border-bottom:none}

.case-ps-field-notes-time{margin:0;font-size:11px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;color:var(--mc-accent,var(--brand-700))}

.case-ps-field-notes-body{margin:0;font-size:15px;font-weight:650;line-height:1.45;color:var(--mc-ink,#0b1220)}

.case-ps-tab-panel{min-width:0;padding-top:4px}

.case-ps-intel-section{

  display:grid;gap:8px;padding:14px;border-radius:var(--mc-radius-md,12px);

  border:1px solid var(--mc-border,#c9d2df);background:#fff;

  box-shadow:var(--mc-elev-panel,0 4px 16px rgba(15,23,42,.05))

}

.case-ps-intel-section-title{

  margin:0;font-size:10px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;

  color:color-mix(in srgb,var(--mc-accent,var(--brand-600)) 70%,var(--mc-ink,#0b1220))

}

.case-ps-intel-item{display:grid;gap:2px;padding:8px 0;border-top:1px solid color-mix(in srgb,var(--mc-border,#c9d2df) 80%,transparent)}

.case-ps-intel-item:first-of-type{border-top:none;padding-top:0}

.case-ps-intel-text{margin:0;font-size:14px;font-weight:650;line-height:1.4;color:var(--mc-ink,#0b1220)}

.case-ps-intel-source{margin:0;font-size:11px;font-weight:650;color:var(--mc-meta,#64748b)}

.case-ps-doc-grid{display:grid;gap:10px;grid-template-columns:repeat(auto-fill,minmax(220px,1fr))}

.case-ps-doc-card{

  display:grid;gap:6px;padding:14px;border-radius:var(--mc-radius-md,12px);

  border:1px solid var(--mc-border,#c9d2df);background:#fff;cursor:pointer;text-align:left;font-family:inherit;

  box-shadow:var(--mc-elev-surface,0 2px 8px rgba(15,23,42,.05));

  transition:border-color .15s ease,box-shadow .15s ease

}

.case-ps-doc-card:hover{

  border-color:color-mix(in srgb,var(--mc-accent,var(--brand-600)) 35%,var(--mc-border,#c9d2df));

  box-shadow:0 6px 18px color-mix(in srgb,var(--mc-accent,var(--brand-600)) 12%,transparent)

}

.case-ps-doc-type{margin:0;font-size:10px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--mc-meta,#64748b)}

.case-ps-doc-name{margin:0;font-size:14px;font-weight:750;line-height:1.3;color:var(--mc-ink,#0b1220)}

.case-ps-products-stack{display:grid;gap:14px;max-width:920px}

.case-ps-product-line{

  display:grid;gap:8px;padding:12px;border-radius:var(--mc-radius-md,12px);

  border:1px solid var(--mc-border,#c9d2df);background:#fff;

  box-shadow:var(--mc-elev-surface,0 2px 8px rgba(15,23,42,.05))

}

.case-ps-follow-list{margin:0;padding:0;list-style:none;display:grid;gap:10px}

.case-ps-follow-list li{

  padding:12px 14px;border-radius:var(--mc-radius-md,12px);

  border:1px solid var(--mc-border,#c9d2df);background:#fff;

  font-size:13px;font-weight:650;line-height:1.35;color:var(--mc-ink,#0b1220);

  box-shadow:var(--mc-elev-surface,0 2px 8px rgba(15,23,42,.05))

}

.case-ps-follow-source{display:block;margin-top:4px;font-size:11px;font-weight:650;color:var(--mc-meta,#64748b)}

.case-ps-capture-outcome-list{margin:0;padding:0;list-style:none;display:flex;flex-wrap:wrap;gap:6px}

.case-ps-capture-outcome-badge{
  display:inline-flex;align-items:center;padding:5px 10px;border-radius:999px;
  border:1px solid color-mix(in srgb,var(--mc-accent,#0d9488) 24%,var(--mc-border,#c9d2df));
  background:color-mix(in srgb,var(--mc-accent,#0d9488) 10%,#fff);
  font-size:11px;font-weight:800;line-height:1.3;color:var(--mc-ink,#0b1220)
}

.case-ps-capture-finding-list{margin:0;padding:0;list-style:none;display:grid;gap:8px}

.case-ps-capture-finding-item{
  padding:8px 10px;border-radius:10px;border:1px solid color-mix(in srgb,var(--mc-accent,#0d9488) 16%,var(--mc-border,#c9d2df));
  background:#fff;font-size:12px;font-weight:650;line-height:1.4;color:var(--mc-ink,#0b1220)
}

`;


