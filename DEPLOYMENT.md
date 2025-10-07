# Deployment Guide: Azure Static Web Apps

## Prerequisites
- Azure account (free tier available)
- Azure CLI installed
- GitHub repository

## Option 1: Deploy via Azure Portal (Easiest)

### Steps:

1. **Go to Azure Portal**: https://portal.azure.com

2. **Create Static Web App**:
   - Click "Create a resource"
   - Search "Static Web App"
   - Click "Create"

3. **Configure**:
   - **Subscription**: Choose your subscription
   - **Resource Group**: Create new "excel-addin-rg"
   - **Name**: "excel-energy-addin"
   - **Plan**: Free (F0)
   - **Region**: Choose closest to users
   - **Deployment**: GitHub
   - **Organization**: karlwaldman (or your org)
   - **Repository**: oilpriceapi
   - **Branch**: main
   - **Build Presets**: Custom
   - **App location**: /
   - **Output location**: dist

4. **GitHub Integration**:
   - Azure will create a GitHub Action automatically
   - Approve GitHub app installation

5. **Get your URL**:
   - After deployment: `https://excel-energy-addin.azurestaticapps.net`
   - Or custom domain: `https://excel.oilpriceapi.com`

## Option 2: Deploy via Azure CLI

```bash
# Login to Azure
az login

# Create resource group
az group create \
  --name excel-addin-rg \
  --location eastus

# Create static web app
az staticwebapp create \
  --name excel-energy-addin \
  --resource-group excel-addin-rg \
  --source https://github.com/karlwaldman/oilpriceapi \
  --location eastus \
  --branch main \
  --app-location "/" \
  --output-location "dist" \
  --login-with-github

# Get deployment token
az staticwebapp secrets list \
  --name excel-energy-addin \
  --resource-group excel-addin-rg \
  --query "properties.apiKey"
```

## Post-Deployment

### 1. Update manifest.xml

Replace localhost URLs with production URL:

```xml
<SourceLocation DefaultValue="https://excel-energy-addin.azurestaticapps.net/taskpane.html"/>
```

### 2. Configure Custom Domain (Optional)

In Azure Portal:
- Go to your Static Web App
- Click "Custom domains"
- Add: `excel.oilpriceapi.com`
- Update DNS CNAME record

### 3. Add GitHub Secret

The workflow needs `AZURE_STATIC_WEB_APPS_API_TOKEN`:
- Go to GitHub repo → Settings → Secrets
- Add new secret: `AZURE_STATIC_WEB_APPS_API_TOKEN`
- Paste deployment token from Azure

### 4. Test Deployment

```bash
# Trigger deployment
git add .
git commit -m "Configure Azure Static Web Apps"
git push origin main

# Check deployment status
# Go to: https://github.com/karlwaldman/oilpriceapi/actions
```

## Troubleshooting

### Build Fails
- Check Node version (use 18.x)
- Verify npm ci runs locally
- Check build output in GitHub Actions

### CORS Issues
- Verify staticwebapp.config.json is in root
- Check headers in browser DevTools

### Assets Not Loading
- Verify output_location is "dist"
- Check webpack build creates dist/ folder
- Ensure all paths are relative

## Cost

**FREE tier includes**:
- 100 GB bandwidth/month
- Custom domains
- Free SSL certificate
- GitHub integration
- 2 staging environments

**Upgrade if needed**:
- Standard tier: $9/month
- More bandwidth, environments

## Monitoring

View logs in Azure Portal:
- Navigate to Static Web App
- Click "Functions" (if using)
- View "Log stream"

## URL

Your add-in will be available at:
**https://excel-energy-addin.azurestaticapps.net**

(Or custom domain after configuration)
