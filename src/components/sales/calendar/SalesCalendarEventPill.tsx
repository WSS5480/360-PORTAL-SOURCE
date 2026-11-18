"use client";

import React from "react";
import {
  buildCalendarEventChips,
  calendarEventSubtitle,
  calendarEventTypeClass,
} from "@/lib/surgical-sales/calendar/salesCalendarPresentation";
import type { SalesCalendarEvent } from "@/lib/surgical-sales/calendar/salesCalendarTypes";

function chipClassName(variant: string, typeClass: string): string {
  if (variant === "type") return `sales-cal-chip sales-cal-chip--type-${typeClass}`;
  if (variant === "debrief") return "sales-cal-chip sales-cal-chip--debrief";
  if (variant === "prep") return "sales-cal-chip sales-cal-chip--prep";
  return "sales-cal-chip sales-cal-chip--follow";
}

export function SalesCalendarEventPill({
  event,
  onClick,
  compact,
}: {
  event: SalesCalendarEvent;
  onClick: () => void;
  compact?: boolean;
}) {
  const subtitle = calendarEventSubtitle(event);
  const typeClass = calendarEventTypeClass(event);
  const chips = buildCalendarEventChips(event, { includeStatus: !compact });

  return (
    <button
      type="button"
      className={`sales-cal-pill sales-cal-pill--${typeClass}`}
      onClick={onClick}
    >
      <div className="sales-cal-pill-title">{event.title}</div>
      {!compact && subtitle ? <div className="sales-cal-pill-sub">{subtitle}</div> : null}
      <div className="sales-cal-pill-chips">
        {chips.map((chip) => (
          <span key={chip.key} className={chipClassName(chip.variant, typeClass)}>
            {chip.label}
          </span>
        ))}
      </div>
    </button>
  );
}
