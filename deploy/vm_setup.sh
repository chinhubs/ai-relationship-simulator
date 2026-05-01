#!/bin/bash
# =============================================================================
# AI Relationship Simulator — VM Setup Script
# Run this ONCE on a fresh Debian/Ubuntu GCP VM.
# Usage: bash vm_setup.sh
# =============================================================================

set -e

REPO_URL="https://github.com/chinhubs/ai-relationship-simulator.git"
APP_DIR="/opt/ai-sim"
SERVICE_USER="aisim"
PORT=8000

echo ""
echo "=== AI Relationship Simulator — VM Setup ==="
echo ""

# ── 1. System packages ────────────────────────────────────────────────────────
echo "[1/6] Installing system packages..."
sudo apt-get update -qq
sudo apt-get install -y --no-install-recommends \
    git python3 python3-pip python3-venv \
    curl nginx ufw

# ── 2. Create app user ────────────────────────────────────────────────────────
echo "[2/6] Creating app user '$SERVICE_USER'..."
if ! id "$SERVICE_USER" &>/dev/null; then
    sudo useradd -m -s /bin/bash "$SERVICE_USER"
fi

# ── 3. Clone repo ─────────────────────────────────────────────────────────────
echo "[3/6] Cloning repository..."
sudo rm -rf "$APP_DIR"
sudo git clone "$REPO_URL" "$APP_DIR"
sudo chown -R "$SERVICE_USER:$SERVICE_USER" "$APP_DIR"

# ── 4. Python virtual env + deps ──────────────────────────────────────────────
echo "[4/6] Installing Python dependencies..."
sudo -u "$SERVICE_USER" python3 -m venv "$APP_DIR/venv"
sudo -u "$SERVICE_USER" "$APP_DIR/venv/bin/pip" install --upgrade pip -q
sudo -u "$SERVICE_USER" "$APP_DIR/venv/bin/pip" install -r "$APP_DIR/backend/requirements.txt" -q

# ── 5. Create .env file ───────────────────────────────────────────────────────
echo "[5/6] Creating .env file..."

# Prompt for API key if not set
if [ -z "$OPENAI_API_KEY" ]; then
    read -rp "Enter your OPENAI_API_KEY: " OPENAI_API_KEY
fi

APP_SECRET=$(tr -dc 'A-Za-z0-9' </dev/urandom | head -c 32)

sudo -u "$SERVICE_USER" tee "$APP_DIR/backend/.env" > /dev/null <<EOF
OPENAI_API_KEY=${OPENAI_API_KEY}
DATABASE_URL=sqlite+aiosqlite:///./simulation.db
APP_SECRET_KEY=${APP_SECRET}
DEBUG=false
EOF

echo "  .env created at $APP_DIR/backend/.env"

# ── 6. Systemd service ────────────────────────────────────────────────────────
echo "[6/6] Installing systemd service..."
sudo tee /etc/systemd/system/ai-sim.service > /dev/null <<EOF
[Unit]
Description=AI Relationship Simulator
After=network.target

[Service]
Type=simple
User=${SERVICE_USER}
WorkingDirectory=${APP_DIR}/backend
EnvironmentFile=${APP_DIR}/backend/.env
ExecStart=${APP_DIR}/venv/bin/uvicorn app.main:app --host 0.0.0.0 --port ${PORT} --workers 2
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable ai-sim
sudo systemctl start ai-sim

# ── Nginx reverse proxy ───────────────────────────────────────────────────────
sudo tee /etc/nginx/sites-available/ai-sim > /dev/null <<EOF
server {
    listen 80;
    server_name _;

    client_max_body_size 10M;

    location / {
        proxy_pass http://127.0.0.1:${PORT};
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_read_timeout 300s;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/ai-sim /etc/nginx/sites-enabled/ai-sim
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl restart nginx

# ── Firewall ──────────────────────────────────────────────────────────────────
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable

# ── Done ──────────────────────────────────────────────────────────────────────
EXTERNAL_IP=$(curl -s ifconfig.me 2>/dev/null || echo "<your-vm-ip>")

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║  Setup complete!                                     ║"
echo "╠══════════════════════════════════════════════════════╣"
echo "║  App URL  : http://${EXTERNAL_IP}                   "
echo "║  API Docs : http://${EXTERNAL_IP}/docs              "
echo "║  Health   : http://${EXTERNAL_IP}/health            "
echo "╠══════════════════════════════════════════════════════╣"
echo "║  Useful commands:                                    ║"
echo "║  sudo systemctl status ai-sim    # check status     ║"
echo "║  sudo journalctl -u ai-sim -f    # live logs        ║"
echo "║  sudo systemctl restart ai-sim   # restart app      ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""
