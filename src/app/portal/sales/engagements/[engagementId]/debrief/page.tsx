import DebriefForMeetingPortalClient from "./DebriefForMeetingPortalClient";

export default async function EngagementDebriefPage({
  params,
}: {
  params: Promise<{ engagementId: string }>;
}) {
  const { engagementId } = await params;
  return <DebriefForMeetingPortalClient engagementId={engagementId} />;
}
