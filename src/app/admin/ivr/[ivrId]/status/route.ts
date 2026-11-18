import { urlFromRequest } from "@/lib/http/requestOrigin";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const ALLOWED = new Set(["NEW", "IN_REVIEW", "SUBMITTED", "COMPLETED", "DENIED"]);

export async function POST(
  req: Request,
  { params }: { params: Promise<{ ivrId: string }> | { ivrId: string } }
) {
  const admin = await requireAdmin();
  const actorUserId = (admin as any)?.userId || (admin as any)?.user?.id || "";

  const { ivrId } = await Promise.resolve(params);
  if (!UUID_RE.test(ivrId)) {
    return NextResponse.json({ error: "Invalid ivrId" }, { status: 400 });
  }

  const form = await req.formData();
  const nextStatus = String(form.get("status") || "");
  const note = String(form.get("note") || "").trim();

  if (!ALLOWED.has(nextStatus)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();

  // Get current status for audit
  const { data: cur } = await supabase
    .from("ivr_requests")
    .select("id, status, account_id")
    .eq("id", ivrId)
    .single();

  if (!cur) return NextResponse.json({ error: "IVR not found" }, { status: 404 });

  await supabase
    .from("ivr_requests")
    .update({ status: nextStatus })
    .eq("id", ivrId);

  await supabase.from("ivr_audit_log").insert({
    ivr_request_id: ivrId,
    actor_user_id: actorUserId,
    action: "STATUS_CHANGED",
    metadata: { from: cur.status, to: nextStatus, note: note ? "[present]" : "" },
  });

  // Optional email queue (no PHI): only when entering IN_REVIEW requesting info
  if (nextStatus === "IN_REVIEW" && note) {
    // NOTE: You will tell me where contact email(s) live.
    // For now, this queues nothing unless you add the email extraction in the next step.
    // We'll wire this once you confirm the IVR contact email fields.
  }

  return NextResponse.redirect(urlFromRequest(req, `/admin/ivr/${ivrId}`));
}
