# XTV Virtualization System Makefile

.PHONY: build run clean test deps install build-optimized build-release

# Build variables
BINARY_NAME=xtv
BUILD_DIR=build
VERSION=$(shell git describe --tags --always --dirty 2>/dev/null || echo "dev")
BUILD_TIME=$(shell date -u '+%Y-%m-%d_%H:%M:%S')
COMMIT_HASH=$(shell git rev-parse --short HEAD 2>/dev/null || echo "unknown")

# Go variables
GO=go
GOOS?=$(shell go env GOOS)
GOARCH?=$(shell go env GOARCH)

# Build flags for optimization
LDFLAGS=-ldflags "-X main.Version=${VERSION} -X main.BuildTime=${BUILD_TIME} -X main.CommitHash=${COMMIT_HASH} -s -w"
OPTIMIZED_FLAGS=-ldflags "-X main.Version=${VERSION} -X main.BuildTime=${BUILD_TIME} -X main.CommitHash=${COMMIT_HASH} -s -w" -trimpath

# Performance optimization flags
PERF_FLAGS=-gcflags="-l=4" -ldflags="-s -w"

# Default target
all: deps build-optimized

# Install dependencies
deps:
	@echo "Installing dependencies..."
	$(GO) mod download
	$(GO) mod tidy
	$(GO) mod verify

# Build the application (standard)
build:
	@echo "Building XTV Virtualization System..."
	@mkdir -p $(BUILD_DIR)
	$(GO) build $(LDFLAGS) -o $(BUILD_DIR)/$(BINARY_NAME) main.go
	@echo "Build complete: $(BUILD_DIR)/$(BINARY_NAME)"

# Build with optimizations
build-optimized:
	@echo "Building XTV with optimizations..."
	@mkdir -p $(BUILD_DIR)
	CGO_ENABLED=1 $(GO) build $(OPTIMIZED_FLAGS) $(PERF_FLAGS) -o $(BUILD_DIR)/$(BINARY_NAME) main.go
	@echo "Optimized build complete: $(BUILD_DIR)/$(BINARY_NAME)"

# Build for production release
build-release:
	@echo "Building XTV for production release..."
	@mkdir -p $(BUILD_DIR)
	CGO_ENABLED=1 GOOS=linux GOARCH=amd64 $(GO) build $(OPTIMIZED_FLAGS) $(PERF_FLAGS) -o $(BUILD_DIR)/$(BINARY_NAME)-linux-amd64 main.go
	CGO_ENABLED=1 GOOS=windows GOARCH=amd64 $(GO) build $(OPTIMIZED_FLAGS) $(PERF_FLAGS) -o $(BUILD_DIR)/$(BINARY_NAME)-windows-amd64.exe main.go
	@echo "Release builds complete in $(BUILD_DIR)/"

# Build for specific platform
build-linux:
	@echo "Building for Linux..."
	CGO_ENABLED=1 GOOS=linux GOARCH=amd64 $(GO) build $(OPTIMIZED_FLAGS) $(PERF_FLAGS) -o $(BUILD_DIR)/$(BINARY_NAME)-linux-amd64 main.go

build-windows:
	@echo "Building for Windows..."
	CGO_ENABLED=1 GOOS=windows GOARCH=amd64 $(GO) build $(OPTIMIZED_FLAGS) $(PERF_FLAGS) -o $(BUILD_DIR)/$(BINARY_NAME)-windows-amd64.exe main.go

build-darwin:
	@echo "Building for macOS..."
	CGO_ENABLED=1 GOOS=darwin GOARCH=amd64 $(GO) build $(OPTIMIZED_FLAGS) $(PERF_FLAGS) -o $(BUILD_DIR)/$(BINARY_NAME)-darwin-amd64 main.go

# Build for all platforms
build-all: build-linux build-windows build-darwin

# Run the application
run: build-optimized
	@echo "Running XTV Virtualization System..."
	./$(BUILD_DIR)/$(BINARY_NAME)

# Run in development mode
dev:
	@echo "Running in development mode..."
	$(GO) run -race main.go

# Run tests
test:
	@echo "Running tests..."
	$(GO) test -v -race ./...

# Run tests with coverage
test-coverage:
	@echo "Running tests with coverage..."
	$(GO) test -v -race -coverprofile=coverage.out ./...
	$(GO) tool cover -html=coverage.out -o coverage.html
	@echo "Coverage report generated: coverage.html"

# Benchmark tests
bench:
	@echo "Running benchmarks..."
	$(GO) test -bench=. -benchmem ./...

# Clean build artifacts
clean:
	@echo "Cleaning build artifacts..."
	rm -rf $(BUILD_DIR)
	rm -f coverage.out coverage.html
	$(GO) clean -cache
	$(GO) clean -modcache

