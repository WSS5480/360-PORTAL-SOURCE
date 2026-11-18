"use client";

import Link from "next/link";
import React from "react";
import { createPortal } from "react-dom";
import {
  calendarDebriefStatusLabel,
  calendarEventWhenLabel,
  calendarNextRecommendedAction,
  calendarPrepStatusLabel,
  calendarEventTypeLabel,
  eventDebriefHref,
  eventPrepareHref,
  eventRecordHref,
} from "@/lib/surgical-sales/calendar/salesCalendarPresentation";
import type { SalesCalendarEvent } from "@/lib/surgical-sales/calendar/salesCalendarTypes";

export function SalesCalendarEventDrawer({
  event,
  isMobile,
  onClose,
  onCompleteFollowUp,
}: {
  event: SalesCalendarEvent | null;
  isMobile: boolean;
  onClose: () => void;
  onCompleteFollowUp?: (event: SalesCalendarEvent) => void;
}) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  React.useEffect(() => {
    if (!event) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [event, onClose]);

  if (!mounted || !event) return null;

  const recordHref = eventRecordHref(event);
  const prepareHref = eventPrepareHref(event);
  const debriefHref = eventDebriefHref(event);
  const isTask = event.metadata?.recordType === "task";
  const isTimeOff = event.metadata?.recordType === "time_off";
  const timeOffNotes =
    isTimeOff && typeof event.metadata?.notes === "string" ? event.metadata.notes.trim() : "";

  return createPortal(
    <div
      className={`sales-cal-drawer-overlay${isMobile ? " is-mobile" : ""}`}
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="sales-cal-drawer" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <header className="sales-cal-drawer-head">
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: "var(--muted)", textTransform: "uppercase" }}>
              {calendarEventTypeLabel(event)}
            </div>
            <h2 style={{ margin: "6px 0 0", fontSize: 18, lineHeight: 1.25 }}>{event.title}</h2>
          </div>
          <button type="button" className="sales-cal-btn sales-cal-btn--icon" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </header>

        <div className="sales-cal-drawer-body">
          <dl className="sales-cal-kv">
            <dt>When</dt>
            <dd>{calendarEventWhenLabel(event)}</dd>
          </dl>
          {event.providerName ? (
            <dl className="sales-cal-kv">
              <dt>Provider</dt>
              <dd>{event.providerName}</dd>
            </dl>
          ) : null}
          {event.organizationName ? (
            <dl className="sales-cal-kv">
              <dt>Organization</dt>
              <dd>{event.organizationName}</dd>
            </dl>
          ) : null}
          {event.productFocus ? (
            <dl className="sales-cal-kv">
              <dt>Product focus</dt>
              <dd>{event.productFocus}</dd>
            </dl>
          ) : null}
          {event.location ? (
            <dl className="sales-cal-kv">
              <dt>Location</dt>
              <dd>{event.location}</dd>
            </dl>
          ) : null}
          {event.status ? (
            <dl className="sales-cal-kv">
              <dt>Status</dt>
              <dd>{event.status}</dd>
            </dl>
          ) : null}
          {timeOffNotes ? (
            <dl className="sales-cal-kv">
              <dt>Notes</dt>
              <dd>{timeOffNotes}</dd>
            </dl>
          ) : null}
          {!isTimeOff ? (
            <>
              <dl className="sales-cal-kv">
                <dt>Prep</dt>
                <dd>{calendarPrepStatusLabel(event)}</dd>
              </dl>
              <dl className="sales-cal-kv">
                <dt>Debrief</dt>
                <dd>{calendarDebriefStatusLabel(event)}</dd>
              </dl>
            </>
          ) : null}
          <dl className="sales-cal-kv">
            <dt>{isTimeOff ? "Reminder" : "Next action"}</dt>
            <dd style={{ fontWeight: 500, lineHeight: 1.45 }}>{calendarNextRecommendedAction(event)}</dd>
          </dl>
        </div>

        <div className="sales-cal-drawer-actions">
          <Link href={recordHref} className="sales-cal-btn" style={{ textDecoration: "none", textAlign: "center" }}>
            {isTimeOff ? "View time off" : "View source record"}
          </Link>
          {!isTimeOff && prepareHref && !event.requiresDebrief ? (
            <Link href={prepareHref} className="sales-cal-btn" style={{ textDecoration: "none", textAlign: "center" }}>
              {event.requiresPrep ? "Start prep" : "View prep"}
            </Link>
          ) : null}
          {!isTimeOff && debriefHref && event.requiresDebrief ? (
            <Link href={debriefHref} className="sales-cal-btn" style={{ textDecoration: "none", textAlign: "center" }}>
              Debrief
            </Link>
          ) : null}
          {!isTimeOff && isTask && onCompleteFollowUp ? (
            <button
              type="button"
              className="sales-cal-btn"
              onClick={() => onCompleteFollowUp(event)}
            >
              Mark follow-up complete
            </button>
          ) : null}
          {!isTimeOff ? (
            <Link
              href="/portal/sales/tasks"
              className="sales-cal-btn"
              style={{ textDecoration: "none", textAlign: "center", color: "var(--muted)" }}
            >
              Add follow-up
            </Link>
          ) : null}
        </div>
      </div>
    </div>,
    document.body,
  );
}
