# OilPrice Excel Add-in Activation Checklist

Use this checklist before publishing customer setup instructions or linking the add-in as the primary Excel path.

## Repository Proof

- `npm test -- --runInBand` passes.
- `npm run build` passes.
- `npx office-addin-manifest validate manifest.xml` passes.
- Hosted `manifest.xml`, `functions.json`, `functions.js`, and `taskpane.html` return HTTP 200 after deploy.
- Public copy avoids unverified AppSource, workbook export, Power Query, `WEBSERVICE`/`FILTERXML`, macro, unlimited, realtime, SOC 2, 99.9 SLA, and unsupported coverage claims.

## Windows Excel Desktop Smoke

Run this with a non-customer test API key. Do not paste the key in logs, screenshots, issues, or PRs.

1. Install or sideload `manifest.xml` in Windows Excel Desktop.
2. Confirm the OilPrice task pane opens from the ribbon.
3. Paste the test API key, click **Save Key**, and confirm the pane reports `Key saved`.
4. Click **Test Key** and confirm a plain success or plain quota/plan/rate-limit/auth error.
5. Enter `=OILPRICE.PRICE("BRENT_CRUDE_USD")` and confirm it returns a numeric production value for a valid key.
6. Put `BRENT_CRUDE_USD` in a worksheet cell, enter `=OILPRICE.PRICE(A1)`, then change the symbol cell and confirm the formula recalculates.
7. Enter `=OILPRICE.GET("/v1/prices/latest","by_code=BRENT_CRUDE_USD")` and confirm it spills a readable table or a plain worksheet error.
8. Confirm production API logs show the expected add-in request with `X-Excel-Addin-Version: 1.0.0`.
9. Confirm no formula shows `#NAME?` after reload, workbook save/reopen, and recalculation.

## Customer Instructions Gate

Customer instructions are blocked until the Windows Excel Desktop smoke passes. Supported-platform copy should state the exact tested Excel platforms and any unsupported Mac, web, or mobile limitations from that smoke.
