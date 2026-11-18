# PDF Generation & Conversion — 360 Portal

## Summary

| Type | How | Used In | Vercel? |
|------|-----|---------|---------|
| **DOCX → PDF** | CloudConvert / ConvertAPI / LibreOffice | IVR verification submit | ✅ CloudConvert or ConvertAPI |
| **Direct PDF** | pdf-lib, @react-pdf/renderer, pdfkit | Invoices, packing slips, POs, FedEx labels | ✅ All work on Vercel |

**Only one flow** converts DOCX to PDF: **IVR verification submit** (`src/app/admin/ivr/[ivrId]/verification/submit/route.ts`). All other PDFs are generated directly from code.

---

## DOCX → PDF Conversion (IVR Verification)

**File:** `src/lib/ivr/convertDocxToPdf.ts`

**Logic:**
1. If `CLOUDCONVERT_API_KEY` is set → use CloudConvert. On 402 (out of credits) → fall back to ConvertAPI if `CONVERTAPI_SECRET` is set.
2. Else if `CONVERTAPI_SECRET` is set → use ConvertAPI.
3. Else if on Vercel → error (needs one of the above).
4. Else → use LibreOffice (requires `LIBREOFFICE_PATH`).

**Env vars:**

| Variable | Required | Notes |
|----------|----------|-------|
| `CLOUDCONVERT_API_KEY` | Preferred | Primary. Get at https://cloudconvert.com/dashboard/api/v2/keys |
| `CONVERTAPI_SECRET` | Fallback | Used when CloudConvert 402 or as primary if no CloudConvert. Free tier: 250 conversions. https://www.convertapi.com/a/signup |
| `LIBREOFFICE_PATH` | Local only | Path to soffice.exe. Only when neither API key is set (dev/VPS). |

**Recommendation:** Set both `CLOUDCONVERT_API_KEY` and `CONVERTAPI_SECRET` in Vercel so conversion continues when CloudConvert runs out of credits.

---

## Direct PDF Generation (No Conversion)

These generate PDF from code and work on Vercel without external services:

| Feature | Library | File |
|---------|---------|------|
| IVR verification (simple) | pdf-lib | `verification/new/route.ts` |
| Invoices | pdf-lib | `lib/billing/renderInvoicePdf.ts` |
| Packing slips | @react-pdf/renderer | `lib/pdf/PackingSlipPdf.tsx`, `packing-slip/route.ts` |
| Dropship PO | pdfkit | `lib/pdf/generateDropshipPO.ts` |
| Purchase order | pdf-lib | `lib/dropship/renderPurchaseOrderPdf.ts` |
| FedEx label | pdf-lib | `fedex-label/route.ts` |
