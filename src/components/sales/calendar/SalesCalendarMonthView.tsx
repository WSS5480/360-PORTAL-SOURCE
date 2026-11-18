"use client";

import React from "react";
import { eventsForYmd, isTodayYmd, monthGridDays } from "@/lib/surgical-sales/calendar/salesCalendarDateUtils";
import type { SalesCalendarEvent } from "@/lib/surgical-sales/calendar/salesCalendarTypes";
import { SalesCalendarEventPill } from "./SalesCalendarEventPill";

const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function SalesCalendarMonthView({
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
  const cells = monthGridDays(anchorDate);

  return (
    <div>
      <div className="sales-cal-month">
        {DOW.map((d) => (
          <div key={d} className="sales-cal-month-dow">
            {d}
          </div>
        ))}
        {cells.map((cell) => {
          const dayEvents = eventsForYmd(events, cell.ymd);
          const visible = dayEvents.slice(0, 3);
          const overflow = dayEvents.length - visible.length;
          return (
            <div
              key={cell.ymd}
              className={`sales-cal-month-cell${cell.inMonth ? "" : " is-outside"}${isTodayYmd(cell.ymd) ? " is-today" : ""}`}
              onClick={() => onSelectDay(cell.ymd)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelectDay(cell.ymd);
                }
              }}
              role="button"
              tabIndex={0}
            >
              <div className="sales-cal-month-daynum">{cell.date.getDate()}</div>
              {visible.map((event) => (
                <div
                  key={event.id}
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                  role="presentation"
                >
                  <SalesCalendarEventPill
                    event={event}
                    compact
                    onClick={() => onSelectEvent(event)}
                  />
                </div>
              ))}
              {overflow > 0 ? <div className="sales-cal-more">+{overflow} more</div> : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
