import { Suspense } from "react";
import type { Metadata } from "next";
import { requireInternalSalesRep } from "@/lib/sales/requireInternalSalesRep";
import CreateProviderWizardClient from "./CreateProviderWizardClient";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Add provider" };

export default async function CreateProviderPage() {
  await requireInternalSalesRep();
  return (
    <Suspense fallback={<p style={{ color: "var(--muted)", padding: 16 }}>Loading…</p>}>
      <CreateProviderWizardClient />
    </Suspense>
  );
}
