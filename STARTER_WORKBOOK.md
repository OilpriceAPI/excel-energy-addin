# Starter Workbook Backlog Note

The generated starter workbook is no longer the customer-facing Excel path.

Current product direction is the OilPrice Excel add-in with refreshable formulas:

- `=OILPRICE.PRICE("BRENT_CRUDE_USD")`
- `=OILPRICE.PRICE(A2)`
- `=OILPRICE.GET("/v1/prices/latest", "by_code=BRENT_CRUDE_USD")`

The workbook generator and validator may remain in the repository as historical/internal tooling, but customer onboarding, support copy, and public setup instructions should point to the add-in after the add-in MVP passes Windows Excel production smoke.
