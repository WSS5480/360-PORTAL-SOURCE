import { Suspense } from "react";
import SalesTeamActivityClient from "./SalesTeamActivityClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Activity · Sales Command",
  description: "Team activity across every sales rep — notes, cases, uploads, and organization updates.",
};

export default function SalesTeamActivityPage() {
  return (
    <Suspense fallback={<div style={{ padding: 24, color: "var(--muted)", fontWeight: 700 }}>Loading activity…</div>}>
      <SalesTeamActivityClient />
    </Suspense>
  );
}
