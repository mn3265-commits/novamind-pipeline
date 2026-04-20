"use client";

import { InsightReport } from "@/lib/types";
import { Sparkles, TrendingUp, Target, Lightbulb, Layers } from "lucide-react";

export function InsightCard({ insight }: { insight: InsightReport }) {
  const hasCrossDim =
    insight.crossDimensionalFindings && insight.crossDimensionalFindings.length > 0;

  return (
    <div className="rounded-lg border border-brand-100 bg-gradient-to-br from-brand-50 to-white p-6 shadow-sm">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-brand-600" />
        <h3 className="text-sm font-semibold uppercase tracking-wide text-brand-700">
          AI Performance Summary
        </h3>
        <span className="ml-auto rounded-full bg-white px-2 py-0.5 text-xs text-stone-500">
          {insight.generatedBy}
        </span>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-stone-800">{insight.summary}</p>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div>
          <div className="flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
            <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">
              What worked
            </p>
          </div>
          <ul className="mt-2 space-y-1.5 text-sm text-stone-700">
            {insight.winners.map((w, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-emerald-500">✓</span>
                <span>{w}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <Target className="h-3.5 w-3.5 text-amber-600" />
            <p className="text-xs font-medium uppercase tracking-wide text-amber-700">
              Opportunities
            </p>
          </div>
          <ul className="mt-2 space-y-1.5 text-sm text-stone-700">
            {insight.opportunities.map((o, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-amber-500">→</span>
                <span>{o}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Cross-dimensional findings - the power feature */}
      {hasCrossDim && (
        <div className="mt-5 rounded-md border border-indigo-100 bg-indigo-50/50 p-3">
          <div className="flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5 text-indigo-600" />
            <p className="text-xs font-medium uppercase tracking-wide text-indigo-700">
              Cross-dimensional findings
            </p>
          </div>
          <ul className="mt-2 space-y-1.5 text-sm text-stone-700">
            {insight.crossDimensionalFindings!.map((f, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-indigo-500">◆</span>
                <span>{f}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 border-t border-indigo-100 pt-2 text-[11px] italic text-indigo-700">
            These patterns cut across persona. They are only visible because seniority, lifecycle, and RFM are tracked as separate dimensions rather than merged into persona.
          </p>
        </div>
      )}

      <div className="mt-5 border-t border-stone-200 pt-4">
        <div className="flex items-center gap-1.5">
          <Lightbulb className="h-3.5 w-3.5 text-brand-600" />
          <p className="text-xs font-medium uppercase tracking-wide text-brand-700">
            Suggested next topics
          </p>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {insight.nextTopicSuggestions.map((t, i) => (
            <span
              key={i}
              className="rounded-md border border-brand-200 bg-white px-2.5 py-1 text-xs text-stone-700"
            >
              {t}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
