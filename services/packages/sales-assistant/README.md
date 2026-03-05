# Sales Assistant Package

n8n-based package for Sales Assistant.

- Put exported workflows in `workflows/`.
- Build locally with `scripts/build_sales_assistant.sh`.
- Push with `scripts/build_sales_assistant.sh --push` and `IMAGE_REF=...`.

## Included workflow template
- `workflows/smb-sales-lead-gen-enrichment.json`
- Import in n8n and set environment variables listed in `docs/workflows/sales-assistant-smb.md`.
