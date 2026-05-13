# Quick Fix: Excel Add-in Deployment

**Problem:** Azure Static Web App at https://calm-bush-0e3aadf10.2.azurestaticapps.net/ returns 404

**Root Cause:** The Azure Static Web App resource may not exist or the configuration is incorrect

## Option 1: Deploy to GitHub Pages (Easiest - 5 minutes)

GitHub Pages is simpler and works perfectly for static Office Add-ins.

### Steps:

1. **Update manifest.xml with GitHub Pages URL**
```bash
# The URL will be: https://oilpriceapi.github.io/excel-energy-addin/
```

2. **Create GitHub Pages workflow**
```bash
cat > .github/workflows/github-pages.yml << 'EOF'
name: Deploy to GitHub Pages

on:
  push:
    branches:
      - main

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Setup Pages
        uses: actions/configure-pages@v3

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v2
        with:
          path: './dist'

      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v2
EOF
```

3. **Enable GitHub Pages**
```bash
# Go to: https://github.com/OilpriceAPI/excel-energy-addin/settings/pages
# Source: GitHub Actions
# Branch: main
```

4. **Update manifest.xml**
```bash
sed -i 's|https://calm-bush-0e3aadf10.2.azurestaticapps.net|https://oilpriceapi.github.io/excel-energy-addin|g' manifest.xml
sed -i 's|https://calm-bush-0e3aadf10.2.azurestaticapps.net|https://oilpriceapi.github.io/excel-energy-addin|g' dist/manifest.xml
```

5. **Commit and push**
```bash
git add .
git commit -m "Deploy to GitHub Pages instead of Azure"
git push origin main
```

6. **Test after 2 minutes**
```bash
curl -I https://oilpriceapi.github.io/excel-energy-addin/
curl -I https://oilpriceapi.github.io/excel-energy-addin/taskpane.html
```

## Option 2: Fix Azure Static Web App (More complex)

### Check if Azure resource exists:

```bash
# Install Azure CLI if needed
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash

# Login
az login

# List static web apps
az staticwebapp list --output table

# If it doesn't exist, create it:
az staticwebapp create \
  --name excel-energy-addin \
  --resource-group excel-addin-rg \
  --source https://github.com/OilpriceAPI/excel-energy-addin \
  --location eastus2 \
  --branch main \
  --app-location "/" \
  --output-location "dist" \
  --login-with-github

# Get the URL
az staticwebapp show \
  --name excel-energy-addin \
  --resource-group excel-addin-rg \
  --query "defaultHostname" \
  --output tsv
```

## Option 3: Use Netlify (Alternative, also easy)

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login
netlify login

# Deploy
cd /home/kwaldman/code/excel-energy-addin
netlify deploy --prod --dir=dist

# You'll get a URL like: https://excel-energy-addin.netlify.app
```

## Recommended: Option 1 (GitHub Pages)

**Why GitHub Pages:**
- ✅ Free and reliable
- ✅ Automatic HTTPS
- ✅ No Azure account needed
- ✅ Simple configuration
- ✅ Directly integrated with GitHub
- ✅ Perfect for static Office Add-ins
- ✅ Fast global CDN

**Why NOT Azure Static Web Apps (in this case):**
- ❌ Requires Azure subscription
- ❌ Complex configuration
- ❌ Currently returning 404
- ❌ Harder to debug
- ❌ Overkill for a static add-in

## Next Steps

Execute Option 1 above to get your add-in deployed and working in 5 minutes!
