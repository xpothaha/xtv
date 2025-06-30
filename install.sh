#!/bin/bash

# XTV Installation Script for Ubuntu
set -e

echo "🚀 XTV Installation Script"
echo "=========================="

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    echo "❌ Please don't run as root. Use a regular user with sudo privileges."
    exit 1
fi

# Update system
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install dependencies
echo "📦 Installing system dependencies..."
sudo apt install -y build-essential pkg-config
sudo apt install -y libvirt-daemon-system qemu-kvm libvirt-clients
sudo apt install -y bridge-utils virt-manager libvirt-dev
sudo apt install -y git curl wget

# Add user to groups
echo "👤 Adding user to libvirt and kvm groups..."
sudo usermod -a -G libvirt $USER
sudo usermod -a -G kvm $USER

# Start libvirtd service
echo "🔧 Starting libvirtd service..."
sudo systemctl start libvirtd
sudo systemctl enable libvirtd

# Create directories
echo "📁 Creating necessary directories..."
sudo mkdir -p /var/lib/xtv/vms
sudo mkdir -p /var/lib/xtv/images
sudo mkdir -p /var/lib/xtv/backups
sudo mkdir -p /var/log/xtv

# Set ownership
sudo chown $USER:$USER /var/lib/xtv/vms
sudo chown $USER:$USER /var/lib/xtv/images
sudo chown $USER:$USER /var/lib/xtv/backups
sudo chown $USER:$USER /var/log/xtv

# Copy binary
echo "📋 Installing XTV binary..."
sudo cp xtv-linux-amd64 /usr/local/bin/xtv
sudo chmod +x /usr/local/bin/xtv

# Create systemd service
echo "🔧 Creating systemd service..."
sudo tee /etc/systemd/system/xtv.service > /dev/null <<EOF
[Unit]
Description=XTV Virtualization System
After=network.target libvirtd.service
Wants=libvirtd.service

[Service]
Type=simple
User=$USER
Group=$USER
WorkingDirectory=/var/lib/xtv
ExecStart=/usr/local/bin/xtv
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal
SyslogIdentifier=xtv
Environment=GOMAXPROCS=4

[Install]
WantedBy=multi-user.target
EOF

# Reload systemd
sudo systemctl daemon-reload

# Setup firewall
echo "🔥 Setting up firewall..."
sudo ufw allow 8080/tcp  # API
sudo ufw allow 8888/tcp  # Web UI
sudo ufw allow 22/tcp    # SSH

echo "✅ Installation completed!"
echo ""
echo "📋 Next steps:"
echo "1. Logout and login again to apply group changes"
echo "2. Start XTV service: sudo systemctl start xtv"
echo "3. Enable auto-start: sudo systemctl enable xtv"
echo "4. Check status: sudo systemctl status xtv"
echo "5. Access Web UI: http://$(hostname -I | awk '{print $1}'):8888"
echo "6. Access API: http://$(hostname -I | awk '{print $1}'):8080"
echo ""
echo "📖 For more information, see README-DEPLOY.md" 