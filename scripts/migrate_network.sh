#!/bin/bash

# XTV Network Migration Script
# This script helps migrate the XTV server to a different network

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
CONFIG_FILE="/etc/xtv/config.json"
BACKUP_DIR="/var/backups/xtv"
LOG_FILE="/var/log/xtv/migration.log"

# Functions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
    exit 1
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   error "This script must be run as root"
fi

# Create backup directory
mkdir -p "$BACKUP_DIR"
mkdir -p "$(dirname "$LOG_FILE")"

log "Starting XTV Network Migration"

# Backup current configuration
log "Creating backup of current configuration..."
cp "$CONFIG_FILE" "$BACKUP_DIR/config.$(date +%Y%m%d_%H%M%S).json"

# Check if XTV is running
if systemctl is-active --quiet xtv; then
    log "XTV service is running"
else
    warning "XTV service is not running"
fi

# Get current network information
log "Current network information:"
ip addr show | grep -E "inet.*global" | while read -r line; do
    log "  $line"
done

# Get current public IP
log "Current public IP:"
PUBLIC_IP=$(curl -s ifconfig.me 2>/dev/null || echo "Unable to detect")
log "  $PUBLIC_IP"

# Prepare migration
log "Preparing network migration..."
curl -X POST "http://localhost:8080/api/migration/prepare" \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer $(jq -r '.auth.token' "$CONFIG_FILE")" \
     -s | jq '.' || warning "Failed to prepare migration via API"

# Ask user for new network configuration
echo
echo "=== Network Migration Configuration ==="
echo "Please provide the new network configuration:"
echo

read -p "Network interface (e.g., eth0): " NEW_INTERFACE
read -p "IP configuration (dhcp/static): " NEW_IP_CONFIG

if [[ "$NEW_IP_CONFIG" == "static" ]]; then
    read -p "Static IP address: " NEW_STATIC_IP
    read -p "Gateway: " NEW_GATEWAY
    read -p "Netmask: " NEW_NETMASK
    read -p "DNS servers (comma-separated): " NEW_DNS
fi

read -p "Enable auto-detect IP? (y/n): " AUTO_DETECT
AUTO_DETECT_IP="false"
if [[ "$AUTO_DETECT" == "y" || "$AUTO_DETECT" == "Y" ]]; then
    AUTO_DETECT_IP="true"
fi

# Create new network configuration
NEW_CONFIG=$(cat <<EOF
{
  "interface": "$NEW_INTERFACE",
  "ip_config": "$NEW_IP_CONFIG",
  "static_ip": "${NEW_STATIC_IP:-}",
  "gateway": "${NEW_GATEWAY:-}",
  "netmask": "${NEW_NETMASK:-}",
  "dns_servers": "${NEW_DNS:-}",
  "auto_detect_ip": $AUTO_DETECT_IP
}
EOF
)

log "New network configuration:"
echo "$NEW_CONFIG" | jq '.'

# Confirm migration
echo
echo "=== Migration Confirmation ==="
echo "Current public IP: $PUBLIC_IP"
echo "New configuration will be applied."
echo "This may temporarily disconnect the server from the network."
echo
read -p "Do you want to proceed with the migration? (y/n): " CONFIRM

if [[ "$CONFIRM" != "y" && "$CONFIRM" != "Y" ]]; then
    log "Migration cancelled by user"
    exit 0
fi

# Stop XTV service
log "Stopping XTV service..."
systemctl stop xtv || warning "Failed to stop XTV service"

# Apply network configuration
log "Applying network configuration..."

# Update config file
jq --argjson network "$NEW_CONFIG" '.install.network = $network' "$CONFIG_FILE" > "$CONFIG_FILE.tmp"
mv "$CONFIG_FILE.tmp" "$CONFIG_FILE"

# Configure network interface
if [[ "$NEW_IP_CONFIG" == "static" ]]; then
    log "Configuring static IP..."
    
    # Create netplan configuration
    NETPLAN_CONFIG="/etc/netplan/01-xtv-migration.yaml"
    cat > "$NETPLAN_CONFIG" <<EOF
network:
  version: 2
  renderer: networkd
  ethernets:
    $NEW_INTERFACE:
      addresses:
        - $NEW_STATIC_IP/$NEW_NETMASK
      routes:
        - to: default
          via: $NEW_GATEWAY
      nameservers:
        addresses: [${NEW_DNS//,/ }]
EOF
    
    # Apply netplan configuration
    netplan apply
else
    log "Configuring DHCP..."
    
    # Create netplan configuration for DHCP
    NETPLAN_CONFIG="/etc/netplan/01-xtv-migration.yaml"
    cat > "$NETPLAN_CONFIG" <<EOF
network:
  version: 2
  renderer: networkd
  ethernets:
    $NEW_INTERFACE:
      dhcp4: true
EOF
    
    # Apply netplan configuration
    netplan apply
fi

# Wait for network to stabilize
log "Waiting for network to stabilize..."
sleep 10

# Test network connectivity
log "Testing network connectivity..."
if ping -c 3 8.8.8.8 >/dev/null 2>&1; then
    success "Network connectivity test passed"
else
    error "Network connectivity test failed"
fi

# Get new public IP
log "New public IP:"
NEW_PUBLIC_IP=$(curl -s ifconfig.me 2>/dev/null || echo "Unable to detect")
log "  $NEW_PUBLIC_IP"

# Complete migration via API
log "Completing migration..."
curl -X POST "http://localhost:8080/api/migration/complete" \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer $(jq -r '.auth.token' "$CONFIG_FILE")" \
     -s | jq '.' || warning "Failed to complete migration via API"

# Start XTV service
log "Starting XTV service..."
systemctl start xtv || error "Failed to start XTV service"

# Wait for service to be ready
log "Waiting for XTV service to be ready..."
sleep 5

# Test XTV API
log "Testing XTV API..."
if curl -s "http://localhost:8080/api/v1/health" >/dev/null; then
    success "XTV API is responding"
else
    error "XTV API is not responding"
fi

# Get new URLs
log "New service URLs:"
WEB_URL=$(curl -s "http://localhost:8080/api/network/status" \
    -H "Authorization: Bearer $(jq -r '.auth.token' "$CONFIG_FILE")" | jq -r '.web_url')
API_URL=$(curl -s "http://localhost:8080/api/network/status" \
    -H "Authorization: Bearer $(jq -r '.auth.token' "$CONFIG_FILE")" | jq -r '.api_url')

log "  Web UI: $WEB_URL"
log "  API: $API_URL"

# Cleanup
log "Cleaning up..."
rm -f "$NETPLAN_CONFIG"

success "Network migration completed successfully!"
echo
echo "=== Migration Summary ==="
echo "Old public IP: $PUBLIC_IP"
echo "New public IP: $NEW_PUBLIC_IP"
echo "Web UI: $WEB_URL"
echo "API: $API_URL"
echo
echo "Please update any external references to use the new IP address."
echo "Backup configuration saved to: $BACKUP_DIR"
echo "Migration log: $LOG_FILE" 