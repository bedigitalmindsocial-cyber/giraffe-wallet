"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { computeCreditCost } from "@/lib/credits";
import { METHOD_TAG_OPTIONS, getMethodTagMeta } from "@/lib/method-tags";
import type { Service, ServicePricingModel } from "@/types";

export function ServiceForm({
  initial,
  roles,
  action,
}: {
  initial?: Partial<Service>;
  roles: { id: string; name: string; multiplier: number }[];
  action: (formData: FormData) => Promise<void> | void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [category, setCategory] = useState(initial?.category ?? "");
  const [defaultRoleId, setDefaultRoleId] = useState(initial?.defaultRoleId ?? roles[0]?.id ?? "");
  const [pricingModel, setPricingModel] = useState<ServicePricingModel>(initial?.pricingModel ?? "flat");
  const [creditsPerUnit, setCreditsPerUnit] = useState<number>(initial?.creditsPerUnit ?? 0);
  const [unitLabel, setUnitLabel] = useState(initial?.unitLabel ?? "unit");
  const [includedRevisionsPerUnit, setIncludedRevisionsPerUnit] = useState<number>(initial?.includedRevisionsPerUnit ?? 0.5);
  const [lifecycleTag, setLifecycleTag] = useState<string>(initial?.lifecycleTag ?? "");
  const [methodTag, setMethodTag] = useState<string>(initial?.methodTag ?? "HYBRID");

  const previewCost = useMemo(() => computeCreditCost({
    pricingModel,
    creditsPerUnit,
    tierThreshold: initial?.tierThreshold,
    tierCreditsPerUnit: initial?.tierCreditsPerUnit,
  }, 1), [pricingModel, creditsPerUnit, initial?.tierThreshold, initial?.tierCreditsPerUnit]);

  const selectedMethod = getMethodTagMeta(methodTag as Service["methodTag"]);

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
            <label className="label">Pricing model</label>
            <select className="select" name="pricingModel" value={pricingModel} onChange={(e) => setPricingModel(e.target.value as ServicePricingModel)}>
              <option value="flat">Flat (fixed cost)</option>
              <option value="per_page">Per page</option>
              <option value="per_100_words">Per 100 words</option>
              <option value="per_design">Per design</option>
              <option value="per_episode">Per episode</option>
            </select>
          </div>
          <div>
            <label className="label">Unit label</label>
            <input className="input" name="unitLabel" value={unitLabel} onChange={(e) => setUnitLabel(e.target.value)} placeholder="unit, page, episode..." />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Credits per unit</label>
            <input className="input mono" type="number" step="1" min="0" name="creditsPerUnit" value={creditsPerUnit} onChange={(e) => setCreditsPerUnit(parseFloat(e.target.value || "0"))} />
          </div>
          <div>
            <label className="label">Included revisions per unit</label>
            <input className="input mono" type="number" step="0.5" min="0" name="includedRevisionsPerUnit" value={includedRevisionsPerUnit} onChange={(e) => setIncludedRevisionsPerUnit(parseFloat(e.target.value || "0"))} />
          </div>
        </div>

        <div>
          <label className="label">Lifecycle tag</label>
          <div className="flex gap-2 flex-wrap">
            {[
              { v: "", l: "None" },
              { v: "NEW", l: "NEW" },
              { v: "POPULAR", l: "POPULAR" },
              { v: "PROMO", l: "PROMO" },
              { v: "LIMITED", l: "LIMITED" },
              { v: "DISCONTINUED", l: "DISCONTINUED" },
            ].map((t) => (
              <label key={t.v} className={`chip cursor-pointer ${lifecycleTag === t.v ? "chip-purple" : ""}`}>
                <input type="radio" name="lifecycleTag" value={t.v} checked={lifecycleTag === t.v} onChange={(e) => setLifecycleTag(e.target.value)} className="hidden" />
                {t.l}
              </label>
            ))}
          </div>
          {lifecycleTag === "DISCONTINUED" ? <p className="help">Discontinued services are hidden from new task creation but kept for history. Active will be set to off.</p> : null}
        </div>

        <div>
          <label className="label">Delivery method</label>
          <div className="flex gap-2 flex-wrap">
            {METHOD_TAG_OPTIONS.map((option) => (
              <label key={option.value} className={`chip cursor-pointer ${methodTag === option.value ? "chip-purple" : ""}`}>
                <input type="radio" name="methodTag" value={option.value} checked={methodTag === option.value} onChange={(e) => setMethodTag(e.target.value)} className="hidden" />
                {option.label}
              </label>
            ))}
          </div>
          <p className="help">{selectedMethod?.description ?? "Use this to frame the service around speed, quality control, and expert involvement."}</p>
        </div>

        <div className="flex gap-3 pt-2">
          <button className="btn btn-primary" type="submit" name="next" value="back">Save</button>
          <button className="btn btn-ghost" type="submit" name="next" value="new">Save & New</button>
          <Link className="btn btn-ghost" href="/catalog/services">Cancel</Link>
        </div>
      </div>

      <aside className="space-y-4">
        <div className="card p-4 bg-[var(--color-paper-warm)]">
          <div className="eyebrow mb-2">Live preview (qty 1)</div>
          <div className="mono text-3xl text-[var(--color-purple-dark)]">{previewCost} credits</div>
          <div className="mt-2 text-xs text-[var(--color-muted)]">
            Model: <span className="mono">{pricingModel}</span> · {creditsPerUnit} cr/unit
          </div>
        </div>
      </aside>
    </form>
  );
}
