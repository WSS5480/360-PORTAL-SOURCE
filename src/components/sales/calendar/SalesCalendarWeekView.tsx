"use client";

import React from "react";
import { eventsForYmd, isTodayYmd, weekDayColumns } from "@/lib/surgical-sales/calendar/salesCalendarDateUtils";
import type { SalesCalendarEvent } from "@/lib/surgical-sales/calendar/salesCalendarTypes";
import { SalesCalendarEventPill } from "./SalesCalendarEventPill";

export function SalesCalendarWeekView({
  anchorDate,
  events,
  onSelectEvent,
  onSelectDay,
}: {
  anchorDate: Date;
  events: SalesCalendarEvent[];
  onSelectEvent: (event: SalesCalendarEvent) => void;
  onSelectDay: (ymd: string) => void;
}) {
  const columns = weekDayColumns(anchorDate);

  return (
    <div className="sales-cal-week">
      {columns.map((col) => {
        const dayEvents = eventsForYmd(events, col.ymd);
        const today = isTodayYmd(col.ymd);
        return (
          <div key={col.ymd} className={`sales-cal-week-col${today ? " is-today" : ""}`}>
            <button
              type="button"
              className="sales-cal-week-head"
              onClick={() => onSelectDay(col.ymd)}
              aria-label={`Open ${col.label} ${col.dayNum} day view`}
            >
              {col.label}
              <strong>{col.dayNum}</strong>
            </button>
            <div className="sales-cal-week-body">
              {dayEvents.length === 0 ? (
                <span style={{ fontSize: 11, color: "var(--muted)", padding: 4 }}>—</span>
              ) : (
                dayEvents.map((event) => (
                  <SalesCalendarEventPill
                    key={event.id}
                    event={event}
                    onClick={() => onSelectEvent(event)}
                  />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
