#!/bin/bash

# XTV Ubuntu Installation Script
# This script automates the installation of XTV on Ubuntu systems

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# BIOS/OS Feature Check (MUST BE FIRST)
echo -e "${BLUE}==== Checking virtualization BIOS/firmware features ====\n${NC}"
FEATURES_OK=1

function check_feature() {
  local name="$1"
  local cmd="$2"
  local msg="$3"
  if eval "$cmd" >/dev/null 2>&1; then
    echo -e "${GREEN}✅ $name enabled${NC}"
  else
    echo -e "${RED}❌ $name NOT enabled${NC} $msg"
    FEATURES_OK=0
  fi
}

# VT-x/AMD-V
check_feature "CPU Virtualization (VT-x/AMD-V)" "egrep -wo 'vmx|svm' /proc/cpuinfo" "Please enable Intel VT-x or AMD-V in BIOS."

# VT-d/IOMMU
check_feature "IOMMU/VT-d" "dmesg | grep -e DMAR -e IOMMU" "Please enable VT-d (Intel) or IOMMU (AMD) in BIOS."

# Hyper-Threading
check_feature "Hyper-Threading" "lscpu | grep -i 'Thread(s) per core' | grep -v ': *1'" "Enable Hyper-Threading in BIOS for best performance (optional)."

# UEFI
check_feature "UEFI Boot" "[ -d /sys/firmware/efi ]" "Enable UEFI boot in BIOS (optional, but recommended)."

# Secure Boot
if command -v mokutil >/dev/null 2>&1; then
  check_feature "Secure Boot (should be disabled)" "mokutil --sb-state | grep -q 'disabled'" "Disable Secure Boot in BIOS for device passthrough."
fi

echo -e "${BLUE}==============================================${NC}"

if [ $FEATURES_OK -eq 0 ]; then
  echo -e "${RED}❌ Some required features are NOT enabled in BIOS/firmware.${NC}"
  echo -e "${YELLOW}Please enable them and reboot, then run this script again.${NC}"
  exit 1
else
  echo -e "${GREEN}✅ All required features are enabled. Continuing installation...${NC}"
fi

# Configuration
XTV_VERSION="1.0.0"
GO_VERSION="1.21.5"
INSTALL_DIR="/var/lib/xtv"
BINARY_DIR="/usr/local/bin"
SERVICE_FILE="/etc/systemd/system/xtv.service"

# Logging
LOG_FILE="/tmp/xtv_install.log"

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to log messages
log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

# Function to check if running as root
check_root() {
    if [[ $EUID -eq 0 ]]; then
        print_error "This script should not be run as root"
        exit 1
    fi
}

# Function to check Ubuntu version
check_ubuntu_version() {
    if [[ ! -f /etc/os-release ]]; then
        print_error "This script only supports Ubuntu"
        exit 1
    fi
    
    source /etc/os-release
    if [[ "$ID" != "ubuntu" ]]; then
        print_error "This script only supports Ubuntu"
        exit 1
    fi
    
    print_status "Detected Ubuntu $VERSION_ID"
}

# Function to update system
update_system() {
    print_status "Updating system packages..."
    log_message "Updating system packages"
    
    sudo apt update -y
    sudo apt upgrade -y
    
    print_success "System updated successfully"
}

# Function to install Go
install_go() {
    if command -v go &> /dev/null; then
        GO_CURRENT_VERSION=$(go version | awk '{print $3}' | sed 's/go//')
        print_status "Go is already installed (version: $GO_CURRENT_VERSION)"
        
        # Check if version is sufficient
        if [[ "$GO_CURRENT_VERSION" > "1.21" ]]; then
            print_success "Go version is sufficient"
            return
        fi
    fi
    
    print_status "Installing Go $GO_VERSION..."
    log_message "Installing Go $GO_VERSION"
    
    # Download and install Go
    cd /tmp
    wget "https://go.dev/dl/go${GO_VERSION}.linux-amd64.tar.gz"
    sudo tar -C /usr/local -xzf "go${GO_VERSION}.linux-amd64.tar.gz"
    rm "go${GO_VERSION}.linux-amd64.tar.gz"
    
    # Add Go to PATH
    if ! grep -q "/usr/local/go/bin" ~/.bashrc; then
        echo 'export PATH=$PATH:/usr/local/go/bin' >> ~/.bashrc
    fi
    
    # Source bashrc for current session
    export PATH=$PATH:/usr/local/go/bin
    
    print_success "Go installed successfully"
}

# Function to install system dependencies
install_dependencies() {
    print_status "Installing system dependencies..."
    log_message "Installing system dependencies"
    
    # Install required packages
    sudo apt install -y build-essential pkg-config
    sudo apt install -y libvirt-daemon-system qemu-kvm libvirt-clients
    sudo apt install -y bridge-utils virt-manager libvirt-dev
    sudo apt install -y git curl wget htop
    
    # Add user to required groups
    sudo usermod -a -G libvirt "$USER"
    sudo usermod -a -G kvm "$USER"
    
    # Start and enable libvirtd
    sudo systemctl start libvirtd
    sudo systemctl enable libvirtd
    
    print_success "System dependencies installed successfully"
}

