# Healthcare Customer Service Chat Workflow (n8n)

Workflow file:
- `services/packages/customer-service-assistant/workflows/healthcare-customer-support-chat.json`

## What it does
- Exposes webhook chat endpoint: `POST /webhook/customer-support/chat`
- Accepts customer message payload from web/app chat UI.
- Detects intent (billing, appointment, prescription, records, insurance, technical, general).
- Responds with healthcare support guidance from a configured knowledge base.
- Logs conversation and summary to DB and Google Sheets ingest endpoints.

## Sample request body
```json
{
  "customerId": "cust-1001",
  "channel": "webchat",
  "locale": "en-US",
  "message": "I need to refill my medicine and check insurance coverage"
}
```

## Sample response body
```json
{
  "ok": true,
  "provider": "Vishu HealthCare",
  "customer_id": "cust-1001",
  "intent": "prescription",
  "confidence": 0.86,
  "escalation_needed": false,
  "response": "...",
  "references": ["https://support.vishuhealthcare.example/prescriptions"],
  "support_email": "contact@vishusystems.com"
}
```

## Required environment variables
- `HEALTHCARE_PROVIDER_NAME=Vishu HealthCare`
- `SUPPORT_EMAIL=contact@vishusystems.com`
- `SUPPORT_KB_JSON={...}` (optional override; JSON object keyed by intent)
- `SUPPORT_DB_INGEST_URL=https://...`
- `SUPPORT_DB_INGEST_KEY=...`
- `SUPPORT_SHEETS_INGEST_URL=https://...`
- `SUPPORT_SHEETS_INGEST_KEY=...`

## Knowledge file option
Set `SUPPORT_KB_JSON` with your knowledge entries, for example:
```json
{
  "appointment": {
    "answer": "Use our portal to schedule or reschedule appointments.",
    "links": ["https://support.example/appointments"]
  }
}
```

## Notes
- This is generic healthcare support guidance, not clinical advice.
- Keep emergency language in place and route urgent intents to human support.
- Replace fallback links/domains with your real support URLs.
