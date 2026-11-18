import { redirect } from "next/navigation";
import { buildEngagementActiveHref } from "@/lib/surgical-sales/engagements/engagementLifecycle";

/** Legacy live mission URL → active engagement workspace. */
export default async function LegacyLiveMissionRedirectPage({
  params,
}: {
  params: Promise<{ engagementId: string }>;
}) {
  const { engagementId } = await params;
  redirect(buildEngagementActiveHref(engagementId));
}
