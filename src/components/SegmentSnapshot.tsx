"use client";

import { Contact, LifecycleStage, RfmScore, SeniorityTier } from "@/lib/types";
import {
  LIFECYCLE_LABELS,
  PERSONA_LABELS,
  RFM_LABELS,
  SENIORITY_LABELS,
} from "@/lib/personas";

// Shows contact distribution across all four routing dimensions.
// This is where the dashboard visually proves segmentation is multi-
// dimensional rather than just persona-based.

const BAR_COLORS: Record<string, string> = {
  // Persona
  agency_founder: "bg-amber-500",
  creative_director: "bg-violet-500",
  junior_creative: "bg-emerald-500",
  // Tier
  emerging: "bg-sky-500",
  established: "bg-indigo-500",
  veteran: "bg-slate-500",
  // Lifecycle
  onboarding: "bg-cyan-500",
  retention: "bg-blue-500",
  loyalty: "bg-green-500",
  churned: "bg-rose-500",
  // RFM
  champion: "bg-green-600",
  engaged: "bg-lime-500",
  at_risk: "bg-orange-500",
  dormant: "bg-stone-400",
};

interface DimBlockProps {
  title: string;
  items: Array<{ key: string; label: string; count: number }>;
  total: number;
}

function DimBlock({ title, items, total }: DimBlockProps) {
  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-wide text-stone-500">
        {title}
      </h4>
      <div className="mt-2 space-y-1.5">
        {items.map((item) => {
          const pct = total > 0 ? (item.count / total) * 100 : 0;
          return (
            <div key={item.key} className="flex items-center gap-2 text-xs">
              <span className="w-24 shrink-0 text-stone-700">{item.label}</span>
              <div className="flex-1 overflow-hidden rounded bg-stone-100">
                <div
                  className={`h-4 ${BAR_COLORS[item.key] || "bg-stone-400"}`}
                  style={{ width: `${Math.max(pct, 3)}%` }}
                />
              </div>
              <span className="w-10 shrink-0 text-right font-mono text-stone-600">
                {item.count}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function SegmentSnapshot({ contacts }: { contacts: Contact[] }) {
  const total = contacts.length;

  const byPersona = ["agency_founder", "creative_director", "junior_creative"].map((k) => ({
    key: k,
    label: PERSONA_LABELS[k] || k,
    count: contacts.filter((c) => c.personaId === k).length,
  }));

  const byTier = (["emerging", "established", "veteran"] as SeniorityTier[]).map((k) => ({
    key: k,
    label: SENIORITY_LABELS[k],
    count: contacts.filter((c) => c.seniorityTier === k).length,
  }));

  const byLifecycle = (
    ["onboarding", "retention", "loyalty", "churned"] as LifecycleStage[]
  ).map((k) => ({
    key: k,
    label: LIFECYCLE_LABELS[k],
    count: contacts.filter((c) => c.lifecycleStage === k).length,
  }));

  const byRfm = (["champion", "engaged", "at_risk", "dormant"] as RfmScore[]).map((k) => ({
    key: k,
    label: RFM_LABELS[k],
    count: contacts.filter((c) => c.rfmScore === k).length,
  }));

  return (
    <div className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between border-b border-stone-100 pb-3">
        <h3 className="text-sm font-semibold text-stone-900">Segment snapshot</h3>
        <span className="text-xs text-stone-500">
          {total} contact{total === 1 ? "" : "s"} across 4 routing dimensions
        </span>
      </div>
      <div className="mt-4 grid gap-5 md:grid-cols-2">
        <DimBlock title="Persona" items={byPersona} total={total} />
        <DimBlock title="Seniority tier" items={byTier} total={total} />
        <DimBlock title="Lifecycle stage" items={byLifecycle} total={total} />
        <DimBlock title="RFM score" items={byRfm} total={total} />
      </div>
      <p className="mt-4 border-t border-stone-100 pt-3 text-[11px] text-stone-500">
        Persona and seniority are derived from job title at subscribe. Lifecycle and RFM are
        re-computed from event history after each pipeline run.
      </p>
    </div>
  );
}
