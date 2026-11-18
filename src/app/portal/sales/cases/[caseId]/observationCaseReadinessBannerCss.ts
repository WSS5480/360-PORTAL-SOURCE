export const observationCaseReadinessBannerCss = `
.case-obs-readiness-banner {
  display: grid;
  gap: 12px;
  padding: 16px 18px;
  border-bottom: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
}
.case-obs-readiness-banner--ready {
  background:
    linear-gradient(
      135deg,
      color-mix(in srgb, #0f172a 92%, #14532d) 0%,
      color-mix(in srgb, #14532d 78%, #134e4a) 52%,
      color-mix(in srgb, #166534 70%, #0f172a) 100%
    );
  color: #f0fdf4;
  box-shadow: inset 0 1px 0 color-mix(in srgb, #ffffff 12%, transparent);
}
.case-obs-readiness-banner--not-ready {
  background:
    linear-gradient(
      135deg,
      color-mix(in srgb, #0f172a 92%, #78350f) 0%,
      color-mix(in srgb, #92400e 78%, #292524) 52%,
      color-mix(in srgb, #b45309 68%, #1c1917) 100%
    );
  color: #fffbeb;
  box-shadow: inset 0 1px 0 color-mix(in srgb, #ffffff 10%, transparent);
}
.case-obs-readiness-banner-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}
.case-obs-readiness-banner-head-main {
  display: grid;
  gap: 4px;
}
.case-obs-readiness-banner-kicker {
  margin: 0;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: color-mix(in srgb, #ffffff 62%, transparent);
}
.case-obs-readiness-banner-title {
  margin: 0;
  font-size: 22px;
  font-weight: 900;
  letter-spacing: 0.06em;
  line-height: 1.1;
  text-transform: uppercase;
}
.case-obs-readiness-banner-status {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, #ffffff 28%, transparent);
  background: color-mix(in srgb, #ffffff 12%, transparent);
  font-size: 9px;
  font-weight: 900;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
.case-obs-readiness-banner-checks {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.case-obs-readiness-banner-check {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 32px;
  padding: 5px 12px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, #ffffff 20%, transparent);
  background: color-mix(in srgb, #ffffff 10%, transparent);
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.01em;
}
.case-obs-readiness-banner-check--complete {
  border-color: color-mix(in srgb, #bbf7d0 40%, transparent);
  background: color-mix(in srgb, #ffffff 14%, transparent);
}
.case-obs-readiness-banner-check--pending,
.case-obs-readiness-banner-check--blocked {
  border-color: color-mix(in srgb, #fde68a 45%, transparent);
  background: color-mix(in srgb, #ffffff 16%, transparent);
}
.case-obs-readiness-banner-check-icon {
  display: inline-grid;
  place-items: center;
  width: 18px;
  height: 18px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 900;
  line-height: 1;
  background: color-mix(in srgb, #ffffff 18%, transparent);
}
.case-obs-readiness-banner-check--complete .case-obs-readiness-banner-check-icon {
  color: #166534;
  background: #bbf7d0;
}
.case-obs-readiness-banner-check--pending .case-obs-readiness-banner-check-icon,
.case-obs-readiness-banner-check--blocked .case-obs-readiness-banner-check-icon {
  color: #92400e;
  background: #fde68a;
}
.case-obs-readiness-banner-pending {
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  line-height: 1.45;
  color: color-mix(in srgb, #ffffff 88%, transparent);
}
`;
