"use client";

import { useEffect, useState } from "react";
import { Sparkles, Play, Loader2, RefreshCw } from "lucide-react";
import { PERSONAS } from "@/lib/personas";
import {
  Campaign,
  CampaignMetrics,
  Contact,
  ContentPackage,
  InsightReport,
  PipelineRun,
} from "@/lib/types";
import { PersonaCard } from "@/components/PersonaCard";
import { ContentPreview } from "@/components/ContentPreview";
import { MetricsChart } from "@/components/MetricsChart";
import { InsightCard } from "@/components/InsightCard";
import { CampaignLog } from "@/components/CampaignLog";
import { CrmLog } from "@/components/CrmLog";
import { SegmentSnapshot } from "@/components/SegmentSnapshot";

interface CrmRequest {
  method: string;
  endpoint: string;
  payload: unknown;
  timestamp: string;
}

interface DashboardData {
  campaigns: Campaign[];
  metrics: CampaignMetrics[];
  runs: PipelineRun[];
  insights: InsightReport[];
  contentPackages: ContentPackage[];
  crmRequestLog: CrmRequest[];
}

const SUGGESTED_TOPICS = [
  "AI in creative automation",
  "Turning Slack chaos into a clean changelog",
  "Three workflows every small agency should pilot this quarter",
  "How to run a client kickoff without burning a senior day",
];

