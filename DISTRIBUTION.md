# Excel Add-in Distribution Runbook

This runbook is internal until the runtime and distribution gates are green.

Do not send this document to customers. Do not claim AppSource, Marketplace, customer-ready status, broad endpoint coverage, realtime data, SOC 2, uptime, or unsupported platform availability from this runbook.

## Current State

- Customer-primary spreadsheet path: OilPrice Excel add-in with refreshable formulas.
- Internal preview install: manifest sideload only.
- Runtime gate: [ADDIN_ACTIVATION_CHECKLIST.md](ADDIN_ACTIVATION_CHECKLIST.md).
- Customer distribution tracker: `excel-energy-addin#16`.
- Public self-serve install is not available until Microsoft distribution is complete.

## Release Gates

All gates must be green before support or marketing sends customer install instructions.

1. Windows Excel runtime proof passes:
   - add-in loads without `#NAME?`;
   - task pane saves and tests a valid non-customer key;
   - `OILPRICE.PRICE` returns production data;
   - cell-reference recalc works after symbol change;
   - `OILPRICE.GET` returns a readable table;
   - production logs show `X-Excel-Addin-Version: 1.0.0`;
   - no raw API key appears in logs, screenshots, GitHub, or support text.
2. Hosted assets pass:
   - `manifest.xml`, `functions.json`, `functions.js`, and `taskpane.html` return HTTP 200;
   - `npm test -- --runInBand` passes;
   - `npm run build` passes;
   - manifest validation passes.
3. Distribution path is selected for the audience:
   - managed customer: Microsoft 365 admin centralized deployment;
   - public self-serve: Microsoft Marketplace/AppSource after approval;
   - preview tester: explicitly labeled preview sideload, only with founder approval.
4. Support copy is approved:
   - one install path only;
   - no workbook, Power Query, `WEBSERVICE`, `FILTERXML`, VBA, XML, or one-time export instructions;
   - formula examples match the shipped function metadata;
   - troubleshooting maps to actual worksheet errors.

## Managed Customer Path

Use this for organizations with Microsoft 365 administration.

Owner: customer admin, supported by OilPrice support.

Preparation:

- Confirm the customer has a Microsoft 365 admin who can deploy Office add-ins.
- Provide the approved manifest URL only after runtime proof:

  ```text
  https://oilpriceapi.github.io/excel-energy-addin/manifest.xml
  ```

- Provide the exact tested Excel platforms.
- Provide the approved support script.

Validation:

- Customer admin deploys the add-in through Microsoft 365 admin-center integrated apps or centralized deployment.
- A user opens Excel, starts the OilPrice task pane, saves their API key, and runs:

  ```excel
  =OILPRICE.PRICE("BRENT_CRUDE_USD")
  =OILPRICE.GET("/v1/prices/latest", "by_code=BRENT_CRUDE_USD")
  ```

- Support confirms the customer sees a value or a clear worksheet error.

## Public Self-Serve Path

Use this only after Microsoft Marketplace/AppSource approval.

Owner: product/marketing, with support review.

Required package:

- Current manifest.
- Production support URL and privacy URL.
- Store name and description that do not claim unproven platform support, uptime, SOC 2, realtime freshness, broad endpoint coverage, or customer logos.
- Screenshots from the proven runtime path.
- Test notes for Microsoft review that use a non-customer test key.
- Support article with one install path and exact formulas.

Customer-facing copy after approval:

- "Install the OilPrice Excel add-in."
- "Save your OilPriceAPI key in the OilPrice pane."
- "Use `OILPRICE.PRICE` for a current price by commodity code."
- "Use `OILPRICE.GET` for supported OilPriceAPI GET endpoints."

Do not use "all endpoints" unless a catalog-backed support matrix is published and tested.

## Preview Tester Path

Use this only when the founder explicitly approves a preview sideload.

Rules:

- Label it as preview validation.
- Send one tested path only.
- Include the exact platform tested.
- Ask for the worksheet error text and diagnostics if it fails.
- Do not call it AppSource, Marketplace, public install, or generally available.

## Support Script

Use only after #12 and #16 gates clear.

```
We have a tested OilPrice Excel add-in path for refreshable formulas.

Install the add-in using the approved install path, open the OilPrice pane, save your API key, and try:

=OILPRICE.PRICE("BRENT_CRUDE_USD")
=OILPRICE.GET("/v1/prices/latest", "by_code=BRENT_CRUDE_USD")

If Excel shows an error, send us the exact cell text and the diagnostics from the OilPrice pane. Do not paste your API key into the worksheet or email.
```

## Blocked Claims

Do not use these in support, website, AppSource, or marketing copy until separately proven:

- AppSource or Marketplace availability before listing approval.
- All endpoints or unlimited endpoint support.
- Live, realtime, streaming, always fresh, or guaranteed freshness.
- SOC 2, SLA, 99.9%, or uptime claims.
- Customer logos, testimonials, or named customer workflows.
- Marine/BYOS/source-rights coverage beyond proven customer-specific source truth.
- Mac, Excel Online, iPad, or perpetual Office support unless that exact platform has runtime proof.

## Post-Launch Watch

Track:

- installs;
- task-pane key-save success;
- first successful formula call;
- common worksheet errors;
- support tickets per install;
- API errors with `X-Excel-Addin-Version`.

Escalate if support tickets per install are nonzero for the same setup step.
