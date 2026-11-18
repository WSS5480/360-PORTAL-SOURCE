import SalesExecutionLeaderboardClient from "@/components/sales/SalesExecutionLeaderboardClient";
import { requireInternalSalesRep } from "@/lib/sales/requireInternalSalesRep";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Leaderboard · Sales Command",
  description: "Sales execution leaderboard — field work, intelligence, pipeline, and case follow-through.",
};

export default async function SalesLeaderboardPage() {
  const { user } = await requireInternalSalesRep();

  return (
    <Suspense fallback={<div style={{ padding: 24, fontWeight: 700, color: "var(--muted)" }}>Loading leaderboard…</div>}>
      <SalesExecutionLeaderboardClient previewUserId={user.id} />
    </Suspense>
  );
}
