# Excel Add-in Support and Reproduction Runbook

Use this runbook to reproduce a customer report without mixing up installation,
runtime, authentication, and formula failures. Use a non-customer key unless the
customer is present and has authorized use of their key. Never paste a key into
screenshots, logs, chat, issues, or copied diagnostics.

## What József Was Doing

József was using licensed Microsoft 365 desktop Excel on Windows. He opened the
add-ins UI, added a custom ribbon group, and found **My Add-ins**, but saw only
Office/Developer add-in choices and no useful upload control. He expected a
published Office Store add-in.

That report is an installation-path problem, before OilPrice code runs:

- **Upload My Add-in** is the Excel-on-the-web preview route.
- Windows desktop preview sideloading uses a trusted shared-folder catalog.
- Organization deployment uses Microsoft 365 Admin Center integrated apps.
- A public self-serve desktop path requires Microsoft Marketplace/AppSource.

## Reproduce the Web Path

1. Open [Excel on the web](https://www.office.com/launch/excel) and create a
   blank workbook.
2. Go to **Home → Add-ins → More Add-ins**.
3. Select **My Add-ins → Upload My Add-in**.
4. Browse to the repository's root `manifest.xml` and select **Upload**.
5. Confirm an **OilPrice** button appears on the ribbon.
6. Select **OilPrice** and confirm the task pane renders version, Excel runtime,
   storage, network, and last-request diagnostics.
7. Paste the authorized key, select **Save Key**, then **Test Key**.
8. Enter `=OILPRICE.PRICE("BRENT_CRUDE_USD")` in a cell.
9. Select **Refresh** in the task pane and confirm **Last request** changes from
   the task-pane test to the custom-function request.
10. Select **Copy Diagnostics** and confirm the output says
    `API key included: no`.

## Reproduce the Desktop Path

The absence of **Upload My Add-in** in desktop Excel is expected for this
preview flow. Do not tell the customer to keep searching for it.

For a personal Windows test machine:

1. Run `scripts/setup-windows-desktop-sideload.ps1 -ClearOfficeCache` as
   Administrator.
2. Close every Excel window and reopen Excel.
3. Go to **Insert → My Add-ins → Shared Folder**.
4. Select **OilPrice Excel Add-in**.
5. Repeat the save, test, formula, and copied-diagnostics checks above.

For a managed Microsoft 365 account, an administrator can upload the manifest
through **Admin Center → Settings → Integrated apps → Upload custom apps**.

## Identify the Failing Stage

| Evidence | Failing stage | Next action |
| --- | --- | --- |
| No **Upload My Add-in** in desktop Excel | Distribution/install path | Use web upload, trusted catalog, admin deployment, or AppSource |
| Manifest upload rejected | Manifest validation/tenant policy | Capture Excel's upload error and validate `manifest.xml` |
| OilPrice ribbon button absent | Registration/cache | Remove the add-in, reload the latest manifest, and reopen Excel |
| Button exists but pane is blank | Task-pane asset/runtime | Check `taskpane.html`, `taskpane.js`, Office.js, and the selected DevTools frame |
| Pane reports storage unavailable | Shared runtime/storage | Reload and confirm SharedRuntime 1.1 support |
| `NETWORK_OR_CORS` while browser is online | Browser, CORS, CSP, proxy, or extension policy | Inspect the preflight and public CORS headers; do not rotate the key |
| HTTP 401 / `AUTH_INVALID` | Authentication | Verify or replace the key |
| HTTP 402/403/429 | Entitlement/quota/rate limit | Check the account and recovery path |
| `#NAME?` | Custom functions not registered | Inspect `functions.json`, `functions.js`, manifest namespace, and cache |
| `#VALUE!` after registration | Shared runtime/function exception | Refresh diagnostics and inspect the custom-function request |

## Browser DevTools

Excel on the web produces large amounts of unrelated Microsoft and browser
extension noise. Ignore preload warnings, duplicate-icon warnings, password
manager content-script failures, and Microsoft shell requests unless they block
the OilPrice frame.

1. In **Network**, filter for `oilprice`.
2. In **Console**, select the frame beginning
   `https://oilpriceapi.github.io/excel-energy-addin/`.
3. Clear the console and rerun **Test Key**.
4. Capture only requests or errors containing `oilpriceapi`, `taskpane`,
   `functions.js`, `CORS`, or `CSP`.
5. For a CORS failure, inspect the `OPTIONS` request and compare
   `Access-Control-Request-Headers` with `Access-Control-Allow-Headers`.

The July 17, 2026 reproduction failed because the add-in requested
`x-api-client`, but Cloudflare's preflight response did not allow it. The browser
therefore blocked the GET before it reached the API. This is not a bad-key or
Excel-connectivity failure. Version 1.0.2 restores browser compatibility by
keeping cross-origin request headers to the edge-approved authorization and
content-type set. The add-in version remains available in copied diagnostics.

## Required Production Proof

- The public preflight allows `authorization` and `content-type`.
- Version 1.0.2 does not request `x-api-client`, `x-client-version`, or
  `x-excel-addin-version` from Excel Online.
- **Test Key** reports **Connected** and records an HTTP 200 diagnostic.
- `OILPRICE.PRICE` returns a number and records a custom-function diagnostic.
- Production logs contain the request at the matching diagnostic timestamp and
  no raw key.
- Copied diagnostics contain no API key or query values.
