/**
 * Bridges area-specific class names to the shared mission-control system.
 * Keeps existing markup working while unifying visuals.
 */
export const missionControlAliasesCss = `
/* ── Deck aliases: Provider Overview ── */
.pov-cc-mission-deck.mc-deck,
.pov-cc-mission-deck {
  position: relative;
  isolation: isolate;
  background: var(--mc-hero-bg, var(--pov-hero-bg));
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: var(--mc-elev-hero, var(--pov-elev-hero));
}

.pov-cc-hero__name {
  color: var(--mc-hero-ink, #f8fafc);
}

.pov-cc-hero__stage-pill,
.pfm-mission-deck__type,
.pfm-mission-hero__engagement-type {
  color: #fff;
  background: color-mix(in srgb, var(--mc-accent, var(--pov-hero-accent, #2563eb)) 72%, rgba(15, 23, 42, 0.9));
  border: 1px solid color-mix(in srgb, var(--mc-accent, var(--pov-hero-accent, #2563eb)) 55%, rgba(255, 255, 255, 0.2));
  box-shadow: 0 0 12px color-mix(in srgb, var(--mc-accent, var(--pov-hero-accent, #2563eb)) 30%, transparent);
}

.pfm-mission-hero__status-pill--ready,
.pov-cc-mission-control__briefing--ready {
  color: #ecfdf5;
  background: color-mix(in srgb, #16a34a 72%, rgba(15, 23, 42, 0.9));
  border: 1px solid color-mix(in srgb, #16a34a 55%, rgba(255, 255, 255, 0.2));
  box-shadow: 0 0 12px color-mix(in srgb, #16a34a 30%, transparent);
}

.pfm-mission-hero__status-pill--pending {
  color: #fef3c7;
  background: color-mix(in srgb, #d97706 72%, rgba(15, 23, 42, 0.9));
  border: 1px solid color-mix(in srgb, #d97706 55%, rgba(255, 255, 255, 0.2));
  box-shadow: 0 0 12px color-mix(in srgb, #d97706 28%, transparent);
}

/* ── Deck aliases: Field Briefing ── */
.pfm-mission-deck.mc-deck,
.pfm-mission-deck {
  position: relative;
  isolation: isolate;
  flex-shrink: 0;
  background: var(--mc-hero-bg, var(--pfm-hero-bg));
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: var(--mc-elev-hero);
}

.pfm-mission-deck::before {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(ellipse 70% 55% at 88% -10%, color-mix(in srgb, var(--mc-accent, var(--pfm-hero-accent)) 22%, transparent), transparent 58%),
    radial-gradient(ellipse 45% 40% at 4% 100%, color-mix(in srgb, var(--mc-accent, var(--pfm-hero-accent)) 10%, transparent), transparent 52%);
  z-index: 0;
}

.pfm-mission-deck__inner {
  position: relative;
  z-index: 1;
}

.pfm-mission-deck__name {
  color: var(--mc-hero-ink, #f8fafc);
}

.prepare-for-meeting-back--mission {
  color: color-mix(in srgb, var(--mc-accent, var(--pfm-hero-accent)) 72%, #fff);
}

/* ── Deck aliases: Observation mission briefing banner ── */
.case-obs-mission-brief-banner.mc-deck,
.case-obs-mission-brief-banner {
  background: var(--mc-hero-bg) !important;
  color: var(--mc-hero-ink);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.case-obs-mission-brief-kicker {
  color: var(--mc-hero-muted) !important;
  letter-spacing: 0.12em !important;
}

.case-obs-mission-brief-lead {
  color: var(--mc-hero-ink) !important;
}

.case-obs-mission-brief {
  border: 1px solid var(--mc-border) !important;
  box-shadow: var(--mc-elev-surface) !important;
  background: var(--mc-surface) !important;
}

/* ── Case detail shells: dark mission deck headers ── */
.surgical-case-detail-shell.mc-workspace,
.product-support-case-detail-shell.mc-workspace {
  background: var(--mc-page-bg) !important;
}

.surgical-case-detail-shell .case-obs-detail-header.mc-deck,
.product-support-case-detail-shell .case-ps-detail-header.mc-deck {
  position: relative;
  isolation: isolate;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 10px 16px;
  margin: 0 calc(-1 * var(--cod-pad-x, 16px));
  padding: 10px var(--cod-pad-x, 16px) 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
  border-left: none !important;
  background: var(--mc-hero-bg) !important;
  box-shadow: var(--mc-elev-hero);
  color: var(--mc-hero-ink);
}

.product-support-case-detail-shell .case-ps-detail-header.mc-deck {
  margin: 0 calc(-1 * var(--psd-pad-x, 16px));
  padding: 10px var(--psd-pad-x, 16px) 10px;
}

.surgical-case-detail-shell .case-obs-detail-header.mc-deck::before,
.product-support-case-detail-shell .case-ps-detail-header.mc-deck::before {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(ellipse 70% 55% at 88% -10%, color-mix(in srgb, var(--mc-accent) 22%, transparent), transparent 58%),
    radial-gradient(ellipse 45% 40% at 4% 100%, color-mix(in srgb, var(--mc-accent) 10%, transparent), transparent 52%);
  z-index: 0;
}

.surgical-case-detail-shell .case-obs-detail-header.mc-deck > *,
.product-support-case-detail-shell .case-ps-detail-header.mc-deck > * {
  position: relative;
  z-index: 1;
}

.surgical-case-detail-shell .case-obs-detail-header.mc-deck .case-obs-detail-back,
.product-support-case-detail-shell .case-ps-detail-header.mc-deck .case-ps-detail-back {
  color: color-mix(in srgb, var(--mc-accent) 72%, #fff);
}

.surgical-case-detail-shell .case-obs-detail-header.mc-deck .case-obs-detail-back:hover,
.product-support-case-detail-shell .case-ps-detail-header.mc-deck .case-ps-detail-back:hover {
  color: #fff;
}

.surgical-case-detail-shell .case-obs-detail-header.mc-deck .case-obs-detail-title,
.product-support-case-detail-shell .case-ps-detail-header.mc-deck .case-ps-detail-title {
  color: var(--mc-hero-ink);
}

.surgical-case-detail-shell .case-obs-detail-header.mc-deck .case-obs-detail-subtitle,
.surgical-case-detail-shell .case-obs-detail-header.mc-deck .case-obs-detail-meta {
  color: var(--mc-hero-muted);
}

.surgical-case-detail-shell .case-obs-detail-header.mc-deck .case-obs-detail-meta-item dt,
.product-support-case-detail-shell .case-ps-detail-header.mc-deck .case-ps-detail-meta-item dt {
  color: var(--mc-hero-muted);
}

.surgical-case-detail-shell .case-obs-detail-header.mc-deck .case-obs-detail-meta-item dd,
.product-support-case-detail-shell .case-ps-detail-header.mc-deck .case-ps-detail-meta-item dd {
  color: var(--mc-hero-subtle);
}

.surgical-case-detail-shell--observation .case-obs-detail-header.mc-deck .case-obs-detail-subtitle {
  display: none;
}

/* ── Light surface stacks ── */
.prepare-for-meeting-page--mission .pfm-mission-stack--primary,
.prepare-for-meeting-page--mission .pfm-mission-stack--secondary,
.prepare-for-meeting-page--mission .pfm-mission-stack--tertiary,
.prepare-for-meeting-page--provider-debrief .pfm-debrief-plan-section,
.prepare-for-meeting-page--provider-debrief .pfm-debrief-plan {
  background: var(--mc-surface);
  border-color: var(--mc-border);
  box-shadow: var(--mc-elev-panel);
}

/* ── Timeline bridge: Provider Overview activity feed ── */
.pov-cc-activity-feed.mc-timeline,
.pov-cc-activity--feed .pov-cc-activity-feed {
  padding-left: 18px;
}

.pov-cc-activity__kicker {
  color: var(--mc-meta);
}

.pov-cc-activity__title {
  color: var(--mc-ink);
}

.pov-cc-activity-feed__item {
  padding-left: 28px;
}

.pov-cc-activity-feed__item::before {
  left: 10px;
  background: color-mix(in srgb, var(--brand-600, #2563eb) 22%, var(--mc-border));
}

.pov-cc-activity-feed__link:hover,
.pov-cc-activity-feed__row:hover {
  background: color-mix(in srgb, var(--brand-600, #2563eb) 5%, #fff);
}

.pov-cc-activity-feed__link:hover .pov-cc-activity-feed__line,
.pov-cc-activity-feed__row:hover .pov-cc-activity-feed__line {
  color: var(--mc-ink);
}

.pov-cc-activity-feed__type,
.pov-cc-activity-feed__time {
  color: var(--mc-meta);
}

.pov-cc-activity-feed__line {
  color: var(--mc-ink-soft);
}

.crm-sales-page-bg:has(.surgical-case-detail-shell.mc-workspace),
.crm-sales-page-bg:has(.product-support-case-detail-shell.mc-workspace),
.crm-sales-page-bg:has(.prepare-for-meeting-page.mc-workspace) {
  background: var(--mc-page-bg) !important;
}

.pov-cc-mission-control.mc-ops-card,
.pov-cc-mission-control {
  background: var(--mc-hero-bg-alt);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 10px 32px rgba(15, 23, 42, 0.18);
}

.pov-cc-mission-control__cta {
  min-height: 36px;
  padding: 8px 14px;
  border-radius: var(--mc-radius-sm);
  font-weight: 700;
  box-shadow: 0 4px 14px color-mix(in srgb, var(--brand-600, #2563eb) 28%, transparent);
}
`;
