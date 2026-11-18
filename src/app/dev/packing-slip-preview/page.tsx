import { notFound } from "next/navigation";
import fs from "fs";
import path from "path";

export default function PackingSlipPreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();

  const pngPath = path.join(process.cwd(), "public", "brand", "360-logo-black.png");
  const hasLogo = fs.existsSync(pngPath);

  return (
    <div style={{ minHeight: "100vh", background: "#2a2a2a", padding: 16 }}>
      <p style={{ color: "#eee", fontFamily: "system-ui", fontSize: 13, marginBottom: 8 }}>
        Dev-only packing slip preview (4×6). Logo file present: {hasLogo ? "yes (360-logo-black.png)" : "no"}
      </p>
      <p style={{ color: "#aaa", fontFamily: "system-ui", fontSize: 12, marginBottom: 8 }}>
        PDF source:{" "}
        <a href="/api/dev/packing-slip-preview" target="_blank" rel="noreferrer" style={{ color: "#8ab4ff" }}>
          /api/dev/packing-slip-preview
        </a>{" "}
        (open in a new tab if the embed does not load)
      </p>
      <embed
        src="/api/dev/packing-slip-preview"
        type="application/pdf"
        width="100%"
        height={880}
        title="Packing slip preview"
        style={{ display: "block", background: "#fff", maxWidth: 520 }}
      />
    </div>
  );
}
