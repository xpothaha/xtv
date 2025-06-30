#!/bin/bash

# XTV Backup and Restore Script
set -e

echo "💾 XTV Backup and Restore Script"
echo "================================"

BACKUP_DIR="/var/lib/xtv/backups"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

# Function to create backup
create_backup() {
    echo "💾 Creating backup..."
    
    # Create backup directory
    sudo mkdir -p $BACKUP_DIR
    
    # Backup config
    if [ -f "/var/lib/xtv/config.json" ]; then
        sudo cp /var/lib/xtv/config.json $BACKUP_DIR/config-$TIMESTAMP.json
        echo "✅ Config backed up: config-$TIMESTAMP.json"
    fi
    
    # Backup VMs
    if [ -d "/var/lib/xtv/vms" ]; then
        sudo tar -czf $BACKUP_DIR/vms-$TIMESTAMP.tar.gz -C /var/lib/xtv vms
        echo "✅ VMs backed up: vms-$TIMESTAMP.tar.gz"
    fi
    
    # Backup Web UI
    if [ -d "/var/lib/xtv/webui" ]; then
        sudo tar -czf $BACKUP_DIR/webui-$TIMESTAMP.tar.gz -C /var/lib/xtv webui
        echo "✅ Web UI backed up: webui-$TIMESTAMP.tar.gz"
    fi
    
    # Create backup info
    echo "Backup created at: $TIMESTAMP" > $BACKUP_DIR/backup-$TIMESTAMP.info
    echo "Files:" >> $BACKUP_DIR/backup-$TIMESTAMP.info
    ls -la $BACKUP_DIR/*-$TIMESTAMP.* >> $BACKUP_DIR/backup-$TIMESTAMP.info
    
    echo "✅ Backup completed: backup-$TIMESTAMP"
}

# Function to list backups
list_backups() {
    echo "📋 Available backups:"
    if [ -d "$BACKUP_DIR" ]; then
        ls -la $BACKUP_DIR/ | grep -E "\.(json|tar\.gz|info)$" | sort -k9
    else
        echo "No backups found."
    fi
}

# Function to restore backup
restore_backup() {
    local backup_id=$1
    
    if [ -z "$backup_id" ]; then
        echo "❌ Please specify backup ID"
        echo "Usage: $0 restore <backup-id>"
        echo "Example: $0 restore 20241230-143022"
        exit 1
    fi
    
    echo "🔄 Restoring backup: $backup_id"
    
    # Stop service
    sudo systemctl stop xtv
    
    # Restore config
    if [ -f "$BACKUP_DIR/config-$backup_id.json" ]; then
        sudo cp $BACKUP_DIR/config-$backup_id.json /var/lib/xtv/config.json
        echo "✅ Config restored"
    fi
    
    # Restore VMs
    if [ -f "$BACKUP_DIR/vms-$backup_id.tar.gz" ]; then
        sudo tar -xzf $BACKUP_DIR/vms-$backup_id.tar.gz -C /var/lib/xtv
        echo "✅ VMs restored"
    fi
    
    # Restore Web UI
    if [ -f "$BACKUP_DIR/webui-$backup_id.tar.gz" ]; then
        sudo tar -xzf $BACKUP_DIR/webui-$backup_id.tar.gz -C /var/lib/xtv
        echo "✅ Web UI restored"
    fi
    
    # Set permissions
    sudo chown -R $USER:$USER /var/lib/xtv
    
    # Start service
    sudo systemctl start xtv
    
    echo "✅ Restore completed!"
    sudo systemctl status xtv --no-pager
}

# Function to clean old backups
clean_backups() {
    local days=${1:-7}
    
    echo "🧹 Cleaning backups older than $days days..."
    
    if [ -d "$BACKUP_DIR" ]; then
        find $BACKUP_DIR -name "*.json" -mtime +$days -delete
        find $BACKUP_DIR -name "*.tar.gz" -mtime +$days -delete
        find $BACKUP_DIR -name "*.info" -mtime +$days -delete
        echo "✅ Cleanup completed!"
    else
        echo "No backup directory found."
    fi
}

# Main menu
case "${1:-}" in
    "create")
        create_backup
        ;;
    "list")
        list_backups
        ;;
    "restore")
        restore_backup $2
        ;;
    "clean")
        clean_backups $2
        ;;
    *)
        echo "Usage: $0 {create|list|restore|clean}"
        echo ""
        echo "Commands:"
        echo "  create [name]     - Create backup"
        echo "  list              - List available backups"
        echo "  restore <id>      - Restore specific backup"
        echo "  clean [days]      - Clean old backups (default: 7 days)"
        echo ""
        echo "Examples:"
        echo "  $0 create                    # Create backup"
        echo "  $0 list                      # List backups"
        echo "  $0 restore 20241230-143022   # Restore backup"
        echo "  $0 clean 30                  # Clean backups older than 30 days"
        ;;
esac 