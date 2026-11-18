import { redirect } from "next/navigation";
import { buildEngagementActiveHref } from "@/lib/surgical-sales/engagements/engagementLifecycle";

/** Legacy call URL → active engagement workspace. */
export default async function LegacyEngagementCallRedirectPage({
  params,
}: {
  params: Promise<{ engagementId: string }>;
}) {
  const { engagementId } = await params;
  redirect(buildEngagementActiveHref(engagementId));
}
