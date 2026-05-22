#!/bin/bash
set -euo pipefail

# Copy manifest.xml to a Windows folder that can be used as an Excel shared-folder catalog.

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
echo "1. Share C:\\Users\\$WIN_USER\\Documents\\OfficeAddins with your Windows user."
echo "2. Excel: File > Options > Trust Center > Trust Center Settings > Trusted Add-in Catalogs."
echo "3. Add the shared-folder UNC path, check Show in Menu, then restart Excel."
echo "4. Excel: Insert > My Add-ins > Shared Folder > OilPriceAPI."
