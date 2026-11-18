/** Intro call prepare — pathway-focused polish on top of pre-call plan shell. */

export const prepareIntroCallCss = `

.prepare-for-meeting-page--intro-call {

  --pfm-hero-accent: #2563eb;

  --pfm-hero-accent-soft: #60a5fa;

  --icp-mission-bg: linear-gradient(145deg, #eff6ff 0%, #f0fdf4 48%, #faf5ff 100%);

  --icp-mission-border: color-mix(in srgb, #2563eb 22%, #c9d2df);

  --icp-section-accent: #2563eb;

  --pfm-page-bg:

    radial-gradient(ellipse 120% 80% at 50% -20%, color-mix(in srgb, #2563eb 8%, transparent), transparent 55%),

    linear-gradient(180deg, #e8edf5 0%, #dfe5ed 40%, #d8dee8 100%);

}



.prepare-for-meeting-page--intro-call .pfm-precall-command::before {

  background:

    radial-gradient(ellipse 68% 58% at 94% -12%, color-mix(in srgb, #2563eb 34%, transparent), transparent 58%),

    radial-gradient(ellipse 42% 38% at 4% 105%, color-mix(in srgb, #0d9488 18%, transparent), transparent 54%),

    radial-gradient(ellipse 30% 24% at 72% 88%, color-mix(in srgb, #7c3aed 12%, transparent), transparent 50%);

}



.prepare-for-meeting-page--intro-call .pfm-precall-command__kicker {

  display: inline-flex;

  align-items: center;

  gap: 6px;

  width: fit-content;

  padding: 3px 10px 3px 8px;

  border-radius: 999px;

  font-size: 11px;

  font-weight: 800;

  letter-spacing: 0.08em;

  color: rgba(191, 219, 254, 0.98);

  background: color-mix(in srgb, #2563eb 28%, rgba(15, 23, 42, 0.5));

  border: 1px solid color-mix(in srgb, #60a5fa 35%, rgba(255, 255, 255, 0.12));

}



.prepare-for-meeting-page--intro-call .pfm-precall-command__kicker::before {

  content: "";

  width: 6px;

  height: 6px;

  border-radius: 50%;

  background: #60a5fa;

  box-shadow: 0 0 8px color-mix(in srgb, #60a5fa 80%, transparent);

  flex-shrink: 0;

}



.prepare-for-meeting-page--intro-call .pfm-precall-command__type {

  background: linear-gradient(180deg, #3b82f6 0%, #2563eb 100%);

  border-color: color-mix(in srgb, #2563eb 50%, rgba(255, 255, 255, 0.22));

  box-shadow: 0 2px 12px color-mix(in srgb, #2563eb 35%, transparent);

}



.prepare-for-meeting-page--intro-call .pfm-precall-layout {

  gap: 14px;

}



/* —— Mission strip —— */

.icp-mission-strip {

  display: flex;

  flex-direction: column;

  gap: 14px;

  padding: 16px;

  border-radius: 16px;

  border: 1px solid var(--icp-mission-border);

  background: var(--icp-mission-bg);

  box-shadow:

    0 1px 0 color-mix(in srgb, #fff 80%, transparent) inset,

    0 12px 36px color-mix(in srgb, #2563eb 10%, transparent),

    0 2px 8px color-mix(in srgb, #0f172a 4%, transparent);

  position: relative;

  overflow: hidden;

}



.icp-mission-strip::before {

  content: "";

  position: absolute;

  inset: 0;

  pointer-events: none;

  background:

    radial-gradient(ellipse 50% 40% at 100% 0%, color-mix(in srgb, #2563eb 10%, transparent), transparent 60%),

    radial-gradient(ellipse 40% 35% at 0% 100%, color-mix(in srgb, #0d9488 8%, transparent), transparent 55%);

}



.icp-mission-strip > * {

  position: relative;

  z-index: 1;

}



.icp-mission-strip__pathway {

  display: flex;

  flex-wrap: wrap;

  align-items: center;

  gap: 4px 2px;

  padding: 4px;

  border-radius: 999px;

  width: fit-content;

  max-width: 100%;

  background: color-mix(in srgb, #fff 72%, transparent);

  border: 1px solid color-mix(in srgb, #2563eb 12%, #e2e8f0);

  box-shadow: 0 2px 8px color-mix(in srgb, #2563eb 6%, transparent);

}



.icp-mission-strip__pathway-step {

  display: inline-flex;

  align-items: center;

  gap: 6px;

  min-height: 28px;

  padding: 4px 12px 4px 8px;

  border-radius: 999px;

  font-size: 11px;

  font-weight: 800;

  letter-spacing: 0.03em;

  text-transform: uppercase;

  color: #64748b;

  background: transparent;

  border: 1px solid transparent;

  transition: color 0.15s ease, background 0.15s ease;

}



.icp-mission-strip__pathway-num {

  display: inline-grid;

  place-items: center;

  width: 18px;

  height: 18px;

  border-radius: 50%;

  font-size: 10px;

  font-weight: 900;

  color: #94a3b8;

  background: color-mix(in srgb, #fff 60%, #e2e8f0);

  border: 1px solid color-mix(in srgb, #64748b 14%, #e2e8f0);

  flex-shrink: 0;

}



.icp-mission-strip__pathway-step--current {

  color: #fff;

  background: linear-gradient(180deg, #3b82f6 0%, #2563eb 100%);

  border-color: color-mix(in srgb, #2563eb 40%, #1e3a8a);

  box-shadow:

    0 2px 12px color-mix(in srgb, #2563eb 38%, transparent),

    0 1px 0 color-mix(in srgb, #fff 25%, transparent) inset;

}



.icp-mission-strip__pathway-step--current .icp-mission-strip__pathway-num {

  color: #1e40af;

  background: #fff;

  border-color: color-mix(in srgb, #fff 60%, #93c5fd);

  box-shadow: 0 1px 4px color-mix(in srgb, #2563eb 20%, transparent);

}



.icp-mission-strip__pathway-sep {

  display: inline-flex;

  align-items: center;

  justify-content: center;

  width: 16px;

  height: 16px;

  color: color-mix(in srgb, #64748b 50%, transparent);

  flex-shrink: 0;

}



.icp-mission-strip__pathway-sep svg {

  width: 14px;

  height: 14px;

}



.icp-mission-strip__grid {

  display: grid;

  gap: 12px;

}



@media (min-width: 768px) {

  .icp-mission-strip__grid {

    grid-template-columns: minmax(0, 1fr) minmax(0, 1.05fr);

    gap: 14px;

    align-items: stretch;

  }

}



.icp-mission-strip__card {

  display: flex;

  gap: 12px;

  padding: 14px;

  border-radius: 14px;

  background: color-mix(in srgb, #fff 88%, transparent);

  border: 1px solid color-mix(in srgb, #2563eb 10%, #e2e8f0);

  box-shadow: 0 2px 12px color-mix(in srgb, #0f172a 4%, transparent);

  min-width: 0;

}



.icp-mission-strip__card-icon {

  display: grid;

  place-items: center;

  width: 40px;

  height: 40px;

  border-radius: 12px;

  flex-shrink: 0;

}



.icp-mission-strip__card-icon svg {

  width: 20px;

  height: 20px;

}



.icp-mission-strip__card-icon--mission {

  color: #2563eb;

  background: color-mix(in srgb, #2563eb 10%, #fff);

  border: 1px solid color-mix(in srgb, #2563eb 16%, #dbeafe);

}



.icp-mission-strip__card-icon--lead {

  color: #0d9488;

  background: color-mix(in srgb, #0d9488 10%, #fff);

  border: 1px solid color-mix(in srgb, #0d9488 16%, #ccfbf1);

}



.icp-mission-strip__card-body {

  min-width: 0;

  flex: 1;

}



.icp-mission-strip__label {

  margin: 0 0 4px;

  font-size: 10px;

  font-weight: 800;

  letter-spacing: 0.1em;

  text-transform: uppercase;

  color: #64748b;

}



.icp-mission-strip__goal {

  margin: 0;

  font-size: clamp(16px, 3.6vw, 19px);

  font-weight: 900;

  line-height: 1.25;

  letter-spacing: -0.025em;

  color: #0b1220;

}



.icp-mission-strip__why {

  margin: 8px 0 0;

  font-size: 12px;

  line-height: 1.5;

  color: #475569;

}



.icp-mission-strip__specialty {

  margin: 10px 0 0;

  display: inline-flex;

  align-items: center;

  gap: 5px;

  padding: 4px 10px;

  border-radius: 999px;

  font-size: 11px;

  font-weight: 800;

  color: #1d4ed8;

  background: color-mix(in srgb, #2563eb 10%, #fff);

  border: 1px solid color-mix(in srgb, #2563eb 18%, #dbeafe);

}



.icp-mission-strip__specialty::before {

  content: "◆";

  font-size: 7px;

  opacity: 0.7;

}



.icp-mission-strip__primary {

  margin: 0;

  padding: 12px 14px;

  border-left: 3px solid #0d9488;

  border-radius: 0 12px 12px 0;

  font-size: 14px;

  font-weight: 700;

  line-height: 1.5;

  font-style: normal;

  color: #0f172a;

  background: linear-gradient(90deg, color-mix(in srgb, #0d9488 6%, #fff), color-mix(in srgb, #fff 90%, #f0fdf4));

  box-shadow: inset 0 1px 0 color-mix(in srgb, #fff 80%, transparent);

}



.icp-mission-strip__followups {

  margin: 10px 0 0;

  padding: 0;

  list-style: none;

  display: grid;

  gap: 7px;

}



.icp-mission-strip__followups li {

  position: relative;

  padding: 8px 10px 8px 28px;

  font-size: 12px;

  line-height: 1.45;

  font-weight: 600;

  color: #334155;

  background: color-mix(in srgb, #fff 70%, #f8fafc);

  border-radius: 10px;

  border: 1px solid color-mix(in srgb, #64748b 10%, #e2e8f0);

}



.icp-mission-strip__followups li::before {

  content: "?";

  position: absolute;

  left: 8px;

  top: 50%;

  transform: translateY(-50%);

  width: 16px;

  height: 16px;

  border-radius: 50%;

  display: grid;

  place-items: center;

  font-size: 10px;

  font-weight: 900;

  color: #64748b;

  background: color-mix(in srgb, #fff 80%, #e2e8f0);

  border: 1px solid color-mix(in srgb, #64748b 16%, #e2e8f0);

}



/* —— Planning surface accent —— */

.prepare-for-meeting-page--intro-call .pfm-precall-planning-surface {

  border-color: color-mix(in srgb, #2563eb 16%, #c9d2df);

  box-shadow:

    var(--pfm-elev-surface),

    0 0 0 1px color-mix(in srgb, #2563eb 6%, transparent);

}



.prepare-for-meeting-page--intro-call .pfm-precall-planning-surface::before {

  content: "";

  display: block;

  height: 3px;

  background: linear-gradient(90deg, #2563eb 0%, #0d9488 55%, #7c3aed 100%);

}



/* —— Intro plan panel —— */

.prepare-for-meeting-page--intro-call .pfm-precall-plan-panel__head {

  align-items: flex-start;

  padding: 16px 16px 14px;

  background: linear-gradient(180deg, #f0f7ff 0%, #fff 100%);

  border-top: none;

}



.prepare-for-meeting-page--intro-call .pfm-precall-plan-panel__kicker {

  color: #2563eb;

}



.prepare-for-meeting-page--intro-call .pfm-precall-plan-panel__title {

  font-size: clamp(18px, 3.8vw, 21px);

  background: linear-gradient(135deg, #0b1220 0%, #1e40af 100%);

  -webkit-background-clip: text;

  background-clip: text;

  -webkit-text-fill-color: transparent;

}



.prepare-for-meeting-page--intro-call .pfm-precall-plan-panel__lead {

  margin: 6px 0 0;

  max-width: 54ch;

  font-size: 13px;

  line-height: 1.55;

  color: #64748b;

}



.prepare-for-meeting-page--intro-call .pfm-precall-plan-grid--intro-sections {

  counter-reset: icp-section;

  gap: 14px;

  padding: 0 14px 16px;

}



.prepare-for-meeting-page--intro-call .pfm-precall-plan-section {

  counter-increment: icp-section;

  display: flex;

  flex-direction: column;

  gap: 10px;

  min-width: 0;

  padding: 14px;

  border-radius: 14px;

  border: 1px solid color-mix(in srgb, var(--icp-section-accent, #2563eb) 14%, #e2e8f0);

  background: linear-gradient(

    180deg,

    color-mix(in srgb, var(--icp-section-accent, #2563eb) 4%, #fff) 0%,

    #fff 100%

  );

  box-shadow: 0 2px 10px color-mix(in srgb, var(--icp-section-accent, #2563eb) 5%, transparent);

}



.prepare-for-meeting-page--intro-call .pfm-precall-plan-section:nth-child(1) {

  --icp-section-accent: #2563eb;

}



.prepare-for-meeting-page--intro-call .pfm-precall-plan-section:nth-child(2) {

  --icp-section-accent: #0d9488;

}



.prepare-for-meeting-page--intro-call .pfm-precall-plan-section:nth-child(3) {

  --icp-section-accent: #7c3aed;

}



.prepare-for-meeting-page--intro-call .pfm-precall-plan-section + .pfm-precall-plan-section {

  margin-top: 0;

  padding-top: 14px;

  border-top: none;

}



.prepare-for-meeting-page--intro-call .pfm-precall-plan-section__head {

  display: flex;

  flex-direction: row;

  align-items: flex-start;

  gap: 10px;

  padding: 0;

}



.prepare-for-meeting-page--intro-call .pfm-precall-plan-section__head::before {

  content: counter(icp-section);

  display: grid;

  place-items: center;

  width: 28px;

  height: 28px;

  border-radius: 10px;

  flex-shrink: 0;

  font-size: 13px;

  font-weight: 900;

  color: #fff;

  background: linear-gradient(

    145deg,

    color-mix(in srgb, var(--icp-section-accent) 90%, #fff),

    var(--icp-section-accent)

  );

  box-shadow: 0 2px 8px color-mix(in srgb, var(--icp-section-accent) 30%, transparent);

}



.prepare-for-meeting-page--intro-call .pfm-precall-plan-section__title-wrap {

  min-width: 0;

  flex: 1;

}



.prepare-for-meeting-page--intro-call .pfm-precall-plan-section__title {

  margin: 0;

  font-size: 13px;

  font-weight: 900;

  letter-spacing: 0.04em;

  text-transform: uppercase;

  color: var(--icp-section-accent);

}



.prepare-for-meeting-page--intro-call .pfm-precall-plan-section__hint {

  margin: 3px 0 0;

  font-size: 12px;

  line-height: 1.4;

  color: #64748b;

}



.prepare-for-meeting-page--intro-call .pfm-precall-plan-section__fields {

  display: flex;

  flex-direction: column;

  gap: 10px;

}



/* —— Field cards: filled state + intro accent —— */

.prepare-for-meeting-page--intro-call .pfm-precall-field-card {

  border-color: color-mix(in srgb, var(--icp-section-accent, #2563eb) 10%, #c9d2df);

  background: color-mix(in srgb, #fff 96%, var(--icp-section-accent, #2563eb));

  transition: border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;

}



.prepare-for-meeting-page--intro-call .pfm-precall-field-card:hover {

  border-color: color-mix(in srgb, var(--icp-section-accent, #2563eb) 22%, #c9d2df);

}



.prepare-for-meeting-page--intro-call .pfm-precall-field-card:focus-within {

  border-color: color-mix(in srgb, var(--icp-section-accent, #2563eb) 40%, #c9d2df);

  box-shadow: 0 0 0 3px color-mix(in srgb, var(--icp-section-accent, #2563eb) 12%, transparent);

}



.prepare-for-meeting-page--intro-call .pfm-precall-field-card[data-filled="true"] {

  border-color: color-mix(in srgb, #0d9488 32%, #c9d2df);

  background: linear-gradient(180deg, #fff 0%, #f8fffe 100%);

}



.prepare-for-meeting-page--intro-call .pfm-precall-field-card[data-filled="true"] .pfm-precall-field-card__label::after {

  content: "Ready";

  margin-left: 8px;

  display: inline-flex;

  padding: 2px 7px;

  border-radius: 999px;

  font-size: 9px;

  font-weight: 800;

  letter-spacing: 0.06em;

  text-transform: uppercase;

  vertical-align: middle;

  color: #0f766e;

  background: color-mix(in srgb, #14b8a6 14%, #fff);

  border: 1px solid color-mix(in srgb, #0d9488 24%, transparent);

}



.prepare-for-meeting-page--intro-call .pfm-precall-field-card__helper {

  -webkit-line-clamp: 2;

}



.prepare-for-meeting-page--intro-call .pfm-precall-field-card__input {

  font-size: 15px;

  min-height: 88px;

  border-radius: 10px;

  border-color: color-mix(in srgb, var(--icp-section-accent, #2563eb) 8%, #e2e8f0);

}



@media (max-width: 640px) {

  .prepare-for-meeting-page--intro-call .pfm-precall-field-card {

    padding: 12px;

  }



  .prepare-for-meeting-page--intro-call .pfm-precall-field-card__menu-trigger {

    width: 44px;

    height: 44px;

    border-radius: 10px;

    background: color-mix(in srgb, #2563eb 6%, #fff);

  }



  .prepare-for-meeting-page--intro-call .pfm-precall-field-card__menu-wrap {

    opacity: 1;

  }



  .prepare-for-meeting-page--intro-call .pfm-precall-field-card__input {

    min-height: 96px;

    padding: 12px;

  }

}



/* —— Progress ring completion —— */

.prepare-for-meeting-page--intro-call .pfm-precall-completion {

  display: flex;

  align-items: flex-start;

  gap: 12px;

  max-width: none;

  flex: 1 1 240px;

  padding: 10px 12px;

  border-radius: 12px;

  background: color-mix(in srgb, #2563eb 5%, #fff);

  border-color: color-mix(in srgb, #2563eb 18%, #c9d2df);

}



.prepare-for-meeting-page--intro-call .pfm-precall-completion__ring {

  --icp-progress: 0;

  width: 46px;

  height: 46px;

  border-radius: 50%;

  flex-shrink: 0;

  background: conic-gradient(

    #2563eb calc(var(--icp-progress) * 1%),

    color-mix(in srgb, #2563eb 10%, #e2e8f0) 0

  );

  display: grid;

  place-items: center;

  position: relative;

  box-shadow: 0 2px 8px color-mix(in srgb, #2563eb 15%, transparent);

}



.prepare-for-meeting-page--intro-call .pfm-precall-completion__ring::after {

  content: attr(data-label);

  width: 34px;

  height: 34px;

  border-radius: 50%;

  background: #fff;

  display: grid;

  place-items: center;

  font-size: 10px;

  font-weight: 900;

  color: #1e40af;

}



.prepare-for-meeting-page--intro-call .pfm-precall-completion__body {

  min-width: 0;

  flex: 1;

}



.prepare-for-meeting-page--intro-call .pfm-precall-ready {

  border-color: color-mix(in srgb, #2563eb 24%, #c9d2df);

  background: linear-gradient(90deg, color-mix(in srgb, #2563eb 10%, #fff), color-mix(in srgb, #0d9488 10%, #fff));

  padding: 10px 14px;

  border-radius: 12px;

  box-shadow: 0 2px 10px color-mix(in srgb, #2563eb 8%, transparent);

}



.prepare-for-meeting-page--intro-call .pfm-precall-ready__dot {

  background: #2563eb;

  box-shadow: 0 0 8px color-mix(in srgb, #2563eb 60%, transparent);

}



/* —— Playbook assistant —— */

.prepare-for-meeting-page--intro-call .pfm-playbook-assistant {

  background: linear-gradient(180deg, #eff6ff 0%, #f8fafc 40%, #fff 100%);

  border-bottom-color: color-mix(in srgb, #2563eb 14%, #c9d2df);

  padding: 16px 16px 14px;

}



.prepare-for-meeting-page--intro-call .pfm-playbook-assistant__kicker {

  color: #2563eb;

}



.prepare-for-meeting-page--intro-call .pfm-playbook-assistant__title {

  font-size: 15px;

}



.prepare-for-meeting-page--intro-call .pfm-playbook-assistant__btn--primary {

  background: linear-gradient(180deg, #3b82f6 0%, #2563eb 100%);

  border-color: color-mix(in srgb, #2563eb 35%, #1e3a8a);

  color: #fff;

  box-shadow: 0 2px 10px color-mix(in srgb, #2563eb 25%, transparent);

}



.pfm-playbook-assistant--intro-call .pfm-playbook-assistant__lead {

  margin: 6px 0 0;

  font-size: 12px;

  line-height: 1.5;

  color: #64748b;

  max-width: 54ch;

}



.pfm-playbook-assistant--intro-call .pfm-playbook-assistant__actions {

  margin-top: 14px;

}



.pfm-playbook-intro-grid {

  display: grid;

  grid-template-columns: repeat(2, minmax(0, 1fr));

  gap: 10px;

}



@media (min-width: 720px) {

  .pfm-playbook-intro-grid {

    grid-template-columns: repeat(3, minmax(0, 1fr));

    gap: 10px;

  }

}



.pfm-playbook-intro-card {

  display: flex;

  flex-direction: column;

  align-items: flex-start;

  gap: 5px;

  min-height: 76px;

  padding: 12px 14px;

  border-radius: 14px;

  border: 1px solid color-mix(in srgb, #2563eb 14%, #c9d2df);

  background: #fff;

  text-align: left;

  cursor: pointer;

  transition: border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease, transform 0.12s ease;

  position: relative;

  overflow: hidden;

}



.pfm-playbook-intro-card::before {

  content: "";

  position: absolute;

  top: 0;

  left: 0;

  right: 0;

  height: 2px;

  background: linear-gradient(90deg, #2563eb, #0d9488);

  opacity: 0;

  transition: opacity 0.15s ease;

}



.pfm-playbook-intro-card:hover:not(:disabled) {

  border-color: color-mix(in srgb, #2563eb 38%, #c9d2df);

  box-shadow: 0 6px 20px color-mix(in srgb, #2563eb 12%, transparent);

  transform: translateY(-1px);

}



.pfm-playbook-intro-card:hover:not(:disabled)::before {

  opacity: 1;

}



.pfm-playbook-intro-card.is-selected {

  border-color: #2563eb;

  background: linear-gradient(180deg, #eff6ff 0%, #fff 100%);

  box-shadow:

    0 0 0 2px color-mix(in srgb, #2563eb 20%, transparent),

    0 4px 16px color-mix(in srgb, #2563eb 12%, transparent);

}



.pfm-playbook-intro-card.is-selected::before {

  opacity: 1;

}



.pfm-playbook-intro-card:disabled {

  opacity: 0.55;

  cursor: not-allowed;

}



.pfm-playbook-intro-card__label {

  font-size: 13px;

  font-weight: 900;

  color: #0b1220;

  letter-spacing: -0.01em;

}



.pfm-playbook-intro-card__desc {

  font-size: 11px;

  line-height: 1.4;

  color: #64748b;

  display: -webkit-box;

  -webkit-line-clamp: 2;

  -webkit-box-orient: vertical;

  overflow: hidden;

}



/* —— Provider context —— */

.prepare-for-meeting-page--intro-call .pfm-precall-provider-context {

  border-radius: 14px;

  border-color: color-mix(in srgb, #2563eb 12%, #c9d2df);

  background: #fff;

  box-shadow: 0 2px 10px color-mix(in srgb, #0f172a 4%, transparent);

}



.prepare-for-meeting-page--intro-call .pfm-precall-provider-context__summary {

  font-weight: 800;

  color: #334155;

}



/* —— Footer —— */

.prepare-for-meeting-page--intro-call .prepare-for-meeting-footer--precall-sticky {

  border-top-color: color-mix(in srgb, #2563eb 14%, #c9d2df);

  background: color-mix(in srgb, #fff 92%, #eff6ff);

  backdrop-filter: blur(12px);

}



.prepare-for-meeting-page--intro-call .prepare-for-meeting-footer-btn--primary {

  background: linear-gradient(180deg, #3b82f6 0%, #2563eb 100%);

  border-color: color-mix(in srgb, #2563eb 40%, #1e3a8a);

  box-shadow: 0 2px 12px color-mix(in srgb, #2563eb 30%, transparent);

}



@media (max-width: 479px) {

  .icp-mission-strip {

    padding: 14px;

    gap: 12px;

  }



  .icp-mission-strip__pathway {

    flex-wrap: nowrap;

    gap: 0;

    padding: 3px;

    border-radius: 12px;

    width: 100%;

    justify-content: space-between;

  }



  .icp-mission-strip__pathway-step {

    min-width: 0;

    gap: 3px;

    font-size: 9px;

    letter-spacing: 0.01em;

    white-space: nowrap;

    padding: 4px 6px 4px 4px;

  }



  .icp-mission-strip__pathway-num {

    width: 15px;

    height: 15px;

    font-size: 9px;

  }



  .icp-mission-strip__pathway-sep {

    width: 10px;

    height: 10px;

  }



  .icp-mission-strip__pathway-sep svg {

    width: 10px;

    height: 10px;

  }



  .icp-mission-strip__card {

    flex-direction: column;

    gap: 10px;

  }



  .pfm-playbook-intro-grid {

    grid-template-columns: 1fr;

  }



  .pfm-playbook-intro-card {

    min-height: 68px;

    padding: 12px 14px;

  }



  .prepare-for-meeting-page--intro-call .pfm-precall-plan-panel__head {

    flex-direction: column;

    align-items: stretch;

  }



  .prepare-for-meeting-page--intro-call .pfm-precall-completion {

    width: 100%;

  }



  .prepare-for-meeting-page--intro-call .pfm-precall-plan-section__head {

    flex-direction: row;

  }

}

`;

