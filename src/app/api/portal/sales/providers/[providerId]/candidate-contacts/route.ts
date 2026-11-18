import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { userIsInternalSalesRep } from "@/lib/sales/requireInternalSalesRep";
import { repCanAccessContact } from "@/lib/surgical-sales/contactManagement";
import { isProviderRole } from "@/lib/surgical-sales/providerRoles";
import { candidateContactsFromProposedList } from "@/lib/surgical-sales/candidateContactIntelligence";
import {
  contactsApprovedForCandidateStorage,
  type DebriefProposedContactItem,
} from "@/lib/surgical-sales/debriefDetectedContact";
import {
  mergeProviderCommercialIntelligence,
  parseProviderCommercialIntelligence,
  PROVIDER_COMMERCIAL_INTELLIGENCE_DB_KEY,
} from "@/lib/surgical-sales/providerCommercialIntelligenceModel";
import { emptyProviderCommercialIntelligence } from "@/lib/surgical-sales/providerCommercialIntelligenceModel";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const PostSchema = z
  .object({
    contacts: z.array(z.record(z.string(), z.unknown())).max(24),
    source_engagement_id: z.string().uuid().optional().nullable(),
  })
  .strict();

async function requireRep() {
  const supabase = await supabaseServer();
  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth.user) return { ok: false as const, status: 401, error: "Unauthorized" };
  const uid = auth.user.id;
  const rep = await userIsInternalSalesRep(uid);
  if (!rep) return { ok: false as const, status: 403, error: "Forbidden" };
  return { ok: true as const, uid };
}

export async function POST(req: Request, ctx: { params: Promise<{ providerId: string }> }) {
  const gate = await requireRep();
  if (!gate.ok) return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });

  const { providerId } = await ctx.params;
  if (!UUID_RE.test(providerId)) {
    return NextResponse.json({ ok: false, error: "Invalid provider id" }, { status: 400 });
  }

  const raw = await req.json().catch(() => null);
  const parsed = PostSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
  }

  const { data: existing, error: loadErr } = await supabaseAdmin
    .from("surgical_sales_contacts")
    .select("*")
    .eq("id", providerId)
    .maybeSingle();
  if (loadErr || !existing) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }
  if (!isProviderRole(String((existing as { role_type?: string }).role_type || ""))) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }
  if (!(await repCanAccessContact(gate.uid, existing as never))) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  const proposed = contactsApprovedForCandidateStorage(
    parsed.data.contacts as DebriefProposedContactItem[],
  );
  const incomingCandidates = candidateContactsFromProposedList(proposed, {
    sourceEngagementId: parsed.data.source_engagement_id,
  });
  if (incomingCandidates.length === 0) {
    return NextResponse.json({ ok: true, saved: 0 });
  }

  const currentIntel =
    parseProviderCommercialIntelligence(existing as Record<string, unknown>) ??
    emptyProviderCommercialIntelligence();
  const merged = mergeProviderCommercialIntelligence(currentIntel, {
    ...emptyProviderCommercialIntelligence(),
    candidate_contacts: incomingCandidates,
    updated_at: new Date().toISOString(),
  });

  const { error: upErr } = await supabaseAdmin
    .from("surgical_sales_contacts")
    .update({
      updated_at: new Date().toISOString(),
      [PROVIDER_COMMERCIAL_INTELLIGENCE_DB_KEY]: merged,
    })
    .eq("id", providerId);
  if (upErr) {
    return NextResponse.json({ ok: false, error: upErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, saved: incomingCandidates.length });
}

const PatchSchema = z
  .object({
    candidate_id: z.string().min(1),
    action: z.enum(["dismiss", "confirm"]),
    linked_contact_id: z.string().uuid().optional().nullable(),
  })
  .strict();

export async function PATCH(req: Request, ctx: { params: Promise<{ providerId: string }> }) {
  const gate = await requireRep();
  if (!gate.ok) return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });

  const { providerId } = await ctx.params;
  if (!UUID_RE.test(providerId)) {
    return NextResponse.json({ ok: false, error: "Invalid provider id" }, { status: 400 });
  }

  const raw = await req.json().catch(() => null);
  const parsed = PatchSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
  }

  const { data: existing, error: loadErr } = await supabaseAdmin
    .from("surgical_sales_contacts")
    .select("*")
    .eq("id", providerId)
    .maybeSingle();
  if (loadErr || !existing) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }
  if (!isProviderRole(String((existing as { role_type?: string }).role_type || ""))) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }
  if (!(await repCanAccessContact(gate.uid, existing as never))) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  const currentIntel =
    parseProviderCommercialIntelligence(existing as Record<string, unknown>) ??
    emptyProviderCommercialIntelligence();
  const candidateId = parsed.data.candidate_id.trim();
  const nextCandidates = currentIntel.candidate_contacts.map((row) =>
    row.id === candidateId
      ? parsed.data.action === "confirm"
        ? {
            ...row,
            status: "confirmed" as const,
            lifecycle: "confirmed" as const,
            linked_contact_id: parsed.data.linked_contact_id?.trim() || row.linked_contact_id,
          }
        : { ...row, status: "dismissed" as const }
      : row,
  );
  if (!nextCandidates.some((row) => row.id === candidateId)) {
    return NextResponse.json({ ok: false, error: "Candidate not found" }, { status: 404 });
  }

  const merged = mergeProviderCommercialIntelligence(currentIntel, {
    ...emptyProviderCommercialIntelligence(),
    candidate_contacts: nextCandidates,
    updated_at: new Date().toISOString(),
  });

  const { error: upErr } = await supabaseAdmin
    .from("surgical_sales_contacts")
    .update({
      updated_at: new Date().toISOString(),
      [PROVIDER_COMMERCIAL_INTELLIGENCE_DB_KEY]: merged,
    })
    .eq("id", providerId);
  if (upErr) {
    return NextResponse.json({ ok: false, error: upErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
