import { requireAdminOrStaff } from "@/lib/admin/requireAdminOrStaff";
import { executeAccountInviteResend } from "@/lib/invites/executeAccountInviteResend";

export const dynamic = "force-dynamic";

export async function POST(req: Request, ctx: { params: Promise<{ accountId: string; inviteId: string }> }) {
  const authCtx = await requireAdminOrStaff();
  const { accountId, inviteId } = await ctx.params;

  return executeAccountInviteResend({
    req,
    accountId,
    inviteId,
    actorUserId: authCtx.user.id,
  });
}
