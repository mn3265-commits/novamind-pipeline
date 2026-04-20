"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CampaignMetrics } from "@/lib/types";

const PERSONA_LABELS: Record<string, string> = {
  agency_founder: "Founders",
  creative_director: "Creative Directors",
  junior_creative: "Juniors",
};

const PERSONA_COLORS: Record<string, string> = {
  agency_founder: "#f59e0b",
  creative_director: "#8b5cf6",
  junior_creative: "#10b981",
};

export function MetricsChart({ metrics }: { metrics: CampaignMetrics[] }) {
  if (metrics.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-stone-300 bg-stone-50 text-sm text-stone-500">
        Run the pipeline to see performance data.
      </div>
    );
  }

  const data = metrics.map((m) => ({
    persona: PERSONA_LABELS[m.personaId] || m.personaId,
    personaId: m.personaId,
    "Open rate": +(m.openRate * 100).toFixed(2),
    "Click rate": +(m.clickRate * 100).toFixed(2),
    "Unsubscribe rate": +(m.unsubscribeRate * 100).toFixed(2),
  }));

  return (
    <div className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-stone-500">
        Campaign performance by segment
      </h3>
      <div className="mt-4 h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: -10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
            <XAxis dataKey="persona" stroke="#78716c" fontSize={12} />
            <YAxis stroke="#78716c" fontSize={12} unit="%" />
            <Tooltip
              contentStyle={{
                borderRadius: 6,
                border: "1px solid #e7e5e4",
                fontSize: 12,
              }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="Open rate" fill="#a78bfa" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Click rate" fill="#7c3aed" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Unsubscribe rate" fill="#f87171" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-3 border-t border-stone-100 pt-4">
        {metrics.map((m) => (
          <div key={m.campaignId} className="text-xs">
            <div className="flex items-center gap-1.5">
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: PERSONA_COLORS[m.personaId] }}
              />
              <span className="font-medium text-stone-700">
                {PERSONA_LABELS[m.personaId]}
              </span>
            </div>
            <div className="mt-1 text-stone-500">
              {m.sent} sent · {m.uniqueOpens} opens · {m.uniqueClicks} clicks
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
