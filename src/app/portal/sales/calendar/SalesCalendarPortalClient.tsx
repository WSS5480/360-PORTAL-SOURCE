"use client";

import Link from "next/link";
import React from "react";
import { SalesCalendarAgendaView } from "@/components/sales/calendar/SalesCalendarAgendaView";
import { SalesCalendarEventDrawer } from "@/components/sales/calendar/SalesCalendarEventDrawer";
import { SalesCalendarFiltersBar, SalesCalendarFiltersSheet } from "@/components/sales/calendar/SalesCalendarFilters";
import { SalesCalendarMonthView } from "@/components/sales/calendar/SalesCalendarMonthView";
import { SalesCalendarWeekView } from "@/components/sales/calendar/SalesCalendarWeekView";
import { salesCalendarCss } from "@/components/sales/calendar/salesCalendarCss";
import {
  buildCaptureIntelligenceOpenContext,
  useCaptureIntelligence,
} from "@/components/sales/captureIntelligence/CaptureIntelligenceHost";
import { SalesCommandPage, sc } from "@/components/sales/salesCommandUi";
import {
  eventsInRange,
  eventOccursOnYmd,
  eventEndYmdLocal,
  formatCalendarRangeLabel,
  getVisibleRange,
  shiftAnchor,
  startOfDayLocal,
  ymdLocal,
} from "@/lib/surgical-sales/calendar/salesCalendarDateUtils";
import type { SalesCalendarEvent, SalesCalendarViewMode } from "@/lib/surgical-sales/calendar/salesCalendarTypes";
import { useSalesCalendarEvents } from "@/lib/surgical-sales/calendar/useSalesCalendarEvents";
import { LOG_UPDATE_BUTTON_LABEL, LOG_UPDATE_UI_ENABLED } from "@/lib/surgical-sales/logUpdateUx";

const MOBILE_BREAKPOINT = 900;

