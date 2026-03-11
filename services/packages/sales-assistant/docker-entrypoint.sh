#!/bin/sh
set -e

BOOTSTRAP_MARKER=/home/node/.n8n/.bootstrap_done
MAX_RETRIES=${N8N_BOOTSTRAP_RETRIES:-12}
SLEEP_SECONDS=${N8N_BOOTSTRAP_SLEEP:-5}

should_import=true
if [ "$1" = "worker" ] || [ "$2" = "worker" ]; then
  should_import=false
fi

if [ "$should_import" = "true" ] && [ ! -f "$BOOTSTRAP_MARKER" ]; then
  if [ -d /opt/bootstrap/workflows ] && [ "$(ls -A /opt/bootstrap/workflows 2>/dev/null || true)" ]; then
    attempt=1
    while [ $attempt -le $MAX_RETRIES ]; do
      if n8n import:workflow --separate --input=/opt/bootstrap/workflows; then
        touch "$BOOTSTRAP_MARKER"
        break
      fi
      echo "Workflow import failed (attempt $attempt/$MAX_RETRIES); retrying in ${SLEEP_SECONDS}s..."
      attempt=$((attempt + 1))
      sleep "$SLEEP_SECONDS"
    done
  else
    touch "$BOOTSTRAP_MARKER"
  fi
fi

exec n8n "$@"
