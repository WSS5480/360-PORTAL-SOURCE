# Smoke Test Checklist — Post Supabase Backend Cutover

**Use after switching to a new Supabase backend (e.g. `https://supabase.360medical.net`).**

Replace `{baseUrl}` with your app URL (e.g. `https://portal.360medical.com` or `http://localhost:3000`).

---

## 1. Login

| # | Action | URL / Route | Expected |
|---|--------|-------------|----------|
| 1.1 | Open login page | `{baseUrl}/login` | Login form with email/password |
| 1.2 | Sign in with valid credentials | Submit form on `{baseUrl}/login` | Redirect to `/portal` or `/admin` based on role |
| 1.3 | Sign in with MFA-enabled user | Submit form on `{baseUrl}/login` | MFA challenge screen, then redirect |
| 1.4 | Sign in with invalid credentials | Submit form on `{baseUrl}/login` | Error message, stay on login |

---

## 2. Password Reset

| # | Action | URL / Route | Expected |
|---|--------|-------------|----------|
| 2.1 | Open login, click "Forgot password" | `{baseUrl}/login` → click link | Reset form (email only) |
| 2.2 | Submit email for reset | Submit on `{baseUrl}/login` | Success message; no email enumeration |
| 2.3 | Open reset link from email | Link from Supabase recovery email | Land on `{baseUrl}/reset-password?next=...` with session |
| 2.4 | Set new password | Submit form on `{baseUrl}/reset-password` | Success, redirect to `next` (e.g. `/portal`) |
| 2.5 | Sign in with new password | `{baseUrl}/login` | Successful login |

---

## 3. Invite Acceptance

| # | Action | URL / Route | Expected |
|---|--------|-------------|----------|
| 3.1 | Open invite link (new user) | Link from invite email → `{baseUrl}/invite/accept?invite={inviteId}` | Redirect to `{baseUrl}/set-password?invite={inviteId}&next=/portal` |
| 3.2 | Set password (invite flow) | `{baseUrl}/set-password?invite={inviteId}&next=/portal` | Form visible if session from auth callback |
| 3.3 | Submit password + accept | Submit on `{baseUrl}/set-password` | MFA enroll (if required), then redirect to `/portal` |
| 3.4 | Verify account membership | `{baseUrl}/portal` | Portal shows account from invite |
| 3.5 | Verify role-based access | `{baseUrl}/portal` or `{baseUrl}/admin` | Access matches invited role |

---

## 4. Account Membership Access

| # | Action | URL / Route | Expected |
|---|--------|-------------|----------|
| 4.1 | Portal user with single account | `{baseUrl}/portal` | Dashboard for that account |
| 4.2 | Portal user with multiple accounts | `{baseUrl}/portal` → switch account | Account switcher works; data updates |
| 4.3 | Portal user, no account | `{baseUrl}/portal` | "No account selected" or prompt to select |
| 4.4 | Admin/staff access | `{baseUrl}/admin` | Admin dashboard |
| 4.5 | Portal user, restricted role | `{baseUrl}/portal/orders` | Access allowed or denied per role |
| 4.6 | Select account API | `GET {baseUrl}/api/portal/select-account` (with body/params) | Account selection persists |

---

## 5. IVR Uploads / Downloads

| # | Action | URL / Route | Expected |
|---|--------|-------------|----------|
| 5.1 | Portal: submit new IVR | `{baseUrl}/portal/ivr/new` | Form loads; select account if needed |
| 5.2 | Portal: upload IVR file | Submit form on `{baseUrl}/portal/ivr/new` | File uploads to storage; IVR created |
| 5.3 | Portal: view IVR detail | `{baseUrl}/portal/ivr/{ivrId}` | IVR detail page loads |
| 5.4 | Portal: download IVR file | `{baseUrl}/api/portal/ivr-files/{fileId}/download` | Redirect to signed URL; file downloads |
| 5.5 | Admin: view IVR | `{baseUrl}/admin/ivr/{ivrId}` | IVR detail page loads |
| 5.6 | Admin: download IVR file | `{baseUrl}/admin/ivr/{ivrId}/download/{fileId}` | Redirect to signed URL; file downloads |
| 5.7 | Admin: IVR intake upload | `{baseUrl}/admin/ivr/intake` → submit | File uploads; IVR created |
| 5.8 | Admin: verification PDF | `{baseUrl}/api/admin/ivr/{ivrId}/verification-pdf` | Redirect to signed PDF URL |
| 5.9 | Portal: verification PDF | `{baseUrl}/api/portal/ivr/{ivrId}/verification-pdf` | Redirect to signed PDF URL |

---

## 6. Invoice PDFs

| # | Action | URL / Route | Expected |
|---|--------|-------------|----------|
| 6.1 | Admin: open invoice PDF | `{baseUrl}/api/admin/invoices/{invoiceId}/open` | Redirect to signed URL; PDF opens |
| 6.2 | Admin: invoice PDF URL | `GET {baseUrl}/api/admin/invoices/{invoiceId}/pdf-url` | `{ ok: true, url: "..." }` |
| 6.3 | Admin: generate invoice PDF | `POST {baseUrl}/api/admin/invoices/{invoiceId}/pdf` | PDF generated and stored |
| 6.4 | Portal: invoice PDF URL | `GET {baseUrl}/api/portal/invoices/{invoiceId}/pdf-url` | `{ ok: true, url: "..." }` |
| 6.5 | Portal: view invoice | `{baseUrl}/portal/invoices/{invoiceId}` | Invoice page with "View PDF" or similar |
| 6.6 | Portal: invoice pay (Stripe) | `{baseUrl}/portal/invoices/{invoiceId}/pay` | Stripe flow uses signed PDF URL |

