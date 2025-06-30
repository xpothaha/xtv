#!/bin/bash

# XTV Package Creation Script
set -e

echo "📦 Creating XTV Deployment Package"
echo "=================================="

# Create package directory
PACKAGE_DIR="xtv-deploy-package"
rm -rf $PACKAGE_DIR
mkdir -p $PACKAGE_DIR

# Check if binary exists
if [ ! -f "build/xtv-linux-amd64" ]; then
    echo "❌ Binary not found. Please run build-linux.sh first."
    exit 1
fi

# Check if webui build exists
if [ ! -d "webui/build" ]; then
    echo "❌ Web UI build not found. Please build webui first."
    exit 1
fi

# Copy binary
echo "📋 Copying binary..."
cp build/xtv-linux-amd64 $PACKAGE_DIR/

# Copy webui build files
echo "🌐 Copying Web UI files..."
cp -r webui/build $PACKAGE_DIR/webui

# Copy scripts
echo "📜 Copying scripts..."
cp install.sh $PACKAGE_DIR/
cp setup.sh $PACKAGE_DIR/
cp README-DEPLOY.md $PACKAGE_DIR/

# Make scripts executable
chmod +x $PACKAGE_DIR/*.sh

# Create zip file
echo "🗜️ Creating zip package..."
zip -r xtv-deploy-package.zip $PACKAGE_DIR/

echo "✅ Package created: xtv-deploy-package.zip"
echo "📁 Package contents:"
ls -la $PACKAGE_DIR/
echo ""
echo "📦 Package size:"
du -h xtv-deploy-package.zip
echo ""
echo "🚀 Ready for deployment!" 