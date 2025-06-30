#!/bin/bash

# XTV Setup Script
set -e

echo "🔧 XTV Setup Script"
echo "==================="

# Check if binary exists
if [ ! -f "xtv-linux-amd64" ]; then
    echo "❌ xtv-linux-amd64 not found. Please run build-linux.sh first."
    exit 1
fi

# Check if webui directory exists
if [ ! -d "webui" ]; then
    echo "❌ webui directory not found."
    exit 1
fi

# Make scripts executable
chmod +x install.sh
chmod +x setup.sh

# Copy webui files to system
echo "📁 Setting up Web UI..."
sudo mkdir -p /var/lib/xtv/webui
sudo cp -r webui/* /var/lib/xtv/webui/
sudo chown -R $USER:$USER /var/lib/xtv/webui

# Create config directory
sudo mkdir -p /var/lib/xtv/config
sudo chown $USER:$USER /var/lib/xtv/config

echo "✅ Setup completed!"
echo ""
echo "📋 Run installation: ./install.sh" 