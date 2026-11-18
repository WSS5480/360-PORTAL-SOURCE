/** Maps resend API JSON into copy for AdminMessageModal. */
export function inviteResendConfirmationFromApi(j: Record<string, unknown>) {
  const sentTo = typeof j.sentTo === "string" && j.sentTo ? j.sentTo : "the recipient";
  const detail =
    typeof j.detail === "string" && j.detail
      ? j.detail
      : "Message was sent through your configured email provider.";

  return {
    title: "Invite delivered",
    body: `Your recipient should receive the email shortly.\n\nTo\n${sentTo}\n\n${detail}`,
  };
}
