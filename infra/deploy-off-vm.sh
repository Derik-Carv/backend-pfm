#!/usr/bin/env bash
set -euo pipefail

# Build the production image locally and deploy it to the OCI Micro VPS via SSH
# without running heavy Docker/Bun builds inside the 1 GB RAM instance.
#
# Usage:
#   VPS_HOST=ubuntu@seu-servidor.exemplo SSH_OPTS="-i ~/.ssh/oci.key" ./infra/deploy-off-vm.sh

VPS_HOST="${VPS_HOST:?VPS_HOST is required (e.g. ubuntu@seu-servidor.exemplo)}"
VPS_APP_DIR="${VPS_APP_DIR:-/opt/backend-pfm}"
IMAGE_NAME="${IMAGE_NAME:-backend-pfm:prod}"
TARGET_PLATFORM="${TARGET_PLATFORM:-linux/amd64}"
SSH_OPTS="${SSH_OPTS:-}"

# shellcheck disable=SC2086
SSH_CMD=(ssh ${SSH_OPTS} "${VPS_HOST}")

echo "==> [1/3] Building ${IMAGE_NAME} (${TARGET_PLATFORM}) locally..."
docker build --platform "${TARGET_PLATFORM}" --target production -t "${IMAGE_NAME}" .

echo "==> [2/3] Streaming compressed image to ${VPS_HOST}..."
docker save "${IMAGE_NAME}" | gzip -1 | "${SSH_CMD[@]}" "gunzip | docker load"

echo "==> [3/3] Restarting remote production stack without rebuilding..."
"${SSH_CMD[@]}" "cd '${VPS_APP_DIR}' && BACKEND_IMAGE='${IMAGE_NAME}' docker compose -f compose.yaml -f compose.production.yaml up -d --no-build && docker image prune -f"

echo "Deploy finished successfully."
