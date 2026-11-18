import Link from "next/link";
import { requireAdminOrStaff } from "@/lib/admin/requireAdminOrStaff";

export const dynamic = "force-dynamic";

function inputStyle(): React.CSSProperties {
  return {
    width: "100%",
    padding: "10px 10px",
    borderRadius: 8,
    border: "1px solid rgba(0,0,0,0.2)",
    fontSize: 14,
  };
}

function labelStyle(): React.CSSProperties {
  return { fontSize: 12, fontWeight: 900, opacity: 0.8, marginBottom: 6 };
}

export default async function AdminOrdersNewAccountPage() {
  await requireAdminOrStaff();

  return (
    <div style={{ padding: 16 }}>
      <h1 style={{ fontSize: 22, fontWeight: 900 }}>Create Account</h1>
      <p style={{ marginTop: 6, opacity: 0.8, fontSize: 13 }}>
        Create a new customer account. You’ll be redirected back to Order Intake with it selected.
      </p>

      <form method="post" action="/admin/orders/intake/new-account/submit" style={{ marginTop: 14 }}>
        <div style={{ maxWidth: 640 }}>
          <div style={labelStyle()}>Account Name</div>
          <input name="name" style={inputStyle()} required />

          <div style={{ marginTop: 10 }}>
            <div style={labelStyle()}>Billing Email (optional)</div>
            <input name="billing_email" style={inputStyle()} />
          </div>

          <div style={{ marginTop: 10 }}>
            <div style={labelStyle()}>Discount percent (default 40)</div>
            <input name="discount_percent" defaultValue="40" inputMode="decimal" style={inputStyle()} />
          </div>

          <div style={{ marginTop: 10 }}>
            <div style={labelStyle()}>Payment terms (days after delivery)</div>
            <input name="payment_terms_days" defaultValue="30" inputMode="numeric" style={inputStyle()} />
          </div>

          <button
            type="submit"
            style={{
              marginTop: 14,
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid rgba(0,0,0,0.2)",
              background: "#111",
              color: "white",
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            Create Account
          </button>

          <div style={{ marginTop: 12 }}>
            <Link href="/admin/orders/intake">← Back to Intake</Link>
          </div>
        </div>
      </form>
    </div>
  );
}
