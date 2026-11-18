import type { Metadata } from "next";
import { Suspense } from "react";
import PortalSalesContactsDirectoryClient from "./PortalSalesContactsDirectoryClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Contacts",
};

export default function PortalSalesContactsPage() {
  return (
    <Suspense fallback={<div style={{ color: "var(--muted)", padding: 16 }}>Loading contacts…</div>}>
      <PortalSalesContactsDirectoryClient />
    </Suspense>
  );
}

