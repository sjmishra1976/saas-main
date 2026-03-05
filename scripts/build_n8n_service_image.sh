#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -lt 2 ]; then
  echo "Usage: $0 <service-dir-name> <image-ref> [--push]"
  echo "Example: $0 sales-assistant us-west1-docker.pkg.dev/aiaas/saas/sales-assistant-n8n:latest --push"
  exit 1
fi

SERVICE_DIR_NAME="$1"
IMAGE_REF="$2"
PUSH="false"

if [ "${3:-}" = "--push" ]; then
  PUSH="true"
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SERVICE_DIR="$ROOT_DIR/services/packages/$SERVICE_DIR_NAME"

if [ ! -d "$SERVICE_DIR" ]; then
  echo "Service directory not found: $SERVICE_DIR"
  exit 1
fi

if [ ! -f "$SERVICE_DIR/Dockerfile" ]; then
  echo "Dockerfile not found: $SERVICE_DIR/Dockerfile"
  exit 1
fi

if [ ! -d "$SERVICE_DIR/workflows" ]; then
  echo "workflows folder missing: $SERVICE_DIR/workflows"
  exit 1
fi

echo "Building $IMAGE_REF from $SERVICE_DIR"
docker build -t "$IMAGE_REF" "$SERVICE_DIR"

if [ "$PUSH" = "true" ]; then
  echo "Pushing $IMAGE_REF"
  docker push "$IMAGE_REF"
fi

echo "Done: $IMAGE_REF"
