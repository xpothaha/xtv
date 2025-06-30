#!/bin/bash

# XTV Linux Build Script
echo "Building XTV for Linux..."

# Create build directory
mkdir -p build

# Build for Linux
CGO_ENABLED=1 GOOS=linux GOARCH=amd64 go build -ldflags "-s -w" -o build/xtv-linux-amd64 main.go

if [ $? -eq 0 ]; then
    echo "✅ Build successful: build/xtv-linux-amd64"
    ls -la build/xtv-linux-amd64
else
    echo "❌ Build failed"
    exit 1
fi 