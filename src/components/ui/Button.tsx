import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentPropsWithoutRef, ReactNode } from "react";

type Variant = "primary" | "ghost" | "danger";
type Size = "sm" | "md";

interface CommonProps {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
  className?: string;
}

function classes(variant: Variant = "primary", size: Size = "md", extra = ""): string {
  const base = variant === "primary" ? "btn btn-primary" : variant === "danger" ? "btn btn-danger" : "btn btn-ghost";
  const sized = size === "sm" ? "text-xs px-3 py-1.5" : "";
  return `${base} ${sized} ${extra}`.trim();
}

interface ButtonProps extends CommonProps, Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "className"> {}

export function Button({ variant, size, children, className, ...rest }: ButtonProps) {
  return (
    <button className={classes(variant, size, className)} {...rest}>
      {children}
    </button>
  );
}

interface LinkButtonProps extends CommonProps, Omit<ComponentPropsWithoutRef<typeof Link>, "children" | "className"> {}

export function LinkButton({ variant, size, children, className, ...rest }: LinkButtonProps) {
  return (
    <Link className={classes(variant, size, className)} {...rest}>
      {children}
    </Link>
  );
}
