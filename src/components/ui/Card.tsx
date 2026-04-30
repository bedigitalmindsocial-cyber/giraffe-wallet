import type { ReactNode } from "react";

export function Card({ children, className = "", padded = true }: { children: ReactNode; className?: string; padded?: boolean }) {
  return <div className={`card ${padded ? "p-5" : ""} ${className}`}>{children}</div>;
}

export function CardHeader({ title, eyebrow, action, children }: { title?: ReactNode; eyebrow?: ReactNode; action?: ReactNode; children?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 mb-4">
      <div>
        {eyebrow ? <div className="eyebrow mb-1">{eyebrow}</div> : null}
        {title ? <h2 className="display text-2xl">{title}</h2> : null}
        {children}
      </div>
      {action}
    </div>
  );
}
