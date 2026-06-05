import type { ServiceMethodTag } from "@/types";

export const METHOD_TAG_OPTIONS: {
  value: Exclude<ServiceMethodTag, null>;
  label: string;
  compactLabel: string;
  description: string;
}[] = [
  {
    value: "AI POWERED",
    label: "AI-Powered, Human-Polished",
    compactLabel: "AI Accelerated",
    description: "AI does the fast baseline work, then an expert reviews, refines, and checks brand fit.",
  },
  {
    value: "HYBRID",
    label: "AI-Assisted, Expert-Crafted",
    compactLabel: "Hybrid",
    description: "AI handles the heavy lifting while a manager shapes the strategy, structure, and polish.",
  },
  {
    value: "ARTISAN",
    label: "100% Artisan Crafted",
    compactLabel: "Artisan",
    description: "Senior experts craft the work from start to finish for strategy, nuance, and originality.",
  },
];

export function getMethodTagMeta(methodTag: ServiceMethodTag) {
  if (!methodTag) return null;
  return METHOD_TAG_OPTIONS.find((option) => option.value === methodTag) ?? null;
}
