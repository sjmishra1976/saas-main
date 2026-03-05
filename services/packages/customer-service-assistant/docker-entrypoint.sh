#!/bin/sh
set -e

BOOTSTRAP_MARKER=/home/node/.n8n/.bootstrap_done

if [ ! -f "$BOOTSTRAP_MARKER" ]; then
  if [ -d /opt/bootstrap/workflows ] && [ "$(ls -A /opt/bootstrap/workflows 2>/dev/null || true)" ]; then
    n8n import:workflow --separate --input=/opt/bootstrap/workflows || true
  fi
  touch "$BOOTSTRAP_MARKER"
fi

exec n8n "$@"
