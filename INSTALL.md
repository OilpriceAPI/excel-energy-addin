# Installation Instructions

## Development Server is Running ✅

The development server is now running at: **https://localhost:3000**

## Load the Add-in into Excel

### Step 1: Open Excel
- Open Microsoft Excel (any workbook)

### Step 2: Sideload the Manifest

#### Option A: Using the Upload Feature (Recommended for Desktop Excel)
1. In Excel, go to **Insert** tab → **Add-ins** → **Get Add-ins**
2. Click **My Add-ins** (left sidebar)
3. Click **Upload My Add-in** (top right)
4. Navigate to and select:
   ```
   /home/kwaldman/code/excel-energy-addin/dist/manifest.xml
   ```
5. Click **Upload**

#### Option B: Using Excel Online
1. Go to https://www.office.com/launch/excel
2. Open a blank workbook
3. Click **Insert** → **Office Add-ins**
4. Click **Upload My Add-in**
5. Upload the manifest.xml file

#### Option C: Manual Registry (Windows Desktop Excel)
1. Create a network share folder or use a local folder
2. Copy `manifest.xml` to that location
3. Add the folder to Excel's Trusted Add-in Catalogs:
   - File → Options → Trust Center → Trust Center Settings
   - Trusted Add-in Catalogs
   - Add the folder path

### Step 3: Accept the Self-Signed Certificate

When you first access the add-in, your browser will show a security warning about the self-signed certificate. This is expected for local development.

**In your browser:**
1. Click **Advanced** (or similar)
2. Click **Proceed to localhost (unsafe)** (or similar)

This is safe because it's your own development server.

### Step 4: Use the Add-in

1. After loading, the add-in will appear in the **Home** tab ribbon
2. Click **Show Prices** button in the "Energy Prices" group
3. The taskpane will open on the right side

## First-Time Setup

### 1. Enter API Key
1. In the Settings section at the top
2. Enter your OilPriceAPI key
3. Click **Save**
4. Click **Test Connection** to verify

### 2. Fetch Prices
1. Select commodities you want (Brent, WTI, Natural Gas, etc.)
2. Click **Fetch Prices**
3. A "Data" sheet will be created with current prices

### 3. Convert to MBtu
1. Click **Convert to MBtu**
2. A "Process" sheet will be created with converted prices
3. All commodities will be in $/MBtu for direct comparison

## Troubleshooting

### "Cannot be accessed" error
- **Solution:** Make sure the development server is running
- Check if https://localhost:3000 is accessible in your browser
- Restart the server: `npm run dev`

### "Manifest cannot be loaded" error
- **Solution:** Use the manifest from the `dist/` folder, not the root folder
- Full path: `/home/kwaldman/code/excel-energy-addin/dist/manifest.xml`

### Certificate errors
- **Solution:** Accept the self-signed certificate warning
- Or install the CA certificate (requires sudo):
  ```bash
  sudo npx office-addin-dev-certs install --machine
  ```

### Server not running
- **Solution:** Start the dev server:
  ```bash
  cd /home/kwaldman/code/excel-energy-addin
  npm run dev
  ```

### Port 3000 already in use
- **Solution:** Find and kill the process using port 3000:
  ```bash
  lsof -ti:3000 | xargs kill -9
  npm run dev
  ```

## Development Commands

```bash
# Start development server (HTTPS on port 3000)
npm run dev

# Run tests
npm test

# Build for production
npm build

# Run tests with coverage
npm run test:coverage
```

## What's Running

- **Dev Server:** https://localhost:3000
- **Bundle:** /home/kwaldman/code/excel-energy-addin/dist/bundle.js
- **Manifest:** /home/kwaldman/code/excel-energy-addin/dist/manifest.xml
- **Certificates:** ~/.office-addin-dev-certs/

## Next Steps

Once the add-in is loaded:
1. Get your API key from https://www.oilpriceapi.com
2. Enter it in the Settings panel
3. Test the connection
4. Fetch your first set of prices!

## Support

- GitHub Issues: https://github.com/OilpriceAPI/oilpriceapi-api/issues
- Documentation: https://docs.oilpriceapi.com
