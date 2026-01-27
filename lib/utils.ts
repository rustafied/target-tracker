import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ============================================================================
// MOA (Minute of Angle) Conversion Utilities
// ============================================================================

/**
 * Convert a measurement in inches to MOA (Minutes of Angle) at a given distance
 * 1 MOA = approximately 1.047 inches at 100 yards
 * @param measurementInches - The measurement in inches (e.g., mean radius, group size)
 * @param distanceYards - The distance in yards
 * @returns MOA value
 */
export function convertToMOA(measurementInches: number, distanceYards: number): number {
  if (distanceYards === 0) return 0;
  return (measurementInches / distanceYards) * 95.5; // 1 MOA ≈ 1.047" at 100yd, so 100/1.047 ≈ 95.5
}

/**
 * Convert target coordinate units to inches
 * Target coordinates are in 0-200 space
 * @param targetUnits - Value in target coordinate space (0-200)
 * @param targetDiameterInches - Physical diameter of the target in inches
 * @returns Measurement in inches
 */
export function targetUnitsToInches(targetUnits: number, targetDiameterInches: number): number {
  return (targetUnits / 200) * targetDiameterInches;
}

/**
 * Standard target diameter lookup
 * Returns approximate diameters for common target types
 */
export const STANDARD_TARGET_DIAMETERS: Record<string, number> = {
  'B-8': 10.5,           // B-8 bullseye target (10.5" center)
  'IPSC': 11,            // IPSC A-zone width
  'NRA-SR-1': 7,         // Small bore rifle
  'SR-21': 6.5,          // 50-foot pistol target
  'default': 10.5,       // Default assumption
};

/**
 * Get MOA from target coordinate mean radius
 * @param meanRadiusTargetUnits - Mean radius in target coordinate space (0-200)
 * @param distanceYards - Distance in yards
 * @param targetDiameterInches - Physical target diameter (defaults to 10.5" B-8 standard)
 * @returns MOA value
 */
export function meanRadiusToMOA(
  meanRadiusTargetUnits: number, 
  distanceYards: number,
  targetDiameterInches: number = STANDARD_TARGET_DIAMETERS.default
): number {
  const radiusInches = targetUnitsToInches(meanRadiusTargetUnits, targetDiameterInches);
  return convertToMOA(radiusInches, distanceYards);
}

// ============================================================================
// Number Formatting Utilities
// ============================================================================

/**
 * Format a number to 2 decimal places (standard for most metrics)
 */
export function formatDecimal(value: number | undefined | null): string {
  if (value === undefined || value === null || isNaN(value)) return "0.00";
  return value.toFixed(2);
}

/**
 * Format a currency value to 2 decimal places
 */
export function formatCurrency(value: number | undefined | null): string {
  if (value === undefined || value === null || isNaN(value)) return "$0.00";
  return `$${value.toFixed(2)}`;
}
