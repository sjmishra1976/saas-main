# Customer Service Assistant Package

n8n-based package for Customer Service Assistant.

- Put exported workflows in `workflows/`.
- Build locally with `scripts/build_customer_service_assistant.sh`.
- Push with `scripts/build_customer_service_assistant.sh --push` and `IMAGE_REF=...`.

## Included workflow template
- `workflows/healthcare-customer-support-chat.json`
- Import in n8n and configure env vars from `docs/workflows/customer-service-assistant-healthcare.md`.
