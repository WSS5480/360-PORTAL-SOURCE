/** Shared layout tokens for New Surgical Case — light mission workflow, minimal nesting. */

export const newCaseLayoutCss = `
.new-case-layout{display:grid;grid-template-columns:minmax(0,1fr) 252px;gap:8px;align-items:start;overflow-x:clip;max-width:100%}
.new-case-form{display:grid;gap:6px}
.new-case-phi-banner{margin:0;display:flex;flex-wrap:wrap;align-items:center;gap:3px 5px;padding:3px 7px;border-radius:6px;font-size:10px;line-height:1.35;font-weight:600;color:color-mix(in srgb,var(--foreground) 70%,var(--muted));border:1px solid color-mix(in srgb,var(--foreground) 8%,var(--border));background:color-mix(in srgb,var(--surface-2) 24%,var(--surface));min-height:0}
.new-case-phi-banner-label{font-weight:750;color:var(--foreground);letter-spacing:.015em;white-space:nowrap}
.new-case-panel{border:1px solid color-mix(in srgb,var(--foreground) 10%,var(--border));border-radius:10px;padding:6px 7px;display:grid;gap:5px;background:var(--surface)}
.new-case-card{border:1px solid color-mix(in srgb,var(--foreground) 10%,var(--border));border-radius:10px;padding:6px 7px;display:grid;gap:5px;background:var(--surface)}
.new-case-mission-workflow{display:grid;gap:4px;border:1px solid color-mix(in srgb,var(--foreground) 9%,var(--border));border-radius:12px;padding:5px 6px;background:color-mix(in srgb,var(--surface-2) 18%,var(--surface))}
.new-case-mission-workflow .new-case-mission-checklist{margin:0 0 2px;padding-bottom:4px;border-bottom:1px solid color-mix(in srgb,var(--foreground) 6%,var(--border))}
.new-case-mission-checklist{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:5px;overflow-x:auto;padding-bottom:1px}
.new-case-mission-checklist-item{border:0;border-radius:8px;padding:6px 7px;background:color-mix(in srgb,var(--surface-2) 30%,transparent);display:grid;gap:3px;min-width:160px;text-align:left;cursor:pointer;min-height:44px}
.new-case-mission-checklist-item.status-complete{background:color-mix(in srgb,var(--brand-600) 5%,transparent)}
.new-case-mission-checklist-item.status-attention{background:color-mix(in srgb,#f59e0b 7%,transparent)}
.new-case-mission-checklist-item:hover{background:color-mix(in srgb,var(--brand-600) 6%,var(--surface))}
.new-case-mission-checklist-item:focus-visible{outline:2px solid color-mix(in srgb,var(--brand-600) 55%,transparent);outline-offset:1px}
.new-case-mission-checklist-head{display:flex;align-items:center;gap:6px}
.new-case-mission-checklist-title{font-size:11px;font-weight:780;color:var(--foreground)}
.new-case-mission-checklist-icon{margin-left:auto;font-size:11px;font-weight:900;color:color-mix(in srgb,var(--foreground) 72%,var(--muted))}
.new-case-mission-checklist-summary{font-size:10px;line-height:1.35;color:var(--muted);display:-webkit-box;-webkit-line-clamp:2;line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.new-case-section{display:grid;gap:5px;padding:0 0 5px;border-bottom:1px solid color-mix(in srgb,var(--foreground) 5%,var(--border))}
.new-case-section:last-child{border-bottom:0;padding-bottom:0}
.new-case-section--emphasis{padding:5px 0 6px;border-bottom:0;border-left:2px solid color-mix(in srgb,var(--brand-600) 55%,var(--border));padding-left:8px}
.new-case-title{margin:0;font-weight:800;font-size:12px;letter-spacing:.01em;line-height:1.25}
.new-case-fields-2{display:grid;grid-template-columns:1fr 1fr;gap:5px}
.quick-add-procedure-chips{display:flex;flex-wrap:wrap;gap:6px}
.quick-add-procedure-chip{border-radius:999px;padding:5px 12px;font-size:11px;font-weight:750;line-height:1.3;cursor:pointer;font-family:inherit;border:1px solid color-mix(in srgb,var(--foreground) 10%,var(--border));background:#fff;color:color-mix(in srgb,var(--foreground) 78%,var(--muted));box-shadow:0 1px 3px rgba(15,23,42,.04);transition:transform .13s ease,border-color .13s ease,background .13s ease,color .13s ease}
.quick-add-procedure-chip:hover{transform:translateY(-1px);border-color:rgba(13,148,136,.4);color:#0f766e}
.quick-add-procedure-chip.is-selected{border-color:rgba(13,148,136,.5);background:linear-gradient(180deg,#f0fdfa,#ccfbf1);color:#0f766e;box-shadow:0 0 0 1px rgba(13,148,136,.2)}
.new-case-field-label{display:grid;gap:6px}
.new-case-field-label--next{border-radius:8px;padding:4px 5px;margin:-4px -5px;background:color-mix(in srgb,var(--brand-600) 6%,transparent);transition:background-color .2s ease,box-shadow .2s ease}
.new-case-field-label--next>span:first-child{color:color-mix(in srgb,var(--brand-700) 88%,var(--foreground));font-weight:750}
.new-case-field-label--next :is(input,select,textarea){border-color:color-mix(in srgb,var(--brand-600) 36%,var(--border));box-shadow:0 0 0 2px color-mix(in srgb,var(--brand-600) 14%,transparent)}
.new-case-field-label--next :is(input,select,textarea):focus-visible{outline:2px solid color-mix(in srgb,var(--brand-600) 50%,transparent);outline-offset:1px}
.new-case-type-grid{display:grid;grid-template-columns:1fr 1fr;gap:5px}
.new-case-type-btn{min-height:48px;display:grid;justify-items:start;align-content:start;gap:2px;text-align:left;padding:5px 7px;cursor:pointer;border-radius:8px;transition:border-color .16s ease,background-color .16s ease,box-shadow .16s ease,opacity .16s ease}
.new-case-type-btn.is-selected{border:2px solid color-mix(in srgb,var(--brand-600) 72%,var(--border));background:linear-gradient(145deg,color-mix(in srgb,var(--brand-600) 12%,var(--surface)) 0%,color-mix(in srgb,var(--brand-600) 4%,var(--surface)) 100%);box-shadow:0 0 0 1px color-mix(in srgb,var(--brand-600) 12%,transparent)}
.new-case-type-btn.is-unselected{border:1px solid color-mix(in srgb,var(--foreground) 10%,var(--border));background:color-mix(in srgb,var(--surface-2) 28%,var(--surface));opacity:.95}
.new-case-type-btn.is-unselected:hover{opacity:1;border-color:color-mix(in srgb,var(--brand-600) 24%,var(--border))}
.new-case-type-btn:focus-visible{outline:2px solid color-mix(in srgb,var(--brand-600) 55%,transparent);outline-offset:2px}
.new-case-type-status{display:inline-flex;align-items:center;gap:4px;border-radius:999px;padding:2px 6px;font-size:9px;font-weight:800;letter-spacing:.04em;text-transform:uppercase}
.new-case-type-requires{display:inline-flex;align-items:center;border-radius:999px;padding:1px 6px;font-size:9px;font-weight:700;letter-spacing:.02em;color:color-mix(in srgb,var(--foreground) 62%,var(--muted));border:1px solid color-mix(in srgb,var(--foreground) 10%,var(--border));background:color-mix(in srgb,var(--surface-2) 45%,var(--surface))}
.new-case-type-status.is-selected{color:var(--brand-700);border:1px solid color-mix(in srgb,var(--brand-600) 34%,var(--border));background:color-mix(in srgb,var(--brand-600) 10%,var(--surface))}
.new-case-type-status.is-unselected{color:var(--muted);border:1px solid color-mix(in srgb,var(--foreground) 8%,var(--border));background:color-mix(in srgb,var(--surface) 90%,var(--surface-2))}
.new-case-type-desc{font-size:10px;color:var(--muted);font-weight:600;line-height:1.3}
.new-case-submit{min-height:44px}
.new-case-save-actions .new-case-submit{width:100%}
.new-case-locked-field{border:0;border-left:2px dashed color-mix(in srgb,var(--foreground) 16%,var(--border));background:transparent;border-radius:0;padding:4px 0 4px 8px;display:grid;gap:3px}
.new-case-locked-pill{display:inline-flex;align-items:center;gap:4px;border-radius:999px;padding:2px 6px;font-size:9px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;color:var(--muted);border:1px solid color-mix(in srgb,var(--foreground) 10%,var(--border));background:color-mix(in srgb,var(--surface-2) 40%,var(--surface))}
.new-case-card--product-required,.new-case-section--product-required{border-left:2px solid color-mix(in srgb,var(--brand-600) 55%,var(--border));padding-left:8px}
.new-case-product-helper{margin:0;font-size:10px;color:var(--muted);line-height:1.4}
.new-case-collapse{border:1px solid var(--border);border-radius:10px;background:var(--surface);overflow:hidden}
.new-case-collapse>summary{cursor:pointer;list-style:none;padding:7px 8px;display:flex;align-items:center;justify-content:space-between;gap:8px;min-height:44px}
.new-case-collapse>summary::-webkit-details-marker{display:none}
.new-case-collapse>summary::after{content:"";width:6px;height:6px;border-right:2px solid var(--muted);border-bottom:2px solid var(--muted);transform:rotate(45deg);transition:transform .15s ease;flex-shrink:0;margin-top:-2px}
.new-case-collapse[open]>summary::after{transform:rotate(-135deg);margin-top:2px}
.new-case-collapse>summary:focus-visible{outline:2px solid color-mix(in srgb,var(--brand-600) 55%,transparent);outline-offset:-2px}
.new-case-collapse-title{font-weight:800;font-size:12px;color:var(--foreground)}
.new-case-collapse-hint{font-size:10px;font-weight:600;color:var(--muted);margin-left:auto;margin-right:6px;text-align:right;line-height:1.3;max-width:55%}
.new-case-collapse-body{padding:0 8px 7px;display:grid;gap:5px;border-top:1px solid color-mix(in srgb,var(--foreground) 5%,var(--border))}
.new-case-collapse--in-phase{border:0;border-radius:0;background:transparent;border-bottom:1px solid color-mix(in srgb,var(--foreground) 5%,var(--border))}
.new-case-collapse--in-phase>summary{padding:6px 2px;min-height:44px}
.new-case-collapse--in-phase .new-case-collapse-body{padding:0 2px 6px;border-top:0}
.new-case-collapse--flush{border:0;border-radius:0;background:transparent}
.new-case-collapse--flush>summary{padding:4px 0;min-height:44px}
.new-case-collapse--flush .new-case-collapse-body{padding:5px 0 0;border-top:0}
.new-case-btn-row{display:flex;flex-wrap:wrap;gap:5px;align-items:center}
.new-case-mission-step{border:0;border-radius:0;background:transparent;overflow:visible}
.new-case-mission-step:not(:last-child){border-bottom:1px solid color-mix(in srgb,var(--foreground) 6%,var(--border))}
.new-case-mission-step.is-active{border:1px solid color-mix(in srgb,var(--brand-600) 32%,var(--border));border-radius:10px;background:var(--surface);box-shadow:0 1px 0 color-mix(in srgb,var(--foreground) 4%,transparent);margin:2px 0}
.new-case-mission-step.is-active:not(:last-child){border-bottom:1px solid color-mix(in srgb,var(--brand-600) 32%,var(--border))}
.new-case-mission-step.is-complete:not(.is-active){background:transparent}
.new-case-mission-step.is-locked{opacity:.78}
.new-case-mission-step-header{width:100%;display:flex;align-items:center;gap:8px;padding:7px 8px;border:0;background:transparent;text-align:left;cursor:pointer;min-height:44px}
.new-case-mission-step-header:focus-visible{outline:2px solid color-mix(in srgb,var(--brand-600) 55%,transparent);outline-offset:1px;border-radius:8px}
.new-case-mission-step-header:disabled{cursor:not-allowed}
.new-case-mission-step-index{font-size:10px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;color:var(--muted)}
.new-case-mission-step-title{font-size:13px;font-weight:800;color:var(--foreground)}
.new-case-mission-step-state{margin-left:auto;font-size:10px;font-weight:750;color:color-mix(in srgb,var(--foreground) 65%,var(--muted));text-transform:uppercase;letter-spacing:.03em}
.new-case-mission-step-body{padding:0 7px 6px;display:grid;gap:5px;border-top:1px solid color-mix(in srgb,var(--foreground) 5%,var(--border))}
.new-case-mission-step-summary-row{display:flex;align-items:flex-start;gap:8px;padding:0 8px 7px}
.new-case-mission-step-summary{margin:0;padding:0 8px 7px;font-size:11px;line-height:1.35;color:var(--muted)}
.new-case-mission-step-summary-row .new-case-mission-step-summary{padding:0;flex:1}
.new-case-mission-step-edit{border:1px solid color-mix(in srgb,var(--foreground) 12%,var(--border));background:color-mix(in srgb,var(--surface-2) 35%,var(--surface));border-radius:999px;font-size:10px;font-weight:750;padding:4px 9px;line-height:1.4;cursor:pointer;color:color-mix(in srgb,var(--foreground) 76%,var(--muted));min-height:32px}
.new-case-mission-step-edit:hover{border-color:color-mix(in srgb,var(--brand-600) 26%,var(--border));color:var(--brand-700)}
.new-case-mission-step-edit:focus-visible{outline:2px solid color-mix(in srgb,var(--brand-600) 55%,transparent);outline-offset:2px}
.new-case-mission-step--optional .new-case-mission-step-title{font-size:12px;font-weight:750;color:color-mix(in srgb,var(--foreground) 70%,var(--muted))}
.new-case-mission-step--optional .new-case-mission-step-index,.new-case-mission-step--optional .new-case-mission-step-state{color:color-mix(in srgb,var(--foreground) 48%,var(--muted))}
.new-case-mission-step--optional.is-active{border-color:color-mix(in srgb,var(--foreground) 12%,var(--border));box-shadow:none;background:color-mix(in srgb,var(--surface-2) 16%,var(--surface))}
.new-case-mission-step--optional.is-active .new-case-mission-step-title{color:color-mix(in srgb,var(--foreground) 78%,var(--muted))}
.new-case-mission-step--optional .new-case-mission-step-summary{font-size:10px;line-height:1.4;color:color-mix(in srgb,var(--foreground) 52%,var(--muted))}
.new-case-mission-step--optional .new-case-mission-step-body{padding-top:2px;gap:4px}
.new-case-mission-step--support-ops .new-case-mission-step-title{font-size:12px;font-weight:800;color:color-mix(in srgb,var(--foreground) 86%,var(--muted))}
.new-case-mission-step--support-ops.is-active{border-color:color-mix(in srgb,#0d9488 28%,var(--border));background:color-mix(in srgb,#0d9488 4%,var(--surface));box-shadow:0 1px 0 color-mix(in srgb,#0d9488 8%,transparent)}
.new-case-support-mission-workflow{border-color:color-mix(in srgb,#0d9488 14%,var(--border));background:color-mix(in srgb,#0d9488 3%,var(--surface))}
.new-case-provider-context-action{font-size:11px;font-weight:750;color:var(--brand-700);text-decoration:none;background:transparent;border:0;padding:0;cursor:pointer;font-family:inherit;min-height:32px}
.new-case-provider-context-action:hover{text-decoration:underline}
.new-case-provider-context-action:focus-visible{outline:2px solid color-mix(in srgb,var(--brand-600) 55%,transparent);outline-offset:2px}
.create-case-header{flex-shrink:0;padding:5px 10px 4px;border-bottom:1px solid color-mix(in srgb,var(--foreground) 6%,var(--border));background:#fff}
.create-case-header-nav{display:flex;align-items:center;gap:6px;margin-bottom:3px;min-width:0}
.create-case-back{font-size:13px;font-weight:800;color:var(--brand-700);text-decoration:none;min-height:44px;display:inline-flex;align-items:center}
.create-case-back:focus-visible{outline:2px solid color-mix(in srgb,var(--brand-600) 55%,transparent);outline-offset:2px}
.create-case-title{margin:0;font-size:18px;font-weight:850;letter-spacing:-.03em;line-height:1.15}
.create-case-subtitle{margin:2px 0 0;font-size:11px;line-height:1.38;color:var(--muted);font-weight:500;max-width:42rem}
.new-case-pathway-context{margin-top:4px;padding-top:4px;border-top:1px solid color-mix(in srgb,var(--foreground) 5%,var(--border));display:grid;gap:2px;max-width:42rem}
.new-case-pathway-stage{margin:0;display:flex;flex-wrap:wrap;align-items:baseline;gap:3px 5px;font-size:10px;line-height:1.35;color:var(--muted);font-weight:600}
.new-case-pathway-label{font-weight:650;color:color-mix(in srgb,var(--foreground) 58%,var(--muted))}
.new-case-pathway-value{font-weight:750;color:color-mix(in srgb,var(--foreground) 78%,var(--muted))}
.new-case-pathway-phase{font-weight:600;color:color-mix(in srgb,var(--foreground) 62%,var(--muted))}
.new-case-pathway-sep{color:color-mix(in srgb,var(--foreground) 28%,var(--muted));font-weight:500}
.new-case-pathway-mission{margin:0;font-size:10px;line-height:1.32;color:color-mix(in srgb,var(--foreground) 52%,var(--muted));font-weight:500}
.create-case-native-root{display:grid;gap:6px;padding:0 10px calc(10px + env(safe-area-inset-bottom,0px));min-width:0}
@media (max-width:980px){
  .new-case-layout{grid-template-columns:1fr}
}
@media (max-width:700px){
  .new-case-phi-banner{font-size:10px;padding:3px 7px;line-height:1.4}
  .new-case-mission-workflow{padding:4px 5px}
  .new-case-mission-checklist{display:flex;gap:5px;overflow-x:auto;padding-bottom:3px}
  .new-case-mission-checklist-item{flex:0 0 min(78vw,220px)}
  .new-case-section{padding-bottom:4px}
  .new-case-fields-2,.new-case-type-grid{grid-template-columns:1fr}
  .new-case-type-btn{min-height:44px;padding:6px 7px}
  .new-case-type-desc{display:none}
  .new-case-submit{
    position:sticky;bottom:6px;z-index:15;
    box-shadow:0 4px 16px color-mix(in srgb,var(--foreground) 14%,transparent);
  }
  .new-case-form .new-case-btn-ghost{width:auto;max-width:100%;min-height:44px}
  .new-case-form .new-case-btn-primary{width:100%}
}
`;
