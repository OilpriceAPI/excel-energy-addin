# Quick Install Status

The OilPrice Excel add-in is in preview validation. Do not send this page as customer setup instructions until the Windows Excel runtime smoke in [ADDIN_ACTIVATION_CHECKLIST.md](ADDIN_ACTIVATION_CHECKLIST.md) is green.

## Current Preview Path

Use this only for internal validation:

1. Open Windows Excel Desktop.
2. Add the manifest from:

   ```text
   https://oilpriceapi.github.io/excel-energy-addin/manifest.xml
   ```

3. Open the **OilPrice** task pane.
4. Save and test a non-customer API key.
5. In a cell, try:

   ```excel
   =OILPRICE.PRICE("BRENT_CRUDE_USD")
   ```

6. Put `BRENT_CRUDE_USD` in `A1`, then try:

   ```excel
   =OILPRICE.PRICE(A1)
   ```

7. Change `A1` to another supported code and confirm the formula recalculates.

## Not Customer-Ready Yet

Customer instructions stay blocked until we have:

- no `#NAME?` in Windows Excel;
- a successful key save/test;
- production API log proof;
- formula recalculation after a symbol change;
- a selected install path for customers.

Use [INSTALL.md](INSTALL.md) for the full internal validation flow.
