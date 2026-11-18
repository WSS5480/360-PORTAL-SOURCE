export const providerIntelligenceDashboardCss = `

.provider-intel-workspace--dashboard {

  display: flex;

  flex-direction: column;

  gap: 0;

  padding: 0;

}



.provider-profile-root--intelligence-tab .provider-intel-workspace--dashboard .provider-intel-workspace-top {

  margin-bottom: 6px;

}



.intel-dash {

  display: flex;

  flex-direction: column;

  gap: 8px;

  max-width: 100%;

}



.intel-dash--compact {

  gap: 6px;

}



/* —— Command strip (above the fold) —— */

.intel-dash-hero {

  border-radius: 10px;

  border: 1px solid color-mix(in srgb, var(--brand-600) 16%, var(--border));

  background: var(--surface);

  padding: 10px 10px 8px;

  display: grid;

  gap: 6px;

}



.intel-dash-hero-stats {

  display: grid;

  grid-template-columns: repeat(3, minmax(0, 1fr));

  gap: 6px;

}



.intel-dash-stat-pill {

  display: flex;

  flex-direction: column;

  align-items: center;

  justify-content: center;

  padding: 6px 4px;

  border-radius: 8px;

  border: 1px solid var(--border);

  background: color-mix(in srgb, var(--background) 40%, var(--surface));

  min-height: 44px;

}



.intel-dash-stat-pill--gaps .intel-dash-stat-val {

  color: color-mix(in srgb, #b45309 90%, var(--foreground));

}



.intel-dash-stat-pill--tier-low .intel-dash-stat-val {

  color: color-mix(in srgb, #b45309 85%, var(--foreground));

}



.intel-dash-stat-pill--tier-building .intel-dash-stat-val {

  color: color-mix(in srgb, var(--brand-600) 90%, var(--foreground));

}



.intel-dash-stat-pill--tier-high .intel-dash-stat-val {

  color: color-mix(in srgb, #15803d 85%, var(--foreground));

}



.intel-dash-deploy-recs {

  margin: 0;

  padding: 0 0 0 14px;

  display: grid;

  gap: 2px;

  font-size: 10px;

  line-height: 1.35;

  font-weight: 600;

  color: var(--muted);

}



.intel-dash-stat-val {

  font-size: 18px;

  font-weight: 800;

  line-height: 1;

  font-variant-numeric: tabular-nums;

}



.intel-dash-stat-lbl {

  margin-top: 2px;

  font-size: 9px;

  font-weight: 800;

  text-transform: uppercase;

  letter-spacing: 0.05em;

  color: var(--muted);

}



.intel-dash-blocker-chip,

.intel-dash-next-chip {

  margin: 0;

  font-size: 11px;

  line-height: 1.35;

  padding: 6px 8px;

  border-radius: 6px;

  display: -webkit-box;

  -webkit-line-clamp: 2;

  -webkit-box-orient: vertical;

  overflow: hidden;

}



.intel-dash-blocker-chip {

  background: color-mix(in srgb, #d97706 8%, var(--surface));

  border-left: 3px solid #ca8a04;

}



.intel-dash-next-chip {

  background: color-mix(in srgb, var(--brand-600) 6%, var(--surface));

  border-left: 3px solid var(--brand-600);

  font-weight: 650;

}



.intel-dash-blocker-tag,

.intel-dash-next-tag {

  font-size: 9px;

  font-weight: 800;

  text-transform: uppercase;

  letter-spacing: 0.04em;

  color: var(--muted);

  margin-right: 6px;

}



.intel-dash-cta-row {

  display: grid;

  grid-template-columns: 1fr 1fr;

  gap: 6px;

}



.intel-dash-cta-primary,

.intel-dash-cta-secondary {

  min-height: 38px;

  border-radius: 8px;

  font-size: 12px;

  font-weight: 800;

  cursor: pointer;

  padding: 0 10px;

}



.intel-dash-cta-primary {

  border: none;

  background: var(--brand-600);

  color: var(--brand-contrast, #fff);

}



.intel-dash-cta-secondary {

  border: 1px solid var(--border);

  background: var(--surface);

  color: var(--foreground);

}



.intel-dash-cta-primary:disabled,

.intel-dash-cta-secondary:disabled {

  opacity: 0.55;

  cursor: not-allowed;

}



.intel-dash-audience-fold {

  margin: 0;

}



.intel-dash-audience-summary {

  font-size: 11px;

  font-weight: 700;

  color: var(--muted);

  cursor: pointer;

  list-style: none;

}



.intel-dash-audience-summary::-webkit-details-marker {

  display: none;

}



.intel-dash-path-chips {

  display: flex;

  flex-wrap: wrap;

  gap: 4px;

  margin-top: 6px;

}



.intel-dash-path-chip {

  min-height: 28px;

  padding: 2px 8px;

  border-radius: 999px;

  border: 1px solid var(--border);

  background: var(--surface);

  font-size: 10px;

  font-weight: 700;

  color: var(--muted);

  cursor: pointer;

}



.intel-dash-path-chip--active {

  border-color: color-mix(in srgb, var(--brand-600) 40%, var(--border));

  background: color-mix(in srgb, var(--brand-600) 10%, var(--surface));

  color: var(--brand-700, var(--brand-600));

}



.intel-dash-discovery-meta {

  margin: 0;

  font-size: 11px;

  color: var(--muted);

}



.intel-dash-live {

  margin: 0;

}



.intel-dash-live .pau-discovery-live {

  padding: 6px 8px;

  border-radius: 8px;

  font-size: 11px;

}



/* Commercialization operational picture */

.intel-dash-picture {

  border-radius: 10px;

  border: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));

  background: color-mix(in srgb, var(--foreground) 2%, var(--surface));

  padding: 8px 10px;

  display: grid;

  gap: 6px;

}



.intel-dash-picture-head {

  display: grid;

  gap: 2px;

}



.intel-dash-picture-title {

  margin: 0;

  font-size: 11px;

  font-weight: 800;

  letter-spacing: 0.04em;

  text-transform: uppercase;

  color: color-mix(in srgb, var(--foreground) 78%, var(--muted));

}



.intel-dash-picture-lead {

  margin: 0;

  font-size: 10px;

  line-height: 1.35;

  color: var(--muted);

}



.intel-dash-picture-grid {

  margin: 0;

  display: grid;

  gap: 5px;

}



.intel-dash-picture-row {

  display: grid;

  grid-template-columns: minmax(0, 38%) minmax(0, 1fr);

  gap: 4px 8px;

  align-items: start;

}



.intel-dash-picture-row dt {

  margin: 0;

  font-size: 10px;

  font-weight: 700;

  line-height: 1.3;

  color: var(--muted);

}



.intel-dash-picture-row dd {

  margin: 0;

  font-size: 12px;

  font-weight: 650;

  line-height: 1.35;

  color: var(--foreground);

}



.intel-dash-picture-row--commercial_blockers dd {

  color: color-mix(in srgb, #b45309 75%, var(--foreground));

}



.intel-dash-picture-next {

  margin-top: 2px;

  padding-top: 6px;

  border-top: 1px solid var(--border);

  display: grid;

  gap: 4px;

}



.intel-dash-picture-next-label {

  font-size: 10px;

  font-weight: 800;

  letter-spacing: 0.04em;

  text-transform: uppercase;

  color: var(--brand-600, #2563eb);

}



.intel-dash-picture-next-line {

  margin: 0;

  font-size: 13px;

  font-weight: 800;

  line-height: 1.3;

}



.intel-dash-picture-next-btn {

  justify-self: start;

  padding: 6px 10px;

  border-radius: 8px;

  border: none;

  background: var(--brand-600, #2563eb);

  color: #fff;

  font-size: 11px;

  font-weight: 800;

  cursor: pointer;

}



.intel-dash-picture-next-btn:disabled {

  opacity: 0.55;

  cursor: not-allowed;

}



.intel-dash-picture--compact .intel-dash-picture-fold-trigger {

  width: 100%;

  display: grid;

  grid-template-columns: auto minmax(0, 1fr) auto;

  gap: 6px;

  align-items: center;

  padding: 0;

  border: none;

  background: none;

  text-align: left;

  cursor: pointer;

}



.intel-dash-picture-teaser {

  font-size: 11px;

  font-weight: 650;

  line-height: 1.3;

  color: var(--foreground);

  overflow: hidden;

  text-overflow: ellipsis;

  white-space: nowrap;

}



.intel-dash-picture-chevron {

  font-size: 11px;

  color: var(--muted);

}



.intel-dash-picture-body {

  padding-top: 6px;

}



/* Priority strip */

.intel-dash-priority {

  display: grid;

  gap: 6px;

}



.intel-dash-priority-label {

  margin: 0;

  font-size: 10px;

  font-weight: 800;

  text-transform: uppercase;

  letter-spacing: 0.06em;

  color: var(--muted);

}



.intel-dash-readiness-grid {

  display: grid;

  grid-template-columns: 1fr;

  gap: 6px;

}



/* Collapsible folds */

.intel-dash-fold {

  border-radius: 10px;

  border: 1px solid var(--border);

  background: var(--surface);

  overflow: hidden;

}



.intel-dash-fold--facility {

  border-top: 2px solid color-mix(in srgb, #0d9488 50%, var(--border));

}



.intel-dash-fold--provider {

  border-top: 2px solid color-mix(in srgb, var(--brand-600) 45%, var(--border));

}



.intel-dash-fold--engagement {

  border-top: 2px solid color-mix(in srgb, #6366f1 40%, var(--border));

}



.intel-dash-fold-trigger {

  display: grid;

  grid-template-columns: auto 1fr auto;

  grid-template-rows: auto auto;

  gap: 2px 8px;

  align-items: center;

  width: 100%;

  padding: 8px 10px;

  border: none;

  background: color-mix(in srgb, var(--background) 35%, var(--surface));

  text-align: left;

  cursor: pointer;

  font: inherit;

  color: inherit;

}



.intel-dash-fold-title {

  font-size: 13px;

  font-weight: 800;

  grid-column: 1;

  grid-row: 1;

}



.intel-dash-fold-badge {

  font-size: 8px;

  font-weight: 800;

  text-transform: uppercase;

  padding: 2px 5px;

  border-radius: 3px;

  background: color-mix(in srgb, #0d9488 12%, var(--surface));

  color: #0f766e;

  grid-column: 2;

  grid-row: 1;

  justify-self: start;

  margin-left: 6px;

}



.intel-dash-fold-summary {

  font-size: 10px;

  color: var(--muted);

  grid-column: 1 / 3;

  grid-row: 2;

}



.intel-dash-fold-chevron {

  font-size: 11px;

  font-weight: 800;

  color: var(--muted);

  grid-column: 3;

  grid-row: 1 / 3;

  align-self: center;

}



.intel-dash-fold-body {

  padding: 6px 8px 8px;

  display: grid;

  gap: 6px;

  border-top: 1px solid color-mix(in srgb, var(--border) 75%, transparent);

}



.intel-dash-scope-split {
  margin: 0 0 14px;
}

/* Desktop sections */

.intel-dash-section {

  border-radius: 10px;

  border: 1px solid var(--border);

  background: var(--surface);

  overflow: hidden;

}



.intel-dash-section--facility {

  border-top: 2px solid color-mix(in srgb, #0d9488 50%, var(--border));

}



.intel-dash-section--provider {

  border-top: 2px solid color-mix(in srgb, var(--brand-600) 45%, var(--border));

}



.intel-dash-section-head {

  padding: 8px 10px;

  border-bottom: 1px solid color-mix(in srgb, var(--border) 80%, transparent);

  display: flex;

  align-items: center;

  justify-content: space-between;

  gap: 8px;

  flex-wrap: wrap;

}



.intel-dash-section-head--compact .intel-dash-section-sub {

  display: none;

}



.intel-dash-section-title {

  margin: 0;

  font-size: 13px;

  font-weight: 800;

}



.intel-dash-inherit-badge {

  font-size: 9px;

  font-weight: 800;

  text-transform: uppercase;

  padding: 2px 6px;

  border-radius: 999px;

  background: color-mix(in srgb, #0d9488 12%, var(--surface));

  color: #0f766e;

  border: 1px solid color-mix(in srgb, #0d9488 25%, var(--border));

}



.intel-dash-section-body {

  padding: 6px 8px 8px;

}



.intel-dash-empty {

  margin: 0;

  padding: 6px 4px;

  font-size: 11px;

  color: var(--muted);

}



/* Compact engagement rows */

.intel-dash-engagement-list {

  list-style: none;

  margin: 0;

  padding: 0;

  display: grid;

  gap: 4px;

}



.intel-dash-engagement-link {

  display: grid;

  grid-template-columns: auto 1fr;

  grid-template-rows: auto auto;

  gap: 2px 8px;

  padding: 8px 10px;

  border-radius: 8px;

  border: 1px solid var(--border);

  background: color-mix(in srgb, var(--background) 45%, var(--surface));

  text-decoration: none;

  color: inherit;

}



.intel-dash-engagement-type {

  font-size: 11px;

  font-weight: 800;

  grid-row: 1;

  grid-column: 1;

}



.intel-dash-engagement-date {

  font-size: 10px;

  color: var(--muted);

  grid-row: 1;

  grid-column: 2;

  justify-self: end;

}



.intel-dash-engagement-summary {

  margin: 0;

  font-size: 11px;

  line-height: 1.35;

  grid-row: 2;

  grid-column: 1 / -1;

  display: -webkit-box;

  -webkit-line-clamp: 2;

  -webkit-box-orient: vertical;

  overflow: hidden;

}



.intel-dash-fields-toggle {

  width: 100%;

  min-height: 36px;

  border-radius: 8px;

  border: 1px dashed var(--border);

  background: transparent;

  font-size: 11px;

  font-weight: 700;

  color: var(--muted);

  cursor: pointer;

}



/* —— Operational command bar —— */

.intel-dash-command {

  border-radius: 10px;

  border: 1px solid color-mix(in srgb, var(--brand-600) 16%, var(--border));

  background: var(--surface);

  padding: 10px 10px 8px;

  display: grid;

  gap: 8px;

}



.intel-dash-command-stats {

  margin: 0;

  display: grid;

  grid-template-columns: repeat(3, minmax(0, 1fr));

  gap: 6px 8px;

}



.intel-dash-command-stat {

  display: grid;

  gap: 2px;

  min-width: 0;

}



.intel-dash-command-stat dt {

  margin: 0;

  font-size: 9px;

  font-weight: 800;

  text-transform: uppercase;

  letter-spacing: 0.04em;

  color: var(--muted);

}



.intel-dash-command-stat dd {

  margin: 0;

  font-size: 12px;

  font-weight: 700;

  line-height: 1.3;

  color: var(--foreground);

}



.intel-dash-command-rail {

  display: grid;

  grid-template-columns: repeat(4, 1fr);

  gap: 3px;

}



.intel-dash-command-rail-seg {

  height: 3px;

  border-radius: 999px;

  background: color-mix(in srgb, var(--foreground) 8%, var(--border));

}



.intel-dash-command-rail-seg--on {

  background: color-mix(in srgb, var(--brand-600) 70%, var(--foreground));

}



.intel-dash-command-guidance {

  margin: 0;

  font-size: 11px;

  line-height: 1.4;

  color: var(--muted);

}



.intel-dash-section-kicker {

  margin: 0 0 4px;

  font-size: 10px;

  font-weight: 800;

  letter-spacing: 0.04em;

  text-transform: uppercase;

  color: color-mix(in srgb, var(--foreground) 72%, var(--muted));

}



/* Critical unknowns */

.intel-dash-unknowns {

  display: grid;

  gap: 4px;

}



.intel-dash-unknowns-list {

  margin: 0;

  padding: 0;

  list-style: none;

  display: flex;

  flex-wrap: nowrap;

  gap: 6px;

  overflow-x: auto;

  -webkit-overflow-scrolling: touch;

  scrollbar-width: thin;

}



.intel-dash-unknown {

  flex: 0 0 auto;

}



.intel-dash-unknown-btn {

  display: inline-flex;

  align-items: center;

  gap: 6px;

  min-height: 30px;

  padding: 4px 8px;

  border-radius: 999px;

  border: 1px solid var(--border);

  background: var(--surface);

  font-size: 11px;

  font-weight: 650;

  color: var(--foreground);

  cursor: pointer;

  white-space: nowrap;

}



.intel-dash-unknown-tag {

  font-size: 9px;

  font-weight: 800;

  text-transform: uppercase;

  letter-spacing: 0.03em;

  color: var(--muted);

}



.intel-dash-unknown-tag--needs_validation {

  color: color-mix(in srgb, #b45309 90%, var(--foreground));

}



.intel-dash-unknown-tag--confirmed {

  color: color-mix(in srgb, #15803d 85%, var(--foreground));

}



.intel-dash-unknown-tag--still_learning,

.intel-dash-unknown-tag--not_observed {

  color: color-mix(in srgb, var(--brand-600) 80%, var(--muted));

}



/* Operational context */

.intel-dash-context {

  display: grid;

  gap: 4px;

}



.intel-dash-context-head {

  margin: 0;

}



.intel-dash-context-title {

  margin: 0;

  font-size: 11px;

  font-weight: 800;

  letter-spacing: 0.03em;

  color: var(--foreground);

}



.intel-dash-context-lines {

  margin: 0;

  padding: 0 0 0 14px;

  display: grid;

  gap: 3px;

}



.intel-dash-context-line {

  font-size: 12px;

  line-height: 1.35;

  color: color-mix(in srgb, var(--foreground) 88%, var(--muted));

}



.intel-dash-context-fold-trigger {

  width: 100%;

  display: grid;

  grid-template-columns: minmax(0, 1fr) minmax(0, 1.2fr) auto;

  gap: 6px;

  align-items: center;

  padding: 6px 0;

  border: none;

  background: transparent;

  text-align: left;

  cursor: pointer;

}



.intel-dash-context-teaser {

  font-size: 11px;

  color: var(--muted);

  overflow: hidden;

  text-overflow: ellipsis;

  white-space: nowrap;

}



.intel-dash-context-body {

  padding-bottom: 4px;

}



/* Tactical recommendations */

.intel-dash-tactical {

  display: grid;

  gap: 4px;

}



.intel-dash-tactical-list {

  margin: 0;

  padding: 0;

  list-style: none;

  display: grid;

  gap: 4px;

}



.intel-dash-tactical-item {

  display: grid;

  grid-template-columns: minmax(0, 1fr) auto;

  gap: 6px;

  align-items: center;

  padding: 4px 0;

  border-bottom: 1px solid color-mix(in srgb, var(--border) 60%, transparent);

}



.intel-dash-tactical-item:last-child {

  border-bottom: none;

}



.intel-dash-tactical-label {

  font-size: 12px;

  font-weight: 650;

  line-height: 1.35;

  color: var(--foreground);

}



.intel-dash-tactical-actions {

  display: inline-flex;

  flex-wrap: wrap;

  gap: 4px;

  justify-content: flex-end;

}



.intel-dash-tactical-action {

  min-height: 26px;

  padding: 2px 8px;

  border-radius: 6px;

  border: 1px solid var(--border);

  background: var(--surface);

  font-size: 10px;

  font-weight: 700;

  color: var(--muted);

  cursor: pointer;

  text-decoration: none;

}



.intel-dash-tactical-action--link {

  display: inline-flex;

  align-items: center;

}



/* Deep intelligence */

.intel-dash-deep {

  display: grid;

  gap: 4px;

}



.intel-dash-deep-trigger {

  width: 100%;

  display: grid;

  grid-template-columns: minmax(0, 1fr) minmax(0, 1.2fr) auto;

  gap: 6px;

  align-items: center;

  padding: 8px 0;

  border: none;

  border-top: 1px solid var(--border);

  background: transparent;

  text-align: left;

  cursor: pointer;

}



.intel-dash-deep-title {

  font-size: 11px;

  font-weight: 800;

  color: var(--foreground);

}



.intel-dash-deep-hint {

  font-size: 10px;

  color: var(--muted);

  overflow: hidden;

  text-overflow: ellipsis;

  white-space: nowrap;

}



.intel-dash-deep-body {

  display: grid;

  gap: 6px;

  padding-bottom: 2px;

}



.intel-dash-deep-modules .intel-index-list--dossier {

  margin: 0;

}



@media (min-width: 720px) {

  .intel-dash {

    gap: 12px;

  }



  .intel-dash-command {

    padding: 12px 14px;

  }



  .intel-dash-cta-row {

    grid-template-columns: 1fr auto;

  }



  .intel-dash-readiness-grid {

    grid-template-columns: repeat(2, minmax(0, 1fr));

    gap: 8px;

  }



  .intel-dash--compact .intel-dash-readiness-grid {

    grid-template-columns: 1fr;

  }



  .intel-dash-section-head--compact .intel-dash-section-sub {

    display: block;

    margin: 4px 0 0;

    font-size: 11px;

    color: var(--muted);

    width: 100%;

  }

}



/* —— Operational briefing: type + rhythm (4 levels only) —— */

.intel-dash--briefing {

  --intel-gap-section: 28px;

  --intel-gap-stack: 14px;

  --intel-gap-tight: 8px;

  --intel-type-primary: 17px;

  --intel-type-body: 14px;

  --intel-type-section: 11px;

  --intel-type-meta: 12px;

  gap: 0;

  padding-bottom: 56px;

  max-width: 42rem;

}



.intel-dash-main {

  display: flex;

  flex-direction: column;

  gap: var(--intel-gap-section);

}



/* —— Summary strip —— */

.intel-strip {

  display: flex;

  flex-direction: column;

  gap: 12px;

  padding: 14px 14px 12px;

  border-radius: 8px;

  background: color-mix(in srgb, var(--foreground) 3%, var(--surface));

  border: 1px solid color-mix(in srgb, var(--border) 80%, transparent);

}



.intel-strip-head {

  display: flex;

  flex-direction: column;

  gap: 4px;

}



.intel-strip-stage {

  margin: 0;

  font-size: 15px;

  font-weight: 600;

  line-height: 1.3;

  letter-spacing: -0.02em;

  color: var(--foreground);

}



.intel-strip-verdict {

  margin: 0;

  font-size: 14px;

  font-weight: 400;

  line-height: 1.45;

  color: color-mix(in srgb, var(--foreground) 82%, var(--muted));

}



.intel-strip-note {

  margin: 0;

  padding-top: 2px;

  font-size: 13px;

  line-height: 1.45;

  color: var(--muted);

  border-top: 1px solid color-mix(in srgb, var(--border) 55%, transparent);

}



.intel-strip-row {

  display: grid;

  grid-template-columns: minmax(0, 9.5rem) minmax(0, 1fr);

  gap: 8px 12px;

  align-items: baseline;

  padding-top: 2px;

}



.intel-strip-row--move {

  padding-top: 6px;

  border-top: 1px solid color-mix(in srgb, var(--border) 55%, transparent);

}



.intel-strip-kicker {

  font-size: 11px;

  font-weight: 500;

  letter-spacing: 0.04em;

  text-transform: uppercase;

  color: var(--muted);

}



.intel-strip-value {

  font-size: 14px;

  font-weight: 500;

  line-height: 1.4;

  color: var(--foreground);

}



.intel-strip-move {

  margin: 0;

  padding: 0;

  border: none;

  background: none;

  font-size: 15px;

  font-weight: 600;

  line-height: 1.35;

  color: var(--foreground);

  text-align: left;

  text-decoration: underline;

  text-underline-offset: 3px;

  text-decoration-color: color-mix(in srgb, var(--foreground) 25%, transparent);

  cursor: pointer;

}



.intel-strip-move:hover:not(:disabled) {

  text-decoration-color: var(--foreground);

}



.intel-strip-move:disabled {

  opacity: 0.45;

  cursor: not-allowed;

}



/* —— Intelligence blocks —— */

.intel-block {

  display: flex;

  flex-direction: column;

  gap: 12px;

}



.intel-block-title {

  margin: 0;

  padding-bottom: 8px;

  font-size: 11px;

  font-weight: 600;

  letter-spacing: 0.07em;

  text-transform: uppercase;

  color: color-mix(in srgb, var(--muted) 88%, var(--foreground));

  border-bottom: 1px solid color-mix(in srgb, var(--border) 70%, transparent);

}



.intel-block-title--inline {

  padding-bottom: 0;

  border-bottom: none;

}



.intel-block--split {

  display: grid;

  gap: 20px;

}



@media (min-width: 640px) {

  .intel-block--split {

    grid-template-columns: 1fr 1fr;

    gap: 16px 24px;

  }

}



.intel-block--deep {

  margin-top: 4px;

  padding-top: var(--intel-gap-section);

  border-top: 1px solid color-mix(in srgb, var(--border) 75%, transparent);

}



.intel-stack {

  display: flex;

  flex-direction: column;

  gap: var(--intel-gap-tight);

}



.intel-stack-tight {

  display: flex;

  flex-direction: column;

  gap: 4px;

}



/* Level 1 — primary action / status */

.intel-t-primary {

  margin: 0;

  font-size: var(--intel-type-primary);

  font-weight: 600;

  line-height: 1.35;

  letter-spacing: -0.01em;

  color: var(--foreground);

}



.intel-t-primary--lead {

  font-size: 16px;

  font-weight: 500;

  line-height: 1.45;

  color: color-mix(in srgb, var(--foreground) 88%, var(--muted));

}



.intel-t-primary--link {

  display: inline-block;

  margin: 0;

  padding: 0;

  border: none;

  background: none;

  text-align: left;

  text-decoration: underline;

  text-underline-offset: 3px;

  text-decoration-color: color-mix(in srgb, var(--foreground) 28%, transparent);

  cursor: pointer;

}



.intel-t-primary--link:hover:not(:disabled) {

  text-decoration-color: var(--foreground);

}



.intel-t-primary--link:disabled {

  opacity: 0.45;

  cursor: not-allowed;

}



/* Level 2 — section headings */

.intel-t-section {

  margin: 0;

  font-size: var(--intel-type-section);

  font-weight: 500;

  line-height: 1.3;

  letter-spacing: 0.06em;

  text-transform: uppercase;

  color: color-mix(in srgb, var(--muted) 92%, var(--foreground));

}



/* Level 3 — operational content */

.intel-t-body {

  margin: 0;

  font-size: var(--intel-type-body);

  font-weight: 400;

  line-height: 1.5;

  color: var(--foreground);

}



/* Level 4 — metadata */

.intel-t-meta {

  margin: 0;

  font-size: var(--intel-type-meta);

  font-weight: 400;

  line-height: 1.4;

  color: var(--muted);

}



.intel-list {

  margin: 0;

  padding: 0 0 0 1.1em;

  display: flex;

  flex-direction: column;

  gap: 6px;

}



.intel-list li::marker {

  color: color-mix(in srgb, var(--muted) 70%, transparent);

}



/* Still to validate — signal rows */

.intel-signal-list {

  margin: 0;

  padding: 0;

  list-style: none;

  display: flex;

  flex-direction: column;

  gap: 2px;

}



.intel-signal-row {

  width: 100%;

  display: grid;

  grid-template-columns: minmax(0, 1fr) auto;

  grid-template-rows: auto auto;

  gap: 2px 10px;

  align-items: center;

  padding: 8px 10px;

  border: none;

  border-radius: 6px;

  background: color-mix(in srgb, var(--foreground) 2%, transparent);

  text-align: left;

  cursor: pointer;

}



.intel-signal-row:hover {

  background: color-mix(in srgb, var(--foreground) 5%, var(--surface));

}



.intel-signal-topic {

  grid-column: 1;

  grid-row: 1;

  font-size: 14px;

  font-weight: 500;

  line-height: 1.35;

  color: var(--foreground);

}



.intel-signal-status {

  grid-column: 2;

  grid-row: 1;

  font-size: 11px;

  font-weight: 500;

  letter-spacing: 0.02em;

  white-space: nowrap;

  color: var(--muted);

}



.intel-signal-status--warn {

  color: color-mix(in srgb, #b45309 75%, var(--muted));

}



.intel-signal-status--open {

  color: color-mix(in srgb, var(--brand-600) 70%, var(--muted));

}



.intel-signal-detail {

  grid-column: 1 / -1;

  font-size: 12px;

  line-height: 1.4;

  color: var(--muted);

}



/* Facility / surgeon context */

.intel-context-col {

  display: flex;

  flex-direction: column;

  gap: 8px;

  min-width: 0;

}



.intel-context-label {

  margin: 0;

  font-size: 11px;

  font-weight: 600;

  letter-spacing: 0.06em;

  text-transform: uppercase;

  color: color-mix(in srgb, var(--muted) 90%, var(--foreground));

}



.intel-context-fold {

  display: flex;

  align-items: center;

  justify-content: space-between;

  gap: 8px;

  width: 100%;

  padding: 0;

  border: none;

  background: none;

  cursor: pointer;

  text-align: left;

}



.intel-ops-list {

  margin: 0;

  padding: 0;

  list-style: none;

  display: flex;

  flex-direction: column;

  gap: 6px;

}



.intel-ops-list li {

  position: relative;

  padding-left: 12px;

  font-size: 13px;

  font-weight: 400;

  line-height: 1.45;

  color: color-mix(in srgb, var(--foreground) 90%, var(--muted));

}



.intel-ops-list li::before {

  content: "";

  position: absolute;

  left: 0;

  top: 0.55em;

  width: 4px;

  height: 4px;

  border-radius: 50%;

  background: color-mix(in srgb, var(--muted) 55%, transparent);

}



.intel-fold-chevron {

  grid-column: 2;

  grid-row: 1 / span 2;

  align-self: center;

  font-size: 10px;

  color: var(--muted);

}



/* Next steps — task panel */

.intel-task-panel {

  margin: 0;

  padding: 0;

  list-style: none;

  display: flex;

  flex-direction: column;

  border: 1px solid color-mix(in srgb, var(--border) 75%, transparent);

  border-radius: 8px;

  overflow: hidden;

  background: var(--surface);

}



.intel-task-row {

  display: grid;

  grid-template-columns: 1.75rem minmax(0, 1fr);

  gap: 10px;

  align-items: center;

  min-height: 40px;

  padding: 8px 12px;

  border-bottom: 1px solid color-mix(in srgb, var(--border) 60%, transparent);

}



.intel-task-row:last-child {

  border-bottom: none;

}



.intel-task-index {

  font-size: 12px;

  font-weight: 500;

  font-variant-numeric: tabular-nums;

  text-align: center;

  color: var(--muted);

}



.intel-task-label {

  font-size: 14px;

  font-weight: 500;

  line-height: 1.4;

  color: var(--foreground);

}



.intel-text-btn {

  padding: 0;

  border: none;

  background: none;

  text-decoration: underline;

  text-underline-offset: 2px;

  text-decoration-color: color-mix(in srgb, var(--muted) 50%, transparent);

  cursor: pointer;

}



.intel-text-btn:hover:not(:disabled) {

  color: var(--foreground);

  text-decoration-color: color-mix(in srgb, var(--foreground) 35%, transparent);

}



.intel-text-btn:disabled {

  opacity: 0.45;

  cursor: not-allowed;

}



a.intel-text-btn {

  display: inline;

}



/* Deep intelligence dossier */

.intel-deep-fold {

  width: 100%;

  display: flex;

  align-items: center;

  justify-content: space-between;

  gap: 12px;

  padding: 0 0 4px;

  border: none;

  background: none;

  cursor: pointer;

  text-align: left;

}



.intel-deep-dossier {

  display: flex;

  flex-direction: column;

  gap: 10px;

  padding: 8px 0 2px;

}



.intel-deep-block {

  display: flex;

  flex-direction: column;

  gap: var(--intel-gap-tight);

}



.intel-deep-dl {

  margin: 0;

  display: flex;

  flex-direction: column;

  gap: 10px;

}



.intel-deep-dl-row {

  display: flex;

  flex-direction: column;

  gap: 2px;

}



.intel-deep-engagements {

  margin: 0;

  padding: 0;

  list-style: none;

  display: flex;

  flex-direction: column;

  gap: var(--intel-gap-stack);

}



.intel-deep-engagement-link {

  display: flex;

  flex-direction: column;

  gap: 2px;

  text-decoration: none;

  color: inherit;

}



.intel-deep-engagement-link:hover .intel-t-body:first-child {

  text-decoration: underline;

  text-underline-offset: 2px;

}



/* Deep intelligence index list */

.intel-dash--briefing .intel-index-list--dossier {

  margin-top: 4px;

}



.intel-dash--briefing .intel-dash-live .pau-discovery-live {

  padding: 0;

  border: none;

  background: transparent;

  font-size: var(--intel-type-meta);

}



/* Sticky mobile CTA */

.intel-dash-sticky-foot {

  position: sticky;

  bottom: 0;

  z-index: 4;

  margin: 0;

  padding: 10px 0 calc(10px + env(safe-area-inset-bottom, 0px));

  display: flex;

  flex-direction: column;

  align-items: stretch;

  gap: 6px;

  background: color-mix(in srgb, var(--background) 94%, transparent);

  border-top: 1px solid color-mix(in srgb, var(--border) 65%, transparent);

  backdrop-filter: blur(10px);

}



.intel-dash-sticky-cta {

  width: 100%;

  min-height: 44px;

  border: 1px solid var(--border);

  border-radius: 8px;

  background: var(--surface);

  font-size: var(--intel-type-body);

  font-weight: 500;

  color: var(--foreground);

  cursor: pointer;

}



.intel-dash-sticky-cta:disabled {

  opacity: 0.45;

  cursor: not-allowed;

}



.intel-dash-sticky-secondary {

  align-self: center;

  font-size: var(--intel-type-meta);

  font-weight: 400;

  color: var(--muted);

  text-decoration: none;

}



.intel-dash-sticky-secondary:hover {

  color: var(--foreground);

}



.intel-deep-fields {

  display: flex;

  flex-direction: column;

  gap: var(--intel-gap-stack);

}



.intel-deep-engagement-line {

  display: flex;

  flex-direction: column;

  gap: 2px;

  text-decoration: none;

  color: inherit;

}



.intel-deep-engagement-line:hover .intel-t-body {

  text-decoration: underline;

  text-underline-offset: 2px;

}



.intel-dash-empty {

  margin: 0;

  font-size: var(--intel-type-body);

  font-weight: 400;

  line-height: 1.5;

  color: var(--muted);

}



.intel-dash--compact .intel-strip-row {

  grid-template-columns: 1fr;

  gap: 4px;

}



.intel-dash--compact .intel-block--split {

  grid-template-columns: 1fr;

}



@media (min-width: 720px) {

  .intel-dash--briefing {

    --intel-gap-section: 32px;

    padding-bottom: 20px;

  }



  .intel-dash-sticky-foot {

    display: none;

  }

}

`;


