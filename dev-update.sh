#!/bin/bash

# XTV Development Update Script
set -e

echo "🔄 XTV Development Update Script"
echo "================================"

# Check if running in development mode
if [ ! -f "/usr/local/bin/xtv" ]; then
    echo "❌ XTV not installed. Please install first."
    exit 1
fi

# Function to update Web UI
update_webui() {
    echo "🌐 Updating Web UI..."
    
    # Check if webui source exists
    if [ ! -d "webui" ]; then
        echo "❌ webui directory not found. Please copy webui source first."
        return 1
    fi
    
    # Build Web UI
    echo "📦 Building Web UI..."
    cd webui
    npm install
    npm run build
    cd ..
    
    # Copy to system
    echo "📋 Copying Web UI files..."
    sudo cp -r webui/build/* /var/lib/xtv/webui/
    sudo chown -R $USER:$USER /var/lib/xtv/webui
    
    echo "✅ Web UI updated!"
}

# Function to update Backend
update_backend() {
    echo "🔧 Updating Backend..."
    
    # Check if Go is installed
    if ! command -v go &> /dev/null; then
        echo "❌ Go not installed. Installing Go..."
        wget https://go.dev/dl/go1.21.5.linux-amd64.tar.gz
        sudo tar -C /usr/local -xzf go1.21.5.linux-amd64.tar.gz
        echo 'export PATH=$PATH:/usr/local/go/bin' >> ~/.bashrc
        source ~/.bashrc
    fi
    
    # Build binary
    echo "📦 Building binary..."
    chmod +x build-linux.sh
    ./build-linux.sh
    
    # Install binary
    echo "📋 Installing binary..."
    sudo cp build/xtv-linux-amd64 /usr/local/bin/xtv
    sudo chmod +x /usr/local/bin/xtv
    
    echo "✅ Backend updated!"
}

# Function to restart service
restart_service() {
    echo "🔄 Restarting XTV service..."
    sudo systemctl restart xtv
    sudo systemctl status xtv --no-pager
    echo "✅ Service restarted!"
}

# Function to show logs
show_logs() {
    echo "📋 Recent logs:"
    sudo journalctl -u xtv -n 20 --no-pager
}

# Main menu
case "${1:-}" in
    "webui")
        update_webui
        restart_service
        ;;
    "backend")
        update_backend
        restart_service
        ;;
    "all")
        update_webui
        update_backend
        restart_service
        ;;
    "restart")
        restart_service
        ;;
    "logs")
        show_logs
        ;;
    "status")
        sudo systemctl status xtv --no-pager
        ;;
    *)
        echo "Usage: $0 {webui|backend|all|restart|logs|status}"
        echo ""
        echo "Commands:"
        echo "  webui   - Update Web UI only"
        echo "  backend - Update Backend only"
        echo "  all     - Update both Web UI and Backend"
        echo "  restart - Restart service only"
        echo "  logs    - Show recent logs"
        echo "  status  - Show service status"
        echo ""
        echo "Examples:"
        echo "  $0 webui    # Update Web UI"
        echo "  $0 backend  # Update Backend"
        echo "  $0 all      # Update everything"
        ;;
esac 