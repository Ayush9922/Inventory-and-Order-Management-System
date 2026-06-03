import Decimal from 'decimal.js';

// Define dimensions and their allowed units
export const DIMENSIONS = {
  WEIGHT: {
    baseUnit: 'g',
    units: ['g', 'kg'],
    labels: { g: 'Grams (g)', kg: 'Kilograms (kg)' },
  },
  VOLUME: {
    baseUnit: 'mL',
    units: ['mL', 'L'],
    labels: { mL: 'Milliliters (mL)', L: 'Liters (L)' },
  },
  COUNT: {
    baseUnit: 'item',
    units: ['item'],
    labels: { item: 'Items (unit)' },
  },
} as const;

export type DimensionType = keyof typeof DIMENSIONS;
export type WeightUnit = (typeof DIMENSIONS.WEIGHT.units)[number];
export type VolumeUnit = (typeof DIMENSIONS.VOLUME.units)[number];
export type CountUnit = (typeof DIMENSIONS.COUNT.units)[number];
export type SupportedUnit = WeightUnit | VolumeUnit | CountUnit;

// Conversion factors to convert a target unit into the base unit
// E.g., targetUnit * FACTOR = baseUnit
const TO_BASE_FACTORS: Record<SupportedUnit, number> = {
  g: 1,
  kg: 1000,
  mL: 1,
  L: 1000,
  item: 1,
};

/**
 * Returns the dimension type for a given unit.
 */
export function getUnitDimension(unit: string): DimensionType {
  if (DIMENSIONS.WEIGHT.units.includes(unit as any)) return 'WEIGHT';
  if (DIMENSIONS.VOLUME.units.includes(unit as any)) return 'VOLUME';
  if (DIMENSIONS.COUNT.units.includes(unit as any)) return 'COUNT';
  throw new Error(`Unsupported unit: ${unit}`);
}

/**
 * Converts a quantity from one unit to another.
 * Throws if the units belong to different dimensions.
 */
export function convertQuantity(
  quantity: number | string | Decimal,
  fromUnit: SupportedUnit,
  toUnit: SupportedUnit
): Decimal {
  const fromDim = getUnitDimension(fromUnit);
  const toDim = getUnitDimension(toUnit);

  if (fromDim !== toDim) {
    throw new Error(`Dimension mismatch: cannot convert ${fromUnit} (${fromDim}) to ${toUnit} (${toDim})`);
  }

  const q = new Decimal(quantity);
  
  // If units are the same, return quantity
  if (fromUnit === toUnit) return q;

  // Convert fromUnit to base unit, then convert base unit to toUnit
  const fromFactor = new Decimal(TO_BASE_FACTORS[fromUnit]);
  const toFactor = new Decimal(TO_BASE_FACTORS[toUnit]);

  // qty_in_base = q * fromFactor
  // qty_in_target = qty_in_base / toFactor
  return q.times(fromFactor).div(toFactor);
}

/**
 * Calculates the unit price for a target unit given the price of the base unit.
 * E.g., if price is 0.50 INR per gram (base unit), the price for kg (target unit)
 * is 0.50 * 1000 = 500.00 INR per kg.
 */
export function calculateUnitPrice(
  pricePerBaseUnit: number | string | Decimal,
  baseUnit: SupportedUnit,
  targetUnit: SupportedUnit
): Decimal {
  const baseDim = getUnitDimension(baseUnit);
  const targetDim = getUnitDimension(targetUnit);

  if (baseDim !== targetDim) {
    throw new Error(`Dimension mismatch: base unit ${baseUnit} and target unit ${targetUnit} must be in the same dimension`);
  }

  const basePrice = new Decimal(pricePerBaseUnit);
  
  if (baseUnit === targetUnit) return basePrice;

  // Since targetUnit is larger or smaller than baseUnit, the price scales accordingly.
  // E.g., 1 kg = 1000 g. So price_per_kg = price_per_g * 1000.
  // The scale factor is (targetUnit -> baseUnit conversion factor).
  // So: targetPrice = basePrice * TO_BASE_FACTORS[targetUnit] / TO_BASE_FACTORS[baseUnit]
  const targetFactor = new Decimal(TO_BASE_FACTORS[targetUnit]);
  const baseFactor = new Decimal(TO_BASE_FACTORS[baseUnit]);

  return basePrice.times(targetFactor).div(baseFactor);
}

/**
 * Validates that an ordered unit matches the product's dimension,
 * and converts the order quantity to base quantity.
 */
export function getBaseQuantityAndPrice(
  orderedQuantity: number | string | Decimal,
  orderedUnit: SupportedUnit,
  baseUnit: SupportedUnit,
  pricePerBaseUnit: number | string | Decimal
) {
  const baseQty = convertQuantity(orderedQuantity, orderedUnit, baseUnit);
  const targetPricePerUnit = calculateUnitPrice(pricePerBaseUnit, baseUnit, orderedUnit);
  const subtotal = baseQty.times(new Decimal(pricePerBaseUnit));
  
  return {
    baseQuantity: baseQty,
    pricePerUnit: targetPricePerUnit,
    subtotal: subtotal,
  };
}
