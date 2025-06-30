#!/bin/bash

# XTV Simple Network Migration Script
# แก้ไข IP ใน config.json โดยตรง (ไม่ต้องใช้ API)

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
LOG_FILE="/var/log/xtv/simple_migration.log"

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

log "Starting XTV Simple Network Migration"

# Check if config file exists
if [[ ! -f "$CONFIG_FILE" ]]; then
    error "Config file not found: $CONFIG_FILE"
fi

# Backup current configuration
log "Creating backup of current configuration..."
cp "$CONFIG_FILE" "$BACKUP_DIR/config.$(date +%Y%m%d_%H%M%S).json"

# Get current information
log "Current configuration information:"
ORIGINAL_IP=$(jq -r '.install.network.original_ip' "$CONFIG_FILE")
CURRENT_IP=$(jq -r '.install.network.public_ip' "$CONFIG_FILE")
WEB_PORT=$(jq -r '.install.web_port' "$CONFIG_FILE")
API_PORT=$(jq -r '.install.api_port' "$CONFIG_FILE")

log "  Original IP (Installation): $ORIGINAL_IP"
log "  Current IP: $CURRENT_IP"
log "  Web Port: $WEB_PORT"
log "  API Port: $API_PORT"

# Get current network information
log "Current network interfaces:"
ip addr show | grep -E "inet.*global" | while read -r line; do
    log "  $line"
done

# Ask user for new IP
echo
echo "=== Network Migration ==="
echo "Current IP: $CURRENT_IP"
echo "Original IP (Installation): $ORIGINAL_IP"
echo

read -p "Enter new IP address: " NEW_IP

if [[ -z "$NEW_IP" ]]; then
    error "New IP address is required"
fi

# Validate IP format (basic validation)
if ! [[ $NEW_IP =~ ^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$ ]]; then
    error "Invalid IP address format: $NEW_IP"
fi

# Confirm migration
echo
echo "=== Migration Confirmation ==="
echo "Current IP: $CURRENT_IP"
echo "New IP: $NEW_IP"
echo "Web URL will be: http://$NEW_IP:$WEB_PORT"
echo "API URL will be: http://$NEW_IP:$API_PORT"
echo
read -p "Do you want to proceed? (y/n): " CONFIRM

if [[ "$CONFIRM" != "y" && "$CONFIRM" != "Y" ]]; then
    log "Migration cancelled by user"
    exit 0
fi

# Update config file using jq
log "Updating configuration file..."
jq --arg new_ip "$NEW_IP" \
   --arg timestamp "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
   '.install.network.public_ip = $new_ip | 
    .install.network.last_detected = $new_ip | 
    .install.network.last_detected_at = $timestamp' \
   "$CONFIG_FILE" > "$CONFIG_FILE.tmp"

mv "$CONFIG_FILE.tmp" "$CONFIG_FILE"

# Verify the update
UPDATED_IP=$(jq -r '.install.network.public_ip' "$CONFIG_FILE")
if [[ "$UPDATED_IP" != "$NEW_IP" ]]; then
    error "Failed to update IP in configuration file"
fi

success "Configuration updated successfully!"

# Show new URLs
echo
echo "=== Migration Complete ==="
echo "Old IP: $CURRENT_IP"
echo "New IP: $NEW_IP"
echo "Web UI: http://$NEW_IP:$WEB_PORT"
echo "API: http://$NEW_IP:$API_PORT"
echo
echo "Next steps:"
echo "1. Restart XTV service: systemctl restart xtv"
echo "2. Test Web UI: http://$NEW_IP:$WEB_PORT"
echo "3. Update any external references to use the new IP"
echo
echo "Backup saved to: $BACKUP_DIR"
echo "Migration log: $LOG_FILE"

# Optional: Restart XTV service
read -p "Do you want to restart XTV service now? (y/n): " RESTART

if [[ "$RESTART" == "y" || "$RESTART" == "Y" ]]; then
    log "Restarting XTV service..."
    if systemctl restart xtv; then
        success "XTV service restarted successfully"
    else
        warning "Failed to restart XTV service"
    fi
fi 