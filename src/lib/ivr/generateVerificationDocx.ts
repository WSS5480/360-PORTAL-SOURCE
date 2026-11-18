// src/lib/ivr/generateVerificationDocx.ts
import fs from "node:fs";
import path from "node:path";
import {
  AlignmentType,
  BorderStyle,
  Document,
  ImageRun,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} from "docx";

type InsuranceBlock = {
  name: string;
  results: string;
  deductible: string;
  deductible_met: string;
  oop: string;
  oop_met: string;
  copay: string;
  coinsurance: string;
};

export type VerificationDocData = {
  status: string;
  date: string;

  patient_name: string;
  patient_dob: string;

  provider: string;
  place_of_service: string;

  product: string;
  qcode?: string;
  units_cm2?: string;

  cpt_codes: string;
  facility: string;
  icd10_codes: string;

  primary: InsuranceBlock;
  secondary: InsuranceBlock;

  coverage_summary: string;
};

const DISCLAIMER_TEXT = `IMPORTANT REMINDERS:
It is important to always review paper medical policy for specific documentation criteria that support medical necessity. When the payer is not Medicare Part B, payment rates may vary. Please check your specific contract for payment rates. Payer will not make separate payment when consolidated billing services or Part A stay is active.
HCPCS code for product listed above must be billed as 1 unit for each SQ CM of material used, along with application CPT codes (15271-15278} as appropriate for location and wound size. If there is discarded materials, bill HCPCS product code with -JW modifier as second line item. See local MAC for wastage and JW I JZ modifier use instructions.
This authorization is not a guarantee of payment. Payment is contingent upon eligibility, benefits available at the time the service is rendered, contractual terms, limitations, exclusions, and coordination of benefits, and other terms & conditions set forth in the member's evidence of coverage. The information contained in this form, including attachments, is privileged and confidential & is only for the use of the individual or entities named on this form. If the reader of this form is not the intended recipient or the employee or the agent responsible to deliver to the intended recipient, the reader is hereby notified that any dissemination, distribution, or copying of this communication is strictly prohibited. If this communication has been received in error, the reader shall notify the sender immediately and shall destroy all information received.`;

const BRAND_BLUE_DARK = "1565C0";
const BRAND_BLUE_LIGHT = "E8F1FD";
const GRID_DARK = "2E3A46";
const GRID_LIGHT = "C9D3DD";

function safe(v: any): string {
  const s = (v ?? "").toString().trim();
  return s.length ? s : "—";
}

// Logo path: public/brand/360-logo-black.png (same as invoice/packing-slip PDFs)
const LOGO_PATH = path.join(process.cwd(), "public", "brand", "360-logo-black.png");

function findLogo(): { data: Uint8Array | null; foundAt: string | null } {
  try {
    if (fs.existsSync(LOGO_PATH)) {
      const buf = fs.readFileSync(LOGO_PATH);
      return { data: new Uint8Array(buf), foundAt: LOGO_PATH };
    }
  } catch {}
  return { data: null, foundAt: null };
}

// Read PNG dimensions from buffer (PNG stores width/height at bytes 16–23, big-endian)
function getPngDimensions(buf: Uint8Array): { width: number; height: number } | null {
  if (buf.length < 24) return null;
  const width = (buf[16]! << 24) | (buf[17]! << 16) | (buf[18]! << 8) | buf[19]!;
  const height = (buf[20]! << 24) | (buf[21]! << 16) | (buf[22]! << 8) | buf[23]!;
  return width > 0 && height > 0 ? { width, height } : null;
}

function logoDimensions(data: Uint8Array, maxW: number, maxH: number): { width: number; height: number } {
  const dims = getPngDimensions(data);
  if (!dims) return { width: maxW, height: Math.round(maxH * 0.4) };
  const scale = Math.min(maxW / dims.width, maxH / dims.height);
  return {
    width: Math.round(dims.width * scale),
    height: Math.round(dims.height * scale),
  };
}

function p(
  text: string,
  opts?: {
    bold?: boolean;
    size?: number; // half-points
    color?: string;
    align?: (typeof AlignmentType)[keyof typeof AlignmentType];
    before?: number;
    after?: number;
    line?: number;
  }
) {
  const size = opts?.size ?? 18;
  return new Paragraph({
    alignment: opts?.align ?? AlignmentType.LEFT,
    spacing: {
      before: opts?.before ?? 0,
      after: opts?.after ?? 0,
      line: opts?.line,
    },
    children: [
      new TextRun({
        text,
        bold: !!opts?.bold,
        size,
        color: opts?.color,
      }),
    ],
  });
}

