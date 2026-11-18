import { supabaseServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function DebugSessionPage() {
  if (process.env.NODE_ENV !== "development") {
    redirect("/");
  }
  const supabase = await supabaseServer();
  const { data, error } = await supabase.auth.getUser();

  return (
    <main style={{ padding: 24 }}>
      <h1 style={{ fontSize: 22, fontWeight: 800 }}>Session Debug</h1>

      {error ? (
        <pre style={{ color: "crimson", marginTop: 12 }}>{error.message}</pre>
      ) : null}

      <div style={{ marginTop: 12, display: "grid", gap: 6 }}>
        <div>
          <b>Logged in:</b> {data.user ? "YES" : "NO"}
        </div>
        <div>
          <b>Email:</b> {data.user?.email || "—"}
        </div>
        <div>
          <b>User ID:</b> <code>{data.user?.id || "—"}</code>
        </div>
      </div>

      <p style={{ marginTop: 16, opacity: 0.8 }}>
        If Logged in is NO after signing in, the server cannot see your session cookies yet.
      </p>
    </main>
  );
}
