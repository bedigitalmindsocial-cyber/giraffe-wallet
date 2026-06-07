// Credit cost calculation. Single source of truth for the v2 pricing formula.

import type { Service } from "@/types";

export function computeCreditCost(
  service: Pick<Service, 'pricingModel' | 'creditsPerUnit' | 'tierThreshold' | 'tierCreditsPerUnit'>,
  quantity: number,
): number {
  if (service.pricingModel === 'flat') return service.creditsPerUnit;
  if (service.tierThreshold && quantity > service.tierThreshold) {
    const base = service.tierThreshold * service.creditsPerUnit;
    const extra = (quantity - service.tierThreshold) * (service.tierCreditsPerUnit ?? service.creditsPerUnit);
    return Math.ceil(base + extra);
  }
  return Math.ceil(quantity * service.creditsPerUnit);
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
