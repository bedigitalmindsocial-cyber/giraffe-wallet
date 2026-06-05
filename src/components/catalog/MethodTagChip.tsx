import { Chip } from "@/components/ui/Chip";
import { getMethodTagMeta } from "@/lib/method-tags";
import type { ServiceMethodTag } from "@/types";

export function MethodTagChip({
  methodTag,
  compact = false,
  className = "",
}: {
  methodTag: ServiceMethodTag;
  compact?: boolean;
  className?: string;
}) {
  const meta = getMethodTagMeta(methodTag);
  if (!meta) return null;
  const variant = methodTag === "ARTISAN" ? "success" : methodTag === "HYBRID" ? "warning" : "purple";
  return (
    <Chip variant={variant} className={className}>
      {compact ? meta.compactLabel : meta.label}
    </Chip>
  );
}
