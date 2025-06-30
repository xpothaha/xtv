# XTV Deployment Guide

## 📦 Package Contents

```
xtv-deploy-package/
├── xtv-linux-amd64          # XTV binary for Linux
├── webui/                   # Web UI files
├── install.sh               # Installation script
├── setup.sh                 # Setup script
├── build-linux.sh           # Build script for Linux
├── dev-update.sh            # Development update script
├── dev-watch.sh             # Hot reload development script
├── backup-restore.sh        # Backup and restore script
└── README-DEPLOY.md         # This file
```

## 🚀 Quick Start

### 1. Download and Extract
```bash
# Download package
wget https://your-domain.com/xtv-deploy-package.zip

# Extract
unzip xtv-deploy-package.zip
cd xtv-deploy-package
```

### 2. Setup and Install
```bash
# Make scripts executable
chmod +x *.sh

# Setup system
./setup.sh

# Install XTV
./install.sh
```

### 3. Start Service
```bash
# Logout and login again (for group changes)
exit
# SSH back to server

# Start XTV service
sudo systemctl start xtv

# Enable auto-start
sudo systemctl enable xtv

# Check status
sudo systemctl status xtv
```

### 4. Access Web UI
- **Web UI**: http://your-server-ip:8888
- **API**: http://your-server-ip:8080

## 🔧 Development and Updates

### Quick Update Commands

#### Update Web UI Only
```bash
./dev-update.sh webui
```

#### Update Backend Only
```bash
./dev-update.sh backend
```

#### Update Both Web UI and Backend
```bash
./dev-update.sh all
```

#### Restart Service Only
```bash
./dev-update.sh restart
```

#### Check Service Status
```bash
./dev-update.sh status
```

#### View Recent Logs
```bash
./dev-update.sh logs
```

### Hot Reload Development

#### Watch Backend Files (Auto-reload)
```bash
./dev-watch.sh backend
```

#### Watch Web UI Files (Auto-reload)
```bash
./dev-watch.sh webui
```

#### Watch All Files (Auto-reload)
```bash
./dev-watch.sh all
```

### Backup and Restore

#### Create Backup (Before Making Changes)
```bash
./backup-restore.sh create
```

#### List Available Backups
```bash
./backup-restore.sh list
```

#### Restore Specific Backup
```bash
./backup-restore.sh restore 20241230-143022
```

#### Clean Old Backups
```bash
./backup-restore.sh clean 30  # Clean backups older than 30 days
```

### Development Workflow

#### 1. Before Making Changes
```bash
# Create backup
./backup-restore.sh create

# Check current status
./dev-update.sh status
```

#### 2. During Development
```bash
# For Web UI changes
./dev-watch.sh webui

# For Backend changes
./dev-watch.sh backend

# For both
./dev-watch.sh all
```

#### 3. Manual Updates
```bash
# Update Web UI
./dev-update.sh webui

# Update Backend
./dev-update.sh backend

# Update everything
./dev-update.sh all
```

#### 4. If Something Goes Wrong
```bash
# Check logs
./dev-update.sh logs

# Restore from backup
./backup-restore.sh restore <backup-id>

# Check status
./dev-update.sh status
```

### Development Tips

#### 1. Always Backup Before Changes
```bash
./backup-restore.sh create
```

#### 2. Use Hot Reload for Development
```bash
# Start watching in one terminal
./dev-watch.sh backend

# Make changes in another terminal
# Changes will auto-reload
```

#### 3. Check Logs Frequently
```bash
./dev-update.sh logs
```

#### 4. Monitor Service Status
```bash
./dev-update.sh status
```

#### 5. Clean Old Backups Regularly
```bash
./backup-restore.sh clean 7  # Keep last 7 days
```

## 🔧 Manual Installation

If you prefer manual installation:

### 1. Install Dependencies
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y libvirt-daemon-system qemu-kvm libvirt-clients
sudo apt install -y bridge-utils virt-manager libvirt-dev
sudo apt install -y build-essential pkg-config git curl wget
```

### 2. Setup User and Groups
```bash
sudo usermod -a -G libvirt $USER
sudo usermod -a -G kvm $USER
# Logout and login again
```

### 3. Start Libvirt
```bash
sudo systemctl start libvirtd
sudo systemctl enable libvirtd
```

### 4. Create Directories
```bash
sudo mkdir -p /var/lib/xtv/{vms,images,backups,webui,config}
sudo mkdir -p /var/log/xtv
sudo chown -R $USER:$USER /var/lib/xtv
sudo chown -R $USER:$USER /var/log/xtv
```

### 5. Install Binary
```bash
sudo cp xtv-linux-amd64 /usr/local/bin/xtv
sudo chmod +x /usr/local/bin/xtv
```

### 6. Setup Web UI
```bash
sudo cp -r webui/* /var/lib/xtv/webui/
sudo chown -R $USER:$USER /var/lib/xtv/webui
```

### 7. Create Service
```bash
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

sudo systemctl daemon-reload
```

### 8. Setup Firewall
```bash
sudo ufw allow 8080/tcp  # API
sudo ufw allow 8888/tcp  # Web UI
sudo ufw allow 22/tcp    # SSH
```

### 9. Start Service
```bash
sudo systemctl start xtv
sudo systemctl enable xtv
```

## 🔍 Troubleshooting

### Check Service Status
```bash
sudo systemctl status xtv
sudo journalctl -u xtv -f
```

### Check Libvirt
```bash
virsh list --all
sudo systemctl status libvirtd
```

### Check Permissions
```bash
groups $USER
ls -la /var/lib/xtv/
```

### Check Ports
```bash
sudo netstat -tlnp | grep :8080
sudo netstat -tlnp | grep :8888
```

### Common Issues

1. **Permission Denied**: Logout and login again after adding to groups
2. **Port Already in Use**: Check if another service is using the ports
3. **Libvirt Connection Failed**: Restart libvirtd service
4. **Binary Not Found**: Check if xtv-linux-amd64 exists and is executable
5. **Update Failed**: Check logs with `./dev-update.sh logs`
6. **Hot Reload Not Working**: Install inotify-tools: `sudo apt install inotify-tools`

## 📋 System Requirements

- **OS**: Ubuntu 20.04 LTS or newer
- **CPU**: 64-bit x86_64
- **RAM**: Minimum 4GB (8GB+ recommended)
- **Storage**: Minimum 20GB (100GB+ recommended)
- **Network**: Internet connection for dependencies

## 🔒 Security Notes

- Change default password after first login
- Configure firewall properly
- Use HTTPS in production
- Regular security updates
- Monitor logs for suspicious activity
- Create regular backups

## 📞 Support

For issues and support:
- Check logs: `./dev-update.sh logs`
- Check system status: `./dev-update.sh status`
- Review this documentation
- Check GitHub issues

## 📝 License

XTV is licensed under the MIT License. 