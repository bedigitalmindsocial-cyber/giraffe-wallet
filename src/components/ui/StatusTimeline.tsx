import type { TaskStatus } from "@/types";

const STEPS: { key: TaskStatus | "approved"; label: string }[] = [
  { key: "quoted", label: "Quoted" },
  { key: "approved", label: "Approved" },
  { key: "in_progress", label: "In progress" },
  { key: "submitted", label: "Submitted" },
  { key: "done", label: "Done" },
];

function indexFor(s: TaskStatus): number {
  switch (s) {
    case "quoted":
      return 0;
    case "approved":
      return 1;
    case "in_progress":
      return 2;
    case "submitted":
    case "revision":
      return 3;
    case "done":
      return 4;
    case "cancelled":
      return -1;
  }
}

export function StatusTimeline({ status }: { status: TaskStatus }) {
  if (status === "cancelled") {
    return <div className="chip chip-danger">Cancelled</div>;
  }
  const current = indexFor(status);
  return (
    <ol className="flex items-center gap-2">
      {STEPS.map((step, i) => {
        const done = i <= current;
        const isCurrent = i === current;
        return (
          <li key={step.key} className="flex items-center gap-2">
            <div
              className="flex items-center justify-center rounded-full text-xs"
              style={{
                width: 24,
                height: 24,
                background: done ? "var(--color-purple)" : "var(--color-line)",
                color: done ? "var(--color-paper)" : "var(--color-muted)",
                fontFamily: "var(--font-mono)",
              }}
            >
              {i + 1}
            </div>
            <div className={isCurrent ? "text-[var(--color-purple-dark)] font-medium text-sm" : "text-[var(--color-muted)] text-sm"}>{step.label}{status === "revision" && i === 3 ? " (revision)" : ""}</div>
            {i < STEPS.length - 1 ? <div className="h-px w-6" style={{ background: "var(--color-line)" }} /> : null}
          </li>
        );
      })}
    </ol>
  );
}
