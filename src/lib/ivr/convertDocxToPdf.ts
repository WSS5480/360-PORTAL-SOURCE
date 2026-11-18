import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

const CLOUDCONVERT_SYNC_URL = "https://sync.api.cloudconvert.com/v2/jobs";
const CONVERTAPI_URL = "https://v2.convertapi.com/convert/docx/to/pdf";

/**
 * Convert DOCX to PDF using ConvertAPI (fallback when CloudConvert has no credits).
 * Requires CONVERTAPI_SECRET in env. Free tier: 250 conversions.
 */
async function convertViaConvertAPI(docxBuffer: Buffer): Promise<Buffer> {
  const secret = (process.env.CONVERTAPI_SECRET || "").trim();
  if (!secret) {
    throw new Error("CONVERTAPI_SECRET is not set. Get a free key at https://www.convertapi.com/a/signup");
  }

  const base64 = docxBuffer.toString("base64");
  const res = await fetch(`${CONVERTAPI_URL}?Secret=${secret}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      Parameters: [
        {
          Name: "File",
          FileValue: {
            Name: "verification.docx",
            Data: base64,
          },
        },
      ],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`ConvertAPI (${res.status}): ${errText || res.statusText}`);
  }

  const json = (await res.json()) as {
    Files?: Array<{ FileData?: string }>;
  };
  const fileData = json?.Files?.[0]?.FileData;
  if (!fileData) {
    throw new Error("ConvertAPI did not return PDF data");
  }
  return Buffer.from(fileData, "base64");
}

/**
 * Convert DOCX to PDF using CloudConvert API.
 * Works on Vercel and other serverless platforms (no LibreOffice required).
 * Requires CLOUDCONVERT_API_KEY in env.
 */
async function convertViaCloudConvert(docxBuffer: Buffer): Promise<Buffer> {
  const apiKey = (process.env.CLOUDCONVERT_API_KEY || "").trim();
  if (!apiKey) {
    throw new Error(
      "CLOUDCONVERT_API_KEY is not set. Get a free API key at https://cloudconvert.com/dashboard/api/v2/keys"
    );
  }

  const base64 = docxBuffer.toString("base64");

  const res = await fetch(CLOUDCONVERT_SYNC_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      tasks: {
        "import-docx": {
          operation: "import/base64",
          file: base64,
          filename: "verification.docx",
        },
        "convert-to-pdf": {
          operation: "convert",
          input: "import-docx",
          input_format: "docx",
          output_format: "pdf",
        },
        "export-pdf": {
          operation: "export/url",
          input: "convert-to-pdf",
        },
      },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    let errMsg = errText || res.statusText;
    try {
      const errJson = JSON.parse(errText);
      errMsg = errJson?.message || errJson?.error || errMsg;
    } catch {}
    throw new Error(`CloudConvert API (${res.status}): ${errMsg}`);
  }

  const job = (await res.json()) as {
    data?: {
      status?: string;
      tasks?: Array<{
        operation?: string;
        status?: string;
        message?: string;
        code?: string;
        result?: { files?: Array<{ url?: string }> };
      }>;
    };
  };

  const status = job?.data?.status;
  if (status === "error") {
    const errTask = job.data?.tasks?.find((t) => t.status === "error");
    const msg = (errTask as any)?.message || (errTask as any)?.code || "Conversion failed";
    throw new Error(`CloudConvert: ${msg}`);
  }

  const exportTask = job?.data?.tasks?.find((t) => t.operation === "export/url");
  const url = exportTask?.result?.files?.[0]?.url;
  if (!url) {
    const errTask = job.data?.tasks?.find((t) => t.status === "error");
    const hint = errTask ? ` (${(errTask as any)?.message || "check task"})` : "";
    throw new Error(`CloudConvert did not return PDF URL${hint}`);
  }

  const pdfRes = await fetch(url);
  if (!pdfRes.ok) {
    throw new Error(`Failed to download PDF from CloudConvert: ${pdfRes.status}`);
  }

  const pdfArrayBuffer = await pdfRes.arrayBuffer();
  return Buffer.from(pdfArrayBuffer);
}

function getLibreOfficePath(): string {
  const p = (process.env.LIBREOFFICE_PATH || "").trim();
  if (!p) {
    throw new Error(
      'LIBREOFFICE_PATH is not set. Example: LIBREOFFICE_PATH="C:\\Program Files\\LibreOffice\\program\\soffice.exe"'
    );
  }
  return p;
}

async function fileExists(p: string) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

/**
 * Convert DOCX to PDF using LibreOffice (local only).
 */
async function convertViaLibreOffice(docxBuffer: Buffer): Promise<Buffer> {
  const soffice = getLibreOfficePath();

  if (!(await fileExists(soffice))) {
    throw new Error(`LIBREOFFICE_PATH does not exist: ${soffice}`);
  }

  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "ivr-lo-"));
  const inPath = path.join(tmpDir, "in.docx");
  const outDir = tmpDir;
  const outPath = path.join(outDir, "in.pdf");

  try {
    await fs.writeFile(inPath, docxBuffer);

    await new Promise<void>((resolve, reject) => {
      const args = [
        "--headless",
        "--nologo",
        "--nolockcheck",
        "--nodefault",
        "--nofirststartwizard",
        "--invisible",
        "--convert-to",
        "pdf",
        "--outdir",
        outDir,
        inPath,
      ];

      const child = spawn(soffice, args, { windowsHide: true });

      let stderr = "";
      child.stderr.on("data", (d) => (stderr += String(d)));

      child.on("error", (err) => reject(err));
      child.on("close", (code) => {
        if (code !== 0) {
          return reject(new Error(`LibreOffice conversion failed (code ${code}). ${stderr}`));
        }
        resolve();
      });
    });

    return await fs.readFile(outPath);
  } finally {
    try {
      const files = await fs.readdir(tmpDir);
      await Promise.all(
        files.map(async (f) => {
          try {
            await fs.unlink(path.join(tmpDir, f));
          } catch {}
        })
      );
      await fs.rmdir(tmpDir);
    } catch {}
  }
}

/**
 * Convert DOCX buffer to PDF.
 * - If CLOUDCONVERT_API_KEY is set: uses CloudConvert API (works on Vercel).
 *   On 402 (out of credits): falls back to ConvertAPI if CONVERTAPI_SECRET is set.
 * - On Vercel: CloudConvert or ConvertAPI only (LibreOffice not available).
 * - Otherwise: uses LibreOffice (requires LIBREOFFICE_PATH, local/VPS only).
 */
export async function convertDocxToPdf(docxBuffer: Buffer): Promise<Buffer> {
  const apiKey = (process.env.CLOUDCONVERT_API_KEY || "").trim();
  const convertApiSecret = (process.env.CONVERTAPI_SECRET || "").trim();
  const isVercel = process.env.VERCEL === "1";

  if (apiKey) {
    try {
      return await convertViaCloudConvert(docxBuffer);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if ((msg.includes("402") || msg.includes("out of conversion credits")) && convertApiSecret) {
        return await convertViaConvertAPI(docxBuffer);
      }
      throw e;
    }
  }
  if (convertApiSecret) {
    return convertViaConvertAPI(docxBuffer);
  }
  if (isVercel) {
    throw new Error(
      "CLOUDCONVERT_API_KEY or CONVERTAPI_SECRET is not set. Add one in Vercel: Settings → Environment Variables, then redeploy."
    );
  }
  return convertViaLibreOffice(docxBuffer);
}
