# SMB Sales Lead Generation + Enrichment Workflow (n8n)

Workflow file:
- `services/packages/sales-assistant/workflows/smb-sales-lead-gen-enrichment.json`

## What it does
- Defines ICP context for SMB sales.
- Generates/captures leads (starter dataset in Code node; replace with LinkedIn/Apollo source API).
- Calls enrichment API to fill missing fields (email/phone/linkedin).
- Writes normalized records to:
  - Google Sheets ingest endpoint
  - DB ingest endpoint
- Uses promoter email default: `contact@vishusystems.com`.

## Required environment variables (n8n container)
- `PROMOTER_EMAIL=contact@vishusystems.com`
- `ENRICHMENT_API_URL=https://...`
- `ENRICHMENT_API_KEY=...`
- `GOOGLE_SHEETS_INGEST_URL=https://...`
- `GOOGLE_SHEETS_INGEST_KEY=...`
- `LEAD_DB_INGEST_URL=https://...`
- `LEAD_DB_INGEST_KEY=...`
- `SERVICE_ACTIVITY_INGEST_BASE_URL=http://api:4000`
- `SERVICE_ACTIVITY_INGEST_KEY=...`
- `SELECTION_ID` (injected by platform at deploy time)

## Notes
- For Google Sheets, easiest path is an Apps Script Web App endpoint that appends rows.
- For DB, expose an authenticated API endpoint that performs upsert by `(company,email)`.
- Replace the `Generate/Collect Leads` code node with real lead-source API calls when ready.
