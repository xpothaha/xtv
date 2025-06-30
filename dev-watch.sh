#!/bin/bash

# XTV Development Watch Script (Hot Reload)
set -e

echo "👀 XTV Development Watch Script"
echo "==============================="

# Check dependencies
if ! command -v inotifywait &> /dev/null; then
    echo "📦 Installing inotify-tools..."
    sudo apt install -y inotify-tools
fi

# Function to build and restart
build_and_restart() {
    echo "🔄 Changes detected! Building and restarting..."
    
    # Build backend
    if [ -f "build-linux.sh" ]; then
        chmod +x build-linux.sh
        ./build-linux.sh
        sudo cp build/xtv-linux-amd64 /usr/local/bin/xtv
        sudo chmod +x /usr/local/bin/xtv
    fi
    
    # Build webui if needed
    if [ -d "webui" ] && [ -f "webui/package.json" ]; then
        cd webui
        npm run build
        cd ..
        sudo cp -r webui/build/* /var/lib/xtv/webui/
        sudo chown -R $USER:$USER /var/lib/xtv/webui
    fi
    
    # Restart service
    sudo systemctl restart xtv
    
    echo "✅ Updated and restarted!"
    echo "📋 Status:"
    sudo systemctl status xtv --no-pager | head -5
    echo ""
}

# Function to watch files
watch_files() {
    echo "👀 Watching for changes..."
    echo "Press Ctrl+C to stop"
    echo ""
    
    # Watch Go files
    inotifywait -m -r -e modify,create,delete \
        --exclude '\.git|node_modules|build|\.swp|\.tmp' \
        . |
    while read path action file; do
        if [[ "$file" =~ \.(go|tsx|ts|js|css|html)$ ]]; then
            echo "📝 $action: $path$file"
            build_and_restart
        fi
    done
}

# Function to watch specific directories
watch_backend() {
    echo "👀 Watching backend files..."
    inotifywait -m -r -e modify,create,delete \
        --exclude '\.git|node_modules|build|\.swp|\.tmp' \
        internal/ main.go |
    while read path action file; do
        if [[ "$file" =~ \.go$ ]]; then
            echo "📝 $action: $path$file"
            build_and_restart
        fi
    done
}

watch_webui() {
    echo "👀 Watching webui files..."
    cd webui
    inotifywait -m -r -e modify,create,delete \
        --exclude '\.git|node_modules|build|\.swp|\.tmp' \
        src/ |
    while read path action file; do
        if [[ "$file" =~ \.(tsx|ts|js|css|html)$ ]]; then
            echo "📝 $action: $path$file"
            cd ..
            build_and_restart
            cd webui
        fi
    done
}

# Main menu
case "${1:-}" in
    "backend")
        watch_backend
        ;;
    "webui")
        watch_webui
        ;;
    "all")
        watch_files
        ;;
    *)
        echo "Usage: $0 {backend|webui|all}"
        echo ""
        echo "Commands:"
        echo "  backend - Watch backend files only"
        echo "  webui   - Watch webui files only"
        echo "  all     - Watch all files"
        echo ""
        echo "Examples:"
        echo "  $0 backend  # Watch Go files"
        echo "  $0 webui    # Watch React files"
        echo "  $0 all      # Watch everything"
        ;;
esac 