"use client";

import { useMemo, useState } from "react";
import type { EngagementBalance, Service } from "@/types";

export function TaskNewForm({
  services,
  balance,
  action,
}: {
  services: Service[];
  balance: EngagementBalance;
  action: (formData: FormData) => Promise<void> | void;
}) {
  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const [bucket, setBucket] = useState<"core" | "flex">("flex");
  const svc = useMemo(() => services.find((s) => s.id === serviceId), [serviceId, services]);
  const isCoreCategory = !!svc?.category.toLowerCase().includes("core");
  const cost = svc?.creditCost ?? 0;
  const remaining = bucket === "flex" ? balance.flexCreditsRemaining : balance.coreCreditsRemaining;
  const after = remaining - cost;

  const grouped = useMemo(() => {
    const m = new Map<string, Service[]>();
    for (const s of services) {
      const arr = m.get(s.category) ?? [];
      arr.push(s);
      m.set(s.category, arr);
    }
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [services]);

  return (
    <form action={action} className="card p-6 max-w-2xl space-y-4">
      <div>
        <label className="label">Service</label>
        <select className="select" name="serviceId" value={serviceId} onChange={(e) => setServiceId(e.target.value)} required>
          {grouped.map(([cat, arr]) => (
            <optgroup key={cat} label={cat}>
              {arr.map((s) => <option key={s.id} value={s.id}>{s.name} · {s.creditCost} credits ({s.avgHours}h)</option>)}
            </optgroup>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded p-3 bg-[var(--color-paper-warm)] text-sm">
          <div className="eyebrow mb-1">Locked at quote</div>
          <div className="mono text-xl">{cost} credits</div>
          <div className="text-xs text-[var(--color-muted)] mt-1">{svc?.avgHours}h estimated</div>
        </div>
        <div className="rounded p-3 bg-[var(--color-paper-warm)] text-sm">
          <div className="eyebrow mb-1">Bucket</div>
          <div className="flex gap-2">
            <label className={`chip cursor-pointer ${bucket === "flex" ? "chip-purple" : ""}`}>
              <input type="radio" name="bucket" value="flex" checked={bucket === "flex"} onChange={() => setBucket("flex")} className="hidden" />Flex
            </label>
            <label className={`chip cursor-pointer ${bucket === "core" ? "chip-purple" : ""} ${!isCoreCategory ? "opacity-50 pointer-events-none" : ""}`}>
              <input type="radio" name="bucket" value="core" checked={bucket === "core"} onChange={() => setBucket("core")} className="hidden" disabled={!isCoreCategory} />Core
            </label>
          </div>
          {!isCoreCategory ? <p className="help">Core only available for Core-category services.</p> : null}
        </div>
      </div>

      <div>
        <label className="label">Title</label>
        <input className="input" name="title" required placeholder="Diwali campaign deck" />
      </div>
      <div>
        <label className="label">Brief</label>
        <textarea className="textarea" name="brief" rows={4} required placeholder="Audience, objective, must-have references, deadline if any." />
      </div>

      <div className={`rounded p-3 text-sm ${after < 0 ? "bg-[#F8E0DD] text-[var(--color-danger)]" : "bg-[#E6F3EC] text-[var(--color-success)]"}`}>
        After this task, {bucket} remaining will be <span className="mono">{after}</span> credits.
        {after < 0 ? " Insufficient credits. Top up the engagement first." : null}
      </div>

      <div className="flex gap-3">
        <button className="btn btn-primary" type="submit" disabled={after < 0}>Create as quoted</button>
        <a className="btn btn-ghost" href=".">Cancel</a>
      </div>
    </form>
  );
}
