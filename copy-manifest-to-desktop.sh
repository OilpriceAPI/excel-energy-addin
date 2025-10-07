#!/bin/bash
# Copy manifest.xml to Windows Desktop for easy Excel upload

# Get Windows username
WIN_USER=$(cmd.exe /c "echo %USERNAME%" 2>/dev/null | tr -d '\r')

# Copy to Desktop
cp /home/kwaldman/code/excel-energy-addin/dist/manifest.xml "/mnt/c/Users/$WIN_USER/Desktop/manifest.xml"

echo "✅ Manifest copied to Windows Desktop!"
echo ""
echo "Now in Excel:"
echo "1. Insert → Add-ins → Get Add-ins"
echo "2. My Add-ins → Upload My Add-in"
echo "3. Select manifest.xml from your Desktop"
echo ""
echo "Desktop path: C:\\Users\\$WIN_USER\\Desktop\\manifest.xml"
