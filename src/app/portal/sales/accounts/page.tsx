import type { Metadata } from "next";
import SurgicalCrmAccountsPortalClient from "./SurgicalCrmAccountsPortalClient";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Organizations",
};

export default function PortalSurgicalCrmAccountsPage() {
  return <SurgicalCrmAccountsPortalClient />;
}
