/**
 * Provider Intelligence tab — dedicated design pass.
 *
 * Visual language: "field dossier". A dark mission-style hero sits above a
 * stack of calm, white intelligence surfaces. Each section announces itself
 * with an icon chip + kicker so the page reads top-to-bottom as a story:
 * what we know → what cases told us → who matters → where it came from →
 * what the signals mean. Presentation only — no behavior lives here.
 */
export const providerIntelligencePageCss = `
/* ============================== Page canvas ============================== */

.provider-profile-root--intelligence-tab .provider-profile-body:has(.mc-workspace--provider-intelligence) {
  background:
    radial-gradient(56rem 22rem at 8% -4%, rgba(13, 148, 136, 0.07), transparent 60%),
    radial-gradient(48rem 20rem at 96% 0%, rgba(37, 99, 235, 0.06), transparent 55%),
    linear-gradient(180deg, #e6ebf3 0%, #dfe5ed 100%);
  padding: 6px clamp(6px, 1vw, 14px) calc(20px + env(safe-area-inset-bottom, 0px));
}

.provider-intel-workspace--page.provider-planning-accordion {
  padding: 0;
  margin: 0;
  background: transparent;
  border: none;
  box-shadow: none;
}

.mc-workspace--provider-intelligence .pov-cc {
  gap: 16px;
}

/* Staggered entrance — sections settle in one after another. */
@media (prefers-reduced-motion: no-preference) {
  .mc-workspace--provider-intelligence .pov-cc > * {
    animation: pib-rise 0.45s cubic-bezier(0.22, 0.9, 0.32, 1) backwards;
  }
  .mc-workspace--provider-intelligence .pov-cc > *:nth-child(2) { animation-delay: 0.05s; }
  .mc-workspace--provider-intelligence .pov-cc > *:nth-child(3) { animation-delay: 0.1s; }
  .mc-workspace--provider-intelligence .pov-cc > *:nth-child(4) { animation-delay: 0.15s; }
  .mc-workspace--provider-intelligence .pov-cc > *:nth-child(5) { animation-delay: 0.2s; }
  .mc-workspace--provider-intelligence .pov-cc > *:nth-child(n + 6) { animation-delay: 0.25s; }
}

@keyframes pib-rise {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* ============================== Hero band ============================== */

.pib-hero {
  position: relative;
  overflow: hidden;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 14px 24px;
  padding: 22px 24px;
  border-radius: 18px;
  background: linear-gradient(132deg, #0b1220 0%, #111c33 52%, #0c2b30 100%);
  border: 1px solid rgba(94, 234, 212, 0.16);
  box-shadow:
    0 18px 44px rgba(8, 14, 28, 0.34),
    inset 0 1px 0 rgba(255, 255, 255, 0.07);
  color: #f1f5f9;
}

.pib-hero__glow {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(34rem 16rem at 86% -30%, rgba(45, 212, 191, 0.22), transparent 62%),
    radial-gradient(26rem 14rem at 4% 130%, rgba(59, 130, 246, 0.16), transparent 60%);
}

.pib-hero__grid {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-image: radial-gradient(rgba(148, 163, 184, 0.18) 1px, transparent 1px);
  background-size: 22px 22px;
  mask-image: linear-gradient(105deg, transparent 38%, rgba(0, 0, 0, 0.9) 82%);
  -webkit-mask-image: linear-gradient(105deg, transparent 38%, rgba(0, 0, 0, 0.9) 82%);
}

.pib-hero__main {
  position: relative;
  min-width: 0;
  flex: 1 1 18rem;
}

.pib-hero__kicker {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  margin: 0 0 9px;
  padding: 4px 11px 4px 9px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #5eead4;
  background: rgba(13, 148, 136, 0.16);
  border: 1px solid rgba(94, 234, 212, 0.28);
}

.pib-hero__kicker-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #2dd4bf;
  box-shadow: 0 0 0 0 rgba(45, 212, 191, 0.55);
}

@media (prefers-reduced-motion: no-preference) {
  .pib-hero__kicker-dot {
    animation: pib-ping 2.4s ease-out infinite;
  }
}

@keyframes pib-ping {
  0% { box-shadow: 0 0 0 0 rgba(45, 212, 191, 0.55); }
  70% { box-shadow: 0 0 0 7px rgba(45, 212, 191, 0); }
  100% { box-shadow: 0 0 0 0 rgba(45, 212, 191, 0); }
}

.pib-hero__title.pib-intel-page-head__title {
  margin: 0;
  font-size: clamp(20px, 2.4vw, 24px);
  font-weight: 800;
  letter-spacing: -0.02em;
  color: #fff;
}

.pib-hero__subtitle.pib-intel-page-head__subtitle {
  margin: 6px 0 0;
  font-size: 13px;
  line-height: 1.5;
  color: #9fb0c7;
  max-width: 46rem;
}

.pib-hero__cta.mc-cta--primary {
  position: relative;
  gap: 8px;
  min-height: 44px;
  padding: 9px 18px;
  border-radius: 12px;
  font-size: 13px;
  background: linear-gradient(180deg, #14b8a6, #0d9488 88%);
  border-color: rgba(94, 234, 212, 0.45);
  box-shadow:
    0 6px 18px rgba(13, 148, 136, 0.42),
    inset 0 1px 0 rgba(255, 255, 255, 0.25);
  transition: transform 0.16s ease, box-shadow 0.16s ease, filter 0.16s ease;
}

.pib-hero__cta.mc-cta--primary:hover:not(:disabled) {
  transform: translateY(-1px);
  filter: brightness(1.06);
  box-shadow:
    0 9px 24px rgba(13, 148, 136, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.25);
}

.pib-hero__cta.mc-cta--primary:active:not(:disabled) {
  transform: translateY(0);
}

.pib-hero__cta-plus {
  display: inline-grid;
  place-items: center;
  width: 18px;
  height: 18px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 800;
  line-height: 1;
  background: rgba(255, 255, 255, 0.22);
}

/* ============================ From-case banner ============================ */

.pib-intel-from-case-banner {
  margin: 0 0 10px;
  padding: 10px 14px 10px 12px;
  border-radius: 12px;
  font-size: 12px;
  line-height: 1.45;
  color: var(--pov-ink-soft, #334155);
  background: linear-gradient(180deg, #fff, #f3f7fd);
  border: 1px solid color-mix(in srgb, var(--brand-600, #2563eb) 22%, var(--pov-border, #c9d2df));
  border-left: 3px solid var(--brand-600, #2563eb);
  box-shadow: var(--pov-elev-layout, 0 6px 24px rgba(15, 23, 42, 0.06));
}

/* ============================ Section surfaces ============================ */

.mc-workspace--provider-intelligence .pov-cc-summary,
.mc-workspace--provider-intelligence .pov-cc-activity--compact {
  padding: 18px 20px;
  border-radius: 16px;
  background: #fff;
  border: 1px solid color-mix(in srgb, var(--pov-navy, #0f172a) 9%, var(--pov-border, #c9d2df));
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.07);
}

.mc-workspace--provider-intelligence .pov-cc-intel-zone {
  position: relative;
  padding: 18px 20px 20px;
  border-radius: 16px;
  background: #fff;
  border: 1px solid color-mix(in srgb, var(--pov-navy, #0f172a) 9%, var(--pov-border, #c9d2df));
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.07);
  overflow: hidden;
}

.mc-workspace--provider-intelligence .pov-cc-intel-zone::before {
  content: "";
  position: absolute;
  inset: 0 0 auto;
  height: 3px;
  background: linear-gradient(90deg, #0d9488, #2dd4bf 45%, transparent 90%);
}

.pib-ai-summary-details summary {
  cursor: pointer;
  list-style: none;
  margin: -6px -8px;
  padding: 6px 8px;
  border-radius: 12px;
  transition: background 0.14s ease;
}

.pib-ai-summary-details summary:hover {
  background: color-mix(in srgb, var(--pov-navy, #0f172a) 3%, transparent);
}

.pib-ai-summary-details summary::-webkit-details-marker {
  display: none;
}

.pib-ai-summary-details .pov-cc-command-card__detail {
  margin-top: 14px;
}

.pib-ai-summary-details__meta {
  display: inline-flex;
  align-items: center;
  gap: 10px;
}

.pib-ai-summary-details[open] .pib-evidence-chevron {
  transform: rotate(-135deg);
  margin-top: 4px;
}

/* Section identity: icon chip + kicker + title. */
.pib-section-head {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.pib-section-head__icon {
  flex-shrink: 0;
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  border-radius: 11px;
  color: #0f766e;
  background: linear-gradient(180deg, #f0fdfa, #ccfbf1);
  border: 1px solid rgba(13, 148, 136, 0.25);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.7);
}

.pib-section-head__icon svg {
  width: 19px;
  height: 19px;
}

.pib-section-head__icon--case {
  color: #0e7490;
  background: linear-gradient(180deg, #ecfeff, #cffafe);
  border-color: rgba(8, 145, 178, 0.25);
}

.pib-section-head__icon--people {
  color: #4338ca;
  background: linear-gradient(180deg, #eef2ff, #e0e7ff);
  border-color: rgba(79, 70, 229, 0.22);
}

.pib-section-head__icon--evidence {
  color: #475569;
  background: linear-gradient(180deg, #f8fafc, #e2e8f0);
  border-color: rgba(71, 85, 105, 0.2);
}

.pib-section-head__icon--signals {
  color: #b45309;
  background: linear-gradient(180deg, #fffbeb, #fef3c7);
  border-color: rgba(217, 119, 6, 0.25);
}

.pib-section-head__copy {
  min-width: 0;
}

.pib-section-head__kicker {
  margin: 0 0 2px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--pov-meta, #64748b);
}

.pib-section-head__title {
  margin: 0;
  font-size: 16px;
  font-weight: 800;
  letter-spacing: -0.015em;
  color: var(--pov-navy, #0f172a);
}

.mc-workspace--provider-intelligence .pov-cc-intel-zone > .pib-section-head {
  margin-bottom: 14px;
}

/* =========================== Snapshot metrics =========================== */

.mc-workspace--provider-intelligence .pov-cc-command-grid {
  margin-top: 0;
  gap: 12px;
}

.mc-workspace--provider-intelligence .pov-cc-command-card {
  position: relative;
  padding: 13px 14px 14px;
  border-radius: 13px;
  border: 1px solid color-mix(in srgb, var(--pov-navy, #0f172a) 9%, var(--pov-border, #c9d2df));
  box-shadow: 0 4px 14px rgba(15, 23, 42, 0.05);
  overflow: hidden;
  transition: transform 0.16s ease, box-shadow 0.16s ease, border-color 0.16s ease;
}

.mc-workspace--provider-intelligence .pov-cc-command-card::before {
  content: "";
  position: absolute;
  inset: 0 auto 0 0;
  width: 3px;
  border-radius: 0 2px 2px 0;
  background: #cbd5e1;
}

.mc-workspace--provider-intelligence .pov-cc-command-card--ready::before { background: #059669; }
.mc-workspace--provider-intelligence .pov-cc-command-card--progress::before { background: #d97706; }
.mc-workspace--provider-intelligence .pov-cc-command-card--learning::before { background: #d97706; }
.mc-workspace--provider-intelligence .pov-cc-command-card--action::before { background: #2563eb; }

.mc-workspace--provider-intelligence .pov-cc-command-card--ready {
  background: linear-gradient(180deg, #fff 30%, #f3fbf8);
}

.mc-workspace--provider-intelligence .pov-cc-command-card--progress,
.mc-workspace--provider-intelligence .pov-cc-command-card--learning {
  background: linear-gradient(180deg, #fff 30%, #fdf9f0);
}

.mc-workspace--provider-intelligence .pov-cc-command-card--action {
  background: linear-gradient(180deg, #fff 30%, #f4f8fe);
}

.mc-workspace--provider-intelligence .pov-cc-command-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 22px rgba(15, 23, 42, 0.09);
}

/* ============================ Access pathway ============================ */

.pib-access-pathway {
  margin-top: 16px;
  padding: 14px 16px 16px;
  border-radius: 13px;
  background: linear-gradient(180deg, #f8fafc, #f1f5f9);
  border: 1px solid color-mix(in srgb, var(--pov-navy, #0f172a) 7%, var(--pov-border, #c9d2df));
}

.pib-access-pathway__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.pib-access-pathway__title {
  margin: 0;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--pov-navy, #0f172a);
}

.pib-access-pathway__summary {
  font-size: 11px;
  font-weight: 800;
  color: #0f766e;
  white-space: nowrap;
  padding: 3px 9px;
  border-radius: 999px;
  background: rgba(13, 148, 136, 0.1);
  border: 1px solid rgba(13, 148, 136, 0.22);
}

.pib-access-confirmed-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
  padding: 5px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #065f46;
  background: linear-gradient(180deg, #ecfdf5, #d1fae5);
  border: 1px solid rgba(5, 150, 105, 0.28);
}

.pib-access-confirmed-badge::before {
  content: "";
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #059669;
  box-shadow: inset 0 0 0 1.5px #fff;
}

.pib-access-pathway__progress {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
}

.pib-access-pathway__progress-value {
  font-size: 12px;
  font-weight: 800;
  color: var(--pov-navy, #0f172a);
  font-variant-numeric: tabular-nums;
  min-width: 2.5em;
  text-align: right;
}

.pib-access-pathway__progress-bar {
  position: relative;
  flex: 1;
  height: 8px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--pov-navy, #0f172a) 9%, #e2e8f0);
  overflow: hidden;
  box-shadow: inset 0 1px 2px rgba(15, 23, 42, 0.08);
}

.pib-access-pathway__progress-fill {
  position: relative;
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #0f766e, #14b8a6 70%, #2dd4bf);
  box-shadow: 0 0 8px rgba(20, 184, 166, 0.45);
  transition: width 0.5s cubic-bezier(0.22, 0.9, 0.32, 1);
}

@media (prefers-reduced-motion: no-preference) {
  .pib-access-pathway__progress-fill::after {
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(105deg, transparent 30%, rgba(255, 255, 255, 0.45) 50%, transparent 70%);
    animation: pib-sheen 2.8s ease-in-out infinite;
  }
}

@keyframes pib-sheen {
  0%, 35% { transform: translateX(-100%); }
  65%, 100% { transform: translateX(100%); }
}

/* Milestones read as a connected route: marker dot + label + connector. */
.pib-access-milestones {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  row-gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.pib-access-milestones > li {
  display: flex;
  align-items: center;
  margin: 0;
  padding: 0;
}

.pib-access-milestones > li:not(:last-child)::after {
  content: "";
  width: 16px;
  height: 2px;
  margin: 0 4px;
  border-radius: 2px;
  background: linear-gradient(90deg, #94a3b8, #cbd5e1);
  opacity: 0.7;
}

.pib-access-milestone {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  box-sizing: border-box;
  margin: 0;
  line-height: 1.25;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.01em;
  padding: 6px 13px 6px 10px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--pov-navy, #0f172a) 12%, var(--pov-border, #c9d2df));
  color: var(--pov-meta, #64748b);
  background: #fff;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.06);
}

.pib-access-milestone::before {
  content: "";
  flex-shrink: 0;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  border: 2px solid #cbd5e1;
  background: #fff;
  box-sizing: border-box;
}

.pib-access-milestone--complete {
  color: #065f46;
  border-color: rgba(5, 150, 105, 0.35);
  background: linear-gradient(180deg, #fff, #ecfdf5);
}

.pib-access-milestone--complete::before {
  border-color: #059669;
  background: #059669;
  box-shadow: inset 0 0 0 1.5px #fff;
}

.pib-access-milestone--current {
  color: #92400e;
  border-color: rgba(217, 119, 6, 0.4);
  background: linear-gradient(180deg, #fff, #fffbeb);
}

.pib-access-milestone--current::before {
  border-color: #d97706;
  background: #f59e0b;
}

@media (prefers-reduced-motion: no-preference) {
  .pib-access-milestone--current::before {
    animation: pib-ping-amber 2.2s ease-out infinite;
  }
}

@keyframes pib-ping-amber {
  0% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.45); }
  70% { box-shadow: 0 0 0 6px rgba(245, 158, 11, 0); }
  100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0); }
}

.pib-access-milestone--upcoming {
  color: #94a3b8;
  border-color: color-mix(in srgb, var(--pov-navy, #0f172a) 8%, var(--pov-border, #c9d2df));
  background: #f8fafc;
  box-shadow: none;
}

.pib-access-milestone__detail {
  display: block;
  margin-top: 4px;
  font-size: 10px;
  font-weight: 650;
  line-height: 1.35;
  color: var(--muted);
}

.pib-access-milestone-btn {
  min-height: 44px;
  cursor: pointer;
  font: inherit;
  appearance: none;
  -webkit-appearance: none;
  text-align: center;
  vertical-align: top;
  transition: transform 0.14s ease, box-shadow 0.14s ease, border-color 0.14s ease, color 0.14s ease;
}

.pib-access-milestone-btn:hover,
.pib-access-milestone-btn:focus-visible {
  transform: translateY(-1px);
  border-color: color-mix(in srgb, var(--brand-600, #2563eb) 45%, var(--pov-border, #c9d2df));
  color: var(--brand-700, #1d4ed8);
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.16);
  outline: none;
}

/* ======================= Organization suggestions ======================= */

.pib-org-suggested-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 8px;
}

.pib-org-suggested-kicker {
  display: inline-flex;
  align-items: center;
  margin: 0;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.11em;
  text-transform: uppercase;
  color: #92400e;
  background: linear-gradient(180deg, #fffbeb, #fef3c7);
  border: 1px solid rgba(217, 119, 6, 0.3);
}

.pib-org-suggested-subtext {
  margin: 6px 0 0;
  max-width: 52ch;
  font-size: 13px;
  line-height: 1.5;
  color: var(--pov-meta, #64748b);
}

.pib-org-suggested-list {
  list-style: none;
  margin: 10px 0 0;
  padding: 0;
  display: grid;
  gap: 0;
}

.pib-org-suggested-item {
  display: grid;
  gap: 10px;
  padding: 13px 0;
  border-top: 1px dashed color-mix(in srgb, var(--pov-navy, #0f172a) 12%, var(--pov-border, #c9d2df));
}

.pib-org-suggested-item:first-child {
  border-top: none;
  padding-top: 0;
}

.pib-org-suggested-item__title {
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  color: var(--pov-ink-soft, #334155);
}

.pib-org-suggested-item__detail {
  margin: 3px 0 0;
  font-size: 12px;
  line-height: 1.45;
  color: var(--pov-meta, #64748b);
}

.pib-org-suggested-item__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

/* =========================== Case intelligence =========================== */

.pib-case-intel__header {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px 16px;
  margin-bottom: 12px;
}

.pib-case-intel__subtitle {
  margin: 2px 0 0;
  font-size: 12px;
  line-height: 1.45;
  color: var(--pov-meta, #64748b);
}

.pib-case-intel__meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
  text-align: right;
}

.pib-case-intel__meta-line {
  margin: 0;
  font-size: 11px;
  font-weight: 700;
  color: var(--pov-meta, #64748b);
  font-variant-numeric: tabular-nums;
}

.pib-case-intel__status-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 14px;
}

.pib-case-intel__pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 11px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #065f46;
  background: linear-gradient(180deg, #ecfdf5, #d1fae5);
  border: 1px solid rgba(5, 150, 105, 0.3);
}

.pib-case-intel__pill::before {
  content: "";
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #059669;
}

.pib-case-intel__maturity {
  font-size: 11px;
  font-weight: 600;
  color: var(--pov-meta, #64748b);
}

.pib-case-intel__grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.pib-dossier-section {
  position: relative;
  overflow: hidden;
  background:
    radial-gradient(42rem 16rem at 10% -18%, rgba(20, 184, 166, 0.09), transparent 60%),
    linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
}

.pib-dossier-section::before {
  content: "";
  position: absolute;
  inset: 0 0 auto;
  height: 3px;
  background: linear-gradient(90deg, #14b8a6, #2563eb 48%, rgba(37, 99, 235, 0));
  opacity: 0.8;
}

.pib-dossier-section .pib-case-intel__grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.pib-dossier-card.pov-cc-command-card {
  --pib-dossier-accent: #2563eb;
  position: relative;
  overflow: hidden;
  padding: 15px;
  border-color: color-mix(in srgb, var(--pib-dossier-accent) 18%, var(--pov-border, #c9d2df));
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(248, 251, 255, 0.94)),
    radial-gradient(18rem 10rem at 96% -24%, color-mix(in srgb, var(--pib-dossier-accent) 12%, transparent), transparent 68%);
}

.pib-dossier-card::before {
  content: "";
  position: absolute;
  inset: 0 auto 0 0;
  width: 3px;
  background: var(--pib-dossier-accent);
  opacity: 0.7;
}

.pib-dossier-card--products { --pib-dossier-accent: #0d9488; }
.pib-dossier-card--friction { --pib-dossier-accent: #d97706; }
.pib-dossier-card--people-access { --pib-dossier-accent: #7c3aed; }
.pib-dossier-card--workflow { --pib-dossier-accent: #2563eb; }

.pib-dossier-card__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 5px;
}

.pib-dossier-card__count {
  flex: 0 0 auto;
  padding: 3px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--pib-dossier-accent) 84%, #0f172a);
  background: color-mix(in srgb, var(--pib-dossier-accent) 10%, #fff);
  border: 1px solid color-mix(in srgb, var(--pib-dossier-accent) 24%, #dbe4ef);
}

.pib-dossier-card__obs-count {
  font-size: 0.82rem;
  font-weight: 600;
  color: color-mix(in srgb, var(--pib-dossier-accent, #2563eb) 72%, #475569);
}

.pib-case-intel__signal-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 7px;
}

.pib-follow-up-items {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 10px;
}

.pib-follow-up-item {
  display: grid;
  gap: 4px;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid rgba(203, 213, 225, 0.65);
  background: rgba(255, 255, 255, 0.72);
}

.pib-follow-up-item--done {
  opacity: 0.72;
}

.pib-follow-up-item__label {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  cursor: pointer;
  font-size: 13px;
  line-height: 1.45;
  font-weight: 650;
  color: var(--pov-ink, #0f172a);
}

.pib-follow-up-item__label input {
  margin-top: 3px;
  flex-shrink: 0;
}

.pib-follow-up-item--done .pib-follow-up-item__text {
  text-decoration: line-through;
  color: var(--muted, #64748b);
}

.pib-follow-up-item__meta {
  padding-left: 26px;
  font-size: 11px;
  color: var(--muted, #64748b);
}

.pib-case-intel__signal {
  position: relative;
  margin: 0;
  padding-left: 14px;
  font-size: 11.5px;
  line-height: 1.45;
  font-weight: 600;
  color: var(--pov-ink-soft, #334155);
}

.pib-case-intel__signal::before {
  content: "";
  position: absolute;
  left: 0;
  top: 0.5em;
  width: 6px;
  height: 6px;
  border-radius: 2px;
  background: currentColor;
  opacity: 0.45;
}

.pib-dossier-card .pib-case-intel__signal {
  padding: 8px 8px 8px 18px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.58);
  border: 1px solid rgba(203, 213, 225, 0.54);
}

.pib-dossier-card .pib-case-intel__signal::before {
  left: 8px;
  top: 1.05em;
  background: var(--pib-dossier-accent, currentColor);
  opacity: 0.72;
}

.pib-case-intel__empty {
  margin: 0;
  font-size: 11px;
  color: #94a3b8;
  font-style: italic;
}

.pib-fact-evidence {
  margin-top: 7px;
}

.pib-fact-evidence__summary {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-height: 44px;
  padding: 4px 8px;
  border-radius: 999px;
  cursor: pointer;
  list-style: none;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--brand-600, #2563eb);
  background: rgba(37, 99, 235, 0.06);
  border: 1px solid rgba(37, 99, 235, 0.13);
}

.pib-fact-evidence__summary::-webkit-details-marker {
  display: none;
}

.pib-fact-evidence__summary::after {
  content: " +";
  margin-left: 4px;
}

.pib-fact-evidence[open] .pib-fact-evidence__summary::after {
  content: " -";
}

.pib-fact-evidence__body {
  display: grid;
  gap: 9px;
  margin-top: 8px;
  padding: 11px 12px;
  border-radius: 12px;
  background: linear-gradient(180deg, #ffffff, color-mix(in srgb, var(--brand-600, #2563eb) 5%, #fff));
  border: 1px solid color-mix(in srgb, var(--brand-600, #2563eb) 16%, var(--pov-border, #c9d2df));
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.8);
}

.pib-fact-evidence__heading {
  margin: 0;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--pov-meta, #64748b);
}

.pib-fact-evidence__item {
  display: grid;
  gap: 4px;
}

.pib-fact-evidence__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 0;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--pov-meta, #64748b);
}

.pib-fact-evidence__quote {
  margin: 0;
  font-size: 11.5px;
  font-style: italic;
  font-weight: 600;
  line-height: 1.45;
  color: var(--pov-ink-soft, #334155);
  overflow-wrap: anywhere;
}

/* ============================ Captured signals ============================ */

.pib-signals-section__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  margin-top: 14px;
}

.pib-signals-col {
  --pib-col-accent: #0d9488;
  min-width: 0;
  padding: 12px 12px 14px;
  border-radius: 13px;
  background: linear-gradient(180deg, #fafcfe, #f4f7fb);
  border: 1px solid color-mix(in srgb, var(--pov-navy, #0f172a) 6%, var(--pov-border, #c9d2df));
}

.pib-signals-col--known { --pib-col-accent: #059669; }
.pib-signals-col--gap { --pib-col-accent: #d97706; }
.pib-signals-col--opportunity { --pib-col-accent: #2563eb; }

.pib-signals-col__title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 10px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--pov-navy, #0f172a);
}

.pib-signals-col__dot {
  flex-shrink: 0;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--pib-col-accent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--pib-col-accent) 18%, transparent);
}

.pib-signals-col__count {
  margin-left: auto;
  min-width: 22px;
  text-align: center;
  padding: 2px 7px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0;
  color: color-mix(in srgb, var(--pib-col-accent) 80%, #000);
  background: color-mix(in srgb, var(--pib-col-accent) 12%, #fff);
  border: 1px solid color-mix(in srgb, var(--pib-col-accent) 28%, transparent);
  font-variant-numeric: tabular-nums;
}

.pib-signals-col__empty {
  margin: 0;
  padding: 10px 2px;
  font-size: 12px;
  color: #94a3b8;
  font-style: italic;
}

.pib-signals-col__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 8px;
}

.pib-signals-col .pov-cc-command-card {
  border-left: 3px solid var(--pib-col-accent);
}

.pib-signals-col .pov-cc-command-card::before {
  content: none;
}

.pib-signal-card-btn {
  display: block;
  width: 100%;
  padding: 0;
  border: none;
  background: transparent;
  text-align: left;
  cursor: pointer;
  font: inherit;
}

.pib-signal-card-btn .pov-cc-command-card {
  transition: transform 0.14s ease, box-shadow 0.14s ease, border-color 0.14s ease;
}

.pib-signal-card-btn:hover .pov-cc-command-card,
.pib-signal-card-btn:focus-visible .pov-cc-command-card {
  transform: translateY(-1px);
  border-color: color-mix(in srgb, var(--brand-600, #2563eb) 40%, var(--pov-border, #c9d2df));
  box-shadow: 0 8px 20px rgba(37, 99, 235, 0.12);
  outline: none;
}

.pib-signal-card__action {
  margin: 8px 0 0;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--brand-600, #2563eb);
}

.pib-signal-card__action::after {
  content: " \\2192";
  display: inline-block;
  transition: transform 0.14s ease;
}

.pib-signal-card-btn:hover .pib-signal-card__action::after {
  transform: translateX(2px);
}

.pib-section-head__meta {
  flex-shrink: 0;
  margin-left: auto;
  align-self: flex-start;
}

/* =============================== Key people =============================== */

.pib-people-section {
  padding: 16px 18px 18px;
  border-radius: 16px;
  background: #fff;
  border: 1px solid color-mix(in srgb, var(--pov-navy, #0f172a) 9%, var(--pov-border, #c9d2df));
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.07);
}

.pib-people-section__head {
  margin-bottom: 12px;
}

.pib-people-section__head .pib-section-head {
  width: 100%;
}

.pib-people-summary {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  padding: 0 9px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #4338ca;
  background: color-mix(in srgb, #6366f1 10%, #fff);
  border: 1px solid rgba(99, 102, 241, 0.18);
  white-space: nowrap;
}

.pib-people-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  border: 1px solid color-mix(in srgb, var(--pov-navy, #0f172a) 7%, var(--pov-border, #c9d2df));
  border-radius: 12px;
  overflow: hidden;
  background: color-mix(in srgb, var(--pov-navy, #0f172a) 2%, #fff);
}

.pib-people-list__item {
  margin: 0;
  border-bottom: 1px solid color-mix(in srgb, var(--pov-navy, #0f172a) 6%, var(--pov-border, #c9d2df));
}

.pib-people-list__item:last-child {
  border-bottom: none;
}

.pib-people-link {
  display: block;
  text-decoration: none;
  color: inherit;
}

.pib-people-link:hover .pib-people-name {
  color: #4338ca;
}

.pib-people-link:focus-visible {
  outline: 2px solid rgba(99, 102, 241, 0.45);
  outline-offset: -2px;
}

.pib-people-row {
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr);
  gap: 12px;
  align-items: start;
  padding: 12px 14px;
  min-width: 0;
}

.pib-people-row--critical {
  box-shadow: inset 3px 0 0 #6366f1;
}

.pib-people-row--needs-attention {
  background: color-mix(in srgb, #f59e0b 5%, #fff);
}

.pib-people-avatar {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.02em;
  color: #fff;
  background: linear-gradient(140deg, #6366f1, #4338ca);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.28);
}

.pib-people-avatar--high {
  background: linear-gradient(140deg, #14b8a6, #0f766e);
}

.pib-people-avatar--medium {
  background: linear-gradient(140deg, #38bdf8, #0369a1);
}

.pib-people-body {
  min-width: 0;
}

.pib-people-body__top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px 10px;
  min-width: 0;
}

.pib-people-name {
  margin: 0;
  font-size: 14px;
  font-weight: 800;
  letter-spacing: -0.01em;
  line-height: 1.25;
  color: var(--pov-navy, #0f172a);
}

.pib-people-role {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin: 4px 0 0;
  min-width: 0;
}

.pib-people-role__label {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--pov-meta, #64748b);
}

.pib-people-importance {
  display: inline-flex;
  align-items: center;
  min-height: 20px;
  padding: 0 6px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.pib-people-importance--critical {
  color: #4338ca;
  background: color-mix(in srgb, #6366f1 12%, #fff);
}

.pib-people-importance--high {
  color: #0f766e;
  background: color-mix(in srgb, #14b8a6 12%, #fff);
}

.pib-people-why {
  margin: 5px 0 0;
  font-size: 12px;
  line-height: 1.4;
  color: color-mix(in srgb, var(--pov-navy, #0f172a) 72%, var(--pov-meta, #64748b));
}

.pib-people-source {
  margin: 7px 0 0;
  font-size: 12px;
  line-height: 1.45;
  color: color-mix(in srgb, var(--pov-meta, #64748b) 88%, var(--pov-navy, #0f172a));
  font-style: italic;
}

.pib-people-contact {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 6px;
}

.pib-people-contact__item {
  display: inline-flex;
  align-items: center;
  max-width: 100%;
  padding: 2px 7px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  color: color-mix(in srgb, var(--pov-navy, #0f172a) 68%, transparent);
  background: color-mix(in srgb, var(--pov-navy, #0f172a) 4%, #fff);
  border: 1px solid color-mix(in srgb, var(--pov-navy, #0f172a) 8%, var(--pov-border, #c9d2df));
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pib-people-review-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
}

.pib-people-review-actions__button {
  appearance: none;
  border: 1px solid color-mix(in srgb, var(--pov-navy, #0f172a) 8%, var(--pov-border, #c9d2df));
  border-radius: 8px;
  background: #fff;
  color: color-mix(in srgb, var(--pov-navy, #0f172a) 74%, var(--pov-meta, #64748b));
  font-size: 11px;
  font-weight: 800;
  line-height: 1;
  padding: 8px 10px;
  cursor: pointer;
}

.pib-people-review-actions__button:hover:not(:disabled),
.pib-people-review-actions__button:focus-visible:not(:disabled) {
  border-color: rgba(20, 184, 166, 0.42);
  color: #0f766e;
  box-shadow: 0 0 0 3px rgba(20, 184, 166, 0.12);
}

.pib-people-review-actions__button:disabled {
  cursor: wait;
  opacity: 0.58;
}

.pib-people-review-actions__button--primary {
  border-color: rgba(20, 184, 166, 0.35);
  background: linear-gradient(135deg, #0f766e, #14b8a6);
  color: #fff;
  box-shadow: 0 8px 16px rgba(15, 118, 110, 0.15);
}

.pib-people-review-actions__button--primary:hover:not(:disabled),
.pib-people-review-actions__button--primary:focus-visible:not(:disabled) {
  color: #fff;
  box-shadow: 0 0 0 3px rgba(20, 184, 166, 0.18), 0 10px 18px rgba(15, 118, 110, 0.18);
}

.pib-people-review-actions__button--muted {
  color: #92400e;
  background: color-mix(in srgb, #f59e0b 6%, #fff);
  border-color: rgba(245, 158, 11, 0.22);
}

.pib-people-status {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  padding: 3px 8px;
  border-radius: 999px;
  border: 1px solid transparent;
  line-height: 1.2;
  text-align: right;
}

.pib-people-status::before {
  content: "";
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: currentColor;
  flex-shrink: 0;
}

.pib-people-status--confirmed {
  background: #ecfdf5;
  color: #047857;
  border-color: rgba(5, 150, 105, 0.25);
}

.pib-people-status--needs {
  background: #fffbeb;
  color: #b45309;
  border-color: rgba(217, 119, 6, 0.28);
}

.pib-people-status--missing {
  background: #fef2f2;
  color: #b91c1c;
  border-color: rgba(220, 38, 38, 0.25);
}

.pib-people-overflow {
  margin: 10px 0 0;
  font-size: 11px;
  font-weight: 700;
  color: var(--pov-meta, #64748b);
}

@media (max-width: 560px) {
  .pib-people-section {
    padding: 14px 14px 16px;
  }

  .pib-people-section__head .pib-section-head {
    flex-wrap: wrap;
  }

  .pib-people-summary {
    margin-left: 0;
    margin-top: 4px;
  }

  .pib-people-body__top {
    flex-direction: column;
    align-items: flex-start;
  }

  .pib-people-status {
    text-align: left;
  }
}

/* ============================ Provider timeline ============================ */

.pib-timeline-details summary {
  cursor: pointer;
  list-style: none;
  margin: -6px -8px;
  padding: 6px 8px;
  border-radius: 12px;
  transition: background 0.14s ease;
}

.pib-timeline-details summary:hover {
  background: color-mix(in srgb, var(--pov-navy, #0f172a) 3%, transparent);
}

.pib-timeline-details summary::-webkit-details-marker {
  display: none;
}

.pib-timeline-feed {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.pib-timeline-feed__item {
  padding: 12px 14px;
  border-radius: 12px;
  background: linear-gradient(180deg, #fff, #fafcfe);
  border: 1px solid color-mix(in srgb, var(--pov-navy, #0f172a) 8%, var(--pov-border, #c9d2df));
}

.pib-timeline-feed__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.pib-timeline-feed__date {
  font-size: 11px;
  font-weight: 700;
  color: var(--pov-meta, #64748b);
  font-variant-numeric: tabular-nums;
}

.pib-timeline-feed__type {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--pov-teal, #0d9488);
}

.pib-timeline-feed__actor {
  font-size: 10px;
  color: var(--pov-meta, #64748b);
}

.pib-timeline-feed__title {
  margin: 0;
  font-size: 12px;
  font-weight: 700;
  color: var(--pov-ink, #0b1220);
}

.pib-timeline-feed__preview {
  margin: 6px 0 0;
  font-size: 12px;
  line-height: 1.45;
  font-style: italic;
  color: var(--pov-ink-soft, #334155);
}

.pib-timeline-feed__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 8px;
}

.pib-timeline-feed__action {
  font-size: 11px;
  font-weight: 700;
  color: var(--pov-teal, #0d9488);
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  text-decoration: none;
}

.pib-timeline-feed__action:hover {
  text-decoration: underline;
}

/* ============================ Intelligence evidence ============================ */

.pib-evidence-details summary {
  cursor: pointer;
  list-style: none;
  margin: -6px -8px;
  padding: 6px 8px;
  border-radius: 12px;
  transition: background 0.14s ease;
}

.pib-evidence-details summary:hover {
  background: color-mix(in srgb, var(--pov-navy, #0f172a) 3%, transparent);
}

.pib-evidence-details summary::-webkit-details-marker {
  display: none;
}

.pib-evidence-summary-row {
  align-items: center;
  margin-bottom: 0;
}

.pib-evidence-details[open] .pib-evidence-summary-row {
  margin-bottom: 12px;
}

.pib-evidence-summary-meta {
  display: inline-flex;
  align-items: center;
  gap: 10px;
}

.pib-evidence-count.pov-cc-activity__link {
  font-variant-numeric: tabular-nums;
}

.pib-evidence-chevron {
  flex-shrink: 0;
  width: 9px;
  height: 9px;
  border-right: 2px solid var(--pov-meta, #64748b);
  border-bottom: 2px solid var(--pov-meta, #64748b);
  transform: rotate(45deg);
  transition: transform 0.18s ease;
  margin-top: -3px;
}

.pib-evidence-details[open] .pib-evidence-chevron {
  transform: rotate(-135deg);
  margin-top: 4px;
}

.pib-evidence-card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
  gap: 10px;
  margin-top: 12px;
}

.pib-evidence-card {
  padding: 12px 14px;
  border-radius: 12px;
  background: linear-gradient(180deg, #fff, #fafcfe);
  border: 1px solid color-mix(in srgb, var(--pov-navy, #0f172a) 8%, var(--pov-border, #c9d2df));
  transition: transform 0.14s ease, box-shadow 0.14s ease;
}

.pib-evidence-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(15, 23, 42, 0.08);
}

.pib-evidence-card__title {
  margin: 0;
  font-size: 12px;
  font-weight: 700;
  color: var(--pov-ink, #0b1220);
}

.pib-evidence-card__date,
.pib-evidence-card__source {
  margin: 2px 0 0;
  font-size: 10px;
  font-weight: 700;
  color: var(--pov-meta, #64748b);
  font-variant-numeric: tabular-nums;
}

.pib-evidence-card__extracted {
  margin-top: 8px;
}

.pib-evidence-card__extracted-label {
  margin: 0 0 4px;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  color: var(--pov-meta, #64748b);
}

.pib-evidence-card__mapped {
  margin: 6px 0 0;
  font-size: 10px;
  color: var(--pov-meta, #64748b);
}

.pib-evidence-card__link {
  display: inline-block;
  margin-top: 6px;
  font-size: 11px;
  font-weight: 700;
  color: var(--pov-teal, #0d9488);
  text-decoration: none;
}

.pib-evidence-card__link:hover {
  text-decoration: underline;
}

.pib-evidence-card__excerpt {
  margin: 8px 0 0;
  padding: 6px 10px;
  font-size: 11px;
  line-height: 1.45;
  font-style: italic;
  color: var(--pov-ink-soft, #334155);
  background: rgba(13, 148, 136, 0.06);
  border-left: 2px solid rgba(13, 148, 136, 0.4);
  border-radius: 0 8px 8px 0;
}

.pib-evidence-card__why {
  margin: 8px 0 0;
  font-size: 11px;
  line-height: 1.45;
  color: var(--pov-meta, #64748b);
}

/* ======================= Pending intelligence suggestions ======================= */

.pib-pending-intelligence-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin: 0 0 14px;
  padding: 14px 16px;
  border-radius: 14px;
  border: 1px solid color-mix(in srgb, var(--brand-600) 22%, var(--border));
  background: color-mix(in srgb, var(--brand-50, #ecfeff) 55%, var(--surface));
}
.pib-pending-intelligence-banner__kicker {
  margin: 0 0 2px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--brand-700);
}
.pib-pending-intelligence-banner__title {
  margin: 0;
  font-size: 14px;
  font-weight: 800;
  color: var(--foreground);
}
.pib-pending-intelligence-banner__cta {
  flex-shrink: 0;
  min-height: 40px;
  padding: 0 14px;
  border-radius: 10px;
  border: none;
  background: var(--brand-600);
  color: #fff;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
}

.pib-candidate-contacts {
  display: grid;
  gap: 12px;
  padding: 16px 18px;
  border-radius: 16px;
  border: 1px solid color-mix(in srgb, var(--brand-600) 22%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 5%, var(--surface));
}

.pib-candidate-contacts__kicker {
  margin: 0;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--brand-700);
}

.pib-candidate-contacts__title {
  margin: 4px 0 0;
  font-size: 14px;
  font-weight: 800;
  color: var(--foreground);
}

.pib-candidate-contacts__list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 12px;
}

.pib-candidate-contacts__item {
  display: grid;
  gap: 12px;
  padding: 14px;
  border-radius: 12px;
  background: var(--surface);
  border: 1px solid var(--border);
}

.pib-candidate-contacts__name {
  margin: 0;
  font-size: 15px;
  font-weight: 800;
}

.pib-candidate-contacts__role,
.pib-candidate-contacts__quote {
  margin: 4px 0 0;
  font-size: 12px;
  line-height: 1.45;
  color: var(--muted);
}

.pib-candidate-contacts__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.pib-candidate-contacts__cta {
  min-height: 36px;
  padding: 0 12px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: var(--surface);
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.pib-candidate-contacts__cta--primary {
  border-color: transparent;
  background: var(--brand-600);
  color: #fff;
}

.pib-candidate-contacts__cta--muted {
  color: var(--muted);
}

/* =============================== Empty state =============================== */

.pib-empty-banner {
  margin: 0;
  padding: 26px 20px;
  border-radius: 16px;
  font-size: 13px;
  line-height: 1.5;
  text-align: center;
  color: var(--pov-meta, #64748b);
  background:
    radial-gradient(20rem 8rem at 50% -40%, rgba(13, 148, 136, 0.08), transparent 70%),
    #fff;
  border: 1.5px dashed color-mix(in srgb, var(--pov-navy, #0f172a) 16%, var(--pov-border, #c9d2df));
  box-shadow: none;
}

/* ================================ Mobile ================================ */

@media (max-width: 960px) {
  .pib-hero {
    padding: 18px 16px;
  }

  .pib-hero__cta.mc-cta--primary {
    width: 100%;
  }

  .pib-case-intel__grid,
  .pib-dossier-section .pib-case-intel__grid,
  .pib-signals-section__grid {
    grid-template-columns: 1fr;
  }

  .pib-case-intel__meta {
    text-align: left;
  }

  .pib-access-milestones > li:not(:last-child)::after {
    display: none;
  }

  .pib-access-milestones {
    gap: 8px;
  }

  .mc-workspace--provider-intelligence .pov-cc-summary,
  .mc-workspace--provider-intelligence .pov-cc-activity--compact,
  .mc-workspace--provider-intelligence .pov-cc-intel-zone {
    padding: 14px;
  }

  .pib-evidence-summary-row {
    flex-wrap: wrap;
    gap: 8px;
  }
}

/* Phones — tighten spacing, stack rows, and grow tap targets. */
@media (max-width: 640px) {
  .provider-profile-root--intelligence-tab .provider-profile-body:has(.mc-workspace--provider-intelligence) {
    padding: 4px 8px calc(68px + env(safe-area-inset-bottom, 0px));
  }

  .mc-workspace--provider-intelligence .pov-cc {
    gap: 12px;
  }

  .pib-hero {
    flex-direction: column;
    align-items: stretch;
    gap: 14px;
    padding: 16px 14px;
    border-radius: 16px;
  }

  /* In a column, the 18rem flex-basis becomes a height and balloons the block. */
  .pib-hero__main {
    flex: 0 0 auto;
  }

  .pib-hero__subtitle.pib-intel-page-head__subtitle {
    font-size: 12.5px;
  }

  .mc-workspace--provider-intelligence .pov-cc-summary,
  .mc-workspace--provider-intelligence .pov-cc-activity--compact,
  .mc-workspace--provider-intelligence .pov-cc-intel-zone {
    padding: 13px 12px;
    border-radius: 14px;
  }

  /* Snapshot metrics stack rather than squeeze into two columns. */
  .mc-workspace--provider-intelligence .pov-cc-command-grid {
    grid-template-columns: 1fr;
  }

  /* Section headers wrap so a long badge can't crush the title to 1px. */
  .pib-section-head {
    flex-wrap: wrap;
    gap: 6px 10px;
  }

  .pib-section-head__copy {
    flex: 1 1 auto;
  }

  .pib-section-head__icon {
    width: 32px;
    height: 32px;
    border-radius: 9px;
  }

  .pib-section-head__icon svg {
    width: 16px;
    height: 16px;
  }

  .pib-section-head__meta {
    flex-basis: 100%;
    margin-left: 0;
  }

  .pib-ai-summary-details__meta {
    flex-wrap: wrap;
    gap: 6px;
  }

  .pib-access-confirmed-badge {
    white-space: normal;
  }

  .pib-dossier-card.pov-cc-command-card {
    padding: 13px 12px;
  }

  .pib-case-intel__header,
  .pib-case-intel__status-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  /* Full-width, comfortably tappable action buttons. */
  .pib-people-review-actions,
  .pib-org-suggested-item__actions,
  .pib-candidate-contacts__actions {
    flex-direction: column;
  }

  .pib-people-review-actions__button,
  .pib-candidate-contacts__cta {
    width: 100%;
    min-height: 42px;
  }

  .pib-follow-up-item__label {
    font-size: 13.5px;
  }

  /* Evidence cards go single-column so quotes stay readable. */
  .pib-evidence-card-grid {
    grid-template-columns: 1fr;
  }
}

/* ==================== Accept-contact scope modal ==================== */

.cas-modal__backdrop {
  position: fixed;
  inset: 0;
  z-index: 10060;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(15, 23, 42, 0.5);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  animation: cas-fade 0.16s ease-out;
}

@keyframes cas-fade {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes cas-pop {
  from { opacity: 0; transform: translateY(10px) scale(0.98); }
  to { opacity: 1; transform: none; }
}

@keyframes cas-sheet {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

.cas-modal {
  width: min(500px, 100%);
  max-height: calc(100dvh - 40px);
  display: flex;
  flex-direction: column;
  border-radius: 20px;
  background: #fff;
  border: 1px solid rgba(148, 163, 184, 0.24);
  box-shadow: 0 30px 80px rgba(15, 23, 42, 0.32);
  overflow: hidden;
  animation: cas-pop 0.2s cubic-bezier(0.22, 0.9, 0.32, 1);
}

.cas-modal__header {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 22px 22px 18px;
  border-bottom: 1px solid rgba(226, 232, 240, 0.9);
  background:
    radial-gradient(30rem 12rem at 0% -40%, rgba(20, 184, 166, 0.16), transparent 60%),
    linear-gradient(180deg, #f6fffe, #ffffff);
}

.cas-modal__header-main {
  flex: 1;
  min-width: 0;
}

.cas-modal__eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin: 0 0 10px;
  padding: 4px 10px 4px 8px;
  border-radius: 999px;
  font-size: 10.5px;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #0f766e;
  background: rgba(20, 184, 166, 0.12);
  border: 1px solid rgba(20, 184, 166, 0.24);
}

.cas-modal__eyebrow svg {
  width: 13px;
  height: 13px;
}

.cas-modal__title {
  margin: 0;
  font-size: 20px;
  line-height: 1.25;
  font-weight: 850;
  letter-spacing: -0.02em;
  color: #0f172a;
}

.cas-modal__subtitle {
  display: none;
}

.cas-modal__contact-quote {
  margin: 6px 0 0;
  font-size: 12px;
  line-height: 1.45;
  font-style: italic;
  color: #475569;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.cas-modal__source-note {
  margin: 0 0 12px;
  padding: 8px 10px;
  border-radius: 10px;
  background: rgba(20, 184, 166, 0.06);
  border: 1px solid rgba(20, 184, 166, 0.16);
  font-size: 11.5px;
  line-height: 1.4;
  font-style: italic;
  color: #475569;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.cas-modal__fields {
  display: grid;
  gap: 10px;
  margin-bottom: 2px;
}

.cas-modal__field {
  display: grid;
  gap: 5px;
}

.cas-modal__field-label {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #64748b;
}

.cas-modal__field-input {
  width: 100%;
  box-sizing: border-box;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  background: #fff;
  font-size: 14px;
  font-weight: 650;
  color: #0f172a;
}

.cas-modal__field-input:focus {
  outline: none;
  border-color: #14b8a6;
  box-shadow: 0 0 0 3px rgba(20, 184, 166, 0.12);
}

.cas-modal__fields-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.cas-modal__field-textarea {
  min-height: 54px;
  resize: vertical;
  line-height: 1.4;
  font-family: inherit;
}

.cas-modal--edit .cas-modal__group-label {
  margin-top: 12px;
}

.cas-modal__close {
  flex-shrink: 0;
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.35);
  background: #fff;
  color: #475569;
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
  transition: background 0.14s ease, color 0.14s ease, border-color 0.14s ease;
}

.cas-modal__close:hover:not(:disabled) {
  background: #f1f5f9;
  color: #0f172a;
  border-color: rgba(148, 163, 184, 0.55);
}

.cas-modal__close:disabled {
  cursor: wait;
  opacity: 0.6;
}

.cas-modal__body {
  padding: 20px 22px;
  overflow-y: auto;
}

.cas-modal__contact-card {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px;
  border-radius: 14px;
  background: linear-gradient(180deg, rgba(20, 184, 166, 0.08), rgba(20, 184, 166, 0.03));
  border: 1px solid rgba(20, 184, 166, 0.22);
}

.cas-modal__contact-avatar {
  flex-shrink: 0;
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 800;
  letter-spacing: 0.02em;
  color: #fff;
  background: linear-gradient(140deg, #14b8a6, #0f766e);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.3);
}

.cas-modal__contact-copy {
  min-width: 0;
}

.cas-modal__contact-name {
  margin: 3px 0 0;
  font-size: 14px;
  font-weight: 800;
  color: #0f172a;
}

.cas-modal__contact-role {
  font-weight: 650;
  color: #64748b;
}

.cas-modal__group-label {
  margin: 18px 0 10px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #64748b;
}

.cas-modal__options {
  display: grid;
  gap: 10px;
}

.cas-option {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 13px 14px;
  border-radius: 14px;
  border: 1.5px solid #e2e8f0;
  background: #fff;
  cursor: pointer;
  transition: border-color 0.14s ease, background 0.14s ease, box-shadow 0.14s ease;
}

.cas-option:hover {
  border-color: rgba(20, 184, 166, 0.42);
  background: rgba(20, 184, 166, 0.04);
}

.cas-option--selected {
  border-color: #14b8a6;
  background: rgba(20, 184, 166, 0.08);
  box-shadow: 0 0 0 3px rgba(20, 184, 166, 0.12);
}

.cas-option:has(.cas-option__radio:focus-visible) {
  border-color: #0f766e;
  box-shadow: 0 0 0 3px rgba(15, 118, 110, 0.2);
}

.cas-option__radio {
  flex-shrink: 0;
  margin-top: 2px;
  width: 18px;
  height: 18px;
  accent-color: #0f766e;
  cursor: inherit;
}

.cas-option__body {
  display: grid;
  gap: 3px;
  min-width: 0;
}

.cas-option__title {
  font-size: 13.5px;
  font-weight: 800;
  color: #0f172a;
}

.cas-option__desc {
  font-size: 12px;
  line-height: 1.4;
  color: #64748b;
}

.cas-modal__footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 16px 22px 20px;
  border-top: 1px solid rgba(226, 232, 240, 0.9);
  background: #fff;
}

.cas-modal__btn {
  min-height: 42px;
  padding: 0 18px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 800;
  cursor: pointer;
  transition: transform 0.14s ease, box-shadow 0.14s ease, filter 0.14s ease, background 0.14s ease;
}

.cas-modal__btn:disabled {
  cursor: wait;
  opacity: 0.7;
}

.cas-modal__btn--ghost {
  border: 1px solid #cbd5e1;
  background: #fff;
  color: #334155;
}

.cas-modal__btn--ghost:hover:not(:disabled) {
  background: #f1f5f9;
  border-color: #94a3b8;
}

.cas-modal__btn--primary {
  border: 0;
  color: #fff;
  background: linear-gradient(135deg, #0f766e, #14b8a6);
  box-shadow: 0 10px 22px rgba(15, 118, 110, 0.24);
}

.cas-modal__btn--primary:hover:not(:disabled) {
  transform: translateY(-1px);
  filter: brightness(1.05);
}

.cas-modal__btn--primary:active:not(:disabled) {
  transform: translateY(0);
}

@media (prefers-reduced-motion: reduce) {
  .cas-modal,
  .cas-modal__backdrop {
    animation: none;
  }
}

/* Mobile: dock as a bottom sheet that never exceeds the viewport. */
@media (max-width: 560px) {
  .cas-modal__backdrop {
    flex-direction: column;
    justify-content: flex-end;
    align-items: stretch;
    padding: 0;
  }

  .cas-modal {
    width: 100%;
    max-height: 100dvh;
    border-radius: 18px 18px 0 0;
    border-bottom: 0;
    animation: cas-sheet 0.24s cubic-bezier(0.22, 0.9, 0.32, 1);
  }

  .cas-modal__header {
    position: relative;
    flex-shrink: 0;
    padding: 14px 16px 10px;
  }

  .cas-modal__eyebrow,
  .cas-modal__subtitle {
    display: none;
  }

  .cas-modal__title {
    font-size: 17px;
    line-height: 1.2;
    padding-right: 36px;
  }

  .cas-modal__close {
    position: absolute;
    top: 12px;
    right: 12px;
  }

  .cas-modal__body {
    flex: 1 1 auto;
    min-height: 0;
    padding: 0 16px 12px;
    overflow: hidden;
  }

  .cas-modal__contact-card {
    gap: 10px;
    padding: 10px 12px;
    border-radius: 12px;
  }

  .cas-modal__contact-avatar {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    font-size: 13px;
  }

  .cas-modal__contact-name {
    margin: 0;
    font-size: 13px;
  }

  .cas-modal__contact-quote {
    margin: 4px 0 0;
    font-size: 11px;
    line-height: 1.35;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .cas-modal__source-note {
    display: none;
  }

  .cas-modal__fields {
    gap: 8px;
    margin-bottom: 0;
  }

  .cas-modal__field-input {
    padding: 9px 11px;
    font-size: 16px;
  }

  .cas-modal--edit .cas-modal__body {
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  }

  .cas-modal__fields-row {
    gap: 8px;
  }

  .cas-modal__field-textarea {
    min-height: 48px;
  }

  .cas-modal--edit .cas-modal__group-label {
    margin-top: 8px;
  }

  .cas-modal__group-label {
    margin: 10px 0 6px;
    font-size: 10px;
  }

  .cas-modal__options {
    gap: 6px;
  }

  .cas-option {
    gap: 10px;
    padding: 10px 12px;
    border-radius: 12px;
  }

  .cas-option__radio {
    width: 16px;
    height: 16px;
    margin-top: 1px;
  }

  .cas-option__title {
    font-size: 13px;
  }

  .cas-option__desc {
    display: none;
  }

  .cas-modal__footer {
    flex-shrink: 0;
    flex-direction: row;
    gap: 8px;
    padding: 10px 16px calc(12px + env(safe-area-inset-bottom, 0px));
  }

  .cas-modal__btn {
    flex: 1;
    min-height: 40px;
    padding: 0 12px;
    font-size: 13px;
  }
}
`;
