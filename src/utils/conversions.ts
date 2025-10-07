/**
 * Energy unit conversion utilities
 *
 * Standard heat content factors (MMBtu per unit):
 * - Crude oil (Brent, WTI): 5.8 MMBtu/barrel
 * - Natural gas: 1.037 MMBtu/Mcf
 * - Coal (bituminous): 24 MMBtu/tonne
 * - Coal (sub-bituminous): 17 MMBtu/tonne
 * - LNG: 51.6 MMBtu/tonne
 * - Diesel/Gasoil: 5.77 MMBtu/barrel
 * - Gasoline: 5.05 MMBtu/barrel
 */

export type CommodityType =
  | 'BRENT_CRUDE_OIL'
  | 'WTI_CRUDE_OIL'
  | 'NATURAL_GAS'
  | 'COAL_BITUMINOUS'
  | 'COAL_SUB_BITUMINOUS'
  | 'LNG'
  | 'DIESEL'
  | 'GASOLINE';

export type UnitType = 'barrel' | 'Mcf' | 'tonne' | 'MBtu' | 'therm' | 'MWh';

/**
 * Standard heat content values for common energy commodities
 */
const HEAT_CONTENT_MAP: Record<CommodityType, number> = {
  BRENT_CRUDE_OIL: 5.8,
  WTI_CRUDE_OIL: 5.8,
  NATURAL_GAS: 1.037,
  COAL_BITUMINOUS: 24,
  COAL_SUB_BITUMINOUS: 17,
  LNG: 51.6,
  DIESEL: 5.77,
  GASOLINE: 5.05
};

/**
 * Get standard heat content for a commodity type
 * @param commodity The commodity type
 * @returns Heat content in MMBtu per unit
 * @throws Error if commodity type is unknown
 */
export function getHeatContent(commodity: CommodityType): number {
  const heatContent = HEAT_CONTENT_MAP[commodity];
  if (heatContent === undefined) {
    throw new Error(`Unknown commodity type: ${commodity}`);
  }
  return heatContent;
}

/**
 * Unit-specific conversion factors to MMBtu
 */
const UNIT_TO_MMBTU: Record<UnitType, number> = {
  'barrel': 1,   // Will use commodity-specific value (oil/diesel)
  'Mcf': 1.037,  // Thousand cubic feet → MMBtu
  'therm': 0.1,  // Therm → MMBtu (1 therm = 0.1 MMBtu)
  'MWh': 3.412,  // Megawatt-hour → MMBtu
  'tonne': 1,    // Will use commodity-specific value (coal/LNG)
  'MBtu': 1      // Already in MMBtu (no conversion needed)
};

/**
 * Convert price per unit to price per MBtu
 * @param price Price per original unit (e.g., $/barrel)
 * @param unit Original unit type
 * @param heatContent Heat content in MMBtu per unit (for barrel/tonne)
 * @returns Price per MBtu
 * @throws Error if inputs are invalid
 */
export function convertToMBtu(
  price: number,
  unit: UnitType,
  heatContent: number
): number {
  if (price < 0) {
    throw new Error('Price must be non-negative');
  }

  // For standard units (Mcf, therm, MWh), use predefined conversion factors
  // For commodity-specific units (barrel, tonne), use provided heat content
  const conversionFactor = (unit === 'barrel' || unit === 'tonne')
    ? heatContent
    : UNIT_TO_MMBTU[unit];

  if (conversionFactor <= 0) {
    throw new Error('Conversion factor must be positive');
  }

  // Formula: Price per MBtu = Price per unit ÷ Conversion factor (MMBtu/unit)
  return price / conversionFactor;
}

/**
 * Convert price per MBtu to price per unit
 * @param pricePerMBtu Price per MBtu
 * @param unit Target unit type
 * @param heatContent Heat content in MMBtu per unit
 * @returns Price per unit
 */
export function convertFromMBtu(
  pricePerMBtu: number,
  unit: UnitType,
  heatContent: number
): number {
  if (pricePerMBtu < 0) {
    throw new Error('Price must be non-negative');
  }

  if (heatContent <= 0) {
    throw new Error('Heat content must be positive');
  }

  // Formula: Price per unit = Price per MBtu × Heat content (MMBtu/unit)
  return pricePerMBtu * heatContent;
}
