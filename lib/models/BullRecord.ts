/**
 * BullRecord - Backward Compatibility Layer
 * 
 * This file re-exports AimPointRecord with the old BullRecord interface
 * for backward compatibility. All new code should use AimPointRecord directly.
 * 
 * @deprecated Use AimPointRecord instead
 */

export type { IShotPosition, IBullRecord } from "./AimPointRecord";
export { BullRecord } from "./AimPointRecord";

