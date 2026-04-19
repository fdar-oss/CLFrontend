/**
 * Unit conversion for inventory.
 * Converts a quantity from one unit to another (e.g. 10g → 0.01kg).
 * Returns null if units are incompatible (e.g. g → ml).
 */

// Conversion factors to a base unit per family
// Weight family: base = g
// Volume family: base = ml
// Count family: base = pcs

const TO_BASE: Record<string, { family: string; factor: number }> = {
  // Weight
  g:     { family: 'weight', factor: 1 },
  kg:    { family: 'weight', factor: 1000 },
  mg:    { family: 'weight', factor: 0.001 },
  lb:    { family: 'weight', factor: 453.592 },
  oz:    { family: 'weight', factor: 28.3495 },
  // Volume
  ml:    { family: 'volume', factor: 1 },
  L:     { family: 'volume', factor: 1000 },
  cl:    { family: 'volume', factor: 10 },
  // Count
  pcs:   { family: 'count', factor: 1 },
  dozen: { family: 'count', factor: 12 },
  // Packaging (treated as count)
  bag:   { family: 'pkg', factor: 1 },
  box:   { family: 'pkg', factor: 1 },
  can:   { family: 'pkg', factor: 1 },
};

/**
 * Convert `qty` from `fromUnit` to `toUnit`.
 * Returns the converted quantity, or null if incompatible.
 */
export function convertUnit(qty: number, fromUnit: string, toUnit: string): number | null {
  if (fromUnit === toUnit) return qty;

  const from = TO_BASE[fromUnit];
  const to = TO_BASE[toUnit];

  if (!from || !to) return null; // unknown unit
  if (from.family !== to.family) return null; // incompatible (e.g. g → ml)

  // Convert: fromUnit → base → toUnit
  const baseQty = qty * from.factor;
  return baseQty / to.factor;
}

/**
 * Get the cost of using `recipeQty` of `recipeUnit` when the stock item
 * is priced at `unitCost` per `stockUnit`.
 *
 * Example: recipeQty=10, recipeUnit='g', stockUnit='kg', unitCost=6950
 *          → converts 10g to 0.01kg → 0.01 × 6950 = ₨69.50
 */
export function ingredientCost(
  recipeQty: number,
  recipeUnit: string,
  stockUnit: string,
  unitCost: number,
  wasteFactor = 1,
): number {
  const converted = convertUnit(recipeQty, recipeUnit, stockUnit);
  if (converted === null) {
    // Fallback: assume same unit (no conversion available)
    return recipeQty * wasteFactor * unitCost;
  }
  return converted * wasteFactor * unitCost;
}
