"use client";

import { Campaign } from "@/lib/types";
import { PersonaBadge } from "./PersonaCard";

export function CampaignLog({ campaigns }: { campaigns: Campaign[] }) {
  if (campaigns.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-stone-300 bg-stone-50 p-8 text-center text-sm text-stone-500">
        No campaigns yet. Trigger a pipeline run to populate the log.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm">
      <table className="w-full text-sm">
        <thead className="bg-stone-50 text-left text-xs font-medium uppercase tracking-wide text-stone-500">
          <tr>
            <th className="px-4 py-3">Blog</th>
            <th className="px-4 py-3">Segment</th>
            <th className="px-4 py-3">Newsletter ID</th>
            <th className="px-4 py-3 text-right">Recipients</th>
            <th className="px-4 py-3">Sent</th>
            <th className="px-4 py-3">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {campaigns.map((c) => (
            <tr key={c.id} className="hover:bg-stone-50">
              <td className="px-4 py-3 text-stone-800">
                <div className="line-clamp-1 max-w-xs">{c.blogTitle}</div>
              </td>
              <td className="px-4 py-3">
                <PersonaBadge personaId={c.personaId} />
              </td>
              <td className="px-4 py-3 font-mono text-xs text-stone-500">
                {c.newsletterId}
              </td>
              <td className="px-4 py-3 text-right text-stone-700">{c.recipientCount}</td>
              <td className="px-4 py-3 text-xs text-stone-500">
                {new Date(c.sentAt).toLocaleString()}
              </td>
              <td className="px-4 py-3">
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  {c.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
