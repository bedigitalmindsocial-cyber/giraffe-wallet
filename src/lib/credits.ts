// Credit cost calculation. Single source of truth for the formula.
// auto = ceil(avg_hours × multiplier × baseHourlyRate × markupMultiplier / creditValue)

import type { Settings } from "@/types";

export function autoCreditCost(
  avgHours: number,
  multiplier: number,
  s: Pick<Settings, "baseHourlyRate" | "markupMultiplier" | "creditValue">,
): number {
  const rupees = avgHours * multiplier * s.baseHourlyRate * s.markupMultiplier;
  return Math.max(1, Math.ceil(rupees / s.creditValue));
}

export function formulaBreakdown(
  avgHours: number,
  multiplier: number,
  s: Pick<Settings, "baseHourlyRate" | "markupMultiplier" | "creditValue">,
): string {
  return `${avgHours}h × ${multiplier} × ₹${s.baseHourlyRate} × ${s.markupMultiplier} ÷ ₹${s.creditValue}`;
}

// Internal cost in INR for a given hours mix. Used by efficiency reports.
// hoursByMultiplier = [{ hours, multiplier }, ...]
export function internalCostInr(
  hoursByMultiplier: { hours: number; multiplier: number }[],
  baseHourlyRate: number,
): number {
  return hoursByMultiplier.reduce(
    (sum, row) => sum + row.hours * row.multiplier * baseHourlyRate,
    0,
  );
}
