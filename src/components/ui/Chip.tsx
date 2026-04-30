import type { ReactNode } from "react";

type Variant = "default" | "purple" | "success" | "warning" | "danger";

export function Chip({ children, variant = "default", className = "" }: { children: ReactNode; variant?: Variant; className?: string }) {
  const cls = variant === "default" ? "chip" : `chip chip-${variant}`;
  return <span className={`${cls} ${className}`}>{children}</span>;
}
