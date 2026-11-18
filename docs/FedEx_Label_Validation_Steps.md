# FedEx Shipping Label Validation — Step-by-Step Guide

**Print this document for your records and to complete the FedEx label approval process.**

---

## Overview

FedEx requires you to submit test labels for approval before your production credentials can create shipping labels. The **Rate API** works immediately; the **Ship API** (label creation) is disabled until FedEx approves your labels.

---

## Step 1: Develop and Test in Sandbox

- [ ] You have a FedEx Developer Portal account at [developer.fedex.com](https://developer.fedex.com)
- [ ] You have a project with **Rate** and **Ship** APIs enabled
- [ ] Your app uses **sandbox** credentials:
  - `FEDEX_ENV=sandbox`
  - `FEDEX_CLIENT_ID` and `FEDEX_CLIENT_SECRET` from the sandbox section
  - Test account number from FedEx
- [ ] You have successfully generated **test labels** in your app using the sandbox environment

---

## Step 2: Generate Test Labels

1. In your app, go to a fulfillment that has:
   - Valid delivery address
   - Weight and dimensions entered

2. Click **Create FedEx Label** for each service you plan to use:
   - FedEx Ground
   - FedEx 2Day
   - FedEx 2Day AM
   - FedEx First Overnight
   - FedEx Priority Overnight
   - FedEx Express Saver (3-day)

3. For each label:
   - Open the PDF label
   - **Print** the label on a laser printer (recommended for quality)
   - Do **not** use screenshots or images taken directly from the API

---

## Step 3: Print and Scan Labels (CRITICAL)

1. **Print quality**
   - Use a laser printer if possible
   - Print at normal scale (100%) — no shrinking or enlarging
   - Ensure barcodes are sharp with no streaks, spots, or damage

2. **Scan for submission**
   - Scan each printed label at **minimum 600 DPI**
   - Save as PDF or high-quality image

3. **Avoid common rejection reasons**
   - Lines through the barcode
   - Spots or smudges in the ink
   - Physical damage to the label
   - Scaling (enlargement/shrinkage) that distorts the barcode

---

## Step 4: Move Project to Production (FedEx Portal)

1. Go to [developer.fedex.com](https://developer.fedex.com)
2. Open your project
3. Start the **validation process** to move the project to production
4. You will receive your **Production API Key** and **Secret Key**
   - **Important:** You only see the Secret Key once — save it securely
   - You can regenerate it later if needed
5. Add a **Production account** to your organization
6. Assign the production account to your project
7. Subscribe to **Rate** and **Ship** APIs for the production project
8. Note your **Production Client ID** — you will need it for the cover sheet

---

## Step 5: Fill Out the Label Cover Sheet

1. Download the **Label Cover Sheet** from: [API-WebServices-combined-Coversheet.pdf](https://developer.fedex.com/api/content/dam/fedex-com/irc/common/API-WebServices-combined-Coversheet.pdf)
2. Print it (or add text in a PDF editor), then fill out each line below.

### Line-by-Line Instructions

| Field | What to enter | Notes |
|-------|---------------|-------|
| **FedEx 9-Digit Production Account Number** | Your production FedEx account (e.g. `123456789`) | From FedEx when you add a production account to your project. Not your sandbox/test account. |
| **Production Key** | Your production API Client ID | From FedEx Developer Portal → your project → Production credentials. |
| **Production Meter (SOAP WS only)** | Leave blank | You are using REST APIs, not SOAP. |
| **Are you using a Third-Party Solution?** | Check **No** (unless you use ShipStation, ShipEasy, etc.) | “Third-party” = a shipping software vendor, not your own app. |
| **Third-Party Solution Name** | Leave blank | Skip if you answered No above. |
| **Company Name** | `TGC MEDICAL` or `360 Medical` | Legal/operating name on your FedEx account. |
| **Company Contact Name** | Your name or primary contact | Person FedEx can reach with questions. |
| **Email Address** | Contact email for FedEx | Where they will send approval/rejection. |
| **Printer Model(s) to be Utilized** | `HP LaserJet P3015` | Match the printer you will use for production labels. |
| **How Many of Each Printer Model** | `1` (or your actual count) | Number of that printer model in use. |
| **Label Image Type** | Check **PDF** | You use PDF for laser printing. (ZPL/DPL/EPL = thermal; PNG = alternate laser option.) |
| **Services Requested** | Check: **Express**, **Ground** | Check only the services you will actually use. Ground Economy (SmartPost) if applicable. |

Your app currently supports these FedEx services (from `shippingPriorityMap`): FedEx Ground, FedEx 2Day, FedEx 2Day AM, FedEx First Overnight, FedEx Priority Overnight, FedEx Express Saver. Check **Express** and **Ground** to cover all of them.

---

## Step 6: Submit Labels to FedEx

**Option A: Email**
- Email the scanned labels + Label Cover Sheet to: **label@fedex.com**
- Ensure attachments are high quality (600 DPI scans)
- Pay attention to file size (compress if needed but keep quality)

**Option B: Physical mail**
- FedEx Services  
  WTC-Business Solutions Testing  
  10 FedEx Parkway  
  2nd Floor Horizontal  
  Collierville, TN 38017  

**Timeline:** FedEx Bar Code Analysis group typically needs **3 business days** for evaluation.

---

## Step 7: Wait for Approval

- FedEx will contact you with approval or rejection
- If **approved:** They will authorize your production credentials for Ship API
- If **rejected:** Correct the issues they specify and resubmit

---

## Step 8: Switch to Production in Your App

After FedEx approves:

1. Update your `.env.local`:
   ```
   FEDEX_ENV=production
   FEDEX_CLIENT_ID=<your production client ID>
   FEDEX_CLIENT_SECRET=<your production secret>
   FEDEX_ACCOUNT_NUMBER=<your production account number>
   ```

2. Restart your app

3. Test label creation in production

---

## Checklist Summary

| Step | Action | Done |
|------|--------|------|
| 1 | Test in sandbox with Rate + Ship APIs | ☐ |
| 2 | Generate test labels for each service | ☐ |
| 3 | Print labels, scan at 600 DPI | ☐ |
| 4 | Move project to production (FedEx Portal) | ☐ |
| 5 | Fill out Label Cover Sheet | ☐ |
| 6 | Email/mail labels to FedEx | ☐ |
| 7 | Receive approval from FedEx | ☐ |
| 8 | Update app to production credentials | ☐ |

---

## Special Cases (from FedEx)

- **C.O.D. (Collect on Delivery):** Include both the C.O.D. label and the C.O.D. Return label
- **International Express:** Include the auxiliary/secondary Air Waybill (AWB) label
- **Multi-piece shipments:** Include one label per package
- **Thermal printers:** Request ZPLII for Zebra; PNG/PDF are for laser printing

---

## Support

- FedEx Developer Portal: [developer.fedex.com](https://developer.fedex.com)
- Label submission email: **label@fedex.com**

---

*Document generated for 360 Medical portal. Update as needed for your specific FedEx project.*
