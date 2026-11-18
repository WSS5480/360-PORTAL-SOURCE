import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import fs from "fs";
import path from "path";
import PackingSlipPdf from "@/lib/pdf/PackingSlipPdf";
import { getPackingSlipPreviewProps } from "@/lib/pdf/packingSlipPreviewSample";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function loadLogoDataUri(): string | null {
  const pngPath = path.join(process.cwd(), "public", "brand", "360-logo-black.png");
  try {
    const buf = fs.readFileSync(pngPath);
    return `data:image/png;base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

/** Dev-only: same PDF bytes as the admin packing-slip generator, with fixed sample data. */
export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const logoDataUri = loadLogoDataUri();
  let buffer: Buffer;
  try {
    buffer = await renderToBuffer(PackingSlipPdf(getPackingSlipPreviewProps(logoDataUri)));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[packing-slip-preview] renderToBuffer failed:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return new NextResponse(Buffer.from(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'inline; filename="packing-slip-preview.pdf"',
      "Cache-Control": "no-store",
    },
  });
}
