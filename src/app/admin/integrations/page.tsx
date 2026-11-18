import Link from "next/link";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { CreatePartnerForm, PartnerSummaryTable } from "./IntegrationsAdminClient";

export const dynamic = "force-dynamic";

export default async function AdminIntegrationsPage() {
  await requireAdmin();
  const sb = createSupabaseAdminClient();
  const { data, error } = await sb
    .from("integration_partners")
    .select("id, code, name, environment, status, callback_base_url")
    .order("created_at", { ascending: false })
    .limit(200);
  const jobsResult = error
    ? null
    : await sb
        .from("integration_outbound_jobs")
        .select("id, partner_id, external_order_number, event_type, status, blocked_reason, updated_at")
        .order("updated_at", { ascending: false })
        .limit(40);
  const partnerName = new Map((data ?? []).map((partner) => [partner.id, partner.name]));

  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gap: 16 }}>
      <div>
        <h1 style={{ fontSize: 28, fontWeight: 950, margin: 0 }}>Integrations</h1>
        <p style={{ margin: "8px 0 0", maxWidth: 720 }}>
          Partner organizations, sandbox credentials, account mappings, and fulfillment synchronization.
        </p>
      </div>
      {error ? (
        <div style={{ color: "#b91c1c", fontWeight: 800 }}>
          Integration tables are not available yet. Apply the partner foundation migration, then reload this page.
          <div style={{ fontWeight: 600, marginTop: 8 }}>{error.message}</div>
        </div>
      ) : (
        <>
          <CreatePartnerForm />
          <PartnerSummaryTable partners={data ?? []} />
          {jobsResult && !jobsResult.error ? (
            <section
              style={{
                border: "1px solid rgba(0,0,0,0.10)",
                borderRadius: 16,
                background: "white",
                padding: 16,
                overflowX: "auto",
              }}
            >
              <div style={{ fontWeight: 900, marginBottom: 8 }}>Fulfillment synchronization</div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                <thead>
                  <tr style={{ textAlign: "left" }}>
                    <th style={{ padding: 8 }}>Partner</th>
                    <th style={{ padding: 8 }}>Partner order</th>
                    <th style={{ padding: 8 }}>Event</th>
                    <th style={{ padding: 8 }}>Status</th>
                    <th style={{ padding: 8 }}>Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {(jobsResult.data ?? []).length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ padding: 8, opacity: 0.7 }}>
                        No synchronization jobs.
                      </td>
                    </tr>
                  ) : (
                    (jobsResult.data ?? []).map((job) => (
                      <tr key={job.id} style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}>
                        <td style={{ padding: 8 }}>
                          <Link href={`/admin/integrations/${job.partner_id}`} style={{ fontWeight: 800, color: "var(--brand-700)" }}>
                            {partnerName.get(job.partner_id) || "Partner"}
                          </Link>
                        </td>
                        <td style={{ padding: 8 }}>{job.external_order_number}</td>
                        <td style={{ padding: 8 }}>{job.event_type}</td>
                        <td style={{ padding: 8 }}>{job.status}</td>
                        <td style={{ padding: 8 }}>{job.blocked_reason || "—"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </section>
          ) : null}
        </>
      )}
      <Link href="/admin" style={{ fontWeight: 800, color: "var(--brand-700)", width: "fit-content" }}>
        ← Admin dashboard
      </Link>
    </main>
  );
}
