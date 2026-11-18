"use client";

import React from "react";
import { buildSalesCalendarEvents } from "@/lib/surgical-sales/calendar/salesCalendarAdapters";
import { filterSalesCalendarEvents } from "@/lib/surgical-sales/calendar/salesCalendarFilters";
import type {
  SalesCalendarCaseInput,
  SalesCalendarEngagementInput,
  SalesCalendarEvent,
  SalesCalendarFilters,
  SalesCalendarTaskInput,
  SalesCalendarTimeOffInput,
} from "@/lib/surgical-sales/calendar/salesCalendarTypes";
import { DEFAULT_SALES_CALENDAR_FILTERS } from "@/lib/surgical-sales/calendar/salesCalendarTypes";

export type UseSalesCalendarEventsResult = {
  events: SalesCalendarEvent[];
  filteredEvents: SalesCalendarEvent[];
  loading: boolean;
  error: string | null;
  filters: SalesCalendarFilters;
  setFilters: React.Dispatch<React.SetStateAction<SalesCalendarFilters>>;
  reload: () => void;
  completeTask: (taskId: string) => Promise<boolean>;
};

export function useSalesCalendarEvents(): UseSalesCalendarEventsResult {
  const [events, setEvents] = React.useState<SalesCalendarEvent[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [filters, setFilters] = React.useState<SalesCalendarFilters>(DEFAULT_SALES_CALENDAR_FILTERS);
  const [reloadToken, setReloadToken] = React.useState(0);

  const reload = React.useCallback(() => {
    setReloadToken((n) => n + 1);
  }, []);

  React.useEffect(() => {
    const ac = new AbortController();
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const [engRes, caseRes, taskRes, timeOffRes] = await Promise.all([
          fetch("/api/portal/sales/engagements", { cache: "no-store", signal: ac.signal }),
          fetch("/api/portal/sales/surgical-cases", { cache: "no-store", signal: ac.signal }),
          fetch("/api/portal/sales/tasks?status=open&limit=100", { cache: "no-store", signal: ac.signal }),
          fetch("/api/portal/sales/time-off-requests", { cache: "no-store", signal: ac.signal }),
        ]);

        const engJson = (await engRes.json()) as { ok?: boolean; engagements?: SalesCalendarEngagementInput[] };
        const caseJson = (await caseRes.json()) as { ok?: boolean; cases?: SalesCalendarCaseInput[] };
        const taskJson = (await taskRes.json()) as { ok?: boolean; tasks?: SalesCalendarTaskInput[] };
        const timeOffJson = (await timeOffRes.json()) as {
          ok?: boolean;
          requests?: SalesCalendarTimeOffInput[];
        };

        if (!engRes.ok || !engJson.ok) throw new Error("Could not load engagements");
        if (!caseRes.ok || !caseJson.ok) throw new Error("Could not load cases");
        if (!taskRes.ok || !taskJson.ok) throw new Error("Could not load tasks");
        if (!timeOffRes.ok || !timeOffJson.ok) throw new Error("Could not load time off");

        const mapped = buildSalesCalendarEvents({
          engagements: (engJson.engagements ?? []).map((row) => ({
            ...row,
            provider_label: (row as { provider_label?: string }).provider_label,
            organization_label: (row as { organization_label?: string | null }).organization_label,
          })),
          cases: caseJson.cases ?? [],
          tasks: taskJson.tasks ?? [],
          timeOffRequests: timeOffJson.requests ?? [],
        });
        setEvents(mapped);
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          setError(e instanceof Error ? e.message : "Failed to load calendar");
        }
      } finally {
        setLoading(false);
      }
    })();
    return () => ac.abort();
  }, [reloadToken]);

  const filteredEvents = React.useMemo(
    () => filterSalesCalendarEvents(events, filters),
    [events, filters],
  );

  const completeTask = React.useCallback(
    async (taskId: string) => {
      try {
        const res = await fetch(`/api/portal/sales/tasks/${encodeURIComponent(taskId)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ completed: true }),
        });
        const j = (await res.json()) as { ok?: boolean };
        if (!res.ok || !j.ok) return false;
        setEvents((prev) => prev.filter((e) => !(e.metadata?.recordType === "task" && e.sourceId === taskId)));
        return true;
      } catch {
        return false;
      }
    },
    [],
  );

  return {
    events,
    filteredEvents,
    loading,
    error,
    filters,
    setFilters,
    reload,
    completeTask,
  };
}
