export const debriefPrepareUniversalTimelineCss = `
.dpb-universal-timeline-proto {
  margin-top: 16px;
  padding: 14px 16px;
  border: 1px dashed var(--border, #d1d5db);
  border-radius: 10px;
  background: color-mix(in srgb, var(--muted, #f3f4f6) 55%, transparent);
}
.dpb-universal-timeline-proto__kicker {
  margin: 0 0 4px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--muted-foreground, #6b7280);
}
.dpb-universal-timeline-proto__title {
  margin: 0 0 6px;
  font-size: 15px;
  font-weight: 700;
}
.dpb-universal-timeline-proto__note {
  margin: 0 0 14px;
  font-size: 12px;
  line-height: 1.45;
  color: var(--muted-foreground, #6b7280);
}
.dpb-universal-timeline-proto__meta {
  margin: 0 0 12px;
  font-size: 12px;
  color: var(--muted-foreground, #6b7280);
}
.dpb-universal-timeline-proto__grid {
  display: grid;
  gap: 12px;
}
.dpb-universal-timeline-proto__stack {
  display: grid;
  gap: 12px;
}
.dpb-universal-timeline-proto__bucket {
  padding: 10px 12px;
  border-radius: 8px;
  background: var(--background, #fff);
  border: 1px solid var(--border, #e5e7eb);
}
.dpb-universal-timeline-proto__bucket-title {
  margin: 0 0 4px;
  font-size: 13px;
  font-weight: 700;
}
.dpb-universal-timeline-proto__bucket-hint {
  margin: 0 0 8px;
  font-size: 12px;
  line-height: 1.4;
  color: var(--muted-foreground, #6b7280);
}
.dpb-universal-timeline-proto__bucket-empty {
  margin: 0;
  font-size: 12px;
  color: var(--muted-foreground, #6b7280);
  font-style: italic;
}
.dpb-universal-timeline-proto__list {
  margin: 0;
  padding-left: 18px;
  display: grid;
  gap: 8px;
}
.dpb-universal-timeline-proto__item-concept {
  font-size: 13px;
  font-weight: 600;
  line-height: 1.35;
}
.dpb-universal-timeline-proto__item-meta {
  margin: 2px 0 0;
  font-size: 11px;
  color: var(--muted-foreground, #6b7280);
}
.dpb-universal-timeline-proto__item-evidence {
  margin: 4px 0 0;
  font-size: 11px;
  color: var(--muted-foreground, #6b7280);
  font-style: italic;
}
.dpb-universal-timeline-proto__status {
  margin: 0;
  font-size: 12px;
  color: var(--muted-foreground, #6b7280);
}
.dpb-universal-timeline-proto__error {
  margin: 0;
  font-size: 12px;
  color: var(--destructive, #b91c1c);
}
`;
