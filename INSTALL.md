# OilPrice Excel Add-in Install Instructions

These instructions are for internal preview validation only.

Do not send them to customers until the Windows Excel runtime smoke in [ADDIN_ACTIVATION_CHECKLIST.md](ADDIN_ACTIVATION_CHECKLIST.md) is green and the customer distribution path in `#16` is selected.

## Product Position

The supported Excel path is the OilPrice Excel add-in for refreshable formulas.

Primary formulas:

```excel
=OILPRICE.PRICE("BRENT_CRUDE_USD")
=OILPRICE.PRICE(A2)
=OILPRICE.GET("/v1/prices/latest", "by_code=BRENT_CRUDE_USD")
=OILPRICE.CODES()
```

Do not use workbook exports, Power Query, `WEBSERVICE`, `FILTERXML`, VBA, or one-time snapshots as customer-primary instructions.

## Before You Start

You need:

- Windows Excel Desktop.
- A non-customer OilPriceAPI test key.
- Access to production API logs to confirm the add-in request.

Do not put the raw API key in screenshots, logs, GitHub issues, pull requests, or support replies.

## Preview Install

1. Open Windows Excel Desktop.
2. Add the add-in manifest:

   ```text
   https://oilpriceapi.github.io/excel-energy-addin/manifest.xml
   ```

3. Open the **OilPrice** task pane from the Excel ribbon.
4. Paste the non-customer test key.
5. Click **Save Key**.
6. Click **Test Key**.

Expected result:

- The pane reports `Connected` for a valid key, or a plain auth/quota/plan/rate-limit error for a non-valid key.
- The pane must not report `Key saved` if shared Excel add-in storage is unavailable.

## Formula Smoke

In a worksheet cell:

```excel
=OILPRICE.PRICE("BRENT_CRUDE_USD")
```

Expected result:

- A numeric production value for a valid key.
- A clear worksheet error string for missing key, invalid key, quota, plan, no data, network, or server failures.
- No `#NAME?`.

Then test cell-reference recalculation:

1. Put `BRENT_CRUDE_USD` in `A1`.
2. In another cell, enter:

   ```excel
   =OILPRICE.PRICE(A1)
   ```

3. Change `A1` to another supported code.
4. Recalculate.

Expected result:

- The formula updates after the referenced cell changes.

Then test the table function:

```excel
=OILPRICE.GET("/v1/prices/latest", "by_code=BRENT_CRUDE_USD")
```

Expected result:

- A readable spilled table or a clear worksheet error.

## Production Log Proof

Confirm the production API saw the add-in request:

- expected endpoint: `/v1/prices/latest`;
- expected code: `BRENT_CRUDE_USD`;
- expected header: `X-Excel-Addin-Version: 1.0.0`;
- expected user/key: the non-customer test account;
- no raw API key exposure.

## Customer Instruction Gate

Only after all preview checks pass:

1. Record the exact Excel platform that passed.
2. Record the redacted production log proof.
3. Update website/support copy to one customer path.
4. Route distribution through `#16`: AppSource, Microsoft 365 centralized deployment, or explicitly labeled preview install.

Until then, customer replies should say that we are validating the Excel add-in path and will send tested instructions when it is ready.

## Troubleshooting During Preview

| Symptom | Meaning | Action |
| --- | --- | --- |
| `#AUTH_REQUIRED` | No key is saved for formulas. | Open the OilPrice pane and save the key. |
| `#AUTH_INVALID` | The key is invalid or expired. | Use a valid non-customer test key. |
| `#UPGRADE_REQUIRED` | The key plan or quota does not cover the request. | Use an eligible test key or note the quota state. |
| `#RATE_LIMITED` | The key hit a rate limit. | Wait or use a test key with available quota. |
| `#NO_DATA` | The API returned no matching data. | Check the code/query. |
| `#NETWORK_ERROR` | Excel could not reach the API. | Check network and add-in connectivity. |
| `#SERVER_ERROR` | API returned a server error. | Check production logs before retrying. |
| `#UNSUPPORTED_ENDPOINT` | The add-in blocked the endpoint. | Use only supported MVP endpoints. |
| `#NAME?` | Excel did not load the custom function. | Do not send customer instructions; file the runtime defect on `#12`. |
