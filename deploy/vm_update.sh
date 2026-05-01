#!/bin/bash
# =============================================================================
# AI Relationship Simulator — Update Script (git pull + restart)
# Run this on the VM whenever you want to deploy new code.
# Usage: bash /opt/ai-sim/deploy/vm_update.sh
# =============================================================================

set -e

APP_DIR="/opt/ai-sim"
SERVICE_USER="aisim"

echo "=== Updating AI Relationship Simulator ==="

# Pull latest code
echo "[1/3] Pulling latest code..."
sudo -u "$SERVICE_USER" git -C "$APP_DIR" pull origin main

# Update dependencies (in case requirements.txt changed)
echo "[2/3] Updating dependencies..."
sudo -u "$SERVICE_USER" "$APP_DIR/venv/bin/pip" install -r "$APP_DIR/backend/requirements.txt" -q

# Restart service
echo "[3/3] Restarting service..."
sudo systemctl restart ai-sim

sleep 2
sudo systemctl status ai-sim --no-pager

echo ""
echo "Update complete! App is running."