function borderedTable(rows: TableRow[], opts?: { outerColor?: string; innerColor?: string }) {
  const outerColor = opts?.outerColor ?? GRID_DARK;
  const innerColor = opts?.innerColor ?? GRID_LIGHT;

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 10, color: outerColor },
      bottom: { style: BorderStyle.SINGLE, size: 10, color: outerColor },
      left: { style: BorderStyle.SINGLE, size: 10, color: outerColor },
      right: { style: BorderStyle.SINGLE, size: 10, color: outerColor },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 6, color: innerColor },
      insideVertical: { style: BorderStyle.SINGLE, size: 6, color: innerColor },
    },
    rows,
  });
}

function sectionTitleRow(title: string) {
  return new TableRow({
    children: [
      new TableCell({
        columnSpan: 2,
        shading: { fill: BRAND_BLUE_LIGHT },
        margins: { top: 24, bottom: 24, left: 100, right: 100 },
        children: [
          new Paragraph({
            spacing: { before: 0, after: 0 },
            children: [
              new TextRun({
                text: title,
                bold: true,
                size: 18,
                color: BRAND_BLUE_DARK,
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

function valueParas(value: string, size: number) {
  const s = safe(value);
  const lines = s.split(/\n+/g).map((x) => x.trim()).filter(Boolean);
  if (!lines.length) return [p("—", { size })];
  return lines.map((ln, idx) =>
    p(ln, { size, before: idx === 0 ? 0 : 30, after: 0 })
  );
}

function kvCell(label: string, value: string, opts?: { labelSize?: number; valueSize?: number }) {
  const labelSize = opts?.labelSize ?? 12;
  const valueSize = opts?.valueSize ?? 16;

  return new TableCell({
    width: { size: 50, type: WidthType.PERCENTAGE },
    verticalAlign: VerticalAlign.TOP,
    margins: { top: 45, bottom: 45, left: 100, right: 100 },
    children: [
      p(label, { bold: true, size: labelSize, color: BRAND_BLUE_DARK, after: 4 }),
      ...valueParas(value, valueSize),
    ],
  });
}

function keyValueRow(aLabel: string, aVal: string, bLabel: string, bVal: string) {
  return new TableRow({
    children: [kvCell(aLabel, aVal), kvCell(bLabel, bVal)],
  });
}

function singleValueRow(label: string, value: string) {
  return new TableRow({
    children: [
      new TableCell({
        columnSpan: 2,
        verticalAlign: VerticalAlign.TOP,
        margins: { top: 45, bottom: 45, left: 100, right: 100 },
        children: [
          p(label, { bold: true, size: 12, color: BRAND_BLUE_DARK, after: 4 }),
          ...valueParas(value, 16),
        ],
      }),
    ],
  });
}

function insuranceTable(title: string, block: InsuranceBlock) {
  return borderedTable(
    [
      sectionTitleRow(title),
      keyValueRow("INSURANCE NAME", block.name, "RESULTS", block.results),
      keyValueRow("DEDUCTIBLE", block.deductible, "DEDUCTIBLE MET", block.deductible_met),
      keyValueRow("OUT-OF-POCKET", block.oop, "OUT-OF-POCKET MET", block.oop_met),
      keyValueRow("CO-PAY", block.copay, "CO-INSURANCE", block.coinsurance),
    ],
    { outerColor: BRAND_BLUE_DARK, innerColor: GRID_LIGHT }
  );
}

function headerBlock() {
  const logo = findLogo();
  const dims = logo.data ? logoDimensions(logo.data, 440, 140) : null;

  const logoPara = logo.data && dims
    ? new Paragraph({
        spacing: { before: 0, after: 0 },
        children: [
          new ImageRun({
            type: "png",
            data: logo.data,
            transformation: { width: dims.width, height: dims.height },
          }),
        ],
      })
    : new Paragraph({
        spacing: { before: 0, after: 0 },
        children: [
          new TextRun({ text: "360 MEDICAL", bold: true, size: 22, color: BRAND_BLUE_DARK }),
          new TextRun({ text: "\n(logo missing)", size: 14, color: "666666" }),
        ],
      });

  const right1 = new Paragraph({
    alignment: AlignmentType.RIGHT,
    spacing: { before: 0, after: 20 },
    children: [new TextRun({ text: "PATIENT INSURANCE VERIFICATION RESULTS", bold: true, size: 20, color: BRAND_BLUE_DARK })],
  });

  const right2 = new Paragraph({
    alignment: AlignmentType.RIGHT,
    spacing: { before: 0, after: 0 },
    children: [new TextRun({ text: "FAX: +1 (956) 848-6018   EMAIL: IVR@360MEDICAL.NET", size: 12, color: "3A3A3A" })],
  });

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      insideVertical: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 40, type: WidthType.PERCENTAGE },
            verticalAlign: VerticalAlign.TOP,
            margins: { top: 0, bottom: 0, left: 0, right: 0 },
            children: [logoPara],
          }),
          new TableCell({
            width: { size: 60, type: WidthType.PERCENTAGE },
            verticalAlign: VerticalAlign.TOP,
            margins: { top: 0, bottom: 0, left: 0, right: 0 },
            children: [right1, right2],
          }),
        ],
      }),
    ],
  });
}

function splitIntoParas(text: string): string[] {
  const raw = (text || "").trim();
  if (!raw) return [];
  // split on blank line blocks
  const parts = raw.split(/\n\s*\n+/g).map((s) => s.trim()).filter(Boolean);
  // keep all paragraphs, but cap to prevent accidental multi-page dumps
  return parts.slice(0, 12);
}

function chooseCoverageFontSize(paras: string[]) {
  const joined = paras.join("\n\n");
  const chars = joined.length;
  // half-points: 16=8pt, 14=7pt, 12=6pt
  if (paras.length >= 7 || chars > 1400) return 12;
  if (paras.length >= 5 || chars > 1000) return 14;
  return 16;
}

function chooseDisclaimerFontSize(coverageParas: string[]) {
  // if coverage is heavy, shrink disclaimer a bit more
  if (coverageParas.length >= 6) return 9;
  return 10;
}

export async function generateVerificationDocx(data: VerificationDocData): Promise<Buffer> {
  const coverageParas = splitIntoParas(data.coverage_summary);
  const coverageFont = chooseCoverageFontSize(coverageParas);
  const disclaimerFont = chooseDisclaimerFontSize(coverageParas);

  const disclaimerLines = DISCLAIMER_TEXT.split("\n").map((s) => s.trim()).filter(Boolean);
  const disclaimerTitle = disclaimerLines[0] || "IMPORTANT REMINDERS:";
  const disclaimerBody = disclaimerLines.slice(1).join(" ");

  const productLine = `${safe(data.product)}${data.qcode ? ` (${safe(data.qcode)})` : ""}`;

  const doc = new Document({
    sections: [
      {
        properties: {
          // minimal top/left so logo sits at very top-left; keep right/bottom for print
          page: { margin: { top: 100, right: 600, bottom: 580, left: 100 } },
        },
        children: [
          headerBlock(),
          new Paragraph({ spacing: { before: 0, after: 20 }, children: [] }),

          borderedTable(
            [
              sectionTitleRow("PATIENT / REQUEST SUMMARY"),
              keyValueRow("PATIENT NAME", safe(data.patient_name), "DATE OF BIRTH", safe(data.patient_dob)),
              keyValueRow("STATUS", safe(data.status), "DATE", safe(data.date)),
              keyValueRow("PROVIDER", safe(data.provider), "PLACE OF SERVICE", safe(data.place_of_service)),
              keyValueRow("PRODUCT", productLine, "HCPCS Q CODE", safe(data.qcode)),

              // ✅ Layout fix: Units and CPT codes NOT on same line (separate rows)
              singleValueRow("UNITS (SQ CM)", safe(data.units_cm2)),
              singleValueRow("CPT CODES", safe(data.cpt_codes)),

              // ✅ Layout fix: Facility and ICD-10 NOT on same line (separate rows)
              singleValueRow("FACILITY", safe(data.facility)),
              singleValueRow("ICD-10 DIAGNOSIS CODES", safe(data.icd10_codes)),
            ],
            { outerColor: BRAND_BLUE_DARK, innerColor: GRID_LIGHT }
          ),

          new Paragraph({ spacing: { before: 0, after: 70 }, children: [] }),
          insuranceTable("PRIMARY INSURANCE", data.primary),

          new Paragraph({ spacing: { before: 0, after: 70 }, children: [] }),
          insuranceTable("SECONDARY INSURANCE", data.secondary),

          new Paragraph({ spacing: { before: 0, after: 60 }, children: [] }),

          borderedTable(
            [
              sectionTitleRow("COVERAGE SUMMARY RESULTS"),
              new TableRow({
                children: [
                  new TableCell({
                    columnSpan: 2,
                    margins: { top: 90, bottom: 90, left: 120, right: 120 },
                    children:
                      coverageParas.length > 0
                        ? coverageParas.map((para, idx) =>
                            new Paragraph({
                              spacing: {
                                before: idx === 0 ? 0 : 40,
                                after: 0,
                                line: 250, // tight but readable
                              },
                              children: [new TextRun({ text: para, size: coverageFont })],
                            })
                          )
                        : [p("—", { size: coverageFont })],
                  }),
                ],
              }),
            ],
            { outerColor: BRAND_BLUE_DARK, innerColor: GRID_LIGHT }
          ),

          new Paragraph({ spacing: { before: 0, after: 55 }, children: [] }),
          new Paragraph({
            spacing: { before: 0, after: 18 },
            children: [new TextRun({ text: disclaimerTitle, bold: true, size: 12, color: BRAND_BLUE_DARK })],
          }),
          new Paragraph({
            spacing: { before: 0, after: 0, line: 240 },
            children: [new TextRun({ text: disclaimerBody, size: disclaimerFont, color: "3A3A3A" })],
          }),
        ],
      },
    ],
  });

  return await Packer.toBuffer(doc);
}
