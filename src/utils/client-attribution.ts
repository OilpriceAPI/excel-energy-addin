export const OILPRICEAPI_EXCEL_VERSION = "1.0.0";
export const OILPRICEAPI_EXCEL_CLIENT = `oilpriceapi-excel/${OILPRICEAPI_EXCEL_VERSION}`;

export function oilpriceAttributionHeaders(): Record<string, string> {
  return {
    "X-Api-Client": OILPRICEAPI_EXCEL_CLIENT,
    "X-Client-Version": OILPRICEAPI_EXCEL_VERSION,
    "X-Excel-Addin-Version": OILPRICEAPI_EXCEL_VERSION,
  };
}
