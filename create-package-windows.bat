@echo off
echo 📦 Creating XTV Deployment Package (Windows)
echo ============================================

REM Create package directory
set PACKAGE_DIR=xtv-deploy-package
if exist %PACKAGE_DIR% rmdir /s /q %PACKAGE_DIR%
mkdir %PACKAGE_DIR%

REM Check if webui build exists
if not exist "webui\build" (
    echo ❌ Web UI build not found. Please build webui first.
    exit /b 1
)

REM Copy webui build files
echo 🌐 Copying Web UI files...
xcopy "webui\build" "%PACKAGE_DIR%\webui\" /E /I /Y

REM Copy scripts
echo 📜 Copying scripts...
copy "install.sh" "%PACKAGE_DIR%\"
copy "setup.sh" "%PACKAGE_DIR%\"
copy "README-DEPLOY.md" "%PACKAGE_DIR%\"
copy "build-linux.sh" "%PACKAGE_DIR%\"

REM Copy development scripts
echo 🔧 Copying development scripts...
copy "dev-update.sh" "%PACKAGE_DIR%\"
copy "dev-watch.sh" "%PACKAGE_DIR%\"
copy "backup-restore.sh" "%PACKAGE_DIR%\"

REM Create zip file
echo 🗜️ Creating zip package...
powershell Compress-Archive -Path "%PACKAGE_DIR%" -DestinationPath "xtv-deploy-package.zip" -Force

echo ✅ Package created: xtv-deploy-package.zip
echo 📁 Package contents:
dir %PACKAGE_DIR%
echo.
echo 📦 Package size:
powershell (Get-Item "xtv-deploy-package.zip").Length / 1MB
echo MB
echo.
echo 🚀 Ready for deployment!
echo.
echo 📋 Note: Binary (xtv-linux-amd64) must be built on Linux server
echo    Run: ./build-linux.sh on the target server
echo.
echo 🔧 Development tools included:
echo    - dev-update.sh: Update Web UI/Backend
echo    - dev-watch.sh: Hot reload development
echo    - backup-restore.sh: Backup and restore system 