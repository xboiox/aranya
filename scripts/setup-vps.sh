#!/usr/bin/env bash
# Aranya HRIS — VPS Initial Setup Script
# Target: Ubuntu 24.04 LTS (Vultr Jakarta)
# Run as root: sudo bash setup-vps.sh
set -euo pipefail

# ── Colors ───────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log()  { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err()  { echo -e "${RED}[✗]${NC} $1"; exit 1; }

[[ $EUID -ne 0 ]] && err "Script ini harus dijalankan sebagai root: sudo bash setup-vps.sh"

DEPLOY_USER="aranya"

# ── 1. Update system ─────────────────────────────────────────────────────────
log "Updating system packages..."
apt-get update -qq && apt-get upgrade -y -qq
apt-get install -y -qq \
  curl git ufw fail2ban \
  unattended-upgrades apt-listchanges \
  ca-certificates gnupg lsb-release \
  htop ncdu

# ── 2. Create deploy user ─────────────────────────────────────────────────────
if ! id "$DEPLOY_USER" &>/dev/null; then
  log "Creating user '$DEPLOY_USER'..."
  useradd -m -s /bin/bash "$DEPLOY_USER"
  usermod -aG sudo "$DEPLOY_USER"
else
  warn "User '$DEPLOY_USER' already exists, skipping."
fi

# ── 3. SSH hardening ──────────────────────────────────────────────────────────
log "Hardening SSH configuration..."
SSHD_CONFIG="/etc/ssh/sshd_config"
# Disable root login
sed -i 's/^#*PermitRootLogin.*/PermitRootLogin no/' "$SSHD_CONFIG"
# Disable password auth (key only)
sed -i 's/^#*PasswordAuthentication.*/PasswordAuthentication no/' "$SSHD_CONFIG"
# Disable empty passwords
sed -i 's/^#*PermitEmptyPasswords.*/PermitEmptyPasswords no/' "$SSHD_CONFIG"
systemctl restart sshd
warn "Pastikan SSH public key sudah di-copy sebelum logout!"
warn "  ssh-copy-id ${DEPLOY_USER}@<your-vps-ip>"

# ── 4. Firewall (UFW) ─────────────────────────────────────────────────────────
log "Configuring UFW firewall..."
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh        comment "SSH"
ufw allow http       comment "HTTP"
ufw allow https      comment "HTTPS"
ufw allow 8000/tcp   comment "Coolify dashboard (restrict after setup)"
ufw --force enable
log "UFW enabled. Rules:"
ufw status numbered

# ── 5. Fail2ban ───────────────────────────────────────────────────────────────
log "Configuring Fail2ban..."
cat > /etc/fail2ban/jail.local <<'EOF'
[DEFAULT]
bantime  = 1h
findtime = 10m
maxretry = 5

[sshd]
enabled = true
port    = ssh
logpath = %(sshd_log)s
backend = %(sshd_backend)s
maxretry = 3
bantime  = 24h
EOF
systemctl enable fail2ban
systemctl restart fail2ban

# ── 6. Automatic security updates ────────────────────────────────────────────
log "Enabling unattended security upgrades..."
cat > /etc/apt/apt.conf.d/20auto-upgrades <<'EOF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
APT::Periodic::AutocleanInterval "7";
EOF

# ── 7. Install Docker ─────────────────────────────────────────────────────────
log "Installing Docker..."
if command -v docker &>/dev/null; then
  warn "Docker already installed: $(docker --version)"
else
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
    | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg

  echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
    https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" \
    > /etc/apt/sources.list.d/docker.list

  apt-get update -qq
  apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  usermod -aG docker "$DEPLOY_USER"
  systemctl enable docker
  systemctl start docker
  log "Docker installed: $(docker --version)"
fi

# ── 8. Swap (safety net untuk low-memory situations) ─────────────────────────
if [[ ! -f /swapfile ]]; then
  log "Creating 2GB swapfile..."
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}════════════════════════════════════════════${NC}"
echo -e "${GREEN}  VPS Setup Selesai!${NC}"
echo -e "${GREEN}════════════════════════════════════════════${NC}"
echo ""
echo "Langkah selanjutnya (manual):"
echo ""
echo "  1. Copy SSH key ke user '$DEPLOY_USER':"
echo "       ssh-copy-id ${DEPLOY_USER}@<your-vps-ip>"
echo ""
echo "  2. Install Coolify:"
echo "       curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash"
echo "       Akses di: http://<your-vps-ip>:8000"
echo ""
echo "  3. Setelah Coolify dikonfigurasi, tutup port 8000:"
echo "       ufw delete allow 8000/tcp"
echo "       (Akses Coolify via domain dengan SSL)"
echo ""
echo "  4. Setup GCS backup cron:"
echo "       crontab -e"
echo "       0 2 * * * /home/${DEPLOY_USER}/aranya/scripts/backup-db.sh >> /var/log/aranya-backup.log 2>&1"
echo ""
