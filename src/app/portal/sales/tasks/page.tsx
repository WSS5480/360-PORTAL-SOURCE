"use client";

import Link from "next/link";
import React from "react";
import { ScMobileListHeaderRow } from "@/components/sales/ScMobileListHeaderRow";
import { PortalEmptyState } from "@/components/sales/PortalEmptyState";
import { SalesCmdLink, SalesCommandPage, sc } from "@/components/sales/salesCommandUi";
import { userFacingError } from "@/lib/errors/userFacingError";

type Task = {
  id: string;
  opportunity_id: string;
  title: string;
  due_date: string;
  opportunity_account?: string;
};

function dueOverdue(dueDate: string) {
  const today = new Date().toISOString().slice(0, 10);
  return String(dueDate) < today;
}

export default function SalesTasksPage() {
  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [err, setErr] = React.useState<string | null>(null);

  const sortedTasks = React.useMemo(() => {
    const copy = [...tasks];
    copy.sort((a, b) => {
      const ao = dueOverdue(a.due_date) ? 0 : 1;
      const bo = dueOverdue(b.due_date) ? 0 : 1;
      if (ao !== bo) return ao - bo;
      return String(a.due_date).localeCompare(String(b.due_date));
    });
    return copy;
  }, [tasks]);

  const overdueList = sortedTasks.filter((t) => dueOverdue(t.due_date));
  const upcomingList = sortedTasks.filter((t) => !dueOverdue(t.due_date));

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/portal/sales/tasks?status=open&limit=100", { cache: "no-store" });
        const j = await res.json();
        if (cancelled) return;
        if (!j.ok) setErr(userFacingError(j.error, "We could not load your tasks. Please try again."));
        else setTasks(j.tasks || []);
      } catch (e) {
        if (!cancelled) setErr(userFacingError(e, "We could not load your tasks. Please try again."));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function complete(id: string) {
    setErr(null);
    try {
      const res = await fetch(`/api/portal/sales/tasks/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: true }),
      });
      const j = await res.json();
      if (!j.ok) {
        setErr(userFacingError(j.error, "That task could not be marked complete. Please try again."));
        return;
      }
      setTasks((prev) => prev.filter((t) => t.id !== id));
    } catch (e) {
      setErr(userFacingError(e, "That task could not be marked complete. Please try again."));
    }
  }

  const actions = (
    <>
      <SalesCmdLink href="/portal/sales" variant="secondary">
        ← Dashboard
      </SalesCmdLink>
      <SalesCmdLink href="/portal/sales/board" variant="secondary">
        Pipeline board
      </SalesCmdLink>
    </>
  );

  return (
    <SalesCommandPage
      title="My tasks"
      subtitle="Open follow-ups across your opportunities—clear next steps are what separate a tidy CRM from a wish list."
      omitBuiltInHeader
      nativeLayout
      actions={null}
    >
      <div className="sc-native-page surgical-cases-mobile-root">
        <div className="sc-mobile-list-sticky-shell">
          <header className="sc-mobile-list-header">
            <ScMobileListHeaderRow title="My tasks" countLabel={`${tasks.length} open`} actions={actions} />
          </header>
        </div>
        <div className="sc-mobile-list-body">
      {err ? (
        <div role="alert" style={sc.alertError}>
          {err}
        </div>
      ) : null}

      <div style={{ display: "grid", gap: 20 }}>
        {tasks.length === 0 ? (
          <PortalEmptyState
            title="No open tasks"
            description="Create follow-ups on opportunities so your week has clear next steps."
            actions={[
              { href: "/portal/sales/opportunities", label: "Opportunities", variant: "primary" },
              { href: "/portal/sales/board", label: "Pipeline board", variant: "secondary" },
            ]}
          />
        ) : (
          <>
            {overdueList.length > 0 ? (
              <div style={{ display: "grid", gap: 12 }}>
                <div style={{ ...sc.sectionLabel, color: "var(--danger)", marginBottom: 0 }}>Overdue ({overdueList.length})</div>
                {overdueList.map((t) => (
                  <TaskRow key={t.id} t={t} onDone={complete} overdue />
                ))}
              </div>
            ) : null}
            {upcomingList.length > 0 ? (
              <div style={{ display: "grid", gap: 12 }}>
                {overdueList.length > 0 ? (
                  <div style={{ ...sc.sectionLabel, marginBottom: 0 }}>Upcoming ({upcomingList.length})</div>
                ) : null}
                {upcomingList.map((t) => (
                  <TaskRow key={t.id} t={t} onDone={complete} overdue={false} />
                ))}
              </div>
            ) : null}
          </>
        )}
      </div>
      </div>
      </div>
    </SalesCommandPage>
  );
}

function TaskRow({
  t,
  onDone,
  overdue,
}: {
  t: Task;
  onDone: (id: string) => void;
  overdue: boolean;
}) {
  const dueLabel = new Date(t.due_date + "T12:00:00Z").toLocaleDateString();
  return (
    <div
      className="sc-native-task-row"
      style={{
        borderRadius: 0,
        borderTop: overdue
          ? "1px solid color-mix(in srgb, var(--danger) 35%, var(--border))"
          : "1px solid color-mix(in srgb, var(--brand-600) 18%, var(--border))",
        borderRight: overdue
          ? "1px solid color-mix(in srgb, var(--danger) 35%, var(--border))"
          : "1px solid color-mix(in srgb, var(--brand-600) 18%, var(--border))",
        borderBottom: overdue
          ? "1px solid color-mix(in srgb, var(--danger) 35%, var(--border))"
          : "1px solid color-mix(in srgb, var(--brand-600) 18%, var(--border))",
        borderLeft: overdue ? `4px solid var(--danger)` : `4px solid color-mix(in srgb, var(--brand-600) 45%, var(--border))`,
        display: "grid",
        gridTemplateColumns: "1fr auto",
        gap: 14,
        alignItems: "center",
        padding: "16px 18px",
        background: overdue
          ? "linear-gradient(180deg, color-mix(in srgb, var(--danger) 7%, var(--surface)) 0%, var(--surface) 100%)"
          : "linear-gradient(180deg, color-mix(in srgb, var(--brand-600) 4%, var(--surface)) 0%, var(--surface) 100%)",
        boxShadow: "0 1px 0 color-mix(in srgb, var(--foreground) 4%, transparent)",
      }}
    >
      <div style={{ minWidth: 0, display: "grid", gap: 8 }}>
        <div style={{ fontWeight: 850, fontSize: 17, lineHeight: 1.25, letterSpacing: "-0.01em", color: "var(--foreground)" }}>{t.title}</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "4px 8px",
              borderRadius: 999,
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: "0.03em",
              border: overdue
                ? "1px solid color-mix(in srgb, var(--danger) 45%, var(--border))"
                : "1px solid color-mix(in srgb, var(--brand-600) 30%, var(--border))",
              color: overdue ? "var(--danger)" : "var(--brand-700)",
              background: overdue
                ? "color-mix(in srgb, var(--danger) 10%, var(--surface))"
                : "color-mix(in srgb, var(--brand-600) 8%, var(--surface))",
            }}
          >
            Due {dueLabel}
          </span>
          {overdue ? (
            <span style={{ fontSize: 11, fontWeight: 900, color: "var(--danger)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Overdue
            </span>
          ) : null}
          {t.opportunity_account ? <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 650 }}>{t.opportunity_account}</span> : null}
        </div>
        <Link href={`/portal/sales/opportunities/${t.opportunity_id}`} style={{ ...sc.linkBrand, marginTop: 2, display: "inline-block", fontWeight: 800 }}>
          Open opportunity →
        </Link>
      </div>
      <button type="button" onClick={() => onDone(t.id)} style={{ ...sc.btnGhost, fontWeight: 800, background: "var(--surface-2)", alignSelf: "start" }}>
        Mark done
      </button>
    </div>
  );
}
