/** Activity timeline — readable contrast on light surfaces. */
export const missionControlTimelineCss = `
.mc-timeline {
  padding: 10px 12px 12px 18px;
}

.mc-timeline__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 10px;
}

.mc-timeline__kicker {
  margin: 0 0 4px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--mc-meta);
}

.mc-timeline__title {
  margin: 0;
  font-size: 15px;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--mc-ink);
}

.mc-timeline__link {
  font-size: 12px;
  font-weight: 700;
  color: var(--brand-700, #1d4ed8);
  text-decoration: none;
}

.mc-timeline__group {
  margin-top: 8px;
}

.mc-timeline__date {
  margin: 0 0 6px;
  padding-left: 2px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--mc-meta);
}

.mc-timeline__list {
  list-style: none;
  margin: 0;
  padding: 0 0 0 4px;
  display: grid;
  gap: 0;
}

.mc-timeline__item {
  position: relative;
  padding-left: 28px;
}

.mc-timeline__item::before {
  content: "";
  position: absolute;
  left: 10px;
  top: 0;
  bottom: 0;
  width: 2px;
  background: color-mix(in srgb, var(--brand-600, #2563eb) 22%, var(--mc-border));
}

.mc-timeline__item:last-child::before {
  bottom: 50%;
}

.mc-timeline__row,
.mc-timeline__link-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 8px 8px 8px 0;
  border-radius: 10px;
  text-decoration: none;
  color: inherit;
}

.mc-timeline__link-row:hover {
  background: color-mix(in srgb, var(--brand-600, #2563eb) 5%, #fff);
}

.mc-timeline__link-row:hover .mc-timeline__line {
  color: var(--mc-ink);
}

.mc-timeline__icon {
  position: absolute;
  left: 0;
  top: 10px;
  width: 22px;
  height: 22px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  font-size: 8px;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: #fff;
  box-shadow: 0 0 0 2px var(--mc-surface);
}

.mc-timeline__icon--engagement { background: #2563eb; }
.mc-timeline__icon--note { background: #64748b; }
.mc-timeline__icon--intelligence { background: #9333ea; }
.mc-timeline__icon--case { background: #0d9488; }
.mc-timeline__icon--opportunity { background: #16a34a; }
.mc-timeline__icon--product { background: #ca8a04; }
.mc-timeline__icon--lifecycle { background: #475569; }

.mc-timeline__content {
  min-width: 0;
  flex: 1;
}

.mc-timeline__type {
  display: block;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--mc-meta);
}

.mc-timeline__line {
  margin: 2px 0 0;
  font-size: 13px;
  font-weight: 650;
  line-height: 1.4;
  color: var(--mc-ink-soft);
}

.mc-timeline__time {
  display: block;
  margin-top: 2px;
  font-size: 11px;
  font-weight: 600;
  color: var(--mc-meta);
}

.mc-timeline__empty {
  margin: 0;
  padding: 8px 0;
  font-size: 13px;
  font-style: italic;
  color: var(--mc-meta);
}
`;
