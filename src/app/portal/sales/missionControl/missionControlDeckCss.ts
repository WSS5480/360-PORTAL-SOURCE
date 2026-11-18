/** Dark navy mission deck — hero for mission-critical context. */
export const missionControlDeckCss = `
.mc-deck {
  position: relative;
  isolation: isolate;
  background: var(--mc-hero-bg);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: var(--mc-elev-hero);
  color: var(--mc-hero-ink);
}

.mc-deck::before {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(ellipse 70% 55% at 88% -10%, color-mix(in srgb, var(--mc-accent) 22%, transparent), transparent 58%),
    radial-gradient(ellipse 45% 40% at 4% 100%, color-mix(in srgb, var(--mc-accent) 10%, transparent), transparent 52%);
  z-index: 0;
}

.mc-deck--inset {
  border-radius: var(--mc-radius-lg);
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.mc-deck__inner {
  position: relative;
  z-index: 1;
}

.mc-deck__bar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px 10px;
  flex-wrap: wrap;
}

.mc-deck__nav {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 0 0 auto;
}

.mc-deck__identity {
  flex: 1 1 180px;
  min-width: 0;
}

.mc-deck__kicker {
  margin: 0 0 4px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--mc-hero-muted);
}

.mc-deck__name,
.mc-deck__title {
  margin: 0;
  font-size: clamp(17px, 2.1vw, 26px);
  font-weight: 800;
  line-height: 1.15;
  letter-spacing: -0.03em;
  color: var(--mc-hero-ink);
}

.mc-deck__meta-line,
.mc-deck__visit {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 8px;
  margin-top: 3px;
}

.mc-deck__meta,
.mc-deck__meta-line p {
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  color: var(--mc-hero-subtle);
}

.mc-deck__meta--muted {
  font-style: italic;
  opacity: 0.85;
}

.mc-deck__type {
  display: inline-flex;
  align-items: center;
  min-height: 22px;
  padding: 2px 9px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 800;
  color: #fff;
  background: color-mix(in srgb, var(--mc-accent) 72%, rgba(15, 23, 42, 0.9));
  border: 1px solid color-mix(in srgb, var(--mc-accent) 55%, rgba(255, 255, 255, 0.2));
  box-shadow: 0 0 12px color-mix(in srgb, var(--mc-accent) 30%, transparent);
}

.mc-deck__when {
  font-size: 12px;
  font-weight: 700;
  color: var(--mc-hero-subtle);
}

.mc-deck__meta-chip {
  display: inline-flex;
  padding: 2px 7px;
  border-radius: 999px;
  font-size: 9px;
  font-weight: 700;
  color: var(--mc-hero-subtle);
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.mc-deck__actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 6px;
  flex: 0 1 auto;
  margin-left: auto;
}

.mc-deck__back {
  color: color-mix(in srgb, var(--mc-accent) 72%, #fff);
  text-decoration: none;
  font-size: 12px;
  font-weight: 650;
}

.mc-deck__back:hover {
  color: #fff;
}

.mc-deck .sales-cmd-mobile-menu {
  color: #e2e8f0;
  border-color: rgba(255, 255, 255, 0.14);
  background: rgba(255, 255, 255, 0.06);
}

.mc-deck__meta-grid {
  display: grid;
  gap: 2px;
  margin-top: 4px;
}

@media (min-width: 720px) {
  .mc-deck__bar {
    flex-wrap: nowrap;
    align-items: center;
  }

  .mc-deck__identity--inline {
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 6px 10px;
  }

  .mc-deck__identity--inline .mc-deck__meta-line,
  .mc-deck__identity--inline .mc-deck__visit {
    margin-top: 0;
  }

  .mc-deck__actions {
    flex-shrink: 0;
  }
}
`;
