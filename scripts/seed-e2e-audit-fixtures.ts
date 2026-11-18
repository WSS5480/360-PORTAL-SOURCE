/**
 * Seed the records the mobile-readiness audit needs in order to reach every
 * Sales Command detail page. Without a case and an engagement owned by the
 * audited rep, the case and engagement detail routes have no incoming link and
 * silently drop out of coverage.
 *
 * Run:
 *   npx tsx scripts/seed-e2e-audit-fixtures.ts
 *
 * Re-run safe: rows use fixed IDs and are upserted.
 */
import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const envPath = resolve(process.cwd(), ".env.local");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf-8").split(/\r?\n/)) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (!match) continue;
    const key = match[1]?.trim();
    const value = match[2]?.trim().replace(/^["']|["']$/g, "");
    if (key && !process.env[key]) process.env[key] = value;
  }
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.env.E2E_USER_EMAIL?.trim();
if (!url || !serviceKey || !email) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or E2E_USER_EMAIL in .env.local");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

const FIXTURE = {
  org: "e2e11111-1111-4111-8111-111111110001",
  provider: "e2e11111-1111-4111-8111-111111110002",
  engagement: "e2e11111-1111-4111-8111-111111110003",
  surgicalCase: "e2e11111-1111-4111-8111-111111110004",
  opportunity: "e2e11111-1111-4111-8111-111111110005",
} as const;

function dayOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

async function resolveRepId(): Promise<string> {
  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw error;
  const user = data.users.find((row) => (row.email ?? "").toLowerCase() === email!.toLowerCase());
  if (!user) throw new Error(`E2E user not found: ${email}`);
  return user.id;
}

async function seedOrganization(repId: string) {
  const { error } = await supabase.from("sales_organizations").upsert(
    {
      id: FIXTURE.org,
      name: "Lakeside Surgical Institute",
      surgical_crm_type: "hospital",
      surgical_crm_status: "active",
      surgical_crm_billing_city: "Madison",
      surgical_crm_billing_state: "WI",
      surgical_crm_created_by: repId,
      surgical_crm_updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );
  if (error) throw new Error(`sales_organizations: ${error.message}`);
  console.log("  organization ready");
}

async function seedProvider(repId: string) {
  const now = new Date().toISOString();
  const { error } = await supabase.from("surgical_sales_contacts").upsert(
    {
      id: FIXTURE.provider,
      role_type: "surgeon",
      first_name: "Ellen",
      last_name: "Reyes",
      title: "MD, FACS",
      organization_id: FIXTURE.org,
      account_id: FIXTURE.org,
      influence_level: "decision_maker",
      relationship_strength: "medium",
      provider_crm_status: "active",
      provider_onboarding_status: "active",
      provider_procedure_focus: "Open and laparoscopic ventral hernia repair",
      created_by: repId,
      created_by_user_id: repId,
      updated_at: now,
    },
    { onConflict: "id" },
  );
  if (error) throw new Error(`surgical_sales_contacts: ${error.message}`);

  const { error: linkErr } = await supabase.from("surgical_sales_contact_organizations").upsert(
    {
      contact_id: FIXTURE.provider,
      account_id: FIXTURE.org,
      role_type: "surgeon",
      is_primary_org: true,
      is_active: true,
      specialty: "General Surgery",
      influence_level: "decision_maker",
      created_by: repId,
      updated_at: now,
    },
    { onConflict: "contact_id,account_id" },
  );
  if (linkErr) throw new Error(`surgical_sales_contact_organizations: ${linkErr.message}`);
  console.log("  provider ready");
}

async function seedOpportunity(repId: string) {
  const { error } = await supabase.from("sales_opportunities").upsert(
    {
      id: FIXTURE.opportunity,
      account_id: FIXTURE.org,
      account_name: "Lakeside Surgical Institute",
      physician_name: "Ellen Reyes, MD",
      surgeon_contact_id: FIXTURE.provider,
      owner_user_id: repId,
      stage: "evaluation_planned",
      product_line: "TelaBio",
      procedure_focus: "Ventral hernia repair — reinforcement and fixation",
      adoption_goal: "Complete a five-case evaluation with OR time captured on each case",
      evaluation_needed: true,
      next_action: "Confirm evaluation start date with the OR coordinator",
      value_cents: 7500000,
      close_date: dayOffset(60),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );
  if (error) throw new Error(`sales_opportunities: ${error.message}`);
  console.log("  opportunity ready");
}

async function seedEngagement(repId: string) {
  const scheduled = new Date();
  scheduled.setDate(scheduled.getDate() + 5);
  scheduled.setHours(7, 30, 0, 0);

  const { error } = await supabase.from("surgical_sales_engagements").upsert(
    {
      id: FIXTURE.engagement,
      provider_id: FIXTURE.provider,
      organization_id: FIXTURE.org,
      opportunity_id: FIXTURE.opportunity,
      sales_rep_id: repId,
      engagement_type: "observation_request",
      engagement_category: "observation_discovery",
      status: "planned",
      planning_mode: "plan_first",
      planning_status: "planning_in_progress",
      title: "Ventral hernia observation — fixation review",
      engagement_date: dayOffset(5),
      scheduled_date: dayOffset(5),
      scheduled_at: scheduled.toISOString(),
      observation_goal:
        "Observe two ventral hernia repairs and document the closure method, fixation choice, and total case time.",
      pre_observation_probes:
        "When do you switch from tacks to suture fixation?\nWho builds the hernia tray?",
      pre_observation_value_hypothesis:
        "A lower-profile fixation option fits the existing closure routine without adding case time.",
      pre_observation_planned_close: "Agree on a five-case evaluation and a sample request.",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );
  if (error) throw new Error(`surgical_sales_engagements: ${error.message}`);
  console.log("  engagement ready");
}

async function seedCase(repId: string) {
  const { error } = await supabase.from("surgical_sales_cases").upsert(
    {
      id: FIXTURE.surgicalCase,
      case_number: "",
      account_id: FIXTURE.org,
      surgeon_contact_id: FIXTURE.provider,
      sales_rep_id: repId,
      engagement_id: FIXTURE.engagement,
      case_date: dayOffset(8),
      case_time: "07:30",
      procedure_type: "Laparoscopic ventral hernia repair",
      case_type: "product_support",
      status: "scheduled",
      expected_revenue: 4200,
      follow_up_needed: false,
      notes: "Bring the standard fixation tray and a sizing guide for the OR team.",
      case_support_coverage: "Rep present for the full case",
      case_product_needs: "Standard fixation tray, two sizing guides",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );
  if (error) throw new Error(`surgical_sales_cases: ${error.message}`);
  console.log("  case ready");
}

async function main() {
  const repId = await resolveRepId();
  console.log(`Seeding audit fixtures for ${email} (${repId})`);

  await seedOrganization(repId);
  await seedProvider(repId);
  await seedOpportunity(repId);
  await seedEngagement(repId);
  await seedCase(repId);

  console.log("\nRoutes now reachable:");
  console.log(`  /portal/sales/cases/${FIXTURE.surgicalCase}`);
  console.log(`  /portal/sales/cases/${FIXTURE.surgicalCase}/plan`);
  console.log(`  /portal/sales/engagements/${FIXTURE.engagement}`);
  console.log(`  /portal/sales/opportunities/${FIXTURE.opportunity}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
