#!/usr/bin/env bash
set -euo pipefail

# Idempotent host tuning script for Oracle Cloud Always Free VM.Standard.E2.1.Micro (1 OCPU, 1 GB RAM).
# Run as root: sudo bash infra/vps-tune-oci-micro.sh

if [[ "${EUID}" -ne 0 ]]; then
    echo "Error: run this script as root (e.g. sudo bash $0)." >&2
    exit 1
fi

echo "==> [1/5] Checking swap configuration..."
SWAP_TOTAL_MB=$(free -m | awk '/^Swap:/ {print $2}')
if [[ "${SWAP_TOTAL_MB:-0}" -lt 1024 ]] && [[ ! -f /swapfile ]]; then
    echo "Creating 2G /swapfile..."
    fallocate -l 2G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=2048 status=progress
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    if ! grep -qE '^/swapfile\s' /etc/fstab; then
        echo '/swapfile none swap sw 0 0' >> /etc/fstab
    fi
else
    if [[ -f /swapfile ]] && ! swapon --show=NAME --noheadings | grep -qx '/swapfile'; then
        chmod 600 /swapfile
        swapon /swapfile || true
    fi
    echo "Swap already configured (${SWAP_TOTAL_MB:-0} MB total)."
fi

echo "==> [2/5] Checking optional ZRAM compressed swap..."
if command -v zramctl >/dev/null 2>&1; then
    if ! swapon --show=NAME --noheadings | grep -q '/dev/zram'; then
        if modprobe zram >/dev/null 2>&1; then
            ZRAM_DEV=$(zramctl --find --size 512M --algorithm zstd 2>/dev/null || zramctl --find --size 512M --algorithm lz4 2>/dev/null || true)
            if [[ -n "${ZRAM_DEV}" ]]; then
                mkswap "${ZRAM_DEV}" >/dev/null
                swapon -p 100 "${ZRAM_DEV}"
                echo "Enabled ZRAM on ${ZRAM_DEV} (512M, priority 100)."
            fi
        else
            echo "Kernel module zram not available; skipping ZRAM."
        fi
    else
        echo "ZRAM already active."
    fi
else
    echo "zramctl not installed; skipping ZRAM."
fi

echo "==> [3/5] Applying kernel sysctl tuning (/etc/sysctl.d/99-pfm-oci-micro.conf)..."
SYSCTL_FILE="/etc/sysctl.d/99-pfm-oci-micro.conf"
{
    echo "# PFM Backend - Oracle Cloud VM.Standard.E2.1.Micro (1 GB RAM) tuning"
    echo "vm.swappiness=20"
    echo "vm.vfs_cache_pressure=50"
    echo "net.core.somaxconn=1024"
    echo "net.ipv4.tcp_tw_reuse=1"
    modprobe tcp_bbr >/dev/null 2>&1 || true
    if grep -qw 'bbr' /proc/sys/net/ipv4/tcp_available_congestion_control 2>/dev/null; then
        echo "net.core.default_qdisc=fq"
        echo "net.ipv4.tcp_congestion_control=bbr"
    fi
} > "${SYSCTL_FILE}"
sysctl --system >/dev/null

echo "==> [4/5] Configuring Docker daemon log rotation and live-restore..."
mkdir -p /etc/docker
DAEMON_JSON="/etc/docker/daemon.json"
DOCKER_CHANGED=0

if [[ -f "${DAEMON_JSON}" ]]; then
    if command -v python3 >/dev/null 2>&1; then
        cp -a "${DAEMON_JSON}" "${DAEMON_JSON}.bak.$(date +%Y%m%d%H%M%S)"
        python3 - "${DAEMON_JSON}" <<'PY'
import json, sys

path = sys.argv[1]
with open(path, "r", encoding="utf-8") as f:
    raw = f.read().strip()
data = json.loads(raw) if raw else {}

data["log-driver"] = "json-file"
log_opts = data.get("log-opts")
if not isinstance(log_opts, dict):
    log_opts = {}
log_opts["max-size"] = "10m"
log_opts["max-file"] = "3"
data["log-opts"] = log_opts
data["live-restore"] = True
data["log-level"] = "warn"

with open(path, "w", encoding="utf-8") as f:
    json.dump(data, f, indent=2)
    f.write("\n")
PY
        DOCKER_CHANGED=1
    else
        echo "Warning: ${DAEMON_JSON} exists and python3 is missing; skipping merge." >&2
    fi
else
    cat > "${DAEMON_JSON}" <<'JSON'
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "live-restore": true,
  "log-level": "warn"
}
JSON
    DOCKER_CHANGED=1
fi

echo "==> [5/5] Installing weekly Docker prune cron (/etc/cron.weekly/pfm-docker-prune)..."
mkdir -p /etc/cron.weekly
cat > /etc/cron.weekly/pfm-docker-prune <<'CRON'
#!/usr/bin/env sh
set -eu
if command -v docker >/dev/null 2>&1; then
    docker image prune -f >/dev/null 2>&1 || true
    docker builder prune -f --keep-storage=512mb >/dev/null 2>&1 || true
fi
CRON
chmod +x /etc/cron.weekly/pfm-docker-prune

echo "Done!"
if [[ "${DOCKER_CHANGED}" -eq 1 ]]; then
    echo "Reminder: restart Docker when convenient to apply /etc/docker/daemon.json: sudo systemctl restart docker"
fi