# Function to create directories
create_directories() {
    print_status "Creating necessary directories..."
    log_message "Creating directories"
    
    sudo mkdir -p "$INSTALL_DIR"/{vms,images,backups}
    sudo mkdir -p /var/log/xtv
    
    # Set ownership
    sudo chown "$USER:$USER" "$INSTALL_DIR"/vms
    sudo chown "$USER:$USER" "$INSTALL_DIR"/images
    sudo chown "$USER:$USER" "$INSTALL_DIR"/backups
    sudo chown "$USER:$USER" /var/log/xtv
    
    print_success "Directories created successfully"
}

# Function to build XTV
build_xtv() {
    print_status "Building XTV..."
    log_message "Building XTV"
    
    # Check if we're in the XTV directory
    if [[ ! -f "main.go" ]] || [[ ! -f "go.mod" ]]; then
        print_error "Please run this script from the XTV project directory"
        exit 1
    fi
    
    # Install Go dependencies
    go mod download
    go mod tidy
    
    # Build with optimizations
    make build-optimized
    
    if [[ ! -f "build/xtv" ]]; then
        print_error "Build failed"
        exit 1
    fi
    
    print_success "XTV built successfully"
}

# Function to install XTV binary
install_binary() {
    print_status "Installing XTV binary..."
    log_message "Installing binary"
    
    sudo cp build/xtv "$BINARY_DIR/xtv"
    sudo chmod +x "$BINARY_DIR/xtv"
    
    print_success "Binary installed successfully"
}

# Function to create systemd service
create_service() {
    print_status "Creating systemd service..."
    log_message "Creating systemd service"
    
    sudo tee "$SERVICE_FILE" > /dev/null <<EOF
[Unit]
Description=XTV Virtualization System
After=network.target libvirtd.service
Wants=libvirtd.service

[Service]
Type=simple
User=$USER
Group=$USER
WorkingDirectory=$INSTALL_DIR
ExecStart=$BINARY_DIR/xtv
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
    
    print_success "Systemd service created successfully"
}

# Function to configure firewall
configure_firewall() {
    print_status "Configuring firewall..."
    log_message "Configuring firewall"
    
    # Check if UFW is available
    if command -v ufw &> /dev/null; then
        sudo ufw allow 8080/tcp  # API
        sudo ufw allow 8888/tcp  # Web UI
        sudo ufw allow 22/tcp    # SSH
        
        # Enable UFW if not already enabled
        if ! sudo ufw status | grep -q "Status: active"; then
            echo "y" | sudo ufw enable
        fi
        
        print_success "Firewall configured with UFW"
    else
        print_warning "UFW not found, please configure firewall manually"
    fi
}

# Function to run initial setup
run_initial_setup() {
    print_status "Running initial XTV setup..."
    log_message "Running initial setup"
    
    # Run XTV for initial configuration
    if [[ -f "$BINARY_DIR/xtv" ]]; then
        print_status "Please complete the initial setup when prompted..."
        "$BINARY_DIR/xtv"
    else
        print_error "XTV binary not found"
        exit 1
    fi
}

# Function to start service
start_service() {
    print_status "Starting XTV service..."
    log_message "Starting service"
    
    sudo systemctl enable xtv
    sudo systemctl start xtv
    
    # Wait a moment for service to start
    sleep 3
    
    if sudo systemctl is-active --quiet xtv; then
        print_success "XTV service started successfully"
    else
        print_error "Failed to start XTV service"
        sudo systemctl status xtv
        exit 1
    fi
}

# Function to display final information
display_final_info() {
    echo
    print_success "XTV installation completed successfully!"
    echo
    echo "=== Installation Summary ==="
    echo "Version: $XTV_VERSION"
    echo "Install Directory: $INSTALL_DIR"
    echo "Binary Location: $BINARY_DIR/xtv"
    echo "Service File: $SERVICE_FILE"
    echo
    echo "=== Access Information ==="
    echo "Web UI: http://$(hostname -I | awk '{print $1}'):8888"
    echo "API: http://$(hostname -I | awk '{print $1}'):8080"
    echo
    echo "=== Service Management ==="
    echo "Start:   sudo systemctl start xtv"
    echo "Stop:    sudo systemctl stop xtv"
    echo "Restart: sudo systemctl restart xtv"
    echo "Status:  sudo systemctl status xtv"
    echo "Logs:    sudo journalctl -u xtv -f"
    echo
    echo "=== Next Steps ==="
    echo "1. Logout and login again to apply group changes"
    echo "2. Access the Web UI to complete configuration"
    echo "3. Check the logs if you encounter any issues"
    echo
    echo "Installation log: $LOG_FILE"
}

# Function to cleanup
cleanup() {
    print_status "Cleaning up temporary files..."
    rm -f /tmp/go*.tar.gz
    print_success "Cleanup completed"
}

# Main installation function
main() {
    echo "=========================================="
    echo "    XTV Ubuntu Installation Script"
    echo "=========================================="
    echo
    
    # Initialize log file
    echo "XTV Installation Log - $(date)" > "$LOG_FILE"
    
    # Run installation steps
    check_root
    check_ubuntu_version
    update_system
    install_go
    install_dependencies
    create_directories
    build_xtv
    install_binary
    create_service
    configure_firewall
    
    # Ask user if they want to run initial setup
    echo
    read -p "Do you want to run the initial XTV setup now? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        run_initial_setup
    fi
    
    # Ask user if they want to start the service
    echo
    read -p "Do you want to start the XTV service now? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        start_service
    fi
    
    cleanup
    display_final_info
    
    log_message "Installation completed successfully"
}

# Run main function
main "$@" 