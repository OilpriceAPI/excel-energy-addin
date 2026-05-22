#!/bin/bash
set -euo pipefail

# Copy manifest.xml to a Windows folder that can be used as an Excel shared-folder catalog.
# This is a WSL helper only. The supported Windows setup path is:
# powershell -ExecutionPolicy Bypass -File scripts/setup-windows-desktop-sideload.ps1 -ClearOfficeCache

# Get Windows username
WIN_USER=$(cmd.exe /c "echo %USERNAME%" 2>/dev/null | tr -d '\r')
WIN_HOME="/mnt/c/Users/$WIN_USER"
CATALOG_DIR="$WIN_HOME/Documents/OfficeAddins"
MANIFEST_SOURCE="dist/manifest.xml"

if [ ! -f "$MANIFEST_SOURCE" ]; then
  echo "dist/manifest.xml was not found. Run npm run build first."
  exit 1
fi

mkdir -p "$CATALOG_DIR"
cp "$MANIFEST_SOURCE" "$CATALOG_DIR/manifest.xml"

echo "Manifest copied to the Windows Office add-in catalog folder."
echo ""
echo "Windows folder:"
echo "C:\\Users\\$WIN_USER\\Documents\\OfficeAddins"
echo ""
echo "Desktop Excel setup:"
echo "1. Prefer the PowerShell setup script: scripts\\setup-windows-desktop-sideload.ps1"
echo "2. Or manually share C:\\Users\\$WIN_USER\\Documents\\OfficeAddins with your Windows user."
echo "3. Excel: File > Options > Trust Center > Trust Center Settings > Trusted Add-in Catalogs."
echo "4. Add the shared-folder UNC path, check Show in Menu, then restart Excel."
echo "5. Excel: Insert > My Add-ins > Shared Folder > OilPrice Excel Add-in."
