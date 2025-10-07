# Quick Install - Energy Price Comparison Add-in

## One-Time Setup (5 minutes)

### Step 1: Start the Server
```bash
cd /home/kwaldman/code/excel-energy-addin
npm run dev
```
**Leave this running!**

### Step 2: Load Add-in into Excel

**Option A: Windows File Path**
1. Open Excel (any workbook)
2. Insert → Add-ins → Get Add-ins
3. My Add-ins → Upload My Add-in
4. Navigate to:
   ```
   \\wsl$\Ubuntu\home\kwaldman\code\excel-energy-addin\dist\manifest.xml
   ```

**Option B: Copy to Windows**
```bash
# In WSL, copy manifest to Windows Desktop
cp /home/kwaldman/code/excel-energy-addin/dist/manifest.xml /mnt/c/Users/$USER/Desktop/
```
Then in Excel, upload from Desktop.

### Step 3: Use It!
1. Click **Show Prices** button in Home ribbon
2. Enter API key: `3839c085460dd3a9dac1291f937f5a6d1740e8c668c766bc9f95e166af59cb11`
3. Click Save → Test Connection
4. Select commodities → Fetch Prices!

## After Installation

✅ The add-in is now available in **ALL Excel workbooks**
✅ No need to embed or reload
✅ Just open any workbook and click "Show Prices"

## Sharing with Others

To share with others:
1. They need to run the dev server (or you deploy to production)
2. They load the manifest.xml once
3. Done! Works in all their workbooks

## Production Deployment (Future)

For production use:
- Deploy to Azure/AWS/Vercel
- Update manifest.xml URLs
- Publish to Microsoft AppSource
- Users install with one click