export default function Dashboard() {
  const [topic, setTopic] = useState(SUGGESTED_TOPICS[0]);
  const [running, setRunning] = useState(false);
  const [activePackage, setActivePackage] = useState<ContentPackage | null>(null);
  const [activeInsight, setActiveInsight] = useState<InsightReport | null>(null);
  const [activeMetrics, setActiveMetrics] = useState<CampaignMetrics[]>([]);
  const [data, setData] = useState<DashboardData | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function loadData() {
    const [res, contactsRes] = await Promise.all([
      fetch("/api/campaigns"),
      fetch("/api/contacts"),
    ]);
    const d: DashboardData = await res.json();
    const contactsData = await contactsRes.json();
    setData(d);
    setContacts(contactsData.contacts || []);
    // If nothing active yet, default to the most recent package
    if (!activePackage && d.contentPackages.length > 0) {
      const latest = d.contentPackages[0];
      setActivePackage(latest);
      setActiveInsight(d.insights.find((i) => i.contentPackageId === latest.id) || null);
      const pkgCampaigns = d.campaigns.filter((c) => c.contentPackageId === latest.id);
      setActiveMetrics(
        d.metrics.filter((m) => pkgCampaigns.some((c) => c.id === m.campaignId))
      );
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function runFullPipeline() {
    setRunning(true);
    setError(null);
    try {
      const res = await fetch("/api/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "pipeline failed");
      }
      const result = await res.json();
      setActivePackage(result.contentPackage);
      await loadData();
      // Pull latest metrics + insight for this package
      const res2 = await fetch("/api/campaigns");
      const d: DashboardData = await res2.json();
      const pkgCampaigns = d.campaigns.filter(
        (c) => c.contentPackageId === result.contentPackage.id
      );
      setActiveMetrics(
        d.metrics.filter((m) => pkgCampaigns.some((c) => c.id === m.campaignId))
      );
      setActiveInsight(
        d.insights.find((i) => i.contentPackageId === result.contentPackage.id) ||
          null
      );
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "unknown error");
    } finally {
      setRunning(false);
    }
  }

  function selectPackage(pkg: ContentPackage) {
    setActivePackage(pkg);
    if (!data) return;
    const pkgCampaigns = data.campaigns.filter((c) => c.contentPackageId === pkg.id);
    setActiveMetrics(
      data.metrics.filter((m) => pkgCampaigns.some((c) => c.id === m.campaignId))
    );
    setActiveInsight(
      data.insights.find((i) => i.contentPackageId === pkg.id) || null
    );
  }

  const totalSends = data?.campaigns
    ? data.campaigns.reduce((acc, c) => acc + c.recipientCount, 0)
    : 0;

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <header className="flex flex-col gap-4 border-b border-stone-200 pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-600">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-stone-900">NovaMind Pipeline</h1>
            <p className="text-xs text-stone-500">
              AI content automation for small creative agencies
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs text-stone-500">
          <span>
            <span className="font-semibold text-stone-800">{data?.runs.length || 0}</span>{" "}
            runs
          </span>
          <span>·</span>
          <span>
            <span className="font-semibold text-stone-800">
              {data?.campaigns.length || 0}
            </span>{" "}
            campaigns
          </span>
          <span>·</span>
          <span>
            <span className="font-semibold text-stone-800">{totalSends}</span> sends
          </span>
          <button
            onClick={loadData}
            className="ml-2 rounded-md border border-stone-200 bg-white p-1.5 text-stone-600 hover:bg-stone-50"
            title="Refresh"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
      </header>

      {/* Trigger */}
      <section className="mt-8">
        <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">
            Trigger a pipeline run
          </h2>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Enter a blog topic"
              className="flex-1 rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm text-stone-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
            <button
              onClick={runFullPipeline}
              disabled={running || !topic.trim()}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {running ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Running pipeline...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Run pipeline
                </>
              )}
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {SUGGESTED_TOPICS.map((t) => (
              <button
                key={t}
                onClick={() => setTopic(t)}
                className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs text-stone-600 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
              >
                {t}
              </button>
            ))}
          </div>
          {error && (
            <div className="mt-3 rounded-md border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
              {error}
            </div>
          )}
        </div>
      </section>

      {/* Personas */}
      <section className="mt-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-500">
          Target personas
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          {PERSONAS.map((p) => (
            <PersonaCard key={p.id} persona={p} />
          ))}
        </div>
      </section>

      {/* Segment snapshot - all 4 routing dimensions */}
      {contacts.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-500">
            Current segmentation
          </h2>
          <SegmentSnapshot contacts={contacts} />
        </section>
      )}

      {/* Content + performance */}
      {activePackage && (
        <>
          <section className="mt-10">
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">
                Latest content
              </h2>
              <span className="text-xs text-stone-500">
                Topic: {activePackage.topic}
              </span>
            </div>
            <ContentPreview pkg={activePackage} />
          </section>

          <section className="mt-10 grid gap-6 lg:grid-cols-5">
            <div className="lg:col-span-3">
              <MetricsChart metrics={activeMetrics} />
            </div>
            <div className="lg:col-span-2">
              {activeInsight ? (
                <InsightCard insight={activeInsight} />
              ) : (
                <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-stone-300 bg-stone-50 p-6 text-sm text-stone-500">
                  No insight report for this package yet.
                </div>
              )}
            </div>
          </section>
        </>
      )}

      {/* Campaigns */}
      <section className="mt-10">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-500">
          Campaign log
        </h2>
        <CampaignLog campaigns={data?.campaigns || []} />
      </section>

      {/* Historical + CRM */}
      <section className="mt-10 grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-500">
            Run history
          </h2>
          <div className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
            {data?.runs.length === 0 ? (
              <p className="text-xs text-stone-500">No runs yet.</p>
            ) : (
              <ul className="divide-y divide-stone-100">
                {data?.runs.slice(0, 8).map((r) => {
                  const pkg = data.contentPackages.find(
                    (p) => p.id === r.contentPackageId
                  );
                  return (
                    <li
                      key={r.id}
                      className="flex cursor-pointer items-center justify-between py-2 hover:bg-stone-50"
                      onClick={() => pkg && selectPackage(pkg)}
                    >
                      <div>
                        <p className="text-sm font-medium text-stone-800">
                          {r.topic}
                        </p>
                        <p className="text-[11px] text-stone-500">
                          {new Date(r.completedAt).toLocaleString()} ·{" "}
                          {(r.durationMs / 1000).toFixed(1)}s
                        </p>
                      </div>
                      <span className="text-xs text-brand-700">View →</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-500">
            HubSpot API log
          </h2>
          <CrmLog requests={data?.crmRequestLog || []} />
        </div>
      </section>

      <footer className="mt-16 border-t border-stone-200 pt-6 text-xs text-stone-500">
        <p>
          NovaMind Pipeline · Built as a take-home for Palona AI · AI layer:
          Anthropic Claude · CRM: mocked HubSpot v3 · Data: file-backed JSON
          store
        </p>
      </footer>
    </main>
  );
}
