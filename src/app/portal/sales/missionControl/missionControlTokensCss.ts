/** Shared design tokens for field execution / mission-control surfaces. */
export const missionControlTokensCss = `
:root {
  --mc-page-bg: linear-gradient(180deg, #eaf0f7 0%, #dfe8f3 48%, #f8fafc 100%);
  --mc-surface: #ffffff;
  --mc-hero-bg: radial-gradient(circle at 16% 0%, rgba(34, 211, 238, 0.18) 0%, transparent 34%),
    radial-gradient(circle at 92% 12%, rgba(99, 102, 241, 0.2) 0%, transparent 30%),
    linear-gradient(152deg, #07101f 0%, #0f172a 42%, #18233a 100%);
  --mc-hero-bg-alt: radial-gradient(circle at 12% 0%, rgba(34, 211, 238, 0.14) 0%, transparent 32%),
    linear-gradient(165deg, #07111d 0%, #111827 38%, #0f172a 100%);
  --mc-hero-ink: #f8fafc;
  --mc-hero-muted: #94a3b8;
  --mc-hero-subtle: #cbd5e1;
  --mc-accent: #2563eb;
  --mc-border: color-mix(in srgb, #0f172a 10%, #c9d2df);
  --mc-ink: #0b1220;
  --mc-ink-soft: #334155;
  --mc-meta: #64748b;
  --mc-content-pad: clamp(6px, 1vw, 14px);
  --mc-radius-lg: 16px;
  --mc-radius-md: 12px;
  --mc-radius-sm: 8px;
  --mc-elev-hero: 0 22px 62px rgba(15, 23, 42, 0.2);
  --mc-elev-surface: 0 14px 38px rgba(15, 23, 42, 0.08);
  --mc-elev-panel: 0 8px 24px rgba(15, 23, 42, 0.06);
}

.mc-workspace,
.mc-workspace * {
  box-sizing: border-box;
}

.mc-workspace {
  --mc-page-bg: linear-gradient(180deg, #eaf0f7 0%, #dfe8f3 48%, #f8fafc 100%);
  --mc-surface: #ffffff;
  --mc-surface-muted: #f6f9fc;
  --mc-hero-bg: radial-gradient(circle at 16% 0%, rgba(34, 211, 238, 0.18) 0%, transparent 34%),
    radial-gradient(circle at 92% 12%, rgba(99, 102, 241, 0.2) 0%, transparent 30%),
    linear-gradient(152deg, #07101f 0%, #0f172a 42%, #18233a 100%);
  --mc-hero-bg-alt: radial-gradient(circle at 12% 0%, rgba(34, 211, 238, 0.14) 0%, transparent 32%),
    linear-gradient(165deg, #07111d 0%, #111827 38%, #0f172a 100%);
  --mc-hero-ink: #f8fafc;
  --mc-hero-muted: #94a3b8;
  --mc-hero-subtle: #cbd5e1;
  --mc-accent: #2563eb;
  --mc-border: color-mix(in srgb, #0f172a 10%, #c9d2df);
  --mc-border-soft: rgba(15, 23, 42, 0.08);
  --mc-ink: #0b1220;
  --mc-ink-soft: #334155;
  --mc-meta: #64748b;
  --mc-content-pad: clamp(6px, 1vw, 14px);
  --mc-radius-lg: 16px;
  --mc-radius-md: 12px;
  --mc-radius-sm: 8px;
  --mc-elev-hero: 0 22px 62px rgba(15, 23, 42, 0.2);
  --mc-elev-surface: 0 14px 38px rgba(15, 23, 42, 0.08);
  --mc-elev-panel: 0 8px 24px rgba(15, 23, 42, 0.06);
  color: var(--mc-ink-soft);
}

.mc-workspace[data-stage="discovery"],
.mc-workspace[data-mc-stage="discovery"] { --mc-accent: #2563eb; }
.mc-workspace[data-stage="observe"],
.mc-workspace[data-mc-stage="observe"] { --mc-accent: #0d9488; }
.mc-workspace[data-stage="debrief"],
.mc-workspace[data-mc-stage="debrief"] { --mc-accent: #9333ea; }
.mc-workspace[data-stage="evaluation"],
.mc-workspace[data-mc-stage="evaluation"] { --mc-accent: #06b6d4; }
.mc-workspace[data-stage="commitment"],
.mc-workspace[data-mc-stage="commitment"] { --mc-accent: #16a34a; }
.mc-workspace[data-stage="outcomes"],
.mc-workspace[data-mc-stage="outcomes"] { --mc-accent: #ca8a04; }
.mc-workspace[data-stage="support"],
.mc-workspace[data-mc-stage="support"] { --mc-accent: #d97706; }
.mc-workspace[data-stage="observation"],
.mc-workspace[data-mc-stage="observation"] { --mc-accent: #0d9488; }

.mc-workspace--provider-overview,
.mc-workspace--provider-intelligence,
.mc-workspace--field-briefing,
.mc-workspace--debrief-plan,
.mc-workspace--observation-case,
.mc-workspace--product-support {
  background: var(--mc-page-bg);
}

/* Bridge legacy area tokens to shared mission-control tokens */
.pov-body {
  --pov-page-bg: var(--mc-page-bg);
  --pov-hero-bg: var(--mc-hero-bg);
  --pov-hero-muted: var(--mc-hero-muted);
  --pov-hero-accent: var(--mc-accent);
  --pov-elev-hero: var(--mc-elev-hero);
  --pov-elev-layout: var(--mc-elev-surface);
}

.prepare-for-meeting-page--mission,
.prepare-for-meeting-page--briefing {
  --pfm-hero-bg: var(--mc-hero-bg);
  --pfm-hero-accent: var(--mc-accent);
  --pfm-hero-muted: var(--mc-hero-muted);
  --pfm-page-bg: var(--mc-page-bg);
}

.surgical-case-detail-shell,
.product-support-case-detail-shell {
  --cod-page-bg: var(--mc-page-bg);
  --psd-page-bg: var(--mc-page-bg);
}
`;
