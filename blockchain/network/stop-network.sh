#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# SLIDMS Fabric Network — Stop Script
# Tears down all Docker containers, volumes, and generated artifacts
# ═══════════════════════════════════════════════════════════════════════════════

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BLOCKCHAIN_DIR="$(dirname "$SCRIPT_DIR")"

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  SLIDMS — Stopping Hyperledger Fabric Network"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Stop and remove all containers
echo "[INFO] Stopping Docker containers..."
docker compose -f "${SCRIPT_DIR}/docker-compose.yaml" down --volumes --remove-orphans 2>/dev/null || true

# Remove chaincode Docker images
echo "[INFO] Removing chaincode container images..."
docker images -q "dev-peer*slidms*" 2>/dev/null | xargs -r docker rmi -f 2>/dev/null || true

# Clean up generated artifacts
echo "[INFO] Cleaning up generated artifacts..."
rm -rf "${BLOCKCHAIN_DIR}/organizations"
rm -rf "${BLOCKCHAIN_DIR}/channel-artifacts"

echo ""
echo "[✅] SLIDMS Fabric Network stopped and cleaned up."
echo ""
