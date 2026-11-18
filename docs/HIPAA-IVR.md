# HIPAA Compliance — IVR & PHI

This document describes how the IVR (Insurance Verification Request) features handle Protected Health Information (PHI) and the safeguards in place to support HIPAA compliance.

## PHI in the IVR Flow

The following are treated as PHI and handled with care:

- **Patient name** (`patient_first_name`, `patient_last_name`)
- **Date of birth** (`patient_dob`)
- **Patient address** (address, city, state, zip)
- **Insurance and policy information**
- **Clinical/codes data** (ICD-10, CPT, etc.)
- **Additional info messages and responses** (free text may contain PHI)
- **Uploaded documents** (IVR PDFs, insurance cards, clinical records)

## Safeguards Implemented

### 1. Access Control

- **Admin IVR routes** (`/api/admin/ivr/*`): All require `requireIvrTeamOrAdmin()`. Only internal admin users or staff (`user_profiles.is_staff`) can access.
- **Portal IVR routes** (`/api/portal/ivr/*`): Require `requireCurrentAccount()` and role checks. Users see only IVRs for their selected account.
- **Verification PDFs**: Admin PDFs require IVR team/admin; portal PDFs require same-account ownership.

### 2. No PHI in API Error Responses

- IVR API routes return **generic** error messages only (e.g. "Not found", "Forbidden", "Request failed", "Invalid request").
- Database or internal error messages are **never** returned to the client, to avoid leaking structure or PHI.

### 3. No PHI in Logs or Redirects

- Console logging in IVR flows does **not** include PHI or detailed error content (e.g. "IVR submit: email send failed" only).
- Redirect query params use generic codes (e.g. `?err=email_failed`) rather than raw error messages.

### 4. Email

- **Subject lines**: Use IVR identifier only (e.g. `JOHSMI-19900102-3F2A`), never patient name or full UUID in subject.
- **PHI notices**: Emails that may contain PHI (additional-info notifications to IVR team, request-info to customer) include a notice: *"This email may contain protected health information. Authorized recipients only."*
- **Recipients**: IVR team emails go only to configured lists (`IVR_TEAM_EMAILS`, `IVR_STAFF_NOTIFY_TO`).

### 5. Audit Logging

- `ivr_audit_log` records access and actions (e.g. `ADDITIONAL_INFO_VIEWED`, `STATUS_CHANGE`, `ADDITIONAL_INFO_REQUESTED`) with actor, IP, and user agent where applicable.
- Use this log for compliance audits and access reviews.

### 6. Minimum Necessary in Portal Context

- Portal context loads only the fields needed for pending additional-info alerts (e.g. identifier, message, patient first/last for display to the account member). Access is scoped to the current account.

## Infrastructure & Operational Notes

- **Encryption**: Rely on Supabase (or your host) for encryption at rest and TLS in transit. Ensure production uses HTTPS only.
- **Storage**: IVR files (PDFs, insurance cards, clinical records) are stored in a private bucket; signed URLs are short-lived (e.g. 60 seconds for admin, 10 minutes for portal).
- **BAAs**: Ensure Business Associate Agreements are in place with Supabase and any other vendors that process or store PHI.
- **Retention & disposal**: Define and document retention and secure disposal policies for IVR data and files; implement in DB and storage as needed.

## Developer Guidelines

- Do **not** add `console.log`/`console.warn`/`console.error` that include patient names, DOB, or other PHI.
- Do **not** return `error.message`, `err.message`, or DB/stack details in API responses for IVR (or any PHI) routes.
- Do **not** put PHI in URL path or query parameters.
- When adding new IVR-related APIs, protect them with `requireIvrTeamOrAdmin()` (admin) or portal account + role checks (portal), and use generic error messages.
