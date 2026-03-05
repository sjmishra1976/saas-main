#!/usr/bin/env bash
set -euo pipefail

IMAGE_REF="${IMAGE_REF:-registry.example.com/sales-assistant-n8n:latest}"
PUSH_FLAG="${1:-}"

"$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/build_n8n_service_image.sh" \
  sales-assistant \
  "$IMAGE_REF" \
  "$PUSH_FLAG"