function useIsMobileCalendar(): boolean {
  const [mobile, setMobile] = React.useState(false);
  React.useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`);
    const apply = () => setMobile(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
  return mobile;
}

export default function SalesCalendarPortalClient() {
  const isMobile = useIsMobileCalendar();
  const capture = useCaptureIntelligence();
  const { filteredEvents, loading, error, filters, setFilters, completeTask } = useSalesCalendarEvents();

  const [viewMode, setViewMode] = React.useState<SalesCalendarViewMode | null>(null);
  const [anchorDate, setAnchorDate] = React.useState(() => startOfDayLocal(new Date()));
  const [selectedEvent, setSelectedEvent] = React.useState<SalesCalendarEvent | null>(null);
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const [agendaDayFilter, setAgendaDayFilter] = React.useState<string | null>(null);

  const resolvedView = viewMode ?? (isMobile ? "agenda" : "week");
  const todayViewYmd = resolvedView === "today" ? ymdLocal(anchorDate) : null;

  React.useEffect(() => {
    if (resolvedView !== "agenda") setAgendaDayFilter(null);
  }, [resolvedView]);

  const range = getVisibleRange(resolvedView, anchorDate);
  const rangeEvents = React.useMemo(() => {
    if (resolvedView === "today") {
      return filteredEvents.filter((e) => eventOccursOnYmd(e, ymdLocal(anchorDate)));
    }
    if (resolvedView === "agenda") {
      if (agendaDayFilter) {
        return filteredEvents.filter((e) => eventOccursOnYmd(e, agendaDayFilter));
      }
      const today = ymdLocal(new Date());
      return filteredEvents.filter((e) => eventEndYmdLocal(e) >= today);
    }
    return eventsInRange(filteredEvents, range.start, range.end);
  }, [filteredEvents, resolvedView, range.start, range.end, agendaDayFilter, anchorDate]);

  const rangeLabel = agendaDayFilter
    ? new Date(`${agendaDayFilter}T12:00:00`).toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : formatCalendarRangeLabel(resolvedView, anchorDate);

  function goToday() {
    setAnchorDate(startOfDayLocal(new Date()));
    setAgendaDayFilter(null);
  }

  function goPrev() {
    setAnchorDate((d) => shiftAnchor(resolvedView, d, -1));
    setAgendaDayFilter(null);
  }

  function goNext() {
    setAnchorDate((d) => shiftAnchor(resolvedView, d, 1));
    setAgendaDayFilter(null);
  }

  function selectDay(ymd: string) {
    setAgendaDayFilter(null);
    setViewMode("today");
    setAnchorDate(new Date(`${ymd}T12:00:00`));
  }

  async function handleCompleteFollowUp(event: SalesCalendarEvent) {
    if (event.metadata?.recordType !== "task") return;
    const ok = await completeTask(event.sourceId);
    if (ok) setSelectedEvent(null);
  }

  const logUpdateAction = LOG_UPDATE_UI_ENABLED ? (
    <button
      type="button"
      className="sales-cal-btn"
      onClick={() => capture.open(buildCaptureIntelligenceOpenContext("global"))}
    >
      {LOG_UPDATE_BUTTON_LABEL}
    </button>
  ) : undefined;

  return (
    <SalesCommandPage
      kicker="Field Execution"
      title="Calendar"
      subtitle="Plan engagements, observations, cases, follow-ups, and approved time off."
      actions={logUpdateAction}
    >
      <style>{salesCalendarCss}</style>

      <div className="sales-cal-root">
        <div className="sales-cal-toolbar">
          <div className="sales-cal-toolbar-nav">
            <button type="button" className="sales-cal-btn sales-cal-btn--today" onClick={goToday}>
              Today
            </button>
            <button type="button" className="sales-cal-btn sales-cal-btn--icon" onClick={goPrev} aria-label="Previous">
              ‹
            </button>
            <button type="button" className="sales-cal-btn sales-cal-btn--icon" onClick={goNext} aria-label="Next">
              ›
            </button>
            <span className="sales-cal-range-label">{rangeLabel}</span>
          </div>

          <div className="sales-cal-segmented" role="tablist" aria-label="Calendar view">
            {(["today", "week", "month", "agenda"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                role="tab"
                aria-selected={resolvedView === mode}
                className={`sales-cal-segment${resolvedView === mode ? " is-active" : ""}`}
                onClick={() => {
                  setViewMode(mode);
                  setAgendaDayFilter(null);
                }}
              >
                {mode === "today" ? "Today" : mode === "week" ? "Week" : mode === "month" ? "Month" : "Agenda"}
              </button>
            ))}
          </div>

          <button
            type="button"
            className="sales-cal-btn sales-cal-filters-mobile-trigger"
            onClick={() => setFiltersOpen(true)}
          >
            Filters
          </button>
        </div>

        <SalesCalendarFiltersBar filters={filters} onChange={setFilters} />
        <SalesCalendarFiltersSheet
          open={filtersOpen}
          filters={filters}
          onChange={setFilters}
          onClose={() => setFiltersOpen(false)}
        />

        {error ? (
          <div role="alert" style={sc.alertError}>
            {error}
          </div>
        ) : null}

        {loading ? (
          <p style={{ color: "var(--muted)", margin: 0 }}>Loading field calendar…</p>
        ) : rangeEvents.length === 0 && !agendaDayFilter ? (
          <div className="sales-cal-empty">
            No events in this range.{" "}
            <Link href="/portal/sales/engagements/new">Schedule an engagement</Link> or{" "}
            <Link href="/portal/sales/cases/new">add a case</Link>.
          </div>
        ) : (
          <>
            {resolvedView === "week" && !isMobile ? (
              <SalesCalendarWeekView
                anchorDate={anchorDate}
                events={rangeEvents}
                onSelectEvent={setSelectedEvent}
                onSelectDay={selectDay}
              />
            ) : null}

            {resolvedView === "month" && !isMobile ? (
              <SalesCalendarMonthView
                anchorDate={anchorDate}
                events={rangeEvents}
                onSelectEvent={setSelectedEvent}
                onSelectDay={selectDay}
              />
            ) : null}

            {(resolvedView === "today" || resolvedView === "agenda" || isMobile) && (
              <SalesCalendarAgendaView
                events={filteredEvents}
                dayFilterYmd={todayViewYmd ?? agendaDayFilter}
                onSelectEvent={setSelectedEvent}
              />
            )}

            {resolvedView === "week" && isMobile ? (
              <p style={{ fontSize: 12, color: "var(--muted)", margin: 0 }}>
                Week grid is optimized for desktop. Use Agenda view on mobile.
              </p>
            ) : null}
          </>
        )}

        {agendaDayFilter ? (
          <button type="button" className="sales-cal-btn" onClick={() => setAgendaDayFilter(null)}>
            Clear day filter
          </button>
        ) : null}
      </div>

      <SalesCalendarEventDrawer
        event={selectedEvent}
        isMobile={isMobile}
        onClose={() => setSelectedEvent(null)}
        onCompleteFollowUp={handleCompleteFollowUp}
      />
    </SalesCommandPage>
  );
}
