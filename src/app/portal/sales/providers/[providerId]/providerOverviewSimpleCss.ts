/** Provider overview — premium field operations briefing (interaction + depth) */
export const providerOverviewSimpleCss = `
/* ── Motion tokens ── */
.pov-simple,
.pov-tactical-header {
  --pov-ease: cubic-bezier(0.22, 1, 0.36, 1);
  --pov-ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --pov-dur-fast: 0.14s;
  --pov-dur-med: 0.22s;
  --pov-elev-0: 0 1px 0 rgba(15, 23, 42, 0.03);
  --pov-elev-1: 0 1px 0 rgba(15, 23, 42, 0.04), 0 4px 12px rgba(15, 23, 42, 0.04);
  --pov-elev-2: 0 1px 0 rgba(15, 23, 42, 0.03), 0 8px 24px rgba(15, 23, 42, 0.07);
  --pov-elev-3: 0 2px 0 rgba(15, 23, 42, 0.02), 0 12px 32px rgba(15, 23, 42, 0.09);
  --pov-elev-accent: 0 4px 20px rgba(37, 99, 235, 0.08);
}

@media (prefers-reduced-motion: reduce) {
  .pov-simple *,
  .pov-tactical-header,
  .pov-tactical-header *,
  .pov-mc--anchor * {
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
  }

  .pov-mc-command-pulse {
    animation: none;
  }
}

/* Tactical header (sticky chrome) */
.pov-tactical-header {
  margin: 0 12px 8px;
  padding: 8px 12px 9px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--foreground) 9%, var(--border));
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--brand-600) 5%, #fff) 0%,
    #fff 55%
  );
  box-shadow: var(--pov-elev-0);
  transition:
    border-color var(--pov-dur-fast) var(--pov-ease),
    box-shadow var(--pov-dur-med) var(--pov-ease),
    transform var(--pov-dur-med) var(--pov-ease);
}

.pov-tactical-header:hover {
  border-color: color-mix(in srgb, var(--brand-600) 20%, var(--border));
  box-shadow: var(--pov-elev-1);
  transform: translateY(-1px);
}

.pov-tactical-header-top {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
  margin-bottom: 4px;
}

.pov-ops-pill {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  transition: transform var(--pov-dur-fast) var(--pov-ease), box-shadow var(--pov-dur-fast) var(--pov-ease);
}

.pov-tactical-header:hover .pov-ops-pill {
  transform: translateY(-0.5px);
}

.pov-ops-pill--early {
  background: color-mix(in srgb, #64748b 12%, #fff);
  color: #475569;
}

.pov-ops-pill--developing {
  background: color-mix(in srgb, var(--brand-600) 12%, #fff);
  color: var(--brand-800, #1e40af);
}

.pov-ops-pill--forming,
.pov-ops-pill--building {
  background: color-mix(in srgb, #0d9488 12%, #fff);
  color: #0f766e;
}

.pov-ops-pill--ready {
  background: color-mix(in srgb, #15803d 12%, #fff);
  color: #166534;
}

.pov-tactical-header-move {
  font-size: 12px;
  color: color-mix(in srgb, var(--foreground) 62%, transparent);
  transition: color var(--pov-dur-fast) ease;
}

.pov-tactical-header:hover .pov-tactical-header-move {
  color: color-mix(in srgb, var(--foreground) 78%, transparent);
}

.pov-tactical-header-move strong {
  color: var(--foreground);
  font-weight: 700;
}

.pov-tactical-header-context {
  margin: 0;
  font-size: 12px;
  line-height: 1.35;
  color: color-mix(in srgb, var(--foreground) 58%, transparent);
}

/* Layered command center (mission overview) */
.pov-command,
.pov-simple {
  --pov-inner-max: 920px;
  --pov-gap: 12px;
  --pov-radius: 8px;
  --pov-border: color-mix(in srgb, var(--foreground) 8%, var(--border));
  --pov-text-tertiary: color-mix(in srgb, var(--foreground) 44%, transparent);
  display: flex;
  flex-direction: column;
  gap: var(--pov-gap);
  min-width: 0;
  width: 100%;
  max-width: var(--pov-inner-max);
  margin: 0 auto;
  padding: 0 0 16px;
}

/* ── Surface tiers ── */
.pov-surface--primary {
  position: relative;
  isolation: isolate;
  background: #fff;
  border: 1px solid var(--pov-border);
  border-radius: var(--pov-radius);
  box-shadow: var(--pov-elev-2);
  transition:
    box-shadow var(--pov-dur-med) var(--pov-ease),
    border-color var(--pov-dur-fast) var(--pov-ease),
    transform var(--pov-dur-med) var(--pov-ease);
}

.pov-surface--primary::before {
  content: "";
  position: absolute;
  left: 0;
  top: 8px;
  bottom: 8px;
  width: 3px;
  border-radius: 0 3px 3px 0;
  background: linear-gradient(180deg, var(--brand-600, #2563eb), #0d9488);
  opacity: 0.92;
  transition: opacity var(--pov-dur-med) var(--pov-ease), width var(--pov-dur-med) var(--pov-ease);
}

.pov-surface--primary:hover,
.pov-surface--primary:focus-within {
  border-color: color-mix(in srgb, var(--brand-600) 22%, var(--border));
  box-shadow: var(--pov-elev-3);
  transform: translateY(-2px);
}

.pov-surface--primary:hover::before,
.pov-surface--primary:focus-within::before {
  opacity: 1;
  width: 4px;
}

.pov-surface--support {
  background: color-mix(in srgb, var(--foreground) 1.5%, #fff);
  border: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
  border-radius: var(--pov-radius);
  box-shadow: var(--pov-elev-0);
  transition:
    border-color var(--pov-dur-fast) var(--pov-ease),
    background var(--pov-dur-fast) var(--pov-ease),
    box-shadow var(--pov-dur-med) var(--pov-ease),
    transform var(--pov-dur-med) var(--pov-ease);
}

.pov-surface--support:hover {
  background: #fff;
  border-color: color-mix(in srgb, var(--foreground) 11%, var(--border));
  box-shadow: var(--pov-elev-1);
  transform: translateY(-1px);
}

.pov-surface--accent {
  position: relative;
  background: linear-gradient(
    165deg,
    color-mix(in srgb, var(--brand-600) 4%, #fff) 0%,
    #fff 42%
  );
  border: 1px solid color-mix(in srgb, var(--brand-600) 16%, var(--border));
  border-radius: var(--pov-radius);
  box-shadow: var(--pov-elev-1);
  transition:
    box-shadow var(--pov-dur-med) var(--pov-ease),
    border-color var(--pov-dur-fast) var(--pov-ease),
    transform var(--pov-dur-med) var(--pov-ease);
}

.pov-surface--accent::after {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  opacity: 0;
  background: radial-gradient(
    120% 80% at 0% 0%,
    color-mix(in srgb, var(--brand-600) 8%, transparent),
    transparent 55%
  );
  transition: opacity var(--pov-dur-med) var(--pov-ease);
}

.pov-surface--accent:hover,
.pov-surface--accent:focus-within {
  border-color: color-mix(in srgb, var(--brand-600) 28%, var(--border));
  box-shadow: var(--pov-elev-accent);
  transform: translateY(-1px);
}

.pov-surface--accent:hover::after,
.pov-surface--accent:focus-within::after {
  opacity: 1;
}

/* Operational field indicators */
.pov-ops-signals {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px 10px 9px;
  border-radius: var(--pov-radius);
  border: 1px solid color-mix(in srgb, var(--foreground) 7%, var(--border));
  background: color-mix(in srgb, var(--foreground) 1.5%, #fff);
  box-shadow: var(--pov-elev-0);
  transition:
    border-color var(--pov-dur-fast) var(--pov-ease),
    box-shadow var(--pov-dur-med) var(--pov-ease);
}

.pov-ops-signals:hover {
  border-color: color-mix(in srgb, var(--foreground) 11%, var(--border));
  box-shadow: var(--pov-elev-1);
}

.pov-ops-signal-group + .pov-ops-signal-group {
  padding-top: 7px;
  border-top: 1px solid color-mix(in srgb, var(--foreground) 6%, transparent);
}

.pov-ops-signal-group-kicker {
  margin: 0 0 5px;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--pov-text-tertiary);
}

.pov-ops-signal-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.pov-ops-signal {
  margin: 0;
  border-radius: 6px;
  border: 1px solid transparent;
  transition:
    border-color var(--pov-dur-fast) var(--pov-ease),
    background var(--pov-dur-fast) var(--pov-ease),
    transform var(--pov-dur-fast) var(--pov-ease);
}

.pov-ops-signal-btn,
.pov-ops-signal-static {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  width: 100%;
  padding: 6px 8px;
  margin: 0;
  border: none;
  border-radius: 6px;
  background: transparent;
  text-align: left;
  font: inherit;
  color: inherit;
}

.pov-ops-signal-btn {
  cursor: pointer;
}

.pov-ops-signal-btn:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--brand-600) 45%, transparent);
  outline-offset: 1px;
}

.pov-ops-signal--actionable:hover {
  transform: translateX(2px);
}

.pov-ops-signal--actionable.pov-ops-signal--attention:hover {
  background: color-mix(in srgb, #d97706 7%, #fff);
  border-color: color-mix(in srgb, #d97706 18%, transparent);
}

.pov-ops-signal--actionable.pov-ops-signal--open:hover {
  background: color-mix(in srgb, var(--foreground) 4%, #fff);
  border-color: color-mix(in srgb, var(--foreground) 10%, transparent);
}

.pov-ops-signal--actionable.pov-ops-signal--confirmed:hover {
  background: color-mix(in srgb, #15803d 5%, #fff);
  border-color: color-mix(in srgb, #15803d 14%, transparent);
}

.pov-ops-signal--actionable:hover .pov-ops-signal-cue {
  opacity: 1;
  transform: translateX(2px);
}

.pov-ops-signal-icon {
  flex-shrink: 0;
  width: 16px;
  height: 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 900;
  line-height: 1;
  margin-top: 1px;
}

.pov-ops-signal-icon--confirmed {
  background: color-mix(in srgb, #15803d 14%, #fff);
  color: #166534;
}

.pov-ops-signal-icon--attention {
  background: color-mix(in srgb, #d97706 14%, #fff);
  color: #b45309;
}

.pov-ops-signal-icon--open {
  background: color-mix(in srgb, var(--foreground) 6%, #fff);
  color: color-mix(in srgb, var(--foreground) 55%, transparent);
}

.pov-ops-signal-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  flex: 1;
}

.pov-ops-signal-label {
  font-size: 12px;
  font-weight: 650;
  line-height: 1.25;
  color: var(--foreground);
}

.pov-ops-signal--attention .pov-ops-signal-label {
  color: #92400e;
}

.pov-ops-signal--open .pov-ops-signal-label {
  color: color-mix(in srgb, var(--foreground) 78%, transparent);
}

.pov-ops-signal-meta {
  font-size: 10px;
  font-weight: 500;
  line-height: 1.3;
  color: color-mix(in srgb, var(--foreground) 50%, transparent);
}

.pov-ops-signal--attention .pov-ops-signal-meta {
  color: color-mix(in srgb, #92400e 72%, transparent);
}

.pov-ops-signal-cue {
  flex-shrink: 0;
  font-size: 12px;
  font-weight: 700;
  color: var(--brand-600, #2563eb);
  opacity: 0.55;
  transition:
    opacity var(--pov-dur-fast) var(--pov-ease),
    transform var(--pov-dur-fast) var(--pov-ease);
  margin-top: 2px;
}

.pov-ops-signal--confirmed .pov-ops-signal-static {
  opacity: 0.92;
}

/* Operational memory pulse */
.pov-ops-memory {
  padding: 0;
}

.pov-ops-memory-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px 10px;
}

.pov-ops-memory-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  padding: 7px 9px;
  border-radius: 6px;
  border: 1px solid color-mix(in srgb, var(--foreground) 6%, transparent);
  background: color-mix(in srgb, var(--foreground) 1.5%, #fff);
  transition:
    border-color var(--pov-dur-fast) var(--pov-ease),
    background var(--pov-dur-fast) var(--pov-ease);
}

.pov-ops-memory-item:hover {
  background: #fff;
  border-color: color-mix(in srgb, var(--foreground) 10%, transparent);
}

.pov-ops-memory-item--update {
  border-left: 2px solid color-mix(in srgb, var(--brand-600) 50%, transparent);
}

.pov-ops-memory-item--learning {
  border-left: 2px solid color-mix(in srgb, #0d9488 45%, transparent);
}

.pov-ops-memory-item--validated {
  border-left: 2px solid color-mix(in srgb, #15803d 45%, transparent);
}

.pov-ops-memory-item--freshness {
  border-left: 2px solid color-mix(in srgb, #d97706 40%, transparent);
}

.pov-ops-memory-kicker {
  font-size: 8px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--foreground) 42%, transparent);
}

.pov-ops-memory-line {
  font-size: 11px;
  font-weight: 600;
  line-height: 1.32;
  color: color-mix(in srgb, var(--foreground) 82%, transparent);
}

.pov-ops-memory-item--freshness .pov-ops-memory-line {
  color: color-mix(in srgb, #92400e 90%, var(--foreground));
}

/* Mission control — page anchor */
.pov-simple > .pov-mc--anchor {
  margin-bottom: 2px;
}

.pov-mc--anchor {
  position: relative;
  isolation: isolate;
  margin: 0;
  padding: 14px 16px 13px 18px;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--brand-600) 22%, var(--border));
  background: linear-gradient(
    145deg,
    color-mix(in srgb, var(--brand-600) 9%, #fff) 0%,
    #fff 38%,
    color-mix(in srgb, var(--foreground) 1.5%, #fff) 100%
  );
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.9) inset,
    0 2px 0 rgba(15, 23, 42, 0.03),
    0 10px 28px rgba(15, 23, 42, 0.09),
    0 0 0 1px color-mix(in srgb, var(--brand-600) 6%, transparent);
  transition:
    box-shadow var(--pov-dur-med) var(--pov-ease),
    border-color var(--pov-dur-fast) var(--pov-ease);
}

.pov-mc--anchor::before {
  content: "";
  position: absolute;
  left: 0;
  top: 10px;
  bottom: 10px;
  width: 4px;
  border-radius: 0 4px 4px 0;
  background: linear-gradient(
    180deg,
    var(--brand-600, #2563eb) 0%,
    #0d9488 55%,
    color-mix(in srgb, var(--brand-600) 70%, #0d9488) 100%
  );
  box-shadow: 0 0 12px color-mix(in srgb, var(--brand-600) 35%, transparent);
}

.pov-mc--anchor:hover {
  border-color: color-mix(in srgb, var(--brand-600) 32%, var(--border));
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.95) inset,
    0 14px 36px rgba(37, 99, 235, 0.1),
    0 0 0 1px color-mix(in srgb, var(--brand-600) 10%, transparent);
}

.pov-mc-top {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 6px 12px;
  margin-bottom: 12px;
  padding-bottom: 0;
}

.pov-mc-top-label {
  margin: 0;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--foreground) 42%, transparent);
}

.pov-mc-status {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 6px;
  margin: 0;
  font-size: 10px;
  line-height: 1.2;
  color: color-mix(in srgb, var(--foreground) 52%, transparent);
}

.pov-mc-status-item {
  display: inline-flex;
  align-items: baseline;
  gap: 4px;
}

.pov-mc-status-key {
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-size: 8px;
  color: color-mix(in srgb, var(--foreground) 40%, transparent);
}

.pov-mc-status-val {
  font-weight: 650;
  color: color-mix(in srgb, var(--foreground) 72%, transparent);
}

.pov-mc-status-sep {
  opacity: 0.45;
  user-select: none;
}

.pov-mc-command {
  position: relative;
  padding: 14px 14px 13px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--brand-600) 18%, transparent);
  background: #fff;
  box-shadow:
    0 1px 2px rgba(15, 23, 42, 0.04),
    inset 0 1px 0 rgba(255, 255, 255, 1);
}

.pov-mc-command-kicker {
  display: flex;
  align-items: center;
  gap: 7px;
  margin: 0 0 8px;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--brand-700, #1d4ed8);
}

.pov-mc-command-pulse {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--brand-600, #2563eb);
  box-shadow: 0 0 0 0 color-mix(in srgb, var(--brand-600) 45%, transparent);
  animation: pov-mc-pulse 2.2s var(--pov-ease-out) infinite;
}

@keyframes pov-mc-pulse {
  0%,
  100% {
    box-shadow: 0 0 0 0 color-mix(in srgb, var(--brand-600) 40%, transparent);
    opacity: 1;
  }
  50% {
    box-shadow: 0 0 0 5px transparent;
    opacity: 0.75;
  }
}

.pov-mc-command-narrative {
  margin: 0 0 12px;
  font-size: 17px;
  font-weight: 650;
  line-height: 1.3;
  letter-spacing: -0.025em;
  color: var(--foreground);
  max-width: 48ch;
}

.pov-mc-command-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.pov-mc-cta-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 40px;
  padding: 0 16px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 750;
  font-family: inherit;
  text-decoration: none;
  color: #fff;
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--brand-600) 92%, #1e40af) 0%,
    var(--brand-700, #1d4ed8) 100%
  );
  border: 1px solid var(--brand-800, #1e3a8a);
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.15) inset,
    0 4px 14px rgba(37, 99, 235, 0.28);
  cursor: pointer;
  transition:
    transform var(--pov-dur-fast) var(--pov-ease),
    box-shadow var(--pov-dur-fast) var(--pov-ease),
    filter var(--pov-dur-fast) ease;
}

.pov-mc-cta-primary:hover {
  transform: translateY(-1px);
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.2) inset,
    0 6px 18px rgba(37, 99, 235, 0.34);
  filter: brightness(1.03);
}

.pov-mc-cta-primary:active {
  transform: translateY(0) scale(0.99);
}

.pov-mc-cta-primary:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--brand-600) 55%, transparent);
  outline-offset: 2px;
}

.pov-mc-cta-secondary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 40px;
  padding: 0 12px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 650;
  font-family: inherit;
  color: var(--foreground);
  background: #fff;
  border: 1px solid color-mix(in srgb, var(--foreground) 14%, var(--border));
  cursor: pointer;
  transition:
    background var(--pov-dur-fast) var(--pov-ease),
    border-color var(--pov-dur-fast) var(--pov-ease),
    transform var(--pov-dur-fast) var(--pov-ease);
}

.pov-mc-cta-secondary:hover {
  background: color-mix(in srgb, var(--foreground) 3%, #fff);
  border-color: color-mix(in srgb, var(--foreground) 22%, var(--border));
  transform: translateY(-1px);
}

.pov-mc-cta-secondary:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--brand-600) 40%, transparent);
  outline-offset: 2px;
}

.pov-mc-context {
  margin: 10px 0 0;
  padding-top: 9px;
  border-top: 1px solid color-mix(in srgb, var(--foreground) 6%, transparent);
  font-size: 11px;
  font-weight: 500;
  line-height: 1.35;
  color: color-mix(in srgb, var(--foreground) 55%, transparent);
  max-width: 58ch;
}

.pov-mc-footnote {
  margin: 6px 0 0;
  font-size: 10px;
  font-weight: 500;
  line-height: 1.35;
  color: color-mix(in srgb, var(--foreground) 44%, transparent);
  max-width: 58ch;
}

/* Cards */
.pov-simple-section-title {
  margin: 0 0 7px;
  font-size: 10px;
  font-weight: 750;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--foreground) 62%, transparent);
  transition: color var(--pov-dur-fast) ease;
}

.pov-surface--support:hover .pov-simple-section-title,
.pov-surface--accent:hover .pov-simple-section-title {
  color: color-mix(in srgb, var(--foreground) 78%, transparent);
}

.pov-simple-card {
  margin: 0;
  padding: 11px 13px 12px;
}

/* Operational snapshot — synthesized briefing */
.pov-snapshot {
  padding: 12px 13px 11px;
}

.pov-snapshot-head {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 6px 12px;
  margin-bottom: 10px;
  padding-bottom: 8px;
  border-bottom: 1px solid color-mix(in srgb, var(--foreground) 7%, transparent);
}

.pov-snapshot-head-main {
  min-width: 0;
}

.pov-snapshot-subtitle {
  margin: 2px 0 0;
  font-size: 10px;
  font-weight: 500;
  color: var(--pov-text-tertiary);
}

.pov-snapshot-briefing-freshness {
  flex-shrink: 0;
  font-size: 10px;
  font-weight: 600;
  color: color-mix(in srgb, var(--brand-600) 80%, var(--foreground));
  padding: 3px 7px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--brand-600) 6%, #fff);
  border: 1px solid color-mix(in srgb, var(--brand-600) 14%, transparent);
}

.pov-snapshot-groups {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px 12px;
}

.pov-snapshot-group {
  padding: 8px 9px 7px;
  border-radius: 7px;
  border: 1px solid color-mix(in srgb, var(--foreground) 6%, transparent);
  background: color-mix(in srgb, var(--foreground) 1.5%, #fff);
  transition:
    border-color var(--pov-dur-fast) var(--pov-ease),
    background var(--pov-dur-fast) var(--pov-ease);
}

.pov-snapshot-group:hover {
  border-color: color-mix(in srgb, var(--foreground) 10%, transparent);
  background: #fff;
}

.pov-snapshot-group--facility {
  border-left: 2px solid color-mix(in srgb, #0d9488 45%, transparent);
}

.pov-snapshot-group--workflow {
  border-left: 2px solid color-mix(in srgb, var(--brand-600) 40%, transparent);
}

.pov-snapshot-group--observation {
  border-left: 2px solid color-mix(in srgb, #7c3aed 35%, transparent);
}

.pov-snapshot-group--readiness {
  border-left: 2px solid color-mix(in srgb, #d97706 40%, transparent);
}

.pov-snapshot-group-label {
  margin: 0 0 6px;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--foreground) 58%, transparent);
}

.pov-snapshot-insight-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.pov-snapshot-insight + .pov-snapshot-insight {
  padding-top: 7px;
  border-top: 1px solid color-mix(in srgb, var(--foreground) 5%, transparent);
}

.pov-snapshot-synthesis {
  margin: 0;
  font-size: 12px;
  font-weight: 650;
  line-height: 1.35;
  letter-spacing: -0.01em;
  color: var(--foreground);
}

.pov-snapshot-insight-meta {
  margin: 3px 0 0;
  font-size: 10px;
  font-weight: 500;
  line-height: 1.35;
  color: color-mix(in srgb, var(--foreground) 48%, transparent);
}

.pov-snapshot-foot {
  margin-top: 10px;
  padding-top: 9px;
  border-top: 1px solid color-mix(in srgb, var(--foreground) 7%, transparent);
}

.pov-simple-snapshot-next-label {
  display: block;
  margin: 0 0 3px;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--pov-text-tertiary);
}

.pov-snapshot-next-value {
  margin: 0;
  font-size: 12px;
  font-weight: 650;
  line-height: 1.35;
  color: var(--foreground);
}

.pov-simple-next-line {
  margin: 0 0 9px;
  font-size: 13px;
  font-weight: 500;
  line-height: 1.4;
  color: color-mix(in srgb, var(--foreground) 76%, transparent);
  max-width: 54ch;
  transition: color var(--pov-dur-fast) ease;
}

.pov-surface--accent:hover .pov-simple-next-line {
  color: color-mix(in srgb, var(--foreground) 90%, transparent);
}

.pov-simple-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

/* CTAs */
.pov-simple-cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 32px;
  padding: 0 11px;
  border-radius: 7px;
  font-size: 12px;
  font-weight: 650;
  font-family: inherit;
  text-decoration: none;
  border: 1px solid transparent;
  cursor: pointer;
  white-space: nowrap;
  transition:
    background var(--pov-dur-fast) var(--pov-ease),
    border-color var(--pov-dur-fast) var(--pov-ease),
    color var(--pov-dur-fast) var(--pov-ease),
    box-shadow var(--pov-dur-fast) var(--pov-ease),
    transform var(--pov-dur-fast) var(--pov-ease);
}

.pov-simple-cta:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--brand-600) 55%, transparent);
  outline-offset: 2px;
}

.pov-simple-cta:hover {
  transform: translateY(-1px);
}

.pov-simple-cta:active {
  transform: translateY(0) scale(0.98);
}

.pov-simple-cta--hero,
.pov-simple-cta--primary {
  background: var(--foreground, #0f172a);
  color: #fff;
  border-color: var(--foreground, #0f172a);
  font-weight: 700;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.12);
}

.pov-simple-cta--hero:hover,
.pov-simple-cta--primary:hover {
  background: color-mix(in srgb, var(--foreground) 88%, #334155);
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.18);
}

.pov-simple-cta--secondary {
  background: #fff;
  color: var(--foreground);
  border-color: color-mix(in srgb, var(--foreground) 14%, var(--border));
}

.pov-simple-cta--secondary:hover {
  background: color-mix(in srgb, var(--foreground) 3%, #fff);
  border-color: color-mix(in srgb, var(--foreground) 22%, var(--border));
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.06);
}

.pov-simple-cta--tertiary {
  background: transparent;
  color: color-mix(in srgb, var(--foreground) 58%, transparent);
  border-color: transparent;
  font-weight: 600;
  min-height: 30px;
  padding: 0 8px;
}

.pov-simple-cta--tertiary:hover {
  color: var(--foreground);
  background: color-mix(in srgb, var(--foreground) 5%, transparent);
  border-color: color-mix(in srgb, var(--foreground) 8%, transparent);
}

/* Intelligence wrap */
.pov-intel-wrap {
  padding: 2px 0;
}

.provider-profile-root--command-center .pov-intel-wrap .pov-intel-split .pov-intel-panel {
  border-radius: var(--pov-radius);
  box-shadow: var(--pov-elev-0);
  transition:
    box-shadow var(--pov-dur-med) var(--pov-ease),
    border-color var(--pov-dur-fast) var(--pov-ease),
    transform var(--pov-dur-med) var(--pov-ease),
    background var(--pov-dur-fast) var(--pov-ease);
}

.provider-profile-root--command-center .pov-intel-wrap .pov-intel-panel:hover {
  box-shadow: var(--pov-elev-2);
  transform: translateY(-2px);
}

.provider-profile-root--command-center .pov-intel-wrap .provider-intel-scope-panel--facility:hover {
  border-color: color-mix(in srgb, #0d9488 28%, var(--border));
}

.provider-profile-root--command-center .pov-intel-wrap .provider-intel-scope-panel--provider:hover {
  border-color: color-mix(in srgb, var(--brand-600) 28%, var(--border));
}

.provider-profile-root--command-center .pov-intel-wrap .provider-intel-scope-panel-head {
  transition: border-color var(--pov-dur-fast) ease;
}

.provider-profile-root--command-center .pov-intel-wrap .provider-intel-scope-panel:hover .provider-intel-scope-panel-head {
  border-bottom-color: color-mix(in srgb, var(--foreground) 12%, transparent);
}

.provider-profile-root--command-center .pov-intel-wrap .provider-intel-scope-bullet-btn {
  transition:
    background var(--pov-dur-fast) var(--pov-ease),
    transform var(--pov-dur-fast) var(--pov-ease),
    box-shadow var(--pov-dur-fast) var(--pov-ease);
}

.provider-profile-root--command-center .pov-intel-wrap .provider-intel-scope-bullet-btn:hover {
  background: color-mix(in srgb, var(--brand-600) 7%, #fff);
  transform: translateX(2px);
  box-shadow: -2px 0 0 color-mix(in srgb, var(--brand-600) 35%, transparent);
}

.provider-profile-root--command-center .pov-intel-wrap .provider-intel-scope-bullet-btn:active {
  transform: translateX(1px) scale(0.99);
}

.provider-profile-root--command-center .pov-intel-wrap .provider-intel-scope-bullet-btn:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--brand-600) 40%, transparent);
  outline-offset: 1px;
}

.provider-intel-scope-bullet-body {
  display: flex;
  align-items: flex-start;
  gap: 7px;
  width: 100%;
  min-width: 0;
}

.provider-intel-scope-bullet-main {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  flex: 1;
}

.provider-intel-scope-bullet-meta {
  font-size: 10px;
  font-weight: 500;
  line-height: 1.25;
  color: color-mix(in srgb, var(--foreground) 48%, transparent);
  transition: color var(--pov-dur-fast) ease;
}

.provider-profile-root--command-center
  .pov-intel-wrap
  .provider-intel-scope-bullet-btn:hover
  .provider-intel-scope-bullet-meta {
  color: color-mix(in srgb, var(--foreground) 62%, transparent);
}

.provider-profile-root--command-center .pov-simple-intel-scope.provider-intel-scope-split {
  gap: 10px;
}

.provider-profile-root--command-center .pov-simple-intel-scope .provider-intel-scope-panel {
  padding: 9px 11px 10px;
}

.provider-profile-root--command-center .pov-simple-intel-scope .provider-intel-scope-inherit-line {
  font-size: 9px;
  font-weight: 500;
  color: var(--pov-text-tertiary);
}

.provider-profile-root--command-center .provider-intel-scope-bullet-text {
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Activity feed */
.pov-activity-wrap {
  min-height: 0;
}

.provider-profile-root--command-center .pov-activity-wrap .provider-ops-feed-panel {
  margin-top: 0;
  padding: 11px 13px 12px;
  border-radius: var(--pov-radius);
  border: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
  background: color-mix(in srgb, var(--foreground) 1.5%, #fff);
  box-shadow: var(--pov-elev-0);
  transition:
    border-color var(--pov-dur-fast) var(--pov-ease),
    box-shadow var(--pov-dur-med) var(--pov-ease),
    transform var(--pov-dur-med) var(--pov-ease),
    background var(--pov-dur-fast) var(--pov-ease);
}

.provider-profile-root--command-center .pov-activity-wrap .provider-ops-feed-panel:hover {
  background: #fff;
  border-color: color-mix(in srgb, var(--foreground) 10%, var(--border));
  box-shadow: var(--pov-elev-1);
  transform: translateY(-1px);
}

.provider-profile-root--command-center .pov-activity-wrap .provider-cc-section-head {
  margin-bottom: 6px;
}

.provider-profile-root--command-center .pov-activity-wrap .provider-cc-section-link {
  font-size: 11px;
  font-weight: 650;
  text-decoration: none;
  color: color-mix(in srgb, var(--brand-600) 85%, var(--foreground));
  padding: 2px 6px;
  margin: -2px -6px;
  border-radius: 4px;
  transition:
    background var(--pov-dur-fast) var(--pov-ease),
    color var(--pov-dur-fast) ease;
}

.provider-profile-root--command-center .pov-activity-wrap .provider-cc-section-link:hover {
  background: color-mix(in srgb, var(--brand-600) 8%, transparent);
  color: var(--brand-700, #1d4ed8);
}

.provider-profile-root--command-center .pov-activity-wrap .provider-act-prev-item {
  border-radius: 6px;
  border: 1px solid transparent;
  transition:
    background var(--pov-dur-fast) var(--pov-ease),
    border-color var(--pov-dur-fast) var(--pov-ease),
    transform var(--pov-dur-fast) var(--pov-ease);
}

.provider-profile-root--command-center .pov-activity-wrap .provider-act-prev-link {
  display: block;
  padding: 6px 8px;
  margin: -6px -8px;
  border-radius: 6px;
  text-decoration: none;
  color: inherit;
  transition: background var(--pov-dur-fast) var(--pov-ease);
}

.provider-profile-root--command-center .pov-activity-wrap .provider-act-prev-item:hover {
  background: color-mix(in srgb, var(--foreground) 3%, #fff);
  border-color: color-mix(in srgb, var(--foreground) 6%, transparent);
  transform: translateX(2px);
}

.provider-profile-root--command-center .pov-activity-wrap a.provider-act-prev-link:hover {
  background: color-mix(in srgb, var(--brand-600) 5%, #fff);
}

.provider-profile-root--command-center .pov-activity-wrap .provider-act-prev-link:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--brand-600) 40%, transparent);
  outline-offset: 1px;
}

.provider-profile-root--command-center .pov-activity-wrap .provider-act-prev-empty-link {
  transition:
    background var(--pov-dur-fast) var(--pov-ease),
    color var(--pov-dur-fast) ease,
    transform var(--pov-dur-fast) var(--pov-ease);
}

.provider-profile-root--command-center .pov-activity-wrap .provider-act-prev-empty-link:hover {
  transform: translateY(-1px);
}

@media (min-width: 900px) {
  .provider-profile-root--command-center .provider-profile-sticky .pov-tactical-header {
    margin-left: auto;
    margin-right: auto;
    max-width: 1280px;
    padding-left: 20px;
    padding-right: 20px;
    box-sizing: border-box;
  }
}

@media (max-width: 559px) {
  .pov-snapshot-groups {
    grid-template-columns: 1fr;
  }

  .pov-ops-memory-list {
    grid-template-columns: 1fr;
  }

  .provider-profile-root--command-center .provider-intel-scope-bullet-text {
    white-space: normal;
  }

  .pov-surface--support:hover,
  .pov-surface--accent:hover {
    transform: none;
  }

  .pov-mc-command-narrative {
    font-size: 15px;
  }

  .pov-mc-command-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .pov-mc-cta-primary,
  .pov-mc-cta-secondary {
    width: 100%;
  }
}

@media (max-width: 768px) {
  .pov-command,
  .pov-simple {
    max-width: none;
  }

  .pov-tactical-header {
    margin: 0 8px 6px;
  }

  .provider-profile-root--command-center .pov-simple-intel-scope.provider-intel-scope-split,
  .provider-profile-root--command-center .pov-deep-intel-scope.provider-intel-scope-split {
    grid-template-columns: 1fr;
  }
}

/* ── Layer 1: Field command (primary hero) ── */
.pov-command {
  display: flex;
  flex-direction: column;
  gap: var(--pov-gap);
  min-width: 0;
  width: 100%;
  max-width: var(--pov-inner-max);
  margin: 0 auto;
  padding: 0 0 16px;
}

.pov-fc--hero {
  position: relative;
  isolation: isolate;
  padding: 14px 16px 16px;
  border-radius: var(--pov-radius);
  border: 1px solid color-mix(in srgb, var(--brand-600) 18%, var(--border));
  background: linear-gradient(
    165deg,
    color-mix(in srgb, var(--brand-600) 5%, #fff) 0%,
    #fff 48%
  );
  box-shadow: var(--pov-elev-3);
}

.pov-fc--hero::before {
  content: "";
  position: absolute;
  left: 0;
  top: 10px;
  bottom: 10px;
  width: 4px;
  border-radius: 0 4px 4px 0;
  background: linear-gradient(180deg, var(--brand-600, #2563eb), #0d9488);
}

.pov-fc-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 10px;
}

.pov-fc-kicker {
  margin: 0;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--brand-600, #2563eb);
}

.pov-fc-freshness {
  font-size: 10px;
  font-weight: 600;
  color: var(--pov-text-tertiary);
  white-space: nowrap;
}

.pov-fc-posture {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px 12px;
  padding: 10px 12px;
  margin-bottom: 12px;
  border-radius: 6px;
  background: color-mix(in srgb, var(--foreground) 2%, #fff);
  border: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
}

.pov-fc-posture-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.pov-fc-posture-cell--confidence {
  grid-column: 1 / -1;
}

@media (min-width: 640px) {
  .pov-fc-posture-cell--confidence {
    grid-column: auto;
  }
}

.pov-fc-posture-key {
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--pov-text-tertiary);
}

.pov-fc-posture-val {
  font-size: 13px;
  font-weight: 700;
  line-height: 1.25;
  color: var(--foreground);
}

.pov-fc-posture-val--success {
  color: #047857;
}

.pov-fc-posture-val--warn,
.pov-fc-posture-val--caution {
  color: #b45309;
}

.pov-fc-confidence-scan {
  margin: 2px 0 0;
  font-size: 11px;
  line-height: 1.35;
  color: color-mix(in srgb, var(--foreground) 55%, transparent);
}

.pov-fc-move {
  padding-top: 4px;
  border-top: 1px solid color-mix(in srgb, var(--foreground) 6%, transparent);
}

.pov-fc-move-kicker {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 6px;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--pov-text-tertiary);
}

.pov-fc-move-pulse {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--brand-600, #2563eb);
  box-shadow: 0 0 0 0 color-mix(in srgb, var(--brand-600) 45%, transparent);
  animation: pov-mc-pulse 2.2s var(--pov-ease-out) infinite;
}

.pov-fc-move-narrative {
  margin: 0 0 12px;
  font-size: 16px;
  font-weight: 650;
  line-height: 1.35;
  letter-spacing: -0.02em;
  color: var(--foreground);
}

.pov-fc-move-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.pov-fc-cta-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 10px 16px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 700;
  text-decoration: none;
  color: #fff;
  background: var(--brand-600, #2563eb);
  border: 1px solid color-mix(in srgb, var(--brand-600) 80%, #000);
  box-shadow: var(--pov-elev-1);
  transition:
    transform var(--pov-dur-fast) var(--pov-ease),
    box-shadow var(--pov-dur-med) var(--pov-ease);
}

.pov-fc-cta-primary:hover {
  transform: translateY(-1px);
  box-shadow: var(--pov-elev-2);
}

.pov-fc-cta-secondary {
  padding: 9px 14px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 700;
  border: 1px solid color-mix(in srgb, var(--foreground) 12%, var(--border));
  background: #fff;
  color: var(--foreground);
  cursor: pointer;
  transition: background var(--pov-dur-fast) var(--pov-ease);
}

.pov-fc-cta-secondary:hover {
  background: color-mix(in srgb, var(--foreground) 3%, #fff);
}

.pov-fc-blockers {
  margin-top: 12px;
  padding: 8px 10px;
  border-radius: 6px;
  background: color-mix(in srgb, #b45309 6%, #fff);
  border: 1px solid color-mix(in srgb, #b45309 18%, var(--border));
}

.pov-fc-blockers-kicker {
  margin: 0 0 5px;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #92400e;
}

.pov-fc-blockers-list {
  margin: 0;
  padding: 0 0 0 14px;
  font-size: 12px;
  line-height: 1.4;
  color: color-mix(in srgb, var(--foreground) 78%, transparent);
}

.pov-fc-blocker-item + .pov-fc-blocker-item {
  margin-top: 3px;
}

.pov-fc-context,
.pov-fc-footnote {
  margin: 10px 0 0;
  font-size: 12px;
  line-height: 1.4;
  color: color-mix(in srgb, var(--foreground) 58%, transparent);
}

/* ── Layer 2: Active signals strip ── */
.pov-signals-strip {
  padding: 8px 10px 9px;
  border-radius: var(--pov-radius);
  border: 1px solid color-mix(in srgb, var(--foreground) 7%, var(--border));
  background: color-mix(in srgb, var(--foreground) 1.5%, #fff);
}

.pov-signals-strip-kicker {
  margin: 0 0 6px;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--pov-text-tertiary);
}

.pov-signals-strip-list {
  display: flex;
  flex-wrap: nowrap;
  gap: 6px;
  margin: 0;
  padding: 2px 0 4px;
  list-style: none;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: thin;
}

.pov-signal-chip {
  flex: 0 0 auto;
  margin: 0;
  max-width: min(220px, 42vw);
}

.pov-signal-chip-btn,
.pov-signal-chip-static {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 9px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));
  background: #fff;
  font-size: 11px;
  font-weight: 650;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pov-signal-chip-btn {
  cursor: pointer;
  font: inherit;
  color: inherit;
  transition:
    border-color var(--pov-dur-fast) var(--pov-ease),
    background var(--pov-dur-fast) var(--pov-ease),
    transform var(--pov-dur-fast) var(--pov-ease);
}

.pov-signal-chip--attention .pov-signal-chip-btn,
.pov-signal-chip--attention .pov-signal-chip-static {
  border-color: color-mix(in srgb, #b45309 28%, var(--border));
  background: color-mix(in srgb, #b45309 5%, #fff);
}

.pov-signal-chip--open .pov-signal-chip-btn,
.pov-signal-chip--open .pov-signal-chip-static {
  border-style: dashed;
}

.pov-signal-chip--actionable:hover .pov-signal-chip-btn {
  border-color: color-mix(in srgb, var(--brand-600) 35%, var(--border));
  transform: translateY(-1px);
}

.pov-signal-chip-icon {
  flex-shrink: 0;
  font-size: 10px;
  font-weight: 800;
}

.pov-signal-chip-icon--confirmed {
  color: #047857;
}

.pov-signal-chip-icon--attention {
  color: #b45309;
}

.pov-signal-chip-icon--open {
  color: var(--pov-text-tertiary);
}

.pov-signal-chip-label {
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ── Layer 3: Tactical snapshot (synthesized lanes) ── */
.pov-tactical-brief {
  padding: 12px 14px 14px;
}

.pov-tactical-brief-head {
  margin-bottom: 10px;
}

.pov-tactical-brief-subtitle {
  margin: 3px 0 0;
  font-size: 11px;
  color: var(--pov-text-tertiary);
}

.pov-tactical-brief-lanes {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0;
  border: 1px solid color-mix(in srgb, var(--foreground) 7%, var(--border));
  border-radius: 6px;
  overflow: hidden;
  background: #fff;
}

.pov-tactical-lane {
  padding: 10px 12px;
  min-width: 0;
}

.pov-tactical-lane + .pov-tactical-lane {
  border-left: 1px solid color-mix(in srgb, var(--foreground) 7%, var(--border));
}

.pov-tactical-lane-label {
  margin: 0 0 6px;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--pov-text-tertiary);
}

.pov-tactical-lane-primary {
  margin: 0;
  font-size: 12px;
  font-weight: 650;
  line-height: 1.35;
  color: var(--foreground);
}

.pov-tactical-lane-more {
  margin: 6px 0 0;
  padding: 0 0 0 12px;
  font-size: 11px;
  line-height: 1.35;
  color: color-mix(in srgb, var(--foreground) 58%, transparent);
}

.pov-tactical-lane-more-item + .pov-tactical-lane-more-item {
  margin-top: 3px;
}

.pov-tactical-lane--facility {
  background: color-mix(in srgb, var(--foreground) 1%, #fff);
}

.pov-tactical-lane--observation {
  background: color-mix(in srgb, var(--brand-600) 2%, #fff);
}

/* ── Layer 4: Deep operational intelligence (collapsed) ── */
.pov-deep-intel {
  border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
  border-radius: var(--pov-radius);
  background: color-mix(in srgb, var(--foreground) 1%, #fff);
  overflow: hidden;
}

.pov-deep-intel-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 12px;
  cursor: pointer;
  list-style: none;
  font-size: 12px;
  font-weight: 700;
  color: var(--foreground);
  transition: background var(--pov-dur-fast) var(--pov-ease);
}

.pov-deep-intel-summary::-webkit-details-marker {
  display: none;
}

.pov-deep-intel-summary::after {
  content: "▾";
  font-size: 11px;
  color: var(--pov-text-tertiary);
  transition: transform var(--pov-dur-fast) var(--pov-ease);
}

.pov-deep-intel[open] .pov-deep-intel-summary::after {
  transform: rotate(180deg);
}

.pov-deep-intel-summary:hover {
  background: color-mix(in srgb, var(--foreground) 2%, #fff);
}

.pov-deep-intel-summary-title {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.pov-deep-intel-summary-hint {
  font-size: 10px;
  font-weight: 600;
  color: var(--pov-text-tertiary);
}

.pov-deep-intel-body {
  padding: 0 12px 12px;
  border-top: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
}

.pov-deep-intel-memory {
  padding: 10px 0 8px;
}

.pov-deep-intel-memory-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px 10px;
}

.pov-deep-intel-memory-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 11px;
  line-height: 1.35;
}

.pov-deep-intel-memory-kicker {
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--pov-text-tertiary);
}

.pov-deep-intel-scope.provider-intel-scope-split {
  gap: 10px;
}

.pov-deep-intel-scope .provider-intel-scope-panel {
  padding: 10px;
  border-radius: 6px;
  border: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
  background: #fff;
}

.pov-deep-intel-foot {
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px solid color-mix(in srgb, var(--foreground) 5%, transparent);
}

.pov-deep-intel-link {
  font-size: 12px;
  font-weight: 700;
  color: var(--brand-600, #2563eb);
  text-decoration: none;
}

.pov-deep-intel-link:hover {
  text-decoration: underline;
}

.pov-command-activity {
  opacity: 0.92;
}

.pov-command-activity .provider-cc-section-title {
  font-size: 12px;
}

@media (max-width: 720px) {
  .pov-fc-posture {
    grid-template-columns: 1fr 1fr;
  }

  .pov-fc-posture-cell--confidence {
    grid-column: 1 / -1;
  }

  .pov-tactical-brief-lanes {
    grid-template-columns: 1fr;
  }

  .pov-tactical-lane + .pov-tactical-lane {
    border-left: none;
    border-top: 1px solid color-mix(in srgb, var(--foreground) 7%, var(--border));
  }

  .pov-deep-intel-memory-list {
    grid-template-columns: 1fr;
  }

  .pov-fc-move-narrative {
    font-size: 15px;
  }

  .pov-fc-move-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .pov-fc-cta-primary,
  .pov-fc-cta-secondary {
    width: 100%;
    text-align: center;
  }
}
`;
