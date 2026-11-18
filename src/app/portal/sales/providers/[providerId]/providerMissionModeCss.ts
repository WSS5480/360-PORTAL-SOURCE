/** Mission Mode — field briefing tab on provider profile. */



export const providerMissionModeCss = `

.provider-profile-root--mission-mode .provider-profile-header--mission .provider-wmn,

.provider-profile-root--mission-mode .provider-profile-header--mission .provider-act-row,

.provider-profile-root--mission-mode .provider-planning-summary {

  display: none;

}



.provider-profile-root--mission-mode .provider-profile-sticky {
  position: static;
  top: auto;
  z-index: auto;
  border-bottom: 1px solid color-mix(in srgb, var(--foreground) 6%, transparent);
  box-shadow: none;
}



.provider-profile-root--mission-mode .provider-profile-body {

  padding: 0 0 calc(88px + env(safe-area-inset-bottom, 0px));

  background:

    radial-gradient(ellipse 100% 60% at 50% -10%, color-mix(in srgb, var(--brand-600) 7%, transparent), transparent 50%),

    linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);

}



.pmm {

  --pmm-ink: #0f172a;

  --pmm-muted: #64748b;

  --pmm-teal: #0d9488;

  --pmm-teal-soft: #ccfbf1;

  --pmm-card: #ffffff;

  --pmm-card-border: color-mix(in srgb, var(--foreground) 8%, var(--border, #e2e8f0));

  --pmm-shadow: 0 1px 2px rgba(15, 23, 42, 0.04), 0 10px 28px rgba(15, 23, 42, 0.07);

  --pmm-radius: 16px;

  max-width: 560px;

  margin: 0 auto;

  padding: 16px 16px 28px;

  color: var(--pmm-ink);

  display: flex;

  flex-direction: column;

  gap: 14px;

}



.pmm-hero {

  display: flex;

  flex-direction: column;

  gap: 10px;

}



.pmm-touch {

  padding: 14px 16px;

  border-radius: 14px;

  background: var(--pmm-card);

  border: 1px solid color-mix(in srgb, var(--pmm-teal) 22%, var(--pmm-card-border));

  box-shadow: var(--pmm-shadow);

}



.pmm-touch-kicker {

  margin: 0 0 4px;

  font-size: 10px;

  font-weight: 800;

  letter-spacing: 0.1em;

  text-transform: uppercase;

  color: var(--pmm-teal);

}



.pmm-touch-main {

  margin: 0;

  font-size: 16px;

  font-weight: 700;

  line-height: 1.35;

  letter-spacing: -0.02em;

}



.pmm-touch-main strong {

  font-weight: 800;

}



.pmm-touch-when {

  font-weight: 600;

  color: var(--pmm-muted);

}



.pmm-stage-pill {

  align-self: flex-start;

  display: inline-flex;

  padding: 6px 12px;

  border-radius: 999px;

  font-size: 11px;

  font-weight: 800;

  letter-spacing: 0.05em;

  text-transform: uppercase;

  color: var(--pmm-teal);

  background: var(--pmm-teal-soft);

  border: 1px solid color-mix(in srgb, var(--pmm-teal) 25%, transparent);

}



.pmm-sec {

  margin: 0;

  padding: 18px 18px 16px;

  border-radius: var(--pmm-radius);

  background: var(--pmm-card);

  border: 1px solid var(--pmm-card-border);

  box-shadow: var(--pmm-shadow);

}



.pmm-sec--objective {

  background: linear-gradient(165deg, #f0fdfa 0%, #ffffff 55%);

  border-color: color-mix(in srgb, var(--pmm-teal) 22%, var(--pmm-card-border));

  border-top: 3px solid var(--pmm-teal);

  padding-top: 20px;

}



.pmm-sec-title {

  margin: 0 0 10px;

  font-size: 11px;

  font-weight: 800;

  letter-spacing: 0.1em;

  text-transform: uppercase;

  color: var(--pmm-muted);

}



.pmm-sec--objective .pmm-sec-title {

  color: #0f766e;

}



.pmm-objective {

  margin: 0;

  font-size: clamp(1.375rem, 5vw, 1.75rem);

  font-weight: 800;

  letter-spacing: -0.03em;

  line-height: 1.18;

  color: var(--pmm-ink);

}



.pmm-list {

  margin: 0;

  padding: 0;

  list-style: none;

  display: flex;

  flex-direction: column;

  gap: 10px;

}



.pmm-q {

  display: flex;

  gap: 12px;

  align-items: flex-start;

  padding: 12px 14px;

  border-radius: 12px;

  background: color-mix(in srgb, var(--pmm-teal) 4%, #fff);

  border: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--pmm-card-border));

}



.pmm-q-n {

  flex-shrink: 0;

  width: 28px;

  height: 28px;

  border-radius: 8px;

  display: flex;

  align-items: center;

  justify-content: center;

  font-size: 13px;

  font-weight: 800;

  color: #0f766e;

  background: var(--pmm-teal-soft);

  border: 1px solid color-mix(in srgb, var(--pmm-teal) 20%, transparent);

}



.pmm-q-text {

  margin: 0;

  font-size: 15px;

  font-weight: 600;

  line-height: 1.42;

  color: var(--pmm-ink);

  letter-spacing: -0.01em;

}



.pmm-avoid li,

.pmm-learn li {

  position: relative;

  padding: 10px 12px 10px 32px;

  border-radius: 10px;

  font-size: 14px;

  font-weight: 600;

  line-height: 1.4;

  color: var(--pmm-ink);

  background: color-mix(in srgb, var(--foreground) 2%, #fff);

  border: 1px solid color-mix(in srgb, var(--foreground) 5%, var(--pmm-card-border));

}



.pmm-avoid li::before {

  content: "!";

  position: absolute;

  left: 12px;

  top: 11px;

  width: 16px;

  height: 16px;

  border-radius: 50%;

  display: flex;

  align-items: center;

  justify-content: center;

  font-size: 11px;

  font-weight: 900;

  color: #b45309;

  background: #fef3c7;

}



.pmm-learn li::before {

  content: "";

  position: absolute;

  left: 14px;

  top: 1.1em;

  width: 8px;

  height: 8px;

  border-radius: 50%;

  background: var(--pmm-teal);

}



.pmm-actions {

  display: grid;

  grid-template-columns: 1fr 1fr;

  gap: 10px;

  margin-top: 4px;

}



.pmm-action {

  display: flex;

  align-items: center;

  justify-content: center;

  min-height: 48px;

  padding: 12px 14px;

  border-radius: 12px;

  border: 1px solid var(--pmm-card-border);

  background: color-mix(in srgb, var(--foreground) 2%, #fff);

  color: var(--pmm-ink);

  font-size: 14px;

  font-weight: 800;

  letter-spacing: -0.02em;

  text-decoration: none;

  cursor: pointer;

  font-family: inherit;

  text-align: center;

  line-height: 1.2;

  transition: border-color 0.15s ease, box-shadow 0.15s ease, transform 0.12s ease;

}



.pmm-action:hover {

  border-color: color-mix(in srgb, var(--pmm-teal) 30%, var(--pmm-card-border));

  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.06);

}



.pmm-action--primary {

  grid-column: 1 / -1;

  min-height: 52px;

  font-size: 15px;

  color: #fff;

  background: linear-gradient(180deg, #14b8a6 0%, #0d9488 100%);

  border-color: #0d9488;

  box-shadow: 0 4px 14px rgba(13, 148, 136, 0.35);

}



.pmm-action--primary:hover {

  filter: brightness(1.03);

  transform: translateY(-1px);

}



.pmm-action--confirm {

  grid-column: 1 / -1;

  border-color: color-mix(in srgb, var(--pmm-teal) 35%, var(--pmm-card-border));

  color: var(--pmm-teal);

  background: var(--pmm-teal-soft);

}



.pmm-log-hint {

  margin: 0;

  padding: 12px 14px;

  text-align: center;

  font-size: 13px;

  border-radius: 12px;

  background: var(--pmm-card);

  border: 1px dashed color-mix(in srgb, var(--foreground) 14%, var(--pmm-card-border));

}



.pmm-log-hint a {

  color: var(--pmm-teal);

  font-weight: 700;

  text-decoration: none;

}



.pmm-log-hint a:hover {

  text-decoration: underline;

}



.pmm-setup {

  max-width: 480px;

  margin: 0 auto;

  padding: 24px 16px 32px;

  text-align: center;

}



.pmm-setup-title {

  margin: 0 0 8px;

  font-size: 1.25rem;

  font-weight: 800;

  letter-spacing: -0.02em;

  color: var(--pmm-ink);

}



.pmm-setup-body {

  margin: 0 0 18px;

  font-size: 14px;

  color: var(--pmm-muted);

  line-height: 1.45;

}



.pmm-setup-touches {

  margin: 0;

  padding: 0;

  list-style: none;

  display: flex;

  flex-direction: column;

  gap: 10px;

  text-align: left;

}



.pmm-setup-touch {

  display: block;

  width: 100%;

  padding: 14px 16px;

  border-radius: 14px;

  border: 1px solid var(--pmm-card-border);

  background: var(--pmm-card);

  color: var(--pmm-ink);

  text-align: left;

  cursor: pointer;

  font: inherit;

  box-shadow: var(--pmm-shadow);

  transition: border-color 0.15s ease, transform 0.12s ease;

}



.pmm-setup-touch:hover {

  border-color: color-mix(in srgb, var(--pmm-teal) 28%, var(--pmm-card-border));

  transform: translateY(-1px);

}



.pmm-setup-touch-label {

  display: block;

  font-size: 15px;

  font-weight: 800;

  margin-bottom: 4px;

  letter-spacing: -0.01em;

}



.pmm-setup-touch-desc {

  display: block;

  font-size: 13px;

  color: var(--pmm-muted);

  line-height: 1.4;

}



@media (min-width: 721px) {
  .pmm {
    max-width: 640px;
    padding: 24px 24px 36px;
    gap: 16px;
  }

  .pmm-sec {
    padding: 22px 22px 20px;
  }

  .pmm-actions {
    grid-template-columns: repeat(auto-fit, minmax(9.5rem, 1fr));
  }

  .pmm-action--primary,
  .pmm-action--confirm {
    grid-column: 1 / -1;
  }
}

`;


