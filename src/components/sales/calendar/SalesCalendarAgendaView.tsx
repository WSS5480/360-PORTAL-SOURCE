"use client";

import React from "react";
import {
  formatAgendaDateHeader,
  formatEventTimeShort,
  groupEventsByYmd,
  eventOccursOnYmd,
  eventEndYmdLocal,
  ymdLocal,
} from "@/lib/surgical-sales/calendar/salesCalendarDateUtils";
import {
  buildCalendarEventChips,
  calendarEventSubtitle,
  calendarEventTypeClass,
} from "@/lib/surgical-sales/calendar/salesCalendarPresentation";
import type { SalesCalendarEvent } from "@/lib/surgical-sales/calendar/salesCalendarTypes";

export function SalesCalendarAgendaView({
  events,
  dayFilterYmd,
  onSelectEvent,
}: {
  events: SalesCalendarEvent[];
  dayFilterYmd?: string | null;
  onSelectEvent: (event: SalesCalendarEvent) => void;
}) {
  const todayYmd = ymdLocal(new Date());
  const filtered = dayFilterYmd
    ? events.filter((e) => eventOccursOnYmd(e, dayFilterYmd))
    : events.filter((e) => eventEndYmdLocal(e) >= todayYmd);

  const grouped = groupEventsByYmd(filtered);
  const dates = [...grouped.keys()].sort();

  if (dates.length === 0) {
    return <div className="sales-cal-empty">No events in this range. Adjust filters or schedule field work.</div>;
  }

  return (
    <div style={{ display: "grid", gap: 14 }}>
      {dates.map((ymd) => (
        <section key={ymd} className="sales-cal-agenda-group">
          <div className="sales-cal-agenda-date">{formatAgendaDateHeader(ymd)}</div>
          {(grouped.get(ymd) ?? []).map((event) => {
            const subtitle = calendarEventSubtitle(event);
            const typeClass = calendarEventTypeClass(event);
            const chips = buildCalendarEventChips(event, { includeStatus: true });
            return (
              <button
                key={event.id}
                type="button"
                className={`sales-cal-agenda-row sales-cal-agenda-row--${typeClass}`}
                onClick={() => onSelectEvent(event)}
              >
                <div className="sales-cal-agenda-time">{formatEventTimeShort(event)}</div>
                <div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 4 }}>
                    {chips.map((chip) => (
                      <span
                        key={chip.key}
                        className={
                          chip.variant === "type"
                            ? `sales-cal-chip sales-cal-chip--type-${typeClass}`
                            : chip.variant === "debrief"
                              ? "sales-cal-chip sales-cal-chip--debrief"
                              : chip.variant === "prep"
                                ? "sales-cal-chip sales-cal-chip--prep"
                                : "sales-cal-chip sales-cal-chip--follow"
                        }
                      >
                        {chip.label}
                      </span>
                    ))}
                  </div>
                  <div className="sales-cal-agenda-title">{event.title}</div>
                  {subtitle ? <div className="sales-cal-agenda-sub">{subtitle}</div> : null}
                </div>
              </button>
            );
          })}
        </section>
      ))}
    </div>
  );
}
