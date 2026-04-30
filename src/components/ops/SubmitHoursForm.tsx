"use client";

import { useState } from "react";
import type { Role } from "@/types";

export function SubmitHoursForm({
  roles,
  defaultRoleId,
  action,
  loggedBy,
}: {
  roles: Role[];
  defaultRoleId: string;
  action: (formData: FormData) => Promise<void> | void;
  loggedBy: string;
}) {
  const [rows, setRows] = useState<{ roleId: string; hours: number }[]>([{ roleId: defaultRoleId, hours: 0 }]);

  function update(i: number, patch: Partial<{ roleId: string; hours: number }>) {
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  }
  function addRow() {
    setRows((r) => [...r, { roleId: defaultRoleId, hours: 0 }]);
  }
  function removeRow(i: number) {
    setRows((r) => r.filter((_, idx) => idx !== i));
  }
  const total = rows.reduce((s, r) => s + (Number(r.hours) || 0), 0);

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="loggedBy" value={loggedBy} />
      <input type="hidden" name="rowsCount" value={rows.length} />
      <div className="space-y-2">
        {rows.map((row, i) => (
          <div key={i} className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="label">Role</label>
              <select className="select" name={`roleId-${i}`} value={row.roleId} onChange={(e) => update(i, { roleId: e.target.value })}>
                {roles.map((r) => <option key={r.id} value={r.id}>{r.name} ({r.multiplier}×)</option>)}
              </select>
            </div>
            <div className="w-32">
              <label className="label">Hours</label>
              <input className="input mono" type="number" step="0.25" min="0" name={`hours-${i}`} value={row.hours} onChange={(e) => update(i, { hours: parseFloat(e.target.value || "0") })} required />
            </div>
            {rows.length > 1 ? <button type="button" className="btn btn-ghost text-xs px-2 py-1.5" onClick={() => removeRow(i)}>×</button> : null}
          </div>
        ))}
      </div>
      <button type="button" onClick={addRow} className="btn btn-ghost text-xs">+ Add another role</button>
      <div className="text-sm text-[var(--color-muted)]">Total hours: <span className="mono text-[var(--color-ink)]">{total}</span></div>
      <button className="btn btn-primary" type="submit" disabled={total <= 0}>Submit for review</button>
    </form>
  );
}