---

## 7. Packing Slips

| # | Action | URL / Route | Expected |
|---|--------|-------------|----------|
| 7.1 | Admin: open inventory packing slip | `{baseUrl}/admin/fulfillments/{fulfillmentId}/packing-slip/open` | Redirect to signed URL; PDF opens |
| 7.2 | Admin: packing slip URL | `GET {baseUrl}/api/admin/fulfillments/{fulfillmentId}/packing-slip/url` | `{ ok: true, url: "..." }` |
| 7.3 | Admin: generate packing slip | `POST {baseUrl}/api/admin/fulfillments/{fulfillmentId}/packing-slip` | PDF generated and stored |
| 7.4 | Admin: dropship packing slip URL | `GET {baseUrl}/api/admin/fulfillments/{fulfillmentId}/dropship/packing-slip/url` | `{ ok: true, url: "..." }` |
| 7.5 | Portal: packing slip download | `GET {baseUrl}/api/portal/fulfillments/{fulfillmentId}/packing-slip` | `{ ok: true, url: "..." }`; open URL to download |
| 7.6 | Portal: orders list → Packing slip | `{baseUrl}/portal/orders` → click "Packing slip" on order | Opens packing slip |

---

## 8. Documents Download

| # | Action | URL / Route | Expected |
|---|--------|-------------|----------|
| 8.1 | Portal: documents page | `{baseUrl}/portal/documents` | Documents list with folders/files |
| 8.2 | Portal: download document file | `{baseUrl}/api/portal/documents/files/{fileId}/download` | Redirect to signed URL; file downloads |
| 8.3 | Portal: external link (YouTube) | `{baseUrl}/portal/documents` → click "Open link" | Opens external URL (no storage) |
| 8.4 | Admin: upload document | `{baseUrl}/admin/documents` → upload | File uploads to `documents-private` |

---

## 9. Auth Callbacks (OAuth / Magic Link)

| # | Action | URL / Route | Expected |
|---|--------|-------------|----------|
| 9.1 | Server callback (PKCE) | `{baseUrl}/auth/callback?code=...` | `exchangeCodeForSession`; redirect to `next` |
| 9.2 | Client callback (PKCE) | `{baseUrl}/auth/client-callback?code=...` | Session set; redirect to `next` |
| 9.3 | Client callback (hash) | `{baseUrl}/auth/client-callback#access_token=...&refresh_token=...` | Session set; redirect to `next` |

---

## 10. Network / Backend Verification

| # | Action | URL / Route | Expected |
|---|--------|-------------|----------|
| 10.1 | DevTools: Network tab | Any request | No requests to `*.supabase.co` (old hosted) |
| 10.2 | DevTools: Network tab | Auth / Storage requests | Requests go to `https://supabase.360medical.net` (or your backend) |
| 10.3 | Health check | `GET {baseUrl}/api/health` | `{ ok: true }` or similar |

---

## Quick Reference — Exact Routes

```
/login
/login?next=/portal
/reset-password
/reset-password?next=/portal
/invite/accept?invite={inviteId}
/set-password?invite={inviteId}&next=/portal
/auth/callback
/auth/client-callback

/portal
/portal/ivr
/portal/ivr/new
/portal/ivr/{ivrId}
/portal/orders
/portal/orders/{orderId}
/portal/invoices
/portal/invoices/{invoiceId}
/portal/invoices/{invoiceId}/pay
/portal/documents
/portal/provider-profiles
/portal/settings

/api/portal/me
/api/portal/select-account
/api/portal/ivr-files/{fileId}/download
/api/portal/ivr/{ivrId}/verification-pdf
/api/portal/ivr/{ivrId}/additional-info
/api/portal/fulfillments/{fulfillmentId}/packing-slip
/api/portal/invoices/{invoiceId}/pdf-url
/api/portal/invoices/{invoiceId}/stripe-intent
/api/portal/documents/files/{fileId}/download

/admin
/admin/ivr
/admin/ivr/{ivrId}
/admin/ivr/{ivrId}/download/{fileId}
/admin/ivr/intake
/admin/orders
/admin/orders/{orderId}
/admin/invoices
/admin/invoices/{invoiceId}
/admin/fulfillments/{fulfillmentId}
/admin/fulfillments/{fulfillmentId}/packing-slip
/admin/fulfillments/{fulfillmentId}/packing-slip/open
/admin/documents
/admin/accounts
/admin/accounts/{accountId}

/api/admin/invoices/{invoiceId}/open
/api/admin/invoices/{invoiceId}/pdf-url
/api/admin/invoices/{invoiceId}/pdf
/api/admin/fulfillments/{fulfillmentId}/packing-slip
/api/admin/fulfillments/{fulfillmentId}/packing-slip/url
/api/admin/fulfillments/{fulfillmentId}/dropship/packing-slip/url
/api/admin/ivr-files/{fileId}/download
/api/admin/ivr/{ivrId}/verification-pdf
/api/health
```

---

## Prerequisites

- [ ] New Supabase backend deployed and reachable
- [ ] `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` updated
- [ ] `.next` deleted and app rebuilt
- [ ] Auth redirect URLs configured in Supabase (Site URL, Redirect URLs)
- [ ] Storage buckets created: `ivr-private`, `order-private`, `product-assets`, `documents-private`
- [ ] Test users, accounts, and sample data available (or create during test)
