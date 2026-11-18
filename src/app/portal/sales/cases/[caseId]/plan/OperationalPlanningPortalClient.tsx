"use client";

import NewSurgicalCasePortalClient from "../../new/NewSurgicalCasePortalClient";

export default function OperationalPlanningPortalClient({ caseId }: { caseId: string }) {
  return <NewSurgicalCasePortalClient planningCaseId={caseId} />;
}