# Install system dependencies (Ubuntu/Debian)
install-deps:
	@echo "Installing system dependencies..."
	sudo apt update
	sudo apt install -y libvirt-daemon-system qemu-kvm libvirt-clients bridge-utils virt-manager
	sudo apt install -y build-essential pkg-config libvirt-dev
	sudo usermod -a -G libvirt $$USER
	sudo usermod -a -G kvm $$USER
	sudo systemctl start libvirtd
	sudo systemctl enable libvirtd
	@echo "System dependencies installed. Please logout and login again."

# Create necessary directories
setup-dirs:
	@echo "Creating necessary directories..."
	sudo mkdir -p /var/lib/xtv/vms
	sudo mkdir -p /var/lib/xtv/images
	sudo mkdir -p /var/lib/xtv/backups
	sudo mkdir -p /var/log/xtv
	sudo chown $$USER:$$USER /var/lib/xtv/vms
	sudo chown $$USER:$$USER /var/lib/xtv/images
	sudo chown $$USER:$$USER /var/lib/xtv/backups
	sudo chown $$USER:$$USER /var/log/xtv

# Full setup
setup: install-deps setup-dirs
	@echo "Setup complete!"

# Create systemd service
install-service:
	@echo "Creating systemd service..."
	@sudo tee /etc/systemd/system/xtv.service > /dev/null <<EOF
[Unit]
Description=XTV Virtualization System
After=network.target libvirtd.service
Wants=libvirtd.service

[Service]
Type=simple
User=$$USER
Group=$$USER
WorkingDirectory=/var/lib/xtv
ExecStart=/var/lib/xtv/xtv
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal
SyslogIdentifier=xtv

[Install]
WantedBy=multi-user.target
EOF
	@sudo systemctl daemon-reload
	@echo "Systemd service created. Enable with: sudo systemctl enable xtv"

# Install to system
install-system: build-optimized
	@echo "Installing XTV to system..."
	sudo cp $(BUILD_DIR)/$(BINARY_NAME) /usr/local/bin/xtv
	sudo chmod +x /usr/local/bin/xtv
	@echo "XTV installed to /usr/local/bin/xtv"

# Generate API documentation
docs:
	@echo "Generating API documentation..."
	@if command -v swag > /dev/null; then \
		swag init -g main.go; \
	else \
		echo "swag not found. Install with: go install github.com/swaggo/swag/cmd/swag@latest"; \
	fi

# Lint code
lint:
	@echo "Linting code..."
	@if command -v golangci-lint > /dev/null; then \
		golangci-lint run; \
	else \
		echo "golangci-lint not found. Install with: go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest"; \
	fi

# Format code
fmt:
	@echo "Formatting code..."
	$(GO) fmt ./...

# Vet code
vet:
	@echo "Vetting code..."
	$(GO) vet ./...

# Check code quality
check: fmt vet lint

# Security scan
security:
	@echo "Running security scan..."
	@if command -v gosec > /dev/null; then \
		gosec ./...; \
	else \
		echo "gosec not found. Install with: go install github.com/securecodewarrior/gosec/v2/cmd/gosec@latest"; \
	fi

# Performance profiling
profile:
	@echo "Running performance profiling..."
	$(GO) test -cpuprofile=cpu.prof -memprofile=mem.prof -bench=. ./...
	@echo "Profiles generated: cpu.prof, mem.prof"

# Build update_ip tool
update_ip:
	@echo "Building update_ip tool..."
	@go build -o bin/update_ip cmd/update_ip.go

# Build all tools
tools: update_ip
	@echo "All tools built successfully"

# Help
help:
	@echo "Available targets:"
	@echo "  build           - Build the application"
	@echo "  build-optimized - Build with performance optimizations"
	@echo "  build-release   - Build optimized release binaries"
	@echo "  run             - Build optimized and run"
	@echo "  dev             - Run in development mode with race detection"
	@echo "  test            - Run tests with race detection"
	@echo "  bench           - Run benchmarks"
	@echo "  clean           - Clean build artifacts and caches"
	@echo "  deps            - Install Go dependencies"
	@echo "  install-deps    - Install system dependencies"
	@echo "  setup           - Full setup (deps + dirs)"
	@echo "  install-service - Create systemd service"
	@echo "  install-system  - Install to /usr/local/bin"
	@echo "  docs            - Generate API documentation"
	@echo "  lint            - Lint code"
	@echo "  fmt             - Format code"
	@echo "  vet             - Vet code"
	@echo "  check           - Run fmt, vet, and lint"
	@echo "  security        - Security scan"
	@echo "  profile         - Performance profiling"
	@echo "  update_ip       - Build update_ip tool"
	@echo "  tools           - Build all tools"
	@echo "  help            - Show this help" 