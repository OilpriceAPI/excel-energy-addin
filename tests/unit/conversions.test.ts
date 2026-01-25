import {
  convertToMBtu,
  convertFromMBtu,
  getHeatContent,
  CommodityType,
} from "../../src/utils/conversions";

describe("Energy Unit Conversions", () => {
  describe("convertToMBtu", () => {
    test("converts Brent crude barrel to $/MBtu", () => {
      // $85.50/barrel ÷ 5.8 MMBtu/barrel = $14.74/MBtu
      const result = convertToMBtu(85.5, "barrel", 5.8);
      expect(result).toBeCloseTo(14.74, 2);
    });

    test("converts WTI crude barrel to $/MBtu", () => {
      // $82.00/barrel ÷ 5.8 MMBtu/barrel = $14.14/MBtu
      const result = convertToMBtu(82.0, "barrel", 5.8);
      expect(result).toBeCloseTo(14.14, 2);
    });

    test("converts natural gas Mcf to $/MBtu", () => {
      // $3.40/Mcf ÷ 1.037 MMBtu/Mcf = $3.28/MBtu
      const result = convertToMBtu(3.4, "Mcf", 1.037);
      expect(result).toBeCloseTo(3.28, 2);
    });

    test("converts bituminous coal tonne to $/MBtu", () => {
      // $120.00/tonne ÷ 24 MMBtu/tonne = $5.00/MBtu
      const result = convertToMBtu(120.0, "tonne", 24);
      expect(result).toBeCloseTo(5.0, 2);
    });

    test("throws error for invalid heat content", () => {
      expect(() => convertToMBtu(100, "barrel", 0)).toThrow(
        "Conversion factor must be positive",
      );
    });

    test("throws error for negative price", () => {
      expect(() => convertToMBtu(-50, "barrel", 5.8)).toThrow(
        "Price must be non-negative",
      );
    });
  });

  describe("convertFromMBtu", () => {
    test("converts $/MBtu to Brent crude barrel price", () => {
      // $14.74/MBtu × 5.8 MMBtu/barrel = $85.49/barrel
      const result = convertFromMBtu(14.74, "barrel", 5.8);
      expect(result).toBeCloseTo(85.49, 2);
    });

    test("converts $/MBtu to natural gas Mcf price", () => {
      // $3.28/MBtu × 1.037 MMBtu/Mcf = $3.40/Mcf
      const result = convertFromMBtu(3.28, "Mcf", 1.037);
      expect(result).toBeCloseTo(3.4, 2);
    });

    test("throws error for invalid heat content", () => {
      expect(() => convertFromMBtu(10, "barrel", 0)).toThrow(
        "Heat content must be positive",
      );
    });

    test("throws error for negative price", () => {
      expect(() => convertFromMBtu(-5, "barrel", 5.8)).toThrow(
        "Price must be non-negative",
      );
    });
  });

  describe("getHeatContent", () => {
    test("returns correct heat content for Brent crude", () => {
      expect(getHeatContent("BRENT_CRUDE_OIL")).toBe(5.8);
    });

    test("returns correct heat content for WTI crude", () => {
      expect(getHeatContent("WTI_CRUDE_OIL")).toBe(5.8);
    });

    test("returns correct heat content for natural gas", () => {
      expect(getHeatContent("NATURAL_GAS")).toBe(1.037);
    });

    test("returns correct heat content for bituminous coal", () => {
      expect(getHeatContent("COAL_BITUMINOUS")).toBe(24);
    });

    test("returns correct heat content for sub-bituminous coal", () => {
      expect(getHeatContent("COAL_SUB_BITUMINOUS")).toBe(17);
    });

    test("returns correct heat content for LNG", () => {
      expect(getHeatContent("LNG")).toBe(51.6);
    });

    test("throws error for unknown commodity", () => {
      expect(() => getHeatContent("UNKNOWN" as CommodityType)).toThrow(
        "Unknown commodity type",
      );
    });
  });
});
