# Microsoft AppSource Submission Guide

## Privacy Policy URL

**Privacy Policy Location:** 
https://calm-bush-0e3aadf10.2.azurestaticapps.net/privacy.html

**When submitting to Microsoft Partner Center, enter this URL in:**
- Store Listing → Privacy Policy URL field
- This is a REQUIRED field for AppSource approval

## Support URL

**Support URL:**
https://www.oilpriceapi.com/tools/excel-energy-comparison

**Already configured in manifest.xml**

## App Domains Whitelisted

The following domains are whitelisted in manifest.xml:
- https://calm-bush-0e3aadf10.2.azurestaticapps.net
- https://www.oilpriceapi.com
- https://api.oilpriceapi.com

## Required Documentation URLs

| Document | URL | Status |
|----------|-----|--------|
| Privacy Policy | https://calm-bush-0e3aadf10.2.azurestaticapps.net/privacy.html | ✅ Created |
| Support Page | https://www.oilpriceapi.com/tools/excel-energy-comparison | ⏳ Pending |
| Terms of Service | https://www.oilpriceapi.com/terms | ⏳ Optional |
| Documentation | https://docs.oilpriceapi.com | ✅ Exists |

## Submission Checklist

Before submitting to Microsoft Partner Center:

### Technical Requirements
- [x] HTTPS deployment (Azure Static Web Apps)
- [x] manifest.xml updated with production URLs
- [x] Privacy policy page created and accessible
- [ ] All icon sizes present and professional (32x32, 64x64, 80x80, 128x128)
- [ ] Manifest validated with `npx office-addin-manifest validate manifest.xml`
- [ ] Tested on Excel 2016, 2019, 2021, 365 (Windows)
- [ ] Tested on Excel for Mac
- [ ] Tested on Excel Online

### Content Requirements
- [ ] Screenshots (3-5 images, 1366x768)
- [ ] App description (4000 chars max)
- [ ] Short description (100 chars)
- [ ] Categories selected
- [ ] Keywords defined
- [ ] App icon for store (96x96)

### Legal Requirements
- [x] Privacy policy URL
- [ ] Support URL responding
- [ ] Terms of service (optional)

### Partner Center Account
- [ ] Microsoft Partner Center account created ($19/year)
- [ ] Tax forms completed
- [ ] Profile information filled

## Privacy Policy Compliance

The privacy policy covers:
- ✅ What data is collected (API keys, request logs)
- ✅ How data is used (API authentication)
- ✅ Where data is stored (localStorage, OilPriceAPI servers)
- ✅ Data security measures (HTTPS, TLS 1.2+)
- ✅ Third-party services (OilPriceAPI, Azure)
- ✅ User rights (access, deletion, opt-out)
- ✅ GDPR/CCPA compliance
- ✅ Contact information

## Next Steps

1. Build and deploy privacy policy to Azure
2. Design professional icons
3. Create support page on oilpriceapi.com
4. Add comprehensive error handling
5. Test on all Excel platforms
6. Take screenshots for store listing
7. Create Microsoft Partner Center account
8. Submit to AppSource

