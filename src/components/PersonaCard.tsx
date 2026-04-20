"use client";

import { Persona, SeniorityTier, LifecycleStage, RfmScore } from "@/lib/types";
import {
  PERSONA_LABELS,
  SENIORITY_LABELS,
  LIFECYCLE_LABELS,
  RFM_LABELS,
} from "@/lib/personas";

// ============================================================
// Badges for each routing dimension
// ============================================================

const PERSONA_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  agency_founder: { bg: "bg-amber-50", text: "text-amber-900", dot: "bg-amber-500" },
  creative_director: { bg: "bg-violet-50", text: "text-violet-900", dot: "bg-violet-500" },
  junior_creative: { bg: "bg-emerald-50", text: "text-emerald-900", dot: "bg-emerald-500" },
};

const TIER_COLORS: Record<SeniorityTier, { bg: string; text: string }> = {
  emerging: { bg: "bg-sky-50", text: "text-sky-800" },
  established: { bg: "bg-indigo-50", text: "text-indigo-800" },
  veteran: { bg: "bg-slate-100", text: "text-slate-800" },
};

const LIFECYCLE_COLORS: Record<LifecycleStage, { bg: string; text: string }> = {
  onboarding: { bg: "bg-cyan-50", text: "text-cyan-800" },
  retention: { bg: "bg-blue-50", text: "text-blue-800" },
  loyalty: { bg: "bg-emerald-50", text: "text-emerald-800" },
  churned: { bg: "bg-rose-50", text: "text-rose-800" },
};

const RFM_COLORS: Record<RfmScore, { bg: string; text: string }> = {
  champion: { bg: "bg-green-50", text: "text-green-800" },
  engaged: { bg: "bg-lime-50", text: "text-lime-800" },
  at_risk: { bg: "bg-orange-50", text: "text-orange-800" },
  dormant: { bg: "bg-stone-100", text: "text-stone-700" },
};

export function PersonaBadge({ personaId }: { personaId: string }) {
  const c = PERSONA_COLORS[personaId] || { bg: "bg-stone-50", text: "text-stone-900", dot: "bg-stone-500" };
  const label = PERSONA_LABELS[personaId] || personaId;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full ${c.bg} ${c.text} px-2.5 py-0.5 text-xs font-medium`}>
      <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
      {label}
    </span>
  );
}

export function TierBadge({ tier }: { tier: SeniorityTier }) {
  const c = TIER_COLORS[tier];
  return (
    <span className={`inline-flex items-center rounded ${c.bg} ${c.text} px-1.5 py-0.5 text-[10px] font-medium`}>
      {SENIORITY_LABELS[tier]}
    </span>
  );
}

export function LifecycleBadge({ stage }: { stage: LifecycleStage }) {
  const c = LIFECYCLE_COLORS[stage];
  return (
    <span className={`inline-flex items-center rounded ${c.bg} ${c.text} px-1.5 py-0.5 text-[10px] font-medium`}>
      {LIFECYCLE_LABELS[stage]}
    </span>
  );
}

export function RfmBadge({ score }: { score: RfmScore }) {
  const c = RFM_COLORS[score];
  return (
    <span className={`inline-flex items-center rounded ${c.bg} ${c.text} px-1.5 py-0.5 text-[10px] font-medium`}>
      {RFM_LABELS[score]}
    </span>
  );
}

export function PersonaCard({ persona }: { persona: Persona }) {
  return (
    <div className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-base font-semibold text-stone-900">{persona.name}</h3>
          <p className="mt-0.5 text-xs text-stone-500">{persona.role}</p>
        </div>
        <PersonaBadge personaId={persona.id} />
      </div>
      <div className="mt-4 space-y-3 text-sm">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-stone-400">Pains</p>
          <ul className="mt-1 list-inside list-disc space-y-0.5 text-stone-700">
            {persona.pains.slice(0, 2).map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-stone-400">Copy angle</p>
          <p className="mt-1 text-stone-700">{persona.copyAngle}</p>
        </div>
        <div className="flex items-center justify-between border-t border-stone-100 pt-3">
          <span className="text-xs text-stone-500">CTA</span>
          <span className="text-xs font-medium text-stone-800">{persona.preferredCTA}</span>
        </div>
      </div>
    </div>
  );
}
