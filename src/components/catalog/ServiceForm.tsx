"use client";

import { useMemo, useState } from "react";
import { autoCreditCost, formulaBreakdown } from "@/lib/credits";
import type { Role, Service, Settings } from "@/types";

export function ServiceForm({
  initial,
  roles,
  settings,
  action,
}: {
  initial?: Partial<Service>;
  roles: Role[];
  settings: Settings;
  action: (formData: FormData) => Promise<void> | void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [category, setCategory] = useState(initial?.category ?? "");
  const [defaultRoleId, setDefaultRoleId] = useState(initial?.defaultRoleId ?? roles[0]?.id ?? "");
  const [avgHours, setAvgHours] = useState<number>(initial?.avgHours ?? 1);
  const [includedRevisions, setIncludedRevisions] = useState<number>(initial?.includedRevisions ?? 2);
  const [tag, setTag] = useState<string>(initial?.tag ?? "");
  const [override, setOverride] = useState<boolean>(!!initial?.creditCostOverride);
  const [creditCost, setCreditCost] = useState<number>(initial?.creditCost ?? 0);
  const [overrideReason, setOverrideReason] = useState(initial?.creditCostOverrideReason ?? "");

  const selectedRole = roles.find((r) => r.id === defaultRoleId);
  const auto = useMemo(() => (selectedRole ? autoCreditCost(avgHours, selectedRole.multiplier, settings) : 0), [avgHours, selectedRole, settings]);
  const formula = useMemo(() => (selectedRole ? formulaBreakdown(avgHours, selectedRole.multiplier, settings) : ""), [avgHours, selectedRole, settings]);

  const effectiveCost = override ? creditCost : auto;

  return (
    <form action={action} className="grid gap-6 md:grid-cols-3">
      <div className="md:col-span-2 space-y-4">
        <div>
          <label className="label">Name</label>
          <input className="input" name="name" required value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        <div>
          <label className="label">Description</label>
          <textarea className="textarea" name="description" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Category</label>
            <input className="input" name="category" required value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Social, Design, Content..." />
          </div>
          <div>
            <label className="label">Default role</label>
            <select className="select" name="defaultRoleId" value={defaultRoleId} onChange={(e) => setDefaultRoleId(e.target.value)}>
              {roles.map((r) => <option key={r.id} value={r.id}>{r.name} ({r.multiplier}×)</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Average hours</label>
            <input className="input mono" type="number" step="0.25" min="0.25" name="avgHours" value={avgHours} onChange={(e) => setAvgHours(parseFloat(e.target.value || "0"))} />
          </div>
          <div>
            <label className="label">Included revisions</label>
            <input className="input mono" type="number" min="0" name="includedRevisions" value={includedRevisions} onChange={(e) => setIncludedRevisions(parseInt(e.target.value || "0"))} />
          </div>
        </div>

        <div>
          <label className="label">Tag</label>
          <div className="flex gap-2 flex-wrap">
            {[
              { v: "", l: "None" },
              { v: "NEW", l: "NEW" },
              { v: "POPULAR", l: "POPULAR" },
              { v: "PROMO", l: "PROMO" },
              { v: "DISCONTINUED", l: "DISCONTINUED" },
            ].map((t) => (
              <label key={t.v} className={`chip cursor-pointer ${tag === t.v ? "chip-purple" : ""}`}>
                <input type="radio" name="tag" value={t.v} checked={tag === t.v} onChange={(e) => setTag(e.target.value)} className="hidden" />
                {t.l}
              </label>
            ))}
          </div>
          {tag === "DISCONTINUED" ? <p className="help">Discontinued services are hidden from new task creation but kept for history. Active will be set to off.</p> : null}
        </div>

        <div className="space-y-2 border-t border-[var(--color-line)] pt-4">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="creditCostOverride" checked={override} onChange={(e) => setOverride(e.target.checked)} />
            Override the auto-calculated credit cost
          </label>
          {override ? (
            <>
              <div>
                <label className="label">Credit cost (override)</label>
                <input className="input mono" type="number" min="1" name="creditCost" value={creditCost} onChange={(e) => setCreditCost(parseInt(e.target.value || "0"))} />
              </div>
              <div>
                <label className="label">Override reason</label>
                <textarea className="textarea" name="creditCostOverrideReason" required value={overrideReason} onChange={(e) => setOverrideReason(e.target.value)} placeholder="Why does this service deviate from the formula?" />
              </div>
            </>
          ) : null}
        </div>

        <div className="flex gap-3 pt-2">
          <button className="btn btn-primary" type="submit" name="next" value="back">Save</button>
          <button className="btn btn-ghost" type="submit" name="next" value="new">Save & New</button>
          <a className="btn btn-ghost" href="/catalog/services">Cancel</a>
        </div>
      </div>

      <aside className="space-y-4">
        <div className="card p-4 bg-[var(--color-paper-warm)]">
          <div className="eyebrow mb-2">Live preview</div>
          <div className="mono text-3xl text-[var(--color-purple-dark)]">{effectiveCost} credits</div>
          {!override ? (
            <p className="help mt-2">Auto-calculated: {formula}</p>
          ) : (
            <p className="help mt-2">Override active. Auto would be {auto} credits ({formula}).</p>
          )}
          <div className="mt-3 text-xs text-[var(--color-muted)]">
            Equivalent revenue: <span className="mono">₹{(effectiveCost * settings.creditValue).toLocaleString("en-IN")}</span>
          </div>
        </div>

        <div className="card p-4">
          <div className="eyebrow mb-2">Pricing settings</div>
          <ul className="text-sm space-y-1">
            <li>Base rate: <span className="mono">₹{settings.baseHourlyRate}/h</span></li>
            <li>Markup: <span className="mono">{settings.markupMultiplier}×</span></li>
            <li>Credit value: <span className="mono">₹{settings.creditValue}</span></li>
          </ul>
        </div>
      </aside>
    </form>
  );
}
